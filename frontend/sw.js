// =====================================================================
// VIBGYOR Class Updates - Progressive Web App Service Worker
// Provides 100% offline capability, instant loading & asset caching
// =====================================================================

// The build stamps both of these (see stampServiceWorker in vite.config.mjs): a
// cache name that changes whenever anything the page is built from changes, so
// a new release always replaces the old cache, and the app's file names, which
// carry a hash of their contents. Unbuilt, under `npm run dev`, they stay as
// written here.
const CACHE_NAME = "vibgyor-pwa-dev";
const APP_ASSETS = [/* build: app assets */];

const PRECACHE_ASSETS = [
  "./",
  "./index.html",
  "./tailwind.css",
  "./style.css",
  ...APP_ASSETS,
  "./static_data.js",
  "./class_data.enc.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png",
];

// Served from the network whenever it can be reached: the app unlocks the class
// data, so a page from one release with the data of another changes what the
// page does, not just how it looks.
const FRESH_FIRST = ["/class_data.enc.js", "/static_data.js"];

// --- Install Event: Pre-cache core shell ---
// cache.addAll rejects as a unit: one asset that 404s fails the whole install,
// the new worker never activates, and the old one goes on serving stale code
// indefinitely. Caching each asset on its own keeps an update recoverable.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        Promise.allSettled(
          PRECACHE_ASSETS.map((asset) => cache.add(asset)),
        ).then((results) => {
          const failed = results.filter((r) => r.status === "rejected").length;
          if (failed) console.warn(`[sw] ${failed} asset(s) could not be precached`);
        }),
      )
      .then(() => self.skipWaiting()),
  );
});

// --- Activate Event: Cleanup older caches & take control ---
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        return Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        );
      })
      .then(() => self.clients.claim()),
  );
});

// --- Fetch Event: Stale-While-Revalidate with Offline Fallback ---
self.addEventListener("fetch", (event) => {
  const request = event.request;

  // Only handle GET requests
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Analytics is third-party and must never be served from cache or retried
  // offline; let it go straight to the network, or fail on its own.
  if (
    url.hostname.endsWith("goatcounter.com") ||
    url.hostname === "gc.zgo.at"
  ) {
    return;
  }

  // Skip caching for backend API requests or external OAuth
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          JSON.stringify({
            error: "Offline mode active. Using local browser data.",
          }),
          { headers: { "Content-Type": "application/json" } },
        );
      }),
    );
    return;
  }

  // For HTML page navigation requests: Network first, fall back to cached index.html
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return networkResponse;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const fallback = await caches.match("./index.html");
          return fallback || caches.match("./");
        }),
    );
    return;
  }

  // The app's own files are named after a hash of their contents, so a name
  // always means the same bytes: once cached, a file never needs fetching again.
  // A new release is a new index.html (fetched network-first above) naming new
  // files, so the page and its code always match.
  if (url.pathname.includes("/assets/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const copy = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            }
            return networkResponse;
          }),
      ),
    );
    return;
  }

  // The class data changes without the app changing, whenever a sync publishes,
  // and the app is what unlocks it. Served stale-while-revalidate, a returning
  // visitor would see last week's data for at least one load. So these are
  // network-first, and fall back to the cache only when the network cannot answer.
  if (FRESH_FIRST.some((name) => url.pathname.endsWith(name))) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return networkResponse;
        })
        .catch(() => caches.match(request)),
    );
    return;
  }

  // Everything else (styles, icons, fonts): Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            networkResponse.type === "basic"
          ) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // If network fetch fails, cachedResponse will be returned
        });

      return cachedResponse || fetchPromise;
    }),
  );
});
