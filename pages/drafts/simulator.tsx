import { AppShell } from "@/ui/AppShell";
import { DraftSimulator } from "@/ui/drafts/DraftSimulator";
import { useLiveSnapshot } from "@/ui/useLiveSnapshot";

import type { Props } from "./simulator.server";

export default function DraftSimulatorPage({ snapshot: initial, format, heroes }: Props) {
  const { snapshot, connection, now } = useLiveSnapshot(initial, { view: "events" });
  return (
    <AppShell snapshot={snapshot} connection={connection} now={now}>
      <a href="/drafts" className="text-sm text-muted-foreground hover:text-foreground">
        ← Drafts
      </a>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Draft simulator</h1>
      <p className="mt-1 max-w-prose text-sm text-muted-foreground">
        Step through an Ignite 2026 tournament draft by hand. A ban stops only the other team
        playing that hero, and a protect stops the other team banning it. Nothing here predicts who
        wins.
      </p>
      <div className="mt-6">
        <DraftSimulator format={format} heroes={heroes} />
      </div>
      <p className="mt-6 max-w-prose text-xs text-muted-foreground">{format.basis}</p>
    </AppShell>
  );
}
