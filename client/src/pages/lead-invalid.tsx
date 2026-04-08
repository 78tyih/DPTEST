import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, RefreshCw } from "lucide-react";

import LeadQueueHeader from "@/components/lead/LeadQueueHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  formatLeadDateTime,
  formatLeadTimestamp,
  getLeadInvalid,
  type Lead,
} from "@/lib/lead";

function LeadArchiveSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <Card key={index} className="overflow-hidden border-white/10 bg-white/[0.04] p-4">
          <Skeleton className="h-4 w-28 bg-white/10" />
          <Skeleton className="mt-3 h-6 w-40 bg-white/10" />
          <Skeleton className="mt-4 h-44 rounded-3xl bg-white/10" />
          <Skeleton className="mt-4 h-16 rounded-2xl bg-white/10" />
        </Card>
      ))}
    </div>
  );
}

function ArchiveCard({ lead }: { lead: Lead }) {
  const processedAt = lead.invalidAt || lead.createdAt;

  return (
    <Card className="overflow-hidden border-white/10 bg-white/[0.04] shadow-[0_22px_40px_-26px_rgba(0,0,0,0.68)]">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">来源平台</p>
          <p className="mt-1 truncate text-sm font-medium text-white">{lead.sourcePlatform}</p>
        </div>
        <Badge className="border-rose-400/20 bg-rose-500/12 text-rose-200">
          <AlertCircle className="mr-1 h-3.5 w-3.5" />
          已无效
        </Badge>
      </div>

      <div className="p-4">
        <div className="grid gap-4 md:grid-cols-[1fr_0.92fr]">
          <div className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">手机号</p>
                <p className="mt-2 text-sm font-semibold text-white">{lead.phone}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">微信名</p>
                <p className="mt-2 text-sm font-semibold text-white">{lead.wechatName}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">录入运营</p>
                <p className="mt-2 text-sm font-semibold text-white">{lead.operatorName}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">处理时间</p>
                <p className="mt-2 text-sm font-semibold text-white">{formatLeadDateTime(processedAt)}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/8 px-3 py-3">
              <p className="text-[11px] uppercase tracking-[0.24em] text-rose-200">无效原因</p>
              <p className="mt-2 text-sm leading-relaxed text-rose-50">
                {lead.invalidReason || "未填写原因"}
              </p>
              {lead.invalidNote ? (
                <p className="mt-3 text-sm leading-relaxed text-slate-300">
                  {lead.invalidNote}
                </p>
              ) : null}
            </div>
          </div>

          <AspectRatio ratio={16 / 10}>
            <div className="h-full overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04]">
              {lead.screenshotUrl ? (
                <img
                  src={lead.screenshotUrl}
                  alt={`${lead.sourcePlatform} 截图`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-slate-400">
                  暂无截图
                </div>
              )}
            </div>
          </AspectRatio>
        </div>
      </div>
    </Card>
  );
}

export default function LeadInvalidPage() {
  const query = useQuery({
    queryKey: ["lead", "invalid"],
    queryFn: getLeadInvalid,
    staleTime: 30_000,
  });

  const items = useMemo(() => query.data?.items ?? [], [query.data?.items]);
  const summary = query.data?.summary ?? {
    total: items.length,
    pending: 0,
    valid: 0,
    invalid: items.length,
  };

  const loading = query.isLoading && items.length === 0;

  return (
    <div className="min-h-[100dvh] bg-[radial-gradient(circle_at_top,rgba(244,63,94,0.12),transparent_35%),linear-gradient(180deg,#0b1220_0%,#060b14_100%)] text-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 pb-8 pt-4 sm:px-5 lg:px-6">
        <LeadQueueHeader
          title="已无效"
          description="未加好友且已提交原因的线索会沉淀到无效池，便于后续复盘。"
          stats={[
            { label: "已无效", value: summary.invalid ?? items.length, hint: "Invalid" },
            { label: "总数", value: summary.total ?? items.length, hint: "All" },
            { label: "最近处理", value: items[0] ? formatLeadTimestamp(items[0].invalidAt || items[0].createdAt) : "—", hint: "Recent" },
            { label: "当前列表", value: items.length, hint: "List" },
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
          <LeadArchiveSkeleton />
        ) : query.isError ? (
          <Card className="border-white/10 bg-white/[0.04] p-6 text-center">
            <p className="text-lg font-semibold text-white">已无效列表加载失败</p>
            <p className="mt-2 text-sm text-slate-400">请点击刷新重新拉取数据。</p>
            <Button
              type="button"
              onClick={() => query.refetch()}
              className="mt-4 h-11 rounded-2xl bg-white text-slate-950 hover:bg-slate-200"
            >
              重新加载
            </Button>
          </Card>
        ) : items.length === 0 ? (
          <Card className="border-white/10 bg-white/[0.04] p-8 text-center">
            <p className="text-lg font-semibold text-white">暂无无效线索</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              当前还没有被驳回的线索，处理完成后会在这里出现。
            </p>
          </Card>
        ) : (
          <ScrollArea className="max-h-[calc(100dvh-18rem)] pr-2">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {items.map((lead) => (
                <ArchiveCard key={lead.id} lead={lead} />
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
