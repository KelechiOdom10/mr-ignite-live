import type { Team, TeamInfo } from "@/domain/model";
import { cn } from "@/lib/utils";

import { proxiedImage } from "./images";

export function logoUrl(info: TeamInfo | undefined): string | undefined {
  return proxiedImage(info?.logoDark ?? info?.logoLight);
}

export function TeamLogo({
  team,
  info,
  size = 24,
  className,
}: {
  team: Team | null;
  info?: TeamInfo;
  size?: number;
  className?: string;
}) {
  const box = { width: size, height: size };
  const src = logoUrl(info);
  if (src) {
    return (
      <img
        src={src}
        alt=""
        style={box}
        loading="lazy"
        className={cn("shrink-0 object-contain", className)}
      />
    );
  }
  return (
    <span
      style={box}
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center rounded-md bg-muted font-mono text-[0.6rem] font-semibold text-muted-foreground",
        className,
      )}
    >
      {team ? team.short.slice(0, 3) : "?"}
    </span>
  );
}
