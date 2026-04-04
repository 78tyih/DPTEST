import {
  type DiagnosticDimension,
  type DiagnosticQuestion,
  type DiagnosticTrackId,
  type RewardAsset,
  type ScoreBand,
  type SegmentTagDefinition,
  type SegmentTagId,
  diagnosticQuestions,
  diagnosticDimensionLabels,
  diagnosticTracks,
  rewardAssets,
  scoreBands,
  segmentTagDefinitions,
} from "@/data/orderflowDiagnostic";
import { resolveOrderflowSystemMapping, type OrderflowSystemMapping } from "@/data/orderflowLogicMap";
import { buildOrderflowSalesPlaybook, type OrderflowSalesPlaybook } from "@/data/orderflowSalesPlaybook";

export interface OrderflowDiagnosticResult {
  kind: "orderflow";
  trackId: DiagnosticTrackId;
  questions: DiagnosticQuestion[];
  rawScores: Record<DiagnosticDimension, number>;
  normalizedScores: Record<DiagnosticDimension, number>;
  avgScore: number;
  scoreBand: ScoreBand;
  topDimensions: DiagnosticDimension[];
  bottomDimensions: DiagnosticDimension[];
  segmentTags: SegmentTagDefinition[];
  segmentSignalScores: Partial<Record<SegmentTagId, number>>;
  unlockRewards: RewardAsset[];
  recommendedPath: string;
  recommendedAction: string;
  systemMapping: OrderflowSystemMapping;
  salesPlaybook: OrderflowSalesPlaybook;
  userSummary: string;
  salesSummary: {
    priorityLabel: string;
    fitConclusion: string;
    conversationHook: string;
    riskAlert: string;
    nextStep: string;
  };
}

const dimensions: DiagnosticDimension[] = [
  "awareness",
  "market-fit",
  "risk-control",
  "execution",
  "tool-readiness",
  "commercial-intent",
];

const dimensionImprovementHints: Record<DiagnosticDimension, string> = {
  awareness: "先把订单流从概念理解成可观察的盘面语言",
  "market-fit": "先确认你当前市场与订单流工具的适配路径",
  "risk-control": "先补止损、仓位和连续亏损处理规则",
  execution: "先补训练频率、复盘习惯和纪律执行",
  "tool-readiness": "先补软件、Level2 和盘面配置准备度",
  "commercial-intent": "先明确你是资料体验、软件试用还是课程承接",
};

function createEmptyScores(): Record<DiagnosticDimension, number> {
  return {
    awareness: 0,
    "market-fit": 0,
    "risk-control": 0,
    execution: 0,
    "tool-readiness": 0,
    "commercial-intent": 0,
  };
}

function computeMaxScores(trackId: DiagnosticTrackId): Record<DiagnosticDimension, number> {
  const questions = diagnosticQuestions[trackId];
  const maxScores = createEmptyScores();

  for (const question of questions) {
    for (const dimension of dimensions) {
      let best = 0;
      for (const option of question.options) {
        best = Math.max(best, option.dimensionScores[dimension] ?? 0);
      }
      maxScores[dimension] += best;
    }
  }

  return maxScores;
}

const maxScoresByTrack: Record<DiagnosticTrackId, Record<DiagnosticDimension, number>> = {
  starter: computeMaxScores("starter"),
  deep: computeMaxScores("deep"),
};

export function getQuestionSetByTrack(trackId: DiagnosticTrackId): DiagnosticQuestion[] {
  const track = diagnosticTracks[trackId];
  if (!track) {
    throw new Error(`Unknown diagnostic track: ${trackId}`);
  }

  return diagnosticQuestions[trackId];
}

export function calculateOrderflowDiagnosticResult(
  trackId: DiagnosticTrackId,
  answers: number[],
): OrderflowDiagnosticResult {
  const questions = getQuestionSetByTrack(trackId);
  const rawScores = createEmptyScores();
  const segmentSignalScores: Partial<Record<SegmentTagId, number>> = {};

  answers.forEach((answerIndex, questionIndex) => {
    const question = questions[questionIndex];
    if (!question) {
      return;
    }

    const option = question.options[answerIndex];
    if (!option) {
      return;
    }

    for (const [dimension, score] of Object.entries(option.dimensionScores)) {
      rawScores[dimension as DiagnosticDimension] += score ?? 0;
    }

    for (const [segmentTag, signalScore] of Object.entries(option.segmentSignals ?? {})) {
      const key = segmentTag as SegmentTagId;
      segmentSignalScores[key] = (segmentSignalScores[key] ?? 0) + (signalScore ?? 0);
    }
  });

  const normalizedScores = createEmptyScores();
  const maxScores = maxScoresByTrack[trackId];

  for (const dimension of dimensions) {
    const maxScore = maxScores[dimension];
    normalizedScores[dimension] = maxScore === 0
      ? 0
      : Math.min(100, Math.round((rawScores[dimension] / maxScore) * 100));
  }

  const avgScore = Math.round(
    Object.values(normalizedScores).reduce((sum, value) => sum + value, 0) / dimensions.length,
  );

  const scoreBand = scoreBands.find((band) => band.track === trackId && avgScore >= band.min && avgScore <= band.max);
  if (!scoreBand) {
    throw new Error(`No score band found for track ${trackId} and score ${avgScore}`);
  }

  const rankedDimensions = Object.entries(normalizedScores)
    .sort((a, b) => b[1] - a[1])
    .map(([dimension]) => dimension as DiagnosticDimension);

  const topDimensions = rankedDimensions.slice(0, 2);
  const bottomDimensions = [...rankedDimensions].reverse().slice(0, 2);

  const segmentTags = Object.entries(segmentSignalScores)
    .filter(([, score]) => (score ?? 0) > 0)
    .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
    .slice(0, 3)
    .map(([segmentId]) => segmentTagDefinitions[segmentId as SegmentTagId]);

  const unlockRewards = rewardAssets.filter((asset) => {
    if (trackId === "deep") {
      return true;
    }
    return asset.unlockLevel === "starter";
  });

  const primaryTag = segmentTags[0] ?? segmentTagDefinitions["live-nurture"];
  const systemMapping = resolveOrderflowSystemMapping({
    trackId,
    scoreBandId: scoreBand.id as Parameters<typeof resolveOrderflowSystemMapping>[0]["scoreBandId"],
    segmentTagIds: segmentTags.map((tag) => tag.id),
  });
  const topLabels = topDimensions.map((dimension) => diagnosticDimensionLabels[dimension]);
  const bottomLabels = bottomDimensions.map((dimension) => diagnosticDimensionLabels[dimension]);

  const priorityLabel = (() => {
    const hasHighRisk = segmentTags.some((tag) => tag.id === "high-risk");

    if (hasHighRisk && avgScore < 60) {
      return "先降温，不直接成交";
    }
    if (trackId === "deep" && avgScore >= 85) {
      return "立即跟进";
    }
    if ((trackId === "deep" && avgScore >= 65) || (trackId === "starter" && avgScore >= 70)) {
      return "重点跟进";
    }
    if ((trackId === "deep" && avgScore >= 45) || (trackId === "starter" && avgScore >= 40)) {
      return "持续培育";
    }
    return "资料池培育";
  })();

  const conversationHook = (() => {
    switch (primaryTag.id) {
      case "course-intent":
        return "先从课程大纲、训练节奏和真实案例切入，让对方感受到这不是单纯讲概念。";
      case "software-priority":
        return "先从软件试用、盘面演示和执行场景切入，再判断是否衔接课程。";
      case "evaluation-path":
        return "先从模拟盘 / 考试盘验证路径切入，把预期从赚钱想象拉回到训练闭环。";
      case "free-resource":
        return "先给资料和学习笔记，观察内容消费和二次互动，不急着推进成交。";
      case "high-risk":
        return "先做预期管理和风控教育，不要直接承诺效果或推动高价成交。";
      case "live-nurture":
      default:
        return "先用直播、FAQ 和案例继续预热，再根据互动强度推进下一步。";
    }
  })();

  const riskAlert = (() => {
    if (segmentTags.some((tag) => tag.id === "high-risk")) {
      return "存在急于验证、神化工具或风控不足的风险，沟通时不要承诺收益。";
    }
    if (bottomDimensions.includes("risk-control") || bottomDimensions.includes("execution")) {
      return "优先观察风控和执行纪律，避免把话题直接拉到收益结果。";
    }
    return "暂无明显高风险信号，重点验证其行动力和后续互动意愿。";
  })();

  const nextStep = (() => {
    if (trackId === "starter") {
      if (avgScore >= 70) {
        return "引导进入深度测评，再根据结果承接课程、软件或考试盘路径。";
      }
      return "先发浅测解锁资料，观察直播、笔记和社群内容的消费情况。";
    }

    switch (primaryTag.id) {
      case "course-intent":
        return "优先安排诊断沟通，发送课程大纲、案例和学习路径说明。";
      case "software-priority":
        return "优先发软件试用申请和盘面演示，再约一轮短沟通。";
      case "evaluation-path":
        return "优先强调考试盘 / 模拟盘路径和阶段目标，降低直接实盘预期。";
      case "free-resource":
        return "先沉淀进资料和直播培育链路，短期不占用高价值销售时间。";
      case "high-risk":
        return "先做预期管理和风险教育，必要时只给资料，不推进高价产品。";
      case "live-nurture":
      default:
        return "继续直播和案例培育，等对方出现明确需求再做一对一承接。";
    }
  })();

  const userSummary = [
    `你当前对订单流的状态更接近「${scoreBand.title}」。`,
    `优势更偏向 ${topLabels.join("、")}，但接下来最需要补强的是 ${bottomLabels.join("、")}。`,
    `${dimensionImprovementHints[bottomDimensions[0]]}。`,
    `更适合先进入「${systemMapping.route.label}」。`,
  ].join("");

  const salesSummary = {
    priorityLabel,
    fitConclusion: `${trackId === "starter" ? "浅测" : "深测"}结果显示：客户当前最强信号是 ${topLabels.join("、")}，主要补强位是 ${bottomLabels.join("、")}，适合先走「${systemMapping.route.label}」。`,
    conversationHook,
    riskAlert,
    nextStep: systemMapping.route.nextStep,
  };
  const salesPlaybook = buildOrderflowSalesPlaybook({
    trackId,
    systemRouteId: systemMapping.route.id,
    priorityLabel,
    segmentTagIds: segmentTags.map((tag) => tag.id),
    unlockRewardTitles: unlockRewards.map((reward) => reward.title),
  });

  return {
    kind: "orderflow",
    trackId,
    questions,
    rawScores,
    normalizedScores,
    avgScore,
    scoreBand,
    topDimensions,
    bottomDimensions,
    segmentTags,
    segmentSignalScores,
    unlockRewards,
    recommendedPath: systemMapping.route.label,
    recommendedAction: systemMapping.route.nextStep,
    systemMapping,
    salesPlaybook,
    userSummary,
    salesSummary,
  };
}
