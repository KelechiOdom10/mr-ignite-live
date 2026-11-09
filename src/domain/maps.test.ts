import { describe, expect, it } from "vitest";

import { mapDisplayName, mapInfo, mapNameConflicts } from "./maps";

describe("mapDisplayName", () => {
  it("shows a catalogue key as a map name, keeping joining words lowercase", () => {
    expect(mapDisplayName("yggdrasill path")).toBe("Yggdrasill Path");
    expect(mapDisplayName("museum of contemplation")).toBe("Museum of Contemplation");
  });
});

describe("mapInfo", () => {
  it("finds maps whose image names don't follow their titles", () => {
    expect(mapInfo("Krakoa")?.imageUrl).toMatch(/karoka\.webp$/);
    expect(mapInfo("Hell's Heaven")?.imageUrl).toMatch(/hells-haven\.webp$/);
  });

  it("tolerates Liquipedia's and mrvl's spelling differences", () => {
    expect(mapInfo("Yggdrasill Path")).toEqual(mapInfo("Yggdrasil Path"));
    expect(mapInfo("Spider-Islands")?.mode).toBe("Convoy");
    expect(mapInfo("Birnin T'Challa")?.mode).toBe("Domination");
  });

  it("returns null for an unknown or unpicked map", () => {
    expect(mapInfo("")).toBeNull();
    expect(mapInfo("Brand New Map")).toBeNull();
  });
});

describe("mapNameConflicts", () => {
  it("reports RAD vs Pulsar's map 1, which Liquipedia calls Krakoa and mrvl Celestial Husk", () => {
    expect(
      mapNameConflicts(
        [
          { index: 1, map: "Krakoa" },
          { index: 2, map: "Spider-Islands" },
        ],
        [
          { index: 1, map: "Celestial Husk" },
          { index: 2, map: "Spider-Islands" },
        ],
      ),
    ).toEqual([{ index: 1, liquipedia: "Krakoa", mrvl: "Celestial Husk" }]);
  });

  it("doesn't flag mrvl placeholders it falls back to when a game has no map name", () => {
    expect(
      mapNameConflicts(
        [
          { index: 3, map: "Krakoa" },
          { index: 5, map: "Midtown" },
        ],
        [
          { index: 3, map: "Map 3" },
          { index: 5, map: "tbd" },
        ],
      ),
    ).toEqual([]);
  });

  it("matches a long form against a spelling variant of the same map", () => {
    expect(
      mapNameConflicts(
        [{ index: 1, map: "Yggsgard: Yggdrasill Path" }],
        [{ index: 1, map: "Yggdrasil Path" }],
      ),
    ).toEqual([]);
  });

  it("doesn't flag spelling differences, long names or a map only one source has", () => {
    expect(
      mapNameConflicts(
        [
          { index: 1, map: "Yggdrasill Path" },
          { index: 2, map: "Hellfire Gala: Krakoa" },
          { index: 3, map: "Midtown" },
          { index: 4, map: "" },
        ],
        [
          { index: 1, map: "Yggdrasil Path" },
          { index: 2, map: "Krakoa" },
          { index: 4, map: "Thebes" },
        ],
      ),
    ).toEqual([]);
  });
});
