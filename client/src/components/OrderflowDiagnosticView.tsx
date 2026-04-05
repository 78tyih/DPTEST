import React from "react";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen, ExternalLink, LockKeyhole, Radar, ShieldCheck, Wrench } from "lucide-react";
import { diagnosticDimensionLabels, diagnosticTracks } from "@/data/orderflowDiagnostic";
import type { OrderflowDiagnosticResult } from "@/utils/orderflowDiagnostic";
import { resolveRewardAction } from "@/utils/diagnosticLinks";
import { useTracking } from "@/hooks/use-tracking";

const ease = { duration: 0.22, ease: "easeOut" as const };

interface OrderflowDiagnosticViewProps {
  result: OrderflowDiagnosticResult;
  title: string;
  subtitle: string;
  customerFacing?: boolean;
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

const radarDimensions = [
  "awareness",
  "market-fit",
  "risk-control",
  "execution",
  "tool-readiness",
  "commercial-intent",
] as const;

function OrderflowRadarChart({
  scores,
}: {
  scores: OrderflowDiagnosticResult["normalizedScores"];
}) {
  const center = 140;
  const radius = 96;
  const levels = [0.25, 0.5, 0.75, 1];
  const points = radarDimensions.map((dimension, index) => {
    const angle = (-Math.PI / 2) + (index * Math.PI * 2) / radarDimensions.length;
    const scoreRadius = radius * (scores[dimension] / 100);
    const labelRadius = radius + 28;

    return {
      dimension,
      angle,
      x: center + Math.cos(angle) * scoreRadius,
      y: center + Math.sin(angle) * scoreRadius,
      axisX: center + Math.cos(angle) * radius,
      axisY: center + Math.sin(angle) * radius,
      labelX: center + Math.cos(angle) * labelRadius,
      labelY: center + Math.sin(angle) * labelRadius,
      score: scores[dimension],
      label: diagnosticDimensionLabels[dimension],
    };
  });

  const polygon = points.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <div
      className="mx-auto mb-5 w-full max-w-[320px]"
      data-testid="orderflow-radar-chart"
    >
      <svg viewBox="0 0 280 280" className="w-full h-auto">
        {levels.map((level) => {
          const ring = radarDimensions
            .map((_, index) => {
              const angle = (-Math.PI / 2) + (index * Math.PI * 2) / radarDimensions.length;
              const x = center + Math.cos(angle) * radius * level;
              const y = center + Math.sin(angle) * radius * level;
              return `${x},${y}`;
            })
            .join(" ");

          return (
            <polygon
              key={level}
              points={ring}
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="1"
            />
          );
        })}

        {points.map((point) => (
          <line
            key={point.dimension}
            x1={center}
            y1={center}
            x2={point.axisX}
            y2={point.axisY}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="1"
          />
        ))}

        <polygon
          points={polygon}
          fill="rgba(var(--primary-rgb), 0.18)"
          stroke="var(--primary)"
          strokeWidth="2"
        />

        {points.map((point) => (
          <circle
            key={`${point.dimension}-dot`}
            cx={point.x}
            cy={point.y}
            r="3.5"
            fill="var(--primary)"
          />
        ))}

        {points.map((point) => (
          <g key={`${point.dimension}-label`}>
            <text
              x={point.labelX}
              y={point.labelY}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="var(--text-muted)"
              fontSize="11"
            >
              {point.label}
            </text>
            <text
              x={point.labelX}
              y={point.labelY + 14}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="var(--text-strong)"
              fontSize="11"
              fontWeight="700"
            >
              {point.score}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export default function OrderflowDiagnosticView({
  result,
  title,
  subtitle,
  customerFacing = false,
  primaryAction,
  secondaryAction,
}: OrderflowDiagnosticViewProps) {
  const sortedDimensions = Object.entries(result.normalizedScores).sort((a, b) => b[1] - a[1]);
  const track = diagnosticTracks[result.trackId];
  const { trackEvent } = useTracking();
  const [showAllRewards, setShowAllRewards] = React.useState(false);
  const visibleRewards = customerFacing && !showAllRewards
    ? result.unlockRewards.slice(0, 2)
    : result.unlockRewards;

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
                {customerFacing ? "建议方向" : "推荐路径"}
              </p>
              <p className="text-sm font-semibold" style={{ color: "var(--text-strong)" }}>
                {result.recommendedPath}
              </p>
            </div>
          </div>
          <div className="rounded-xl px-4 py-3" style={{ background: "rgba(var(--primary-rgb), 0.08)" }}>
            <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>
              {customerFacing ? "下一步建议" : "建议动作"}
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
          <OrderflowRadarChart scores={result.normalizedScores} />
          <div className="space-y-4 mb-5">
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

          <h2 className="text-lg font-bold mb-3" style={{ color: "var(--text-strong)" }}>
            当前判断
          </h2>
          <div className="rounded-xl px-4 py-3 mb-4" style={{ background: "rgba(var(--primary-rgb), 0.08)" }}>
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-strong)" }}>
              {result.userSummary}
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-3 mb-4">
            <div
              className="rounded-xl px-4 py-3"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>
                交易阶段
              </p>
              <p className="text-sm font-semibold mb-1" style={{ color: "var(--text-strong)" }}>
                {result.customerProfile.traderStage.label}
              </p>
              <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
                {result.customerProfile.traderStage.summary}
              </p>
            </div>
            {!customerFacing && (
              <div
                className="rounded-xl px-4 py-3"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>
                  付费意向
                </p>
                <p className="text-sm font-semibold mb-1" style={{ color: "var(--text-strong)" }}>
                  {result.customerProfile.paymentIntent.label}
                </p>
                <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
                  {result.customerProfile.paymentIntent.summary}
                </p>
              </div>
            )}
          </div>
          <div className="grid md:grid-cols-2 gap-3 mb-4">
            <div
              className="rounded-xl px-4 py-3"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>
                当前强项
              </p>
              <p className="text-sm font-semibold" style={{ color: "var(--text-strong)" }}>
                {result.topDimensions.map((dimension) => diagnosticDimensionLabels[dimension]).join("、")}
              </p>
            </div>
            <div
              className="rounded-xl px-4 py-3"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>
                优先补强
              </p>
              <p className="text-sm font-semibold" style={{ color: "var(--text-strong)" }}>
                {result.bottomDimensions.map((dimension) => diagnosticDimensionLabels[dimension]).join("、")}
              </p>
            </div>
          </div>

          {!customerFacing && (
            <div
              className="rounded-xl px-4 py-3 mb-4"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>
                交易系统映射
              </p>
              <p className="text-sm font-semibold mb-2" style={{ color: "var(--text-strong)" }}>
                {result.systemMapping.route.label}
              </p>
              <p className="text-xs leading-relaxed mb-1" style={{ color: "var(--text-muted)" }}>
                {result.systemMapping.route.fitFor}
              </p>
              <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
                {result.systemMapping.reason}
              </p>
            </div>
          )}

        </motion.div>

        {!customerFacing && (
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
        )}

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...ease, delay: customerFacing ? 0.18 : 0.24 }}
          className="rounded-2xl p-6"
          style={{ background: "var(--bg-1)", border: "1px solid var(--border)" }}
        >
          <h2 className="text-lg font-bold mb-4" style={{ color: "var(--text-strong)" }}>
            {customerFacing ? "学习资料与下一步" : "已解锁资料"}
          </h2>
          {customerFacing ? (
            <p className="text-sm leading-relaxed mb-4" style={{ color: "var(--text-muted)" }}>
              先看前两项重点资料，剩余内容可按需要展开。
            </p>
          ) : null}
          <div className="space-y-3">
            {visibleRewards.map((reward) => {
              const action = resolveRewardAction(reward);
              return (
                <div
                  key={reward.id}
                  className="rounded-xl px-4 py-3"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <p className="text-sm font-semibold mb-1" style={{ color: "var(--text-strong)" }}>
                    {reward.title}
                  </p>
                  <p className="text-xs leading-relaxed mb-3" style={{ color: "var(--text-muted)" }}>
                    {reward.description}
                  </p>
                  <a
                    href={action.href}
                    target={action.external ? "_blank" : undefined}
                    rel={action.external ? "noopener noreferrer" : undefined}
                    onClick={() => trackEvent("diagnostic_reward_click", {
                      rewardId: reward.id,
                      rewardTitle: reward.title,
                      trackId: result.trackId,
                      href: action.href,
                    })}
                    className="inline-flex items-center gap-1.5 text-xs font-medium"
                    style={{ color: "var(--gold)" }}
                  >
                    {action.label}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              );
            })}
          </div>
          {customerFacing && result.unlockRewards.length > 2 ? (
            <button
              type="button"
              onClick={() => setShowAllRewards((value) => !value)}
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium"
              style={{ color: "var(--gold)" }}
            >
              {showAllRewards ? "收起资料" : "展开全部资料"}
            </button>
          ) : null}
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
