import { z } from "zod";

import { MatchUidSchema } from "./player";

// Self-review of a player's own recorded footage. Every label here is the reviewer's judgement
// about a moment in their video, never an automatic verdict: nothing in this module infers a
// cause, a line-of-sight state or a score.

const IdSchema = z.uuid();
const SecondsSchema = z.number().finite().min(0);
const EpochMsSchema = z.number().int().min(0);
const NoteSchema = z.string().max(2000);

export const MAX_BOOKMARKS = 500;

/** What the reviewer thinks mainly decided a death. `unknown` is a valid answer, not a gap. */
export const DeathFactorSchema = z.enum([
  "fight_timing",
  "cooldown",
  "positioning",
  "pressure",
  "mechanics",
  "unknown",
]);

export type DeathFactor = z.infer<typeof DeathFactorSchema>;

/** Kept apart from the factor: the in-game replay can confirm it, so it is answered separately. */
export const HealerSightSchema = z.enum(["in_sight", "out_of_sight", "unclear", "not_checked"]);

export type HealerSight = z.infer<typeof HealerSightSchema>;

export const ConfidenceSchema = z.enum(["sure", "likely", "guess"]);

export type Confidence = z.infer<typeof ConfidenceSchema>;

export const FightOutcomeSchema = z.enum(["won", "lost", "traded", "unclear"]);

export type FightOutcome = z.infer<typeof FightOutcomeSchema>;

export const FirstDeathSchema = z.enum(["us", "them", "unclear"]);

export type FirstDeath = z.infer<typeof FirstDeathSchema>;

export const DEATH_FACTORS: Record<DeathFactor, { label: string; question: string }> = {
  fight_timing: {
    label: "Fight timing",
    question: "Did I take the fight early, late, or before my team was there?",
  },
  cooldown: {
    label: "Cooldown or ult",
    question: "Was my escape, sustain or ult unavailable when I committed?",
  },
  positioning: {
    label: "Positioning",
    question: "Was I ahead of my team, off cover, or somewhere I could be reached?",
  },
  pressure: {
    label: "Focused or dived",
    question: "Did several enemies commit to me at once?",
  },
  mechanics: { label: "Mechanics", question: "Did I lose a duel I should have won?" },
  unknown: { label: "Not sure", question: "The footage doesn't show enough to say." },
};

export const HEALER_SIGHT_LABELS: Record<HealerSight, string> = {
  in_sight: "Healers could see me",
  out_of_sight: "Out of healers' sight",
  unclear: "Can't tell from this view",
  not_checked: "Not checked",
};

export const CONFIDENCE_LABELS: Record<Confidence, string> = {
  sure: "Sure",
  likely: "Likely",
  guess: "Guess",
};

export const FIGHT_OUTCOME_LABELS: Record<FightOutcome, string> = {
  won: "Won",
  lost: "Lost",
  traded: "Traded",
  unclear: "Unclear",
};

export const FIRST_DEATH_LABELS: Record<FirstDeath, string> = {
  us: "We lost a player first",
  them: "They lost a player first",
  unclear: "Unclear",
};

const DeathBookmarkSchema = z.object({
  id: IdSchema,
  kind: z.literal("death"),
  at: SecondsSchema,
  factor: DeathFactorSchema,
  healerSight: HealerSightSchema,
  confidence: ConfidenceSchema,
  note: NoteSchema,
});

const FightBookmarkSchema = z
  .object({
    id: IdSchema,
    kind: z.literal("fight"),
    at: SecondsSchema,
    endAt: SecondsSchema.nullable(),
    outcome: FightOutcomeSchema,
    firstDeath: FirstDeathSchema,
    note: NoteSchema,
  })
  .refine((f) => f.endAt === null || f.endAt >= f.at, {
    message: "A fight can't end before it starts",
    path: ["endAt"],
  });

const MomentBookmarkSchema = z.object({
  id: IdSchema,
  kind: z.literal("moment"),
  at: SecondsSchema,
  note: NoteSchema,
});

export const BookmarkSchema = z.discriminatedUnion("kind", [
  DeathBookmarkSchema,
  FightBookmarkSchema,
  MomentBookmarkSchema,
]);

export type Bookmark = z.infer<typeof BookmarkSchema>;

export type BookmarkKind = Bookmark["kind"];

export type DeathBookmark = Extract<Bookmark, { kind: "death" }>;

export type FightBookmark = Extract<Bookmark, { kind: "fight" }>;

/** Identifies the local file a session was made from. The footage itself never leaves the device. */
export const VideoRefSchema = z.object({
  name: z.string().min(1).max(255),
  sizeBytes: z.number().int().min(0),
  lastModified: EpochMsSchema,
  durationSeconds: SecondsSchema.nullable(),
});

export type VideoRef = z.infer<typeof VideoRefSchema>;

export const ReplayIdSchema = z.string().regex(/^[0-9]{6,20}$/);

export const MatchRefSchema = z.object({
  matchUid: MatchUidSchema.nullable(),
  replayId: ReplayIdSchema.nullable(),
  map: z.string().trim().max(64).nullable(),
  hero: z.string().trim().max(64).nullable(),
});

export type MatchRef = z.infer<typeof MatchRefSchema>;

export const EMPTY_MATCH_REF: MatchRef = { matchUid: null, replayId: null, map: null, hero: null };

export const ReviewSessionSchema = z.object({
  id: IdSchema,
  title: z.string().trim().min(1).max(120),
  createdAt: EpochMsSchema,
  updatedAt: EpochMsSchema,
  video: VideoRefSchema.nullable(),
  match: MatchRefSchema,
  focusId: IdSchema.nullable(),
  bookmarks: z.array(BookmarkSchema).max(MAX_BOOKMARKS),
});

export type ReviewSession = z.infer<typeof ReviewSessionSchema>;

export const PracticeFocusSchema = z
  .object({
    id: IdSchema,
    title: z.string().trim().min(1).max(120),
    detail: z.string().max(1000),
    factor: DeathFactorSchema.nullable(),
    startedAt: EpochMsSchema,
    endedAt: EpochMsSchema.nullable(),
    updatedAt: EpochMsSchema,
  })
  .refine((f) => f.endedAt === null || f.endedAt >= f.startedAt, {
    message: "A focus can't end before it starts",
    path: ["endedAt"],
  });

export type PracticeFocus = z.infer<typeof PracticeFocusSchema>;

export const ReviewLibrarySchema = z.object({
  sessions: z.array(ReviewSessionSchema),
  focuses: z.array(PracticeFocusSchema),
});

export type ReviewLibrary = z.infer<typeof ReviewLibrarySchema>;

export const EMPTY_LIBRARY: ReviewLibrary = { sessions: [], focuses: [] };

export const REVIEW_EXPORT_FORMAT = "rivals-hub-review";

export const ReviewExportSchema = z.object({
  format: z.literal(REVIEW_EXPORT_FORMAT),
  version: z.literal(1),
  exportedAt: EpochMsSchema,
  sessions: z.array(ReviewSessionSchema),
  focuses: z.array(PracticeFocusSchema),
});

export type ReviewExport = z.infer<typeof ReviewExportSchema>;

export function sortBookmarks(bookmarks: readonly Bookmark[]): Bookmark[] {
  return [...bookmarks].sort((a, b) => a.at - b.at || a.id.localeCompare(b.id));
}

export function upsertBookmark(
  session: ReviewSession,
  bookmark: Bookmark,
  now: number,
): ReviewSession {
  const rest = session.bookmarks.filter((b) => b.id !== bookmark.id);

  return { ...session, bookmarks: sortBookmarks([...rest, bookmark]), updatedAt: now };
}

export function removeBookmark(session: ReviewSession, id: string, now: number): ReviewSession {
  return { ...session, bookmarks: session.bookmarks.filter((b) => b.id !== id), updatedAt: now };
}

export function blankBookmark(kind: BookmarkKind, id: string, at: number): Bookmark {
  switch (kind) {
    case "death":
      return {
        id,
        kind,
        at,
        factor: "unknown",
        healerSight: "not_checked",
        confidence: "guess",
        note: "",
      };
    case "fight":
      return { id, kind, at, endAt: null, outcome: "unclear", firstDeath: "unclear", note: "" };
    case "moment":
      return { id, kind, at, note: "" };
  }
}

export function startFocus(
  library: ReviewLibrary,
  focus: PracticeFocus,
  now: number,
): ReviewLibrary {
  const ended = library.focuses.map((f) =>
    f.endedAt === null ? { ...f, endedAt: Math.max(now, f.startedAt), updatedAt: now } : f,
  );

  return { ...library, focuses: [...ended, focus] };
}

/** The latest open focus; an import can bring in a second open one from another device. */
export function activeFocus(library: ReviewLibrary): PracticeFocus | null {
  let latest: PracticeFocus | null = null;

  for (const f of library.focuses) {
    if (f.endedAt === null && (!latest || f.startedAt > latest.startedAt)) latest = f;
  }

  return latest;
}

/** Same file as the one a session was made from, judged by what the browser can see of it. */
export function sameVideo(ref: VideoRef, file: { name: string; size: number }): boolean {
  return ref.name === file.name && ref.sizeBytes === file.size;
}

export function exportLibrary(library: ReviewLibrary, now: number): ReviewExport {
  return {
    format: REVIEW_EXPORT_FORMAT,
    version: 1,
    exportedAt: now,
    sessions: library.sessions,
    focuses: library.focuses,
  };
}

export type ImportResult =
  | { ok: true; value: ReviewExport }
  | { ok: false; error: "not_json" | "not_a_review_export" };

export function parseExport(text: string): ImportResult {
  let raw: unknown;

  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "not_json" };
  }

  const parsed = ReviewExportSchema.safeParse(raw);

  return parsed.success
    ? { ok: true, value: parsed.data }
    : { ok: false, error: "not_a_review_export" };
}

interface MergedItems<T> {
  merged: T[];
  added: number;
  updated: number;
}

function mergeById<T extends { id: string; updatedAt: number }>(
  mine: readonly T[],
  theirs: readonly T[],
): MergedItems<T> {
  const byId = new Map(mine.map((item) => [item.id, item]));
  let added = 0;
  let updated = 0;

  for (const item of theirs) {
    const current = byId.get(item.id);

    if (!current) {
      added += 1;
      byId.set(item.id, item);
    } else if (item.updatedAt > current.updatedAt) {
      updated += 1;
      byId.set(item.id, item);
    }
  }

  return { merged: [...byId.values()], added, updated };
}

export interface MergeSummary {
  sessionsAdded: number;
  sessionsUpdated: number;
  focusesAdded: number;
  focusesUpdated: number;
}

/** Imports never delete: an item only replaces the local copy when it was edited more recently. */
export interface MergedLibrary {
  library: ReviewLibrary;
  summary: MergeSummary;
}

export function mergeLibrary(library: ReviewLibrary, incoming: ReviewExport): MergedLibrary {
  const sessions = mergeById(library.sessions, incoming.sessions);
  const focuses = mergeById(library.focuses, incoming.focuses);

  return {
    library: { sessions: sessions.merged, focuses: focuses.merged },
    summary: {
      sessionsAdded: sessions.added,
      sessionsUpdated: sessions.updated,
      focusesAdded: focuses.added,
      focusesUpdated: focuses.updated,
    },
  };
}

export interface FactorCount {
  deaths: number;
  matching: number;
  sessions: number;
}

export interface FocusProgress {
  /** Sessions reviewed before the focus started and not linked to it. */
  before: FactorCount;
  during: FactorCount;
}

function countDeaths(sessions: readonly ReviewSession[], factor: DeathFactor | null): FactorCount {
  let deaths = 0;
  let matching = 0;

  for (const s of sessions) {
    for (const b of s.bookmarks) {
      if (b.kind !== "death") continue;
      deaths += 1;

      if (factor !== null && b.factor === factor) matching += 1;
    }
  }

  return { deaths, matching, sessions: sessions.length };
}

/**
 * Counts the reviewer's own labels before and during a focus. These are counts of judgements on
 * the sessions reviewed, not a measured rate of play, so callers show them as "n of m".
 */
export function focusProgress(library: ReviewLibrary, focus: PracticeFocus): FocusProgress {
  const during = library.sessions.filter((s) => s.focusId === focus.id);

  const before = library.sessions.filter(
    (s) => s.focusId !== focus.id && s.createdAt < focus.startedAt,
  );

  return { before: countDeaths(before, focus.factor), during: countDeaths(during, focus.factor) };
}

export function formatVideoTime(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  const h = Math.floor(whole / 3600);
  const m = Math.floor((whole % 3600) / 60);
  const s = whole % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);

  return `${h > 0 ? `${h}:` : ""}${mm}:${String(s).padStart(2, "0")}`;
}
