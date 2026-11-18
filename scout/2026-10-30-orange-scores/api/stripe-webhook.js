const crypto = require('crypto');
const M = require('./_mh.js');
const PACK = require('./mh-buy.js').PACK;

// Stripe calls this after a payment. The signature proves the call came from Stripe.
function rawBody(req) {
  return new Promise(function (ok, bad) {
    const parts = [];
    let n = 0;
    req.on('data', function (c) { n += c.length; if (n > 200000) { bad(new Error('too_big')); req.destroy(); } else parts.push(c); });
    req.on('end', function () { ok(Buffer.concat(parts)); });
    req.on('error', bad);
  });
}

function verify(raw, header, secretKey) {
  const sig = {};
  String(header || '').split(',').forEach(function (kv) {
    const i = kv.indexOf('=');
    if (i > 0) { const k = kv.slice(0, i).trim(); (sig[k] = sig[k] || []).push(kv.slice(i + 1).trim()); }
  });
  const t = sig.t && sig.t[0];
  if (!t || !sig.v1) return false;
  if (Math.abs(Date.now() / 1000 - Number(t)) > 300) return false;
  const want = Buffer.from(crypto.createHmac('sha256', secretKey).update(t + '.' + raw.toString('utf8')).digest('hex'));
  return sig.v1.some(function (v) { const b = Buffer.from(v); return b.length === want.length && crypto.timingSafeEqual(b, want); });
}

module.exports = async function (req, res) {
  function out(code, s) { res.statusCode = code; res.setHeader('Content-Type', 'text/plain'); res.end(s); }
  if (req.method !== 'POST') return out(405, 'method_not_allowed');
  const secretKey = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secretKey) return out(503, 'not_configured');
  let raw;
  try { raw = await rawBody(req); } catch (e) { return out(413, 'too_big'); }
  if (!verify(raw, req.headers['stripe-signature'], secretKey)) return out(400, 'bad_signature');
  let ev;
  try { ev = JSON.parse(raw.toString('utf8')); } catch (e) { return out(400, 'bad_json'); }
  const s = ev && ev.data && ev.data.object;
  const types = ['checkout.session.completed', 'checkout.session.async_payment_succeeded'];
  if (types.indexOf(ev.type) === -1 || !s || s.payment_status !== 'paid') return out(200, 'ignored');
  const uid = s.client_reference_id;
  if (!/^[0-9a-f-]{36}$/.test(String(uid || ''))) return out(200, 'no_player');
  if (s.currency !== 'usd' || s.amount_total !== PACK.cents) return out(200, 'wrong_amount');
  try {
    await M.rpc('mh_credit', { p_session: s.id, p_uid: uid, p_tokens: PACK.tokens, p_cents: s.amount_total });
    out(200, 'credited');
  } catch (e) {
    out(500, 'retry');
  }
};
module.exports.config = { api: { bodyParser: false } };
module.exports.verify = verify;
