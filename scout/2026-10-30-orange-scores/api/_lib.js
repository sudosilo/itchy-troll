const crypto = require('crypto');
const GAMES = require('./_games.js');

// Every board keeps at most CAP scores. Lower scores roll off and are deleted.
// Activity feeds keep the newest CAP posts.
const CAP = 100;
const MAX_BODY = 2048;

const ORIGINS = [
  /^https:\/\/[a-z0-9-]+\.vercel\.app$/,
  /^https:\/\/([a-z0-9-]+\.)*itch\.zone$/,
  /^https:\/\/([a-z0-9-]+\.)*itch\.io$/,
  /^https:\/\/([a-z0-9-]+\.)*hwcdn\.net$/
];

async function redis(cmds) {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) throw new Error('storage_not_configured');
  const r = await fetch(url.replace(/\/$/, '') + '/pipeline', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmds),
    signal: AbortSignal.timeout(5000)
  });
  if (!r.ok) throw new Error('storage_error');
  const out = await r.json();
  return out.map(function (x) {
    if (x.error) throw new Error('storage_error');
    return x.result;
  });
}

function start(req, res) {
  const o = req.headers.origin;
  if (o && ORIGINS.some(function (rx) { return rx.test(o); })) {
    res.setHeader('Access-Control-Allow-Origin', o);
  }
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return true;
  }
  return false;
}

function send(res, code, obj) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(obj));
}

function fail(res, code, error) {
  send(res, code, { ok: false, error: error });
}

function body(req) {
  const len = Number(req.headers['content-length'] || 0);
  if (len > MAX_BODY) return null;
  let b = req.body;
  if (typeof b === 'string') {
    if (b.length > MAX_BODY) return null;
    try { b = JSON.parse(b); } catch (e) { return null; }
  }
  if (!b || typeof b !== 'object' || Array.isArray(b)) return null;
  if (JSON.stringify(b).length > MAX_BODY) return null;
  return b;
}

function ipKey(req) {
  const raw = String(req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || 'none').split(',')[0].trim();
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 16);
}

function gameOf(v) {
  if (typeof v !== 'string' || v.length > 40) return null;
  return Object.prototype.hasOwnProperty.call(GAMES, v) ? v : null;
}

// Slur filter. Tags are checked after turning look-alike digits into letters.
const TAG_BLOCK = ['FAG', 'FGT', 'NIG', 'NGR', 'NGA', 'NIGA', 'KKK', 'KYK', 'KIK', 'SPC', 'SPK', 'CHK', 'GOK', 'GUK', 'WOP', 'DYK', 'JAP', 'CNK', 'RTD'];
const LINK_PARTS = ['nigger', 'nigga', 'faggot', 'wetback', 'tranny', 'raghead', 'towelhead', 'beaner'];
const LINK_WORDS = ['kike', 'chink', 'spic', 'coon', 'gook', 'dyke', 'retard', 'fag'];

function deLeet(s) {
  return s.replace(/0/g, 'O').replace(/1/g, 'I').replace(/3/g, 'E').replace(/4/g, 'A')
    .replace(/5/g, 'S').replace(/7/g, 'T').replace(/8/g, 'B').replace(/9/g, 'G');
}

function cleanTag(v) {
  if (typeof v !== 'string') return null;
  const t = v.toUpperCase().padEnd(3, ' ');
  if (!/^[A-Z0-9 ]{3}$/.test(t)) return null;
  if (t.trim() === '') return null;
  const squeezed = deLeet(t.replace(/ /g, ''));
  if (TAG_BLOCK.some(function (w) { return squeezed.indexOf(w) !== -1; })) return null;
  return t;
}

function textHasSlur(s) {
  const low = s.toLowerCase();
  if (LINK_PARTS.some(function (w) { return low.indexOf(w) !== -1; })) return true;
  const words = low.split(/[^a-z]+/);
  return words.some(function (w) { return LINK_WORDS.indexOf(w) !== -1 || LINK_WORDS.indexOf(w.replace(/s$/, '')) !== -1; });
}

// Malware check against URLhaus from abuse.ch: the exact URL, plus the domain's
// standing on the Spamhaus and SURBL block lists. Any failure rejects the link.
async function urlhaus(href, host) {
  const key = process.env.URLHAUS_KEY;
  if (!key) return 'links_disabled';
  const h = { 'Auth-Key': key, 'Content-Type': 'application/x-www-form-urlencoded' };
  try {
    const both = await Promise.all([
      fetch('https://urlhaus-api.abuse.ch/v1/url/', { method: 'POST', headers: h, body: 'url=' + encodeURIComponent(href), signal: AbortSignal.timeout(3500) }).then(function (r) { return r.json(); }),
      fetch('https://urlhaus-api.abuse.ch/v1/host/', { method: 'POST', headers: h, body: 'host=' + encodeURIComponent(host), signal: AbortSignal.timeout(3500) }).then(function (r) { return r.json(); })
    ]);
    const u = both[0], d = both[1];
    if (u.query_status === 'ok') return 'link_flagged';
    if (u.query_status !== 'no_results') return 'link_check_failed';
    if (d.query_status === 'ok') {
      const bl = d.blacklists || {};
      if ((bl.spamhaus_dbl && bl.spamhaus_dbl !== 'not listed') || (bl.surbl && bl.surbl !== 'not listed')) return 'link_flagged';
    } else if (d.query_status !== 'no_results') {
      return 'link_check_failed';
    }
    return null;
  } catch (e) {
    return 'link_check_failed';
  }
}

async function checkLink(raw) {
  if (raw === undefined || raw === null || raw === '') return { link: '', domain: '' };
  if (typeof raw !== 'string' || raw.length > 60) return { error: 'link_too_long' };
  const s = raw.trim();
  if (!/^https?:\/\//i.test(s)) return { error: 'link_invalid' };
  let u;
  try { u = new URL(s); } catch (e) { return { error: 'link_invalid' }; }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return { error: 'link_invalid' };
  if (u.username || u.password) return { error: 'link_invalid' };
  if (u.port && u.port !== '80' && u.port !== '443') return { error: 'link_invalid' };
  const host = u.hostname.toLowerCase();
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(host)) return { error: 'link_invalid' };
  if (textHasSlur(host + ' ' + decodeURIComponentSafe(u.pathname + u.search))) return { error: 'link_rejected' };
  const href = u.href;
  if (href.length > 200) return { error: 'link_too_long' };
  const bad = await urlhaus(href, host);
  if (bad) return { error: bad };
  return { link: href, domain: host.replace(/^www\./, '') };
}

function decodeURIComponentSafe(s) {
  try { return decodeURIComponent(s); } catch (e) { return s; }
}

function adminOk(req) {
  const want = process.env.ADMIN_KEY || '';
  const got = String(req.headers['x-admin-key'] || '');
  if (want.length < 16 || got.length !== want.length) return false;
  return crypto.timingSafeEqual(Buffer.from(got), Buffer.from(want));
}

module.exports = { GAMES, CAP, redis, start, send, fail, body, ipKey, gameOf, cleanTag, checkLink, adminOk };
