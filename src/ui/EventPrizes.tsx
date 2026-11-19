import type { Snapshot, SnapshotEvent, Team } from "@/domain/model";

import { useSpoilersHidden } from "./spoilers";
import { TeamLogo } from "./TeamMark";

function usd(amount: number): string {
  return `$${amount.toLocaleString("en-US")}`;
}

export function PrizeDistribution({
  event,
  snapshot,
}: {
  event: SnapshotEvent;
  snapshot: Snapshot;
}) {
  const hidden = useSpoilersHidden();

  if (event.prizes.length === 0) return null;

  return (
    <section aria-labelledby="prize-distribution" className="space-y-3">
      <h2 id="prize-distribution" className="text-lg font-semibold">
        Prize distribution
      </h2>
      {hidden && (
        <p className="text-sm text-muted-foreground">
          Placings are hidden while Hide spoilers is on.
        </p>
      )}
      <div className="overflow-hidden rounded-xl border">
        <table className="w-full table-fixed text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th scope="col" className="w-14 px-3 py-2 text-left font-medium">
                Place
              </th>
              <th scope="col" className="px-3 py-2 text-left font-medium">
                Team
              </th>
              <th scope="col" className="w-24 px-3 py-2 text-right font-medium">
                Prize
              </th>
            </tr>
          </thead>
          <tbody>
            {event.prizes.map((prize) => (
              <tr key={prize.place} className="border-t">
                <td className="px-3 py-2 tabular-nums">{prize.place}</td>
                <td className="px-3 py-2">
                  {hidden ? (
                    <span className="text-muted-foreground">Hidden</span>
                  ) : (
                    <div className="flex min-w-0 items-center gap-2">
                      <TeamLogo
                        team={prize.team}
                        info={prize.team ? snapshot.teams[prize.team.name] : undefined}
                        size={20}
                      />
                      <span className="truncate" title={prize.team?.name}>
                        {prize.team?.name ?? "TBD"}
                      </span>
                    </div>
                  )}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{usd(prize.prizeUsd)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {event.prizesFromBracket && (
        <p className="text-xs text-muted-foreground">
          Some places weren&apos;t listed in the prize pool, so we filled them in from the playoff
          results.
        </p>
      )}
    </section>
  );
}

export function EventParticipants({ teams, snapshot }: { teams: Team[]; snapshot: Snapshot }) {
  if (teams.length === 0) return null;

  return (
    <section aria-labelledby="participants" className="space-y-3">
      <h2 id="participants" className="text-lg font-semibold">
        Participants
      </h2>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {teams.map((team) => (
          <li
            key={team.name}
            className="flex min-w-0 items-center gap-2.5 rounded-xl border bg-card px-3 py-2"
          >
            <TeamLogo team={team} info={snapshot.teams[team.name]} size={22} />
            <span className="truncate text-sm" title={team.name}>
              {team.name}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
