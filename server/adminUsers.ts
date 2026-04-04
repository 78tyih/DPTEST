interface AdminUserLike {
  id: number;
  phone: string;
  nickname: string | null;
  wechat_id: string | null;
  trader_type_code: string | null;
  scores: unknown;
}

interface AdminOrderflowSummary {
  traderStageLabel: string;
  paymentIntentLabel: string;
  recommendedPath: string;
  segmentTagLabels: string[];
}

export interface AdminUsersQuery {
  search?: string;
  stage?: string;
  payment?: string;
  path?: string;
  page: number;
  pageSize: number;
}

export interface AdminUsersPage<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function filterAdminUsers<T extends AdminUserLike>(
  users: readonly T[],
  query: AdminUsersQuery,
): AdminUsersPage<T> {
  const search = query.search?.trim().toLowerCase() ?? "";
  const stage = query.stage?.trim() ?? "";
  const payment = query.payment?.trim() ?? "";
  const path = query.path?.trim() ?? "";
  const page = clampPositiveInt(query.page, 1);
  const pageSize = clampPositiveInt(query.pageSize, 20);

  const filtered = users.filter((user) => {
    const summary = deriveServerOrderflowSummary(user.scores);

    if (search) {
      const matchesSearch = user.phone.includes(search)
        || user.nickname?.toLowerCase().includes(search)
        || user.wechat_id?.toLowerCase().includes(search)
        || user.trader_type_code?.toLowerCase().includes(search)
        || summary.traderStageLabel.toLowerCase().includes(search)
        || summary.paymentIntentLabel.toLowerCase().includes(search)
        || summary.recommendedPath.toLowerCase().includes(search)
        || summary.segmentTagLabels.some((label) => label.toLowerCase().includes(search));

      if (!matchesSearch) {
        return false;
      }
    }

    if (stage && summary.traderStageLabel !== stage) {
      return false;
    }
    if (payment && summary.paymentIntentLabel !== payment) {
      return false;
    }
    if (path && summary.recommendedPath !== path) {
      return false;
    }

    return true;
  });

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize);

  return {
    items,
    total,
    page: safePage,
    pageSize,
    totalPages,
  };
}

function deriveServerOrderflowSummary(scores: unknown): AdminOrderflowSummary {
  if (!scores || typeof scores !== "object") {
    return emptySummary();
  }

  const record = scores as Record<string, unknown>;
  if (record.mode !== "orderflow-diagnostic") {
    return emptySummary();
  }

  return {
    traderStageLabel: readNestedString(record, ["customerProfile", "traderStage", "label"]),
    paymentIntentLabel: readNestedString(record, ["customerProfile", "paymentIntent", "label"]),
    recommendedPath: typeof record.recommendedPath === "string" ? record.recommendedPath : "",
    segmentTagLabels: Array.isArray(record.segmentTags)
      ? record.segmentTags
          .map((item) => (item && typeof item === "object" && typeof (item as { label?: unknown }).label === "string"
            ? (item as { label: string }).label
            : ""))
          .filter(Boolean)
      : [],
  };
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

function emptySummary(): AdminOrderflowSummary {
  return {
    traderStageLabel: "",
    paymentIntentLabel: "",
    recommendedPath: "",
    segmentTagLabels: [],
  };
}

function clampPositiveInt(value: number, fallback: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return fallback;
  }
  return Math.floor(value);
}
