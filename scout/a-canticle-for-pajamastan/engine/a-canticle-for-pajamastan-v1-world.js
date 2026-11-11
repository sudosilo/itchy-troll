// A Canticle for Pajamastan engine, world objects module, version one.
// Built from a-canticle-for-pajamastan-v1-spec-world.md. Numbers come from the world tuning file.
// Triggers set numbered switch flags. Reactors watch flags. Nothing talks to anything else directly.
(function (root) {
  var C = root.Canticle = root.Canticle || {};
  var nextId = 1;
  function dist(a, b) { var dx = b.x - a.x, dy = b.y - a.y; return Math.sqrt(dx * dx + dy * dy); }
  function segDist(p, a, b) { var dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy || 1; var k = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2)); return dist(p, { x: a.x + dx * k, y: a.y + dy * k }); }

  function create() { return { flags: {}, objects: [], pending: [], log: [] }; }

  function setFlag(w, n, on, events) {
    var was = !!w.flags[n];
    if (on) w.flags[n] = true; else delete w.flags[n];
    if (was !== !!on && events) events.push({ type: 'flag', flag: n, on: !!on });
  }
  function flag(w, n) { return !!w.flags[n]; }
  function allOn(w, list) { for (var i = 0; i < list.length; i++) if (!w.flags[list[i]]) return false; return true; }

  // kind: stepSwitch, attackSwitch, itemSwitch, timerSwitch, sensor, chatSensor, door, lightDoor, fence, fog, bridge, warp, barrel, rock, heal
  function add(w, kind, opts) {
    opts = opts || {};
    var o = { id: kind + (nextId++), kind: kind, x: opts.x || 0, y: opts.y || 0 };
    for (var k in opts) o[k] = opts[k];
    if (kind === 'barrel') { o.hp = o.hp || 1; o.state = 'whole'; }
    if (kind === 'rock') { o.hp = o.hp || 120; o.maxHp = o.hp; }
    if (kind === 'heal') o.used = false;
    if (kind === 'timerSwitch') o.left = 0;
    if (kind === 'fence') o.cool = {};
    w.objects.push(o);
    return o;
  }

  // Is the object currently blocking movement?
  function blocks(w, o) {
    if (o.kind === 'door') return !(o.open || allOn(w, o.flags || []));
    if (o.kind === 'lightDoor') return !(o.open || allOn(w, o.lamps || []));
    if (o.kind === 'fence') return !flag(w, o.flag);
    if (o.kind === 'rock') return o.hp > 0;
    if (o.kind === 'barrel') return o.state === 'whole';
    return false;
  }
  function bridgeOpen(w, o) { return o.kind === 'bridge' && flag(w, o.flag); }
  function warpOpen(w, o) { return o.kind === 'warp' && (o.flag === undefined || flag(w, o.flag)); }

  // players: [{ id, x, y, alive }], enemies: [{ id, x, y, hp }]. Returns events.
  function tick(t, w, players, enemies, dt) {
    var ev = [];
    var living = players.filter(function (p) { return p.alive !== false; });
    var due = [];
    w.pending = w.pending.filter(function (pd) { pd.left -= dt; if (pd.left <= 0) { due.push(pd); return false; } return true; });
    due.forEach(function (pd) { burst(t, w, pd.o, players, enemies, ev); });
    w.objects.forEach(function (o) {
      if (o.kind === 'stepSwitch') {
        var on = living.some(function (p) { return dist(p, o) <= t.stepRadius; });
        if (on) setFlag(w, o.flag, true, ev);
        else if (!o.latch && flag(w, o.flag) && !o.pressedBy) setFlag(w, o.flag, false, ev);
      }
      if (o.kind === 'sensor' && living.some(function (p) { return dist(p, o) <= (o.radius || t.sensorRadius); })) setFlag(w, o.flag, true, ev);
      if (o.kind === 'timerSwitch') {
        var watching = flag(w, o.watch);
        if (watching && o.left <= 0 && !o.running) { o.running = true; o.left = o.seconds || t.timerSeconds; o.lastTick = Math.ceil(o.left); ev.push({ type: 'timerStart', id: o.id, seconds: o.left }); }
        if (o.running) {
          o.left -= dt;
          if (Math.ceil(o.left) < o.lastTick) { o.lastTick = Math.ceil(o.left); ev.push({ type: 'tick', id: o.id, left: o.lastTick }); }
          if (o.left <= 0) { o.running = false; o.left = 0; setFlag(w, o.watch, false, ev); ev.push({ type: 'timerEnd', id: o.id }); }
        }
      }
      if (o.kind === 'fence' && !flag(w, o.flag)) {
        var a = { x: o.x, y: o.y }, b = { x: o.x2, y: o.y2 };
        Object.keys(o.cool).forEach(function (k) { o.cool[k] -= dt; });
        living.forEach(function (p) { if (segDist(p, a, b) <= t.fenceHitRadius + 10 && !(o.cool[p.id] > 0)) { o.cool[p.id] = t.fenceCooldown; ev.push({ type: 'hurt', target: p.id, damage: t.fenceDamage, source: o.id }); } });
      }
      if (o.kind === 'fog' && !flag(w, o.flag) && o.poison) {
        living.forEach(function (p) { if (dist(p, o) <= o.radius) ev.push({ type: 'poison', target: p.id, share: t.fogPoisonPerSecond * dt, source: o.id }); });
      }
      if (o.kind === 'heal' && !o.used) {
        living.forEach(function (p) { if (dist(p, o) <= t.healRadius) { ev.push({ type: 'heal', target: p.id, share: t.healPerSecond * dt, source: o.id }); if (o.singleUse) o.used = true; } });
      }
      if (o.kind === 'barrel' && o.state === 'whole' && o.flag !== undefined && flag(w, o.flag)) ignite(t, w, o, 0);
    });
    return ev;
  }

  function ignite(t, w, o, delay) {
    if (o.state !== 'whole') return;
    o.state = 'lit';
    w.pending.push({ o: o, left: delay });
  }
  function burst(t, w, o, players, enemies, ev) {
    o.state = 'gone';
    var r = o.radius || t.barrelRadius;
    ev.push({ type: 'explode', id: o.id, x: o.x, y: o.y, radius: r });
    players.forEach(function (p) { if (p.alive !== false && dist(p, o) <= r) ev.push({ type: 'hurt', target: p.id, damage: o.damage || t.barrelDamage, source: o.id }); });
    (enemies || []).forEach(function (e) { if (e.hp > 0 && dist(e, o) <= r) ev.push({ type: 'hurtEnemy', target: e.id, damage: o.damage || t.barrelDamage, source: o.id }); });
    w.objects.forEach(function (b) {
      if (b.kind === 'barrel' && b.state === 'whole' && dist(b, o) <= r) ignite(t, w, b, t.barrelChainDelay);
      if (b.kind === 'rock' && b.hp > 0 && dist(b, o) <= r) { b.hp = Math.max(0, b.hp - (o.damage || t.barrelDamage)); if (b.hp <= 0) ev.push({ type: 'rockBroken', id: b.id }); }
    });
  }

  // A player or enemy attack lands at a point. Returns events.
  function hitAt(t, w, x, y, damage, reach) {
    var ev = [], p = { x: x, y: y };
    w.objects.forEach(function (o) {
      var r = reach || t.attackRadius;
      if (o.kind === 'attackSwitch' && dist(p, o) <= r) { setFlag(w, o.flag, o.toggle ? !flag(w, o.flag) : true, ev); ev.push({ type: 'switchHit', id: o.id }); }
      if (o.kind === 'barrel' && o.state === 'whole' && dist(p, o) <= r + 6) { ignite(t, w, o, 0); ev.push({ type: 'barrelHit', id: o.id }); }
      if (o.kind === 'rock' && o.hp > 0 && dist(p, o) <= r + 14) { o.hp = Math.max(0, o.hp - damage); ev.push({ type: 'rockHit', id: o.id, left: o.hp }); if (o.hp <= 0) ev.push({ type: 'rockBroken', id: o.id }); }
    });
    return ev;
  }

  // A player uses an item. inventory is { name: count }. Returns the switch used or null.
  function useItem(t, w, player, itemName, inventory) {
    for (var i = 0; i < w.objects.length; i++) {
      var o = w.objects[i];
      if (o.kind === 'itemSwitch' && o.item === itemName && dist(player, o) <= t.itemRadius && !flag(w, o.flag)) {
        if (!inventory[itemName]) return { ok: false, reason: 'no ' + itemName };
        inventory[itemName]--; setFlag(w, o.flag, true, null); return { ok: true, id: o.id };
      }
    }
    return { ok: false, reason: 'nothing here takes that' };
  }

  // A player chats. Returns the flags it set.
  function chat(t, w, player, text) {
    var set = [];
    w.objects.forEach(function (o) {
      if (o.kind === 'chatSensor' && dist(player, o) <= (o.radius || t.chatRadius) && String(text).toLowerCase().indexOf(String(o.keyword).toLowerCase()) >= 0 && !flag(w, o.flag)) { setFlag(w, o.flag, true, null); set.push(o.flag); }
    });
    return set;
  }

  function lampsLit(w, o) { return (o.lamps || []).map(function (f) { return !!w.flags[f]; }); }

  var api = { create: create, add: add, tick: tick, hitAt: hitAt, useItem: useItem, chat: chat, setFlag: function (w, n, on) { setFlag(w, n, on, null); }, flag: flag, blocks: blocks, bridgeOpen: bridgeOpen, warpOpen: warpOpen, lampsLit: lampsLit, segDist: segDist };
  C.world = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
