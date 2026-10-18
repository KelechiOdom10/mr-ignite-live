import { Link } from "@void/react";
import { BarChart3, UserSearch } from "lucide-react";
import { useEffect, useState } from "react";
import { z } from "zod";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/motion/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/motion/tabs";
import type { MatchView } from "@/domain/matchView";
import type { Match, Snapshot } from "@/domain/model";
import { searchableName } from "@/domain/player";
import {
  addHeroLines,
  MatchStatsSchema,
  type Hero,
  type HeroPlay,
  type MatchStats,
  type PlayerStats,
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

/** One hero's share of a player's map or series, opened from its portrait. */
function HeroBreakdown({
  hero,
  totalSeconds,
  combined,
}: {
  hero: HeroPlay;
  totalSeconds: number;
  combined: boolean;
}) {
  // A series page holds a panel per hero per player; only fill the ones someone has opened.
  const [opened, setOpened] = useState(false);
  const share = totalSeconds > 0 ? Math.round((hero.playSeconds / totalSeconds) * 100) : null;
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
    <Popover
      side="bottom"
      align="center"
      sideOffset={10}
      gooStrength={6}
      onOpenChange={(open) => open && setOpened(true)}
    >
      <PopoverTrigger>
        <button
          type="button"
          aria-label={`${hero.name}: ${formatDuration(hero.playSeconds)} played, show breakdown`}
          className="rounded-md outline-offset-2 transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-primary"
        >
          <HeroPortrait hero={hero} size={26} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-60 p-3 text-sm">
        {opened && (
          <>
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
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

/** Every hero a player used, most played first; each opens its own breakdown. */
function HeroesPlayed({ player, combined }: { player: Row; combined: boolean }) {
  const heroes = player.heroes.toSorted((a, b) => b.playSeconds - a.playSeconds);
  const totalSeconds = heroes.reduce((sum, h) => sum + h.playSeconds, 0);
  return (
    <span className="flex flex-wrap items-center gap-1">
      {heroes.map((h) => (
        <HeroBreakdown key={h.id} hero={h} totalSeconds={totalSeconds} combined={combined} />
      ))}
    </span>
  );
}

interface Row extends PlayerStats {
  mvpCount: number;
  svpCount: number;
}

function combine(teams: TeamMapStats[]): Row[] {
  const byName = new Map<string, Row>();
  for (const team of teams) {
    for (const p of team.players) {
      const prev = byName.get(p.name);
      if (!prev) {
        byName.set(p.name, { ...p, mvpCount: p.isMvp ? 1 : 0, svpCount: p.isSvp ? 1 : 0 });
        continue;
      }
      const heroes = new Map(prev.heroes.map((h) => [h.id, { ...h }]));
      for (const h of p.heroes) {
        const existing = heroes.get(h.id);
        heroes.set(
          h.id,
          existing
            ? {
                ...existing,
                playSeconds: existing.playSeconds + h.playSeconds,
                line: addHeroLines(existing.line, h.line),
              }
            : h,
        );
      }
      byName.set(p.name, {
        ...prev,
        heroes: [...heroes.values()].sort((a, b) => b.playSeconds - a.playSeconds),
        kills: prev.kills + p.kills,
        deaths: prev.deaths + p.deaths,
        assists: prev.assists + p.assists,
        finalHits: prev.finalHits + p.finalHits,
        damage: prev.damage + p.damage,
        damageTaken: prev.damageTaken + p.damageTaken,
        healing: prev.healing + p.healing,
        accuracy: prev.accuracy,
        mvpCount: prev.mvpCount + (p.isMvp ? 1 : 0),
        svpCount: prev.svpCount + (p.isSvp ? 1 : 0),
      });
    }
  }
  return [...byName.values()];
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
