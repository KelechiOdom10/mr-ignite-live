import { describe, expect, it } from "vitest";

import {
  HERO_ROSTER,
  isUnrecordedHero,
  resolveHero,
  ROSTER_ICONS,
  UNKNOWN_HERO_NAME,
} from "./heroRoster";

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

describe("HERO_ROSTER", () => {
  it("lists Nightcrawler, who played in pro matches before the roster knew him", () => {
    expect(HERO_ROSTER.find((hero) => hero.id === "nightcrawler")).toEqual({
      id: "nightcrawler",
      name: "Nightcrawler",
      role: "Strategist",
      gameId: 1068,
    });

    expect(ROSTER_ICONS.get("nightcrawler")).toContain("img_selecthero_1068001");
  });

  it("gives every hero its own game id, matching the id in its icon", () => {
    const ids = HERO_ROSTER.map((hero) => hero.gameId);
    // The three Deadpools share one icon but have a game id each.
    const iconed = HERO_ROSTER.filter((hero) => !hero.id.startsWith("deadpool"));

    expect(new Set(ids).size).toBe(ids.length);

    expect(
      iconed.filter((hero) => !ROSTER_ICONS.get(hero.id)?.includes(`_${hero.gameId}001.`)),
    ).toEqual([]);
  });
});

describe("resolveHero", () => {
  it("turns the placeholder stored for Nightcrawler into Nightcrawler, not a red 'Hero 1068'", () => {
    expect(
      resolveHero({ id: "hero-1068", name: "Hero 1068", role: "Duelist", portraitUrl: "" }),
    ).toEqual({
      id: "nightcrawler",
      name: "Nightcrawler",
      role: "Strategist",
      portraitUrl: ROSTER_ICONS.get("nightcrawler"),
    });
  });

  it("turns a placeholder for a hero we haven't listed into a typed unknown with no internal id in view", () => {
    const hero = resolveHero({
      id: "hero-1099",
      name: "Hero 1099",
      role: "Duelist",
      portraitUrl: "",
    });

    expect(hero).toEqual({
      id: "hero-1099",
      name: UNKNOWN_HERO_NAME,
      role: null,
      portraitUrl: null,
      unknown: true,
    });

    expect(hero.name).not.toMatch(/\d/);
  });

  it("leaves a hero mrvl named itself alone, even one the roster lacks", () => {
    const named = {
      id: "next-hero",
      name: "Next Hero",
      role: "Vanguard",
      portraitUrl: "/images/heros/next-hero_avatar.webp",
    };

    expect(resolveHero(named)).toBe(named);
  });
});

describe("isUnrecordedHero", () => {
  it("is only mrvl's hero-0 for a ban it didn't capture", () => {
    expect(isUnrecordedHero({ id: "hero-0" })).toBe(true);
    expect(isUnrecordedHero({ id: "hero-1068" })).toBe(false);
  });
});
