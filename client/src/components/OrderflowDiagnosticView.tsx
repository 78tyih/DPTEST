import { motion } from "framer-motion";
import { ArrowRight, BookOpen, LockKeyhole, Radar, ShieldCheck, Wrench } from "lucide-react";
import { diagnosticDimensionLabels, diagnosticTracks } from "@/data/orderflowDiagnostic";
import type { OrderflowDiagnosticResult } from "@/utils/orderflowDiagnostic";

const ease = { duration: 0.22, ease: "easeOut" as const };

interface OrderflowDiagnosticViewProps {
  result: OrderflowDiagnosticResult;
  title: string;
  subtitle: string;
  primaryAction?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
}

const iconMap = {
  awareness: Radar,
  "market-fit": BookOpen,
  "risk-control": ShieldCheck,
  execution: ArrowRight,
  "tool-readiness": Wrench,
  "commercial-intent": LockKeyhole,
};

export default function OrderflowDiagnosticView({
  result,
  title,
  subtitle,
  primaryAction,
  secondaryAction,
}: OrderflowDiagnosticViewProps) {
  const sortedDimensions = Object.entries(result.normalizedScores).sort((a, b) => b[1] - a[1]);
  const track = diagnosticTracks[result.trackId];

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-0)" }}>
      <div className="max-w-lg md:max-w-2xl mx-auto px-5 py-6 space-y-5">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={ease}
          className="rounded-2xl p-6"
          style={{ background: "var(--bg-1)", border: "1px solid var(--border)" }}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs tracking-wider mb-2" style={{ color: "var(--gold)" }}>
                {track.title} · {track.duration}
              </p>
              <h1 className="text-2xl font-heading font-bold mb-2" style={{ color: "var(--text-strong)" }}>
                {title}
              </h1>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
                {subtitle}
              </p>
            </div>
            <div
              className="px-3 py-2 rounded-xl text-center min-w-[84px]"
              style={{ background: "var(--gold-soft)", border: "1px solid rgba(var(--gold-rgb), 0.3)" }}
            >
              <div className="text-2xl font-num font-bold" style={{ color: "var(--gold)" }}>
                {result.avgScore}
              </div>
              <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                /100
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...ease, delay: 0.06 }}
          className="rounded-2xl p-6"
          style={{ background: "var(--bg-1)", border: "1px solid var(--border)" }}
        >
          <div className="flex items-center justify-between gap-4 mb-3">
            <div>
              <h2 className="text-lg font-bold" style={{ color: "var(--text-strong)" }}>
                {result.scoreBand.title}
              </h2>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                {result.scoreBand.summary}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                推荐路径
              </p>
              <p className="text-sm font-semibold" style={{ color: "var(--text-strong)" }}>
                {result.recommendedPath}
              </p>
            </div>
          </div>
          <div className="rounded-xl px-4 py-3" style={{ background: "rgba(var(--primary-rgb), 0.08)" }}>
            <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>
              建议动作
            </p>
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-strong)" }}>
              {result.recommendedAction}
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...ease, delay: 0.12 }}
          className="rounded-2xl p-6"
          style={{ background: "var(--bg-1)", border: "1px solid var(--border)" }}
        >
          <h2 className="text-lg font-bold mb-4" style={{ color: "var(--text-strong)" }}>
            六维诊断
          </h2>
          <div className="space-y-4">
            {sortedDimensions.map(([dimension, score], index) => {
              const Icon = iconMap[dimension as keyof typeof iconMap] || Radar;
              return (
                <div key={dimension}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4" style={{ color: index === 0 ? "var(--gold)" : "var(--text-muted)" }} />
                      <span className="text-sm" style={{ color: "var(--text-strong)" }}>
                        {diagnosticDimensionLabels[dimension as keyof typeof diagnosticDimensionLabels]}
                      </span>
                    </div>
                    <span className="text-sm font-num font-bold" style={{ color: "var(--text-strong)" }}>
                      {score}
                    </span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${score}%`,
                        background: index === 0 ? "var(--gold)" : "var(--primary)",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...ease, delay: 0.18 }}
          className="rounded-2xl p-6"
          style={{ background: "var(--bg-1)", border: "1px solid var(--border)" }}
        >
          <h2 className="text-lg font-bold mb-4" style={{ color: "var(--text-strong)" }}>
            销售标签
          </h2>
          <div className="space-y-3">
            {result.segmentTags.map((tag) => (
              <div
                key={tag.id}
                className="rounded-xl px-4 py-3"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div className="flex items-center justify-between gap-3 mb-1">
                  <p className="text-sm font-semibold" style={{ color: "var(--text-strong)" }}>
                    {tag.label}
                  </p>
                  <span
                    className="text-[11px] px-2 py-1 rounded-full"
                    style={{ background: "var(--gold-soft)", color: "var(--gold)" }}
                  >
                    {tag.priority}
                  </span>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
                  {tag.salesAction}
                </p>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...ease, delay: 0.24 }}
          className="rounded-2xl p-6"
          style={{ background: "var(--bg-1)", border: "1px solid var(--border)" }}
        >
          <h2 className="text-lg font-bold mb-4" style={{ color: "var(--text-strong)" }}>
            已解锁资料
          </h2>
          <div className="space-y-3">
            {result.unlockRewards.map((reward) => (
              <div
                key={reward.id}
                className="rounded-xl px-4 py-3"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <p className="text-sm font-semibold mb-1" style={{ color: "var(--text-strong)" }}>
                  {reward.title}
                </p>
                <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
                  {reward.description}
                </p>
              </div>
            ))}
          </div>
        </motion.div>

        {(primaryAction || secondaryAction) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...ease, delay: 0.3 }}
            className="grid gap-3"
          >
            {primaryAction ? (
              <button
                onClick={primaryAction.onClick}
                className="w-full h-12 rounded-xl font-bold text-white"
                style={{ background: "var(--primary)" }}
              >
                {primaryAction.label}
              </button>
            ) : null}
            {secondaryAction ? (
              <button
                onClick={secondaryAction.onClick}
                className="w-full h-11 rounded-xl font-medium"
                style={{ border: "1px solid var(--border)", color: "var(--text-muted)" }}
              >
                {secondaryAction.label}
              </button>
            ) : null}
          </motion.div>
        )}
      </div>
    </div>
  );
}
