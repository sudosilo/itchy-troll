// MobbyHill wallets on Supabase, owned by Supabase Auth users. Only this server holds the service role key.
const crypto = require('crypto');
const L = require('./_lib.js');

const WEEK = 7 * 86400000;
const MONDAY0 = 4 * 86400000;
function cycleNow() { return Math.floor((Date.now() - MONDAY0) / WEEK); }
function cycleEnd(c) { return MONDAY0 + (c + 1) * WEEK; }

async function rpc(fn, args) {
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('db_not_configured');
  const h = { apikey: key, 'Content-Type': 'application/json' };
  if (!key.startsWith('sb_')) h.Authorization = 'Bearer ' + key;
  const r = await fetch(url.replace(/\/$/, '') + '/rest/v1/rpc/' + fn, {
    method: 'POST', headers: h, body: JSON.stringify(args), signal: AbortSignal.timeout(6000)
  });
  const t = await r.text();
  let j = null;
  try { j = t ? JSON.parse(t) : null; } catch (e) { j = null; }
  if (!r.ok) throw new Error('db_error');
  return j;
}

// Sign in tokens: account id, expiry, and an HMAC the server alone can make.
const DAYS = 60;
function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error('session_not_configured');
  return s;
}
function sign(uid) {
  const exp = Date.now() + DAYS * 86400000;
  const base = uid + '.' + exp;
  return base + '.' + crypto.createHmac('sha256', secret()).update(base).digest('base64url');
}
function who(req) {
  const m = /^Bearer ([0-9a-f-]{36})\.(\d{10,16})\.([A-Za-z0-9_-]{43})$/.exec(String(req.headers.authorization || ''));
  if (!m) return null;
  if (Number(m[2]) < Date.now()) return null;
  const want = crypto.createHmac('sha256', secret()).update(m[1] + '.' + m[2]).digest('base64url');
  const a = Buffer.from(want), b = Buffer.from(m[3]);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return m[1];
}

// Counts hits under a key for a window. Returns true while under the limit.
async function under(key, limit, secs) {
  const r = await L.redis([['INCR', key], ['EXPIRE', key, secs, 'NX']]);
  return r[0] <= limit;
}

module.exports = { rpc, sign, who, under, cycleNow, cycleEnd };
