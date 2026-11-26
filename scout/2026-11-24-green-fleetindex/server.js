// GREEN PHONE EDIT
// Fleet index for FileCensus: every phone pushes its census, any phone can ask which phone holds what.
// Redis keeps the data; this process keeps a searchable copy in memory.
import http from "node:http";
import zlib from "node:zlib";
import crypto from "node:crypto";
import { createClient } from "redis";

const PORT = process.env.PORT || 8080;
const KEY = process.env.FLEET_KEY || "";
const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";
const MAX_BODY = 40 * 1024 * 1024;

// Row layout sent by phones:
// [path, size, mtime, dt, kind, fp, hash, ai, shot, gps, nick]
const R = { path: 0, size: 1, mtime: 2, dt: 3, kind: 4, fp: 5, hash: 6, ai: 7, shot: 8, gps: 9, nick: 10 };

const redis = createClient({ url: REDIS_URL });
redis.on("error", e => console.error("redis", e.message));

const devices = new Map();   // id -> { meta, rows, lower }
const uploads = new Map();   // uploadId -> { device, rows, at }

let twinCache = null;        // cross-phone duplicate sets, rebuilt after any push or removal

function index(meta, rows) {
  twinCache = null;
  devices.set(meta.id, { meta, rows, lower: rows.map(r => String(r[R.path]).toLowerCase() + "\u0000" + String(r[R.nick] || "").toLowerCase()) });
}

async function load() {
  const ids = await redis.sMembers("fleet:devices");
  for (const id of ids) {
    try {
      const meta = JSON.parse(await redis.get("fleet:dev:" + id));
      const blob = await redis.get("fleet:idx:" + id);
      const rows = blob ? JSON.parse(zlib.gunzipSync(Buffer.from(blob, "base64")).toString("utf8")) : [];
      index(meta, rows);
    } catch (e) {
      console.error("could not load", id, e.message);
    }
  }
  console.log("loaded", devices.size, "phones");
}

function authorized(req) {
  const h = req.headers.authorization || "";
  const got = Buffer.from(h.startsWith("Bearer ") ? h.slice(7) : "");
  const want = Buffer.from(KEY);
  return KEY.length > 0 && got.length === want.length && crypto.timingSafeEqual(got, want);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let n = 0;
    req.on("data", c => { n += c.length; if (n > MAX_BODY) { reject(new Error("body too large")); req.destroy(); } else chunks.push(c); });
    req.on("end", () => {
      try {
        let buf = Buffer.concat(chunks);
        if ((req.headers["content-encoding"] || "").includes("gzip")) buf = zlib.gunzipSync(buf);
        resolve(buf.length ? JSON.parse(buf.toString("utf8")) : {});
      } catch (e) { reject(e); }
    });
    req.on("error", reject);
  });
}

function send(res, code, obj) {
  const body = Buffer.from(JSON.stringify(obj));
  const gz = body.length > 2048;
  res.writeHead(code, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Authorization, Content-Type, Content-Encoding",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    ...(gz ? { "Content-Encoding": "gzip" } : {})
  });
  res.end(gz ? zlib.gzipSync(body) : body);
}

function rowOut(dev, r) {
  return {
    device: dev.meta.id, phone: dev.meta.name, color: dev.meta.color,
    path: r[R.path], size: r[R.size], mtime: r[R.mtime], dt: r[R.dt], kind: r[R.kind],
    fp: r[R.fp] || "", hash: r[R.hash] || "", ai: r[R.ai] || 0, shot: r[R.shot] || 0, gps: !!r[R.gps], nick: r[R.nick] || ""
  };
}

function search(p) {
  const words = String(p.get("q") || "").toLowerCase().split(/\s+/).filter(Boolean);
  const kind = p.get("kind") || "";
  const only = p.get("device") || "";
  const fp = p.get("fp") || "";
  const minSize = +(p.get("minSize") || 0);
  const limit = Math.max(1, Math.min(1000, +(p.get("limit") || 200)));
  const offset = Math.max(0, +(p.get("offset") || 0));
  const perPhone = {};
  const hits = [];
  let total = 0;
  for (const dev of devices.values()) {
    if (only && dev.meta.id !== only) continue;
    let n = 0;
    for (let i = 0; i < dev.rows.length; i++) {
      const r = dev.rows[i];
      if (kind && r[R.kind] !== kind) continue;
      if (fp && r[R.fp] !== fp) continue;
      if (minSize && r[R.size] < minSize) continue;
      if (words.length) {
        const l = dev.lower[i];
        let ok = true;
        for (const w of words) if (!l.includes(w)) { ok = false; break; }
        if (!ok) continue;
      }
      n++;
      if (total >= offset && hits.length < limit) hits.push(rowOut(dev, r));
      total++;
    }
    perPhone[dev.meta.id] = n;
  }
  return { total, perPhone, items: hits };
}

// Twins: the same file (same fingerprint, which already folds in the size) held by more than one phone.
function twinSets() {
  if (twinCache) return twinCache;
  const byFp = new Map();
  for (const dev of devices.values()) {
    for (const r of dev.rows) {
      const f = r[R.fp];
      if (!f || !(+r[R.size] > 0)) continue;
      let g = byFp.get(f);
      if (!g) byFp.set(f, g = []);
      g.push([dev, r]);
    }
  }
  const sets = [];
  for (const [fp, list] of byFp) {
    const phones = new Set(list.map(x => x[0].meta.id));
    if (phones.size < 2) continue;
    list.sort((a, b) => (+a[1][R.mtime] || 0) - (+b[1][R.mtime] || 0));
    const size = +list[0][1][R.size];
    sets.push({ fp, size, kind: list[0][1][R.kind], phones, list, extra: size * (list.length - 1) });
  }
  sets.sort((a, b) => b.extra - a.extra || (a.fp < b.fp ? -1 : 1));
  twinCache = sets;
  return sets;
}

function twinFilter(p) {
  const kind = p.get("kind") || "";
  const only = p.get("device") || "";
  const minSize = +(p.get("minSize") || 0);
  return twinSets().filter(t => (!kind || t.kind === kind) && (!only || t.phones.has(only)) && (!minSize || t.size >= minSize));
}

function twins(p) {
  const sets = twinFilter(p);
  const me = p.get("me") || "";
  const limit = Math.max(1, Math.min(200, +(p.get("limit") || 20)));
  const offset = Math.max(0, +(p.get("offset") || 0));
  let files = 0, extra = 0, mine = 0, mineBytes = 0;
  const pairs = {};
  for (const t of sets) {
    files += t.list.length;
    extra += t.extra;
    if (me) for (const [dev] of t.list) if (dev.meta.id === me) { mine++; mineBytes += t.size; }
    const ids = [...t.phones].sort();
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
      const k = ids[i] + "|" + ids[j];
      const e = pairs[k] || (pairs[k] = { a: ids[i], b: ids[j], sets: 0, bytes: 0 });
      e.sets++; e.bytes += t.size;
    }
  }
  return {
    sets: sets.length, files, extra, mine, mineBytes,
    pairs: Object.values(pairs).sort((x, y) => y.bytes - x.bytes),
    items: sets.slice(offset, offset + limit).map(t => ({
      fp: t.fp, size: t.size, kind: t.kind, phones: t.phones.size, copies: t.list.length, extra: t.extra,
      files: t.list.map(([dev, r]) => rowOut(dev, r))
    }))
  };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  const path = url.pathname;
  try {
    if (req.method === "OPTIONS") return send(res, 204, {});
    if (path === "/" || path === "/health") return send(res, 200, { ok: true, phones: devices.size, service: "fleetindex" });
    if (!authorized(req)) return send(res, 401, { error: "wrong or missing fleet key" });

    if (req.method === "GET" && path === "/v1/devices") {
      return send(res, 200, { devices: [...devices.values()].map(d => d.meta).sort((a, b) => (b.pushedAt || 0) - (a.pushedAt || 0)) });
    }
    if (req.method === "GET" && path === "/v1/search") return send(res, 200, search(url.searchParams));
    if (req.method === "GET" && path === "/v1/twins") return send(res, 200, twins(url.searchParams));
    if (req.method === "GET" && path === "/v1/twins/fps") {
      return send(res, 200, { fps: twinFilter(url.searchParams).map(t => t.fp) });
    }
    if (req.method === "GET" && path === "/v1/where") {
      const fps = (url.searchParams.get("fp") || "").split(",").filter(Boolean).slice(0, 500);
      const out = {};
      for (const f of fps) out[f] = [];
      if (fps.length) {
        const want = new Set(fps);
        for (const dev of devices.values()) for (const r of dev.rows) if (want.has(r[R.fp])) out[r[R.fp]].push(rowOut(dev, r));
      }
      return send(res, 200, { where: out });
    }
    if (req.method === "POST" && path === "/v1/census/begin") {
      const b = await readBody(req);
      const d = b.device || {};
      if (!d.id || !/^[A-Za-z0-9_-]{6,64}$/.test(d.id)) return send(res, 400, { error: "device id missing" });
      const id = crypto.randomBytes(12).toString("hex");
      uploads.set(id, { device: { id: d.id, name: String(d.name || "Phone").slice(0, 40), color: String(d.color || "gray").slice(0, 20), model: String(d.model || "").slice(0, 80) }, rows: [], at: Date.now() });
      return send(res, 200, { upload: id });
    }
    if (req.method === "POST" && path === "/v1/census/chunk") {
      const b = await readBody(req);
      const up = uploads.get(b.upload);
      if (!up) return send(res, 404, { error: "upload expired, start again" });
      if (Array.isArray(b.rows)) for (const r of b.rows) if (Array.isArray(r) && typeof r[0] === "string") up.rows.push(r.slice(0, 11));
      up.at = Date.now();
      return send(res, 200, { received: up.rows.length });
    }
    if (req.method === "POST" && path === "/v1/census/commit") {
      const b = await readBody(req);
      const up = uploads.get(b.upload);
      if (!up) return send(res, 404, { error: "upload expired, start again" });
      uploads.delete(b.upload);
      const t = b.totals || {};
      const bytes = up.rows.reduce((a, r) => a + (+r[R.size] || 0), 0);
      const meta = { ...up.device, pushedAt: Date.now(), files: up.rows.length, bytes, census: t.census || 0, kinds: t.kinds || {}, app: String(t.app || "") };
      const blob = zlib.gzipSync(Buffer.from(JSON.stringify(up.rows))).toString("base64");
      await redis.multi()
        .set("fleet:idx:" + meta.id, blob)
        .set("fleet:dev:" + meta.id, JSON.stringify(meta))
        .sAdd("fleet:devices", meta.id)
        .exec();
      index(meta, up.rows);
      return send(res, 200, { ok: true, files: meta.files, bytes });
    }
    if (req.method === "DELETE" && path.startsWith("/v1/devices/")) {
      const id = decodeURIComponent(path.slice("/v1/devices/".length));
      await redis.multi().del("fleet:idx:" + id).del("fleet:dev:" + id).sRem("fleet:devices", id).exec();
      devices.delete(id);
      twinCache = null;
      return send(res, 200, { ok: true });
    }
    return send(res, 404, { error: "no such route" });
  } catch (e) {
    return send(res, 500, { error: e.message });
  }
});

// stale uploads are dropped after an hour
setInterval(() => { const now = Date.now(); for (const [k, u] of uploads) if (now - u.at > 3600000) uploads.delete(k); }, 600000);

await redis.connect();
await load();
server.listen(PORT, () => console.log("fleetindex listening on", PORT, KEY ? "" : "(FLEET_KEY is not set, every request will be refused)"));
