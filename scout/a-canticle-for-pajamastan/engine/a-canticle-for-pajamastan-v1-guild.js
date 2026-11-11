// A Canticle for Pajamastan engine, quest board module, version one.
// Built from a-canticle-for-pajamastan-v1-spec-guild.md. Quests and rewards come from the guild tuning file.
(function (root) {
  var C = root.Canticle = root.Canticle || {};

  // player: { level, flags: {}, cleared: { questId: { count, best } }, active: questId|null }
  function board(t, player, tier) {
    return t.quests.map(function (q) {
      var why = null;
      if (player.level < q.minLevel) why = 'needs level ' + q.minLevel;
      else if (q.needsFlags.some(function (f) { return !player.flags[f]; })) why = 'story not reached';
      else if (tier !== undefined && (tier < q.tiers[0] || tier > q.tiers[1])) why = 'not on this difficulty';
      else if (!q.repeatable && player.cleared && player.cleared[q.id]) why = 'already done';
      var rec = player.cleared && player.cleared[q.id];
      return { quest: q, open: !why, why: why, cleared: rec ? rec.count : 0, best: rec ? rec.best : null };
    });
  }

  function accept(t, player, id, tier) {
    if (player.active) return { ok: false, reason: 'already on a quest' };
    var row = board(t, player, tier).filter(function (r) { return r.quest.id === id; })[0];
    if (!row) return { ok: false, reason: 'no such quest' };
    if (!row.open) return { ok: false, reason: row.why };
    player.active = id; player.activeState = 'accepted'; player.activeTime = 0;
    return { ok: true };
  }

  function abandon(player) { player.active = null; player.activeState = null; }

  function finish(player, success, seconds) { if (!player.active) return false; player.activeState = success ? 'succeeded' : 'failed'; player.activeTime = seconds || 0; return true; }

  function report(t, player) {
    if (!player.active || player.activeState !== 'succeeded') return { ok: false, reason: 'nothing to report' };
    var q = t.quests.filter(function (x) { return x.id === player.active; })[0];
    player.cleared = player.cleared || {};
    var rec = player.cleared[q.id] || { count: 0, best: null };
    var share = rec.count > 0 ? t.repeatRewardShare : 1;
    rec.count++; if (player.activeTime && (rec.best === null || player.activeTime < rec.best)) rec.best = player.activeTime;
    player.cleared[q.id] = rec;
    q.setsFlags.forEach(function (f) { player.flags[f] = true; });
    player.active = null; player.activeState = null;
    return { ok: true, quest: q.title, coin: Math.round(q.reward.coin * share), items: rec.count > 1 ? [] : q.reward.items.slice(), exp: Math.round(q.reward.exp * share), flags: q.setsFlags.slice() };
  }

  var api = { board: board, accept: accept, abandon: abandon, finish: finish, report: report };
  C.guild = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
