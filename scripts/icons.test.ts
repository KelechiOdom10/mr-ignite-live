import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import config from "../void.config";

const PNG_SIGNATURE = "89504e470d0a1a0a";

const iconLinks = (config.head?.link ?? []).filter(
  (entry) => entry.rel === "icon" || entry.rel === "apple-touch-icon",
);

function publicFile(href: string): Buffer {
  return readFileSync(`public${href}`);
}

/** A PNG's width and height sit together at the start of its IHDR chunk. */
function pngSize(png: Buffer): [number, number] {
  return [png.readUInt32BE(16), png.readUInt32BE(20)];
}

// A missing or unreadable icon is a 404 in every reader's console and a blank tab, so assert the files
// the head names and the sizes packed inside the ico.
describe("icons", () => {
  it("names the SVG first, then the ico and the touch icon", () => {
    expect(iconLinks.map((entry) => [entry.rel, entry.href])).toEqual([
      ["icon", "/favicon.svg"],
      ["icon", "/favicon.ico"],
      ["apple-touch-icon", "/apple-touch-icon.png"],
    ]);
  });

  it("serves a file for every icon the head names", () => {
    for (const entry of iconLinks) expect(publicFile(entry.href).byteLength).toBeGreaterThan(0);
  });

  it("packs 16x16 and 32x32 PNGs into the ico browsers fall back to", () => {
    const ico = publicFile("/favicon.ico");
    const count = ico.readUInt16LE(4);

    const entries = Array.from({ length: count }, (_, index) => {
      const base = 6 + index * 16;
      const offset = ico.readUInt32LE(base + 12);

      return {
        declared: [ico.readUInt8(base), ico.readUInt8(base + 1)],
        png: pngSize(ico.subarray(offset)),
        isPng: ico.subarray(offset, offset + 8).toString("hex") === PNG_SIGNATURE,
      };
    });

    expect(ico.readUInt16LE(2)).toBe(1);
    expect(entries).toEqual([
      { declared: [16, 16], png: [16, 16], isPng: true },
      { declared: [32, 32], png: [32, 32], isPng: true },
    ]);
  });

  it("ships a 180x180 touch icon, the size iOS asks for", () => {
    expect(pngSize(publicFile("/apple-touch-icon.png"))).toEqual([180, 180]);
  });
});
