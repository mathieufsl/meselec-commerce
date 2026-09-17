// Minimal service worker for PWA installability (Chrome requires a fetch handler).

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    fetch(event.request).catch(() => {
      if (event.request.mode === "navigate") {
        return new Response(
          "<html><body><h1>Offline</h1><p>The server is not reachable. Please check that it is running.</p></body></html>",
          { status: 503, headers: { "content-type": "text/html; charset=utf-8" } },
        );
      }
      return new Response("Network error", { status: 503 });
    }),
  );
});
