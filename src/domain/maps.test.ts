import { describe, expect, it } from "vitest";

import { mapInfo } from "./maps";

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
