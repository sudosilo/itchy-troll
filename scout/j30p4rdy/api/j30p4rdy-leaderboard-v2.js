// J30P4RDY shared leaderboard v2. Uses Upstash Redis REST when the env vars exist, otherwise returns an empty board.
const URL_BASE = process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const KEY = 'l33tJ30p4rdyLeaderboard';

async function redis(parts) {
  const r = await fetch(URL_BASE + '/' + parts.map(encodeURIComponent).join('/'), {
    headers: { Authorization: 'Bearer ' + TOKEN }
  });
  const d = await r.json();
  return d.result;
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!URL_BASE || !TOKEN) {
    return req.method === 'GET' ? res.status(200).json([]) : res.status(200).json({ ok: false });
  }
  try {
    if (req.method === 'GET') {
      const raw = await redis(['zrevrange', KEY, '0', '9', 'WITHSCORES']) || [];
      const list = [];
      for (let i = 0; i < raw.length; i += 2) {
        const p = String(raw[i]).split('::');
        list.push({ name: p[0] || 'Player', genre: p[1] || '', score: parseInt(raw[i + 1], 10) || 0 });
      }
      return res.status(200).json(list);
    }
    if (req.method === 'POST') {
      let body = req.body || {};
      if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
      const name = String(body.name || 'Player').replace(/::/g, ' ').slice(0, 24);
      const genre = String(body.genre || '').replace(/::/g, ' ').slice(0, 20);
      const score = Math.max(0, Math.min(200000, parseInt(body.score, 10) || 0));
      if (score <= 0) return res.status(200).json({ ok: true });
      const member = name + '::' + genre + '::' + Date.now() + '::' + Math.random().toString(36).slice(2, 8);
      await redis(['zadd', KEY, String(score), member]);
      await redis(['zremrangebyrank', KEY, '0', '-51']);
      return res.status(200).json({ ok: true });
    }
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).end();
  } catch (e) {
    return req.method === 'GET' ? res.status(200).json([]) : res.status(500).json({ ok: false });
  }
};
