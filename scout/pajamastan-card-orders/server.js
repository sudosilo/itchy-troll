// Pajamastan card orders: stores card images, opens a Stripe checkout, shows orders to the owner.
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const DATA = process.env.DATA_DIR || '/data';
const STRIPE_KEY = process.env.STRIPE_SECRET_KEY || '';
const ADMIN_KEY = process.env.ADMIN_KEY || '';
const PRICE_CENTS = parseInt(process.env.PRICE_CENTS || '2000', 10);
const SUCCESS_URL = process.env.SUCCESS_URL || 'https://example.com/?paid=1';
const CANCEL_URL = process.env.CANCEL_URL || 'https://example.com/?cancelled=1';
const ORDERS = path.join(DATA, 'orders');
fs.mkdirSync(ORDERS, { recursive: true });

function send(res, code, body, type) {
  res.writeHead(code, {
    'Content-Type': type || 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

function readBody(req, limit) {
  return new Promise(function (ok, fail) {
    let size = 0; const parts = [];
    req.on('data', function (c) { size += c.length; if (size > limit) { fail(new Error('too big')); req.destroy(); } else parts.push(c); });
    req.on('end', function () { ok(Buffer.concat(parts).toString()); });
    req.on('error', fail);
  });
}

function pngFromDataUrl(u) {
  const m = /^data:image\/png;base64,(.+)$/.exec(u || '');
  return m ? Buffer.from(m[1], 'base64') : null;
}

async function stripe(pathname, params) {
  const r = await fetch('https://api.stripe.com/v1' + pathname, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + STRIPE_KEY, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params).toString()
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error ? j.error.message : 'stripe error');
  return j;
}

async function stripeGet(pathname) {
  const r = await fetch('https://api.stripe.com/v1' + pathname, { headers: { Authorization: 'Bearer ' + STRIPE_KEY } });
  return r.json();
}

function okKey(url) { return ADMIN_KEY && url.searchParams.get('key') === ADMIN_KEY; }

const server = http.createServer(async function (req, res) {
  const url = new URL(req.url, 'http://x');
  try {
    if (req.method === 'OPTIONS') return send(res, 204, '');
    if (req.method === 'GET' && url.pathname === '/') return send(res, 200, { ok: true, service: 'pajamastan card orders' });

    if (req.method === 'POST' && url.pathname === '/order') {
      const body = JSON.parse(await readBody(req, 15 * 1024 * 1024));
      const front = pngFromDataUrl(body.front), back = pngFromDataUrl(body.back);
      if (!front) return send(res, 400, { error: 'front image missing' });
      const id = crypto.randomBytes(5).toString('hex');
      const dir = path.join(ORDERS, id);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'front.png'), front);
      if (back) fs.writeFileSync(path.join(dir, 'back.png'), back);
      const session = await stripe('/checkout/sessions', {
        mode: 'payment',
        'line_items[0][quantity]': '1',
        'line_items[0][price_data][currency]': 'usd',
        'line_items[0][price_data][unit_amount]': String(PRICE_CENTS),
        'line_items[0][price_data][product_data][name]': 'Pajamastan ID card (novelty)',
        'shipping_address_collection[allowed_countries][0]': 'US',
        client_reference_id: id,
        'metadata[order_id]': id,
        'payment_intent_data[metadata][order_id]': id,
        success_url: SUCCESS_URL,
        cancel_url: CANCEL_URL
      });
      fs.writeFileSync(path.join(dir, 'order.json'), JSON.stringify({ id: id, session: session.id, created: new Date().toISOString() }));
      return send(res, 200, { id: id, url: session.url });
    }

    const img = /^\/order\/([a-f0-9]{10})\/(front|back)\.png$/.exec(url.pathname);
    if (req.method === 'GET' && img) {
      if (!okKey(url)) return send(res, 403, { error: 'key' });
      const f = path.join(ORDERS, img[1], img[2] + '.png');
      if (!fs.existsSync(f)) return send(res, 404, { error: 'not found' });
      return send(res, 200, fs.readFileSync(f), 'image/png');
    }

    const one = /^\/order\/([a-f0-9]{10})$/.exec(url.pathname);
    if (req.method === 'GET' && one) {
      if (!okKey(url)) return send(res, 403, { error: 'key' });
      const dir = path.join(ORDERS, one[1]);
      if (!fs.existsSync(dir)) return send(res, 404, { error: 'not found' });
      const o = JSON.parse(fs.readFileSync(path.join(dir, 'order.json')));
      const s = await stripeGet('/checkout/sessions/' + o.session);
      const ship = (s.collected_information && s.collected_information.shipping_details) || s.shipping_details || {};
      const a = ship.address || {};
      const k = '?key=' + encodeURIComponent(ADMIN_KEY);
      const html = '<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1">' +
        '<body style="font-family:sans-serif;background:#fff;color:#111;padding:16px">' +
        '<h2>Order ' + one[1] + '</h2>' +
        '<p>Paid: ' + (s.payment_status === 'paid' ? 'yes' : 'no') + '</p>' +
        '<p>Ship to: ' + [ship.name, a.line1, a.line2, a.city, a.state, a.postal_code].filter(Boolean).join(', ') + '</p>' +
        '<p>Front</p><img style="max-width:100%;border:1px solid #ccc" src="/order/' + one[1] + '/front.png' + k + '">' +
        '<p>Back</p><img style="max-width:100%;border:1px solid #ccc" src="/order/' + one[1] + '/back.png' + k + '">';
      return send(res, 200, html, 'text/html');
    }

    send(res, 404, { error: 'not found' });
  } catch (e) {
    send(res, 500, { error: e.message });
  }
});

server.listen(PORT, function () { console.log('listening on ' + PORT); });
