// A Canticle for Pajamastan engine, growth module, version one.
// Built from a-canticle-for-pajamastan-v1-spec-growth.md. Numbers come from the growth tuning file.
(function (root) {
  var C = root.Canticle = root.Canticle || {};
  var STATS = ['power', 'mind', 'evasion', 'vitality', 'defense', 'accuracy', 'luck'];

  function expForLevel(t, level) {
    if (level <= 1) return 0;
    return Math.floor(t.expBase * Math.pow(level - 1, t.expExponent));
  }

  function levelForExp(t, exp) {
    var lv = 1;
    while (lv < t.levelCap && expForLevel(t, lv + 1) <= exp) lv++;
    return lv;
  }

  function statsAt(t, className, level, boosts) {
    var cls = t.classes[className];
    var span = Math.max(1, t.levelCap - 1);
    var p = Math.max(0, Math.min(1, (level - 1) / span));
    var curve = Math.pow(p, cls.shape);
    var out = {};
    STATS.forEach(function (s) {
      var start = cls.start[s], cap = cls.cap[s];
      var v = cap === 0 ? 0 : Math.round(start + (cap - start) * curve);
      var b = boosts && boosts[s] ? Math.min(boosts[s], t.boostLimitPerStat) : 0;
      out[s] = cap === 0 ? 0 : v + b;
    });
    return out;
  }

  function poolsAt(t, className, level, stats) {
    var cls = t.classes[className];
    var arch = t.archetypes[cls.archetype];
    stats = stats || statsAt(t, className, level);
    return {
      maxHp: Math.round(stats.vitality * arch.healthFactor + arch.healthPerLevel * level),
      maxSp: stats.mind === 0 ? 0 : Math.round(stats.mind * arch.spellFactor + arch.spellPerLevel * level)
    };
  }

  // players: list of { id, inRoom, hitEnemy }. Returns { id: exp }.
  function shareExp(t, enemyExp, killerId, players) {
    var out = {};
    players.forEach(function (p) {
      if (!p.inRoom && p.id !== killerId) return;
      var share = p.id === killerId ? t.expShare.killer : (p.hitEnemy ? t.expShare.assist : t.expShare.roomBystander);
      out[p.id] = Math.floor(enemyExp * share);
    });
    return out;
  }

  var api = { STATS: STATS, expForLevel: expForLevel, levelForExp: levelForExp, statsAt: statsAt, poolsAt: poolsAt, shareExp: shareExp };
  C.growth = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
