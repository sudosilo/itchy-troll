// A Canticle for Pajamastan engine, gear module, version one.
// Built from a-canticle-for-pajamastan-v1-spec-gear.md. Numbers come from the gear tuning file.
// Layers stats from the growth, companion and status modules when they are loaded.
(function (root) {
  var C = root.Canticle = root.Canticle || {};
  var STATS = ['power', 'mind', 'evasion', 'vitality', 'defense', 'accuracy', 'luck'];
  function at(list, i) { return list[Math.max(0, Math.min(i, list.length - 1))]; }

  function rollSockets(t, ch) { return Number(ch.get('sockets').weighted(t.socketWeights)); }

  function charmFor(t, ch, stars) {
    var pool = t.charms[String(Math.max(1, Math.min(4, stars)))];
    var pick = ch.get('charmPick').pick(pool);
    return { category: 'charm', stars: stars, grants: JSON.parse(JSON.stringify(pick)) };
  }

  // Can this character equip the item? char: { className, archetype, level, stats }.
  function canEquip(t, char, item) {
    if (!item) return { ok: false, reason: 'nothing' };
    if (item.unidentified) return { ok: false, reason: 'unidentified' };
    if (item.lockClass && item.lockClass !== char.className) return { ok: false, reason: 'class locked' };
    if (item.lockArchetype && item.lockArchetype !== char.archetype) return { ok: false, reason: 'archetype locked' };
    if (item.category === 'weapon') {
      var classes = t.familyClasses[item.family] || [];
      if (classes.indexOf(char.className) < 0) return { ok: false, reason: char.className + ' cannot use ' + item.family };
      var stat = t.familyRequirement[item.family], need = at(t.requirementPerTier, item.tier);
      if ((char.stats[stat] || 0) < need) return { ok: false, reason: 'needs ' + need + ' ' + stat };
      return { ok: true };
    }
    if (item.category === 'armor' || item.category === 'shield') {
      var lv = at(t.armorLevelPerTier, item.tier);
      if (char.level < lv) return { ok: false, reason: 'needs level ' + lv };
      return { ok: true };
    }
    if (item.category === 'charm' || item.category === 'companion') return { ok: true };
    return { ok: false, reason: 'not equipment' };
  }

  // loadout: { weapon, armor, shield, charms: [] }. Charms need armor with enough sockets.
  function equip(t, char, loadout, slot, item, lockedOut) {
    if (lockedOut) return { ok: false, reason: 'busy' };
    var chk = canEquip(t, char, item);
    if (!chk.ok) return chk;
    if (slot === 'charm') {
      var sockets = loadout.armor ? (loadout.armor.sockets || 0) : 0;
      loadout.charms = loadout.charms || [];
      if (loadout.charms.length >= sockets) return { ok: false, reason: 'no free socket' };
      loadout.charms.push(item); return { ok: true };
    }
    loadout[slot] = item;
    return { ok: true };
  }

  function unequip(loadout, slot, index) {
    if (slot === 'charm') return (loadout.charms || []).splice(index, 1)[0] || null;
    var it = loadout[slot]; loadout[slot] = null;
    if (slot === 'armor') loadout.charms = [];
    return it;
  }

  function weaponStats(t, w) {
    if (!w) return { power: 0, spread: 0 };
    return { power: at(t.weaponPowerPerTier, w.tier) + (w.refine || 0) * t.refinePowerStep, spread: at(t.weaponSpreadPerTier, w.tier) };
  }

  // Final stats in layers. parts: { base, boosts, companion, loadout, fighterForStatus, statusModule }
  function finalStats(t, parts) {
    var s = {};
    STATS.forEach(function (k) { s[k] = (parts.base[k] || 0) + ((parts.boosts || {})[k] || 0) + ((parts.companion || {})[k] || 0); });
    var lo = parts.loadout || {};
    ['armor', 'shield'].forEach(function (slot) {
      var a = lo[slot]; if (!a) return;
      s.defense += at(t.armorDefensePerTier, a.tier) * (slot === 'shield' ? 0.5 : 1) + (a.defenseBonus || 0);
      s.evasion += at(t.armorEvasionPerTier, a.tier) * (slot === 'shield' ? 0.5 : 1) + (a.evasionBonus || 0);
    });
    var effects = [];
    (lo.charms || []).forEach(function (c) {
      var g = c.grants || {};
      if (g.effect === 'allStats') STATS.forEach(function (k) { s[k] += g.amount; });
      else if (g.effect) effects.push(g);
      else Object.keys(g).forEach(function (k) { s[k] = (s[k] || 0) + g[k]; });
    });
    var w = weaponStats(t, lo.weapon);
    s.power += w.power;
    Object.keys(s).forEach(function (k) { s[k] = Math.round(s[k]); });
    if (parts.fighterForStatus && C.status) {
      var f = parts.fighterForStatus, old = f.stats; f.stats = s;
      s.power = C.status.statWith(f, 'power'); s.defense = C.status.statWith(f, 'defense'); f.stats = old;
    }
    return { stats: s, weapon: lo.weapon ? { family: lo.weapon.family, spread: w.spread, bonuses: lo.weapon.bonuses || [], special: lo.weapon.special || null, ranged: /rifle|scattergun/.test(lo.weapon.family) } : null, effects: effects };
  }

  var api = { STATS: STATS, rollSockets: rollSockets, charmFor: charmFor, canEquip: canEquip, equip: equip, unequip: unequip, weaponStats: weaponStats, finalStats: finalStats };
  C.gear = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
