import { describe, expect, it } from "vitest";

import { catalogueHero, HERO_CATALOGUE } from "./heroes";

describe("catalogueHero", () => {
  it("names Nightcrawler, so a player's Nightcrawler games don't read 'Hero 1068'", () => {
    expect(catalogueHero(1068)).toEqual({
      id: 1068,
      name: "Nightcrawler",
      role: "Strategist",
      iconUrl: "https://rivalstracker.com/images/heroes/SelectHero/img_selecthero_1068001.png",
    });

    expect(HERO_CATALOGUE.map((h) => h.id)).toContain(1068);
  });

  it("calls a hero it has never heard of 'New hero', with no art and no role, never by its id", () => {
    expect(catalogueHero(1099)).toEqual({ id: 1099, name: "New hero", role: null, iconUrl: null });
  });
});
