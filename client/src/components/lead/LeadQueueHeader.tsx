import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

interface LeadStatChip {
  label: string;
  value: string | number;
  hint?: string;
}

interface LeadQueueHeaderProps {
  title: string;
  description?: string;
  stats: LeadStatChip[];
  children?: ReactNode;
  className?: string;
}

export default function LeadQueueHeader({
  title,
  description,
  stats,
  children,
  className,
}: LeadQueueHeaderProps) {
  return (
    <Card
      className={cn(
        "overflow-hidden border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-0 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.65)]",
        className,
      )}
    >
      <div className="border-b border-white/10 px-4 py-4 sm:px-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">
              Lead allocation
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-[2rem]">
              {title}
            </h1>
            {description ? (
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
                {description}
              </p>
            ) : null}
          </div>
          {children ? <div className="shrink-0">{children}</div> : null}
        </div>
      </div>

      <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4 sm:p-5">
        {stats.map((stat, index) => (
          <motion.div
            key={`${stat.label}-${index}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, delay: index * 0.04 }}
            className="rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-medium tracking-[0.24em] text-slate-400 uppercase">
                {stat.label}
              </p>
              {stat.hint ? (
                <span className="text-[11px] text-slate-500">{stat.hint}</span>
              ) : null}
            </div>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-white">
              {stat.value}
            </p>
          </motion.div>
        ))}
      </div>
    </Card>
  );
}
