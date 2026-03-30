import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { motion } from "framer-motion";
import { ChevronRight, LogIn } from "lucide-react";
import LoginModal from "@/components/LoginModal";
import { queryClient } from "@/lib/queryClient";
import { usePageView } from "@/hooks/use-tracking";

const ease = { duration: 0.22, ease: "easeOut" as const };

export default function LandingPage() {
  const [, navigate] = useLocation();
  const { user, isLoading } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [userCount, setUserCount] = useState<number | null>(null);
  useEffect(() => {
    fetch("/api/public-stats").then(r => r.ok ? r.json() : null).then(d => {
      if (d?.totalUsers) setUserCount(d.totalUsers);
    }).catch(() => {});
  }, []);
  usePageView("landing");

  useEffect(() => {
    if (!isLoading && user) {
      navigate("/home");
    }
  }, [user, isLoading, navigate]);

  const handleLoginSuccess = () => {
    setShowLogin(false);
    queryClient.invalidateQueries({ queryKey: ["/api/me"] });
    navigate("/home");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-0)' }}>
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col overflow-hidden relative" style={{ background: 'var(--bg-0)' }}>
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 dp-grid opacity-100" />
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] md:w-[900px] h-[400px] md:h-[500px]"
          style={{ background: 'radial-gradient(ellipse, rgba(var(--primary-rgb), 0.06) 0%, transparent 70%)' }}
        />
        <div className="absolute top-[15%] left-[10%] md:left-[20%] w-[3px] h-16 rounded-sm animate-float-up will-change-transform" style={{ background: 'rgba(var(--success-rgb), 0.2)' }} />
        <div className="absolute top-[25%] right-[15%] md:right-[20%] w-[3px] h-12 rounded-sm animate-float-down will-change-transform" style={{ background: 'rgba(var(--danger-rgb), 0.2)', animationDelay: '1s' }} />
        <div className="absolute top-[55%] left-[20%] md:left-[30%] w-[2px] h-10 rounded-sm animate-float-up will-change-transform" style={{ background: 'rgba(var(--success-rgb), 0.15)', animationDelay: '2s', animationDuration: '5s' }} />
        <div className="absolute top-[45%] right-[25%] md:right-[30%] w-[2.5px] h-14 rounded-sm animate-float-down will-change-transform" style={{ background: 'rgba(var(--danger-rgb), 0.15)', animationDelay: '0.5s', animationDuration: '6s' }} />
        <div className="hidden md:block absolute top-[35%] left-[8%] w-[2px] h-20 rounded-sm animate-float-up will-change-transform" style={{ background: 'rgba(var(--gold-rgb), 0.12)', animationDelay: '1.5s', animationDuration: '7s' }} />
        <div className="hidden md:block absolute top-[60%] right-[10%] w-[2px] h-16 rounded-sm animate-float-down will-change-transform" style={{ background: 'rgba(var(--gold-rgb), 0.1)', animationDelay: '3s', animationDuration: '6s' }} />
      </div>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6" style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={ease}
          className="mb-3 md:mb-5"
        >
          <div className="text-3xl md:text-4xl font-heading font-bold tracking-widest" style={{ color: 'var(--primary)' }} data-testid="img-logo">
            DELTAPEX
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...ease, delay: 0.08 }}
          className="text-center mb-10 md:mb-12"
        >
          <h1
            className="text-xl md:text-2xl font-heading font-bold tracking-tight mb-2"
            style={{ color: 'var(--text-strong)' }}
            data-testid="text-title"
          >
            交易能力测评
          </h1>
          <p className="text-sm md:text-base leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            2分钟 · 12道实战情境题<br />
            发现你的交易 DNA
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...ease, delay: 0.16 }}
          className="w-full max-w-xs md:max-w-sm space-y-3"
        >
          {userCount && userCount > 10 && (
            <p className="text-center text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
              ✨ 已有 <span className="font-bold" style={{ color: 'var(--primary)' }}>{userCount.toLocaleString()}</span> 位交易者完成测评
            </p>
          )}
          <motion.button
            onClick={() => navigate("/quiz")}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            className="w-full h-12 md:h-[52px] rounded-xl font-bold text-base text-white flex items-center justify-center gap-2 transition-all duration-200"
            style={{ background: 'var(--primary)' }}
            data-testid="button-start-quiz"
          >
            开始测评
            <ChevronRight className="w-4 h-4" />
          </motion.button>

          <motion.button
            onClick={() => setShowLogin(true)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full h-11 md:h-12 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all duration-200"
            style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}
            data-testid="button-login-existing"
          >
            <LogIn className="w-4 h-4" />
            已有账号？直接登录
          </motion.button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="mt-8 text-center"
        >
          <a
            href="https://deltapex.zeabur.app"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs transition-all duration-200 hover:underline"
            style={{ color: 'var(--text-muted)' }}
            data-testid="link-official-site"
          >
            访问 Deltapex 官网 →
          </a>
        </motion.div>
      </div>

      <LoginModal
        open={showLogin}
        onClose={() => setShowLogin(false)}
        onSuccess={handleLoginSuccess}
        title="登录"
        subtitle="登录后进入你的交易员主页"
        defaultTab="login"
      />
    </div>
  );
}
