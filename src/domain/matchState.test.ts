import { describe, expect, it } from "vitest";

import { aMap, aMatch } from "../../test/builders";
import { LIVE_WINDOW_MS, matchState } from "./matchState";

const START = Date.parse("2026-10-16T20:00:00.000Z");
const MINUTE = 60_000;

describe("matchState", () => {
  it("finishes a Bo5 as soon as one side reaches three maps", () => {
    const m = aMatch({ maps: [aMap(1, 1), aMap(2, 2), aMap(3, 1), aMap(4, 1), aMap(5, 0)] });
    expect(matchState(m, START + 90 * MINUTE)).toMatchObject({
      status: "finished",
      wins1: 3,
      wins2: 1,
      winner: 1,
    });
  });

  it("is live once the start time passes even before a map is recorded", () => {
    expect(matchState(aMatch(), START + MINUTE).status).toBe("live");
  });

  it("is live as soon as a map result appears, even before the listed start", () => {
    expect(matchState(aMatch({ maps: [aMap(1, 2)] }), START - 10 * MINUTE).status).toBe("live");
  });

  it("stays upcoming while an opponent is TBD", () => {
    expect(matchState(aMatch({ team2: null }), START + MINUTE).status).toBe("upcoming");
  });

  it("stops calling an abandoned series live after the live window", () => {
    const m = aMatch({ bestOf: 3, maps: [aMap(1, 2)] });
    expect(matchState(m, START + LIVE_WINDOW_MS + MINUTE).status).toBe("finished");
  });

  it("respects Liquipedia's explicit finished flag", () => {
    expect(matchState(aMatch({ markedFinished: true }), START - MINUTE).status).toBe("finished");
  });

  it("tells a walkover, an unfinished marked series and an abandoned one apart", () => {
    const at = START + LIVE_WINDOW_MS + MINUTE;
    expect(
      [
        aMatch({ markedFinished: true }),
        aMatch({ markedFinished: true, maps: [aMap(1, 1)] }),
        aMatch(),
        aMatch({ maps: [aMap(1, 1), aMap(2, 1), aMap(3, 1)] }),
      ].map((m) => matchState(m, at).finishedBy),
    ).toEqual(["walkover", "marked", "abandoned", "maps"]);
  });

  it("is upcoming before the start with no maps", () => {
    expect(matchState(aMatch(), START - MINUTE).status).toBe("upcoming");
  });
});
