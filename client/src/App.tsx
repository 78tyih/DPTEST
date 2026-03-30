import { useState, useCallback, useEffect } from "react";
import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import NotFound from "@/pages/not-found";
import AdminPage from "@/pages/admin";
import AdminChatPage from "@/pages/admin-chat";
import ChatWidget from "@/components/ChatWidget";
import LiveRoomFloat from "@/components/LiveRoomFloat";
import WeChatBrowserGuide from "@/components/WeChatBrowserGuide";
import LandingPage from "@/pages/landing";
import HomePage from "@/pages/home";
import QuizPage from "@/pages/quiz";
import LoadingPage from "@/pages/loading";
import ResultPage from "@/pages/result";
import ReportPage from "@/pages/report";
import { calculateResult, type QuizResult } from "@/utils/calculateResult";
import { buildResultWebhookPayload, sendResultWebhook } from "@/utils/webhook";
import { traderTypes, rankTiers, rarityMap } from "@/data/traderTypes";

const ANSWERS_KEY = "quiz_answers";
const RESULT_KEY = "quiz_result";
const RESULT_WEBHOOK_SENT_KEY = "quiz_result_webhook_sent";

const pageTransition = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.22, ease: "easeOut" as const },
};

function loadResult(): QuizResult | null {
  try {
    const raw = localStorage.getItem(RESULT_KEY) || sessionStorage.getItem(RESULT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-0)' }}>
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/" />;
  }

  return <>{children}</>;
}

function reconstructResultFromDb(dbResult: any): QuizResult | null {
  if (!dbResult) return null;
  try {
    const type = traderTypes[dbResult.traderTypeCode];
    if (!type) return null;
    const rank = rankTiers.find(r => r.name === dbResult.rankName) || rankTiers[rankTiers.length - 1];
    const scores = dbResult.scores as Record<string, number>;
    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    return {
      rawScores: scores as any,
      normalizedScores: scores as any,
      traderType: type,
      rank,
      avgScore: dbResult.avgScore,
      rarity: rarityMap[dbResult.traderTypeCode] || '8%',
      top2: [sorted[0][0], sorted[1][0]] as any,
    };
  } catch {
    return null;
  }
}

function ResultRoute({ quizResult }: { quizResult: QuizResult | null }) {
  const { user } = useAuth();
  const { data: dbResult, isLoading } = useQuery({
    queryKey: ["/api/quiz-result"],
    enabled: !!user && !quizResult,
    staleTime: 30000,
  });

  const finalResult = quizResult || reconstructResultFromDb(dbResult);

  if (!quizResult && isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-0)' }}>
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (!finalResult) {
    return <Redirect to="/" />;
  }

  return <ResultPage result={finalResult} />;
}

function Router() {
  const [location, navigate] = useLocation();
  const [quizResult, setQuizResult] = useState<QuizResult | null>(loadResult);
  const { user } = useAuth();

  useEffect(() => {
    if (quizResult) {
      localStorage.setItem(RESULT_KEY, JSON.stringify(quizResult));
      sessionStorage.setItem(RESULT_KEY, JSON.stringify(quizResult));
    }
  }, [quizResult]);

  const handleQuizComplete = useCallback(async (answers: number[]) => {
    localStorage.setItem(ANSWERS_KEY, JSON.stringify(answers));
    sessionStorage.setItem(ANSWERS_KEY, JSON.stringify(answers));
    sessionStorage.removeItem("quiz_result_saved");
    sessionStorage.removeItem(RESULT_WEBHOOK_SENT_KEY);
    const result = calculateResult(answers);
    setQuizResult(result);

    try {
      const res = await fetch("/api/quiz-result", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers,
          scores: result.normalizedScores,
          traderTypeCode: result.traderType.code,
          avgScore: result.avgScore,
          rankName: result.rank.name,
        }),
        credentials: "include",
      });
      if (res.ok) {
        sessionStorage.setItem("quiz_result_saved", "true");
        queryClient.invalidateQueries({ queryKey: ["/api/quiz-result"] });
        queryClient.invalidateQueries({ queryKey: ["/api/me"] });

        if (user?.phone && sessionStorage.getItem(RESULT_WEBHOOK_SENT_KEY) !== "true") {
          const payload = buildResultWebhookPayload({
            phone: user.phone,
            normalizedScores: result.normalizedScores,
            traderTypeCode: result.traderType.code,
            avgScore: result.avgScore,
            rankName: result.rank.name,
          });
          sendResultWebhook(payload).catch(() => {});
          sessionStorage.setItem(RESULT_WEBHOOK_SENT_KEY, "true");
        }
      }
    } catch (err) {
      // Will be saved later after login
    }

    navigate("/loading");
  }, [navigate, user]);

  const handleLoadingDone = useCallback(() => {
    navigate("/result");
  }, [navigate]);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location}
        {...pageTransition}
        className="min-h-screen"
      >
        <Switch>
          <Route path="/" component={LandingPage} />

          <Route path="/home">
            <AuthGuard>
              <HomePage />
            </AuthGuard>
          </Route>

          <Route path="/quiz">
            <QuizPage onComplete={handleQuizComplete} />
          </Route>

          <Route path="/loading">
            {quizResult ? <LoadingPage onDone={handleLoadingDone} /> : <Redirect to="/" />}
          </Route>

          <Route path="/result">
            <ResultRoute quizResult={quizResult} />
          </Route>

          <Route path="/report/:token" component={ReportPage} />

          <Route path="/admin" component={AdminPage} />
          <Route path="/admin/chat" component={AdminChatPage} />

          <Route component={NotFound} />
        </Switch>
      </motion.div>
    </AnimatePresence>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <WeChatBrowserGuide />
          <Toaster />
          <Router />
          <ChatWidget />
          <LiveRoomFloat />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
