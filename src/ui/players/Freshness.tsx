import type { Freshness as FreshnessData } from "@/domain/player";

import { formatRelative, useHydrated } from "../time";

export function Freshness({ freshness, now }: { freshness: FreshnessData; now: number }) {
  const hydrated = useHydrated();
  const age = hydrated ? formatRelative(new Date(freshness.fetchedAt).toISOString(), now) : null;

  return (
    <span className="text-xs text-muted-foreground">
      {age ? `Updated ${age}` : "Saved earlier"}
      {freshness.stale && " · may be out of date"}
    </span>
  );
}
