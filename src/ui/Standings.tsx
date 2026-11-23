import { ChevronDown } from "lucide-react";
import { useState } from "react";

import { Tabs, TabsList, TabsTrigger } from "@/components/motion/tabs";
import type { Snapshot } from "@/domain/model";
import { cutoffAfter, type GroupTable, selectedGroup, type StandingRow } from "@/domain/standings";
import { cn } from "@/lib/utils";

import { useSpoilersHidden } from "./spoilers";
import { LiveDot } from "./StatusLabel";
import { TeamLogo } from "./TeamMark";

function domId(...parts: string[]): string {
  return parts.join("-").replace(/\W+/g, "-");
}

function signed(n: number): string {
  if (n === 0) return "0";

  return n > 0 ? `+${n}` : `−${Math.abs(n)}`;
}

function listNames(names: string[]): string {
  return names.length > 2
    ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`
    : names.join(" and ");
}

function levelTeams(rows: StandingRow[]): string[] {
  const places = [...new Set(rows.flatMap((r) => (r.tiedWith.length > 0 ? [r.place] : [])))];

  return places.map((place) => {
    const level = rows.filter((r) => r.place === place);
    const round = level[0]?.tiebreakRound;

    return `${listNames(level.map((r) => r.team.name))}${round ? ` (meet on ${round})` : ""}`;
  });
}

const HEAD = "px-2 py-2 text-right font-mono text-xs font-normal text-muted-foreground";

function Row({
  row,
  snapshot,
  compact,
}: {
  row: StandingRow;
  snapshot: Snapshot;
  compact: boolean;
}) {
  return (
    <tr className="border-t">
      <td className="w-8 py-2 pl-3 text-left font-mono text-xs text-muted-foreground tabular-nums">
        {row.place}
      </td>
      <td className="min-w-0 px-2 py-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <TeamLogo team={row.team} info={snapshot.teams[row.team.name]} size={24} />
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-1.5 text-sm font-medium">
              <span className="truncate" title={row.team.name}>
                {row.team.name}
              </span>
              {row.live && (
                <>
                  <LiveDot className="shrink-0" />
                  <span className="sr-only">playing now</span>
                </>
              )}
            </div>
            {row.status && (
              <div
                className={cn(
                  "text-xs font-medium",
                  row.status === "through" ? "text-win" : "text-muted-foreground",
                )}
              >
                {row.status === "through" ? "Through" : "Out"}
              </div>
            )}
          </div>
        </div>
      </td>
      <td className="px-2 py-2 text-right font-mono text-sm tabular-nums">
        {row.seriesWins}-{row.seriesLosses}
      </td>
      {!compact && (
        <td className="px-2 py-2 text-right font-mono text-sm tabular-nums">
          {row.mapWins}-{row.mapLosses}
        </td>
      )}
      <td className="py-2 pr-3 pl-2 text-right font-mono text-sm text-muted-foreground tabular-nums">
        {signed(row.mapDiff)}
      </td>
    </tr>
  );
}

export function GroupTableCard({
  table,
  snapshot,
  compact = false,
}: {
  table: GroupTable;
  snapshot: Snapshot;
  compact?: boolean;
}) {
  const { group, rows } = table;
  const cutoff = cutoffAfter(table);

  const levelAtCutoff =
    table.cutoffTied && rows.some((r) => r.seriesWins + r.seriesLosses > 0)
      ? listNames(
          rows.filter((r) => r.place === rows[group.advance - 1]?.place).map((r) => r.team.name),
        )
      : null;

  const decided = rows.some((r) => r.status);
  const level = levelTeams(rows);
  const columns = compact ? 4 : 5;

  if (!table.supported) {
    return (
      <section
        aria-labelledby={domId("standings", group.title)}
        className="rounded-xl border bg-card px-3 py-3"
      >
        <h3 id={domId("standings", group.title)} className="text-base font-semibold">
          {group.title}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          This group is ranked by rules we don't follow, so there is no table. Its results are in
          the match list.
        </p>
      </section>
    );
  }

  return (
    <section
      aria-labelledby={domId("standings", group.title)}
      className="rounded-xl border bg-card"
    >
      <div className="flex items-baseline justify-between gap-3 px-3 pt-3 pb-2">
        <h3 id={domId("standings", group.title)} className="text-base font-semibold">
          {group.title}
        </h3>
        {!decided && <p className="text-xs text-muted-foreground">Nobody is through or out yet</p>}
      </div>
      <table className="w-full table-fixed text-sm">
        <caption className="sr-only">{group.title} standings</caption>
        <colgroup>
          <col className="w-8" />
          <col />
          <col className="w-12" />
          {!compact && <col className="w-12" />}
          <col className="w-12" />
        </colgroup>
        <thead>
          <tr>
            <th
              scope="col"
              className="py-2 pl-3 text-left font-mono text-xs font-normal text-muted-foreground"
            >
              <span aria-hidden>#</span>
              <span className="sr-only">Place</span>
            </th>
            <th
              scope="col"
              className="px-2 py-2 text-left text-xs font-normal text-muted-foreground"
            >
              Team
            </th>
            <th scope="col" className={HEAD}>
              Series
            </th>
            {!compact && (
              <th scope="col" className={HEAD}>
                Maps
              </th>
            )}
            <th scope="col" className={cn(HEAD, "pr-3")}>
              Diff
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.flatMap((row, i) => [
            <Row key={row.team.name} row={row} snapshot={snapshot} compact={compact} />,
            i === (cutoff ?? 0) - 1 ? (
              <tr key="cut" className="border-t border-dashed">
                <td colSpan={columns} className="py-1.5 text-center text-xs text-muted-foreground">
                  Top {group.advance} go through
                </td>
              </tr>
            ) : null,
          ])}
        </tbody>
      </table>
      {(level.length > 0 || levelAtCutoff || !compact) && (
        <div className="space-y-2 border-t px-3 py-3 text-xs text-muted-foreground">
          {levelAtCutoff && (
            <p className="text-foreground">
              Top {group.advance} go through, but {levelAtCutoff} are level for the last place, so
              there is no line yet.
            </p>
          )}
          {level.length > 0 && <p>Level on series and maps: {level.join(", ")}.</p>}
          {!compact && (
            <details className="group">
              <summary className="-mx-3 flex min-h-11 cursor-pointer list-none items-center px-3 text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring">
                How ties are broken
                <ChevronDown
                  aria-hidden
                  className="ml-auto size-4 text-muted-foreground transition-transform group-open:rotate-180"
                />
              </summary>
              <p className="pb-1">
                Teams are ranked by series won, then fewest series lost. Teams still level are split
                by the series they played against each other, then by map difference (maps won minus
                maps lost). Series counts whole matches; Maps counts the individual maps inside
                them.
              </p>
            </details>
          )}
        </div>
      )}
    </section>
  );
}

export function StandingsPanel({
  tables,
  snapshot,
  compact = false,
  className,
}: {
  tables: GroupTable[];
  snapshot: Snapshot;
  compact?: boolean;
  className?: string;
}) {
  const hidden = useSpoilersHidden();
  const [picked, setPicked] = useState<string | null>(null);
  const selected = selectedGroup(picked, tables);

  if (tables.length === 0) return null;

  if (hidden) {
    return (
      <p
        className={cn(
          "rounded-xl border border-dashed px-4 py-6 text-sm text-muted-foreground",
          className,
        )}
      >
        Standings are hidden while Hide spoilers is on.
      </p>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <Tabs value={selected} onValueChange={setPicked} variant="segment" className="lg:hidden">
        <TabsList
          aria-label="Group"
          className="w-full rounded-xl p-1 ring-1 ring-border ring-inset"
        >
          {tables.map((t) => (
            <TabsTrigger
              key={t.group.title}
              value={t.group.title}
              className="min-h-11 flex-1 rounded-lg focus-visible:outline-solid focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
            >
              {t.group.title}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {tables.map((t) => (
        <div key={t.group.title} className={cn(t.group.title !== selected && "hidden lg:block")}>
          <GroupTableCard table={t} snapshot={snapshot} compact={compact} />
        </div>
      ))}
    </div>
  );
}
