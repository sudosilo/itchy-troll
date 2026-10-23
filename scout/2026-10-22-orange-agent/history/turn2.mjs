// Agent Orange turn two: a motor court on a new block east, a link to the neighbor's reading room, and life on every block.
export default function (k) {
  const {S, P, push, line, sym, hatch, rect, arc, rounded, vface, wall, run, person, tree, door, streetsForChunk, lot, OWN, VSTREET, C, CURB, PL} = k;
  const wavy = (x0, y0, x1, y1, amp, n, seed, z = 0) => { const o = []; for (let i = 0; i <= n; i++) { const t = i / n; const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1; const w = Math.sin(t * Math.PI * 2.3 + seed) * amp + Math.sin(t * 9 + seed * 2) * amp * 0.25; o.push(P(x0 + dx * t - dy / L * w, y0 + dy * t + dx / L * w, z)); } return o; };
  const blob = (cx, cy, r, n, seed, z = 0) => { const o = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; const rr = r * (1 + 0.18 * Math.sin(a * 3 + seed) + 0.08 * Math.sin(a * 5 + seed * 2)); o.push(P(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, z)); } return o; };

  // ---------- New block 2,0 east of the diner
  push('claim_chunk', {chunk: [2, 0]});
  for (const edge of ['n', 's', 'e', 'w']) push('declare_port', {chunk: [2, 0], edge, value: CURB});
  VSTREET.push('Yucca Avenue');
  const keep = [...OWN]; OWN.clear(); OWN.add('2:0');
  streetsForChunk(2, 0);
  OWN.clear(); for (const x of keep) OWN.add(x); OWN.add('2:0');

  {
    const ox = 2 * S, a = ox + PL, b = ox + S - PL, ya = PL, yb = S - PL;
    lot('commercial', a, ya, b, yb, 'motor court parcel');
    const NAME = 'Pump Jack Motor Court';
    // Rooms in an L: south wing along Arroyo Street side set back, east wing up the block
    const rw = 3658, rd = 7315, n = 10, x0 = a + 9000, y0 = ya + 30000, H = 3353;
    const x1 = x0 + rw * n, y1 = y0 + rd;
    wall(NAME, [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], H, -914, true);
    for (let i = 1; i < n; i++) wall(NAME, [[x0 + i * rw, y0], [x0 + i * rw, y1]], 2743, 0, false, C.int);
    hatch('structure', C.brick, vface(x0, y0, x1, y0, 0, H), 'lines', 250, 0, {building: NAME, part: 'painted stucco band'}, C.struct);
    hatch('structure', C.roof, rect(x0 - 1219, y0 - 1829, x1 + 1219, y1 + 600, H), 'gradient', 450, 90, {building: NAME, part: 'roof with deep walkway overhang'}, C.brick);
    for (let i = 0; i < n; i++) {
      const rx = x0 + i * rw;
      door(NAME, rx + 400, y0, 'x', 914, 'room ' + (101 + i), -1);
      line('interior', C.int, rect(rx + 500, y0 + 2600, rx + 2100, y0 + 4600, 610), {building: NAME, part: 'queen bed room ' + (101 + i)}, {closed: true});
      line('interior', C.int, rect(rx + 300, y1 - 2300, rx + rw - 300, y1 - 300, 864), {building: NAME, part: 'bath vanity room ' + (101 + i), checks: [['counter_height', 864]]}, {closed: true});
      sym('electrical', C.elec, 'light', P(rx + rw / 2, y0 + 3600, 2438), 0);
      sym('electrical', C.elec, 'outlet', P(rx + 150, y0 + 3000, 457), 0, {checks: [['outlet_height', 457]]});
      sym('electrical', C.elec, 'switch', P(rx + 1450, y0 + 150, 1219), 0);
      sym('structure', C.elec, 'light', P(rx + 1800, y0 - 900, 2743), 0, {part: 'walkway porch light', anim: i === 6 ? {type: 'blink', period: 0.7, duty: 0.6} : undefined});
    }
    line('structure', C.struct, [P(x0, y0 - 1829, 2743), P(x1, y0 - 1829, 2743)], {building: NAME, part: 'walkway beam', checks: [['beam_height', 3048]]});
    for (let i = 0; i <= n; i += 2) line('structure', C.struct, [P(x0 + i * rw, y0 - 1829, 0), P(x0 + i * rw, y0 - 1829, 3048)], {building: NAME, part: 'steel post'});
    hatch('structure', C.int, rect(x0 + 150, y0 + 150, x1 - 150, y1 - 150, 2438), 'lines', 1219, 90, {building: NAME, part: 'room ceilings', checks: [['ceiling_height', 2438]]});
    // Office with check in desk
    const ON = 'Pump Jack Office';
    const fx0 = a + 3000, fy0 = ya + 9000, fx1 = fx0 + 7315, fy1 = fy0 + 6096;
    wall(ON, [[fx0, fy0], [fx1, fy0], [fx1, fy1], [fx0, fy1]], 3658, -914, true);
    hatch('structure', C.brick, vface(fx0, fy0, fx1, fy0, 0, 3658), 'brick', 300, 0, {building: ON, part: 'slump block'}, C.struct);
    door(ON, fx0 + 3200, fy0, 'x', 914, 'office door', -1);
    line('interior', C.brick, [P(fx0 + 1200, fy0 + 3000, 1067), P(fx1 - 1200, fy0 + 3000, 1067)], {building: ON, part: 'check in desk', checks: [['counter_height', 1067]]});
    line('interior', C.int, rect(fx0 + 600, fy1 - 900, fx0 + 3000, fy1 - 300, 1829), {building: ON, part: 'key board and brochure rack', checks: [['shelf_height', 1829]]}, {closed: true});
    line('interior', C.int, [P(fx0 + 4500, fy0 + 3000, 1067), P(fx0 + 4500, fy0 + 3000, 1450)], {building: ON, part: 'front desk terminal'});
    sym('electrical', C.elec, 'light', P(fx0 + 3650, fy0 + 3048, 2743), 0);
    sym('electrical', C.elec, 'outlet', P(fx0 + 150, fy0 + 2000, 457), 0, {checks: [['outlet_height', 457]]});
    sym('interior', C.int, 'mark', P(fx0 + 3650, fy0 + 4500, 2743), 0, {part: 'ceiling fan', anim: {type: 'spin', rpm: 60}});
    sym('structure', C.brick, 'sign', P(fx0 - 1500, ya + 3000), 0, {text: NAME, anim: {type: 'bob', mm: 150, period: 3}});
    sym('structure', C.yellow, 'sign', P(fx0 - 1500, ya + 4500), 0, {text: 'VACANCY', anim: {type: 'blink', period: 1.2, duty: 0.55}});
    sym('structure', C.struct, 'mark', P(fx0 - 1500, ya + 6500, 1200), 0, {part: 'pump jack sculpture arm', anim: {type: 'bob', mm: 900, period: 4}});
    // Services
    sym('electrical', C.struct, 'pole', P(a - 1500, fy0 + 1000), 0);
    run('electrical', C.elec, [P(a - 1500, fy0 + 1000, 8230), P(fx0 - 200, fy0 + 1000, 4000), P(fx0 - 200, fy0 + 1000, 1676)], {building: ON, part: 'service drop'});
    run('electrical', C.elec, [P(fx0 - 200, fy0 + 1000, 1676), P(fx0 + 600, fy0 + 1000, 1676), P(fx0 + 600, fy1 - 600, 1676)], {building: ON, part: 'service conduit to panel'});
    run('electrical', C.elec, [P(fx1 - 600, fy1 - 600, -762), P(x0 + 600, y0 + 600, -762), P(x0 + 600, y0 + 600, 2700), P(x1 - 600, y0 + 600, 2700)], {building: NAME, part: 'feeder to room panels'});
    run('plumbing', C.plumb, [P(x0 + 1800, 1200, -1067), P(x0 + 1800, y1 - 1300, -1067), P(x0 + 1800, y1 - 1300, 864), P(x1 - 1800, y1 - 1300, 864)], {building: NAME, part: 'water main to every bath'});
    run('plumbing', C.sewer, [P(x1 - 1200, y1 - 600, -600), P(x1 - 1200, 2400, -1829)], {building: NAME, part: 'sewer lateral'});
    // Pool with kidney shape, deck, umbrellas, palms
    const px = x0 + 14000, py = ya + 15000;
    line('paving', C.car2, blob(px, py, 4200, 28, 1.2, -150), {part: 'kidney pool edge'}, {closed: true});
    line('paving', C.car2, blob(px, py, 3600, 28, 1.2, -1500), {part: 'pool floor'}, {closed: true});
    hatch('paving', C.car2, rect(px - 3000, py - 2000, px + 3000, py + 2000, -1500), 'gradient', 400, 0, {part: 'water, deeper to the north'}, C.street);
    line('paving', C.curb, blob(px, py, 7200, 30, 0.4), {part: 'pool deck edge'}, {closed: true});
    for (let i = 0; i < 4; i++) { const ax = px - 6000 + i * 4000, ay = py + 6000; sym('activity', C.brick, 'umbrella', P(ax, ay), 0, {activity: ['shade over a sunbather with a paperback', 'shade over a cooler of sodas', 'shade over grandma and the crossword', 'shade over two drying beach towels'][i]}); }
    person(P(px - 1000, py), 0, 'walking', 'treading water in the deep end', {type: 'bob', mm: 120, period: 2});
    person(P(px + 1500, py - 1200), 0, 'walking', 'cannonballing off the edge', {type: 'bob', mm: 1500, period: 2.5});
    person(P(px - 6000, py + 6800), 0, 'sitting', 'reading a mystery by the pool');
    person(P(px + 6500, py - 2000), 2, 'standing', 'skimming leaves off the pool');
    for (let i = 0; i < 5; i++) tree(px - 9000 + i * 4500, py - 9000 + (i % 2) * 1800, 6, 4 + i * 0.3);
    // Guests, housekeeping, cars nosed in at the rooms
    for (let i = 0; i < 6; i++) sym('vehicle', [C.car, C.car2, C.struct, C.brick, C.veg, C.car][i], i === 3 ? 'truck' : 'car', P(x0 + 1829 + i * rw * 1.6, y0 - 6000), 0, {part: 'guest parking'});
    sym('activity', C.int, 'cart', P(x0 + 4 * rw + 800, y0 - 900), 0, {activity: 'housekeeping cart loaded with towels', anim: {type: 'path', speed: 400, pts: [P(x0 + 800, y0 - 900), P(x1 - 800, y0 - 900)]}});
    person(P(x0 + 4 * rw + 1400, y0 - 900), 0, 'walking', 'changing sheets in room 105', {type: 'path', speed: 400, pts: [P(x0 + 1400, y0 - 900), P(x1 - 200, y0 - 900)]});
    person(P(fx0 + 3600, fy0 + 3700), Math.PI, 'standing', 'handing over a brass room key');
    person(P(fx0 + 3600, fy0 + 2200), 0, 'standing', 'checking in after a long drive');
    person(P(x0 + 2 * rw + 800, y0 - 4500), 0, 'standing', 'unloading suitcases from the trunk');
    person(P(x0 + 7 * rw + 600, y0 - 1200), 0, 'sitting', 'smoking on the walkway chair');
    sym('activity', C.brick, 'dog', P(x0 + 7 * rw + 1300, y0 - 1400), 0, {activity: 'road trip dog panting in the shade'});
    hatch('paving', C.curb, rect(a + 1000, ya + 1500, b - 1000, y0 - 2400), 'dots', 900, 0, {part: 'asphalt court'}, C.struct);
    for (let i = 0; i < 6; i++) line('paving', C.white, [P(x0 + i * rw * 1.6, y0 - 8800), P(x0 + i * rw * 1.6, y0 - 3300)], {part: 'stall stripe', checks: [['stall_depth', 5500]]});
    line('vegetation', C.veg2, wavy(a + 1000, yb - 4000, b - 1000, yb - 4500, 1800, 30, 2), {part: 'oleander hedge line'});
    line('vegetation', C.struct, wavy(a + 1500, y1 + 3000, a + 1500, yb - 6000, 1500, 18, 4), {part: 'gravel path to the ice machine'});
  }

  // ---------- Link to the neighbor: crosswalk on Arroyo Street to the Arroyo Reading Room, with a bus stop
  hatch('street', C.white, rect(17500, 300, 20500, 5486), 'lines', 610, 90, {street: 'Arroyo Street', part: 'mid block crosswalk to the reading room'});
  sym('street', C.sign, 'sign', P(16900, CURB + 500), 0, {text: 'Ped Xing'});
  sym('street', C.sign, 'sign', P(46000, CURB + 600), 0, {text: 'Bus Stop: Line 4 Downtown'});
  sym('activity', C.struct, 'bench', P(47500, CURB + 1800), 0, {activity: 'bus bench under a mesquite'});
  person(P(47000, CURB + 2000), 0, 'sitting', 'waiting on the line 4 bus');
  person(P(48200, CURB + 2000), 0, 'standing', 'checking the bus schedule');
  person(P(19000, CURB + 1000), Math.PI, 'walking', 'carrying overdue books to the reading room', {type: 'path', speed: 1100, pts: [P(19000, 24000), P(19000, CURB + 1000), P(19000, -CURB - 2000), P(19000, -14000)]});
  sym('vehicle', C.yellow, 'truck', P(70000, 2000), -Math.PI / 2, {part: 'line 4 bus', anim: {type: 'path', speed: 9000, pts: [P(-3000, 1700), P(46000, 1700), P(46000, 1700), P(3 * S - 3000, 1700)]}});
  sym('vehicle', C.car2, 'car', P(10000, -1700), Math.PI / 2, {part: 'westbound traffic', anim: {type: 'path', speed: 11000, pts: [P(3 * S - 3000, -1700), P(-3000, -1700)]}});

  // ---------- More life on the original blocks
  const garden = 79248 / 2;
  // Block 0,0
  line('paving', C.curb, wavy(garden + 1500, garden + 1500, 70000, 70000, 2500, 28, 1), {part: 'flagstone path through the garden'});
  line('vegetation', C.veg2, blob(garden + 30000, garden + 6000, 2200, 16, 3), {part: 'pollinator circle'}, {closed: true});
  line('vegetation', C.veg2, blob(garden + 6000, garden + 30000, 1800, 14, 5), {part: 'herb spiral'}, {closed: true});
  for (let i = 0; i < 4; i++) line('vegetation', C.veg2, wavy(9144 + 1500, 39624 + 4000 + i * 7000, 39624 - 2000, 39624 + 3000 + i * 7000, 900, 16, i), {part: 'bungalow yard border ' + (i + 1)});
  line('vegetation', C.struct, wavy(39624 + 2000, 9144 + 1000, 70104 - 2000, 9144 + 1500, 600, 20, 7), {part: 'low rock wall along Arroyo Street'});
  const acts00 = [
    [garden + 4000, garden + 22000, 'standing', 'picking ripe chiles into a basket'],
    [garden + 20000, garden + 4000, 'sitting', 'sketching the sunflowers'],
    [garden + 28000, garden + 9000, 'standing', 'turning the compost pile'],
    [garden + 12000, garden + 28000, 'standing', 'teaching a kid to plant beans'],
    [garden + 12800, garden + 27500, 'sitting', 'pressing beans into the dirt'],
    [39624 + 9000, 9144 + 4000, 'standing', 'hosing down the carport slab'],
    [9144 + 9000, 39624 + 4000, 'walking', 'mowing a strip of bermuda grass'],
    [9144 + 3000, 39624 + 14000, 'sitting', 'shelling pecans on the porch step'],
    [30000, 9144 + 1500, 'walking', 'walking home with a gallon of milk'],
    [12000, 9144 + 2000, 'standing', 'waiting for the light to cross'],
    [24000, 20000, 'standing', 'pumping air into a bike tire'],
    [26000, 21000, 'standing', 'chatting with a neighbor by the ice chest']
  ];
  for (const [x, y, pose, act] of acts00) person(P(x, y), 0, pose, act);
  sym('activity', C.car2, 'bike', P(24700, 20000), 0, {activity: 'bike with a flat front tire'});
  sym('activity', C.brick, 'dog', P(30800, 9144 + 1500), 0, {activity: 'trotting along on a short leash', anim: {type: 'path', speed: 1100, pts: [P(10000, 7500), P(68000, 7500)]}});
  // Block 1,0
  const S0 = S;
  for (let i = 0; i < 3; i++) line('vegetation', C.veg2, wavy(S0 + 12000 + i * 14000, 42000, S0 + 22000 + i * 14000, 46000, 1200, 14, i + 3), {part: 'courtyard planter ' + (i + 1)});
  line('paving', C.curb, wavy(S0 + 10000, 40500, S0 + 68000, 40500, 1500, 30, 9), {part: 'courtyard walk'});
  const acts10 = [
    [S0 + 30000, 42500, 'walking', 'carrying leftovers home from the diner'],
    [S0 + 40000, 44000, 'sitting', 'playing guitar in the courtyard'],
    [S0 + 41000, 44800, 'standing', 'listening with a glass of tea'],
    [S0 + 12000, 13000, 'standing', 'reading the specials chalkboard'],
    [S0 + 52000, 11000, 'standing', 'waving cars through the drive thru'],
    [S0 + 60000, 52000, 'standing', 'hanging laundry on the line'],
    [S0 + 20000, 60000, 'sitting', 'snapping green beans on the stoop']
  ];
  for (const [x, y, pose, act] of acts10) person(P(x, y), 0, pose, act);
  sym('activity', C.yellow, 'sign', P(S0 + 12000, 12000), 0, {activity: 'chalkboard listing the pie of the day', text: 'Pie of the Day: Prickly Pear'});
  line('activity', C.int, [P(S0 + 59000, 51500, 1700), P(S0 + 65000, 52500, 1700)], {part: 'clothesline with shirts', anim: {type: 'sway', deg: 4, period: 3}});
  // Block 0,1 park
  const pk = S;
  const acts01 = [
    [30000, pk + 60000, 'walking', 'chasing a soccer ball downfield'],
    [34000, pk + 62000, 'walking', 'defending the near goal'],
    [26000, pk + 58000, 'standing', 'refereeing a pickup soccer game'],
    [22000, pk + 64000, 'standing', 'selling paletas from a cart'],
    [21000, pk + 63000, 'standing', 'choosing a mango paleta'],
    [50000, pk + 30000, 'standing', 'birdwatching for a roadrunner'],
    [45000, pk + 50000, 'sitting', 'stretching on a yoga mat'],
    [46500, pk + 50500, 'sitting', 'leading a slow stretch class'],
    [15000, pk + 45000, 'standing', 'flying a kite in the breeze'],
    [60000, pk + 62000, 'sitting', 'picnicking on a striped blanket'],
    [61000, pk + 62600, 'sitting', 'pouring lemonade for the family']
  ];
  for (const [x, y, pose, act] of acts01) person(P(x, y), 0, pose, act);
  sym('activity', C.brick, 'cart', P(22600, pk + 64200), 0, {activity: 'paleta cart with a bell'});
  sym('activity', C.car2, 'umbrella', P(60500, pk + 62300), 0, {activity: 'beach umbrella over the picnic'});
  line('activity', C.brick, [P(15000, pk + 45000, 1500), P(17000, pk + 48000, 9000)], {part: 'kite string', anim: {type: 'sway', deg: 8, period: 2.2, pivot: P(15000, pk + 45000, 1500)}});
  sym('activity', C.int, 'mark', P(32000, pk + 61000, 110), 0, {activity: 'soccer ball rolling', anim: {type: 'path', speed: 5000, pts: [P(26000, pk + 60000), P(38000, pk + 62000), P(30000, pk + 64000)]}});
  line('lot', C.white, rect(20000, pk + 55000, 42000, pk + 68000), {part: 'soccer field lines'}, {closed: true});
  line('lot', C.white, arc(31000, pk + 61500, 2700, 0, 360, 16), {part: 'center circle'}, {closed: true});
  for (let i = 0; i < 6; i++) line('vegetation', C.struct, blob(12000 + i * 9000, pk + 22000 + (i % 3) * 3000, 900 + i * 120, 10, i), {part: 'boulder cluster'}, {closed: true});
  // Block 1,1 yard
  const yy = S;
  const acts11 = [
    [S + 40000, yy + 12000, 'standing', 'forklifting a pallet of feed'],
    [S + 46000, yy + 50000, 'standing', 'measuring a trailer hitch height'],
    [S + 20000, yy + 60000, 'walking', 'walking the fence line for gaps'],
    [S + 52000, yy + 66000, 'sitting', 'eating lunch on the tailgate'],
    [S + 30000, yy + 12000, 'standing', 'loading bags of pine shavings']
  ];
  for (const [x, y, pose, act] of acts11) person(P(x, y), 0, pose, act);
  line('vegetation', C.struct, wavy(S + 12000, yy + 47000, S + 66000, yy + 47000, 1200, 30, 11), {part: 'tractor tire ruts in the yard'});
  hatch('paving', C.struct, rect(S + 12000, yy + 44000, S + 66000, yy + 52000), 'dots', 1200, 30, {part: 'graded decomposed granite'}, C.curb);
}
