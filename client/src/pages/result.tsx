import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Home, X, LogIn, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import RadarChartComponent from "@/components/RadarChart";
import ShareCard from "@/components/ShareCard";
import CountUp from "@/components/CountUp";
import CharacterSVG from "@/components/character/CharacterSVG";
import TierRoadmap from "@/components/character/TierRoadmap";
import CharacterCard from "@/components/CharacterCard";
import RankBadge from "@/components/RankBadge";
import LoginModal from "@/components/LoginModal";
// 企业微信跳转已停用
import type { QuizResult } from "@/utils/calculateResult";
import { dimensionLabels, type Dimension } from "@/data/questions";
import { usePageView, useTracking } from "@/hooks/use-tracking";
// 企业微信相关 imports 已移除
import { useAuth } from "@/lib/auth";
import { queryClient } from "@/lib/queryClient";

interface ResultPageProps {
  result: QuizResult;
}

const ease = { duration: 0.22, ease: "easeOut" as const };

function CharacterCardReveal({ result, onDone, tier = 0 }: { result: QuizResult; onDone: () => void; tier?: number }) {
  const [phase, setPhase] = useState(0);
  const [ready, setReady] = useState(false);
  const [displayTier, setDisplayTier] = useState(3);
  const [deEvolving, setDeEvolving] = useState(false);
  const [tierFlash, setTierFlash] = useState(false);
  const { traderType, rank } = result;
  const [c1] = traderType.colors;
  const cc = traderType.cardColors;
  const glowColor = cc?.glow || c1 + '40';
  const primaryColor = cc?.primary || c1;

  const tierNames = ['学徒', '交易者', '精英', '职业操盘手'];
  const allTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    setDisplayTier(3);
    setDeEvolving(false);
    setReady(false);
    setPhase(0);

    const t = (fn: () => void, ms: number) => {
      const id = setTimeout(() => { if (mountedRef.current) fn(); }, ms);
      allTimers.current.push(id);
      return id;
    };

    t(() => setPhase(1), 600);
    t(() => setPhase(2), 1600);
    t(() => setPhase(3), 2800);
    t(() => {
      setPhase(4);
      setDeEvolving(true);
      let currentTier = 3;
      const stepDown = () => {
        if (!mountedRef.current) return;
        if (currentTier <= tier) {
          setDeEvolving(false);
          t(() => setReady(true), 600);
          return;
        }
        t(() => {
          if (!mountedRef.current) return;
          currentTier--;
          setTierFlash(true);
          t(() => setTierFlash(false), 300);
          setDisplayTier(currentTier);
          stepDown();
        }, 800);
      };
      t(stepDown, 1200);
    }, 3600);

    return () => {
      mountedRef.current = false;
      allTimers.current.forEach(clearTimeout);
      allTimers.current = [];
    };
  }, [tier]);

  const burstParticles = useMemo(() =>
    Array.from({ length: 36 }).map((_, i) => ({
      angle: (i / 36) * 360 + (Math.random() - 0.5) * 10,
      distance: 100 + Math.random() * 120,
      size: 1.5 + Math.random() * 3.5,
      delay: Math.random() * 0.5,
      duration: 0.8 + Math.random() * 0.6,
    })), []);

  const shimmerRays = useMemo(() =>
    Array.from({ length: 8 }).map((_, i) => ({
      angle: (i / 8) * 360,
      length: 200 + Math.random() * 100,
      width: 1 + Math.random() * 1.5,
      delay: 0.1 + Math.random() * 0.3,
    })), []);

  const floatingMotes = useMemo(() =>
    Array.from({ length: 12 }).map(() => ({
      x: (Math.random() - 0.5) * 300,
      y: (Math.random() - 0.5) * 400,
      size: 1 + Math.random() * 2,
      duration: 3 + Math.random() * 4,
      delay: Math.random() * 3,
    })), []);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden"
      style={{ background: 'var(--bg-0)' }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
    >
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          className="absolute inset-0"
          style={{ background: `radial-gradient(ellipse 60% 50% at 50% 45%, ${primaryColor}08, transparent 70%)` }}
          animate={phase >= 2 ? { opacity: [0, 1] } : { opacity: 0 }}
          transition={{ duration: 1.5 }}
        />
      </div>

      {phase < 2 && (
        <motion.div
          className="flex flex-col items-center"
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.4 }}
        >
          <div className="relative">
            <motion.div
              className="w-24 h-24 rounded-full"
              style={{
                background: `radial-gradient(circle, ${glowColor}, transparent 70%)`,
                boxShadow: `0 0 80px ${glowColor}`,
              }}
              animate={{ scale: [1, 1.4, 1, 1.3, 1] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            />
            {phase >= 1 && (
              <>
                <motion.div
                  className="absolute inset-0 rounded-full"
                  style={{ border: `1px solid ${primaryColor}40` }}
                  initial={{ scale: 1, opacity: 0.6 }}
                  animate={{ scale: 2.5, opacity: 0 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
                />
                <motion.div
                  className="absolute inset-0 rounded-full"
                  style={{ border: `1px solid ${primaryColor}30` }}
                  initial={{ scale: 1, opacity: 0.4 }}
                  animate={{ scale: 3, opacity: 0 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut", delay: 0.5 }}
                />
              </>
            )}
          </div>
          <motion.p
            animate={{ opacity: [0.3, 0.8, 0.3] }}
            transition={{ duration: 1.8, repeat: Infinity }}
            className="mt-8 text-sm font-serif"
            style={{ color: 'var(--gold)' }}
          >
            正在召唤你的交易人格...
          </motion.p>
        </motion.div>
      )}

      {phase >= 2 && (
        <div className="relative flex flex-col items-center">
          {phase === 2 && shimmerRays.map((ray, i) => (
            <motion.div
              key={`ray-${i}`}
              className="absolute"
              style={{
                width: ray.width,
                height: ray.length,
                background: `linear-gradient(180deg, ${primaryColor}50, ${primaryColor}10, transparent)`,
                left: '50%',
                top: '50%',
                transformOrigin: 'top center',
                transform: `rotate(${ray.angle}deg)`,
                borderRadius: '2px',
              }}
              initial={{ scaleY: 0, opacity: 0 }}
              animate={{ scaleY: [0, 1, 0], opacity: [0, 0.7, 0] }}
              transition={{ duration: 1, delay: ray.delay, ease: "easeOut" }}
            />
          ))}

          {phase === 2 && burstParticles.map((p, i) => (
            <motion.div
              key={`burst-${i}`}
              className="absolute rounded-full"
              style={{
                width: p.size,
                height: p.size,
                background: i % 3 === 0 ? primaryColor : '#C9A456',
                left: '50%',
                top: '50%',
              }}
              initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
              animate={{
                x: Math.cos((p.angle * Math.PI) / 180) * p.distance,
                y: Math.sin((p.angle * Math.PI) / 180) * p.distance,
                opacity: 0,
                scale: 0,
              }}
              transition={{ duration: p.duration, delay: p.delay, ease: "easeOut" }}
            />
          ))}

          {phase >= 3 && floatingMotes.map((m, i) => (
            <motion.div
              key={`mote-${i}`}
              className="absolute rounded-full pointer-events-none"
              style={{
                width: m.size,
                height: m.size,
                background: '#C9A456',
                left: '50%',
                top: '50%',
              }}
              initial={{ x: m.x, y: m.y, opacity: 0 }}
              animate={{
                x: [m.x, m.x + (Math.random() - 0.5) * 30],
                y: [m.y, m.y - 20 - Math.random() * 20],
                opacity: [0, 0.6, 0],
              }}
              transition={{ duration: m.duration, delay: m.delay, repeat: Infinity, ease: "easeInOut" }}
            />
          ))}

          <motion.div
            className="relative"
            animate={phase >= 3 ? {
              y: [0, -6, 0, -4, 0],
              rotateZ: [0, -0.5, 0, 0.5, 0],
            } : {}}
            transition={phase >= 3 ? {
              duration: 5,
              repeat: Infinity,
              ease: "easeInOut",
            } : {}}
          >
            <motion.div
              className="absolute -inset-4 rounded-3xl pointer-events-none"
              style={{
                background: `radial-gradient(ellipse, ${primaryColor}15, transparent 70%)`,
                filter: 'blur(20px)',
              }}
              animate={phase >= 3 ? { opacity: [0.4, 0.8, 0.4] } : { opacity: 0.4 }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />

            <motion.div
              className="relative rounded-2xl overflow-hidden"
              style={{
                width: 280,
                aspectRatio: '3/4',
                background: `linear-gradient(170deg, ${cc?.dark || c1 + '20'} 0%, #0d0f14 40%, ${cc?.dark || c1 + '10'} 100%)`,
                border: `1.5px solid ${glowColor}`,
              }}
              initial={{ opacity: 0, scale: 0.5, rotateY: 180, filter: 'blur(24px)' }}
              animate={{
                opacity: 1,
                scale: 1,
                rotateY: 0,
                filter: 'blur(0px)',
                boxShadow: phase >= 3
                  ? `0 0 40px ${glowColor}, 0 0 80px ${primaryColor}15, 0 20px 60px rgba(0,0,0,0.5)`
                  : `0 0 20px ${glowColor}`,
              }}
              transition={{ duration: 1.2, ease: [0.34, 1.56, 0.64, 1] }}
            >
              <motion.div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: `linear-gradient(105deg, transparent 40%, ${primaryColor}18 50%, transparent 60%)`,
                }}
                initial={{ x: '-100%' }}
                animate={{ x: '200%' }}
                transition={{ duration: 1.5, delay: 0.8, ease: "easeInOut" }}
              />

              <div className="absolute inset-0" style={{
                background: `radial-gradient(circle at 30% 20%, ${primaryColor}15, transparent 60%)`,
              }} />

              <div className="relative h-full flex flex-col items-center justify-between p-4">
                <div className="flex items-center justify-between w-full">
                  <motion.span
                    className="text-xs font-tag"
                    style={{ color: cc?.secondary || traderType.colors[1], opacity: 0.7 }}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 0.7, x: 0 }}
                    transition={{ delay: 0.6, duration: 0.5 }}
                  >
                    {traderType.element.icon} {traderType.element.name}
                  </motion.span>
                  <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6, duration: 0.5 }}
                  >
                    <RankBadge tier={rank} size="sm" />
                  </motion.div>
                </div>

                <motion.div
                  className="flex-1 flex flex-col items-center justify-center -mt-2"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4, duration: 0.8, ease: [0.34, 1.56, 0.64, 1] }}
                >
                  <div className="relative">
                    <motion.div
                      animate={tierFlash ? { opacity: [1, 0.3, 1], scale: [1, 0.92, 1] } : {}}
                      transition={{ duration: 0.3 }}
                    >
                      <CharacterSVG type={traderType.code} size={160} tier={displayTier} />
                    </motion.div>
                    <AnimatePresence>
                      {tierFlash && (
                        <motion.div
                          className="absolute inset-0 pointer-events-none"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: [0, 0.6, 0] }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          style={{ background: `radial-gradient(circle, ${primaryColor}50, transparent 70%)`, filter: 'blur(8px)' }}
                        />
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>

                <div className="text-center w-full">
                  <motion.h2
                    className="font-serif text-2xl font-bold mb-0.5"
                    style={{ color: '#E8E6E1', letterSpacing: '3px' }}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7, duration: 0.5 }}
                  >
                    {traderType.name}
                  </motion.h2>

                  <AnimatePresence mode="wait">
                    <motion.p
                      key={displayTier}
                      className="text-[10px] font-medium mb-1"
                      style={{ color: displayTier === tier ? 'var(--text-muted)' : 'var(--gold)' }}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      transition={{ duration: 0.25 }}
                    >
                      {deEvolving ? `✦ ${tierNames[displayTier]} 形态 ✦` : `当前形态: ${tierNames[displayTier]}`}
                    </motion.p>
                  </AnimatePresence>

                  <motion.p
                    className="font-tag text-[11px] tracking-widest mb-3"
                    style={{ color: primaryColor }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.9, duration: 0.5 }}
                  >
                    {traderType.subtitle}
                  </motion.p>
                  <motion.div
                    className="flex items-center gap-2 justify-center mb-2"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: 1, duration: 0.6 }}
                  >
                    <div className="flex-1 h-[1px]" style={{ background: `linear-gradient(to right, transparent, var(--gold))` }} />
                    <span className="text-xs" style={{ color: 'var(--gold)' }}>✦</span>
                    <div className="flex-1 h-[1px]" style={{ background: `linear-gradient(to left, transparent, var(--gold))` }} />
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {phase >= 3 && (
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="mt-6 text-sm font-serif italic text-center max-w-[260px] leading-relaxed"
              style={{ color: 'var(--gold)' }}
            >
              "{traderType.quote}"
            </motion.p>
          )}

          {phase >= 4 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mt-5 text-center"
            >
              <div className="flex items-baseline justify-center gap-1">
                <CountUp
                  end={result.avgScore}
                  duration={1200}
                  className="text-4xl font-num font-bold"
                  style={{ color: rank.color }}
                />
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>/100</span>
              </div>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                {rank.name}
              </p>
            </motion.div>
          )}

          {ready && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex flex-col items-center"
            >
              {tier < 3 && (
                <motion.p
                  className="text-xs text-center mb-3 max-w-[240px] leading-relaxed"
                  style={{ color: 'var(--text-muted)' }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  每日登录积累经验，解锁更高阶形态
                </motion.p>
              )}
              <motion.button
                onClick={onDone}
                className="px-10 py-3 rounded-xl text-sm font-bold transition-all duration-200"
                style={{
                  background: primaryColor,
                  color: '#fff',
                  boxShadow: `0 0 20px ${primaryColor}40`,
                }}
                whileHover={{ scale: 1.05, boxShadow: `0 0 30px ${primaryColor}60` }}
                whileTap={{ scale: 0.95 }}
                data-testid="button-continue-reveal"
              >
                查看我的交易档案 →
              </motion.button>
            </motion.div>
          )}
        </div>
      )}

      {/* 跳过动画按钮 — 动画进行中显示 */}
      {!ready && (
        <motion.button
          onClick={onDone}
          className="absolute top-6 right-6 text-xs px-3 py-1.5 rounded-lg z-50 transition-all"
          style={{ color: 'var(--text-muted)', border: '1px solid var(--border)', background: 'rgba(0,0,0,0.3)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          whileHover={{ opacity: 1, background: 'rgba(255,255,255,0.1)' }}
        >
          跳过 →
        </motion.button>
      )}
    </motion.div>
  );
}

function CharacterCardPanel({ result, onClose, tier }: { result: QuizResult; onClose: () => void; tier: number }) {
  const { traderType, rank, normalizedScores, avgScore } = result;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      style={{ background: 'rgba(13,15,20,0.95)' }}
      onClick={onClose}
    >
      <motion.button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full flex items-center justify-center"
        style={{ background: 'rgba(255,255,255,0.08)', color: '#8B95A5' }}
        whileTap={{ scale: 0.9 }}
        data-testid="button-close-card-panel"
      >
        <X className="w-5 h-5" />
      </motion.button>

      <motion.div
        initial={{ scale: 0.7, rotateY: 180, opacity: 0 }}
        animate={{ scale: 1, rotateY: 0, opacity: 1 }}
        exit={{ scale: 0.8, rotateY: -90, opacity: 0 }}
        transition={{ duration: 0.8, ease: [0.34, 1.56, 0.64, 1] }}
        className="max-h-[90vh] overflow-y-auto"
        style={{ perspective: '1000px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <CharacterCard
          typeCode={traderType.code}
          scores={normalizedScores}
          rank={{ name: rank.name, emoji: rank.icon, score: avgScore }}
          showAnimation={false}
          tier={tier}
        />
      </motion.div>
    </motion.div>
  );
}

export default function ResultPage({ result }: ResultPageProps) {
  const { traderType, rank, normalizedScores, avgScore } = result;
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [showUnbox, setShowUnbox] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);
  const { trackEvent } = useTracking();
  const { toast } = useToast();
  usePageView("result");
  const [showCardPanel, setShowCardPanel] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [resultSaved, setResultSaved] = useState(!!user);
  const [c1] = traderType.colors;
  const cc = traderType.cardColors;

  // 未登录用户：开箱结束后 3 秒弹登录框（比原来 10 秒快，减少截图走人）
  useEffect(() => {
    if (!user && !showUnbox) {
      const timer = setTimeout(() => setShowLoginModal(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [user, showUnbox]);

  // 开箱动画完成后 5 秒自动弹出聊天气泡
  useEffect(() => {
    if (!showUnbox) {
      const timer = setTimeout(() => {
        window.dispatchEvent(new CustomEvent("open-chat-widget"));
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showUnbox]);

  useEffect(() => {
    if (user && !resultSaved && sessionStorage.getItem("quiz_result_saved") !== "true") {
      const answers = (() => {
        try { return JSON.parse(localStorage.getItem('quiz_answers') || sessionStorage.getItem('quiz_answers') || '[]'); } catch { return []; }
      })();
      if (answers.length === 12) {
        fetch("/api/quiz-result", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            answers,
            scores: normalizedScores,
            traderTypeCode: traderType.code,
            avgScore,
            rankName: rank.name,
          }),
          credentials: "include",
        }).then(async (res) => {
          if (!res.ok) throw new Error("save failed");
          setResultSaved(true);
          sessionStorage.setItem("quiz_result_saved", "true");
          queryClient.invalidateQueries({ queryKey: ["/api/quiz-result"] });
          queryClient.invalidateQueries({ queryKey: ["/api/me"] });
        }).catch(() => {
          toast({ title: "结果保存失败，请刷新页面重试", variant: "destructive" });
        });
      }
    }
  }, [user, resultSaved, normalizedScores, traderType, avgScore, rank, toast]);

  const handleLoginSuccess = useCallback(() => {
    setShowLoginModal(false);
    queryClient.invalidateQueries({ queryKey: ["/api/me"] });
    toast({ title: "登录成功，结果已保存" });
  }, [toast]);

  const sortedDims = useMemo(() => {
    const dims: Dimension[] = ['RISK', 'MENTAL', 'SYSTEM', 'ADAPT', 'EXEC', 'EDGE'];
    return [...dims].sort((a, b) => normalizedScores[b] - normalizedScores[a]);
  }, [normalizedScores]);

  // "咨询顾问"按钮：触发聊天气泡打开（通过自定义事件）
  const handleOpenChat = useCallback(() => {
    trackEvent("chat_click", { page: "result", traderType: traderType.code });
    window.dispatchEvent(new CustomEvent("open-chat-widget"));
  }, [traderType, trackEvent]);

  return (
    <>
      <AnimatePresence>
        {showUnbox && (
          <CharacterCardReveal result={result} onDone={() => setShowUnbox(false)} tier={user?.tier ?? 0} />
        )}
      </AnimatePresence>

      {!showUnbox && (
        <div className="min-h-screen pb-24" style={{ background: 'var(--bg-0)' }}>
          <div className="max-w-lg md:max-w-2xl mx-auto px-5 pt-6 space-y-5">

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, ...ease }}
              className="rounded-2xl p-5 relative overflow-hidden cursor-pointer"
              style={{
                background: `linear-gradient(170deg, ${cc?.dark || c1 + '12'}, #0d0f14, ${cc?.dark || c1 + '08'})`,
                border: `1px solid ${cc?.glow || traderType.colors[1] + '30'}`,
                boxShadow: `0 0 30px ${cc?.glow || c1 + '10'}`,
              }}
              onClick={() => setShowCardPanel(true)}
              data-testid="button-open-card-panel"
            >
              <div className="absolute inset-0" style={{ background: `radial-gradient(circle at 50% 0%, ${cc?.primary || c1}15, transparent 60%)` }} />
              <div className="relative flex items-center gap-4">
                <div
                  className="flex-shrink-0 rounded-full overflow-hidden flex items-center justify-center"
                  style={{
                    width: 90,
                    height: 90,
                    border: `2px solid ${cc?.glow || c1 + '40'}`,
                    boxShadow: `0 0 20px ${cc?.glow || c1 + '20'}`,
                    background: `radial-gradient(circle, ${cc?.dark || '#0d0f14'}, #0d0f14)`,
                  }}
                  data-testid="avatar-circle"
                >
                  <div style={{ clipPath: 'circle(50%)', width: 90, height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    <CharacterSVG type={traderType.code} size={100} tier={user?.tier ?? 0} />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-serif font-bold" style={{ color: '#E8E6E1', letterSpacing: '2px' }} data-testid="text-type-name">
                      {traderType.name}
                    </h3>
                  </div>
                  <p className="text-[11px] font-tag tracking-wider mb-2" style={{ color: cc?.primary || traderType.colors[1] }}>
                    {traderType.english || traderType.subtitle}
                  </p>
                  <div className="flex items-center gap-2">
                    <RankBadge tier={rank} size="sm" />
                    <span className="text-xs font-num" style={{ color: rank.color }} data-testid="text-rank">
                      {avgScore}/100
                    </span>
                  </div>
                </div>
                <div className="flex-shrink-0 text-xs" style={{ color: 'var(--text-muted)', opacity: 0.5 }}>
                  点击查看 →
                </div>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, ...ease }}
              className="rounded-2xl p-6"
              style={{ background: 'var(--bg-1)', border: '1px solid var(--border)' }}
            >
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-strong)' }}>
                🕸️ 你的能力轮廓
              </h3>
              <RadarChartComponent scores={normalizedScores} hideScores />
            </motion.div>

            {/* 首个强 CTA — 紧跟雷达图，在用户第一屏可见 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28, ...ease }}
            >
              <motion.button
                onClick={handleOpenChat}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-4 rounded-xl font-bold text-base text-white flex items-center justify-center gap-2.5 transition-all duration-200"
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  boxShadow: '0 4px 20px rgba(102, 126, 234, 0.35)',
                }}
                data-testid="button-chat-primary"
              >
                <MessageCircle className="w-5 h-5" />
                免费咨询专属顾问
              </motion.button>
              <p className="text-[10px] text-center mt-2" style={{ color: 'var(--text-muted)' }}>
                AI 顾问 24 小时在线 · 随时可转接真人顾问
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28, ...ease }}
            >
              <TierRoadmap type={traderType.code} currentTier={user?.tier ?? 0} />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, ...ease }}
              className="rounded-2xl p-6"
              style={{ background: 'var(--bg-1)', border: '1px solid var(--border)' }}
            >
              <h3 className="text-base font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-strong)' }}>
                🔍 你可能经常遇到这种情况：
              </h3>
              <div
                className="pl-4 py-1"
                style={{ borderLeft: `3px solid ${cc?.primary || c1}` }}
              >
                <p
                  className="text-base leading-[1.8]"
                  style={{ color: 'var(--text)' }}
                  data-testid="text-piercing"
                >
                  "{traderType.piercingDescription}"
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, ...ease }}
              className="rounded-2xl p-6"
              style={{ background: 'var(--bg-1)', border: '1px solid var(--border)' }}
            >
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-strong)' }}>
                📊 六维详细分数
              </h3>
              <div className="space-y-3">
                {sortedDims.map((dim, i) => (
                  <div key={dim}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{dimensionLabels[dim]}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-num font-bold" style={{ color: 'var(--text-strong)' }}>{normalizedScores[dim]}</span>
                        {i === 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: `${cc?.primary || c1}20`, color: cc?.primary || c1 }}>最强</span>}
                        {i === sortedDims.length - 1 && <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(var(--info-rgb), 0.15)', color: 'var(--info)' }}>突破口</span>}
                      </div>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                      <motion.div
                        className="h-full rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${normalizedScores[dim]}%` }}
                        transition={{ delay: 0.45 + i * 0.06, duration: 0.5, ease: "easeOut" }}
                        style={{ background: i === 0 ? (cc?.primary || c1) : i === sortedDims.length - 1 ? 'var(--info)' : 'var(--text-muted)' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.46, ...ease }}
              className="rounded-2xl p-6"
              style={{ background: 'var(--bg-1)', border: '1px solid var(--border)' }}
            >
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-strong)' }}>
                💪 你的核心优势
              </h3>
              <div className="space-y-2">
                {traderType.strengths.map((s, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--text)' }}>
                    <span style={{ color: 'var(--success)' }} className="mt-0.5 flex-shrink-0">✓</span>
                    <span>{s}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, ...ease }}
              className="rounded-2xl p-6"
              style={{ background: 'var(--bg-1)', border: '1px solid var(--border)' }}
            >
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-strong)' }}>
                ⚠️ 致命盲区
              </h3>
              {user ? (
                <div className="space-y-2">
                  {traderType.blindSpots.map((b, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--text)' }}>
                      <span style={{ color: 'var(--warning)' }} className="mt-0.5 flex-shrink-0">!</span>
                      <span>{b}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="relative">
                  <div className="space-y-2 filter blur-[6px] select-none pointer-events-none">
                    {traderType.blindSpots.slice(0, 2).map((b, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--text)' }}>
                        <span style={{ color: 'var(--warning)' }} className="mt-0.5 flex-shrink-0">!</span>
                        <span>{b}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => setShowLoginModal(true)}
                    className="mt-3 w-full py-2.5 rounded-xl text-sm font-medium transition-all"
                    style={{ background: 'var(--primary)', color: '#fff' }}
                  >
                    🔓 登录解锁完整报告
                  </button>
                </div>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.54, ...ease }}
              className="rounded-2xl p-6"
              style={{ background: 'var(--bg-1)', border: '1px solid var(--border)' }}
            >
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-strong)' }}>
                💡 个性化提升路径
              </h3>
              {user ? (
                <p className="text-sm leading-[1.8]" style={{ color: 'var(--text)' }}>
                  {traderType.advice}
                </p>
              ) : (
                <div className="relative">
                  <p className="text-sm leading-[1.8] filter blur-[6px] select-none pointer-events-none" style={{ color: 'var(--text)' }}>
                    {traderType.advice}
                  </p>
                  <button
                    onClick={() => setShowLoginModal(true)}
                    className="mt-3 w-full py-2.5 rounded-xl text-sm font-medium transition-all"
                    style={{ background: 'var(--primary)', color: '#fff' }}
                  >
                    🔓 登录查看专属建议
                  </button>
                </div>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.58, ...ease }}
              className="rounded-2xl p-6"
              style={{ background: 'var(--bg-1)', border: '1px solid var(--border)' }}
            >
              <motion.button
                onClick={handleOpenChat}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 mb-3 transition-all duration-200"
                style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}
                data-testid="button-chat-contact"
              >
                <MessageCircle className="w-5 h-5" />
                咨询专属顾问，免费一对一指导
              </motion.button>

              <p className="text-xs italic text-center leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                "我们不教你怎么赚钱——<br />
                我们让你亲眼看到专业交易是什么样的"
              </p>
            </motion.div>

            <div className="h-4" />
          </div>

          <div
            className="fixed bottom-0 left-0 right-0 z-40"
            style={{
              background: 'rgba(var(--bg-0-rgb), 0.92)',
              backdropFilter: 'blur(12px)',
              borderTop: '1px solid var(--border)',
              paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
            }}
          >
            <div className="max-w-lg md:max-w-2xl mx-auto px-5 pt-3 flex gap-3">
              <motion.button
                onClick={() => user ? navigate("/home") : setShowLoginModal(true)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`${user ? 'py-3 px-4' : 'flex-1 py-3'} rounded-xl text-sm font-medium flex items-center justify-center gap-1.5 transition-all duration-200`}
                style={{
                  background: user ? 'transparent' : 'var(--primary)',
                  border: `1px solid ${user ? 'var(--gold)' : 'var(--primary)'}`,
                  color: user ? 'var(--gold)' : '#FFFFFF',
                }}
                data-testid="button-go-home"
              >
                {user ? <Home className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
                <span>{user ? '首页' : '登录 / 注册'}</span>
              </motion.button>
              <motion.button
                onClick={() => setShowShareModal(true)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex-1 py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all duration-200"
                style={{
                  background: 'transparent',
                  border: '1px solid var(--gold)',
                  color: 'var(--gold)',
                }}
                data-testid="button-save-image"
              >
                <Camera className="w-4 h-4" />
                生成交易员卡片
              </motion.button>
              <motion.button
                onClick={handleOpenChat}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 text-white transition-all duration-200"
                style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}
                data-testid="button-chat-contact-bottom"
              >
                <MessageCircle className="w-4 h-4" />
                咨询顾问
              </motion.button>
            </div>
          </div>

          <AnimatePresence>
            {showShareModal && (
              <motion.div
                className="fixed inset-0 z-50 flex items-center justify-center p-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ background: 'rgba(0,0,0,0.8)' }}
                onClick={() => setShowShareModal(false)}
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  transition={ease}
                  className="max-w-sm w-full max-h-[85vh] overflow-y-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ShareCard result={result} tier={user?.tier ?? 0} />
                  <motion.button
                    onClick={() => setShowShareModal(false)}
                    whileTap={{ scale: 0.98 }}
                    className="w-full mt-3 py-3 rounded-xl text-sm"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    关闭
                  </motion.button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showCardPanel && (
              <CharacterCardPanel result={result} onClose={() => setShowCardPanel(false)} tier={user?.tier ?? 0} />
            )}
          </AnimatePresence>

          <LoginModal
            open={showLoginModal}
            onClose={() => setShowLoginModal(false)}
            onSuccess={handleLoginSuccess}
            title="登录以保存你的测评结果"
            subtitle="注册后可随时查看你的交易员档案"
          />
        </div>
      )}
    </>
  );
}
