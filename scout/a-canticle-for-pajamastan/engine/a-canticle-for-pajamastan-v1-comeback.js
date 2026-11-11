// A Canticle for Pajamastan engine, comeback move module, version one.
// Built from a-canticle-for-pajamastan-v1-spec-comeback.md. Numbers come from the comeback tuning file.
(function (root) {
  var C = root.Canticle = root.Canticle || {};

  function chargeTaken(t, player, damage) {
    if (player.hp !== undefined && player.hp <= 0) return player.meter || 0;
    player.meter = Math.min(t.meterMax, (player.meter || 0) + damage * t.chargePerDamageTaken);
    return player.meter;
  }
  function chargeDealt(t, player, damage, fromComeback) {
    if (fromComeback || (player.hp !== undefined && player.hp <= 0)) return player.meter || 0;
    player.meter = Math.min(t.meterMax, (player.meter || 0) + damage * t.chargePerDamageDealt);
    return player.meter;
  }

  function movePower(t, move, level) {
    var m = t.moves[move];
    return m ? m.base + m.perLevel * level : 0;
  }

  // players: { id: { level, meter, move } }
  function startChain(t, players, starterId) {
    var p = players[starterId];
    if (!p || (p.meter || 0) < t.meterMax) return { ok: false, reason: 'meter not full' };
    p.meter = 0;
    var chain = { open: true, left: t.joinWindowSeconds, entries: [{ id: starterId, move: p.move, level: p.level }], donated: 0, joined: {} };
    chain.joined[starterId] = true;
    return { ok: true, chain: chain };
  }

  function join(t, chain, players, id) {
    var p = players[id];
    if (!chain.open) return { ok: false, reason: 'window closed' };
    if (chain.joined[id]) return { ok: false, reason: 'already in' };
    if (chain.entries.length >= t.chainBonus.length) return { ok: false, reason: 'chain full' };
    if ((p.meter || 0) < t.joinThreshold) return { ok: false, reason: 'not enough meter' };
    p.meter = 0;
    chain.joined[id] = true;
    chain.entries.push({ id: id, move: p.move, level: p.level });
    return { ok: true };
  }

  function donate(t, chain, players, id, amount) {
    var p = players[id];
    if (!chain.open) return { ok: false, reason: 'window closed' };
    var give = Math.min(amount, p.meter || 0);
    p.meter -= give;
    chain.donated += give;
    return { ok: true, given: give };
  }

  function tickChain(t, chain, dt) {
    if (!chain.open) return false;
    chain.left -= dt;
    if (chain.left <= 0) chain.open = false;
    return !chain.open;
  }

  // Fire the chain. Returns the ordered list of moves with their final power.
  function fire(t, chain) {
    chain.open = false;
    var donateMult = 1 + chain.donated * t.donateBonusPerPoint;
    return chain.entries.map(function (e, i) {
      var m = t.moves[e.move] || {};
      return { id: e.id, move: e.move, type: m.type, power: Math.round(movePower(t, e.move, e.level) * t.chainBonus[i] * donateMult), chainStep: i };
    });
  }

  // Damage a strike move does to one enemy, ignoring accuracy and evasion.
  function strikeDamage(t, power, enemyDefense) {
    return Math.max(0, Math.floor(power - enemyDefense * t.strikeDefenseFactor));
  }

  var api = { chargeTaken: chargeTaken, chargeDealt: chargeDealt, movePower: movePower, startChain: startChain, join: join, donate: donate, tickChain: tickChain, fire: fire, strikeDamage: strikeDamage };
  C.comeback = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
