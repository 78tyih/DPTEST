interface AdminSalesPoolUserLike {
  id: number;
  phone: string;
  nickname: string | null;
  tags?: unknown;
  created_at?: string | Date | null;
  quiz_completed_at?: string | Date | null;
  scores: unknown;
}

interface AdminOrderflowSummary {
  traderStageLabel: string;
  paymentIntentLabel: string;
  recommendedPath: string;
  segmentTagLabels: string[];
}

export interface AdminSalesPoolCard {
  key: string;
  label: string;
  description: string;
  total: number;
  todayNew: number;
  pendingFollowUp: number;
}

export interface AdminSalesPoolPendingUser {
  id: number;
  phone: string;
  nickname: string | null;
  traderStageLabel: string;
  paymentIntentLabel: string;
  recommendedPath: string;
  poolLabels: string[];
  quizCompletedAt: string | null;
  createdAt: string | null;
  followStatus: string;
}

export interface AdminSalesPoolStats {
  cards: AdminSalesPoolCard[];
  pendingUsers: AdminSalesPoolPendingUser[];
}

const SALES_POOL_DEFINITIONS = [
  {
    key: "high-payment",
    label: "高付费意向",
    description: "优先联系已具备明确预算和购买意愿的客户。",
    matches: (summary: AdminOrderflowSummary) => summary.paymentIntentLabel === "高付费意向",
  },
  {
    key: "novice",
    label: "订单流小白",
    description: "适合先推入门资料和直播培育的客户池。",
    matches: (summary: AdminOrderflowSummary) => summary.traderStageLabel === "订单流小白",
  },
  {
    key: "trading-master",
    label: "交易大师型",
    description: "偏成熟客群，适合直接讨论训练和执行体系。",
    matches: (summary: AdminOrderflowSummary) => summary.traderStageLabel === "交易大师型",
  },
  {
    key: "course-intent",
    label: "课程高意向",
    description: "优先推进课程诊断和体系化训练转化。",
    matches: (summary: AdminOrderflowSummary) => summary.segmentTagLabels.includes("课程高意向"),
  },
  {
    key: "risk-cooling",
    label: "风险降温",
    description: "先做预期管理，不直接推进高价成交。",
    matches: (summary: AdminOrderflowSummary) => summary.recommendedPath === "风险降温系统",
  },
];

export function buildAdminSalesPoolStats<T extends AdminSalesPoolUserLike>(
  users: readonly T[],
  now = new Date(),
): AdminSalesPoolStats {
  const todayKey = toShanghaiDayKey(now);
  const orderflowUsers = users
    .map((user) => ({
      user,
      summary: deriveServerOrderflowSummary(user.scores),
    }))
    .filter((item) => item.summary.recommendedPath || item.summary.paymentIntentLabel || item.summary.traderStageLabel);

  const cards = SALES_POOL_DEFINITIONS.map((definition) => {
    const matched = orderflowUsers.filter((item) => definition.matches(item.summary));
    const todayNew = matched.filter((item) => toShanghaiDayKey(resolvePrimaryDate(item.user)) === todayKey).length;
    const pendingFollowUp = matched.filter((item) => isPendingFollowUp(readFollowStatus(item.user.tags))).length;

    return {
      key: definition.key,
      label: definition.label,
      description: definition.description,
      total: matched.length,
      todayNew,
      pendingFollowUp,
    };
  });

  const pendingUsers = orderflowUsers
    .filter((item) => isPendingFollowUp(readFollowStatus(item.user.tags)))
    .map(({ user, summary }) => ({
      id: user.id,
      phone: user.phone,
      nickname: user.nickname,
      traderStageLabel: summary.traderStageLabel,
      paymentIntentLabel: summary.paymentIntentLabel,
      recommendedPath: summary.recommendedPath,
      poolLabels: SALES_POOL_DEFINITIONS.filter((definition) => definition.matches(summary)).map((definition) => definition.label),
      quizCompletedAt: toIsoString(user.quiz_completed_at),
      createdAt: toIsoString(user.created_at),
      followStatus: readFollowStatus(user.tags) ?? "new",
    }))
    .sort((a, b) => {
      const aTime = Date.parse(a.quizCompletedAt ?? a.createdAt ?? "") || 0;
      const bTime = Date.parse(b.quizCompletedAt ?? b.createdAt ?? "") || 0;
      return bTime - aTime;
    })
    .slice(0, 8);

  return {
    cards,
    pendingUsers,
  };
}

function isPendingFollowUp(status: string | null | undefined): boolean {
  return !status || status === "new";
}

function readFollowStatus(tags: unknown): string | null {
  if (!tags || typeof tags !== "object") {
    return null;
  }
  const value = (tags as { status?: unknown }).status;
  return typeof value === "string" ? value : null;
}

function resolvePrimaryDate(user: AdminSalesPoolUserLike): Date | null {
  return parseDate(user.quiz_completed_at) ?? parseDate(user.created_at);
}

function parseDate(value: string | Date | null | undefined): Date | null {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toShanghaiDayKey(value: string | Date | null | undefined): string {
  const date = parseDate(value);
  if (!date) {
    return "";
  }
  return date.toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" });
}

function toIsoString(value: string | Date | null | undefined): string | null {
  const date = parseDate(value);
  return date ? date.toISOString() : null;
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
