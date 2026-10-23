// Agent Orange day one generator. Writes the calls file given as argv[2].
import fs from 'fs';
const S = 79248, R = Math.round;
const calls = [];
const walls = []; // {chunk, pts:[[x,y]...closed?], zmin, h}
const C = {street: 0, curb: 7, yellow: 11, white: 7, lot: 5, struct: 9, brick: 1, roof: 7, int: 3, elec: 4, plumb: 10, sewer: 5, veg: 2, veg2: 8, person: 6, car: 1, car2: 10, sign: 0};
const ck = (x, y) => Math.floor(x / S) + ':' + Math.floor(y / S);
const P = (x, y, z = 0) => [R(x), R(y), R(z)];
const push = (tool, args) => calls.push({tool, args});
const OWN = new Set(['0:0','1:0','0:1','1:1']);
const line = (discipline, color, pts, meta, extra = {}) => (discipline==='street'&&!OWN.has(ck(pts[0][0],pts[0][1])))?null:push('place_line', Object.assign({discipline, color, pts, meta}, extra));
const sym = (discipline, color, type, at, rot = 0, meta) => push('place_symbol', {discipline, color, type, at, rot: Math.round(rot * 1000) / 1000, meta});
const hatch = (discipline, color, pts, pattern, spacing, angle = 0, meta, color2) => push('place_hatch', Object.assign({discipline, color, pts, pattern, spacing, angle}, color2 !== undefined ? {color2} : {}, meta ? {meta} : {}));
const rect = (x0, y0, x1, y1, z = 0) => [P(x0, y0, z), P(x1, y0, z), P(x1, y1, z), P(x0, y1, z)];
const arc = (cx, cy, r, a0, a1, n, z = 0) => { const o = []; for (let i = 0; i <= n; i++) { const a = (a0 + (a1 - a0) * i / n) * Math.PI / 180; o.push(P(cx + Math.cos(a) * r, cy + Math.sin(a) * r, z)); } return o; };
const rounded = (x0, y0, x1, y1, r, z = 0, n = 5) => [...arc(x0 + r, y0 + r, r, 180, 270, n, z), ...arc(x1 - r, y0 + r, r, 270, 360, n, z), ...arc(x1 - r, y1 - r, r, 0, 90, n, z), ...arc(x0 + r, y1 - r, r, 90, 180, n, z)];
const vface = (ax, ay, bx, by, z0, z1) => [P(ax, ay, z0), P(bx, by, z0), P(bx, by, z1), P(ax, ay, z1)];

// Walls: closed or open polylines with wall meta. Footprint walls first so the building box is right.
function wall(building, pts2, h, zmin, closed, color = C.struct) {
  const pts = pts2.map(p => P(p[0], p[1], 0));
  line('structure', color, pts, {wall: true, h, zmin, building}, {closed: !!closed});
  const seq = closed ? pts.concat([pts[0]]) : pts;
  walls.push({chunk: ck(pts[0][0], pts[0][1]), seq, h, zmin});
}
// Service runs: auto declare penetrations where they cross a wall inside its height band.
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
const person = (at, rot, pose, activity, anim) => sym('activity', C.person, 'person', at, rot, Object.assign({pose, activity}, anim ? {anim} : {}));
const tree = (x, y, deg = 3, period = 5) => sym('vegetation', C.veg, 'tree', P(x, y), 0, {anim: {type: 'sway', deg, period}});
const door = (building, ax, ay, dir, w, label, knobSide = 1) => {
  // dir: 'x' door along x axis (wall runs east west), 'y' along y axis
  const h = 2134;
  const pts = dir === 'x' ? [P(ax, ay), P(ax, ay, h), P(ax + w, ay, h), P(ax + w, ay)] : [P(ax, ay), P(ax, ay, h), P(ax, ay + w, h), P(ax, ay + w)];
  line('structure', C.int, pts, {door: label, building, checks: [['door_height', h], ['door_width', w]]});
  const k = dir === 'x' ? P(ax + (knobSide > 0 ? w - 90 : 90), ay + 60 * knobSide, 965) : P(ax + 60 * knobSide, ay + (knobSide > 0 ? w - 90 : 90), 965);
  sym('interior', C.elec, 'knob', k, 0, {checks: [['knob_height', 965]], part: 'lever handle'});
};

// ---------- Streets. Portland-style 200 ft blocks, 60 ft right of way, 36 ft curb to curb.
const CURB = 5486, PL = 9144, LANE = 3353;
const VSTREET = ['Ocotillo Avenue', 'Palo Verde Avenue', 'Saguaro Avenue']; // x = 0, S, 2S
const HSTREET = ['Arroyo Street', 'Mesquite Street', 'Cholla Street'];     // y = 0, S, 2S
const owned = [[0, 0], [1, 0], [0, 1], [1, 1]];
for (const c of owned) push('claim_chunk', {chunk: c});
for (const [cx, cy] of owned) for (const edge of ['n', 's', 'e', 'w']) push('declare_port', {chunk: [cx, cy], edge, value: CURB});

function streetsForChunk(cx, cy, edges) {
  const ox = cx * S, oy = cy * S;
  const names = [HSTREET[cy], HSTREET[cy + 1], VSTREET[cx], VSTREET[cx + 1]];
  // Curb ring with rounded corner returns
  line('street', C.curb, rounded(ox + CURB, oy + CURB, ox + S - CURB, oy + S - CURB, 4572, 152, 6), {street: names, part: 'curb top, 152 mm reveal'}, {closed: true});
  line('street', C.curb, rounded(ox + CURB, oy + CURB, ox + S - CURB, oy + S - CURB, 4572, 0, 6), {street: names, part: 'gutter line'}, {closed: true});
  // Sidewalks, one hatch per side with scored joints every 1524 mm
  const sw = [
    [[ox + CURB + 4572, oy + CURB], [ox + S - CURB - 4572, oy + PL], 0, HSTREET[cy]],
    [[ox + CURB + 4572, oy + S - PL], [ox + S - CURB - 4572, oy + S - CURB], 0, HSTREET[cy + 1]],
    [[ox + CURB, oy + CURB + 4572], [ox + PL, oy + S - CURB - 4572], 90, VSTREET[cx]],
    [[ox + S - PL, oy + CURB + 4572], [ox + S - CURB, oy + S - CURB - 4572], 90, VSTREET[cx + 1]]
  ];
  for (const [a, b, ang, nm] of sw) hatch('paving', C.curb, rect(a[0], a[1], b[0], b[1], 152), 'lines', 1524, ang + 90, {sidewalk: nm, checks: [['sidewalk_width', PL - CURB]]});
  // Centerlines and lane edges along the south and west edges of this chunk, plus north and east where no owned chunk lies beyond
  const H = (y, nm, x0, x1) => {
    line('street', C.yellow, [P(x0, y + 100), P(x1, y + 100)], {street: nm, part: 'double yellow', checks: [['lane_width', LANE]]}, {color2: C.yellow});
    line('street', C.yellow, [P(x0, y - 100), P(x1, y - 100)], {street: nm, part: 'double yellow'});
    line('street', C.white, [P(x0, y + LANE), P(x1, y + LANE)], {street: nm, part: 'parking lane edge', checks: [['lane_width', LANE]]});
    line('street', C.white, [P(x0, y - LANE), P(x1, y - LANE)], {street: nm, part: 'parking lane edge', checks: [['lane_width', LANE]]});
  };
  const V = (x, nm, y0, y1) => {
    line('street', C.yellow, [P(x + 100, y0), P(x + 100, y1)], {street: nm, part: 'double yellow', checks: [['lane_width', LANE]]});
    line('street', C.yellow, [P(x - 100, y0), P(x - 100, y1)], {street: nm, part: 'double yellow'});
    line('street', C.white, [P(x + LANE, y0), P(x + LANE, y1)], {street: nm, part: 'parking lane edge', checks: [['lane_width', LANE]]});
    line('street', C.white, [P(x - LANE, y0), P(x - LANE, y1)], {street: nm, part: 'parking lane edge', checks: [['lane_width', LANE]]});
  };
  const lo = 7000, hi = S - 7000;
  const E = edges || {s: true, w: true, n: cy >= 1 && !!HSTREET[cy + 1], e: cx >= 1 && !!VSTREET[cx + 1]};
  if (E.s) H(oy, HSTREET[cy], ox + lo, ox + hi);
  if (E.w) V(ox, VSTREET[cx], oy + lo, oy + hi);
  if (E.n) H(oy + S - 1, HSTREET[cy + 1], ox + lo, ox + hi);
  if (E.e) V(ox + S - 1, VSTREET[cx + 1], oy + lo, oy + hi);
  // Crosswalk at the southwest intersection corner of this chunk
  hatch('street', C.white, rect(ox + 1200, oy - 5486 + 5486, ox + 4200, oy + 5486), 'lines', 610, 0, {street: VSTREET[cx], part: 'crosswalk'});
  hatch('street', C.white, rect(ox - 0, oy + 1200, ox + 5486, oy + 4200), 'lines', 610, 90, {street: HSTREET[cy], part: 'crosswalk'});
  // Corner signs, hydrant, street trees
  sym('street', C.sign, 'sign', P(ox + CURB + 700, oy + CURB + 700), 0.785, {text: HSTREET[cy] + ' / ' + VSTREET[cx]});
  sym('street', C.sign, 'sign', P(ox + S - CURB - 700, oy + S - CURB - 700), 0.785, {text: HSTREET[cy + 1] + ' / ' + VSTREET[cx + 1]});
  sym('street', C.brick, 'hydrant', P(ox + CURB + 600, oy + S / 2), 0);
}
for (const [cx, cy] of owned) streetsForChunk(cx, cy);

// Lots helper
const lot = (zone, x0, y0, x1, y1, name) => push('define_lot', {color: C.lot, zone, pts: rect(x0, y0, x1, y1), meta: {name}});

// ---------- Chunk 0,0: block of four parcels, convenience store on the southwest corner
{
  const ox = 0, oy = 0, a = PL, m = S / 2, b = S - PL;
  lot('commercial', a, a, m, m, 'corner market parcel');
  lot('residential', m, a, b, m, 'east bungalow parcel');
  lot('residential', a, m, m, b, 'west bungalow parcel');
  lot('park', m, m, b, b, 'neighborhood garden parcel');

  const NAME = 'Two Coyote Corner Market';
  const x0 = 13716, x1 = 32004, y0 = 25908, y1 = 38100, H = 4877, ZM = -1219;
  wall(NAME, [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], H, ZM, true);
  // Restroom partitions in the northeast corner: 2438 x 2743 single user room
  const rx0 = x1 - 2743, ry0 = y1 - 2438;
  wall(NAME, [[rx0, y1], [rx0, ry0], [x1, ry0]], 3048, 0, false, C.int);
  // Back room partition along the north wall west of the restroom
  wall(NAME, [[x0, y1 - 3658], [x0 + 4877, y1 - 3658]], 3048, 0, false, C.int);
  // Brick faces and a stucco gradient roof
  hatch('structure', C.brick, vface(x0, y0, x1, y0, 0, H), 'brick', 300, 0, {building: NAME, part: 'south face brick'}, C.struct);
  hatch('structure', C.brick, vface(x0, y0, x0, y1, 0, H), 'brick', 300, 0, {building: NAME, part: 'west face brick'}, C.struct);
  hatch('structure', C.brick, vface(x1, y0, x1, y1, 0, H), 'brick', 300, 0, {building: NAME, part: 'east face brick'}, C.struct);
  hatch('structure', C.roof, rect(x0, y0, x1, y1, H), 'gradient', 600, 90, {building: NAME, part: 'roof membrane, darker to the back'}, C.struct);
  // Storefront glazing on each side of the entry
  const dx = 22403; // door pair center about 22860
  hatch('structure', C.car2, vface(x0 + 1219, y0, dx - 300, y0, 600, 2743), 'lines', 450, 90, {building: NAME, part: 'storefront glass'});
  hatch('structure', C.car2, vface(dx + 2128 + 300, y0, x1 - 1219, y0, 600, 2743), 'lines', 450, 90, {building: NAME, part: 'storefront glass'});
  door(NAME, dx, y0, 'x', 914, 'entry left leaf', -1);
  door(NAME, dx + 914, y0, 'x', 914, 'entry right leaf', -1);
  door(NAME, rx0, ry0 + 300, 'y', 914, 'restroom door', -1);
  door(NAME, x0 + 1500, y1 - 3658, 'x', 914, 'back room door', -1);
  door(NAME, x1, y0 + 2000, 'y', 914, 'east service door', 1);
  sym('structure', C.sign, 'sign', P(dx + 914, y0 - 1600), 0, {text: NAME});
  sym('structure', C.brick, 'sign', P(dx + 2600, y0 - 300), 0, {text: 'OPEN 24 HOURS', anim: {type: 'blink', period: 1.6, duty: 0.7}});
  // Ceiling grid and beams
  hatch('structure', C.int, rect(x0 + 150, y0 + 150, x1 - 150, y1 - 150, 3048), 'cross', 1219, 0, {building: NAME, part: 'acoustic tile grid', checks: [['ceiling_height', 3048]]});
  for (let x = x0 + 4572; x < x1; x += 4572) line('structure', C.struct, [P(x, y0, 3658), P(x, y1, 3658)], {building: NAME, part: 'steel joist girder', checks: [['beam_height', 3658]]});
  // Shelving gondolas, five aisles running north south
  for (let i = 0; i < 5; i++) {
    const gx = x0 + 3800 + i * 2300;
    line('interior', C.int, rect(gx, y0 + 4000, gx + 1219, y0 + 9500, 1676), {building: NAME, part: 'gondola shelf top', checks: [['shelf_height', 1676]]}, {closed: true});
    line('interior', C.int, rect(gx, y0 + 4000, gx + 1219, y0 + 9500, 152), {building: NAME, part: 'gondola base'}, {closed: true});
    hatch('structure', C.int, vface(gx, y0 + 4000, gx, y0 + 9500, 152, 1676), 'lines', 380, 0, {building: NAME, part: 'shelf faces'});
  }
  // Walk-in style coolers on the west wall
  for (let i = 0; i < 6; i++) {
    const cy0 = y0 + 3000 + i * 1219;
    line('interior', C.car2, [P(x0 + 900, cy0, 0), P(x0 + 900, cy0, 2134), P(x0 + 900, cy0 + 1219, 2134), P(x0 + 900, cy0 + 1219, 0)], {building: NAME, part: 'cooler door ' + (i + 1), checks: [['shelf_height', 1981]]});
    sym('interior', C.elec, 'knob', P(x0 + 960, cy0 + 1100, 1067), 0, {checks: [['knob_height', 1067]], part: 'cooler handle'});
  }
  // Checkout counter near the entry, east side
  line('interior', C.brick, [P(x1 - 6000, y0 + 1800, 965), P(x1 - 2400, y0 + 1800, 965), P(x1 - 2400, y0 + 3200, 965)], {building: NAME, part: 'checkout counter top', checks: [['counter_height', 965]]});
  line('interior', C.int, [P(x1 - 4700, y0 + 1800, 965), P(x1 - 4700, y0 + 1800, 1350)], {building: NAME, part: 'register screen'});
  line('interior', C.int, rect(x1 - 4300, y0 + 1500, x1 - 3900, y0 + 1750, 1000), {building: NAME, part: 'receipt printer'}, {closed: true});
  sym('interior', C.brick, 'mark', P(x1 - 3200, y0 + 1300, 0), 0, {part: 'lottery kiosk spot'});
  // Restroom fixtures
  line('interior', C.int, rounded(x1 - 900, y1 - 900, x1 - 300, y1 - 200, 200, 432, 3), {building: NAME, part: 'water closet rim'}, {closed: true});
  line('interior', C.int, rect(rx0 + 300, y1 - 700, rx0 + 900, y1 - 200, 864), {building: NAME, part: 'lavatory', checks: [['counter_height', 864]]}, {closed: true});
  line('interior', C.int, [P(rx0 + 1200, y1 - 150, 840), P(rx0 + 2100, y1 - 150, 840)], {building: NAME, part: 'grab bar'});
  // Lighting and outlets
  for (let x = x0 + 2286; x < x1; x += 3658) for (let y = y0 + 1829; y < y1 - 2600; y += 3658) sym('electrical', C.elec, 'light', P(x, y, 3048), 0, {part: '2x2 led troffer'});
  for (const [x, y] of [[x0 + 150, y0 + 1500], [x0 + 150, y1 - 5000], [x1 - 150, y0 + 6000], [x1 - 150, y0 + 9000], [x1 - 4000, y0 + 150], [x0 + 3000, y1 - 3800], [rx0 + 150, y1 - 1500]]) sym('electrical', C.elec, 'outlet', P(x, y, 457), 0, {checks: [['outlet_height', 457]]});
  sym('electrical', C.elec, 'outlet', P(x1 - 3000, y0 + 1700, 1067), 0, {checks: [['outlet_height', 1067]], part: 'counter outlet'});
  sym('electrical', C.elec, 'switch', P(rx0 - 150, ry0 + 1350, 1219), 0, {part: 'restroom light switch'});
  // Electrical service: pole on the Ocotillo Avenue sidewalk, overhead drop to a meter on the west wall, conduit into the panel
  const pole = [CURB + 900, y0 + 6096];
  sym('electrical', C.struct, 'pole', P(pole[0], pole[1]), 0, {part: 'utility pole with transformer'});
  run('electrical', C.elec, [P(pole[0], pole[1], 8230), P(x0 - 200, y0 + 6096, 4200), P(x0 - 200, y0 + 6096, 1676)], {building: NAME, part: 'overhead service drop and mast'});
  run('electrical', C.elec, [P(x0 - 200, y0 + 6096, 1676), P(x0 + 600, y0 + 6096, 1676), P(x0 + 600, y1 - 2000, 1676)], {building: NAME, part: 'service conduit to panel in back room'});
  line('electrical', C.elec, rect(x0 + 450, y1 - 2400, x0 + 750, y1 - 1600, 1676), {building: NAME, part: '200 A panel'}, {closed: true});
  run('electrical', C.elec, [P(x0 + 600, y1 - 2000, 2900), P(x1 - 600, y1 - 2000, 2900)], {building: NAME, part: 'branch circuit above ceiling'});
  // Water and sewer from Arroyo Street
  run('plumbing', C.plumb, [P(x1 - 1300, 1200, -1067), P(x1 - 1300, y1 - 900, -1067), P(x1 - 1300, y1 - 900, 864)], {building: NAME, part: '1 inch copper water service with meter box at the sidewalk'});
  sym('plumbing', C.plumb, 'mark', P(x1 - 1300, 7000, 0), 0, {part: 'water meter box'});
  run('plumbing', C.sewer, [P(x1 - 600, y1 - 600, -600), P(x1 - 600, 2400, -1829)], {building: NAME, part: '4 inch PVC sewer lateral at 2 percent'});
  run('plumbing', C.plumb, [P(x1 - 1300, y1 - 2000, 864), P(rx0 + 600, y1 - 2000, 864), P(rx0 + 600, y1 - 450, 864)], {building: NAME, part: 'supply to lavatory'});
  // Parking lot: aisle, stalls nose in toward the store, one accessible stall with aisle
  hatch('paving', C.curb, rect(a + 1500, a + 600, x1 + 3000, y0 - 2438), 'dots', 900, 0, {part: 'asphalt'}, C.struct);
  hatch('paving', C.curb, rect(x0, y0 - 2438, x1, y0), 'lines', 1219, 90, {part: 'concrete walk to the door'});
  let sx = x0;
  const stallY0 = y0 - 2438 - 5486, stallY1 = y0 - 2438;
  line('paving', C.white, [P(sx, stallY0), P(sx, stallY1)], {part: 'stall stripe'});
  line('paving', C.car2, rect(sx, stallY0, sx + 3658, stallY1), {part: 'accessible stall', checks: [['stall_width', 3658], ['stall_depth', 5486]]}, {closed: true});
  sym('paving', C.car2, 'sign', P(sx + 1829, stallY1 - 200), Math.PI, {text: 'ACCESSIBLE PARKING'});
  sx += 3658;
  hatch('paving', C.car2, rect(sx, stallY0, sx + 2438, stallY1), 'lines', 450, 45, {part: 'access aisle, 2438 wide'});
  sx += 2438;
  for (let i = 0; i < 5; i++) { line('paving', C.white, [P(sx, stallY0), P(sx, stallY1), P(sx + 2743, stallY1), P(sx + 2743, stallY0)], {part: 'stall ' + (i + 1), checks: [['stall_width', 2743], ['stall_depth', 5486]]}); sx += 2743; }
  // Driveway to Arroyo Street with flared apron
  line('paving', C.curb, [P(34000, PL), P(34900, CURB + 600), P(35200, CURB), P(41000, CURB), P(41300, CURB + 600), P(42200, PL)], {part: 'driveway apron'});
  line('paving', C.curb, [P(35200, CURB), P(36000, stallY0 - 2000), P(x1 + 1200, stallY0 - 2400)], {part: 'drive lane edge'});
  // Cars and people
  sym('vehicle', C.car, 'car', P(x0 + 1829, stallY0 + 2743), 0, {part: 'van in accessible stall'});
  sym('vehicle', C.car2, 'car', P(x0 + 6096 + 1371, stallY0 + 2743), 0);
  sym('vehicle', C.struct, 'truck', P(x0 + 6096 + 2743 * 3 + 1371, stallY0 + 4000), 0, {part: 'farm pickup with a hay bale'});
  sym('vehicle', C.car, 'car', P(38000, 2000), Math.PI / 2, {anim: {type: 'path', speed: 6000, pts: [P(38000, 2000), P(36500, 7000), P(36000, 13000), P(30000, 14500), P(28000, 18000), P(27500, 21000)]}, part: 'sedan pulling in'});
  person(P(x1 - 4200, y0 + 2800), Math.PI, 'standing', 'ringing up a customer');
  person(P(x1 - 4200, y0 + 1000), 0, 'standing', 'paying for ice and gas station coffee');
  person(P(x0 + 1700, y0 + 6000), Math.PI / 2, 'standing', 'picking a drink from the cooler');
  person(P(x0 + 6500, y0 + 7000), 0, 'standing', 'restocking chips on aisle two');
  person(P(dx + 300, y0 - 1200), 0, 'walking', 'heading inside for a lottery ticket', {type: 'path', speed: 1200, pts: [P(x0 + 3000, stallY0 + 4000), P(dx + 300, y0 - 1400), P(dx + 900, y0 - 400)]});
  person(P(x0 + 1829 + 1200, stallY0 + 2000), 0, 'standing', 'unloading a wheelchair from the van');
  sym('activity', C.brick, 'cart', P(x0 + 8000, y0 - 1200), 0, {activity: 'cart left by the ice chest'});
  line('interior', C.car2, rect(x0 + 300, y0 - 1600, x0 + 2100, y0 - 600, 1300), {building: NAME, part: 'outdoor ice chest'}, {closed: true});
  // Desert landscaping strip with winding river rock
  line('vegetation', C.veg2, [P(a + 600, a + 600), P(a + 2400, a + 3200), P(a + 1500, a + 7000), P(a + 3000, a + 10500), P(a + 2200, a + 14000), P(a + 3400, a + 18000), P(a + 2600, a + 22000)], {part: 'river rock swale'});
  for (const [x, y] of [[a + 1300, a + 4500], [a + 2700, a + 12000], [a + 1800, a + 19500]]) sym('vegetation', C.veg2, 'shrub', P(x, y), 0, {part: 'brittlebush'});
  tree(a + 2200, a + 8500, 4, 6); tree(a + 2000, a + 16000, 3, 5);
  // Neighbor parcels: a garden with winding beds and two small bungalows
  const G = 'Mesquite Bean Community Garden';
  for (let i = 0; i < 6; i++) {
    const gy = m + 3000 + i * 4800;
    const bed = []; for (let k = 0; k <= 14; k++) bed.push(P(m + 3000 + k * 1900, gy + Math.sin(k * 0.8 + i) * 900));
    line('vegetation', C.veg2, bed, {part: 'raised bed edge', garden: G});
    for (let k = 1; k < 14; k += 3) sym('vegetation', C.veg, 'grass', P(m + 3000 + k * 1900, gy + 500 + Math.sin(k * 0.8 + i) * 900), 0, {part: 'squash and chiles', anim: {type: 'sway', deg: 6, period: 2 + k * 0.1}});
  }
  sym('vegetation', C.sign, 'sign', P(m + 1500, m + 1200), 0, {text: G});
  person(P(m + 9000, m + 8200), 0, 'standing', 'watering tomatoes with a hose');
  person(P(m + 15000, m + 17800), 0, 'sitting', 'pulling weeds from the chile bed');
  sym('activity', C.brick, 'dog', P(m + 15800, m + 17500), 1, {activity: 'napping in the shade of the bed'});
  sym('activity', C.struct, 'umbrella', P(m + 25000, m + 25000), 0, {activity: 'shade over the seed swap table'});
  sym('activity', C.brick, 'table', P(m + 25000, m + 25000), 0, {activity: 'seed packets laid out for trading'});
  bungalow('Cinder Block Bungalow', m + 6000, a + 8000, 0);
  bungalow('Blue Door Bungalow', a + 6000, m + 8000, 0);
}

// A small 1950s block house with a carport, used on residential parcels
function bungalow(NAME, x0, y0, variant) {
  const w = 12192, d = 9144, x1 = x0 + w, y1 = y0 + d, H = 3200;
  wall(NAME, [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], H, -610, true, C.struct);
  wall(NAME, [[x0 + 5486, y0], [x0 + 5486, y1]], 2743, 0, false, C.int);
  hatch('structure', C.struct, vface(x0, y0, x1, y0, 0, H), 'brick', 406, 0, {building: NAME, part: 'painted block'}, C.brick);
  hatch('structure', C.roof, [P(x0 - 600, y0 - 600, H), P(x1 + 600, y0 - 600, H), P(x1 + 600, y1 + 600, H), P(x0 - 600, y1 + 600, H)], 'gradient', 500, 0, {building: NAME, part: 'shallow roof with overhang'}, C.brick);
  door(NAME, x0 + 8000, y0, 'x', 914, 'front door', -1);
  door(NAME, x0 + 5486, y0 + 2000, 'y', 813, 'bedroom door', 1);
  hatch('structure', C.int, rect(x0 + 150, y0 + 150, x1 - 150, y1 - 150, 2438), 'lines', 1219, 0, {building: NAME, part: 'ceiling', checks: [['ceiling_height', 2438]]});
  line('interior', C.int, [P(x1 - 3600, y1 - 700, 914), P(x1 - 300, y1 - 700, 914)], {building: NAME, part: 'kitchen counter', checks: [['counter_height', 914]]});
  line('interior', C.int, rect(x0 + 800, y1 - 2800, x0 + 3000, y1 - 600, 600), {building: NAME, part: 'bed'}, {closed: true});
  sym('interior', C.int, 'table', P(x0 + 9000, y0 + 4000), 0, {part: 'kitchen table'});
  sym('electrical', C.elec, 'light', P(x0 + 2700, y0 + 4500, 2438), 0);
  sym('electrical', C.elec, 'light', P(x0 + 8800, y0 + 4500, 2438), 0);
  for (const [x, y] of [[x0 + 150, y0 + 3000], [x1 - 150, y0 + 3000], [x1 - 2000, y1 - 150]]) sym('electrical', C.elec, 'outlet', P(x, y, 406), 0, {checks: [['outlet_height', 406]]});
  sym('electrical', C.elec, 'outlet', P(x1 - 1500, y1 - 150, 1067), 0, {checks: [['outlet_height', 1067]], part: 'counter outlet'});
  sym('structure', C.sign, 'sign', P(x0 + 9500, y0 - 2500), 0, {text: NAME});
  // Carport and car
  line('structure', C.struct, rect(x1 + 300, y0, x1 + 3600, y0 + 6096, 2743), {building: NAME, part: 'carport roof edge'}, {closed: true});
  sym('vehicle', C.car2, 'car', P(x1 + 1950, y0 + 3000), 0);
  hatch('paving', C.curb, rect(x1 + 300, y0 - 6000, x1 + 3600, y0), 'lines', 610, 0, {part: 'gravel drive'});
  person(P(x0 + 9000, y0 + 4500), 0, 'sitting', 'eating breakfast at the kitchen table');
  person(P(x1 + 1950, y0 - 1200), 0, 'standing', 'checking the oil before work');
  tree(x0 - 2500, y0 + 2000, 4, 7);
}

// ---------- Chunk 1,0: a drive thru diner with a patio
{
  const ox = S, a = ox + PL, b = ox + S - PL, ya = PL, yb = S - PL, m = ox + S / 2;
  lot('commercial', a, ya, b, S / 2, 'diner parcel');
  lot('residential', a, S / 2, b, yb, 'courtyard homes parcel');
  const NAME = 'Little Chuckwalla Diner';
  const x0 = a + 6096, x1 = x0 + 15240, y0 = 18288, y1 = y0 + 12192, H = 4572;
  wall(NAME, [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], H, -1219, true);
  wall(NAME, [[x0 + 9144, y0], [x0 + 9144, y1]], 3048, 0, false, C.int); // dining room / kitchen
  wall(NAME, [[x0 + 9144, y1 - 2438], [x0, y1 - 2438]], 3048, 0, false, C.int); // restroom strip
  wall(NAME, [[x0 + 4572, y1 - 2438], [x0 + 4572, y1]], 3048, 0, false, C.int);
  hatch('structure', C.brick, vface(x0, y0, x1, y0, 0, H), 'lines', 300, 90, {building: NAME, part: 'board and batten siding'}, C.struct);
  hatch('structure', C.brick, vface(x1, y0, x1, y1, 0, H), 'lines', 300, 90, {building: NAME, part: 'board and batten siding'}, C.struct);
  hatch('structure', C.roof, rect(x0, y0, x1, y1, H), 'gradient', 500, 0, {building: NAME, part: 'roof'}, C.brick);
  door(NAME, x0 + 3000, y0, 'x', 914, 'front door', -1);
  door(NAME, x0 + 9144, y0 + 3000, 'y', 914, 'kitchen swing door', 1);
  door(NAME, x0 + 1200, y1 - 2438, 'x', 864, 'restroom one', 1);
  door(NAME, x0 + 5800, y1 - 2438, 'x', 864, 'restroom two', 1);
  door(NAME, x1, y1 - 3000, 'y', 914, 'kitchen back door', 1);
  hatch('structure', C.int, rect(x0 + 150, y0 + 150, x1 - 150, y1 - 150, 3048), 'cross', 1219, 0, {building: NAME, part: 'ceiling grid', checks: [['ceiling_height', 3048]]});
  for (let x = x0 + 3810; x < x1; x += 3810) line('structure', C.struct, [P(x, y0, 3658), P(x, y1, 3658)], {building: NAME, part: 'glulam beam', checks: [['beam_height', 3658]]});
  // Dining: counter with stools and booths
  line('interior', C.brick, [P(x0 + 600, y0 + 6500, 1067), P(x0 + 8500, y0 + 6500, 1067)], {building: NAME, part: 'lunch counter', checks: [['counter_height', 1067]]});
  for (let i = 0; i < 6; i++) line('interior', C.int, arc(x0 + 1300 + i * 1250, y0 + 5800, 200, 0, 360, 6, 760), {building: NAME, part: 'swivel stool', anim: {type: 'spin', rpm: 4 + i}});
  for (let i = 0; i < 4; i++) line('interior', C.int, rect(x0 + 600 + i * 2100, y0 + 600, x0 + 2300 + i * 2100, y0 + 2400, 457), {building: NAME, part: 'booth'}, {closed: true});
  // Kitchen line and point of sale
  const kx = x0 + 9144;
  line('interior', C.int, rect(kx + 600, y0 + 600, kx + 5500, y0 + 1500, 914), {building: NAME, part: 'flat top griddle and fryers', checks: [['counter_height', 914]]}, {closed: true});
  line('interior', C.int, rect(kx + 600, y0 + 4000, kx + 5500, y0 + 4800, 914), {building: NAME, part: 'prep line with cold well', checks: [['counter_height', 914]]}, {closed: true});
  line('interior', C.int, [P(kx + 600, y0 + 4400, 1500), P(kx + 5500, y0 + 4400, 1500)], {building: NAME, part: 'ticket rail over the line'});
  line('interior', C.int, rect(kx + 2000, y0 + 3600, kx + 2400, y0 + 3900, 1000), {building: NAME, part: 'kitchen printer for tickets'}, {closed: true});
  line('interior', C.int, [P(x0 + 4000, y0 + 6500, 1067), P(x0 + 4000, y0 + 6500, 1450)], {building: NAME, part: 'pos terminal on the counter'});
  line('interior', C.int, [P(x1 - 300, y0 + 2400, 1067), P(x1 - 300, y0 + 2400, 1450)], {building: NAME, part: 'drive thru window terminal'});
  line('interior', C.struct, rect(kx + 600, y1 - 4000, kx + 3200, y1 - 600, 2134), {building: NAME, part: 'walk in cooler box', checks: [['shelf_height', 2134]]}, {closed: true});
  line('interior', C.int, rect(kx + 3800, y1 - 3000, kx + 5600, y1 - 600, 1829), {building: NAME, part: 'dry storage shelving', checks: [['shelf_height', 1829]]}, {closed: true});
  for (let x = x0 + 1900; x < x1; x += 3810) for (let y = y0 + 2000; y < y1 - 2400; y += 3600) sym('electrical', C.elec, 'light', P(x, y, 3048), 0);
  for (const [x, y] of [[x0 + 150, y0 + 3000], [x0 + 150, y0 + 7000], [kx + 150, y0 + 7000], [x1 - 150, y0 + 6000]]) sym('electrical', C.elec, 'outlet', P(x, y, 457), 0, {checks: [['outlet_height', 457]]});
  for (const x of [kx + 1000, kx + 3000, kx + 5000]) sym('electrical', C.elec, 'outlet', P(x, y0 + 4850, 1118), 0, {checks: [['outlet_height', 1118]], part: 'prep line outlet'});
  sym('interior', C.int, 'mark', P(kx + 3000, y0 + 1050, 2300), 0, {part: 'exhaust hood fan', anim: {type: 'spin', rpm: 40}});
  // Services from Arroyo Street and a pole on Palo Verde
  sym('electrical', C.struct, 'pole', P(ox + CURB + 900, y0 + 2000), 0);
  run('electrical', C.elec, [P(ox + CURB + 900, y0 + 2000, 8230), P(x0 - 200, y0 + 2000, 4000), P(x0 - 200, y0 + 2000, 1676)], {building: NAME, part: 'service drop'});
  run('electrical', C.elec, [P(x0 - 200, y0 + 2000, 1676), P(kx + 300, y0 + 2000, 2900), P(kx + 300, y1 - 300, 2900)], {building: NAME, part: 'feeder to kitchen panel'});
  run('plumbing', C.plumb, [P(kx + 4500, 1200, -1067), P(kx + 4500, y0 + 4400, -1067), P(kx + 4500, y0 + 4400, 914)], {building: NAME, part: 'water service'});
  run('plumbing', C.sewer, [P(kx + 2500, y0 + 4400, -600), P(kx + 2500, 2400, -1829)], {building: NAME, part: 'sewer lateral through grease interceptor'});
  sym('plumbing', C.sewer, 'mark', P(kx + 2500, y0 - 2500, 0), 0, {part: 'grease interceptor lid'});
  run('plumbing', C.plumb, [P(kx + 4500, y0 + 4400, 864), P(x0 + 2400, y0 + 4400, 864), P(x0 + 2400, y1 - 1200, 864)], {building: NAME, part: 'supply to restrooms'});
  // Drive thru lane wraps the building in a smooth curve
  const dt = [P(a + 2400, 12000), ...arc(x0 - 1500, y1 + 1500, 3500, 200, 90, 6).map(p => P(p[0], p[1])), ...arc(x1 + 2000, y1 + 1500, 3000, 90, 0, 6).map(p => P(p[0], p[1])), P(x1 + 5000, y0), ...arc(x1 + 1500, y0 - 3500, 3500, 0, -90, 6).map(p => P(p[0], p[1])), P(b - 1500, PL)];
  line('paving', C.curb, dt, {part: 'drive thru lane centerline', checks: [['lane_width', 3353]]}, {color2: C.yellow});
  sym('structure', C.brick, 'sign', P(x1 + 3500, y1 - 1500), -Math.PI / 2, {text: 'MENU BOARD: GREEN CHILE BURGER', building: NAME});
  sym('structure', C.sign, 'sign', P(x0 + 3400, y0 - 3000), 0, {text: NAME});
  for (let i = 0; i < 3; i++) sym('vehicle', [C.car, C.car2, C.struct][i], 'car', dt[2 + i * 5], 0, {anim: {type: 'path', speed: 2200, pts: dt.slice(2 + i * 5).concat(dt.slice(0, 2 + i * 5))}, part: 'drive thru queue'});
  person(P(x1 - 900, y0 + 2400), Math.PI / 2, 'standing', 'handing a bag out the drive thru window');
  person(P(kx + 3000, y0 + 2000), Math.PI, 'standing', 'flipping burgers on the flat top');
  person(P(kx + 3000, y0 + 3600), 0, 'standing', 'reading tickets off the printer');
  person(P(x0 + 2500, y0 + 5800), 0, 'sitting', 'drinking coffee at the counter');
  person(P(x0 + 3900, y0 + 7200), Math.PI, 'standing', 'ringing up a pie to go');
  person(P(x0 + 1500, y0 + 1500), 0, 'sitting', 'sharing pancakes in a booth');
  // Patio on the south side
  hatch('paving', C.brick, rect(x0, y0 - 6096, x0 + 9144, y0 - 1219), 'cross', 610, 45, {part: 'saltillo tile patio'}, C.struct);
  for (let i = 0; i < 3; i++) {
    const px = x0 + 1800 + i * 2900, py = y0 - 3600;
    sym('activity', C.struct, 'umbrella', P(px, py), 0, {activity: ['shade over a family lunch', 'shade over two truckers', 'shade over a birthday table'][i]});
    sym('activity', C.brick, 'table', P(px, py), 0, {activity: ['kids splitting a basket of fries', 'trading road stories over burgers', 'cutting a cake on the patio'][i]});
    person(P(px - 700, py - 300), 0.3, 'sitting', ['sipping horchata in the shade', 'waiting on a refill', 'singing happy birthday'][i]);
  }
  sym('activity', C.brick, 'bike', P(x0 - 1500, y0 - 2000), 0, {activity: 'bike leaned on the patio rail'});
  tree(x0 - 2500, y0 - 5000, 5, 6); tree(x1 + 2500, y0 - 6500, 4, 5);
  bungalow('Saltbush Court House', a + 5000, S / 2 + 6000, 0);
  bungalow('Red Rock Court House', a + 26000, S / 2 + 18000, 0);
  for (let i = 0; i < 5; i++) tree(a + 3000 + i * 11000, S - PL - 2500, 3, 4 + i * 0.4);
}

// ---------- Chunk 0,1: Arroyo Seco park with a winding dry wash
{
  const oy = S, a = PL, b = S - PL, ya = oy + PL, yb = oy + S - PL;
  lot('park', a, ya, b, yb, 'park parcel');
  const wash = []; for (let k = 0; k <= 40; k++) { const t = k / 40; wash.push(P(a + 2000 + t * (b - a - 4000), ya + 30000 + Math.sin(t * Math.PI * 3) * 9000 + Math.sin(t * 17) * 900)); }
  const bank = (off) => wash.map((p, i) => P(p[0], p[1] + off + Math.sin(i * 1.3) * 500));
  line('vegetation', C.struct, bank(2400), {part: 'north bank of the dry wash'}, {color2: C.brick});
  line('vegetation', C.struct, bank(-2400), {part: 'south bank of the dry wash'}, {color2: C.brick});
  line('vegetation', C.curb, wash, {part: 'sandy channel'});
  for (let i = 3; i < 40; i += 4) sym('vegetation', C.veg2, 'shrub', P(wash[i][0], wash[i][1] + 3300), 0, {part: 'desert willow', anim: {type: 'sway', deg: 5, period: 3 + i * 0.05}});
  // Footbridge over the wash
  const bx = wash[20][0], by = wash[20][1];
  line('structure', C.struct, [P(bx - 1200, by - 4000, 300), P(bx - 1200, by, 900), P(bx - 1200, by + 4000, 300)], {part: 'footbridge rail west'});
  line('structure', C.struct, [P(bx + 1200, by - 4000, 300), P(bx + 1200, by, 900), P(bx + 1200, by + 4000, 300)], {part: 'footbridge rail east'});
  // Loop path
  const loop = []; for (let k = 0; k < 48; k++) { const t = k / 48 * Math.PI * 2; loop.push(P(S / 2 + Math.cos(t) * 26000 + Math.cos(t * 3) * 1500, oy + S / 2 + Math.sin(t) * 26000 + Math.sin(t * 2) * 1500)); }
  line('paving', C.curb, loop, {part: 'decomposed granite loop trail'}, {closed: true});
  // Ramada named as a structure
  const RN = 'Arroyo Seco Ramada';
  const rx0 = a + 6000, ry0 = ya + 6000, rx1 = rx0 + 7315, ry1 = ry0 + 6096;
  wall(RN, [[rx0, ry0], [rx0, ry1]], 3658, -914, false);
  wall(RN, [[rx1, ry0], [rx1, ry1]], 3658, -914, false);
  hatch('structure', C.struct, rect(rx0, ry0, rx1, ry1, 3658), 'lines', 300, 0, {building: RN, part: 'slatted shade roof'}, C.brick);
  line('structure', C.struct, [P(rx0, ry0, 3200), P(rx1, ry0, 3200)], {building: RN, part: 'beam', checks: [['beam_height', 3200]]});
  line('structure', C.struct, [P(rx0, ry1, 3200), P(rx1, ry1, 3200)], {building: RN, part: 'beam', checks: [['beam_height', 3200]]});
  for (let i = 0; i < 2; i++) { sym('interior', C.brick, 'table', P(rx0 + 2200 + i * 3000, ry0 + 3048), 0, {part: 'picnic table'}); }
  sym('electrical', C.elec, 'light', P(rx0 + 3650, ry0 + 3048, 3200), 0);
  sym('electrical', C.elec, 'outlet', P(rx0 + 150, ry0 + 1500, 457), 0, {checks: [['outlet_height', 457]]});
  sym('structure', C.sign, 'sign', P(rx0 - 1200, ry0 - 1200), 0, {text: RN});
  // Playground with a merry go round and swings
  const px = b - 16000, py = ya + 8000;
  line('activity', C.brick, arc(px, py, 1800, 0, 360, 12, 400), {part: 'merry go round', anim: {type: 'spin', rpm: 12}});
  for (let i = 0; i < 3; i++) line('activity', C.car2, [P(px + 4500 + i * 900, py, 2400), P(px + 4500 + i * 900, py, 600)], {part: 'swing', anim: {type: 'sway', deg: 25, period: 2.4 + i * 0.2, pivot: P(px + 4500 + i * 900, py, 2400)}});
  person(P(px + 1500, py), 0, 'standing', 'pushing the merry go round');
  person(P(px + 4500, py), 0, 'sitting', 'swinging as high as possible', {type: 'sway', deg: 25, period: 2.4, pivot: P(px + 4500, py, 2400)});
  person(P(px - 2500, py - 1500), 1, 'standing', 'watching the kids from the shade');
  person(P(rx0 + 2200, ry0 + 2400), 0, 'sitting', 'grilling carne asada at the ramada');
  person(P(rx0 + 5200, ry0 + 2400), 0, 'sitting', 'playing dominoes with neighbors');
  person(P(bx, by), Math.PI / 2, 'walking', 'crossing the footbridge with groceries', {type: 'path', speed: 1100, pts: [P(bx, by - 6000), P(bx, by + 6000)]});
  const jog = loop.filter((_, i) => i % 2 === 0);
  person(jog[0], 0, 'walking', 'jogging the loop before it gets hot', {type: 'path', speed: 2800, pts: jog});
  person(jog[10], 0, 'walking', 'walking a dog around the loop', {type: 'path', speed: 1200, pts: jog.slice(10).concat(jog.slice(0, 10))});
  sym('activity', C.brick, 'dog', jog[11], 0, {activity: 'tugging toward a quail', anim: {type: 'path', speed: 1200, pts: jog.slice(11).concat(jog.slice(0, 11))}});
  sym('activity', C.car2, 'bike', jog[20], 0, {activity: 'kid riding laps on a bmx', anim: {type: 'path', speed: 4000, pts: jog.slice(20).concat(jog.slice(0, 20))}});
  for (let i = 0; i < 4; i++) sym('activity', C.struct, 'bench', loop[i * 12 + 6], i * 1.57, {activity: ['resting after the loop', 'reading a paperback', 'feeding the quail', 'waiting for the bus'][i]});
  for (let i = 0; i < 10; i++) tree(a + 4000 + (i % 5) * 13000 + (i * 977 % 3000), ya + 48000 + Math.floor(i / 5) * 9000, 3 + i % 3, 5 + i * 0.3);
}

// ---------- Chunk 1,1: feed and tractor supply yard
{
  const ox = S, oy = S, a = ox + PL, b = ox + S - PL, ya = oy + PL, yb = oy + S - PL;
  lot('commercial', a, ya, b, oy + S / 2, 'feed store parcel');
  lot('industrial', a, oy + S / 2, b, yb, 'equipment yard parcel');
  const NAME = 'Hard Pan Feed and Tractor';
  const x0 = a + 4000, x1 = x0 + 24384, y0 = ya + 9000, y1 = y0 + 15240, H = 6096;
  wall(NAME, [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], H, -914, true);
  wall(NAME, [[x0 + 15240, y0], [x0 + 15240, y1]], 4267, 0, false, C.int);
  hatch('structure', C.roof, vface(x0, y0, x1, y0, 0, H), 'lines', 305, 90, {building: NAME, part: 'corrugated steel siding'}, C.struct);
  hatch('structure', C.roof, vface(x0, y1, x1, y1, 0, H), 'lines', 305, 90, {building: NAME, part: 'corrugated steel siding'}, C.struct);
  hatch('structure', C.roof, rect(x0, y0, x1, y1, H), 'gradient', 700, 90, {building: NAME, part: 'standing seam roof'}, C.brick);
  door(NAME, x0 + 5000, y0, 'x', 914, 'store entry', -1);
  door(NAME, x0 + 15240, y0 + 6000, 'y', 1067, 'warehouse man door', 1);
  line('structure', C.int, [P(x0 + 17000, y0), P(x0 + 17000, y0, 4267), P(x0 + 21877, y0, 4267), P(x0 + 21877, y0)], {building: NAME, part: 'roll up dock door 16 ft'});
  hatch('structure', C.struct, vface(x0 + 17000, y0 - 10, x0 + 21877, y0 - 10, 0, 4267), 'lines', 200, 0, {building: NAME, part: 'roll up slats', anim: {type: 'bob', mm: 1200, period: 12}});
  hatch('structure', C.int, rect(x0 + 150, y0 + 150, x0 + 15090, y1 - 150, 3658), 'lines', 1219, 0, {building: NAME, part: 'store ceiling', checks: [['ceiling_height', 3658]]});
  for (let x = x0 + 4064; x < x1; x += 4064) line('structure', C.struct, [P(x, y0, 5182), P(x, y1, 5182)], {building: NAME, part: 'rigid frame rafter', checks: [['beam_height', 5182]]});
  for (let i = 0; i < 4; i++) line('interior', C.int, rect(x0 + 2000 + i * 3000, y0 + 4000, x0 + 3200 + i * 3000, y1 - 3000, 2134), {building: NAME, part: 'pallet rack for feed bags', checks: [['shelf_height', 2134]]}, {closed: true});
  line('interior', C.brick, [P(x0 + 1000, y0 + 1500, 1016), P(x0 + 4500, y0 + 1500, 1016)], {building: NAME, part: 'sales counter', checks: [['counter_height', 1016]]});
  for (let i = 0; i < 6; i++) line('interior', C.int, rect(x0 + 16000 + (i % 3) * 2700, y0 + 6500 + Math.floor(i / 3) * 3500, x0 + 18200 + (i % 3) * 2700, y0 + 9000 + Math.floor(i / 3) * 3500, 1200), {building: NAME, part: 'stacked hay bales'}, {closed: true});
  for (let x = x0 + 2000; x < x0 + 15000; x += 4000) for (let y = y0 + 2500; y < y1; y += 4500) sym('electrical', C.elec, 'light', P(x, y, 3658), 0);
  for (let x = x0 + 17500; x < x1; x += 3500) sym('electrical', C.elec, 'light', P(x, y0 + 7600, 5182), 0, {part: 'high bay'});
  for (const [x, y] of [[x0 + 150, y0 + 3000], [x0 + 150, y0 + 9000], [x0 + 15090, y0 + 2000], [x1 - 150, y0 + 9000]]) sym('electrical', C.elec, 'outlet', P(x, y, 457), 0, {checks: [['outlet_height', 457]]});
  sym('electrical', C.struct, 'pole', P(a - PL + CURB + 900, y0 + 1000), 0);
  run('electrical', C.elec, [P(a - PL + CURB + 900, y0 + 1000, 8230), P(x0 - 200, y0 + 1000, 5000), P(x0 - 200, y0 + 1000, 1676)], {building: NAME, part: 'service drop'});
  run('electrical', C.elec, [P(x0 - 200, y0 + 1000, 1676), P(x0 + 800, y0 + 1000, 1676), P(x0 + 800, y1 - 1000, 1676)], {building: NAME, part: 'service conduit'});
  run('plumbing', C.plumb, [P(x0 + 3000, oy + 1200, -1067), P(x0 + 3000, y0 + 2500, -1067), P(x0 + 3000, y0 + 2500, 864)], {building: NAME, part: 'water service'});
  run('plumbing', C.sewer, [P(x0 + 3600, y0 + 2500, -600), P(x0 + 3600, oy + 2400, -1829)], {building: NAME, part: 'sewer lateral'});
  sym('structure', C.sign, 'sign', P(x0 + 5400, y0 - 2500), 0, {text: NAME});
  hatch('paving', C.curb, rect(a + 1000, ya + 1000, b - 1000, y0 - 600), 'dots', 1000, 0, {part: 'gravel yard'});
  // Equipment yard with tractors and a loader moving dirt
  const yy = oy + S / 2 + 4000;
  for (let i = 0; i < 4; i++) sym('vehicle', [C.brick, C.veg, C.struct, C.yellow][i], 'truck', P(a + 6000 + i * 9000, yy + 6000), 0, {part: ['compact tractor with loader', 'utility tractor with box blade', 'dump truck', 'skid steer on a trailer'][i]});
  sym('vehicle', C.yellow, 'truck', P(a + 10000, yy + 18000), 0, {part: 'tractor grading the yard', anim: {type: 'path', speed: 1500, pts: [P(a + 10000, yy + 18000), P(a + 40000, yy + 18000), P(a + 40000, yy + 22000), P(a + 10000, yy + 22000)]}});
  person(P(a + 6000, yy + 3500), 0, 'standing', 'greasing the loader pins');
  person(P(a + 24000, yy + 3500), 0, 'standing', 'strapping down the skid steer');
  person(P(x0 + 2500, y0 + 2300), Math.PI, 'standing', 'writing up a ticket for mineral blocks');
  person(P(x0 + 2500, y0 + 700), 0, 'standing', 'buying chicken scratch and a salt lick');
  person(P(x0 + 19400, y0 - 2500), 0, 'walking', 'loading hay into a flatbed', {type: 'bob', mm: 300, period: 1.5});
  sym('activity', C.brick, 'cart', P(x0 + 19000, y0 - 1500), 0, {activity: 'hand truck stacked with feed'});
  sym('activity', C.brick, 'dog', P(x0 + 6000, y0 - 1500), 0, {activity: 'shop dog guarding the door'});
  // Dirt berm and windbreak
  const berm = []; for (let k = 0; k <= 30; k++) berm.push(P(a + 1500 + k * 1900, yb - 3000 + Math.sin(k * 0.7) * 1200 + Math.sin(k * 2.3) * 400));
  line('vegetation', C.struct, berm, {part: 'dirt berm'}, {color2: C.veg2});
  for (let i = 0; i < 8; i++) tree(a + 2500 + i * 7000, yb - 1500, 4, 4 + i * 0.5);
}

await import('./turn2.mjs').then(m => m.default({S, R, P, push, line, sym, hatch, rect, arc, rounded, vface, wall, run, person, tree, door, bungalow, streetsForChunk, lot, OWN, VSTREET, HSTREET, C, CURB, PL, LANE}));
await import('./turn3.mjs').then(m => m.default({S, R, P, push, line, sym, hatch, rect, arc, rounded, vface, wall, run, person, tree, door, bungalow, streetsForChunk, lot, OWN, VSTREET, HSTREET, C, CURB, PL, LANE}));
await import('./turn4.mjs').then(m => m.default({S, R, P, push, line, sym, hatch, rect, arc, rounded, vface, wall, run, person, tree, door, bungalow, streetsForChunk, lot, OWN, VSTREET, HSTREET, C, CURB, PL, LANE}));
await import('./turn5.mjs').then(m => m.default({S, R, P, push, line, sym, hatch, rect, arc, rounded, vface, wall, run, person, tree, door, bungalow, streetsForChunk, lot, OWN, VSTREET, HSTREET, C, CURB, PL, LANE}));
await import('./turn6.mjs').then(m => m.default({S, R, P, push, line, sym, hatch, rect, arc, rounded, vface, wall, run, person, tree, door, bungalow, streetsForChunk, lot, OWN, VSTREET, HSTREET, C, CURB, PL, LANE}));
const out = process.argv[2];
fs.mkdirSync(out.split('/').slice(0, -1).join('/'), {recursive: true});
fs.writeFileSync(out, JSON.stringify({calls}, null, 0) + '\n');
console.log(calls.length + ' calls');
