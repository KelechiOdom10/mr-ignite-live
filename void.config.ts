import { defineConfig } from "void/config";

export default defineConfig({
  worker: {
    compatibility_date: "2026-02-24",
  },
  head: {
    titleTemplate: "%s · Ignite Live",
    htmlAttrs: { lang: "en", class: "dark" },
    meta: [
      { charset: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#0b0b0e" },
    ],
    link: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700;800&family=Inter:wght@400;500;600;700&display=swap",
      },
    ],
  },
});
