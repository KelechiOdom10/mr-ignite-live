import { AppShell } from "@/ui/AppShell";
import { ReviewWorkspace } from "@/ui/review/ReviewWorkspace";
import { useLiveSnapshot } from "@/ui/useLiveSnapshot";

import type { Props } from "./review.server";

export default function ReviewPage({ snapshot: initial }: Props) {
  const { snapshot, connection, now } = useLiveSnapshot(initial, { view: "events" });
  return (
    <AppShell snapshot={snapshot} connection={connection} now={now}>
      <h1 className="text-2xl font-semibold tracking-tight">Review</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        Go through your own recordings. Mark deaths and fights, say what you think decided them, and
        track one thing you're practising. Footage and notes stay in this browser.
      </p>
      <div className="mt-6">
        <ReviewWorkspace />
      </div>
    </AppShell>
  );
}
