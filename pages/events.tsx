import { AppShell } from "@/ui/AppShell";
import { EventRow } from "@/ui/EventRow";
import { useLiveSnapshot } from "@/ui/useLiveSnapshot";

import type { Props } from "./events.server";

export default function EventsPage({ snapshot: initial }: Props) {
  const { snapshot, connection, now } = useLiveSnapshot(initial);
  const byStage = new Map<string, typeof snapshot.events>();
  for (const e of snapshot.events) byStage.set(e.stage, [...(byStage.get(e.stage) ?? []), e]);
  return (
    <AppShell snapshot={snapshot} connection={connection} now={now}>
      <h1 className="text-2xl font-semibold tracking-tight">Events</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Every Marvel Rivals Ignite 2026 stage and region.
      </p>
      <div className="mt-8 space-y-10">
        {[...byStage].map(([stage, events]) => (
          <section key={stage} aria-label={stage} className="space-y-3">
            <h2 className="text-lg font-semibold">{stage}</h2>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((e) => (
                <EventRow
                  key={e.id}
                  event={e}
                  matches={snapshot.matches.filter((m) => m.eventId === e.id)}
                  now={now}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </AppShell>
  );
}
