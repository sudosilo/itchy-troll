/* City Seek v3. Shared scripts load in order: art, world, engine. */
'use strict';
  /* world container with a spatial grid; every item remembers when it shows (sh) or hides (hd) by zoom */
  function makeWorld(W, H) {
    var CELL = 400, GW = Math.ceil(W / CELL), GH = Math.ceil(H / CELL), items = [], grid = [];
    for (var g = 0; g < GW * GH; g++) grid.push([]);
    var w = { W: W, H: H, CELL: CELL, GW: GW, GH: GH, items: items, grid: grid, cur: { sh: 0, hd: 0 } };
    w.add = function (x0, y0, x1, y1, L, f, dot) {
      var id = items.length; items.push({ x0: x0, y0: y0, x1: x1, y1: y1, L: L, f: f, dot: dot || null, sh: w.cur.sh, hd: w.cur.hd });
      var cx0 = Math.max(0, Math.floor(x0 / CELL)), cx1 = Math.min(GW - 1, Math.floor(x1 / CELL));
      var cy0 = Math.max(0, Math.floor(y0 / CELL)), cy1 = Math.min(GH - 1, Math.floor(y1 / CELL));
      for (var cy = cy0; cy <= cy1; cy++) for (var cx = cx0; cx <= cx1; cx++) grid[cy * GW + cx].push(id);
      return id;
    };
    w.mk = function (kind, x, y, o, rot) { return function (c) { c.save(); c.translate(x, y); if (rot) c.rotate(rot); SP[kind](c, o); c.restore(); }; };
    w.spr = function (kind, x, y, rot, o, L, rad, dot) { var id = w.add(x - rad, y - rad, x + rad, y + rad, L, w.mk(kind, x, y, o, rot), dot), it = items[id]; it.k = kind; it.cx = x; it.cy = y; return id; };
    return w;
  }

  function personMaker(w, h, D) {
    return function (x, y, rot, extra, L) {
      var o = { shirt: h.pick(PAL.shirt), hair: h.pick(PAL.hair), skin: h.pick(PAL.skin) };
      if (h.chance(0.2)) o.cap = h.pick(PAL.cap);
      else if (h.chance(0.06)) o.sun = h.pick(PAL.sun);
      else if (h.chance(0.14)) o.bun = true;
      if (h.chance(0.18)) o.pack = h.pick(PAL.pack);
      if (o.cap === '#1f6fff' && o.pack === '#ffd23f') o.pack = '#1b1b1b';
      if (h.chance(0.05 * D.decoy)) o.bal = h.pick(PAL.balloon);
      if (extra) for (var k in extra) o[k] = extra[k];
      if (o.umb === '#1f6fff' && o.dots) o.dots = false;
      w.spr('person', x, y, rot, o, L || 3, o.umb ? 12 : (o.bal ? 24 : 10), o.umb || o.shirt);
    };
  }
  function withSkin(h, kind, o) {
    if (kind !== 'person' || o.skin) return o;
    var n = { skin: h.pick(PAL.skin) }; for (var k in o) n[k] = o[k]; return n;
  }

  /* rooms */
  function roomsOf(h, x0, y0, x1, y1, min, stopP) {
    if (stopP == null) stopP = 0.22;
    var out = [];
    (function split(a, b, c2, d, dep) {
      var w = c2 - a, hh = d - b, m;
      if ((w < min * 2 && hh < min * 2) || dep > 4 || (dep > 1 && h.chance(stopP))) { out.push({ x0: a, y0: b, x1: c2, y1: d }); return; }
      if (w >= hh && w >= min * 2) { m = a + w * h.rnd(0.38, 0.62); split(a, b, m, d, dep + 1); split(m, b, c2, d, dep + 1); }
      else if (hh >= min * 2) { m = b + hh * h.rnd(0.38, 0.62); split(a, b, c2, m, dep + 1); split(a, m, c2, d, dep + 1); }
      else out.push({ x0: a, y0: b, x1: c2, y1: d });
    })(x0, y0, x1, y1, 0);
    return out;
  }

  function roomCtx(w, h, person, r, L) {
    var x = { h: h, x0: r.x0, y0: r.y0, x1: r.x1, y1: r.y1, rw: r.x1 - r.x0, rh: r.y1 - r.y0, cx: (r.x0 + r.x1) / 2, cy: (r.y0 + r.y1) / 2, boxes: [], LF: L + 0.3, LP: L + 0.5 };
    x.fits = function (cx, cy, bw, bh, m) {
      if (cx - bw / 2 < x.x0 + m || cx + bw / 2 > x.x1 - m || cy - bh / 2 < x.y0 + m || cy + bh / 2 > x.y1 - m) return false;
      for (var i = 0; i < x.boxes.length; i++) { var q = x.boxes[i]; if (Math.abs(q.x - cx) < (q.w + bw) / 2 + 3 && Math.abs(q.y - cy) < (q.h + bh) / 2 + 3) return false; }
      return true;
    };
    x.putAt = function (kind, cx, cy, bw, bh, so, rot, nobox) {
      if (!x.fits(cx, cy, bw, bh, 3)) return false;
      if (!nobox) x.boxes.push({ x: cx, y: cy, w: bw, h: bh });
      w.spr(kind, cx, cy, rot || 0, so || {}, nobox ? L + 0.25 : x.LF, Math.max(bw, bh) / 2 + 3);
      return true;
    };
    x.put = function (kind, bw, bh, so, rot, m) {
      for (var t = 0; t < 18; t++) {
        var cx = h.rnd(x.x0 + m + bw / 2, x.x1 - m - bw / 2), cy = h.rnd(x.y0 + m + bh / 2, x.y1 - m - bh / 2);
        if (x.putAt(kind, cx, cy, bw, bh, so, rot)) return { x: cx, y: cy };
      }
      return null;
    };
    x.free = function (m) {
      for (var t = 0; t < 30; t++) {
        var px = h.rnd(x.x0 + m, x.x1 - m), py = h.rnd(x.y0 + m, x.y1 - m), ok = true;
        for (var i = 0; i < x.boxes.length; i++) { var q = x.boxes[i]; if (Math.abs(q.x - px) < q.w / 2 + m && Math.abs(q.y - py) < q.h / 2 + m) { ok = false; break; } }
        if (ok) return { x: px, y: py };
      }
      return null;
    };
    x.people = function (n) { for (var i = 0; i < n; i++) { var p = x.free(8); if (p) person(p.x, p.y, h.rnd(0, TAU), null, x.LP); } };
    x.seat = function (px, py, rot, p) { if (h.chance(p)) person(px, py, rot, null, x.LP); };
    x.books = function () { return [h.pick(PAL.toy), h.pick(PAL.couch), h.pick(PAL.toy), '#ffffff', h.pick(PAL.couch)]; };
    x.shelf = function (m) { return h.chance(0.5) ? x.put('shelf', 30, 8, { w: 30, books: x.books() }, 0, m || 4) : x.put('shelf', 8, 30, { w: 30, books: x.books() }, Math.PI / 2, m || 4); };
    x.plant = function () { return x.put('plant', 12, 12, {}, 0, 4); };
    return x;
  }

  var FURN = {
    office: function (x) {
      var h = x.h, cols = Math.floor((x.rw - 14) / 40), rows = Math.floor((x.rh - 14) / 44);
      var ox = x.x0 + (x.rw - cols * 40) / 2 + 20, oy = x.y0 + (x.rh - rows * 44) / 2 + 14;
      for (var i = 0; i < rows; i++) for (var j = 0; j < cols; j++) {
        var cx = ox + j * 40, cy = oy + i * 44;
        if (!x.putAt('desk', cx, cy, 28, 14, { col: h.pick(['#c89f6e', '#e9ecef', '#d9b382']) })) continue;
        if (x.putAt('chair', cx, cy + 15, 8, 8, { col: '#3d405b' })) x.seat(cx, cy + 15, 0, 0.45);
      }
      x.plant(); if (h.chance(0.5)) x.plant();
      if (h.chance(0.5)) x.put('cooler', 14, 14, {}, 0, 4); if (h.chance(0.45)) x.put('printer', 20, 14, {}, 0, 4); if (h.chance(0.5)) x.put('cabinet', 14, 18, {}, 0, 4);
      for (var m2 = 0; m2 < h.ri(0, 3); m2++) x.put(h.pick(['mug', 'notes', 'stapler', 'laptop']), 10, 10, { col: h.pick(['#ffffff', '#1f6fff', '#2b2d42', '#ffd23f']), sticker: null }, h.rnd(0, TAU), 6);
    },
    meeting: function (x) {
      var h = x.h, tw = Math.max(30, Math.min(x.rw - 50, 120)), th = Math.max(20, Math.min(x.rh - 50, 40));
      if (!x.putAt('dtable', x.cx, x.cy, tw, th, { w: tw, h: th, col: '#8b5e3c' })) { FURN.living(x); return; }
      var n = Math.max(1, Math.floor(tw / 16));
      for (var i = 0; i < n; i++) {
        var px = n > 1 ? x.cx - tw / 2 + 8 + i * (tw - 16) / (n - 1) : x.cx;
        if (x.putAt('chair', px, x.cy - th / 2 - 7, 8, 8, { col: '#577590' }, Math.PI)) x.seat(px, x.cy - th / 2 - 7, Math.PI, 0.5);
        if (x.putAt('chair', px, x.cy + th / 2 + 7, 8, 8, { col: '#577590' }, 0)) x.seat(px, x.cy + th / 2 + 7, 0, 0.5);
      }
      var bw = Math.min(60, x.rw - 24); if (bw > 20) x.putAt('whiteboard', x.cx, x.y0 + 7, bw, 3.2, { w: bw }, 0, true);
      x.plant();
    },
    kitchen: function (x) {
      var h = x.h, cw = Math.min(x.rw - 34, 100);
      if (cw > 20) x.putAt('counter', x.x0 + 6 + cw / 2, x.y0 + 12, cw, 14, { w: cw, h: 14, sink: true, stove: cw > 54 });
      x.putAt('fridge', x.x1 - 12, x.y0 + 12, 13, 13, {});
      var p = x.put('dtable', 20, 20, { w: 18, h: 18, round: true }, 0, 18);
      if (p) {
        if (x.putAt('chair', p.x - 14, p.y, 8, 8, {}, Math.PI / 2)) x.seat(p.x - 14, p.y, Math.PI / 2, 0.35);
        if (x.putAt('chair', p.x + 14, p.y, 8, 8, {}, -Math.PI / 2)) x.seat(p.x + 14, p.y, -Math.PI / 2, 0.35);
      }
      x.people(h.ri(0, 1));
    },
    living: function (x) {
      var h = x.h, rw = Math.min(x.rw - 30, 70), rh = Math.min(x.rh - 30, 46);
      if (rw > 20 && rh > 16) x.putAt('rug', x.cx, x.cy, rw, rh, { w: rw, h: rh, col: h.pick(PAL.rug), round: h.chance(0.3) }, 0, true);
      var cw = Math.min(40, x.rw - 20);
      if (cw > 20 && x.putAt('couch', x.cx, x.y1 - 12, cw, 13, { w: cw, col: h.pick(PAL.couch) })) x.seat(x.cx + h.rnd(-8, 8), x.y1 - 13, 0, 0.5);
      x.putAt('tv', x.cx, x.y0 + 7, 24, 4, {});
      x.put('dtable', 12, 12, { w: 11, h: 11, round: true }, 0, 16);
      x.plant(); x.shelf();
      if (h.chance(0.25)) x.put('piano', 30, 18, {}, 0, 6);
      x.people(h.ri(0, 1));
    },
    bedroom: function (x) {
      var h = x.h, bx = h.chance(0.5) ? x.x0 + 18 : x.cx;
      x.putAt('bed', bx, x.y0 + 22, 24, 34, { w: 24, h: 34, col: h.pick(PAL.blanket) });
      if (x.rw > 90 && h.chance(0.4)) x.putAt('bed', bx + 36, x.y0 + 22, 24, 34, { w: 24, h: 34, col: h.pick(PAL.blanket) });
      var rw = Math.min(40, x.rw - 30); if (rw > 16) x.put('rug', rw, 22, { w: rw, h: 20, col: h.pick(PAL.rug) }, 0, 10);
      x.shelf(); x.plant();
      if (h.chance(0.4)) x.put('ball', 7, 7, { col: h.pick(PAL.toy) }, 0, 8);
      if (h.chance(0.3)) x.put('toytruck', 8, 11, { col: h.pick(['#e63946', '#1f6fff', '#2d9a5f']) }, h.rnd(0, TAU), 8);
      x.people(h.ri(0, 1));
    },
    bath: function (x) {
      x.putAt('tub', x.x0 + 12, x.y0 + 19, 16, 30, {});
      x.putAt('toilet', x.x1 - 10, x.y0 + 10, 8, 12, {});
      x.put('counter', 22, 10, { w: 22, h: 10, sink: true }, 0, 4);
      x.plant();
    },
    gym: function (x) {
      var h = x.h;
      for (var xx = x.x0 + 14; xx < x.x1 - 14; xx += 20) if (x.putAt('treadmill', xx, x.y0 + 20, 14, 30, {})) x.seat(xx, x.y0 + 16, 0, 0.5);
      for (var k = 0; k < h.ri(1, 4); k++) x.put('mat', 12, 28, { col: h.pick(['#1f6fff', '#9b5de5', '#2a9d8f', '#e63946']) }, 0, 6);
      for (var j = 0; j < h.ri(1, 3); j++) x.put('weights', 26, 8, {}, h.chance(0.5) ? 0 : Math.PI / 2, 6);
      x.people(h.ri(1, 3));
    },
    cafeteria: function (x) {
      var h = x.h, cw = Math.min(x.rw - 30, 140);
      if (cw > 20) x.putAt('counter', x.cx, x.y0 + 12, cw, 14, { w: cw, h: 14 });
      for (var yy = x.y0 + 50; yy < x.y1 - 22; yy += 52) for (var xx = x.x0 + 30; xx < x.x1 - 22; xx += 54) {
        if (!x.putAt('dtable', xx, yy, 20, 20, { w: 20, h: 20, round: true, col: '#ffffff' })) continue;
        [[0, -15, Math.PI], [0, 15, 0], [-15, 0, Math.PI / 2], [15, 0, -Math.PI / 2]].forEach(function (s) {
          if (x.putAt('chair', xx + s[0], yy + s[1], 8, 8, { col: '#e63946' }, s[2])) x.seat(xx + s[0], yy + s[1], s[2], 0.45);
        });
      }
      x.plant(); x.people(h.ri(1, 3));
    },
    servers: function (x) {
      var h = x.h;
      for (var yy = x.y0 + 20; yy < x.y1 - 16; yy += 38) for (var xx = x.x0 + 12; xx < x.x1 - 10; xx += 16) x.putAt('rack', xx, yy, 14, 24, { k: h.ri(0, 9) });
      x.people(h.ri(0, 1));
    },
    storage: function (x) {
      var h = x.h, n = Math.min(40, Math.round(x.rw * x.rh / 700));
      for (var i = 0; i < n; i++) x.put('box', 10, 10, {}, 0, 4);
      x.people(h.ri(0, 1));
    },
    lounge: function (x) {
      var h = x.h;
      x.put('billiard', 28, 46, {}, h.chance(0.5) ? 0 : Math.PI / 2, 14);
      var rw = Math.min(x.rw - 40, 70), rh = Math.min(x.rh - 40, 44);
      if (rw > 20 && rh > 16) x.put('rug', rw, rh, { w: rw, h: rh, col: h.pick(PAL.rug), round: h.chance(0.4) }, 0, 8);
      x.put('couch', 34, 13, { w: 34, col: h.pick(PAL.couch) }, 0, 6);
      x.put('couch', 34, 13, { w: 34, col: h.pick(PAL.couch) }, 0, 6);
      if (h.chance(0.4)) x.put('piano', 30, 18, {}, 0, 6);
      x.plant(); x.plant(); x.shelf();
      x.people(h.ri(1, 3));
    },
    shop: function (x) {
      var h = x.h, sw = Math.min(70, x.rw - 36);
      if (sw > 20) for (var yy = x.y0 + 18; yy < x.y1 - 40; yy += 26) x.putAt('shelf', x.cx, yy, sw, 8, { w: sw, books: x.books() });
      var cw = Math.min(50, x.rw - 30); if (cw > 16) x.putAt('counter', x.x0 + 8 + cw / 2, x.y1 - 14, cw, 12, { w: cw, h: 12 });
      x.plant(); x.people(h.ri(1, 3));
    },
    lobby: function (x) {
      var h = x.h, area = x.rw * x.rh, rw = Math.min(170, x.rw * 0.4);
      for (var gx = x.x0 + 120; gx < x.x1 - 60; gx += 220) for (var gy = x.y0 + 110; gy < x.y1 - 60; gy += 220) x.putAt('column', gx, gy, 16, 16, {});
      x.putAt('reception', x.cx, x.y1 - 50, 90, 14, { w: 90 });
      x.putAt('chair', x.cx - 20, x.y1 - 34, 8, 8, {}, Math.PI); x.seat(x.cx - 20, x.y1 - 34, Math.PI, 0.9);
      x.putAt('chair', x.cx + 20, x.y1 - 34, 8, 8, {}, Math.PI); x.seat(x.cx + 20, x.y1 - 34, Math.PI, 0.6);
      for (var g = 0; g < 4; g++) x.putAt('gate', x.x0 + 18, x.cy - 60 + g * 26, 26, 6, {});
      x.putAt('rug', x.cx, x.cy - 20, rw, rw * 0.6, { w: rw, h: rw * 0.6, col: h.pick(PAL.rug), round: true }, 0, true);
      if (x.rw > 400) x.putAt('fountain', x.cx, x.cy - 20, 70, 70, { r: 34 });
      for (var k = 0; k < Math.round(area / 32000); k++) {
        var p = x.free(50);
        if (!p || !x.fits(p.x, p.y, 92, 92, 3)) continue;
        x.putAt('rug', p.x, p.y, 70, 50, { w: 70, h: 50, col: h.pick(PAL.rug) }, 0, true);
        x.putAt('couch', p.x, p.y - 30, 36, 13, { w: 36, col: h.pick(PAL.couch) }, Math.PI); x.seat(p.x - 8, p.y - 30, Math.PI, 0.5);
        x.putAt('couch', p.x, p.y + 30, 36, 13, { w: 36, col: h.pick(PAL.couch) }); x.seat(p.x + 8, p.y + 30, 0, 0.5);
        x.putAt('plant', p.x + 46, p.y, 12, 12, {});
      }
      var kp = x.put('counter', 70, 16, { w: 70, h: 16, sink: true }, 0, 40);
      if (kp) for (var t = 0; t < 4; t++) { var q = x.put('dtable', 18, 18, { w: 16, h: 16, round: true, col: '#ffffff' }, 0, 30); if (q && x.putAt('chair', q.x, q.y + 13, 8, 8, { col: '#2a9d8f' })) x.seat(q.x, q.y + 13, 0, 0.6); }
      for (var b = 0; b < Math.round(area / 60000); b++) x.put('bench', 22, 8, {}, 0, 20);
      for (var pl = 0; pl < Math.round(area / 14000); pl++) x.plant();
      x.people(Math.round(area / 9000));
    },
    core: function (x) {
      var h = x.h;
      for (var i = 0; i < 3; i++) x.putAt('elev', x.x0 + 14, x.y0 + 34 + i * 44, 18, 28, { w: 18, h: 28 });
      x.putAt('stairs', x.cx, x.y1 - 30, 40, 40, { w: 40, h: 40 });
      x.plant(); x.people(h.ri(1, 3));
    }
  };
  var FLOORSTYLE = { office: 'carpet', meeting: 'carpet', kitchen: 'tile', living: 'wood', bedroom: 'wood', bath: 'tile', gym: 'carpet', cafeteria: 'tile', servers: 'tile', storage: 'tile', lounge: 'wood', shop: 'tile', lobby: 'tile', core: 'tile' };
  var KINDS = {
    house: ['living', 'bedroom', 'kitchen', 'bath', 'bedroom'],
    office: ['office', 'meeting', 'office', 'kitchen'],
    shop: ['shop', 'storage', 'shop'],
    cafe: ['cafeteria', 'kitchen'],
    gym: ['gym', 'lounge', 'bath']
  };
  var FLOORS = {
    Offices: KINDS.office, Apartments: KINDS.house, Gym: KINDS.gym, Cafeteria: KINDS.cafe,
    'Server Room': ['servers', 'servers', 'storage'], Storage: ['storage', 'storage', 'office'],
    Lounge: ['lounge', 'living', 'kitchen'], Penthouse: ['lounge', 'living', 'bedroom', 'kitchen', 'bath', 'bedroom']
  };
  var FLOOR_MID = ['Offices', 'Apartments', 'Gym', 'Cafeteria', 'Server Room', 'Storage', 'Lounge', 'Offices', 'Apartments'];

  function typeRooms(h, rooms, list) {
    rooms.sort(function (a, b) { return (b.x1 - b.x0) * (b.y1 - b.y0) - (a.x1 - a.x0) * (a.y1 - a.y0); });
    rooms.forEach(function (r, i) { if (!r.type) r.type = i < list.length ? list[i] : h.pick(list); });
    return rooms;
  }


  function clutterHome(x) {
    var h = x.h, k = h.R();
    if (k < 0.25) x.plant();
    else if (k < 0.45) x.shelf(6);
    else if (k < 0.6) x.put('rug', 40, 26, { w: 40, h: 26, col: h.pick(PAL.rug), round: h.chance(0.4) }, 0, 10);
    else if (k < 0.75) { var p = x.put('dtable', 18, 18, { w: 16, h: 16, round: true }, 0, 18); if (p && x.putAt('chair', p.x, p.y + 13, 8, 8, {})) x.seat(p.x, p.y + 13, 0, 0.4); }
    else if (k < 0.87) x.put('couch', 34, 13, { w: 34, col: h.pick(PAL.couch) }, h.chance(0.5) ? 0 : Math.PI, 8);
    else x.put('ball', 7, 7, { col: h.pick(PAL.toy) }, 0, 8);
  }
  function clutterWork(x) {
    var h = x.h, k = h.R();
    if (k < 0.3) x.plant();
    else if (k < 0.5) x.shelf(6);
    else if (k < 0.7) x.put('box', 10, 10, {}, 0, 6);
    else if (k < 0.8) x.put('counter', 30, 12, { w: 30, h: 12 }, 0, 8);
    else if (k < 0.86) x.put('cabinet', 14, 18, {}, 0, 6);
    else if (k < 0.92) x.put('cooler', 14, 14, {}, 0, 6);
    else x.put('dtable', 16, 16, { w: 14, h: 14, round: true, col: '#ffffff' }, 0, 14);
  }
  var CLUTTER = { living: clutterHome, bedroom: clutterHome, lounge: clutterHome, kitchen: clutterWork, office: clutterWork, meeting: clutterWork, gym: clutterWork, cafeteria: clutterWork, shop: clutterWork };

  function furnishRooms(w, h, person, D, rooms, o) {
    var prev = w.cur; w.cur = { sh: o.sh || 0, hd: 0 };
    var L = o.L, ow = o.outer, lw = o.wall, dw = o.door;
    rooms.forEach(function (r) {
      var fl = FLOORSTYLE[r.type] || 'wood', col = h.pick(PAL[fl]); r.fcol = col;
      w.add(r.x0, r.y0, r.x1, r.y1, L, function (c) {
        c.fillStyle = col; c.fillRect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0);
        c.lineWidth = 0.6; c.beginPath();
        if (fl === 'wood') { c.strokeStyle = 'rgba(120,90,50,.2)'; for (var y = r.y0 + 7; y < r.y1; y += 7) { c.moveTo(r.x0, y); c.lineTo(r.x1, y); } }
        else if (fl === 'tile') { c.strokeStyle = 'rgba(26,26,46,.09)'; for (var x = r.x0 + 12; x < r.x1; x += 12) { c.moveTo(x, r.y0); c.lineTo(x, r.y1); } for (var yy = r.y0 + 12; yy < r.y1; yy += 12) { c.moveTo(r.x0, yy); c.lineTo(r.x1, yy); } }
        c.stroke();
      });
    });
    w.add(ow[0] - lw, ow[1] - lw, ow[2] + lw, ow[3] + lw, L + 0.15, function (c) {
      c.lineWidth = lw; c.strokeStyle = INK;
      rooms.forEach(function (r) { c.strokeRect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0); });
      c.lineWidth = lw * 1.8; c.strokeRect(ow[0], ow[1], ow[2] - ow[0], ow[3] - ow[1]);
    });
    var doors = [];
    rooms.forEach(function (r) {
      var sides = [];
      if (r.y0 > ow[1] + 1 && r.x1 - r.x0 > dw + 14) sides.push(0);
      if (r.y1 < ow[3] - 1 && r.x1 - r.x0 > dw + 14) sides.push(1);
      if (r.x0 > ow[0] + 1 && r.y1 - r.y0 > dw + 14) sides.push(2);
      if (r.x1 < ow[2] - 1 && r.y1 - r.y0 > dw + 14) sides.push(3);
      var n = Math.min(sides.length, h.chance(0.45) ? 2 : 1);
      for (var k = 0; k < n; k++) {
        var s = sides.splice(Math.floor(h.R() * sides.length), 1)[0];
        var a = s < 2 ? h.rnd(r.x0 + 7 + dw / 2, r.x1 - 7 - dw / 2) : h.rnd(r.y0 + 7 + dw / 2, r.y1 - 7 - dw / 2);
        doors.push({ s: s, a: a, l: s === 0 ? r.y0 : s === 1 ? r.y1 : s === 2 ? r.x0 : r.x1, col: r.fcol });
      }
    });
    w.add(ow[0], ow[1], ow[2], ow[3], L + 0.2, function (c) {
      doors.forEach(function (d) {
        c.fillStyle = d.col;
        if (d.s < 2) c.fillRect(d.a - dw / 2, d.l - lw, dw, lw * 2); else c.fillRect(d.l - lw, d.a - dw / 2, lw * 2, dw);
      });
    });
    rooms.forEach(function (r) {
      var x = roomCtx(w, h, person, { x0: r.x0 + lw, y0: r.y0 + lw, x1: r.x1 - lw, y1: r.y1 - lw }, L);
      (FURN[r.type] || FURN.living)(x);
      if (CLUTTER[r.type]) for (var cl = 0; cl < Math.round(x.rw * x.rh / 11000); cl++) CLUTTER[r.type](x);
      x.people(Math.round(x.rw * x.rh / 16000 * D.crowd * (o.crowd || 1)));
      for (var k = 0; k < 3; k++) { var p = x.free(9); if (p) o.spots.push({ x: p.x, y: p.y, sh: o.sh || 0, rt: r.type }); }
    });
    w.cur = prev;
  }

  function build(seed, dk) {
    var D = DIFF[dk] || DIFF.normal;
    var h = rng(seed), R = h.R, rnd = h.rnd, ri = h.ri, pick = h.pick, chance = h.chance;
    var W = 4800, H = 3600, ST = 84, SW = 28;
    var w = makeWorld(W, H), add = w.add, spr = w.spr, mk = w.mk;
    var person = personMaker(w, h, D);
    var spots = { walk: [], side: [], park: [], pond: [], roof: [], lot: [], indoor: [], sand: [], field: [], court: [] };
    var towers = [];

    function spans(total) {
      var out = [], p = ST;
      while (p < total - ST - 200) {
        var sw = Math.round(rnd(440, 760));
        if (p + sw > total - ST - 320) sw = total - ST - p;
        out.push([p, p + sw]); p += sw + ST;
      }
      return out;
    }

    add(0, 0, W, H, 0, function (c) { c.fillStyle = '#a3abb6'; c.fillRect(0, 0, W, H); });

    var BX = spans(W), BY = spans(H);
    var VX = [0].concat(BX.map(function (b) { return b[1]; }));
    var HY = [0].concat(BY.map(function (b) { return b[1]; }));

    function streetSeg(p, a, b, v) {
      var mid = p + ST / 2;
      add(v ? p : a, v ? a : p, v ? p + ST : b, v ? b : p + ST, 1, function (c) {
        c.fillStyle = '#f6f1e3';
        for (var t = a + 30; t < b - 40; t += 56) { if (v) c.fillRect(mid - 2, t, 4, 26); else c.fillRect(t, mid - 2, 26, 4); }
        c.fillStyle = 'rgba(255,255,255,.92)';
        for (var k = p + 8; k < p + ST - 8; k += 11) {
          if (v) { c.fillRect(k, a + 4, 6, 16); c.fillRect(k, b - 20, 6, 16); }
          else { c.fillRect(a + 4, k, 16, 6); c.fillRect(b - 20, k, 16, 6); }
        }
      });
      if (chance(0.12) && b - a > 200) { var cz = rnd(a + 60, b - 100); for (var ci = 0; ci < 4; ci++) { var ct2 = cz + ci * 22; spr('cone', v ? p + ST * 0.5 : ct2, v ? ct2 : p + ST * 0.5, 0, { stripe: '#ffffff' }, 3, 7); } }
      [0.28, 0.72].forEach(function (lane) {
        var t = a + 40 + rnd(0, 80);
        while (t < b - 40) {
          if (chance(0.45 * D.crowd + 0.12)) {
            var taxi = chance(0.08), col = taxi ? '#ffd23f' : pick(PAL.car);
            var cx = v ? p + ST * lane : t, cy = v ? t : p + ST * lane;
            var rot = v ? (lane < 0.5 ? Math.PI : 0) : (lane < 0.5 ? Math.PI / 2 : -Math.PI / 2);
            spr('car', cx, cy, rot, { col: col, taxi: taxi }, 3, 24, col);
          }
          t += rnd(60, 150);
        }
      });
    }
    VX.forEach(function (sx) { BY.forEach(function (s) { streetSeg(sx, s[0], s[1], true); }); });
    HY.forEach(function (sy) { BX.forEach(function (s) { streetSeg(sy, s[0], s[1], false); }); });

    function sidewalk(x0, y0, x1, y1) {
      add(x0, y0, x1, y1, 0, function (c) { c.fillStyle = '#ece5d4'; c.fillRect(x0, y0, x1 - x0, y1 - y0); c.strokeStyle = '#8b8578'; c.lineWidth = 2; c.strokeRect(x0, y0, x1 - x0, y1 - y0); });
      var per = 2 * ((x1 - x0) + (y1 - y0)), n = Math.round(per / 52 * D.crowd);
      function edgePoint(off) {
        var side = ri(0, 3), x, y, rot;
        if (side === 0) { x = rnd(x0 + 8, x1 - 8); y = y0 + off; rot = chance(0.5) ? Math.PI / 2 : -Math.PI / 2; }
        else if (side === 1) { x = rnd(x0 + 8, x1 - 8); y = y1 - off; rot = chance(0.5) ? Math.PI / 2 : -Math.PI / 2; }
        else if (side === 2) { y = rnd(y0 + 8, y1 - 8); x = x0 + off; rot = chance(0.5) ? 0 : Math.PI; }
        else { y = rnd(y0 + 8, y1 - 8); x = x1 - off; rot = chance(0.5) ? 0 : Math.PI; }
        return { x: x, y: y, rot: rot, side: side };
      }
      for (var i = 0; i < n; i++) {
        var e = edgePoint(rnd(7, SW - 7)), ex = null;
        if (chance(0.045)) ex = { umb: pick(PAL.umb), dots: chance(0.3) };
        else if (chance(0.03)) ex = { hard: true, vest: true, shirt: '#ff8c1a' };
        person(e.x, e.y, e.rot + rnd(-0.35, 0.35), ex);
        if (chance(0.03)) { var st = edgePoint(rnd(9, SW - 9)); spr('stroller', st.x, st.y, st.rot, { col: pick(PAL.couch) }, 3, 11); person(st.x + Math.cos(st.rot + Math.PI / 2) * 13, st.y + Math.sin(st.rot + Math.PI / 2) * 13, st.rot); }
      }
      for (var lx = x0 + 60; lx < x1 - 40; lx += 150) { spr('lamp', lx, y0 + 5, 0, {}, 3, 3); spr('lamp', lx, y1 - 5, 0, {}, 3, 3); }
      for (var ly = y0 + 60; ly < y1 - 40; ly += 150) { spr('lamp', x0 + 5, ly, 0, {}, 3, 3); spr('lamp', x1 - 5, ly, 0, {}, 3, 3); }
      var racks = ri(0, 2);
      for (var r = 0; r < racks; r++) {
        var horiz = chance(0.5), bx = horiz ? rnd(x0 + 60, x1 - 120) : (chance(0.5) ? x0 + 14 : x1 - 14), by = horiz ? (chance(0.5) ? y0 + 14 : y1 - 14) : rnd(y0 + 60, y1 - 120);
        var cnt = ri(2, 5);
        for (var b = 0; b < cnt; b++) spr('bike', horiz ? bx + b * 10 : bx, horiz ? by : by + b * 10, horiz ? 0 : Math.PI / 2, { col: pick(['#e63946', '#1b1b1b', '#1f6fff', '#f4a261', '#9aa1ab']) }, 3, 12, '#555');
      }
      for (var t = 0; t < 3; t++) { var tp = edgePoint(SW - 6); spr('trash', tp.x, tp.y, 0, {}, 3, 5); }
      for (var hy = 0; hy < 2; hy++) { var hp = edgePoint(SW - 5); spr('hydrant', hp.x, hp.y, 0, {}, 3, 5); }
      if (chance(0.6)) { var mp = edgePoint(SW - 6); spr('mailbox', mp.x, mp.y, mp.rot, {}, 3, 6); }
      for (var s = 0; s < 6; s++) { var sp = edgePoint(rnd(8, SW - 8)); spots.side.push({ x: sp.x, y: sp.y }); }
    }

    function tower(a, b, c2, d) {
      var tw = c2 - a, th = d - b, cx = (a + c2) / 2, cy = (b + d) / 2, n = ri(3, 6), types = ['Lobby'];
      for (var f = 1; f < n; f++) types.push(f === n - 1 && chance(0.5) ? 'Penthouse' : pick(FLOOR_MID));
      add(a, b, c2 + 34, d + 34, 1, function (c) { c.fillStyle = 'rgba(26,26,46,.24)'; c.fillRect(a + 34, b + 34, tw, th); });
      add(a, b, c2, d, 2, mk('tower', cx, cy, { w: tw, h: th, n: n }), '#cfe0f0');
      towers.push({ i: towers.length, x0: a, y0: b, x1: c2, y1: d, cx: cx, cy: cy, w: tw, h: th, n: n, types: types, name: 'Tower ' + String.fromCharCode(65 + towers.length) });
    }

    function roof(a, b, c2, d) {
      var w2 = c2 - a, h2 = d - b, col = pick(PAL.roof), tall = rnd(5, 16);
      add(a, b, c2 + tall, d + tall, 1, function (c) { c.fillStyle = 'rgba(26,26,46,.2)'; c.fillRect(a + tall, b + tall, w2, h2); });
      add(a, b, c2, d, 2, function (c) { c.fillStyle = col; c.fillRect(a, b, w2, h2); c.lineWidth = 2.4; c.strokeStyle = INK; c.strokeRect(a, b, w2, h2); c.lineWidth = 1; c.strokeStyle = 'rgba(26,26,46,.3)'; c.strokeRect(a + 6, b + 6, w2 - 12, h2 - 12); }, null);
      var seeIn = Math.min(w2, h2) >= 90;
      if (seeIn) w.cur = { sh: 0, hd: ROOF_S };
      var boxes = [];
      function place(bw, bh) {
        for (var tr = 0; tr < 14; tr++) {
          if (w2 - 28 < bw || h2 - 28 < bh) return null;
          var x = rnd(a + 14 + bw / 2, c2 - 14 - bw / 2), y = rnd(b + 14 + bh / 2, d - 14 - bh / 2);
          var ok = true;
          for (var i = 0; i < boxes.length; i++) { var q = boxes[i]; if (Math.abs(q.x - x) < (q.w + bw) / 2 + 4 && Math.abs(q.y - y) < (q.h + bh) / 2 + 4) { ok = false; break; } }
          if (ok) { boxes.push({ x: x, y: y, w: bw, h: bh }); return { x: x, y: y }; }
        }
        return null;
      }
      var area = w2 * h2, p, k;
      if (area > 40000 && Math.min(w2, h2) > 180 && chance(0.12)) { var hr = Math.min(w2, h2) * 0.3; p = place(hr * 2, hr * 2); if (p) spr('helipad', p.x, p.y, 0, { r: hr }, 3, hr); }
      if (area > 30000 && chance(0.13)) { var pw = rnd(60, Math.min(140, w2 * 0.5)), ph = rnd(40, Math.min(90, h2 * 0.4)); p = place(pw, ph); if (p) add(p.x - pw / 2, p.y - ph / 2, p.x + pw / 2, p.y + ph / 2, 3, mk('pool', p.x, p.y, { w: pw, h: ph })); }
      if (chance(0.32)) { var sw2 = Math.round(rnd(0.3, 0.5) * w2 / 9) * 9, sh = Math.round(rnd(0.2, 0.35) * h2 / 7) * 7; if (sw2 > 18 && sh > 14) { p = place(sw2, sh); if (p) add(p.x - sw2 / 2, p.y - sh / 2, p.x + sw2 / 2, p.y + sh / 2, 3, mk('solar', p.x, p.y, { w: sw2, h: sh }), '#2f5fd0'); } }
      if (chance(0.22)) { var gw = rnd(40, Math.min(120, w2 * 0.5)), gh = rnd(30, Math.min(80, h2 * 0.4)), f = []; for (k = 0; k < gw * gh / 120; k++) f.push([rnd(-gw / 2 + 4, gw / 2 - 4), rnd(-gh / 2 + 4, gh / 2 - 4), pick(PAL.flower)]); p = place(gw, gh); if (p) add(p.x - gw / 2, p.y - gh / 2, p.x + gw / 2, p.y + gh / 2, 3, mk('garden', p.x, p.y, { w: gw, h: gh, f: f }), '#9fd38a'); }
      if (chance(0.35)) { var tr2 = rnd(10, 16); p = place(tr2 * 2, tr2 * 2); if (p) spr('tank', p.x, p.y, 0, { r: tr2 }, 3, tr2); }
      var nsk = chance(0.35) ? ri(1, 3) : 0;
      for (k = 0; k < nsk; k++) { var kw = rnd(16, 34), kh = rnd(12, 24); p = place(kw, kh); if (p) { var sk = w.items[add(p.x - kw / 2, p.y - kh / 2, p.x + kw / 2, p.y + kh / 2, 3, mk('skylight', p.x, p.y, { w: kw, h: kh }))]; sk.k = 'skylight'; sk.cx = p.x; sk.cy = p.y; } }
      var nac = Math.min(7, ri(0, Math.floor(area / 9000)));
      for (k = 0; k < nac; k++) { p = place(14, 14); if (p) spr('ac', p.x, p.y, 0, {}, 3, 8, '#c9ccd2'); }
      if (chance(0.3)) { p = place(13, 13); if (p) spr('dish', p.x, p.y, 0, {}, 3, 7); }
      if (chance(0.12)) { p = place(16, 16); if (p) person(p.x, p.y, rnd(0, TAU), chance(0.4) ? { hard: true, vest: true, shirt: '#ff8c1a' } : null); }
      for (k = 0; k < 3; k++) { p = place(20, 20); if (p) { boxes.pop(); spots.roof.push({ x: p.x, y: p.y, hd: seeIn ? ROOF_S : 0 }); } }
      w.cur = { sh: 0, hd: 0 };
      if (seeIn) {
        var kp = R(), kind = kp < 0.4 ? 'house' : kp < 0.7 ? 'office' : kp < 0.85 ? 'shop' : kp < 0.95 ? 'cafe' : 'gym';
        var x0 = a + 5, y0 = b + 5, x1 = c2 - 5, y1 = d - 5;
        var rooms = typeRooms(h, roomsOf(h, x0, y0, x1, y1, 62), KINDS[kind]);
        furnishRooms(w, h, person, D, rooms, { L: 2.2, wall: 2, door: 16, sh: ROOF_S, outer: [x0, y0, x1, y1], spots: spots.indoor, crowd: 0.8 });
      }
    }

    /* outside doors that swing open now and then, and open when tapped */
    function door(l, side, glass) {
      var along = side < 2 ? rnd(l[0] + 22, l[2] - 22) : rnd(l[1] + 22, l[3] - 22);
      var px = side < 2 ? along : (side === 2 ? l[0] : l[2]), py = side < 2 ? (side === 0 ? l[1] : l[3]) : along;
      var rot = side === 0 ? Math.PI : side === 1 ? 0 : side === 2 ? Math.PI / 2 : -Math.PI / 2;
      var d = { ph: rnd(0, 20), per: rnd(7, 16), openUntil: 0, openAt: 0 };
      var id = add(px - 22, py - 22, px + 22, py + 22, 2.9, function (c) {
        var now = CS_NOW, tt = now / 1000, cyc = (tt + d.ph) % d.per, f = 0;
        if (cyc < 2.4) f = cyc < 0.35 ? cyc / 0.35 : cyc > 2.05 ? (2.4 - cyc) / 0.35 : 1;
        if (d.openUntil > now) { var e = (now - d.openAt) / 300, r2 = (d.openUntil - now) / 300; f = Math.max(f, Math.min(1, e, r2)); }
        f = f * f * (3 - 2 * f);
        c.save(); c.translate(px, py); c.rotate(rot);
        rr(c, -11, 1.5, 22, 7, 1.5); fs(c, glass ? '#d6d9de' : '#c9b49a', 0.6);
        c.fillStyle = '#3d2a1a'; c.fillRect(-8, -3.5, 16, 3.5);
        c.fillStyle = INK; c.fillRect(-10, -3.5, 2, 4); c.fillRect(8, -3.5, 2, 4);
        var a = f * 1.35, ex = -8 + Math.cos(a) * 16, ey = Math.sin(a) * 16;
        line(c, -8, 0, ex, ey, 4.2); line(c, -8, 0, ex, ey, 2.6, glass ? '#9fc6ee' : '#a8743f');
        c.restore();
      });
      var it = w.items[id]; it.k = 'door'; it.cx = px; it.cy = py; it.door = d; w.live = true;
    }

    /* birds that hop between perches: some are scenery, some are the Bluebirds you hunt */
    var perches = [], movers = [];
    function bird(o) {
      if (!perches.length) perches = spots.park.concat(spots.walk, spots.lot, spots.side, spots.roof);
      var n = ri(4, 7), pts = [pick(perches)], perch = [], fly = [];
      for (var i = 1; i < n; i++) {
        var prev = pts[i - 1], best = null;
        for (var tr = 0; tr < 20; tr++) { var q = pick(perches), dd = Math.hypot(q.x - prev.x, q.y - prev.y); if (dd > 80 && dd < 700) { best = q; break; } }
        pts.push(best || pick(perches));
      }
      var total = 0;
      for (var j = 0; j < n; j++) { var a = pts[j], b = pts[(j + 1) % n]; perch.push(rnd(4, 12)); fly.push(Math.max(2, Math.hypot(b.x - a.x, b.y - a.y) / 95)); total += perch[j] + fly[j]; }
      var m = { o: o, pts: pts.map(function (p) { return { x: p.x, y: p.y }; }), perch: perch, fly: fly, period: total, off: rnd(0, total), face: pts.map(function () { return rnd(0, TAU); }) };
      movers.push(m); w.live = true;
      return m;
    }

    function bldg(x0, y0, x1, y1) {
      add(x0, y0, x1, y1, 0, function (c) { c.fillStyle = '#b9b4a8'; c.fillRect(x0, y0, x1 - x0, y1 - y0); });
      var leaves = [];
      (function split(a, b, c2, d, dep) {
        var bw = c2 - a, bh = d - b;
        if ((bw < 260 && bh < 260) || dep > 3 || (dep > 1 && chance(0.25))) { leaves.push([a, b, c2, d]); return; }
        var gap = chance(0.35) ? 16 : 0, m;
        if (bw > bh) { m = a + bw * rnd(0.35, 0.65); split(a, b, m - gap / 2, d, dep + 1); split(m + gap / 2, b, c2, d, dep + 1); }
        else { m = b + bh * rnd(0.35, 0.65); split(a, b, c2, m - gap / 2, dep + 1); split(a, m + gap / 2, c2, d, dep + 1); }
      })(x0, y0, x1, y1, 0);
      leaves.forEach(function (l) {
        var lw = l[2] - l[0], lh = l[3] - l[1];
        var isTower = lw * lh > 48000 && Math.min(lw, lh) > 180 && towers.length < 7 && chance(0.42);
        if (isTower) tower(l[0], l[1], l[2], l[3]); else roof(l[0], l[1], l[2], l[3]);
        var sides = [];
        if (l[1] <= y0 + 1) sides.push(0); if (l[3] >= y1 - 1) sides.push(1); if (l[0] <= x0 + 1) sides.push(2); if (l[2] >= x1 - 1) sides.push(3);
        for (var dn = 0; dn < Math.min(sides.length, isTower ? 2 : 1); dn++) door(l, sides.splice(ri(0, sides.length - 1), 1)[0], isTower);
      });
    }

    function park(x0, y0, x1, y1) {
      add(x0, y0, x1, y1, 0, function (c) { c.fillStyle = '#a8d88f'; c.fillRect(x0, y0, x1 - x0, y1 - y0); c.lineWidth = 2; c.strokeStyle = '#5f8f4e'; c.strokeRect(x0, y0, x1 - x0, y1 - y0); });
      var px = rnd(x0 + (x1 - x0) * 0.35, x0 + (x1 - x0) * 0.65), py = rnd(y0 + (y1 - y0) * 0.35, y0 + (y1 - y0) * 0.65), PW = 22;
      add(x0, y0, x1, y1, 1, function (c) {
        c.fillStyle = '#efe2c4'; c.fillRect(x0, py - PW / 2, x1 - x0, PW); c.fillRect(px - PW / 2, y0, PW, y1 - y0);
        c.strokeStyle = 'rgba(120,100,60,.45)'; c.lineWidth = 1;
        c.strokeRect(x0, py - PW / 2, x1 - x0, PW); c.strokeRect(px - PW / 2, y0, PW, y1 - y0);
      });
      function onPath(x, y, m) { return Math.abs(y - py) < PW / 2 + m || Math.abs(x - px) < PW / 2 + m; }
      var pond = null;
      if (chance(0.8)) {
        var qx = chance(0.5) ? (x0 + px) / 2 : (px + x1) / 2, qy = chance(0.5) ? (y0 + py) / 2 : (py + y1) / 2;
        var rx = Math.min(rnd(60, 110), Math.abs(qx - px) - 20, Math.abs(qx - x0) - 14, Math.abs(qx - x1) - 14);
        var ry = Math.min(rnd(40, 80), Math.abs(qy - py) - 20, Math.abs(qy - y0) - 14, Math.abs(qy - y1) - 14);
        if (rx > 35 && ry > 28) {
          pond = { x: qx, y: qy, rx: rx, ry: ry };
          add(qx - rx, qy - ry, qx + rx, qy + ry, 1, function (c) { c.beginPath(); c.ellipse(qx, qy, rx, ry, 0, 0, TAU); fs(c, '#7cc4ff', 2); c.beginPath(); c.ellipse(qx, qy, rx * 0.8, ry * 0.75, 0, 0, TAU); c.lineWidth = 1; c.strokeStyle = 'rgba(255,255,255,.55)'; c.stroke(); }, '#7cc4ff');
          for (var lp = 0; lp < ri(3, 8); lp++) { var la = rnd(0, TAU), lr = rnd(0.2, 0.8); spr('lily', qx + Math.cos(la) * rx * lr, qy + Math.sin(la) * ry * lr, 0, {}, 2, 4); }
          for (var dk2 = 0; dk2 < ri(1, 4); dk2++) { var da = rnd(0, TAU), dr = rnd(0.1, 0.7); spr('duck', qx + Math.cos(da) * rx * dr, qy + Math.sin(da) * ry * dr, rnd(0, TAU), { col: pick(['#ffffff', '#8a6a4a']) }, 3, 10); }
          for (var ps = 0; ps < 6; ps++) { var pa = rnd(0, TAU), pr = rnd(0.1, 0.7); spots.pond.push({ x: qx + Math.cos(pa) * rx * pr, y: qy + Math.sin(pa) * ry * pr }); }
        }
      }
      function inPond(x, y, m) { if (!pond) return false; var dx = (x - pond.x) / (pond.rx + m), dy = (y - pond.y) / (pond.ry + m); return dx * dx + dy * dy < 1; }
      var blocked = [];
      function inBlocked(x, y, m) { for (var i = 0; i < blocked.length; i++) { var q = blocked[i]; if (Math.abs(q.x - x) < q.w / 2 + m && Math.abs(q.y - y) < q.h / 2 + m) return true; } return false; }
      function openPoint(bw, bh) {
        for (var i = 0; i < 40; i++) {
          var x = rnd(x0 + 16 + bw / 2, x1 - 16 - bw / 2), y = rnd(y0 + 16 + bh / 2, y1 - 16 - bh / 2), m = Math.max(bw, bh) / 2;
          if (!onPath(x, y, m) && !inPond(x, y, m) && !inBlocked(x, y, m)) return { x: x, y: y };
        }
        return null;
      }
      /* sports field with goals and a few players */
      if ((x1 - x0) * (y1 - y0) > 150000 && chance(0.55)) {
        var fw2 = rnd(170, 230), fh2 = rnd(110, 140), fp = openPoint(fw2 + 20, fh2 + 20);
        if (fp) {
          blocked.push({ x: fp.x, y: fp.y, w: fw2 + 20, h: fh2 + 20 });
          add(fp.x - fw2 / 2, fp.y - fh2 / 2, fp.x + fw2 / 2, fp.y + fh2 / 2, 1, function (c) {
            c.fillStyle = '#7fc46a'; c.fillRect(fp.x - fw2 / 2, fp.y - fh2 / 2, fw2, fh2);
            c.fillStyle = 'rgba(255,255,255,.12)'; for (var st = 0; st < fw2; st += 40) c.fillRect(fp.x - fw2 / 2 + st, fp.y - fh2 / 2, 20, fh2);
            c.strokeStyle = '#ffffff'; c.lineWidth = 2; c.strokeRect(fp.x - fw2 / 2 + 4, fp.y - fh2 / 2 + 4, fw2 - 8, fh2 - 8);
            c.beginPath(); c.moveTo(fp.x, fp.y - fh2 / 2 + 4); c.lineTo(fp.x, fp.y + fh2 / 2 - 4); c.stroke();
            c.beginPath(); c.arc(fp.x, fp.y, 18, 0, TAU); c.stroke();
          }, '#7fc46a');
          spr('goal', fp.x - fw2 / 2 + 6, fp.y, Math.PI / 2, { w: 30 }, 2, 16); spr('goal', fp.x + fw2 / 2 - 6, fp.y, Math.PI / 2, { w: 30 }, 2, 16);
          for (var pl2 = 0; pl2 < ri(4, 10); pl2++) person(fp.x + rnd(-fw2 / 2 + 12, fw2 / 2 - 12), fp.y + rnd(-fh2 / 2 + 12, fh2 / 2 - 12), rnd(0, TAU), { shirt: pl2 % 2 ? '#e63946' : '#1f6fff' });
          for (var fs2 = 0; fs2 < 10; fs2++) spots.field.push({ x: fp.x + rnd(-fw2 / 2 + 12, fw2 / 2 - 12), y: fp.y + rnd(-fh2 / 2 + 12, fh2 / 2 - 12) });
        }
      }
      /* playground: sandbox with toys that only show when zoomed in close, plus slide and swings */
      if (chance(0.75)) {
        var sbw = rnd(96, 128), sbh = rnd(64, 84), sp0 = openPoint(sbw + 70, sbh + 20);
        if (sp0) {
          var sx = sp0.x - 30, sy = sp0.y, specks = [];
          for (var q = 0; q < 14; q++) specks.push([rnd(-sbw / 2 + 6, sbw / 2 - 6), rnd(-sbh / 2 + 6, sbh / 2 - 6), rnd(1.5, 4)]);
          blocked.push({ x: sp0.x, y: sp0.y, w: sbw + 70, h: sbh + 20 });
          add(sx - sbw / 2, sy - sbh / 2, sx + sbw / 2, sy + sbh / 2, 2, mk('sandbox', sx, sy, { w: sbw, h: sbh, sp: specks }), '#f3dfa8');
          spr('slide', sx + sbw / 2 + 18, sy - 4, 0, {}, 3, 22);
          spr('swings', sx + sbw / 2 + 44, sy, Math.PI / 2, {}, 3, 20);
          w.cur = { sh: SAND_S, hd: 0 };
          var toys = ['bucket', 'shovel', 'ball', 'castle', 'toytruck', 'bucket', 'shovel'];
          for (var ty = 0; ty < ri(10, 16); ty++) {
            var kd = pick(toys), tx2 = sx + rnd(-sbw / 2 + 8, sbw / 2 - 8), ty2 = sy + rnd(-sbh / 2 + 8, sbh / 2 - 8), oo = { col: pick(PAL.toy) };
            if (kd === 'bucket' && oo.col === '#1f6fff') oo.col = '#2d9a5f';
            if (kd === 'castle') oo = { flag: chance(0.4) ? pick(['#1f6fff', '#ffd23f']) : null };
            if (kd === 'toytruck' && oo.col === '#ffd23f') oo.col = '#e63946';
            spr(kd, tx2, ty2, rnd(0, TAU), oo, 3, 10);
          }
          w.cur = { sh: 0, hd: 0 };
          for (var kid = 0; kid < ri(0, 2); kid++) person(sx + (chance(0.5) ? -1 : 1) * (sbw / 2 + 9), sy + rnd(-sbh / 2, sbh / 2), chance(0.5) ? Math.PI / 2 : -Math.PI / 2);
          for (var ss = 0; ss < 8; ss++) spots.sand.push({ x: sx + rnd(-sbw / 2 + 9, sbw / 2 - 9), y: sy + rnd(-sbh / 2 + 9, sbh / 2 - 9), sh: SAND_S });
        }
      }
      var trees = [], area = (x1 - x0) * (y1 - y0), nt = Math.round(area / 7000 * rnd(0.7, 1.2));
      for (var t = 0; t < nt * 3 && trees.length < nt; t++) {
        var tr = rnd(16, 32), tx = rnd(x0 + tr, x1 - tr), ty3 = rnd(y0 + tr, y1 - tr);
        if (onPath(tx, ty3, tr * 0.6) || inPond(tx, ty3, tr) || inBlocked(tx, ty3, tr)) continue;
        var ok = true; for (var qq = 0; qq < trees.length; qq++) { if (Math.hypot(trees[qq].x - tx, trees[qq].y - ty3) < trees[qq].r + tr - 8) { ok = false; break; } }
        if (!ok) continue;
        trees.push({ x: tx, y: ty3, r: tr });
        var tc = pick(PAL.tree); spr('tree', tx, ty3, 0, { r: tr, col: tc }, 4, tr + 2, tc);
      }
      function underTree(x, y, m) { for (var i = 0; i < trees.length; i++) if (Math.hypot(trees[i].x - x, trees[i].y - y) < trees[i].r + m) return true; return false; }
      function grassPoint(m) {
        for (var i = 0; i < 30; i++) { var x = rnd(x0 + 16, x1 - 16), y = rnd(y0 + 16, y1 - 16); if (!onPath(x, y, m) && !inPond(x, y, m) && !underTree(x, y, m) && !inBlocked(x, y, m)) return { x: x, y: y }; }
        return null;
      }
      for (var bn = x0 + 40; bn < x1 - 30; bn += rnd(80, 200)) if (Math.abs(bn - px) > 30) spr('bench', bn, py + (chance(0.5) ? -PW / 2 - 6 : PW / 2 + 6), 0, {}, 3, 11);
      for (var bv = y0 + 40; bv < y1 - 30; bv += rnd(80, 200)) if (Math.abs(bv - py) > 30) spr('bench', px + (chance(0.5) ? -PW / 2 - 6 : PW / 2 + 6), bv, Math.PI / 2, {}, 3, 11);
      for (var fb = 0; fb < ri(1, 4); fb++) { var gp = grassPoint(30); if (gp) { var fw = rnd(30, 60), fh = rnd(18, 34), ff = []; for (var fi = 0; fi < fw * fh / 60; fi++) ff.push([rnd(-fw / 2 + 3, fw / 2 - 3), rnd(-fh / 2 + 3, fh / 2 - 3), pick(PAL.flower)]); add(gp.x - fw / 2, gp.y - fh / 2, gp.x + fw / 2, gp.y + fh / 2, 2, mk('flowers', gp.x, gp.y, { w: fw, h: fh, f: ff }), '#7fbf5f'); } }
      for (var pc = 0; pc < ri(1, 4); pc++) { var pp = grassPoint(20); if (pp) { spr('picnic', pp.x, pp.y, 0, { col: pick(['#e63946', '#1f6fff', '#2d9a5f']) }, 2, 14); person(pp.x - 15, pp.y, Math.PI / 2); person(pp.x + 15, pp.y, -Math.PI / 2); if (chance(0.5)) person(pp.x, pp.y - 14, Math.PI); } }
      var plen = (x1 - x0) + (y1 - y0), npp = Math.round(plen / 45 * D.crowd);
      for (var i = 0; i < npp; i++) {
        var onH = chance(0.5), qx2 = onH ? rnd(x0 + 8, x1 - 8) : px + rnd(-7, 7), qy2 = onH ? py + rnd(-7, 7) : rnd(y0 + 8, y1 - 8), rot = onH ? (chance(0.5) ? Math.PI / 2 : -Math.PI / 2) : (chance(0.5) ? 0 : Math.PI);
        if (chance(0.04)) { spr('skate', qx2, qy2, rot, { col: pick(PAL.toy) }, 3, 9); person(qx2, qy2, rot); }
        else if (chance(0.04)) { spr('stroller', qx2, qy2, rot, { col: pick(PAL.couch) }, 3, 11); person(qx2 + Math.cos(rot + Math.PI / 2) * 13, qy2 + Math.sin(rot + Math.PI / 2) * 13, rot); }
        else person(qx2, qy2, rot);
      }
      for (var gpn = 0; gpn < Math.round(area / 16000 * D.crowd); gpn++) { var gq = grassPoint(8); if (gq) person(gq.x, gq.y, rnd(0, TAU)); }
      for (var dg = 0; dg < ri(1, 3); dg++) { var dp = grassPoint(14); if (dp) spr('dog', dp.x, dp.y, rnd(0, TAU), { col: pick(['#2b2b2b', '#f4f4f4', '#d9b382', '#7a5230']), collar: pick(['#e63946', '#2d9a5f', null]) }, 3, 12); }
      for (var sp = 0; sp < 10; sp++) { var s = grassPoint(14); if (s) spots.park.push(s); }
      for (var sk = 0; sk < 4; sk++) spots.walk.push({ x: rnd(x0 + 20, x1 - 20), y: py + rnd(-6, 6) });
    }

    function plaza(x0, y0, x1, y1) {
      add(x0, y0, x1, y1, 0, function (c) { c.fillStyle = '#f1ebdf'; c.fillRect(x0, y0, x1 - x0, y1 - y0); c.lineWidth = 2; c.strokeStyle = '#8b8578'; c.strokeRect(x0, y0, x1 - x0, y1 - y0); });
      add(x0, y0, x1, y1, 1, function (c) {
        c.strokeStyle = 'rgba(160,145,120,.35)'; c.lineWidth = 1; c.beginPath();
        for (var x = x0 + 40; x < x1; x += 40) { c.moveTo(x, y0); c.lineTo(x, y1); }
        for (var y = y0 + 40; y < y1; y += 40) { c.moveTo(x0, y); c.lineTo(x1, y); }
        c.stroke();
      });
      var cx = (x0 + x1) / 2 + rnd(-40, 40), cy = (y0 + y1) / 2 + rnd(-40, 40), fr = rnd(40, 64);
      spr('fountain', cx, cy, 0, { r: fr }, 2, fr, '#7cc4ff');
      for (var fp = 0; fp < 4; fp++) { var fa = rnd(0, TAU), fd = rnd(fr * 0.3, fr * 0.65); spots.pond.push({ x: cx + Math.cos(fa) * fd, y: cy + Math.sin(fa) * fd }); }
      for (var fdk = 0; fdk < ri(0, 2); fdk++) { var ga = rnd(0, TAU), gd = rnd(fr * 0.3, fr * 0.65); spr('duck', cx + Math.cos(ga) * gd, cy + Math.sin(ga) * gd, rnd(0, TAU), { col: '#ffffff' }, 3, 10); }
      var stalls = [];
      [y0 + 40, y1 - 40].forEach(function (sy) { for (var sx = x0 + 50; sx < x1 - 50; sx += 58) if (chance(0.7)) { var col = pick(PAL.stall); spr('stall', sx, sy, 0, { w: 44, h: 28, col: col }, 3, 24, col); stalls.push({ x: sx, y: sy }); } });
      [x0 + 40, x1 - 40].forEach(function (sx) { for (var sy = y0 + 110; sy < y1 - 110; sy += 58) if (chance(0.5)) { var col = pick(PAL.stall); spr('stall', sx, sy, Math.PI / 2, { w: 44, h: 28, col: col }, 3, 24, col); stalls.push({ x: sx, y: sy }); } });
      function freePoint(m) {
        for (var i = 0; i < 30; i++) {
          var x = rnd(x0 + 12, x1 - 12), y = rnd(y0 + 12, y1 - 12);
          if (Math.hypot(x - cx, y - cy) < fr + m) continue;
          var hit = false; for (var s = 0; s < stalls.length; s++) if (Math.abs(stalls[s].x - x) < 24 + m && Math.abs(stalls[s].y - y) < 24 + m) { hit = true; break; }
          if (!hit) return { x: x, y: y };
        }
        return null;
      }
      var cafes = ri(1, 3);
      for (var cf = 0; cf < cafes; cf++) { var cp = freePoint(40); if (!cp) continue; for (var ct = 0; ct < ri(3, 6); ct++) { var ux = cp.x + rnd(-40, 40), uy = cp.y + rnd(-30, 30); spr('table', ux, uy, 0, {}, 3, 6); person(ux - 9, uy, Math.PI / 2); var uc = pick(PAL.umb), ud = chance(0.35) && uc !== '#1f6fff'; spr('umbrella', ux, uy, 0, { col: uc, dots: ud, r: 13 }, 4, 14, uc); } }
      for (var fl = 0; fl < ri(1, 3); fl++) { var fq = freePoint(30); if (fq) for (var pg = 0; pg < ri(5, 12); pg++) spr('pigeon', fq.x + rnd(-24, 24), fq.y + rnd(-18, 18), rnd(0, TAU), {}, 3, 6); }
      var area = (x1 - x0) * (y1 - y0), n = Math.round(area / 1500 * D.crowd);
      for (var i = 0; i < n; i++) { var p = freePoint(4); if (p) person(p.x, p.y, rnd(0, TAU), chance(0.03) ? { umb: pick(PAL.umb), dots: chance(0.3) } : null); }
      for (var pa = 0; pa < ri(2, 6); pa++) { var pq = freePoint(6); if (pq) spr('paper', pq.x, pq.y, rnd(0, TAU), {}, 3, 7); }
      for (var ww = 0; ww < 14; ww++) { var wp = freePoint(10); if (wp) spots.walk.push(wp); }
    }

    function lot(x0, y0, x1, y1) {
      add(x0, y0, x1, y1, 0, function (c) { c.fillStyle = '#c3c8ce'; c.fillRect(x0, y0, x1 - x0, y1 - y0); c.lineWidth = 2; c.strokeStyle = '#6b7280'; c.strokeRect(x0, y0, x1 - x0, y1 - y0); });
      if (chance(0.45) && x1 - x0 > 260 && y1 - y0 > 220) {
        var cw2 = 150, ch2 = 90, cxx = x1 - cw2 / 2 - 14, cyy = y1 - ch2 / 2 - 14;
        add(cxx - cw2 / 2, cyy - ch2 / 2, cxx + cw2 / 2, cyy + ch2 / 2, 1.5, function (c) {
          c.fillStyle = '#d98b5f'; c.fillRect(cxx - cw2 / 2, cyy - ch2 / 2, cw2, ch2); c.strokeStyle = '#ffffff'; c.lineWidth = 1.6; c.strokeRect(cxx - cw2 / 2 + 4, cyy - ch2 / 2 + 4, cw2 - 8, ch2 - 8);
          c.beginPath(); c.moveTo(cxx, cyy - ch2 / 2 + 4); c.lineTo(cxx, cyy + ch2 / 2 - 4); c.stroke(); c.beginPath(); c.arc(cxx, cyy, 12, 0, TAU); c.stroke();
          c.beginPath(); c.arc(cxx - cw2 / 2 + 4, cyy, 26, -1.2, 1.2); c.stroke(); c.beginPath(); c.arc(cxx + cw2 / 2 - 4, cyy, 26, Math.PI - 1.2, Math.PI + 1.2); c.stroke();
        }, '#d98b5f');
        spr('hoop', cxx - cw2 / 2 + 6, cyy, -Math.PI / 2, {}, 3, 9); spr('hoop', cxx + cw2 / 2 - 6, cyy, Math.PI / 2, {}, 3, 9);
        for (var bp = 0; bp < ri(2, 5); bp++) person(cxx + rnd(-60, 60), cyy + rnd(-35, 35), rnd(0, TAU));
        for (var cs2 = 0; cs2 < 8; cs2++) spots.court.push({ x: cxx + rnd(-62, 62), y: cyy + rnd(-36, 36) });
        if (cyy - ch2 / 2 - 10 > y0 + 130) y1 = cyy - ch2 / 2 - 10;
      }
      for (var cn = 0; cn < ri(0, 4); cn++) spr('cone', x0 + 8, rnd(y0 + 10, y1 - 10), 0, { stripe: '#ffffff' }, 3, 7);
      var rows = [], y = y0 + 12;
      while (y + 50 < y1 - 12) { rows.push(y); y += 50; if (y + 64 < y1) { spots.lot.push({ x: rnd(x0 + 20, x1 - 20), y: y + 30 }); spots.lot.push({ x: rnd(x0 + 20, x1 - 20), y: y + 30 }); } y += 64; }
      add(x0, y0, x1, y1, 1, function (c) {
        c.strokeStyle = '#ffffff'; c.lineWidth = 1.6; c.beginPath();
        rows.forEach(function (ry) { for (var x = x0 + 12; x <= x1 - 12; x += 30) { c.moveTo(x, ry); c.lineTo(x, ry + 50); } });
        c.stroke();
      });
      rows.forEach(function (ry) { for (var x = x0 + 27; x < x1 - 12; x += 30) if (chance(0.68)) { var col = pick(PAL.car); spr('car', x, ry + 25, chance(0.5) ? 0 : Math.PI, { col: col }, 3, 24, col); } });
      for (var i = 0; i < Math.round((x1 - x0) / 80 * D.crowd); i++) { var s = pick(spots.lot.length ? spots.lot : [{ x: (x0 + x1) / 2, y: (y0 + y1) / 2 }]); person(s.x + rnd(-60, 60), s.y + rnd(-14, 14), rnd(0, TAU)); }
    }

    var blocks = [];
    BX.forEach(function (bx) { BY.forEach(function (by) { blocks.push([bx[0], by[0], bx[1], by[1]]); }); });
    var types = blocks.map(function (_, i) { return i; });
    for (var s = types.length - 1; s > 0; s--) { var j = Math.floor(R() * (s + 1)), tmp = types[s]; types[s] = types[j]; types[j] = tmp; }
    var nPark = Math.max(3, Math.round(blocks.length * 0.2)), nPlaza = Math.max(3, Math.round(blocks.length * 0.18)), nLot = Math.max(1, Math.round(blocks.length * 0.1));
    var typeOf = [];
    types.forEach(function (bi, k) { typeOf[bi] = k < nPark ? 'park' : k < nPark + nPlaza ? 'plaza' : k < nPark + nPlaza + nLot ? 'lot' : 'bldg'; });
    blocks.forEach(function (b, i) {
      sidewalk(b[0], b[1], b[2], b[3]);
      var l = [b[0] + SW, b[1] + SW, b[2] - SW, b[3] - SW];
      if (typeOf[i] === 'park') park(l[0], l[1], l[2], l[3]);
      else if (typeOf[i] === 'plaza') plaza(l[0], l[1], l[2], l[3]);
      else if (typeOf[i] === 'lot') lot(l[0], l[1], l[2], l[3]);
      else bldg(l[0], l[1], l[2], l[3]);
    });

    for (var ab = 0; ab < Math.round(46 * D.crowd); ab++) bird(pick(BIRDS));

    /* hidden items: each one picks a zone, decoys fill every zone the item can live in */
    var pool = Object.keys(TDEF);
    for (var a = pool.length - 1; a > 0; a--) { var b2 = Math.floor(R() * (a + 1)), t2 = pool[a]; pool[a] = pool[b2]; pool[b2] = t2; }
    var chosen = pool.slice(0, Math.min(D.n, pool.length));
    function tagsFor(def) { return def.where.filter(function (t) { return t === 'air' || (t === 'tower' ? towers.length > 0 : spots[t] && spots[t].length > 0); }); }

    chosen.forEach(function (id) {
      var def = TDEF[id], n = Math.round(def.dec * D.decoy), tags = tagsFor(def).filter(function (t) { return t !== 'tower' && t !== 'air'; });
      if (!tags.length) return;
      for (var i = 0; i < n; i++) {
        var sp = pick(spots[pick(tags)]), dd = def.decoy(h);
        w.cur = { sh: sp.sh || 0, hd: sp.hd || 0 };
        w.items[spr(dd.kind, sp.x + rnd(-8, 8), sp.y + rnd(-8, 8), rnd(0, TAU), withSkin(h, dd.kind, dd.o), 3, def.r + 14)].decoy = true;
      }
      w.cur = { sh: 0, hd: 0 };
    });

    var targets = [], towerTargets = towers.map(function (tw) { return tw.types.map(function () { return []; }); });
    var EACH = 10;
    chosen.forEach(function (id) {
      var def = TDEF[id], tags = tagsFor(def);
      if (!tags.length) tags = ['walk'];
      for (var k = 0; k < EACH; k++) {
        var tag = pick(tags);
        var t = { id: id, n: k, label: def.label, desc: def.desc, kind: def.kind, o: def.o, r: def.r, found: false, zone: tag };
        if (tag === 'air') { var bm = bird(def.o); bm.target = t; t.mover = bm; t.x = t.wx = bm.pts[0].x; t.y = t.wy = bm.pts[0].y; targets.push(t); continue; }
        if (tag === 'tower') {
          var ti = ri(0, towers.length - 1), tw = towers[ti], fi = ri(0, tw.n - 1);
          if (def.prefer && chance(0.8)) { var offs = []; towers.forEach(function (q, qi) { q.types.forEach(function (ty, qf) { if (ty === 'Offices' || ty === 'Cafeteria') offs.push([qi, qf]); }); }); if (offs.length) { var of = pick(offs); ti = of[0]; tw = towers[ti]; fi = of[1]; } }
          t.tower = tw; t.floor = fi; t.wx = tw.cx; t.wy = tw.cy;
          towerTargets[ti][fi].push(t); targets.push(t); continue;
        }
        var list = spots[tag].filter(function (q) { return !q.used; });
        if (def.prefer) { var pl3 = list.filter(function (q) { return def.prefer.indexOf(q.rt) >= 0; }); if (pl3.length) list = pl3; }
        if (!list.length) list = spots[tag];
        var best = null;
        for (var tr = 0; tr < 40; tr++) {
          var s = pick(list), ok = true;
          for (var i = 0; i < targets.length; i++) { var q2 = targets[i]; if (q2.tower) continue; var dd2 = Math.hypot(q2.wx - s.x, q2.wy - s.y); if (dd2 < 40 || (q2.id === id && dd2 < 280)) { ok = false; break; } }
          if (ok) { best = s; break; }
          if (!best) best = s;
        }
        best.used = true;
        t.x = t.wx = best.x; t.y = t.wy = best.y; t.sh = best.sh || 0; t.hd = best.hd || 0;
        w.cur = { sh: t.sh, hd: t.hd };
        w.items[spr(def.kind, t.x, t.y, rnd(0, TAU), def.o, 3, def.r + 16)].tgt = t;
        w.cur = { sh: 0, hd: 0 };
        targets.push(t);
      }
    });

    w.targets = targets.filter(function (t) { return !t.tower; });
    w.all = targets; w.towers = towers; w.towerTargets = towerTargets; w.movers = movers;
    w.meta = { D: D, chosen: chosen }; w.seed = seed; w.difficulty = dk;
    return w;
  }

  /* one floor of a glass tower, built the first time it is opened */
  function buildFloor(city, tw, fi) {
    var D = city.meta.D, ti = tw.i, type = tw.types[fi];
    var h = rng(((city.seed * 31 + ti * 977 + fi * 7919 + 13) >>> 0) || 1);
    var Wf = 1100, Hf = Math.round(Math.max(720, Math.min(1400, 1100 * tw.h / tw.w)));
    var w = makeWorld(Wf, Hf), person = personMaker(w, h, D), spots = [], M = 16, coreW = 110;
    w.add(0, 0, Wf, Hf, 0, function (c) { c.fillStyle = '#c9c2b0'; c.fillRect(0, 0, Wf, Hf); c.lineWidth = 10; c.strokeStyle = '#9fc6ee'; c.strokeRect(M - 6, M - 6, Wf - 2 * M + 12, Hf - 2 * M + 12); });
    var rooms = [{ x0: M, y0: M, x1: M + coreW, y1: Hf - M, type: 'core' }];
    if (type === 'Lobby') rooms.push({ x0: M + coreW, y0: M, x1: Wf - M, y1: Hf - M, type: 'lobby' });
    else rooms = rooms.concat(typeRooms(h, roomsOf(h, M + coreW, M, Wf - M, Hf - M, 105, 0.08), FLOORS[type] || KINDS.office));
    furnishRooms(w, h, person, D, rooms, { L: 1, wall: 3, door: 26, sh: 0, outer: [M, M, Wf - M, Hf - M], spots: spots, crowd: 1.3 });

    var mine = city.towerTargets[ti][fi];
    mine.forEach(function (t) {
      var def = TDEF[t.id];
      for (var i = 0; i < Math.max(2, Math.round(def.dec * D.decoy * 0.6)); i++) { var sp = h.pick(spots), dd = def.decoy(h); w.items[w.spr(dd.kind, sp.x + h.rnd(-8, 8), sp.y + h.rnd(-8, 8), h.rnd(0, TAU), withSkin(h, dd.kind, dd.o), 3, def.r + 14)].decoy = true; }
    });
    city.meta.chosen.forEach(function (id) {
      var def = TDEF[id]; if (def.where.indexOf('tower') < 0) return;
      for (var i = 0; i < h.ri(0, 2); i++) { var sp = h.pick(spots), dd = def.decoy(h); w.items[w.spr(dd.kind, sp.x + h.rnd(-8, 8), sp.y + h.rnd(-8, 8), h.rnd(0, TAU), withSkin(h, dd.kind, dd.o), 3, def.r + 14)].decoy = true; }
    });
    var placed = [];
    mine.forEach(function (t) {
      var best = null, pref = TDEF[t.id].prefer, pool2 = pref ? spots.filter(function (q) { return pref.indexOf(q.rt) >= 0; }) : spots;
      if (!pool2.length) pool2 = spots;
      for (var tr = 0; tr < 60; tr++) {
        var s = h.pick(pool2), ok = true;
        for (var i = 0; i < placed.length; i++) if (Math.hypot(placed[i].x - s.x, placed[i].y - s.y) < 60) { ok = false; break; }
        if (ok) { best = s; break; }
        if (!best) best = s;
      }
      t.x = best.x; t.y = best.y; placed.push(best);
      w.items[w.spr(t.kind, t.x, t.y, h.rnd(0, TAU), t.o, 3, t.r + 16)].tgt = t;
    });
    w.targets = mine; w.all = mine; w.isFloor = true; w.seed = city.seed; w.difficulty = city.difficulty;
    return w;
  }
