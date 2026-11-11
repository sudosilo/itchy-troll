// A Canticle for Pajamastan engine, town module, version one.
// Built from a-canticle-for-pajamastan-v1-spec-town.md. Numbers and people come from the town tuning file.
(function (root) {
  var C = root.Canticle = root.Canticle || {};
  function dist(a, b) { return Math.hypot(b.x - a.x, b.y - a.y); }
  function wrap(a) { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; }

  function create(t, rand) {
    rand = rand || Math.random;
    var town = { people: [], critters: [], flags: {} };
    t.people.forEach(function (d) {
      var p = { id: d.id, role: d.role, name: d.name, service: d.service || null, child: !!d.child, lines: d.lines, afterFlag: d.afterFlag || null, lineAt: 0,
        x: d.x !== undefined ? d.x : t.waypoints[0][0], y: d.y !== undefined ? d.y : t.waypoints[0][1], heading: Math.PI / 2, state: 'idle', timer: rand() * 2, goal: null, patrol: d.patrol || null, patrolAt: 0, home: null };
      if (d.role === 'walker') { var w = t.waypoints[Math.floor(rand() * t.waypoints.length)]; p.x = w[0]; p.y = w[1]; }
      if (d.role === 'guard') { p.x = d.patrol[0][0]; p.y = d.patrol[0][1]; }
      p.home = { x: p.x, y: p.y, heading: p.heading };
      town.people.push(p);
    });
    for (var i = 0; i < t.critters; i++) town.critters.push({ x: 100 + rand() * 500, y: 80 + rand() * 260, vx: 0, vy: 0, state: 'settled', timer: 0 });
    return town;
  }

  function turnTo(t, p, ang, dt) { var d = wrap(ang - p.heading), m = t.turnRateDeg * Math.PI / 180 * dt; p.heading = Math.abs(d) <= m ? ang : wrap(p.heading + Math.sign(d) * m); }

  // players: [{ id, x, y, running }]
  function tick(t, town, players, dt, rand) {
    rand = rand || Math.random;
    var ev = [];
    town.people.forEach(function (p) {
      var near = null, nd = t.noticeRadius;
      players.forEach(function (pl) { var d = dist(p, pl); if (d < nd) { nd = d; near = pl; } });
      if (near) { if (p.state !== 'watching') { p.resume = p.state; p.state = 'watching'; ev.push({ type: 'notice', id: p.id }); } turnTo(t, p, Math.atan2(near.y - p.y, near.x - p.x), dt); return; }
      if (p.state === 'watching') p.state = p.resume || 'idle';
      var speed = p.child ? t.childSpeed : (p.role === 'guard' ? t.guardSpeed : t.walkSpeed);
      if (p.role === 'walker') {
        if (p.state === 'idle') { p.timer -= dt; if (p.timer <= 0) { var w = t.waypoints[Math.floor(rand() * t.waypoints.length)]; p.goal = { x: w[0], y: w[1] }; p.state = 'walking'; } }
        else if (p.state === 'walking') {
          var a = Math.atan2(p.goal.y - p.y, p.goal.x - p.x);
          // steer around anyone in personal space
          town.people.concat(players).forEach(function (o) { if (o === p) return; var d = dist(p, o); if (d < t.personalSpace && d > 0.01) { var away = Math.atan2(p.y - o.y, p.x - o.x); a = Math.atan2(Math.sin(a) + Math.sin(away) * 1.5, Math.cos(a) + Math.cos(away) * 1.5); } });
          turnTo(t, p, a, dt);
          p.x += Math.cos(p.heading) * speed * dt; p.y += Math.sin(p.heading) * speed * dt;
          if (dist(p, p.goal) < 8) { p.state = 'idle'; p.timer = (t.pauseMin + rand() * (t.pauseMax - t.pauseMin)) * (p.child ? t.childPauseScale : 1); }
        }
      } else if (p.role === 'guard') {
        var g = p.patrol[p.patrolAt], gp = { x: g[0], y: g[1] };
        turnTo(t, p, Math.atan2(gp.y - p.y, gp.x - p.x), dt);
        p.x += Math.cos(p.heading) * speed * dt; p.y += Math.sin(p.heading) * speed * dt; p.state = 'patrol';
        if (dist(p, gp) < 6) p.patrolAt = (p.patrolAt + 1) % p.patrol.length;
      } else { turnTo(t, p, p.home.heading, dt); }
    });
    town.critters.forEach(function (c) {
      var run = players.some(function (pl) { return pl.running !== false && dist(c, pl) < t.critterScatterRadius; });
      if (run && c.state === 'settled') { var pl = players[0], a = Math.atan2(c.y - pl.y, c.x - pl.x) + (rand() - 0.5); c.vx = Math.cos(a) * 160; c.vy = Math.sin(a) * 160; c.state = 'flying'; c.timer = t.critterSettleSeconds; ev.push({ type: 'scatter' }); }
      if (c.state === 'flying') { c.x += c.vx * dt; c.y += c.vy * dt; c.vx *= 0.97; c.vy *= 0.97; c.vx += (rand() - 0.5) * 40; c.vy += (rand() - 0.5) * 40; c.timer -= dt; if (c.timer <= 0) c.state = 'settled'; }
      c.x = Math.max(10, Math.min(690, c.x)); c.y = Math.max(10, Math.min(410, c.y));
    });
    return ev;
  }

  // Talk to the nearest person within service range. Returns { person, line, service }.
  function talk(t, town, player) {
    var best = null, bd = t.serviceRadius + 30;
    town.people.forEach(function (p) { var d = dist(p, player); if (d < bd) { bd = d; best = p; } });
    if (!best) return null;
    var lines = best.lines;
    if (best.afterFlag && town.flags[best.afterFlag.flag]) lines = best.afterFlag.lines.concat(best.lines);
    var line = lines[best.lineAt % lines.length]; best.lineAt++;
    return { person: best, line: line, service: bd <= t.serviceRadius ? best.service : null };
  }

  var api = { create: create, tick: tick, talk: talk };
  C.town = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
