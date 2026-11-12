const http = require('http');
const crypto = require('crypto');
const { createClient } = require('redis');

const PORT = process.env.PORT || 8080;
const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID || '';
const CF_STREAM_TOKEN = process.env.CF_STREAM_TOKEN || '';
const FLAG_LIMIT = parseInt(process.env.FLAG_LIMIT || '3', 10);
const MAX_SECONDS = 60;
const TOKEN_LIFE = 3600;

const redis = createClient({ url: process.env.REDIS_URL, socket: { family: 0 } });
redis.on('error', (e) => console.error('redis error', e.message));

const K = {
  key: (h) => 'tfw:key:' + h,
  user: (id) => 'tfw:user:' + id,
  handle: (h) => 'tfw:handle:' + h,
  userVideos: (id) => 'tfw:user:' + id + ':videos',
  video: (uid) => 'tfw:video:' + uid,
  bucket: 'tfw:bucket',
  pending: 'tfw:pending',
  flaggedBy: (uid) => 'tfw:flaggedby:' + uid,
  seen: (who) => 'tfw:seen:' + who,
  creators: (id) => 'tfw:creators:' + id,
  devices: (id) => 'tfw:devices:' + id,
  watched: (id) => 'tfw:watched:' + id,
  watchtime: (id) => 'tfw:watchtime:' + id,
  uploads: (id) => 'tfw:uploads:' + id + ':' + new Date().toISOString().slice(0, 10)
};

function sha(s) {
  return crypto.createHash('sha256').update(s).digest('hex');
}

function send(res, code, obj) {
  res.writeHead(code, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Account-Key, X-Device-Id',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS'
  });
  res.end(JSON.stringify(obj));
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => {
      data += c;
      if (data.length > 65536) req.destroy();
    });
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}); } catch (e) { resolve({}); }
    });
    req.on('error', () => resolve({}));
  });
}

async function cf(path, opts = {}) {
  if (!CF_ACCOUNT_ID || !CF_STREAM_TOKEN) throw new Error('video storage is not set up yet');
  const r = await fetch('https://api.cloudflare.com/client/v4/accounts/' + CF_ACCOUNT_ID + '/stream' + path, {
    method: opts.method || 'GET',
    headers: { Authorization: 'Bearer ' + CF_STREAM_TOKEN, 'Content-Type': 'application/json' },
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  if (opts.method === 'DELETE') return null;
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.success) {
    const msg = (j.errors && j.errors[0] && j.errors[0].message) || ('cloudflare ' + r.status);
    throw new Error(msg);
  }
  return j.result;
}

async function whoIs(req) {
  const key = req.headers['x-account-key'];
  if (!key) return null;
  const id = await redis.get(K.key(sha(key)));
  if (!id) return null;
  const handle = await redis.hGet(K.user(id), 'handle');
  return { id, handle };
}

async function playback(uid) {
  const host = await redis.hGet(K.video(uid), 'host');
  const t = await cf('/' + uid + '/token', { method: 'POST', body: { exp: Math.floor(Date.now() / 1000) + TOKEN_LIFE } });
  return {
    src: 'https://' + host + '/' + t.token + '/iframe?autoplay=true&controls=true',
    thumb: 'https://' + host + '/' + t.token + '/thumbnails/thumbnail.jpg?time=1s&height=360'
  };
}

let lastRefresh = 0;
async function refreshPending(force, only) {
  const now = Date.now();
  if (!force && now - lastRefresh < 15000) return;
  lastRefresh = now;
  const ids = only || (await redis.sRandMemberCount(K.pending, 8)) || [];
  for (const uid of ids) {
    const isPending = await redis.sIsMember(K.pending, uid);
    if (!isPending) continue;
    try {
      const v = await cf('/' + uid);
      const state = v.status && v.status.state;
      if (v.readyToStream && v.duration > 0 && v.duration <= MAX_SECONDS + 1) {
        let host = '';
        try { host = new URL(v.playback.hls).host; } catch (e) { host = new URL(v.preview).host; }
        const views = parseInt((await redis.hGet(K.video(uid), 'views')) || '0', 10);
        await redis.hSet(K.video(uid), { state: 'ready', host });
        await redis.zAdd(K.bucket, { score: views, value: uid });
        await redis.sRem(K.pending, uid);
      } else if (state === 'error' || v.duration > MAX_SECONDS + 1) {
        await cf('/' + uid, { method: 'DELETE' }).catch(() => {});
        await redis.hSet(K.video(uid), { state: 'rejected' });
        await redis.sRem(K.pending, uid);
      }
    } catch (e) {
      const created = parseInt((await redis.hGet(K.video(uid), 'created')) || '0', 10);
      if (created && now - created > 86400000) {
        await redis.hSet(K.video(uid), { state: 'rejected' });
        await redis.sRem(K.pending, uid);
      }
    }
  }
}

async function badgesFor(id) {
  const creators = await redis.sCard(K.creators(id));
  const devices = await redis.sCard(K.devices(id));
  const watched = parseInt((await redis.get(K.watched(id))) || '0', 10);
  const seconds = parseInt((await redis.get(K.watchtime(id))) || '0', 10);
  const out = [];
  const tiers = [
    [creators, 5, 'Wanderer', 'Watched five different creators'],
    [creators, 25, 'Explorer', 'Watched twenty five different creators'],
    [creators, 100, 'Cartographer', 'Watched a hundred different creators'],
    [creators, 500, 'Atlas', 'Watched five hundred different creators'],
    [devices, 2, 'Double Screen', 'Watched on two devices'],
    [devices, 3, 'Triple Screen', 'Watched on three devices'],
    [devices, 5, 'Device Fleet', 'Watched on five devices'],
    [watched, 10, 'Stumbler', 'Watched ten videos'],
    [watched, 100, 'Regular', 'Watched a hundred videos'],
    [watched, 1000, 'Bottomless', 'Watched a thousand videos'],
    [seconds, 3600, 'Hour Glass', 'Watched an hour total'],
    [seconds, 21600, 'Long Haul', 'Watched six hours total'],
    [seconds, 64800, 'Iron Eyes', 'Watched eighteen hours total']
  ];
  for (const [have, need, name, desc] of tiers) if (have >= need) out.push({ name, desc });
  return out;
}

async function handle(req, res) {
  if (req.method === 'OPTIONS') return send(res, 204, {});
  const url = new URL(req.url, 'http://x');
  const p = url.pathname.replace(/\/+$/, '');
  const device = String(req.headers['x-device-id'] || '').slice(0, 64);

  if (p === '/api/health' || p === '') return send(res, 200, { ok: true });

  if (p === '/api/account' && req.method === 'POST') {
    const b = await readBody(req);
    const h = String(b.handle || '').toLowerCase().trim();
    if (!/^[a-z0-9_]{3,24}$/.test(h)) return send(res, 400, { error: 'Handle must be letters, digits or underscores, between three and twenty four long' });
    const id = crypto.randomBytes(12).toString('hex');
    const ok = await redis.set(K.handle(h), id, { NX: true });
    if (!ok) return send(res, 409, { error: 'That handle is taken' });
    const key = crypto.randomBytes(24).toString('hex');
    await redis.set(K.key(sha(key)), id);
    await redis.hSet(K.user(id), { handle: h, created: String(Date.now()) });
    if (device) await redis.sAdd(K.devices(id), device);
    return send(res, 200, { key, handle: h });
  }

  if (p === '/api/me' && req.method === 'GET') {
    const me = await whoIs(req);
    if (!me) return send(res, 401, { error: 'No account' });
    if (device) await redis.sAdd(K.devices(me.id), device);
    return send(res, 200, { handle: me.handle, badges: await badgesFor(me.id) });
  }

  if (p === '/api/upload' && req.method === 'POST') {
    const me = await whoIs(req);
    if (!me) return send(res, 401, { error: 'Make an account in the menu first' });
    const count = await redis.incr(K.uploads(me.id));
    await redis.expire(K.uploads(me.id), 172800);
    if (count > 20) return send(res, 429, { error: 'Upload limit reached for today' });
    const r = await cf('/direct_upload', { method: 'POST', body: { maxDurationSeconds: MAX_SECONDS, requireSignedURLs: true } });
    await redis.hSet(K.video(r.uid), { owner: me.id, created: String(Date.now()), views: '0', flags: '0', state: 'pending' });
    await redis.sAdd(K.pending, r.uid);
    await redis.rPush(K.userVideos(me.id), r.uid);
    return send(res, 200, { uploadURL: r.uploadURL, id: r.uid });
  }

  if (p === '/api/next' && req.method === 'GET') {
    await refreshPending(false);
    const me = await whoIs(req);
    const seenKey = K.seen(me ? me.id : 'dev:' + (device || 'anon'));
    const lowest = await redis.zRangeWithScores(K.bucket, 0, 199);
    if (!lowest.length) return send(res, 200, { empty: true });
    const pool = [];
    for (const item of lowest) {
      const uid = item.value;
      if (await redis.sIsMember(seenKey, uid)) continue;
      if (me && (await redis.hGet(K.video(uid), 'owner')) === me.id) continue;
      pool.push(uid);
      if (pool.length >= 12) break;
    }
    let pick;
    if (pool.length) pick = pool[Math.floor(Math.random() * pool.length)];
    else {
      await redis.del(seenKey);
      pick = lowest[Math.floor(Math.random() * lowest.length)].value;
    }
    await redis.zIncrBy(K.bucket, 1, pick);
    await redis.hIncrBy(K.video(pick), 'views', 1);
    await redis.sAdd(seenKey, pick);
    await redis.expire(seenKey, 2592000);
    if (me) {
      const owner = await redis.hGet(K.video(pick), 'owner');
      if (owner) await redis.sAdd(K.creators(me.id), owner);
      if (device) await redis.sAdd(K.devices(me.id), device);
      await redis.incr(K.watched(me.id));
    }
    const pb = await playback(pick);
    return send(res, 200, { id: pick, src: pb.src });
  }

  if (p === '/api/watched' && req.method === 'POST') {
    const me = await whoIs(req);
    if (!me) return send(res, 200, { ok: true });
    const b = await readBody(req);
    const s = Math.max(0, Math.min(MAX_SECONDS, Math.round(Number(b.seconds) || 0)));
    if (s) await redis.incrBy(K.watchtime(me.id), s);
    return send(res, 200, { ok: true });
  }

  if (p === '/api/flag' && req.method === 'POST') {
    const me = await whoIs(req);
    if (!me) return send(res, 401, { error: 'Make an account in the menu to flag videos' });
    const b = await readBody(req);
    const uid = String(b.id || '');
    if (!(await redis.exists(K.video(uid)))) return send(res, 404, { error: 'No such video' });
    const added = await redis.sAdd(K.flaggedBy(uid), me.id);
    if (added) {
      const flags = await redis.hIncrBy(K.video(uid), 'flags', 1);
      if (flags >= FLAG_LIMIT) {
        await redis.zRem(K.bucket, uid);
        await redis.hSet(K.video(uid), { state: 'flagged' });
      }
    }
    return send(res, 200, { ok: true });
  }

  const prof = p.match(/^\/api\/profile\/([a-z0-9_]{3,24})$/);
  if (prof && req.method === 'GET') {
    const id = await redis.get(K.handle(prof[1]));
    if (!id) return send(res, 404, { error: 'No such profile' });
    const me = await whoIs(req);
    const mine = !!(me && me.id === id);
    const uids = await redis.lRange(K.userVideos(id), 0, -1);
    const pend = [];
    for (const uid of uids) if (await redis.sIsMember(K.pending, uid)) pend.push(uid);
    if (pend.length) await refreshPending(true, pend.slice(0, 10));
    const videos = [];
    for (const uid of uids.reverse()) {
      const v = await redis.hGetAll(K.video(uid));
      if (!v || !v.state) continue;
      if (v.state === 'ready') {
        try {
          const pb = await playback(uid);
          videos.push({ id: mine ? uid : undefined, src: pb.src, thumb: pb.thumb });
        } catch (e) {}
      } else if (mine && (v.state === 'pending' || v.state === 'flagged' || v.state === 'rejected')) {
        videos.push({ id: uid, state: v.state });
      }
    }
    return send(res, 200, { handle: prof[1], mine, videos, badges: await badgesFor(id) });
  }

  const del = p.match(/^\/api\/video\/([a-zA-Z0-9]+)$/);
  if (del && req.method === 'DELETE') {
    const me = await whoIs(req);
    const uid = del[1];
    if (!me || (await redis.hGet(K.video(uid), 'owner')) !== me.id) return send(res, 403, { error: 'Not your video' });
    await cf('/' + uid, { method: 'DELETE' }).catch(() => {});
    await redis.zRem(K.bucket, uid);
    await redis.sRem(K.pending, uid);
    await redis.lRem(K.userVideos(me.id), 0, uid);
    await redis.del([K.video(uid), K.flaggedBy(uid)]);
    return send(res, 200, { ok: true });
  }

  return send(res, 404, { error: 'Not found' });
}

redis.connect().then(() => {
  http.createServer((req, res) => {
    handle(req, res).catch((e) => {
      console.error(e);
      send(res, 500, { error: e.message || 'Server error' });
    });
  }).listen(PORT, () => console.log('thanks-for-watching-backend listening on ' + PORT));
});
