// A Canticle for Pajamastan engine, weapon specials module, version one.
// Built from a-canticle-for-pajamastan-v1-spec-specials.md. Numbers come from the specials tuning file.
// Uses the status module for status specials when it is loaded.
(function (root) {
  var C = root.Canticle = root.Canticle || {};
  function S() { return C.status || (typeof require === 'function' ? require('./a-canticle-for-pajamastan-v1-status.js') : null); }

  // weapon: { family, special: { name, strength } }. attacker: { hp, maxHp, sp, maxSp, exp }. target: { hp, maxHp, sp, level, boss, isPlayer, resist }.
  // ctx: { tier, bossArea, statusTuning }. Returns { fired, kind, amount, reason }.
  function fire(t, weapon, attacker, target, ctx, rand) {
    ctx = ctx || {}; rand = rand || Math.random;
    if (!weapon || !weapon.special) return { fired: false, reason: 'no special' };
    var def = t.kinds[weapon.special.name];
    if (!def) return { fired: false, reason: 'unknown special' };
    var factor = t.familyFactor[weapon.family] || 1;
    var power = def.powerPerStrength * (weapon.special.strength || 1);
    var tier = ctx.tier || 0;
    var resist = function (k) { return (target.resist && target.resist[k]) || 0; };
    var out = { fired: false, kind: def.kind, amount: 0 };

    if (def.kind === 'drainHp' || def.kind === 'drainSp') {
      if (target.boss) return { fired: false, kind: def.kind, reason: 'boss' };
      var pool = def.kind === 'drainHp' ? 'hp' : 'sp';
      var amt = Math.min(def.capPerTier * (tier + 1), power / 100 * (target[pool] || 0)) * factor;
      amt = Math.max(1, Math.floor(amt));
      amt = Math.min(amt, target[pool] || 0);
      target[pool] = (target[pool] || 0) - amt;
      var maxKey = pool === 'hp' ? 'maxHp' : 'maxSp';
      attacker[pool] = Math.min(attacker[maxKey] || Infinity, (attacker[pool] || 0) + amt);
      out.fired = amt > 0; out.amount = amt; return out;
    }
    if (def.kind === 'siphonExp') {
      if (ctx.bossArea) return { fired: false, kind: def.kind, reason: 'boss area' };
      if (target.isPlayer) return { fired: false, kind: def.kind, reason: 'player' };
      var e = Math.max(1, Math.floor(Math.min(def.capPerTier * (tier + 1), power / 100 * (target.level || 1) * 10) * factor));
      attacker.exp = (attacker.exp || 0) + e;
      out.fired = true; out.amount = e; return out;
    }
    if (def.kind === 'status') {
      var chance = Math.max(0, (power - resist(def.status)) * factor);
      var st = S(), r;
      if (st) r = st.apply(ctx.statusTuning, target, def.status, 0, { chance: chance }, rand);
      else r = { applied: rand() * 100 < chance };
      out.fired = !!r.applied; out.status = def.status; out.chance = chance; out.reason = r.reason; return out;
    }
    if (def.kind === 'fell') {
      if (target.boss || target.isPlayer) return { fired: false, kind: def.kind, reason: 'immune' };
      var fc = Math.max(0, (power - resist('death')) * factor);
      out.chance = fc;
      if (rand() * 100 < fc) { target.hp = 0; out.fired = true; }
      return out;
    }
    if (def.kind === 'cleave') {
      var share = power / 100 * (target.boss ? def.bossShare : 1) * factor;
      var cut = Math.max(1, Math.floor(Math.min(def.capPerTier * (tier + 1), (target.hp || 0) * share)));
      target.hp = Math.max(0, (target.hp || 0) - cut);
      out.fired = true; out.amount = cut; return out;
    }
    return { fired: false, reason: 'unknown kind' };
  }

  var api = { fire: fire };
  C.specials = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
