const L = require('./_lib.js');

module.exports = async function (req, res) {
  if (L.start(req, res)) return;
  if (req.method !== 'GET') return L.fail(res, 405, 'method_not_allowed');

  let key = 'act:all';
  if (req.query.game) {
    const game = L.gameOf(req.query.game);
    if (!game) return L.fail(res, 400, 'unknown_game');
    key = 'act:' + game;
  }
  let limit = parseInt(req.query.limit, 10);
  if (!Number.isInteger(limit) || limit < 1) limit = 20;
  if (limit > L.CAP) limit = L.CAP;

  try {
    const raw = (await L.redis([['LRANGE', key, 0, limit - 1]]))[0] || [];
    const items = [];
    raw.forEach(function (s) {
      try {
        const a = JSON.parse(s);
        items.push({ id: a.id, game: a.game, name: (L.GAMES[a.game] || {}).name || a.game, tag: a.tag, link: a.link || '', domain: a.domain || '', score: a.score, ts: a.ts });
      } catch (e) {}
    });
    L.send(res, 200, { ok: true, activity: items });
  } catch (e) {
    L.fail(res, 503, 'service_unavailable');
  }
};
