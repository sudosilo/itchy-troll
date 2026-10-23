// Agent Orange turn three: a school and a fire station north of the park, deeper interiors, and desert landscaping everywhere.
export default function (k) {
  const {S, P, push, line, sym, hatch, rect, arc, vface, wall, run, person, tree, door, streetsForChunk, lot, OWN, HSTREET, C, CURB, PL} = k;
  const wavy = (x0, y0, x1, y1, amp, n, seed, z = 0) => { const o = []; for (let i = 0; i <= n; i++) { const t = i / n; const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1; const w = Math.sin(t * Math.PI * 2.3 + seed) * amp + Math.sin(t * 9 + seed * 2) * amp * 0.25; o.push(P(x0 + dx * t - dy / L * w, y0 + dy * t + dx / L * w, z)); } return o; };
  const blob = (cx, cy, r, n, seed, z = 0) => { const o = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; const rr = r * (1 + 0.18 * Math.sin(a * 3 + seed) + 0.08 * Math.sin(a * 5 + seed * 2)); o.push(P(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, z)); } return o; };
  const kid = (x, y, act, pose = 'standing', anim) => person(P(x, y), 0, pose, act, anim);

  // The bmx rider becomes a cyclist, per the updated rules
  push('remove', {id: 485});
  const loopPts = []; for (let k2 = 0; k2 < 48; k2 += 2) { const t = k2 / 48 * Math.PI * 2; loopPts.push(P(S / 2 + Math.cos(t) * 26000 + Math.cos(t * 3) * 1500, S + S / 2 + Math.sin(t) * 26000 + Math.sin(t * 2) * 1500)); }
  const lp = loopPts.slice(10).concat(loopPts.slice(0, 10));
  sym('activity', C.car2, 'cyclist', lp[0], 0, {activity: 'kid riding laps on a bmx', anim: {type: 'path', speed: 4000, pts: lp}});

  // ---------- Claim two blocks north of the park and the feed yard
  push('claim_chunk', {chunk: [0, 2]});
  push('claim_chunk', {chunk: [1, 2]});
  for (const c of [[0, 2], [1, 2]]) for (const edge of ['n', 's', 'e', 'w']) push('declare_port', {chunk: c, edge, value: CURB});
  HSTREET.push('Agave Street');
  const keep = [...OWN]; OWN.clear(); OWN.add('0:2'); OWN.add('1:2');
  streetsForChunk(0, 2); streetsForChunk(1, 2);
  OWN.clear(); for (const x of keep) OWN.add(x); OWN.add('0:2'); OWN.add('1:2');

  // ---------- 0,2 Desert Willow Elementary
  {
    const oy = 2 * S, a = PL, b = S - PL, ya = oy + PL, yb = oy + S - PL;
    lot('civic', a, ya, b, yb, 'school parcel');
    const NAME = 'Desert Willow Elementary';
    const cw = 9144, n = 5, x0 = a + 6000, y0 = oy + 40000, x1 = x0 + cw * n, y1 = y0 + 9144, H = 4267;
    wall(NAME, [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], H, -914, true);
    for (let i = 1; i < n; i++) wall(NAME, [[x0 + i * cw, y0], [x0 + i * cw, y1]], 3048, 0, false, C.int);
    hatch('structure', C.brick, vface(x0, y0, x1, y0, 0, H), 'brick', 300, 0, {building: NAME, part: 'tan block with a darker base'}, C.struct);
    hatch('structure', C.roof, rect(x0 - 2438, y0 - 3048, x1, y1, H), 'gradient', 500, 90, {building: NAME, part: 'roof with covered walkway'}, C.brick);
    line('structure', C.struct, [P(x0 - 2438, y0 - 3048, 3048), P(x1, y0 - 3048, 3048)], {building: NAME, part: 'walkway beam', checks: [['beam_height', 3048]]});
    const rooms = ['kindergarten', 'first grade', 'second grade', 'library corner', 'office and nurse'];
    for (let i = 0; i < n; i++) {
      const rx = x0 + i * cw;
      door(NAME, rx + 600, y0, 'x', 914, rooms[i] + ' door', -1);
      hatch('structure', C.car2, vface(rx + 2400, y0, rx + cw - 1200, y0, 900, 2286), 'lines', 500, 90, {building: NAME, part: rooms[i] + ' windows'});
      line('interior', C.int, [P(rx + 1500, y1 - 150, 900), P(rx + cw - 1500, y1 - 150, 900), P(rx + cw - 1500, y1 - 150, 2134), P(rx + 1500, y1 - 150, 2134)], {building: NAME, part: rooms[i] + ' whiteboard'}, {closed: true});
      line('interior', C.brick, rect(rx + cw - 2800, y1 - 2600, rx + cw - 900, y1 - 1800, 762), {building: NAME, part: 'teacher desk'}, {closed: true});
      if (i < 3) for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) line('interior', C.int, rect(rx + 1200 + c * 1700, y0 + 1800 + r * 1700, rx + 2200 + c * 1700, y0 + 2400 + r * 1700, 610), {building: NAME, part: 'student desk'}, {closed: true});
      if (i === 3) for (let s = 0; s < 4; s++) line('interior', C.int, rect(rx + 800 + s * 2000, y0 + 3000, rx + 1400 + s * 2000, y0 + 6000, 1219), {building: NAME, part: 'picture book shelf', checks: [['shelf_height', 1219]]}, {closed: true});
      if (i === 4) { line('interior', C.brick, [P(rx + 800, y0 + 2500, 1067), P(rx + 5000, y0 + 2500, 1067)], {building: NAME, part: 'front office counter', checks: [['counter_height', 1067]]}); line('interior', C.int, rect(rx + 6000, y0 + 4500, rx + 8400, y0 + 5400, 610), {building: NAME, part: 'nurse cot'}, {closed: true}); }
      for (const dx of [2286, 6858]) for (const dy of [2286, 6858]) sym('electrical', C.elec, 'light', P(rx + dx, y0 + dy, 2743), 0);
      sym('electrical', C.elec, 'outlet', P(rx + 150, y0 + 3000, 457), 0, {checks: [['outlet_height', 457]]});
      sym('electrical', C.elec, 'outlet', P(rx + cw - 150, y0 + 6000, 457), 0, {checks: [['outlet_height', 457]]});
      sym('electrical', C.elec, 'switch', P(rx + 1650, y0 + 150, 1219), 0);
      line('structure', C.int, rect(rx + 150, y0 + 150, rx + cw - 150, y1 - 150, 2743), {building: NAME, part: rooms[i] + ' ceiling', checks: [['ceiling_height', 2743]]}, {closed: true});
    }
    sym('structure', C.sign, 'sign', P(x0 + 2000, y0 - 6000), 0, {text: NAME});
    sym('structure', C.brick, 'pole', P(x0 + 6000, y0 - 6000), 0, {part: 'flagpole'});
    line('structure', C.brick, [P(x0 + 6000, y0 - 6000, 8500), P(x0 + 7400, y0 - 6000, 8300), P(x0 + 7400, y0 - 6000, 7600), P(x0 + 6000, y0 - 6000, 7800)], {part: 'flag', anim: {type: 'sway', deg: 18, period: 1.6, pivot: P(x0 + 6000, y0 - 6000, 8000)}}, {closed: true});
    // Services from Cholla Street
    sym('electrical', C.struct, 'pole', P(CURB + 900, y0 + 2000), 0);
    run('electrical', C.elec, [P(CURB + 900, y0 + 2000, 8230), P(x0 - 200, y0 + 2000, 3900), P(x0 - 200, y0 + 2000, 1676)], {building: NAME, part: 'service drop'});
    run('electrical', C.elec, [P(x0 - 200, y0 + 2000, 1676), P(x0 + 600, y0 + 2000, 2900), P(x1 - 600, y0 + 2000, 2900)], {building: NAME, part: 'feeder along the corridor'});
    run('plumbing', C.plumb, [P(x1 - 3000, oy + 1200, -1067), P(x1 - 3000, y0 + 7000, -1067), P(x1 - 3000, y0 + 7000, 864)], {building: NAME, part: 'water service'});
    run('plumbing', C.sewer, [P(x1 - 2400, y0 + 7000, -600), P(x1 - 2400, oy + 2400, -1829)], {building: NAME, part: 'sewer lateral'});
    // Drop off loop, buses, crossing guard
    const loop = [P(a + 2000, ya), ...arc(a + 14000, ya + 14000, 11000, 200, 340, 12).map(p => P(p[0], p[1])), P(b - 2000, ya)];
    line('paving', C.curb, loop, {part: 'drop off loop', checks: [['lane_width', 3658]]}, {color2: C.yellow});
    for (let i = 0; i < 2; i++) sym('vehicle', C.yellow, 'truck', P(a + 22000 + i * 11000, ya + 5000), Math.PI / 2, {part: 'school bus'});
    sym('vehicle', C.car2, 'car', loop[3], 0, {part: 'parent drop off', anim: {type: 'path', speed: 3000, pts: loop}});
    kid(a + 3000, oy + 2500, 'holding a stop sign at the crosswalk');
    sym('street', C.brick, 'sign', P(a + 3600, oy + 2500), 0, {text: 'School Zone 15 mph'});
    // Playground and field behind the school
    line('paving', C.curb, blob(a + 16000, yb - 12000, 9000, 30, 1.7), {part: 'rubber play surface'}, {closed: true});
    hatch('paving', C.brick, rect(a + 10000, yb - 17000, a + 22000, yb - 7000), 'dots', 600, 0, {part: 'poured rubber'}, C.struct);
    line('activity', C.car2, arc(a + 16000, yb - 12000, 1500, 0, 360, 10, 400), {part: 'tire swing', anim: {type: 'spin', rpm: 15}});
    line('activity', C.yellow, [P(a + 12000, yb - 9000, 2400), P(a + 14000, yb - 9000, 0)], {part: 'slide'});
    line('lot', C.white, rect(a + 30000, yb - 22000, b - 3000, yb - 3000), {part: 'kickball field'}, {closed: true});
    const acts = [
      ['pumping higher on the swings', 'sitting', {type: 'sway', deg: 20, period: 2.6, pivot: P(a + 20000, yb - 10000, 2400)}, a + 20000, yb - 10000],
      ['waiting in line for the slide', 'standing', null, a + 12000, yb - 9800],
      ['sliding down the twisty slide', 'sitting', null, a + 13000, yb - 9000],
      ['kicking a red ball over second base', 'walking', {type: 'path', speed: 2500, pts: [P(a + 34000, yb - 18000), P(a + 42000, yb - 12000)]}, a + 34000, yb - 18000],
      ['pitching a bouncy kickball', 'standing', null, a + 40000, yb - 14000],
      ['cheering from the fence', 'standing', null, a + 31000, yb - 4000],
      ['blowing the recess whistle', 'standing', null, a + 26000, yb - 15000],
      ['reading aloud to the first graders', 'sitting', null, x0 + cw + 4500, y1 - 2400],
      ['raising a hand with an answer', 'sitting', null, x0 + cw + 3000, y0 + 3000],
      ['counting blocks on the rug', 'sitting', null, x0 + 4000, y0 + 4000],
      ['checking out a dinosaur book', 'standing', null, x0 + 3 * cw + 4000, y0 + 2000],
      ['answering the office phone', 'sitting', null, x0 + 4 * cw + 2000, y0 + 3200],
      ['getting an ice pack from the nurse', 'sitting', null, x0 + 4 * cw + 7000, y0 + 5000],
      ['climbing off the school bus', 'walking', null, a + 22000, ya + 7500],
      ['hugging a parent at drop off', 'standing', null, a + 28000, ya + 9000]
    ];
    for (const [t, pose, anim, x, y] of acts) kid(x, y, t, pose, anim || undefined);
    for (let i = 0; i < 8; i++) tree(a + 2500 + i * 7600, yb - 1500, 4, 4 + i * 0.4);
    for (let i = 0; i < 6; i++) line('vegetation', C.veg2, blob(x0 + 3000 + i * 8000, y0 - 9000, 1500 + i * 150, 12, i * 1.3), {part: 'desert marigold bed'}, {closed: true});
  }

  // ---------- 1,2 Fire Station Two
  {
    const ox = S, oy = 2 * S, a = ox + PL, b = ox + S - PL, ya = oy + PL, yb = oy + S - PL;
    lot('civic', a, ya, b, yb, 'fire station parcel');
    const NAME = 'Cholla Street Fire Station Two';
    const x0 = a + 12000, x1 = x0 + 18288, y0 = ya + 14000, y1 = y0 + 21336, H = 6096;
    wall(NAME, [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], H, -1219, true);
    wall(NAME, [[x0, y0 + 12192], [x1, y0 + 12192]], 3658, 0, false, C.int);
    wall(NAME, [[x0 + 9144, y0 + 12192], [x0 + 9144, y1]], 3048, 0, false, C.int);
    hatch('structure', C.brick, vface(x0, y0, x1, y0, 0, H), 'brick', 300, 0, {building: NAME, part: 'red brick front'}, C.struct);
    hatch('structure', C.brick, vface(x0, y0, x0, y1, 0, H), 'brick', 300, 0, {building: NAME, part: 'red brick side'}, C.struct);
    hatch('structure', C.roof, rect(x0, y0, x1, y1, H), 'gradient', 500, 90, {building: NAME, part: 'roof'}, C.brick);
    for (let i = 0; i < 2; i++) {
      const bx = x0 + 2000 + i * 7600;
      line('structure', C.brick, [P(bx, y0), P(bx, y0, 4267), P(bx + 4267, y0, 4267), P(bx + 4267, y0)], {building: NAME, part: 'apparatus bay door ' + (i + 1)});
      hatch('structure', C.car2, vface(bx, y0 - 20, bx + 4267, y0 - 20, 2500, 4200), 'lines', 300, 0, {building: NAME, part: 'bay door glass panels'});
      sym('vehicle', C.brick, 'truck', P(bx + 2133, y0 + 6000), 0, {part: i ? 'brush truck' : 'engine two'});
      line('structure', C.yellow, [P(bx + 2133, y0 - 9000), P(bx + 2133, y0)], {building: NAME, part: 'apron stripe'});
      sym('electrical', C.elec, 'light', P(bx + 2133, y0 + 6000, 5486), 0, {part: 'bay high bay'});
    }
    line('structure', C.struct, [P(x0, y0 + 6096, 5486), P(x1, y0 + 6096, 5486)], {building: NAME, part: 'bay girder', checks: [['beam_height', 5486]]});
    door(NAME, x1 - 2400, y0, 'x', 914, 'front office door', -1);
    door(NAME, x0 + 3000, y0 + 12192, 'x', 914, 'day room door', 1);
    door(NAME, x0 + 9144, y0 + 15000, 'y', 914, 'bunk room door', 1);
    door(NAME, x1 - 2000, y0 + 12192, 'x', 914, 'kitchen door', 1);
    line('structure', C.int, rect(x0 + 150, y0 + 12342, x1 - 150, y1 - 150, 2743), {building: NAME, part: 'quarters ceiling', checks: [['ceiling_height', 2743]]}, {closed: true});
    line('interior', C.brick, [P(x1 - 6000, y1 - 700, 914), P(x1 - 700, y1 - 700, 914), P(x1 - 700, y1 - 4000, 914)], {building: NAME, part: 'kitchen counter', checks: [['counter_height', 914]]});
    line('interior', C.int, rect(x1 - 6500, y0 + 15000, x1 - 2500, y0 + 16800, 762), {building: NAME, part: 'long kitchen table'}, {closed: true});
    for (let i = 0; i < 4; i++) line('interior', C.int, rect(x0 + 900 + (i % 2) * 4200, y0 + 13200 + Math.floor(i / 2) * 4200, x0 + 1900 + (i % 2) * 4200, y0 + 15200 + Math.floor(i / 2) * 4200, 610), {building: NAME, part: 'bunk ' + (i + 1)}, {closed: true});
    for (let i = 0; i < 6; i++) line('interior', C.int, [P(x1 - 400, y0 + 1500 + i * 900, 0), P(x1 - 400, y0 + 1500 + i * 900, 1829)], {building: NAME, part: 'turnout gear locker ' + (i + 1), checks: [['shelf_height', 1829]]});
    sym('interior', C.int, 'mark', P(x0 + 4000, y0 + 17000, 2743), 0, {part: 'day room ceiling fan', anim: {type: 'spin', rpm: 50}});
    sym('interior', C.brick, 'light', P(x1 - 1500, y0 + 11000, 3500), 0, {part: 'alert light', anim: {type: 'blink', period: 0.5, duty: 0.5}});
    for (const [x, y] of [[x0 + 150, y0 + 14000], [x0 + 150, y0 + 18000], [x1 - 150, y0 + 14000], [x0 + 9300, y0 + 17000]]) sym('electrical', C.elec, 'outlet', P(x, y, 457), 0, {checks: [['outlet_height', 457]]});
    for (const [x, y] of [[x1 - 3000, y1 - 150], [x1 - 5000, y1 - 150]]) sym('electrical', C.elec, 'outlet', P(x, y, 1067), 0, {checks: [['outlet_height', 1067]], part: 'kitchen counter outlet'});
    sym('electrical', C.struct, 'pole', P(a - PL + CURB + 900, y0 + 2000), 0);
    run('electrical', C.elec, [P(a - PL + CURB + 900, y0 + 2000, 8230), P(x0 - 200, y0 + 2000, 5200), P(x0 - 200, y0 + 2000, 1676)], {building: NAME, part: 'service drop'});
    run('electrical', C.elec, [P(x0 - 200, y0 + 2000, 1676), P(x0 + 800, y0 + 2000, 1676), P(x0 + 800, y1 - 1000, 3200)], {building: NAME, part: 'feeder to quarters panel'});
    sym('electrical', C.struct, 'mark', P(x0 - 3000, y1 - 2000), 0, {part: 'standby generator pad'});
    run('plumbing', C.plumb, [P(x1 - 3500, oy + 1200, -1067), P(x1 - 3500, y1 - 2500, -1067), P(x1 - 3500, y1 - 2500, 914)], {building: NAME, part: 'water service'});
    run('plumbing', C.sewer, [P(x1 - 4200, y1 - 2500, -600), P(x1 - 4200, oy + 2400, -1829)], {building: NAME, part: 'sewer lateral'});
    sym('street', C.brick, 'hydrant', P(x0 - 2000, ya - 1500), 0);
    hatch('paving', C.curb, rect(x0, ya - 2000, x1, y0), 'lines', 1219, 90, {part: 'concrete apron'}, C.struct);
    sym('structure', C.sign, 'sign', P(x1 + 2000, y0 - 3000), 0, {text: NAME});
    // Hose tower and training ground
    const tx = x1 + 6000, ty = y1 - 4000;
    line('structure', C.struct, rect(tx, ty, tx + 3048, ty + 3048, 12192), {part: 'hose drying tower top'}, {closed: true});
    for (const [dx, dy] of [[0, 0], [3048, 0], [3048, 3048], [0, 3048]]) line('structure', C.struct, [P(tx + dx, ty + dy, 0), P(tx + dx, ty + dy, 12192)], {part: 'tower corner'});
    line('activity', C.brick, [P(tx + 1500, ty + 1500, 11000), P(tx + 1500, ty + 1500, 1500)], {part: 'hose hung to dry', anim: {type: 'sway', deg: 3, period: 5, pivot: P(tx + 1500, ty + 1500, 11000)}});
    line('activity', C.car2, wavy(x0 + 2000, y0 - 2000, x0 - 6000, y0 - 14000, 1500, 18, 2), {part: 'charged hose line on the apron'});
    const acts = [
      [x0 + 3000, y0 - 3000, 'standing', 'washing engine two on the apron'],
      [x0 + 4800, y0 - 3500, 'standing', 'checking air pressure in the tires'],
      [x0 - 6000, y0 - 14000, 'standing', 'spraying a fog pattern in drill'],
      [x0 - 5000, y0 - 13000, 'standing', 'backing up the nozzle firefighter'],
      [x1 - 4500, y0 + 15900, 'sitting', 'eating chili at the long table'],
      [x1 - 3000, y0 + 15900, 'sitting', 'telling a story over dinner'],
      [x1 - 3000, y1 - 1200, 'standing', 'stirring a pot of green chile stew'],
      [x0 + 1400, y0 + 14200, 'sitting', 'catching a nap between calls'],
      [x0 + 5000, y0 + 18500, 'sitting', 'watching the ballgame in the day room'],
      [tx + 1500, ty - 1200, 'standing', 'hoisting hose up the tower'],
      [x1 + 1500, y0 - 1500, 'standing', 'giving a station tour to scouts'],
      [x1 + 2500, y0 - 2500, 'standing', 'trying on a firefighter helmet'],
      [x1 + 3300, y0 - 2200, 'standing', 'asking about the pole']
    ];
    for (const [x, y, pose, act] of acts) person(P(x, y), 0, pose, act);
    sym('activity', C.brick, 'dog', P(x0 + 6500, y0 - 2500), 0, {activity: 'station dalmatian supervising the wash'});
    for (let i = 0; i < 7; i++) line('vegetation', C.veg2, blob(a + 3000 + (i % 4) * 14000, ya + 3000 + Math.floor(i / 4) * 52000, 1300 + i * 90, 12, i), {part: 'red yucca cluster'}, {closed: true});
    for (let i = 0; i < 6; i++) tree(a + 2000 + i * 11000, yb - 1500, 4, 5 + i * 0.3);
  }

  // ---------- Deeper interiors and landscaping on the first blocks
  // Market: product shelves on each gondola face, endcaps, coffee bar
  const mx0 = 13716, my0 = 25908;
  for (let i = 0; i < 5; i++) for (let lvl = 0; lvl < 4; lvl++) { const gx = mx0 + 3800 + i * 2300, z = 300 + lvl * 400; line('interior', [C.brick, C.veg, C.car2, C.yellow][lvl], [P(gx - 50, my0 + 4100, z), P(gx - 50, my0 + 9400, z)], {building: 'Two Coyote Corner Market', part: ['canned beans', 'tortilla chips', 'motor oil', 'candy'][lvl] + ' shelf, aisle ' + (i + 1)}); }
  line('interior', C.brick, rect(mx0 + 1300, my0 + 10500, mx0 + 4500, my0 + 11300, 965), {building: 'Two Coyote Corner Market', part: 'coffee and roller grill counter', checks: [['counter_height', 965]]}, {closed: true});
  for (let i = 0; i < 4; i++) line('interior', C.int, arc(mx0 + 1800 + i * 800, my0 + 10900, 180, 0, 360, 8, 1100), {building: 'Two Coyote Corner Market', part: 'coffee urn ' + (i + 1)}, {closed: true});
  person(P(mx0 + 2900, my0 + 10000), 0, 'standing', 'filling a thermos with dark roast');
  person(P(mx0 + 8000, my0 + 7000), 0, 'standing', 'comparing salsa jars');
  // Diner booths get table settings, feed store gets bagged feed
  for (let i = 0; i < 4; i++) line('interior', C.int, rect(S + 9144 + 6096 + 900 + i * 2100, 18288 + 1100, S + 9144 + 6096 + 1700 + i * 2100, 18288 + 1900, 762), {building: 'Little Chuckwalla Diner', part: 'booth table ' + (i + 1)}, {closed: true});
  for (let i = 0; i < 12; i++) line('interior', C.brick, rect(S + 9144 + 4000 + 15500 + (i % 4) * 2100, S + 9144 + 9000 + 1000 + Math.floor(i / 4) * 1600, S + 9144 + 4000 + 16600 + (i % 4) * 2100, S + 9144 + 9000 + 2000 + Math.floor(i / 4) * 1600, 1500), {building: 'Hard Pan Feed and Tractor', part: 'feed bag stack ' + (i + 1)}, {closed: true});
  // Organic landscaping on every block
  const beds = [
    [0, 0, 6], [S, 0, 8], [0, S, 10], [S, S, 10], [2 * S, 0, 10]
  ];
  for (const [ox, oy, n] of beds) for (let i = 0; i < n; i++) {
    const cx = ox + PL + 2500 + ((i * 7919) % 54000), cy = oy + PL + 2500 + ((i * 3571 + ox / 100) % 54000);
    line('vegetation', C.veg2, wavy(cx, cy, cx + 6000, cy + 2500, 900, 10, i + ox / S), {part: ['gravel swale', 'agave row', 'sage border', 'cholla line', 'aloe edge'][i % 5]});
  }
  // More life on the yard, motor court and diner blocks
  const more = [
    [S + 20000, S + 30000, 'sitting', 'reading the feed store bulletin board'],
    [S + 25000, S + 30000, 'standing', 'loading fencing wire into a truck'],
    [S + 60000, S + 40000, 'standing', 'test driving a used tractor'],
    [S + 15000, S + 65000, 'standing', 'checking a horse trailer hitch'],
    [S + 35000, S + 66000, 'walking', 'herding loose chicks back in a crate'],
    [2 * S + 20000, 60000, 'standing', 'buying ice from the motel machine'],
    [2 * S + 45000, 62000, 'sitting', 'stargazing on the motel bench'],
    [2 * S + 60000, 20000, 'standing', 'washing bugs off a windshield'],
    [S + 50000, 30000, 'standing', 'taking a drive thru order on a headset'],
    [S + 66000, 8000, 'walking', 'walking a grease barrel to the bin']
  ];
  for (const [x, y, pose, act] of more) person(P(x, y), 0, pose, act);
}
