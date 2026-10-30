import { createHash } from "node:crypto";
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

// The data files change on every sync without the app changing, so they do not
// count towards the service worker's cache version.
const DATA_FILES = new Set(["class_data.enc.js", "static_data.js"]);

// The service worker precaches the app by file name, and those names now carry
// a content hash, so they are only known once the bundle is built. This writes
// them into sw.js, along with a cache name derived from everything the page is
// built from: any change to the app, its styles, icons or the worker itself
// gives a new cache, and the old one is deleted when the new worker activates.
function stampServiceWorker(source, appAssets) {
  const version = createHash("sha256");
  for (const name of appAssets) version.update(name);
  for (const fileName of VERBATIM) {
    if (!DATA_FILES.has(fileName)) version.update(readFileSync(resolve(FRONTEND, fileName)));
  }
  const stamped = source
    .toString()
    .replace('"vibgyor-pwa-dev"', `"vibgyor-pwa-${version.digest("hex").slice(0, 12)}"`)
    .replace("[/* build: app assets */]", JSON.stringify(appAssets.map((name) => `./${name}`)));
  if (stamped.includes("vibgyor-pwa-dev") || stamped.includes("build: app assets")) {
    throw new Error("sw.js no longer has the markers the build stamps");
  }
  return stamped;
}

function copyVerbatim() {
  return {
    name: "copy-verbatim",
    apply: "build",
    generateBundle(options, bundle) {
      const appAssets = Object.keys(bundle)
        .filter((name) => name.startsWith("assets/"))
        .sort();
      for (const fileName of VERBATIM) {
        const source = readFileSync(resolve(FRONTEND, fileName));
        this.emitFile({
          type: "asset",
          fileName,
          source: fileName === "sw.js" ? stampServiceWorker(source, appAssets) : source,
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
        // Named after a hash of their contents, so a phone can never pair a
        // new page with an old copy of its code. sw.js is told the names.
        entryFileNames: "assets/app-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
  server: {
    // `npm run dev` serves the page; the Python server still answers the API.
    proxy: { "/api": "http://localhost:8000" },
  },
});
