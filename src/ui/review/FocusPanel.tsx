import { Target } from "lucide-react";
import { useId, useState, type FormEvent } from "react";

import {
  DEATH_FACTORS,
  DeathFactorSchema,
  focusProgress,
  type DeathFactor,
  type FactorCount,
  type PracticeFocus,
  type ReviewLibrary,
} from "@/domain/review";

function describe(count: FactorCount, factor: DeathFactor | null): string {
  const sessions = `${count.sessions} ${count.sessions === 1 ? "review" : "reviews"}`;
  if (count.deaths === 0) return `No deaths marked (${sessions})`;
  if (factor === null) return `${count.deaths} deaths marked (${sessions})`;
  return `${count.matching} of ${count.deaths} deaths (${sessions})`;
}

function FocusCard({
  focus,
  library,
  onSave,
}: {
  focus: PracticeFocus;
  library: ReviewLibrary;
  onSave: (focus: PracticeFocus) => void;
}) {
  const progress = focusProgress(library, focus);
  return (
    <li className="space-y-2 rounded-lg border bg-card p-3 text-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium">{focus.title}</p>
        {focus.endedAt === null ? (
          <button
            type="button"
            onClick={() => {
              const now = Date.now();
              onSave({ ...focus, endedAt: now, updatedAt: now });
            }}
            className="shrink-0 rounded-md border px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            End
          </button>
        ) : (
          <span className="shrink-0 text-xs text-muted-foreground">Ended</span>
        )}
      </div>
      {focus.detail && <p className="text-muted-foreground">{focus.detail}</p>}
      <p className="text-xs text-muted-foreground">
        Tracking{" "}
        {focus.factor ? `deaths you labelled “${DEATH_FACTORS[focus.factor].label}”` : "all deaths"}
      </p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
        <dt className="text-muted-foreground">Before</dt>
        <dd className="tabular-nums">{describe(progress.before, focus.factor)}</dd>
        <dt className="text-muted-foreground">During</dt>
        <dd className="tabular-nums">{describe(progress.during, focus.factor)}</dd>
      </dl>
      <p className="text-xs text-muted-foreground">
        Counts of your own labels, not a measured rate. A handful of reviews can swing either way.
      </p>
    </li>
  );
}

export function FocusPanel({
  library,
  onSave,
}: {
  library: ReviewLibrary;
  onSave: (focus: PracticeFocus) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [factor, setFactor] = useState<DeathFactor | "">("");
  const ids = { title: useId(), detail: useId(), factor: useId() };

  function submit(event: FormEvent) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    const now = Date.now();
    onSave({
      id: crypto.randomUUID(),
      title: trimmed.slice(0, 120),
      detail: detail.trim().slice(0, 1000),
      factor: factor === "" ? null : factor,
      startedAt: now,
      endedAt: null,
      updatedAt: now,
    });
    setTitle("");
    setDetail("");
    setFactor("");
    setAdding(false);
  }

  return (
    <section aria-labelledby="focus-heading" className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 id="focus-heading" className="text-sm font-semibold">
          Practice focus
        </h2>
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="text-xs text-muted-foreground underline hover:text-foreground"
          >
            New focus
          </button>
        )}
      </div>
      {adding && (
        <form onSubmit={submit} className="space-y-2 rounded-lg border p-3">
          <label htmlFor={ids.title} className="block text-xs text-muted-foreground">
            What are you working on?
          </label>
          <input
            id={ids.title}
            value={title}
            required
            maxLength={120}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Don't take fights before the tank arrives"
            className="h-9 w-full rounded-md border bg-background px-2 text-sm focus-visible:outline-2 focus-visible:outline-ring"
          />
          <label htmlFor={ids.factor} className="block text-xs text-muted-foreground">
            Deaths it should reduce
          </label>
          <select
            id={ids.factor}
            value={factor}
            onChange={(e) =>
              setFactor(DeathFactorSchema.options.find((f) => f === e.target.value) ?? "")
            }
            className="h-9 w-full rounded-md border bg-background px-2 text-sm focus-visible:outline-2 focus-visible:outline-ring"
          >
            <option value="">Any</option>
            {DeathFactorSchema.options.map((f) => (
              <option key={f} value={f}>
                {DEATH_FACTORS[f].label}
              </option>
            ))}
          </select>
          <label htmlFor={ids.detail} className="block text-xs text-muted-foreground">
            Notes
          </label>
          <textarea
            id={ids.detail}
            value={detail}
            maxLength={1000}
            rows={2}
            onChange={(e) => setDetail(e.target.value)}
            className="w-full rounded-md border bg-background px-2 py-1.5 text-sm focus-visible:outline-2 focus-visible:outline-ring"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground"
            >
              Start focus
            </button>
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="inline-flex h-8 items-center rounded-md border px-3 text-xs"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      {library.focuses.length === 0 && !adding ? (
        <p className="flex items-start gap-2 rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
          <Target className="mt-0.5 size-4 shrink-0" aria-hidden />
          Pick one habit to work on. New reviews link to it, so you can compare before and during.
        </p>
      ) : (
        <ul className="space-y-2">
          {[...library.focuses]
            .sort((a, b) => b.startedAt - a.startedAt)
            .map((f) => (
              <FocusCard key={f.id} focus={f} library={library} onSave={onSave} />
            ))}
        </ul>
      )}
    </section>
  );
}
