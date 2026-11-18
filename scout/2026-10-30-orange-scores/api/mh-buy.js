const L = require('./_lib.js');
const M = require('./_mh.js');

// One pack: 1000 tokens for one US dollar. The amount lives here, never in the game.
const PACK = { tokens: 1000, cents: 100 };

// POST: opens a Stripe Checkout page for the signed in player and returns its address.
module.exports = async function (req, res) {
  if (L.start(req, res)) return;
  if (req.method !== 'POST') return L.fail(res, 405, 'method_not_allowed');
  let uid;
  try { uid = M.who(req); } catch (e) { return L.fail(res, 503, 'service_unavailable'); }
  if (!uid) return L.fail(res, 401, 'sign_in');
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return L.fail(res, 503, 'payments_not_configured');
  try {
    if (!(await M.under('mhb:' + uid, 6, 600))) return L.fail(res, 429, 'slow_down');
    const host = 'https://' + String(req.headers.host || '').replace(/[^a-z0-9.-]/gi, '');
    const f = new URLSearchParams();
    f.set('mode', 'payment');
    f.set('client_reference_id', uid);
    f.set('metadata[uid]', uid);
    f.set('metadata[tokens]', String(PACK.tokens));
    f.set('line_items[0][quantity]', '1');
    f.set('line_items[0][price_data][currency]', 'usd');
    f.set('line_items[0][price_data][unit_amount]', String(PACK.cents));
    f.set('line_items[0][price_data][product_data][name]', PACK.tokens + ' MobbyHill tokens');
    f.set('success_url', host + '/paid.html');
    f.set('cancel_url', host + '/paid.html?c=1');
    const r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: f.toString(),
      signal: AbortSignal.timeout(8000)
    });
    const j = await r.json();
    if (!r.ok || !j.url) return L.fail(res, 502, 'checkout_failed');
    L.send(res, 200, { ok: true, url: j.url, tokens: PACK.tokens, cents: PACK.cents });
  } catch (e) {
    L.fail(res, 503, 'service_unavailable');
  }
};
module.exports.PACK = PACK;
