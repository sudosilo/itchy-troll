// A Canticle for Pajamastan engine, spells module, version one.
// Built from a-canticle-for-pajamastan-v1-spec-spells.md. Numbers come from the spells tuning file.
// Needs the status module for status, buff and debuff spells.
(function (root) {
  var C = root.Canticle = root.Canticle || {};
  function S() { return C.status || (typeof require === 'function' ? require('./a-canticle-for-pajamastan-v1-status.js') : null); }

  function ceilingFor(t, className, spell) {
    var c = t.classCeilings[className];
    if (!c) return 0;
    return spell in c ? c[spell] : (c['default'] || 0);
  }

  // known: { spellName: level }. Returns the new level or null when nothing changed.
  function learn(t, known, className, spell, level) {
    var cap = ceilingFor(t, className, spell);
    var lv = Math.min(level, cap);
    if (lv <= 0 || (known[spell] || 0) >= lv) return null;
    known[spell] = lv;
    return lv;
  }

  function power(t, spell, level, boost) {
    var sp = t.spells[spell];
    if (!sp || sp.base === undefined) return 0;
    var p = level >= t.highLevelThreshold && sp.highBase !== undefined
      ? sp.highBase + sp.highPerLevel * level
      : sp.base + sp.perLevel * level;
    return p * (boost || 1);
  }

  function radius(t, spell, level) {
    var sp = t.spells[spell];
    return (sp.radius || 0) + Math.floor(level / t.radiusStepEvery) * (sp.radiusStep || 0);
  }

  function castTime(t, spell, archetype) {
    var ct = t.spells[spell].castTime;
    return archetype === 'caster' ? Math.max(0.1, ct - t.casterCastTimeCut) : ct;
  }

  function dist(a, b) { var dx = b.x - a.x, dy = b.y - a.y; return Math.sqrt(dx * dx + dy * dy); }

  // Pick who a spell touches. aim: {x,y} point for bolts and areas.
  function shapeTargets(t, spell, level, caster, aim, pool) {
    var sp = t.spells[spell];
    var r = radius(t, spell, level);
    var living = pool.filter(function (p) { return p.hp === undefined || p.hp > 0 || sp.kind === 'revive'; });
    if (sp.school === 'support') return living.filter(function (p) { return p === caster || dist(caster, p) <= r; });
    if (sp.shape === 'burst') return living.filter(function (p) { return dist(caster, p) <= r; });
    if (sp.shape === 'area') {
      var ax = aim.x - caster.x, ay = aim.y - caster.y, al = Math.sqrt(ax * ax + ay * ay) || 1;
      var reach = Math.min(al, t.areaReach);
      var spot = { x: caster.x + ax / al * reach, y: caster.y + ay / al * reach };
      return living.filter(function (p) { return dist(spot, p) <= r; });
    }
    // bolt: straight line toward aim
    var dx = aim.x - caster.x, dy = aim.y - caster.y, len = Math.sqrt(dx * dx + dy * dy) || 1;
    dx /= len; dy /= len;
    var hits = [];
    living.forEach(function (p) {
      var px = p.x - caster.x, py = p.y - caster.y;
      var along = px * dx + py * dy;
      if (along < 0 || along > t.boltRange) return;
      var side = Math.abs(px * dy - py * dx);
      if (side <= t.boltWidth) hits.push({ p: p, along: along });
    });
    hits.sort(function (a, b) { return a.along - b.along; });
    if (!sp.pierce) hits = hits.slice(0, 1);
    return hits.map(function (h) { return h.p; });
  }

  // Resolve a finished cast. caster: { x, y, stats, sp, className, archetype, boost }.
  // pool: enemies for hostile spells, allies for support spells. Returns { ok, reason, cost, results }.
  function cast(t, statusT, spell, level, caster, aim, pool, rand) {
    rand = rand || Math.random;
    var sp = t.spells[spell];
    if (!sp) return { ok: false, reason: 'unknown spell' };
    if (caster.sp !== undefined && caster.sp < sp.cost) return { ok: false, reason: 'not enough spell points' };
    if (caster.sp !== undefined) caster.sp -= sp.cost;
    var st = S();
    var targets = shapeTargets(t, spell, level, caster, aim || caster, pool);
    var pw = power(t, spell, level, caster.boost);
    var mind = caster.stats ? caster.stats.mind : 0;
    var results = [];
    var struck = {};
    targets.forEach(function (tg) {
      var id = tg.id || results.length;
      if (struck[id]) return;
      struck[id] = true;
      var r = { id: tg.id };
      if (sp.school === 'attack') {
        var resist = (tg.resist && tg.resist[sp.element]) || 0;
        var dmg = Math.max(0, Math.floor((pw + mind * t.mindFactor) * (1 - resist / 100)));
        if (st) dmg += st.onHit(statusT, tg, dmg);
        tg.hp = Math.max(0, (tg.hp || 0) - dmg);
        r.damage = dmg;
        if (sp.status && st) r.status = st.apply(statusT, tg, sp.status, 0, { chance: sp.statusChance }, rand);
      } else if (sp.school === 'status') {
        if (sp.kind && st) r.status = st.apply(statusT, tg, sp.kind, Math.round(pw), {}, rand);
        else if (st) r.status = st.apply(statusT, tg, sp.status, 0, { chance: sp.statusChance + (sp.statusPerLevel || 0) * level }, rand);
      } else if (sp.kind === 'heal') {
        if (tg.hp > 0) {
          var heal = Math.floor(pw * (st ? st.healMult(statusT, tg) : 1));
          var before = tg.hp; tg.hp = Math.min(tg.maxHp || tg.hp + heal, tg.hp + heal); r.healed = tg.hp - before;
        }
      } else if (sp.kind === 'cure') {
        if (st) st.cure(tg); r.cured = true;
      } else if (sp.kind === 'revive') {
        if (tg.hp <= 0) { tg.hp = Math.max(1, Math.floor((tg.maxHp || 100) * Math.min(1, pw / 100))); r.revived = true; }
      } else if (sp.kind && st) {
        r.status = st.apply(statusT, tg, sp.kind, Math.round(pw), {}, rand);
      }
      results.push(r);
    });
    return { ok: true, cost: sp.cost, power: pw, results: results };
  }

  // Wind up tracker. Call start, then advance each frame, then interrupt on a flinching hit.
  function windUp(t, spell, archetype) {
    var left = castTime(t, spell, archetype), dead = false;
    return {
      advance: function (dt) { if (dead) return 'lost'; left -= dt; return left <= 0 ? 'ready' : 'casting'; },
      interrupt: function () { dead = true; },
      left: function () { return Math.max(0, left); }
    };
  }

  var api = { learn: learn, ceilingFor: ceilingFor, power: power, radius: radius, castTime: castTime, shapeTargets: shapeTargets, cast: cast, windUp: windUp };
  C.spells = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
