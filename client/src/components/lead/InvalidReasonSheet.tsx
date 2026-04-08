import { useEffect, useMemo, useState } from "react";
import { Check, ChevronRight, Loader2, MessageSquare, Phone, User } from "lucide-react";

import { cn } from "@/lib/utils";
import { LEAD_INVALID_REASONS, type Lead, type LeadInvalidReasonOption } from "@/lib/lead";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

interface InvalidReasonSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead | null;
  loading?: boolean;
  onSubmit: (payload: { reason: LeadInvalidReasonOption; note: string }) => void;
}

export default function InvalidReasonSheet({
  open,
  onOpenChange,
  lead,
  loading = false,
  onSubmit,
}: InvalidReasonSheetProps) {
  const [reason, setReason] = useState<LeadInvalidReasonOption>(LEAD_INVALID_REASONS[0]);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open) return;
    setReason(LEAD_INVALID_REASONS[0]);
    setNote("");
  }, [open, lead?.id]);

  const canSubmit = useMemo(() => {
    if (!reason) return false;
    if (reason.value === "other") {
      return note.trim().length > 0;
    }
    return true;
  }, [note, reason]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="mx-auto w-full max-w-2xl rounded-t-[28px] border-white/10 bg-[linear-gradient(180deg,rgba(17,24,39,0.98),rgba(15,23,42,0.99))] px-4 pb-6 pt-4 text-white sm:px-6">
        <SheetHeader className="space-y-3 pb-2 text-left">
          <SheetTitle className="text-xl font-semibold tracking-tight text-white">
            选择无效原因
          </SheetTitle>
          <SheetDescription className="text-sm leading-relaxed text-slate-400">
            未加好友必须先选原因，若是“其他”请补充备注后再提交。
          </SheetDescription>
        </SheetHeader>

        {lead ? (
          <div className="mt-4 rounded-3xl border border-white/10 bg-white/[0.04] p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-white/10 bg-white/[0.04] text-slate-200">
                <Phone className="mr-1 h-3.5 w-3.5" />
                {lead.phone}
              </Badge>
              <Badge variant="outline" className="border-white/10 bg-white/[0.04] text-slate-200">
                <MessageSquare className="mr-1 h-3.5 w-3.5" />
                {lead.wechatName}
              </Badge>
              <Badge variant="outline" className="border-white/10 bg-white/[0.04] text-slate-200">
                <User className="mr-1 h-3.5 w-3.5" />
                {lead.operatorName}
              </Badge>
            </div>
            <p className="mt-3 text-sm text-slate-300">
              来源：{lead.sourcePlatform}
            </p>
          </div>
        ) : null}

        <div className="mt-5 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
            原因选择
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {LEAD_INVALID_REASONS.map((option) => {
              const active = reason.value === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setReason(option)}
                  className={cn(
                    "rounded-3xl border p-4 text-left transition-all",
                    active
                      ? "border-emerald-400/40 bg-emerald-500/12 shadow-[0_0_0_1px_rgba(52,211,153,0.12)]"
                      : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-white">{option.label}</p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-400">
                        {option.description}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border",
                        active
                          ? "border-emerald-400 bg-emerald-400 text-slate-950"
                          : "border-white/15 text-transparent",
                      )}
                    >
                      <Check className="h-3 w-3" />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <label className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
            备注
          </label>
          <Textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="选“其他”时请补充说明"
            className="min-h-[110px] rounded-3xl border-white/10 bg-white/[0.04] text-white placeholder:text-slate-500 focus-visible:ring-emerald-400/40"
          />
        </div>

        <SheetFooter className="mt-5 gap-2 sm:gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-11 rounded-2xl border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]"
          >
            取消
          </Button>
          <Button
            type="button"
            disabled={!canSubmit || loading}
            onClick={() => onSubmit({ reason, note: note.trim() })}
            className="h-11 rounded-2xl bg-rose-500 text-white hover:bg-rose-400 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
            提交无效原因
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
