import { defineHandler } from "void";

const ALLOWED_PREFIX = "https://liquipedia.net/commons/images/";
const ONE_WEEK = 7 * 24 * 60 * 60;

// Liquipedia rejects hotlinked images from other origins, so logos are fetched server-side and cached at the edge.
export const GET = defineHandler(async (c) => {
  const url = c.req.query("u") ?? "";
  if (!url.startsWith(ALLOWED_PREFIX) || url.includes("..")) return c.text("Bad logo URL", 400);

  const cache = (globalThis as { caches?: { default?: Cache } }).caches?.default;
  const cacheKey = new Request(new URL(c.req.url).toString());
  const cached = await cache?.match(cacheKey);
  if (cached) return cached;

  const upstream = await fetch(url, { headers: { "User-Agent": "MRIgniteLive/0.1 (personal live score tracker)" } });
  if (!upstream.ok) return c.text("Logo unavailable", 502);
  const res = new Response(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") ?? "image/png",
      "Cache-Control": `public, max-age=${ONE_WEEK}, immutable`,
    },
  });
  if (cache) c.executionCtx.waitUntil(cache.put(cacheKey, res.clone()));
  return res;
});
