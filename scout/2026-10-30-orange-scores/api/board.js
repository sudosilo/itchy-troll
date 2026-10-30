const L = require('./_lib.js');

module.exports = async function (req, res) {
  if (L.start(req, res)) return;
  if (req.method !== 'GET') return L.fail(res, 405, 'method_not_allowed');

  const game = L.gameOf(req.query.game);
  if (!game) return L.fail(res, 400, 'unknown_game');
  let limit = parseInt(req.query.limit, 10);
  if (!Number.isInteger(limit) || limit < 1) limit = 10;
  if (limit > 50) limit = 50;

  try {
    const ids = (await L.redis([['ZREVRANGE', 'lb:' + game, 0, limit - 1]]))[0] || [];
    if (!ids.length) return L.send(res, 200, { ok: true, game: game, board: [] });
    const rows = await L.redis(ids.map(function (id) { return ['HMGET', 'e:' + id, 'tag', 'link', 'domain', 'score', 'ts']; }));
    const board = [];
    rows.forEach(function (r, i) {
      if (!r || r[0] === null) return;
      board.push({ rank: board.length + 1, id: ids[i], tag: r[0], link: r[1] || '', domain: r[2] || '', score: Number(r[3]), ts: Number(r[4]) });
    });
    L.send(res, 200, { ok: true, game: game, board: board });
  } catch (e) {
    L.fail(res, 503, 'service_unavailable');
  }
};
