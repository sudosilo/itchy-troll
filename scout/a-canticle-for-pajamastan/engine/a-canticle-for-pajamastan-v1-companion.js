// A Canticle for Pajamastan engine, companion module, version one.
// Built from a-canticle-for-pajamastan-v1-spec-companion.md. Numbers come from the companion tuning file.
(function (root) {
  var C = root.Canticle = root.Canticle || {};

  function create(t, opts) {
    opts = opts || {};
    var c = { form: opts.form || 'Ember Mote', bond: 0, smarts: 0, meter: 0, lastFed: -Infinity, archetype: opts.archetype || 'fighter', tracks: {}, unlocked: [], revivedThisRun: false };
    t.tracks.forEach(function (k) { c.tracks[k] = { level: opts.levels && opts.levels[k] || 0, progress: 0 }; });
    return c;
  }

  function totalLevel(c) { var s = 0; Object.keys(c.tracks).forEach(function (k) { s += c.tracks[k].level; }); return s; }

  function statBonus(t, c) {
    var out = {};
    t.tracks.forEach(function (k) { out[t.trackToStat[k]] = c.tracks[k].level * t.statPerLevel[k]; });
    return out;
  }

  function addProgress(t, c, track, amount) {
    var tr = c.tracks[track];
    tr.progress += amount;
    while (tr.progress >= t.progressPerLevel) {
      if (totalLevel(c) >= t.totalLevelCap) { tr.progress = t.progressPerLevel - 1; break; }
      tr.progress -= t.progressPerLevel; tr.level++;
    }
    while (tr.progress < 0) {
      if (tr.level <= 0) { tr.progress = 0; break; }
      tr.level--; tr.progress += t.progressPerLevel;
    }
  }

  function topTrack(t, c) {
    var best = null, bv = -1;
    t.tracks.forEach(function (k) { if (c.tracks[k].level > bv) { bv = c.tracks[k].level; best = k; } });
    var tied = t.tracks.filter(function (k) { return c.tracks[k].level === bv; });
    if (tied.length > 1) { var pref = t.archetypeTieBreak[c.archetype]; if (tied.indexOf(pref) >= 0) return pref; }
    return best;
  }

  function checkEvolve(t, c) {
    var stage = t.forms[c.form].stage, lv = totalLevel(c), next = null;
    if (stage === 0 && lv >= t.evolveAt[0]) next = t.stageOneByTop[topTrack(t, c)];
    if (stage === 1 && lv >= t.evolveAt[1]) {
      var rules = t.stageTwo[c.form] || {};
      Object.keys(rules).forEach(function (key) {
        if (next) return;
        var m = /^(even|odd)(\w+)$/.exec(key); if (!m) return;
        var tr = m[2].charAt(0).toLowerCase() + m[2].slice(1);
        var even = c.tracks[tr].level % 2 === 0;
        if ((m[1] === 'even') === even) next = rules[key];
      });
    }
    if (next && next !== c.form) { var from = c.form; c.form = next; return { from: from, to: next }; }
    return null;
  }

  function unlocks(t, c) {
    var lv = totalLevel(c), got = [];
    Object.keys(t.comebackUnlocks).forEach(function (need) {
      var move = t.comebackUnlocks[need];
      if (lv >= +need && c.unlocked.indexOf(move) < 0) { c.unlocked.push(move); got.push(move); }
    });
    return got;
  }

  // now: seconds clock. Returns { ok, reason, evolved, unlocked }.
  function feed(t, c, item, now, ignoreCooldown) {
    if (!ignoreCooldown && now - c.lastFed < t.feedCooldownSeconds) return { ok: false, reason: 'still full' };
    var table = t.feedTables[t.forms[c.form].feed];
    var row = table && table[item];
    if (!row) return { ok: false, reason: 'will not eat that' };
    c.lastFed = now;
    t.tracks.forEach(function (k) { if (row[k]) addProgress(t, c, k, row[k]); });
    c.bond = Math.max(0, Math.min(t.bondCap, c.bond + (row.bond || 0)));
    c.smarts = Math.max(0, Math.min(t.smartsCap, c.smarts + (row.smarts || 0)));
    var evolved = checkEvolve(t, c);
    return { ok: true, evolved: evolved, unlocked: unlocks(t, c), level: totalLevel(c) };
  }

  function smartsBonus(t, c) {
    var b = 0; t.smartsTiers.forEach(function (tier) { if (c.smarts >= tier.min) b = tier.bonus; }); return b;
  }

  // event: bossRoom, lowHealth, death, meterFull. Returns an action or null.
  function trigger(t, c, event, rand) {
    var a = t.actions[c.form] && t.actions[c.form][event];
    if (!a) return null;
    if (a.do === 'revive' && c.revivedThisRun) return null;
    var chance = a.chance + smartsBonus(t, c);
    if ((rand || Math.random)() * 100 >= chance) return { fired: false, chance: chance };
    if (a.do === 'revive') c.revivedThisRun = true;
    return { fired: true, chance: chance, action: a.do, strength: 1 + c.bond * t.actionStrengthPerBond / 10 };
  }

  function onPlayerDeath(t, c) { c.bond = Math.max(0, c.bond - t.deathBondLoss); }
  function tickMeter(t, c, dt) { c.meter = Math.min(100, c.meter + t.meterPerSecond * dt); return c.meter; }

  var api = { create: create, totalLevel: totalLevel, statBonus: statBonus, feed: feed, checkEvolve: checkEvolve, trigger: trigger, smartsBonus: smartsBonus, onPlayerDeath: onPlayerDeath, tickMeter: tickMeter };
  C.companion = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
