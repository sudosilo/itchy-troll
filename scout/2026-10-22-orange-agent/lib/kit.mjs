// Agent Orange building kit. Every helper appends a call to kit.calls, in the Agent Test Bed tool format.
// It reads the live city so service runs declare penetrations through any wall they cross, old or new.
// Usage: const kit = await makeKit('/path/to/testbed'); ... kit.calls is the list for the turn file.
import path from 'path';
import {pathToFileURL} from 'url';

export const S = 79248;          // chunk size in mm
export const CURB = 5486;        // curb line from street centerline, every port uses this
export const PL = 9144;          // property line from street centerline
export const LANE = 3353;        // travel lane width

// Palette indexes Agent Orange uses, so new work matches old work.
export const C = {street: 0, curb: 7, yellow: 11, white: 7, lot: 5, struct: 9, brick: 1, roof: 7, int: 3, elec: 4, plumb: 10, sewer: 5, veg: 2, veg2: 8, person: 6, car: 1, car2: 10, sign: 0};

// Street names by chunk edge. Horizontal streets run along y = row * S, vertical along x = col * S.
export const HSTREET = {'-1': 'Creosote Street', 0: 'Arroyo Street', 1: 'Mesquite Street', 2: 'Cholla Street', 3: 'Agave Street'};
export const VSTREET = {0: 'Ocotillo Avenue', 1: 'Palo Verde Avenue', 2: 'Saguaro Avenue', 3: 'Yucca Avenue', 4: 'Ironwood Avenue'};

export async function makeKit(testbed, agent = 'agent-orange') {
  const eng = await import(pathToFileURL(path.join(testbed, 'engine.js')).href);
  const ld = await import(pathToFileURL(path.join(testbed, 'scripts', 'load.mjs')).href);
  const W = eng.replay(ld.loadContrib(testbed).files, null, ld.loadConfig(testbed));
  // Street names on chunk edges as they exist in the city now, so new streets reuse them.
  for (const c of W.chunks.values()) for (const r of c.records) {
    if (r.kind !== 'line' || r.discipline !== 'street' || !r.meta || typeof r.meta.street !== 'string' || r.pts.length < 2) continue;
    const ys = r.pts.map(p => p[1]), xs = r.pts.map(p => p[0]);
    if (Math.max(...ys) - Math.min(...ys) < 400) { const row = Math.round(ys[0] / S); if (Math.abs(ys[0] - row * S) < 4000 && !HSTREET[row]) HSTREET[row] = r.meta.street; }
    if (Math.max(...xs) - Math.min(...xs) < 400) { const col = Math.round(xs[0] / S); if (Math.abs(xs[0] - col * S) < 4000 && !VSTREET[col]) VSTREET[col] = r.meta.street; }
  }
  const calls = [];
  const R = Math.round;
  const P = (x, y, z = 0) => [R(x), R(y), R(z)];
  const ck = (x, y) => Math.floor(x / S) + ':' + Math.floor(y / S);
  const push = (tool, args) => calls.push({tool, args});

  // Walls already in the city, by chunk, plus walls added this turn.
  const walls = [];
  for (const c of W.chunks.values()) for (const r of c.records) if (r.kind === 'line' && r.meta && r.meta.wall) {
    const seq = r.closed ? r.pts.concat([r.pts[0]]) : r.pts;
    walls.push({chunk: c.k, seq, h: Number.isInteger(r.meta.h) ? r.meta.h : 3048, zmin: Number.isInteger(r.meta.zmin) ? r.meta.zmin : 0});
  }

  const lineAll = (discipline, color, pts, meta, extra = {}) => push('place_line', Object.assign({discipline, color, pts, meta}, extra));
  const sym = (discipline, color, type, at, rot = 0, meta) => push('place_symbol', {discipline, color, type, at, rot: Math.round(rot * 1000) / 1000, meta});
  const hatch = (discipline, color, pts, pattern, spacing, angle = 0, meta, color2) => push('place_hatch', Object.assign({discipline, color, pts, pattern, spacing, angle}, color2 !== undefined ? {color2} : {}, meta ? {meta} : {}));
  const rect = (x0, y0, x1, y1, z = 0) => [P(x0, y0, z), P(x1, y0, z), P(x1, y1, z), P(x0, y1, z)];
  const arc = (cx, cy, r, a0, a1, n, z = 0) => { const o = []; for (let i = 0; i <= n; i++) { const a = (a0 + (a1 - a0) * i / n) * Math.PI / 180; o.push(P(cx + Math.cos(a) * r, cy + Math.sin(a) * r, z)); } return o; };
  const circ = (cx, cy, r, z, n = 10) => arc(cx, cy, r, 0, 360, n, z);
  const rounded = (x0, y0, x1, y1, r, z = 0, n = 5) => [...arc(x0 + r, y0 + r, r, 180, 270, n, z), ...arc(x1 - r, y0 + r, r, 270, 360, n, z), ...arc(x1 - r, y1 - r, r, 0, 90, n, z), ...arc(x0 + r, y1 - r, r, 90, 180, n, z)];
  const vface = (ax, ay, bx, by, z0, z1) => [P(ax, ay, z0), P(bx, by, z0), P(bx, by, z1), P(ax, ay, z1)];
  const blob = (cx, cy, r, n, seed, z = 0) => { const o = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; const rr = r * (1 + 0.15 * Math.sin(a * 3 + seed) + 0.07 * Math.sin(a * 5 + seed * 2)); o.push(P(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, z)); } return o; };
  const wavy = (x0, y0, x1, y1, amp, n, seed, z = 0) => { const o = []; for (let i = 0; i <= n; i++) { const t = i / n; const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1; const w = Math.sin(t * Math.PI * 2.3 + seed) * amp + Math.sin(t * 9 + seed * 2) * amp * 0.25; o.push(P(x0 + dx * t - dy / L * w, y0 + dy * t + dx / L * w, z)); } return o; };
  const line = lineAll;
  const box = (disc, col, x0, y0, x1, y1, z, meta) => line(disc, col, rect(x0, y0, x1, y1, z), meta, {closed: true});

  // A wall footprint. The first closed wall of a building sets its footprint box for detail points, so draw it first.
  function wall(building, pts2, h, zmin, closed, color = C.struct) {
    const pts = pts2.map(p => P(p[0], p[1], 0));
    line('structure', color, pts, {wall: true, h, zmin, building}, {closed: !!closed});
    walls.push({chunk: ck(pts[0][0], pts[0][1]), seq: closed ? pts.concat([pts[0]]) : pts, h, zmin});
  }
  // A plumbing or electrical run. Declares a penetration at every wall crossing inside that wall's height band.
  function run(discipline, color, pts, meta) {
    const chunk = ck(pts[0][0], pts[0][1]);
    for (let i = 0; i + 1 < pts.length; i++) {
      const a = pts[i], b = pts[i + 1];
      for (const w of walls) {
        if (w.chunk !== chunk) continue;
        for (let j = 0; j + 1 < w.seq.length; j++) {
          const p = w.seq[j], q = w.seq[j + 1];
          const d = (b[0] - a[0]) * (q[1] - p[1]) - (b[1] - a[1]) * (q[0] - p[0]); if (Math.abs(d) < 1e-9) continue;
          const t = ((p[0] - a[0]) * (q[1] - p[1]) - (p[1] - a[1]) * (q[0] - p[0])) / d;
          const u = ((p[0] - a[0]) * (b[1] - a[1]) - (p[1] - a[1]) * (b[0] - a[0])) / d;
          if (t < 0 || t > 1 || u < 0 || u > 1) continue;
          const Z = a[2] + t * (b[2] - a[2]); if (Z < w.zmin || Z > w.h) continue;
          push('declare_penetration', {at: P(a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1]), Z)});
        }
      }
    }
    line(discipline, color, pts, meta);
  }
  // A door frame with checks and a lever handle. dir 'x' for a wall running east west, 'y' for north south.
  function door(building, ax, ay, dir, w, label, knobSide = 1) {
    const h = 2134;
    const pts = dir === 'x' ? [P(ax, ay), P(ax, ay, h), P(ax + w, ay, h), P(ax + w, ay)] : [P(ax, ay), P(ax, ay, h), P(ax, ay + w, h), P(ax, ay + w)];
    line('structure', C.int, pts, {door: label, building, checks: [['door_height', h], ['door_width', w]]});
    const k = dir === 'x' ? P(ax + (knobSide > 0 ? w - 90 : 90), ay + 60 * knobSide, 965) : P(ax + 60 * knobSide, ay + (knobSide > 0 ? w - 90 : 90), 965);
    sym('interior', C.elec, 'knob', k, 0, {checks: [['knob_height', 965]], part: 'lever handle'});
  }
  const person = (at, rot, pose, activity, anim) => sym('activity', C.person, 'person', at, rot, Object.assign({pose, activity}, anim ? {anim} : {}));
  const tree = (x, y, deg = 3, period = 5) => sym('vegetation', C.veg, 'tree', P(x, y), 0, {anim: {type: 'sway', deg, period}});
  const lot = (zone, x0, y0, x1, y1, name) => push('define_lot', {color: C.lot, zone, pts: rect(x0, y0, x1, y1), meta: {name}});
  const claim = (cx, cy) => { push('claim_chunk', {chunk: [cx, cy]}); for (const edge of ['n', 's', 'e', 'w']) push('declare_port', {chunk: [cx, cy], edge, value: CURB}); };

  // Curb ring, sidewalks, signs and the street edges you list. Only draw an edge no neighbor has drawn already.
  function streets(cx, cy, edges) {
    const ox = cx * S, oy = cy * S;
    // Lines whose first point falls in a neighbor block are skipped; the neighbor draws its own side of the street.
    const line = (d, c, pts, m, e) => { if (ck(pts[0][0], pts[0][1]) === cx + ':' + cy) return lineAll(d, c, pts, m, e); };
    const hs = HSTREET[cy], hn = HSTREET[cy + 1], vw = VSTREET[cx], ve = VSTREET[cx + 1];
    if (!hs || !hn || !vw || !ve) throw new Error('name the streets around chunk ' + cx + ',' + cy + ' in HSTREET and VSTREET first');
    const names = [hs, hn, vw, ve];
    line('street', C.curb, rounded(ox + CURB, oy + CURB, ox + S - CURB, oy + S - CURB, 4572, 152, 6), {street: names, part: 'curb top, 152 mm reveal'}, {closed: true});
    line('street', C.curb, rounded(ox + CURB, oy + CURB, ox + S - CURB, oy + S - CURB, 4572, 0, 6), {street: names, part: 'gutter line'}, {closed: true});
    const sw = [[[ox + CURB + 4572, oy + CURB], [ox + S - CURB - 4572, oy + PL], 0, hs], [[ox + CURB + 4572, oy + S - PL], [ox + S - CURB - 4572, oy + S - CURB], 0, hn], [[ox + CURB, oy + CURB + 4572], [ox + PL, oy + S - CURB - 4572], 90, vw], [[ox + S - PL, oy + CURB + 4572], [ox + S - CURB, oy + S - CURB - 4572], 90, ve]];
    for (const [a, b, ang, nm] of sw) hatch('paving', C.curb, rect(a[0], a[1], b[0], b[1], 152), 'lines', 1524, ang + 90, {sidewalk: nm, checks: [['sidewalk_width', PL - CURB]]});
    const H = (y, nm, x0, x1) => { line('street', C.yellow, [P(x0, y + 100), P(x1, y + 100)], {street: nm, part: 'double yellow', checks: [['lane_width', LANE]]}, {color2: C.yellow}); line('street', C.yellow, [P(x0, y - 100), P(x1, y - 100)], {street: nm, part: 'double yellow'}); line('street', C.white, [P(x0, y + LANE), P(x1, y + LANE)], {street: nm, part: 'parking lane edge'}); line('street', C.white, [P(x0, y - LANE), P(x1, y - LANE)], {street: nm, part: 'parking lane edge'}); };
    const V = (x, nm, y0, y1) => { line('street', C.yellow, [P(x + 100, y0), P(x + 100, y1)], {street: nm, part: 'double yellow', checks: [['lane_width', LANE]]}); line('street', C.yellow, [P(x - 100, y0), P(x - 100, y1)], {street: nm, part: 'double yellow'}); line('street', C.white, [P(x + LANE, y0), P(x + LANE, y1)], {street: nm, part: 'parking lane edge'}); line('street', C.white, [P(x - LANE, y0), P(x - LANE, y1)], {street: nm, part: 'parking lane edge'}); };
    const lo = 7000, hi = S - 7000;
    if (edges.s) H(oy, hs, ox + lo, ox + hi);
    if (edges.w) V(ox, vw, oy + lo, oy + hi);
    if (edges.n) H(oy + S - 1, hn, ox + lo, ox + hi);
    if (edges.e) V(ox + S - 1, ve, oy + lo, oy + hi);
    sym('street', C.sign, 'sign', P(ox + CURB + 700, oy + CURB + 700), 0.785, {text: hs + ' / ' + vw});
    sym('street', C.sign, 'sign', P(ox + S - CURB - 700, oy + S - CURB - 700), 0.785, {text: hn + ' / ' + ve});
    sym('street', C.brick, 'hydrant', P(ox + CURB + 600, oy + S / 2), 0);
  }

  // Right-hand traffic: clockwise on a block's inside lanes, counterclockwise on its outside lanes. Closed loops, no jumps.
  function trafficLoop(cx, cy, outside, color, type = 'car', speed = 9000) {
    const ox = cx * S, oy = cy * S, o = outside ? -1700 : 1700;
    const x0 = ox + o, y0 = oy + o, x1 = ox + S - o, y1 = oy + S - o, r = 2500, pts = [];
    const corner = (x, y, a0, a1) => { for (let i = 0; i <= 3; i++) { const a = (a0 + (a1 - a0) * i / 3) * Math.PI / 180; pts.push(P(x + Math.cos(a) * r, y + Math.sin(a) * r)); } };
    if (!outside) { corner(x0 + r, y1 - r, 180, 90); corner(x1 - r, y1 - r, 90, 0); corner(x1 - r, y0 + r, 0, -90); corner(x0 + r, y0 + r, -90, -180); }
    else { corner(x1 - r, y0 + r, -90, 0); corner(x1 - r, y1 - r, 0, 90); corner(x0 + r, y1 - r, 90, 180); corner(x0 + r, y0 + r, 180, 270); }
    pts.push(pts[0]);
    sym('vehicle', color, type, pts[0], 0, {part: outside ? 'through traffic' : 'local traffic', anim: {type: 'path', speed, pts}});
  }

  return {W, eng, calls, S, CURB, PL, LANE, C, HSTREET, VSTREET, P, R, ck, push, line, sym, hatch, rect, arc, circ, rounded, vface, blob, wavy, box, wall, run, door, person, tree, lot, claim, streets, trafficLoop};
}
