// Drive-thru model. Pure math and data, nothing here touches the page.
// The lane runs counterclockwise around the building, so the driver side faces the wall.
// Local frame: x runs along the front of the building, z points out the front door, y is up. Units are feet.

export const D2R = Math.PI / 180;
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const MDAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
// clear sky constants by month, and Las Vegas valley average daily high and low in F, both shared with Parcelsun
const ASHRAE = [[1230, .142, .058], [1215, .144, .060], [1186, .156, .071], [1136, .180, .097], [1104, .196, .121], [1088, .205, .134],
  [1085, .207, .136], [1107, .201, .122], [1151, .177, .092], [1192, .160, .073], [1221, .149, .063], [1233, .142, .057]];
export const TEMPS = [[58, 40], [63, 44], [71, 50], [78, 57], [89, 67], [99, 76], [105, 82], [103, 81], [94, 72], [80, 59], [66, 46], [57, 39]];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const fin = (v, d) => { v = parseFloat(v); return isFinite(v) ? v : d; };

const COND = ['Unknown', 'Good', 'Worn', 'Damaged', 'Not working', 'Missing, install needed'];
const POWER = ['Unknown', '120V at the device', 'Low voltage from building', 'PoE', 'None needed'];
const DATA = ['Unknown', 'Ethernet in conduit', 'Ethernet, no conduit', 'Wireless', 'Audio pair', 'Coax', 'None needed'];
const CONDUIT = ['Unknown', 'Existing, room to pull', 'Existing, full', 'None, trench needed', 'Overhead run'];
const COMMON = [
  { id: 'label', label: 'Name', type: 'text', ph: 'Like Lane 1 menu board' },
  { id: 'model', label: 'Make and Model', type: 'text', ph: 'Maker and model number' },
  { id: 'cond', label: 'Condition', type: 'select', opts: COND },
  { id: 'power', label: 'Power', type: 'select', opts: POWER },
  { id: 'data', label: 'Data', type: 'select', opts: DATA },
  { id: 'conduit', label: 'Conduit', type: 'select', opts: CONDUIT }
];
const BOARD = [
  { id: 'tech', label: 'Board Type', type: 'select', opts: ['Unknown', 'Digital LCD', 'Digital LED', 'Static, backlit', 'Static, not lit'] },
  { id: 'panels', label: 'Screens or Panels', type: 'number', ph: 'Count' },
  { id: 'size', label: 'Screen Size', type: 'text', ph: 'Like 55 in' },
  { id: 'cooling', label: 'Enclosure Cooling', type: 'select', opts: ['Unknown', 'Passive', 'Fans', 'AC unit'] },
  { id: 'nits', label: 'Brightness (nits)', type: 'number', ph: 'Like 2500' },
  { id: 'player', label: 'Media Player Location', type: 'select', opts: ['Unknown', 'In the enclosure', 'In the building'] }
];
const WINDOW = [
  { id: 'kind', label: 'Window Type', type: 'select', opts: ['Unknown', 'Manual slider', 'Automatic slider', 'Bi-fold', 'Fixed with drawer'] },
  { id: 'terminal', label: 'POS at Window', type: 'select', opts: ['Unknown', 'Dedicated terminal', 'Shared terminal', 'Tablet', 'None'] },
  { id: 'payDev', label: 'Payment Device', type: 'select', opts: ['Unknown', 'PIN pad on arm', 'Handheld reader', 'At terminal only', 'None'] },
  { id: 'airCurtain', label: 'Air Curtain', type: 'select', opts: ['Unknown', 'Yes', 'No'] }
];

// geo: default placement. w and tall size the part in the 3D view. face: has a front that sun can hit.
// stop: cars stop here. cable: what the run back to the building is made of.
export const DT_TYPES = {
  clearance: { name: 'Clearance bar', geo: { side: 'driver', setback: 2, h: 9 }, w: 13, extra: [{ id: 'clear', label: 'Posted Clearance', type: 'text', ph: 'Like 9 ft 0 in' }] },
  presell: { name: 'Pre-sell board', face: true, cable: 'cat6', geo: { side: 'driver', setback: 3, aim: 35, h: 5 }, w: 3, tall: 5, extra: BOARD },
  menu: { name: 'Menu board', face: true, cable: 'cat6', geo: { side: 'driver', setback: 3, aim: 25, h: 5 }, w: 8, tall: 5, extra: BOARD },
  ocd: { name: 'Order confirmation screen', face: true, cable: 'cat6', geo: { side: 'driver', setback: 2, aim: 10, h: 4 }, w: 2, tall: 2.5, extra: BOARD.slice(0, 3) },
  speaker: { name: 'Speaker post, order point', stop: 'order', cable: 'audio', geo: { side: 'driver', setback: 2, h: 4 }, extra: [
    { id: 'kind', label: 'Speaker Mount', type: 'select', opts: ['Unknown', 'Own post', 'Built into menu board', 'Canopy mounted'] },
    { id: 'wiring', label: 'Wiring', type: 'select', opts: ['Unknown', 'Wired to base station', 'Wireless'] },
    { id: 'mic', label: 'Mic and Speaker Model', type: 'text', ph: 'Maker and model number' }] },
  canopy: { name: 'Canopy', geo: { side: 'driver', setback: 0, h: 10, len: 16, wid: 16 }, extra: [
    { id: 'lit', label: 'Canopy Lighting', type: 'select', opts: ['Unknown', 'Yes', 'No'] }] },
  loop: { name: 'Vehicle detector', cable: 'loop', geo: { side: 'driver', setback: -6, h: 0 }, extra: [
    { id: 'kind', label: 'Detector Type', type: 'select', opts: ['Unknown', 'Saw-cut loop', 'Preformed loop', 'Ultrasonic', 'Radar', 'Camera based'] },
    { id: 'feeds', label: 'Feeds', type: 'select', opts: ['Unknown', 'Headset alert', 'Timer', 'Both'] }] },
  camera: { name: 'Camera', face: true, lens: true, cable: 'cat6', geo: { side: 'driver', setback: 3, aim: 45, h: 9 }, extra: [
    { id: 'use', label: 'Purpose', type: 'select', opts: ['Unknown', 'Security', 'License plate', 'Car count, timer', 'Order assist'] }] },
  payWindow: { name: 'Pay window', face: true, wall: true, stop: 'window', geo: { side: 'driver', h: 4 }, w: 4, tall: 3.5, extra: WINDOW },
  pickWindow: { name: 'Pickup window', face: true, wall: true, stop: 'window', geo: { side: 'driver', h: 4 }, w: 4, tall: 3.5, extra: WINDOW },
  ap: { name: 'Outdoor antenna or access point', cable: 'cat6', geo: { side: 'driver', setback: 3, h: 10 }, extra: [
    { id: 'use', label: 'Serves', type: 'select', opts: ['Unknown', 'Headsets', 'WiFi', 'Both'] }] },
  bay: { name: 'Pull-forward space', geo: { side: 'passenger', setback: 1, h: 0 }, extra: [
    { id: 'count', label: 'Spaces', type: 'number', ph: 'Count' }] },
  light: { name: 'Lane light', geo: { side: 'passenger', setback: 3, h: 14 }, extra: [] },
  sign: { name: 'Directional sign', face: true, geo: { side: 'passenger', setback: 3, aim: 60, h: 4 }, w: 2.5, tall: 2, extra: [
    { id: 'lit', label: 'Lit', type: 'select', opts: ['Unknown', 'Yes', 'No'] }] },
  bollard: { name: 'Bollard', geo: { side: 'driver', setback: 1, h: 3.5 }, extra: [] },
  other: { name: 'Other', geo: { side: 'passenger', setback: 3, h: 4 }, extra: [] }
};

export const PLACE_FIELDS = [
  { id: 'pos', label: 'Distance From Lane Entry (ft)', type: 'range' },
  { id: 'side', label: 'Side of Lane', type: 'select', opts: [['driver', 'Driver side, toward building'], ['passenger', 'Passenger side, away from building']] },
  { id: 'lane', label: 'Lane', type: 'select', opts: [['1', 'Lane 1, inside'], ['2', 'Lane 2, outside']] },
  { id: 'setback', label: 'Setback From Lane Edge (ft)', type: 'number' },
  { id: 'aim', label: 'Turned Toward Oncoming Cars (deg)', type: 'number' },
  { id: 'h', label: 'Mount Height (ft)', type: 'number' }
];

export function itemFields(type) {
  const T = DT_TYPES[type] || DT_TYPES.other;
  return COMMON.concat(T.extra, [{ id: 'notes', label: 'Notes', type: 'area', ph: 'What you saw' }]);
}

let seq = 0;
export function newItem(type, pos) {
  const T = DT_TYPES[type] || DT_TYPES.other;
  return Object.assign({ id: 'i' + Date.now().toString(36) + (seq++), type, pos: Math.round(pos || 0), lane: '1', aim: 0, setback: 0 }, T.geo, { v: {} });
}

export function defaults() {
  const dt = {
    lat: 36.17, lon: -115.14, dst: true, tz: null, facing: 180,
    bldgW: 45, bldgD: 80, bldgH: 18,
    laneStart: -30, laneLen: 300, laneWidth: 12, laneGap: 4, lanes: '1', merge: 110, carLen: 20,
    closetX: 50, closetZ: 30,
    month: 6, day: 15, hour: 15, hi: '', lo: '', wind: 5,
    items: [], photos: []
  };
  [['clearance', 18], ['presell', 45], ['menu', 78], ['speaker', 82], ['ocd', 84], ['loop', 82], ['canopy', 82],
    ['camera', 60], ['payWindow', 214], ['loop', 240], ['pickWindow', 240], ['bay', 288]].forEach(([t, p]) => dt.items.push(newItem(t, p)));
  return dt;
}

// Fill gaps so an older or hand-edited model still draws.
export function shape(dt) {
  const d = defaults();
  if (!dt || typeof dt !== 'object') return d;
  Object.keys(d).forEach(k => { if (dt[k] === undefined) dt[k] = k === 'items' || k === 'photos' ? [] : d[k]; });
  dt.items = dt.items.filter(i => i && DT_TYPES[i.type]);
  dt.items.forEach(i => { i.v = i.v || {}; });
  return dt;
}

// ===== LANE GEOMETRY =====
export function dims(dt) {
  const W = clamp(fin(dt.bldgW, 45), 10, 400), D = clamp(fin(dt.bldgD, 80), 10, 400), H = clamp(fin(dt.bldgH, 18), 8, 80);
  const lw = clamp(fin(dt.laneWidth, 12), 8, 20), gap = clamp(fin(dt.laneGap, 4), 0, 40);
  const g = gap + lw / 2;
  const arc = Math.PI * g / 2;
  const P = 2 * (W + D) + 4 * arc;
  const start = clamp(fin(dt.laneStart, -30), -300, P - 20);
  const len = clamp(fin(dt.laneLen, 300), 20, P - start);
  return { W, D, H, lw, gap, g, arc, P, start, len, two: String(dt.lanes) === '2', merge: clamp(fin(dt.merge, 110), 0, len), car: clamp(fin(dt.carLen, 20), 12, 40) };
}

// Point and heading on the loop centerline at s feet from the front right corner.
export function loopAt(G, s) {
  const { W, D, g, arc, P } = G;
  if (s <= 0) return { x: W / 2 + g, z: D / 2 - s, tx: 0, tz: -1 };
  s = Math.min(s, P);
  const corner = (cx, cz, a0, u) => { const a = a0 + u / g; return { x: cx + g * Math.cos(a), z: cz - g * Math.sin(a), tx: -Math.sin(a), tz: -Math.cos(a) }; };
  if (s <= D) return { x: W / 2 + g, z: D / 2 - s, tx: 0, tz: -1 };
  s -= D;
  if (s <= arc) return corner(W / 2, -D / 2, 0, s);
  s -= arc;
  if (s <= W) return { x: W / 2 - s, z: -D / 2 - g, tx: -1, tz: 0 };
  s -= W;
  if (s <= arc) return corner(-W / 2, -D / 2, Math.PI / 2, s);
  s -= arc;
  if (s <= D) return { x: -W / 2 - g, z: -D / 2 + s, tx: 0, tz: 1 };
  s -= D;
  if (s <= arc) return corner(-W / 2, D / 2, Math.PI, s);
  s -= arc;
  if (s <= W) return { x: -W / 2 + s, z: D / 2 + g, tx: 1, tz: 0 };
  s -= W;
  return corner(W / 2, D / 2, 1.5 * Math.PI, Math.min(s, arc));
}

// Lane point at d feet from the lane entry. nx, nz points to the driver side.
export function laneAt(G, d, lane) {
  const p = loopAt(G, G.start + clamp(d, 0, G.len));
  const nx = p.tz, nz = -p.tx;
  const out = String(lane) === '2' ? G.lw : 0;
  return { x: p.x - nx * out, z: p.z - nz * out, tx: p.tx, tz: p.tz, nx, nz };
}

// Where a part sits and which way its front points.
export function place(G, it) {
  const T = DT_TYPES[it.type] || DT_TYPES.other;
  const L = laneAt(G, fin(it.pos, 0), G.two ? it.lane : '1');
  const sgn = it.side === 'passenger' ? -1 : 1;
  let off = G.lw / 2 + fin(it.setback, 0);
  if (T.wall) off = G.two && String(it.lane) === '2' ? G.lw / 2 + 1 : G.g;
  if (it.type === 'canopy') off = 0;
  const x = L.x + L.nx * sgn * off, z = L.z + L.nz * sgn * off;
  const a = fin(it.aim, 0) * D2R;
  // square to the lane, then turned toward cars coming up the lane
  let fx = -sgn * L.nx * Math.cos(a) - L.tx * Math.sin(a);
  let fz = -sgn * L.nz * Math.cos(a) - L.tz * Math.sin(a);
  return { x, z, y: Math.max(0, fin(it.h, 4)), fx, fz, tx: L.tx, tz: L.tz, lane: L };
}

export function bearingOf(dt, dx, dz) {
  const b = Math.atan2(dx, -dz) / D2R + (fin(dt.facing, 180) - 180);
  return ((b % 360) + 360) % 360;
}
export function compass(b) { return ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(b / 45) % 8]; }

// ===== SUN =====
export function dayOfYear(dt) { let n = clamp(Math.round(fin(dt.day, 15)), 1, MDAYS[dt.month]); for (let i = 0; i < dt.month; i++) n += MDAYS[i]; return n; }
export function tzOf(dt) { const t = parseFloat(dt.tz); return isFinite(t) ? t : Math.round(fin(dt.lon, -115) / 15); }

// NOAA solar position. Azimuth is clockwise from north.
export function sunPos(dt, hour) {
  const doy = dayOfYear(dt);
  const tz = tzOf(dt) + (dt.dst && doy >= 70 && doy <= 308 ? 1 : 0);
  const g = 2 * Math.PI / 365 * (doy - 1 + (hour - 12) / 24);
  const eq = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const dec = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  const tst = hour * 60 + eq + 4 * fin(dt.lon, -115) - 60 * tz;
  const ha = (tst / 4 - 180) * D2R;
  const la = fin(dt.lat, 36) * D2R;
  const cz = Math.sin(la) * Math.sin(dec) + Math.cos(la) * Math.cos(dec) * Math.cos(ha);
  const alt = Math.asin(clamp(cz, -1, 1));
  let az = Math.atan2(Math.sin(ha), Math.cos(ha) * Math.sin(la) - Math.tan(dec) * Math.cos(la)) + Math.PI;
  az = (az + 2 * Math.PI) % (2 * Math.PI);
  return { alt, az };
}

// Unit vector toward the sun in the building frame.
export function sunVec(dt, sun) {
  const a = sun.az - (fin(dt.facing, 180) - 180) * D2R;
  return { x: Math.cos(sun.alt) * Math.sin(a), y: Math.sin(sun.alt), z: -Math.cos(sun.alt) * Math.cos(a) };
}

export function ambientF(dt, h) {
  const m = TEMPS[dt.month];
  const hi = fin(dt.hi, m[0]), lo = fin(dt.lo, m[1]);
  let f;
  if (h >= 5 && h <= 15) f = (1 - Math.cos(Math.PI * (h - 5) / 10)) / 2;
  else { const t = h < 5 ? h + 24 : h; f = (1 + Math.cos(Math.PI * (t - 15) / 14)) / 2; }
  return lo + (hi - lo) * f;
}

// ===== SHADE =====
// Boxes that throw shade: the building and each canopy roof. Each is a center, a heading and half sizes.
export function shadeBoxes(dt, G) {
  const out = [{ cx: 0, cz: 0, y0: 0, y1: G.H, hx: G.W / 2, hz: G.D / 2, ux: 1, uz: 0 }];
  dt.items.forEach(it => {
    if (it.type !== 'canopy') return;
    const p = place(G, it);
    out.push({ cx: p.x, cz: p.z, y0: p.y, y1: p.y + 1, hx: fin(it.len, 16) / 2, hz: fin(it.wid, 16) / 2, ux: p.tx, uz: p.tz });
  });
  return out;
}

// Does a ray from o toward d pass through the box?
function hitsBox(b, o, d) {
  const rx = o.x - b.cx, rz = o.z - b.cz;
  const ox = rx * b.ux + rz * b.uz, oz = -rx * b.uz + rz * b.ux;
  const dx = d.x * b.ux + d.z * b.uz, dz = -d.x * b.uz + d.z * b.ux;
  let t0 = 0.01, t1 = 1e9;
  const slab = (p, v, lo, hi) => {
    if (Math.abs(v) < 1e-9) return p >= lo && p <= hi;
    let a = (lo - p) / v, c = (hi - p) / v;
    if (a > c) { const t = a; a = c; c = t; }
    t0 = Math.max(t0, a); t1 = Math.min(t1, c);
    return t0 <= t1;
  };
  return slab(ox, dx, -b.hx, b.hx) && slab(o.y, d.y, b.y0, b.y1) && slab(oz, dz, -b.hz, b.hz);
}
export function shaded(boxes, o, d) { return boxes.some(b => hitsBox(b, o, d)); }

// ===== WHAT THE SUN DOES TO EACH PART =====
function look(dt, G, boxes, it, hour) {
  const T = DT_TYPES[it.type];
  const sun = sunPos(dt, hour);
  const amb = ambientF(dt, hour);
  const r = { lit: false, cos: 0, irr: 0, temp: amb, glare: false };
  if (sun.alt <= 0.01) return r;
  const sv = sunVec(dt, sun);
  const p = place(G, it);
  const o = { x: p.x + p.fx * 0.6, y: Math.max(1, p.y), z: p.z + p.fz * 0.6 };
  const open = !shaded(boxes, o, sv);
  if (T.face) {
    const cos = sv.x * p.fx + sv.z * p.fz;
    const [A, B, C] = ASHRAE[dt.month];
    const dni = A * Math.exp(-B / Math.max(0.03, Math.sin(sun.alt)));
    const beam = open ? dni * Math.max(0, cos) : 0;
    r.cos = cos;
    r.lit = T.lens ? open && cos > 0.87 : beam > 60;
    r.irr = beam + C * dni / 2 + 0.25 * dni * (Math.sin(sun.alt) + C) / 2;
    // a dark face in still air: sun soaked up against what wind and its own glow carry off
    const hOut = 10.7 + 3.8 * fin(dt.wind, 5) * 0.447;
    r.temp = amb + 0.88 * r.irr / hOut * 1.8;
  }
  if (T.stop) {
    // low sun dead ahead of a driver pulling up
    const L = laneAt(G, fin(it.pos, 0) - 8, G.two ? it.lane : '1');
    const eye = { x: L.x, y: 4, z: L.z };
    const hz = Math.hypot(sv.x, sv.z) || 1;
    const ahead = (sv.x * L.tx + sv.z * L.tz) / hz;
    r.glare = sun.alt > 2 * D2R && sun.alt < 25 * D2R && ahead > Math.cos(25 * D2R) && !shaded(boxes, eye, sv);
  }
  return r;
}

const span = (a, b) => (a === null ? '' : clock(a) + ' to ' + clock(b + 0.25));
export function clock(h) {
  h = ((h % 24) + 24) % 24;
  const m = Math.round((h % 1) * 60), hh = Math.floor(h);
  return (hh % 12 || 12) + ':' + String(m).padStart(2, '0') + (hh < 12 ? ' AM' : ' PM');
}

export function analyze(dt) {
  const G = dims(dt);
  const boxes = shadeBoxes(dt, G);
  const hour = clamp(fin(dt.hour, 15), 0, 23.75);
  const sun = sunPos(dt, hour);
  const rows = dt.items.map((it, idx) => {
    const T = DT_TYPES[it.type];
    const p = place(G, it);
    const row = { it, idx, name: (it.v.label || T.name), now: look(dt, G, boxes, it, hour), faces: T.face ? bearingOf(dt, p.fx, p.fz) : null,
      sunH: 0, first: null, last: null, peakT: -99, peakAt: 0, glareH: 0, g0: null, g1: null, run: runFt(dt, G, p) };
    if (T.face || T.stop) {
      for (let h = 0; h < 24; h += 0.25) {
        const r = look(dt, G, boxes, it, h);
        if (r.lit) { row.sunH += 0.25; if (row.first === null) row.first = h; row.last = h; }
        if (r.temp > row.peakT) { row.peakT = r.temp; row.peakAt = h; }
        if (r.glare) { row.glareH += 0.25; if (row.g0 === null) row.g0 = h; row.g1 = h; }
      }
      row.sunSpan = span(row.first, row.last);
      row.glareSpan = span(row.g0, row.g1);
    }
    return row;
  });
  return { G, sun, hour, amb: ambientF(dt, hour), sunBearing: sun.az / D2R, rows, queue: queue(dt, G) };
}

// ===== CAR STACK =====
export function queue(dt, G) {
  const stops = dt.items.filter(i => DT_TYPES[i.type].stop).map(i => ({ pos: clamp(fin(i.pos, 0), 0, G.len), kind: DT_TYPES[i.type].stop, name: i.v.label || DT_TYPES[i.type].name }))
    .sort((a, b) => a.pos - b.pos);
  const lanesAt = d => (G.two && d < G.merge ? 2 : 1);
  const cars = (a, b) => {
    // two lanes hold two rows of cars up to the merge
    let n = 0;
    if (G.two && a < G.merge) { const e = Math.min(b, G.merge); n += 2 * Math.floor((e - a) / G.car); a = e; }
    return n + Math.floor(Math.max(0, b - a) / G.car);
  };
  const order = stops.find(s => s.kind === 'order');
  const wins = stops.filter(s => s.kind === 'window');
  const last = wins[wins.length - 1];
  const out = { len: G.len, lanes: lanesAt(0), parts: [] };
  if (order) out.parts.push(['Entry to order point', cars(0, order.pos)]);
  if (order && wins[0] && wins[0].pos > order.pos) out.parts.push(['Order point to first window', cars(order.pos, wins[0].pos)]);
  if (wins.length > 1) out.parts.push(['Between windows', cars(wins[0].pos, last.pos)]);
  if (last) { out.parts.push(['Entry to last window, whole stack', cars(0, last.pos)]); out.exitFt = Math.round(G.len - last.pos); }
  return out;
}

// ===== CABLE RUN BACK TO THE NETWORK CLOSET =====
function runFt(dt, G, p) {
  const cx = (clamp(fin(dt.closetX, 50), 0, 100) / 100 - 0.5) * G.W;
  const cz = (clamp(fin(dt.closetZ, 30), 0, 100) / 100 - 0.5) * G.D;
  const flat = Math.abs(p.x - cx) + Math.abs(p.z - cz);
  // along the walls, up and over the ceiling and back down, plus slack
  return Math.ceil((flat + 24) * 1.15 / 5) * 5;
}

export function closetPoint(dt, G) {
  return { x: (clamp(fin(dt.closetX, 50), 0, 100) / 100 - 0.5) * G.W, z: (clamp(fin(dt.closetZ, 30), 0, 100) / 100 - 0.5) * G.D };
}
