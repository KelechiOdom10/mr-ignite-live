import { describe, expect, it } from "vitest";

import { EMPTY_MATCH_REF, type ReviewLibrary } from "@/domain/review";

import { LIBRARY_KEY, loadLibrary, saveLibrary, type KeyValueArea } from "./reviewStore";

// IndexedDB structured-clones what it stores; cloning here keeps a value it couldn't hold failing.
function memoryArea(initial: Record<string, unknown> = {}) {
  const values = new Map(Object.entries(initial).map(([k, v]) => [k, structuredClone(v)]));
  const area: KeyValueArea = {
    get: async (key) => structuredClone(values.get(key)),
    set: async (key, value) => void values.set(key, structuredClone(value)),
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
    expect(await loadLibrary(area, 5)).toEqual({ library, problem: null });
  });

  it("keeps an unreadable library aside so the next save can't erase it", async () => {
    const broken = { sessions: [{ title: "half-written" }], focuses: [] };
    const { area, values } = memoryArea({ [LIBRARY_KEY]: broken });

    const loaded = await loadLibrary(area, 77);
    expect(loaded).toEqual({
      library: { sessions: [], focuses: [] },
      problem: "unreadable",
      keptAs: "library:unreadable:77",
    });

    await saveLibrary(area, library);
    expect(values.get("library:unreadable:77")).toEqual(broken);
  });
});
