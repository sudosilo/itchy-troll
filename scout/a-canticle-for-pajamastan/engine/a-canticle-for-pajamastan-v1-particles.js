// A Canticle for Pajamastan engine, particles module, version one.
// Built from a-canticle-for-pajamastan-v1-spec-particles.md. Numbers come from the particles tuning file.
(function (root) {
  var C = root.Canticle = root.Canticle || {};

  function create() { return { list: [] }; }

  function lerp(a, b, k) { return a + (b - a) * k; }

  // Spawn a preset at x, y. opts: { angle (radians, for ballistic aim), follow: object with x, y }
  function emit(t, sys, presetName, x, y, opts, rand) {
    opts = opts || {}; rand = rand || Math.random;
    var p = t.presets[presetName]; if (!p) return 0;
    var made = 0;
    for (var i = 0; i < p.count; i++) {
      if (sys.list.length >= t.cap) sys.list.shift();
      var color = p.colors[Math.floor(rand() * p.colors.length)];
      var q = { shape: p.shape, x: x, y: y, vx: 0, vy: 0, life: p.life * (0.8 + rand() * 0.4), age: 0, s0: p.sizeStart, s1: p.sizeEnd, color: color, add: !!p.additive, spin: (rand() - 0.5) * 6, rot: rand() * 6.28 };
      if (p.shape === 'ballistic') {
        var base = opts.angle !== undefined ? opts.angle : -Math.PI / 2;
        var a = base + (rand() - 0.5) * p.coneDeg * Math.PI / 180, sp = lerp(p.speedMin, p.speedMax, rand());
        q.vx = Math.cos(a) * sp; q.vy = Math.sin(a) * sp; q.g = t.gravity * (p.gravityScale === undefined ? 1 : p.gravityScale);
      } else if (p.shape === 'orbit') {
        q.cx = x; q.cy = y; q.follow = opts.follow || null; q.r = p.radius; q.ang = (i / p.count) * Math.PI * 2; q.w = p.angularSpeed; q.rise = p.rise; q.h = 0;
      } else if (p.shape === 'radial') {
        var ra = (i / p.count) * Math.PI * 2; q.vx = Math.cos(ra) * p.speed; q.vy = Math.sin(ra) * p.speed; q.g = 0;
      }
      sys.list.push(q); made++;
    }
    return made;
  }

  function tick(sys, dt) {
    sys.list = sys.list.filter(function (q) {
      q.age += dt; if (q.age >= q.life) return false;
      q.rot += q.spin * dt;
      if (q.shape === 'orbit') {
        if (q.follow) { q.cx = q.follow.x; q.cy = q.follow.y; }
        q.ang += q.w * dt; q.h += q.rise * dt;
        q.x = q.cx + Math.cos(q.ang) * q.r; q.y = q.cy + Math.sin(q.ang) * q.r * 0.6 - q.h;
      } else {
        q.vy += (q.g || 0) * dt; q.x += q.vx * dt; q.y += q.vy * dt;
      }
      return true;
    });
    return sys.list.length;
  }

  function draw(sys, ctx) {
    var prev = ctx.globalCompositeOperation;
    sys.list.forEach(function (q) {
      var k = q.age / q.life, size = Math.max(0.1, lerp(q.s0, q.s1, k));
      ctx.globalCompositeOperation = q.add ? 'lighter' : 'source-over';
      ctx.globalAlpha = Math.max(0, 1 - k * k);
      ctx.fillStyle = q.color;
      ctx.beginPath(); ctx.arc(q.x, q.y, size, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = prev;
  }

  var api = { create: create, emit: emit, tick: tick, draw: draw };
  C.particles = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
