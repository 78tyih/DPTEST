import type { DiagnosticDimension, DiagnosticTrackId, SegmentTagId } from "./orderflowDiagnostic";

export type OrderflowTraderStageId =
  | "newbie"
  | "explorer"
  | "builder"
  | "advanced"
  | "master";

export type OrderflowPaymentIntentId =
  | "resource-only"
  | "warming-up"
  | "paying-likely"
  | "high-intent";

export interface OrderflowTraderStageProfile {
  id: OrderflowTraderStageId;
  label: string;
  summary: string;
  salesHint: string;
}

export interface OrderflowPaymentIntentProfile {
  id: OrderflowPaymentIntentId;
  label: string;
  summary: string;
  salesHint: string;
  isPayingLikely: boolean;
}

export interface OrderflowCustomerProfile {
  traderStage: OrderflowTraderStageProfile;
  paymentIntent: OrderflowPaymentIntentProfile;
  brief: string;
}

const traderStageProfiles: Record<OrderflowTraderStageId, OrderflowTraderStageProfile> = {
  newbie: {
    id: "newbie",
    label: "订单流小白",
    summary: "对订单流还停留在感兴趣阶段，先补概念和正确预期。",
    salesHint: "先给学习笔记、15 分钟视频和 FAQ，不直接推进成交。",
  },
  explorer: {
    id: "explorer",
    label: "探索型交易者",
    summary: "已经开始理解订单流，但路径和纪律还不稳定。",
    salesHint: "先用直播、案例和浅层资料继续培育，再推进下一步。",
  },
  builder: {
    id: "builder",
    label: "训练型交易者",
    summary: "具备一定基础，适合进入系统训练和验证阶段。",
    salesHint: "优先承接课程训练或考试盘验证路径。",
  },
  advanced: {
    id: "advanced",
    label: "成熟交易者",
    summary: "基础较完整，适合快速进入课程、软件或诊断沟通。",
    salesHint: "重点推进课程方案、软件试用和一对一沟通。",
  },
  master: {
    id: "master",
    label: "交易大师型",
    summary: "认知、纪律和行动信号都很强，是高优先级承接对象。",
    salesHint: "优先由销售快速跟进，避免只放入普通培育池。",
  },
};

const paymentIntentProfiles: Record<OrderflowPaymentIntentId, OrderflowPaymentIntentProfile> = {
  "resource-only": {
    id: "resource-only",
    label: "免费资料意向",
    summary: "目前更像先拿资料和观察内容，不是直接承接型。",
    salesHint: "先给免费资料和直播入口，不占用高价值销售时间。",
    isPayingLikely: false,
  },
  "warming-up": {
    id: "warming-up",
    label: "待培育付费意向",
    summary: "已经有一定兴趣，但仍需要内容建立信任和理解。",
    salesHint: "先做直播培育和案例教育，再看互动强度。",
    isPayingLikely: false,
  },
  "paying-likely": {
    id: "paying-likely",
    label: "明确付费意向",
    summary: "已经出现清晰承接意愿，适合进入课程或软件承接。",
    salesHint: "尽快推进课程、软件试用或诊断沟通。",
    isPayingLikely: true,
  },
  "high-intent": {
    id: "high-intent",
    label: "高付费意向",
    summary: "不仅有意向，而且具备较强行动和转化信号。",
    salesHint: "优先快速跟进，避免延迟导致流失。",
    isPayingLikely: true,
  },
};

interface ResolveOrderflowCustomerProfileParams {
  trackId: DiagnosticTrackId;
  avgScore: number;
  normalizedScores: Record<DiagnosticDimension, number>;
  segmentTagIds: SegmentTagId[];
}

export function resolveOrderflowCustomerProfile({
  trackId,
  avgScore,
  normalizedScores,
  segmentTagIds,
}: ResolveOrderflowCustomerProfileParams): OrderflowCustomerProfile {
  const traderStage = resolveTraderStage({ avgScore, normalizedScores });
  const paymentIntent = resolvePaymentIntent({ trackId, avgScore, normalizedScores, segmentTagIds });

  return {
    traderStage,
    paymentIntent,
    brief: `当前更接近「${traderStage.label}」，付费意向判断为「${paymentIntent.label}」。`,
  };
}

function resolveTraderStage({
  avgScore,
  normalizedScores,
}: Pick<ResolveOrderflowCustomerProfileParams, "avgScore" | "normalizedScores">): OrderflowTraderStageProfile {
  const awareness = normalizedScores.awareness ?? 0;
  const execution = normalizedScores.execution ?? 0;
  const riskControl = normalizedScores["risk-control"] ?? 0;

  if (avgScore >= 88 && awareness >= 80 && execution >= 75 && riskControl >= 75) {
    return traderStageProfiles.master;
  }
  if (avgScore >= 72) {
    return traderStageProfiles.advanced;
  }
  if (avgScore >= 50) {
    return traderStageProfiles.builder;
  }
  if (avgScore >= 28) {
    return traderStageProfiles.explorer;
  }
  return traderStageProfiles.newbie;
}

function resolvePaymentIntent({
  trackId,
  avgScore,
  normalizedScores,
  segmentTagIds,
}: ResolveOrderflowCustomerProfileParams): OrderflowPaymentIntentProfile {
  let signal = normalizedScores["commercial-intent"] ?? 0;

  if (segmentTagIds.includes("course-intent")) {
    signal += 18;
  }
  if (segmentTagIds.includes("software-priority")) {
    signal += 12;
  }
  if (segmentTagIds.includes("evaluation-path")) {
    signal += 8;
  }
  if (segmentTagIds.includes("live-nurture")) {
    signal -= 6;
  }
  if (segmentTagIds.includes("free-resource")) {
    signal -= 20;
  }
  if (segmentTagIds.includes("high-risk")) {
    signal -= 12;
  }
  if (trackId === "deep") {
    signal += 6;
  }
  if (avgScore >= 80) {
    signal += 6;
  }

  if (signal >= 78) {
    return paymentIntentProfiles["high-intent"];
  }
  if (signal >= 56) {
    return paymentIntentProfiles["paying-likely"];
  }
  if (signal >= 30) {
    return paymentIntentProfiles["warming-up"];
  }
  return paymentIntentProfiles["resource-only"];
}
