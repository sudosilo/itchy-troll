// A Canticle for Pajamastan engine, combat module, version one.
// Built from a-canticle-for-pajamastan-v1-spec-combat.md. Numbers come from the combat tuning file.
(function (root) {
  var C = root.Canticle = root.Canticle || {};

  // fighter: { stats: {power, mind, evasion, vitality, defense, accuracy, luck}, hp, maxHp,
  //   family, isPlayer, invulnerable, superMeter, x, y }
  // weapon: { spread, bonuses: [{family, amount}], ranged, special }
  // parts: optional list of struck body parts, each { armor }

  function kindOf(tuning, kind) {
    return tuning.attackKinds[kind] || tuning.attackKinds.quick;
  }

  function hitChance(tuning, attacker, defender, opts) {
    opts = opts || {};
    var kind = kindOf(tuning, opts.kind);
    var steps = tuning.comboStepAccuracyBonus || [0];
    var step = Math.max(0, Math.min(steps.length - 1, opts.comboStep || 0));
    var chance = (tuning.hitChanceBase || 0) + (tuning.accuracyFactor || 1) * attacker.stats.accuracy * kind.accuracy + steps[step] - tuning.evasionFactor * defender.stats.evasion;
    if (opts.ranged) {
      var dx = (defender.x || 0) - (attacker.x || 0);
      var dy = (defender.y || 0) - (attacker.y || 0);
      chance -= Math.sqrt(dx * dx + dy * dy) * tuning.distancePenaltyPerUnit;
    }
    return chance;
  }

  function elementMultiplier(weapon, family) {
    var mult = 1;
    var bonuses = (weapon && weapon.bonuses) || [];
    for (var i = 0; i < bonuses.length && i < 3; i++) {
      if (bonuses[i] && bonuses[i].family === family) mult *= 1 + bonuses[i].amount / 100;
    }
    return mult;
  }

  function rollHit(tuning, attacker, defender, opts, rand) {
    var chance = hitChance(tuning, attacker, defender, opts);
    if (chance <= 0) return { hit: false, chance: chance };
    return { hit: rand() * 100 <= chance, chance: chance };
  }

  function rollDamage(tuning, attacker, defender, opts, rand) {
    opts = opts || {};
    var weapon = opts.weapon || attacker.weapon || { spread: 0, bonuses: [] };
    var kind = kindOf(tuning, opts.kind);
    var power = attacker.stats.power;
    var base = tuning.powerFactor * (power + (weapon.spread || 0) * rand());
    var elemental = tuning.elementFactor * power * (elementMultiplier(weapon, defender.family) - 1);
    var raw = base + elemental;
    var parts = opts.parts && opts.parts.length ? opts.parts : [{ armor: 0 }];
    var divisor = attacker.isPlayer ? tuning.critDivisorPlayer : tuning.critDivisorEnemy;
    var luck = Math.min(tuning.luckCap, attacker.stats.luck);
    var results = [];
    var total = 0;
    for (var i = 0; i < parts.length; i++) {
      var d = raw - tuning.defenseFactor * defender.stats.defense - (parts[i].armor || 0);
      if (d <= 0) { results.push({ damage: 0, blocked: true, crit: false }); continue; }
      d *= kind.damage * (opts.scale || 1);
      var crit = rand() * divisor <= luck;
      if (crit) d *= tuning.critMultiplier;
      d = Math.floor(d);
      results.push({ damage: d, blocked: false, crit: crit });
      total += d;
    }
    return { total: total, parts: results, special: !!kind.triggersSpecial && !!weapon.special };
  }

  function applyDamage(tuning, defender, total) {
    if (total <= 0) return { dying: defender.hp <= 0 };
    if (!defender.invulnerable) defender.hp = Math.max(0, defender.hp - total);
    defender.superMeter = (defender.superMeter || 0) + total * tuning.superMeterPerDamage;
    return { dying: defender.hp <= 0 };
  }

  // Full swing: hit check, then damage, then apply.
  function attack(tuning, attacker, defender, opts, rand) {
    rand = rand || Math.random;
    var h = rollHit(tuning, attacker, defender, opts, rand);
    if (!h.hit) return { hit: false, chance: h.chance, total: 0, parts: [], dying: false };
    var dmg = rollDamage(tuning, attacker, defender, opts, rand);
    var res = applyDamage(tuning, defender, dmg.total);
    return { hit: true, chance: h.chance, total: dmg.total, parts: dmg.parts, special: dmg.special, dying: res.dying };
  }

  // Combo tracker: call swing(nowMs) each attack, it returns the combo step to pass in opts.
  function comboTracker(tuning) {
    var step = -1;
    var last = -Infinity;
    var maxStep = (tuning.comboStepAccuracyBonus || [0]).length - 1;
    return {
      swing: function (now) {
        if (now - last > tuning.comboWindowMs || step >= maxStep) step = 0; else step += 1;
        last = now;
        return step;
      },
      reset: function () { step = -1; last = -Infinity; }
    };
  }

  var api = {
    hitChance: hitChance,
    rollHit: rollHit,
    rollDamage: rollDamage,
    applyDamage: applyDamage,
    attack: attack,
    elementMultiplier: elementMultiplier,
    comboTracker: comboTracker
  };
  C.combat = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
