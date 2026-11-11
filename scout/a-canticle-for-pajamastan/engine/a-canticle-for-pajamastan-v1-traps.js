// A Canticle for Pajamastan engine, traps module, version one.
// Built from a-canticle-for-pajamastan-v1-spec-traps.md. Numbers come from the traps tuning file.
// players: [{ id, x, y, alive }]. Traps report events; the game applies damage and status.
(function (root) {
  var C = root.Canticle = root.Canticle || {};
  var nextId = 1;
  function dist(a, b) { var dx = b.x - a.x, dy = b.y - a.y; return Math.sqrt(dx * dx + dy * dy); }
  function segDist(p, a, b) {
    var dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy || 1;
    var k = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2));
    return dist(p, { x: a.x + dx * k, y: a.y + dy * k });
  }

  // opts: { x, y, angle, hidden, owner, repeating }
  function create(t, kind, opts) {
    opts = opts || {};
    var k = t.kinds[kind];
    return {
      id: 'trap' + (nextId++), kind: kind, x: opts.x || 0, y: opts.y || 0, angle: opts.angle || 0,
      hidden: !!opts.hidden, owner: opts.owner || null, repeating: opts.repeating !== undefined ? opts.repeating : !!k.repeating,
      state: 'idle', timer: 0, phase: 0, hitCool: {}, on: true, hp: 1
    };
  }

  function lineEnds(t, tr) {
    var k = t.kinds[tr.kind], half = k.length / 2;
    var cx = tr.x, cy = tr.y;
    if (tr.kind === 'saw') {
      var off = Math.sin(tr.phase) * half;
      cx = tr.x + Math.cos(tr.angle) * off; cy = tr.y + Math.sin(tr.angle) * off;
      return { blade: { x: cx, y: cy } };
    }
    return { a: { x: cx - Math.cos(tr.angle) * half, y: cy - Math.sin(tr.angle) * half }, b: { x: cx + Math.cos(tr.angle) * half, y: cy + Math.sin(tr.angle) * half } };
  }

  function tick(t, traps, players, dt, tier) {
    var scale = t.difficultyScale[tier || 0] || 1;
    var events = [];
    traps.forEach(function (tr) {
      if (tr.state === 'spent' || tr.state === 'broken') return;
      var k = t.kinds[tr.kind];
      Object.keys(tr.hitCool).forEach(function (id) { tr.hitCool[id] -= dt; });
      var living = players.filter(function (p) { return p.alive !== false; });
      if (tr.hidden && living.some(function (p) { return dist(p, tr) <= t.hiddenRevealRadius; })) { tr.hidden = false; events.push({ type: 'revealed', trap: tr.id }); }

      if (tr.kind === 'saw' || tr.kind === 'fence') {
        if (!tr.on) return;
        if (tr.kind === 'saw') tr.phase += dt * k.speed / (k.length / 2);
        var ends = lineEnds(t, tr);
        living.forEach(function (p) {
          var d = tr.kind === 'saw' ? dist(p, ends.blade) : segDist(p, ends.a, ends.b);
          if (d <= k.hitRadius && !(tr.hitCool[p.id] > 0)) {
            tr.hitCool[p.id] = k.hitCooldown;
            events.push({ type: 'hit', trap: tr.id, target: p.id, damage: Math.round(k.damage * scale) });
          }
        });
        return;
      }

      if (tr.state === 'rearming') { tr.timer -= dt; if (tr.timer <= 0) tr.state = 'idle'; return; }
      var near = null, nd = k.notice;
      living.forEach(function (p) { var d = dist(p, tr); if (d <= nd) { nd = d; near = p; } });
      if (tr.state === 'idle' && near) { tr.state = 'armed'; tr.watch = near.id; events.push({ type: 'warn', trap: tr.id, target: near.id }); }
      if (tr.state === 'armed') {
        if (!near) { tr.state = 'idle'; return; }
        if (nd <= k.trigger) { tr.state = 'fuse'; tr.timer = k.warn || 0; }
      }
      if (tr.state === 'fuse') {
        tr.timer -= dt;
        if (tr.timer <= 0) {
          var hit = [];
          if (tr.kind === 'snare') { if (near) hit.push({ target: near.id, hold: k.holdSeconds }); }
          else living.forEach(function (p) { if (dist(p, tr) <= k.radius) hit.push(k.damage ? { target: p.id, damage: Math.round(k.damage * scale) } : { target: p.id, status: k.status, chance: k.chance }); });
          events.push({ type: 'fire', trap: tr.id, kind: tr.kind, hits: hit });
          if (tr.repeating) { tr.state = 'rearming'; tr.timer = t.rearmSeconds; } else tr.state = 'spent';
        }
      }
    });
    return events;
  }

  function strike(trap) { if (trap.state === 'spent') return false; trap.state = 'broken'; return true; }
  function setFence(trap, on) { trap.on = !!on; }

  var api = { create: create, tick: tick, strike: strike, setFence: setFence, lineEnds: lineEnds };
  C.traps = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
