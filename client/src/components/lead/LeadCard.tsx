import { motion } from "framer-motion";
import { ArrowLeftRight, BadgeCheck, BadgeX, Building2, ChevronRight, Clock3, Image, MessageSquare, Phone, User } from "lucide-react";

import { cn } from "@/lib/utils";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Lead, LeadMode } from "@/lib/lead";
import { formatLeadTimestamp } from "@/lib/lead";

interface LeadCardProps {
  lead: Lead;
  mode: LeadMode;
  isProcessing?: boolean;
  onMarkValid: (lead: Lead) => void;
  onMarkInvalid: (lead: Lead) => void;
  onViewDetails: (lead: Lead) => void;
}

function formatLeadLabel(lead: Lead) {
  return lead.sourcePlatform || "未知来源";
}

export default function LeadCard({
  lead,
  mode,
  isProcessing = false,
  onMarkValid,
  onMarkInvalid,
  onViewDetails,
}: LeadCardProps) {
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -18, scale: 0.96 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      drag={mode === "swipe" && !isProcessing ? "x" : false}
      dragElastic={0.16}
      dragConstraints={{ left: 0, right: 0 }}
      whileTap={{ scale: 0.992 }}
      onDragEnd={(_, info) => {
        if (isProcessing) return;
        if (info.offset.x > 120) {
          onMarkValid(lead);
          return;
        }
        if (info.offset.x < -120) {
          onMarkInvalid(lead);
        }
      }}
      className={cn(
        "relative",
        mode === "swipe" && "touch-pan-y",
        isProcessing && "pointer-events-none opacity-70",
      )}
    >
      <Card className="overflow-hidden border-white/10 bg-white/[0.05] shadow-[0_22px_40px_-26px_rgba(0,0,0,0.7)]">
        <div className="border-b border-white/10 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="border-white/10 bg-white/[0.04] text-[11px] text-slate-200">
                  <Building2 className="mr-1 h-3.5 w-3.5" />
                  {formatLeadLabel(lead)}
                </Badge>
                <Badge variant="outline" className="border-white/10 bg-white/[0.04] text-[11px] text-slate-200">
                  <Clock3 className="mr-1 h-3.5 w-3.5" />
                  {formatLeadTimestamp(lead.createdAt)}
                </Badge>
              </div>
              <p className="mt-3 text-sm text-slate-400">录入运营</p>
              <p className="mt-0.5 text-base font-medium text-white">{lead.operatorName || "未知运营"}</p>
            </div>

            <div className="shrink-0 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-right">
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">线索号</p>
              <p className="mt-1 text-xs text-slate-200">#{lead.id}</p>
            </div>
          </div>
        </div>

        <div className="p-4">
          <div className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-3">
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-slate-500">
                    <Phone className="h-3.5 w-3.5" />
                    手机号
                  </div>
                  <p className="mt-2 text-base font-semibold text-white">{lead.phone}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-3">
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-slate-500">
                    <MessageSquare className="h-3.5 w-3.5" />
                    微信名
                  </div>
                  <p className="mt-2 text-base font-semibold text-white">{lead.wechatName}</p>
                </div>
              </div>

              {lead.detail ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">备注</p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-300">{lead.detail}</p>
                </div>
              ) : null}

              {mode === "swipe" ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-3 py-3 text-sm text-slate-400">
                  <div className="flex items-center gap-2 text-white">
                    <ArrowLeftRight className="h-4 w-4 text-slate-300" />
                    左滑未加好友，右滑已加好友
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">
                    也可以点下面的详情按钮查看完整信息。
                  </p>
                </div>
              ) : null}
            </div>

            <div className="space-y-3">
              <AspectRatio ratio={16 / 10}>
                <div className="relative h-full overflow-hidden rounded-3xl border border-white/10 bg-black/30">
                  {lead.screenshotUrl ? (
                    <img
                      src={lead.screenshotUrl}
                      alt={`${lead.sourcePlatform} 截图`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-slate-500">
                      <div className="text-center">
                        <Image className="mx-auto h-7 w-7 text-slate-500" />
                        <p className="mt-2 text-xs">暂无截图</p>
                      </div>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
                </div>
              </AspectRatio>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 p-4">
          {mode === "button" ? (
            <div className="grid gap-2 sm:grid-cols-3">
              <Button
                type="button"
                onClick={() => onMarkValid(lead)}
                className="h-11 rounded-2xl bg-emerald-500 text-slate-950 hover:bg-emerald-400"
              >
                <BadgeCheck className="h-4 w-4" />
                已加好友
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => onMarkInvalid(lead)}
                className="h-11 rounded-2xl border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]"
              >
                <BadgeX className="h-4 w-4" />
                未加好友
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => onViewDetails(lead)}
                className="h-11 rounded-2xl border-white/10 bg-transparent text-white hover:bg-white/[0.06]"
              >
                查看详情
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-emerald-300">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  右滑通过
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/20 bg-rose-500/10 px-2.5 py-1 text-rose-200">
                  <BadgeX className="h-3.5 w-3.5" />
                  左滑驳回
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => onViewDetails(lead)}
                className="h-10 rounded-2xl border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]"
              >
                查看详情
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </Card>
    </motion.article>
  );
}
