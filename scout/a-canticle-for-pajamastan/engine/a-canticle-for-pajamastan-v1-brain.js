// A Canticle for Pajamastan engine, enemy brain module, version one.
// Built from a-canticle-for-pajamastan-v1-spec-brain.md. Numbers come from the brain tuning file.
// World units are flat 2D. Time is in seconds.
(function (root) {
  var C = root.Canticle = root.Canticle || {};
  var TAU = Math.PI * 2;

  function dist(a, b) { var dx = b.x - a.x, dy = b.y - a.y; return Math.sqrt(dx * dx + dy * dy); }
  function angleTo(a, b) { return Math.atan2(b.y - a.y, b.x - a.x); }
  function wrap(a) { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; }

  var nextId = 1;
  function createEnemy(opts) {
    opts = opts || {};
    return {
      id: opts.id || ('e' + (nextId++)),
      x: opts.x || 0, y: opts.y || 0,
      anchor: { x: opts.x || 0, y: opts.y || 0 },
      heading: opts.heading || 0,
      group: opts.group || null,
      leader: !!opts.leader,
      maxHp: opts.maxHp || 100,
      hp: opts.maxHp || 100,
      state: 'dormant',
      timer: 0,
      target: null,
      goal: null,
      struck: false,
      powerMult: 1,
      speedMult: 1,
      enraged: false,
      knock: { x: 0, y: 0 }
    };
  }

  function createPack(opts) {
    opts = opts || {};
    var count = opts.count || 4;
    var cx = opts.x || 0, cy = opts.y || 0;
    var group = opts.group || ('g' + (nextId++));
    var list = [];
    for (var i = 0; i < count; i++) {
      var a = (i / count) * TAU;
      list.push(createEnemy({
        x: cx + Math.cos(a) * (i === 0 ? 0 : 40),
        y: cy + Math.sin(a) * (i === 0 ? 0 : 40),
        group: group, leader: i === 0, maxHp: opts.maxHp || 100
      }));
    }
    return list;
  }

  function enter(e, state, tuning, rand, world, events) {
    e.state = state;
    e.timer = 0;
    if (state === 'waking') e.timer = tuning.wakeTime;
    if (state === 'howl') {
      e.timer = tuning.howlTime;
      events.push({ type: 'howl', enemy: e.id });
      world.enemies.forEach(function (o) {
        if (o !== e && o.group && o.group === e.group && (o.state === 'dormant' || o.state === 'waking' || o.state === 'idle' || o.state === 'roam')) {
          o.target = e.target;
          approach(o, tuning, rand, world, events);
        }
      });
    }
    if (state === 'idle') e.timer = 1 + rand() * 2;
    if (state === 'roam') {
      var a = rand() * TAU, r = 20 + rand() * 60;
      e.goal = { x: e.anchor.x + Math.cos(a) * r, y: e.anchor.y + Math.sin(a) * r };
    }
    if (state === 'flank') {
      var t = playerById(world, e.target);
      if (t) {
        var side = rand() < 0.5 ? 1 : -1;
        var base = angleTo(t, e) + side * Math.PI / 2;
        e.goal = { x: t.x + Math.cos(base) * tuning.flankOffset, y: t.y + Math.sin(base) * tuning.flankOffset };
      }
      e.timer = 2.5;
    }
    if (state === 'circle') {
      e.timer = tuning.circleTimeMin + rand() * (tuning.circleTimeMax - tuning.circleTimeMin);
      e.orbitDir = rand() < 0.5 ? 1 : -1;
    }
    if (state === 'lunge') {
      var tt = playerById(world, e.target);
      if (tt) e.heading = angleTo(e, tt);
      e.timer = tuning.lungeTime;
      e.struck = false;
      events.push({ type: 'lunge', enemy: e.id });
    }
    if (state === 'recover') e.timer = tuning.recoverTime;
    if (state === 'hurt') e.timer = tuning.hurtTime;
    if (state === 'dying') {
      e.timer = tuning.dyingTime;
      events.push({ type: 'death', enemy: e.id, leader: e.leader });
      if (e.leader) {
        world.enemies.forEach(function (o) {
          if (o !== e && o.group === e.group && o.hp > 0) {
            o.mournAt = { x: e.x, y: e.y };
            enter(o, 'mourn', tuning, rand, world, events);
          }
        });
      }
    }
    if (state === 'mourn') { e.timer = tuning.mourningTime; events.push({ type: 'mourn', enemy: e.id }); }
  }

  function approach(e, tuning, rand, world, events) {
    enter(e, rand() < tuning.chaseChance ? 'chase' : 'flank', tuning, rand, world, events);
  }

  function playerById(world, id) {
    for (var i = 0; i < world.players.length; i++) if (world.players[i].id === id && world.players[i].alive !== false) return world.players[i];
    return null;
  }

  function nearestPlayer(world, e, radius) {
    var best = null, bd = radius;
    world.players.forEach(function (p) {
      if (p.alive === false) return;
      var d = dist(e, p);
      if (d <= bd) { bd = d; best = p; }
    });
    return best;
  }

  function turnToward(e, desired, tuning, dt) {
    var maxTurn = tuning.turnRateDeg * Math.PI / 180 * dt;
    var diff = wrap(desired - e.heading);
    if (Math.abs(diff) <= maxTurn) e.heading = desired; else e.heading = wrap(e.heading + Math.sign(diff) * maxTurn);
  }

  function moveForward(e, speed, dt) {
    e.x += Math.cos(e.heading) * speed * dt;
    e.y += Math.sin(e.heading) * speed * dt;
  }

  function steerTo(e, point, speed, tuning, dt) {
    turnToward(e, angleTo(e, point), tuning, dt);
    moveForward(e, speed, dt);
  }

  function tickOne(e, world, tuning, dt, rand, events) {
    var run = tuning.runSpeed * e.speedMult;
    var target = e.target ? playerById(world, e.target) : null;
    var attacking = ['chase', 'flank', 'circle', 'recover'].indexOf(e.state) >= 0;
    if (attacking && (!target || dist(e, e.anchor) > tuning.leashDistance)) {
      e.target = null;
      enter(e, 'return', tuning, rand, world, events);
      return;
    }
    switch (e.state) {
      case 'dormant':
        if (nearestPlayer(world, e, tuning.wakeRadius)) enter(e, 'waking', tuning, rand, world, events);
        break;
      case 'waking':
        e.timer -= dt;
        if (e.timer <= 0) enter(e, 'idle', tuning, rand, world, events);
        break;
      case 'idle':
      case 'roam': {
        var radius = e.leader ? tuning.senseRadiusLeader : tuning.senseRadiusFollower;
        var found = nearestPlayer(world, e, radius);
        if (found) {
          e.target = found.id;
          if (e.leader && e.group) enter(e, 'howl', tuning, rand, world, events);
          else approach(e, tuning, rand, world, events);
          break;
        }
        if (e.state === 'idle') {
          e.timer -= dt;
          if (e.timer <= 0) enter(e, 'roam', tuning, rand, world, events);
        } else {
          steerTo(e, e.goal, tuning.walkSpeed, tuning, dt);
          if (dist(e, e.goal) < 6) enter(e, 'idle', tuning, rand, world, events);
        }
        break;
      }
      case 'howl':
        e.timer -= dt;
        if (target) turnToward(e, angleTo(e, target), tuning, dt);
        if (e.timer <= 0) { if (target) approach(e, tuning, rand, world, events); else enter(e, 'idle', tuning, rand, world, events); }
        break;
      case 'chase':
        steerTo(e, target, run, tuning, dt);
        if (dist(e, target) <= tuning.circleRange) enter(e, 'circle', tuning, rand, world, events);
        break;
      case 'flank':
        e.timer -= dt;
        steerTo(e, e.goal, run, tuning, dt);
        if (dist(e, e.goal) < 15 || e.timer <= 0) enter(e, 'chase', tuning, rand, world, events);
        break;
      case 'circle': {
        e.timer -= dt;
        var around = angleTo(target, e) + e.orbitDir * 0.9 * dt * e.speedMult;
        var want = { x: target.x + Math.cos(around) * tuning.circleRange, y: target.y + Math.sin(around) * tuning.circleRange };
        var dx = want.x - e.x, dy = want.y - e.y, len = Math.sqrt(dx * dx + dy * dy) || 1;
        var step = Math.min(len, run * dt);
        e.x += dx / len * step; e.y += dy / len * step;
        turnToward(e, angleTo(e, target), tuning, dt);
        if (e.timer <= 0 || rand() < tuning.lungeChancePerTick) enter(e, 'lunge', tuning, rand, world, events);
        break;
      }
      case 'lunge':
        e.timer -= dt;
        moveForward(e, tuning.lungeSpeed * e.speedMult, dt);
        if (!e.struck && target && dist(e, target) <= tuning.attackRange) {
          e.struck = true;
          events.push({ type: 'strike', enemy: e.id, target: target.id, powerMult: e.powerMult });
        }
        if (e.timer <= 0) enter(e, 'recover', tuning, rand, world, events);
        break;
      case 'recover':
        e.timer -= dt;
        if (e.timer <= 0) approach(e, tuning, rand, world, events);
        break;
      case 'return':
        steerTo(e, e.anchor, tuning.walkSpeed * 1.5, tuning, dt);
        if (dist(e, e.anchor) < 8) enter(e, 'idle', tuning, rand, world, events);
        break;
      case 'hurt':
        e.timer -= dt;
        if (e.timer <= 0) { if (target) approach(e, tuning, rand, world, events); else enter(e, 'return', tuning, rand, world, events); }
        break;
      case 'mourn': {
        e.timer -= dt;
        if (e.mournAt) turnToward(e, angleTo(e, e.mournAt), tuning, dt);
        var spent = 1 - e.timer / tuning.mourningTime;
        var victim = target || nearestPlayer(world, e, tuning.senseRadiusLeader);
        if (!e.cursedGuard && spent >= (tuning.mournGuardDownAt || 0.5)) {
          e.cursedGuard = true;
          if (victim) events.push({ type: 'curse', enemy: e.id, target: victim.id, kind: 'guardDown', value: tuning.mournCursePercent || 20 });
        }
        if (!e.cursedPower && spent >= (tuning.mournPowerDownAt || 0.8)) {
          e.cursedPower = true;
          if (victim) events.push({ type: 'curse', enemy: e.id, target: victim.id, kind: 'powerDown', value: tuning.mournCursePercent || 20 });
        }
        if (e.timer <= 0) {
          e.powerMult = tuning.rageBuffPower;
          e.speedMult = tuning.rageBuffSpeed;
          e.enraged = tuning.rageBuffPower > 1 || tuning.rageBuffSpeed > 1;
          if (e.enraged) events.push({ type: 'rage', enemy: e.id });
          var t2 = target || nearestPlayer(world, e, tuning.senseRadiusLeader);
          if (t2) { e.target = t2.id; approach(e, tuning, rand, world, events); } else enter(e, 'return', tuning, rand, world, events);
        }
        break;
      }
      case 'dying':
        e.timer -= dt;
        e.x += e.knock.x * dt * 40; e.y += e.knock.y * dt * 40;
        if (e.timer <= 0) { e.state = 'gone'; events.push({ type: 'gone', enemy: e.id }); }
        break;
    }
  }

  function tick(world, tuning, dt, rand) {
    rand = rand || Math.random;
    var events = [];
    world.enemies.forEach(function (e) { if (e.state !== 'gone') tickOne(e, world, tuning, dt, rand, events); });
    return events;
  }

  // Apply a landed hit from combat to an enemy.
  function hurt(world, tuning, e, amount, fromX, fromY, rand) {
    rand = rand || Math.random;
    var events = [];
    if (e.hp <= 0 || e.state === 'dying' || e.state === 'gone') return events;
    e.hp = Math.max(0, e.hp - amount);
    var kx = e.x - fromX, ky = e.y - fromY, kl = Math.sqrt(kx * kx + ky * ky) || 1;
    e.knock = { x: kx / kl, y: ky / kl };
    if (e.hp <= 0) {
      var side = (Math.cos(e.heading) * e.knock.y - Math.sin(e.heading) * e.knock.x) < 0 ? 1 : -1;
      e.heading = Math.atan2(e.knock.y, e.knock.x) + side * Math.PI / 2;
      enter(e, 'dying', tuning, rand, world, events);
    } else if (amount >= tuning.flinchThreshold * e.maxHp && e.state !== 'mourn') {
      enter(e, 'hurt', tuning, rand, world, events);
    }
    return events;
  }

  var api = { createEnemy: createEnemy, createPack: createPack, tick: tick, hurt: hurt };
  C.brain = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
