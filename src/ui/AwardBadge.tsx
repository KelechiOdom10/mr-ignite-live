import { Crown, Medal } from "lucide-react";

import { cn } from "@/lib/utils";

export type Award = "MVP" | "SVP";

const STYLE: Record<Award, string> = {
  MVP: "bg-gradient-to-b from-amber-200 to-amber-400 text-amber-950 ring-amber-300/60 shadow-[0_0_12px_-2px] shadow-amber-400/40",
  SVP: "bg-gradient-to-b from-zinc-100 to-zinc-300 text-zinc-800 ring-zinc-200/60",
};

export function AwardBadge({
  award,
  count,
  className,
}: {
  award: Award;
  count?: number;
  className?: string;
}) {
  const Icon = award === "MVP" ? Crown : Medal;
  const label = count && count > 1 ? `${count}× ${award}` : award;
  return (
    <span
      aria-label={label}
      className={cn(
        "inline-flex h-5 shrink-0 items-center gap-1 rounded-md px-1.5 text-[0.65rem] font-bold tracking-wide ring-1 ring-inset",
        STYLE[award],
        className,
      )}
    >
      <Icon className="size-3" strokeWidth={2.5} aria-hidden />
      {award}
      {count && count > 1 ? <span className="font-mono">×{count}</span> : null}
    </span>
  );
}
