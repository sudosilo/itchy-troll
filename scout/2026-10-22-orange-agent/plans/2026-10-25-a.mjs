// 2026-10-25 hand turn. Violet's commission for agent-orange: housing on [0,3] and [1,3] for the workers of the northeast blocks.
// [0,3] gets Sagebrush Hill Chapel with exposed king post roof trusses and a bell tower, a fellowship hall and a parsonage.
// [1,3] gets Tumbleweed Terrace Apartments and four cottages facing Chuparosa Street, around a shared courtyard.
export default async (k) => {
  const {S, C, P, PL, CURB, line, sym, hatch, rect, arc, circ, vface, blob, wavy, box, wall, run, door, person, tree, lot, claim, streets, trafficLoop} = k;

  // ---------- Claims and streets. Agave Street is already drawn on both south edges, and x = 2S is drawn by [2,3].
  claim(0, 3);
  claim(1, 3);
  streets(0, 3, {s: false, w: true, n: true, e: true});
  streets(1, 3, {s: false, w: false, n: true, e: false});
  trafficLoop(0, 3, false, C.car2, 'car', 8200);
  trafficLoop(1, 3, false, C.struct, 'truck', 7600);

  // ================= [0,3] Sagebrush Hill Chapel =================
  {
    const ox = 0, oy = 3 * S, a = ox + PL, b = ox + S - PL, ya = oy + PL, yb = oy + S - PL;
    lot('civic', a, ya, b, yb, 'chapel parcel');
    const N = 'Sagebrush Hill Chapel';
    const W = 9754, L = 18288, EAVE = 4877, RIDGE = 8534;
    const x0 = ox + S / 2 - W / 2, x1 = x0 + W, xm = (x0 + x1) / 2, y0 = ya + 12000, y1 = y0 + L;
    wall(N, [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], EAVE, -914, true);
    // Bell tower on the south front
    const tx0 = xm - 1524, tx1 = xm + 1524, ty0 = y0 - 3048, ty1 = y0, TH = 9754;
    wall(N, [[tx0, ty1], [tx0, ty0], [tx1, ty0], [tx1, ty1]], TH, -914, false);
    // Sacristy in the northeast corner
    wall(N, [[x1 - 3048, y1], [x1 - 3048, y1 - 3048], [x1, y1 - 3048]], 3048, 0, false, C.int);
    // Gable roof planes and end walls
    hatch('structure', C.roof, [P(x0 - 450, y0, EAVE - 150), P(x0 - 450, y1, EAVE - 150), P(xm, y1, RIDGE), P(xm, y0, RIDGE)], 'gradient', 400, 90, {building: N, part: 'west roof slope, standing seam'}, C.struct);
    hatch('structure', C.roof, [P(x1 + 450, y0, EAVE - 150), P(x1 + 450, y1, EAVE - 150), P(xm, y1, RIDGE), P(xm, y0, RIDGE)], 'gradient', 400, 90, {building: N, part: 'east roof slope, standing seam'}, C.struct);
    hatch('structure', C.street, [P(x0, y1, 0), P(x1, y1, 0), P(x1, y1, EAVE), P(xm, y1, RIDGE), P(x0, y1, EAVE)], 'lines', 220, 0, {building: N, part: 'north gable, white lap siding'}, C.int);
    hatch('structure', C.street, vface(x0, y0, x0, y1, 0, EAVE), 'lines', 220, 0, {building: N, part: 'west wall, white lap siding'}, C.int);
    hatch('structure', C.street, vface(x1, y0, x1, y1, 0, EAVE), 'lines', 220, 0, {building: N, part: 'east wall, white lap siding'}, C.int);
    // Stained glass: tall pointed windows down both sides
    for (let i = 0; i < 4; i++) {
      const wy = y0 + 2400 + i * 3900;
      for (const wx of [x0, x1]) hatch('structure', [C.car2, C.brick, C.yellow, C.veg][i], [P(wx, wy, 1200), P(wx, wy + 1000, 1200), P(wx, wy + 1000, 3300), P(wx, wy + 500, 3900), P(wx, wy, 3300)], 'cross', 160, 45, {building: N, part: 'stained glass window ' + (i + 1)}, [C.yellow, C.car2, C.brick, C.car2][i]);
    }
    // Exposed king post trusses, one every 3048 mm down the nave
    let trussChecks = 0;
    for (let ty = y0 + 1524; ty < y1; ty += 3048) {
      const meta = {building: N, part: 'king post roof truss, rough sawn fir'};
      if (trussChecks++ < 6) meta.checks = [['beam_height', EAVE]];
      line('structure', C.brick, [P(x0, ty, EAVE), P(xm, ty, RIDGE), P(x1, ty, EAVE)], {building: N, part: 'truss top chords'});
      line('structure', C.brick, [P(x0, ty, EAVE), P(x1, ty, EAVE)], meta);
      line('structure', C.brick, [P(xm, ty, EAVE), P(xm, ty, RIDGE)], {building: N, part: 'truss king post'});
      line('structure', C.brick, [P((x0 + xm) / 2, ty, (EAVE + RIDGE) / 2), P(xm, ty, EAVE), P((xm + x1) / 2, ty, (EAVE + RIDGE) / 2)], {building: N, part: 'truss struts'});
    }
    line('structure', C.brick, [P(xm, y0, RIDGE), P(xm, y1, RIDGE)], {building: N, part: 'ridge beam'});
    for (const px of [x0 + (xm - x0) / 2, xm + (x1 - xm) / 2]) line('structure', C.brick, [P(px, y0, (EAVE + RIDGE) / 2), P(px, y1, (EAVE + RIDGE) / 2)], {building: N, part: 'purlin'});
    // Steeple, spire, cross and bell
    hatch('structure', C.street, vface(tx0, ty0, tx1, ty0, 0, TH), 'lines', 220, 0, {building: N, part: 'bell tower front, lap siding'}, C.int);
    hatch('structure', C.int, vface(tx0 + 300, ty0, tx1 - 300, ty0, TH - 2400, TH - 400), 'lines', 180, 90, {building: N, part: 'belfry louvers'});
    const apex = P(xm, (ty0 + ty1) / 2, TH + 4572);
    line('structure', C.roof, [P(tx0, ty0, TH), apex, P(tx1, ty1, TH)], {building: N, part: 'spire edge'});
    line('structure', C.roof, [P(tx1, ty0, TH), apex, P(tx0, ty1, TH)], {building: N, part: 'spire edge'});
    line('structure', C.roof, rect(tx0, ty0, tx1, ty1, TH), {building: N, part: 'belfry cap'}, {closed: true});
    line('structure', C.yellow, [P(xm, (ty0 + ty1) / 2, TH + 4572), P(xm, (ty0 + ty1) / 2, TH + 5800)], {building: N, part: 'cross upright'});
    line('structure', C.yellow, [P(xm - 450, (ty0 + ty1) / 2, TH + 5350), P(xm + 450, (ty0 + ty1) / 2, TH + 5350)], {building: N, part: 'cross arm'});
    const bc = [xm, (ty0 + ty1) / 2], bz = TH - 1400;
    line('interior', C.yellow, [P(bc[0] - 380, bc[1], bz - 700), P(bc[0] - 250, bc[1], bz), P(bc[0] + 250, bc[1], bz), P(bc[0] + 380, bc[1], bz - 700), P(bc[0] - 380, bc[1], bz - 700)], {building: N, part: 'bronze bell', anim: {type: 'sway', deg: 25, period: 2.2, pivot: P(bc[0], bc[1], bz + 200)}});
    line('interior', C.int, [P(bc[0] - 600, bc[1], bz + 200), P(bc[0] + 600, bc[1], bz + 200)], {building: N, part: 'bell yoke'});
    line('interior', C.struct, [P(bc[0] + 600, bc[1] - 300, bz), P(bc[0] + 600, bc[1] - 300, 900)], {building: N, part: 'bell rope', anim: {type: 'bob', mm: 300, period: 2.2}});
    // Doors
    door(N, xm - 914, ty0, 'x', 914, 'front door left leaf', -1);
    door(N, xm, ty0, 'x', 914, 'front door right leaf', -1);
    door(N, xm - 457, y0, 'x', 914, 'narthex to nave door', 1);
    door(N, x1, y0 + 6000, 'y', 914, 'side door to the prayer garden', 1);
    door(N, x1 - 3048, y1 - 2000, 'y', 864, 'sacristy door', -1);
    door(N, x0, y1 - 2400, 'y', 914, 'door to the fellowship hall walk', -1);
    // Pews, aisle, chancel
    for (let r = 0; r < 9; r++) {
      const py = y0 + 1800 + r * 1067;
      for (const [px0, px1] of [[x0 + 600, xm - 750], [xm + 750, x1 - 600]]) {
        line('interior', C.brick, rect(px0, py, px1, py + 450, 457), {building: N, part: 'oak pew seat, row ' + (r + 1)}, {closed: true});
        line('interior', C.brick, [P(px0, py + 450, 457), P(px0, py + 450, 914), P(px1, py + 450, 914), P(px1, py + 450, 457)], {building: N, part: 'pew back with hymnal rack'});
      }
    }
    hatch('structure', C.brick, rect(xm - 600, y0 + 300, xm + 600, y1 - 4500, 10), 'lines', 300, 0, {building: N, part: 'red runner down the center aisle'});
    const cy0 = y1 - 4200;
    line('interior', C.int, rect(x0 + 300, cy0, x1 - 300, y1 - 300, 457), {building: N, part: 'raised chancel platform'}, {closed: true});
    box('interior', C.struct, xm - 900, y1 - 1500, xm + 900, y1 - 900, 914, {building: N, part: 'altar table with linen', checks: [['counter_height', 914]]});
    for (const dx of [-700, 700]) line('interior', C.yellow, [P(xm + dx, y1 - 1200, 914), P(xm + dx, y1 - 1200, 1250)], {building: N, part: 'altar candle', anim: {type: 'blink', period: 0.6 + Math.abs(dx) / 7000, duty: 0.85}});
    line('interior', C.yellow, [P(xm, y1 - 350, 1800), P(xm, y1 - 350, 3200)], {building: N, part: 'wooden cross on the back wall'});
    line('interior', C.yellow, [P(xm - 500, y1 - 350, 2750), P(xm + 500, y1 - 350, 2750)], {building: N, part: 'cross arm on the back wall'});
    box('interior', C.brick, x0 + 1200, cy0 + 600, x0 + 2000, cy0 + 1300, 1118, {building: N, part: 'pulpit', checks: [['counter_height', 1118]]});
    line('interior', C.street, circ(x1 - 1800, cy0 - 900, 380, 914, 10), {building: N, part: 'baptismal font'}, {closed: true});
    box('interior', C.struct, x0 + 600, y1 - 2600, x0 + 2100, y1 - 1900, 1000, {building: N, part: 'upright piano'});
    for (let i = 0; i < 6; i++) line('interior', C.int, circ(x0 + 2600 + i * 520, y1 - 2600, 200, 450, 6), {building: N, part: 'choir chair'}, {closed: true});
    line('interior', C.int, [P(x1 - 400, y0 + 1200, 1600), P(x1 - 400, y0 + 2000, 1600), P(x1 - 400, y0 + 2000, 2400), P(x1 - 400, y0 + 1200, 2400)], {building: N, part: 'hymn number board'}, {closed: true});
    box('interior', C.brick, x0 + 400, y0 + 400, x0 + 1400, y0 + 800, 914, {building: N, part: 'guest book stand', checks: [['counter_height', 914]]});
    box('interior', C.int, x1 - 2700, y1 - 2800, x1 - 300, y1 - 2400, 1829, {building: N, part: 'sacristy vestment closet', checks: [['shelf_height', 1829]]});
    // Lights, outlets, sound
    for (let ly = y0 + 3048; ly < y1; ly += 3048) sym('electrical', C.elec, 'light', P(xm, ly, EAVE - 600), 0, {part: 'schoolhouse pendant hung from the truss'});
    for (const [x, y] of [[x0 + 150, y0 + 3000], [x0 + 150, y0 + 9000], [x1 - 150, y0 + 9000], [x1 - 150, y1 - 3600], [xm + 1200, y1 - 450]]) sym('electrical', C.elec, 'outlet', P(x, y, 457), 0, {checks: [['outlet_height', 457]]});
    sym('electrical', C.elec, 'switch', P(xm + 1000, y0 + 150, 1219), 0, {part: 'nave light switch'});
    line('electrical', C.int, rect(x0 + 200, y1 - 3700, x0 + 500, y1 - 3200, 1676), {building: N, part: 'chapel panel'}, {closed: true});
    line('electrical', C.int, rect(x1 - 600, y0 + 700, x1 - 200, y0 + 1100, 2600), {building: N, part: 'speaker'}, {closed: true});
    line('electrical', C.int, rect(x0 + 200, y0 + 700, x0 + 600, y0 + 1100, 2600), {building: N, part: 'speaker'}, {closed: true});
    sym('electrical', C.struct, 'pole', P(x0 - 4000, oy + CURB + 900), 0, {part: 'service pole on Agave Street'});
    run('electrical', C.elec, [P(x0 - 4000, oy + CURB + 900, 8230), P(x0 - 200, y1 - 3450, 4200), P(x0 - 200, y1 - 3450, 1676), P(x0 + 350, y1 - 3450, 1676)], {building: N, part: 'service drop to the chapel panel'});
    run('plumbing', C.plumb, [P(x1 - 1800, oy + 1200, -1067), P(x1 - 1800, cy0 - 900, -1067), P(x1 - 1800, cy0 - 900, 914)], {building: N, part: 'water to the font and sacristy sink'});
    sym('structure', C.sign, 'sign', P(xm + 3200, ya + 1500), 0, {text: N});
    sym('structure', C.yellow, 'sign', P(xm - 3200, ya + 1500), 0, {text: 'Sunday 9 AM  All Welcome'});

    // ---------- Fellowship hall, west of the chapel
    const FH = 'Sagebrush Hill Fellowship Hall';
    const fx0 = a + 2500, fx1 = fx0 + 12192, fy0 = y0 + 3000, fy1 = fy0 + 9144, FHH = 3658;
    wall(FH, [[fx0, fy0], [fx1, fy0], [fx1, fy1], [fx0, fy1]], FHH, -914, true);
    wall(FH, [[fx0 + 4267, fy1], [fx0 + 4267, fy1 - 3658], [fx0, fy1 - 3658]], 2743, 0, false, C.int);
    wall(FH, [[fx0 + 2134, fy1], [fx0 + 2134, fy1 - 3658]], 2743, 0, false, C.int);
    hatch('structure', C.brick, vface(fx0, fy0, fx1, fy0, 0, FHH), 'brick', 300, 0, {building: FH, part: 'adobe block'}, C.struct);
    hatch('structure', C.roof, rect(fx0 - 300, fy0 - 300, fx1 + 300, fy1 + 300, FHH), 'gradient', 500, 0, {building: FH, part: 'flat roof'}, C.struct);
    door(FH, fx0 + 6000, fy0, 'x', 914, 'hall front door', -1);
    door(FH, fx1, fy1 - 1500, 'y', 914, 'door toward the chapel', 1);
    door(FH, fx0 + 500, fy1 - 3658, 'x', 864, 'mens room door', 1);
    door(FH, fx0 + 2600, fy1 - 3658, 'x', 864, 'womens room door', 1);
    line('structure', C.int, rect(fx0 + 150, fy0 + 150, fx1 - 150, fy1 - 150, 2743), {building: FH, part: 'ceiling', checks: [['ceiling_height', 2743]]}, {closed: true});
    // Kitchen pass through along the east end
    line('interior', C.int, [P(fx1 - 3200, fy1 - 300, 914), P(fx1 - 300, fy1 - 300, 914), P(fx1 - 300, fy0 + 3000, 914)], {building: FH, part: 'kitchen counter', checks: [['counter_height', 914]]});
    box('interior', C.struct, fx1 - 1100, fy1 - 2200, fx1 - 300, fy1 - 1400, 914, {building: FH, part: 'six burner range'});
    box('interior', C.int, fx1 - 2300, fy1 - 800, fx1 - 1500, fy1 - 300, 900, {building: FH, part: 'double sink'});
    box('interior', C.int, fx1 - 1100, fy0 + 1200, fx1 - 300, fy0 + 2000, 1829, {building: FH, part: 'refrigerator'});
    for (let i = 0; i < 3; i++) line('interior', C.struct, circ(fx1 - 2900 + i * 450, fy1 - 500, 170, 1300, 8), {building: FH, part: 'coffee urn ' + (i + 1)}, {closed: true});
    box('interior', C.brick, fx1 - 3600, fy0 + 1500, fx1 - 3300, fy0 + 6000, 914, {building: FH, part: 'serving pass through', checks: [['counter_height', 914]]});
    for (let t = 0; t < 4; t++) { const tx = fx0 + 5000 + (t % 2) * 2800, ty = fy0 + 1800 + Math.floor(t / 2) * 2600; box('interior', C.brick, tx - 900, ty - 380, tx + 900, ty + 380, 737, {building: FH, part: 'folding table ' + (t + 1)}); for (const s of [-1, 1]) for (const d of [-500, 500]) line('interior', C.int, circ(tx + d, ty + s * 700, 180, 450, 6), {building: FH, part: 'folding chair'}, {closed: true}); }
    line('interior', C.int, blob(fx0 + 900, fy1 - 600, 240, 8, 1, 432), {building: FH, part: 'toilet, mens room'}, {closed: true});
    line('interior', C.int, blob(fx0 + 3000, fy1 - 600, 240, 8, 2, 432), {building: FH, part: 'toilet, womens room'}, {closed: true});
    box('interior', C.int, fx0 + 1300, fy1 - 600, fx0 + 1900, fy1 - 200, 864, {building: FH, part: 'lavatory', checks: [['counter_height', 864]]});
    box('interior', C.int, fx0 + 3400, fy1 - 600, fx0 + 4000, fy1 - 200, 864, {building: FH, part: 'lavatory'});
    for (const [lx, ly] of [[fx0 + 6000, fy0 + 2300], [fx0 + 9000, fy0 + 2300], [fx0 + 6000, fy0 + 5600], [fx0 + 9000, fy0 + 5600], [fx0 + 1067, fy1 - 1800], [fx0 + 3200, fy1 - 1800]]) sym('electrical', C.elec, 'light', P(lx, ly, 2743), 0);
    for (const [x, y, h] of [[fx0 + 150, fy0 + 2000, 457], [fx0 + 150, fy0 + 4000, 457], [fx1 - 150, fy0 + 2500, 1067], [fx1 - 150, fy1 - 2600, 1067], [fx0 + 6000, fy0 + 150, 457]]) sym('electrical', C.elec, 'outlet', P(x, y, h), 0, {checks: [['outlet_height', h]]});
    line('electrical', C.int, rect(fx0 + 4400, fy1 - 600, fx0 + 4700, fy1 - 200, 1676), {building: FH, part: 'hall panel'}, {closed: true});
    run('electrical', C.elec, [P(x0 - 4000, oy + CURB + 900, 6400), P(fx0 + 4550, fy0 - 400, 3300), P(fx0 + 4550, fy1 - 400, 1676)], {building: FH, part: 'service to the hall panel'});
    run('plumbing', C.plumb, [P(fx1 - 1900, oy + 1200, -1067), P(fx1 - 1900, fy1 - 550, -1067), P(fx1 - 1900, fy1 - 550, 900)], {building: FH, part: 'water service to the kitchen'});
    run('plumbing', C.sewer, [P(fx0 + 900, fy1 - 600, -400), P(fx0 + 900, oy + 2400, -1829)], {building: FH, part: 'sewer lateral to Agave Street'});
    sym('structure', C.sign, 'sign', P(fx0 + 7500, fy0 - 2000), 0, {text: FH});

    // ---------- Parsonage, northeast corner
    const PN = 'Sagebrush Hill Parsonage';
    const hx0 = b - 13000, hx1 = hx0 + 10363, hy0 = yb - 11000, hy1 = hy0 + 8534;
    wall(PN, [[hx0, hy0], [hx1, hy0], [hx1, hy1], [hx0, hy1]], 3200, -610, true);
    wall(PN, [[hx0 + 4877, hy0], [hx0 + 4877, hy1]], 2438, 0, false, C.int);
    wall(PN, [[hx0 + 4877, hy0 + 4267], [hx1, hy0 + 4267]], 2438, 0, false, C.int);
    hatch('structure', C.street, vface(hx0, hy0, hx1, hy0, 0, 3200), 'lines', 200, 0, {building: PN, part: 'lap siding'}, C.int);
    hatch('structure', C.roof, rect(hx0 - 500, hy0 - 500, hx1 + 500, hy1 + 500, 3200), 'gradient', 450, 90, {building: PN, part: 'roof'}, C.brick);
    door(PN, hx0 + 2000, hy0, 'x', 914, 'parsonage front door', -1);
    door(PN, hx0 + 4877, hy0 + 1500, 'y', 813, 'kitchen door', 1);
    door(PN, hx0 + 6000, hy0 + 4267, 'x', 813, 'bedroom door', 1);
    line('structure', C.int, rect(hx0 + 150, hy0 + 150, hx1 - 150, hy1 - 150, 2438), {building: PN, part: 'ceilings', checks: [['ceiling_height', 2438]]}, {closed: true});
    box('interior', C.brick, hx0 + 900, hy0 + 2500, hx0 + 3900, hy0 + 3500, 762, {building: PN, part: 'study desk with sermon notes'});
    box('interior', C.int, hx0 + 300, hy1 - 900, hx0 + 4500, hy1 - 400, 2134, {building: PN, part: 'bookshelves', checks: [['shelf_height', 2134]]});
    line('interior', C.int, [P(hx0 + 5200, hy0 + 300, 914), P(hx1 - 300, hy0 + 300, 914)], {building: PN, part: 'kitchen counter'});
    box('interior', C.int, hx1 - 1000, hy0 + 1200, hx1 - 300, hy0 + 1900, 1800, {building: PN, part: 'refrigerator'});
    box('interior', C.int, hx0 + 5800, hy1 - 2800, hx0 + 7600, hy1 - 600, 600, {building: PN, part: 'bed with a quilt'});
    for (const [x, y] of [[hx0 + 2400, hy0 + 4200], [hx0 + 7600, hy0 + 2100], [hx0 + 7600, hy1 - 2100]]) sym('electrical', C.elec, 'light', P(x, y, 2438), 0);
    for (const [x, y] of [[hx0 + 150, hy0 + 3000], [hx1 - 150, hy0 + 2500], [hx0 + 5027, hy1 - 1500]]) sym('electrical', C.elec, 'outlet', P(x, y, 406), 0, {checks: [['outlet_height', 406]]});
    sym('structure', C.sign, 'sign', P(hx0 - 1200, hy0 - 1800), 0, {text: PN});

    // ---------- Prayer garden, parking, life
    const gx = x1 + 4500, gy = y0 + 2000;
    line('paving', C.curb, wavy(x1 + 600, y0 + 6450, b - 2000, yb - 14000, 2200, 24, 3), {part: 'prayer garden path of crushed granite'});
    for (let i = 0; i < 5; i++) line('vegetation', C.veg2, blob(gx + 2000 + (i % 3) * 5500, gy + 4000 + Math.floor(i / 3) * 9000, 1500, 14, i + 1), {part: ['rosemary circle', 'lavender bed', 'agave ring', 'sage bed', 'brittlebush ring'][i]}, {closed: true});
    line('vegetation', C.struct, circ(gx + 7000, gy + 13000, 1800, 0, 16), {part: 'labyrinth outer ring'}, {closed: true});
    line('vegetation', C.struct, circ(gx + 7000, gy + 13000, 1100, 0, 14), {part: 'labyrinth middle ring'}, {closed: true});
    line('vegetation', C.struct, circ(gx + 7000, gy + 13000, 450, 0, 10), {part: 'labyrinth center'}, {closed: true});
    for (const [tx, ty] of [[gx, gy + 1000], [gx + 12000, gy + 3000], [gx + 2000, gy + 18000], [a + 2000, yb - 3000], [a + 9000, yb - 3000]]) tree(tx, ty, 3, 5.5);
    sym('activity', C.struct, 'bench', P(gx + 4500, gy + 9000), 0, {activity: 'cedar bench facing the labyrinth'});
    sym('activity', C.struct, 'bench', P(gx + 9500, gy + 1500), 1.57, {activity: 'memorial bench under a mesquite'});
    hatch('paving', C.curb, rect(fx0, ya + 1000, x0 - 3000, y0 - 1000), 'dots', 900, 0, {part: 'gravel parking lot'}, C.struct);
    for (let i = 0; i < 6; i++) { const sx = fx0 + i * 2743; line('paving', C.white, [P(sx, ya + 1500), P(sx, ya + 6986)], {part: 'stall stripe', checks: i < 6 ? [['stall_depth', 5486]] : undefined}); }
    for (let i = 0; i < 4; i++) sym('vehicle', [C.car, C.car2, C.struct, C.yellow][i], i === 2 ? 'truck' : 'car', P(fx0 + 1371 + i * 2743 * 1.2, ya + 4243), 0, {part: 'parked for the service'});
    const acts = [
      [xm - 1400, y0 + 2050, 'sitting', 'singing from a hymnal in the front pew'],
      [xm + 2200, y0 + 4200, 'sitting', 'holding a sleepy toddler in a pew'],
      [xm - 2600, y0 + 6300, 'sitting', 'reading a psalm before the service'],
      [x0 + 2400, cy0 + 950, 'standing', 'preaching on loving your neighbor'],
      [x0 + 1350, y1 - 1550, 'sitting', 'playing the opening hymn on the piano'],
      [x0 + 3100, y1 - 3300, 'standing', 'leading the choir in harmony'],
      [xm + 1400, ty0 - 1600, 'standing', 'greeting families at the chapel door'],
      [bc[0] + 900, bc[1] - 300, 'standing', 'pulling the bell rope for Sunday'],
      [xm, y1 - 2000, 'standing', 'lighting the altar candles'],
      [x1 - 1800, cy0 - 1700, 'standing', 'filling the font for a baptism'],
      [fx1 - 1500, fy1 - 1300, 'standing', 'stirring a pot of posole for the potluck'],
      [fx1 - 2700, fy1 - 1100, 'standing', 'brewing coffee in the big urns'],
      [fx0 + 5000, fy0 + 2900, 'sitting', 'passing a plate of tamales down the table'],
      [fx0 + 7800, fy0 + 4400, 'sitting', 'catching up with old neighbors'],
      [fx0 + 7800, fy0 + 700, 'sitting', 'kids coloring bible story pages'],
      [hx0 + 2400, hy0 + 2000, 'sitting', 'writing next week\'s sermon'],
      [gx + 4500, gy + 9500, 'sitting', 'praying quietly in the garden'],
      [gx + 7000, gy + 11000, 'walking', 'walking the labyrinth slowly'],
      [gx + 9500, gy + 2100, 'sitting', 'remembering a friend on the memorial bench'],
      [fx0 + 3000, ya + 8000, 'walking', 'walking in from the parking lot'],
      [fx0 + 4500, ya + 8300, 'standing', 'helping grandma out of the truck']
    ];
    for (const [x, y, pose, t] of acts) person(P(x, y), 0, pose, t);
    sym('activity', C.brick, 'dog', P(hx1 + 1500, hy0 - 1500), 0, {activity: 'parsonage dog waiting by the gate'});
  }

  // ================= [1,3] worker housing =================
  {
    const ox = S, oy = 3 * S, a = ox + PL, b = ox + S - PL, ya = oy + PL, yb = oy + S - PL;
    lot('residential', a, ya, b, yb, 'worker housing parcel');
    // ---------- Tumbleweed Terrace Apartments, two stories facing Agave Street
    const AN = 'Tumbleweed Terrace Apartments';
    const uw = 7315, ud = 9144, n = 4, ax0 = a + 4000, ay0 = ya + 4000, ax1 = ax0 + uw * n, ay1 = ay0 + ud, FL = 3048, AH = 6706;
    wall(AN, [[ax0, ay0], [ax1, ay0], [ax1, ay1], [ax0, ay1]], AH, -914, true);
    for (let i = 1; i < n; i++) wall(AN, [[ax0 + i * uw, ay0], [ax0 + i * uw, ay1]], AH, 0, false, C.int);
    hatch('structure', C.brick, vface(ax0, ay0, ax1, ay0, 0, AH), 'brick', 300, 0, {building: AN, part: 'stucco over block, darker at the base'}, C.struct);
    hatch('structure', C.brick, vface(ax0, ay1, ax1, ay1, 0, AH), 'brick', 300, 0, {building: AN, part: 'stucco over block, back'}, C.struct);
    hatch('structure', C.roof, rect(ax0, ay0, ax1, ay1, AH), 'gradient', 600, 90, {building: AN, part: 'roof with swamp coolers'}, C.struct);
    hatch('structure', C.struct, rect(ax0, ay0 - 1524, ax1, ay0, FL), 'lines', 300, 90, {building: AN, part: 'second floor walkway deck'});
    line('structure', C.struct, [P(ax0, ay0 - 1524, FL + 1067), P(ax1, ay0 - 1524, FL + 1067)], {building: AN, part: 'walkway railing'});
    line('structure', C.struct, [P(ax0, ay0 - 1524, FL), P(ax1, ay0 - 1524, FL)], {building: AN, part: 'walkway beam', checks: [['beam_height', FL]]});
    for (let i = 0; i <= n; i++) line('structure', C.struct, [P(ax0 + i * uw, ay0 - 1524, 0), P(ax0 + i * uw, ay0 - 1524, FL + 1067)], {building: AN, part: 'steel post'});
    // Stair at the west end
    for (let s = 0; s < 17; s++) { const sy = ay0 - 1524 - (17 - s) * 280, sz = (s + 1) * 178; line('structure', C.struct, [P(ax0 - 1300, sy, sz), P(ax0 - 300, sy, sz)], s < 8 ? {building: AN, part: 'stair tread ' + (s + 1), checks: [['stair_riser', 178], ['stair_tread', 280]]} : {building: AN, part: 'stair tread ' + (s + 1)}); }
    for (let fl = 0; fl < 2; fl++) {
      const z = fl * FL;
      line('structure', C.int, rect(ax0 + 150, ay0 + 150, ax1 - 150, ay1 - 150, z + 2438), {building: AN, part: (fl ? 'upper' : 'lower') + ' unit ceilings', checks: [['ceiling_height', 2438]]}, {closed: true});
      for (let i = 0; i < n; i++) {
        const ux = ax0 + i * uw, unit = (fl ? 'B' : 'A') + (i + 1);
        door(AN, ux + 600, ay0, 'x', 914, 'unit ' + unit + ' door', -1);
        if (fl) line('structure', C.int, [P(ux + 600, ay0, z), P(ux + 600, ay0, z + 2134), P(ux + 1514, ay0, z + 2134), P(ux + 1514, ay0, z)], {building: AN, part: 'unit ' + unit + ' door frame'});
        line('interior', C.int, [P(ux + 300, ay1 - 700, z + 914), P(ux + 3300, ay1 - 700, z + 914)], {building: AN, part: 'unit ' + unit + ' kitchenette counter'});
        box('interior', C.int, ux + 3400, ay1 - 900, ux + 4100, ay1 - 300, z + 1700, {building: AN, part: 'unit ' + unit + ' refrigerator'});
        box('interior', C.int, ux + 4300, ay0 + 4800, ux + 6200, ay0 + 6900, z + 550, {building: AN, part: 'unit ' + unit + ' bed'});
        box('interior', C.car2, ux + 600, ay0 + 2000, ux + 2600, ay0 + 2800, z + 450, {building: AN, part: 'unit ' + unit + ' couch'});
        line('interior', C.int, blob(ux + uw - 700, ay1 - 700, 240, 8, i + fl, z + 432), {building: AN, part: 'unit ' + unit + ' toilet'}, {closed: true});
        box('interior', C.int, ux + uw - 2200, ay1 - 1600, ux + uw - 300, ay1 - 900, z + 500, {building: AN, part: 'unit ' + unit + ' tub'});
        sym('electrical', C.elec, 'light', P(ux + uw / 2, ay0 + 4500, z + 2438), 0);
        sym('electrical', C.elec, 'outlet', P(ux + 150, ay0 + 3000, z + 406), 0, {checks: [['outlet_height', 406]]});
        sym('electrical', C.elec, 'outlet', P(ux + 1800, ay1 - 150, z + 1067), 0, {part: 'kitchenette outlet'});
      }
    }
    line('electrical', C.int, rect(ax0 + 200, ay1 - 2000, ax0 + 900, ay1 - 1200, 1676), {building: AN, part: 'meter bank'}, {closed: true});
    sym('electrical', C.struct, 'pole', P(ax0 - 3500, oy + CURB + 900), 0, {part: 'service pole'});
    run('electrical', C.elec, [P(ax0 - 3500, oy + CURB + 900, 8230), P(ax0 - 200, ay1 - 1600, 4200), P(ax0 - 200, ay1 - 1600, 1676), P(ax0 + 550, ay1 - 1600, 1676), P(ax1 - 600, ay1 - 1600, 2900)], {building: AN, part: 'service to the meter bank and unit feeders'});
    run('plumbing', C.plumb, [P(ax0 + 2000, oy + 1200, -1067), P(ax0 + 2000, ay1 - 400, -1067), P(ax0 + 2000, ay1 - 400, 900), P(ax1 - 1200, ay1 - 400, 900)], {building: AN, part: 'water main to every unit'});
    run('plumbing', C.sewer, [P(ax1 - 700, ay1 - 700, -400), P(ax1 - 700, oy + 2400, -1829)], {building: AN, part: 'building drain to Agave Street'});
    sym('structure', C.sign, 'sign', P(ax0 + 1000, ya + 1500), 0, {text: AN});

    // ---------- Four cottages facing Chuparosa Street
    const names = ['Caliche Lane Cottage', 'Packrat Hollow Cottage', 'Dust Pan Cottage', 'Lantern Wash Cottage'];
    const cw = 9144, cd = 7315, cy1 = yb - 2500, cy0 = cy1 - cd;
    names.forEach((CN, i) => {
      const x0 = a + 2000 + i * 14800, x1 = x0 + cw;
      wall(CN, [[x0, cy0], [x1, cy0], [x1, cy1], [x0, cy1]], 3048, -610, true);
      wall(CN, [[x0 + 4572, cy0], [x0 + 4572, cy1]], 2438, 0, false, C.int);
      hatch('structure', [C.car2, C.brick, C.veg, C.yellow][i], vface(x0, cy1, x1, cy1, 0, 3048), 'lines', 200, 0, {building: CN, part: 'painted board siding'}, C.struct);
      hatch('structure', C.roof, rect(x0 - 400, cy0 - 400, x1 + 400, cy1 + 1600, 3048), 'gradient', 400, 0, {building: CN, part: 'tin roof over the porch'}, C.struct);
      door(CN, x0 + 1500, cy1, 'x', 914, 'front door to Chuparosa Street', 1);
      door(CN, x0 + 4572, cy0 + 2000, 'y', 813, 'bedroom door', 1);
      line('structure', C.int, rect(x0 + 150, cy0 + 150, x1 - 150, cy1 - 150, 2438), {building: CN, part: 'ceiling', checks: [['ceiling_height', 2438]]}, {closed: true});
      line('interior', C.int, [P(x0 + 300, cy0 + 300, 914), P(x0 + 3400, cy0 + 300, 914)], {building: CN, part: 'kitchen counter'});
      box('interior', C.int, x0 + 3500, cy0 + 200, x0 + 4200, cy0 + 800, 1800, {building: CN, part: 'refrigerator'});
      box('interior', C.brick, x0 + 1200, cy0 + 2600, x0 + 2600, cy0 + 3600, 762, {building: CN, part: 'kitchen table'});
      box('interior', C.int, x0 + 5600, cy0 + 2500, x0 + 7400, cy0 + 4600, 550, {building: CN, part: 'bed'});
      line('interior', C.int, blob(x1 - 600, cy0 + 600, 240, 8, i, 432), {building: CN, part: 'toilet'}, {closed: true});
      box('interior', C.int, x1 - 1800, cy0 + 300, x1 - 1100, cy0 + 800, 864, {building: CN, part: 'bathroom sink'});
      sym('electrical', C.elec, 'light', P(x0 + 2300, cy0 + 3600, 2438), 0);
      sym('electrical', C.elec, 'light', P(x0 + 6800, cy0 + 3600, 2438), 0);
      sym('electrical', C.elec, 'outlet', P(x0 + 150, cy0 + 2500, 406), 0, {checks: [['outlet_height', 406]]});
      sym('electrical', C.elec, 'outlet', P(x0 + 2000, cy0 + 150, 1067), 0, {part: 'counter outlet'});
      run('plumbing', C.plumb, [P(x1 - 1450, yb + 3000, -1067), P(x1 - 1450, cy0 + 550, -1067), P(x1 - 1450, cy0 + 550, 864)], {building: CN, part: 'water from the Chuparosa main'});
      run('electrical', C.elec, [P(x0 + 300, yb + 3600, -600), P(x0 + 300, cy1 - 600, -600), P(x0 + 300, cy1 - 600, 1676)], {building: CN, part: 'underground service'});
      line('paving', C.curb, wavy(x0 + 1957, cy1 + 1600, x0 + 1957, yb + 3500, 500, 6, i), {part: 'front walk'});
      sym('structure', C.sign, 'sign', P(x1 - 800, cy1 + 2600), 0, {text: CN});
    });
    // ---------- Courtyard between the apartments and the cottages
    const qy = (ay1 + cy0) / 2, qx = (a + b) / 2;
    line('paving', C.curb, blob(qx, qy, 6500, 28, 2), {part: 'courtyard loop path'}, {closed: true});
    for (let i = 0; i < 4; i++) line('vegetation', C.veg2, wavy(a + 2000 + i * 3000, ay1 + 2500, a + 2000 + i * 3000, cy0 - 2500, 400, 10, i + 4), {part: 'community garden row ' + (i + 1)});
    line('activity', C.int, [P(b - 9000, ay1 + 3500, 1700), P(b - 3000, ay1 + 4500, 1700)], {part: 'clothesline with work shirts', anim: {type: 'sway', deg: 4, period: 3}});
    line('activity', C.car2, arc(qx, qy, 1300, 0, 360, 12, 400), {part: 'little merry go round', anim: {type: 'spin', rpm: 10}}, {closed: true});
    for (const [tx, ty] of [[qx - 9000, qy], [qx + 9000, qy + 2000], [b - 2500, ya + 3000], [a + 1500, cy0 - 1500]]) tree(tx, ty, 4, 5);
    sym('activity', C.struct, 'bench', P(qx + 4200, qy - 6200), 0, {activity: 'bench by the courtyard loop'});
    sym('activity', C.brick, 'table', P(qx - 9000, qy + 4500), 0, {activity: 'picnic table with a domino game'});
    for (let i = 0; i < 5; i++) sym('vehicle', [C.car, C.yellow, C.struct, C.car2, C.veg][i], i % 2 ? 'truck' : 'car', P(ax0 + 1400 + i * 5600, ya + 400), 0, {part: 'resident parking'});
    const acts = [
      [ax0 + 1000, ay0 - 900, 'walking', 'heading to the morning shift at the welding shop'],
      [ax0 + uw + 1000, ay0 - 900, 'standing', 'locking the door before work'],
      [ax0 + 2 * uw + 1900, ay0 + 2300, 'sitting', 'eating breakfast burritos on the couch'],
      [ax0 + 3 * uw + 1800, ay1 - 1300, 'standing', 'packing a lunch pail'],
      [ax0 + uw + 3000, ay0 - 1000, 'standing', 'watering a pot of geraniums on the walkway'],
      [ax0 - 800, ay0 - 2500, 'walking', 'carrying groceries up the stairs'],
      [qx + 1700, qy, 'standing', 'pushing kids on the merry go round'],
      [qx + 4200, qy - 5700, 'sitting', 'resting after a double shift'],
      [qx - 9600, qy + 4500, 'sitting', 'slapping down a domino'],
      [qx - 8400, qy + 4500, 'sitting', 'counting points for the domino game'],
      [a + 3500, ay1 + 5000, 'standing', 'picking tomatoes in the community garden'],
      [b - 6000, ay1 + 3000, 'standing', 'hanging work shirts on the line'],
      [a + 3500, cy1 + 1000, 'sitting', 'drinking coffee on the cottage porch'],
      [a + 18300, cy1 + 1000, 'standing', 'fixing a porch step with a hammer'],
      [a + 33100, cy1 + 1000, 'sitting', 'shelling pecans on the porch swing'],
      [a + 47900, cy1 + 2600, 'walking', 'walking home from the date packing shed'],
      [a + 4000, cy0 + 3100, 'sitting', 'helping a kid with homework at the table'],
      [ax0 + 2400, ya + 1700, 'standing', 'warming up a truck before work']
    ];
    for (const [x, y, pose, t, rot] of acts) person(P(x, y), rot || 0, pose, t);
    sym('activity', C.brick, 'dog', P(qx - 7000, qy - 2000), 0, {activity: 'mutt chasing a ball around the loop', anim: {type: 'path', speed: 2200, pts: blob(qx, qy, 6500, 16, 2).concat([blob(qx, qy, 6500, 16, 2)[0]])}});
    sym('activity', C.car2, 'cyclist', P(qx, qy - 6500), 0, {activity: 'riding laps around the courtyard', anim: {type: 'path', speed: 3500, pts: blob(qx, qy, 6500, 16, 2).concat([blob(qx, qy, 6500, 16, 2)[0]])}});
  }
};
