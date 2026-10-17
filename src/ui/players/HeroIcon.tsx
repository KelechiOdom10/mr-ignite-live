import type { Hero } from "@/domain/player";
import { cn } from "@/lib/utils";

import { proxiedImage } from "../images";

const ROLE_RING: Record<NonNullable<Hero["role"]>, string> = {
  Vanguard: "ring-region-americas/60",
  Duelist: "ring-live/60",
  Strategist: "ring-win/60",
};

export function HeroIcon({
  hero,
  size = 32,
  className,
}: {
  hero: Hero;
  size?: number;
  className?: string;
}) {
  const src = proxiedImage(hero.iconUrl);
  const box = { width: size, height: size };
  const ring = hero.role ? ROLE_RING[hero.role] : "ring-border";
  return src ? (
    <img
      src={src}
      alt=""
      title={hero.name}
      style={box}
      loading="lazy"
      className={cn("shrink-0 rounded-md bg-muted object-cover ring-1", ring, className)}
    />
  ) : (
    <span
      title={hero.name}
      style={box}
      className={cn("shrink-0 rounded-md bg-muted ring-1", ring, className)}
    />
  );
}
