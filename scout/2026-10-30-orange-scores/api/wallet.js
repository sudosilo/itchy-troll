const L = require('./_lib.js');
const W = require('./_wallets.js');

// Cycles are calendar weeks starting Monday 00:00 UTC.
const WEEK = 7 * 86400000;
const MONDAY0 = 4 * 86400000; // the first Monday after Jan 1 1970 fell four days in
function cycleNow() { return Math.floor((Date.now() - MONDAY0) / WEEK); }
function cycleEnd(c) { return MONDAY0 + (c + 1) * WEEK; }
// A phone can open at most this many new wallets per cycle, so clearing storage does not farm tokens.
const NEW_PER_IP = 3;

function walletOf(v) {
  if (typeof v !== 'string' || v.length > 40) return null;
  return Object.prototype.hasOwnProperty.call(W, v) ? v : null;
}
function pidOf(v) { return typeof v === 'string' && /^[a-f0-9]{32}$/.test(v) ? v : null; }

// Adds this cycle's grant once. The SET NX key makes the grant happen a single time even if two calls race.
async function settle(req, game, pid) {
  const w = W[game], c = cycleNow(), key = 'w:' + game + ':' + pid;
  const have = await L.redis([['EXISTS', key], ['SET', 'wg:' + game + ':' + pid + ':' + c, '1', 'NX', 'EX', 15 * 86400]]);
  let granted = 0;
  if (have[1] === 'OK') {
    if (have[0] === 0) {
      const n = await L.redis([['INCR', 'wn:' + L.ipKey(req) + ':' + c], ['EXPIRE', 'wn:' + L.ipKey(req) + ':' + c, 8 * 86400]]);
      if (n[0] > NEW_PER_IP) {
        await L.redis([['DEL', 'wg:' + game + ':' + pid + ':' + c]]);
        return { error: 'too_many_wallets' };
      }
    }
    const bal = Number((await L.redis([['HGET', key, 'bal']]))[0] || 0);
    granted = Math.max(0, Math.min(w.cap, bal + w.grant) - bal);
    await L.redis([['HINCRBY', key, 'bal', granted], ['HSET', key, 'cyc', c], ['EXPIRE', key, 120 * 86400]]);
  }
  const bal = Number((await L.redis([['HGET', key, 'bal']]))[0] || 0);
  return { balance: bal, granted: granted, cycle: c, next: cycleEnd(c) };
}

module.exports = async function (req, res) {
  if (L.start(req, res)) return;
  const b = req.method === 'POST' ? L.body(req) : req.query;
  if (!b) return L.fail(res, 413, 'bad_body');
  const game = walletOf(b.game);
  if (!game) return L.fail(res, 400, 'unknown_wallet');
  const pid = pidOf(b.pid);
  if (!pid) return L.fail(res, 400, 'bad_player');
  const w = W[game];

  try {
    if (req.method === 'GET') {
      const s = await settle(req, game, pid);
      if (s.error) return L.fail(res, 429, s.error);
      return L.send(res, 200, { ok: true, game: game, balance: s.balance, granted: s.granted, grant: w.grant, cap: w.cap, next: s.next, items: w.items });
    }
    if (req.method !== 'POST') return L.fail(res, 405, 'method_not_allowed');

    const item = typeof b.item === 'string' && Object.prototype.hasOwnProperty.call(w.items, b.item) ? b.item : null;
    if (!item) return L.fail(res, 400, 'unknown_item');
    const price = w.items[item];
    const rl = await L.redis([['SET', 'wrl:' + pid, '1', 'NX', 'PX', 800]]);
    if (rl[0] !== 'OK') return L.fail(res, 429, 'slow_down');

    const s = await settle(req, game, pid);
    if (s.error) return L.fail(res, 429, s.error);
    const key = 'w:' + game + ':' + pid;
    // take the tokens, then give them back if that went below zero
    const after = (await L.redis([['HINCRBY', key, 'bal', -price]]))[0];
    if (after < 0) {
      const back = (await L.redis([['HINCRBY', key, 'bal', price]]))[0];
      return L.send(res, 402, { ok: false, error: 'not_enough_tokens', balance: back, price: price });
    }
    const ts = Date.now();
    await L.redis([['LPUSH', 'wlog:' + game + ':' + pid, JSON.stringify({ item: item, price: price, ts: ts })], ['LTRIM', 'wlog:' + game + ':' + pid, 0, 49]]);
    L.send(res, 200, { ok: true, game: game, item: item, price: price, balance: after, next: s.next, ts: ts });
  } catch (e) {
    L.fail(res, 503, 'service_unavailable');
  }
};
