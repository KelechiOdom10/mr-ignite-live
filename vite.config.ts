import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import { voidReact } from "@void/react/plugin";
import { defineConfig } from "vite";
import { voidPlugin } from "void";

export default defineConfig({
  resolve: {
    alias: { "@/": fileURLToPath(new URL("./src/", import.meta.url)) },
  },
  plugins: [voidPlugin(), voidReact({ react: { compiler: true } }), tailwindcss()],
});
