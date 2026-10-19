import { Link } from "@void/react";
import { BarChart3, UserSearch } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/motion/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/motion/tabs";
import type { MatchView } from "@/domain/matchView";
import type { Match, Snapshot } from "@/domain/model";
import { searchableName } from "@/domain/player";
import {
  combinePlayers,
  MatchStatsSchema,
  type Hero,
  type HeroUsage,
  type SeriesPlayer,
  type MatchStats,
  type TeamMapStats,
} from "@/domain/stats";
import { cn } from "@/lib/utils";

import { AwardBadge } from "./AwardBadge";
import { proxiedImage } from "./images";
import { TeamLogo } from "./TeamMark";
import { formatDuration } from "./time";

const StatsResponseSchema = z.object({ stats: MatchStatsSchema.nullable() });

export function useMatchStats(matchId: string, initial: MatchStats | null, refreshKey: string) {
  const [stats, setStats] = useState(initial);
  useEffect(() => {
    const controller = new AbortController();
    const url = `/api/stats/${encodeURIComponent(matchId)}?at=${encodeURIComponent(refreshKey)}`;
    fetch(url, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((body: unknown) => {
        const parsed = StatsResponseSchema.safeParse(body);

        if (parsed.success) setStats(parsed.data.stats);
      })
      .catch(() => {});

    return () => controller.abort();
  }, [matchId, refreshKey]);

  return stats;
}

const ROLE_DOT: Record<string, string> = {
  Vanguard: "bg-region-americas",
  Duelist: "bg-live",
  Strategist: "bg-win",
};

export function HeroPortrait({
  hero,
  size = 24,
  className,
}: {
  hero: Hero;
  size?: number;
  className?: string;
}) {
  const src = proxiedImage(hero.portraitUrl);
  const box = { width: size, height: size };

  return src ? (
    <img
      src={src}
      alt=""
      title={hero.name}
      style={box}
      loading="lazy"
      className={cn("shrink-0 rounded-md bg-muted object-cover", className)}
    />
  ) : (
    <span
      title={hero.name}
      style={box}
      className={cn("shrink-0 rounded-md", ROLE_DOT[hero.role ?? ""] ?? "bg-muted", className)}
    />
  );
}

function HeroName({ hero }: { hero: Hero }) {
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      <HeroPortrait hero={hero} />
      {hero.name}
      {hero.role && <span className="sr-only"> ({hero.role})</span>}
    </span>
  );
}

function heroSummary(hero: HeroUsage, share: number | null): string {
  const time = `${formatDuration(hero.playSeconds)} played${share === null ? "" : ` (${share}%)`}`;
  const line = hero.line;

  if (!line) return `${hero.name}: ${time}; per-hero stats not saved`;

  return `${hero.name}: ${time}; ${line.kills} kills, ${line.deaths} deaths, ${line.assists} assists, ${number.format(line.damage)} damage, ${number.format(line.healing)} healing`;
}

const TRIGGER_CLASS =
  "inline-flex items-center gap-2 rounded-md outline-offset-2 focus-visible:outline-2 focus-visible:outline-primary";

/**
 * One hero's share of a player's map or series, opened from its portrait. The popover mounts on
 * first use: a series page has a portrait per hero per player, and each mounted popover tracks
 * scroll and resize. Its numbers are also in the trigger's name, since the panel is visual only.
 */
function HeroBreakdown({
  hero,
  totalSeconds,
  combined,
  showName,
}: {
  hero: HeroUsage;
  totalSeconds: number;
  combined: boolean;
  showName: boolean;
}) {
  const [armed, setArmed] = useState(false);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const share = totalSeconds > 0 ? Math.round((hero.playSeconds / totalSeconds) * 100) : null;
  const summary = heroSummary(hero, share);

  const face = (
    <>
      <HeroPortrait hero={hero} size={26} />
      {showName && <span className="whitespace-nowrap text-foreground">{hero.name}</span>}
    </>
  );

  useEffect(() => {
    if (armed) triggerRef.current?.querySelector("button")?.focus();
  }, [armed]);

  if (!armed) {
    return (
      <button
        type="button"
        aria-label={summary}
        onClick={() => setArmed(true)}
        className={TRIGGER_CLASS}
      >
        {face}
      </button>
    );
  }

  const line = hero.line;

  const cells: [string, string][] = line
    ? [
        ["K / D / A", `${line.kills} / ${line.deaths} / ${line.assists}`],
        ["Final hits", number.format(line.finalHits)],
        ["Damage", number.format(line.damage)],
        ["Taken", number.format(line.damageTaken)],
        ["Healing", number.format(line.healing)],
        ...(combined || line.accuracy === null
          ? []
          : ([["Accuracy", `${Math.round(line.accuracy)}%`]] as [string, string][])),
      ]
    : [];

  return (
    <span ref={triggerRef} className="inline-flex">
      <Popover defaultOpen side="bottom" align="center" sideOffset={10} gooStrength={6}>
        <PopoverTrigger>
          <button type="button" aria-label={summary} className={TRIGGER_CLASS}>
            {face}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-60 p-3 text-sm">
          <div aria-hidden="true">
            <div className="flex items-center gap-2">
              <HeroPortrait hero={hero} size={32} />
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">{hero.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDuration(hero.playSeconds)} played{share !== null && ` · ${share}%`}
                  {combined && " · all maps"}
                </p>
              </div>
            </div>
            {line ? (
              <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5">
                {cells.map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                    <dd className="font-mono tabular-nums text-foreground">{value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="mt-3 text-xs text-muted-foreground">
                Per-hero stats weren&apos;t saved when this {combined ? "series" : "map"} was
                cached, so only time played is known.
              </p>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </span>
  );
}

/** Every hero a player used, most played first; each opens its own breakdown. */
function HeroesPlayed({ player, combined }: { player: Row; combined: boolean }) {
  const heroes = player.heroes.toSorted((a, b) => b.playSeconds - a.playSeconds);
  const totalSeconds = heroes.reduce((sum, h) => sum + h.playSeconds, 0);

  return (
    <span className="flex flex-wrap items-center gap-1">
      {heroes.map((h) => (
        <HeroBreakdown
          key={h.id}
          hero={h}
          totalSeconds={totalSeconds}
          combined={combined}
          showName={heroes.length === 1}
        />
      ))}
    </span>
  );
}

type Row = SeriesPlayer;

function combine(teams: TeamMapStats[]): Row[] {
  return combinePlayers(teams);
}

const number = new Intl.NumberFormat("en-US");

function StatsTable({
  team,
  rows,
  bans,
  snapshot,
  combined,
}: {
  team: Match["team1"];
  rows: Row[];
  bans: Hero[];
  snapshot: Snapshot;
  combined: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <TeamLogo team={team} info={team ? snapshot.teams[team.name] : undefined} size={20} />
        <span className="font-medium">{team?.name ?? "TBD"}</span>
        {bans.length > 0 && (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            Bans
            <span className="sr-only">: {bans.map((h) => h.name).join(", ")}</span>
            {bans.map((h) => (
              <HeroPortrait key={h.id} hero={h} size={22} className="opacity-60 grayscale" />
            ))}
          </span>
        )}
      </div>
      <div className="relative overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[44rem] text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th scope="col" className="px-3 py-2 text-left font-medium">
                Player
              </th>
              <th scope="col" className="px-3 py-2 text-left font-medium">
                {combined ? "Heroes" : "Hero"}
              </th>
              <th
                scope="col"
                className="px-2 py-2 text-right font-medium"
                title="Kills / deaths / assists"
              >
                K / D / A
              </th>
              <th scope="col" className="px-2 py-2 text-right font-medium" title="Final hits">
                FH
              </th>
              <th scope="col" className="px-2 py-2 text-right font-medium">
                Damage
              </th>
              <th scope="col" className="px-2 py-2 text-right font-medium">
                Taken
              </th>
              <th scope="col" className="px-2 py-2 text-right font-medium">
                Healing
              </th>
              {!combined && (
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  Acc.
                </th>
              )}
              <th scope="col" className="w-8 px-1 py-2">
                <span className="sr-only">Ranked lookup</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((p) => (
              <tr key={p.name} className={cn((p.isMvp || p.mvpCount > 0) && "bg-primary/[0.04]")}>
                <th scope="row" className="px-3 py-2 text-left font-medium">
                  <span className="inline-flex items-center gap-2">
                    {p.name}
                    {combined ? (
                      <>
                        {p.mvpCount > 0 && <AwardBadge award="MVP" count={p.mvpCount} />}
                        {p.svpCount > 0 && <AwardBadge award="SVP" count={p.svpCount} />}
                      </>
                    ) : p.isMvp ? (
                      <AwardBadge award="MVP" />
                    ) : p.isSvp ? (
                      <AwardBadge award="SVP" />
                    ) : null}
                  </span>
                </th>
                <td className="px-3 py-2 text-muted-foreground">
                  {p.heroes.length > 0 ? (
                    <HeroesPlayed player={p} combined={combined} />
                  ) : p.hero ? (
                    <HeroName hero={p.hero} />
                  ) : null}
                </td>
                <td className="px-2 py-2 text-right font-mono whitespace-nowrap tabular-nums">
                  {p.kills} / {p.deaths} / {p.assists}
                </td>
                <td className="px-2 py-2 text-right font-mono whitespace-nowrap tabular-nums">
                  {p.finalHits}
                </td>
                <td className="px-2 py-2 text-right font-mono whitespace-nowrap tabular-nums">
                  {number.format(p.damage)}
                </td>
                <td className="px-2 py-2 text-right font-mono whitespace-nowrap tabular-nums">
                  {number.format(p.damageTaken)}
                </td>
                <td className="px-2 py-2 text-right font-mono whitespace-nowrap tabular-nums">
                  {number.format(p.healing)}
                </td>
                {!combined && (
                  <td className="px-3 py-2 text-right font-mono whitespace-nowrap tabular-nums">
                    {p.accuracy === null ? "–" : `${Math.round(p.accuracy)}%`}
                  </td>
                )}
                <td className="px-1 py-2 text-right">
                  <RankedLookup name={p.name} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function asRows(team: TeamMapStats): Row[] {
  return team.players.map((p) => ({ ...p, mvpCount: p.isMvp ? 1 : 0, svpCount: p.isSvp ? 1 : 0 }));
}

/**
 * A lookup, not a link to a profile: mrvl names aren't tied to ranked accounts, and names repeat.
 * It opens the player search prefilled, so the reader decides whether to search.
 */
function RankedLookup({ name }: { name: string }) {
  const query = searchableName(name);

  if (!query) return null;

  return (
    <Link
      href={`/players?name=${encodeURIComponent(query)}`}
      aria-label={`Look up ${name} among ranked players`}
      title="Look up this name among ranked players"
      className="inline-flex size-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      <UserSearch className="size-3.5" aria-hidden />
    </Link>
  );
}

export function StatsPanel({
  match,
  view,
  stats,
  snapshot,
}: {
  match: Match;
  view: MatchView;
  stats: MatchStats | null;
  snapshot: Snapshot;
}) {
  return (
    <section aria-labelledby="stats-heading" className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="stats-heading" className="flex items-center gap-2 text-lg font-semibold">
          <BarChart3 className="size-4 text-primary" aria-hidden /> Player stats
        </h2>
        {view.revealed && stats && (
          <a
            href={`https://www.mrvl.net/matches/${stats.sourceMatchId}`}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-muted-foreground underline hover:text-foreground"
          >
            Stats via mrvl.net<span className="sr-only"> (opens in a new tab)</span>
          </a>
        )}
      </div>
      {!view.revealed ? (
        <p className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
          Stats are hidden while Hide spoilers is on.
        </p>
      ) : !stats || stats.maps.length === 0 ? (
        <p className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
          MVP, SVP, heroes and player stats appear a minute or two after each map ends.
        </p>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            Names come from mrvl.net and aren&apos;t tied to ranked accounts, so one name can belong
            to several players.{" "}
            <UserSearch className="inline size-3.5 align-text-bottom" aria-hidden /> looks a name up
            on Players.
          </p>
          <Tabs defaultValue="all" variant="underline">
            <div className="-mx-4 overflow-x-auto px-4 scrollbar-none sm:mx-0 sm:px-0">
              <TabsList aria-label="Map">
                <TabsTrigger value="all" className="whitespace-nowrap">
                  All maps
                </TabsTrigger>
                {stats.maps.map((m) => (
                  <TabsTrigger key={m.index} value={String(m.index)} className="whitespace-nowrap">
                    Map {m.index} · {m.map}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
            <TabsContent value="all">
              <div className="space-y-6">
                {([0, 1] as const).map((side) => (
                  <StatsTable
                    key={side}
                    team={side === 0 ? match.team1 : match.team2}
                    rows={combine(stats.maps.map((m) => m.teams[side]))}
                    bans={[]}
                    snapshot={snapshot}
                    combined
                  />
                ))}
              </div>
            </TabsContent>
            {stats.maps.map((m) => (
              <TabsContent key={m.index} value={String(m.index)}>
                <div className="space-y-6">
                  {([0, 1] as const).map((side) => (
                    <StatsTable
                      key={side}
                      team={side === 0 ? match.team1 : match.team2}
                      rows={asRows(m.teams[side])}
                      bans={m.teams[side].bans}
                      snapshot={snapshot}
                      combined={false}
                    />
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </>
      )}
    </section>
  );
}
