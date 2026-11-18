const L = require('./_lib.js');
const M = require('./_mh.js');
const W = require('./_wallets.js').mobbyhill;

// GET: balance, this week's grant, prices and owned unlocks. POST { item }: spend tokens.
module.exports = async function (req, res) {
  if (L.start(req, res)) return;
  let uid;
  try { uid = M.who(req); } catch (e) { return L.fail(res, 503, 'service_unavailable'); }
  if (!uid) return L.fail(res, 401, 'sign_in');
  try {
    const c = M.cycleNow();
    if (req.method === 'GET') {
      const s = await M.rpc('mh_state', { p_uid: uid, p_cycle: c, p_grant: W.grant, p_cap: W.cap });
      return L.send(res, 200, { ok: true, balance: s.tokens, granted: s.granted, grant: W.grant, cap: W.cap, next: M.cycleEnd(c), items: W.items, unlocks: s.unlocks });
    }
    if (req.method !== 'POST') return L.fail(res, 405, 'method_not_allowed');
    const b = L.body(req);
    if (!b) return L.fail(res, 413, 'bad_body');
    const item = typeof b.item === 'string' && Object.prototype.hasOwnProperty.call(W.items, b.item) ? b.item : null;
    if (!item) return L.fail(res, 400, 'unknown_item');
    const rl = await L.redis([['SET', 'mhs:' + uid, '1', 'NX', 'PX', 800]]);
    if (rl[0] !== 'OK') return L.fail(res, 429, 'slow_down');
    await M.rpc('mh_state', { p_uid: uid, p_cycle: c, p_grant: W.grant, p_cap: W.cap });
    const keep = /^(veh|part)-/.test(item);
    const r = await M.rpc('mh_spend', { p_uid: uid, p_item: item, p_price: W.items[item], p_keep: keep });
    if (!r || !r.ok) return L.send(res, 402, { ok: false, error: (r && r.error) || 'not_spent', balance: r ? r.tokens : 0, price: W.items[item] });
    L.send(res, 200, { ok: true, item: item, price: W.items[item], balance: r.tokens, owned: !!r.owned, kept: keep });
  } catch (e) {
    L.fail(res, 503, 'service_unavailable');
  }
};
