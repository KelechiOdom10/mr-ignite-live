import type { Rank } from "@/domain/player";
import { cn } from "@/lib/utils";

import { RankIcon } from "./RankIcon";

// Full class names so Tailwind's scanner sees each one.
const TIER_TEXT = new Map<string, string>([
  ["bronze", "text-rank-bronze"],
  ["silver", "text-rank-silver"],
  ["gold", "text-rank-gold"],
  ["platinum", "text-rank-platinum"],
  ["diamond", "text-rank-diamond"],
  ["grandmaster", "text-rank-grandmaster"],
  ["celestial", "text-rank-celestial"],
  ["eternity", "text-rank-eternity"],
  ["one", "text-rank-oaa"],
]);

export function rankTierClass(name: string | null): string {
  const tier = (name ?? "").split(" ")[0]?.toLowerCase() ?? "";

  return TIER_TEXT.get(tier) ?? "text-muted-foreground";
}

export function RankBadge({
  rank,
  iconSize = 20,
  className,
}: {
  rank: Rank;
  iconSize?: number;
  className?: string;
}) {
  if (!rank.name) return <span className={cn("text-muted-foreground", className)}>Unranked</span>;

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <RankIcon name={rank.name} size={iconSize} />
      <span className="inline-flex items-baseline gap-1.5">
        <span className={cn("font-semibold", rankTierClass(rank.name))}>{rank.name}</span>
        {rank.score !== null && (
          <span className="font-mono text-xs text-muted-foreground tabular-nums">
            {Math.round(rank.score)} RS
          </span>
        )}
      </span>
    </span>
  );
}
