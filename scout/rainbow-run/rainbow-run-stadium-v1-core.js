/* rainbow-run-stadium-v1-core.js
   BLUE PHONE: Rainbow Run stadium mode core. Shared by the seat phones and the host screen, so the
   host preview and every phone in the stands work out the same seat spots, the same colors and the same sound.

   Layout, in meters, x to the right and y away from the stage:
     {name, sections:[{id, kind:"block"|"arc", rows, seats, grow, ...}]}
     A block section is straight rows. x and y are the middle of its front row, rot turns it in degrees,
     seatGap is the space between seats and rowGap the space between rows.
     An arc section is curved rows around a middle point x, y. r is the radius of its front row,
     a0 is the angle its first seat starts at and span how far round it reaches, both in degrees.
     rows is how many rows, seats how many seats in the front row, grow how many seats each row behind adds.
   A seat is named section, row and seat, for example A-3-12. Rows and seats count from one.
   Row one is the front, seat one is the left end as seen from the stage for blocks and the start of the arc for arcs.
   BLUE PHONE: seating plan. rowSeats can give any row its own seat count, and off lists single seats that are
   switched off as "row-seat", for a broken seat or an aisle. An off seat keeps its spot, so the rest still line up.
   order() lists the free seats in the order guests should be handed them, for a fill pattern, so that however
   many guests have come the seats they hold already make the best picture for that pattern.

   Cue, a light show scene: {type, at, ...} where at is the server time it starts.
   Sound, a flyby that moves across the seats: {path, tone, f0, speed, dur, level, at}. */
(function(){
"use strict";
const D2R = Math.PI / 180;

function rowSeats(sec, r) {
  const o = sec.rowSeats && sec.rowSeats[r];
  return typeof o === "number" ? Math.max(0, o) : Math.max(1, sec.seats + sec.grow * r);
}
function offSet(sec) { return new Set(Array.isArray(sec.off) ? sec.off : []); }

/* Every seat of a layout with its spot in meters. */
function seats(layout) {
  const out = [];
  if (!layout || !Array.isArray(layout.sections)) return out;
  layout.sections.forEach(function(sec, si){
    const off = offSet(sec);
    for (let r = 0; r < sec.rows; r++) {
      const n = rowSeats(sec, r);
      for (let k = 0; k < n; k++) {
        if (off.has((r + 1) + "-" + (k + 1))) continue;
        let x, y;
        if (sec.kind === "arc") {
          const rad = sec.r + r * sec.rowGap, a = (sec.a0 + sec.span * (k + 0.5) / n) * D2R;
          x = sec.x + Math.cos(a) * rad; y = sec.y + Math.sin(a) * rad;
        } else {
          const lx = (k - (n - 1) / 2) * sec.seatGap, ly = r * sec.rowGap, a = sec.rot * D2R;
          x = sec.x + lx * Math.cos(a) - ly * Math.sin(a); y = sec.y + lx * Math.sin(a) + ly * Math.cos(a);
        }
        out.push({ id: sec.id + "-" + (r + 1) + "-" + (k + 1), sec: sec.id, si: si, row: r + 1, seat: k + 1, n: n, rows: sec.rows, x: x, y: y });
      }
    }
  });
  return out;
}

function count(layout) {
  let t = 0;
  if (layout && layout.sections) layout.sections.forEach(function(sec){ const off = offSet(sec); for (let r = 0; r < sec.rows; r++) { const n = rowSeats(sec, r); for (let k = 0; k < n; k++) if (!off.has((r + 1) + "-" + (k + 1))) t++; } });
  return t;
}

function bounds(list) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  list.forEach(function(s){ if (s.x < x0) x0 = s.x; if (s.x > x1) x1 = s.x; if (s.y < y0) y0 = s.y; if (s.y > y1) y1 = s.y; });
  if (!list.length) { x0 = y0 = -1; x1 = y1 = 1; }
  if (x1 - x0 < 1) { x0 -= 0.5; x1 += 0.5; }
  if (y1 - y0 < 1) { y0 -= 0.5; y1 += 0.5; }
  return { x0: x0, y0: y0, x1: x1, y1: y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, w: x1 - x0, h: y1 - y0 };
}

/* The spot of one seat plus the numbers a scene uses: u and v across the whole layout from zero to one,
   ang the angle round the middle from zero to one, dist the distance from the middle from zero to one. */
function place(layout, id) {
  const list = seats(layout), b = bounds(list);
  let me = null;
  for (let i = 0; i < list.length; i++) if (list[i].id === id) { me = list[i]; break; }
  if (!me) return null;
  return enrich(me, b);
}
function enrich(s, b) {
  const dx = s.x - b.cx, dy = s.y - b.cy, R = Math.hypot(b.w, b.h) / 2;
  return Object.assign({}, s, { u: (s.x - b.x0) / b.w, v: (s.y - b.y0) / b.h,
    ang: ((Math.atan2(dy, dx) / (2 * Math.PI)) % 1 + 1) % 1, dist: Math.min(1, Math.hypot(dx, dy) / R), b: b });
}
function placeAll(layout) { const list = seats(layout), b = bounds(list); return list.map(function(s){ return enrich(s, b); }); }

/* ---------- presets ---------- */
const PRESETS = {
  /* A full circle arena, eight curved sections round a center floor. */
  arena: function(){
    const sections = [], ids = "ABCDEFGH";
    for (let i = 0; i < 8; i++) sections.push({ id: ids[i], kind: "arc", x: 0, y: 0, r: 30, a0: i * 45 + 1.5, span: 42, rows: 10, seats: 25, grow: 1, rowGap: 0.9, seatGap: 0.6, rot: 0 });
    return { name: "Arena", sections: sections };
  },
  /* A theater: a front block of one hundred seats and a wider back block of two hundred. */
  theater: function(){
    return { name: "Theater", sections: [
      { id: "A", kind: "block", x: 0, y: 6, rot: 0, rows: 4, seats: 25, grow: 0, seatGap: 0.6, rowGap: 0.9, r: 30, a0: 0, span: 40 },
      { id: "B", kind: "block", x: 0, y: 12, rot: 0, rows: 8, seats: 25, grow: 0, seatGap: 0.8, rowGap: 1.0, r: 30, a0: 0, span: 40 }
    ] };
  },
  /* A stadium bowl: straight stands down both long sides, curved ends. */
  bowl: function(){
    return { name: "Bowl", sections: [
      { id: "N", kind: "block", x: 0, y: -40, rot: 180, rows: 12, seats: 60, grow: 0, seatGap: 0.6, rowGap: 0.9, r: 30, a0: 0, span: 40 },
      { id: "S", kind: "block", x: 0, y: 40, rot: 0, rows: 12, seats: 60, grow: 0, seatGap: 0.6, rowGap: 0.9, r: 30, a0: 0, span: 40 },
      { id: "E", kind: "arc", x: 18, y: 0, r: 40, a0: -90, span: 180, rows: 8, seats: 50, grow: 1, rowGap: 0.9, seatGap: 0.6, rot: 0 },
      { id: "W", kind: "arc", x: -18, y: 0, r: 40, a0: 90, span: 180, rows: 8, seats: 50, grow: 1, rowGap: 0.9, seatGap: 0.6, rot: 0 }
    ] };
  },
  /* A flat field of fifty rows of fifty, the full two thousand five hundred. */
  field: function(){
    return { name: "Field", sections: [ { id: "F", kind: "block", x: 0, y: 0, rot: 0, rows: 50, seats: 50, grow: 0, seatGap: 1, rowGap: 1, r: 30, a0: 0, span: 40 } ] };
  }
};

/* ---------- colors ---------- */
function hex(c) { c = String(c || "#2f6fd6").replace("#", ""); if (c.length === 3) c = c[0]+c[0]+c[1]+c[1]+c[2]+c[2]; const n = parseInt(c, 16) || 0; return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function hsl(h, s, l) {
  h = ((h % 360) + 360) % 360 / 360; s /= 100; l /= 100;
  const f = function(n){ const k = (n + h * 12) % 12, a = s * Math.min(l, 1 - l); return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))); };
  return [f(0), f(8), f(4)];
}
function mix(a, b, t) { t = Math.max(0, Math.min(1, t)); return [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)]; }
const SEC_HUES = [210, 0, 120, 45, 280, 170, 25, 320];

/* Decodes a picture cue once and keeps it. */
let picKey = "", picData = null;
function picture(cue) {
  if (!cue.img || !cue.img.data) return null;
  const key = cue.at + "|" + cue.img.w + "|" + cue.img.h;
  if (key !== picKey) {
    picKey = key;
    try { const bin = atob(cue.img.data); picData = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) picData[i] = bin.charCodeAt(i); } catch (e) { picData = null; }
  }
  return picData;
}

/* The color one seat shows at one moment. t is seconds since the cue started, beat the running beat count.
   A cue with a box fits the show to that box instead of the whole venue, for example to the seats guests hold. */
function boxOf(q) { return { x0: q.x0, y0: q.y0, x1: q.x1, y1: q.y1, cx: (q.x0 + q.x1) / 2, cy: (q.y0 + q.y1) / 2, w: Math.max(1, q.x1 - q.x0), h: Math.max(1, q.y1 - q.y0) }; }
function color(cue, s, t, beat) {
  if (!cue || !s) return [24, 30, 44];
  if (cue.box && typeof cue.box.x0 === "number") s = enrich(s, boxOf(cue.box));
  const a = hex(cue.a), b = hex(cue.b || "#ffffff"), speed = +cue.speed || 1;
  switch (cue.type) {
    case "hold": return a;
    case "dark": return [0, 0, 0];
    case "image": case "video": case "demo": return [0, 0, 0];
    case "rainbow": return hsl(s.u * 360 * (+cue.spread || 1) - t * 60 * speed, 90, 55);
    case "wave": {
      const pos = cue.axis === "across" ? s.u : s.ang;
      let d = ((pos - t * 0.08 * speed) % 1 + 1) % 1; if (d > 0.5) d -= 1;
      const w = +cue.width || 0.06;
      return mix(b, a, Math.exp(-(d / w) * (d / w)));
    }
    case "ripple": {
      const k = 0.5 + 0.5 * Math.sin(2 * Math.PI * (s.dist * (+cue.rings || 4) - t * 0.5 * speed));
      return mix(b, a, k);
    }
    case "beat": {
      const n = Math.floor(beat), f = beat - n, on = (n + s.si + (cue.split === "rows" ? s.row : 0)) % 2 === 0;
      return mix([0, 0, 0], on ? a : b, 1 - f * 0.85);
    }
    case "picture": {
      const px = picture(cue);
      if (!px) return a;
      const w = cue.img.w, h = cue.img.h, x = Math.min(w - 1, Math.floor(s.u * w)), y = Math.min(h - 1, Math.floor(s.v * h)), i = (y * w + x) * 3;
      return [px[i], px[i + 1], px[i + 2]];
    }
    case "check": {
      if (s.seat === 1) return [255, 255, 255];
      if (s.seat === s.n) return [0, 0, 0];
      return hsl(SEC_HUES[s.si % SEC_HUES.length], 85, s.row % 2 ? 48 : 68);
    }
  }
  return a;
}

/* ---------- seating plan ---------- */
/* Shapes for the shape pattern, over the whole venue from zero to one each way, kept round on long venues. */
const SHAPES = {
  heart: function(X, Y){ const x = X * 2.6, y = -Y * 2.6 + 0.3, a = x * x + y * y - 1; return a * a * a - x * x * y * y * y <= 0; },
  star: function(X, Y){ const r = Math.hypot(X, Y), a = Math.atan2(Y, X) + Math.PI / 2, k = (a % (2 * Math.PI / 5) + 2 * Math.PI / 5) % (2 * Math.PI / 5) - Math.PI / 5; return r <= 0.2 + 0.26 * Math.pow(Math.cos(k * 2.5), 6); },
  circle: function(X, Y){ return Math.hypot(X, Y) <= 0.38; },
  ring: function(X, Y){ const r = Math.hypot(X, Y); return r >= 0.26 && r <= 0.44; },
  diamond: function(X, Y){ return Math.abs(X) + Math.abs(Y) <= 0.42; },
  cross: function(X, Y){ return Math.abs(Math.abs(X) - Math.abs(Y)) <= 0.09 && Math.abs(X) <= 0.42; }
};
/* mask(u, v) is true where a seat belongs to the shape. text masks come from the host screen. */
function shapeMask(name, b) {
  const f = SHAPES[name] || SHAPES.heart, m = Math.max(b.w, b.h);
  return function(u, v){ return f((u - 0.5) * b.w / m, (v - 0.5) * b.h / m); };
}
/* Free seats in the order guests get them. plan: {pattern, assigned}; mask is used by the shape pattern. */
function order(layout, plan, mask) {
  const all = placeAll(layout), taken = new Set((plan && plan.assigned) || []);
  const free = all.filter(function(s){ return !taken.has(s.id); }), held = all.filter(function(s){ return taken.has(s.id); });
  if (!free.length) return [];
  const b = all[0].b, arcs = layout.sections.some(function(s){ return s.kind === "arc"; });
  const pattern = (plan && plan.pattern) || "pack";
  let fx = b.cx, fy = arcs ? b.cy : b.y0;
  if (pattern === "center") { fx = 0; fy = 0; all.forEach(function(s){ fx += s.x; fy += s.y; }); fx /= all.length; fy /= all.length; }
  const byFocus = function(list){ return list.map(function(s){ return [Math.hypot(s.x - fx, s.y - fy) + s.id.length * 1e-9, s]; }).sort(function(a, c){ return a[0] - c[0] || (a[1].id < c[1].id ? -1 : 1); }).map(function(p){ return p[1]; }); };
  if (pattern === "pack" || pattern === "center") return byFocus(free);
  if (pattern === "checker") {
    const a = free.filter(function(s){ return (s.row + s.seat) % 2 === 0; }), c = free.filter(function(s){ return (s.row + s.seat) % 2 === 1; });
    return byFocus(a).concat(byFocus(c));
  }
  if (pattern === "shape") {
    const m = mask || shapeMask(plan && plan.shape, b);
    const inn = free.filter(function(s){ return m(s.u, s.v); }), out = free.filter(function(s){ return !m(s.u, s.v); });
    fx = b.cx; fy = b.cy;
    return byFocus(inn).concat(byFocus(out));
  }
  /* scatter: each next seat is the free seat farthest from every seat already held, so the crowd spreads evenly */
  const n = free.length, xs = new Float64Array(n), ys = new Float64Array(n), best = new Float64Array(n), used = new Uint8Array(n), out = [];
  for (let i = 0; i < n; i++) { xs[i] = free[i].x; ys[i] = free[i].y; best[i] = Infinity; }
  const near = function(x, y){ for (let i = 0; i < n; i++) if (!used[i]) { const d = (xs[i] - x) * (xs[i] - x) + (ys[i] - y) * (ys[i] - y); if (d < best[i]) best[i] = d; } };
  held.forEach(function(s){ near(s.x, s.y); });
  let pick = -1;
  if (!held.length) { let d0 = Infinity; for (let i = 0; i < n; i++) { const d = Math.hypot(xs[i] - b.cx, ys[i] - b.cy); if (d < d0) { d0 = d; pick = i; } } }
  for (let k = 0; k < n; k++) {
    if (pick < 0) { let bd = -1; for (let i = 0; i < n; i++) if (!used[i] && (best[i] > bd + 1e-9)) { bd = best[i]; pick = i; } }
    used[pick] = 1; out.push(free[pick]); near(xs[pick], ys[pick]); pick = -1;
  }
  return out;
}

/* ---------- the shared beat ---------- */
/* Running beat count from the room loop while it plays, from the cue tempo otherwise. now is server time. */
function beatCount(loop, cue, now) {
  if (loop && loop.playing && typeof loop.tempo === "number" && typeof loop.epoch === "number") {
    let ep = loop.epoch, off = loop.barOffset || 0, tempo = loop.tempo;
    const p = loop.pending;
    if (p) { const at = loop.epoch + (p.atBar - off) * 240000 / loop.tempo; if (now >= at) { ep = at; off = p.atBar; tempo = p.tempo; } }
    return off * 4 + (now - ep) / (60000 / tempo);
  }
  const bpm = +((cue && cue.bpm) || 120);
  return ((now - ((cue && cue.at) || 0)) / (60000 / bpm));
}

/* ---------- sound flyby with the Doppler effect ---------- */
const C = 343;
/* Where the sound source is, in meters, at e seconds into the flyby. */
function sourceAt(snd, b, e) {
  const q = Math.max(0, Math.min(1, e / snd.dur)), pad = Math.max(b.w, b.h) * 0.25;
  if (snd.path === "around") {
    const R = Math.hypot(b.w, b.h) / 2 * 0.7, a = q * 2 * Math.PI * (+snd.laps || 1) - Math.PI / 2;
    return [b.cx + Math.cos(a) * R, b.cy + Math.sin(a) * R];
  }
  if (snd.path === "diagonal") return [b.x0 - pad + q * (b.w + 2 * pad), b.y1 + pad - q * (b.h + 2 * pad)];
  if (snd.path === "front") return [b.cx, b.y0 - pad + q * (b.h + 2 * pad)];
  return [b.x0 - pad + q * (b.w + 2 * pad), b.cy];
}
/* The flyby as this seat hears it: for each step of its own clock, the pitch and loudness. The sound left the
   source earlier by the time it took to travel, and a source closing in sounds higher, one moving off lower. */
function flyby(snd, s, step) {
  step = step || 0.02;
  const b = s.b, dur = snd.dur, far = Math.hypot(b.w, b.h) * 2 / C;
  const total = dur + far, n = Math.ceil(total / step) + 1, freq = new Float32Array(n), gain = new Float32Array(n);
  const f0 = +snd.f0 || 220, level = Math.max(0, Math.min(1, +snd.level || 0.6)), ref = Math.max(5, Math.min(b.w, b.h) * 0.25);
  const distAt = function(e){ const p = sourceAt(snd, b, e); return Math.hypot(p[0] - s.x, p[1] - s.y); };
  for (let k = 0; k < n; k++) {
    const t = k * step;
    let e = t - distAt(t) / C;
    for (let i = 0; i < 3; i++) e = t - distAt(e) / C;
    if (e < 0 || e > dur) { gain[k] = 0; freq[k] = k ? freq[k - 1] : f0; continue; }
    const d = distAt(e), dd = (distAt(Math.min(dur, e + 0.01)) - distAt(Math.max(0, e - 0.01))) / 0.02;
    let base = f0;
    if (snd.tone === "siren") base = f0 * (1 + 0.18 * Math.sin(2 * Math.PI * 1.3 * e));
    const shift = 1 / (1 + dd / C);
    freq[k] = Math.max(20, Math.min(8000, base * shift));
    const edge = Math.min(1, e / 0.15, (dur - e) / 0.15);
    gain[k] = level * edge * ref / (ref + d);
  }
  return { freq: freq, gain: gain, step: step, total: total };
}

window.STADIUM = { enrich: enrich, seats: seats, count: count, bounds: bounds, place: place, placeAll: placeAll, PRESETS: PRESETS, order: order, shapeMask: shapeMask, SHAPES: SHAPES, rowSeats: rowSeats,
  color: color, hex: hex, beatCount: beatCount, flyby: flyby, sourceAt: sourceAt, MAX: 2500 };
})();
