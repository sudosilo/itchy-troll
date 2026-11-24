"use strict";
// Estate Dossier backend v1: email + password accounts, bearer sessions,
// one AES-256-GCM encrypted state blob per account, stored in Redis.
const http = require("http");
const crypto = require("crypto");
const { createClient } = require("redis");

const PORT = Number(process.env.PORT) || 8080;
const DATA_KEY = Buffer.from(process.env.DATA_KEY || "", "hex");
if (DATA_KEY.length !== 32) { console.error("DATA_KEY must be 64 hex characters"); process.exit(1); }
if (!process.env.REDIS_URL) { console.error("REDIS_URL is missing"); process.exit(1); }

const SESSION_TTL = 60 * 60 * 24 * 30;
const MAX_BODY = 8 * 1024 * 1024;

const redis = createClient({ url: process.env.REDIS_URL, socket: { family: 0, reconnectStrategy: n => Math.min(n * 200, 3000) } });
redis.on("error", e => console.error("redis:", e.message));

// ---------- crypto helpers ----------
const sha256 = s => crypto.createHash("sha256").update(s).digest("hex");
function scrypt(pw, salt) {
  return new Promise((res, rej) => crypto.scrypt(pw, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (e, k) => e ? rej(e) : res(k)));
}
async function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  return salt.toString("hex") + ":" + (await scrypt(pw, salt)).toString("hex");
}
async function checkPassword(pw, stored) {
  const [s, h] = String(stored || "").split(":");
  if (!s || !h) return false;
  const k = await scrypt(pw, Buffer.from(s, "hex"));
  const hb = Buffer.from(h, "hex");
  return hb.length === k.length && crypto.timingSafeEqual(hb, k);
}
function encrypt(text, userId) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", DATA_KEY, iv);
  c.setAAD(Buffer.from(userId));
  const ct = Buffer.concat([c.update(text, "utf8"), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), ct]).toString("base64");
}
function decrypt(b64, userId) {
  const buf = Buffer.from(b64, "base64");
  const d = crypto.createDecipheriv("aes-256-gcm", DATA_KEY, buf.subarray(0, 12));
  d.setAAD(Buffer.from(userId));
  d.setAuthTag(buf.subarray(12, 28));
  return Buffer.concat([d.update(buf.subarray(28)), d.final()]).toString("utf8");
}

// ---------- http helpers ----------
function send(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Content-Length": Buffer.byteLength(body)
  });
  res.end(body);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on("data", c => { size += c.length; if (size > MAX_BODY) { reject(Object.assign(new Error("too large"), { status: 413 })); req.destroy(); } else chunks.push(c); });
    req.on("end", () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8"))); }
      catch (e) { reject(Object.assign(new Error("bad json"), { status: 400 })); }
    });
    req.on("error", reject);
  });
}
function clientIp(req) {
  const xff = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return xff || req.socket.remoteAddress || "unknown";
}
async function limited(key, max, windowSec) {
  const n = await redis.incr("rl:" + key);
  if (n === 1) await redis.expire("rl:" + key, windowSec);
  return n > max;
}
const normEmail = e => String(e || "").trim().toLowerCase();
const validEmail = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length <= 200;

async function newSession(userId) {
  const token = crypto.randomBytes(32).toString("base64url");
  await redis.set("sess:" + sha256(token), userId, { EX: SESSION_TTL });
  return token;
}
async function authUser(req) {
  const m = /^Bearer\s+(\S+)$/.exec(String(req.headers.authorization || ""));
  if (!m) return null;
  const key = "sess:" + sha256(m[1]);
  const userId = await redis.get(key);
  if (!userId) return null;
  await redis.expire(key, SESSION_TTL);
  const email = await redis.hGet("user:" + userId, "email");
  return email ? { userId, email, sessKey: key } : null;
}

// ---------- routes ----------
async function route(req, res) {
  const url = new URL(req.url, "http://x");
  const p = url.pathname.replace(/\/+$/, "");
  const ip = clientIp(req);

  if (p === "/health" || p === "/api/health") return send(res, 200, { ok: true });

  if (req.method === "POST" && p === "/api/signup") {
    if (await limited("signup:" + ip, 10, 3600)) return send(res, 429, { error: "Too many sign ups from here. Try again later." });
    const b = await readBody(req);
    const email = normEmail(b.email), pw = String(b.password || "");
    if (!validEmail(email)) return send(res, 400, { error: "Enter a valid email." });
    if (pw.length < 10 || pw.length > 200) return send(res, 400, { error: "Password needs at least 10 characters." });
    const userId = crypto.randomUUID();
    const claimed = await redis.set("email:" + email, userId, { NX: true });
    if (!claimed) return send(res, 409, { error: "That email already has an account. Sign in instead." });
    await redis.hSet("user:" + userId, { email, pw: await hashPassword(pw), created: new Date().toISOString() });
    return send(res, 200, { token: await newSession(userId), user_id: userId, email });
  }

  if (req.method === "POST" && p === "/api/login") {
    const b = await readBody(req);
    const email = normEmail(b.email), pw = String(b.password || "");
    if (await limited("login:" + ip, 30, 900) || await limited("loginE:" + email, 10, 900))
      return send(res, 429, { error: "Too many attempts. Wait fifteen minutes." });
    const userId = await redis.get("email:" + email);
    const stored = userId ? await redis.hGet("user:" + userId, "pw") : null;
    const ok = await checkPassword(pw, stored || "00:00");
    if (!userId || !ok) return send(res, 401, { error: "Email or password is wrong." });
    return send(res, 200, { token: await newSession(userId), user_id: userId, email });
  }

  const user = await authUser(req);
  if (!user) return send(res, 401, { error: "Sign in again." });

  if (req.method === "POST" && p === "/api/logout") { await redis.del(user.sessKey); return send(res, 200, { ok: true }); }
  if (req.method === "GET" && p === "/api/me") return send(res, 200, { user_id: user.userId, email: user.email });

  if (req.method === "GET" && p === "/api/state") {
    const row = await redis.hGetAll("state:" + user.userId);
    if (!row || !row.data) return send(res, 200, { rev: 0, state: null, updated_at: null });
    let state = null;
    try { state = JSON.parse(decrypt(row.data, user.userId)); } catch (e) { return send(res, 500, { error: "Stored data could not be decrypted." }); }
    return send(res, 200, { rev: Number(row.rev) || 0, state, updated_at: row.updated });
  }

  if (req.method === "PUT" && p === "/api/state") {
    const b = await readBody(req);
    if (!b || typeof b.state !== "object" || b.state === null) return send(res, 400, { error: "Missing state." });
    const key = "state:" + user.userId;
    for (let attempt = 0; attempt < 3; attempt++) {
      const out = await redis.executeIsolated(async iso => {
        await iso.watch(key);
        const current = Number(await iso.hGet(key, "rev")) || 0;
        if (Number(b.rev) !== current) { await iso.unwatch(); return { conflict: current }; }
        const next = current + 1, now = new Date().toISOString();
        try {
          await iso.multi().hSet(key, { rev: String(next), data: encrypt(JSON.stringify(b.state), user.userId), updated: now }).exec();
          return { rev: next, updated_at: now };
        } catch (e) { if (e && e.name === "WatchError") return null; throw e; }
      });
      if (!out) continue;
      if (out.conflict !== undefined) {
        const row = await redis.hGetAll(key);
        let state = null; try { state = JSON.parse(decrypt(row.data, user.userId)); } catch (e) { /* send null */ }
        return send(res, 409, { error: "Changed on another device.", rev: out.conflict, state });
      }
      return send(res, 200, out);
    }
    return send(res, 409, { error: "Busy, try again." });
  }

  if (req.method === "DELETE" && p === "/api/account") {
    const b = await readBody(req);
    const stored = await redis.hGet("user:" + user.userId, "pw");
    if (!(await checkPassword(String(b.password || ""), stored))) return send(res, 401, { error: "Password is wrong." });
    await redis.del(["state:" + user.userId, "user:" + user.userId, "email:" + user.email, user.sessKey]);
    return send(res, 200, { ok: true });
  }

  return send(res, 404, { error: "Not found." });
}

const server = http.createServer((req, res) => {
  route(req, res).catch(e => {
    console.error(e);
    if (!res.headersSent) send(res, e.status || 500, { error: e.status === 413 ? "Data too large." : e.status === 400 ? "Bad request." : "Server error." });
  });
});
redis.connect().then(() => {
  server.listen(PORT, () => console.log("estate dossier backend on " + PORT));
}).catch(e => { console.error("redis connect failed:", e.message); process.exit(1); });
