/* AuditHub service worker — app-shell offline caching.
 *  - Page navigations, Next RSC payloads, and build assets: network-first, so
 *    online always gets fresh content but a cached copy is served when offline.
 *  - Icons / logo / manifest: cache-first (stable).
 *  - API calls (cross-origin :4000) are ignored — offline data comes from the
 *    React Query cache persisted in localStorage.
 */
const CACHE = "audithub-v3";
const PRECACHE = [
  "/dashboard",
  "/clients",
  "/invoices",
  "/payments",
  "/expenses",
  "/tasks",
  "/compliance",
  "/reports",
  "/notifications",
  "/settings",
  "/admin",
  "/audithub-logo.png",
  "/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE).catch(() => {})).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function networkFirst(req) {
  return fetch(req)
    .then((res) => {
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
      }
      return res;
    })
    .catch(() =>
      // Offline: serve the cached copy of THIS url (never cross-serve another
      // route — the client bundle hydrates per-URL, so the wrong page would boot).
      caches.match(req, { ignoreVary: true }).then((hit) => hit || caches.match(new URL(req.url).pathname, { ignoreVary: true })),
    );
}

function cacheFirst(req) {
  return caches.match(req).then(
    (hit) =>
      hit ||
      fetch(req).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      }),
  );
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // ignore the cross-origin API

  const isRsc =
    req.headers.get("RSC") === "1" ||
    req.headers.get("Next-Router-Prefetch") === "1" ||
    url.searchParams.has("_rsc");
  const isBuildAsset = url.pathname.startsWith("/_next/");
  const isStaticIcon =
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".ico") ||
    url.pathname.endsWith(".webmanifest") ||
    url.pathname.endsWith(".svg");

  if (req.mode === "navigate" || isRsc || isBuildAsset) {
    event.respondWith(networkFirst(req));
    return;
  }
  if (isStaticIcon) {
    event.respondWith(cacheFirst(req));
  }
});
