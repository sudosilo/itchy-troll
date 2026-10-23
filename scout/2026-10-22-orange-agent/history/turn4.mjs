// Agent Orange turn four: an RV park north of the motor court, a fuel stop east of it, and right-hand traffic circling every block.
export default function (k) {
  const {S, P, push, line, sym, hatch, rect, arc, vface, wall, run, person, tree, door, streetsForChunk, lot, OWN, VSTREET, C, CURB, PL} = k;
  const blob = (cx, cy, r, n, seed, z = 0) => { const o = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; const rr = r * (1 + 0.15 * Math.sin(a * 3 + seed) + 0.07 * Math.sin(a * 5 + seed * 2)); o.push(P(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, z)); } return o; };
  const ring = (cx, cy, r, n, z = 0, wob = 0, seed = 0) => { const o = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; const rr = r + wob * Math.sin(a * 4 + seed); o.push(P(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, z)); } return o; };
  const at = (c, u, v, du, dv, z = 0) => P(c[0] + u[0] * du + v[0] * dv, c[1] + u[1] * du + v[1] * dv, z);
  const quad = (c, u, v, u0, u1, v0, v1, z = 0) => [at(c, u, v, u0, v0, z), at(c, u, v, u1, v0, z), at(c, u, v, u1, v1, z), at(c, u, v, u0, v1, z)];

  // ---------- Claims and streets
  push('claim_chunk', {chunk: [2, 1]});
  push('claim_chunk', {chunk: [3, 0]});
  for (const c of [[2, 1], [3, 0]]) for (const edge of ['n', 's', 'e', 'w']) push('declare_port', {chunk: c, edge, value: CURB});
  VSTREET.push('Ironwood Avenue');
  const keep = [...OWN]; OWN.clear(); OWN.add('2:1'); OWN.add('3:0');
  streetsForChunk(2, 1, {s: true, n: true, e: true, w: false});
  streetsForChunk(3, 0, {s: true, n: true, e: true, w: false});
  OWN.clear(); for (const x of keep) OWN.add(x); OWN.add('2:1'); OWN.add('3:0');

  // ---------- 2,1 Sidewinder Wash RV Park
  {
    const ox = 2 * S, oy = S, a = ox + PL, b = ox + S - PL, ya = oy + PL, yb = oy + S - PL;
    const cx = ox + S / 2, cy = oy + S / 2;
    lot('rv park', a, ya, b, yb, 'rv park parcel');
    const PARK = 'Sidewinder Wash RV Park';
    // Loop lane and entry drive from Mesquite Street
    line('paving', C.curb, ring(cx, cy, 20000, 48, 0, 600, 1), {part: 'gravel loop lane centerline', checks: [['lane_width', 3658]]}, {closed: true});
    line('paving', C.curb, ring(cx, cy, 18172, 48, 0, 600, 1), {part: 'loop lane inner edge'}, {closed: true});
    line('paving', C.curb, ring(cx, cy, 21828, 48, 0, 600, 1), {part: 'loop lane outer edge'}, {closed: true});
    hatch('paving', C.curb, [P(cx - 1829, oy + CURB), P(cx + 1829, oy + CURB), P(cx + 1829, cy - 21000), P(cx - 1829, cy - 21000)], 'dots', 700, 0, {part: 'entry drive gravel'}, C.struct);
    sym('structure', C.brick, 'sign', P(cx + 3200, ya + 1200), 0, {text: PARK});
    sym('structure', C.yellow, 'sign', P(cx - 3200, ya + 1200), 0, {text: 'Check In at Clubhouse 5 mph', anim: {type: 'blink', period: 2, duty: 0.8}});
    // Underground utility rings feeding every pad
    line('electrical', C.elec, ring(cx, cy, 23200, 40, -600, 300, 2), {part: 'park underground power loop'}, {closed: true});
    line('plumbing', C.plumb, ring(cx, cy, 23600, 40, -900, 300, 3), {part: 'park water loop'}, {closed: true});
    line('plumbing', C.sewer, ring(cx, cy, 22800, 40, -1500, 300, 4), {part: 'park sewer collector'}, {closed: true});
    sym('electrical', C.struct, 'pole', P(cx + 6000, oy + CURB + 900), 0, {part: 'service pole with transformer'});
    line('electrical', C.elec, [P(cx + 6000, oy + CURB + 900, 0), P(cx + 6000, oy + CURB + 900, -600), P(cx + 6000, cy - 23200, -600)], {part: 'underground feed to the power loop'});
    line('plumbing', C.plumb, [P(cx + 4000, oy + 1200, -900), P(cx + 4000, cy - 23600, -900)], {part: 'water main tap from Mesquite Street'});
    line('plumbing', C.sewer, [P(cx + 2500, cy - 22800, -1500), P(cx + 2500, oy + 2400, -2100)], {part: 'sewer outfall to Mesquite Street'});
    // Pads around the loop, skipping the entry drive
    const padActs = [
      ['grilling burgers by the fifth wheel', 'playing cribbage under the awning'],
      ['leveling the trailer with yellow blocks', 'handing up wrenches from the step'],
      ['hanging string lights on the awning', 'holding the ladder steady'],
      ['reading by a camp lantern', 'snoring in a zero gravity chair'],
      ['tuning a guitar on a lawn chair', 'humming along with a cold soda'],
      ['checking tire pressure on the trailer', 'reading the gauge out loud'],
      ['unhitching after a long haul', 'guiding the truck back with hand signals'],
      ['watering potted cactus by the step', 'sweeping red dirt off the mat'],
      ['washing the truck with a bucket', 'rinsing suds off the tailgate'],
      ['fixing a slide out seal', 'reading the manual for the slide out'],
      ['drawing chalk flowers on the pad', 'hopping a chalk hopscotch grid']
    ];
    const rvNames = ['silver airstream', 'fifth wheel', 'class c motorhome', 'teardrop and tent', 'toy hauler', 'vintage canned ham', 'class a motorhome', 'pop up camper', 'travel trailer', 'truck camper', 'bunkhouse trailer'];
    const angles = [300, 330, 0, 30, 60, 90, 120, 150, 180, 210, 240];
    angles.forEach((deg, i) => {
      const t = deg * Math.PI / 180, u = [Math.cos(t), Math.sin(t)], v = [-Math.sin(t), Math.cos(t)];
      const c = [cx + u[0] * 26000, cy + u[1] * 26000];
      const len = 4267, half = 1219;
      line('vehicle', [C.struct, C.car2, C.brick, C.veg, C.int][i % 5], quad(c, u, v, -len, len, -half, half, 300), {part: rvNames[i] + ' chassis'}, {closed: true});
      line('vehicle', [C.struct, C.car2, C.brick, C.veg, C.int][i % 5], quad(c, u, v, -len, len, -half, half, i === 3 ? 1500 : 3350), {part: rvNames[i] + ' roof line'}, {closed: true, color2: C.curb});
      hatch('vehicle', C.car2, [at(c, u, v, -2500, half, 1200), at(c, u, v, -800, half, 1200), at(c, u, v, -800, half, 2000), at(c, u, v, -2500, half, 2000)], 'lines', 200, 0, {part: rvNames[i] + ' window'});
      hatch('vehicle', C.brick, quad(c, u, v, -3200, 2400, half, half + 2600, 2600), 'lines', 300, 0, {part: 'striped patio awning', anim: {type: 'sway', deg: 1, period: 4 + i * 0.2, pivot: at(c, u, v, 0, half, 2600)}});
      hatch('paving', C.curb, quad(c, u, v, -4600, 4600, -half - 3300, half + 3000, 0), 'lines', 900, 0, {part: 'gravel pad ' + (i + 1)});
      sym('vehicle', [C.car, C.yellow, C.struct, C.car2][i % 4], 'truck', at(c, u, v, 0, -half - 1500), t + Math.PI / 2, {part: 'tow vehicle'});
      sym('activity', C.brick, 'table', at(c, u, v, -1400, half + 1500), 0, {activity: 'picnic table set with paper plates ' + (i + 1)});
      person(at(c, u, v, -400, half + 1600), t, 'sitting', padActs[i][0]);
      person(at(c, u, v, 2400, half + 900), t + Math.PI, i % 2 ? 'standing' : 'sitting', padActs[i][1]);
      // Pedestal on the lane side of the pad
      const pc = at(c, u, v, -len - 600, half + 900);
      line('electrical', C.elec, [P(pc[0], pc[1], 0), P(pc[0], pc[1], 1200)], {part: '50 amp pedestal post'});
      sym('electrical', C.elec, 'outlet', P(pc[0], pc[1], 914), t, {checks: [['outlet_height', 914]], part: '50 amp receptacle'});
      line('plumbing', C.plumb, [P(pc[0], pc[1], 450), P(pc[0], pc[1], -900), at(c, u, v, -2800, half + 900, -900)], {part: 'water spigot riser'});
      line('plumbing', C.sewer, [at(c, u, v, -len + 600, -half + 300, 0), at(c, u, v, -len + 600, -half + 300, -1500), at(c, u, v, -3200, -half + 300, -1500)], {part: 'sewer hookup with green hose'});
      if (i % 3 === 0) sym('vegetation', C.veg, 'tree', at(c, u, v, 3600, half + 3600), 0, {anim: {type: 'sway', deg: 4, period: 5 + i * 0.3}});
      if (i % 3 === 1) sym('activity', C.brick, 'dog', at(c, u, v, 1200, half + 2000), t, {activity: ['heeler guarding the camp chairs', 'pug napping on the outdoor rug', 'retriever chewing a stick by the step', 'terrier barking at a lizard'][Math.floor(i / 3) % 4]});
    });
    // Clubhouse inside the loop
    const NAME = 'Sidewinder Wash Clubhouse';
    const x0 = cx - 6096, x1 = cx + 6096, y0 = cy - 3658, y1 = cy + 3657, H = 3658;
    wall(NAME, [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], H, -914, true);
    wall(NAME, [[x0 + 4064, y0], [x0 + 4064, y1]], 2743, 0, false, C.int);
    wall(NAME, [[x0 + 7315, y0], [x0 + 7315, y1]], 2743, 0, false, C.int);
    wall(NAME, [[x0 + 4064, cy], [x0 + 7315, cy]], 2743, 0, false, C.int);
    hatch('structure', C.brick, vface(x0, y0, x1, y0, 0, H), 'lines', 250, 90, {building: NAME, part: 'board and batten'}, C.struct);
    hatch('structure', C.roof, rect(x0 - 900, y0 - 900, x1 + 900, y1 + 900, H), 'gradient', 450, 0, {building: NAME, part: 'tin roof with overhang'}, C.brick);
    door(NAME, x0 + 1500, y0, 'x', 914, 'laundry door', -1);
    door(NAME, x0 + 5200, y0, 'x', 864, 'shower room south door', -1);
    door(NAME, x0 + 5200, y1, 'x', 864, 'shower room north door', 1);
    door(NAME, x1 - 3000, y0, 'x', 914, 'rec room door', -1);
    line('structure', C.int, rect(x0 + 150, y0 + 150, x1 - 150, y1 - 150, 2743), {building: NAME, part: 'ceiling', checks: [['ceiling_height', 2743]]}, {closed: true});
    for (let i = 0; i < 3; i++) { line('interior', C.int, rect(x0 + 300 + i * 1200, y1 - 1000, x0 + 1200 + i * 1200, y1 - 200, 914), {building: NAME, part: 'coin washer ' + (i + 1), checks: [['counter_height', 914]]}, {closed: true}); line('interior', C.int, arc(x0 + 750 + i * 1200, y1 - 600, 300, 0, 360, 8, 914), {building: NAME, part: 'washer drum ' + (i + 1), anim: {type: 'spin', rpm: 30 + i * 8}}, {closed: true}); }
    for (let i = 0; i < 2; i++) { line('interior', C.int, rect(x0 + 300 + i * 1200, y0 + 300, x0 + 1200 + i * 1200, y0 + 1100, 1829), {building: NAME, part: 'stacked dryer ' + (i + 1), checks: [['shelf_height', 1829]]}, {closed: true}); line('interior', C.int, arc(x0 + 750 + i * 1200, y0 + 700, 300, 0, 360, 8, 1400), {building: NAME, part: 'dryer drum ' + (i + 1), anim: {type: 'spin', rpm: 45}}, {closed: true}); }
    line('interior', C.brick, [P(x0 + 300, cy, 914), P(x0 + 3700, cy, 914)], {building: NAME, part: 'folding counter', checks: [['counter_height', 914]]});
    for (let i = 0; i < 2; i++) line('interior', C.int, rect(x0 + 4300 + i * 1500, y0 + 300, x0 + 5600 + i * 1500, y0 + 1500, 2134), {building: NAME, part: 'shower stall ' + (i + 1)}, {closed: true});
    line('interior', C.int, rect(x0 + 4400, y1 - 900, x0 + 6900, y1 - 300, 864), {building: NAME, part: 'double vanity', checks: [['counter_height', 864]]}, {closed: true});
    line('interior', C.veg, rect(x1 - 3900, cy - 700, x1 - 1400, cy + 700, 762), {building: NAME, part: 'pool table felt'}, {closed: true});
    sym('interior', C.brick, 'table', P(x1 - 2000, y1 - 1300), 0, {part: 'card table'});
    line('interior', C.brick, rect(x1 - 600, y0 + 600, x1 - 250, y0 + 3000, 1829), {building: NAME, part: 'paperback swap shelf', checks: [['shelf_height', 1829]]}, {closed: true});
    sym('interior', C.int, 'mark', P(x1 - 2600, cy, 2743), 0, {part: 'rec room ceiling fan', anim: {type: 'spin', rpm: 55}});
    for (const [x, y] of [[x0 + 2032, cy], [x0 + 5690, y0 + 1800], [x0 + 5690, y1 - 1800], [x1 - 2400, y0 + 1800], [x1 - 2400, y1 - 1800]]) sym('electrical', C.elec, 'light', P(x, y, 2743), 0);
    for (const [x, y] of [[x0 + 150, y0 + 2000], [x0 + 150, y1 - 2000], [x1 - 150, cy], [x0 + 4214, y1 - 1500]]) sym('electrical', C.elec, 'outlet', P(x, y, 457), 0, {checks: [['outlet_height', 457]]});
    sym('electrical', C.elec, 'outlet', P(x0 + 2000, cy - 150, 1067), 0, {checks: [['outlet_height', 1067]], part: 'counter outlet'});
    run('electrical', C.elec, [P(cx, cy - 23200, -600), P(cx, y0 - 300, -600), P(cx, y0 - 300, 300), P(cx, y0 + 600, 300), P(cx, y0 + 600, 2900)], {building: NAME, part: 'clubhouse feeder from the loop'});
    run('plumbing', C.plumb, [P(cx + 1200, cy - 23600, -900), P(cx + 1200, y0 + 900, -900), P(cx + 1200, y0 + 900, 900), P(x0 + 600, y0 + 900, 900)], {building: NAME, part: 'water to showers and washers'});
    run('plumbing', C.sewer, [P(x0 + 2000, y1 - 600, -600), P(x0 + 2000, y0 - 2000, -1200), P(cx - 2500, cy - 22800, -1500)], {building: NAME, part: 'clubhouse drain to the collector'});
    sym('structure', C.sign, 'sign', P(cx - 3000, y0 - 2200), 0, {text: NAME});
    const clubActs = [
      [x0 + 2000, cy - 900, 'standing', 'folding towels in the laundry room'],
      [x0 + 1200, y0 + 1800, 'sitting', 'waiting on the dryer with a magazine'],
      [x1 - 2600, cy - 1300, 'standing', 'lining up a bank shot on the eight ball'],
      [x1 - 2600, cy + 1300, 'standing', 'chalking a cue and talking trash'],
      [x1 - 2000, y1 - 800, 'sitting', 'playing dominoes at the card table'],
      [x1 - 900, y0 + 1800, 'standing', 'swapping paperbacks on the shelf']
    ];
    for (const [x, y, pose, act] of clubActs) person(P(x, y), 0, pose, act);
    // Fire pit, horseshoes, dog run inside the loop
    const fx = cx - 9000, fy = cy - 9500;
    line('activity', C.struct, ring(fx, fy, 900, 12, 400), {part: 'stone fire ring'}, {closed: true});
    for (let i = 0; i < 3; i++) line('activity', [C.brick, C.yellow, C.brick][i], [P(fx - 300 + i * 300, fy - 150, 400), P(fx - 150 + i * 300, fy, 1100 - i * 150), P(fx + i * 300, fy + 150, 400)], {part: 'flame', anim: {type: 'blink', period: 0.3 + i * 0.07, duty: 0.6}});
    sym('activity', C.int, 'bench', P(fx, fy - 2200), 0, {activity: 'log bench around the fire'});
    person(P(fx - 1800, fy + 600), -1.2, 'sitting', 'roasting marshmallows at the fire pit');
    person(P(fx + 1800, fy + 600), 1.2, 'sitting', 'telling ghost stories by the fire');
    person(P(fx, fy + 2000), Math.PI, 'standing', 'poking the coals with a stick');
    const hx = cx + 9000, hy = cy - 9500;
    line('lot', C.curb, rect(hx - 900, hy - 6000, hx + 900, hy + 6000), {part: 'horseshoe court'}, {closed: true});
    for (const s of [-1, 1]) line('lot', C.struct, [P(hx, hy + s * 5500, 0), P(hx, hy + s * 5500, 380)], {part: 'horseshoe stake'});
    person(P(hx, hy - 6800), 0, 'standing', 'pitching a ringer at horseshoes');
    person(P(hx + 1500, hy + 6800), Math.PI, 'standing', 'keeping score on a clipboard');
    line('activity', C.struct, arc(hx, hy - 1000, 300, 0, 300, 6, 1800), {part: 'horseshoe in flight', anim: {type: 'path', speed: 5000, pts: [P(hx, hy - 6000, 1200), P(hx, hy - 1000, 2600), P(hx, hy + 5300, 300)]}});
    const dx = cx, dy = cy + 10500;
    line('lot', C.struct, blob(dx, dy, 4200, 24, 2), {part: 'dog run fence'}, {closed: true});
    sym('activity', C.brick, 'dog', P(dx - 1500, dy), 0, {activity: 'chasing a tennis ball across the run', anim: {type: 'path', speed: 3500, pts: [P(dx - 2500, dy - 1000), P(dx + 2500, dy + 800), P(dx - 1000, dy + 2000)]}});
    sym('activity', C.int, 'dog', P(dx + 1800, dy - 1600), 1, {activity: 'sniffing every post of the fence'});
    person(P(dx - 3000, dy - 800), 0, 'standing', 'throwing a ball in the dog run');
    // Desert landscaping between pads
    for (let i = 0; i < 11; i++) { const t = (angles[i] + 15) * Math.PI / 180; line('vegetation', C.veg2, blob(cx + Math.cos(t) * 27500, cy + Math.sin(t) * 27500, 1100, 10, i), {part: ['creosote clump', 'barrel cactus ring', 'desert broom', 'brittlebush'][i % 4]}, {closed: true}); }
    for (let i = 0; i < 6; i++) sym('vegetation', C.veg, 'tree', P(a + 1500 + i * 11800, yb - 1200), 0, {anim: {type: 'sway', deg: 3, period: 4 + i * 0.4}});
  }

  // ---------- 3,0 Horned Toad Fuel Stop
  {
    const ox = 3 * S, a = ox + PL, b = ox + S - PL, ya = PL, yb = S - PL;
    lot('commercial', a, ya, b, yb, 'fuel stop parcel');
    const NAME = 'Horned Toad Travel Stop';
    const x0 = a + 30000, x1 = x0 + 18288, y0 = ya + 34000, y1 = y0 + 12192, H = 4877;
    wall(NAME, [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], H, -1219, true);
    wall(NAME, [[x1 - 3658, y1], [x1 - 3658, y1 - 5486], [x1, y1 - 5486]], 3048, 0, false, C.int);
    wall(NAME, [[x1 - 3658, y1 - 2743], [x1, y1 - 2743]], 3048, 0, false, C.int);
    hatch('structure', C.brick, vface(x0, y0, x1, y0, 0, H), 'brick', 300, 0, {building: NAME, part: 'split face block'}, C.struct);
    hatch('structure', C.brick, vface(x0, y0, x0, y1, 0, H), 'brick', 300, 0, {building: NAME, part: 'split face block'}, C.struct);
    hatch('structure', C.roof, rect(x0, y0, x1, y1, H), 'gradient', 600, 90, {building: NAME, part: 'roof'}, C.struct);
    const ex = x0 + 8230;
    hatch('structure', C.car2, vface(x0 + 1200, y0, ex - 300, y0, 600, 2743), 'lines', 450, 90, {building: NAME, part: 'storefront glass'});
    hatch('structure', C.car2, vface(ex + 2128, y0, x1 - 1200, y0, 600, 2743), 'lines', 450, 90, {building: NAME, part: 'storefront glass'});
    door(NAME, ex, y0, 'x', 914, 'entry left leaf', -1);
    door(NAME, ex + 914, y0, 'x', 914, 'entry right leaf', -1);
    door(NAME, x1 - 3658, y1 - 4500, 'y', 914, 'mens room door', -1);
    door(NAME, x1 - 3658, y1 - 1900, 'y', 914, 'womens room door', -1);
    door(NAME, x0, y1 - 2000, 'y', 914, 'stock room door', 1);
    line('structure', C.int, rect(x0 + 150, y0 + 150, x1 - 150, y1 - 150, 3048), {building: NAME, part: 'ceiling grid', checks: [['ceiling_height', 3048]]}, {closed: true});
    for (let x = x0 + 4572; x < x1; x += 4572) line('structure', C.struct, [P(x, y0, 3658), P(x, y1, 3658)], {building: NAME, part: 'joist girder', checks: [['beam_height', 3658]]});
    for (let i = 0; i < 4; i++) { const gx = x0 + 4000 + i * 2400; line('interior', C.int, rect(gx, y0 + 3500, gx + 1219, y0 + 8500, 1524), {building: NAME, part: ['jerky and nuts', 'chips and crackers', 'motor oil and wipers', 'souvenirs and hot sauce'][i] + ' gondola', checks: [['shelf_height', 1524]]}, {closed: true}); }
    for (let i = 0; i < 8; i++) { const cy0 = y0 + 1500 + i * 1219; line('interior', C.car2, [P(x0 + 900, cy0, 0), P(x0 + 900, cy0, 2134), P(x0 + 900, cy0 + 1219, 2134), P(x0 + 900, cy0 + 1219, 0)], {building: NAME, part: ['water', 'soda', 'energy drinks', 'milk', 'beer', 'beer', 'ice cream', 'sandwiches'][i] + ' cooler door', checks: [['shelf_height', 2134]]}); }
    line('interior', C.brick, [P(x1 - 9000, y0 + 2000, 1016), P(x1 - 4500, y0 + 2000, 1016), P(x1 - 4500, y0 + 3800, 1016)], {building: NAME, part: 'checkout counter', checks: [['counter_height', 1016]]});
    for (const dx of [1200, 3000]) line('interior', C.int, [P(x1 - 9000 + dx, y0 + 2000, 1016), P(x1 - 9000 + dx, y0 + 2000, 1400)], {building: NAME, part: 'register and pump controller'});
    line('interior', C.int, rect(x1 - 8000, y0 + 2050, x1 - 7600, y0 + 2300, 1050), {building: NAME, part: 'receipt printer'}, {closed: true});
    line('interior', C.brick, rect(x1 - 3400, y0 + 1000, x1 - 400, y0 + 1800, 1067), {building: NAME, part: 'hot case with breakfast burritos', checks: [['counter_height', 1067]]}, {closed: true});
    line('interior', C.int, rect(x1 - 3400, y0 + 4500, x1 - 400, y0 + 5300, 965), {building: NAME, part: 'fountain soda and coffee bar', checks: [['counter_height', 965]]}, {closed: true});
    for (const [x, y] of [[x1 - 2400, y1 - 900], [x1 - 2400, y1 - 3600]]) line('interior', C.int, rect(x - 300, y - 300, x + 300, y + 300, 864), {building: NAME, part: 'restroom lavatory', checks: [['counter_height', 864]]}, {closed: true});
    for (let x = x0 + 2286; x < x1 - 4000; x += 3658) for (let y = y0 + 1829; y < y1; y += 3658) sym('electrical', C.elec, 'light', P(x, y, 3048), 0);
    for (const [x, y] of [[x0 + 150, y0 + 1500], [x0 + 3000, y1 - 150], [x1 - 150, y0 + 3000], [x1 - 4000, y0 + 150], [x0 + 8000, y1 - 150]]) sym('electrical', C.elec, 'outlet', P(x, y, 457), 0, {checks: [['outlet_height', 457]]});
    sym('electrical', C.elec, 'outlet', P(x1 - 2000, y0 + 5350, 1118), 0, {checks: [['outlet_height', 1118]], part: 'coffee bar outlet'});
    sym('electrical', C.struct, 'pole', P(x0 - 3000, ya - 2600), 0, {part: 'service pole'});
    run('electrical', C.elec, [P(x0 - 3000, ya - 2600, 8230), P(x0 - 200, y0 + 1000, 4200), P(x0 - 200, y0 + 1000, 1676), P(x0 + 600, y0 + 1000, 1676), P(x0 + 600, y1 - 600, 1676)], {building: NAME, part: 'service drop to the panel'});
    run('electrical', C.elec, [P(x0 + 600, y1 - 600, -762), P(x0 + 600, 30000, -762), P(a + 14000, 30000, -762), P(a + 14000, 24000, -762)], {building: NAME, part: 'conduit to the dispensers and canopy lights'});
    run('plumbing', C.plumb, [P(x1 - 2000, 1200, -1067), P(x1 - 2000, y1 - 900, -1067), P(x1 - 2000, y1 - 900, 864)], {building: NAME, part: 'water service'});
    run('plumbing', C.sewer, [P(x1 - 1300, y1 - 2400, -600), P(x1 - 1300, 2400, -1829)], {building: NAME, part: 'sewer lateral'});
    sym('structure', C.sign, 'sign', P(ex + 900, y0 - 3200), 0, {text: NAME});
    // Fuel canopy and islands
    const CN = 'Horned Toad Fuel Canopy';
    const kx0 = a + 12000, kx1 = a + 42000, ky0 = ya + 9000, ky1 = ya + 21000, KH = 5182;
    hatch('structure', C.struct, rect(kx0, ky0, kx1, ky1, KH), 'lines', 900, 0, {part: 'canopy deck'}, C.curb);
    for (const [p0, p1] of [[[kx0, ky0], [kx1, ky0]], [[kx0, ky1], [kx1, ky1]]]) hatch('structure', C.brick, vface(p0[0], p0[1], p1[0], p1[1], KH - 300, KH + 600), 'lines', 300, 0, {part: 'canopy fascia stripe'}, C.yellow);
    line('structure', C.struct, [P(kx0, ky0 + 6000, 4877), P(kx1, ky0 + 6000, 4877)], {part: 'canopy main beam', checks: [['beam_height', 4877]]});
    const islands = [kx0 + 4000, kx0 + 11000, kx0 + 18000, kx0 + 25000];
    islands.forEach((ix, i) => {
      line('structure', C.curb, rect(ix - 610, ky0 + 2500, ix + 610, ky1 - 2500, 152), {part: 'pump island ' + (i + 1)}, {closed: true});
      line('structure', C.struct, [P(ix, ky0 + 6000, 0), P(ix, ky0 + 6000, 4877)], {part: 'canopy column'});
      for (const py of [ky0 + 3800, ky1 - 3800]) { line('structure', C.int, rect(ix - 400, py - 300, ix + 400, py + 300, 1829), {part: 'dispenser'}, {closed: true}); line('structure', C.int, [P(ix - 400, py - 300, 152), P(ix - 400, py - 300, 1829)], {part: 'dispenser cabinet edge'}); line('structure', C.brick, [P(ix + 400, py, 1200), P(ix + 1200, py, 900), P(ix + 1500, py, 600)], {part: 'nozzle hose'}); }
      for (const lx of [ix - 2000, ix + 2000]) sym('electrical', C.elec, 'light', P(lx, ky0 + 6000, 4877), 0, {part: 'canopy led'});
      line('plumbing', C.plumb, [P(kx1 + 6000, ky0 + 6000 + i * 400, -900), P(ix, ky0 + 6000 + i * 400, -900), P(ix, ky0 + 6000 + i * 400, 0)], {part: 'fuel product line to island ' + (i + 1)});
    });
    // Tanks, vents, price sign
    for (let i = 0; i < 3; i++) { const tx = kx1 + 5000 + i * 3200; line('plumbing', C.plumb, rect(tx, ky0, tx + 2438, ky0 + 9144, -3000), {part: ['regular', 'premium', 'diesel'][i] + ' underground tank'}, {closed: true}); sym('plumbing', C.yellow, 'mark', P(tx + 1219, ky0 + 600, 0), 0, {part: ['regular', 'premium', 'diesel'][i] + ' fill cap'}); }
    line('plumbing', C.plumb, [P(kx1 + 6000, ky0 + 9000, -3000), P(kx1 + 6000, y0 - 600, -900), P(x1 + 600, y0 - 600, -900), P(x1 + 600, y0 + 1000, 0), P(x1 + 600, y0 + 1000, 6200)], {part: 'tank vent riser'});
    sym('structure', C.yellow, 'sign', P(b - 3000, ya + 2400), 0, {text: 'Regular 3.89  Diesel 4.29'});
    // Cars and people at the pumps
    const pumpCars = [[islands[0] - 2400, 'car', C.car], [islands[0] + 2400, 'truck', C.struct], [islands[1] - 2400, 'car', C.car2], [islands[2] + 2400, 'car', C.veg], [islands[3] - 2400, 'truck', C.yellow]];
    pumpCars.forEach(([x, t, col]) => sym('vehicle', col, t, P(x, ky0 + 6000), 0, {part: 'fueling'}));
    // Farm truck towing a compact tractor on a trailer
    const tx = islands[3] - 2400, ty = ky0 + 6000 - 9500;
    line('vehicle', C.struct, rect(tx - 1219, ty - 3048, tx + 1219, ty + 3048, 600), {part: 'equipment trailer deck'}, {closed: true});
    hatch('vehicle', C.struct, rect(tx - 1219, ty - 3048, tx + 1219, ty + 3048, 600), 'lines', 300, 90, {part: 'trailer deck boards'});
    line('vehicle', C.yellow, rect(tx - 600, ty - 1300, tx + 600, ty + 900, 1500), {part: 'compact tractor hood and seat'}, {closed: true});
    for (const [wx, wy, r] of [[-750, -900, 550], [750, -900, 550], [-650, 800, 380], [650, 800, 380]]) line('vehicle', C.int, arc(0, 0, r, 0, 360, 10, 0).map(p => P(tx + wx, ty + wy + p[1], 600 + r + p[0])), {part: 'tractor tire'}, {closed: true});
    line('vehicle', C.yellow, [P(tx, ty + 900, 1500), P(tx, ty + 900, 2600), P(tx - 500, ty + 900, 2600), P(tx + 500, ty + 900, 2600)], {part: 'tractor rops bar'});
    line('vehicle', C.yellow, [P(tx - 700, ty + 1300, 1100), P(tx - 700, ty + 2300, 900), P(tx + 700, ty + 2300, 900), P(tx + 700, ty + 1300, 1100)], {part: 'front loader bucket'});
    const acts = [
      [islands[0] - 1200, ky0 + 7400, 'standing', 'pumping regular into a dusty sedan'],
      [islands[0] + 1200, ky0 + 4600, 'standing', 'squeegeeing a bug covered windshield'],
      [islands[1] - 1200, ky0 + 7600, 'standing', 'paying at the pump with a card'],
      [islands[2] + 1200, ky0 + 7400, 'standing', 'checking the oil at pump six'],
      [islands[3] - 1200, ky0 + 7400, 'standing', 'filling diesel cans for the ranch'],
      [tx + 1700, ty - 1500, 'standing', 'strapping down a compact tractor'],
      [tx + 1700, ty + 1700, 'standing', 'checking the trailer lights'],
      [ex + 457, y0 - 800, 'walking', 'carrying out a bag of ice'],
      [x1 - 6800, y0 + 3000, 'standing', 'ringing up gas and beef jerky'],
      [x1 - 6800, y0 + 1200, 'standing', 'buying lottery scratchers and gum'],
      [x0 + 1800, y0 + 6000, 'standing', 'stocking the energy drink cooler'],
      [x1 - 1900, y0 + 2600, 'standing', 'choosing a burrito from the warmer'],
      [x1 - 1900, y0 + 5900, 'standing', 'pouring a fountain soda'],
      [x0 + 5800, y0 + 7000, 'standing', 'reading hot sauce labels'],
      [x1 - 4800, y1 - 3200, 'walking', 'mopping outside the restrooms'],
      [x0 - 1500, y0 + 3000, 'standing', 'stretching after six hours of driving'],
      [b - 5000, ya + 9000, 'standing', 'filling a propane tank for the grill'],
      [a + 6000, ya + 12000, 'standing', 'airing up a trailer tire']
    ];
    for (const [x, y, pose, act] of acts) person(P(x, y), 0, pose, act);
    line('structure', C.int, rect(b - 4500, ya + 7800, b - 3000, ya + 10200, 1829), {part: 'propane exchange cage'}, {closed: true});
    line('structure', C.car2, rect(ex - 2400, y0 - 1200, ex - 600, y0 - 400, 1300), {part: 'ice merchandiser'}, {closed: true});
    line('structure', C.yellow, [P(a + 7000, ya + 12000, 0), P(a + 7000, ya + 12000, 1500)], {part: 'air and water machine'});
    // Parking, walk, driveways
    let sx = x0;
    const s0 = y0 - 1658 - 5486, s1 = y0 - 1658;
    hatch('paving', C.curb, rect(x0, s1, x1, y0), 'lines', 1219, 90, {part: 'concrete walk'});
    line('paving', C.car2, rect(sx, s0, sx + 3658, s1), {part: 'accessible stall', checks: [['stall_width', 3658], ['stall_depth', 5486]]}, {closed: true});
    sx += 3658;
    hatch('paving', C.car2, rect(sx, s0, sx + 2438, s1), 'lines', 450, 45, {part: 'access aisle'});
    sx += 2438;
    for (let i = 0; i < 4; i++) { line('paving', C.white, [P(sx, s0), P(sx, s1), P(sx + 2743, s1), P(sx + 2743, s0)], {part: 'stall', checks: [['stall_width', 2743], ['stall_depth', 5486]]}); sx += 2743; }
    sym('vehicle', C.car, 'car', P(x0 + 6096 + 1371, s0 + 2743), 0);
    sym('vehicle', C.int, 'car', P(x0 + 6096 + 2743 * 2 + 1371, s0 + 2743), 0);
    hatch('paving', C.curb, rect(a + 1000, ya + 1500, b - 1000, ky0 - 1000), 'dots', 1000, 0, {part: 'asphalt forecourt'}, C.struct);
    for (const dxw of [a + 4000, b - 9000]) line('paving', C.curb, [P(dxw, PL), P(dxw + 600, CURB + 600), P(dxw + 900, CURB), P(dxw + 6900, CURB), P(dxw + 7200, CURB + 600), P(dxw + 7800, PL)], {part: 'driveway apron on Arroyo Street'});
    // Car wash with spinning brushes and a car looping through it
    const WN = 'Horned Toad Car Wash';
    const wx0 = a + 3000, wx1 = wx0 + 4877, wy0 = ya + 36000, wy1 = wy0 + 12192;
    wall(WN, [[wx0, wy0], [wx0, wy1]], 4267, -610, false);
    wall(WN, [[wx1, wy0], [wx1, wy1]], 4267, -610, false);
    hatch('structure', C.car2, rect(wx0, wy0, wx1, wy1, 4267), 'lines', 400, 0, {building: WN, part: 'translucent roof panels'}, C.street);
    line('structure', C.struct, [P(wx0, wy0, 3658), P(wx1, wy0, 3658)], {building: WN, part: 'exit header', checks: [['beam_height', 3658]]});
    line('structure', C.struct, [P(wx0, wy1, 3658), P(wx1, wy1, 3658)], {building: WN, part: 'entry header', checks: [['beam_height', 3658]]});
    for (const [bx, by] of [[wx0 + 900, wy0 + 4000], [wx1 - 900, wy0 + 4000], [wx0 + 900, wy0 + 8000], [wx1 - 900, wy0 + 8000]]) line('interior', C.car2, arc(bx, by, 500, 0, 360, 10, 1200), {building: WN, part: 'spinning wrap brush', anim: {type: 'spin', rpm: 90, pivot: P(bx, by, 0)}}, {closed: true});
    line('interior', C.street, [P(wx0 + 300, wy0 + 10500, 3200), P(wx1 - 300, wy0 + 10500, 3200)], {building: WN, part: 'spray arch', anim: {type: 'blink', period: 0.4, duty: 0.5}});
    line('interior', C.int, [P(wx0 + 300, wy0 + 1500, 3000), P(wx1 - 300, wy0 + 1500, 3000)], {building: WN, part: 'blower bar', anim: {type: 'bob', mm: 400, period: 3}});
    sym('electrical', C.elec, 'outlet', P(wx0 + 150, wy0 + 6000, 1219), 0, {checks: [['outlet_height', 1219]], part: 'gfci outlet'});
    sym('structure', C.sign, 'sign', P(wx1 + 1500, wy1 + 1500), 0, {text: WN});
    const wc = (wx0 + wx1) / 2;
    sym('vehicle', C.car2, 'car', P(wc, wy1 + 2000), Math.PI, {part: 'car going through the wash', anim: {type: 'path', speed: 900, pts: [P(wc, wy1 + 3000), P(wc, wy0 - 3000), P(wx1 + 4500, wy0 - 3000), P(wx1 + 4500, wy1 + 3000), P(wc, wy1 + 3000)]}});
    person(P(wx1 + 2500, wy0 - 2000), 0, 'standing', 'drying a pickup with a chamois');
    person(P(wx1 + 2500, wy1 + 3500), 0, 'standing', 'feeding quarters into the wash kiosk');
    for (let i = 0; i < 6; i++) line('vegetation', C.veg2, blob(a + 2000 + i * 10000, yb - 2500, 1400, 10, i + 7), {part: ['ocotillo bed', 'agave bed', 'yucca bed'][i % 3]}, {closed: true});
    for (let i = 0; i < 5; i++) sym('vegetation', C.veg, 'tree', P(a + 6000 + i * 12000, yb - 5500), 0, {anim: {type: 'sway', deg: 3, period: 4.5 + i * 0.3}});
  }

  // ---------- Right-hand traffic circling every block: clockwise on the inside lanes, counterclockwise on the outside lanes
  const loopPath = (x0, y0, x1, y1, cw) => {
    const r = 2500, pts = [];
    const corner = (cx, cy, a0, a1) => { for (let i = 0; i <= 3; i++) { const a = (a0 + (a1 - a0) * i / 3) * Math.PI / 180; pts.push(P(cx + Math.cos(a) * r, cy + Math.sin(a) * r)); } };
    if (cw) { corner(x0 + r, y1 - r, 180, 90); corner(x1 - r, y1 - r, 90, 0); corner(x1 - r, y0 + r, 0, -90); corner(x0 + r, y0 + r, -90, -180); }
    else { corner(x1 - r, y0 + r, -90, 0); corner(x1 - r, y1 - r, 0, 90); corner(x0 + r, y1 - r, 90, 180); corner(x0 + r, y0 + r, 180, 270); }
    pts.push(pts[0]);
    return pts;
  };
  const blocks = [[0, 0], [1, 0], [2, 0], [3, 0], [0, 1], [1, 1], [2, 1], [0, 2], [1, 2]];
  const colors = [C.car, C.car2, C.struct, C.yellow, C.veg, C.int, C.brick, C.car, C.car2];
  blocks.forEach(([bx, by], i) => {
    const ox = bx * S, oy = by * S;
    const inner = loopPath(ox + 1700, oy + 1700, ox + S - 1700, oy + S - 1700, true);
    sym('vehicle', colors[i], i % 3 === 2 ? 'truck' : 'car', inner[0], 0, {part: 'local traffic, clockwise around the block', anim: {type: 'path', speed: 8000 + (i % 4) * 1200, pts: inner}});
    if ([0, 3, 6, 8].includes(i)) {
      const outer = loopPath(ox - 1700, oy - 1700, ox + S + 1700, oy + S + 1700, false);
      sym('vehicle', colors[(i + 3) % 9], 'car', outer[0], 0, {part: 'through traffic, counterclockwise around the block', anim: {type: 'path', speed: 10500, pts: outer}});
    }
  });
}
