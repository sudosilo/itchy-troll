/* City Seek v3. Shared scripts load in order: art, world, engine. */
'use strict';
  var INK = '#1a1a2e', TAU = Math.PI * 2;
  var ROOF_S = 1.5, SAND_S = 1.5;

  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function rng(seed) {
    var R = mulberry(seed);
    var h = { R: R };
    h.rnd = function (a, b) { return a + R() * (b - a); };
    h.ri = function (a, b) { return Math.floor(h.rnd(a, b + 1)); };
    h.pick = function (a) { return a[Math.floor(R() * a.length)]; };
    h.chance = function (p) { return R() < p; };
    return h;
  }
  function circ(c, x, y, r) { c.beginPath(); c.arc(x, y, r, 0, TAU); }
  function fs(c, fill, lw) { if (fill) { c.fillStyle = fill; c.fill(); } if (lw) { c.lineWidth = lw; c.strokeStyle = INK; c.stroke(); } }
  function rr(c, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function line(c, x0, y0, x1, y1, lw, col) { c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.lineWidth = lw; c.strokeStyle = col || INK; c.stroke(); }

  var PAL = {
    shirt: ['#e63946', '#f4a261', '#2a9d8f', '#264653', '#e9c46a', '#8ecae6', '#ffb4a2', '#6d597a', '#b5838d', '#90be6d', '#577590', '#f28482', '#ffffff', '#3d405b', '#81b29a', '#f2cc8f', '#cdb4db', '#a2d2ff', '#ffafcc', '#bde0fe', '#ffd23f', '#1f6fff'],
    hair: ['#2b1d14', '#4a3426', '#7a5230', '#c9a66b', '#1b1b1b', '#9e9e9e', '#d97b3f', '#e8d3a3'],
    skin: ['#f6d2b8', '#e8b48f', '#c98e64', '#a26a43', '#7a4b2a', '#5a3820'],
    cap: ['#e63946', '#1b1b1b', '#ffffff', '#1f6fff', '#2d9a5f', '#f4a261'],
    sun: ['#f2cc8f', '#ffffff', '#ffafcc', '#e9c46a'],
    pack: ['#1b1b1b', '#7d7d7d', '#e63946', '#ffd23f', '#2a9d8f', '#6d597a'],
    balloon: ['#1f6fff', '#ffd23f', '#2d9a5f', '#ff8fd1', '#9b5de5', '#f4a261', '#ffffff'],
    car: ['#e63946', '#1f6fff', '#ffffff', '#2b2d42', '#8d99ae', '#f4a261', '#2a9d8f', '#6d597a', '#c0c0c0', '#90be6d'],
    roof: ['#f2c6a0', '#d7e3f4', '#f4e3a1', '#e8b4b8', '#c9d6c2', '#cfc6e8', '#f0d9c4', '#bcd4f6', '#e9e2d0', '#dfe7ec', '#f6cfa8'],
    stall: ['#e63946', '#1f6fff', '#2d9a5f', '#f4a261', '#9b5de5'],
    tree: ['#4f9d5a', '#5aa865', '#3f8a4c', '#6bb56e', '#478f52'],
    umb: ['#1f6fff', '#e63946', '#2b2d42', '#ffd23f', '#2d9a5f', '#9b5de5'],
    flower: ['#ff6b8a', '#ffd23f', '#ffffff', '#9b5de5', '#ff9f43', '#1f6fff'],
    toy: ['#e63946', '#ffd23f', '#2d9a5f', '#ff8fd1', '#9b5de5', '#f4a261', '#2a9d8f'],
    couch: ['#577590', '#b5838d', '#81b29a', '#e9c46a', '#6d597a', '#8d99ae', '#f28482'],
    rug: ['#f4a261', '#cdb4db', '#a2d2ff', '#e9c46a', '#ffafcc', '#90be6d', '#d8e2dc'],
    blanket: ['#8ecae6', '#f28482', '#90be6d', '#cdb4db', '#e9c46a', '#f4a261'],
    wood: ['#e7d3b3', '#dcc3a0', '#ead9bf'],
    carpet: ['#d8dee8', '#e3dccf', '#d9e4d4', '#e6d8e2'],
    tile: ['#eef1f4', '#f3efe6', '#e6eef0']
  };

  var SP = {

    person: function (c, o) {
      if (o.pack) { rr(c, -5.2, 1.2, 10.4, 6.4, 2); fs(c, o.pack, 0.9); }
      c.beginPath(); c.ellipse(0, 0, 7.6, 4.6, 0, 0, TAU); fs(c, o.shirt, 1);
      if (o.vest) { line(c, -5.6, -2.4, -5.6, 2.4, 1.2, '#f4f4f4'); line(c, 5.6, -2.4, 5.6, 2.4, 1.2, '#f4f4f4'); }
      if (o.skin) { circ(c, -7.4, 1.4, 1.7); fs(c, o.skin, 0.6); circ(c, 7.4, 1.4, 1.7); fs(c, o.skin, 0.6); }
      if (o.sun) { circ(c, 0, -0.8, 6.2); fs(c, o.sun, 0.8); circ(c, 0, -0.8, 3.6); fs(c, 'rgba(0,0,0,.1)'); }
      else if (o.hard) { circ(c, 0, -0.8, 4.3); fs(c, '#ffd23f', 0.9); line(c, 0, -5, 0, 3.4, 0.7, 'rgba(0,0,0,.3)'); }
      else {
        circ(c, 0, -0.8, 3.8); fs(c, o.hair, 0.9);
        if (o.bun) { circ(c, 0, 3.2, 1.8); fs(c, o.hair, 0.6); }
        if (o.cap) { circ(c, 0, -0.8, 3.9); fs(c, o.cap, 0.9); rr(c, -2.6, -6.6, 5.2, 2.8, 1.2); fs(c, o.cap, 0.8); }
      }
      if (o.bal) { line(c, 6, -1, 10, -12.5, 0.6); circ(c, 10, -17, 5); fs(c, o.bal, 0.9); circ(c, 8.4, -18.6, 1.3); fs(c, 'rgba(255,255,255,.7)'); }
      if (o.umb) SP.umbrella(c, { col: o.umb, dots: o.dots });
    },
    umbrella: function (c, o) {
      var r = o.r || 11;
      circ(c, 0, 0, r); fs(c, o.col, 1);
      for (var k = 0; k < 8; k++) { var a = k / 8 * TAU; line(c, 0, 0, Math.cos(a) * r, Math.sin(a) * r, 0.5, 'rgba(0,0,0,.35)'); }
      if (o.dots) { c.fillStyle = '#fff'; for (var j = 0; j < 7; j++) { var b = j / 7 * TAU + 0.3; circ(c, Math.cos(b) * r * 0.62, Math.sin(b) * r * 0.62, 1.6); c.fill(); } }
      circ(c, 0, 0, 1.3); fs(c, INK);
    },
    balloon: function (c, o) {
      c.beginPath(); c.moveTo(0, 6); c.quadraticCurveTo(3, 11, 0, 15); c.lineWidth = 0.7; c.strokeStyle = INK; c.stroke();
      c.beginPath(); c.ellipse(0, 0, 5.4, 6.4, 0, 0, TAU); fs(c, o.col, 0.9);
      c.beginPath(); c.moveTo(-1.2, 6.2); c.lineTo(1.2, 6.2); c.lineTo(0, 7.6); c.closePath(); fs(c, o.col, 0.5);
      circ(c, -1.8, -2.4, 1.4); fs(c, 'rgba(255,255,255,.7)');
    },
    car: function (c, o) {
      rr(c, -11, -21, 22, 42, 6); fs(c, o.col, 1.4);
      rr(c, -8.5, -13, 17, 8, 2); fs(c, '#bfe3ff', 0.8);
      rr(c, -8.5, 9, 17, 6, 2); fs(c, '#bfe3ff', 0.8);
      rr(c, -8.5, -4.5, 17, 13, 2); fs(c, 'rgba(0,0,0,.12)');
      c.fillStyle = '#fff7b0'; c.fillRect(-9, -21.5, 4, 2); c.fillRect(5, -21.5, 4, 2);
      c.fillStyle = '#e63946'; c.fillRect(-9, 19.5, 4, 2); c.fillRect(5, 19.5, 4, 2);
      if (o.taxi) { rr(c, -4, 0, 8, 4, 1); fs(c, '#fff', 0.6); }
    },
    tree: function (c, o) {
      circ(c, 0, 0, o.r); fs(c, o.col, 1.6);
      for (var k = 0; k < 4; k++) { var a = k * 1.7 + o.r; circ(c, Math.cos(a) * o.r * 0.45, Math.sin(a) * o.r * 0.45, o.r * 0.38); fs(c, 'rgba(0,0,0,.07)'); }
      circ(c, -o.r * 0.28, -o.r * 0.28, o.r * 0.45); fs(c, 'rgba(255,255,255,.2)');
    },
    cat: function (c, o) {
      c.beginPath(); c.moveTo(0, 7); c.quadraticCurveTo(7, 10, 5, 3); c.lineWidth = 2.6; c.strokeStyle = INK; c.stroke(); c.lineWidth = 1.6; c.strokeStyle = o.col; c.stroke();
      c.beginPath(); c.ellipse(0, 2, 4.2, 5.8, 0, 0, TAU); fs(c, o.col, 0.8);
      c.beginPath(); c.moveTo(-3.3, -5); c.lineTo(-2.7, -9.4); c.lineTo(-0.6, -6.6); c.closePath(); fs(c, o.col, 0.7);
      c.beginPath(); c.moveTo(3.3, -5); c.lineTo(2.7, -9.4); c.lineTo(0.6, -6.6); c.closePath(); fs(c, o.col, 0.7);
      circ(c, 0, -5, 3.5); fs(c, o.col, 0.8);
      if (o.stripes) { for (var k = -1; k <= 2; k++) line(c, -3, k * 2.4 + 1, 3, k * 2.4 + 1, 0.9, 'rgba(120,50,0,.6)'); }
    },
    crown: function (c, o) {
      c.beginPath(); c.moveTo(-8, 4); c.lineTo(-8, -4); c.lineTo(-4, 0); c.lineTo(0, -6.5); c.lineTo(4, 0); c.lineTo(8, -4); c.lineTo(8, 4); c.closePath(); fs(c, o.col, 1);
      circ(c, 0, 1.6, 1.7); fs(c, '#e63946', 0.5); circ(c, -4.6, 2, 1.2); fs(c, '#1f6fff', 0.4); circ(c, 4.6, 2, 1.2); fs(c, '#1f6fff', 0.4);
    },
    key: function (c, o) {
      rr(c, -2, -1.4, 10.5, 2.8, 1); fs(c, o.col, 0.7);
      c.fillStyle = o.col; c.fillRect(4.2, 1, 1.8, 2.4); c.fillRect(6.6, 1, 1.8, 3.2); c.lineWidth = 0.6; c.strokeStyle = INK; c.strokeRect(4.2, 1, 1.8, 2.4); c.strokeRect(6.6, 1, 1.8, 3.2);
      circ(c, -5, 0, 3.8); fs(c, o.col, 0.8); circ(c, -5, 0, 1.5); fs(c, 'rgba(26,26,46,.55)');
    },
    duck: function (c, o) {
      circ(c, 0, 0, 9); c.lineWidth = 0.8; c.strokeStyle = 'rgba(255,255,255,.75)'; c.stroke();
      c.beginPath(); c.ellipse(0, 1.5, 5.4, 4.2, 0, 0, TAU); fs(c, o.col, 0.9);
      circ(c, 2.8, -2.6, 2.7); fs(c, o.col, 0.8);
      c.beginPath(); c.moveTo(5.1, -3.2); c.lineTo(8, -2.4); c.lineTo(5.3, -1.4); c.closePath(); fs(c, '#ff8c1a', 0.5);
      circ(c, 3.2, -3.4, 0.6); fs(c, INK);
    },
    telescope: function (c, o) {
      line(c, 0, 0, -6, 6, 1); line(c, 0, 0, 6, 6, 1); line(c, 0, 0, 0, -6, 1);
      c.save(); c.rotate(-0.7); rr(c, -1.9, -12, 3.8, 15, 1); fs(c, o.col, 0.8); rr(c, -2.5, -13, 5, 3, 1); fs(c, '#1f6fff', 0.7); c.restore();
      circ(c, 0, 0, 1.6); fs(c, INK);
    },
    dish: function (c) { circ(c, 0, 0, 6.5); fs(c, '#f4f4f4', 0.9); circ(c, 0, 0, 3.5); c.lineWidth = 0.5; c.strokeStyle = 'rgba(0,0,0,.3)'; c.stroke(); circ(c, 0, 0, 1.4); fs(c, '#888', 0.4); },
    flamingo: function (c, o) {
      c.beginPath(); c.ellipse(0, 1, 5.2, 3.5, 0, 0, TAU); fs(c, o.col, 0.9);
      c.beginPath(); c.moveTo(3.5, 0); c.quadraticCurveTo(8, -4, 3, -8); c.lineWidth = 2.6; c.strokeStyle = INK; c.stroke(); c.lineWidth = 1.5; c.strokeStyle = o.col; c.stroke();
      circ(c, 3, -8.6, 2); fs(c, o.col, 0.6); line(c, 4.6, -8.6, 6.6, -7.6, 1);
    },
    plane: function (c) {
      c.beginPath(); c.moveTo(0, -8); c.lineTo(6.5, 6); c.lineTo(0, 3); c.lineTo(-6.5, 6); c.closePath(); fs(c, '#ffffff', 0.8);
      line(c, 0, -8, 0, 3, 0.5);
    },
    paper: function (c) { rr(c, -4.5, -6, 9, 12, 0.5); fs(c, '#ffffff', 0.7); line(c, -3, -3, 3, -3, 0.4, '#aaa'); line(c, -3, 0, 3, 0, 0.4, '#aaa'); line(c, -3, 3, 2, 3, 0.4, '#aaa'); },
    pizza: function (c, o) {
      rr(c, -7.5, -7.5, 15, 15, 1); fs(c, '#d9b382', 1);
      line(c, -7.5, 5.5, 7.5, 5.5, 0.5, 'rgba(0,0,0,.35)');
      if (o.logo) { circ(c, 0, -0.5, 3.6); fs(c, o.logo, 0.6); }
    },
    bike: function (c, o) {
      circ(c, 0, -7, 3.8); c.lineWidth = 1.3; c.strokeStyle = INK; c.stroke();
      circ(c, 0, 7, 3.8); c.stroke();
      line(c, 0, -7, 0, 7, 3.2); line(c, 0, -7, 0, 7, 1.9, o.col);
      line(c, -4.4, -5, 4.4, -5, 2.6); line(c, -4.4, -5, 4.4, -5, 1.4, o.col);
      rr(c, -1.3, 2, 2.6, 3.4, 1); fs(c, INK);
    },
    ufo: function (c) {
      c.beginPath(); c.ellipse(0, 0, 9, 5.6, 0, 0, TAU); fs(c, '#b8c0cc', 1);
      circ(c, 0, -0.5, 3.6); fs(c, '#9fd0ff', 0.8);
      c.fillStyle = '#ffd23f'; for (var k = 0; k < 6; k++) { var a = k / 6 * TAU; circ(c, Math.cos(a) * 6.8, Math.sin(a) * 4.1, 0.9); c.fill(); }
    },
    icecream: function (c, o) {
      c.beginPath(); c.ellipse(0, -1, 5.4, 4.2, 0, 0, TAU); fs(c, 'rgba(255,255,255,.45)');
      c.beginPath(); c.moveTo(-2.7, 0); c.lineTo(2.7, 0); c.lineTo(0, 8.5); c.closePath(); fs(c, '#e0b070', 0.7);
      circ(c, 0, -1, 3.4); fs(c, o.col, 0.8); circ(c, 0.6, -4, 1.1); fs(c, '#e63946', 0.4);
    },
    sneaker: function (c, o) {
      rr(c, -3.5, -6.6, 7, 13.2, 3.3); fs(c, o.col, 0.9);
      rr(c, -2, -2.6, 4, 6, 1.5); fs(c, 'rgba(255,255,255,.85)');
      line(c, -1.6, -1.4, 1.6, -1.4, 0.5); line(c, -1.6, 0.4, 1.6, 0.4, 0.5); line(c, -1.6, 2.2, 1.6, 2.2, 0.5);
    },
    dog: function (c, o) {
      line(c, 0, 8, 1.5, 12, 1.6);
      c.beginPath(); c.ellipse(0, 2, 4.3, 7, 0, 0, TAU); fs(c, o.col, 0.9);
      c.beginPath(); c.ellipse(-3.6, -6.5, 1.5, 2.8, 0.3, 0, TAU); fs(c, o.ear || '#5a3a1a', 0.6);
      c.beginPath(); c.ellipse(3.6, -6.5, 1.5, 2.8, -0.3, 0, TAU); fs(c, o.ear || '#5a3a1a', 0.6);
      circ(c, 0, -6, 3.6); fs(c, o.col, 0.8);
      if (o.collar) { line(c, -3.4, -3, 3.4, -3, 1.6, o.collar); }
      circ(c, 0, -9.2, 1); fs(c, INK);
    },
    bench: function (c) { rr(c, -10, -3, 20, 6, 1); fs(c, '#b07a45', 0.9); line(c, -10, 0, 10, 0, 0.4, 'rgba(0,0,0,.35)'); },
    stall: function (c, o) {
      var w = o.w, h = o.h; c.fillStyle = '#ffffff'; c.fillRect(-w / 2, -h / 2, w, h);
      c.fillStyle = o.col; for (var i = 0; i < 8; i += 2) c.fillRect(-w / 2 + i * w / 8, -h / 2, w / 8, h);
      c.lineWidth = 1.4; c.strokeStyle = INK; c.strokeRect(-w / 2, -h / 2, w, h);
      line(c, -w / 2, 0, w / 2, 0, 0.6, 'rgba(0,0,0,.3)');
    },
    ac: function (c) { rr(c, -7, -7, 14, 14, 1.5); fs(c, '#d6d9de', 1); circ(c, 0, 0, 4.6); fs(c, '#9aa1ab', 0.7); line(c, -4, 0, 4, 0, 0.5); line(c, 0, -4, 0, 4, 0.5); },
    tank: function (c, o) { circ(c, 0, 0, o.r); fs(c, '#c9b49a', 1.2); circ(c, 0, 0, o.r * 0.62); c.lineWidth = 0.6; c.strokeStyle = 'rgba(0,0,0,.35)'; c.stroke(); circ(c, 0, 0, 1.6); fs(c, INK); },
    solar: function (c, o) {
      var w = o.w, h = o.h; rr(c, -w / 2, -h / 2, w, h, 1); fs(c, '#2f5fd0', 1);
      c.strokeStyle = 'rgba(255,255,255,.45)'; c.lineWidth = 0.6;
      for (var x = -w / 2 + 9; x < w / 2; x += 9) { c.beginPath(); c.moveTo(x, -h / 2); c.lineTo(x, h / 2); c.stroke(); }
      for (var y = -h / 2 + 7; y < h / 2; y += 7) { c.beginPath(); c.moveTo(-w / 2, y); c.lineTo(w / 2, y); c.stroke(); }
    },
    skylight: function (c, o) { rr(c, -o.w / 2, -o.h / 2, o.w, o.h, 2); fs(c, '#cfe8ff', 1); line(c, -o.w / 2 + 2, o.h / 2 - 2, o.w / 2 - 2, -o.h / 2 + 2, 0.6, 'rgba(255,255,255,.9)'); },
    garden: function (c, o) {
      rr(c, -o.w / 2, -o.h / 2, o.w, o.h, 3); fs(c, '#9fd38a', 1);
      for (var i = 0; i < o.f.length; i++) { circ(c, o.f[i][0], o.f[i][1], 2); fs(c, o.f[i][2], 0.3); }
    },
    pool: function (c, o) {
      rr(c, -o.w / 2, -o.h / 2, o.w, o.h, 5); fs(c, '#62b6ff', 1.4);
      c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 0.8;
      for (var y = -o.h / 2 + 8; y < o.h / 2 - 4; y += 9) { c.beginPath(); c.moveTo(-o.w / 2 + 6, y); c.quadraticCurveTo(0, y - 3, o.w / 2 - 6, y); c.stroke(); }
    },
    helipad: function (c, o) {
      circ(c, 0, 0, o.r); fs(c, '#7d848e', 1.2); circ(c, 0, 0, o.r * 0.8); c.lineWidth = 1.5; c.strokeStyle = '#fff'; c.stroke();
      var s = o.r * 0.35; line(c, -s, -s, -s, s, 2.4, '#fff'); line(c, s, -s, s, s, 2.4, '#fff'); line(c, -s, 0, s, 0, 2.4, '#fff');
    },
    fountain: function (c, o) {
      circ(c, 0, 0, o.r); fs(c, '#d8d2c4', 1.6); circ(c, 0, 0, o.r * 0.8); fs(c, '#7cc4ff', 0.8);
      circ(c, 0, 0, o.r * 0.22); fs(c, '#e6f4ff', 0.7);
      c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 0.8; circ(c, 0, 0, o.r * 0.45); c.stroke(); circ(c, 0, 0, o.r * 0.62); c.stroke();
    },
    lamp: function (c) { circ(c, 0, 0, 2.6); fs(c, '#555', 0.6); circ(c, 0, 0, 1.2); fs(c, '#fff6a0'); },
    trash: function (c) { circ(c, 0, 0, 4); fs(c, '#6b7280', 0.8); circ(c, 0, 0, 2); fs(c, '#4b5260'); },
    picnic: function (c, o) {
      c.fillStyle = '#ffffff'; c.fillRect(-12, -9, 24, 18); c.fillStyle = o.col;
      for (var i = 0; i < 4; i++) for (var j = 0; j < 3; j++) if ((i + j) % 2 === 0) c.fillRect(-12 + i * 6, -9 + j * 6, 6, 6);
      c.lineWidth = 0.9; c.strokeStyle = INK; c.strokeRect(-12, -9, 24, 18);
    },
    table: function (c) { circ(c, 0, 0, 5); fs(c, '#ffffff', 0.8); },
    flowers: function (c, o) {
      rr(c, -o.w / 2, -o.h / 2, o.w, o.h, 4); fs(c, '#7fbf5f', 1);
      for (var i = 0; i < o.f.length; i++) { circ(c, o.f[i][0], o.f[i][1], 1.8); fs(c, o.f[i][2]); }
    },
    lily: function (c) { circ(c, 0, 0, 3.4); fs(c, '#5aa865', 0.5); },
    bird: function (c, o) {
      var f = o.flap == null ? 1 : o.flap, span = f < 0 ? 0 : 3 + f * 5;
      c.beginPath(); c.moveTo(-2, 4.5); c.lineTo(0, 9); c.lineTo(2, 4.5); c.closePath(); fs(c, o.col, 0.5);
      if (span > 0) {
        c.beginPath(); c.ellipse(-2.5 - span / 2, 0.5, span / 2 + 1, 2.4, 0.25 - f * 0.3, 0, TAU); fs(c, o.col, 0.6);
        c.beginPath(); c.ellipse(2.5 + span / 2, 0.5, span / 2 + 1, 2.4, -0.25 + f * 0.3, 0, TAU); fs(c, o.col, 0.6);
      }
      c.beginPath(); c.ellipse(0, 0.5, 2.8, 4.8, 0, 0, TAU); fs(c, o.col, 0.8);
      c.beginPath(); c.ellipse(0, 1.2, 1.5, 2.8, 0, 0, TAU); fs(c, o.belly);
      circ(c, 0, -4, 2.3); fs(c, o.col, 0.6);
      c.beginPath(); c.moveTo(-0.7, -5.9); c.lineTo(0.7, -5.9); c.lineTo(0, -7.6); c.closePath(); fs(c, '#f4a261', 0.3);
    },

    /* street and park extras */
    pigeon: function (c) { c.beginPath(); c.ellipse(0, 0, 2.2, 3.4, 0, 0, TAU); fs(c, '#8d93a0', 0.5); circ(c, 0, -3.2, 1.4); fs(c, '#6b7280', 0.4); c.beginPath(); c.moveTo(-0.5, -4.4); c.lineTo(0.5, -4.4); c.lineTo(0, -5.5); c.closePath(); fs(c, '#e0a040'); },
    hydrant: function (c) { circ(c, 0, 0, 3.2); fs(c, '#e63946', 0.8); circ(c, 0, 0, 1.4); fs(c, '#b02a35'); line(c, -4.4, 0, 4.4, 0, 1.2, '#b02a35'); },
    mailbox: function (c) { rr(c, -4.5, -3.2, 9, 6.4, 2); fs(c, '#1f6fff', 0.8); line(c, -3, -1.2, 3, -1.2, 0.8, '#ffffff'); },
    stroller: function (c, o) { line(c, -3, 6, -3, 9.5, 0.8); line(c, 3, 6, 3, 9.5, 0.8); line(c, -3.4, 9.5, 3.4, 9.5, 1.4); rr(c, -4.2, -6, 8.4, 12, 2.4); fs(c, o.col, 0.8); c.beginPath(); c.arc(0, -2, 4.2, Math.PI, 0); c.closePath(); fs(c, 'rgba(0,0,0,.22)', 0.6); },
    skate: function (c, o) { rr(c, -2.4, -7.5, 4.8, 15, 2.4); fs(c, o.col, 0.6); c.fillStyle = INK; c.fillRect(-3.2, -5.6, 1, 2); c.fillRect(2.2, -5.6, 1, 2); c.fillRect(-3.2, 3.6, 1, 2); c.fillRect(2.2, 3.6, 1, 2); },
    sandbox: function (c, o) {
      rr(c, -o.w / 2, -o.h / 2, o.w, o.h, 3); fs(c, '#b08a5a', 1.6);
      rr(c, -o.w / 2 + 3, -o.h / 2 + 3, o.w - 6, o.h - 6, 2); fs(c, '#f3dfa8');
      c.fillStyle = 'rgba(176,138,90,.35)'; for (var i = 0; i < o.sp.length; i++) { circ(c, o.sp[i][0], o.sp[i][1], o.sp[i][2]); c.fill(); }
    },
    slide: function (c) { rr(c, -5, -21, 10, 7, 1); fs(c, '#9aa1ab', 0.8); line(c, -3, -19, 3, -19, 0.6); line(c, -3, -16.5, 3, -16.5, 0.6); rr(c, -4, -14, 8, 30, 3); fs(c, '#ff8c42', 1); line(c, 0, -12, 0, 13, 0.6, 'rgba(255,255,255,.7)'); },
    swings: function (c) { line(c, -18, -5, 18, -5, 1.8, '#555'); line(c, -18, 5, 18, 5, 1.8, '#555'); rr(c, -11, -2.2, 6, 4.4, 1); fs(c, '#e63946', 0.6); rr(c, -2, -2.2, 6, 4.4, 1); fs(c, '#1f6fff', 0.6); rr(c, 7, -2.2, 6, 4.4, 1); fs(c, '#ffd23f', 0.6); },
    bucket: function (c, o) { circ(c, 0, 0, 3.6); fs(c, o.col, 0.7); circ(c, 0, 0, 2.3); fs(c, 'rgba(0,0,0,.18)'); c.beginPath(); c.arc(0, 0, 4.7, -2.7, -0.45); c.lineWidth = 0.6; c.strokeStyle = INK; c.stroke(); },
    shovel: function (c, o) { line(c, 0, -6, 0, 2, 1.6); line(c, 0, -6, 0, 2, 0.9, o.col); c.beginPath(); c.moveTo(-2.5, 2); c.lineTo(2.5, 2); c.lineTo(1.6, 6.4); c.lineTo(-1.6, 6.4); c.closePath(); fs(c, o.col, 0.6); },
    ball: function (c, o) { circ(c, 0, 0, 3.3); fs(c, o.col, 0.7); line(c, -3.2, 0, 3.2, 0, 0.9, '#ffffff'); },
    castle: function (c, o) {
      rr(c, -5, -5, 10, 10, 1); fs(c, '#e2c17e', 0.7);
      [[-5, -5], [5, -5], [-5, 5], [5, 5]].forEach(function (p) { circ(c, p[0], p[1], 2.1); fs(c, '#d6b064', 0.5); });
      circ(c, 0, 0, 2.6); fs(c, '#d6b064', 0.5);
      if (o.flag) { line(c, 0, 0, 0, -9, 0.6); c.beginPath(); c.moveTo(0, -9); c.lineTo(4.4, -7.7); c.lineTo(0, -6.4); c.closePath(); fs(c, o.flag, 0.4); }
    },
    toytruck: function (c, o) { c.fillStyle = INK; c.fillRect(-3.9, -3.6, 1, 2.2); c.fillRect(2.9, -3.6, 1, 2.2); c.fillRect(-3.9, 2, 1, 2.2); c.fillRect(2.9, 2, 1, 2.2); rr(c, -3, -5.2, 6, 10.4, 1); fs(c, o.col, 0.6); rr(c, -2.3, -4.6, 4.6, 3, 0.6); fs(c, '#bfe3ff', 0.4); },


    /* office things */
    mug: function (c, o) { c.beginPath(); c.arc(5, 0, 2.4, -1.2, 1.2); c.lineWidth = 1.8; c.strokeStyle = INK; c.stroke(); c.lineWidth = 0.9; c.strokeStyle = o.col; c.stroke(); circ(c, 0, 0, 4.4); fs(c, o.col, 0.8); circ(c, 0, 0, 3); fs(c, '#6b3e1f'); if (o.steam) { c.beginPath(); c.moveTo(-1.5, -5); c.quadraticCurveTo(-3, -7.5, -1, -9.5); c.moveTo(1.5, -5); c.quadraticCurveTo(0, -7.5, 2, -9.5); c.lineWidth = 0.7; c.strokeStyle = 'rgba(26,26,46,.45)'; c.stroke(); } },
    laptop: function (c, o) { rr(c, -8, -1, 16, 9, 1.2); fs(c, '#c9ced6', 0.8); rr(c, -6.5, 1, 13, 5, 0.6); fs(c, '#9aa1ab'); rr(c, -8, -9, 16, 8, 1.2); fs(c, '#d6d9de', 0.8); if (o.sticker) { circ(c, 0, -5, 2); fs(c, o.sticker, 0.4); } },
    stapler: function (c, o) { rr(c, -7.5, -2.6, 15, 5.2, 2); fs(c, '#2b2d42', 0.6); rr(c, -7, -2, 13, 4, 2); fs(c, o.col, 0.6); circ(c, 4.5, 0, 0.9); fs(c, '#c9ced6'); },
    notes: function (c, o) { c.beginPath(); c.moveTo(-4.5, -4.5); c.lineTo(4.5, -4.5); c.lineTo(4.5, 2); c.lineTo(2, 4.5); c.lineTo(-4.5, 4.5); c.closePath(); fs(c, o.col, 0.6); c.beginPath(); c.moveTo(4.5, 2); c.lineTo(2, 2); c.lineTo(2, 4.5); fs(c, 'rgba(0,0,0,.15)', 0.4); line(c, -3, -2, 2.5, -2, 0.4, 'rgba(26,26,46,.4)'); line(c, -3, 0, 1.5, 0, 0.4, 'rgba(26,26,46,.4)'); },
    cooler: function (c) { rr(c, -7, -7, 14, 14, 2); fs(c, '#f4f4f4', 1); circ(c, 0, 0, 5); fs(c, '#8ecae6', 0.8); circ(c, 0, 0, 2); fs(c, '#d6eef8', 0.4); },
    printer: function (c) { rr(c, -10, -7, 20, 14, 2); fs(c, '#9aa1ab', 1); rr(c, -6, -9, 12, 5, 0.5); fs(c, '#ffffff', 0.5); rr(c, -7, 1, 14, 3, 1); fs(c, '#2b2d42'); c.fillStyle = '#3ddc84'; c.fillRect(6, -4, 2, 2); },
    cabinet: function (c) { rr(c, -7, -9, 14, 18, 1); fs(c, '#b8c0cc', 1); line(c, -7, -3, 7, -3, 0.6); line(c, -7, 3, 7, 3, 0.6); [-6, 0, 6].forEach(function (y) { rr(c, -2, y - 1, 4, 1.6, 0.5); fs(c, '#4b5260'); }); },
    /* outdoor things */
    soccer: function (c, o) { circ(c, 0, 0, 4.4); fs(c, '#ffffff', 0.8); c.fillStyle = INK; c.beginPath(); for (var k = 0; k < 5; k++) { var a = k / 5 * TAU - Math.PI / 2; c.lineTo(Math.cos(a) * 1.7, Math.sin(a) * 1.7); } c.closePath(); c.fill(); for (var j = 0; j < 5; j++) { var b = j / 5 * TAU + 0.3; circ(c, Math.cos(b) * 3.6, Math.sin(b) * 3.6, 0.9); c.fill(); } },
    volley: function (c, o) { circ(c, 0, 0, 4.4); fs(c, o.col || '#ffffff', 0.8); c.beginPath(); c.arc(-4, -1, 4.6, -0.6, 1.2); c.moveTo(4.4, 0); c.arc(4, 2, 4.6, 2.4, 4.2); c.lineWidth = 0.5; c.strokeStyle = INK; c.stroke(); },
    basketball: function (c, o) { circ(c, 0, 0, 4.6); fs(c, o.col || '#f08a24', 0.8); line(c, -4.6, 0, 4.6, 0, 0.5); line(c, 0, -4.6, 0, 4.6, 0.5); c.beginPath(); c.arc(-6, 0, 4.4, -0.8, 0.8); c.moveTo(1.6, -3.4); c.arc(6, 0, 4.4, 2.34, 3.94); c.lineWidth = 0.5; c.strokeStyle = INK; c.stroke(); },
    frisbee: function (c, o) { circ(c, 0, 0, 5.4); fs(c, o.col, 0.8); circ(c, 0, 0, 3.6); c.lineWidth = 0.7; c.strokeStyle = 'rgba(255,255,255,.7)'; c.stroke(); },
    kite: function (c, o) { c.beginPath(); c.moveTo(0, 9); c.quadraticCurveTo(3, 13, -1, 16); c.quadraticCurveTo(2, 19, 0, 22); c.lineWidth = 0.6; c.strokeStyle = INK; c.stroke(); [[0, -8], [6, 0], [0, 9], [-6, 0]].forEach(function (p, i, A) { var q = A[(i + 1) % 4]; c.beginPath(); c.moveTo(0, 0); c.lineTo(p[0], p[1]); c.lineTo(q[0], q[1]); c.closePath(); fs(c, o.cols[i], 0.6); }); rr(c, -1.5, 14, 3, 2, 0.5); fs(c, o.cols[0], 0.3); rr(c, -1.5, 19, 3, 2, 0.5); fs(c, o.cols[2], 0.3); },
    cone: function (c, o) { rr(c, -5.5, -5.5, 11, 11, 1.5); fs(c, '#2b2d42', 0.6); circ(c, 0, 0, 4.2); fs(c, '#ff7a1a', 0.7); circ(c, 0, 0, 2.6); c.lineWidth = 1.3; c.strokeStyle = o.stripe; c.stroke(); circ(c, 0, 0, 1); fs(c, '#ff7a1a', 0.4); },
    goal: function (c, o) { c.strokeStyle = '#ffffff'; c.lineWidth = 2; c.strokeRect(-o.w / 2, -5, o.w, 10); c.lineWidth = 0.4; c.strokeStyle = 'rgba(255,255,255,.8)'; c.beginPath(); for (var x = -o.w / 2 + 3; x < o.w / 2; x += 3) { c.moveTo(x, -5); c.lineTo(x, 5); } c.stroke(); },
    hoop: function (c) { rr(c, -7, -2, 14, 3, 0.5); fs(c, '#ffffff', 0.7); circ(c, 0, 5, 3.4); c.lineWidth = 1.2; c.strokeStyle = '#e63946'; c.stroke(); },
    /* random things */
    donut: function (c, o) { circ(c, 0, 0, 5.2); fs(c, '#d9a066', 0.8); circ(c, 0, 0, 4.2); fs(c, o.icing); circ(c, 0, 0, 1.8); fs(c, '#d9a066', 0.6); if (o.spr) for (var k = 0; k < 8; k++) { var a = k / 8 * TAU + 0.2; c.save(); c.translate(Math.cos(a) * 3, Math.sin(a) * 3); c.rotate(a * 2); c.fillStyle = ['#1f6fff', '#ffd23f', '#2d9a5f', '#ffffff'][k % 4]; c.fillRect(-0.9, -0.3, 1.8, 0.6); c.restore(); } },
    banana: function (c, o) { c.beginPath(); c.arc(0, -6, 8, 0.55, 2.6); c.arc(0, -6, 5.2, 2.6, 0.55, true); c.closePath(); fs(c, o.col, 0.7); circ(c, 6.9, -2, 0.9); fs(c, '#6b4f3a'); },
    pineapple: function (c, o) { [[-2.5, -5, -0.4], [0, -6.5, 0], [2.5, -5, 0.4]].forEach(function (l) { c.beginPath(); c.ellipse(l[0], l[1], 1.3, 3.4, l[2], 0, TAU); fs(c, '#2d9a5f', 0.5); }); c.beginPath(); c.ellipse(0, 1.5, 4.2, 5.4, 0, 0, TAU); fs(c, o.col, 0.8); c.save(); c.clip(); c.strokeStyle = 'rgba(120,70,0,.5)'; c.lineWidth = 0.5; c.beginPath(); for (var k = -8; k < 8; k += 2.4) { c.moveTo(k - 5, -5); c.lineTo(k + 5, 7); c.moveTo(k + 5, -5); c.lineTo(k - 5, 7); } c.stroke(); c.restore(); },
    coconut: function (c) { circ(c, 0, 0, 4.6); fs(c, '#7a5230', 0.8); circ(c, -1.2, -1, 0.6); fs(c, '#3d2a1a'); circ(c, 1.2, -1, 0.6); fs(c, '#3d2a1a'); circ(c, 0, 1, 0.6); fs(c, '#3d2a1a'); },
    chicken: function (c, o) { c.beginPath(); c.ellipse(0, 1.5, 2.6, 6.5, 0, 0, TAU); fs(c, o.col, 0.8); circ(c, 0, -5.5, 2.4); fs(c, o.col, 0.7); c.beginPath(); c.moveTo(-1, -8); c.lineTo(0, -9.6); c.lineTo(1, -8); c.closePath(); fs(c, '#e63946', 0.3); c.beginPath(); c.moveTo(-0.8, -3.6); c.lineTo(0.8, -3.6); c.lineTo(0, -2); c.closePath(); fs(c, '#f4a261', 0.3); line(c, -1, 7.5, -2, 10, 0.8, '#f4a261'); line(c, 1, 7.5, 2, 10, 0.8, '#f4a261'); },
    tophat: function (c, o) { circ(c, 0, 0, 6.8); fs(c, '#1b1b1b', 0.8); circ(c, 0, 0, 4.4); c.lineWidth = 1.6; c.strokeStyle = o.band; c.stroke(); circ(c, 0, 0, 3.6); fs(c, '#2b2d42', 0.5); circ(c, -1, -1, 1.2); fs(c, 'rgba(255,255,255,.18)'); },
    sunglasses: function (c, o) { circ(c, -3.6, 0, 3); fs(c, '#2b2d42', 0.9); circ(c, 3.6, 0, 3); fs(c, '#2b2d42', 0.9); c.beginPath(); c.arc(-3.6, 0, 3, 0, TAU); c.lineWidth = 1.1; c.strokeStyle = o.col; c.stroke(); c.beginPath(); c.arc(3.6, 0, 3, 0, TAU); c.stroke(); line(c, -0.8, -0.6, 0.8, -0.6, 1, o.col); circ(c, -4.4, -1, 0.8); fs(c, 'rgba(255,255,255,.5)'); },
    melon: function (c, o) { c.beginPath(); c.arc(0, -2, 7, 0, Math.PI); c.closePath(); fs(c, o.rind, 0.8); c.beginPath(); c.arc(0, -2, 5.6, 0, Math.PI); c.closePath(); fs(c, o.col); if (o.seeds) { c.fillStyle = INK; [[-2.5, 0.2], [0, 1.4], [2.5, 0.2], [-1.2, 2.6], [1.2, 2.6]].forEach(function (p) { c.beginPath(); c.ellipse(p[0], p[1], 0.4, 0.7, 0, 0, TAU); c.fill(); }); } },
    magnifier: function (c, o) { line(c, 3, 3, 8.5, 8.5, 3.2); line(c, 3, 3, 8.5, 8.5, 2, o.col); circ(c, -1, -1, 5); fs(c, 'rgba(207,232,255,.75)', 1.6); circ(c, -1, -1, 5); c.lineWidth = 1; c.strokeStyle = '#c9a227'; c.stroke(); line(c, -3.5, -2.5, -1.5, -4.5, 0.7, '#ffffff'); },

    /* furniture, top down */
    desk: function (c, o) { var w = o.w || 28, h = o.h || 14; rr(c, -w / 2, -h / 2, w, h, 1.5); fs(c, o.col || '#c89f6e', 0.9); rr(c, -6, -h / 2 + 1.5, 12, 3, 0.8); fs(c, '#2b2d42', 0.5); rr(c, -5, 1, 10, 3, 0.6); fs(c, '#e9ecef', 0.4); },
    chair: function (c, o) { circ(c, 0, 0, 4); fs(c, o.col || '#3d405b', 0.7); rr(c, -4, 3.6, 8, 2.4, 1); fs(c, o.col || '#3d405b', 0.6); },
    couch: function (c, o) { var w = o.w || 34, h = 13; rr(c, -w / 2, -h / 2, w, h, 3); fs(c, o.col, 1); rr(c, -w / 2 + 3.5, -h / 2 + 4.5, w - 7, h - 7, 2); fs(c, 'rgba(255,255,255,.25)'); line(c, 0, -h / 2 + 4.5, 0, h / 2 - 2.5, 0.5, 'rgba(0,0,0,.3)'); },
    bed: function (c, o) { var w = o.w || 24, h = o.h || 34; rr(c, -w / 2, -h / 2, w, h, 2); fs(c, '#a87a50', 1); rr(c, -w / 2 + 1.5, -h / 2 + 1.5, w - 3, h - 3, 1.5); fs(c, '#ffffff'); rr(c, -w / 2 + 1.5, -h / 2 + h * 0.36, w - 3, h * 0.62, 1.5); fs(c, o.col, 0.6); rr(c, -w / 2 + 3, -h / 2 + 3, w / 2 - 4.5, 6, 2); fs(c, '#f4f4f4', 0.5); rr(c, 1.5, -h / 2 + 3, w / 2 - 4.5, 6, 2); fs(c, '#f4f4f4', 0.5); },
    rug: function (c, o) { rr(c, -o.w / 2, -o.h / 2, o.w, o.h, o.round ? Math.min(o.w, o.h) / 2 : 2); fs(c, o.col, 0.6); rr(c, -o.w / 2 + 3, -o.h / 2 + 3, o.w - 6, o.h - 6, o.round ? Math.min(o.w, o.h) / 2 - 3 : 1); c.lineWidth = 0.7; c.strokeStyle = 'rgba(255,255,255,.7)'; c.stroke(); },
    plant: function (c) { circ(c, 0, 0, 3.6); fs(c, '#b5651d', 0.7); for (var k = 0; k < 5; k++) { var a = k / 5 * TAU; circ(c, Math.cos(a) * 3, Math.sin(a) * 3, 2.8); fs(c, '#4f9d5a', 0.5); } circ(c, 0, 0, 2.2); fs(c, '#6bb56e'); },
    dtable: function (c, o) { rr(c, -o.w / 2, -o.h / 2, o.w, o.h, o.round ? Math.min(o.w, o.h) / 2 : 2); fs(c, o.col || '#d9b382', 0.9); },
    shelf: function (c, o) { var w = o.w || 30; rr(c, -w / 2, -4, w, 8, 1); fs(c, '#8b5e3c', 0.8); for (var x = -w / 2 + 2; x < w / 2 - 2; x += 3) { c.fillStyle = o.books[Math.abs(Math.round(x)) % o.books.length]; c.fillRect(x, -2.6, 2.4, 5.2); } },
    counter: function (c, o) { rr(c, -o.w / 2, -o.h / 2, o.w, o.h, 1.5); fs(c, '#dfe3e8', 0.9); if (o.sink) { rr(c, -5, -o.h / 2 + 2, 10, o.h - 4, 2); fs(c, '#b8c0cc', 0.5); } if (o.stove) { for (var k = 0; k < 4; k++) { circ(c, o.w / 2 - 14 + (k % 2) * 7, (k < 2 ? -1 : 1) * o.h * 0.2, 2.2); c.lineWidth = 0.6; c.strokeStyle = INK; c.stroke(); } } },
    fridge: function (c) { rr(c, -6.5, -6.5, 13, 13, 1.5); fs(c, '#f8f9fa', 0.9); line(c, -6.5, -1, 6.5, -1, 0.5); },
    tv: function (c) { rr(c, -12, -2, 24, 4, 1); fs(c, '#1b1b1b', 0.5); },
    treadmill: function (c) { rr(c, -7, -15, 14, 30, 2); fs(c, '#4b5260', 0.9); rr(c, -5, -9, 10, 22, 1); fs(c, '#2b2d42'); rr(c, -6, -14, 12, 4, 1); fs(c, '#9aa1ab', 0.5); },
    weights: function (c) { line(c, -9, 0, 9, 0, 1.4, '#555'); circ(c, -9, 0, 3.4); fs(c, '#2b2d42', 0.6); circ(c, 9, 0, 3.4); fs(c, '#2b2d42', 0.6); },
    mat: function (c, o) { rr(c, -6, -14, 12, 28, 2); fs(c, o.col, 0.6); },
    rack: function (c, o) { rr(c, -7, -12, 14, 24, 1); fs(c, '#2b2d42', 0.9); for (var y = -9; y < 11; y += 3) { c.fillStyle = (Math.round(y + o.k) % 2) ? '#3ddc84' : '#4fa3ff'; c.fillRect(-5, y, 2, 1.2); c.fillStyle = '#4b5260'; c.fillRect(-2, y, 7, 1.2); } },
    piano: function (c) { rr(c, -15, -9, 30, 18, 3); fs(c, '#1b1b1b', 1); rr(c, -14, 4, 28, 4, 0.5); fs(c, '#ffffff', 0.4); },
    tub: function (c) { rr(c, -8, -15, 16, 30, 6); fs(c, '#ffffff', 0.9); rr(c, -5.5, -12, 11, 24, 4.5); fs(c, '#cfe8ff', 0.4); },
    toilet: function (c) { rr(c, -4, -7, 8, 4, 1); fs(c, '#ffffff', 0.6); c.beginPath(); c.ellipse(0, 1.5, 3.6, 4.6, 0, 0, TAU); fs(c, '#ffffff', 0.6); },
    elev: function (c, o) { rr(c, -o.w / 2, -o.h / 2, o.w, o.h, 1); fs(c, '#c9ced6', 1.2); line(c, 0, -o.h / 2, 0, o.h / 2, 0.8); c.fillStyle = '#ffd23f'; c.fillRect(-1.5, o.h / 2 + 2, 3, 3); },
    stairs: function (c, o) { rr(c, -o.w / 2, -o.h / 2, o.w, o.h, 1); fs(c, '#e6e2d6', 1); for (var y = -o.h / 2 + 5; y < o.h / 2; y += 5) line(c, -o.w / 2, y, o.w / 2, y, 0.5, 'rgba(0,0,0,.35)'); },
    billiard: function (c) { rr(c, -14, -23, 28, 46, 3); fs(c, '#8b5a2b', 1); rr(c, -11, -20, 22, 40, 1); fs(c, '#2d9a5f'); [[-11, -20], [11, -20], [-11, 0], [11, 0], [-11, 20], [11, 20]].forEach(function (p) { circ(c, p[0], p[1], 1.6); fs(c, INK); }); circ(c, 0, 8, 1.4); fs(c, '#ffffff'); },
    box: function (c) { rr(c, -5, -5, 10, 10, 1); fs(c, '#d4a373', 0.7); line(c, 0, -5, 0, 5, 1, 'rgba(255,255,255,.55)'); },
    reception: function (c, o) { rr(c, -o.w / 2, -7, o.w, 14, 6); fs(c, '#8d6e63', 1); rr(c, -o.w / 2 + 3, -4, o.w - 6, 5, 2); fs(c, '#efe2c4'); },
    column: function (c) { rr(c, -8, -8, 16, 16, 2); fs(c, '#d6d9de', 1.2); rr(c, -5, -5, 10, 10, 1); fs(c, 'rgba(0,0,0,.08)'); },
    gate: function (c) { rr(c, -13, -3, 26, 6, 2); fs(c, '#9aa1ab', 0.8); c.fillStyle = '#3ddc84'; c.fillRect(10, -1.5, 2, 3); },
    whiteboard: function (c, o) { rr(c, -o.w / 2, -1.6, o.w, 3.2, 0.6); fs(c, '#ffffff', 0.6); },

    /* hidden item sprites */
    teddy: function (c, o) { circ(c, 0, 3, 5); fs(c, o.col, 0.8); circ(c, -3.1, -5.8, 1.7); fs(c, o.col, 0.6); circ(c, 3.1, -5.8, 1.7); fs(c, o.col, 0.6); circ(c, 0, -3, 3.9); fs(c, o.col, 0.8); circ(c, 0, -2, 1.5); fs(c, '#f3dfa8'); if (o.bow) { c.beginPath(); c.moveTo(-3.4, 0.4); c.lineTo(0, 1.4); c.lineTo(-3.4, 2.6); c.closePath(); fs(c, o.bow, 0.4); c.beginPath(); c.moveTo(3.4, 0.4); c.lineTo(0, 1.4); c.lineTo(3.4, 2.6); c.closePath(); fs(c, o.bow, 0.4); } },
    trophy: function (c, o) { rr(c, -4.2, 3.4, 8.4, 4, 0.8); fs(c, '#6b4f3a', 0.6); c.beginPath(); c.arc(-4.6, -1, 2.4, 0, TAU); c.lineWidth = 1.2; c.strokeStyle = INK; c.stroke(); c.lineWidth = 0.7; c.strokeStyle = o.col; c.stroke(); c.beginPath(); c.arc(4.6, -1, 2.4, 0, TAU); c.lineWidth = 1.2; c.strokeStyle = INK; c.stroke(); c.lineWidth = 0.7; c.strokeStyle = o.col; c.stroke(); circ(c, 0, -1, 4.4); fs(c, o.col, 0.8); circ(c, 0, -1, 2.5); fs(c, 'rgba(0,0,0,.15)'); },
    guitar: function (c, o) { rr(c, -0.9, -13, 1.8, 11, 0.5); fs(c, '#6b4f3a', 0.5); rr(c, -1.6, -14.6, 3.2, 3, 0.6); fs(c, '#6b4f3a', 0.4); circ(c, 0, 3, 4.6); fs(c, o.col, 0.8); circ(c, 0, -2.2, 3.4); fs(c, o.col, 0.8); circ(c, 0, 0.6, 1.3); fs(c, INK); },
    fishbowl: function (c, o) { circ(c, 0, 0, 5.8); fs(c, '#cfe8ff', 0.8); circ(c, 0, 0, 4.4); c.lineWidth = 0.5; c.strokeStyle = 'rgba(31,111,255,.4)'; c.stroke(); c.beginPath(); c.ellipse(-0.4, 0.4, 2.2, 1.3, 0.3, 0, TAU); fs(c, o.col, 0.4); c.beginPath(); c.moveTo(1.5, 0.9); c.lineTo(3.4, -0.2); c.lineTo(3.2, 2.2); c.closePath(); fs(c, o.col, 0.3); },

    /* glass tower roof */
    tower: function (c, o) {
      var w = o.w, h = o.h;
      c.fillStyle = '#cfe0f0'; c.fillRect(-w / 2, -h / 2, w, h);
      c.strokeStyle = 'rgba(31,111,255,.28)'; c.lineWidth = 1; c.beginPath();
      for (var x = -w / 2 + 16; x < w / 2; x += 16) { c.moveTo(x, -h / 2); c.lineTo(x, h / 2); }
      for (var y = -h / 2 + 16; y < h / 2; y += 16) { c.moveTo(-w / 2, y); c.lineTo(w / 2, y); }
      c.stroke();
      c.lineWidth = 3; c.strokeStyle = INK; c.strokeRect(-w / 2, -h / 2, w, h);
      c.lineWidth = 1.4; c.strokeStyle = '#1f6fff'; c.strokeRect(-w / 2 + 8, -h / 2 + 8, w - 16, h - 16);
      rr(c, -30, -24, 60, 48, 4); fs(c, '#ffffff', 2);
      c.fillStyle = INK; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = '900 22px Trebuchet MS, sans-serif'; c.fillText(o.n + 'F', 0, -5);
      c.font = '800 8px Trebuchet MS, sans-serif'; c.fillText('TAP TO ENTER', 0, 13);
      c.fillStyle = '#1f6fff'; for (var k = 0; k < o.n; k++) c.fillRect(-w / 2 + 14 + k * 9, h / 2 - 20, 6, 8);
    }
  };

  var TDEF = {
    courier: { label: 'Courier', desc: 'A courier in a blue cap carrying a yellow backpack', kind: 'person', r: 9, where: ['walk', 'side', 'park', 'indoor', 'tower'], o: { shirt: '#ffffff', hair: '#3b2a1a', cap: '#1f6fff', pack: '#ffd23f', skin: '#e8b48f' }, dec: 14,
      decoy: function (h) { return h.chance(0.5) ? { kind: 'person', o: { shirt: h.pick(PAL.shirt), hair: h.pick(PAL.hair), cap: '#1f6fff', pack: h.chance(0.5) ? h.pick(['#1b1b1b', '#e63946', '#7d7d7d']) : null } } : { kind: 'person', o: { shirt: h.pick(PAL.shirt), hair: h.pick(PAL.hair), cap: h.chance(0.5) ? h.pick(['#e63946', '#1b1b1b', '#2d9a5f']) : null, pack: '#ffd23f' } }; } },
    balloon: { label: 'Red Balloon', desc: 'A loose red balloon', kind: 'balloon', r: 8, where: ['walk', 'park', 'side', 'roof', 'indoor', 'tower', 'sand'], o: { col: '#e63946' }, dec: 12,
      decoy: function (h) { return { kind: 'balloon', o: { col: h.pick(PAL.balloon) } }; } },
    umbrella: { label: 'Dot Umbrella', desc: 'A blue umbrella with white polka dots', kind: 'umbrella', r: 11, where: ['walk', 'side'], o: { col: '#1f6fff', dots: true }, dec: 10,
      decoy: function (h) { return h.chance(0.5) ? { kind: 'umbrella', o: { col: '#1f6fff', dots: false } } : { kind: 'umbrella', o: { col: h.pick(['#e63946', '#2b2d42', '#2d9a5f', '#9b5de5']), dots: true } }; } },
    cat: { label: 'Ginger Cat', desc: 'An orange striped cat', kind: 'cat', r: 9, where: ['roof', 'park', 'indoor', 'tower'], o: { col: '#f08a24', stripes: true }, dec: 10,
      decoy: function (h) { return { kind: 'cat', o: { col: h.pick(['#8d8d8d', '#2b2b2b', '#f4f4f4', '#7a5230', '#d9c7a6']), stripes: h.chance(0.4) } }; } },
    crown: { label: 'Gold Crown', desc: 'A gold crown with a red jewel', kind: 'crown', r: 9, where: ['roof', 'walk', 'park', 'indoor', 'tower', 'sand'], o: { col: '#ffc928' }, dec: 6,
      decoy: function (h) { return { kind: 'crown', o: { col: h.pick(['#c9ced6', '#d98b5f', '#c9ced6']) } }; } },
    key: { label: 'Gold Key', desc: 'A lost gold key', kind: 'key', r: 8, where: ['walk', 'side', 'park', 'lot', 'indoor', 'tower', 'sand'], o: { col: '#ffc928' }, dec: 10,
      decoy: function (h) { return { kind: 'key', o: { col: h.pick(['#c9ced6', '#b87333', '#c9ced6']) } }; } },
    duck: { label: 'Rubber Duck', desc: 'A yellow rubber duck floating in the water', kind: 'duck', r: 9, where: ['pond'], o: { col: '#ffd23f' }, dec: 10,
      decoy: function (h) { return { kind: 'duck', o: { col: h.pick(['#ffffff', '#8a6a4a', '#ffffff', '#5b4a3a']) } }; } },
    telescope: { label: 'Telescope', desc: 'A white telescope with a blue lens, on a roof', kind: 'telescope', r: 10, where: ['roof'], o: { col: '#ffffff' }, dec: 5,
      decoy: function (h) { return h.chance(0.6) ? { kind: 'dish', o: {} } : { kind: 'telescope', o: { col: '#2b2b2b' } }; } },
    flamingo: { label: 'Flamingo', desc: 'A pink lawn flamingo in a park', kind: 'flamingo', r: 9, where: ['park'], o: { col: '#ff7eb6' }, dec: 6,
      decoy: function (h) { return { kind: 'flamingo', o: { col: h.pick(['#ffffff', '#f4e3a1']) } }; } },
    plane: { label: 'Paper Plane', desc: 'A folded paper airplane', kind: 'plane', r: 9, where: ['walk', 'side', 'park', 'roof', 'indoor', 'tower'], o: {}, dec: 14,
      decoy: function () { return { kind: 'paper', o: {} }; } },
    pizza: { label: 'Pizza Box', desc: 'A pizza box with a red logo', kind: 'pizza', r: 9, where: ['roof', 'lot', 'indoor', 'tower'], o: { logo: '#e63946' }, dec: 10,
      decoy: function (h) { return { kind: 'pizza', o: { logo: h.pick(['#1f6fff', '#2d9a5f', null, null]) } }; } },
    bike: { label: 'Green Bike', desc: 'A green bicycle', kind: 'bike', r: 11, where: ['side', 'park'], o: { col: '#2d9a5f' }, dec: 6,
      decoy: function (h) { return { kind: 'bike', o: { col: h.pick(['#e63946', '#1b1b1b', '#1f6fff', '#f4a261', '#9aa1ab']) } }; } },
    ufo: { label: 'Tiny UFO', desc: 'A tiny flying saucer parked on a roof', kind: 'ufo', r: 11, where: ['roof'], o: {}, dec: 8,
      decoy: function (h) { return h.chance(0.5) ? { kind: 'dish', o: {} } : { kind: 'tank', o: { r: 9 } }; } },
    icecream: { label: 'Ice Cream', desc: 'A dropped pink ice cream cone', kind: 'icecream', r: 8, where: ['walk', 'side', 'park', 'tower'], o: { col: '#ff9ccf' }, dec: 8,
      decoy: function (h) { return { kind: 'icecream', o: { col: h.pick(['#bff0d0', '#7a5230', '#fff4d6']) } }; } },
    sneaker: { label: 'Red Sneaker', desc: 'A single red sneaker', kind: 'sneaker', r: 8, where: ['park', 'lot', 'walk', 'indoor', 'tower', 'sand'], o: { col: '#e63946' }, dec: 10,
      decoy: function (h) { return { kind: 'sneaker', o: { col: h.pick(['#1f6fff', '#1b1b1b', '#ffffff', '#2d9a5f']) } }; } },
    dog: { label: 'Lost Dog', desc: 'A brown dog with a blue collar', kind: 'dog', r: 10, where: ['park', 'side', 'indoor', 'tower'], o: { col: '#9a6a3a', collar: '#1f6fff' }, dec: 10,
      decoy: function (h) { return h.chance(0.5) ? { kind: 'dog', o: { col: '#9a6a3a', collar: h.pick(['#e63946', '#2d9a5f', null]) } } : { kind: 'dog', o: { col: h.pick(['#2b2b2b', '#f4f4f4', '#d9b382']), collar: '#1f6fff', ear: '#444' } }; } },
    bucket: { label: 'Blue Bucket', desc: 'A blue sand bucket, down in a sandbox', kind: 'bucket', r: 6, where: ['sand'], o: { col: '#1f6fff' }, dec: 10,
      decoy: function (h) { return { kind: 'bucket', o: { col: h.pick(['#e63946', '#ffd23f', '#2d9a5f', '#ff8fd1', '#9b5de5']) } }; } },
    castle: { label: 'Flag Castle', desc: 'A sand castle with a red flag on top', kind: 'castle', r: 8, where: ['sand'], o: { flag: '#e63946' }, dec: 8,
      decoy: function (h) { return { kind: 'castle', o: { flag: h.pick([null, '#1f6fff', '#ffd23f', null]) } }; } },
    truck: { label: 'Toy Truck', desc: 'A little yellow toy dump truck', kind: 'toytruck', r: 6, where: ['sand', 'indoor', 'tower'], o: { col: '#ffd23f' }, dec: 8,
      decoy: function (h) { return { kind: 'toytruck', o: { col: h.pick(['#e63946', '#1f6fff', '#2d9a5f', '#f4a261']) } }; } },
    teddy: { label: 'Teddy Bear', desc: 'A brown teddy bear wearing a red bow', kind: 'teddy', r: 8, where: ['indoor', 'tower', 'sand'], o: { col: '#9a6a3a', bow: '#e63946' }, dec: 10,
      decoy: function (h) { return h.chance(0.5) ? { kind: 'teddy', o: { col: '#9a6a3a', bow: h.pick(['#1f6fff', '#2d9a5f', null]) } } : { kind: 'teddy', o: { col: h.pick(['#f4f4f4', '#d9b382', '#5a3820']), bow: '#e63946' } }; } },
    trophy: { label: 'Gold Trophy', desc: 'A gold trophy cup, somewhere inside', kind: 'trophy', r: 8, where: ['indoor', 'tower'], o: { col: '#ffc928' }, dec: 8,
      decoy: function (h) { return { kind: 'trophy', o: { col: h.pick(['#c9ced6', '#d98b5f']) } }; } },
    guitar: { label: 'Red Guitar', desc: 'A red guitar left out on the floor', kind: 'guitar', r: 10, where: ['indoor', 'tower'], o: { col: '#e63946' }, dec: 8,
      decoy: function (h) { return { kind: 'guitar', o: { col: h.pick(['#d9b382', '#1b1b1b', '#1f6fff', '#f4a261']) } }; } },
    mug: { label: 'Red Mug', desc: 'A red coffee mug, still steaming, in an office', kind: 'mug', r: 7, where: ['indoor', 'tower'], prefer: ['office', 'meeting', 'kitchen', 'cafeteria'], o: { col: '#e63946', steam: true }, dec: 10,
      decoy: function (h) { return { kind: 'mug', o: { col: h.pick(['#1f6fff', '#ffffff', '#2d9a5f', '#e63946']), steam: false } }; } },
    laptop: { label: 'Star Laptop', desc: 'A silver laptop with a yellow sticker on the lid', kind: 'laptop', r: 9, where: ['indoor', 'tower'], prefer: ['office', 'meeting', 'lounge'], o: { sticker: '#ffd23f' }, dec: 10,
      decoy: function (h) { return { kind: 'laptop', o: { sticker: h.pick([null, '#e63946', '#1f6fff', null]) } }; } },
    stapler: { label: 'Red Stapler', desc: 'A red stapler, somebody wants it back', kind: 'stapler', r: 8, where: ['indoor', 'tower'], prefer: ['office', 'meeting'], o: { col: '#e63946' }, dec: 8,
      decoy: function (h) { return { kind: 'stapler', o: { col: h.pick(['#2b2d42', '#9aa1ab', '#1f6fff']) } }; } },
    notes: { label: 'Pink Notes', desc: 'A pad of pink sticky notes', kind: 'notes', r: 6, where: ['indoor', 'tower'], prefer: ['office', 'meeting', 'shop'], o: { col: '#ff8fd1' }, dec: 12,
      decoy: function (h) { return { kind: 'notes', o: { col: h.pick(['#ffd23f', '#90be6d', '#8ecae6', '#ffd23f']) } }; } },
    soccer: { label: 'Soccer Ball', desc: 'A black and white soccer ball', kind: 'soccer', r: 7, where: ['field', 'park', 'lot', 'walk'], o: {}, dec: 10,
      decoy: function (h) { return h.chance(0.6) ? { kind: 'volley', o: { col: h.pick(['#ffffff', '#ffd23f']) } } : { kind: 'basketball', o: {} }; } },
    hoops: { label: 'Basketball', desc: 'An orange basketball, look near the courts', kind: 'basketball', r: 7, where: ['court', 'park', 'side'], o: {}, dec: 10,
      decoy: function (h) { return h.chance(0.5) ? { kind: 'basketball', o: { col: h.pick(['#e63946', '#9a6a3a']) } } : { kind: 'volley', o: { col: '#ffffff' } }; } },
    frisbee: { label: 'Green Frisbee', desc: 'A green flying disc in a park', kind: 'frisbee', r: 7, where: ['park', 'field', 'roof'], o: { col: '#2d9a5f' }, dec: 10,
      decoy: function (h) { return { kind: 'frisbee', o: { col: h.pick(['#ff7a1a', '#1f6fff', '#e63946', '#ffffff']) } }; } },
    kite: { label: 'Rainbow Kite', desc: 'A kite with four different colors', kind: 'kite', r: 10, where: ['park', 'field', 'roof'], o: { cols: ['#e63946', '#ffd23f', '#2d9a5f', '#1f6fff'] }, dec: 8,
      decoy: function (h) { var a = h.pick(PAL.toy), b = h.pick(PAL.toy); return { kind: 'kite', o: { cols: [a, b, a, b] } }; } },
    cone: { label: 'Blue Band Cone', desc: 'A traffic cone with a blue band, the rest have white', kind: 'cone', r: 7, where: ['side', 'lot', 'walk'], o: { stripe: '#1f6fff' }, dec: 14,
      decoy: function () { return { kind: 'cone', o: { stripe: '#ffffff' } }; } },
    donut: { label: 'Sprinkle Donut', desc: 'A pink donut with sprinkles', kind: 'donut', r: 7, where: ['indoor', 'tower', 'walk', 'park', 'lot'], o: { icing: '#ff8fd1', spr: true }, dec: 10,
      decoy: function (h) { return h.chance(0.5) ? { kind: 'donut', o: { icing: '#ff8fd1', spr: false } } : { kind: 'donut', o: { icing: h.pick(['#6b3e1f', '#ffffff']), spr: true } }; } },
    banana: { label: 'Banana', desc: 'A ripe yellow banana', kind: 'banana', r: 8, where: ['indoor', 'tower', 'walk', 'roof', 'sand'], o: { col: '#ffd23f' }, dec: 8,
      decoy: function () { return { kind: 'banana', o: { col: '#90be6d' } }; } },
    pineapple: { label: 'Pineapple', desc: 'A whole pineapple', kind: 'pineapple', r: 8, where: ['roof', 'park', 'indoor', 'tower', 'sand'], o: { col: '#e9b949' }, dec: 6,
      decoy: function () { return { kind: 'coconut', o: {} }; } },
    chicken: { label: 'Rubber Chicken', desc: 'A yellow rubber chicken. Nobody knows why', kind: 'chicken', r: 9, where: ['indoor', 'tower', 'roof', 'park', 'lot', 'sand'], o: { col: '#ffd23f' }, dec: 8,
      decoy: function (h) { return { kind: 'chicken', o: { col: h.pick(['#ffffff', '#f4a261']) } }; } },
    tophat: { label: 'Top Hat', desc: 'A black top hat with a red band', kind: 'tophat', r: 8, where: ['walk', 'roof', 'indoor', 'tower', 'park'], o: { band: '#e63946' }, dec: 8,
      decoy: function (h) { return { kind: 'tophat', o: { band: h.pick(['#1f6fff', '#ffd23f', '#2b2d42']) } }; } },
    shades: { label: 'Pink Shades', desc: 'Sunglasses with pink frames', kind: 'sunglasses', r: 8, where: ['walk', 'side', 'park', 'roof', 'sand', 'indoor'], o: { col: '#ff8fd1' }, dec: 10,
      decoy: function (h) { return { kind: 'sunglasses', o: { col: h.pick(['#1b1b1b', '#ffd23f', '#1f6fff', '#1b1b1b']) } }; } },
    melon: { label: 'Melon Slice', desc: 'A slice of watermelon with seeds', kind: 'melon', r: 8, where: ['park', 'walk', 'indoor', 'tower', 'sand'], o: { col: '#ff5d73', rind: '#2d9a5f', seeds: true }, dec: 8,
      decoy: function (h) { return h.chance(0.5) ? { kind: 'melon', o: { col: '#ff5d73', rind: '#2d9a5f', seeds: false } } : { kind: 'melon', o: { col: '#f4a261', rind: '#e9e2d0', seeds: false } }; } },
    magnifier: { label: 'Magnifier', desc: 'A magnifying glass with a red handle, fitting for this game', kind: 'magnifier', r: 9, where: ['indoor', 'tower', 'roof', 'walk', 'park'], o: { col: '#e63946' }, dec: 8,
      decoy: function (h) { return { kind: 'magnifier', o: { col: h.pick(['#1b1b1b', '#9a6a3a', '#1f6fff']) } }; } },
    bird: { label: 'Bluebird', desc: 'A blue bird with a yellow chest. It flies around, so watch where it lands', kind: 'bird', r: 8, where: ['air'], o: { col: '#1f6fff', belly: '#ffd23f' }, dec: 0,
      decoy: function (h) { return { kind: 'bird', o: { col: '#1f6fff', belly: '#ffffff' } }; } },
    fish: { label: 'Goldfish Bowl', desc: 'A fishbowl with one orange goldfish', kind: 'fishbowl', r: 7, where: ['indoor', 'tower'], o: { col: '#ff8c1a' }, dec: 8,
      decoy: function (h) { return { kind: 'fishbowl', o: { col: h.pick(['#1f6fff', '#2d9a5f', '#9b5de5', '#f4f4f4']) } }; } }
  };

  var DIFF = {
    easy: { n: 8, crowd: 0.7, decoy: 0.5, label: 'Easy' },
    normal: { n: 12, crowd: 1, decoy: 1, label: 'Normal' },
    hard: { n: 18, crowd: 1.35, decoy: 1.8, label: 'Hard' }
  };

  /* the clock that live sprites (doors, birds) read; the engine sets it every frame */
  var CS_NOW = 0;
  var BIRDS = [{ col: '#e63946', belly: '#f4a261' }, { col: '#8d93a0', belly: '#d6d9de' }, { col: '#2b2b2b', belly: '#4b5260' }, { col: '#ffd23f', belly: '#ffffff' }, { col: '#1f6fff', belly: '#ffffff' }, { col: '#9a6a3a', belly: '#e9c46a' }];

  /* what each thing does when tapped: [motion, sound, word bubble] */
  var REACT = {
    car: ['jiggle', 'honk', 'HONK!'], dog: ['hop', 'bark', 'WOOF!'], cat: ['hop', 'meow', 'MEOW'], duck: ['jiggle', 'quack', 'QUACK'],
    balloon: ['pop', 'pop', 'POP!'], teddy: ['spin', 'squeak', 'SQUEAK'], person: ['jiggle', 'hey', 'HEY!'], bike: ['jiggle', 'bell', 'RING RING'],
    umbrella: ['spin', 'boing', null], crown: ['spin', 'chime', 'SHINY'], key: ['spin', 'chime', 'JINGLE'], trophy: ['spin', 'chime', 'SHINY'],
    pizza: ['jiggle', 'boing', null], sneaker: ['hop', 'squeak', null], icecream: ['jiggle', 'bloop', 'SPLAT'], fishbowl: ['jiggle', 'bloop', 'BLUB'],
    guitar: ['jiggle', 'strum', 'STRUM'], flamingo: ['hop', 'boing', null], plane: ['spin', 'whoosh', 'WHOOSH'], paper: ['spin', 'whoosh', null],
    ufo: ['hop', 'warble', 'BEEP BOOP'], castle: ['jiggle', 'crumble', null], bucket: ['hop', 'boing', null], shovel: ['jiggle', 'boing', null],
    ball: ['hop', 'boing', 'BOING'], toytruck: ['jiggle', 'beep', 'BEEP BEEP'], telescope: ['spin', 'boing', null], dish: ['spin', 'boing', null],
    skylight: ['crack', 'crash', 'CRASH'], pigeon: ['fly', 'flutter', null], tree: ['jiggle', 'rustle', null], trash: ['jiggle', 'clang', 'CLANG'],
    hydrant: ['jiggle', 'clang', null], mailbox: ['jiggle', 'beep', null], stroller: ['jiggle', 'squeak', null], piano: ['jiggle', 'strum', 'PLINK'],
    tv: ['jiggle', 'beep', null], fridge: ['jiggle', 'clang', null], rack: ['jiggle', 'beep', null], billiard: ['jiggle', 'clack', 'CLACK'],
    bird: ['jiggle', 'chirp', 'TWEET'], stall: ['jiggle', 'boing', null], bench: ['jiggle', 'clang', null],
    mug: ['jiggle', 'bloop', 'SLURP'], laptop: ['jiggle', 'beep', 'CLICK'], stapler: ['hop', 'clack', 'CHUNK'], notes: ['spin', 'whoosh', null],
    cooler: ['jiggle', 'bloop', 'GLUG'], printer: ['jiggle', 'beep', 'BRRRT'], cabinet: ['jiggle', 'clang', null],
    soccer: ['hop', 'boing', 'KICK'], volley: ['hop', 'boing', null], basketball: ['hop', 'boing', 'BOUNCE'], frisbee: ['spin', 'whoosh', 'WHOOSH'],
    kite: ['jiggle', 'whoosh', null], cone: ['jiggle', 'clang', null], hoop: ['jiggle', 'clang', 'SWISH'], donut: ['spin', 'bloop', 'YUM'],
    banana: ['spin', 'boing', null], pineapple: ['hop', 'boing', null], coconut: ['hop', 'clack', 'BONK'], chicken: ['jiggle', 'squawk', 'SQUAWK'],
    tophat: ['spin', 'chime', 'TA DA'], sunglasses: ['jiggle', 'chime', 'COOL'], melon: ['jiggle', 'bloop', 'YUM'], magnifier: ['spin', 'chime', 'AHA']
  };

  /* little synth sound effects, no sound files */
  var SFX = (function () {
    var ac = null, on = true;
    function ctx() { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; } } if (ac && ac.state === 'suspended') ac.resume(); return ac; }
    function tone(f, d, type, vol, f2, delay) {
      var a = ctx(); if (!a) return; var t = a.currentTime + (delay || 0), o = a.createOscillator(), g = a.createGain();
      o.type = type || 'sine'; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.15, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + d + 0.02);
    }
    function noise(d, freq, ftype, vol, delay) {
      var a = ctx(); if (!a) return; var t = a.currentTime + (delay || 0), n = Math.floor(a.sampleRate * d), buf = a.createBuffer(1, n, a.sampleRate), dt = buf.getChannelData(0);
      for (var i = 0; i < n; i++) dt[i] = (Math.random() * 2 - 1) * (1 - i / n);
      var s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
      s.buffer = buf; f.type = ftype || 'bandpass'; f.frequency.value = freq || 1000; g.gain.value = vol || 0.3;
      s.connect(f); f.connect(g); g.connect(a.destination); s.start(t);
    }
    var LIB = {
      honk: function () { tone(392, 0.18, 'square', 0.09); tone(494, 0.18, 'square', 0.07); tone(392, 0.22, 'square', 0.09, null, 0.24); tone(494, 0.22, 'square', 0.07, null, 0.24); },
      bark: function () { noise(0.1, 800, 'bandpass', 0.6); tone(260, 0.1, 'sawtooth', 0.12, 150); noise(0.1, 800, 'bandpass', 0.6, 0.18); tone(280, 0.1, 'sawtooth', 0.12, 160, 0.18); },
      meow: function () { tone(600, 0.18, 'sine', 0.15, 900); tone(900, 0.25, 'sine', 0.13, 480, 0.18); },
      quack: function () { tone(300, 0.11, 'sawtooth', 0.1, 210); tone(300, 0.11, 'sawtooth', 0.1, 210, 0.15); },
      pop: function () { noise(0.07, 3000, 'highpass', 0.8); tone(900, 0.06, 'square', 0.1, 120); },
      squeak: function () { tone(1300, 0.09, 'sine', 0.14, 1800); tone(1800, 0.1, 'sine', 0.12, 1200, 0.1); },
      hey: function () { tone(280, 0.16, 'triangle', 0.15, 420); },
      bell: function () { tone(2100, 0.35, 'sine', 0.1); tone(2650, 0.25, 'sine', 0.05); tone(2100, 0.35, 'sine', 0.1, null, 0.18); },
      chime: function () { tone(1046, 0.3, 'sine', 0.1); tone(1318, 0.3, 'sine', 0.1, null, 0.08); tone(1568, 0.4, 'sine', 0.1, null, 0.16); },
      boing: function () { tone(150, 0.28, 'sine', 0.18, 620); },
      bloop: function () { tone(300, 0.14, 'sine', 0.16, 820); },
      strum: function () { [196, 247, 294, 392].forEach(function (f, i) { tone(f, 0.7, 'triangle', 0.08, null, i * 0.035); }); },
      whoosh: function () { noise(0.35, 1200, 'bandpass', 0.35); },
      warble: function () { tone(400, 0.2, 'sine', 0.12, 1200); tone(1200, 0.25, 'sine', 0.12, 350, 0.2); },
      crumble: function () { noise(0.3, 300, 'lowpass', 0.6); },
      beep: function () { tone(880, 0.08, 'square', 0.07); tone(880, 0.08, 'square', 0.07, null, 0.14); },
      crash: function () { noise(0.45, 4000, 'highpass', 0.6); for (var i = 0; i < 6; i++) tone(2000 + Math.random() * 3000, 0.12, 'triangle', 0.05, null, Math.random() * 0.25); },
      flutter: function () { for (var i = 0; i < 7; i++) noise(0.035, 1500, 'bandpass', 0.4, i * 0.045); },
      rustle: function () { noise(0.4, 2500, 'bandpass', 0.25); },
      clang: function () { tone(520, 0.3, 'square', 0.05, 480); tone(1310, 0.25, 'triangle', 0.06); },
      clack: function () { noise(0.03, 2500, 'bandpass', 0.8); noise(0.03, 2500, 'bandpass', 0.6, 0.09); },
      chirp: function () { tone(2600, 0.07, 'sine', 0.1, 3600); tone(2800, 0.07, 'sine', 0.1, 3800, 0.1); },
      squawk: function () { tone(900, 0.16, 'sawtooth', 0.08, 450); tone(1000, 0.2, 'sawtooth', 0.08, 380, 0.2); },
      creak: function () { tone(110, 0.45, 'sawtooth', 0.04, 190); },
      found: function () { tone(784, 0.15, 'sine', 0.12); tone(1175, 0.3, 'sine', 0.12, null, 0.1); },
      miss: function () { tone(150, 0.12, 'triangle', 0.08, 120); }
    };
    return { play: function (k) { if (on && LIB[k]) try { LIB[k](); } catch (e) { } }, set: function (v) { on = !!v; if (on) ctx(); } };
  })();
