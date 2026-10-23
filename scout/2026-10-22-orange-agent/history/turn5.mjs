// Agent Orange turn five: Cholla Street main street row on block 2,2. Six shops sharing party walls, each fully fitted out inside.
export default function (k) {
  const {S, P, push, line, sym, hatch, rect, arc, vface, wall, run, person, tree, door, streetsForChunk, lot, OWN, C, CURB, PL} = k;
  const blob = (cx, cy, r, n, seed, z = 0) => { const o = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; const rr = r * (1 + 0.15 * Math.sin(a * 3 + seed) + 0.07 * Math.sin(a * 5 + seed * 2)); o.push(P(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, z)); } return o; };
  const circ = (cx, cy, r, z, n = 10) => arc(cx, cy, r, 0, 360, n, z);

  push('claim_chunk', {chunk: [2, 2]});
  for (const edge of ['n', 's', 'e', 'w']) push('declare_port', {chunk: [2, 2], edge, value: CURB});
  const keep = [...OWN]; OWN.clear(); OWN.add('2:2');
  streetsForChunk(2, 2, {s: false, w: false, n: true, e: true});
  OWN.clear(); for (const x of keep) OWN.add(x); OWN.add('2:2');

  const ox = 2 * S, oy = 2 * S, a = ox + PL, b = ox + S - PL, ya = oy + PL, yb = oy + S - PL;
  lot('commercial', a, ya, b, yb, 'main street row parcel');
  const W = 9144, D = 18288, H = 5486, CEIL = 3353, y0 = ya + 1219, y1 = y0 + D;
  const alleyY = y1 + 3048;
  // Rear alley, pole line and parking shared by the row
  hatch('paving', C.curb, rect(a, y1, b, y1 + 6096), 'dots', 900, 0, {part: 'rear service alley'}, C.struct);
  const poles = [];
  for (let i = 0; i < 5; i++) { const px = a + 3000 + i * 13716; poles.push(px); sym('electrical', C.struct, 'pole', P(px, y1 + 5500), 0, {part: 'alley pole line'}); }
  line('electrical', C.elec, poles.map(px => P(px, y1 + 5500, 8230)), {part: 'alley primary'});
  line('electrical', C.elec, poles.map(px => P(px, y1 + 5500, 6400)), {part: 'alley secondary'});
  line('plumbing', C.plumb, [P(a, alleyY, -1200), P(b, alleyY, -1200)], {part: 'alley water main'});
  line('plumbing', C.sewer, [P(b, alleyY + 900, -1800), P(a, alleyY + 900, -2400)], {part: 'alley sewer main'});
  // Storefront sidewalk with awning posts along Cholla Street
  hatch('paving', C.curb, rect(a, ya - 3658, b, y0), 'brick', 610, 0, {part: 'brick paver sidewalk'}, C.struct);
  for (let i = 0; i <= 6; i++) sym('street', C.struct, 'light', P(a + 3048 + i * W, ya - 3000, 4200), 0, {part: 'acorn street light', anim: i % 3 === 1 ? {type: 'blink', period: 6, duty: 0.92} : undefined});

  // Generic shop shell with restroom, services and back of house
  const shops = [];
  function shell(i, NAME, facade, fc, signText) {
    const x0 = a + 3048 + i * W, x1 = x0 + W;
    shops.push({NAME, x0, x1});
    wall(NAME, [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], H, -1219, true);
    wall(NAME, [[x0, y1 - 6096], [x1 - 3658, y1 - 6096]], 3048, 0, false, C.int);
    wall(NAME, [[x1 - 2743, y1], [x1 - 2743, y1 - 2438], [x1, y1 - 2438]], 3048, 0, false, C.int);
    hatch('structure', fc, vface(x0, y0, x1, y0, 2900, H), facade, facade === 'brick' ? 300 : 350, facade === 'lines' ? 90 : 0, {building: NAME, part: 'upper facade'}, C.struct);
    hatch('structure', C.car2, vface(x0 + 600, y0, x0 + 3800, y0, 500, 2700), 'lines', 400, 90, {building: NAME, part: 'display window'});
    hatch('structure', C.car2, vface(x0 + 5000, y0, x1 - 600, y0, 500, 2700), 'lines', 400, 90, {building: NAME, part: 'display window'});
    hatch('structure', fc, [P(x0, y0, 3000), P(x1, y0, 3000), P(x1, y0 - 1500, 2700), P(x0, y0 - 1500, 2700)], 'lines', 250, 0, {building: NAME, part: 'canvas awning'}, C.struct);
    door(NAME, x0 + 3950, y0, 'x', 914, 'front door', -1);
    door(NAME, x0 + 1500, y1, 'x', 914, 'rear door', 1);
    door(NAME, x0 + 4200, y1 - 6096, 'x', 914, 'back of house door', 1);
    door(NAME, x1 - 2743, y1 - 1600, 'y', 864, 'restroom door', -1);
    sym('structure', C.sign, 'sign', P(x0 + 2000, y0 - 1900), 0, {text: signText || NAME});
    hatch('structure', C.int, rect(x0 + 150, y0 + 150, x1 - 150, y1 - 6246, CEIL), 'cross', 610, 0, {building: NAME, part: 'pressed tin ceiling', checks: [['ceiling_height', CEIL]]});
    line('structure', C.int, rect(x0 + 150, y1 - 5946, x1 - 150, y1 - 150, 2743), {building: NAME, part: 'back of house ceiling', checks: [['ceiling_height', 2743]]}, {closed: true});
    for (const by of [y0 + 6096, y0 + 12192]) line('structure', C.struct, [P(x0, by, 3962), P(x1, by, 3962)], {building: NAME, part: 'timber beam', checks: [['beam_height', 3962]]});
    line('structure', C.struct, rect(x0 + 2500, y1 - 4000, x0 + 4300, y1 - 2600, H), {building: NAME, part: 'rooftop hvac unit'}, {closed: true});
    line('structure', C.int, circ(x0 + 3400, y1 - 3300, 500, H + 900, 8), {building: NAME, part: 'condenser fan', anim: {type: 'spin', rpm: 100}}, {closed: true});
    // Lights, outlets and switches
    for (let ly = y0 + 2000; ly < y1 - 6500; ly += 3048) for (const lx of [x0 + 2286, x0 + 6858]) sym('electrical', C.elec, 'light', P(lx, ly, CEIL), 0, {part: 'pendant light'});
    sym('electrical', C.elec, 'light', P(x0 + 2500, y1 - 3500, 2743), 0);
    sym('electrical', C.elec, 'light', P(x1 - 1370, y1 - 1200, 2743), 0, {part: 'restroom light'});
    for (let oy2 = y0 + 2500; oy2 < y1 - 6500; oy2 += 3048) { sym('electrical', C.elec, 'outlet', P(x0 + 150, oy2, 457), 0, {checks: [['outlet_height', 457]]}); sym('electrical', C.elec, 'outlet', P(x1 - 150, oy2 + 1500, 457), 0, {checks: [['outlet_height', 457]]}); }
    sym('electrical', C.elec, 'switch', P(x0 + 4950, y0 + 150, 1219), 0, {part: 'front light switch'});
    sym('electrical', C.elec, 'switch', P(x1 - 2893, y1 - 600, 1219), 0, {part: 'restroom switch'});
    line('electrical', C.elec, rect(x0 + 200, y1 - 1600, x0 + 500, y1 - 800, 1676), {building: NAME, part: '200 A panel'}, {closed: true});
    line('electrical', C.int, circ(x1 - 1370, y1 - 1800, 150, 2743, 6), {building: NAME, part: 'restroom exhaust fan', anim: {type: 'spin', rpm: 30}}, {closed: true});
    // Restroom fixtures
    line('interior', C.int, blob(x1 - 700, y1 - 600, 260, 8, 1, 432), {building: NAME, part: 'water closet'}, {closed: true});
    line('interior', C.int, rect(x1 - 2500, y1 - 600, x1 - 1800, y1 - 150, 864), {building: NAME, part: 'wall hung lavatory', checks: [['counter_height', 864]]}, {closed: true});
    line('interior', C.int, [P(x1 - 2500, y1 - 120, 1000), P(x1 - 1800, y1 - 120, 1000), P(x1 - 1800, y1 - 120, 1800), P(x1 - 2500, y1 - 120, 1800)], {building: NAME, part: 'mirror'}, {closed: true});
    line('interior', C.int, [P(x1 - 120, y1 - 1500, 860), P(x1 - 120, y1 - 400, 860)], {building: NAME, part: 'grab bar'});
    line('interior', C.int, rect(x1 - 1300, y1 - 160, x1 - 1000, y1 - 100, 1100), {building: NAME, part: 'paper towel dispenser'}, {closed: true});
    // Back of house
    line('plumbing', C.plumb, circ(x0 + 900, y1 - 2600, 280, 0, 8), {building: NAME, part: '40 gallon water heater'}, {closed: true});
    line('plumbing', C.plumb, [P(x0 + 900, y1 - 2600, 0), P(x0 + 900, y1 - 2600, 1500)], {building: NAME, part: 'water heater body'});
    line('interior', C.int, rect(x0 + 300, y1 - 5800, x0 + 2100, y1 - 5300, 2134), {building: NAME, part: 'stock shelving', checks: [['shelf_height', 2134]]}, {closed: true});
    for (const z of [400, 900, 1400]) line('interior', C.int, [P(x0 + 300, y1 - 5550, z), P(x0 + 2100, y1 - 5550, z)], {building: NAME, part: 'stock shelf board'});
    line('interior', C.brick, rect(x0 + 5200, y1 - 5700, x0 + 6700, y1 - 5000, 762), {building: NAME, part: 'office desk'}, {closed: true});
    sym('electrical', C.elec, 'outlet', P(x0 + 6000, y1 - 5946, 457), 0, {checks: [['outlet_height', 457]], part: 'office outlet'});
    // Services from the alley, with declared penetrations through the rear wall
    const px = poles.reduce((p, c) => Math.abs(c - (x0 + 350)) < Math.abs(p - (x0 + 350)) ? c : p);
    run('electrical', C.elec, [P(px, y1 + 5500, 6400), P(x0 + 350, y1 + 300, 4000), P(x0 + 350, y1 + 300, 1676), P(x0 + 350, y1 - 1200, 1676)], {building: NAME, part: 'service drop and meter'});
    run('plumbing', C.plumb, [P(x0 + 900, alleyY, -1200), P(x0 + 900, y1 - 2600, -900), P(x0 + 900, y1 - 2600, 300)], {building: NAME, part: 'water service'});
    run('plumbing', C.plumb, [P(x0 + 900, y1 - 2600, 1500), P(x0 + 900, y1 - 300, 2600), P(x1 - 2100, y1 - 300, 2600), P(x1 - 2100, y1 - 300, 700)], {building: NAME, part: 'hot and cold to the lavatory'});
    run('plumbing', C.sewer, [P(x1 - 700, y1 - 600, -300), P(x1 - 700, alleyY + 900, -1800)], {building: NAME, part: 'building drain to the alley'});
    sym('structure', C.veg, 'mark', P(x0 + 6000, y1 + 1500), 0, {part: 'dumpster pad'});
    return {x0, x1};
  }
  const acts = [];
  const act = (x, y, pose, t, rot = 0, anim) => acts.push([x, y, pose, t, rot, anim]);

  // ---- 0 Ocotillo Taqueria
  {
    const N = 'Ocotillo Taqueria';
    const {x0, x1} = shell(0, N, 'brick', C.brick, N);
    const ky = y0 + 9000;
    line('interior', C.brick, [P(x0 + 600, ky, 1067), P(x1 - 600, ky, 1067)], {building: N, part: 'order counter', checks: [['counter_height', 1067]]});
    for (const dx of [1800, 4200]) { line('interior', C.int, [P(x0 + dx, ky, 1067), P(x0 + dx, ky - 150, 1450)], {building: N, part: 'pos terminal'}); line('interior', C.int, rect(x0 + dx + 250, ky + 100, x0 + dx + 550, ky + 350, 1100), {building: N, part: 'receipt printer'}, {closed: true}); line('interior', C.int, rect(x0 + dx - 300, ky + 50, x0 + dx + 100, ky + 450, 1067), {building: N, part: 'cash drawer'}, {closed: true}); }
    line('interior', C.int, rect(x0 + 6000, ky - 200, x0 + 6400, ky, 1300), {building: N, part: 'card reader on a swivel', anim: {type: 'spin', rpm: 2}}, {closed: true});
    line('interior', C.int, rect(x0 + 600, y1 - 6600, x1 - 600, y1 - 6400, 1500), {building: N, part: 'ticket rail'}, {closed: true});
    line('interior', C.int, rect(x0 + 4000, y1 - 6500, x0 + 4400, y1 - 6300, 1600), {building: N, part: 'kitchen printer'}, {closed: true});
    line('interior', C.int, rect(x0 + 5000, y1 - 6500, x0 + 5600, y1 - 6300, 1800), {building: N, part: 'kitchen display screen'}, {closed: true});
    const cook = [['flat top comal', 914], ['two basket fryer', 914], ['six burner range', 914], ['steam table with salsas and meats', 914], ['tortilla press station', 914]];
    cook.forEach(([p, h], j) => line('interior', C.int, rect(x0 + 600 + j * 1600, y1 - 7600, x0 + 2000 + j * 1600, y1 - 6800, h), {building: N, part: p, checks: [['counter_height', h]]}, {closed: true}));
    line('interior', C.struct, rect(x0 + 600, y1 - 7700, x1 - 600, y1 - 6700, 2134), {building: N, part: 'exhaust hood'}, {closed: true});
    sym('interior', C.int, 'mark', P(x0 + 3000, y1 - 7200, 2400), 0, {part: 'hood fan', anim: {type: 'spin', rpm: 70}});
    for (let j = 0; j < 6; j++) line('interior', C.brick, [P(x0 + 1000 + j * 1200, y1 - 7400, 960), P(x0 + 1300 + j * 1200, y1 - 7100, 960)], {building: N, part: 'tortilla on the comal', anim: j % 2 ? {type: 'bob', mm: 40, period: 1.2 + j * 0.1} : undefined});
    line('interior', C.int, rect(x0 + 600, y1 - 5800, x0 + 3200, y1 - 5100, 914), {building: N, part: 'three compartment sink', checks: [['counter_height', 914]]}, {closed: true});
    line('interior', C.int, rect(x0 + 3400, y1 - 5800, x0 + 3900, y1 - 5400, 864), {building: N, part: 'hand sink', checks: [['counter_height', 864]]}, {closed: true});
    line('plumbing', C.sewer, rect(x0 + 1200, y1 - 4800, x0 + 2000, y1 - 4300, -300), {building: N, part: 'grease interceptor under the sink'}, {closed: true});
    line('interior', C.struct, rect(x1 - 3600, y1 - 5900, x1 - 1200, y1 - 3500, 2438), {building: N, part: 'walk in cooler', checks: [['shelf_height', 2134]]}, {closed: true});
    for (let j = 0; j < 8; j++) { const tx = x0 + 1600 + (j % 2) * 4400, ty = y0 + 1600 + Math.floor(j / 2) * 1800; line('interior', C.int, rect(tx - 500, ty - 400, tx + 500, ty + 400, 762), {building: N, part: 'dining table ' + (j + 1)}, {closed: true}); for (const s of [-1, 1]) line('interior', C.brick, circ(tx + s * 750, ty, 180, 450, 6), {building: N, part: 'chair'}, {closed: true}); }
    line('interior', C.veg, rect(x0 + 3500, y0 + 4500, x0 + 5600, y0 + 5100, 914), {building: N, part: 'salsa bar with six salsas', checks: [['counter_height', 914]]}, {closed: true});
    for (let j = 0; j < 6; j++) line('interior', [C.brick, C.veg, C.yellow, C.brick, C.veg, C.struct][j], circ(x0 + 3700 + j * 330, y0 + 4800, 120, 960, 6), {building: N, part: 'salsa well ' + (j + 1)}, {closed: true});
    line('interior', C.yellow, [P(x0 + 600, ky + 2400, 2200), P(x1 - 600, ky + 2400, 2200), P(x1 - 600, ky + 2400, 3000), P(x0 + 600, ky + 2400, 3000)], {building: N, part: 'menu board: tacos, burritos, tortas, aguas frescas'}, {closed: true});
    for (let j = 0; j < 3; j++) line('interior', [C.car2, C.brick, C.yellow][j], circ(x1 - 1200 - j * 700, ky - 500, 250, 1100, 8), {building: N, part: ['horchata', 'jamaica', 'tamarindo'][j] + ' agua fresca jar'}, {closed: true});
    line('interior', C.brick, [P(x0 + 300, y0 + 300, 2600), P(x1 - 300, y0 + 300, 2600)], {building: N, part: 'papel picado banner', anim: {type: 'sway', deg: 4, period: 2.5}});
    act(x0 + 1800, ky + 700, 'standing', 'taking an order for three carne asada tacos', Math.PI);
    act(x0 + 1800, ky - 700, 'standing', 'ordering al pastor with extra pineapple');
    act(x0 + 2500, y1 - 8200, 'standing', 'flipping tortillas on the comal', Math.PI);
    act(x0 + 7000, y1 - 6000, 'standing', 'pulling tickets off the kitchen printer');
    act(x0 + 1600, y0 + 1600, 'sitting', 'sharing a plate of nachos');
    act(x0 + 4500, y0 + 4100, 'standing', 'filling a cup with salsa verde');
  }
  // ---- 1 Brass Tack Hardware
  {
    const N = 'Brass Tack Hardware';
    const {x0, x1} = shell(1, N, 'lines', C.veg, N);
    for (let g = 0; g < 3; g++) { const gx = x0 + 1500 + g * 2400; line('interior', C.int, rect(gx, y0 + 3000, gx + 1219, y1 - 7500, 1829), {building: N, part: 'aisle gondola ' + (g + 1), checks: [['shelf_height', 1829]]}, {closed: true}); for (const z of [300, 750, 1200, 1650]) for (const s of [0, 1219]) line('interior', [C.brick, C.struct, C.car2, C.yellow][Math.round(z / 450) % 4], [P(gx + s, y0 + 3000, z), P(gx + s, y1 - 7500, z)], {building: N, part: ['fasteners', 'plumbing parts', 'electrical boxes', 'garden tools', 'paint sundries', 'hand tools'][(g * 2 + s / 1219) % 6] + ' shelf'}); }
    for (let j = 0; j < 12; j++) line('interior', C.brick, rect(x1 - 900, y0 + 2000 + j * 700, x1 - 300, y0 + 2600 + j * 700, 1000 + (j % 3) * 300), {building: N, part: 'nail and screw bin ' + (j + 1)}, {closed: true});
    line('interior', C.brick, [P(x0 + 600, y0 + 1800, 1016), P(x0 + 3600, y0 + 1800, 1016)], {building: N, part: 'checkout counter', checks: [['counter_height', 1016]]});
    line('interior', C.int, [P(x0 + 1500, y0 + 1800, 1016), P(x0 + 1500, y0 + 1650, 1400)], {building: N, part: 'pos terminal'});
    line('interior', C.int, rect(x0 + 2400, y0 + 1700, x0 + 2700, y0 + 1950, 1050), {building: N, part: 'receipt printer'}, {closed: true});
    line('interior', C.struct, rect(x0 + 6000, y0 + 1200, x0 + 6600, y0 + 1700, 1016), {building: N, part: 'key cutting machine'}, {closed: true});
    line('interior', C.int, circ(x0 + 6300, y0 + 1450, 120, 1150, 8), {building: N, part: 'key cutter wheel', anim: {type: 'spin', rpm: 120}}, {closed: true});
    line('interior', C.struct, rect(x0 + 7000, y0 + 1200, x0 + 7700, y0 + 1800, 1200), {building: N, part: 'paint shaker'}, {closed: true});
    line('interior', C.brick, rect(x0 + 7150, y0 + 1350, x0 + 7550, y0 + 1650, 1500), {building: N, part: 'gallon can in the shaker', anim: {type: 'bob', mm: 25, period: 0.2}}, {closed: true});
    for (let j = 0; j < 8; j++) line('interior', [C.brick, C.car2, C.yellow, C.veg, C.int, C.car, C.struct, C.street][j], [P(x0 + 300, y0 + 6000 + j * 400, 1000), P(x0 + 300, y0 + 6000 + j * 400, 1900)], {building: N, part: 'paint chip display column ' + (j + 1)});
    for (let j = 0; j < 5; j++) line('interior', C.veg, [P(x0 + 1000 + j * 1500, y1 - 7000, 0), P(x0 + 1000 + j * 1500, y1 - 7000, 1500)], {building: N, part: ['rake', 'shovel', 'hoe', 'post hole digger', 'pry bar'][j] + ' on the rack'});
    act(x0 + 1500, y0 + 2500, 'standing', 'ringing up a box of deck screws', Math.PI);
    act(x0 + 6300, y0 + 2200, 'standing', 'cutting a spare house key');
    act(x0 + 2300, y0 + 6000, 'standing', 'hunting for a half inch elbow');
    act(x0 + 4700, y0 + 9000, 'standing', 'explaining which caulk to buy');
    act(x0 + 7400, y0 + 2500, 'standing', 'waiting on a gallon of adobe tan');
  }
  // ---- 2 Rattlesnake Ridge Tractor Repair
  {
    const N = 'Rattlesnake Ridge Tractor Repair';
    const {x0, x1} = shell(2, N, 'lines', C.struct, N);
    line('structure', C.brick, [P(x0 + 800, y0), P(x0 + 800, y0, 3658), P(x0 + 4458, y0, 3658), P(x0 + 4458, y0)], {building: N, part: 'roll up bay door'});
    const tx = x0 + 3000, ty = y0 + 6000;
    line('interior', C.yellow, rect(tx - 700, ty - 1600, tx + 700, ty + 1200, 1500), {building: N, part: 'utility tractor on jack stands'}, {closed: true});
    for (const [dx, dy, r] of [[-950, -1100, 750], [950, -1100, 750], [-800, 900, 450], [800, 900, 450]]) line('interior', C.int, circ(0, 0, r, 0, 12).map(p => P(tx + dx, ty + dy + p[1], 600 + r + p[0])), {building: N, part: 'tractor tire'}, {closed: true});
    line('interior', C.yellow, [P(tx, ty - 400, 1500), P(tx, ty - 400, 2700), P(tx - 600, ty - 400, 2700), P(tx + 600, ty - 400, 2700)], {building: N, part: 'rops bar'});
    line('interior', C.struct, [P(tx - 300, ty + 1500, 1300), P(tx + 300, ty + 1500, 1300), P(tx + 300, ty + 2200, 900), P(tx - 300, ty + 2200, 900)], {building: N, part: 'hydraulic pump pulled for rebuild'}, {closed: true});
    for (const [dx, dy] of [[-800, -1600], [800, -1600], [-800, 1200], [800, 1200]]) line('interior', C.brick, [P(tx + dx, ty + dy, 0), P(tx + dx, ty + dy, 600)], {building: N, part: 'jack stand'});
    line('interior', C.struct, [P(x0 + 6500, ty - 2000, 0), P(x0 + 6500, ty - 2000, 2400), P(tx + 600, ty, 2400), P(tx + 600, ty, 1800)], {building: N, part: 'engine hoist boom and chain', anim: {type: 'sway', deg: 2, period: 3, pivot: P(x0 + 6500, ty - 2000, 2400)}});
    line('interior', C.brick, rect(x1 - 1000, y0 + 2000, x1 - 300, y0 + 6000, 965), {building: N, part: 'steel workbench', checks: [['counter_height', 965]]}, {closed: true});
    line('interior', C.int, rect(x1 - 900, y0 + 2600, x1 - 500, y0 + 2900, 1100), {building: N, part: 'bench vise'}, {closed: true});
    line('interior', C.int, circ(x1 - 650, y0 + 4000, 180, 1150, 8), {building: N, part: 'bench grinder wheel', anim: {type: 'spin', rpm: 110}}, {closed: true});
    line('interior', C.brick, rect(x1 - 1100, y0 + 6500, x1 - 300, y0 + 8000, 1219), {building: N, part: 'rolling tool chest', checks: [['shelf_height', 1219]]}, {closed: true});
    for (let j = 0; j < 6; j++) line('interior', C.int, [P(x1 - 1100, y0 + 6500, 200 + j * 170), P(x1 - 1100, y0 + 8000, 200 + j * 170)], {building: N, part: 'tool drawer ' + (j + 1)});
    line('interior', C.struct, circ(x0 + 900, y1 - 7000, 400, 0, 10), {building: N, part: 'air compressor tank'}, {closed: true});
    line('interior', C.struct, [P(x0 + 900, y1 - 7000, 0), P(x0 + 900, y1 - 7000, 1600)], {building: N, part: 'compressor upright'});
    line('interior', C.car2, [P(x0 + 900, y1 - 7000, 1600), P(x0 + 900, y0 + 3000, 2600), P(tx - 900, ty - 800, 2600), P(tx - 900, ty - 800, 900)], {building: N, part: 'air hose reel line'});
    for (let j = 0; j < 4; j++) line('interior', C.int, rect(x0 + 300, y0 + 9000 + j * 900, x0 + 900, y0 + 9800 + j * 900, 2134), {building: N, part: ['filters', 'belts', 'hydraulic hoses', 'seals and bearings'][j] + ' parts rack', checks: [['shelf_height', 2134]]}, {closed: true});
    line('interior', C.veg, rect(x0 + 5500, y0 + 10000, x0 + 8200, y0 + 11000, 300), {building: N, part: 'oil drain pan and spill mat'}, {closed: true});
    line('interior', C.int, rect(x0 + 5600, y1 - 5700, x0 + 5900, y1 - 5300, 1300), {building: N, part: 'diagnostic laptop on the desk'}, {closed: true});
    act(tx + 1100, ty - 400, 'standing', 'bleeding air from the hydraulic lines', -Math.PI / 2);
    act(x1 - 1500, y0 + 3500, 'standing', 'sharpening a mower blade on the grinder', Math.PI / 2);
    act(x0 + 3300, y0 - 2700, 'standing', 'dropping off a loader bucket to weld');
    act(x0 + 6000, y1 - 4600, 'sitting', 'writing up a work order');
    act(x0 + 6600, ty - 1500, 'standing', 'lowering the hoist an inch at a time');
  }
  // ---- 3 Two Bit Barber Shop
  {
    const N = 'Two Bit Barber Shop';
    const {x0, x1} = shell(3, N, 'brick', C.car2, N);
    sym('structure', C.brick, 'pole', P(x0 + 600, y0 - 600), 0, {part: 'barber pole post'});
    line('structure', C.brick, [P(x0 + 450, y0 - 600, 2000), P(x0 + 750, y0 - 600, 2400), P(x0 + 450, y0 - 600, 2800)], {building: N, part: 'barber pole stripe', anim: {type: 'spin', rpm: 30, pivot: P(x0 + 600, y0 - 600, 0)}});
    for (let j = 0; j < 3; j++) { const cx = x0 + 1800 + j * 2700, cy = y0 + 7000; line('interior', C.brick, circ(cx, cy, 450, 600, 10), {building: N, part: 'barber chair ' + (j + 1), anim: j === 1 ? {type: 'spin', rpm: 3} : undefined}, {closed: true}); line('interior', C.brick, [P(cx, cy, 0), P(cx, cy, 600)], {building: N, part: 'hydraulic chair base'}); line('interior', C.int, [P(cx - 600, y1 - 6500, 1000), P(cx + 600, y1 - 6500, 1000), P(cx + 600, y1 - 6500, 2100), P(cx - 600, y1 - 6500, 2100)], {building: N, part: 'station mirror ' + (j + 1)}, {closed: true}); line('interior', C.int, rect(cx - 600, y1 - 6700, cx + 600, y1 - 6400, 914), {building: N, part: 'station counter with clippers and combs', checks: [['counter_height', 914]]}, {closed: true}); line('interior', C.int, rect(cx - 250, y1 - 6650, cx + 250, y1 - 6450, 914), {building: N, part: 'shampoo bowl'}, {closed: true}); sym('electrical', C.elec, 'outlet', P(cx + 400, y1 - 6400, 1067), 0, {checks: [['outlet_height', 1067]], part: 'clipper outlet'}); line('interior', C.car2, circ(cx - 400, y1 - 6550, 60, 1000, 6), {building: N, part: 'blue barbicide jar'}, {closed: true}); }
    for (let j = 0; j < 5; j++) line('interior', C.int, rect(x0 + 600 + j * 1300, y0 + 1000, x0 + 1600 + j * 1300, y0 + 1600, 457), {building: N, part: 'waiting chair ' + (j + 1)}, {closed: true});
    line('interior', C.brick, rect(x1 - 1800, y0 + 2000, x1 - 400, y0 + 2600, 457), {building: N, part: 'coffee table with fishing magazines'}, {closed: true});
    line('interior', C.int, [P(x1 - 150, y0 + 3000, 1800), P(x1 - 150, y0 + 4500, 1800), P(x1 - 150, y0 + 4500, 2600), P(x1 - 150, y0 + 3000, 2600)], {building: N, part: 'wall tv showing the ballgame'}, {closed: true});
    line('interior', C.brick, [P(x1 - 1500, y0 + 4000, 1067), P(x1 - 400, y0 + 4000, 1067)], {building: N, part: 'register counter', checks: [['counter_height', 1067]]});
    line('interior', C.int, [P(x1 - 900, y0 + 4000, 1067), P(x1 - 900, y0 + 3850, 1400)], {building: N, part: 'tablet pos on a stand'});
    act(x0 + 1800, y0 + 7950, 'standing', 'fading the sides with clippers', Math.PI);
    act(x0 + 1800, y0 + 7000, 'sitting', 'getting a high and tight');
    act(x0 + 4500, y0 + 7000, 'sitting', 'leaning back for a hot towel shave');
    act(x0 + 4500, y0 + 7950, 'standing', 'stropping a straight razor');
    act(x0 + 1100, y0 + 1300, 'sitting', 'reading a fishing magazine in line');
    act(x0 + 3700, y0 + 1300, 'sitting', 'arguing about the ballgame');
  }
  // ---- 4 Coin and Suds Laundromat
  {
    const N = 'Coin and Suds Laundromat';
    const {x0, x1} = shell(4, N, 'lines', C.car2, N);
    for (let j = 0; j < 8; j++) { const wx = x0 + 600 + (j % 2) * (W - 2000), wy = y0 + 2500 + Math.floor(j / 2) * 1500; line('interior', C.int, rect(wx, wy, wx + 800, wy + 800, 914), {building: N, part: 'front load washer ' + (j + 1), checks: [['counter_height', 914]]}, {closed: true}); line('interior', C.car2, circ(wx + 400, wy + 400, 280, 914, 8), {building: N, part: 'washer door ' + (j + 1), anim: j % 3 ? {type: 'spin', rpm: 40 + j * 5} : undefined}, {closed: true}); }
    for (let j = 0; j < 6; j++) { const dx = x0 + 1800 + j * 900, dy = y1 - 7000; line('interior', C.int, rect(dx, dy, dx + 800, dy + 700, 1829), {building: N, part: 'stacked dryer ' + (j + 1), checks: [['shelf_height', 1829]]}, {closed: true}); line('interior', C.brick, circ(dx + 400, dy + 350, 280, 1500, 8), {building: N, part: 'dryer drum ' + (j + 1), anim: j % 2 ? {type: 'spin', rpm: 50} : undefined}, {closed: true}); line('plumbing', C.struct, [P(dx + 400, dy + 700, 1700), P(dx + 400, y1 - 6150, 2600)], {building: N, part: 'dryer vent'}); }
    for (let j = 0; j < 2; j++) line('interior', C.brick, rect(x0 + 3000, y0 + 3000 + j * 3000, x0 + 6000, y0 + 3900 + j * 3000, 914), {building: N, part: 'folding table ' + (j + 1), checks: [['counter_height', 914]]}, {closed: true});
    line('interior', C.int, rect(x0 + 600, y0 + 1000, x0 + 1200, y0 + 1500, 1400), {building: N, part: 'coin changer'}, {closed: true});
    line('interior', C.int, rect(x0 + 1400, y0 + 1000, x0 + 2000, y0 + 1500, 1700), {building: N, part: 'soap vending machine'}, {closed: true});
    for (let j = 0; j < 4; j++) line('interior', C.struct, rect(x0 + 4000 + j * 900, y0 + 800, x0 + 4700 + j * 900, y0 + 1300, 457), {building: N, part: 'plastic waiting chair ' + (j + 1)}, {closed: true});
    for (let j = 0; j < 4; j++) line('plumbing', C.plumb, [P(x0 + 1000 + (j % 2) * (W - 2000), y0 + 2300 + Math.floor(j / 2) * 3000, 1100), P(x0 + 1000 + (j % 2) * (W - 2000), y0 + 2300 + Math.floor(j / 2) * 3000, 2600)], {building: N, part: 'washer supply riser ' + (j + 1)});
    run('plumbing', C.sewer, [P(x0 + 1000, y0 + 2300, -400), P(x0 + 1000, y1 - 200, -400), P(x0 + 1000, alleyY + 900, -1900)], {building: N, part: 'washer drain trench'});
    act(x0 + 4500, y0 + 2600, 'standing', 'folding a mountain of towels');
    act(x0 + 4500, y0 + 5600, 'standing', 'matching up socks');
    act(x0 + 900, y0 + 1800, 'standing', 'breaking a five into quarters');
    act(x0 + 4300, y0 + 1600, 'sitting', 'watching the dryers spin');
    act(x0 + 5200, y0 + 1600, 'sitting', 'texting while the wash runs');
  }
  // ---- 5 Static Line Electronics Repair
  {
    const N = 'Static Line Electronics Repair';
    const {x0, x1} = shell(5, N, 'brick', C.int, N);
    line('interior', C.brick, rect(x0 + 600, y0 + 6000, x1 - 600, y0 + 6800, 914), {building: N, part: 'long repair bench', checks: [['counter_height', 914]]}, {closed: true});
    const items = ['receipt printer with a jammed cutter', 'cash drawer with a bad solenoid', 'pos terminal with a cracked screen', 'kitchen display with no signal', 'tube radio', 'card reader with a dead battery'];
    items.forEach((p, j) => { const bx = x0 + 900 + j * 1250; line('interior', C.int, rect(bx, y0 + 6150, bx + 900, y0 + 6650, 1100), {building: N, part: p}, {closed: true}); sym('electrical', C.elec, 'outlet', P(bx + 450, y0 + 6850, 1067), 0, {checks: [['outlet_height', 1067]], part: 'bench outlet'}); });
    line('interior', C.street, [P(x0 + 1200, y0 + 6700, 1300), P(x0 + 1500, y0 + 6700, 1500), P(x0 + 1800, y0 + 6700, 1200), P(x0 + 2100, y0 + 6700, 1550), P(x0 + 2400, y0 + 6700, 1300)], {building: N, part: 'oscilloscope trace', anim: {type: 'blink', period: 0.25, duty: 0.7}});
    line('interior', C.int, rect(x0 + 1100, y0 + 6650, x0 + 2500, y0 + 6800, 1700), {building: N, part: 'oscilloscope'}, {closed: true});
    line('interior', C.brick, [P(x0 + 3200, y0 + 6500, 950), P(x0 + 3200, y0 + 6500, 1250)], {building: N, part: 'soldering iron', anim: {type: 'bob', mm: 30, period: 1.6}});
    line('interior', C.int, circ(x0 + 3600, y0 + 6400, 180, 1100, 8), {building: N, part: 'magnifier lamp ring'}, {closed: true});
    for (let j = 0; j < 4; j++) line('interior', C.int, rect(x0 + 300, y0 + 8000 + j * 900, x0 + 900, y0 + 8800 + j * 900, 2134), {building: N, part: ['spare thermal printer mechanisms', 'power supplies', 'cables and dongles', 'tagged repairs waiting pickup'][j] + ' shelf', checks: [['shelf_height', 2134]]}, {closed: true});
    for (let j = 0; j < 10; j++) line('interior', C.car2, rect(x0 + 1200 + (j % 5) * 1300, y0 + 9000 + Math.floor(j / 5) * 1500, x0 + 2000 + (j % 5) * 1300, y0 + 9600 + Math.floor(j / 5) * 1500, 600), {building: N, part: 'tagged customer device ' + (j + 1)}, {closed: true});
    line('interior', C.brick, [P(x0 + 600, y0 + 2000, 1067), P(x0 + 4000, y0 + 2000, 1067)], {building: N, part: 'drop off counter', checks: [['counter_height', 1067]]});
    line('interior', C.int, [P(x0 + 2000, y0 + 2000, 1067), P(x0 + 2000, y0 + 1850, 1400)], {building: N, part: 'check in terminal'});
    line('interior', C.int, rect(x0 + 2800, y0 + 1900, x0 + 3100, y0 + 2150, 1100), {building: N, part: 'label printer'}, {closed: true});
    for (let j = 0; j < 5; j++) line('interior', C.int, rect(x1 - 1200, y0 + 1500 + j * 800, x1 - 300, y0 + 2200 + j * 800, 1200 + j * 100), {building: N, part: 'refurbished receipt printer for sale ' + (j + 1)}, {closed: true});
    act(x0 + 3200, y0 + 7300, 'sitting', 'reflowing solder on a printer board', Math.PI);
    act(x0 + 1700, y0 + 7300, 'sitting', 'reading a waveform on the scope', Math.PI);
    act(x0 + 2000, y0 + 1300, 'standing', 'dropping off a jammed receipt printer');
    act(x0 + 2000, y0 + 2700, 'standing', 'writing a repair tag', Math.PI);
    act(x1 - 1800, y0 + 2500, 'standing', 'comparing two used card readers');
  }

  // ---- Street life, rear lot and a plaza on Agave Street
  act(a + 2000, ya - 1800, 'walking', 'window shopping down Cholla Street', 0, {type: 'path', speed: 1000, pts: [P(a + 2000, ya - 1800), P(b - 2000, ya - 1800), P(b - 2000, ya - 2600), P(a + 2000, ya - 2600), P(a + 2000, ya - 1800)]});
  act(a + 21000, ya - 2500, 'standing', 'reading the hours on the hardware door');
  act(a + 40000, ya - 2200, 'sitting', 'eating a torta on the curb bench');
  sym('activity', C.struct, 'bench', P(a + 40000, ya - 2600), 0, {activity: 'bench in front of the laundromat'});
  sym('activity', C.brick, 'dog', P(a + 30000, ya - 2000), 0, {activity: 'dog tied up outside the barber shop'});
  act(a + 8000, y1 + 2000, 'standing', 'hauling cardboard to the recycling bin');
  act(a + 26000, y1 + 2500, 'standing', 'unloading a pallet of tractor filters');
  sym('vehicle', C.struct, 'truck', P(a + 24000, y1 + 3000), Math.PI / 2, {part: 'parts delivery box truck'});
  // Rear lot with stalls
  const lotY0 = y1 + 6096 + 1000;
  for (let j = 0; j < 12; j++) { const sx = a + 2000 + j * 2743; line('paving', C.white, [P(sx, lotY0), P(sx, lotY0 + 5486), P(sx + 2743, lotY0 + 5486), P(sx + 2743, lotY0)], {part: 'rear lot stall', checks: [['stall_width', 2743], ['stall_depth', 5486]]}); if (j % 3 !== 1) sym('vehicle', [C.car, C.car2, C.yellow, C.veg][j % 4], j % 4 === 2 ? 'truck' : 'car', P(sx + 1371, lotY0 + 2743), 0); }
  line('paving', C.car2, rect(a + 2000 + 12 * 2743, lotY0, a + 2000 + 12 * 2743 + 3658, lotY0 + 5486), {part: 'accessible stall', checks: [['stall_width', 3658], ['stall_depth', 5486]]}, {closed: true});
  // Plaza along Agave Street with a winding path, shade and a food truck
  const pz = lotY0 + 7000;
  const path = []; for (let j = 0; j <= 24; j++) { const t = j / 24; path.push(P(a + 1000 + t * (b - a - 2000), pz + 3500 + Math.sin(t * Math.PI * 3) * 2000)); }
  line('paving', C.curb, path, {part: 'decomposed granite plaza path'});
  for (let j = 0; j < 5; j++) line('vegetation', C.veg2, blob(a + 6000 + j * 12000, pz + (j % 2 ? 1000 : 6500), 1700, 14, j + 2), {part: ['lantana bed', 'globe mallow bed', 'red yucca bed'][j % 3]}, {closed: true});
  for (let j = 0; j < 5; j++) tree(a + 12000 + j * 12000, pz + (j % 2 ? 6000 : 1200), 4, 4.5 + j * 0.3);
  sym('vehicle', C.yellow, 'truck', P(b - 9000, yb - 3000), Math.PI / 2, {part: 'paleta and elote food truck'});
  act(b - 9000, yb - 5000, 'standing', 'buying elote with chile and lime');
  act(b - 12000, yb - 4600, 'standing', 'waiting for a mango paleta');
  sym('activity', C.brick, 'umbrella', P(a + 30000, pz + 3500), 0, {activity: 'shade over the plaza chess table'});
  sym('activity', C.brick, 'table', P(a + 30000, pz + 3500), 0, {activity: 'chess game in the middle of a long think'});
  act(a + 29300, pz + 3500, 'sitting', 'thinking over a knight move', Math.PI / 2);
  act(a + 30700, pz + 3500, 'sitting', 'tapping the chess clock', -Math.PI / 2);
  for (const [x, y, pose, t, rot, anim] of acts) person(P(x, y), rot, pose, t, anim);
}
