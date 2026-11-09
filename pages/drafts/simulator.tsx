import { AppShell } from "@/ui/AppShell";
import { DraftSimulator } from "@/ui/drafts/DraftSimulator";
import { useLiveSnapshot } from "@/ui/useLiveSnapshot";

import type { Props } from "./simulator.server";

export default function DraftSimulatorPage({
  snapshot: initial,
  formatId,
  formats,
  heroes,
  rates,
  proDrafts,
  heroMatrix,
  map,
  maps,
}: Props) {
  const { snapshot, connection, now } = useLiveSnapshot(initial, { view: "events" });

  return (
    <AppShell snapshot={snapshot} connection={connection} now={now}>
      <a href="/drafts" className="text-sm text-muted-foreground hover:text-foreground">
        ← Drafts
      </a>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Draft simulator</h1>
      <p className="mt-1 max-w-prose text-sm text-muted-foreground">
        Play both sides of a draft. Bans and protects follow the selected format&apos;s rules.
        Nothing here predicts who wins.
      </p>
      <div className="mt-6">
        <DraftSimulator
          formatId={formatId}
          formats={formats}
          heroes={heroes}
          rates={rates}
          proDrafts={proDrafts}
          heroMatrix={heroMatrix}
          map={map}
          maps={maps}
        />
      </div>
    </AppShell>
  );
}
