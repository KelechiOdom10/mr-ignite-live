import { Crosshair, Flag, Play, Skull, StickyNote, Trash2 } from "lucide-react";
import { useId, useState, type ReactNode } from "react";

import {
  CONFIDENCE_LABELS,
  ConfidenceSchema,
  DEATH_FACTORS,
  DeathFactorSchema,
  FIGHT_OUTCOME_LABELS,
  FIRST_DEATH_LABELS,
  FightOutcomeSchema,
  FirstDeathSchema,
  formatVideoTime,
  HEALER_SIGHT_LABELS,
  HealerSightSchema,
  type Bookmark,
} from "@/domain/review";

import { useDraft } from "./useDraft";

const KIND = {
  death: { label: "Death", icon: Skull },
  fight: { label: "Fight", icon: Crosshair },
  moment: { label: "Moment", icon: StickyNote },
} as const;

const fieldClass =
  "h-9 w-full rounded-md border bg-background px-2 text-sm focus-visible:outline-2 focus-visible:outline-ring";

function Field({ label, children }: { label: string; children: (id: string) => ReactNode }) {
  const id = useId();

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-xs text-muted-foreground">
        {label}
      </label>
      {children(id)}
    </div>
  );
}

interface Option<T extends string> {
  value: T;
  label: string;
}

function options<T extends string>(values: readonly T[], label: (value: T) => string) {
  return values.map((value) => ({ value, label: label(value) }));
}

function Choice<T extends string>({
  label,
  value,
  choices,
  onChange,
}: {
  label: string;
  value: T;
  choices: readonly Option<T>[];
  onChange: (value: T) => void;
}) {
  return (
    <Field label={label}>
      {(id) => (
        <select
          id={id}
          value={value}
          onChange={(e) => {
            const picked = choices.find((c) => c.value === e.target.value);

            if (picked) onChange(picked.value);
          }}
          className={fieldClass}
        >
          {choices.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
}

const FACTOR_CHOICES = options(DeathFactorSchema.options, (f) => DEATH_FACTORS[f].label);
const SIGHT_CHOICES = options(HealerSightSchema.options, (v) => HEALER_SIGHT_LABELS[v]);
const CONFIDENCE_CHOICES = options(ConfidenceSchema.options, (v) => CONFIDENCE_LABELS[v]);
const OUTCOME_CHOICES = options(FightOutcomeSchema.options, (v) => FIGHT_OUTCOME_LABELS[v]);
const FIRST_DEATH_CHOICES = options(FirstDeathSchema.options, (v) => FIRST_DEATH_LABELS[v]);

export function BookmarkItem({
  bookmark,
  onJump,
  onChange,
  onDelete,
  currentTime,
}: {
  bookmark: Bookmark;
  onJump: (at: number) => void;
  onChange: (bookmark: Bookmark) => void;
  onDelete: () => void;
  currentTime: () => number | null;
}) {
  const note = useDraft(bookmark.note);
  const [endError, setEndError] = useState<string | null>(null);
  const { label, icon: Icon } = KIND[bookmark.kind];
  const noteId = useId();

  return (
    <li className="space-y-3 rounded-lg border bg-card p-3">
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-muted-foreground" aria-hidden />
        <span className="text-sm font-medium">{label}</span>
        <button
          type="button"
          onClick={() => onJump(bookmark.at)}
          className="inline-flex h-7 items-center gap-1 rounded-md border px-2 font-mono text-xs tabular-nums transition-colors hover:bg-accent"
          aria-label={`Play from ${formatVideoTime(bookmark.at)}`}
        >
          <Play className="size-3" aria-hidden />
          {formatVideoTime(bookmark.at)}
          {bookmark.kind === "fight" && bookmark.endAt !== null && (
            <span className="text-muted-foreground">–{formatVideoTime(bookmark.endAt)}</span>
          )}
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="ml-auto inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label={`Delete ${label.toLowerCase()} at ${formatVideoTime(bookmark.at)}`}
        >
          <Trash2 className="size-4" aria-hidden />
        </button>
      </div>

      {bookmark.kind === "death" && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Choice
            label="What decided it"
            value={bookmark.factor}
            choices={FACTOR_CHOICES}
            onChange={(factor) => onChange({ ...bookmark, factor })}
          />
          <Choice
            label="Healers' line of sight"
            value={bookmark.healerSight}
            choices={SIGHT_CHOICES}
            onChange={(healerSight) => onChange({ ...bookmark, healerSight })}
          />
          <Choice
            label="How sure"
            value={bookmark.confidence}
            choices={CONFIDENCE_CHOICES}
            onChange={(confidence) => onChange({ ...bookmark, confidence })}
          />
          <p className="text-xs text-muted-foreground sm:col-span-3">
            {DEATH_FACTORS[bookmark.factor].question}
          </p>
        </div>
      )}

      {bookmark.kind === "fight" && (
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <Choice
            label="Result"
            value={bookmark.outcome}
            choices={OUTCOME_CHOICES}
            onChange={(outcome) => onChange({ ...bookmark, outcome })}
          />
          <Choice
            label="First death"
            value={bookmark.firstDeath}
            choices={FIRST_DEATH_CHOICES}
            onChange={(firstDeath) => onChange({ ...bookmark, firstDeath })}
          />
          <button
            type="button"
            onClick={() => {
              const now = currentTime();

              if (now === null) return;

              if (now < bookmark.at) {
                setEndError("Play past the fight's start, then mark its end.");

                return;
              }

              setEndError(null);
              onChange({ ...bookmark, endAt: now });
            }}
            className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm transition-colors hover:bg-accent"
          >
            <Flag className="size-4" aria-hidden />
            Fight ends here
          </button>
          {endError && (
            <p role="alert" className="text-xs text-destructive sm:col-span-3">
              {endError}
            </p>
          )}
        </div>
      )}

      <div className="space-y-1">
        <label htmlFor={noteId} className="block text-xs text-muted-foreground">
          What you saw
        </label>
        <textarea
          id={noteId}
          value={note.text}
          maxLength={2000}
          rows={2}
          onChange={(e) => note.edit(e.target.value)}
          onBlur={() => {
            if (!note.dirty) return;
            note.settle(note.text);
            onChange({ ...bookmark, note: note.text });
          }}
          placeholder="e.g. Pushed past the corner before Luna had sight of me"
          className="w-full rounded-md border bg-background px-2 py-1.5 text-sm focus-visible:outline-2 focus-visible:outline-ring"
        />
      </div>
    </li>
  );
}
