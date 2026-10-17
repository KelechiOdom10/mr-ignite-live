import { CircleAlert, Download, Film, Plus, Upload } from "lucide-react";
import { useEffect, useRef, useState, type ChangeEvent } from "react";

import {
  activeFocus,
  EMPTY_MATCH_REF,
  MAX_BOOKMARKS,
  ReviewLibrarySchema,
  startFocus,
  exportLibrary,
  mergeLibrary,
  parseExport,
  type PracticeFocus,
  type ReviewLibrary,
  type ReviewSession,
} from "@/domain/review";
import { cn } from "@/lib/utils";

import { FocusPanel } from "./FocusPanel";
import { indexedDbArea, loadLibrary, saveLibrary, type KeyValueArea } from "./reviewStore";
import { SessionView, type VideoSource } from "./SessionView";

type Loaded =
  | { kind: "loading" }
  | { kind: "unavailable" }
  | { kind: "ready"; library: ReviewLibrary };

function titleFromFile(name: string): string {
  const base = name.replace(/\.[^.]+$/, "").trim();
  return (base || "Untitled review").slice(0, 120);
}

function downloadJson(fileName: string, value: unknown) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  // Some browsers abort a download whose URL is revoked in the same task as the click.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

async function openLibrary() {
  if (typeof indexedDB === "undefined") throw new Error("IndexedDB is not available");
  const opened = indexedDbArea();
  return { opened, result: await loadLibrary(opened, Date.now()) };
}

const IMPORT_ERRORS = {
  not_json: "That file isn't JSON.",
  not_a_review_export: "That file isn't a Rivals Hub review export, or it has been changed.",
} as const;

export function ReviewWorkspace() {
  const area = useRef<KeyValueArea | null>(null);
  // Edits arrive faster than renders (metadata, then a bookmark), so each one builds on the latest
  // library rather than on the copy its handler closed over.
  const latest = useRef<ReviewLibrary | null>(null);
  const [loaded, setLoaded] = useState<Loaded>({ kind: "loading" });
  const [notice, setNotice] = useState<{ tone: "info" | "error"; text: string } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sources, setSources] = useState<ReadonlyMap<string, VideoSource>>(new Map());
  const openUrls = useRef(new Set<string>());
  const reviewsHeading = useRef<HTMLHeadingElement>(null);
  const newVideoInput = useRef<HTMLInputElement>(null);
  const importInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    openLibrary().then(
      ({ opened, result }) => {
        if (cancelled) return;
        area.current = opened;
        latest.current = result.library;
        setLoaded({ kind: "ready", library: result.library });
        setSelectedId(result.library.sessions[0]?.id ?? null);
        if (result.keptAs) {
          setNotice({
            tone: "error",
            text: `${result.unreadable} saved ${result.unreadable === 1 ? "item" : "items"} couldn't be read. The originals were kept as “${result.keptAs}” in this browser's storage; everything else loaded.`,
          });
        }
      },
      (error: unknown) => {
        console.error("Review storage unavailable", error);
        if (!cancelled) setLoaded({ kind: "unavailable" });
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const urls = openUrls.current;
    return () => {
      for (const url of urls) URL.revokeObjectURL(url);
      urls.clear();
    };
  }, []);

  if (loaded.kind === "loading") {
    return (
      <div aria-busy className="grid gap-4 lg:grid-cols-[16rem_1fr]">
        <div className="h-40 animate-pulse rounded-lg bg-muted" />
        <div className="aspect-video animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }
  if (loaded.kind === "unavailable") {
    return (
      <p role="alert" className="flex items-start gap-3 rounded-lg border bg-card p-4 text-sm">
        <CircleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
        This browser won't let Rivals Hub store reviews (IndexedDB is off, often in private
        windows). Open the site in a normal window to review footage.
      </p>
    );
  }

  const library = loaded.library;
  const selected = library.sessions.find((s) => s.id === selectedId) ?? null;

  function commit(update: (current: ReviewLibrary) => ReviewLibrary) {
    if (!latest.current) return;
    const next = update(latest.current);
    if (!ReviewLibrarySchema.safeParse(next).success) {
      setNotice({
        tone: "error",
        text: next.sessions.some((s) => s.bookmarks.length > MAX_BOOKMARKS)
          ? `A review holds at most ${MAX_BOOKMARKS} marks, so that one wasn't added.`
          : "That change wasn't saved because it would make your reviews unreadable.",
      });
      return;
    }
    latest.current = next;
    setLoaded({ kind: "ready", library: next });
    if (!area.current) return;
    saveLibrary(area.current, next).catch((error: unknown) => {
      console.error("Saving the review library failed", error);
      setNotice({
        tone: "error",
        text: "Your last change couldn't be saved in this browser. Export a copy to keep it.",
      });
    });
  }

  function updateSession(id: string, update: (session: ReviewSession) => ReviewSession) {
    commit((current) => ({
      ...current,
      sessions: current.sessions.map((s) => (s.id === id ? update(s) : s)),
    }));
  }

  function releaseSource(sessionId: string) {
    const source = sources.get(sessionId);
    if (!source) return;
    URL.revokeObjectURL(source.url);
    openUrls.current.delete(source.url);
  }

  function deleteSession(id: string) {
    releaseSource(id);
    setSources((current) => {
      const next = new Map(current);
      next.delete(id);
      return next;
    });
    commit((current) => ({ ...current, sessions: current.sessions.filter((s) => s.id !== id) }));
    setSelectedId(library.sessions.find((s) => s.id !== id)?.id ?? null);
    reviewsHeading.current?.focus();
  }

  function saveFocus(focus: PracticeFocus) {
    commit((current) =>
      current.focuses.some((f) => f.id === focus.id)
        ? { ...current, focuses: current.focuses.map((f) => (f.id === focus.id ? focus : f)) }
        : startFocus(current, focus, focus.startedAt),
    );
  }

  function attachFile(sessionId: string, file: File) {
    releaseSource(sessionId);
    const source = { file, url: URL.createObjectURL(file) };
    openUrls.current.add(source.url);
    setSources((current) => new Map(current).set(sessionId, source));
  }

  function startFromFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const now = Date.now();
    const focus = latest.current ? activeFocus(latest.current) : null;
    const session: ReviewSession = {
      id: crypto.randomUUID(),
      title: titleFromFile(file.name),
      createdAt: now,
      updatedAt: now,
      video: {
        name: file.name,
        sizeBytes: file.size,
        lastModified: file.lastModified,
        durationSeconds: null,
      },
      match: EMPTY_MATCH_REF,
      focusId: focus?.id ?? null,
      bookmarks: [],
    };
    commit((current) => ({ ...current, sessions: [session, ...current.sessions] }));
    attachFile(session.id, file);
    setSelectedId(session.id);
  }

  async function importFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const parsed = parseExport(await file.text());
    if (!parsed.ok) {
      setNotice({ tone: "error", text: IMPORT_ERRORS[parsed.error] });
      return;
    }
    if (!latest.current) return;
    const { library: merged, summary } = mergeLibrary(latest.current, parsed.value);
    commit(() => merged);
    setNotice({
      tone: "info",
      text: `Imported ${summary.sessionsAdded} new and ${summary.sessionsUpdated} updated reviews, ${summary.focusesAdded} new and ${summary.focusesUpdated} updated practice focuses. Nothing local was removed.`,
    });
  }

  function exportAll() {
    if (!latest.current) return;
    const now = Date.now();
    downloadJson(
      `rivals-hub-review-${new Date(now).toISOString().slice(0, 10)}.json`,
      exportLibrary(latest.current, now),
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => newVideoInput.current?.click()}
          className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="size-4" aria-hidden />
          Review a recording
        </button>
        <input
          ref={newVideoInput}
          type="file"
          accept="video/*"
          className="sr-only"
          tabIndex={-1}
          aria-label="Choose a recording to review"
          onChange={startFromFile}
        />
        <button
          type="button"
          onClick={exportAll}
          disabled={library.sessions.length === 0 && library.focuses.length === 0}
          className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
        >
          <Download className="size-4" aria-hidden />
          Export notes
        </button>
        <button
          type="button"
          onClick={() => importInput.current?.click()}
          className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Upload className="size-4" aria-hidden />
          Import notes
        </button>
        <input
          ref={importInput}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          tabIndex={-1}
          aria-label="Choose a review export to import"
          onChange={(e) => void importFile(e)}
        />
        <p className="text-xs text-muted-foreground">
          Recordings are opened from disk and never uploaded. Exports hold notes only.
        </p>
      </div>

      {notice && (
        <p
          role={notice.tone === "error" ? "alert" : "status"}
          className={cn(
            "rounded-lg border p-3 text-sm",
            notice.tone === "error" ? "border-destructive/40 text-foreground" : "bg-card",
          )}
        >
          {notice.text}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <div className="min-w-0 lg:col-start-2 lg:row-start-1">
          {selected ? (
            <SessionView
              key={selected.id}
              session={selected}
              focuses={library.focuses}
              source={sources.get(selected.id) ?? null}
              onAttachFile={(file) => attachFile(selected.id, file)}
              onChange={(update) => updateSession(selected.id, update)}
              onDelete={() => deleteSession(selected.id)}
            />
          ) : (
            <div className="grid aspect-video place-items-center rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              Choose “Review a recording” to open a match video from your computer.
            </div>
          )}
        </div>
        <aside className="space-y-6 lg:col-start-1 lg:row-start-1">
          <section aria-labelledby="reviews-heading" className="space-y-2">
            <h2
              id="reviews-heading"
              ref={reviewsHeading}
              tabIndex={-1}
              className="text-sm font-semibold focus:outline-none"
            >
              Reviews
            </h2>
            {library.sessions.length === 0 ? (
              <p className="flex items-start gap-2 rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                <Film className="mt-0.5 size-4 shrink-0" aria-hidden />
                Open a recording of one of your matches to start.
              </p>
            ) : (
              <ul className="space-y-1">
                {library.sessions.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(s.id)}
                      aria-current={s.id === selected?.id ? "true" : undefined}
                      className={cn(
                        "w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent",
                        s.id === selected?.id && "bg-accent",
                      )}
                    >
                      <span className="block truncate font-medium">{s.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {s.bookmarks.filter((b) => b.kind === "death").length} deaths ·{" "}
                        {s.bookmarks.filter((b) => b.kind === "fight").length} fights
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <FocusPanel library={library} onSave={saveFocus} />
        </aside>
      </div>
    </div>
  );
}
