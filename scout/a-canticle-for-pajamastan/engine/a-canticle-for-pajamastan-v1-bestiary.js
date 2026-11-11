// A Canticle for Pajamastan engine, bestiary module, version one.
// Built from a-canticle-for-pajamastan-v1-spec-bestiary.md. Numbers come from the bestiary tuning file.
// Archetypes: flyer, gunner, phantom, splitter, nest, swarm, boss. The pack hunter lives in the brain module.
// world: { players: [{id,x,y,alive}], enemies: [], shots: [] }
(function (root) {
  var C = root.Canticle = root.Canticle || {};
  var TAU = Math.PI * 2;
  var nextId = 1;

  function dist(a, b) { var dx = b.x - a.x, dy = b.y - a.y; return Math.sqrt(dx * dx + dy * dy); }
  function angleTo(a, b) { return Math.atan2(b.y - a.y, b.x - a.x); }
  function wrap(a) { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; }
  function turn(e, want, rate, dt) { var d = wrap(want - e.heading), m = rate * Math.PI / 180 * dt; e.heading = Math.abs(d) <= m ? want : wrap(e.heading + Math.sign(d) * m); }
  function step(e, speed, dt) { e.x += Math.cos(e.heading) * speed * dt; e.y += Math.sin(e.heading) * speed * dt; }
  function moveToward(e, p, speed, dt) { var d = dist(e, p); if (d < 0.001) return; var k = Math.min(1, speed * dt / d); e.x += (p.x - e.x) * k; e.y += (p.y - e.y) * k; }
  function nearest(world, e, r) { var best = null, bd = r; world.players.forEach(function (p) { if (p.alive === false) return; var d = dist(e, p); if (d <= bd) { bd = d; best = p; } }); return best; }
  function byId(world, id) { for (var i = 0; i < world.players.length; i++) if (world.players[i].id === id && world.players[i].alive !== false) return world.players[i]; return null; }

  function create(kind, opts) {
    opts = opts || {};
    var e = {
      id: opts.id || (kind + (nextId++)), kind: kind,
      x: opts.x || 0, y: opts.y || 0, z: 0, anchor: { x: opts.x || 0, y: opts.y || 0 },
      heading: 0, maxHp: opts.maxHp || 100, hp: opts.maxHp || 100,
      state: 'dormant', timer: 0, target: null, visible: true, cool: 0, lastHurt: 99
    };
    for (var k in opts) if (!(k in e)) e[k] = opts[k];
    return e;
  }

  function createBoss(t, opts) {
    var b = create('boss', opts);
    b.parts = {};
    Object.keys(t.boss.parts).forEach(function (k) { b.parts[k] = { hp: t.boss.parts[k].health, maxHp: t.boss.parts[k].health, broken: false }; });
    b.core = t.boss.coreHealth; b.coreMax = t.boss.coreHealth; b.phase = 0; b.boss = true;
    b.maxHp = bossTotalMax(t, b); b.hp = b.maxHp;
    return b;
  }
  function bossTotalMax(t, b) { var s = b.coreMax; Object.keys(b.parts).forEach(function (k) { s += b.parts[k].maxHp; }); return s; }
  function bossTotal(b) { var s = b.core; Object.keys(b.parts).forEach(function (k) { s += b.parts[k].hp; }); return s; }

  function createPhantom(t, opts) {
    var real = create('phantom', opts); real.real = true; real.visible = false;
    var list = [real];
    for (var i = 0; i < (opts && opts.decoys !== undefined ? opts.decoys : t.phantom.decoys); i++) {
      var d = create('phantom', { x: real.x, y: real.y, maxHp: 1 });
      d.decoyOf = real.id; d.offset = { a: TAU * (i + 1) / (t.phantom.decoys + 1), r: t.phantom.decoySpread }; d.visible = false;
      list.push(d);
    }
    return list;
  }

  function wakeCheck(e, world, t, events) {
    var p = nearest(world, e, t.shared.wakeRadius);
    if (p) { e.target = p.id; events.push({ type: 'wake', enemy: e.id }); return true; }
    return false;
  }

  function leashed(e, t) { return dist(e, e.anchor) > t.shared.leashDistance; }

  var brains = {
    flyer: function (e, world, t, dt, rand, events) {
      var f = t.flyer, tg = byId(world, e.target);
      if (e.state === 'dormant') { if (wakeCheck(e, world, t, events)) { e.state = 'drift'; e.z = f.hoverHeight; } return; }
      if (!tg || leashed(e, t)) { e.state = 'drift'; e.target = null; tg = nearest(world, e, t.shared.senseRadius); if (tg) e.target = tg.id; else { moveToward(e, e.anchor, f.driftSpeed, dt); return; } }
      if (e.state === 'drift') {
        moveToward(e, tg, f.driftSpeed, dt);
        if (dist(e, tg) <= f.orbitRadius) { e.state = 'orbit'; e.timer = f.orbitTimeMin + rand() * (f.orbitTimeMax - f.orbitTimeMin); e.orbitA = angleTo(tg, e); }
      } else if (e.state === 'orbit') {
        e.timer -= dt; e.orbitA += dt * 1.4;
        moveToward(e, { x: tg.x + Math.cos(e.orbitA) * f.orbitRadius, y: tg.y + Math.sin(e.orbitA) * f.orbitRadius }, f.driftSpeed * 1.5, dt);
        if (e.timer <= 0) { e.state = 'dive'; e.diveTo = { x: tg.x, y: tg.y }; e.struck = false; events.push({ type: 'dive', enemy: e.id }); }
      } else if (e.state === 'dive') {
        moveToward(e, e.diveTo, f.diveSpeed, dt);
        e.z = Math.max(0, f.hoverHeight * Math.min(1, dist(e, e.diveTo) / f.orbitRadius));
        if (!e.struck && dist(e, tg) <= f.strikeRange && e.z < 20) { e.struck = true; events.push({ type: 'strike', enemy: e.id, target: tg.id }); }
        if (dist(e, e.diveTo) < 4) { e.state = 'grounded'; e.timer = f.groundedTime; e.z = 0; }
      } else if (e.state === 'grounded') {
        e.timer -= dt; if (e.timer <= 0) e.state = 'climb';
      } else if (e.state === 'climb') {
        e.z = Math.min(f.hoverHeight, e.z + f.climbSpeed * dt);
        if (e.z >= f.hoverHeight) e.state = 'drift';
      }
    },

    gunner: function (e, world, t, dt, rand, events) {
      var g = t.gunner, tg = byId(world, e.target);
      if (e.state === 'dormant') { if (wakeCheck(e, world, t, events)) e.state = 'approach'; return; }
      if (!tg || leashed(e, t)) { e.target = null; moveToward(e, e.anchor, g.walkSpeed, dt); tg = nearest(world, e, t.shared.senseRadius); if (tg) { e.target = tg.id; e.state = 'approach'; } return; }
      var d = dist(e, tg);
      turn(e, angleTo(e, tg), t.shared.turnRateDeg, dt);
      if (e.state === 'approach') {
        if (d < g.tooClose) e.state = 'backoff';
        else if (d > g.fireDistance) moveToward(e, tg, g.walkSpeed, dt);
        else { e.state = 'fire'; e.shotsLeft = g.volley; e.timer = 0; }
      } else if (e.state === 'backoff') {
        var a = angleTo(tg, e); e.x += Math.cos(a) * g.backSpeed * dt; e.y += Math.sin(a) * g.backSpeed * dt;
        if (d >= g.fireDistance * 0.9) e.state = 'approach';
      } else if (e.state === 'fire') {
        if (d < g.tooClose) { e.state = 'backoff'; return; }
        e.timer -= dt;
        if (e.timer <= 0 && e.shotsLeft > 0) {
          var ang = angleTo(e, tg);
          world.shots.push({ from: e.id, x: e.x, y: e.y, vx: Math.cos(ang) * g.shotSpeed, vy: Math.sin(ang) * g.shotSpeed, left: g.shotRange / g.shotSpeed });
          events.push({ type: 'shot', enemy: e.id });
          e.shotsLeft--; e.timer = g.shotGap;
        }
        if (e.shotsLeft <= 0 && e.timer <= 0) { e.state = 'reload'; e.timer = g.reloadTime; }
      } else if (e.state === 'reload') {
        e.timer -= dt; if (e.timer <= 0) e.state = 'approach';
      }
    },

    phantom: function (e, world, t, dt, rand, events) {
      var ph = t.phantom;
      if (e.decoyOf) {
        var real = null; world.enemies.forEach(function (o) { if (o.id === e.decoyOf) real = o; });
        if (!real || real.hp <= 0) { e.hp = 0; e.state = 'gone'; return; }
        e.offset.a += dt * 0.8;
        e.x = real.x + Math.cos(e.offset.a) * e.offset.r; e.y = real.y + Math.sin(e.offset.a) * e.offset.r;
        e.state = real.state; e.visible = real.visible; e.heading = real.heading;
        return;
      }
      var tg = byId(world, e.target);
      if (e.state === 'dormant') { if (wakeCheck(e, world, t, events)) e.state = 'stalk'; return; }
      if (!tg) { e.state = 'stalk'; tg = nearest(world, e, t.shared.senseRadius); if (!tg) { moveToward(e, e.anchor, ph.moveSpeed, dt); return; } e.target = tg.id; }
      if (e.state === 'stalk') {
        e.visible = false; turn(e, angleTo(e, tg), t.shared.turnRateDeg, dt); moveToward(e, tg, ph.moveSpeed, dt);
        if (dist(e, tg) <= ph.strikeRange * 1.6) { e.state = 'windUp'; e.timer = ph.windUp; e.visible = true; events.push({ type: 'reveal', enemy: e.id }); }
      } else if (e.state === 'windUp') {
        e.timer -= dt; if (e.timer <= 0) { if (dist(e, tg) <= ph.strikeRange * 1.6) events.push({ type: 'strike', enemy: e.id, target: tg.id }); e.state = 'recover'; e.timer = ph.recover; }
      } else if (e.state === 'recover') {
        e.timer -= dt; if (e.timer <= 0) e.state = 'stalk';
      }
    },

    splitter: function (e, world, t, dt, rand, events) {
      var s = t.splitter, tg = byId(world, e.target);
      e.lastHurt += dt; e.cool -= dt;
      if (e.state === 'dormant') { if (wakeCheck(e, world, t, events)) e.state = 'ooze'; return; }
      if (!tg) { tg = nearest(world, e, t.shared.senseRadius); if (!tg) return; e.target = tg.id; }
      moveToward(e, tg, s.moveSpeed * (1 + (s.sizes - e.size) * 0.25), dt);
      if (dist(e, tg) <= s.strikeRange + e.size * 4 && e.cool <= 0) { e.cool = s.strikeCooldown; events.push({ type: 'strike', enemy: e.id, target: tg.id }); }
    },

    nest: function (e, world, t, dt, rand, events) {
      var n = t.nest;
      var near = nearest(world, e, n.noticeRadius);
      e.state = near ? 'spawning' : 'quiet';
      if (!near) return;
      e.timer -= dt;
      var live = world.enemies.filter(function (o) { return o.nestId === e.id && o.hp > 0; }).length;
      if (e.timer <= 0 && live < n.liveCap) {
        e.timer = n.spawnEvery;
        var a = rand() * TAU;
        var sw = create('swarm', { x: e.x + Math.cos(a) * 20, y: e.y + Math.sin(a) * 20, maxHp: n.swarmHealth });
        sw.nestId = e.id; sw.state = 'chase'; sw.target = near.id;
        world.enemies.push(sw);
        events.push({ type: 'spawn', enemy: sw.id, from: e.id });
      }
    },

    swarm: function (e, world, t, dt, rand, events) {
      var n = t.nest; e.cool -= dt;
      if (e.state === 'flee') { var a = Math.atan2(e.y - e.fleeFrom.y, e.x - e.fleeFrom.x); e.x += Math.cos(a) * n.fleeSpeed * dt; e.y += Math.sin(a) * n.fleeSpeed * dt; e.timer -= dt; if (e.timer <= 0) e.state = 'gone'; return; }
      var tg = byId(world, e.target) || nearest(world, e, 600);
      if (!tg) return; e.target = tg.id;
      var jitter = { x: tg.x + Math.sin(e.cool * 7 + e.x) * 12, y: tg.y + Math.cos(e.cool * 5 + e.y) * 12 };
      moveToward(e, jitter, n.swarmSpeed, dt);
      if (dist(e, tg) <= n.swarmStrikeRange && e.cool <= 0) { e.cool = n.swarmStrikeCooldown; events.push({ type: 'strike', enemy: e.id, target: tg.id }); }
    },

    boss: function (e, world, t, dt, rand, events) {
      var b = t.boss, tg = byId(world, e.target);
      if (e.state === 'dormant') { if (wakeCheck(e, world, t, events)) e.state = 'fight'; return; }
      if (!tg) { tg = nearest(world, e, 900); if (!tg) return; e.target = tg.id; }
      var share = bossTotal(e) / e.maxHp, ph = 0;
      for (var i = 0; i < b.phases.length; i++) if (share > b.phases[i].above) { ph = i; break; } else ph = i;
      if (ph !== e.phase) { e.phase = ph; events.push({ type: 'phase', enemy: e.id, phase: ph }); }
      var phase = b.phases[ph];
      turn(e, angleTo(e, tg), 120, dt);
      if (dist(e, tg) > b.attackRange * 0.8) moveToward(e, tg, b.moveSpeed * phase.speedMult, dt);
      e.cool -= dt * phase.speedMult;
      if (e.cool <= 0 && dist(e, tg) <= b.attackRange) {
        var avail = phase.attacks.filter(function (a) { return attackAvailable(t, e, a); });
        if (avail.length) { var atk = avail[Math.floor(rand() * avail.length)]; events.push({ type: 'attack', enemy: e.id, attack: atk, target: tg.id }); }
        e.cool = b.attackGap;
      }
    }
  };

  function attackAvailable(t, e, attack) {
    var ok = true;
    Object.keys(t.boss.parts).forEach(function (k) { if (t.boss.parts[k].attacks.indexOf(attack) >= 0 && e.parts[k].broken) ok = false; });
    return ok;
  }

  function tickShots(world, t, dt, events) {
    world.shots = world.shots.filter(function (s) {
      s.x += s.vx * dt; s.y += s.vy * dt; s.left -= dt;
      for (var i = 0; i < world.players.length; i++) {
        var p = world.players[i];
        if (p.alive !== false && dist(s, p) <= t.gunner.shotHitRadius) { events.push({ type: 'shotHit', enemy: s.from, target: p.id }); return false; }
      }
      return s.left > 0;
    });
  }

  function tickMerges(world, t, events) {
    var s = t.splitter;
    var blobs = world.enemies.filter(function (e) { return e.kind === 'splitter' && e.hp > 0 && e.state !== 'gone' && e.lastHurt >= s.mergeCalmSeconds && e.size < s.sizes; });
    for (var i = 0; i < blobs.length; i++) for (var j = i + 1; j < blobs.length; j++) {
      var a = blobs[i], b = blobs[j];
      if (a.state === 'gone' || b.state === 'gone' || a.family !== b.family || a.size !== b.size) continue;
      if (dist(a, b) <= s.mergeDistance + a.size * 4) {
        a.size += 1; a.hp += b.hp; a.maxHp += b.maxHp; b.hp = 0; b.state = 'gone';
        events.push({ type: 'merge', enemy: a.id, absorbed: b.id });
      }
    }
  }

  function tick(world, t, dt, rand) {
    rand = rand || Math.random;
    world.shots = world.shots || [];
    var events = [];
    world.enemies.slice().forEach(function (e) {
      if (e.state === 'gone' || e.hp <= 0) return;
      if (e.hurtLeft > 0) { e.hurtLeft -= dt; return; }
      var fn = brains[e.kind]; if (fn) fn(e, world, t, dt, rand, events);
    });
    tickShots(world, t, dt, events);
    tickMerges(world, t, events);
    world.enemies = world.enemies.filter(function (e) { return e.state !== 'gone'; });
    return events;
  }

  // Land a hit. opts: { part, lowSweep, area }. Returns events.
  function hurt(world, t, e, amount, opts) {
    opts = opts || {};
    var events = [];
    if (e.hp <= 0 || e.state === 'gone') return events;
    if (e.kind === 'flyer' && opts.lowSweep && e.z > 20) { events.push({ type: 'whiff', enemy: e.id }); return events; }
    if (e.kind === 'phantom' && !e.visible && !opts.area) { events.push({ type: 'whiff', enemy: e.id }); return events; }
    if (e.decoyOf) { e.hp = 0; e.state = 'gone'; events.push({ type: 'decoyPop', enemy: e.id }); return events; }
    if (e.kind === 'boss') {
      var bt = t.boss, softOpen = false;
      Object.keys(bt.parts).forEach(function (k) { if (bt.parts[k].opensSoftSpot && e.parts[k].broken) softOpen = true; });
      if (opts.part && e.parts[opts.part] && !e.parts[opts.part].broken) {
        var p = e.parts[opts.part];
        var dmg = Math.max(0, amount - bt.parts[opts.part].armor);
        p.hp = Math.max(0, p.hp - dmg);
        events.push({ type: 'hit', enemy: e.id, part: opts.part, damage: dmg });
        if (p.hp <= 0) { p.broken = true; events.push({ type: 'partBroken', enemy: e.id, part: opts.part }); }
      } else {
        var cd = Math.floor(amount * (softOpen ? 1 + bt.softSpotArmorCut : 1));
        e.core = Math.max(0, e.core - cd);
        events.push({ type: 'hit', enemy: e.id, part: 'core', damage: cd });
      }
      e.hp = bossTotal(e);
      if (e.core <= 0) { e.hp = 0; e.state = 'gone'; events.push({ type: 'death', enemy: e.id }); }
      return events;
    }
    e.hp = Math.max(0, e.hp - amount); e.lastHurt = 0;
    events.push({ type: 'hit', enemy: e.id, damage: amount });
    if (e.hp <= 0) {
      events.push({ type: 'death', enemy: e.id });
      e.state = 'gone';
      if (e.kind === 'splitter' && e.size > 1) {
        var s = t.splitter;
        for (var i = 0; i < s.childCount; i++) {
          var a = TAU * i / s.childCount;
          var hp = Math.max(1, Math.floor(e.maxHp * s.childHealthShare));
          var c = create('splitter', { x: e.x + Math.cos(a) * 14, y: e.y + Math.sin(a) * 14, maxHp: hp });
          c.size = e.size - 1; c.family = e.family; c.state = 'ooze'; c.target = e.target; c.lastHurt = 0;
          world.enemies.push(c);
        }
        events.push({ type: 'split', enemy: e.id });
      }
      if (e.kind === 'nest') world.enemies.forEach(function (o) { if (o.nestId === e.id) { o.state = 'flee'; o.fleeFrom = { x: e.x, y: e.y }; o.timer = 2.5; } });
    } else if (amount >= t.shared.flinchThreshold * e.maxHp && e.kind !== 'nest') {
      e.hurtLeft = t.shared.hurtTime; events.push({ type: 'flinch', enemy: e.id });
    }
    return events;
  }

  function createSplitter(t, opts) { var e = create('splitter', opts); e.size = t.splitter.sizes; e.family = e.id; return e; }

  var api = { create: create, createBoss: createBoss, createPhantom: createPhantom, createSplitter: createSplitter, tick: tick, hurt: hurt };
  C.bestiary = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
