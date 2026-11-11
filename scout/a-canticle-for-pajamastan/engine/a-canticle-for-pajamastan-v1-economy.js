// A Canticle for Pajamastan engine, economy module, version one.
// Built from a-canticle-for-pajamastan-v1-spec-economy.md. Numbers come from the economy tuning file.
// Shop stock is built with the loot module, so it needs loot tuning and a channels object from the rng module.
(function (root) {
  var C = root.Canticle = root.Canticle || {};
  function L() { return C.loot || (typeof require === 'function' ? require('./a-canticle-for-pajamastan-v1-loot.js') : null); }

  function tierPrice(list, tier) { return list[Math.min(tier, list.length - 1)]; }

  function price(t, item) {
    if (!item) return 0;
    if (item.rare) return t.rarePrice;
    if (item.category === 'weapon') {
      var p = tierPrice(t.weaponTierPrice, item.tier);
      p += p * t.refinePrice * (item.refine || 0);
      (item.bonuses || []).forEach(function (b) { p += b.amount * t.bonusPointPrice; });
      if (item.special) p += p * t.specialPrice;
      return Math.round(p);
    }
    if (item.category === 'armor' || item.category === 'shield') {
      return Math.round(tierPrice(t.armorTierPrice, item.tier) + ((item.defenseBonus || 0) + (item.evasionBonus || 0)) * t.armorBonusPointPrice);
    }
    if (item.category === 'charm') return item.stars * t.charmStarPrice;
    if (item.category === 'tool') return (t.toolPrices[item.name] || 50) + (item.level ? item.level * t.scrollLevelPrice : 0);
    if (item.category === 'currency') return item.amount;
    return 0;
  }

  function sellPrice(t, item) { return item && item.unidentified ? 1 : Math.floor(price(t, item) * t.sellShare); }

  function rollShop(t, lootT, ch, playerLevel) {
    var depth = Math.floor(playerLevel / t.shopDepthPerLevels);
    var loot = L();
    var weapons = [], armor = [], tools = [];
    for (var i = 0; i < t.shopCounts.weapon; i++) { var w = loot.build(lootT, ch, 'weapon', depth); w.special = null; weapons.push(w); }
    for (var j = 0; j < t.shopCounts.armor; j++) armor.push(loot.build(lootT, ch, ch.get('shopArmor').chance(0.6) ? 'armor' : 'shield', depth));
    t.shopToolsAlways.forEach(function (n) { tools.push({ category: 'tool', name: n }); });
    var lvMax = Math.max(1, Math.min(30, Math.floor(playerLevel / 4) + 1));
    for (var k = 0; k < t.shopScrollCount; k++) tools.push({ category: 'tool', name: 'Spell Scroll', level: ch.get('shopScroll').intRange(1, lvMax) });
    function tag(list) { return list.map(function (it) { return { item: it, price: price(t, it) }; }); }
    return { weapon: tag(weapons), armor: tag(armor), tool: tag(tools) };
  }

  function refineCap(t, item) { return t.refineCapByTier[Math.min(item.tier, t.refineCapByTier.length - 1)]; }

  // inventory: { 'Refining Grit': count }
  function refine(t, item, inventory) {
    if (!item || item.category !== 'weapon') return { ok: false, reason: 'not a weapon' };
    if (item.unidentified) return { ok: false, reason: 'unidentified' };
    if ((item.refine || 0) >= refineCap(t, item)) return { ok: false, reason: 'at cap' };
    if (!inventory['Refining Grit']) return { ok: false, reason: 'no refining grit' };
    inventory['Refining Grit']--;
    item.refine = (item.refine || 0) + 1;
    return { ok: true, refine: item.refine };
  }

  function maybeUnidentified(t, item, ch) {
    if (item && (item.rare || (item.special && ch.get('unid').chance(t.unidentifiedSpecialChance)))) item.unidentified = true;
    return item;
  }

  function appraise(t, item, wallet, ch) {
    if (!item || !item.unidentified) return { ok: false, reason: 'already known' };
    if (wallet.coin < t.appraiseFee) return { ok: false, reason: 'not enough coin' };
    wallet.coin -= t.appraiseFee;
    delete item.unidentified;
    var shift = 0;
    if (item.category === 'weapon') {
      var r = ch.get('appraise').next();
      if (r < t.appraiseUpChance && (item.refine || 0) < refineCap(t, item)) shift = 1;
      else if (r < t.appraiseUpChance + t.appraiseDownChance && (item.refine || 0) > 0) shift = -1;
      item.refine = (item.refine || 0) + shift;
    }
    return { ok: true, shift: shift, item: item };
  }

  function storage(t) {
    var box = { items: [], coin: 0 };
    return {
      box: box,
      put: function (item) { if (box.items.length >= t.storageSlots) return false; box.items.push(item); return true; },
      take: function (i) { return box.items.splice(i, 1)[0] || null; },
      deposit: function (wallet, n) { var g = Math.min(n, wallet.coin, t.storageCurrencyCap - box.coin); wallet.coin -= g; box.coin += g; return g; },
      withdraw: function (wallet, n) { var g = Math.min(n, box.coin); box.coin -= g; wallet.coin += g; return g; }
    };
  }

  // Trade handshake. a and b are { id, x, y, items: [], coin }.
  function trade(t, a, b) {
    var s = { state: 'requested', offer: {}, offerOk: {}, finalOk: {}, log: [] };
    s.offer[a.id] = { items: [], coin: 0 }; s.offer[b.id] = { items: [], coin: 0 };
    var who = {}; who[a.id] = a; who[b.id] = b;
    function reset() { s.offerOk = {}; s.finalOk = {}; if (s.state === 'final') s.state = 'open'; }
    function other(id) { return id === a.id ? b.id : a.id; }
    s.accept = function (id) { if (s.state === 'requested' && id === b.id) { s.state = 'open'; s.log.push(id + ' accepted'); return true; } return false; };
    s.addItem = function (id, index) {
      if (s.state !== 'open' && s.state !== 'final') return false;
      var it = who[id].items[index]; if (!it || s.offer[id].items.indexOf(it) >= 0) return false;
      s.offer[id].items.push(it); reset(); s.log.push(id + ' offered ' + (it.name || it.category)); return true;
    };
    s.removeItem = function (id, index) { s.offer[id].items.splice(index, 1); reset(); return true; };
    s.setCoin = function (id, n) { s.offer[id].coin = Math.max(0, Math.min(n, who[id].coin)); reset(); s.log.push(id + ' offered ' + s.offer[id].coin + ' coin'); return true; };
    s.confirmOffer = function (id) {
      if (s.state !== 'open') return false;
      s.offerOk[id] = true; s.log.push(id + ' confirmed offer');
      if (s.offerOk[a.id] && s.offerOk[b.id]) { s.state = 'final'; s.log.push('final summary shown'); }
      return true;
    };
    s.confirmFinal = function (id) {
      if (s.state !== 'final') return false;
      s.finalOk[id] = true; s.log.push(id + ' confirmed final');
      if (s.finalOk[a.id] && s.finalOk[b.id]) {
        [a.id, b.id].forEach(function (pid) {
          var give = s.offer[pid], to = who[other(pid)], from = who[pid];
          give.items.forEach(function (it) { from.items.splice(from.items.indexOf(it), 1); to.items.push(it); });
          from.coin -= give.coin; to.coin += give.coin;
        });
        s.state = 'done'; s.log.push('items swapped');
      }
      return true;
    };
    s.cancel = function (id, why) { if (s.state !== 'done') { s.state = 'cancelled'; s.log.push((id || 'trade') + ' cancelled' + (why ? ' (' + why + ')' : '')); } };
    s.checkRange = function () {
      var dx = a.x - b.x, dy = a.y - b.y;
      if (Math.sqrt(dx * dx + dy * dy) > t.tradeDistance) s.cancel(null, 'too far apart');
      return s.state;
    };
    return s;
  }

  var api = { price: price, sellPrice: sellPrice, rollShop: rollShop, refine: refine, refineCap: refineCap, maybeUnidentified: maybeUnidentified, appraise: appraise, storage: storage, trade: trade };
  C.economy = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
