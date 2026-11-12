// Server function for Thanks For Watching. Runs on Vercel.
// Signs people in through the shared Supabase accounts hub and talks to Cloudflare Stream.
// Needs SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY, CF_ACCOUNT_ID and CF_STREAM_TOKEN set in Vercel.

const MAX_SECONDS = 60;
const FLAG_LIMIT = 3;
const TOKEN_LIFE = 3600;
const DAILY_UPLOADS = 20;

const SK = () => process.env.SUPABASE_SECRET_KEY || "";
const SBU = () => process.env.SUPABASE_URL || "";

async function db(path, opts = {}) {
  const r = await fetch(SBU() + "/rest/v1/" + path, {
    method: opts.method || "GET",
    headers: Object.assign({ apikey: SK(), Authorization: "Bearer " + SK(), "Content-Type": "application/json" }, opts.headers || {}),
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined
  });
  const t = await r.text();
  if (!r.ok) {
    const e = new Error("Database error " + r.status);
    e.status = r.status;
    e.detail = t;
    throw e;
  }
  return t ? JSON.parse(t) : null;
}
const rpc = (fn, args) => db("rpc/" + fn, { method: "POST", body: args });
const enc = encodeURIComponent;

async function userFrom(req) {
  const tok = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!tok) return null;
  const r = await fetch(SBU() + "/auth/v1/user", { headers: { apikey: SK(), Authorization: "Bearer " + tok } });
  if (!r.ok) return null;
  const u = await r.json();
  return u && u.id ? u : null;
}

async function handleOf(id) {
  const rows = await db("tfw_profiles?user_id=eq." + id + "&select=handle");
  return rows && rows[0] ? rows[0].handle : null;
}

async function cf(path, opts = {}) {
  const acc = process.env.CF_ACCOUNT_ID, tok = process.env.CF_STREAM_TOKEN;
  if (!acc || !tok) throw new Error("Video storage is not set up yet");
  const r = await fetch("https://api.cloudflare.com/client/v4/accounts/" + acc + "/stream" + path, {
    method: opts.method || "GET",
    headers: { Authorization: "Bearer " + tok, "Content-Type": "application/json" },
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  if (opts.method === "DELETE") return null;
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.success) throw new Error((j.errors && j.errors[0] && j.errors[0].message) || ("Cloudflare " + r.status));
  return j.result;
}

async function playback(uid, host) {
  const t = await cf("/" + uid + "/token", { method: "POST", body: { exp: Math.floor(Date.now() / 1000) + TOKEN_LIFE } });
  return {
    src: "https://" + host + "/" + t.token + "/iframe?autoplay=true&controls=true",
    thumb: "https://" + host + "/" + t.token + "/thumbnails/thumbnail.jpg?time=1s&height=360"
  };
}

async function refresh(rows) {
  for (const v of rows) {
    if (v.state !== "pending") continue;
    try {
      const s = await cf("/" + v.uid);
      const state = s.status && s.status.state;
      if (s.readyToStream && s.duration > 0 && s.duration <= MAX_SECONDS + 1) {
        let host = "";
        try { host = new URL(s.playback.hls).host; } catch (e) { host = new URL(s.preview).host; }
        await db("tfw_videos?uid=eq." + enc(v.uid), { method: "PATCH", body: { state: "ready", host } });
        v.state = "ready"; v.host = host;
      } else if (state === "error" || s.duration > MAX_SECONDS + 1) {
        await cf("/" + v.uid, { method: "DELETE" }).catch(() => {});
        await db("tfw_videos?uid=eq." + enc(v.uid), { method: "PATCH", body: { state: "rejected" } });
        v.state = "rejected";
      }
    } catch (e) {
      if (Date.now() - new Date(v.created_at).getTime() > 86400000) {
        await db("tfw_videos?uid=eq." + enc(v.uid), { method: "PATCH", body: { state: "rejected" } });
        v.state = "rejected";
      }
    }
  }
}

async function badgesFor(id) {
  const creators = (await db("tfw_creators_seen?user_id=eq." + id + "&select=owner")).length;
  const devices = (await db("tfw_devices?user_id=eq." + id + "&select=device")).length;
  const st = (await db("tfw_stats?user_id=eq." + id + "&select=watched,seconds"))[0] || { watched: 0, seconds: 0 };
  const tiers = [
    [creators, 5, "Wanderer", "Watched five different creators"],
    [creators, 25, "Explorer", "Watched twenty five different creators"],
    [creators, 100, "Cartographer", "Watched a hundred different creators"],
    [creators, 500, "Atlas", "Watched five hundred different creators"],
    [devices, 2, "Double Screen", "Watched on two devices"],
    [devices, 3, "Triple Screen", "Watched on three devices"],
    [devices, 5, "Device Fleet", "Watched on five devices"],
    [st.watched, 10, "Stumbler", "Watched ten videos"],
    [st.watched, 100, "Regular", "Watched a hundred videos"],
    [st.watched, 1000, "Bottomless", "Watched a thousand videos"],
    [st.seconds, 3600, "Hour Glass", "Watched an hour total"],
    [st.seconds, 21600, "Long Haul", "Watched six hours total"],
    [st.seconds, 64800, "Iron Eyes", "Watched eighteen hours total"]
  ];
  return tiers.filter((t) => t[0] >= t[1]).map((t) => ({ name: t[2], desc: t[3] }));
}

async function noteDevice(id, device) {
  if (!device) return;
  await db("tfw_devices?on_conflict=user_id,device", {
    method: "POST", headers: { Prefer: "resolution=ignore-duplicates,return=minimal" }, body: { user_id: id, device }
  }).catch(() => {});
}

module.exports = async (req, res) => {
  const op = String((req.query && req.query.op) || "");
  const body = (req.body && typeof req.body === "object") ? req.body : {};
  const device = String(req.headers["x-device-id"] || "").slice(0, 64);
  try {
    if (op === "config") {
      return res.status(200).json({ url: SBU(), key: process.env.SUPABASE_PUBLISHABLE_KEY || "" });
    }

    if (op === "profile") {
      const h = String(req.query.u || "").toLowerCase();
      if (!/^[a-z0-9_]{3,24}$/.test(h)) return res.status(404).json({ error: "No such profile" });
      const p = await db("tfw_profiles?handle=eq." + h + "&select=user_id");
      if (!p.length) return res.status(404).json({ error: "No such profile" });
      const id = p[0].user_id;
      const me = await userFrom(req);
      const mine = !!(me && me.id === id);
      const rows = await db("tfw_videos?owner=eq." + id + "&select=uid,state,host,created_at&order=created_at.desc&limit=200");
      await refresh(rows);
      const videos = [];
      for (const v of rows) {
        if (v.state === "ready") {
          try { const pb = await playback(v.uid, v.host); videos.push({ id: mine ? v.uid : undefined, src: pb.src, thumb: pb.thumb }); } catch (e) {}
        } else if (mine && v.state !== "deleted") videos.push({ id: v.uid, state: v.state });
      }
      return res.status(200).json({ handle: h, mine, videos, badges: await badgesFor(id) });
    }

    const me = await userFrom(req);
    if (!me) return res.status(401).json({ error: "Not signed in" });

    if (op === "me") {
      await noteDevice(me.id, device);
      return res.status(200).json({
        handle: await handleOf(me.id),
        email: me.email || null,
        anonymous: !!me.is_anonymous,
        badges: await badgesFor(me.id)
      });
    }

    if (op === "handle" && req.method === "POST") {
      const h = String(body.handle || "").toLowerCase().trim();
      if (!/^[a-z0-9_]{3,24}$/.test(h)) return res.status(400).json({ error: "Handle must be letters, digits or underscores, between three and twenty four long" });
      if (await handleOf(me.id)) return res.status(400).json({ error: "You already have a handle" });
      try {
        await db("tfw_profiles", { method: "POST", headers: { Prefer: "return=minimal" }, body: { user_id: me.id, handle: h } });
      } catch (e) {
        if (e.status !== 409) throw e;
        const owner = (await db("tfw_profiles?handle=eq." + h + "&select=user_id"))[0];
        const sameDevice = owner && device && (await db("tfw_devices?user_id=eq." + owner.user_id + "&device=eq." + enc(device) + "&select=device")).length;
        let ownerAnon = false;
        if (sameDevice) {
          const ar = await fetch(SBU() + "/auth/v1/admin/users/" + owner.user_id, { headers: { apikey: SK(), Authorization: "Bearer " + SK() } });
          const au = ar.ok ? await ar.json() : null;
          ownerAnon = !!(au && (au.is_anonymous || !au.email));
        }
        if (!sameDevice || !ownerAnon) return res.status(409).json({ error: "That handle belongs to another account. If it is yours, tap Log in and use that account's email." });
        await db("tfw_profiles?user_id=eq." + owner.user_id, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: { user_id: me.id } });
        await db("tfw_videos?owner=eq." + owner.user_id, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: { owner: me.id } });
        await noteDevice(me.id, device);
        return res.status(200).json({ handle: h, reclaimed: true });
        throw e;
      }
      return res.status(200).json({ handle: h });
    }

    if (op === "upload" && req.method === "POST") {
      if (!(await handleOf(me.id))) return res.status(400).json({ error: "Pick a handle in the menu first" });
      const since = new Date(Date.now() - 86400000).toISOString();
      const recent = await db("tfw_videos?owner=eq." + me.id + "&created_at=gte." + enc(since) + "&select=uid");
      if (recent.length >= DAILY_UPLOADS) return res.status(429).json({ error: "Upload limit reached for today" });
      const r = await cf("/direct_upload", { method: "POST", body: { maxDurationSeconds: MAX_SECONDS, requireSignedURLs: true } });
      await db("tfw_videos", { method: "POST", headers: { Prefer: "return=minimal" }, body: { uid: r.uid, owner: me.id, state: "pending" } });
      return res.status(200).json({ uploadURL: r.uploadURL, id: r.uid });
    }

    if (op === "next") {
      const pend = await db("tfw_videos?state=eq.pending&select=uid,state,host,created_at&order=created_at.asc&limit=5");
      await refresh(pend);
      const ready = await db("tfw_videos?state=eq.ready&select=uid,owner,host&order=views.asc&limit=200");
      if (!ready.length) return res.status(200).json({ empty: true });
      const seenRows = await db("tfw_seen?viewer=eq." + me.id + "&select=uid&order=seen_at.desc&limit=2000");
      const seen = new Set(seenRows.map((s) => s.uid));
      const pool = [];
      for (const v of ready) {
        if (v.owner === me.id || seen.has(v.uid)) continue;
        pool.push(v);
        if (pool.length >= 12) break;
      }
      let pick;
      if (pool.length) pick = pool[Math.floor(Math.random() * pool.length)];
      else {
        await db("tfw_seen?viewer=eq." + me.id, { method: "DELETE", headers: { Prefer: "return=minimal" } });
        const others = ready.filter((v) => v.owner !== me.id);
        if (!others.length) return res.status(200).json({ empty: true });
        pick = others[Math.floor(Math.random() * others.length)];
      }
      await rpc("tfw_add_view", { p_uid: pick.uid });
      await db("tfw_seen?on_conflict=viewer,uid", { method: "POST", headers: { Prefer: "resolution=ignore-duplicates,return=minimal" }, body: { viewer: me.id, uid: pick.uid } });
      await db("tfw_creators_seen?on_conflict=user_id,owner", { method: "POST", headers: { Prefer: "resolution=ignore-duplicates,return=minimal" }, body: { user_id: me.id, owner: pick.owner } });
      await noteDevice(me.id, device);
      await rpc("tfw_add_watch", { p_user: me.id, p_watched: 1, p_seconds: 0 });
      const pb = await playback(pick.uid, pick.host);
      return res.status(200).json({ id: pick.uid, src: pb.src });
    }

    if (op === "watched" && req.method === "POST") {
      const s = Math.max(0, Math.min(MAX_SECONDS, Math.round(Number(body.seconds) || 0)));
      if (s) await rpc("tfw_add_watch", { p_user: me.id, p_watched: 0, p_seconds: s });
      return res.status(200).json({ ok: true });
    }

    if (op === "flag" && req.method === "POST") {
      if (!(await handleOf(me.id))) return res.status(400).json({ error: "Pick a handle in the menu to flag videos" });
      const uid = String(body.id || "");
      const v = await db("tfw_videos?uid=eq." + enc(uid) + "&select=uid");
      if (!v.length) return res.status(404).json({ error: "No such video" });
      await rpc("tfw_flag", { p_uid: uid, p_user: me.id, p_limit: FLAG_LIMIT });
      return res.status(200).json({ ok: true });
    }

    if (op === "delete" && req.method === "POST") {
      const uid = String(body.id || "");
      const v = await db("tfw_videos?uid=eq." + enc(uid) + "&select=owner");
      if (!v.length || v[0].owner !== me.id) return res.status(403).json({ error: "Not your video" });
      await cf("/" + uid, { method: "DELETE" }).catch(() => {});
      await db("tfw_videos?uid=eq." + enc(uid), { method: "DELETE", headers: { Prefer: "return=minimal" } });
      return res.status(200).json({ ok: true });
    }

    return res.status(404).json({ error: "Not found" });
  } catch (e) {
    console.error(e, e.detail);
    return res.status(500).json({ error: e.message || "Server error" });
  }
};
module.exports.config = { maxDuration: 30 };
