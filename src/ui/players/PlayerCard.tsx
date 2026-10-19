import { Link } from "@void/react";

import type { PlayerCard as Card, Result } from "@/domain/player";
import { cn } from "@/lib/utils";

import { PlatformIcon, PLATFORM_NAMES } from "./PlatformIcon";
import { PlayerAvatar } from "./PlayerAvatar";
import { rankTierClass } from "./RankBadge";
import { RankIcon } from "./RankIcon";

const RESULT_DOT = new Map<Result, string>([
  ["win", "bg-win"],
  ["loss", "bg-live"],
  ["draw", "bg-muted-foreground"],
  ["abandoned", "bg-muted-foreground/50"],
]);

/** One player in a list: who, their rank and platform, and how their last games went. */
export function PlayerCard({ player }: { player: Card }) {
  const { rank, device, form } = player;
  const wins = form.filter((r) => r === "win").length;

  return (
    <Link
      href={`/player/${player.uid}`}
      className="group flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:border-border-strong hover:bg-accent/40"
    >
      <PlayerAvatar iconUrl={player.iconUrl} name={player.name} size={44} className="rounded-lg" />
      <div className="min-w-0 flex-1">
        <p className="flex min-w-0 items-center gap-1.5 font-medium">
          {player.club && <span className="shrink-0 text-muted-foreground">[{player.club}]</span>}
          <span className="truncate">{player.name}</span>
          {device && (
            <span
              title={PLATFORM_NAMES.get(device)}
              className="ml-auto shrink-0 text-muted-foreground"
            >
              <PlatformIcon device={device} label className="size-3.5" />
            </span>
          )}
        </p>
        {rank?.name ? (
          <p className="mt-1 flex items-center gap-1.5 text-sm">
            <RankIcon name={rank.name} size={20} />
            <span className={cn("truncate font-medium", rankTierClass(rank.name))}>
              {rank.name}
            </span>
            {rank.score !== null && (
              <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
                {Math.round(rank.score)} RS
              </span>
            )}
          </p>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">Open to load their rank</p>
        )}
        {form.length > 0 && (
          <p className="mt-2 flex items-center gap-1">
            <span className="sr-only">
              Last {form.length} competitive: {wins} won, {form.length - wins} not won.
            </span>
            {form.toReversed().map((r, i) => (
              <span
                key={i}
                aria-hidden="true"
                className={cn("h-1.5 w-4 rounded-full", RESULT_DOT.get(r))}
              />
            ))}
          </p>
        )}
      </div>
    </Link>
  );
}
