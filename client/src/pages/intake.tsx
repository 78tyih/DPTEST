import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { saveIntakeProfile, syncPendingIntakeProfile, type IntakeProfile } from "@/utils/intake";

const MARKET_OPTIONS = ["国内股票", "国内期货", "加密市场", "港美股", "国际期货"];
const CAPITAL_OPTIONS = ["1万以下", "1万到30万", "30万到100万", "100万以上"];
const EXPERIENCE_OPTIONS = ["3个月以内", "3个月-1年", "1-3年", "3年以上"];
const SYSTEM_OPTIONS = [
  "裸K加传统形态技术分析",
  "价格行为 / ICT / SMC",
  "订单流 / 量价分析",
  "MT4 / MT5",
  "量化 / 程序自动化",
  "还没有稳定体系",
];

const steps = [
  { key: "primaryMarkets", title: "你目前主要做哪些交易品种？", multi: true, options: MARKET_OPTIONS },
  { key: "tradingCapitalRange", title: "你目前用于交易的资金体量大约是？", multi: false, options: CAPITAL_OPTIONS },
  { key: "tradingExperience", title: "你做交易大约多久了？", multi: false, options: EXPERIENCE_OPTIONS },
  { key: "tradingSystem", title: "你目前主要依据哪种交易体系做决策？", multi: false, options: SYSTEM_OPTIONS },
] as const;

const ease = { duration: 0.22, ease: "easeOut" as const };

export default function IntakePage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [stepIndex, setStepIndex] = useState(0);
  const [profile, setProfile] = useState<IntakeProfile>({
    primaryMarkets: [],
    tradingCapitalRange: "",
    tradingExperience: "",
    tradingSystem: "",
  });

  const step = steps[stepIndex];
  const canNext = useMemo(() => {
    if (step.key === "primaryMarkets") return profile.primaryMarkets.length > 0;
    return Boolean(profile[step.key]);
  }, [profile, step]);

  const updateSelection = async (option: string) => {
    if (step.key === "primaryMarkets") {
      const nextMarkets = profile.primaryMarkets.includes(option)
        ? profile.primaryMarkets.filter((item) => item !== option)
        : [...profile.primaryMarkets, option];
      setProfile((prev) => ({ ...prev, primaryMarkets: nextMarkets }));
      return;
    }

    const nextProfile = { ...profile, [step.key]: option };
    setProfile(nextProfile);

    if (stepIndex === steps.length - 1) {
      saveIntakeProfile(nextProfile);
      if (user) {
        await syncPendingIntakeProfile().catch(() => {});
      }
      navigate("/quiz");
      return;
    }

    setTimeout(() => setStepIndex((prev) => prev + 1), 180);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg-0)" }}>
      <div className="sticky top-0 z-10 px-5 pt-4 pb-3" style={{ background: "var(--bg-0)", borderBottom: "1px solid var(--border)" }}>
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <button
            onClick={() => stepIndex === 0 ? navigate("/") : setStepIndex((prev) => prev - 1)}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.04)", color: "var(--text-muted)" }}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-1.5">
            {steps.map((_, idx) => (
              <div
                key={idx}
                className="rounded-full transition-all"
                style={{
                  width: idx === stepIndex ? 18 : 8,
                  height: 8,
                  background: idx <= stepIndex ? "var(--gold)" : "rgba(255,255,255,0.12)",
                }}
              />
            ))}
          </div>
          <div className="w-9" />
        </div>
      </div>

      <div className="flex-1 px-5 py-6">
        <div className="max-w-lg mx-auto">
          <motion.div
            key={step.key}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={ease}
            className="space-y-6"
          >
            <div className="space-y-2">
              <p className="text-xs tracking-wider" style={{ color: "var(--gold)" }}>
                PROFILE {stepIndex + 1}/{steps.length}
              </p>
              <h1 className="text-xl font-bold" style={{ color: "var(--text-strong)" }}>
                {step.title}
              </h1>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                这会帮助我们更准确理解你的交易背景
              </p>
            </div>

            <div className="grid gap-3">
              {step.options.map((option) => {
                const selected = step.key === "primaryMarkets"
                  ? profile.primaryMarkets.includes(option)
                  : profile[step.key] === option;
                return (
                  <button
                    key={option}
                    onClick={() => updateSelection(option)}
                    className="w-full rounded-xl px-4 py-4 text-left flex items-center justify-between transition-all"
                    style={{
                      background: selected ? "var(--gold-soft)" : "rgba(255,255,255,0.03)",
                      border: selected ? "1.5px solid var(--gold)" : "1px solid var(--border)",
                      color: "var(--text-strong)",
                    }}
                  >
                    <span className="text-sm font-medium">{option}</span>
                    {selected ? <Check className="w-4 h-4" style={{ color: "var(--gold)" }} /> : null}
                  </button>
                );
              })}
            </div>

            {step.multi && (
              <button
                onClick={async () => {
                  if (!canNext) return;
                  saveIntakeProfile(profile);
                  if (stepIndex === steps.length - 1) {
                    if (user) await syncPendingIntakeProfile().catch(() => {});
                    navigate("/quiz");
                    return;
                  }
                  setStepIndex((prev) => prev + 1);
                }}
                disabled={!canNext}
                className="w-full h-12 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                style={{
                  background: canNext ? "var(--primary)" : "rgba(var(--primary-rgb), 0.2)",
                  color: canNext ? "#fff" : "rgba(var(--primary-rgb), 0.55)",
                }}
              >
                下一步
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
