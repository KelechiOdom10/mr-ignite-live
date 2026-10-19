import { describe, expect, it } from "vitest";
import { z } from "zod";

import { rivalsIslandFixture } from "../../test/fakeRivalsIsland";
import { HERO_ROSTER, ROSTER_ICONS } from "./heroRoster";

const Catalogue = z.object({ heroes: z.array(z.object({ name: z.string(), icon: z.string() })) });

describe("ROSTER_ICONS", () => {
  it("gives every roster hero an icon from the recorded catalogue, so no simulator tile is blank", () => {
    const icons = new Set(Catalogue.parse(rivalsIslandFixture("heroes")).heroes.map((h) => h.icon));
    const missing = HERO_ROSTER.filter((h) => !icons.has(ROSTER_ICONS.get(h.id) ?? ""));
    expect(missing.map((h) => h.id)).toEqual([]);
  });
});
