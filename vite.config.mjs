import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

const FRONTEND = resolve(import.meta.dirname, "frontend");

// Files the page loads as they are. index.html marks their tags `vite-ignore`
// so Vite does not rename them, and this copies them into the build unchanged:
// the service worker precaches them by name, the manifest names the icons, and
// the sync job rewrites the two data files without rebuilding anything else.
const VERBATIM = [
  "sw.js",
  "manifest.json",
  "tailwind.css",
  "style.css",
  "class_data.enc.js",
  "static_data.js",
  ...readdirSync(resolve(FRONTEND, "icons")).map((name) => `icons/${name}`),
];

function copyVerbatim() {
  return {
    name: "copy-verbatim",
    apply: "build",
    generateBundle() {
      for (const fileName of VERBATIM) {
        this.emitFile({
          type: "asset",
          fileName,
          source: readFileSync(resolve(FRONTEND, fileName)),
        });
      }
    },
  };
}

export default defineConfig({
  root: FRONTEND,
  // Relative, so the same build works at the GitHub Pages sub-path
  // (/ClassUpdates-Vibgyor/) and at the root of the local server.
  base: "./",
  plugins: [svelte({ configFile: false }), copyVerbatim()],
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    rolldownOptions: {
      output: {
        // A fixed name rather than a content hash, so the service worker's
        // precache list stays valid. Hashed names are Phase 5.
        entryFileNames: "assets/app.js",
        chunkFileNames: "assets/[name].js",
        assetFileNames: "assets/[name][extname]",
      },
    },
  },
  server: {
    // `npm run dev` serves the page; the Python server still answers the API.
    proxy: { "/api": "http://localhost:8000" },
  },
});
