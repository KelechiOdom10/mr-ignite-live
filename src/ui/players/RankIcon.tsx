import { cn } from "@/lib/utils";

// In-game rank badges, from rivalskins.com's copies of the game assets, cut to 224px and served
// from public/ranks. Keyed by the tier's first word, as the game names them.
const TIER_FILES = new Map<string, string>([
  ["bronze", "bronze"],
  ["silver", "silver"],
  ["gold", "gold"],
  ["platinum", "platinum"],
  ["diamond", "diamond"],
  ["grandmaster", "grandmaster"],
  ["celestial", "celestial"],
  ["eternity", "eternity"],
  ["one", "one-above-all"],
]);

export function rankIconSrc(name: string | null): string | null {
  const tier = (name ?? "").split(" ")[0]?.toLowerCase() ?? "";
  const file = TIER_FILES.get(tier);

  return file ? `/ranks/${file}.png` : null;
}

/** A rank's badge, decorative: the rank's name is always written next to it. */
export function RankIcon({
  name,
  size,
  className,
}: {
  name: string | null;
  size: number;
  className?: string;
}) {
  const src = rankIconSrc(name);

  if (!src) return null;

  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      className={cn("shrink-0 object-contain", className)}
    />
  );
}
