import type { Team, TeamInfo } from "@/data/model";
import { teamHue } from "@/data/teams";
import { cn } from "@/lib/utils";

export function logoUrl(info: TeamInfo | undefined): string | undefined {
  const upstream = info?.logoDark ?? info?.logoLight;
  return upstream ? `/api/logo?u=${encodeURIComponent(upstream)}` : undefined;
}

export function TeamLogo({
  team,
  info,
  size = 28,
  className,
}: {
  team: Team | null;
  info?: TeamInfo;
  size?: number;
  className?: string;
}) {
  const src = logoUrl(info);
  const box = { width: size, height: size };
  if (!team) {
    return (
      <span
        style={box}
        className={cn(
          "grid shrink-0 place-items-center rounded-md bg-muted text-[10px] font-semibold text-muted-foreground",
          className,
        )}
      >
        ?
      </span>
    );
  }
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
  const hue = teamHue(team.name);
  return (
    <span
      style={{ ...box, background: `oklch(42% 0.12 ${hue})`, fontSize: size * 0.34 }}
      className={cn(
        "grid shrink-0 place-items-center rounded-md font-display font-bold text-white",
        className,
      )}
    >
      {team.short.slice(0, 3)}
    </span>
  );
}
