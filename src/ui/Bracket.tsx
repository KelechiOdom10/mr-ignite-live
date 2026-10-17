import type { SlotFeeders } from "@/domain/matchView";
import type { IgniteEvent, Match, Snapshot } from "@/domain/model";

import { MatchCard } from "./MatchCard";

function bracketKey(id: string): [number, number] {
  const m = /_R(\d+)M(\d+)$/.exec(id);
  return m ? [Number(m[1]), Number(m[2])] : [Number.MAX_SAFE_INTEGER, 0];
}

export function roundsOf(matches: Match[]): { name: string; matches: Match[] }[] {
  const sorted = matches.toSorted((a, b) => {
    const [ra, ma] = bracketKey(a.id);
    const [rb, mb] = bracketKey(b.id);
    return ra - rb || ma - mb;
  });
  const rounds = new Map<string, Match[]>();
  for (const m of sorted) rounds.set(m.round, [...(rounds.get(m.round) ?? []), m]);
  return [...rounds].map(([name, ms]) => ({ name, matches: ms }));
}

export function Bracket({
  title,
  matches,
  event,
  snapshot,
  now,
  feeders,
}: {
  title: string;
  matches: Match[];
  event: IgniteEvent | undefined;
  snapshot: Snapshot;
  now: number;
  feeders: ReadonlyMap<string, SlotFeeders>;
}) {
  const rounds = roundsOf(matches);
  if (rounds.length === 0) return null;
  return (
    <section aria-label={title} className="space-y-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        <ol className="flex min-w-max gap-4">
          {rounds.map((round) => (
            <li key={round.name} className="flex w-64 flex-col">
              <h3 className="mb-3 text-xs font-medium text-muted-foreground">{round.name}</h3>
              <ul className="flex flex-1 flex-col justify-around gap-3">
                {round.matches.map((m) => (
                  <li key={m.id}>
                    <MatchCard
                      match={m}
                      event={event}
                      snapshot={snapshot}
                      now={now}
                      footer="none"
                      feeders={feeders.get(m.id)}
                    />
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
