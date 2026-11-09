import { describe, expect, it } from "vitest";

import { aMatch } from "../../test/builders";
import { participantsOf } from "./participants";

describe("participantsOf", () => {
  it("lists each team once across the event, sorted by name", () => {
    const participants = participantsOf([
      aMatch({
        id: "a",
        team1: { name: "Swamp Gaming", short: "SG" },
        team2: { name: "100 Thieves", short: "100T" },
      }),
      aMatch({
        id: "b",
        team1: { name: "100 Thieves", short: "100T" },
        team2: { name: "FlyQuest", short: "FLY" },
      }),
    ]);

    expect(participants.map((team) => team.name)).toEqual([
      "100 Thieves",
      "FlyQuest",
      "Swamp Gaming",
    ]);
  });

  it("leaves out a TBD side so the grid only lists teams the bracket knows", () => {
    const participants = participantsOf([
      aMatch({ team1: null, team2: { name: "FlyQuest", short: "FLY" } }),
    ]);

    expect(participants.map((team) => team.name)).toEqual(["FlyQuest"]);
  });

  it("is empty before the bracket names any team", () => {
    expect(participantsOf([aMatch({ team1: null, team2: null })])).toEqual([]);
  });
});
