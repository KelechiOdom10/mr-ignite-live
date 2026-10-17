import { Link } from "@void/react";

import type { MatchDetail, MatchPlayer } from "@/domain/player";
import { cn } from "@/lib/utils";

import { AwardBadge } from "../AwardBadge";
import { HeroIcon } from "./HeroIcon";

function compact(n: number): string {
  return new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(
    n,
  );
}

function PlayerRow({ p }: { p: MatchPlayer }) {
  const [main, ...others] = p.heroes;
  return (
    <tr className="align-middle">
      <td className="py-2 pr-2 pl-3">
        <div className="flex items-center gap-2">
          {main && <HeroIcon hero={main} size={32} />}
          <div className="min-w-0">
            {p.uid ? (
              <Link
                href={`/player/${p.uid}`}
                className="block truncate font-medium hover:underline"
              >
                {p.name}
              </Link>
            ) : (
              <span className="block truncate font-medium text-muted-foreground">{p.name}</span>
            )}
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              {main?.name}
              {others.length > 0 && ` +${others.length}`}
              {p.leftGame && " · left"}
            </span>
          </div>
          <div className="ml-auto flex gap-1">
            {p.mvp && <AwardBadge award="MVP" />}
            {p.svp && <AwardBadge award="SVP" />}
          </div>
        </div>
      </td>
      <td className="px-2 py-2 text-right font-mono whitespace-nowrap tabular-nums">
        {p.kills}/{p.deaths}/{p.assists}
      </td>
      <td className="hidden px-2 py-2 text-right font-mono tabular-nums sm:table-cell">
        {compact(p.damage)}
      </td>
      <td className="hidden px-2 py-2 text-right font-mono tabular-nums sm:table-cell">
        {compact(p.healing)}
      </td>
      <td className="hidden py-2 pr-3 pl-2 text-right font-mono tabular-nums md:table-cell">
        {compact(p.damageTaken)}
      </td>
    </tr>
  );
}

export function MatchTeams({ match }: { match: MatchDetail }) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {match.teams.map((team, i) => (
        <section
          key={team.id}
          aria-label={`Team ${i + 1}`}
          className="overflow-hidden rounded-lg border"
        >
          <header
            className={cn(
              "flex items-center justify-between px-3 py-2 text-sm font-semibold",
              team.result === "win" ? "bg-win/10 text-win" : "bg-card text-muted-foreground",
            )}
          >
            <span>
              {team.result === "win" ? "Victory" : team.result === "loss" ? "Defeat" : "Draw"}
            </span>
            <span className="font-mono text-base tabular-nums">{team.score ?? "–"}</span>
          </header>
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th scope="col" className="py-1.5 pl-3 text-left font-medium">
                  Player
                </th>
                <th scope="col" className="px-2 py-1.5 text-right font-medium">
                  K/D/A
                </th>
                <th scope="col" className="hidden px-2 py-1.5 text-right font-medium sm:table-cell">
                  Damage
                </th>
                <th scope="col" className="hidden px-2 py-1.5 text-right font-medium sm:table-cell">
                  Healing
                </th>
                <th scope="col" className="hidden py-1.5 pr-3 text-right font-medium md:table-cell">
                  Taken
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {team.players.map((p) => (
                <PlayerRow key={`${p.uid ?? p.name}`} p={p} />
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}

export function DraftStrip({ match }: { match: MatchDetail }) {
  if (match.draft.length === 0) return null;
  return (
    <ol className="flex flex-wrap gap-2" aria-label="Draft">
      {match.draft.map((d) =>
        d.hero ? (
          <li
            key={`${d.round}-${d.teamId}-${d.action}`}
            className="flex items-center gap-2 rounded-md border bg-card px-2 py-1 text-xs"
          >
            <HeroIcon hero={d.hero} size={20} className={cn(d.action === "ban" && "grayscale")} />
            <span>
              <span className={d.action === "ban" ? "text-live" : "text-win"}>
                {d.action === "ban" ? "Ban" : "Pick"}
              </span>{" "}
              {d.hero.name}
            </span>
          </li>
        ) : null,
      )}
    </ol>
  );
}
