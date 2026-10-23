// Agent Orange turn six: Pecan Hollow Farm on block 3,1. Orchard in contour rows on drip, pump house and windmill, equipment barn, farmhouse, chicken coop, farm stand.
export default function (k) {
  const {S, P, push, line, sym, hatch, rect, arc, vface, wall, run, person, door, streetsForChunk, lot, OWN, C, CURB, PL} = k;
  const blob = (cx, cy, r, n, seed, z = 0) => { const o = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; const rr = r * (1 + 0.15 * Math.sin(a * 3 + seed) + 0.07 * Math.sin(a * 5 + seed * 2)); o.push(P(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, z)); } return o; };
  const circ = (cx, cy, r, z, n = 10) => arc(cx, cy, r, 0, 360, n, z);
  const box = (disc, col, x0, y0, x1, y1, z, meta) => line(disc, col, rect(x0, y0, x1, y1, z), meta, {closed: true});

  push('claim_chunk', {chunk: [3, 1]});
  for (const edge of ['n', 's', 'e', 'w']) push('declare_port', {chunk: [3, 1], edge, value: CURB});
  const keep = [...OWN]; OWN.clear(); OWN.add('3:1');
  streetsForChunk(3, 1, {s: false, w: false, n: true, e: true});
  OWN.clear(); for (const x of keep) OWN.add(x); OWN.add('3:1');

  const ox = 3 * S, oy = S, a = ox + PL, b = ox + S - PL, ya = oy + PL, yb = oy + S - PL;
  lot('agricultural', a, ya, b, yb, 'pecan farm parcel');
  const people = [];
  const act = (x, y, pose, t, rot = 0, anim) => people.push([x, y, pose, t, rot, anim]);

  // ---------- Orchard in contour rows with drip lines
  const rowY = (r, x) => ya + 6000 + r * 5800 + 1400 * Math.sin((x - a) / 11000 + r * 0.4);
  const rows = 5, ox0 = a + 2500, ox1 = b - 2500;
  line('plumbing', C.plumb, [P(ox0 - 800, rowY(0, ox0) - 2000, -300), P(ox0 - 800, rowY(rows - 1, ox0) + 2000, -300)], {part: 'orchard header main'});
  for (let r = 0; r < rows; r++) {
    const pts = []; for (let x = ox0; x <= ox1; x += 2400) pts.push(P(x, rowY(r, x), 0));
    line('plumbing', C.plumb, [P(ox0 - 800, rowY(r, ox0), -300), ...pts.map(p => P(p[0], p[1] + 450, 0))], {part: 'drip lateral row ' + (r + 1)});
    line('vegetation', C.struct, pts.map(p => P(p[0], p[1] - 900, 0)), {part: 'mulch berm row ' + (r + 1)}, {color2: C.veg2});
    let n = 0;
    for (let x = ox0 + 1800; x < ox1; x += 7620, n++) {
      const y = rowY(r, x);
      sym('vegetation', n % 2 ? C.veg : C.veg2, 'tree', P(x, y), 0, (n + r) % 4 === 0 ? {anim: {type: 'sway', deg: 3, period: 4 + (r + n) * 0.17}, part: 'pecan tree'} : {part: 'pecan tree'});
    }
  }
  // Tractor mowing a serpentine between the rows
  const tractorShape = (cx, cy) => [P(cx - 700, cy - 1500, 600), P(cx + 700, cy - 1500, 600), P(cx + 700, cy + 1300, 600), P(cx - 700, cy + 1300, 600), P(cx - 700, cy - 1500, 600), P(cx - 700, cy - 1500, 1500), P(cx - 700, cy - 400, 2600), P(cx + 700, cy - 400, 2600), P(cx + 700, cy - 1500, 1500), P(cx - 700, cy - 1500, 1500), P(cx - 1100, cy + 1700, 300), P(cx + 1100, cy + 1700, 300), P(cx + 700, cy + 1300, 600)];
  const serp = [];
  for (let r = 0; r < rows - 1; r++) { const xs = r % 2 ? [ox1 - 1500, ox0 + 1500] : [ox0 + 1500, ox1 - 1500]; for (let s = 0; s <= 8; s++) { const x = xs[0] + (xs[1] - xs[0]) * s / 8; serp.push(P(x, (rowY(r, x) + rowY(r + 1, x)) / 2)); } }
  for (let i = serp.length - 2; i > 0; i -= 3) serp.push(P(serp[i][0], serp[i][1] + 2900));
  serp.push(serp[0]);
  line('vehicle', C.brick, tractorShape(serp[0][0], serp[0][1]), {part: 'orange tractor with a flail mower', anim: {type: 'path', speed: 1800, pts: serp}});
  act(serp[0][0], serp[0][1], 'sitting', 'mowing between the pecan rows', 0, {type: 'path', speed: 1800, pts: serp});

  // ---------- Pump house and windmill
  const PH = 'Pecan Hollow Pump House';
  const px0 = a + 44000, py0 = yb - 11000, px1 = px0 + 3658, py1 = py0 + 3048;
  wall(PH, [[px0, py0], [px1, py0], [px1, py1], [px0, py1]], 2743, -610, true);
  hatch('structure', C.struct, vface(px0, py0, px1, py0, 0, 2743), 'lines', 200, 90, {building: PH, part: 'rough sawn siding'}, C.brick);
  door(PH, px0 + 300, py0, 'x', 914, 'pump house door', -1);
  line('structure', C.int, rect(px0 + 150, py0 + 150, px1 - 150, py1 - 150, 2438), {building: PH, part: 'ceiling', checks: [['ceiling_height', 2438]]}, {closed: true});
  const wx = px0 + 1800, wy = py0 + 2200;
  line('plumbing', C.plumb, circ(wx, wy, 150, 300, 8), {building: PH, part: '6 inch well casing'}, {closed: true});
  line('plumbing', C.plumb, [P(wx, wy, -45720), P(wx, wy, 300)], {building: PH, part: 'drop pipe to the submersible pump at 150 ft'});
  line('plumbing', C.plumb, circ(px0 + 700, py0 + 2300, 350, 0, 10), {building: PH, part: 'pressure tank'}, {closed: true});
  line('plumbing', C.plumb, [P(px0 + 700, py0 + 2300, 0), P(px0 + 700, py0 + 2300, 1300)], {building: PH, part: 'pressure tank body'});
  for (let i = 0; i < 3; i++) { line('plumbing', C.struct, circ(px0 + 900 + i * 900, py0 + 900, 250, 0, 8), {building: PH, part: 'sand media filter ' + (i + 1)}, {closed: true}); line('plumbing', C.struct, [P(px0 + 900 + i * 900, py0 + 900, 0), P(px0 + 900 + i * 900, py0 + 900, 1200)], {building: PH, part: 'filter tank ' + (i + 1)}); }
  line('plumbing', C.plumb, [P(wx, wy, 300), P(wx, wy, 900), P(px0 + 700, py0 + 2300, 900), P(px0 + 700, py0 + 900, 900), P(px0 + 2700, py0 + 900, 900)], {building: PH, part: 'manifold through the filters'});
  line('plumbing', C.brick, [P(px0 + 2700, py0 + 900, 900), P(px0 + 3200, py0 + 900, 900)], {building: PH, part: 'backflow preventer'});
  sym('plumbing', C.brick, 'knob', P(px0 + 3000, py0 + 900, 1000), 0, {part: 'zone valve handle', checks: [['knob_height', 1000]]});
  line('plumbing', C.int, circ(px0 + 2000, py0 + 1700, 120, 1500, 8), {building: PH, part: 'pressure gauge'}, {closed: true});
  line('electrical', C.elec, rect(px1 - 500, py1 - 1300, px1 - 200, py1 - 500, 1676), {building: PH, part: 'pump control panel'}, {closed: true});
  line('electrical', C.int, rect(px1 - 500, py1 - 2200, px1 - 200, py1 - 1600, 1500), {building: PH, part: 'irrigation timer'}, {closed: true});
  sym('electrical', C.elec, 'light', P(px0 + 1829, py0 + 1524, 2438), 0);
  sym('electrical', C.elec, 'outlet', P(px1 - 150, py0 + 600, 457), 0, {checks: [['outlet_height', 457]]});
  sym('electrical', C.elec, 'switch', P(px0 + 1350, py0 + 150, 1219), 0);
  run('plumbing', C.plumb, [P(px0 + 3200, py0 + 900, 900), P(px1 + 600, py0 + 900, -300), P(px1 + 600, rowY(rows - 1, px1) + 3000, -300), P(ox0 - 800, rowY(rows - 1, ox0) + 2000, -300)], {building: PH, part: 'irrigation main to the orchard header'});
  // Windmill over the old stock tank
  const mx = px1 + 4500, my = py1 + 1500;
  for (const [dx, dy] of [[-1200, -1200], [1200, -1200], [1200, 1200], [-1200, 1200]]) line('structure', C.struct, [P(mx + dx, my + dy, 0), P(mx, my, 9144)], {part: 'windmill tower leg'});
  line('structure', C.struct, rect(mx - 700, my - 700, mx + 700, my + 700, 4572), {part: 'tower brace'}, {closed: true});
  const blades = []; for (let i = 0; i < 18; i++) { const t = i / 18 * Math.PI * 2; blades.push(P(mx, my, 9144), P(mx + Math.cos(t) * 1800, my, 9144 + Math.sin(t) * 1800)); }
  line('structure', C.brick, blades, {part: 'windmill wheel', anim: {type: 'spin', rpm: 14, pivot: P(mx, my, 9144)}});
  line('structure', C.brick, [P(mx, my, 9144), P(mx, my + 2400, 9144), P(mx, my + 2400, 9900), P(mx, my + 1200, 9144)], {part: 'windmill tail vane', anim: {type: 'sway', deg: 10, period: 6, pivot: P(mx, my, 9144)}});
  line('plumbing', C.street, circ(mx + 3000, my, 1500, 600, 14), {part: 'galvanized stock tank'}, {closed: true});
  line('plumbing', C.street, [P(mx, my, 300), P(mx + 1500, my, 900)], {part: 'windmill pump rod discharge'});

  // ---------- Equipment barn with hay loft
  const BN = 'Pecan Hollow Equipment Barn';
  const bx0 = a + 20000, by0 = yb - 17000, bx1 = bx0 + 18288, by1 = by0 + 12192, BH = 7315;
  wall(BN, [[bx0, by0], [bx1, by0], [bx1, by1], [bx0, by1]], BH, -914, true);
  wall(BN, [[bx1 - 6096, by0], [bx1 - 6096, by1]], 3048, 0, false, C.int);
  hatch('structure', C.brick, vface(bx0, by0, bx1, by0, 0, 4877), 'lines', 300, 90, {building: BN, part: 'red board and batten'}, C.struct);
  hatch('structure', C.brick, vface(bx0, by0, bx0, by1, 0, 4877), 'lines', 300, 90, {building: BN, part: 'red board and batten'}, C.struct);
  hatch('structure', C.roof, [P(bx0, by0, 4877), P(bx1, by0, 4877), P(bx1, by0 + 6096, BH), P(bx0, by0 + 6096, BH)], 'gradient', 500, 0, {building: BN, part: 'south roof slope, darker at the eave'}, C.struct);
  hatch('structure', C.roof, [P(bx0, by1, 4877), P(bx1, by1, 4877), P(bx1, by0 + 6096, BH), P(bx0, by0 + 6096, BH)], 'gradient', 500, 0, {building: BN, part: 'north roof slope'}, C.struct);
  for (let i = 0; i < 2; i++) { const dx = bx0 + 1500 + i * 5800; line('structure', C.int, [P(dx, by0), P(dx, by0, 4267), P(dx + 4267, by0, 4267), P(dx + 4267, by0)], {building: BN, part: 'sliding barn door ' + (i + 1)}); line('structure', C.struct, [P(dx, by0 - 50, 4267), P(dx + 4267, by0 - 50, 0)], {building: BN, part: 'door cross brace'}); line('structure', C.struct, [P(dx, by0 - 50, 0), P(dx + 4267, by0 - 50, 4267)], {building: BN, part: 'door cross brace'}); }
  door(BN, bx1 - 3500, by0, 'x', 914, 'shop man door', -1);
  door(BN, bx1 - 6096, by0 + 9000, 'y', 914, 'shop to bay door', 1);
  hatch('structure', C.struct, rect(bx0 + 300, by0 + 6096, bx1 - 6400, by1 - 300, 3353), 'lines', 600, 0, {building: BN, part: 'hay loft floor'}, C.brick);
  line('structure', C.struct, [P(bx0, by0 + 6096, 3353), P(bx1, by0 + 6096, 3353)], {building: BN, part: 'loft beam', checks: [['beam_height', 3353]]});
  line('interior', C.struct, [P(bx0 + 600, by0 + 6000, 0), P(bx0 + 600, by0 + 6000, 3353), P(bx0 + 900, by0 + 6000, 3353), P(bx0 + 900, by0 + 6000, 0)], {building: BN, part: 'loft ladder rails'});
  for (let i = 1; i < 12; i++) line('interior', C.struct, [P(bx0 + 600, by0 + 6000, i * 280), P(bx0 + 900, by0 + 6000, i * 280)], {building: BN, part: 'ladder rung ' + i});
  for (let i = 0; i < 18; i++) box('interior', C.yellow, bx0 + 1500 + (i % 6) * 1100, by0 + 7000 + Math.floor(i / 6) * 1500, bx0 + 2500 + (i % 6) * 1100, by0 + 8000 + Math.floor(i / 6) * 1500, 3353 + 460 * (1 + (i % 2)), {building: BN, part: 'small square hay bale in the loft'});
  // Bays: tractor and baler parked
  line('interior', C.brick, tractorShape(bx0 + 3600, by0 + 3000), {building: BN, part: 'second tractor with bale spear'});
  line('interior', C.struct, [P(bx0 + 3000, by0 + 4700, 900), P(bx0 + 3600, by0 + 5600, 900), P(bx0 + 4200, by0 + 4700, 900)], {building: BN, part: 'bale spear'});
  box('interior', C.veg, bx0 + 8000, by0 + 1500, bx0 + 10500, by0 + 5000, 1800, {building: BN, part: 'square baler'});
  line('interior', C.veg, [P(bx0 + 9250, by0 + 5000, 600), P(bx0 + 9250, by0 + 6000, 400)], {building: BN, part: 'baler tongue'});
  line('interior', C.int, circ(0, 0, 550, 0, 10).map(p => P(bx0 + 7950, by0 + 2000 + p[1], 550 + p[0])), {building: BN, part: 'baler wheel'}, {closed: true});
  // Shop
  const sx = bx1 - 6096;
  line('interior', C.brick, rect(sx + 300, by1 - 1000, bx1 - 300, by1 - 300, 965), {building: BN, part: 'shop workbench', checks: [['counter_height', 965]]}, {closed: true});
  line('interior', C.int, rect(sx + 600, by1 - 900, sx + 1000, by1 - 600, 1100), {building: BN, part: 'machinist vise'}, {closed: true});
  line('interior', C.int, rect(sx + 300, by1 - 150, bx1 - 300, by1 - 150, 1200), {building: BN, part: 'pegboard'}, {closed: true});
  for (let i = 0; i < 10; i++) line('interior', C.int, [P(sx + 500 + i * 500, by1 - 160, 1300 + (i % 3) * 200), P(sx + 500 + i * 500, by1 - 160, 1700 + (i % 3) * 200)], {building: BN, part: ['wrench', 'hammer', 'pliers', 'screwdriver', 'chisel', 'file', 'level', 'tin snips', 'pipe wrench', 'hacksaw'][i] + ' on the pegboard'});
  box('interior', C.struct, sx + 300, by0 + 1000, sx + 1100, by0 + 1800, 900, {building: BN, part: 'stick welder on a cart'});
  line('interior', C.brick, [P(sx + 700, by0 + 1800, 900), P(sx + 1500, by0 + 3200, 300), P(sx + 2200, by0 + 3500, 300)], {building: BN, part: 'welding lead'});
  line('interior', C.int, circ(bx1 - 900, by0 + 1000, 400, 0, 10), {building: BN, part: 'air compressor tank'}, {closed: true});
  for (let i = 0; i < 4; i++) box('interior', C.int, bx1 - 900, by0 + 3000 + i * 900, bx1 - 300, by0 + 3800 + i * 900, 2134, {building: BN, part: ['grease and oil', 'pto shafts', 'chain and binders', 'spare tines'][i] + ' shelf', checks: [['shelf_height', 2134]]});
  for (let x = bx0 + 2000; x < bx1; x += 4000) sym('electrical', C.elec, 'light', P(x, by0 + 3000, 3353), 0, {part: 'barn bay light'});
  sym('electrical', C.elec, 'light', P(sx + 3000, by1 - 3000, 3048), 0);
  for (const [x, y, h] of [[sx + 2000, by1 - 300, 1118], [sx + 4000, by1 - 300, 1118], [bx1 - 150, by0 + 2000, 457], [bx0 + 150, by0 + 3000, 457], [sx + 150, by0 + 5000, 457]]) sym('electrical', C.elec, 'outlet', P(x, y, h), 0, {checks: [['outlet_height', h]]});
  sym('electrical', C.elec, 'switch', P(bx1 - 2400, by0 + 150, 1219), 0);
  line('electrical', C.elec, rect(bx1 - 500, by1 - 2500, bx1 - 200, by1 - 1700, 1676), {building: BN, part: 'barn subpanel'}, {closed: true});
  // Fuel tank and round bales outside
  line('structure', C.brick, circ(bx0 - 3000, by0 + 3000, 700, 2000, 10), {part: 'farm diesel tank on a stand'}, {closed: true});
  for (const [dx, dy] of [[-1000, -1000], [1000, -1000], [1000, 1000], [-1000, 1000]]) line('structure', C.struct, [P(bx0 - 3000 + dx * 0.7, by0 + 3000 + dy * 0.4, 0), P(bx0 - 3000 + dx * 0.7, by0 + 3000 + dy * 0.4, 1300)], {part: 'fuel stand leg'});
  for (let i = 0; i < 6; i++) line('vegetation', C.yellow, circ(bx1 + 3000 + (i % 3) * 1900, by0 + 2000 + Math.floor(i / 3) * 1900, 850, 850 + (i === 5 ? 1700 : 0), 12), {part: 'round hay bale'}, {closed: true});
  line('vehicle', C.brick, tractorShape(bx1 + 6500, by0 - 2500), {part: 'loader tractor stacking round bales', anim: {type: 'path', speed: 1200, pts: [P(bx1 + 6500, by0 - 2500), P(bx1 + 6500, by0 + 500), P(bx1 + 4000, by0 + 500), P(bx1 + 6500, by0 - 2500)]}});

  // ---------- Farmhouse
  const FH = 'Pecan Hollow Farmhouse';
  const hx0 = a + 3000, hy0 = yb - 12500, hx1 = hx0 + 12192, hy1 = hy0 + 9144, HH = 3658;
  wall(FH, [[hx0, hy0], [hx1, hy0], [hx1, hy1], [hx0, hy1]], HH, -610, true);
  wall(FH, [[hx0 + 5486, hy0], [hx0 + 5486, hy1]], 2438, 0, false, C.int);
  wall(FH, [[hx0 + 5486, hy0 + 4572], [hx1, hy0 + 4572]], 2438, 0, false, C.int);
  wall(FH, [[hx0 + 9144, hy0 + 4572], [hx0 + 9144, hy1]], 2438, 0, false, C.int);
  wall(FH, [[hx0, hy1 - 3048], [hx0 + 5486, hy1 - 3048]], 2438, 0, false, C.int);
  hatch('structure', C.street, vface(hx0, hy0, hx1, hy0, 0, HH), 'lines', 200, 0, {building: FH, part: 'white lap siding'}, C.int);
  hatch('structure', C.street, vface(hx0, hy0, hx0, hy1, 0, HH), 'lines', 200, 0, {building: FH, part: 'white lap siding'}, C.int);
  hatch('structure', C.roof, [P(hx0 - 600, hy0 - 2400, HH), P(hx1 + 600, hy0 - 2400, HH), P(hx1 + 600, hy0 + 4572, 5500), P(hx0 - 600, hy0 + 4572, 5500)], 'gradient', 400, 0, {building: FH, part: 'tin roof over the porch'}, C.brick);
  hatch('structure', C.roof, [P(hx0 - 600, hy1 + 600, HH), P(hx1 + 600, hy1 + 600, HH), P(hx1 + 600, hy0 + 4572, 5500), P(hx0 - 600, hy0 + 4572, 5500)], 'gradient', 400, 0, {building: FH, part: 'tin roof back slope'}, C.brick);
  line('structure', C.struct, [P(hx0, hy0 - 2400, 2438), P(hx1, hy0 - 2400, 2438)], {building: FH, part: 'porch beam'});
  for (let i = 0; i <= 4; i++) line('structure', C.struct, [P(hx0 + i * 3048, hy0 - 2400, 0), P(hx0 + i * 3048, hy0 - 2400, 2438)], {building: FH, part: 'porch post'});
  door(FH, hx0 + 2000, hy0, 'x', 914, 'front door', -1);
  door(FH, hx0 + 5486, hy0 + 1500, 'y', 813, 'kitchen door', 1);
  door(FH, hx0 + 6500, hy0 + 4572, 'x', 813, 'bedroom one door', 1);
  door(FH, hx0 + 9900, hy0 + 4572, 'x', 813, 'bathroom door', 1);
  door(FH, hx0 + 3500, hy1 - 3048, 'x', 813, 'bedroom two door', 1);
  door(FH, hx1, hy0 + 2000, 'y', 914, 'back door to the yard', 1);
  line('structure', C.int, rect(hx0 + 150, hy0 + 150, hx1 - 150, hy1 - 150, 2438), {building: FH, part: 'ceilings', checks: [['ceiling_height', 2438]]}, {closed: true});
  // Kitchen
  line('interior', C.int, [P(hx0 + 5800, hy0 + 300, 914), P(hx1 - 300, hy0 + 300, 914), P(hx1 - 300, hy0 + 1500, 914)], {building: FH, part: 'kitchen counter', checks: [['counter_height', 914]]});
  box('interior', C.int, hx0 + 7000, hy0 + 200, hx0 + 7800, hy0 + 700, 900, {building: FH, part: 'farmhouse sink under the window'});
  box('interior', C.struct, hx0 + 8400, hy0 + 200, hx0 + 9162, hy0 + 800, 914, {building: FH, part: 'gas range'});
  for (const [dx, dy] of [[150, 150], [450, 150], [150, 450], [450, 450]]) line('interior', C.brick, circ(hx0 + 8400 + dx + 80, hy0 + 200 + dy, 90, 920, 6), {building: FH, part: 'burner'}, {closed: true});
  box('interior', C.int, hx1 - 1100, hy0 + 1900, hx1 - 300, hy0 + 2700, 1800, {building: FH, part: 'refrigerator'});
  line('interior', C.brick, circ(hx0 + 8500, hy0 + 2800, 650, 762, 10), {building: FH, part: 'round kitchen table'}, {closed: true});
  for (let i = 0; i < 4; i++) { const t = i * Math.PI / 2; line('interior', C.struct, circ(hx0 + 8500 + Math.cos(t) * 1000, hy0 + 2800 + Math.sin(t) * 1000, 200, 450, 6), {building: FH, part: 'kitchen chair'}, {closed: true}); }
  line('interior', C.brick, circ(hx0 + 8500, hy0 + 2800, 120, 900, 6), {building: FH, part: 'bowl of shelled pecans'}, {closed: true});
  // Living room
  box('interior', C.car2, hx0 + 600, hy0 + 2500, hx0 + 1500, hy0 + 4800, 457, {building: FH, part: 'couch'});
  line('interior', C.struct, circ(hx0 + 4000, hy0 + 4500, 350, 0, 8), {building: FH, part: 'wood stove'}, {closed: true});
  line('interior', C.struct, [P(hx0 + 4000, hy0 + 4500, 700), P(hx0 + 4000, hy0 + 4500, HH)], {building: FH, part: 'stove pipe'});
  box('interior', C.brick, hx0 + 2000, hy0 + 3000, hx0 + 3000, hy0 + 3800, 457, {building: FH, part: 'coffee table'});
  box('interior', C.int, hx0 + 300, hy0 + 600, hx0 + 1600, hy0 + 900, 1000, {building: FH, part: 'tv on the dresser'});
  line('interior', C.brick, rect(hx0 + 2300, hy0 + 1000, hx0 + 4300, hy0 + 2400, 10), {building: FH, part: 'braided rug'}, {closed: true});
  // Bedrooms and bath
  box('interior', C.int, hx0 + 6000, hy1 - 2600, hx0 + 7800, hy1 - 500, 600, {building: FH, part: 'queen bed with a quilt'});
  box('interior', C.brick, hx0 + 8200, hy0 + 4800, hx0 + 8900, hy0 + 5300, 1100, {building: FH, part: 'dresser'});
  box('interior', C.int, hx0 + 600, hy1 - 2600, hx0 + 1600, hy1 - 500, 500, {building: FH, part: 'twin bed'});
  box('interior', C.int, hx0 + 2200, hy1 - 2600, hx0 + 3200, hy1 - 500, 500, {building: FH, part: 'twin bed'});
  box('interior', C.brick, hx0 + 4200, hy1 - 900, hx0 + 5200, hy1 - 400, 762, {building: FH, part: 'homework desk'});
  box('interior', C.int, hx0 + 9400, hy1 - 1900, hx1 - 300, hy1 - 300, 500, {building: FH, part: 'clawfoot tub'});
  line('interior', C.int, blob(hx0 + 9800, hy0 + 5200, 260, 8, 2, 432), {building: FH, part: 'toilet'}, {closed: true});
  box('interior', C.int, hx1 - 1000, hy0 + 4800, hx1 - 300, hy0 + 5400, 864, {building: FH, part: 'pedestal sink', checks: [['counter_height', 864]]});
  box('interior', C.int, hx1 - 900, hy0 + 3200, hx1 - 300, hy0 + 3900, 914, {building: FH, part: 'washing machine'});
  for (const [x, y] of [[hx0 + 2700, hy0 + 2300], [hx0 + 8500, hy0 + 2300], [hx0 + 7300, hy1 - 2300], [hx0 + 2700, hy1 - 1500], [hx0 + 10600, hy1 - 2300]]) sym('electrical', C.elec, 'light', P(x, y, 2438), 0);
  for (const [x, y, h] of [[hx0 + 150, hy0 + 2000, 406], [hx0 + 5336, hy0 + 3000, 406], [hx0 + 7500, hy0 + 150, 1067], [hx1 - 150, hy0 + 1000, 1067], [hx0 + 5636, hy1 - 1500, 406], [hx0 + 150, hy1 - 1500, 406], [hx1 - 1200, hy0 + 4722, 1067]]) sym('electrical', C.elec, 'outlet', P(x, y, h), 0, {checks: [['outlet_height', h]]});
  sym('electrical', C.elec, 'switch', P(hx0 + 3050, hy0 + 150, 1219), 0);
  line('electrical', C.elec, rect(hx1 - 500, hy0 + 2900, hx1 - 200, hy0 + 3600, 1676), {building: FH, part: 'house panel'}, {closed: true});
  line('plumbing', C.plumb, circ(hx1 - 600, hy0 + 4200, 250, 0, 8), {building: FH, part: 'water heater'}, {closed: true});
  // Porch life
  line('interior', C.struct, [P(hx0 + 1000, hy0 - 1500, 450), P(hx0 + 1500, hy0 - 1500, 450), P(hx0 + 1600, hy0 - 1500, 1000)], {part: 'rocking chair', anim: {type: 'sway', deg: 8, period: 2.2, pivot: P(hx0 + 1250, hy0 - 1500, 0)}});
  // Services: pole on Cholla Street feeds the house, barn and pump house
  const pole = [a + 30000, yb + 3600];
  sym('electrical', C.struct, 'pole', P(pole[0], pole[1]), 0, {part: 'farm service pole with transformer'});
  run('electrical', C.elec, [P(pole[0], pole[1], 8230), P(pole[0], pole[1], -600), P(hx1 - 350, pole[1] - 2000, -600), P(hx1 - 350, hy0 + 3200, -600), P(hx1 - 350, hy0 + 3200, 1676)], {building: FH, part: 'underground feed to the house'});
  run('electrical', C.elec, [P(pole[0], pole[1], -600), P(bx1 - 350, pole[1] - 2000, -600), P(bx1 - 350, by1 - 2100, -600), P(bx1 - 350, by1 - 2100, 1676)], {building: BN, part: 'underground feed to the barn'});
  run('electrical', C.elec, [P(bx1 - 350, by1 - 2100, -600), P(px1 - 350, py1 + 1500, -600), P(px1 - 350, py1 - 900, -600), P(px1 - 350, py1 - 900, 1676)], {building: PH, part: 'pump circuit to the pump house'});
  run('plumbing', C.plumb, [P(px0 + 600, py0 + 2300, 300), P(px0 - 1500, py0 + 2300, -600), P(hx1 - 600, hy0 + 4200, -600), P(hx1 - 600, hy0 + 4200, 300)], {building: FH, part: 'house water from the well'});
  run('plumbing', C.sewer, [P(hx0 + 9800, hy0 + 5200, -300), P(hx0 + 9800, hy1 + 4000, -900), P(hx0 + 12500, hy1 + 4000, -1200)], {building: FH, part: 'septic line'});
  line('plumbing', C.sewer, rect(hx0 + 12500, hy1 + 3000, hx0 + 15500, hy1 + 5000, -1800), {part: 'septic tank'}, {closed: true});

  // ---------- Chicken coop and run
  const CP = 'Pecan Hollow Chicken Coop';
  const cx0 = a + 50000, cy0 = yb - 7000, cx1 = cx0 + 3658, cy1 = cy0 + 2438;
  wall(CP, [[cx0, cy0], [cx1, cy0], [cx1, cy1], [cx0, cy1]], 2438, -300, true);
  hatch('structure', C.brick, vface(cx0, cy0, cx1, cy0, 0, 2438), 'lines', 150, 90, {building: CP, part: 'barn red siding'}, C.struct);
  hatch('structure', C.roof, rect(cx0 - 300, cy0 - 300, cx1 + 300, cy1 + 300, 2438), 'lines', 250, 0, {building: CP, part: 'tin roof'}, C.struct);
  door(CP, cx0 + 300, cy0, 'x', 813, 'coop door', -1);
  for (let i = 0; i < 6; i++) box('interior', C.struct, cx0 + 200 + (i % 3) * 400, cy1 - 500, cx0 + 550 + (i % 3) * 400, cy1 - 150, 600 + Math.floor(i / 3) * 450, {building: CP, part: 'nest box ' + (i + 1)});
  for (let i = 0; i < 3; i++) line('interior', C.struct, [P(cx0 + 1700, cy0 + 300 + i * 500, 600 + i * 250), P(cx1 - 200, cy0 + 300 + i * 500, 600 + i * 250)], {building: CP, part: 'roost bar ' + (i + 1)});
  line('interior', C.int, circ(cx0 + 2600, cy0 + 1900, 200, 300, 8), {building: CP, part: 'hanging feeder'}, {closed: true});
  line('interior', C.car2, circ(cx0 + 3200, cy0 + 1900, 180, 200, 8), {building: CP, part: 'poultry waterer'}, {closed: true});
  sym('electrical', C.elec, 'light', P(cx0 + 1829, cy0 + 1219, 2200), 0, {part: 'coop heat lamp'});
  line('activity', C.struct, blob(cx0 + 1800, cy0 - 4000, 4000, 22, 5), {part: 'chicken run fence'}, {closed: true});
  for (let i = 0; i < 8; i++) { const hx = cx0 + 300 + (i % 4) * 1100, hy = cy0 - 2500 - Math.floor(i / 4) * 2200; line('activity', [C.brick, C.int, C.yellow, C.struct][i % 4], [P(hx - 200, hy, 250), P(hx + 150, hy, 300), P(hx + 250, hy, 420), P(hx + 150, hy, 300), P(hx - 50, hy, 150), P(hx - 200, hy, 250)], {part: 'hen', anim: {type: 'bob', mm: 60, period: 0.5 + i * 0.07}}); }

  // ---------- Farm stand on Mesquite Street
  const FS = 'Pecan Hollow Farm Stand';
  const fx0 = b - 9000, fy0 = ya + 500, fx1 = fx0 + 4877, fy1 = fy0 + 2438;
  wall(FS, [[fx0, fy1], [fx0, fy0 + 600]], 2743, 0, false, C.struct);
  wall(FS, [[fx1, fy1], [fx1, fy0 + 600]], 2743, 0, false, C.struct);
  wall(FS, [[fx0, fy1], [fx1, fy1]], 2743, -300, false, C.struct);
  hatch('structure', C.brick, [P(fx0 - 300, fy0 - 600, 2743), P(fx1 + 300, fy0 - 600, 2743), P(fx1 + 300, fy1, 3000), P(fx0 - 300, fy1, 3000)], 'lines', 250, 90, {building: FS, part: 'red and white striped shade roof'}, C.int);
  line('interior', C.struct, [P(fx0 + 200, fy0 + 700, 914), P(fx1 - 200, fy0 + 700, 914)], {building: FS, part: 'display counter', checks: [['counter_height', 914]]});
  for (let i = 0; i < 6; i++) box('interior', [C.brick, C.struct, C.yellow, C.brick, C.veg, C.int][i], fx0 + 300 + i * 700, fy0 + 650, fx0 + 850 + i * 700, fy0 + 1100, 1000, {building: FS, part: ['bagged pecans', 'pecan brittle', 'brown eggs', 'pecan halves', 'chile ristras', 'honey jars'][i]});
  box('interior', C.int, fx1 - 1200, fy1 - 600, fx1 - 400, fy1 - 200, 1000, {building: FS, part: 'scale and card reader'});
  box('interior', C.car2, fx0 + 400, fy1 - 800, fx0 + 1400, fy1 - 200, 600, {building: FS, part: 'egg cooler'});
  sym('electrical', C.elec, 'outlet', P(fx0 + 1500, fy1 - 150, 457), 0, {checks: [['outlet_height', 457]]});
  sym('electrical', C.elec, 'light', P((fx0 + fx1) / 2, fy0 + 1200, 2600), 0);
  run('electrical', C.elec, [P(fx1 + 2000, ya - 2600, 6400), P(fx1 + 2000, fy1 + 1000, 600), P(fx0 + 1500, fy1 + 1000, -300), P(fx0 + 1500, fy1 - 300, 457)], {building: FS, part: 'stand circuit from the street pole'});
  sym('electrical', C.struct, 'pole', P(fx1 + 2000, ya - 2600), 0);
  sym('structure', C.yellow, 'sign', P(fx0 - 1500, ya - 1500), 0, {text: 'Fresh Pecans and Eggs'});
  sym('structure', C.sign, 'sign', P(b - 3000, yb - 1500), 0, {text: 'Pecan Hollow Farm'});
  hatch('paving', C.curb, rect(fx0 - 4000, fy0 - 2400, fx1 + 1500, fy0 - 600), 'dots', 700, 0, {part: 'gravel pull off'}, C.struct);
  sym('vehicle', C.car2, 'car', P(fx0 - 2000, fy0 - 1500), Math.PI / 2, {part: 'customer pulled over'});
  // Gravel farm lane from Cholla Street
  const lane = []; for (let j = 0; j <= 16; j++) { const t = j / 16; lane.push(P(a + 17000 + Math.sin(t * Math.PI * 1.5) * 2500, yb + 3000 - t * 24000)); }
  line('paving', C.curb, lane, {part: 'gravel farm lane'}, {color2: C.struct});

  // ---------- People
  act(hx0 + 1250, hy0 - 1200, 'sitting', 'rocking on the porch with sweet tea');
  act(hx0 + 8500, hy0 + 1900, 'sitting', 'cracking pecans at the kitchen table');
  act(hx0 + 8800, hy0 + 1250, 'standing', 'canning green chile at the stove', Math.PI);
  act(hx0 + 4700, hy1 - 1200, 'sitting', 'doing homework under the lamp');
  act(bx1 - 3000, by1 - 1400, 'standing', 'welding a cracked loader bracket');
  act(bx0 + 750, by0 + 5500, 'standing', 'climbing to the hay loft', 0, {type: 'bob', mm: 1500, period: 5});
  act(bx0 + 9250, by0 + 6450, 'standing', 'threading twine through the baler knotter');
  act(bx1 + 4500, by0 + 3500, 'standing', 'counting round bales for a buyer');
  act(px0 - 1000, py0 + 1500, 'standing', 'reading the well pressure gauge');
  act(mx + 3000, my - 2000, 'standing', 'skimming moss out of the stock tank');
  act(cx0 + 1800, cy0 - 3500, 'standing', 'scattering scratch for the hens');
  act(cx0 + 300, cy0 + 1300, 'standing', 'gathering brown eggs into a basket');
  act(fx0 + 2400, fy0 + 1500, 'standing', 'weighing a bag of pecans', Math.PI);
  act(fx0 + 2400, fy0 - 400, 'standing', 'buying a dozen eggs and brittle');
  act(fx0 + 3400, fy0 - 400, 'standing', 'tasting a sample of pecan brittle');
  act(ox0 + 9000, rowY(2, ox0 + 9000) + 1500, 'standing', 'checking drip emitters on row three');
  act(ox0 + 30000, rowY(1, ox0 + 30000) + 1700, 'standing', 'pruning a low pecan limb');
  act(ox0 + 45000, rowY(3, ox0 + 45000) + 1600, 'walking', 'walking the rows with a soil probe', 0, {type: 'path', speed: 900, pts: [P(ox0 + 45000, rowY(3, ox0 + 45000) + 1600), P(ox0 + 55000, rowY(3, ox0 + 55000) + 1600), P(ox0 + 45000, rowY(3, ox0 + 45000) + 1600)]});
  sym('activity', C.brick, 'dog', P(hx0 + 2500, hy0 - 3500), 0, {activity: 'farm dog herding the chickens back', anim: {type: 'path', speed: 2500, pts: [P(hx0 + 2500, hy0 - 3500), P(cx0 - 3000, cy0 - 3500), P(cx0 - 3000, cy0 - 6000), P(hx0 + 2500, hy0 - 3500)]}});
  sym('activity', C.struct, 'cart', P(fx1 + 600, fy0 - 300), 0, {activity: 'wagon of pecan sacks for the stand'});
  for (const [x, y, pose, t, rot, anim] of people) person(P(x, y), rot, pose, t, anim);
}
