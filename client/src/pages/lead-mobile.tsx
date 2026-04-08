import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, Search, X } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";

import ModeToggle from "@/components/lead/ModeToggle";
import LeadCard from "@/components/lead/LeadCard";
import LeadQueueHeader from "@/components/lead/LeadQueueHeader";
import InvalidReasonSheet from "@/components/lead/InvalidReasonSheet";
import {
  LEAD_QUEUE_MODE_STORAGE_KEY,
  formatLeadDateTime,
  formatLeadTimestamp,
  getLeadQueue,
  markLeadInvalid,
  markLeadValid,
  type Lead,
  type LeadMode,
} from "@/lib/lead";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Skeleton } from "@/components/ui/skeleton";

function loadStoredMode(): LeadMode {
  if (typeof window === "undefined") return "button";
  const raw = window.localStorage.getItem(LEAD_QUEUE_MODE_STORAGE_KEY);
  return raw === "swipe" ? "swipe" : "button";
}

function QueueSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <Card key={index} className="overflow-hidden border-white/10 bg-white/[0.04] p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-2">
              <Skeleton className="h-4 w-28 bg-white/10" />
              <Skeleton className="h-8 w-40 bg-white/10" />
            </div>
            <Skeleton className="h-10 w-16 rounded-2xl bg-white/10" />
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-3">
              <Skeleton className="h-16 rounded-2xl bg-white/10" />
              <Skeleton className="h-16 rounded-2xl bg-white/10" />
              <Skeleton className="h-20 rounded-2xl bg-white/10" />
            </div>
            <Skeleton className="h-56 rounded-3xl bg-white/10" />
          </div>
          <div className="mt-4 flex gap-2">
            <Skeleton className="h-11 flex-1 rounded-2xl bg-white/10" />
            <Skeleton className="h-11 flex-1 rounded-2xl bg-white/10" />
            <Skeleton className="h-11 flex-1 rounded-2xl bg-white/10" />
          </div>
        </Card>
      ))}
    </div>
  );
}

export default function LeadMobilePage() {
  const { toast } = useToast();
  const [mode, setMode] = useState<LeadMode>(loadStoredMode);
  const [queue, setQueue] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [invalidLead, setInvalidLead] = useState<Lead | null>(null);
  const [invalidOpen, setInvalidOpen] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const queueQuery = useQuery({
    queryKey: ["lead", "queue"],
    queryFn: getLeadQueue,
    staleTime: 15_000,
  });

  useEffect(() => {
    if (queueQuery.data) {
      setQueue(queueQuery.data.items);
    }
  }, [queueQuery.data]);

  useEffect(() => {
    window.localStorage.setItem(LEAD_QUEUE_MODE_STORAGE_KEY, mode);
  }, [mode]);

  const summary = queueQuery.data?.summary ?? {
    total: queue.length,
    pending: queue.length,
    valid: 0,
    invalid: 0,
  };

  const processedCount = summary.valid + summary.invalid;

  const sortedQueue = useMemo(
    () =>
      [...queue].sort((a, b) => {
        const timeA = new Date(a.createdAt || 0).getTime();
        const timeB = new Date(b.createdAt || 0).getTime();
        return timeB - timeA;
      }),
    [queue],
  );

  const invalidateMutation = useMutation({
    mutationFn: ({ id, reason, note }: { id: string; reason: string; note?: string }) =>
      markLeadInvalid(id, { reason, note }),
    onMutate: ({ id }) => {
      setProcessingId(id);
    },
    onSuccess: async (_, variables) => {
      setQueue((current) => current.filter((lead) => lead.id !== variables.id));
      setInvalidLead(null);
      setInvalidOpen(false);
      setProcessingId(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["lead", "queue"] }),
        queryClient.invalidateQueries({ queryKey: ["lead", "valid"] }),
        queryClient.invalidateQueries({ queryKey: ["lead", "invalid"] }),
        queryClient.invalidateQueries({ queryKey: ["lead", "stats"] }),
      ]);
      toast({
        title: "已标记无效",
        description: "当前线索已从待处理列表移除。",
      });
    },
    onError: (error) => {
      setProcessingId(null);
      toast({
        title: "提交失败",
        description: error instanceof Error ? error.message : "请稍后重试",
        variant: "destructive",
      });
    },
  });

  const validateMutation = useMutation({
    mutationFn: (id: string) => markLeadValid(id),
    onMutate: (id) => {
      setProcessingId(id);
    },
    onSuccess: async (_, id) => {
      setQueue((current) => current.filter((lead) => lead.id !== id));
      setSelectedLead((current) => (current?.id === id ? null : current));
      setDetailsOpen(false);
      setProcessingId(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["lead", "queue"] }),
        queryClient.invalidateQueries({ queryKey: ["lead", "valid"] }),
        queryClient.invalidateQueries({ queryKey: ["lead", "invalid"] }),
        queryClient.invalidateQueries({ queryKey: ["lead", "stats"] }),
      ]);
      toast({
        title: "已标记有效",
        description: "当前线索已从待处理列表移除。",
      });
    },
    onError: (error) => {
      setProcessingId(null);
      toast({
        title: "提交失败",
        description: error instanceof Error ? error.message : "请稍后重试",
        variant: "destructive",
      });
    },
  });

  const openDetail = (lead: Lead) => {
    setSelectedLead(lead);
    setDetailsOpen(true);
  };

  const requestInvalid = (lead: Lead) => {
    setInvalidLead(lead);
    setInvalidOpen(true);
  };

  const handleInvalidSubmit = ({ reason, note }: { reason: { value: string }; note: string }) => {
    if (!invalidLead) return;
    invalidateMutation.mutate({ id: invalidLead.id, reason: reason.value, note });
  };

  const isLoading = queueQuery.isLoading && queue.length === 0;
  const isError = queueQuery.isError;

  return (
    <div className="min-h-[100dvh] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_35%),linear-gradient(180deg,#0b1220_0%,#060b14_100%)] text-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 pb-8 pt-4 sm:px-5 lg:px-6">
        <LeadQueueHeader
          title="待处理线索"
          description="卡片流处理页面，支持按钮模式和滑动模式切换，偏好会自动保存在本地。"
          stats={[
            { label: "待处理", value: summary.pending ?? queue.length, hint: "Queue" },
            { label: "已处理", value: processedCount, hint: "Done" },
            { label: "已有效", value: summary.valid, hint: "Valid" },
            { label: "已无效", value: summary.invalid, hint: "Invalid" },
          ]}
        >
          <ModeToggle value={mode} onChange={setMode} />
        </LeadQueueHeader>

        <div className="flex items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            {queue.length} 条待处理
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => queueQuery.refetch()}
            className="h-10 rounded-2xl border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]"
          >
            <RefreshCw className="h-4 w-4" />
            刷新
          </Button>
        </div>

        {isLoading ? (
          <QueueSkeleton />
        ) : isError ? (
          <Card className="border-white/10 bg-white/[0.04] p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05]">
              <Search className="h-5 w-5 text-slate-300" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-white">待处理列表加载失败</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              请稍后再试，或点击刷新重新拉取数据。
            </p>
            <Button
              type="button"
              onClick={() => queueQuery.refetch()}
              className="mt-4 h-11 rounded-2xl bg-white text-slate-950 hover:bg-slate-200"
            >
              重新加载
            </Button>
          </Card>
        ) : sortedQueue.length === 0 ? (
          <Card className="border-white/10 bg-white/[0.04] p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.05]">
              <X className="h-6 w-6 text-slate-300" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-white">当前没有待处理线索</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              所有线索都已处理完成，或当前没有新数据进入队列。
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => queueQuery.refetch()}
              className="mt-5 h-11 rounded-2xl border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]"
            >
              <RefreshCw className="h-4 w-4" />
              重新检查
            </Button>
          </Card>
        ) : (
          <AnimatePresence mode="popLayout">
            <motion.div layout className="space-y-4">
              {sortedQueue.map((lead) => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  mode={mode}
                  isProcessing={processingId === lead.id}
                  onMarkValid={(item) => validateMutation.mutate(item.id)}
                  onMarkInvalid={requestInvalid}
                  onViewDetails={openDetail}
                />
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      <InvalidReasonSheet
        open={invalidOpen}
        onOpenChange={(open) => {
          setInvalidOpen(open);
          if (!open) setInvalidLead(null);
        }}
        lead={invalidLead}
        loading={invalidateMutation.isPending}
        onSubmit={handleInvalidSubmit}
      />

      <Dialog
        open={detailsOpen && !!selectedLead}
        onOpenChange={(open) => {
          setDetailsOpen(open);
          if (!open) setSelectedLead(null);
        }}
      >
        <DialogContent className="max-h-[88dvh] w-[min(100vw-1.5rem,40rem)] overflow-y-auto border-white/10 bg-slate-950 p-0 text-white sm:rounded-[28px]">
          {selectedLead ? (
            <>
              <DialogHeader className="border-b border-white/10 px-4 py-4 text-left sm:px-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <DialogTitle className="text-xl font-semibold tracking-tight text-white">
                      线索详情
                    </DialogTitle>
                    <p className="mt-1 text-sm text-slate-400">
                      {selectedLead.sourcePlatform} · {formatLeadTimestamp(selectedLead.createdAt)}
                    </p>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-5 px-4 py-4 sm:px-6">
                <AspectRatio ratio={16 / 10}>
                  <div className="relative h-full overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.04]">
                    {selectedLead.screenshotUrl ? (
                      <img
                        src={selectedLead.screenshotUrl}
                        alt="线索截图"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-slate-400">
                        暂无截图
                      </div>
                    )}
                  </div>
                </AspectRatio>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Card className="border-white/10 bg-white/[0.04] p-4">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">手机号</p>
                    <p className="mt-2 text-base font-medium text-white">{selectedLead.phone}</p>
                  </Card>
                  <Card className="border-white/10 bg-white/[0.04] p-4">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">微信名</p>
                    <p className="mt-2 text-base font-medium text-white">{selectedLead.wechatName}</p>
                  </Card>
                  <Card className="border-white/10 bg-white/[0.04] p-4">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">录入运营</p>
                    <p className="mt-2 text-base font-medium text-white">{selectedLead.operatorName}</p>
                  </Card>
                  <Card className="border-white/10 bg-white/[0.04] p-4">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">录入时间</p>
                    <p className="mt-2 text-base font-medium text-white">{formatLeadDateTime(selectedLead.createdAt)}</p>
                  </Card>
                </div>

                {selectedLead.detail ? (
                  <Card className="border-white/10 bg-white/[0.04] p-4">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">备注</p>
                    <p className="mt-2 text-sm leading-relaxed text-slate-300">{selectedLead.detail}</p>
                  </Card>
                ) : null}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
