// A Canticle for Pajamastan engine, modes module, version one.
// Built from a-canticle-for-pajamastan-v1-spec-modes.md. Numbers come from the modes tuning file.
(function (root) {
  var C = root.Canticle = root.Canticle || {};

  function scaleEnemy(t, tier, base) {
    var d = t.tiers[tier] || t.tiers[0];
    return {
      maxHp: Math.round(base.maxHp * d.health),
      stats: {
        power: Math.round(base.stats.power * d.power), defense: Math.round(base.stats.defense * d.defense),
        accuracy: Math.round(base.stats.accuracy * d.accuracy), evasion: Math.round(base.stats.evasion * d.evasion),
        mind: base.stats.mind || 0, vitality: base.stats.vitality || 0, luck: base.stats.luck || 0
      },
      level: (base.level || 1) + d.levelAdd,
      lootDepth: (base.depth || 0) + d.depthAdd
    };
  }

  function canCreateRoom(t, tier, level) { var d = t.tiers[tier]; return !!d && level >= d.minLevel; }

  function challenge(t, stageIndex, players) {
    var st = t.challenge.stages[stageIndex];
    var s = { stage: st, livesLeft: t.challenge.lives, time: 0, state: 'running', checkpoint: 0, log: [], drops: false };
    s.players = players.map(function (id) { return { id: id, level: st.level, loadout: JSON.parse(JSON.stringify(st.loadout)), alive: true }; });
    s.tick = function (dt) { if (s.state === 'running') s.time += dt; };
    s.reachCheckpoint = function (n) { s.checkpoint = Math.max(s.checkpoint, n); s.log.push('checkpoint ' + n); };
    s.death = function (id) {
      if (s.state !== 'running') return s.state;
      if (s.livesLeft > 0) { s.livesLeft--; s.log.push(id + ' respawned at checkpoint ' + s.checkpoint); return 'respawn'; }
      s.state = 'lost'; s.log.push('out of lives'); return 'lost';
    };
    s.retry = function () { s.livesLeft = t.challenge.lives; s.time = 0; s.checkpoint = 0; s.state = 'running'; s.log.push('retry'); };
    s.clear = function () {
      if (s.state !== 'running') return null;
      s.state = 'cleared';
      var rank = null;
      for (var i = 0; i < st.targetSeconds.length; i++) if (s.time <= st.targetSeconds[i]) { rank = t.challenge.ranks[i]; break; }
      s.rank = rank; s.log.push('cleared in ' + Math.round(s.time) + 's' + (rank ? ' rank ' + rank : ' no rank'));
      return rank;
    };
    return s;
  }

  function bestPrize(t, ranks) {
    var order = t.challenge.ranks;
    var best = null;
    ranks.forEach(function (r) { if (r && (best === null || order.indexOf(r) < order.indexOf(best))) best = r; });
    return best ? { rank: best, prize: t.challenge.prizes[best] } : null;
  }

  function battleScore(t, tally) {
    var w = t.battle.scoreWeights;
    return Math.round((tally.kills || 0) * w.kill + (tally.damageDealt || 0) * w.damageDealt + (tally.damageTaken || 0) * w.damageTaken + (tally.deaths || 0) * w.death);
  }

  function battle(t, presetName, players) {
    var rules = t.battle.presets[presetName];
    var b = { rules: rules, time: 0, state: 'running', tally: {}, log: [] };
    players.forEach(function (p) { b.tally[p.id] = { kills: 0, damageDealt: 0, damageTaken: 0, deaths: 0, lives: rules.lives, team: p.team, out: false }; });
    b.tick = function (dt) {
      if (b.state !== 'running') return;
      b.time += dt;
      if (rules.timeLimit && b.time >= rules.timeLimit) { b.state = 'over'; b.log.push('time up'); }
    };
    b.damage = function (from, to, amount) { b.tally[from].damageDealt += amount; b.tally[to].damageTaken += amount; };
    b.kill = function (from, to) {
      if (b.state !== 'running') return null;
      b.tally[from].kills++; b.tally[to].deaths++;
      var res = 'respawn';
      if (rules.lives) { b.tally[to].lives--; if (b.tally[to].lives <= 0) { b.tally[to].out = true; res = 'out'; } }
      if (rules.killTarget) {
        var count = rules.teams ? Object.keys(b.tally).filter(function (k) { return b.tally[k].team === b.tally[from].team; }).reduce(function (s, k) { return s + b.tally[k].kills; }, 0) : b.tally[from].kills;
        if (count >= rules.killTarget) { b.state = 'over'; b.log.push('kill target reached'); }
      }
      var left = Object.keys(b.tally).filter(function (k) { return !b.tally[k].out; });
      if (rules.lives && left.length <= 1) { b.state = 'over'; b.log.push('last one standing'); }
      b.log.push(from + ' took down ' + to + (res === 'out' ? ', out of lives' : ''));
      return { result: res, respawnIn: t.battle.respawnDelay, invulnerableFor: t.battle.respawnInvulnerable };
    };
    b.standings = function () {
      return Object.keys(b.tally).map(function (id) { return { id: id, score: battleScore(t, b.tally[id]), tally: b.tally[id] }; }).sort(function (x, y) { return y.score - x.score; });
    };
    return b;
  }

  var api = { scaleEnemy: scaleEnemy, canCreateRoom: canCreateRoom, challenge: challenge, bestPrize: bestPrize, battleScore: battleScore, battle: battle };
  C.modes = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
