import { cn } from "@/lib/utils";
import type { LeadMode } from "@/lib/lead";

interface ModeToggleProps {
  value: LeadMode;
  onChange: (value: LeadMode) => void;
  className?: string;
}

const options: Array<{ value: LeadMode; label: string; hint: string }> = [
  { value: "button", label: "按钮模式", hint: "逐个点击处理" },
  { value: "swipe", label: "滑动模式", hint: "向右通过，向左驳回" },
];

export default function ModeToggle({ value, onChange, className }: ModeToggleProps) {
  return (
    <div
      className={cn(
        "inline-flex rounded-full border border-white/10 bg-white/[0.04] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur",
        className,
      )}
      role="tablist"
      aria-label="线索处理模式"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative min-w-[5.75rem] rounded-full px-3 py-2 text-left text-xs transition-all",
              active ? "bg-white text-slate-950 shadow-sm" : "text-slate-300 hover:text-white",
            )}
          >
            <span className="block text-[11px] font-semibold">{option.label}</span>
            <span className={cn("block text-[10px] leading-tight", active ? "text-slate-500" : "text-slate-400")}>
              {option.hint}
            </span>
          </button>
        );
      })}
    </div>
  );
}
