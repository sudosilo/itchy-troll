// A Canticle for Pajamastan engine, weather module, version one.
// Built from a-canticle-for-pajamastan-v1-spec-weather.md. Numbers come from the weather tuning file.
(function (root) {
  var C = root.Canticle = root.Canticle || {};

  function hexToRgb(h) { var n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function mixHex(a, b, k) { var x = hexToRgb(a), y = hexToRgb(b); return 'rgb(' + x.map(function (v, i) { return Math.round(v + (y[i] - v) * k); }).join(',') + ')'; }

  function create(t, profile, rand) {
    rand = rand || Math.random;
    var w = { profile: profile, state: 'clear', prev: 'clear', blend: 1, left: 0, flash: 0, thunderIn: -1, streaks: [], lightningClock: 0 };
    pickDuration(t, w, rand);
    return w;
  }
  function pickDuration(t, w, rand) { var s = t.profiles[w.profile].states[w.state]; w.left = s.min + rand() * (s.max - s.min); }

  function setState(t, w, state) { if (!t.looks[state]) return; w.prev = w.state; w.state = state; w.blend = 0; }

  // Current blended look.
  function look(t, w) {
    var a = t.looks[w.prev], b = t.looks[w.state], k = Math.min(1, w.blend);
    return { streaks: Math.round(a.streaks + (b.streaks - a.streaks) * k), streakSpeed: a.streakSpeed + (b.streakSpeed - a.streakSpeed) * k, angle: a.angle + (b.angle - a.angle) * k, fog: a.fog + (b.fog - a.fog) * k, tint: mixHex(a.tint, b.tint, k), color: mixHex(a.color, b.color, k), lightning: b.lightning * k };
  }

  function tick(t, w, dt, width, height, rand) {
    rand = rand || Math.random;
    var ev = [];
    w.blend = Math.min(1, w.blend + dt / t.blendSeconds);
    w.left -= dt;
    if (w.left <= 0) {
      var nexts = t.profiles[w.profile].states[w.state].next, total = 0, roll;
      Object.keys(nexts).forEach(function (k) { total += nexts[k]; });
      roll = rand() * total;
      var pick = w.state;
      Object.keys(nexts).some(function (k) { roll -= nexts[k]; if (roll < 0) { pick = k; return true; } return false; });
      if (pick !== w.state) { setState(t, w, pick); ev.push({ type: 'change', to: pick }); }
      pickDuration(t, w, rand);
    }
    var L = look(t, w);
    if (L.lightning > 0 && rand() < L.lightning * dt) { w.flash = t.flashSeconds; w.thunderIn = t.thunderDelayMin + rand() * (t.thunderDelayMax - t.thunderDelayMin); ev.push({ type: 'lightning' }); }
    if (w.flash > 0) w.flash -= dt;
    if (w.thunderIn > 0) { w.thunderIn -= dt; if (w.thunderIn <= 0) ev.push({ type: 'thunder' }); }
    while (w.streaks.length < L.streaks) w.streaks.push({ x: rand() * width, y: rand() * height, len: 6 + rand() * 12 });
    if (w.streaks.length > L.streaks) w.streaks.length = L.streaks;
    var vx = Math.cos(L.angle) * L.streakSpeed, vy = Math.sin(L.angle) * L.streakSpeed;
    w.streaks.forEach(function (s) { s.x += vx * dt; s.y += vy * dt; if (s.y > height) { s.y -= height; s.x = rand() * width; } if (s.x > width) s.x -= width; if (s.x < 0) s.x += width; });
    return ev;
  }

  // Draw over a screen space rectangle.
  function draw(t, w, ctx, width, height) {
    var L = look(t, w);
    if (L.fog > 0) { ctx.globalAlpha = L.fog * 0.5; ctx.fillStyle = L.tint; ctx.fillRect(0, 0, width, height); ctx.globalAlpha = 1; }
    if (w.streaks.length) {
      ctx.strokeStyle = L.color; ctx.globalAlpha = 0.55; ctx.lineWidth = 1.2; ctx.beginPath();
      var dx = Math.cos(L.angle), dy = Math.sin(L.angle);
      w.streaks.forEach(function (s) { ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - dx * s.len, s.y - dy * s.len); });
      ctx.stroke(); ctx.globalAlpha = 1;
    }
    if (w.flash > 0) { ctx.globalAlpha = Math.min(0.8, w.flash / t.flashSeconds); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, width, height); ctx.globalAlpha = 1; }
  }

  var api = { create: create, setState: setState, look: look, tick: tick, draw: draw };
  C.weather = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
