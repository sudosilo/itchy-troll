// A Canticle for Pajamastan engine, status effects module, version one.
// Built from a-canticle-for-pajamastan-v1-spec-status.md. Numbers come from the status tuning file.
// A fighter gets fighter.status = { stat: {}, harm: {}, immune: {} } on first use.
// fighter.resist is an optional map of kind to percent, a value of one hundred or more means immune.
(function (root) {
  var C = root.Canticle = root.Canticle || {};
  var STAT_KINDS = ['powerUp', 'powerDown', 'guardUp', 'guardDown'];
  var HARM_KINDS = ['poison', 'paralysis', 'freeze', 'shock', 'slow', 'confusion', 'curse'];
  var LOCKS = ['paralysis', 'freeze', 'shock'];

  function box(f) {
    if (!f.status) f.status = { stat: {}, harm: {}, immune: {} };
    return f.status;
  }

  // Apply an effect message. opts: { chance (percent), duration } . Returns { applied, reason }.
  function apply(t, f, kind, value, opts, rand) {
    opts = opts || {};
    rand = rand || Math.random;
    var s = box(f);
    var resist = (f.resist && f.resist[kind]) || 0;
    if (f.hp !== undefined && f.hp <= 0) return { applied: false, reason: 'down' };
    if (STAT_KINDS.indexOf(kind) >= 0) {
      var pct = Math.min(t.statCapPercent, value);
      var dur = opts.duration || t.statDurationDefault;
      var cur = s.stat[kind];
      if (cur && cur.pct >= pct) { cur.left = Math.max(cur.left, dur); return { applied: true, reason: 'refreshed' }; }
      if (kind === 'powerDown' || kind === 'guardDown') {
        if (resist >= 100) return { applied: false, reason: 'immune' };
        if (opts.chance !== undefined && rand() * 100 >= opts.chance - resist) return { applied: false, reason: 'resisted' };
      }
      s.stat[kind] = { pct: pct, left: dur };
      return { applied: true, reason: 'new' };
    }
    if (HARM_KINDS.indexOf(kind) >= 0) {
      if (resist >= 100) return { applied: false, reason: 'immune' };
      if (s.harm[kind]) return { applied: false, reason: 'already' };
      if (s.immune[kind] > 0) return { applied: false, reason: 'cooldown' };
      var chance = opts.chance === undefined ? 100 : opts.chance;
      if (rand() * 100 >= chance - resist) return { applied: false, reason: 'resisted' };
      s.harm[kind] = { left: opts.duration || t.durations[kind], clock: 0 };
      return { applied: true, reason: 'new' };
    }
    if (kind === 'death') {
      if (resist >= 100 || f.boss) return { applied: false, reason: 'immune' };
      var dc = opts.chance === undefined ? 0 : opts.chance;
      if (rand() * 100 >= dc - resist) return { applied: false, reason: 'resisted' };
      f.hp = 0;
      return { applied: true, reason: 'killed' };
    }
    return { applied: false, reason: 'unknown kind' };
  }

  function tick(t, f, dt) {
    var s = box(f), events = [];
    Object.keys(s.immune).forEach(function (k) { s.immune[k] -= dt; if (s.immune[k] <= 0) delete s.immune[k]; });
    Object.keys(s.stat).forEach(function (k) {
      s.stat[k].left -= dt;
      if (s.stat[k].left <= 0) { delete s.stat[k]; events.push({ type: 'end', kind: k }); }
    });
    Object.keys(s.harm).forEach(function (k) {
      var h = s.harm[k];
      h.left -= dt; h.clock += dt;
      if (k === 'poison') {
        while (h.clock >= t.poisonTickSeconds) {
          h.clock -= t.poisonTickSeconds;
          var dmg = Math.max(1, Math.floor((f.maxHp || 100) * t.poisonShare));
          var before = f.hp;
          f.hp = Math.max(1, f.hp - dmg);
          if (before !== f.hp) events.push({ type: 'poisonTick', damage: before - f.hp });
        }
      }
      if (h.left <= 0) {
        delete s.harm[k];
        if (LOCKS.indexOf(k) >= 0) s.immune[k] = t.lockImmunitySeconds;
        events.push({ type: 'end', kind: k });
      }
    });
    return events;
  }

  function shockActive(t, h) {
    var cycle = t.shockOnSeconds + t.shockOffSeconds;
    return (h.clock % cycle) < t.shockOnSeconds;
  }

  function canAct(t, f) {
    var h = box(f).harm;
    if (h.paralysis || h.freeze) return false;
    if (h.shock && shockActive(t, h.shock)) return false;
    return true;
  }

  function canMove(t, f) {
    var h = box(f).harm;
    return !(h.paralysis || h.freeze || (h.shock && shockActive(t, h.shock)));
  }

  function speedMult(t, f) { return box(f).harm.slow ? 1 - t.slowPercent / 100 : 1; }
  function healMult(t, f) { return box(f).harm.curse ? t.curseHealMult : 1; }

  // Effective stat after buffs and debuffs, for 'power' and 'defense'.
  function statWith(f, stat) {
    var s = box(f).stat, base = f.stats ? f.stats[stat] : 0, pct = 0;
    if (stat === 'power') pct = (s.powerUp ? s.powerUp.pct : 0) - (s.powerDown ? s.powerDown.pct : 0);
    if (stat === 'defense') pct = (s.guardUp ? s.guardUp.pct : 0) - (s.guardDown ? s.guardDown.pct : 0);
    return Math.max(0, Math.round(base * (1 + pct / 100)));
  }

  // Call when a hit lands. Returns extra damage from shattering ice, or zero.
  function onHit(t, f, damage) {
    var s = box(f);
    if (s.harm.freeze && damage >= (f.maxHp || 100) * t.freezeShatterShare) {
      delete s.harm.freeze;
      s.immune.freeze = t.lockImmunitySeconds;
      return Math.floor(damage * t.freezeShatterBonus);
    }
    return 0;
  }

  // Confusion scrambles a movement input vector.
  function steerInput(f, dx, dy, rand) {
    if (!box(f).harm.confusion) return { x: dx, y: dy };
    var a = (rand || Math.random)() * Math.PI * 2, m = Math.sqrt(dx * dx + dy * dy);
    return { x: Math.cos(a) * m, y: Math.sin(a) * m };
  }

  function cure(f) { box(f).harm = {}; }
  function clearAll(f) { f.status = { stat: {}, harm: {}, immune: {} }; }

  function list(f) {
    var s = box(f), out = [];
    Object.keys(s.stat).forEach(function (k) { out.push(k + ' ' + s.stat[k].pct + '% ' + s.stat[k].left.toFixed(1) + 's'); });
    Object.keys(s.harm).forEach(function (k) { out.push(k + ' ' + s.harm[k].left.toFixed(1) + 's'); });
    return out;
  }

  var api = { STAT_KINDS: STAT_KINDS, HARM_KINDS: HARM_KINDS, apply: apply, tick: tick, canAct: canAct, canMove: canMove, speedMult: speedMult, healMult: healMult, statWith: statWith, onHit: onHit, steerInput: steerInput, cure: cure, clearAll: clearAll, list: list };
  C.status = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
