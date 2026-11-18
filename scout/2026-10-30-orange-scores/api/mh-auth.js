const L = require('./_lib.js');
const M = require('./_mh.js');

// Sign in through Supabase Auth with credentials the player already has.
// GET: which outside providers are turned on, and the address that starts their sign in.
// POST { action: 'send', email }: Supabase emails a six digit code.
// POST { action: 'verify', email, code }: checks the code and returns a game session.
// POST { action: 'exchange', access_token }: turns a Supabase provider sign in into a game session.
function base() {
  const u = process.env.SUPABASE_URL, k = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!u || !k) throw new Error('db_not_configured');
  const h = { apikey: k, 'Content-Type': 'application/json' };
  if (!k.startsWith('sb_')) h.Authorization = 'Bearer ' + k;
  return { url: u.replace(/\/$/, '') + '/auth/v1', h: h };
}
async function gt(path, opts) {
  const r = await fetch(base().url + path, Object.assign({ signal: AbortSignal.timeout(8000) }, opts));
  let j = null;
  try { j = await r.json(); } catch (e) { j = null; }
  return { ok: r.ok, status: r.status, j: j };
}
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,}$/i;

module.exports = async function (req, res) {
  if (L.start(req, res)) return;
  try {
    const B = base();
    if (req.method === 'GET') {
      const s = await gt('/settings', { headers: B.h });
      const ext = (s.j && s.j.external) || {};
      const providers = Object.keys(ext).filter(function (k) { return ext[k] === true && ['email', 'phone', 'anonymous_users'].indexOf(k) === -1; });
      return L.send(res, 200, { ok: true, providers: providers, authorize: B.url + '/authorize' });
    }
    if (req.method !== 'POST') return L.fail(res, 405, 'method_not_allowed');
    const b = L.body(req);
    if (!b) return L.fail(res, 413, 'bad_body');
    if (!(await M.under('mha:' + L.ipKey(req), 30, 600))) return L.fail(res, 429, 'slow_down');

    if (b.action === 'send') {
      const email = typeof b.email === 'string' ? b.email.trim().toLowerCase() : '';
      if (!EMAIL.test(email)) return L.fail(res, 400, 'bad_email');
      if (!(await M.under('mhe:' + email, 5, 3600))) return L.fail(res, 429, 'slow_down');
      const r = await gt('/otp', { method: 'POST', headers: B.h, body: JSON.stringify({ email: email, create_user: true }) });
      if (!r.ok) return L.fail(res, r.status === 429 ? 429 : 502, r.status === 429 ? 'slow_down' : 'email_failed');
      return L.send(res, 200, { ok: true });
    }
    if (b.action === 'verify') {
      const email = typeof b.email === 'string' ? b.email.trim().toLowerCase() : '';
      const code = typeof b.code === 'string' ? b.code.replace(/\D/g, '') : '';
      if (!EMAIL.test(email) || !/^\d{6,10}$/.test(code)) return L.fail(res, 400, 'bad_code');
      if (!(await M.under('mhv:' + email, 8, 3600))) return L.fail(res, 429, 'slow_down');
      const r = await gt('/verify', { method: 'POST', headers: B.h, body: JSON.stringify({ type: 'email', email: email, token: code }) });
      const u = r.j && r.j.user;
      if (!r.ok || !u || !u.id) return L.fail(res, 401, 'bad_code');
      return L.send(res, 200, { ok: true, name: u.email || email, token: M.sign(u.id) });
    }
    if (b.action === 'exchange') {
      const at = typeof b.access_token === 'string' && b.access_token.length < 4000 ? b.access_token : '';
      if (!at) return L.fail(res, 400, 'bad_token');
      const r = await gt('/user', { headers: { apikey: B.h.apikey, Authorization: 'Bearer ' + at } });
      const u = r.j;
      if (!r.ok || !u || !u.id) return L.fail(res, 401, 'bad_token');
      const md = u.user_metadata || {};
      return L.send(res, 200, { ok: true, name: u.email || md.user_name || md.name || 'player', token: M.sign(u.id) });
    }
    return L.fail(res, 400, 'bad_action');
  } catch (e) {
    L.fail(res, 503, 'service_unavailable');
  }
};
