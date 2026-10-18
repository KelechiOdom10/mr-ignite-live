import { describe, expect, it } from "vitest";

import { draftHref } from "./draftHref";

describe("draftHref", () => {
  it("writes only the filters that are set, so Reset is plain /drafts", () => {
    expect(draftHref({ eventId: null, map: null, mode: null })).toBe("/drafts");
    expect(draftHref({ eventId: "MR Ignite/2026/Stage 2", map: null, mode: "Convoy" })).toBe(
      "/drafts?event=MR+Ignite%2F2026%2FStage+2&mode=Convoy",
    );
  });
});
