import { describe, expect, it } from "vitest";

import { SPOILER_COOKIE, spoilersHiddenIn, spoilerCookie } from "./spoilerCookie";

describe("spoilersHiddenIn", () => {
  it("reads the preference from a request with several cookies, so the server renders scores hidden", () => {
    expect(spoilersHiddenIn(`theme=dark; ${SPOILER_COOKIE}=1; other=x`)).toBe(true);
  });

  it("shows scores when the cookie is absent, off, or only a prefix matches", () => {
    expect(spoilersHiddenIn(undefined)).toBe(false);
    expect(spoilersHiddenIn(`${SPOILER_COOKIE}=0`)).toBe(false);
    expect(spoilersHiddenIn(`x${SPOILER_COOKIE}=1`)).toBe(false);
  });

  it("keeps reading the cookie readers already have, so a rename can't silently show spoilers", () => {
    expect(spoilersHiddenIn("ignite-live-hide-spoilers=1")).toBe(true);
  });

  it("round-trips through the cookie it writes", () => {
    expect(spoilersHiddenIn(spoilerCookie(true).split(";")[0])).toBe(true);
    expect(spoilersHiddenIn(spoilerCookie(false).split(";")[0])).toBe(false);
  });
});
