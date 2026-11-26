// GREEN PHONE EDIT: Polygon Starfighter score server. Node plus Redis sorted sets, one board per mode and map
const http = require('http');
const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', { maxRetriesPerRequest: 2 });
const PORT = process.env.PORT || 3000;

// GREEN PHONE EDIT: valid boards. hover is a race time in hundredths of a second, lower is better
const BOARD_RE = /^(free|hunt|zone|fuel|hover)_(belt|ice|scrap)$/;
const MAX = { free: 1e6, hunt: 1e6, zone: 1000, fuel: 1e6, hover: 360000 };
const lowerBetter = b => b.startsWith('hover_');
const key = b => 'sf:board:' + b;

const lastPost = new Map();

function send(res, code, obj) {
  res.writeHead(code, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(obj));
}

function cleanName(n) {
  return String(n || '').toUpperCase().replace(/[^A-Z0-9 _-]/g, '').trim().slice(0, 12) || 'PILOT';
}

async function top(board, n) {
  const k = key(board);
  const raw = lowerBetter(board)
    ? await redis.zrange(k, 0, n - 1, 'WITHSCORES')
    : await redis.zrevrange(k, 0, n - 1, 'WITHSCORES');
  const out = [];
  for (let i = 0; i < raw.length; i += 2) out.push({ name: raw[i], score: Number(raw[i + 1]) });
  return out;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    if (req.method === 'OPTIONS') return send(res, 204, {});
    if (url.pathname === '/health') return send(res, 200, { ok: true });

    if (url.pathname === '/top' && req.method === 'GET') {
      const board = url.searchParams.get('board') || '';
      if (!BOARD_RE.test(board)) return send(res, 400, { error: 'bad board' });
      return send(res, 200, { board, top: await top(board, 10) });
    }

    if (url.pathname === '/score' && req.method === 'POST') {
      const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
      const now = Date.now();
      if (now - (lastPost.get(ip) || 0) < 3000) return send(res, 429, { error: 'slow down' });
      lastPost.set(ip, now);
      let body = '';
      for await (const c of req) { body += c; if (body.length > 2000) break; }
      let d; try { d = JSON.parse(body); } catch (e) { return send(res, 400, { error: 'bad json' }); }
      const board = String(d.board || '');
      if (!BOARD_RE.test(board)) return send(res, 400, { error: 'bad board' });
      const score = Math.round(Number(d.score));
      const mode = board.split('_')[0];
      if (!Number.isFinite(score) || score <= 0 || score > MAX[mode]) return send(res, 400, { error: 'bad score' });
      const name = cleanName(d.name);
      const k = key(board);
      // GREEN PHONE EDIT: keep each callsign's best only
      await redis.zadd(k, lowerBetter(board) ? 'LT' : 'GT', score, name);
      const rank = lowerBetter(board) ? await redis.zrank(k, name) : await redis.zrevrank(k, name);
      const best = Number(await redis.zscore(k, name));
      return send(res, 200, { ok: true, rank: rank + 1, best, top: await top(board, 10) });
    }

    send(res, 404, { error: 'not found' });
  } catch (e) {
    send(res, 500, { error: 'server error' });
  }
});

server.listen(PORT, () => console.log('starfighter scores on ' + PORT));
