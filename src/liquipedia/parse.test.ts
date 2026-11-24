import { describe, expect, it } from "vitest";
import { z } from "zod";

import { GroupSchema } from "@/domain/model";

import { liquipediaFixture, recordedWikitext } from "../../test/fixtures";
import {
  eventIdFor,
  parseEventInfo,
  parseGroups,
  parsePageMatches,
  parsePrizePool,
  parseTeamShortExpansion,
  TEAM_TEMPLATE_SEPARATOR,
} from "./parse";

const AMERICAS = "MR Ignite/2026/Stage 2/Americas";
const AMERICAS_GROUPS = "MR Ignite/2026/Stage 2/Americas/Group Stage";
const PACIFIC_ASIA = "MR Ignite/2026/Stage 2/Pacific/Asia";

describe("parsePageMatches on a recorded playoff bracket", () => {
  const matches = parsePageMatches(AMERICAS, recordedWikitext(AMERICAS));
  const byKey = (key: string) => matches.find((m) => m.id.endsWith(`_${key}`));

  it("finds every bracket match", () => {
    expect(matches).toHaveLength(14);
  });

  it("builds URL-safe ids without the round comment that follows the bracket id", () => {
    for (const m of matches) expect(m.id).toMatch(/^[A-Za-z0-9]+_R\d+M\d+$/);
  });

  it("labels rounds from the preceding comment", () => {
    expect(byKey("R1M1")?.round).toBe("Upper Bracket Quarterfinals");
    expect(byKey("R4M1")?.round).toBe("Upper Bracket Final");
  });

  it("reads a finished series", () => {
    const m = byKey("R1M1");
    expect(m?.team1?.name).toBe("FlyQuest");
    expect(m?.team2?.name).toBe("Dreamland");
    expect(m?.bestOf).toBe(5);
    expect(m?.startsAt).toBe("2026-10-15T20:00:00.000Z");
    expect(m?.maps.map((x) => x.winner)).toEqual([1, 1, 1]);
    expect(m?.maps[0]).toMatchObject({ map: "Krakoa", score1: 2, score2: 0 });
  });

  it("keeps unplayed map slots with no winner", () => {
    const maps = byKey("R2M2")?.maps ?? [];
    expect(maps).toHaveLength(5);
    expect(maps[0]?.winner).toBe(1);
    expect(maps.slice(1).every((x) => x.winner === 0 && x.score1 === null)).toBe(true);
  });

  it("reads an empty opponent as TBD (null)", () => {
    expect(byKey("R4M1")?.team2).toBeNull();
  });
});

describe("parsePageMatches on a recorded group stage", () => {
  const matches = parsePageMatches(AMERICAS_GROUPS, recordedWikitext(AMERICAS_GROUPS));

  it("files group matches under the parent event", () => {
    expect(new Set(matches.map((m) => m.eventId))).toEqual(new Set([AMERICAS]));
    expect(matches.every((m) => m.phase === "Group Stage")).toBe(true);
  });

  it("uses the matchlist title as the round", () => {
    expect(matches[0]?.round).toBe("Week 1 Day 1");
    expect(matches).toHaveLength(30);
  });
});

describe("parsePageMatches on the recorded Grand Finals pages", () => {
  const file = "grand-finals-matches.json";
  const title = "MR Ignite/2026/Grand Finals";
  const groupTitle = "MR Ignite/2026/Grand Finals/Group Stage";

  const playoffs = parsePageMatches(title, recordedWikitext(title, file));

  const groups = parsePageMatches(groupTitle, recordedWikitext(groupTitle, file));

  it('gives every match a start time, though the page writes dates as "November 23, 2026"', () => {
    expect(playoffs).toHaveLength(14);
    expect(groups).toHaveLength(30);
    expect([...playoffs, ...groups].filter((m) => m.startsAt === null)).toEqual([]);
  });

  it("converts the CET kick-off to UTC", () => {
    expect(groups[0]?.startsAt).toBe("2026-11-23T13:00:00.000Z");
    expect(playoffs.find((m) => m.id.endsWith("_R1M1"))?.startsAt).toBe("2026-11-27T11:00:00.000Z");
  });
});

describe("parseGroups on the recorded Grand Finals group stage", () => {
  const title = "MR Ignite/2026/Grand Finals/Group Stage";
  const text = recordedWikitext(title, "grand-finals-matches.json");

  it("reads each group's match lists and how many places advance, filed under the parent event", () => {
    expect(parseGroups(title, text)).toEqual([
      {
        eventId: "MR Ignite/2026/Grand Finals",
        title: "Group A",
        matchGroups: ["fotbOpL194", "urVIIppQbo", "u22gnFC1Hy"],
        advance: 4,
        teams: [
          "Aconyx",
          "FlyQuest",
          "Gen.G Esports",
          "Natus Vincere",
          "aimerz Esports",
          "Swamp Gaming",
        ],
        tiebreakers: ["matchwins", "matchlosses", "h2hlegacy.matchwins", "gamediff"],
      },
      {
        eventId: "MR Ignite/2026/Grand Finals",
        title: "Group B",
        matchGroups: ["FzNxVpYvsF", "OiUobQFvdc", "k0E5UklMYk"],
        advance: 4,
        teams: ["100 Thieves", "Monarch", "RAD", "Reject", "Liquid Citadel", "Virtus.pro"],
        tiebreakers: ["matchwins", "matchlosses", "h2hlegacy.matchwins", "gamediff"],
      },
    ]);
  });

  it("finds every group's match lists among the parsed matches", () => {
    const ids = new Set(parseGroups(title, text).flatMap((g) => g.matchGroups));
    const lists = parsePageMatches(title, text).map((m) => m.id.slice(0, m.id.indexOf("_")));
    expect(lists.every((list) => ids.has(list))).toBe(true);
  });

  it("keeps the order the page lists its tiebreakers in, so a different order can be refused", () => {
    const swapped = text.replace(
      "{{Json|matchwins|matchlosses|h2hlegacy.matchwins|gamediff}}",
      "{{Json|matchwins|matchlosses|gamediff|h2hlegacy.matchwins}}",
    );

    expect(parseGroups(title, swapped)[0]?.tiebreakers).toEqual([
      "matchwins",
      "matchlosses",
      "gamediff",
      "h2hlegacy.matchwins",
    ]);
  });

  it("drops a group whose cutoff does not start at first place", () => {
    const odd = text.replace("bg=1-4=up, 5-6=down", "bg=2-4=up");

    expect(parseGroups(title, odd).map((g) => g.title)).toEqual(["Group B"]);
  });

  it("reads a cutoff written as several ranges, and drops one with a gap rather than under-count it", () => {
    const split = text.replace("bg=1-4=up, 5-6=down", "bg=1-2=up, 3-4=up, 5-6=down");
    const gap = text.replace("bg=1-4=up, 5-6=down", "bg=1-2=up, 4-5=up");

    expect(parseGroups(title, split).find((g) => g.title === "Group A")?.advance).toBe(4);
    expect(parseGroups(title, gap).map((g) => g.title)).toEqual(["Group B"]);
  });

  it("keeps a roster slot the page leaves blank, so a shorter roster cannot look complete", () => {
    const blank = text.replace("|{{TeamOpponent|Swamp Gaming}}\n", "|\n");
    const teams = parseGroups(title, blank).find((g) => g.title === "Group A")?.teams;

    expect(teams).toHaveLength(6);
    expect(teams).toContain("");
  });

  it("drops only the group whose cutoff range runs backwards, and never writes an invalid one", () => {
    const reversed = text.replace("bg=1-4=up, 5-6=down", "bg=1-0=up, 5-6=down");
    const groups = parseGroups(title, reversed);

    expect(groups.map((g) => g.title)).toEqual(["Group B"]);
    expect(groups.every((g) => GroupSchema.safeParse(g).success)).toBe(true);
  });

  it("reads a blank tiebreaker as no rules at all, which the table then refuses", () => {
    const blankRule = text.replace(
      "{{Json|matchwins|matchlosses|h2hlegacy.matchwins|gamediff}}",
      "{{Json|matchwins||h2hlegacy.matchwins|gamediff}}",
    );

    const groups = parseGroups(title, blankRule);

    expect(groups.find((g) => g.title === "Group A")?.tiebreakers).toEqual([]);
    expect(groups.every((g) => GroupSchema.safeParse(g).success)).toBe(true);
  });

  it("returns no groups for a page that has no standings", () => {
    expect(parseGroups(AMERICAS_GROUPS, recordedWikitext(AMERICAS_GROUPS))).toEqual([]);
  });
});

describe("parsePageMatches awards", () => {
  const list = (match: string) =>
    "{{Matchlist|id=abc|title=Day 1\n|M1={{Match|bestof=3|opponent1={{TeamOpponent|A}}|opponent2={{TeamOpponent|B}}" +
    match +
    "}}\n}}";

  const parse = (match: string) =>
    parsePageMatches("MR Ignite/2026/Grand Finals/Group Stage", list(match))[0];

  it("keeps who a finished series was awarded to when no map was played", () => {
    expect(parse("|finished=true|winner=2")?.awarded).toBe(2);
  });

  it("ignores a winner on a series the page does not mark finished", () => {
    expect(parse("|winner=2")?.awarded).toBeUndefined();
  });

  it("leaves a finished series with no named winner unresolved", () => {
    expect(parse("|finished=true")?.awarded).toBeUndefined();
  });
});

describe("parseEventInfo", () => {
  it("reads the infobox", () => {
    const event = parseEventInfo(AMERICAS, recordedWikitext(AMERICAS), "2026-10-16T22:22:40Z");
    expect(event).toMatchObject({
      name: "Ignite 2026 Stage 2: Americas",
      ticker: "MRIG 2026 S2: AMER",
      region: "Americas",
      stage: "Stage 2",
      startDate: "2026-09-18",
      endDate: "2026-10-18",
      prizePoolUsd: 200000,
      liquipediaUrl: "https://liquipedia.net/marvelrivals/MR_Ignite/2026/Stage_2/Americas",
      iconFile: "MRIG Americas allmode.png",
    });
  });

  it("names Pacific sub-regions so the Pacific filter still matches them", () => {
    const title = "MR Ignite/2026/Stage 2/Pacific/Asia";
    expect(parseEventInfo(title, recordedWikitext(title), "2026-10-04T00:00:00Z")?.region).toBe(
      "Pacific Asia",
    );
  });

  it("returns no event for a group stage subpage", () => {
    expect(parseEventInfo(AMERICAS_GROUPS, "", "2026-10-04T00:00:00Z")).toBeNull();
    expect(eventIdFor(AMERICAS_GROUPS)).toBe(AMERICAS);
  });

  it.each([
    ["MR Ignite/2026/Grand Finals/Additional Data", "a tab of the Grand Finals page"],
    ["MR Ignite/2026/Grand Finals/Qualification", "a tab of the Grand Finals page"],
    ["MR Ignite/2026/Mid-Season Qualifiers/Oceania", "a page marked for deletion"],
    ["MR Ignite/2026", "the series page"],
  ])("returns no event for %s, which has no league infobox (%s)", (title) => {
    const text = recordedWikitext(title, "contents-grand-finals.json");
    expect(parseEventInfo(title, text, "2026-11-19T00:00:00Z")).toBeNull();
  });

  it("carries the prize distribution parsed from the same page", () => {
    const event = parseEventInfo(AMERICAS, recordedWikitext(AMERICAS), "2026-10-16T22:22:40Z");
    expect(event?.prizes).toHaveLength(12);
  });
});

describe("parsePrizePool on a recorded team prize pool", () => {
  const prizes = parsePrizePool(recordedWikitext(AMERICAS));

  it("numbers every place, including the ones a shared slot covers", () => {
    expect(prizes.map((prize) => prize.place)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it("repeats a shared slot's prize for each of its places", () => {
    expect(prizes[4]).toEqual({ place: 5, prizeUsd: 12000, count: 2, team: null });
    expect(prizes[5]).toEqual({ place: 6, prizeUsd: 12000, count: 2, team: null });
  });

  it("keeps each slot's size instead of merging neighbouring slots that pay the same", () => {
    expect(prizes.slice(8).map((prize) => [prize.place, prize.count])).toEqual([
      [9, 2],
      [10, 2],
      [11, 2],
      [12, 2],
    ]);
  });

  it("adds up to the prize pool in the infobox", () => {
    const total = prizes.reduce((sum, prize) => sum + prize.prizeUsd, 0);
    expect(total).toBe(200000);
  });

  it("shows a slot with no opponent as TBD", () => {
    expect(prizes.every((prize) => prize.team === null)).toBe(true);
  });

  it("keeps counting places through qualification-only slots with no prize", () => {
    const pacific = parsePrizePool(recordedWikitext(PACIFIC_ASIA));
    expect(pacific.map((prize) => prize.place)).toEqual([7, 8]);
    expect(pacific.every((prize) => prize.prizeUsd === 3750)).toBe(true);
  });
});

describe("parseTeamShortExpansion on a recorded expansion", () => {
  const body = z
    .object({ expandtemplates: z.object({ wikitext: z.string() }) })
    .parse(liquipediaFixture("teamshort.json"));

  const [known, unknown, allmode] = body.expandtemplates.wikitext
    .split(TEAM_TEMPLATE_SEPARATOR)
    .map(parseTeamShortExpansion);

  it("reads the short tag and both logo variants", () => {
    expect(known).toEqual({
      short: "TLC",
      logoDarkFile: "Team Liquid Citadel darkmode.png",
      logoLightFile: "Team Liquid Citadel lightmode.png",
    });
  });

  it("returns nothing for a team with no template, so the caller can fall back", () => {
    expect(unknown).toEqual({ short: null, logoDarkFile: null, logoLightFile: null });
  });

  it("uses an allmode logo when there's no light/dark pair", () => {
    expect(allmode?.logoDarkFile).toBeNull();
    expect(allmode?.logoLightFile).toBe("Everlast allmode.png");
  });
});
