import { defineHandler } from "void";

import { LIQUIPEDIA_USER_AGENT } from "@/liquipedia/client";

import { imageSource } from "../../src/imageSource";

const ONE_WEEK = 7 * 24 * 60 * 60;

// Liquipedia rejects hotlinked images from other origins, so images are fetched server-side and cached at the edge.
export const GET = defineHandler(async (c) => {
  const source = imageSource(c.req.query("u") ?? "");

  if (!source) return c.text("Image host not allowed", 400);

  const cache = (globalThis as { caches?: { default?: Cache } }).caches?.default;

  const cacheKey = new Request(
    new URL(`/api/image?u=${encodeURIComponent(source.href)}`, c.req.url).toString(),
  );

  const cached = await cache?.match(cacheKey);

  if (cached) return cached;

  const upstream = await fetch(source, {
    headers: { "User-Agent": LIQUIPEDIA_USER_AGENT },
    redirect: "manual",
  });

  const contentType = upstream.headers.get("Content-Type") ?? "";

  if (!upstream.ok || !contentType.startsWith("image/")) {
    return c.text("Image unavailable", 502);
  }

  const res = new Response(upstream.body, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": `public, max-age=${ONE_WEEK}, immutable`,
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });

  if (cache) c.executionCtx.waitUntil(cache.put(cacheKey, res.clone()));

  return res;
});
