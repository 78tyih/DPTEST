import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Ban,
  Check,
  Clock,
  Database,
  GitMerge,
  Loader2,
  RefreshCw,
  Save,
  Search,
  Settings2,
  Shield,
  Target,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

type BreakdownItem = {
  name?: string;
  label?: string;
  value?: number | string;
  count?: number | string;
  total?: number | string;
  amount?: number | string;
  source?: string;
  platform?: string;
  sales?: string;
  meta?: string;
};

type DuplicateLead = Record<string, unknown> & {
  id?: string | number;
  duplicateId?: string | number;
  leadId?: string | number;
  lead_id?: string | number;
  name?: string;
  fullName?: string;
  leadName?: string;
  phone?: string;
  mobile?: string;
  source?: string;
  platform?: string;
  sales?: string;
  owner?: string;
  score?: number | string;
  similarity?: number | string;
  confidence?: number | string;
  reason?: string;
  matchReason?: string;
  status?: string;
  reviewStatus?: string;
  matchedFields?: string[];
  matched_fields?: string[];
  targetLeadId?: string | number;
  primaryLeadId?: string | number;
  masterLeadId?: string | number;
  note?: string;
  summary?: string;
  createdAt?: string;
  created_at?: string;
};

type RuleDraft = {
  mode: string;
  defaultOwner: string;
  sourcePriority: string;
  dailyCap: string;
  duplicateThreshold: string;
  fallbackSales: string;
  routingNotes: string;
};

type PageState = {
  stats: unknown;
  overview: unknown;
  duplicates: DuplicateLead[];
  rules: unknown;
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

function normalizeBreakdown(data: unknown): BreakdownItem[] {
  const source = Array.isArray(data)
    ? data
    : (data as Record<string, unknown> | null)?.items ??
      (data as Record<string, unknown> | null)?.results ??
      (data as Record<string, unknown> | null)?.data ??
      [];

  if (!Array.isArray(source)) return [];

  return source.map((item) => {
    const row = item as Record<string, unknown>;
    const label = firstValue(row, ["name", "label", "title", "source", "platform", "sales", "owner"]);
    const value = firstValue(row, ["value", "count", "total", "amount", "size"]);
    return {
      name: safeText(label, ""),
      label: safeText(label, ""),
      value: value as number | string | undefined,
      count: value as number | string | undefined,
      total: value as number | string | undefined,
      amount: value as number | string | undefined,
      source: safeText(firstValue(row, ["source", "platform"]), ""),
      platform: safeText(firstValue(row, ["platform", "source"]), ""),
      sales: safeText(firstValue(row, ["sales", "owner"]), ""),
      meta: safeText(firstValue(row, ["meta", "note", "summary"]), ""),
    };
  });
}

function normalizeDuplicates(data: unknown): DuplicateLead[] {
  const source = Array.isArray(data)
    ? data
    : (data as Record<string, unknown> | null)?.items ??
      (data as Record<string, unknown> | null)?.results ??
      (data as Record<string, unknown> | null)?.duplicates ??
      (data as Record<string, unknown> | null)?.rows ??
      [];

  if (!Array.isArray(source)) return [];

  return source
    .filter((item) => item && typeof item === "object")
    .map((item) => item as DuplicateLead);
}

function duplicateLabel(item: DuplicateLead): string {
  const parts = [
    item.name,
    item.fullName,
    item.leadName,
    item.phone,
    item.mobile,
    item.source,
    item.platform,
  ]
    .map((value) => safeText(value, ""))
    .filter(Boolean);
  if (parts.length > 0) return parts.join(" · ");
  return safeText(firstValue(item, ["id", "duplicateId", "leadId", "lead_id"]), "未命名线索");
}

function duplicateMeta(item: DuplicateLead): string[] {
  const rawFields = firstValue(item, ["matchedFields", "matched_fields"]);
  const fields = Array.isArray(rawFields) ? rawFields : [];
  return [
    safeText(firstValue(item, ["sales", "owner"]), ""),
    safeText(firstValue(item, ["source", "platform"]), ""),
    safeText(firstValue(item, ["reason", "matchReason", "summary", "note"]), ""),
    fields.length > 0 ? fields.filter(Boolean).join("，") : "",
  ].filter(Boolean);
}

function makeRuleDraft(data: unknown): RuleDraft {
  const source = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
  return {
    mode: safeText(firstValue(source, ["mode", "allocationMode", "strategy"]), "round_robin"),
    defaultOwner: safeText(firstValue(source, ["defaultOwner", "default_owner", "owner"]), ""),
    sourcePriority: safeText(firstValue(source, ["sourcePriority", "source_priority", "priority"]), ""),
    dailyCap: safeText(firstValue(source, ["dailyCap", "daily_cap", "cap"]), ""),
    duplicateThreshold: safeText(firstValue(source, ["duplicateThreshold", "duplicate_threshold", "threshold"]), ""),
    fallbackSales: safeText(firstValue(source, ["fallbackSales", "fallback_sales", "fallbackOwner"]), ""),
    routingNotes: safeText(firstValue(source, ["routingNotes", "routing_notes", "notes"]), ""),
  };
}

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
  hint,
}: {
  label: string;
  value: number | string;
  icon: typeof BarChart3;
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
      {hint ? <div className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>{hint}</div> : null}
    </div>
  );
}

function BreakdownPanel({
  title,
  icon: Icon,
  items,
  emptyText,
}: {
  title: string;
  icon: typeof Users;
  items: BreakdownItem[];
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
          {items.slice(0, 10).map((item, idx) => {
            const label = item.name || item.label || "未命名";
            const count = numberFrom(item.value ?? item.count ?? item.total ?? item.amount) ?? 0;
            return (
              <div key={`${title}-${idx}`} className="rounded-lg p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="flex items-center justify-between gap-3 mb-1">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--text-strong)" }}>{label}</p>
                  <span className="text-xs whitespace-nowrap" style={{ color: "var(--text-muted)" }}>{count}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {item.sales ? <span className="px-2 py-0.5 rounded-md text-[11px]" style={{ background: "rgba(var(--gold-rgb), 0.08)", color: "var(--gold)" }}>{item.sales}</span> : null}
                  {item.source ? <span className="px-2 py-0.5 rounded-md text-[11px]" style={{ background: "rgba(255,255,255,0.04)", color: "var(--text-muted)" }}>{item.source}</span> : null}
                  {item.meta ? <span className="px-2 py-0.5 rounded-md text-[11px]" style={{ background: "rgba(255,255,255,0.04)", color: "var(--text-muted)" }}>{item.meta}</span> : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DuplicateCard({
  item,
  onReview,
  reviewing,
}: {
  item: DuplicateLead;
  onReview: (item: DuplicateLead, action: "keep" | "merge" | "void") => void;
  reviewing: string | null;
}) {
  const meta = duplicateMeta(item);
  const score = numberFrom(firstValue(item, ["score", "similarity", "confidence"])) ?? 0;
  const status = safeText(firstValue(item, ["status", "reviewStatus"]), "pending");
  const targetId = firstValue(item, ["targetLeadId", "primaryLeadId", "masterLeadId"]);

  return (
    <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)" }}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: "var(--text-strong)" }}>
            {duplicateLabel(item)}
          </p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            <Badge variant="outline" className="border-[color:var(--border)] text-[11px] text-muted-foreground">
              {status}
            </Badge>
            <Badge variant="outline" className="border-[color:var(--border)] text-[11px] text-muted-foreground">
              匹配度 {score}
            </Badge>
            {targetId ? (
              <Badge variant="outline" className="border-[color:var(--border)] text-[11px] text-muted-foreground">
                主记录 {safeText(targetId, "—")}
              </Badge>
            ) : null}
          </div>
        </div>
        <div className="text-right text-[11px]" style={{ color: "var(--text-muted)" }}>
          {safeDate(firstValue(item, ["createdAt", "created_at"]))}
        </div>
      </div>

      {meta.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {meta.slice(0, 4).map((value) => (
            <span key={value} className="px-2 py-0.5 rounded-md text-[11px]" style={{ background: "rgba(255,255,255,0.04)", color: "var(--text-muted)" }}>
              {value}
            </span>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <motion.button
          onClick={() => onReview(item, "keep")}
          disabled={reviewing === String(firstValue(item, ["id", "duplicateId", "leadId", "lead_id"]))}
          whileTap={{ scale: 0.97 }}
          className="h-9 px-3 rounded-xl text-xs font-medium flex items-center gap-1.5"
          style={{ background: "rgba(7,193,96,0.12)", color: "#07C160", border: "1px solid rgba(7,193,96,0.2)" }}
        >
          {reviewing === String(firstValue(item, ["id", "duplicateId", "leadId", "lead_id"])) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          保留
        </motion.button>

        <motion.button
          onClick={() => onReview(item, "merge")}
          disabled={reviewing === String(firstValue(item, ["id", "duplicateId", "leadId", "lead_id"]))}
          whileTap={{ scale: 0.97 }}
          className="h-9 px-3 rounded-xl text-xs font-medium flex items-center gap-1.5"
          style={{ background: "rgba(var(--primary-rgb), 0.1)", color: "var(--primary)", border: "1px solid rgba(var(--primary-rgb), 0.2)" }}
        >
          {reviewing === String(firstValue(item, ["id", "duplicateId", "leadId", "lead_id"])) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <GitMerge className="w-3.5 h-3.5" />}
          合并
        </motion.button>

        <motion.button
          onClick={() => onReview(item, "void")}
          disabled={reviewing === String(firstValue(item, ["id", "duplicateId", "leadId", "lead_id"]))}
          whileTap={{ scale: 0.97 }}
          className="h-9 px-3 rounded-xl text-xs font-medium flex items-center gap-1.5"
          style={{ background: "rgba(239,68,68,0.12)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.2)" }}
        >
          {reviewing === String(firstValue(item, ["id", "duplicateId", "leadId", "lead_id"])) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
          作废
        </motion.button>
      </div>
    </div>
  );
}

export default function LeadAdminPage() {
  const { toast } = useToast();
  const [state, setState] = useState<PageState>({
    stats: null,
    overview: null,
    duplicates: [],
    rules: null,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [rulesSaving, setRulesSaving] = useState(false);
  const [ruleForm, setRuleForm] = useState<RuleDraft>({
    mode: "round_robin",
    defaultOwner: "",
    sourcePriority: "",
    dailyCap: "",
    duplicateThreshold: "",
    fallbackSales: "",
    routingNotes: "",
  });

  const loadPage = async (silent = false) => {
    if (!silent) setLoading(true);
    setRefreshing(true);

    try {
      const [statsRes, overviewRes, duplicatesRes, rulesRes] = await Promise.all([
        fetch("/api/lead/admin/stats", { credentials: "include" }),
        fetch("/api/lead/admin/overview", { credentials: "include" }),
        fetch("/api/lead/admin/duplicates", { credentials: "include" }),
        fetch("/api/lead/admin/rules", { credentials: "include" }),
      ]);

      const [statsText, overviewText, duplicatesText, rulesText] = await Promise.all([
        statsRes.text(),
        overviewRes.text(),
        duplicatesRes.text(),
        rulesRes.text(),
      ]);

      const statsData = readJsonResponse(statsText);
      const overviewData = readJsonResponse(overviewText);
      const duplicatesData = readJsonResponse(duplicatesText);
      const rulesData = readJsonResponse(rulesText);

      if (!statsRes.ok) throw new Error(errorMessage(statsData, statsRes.statusText || "统计加载失败"));
      if (!overviewRes.ok) throw new Error(errorMessage(overviewData, overviewRes.statusText || "概览加载失败"));
      if (!duplicatesRes.ok) throw new Error(errorMessage(duplicatesData, duplicatesRes.statusText || "重复审核加载失败"));
      if (!rulesRes.ok) throw new Error(errorMessage(rulesData, rulesRes.statusText || "规则加载失败"));

      setState({
        stats: statsData,
        overview: overviewData,
        duplicates: normalizeDuplicates(duplicatesData),
        rules: rulesData,
      });
      setRuleForm((prev) => {
        const next = makeRuleDraft(rulesData);
        return {
          mode: next.mode || prev.mode,
          defaultOwner: next.defaultOwner || prev.defaultOwner,
          sourcePriority: next.sourcePriority || prev.sourcePriority,
          dailyCap: next.dailyCap || prev.dailyCap,
          duplicateThreshold: next.duplicateThreshold || prev.duplicateThreshold,
          fallbackSales: next.fallbackSales || prev.fallbackSales,
          routingNotes: next.routingNotes || prev.routingNotes,
        };
      });
    } catch (err) {
      toast({
        title: "页面加载失败",
        description: err instanceof Error ? err.message : "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPage();
  }, []);

  const statsSource = state.stats && typeof state.stats === "object" ? state.stats as Record<string, unknown> : {};
  const overviewSource = state.overview && typeof state.overview === "object" ? state.overview as Record<string, unknown> : {};

  const totalLeads = toNumber(statsSource, [
    "total",
    "totalLeads",
    "total_leads",
    "leadTotal",
    "lead_total",
    "overview.total",
  ], 0) || toNumber(overviewSource, [
    "total",
    "totalLeads",
    "total_leads",
    "leadTotal",
    "lead_total",
  ], 0);

  const todayLeads = toNumber(statsSource, ["today", "todayLeads", "today_leads", "newToday", "new_today"], 0) || toNumber(overviewSource, ["today", "todayLeads", "today_leads", "newToday", "new_today"], 0);
  const strongDuplicates = toNumber(statsSource, ["strongDuplicates", "strong_duplicate_count", "strongDuplicateCount"], 0) || toNumber(overviewSource, ["strongDuplicates", "strong_duplicate_count", "strongDuplicateCount"], 0);
  const weakDuplicates = toNumber(statsSource, ["weakDuplicates", "weak_duplicate_count", "weakDuplicateCount"], 0) || toNumber(overviewSource, ["weakDuplicates", "weak_duplicate_count", "weakDuplicateCount"], 0);
  const pendingReviews = state.duplicates.length;

  const salesBreakdown = useMemo(
    () => normalizeBreakdown(firstValue(overviewSource, ["sales", "salesOverview", "sales_overview", "salesBreakdown", "sales_breakdown"]) ?? []),
    [overviewSource],
  );
  const platformBreakdown = useMemo(
    () => normalizeBreakdown(firstValue(overviewSource, ["platforms", "platformOverview", "platform_overview", "platformBreakdown", "platform_breakdown"]) ?? []),
    [overviewSource],
  );

  const overviewCards = [
    { label: "总线索", value: totalLeads, icon: Database, accent: "#07C160", hint: "来自统计/概览接口" },
    { label: "今日新增", value: todayLeads, icon: Clock, accent: "#F59E0B", hint: "按今日口径聚合" },
    { label: "强重复", value: strongDuplicates, icon: Shield, accent: "#EF4444", hint: "直接拦截的重复记录" },
    { label: "待审核", value: pendingReviews, icon: AlertTriangle, accent: "#8B5CF6", hint: "疑似重复审核队列" },
  ];

  const handleReview = async (item: DuplicateLead, action: "keep" | "merge" | "void") => {
    const id = firstValue(item, ["id", "duplicateId", "leadId", "lead_id"]);
    if (id === undefined || id === null || id === "") {
      toast({
        title: "无法处理",
        description: "当前条目没有可用的重复记录 ID",
        variant: "destructive",
      });
      return;
    }

    setReviewingId(String(id));
    try {
      const targetLeadId = firstValue(item, ["targetLeadId", "primaryLeadId", "masterLeadId"]);
      const payload: Record<string, unknown> = { action };
      if (action === "merge" && targetLeadId !== undefined && targetLeadId !== null && targetLeadId !== "") {
        payload.targetLeadId = targetLeadId;
        payload.target_lead_id = targetLeadId;
      }

      const res = await fetch(`/api/lead/admin/duplicates/${id}/review`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      const data = readJsonResponse(text);
      if (!res.ok) {
        throw new Error(errorMessage(data, res.statusText || "审核失败"));
      }

      toast({
        title: "审核已提交",
        description: action === "keep" ? "已保留这条记录" : action === "merge" ? "已提交合并处理" : "已提交作废处理",
      });

      setState((prev) => ({
        ...prev,
        duplicates: prev.duplicates.filter((row) => String(firstValue(row, ["id", "duplicateId", "leadId", "lead_id"])) !== String(id)),
      }));
      await loadPage(true);
    } catch (err) {
      toast({
        title: "审核失败",
        description: err instanceof Error ? err.message : "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setReviewingId(null);
    }
  };

  const saveRules = async () => {
    setRulesSaving(true);
    try {
      const payload = {
        ...ruleForm,
        rules: ruleForm,
      };
      const res = await fetch("/api/lead/admin/rules", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      const data = readJsonResponse(text);
      if (!res.ok) {
        throw new Error(errorMessage(data, res.statusText || "保存规则失败"));
      }

      toast({
        title: "规则已保存",
        description: "分配规则已经提交到后台。",
      });
      await loadPage(true);
    } catch (err) {
      toast({
        title: "保存失败",
        description: err instanceof Error ? err.message : "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setRulesSaving(false);
    }
  };

  const rulesList = useMemo(() => {
    const rules = state.rules && typeof state.rules === "object" ? state.rules as Record<string, unknown> : {};
    const candidate = firstValue(rules, ["items", "rules", "list", "entries"]);
    return normalizeBreakdown(candidate ?? []);
  }, [state.rules]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-0)" }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--gold)" }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-12 admin-panel" style={{ background: "var(--bg-0)", fontSize: "14px" }}>
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 dp-grid opacity-100" />
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[720px] h-[440px]"
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
                线索分配后台
              </h1>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                处理疑似重复记录，查看销售 / 来源平台概览，并维护基础分配规则。
              </p>
            </div>
          </div>

          <motion.button
            onClick={() => loadPage(true)}
            disabled={refreshing}
            whileTap={{ scale: 0.96 }}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium"
            style={{ background: "rgba(var(--primary-rgb), 0.1)", color: "var(--primary)", border: "1px solid rgba(var(--primary-rgb), 0.2)" }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            刷新
          </motion.button>
        </div>

        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
          {overviewCards.map((card) => (
            <StatCard key={card.label} label={card.label} value={card.value} icon={card.icon} accent={card.accent} hint={card.hint} />
          ))}
        </div>

        <div className="grid xl:grid-cols-[1.1fr_0.9fr] gap-4 mb-5">
          <BreakdownPanel
            title="按销售概览"
            icon={Users}
            items={salesBreakdown}
            emptyText="暂无按销售的汇总数据。接口返回后，这里会展示各销售的线索分布。"
          />
          <BreakdownPanel
            title="按来源平台概览"
            icon={Target}
            items={platformBreakdown}
            emptyText="暂无按来源平台的汇总数据。接口返回后，这里会展示各平台的线索分布。"
          />
        </div>

        <div className="rounded-xl p-4 mb-5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4" style={{ color: "var(--gold)" }} />
            <span className="text-sm font-medium" style={{ color: "var(--text-strong)" }}>疑似重复审核</span>
            <Badge variant="outline" className="ml-auto border-[color:var(--border)] text-[11px] text-muted-foreground">
              {state.duplicates.length}
            </Badge>
          </div>

          {state.duplicates.length === 0 ? (
            <div className="rounded-lg p-4 text-xs" style={{ background: "rgba(255,255,255,0.03)", color: "var(--text-muted)" }}>
              暂无待审核重复记录。后续如有疑似重复，这里会出现“保留 / 合并 / 作废”的卡片。
            </div>
          ) : (
            <div className="grid lg:grid-cols-2 gap-3">
              {state.duplicates.slice(0, 8).map((item) => (
                <DuplicateCard
                  key={String(firstValue(item, ["id", "duplicateId", "leadId", "lead_id"]))}
                  item={item}
                  onReview={handleReview}
                  reviewing={reviewingId}
                />
              ))}
            </div>
          )}
        </div>

        <div className="grid xl:grid-cols-[0.95fr_1.05fr] gap-4">
          <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-2 mb-3">
              <Settings2 className="w-4 h-4" style={{ color: "var(--gold)" }} />
              <span className="text-sm font-medium" style={{ color: "var(--text-strong)" }}>分配规则</span>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs" style={{ color: "var(--text-muted)" }}>分配模式</label>
                <Input
                  value={ruleForm.mode}
                  onChange={(e) => setRuleForm((prev) => ({ ...prev, mode: e.target.value }))}
                  placeholder="round_robin / weighted / manual / source_preference"
                  className="bg-transparent"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs" style={{ color: "var(--text-muted)" }}>默认负责人</label>
                  <Input
                    value={ruleForm.defaultOwner}
                    onChange={(e) => setRuleForm((prev) => ({ ...prev, defaultOwner: e.target.value }))}
                    placeholder="默认销售 / 组别"
                    className="bg-transparent"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs" style={{ color: "var(--text-muted)" }}>每日上限</label>
                  <Input
                    value={ruleForm.dailyCap}
                    onChange={(e) => setRuleForm((prev) => ({ ...prev, dailyCap: e.target.value }))}
                    placeholder="例如：20"
                    className="bg-transparent"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs" style={{ color: "var(--text-muted)" }}>来源优先级</label>
                  <Input
                    value={ruleForm.sourcePriority}
                    onChange={(e) => setRuleForm((prev) => ({ ...prev, sourcePriority: e.target.value }))}
                    placeholder="例如：小红书 > 抖音 > 表单"
                    className="bg-transparent"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs" style={{ color: "var(--text-muted)" }}>重复阈值</label>
                  <Input
                    value={ruleForm.duplicateThreshold}
                    onChange={(e) => setRuleForm((prev) => ({ ...prev, duplicateThreshold: e.target.value }))}
                    placeholder="例如：0.85 / 85"
                    className="bg-transparent"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs" style={{ color: "var(--text-muted)" }}>兜底销售</label>
                <Input
                  value={ruleForm.fallbackSales}
                  onChange={(e) => setRuleForm((prev) => ({ ...prev, fallbackSales: e.target.value }))}
                  placeholder="当规则未命中时分配给谁"
                  className="bg-transparent"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs" style={{ color: "var(--text-muted)" }}>路由备注</label>
                <Textarea
                  value={ruleForm.routingNotes}
                  onChange={(e) => setRuleForm((prev) => ({ ...prev, routingNotes: e.target.value }))}
                  placeholder="写下当前分配规则的备注、例外和待确认事项"
                  className="bg-transparent min-h-[92px] resize-none"
                />
              </div>

              <motion.button
                onClick={saveRules}
                disabled={rulesSaving}
                whileTap={{ scale: 0.97 }}
                className="w-full h-10 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
                style={{
                  background: "rgba(var(--gold-rgb), 0.16)",
                  color: "var(--gold)",
                  border: "1px solid rgba(var(--gold-rgb), 0.24)",
                }}
              >
                {rulesSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                保存规则
              </motion.button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)" }}>
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="w-4 h-4" style={{ color: "var(--gold)" }} />
                <span className="text-sm font-medium" style={{ color: "var(--text-strong)" }}>当前规则概览</span>
              </div>

              {rulesList.length === 0 ? (
                <div className="rounded-lg p-4 text-xs" style={{ background: "rgba(255,255,255,0.03)", color: "var(--text-muted)" }}>
                  规则接口目前没有返回结构化列表，下面的表单会作为默认结构使用。
                </div>
              ) : (
                <div className="space-y-2">
                  {rulesList.map((item, idx) => (
                    <div key={`${item.label ?? item.name ?? idx}`} className="rounded-lg p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <div className="flex items-center justify-between gap-3 mb-1">
                        <p className="text-sm font-medium truncate" style={{ color: "var(--text-strong)" }}>
                          {item.name || item.label || "规则"}
                        </p>
                        <span className="text-xs whitespace-nowrap" style={{ color: "var(--text-muted)" }}>
                          {numberFrom(item.value ?? item.count ?? item.total ?? item.amount) ?? 0}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {item.sales ? <span className="px-2 py-0.5 rounded-md text-[11px]" style={{ background: "rgba(var(--gold-rgb), 0.08)", color: "var(--gold)" }}>{item.sales}</span> : null}
                        {item.source ? <span className="px-2 py-0.5 rounded-md text-[11px]" style={{ background: "rgba(255,255,255,0.04)", color: "var(--text-muted)" }}>{item.source}</span> : null}
                        {item.meta ? <span className="px-2 py-0.5 rounded-md text-[11px]" style={{ background: "rgba(255,255,255,0.04)", color: "var(--text-muted)" }}>{item.meta}</span> : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)" }}>
              <div className="flex items-center gap-2 mb-3">
                <Search className="w-4 h-4" style={{ color: "var(--gold)" }} />
                <span className="text-sm font-medium" style={{ color: "var(--text-strong)" }}>接口状态</span>
              </div>
              <div className="space-y-2 text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[11px]" style={{ background: "rgba(var(--gold-rgb), 0.16)", color: "var(--gold)" }}>1</span>
                  统计、概览、重复审核和规则都按独立接口加载，方便后端逐步稳定。
                </div>
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[11px]" style={{ background: "rgba(var(--gold-rgb), 0.16)", color: "var(--gold)" }}>2</span>
                  审核动作会直接刷新重复队列和统计概览，不需要手动重载页面。
                </div>
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[11px]" style={{ background: "rgba(var(--gold-rgb), 0.16)", color: "var(--gold)" }}>3</span>
                  规则表单保持简单，后端字段稳定后可以继续细化成更完整的配置中心。
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
