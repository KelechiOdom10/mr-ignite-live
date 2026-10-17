import { Link } from "@void/react";
import { CircleAlert, Crosshair, FolderOpen, Skull, StickyNote, Trash2 } from "lucide-react";
import { useEffect, useEffectEvent, useId, useRef, useState, type ChangeEvent } from "react";

import { MatchUidSchema } from "@/domain/player";
import {
  blankBookmark,
  formatVideoTime,
  removeBookmark,
  ReplayIdSchema,
  sameVideo,
  upsertBookmark,
  type BookmarkKind,
  type MatchRef,
  type PracticeFocus,
  type ReviewSession,
} from "@/domain/review";

import { BookmarkItem } from "./BookmarkItem";

type SessionUpdate = (session: ReviewSession) => ReviewSession;

const MARKS = [
  { kind: "death", key: "d", label: "Death", icon: Skull },
  { kind: "fight", key: "f", label: "Fight", icon: Crosshair },
  { kind: "moment", key: "m", label: "Moment", icon: StickyNote },
] as const satisfies readonly { kind: BookmarkKind; key: string; label: string; icon: unknown }[];

function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
  );
}

export interface VideoSource {
  file: File;
  url: string;
}

const MATCH_FIELDS = [
  {
    key: "replayId",
    label: "Replay ID",
    hint: "From the match in your in-game history",
    valid: (v: string) => ReplayIdSchema.safeParse(v).success,
  },
  {
    key: "matchUid",
    label: "RivalsIsland match ID",
    hint: "Links to the match page",
    valid: (v: string) => MatchUidSchema.safeParse(v).success,
  },
  { key: "map", label: "Map", hint: "", valid: (v: string) => v.length <= 64 },
  { key: "hero", label: "Hero", hint: "", valid: (v: string) => v.length <= 64 },
] as const satisfies readonly {
  key: keyof MatchRef;
  label: string;
  hint: string;
  valid: (v: string) => boolean;
}[];

function MatchField({
  field,
  value,
  onSave,
}: {
  field: (typeof MATCH_FIELDS)[number];
  value: string | null;
  onSave: (value: string | null) => void;
}) {
  const id = useId();
  const [draft, setDraft] = useState(value ?? "");
  const [invalid, setInvalid] = useState(false);
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-xs text-muted-foreground">
        {field.label}
      </label>
      <input
        id={id}
        value={draft}
        aria-invalid={invalid || undefined}
        aria-describedby={field.hint ? `${id}-hint` : undefined}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          const trimmed = draft.trim();
          if (trimmed !== "" && !field.valid(trimmed)) {
            setInvalid(true);
            return;
          }
          setInvalid(false);
          const next = trimmed === "" ? null : trimmed;
          if (next !== value) onSave(next);
        }}
        className="h-9 w-full rounded-md border bg-background px-2 text-sm focus-visible:outline-2 focus-visible:outline-ring aria-[invalid]:border-destructive"
      />
      {invalid ? (
        <p className="text-xs text-destructive">That doesn't look like a {field.label}.</p>
      ) : (
        field.hint && (
          <p id={`${id}-hint`} className="text-xs text-muted-foreground">
            {field.hint}
          </p>
        )
      )}
    </div>
  );
}

export function SessionView({
  session,
  focuses,
  source,
  onAttachFile,
  onChange,
  onDelete,
}: {
  session: ReviewSession;
  focuses: readonly PracticeFocus[];
  source: VideoSource | null;
  onAttachFile: (file: File) => void;
  onChange: (update: SessionUpdate) => void;
  onDelete: () => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const reopenInput = useRef<HTMLInputElement>(null);
  const file = source?.file ?? null;
  const url = source?.url ?? null;
  const [title, setTitle] = useState(session.title);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const titleId = useId();
  const focusId = useId();

  const mismatch = file && session.video && !sameVideo(session.video, file);
  const playable = url !== null;

  function currentTime(): number | null {
    const el = video.current;
    return el && playable ? el.currentTime : null;
  }

  function mark(kind: BookmarkKind) {
    const at = currentTime();
    if (at === null) return;
    const bookmark = blankBookmark(kind, crypto.randomUUID(), at);
    onChange((s) => upsertBookmark(s, bookmark, Date.now()));
  }

  const onKey = useEffectEvent((event: KeyboardEvent) => {
    if (event.metaKey || event.ctrlKey || event.altKey || isTyping(event.target)) return;
    const found = MARKS.find((m) => m.key === event.key.toLowerCase());
    if (!found || !playable) return;
    event.preventDefault();
    mark(found.kind);
  });
  useEffect(() => {
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function jump(at: number) {
    const el = video.current;
    if (!el) return;
    el.currentTime = at;
    el.focus();
  }

  function reopen(event: ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0];
    event.target.value = "";
    if (picked) onAttachFile(picked);
  }

  return (
    <section aria-labelledby={titleId} className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <label htmlFor={titleId} className="block text-xs text-muted-foreground">
            Review title
          </label>
          <input
            id={titleId}
            value={title}
            maxLength={120}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => {
              const next = title.trim();
              if (next === "") setTitle(session.title);
              else if (next !== session.title)
                onChange((s) => ({ ...s, title: next, updatedAt: Date.now() }));
            }}
            className="h-10 w-full rounded-md border bg-background px-3 text-base font-semibold focus-visible:outline-2 focus-visible:outline-ring"
          />
        </div>
        {confirmDelete ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onDelete}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-destructive px-3 text-sm font-medium text-white"
            >
              Delete review and notes
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="inline-flex h-9 items-center rounded-md border px-3 text-sm"
            >
              Keep
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Trash2 className="size-4" aria-hidden />
            Delete
          </button>
        )}
      </div>

      {url ? (
        <video
          ref={video}
          src={url}
          controls
          playsInline
          preload="metadata"
          aria-label={`Recording: ${file?.name ?? session.title}`}
          onLoadedMetadata={(e) => {
            const duration = e.currentTarget.duration;
            if (!Number.isFinite(duration) || session.video?.durationSeconds === duration) return;
            onChange((s) =>
              s.video ? { ...s, video: { ...s.video, durationSeconds: duration } } : s,
            );
          }}
          className="aspect-video w-full rounded-lg bg-black"
        />
      ) : (
        <div className="grid aspect-video place-items-center rounded-lg border border-dashed p-6 text-center">
          <div className="max-w-sm space-y-3 text-sm text-muted-foreground">
            <p>
              Browsers forget opened files when the page reloads.
              {session.video && (
                <>
                  {" "}
                  Open <span className="font-medium text-foreground">
                    {session.video.name}
                  </span>{" "}
                  again to keep reviewing.
                </>
              )}
            </p>
            <button
              type="button"
              onClick={() => reopenInput.current?.click()}
              className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-foreground transition-colors hover:bg-accent"
            >
              <FolderOpen className="size-4" aria-hidden />
              Open recording
            </button>
          </div>
        </div>
      )}
      <input
        ref={reopenInput}
        type="file"
        accept="video/*"
        className="sr-only"
        tabIndex={-1}
        aria-label="Open the recording for this review"
        onChange={reopen}
      />

      {mismatch && (
        <p role="alert" className="flex items-start gap-2 rounded-lg border p-3 text-sm">
          <CircleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
          This isn't the file the review was made from ({session.video?.name}). Times may not line
          up with your marks.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Mark at the current time:</span>
        {MARKS.map(({ kind, key, label, icon: Icon }) => (
          <button
            key={kind}
            type="button"
            disabled={!playable}
            onClick={() => mark(kind)}
            className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
          >
            <Icon className="size-4" aria-hidden />
            {label}
            <kbd className="hidden rounded bg-muted px-1.5 font-mono text-[0.7rem] sm:inline">
              {key.toUpperCase()}
            </kbd>
          </button>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <section aria-label="Marks" className="min-w-0">
          {session.bookmarks.length === 0 ? (
            <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              No marks yet. Pause on a death or the start of a fight and press D or F.
            </p>
          ) : (
            <ol className="space-y-2">
              {session.bookmarks.map((b) => (
                <BookmarkItem
                  key={b.id}
                  bookmark={b}
                  currentTime={currentTime}
                  onJump={jump}
                  onChange={(next) => onChange((s) => upsertBookmark(s, next, Date.now()))}
                  onDelete={() => onChange((s) => removeBookmark(s, b.id, Date.now()))}
                />
              ))}
            </ol>
          )}
        </section>

        <aside className="space-y-4">
          <section aria-labelledby={`${titleId}-match`} className="space-y-3">
            <h3 id={`${titleId}-match`} className="text-sm font-semibold">
              Match
            </h3>
            {MATCH_FIELDS.map((field) => (
              <MatchField
                key={field.key}
                field={field}
                value={session.match[field.key]}
                onSave={(value) =>
                  onChange((s) => ({
                    ...s,
                    match: { ...s.match, [field.key]: value },
                    updatedAt: Date.now(),
                  }))
                }
              />
            ))}
            {session.match.matchUid && (
              <Link
                href={`/game/${encodeURIComponent(session.match.matchUid)}`}
                rel="nofollow"
                className="inline-block text-sm underline hover:text-foreground"
              >
                Open match stats
              </Link>
            )}
          </section>
          <div className="space-y-1">
            <label htmlFor={focusId} className="block text-sm font-semibold">
              Practice focus
            </label>
            <select
              id={focusId}
              value={session.focusId ?? ""}
              onChange={(e) => {
                const picked = focuses.find((f) => f.id === e.target.value) ?? null;
                onChange((s) => ({ ...s, focusId: picked?.id ?? null, updatedAt: Date.now() }));
              }}
              className="h-9 w-full rounded-md border bg-background px-2 text-sm focus-visible:outline-2 focus-visible:outline-ring"
            >
              <option value="">None</option>
              {focuses.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.title}
                  {f.endedAt !== null ? " (ended)" : ""}
                </option>
              ))}
            </select>
          </div>
          {session.video?.durationSeconds != null && (
            <p className="text-xs text-muted-foreground">
              {session.video.name} · {formatVideoTime(session.video.durationSeconds)}
            </p>
          )}
        </aside>
      </div>
    </section>
  );
}
