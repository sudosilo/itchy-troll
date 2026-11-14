/* City Seek music mode v1. Loads after art, world, engine and the beat engine.
   Stages for the beat engine (top down city flyover and train window), the audio clock,
   the stream hunt, and video recording. */
(function (G) {
  'use strict';
  var H01 = BeatEngine.hash, A = BeatEngine.analysis;
  var WORDS = ['ON TIME', 'NEXT STOP', '08:14', 'OPEN', 'COFFEE', 'TICKETS', 'EXIT', 'DELIVERY', '24H', 'WAIT HERE', 'HOME', 'OFFICE', 'PLATFORM', 'SALE', 'NEW', 'LUNCH'];
  var TARGET_IDS = ['balloon', 'crown', 'ufo', 'plane', 'key', 'cat', 'icecream', 'pizza', 'donut', 'tophat'];

  var TPAL = {
    bold: [
      { sky: '#bfe0ff', sun: '#ffd23f', far: '#8fb3d9', far2: '#a9c4e3', ground: '#d9d2bf', ground2: '#cfe6b8', ballast: '#b9b4a8', sleeper: '#7a5a3a', rail: '#4b5260', a: ['#f2c6a0', '#d7e3f4', '#f4e3a1', '#e8b4b8', '#bcd4f6', '#ffffff'], win: '#1f6fff', accent: '#ffd23f', lamp: '#fff6a0', bush: '#5aa865', roof: '#e63946' },
      { sky: '#ffe9c2', sun: '#ffb703', far: '#d9a87a', far2: '#e6bf95', ground: '#cbbf9f', ground2: '#d8cfa8', ballast: '#aca393', sleeper: '#5c4330', rail: '#3d405b', a: ['#c9b49a', '#e8b4b8', '#b8c4cc', '#f4a261', '#d7e3f4'], win: '#1a1a2e', accent: '#e63946', lamp: '#ffd23f', bush: '#7a9a4a', roof: '#3d405b' },
      { sky: '#d4f1ff', sun: '#ffd23f', far: '#8fcf8a', far2: '#a8dba0', ground: '#a8d88f', ground2: '#8fcc78', ballast: '#c2b8a3', sleeper: '#7a5a3a', rail: '#4b5260', a: ['#ffffff', '#f6cfa8', '#e9e2d0', '#ffb4a2', '#bcd4f6'], win: '#1f6fff', accent: '#2d9a5f', lamp: '#fff6a0', bush: '#3f8a4c', roof: '#e63946' }
    ],
    muted: [
      { sky: '#f3efe6', sun: '#e8c77a', far: '#d9d4c7', far2: '#e2ddd0', ground: '#e8e2d4', ground2: '#e4e6d6', ballast: '#d3ccbf', sleeper: '#a89a88', rail: '#7a7a7a', a: ['#9fb4c7', '#c9b8a6', '#e3d9c6', '#b9c4b0', '#f3efe6'], win: '#5f7d9c', accent: '#d98c6a', lamp: '#f3e3b0', bush: '#a9bb98', roof: '#c77d5e' },
      { sky: '#f1ece2', sun: '#dcb46a', far: '#d6cdbd', far2: '#e0d8c9', ground: '#e4dccb', ground2: '#e2dfcd', ballast: '#cfc7b8', sleeper: '#9c8c78', rail: '#707070', a: ['#c7a98b', '#a9b2a8', '#d9c7a8', '#e8dfcf'], win: '#6b6b6b', accent: '#c77d5e', lamp: '#ecd9a0', bush: '#b0b48f', roof: '#8a8f99' },
      { sky: '#f4f1e8', sun: '#e3c27a', far: '#cfd8c4', far2: '#dbe2d0', ground: '#e6e9da', ground2: '#dde5cf', ballast: '#d6d0c2', sleeper: '#a89a88', rail: '#7a7a7a', a: ['#b5c9a8', '#e6d3b8', '#c2ced6', '#f3efe6'], win: '#6e8fa8', accent: '#d4a24c', lamp: '#f3e3b0', bush: '#9fb58c', roof: '#c77d5e' }
    ]
  };

  function backOut(k) { var c = 1.70158, q = k - 1; return 1 + (c + 1) * q * q * q + c * q * q; }
  function stageIx(t) { return ((Math.floor(t / 24) % 3) + 3) % 3; }
  function pal(v, t) { return TPAL[v.look === 'muted' ? 'muted' : 'bold'][stageIx(t)]; }
  function lw(v) { return (v.look === 'muted' ? 1.2 : 2.2) * v.u; }
  function ink(v) { return v.look === 'muted' ? '#4a4a4a' : INK; }
  function pick(a, s) { return a[(s >>> 0) % a.length]; }
  function shape(c, v, fill) { if (fill) { c.fillStyle = fill; c.fill(); } c.lineWidth = lw(v); c.strokeStyle = ink(v); c.lineJoin = 'round'; c.stroke(); }
  function box(c, x, y, w, h, v, fill) { c.beginPath(); c.rect(x, y, w, h); shape(c, v, fill); }
  function stick(c, x0, y0, x1, y1, v, w) { c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.lineWidth = w || lw(v); c.strokeStyle = ink(v); c.lineCap = 'round'; c.stroke(); }
  function muteHex(h) {
    var n = parseInt(h.slice(1), 16), r = n >> 16 & 255, g = n >> 8 & 255, b = n & 255, m = (r + g + b) / 3;
    r = Math.round(r * 0.5 + m * 0.5 + 12); g = Math.round(g * 0.5 + m * 0.5 + 10); b = Math.round(b * 0.5 + m * 0.5 + 6);
    return 'rgb(' + Math.min(255, r) + ',' + Math.min(255, g) + ',' + Math.min(255, b) + ')';
  }
  function col(v, h) { return v.look === 'muted' && h && h.charAt(0) === '#' && h.length === 7 ? muteHex(h) : h; }

  /* Remind Me style callout: a small pill with an icon and a few words that pops in beside an object */
  function callout(c, x, y, ev, v, age, p) {
    if (!v.callouts || ev.s < 0.6 || ev.seed % 3 !== 0 || age < -1.6 || age > 1.4) return;
    var u = v.u, k = Math.min(1, (age + 1.6) / 0.3), sc = k < 1 ? backOut(k) : 1, al = age > 1.1 ? Math.max(0, (1.4 - age) / 0.3) : 1, txt = WORDS[ev.seed % WORDS.length];
    c.save(); c.globalAlpha = al; c.translate(x, y); c.scale(sc, sc);
    c.font = '800 ' + (11 * u) + 'px "Trebuchet MS",sans-serif'; c.textBaseline = 'middle'; c.textAlign = 'left';
    var tw = c.measureText(txt).width, bw = tw + 30 * u, bh = 22 * u;
    c.beginPath(); c.moveTo(-6 * u, -3 * u); c.lineTo(0, 6 * u); c.lineTo(6 * u, -3 * u); c.closePath(); shape(c, v, '#ffffff');
    rr(c, -bw / 2, -bh - 2 * u, bw, bh, bh / 2); shape(c, v, '#ffffff');
    var ix = -bw / 2 + 12 * u, iy = -bh / 2 - 2 * u, ic = ev.seed % 3;
    c.beginPath();
    if (ic === 0) c.arc(ix, iy, 5.5 * u, 0, TAU);
    else if (ic === 1) c.rect(ix - 5 * u, iy - 5 * u, 10 * u, 10 * u);
    else { c.moveTo(ix, iy - 6 * u); c.lineTo(ix + 6 * u, iy + 5 * u); c.lineTo(ix - 6 * u, iy + 5 * u); c.closePath(); }
    shape(c, v, p.accent);
    c.fillStyle = ink(v); c.fillText(txt, -bw / 2 + 22 * u, iy + 0.5 * u);
    c.restore();
  }
  var BANDCOL = { bold: { low: '#1f6fff', mid: '#ffb703', high: '#e63946' }, muted: { low: '#5f7d9c', mid: '#d4a24c', high: '#d98c6a' } };
  /* the action line: a playhead every object crosses on its beat, with a hit burst for every event */
  function lineFg(c, t, v, E) {
    if (!v.line) return;
    var u = v.u, p = E.line(v), vert = E.axis === 'v', L = vert ? v.w : v.h, bc = BANDCOL[v.look === 'muted' ? 'muted' : 'bold'];
    var hits = E.between(t - 0.45, t + 0.001), kick = 0, glow = 0;
    hits.forEach(function (ev) { var a = t - ev.t; if (ev.band === 'low') kick = Math.max(kick, 1 - a / 0.3); glow = Math.max(glow, 1 - a / 0.12); });
    if (kick > 0) { c.save(); c.globalAlpha = kick * 0.8; c.lineWidth = 12 * u * kick; c.strokeStyle = bc.low; c.strokeRect(0, 0, v.w, v.h); c.restore(); }
    c.save();
    c.lineCap = 'butt';
    c.globalAlpha = 0.35; c.lineWidth = (8 + 10 * Math.max(0, glow)) * u; c.strokeStyle = '#ffffff'; c.beginPath();
    if (vert) { c.moveTo(0, p); c.lineTo(v.w, p); } else { c.moveTo(p, 0); c.lineTo(p, v.h); } c.stroke();
    c.globalAlpha = 1; c.lineWidth = (3 + 3 * Math.max(0, kick)) * u; c.strokeStyle = bc.low; c.stroke();
    hits.forEach(function (ev) {
      var a = t - ev.t, cr = E.stage.cross(ev, v), size = E.stage.size(ev, v), col = bc[ev.band];
      if (!vert) cr = ev.band === 'low' ? cr - size * 0.5 : ev.band === 'mid' ? cr - size * 0.6 : cr - size * 0.6;
      var x = vert ? cr : p, y = vert ? p : cr, k;
      if (ev.band === 'low') {
        k = a / 0.45; if (k > 1) return;
        c.globalAlpha = 1 - k; c.beginPath(); c.arc(x, y, (18 + k * 70) * u, 0, TAU); c.lineWidth = (8 * (1 - k) + 1) * u; c.strokeStyle = col; c.stroke();
      } else if (ev.band === 'mid') {
        k = a / 0.3; if (k > 1) return;
        c.globalAlpha = 1 - k; c.beginPath(); c.arc(x, y, (10 + k * 46) * u, 0, TAU); c.lineWidth = (6 * (1 - k) + 1) * u; c.strokeStyle = col; c.stroke();
        c.fillStyle = col; c.globalAlpha = (1 - k) * 0.25; c.fill();
      } else {
        k = a / 0.18; if (k > 1) return;
        c.globalAlpha = 1 - k; c.lineWidth = 3 * u; c.strokeStyle = col; c.beginPath();
        for (var i = 0; i < 8; i++) { var an = i / 8 * TAU + (ev.seed % 7), r0 = (5 + k * 10) * u, r1 = (12 + k * 22) * u; c.moveTo(x + Math.cos(an) * r0, y + Math.sin(an) * r0); c.lineTo(x + Math.cos(an) * r1, y + Math.sin(an) * r1); }
        c.stroke();
      }
      c.globalAlpha = 1 - Math.min(1, a / 0.15); c.fillStyle = col; var tl = (ev.band === 'low' ? 60 : ev.band === 'mid' ? 40 : 24) * u, tw = 7 * u;
      if (vert) c.fillRect(cr - tl / 2, p - tw / 2, tl, tw); else c.fillRect(p - tw / 2, cr - tl / 2, tw, tl);
    });
    c.globalAlpha = 1; c.fillStyle = bc.low; var m = 12 * u;
    c.beginPath();
    if (vert) { c.moveTo(0, p - m); c.lineTo(m * 1.2, p); c.lineTo(0, p + m); c.moveTo(v.w, p - m); c.lineTo(v.w - m * 1.2, p); c.lineTo(v.w, p + m); }
    else { c.moveTo(p - m, 0); c.lineTo(p, m * 1.2); c.lineTo(p + m, 0); c.moveTo(p - m, v.h); c.lineTo(p, v.h - m * 1.2); c.lineTo(p + m, v.h); }
    c.fill();
    c.restore();
  }
  function ring(c, x, y, size, age, v) {
    if (age < 0 || age > 0.35) return;
    var k = age / 0.35; c.beginPath(); c.arc(x, y, size * (1 + k * 0.9), 0, TAU);
    c.lineWidth = (4 * (1 - k) + 1) * v.u; c.strokeStyle = 'rgba(31,111,255,' + (1 - k) + ')'; c.stroke();
  }

  function shade(h, k) {
    if (!h || h.charAt(0) !== '#') return h;
    var n = parseInt(h.slice(1), 16), r = Math.min(255, Math.round((n >> 16 & 255) * k)), g = Math.min(255, Math.round((n >> 8 & 255) * k)), b = Math.min(255, Math.round((n & 255) * k));
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }
  /* a block drawn as a little isometric prism: side face with hatching, lit roof face, then the front */
  function prism(c, x0, y0, w, h, v, fill, dk) {
    var d = Math.min(w * (dk || 0.2), 30 * v.u), dy = d * 0.55, u = v.u;
    c.beginPath(); c.moveTo(x0 + w, y0 + h); c.lineTo(x0 + w, y0); c.lineTo(x0 + w + d, y0 - dy); c.lineTo(x0 + w + d, y0 + h - dy); c.closePath(); shape(c, v, shade(fill, 0.78));
    c.save(); c.clip(); c.globalAlpha = 0.28; c.lineWidth = 0.8 * u; c.strokeStyle = ink(v); c.beginPath();
    for (var yy = y0 - dy + 5 * u; yy < y0 + h; yy += 7 * u) { c.moveTo(x0 + w, yy + dy); c.lineTo(x0 + w + d, yy); }
    c.stroke(); c.restore();
    c.beginPath(); c.moveTo(x0, y0); c.lineTo(x0 + w, y0); c.lineTo(x0 + w + d, y0 - dy); c.lineTo(x0 + d, y0 - dy); c.closePath(); shape(c, v, shade(fill, 1.07));
    box(c, x0, y0, w, h, v, fill);
    return { d: d, dy: dy };
  }
  function cutaway(c, x0, y0, w, h, v, p, sd, lit) {
    var u = v.u, floors = Math.max(2, Math.round(h / (34 * u))), fh = h / floors;
    box(c, x0, y0, w, h, v, p.far2);
    for (var f = 0; f < floors; f++) {
      var fy = y0 + f * fh;
      if (f) { c.fillStyle = ink(v); c.fillRect(x0, fy - 1.5 * u, w, 3 * u); }
      var dx = x0 + w * (0.12 + 0.3 * H01(sd + f * 3)); box(c, dx, fy + fh * 0.6, w * 0.26, fh * 0.12, v, '#ffffff');
      var px = dx + w * 0.1, bob = lit ? -3 * u : 0; c.beginPath(); c.arc(px, fy + fh * 0.36 + bob, 3.2 * u, 0, TAU); shape(c, v, pick(PAL.skin, sd + f));
      box(c, px - 3 * u, fy + fh * 0.36 + 3 * u + bob, 6 * u, fh * 0.24, v, pick(PAL.shirt, sd + f * 7));
    }
    var pxp = x0 + w * 0.86; c.lineWidth = 4 * u; c.strokeStyle = v.look === 'muted' ? '#7fa6c9' : '#5aa0e6'; c.beginPath(); c.moveTo(pxp, y0 + h); c.lineTo(pxp, y0); c.stroke();
    c.lineWidth = 1.6 * u; c.beginPath(); for (var k = 0; k < 7; k++) { var yy = y0 + h * 0.3 + k * 5 * u; c.moveTo(pxp - 7 * u, yy); c.lineTo(pxp + 7 * u, yy + 2.5 * u); } c.stroke();
    [0.15, 0.85].forEach(function (q) { c.beginPath(); c.arc(pxp, y0 + h * q, 3 * u, 0, TAU); shape(c, v, '#ffffff'); });
  }
  function roofKit(c, x0, y0, w, v, p, sd, d) {
    var u = v.u, k = sd % 4;
    if (k === 1) {
      var tx = x0 + w * 0.25 + d * 0.5, tw = Math.min(26 * u, w * 0.35), th = tw * 0.9, ty = y0 - d * 0.3 - 10 * u;
      stick(c, tx + 3 * u, ty, tx + 3 * u, ty + 10 * u, v); stick(c, tx + tw - 3 * u, ty, tx + tw - 3 * u, ty + 10 * u, v);
      box(c, tx, ty - th, tw, th, v, '#c9b49a'); c.beginPath(); c.moveTo(tx - 2 * u, ty - th); c.lineTo(tx + tw / 2, ty - th - tw * 0.35); c.lineTo(tx + tw + 2 * u, ty - th); c.closePath(); shape(c, v, '#a88a6a');
    } else if (k === 2) {
      for (var i = 0; i < 2; i++) prism(c, x0 + w * (0.2 + i * 0.35), y0 - d * 0.35 - 9 * u, 12 * u, 9 * u, v, '#d6d9de', 0.4);
    } else if (k === 3) {
      stick(c, x0 + w * 0.7, y0 - d * 0.3, x0 + w * 0.7, y0 - d * 0.3 - 30 * u, v); stick(c, x0 + w * 0.7 - 8 * u, y0 - d * 0.3 - 22 * u, x0 + w * 0.7 + 8 * u, y0 - d * 0.3 - 22 * u, v);
    }
  }

  /* ===== train window stage: side view, scrolls right to left ===== */
  function windows(c, x0, y0, w, h, colr, v, seed) {
    var u = v.u, cols = Math.max(2, Math.floor(w / (15 * u))), rows = Math.max(2, Math.floor((h - 12 * u) / (17 * u))), cw = w / cols, rh = (h - 10 * u) / rows;
    c.fillStyle = colr;
    for (var r = 0; r < rows; r++) for (var k = 0; k < cols; k++) {
      if (H01(seed + r * 31 + k * 7) < 0.18) continue;
      c.fillRect(x0 + k * cw + cw * 0.25, y0 + 6 * u + r * rh + rh * 0.22, cw * 0.5, rh * 0.5);
    }
  }
  var train = {
    margin: function (v) { return 140 * v.u; },
    cross: function (ev, v) { return ev.band === 'low' ? v.h * 0.6 : ev.band === 'mid' ? v.h * 0.672 : v.h * (0.85 + 0.05 * H01(ev.seed + 3)); },
    size: function (ev, v) { return v.u * (ev.band === 'low' ? 80 + 130 * ev.s : ev.band === 'mid' ? 60 + 60 * ev.s : 16 + 18 * ev.s); },
    box: function (ev, x, y, size, v) {
      var half = ev.band === 'low' ? size * 0.32 : ev.band === 'mid' ? Math.max(16 * v.u, size * 0.2) : Math.max(16 * v.u, size * 0.75);
      return [x - half, y - size * (ev.band === 'high' ? 1.4 : 1), x + half, y + 8 * v.u];
    },
    bg: function (c, t, v, E) {
      var p = pal(v, t), w = v.w, h = v.h, u = v.u, base = h * 0.6, sp = E.speed, salt = stageIx(t) * 101;
      c.fillStyle = p.sky; c.fillRect(0, 0, w, h);
      c.beginPath(); c.arc(w * 0.78, h * 0.16, Math.min(w, h) * 0.07, 0, TAU); shape(c, v, p.sun);
      var sw = 90 * u, off = t * sp * 0.1;
      c.beginPath(); c.moveTo(-20, base + 2);
      for (var x = -20; x <= w + 20; x += 6 * u) {
        var q = (x + off) / sw, k = Math.floor(q), f = q - k, a = H01(k + salt), b = H01(k + 1 + salt), m = (1 - Math.cos(f * Math.PI)) / 2;
        c.lineTo(x, base - h * (0.05 + 0.11 * (a + (b - a) * m)));
      }
      c.lineTo(w + 20, base + 2); c.closePath(); shape(c, v, p.far);
      var bw = 46 * u, off2 = t * sp * 0.28, j0 = Math.floor(off2 / bw) - 2, j1 = j0 + Math.ceil(w / bw) + 4;
      for (var j = j0; j <= j1; j++) {
        var r = H01(j * 31 + salt + 7); if (r < 0.35) continue;
        var bh = h * (0.03 + 0.08 * H01(j * 17 + salt)); box(c, j * bw - off2, base - bh, bw * (0.5 + 0.4 * r), bh, v, p.far2);
      }
      box(c, -20, base, w + 40, h - base + 20, v, p.ground);
    },
    sprites: {
      low: function (c, x, y, size, ev, v, age) {
        var p = pal(v, ev.t), st = stageIx(ev.t), sd = ev.seed, u = v.u, lit = age >= 0 && age < 0.25, win = lit ? p.accent : p.win, fill = pick(p.a, sd >>> 3), top = y - size, bw;
        if (st === 0) {
          var k = sd % 3;
          if (k === 0) { bw = size * 0.55; var pr0 = prism(c, x - bw / 2, top, bw, size, v, fill); windows(c, x - bw / 2, top, bw, size, win, v, sd); if ((sd >>> 4) % 3 === 0) cutaway(c, x - bw / 2 + bw * 0.12, top + size * 0.32, bw * 0.76, size * 0.5, v, p, sd, lit); roofKit(c, x - bw / 2, top, bw, v, p, sd >>> 2, pr0.d); }
          else if (k === 1) { bw = size * 0.34; var th = size * 1.15; top = y - th; prism(c, x - bw / 2, top, bw, th, v, fill, 0.3); stick(c, x, top, x, top - size * 0.14, v); c.beginPath(); c.arc(x, top - size * 0.14, 3 * u, 0, TAU); shape(c, v, lit ? p.accent : '#ffffff'); windows(c, x - bw / 2, top, bw, th, win, v, sd); }
          else { bw = size * 0.62; var lh = size * 0.6; prism(c, x - bw / 2, y - lh, bw, lh, v, fill); windows(c, x - bw / 2, y - lh, bw, lh, win, v, sd); var tw = size * 0.38; var pr2 = prism(c, x - tw / 2 + size * 0.06, top, tw, size - lh, v, pick(p.a, sd >>> 5), 0.3); roofKit(c, x - tw / 2 + size * 0.06, top, tw, v, p, sd >>> 3, pr2.d); windows(c, x - tw / 2 + size * 0.06, top, tw, size - lh, win, v, sd + 9); }
        } else if (st === 1) {
          if (sd % 2 === 0) {
            var fw = size * 0.9, fh = size * 0.42, n = 3;
            prism(c, x - fw / 2, y - fh, fw, fh, v, fill, 0.12);
            for (var i = 0; i < n; i++) { var tx = x - fw / 2 + i * fw / n; c.beginPath(); c.moveTo(tx, y - fh); c.lineTo(tx, y - fh - size * 0.16); c.lineTo(tx + fw / n, y - fh); c.closePath(); shape(c, v, pick(p.a, sd + i)); c.fillStyle = win; c.fillRect(tx + 2 * u, y - fh - size * 0.13, 4 * u, size * 0.1); }
            var cx = x + fw * 0.28; box(c, cx, top, size * 0.08, size - fh, v, pick(p.a, sd + 4)); box(c, cx, top + size * 0.06, size * 0.08, size * 0.05, v, p.accent);
            if (age > -0.05 && age < 0.9) { var pk = Math.max(0, age); c.save(); c.globalAlpha = 1 - pk / 0.9; c.beginPath(); c.arc(cx + size * 0.04 - pk * 30 * u, top - 10 * u - pk * 40 * u, (6 + pk * 14) * u, 0, TAU); shape(c, v, '#ffffff'); c.restore(); }
            c.fillStyle = win; for (var q = 0; q < 4; q++) c.fillRect(x - fw / 2 + fw * (0.1 + q * 0.2), y - fh * 0.6, fw * 0.1, fh * 0.25);
          } else {
            for (var s2 = 0; s2 < 2; s2++) { var sx = x - size * 0.22 + s2 * size * 0.24, sh = size * (0.75 - s2 * 0.1), swd = size * 0.2; c.beginPath(); c.moveTo(sx, y); c.lineTo(sx, y - sh + swd / 2); c.arc(sx + swd / 2, y - sh + swd / 2, swd / 2, Math.PI, 0); c.lineTo(sx + swd, y); c.closePath(); shape(c, v, pick(p.a, sd + s2)); c.fillStyle = win; c.fillRect(sx + swd * 0.3, y - sh * 0.7, swd * 0.4, sh * 0.12); }
            stick(c, x - size * 0.02, y - size * 0.62, x + size * 0.32, y - size * 0.2, v, 3 * u);
            box(c, x + size * 0.28, y - size * 0.22, size * 0.16, size * 0.22, v, fill);
          }
        } else {
          if (sd % 2 === 0) {
            var hw = size * 0.58, hh = size * 0.36;
            prism(c, x - hw / 2, y - hh, hw, hh, v, fill, 0.18);
            c.beginPath(); c.moveTo(x - hw / 2 - 4 * u, y - hh); c.lineTo(x, y - hh - size * 0.28); c.lineTo(x + hw / 2 + 4 * u, y - hh); c.closePath(); shape(c, v, p.roof);
            box(c, x - hw * 0.08, y - hh * 0.55, hw * 0.16, hh * 0.55, v, pick(p.a, sd + 3));
            box(c, x - hw * 0.38, y - hh * 0.75, hw * 0.18, hh * 0.3, v, win); box(c, x + hw * 0.2, y - hh * 0.75, hw * 0.18, hh * 0.3, v, win);
          } else {
            var bw2 = size * 0.7, bh2 = size * 0.45;
            box(c, x - bw2 / 2, y - bh2, bw2, bh2, v, p.roof);
            c.beginPath(); c.moveTo(x - bw2 / 2, y - bh2); c.lineTo(x - bw2 * 0.3, y - bh2 - size * 0.18); c.lineTo(x + bw2 * 0.3, y - bh2 - size * 0.18); c.lineTo(x + bw2 / 2, y - bh2); c.closePath(); shape(c, v, pick(p.a, sd));
            box(c, x - bw2 * 0.15, y - bh2 * 0.7, bw2 * 0.3, bh2 * 0.7, v, '#ffffff'); stick(c, x - bw2 * 0.15, y - bh2 * 0.7, x + bw2 * 0.15, y, v); stick(c, x + bw2 * 0.15, y - bh2 * 0.7, x - bw2 * 0.15, y, v);
            box(c, x - bw2 * 0.08, y - bh2 - size * 0.12, bw2 * 0.16, size * 0.08, v, win);
          }
        }
        callout(c, x, y - size - 16 * u, ev, v, age, p);
      },
      mid: function (c, x, y, size, ev, v, age) {
        var p = pal(v, ev.t), st = stageIx(ev.t), u = v.u, lit = age >= 0 && age < 0.3;
        if (st === 0) {
          stick(c, x, y, x, y - size, v, 4.5 * u);
          stick(c, x, y - size, x + size * 0.2, y - size, v, 3 * u);
          if (lit) { c.beginPath(); c.arc(x + size * 0.2, y - size + 7 * u, 16 * u, 0, TAU); c.fillStyle = 'rgba(255,214,63,.35)'; c.fill(); }
          c.beginPath(); c.arc(x + size * 0.2, y - size + 5 * u, 5 * u, 0, TAU); shape(c, v, lit ? p.accent : p.lamp);
          box(c, x - 4 * u, y - 4 * u, 8 * u, 4 * u, v, '#ffffff');
        } else if (st === 1) {
          var wb = size * 0.2, top = y - size;
          stick(c, x - wb, y, x - 2 * u, top, v); stick(c, x + wb, y, x + 2 * u, top, v);
          for (var i = 1; i < 5; i++) { var f = i / 5, yy = y - size * f, half = wb * (1 - f) + 2 * u; stick(c, x - half, yy, x + half, yy - size * 0.08, v, lw(v) * 0.8); stick(c, x + half, yy, x - half, yy - size * 0.08, v, lw(v) * 0.8); }
          stick(c, x - size * 0.22, top + size * 0.12, x + size * 0.22, top + size * 0.12, v); stick(c, x - size * 0.15, top + size * 0.02, x + size * 0.15, top + size * 0.02, v);
          [-0.22, 0.22, -0.15, 0.15].forEach(function (d, k) { c.beginPath(); c.arc(x + size * d, top + size * (k < 2 ? 0.12 : 0.02) + 5 * u, 3 * u, 0, TAU); shape(c, v, lit ? p.accent : '#ffffff'); });
        } else {
          var bounce = lit ? 1 + 0.1 * (1 - age / 0.3) : 1, cr = size * 0.27 * bounce;
          box(c, x - 4 * u, y - size * 0.5, 8 * u, size * 0.5, v, '#8a5a3a');
          c.beginPath(); c.arc(x - cr * 0.55, y - size * 0.6, cr * 0.7, 0, TAU); shape(c, v, p.bush);
          c.beginPath(); c.arc(x + cr * 0.55, y - size * 0.62, cr * 0.72, 0, TAU); shape(c, v, p.bush);
          c.beginPath(); c.arc(x, y - size * 0.78, cr, 0, TAU); shape(c, v, p.bush);
          if (lit) { c.fillStyle = p.accent; [[-0.3, 0.75], [0.2, 0.86], [0.35, 0.6]].forEach(function (q) { c.beginPath(); c.arc(x + cr * q[0] * 2, y - size * q[1], 3 * u, 0, TAU); c.fill(); }); }
        }
      },
      high: function (c, x, y, size, ev, v, age) {
        var p = pal(v, ev.t), u = v.u, k = ev.seed % 3, lit = age >= 0 && age < 0.22;
        if (k === 0) {
          box(c, x - 2.5 * u, y - size, 5 * u, size, v, '#ffffff');
          c.beginPath(); c.arc(x, y - size + 4 * u, 3.2 * u, 0, TAU); shape(c, v, lit ? p.accent : p.win);
        } else if (k === 1) {
          stick(c, x, y, x, y - size * 0.6, v, 3 * u);
          var sw = size * 1.15, sh = size * 0.62; rr(c, x - sw / 2, y - size * 0.6 - sh, sw, sh, 3 * u); shape(c, v, lit ? p.accent : '#ffffff');
          c.beginPath(); c.moveTo(x - sw * 0.25, y - size * 0.6 - sh * 0.5); c.lineTo(x + sw * 0.2, y - size * 0.6 - sh * 0.5); c.lineTo(x + sw * 0.05, y - size * 0.6 - sh * 0.75); c.moveTo(x + sw * 0.2, y - size * 0.6 - sh * 0.5); c.lineTo(x + sw * 0.05, y - size * 0.6 - sh * 0.25);
          c.lineWidth = 2 * u; c.strokeStyle = p.win; c.stroke();
        } else {
          var bs = lit ? 1.12 : 1;
          c.beginPath(); c.arc(x - size * 0.3, y - size * 0.25 * bs, size * 0.35 * bs, Math.PI, 0); c.arc(x + size * 0.25, y - size * 0.2 * bs, size * 0.4 * bs, Math.PI, 0); c.lineTo(x + size * 0.65, y); c.lineTo(x - size * 0.65, y); c.closePath(); shape(c, v, p.bush);
        }
      }
    }
  };
  train.layers = ['low', function (c, t, v, E) {
    var p = pal(v, t), h = v.h, w = v.w, u = v.u, y0 = h * 0.665, y1 = h * 0.735, sp = 26 * u, off = ((t * E.speed) % sp + sp) % sp;
    box(c, -20, y0, w + 40, y1 - y0, v, p.ballast);
    c.fillStyle = p.sleeper; for (var x = -off; x < w + sp; x += sp) c.fillRect(x, y0 + (y1 - y0) * 0.18, 9 * u, (y1 - y0) * 0.64);
    c.lineWidth = 3 * u; c.strokeStyle = p.rail; [0.32, 0.68].forEach(function (fr) { var yy = y0 + (y1 - y0) * fr; c.beginPath(); c.moveTo(0, yy); c.lineTo(w, yy); c.stroke(); });
    box(c, -20, y1, w + 40, h - y1 + 20, v, p.ground2);
  }, 'mid', function (c, t, v, E) {
    var r = E.range(t, v, 140 * v.u), evs = E.between(r[0], r[1]).filter(function (e) { return e.band === 'mid' && stageIx(e.t) === 1; }), u = v.u;
    c.lineWidth = 1.3 * u; c.strokeStyle = ink(v);
    for (var i = 0; i + 1 < evs.length; i++) {
      var a = evs[i], b = evs[i + 1], pa = E.posOf(a, t, v), pb = E.posOf(b, t, v), sa = train.size(a, v), sb = train.size(b, v);
      if (Math.abs(pb.x - pa.x) > v.w * 0.8) continue;
      [[-0.22, 0.12], [0.22, 0.12], [-0.15, 0.02], [0.15, 0.02]].forEach(function (q) {
        var x1 = pa.x + sa * q[0], y1 = pa.y - sa + sa * q[1] + 8 * u, x2 = pb.x + sb * q[0], y2 = pb.y - sb + sb * q[1] + 8 * u;
        c.beginPath(); c.moveTo(x1, y1); c.quadraticCurveTo((x1 + x2) / 2, Math.max(y1, y2) + Math.abs(x2 - x1) * 0.07, x2, y2); c.stroke();
      });
    }
  }, 'high'];
  train.fg = lineFg;

  /* ===== top down stage: the City Seek city scrolls under the camera like a flyover ===== */
  function makeTop(M) {
    var world = null, surf = null;
    /* a low resolution ground map of the city, so every beat object lands on a surface that suits it */
    var GROUND = [[163, 171, 182, 1], [236, 229, 212, 2], [241, 235, 223, 2], [239, 226, 196, 2], [168, 216, 143, 3], [195, 200, 206, 4]];
    function buildSurf() {
      surf = null; if (!world) return;
      try {
        var sc = 1 / 6, mw = Math.ceil(world.W * sc), mh = Math.ceil(world.H * sc), cv = document.createElement('canvas');
        cv.width = mw; cv.height = mh;
        var g = cv.getContext('2d', { willReadFrequently: true }); g.setTransform(sc, 0, 0, sc, 0, 0);
        world.items.forEach(function (it) { if (it.L <= 1 && !it.sh) { g.save(); try { it.f(g); } catch (e) { } g.restore(); } });
        var px = g.getImageData(0, 0, mw, mh).data, d = new Uint8Array(mw * mh);
        for (var i = 0; i < mw * mh; i++) {
          var r = px[i * 4], gg = px[i * 4 + 1], b = px[i * 4 + 2], best = 0, bd = 260;
          for (var k = 0; k < GROUND.length; k++) { var q = GROUND[k], dd = (r - q[0]) * (r - q[0]) + (gg - q[1]) * (gg - q[1]) + (b - q[2]) * (b - q[2]); if (dd < bd) { bd = dd; best = q[3]; } }
          d[i] = best;
        }
        surf = { d: d, mw: mw, mh: mh, sc: sc };
      } catch (e) { surf = null; }
    }
    function cls(wx, wy) { if (!surf) return 0; var x = Math.floor(wx * surf.sc), y = Math.floor(wy * surf.sc); if (x < 0 || y < 0 || x >= surf.mw || y >= surf.mh) return 0; return surf.d[y * surf.mw + x]; }
    var OPTS = {
      low: [[[3], 'tree', 12], [[2], 'umbrella', 8], [null, 'balloon', 0]],
      mid: [[[1, 4], 'car', 13], [[2], 'umbrella', 8], [null, 'balloon', 0]],
      high: [[[2], 'person', 5], [[3, 4], 'person', 5], [null, 'balloon', 0]]
    };
    function placeOf(ev, v) {
      var s = v.zs, E = S.E, key = s + '|' + E.speed + '|' + v.w;
      if (ev._pk === key) return ev._pl;
      var H = world.H, uy = H * 0.85 - ev.t * (E.speed / s), k = Math.floor(uy / H), ly = uy - k * H, left = copyX(k) - v.w / 2 / s, span = v.w / s;
      var opts = OPTS[ev.band].slice(), pl = null;
      if (ev.band === 'high' && H01(ev.seed + 6) < 0.25) opts = [[null, 'balloon', 0]];
      for (var o = 0; o < opts.length && !pl; o++) {
        var want = opts[o][0], kind = opts[o][1], m = opts[o][2], cands = [];
        if (!want) { pl = { x: span * (0.08 + 0.84 * H01(ev.seed + 11)), kind: kind, rot: 0 }; break; }
        for (var x = left + 16; x < left + span - 16; x += 4) {
          var c0 = cls(x, ly); if (want.indexOf(c0) < 0) continue;
          var hz = want.indexOf(cls(x - m, ly)) >= 0 && want.indexOf(cls(x + m, ly)) >= 0, vt = want.indexOf(cls(x, ly - m)) >= 0 && want.indexOf(cls(x, ly + m)) >= 0;
          if (hz && vt || (kind !== 'car' && (hz || vt)) || (kind === 'car' && (hz || vt))) cands.push(x);
        }
        if (!cands.length) continue;
        var px2 = cands[ev.seed % cands.length], rot = H01(ev.seed + 1) * TAU;
        if (kind === 'car' || kind === 'person') {
          var run = function (dx, dy) { var n = 0; for (var q = 1; q <= 10; q++) { if (want.indexOf(cls(px2 + dx * q * 8, ly + dy * q * 8)) < 0) break; n++; } return n; };
          var vert = run(0, -1) + run(0, 1), horz = run(-1, 0) + run(1, 0), alongV = vert >= horz;
          rot = alongV ? (ev.seed % 2 ? 0 : Math.PI) : (ev.seed % 2 ? Math.PI / 2 : -Math.PI / 2);
          if (kind === 'person') rot += (H01(ev.seed + 3) - 0.5) * 0.6;
        }
        pl = { x: px2 - left, kind: kind, rot: rot, max: 40 };
        if (kind === 'tree') { var lim = 10; [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) { var n = 0; for (var q = 1; q <= 10; q++) { if (cls(px2 + d[0] * q * 4, ly + d[1] * q * 4) !== 3) break; n++; } lim = Math.min(lim, n); }); pl.max = Math.max(9, lim * 4 - 2); }
      }
      pl.x *= s; ev._pl = pl; ev._pk = key; return pl;
    }
    function vis(it, vs) { if (it.sh && vs < it.sh) return false; if (it.hd && vs > it.hd * 1.2) return false; return true; }
    function paint(g, x0, y0, x1, y1, vs) {
      var C = world.CELL, list = [], seen = world._mm || (world._mm = new Int32Array(world.items.length)), st = (world._ms = (world._ms || 0) + 1);
      var cy0 = Math.max(0, Math.floor(y0 / C)), cy1 = Math.min(world.GH - 1, Math.floor(y1 / C)), cx0 = Math.max(0, Math.floor(x0 / C)), cx1 = Math.min(world.GW - 1, Math.floor(x1 / C));
      for (var cy = cy0; cy <= cy1; cy++) for (var cx = cx0; cx <= cx1; cx++) {
        var cell = world.grid[cy * world.GW + cx];
        for (var i = 0; i < cell.length; i++) { var id = cell[i]; if (seen[id] === st) continue; seen[id] = st; var it = world.items[id]; if (!vis(it, vs) || it.x1 < x0 || it.x0 > x1 || it.y1 < y0 || it.y0 > y1) continue; list.push(id); }
      }
      list.sort(function (a, b) { return world.items[a].L - world.items[b].L || a - b; });
      for (var n = 0; n < list.length; n++) { g.save(); try { world.items[list[n]].f(g); } catch (e) { } g.restore(); }
    }
    function copyX(k) { return world.W * (0.3 + 0.4 * H01(k * 977 + 5)); }
    var S = {
      setWorld: function (w) { world = w; buildSurf(); },
      hasWorld: function () { return !!world; },
      clear: function () { },
      margin: function (v) { return 90 * v.u; },
      cross: function (ev, v) { return world && S.E ? placeOf(ev, v).x : v.w * (0.08 + 0.84 * H01(ev.seed + 11)); },
      size: function (ev, v) { var s = v.zs; return ev.band === 'low' ? (18 + 18 * ev.s) * s : ev.band === 'mid' ? 21 * s : 10 * s; },
      box: function (ev, x, y, size, v) { var hh = Math.max(size * 1.05, 16 * v.u); return [x - hh, y - hh, x + hh, y + hh]; },
      bg: function (c, t, v, E) {
        c.fillStyle = '#a3abb6'; c.fillRect(0, 0, v.w, v.h);
        if (!world) return;
        var s = v.zs, H = world.H, vw = E.speed / s, P = E.line(v), Lw = H * 0.85 - t * vw, top = Lw - P / s, bot = Lw + (v.h - P) / s;
        for (var k = Math.floor(top / H); k <= Math.floor(bot / H); k++) {
          var left = copyX(k) - v.w / 2 / s, yA = Math.max(top, k * H) - k * H, yB = Math.min(bot, (k + 1) * H) - k * H;
          if (yB <= yA) continue;
          var oy = (k * H - Lw) * s + P;
          c.save(); c.beginPath(); c.rect(0, Math.max(0, oy), v.w, Math.min(v.h, oy + H * s) - Math.max(0, oy)); c.clip();
          c.setTransform(s, 0, 0, s, -left * s, oy);
          paint(c, left - 30, yA - 30, left + v.w / s + 30, yB + 30, M.xray ? 3 : 0.9);
          c.restore();
        }
        if (v.look === 'muted') { c.fillStyle = 'rgba(243,239,230,0.42)'; c.fillRect(0, 0, v.w, v.h); }
      },
      sprites: {
        low: function (c, x, y, size, ev, v, age) {
          var s = v.zs, pl = world && S.E ? placeOf(ev, v) : { kind: 'tree' }, pulse = age >= 0 && age < 0.25 ? 1 + 0.14 * (1 - age / 0.25) : 1;
          c.save(); c.translate(x, y); c.scale(s * pulse, s * pulse);
          if (pl.kind === 'tree') SP.tree(c, { r: Math.min(size / s, pl.max || 40), col: col(v, pick(PAL.tree, ev.seed)) });
          else if (pl.kind === 'umbrella') SP.umbrella(c, { col: col(v, pick(PAL.umb, ev.seed)), dots: ev.seed % 3 === 0, r: 14 });
          else SP.balloon(c, { col: col(v, pick(PAL.balloon, ev.seed)) });
          c.restore();
          ring(c, x, y, size, age, v);
          callout(c, x, y - size - 6 * v.u, ev, v, age, { accent: v.look === 'muted' ? '#d98c6a' : '#1f6fff' });
        },
        mid: function (c, x, y, size, ev, v, age) {
          var s = v.zs, pl = world && S.E ? placeOf(ev, v) : { kind: 'car', rot: 0 }, lit = age >= 0 && age < 0.2;
          c.save(); c.translate(x, y); c.scale(s, s); c.rotate(pl.rot || 0);
          if (pl.kind === 'car') {
            SP.car(c, { col: col(v, pick(PAL.car, ev.seed)), taxi: ev.seed % 11 === 0 });
            if (lit) { c.globalAlpha = 1 - age / 0.2; c.fillStyle = '#fff6a0'; c.beginPath(); c.moveTo(-9, -21); c.lineTo(-16, -48); c.lineTo(-1, -48); c.closePath(); c.moveTo(9, -21); c.lineTo(16, -48); c.lineTo(1, -48); c.closePath(); c.fill(); c.globalAlpha = 1; }
          } else if (pl.kind === 'umbrella') SP.umbrella(c, { col: col(v, pick(PAL.umb, ev.seed)), dots: false, r: 12 });
          else SP.balloon(c, { col: col(v, pick(PAL.balloon, ev.seed)) });
          c.restore();
          ring(c, x, y, size * 0.9, age, v);
        },
        high: function (c, x, y, size, ev, v, age) {
          var s = v.zs, pl = world && S.E ? placeOf(ev, v) : { kind: 'person', rot: 0 }, hop = age >= 0 && age < 0.15 ? 1 + 0.6 * (1 - age / 0.15) : 1;
          c.save(); c.translate(x, y); c.scale(s * hop, s * hop);
          if (pl.kind === 'balloon') SP.balloon(c, { col: col(v, pick(PAL.balloon, ev.seed)) });
          else {
            c.rotate((pl.rot || 0) + Math.PI);
            SP.person(c, { shirt: col(v, pick(PAL.shirt, ev.seed)), hair: pick(PAL.hair, ev.seed >>> 4), skin: pick(PAL.skin, ev.seed >>> 6) });
            if (age >= 0 && age < 0.3) { var k = Math.min(1, age / 0.07), sc = (k < 1 ? backOut(k) : 1) * (age > 0.22 ? (0.3 - age) / 0.08 : 1); c.scale(sc, sc); SP.umbrella(c, { col: col(v, pick(PAL.umb, ev.seed >>> 3)), dots: ev.seed % 4 === 0, r: 11 }); }
          }
          c.restore();
        }
      }
    };
    S.layers = ['low', 'mid', 'high'];
    S.fg = lineFg;
    return S;
  }


  /* ===== lanes stage: a MIDI style waterfall dressed as a street. Every band gets its own lanes,
     so fast hits stack up into a queue of cars, buses or people that cross the action line one by one ===== */
  function makeLanes() {
    function geo(v) { var u = v.u, W0 = 400 * u, x0 = (v.w - W0) / 2; return { u: u, x0: x0, W0: W0 }; }
    var LX = { low: [75, 145], mid: [215, 285], high: [342, 382] };
    function rows(c, x0, w, t, sp, step, colr, v) { var off = ((t * sp) % step + step) % step; c.fillStyle = colr; for (var y = -step + off; y < v.h + step; y += step) c.fillRect(x0, y, w, 1.5 * v.u); }
    var S = {
      margin: function (v) { return 70 * v.u; },
      cross: function (ev, v) { var g = geo(v); return g.x0 + LX[ev.band][ev.lane || 0] * g.u; },
      size: function (ev, v) { return v.u * (ev.band === 'low' ? 36 : ev.band === 'mid' ? 28 : 12); },
      box: function (ev, x, y, size, v) { var u = v.u, hw = ev.band === 'high' ? 16 * u : 18 * u; return [x - hw, y - size - 4 * u, x + hw, y + size + 4 * u]; },
      bg: function (c, t, v, E) {
        var g = geo(v), u = g.u, x0 = g.x0, sp = E.speed, side = v.look === 'muted' ? '#ece7dc' : '#ece5d4', road = v.look === 'muted' ? '#a9adb3' : '#8d939c';
        c.fillStyle = v.look === 'muted' ? '#ddd6c8' : '#c9c2b0'; c.fillRect(0, 0, v.w, v.h);
        if (x0 > 2) {
          var bh = 130 * u, off = ((t * sp) % bh + bh) % bh;
          for (var j = -2; j * bh < v.h + bh; j++) {
            var idx = j - Math.floor(t * sp / bh), y = j * bh + off;
            [[0, x0 - 6 * u, 3], [x0 + g.W0 + 6 * u, v.w, 7]].forEach(function (q) { if (q[1] - q[0] < 8 * u) return; c.beginPath(); c.rect(q[0] + 6 * u, y + 6 * u, q[1] - q[0] - 12 * u, bh - 12 * u); shape(c, v, col(v, pick(PAL.roof, Math.floor(H01(idx * 13 + q[2]) * 1e6)))); });
          }
        }
        c.fillStyle = side; c.fillRect(x0, 0, 40 * u, v.h); c.fillRect(x0 + 320 * u, 0, 80 * u, v.h);
        rows(c, x0, 40 * u, t, sp, 30 * u, 'rgba(120,110,90,.35)', v); rows(c, x0 + 320 * u, 80 * u, t, sp, 30 * u, 'rgba(120,110,90,.35)', v);
        c.fillStyle = road; c.fillRect(x0 + 40 * u, 0, 280 * u, v.h);
        var dl = 30 * u, doff = ((t * sp) % (dl * 2) + dl * 2) % (dl * 2);
        c.fillStyle = '#ffffff';
        [110, 250].forEach(function (lx) { for (var y = -dl * 2 + doff; y < v.h; y += dl * 2) c.fillRect(x0 + lx * u - 1.5 * u, y, 3 * u, dl); });
        c.fillStyle = '#ffd23f'; c.fillRect(x0 + 177 * u, 0, 2.5 * u, v.h); c.fillRect(x0 + 181 * u, 0, 2.5 * u, v.h);
        c.fillStyle = INK; c.fillRect(x0 + 39 * u, 0, 2.5 * u, v.h); c.fillRect(x0 + 319 * u, 0, 2.5 * u, v.h);
        var mp = 260 * u, moff = ((t * sp) % mp + mp) % mp, mbase = Math.floor(t * sp / mp);
        for (var j = -1; j * mp < v.h + mp; j++) {
          var my = j * mp + moff, idx = j - mbase, lx = [75, 145, 215, 285][Math.floor(H01(idx * 7 + 1) * 4)];
          c.beginPath(); c.arc(x0 + lx * u, my, 9 * u, 0, TAU); shape(c, v, '#7d838c'); c.lineWidth = 0.8 * u; c.beginPath(); c.moveTo(x0 + lx * u - 6 * u, my); c.lineTo(x0 + lx * u + 6 * u, my); c.moveTo(x0 + lx * u, my - 6 * u); c.lineTo(x0 + lx * u, my + 6 * u); c.stroke();
          var ax = x0 + [75, 145, 215, 285][Math.floor(H01(idx * 11 + 5) * 4)] * u, ay = my + mp * 0.5;
          c.fillStyle = 'rgba(255,255,255,.85)'; c.fillRect(ax - 3 * u, ay - 22 * u, 6 * u, 18 * u); c.beginPath(); c.moveTo(ax - 10 * u, ay - 4 * u); c.lineTo(ax + 10 * u, ay - 4 * u); c.lineTo(ax, ay + 10 * u); c.closePath(); c.fill();
          box(c, x0 + 42 * u, my + mp * 0.25, 8 * u, 18 * u, v, '#5b616a'); box(c, x0 + 310 * u, my + mp * 0.7, 8 * u, 18 * u, v, '#5b616a');
        }
        var lp = 200 * u, loff = ((t * sp) % lp + lp) % lp;
        for (var y3 = -lp + loff; y3 < v.h + lp; y3 += lp) { stick(c, x0 + 326 * u, y3, x0 + 300 * u, y3, v, 3 * u); c.beginPath(); c.arc(x0 + 326 * u, y3, 4 * u, 0, TAU); shape(c, v, '#6b7280'); c.beginPath(); c.ellipse(x0 + 298 * u, y3, 5 * u, 3.5 * u, 0, 0, TAU); shape(c, v, '#fff6a0'); }
        var tp = 170 * u, toff = ((t * sp) % tp + tp) % tp;
        for (var y2 = -tp + toff; y2 < v.h + tp; y2 += tp) { c.save(); c.translate(x0 + 20 * u, y2); c.scale(u, u); SP.tree(c, { r: 15, col: col(v, '#4f9d5a') }); c.restore(); }
      },
      sprites: {
        low: function (c, x, y, size, ev, v, age) {
          var u = v.u, lit = age >= 0 && age < 0.25, sq = lit ? 1 - 0.06 * (1 - age / 0.25) : 1, bus = ev.seed % 3 !== 0;
          c.save(); c.translate(x, y); c.scale(1, sq);
          rr(c, -10 * u, -30 * u, 30 * u, 72 * u, 6 * u); c.fillStyle = 'rgba(26,26,46,.16)'; c.fill();
          if (bus) {
            var bc = col(v, ev.seed % 2 ? '#1f6fff' : '#ffd23f');
            rr(c, -15 * u, -36 * u, 30 * u, 72 * u, 6 * u); shape(c, v, bc);
            rr(c, -11 * u, 22 * u, 22 * u, 10 * u, 3 * u); shape(c, v, '#bfe3ff');
            c.fillStyle = '#bfe3ff'; for (var k = 0; k < 5; k++) { c.fillRect(-14 * u, -30 * u + k * 10 * u, 3 * u, 7 * u); c.fillRect(11 * u, -30 * u + k * 10 * u, 3 * u, 7 * u); }
            rr(c, -7 * u, -20 * u, 14 * u, 16 * u, 2 * u); shape(c, v, '#ffffff');
          } else {
            rr(c, -15 * u, -36 * u, 30 * u, 50 * u, 3 * u); shape(c, v, '#ffffff');
            rr(c, -14 * u, 16 * u, 28 * u, 20 * u, 5 * u); shape(c, v, col(v, pick(PAL.car, ev.seed)));
            rr(c, -10 * u, 27 * u, 20 * u, 6 * u, 2 * u); shape(c, v, '#bfe3ff');
          }
          c.fillStyle = lit ? '#ffffff' : '#fff6a0'; c.fillRect(-13 * u, 34 * u, 6 * u, 3 * u); c.fillRect(7 * u, 34 * u, 6 * u, 3 * u);
          if (lit) { c.globalAlpha = 1 - age / 0.25; c.fillStyle = '#fff6a0'; c.beginPath(); c.moveTo(-14 * u, 37 * u); c.lineTo(-24 * u, 70 * u); c.lineTo(-2 * u, 70 * u); c.closePath(); c.moveTo(14 * u, 37 * u); c.lineTo(24 * u, 70 * u); c.lineTo(2 * u, 70 * u); c.closePath(); c.fill(); c.globalAlpha = 1; }
          c.restore();
          callout(c, x + 30 * u, y - 40 * u, ev, v, age, { accent: v.look === 'muted' ? '#d98c6a' : '#1f6fff' });
        },
        mid: function (c, x, y, size, ev, v, age) {
          var u = v.u, lit = age >= 0 && age < 0.2;
          c.save(); c.translate(x, y); c.rotate(Math.PI); c.scale(u * 1.3, u * 1.3);
          rr(c, -15, -17, 22, 42, 6); c.fillStyle = 'rgba(26,26,46,.16)'; c.fill();
          SP.car(c, { col: col(v, pick(PAL.car, ev.seed)), taxi: ev.seed % 9 === 0 });
          if (lit) { c.globalAlpha = 1 - age / 0.2; c.fillStyle = '#ffd23f'; c.beginPath(); c.arc(-6, -22, 4, 0, TAU); c.arc(6, -22, 4, 0, TAU); c.fill(); }
          c.restore();
        },
        high: function (c, x, y, size, ev, v, age) {
          var u = v.u, step = Math.sin(ev.seed + y * 0.08) * 0.12;
          c.save(); c.translate(x, y); c.rotate(Math.PI + step); c.scale(u * 1.9, u * 1.9);
          SP.person(c, { shirt: col(v, pick(PAL.shirt, ev.seed)), hair: pick(PAL.hair, ev.seed >>> 4), skin: pick(PAL.skin, ev.seed >>> 6), cap: ev.seed % 5 === 0 ? col(v, pick(PAL.cap, ev.seed >>> 2)) : null });
          if (age >= 0 && age < 0.3) {
            var k = Math.min(1, age / 0.07), sc = (k < 1 ? backOut(k) : 1) * (age > 0.22 ? (0.3 - age) / 0.08 : 1);
            c.scale(sc, sc); SP.umbrella(c, { col: col(v, pick(PAL.umb, ev.seed >>> 3)), dots: ev.seed % 4 === 0, r: 12 });
          }
          c.restore();
        }
      }
    };
    S.layers = ['low', 'mid', 'high'];
    S.fg = function (c, t, v, E) {
      var p = E.line(v), u = v.u, g = geo(v), bc = BANDCOL[v.look === 'muted' ? 'muted' : 'bold'];
      E.between(t - 0.22, t + 0.001).forEach(function (ev) {
        var a = t - ev.t, x = S.cross(ev, v), w = (ev.band === 'high' ? 40 : 70) * u;
        c.globalAlpha = (1 - a / 0.22) * 0.45; c.fillStyle = bc[ev.band]; c.fillRect(x - w / 2, p - 90 * u, w, 90 * u);
      });
      c.globalAlpha = 1;
      lineFg(c, t, v, E);
    };
    return S;
  }

  /* ===== rain stage: every note is a raindrop that lands on the street on its beat ===== */
  var RAIN = { cols: ['#1f6fff', '#e63946', '#ffd23f', '#2d9a5f', '#9b5de5'], names: ['BLUE', 'RED', 'YELLOW', 'GREEN', 'PURPLE'], band: { low: '#1f6fff', mid: '#5aa0e6', high: '#9fd0ff' } };
  function makeRain() {
    var S = {
      margin: function (v) { return 60 * v.u; },
      cross: function (ev, v) { return v.w * (0.05 + 0.9 * H01(ev.seed + 17)); },
      size: function (ev, v) { return v.u * (ev.band === 'low' ? 15 : ev.band === 'mid' ? 10.5 : 7) * (0.85 + 0.3 * ev.s); },
      box: function (ev, x, y, size, v) { var hw = Math.max(24 * v.u, size * 1.5); return [x - hw, y - size - hw * 1.2, x + hw, y + hw * 0.6]; }
    };
    function sky(v) { return v.look === 'muted' ? ['#e8e8e2', '#dfe1dc', '#d6d9d6'] : ['#d3e0ee', '#c3d3e6', '#b3c6dd']; }
    S.bg = function (c, t, v, E) {
      var u = v.u, g = E.line(v), w = v.w, h = v.h, sk = sky(v), muted = v.look === 'muted';
      var flash = 0; E.between(t - 0.14, t + 0.001).forEach(function (ev) { if (ev.band === 'low' && ev.s > 0.82 && ev.seed % 5 === 0) flash = Math.max(flash, 1 - (t - ev.t) / 0.14); });
      for (var b = 0; b < 3; b++) { c.fillStyle = sk[b]; c.fillRect(0, b * g / 3, w, g / 3 + 1); }
      if (flash > 0) {
        c.fillStyle = 'rgba(255,255,255,' + 0.55 * flash + ')'; c.fillRect(0, 0, w, g);
        var bx = w * (0.2 + 0.6 * H01(Math.floor(t * 3))), by = 70 * u; c.beginPath(); c.moveTo(bx, by);
        for (var z = 1; z < 7; z++) { bx += (H01(z + Math.floor(t * 3) * 9) - 0.5) * 50 * u; by += (g * 0.5) / 7; c.lineTo(bx, by); }
        c.lineWidth = 3 * u; c.strokeStyle = 'rgba(255,214,63,' + flash + ')'; c.stroke();
      }
      var bw = 34 * u;
      for (var j = 0; j * bw < w + bw; j++) {
        var hh = (40 + 110 * H01(j * 13 + 3)) * u, x0 = j * bw, top = g - hh;
        box(c, x0, top, bw * 0.92, hh, v, muted ? '#c8ccc8' : '#aebbcb');
        c.fillStyle = muted ? '#efe3b8' : '#ffe58a';
        for (var wy = top + 8 * u; wy < g - 10 * u; wy += 14 * u) for (var wx = x0 + 6 * u; wx < x0 + bw * 0.92 - 8 * u; wx += 10 * u) if (H01(j * 97 + Math.floor(wy) * 7 + Math.floor(wx)) < 0.3) c.fillRect(wx, wy, 4 * u, 6 * u);
      }
      var cs = 64 * u, coff = (t * 6 * u) % cs;
      for (var k = -1; k * cs < w + cs * 2; k++) {
        var cx = k * cs + coff, idx = k - Math.floor(t * 6 * u / cs), cy = (24 + 26 * H01(idx * 5 + 1)) * u, r = (34 + 18 * H01(idx * 7 + 2)) * u;
        c.beginPath(); c.arc(cx, cy, r, 0, TAU); shape(c, v, muted ? '#bfc4c4' : '#9fb0c3');
        c.beginPath(); c.arc(cx + r * 0.7, cy + r * 0.35, r * 0.7, 0, TAU); shape(c, v, muted ? '#b2b8b8' : '#8ea1b6');
      }
      c.save(); c.globalAlpha = 0.28; c.lineWidth = 1.2 * u; c.strokeStyle = muted ? '#7a8590' : '#5f7da0'; c.beginPath();
      for (var q = 0; q < 70; q++) { var sx = ((H01(q * 3 + 1) * w) + t * 40 * u) % w, sy = ((H01(q * 5 + 2) * g) + t * 900 * u * (0.7 + 0.6 * H01(q))) % g; c.moveTo(sx, sy); c.lineTo(sx - 4 * u, sy + 18 * u); }
      c.stroke(); c.restore();
      box(c, -10, g, w + 20, 14 * u, v, muted ? '#d8d6cf' : '#c4c9cf');
      c.fillStyle = muted ? '#9da3a6' : '#6f7782'; c.fillRect(0, g + 14 * u, w, h - g); c.fillStyle = INK; c.fillRect(0, g + 13 * u, w, 2 * u);
      for (var pdl = 0; pdl < 5; pdl++) { c.beginPath(); c.ellipse(w * (0.1 + 0.2 * pdl + 0.05 * H01(pdl)), g + (30 + 22 * H01(pdl + 9)) * u, (26 + 20 * H01(pdl + 4)) * u, 7 * u, 0, 0, TAU); shape(c, v, muted ? '#c2ccd4' : '#8fb3d9'); }
      for (var pp = 0; pp < 4; pp++) {
        var px = ((H01(pp * 11) * w + t * (22 + pp * 6) * u * (pp % 2 ? 1 : -1)) % (w + 80 * u) + w + 80 * u) % (w + 80 * u) - 40 * u, py = g + 4 * u, uc = col(v, RAIN.cols[pp + 1 < 5 ? pp + 1 : 0]);
        box(c, px - 4 * u, py - 22 * u, 8 * u, 18 * u, v, col(v, PAL.shirt[pp * 3 % PAL.shirt.length]));
        c.beginPath(); c.arc(px, py - 27 * u, 4.5 * u, 0, TAU); shape(c, v, PAL.skin[pp % PAL.skin.length]);
        stick(c, px, py - 30 * u, px, py - 44 * u, v, 1.5 * u);
        c.beginPath(); c.arc(px, py - 44 * u, 17 * u, Math.PI, 0); c.closePath(); shape(c, v, uc);
      }
    };
    function drop(c, x, y, s2, fill, v) {
      var cy = y - s2;
      c.beginPath(); c.moveTo(x, cy - s2 * 1.9);
      c.bezierCurveTo(x + s2 * 0.25, cy - s2 * 1.2, x + s2, cy - s2 * 0.6, x + s2, cy);
      c.arc(x, cy, s2, 0, Math.PI);
      c.bezierCurveTo(x - s2, cy - s2 * 0.6, x - s2 * 0.25, cy - s2 * 1.2, x, cy - s2 * 1.9);
      c.closePath(); shape(c, v, fill);
      c.beginPath(); c.ellipse(x - s2 * 0.35, cy - s2 * 0.15, s2 * 0.18, s2 * 0.36, 0.3, 0, TAU); c.fillStyle = 'rgba(255,255,255,.75)'; c.fill();
    }
    function sprite(c, x, y, size, ev, v, age) {
      if (ev.caught) return;
      var u = v.u, fill = col(v, v.rainGame ? RAIN.cols[ev.rc || 0] : RAIN.band[ev.band]);
      if (age < 0) {
        c.globalAlpha = 0.35; c.lineWidth = Math.max(1, size * 0.25); c.strokeStyle = fill; c.beginPath(); c.moveTo(x, y - size * 3); c.lineTo(x, y - size * 7); c.stroke(); c.globalAlpha = 1;
        drop(c, x, y, size, fill, v); return;
      }
      if (age > 0.5) return;
      var k = age / 0.5, n = ev.band === 'low' ? 8 : ev.band === 'mid' ? 6 : 4, sp = size * (ev.band === 'low' ? 5 : 4);
      c.globalAlpha = 1 - k;
      c.beginPath(); c.ellipse(x, y, size * (1 + k * 3.5), size * (0.3 + k * 0.9), 0, 0, TAU); c.lineWidth = 2 * u; c.strokeStyle = fill; c.stroke();
      for (var i = 0; i < n; i++) {
        var a = -Math.PI * (0.15 + 0.7 * i / (n - 1)), vx = Math.cos(a) * sp, vy = Math.sin(a) * sp * 1.6;
        c.beginPath(); c.arc(x + vx * k * 1.6, y + vy * k * 1.6 + 30 * u * k * k * 2.2, Math.max(1.2 * u, size * 0.28 * (1 - k * 0.5)), 0, TAU); c.fillStyle = fill; c.fill();
      }
      c.globalAlpha = 1;
    }
    S.sprites = { low: sprite, mid: sprite, high: sprite };
    S.layers = ['low', 'mid', 'high'];
    S.fg = lineFg;
    return S;
  }

  function create(o) {
    var $ = function (id) { return document.getElementById(id); };
    var cv = o.canvas, ctx = cv.getContext('2d'), toast = o.toast, store = o.store, fmt = o.fmt;
    var M = {
      view: store.get('cityseek-music-view', 'lanes'), look: store.get('cityseek-music-look', 'bold'), shape: store.get('cityseek-music-shape', 'screen'),
      speed: store.get('cityseek-music-speed', 1), sens: store.get('cityseek-music-sens', 0.5), stream: store.get('cityseek-music-stream', false),
      action: store.get('cityseek-music-action', true), info: store.get('cityseek-music-info', true), weather: store.get('cityseek-music-weather', false), callouts: store.get('cityseek-music-callouts', true), xray: store.get('cityseek-music-xray', false)
    };
    var E = BeatEngine.create(), top = makeTop(M), lanes = makeLanes(), rainSt = makeRain();
    var rain = { jar: 0, fill: 0, need: 8, caught: 0, lost: 0, taps: 0, flying: [], shake: 0 };
    top.E = E;
    var audio = new Audio(); audio.preload = 'auto'; audio.setAttribute('playsinline', '');
    var ac = null, src = null, rec = null, recChunks = [], recording = false;
    var trackA = null, trackName = 'Test beat', trackUrl = null, ready = false, busy = false, active = false;
    var tPrev = 0, lastCt = 0, lastPerf = 0, raf = 0, dirty = true, freeT0 = performance.now(), lastSec = -1;
    var targets = [], hunt = { found: 0, total: 0, taps: 0, away: 0 }, anims = [], worldSeed = -1;

    function view() { var w = cv.width, h = cv.height, m = Math.min(w, h); return { w: w, h: h, u: m / 400, zs: m / 560, look: M.look, rainGame: M.stream && M.view === 'rain', line: M.action, info: M.info, callouts: M.callouts }; }
    function save(k) { store.set('cityseek-music-' + k, M[k]); }
    function segOn(id, attr, val) { Array.prototype.forEach.call(document.querySelectorAll('#' + id + ' button'), function (b) { b.classList.toggle('on', b.dataset[attr] === val); }); }

    function applyEngine() {
      var v = view();
      if (M.view === 'train') { E.config({ axis: 'h', lineFrac: 0.5, speed: 230 * v.u * M.speed }); E.setStage(train); }
      else if (M.view === 'rain') { E.config({ axis: 'v', lineFrac: 0.8, speed: 330 * v.u * M.speed }); E.setStage(rainSt); }
      else if (M.view === 'lanes') { E.config({ axis: 'v', lineFrac: 0.78, speed: 300 * v.u * M.speed }); E.setStage(lanes); }
      else { E.config({ axis: 'v', lineFrac: 0.5, speed: 260 * v.u * M.speed }); E.setStage(top); }
      kick();
    }
    function sizeCanvas() {
      var aw = innerWidth, ah = innerHeight - 52, dpr = Math.min(2, devicePixelRatio || 1), W, H;
      if (M.shape === 'tall') { W = 1080; H = 1920; } else if (M.shape === 'wide') { W = 1920; H = 1080; }
      else { W = Math.round(aw * dpr); H = Math.round(ah * dpr); var mx = Math.max(W, H); if (mx > 1920) { W = Math.round(W * 1920 / mx); H = Math.round(H * 1920 / mx); } }
      if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; top.clear(); }
      var sc = Math.min(aw / W, ah / H), cw = W * sc, ch = H * sc;
      cv.style.width = cw + 'px'; cv.style.height = ch + 'px'; cv.style.left = ((aw - cw) / 2) + 'px'; cv.style.top = (52 + (ah - ch) / 2) + 'px';
      applyEngine();
    }

    function clock() {
      var now = performance.now();
      if (!ready) return (now - freeT0) / 1000;
      var ct = audio.currentTime;
      if (audio.paused) { lastCt = ct; lastPerf = now; tPrev = ct; return ct; }
      if (ct !== lastCt) { lastCt = ct; lastPerf = now; }
      var est = lastCt + Math.min(0.25, (now - lastPerf) / 1000);
      if (est < tPrev && tPrev - est < 0.12) est = tPrev;
      tPrev = est; return est;
    }

    function tCenter(ev, x, y, size, v) {
      if (M.view !== 'train') return { x: x, y: y };
      var u = v.u; return { x: x, y: ev.band === 'low' ? y - size - 42 * u : ev.band === 'mid' ? y - size - 30 * u : y - size * 1.4 - 34 * u };
    }
    function drawTarget(c, x, y, size, ev, v, age) {
      var def = TDEF[ev.targetId]; if (!def) return;
      if (M.view === 'train') E.stage.sprites[ev.band](c, x, y, size, ev, v, age);
      var p = tCenter(ev, x, y, size, v), sc = M.view === 'top' ? v.zs * 1.15 : M.view === 'lanes' ? v.u * 1.7 : 30 * v.u / (def.r * 2);
      c.save(); c.translate(p.x, p.y + (M.view === 'train' ? Math.sin(age * 5) * 4 * v.u : 0)); c.scale(sc, sc);
      if (M.view === 'top') c.rotate(H01(ev.seed + 9) * TAU);
      SP[def.kind](c, def.o); c.restore();
    }
    var hooks = {
      spriteFor: function (ev) { return M.view !== 'rain' && M.stream && ev.tag === 'target' && !ev.found ? drawTarget : null; },
      boxFor: function (ev, x, y, size, v) { if (M.view === 'rain' || !(M.stream && ev.tag === 'target' && !ev.found)) return null; var p = tCenter(ev, x, y, size, v), r = 34 * v.u; return [p.x - r, p.y - r, p.x + r, p.y + r]; },
      rank: function (ev) { if (M.view === 'rain') return !ev.caught && ev.rc === rainTarget() ? 1e6 : ev.caught ? -1e6 : 0; return M.stream && ev.tag === 'target' && !ev.found ? 1e6 : 0; }
    };

    function pickTargets() {
      var ev = E.events, dur = trackA ? trackA.duration : 60;
      ev.forEach(function (e) { e.tag = null; e.found = false; e.away = false; });
      var want = Math.max(3, Math.min(14, Math.round(dur / 9))), slot = (dur - 6) / want, ids = TARGET_IDS.filter(function (id) { return TDEF[id]; });
      targets = [];
      for (var k = 0; k < want; k++) {
        var a = 3 + k * slot, b = a + slot, best = null;
        for (var i = 0; i < ev.length; i++) { var e = ev[i]; if (e.t >= a && e.t < b && e.s >= 0.4 && (!best || e.s > best.s)) best = e; }
        if (best) { best.tag = 'target'; best.targetId = ids[k % ids.length]; targets.push(best); }
      }
      resetHunt();
    }
    function rainTarget() { return rain.jar % RAIN.cols.length; }
    function resetRain() { E.events.forEach(function (e) { e.caught = false; e.lostC = false; }); rain = { jar: 0, fill: 0, need: 8, caught: 0, lost: 0, taps: 0, flying: [], shake: 0 }; }
    function resetHunt() { resetRain(); targets.forEach(function (e) { e.found = false; e.away = false; }); hunt = { found: 0, total: targets.length, taps: 0, away: 0 }; anims = []; kick(); }
    function redetect() {
      if (!trackA) return;
      var ev = A.detect(trackA, M.sens), n = { low: 0, mid: 0, high: 0 };
      ['low', 'mid', 'high'].forEach(function (b) {
        var ss = ev.filter(function (e) { return e.band === b; }).map(function (e) { return e.s; }).sort(function (x, y) { return x - y; }), med = ss.length ? ss[Math.floor(ss.length / 2)] : 0;
        ev.forEach(function (e) { if (e.band === b) e.lane = e.s > med ? 0 : 1; });
      });
      ev.forEach(function (e) { e.rc = e.seed % RAIN.cols.length; });
      E.setTimeline(ev); ev.forEach(function (e) { n[e.band]++; });
      $('beatInfo').textContent = 'Hits found. Low: ' + n.low + ', mid: ' + n.mid + ', high: ' + n.high + '. Length ' + fmt(trackA.duration) + '.';
      pickTargets();
    }

    function setSrc(url) { audio.pause(); if (trackUrl) URL.revokeObjectURL(trackUrl); trackUrl = url; audio.src = url; audio.load(); ready = true; tPrev = 0; lastCt = 0; }
    function finish() { busy = false; redetect(); $('trkName').textContent = trackName; toast('Ready. Tap PLAY'); setButtons(); kick(); }
    function fail(msg) { busy = false; toast(msg); setButtons(); }
    function useTestBeat() {
      if (busy) return; busy = true; toast('Building the test beat', true);
      setTimeout(function () {
        try {
          var buf = A.testBeat();
          A.bands(buf, function (p) { toast('Finding beats ' + Math.round(p * 100) + '%', true); }).then(function (res) {
            trackA = res; setSrc(URL.createObjectURL(A.wav(buf))); trackName = 'Test beat'; finish();
          }).catch(function () { fail('Could not build the test beat'); });
        } catch (e) { fail('Could not build the test beat'); }
      }, 30);
    }
    function loadFile(file) {
      if (!file || busy) return;
      if (recording) stopRec();
      busy = true; toast('Reading the song', true);
      file.arrayBuffer().then(function (ab) { toast('Decoding the song', true); return A.decode(ab); })
        .then(function (buf) { return A.bands(buf, function (p) { toast('Finding beats ' + Math.round(p * 100) + '%', true); }); })
        .then(function (res) { trackA = res; setSrc(URL.createObjectURL(file)); trackName = file.name.replace(/\.[^.]+$/, ''); finish(); })
        .catch(function () { fail('Could not read that file'); });
    }

    function graph() {
      if (!ac) { var C = G.AudioContext || G.webkitAudioContext; if (!C) return; ac = new C(); src = ac.createMediaElementSource(audio); src.connect(ac.destination); }
      if (ac.state === 'suspended') ac.resume();
    }
    function play() {
      if (!ready || busy) return;
      graph();
      if (audio.ended || (audio.duration && audio.currentTime >= audio.duration - 0.05)) { audio.currentTime = 0; tPrev = 0; resetHunt(); }
      var p = audio.play(); if (p && p.catch) p.catch(function () { toast('Tap PLAY again'); });
      kick();
    }
    function pause() { audio.pause(); kick(); }
    function restart() { var was = !audio.paused; audio.currentTime = 0; tPrev = 0; lastCt = 0; resetHunt(); if (!was) kick(); }

    function mime() {
      var list = ['video/mp4;codecs="avc1.42E01E,mp4a.40.2"', 'video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
      for (var i = 0; i < list.length; i++) if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(list[i])) return list[i];
      return '';
    }
    function startRec() {
      if (!ready || busy) return;
      if (!G.MediaRecorder || !cv.captureStream) { toast('This browser cannot record video'); return; }
      graph(); if (!ac) { toast('Audio is not available'); return; }
      var dest = ac.createMediaStreamDestination(); src.connect(dest);
      var vs = cv.captureStream(30), ms = new MediaStream(vs.getVideoTracks().concat(dest.stream.getAudioTracks())), mt = mime();
      var opt = { videoBitsPerSecond: M.shape === 'screen' ? 8000000 : 12000000, audioBitsPerSecond: 192000 }; if (mt) opt.mimeType = mt;
      try { rec = new MediaRecorder(ms, opt); } catch (e) { try { rec = new MediaRecorder(ms); } catch (e2) { try { src.disconnect(dest); } catch (e3) { } toast('Recording could not start'); return; } }
      recChunks = [];
      rec.ondataavailable = function (e) { if (e.data && e.data.size) recChunks.push(e.data); };
      rec.onstop = function () {
        try { src.disconnect(dest); } catch (e) { }
        vs.getTracks().forEach(function (t) { t.stop(); });
        var type = rec.mimeType || mt || 'video/webm', ext = type.indexOf('mp4') >= 0 ? 'mp4' : 'webm', blob = new Blob(recChunks, { type: type.split(';')[0] });
        var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'city-seek-v3-video-' + Date.now() + '.' + ext;
        document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 8000);
        recording = false; setButtons(); toast('Video saved');
      };
      audio.pause(); audio.currentTime = 0; tPrev = 0; lastCt = 0; resetHunt(); draw(0);
      rec.start(1000); recording = true; setButtons();
      var p = audio.play(); if (p && p.catch) p.catch(function () { stopRec(); toast('Tap REC again'); });
    }
    function stopRec() { if (rec && rec.state !== 'inactive') { audio.pause(); rec.stop(); } }

    function setButtons() {
      $('playBtn').textContent = audio.paused ? 'PLAY' : 'PAUSE';
      $('recBtn').classList.toggle('on', recording); $('recBtn').textContent = recording ? 'STOP' : 'REC';
    }
    audio.addEventListener('play', setButtons);
    audio.addEventListener('pause', setButtons);
    audio.addEventListener('ended', function () {
      setButtons(); if (recording) stopRec();
      if (M.stream && active && M.view === 'rain') {
        var tot = rain.caught + rain.lost, rr2 = tot ? rain.caught / tot : 0, st2 = rr2 >= 0.8 ? 3 : rr2 >= 0.5 ? 2 : 1;
        $('seStars').textContent = '\u2605'.repeat(st2) + '\u2606'.repeat(3 - st2);
        $('seFound').textContent = rain.caught + ' drops, ' + rain.jar + ' jars'; $('seAway').textContent = rain.lost; $('seTaps').textContent = rain.taps;
        $('songEnd').classList.add('on');
      } else if (M.stream && hunt.total && active) {
        var r = hunt.found / hunt.total, stars = r >= 0.9 ? 3 : r >= 0.5 ? 2 : 1;
        $('seStars').textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
        $('seFound').textContent = hunt.found + ' of ' + hunt.total; $('seAway').textContent = hunt.total - hunt.found; $('seTaps').textContent = hunt.taps;
        $('songEnd').classList.add('on');
      }
      kick();
    });

    var INFO = {
      lanes: { titles: ['MORNING COMMUTE', 'RUSH HOUR', 'CROSSTOWN TRAFFIC', 'LUNCH BREAK', 'EVENING RUSH', 'NIGHT SHIFT'], sub: 'how the street keeps time', key: ['Bus and truck', 'Car', 'Pedestrian'] },
      top: { titles: ['DISTRICT MAP', 'MARKET SQUARE', 'PARK AND RIDE', 'CITY CENTRE', 'HARBOUR ROAD', 'OLD TOWN'], sub: 'seen from above, on the beat', key: ['Tree or umbrella', 'Car', 'Pedestrian'] },
      train: { titles: ['CITY CENTRE LINE', 'INDUSTRIAL BELT', 'OUTER SUBURBS'], sub: 'what passes the window', key: ['Building', 'Pole or pylon', 'Trackside sign'] },
      rain: { titles: ['LIGHT DRIZZLE', 'DOWNPOUR', 'PASSING SHOWER', 'STORM FRONT', 'CLOUDBURST', 'AFTER THE RAIN'], sub: 'every note is a drop', key: ['Big drop', 'Drop', 'Drizzle'] },
      notes: [
        'Every kick sends one heavy vehicle across the line. The weight of the rhythm keeps the whole street moving.',
        'Hats arrive in long queues. Each one that crosses the line opens up for a single beat, then walks on.',
        'Snares and bass notes hold the middle lanes and set the pace for everything around them.',
        'When the music breaks down, the street goes quiet with it. Nothing moves unless the song tells it to.',
        'Each object is placed exactly where its note lives, so the picture is the song drawn out in space.'
      ]
    };
    function wrap(c, txt, maxW) { var words = txt.split(' '), lines = [], cur = ''; words.forEach(function (w) { var tst = cur ? cur + ' ' + w : w; if (c.measureText(tst).width > maxW && cur) { lines.push(cur); cur = w; } else cur = tst; }); if (cur) lines.push(cur); return lines; }
    function drawInfo(c, t, v) {
      if (!M.info || !E.events.length) return;
      var u = v.u, muted = v.look === 'muted', I = INFO[M.view] || INFO.top, sec = Math.max(0, Math.floor(t / (M.view === 'train' ? 24 : 16))), into = t - sec * (M.view === 'train' ? 24 : 16);
      var banner = muted ? '#e2433a' : '#1f6fff', inkc = ink(v), font = '"Trebuchet MS",Arial,sans-serif';
      c.save();
      var title = M.view === 'train' ? I.titles[stageIx(t)] : I.titles[sec % I.titles.length], slide = Math.min(1, into / 0.45), ease = 1 - Math.pow(1 - slide, 3);
      c.font = '900 ' + (19 * u) + 'px ' + font; var tw = c.measureText(title).width, bw = Math.min(v.w - 110 * u, tw + 150 * u), bx = 14 * u - (1 - ease) * (bw + 30 * u), by = 16 * u;
      c.globalAlpha = muted ? 0.92 : 1; c.fillStyle = banner; c.fillRect(bx, by, bw, 34 * u);
      c.fillStyle = '#ffffff'; c.textBaseline = 'middle'; c.fillText(title, bx + 12 * u, by + 17 * u);
      c.font = '700 ' + (9 * u) + 'px ' + font; if (tw + 24 * u + c.measureText(I.sub).width < bw) c.fillText(I.sub, bx + tw + 24 * u, by + 21 * u);
      c.globalAlpha = 1;
      var counts = [0, 0, 0], total = 0, bands = ['low', 'mid', 'high'];
      for (var i = 0; i < E.events.length && E.events[i].t <= t; i++) { counts[bands.indexOf(E.events[i].band)]++; total++; }
      var kx = 14 * u, ky = v.h - 132 * u;
      c.fillStyle = muted ? 'rgba(243,239,230,.8)' : 'rgba(255,255,255,.8)'; c.fillRect(kx - 6 * u, ky - 20 * u, 160 * u, 122 * u);
      c.lineWidth = 1.2 * u; c.strokeStyle = inkc; c.strokeRect(kx - 6 * u, ky - 20 * u, 160 * u, 122 * u);
      c.fillStyle = inkc; c.font = '900 ' + (13 * u) + 'px Georgia,serif'; c.fillText('KEY TO', kx, ky - 6 * u);
      c.font = '700 ' + (10 * u) + 'px ' + font;
      I.key.forEach(function (name, k) {
        var ry = ky + 12 * u + k * 16 * u, lw2 = c.measureText(name).width;
        c.fillStyle = inkc; c.fillText(name, kx, ry);
        c.fillRect(kx + lw2 + 6 * u, ry - 6 * u, 12 * u, 12 * u); c.fillStyle = '#ffffff'; c.font = '900 ' + (8 * u) + 'px ' + font; c.fillText(String(k + 1), kx + lw2 + 9 * u, ry + 0.5 * u);
        c.font = '700 ' + (10 * u) + 'px ' + font; c.fillStyle = BANDCOL[muted ? 'muted' : 'bold'][bands[k]]; c.fillText(String(counts[k]), kx + 122 * u, ry);
      });
      c.fillStyle = muted ? '#e2433a' : '#e63946'; c.font = '900 ' + (26 * u) + 'px ' + font; c.fillText(String(total), kx, ky + 80 * u);
      var near = E.between(t - 1.2, t + 1.6);
      near.forEach(function (ev) {
        if (ev.s < 0.55 || ev.seed % 4 !== 1) return;
        var a = t - ev.t, p = E.posOf(ev, t, v), size = E.stage.size(ev, v), k2 = Math.min(1, (a + 1.6) / 0.25), sc = k2 < 1 ? backOut(k2) : 1;
        var mx = p.x + size * 0.7 + 10 * u, my = M.view === 'train' ? p.y - size * 0.8 : p.y - size * 0.7;
        c.save(); c.translate(mx, my); c.scale(sc, sc); c.beginPath(); c.arc(0, 0, 9 * u, 0, TAU); c.fillStyle = inkc; c.fill(); c.lineWidth = 1.5 * u; c.strokeStyle = '#ffffff'; c.stroke();
        c.fillStyle = '#ffffff'; c.font = '900 ' + (10 * u) + 'px ' + font; c.textAlign = 'center'; c.fillText(String(bands.indexOf(ev.band) + 1), 0, 0.5 * u); c.restore();
      });
      if (into > 3 && into < 10 && !(M.view === 'rain' && M.stream)) {
        var note = INFO.notes[sec % INFO.notes.length], pw = Math.min(170 * u, v.w * 0.45), al = Math.min(1, (into - 3) / 0.4, (10 - into) / 0.4);
        c.font = '700 ' + (10 * u) + 'px ' + font; var lines = wrap(c, note, pw - 20 * u), ph = lines.length * 14 * u + 20 * u, px = 14 * u, py = 62 * u;
        c.globalAlpha = al * 0.9; c.fillStyle = muted ? '#e8e2d0' : '#ffffff'; c.fillRect(px, py, pw, ph); c.globalAlpha = al; c.lineWidth = 1.2 * u; c.strokeStyle = inkc; c.strokeRect(px, py, pw, ph);
        c.fillStyle = inkc; c.textBaseline = 'top'; lines.forEach(function (ln, k) { c.fillText(ln, px + 10 * u, py + 10 * u + k * 14 * u); });
      }
      var lineP = E.line(v), recent = E.between(t - 0.25, t + 0.001), pulse = [0, 0, 0];
      recent.forEach(function (ev) { var bi = bands.indexOf(ev.band); pulse[bi] = Math.max(pulse[bi], 1 - (t - ev.t) / 0.25); });
      [[0, '#ffb703'], [2, '#e63946']].forEach(function (q, k) {
        var sc2 = 1 + 0.25 * pulse[q[0]], ax, ay, ang;
        if (E.axis === 'v') { ax = v.w - (120 - k * 50) * u; ay = lineP - 70 * u; ang = Math.PI / 2; } else { ax = lineP + (60 + k * 50) * u; ay = v.h * 0.5 + k * 30 * u; ang = Math.PI; }
        c.save(); c.globalAlpha = 0.9; c.translate(ax, ay); c.rotate(ang); c.scale(sc2, sc2);
        c.beginPath(); c.moveTo(-16 * u, -6 * u); c.lineTo(4 * u, -6 * u); c.lineTo(4 * u, -12 * u); c.lineTo(18 * u, 0); c.lineTo(4 * u, 12 * u); c.lineTo(4 * u, 6 * u); c.lineTo(-16 * u, 6 * u); c.closePath(); c.fillStyle = col(v, q[1]); c.fill();
        c.rotate(-ang); c.beginPath(); c.arc(-22 * u, -18 * u, 9 * u, 0, TAU); c.fillStyle = inkc; c.fill(); c.fillStyle = '#ffffff'; c.font = '900 ' + (10 * u) + 'px ' + font; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(k + 1), -22 * u, -17.5 * u);
        c.restore();
      });
      c.restore();
    }
    function draw(t) {
      var v = view();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      E.render(ctx, t, v, hooks);
      rainOver(ctx, t, v);
      drawInfo(ctx, t, v);
      if (M.stream && M.view === 'rain') { drawJar(ctx, t, v); return; }
      if (!M.stream) { anims = []; return; }
      var now = performance.now();
      targets.forEach(function (ev) {
        var p = E.posOf(ev, t, v), size = E.stage.size(ev, v), m = 80 * v.u;
        if (!ev.found && !ev.away && (E.axis === 'v' ? p.y > v.h + m : p.x < -m)) { ev.away = true; hunt.away++; }
        if (!ev.found || p.x < -m || p.x > v.w + m || p.y < -m || p.y > v.h + m) return;
        var c = tCenter(ev, p.x, p.y, size, v);
        ctx.beginPath(); ctx.arc(c.x, c.y, 26 * v.u, 0, TAU); ctx.lineWidth = 4 * v.u; ctx.strokeStyle = '#1f6fff'; ctx.stroke();
      });
      anims = anims.filter(function (a) { return now - a.t0 < 600; });
      anims.forEach(function (a) {
        var k = (now - a.t0) / 600;
        ctx.beginPath(); ctx.arc(a.x, a.y, (8 + k * 22) * v.u, 0, TAU); ctx.lineWidth = 3 * v.u; ctx.strokeStyle = 'rgba(230,57,70,' + (1 - k) + ')'; ctx.stroke();
      });
    }
    function jarShape(c, x, y, w, h, u) {
      c.beginPath(); c.moveTo(x + w * 0.2, y); c.lineTo(x + w * 0.8, y); c.lineTo(x + w * 0.8, y + h * 0.1);
      c.quadraticCurveTo(x + w, y + h * 0.16, x + w, y + h * 0.3); c.lineTo(x + w, y + h - 6 * u); c.quadraticCurveTo(x + w, y + h, x + w - 6 * u, y + h);
      c.lineTo(x + 6 * u, y + h); c.quadraticCurveTo(x, y + h, x, y + h - 6 * u); c.lineTo(x, y + h * 0.3); c.quadraticCurveTo(x, y + h * 0.16, x + w * 0.2, y + h * 0.1); c.closePath();
    }
    function jarAt(v) { return { x: 14 * v.u, y: (M.info ? 62 : 16) * v.u, w: 58 * v.u, h: 76 * v.u }; }
    function drawJar(c, t, v) {
      var u = v.u, now = performance.now(), J = jarAt(v), tc = col(v, RAIN.cols[rainTarget()]), inkc = ink(v);
      E.between(t - 0.6, t + 0.001).forEach(function (ev) { if (!ev.caught && !ev.lostC && ev.rc === rainTarget()) { ev.lostC = true; rain.lost++; } });
      var sh = rain.shake > now ? Math.sin(now / 25) * 4 * u : 0;
      c.save(); c.translate(sh, 0);
      c.fillStyle = 'rgba(255,255,255,.55)'; jarShape(c, J.x, J.y, J.w, J.h, u); c.fill();
      c.save(); jarShape(c, J.x, J.y, J.w, J.h, u); c.clip();
      var lvl = J.h * 0.86 * rain.fill / rain.need, wob = Math.sin(now / 160) * 2 * u;
      c.beginPath(); c.moveTo(J.x, J.y + J.h - lvl + wob); c.quadraticCurveTo(J.x + J.w / 2, J.y + J.h - lvl - wob * 2, J.x + J.w, J.y + J.h - lvl + wob); c.lineTo(J.x + J.w, J.y + J.h); c.lineTo(J.x, J.y + J.h); c.closePath(); c.fillStyle = tc; c.fill();
      c.fillStyle = 'rgba(255,255,255,.5)'; c.fillRect(J.x + J.w * 0.14, J.y + J.h * 0.3, 4 * u, J.h * 0.55);
      c.restore();
      jarShape(c, J.x, J.y, J.w, J.h, u); c.lineWidth = 2.2 * u; c.strokeStyle = inkc; c.stroke();
      c.fillStyle = inkc; c.fillRect(J.x + J.w * 0.16, J.y - 7 * u, J.w * 0.68, 8 * u);
      c.font = '900 ' + (12 * u) + 'px "Trebuchet MS",sans-serif'; c.textBaseline = 'top'; c.textAlign = 'left';
      c.fillStyle = inkc; c.fillText('CATCH', J.x + J.w + 10 * u, J.y + 4 * u);
      c.fillStyle = tc; c.font = '900 ' + (20 * u) + 'px "Trebuchet MS",sans-serif'; c.fillText(RAIN.names[rainTarget()], J.x + J.w + 10 * u, J.y + 19 * u);
      c.fillStyle = inkc; c.font = '700 ' + (11 * u) + 'px "Trebuchet MS",sans-serif'; c.fillText(rain.fill + ' of ' + rain.need + ' drops', J.x + J.w + 10 * u, J.y + 44 * u);
      for (var k = 0; k < rain.jar && k < 10; k++) {
        var mx = J.x + J.w + 10 * u + k * 17 * u, my = J.y + 60 * u, mw = 13 * u, mh = 17 * u;
        jarShape(c, mx, my, mw, mh, u * 0.3); c.fillStyle = col(v, RAIN.cols[k % RAIN.cols.length]); c.fill(); c.lineWidth = 1.2 * u; c.strokeStyle = inkc; c.stroke();
      }
      c.restore();
      rain.flying = rain.flying.filter(function (f) { return now - f.t0 < 450; });
      rain.flying.forEach(function (f) {
        var k = (now - f.t0) / 450, e = 1 - Math.pow(1 - k, 2), x = f.x + (J.x + J.w / 2 - f.x) * e, y = f.y + (J.y + J.h * 0.5 - f.y) * e - Math.sin(k * Math.PI) * 60 * u;
        c.beginPath(); c.arc(x, y, (9 - k * 4) * u, 0, TAU); shape(c, v, f.c);
      });
      anims = anims.filter(function (a) { return now - a.t0 < 600; });
      anims.forEach(function (a) {
        var k = (now - a.t0) / 600, q = 7 * u; c.lineWidth = 3 * u; c.strokeStyle = 'rgba(230,57,70,' + (1 - k) + ')';
        c.beginPath(); c.moveTo(a.x - q, a.y - q); c.lineTo(a.x + q, a.y + q); c.moveTo(a.x + q, a.y - q); c.lineTo(a.x - q, a.y + q); c.stroke();
      });
    }
    function rainTap(x, y, t, v) {
      var ev = E.hitTest(x, y, t, v, hooks), now = performance.now();
      if (ev && !ev.caught && t < ev.t && ev.rc === rainTarget()) {
        ev.caught = true; rain.caught++; rain.fill++; SFX.play('bloop');
        var p = E.posOf(ev, t, v); rain.flying.push({ x: p.x, y: p.y - E.stage.size(ev, v), t0: now, c: col(v, RAIN.cols[ev.rc]) });
        if (rain.fill >= rain.need) { rain.jar++; rain.fill = 0; rain.need = Math.min(16, rain.need + 2); SFX.play('chime'); toast('JAR FULL. NOW CATCH ' + RAIN.names[rainTarget()]); }
      } else { rain.taps++; rain.shake = now + 300; anims.push({ x: x, y: y, t0: now }); SFX.play('miss'); if (ev && !ev.caught && t < ev.t) toast('That one is ' + RAIN.names[ev.rc].toLowerCase() + '. Catch ' + RAIN.names[rainTarget()].toLowerCase()); }
      kick();
    }
    function rainOver(c, t, v) {
      if (!M.weather || M.view === 'rain') return;
      var u = v.u; c.save(); c.fillStyle = 'rgba(90,110,140,.1)'; c.fillRect(0, 0, v.w, v.h);
      c.globalAlpha = 0.45; c.lineWidth = 1.4 * u; c.strokeStyle = '#5f7da0'; c.beginPath();
      for (var q = 0; q < 90; q++) { var sx = ((H01(q * 3 + 1) * v.w) + t * 40 * u) % v.w, sy = ((H01(q * 5 + 2) * v.h) + t * 1000 * u * (0.7 + 0.6 * H01(q))) % v.h; c.moveTo(sx, sy); c.lineTo(sx - 4 * u, sy + 20 * u); }
      c.stroke(); c.globalAlpha = 1;
      E.between(t - 0.4, t + 0.001).forEach(function (ev) {
        if (ev.band !== 'high') return;
        var k = (t - ev.t) / 0.4, p = E.posOf(ev, t, v); c.globalAlpha = 1 - k;
        c.beginPath(); c.ellipse(p.x, p.y, (6 + 26 * k) * u, (2 + 8 * k) * u, 0, 0, TAU); c.lineWidth = 2 * u; c.strokeStyle = '#5aa0e6'; c.stroke();
      });
      c.restore();
    }
    function hud(t) {
      var sec = Math.floor(t);
      if (sec !== lastSec) { lastSec = sec; $('time').textContent = fmt(t); }
      $('count').textContent = M.stream ? (M.view === 'rain' ? rain.jar + ' JAR' : hunt.found + '/' + hunt.total) : (recording ? 'REC' : 'LIVE');
    }
    function loop() {
      raf = 0; if (!active) return;
      raf = requestAnimationFrame(loop);
      if (ready && audio.paused && !dirty && !anims.length && !rain.flying.length) return;
      dirty = false; var t = clock(); draw(t); hud(t);
    }
    function kick() { dirty = true; if (active && !raf) raf = requestAnimationFrame(loop); }

    cv.addEventListener('pointerdown', function (e) {
      if (busy) return;
      var r = cv.getBoundingClientRect(), x = (e.clientX - r.left) * cv.width / r.width, y = (e.clientY - r.top) * cv.height / r.height;
      if (audio.paused) { if (!recording) play(); return; }
      if (!M.stream) return;
      var t = clock(), v = view();
      if (M.view === 'rain') { rainTap(x, y, t, v); return; }
      var ev = E.hitTest(x, y, t, v, hooks);
      if (ev && ev.tag === 'target' && !ev.found) { ev.found = true; hunt.found++; SFX.play('found'); toast('FOUND: ' + TDEF[ev.targetId].label.toUpperCase()); }
      else { hunt.taps++; anims.push({ x: x, y: y, t0: performance.now() }); SFX.play('miss'); }
      kick();
    });

    /* menu wiring */
    function seg(id, attr, key, after) {
      Array.prototype.forEach.call(document.querySelectorAll('#' + id + ' button'), function (b) {
        b.addEventListener('click', function () { M[key] = b.dataset[attr]; save(key); segOn(id, attr, M[key]); after(); });
      });
      segOn(id, attr, M[key]);
    }
    seg('viewSeg', 'v', 'view', function () { applyEngine(); resetHunt(); });
    seg('lookSeg', 'l', 'look', function () { top.clear(); kick(); });
    seg('shapeSeg', 's', 'shape', function () { if (recording) stopRec(); sizeCanvas(); });
    $('spdIn').value = M.speed; $('spdIn').addEventListener('input', function (e) { M.speed = +e.target.value; save('speed'); applyEngine(); });
    $('sensIn').value = M.sens; $('sensIn').addEventListener('change', function (e) { M.sens = +e.target.value; save('sens'); redetect(); });
    function tog(id, key, after) { $(id).checked = !!M[key]; $(id).addEventListener('change', function (e) { M[key] = e.target.checked; save(key); if (after) after(); kick(); }); }
    tog('optStream', 'stream', resetHunt); tog('optLine', 'action'); tog('optInfo', 'info'); tog('optRain', 'weather'); tog('optCall', 'callouts'); tog('optXray', 'xray', function () { top.clear(); });
    $('songIn').addEventListener('change', function (e) { loadFile(e.target.files && e.target.files[0]); e.target.value = ''; });
    $('testBeat').addEventListener('click', useTestBeat);
    $('playBtn').addEventListener('click', function () { if (recording) return; audio.paused ? play() : pause(); });
    $('recBtn').addEventListener('click', function () { recording ? stopRec() : startRec(); });
    $('rstBtn').addEventListener('click', function () { if (!recording) restart(); });
    $('seAgain').addEventListener('click', function () { $('songEnd').classList.remove('on'); restart(); play(); });
    $('seClose').addEventListener('click', function () { $('songEnd').classList.remove('on'); });
    window.addEventListener('resize', function () { if (active) sizeCanvas(); });

    return {
      enter: function (seed) {
        active = true; sizeCanvas();
        if (seed !== worldSeed || !top.hasWorld()) {
          worldSeed = seed;
          try { top.setWorld(build(seed, 'normal')); } catch (e) { top.setWorld(null); }
        }
        if (!trackA && !busy) useTestBeat();
        setButtons(); lastSec = -1; kick();
      },
      leave: function () { if (recording) stopRec(); audio.pause(); active = false; $('songEnd').classList.remove('on'); },
      isActive: function () { return active; }
    };
  }

  G.CitySeekMusic = { create: create, version: 'v1' };
})(window);
