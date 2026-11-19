import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { z } from "zod";

import { captureIdentity, Driver, reachable, SIZES } from "./cdp";
import { discover, surfaces } from "./surfaces";

const TYPE_SCALE = [11, 12, 14, 16, 18, 20, 24, 32, 40];

const MEASURE = String.raw`(() => {
  const SCALE = [0, 1, 2, 4, 8, 12, 16, 24, 32, 48, 64, 96];
  const vw = window.innerWidth,
    vh = window.innerHeight;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const colorCache = new Map();
  const parse = (css) => {
    if (colorCache.has(css)) return colorCache.get(css);
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = "#000";
    ctx.fillStyle = css;
    ctx.fillRect(0, 0, 1, 1);
    const d = ctx.getImageData(0, 0, 1, 1).data;
    const color = [d[0], d[1], d[2], d[3] / 255];
    colorCache.set(css, color);
    return color;
  };
  const over = (top, under) => {
    const a = top[3] + under[3] * (1 - top[3]);
    if (a === 0) return [0, 0, 0, 0];
    return [0, 1, 2]
      .map((i) => (top[i] * top[3] + under[i] * under[3] * (1 - top[3])) / a)
      .concat([a]);
  };
  const lin = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const lum = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
  const ratio = (a, b) => {
    const x = lum(a),
      y = lum(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  };
  const label = (el) => {
    const cls = (typeof el.className === "string" ? el.className : "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 3)
      .join(".");
    return el.tagName.toLowerCase() + (cls ? "." + cls : "");
  };
  const visible = (el, cs) => {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height || cs.visibility === "hidden" || cs.display === "none") return false;
    for (let n = el; n; n = n.parentElement) {
      const style = getComputedStyle(n);
      if (
        parseFloat(style.opacity) === 0 ||
        style.display === "none" ||
        style.visibility === "hidden"
      )
        return false;
    }
    return true;
  };
  const hueBucket = (c) => {
    const r = c[0] / 255,
      g = c[1] / 255,
      b = c[2] / 255;
    const mx = Math.max(r, g, b),
      mn = Math.min(r, g, b),
      l = (mx + mn) / 2,
      d = mx - mn;
    if (d === 0) return null;
    const s = d / (1 - Math.abs(2 * l - 1));
    if (s < 0.3 || l < 0.12 || l > 0.9) return null;
    let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h = (h * 60 + 360) % 360;
    const names = ["red", "orange", "yellow", "green", "teal", "blue", "violet", "pink"];
    return names[Math.floor(((h + 22.5) % 360) / 45)];
  };
  const bgOf = (el) => {
    const layers = [];
    let n = el;
    let unknown = false;
    while (n && n.nodeType === 1) {
      const cs = getComputedStyle(n);
      if (cs.backgroundImage && cs.backgroundImage !== "none") unknown = true;
      const c = parse(cs.backgroundColor);
      if (c[3] > 0) layers.push(c);
      if (c[3] === 1) break;
      n = n.parentElement;
    }
    let out = [255, 255, 255, 1];
    for (let i = layers.length - 1; i >= 0; i--) out = over(layers[i], out);
    return { color: out, unknown };
  };

  const bgStack = (el, r) => {
    const x = r.left + r.width / 2,
      y = r.top + r.height / 2;
    if (x < 0 || y < 0 || x >= vw || y >= vh) return null;
    const stack = document.elementsFromPoint(x, y);
    const at = stack.indexOf(el);
    if (at < 0) return null;
    const layers = [];
    let unknown = false;
    for (const n of stack.slice(at)) {
      const cs = getComputedStyle(n);
      if (cs.backgroundImage && cs.backgroundImage !== "none") unknown = true;
      const c = parse(cs.backgroundColor);
      if (c[3] > 0) layers.push(c);
      if (c[3] === 1) break;
    }
    let out = [255, 255, 255, 1];
    for (let i = layers.length - 1; i >= 0; i--) out = over(layers[i], out);
    return { color: out, unknown };
  };
  const sizes = new Map(),
    foldSizes = new Map(),
    hues = new Map(),
    contrast = [];
  let chars = 0,
    foldChars = 0,
    checked = 0,
    unknownBg = 0;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    const text = node.textContent.trim();
    if (!text) continue;
    const el = node.parentElement;
    if (!el || el.closest("script,style,noscript,[data-tabs-label]")) continue;
    const cs = getComputedStyle(el);
    if (!visible(el, cs)) continue;
    const r = el.getBoundingClientRect();
    const size = parseFloat(cs.fontSize),
      weight = Number(cs.fontWeight) || 400;
    const lh = cs.lineHeight === "normal" ? null : parseFloat(cs.lineHeight);
    const key =
      size + "/" + weight + "/" + (lh === null ? "normal" : Math.round((lh / size) * 100) / 100);
    sizes.set(key, (sizes.get(key) || 0) + text.length);
    chars += text.length;
    const inFold = r.top < vh && r.bottom > 0;
    if (inFold) {
      foldSizes.set(size, (foldSizes.get(size) || 0) + text.length);
      foldChars += text.length;
    }
    const fg = parse(cs.color);
    const bgInfo = bgStack(el, r) || bgOf(el);
    if (bgInfo.unknown || el.closest('[role="tab"][aria-selected="true"]')) {
      unknownBg++;
    } else {
      const eff = over(fg, bgInfo.color);
      const cr = ratio(eff, bgInfo.color);
      const large = size >= 24 || (size >= 18.66 && weight >= 700);
      checked++;
      if (cr < (large ? 3 : 4.5))
        contrast.push({
          ratio: Math.round(cr * 100) / 100,
          need: large ? 3 : 4.5,
          text: text.slice(0, 40),
          size,
          el: label(el),
        });
    }
    if (inFold) {
      const b = hueBucket(parse(cs.color));
      if (b) {
        const h = hues.get(b) || { text: 0, fill: 0, border: 0, samples: [] };
        h.text += text.length;
        if (h.samples.length < 3) h.samples.push(label(el) + " “" + text.slice(0, 18) + "”");
        hues.set(b, h);
      }
    }
  }
  const blockGaps = [];
  for (const parent of document.querySelectorAll("main, main section, main [class*=space-y]")) {
    const blocks = Array.from(parent.children).filter((el) => visible(el, getComputedStyle(el)));
    for (let i = 1; i < blocks.length; i++) {
      const before = blocks[i - 1].getBoundingClientRect(),
        after = blocks[i].getBoundingClientRect();
      if (Math.abs(before.left - after.left) > 2 || after.top < before.bottom) continue;
      const gap = Math.round((after.top - before.bottom) * 10) / 10;
      if (gap > 0 && gap < 128)
        blockGaps.push({
          gap,
          onScale: SCALE.some((v) => Math.abs(v - gap) <= 1),
          el: label(parent),
        });
    }
  }
  const all = Array.from(document.body.querySelectorAll("*")).slice(0, 6000);
  const spacing = new Map();
  let spacingTotal = 0;
  const addSpace = (prop, raw, el) => {
    const v = Math.abs(parseFloat(raw));
    if (!isFinite(v) || raw === "auto" || raw === "normal") return;
    spacingTotal++;
    if (SCALE.includes(v)) return;
    const k = prop + " " + v + "px";
    const e = spacing.get(k) || { count: 0, samples: [] };
    e.count++;
    if (e.samples.length < 2) e.samples.push(label(el));
    spacing.set(k, e);
  };
  for (const el of all) {
    const cs = getComputedStyle(el);
    if (!visible(el, cs)) continue;
    const r = el.getBoundingClientRect();
    if (r.top < vh && r.bottom > 0) {
      const bg = parse(cs.backgroundColor);
      const bb = bg[3] > 0.3 ? hueBucket(bg) : null;
      if (bb) {
        const h = hues.get(bb) || { text: 0, fill: 0, border: 0, samples: [] };
        h.fill++;
        if (h.samples.length < 3) h.samples.push(label(el) + " fill");
        hues.set(bb, h);
      }
      if (parseFloat(cs.borderTopWidth) > 0) {
        const bd = parse(cs.borderTopColor);
        const bc = bd[3] > 0.3 ? hueBucket(bd) : null;
        if (bc) {
          const h = hues.get(bc) || { text: 0, fill: 0, border: 0, samples: [] };
          h.border++;
          if (h.samples.length < 3) h.samples.push(label(el) + " border");
          hues.set(bc, h);
        }
      }
    }
    for (const p of ["paddingTop", "paddingRight", "paddingBottom", "paddingLeft"]) {
      if (cs[p] !== "0px") addSpace("padding", cs[p], el);
    }
    for (const p of ["rowGap", "columnGap"]) {
      if (cs[p] !== "normal" && cs[p] !== "0px") addSpace("gap", cs[p], el);
    }
    for (const p of ["marginTop", "marginBottom"]) {
      if (cs[p] !== "0px" && cs.display !== "inline") addSpace("margin", cs[p], el);
    }
  }

  const interactive = Array.from(
    document.querySelectorAll(
      'a[href], button, [role="tab"], [role="button"], [role="option"], [role="menuitem"], input, select, summary, [role="switch"]',
    ),
  );
  const targets = [];
  for (const el of interactive) {
    const cs = getComputedStyle(el);
    if (!visible(el, cs)) continue;
    const inline =
      cs.display === "inline" &&
      el.tagName === "A" &&
      el.parentElement &&
      /\S/.test(
        Array.from(el.parentElement.childNodes)
          .filter((n) => n.nodeType === 3)
          .map((n) => n.textContent)
          .join(""),
      );
    if (inline) continue;
    const r = el.getBoundingClientRect();
    if (r.bottom < 0 || r.top > document.documentElement.scrollHeight) continue;
    if (el.closest('[role="listbox"]') && el.getAttribute("role") !== "option") continue;
    let w = r.width;
    let h = r.height;
    for (const pseudo of ["::before", "::after"]) {
      const ps = getComputedStyle(el, pseudo);
      if (ps.position !== "absolute" || ps.content === "none") continue;
      w = Math.max(w, parseFloat(ps.width) || 0);
      h = Math.max(h, parseFloat(ps.height) || 0);
    }
    targets.push({
      w: Math.round(w),
      h: Math.round(h),
      name: (
        el.getAttribute("aria-label") ||
        el.textContent ||
        el.getAttribute("href") ||
        el.tagName
      )
        .trim()
        .replace(/\s+/g, " ")
        .slice(0, 30),
      el: label(el),
    });
  }

  const clipped = (el) => {
    let n = el.parentElement;
    while (n && n !== document.body) {
      const o = getComputedStyle(n).overflowX;
      if (o === "auto" || o === "scroll" || o === "hidden" || o === "clip") return true;
      n = n.parentElement;
    }
    return false;
  };
  const offenders = [];
  for (const el of all) {
    const cs = getComputedStyle(el);
    if (!visible(el, cs)) continue;
    const r = el.getBoundingClientRect();
    if (r.right > vw + 1 && !clipped(el) && cs.position !== "fixed") {
      offenders.push({ el: label(el), right: Math.round(r.right) });
      if (offenders.length >= 5) break;
    }
  }

  const cardEl = document.querySelector('main a[href^="/match/"]');
  let card = null;
  if (cardEl) {
    const cs2 = new Map();
    const w = document.createTreeWalker(cardEl, NodeFilter.SHOW_TEXT);
    let n2;
    while ((n2 = w.nextNode())) {
      const t = n2.textContent.trim();
      if (!t) continue;
      const c = getComputedStyle(n2.parentElement);
      const k = parseFloat(c.fontSize) + "/" + c.fontWeight;
      cs2.set(k, (cs2.get(k) || 0) + t.length);
    }
    const r = cardEl.getBoundingClientRect();
    card = {
      height: Math.round(r.height),
      width: Math.round(r.width),
      styles: Array.from(cs2.entries()).map(([k, c]) => k + " ×" + c),
    };
  }
  const matchRowsInFold = Array.from(document.querySelectorAll('main a[href^="/match/"]')).filter(
    (a) => {
      const r = a.getBoundingClientRect();
      return r.top < vh && r.bottom > 0 && r.width > 0;
    },
  ).length;

  return {
    viewport: { w: vw, h: vh },
    pageHeight: document.documentElement.scrollHeight,
    scrollWidth: document.documentElement.scrollWidth,
    sizes: Array.from(sizes.entries())
      .map(([k, c]) => ({ key: k, chars: c }))
      .sort((a, b) => b.chars - a.chars),
    chars,
    foldSizes: Array.from(foldSizes.entries())
      .map(([s, c]) => ({ size: s, chars: c }))
      .sort((a, b) => a.size - b.size),
    foldChars,
    spacing: Array.from(spacing.entries())
      .map(([k, e]) => ({ key: k, count: e.count, samples: e.samples }))
      .sort((a, b) => b.count - a.count),
    spacingTotal,
    blockGaps,
    contrast: { checked, unknownBg, failing: contrast.sort((a, b) => a.ratio - b.ratio) },
    hues: Array.from(hues.entries()).map(([h, v]) => ({
      hue: h,
      text: v.text,
      fill: v.fill,
      border: v.border,
      samples: v.samples,
    })),
    targets,
    offenders,
    card,
    matchRowsInFold,
  };
})()`;

const FOCUS = String.raw`(() => {
  const el = document.activeElement;

  if (!el || el === document.body) return null;

  const cs = getComputedStyle(el);
  const ring = (cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0) || cs.boxShadow !== "none";
  const name = (el.getAttribute("aria-label") || el.textContent || el.getAttribute("href") || el.tagName).trim().replace(/\s+/g, " ").slice(0, 30);

  return { ring, name, tag: el.tagName.toLowerCase() };
})()`;

const Measurement = z.object({
  viewport: z.object({ w: z.number(), h: z.number() }),
  pageHeight: z.number(),
  scrollWidth: z.number(),
  sizes: z.array(z.object({ key: z.string(), chars: z.number() })),
  chars: z.number(),
  foldSizes: z.array(z.object({ size: z.number(), chars: z.number() })),
  foldChars: z.number(),
  spacing: z.array(z.object({ key: z.string(), count: z.number(), samples: z.array(z.string()) })),
  spacingTotal: z.number(),
  blockGaps: z.array(z.object({ gap: z.number(), onScale: z.boolean(), el: z.string() })),
  contrast: z.object({
    checked: z.number(),
    unknownBg: z.number(),
    failing: z.array(
      z.object({
        ratio: z.number(),
        need: z.number(),
        text: z.string(),
        size: z.number(),
        el: z.string(),
      }),
    ),
  }),
  hues: z.array(
    z.object({
      hue: z.string(),
      text: z.number(),
      fill: z.number(),
      border: z.number(),
      samples: z.array(z.string()),
    }),
  ),
  targets: z.array(z.object({ w: z.number(), h: z.number(), name: z.string(), el: z.string() })),
  offenders: z.array(z.object({ el: z.string(), right: z.number() })),
  card: z
    .object({
      height: z.number(),
      width: z.number(),
      styles: z.array(z.string()),
    })
    .nullable(),
  matchRowsInFold: z.number(),
});

type Measurement = z.infer<typeof Measurement>;

const Focus = z.object({ ring: z.boolean(), name: z.string(), tag: z.string() }).nullable();

type Status = "pass" | "warn" | "fail";

interface Finding {
  rule: string;
  title: string;
  status: Status;
  detail: string;
}

interface Result {
  surface: string;
  size: string;
  findings: Finding[];
  measurement: Measurement;
}

function band(value: number, warnAt: number, failAt: number): Status {
  if (value >= failAt) return "fail";

  return value >= warnAt ? "warn" : "pass";
}

function sizeOf(key: string): number {
  return Number(key.split("/")[0]);
}

function evaluate(
  surface: string,
  sizeLabel: string,
  m: Measurement,
  focus: readonly z.infer<typeof Focus>[],
): Finding[] {
  const findings: Finding[] = [];
  const mobile = m.viewport.w < 600;

  const add = (rule: string, title: string, status: Status, detail: string) => {
    findings.push({ rule, title, status, detail });
  };

  const bySize = new Map<number, number>();

  for (const entry of m.sizes) {
    bySize.set(sizeOf(entry.key), (bySize.get(sizeOf(entry.key)) ?? 0) + entry.chars);
  }

  const offScale = [...bySize.entries()].filter(([size]) => !TYPE_SCALE.includes(size));

  add(
    "T1",
    "font sizes sit on the type scale " + TYPE_SCALE.join("/"),
    offScale.length === 0 ? "pass" : "fail",
    offScale.length === 0
      ? "all " + bySize.size + " sizes on scale"
      : "off scale: " +
          offScale.map(([size, chars]) => size + "px (" + chars + " chars)").join(", "),
  );

  const foldSizes = m.foldSizes.map((entry) => entry.size);

  add(
    "T2",
    "at most 5 distinct font sizes in the first viewport",
    band(foldSizes.length, 6, 7),
    foldSizes.length + " sizes: " + foldSizes.join(", ") + "px",
  );

  const tiny = [...bySize.entries()].filter(([size]) => size < 11);

  const elevenPx = [...bySize.entries()]
    .filter(([size]) => size === 11)
    .reduce((sum, [, chars]) => sum + chars, 0);

  add(
    "T3",
    "no text under 11px, and 11px under 15% of characters",
    tiny.length > 0 ? "fail" : elevenPx / Math.max(m.chars, 1) > 0.15 ? "warn" : "pass",
    tiny.length > 0
      ? "under 11px: " + tiny.map(([size, chars]) => size + "px (" + chars + " chars)").join(", ")
      : "11px is " + Math.round((elevenPx / Math.max(m.chars, 1)) * 100) + "% of characters",
  );

  if (m.card) {
    const sizes = new Set(m.card.styles.map((style) => style.split("/")[0]));
    const ranks = m.card.styles.length;

    add(
      "T4",
      "a match card uses at most 3 font sizes and 4 size+weight ranks",
      sizes.size > 3 || ranks > 4 ? "fail" : "pass",
      sizes.size + " sizes, " + ranks + " ranks: " + m.card.styles.join("; "),
    );
  }

  const offSpace = m.spacing.reduce((sum, entry) => sum + entry.count, 0);
  const share = offSpace / Math.max(m.spacingTotal, 1);

  add(
    "S1",
    "padding, gap and margin on the 4/8/12/16/24/32/48/64 scale (under 5% off)",
    share <= 0.05 ? "pass" : share <= 0.15 ? "warn" : "fail",
    Math.round(share * 100) +
      "% off scale (" +
      offSpace +
      " of " +
      m.spacingTotal +
      "); top: " +
      m.spacing
        .slice(0, 4)
        .map((entry) => entry.key + " ×" + entry.count)
        .join(", "),
  );

  const oddGaps = m.blockGaps.filter((gap) => !gap.onScale);

  add(
    "S2",
    "measured vertical block gaps follow the spacing scale (1px tolerance)",
    oddGaps.length === 0 ? "pass" : "warn",
    m.blockGaps.length +
      " gaps; off scale: " +
      (oddGaps.map((gap) => gap.gap + "px in " + gap.el).join("; ") || "none"),
  );

  const failing = m.contrast.failing;

  add(
    "C1",
    "text contrast at least 4.5:1 (3:1 for large text)",
    failing.length === 0 ? "pass" : "fail",
    failing.length === 0
      ? m.contrast.checked +
          " text runs checked, " +
          m.contrast.unknownBg +
          " skipped over gradients"
      : failing.length +
          " of " +
          m.contrast.checked +
          " below; worst: " +
          failing
            .slice(0, 3)
            .map((f) => f.ratio + ":1 “" + f.text + "” " + f.size + "px")
            .join(", "),
  );

  const hues = m.hues.filter((h) => h.text + h.fill + h.border >= 3);

  add(
    "C2",
    "at most 3 chromatic hues in the first viewport (accent, win, loss)",
    band(hues.length, 4, 5),
    hues.length === 0
      ? "none"
      : hues.map((h) => h.hue + " (" + h.samples.slice(0, 2).join(", ") + ")").join("; "),
  );

  add(
    "L1",
    "no horizontal overflow",
    m.scrollWidth > m.viewport.w ? "fail" : "pass",
    m.scrollWidth > m.viewport.w
      ? "page is " +
          m.scrollWidth +
          "px in a " +
          m.viewport.w +
          "px viewport; " +
          m.offenders.map((o) => o.el + " ends at " + o.right).join(", ")
      : "scrollWidth " + m.scrollWidth,
  );

  if (mobile) {
    const small = m.targets.filter((t) => Math.min(t.w, t.h) < 32);
    const medium = m.targets.filter((t) => Math.min(t.w, t.h) >= 32 && Math.min(t.w, t.h) < 44);

    add(
      "A1",
      "tap targets at least 44px (fail under 32px) at 390 wide",
      small.length > 0 ? "fail" : medium.length > 0 ? "warn" : "pass",
      m.targets.length +
        " controls; " +
        small.length +
        " under 32px, " +
        medium.length +
        " under 44px; smallest: " +
        [...m.targets]
          .sort((a, b) => Math.min(a.w, a.h) - Math.min(b.w, b.h))
          .slice(0, 3)
          .map((t) => "“" + t.name + "” " + t.w + "×" + t.h)
          .join(", "),
    );
  }

  const tabbed = focus.filter((entry) => entry !== null);

  if (!mobile && tabbed.length > 0) {
    const bare = tabbed.filter((entry) => !entry.ring);

    add(
      "A2",
      "sampled tab stops show a focus ring",
      bare.length === 0 ? "pass" : "fail",
      bare.length === 0
        ? tabbed.length + " tab stops, all ringed"
        : bare.length +
            " of " +
            tabbed.length +
            " without: " +
            bare.map((e) => "“" + e.name + "”").join(", "),
    );
  }

  if (surface.startsWith("matches-") && !surface.endsWith("filter") && !mobile) {
    add(
      "D1",
      "at least 8 matches visible in the first 900px of a matches list",
      m.matchRowsInFold >= 8 ? "pass" : m.matchRowsInFold >= 6 ? "warn" : "fail",
      m.matchRowsInFold + " matches in the fold at " + sizeLabel,
    );
  }

  return findings;
}

function readOptions(argv: readonly string[]) {
  const value = (flag: string) => {
    const index = argv.indexOf(flag);

    return index === -1 ? undefined : argv[index + 1];
  };

  const only = value("--only");

  return {
    base: (value("--base") ?? "http://localhost:5180").replace(/\/$/, ""),
    cdp: value("--cdp") ?? "http://127.0.0.1:9222",
    out: value("--out") ?? ".shots",
    only: only ? only.split(",").map((name) => name.trim()) : null,
    strict: argv.includes("--strict"),
  };
}

async function main(): Promise<void> {
  const options = readOptions(process.argv.slice(2));
  const index = await fetch(options.base + "/matches").catch(() => null);

  if (!index?.ok) {
    console.error(
      "Nothing is serving " +
        options.base +
        ". Start the dev server first (see scripts/shots.ts), then run this again.",
    );
    process.exitCode = 1;

    return;
  }

  if (!(await reachable(options.cdp + "/json/version"))) {
    console.error("Start headless Chrome with CDP first; see docs/design-review.md");
    process.exitCode = 1;

    return;
  }

  const driver = await Driver.open(options.cdp, false);
  const results: Result[] = [];

  try {
    const found = await discover(driver, options.base);

    const wanted = surfaces(found).filter(
      (surface) => !options.only || options.only.includes(surface.name),
    );

    if (wanted.length === 0) throw new Error("No surfaces matched --only");

    for (const size of SIZES) {
      await driver.resize(size);

      for (const surface of wanted) {
        await driver.visit(options.base + surface.path);

        if (surface.prepare) await surface.prepare(driver);

        const measurement = await driver.evaluate(MEASURE, Measurement);
        const focus: z.infer<typeof Focus>[] = [];

        if (!size.mobile && !surface.prepare) {
          await driver.evaluate(
            "document.activeElement && document.activeElement.blur(); true",
            z.boolean(),
          );

          for (let step = 0; step < 24; step += 1) {
            await driver.press("Tab", 9);
            focus.push(await driver.evaluate(FOCUS, Focus));
          }
        }

        console.info("  measured " + surface.name + " at " + size.label);

        results.push({
          surface: surface.name,
          size: size.label,
          findings: evaluate(surface.name, size.label, measurement, focus),
          measurement,
        });
      }
    }
  } finally {
    await driver.close();
  }

  const folder = resolve(options.out);

  mkdirSync(folder, { recursive: true });
  writeFileSync(
    resolve(folder, "audit.json"),
    JSON.stringify({ ...captureIdentity(options.base), results }, null, 2),
  );

  const tally = new Map<string, { title: string; pass: number; warn: number; fail: number }>();

  for (const result of results) {
    console.info("\n" + result.surface + " @ " + result.size);

    for (const f of result.findings) {
      console.info("  " + f.status.toUpperCase().padEnd(4) + " " + f.rule + "  " + f.detail);

      const row = tally.get(f.rule) ?? { title: f.title, pass: 0, warn: 0, fail: 0 };

      row[f.status] += 1;
      tally.set(f.rule, row);
    }
  }

  console.info("\nRule summary across " + results.length + " captures");

  for (const [rule, row] of [...tally.entries()].sort()) {
    console.info(
      "  " +
        rule +
        "  fail " +
        row.fail +
        "  warn " +
        row.warn +
        "  pass " +
        row.pass +
        "   " +
        row.title,
    );
  }

  console.info("\nWrote " + resolve(folder, "audit.json"));

  const failed = results.some((result) => result.findings.some((f) => f.status === "fail"));

  if (options.strict && failed) process.exitCode = 1;
}

await main();
