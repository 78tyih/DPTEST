export type LeadMode = "button" | "swipe";

export type LeadStatus = "pending" | "valid" | "invalid";

export interface LeadInvalidReasonOption {
  value: string;
  label: string;
  description: string;
}

export interface Lead {
  id: string;
  sourcePlatform: string;
  createdAt: string;
  operatorName: string;
  phone: string;
  wechatName: string;
  screenshotUrl: string;
  status?: LeadStatus;
  validAt?: string;
  invalidAt?: string;
  invalidReason?: string;
  invalidNote?: string;
  detail?: string;
  raw?: unknown;
  [key: string]: unknown;
}

export interface LeadSummary {
  total: number;
  pending: number;
  valid: number;
  invalid: number;
}

export interface LeadCollectionResponse {
  items: Lead[];
  summary: LeadSummary;
}

export interface LeadStatsResponse {
  summary: LeadSummary & {
    processedToday?: number;
    validRate?: number;
    invalidRate?: number;
    avgHandleMinutes?: number;
  };
  bySource: Array<{ sourcePlatform: string; count: number }>;
  byReason: Array<{ reason: string; count: number }>;
  trend: Array<{ label: string; valid: number; invalid: number }>;
  recentValid: Lead[];
  recentInvalid: Lead[];
}

export interface LeadInvalidPayload {
  reason: string;
  note?: string;
}

export const LEAD_QUEUE_MODE_STORAGE_KEY = "lead-queue-mode";

export const LEAD_INVALID_REASONS: LeadInvalidReasonOption[] = [
  {
    value: "not_found",
    label: "搜不到",
    description: "手机号、微信名或线索信息无法定位到客户",
  },
  {
    value: "added_by_other_sales",
    label: "已被其他销售添加",
    description: "客户已被同事触达，不再重复跟进",
  },
  {
    value: "existing_student_or_duplicate",
    label: "已是学员 / 重复添加",
    description: "客户已在库内或已经进入学员池",
  },
  {
    value: "account_abnormal",
    label: "账号异常",
    description: "账号异常、封禁或状态不可用",
  },
  {
    value: "rejected",
    label: "拒绝添加",
    description: "客户明确拒绝通过好友申请",
  },
  {
    value: "invalid_info",
    label: "信息错误",
    description: "手机号、微信名或截图信息存在明显错误",
  },
  {
    value: "no_response",
    label: "无回应",
    description: "多次尝试后仍未得到任何回应",
  },
  {
    value: "other",
    label: "其他",
    description: "需要填写补充备注",
  },
];

function toStringValue(value: unknown, fallback = "") {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "bigint") return String(value);
  return fallback;
}

function toNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function coerceLead(value: unknown): Lead {
  const lead = (value ?? {}) as Record<string, unknown>;
  const id = toStringValue(
    lead.id ?? lead.leadId ?? lead.lead_id ?? lead.uuid ?? lead.contactId ?? lead.contact_id,
    "",
  );

  return {
    ...lead,
    id: id || `${toStringValue(lead.phone, "lead")}-${toStringValue(lead.createdAt ?? lead.created_at, String(Date.now()))}`,
    sourcePlatform: toStringValue(
      lead.sourcePlatform ?? lead.source_platform ?? lead.platform ?? lead.source ?? lead.channel,
      "未知来源",
    ),
    createdAt: toStringValue(lead.createdAt ?? lead.created_at ?? lead.importedAt ?? lead.imported_at, ""),
    operatorName: toStringValue(
      lead.operatorName ?? lead.operator_name ?? lead.operator ?? lead.creatorName ?? lead.creator_name,
      "未知运营",
    ),
    phone: toStringValue(lead.phone ?? lead.mobile ?? lead.contactPhone ?? lead.contact_phone, "-"),
    wechatName: toStringValue(lead.wechatName ?? lead.wechat_name ?? lead.wechat ?? lead.wxName, "-"),
    screenshotUrl: toStringValue(
      lead.screenshotUrl ?? lead.screenshot_url ?? lead.imageUrl ?? lead.image_url ?? lead.previewUrl ?? lead.preview_url,
      "",
    ),
    status: (lead.status as LeadStatus | undefined) ?? undefined,
    validAt: toStringValue(lead.validAt ?? lead.valid_at, ""),
    invalidAt: toStringValue(lead.invalidAt ?? lead.invalid_at, ""),
    invalidReason: toStringValue(lead.invalidReason ?? lead.invalid_reason, ""),
    invalidNote: toStringValue(lead.invalidNote ?? lead.invalid_note, ""),
    detail: toStringValue(lead.detail ?? lead.description ?? lead.note, ""),
    raw: value,
  };
}

function coerceLeadList(value: unknown): Lead[] {
  if (Array.isArray(value)) {
    return value.map(coerceLead);
  }
  return [];
}

function coerceSummary(value: unknown): LeadSummary {
  const summary = (value ?? {}) as Record<string, unknown>;
  return {
    total: toNumber(summary.total ?? summary.count ?? summary.all ?? summary.size, 0),
    pending: toNumber(summary.pending ?? summary.queue ?? summary.waiting, 0),
    valid: toNumber(summary.valid ?? summary.passed ?? summary.success, 0),
    invalid: toNumber(summary.invalid ?? summary.failed ?? summary.rejected, 0),
  };
}

function extractListPayload(payload: unknown) {
  const data = (payload ?? {}) as Record<string, unknown>;
  const candidates = [
    data.items,
    data.leads,
    data.queue,
    data.data,
    data.results,
    data.rows,
  ];
  const items = candidates.find(Array.isArray);
  return {
    items: coerceLeadList(items),
    summary: coerceSummary(data.summary ?? data.stats ?? data.summaryStats ?? data),
  };
}

function extractStatsPayload(payload: unknown): LeadStatsResponse {
  const data = (payload ?? {}) as Record<string, unknown>;
  const bySource = Array.isArray(data.bySource)
    ? data.bySource.map((item) => ({
        sourcePlatform: toStringValue((item as Record<string, unknown>).sourcePlatform ?? (item as Record<string, unknown>).platform ?? (item as Record<string, unknown>).name, "未知来源"),
        count: toNumber((item as Record<string, unknown>).count, 0),
      }))
    : [];
  const byReason = Array.isArray(data.byReason)
    ? data.byReason.map((item) => ({
        reason: toStringValue((item as Record<string, unknown>).reason ?? (item as Record<string, unknown>).label, "其他"),
        count: toNumber((item as Record<string, unknown>).count, 0),
      }))
    : [];
  const trend = Array.isArray(data.trend)
    ? data.trend.map((item) => ({
        label: toStringValue((item as Record<string, unknown>).label ?? (item as Record<string, unknown>).day, ""),
        valid: toNumber((item as Record<string, unknown>).valid, 0),
        invalid: toNumber((item as Record<string, unknown>).invalid, 0),
      }))
    : [];

  return {
    summary: {
      ...coerceSummary(data.summary ?? data.stats ?? data),
      processedToday: toNumber((data.summary as Record<string, unknown> | undefined)?.processedToday ?? data.processedToday, 0),
      validRate: toNumber((data.summary as Record<string, unknown> | undefined)?.validRate ?? data.validRate, 0),
      invalidRate: toNumber((data.summary as Record<string, unknown> | undefined)?.invalidRate ?? data.invalidRate, 0),
      avgHandleMinutes: toNumber((data.summary as Record<string, unknown> | undefined)?.avgHandleMinutes ?? data.avgHandleMinutes, 0),
    },
    bySource,
    byReason,
    trend,
    recentValid: coerceLeadList(data.recentValid ?? data.validRecent ?? data.validItems),
    recentInvalid: coerceLeadList(data.recentInvalid ?? data.invalidRecent ?? data.invalidItems),
  };
}

export async function requestLeadJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(url, {
    ...init,
    credentials: "include",
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null) as { message?: string } | null;
    throw new Error(body?.message || `请求失败：${res.status}`);
  }

  return (await res.json()) as T;
}

export function normalizeLeadCollection(payload: unknown): LeadCollectionResponse {
  return extractListPayload(payload);
}

export function normalizeLeadStats(payload: unknown): LeadStatsResponse {
  return extractStatsPayload(payload);
}

export function formatLeadTimestamp(value: string) {
  if (!value) return "未知时间";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (sameDay) {
    return `今天 ${date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`;
  }

  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatLeadDateTime(value: string) {
  if (!value) return "未知";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export async function getLeadQueue() {
  return requestLeadJSON<LeadCollectionResponse>("/api/lead/queue").then(normalizeLeadCollection);
}

export async function getLeadValid() {
  return requestLeadJSON<LeadCollectionResponse>("/api/lead/valid").then(normalizeLeadCollection);
}

export async function getLeadInvalid() {
  return requestLeadJSON<LeadCollectionResponse>("/api/lead/invalid").then(normalizeLeadCollection);
}

export async function getLeadStatsMe() {
  return requestLeadJSON<LeadStatsResponse>("/api/lead/stats/me").then(normalizeLeadStats);
}

export async function markLeadValid(id: string) {
  return requestLeadJSON<{ ok: boolean }>(`/api/lead/${id}/mark-valid`, { method: "POST" });
}

export async function markLeadInvalid(id: string, payload: LeadInvalidPayload) {
  return requestLeadJSON<{ ok: boolean }>(`/api/lead/${id}/mark-invalid`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
