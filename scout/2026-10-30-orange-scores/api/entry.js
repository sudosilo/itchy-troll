const L = require('./_lib.js');

module.exports = async function (req, res) {
  if (L.start(req, res)) return;
  if (req.method !== 'DELETE') return L.fail(res, 405, 'method_not_allowed');
  if (!L.adminOk(req)) return L.fail(res, 401, 'not_allowed');

  const id = String(req.query.id || '');
  if (!/^[a-f0-9]{16}$/.test(id)) return L.fail(res, 400, 'bad_id');

  try {
    let game = (await L.redis([['HGET', 'e:' + id, 'game']]))[0];
    const lists = ['act:all'].concat(Object.keys(L.GAMES).map(function (s) { return 'act:' + s; }));
    const raws = await L.redis(lists.map(function (k) { return ['LRANGE', k, 0, -1]; }));
    const cmds = [['DEL', 'e:' + id]];
    Object.keys(L.GAMES).forEach(function (s) { cmds.push(['ZREM', 'lb:' + s, id]); });
    raws.forEach(function (arr, i) {
      (arr || []).forEach(function (s) {
        try {
          const a = JSON.parse(s);
          if (a.id === id) { cmds.push(['LREM', lists[i], 0, s]); if (!game) game = a.game; }
        } catch (e) {}
      });
    });
    await L.redis(cmds);
    L.send(res, 200, { ok: true, removed: id, game: game || null });
  } catch (e) {
    L.fail(res, 503, 'service_unavailable');
  }
};
