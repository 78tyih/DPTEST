import type {
  DiagnosticDimension,
  DiagnosticTrackId,
  RewardAsset,
  ScoreBand,
  SegmentTagDefinition,
} from "@/data/orderflowDiagnostic";
import type { OrderflowSystemMapping } from "@/data/orderflowLogicMap";
import { getQuestionSetByTrack, type OrderflowDiagnosticResult } from "@/utils/orderflowDiagnostic";

export interface StoredOrderflowScores {
  mode: "orderflow-diagnostic";
  trackId: DiagnosticTrackId;
  dimensions: Record<DiagnosticDimension, number>;
  scoreBand: ScoreBand;
  segmentTags: SegmentTagDefinition[];
  unlockRewards: RewardAsset[];
  recommendedAction: string;
  recommendedPath: string;
  topDimensions: DiagnosticDimension[];
  bottomDimensions: DiagnosticDimension[];
  systemMapping: OrderflowSystemMapping;
  userSummary: string;
  salesSummary: OrderflowDiagnosticResult["salesSummary"];
}

export interface OrderflowStoredRecordLike {
  scores: unknown;
  traderTypeCode: string;
  avgScore: number;
  rankName: string;
}

export function buildOrderflowQuizSubmission(
  answers: number[],
  result: OrderflowDiagnosticResult,
) {
  const traderTypeCode = result.trackId === "deep" ? "OF_DEEP" : "OF_STARTER";

  return {
    answers,
    traderTypeCode,
    avgScore: result.avgScore,
    rankName: result.scoreBand.title,
    scores: {
      mode: "orderflow-diagnostic" as const,
      trackId: result.trackId,
      dimensions: result.normalizedScores,
      scoreBand: result.scoreBand,
      segmentTags: result.segmentTags,
      unlockRewards: result.unlockRewards,
      recommendedAction: result.recommendedAction,
      recommendedPath: result.recommendedPath,
      topDimensions: result.topDimensions,
      bottomDimensions: result.bottomDimensions,
      systemMapping: result.systemMapping,
      userSummary: result.userSummary,
      salesSummary: result.salesSummary,
    },
  };
}

export function isOrderflowStoredScores(scores: unknown): scores is StoredOrderflowScores {
  if (!scores || typeof scores !== "object") {
    return false;
  }

  const maybe = scores as Partial<StoredOrderflowScores>;
  return maybe.mode === "orderflow-diagnostic" && (maybe.trackId === "starter" || maybe.trackId === "deep");
}

export function reconstructOrderflowResultFromStoredRecord(
  record: OrderflowStoredRecordLike,
): OrderflowDiagnosticResult | null {
  if (!isOrderflowStoredScores(record.scores)) {
    return null;
  }

  const stored = record.scores;
  const topDimensions = stored.topDimensions?.length
    ? stored.topDimensions
    : Object.entries(stored.dimensions)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([dimension]) => dimension as DiagnosticDimension);
  const bottomDimensions = stored.bottomDimensions?.length
    ? stored.bottomDimensions
    : Object.entries(stored.dimensions)
        .sort((a, b) => a[1] - b[1])
        .slice(0, 2)
        .map(([dimension]) => dimension as DiagnosticDimension);

  return {
    kind: "orderflow",
    trackId: stored.trackId,
    questions: getQuestionSetByTrack(stored.trackId),
    rawScores: stored.dimensions,
    normalizedScores: stored.dimensions,
    avgScore: record.avgScore,
    scoreBand: stored.scoreBand,
    topDimensions,
    bottomDimensions,
    segmentTags: stored.segmentTags ?? [],
    segmentSignalScores: {},
    unlockRewards: stored.unlockRewards ?? [],
    recommendedAction: stored.recommendedAction,
    recommendedPath: stored.recommendedPath,
    systemMapping: stored.systemMapping ?? {
      route: {
        id: "live-nurture",
        label: stored.recommendedPath,
        description: stored.scoreBand.summary,
        fitFor: stored.scoreBand.summary,
        salesFocus: stored.recommendedAction,
        nextStep: stored.recommendedAction,
      },
      reason: "历史记录缺少系统映射，按旧结果字段回填。",
    },
    userSummary: stored.userSummary ?? stored.scoreBand.summary,
    salesSummary: stored.salesSummary ?? {
      priorityLabel: "持续培育",
      fitConclusion: stored.scoreBand.summary,
      conversationHook: stored.recommendedAction,
      riskAlert: "历史记录缺少销售摘要，请以当前报告为准。",
      nextStep: stored.recommendedAction,
    },
  };
}
