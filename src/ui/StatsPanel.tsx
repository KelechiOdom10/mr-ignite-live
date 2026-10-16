import { BarChart3 } from "lucide-react";
import { useEffect, useState } from "react";
import { z } from "zod";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/motion/tabs";
import type { Match, Snapshot } from "@/domain/model";
import {
  MatchStatsSchema,
  type Hero,
  type MatchStats,
  type PlayerStats,
  type TeamMapStats,
} from "@/domain/stats";
import { cn } from "@/lib/utils";

import { useSpoilersHidden } from "./spoilers";
import { TeamLogo } from "./TeamMark";

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

function HeroName({ hero }: { hero: Hero }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span
        aria-hidden
        className={cn("size-1.5 rounded-full", ROLE_DOT[hero.role ?? ""] ?? "bg-muted-foreground")}
      />
      {hero.name}
      {hero.role && <span className="sr-only"> ({hero.role})</span>}
    </span>
  );
}

function Badge({ kind }: { kind: "MVP" | "SVP" }) {
  return (
    <span
      className={cn(
        "rounded px-1.5 py-0.5 text-[0.65rem] font-bold tracking-wide",
        kind === "MVP" ? "bg-primary text-primary-foreground" : "bg-foreground/80 text-background",
      )}
    >
      {kind}
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
          existing ? { ...existing, playSeconds: existing.playSeconds + h.playSeconds } : h,
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
          <span className="text-xs text-muted-foreground">
            Bans: {bans.map((h) => h.name).join(", ")}
          </span>
        )}
      </div>
      <div className="overflow-x-auto rounded-xl border">
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
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((p) => (
              <tr key={p.name} className={cn((p.isMvp || p.mvpCount > 0) && "bg-primary/[0.04]")}>
                <th scope="row" className="px-3 py-2 text-left font-medium">
                  <span className="inline-flex items-center gap-2">
                    {p.name}
                    {combined
                      ? p.mvpCount > 0 && (
                          <span className="text-xs text-primary">{p.mvpCount}× MVP</span>
                        )
                      : (p.isMvp && <Badge kind="MVP" />) || (p.isSvp && <Badge kind="SVP" />)}
                    {combined && p.svpCount > 0 && (
                      <span className="text-xs text-muted-foreground">{p.svpCount}× SVP</span>
                    )}
                  </span>
                </th>
                <td className="px-3 py-2 text-muted-foreground">
                  <span className="flex flex-wrap gap-x-3">
                    {(combined ? p.heroes.slice(0, 3) : p.hero ? [p.hero] : []).map((h) => (
                      <HeroName key={h.id} hero={h} />
                    ))}
                  </span>
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

export function StatsPanel({
  match,
  stats,
  snapshot,
}: {
  match: Match;
  stats: MatchStats | null;
  snapshot: Snapshot;
}) {
  const hidden = useSpoilersHidden();
  return (
    <section aria-labelledby="stats-heading" className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="stats-heading" className="flex items-center gap-2 text-lg font-semibold">
          <BarChart3 className="size-4 text-primary" aria-hidden /> Player stats
        </h2>
        {stats && (
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
      {hidden ? (
        <p className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
          Stats are hidden while Hide spoilers is on.
        </p>
      ) : !stats || stats.maps.length === 0 ? (
        <p className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
          MVP, SVP, heroes and player stats appear a minute or two after each map ends.
        </p>
      ) : (
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
      )}
    </section>
  );
}
