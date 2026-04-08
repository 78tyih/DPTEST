import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Clock3, RefreshCw, TrendingDown, TrendingUp } from "lucide-react";

import LeadQueueHeader from "@/components/lead/LeadQueueHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Skeleton } from "@/components/ui/skeleton";
import {
  formatLeadDateTime,
  formatLeadTimestamp,
  getLeadStatsMe,
  type Lead,
  type LeadStatsResponse,
} from "@/lib/lead";

function formatPercent(value?: number) {
  if (value === undefined || value === null || Number.isNaN(value)) return "—";
  if (value > 1) return `${value.toFixed(0)}%`;
  return `${(value * 100).toFixed(0)}%`;
}

function formatMinutes(value?: number) {
  if (value === undefined || value === null || Number.isNaN(value)) return "—";
  return `${value.toFixed(1)} 分钟`;
}

function MetricCard({
  label,
  value,
  hint,
  accent = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: "default" | "positive" | "negative";
}) {
  return (
    <Card className="overflow-hidden border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-slate-500">{label}</p>
        {hint ? <span className="text-[11px] text-slate-500">{hint}</span> : null}
      </div>
      <div className="mt-3 flex items-end gap-2">
        <p
          className={
            accent === "positive"
              ? "text-2xl font-semibold tracking-tight text-emerald-300"
              : accent === "negative"
                ? "text-2xl font-semibold tracking-tight text-rose-300"
                : "text-2xl font-semibold tracking-tight text-white"
          }
        >
          {value}
        </p>
      </div>
    </Card>
  );
}

function BarSection({
  title,
  items,
  fallback,
  accentClass,
}: {
  title: string;
  items: Array<{ label?: string; sourcePlatform?: string; reason?: string; count: number }>;
  fallback: string;
  accentClass: string;
}) {
  const normalizedItems = items.map((item) => ({
    label: item.label ?? item.sourcePlatform ?? item.reason ?? "未命名",
    count: item.count,
  }));
  const max = Math.max(...normalizedItems.map((item) => item.count), 1);

  return (
    <Card className="border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">{title}</p>
          <p className="mt-1 text-xs text-slate-400">{fallback}</p>
        </div>
        <BarChart3 className="h-4 w-4 text-slate-400" />
      </div>

      <div className="mt-4 space-y-3">
        {normalizedItems.length === 0 ? (
          <p className="text-sm text-slate-500">{fallback}</p>
        ) : (
          normalizedItems.map((item) => (
            <div key={item.label} className="space-y-1.5">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate text-slate-300">{item.label}</span>
                <span className="text-white">{item.count}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className={`h-full rounded-full ${accentClass}`}
                  style={{ width: `${Math.max((item.count / max) * 100, 8)}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

function RecentLeadCard({ lead, tone }: { lead: Lead; tone: "valid" | "invalid" }) {
  return (
    <Card className="overflow-hidden border-white/10 bg-white/[0.04]">
      <div className="grid gap-3 sm:grid-cols-[0.72fr_1fr]">
        <AspectRatio ratio={1}>
          <div className="h-full overflow-hidden border-r border-white/10 bg-white/[0.03]">
            {lead.screenshotUrl ? (
              <img src={lead.screenshotUrl} alt="线索截图" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">
                暂无截图
              </div>
            )}
          </div>
        </AspectRatio>

        <div className="p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="truncate text-sm font-medium text-white">{lead.sourcePlatform}</p>
            <Badge className={tone === "valid" ? "border-emerald-400/20 bg-emerald-500/12 text-emerald-200" : "border-rose-400/20 bg-rose-500/12 text-rose-200"}>
              {tone === "valid" ? "已有效" : "已无效"}
            </Badge>
          </div>
          <p className="mt-2 text-xs text-slate-500">{formatLeadTimestamp(lead.createdAt)}</p>
          <div className="mt-3 grid gap-2 text-sm text-slate-300">
            <div className="flex items-center justify-between gap-3">
              <span>手机号</span>
              <span className="text-white">{lead.phone}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>微信名</span>
              <span className="text-white">{lead.wechatName}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>处理时间</span>
              <span className="text-white">
                {formatLeadDateTime(lead.validAt || lead.invalidAt || lead.createdAt)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function StatsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="border-white/10 bg-white/[0.04] p-4">
            <Skeleton className="h-4 w-24 bg-white/10" />
            <Skeleton className="mt-3 h-8 w-28 bg-white/10" />
          </Card>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Skeleton className="h-[320px] rounded-[24px] bg-white/10" />
        <Skeleton className="h-[320px] rounded-[24px] bg-white/10" />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Skeleton className="h-[240px] rounded-[24px] bg-white/10" />
        <Skeleton className="h-[240px] rounded-[24px] bg-white/10" />
      </div>
    </div>
  );
}

export default function LeadStatsPage() {
  const query = useQuery<LeadStatsResponse>({
    queryKey: ["lead", "stats"],
    queryFn: getLeadStatsMe,
    staleTime: 30_000,
  });

  const stats = query.data?.summary;
  const bySource = useMemo(() => query.data?.bySource ?? [], [query.data?.bySource]);
  const byReason = useMemo(() => query.data?.byReason ?? [], [query.data?.byReason]);
  const trend = useMemo(() => query.data?.trend ?? [], [query.data?.trend]);
  const recentValid = useMemo(() => query.data?.recentValid ?? [], [query.data?.recentValid]);
  const recentInvalid = useMemo(() => query.data?.recentInvalid ?? [], [query.data?.recentInvalid]);

  const loading = query.isLoading && !query.data;

  return (
    <div className="min-h-[100dvh] bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.12),transparent_35%),linear-gradient(180deg,#0b1220_0%,#060b14_100%)] text-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 pb-8 pt-4 sm:px-5 lg:px-6">
        <LeadQueueHeader
          title="我的统计"
          description="查看个人的处理效率、来源分布、无效原因和最近处理记录。"
          stats={[
            { label: "今日处理", value: stats?.processedToday ?? 0, hint: "Today" },
            { label: "有效率", value: formatPercent(stats?.validRate), hint: "Valid" },
            { label: "无效率", value: formatPercent(stats?.invalidRate), hint: "Invalid" },
            { label: "平均处理时长", value: formatMinutes(stats?.avgHandleMinutes), hint: "Avg" },
          ]}
        >
          <Button
            type="button"
            variant="outline"
            onClick={() => query.refetch()}
            className="h-10 rounded-2xl border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]"
          >
            <RefreshCw className="h-4 w-4" />
            刷新
          </Button>
        </LeadQueueHeader>

        {loading ? (
          <StatsSkeleton />
        ) : query.isError ? (
          <Card className="border-white/10 bg-white/[0.04] p-6 text-center">
            <p className="text-lg font-semibold text-white">统计加载失败</p>
            <p className="mt-2 text-sm text-slate-400">请点击刷新重新拉取数据。</p>
            <Button
              type="button"
              onClick={() => query.refetch()}
              className="mt-4 h-11 rounded-2xl bg-white text-slate-950 hover:bg-slate-200"
            >
              重新加载
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="今日处理"
                value={stats?.processedToday ?? 0}
                hint="Processed today"
                accent="default"
              />
              <MetricCard
                label="有效率"
                value={formatPercent(stats?.validRate)}
                hint="Conversion"
                accent="positive"
              />
              <MetricCard
                label="无效率"
                value={formatPercent(stats?.invalidRate)}
                hint="Rejected"
                accent="negative"
              />
              <MetricCard
                label="平均处理时长"
                value={formatMinutes(stats?.avgHandleMinutes)}
                hint="Avg handle time"
                accent="default"
              />
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <BarSection
                title="来源平台分布"
                items={bySource}
                fallback="当前没有来源分布数据。"
                accentClass="bg-emerald-400"
              />
              <BarSection
                title="无效原因分布"
                items={byReason}
                fallback="当前没有无效原因数据。"
                accentClass="bg-rose-400"
              />
            </div>

            <Card className="border-white/10 bg-white/[0.04] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">处理趋势</p>
                  <p className="mt-1 text-xs text-slate-400">按时间段展示有效与无效的对比。</p>
                </div>
                <Clock3 className="h-4 w-4 text-slate-400" />
              </div>
              <div className="mt-4 space-y-3">
                {trend.length === 0 ? (
                  <p className="text-sm text-slate-500">暂无趋势数据。</p>
                ) : (
                  trend.map((item) => {
                    const max = Math.max(item.valid, item.invalid, 1);
                    return (
                      <div key={item.label} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="text-slate-300">{item.label}</span>
                          <span className="text-slate-400">
                            <span className="text-emerald-300">{item.valid}</span> /{" "}
                            <span className="text-rose-300">{item.invalid}</span>
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                            <div
                              className="h-full rounded-full bg-emerald-400"
                              style={{ width: `${Math.max((item.valid / max) * 100, 8)}%` }}
                            />
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                            <div
                              className="h-full rounded-full bg-rose-400"
                              style={{ width: `${Math.max((item.invalid / max) * 100, 8)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>

            <div className="grid gap-4 xl:grid-cols-2">
              <Card className="border-white/10 bg-white/[0.04] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">最近有效</p>
                    <p className="mt-1 text-xs text-slate-400">最近完成好友确认的线索。</p>
                  </div>
                  <TrendingUp className="h-4 w-4 text-emerald-300" />
                </div>
                <div className="mt-4 space-y-3">
                  {recentValid.length === 0 ? (
                    <p className="text-sm text-slate-500">暂无有效记录。</p>
                  ) : (
                    recentValid.slice(0, 4).map((lead) => <RecentLeadCard key={lead.id} lead={lead} tone="valid" />)
                  )}
                </div>
              </Card>

              <Card className="border-white/10 bg-white/[0.04] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">最近无效</p>
                    <p className="mt-1 text-xs text-slate-400">最近提交无效原因的线索。</p>
                  </div>
                  <TrendingDown className="h-4 w-4 text-rose-300" />
                </div>
                <div className="mt-4 space-y-3">
                  {recentInvalid.length === 0 ? (
                    <p className="text-sm text-slate-500">暂无无效记录。</p>
                  ) : (
                    recentInvalid.slice(0, 4).map((lead) => <RecentLeadCard key={lead.id} lead={lead} tone="invalid" />)
                  )}
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
