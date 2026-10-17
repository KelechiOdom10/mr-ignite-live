import { describe, expect, it } from "vitest";

import { imageSource } from "./imageSource";

describe("imageSource", () => {
  it("rejects an encoded dot-dot path that fetch would resolve outside the image folder", () => {
    // fetch turns %2e%2e into "..", so this reached Liquipedia's API through the proxy.
    expect(
      imageSource("https://liquipedia.net/commons/images/%2e%2e/%2e%2e/marvelrivals/api.php"),
    ).toBeNull();
  });

  it("rejects look-alike hosts, other ports and credentials", () => {
    expect(imageSource("https://liquipedia.net.evil.example/commons/images/a.png")).toBeNull();
    expect(imageSource("https://liquipedia.net:8443/commons/images/a.png")).toBeNull();
    expect(imageSource("https://x@liquipedia.net/commons/images/a.png")).toBeNull();
    expect(imageSource("http://liquipedia.net/commons/images/a.png")).toBeNull();
    expect(imageSource("not a url")).toBeNull();
  });

  it("allows RivalsIsland assets but not the API host, so the proxy can't reach paid endpoints", () => {
    expect(
      imageSource("https://assets.rivalsisland.com/v1/abc/heroes/1011_regular.png")?.href,
    ).toBe("https://assets.rivalsisland.com/v1/abc/heroes/1011_regular.png");
    expect(imageSource("https://api.rivalsisland.com/v1/players/1/career")).toBeNull();
    expect(imageSource("https://assets.rivalsisland.com/docs/openapi.json")).toBeNull();
  });

  it("allows Liquipedia commons and mrvl images, dropping any fragment", () => {
    expect(
      imageSource("https://liquipedia.net/commons/images/thumb/d/d0/Dreamland_allmode.png#x")?.href,
    ).toBe("https://liquipedia.net/commons/images/thumb/d/d0/Dreamland_allmode.png");
    expect(imageSource("https://www.mrvl.net/images/maps/midtown.webp")?.href).toBe(
      "https://www.mrvl.net/images/maps/midtown.webp",
    );
  });
});
