import { Form, useForm } from "@void/react";
import { RefreshCw, Star } from "lucide-react";

import {
  MIN_MATCHES_FOR_WIN_RATE,
  seasonRecord,
  type Freshness as FreshnessData,
  type PlayerProfile,
  type SeasonRecord,
  type Uid,
} from "@/domain/player";
import { cn } from "@/lib/utils";

import { Freshness } from "./Freshness";
import { PlayerAvatar } from "./PlayerAvatar";
import { RankBadge } from "./RankBadge";

export function FavouriteButton({
  uid,
  name,
  isFavourite,
}: {
  uid: Uid;
  name: string;
  isFavourite: boolean;
}) {
  const form = useForm(
    "/player/:uid",
    isFavourite ? { intent: "unfavourite" } : { intent: "favourite", name },
    { params: { uid } },
  );
  return (
    <Form form={form}>
      <button
        type="submit"
        disabled={form.pending}
        className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm transition-colors hover:bg-accent disabled:opacity-60"
      >
        <Star className={cn("size-4", isFavourite && "fill-primary text-primary")} aria-hidden />
        {isFavourite ? "Favourite" : "Add to favourites"}
      </button>
    </Form>
  );
}

export function RefreshButton({
  uid,
  category,
  page,
  cost,
}: {
  uid: Uid;
  category: "competitive" | "all";
  page: number;
  cost: number;
}) {
  const form = useForm("/player/:uid", { intent: "refresh", category, page }, { params: { uid } });
  return (
    <Form form={form} className="flex flex-col items-end gap-1">
      <button
        type="submit"
        disabled={form.pending}
        className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm transition-colors hover:bg-accent disabled:opacity-60"
      >
        <RefreshCw className={cn("size-4", form.pending && "animate-spin")} aria-hidden />
        Refresh · {cost} credits
      </button>
      {form.errors.intent && (
        <p role="alert" className="text-xs text-live">
          {form.errors.intent}
        </p>
      )}
    </Form>
  );
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "es"}`;
}

/** This season only: the career tiles cover every season, and history can span a reset. */
function SeasonSummary({ record }: { record: SeasonRecord }) {
  if (record.kind === "unknown") {
    return record.season ? (
      <span className="text-muted-foreground">Season {record.season}</span>
    ) : null;
  }
  const label = <span className="text-foreground">Ranked this season ({record.season})</span>;
  if (record.kind === "none") {
    return <span className="text-muted-foreground">{label}: no matches yet</span>;
  }
  if (record.kind === "few") {
    return (
      <span className="text-muted-foreground">
        {label}: {record.wins}W of {plural(record.matches, "match")} · too few for a win rate (needs{" "}
        {MIN_MATCHES_FOR_WIN_RATE})
      </span>
    );
  }
  return (
    <span className="text-muted-foreground">
      {label}: {record.wins}W of {plural(record.matches, "match")} (
      {Math.round(record.winRate * 100)}%)
    </span>
  );
}

export function PlayerHeader({
  profile,
  freshness,
  now,
  actions,
}: {
  profile: PlayerProfile;
  freshness: FreshnessData;
  now: number;
  actions: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 items-center gap-4">
        <PlayerAvatar iconUrl={profile.iconUrl} name={profile.name} size={64} />
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight">
            {profile.club && <span className="mr-2 text-muted-foreground">[{profile.club}]</span>}
            {profile.name}
          </h1>
          <p className="mt-0.5 font-mono text-xs text-muted-foreground">
            UID {profile.uid}
            {profile.level !== null && ` · Level ${profile.level}`}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <RankBadge rank={profile.rank} />
            {profile.peakRank.name && (
              <span className="text-muted-foreground">
                Peak <RankBadge rank={profile.peakRank} className="ml-1" />
              </span>
            )}
            <SeasonSummary record={seasonRecord(profile)} />
          </div>
          <div className="mt-1">
            <Freshness freshness={freshness} now={now} />
          </div>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-start gap-2">{actions}</div>
    </header>
  );
}
