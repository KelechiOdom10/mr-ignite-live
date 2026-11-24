import { describe, expect, it } from "vitest";

import {
  EMPTY_MATCH_REF,
  exportLibrary,
  focusProgress,
  formatVideoTime,
  mergeLibrary,
  parseExport,
  startFocus,
  activeFocus,
  upsertBookmark,
  type Bookmark,
  type PracticeFocus,
  type ReviewSession,
} from "./review";

const ids = {
  a: "00000000-0000-4000-8000-00000000000a",
  b: "00000000-0000-4000-8000-00000000000b",
  c: "00000000-0000-4000-8000-00000000000c",
  focus: "00000000-0000-4000-8000-0000000000f0",
  d1: "00000000-0000-4000-8000-0000000000d1",
  d2: "00000000-0000-4000-8000-0000000000d2",
  d3: "00000000-0000-4000-8000-0000000000d3",
};

function death(id: string, at: number, factor: "positioning" | "cooldown"): Bookmark {
  return {
    id,
    kind: "death",
    at,
    factor,
    healerSight: "not_checked",
    confidence: "sure",
    note: "",
  };
}

function session(id: string, over: Partial<ReviewSession> = {}): ReviewSession {
  return {
    id,
    title: `Session ${id.slice(-1)}`,
    createdAt: 1_000,
    updatedAt: 1_000,
    video: { name: "tokyo.mp4", sizeBytes: 42, lastModified: 900, durationSeconds: 600 },
    match: EMPTY_MATCH_REF,
    focusId: null,
    bookmarks: [],
    ...over,
  };
}

const focus: PracticeFocus = {
  id: ids.focus,
  title: "Stay behind the tank",
  detail: "",
  factor: "positioning",
  startedAt: 5_000,
  endedAt: null,
  updatedAt: 5_000,
};

describe("upsertBookmark", () => {
  it("moves an edited bookmark to its new time instead of keeping a stale copy", () => {
    const s = session(ids.a, {
      bookmarks: [death(ids.d1, 10, "cooldown"), death(ids.d2, 50, "cooldown")],
    });

    const moved = upsertBookmark(s, death(ids.d1, 90, "positioning"), 2_000);
    expect(moved.bookmarks.map((b) => [b.id, b.at])).toEqual([
      [ids.d2, 50],
      [ids.d1, 90],
    ]);
    expect(moved.updatedAt).toBe(2_000);
  });
});

describe("export and import", () => {
  it("round-trips a library through the JSON a user saves to disk", () => {
    const library = {
      sessions: [session(ids.a, { bookmarks: [death(ids.d1, 12.5, "positioning")] })],
      focuses: [focus],
    };

    const parsed = parseExport(JSON.stringify(exportLibrary(library, 9_000)));
    expect(parsed).toEqual({
      ok: true,
      value: { format: "rivals-hub-review", version: 1, exportedAt: 9_000, ...library },
    });
  });

  it("rejects a file whose fight ends before it starts rather than importing it", () => {
    const bad = exportLibrary(
      {
        sessions: [
          session(ids.a, {
            bookmarks: [
              {
                id: ids.d1,
                kind: "fight",
                at: 30,
                endAt: 10,
                outcome: "lost",
                firstDeath: "us",
                note: "",
              },
            ],
          }),
        ],
        focuses: [],
      },
      1,
    );

    expect(parseExport(JSON.stringify(bad))).toEqual({ ok: false, error: "not_a_review_export" });
    expect(parseExport("{not json")).toEqual({ ok: false, error: "not_json" });
  });

  it("never deletes local sessions and keeps whichever copy was edited last", () => {
    const local = {
      sessions: [
        session(ids.a, { title: "Local newer", updatedAt: 3_000 }),
        session(ids.b, { title: "Local older", updatedAt: 1_000 }),
      ],
      focuses: [],
    };

    const incoming = exportLibrary(
      {
        sessions: [
          session(ids.a, { title: "Imported older", updatedAt: 2_000 }),
          session(ids.b, { title: "Imported newer", updatedAt: 4_000 }),
          session(ids.c, { title: "Imported new" }),
        ],
        focuses: [focus],
      },
      5_000,
    );

    const { library, summary } = mergeLibrary(local, incoming);
    expect(library.sessions.map((s) => s.title)).toEqual([
      "Local newer",
      "Imported newer",
      "Imported new",
    ]);
    expect(summary).toEqual({
      sessionsAdded: 1,
      sessionsUpdated: 1,
      focusesAdded: 1,
      focusesUpdated: 0,
    });
  });
});

describe("focusProgress", () => {
  it("compares linked sessions with sessions reviewed before the focus began", () => {
    const library = {
      sessions: [
        session(ids.a, {
          createdAt: 1_000,
          bookmarks: [death(ids.d1, 1, "positioning"), death(ids.d2, 2, "cooldown")],
        }),
        session(ids.b, {
          createdAt: 6_000,
          focusId: ids.focus,
          bookmarks: [death(ids.d3, 3, "cooldown")],
        }),
        session(ids.c, { createdAt: 7_000, bookmarks: [death(ids.d1, 4, "positioning")] }),
      ],
      focuses: [focus],
    };

    expect(focusProgress(library, focus)).toEqual({
      before: { deaths: 2, matching: 1, sessions: 1 },
      during: { deaths: 1, matching: 0, sessions: 1 },
    });
  });
});

describe("startFocus", () => {
  it("ends the open focus so new reviews link to the one just started", () => {
    const next: PracticeFocus = {
      ...focus,
      id: ids.c,
      title: "Track enemy ults",
      startedAt: 9_000,
    };

    const library = startFocus({ sessions: [], focuses: [focus] }, next, 9_000);
    expect(library.focuses.map((f) => [f.title, f.endedAt])).toEqual([
      ["Stay behind the tank", 9_000],
      ["Track enemy ults", null],
    ]);
    expect(activeFocus(library)?.id).toBe(ids.c);
  });
});

describe("formatVideoTime", () => {
  it("shows hours only for footage longer than an hour", () => {
    expect(formatVideoTime(65.9)).toBe("1:05");
    expect(formatVideoTime(3725)).toBe("1:02:05");
  });
});
