// A Canticle for Pajamastan engine, player actions module, version one.
// Built from a-canticle-for-pajamastan-v1-spec-actions.md. Numbers come from the actions tuning file.
// A player body: { x, y, heading, hp, maxHp, state, ... }. Call tick each frame with stick input and button presses.
(function (root) {
  var C = root.Canticle = root.Canticle || {};
  var TAU = Math.PI * 2;
  function wrap(a) { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; }

  function create(opts) {
    opts = opts || {};
    return { id: opts.id || 'p', x: opts.x || 0, y: opts.y || 0, heading: 0, hp: opts.maxHp || 100, maxHp: opts.maxHp || 100,
      state: 'idle', timer: 0, chain: 0, queued: null, swing: null, phase: null, invuln: 0, knock: { x: 0, y: 0 }, moving: false };
  }

  function canMove(p) { return p.state === 'idle' || p.state === 'move' || (p.state === 'attack' && p.phase === 'recover' && !p.queued); }

  // input: { x, y } stick from -1 to 1, press: 'quick' | 'heavy' | 'special' | null. canAct: from the status module.
  // Returns events: swingStart, active (the moment a swing can hit), chainDrop, getUp.
  function tick(t, p, input, press, dt, canAct) {
    var ev = [];
    if (p.invuln > 0) p.invuln -= dt;
    if (canAct === false && p.state !== 'down') { p.moving = false; return ev; }
    if (p.state === 'down') return ev;
    if (p.state === 'flinch' || p.state === 'knockback' || p.state === 'knockdown') {
      p.timer -= dt;
      if (p.state === 'knockback') { p.x += p.knock.x * t.knockbackDistance / t.knockbackTime * dt; p.y += p.knock.y * t.knockbackDistance / t.knockbackTime * dt; }
      if (p.timer <= 0) {
        if (p.state === 'knockdown') { p.invuln = t.getUpInvulnerable; ev.push({ type: 'getUp' }); }
        p.state = 'idle';
      }
      return ev;
    }
    if (press) {
      if (p.state !== 'attack') startSwing(t, p, press, 0, ev);
      else {
        var sw = t.swing[p.swing], total = sw.windUp + sw.active + sw.recover, done = 1 - p.timer / total;
        if (done >= sw.openAt && p.chain < t.chainLength - 1) p.queued = press;
      }
    }
    if (p.state === 'attack') {
      var s = t.swing[p.swing];
      p.timer -= dt;
      var elapsed = (s.windUp + s.active + s.recover) - p.timer;
      var phase = elapsed < s.windUp ? 'windUp' : (elapsed < s.windUp + s.active ? 'active' : 'recover');
      if (phase !== p.phase) { p.phase = phase; if (phase === 'active') ev.push({ type: 'active', kind: p.swing, step: p.chain, heading: p.heading }); }
      if (p.timer <= 0) {
        if (p.queued) { var q = p.queued; p.queued = null; startSwing(t, p, q, p.chain + 1, ev); }
        else { p.state = 'idle'; p.chain = 0; p.phase = null; }
      }
    }
    var mag = Math.min(1, Math.sqrt(input.x * input.x + input.y * input.y));
    p.moving = false;
    if (mag > 0.08 && canMove(p)) {
      if (p.state === 'attack') { p.state = 'idle'; p.chain = 0; p.phase = null; ev.push({ type: 'chainDrop' }); }
      var want = Math.atan2(input.y, input.x), running = mag >= t.runThreshold;
      if (running) { var d = wrap(want - p.heading), m = t.runTurnRateDeg * Math.PI / 180 * dt; p.heading = Math.abs(d) <= m ? want : wrap(p.heading + Math.sign(d) * m); }
      else p.heading = want;
      var sp = (running ? t.runSpeed : t.walkSpeed) * (p.speedMult || 1);
      p.x += Math.cos(p.heading) * sp * dt; p.y += Math.sin(p.heading) * sp * dt;
      p.moving = true; p.state = 'move';
    } else if (p.state === 'move') p.state = 'idle';
    return ev;
  }

  function startSwing(t, p, kind, step, ev) {
    var s = t.swing[kind]; if (!s) return;
    p.state = 'attack'; p.swing = kind; p.chain = step; p.phase = null; p.queued = null;
    p.timer = s.windUp + s.active + s.recover;
    ev.push({ type: 'swingStart', kind: kind, step: step });
  }

  // Apply incoming damage weight. Returns the reaction name.
  function hit(t, p, damage, fromX, fromY, forceDown) {
    if (p.state === 'down' || p.invuln > 0) return 'ignored';
    p.hp = Math.max(0, p.hp - damage);
    if (p.hp <= 0) { p.state = 'down'; p.chain = 0; return 'down'; }
    var dx = p.x - fromX, dy = p.y - fromY, l = Math.sqrt(dx * dx + dy * dy) || 1;
    p.knock = { x: dx / l, y: dy / l };
    var share = damage / p.maxHp;
    if (forceDown || share >= t.knockdownShare) { p.state = 'knockdown'; p.timer = t.downTime; return 'knockdown'; }
    if (share >= t.knockbackShare) { p.state = 'knockback'; p.timer = t.knockbackTime; return 'knockback'; }
    if (p.state !== 'attack') { p.state = 'flinch'; p.timer = t.flinchTime; }
    return 'flinch';
  }

  function revive(t, p, share) {
    if (p.state !== 'down') return false;
    p.hp = Math.max(1, Math.floor(p.maxHp * share)); p.state = 'idle'; p.invuln = t.reviveInvulnerable; return true;
  }

  function returnToTown(t, p, wallet) {
    var lost = Math.floor(wallet.coin * t.townReturnCurrencyShare);
    wallet.coin -= lost; p.state = 'idle'; p.hp = 1;
    return { lost: lost };
  }

  function medical(t, p, wallet) {
    if (wallet.coin < t.medicalFee) return false;
    wallet.coin -= t.medicalFee; p.hp = p.maxHp; return true;
  }

  // Melee reach check: is a target inside the swing arc?
  function inArc(t, p, target, extraReach) {
    var dx = target.x - p.x, dy = target.y - p.y, d = Math.sqrt(dx * dx + dy * dy);
    if (d > t.meleeReach + (extraReach || 0)) return false;
    return Math.abs(wrap(Math.atan2(dy, dx) - p.heading)) <= t.meleeArcDeg * Math.PI / 360;
  }

  // Ranged lock: nearest target inside the forward cone.
  function lockOn(t, p, targets) {
    var best = null, bd = t.lockRange;
    targets.forEach(function (e) {
      var dx = e.x - p.x, dy = e.y - p.y, d = Math.sqrt(dx * dx + dy * dy);
      if (d > bd) return;
      if (Math.abs(wrap(Math.atan2(dy, dx) - p.heading)) > t.lockConeDeg * Math.PI / 360) return;
      bd = d; best = e;
    });
    return best;
  }

  var api = { create: create, tick: tick, hit: hit, revive: revive, returnToTown: returnToTown, medical: medical, inArc: inArc, lockOn: lockOn };
  C.actions = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
