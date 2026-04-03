import {
  type DiagnosticDimension,
  type DiagnosticQuestion,
  type DiagnosticTrackId,
  type RewardAsset,
  type ScoreBand,
  type SegmentTagDefinition,
  type SegmentTagId,
  diagnosticQuestions,
  diagnosticTracks,
  rewardAssets,
  scoreBands,
  segmentTagDefinitions,
} from "@/data/orderflowDiagnostic";

export interface OrderflowDiagnosticResult {
  trackId: DiagnosticTrackId;
  questions: DiagnosticQuestion[];
  rawScores: Record<DiagnosticDimension, number>;
  normalizedScores: Record<DiagnosticDimension, number>;
  avgScore: number;
  scoreBand: ScoreBand;
  topDimensions: DiagnosticDimension[];
  segmentTags: SegmentTagDefinition[];
  segmentSignalScores: Partial<Record<SegmentTagId, number>>;
  unlockRewards: RewardAsset[];
  recommendedPath: string;
  recommendedAction: string;
}

const dimensions: DiagnosticDimension[] = [
  "awareness",
  "market-fit",
  "risk-control",
  "execution",
  "tool-readiness",
  "commercial-intent",
];

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

  const topDimensions = Object.entries(normalizedScores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([dimension]) => dimension as DiagnosticDimension);

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

  return {
    trackId,
    questions,
    rawScores,
    normalizedScores,
    avgScore,
    scoreBand,
    topDimensions,
    segmentTags,
    segmentSignalScores,
    unlockRewards,
    recommendedPath: primaryTag.label,
    recommendedAction: primaryTag.salesAction,
  };
}
