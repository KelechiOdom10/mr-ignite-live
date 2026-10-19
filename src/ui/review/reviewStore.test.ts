import { describe, expect, it } from "vitest";

import { EMPTY_MATCH_REF, MAX_BOOKMARKS, type ReviewLibrary } from "@/domain/review";

import { type Json, JsonSchema } from "../../../test/fixtures";
import {
  LIBRARY_KEY,
  loadLibrary,
  saveLibrary,
  UnsavableLibraryError,
  type KeyValueArea,
} from "./reviewStore";

// IndexedDB structured-clones what it stores; cloning here keeps a value it couldn't hold failing.
// `initial` seeds raw values, which may not match any schema.
function memoryArea(initial: Record<string, Json> = {}) {
  const values = new Map(Object.entries(initial).map(([k, v]) => [k, structuredClone(v)]));

  const area: KeyValueArea = {
    async get(key, schema) {
      const raw = values.get(key);

      return raw === undefined ? null : schema.safeParse(structuredClone(raw));
    },
    set: async (key, schema, value) =>
      void values.set(key, JsonSchema.parse(structuredClone(schema.parse(value)))),
    async copy(from, to) {
      const raw = values.get(from);

      if (raw !== undefined) values.set(to, structuredClone(raw));
    },
  };

  return { area, values };
}

const library: ReviewLibrary = {
  sessions: [
    {
      id: "00000000-0000-4000-8000-00000000000a",
      title: "Tokyo 2099 attack",
      createdAt: 1,
      updatedAt: 2,
      video: { name: "clip.mp4", sizeBytes: 10, lastModified: 0, durationSeconds: 61.2 },
      match: { ...EMPTY_MATCH_REF, replayId: "108918123678" },
      focusId: null,
      bookmarks: [
        {
          id: "00000000-0000-4000-8000-0000000000d1",
          kind: "death",
          at: 12.25,
          factor: "positioning",
          healerSight: "out_of_sight",
          confidence: "likely",
          note: "Walked past the corner before Luna was up",
        },
      ],
    },
  ],
  focuses: [],
};

describe("review store", () => {
  it("reads back exactly what it saved", async () => {
    const { area } = memoryArea();
    await saveLibrary(area, library);
    expect(await loadLibrary(area, 5)).toEqual({ library, keptAs: null, unreadable: 0 });
  });

  it("keeps readable reviews when one is broken, and sets the broken data aside", async () => {
    const stored = { sessions: [...library.sessions, { title: "half-written" }], focuses: [] };
    const { area, values } = memoryArea({ [LIBRARY_KEY]: stored });

    expect(await loadLibrary(area, 77)).toEqual({
      library,
      keptAs: "library:unreadable:77",
      unreadable: 1,
    });

    await saveLibrary(area, library);
    expect(values.get("library:unreadable:77")).toEqual(stored);
  });

  it("refuses to save a review the loader would reject, leaving the stored copy intact", async () => {
    const { area, values } = memoryArea();
    await saveLibrary(area, library);
    const [session] = library.sessions;

    if (!session) throw new Error("fixture has a session");
    const [mark] = session.bookmarks;

    if (!mark) throw new Error("fixture has a mark");

    const overfull = {
      ...library,
      sessions: [
        {
          ...session,
          bookmarks: Array.from({ length: MAX_BOOKMARKS + 1 }, (_, i) => ({
            ...mark,
            id: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
          })),
        },
      ],
    };

    await expect(saveLibrary(area, overfull)).rejects.toThrow(UnsavableLibraryError);
    expect(values.get(LIBRARY_KEY)).toEqual(library);
  });
});
