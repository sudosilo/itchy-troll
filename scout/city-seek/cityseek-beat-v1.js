/* City Seek beat engine v1.
   Standalone. Knows nothing about scoring, levels or targets.
   BeatEngine.analysis: turns audio into a timeline of {t, band, s, tag} events.
   BeatEngine.create(): loads a timeline and a stage, renders any moment t, and hit tests a tap. */
(function (G) {
  'use strict';
  var BANDS = ['low', 'mid', 'high'];

  function hash(n) {
    n = n | 0; n = (n ^ 61) ^ (n >>> 16); n = (n + (n << 3)) | 0; n = n ^ (n >>> 4);
    n = Math.imul(n, 0x27d4eb2d); n = n ^ (n >>> 15); return (n >>> 0) / 4294967296;
  }
  function seeded(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function OAC() { return G.OfflineAudioContext || G.webkitOfflineAudioContext; }
  function newBuffer(n, sr) {
    try { return new AudioBuffer({ length: n, numberOfChannels: 1, sampleRate: sr }); }
    catch (e) { var C = OAC(); return new C(1, 1, sr).createBuffer(1, n, sr); }
  }

  var SR = 22050;
  var analysis = {
    SR: SR,
    decode: function (arrayBuf) {
      var C = OAC(), oc = new C(1, SR, SR);
      return new Promise(function (res, rej) {
        var p = oc.decodeAudioData(arrayBuf, res, rej);
        if (p && p.then) p.then(res, rej);
      });
    },
    /* render the track through three filters once and keep short window energy per band */
    bands: function (buf, onProg) {
      var C = OAC(), len = Math.ceil(buf.duration * SR), hop = 256, win = 512, out = {};
      var specs = [['low', 'lowpass', 120, 0.7], ['mid', 'bandpass', 800, 0.6], ['high', 'highpass', 6000, 0.7]];
      var i = 0;
      function next() {
        if (i >= specs.length) return Promise.resolve({ bands: out, hop: hop, win: win, sr: SR, duration: buf.duration });
        var sp = specs[i], oc = new C(1, len, SR), src = oc.createBufferSource(), f = oc.createBiquadFilter();
        src.buffer = buf; f.type = sp[1]; f.frequency.value = sp[2]; f.Q.value = sp[3];
        src.connect(f); f.connect(oc.destination); src.start(0);
        return oc.startRendering().then(function (r) {
          var d = r.getChannelData(0), n = Math.max(1, Math.floor((d.length - win) / hop)), e = new Float32Array(n);
          for (var k = 0; k < n; k++) { var s = 0, o = k * hop; for (var j = 0; j < win; j += 2) { var v = d[o + j]; s += v * v; } e[k] = s; }
          out[sp[0]] = e; i++; if (onProg) onProg(i / specs.length);
          return next();
        });
      }
      return next();
    },
    /* onset detector: a jump above the rolling average, at a local peak, with a minimum gap */
    detect: function (A, sens) {
      var ev = [], k = 1.2 + (1 - sens) * 1.7, aw = Math.round(0.5 * A.sr / A.hop), gap = { low: 0.13, mid: 0.1, high: 0.075 };
      BANDS.forEach(function (b) {
        var e = A.bands[b], n = e.length, mx = 0, i;
        for (i = 0; i < n; i++) if (e[i] > mx) mx = e[i];
        if (!mx) return;
        var floor = mx * 0.012, sum = 0, cnt = 0, last = -1;
        for (i = 0; i < n; i++) {
          var avg = cnt ? sum / cnt : e[i];
          if (i > 0 && i < n - 1 && e[i] > floor && e[i] > avg * k && e[i] >= e[i - 1] && e[i] >= e[i + 1]) {
            var t = (i * A.hop + A.win * 0.3) / A.sr;
            if (last < 0 || t - last >= gap[b]) { ev.push({ t: t, band: b, s: Math.min(1, Math.sqrt(e[i] / mx)), tag: null }); last = t; }
          }
          sum += e[i]; cnt++;
          if (cnt > aw) { sum -= e[i - aw]; cnt--; }
        }
      });
      ev.sort(function (a, b) { return a.t - b.t; });
      ev.forEach(function (x, i) { x.i = i; x.seed = Math.floor(hash(i * 7919 + 13) * 1e9); });
      return ev;
    },
    /* a built in beat so everything can be tested with no audio file */
    testBeat: function () {
      var sr = SR, spb = 0.5, bars = 32, dur = bars * 4 * spb, n = Math.ceil((dur + 1) * sr), d = new Float32Array(n), R = seeded(7);
      function put(t0, len, fn) { var i0 = Math.round(t0 * sr), m = Math.min(n - i0, Math.round(len * sr)); for (var i = 0; i < m; i++) d[i0 + i] += fn(i / sr); }
      function kick(t) { put(t, 0.45, function (x) { return Math.sin(2 * Math.PI * (48 * x + 2.6 * (1 - Math.exp(-30 * x)))) * Math.exp(-x * 7) * 0.95; }); }
      function snare(t) { put(t, 0.25, function (x) { return (R() * 2 - 1) * 0.5 * Math.exp(-x * 16) + Math.sin(2 * Math.PI * 190 * x) * 0.35 * Math.exp(-x * 28); }); }
      function hat(t, a) { var p = 0; put(t, 0.06, function (x) { var w = R() * 2 - 1, h = w - p; p = w; return h * a * Math.exp(-x * 70); }); }
      function bass(t, f, len) { put(t, len, function (x) { var env = Math.min(1, x / 0.006) * Math.exp(-x * 5), ph = 2 * Math.PI * f * x; return (Math.sin(ph) + 0.5 * Math.sin(2 * ph) + 0.3 * Math.sin(3 * ph)) * 0.26 * env; }); }
      var notes = [220, 220, 261.6, 196];
      for (var b = 0; b < bars; b++) {
        var bt = b * 4 * spb, brk = b >= 20 && b < 24, dense = (b >= 16 && b < 20) || b >= 28;
        for (var q = 0; q < 4; q++) {
          var t = bt + q * spb;
          if (!brk) kick(t);
          if (b >= 8 && !brk && (q === 1 || q === 3)) snare(t);
          if (b >= 4) {
            if (brk) { if (q % 2 === 1) hat(t + spb / 2, 0.3); }
            else { hat(t + spb / 2, 0.32); if (dense) { hat(t + spb / 4, 0.18); hat(t + spb * 3 / 4, 0.18); } }
          }
          if (b >= 12 && !brk) bass(t + spb / 2, notes[(b + q) % 4], spb * 0.45);
        }
      }
      var pk = 0, i; for (i = 0; i < n; i++) { var a = Math.abs(d[i]); if (a > pk) pk = a; }
      var g = pk ? 0.9 / pk : 1; for (i = 0; i < n; i++) d[i] *= g;
      var buf = newBuffer(n, sr); buf.copyToChannel ? buf.copyToChannel(d, 0) : buf.getChannelData(0).set(d);
      return buf;
    },
    wav: function (buf) {
      var d = buf.getChannelData(0), sr = buf.sampleRate, n = d.length, ab = new ArrayBuffer(44 + n * 2), v = new DataView(ab);
      function s(o, str) { for (var i = 0; i < str.length; i++) v.setUint8(o + i, str.charCodeAt(i)); }
      s(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); s(8, 'WAVE'); s(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
      v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); s(36, 'data'); v.setUint32(40, n * 2, true);
      for (var i = 0; i < n; i++) { var x = Math.max(-1, Math.min(1, d[i])); v.setInt16(44 + i * 2, x < 0 ? x * 0x8000 : x * 0x7fff, true); }
      return new Blob([ab], { type: 'audio/wav' });
    }
  };

  /* placement: pos = line + dir * speed * (eventTime - now). Seeking and pausing need no extra state. */
  function create() {
    var E = { events: [], stage: null, axis: 'v', lineFrac: 0.7, speed: 300, cap: 240 };
    function dir() { return E.axis === 'v' ? -1 : 1; }
    function len(v) { return E.axis === 'v' ? v.h : v.w; }
    function line(v) { return len(v) * E.lineFrac; }
    function pos(et, t, v) { return line(v) + dir() * (et - t) * E.speed; }
    function lower(tt) { var a = 0, b = E.events.length; while (a < b) { var m = (a + b) >> 1; if (E.events[m].t < tt) a = m + 1; else b = m; } return a; }
    function place(ev, t, v) { var a = pos(ev.t, t, v), c = E.stage.cross(ev, v); return E.axis === 'v' ? { x: c, y: a } : { x: a, y: c }; }

    E.config = function (o) { for (var k in o) E[k] = o[k]; };
    E.setTimeline = function (ev) { E.events = ev || []; };
    E.setStage = function (s) { E.stage = s; };
    E.line = line;
    E.between = function (a, b) { return E.events.slice(lower(a), lower(b)); };
    E.posOf = place;
    E.range = function (t, v, margin) {
      var p = line(v), ta = t + (-margin - p) / (dir() * E.speed), tb = t + (len(v) + margin - p) / (dir() * E.speed);
      return [Math.min(ta, tb), Math.max(ta, tb)];
    };
    E.render = function (ctx, t, v, hooks) {
      var st = E.stage; hooks = hooks || {};
      st.bg(ctx, t, v, E);
      var r = E.range(t, v, st.margin(v)), i0 = lower(r[0]), i1 = lower(r[1]);
      st.layers.forEach(function (layer) {
        if (typeof layer === 'function') { layer(ctx, t, v, E); return; }
        var drawn = 0;
        for (var i = i0; i < i1 && drawn < E.cap; i++) {
          var ev = E.events[i]; if (ev.band !== layer) continue;
          var p = place(ev, t, v), size = st.size(ev, v);
          var fn = (hooks.spriteFor && hooks.spriteFor(ev)) || st.sprites[layer];
          fn(ctx, p.x, p.y, size, ev, v, t - ev.t, E); drawn++;
        }
      });
      if (st.fg) st.fg(ctx, t, v, E);
    };
    E.hitTest = function (x, y, t, v, hooks) {
      var st = E.stage, along = E.axis === 'v' ? y : x, tAt = t + (along - line(v)) / (dir() * E.speed), tol = st.margin(v) / E.speed;
      var i0 = lower(tAt - tol), i1 = lower(tAt + tol), best = null, bd = 1e12;
      for (var i = i0; i < i1; i++) {
        var ev = E.events[i], p = place(ev, t, v), size = st.size(ev, v);
        var box = (hooks && hooks.boxFor && hooks.boxFor(ev, p.x, p.y, size, v)) || st.box(ev, p.x, p.y, size, v);
        if (x < box[0] || x > box[2] || y < box[1] || y > box[3]) continue;
        var d = Math.hypot((box[0] + box[2]) / 2 - x, (box[1] + box[3]) / 2 - y) - BANDS.indexOf(ev.band) * 4 - (hooks && hooks.rank ? hooks.rank(ev) : 0);
        if (d < bd) { bd = d; best = ev; }
      }
      return best;
    };
    return E;
  }

  G.BeatEngine = { create: create, analysis: analysis, hash: hash, BANDS: BANDS, version: 'v1' };
})(window);
