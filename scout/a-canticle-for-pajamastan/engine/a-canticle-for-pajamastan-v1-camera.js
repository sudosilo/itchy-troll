// A Canticle for Pajamastan engine, camera module, version one.
// Built from a-canticle-for-pajamastan-v1-spec-camera.md. Numbers come from the camera tuning file.
// Works on flat ground coordinates. Chase mode returns an eye point behind the player; top down mode returns a center point.
(function (root) {
  var C = root.Canticle = root.Canticle || {};
  var TAU = Math.PI * 2;
  function wrap(a) { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; }

  function create(opts) {
    opts = opts || {};
    return { mode: opts.mode || 'chase', angle: 0, dist: 0, x: opts.x || 0, y: opts.y || 0, look: { x: 0, y: 0 }, shake: 0, script: null };
  }

  // player: { x, y, heading, vx, vy }. opts: { target, manual (-1..1), reset, wallHit(fromX, fromY, toX, toY) -> distance or null }
  function tick(t, cam, player, dt, opts, rand) {
    opts = opts || {}; rand = rand || Math.random;
    if (cam.script) {
      cam.x += (cam.script.x - cam.x) * Math.min(1, t.distanceEase * dt);
      cam.y += (cam.script.y - cam.y) * Math.min(1, t.distanceEase * dt);
      cam.look = { x: cam.script.lookX, y: cam.script.lookY };
      return view(t, cam, dt, rand);
    }
    if (cam.mode === 'top') {
      var lx = player.x + (player.vx || 0) * t.topDownLead, ly = player.y + (player.vy || 0) * t.topDownLead;
      if (opts.target) { lx += (opts.target.x - lx) * t.lockPull; ly += (opts.target.y - ly) * t.lockPull; }
      var k = Math.min(1, t.topDownEase * dt);
      cam.x += (lx - cam.x) * k; cam.y += (ly - cam.y) * k; cam.look = { x: cam.x, y: cam.y };
      return view(t, cam, dt, rand);
    }
    var behind = wrap(player.heading + Math.PI);
    if (opts.reset) cam.angle = behind;
    else if (opts.manual) cam.angle = wrap(cam.angle + opts.manual * t.manualSwingRateDeg * Math.PI / 180 * dt);
    else {
      var d = wrap(behind - cam.angle), lim = t.swingRateDeg * Math.PI / 180 * dt;
      var stepA = Math.max(-lim, Math.min(lim, d * Math.min(1, t.angleEase * dt)));
      cam.angle = wrap(cam.angle + stepA);
    }
    var want = t.trailDistance;
    var ex = player.x + Math.cos(cam.angle) * want, ey = player.y + Math.sin(cam.angle) * want;
    if (opts.wallHit) { var hitD = opts.wallHit(player.x, player.y, ex, ey); if (hitD !== null && hitD !== undefined) want = Math.max(0, hitD - t.wallPad); }
    cam.dist += (want - cam.dist) * Math.min(1, want < cam.dist ? 1 : t.distanceEase * dt);
    cam.x = player.x + Math.cos(cam.angle) * cam.dist; cam.y = player.y + Math.sin(cam.angle) * cam.dist;
    var ahead = { x: player.x + Math.cos(player.heading) * t.lookAhead, y: player.y + Math.sin(player.heading) * t.lookAhead };
    if (opts.target) { ahead.x += (opts.target.x - ahead.x) * t.lockPull; ahead.y += (opts.target.y - ahead.y) * t.lockPull; }
    cam.look = ahead;
    return view(t, cam, dt, rand);
  }

  function view(t, cam, dt, rand) {
    var j = cam.shake;
    cam.shake = Math.max(0, cam.shake - cam.shake * t.shakeDecay * dt - 0.01);
    return { x: cam.x + (rand() - 0.5) * j, y: cam.y + (rand() - 0.5) * j, height: t.height, look: cam.look, lookUp: t.lookUp };
  }

  function shake(cam, amount) { cam.shake = Math.max(cam.shake, amount); }
  function takeOver(cam, x, y, lookX, lookY) { cam.script = { x: x, y: y, lookX: lookX, lookY: lookY }; }
  function release(cam) { cam.script = null; }

  var api = { create: create, tick: tick, shake: shake, takeOver: takeOver, release: release };
  C.camera = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
