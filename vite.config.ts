import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { voidPlugin } from "void";
import { voidReact } from "@void/react/plugin";

export default defineConfig({
  resolve: {
    alias: { "@/": fileURLToPath(new URL("./src/", import.meta.url)) },
  },
  plugins: [voidPlugin(), voidReact({ react: { compiler: true } }), tailwindcss()],
});
