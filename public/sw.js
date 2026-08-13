/**
 * BioLIMS service worker.
 *
 * Deliberately conservative: a LIMS that serves a stale sample record is worse
 * than one that admits it is offline. So this caches the shell assets and an
 * offline page, and never caches lab data — every navigation goes to the
 * network first, and if the network is gone the user is told, not shown an old
 * freezer layout they might act on.
 */
const VERSION = "biolims-v1";
const SHELL = ["/offline", "/icon-192.png", "/icon-512.png", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return; // never touch mutations
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Page loads: network first, offline page as the fallback.
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/offline")));
    return;
  }

  // Build output is content-hashed, so serving it from cache is always correct.
  if (url.pathname.startsWith("/_next/static/") || SHELL.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(VERSION).then((cache) => cache.put(request, copy));
            return response;
          })
      )
    );
  }
});
