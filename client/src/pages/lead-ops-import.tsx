import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  BarChart3,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Database,
  Loader2,
  RefreshCw,
  Shield,
  Upload,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

type LeadRecord = Record<string, unknown>;

type ImportSummary = {
  added: number;
  strongDuplicates: number;
  weakDuplicates: number;
  failed: number;
  total: number | null;
};

type ImportPreviewResponse = Record<string, unknown> & {
  previewId?: string | number;
  preview_id?: string | number;
  batchId?: string | number;
  batch_id?: string | number;
  summary?: Partial<ImportSummary>;
  counts?: Partial<ImportSummary>;
  recentBatches?: ImportBatch[];
  batches?: ImportBatch[];
  strongDuplicates?: LeadRecord[];
  strong_duplicates?: LeadRecord[];
  weakDuplicates?: LeadRecord[];
  weak_duplicates?: LeadRecord[];
  failures?: LeadRecord[];
  failedRows?: LeadRecord[];
  message?: string;
};

type ImportBatch = {
  id?: string | number;
  batchId?: string | number;
  previewId?: string | number;
  createdAt?: string;
  created_at?: string;
  status?: string;
  operator?: string;
  source?: string;
  total?: number | string;
  added?: number | string;
  strongDuplicates?: number | string;
  weakDuplicates?: number | string;
  failed?: number | string;
  note?: string;
  message?: string;
};

type ParsedDraft = {
  records: LeadRecord[] | null;
  error: string | null;
  count: number;
};

function valueAt(source: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, source);
}

function firstValue(source: unknown, paths: string[]): unknown {
  for (const path of paths) {
    const value = valueAt(source, path);
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }
  return undefined;
}

function numberFrom(value: unknown): number | null {
  if (Array.isArray(value)) return value.length;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toNumber(source: unknown, paths: string[], fallback = 0): number {
  const value = numberFrom(firstValue(source, paths));
  return value ?? fallback;
}

function safeText(value: unknown, fallback = "—"): string {
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return fallback;
}

function safeDate(value?: unknown) {
  if (typeof value !== "string" || !value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function readJsonResponse(text: string): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function errorMessage(body: unknown, fallback: string) {
  if (!body || typeof body !== "object") return fallback;
  const record = body as Record<string, unknown>;
  return (
    safeText(record.message, "") ||
    safeText(record.error, "") ||
    safeText(record.detail, "") ||
    fallback
  );
}

function normalizeSummary(data: ImportPreviewResponse | null): ImportSummary {
  const source = data?.summary ?? data?.counts ?? data ?? {};
  return {
    added: toNumber(source, [
      "added",
      "addedCount",
      "added_count",
      "inserted",
      "insertedCount",
      "new",
      "newCount",
      "created",
      "createdCount",
    ]),
    strongDuplicates: toNumber(source, [
      "strongDuplicates",
      "strong_duplicate_count",
      "strongDuplicateCount",
      "hardDuplicates",
      "hard_duplicate_count",
      "blockedDuplicates",
      "blocked_duplicate_count",
    ]),
    weakDuplicates: toNumber(source, [
      "weakDuplicates",
      "weak_duplicate_count",
      "weakDuplicateCount",
      "softDuplicates",
      "soft_duplicate_count",
      "suspiciousDuplicates",
      "suspicious_duplicate_count",
    ]),
    failed: toNumber(source, [
      "failed",
      "failedCount",
      "failed_count",
      "errorCount",
      "error_count",
      "errors",
    ]),
    total: numberFrom(firstValue(source, [
      "total",
      "totalCount",
      "total_count",
      "rows",
      "records",
      "incoming",
      "incomingCount",
    ])),
  };
}

function normalizeBatches(data: unknown): ImportBatch[] {
  const source = Array.isArray(data)
    ? data
    : (data as Record<string, unknown> | null)?.batches ??
      (data as Record<string, unknown> | null)?.items ??
      (data as Record<string, unknown> | null)?.results ??
      [];

  if (!Array.isArray(source)) return [];

  return source.map((item) => {
    const row = item as Record<string, unknown>;
    return {
      id: firstValue(row, ["id", "batchId", "batch_id", "previewId", "preview_id"]) as string | number | undefined,
      batchId: firstValue(row, ["batchId", "batch_id", "id"]) as string | number | undefined,
      previewId: firstValue(row, ["previewId", "preview_id"]) as string | number | undefined,
      createdAt: safeText(firstValue(row, ["createdAt", "created_at", "time", "importedAt"]), ""),
      status: safeText(firstValue(row, ["status", "state", "result", "outcome"]), ""),
      operator: safeText(firstValue(row, ["operator", "owner", "user", "createdBy"]), ""),
      source: safeText(firstValue(row, ["source", "platform", "origin"]), ""),
      total: firstValue(row, ["total", "totalCount", "total_count", "rows", "records"]) as number | string | undefined,
      added: firstValue(row, ["added", "addedCount", "added_count", "inserted", "newCount"]) as number | string | undefined,
      strongDuplicates: firstValue(row, [
        "strongDuplicates",
        "strong_duplicate_count",
        "strongDuplicateCount",
        "hardDuplicates",
      ]) as number | string | undefined,
      weakDuplicates: firstValue(row, [
        "weakDuplicates",
        "weak_duplicate_count",
        "weakDuplicateCount",
        "softDuplicates",
      ]) as number | string | undefined,
      failed: firstValue(row, ["failed", "failedCount", "failed_count", "errorCount"]) as number | string | undefined,
      note: safeText(firstValue(row, ["note", "message", "summary"]), ""),
      message: safeText(firstValue(row, ["message"]), ""),
    };
  });
}

function normalizeRows(data: unknown): LeadRecord[] {
  if (!Array.isArray(data)) return [];
  return data
    .filter((item) => item && typeof item === "object")
    .map((item) => item as LeadRecord);
}

function leadLabel(record: LeadRecord): string {
  const parts = [
    record.name,
    record.fullName,
    record.phone,
    record.mobile,
    record.email,
    record.source,
    record.platform,
    record.sales,
  ]
    .map((value) => safeText(value, ""))
    .filter(Boolean);

  if (parts.length > 0) return parts.join(" · ");
  const fallback = firstValue(record, ["id", "leadId", "lead_id", "externalId", "external_id"]);
  return safeText(fallback, "未命名线索");
}

function leadMeta(record: LeadRecord): string[] {
  const values = [
    firstValue(record, ["name", "fullName", "leadName"]),
    firstValue(record, ["phone", "mobile"]),
    firstValue(record, ["source", "platform"]),
    firstValue(record, ["sales", "owner", "assignedTo"]),
    firstValue(record, ["tags"]),
  ];

  return values
    .map((value) => {
      if (Array.isArray(value)) return value.filter(Boolean).join("，");
      return safeText(value, "");
    })
    .filter(Boolean);
}

function DetailList({
  title,
  icon: Icon,
  items,
  emptyText,
}: {
  title: string;
  icon: typeof BarChart3;
  items: LeadRecord[];
  emptyText: string;
}) {
  return (
    <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)" }}>
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4" style={{ color: "var(--gold)" }} />
        <span className="text-sm font-medium" style={{ color: "var(--text-strong)" }}>{title}</span>
        <Badge variant="outline" className="ml-auto border-[color:var(--border)] text-[11px] text-muted-foreground">
          {items.length}
        </Badge>
      </div>

      {items.length === 0 ? (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{emptyText}</p>
      ) : (
        <div className="space-y-2">
          {items.slice(0, 12).map((item, idx) => {
            const meta = leadMeta(item);
            return (
              <div
                key={`${title}-${idx}`}
                className="rounded-lg p-3"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--text-strong)" }}>
                    {leadLabel(item)}
                  </p>
                  <span className="text-[11px] whitespace-nowrap" style={{ color: "var(--text-muted)" }}>
                    #{idx + 1}
                  </span>
                </div>
                {meta.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {meta.slice(0, 4).map((value) => (
                      <span
                        key={value}
                        className="px-2 py-0.5 rounded-md text-[11px]"
                        style={{ background: "rgba(255,255,255,0.04)", color: "var(--text-muted)" }}
                      >
                        {value}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  accent,
  hint,
}: {
  label: string;
  value: number | string;
  icon: typeof CheckCircle2;
  accent: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)" }}>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${accent}15` }}>
          <Icon className="w-4 h-4" style={{ color: accent }} />
        </div>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</span>
      </div>
      <div className="text-2xl font-bold" style={{ color: "var(--text-strong)" }}>
        {value}
      </div>
      {hint ? (
        <div className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>
          {hint}
        </div>
      ) : null}
    </div>
  );
}

export default function LeadOpsImportPage() {
  const { toast } = useToast();
  const [rawJson, setRawJson] = useState("");
  const [preview, setPreview] = useState<ImportPreviewResponse | null>(null);
  const [previewDraft, setPreviewDraft] = useState<LeadRecord[] | null>(null);
  const [previewSource, setPreviewSource] = useState("");
  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [commitLoading, setCommitLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const draft = useMemo<ParsedDraft>(() => {
    const text = rawJson.trim();
    if (!text) {
      return { records: null, error: null, count: 0 };
    }

    try {
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) {
        return { records: null, error: "JSON 必须是数组", count: 0 };
      }
      return {
        records: parsed.filter((item) => item && typeof item === "object") as LeadRecord[],
        error: null,
        count: parsed.length,
      };
    } catch {
      return { records: null, error: "JSON 解析失败，请检查引号、逗号和数组结构", count: 0 };
    }
  }, [rawJson]);

  const previewSummary = useMemo(() => normalizeSummary(preview), [preview]);
  const strongDuplicateRows = useMemo(
    () => normalizeRows(preview?.strongDuplicates ?? preview?.strong_duplicates),
    [preview],
  );
  const weakDuplicateRows = useMemo(
    () => normalizeRows(preview?.weakDuplicates ?? preview?.weak_duplicates),
    [preview],
  );
  const failureRows = useMemo(
    () => normalizeRows(preview?.failures ?? preview?.failedRows),
    [preview],
  );
  const recentBatches = useMemo(() => {
    return batches.slice().sort((a, b) => {
      const left = new Date((a.createdAt || a.created_at || "") as string).getTime();
      const right = new Date((b.createdAt || b.created_at || "") as string).getTime();
      return Number.isFinite(right) && Number.isFinite(left) ? right - left : 0;
    });
  }, [batches]);

  const previewToken = preview?.previewId ?? preview?.preview_id ?? preview?.batchId ?? preview?.batch_id ?? null;
  const previewIsCurrent = Boolean(preview) && previewSource === rawJson;
  const commitDisabled = !preview || !previewDraft || previewDraft.length === 0 || commitLoading || !previewIsCurrent;

  const loadBatches = async () => {
    setLoadingBatches(true);
    try {
      const res = await fetch("/api/lead/import/batches", { credentials: "include" });
      const text = await res.text();
      const data = readJsonResponse(text);
      if (!res.ok) {
        throw new Error(errorMessage(data, res.statusText || "获取批次失败"));
      }
      setBatches(normalizeBatches(data));
    } catch (err) {
      toast({
        title: "批次加载失败",
        description: err instanceof Error ? err.message : "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setLoadingBatches(false);
    }
  };

  useEffect(() => {
    loadBatches();
  }, []);

  const runPreview = async () => {
    if (draft.error || !draft.records) {
      setMessage(draft.error ?? "请输入 JSON 数组");
      return;
    }

    setPreviewLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/lead/import/preview", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft.records),
      });
      const text = await res.text();
      const data = readJsonResponse(text);
      if (!res.ok) {
        throw new Error(errorMessage(data, res.statusText || "预检失败"));
      }

      const normalized = (data && typeof data === "object" ? data : {}) as ImportPreviewResponse;
      setPreview(normalized);
      setPreviewDraft(draft.records);
      setPreviewSource(rawJson);
      setMessage(normalized.message ?? null);
      toast({
        title: "预检完成",
        description: `共识别 ${draft.count} 条线索，已生成强/弱重复与失败明细。`,
      });
    } catch (err) {
      setPreview(null);
      setPreviewDraft(null);
      setPreviewSource("");
      setMessage(err instanceof Error ? err.message : "预检失败");
      toast({
        title: "预检失败",
        description: err instanceof Error ? err.message : "请检查输入后重试",
        variant: "destructive",
      });
    } finally {
      setPreviewLoading(false);
    }
  };

  const runCommit = async () => {
    if (!preview || !previewDraft || previewDraft.length === 0) return;

    setCommitLoading(true);
    setMessage(null);
    try {
      const payload = {
        previewId: previewToken ?? undefined,
        preview_id: previewToken ?? undefined,
        batchId: preview?.batchId ?? preview?.batch_id ?? undefined,
        batch_id: preview?.batchId ?? preview?.batch_id ?? undefined,
        preview,
        rows: previewDraft,
      };

      const res = await fetch("/api/lead/import/commit", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      const data = readJsonResponse(text);
      if (!res.ok) {
        throw new Error(errorMessage(data, res.statusText || "提交失败"));
      }

      toast({
        title: "导入已提交",
        description: `新增 ${previewSummary.added}，强重复 ${previewSummary.strongDuplicates}，弱重复 ${previewSummary.weakDuplicates}，失败 ${previewSummary.failed}。`,
      });
      setMessage((data as ImportPreviewResponse | null)?.message ?? "导入已提交");
      setPreview(null);
      setPreviewDraft(null);
      setPreviewSource("");
      await loadBatches();
    } catch (err) {
      toast({
        title: "提交失败",
        description: err instanceof Error ? err.message : "请稍后重试",
        variant: "destructive",
      });
      setMessage(err instanceof Error ? err.message : "提交失败");
    } finally {
      setCommitLoading(false);
    }
  };

  return (
    <div className="min-h-screen pb-12 admin-panel" style={{ background: "var(--bg-0)", fontSize: "14px" }}>
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 dp-grid opacity-100" />
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[680px] h-[420px]"
          style={{ background: "radial-gradient(ellipse, rgba(var(--gold-rgb), 0.06) 0%, transparent 70%)" }}
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-5 pt-6">
        <div className="flex items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <a
              href="/admin"
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.04)" }}
            >
              <ArrowLeft className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
            </a>
            <div>
              <h1 className="text-lg font-bold" style={{ color: "var(--text-strong)" }}>
                线索导入台
              </h1>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                粘贴 JSON 数组，先预检再正式导入，结果和最近批次都会保留在页面上。
              </p>
            </div>
          </div>

          <motion.button
            onClick={loadBatches}
            disabled={loadingBatches}
            whileTap={{ scale: 0.96 }}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium"
            style={{ background: "rgba(var(--primary-rgb), 0.1)", color: "var(--primary)", border: "1px solid rgba(var(--primary-rgb), 0.2)" }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingBatches ? "animate-spin" : ""}`} />
            刷新批次
          </motion.button>
        </div>

        <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-4 mb-5">
          <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-2 mb-3">
              <Database className="w-4 h-4" style={{ color: "var(--gold)" }} />
              <span className="text-sm font-medium" style={{ color: "var(--text-strong)" }}>导入数据</span>
              <Badge variant="outline" className="ml-auto border-[color:var(--border)] text-[11px] text-muted-foreground">
                JSON Array
              </Badge>
            </div>

            <Textarea
              value={rawJson}
              onChange={(e) => setRawJson(e.target.value)}
              placeholder={`[
  {
    "name": "张三",
    "phone": "13800000000",
    "source": "小红书",
    "sales": "Alice"
  }
]`}
              className="min-h-[250px] text-sm resize-none bg-transparent"
              style={{ color: "var(--text-strong)" }}
            />

            <div className="flex flex-wrap items-center gap-3 mt-3">
              <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
                <Copy className="w-3.5 h-3.5" />
                当前识别 {draft.count} 条
              </div>
              <div className="flex items-center gap-1.5 text-xs" style={{ color: draft.error ? "#EF4444" : "var(--text-muted)" }}>
                {draft.error ? <AlertTriangle className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                {draft.error ?? "JSON 结构已就绪"}
              </div>
              {preview && !previewIsCurrent ? (
                <div className="flex items-center gap-1.5 text-xs" style={{ color: "#F59E0B" }}>
                  <Clock className="w-3.5 h-3.5" />
                  预检结果已过期，请重新预检
                </div>
              ) : null}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)" }}>
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-4 h-4" style={{ color: "var(--gold)" }} />
                <span className="text-sm font-medium" style={{ color: "var(--text-strong)" }}>导入流程</span>
              </div>
              <div className="space-y-2 text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[11px]" style={{ background: "rgba(var(--gold-rgb), 0.16)", color: "var(--gold)" }}>1</span>
                  粘贴 JSON 数组，系统只接受数组结构，不接受单条对象。
                </div>
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[11px]" style={{ background: "rgba(var(--gold-rgb), 0.16)", color: "var(--gold)" }}>2</span>
                  先做预检，确认新增、强重复、弱重复和失败明细。
                </div>
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[11px]" style={{ background: "rgba(var(--gold-rgb), 0.16)", color: "var(--gold)" }}>3</span>
                  通过后再提交正式导入，页面会自动刷新最近批次。
                </div>
              </div>

              <Separator className="my-3 bg-border" />

              <div className="flex gap-2">
                <motion.button
                  onClick={runPreview}
                  disabled={previewLoading || draft.error !== null || !draft.records}
                  whileTap={{ scale: 0.97 }}
                  className="flex-1 h-10 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
                  style={{
                    background: previewLoading || draft.error || !draft.records ? "rgba(var(--primary-rgb), 0.18)" : "var(--primary)",
                    color: previewLoading || draft.error || !draft.records ? "rgba(var(--primary-rgb), 0.5)" : "#fff",
                  }}
                >
                  {previewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BarChart3 className="w-4 h-4" />}
                  预检
                </motion.button>

                <motion.button
                  onClick={runCommit}
                  disabled={commitDisabled}
                  whileTap={{ scale: 0.97 }}
                  className="flex-1 h-10 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
                  style={{
                    background: commitDisabled ? "rgba(255,255,255,0.04)" : "rgba(var(--gold-rgb), 0.16)",
                    color: commitDisabled ? "var(--text-muted)" : "var(--gold)",
                    border: `1px solid ${commitDisabled ? "var(--border)" : "rgba(var(--gold-rgb), 0.26)"}`,
                  }}
                >
                  {commitLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  正式导入
                </motion.button>
              </div>
            </div>

            <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)" }}>
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="w-4 h-4" style={{ color: "var(--gold)" }} />
                <span className="text-sm font-medium" style={{ color: "var(--text-strong)" }}>预检结果</span>
              </div>

              {preview ? (
                <div className="grid grid-cols-2 gap-3">
                  <SummaryCard label="新增数" value={previewSummary.added} icon={CheckCircle2} accent="#07C160" />
                  <SummaryCard label="强重复拦截" value={previewSummary.strongDuplicates} icon={Shield} accent="#EF4444" />
                  <SummaryCard label="弱重复" value={previewSummary.weakDuplicates} icon={Copy} accent="#F59E0B" />
                  <SummaryCard label="失败数" value={previewSummary.failed} icon={Ban} accent="#8B5CF6" />
                </div>
              ) : (
                <div className="rounded-lg p-4 text-xs" style={{ background: "rgba(255,255,255,0.03)", color: "var(--text-muted)" }}>
                  还没有预检结果。预检完成后，这里会显示统计卡片和重复/失败明细。
                </div>
              )}

              {message ? (
                <div className="mt-3 rounded-lg px-3 py-2 text-xs" style={{ background: "rgba(var(--gold-rgb), 0.08)", color: "var(--text-strong)" }}>
                  {message}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-4 mb-5">
          <DetailList title="强重复明细" icon={Shield} items={strongDuplicateRows} emptyText="暂无强重复记录。预检后将展示被直接拦截的线索。" />
          <DetailList title="弱重复明细" icon={Copy} items={weakDuplicateRows} emptyText="暂无弱重复记录。预检后将展示需要人工确认的线索。" />
          <DetailList title="失败明细" icon={AlertTriangle} items={failureRows} emptyText="暂无失败记录。预检或提交过程中出现异常时会显示在这里。" />
        </div>

        <div className="rounded-xl p-4 mb-5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4" style={{ color: "var(--gold)" }} />
            <span className="text-sm font-medium" style={{ color: "var(--text-strong)" }}>最近导入批次</span>
            <Badge variant="outline" className="ml-auto border-[color:var(--border)] text-[11px] text-muted-foreground">
              {recentBatches.length}
            </Badge>
          </div>

          {loadingBatches && recentBatches.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-xs" style={{ color: "var(--text-muted)" }}>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              正在加载批次...
            </div>
          ) : recentBatches.length === 0 ? (
            <div className="rounded-lg p-4 text-xs" style={{ background: "rgba(255,255,255,0.03)", color: "var(--text-muted)" }}>
              暂无导入批次。完成一次预检并提交后，这里会展示最近的导入结果。
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-xs" style={{ color: "var(--text-muted)" }}>
                    <th className="pb-3 font-medium">批次</th>
                    <th className="pb-3 font-medium">时间</th>
                    <th className="pb-3 font-medium">新增</th>
                    <th className="pb-3 font-medium">强拦截</th>
                    <th className="pb-3 font-medium">弱重复</th>
                    <th className="pb-3 font-medium">失败</th>
                    <th className="pb-3 font-medium">状态</th>
                  </tr>
                </thead>
                <tbody>
                  {recentBatches.slice(0, 8).map((batch, idx) => (
                    <tr key={`${safeText(batch.id, safeText(batch.batchId, String(idx)))}`} className="border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                      <td className="py-3 pr-3">
                        <div className="font-medium" style={{ color: "var(--text-strong)" }}>
                          {safeText(batch.id ?? batch.batchId ?? batch.previewId, "—")}
                        </div>
                        <div className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>
                          {safeText(batch.operator, "") || safeText(batch.source, "") || safeText(batch.note, "")}
                        </div>
                      </td>
                      <td className="py-3 pr-3 text-xs" style={{ color: "var(--text-muted)" }}>
                        {safeDate(batch.createdAt ?? batch.created_at)}
                      </td>
                      <td className="py-3 pr-3 text-xs" style={{ color: "var(--text-strong)" }}>
                        {safeText(batch.added, "0")}
                      </td>
                      <td className="py-3 pr-3 text-xs" style={{ color: "var(--text-strong)" }}>
                        {safeText(batch.strongDuplicates, "0")}
                      </td>
                      <td className="py-3 pr-3 text-xs" style={{ color: "var(--text-strong)" }}>
                        {safeText(batch.weakDuplicates, "0")}
                      </td>
                      <td className="py-3 pr-3 text-xs" style={{ color: "var(--text-strong)" }}>
                        {safeText(batch.failed, "0")}
                      </td>
                      <td className="py-3">
                        <span
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px]"
                          style={{
                            background: batch.status === "success" ? "rgba(7,193,96,0.12)" : "rgba(255,255,255,0.04)",
                            color: batch.status === "success" ? "#07C160" : "var(--text-muted)",
                          }}
                        >
                          {batch.status || "unknown"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
