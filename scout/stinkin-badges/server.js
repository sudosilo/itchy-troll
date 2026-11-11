import http from 'node:http';

const PORT = process.env.PORT || 8080;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
const MODEL = process.env.MODEL || 'claude-sonnet-5-5';
const ALLOWED = (process.env.ALLOWED_ORIGINS || 'https://pajamastan-badge-tool.vercel.app')
  .split(',').map((s) => s.trim()).filter(Boolean);
const MAX_BODY = 8 * 1024 * 1024;
const PER_HOUR = 20;

const hits = new Map();

function cors(req, res) {
  const origin = req.headers.origin || '';
  if (ALLOWED.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.setHeader('Access-Control-Max-Age', '600');
  }
}

function send(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(obj));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) { reject(new Error('too_big')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function userFromToken(req) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!token || !SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  const r = await fetch(SUPABASE_URL + '/auth/v1/user', {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + token }
  });
  if (!r.ok) return null;
  const u = await r.json();
  return u && u.id ? u : null;
}

function allowed(userId) {
  const now = Date.now();
  const list = (hits.get(userId) || []).filter((t) => now - t < 3600000);
  if (list.length >= PER_HOUR) { hits.set(userId, list); return false; }
  list.push(now);
  hits.set(userId, list);
  return true;
}

const KINDS = ['band', 'stripe', 'photo', 'name', 'role', 'details', 'seal', 'pattern'];
const hex = (v, d) => (typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v) ? v.toLowerCase() : d);
const frac = (v) => { const n = Number(v); return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0; };

function clean(raw) {
  const out = {
    orientation: raw.orientation === 'portrait' ? 'portrait' : 'landscape',
    card: { color: hex(raw.card && raw.card.color, '#ffffff') },
    parts: []
  };
  const parts = Array.isArray(raw.parts) ? raw.parts.slice(0, 20) : [];
  for (const p of parts) {
    if (!p || !KINDS.includes(p.kind)) continue;
    const part = {
      kind: p.kind,
      x: frac(p.x), y: frac(p.y), w: frac(p.w), h: frac(p.h),
      color: hex(p.color, '#1f4e9c'),
      textColor: hex(p.textColor, '#111111'),
      align: ['left', 'center', 'right'].includes(p.align) ? p.align : 'left',
      shape: p.shape === 'round' ? 'round' : 'rect',
      text: typeof p.text === 'string' ? p.text.slice(0, 80) : ''
    };
    if (part.w < 0.01 || part.h < 0.005) continue;
    out.parts.push(part);
  }
  return out;
}

const PROMPT = `This photo shows a hand made mockup of an ID badge, drawn with pen or built from construction paper.
Find the edges of the badge in the photo and measure everything relative to the badge itself, not the whole photo.
Return only one JSON object, no other text, in this shape:
{"orientation":"landscape or portrait","card":{"color":"#rrggbb"},"parts":[{"kind":"band","x":0,"y":0,"w":1,"h":0.2,"color":"#rrggbb","textColor":"#rrggbb","align":"left","shape":"rect","text":""}]}
x, y, w, h are fractions of the badge width and height, from the top left corner.
kind is one of: band (a wide colored strip holding the title), stripe (a thin colored line), photo (the box or circle for the face picture), name, role (job title), details (ID number and dates block), seal (an emblem or logo spot), pattern (a faint repeated text or texture area).
Use written labels like "photo", "name", "title", "ID" to decide the kind when present. Copy any written label into text.
color is the fill color of a block. textColor is the ink color of writing. shape is round for a circle photo.
Leave out anything you are unsure about.`;

async function readMockup(image) {
  const m = /^data:(image\/(?:jpeg|png|webp|gif));base64,(.+)$/.exec(image || '');
  if (!m) throw new Error('bad_image');
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: m[1], data: m[2] } },
          { type: 'text', text: PROMPT }
        ]
      }]
    })
  });
  if (!r.ok) throw new Error('model_' + r.status);
  const j = await r.json();
  const text = (j.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
  const start = text.indexOf('{'), end = text.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error('no_json');
  return clean(JSON.parse(text.slice(start, end + 1)));
}

const server = http.createServer(async (req, res) => {
  cors(req, res);
  const url = new URL(req.url, 'http://x');
  try {
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
    if (req.method === 'GET' && url.pathname === '/health') { send(res, 200, { ok: true }); return; }
    if (req.method === 'GET' && url.pathname === '/config') {
      send(res, 200, { supabaseUrl: SUPABASE_URL, supabaseAnonKey: SUPABASE_ANON_KEY, ai: !!ANTHROPIC_API_KEY });
      return;
    }
    if (req.method === 'POST' && url.pathname === '/read-mockup') {
      const user = await userFromToken(req);
      if (!user) { send(res, 401, { error: 'login_required' }); return; }
      if (!ANTHROPIC_API_KEY) { send(res, 503, { error: 'ai_not_set_up' }); return; }
      if (!allowed(user.id)) { send(res, 429, { error: 'too_many_reads' }); return; }
      const body = JSON.parse(await readBody(req) || '{}');
      const result = await readMockup(body.image);
      send(res, 200, result);
      return;
    }
    send(res, 404, { error: 'not_found' });
  } catch (e) {
    const msg = String(e && e.message || e);
    send(res, msg === 'too_big' ? 413 : msg === 'bad_image' ? 400 : 502, { error: msg });
  }
});

server.listen(PORT, () => console.log('stinkin-badges listening on ' + PORT));
