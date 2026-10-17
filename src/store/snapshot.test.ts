import { describe, expect, it } from "vitest";

import { STORED_SNAPSHOT_VERSION } from "@/domain/model";

import { memoryKvStore } from "../../test/memoryKv";
import { emptyStored } from "./plan";
import { readStored, writeStored } from "./snapshot";

describe("readStored", () => {
  it("treats a snapshot from an older schema version as missing, so the next sync rebuilds it", async () => {
    const store = memoryKvStore({
      snapshot: { ...emptyStored(), version: STORED_SNAPSHOT_VERSION - 1 },
    });
    expect(await readStored(store)).toBeNull();
  });

  it("finds what writeStored saved, so writer and reader agree on the key", async () => {
    const store = memoryKvStore();
    const stored = { ...emptyStored(), builtAt: "2026-10-16T22:00:00.000Z" };
    await writeStored(store, stored);
    expect(await readStored(store)).toEqual(stored);
  });
});
