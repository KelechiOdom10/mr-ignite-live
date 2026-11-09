import { describe, expect, it } from "vitest";

import { heroDisplayName } from "./heroes";

describe("heroDisplayName", () => {
  it("title-cases the API's capitals without capitalising joining words or hyphen halves wrongly", () => {
    expect(heroDisplayName("JEFF THE LAND SHARK")).toBe("Jeff the Land Shark");
    expect(heroDisplayName("THE THING")).toBe("The Thing");
    expect(heroDisplayName("SPIDER-MAN")).toBe("Spider-Man");
    expect(heroDisplayName("CLOAK & DAGGER")).toBe("Cloak & Dagger");
  });
});
