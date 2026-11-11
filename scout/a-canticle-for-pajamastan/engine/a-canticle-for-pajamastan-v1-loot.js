// A Canticle for Pajamastan engine, loot module, version one.
// Built from a-canticle-for-pajamastan-v1-spec-loot.md. Numbers come from the loot tuning file.
// Needs a channels object from the rng module so every roll has its own stream.
(function (root) {
  var C = root.Canticle = root.Canticle || {};

  function buildWeapon(t, ch, depth) {
    var family = ch.get('weaponFamily').weighted(t.weaponFamilies);
    var tierRoll = Number(ch.get('tier').weighted(t.tierWeights));
    var tier = Math.max(0, tierRoll + Math.round(depth * t.tierPerDepth) - t.tierDrop);
    var refine = Number(ch.get('refine').weighted(t.refineWeights));
    var slots = [];
    for (var i = 0; i < 3; i++) {
      var on = ch.get('bonusSlot').chance(t.bonusSlotChance[i] || 0);
      var fam = on ? ch.get('bonusFamily').weighted(t.bonusFamilyWeights) : 'none';
      var amt = on ? Number(ch.get('bonusAmount').weighted(t.bonusAmountWeights)) : 0;
      amt = Math.round(amt / 5) * 5;
      slots.push({ family: fam, amount: amt });
    }
    var cleaned = [];
    var stop = false;
    for (var j = 0; j < slots.length; j++) {
      var s = slots[j];
      var dup = cleaned.some(function (c) { return c.family === s.family; });
      if (stop || s.family === 'none' || dup || s.amount <= 0) { stop = true; continue; }
      cleaned.push(s);
    }
    var item = { category: 'weapon', family: family, tier: tier, refine: refine, bonuses: cleaned, special: null };
    if (ch.get('special').percent() < t.specialChance) {
      var strength = Math.max(1, Math.round(t.specialTierMax * ch.get('specialRatio').ratio()));
      item.special = { name: ch.get('specialName').pick(t.specials), strength: strength };
    }
    return item;
  }

  function buildArmor(t, ch, depth, category) {
    var tierRoll = Number(ch.get('tier').weighted(t.tierWeights));
    var tier = Math.max(0, tierRoll + Math.round(depth * t.tierPerDepth) - t.tierDrop);
    return {
      category: category,
      tier: tier,
      defenseBonus: Math.floor(t.armorMaxBonus.defense * ch.get('armorDef').ratio()),
      evasionBonus: Math.floor(t.armorMaxBonus.evasion * ch.get('armorEva').ratio())
    };
  }

  function buildCharm(t, ch, depth) {
    var ceiling = t.charmStarCeiling + Math.floor(depth / 2);
    var stars = Math.max(1, Math.floor(ceiling * ch.get('charmStars').ratio()) + 1);
    return { category: 'charm', stars: Math.min(stars, ceiling) };
  }

  function buildTool(t, ch) {
    var name = ch.get('tool').weighted(t.tools);
    var item = { category: 'tool', name: name };
    if (name === 'Spell Scroll') item.level = ch.get('spellLevel').intRange(t.spellLevelRange[0], t.spellLevelRange[1]);
    return item;
  }

  function buildCurrency(t, ch, depth) {
    var lo = t.currencyRange[0] + depth * t.currencyPerDepth;
    var hi = t.currencyRange[1] + depth * t.currencyPerDepth;
    return { category: 'currency', amount: ch.get('currency').intRange(lo, hi) };
  }

  function build(t, ch, category, depth) {
    if (category === 'weapon') return buildWeapon(t, ch, depth);
    if (category === 'armor' || category === 'shield') return buildArmor(t, ch, depth, category);
    if (category === 'charm') return buildCharm(t, ch, depth);
    if (category === 'tool') return buildTool(t, ch);
    if (category === 'currency') return buildCurrency(t, ch, depth);
    return null;
  }

  function applyRestrictions(item, rules) {
    if (!item || !rules) return item;
    if (rules.noSpecials && item.special) item.special = null;
    if (rules.banned && rules.banned.indexOf(item.category) >= 0) return null;
    return item;
  }

  // Roll the drop for one enemy kill.
  function rollEnemy(t, ch, enemyType, opts) {
    opts = opts || {};
    var depth = opts.depth || 0;
    var info = t.enemies[enemyType];
    if (!info) return null;
    if (info.rare && ch.get('rare').next() < info.rare.chance) {
      return { category: 'rare', name: info.rare.item, rare: true };
    }
    if (ch.get('gate').percent() >= info.dropChance) return null;
    var weights = opts.specialVariant ? t.specialVariantCategoryWeights : t.categoryWeights;
    var pick = ch.get('category').weighted(weights);
    var category = pick === 'signature' ? info.signature : pick;
    return applyRestrictions(build(t, ch, category, depth), opts.rules);
  }

  // Roll the contents of one breakable container.
  function rollContainer(t, ch, opts) {
    opts = opts || {};
    var depth = opts.depth || 0;
    var rares = t.containerRares || [];
    for (var i = 0; i < rares.length; i++) {
      if (ch.get('rare').next() < rares[i].chance) return { category: 'rare', name: rares[i].item, rare: true };
    }
    var category = ch.get('containerCategory').weighted(t.containerCategoryWeights);
    return applyRestrictions(build(t, ch, category, depth), opts.rules);
  }

  function describe(item) {
    if (!item) return 'nothing';
    if (item.rare) return 'RARE ' + item.name;
    if (item.category === 'currency') return item.amount + ' coin';
    if (item.category === 'tool') return item.name + (item.level ? ' lv' + item.level : '');
    if (item.category === 'charm') return 'Charm ' + item.stars + ' star';
    if (item.category === 'weapon') {
      var b = item.bonuses.map(function (x) { return x.family + ' ' + x.amount; }).join(' / ');
      return (item.special ? item.special.name + ' ' : '') + item.family + ' t' + item.tier + (item.refine ? ' +' + item.refine : '') + (b ? ' [' + b + ']' : '');
    }
    return item.category + ' t' + item.tier + ' def+' + item.defenseBonus + ' eva+' + item.evasionBonus;
  }

  var api = { rollEnemy: rollEnemy, rollContainer: rollContainer, build: build, describe: describe };
  C.loot = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
