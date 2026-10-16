import { KnockoutBracket, type Round } from "@/components/motion/knockout-bracket";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/motion/tabs";
import { matchState, type Match, type Snapshot } from "@/data/model";
import { AppShell } from "@/ui/AppShell";
import { logoUrl } from "@/ui/TeamMark";
import { MatchRow } from "@/ui/MatchViews";
import { formatDay, groupByDay, useHydrated } from "@/ui/time";
import { useLiveSnapshot } from "@/ui/useLiveSnapshot";
import type { Props } from "./[...slug].server";

function bracketKey(id: string): [number, number] {
  const m = /_R(\d+)M(\d+)$/.exec(id);
  return m ? [Number(m[1]), Number(m[2])] : [99, 99];
}

function roundsOf(matches: Match[]): [string, Match[]][] {
  const sorted = [...matches].sort((a, b) => {
    const [ra, ma] = bracketKey(a.id);
    const [rb, mb] = bracketKey(b.id);
    return ra - rb || ma - mb;
  });
  const rounds = new Map<string, Match[]>();
  for (const m of sorted) rounds.set(m.round, [...(rounds.get(m.round) ?? []), m]);
  return [...rounds];
}

function toBracketRounds(
  rounds: [string, Match[]][],
  snapshot: Snapshot,
  now: number,
  hydrated: boolean,
): Round[] {
  return rounds.map(([name, matches]) => ({
    name,
    matches: matches.map((m) => {
      const s = matchState(m, now);
      const side = (team: Match["team1"], score: number) => ({
        team: team
          ? { name: team.short, logo: logoUrl(snapshot.teams[team.name]) }
          : null,
        score: s.status === "upcoming" ? null : score,
      });
      return {
        id: m.id,
        date: hydrated && m.startsAt ? formatDay(m.startsAt, now) : undefined,
        status: s.status === "finished" ? "finished" : "upcoming",
        home: side(m.team1, s.wins1),
        away: side(m.team2, s.wins2),
        winner: s.winner === 1 ? "home" : s.winner === 2 ? "away" : undefined,
        badge: s.status === "live" ? "LIVE" : `BO${m.bestOf}`,
      };
    }),
  }));
}

function isHalving(rounds: [string, Match[]][]): boolean {
  return (
    rounds.length > 1 &&
    rounds.every(([, ms], i) => i === 0 || ms.length * 2 === rounds[i - 1]![1].length)
  );
}

function RoundColumns({
  rounds,
  snapshot,
  now,
}: {
  rounds: [string, Match[]][];
  snapshot: Snapshot;
  now: number;
}) {
  return (
    <div className="space-y-6">
      {rounds.map(([name, matches]) => (
        <div key={name} className="space-y-1">
          <h3 className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {name}
          </h3>
          {matches.map((m) => (
            <MatchRow key={m.id} match={m} snapshot={snapshot} now={now} showEvent={false} />
          ))}
        </div>
      ))}
    </div>
  );
}

export default function EventPage({ snapshot: initial, eventId }: Props) {
  const { snapshot, connection, now } = useLiveSnapshot(initial, eventId);
  const hydrated = useHydrated();
  const event = snapshot.events.find((e) => e.id === eventId);
  const playoffs = snapshot.matches.filter((m) => m.phase === "Playoffs");
  const groups = snapshot.matches.filter((m) => m.phase !== "Playoffs");
  const upper = roundsOf(playoffs.filter((m) => /upper/i.test(m.round)));
  const lower = roundsOf(playoffs.filter((m) => /lower/i.test(m.round)));
  const other = roundsOf(playoffs.filter((m) => !/upper|lower/i.test(m.round)));
  const defaultTab = playoffs.some((m) => m.team1 || m.team2) ? "playoffs" : "groups";

  return (
    <AppShell snapshot={snapshot} connection={connection} now={now}>
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          {event?.region}
        </p>
        <h1 className="font-display text-4xl font-extrabold uppercase leading-none tracking-tight">
          {event?.name}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {event?.startDate} → {event?.endDate}
          {event?.prizePoolUsd
            ? ` · $${event.prizePoolUsd.toLocaleString("en-US")} prize pool`
            : ""}{" "}
          ·{" "}
          <a
            href={event?.liquipediaUrl}
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-foreground"
          >
            Liquipedia
          </a>
        </p>
      </div>

      <Tabs defaultValue={defaultTab}>
        <TabsList aria-label="Phase" className="mb-6">
          {playoffs.length > 0 && <TabsTrigger value="playoffs">Playoffs</TabsTrigger>}
          {groups.length > 0 && <TabsTrigger value="groups">Group stage</TabsTrigger>}
        </TabsList>

        <TabsContent value="playoffs">
          <div className="space-y-10">
            {upper.length > 0 && (
              <section className="space-y-3">
                <h2 className="font-display text-xl font-bold uppercase">Upper bracket</h2>
                {isHalving(upper) ? (
                  <KnockoutBracket rounds={toBracketRounds(upper, snapshot, now, hydrated)} />
                ) : (
                  <RoundColumns rounds={upper} snapshot={snapshot} now={now} />
                )}
              </section>
            )}
            {lower.length > 0 && (
              <section className="space-y-3">
                <h2 className="font-display text-xl font-bold uppercase">Lower bracket</h2>
                <RoundColumns rounds={lower} snapshot={snapshot} now={now} />
              </section>
            )}
            {other.length > 0 && (
              <section className="space-y-3">
                <h2 className="font-display text-xl font-bold uppercase">Finals</h2>
                <RoundColumns rounds={other} snapshot={snapshot} now={now} />
              </section>
            )}
          </div>
        </TabsContent>

        <TabsContent value="groups">
          <div className="space-y-6">
            {groupByDay(groups, (m) => m.startsAt, now, hydrated).map(([day, matches]) => (
              <div key={day} className="space-y-1">
                <h3 className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {hydrated ? day : ""} · {matches[0]?.round}
                </h3>
                {matches.map((m) => (
                  <MatchRow key={m.id} match={m} snapshot={snapshot} now={now} showEvent={false} />
                ))}
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
