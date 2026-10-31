const crypto = require('crypto');
const L = require('./_lib.js');

module.exports = async function (req, res) {
  if (L.start(req, res)) return;
  if (req.method !== 'POST') return L.fail(res, 405, 'method_not_allowed');

  const b = L.body(req);
  if (!b) return L.fail(res, 413, 'bad_body');

  const game = L.gameOf(b.game);
  if (!game) return L.fail(res, 400, 'unknown_game');
  const g = L.GAMES[game];

  const tag = L.cleanTag(b.tag);
  if (!tag) return L.fail(res, 400, 'tag_rejected');

  const score = b.score;
  if (!Number.isInteger(score) || score < 1 || score > g.max) return L.fail(res, 400, 'score_rejected');

  const duration = b.duration;
  if (!Number.isInteger(duration) || duration < 1000 || duration > (g.maxMs || 6 * 3600 * 1000)) return L.fail(res, 400, 'duration_rejected');
  if (score / (duration / 1000) > g.perSecond) return L.fail(res, 400, 'score_too_fast');

  try {
    const rl = await L.redis([['SET', 'rl:' + L.ipKey(req) + ':' + game, '1', 'NX', 'EX', 10]]);
    if (rl[0] !== 'OK') return L.fail(res, 429, 'slow_down');

    const lk = await L.checkLink(b.link);
    if (lk.error) return L.fail(res, 400, lk.error);

    const id = crypto.randomBytes(8).toString('hex');
    const ts = Date.now();
    const act = JSON.stringify({ id: id, game: game, tag: tag, link: lk.link, domain: lk.domain, score: score, ts: ts });

    const out = await L.redis([
      ['HSET', 'e:' + id, 'game', game, 'tag', tag, 'link', lk.link, 'domain', lk.domain, 'score', score, 'duration', duration, 'ts', ts],
      ['ZADD', 'lb:' + game, score, id],
      ['LPUSH', 'act:' + game, act],
      ['LTRIM', 'act:' + game, 0, L.CAP - 1],
      ['LPUSH', 'act:all', act],
      ['LTRIM', 'act:all', 0, L.CAP - 1],
      ['ZCARD', 'lb:' + game]
    ]);

    const count = out[6];
    if (count > L.CAP) {
      const popped = await L.redis([['ZPOPMIN', 'lb:' + game, count - L.CAP]]);
      const gone = (popped[0] || []).filter(function (v, i) { return i % 2 === 0; });
      if (gone.length) await L.redis([['DEL'].concat(gone.map(function (x) { return 'e:' + x; }))]);
    }

    const rank = await L.redis([['ZREVRANK', 'lb:' + game, id]]);
    L.send(res, 200, {
      ok: true,
      entry: { id: id, game: game, tag: tag, link: lk.link, domain: lk.domain, score: score, ts: ts },
      rank: rank[0] === null ? null : rank[0] + 1
    });
  } catch (e) {
    L.fail(res, 503, 'service_unavailable');
  }
};
