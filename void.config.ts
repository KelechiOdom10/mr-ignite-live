import { defineConfig } from "void/config";

export default defineConfig({
  cloudflare: {
    workers_dev: true,
    preview_urls: true,
    routes: [{ pattern: "rivalshub.kellycooks.dev", custom_domain: true }],
  },
  deploy: {
    // Cloudflare takes about 55s to route a staged version's readiness probe; Void's staged check gives up first.
    cloudflare: { mode: "atomic" },
  },
  worker: {
    compatibility_date: "2026-02-24",
  },
  head: {
    titleTemplate: "%s · Rivals Hub",
    htmlAttrs: { lang: "en", class: "dark" },
    meta: [
      { charset: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#141414" },
    ],
    link: [
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "icon", href: "/favicon.ico", sizes: "16x16 32x32", type: "image/x-icon" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png", sizes: "180x180" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Geist:wght@400..700&family=Geist+Mono:wght@400..600&display=swap",
      },
    ],
  },
});
