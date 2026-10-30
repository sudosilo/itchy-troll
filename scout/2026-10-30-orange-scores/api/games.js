const L = require('./_lib.js');

module.exports = async function (req, res) {
  if (L.start(req, res)) return;
  if (req.method !== 'GET') return L.fail(res, 405, 'method_not_allowed');

  const slugs = Object.keys(L.GAMES);
  try {
    const tops = await L.redis(slugs.map(function (s) { return ['ZREVRANGE', 'lb:' + s, 0, 0, 'WITHSCORES']; }));
    const ids = tops.map(function (t) { return t && t[0] ? t[0] : null; });
    const want = ids.filter(Boolean);
    const tags = want.length ? await L.redis(want.map(function (id) { return ['HGET', 'e:' + id, 'tag']; })) : [];
    let j = 0;
    const games = slugs.map(function (s, i) {
      const g = L.GAMES[s];
      const out = { game: s, name: g.name, max: g.max, top: null };
      if (ids[i]) {
        out.top = { tag: tags[j] || '', score: Number(tops[i][1]) };
        j++;
      }
      return out;
    });
    L.send(res, 200, { ok: true, games: games });
  } catch (e) {
    L.fail(res, 503, 'service_unavailable');
  }
};
