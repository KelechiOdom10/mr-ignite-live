import { Form, useForm } from "@void/react";

import type { Hero, HeroCareer, HeroPlay, Uid } from "@/domain/player";

import { Freshness } from "./Freshness";
import { HeroIcon } from "./HeroIcon";

function hours(seconds: number): string {
  return seconds >= 3600 ? `${(seconds / 3600).toFixed(1)}h` : `${Math.round(seconds / 60)}m`;
}

function LoadHeroCard({ uid, hero, label }: { uid: Uid; hero: Hero; label: string }) {
  const form = useForm("/player/:uid", { intent: "hero", heroId: hero.id }, { params: { uid } });
  return (
    <Form form={form} className="contents">
      <button
        type="submit"
        disabled={form.pending}
        className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline disabled:opacity-60"
      >
        {form.pending ? "Loading…" : label}
      </button>
      {form.errors.intent && (
        <span role="alert" className="text-xs text-live">
          {form.errors.intent}
        </span>
      )}
    </Form>
  );
}

function HeroCard({ card, now }: { card: HeroCareer; now: number }) {
  return (
    <>
      <dl className="grid grid-cols-4 gap-2 text-xs">
        <div>
          <dt className="text-muted-foreground">Matches</dt>
          <dd className="font-mono tabular-nums">{Math.round(card.matches)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Win rate</dt>
          <dd className="font-mono tabular-nums">
            {card.winRate === null ? "–" : `${Math.round(card.winRate * 100)}%`}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">KDA</dt>
          <dd className="font-mono tabular-nums">{card.kda?.toFixed(2) ?? "–"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Time</dt>
          <dd className="font-mono tabular-nums">{hours(card.playSeconds)}</dd>
        </div>
      </dl>
      <Freshness freshness={card.freshness} now={now} />
    </>
  );
}

function HeroRow({
  uid,
  hero,
  label,
  card,
  now,
}: {
  uid: Uid;
  hero: Hero;
  label: string;
  card: HeroCareer | undefined;
  now: number;
}) {
  return (
    <li className="space-y-2 rounded-lg border bg-card p-3">
      <div className="flex items-center gap-3">
        <HeroIcon hero={hero} size={40} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{hero.name}</p>
          <p className="text-xs text-muted-foreground">
            {[hero.role, label].filter(Boolean).join(" · ")}
          </p>
        </div>
        {!card && <LoadHeroCard uid={uid} hero={hero} label="Hero stats · 10 credits" />}
        {card?.freshness.stale && (
          <LoadHeroCard uid={uid} hero={hero} label="Refresh · 10 credits" />
        )}
      </div>
      {card && <HeroCard card={card} now={now} />}
    </li>
  );
}

export function HeroesPanel({
  uid,
  signature,
  recent,
  coveredMatches,
  cards,
  now,
}: {
  uid: Uid;
  signature: Hero | null;
  recent: HeroPlay[];
  coveredMatches: number;
  cards: HeroCareer[];
  now: number;
}) {
  const cardFor = (id: number) => cards.find((c) => c.hero.id === id);
  const others = recent.filter((h) => h.id !== signature?.id);
  return (
    <section aria-labelledby="heroes" className="space-y-2">
      <h2 id="heroes" className="text-sm font-semibold text-muted-foreground">
        Heroes
      </h2>
      <ul className="space-y-2">
        {signature && (
          <HeroRow
            uid={uid}
            hero={signature}
            label="Signature hero"
            card={cardFor(signature.id)}
            now={now}
          />
        )}
        {others.map((h) => (
          <HeroRow
            key={h.id}
            uid={uid}
            hero={h}
            label={`${hours(h.playSeconds)} recently`}
            card={cardFor(h.id)}
            now={now}
          />
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">
        {coveredMatches > 0
          ? `Recent heroes come from ${coveredMatches} opened ${coveredMatches === 1 ? "match" : "matches"}.`
          : "Open a match to see which heroes this player used. RivalsIsland has no free hero ranking."}
      </p>
    </section>
  );
}
