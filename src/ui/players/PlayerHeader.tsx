import { Form, useForm } from "@void/react";
import { RefreshCw, Star } from "lucide-react";

import type { Device, Freshness as FreshnessData, PlayerProfile, Uid } from "@/domain/player";
import { cn } from "@/lib/utils";

import { Freshness } from "./Freshness";
import { PlatformIcon, PLATFORM_NAMES } from "./PlatformIcon";
import { PlayerAvatar } from "./PlayerAvatar";

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

export function PlayerHeader({
  profile,
  device,
  freshness,
  now,
  actions,
}: {
  profile: PlayerProfile;
  device: Device | null;
  freshness: FreshnessData;
  now: number;
  actions: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-4">
        <PlayerAvatar
          iconUrl={profile.iconUrl}
          name={profile.name}
          size={56}
          className="rounded-xl"
        />
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight">
            {profile.club && <span className="mr-2 text-muted-foreground">[{profile.club}]</span>}
            {profile.name}
          </h1>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
            <span className="font-mono">UID {profile.uid}</span>
            {profile.level !== null && <span className="font-mono">· Level {profile.level}</span>}
            {device && (
              <span className="inline-flex items-center gap-1">
                · <PlatformIcon device={device} className="size-3" />
                {PLATFORM_NAMES.get(device)}
              </span>
            )}
            <span>
              · <Freshness freshness={freshness} now={now} />
            </span>
          </p>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-start gap-2">{actions}</div>
    </header>
  );
}
