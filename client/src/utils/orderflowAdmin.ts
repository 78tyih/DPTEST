export interface AdminOrderflowSummary {
  mode: "legacy" | "orderflow" | "unknown";
  dimensionScores: Record<string, number> | null;
  traderStageLabel: string;
  paymentIntentLabel: string;
  recommendedPath: string;
  scoreBandTitle: string;
  segmentTagLabels: string[];
}

const EMPTY_SUMMARY: AdminOrderflowSummary = {
  mode: "unknown",
  dimensionScores: null,
  traderStageLabel: "",
  paymentIntentLabel: "",
  recommendedPath: "",
  scoreBandTitle: "",
  segmentTagLabels: [],
};

export function deriveAdminOrderflowSummary(scores: unknown): AdminOrderflowSummary {
  if (!scores || typeof scores !== "object") {
    return EMPTY_SUMMARY;
  }

  const record = scores as Record<string, unknown>;

  if (record.mode === "orderflow-diagnostic") {
    return {
      mode: "orderflow",
      dimensionScores: isNumberRecord(record.dimensions) ? record.dimensions : null,
      traderStageLabel: readNestedString(record, ["customerProfile", "traderStage", "label"]),
      paymentIntentLabel: readNestedString(record, ["customerProfile", "paymentIntent", "label"]),
      recommendedPath: typeof record.recommendedPath === "string" ? record.recommendedPath : "",
      scoreBandTitle: readNestedString(record, ["scoreBand", "title"]),
      segmentTagLabels: Array.isArray(record.segmentTags)
        ? record.segmentTags
            .map((item) => (item && typeof item === "object" && typeof (item as { label?: unknown }).label === "string"
              ? (item as { label: string }).label
              : ""))
            .filter(Boolean)
        : [],
    };
  }

  if (looksLikeLegacyDimensionScores(record)) {
    return {
      mode: "legacy",
      dimensionScores: record as Record<string, number>,
      traderStageLabel: "",
      paymentIntentLabel: "",
      recommendedPath: "",
      scoreBandTitle: "",
      segmentTagLabels: [],
    };
  }

  return EMPTY_SUMMARY;
}

function isNumberRecord(value: unknown): value is Record<string, number> {
  return !!value && typeof value === "object" && Object.values(value).every((item) => typeof item === "number");
}

function looksLikeLegacyDimensionScores(value: Record<string, unknown>): boolean {
  return ["EDGE", "EXEC", "RISK", "ADAPT", "MENTAL", "SYSTEM"].some((key) => typeof value[key] === "number");
}

function readNestedString(source: Record<string, unknown>, path: string[]): string {
  let current: unknown = source;

  for (const key of path) {
    if (!current || typeof current !== "object" || !(key in current)) {
      return "";
    }
    current = (current as Record<string, unknown>)[key];
  }

  return typeof current === "string" ? current : "";
}
