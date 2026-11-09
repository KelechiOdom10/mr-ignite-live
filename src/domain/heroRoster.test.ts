import { describe, expect, it } from "vitest";

import { HERO_ROSTER, ROSTER_ICONS } from "./heroRoster";

describe("ROSTER_ICONS", () => {
  it("gives every roster hero a portrait, so no simulator tile is blank", () => {
    const missing = HERO_ROSTER.filter((hero) => !ROSTER_ICONS.get(hero.id));

    expect(missing.map((hero) => hero.id)).toEqual([]);
  });

  it("asks only for https icons", () => {
    const insecure = [...ROSTER_ICONS.values()].filter((icon) => !icon.startsWith("https://"));

    expect(insecure).toEqual([]);
  });
});
