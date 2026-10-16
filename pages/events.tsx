import { EventCard } from "@/ui/EventCard";
import { AppShell } from "@/ui/AppShell";
import { useLiveSnapshot } from "@/ui/useLiveSnapshot";
import type { Props } from "./events.server";

export default function EventsPage({ snapshot: initial }: Props) {
  const { snapshot, connection, now } = useLiveSnapshot(initial);
  const byStage = new Map<string, typeof snapshot.events>();
  for (const e of snapshot.events) byStage.set(e.stage, [...(byStage.get(e.stage) ?? []), e]);
  return (
    <AppShell snapshot={snapshot} connection={connection} now={now}>
      <h1 className="mb-8 font-display text-4xl font-extrabold uppercase tracking-tight">Ignite 2026 events</h1>
      <div className="space-y-10">
        {[...byStage].map(([stage, events]) => (
          <section key={stage} className="space-y-3">
            <h2 className="font-display text-xl font-bold uppercase text-muted-foreground">{stage}</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {events.map((e) => (
                <EventCard key={e.id} event={e} matches={snapshot.matches.filter((m) => m.eventId === e.id)} now={now} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </AppShell>
  );
}
