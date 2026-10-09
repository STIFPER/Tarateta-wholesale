/* TARATERA Wholesale — service worker.
   Network-first so a monthly stock update is always seen when online;
   the last visited copy is served when offline. */
const CACHE = "taratera-v3";

self.addEventListener("install", (e) => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const fonts = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  if (!sameOrigin && !fonts) return; /* never touch LINE links etc. */
  /* video: let the browser stream it itself (Safari needs real Range/206 responses and the Cache API can't store them) */
  if (req.headers.has("range") || /\.(mp4|webm|m4v|mov)(\?|$)/i.test(url.pathname)) return;

  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res && (res.ok || res.type === "opaque")) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() =>
        caches
          .match(req)
          .then((hit) => hit || (req.mode === "navigate" ? caches.match("./") : undefined))
          .then((hit) => hit || Response.error()) /* offline + nothing cached: a normal network error, never an undefined response */
      )
  );
});
