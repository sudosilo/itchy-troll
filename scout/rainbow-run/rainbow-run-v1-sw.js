/* rainbow-run-v1-sw.js
   BLUE PHONE: Rainbow Run preload. On the first visit this worker downloads every file the show can use, the
   pages, the animations and the bundled videos listed in rainbow-run-v1-assets.json, and keeps them on the phone.
   After that the show plays from the phone itself, and the network only carries the clock and the cues.
   Pages and scripts still try the network first, so a new deploy reaches the phones, and fall back to the copy
   on the phone when the network is jammed. Videos always play from the copy on the phone. */
const VERSION = "rainbow-run-v1-2026-11-08a";
const LIST = "rainbow-run-v1-assets.json";

self.addEventListener("install", e => {
  e.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    let list = [];
    try { list = (await (await fetch(LIST, { cache: "no-store" })).json()).files || []; } catch (err) {}
    /* one file that fails to load does not stop the rest */
    await Promise.allSettled(list.map(f => fetch(f, { cache: "no-store" }).then(r => { if (r.ok) return cache.put(f, r); })));
    self.skipWaiting();
  })());
});

self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== VERSION) await caches.delete(k);
    await self.clients.claim();
  })());
});

/* A video player asks for pieces of the file; the copy on the phone answers with just that piece. */
async function piece(req, res) {
  const range = req.headers.get("range");
  if (!range) return res;
  const buf = await res.arrayBuffer(), m = /bytes=(\d*)-(\d*)/.exec(range) || [], size = buf.byteLength;
  let start = m[1] ? +m[1] : 0, end = m[2] ? +m[2] : size - 1;
  if (!m[1] && m[2]) { start = size - +m[2]; end = size - 1; }
  end = Math.min(end, size - 1);
  return new Response(buf.slice(start, end + 1), { status: 206, headers: {
    "Content-Type": res.headers.get("Content-Type") || "video/mp4", "Content-Range": "bytes " + start + "-" + end + "/" + size,
    "Content-Length": String(end - start + 1), "Accept-Ranges": "bytes" } });
}

self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;
  const path = url.pathname.replace(/^\//, "");
  if (path.indexOf("rainbow-run-videos/") === 0) {
    e.respondWith((async () => {
      const cache = await caches.open(VERSION);
      let res = await cache.match(path);
      if (!res) { try { const r = await fetch(path); if (r.ok) { await cache.put(path, r.clone()); res = r; } } catch (err) {} }
      return res ? piece(req, res) : fetch(req);
    })());
    return;
  }
  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    try {
      const r = await Promise.race([fetch(req), new Promise((_, no) => setTimeout(() => no(new Error("slow")), 4000))]);
      if (r && r.ok && !url.search) cache.put(path || "./", r.clone());
      return r;
    } catch (err) {
      return (await cache.match(path || "./", { ignoreSearch: true })) || (await cache.match(req, { ignoreSearch: true })) || Response.error();
    }
  })());
});
