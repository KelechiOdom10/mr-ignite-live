import { AppShell } from "@/ui/AppShell";
import { DraftFilters } from "@/ui/drafts/DraftFilters";
import { DraftSource } from "@/ui/drafts/DraftSource";
import { DraftTable } from "@/ui/drafts/DraftTable";
import { FormatCard } from "@/ui/drafts/FormatCard";
import { ProHeroTable } from "@/ui/drafts/ProHeroTable";
import { useLiveSnapshot } from "@/ui/useLiveSnapshot";

import type { Props } from "./index.server";

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <div className="font-mono text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

export default function DraftsPage({
  snapshot: initial,
  filter,
  options,
  summary,
  coverage,
  formats,
  heroMatrix,
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
          className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Practise a draft
        </a>
      </div>

      <div className="mt-6">
        <DraftFilters options={options} selected={filter} />
      </div>

      {summary.sample.teamDrafts === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          No cached maps match these filters.
        </p>
      ) : (
        <div className="mt-6 flex flex-wrap gap-x-10 gap-y-3">
          <Stat value={summary.sample.maps} label="maps" />
          <Stat value={summary.sample.series} label="series" />
          <Stat value={summary.sample.teamDrafts} label="team drafts (one side of one map)" />
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0">
          {summary.sample.teamDrafts > 0 && (
            <>
              <h2 className="mb-2 text-sm font-medium">Series we synced</h2>
              <DraftTable summary={summary} />
            </>
          )}
          <ProHeroTable stats={heroMatrix} map={filter.map} />
        </div>
        <aside className="grid content-start gap-4 self-start lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto lg:overscroll-contain">
          <DraftSource coverage={coverage} now={now} />
          <FormatCard format={formats.pro} />
          <FormatCard format={formats.ranked} folded />
        </aside>
      </div>
    </AppShell>
  );
}
