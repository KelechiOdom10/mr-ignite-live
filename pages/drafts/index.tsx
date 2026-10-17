import { AppShell } from "@/ui/AppShell";
import { DraftFilters } from "@/ui/drafts/DraftFilters";
import { DraftSource } from "@/ui/drafts/DraftSource";
import { DraftTable } from "@/ui/drafts/DraftTable";
import { FormatCard } from "@/ui/drafts/FormatCard";
import { useLiveSnapshot } from "@/ui/useLiveSnapshot";

import type { Props } from "./index.server";

export default function DraftsPage({
  snapshot: initial,
  filter,
  options,
  summary,
  coverage,
  formats,
}: Props) {
  const { snapshot, connection, now } = useLiveSnapshot(initial, { view: "events" });
  return (
    <AppShell snapshot={snapshot} connection={connection} now={now}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Drafts</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            What pro teams played, banned and protected on Ignite maps.
          </p>
        </div>
        <a
          href="/drafts/simulator"
          className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-accent"
        >
          Practise a draft
        </a>
      </div>

      <div className="mt-6">
        <DraftFilters options={options} selected={filter} />
      </div>

      <p className="mt-4 text-sm text-muted-foreground">
        {summary.sample.teamDrafts === 0
          ? "No cached maps match these filters."
          : `${summary.sample.maps} maps from ${summary.sample.series} series, ${summary.sample.teamDrafts} team drafts. A team draft is one team's side of one map.`}
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0">
          {summary.sample.teamDrafts > 0 && <DraftTable summary={summary} />}
        </div>
        <aside className="grid content-start gap-4">
          <DraftSource coverage={coverage} now={now} />
          <FormatCard format={formats.pro} />
          <FormatCard format={formats.ranked} />
        </aside>
      </div>
    </AppShell>
  );
}
