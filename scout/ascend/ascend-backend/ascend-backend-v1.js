// Ascend leaderboard backend. Plain Node http plus Redis sorted set.
const http = require('http');
const { createClient } = require('redis');

const PORT = process.env.PORT || 8080;
const KEYS = { climb: 'ascend:scores', challenge: 'ascend:scores:challenge', career: 'ascend:scores:career', gauntlet: 'ascend:scores:gauntlet', jewels: 'ascend:scores:jewels', side: 'ascend:scores:side', fuel: 'ascend:scores:fuel' };
// Career level time boards: lv1 to lv25, fastest time first, stored in ms
const LV_RE = /^lv([1-9]|1[0-9]|2[0-5])$/;
const isTime = m => LV_RE.test(String(m || ''));
const MAX_TIME = 24 * 3600 * 1000;
const keyFor = m => isTime(m) ? 'ascend:times:' + m : (KEYS[m] || KEYS.climb);
const MAX_SCORE = 1000000;
const TOP_N = 25;

const redis = createClient({ url: process.env.REDIS_URL });
redis.on('error', e => console.error('redis', e.message));

const hits = new Map();
function limited(ip) {
  const now = Date.now();
  const h = hits.get(ip) || { t: now, n: 0 };
  if (now - h.t > 60000) { h.t = now; h.n = 0; }
  h.n++;
  hits.set(ip, h);
  return h.n > 30;
}

function cleanName(s) {
  return String(s || '').toUpperCase().replace(/[^A-Z0-9 _.-]/g, '').trim().slice(0, 12);
}

function send(res, code, obj) {
  res.writeHead(code, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(obj));
}

async function top(mode) {
  const rows = isTime(mode)
    ? await redis.zRangeWithScores(keyFor(mode), 0, TOP_N - 1)
    : await redis.zRangeWithScores(keyFor(mode), 0, TOP_N - 1, { REV: true });
  return rows.map(r => ({ name: r.value, score: r.score }));
}

const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://x');
    const path = u.pathname;
    if (req.method === 'OPTIONS') return send(res, 204, {});
    if (req.method === 'GET' && path === '/') return send(res, 200, { ok: true, app: 'ascend-backend' });
    if (req.method === 'GET' && path === '/scores') return send(res, 200, { scores: await top(u.searchParams.get('mode')) });
    if (req.method === 'POST' && path === '/scores') {
      const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
      if (limited(ip)) return send(res, 429, { error: 'slow down' });
      let body = '';
      for await (const c of req) { body += c; if (body.length > 1000) return send(res, 413, { error: 'too big' }); }
      let data;
      try { data = JSON.parse(body); } catch { return send(res, 400, { error: 'bad json' }); }
      const name = cleanName(data.name);
      const score = Math.floor(Number(data.score));
      if (!name) return send(res, 400, { error: 'name required' });
      const mode = isTime(data.mode) ? data.mode : (KEYS[data.mode] ? data.mode : 'climb');
      const max = isTime(mode) ? MAX_TIME : MAX_SCORE;
      if (!Number.isFinite(score) || score < 1 || score > max) return send(res, 400, { error: 'bad score' });
      await redis.zAdd(keyFor(mode), [{ score, value: name }], isTime(mode) ? { LT: true } : { GT: true });
      const rank = isTime(mode) ? await redis.zRank(keyFor(mode), name) : await redis.zRevRank(keyFor(mode), name);
      return send(res, 200, { ok: true, mode, rank: rank === null ? null : rank + 1, scores: await top(mode) });
    }
    send(res, 404, { error: 'not found' });
  } catch (e) {
    console.error(e);
    send(res, 500, { error: 'server error' });
  }
});

redis.connect().then(() => {
  server.listen(PORT, '0.0.0.0', () => console.log('ascend-backend on', PORT));
});
