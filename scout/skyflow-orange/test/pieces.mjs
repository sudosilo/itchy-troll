// Headless checks for containers, joints, welding, turning, flipping and tumbling.
// Run from the build folder: node ../test/pieces.mjs
import { createGame, KINDS } from '../src/game.js';

let failed = 0;
function check(name, ok, extra) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : ''));
  if (!ok) failed++;
}

function mk(seed, wind) {
  let s = seed || 1;
  const random = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const ev = [];
  const g = createGame({ mode: 'free', onEvent: (e) => ev.push(e), random, freeWind: wind || 0 });
  g.ev = ev;
  g.run = (sec) => { const n = Math.round(sec * 60); for (let i = 0; i < n; i++) { g._step(); g._flush(); } };
  g.park = (x, z, hookY) => {
    const S = g._sim;
    S.trolley = Math.hypot(x, z);
    S.slew = Math.atan2(-z, x);
    S.hookX = x; S.hookZ = z; S.hookVX = 0; S.hookVZ = 0;
    S.cable = 62.8 - hookY;
  };
  return g;
}
function dropAt(g, kind, x, z, y, wait) {
  const c = g._spawn(kind);
  c.userData.onTruck = false;
  c.userData.dropped = true;
  c.position.set(x, y, z);
  c.userData.falling = true;
  g._falling.push(c);
  g.run(wait == null ? 3 : wait);
  return c;
}
// every piece must sit at an exact quarter turn
function square(c) {
  const q = c.quaternion;
  const e = [q.x, q.y, q.z, q.w].map((v) => Math.abs(v));
  const ok = (v) => [0, 0.5, Math.SQRT1_2, 1].some((t) => Math.abs(v - t) < 1e-6);
  return e.every(ok);
}
const ext = (c) => [c.userData.hx, c.userData.hy, c.userData.hz].join(',');

// 1. the truck brings what the player picks
{
  const g = mk();
  g.run(0.5);
  check('starts with a crate', g._boxes[0].userData.kind === 'crate');
  g.setSupply('container'); g.run(0.2);
  const c = g._boxes.find((b) => b.userData.onTruck);
  check('truck load swapped to a container', g._boxes.length === 1 && c.userData.kind === 'container' && ext(c) === '3,1,1');
  check('container clear of the cab', c.position.x + 3 < 1.25, 'x=' + c.position.x);
  g.park(-2, 20, 3.0); g.run(0.5);
  check('hook rests on the container', Math.abs(g._sim.hookY - 3.65) < 0.05, 'hookY=' + g._sim.hookY.toFixed(2));
  g.grab(); g.run(0.3);
  check('container grabbed', g._sim.carrying === c);
  g.park(-2, 20, 12); g.run(1.5);
  check('container not smashed leaving the truck', g._boxes.indexOf(c) !== -1 && !c.userData.smashing);
  g.park(12, 8, 12); g.run(2);
  g.turn(); g.run(0.5);
  check('turn swaps length to z', ext(c) === '1,1,3' && square(c), ext(c));
  g.flip(); g.run(0.5);
  check('flip stands it up', ext(c) === '1,3,1' && square(c), ext(c));
  g.park(12, 8, 4); g.run(3);
  check('standing container rests on the ground', Math.abs(c.position.y - 3) < 0.03, 'y=' + c.position.y.toFixed(2));
  g.grab(); g.run(2);
  check('stands after release, 6 ft tall', !g._sim.carrying && g._falling.length === 0 && Math.abs(g._round.heightFt - 6) < 0.02, 'h=' + g._round.heightFt);
  g.run(3.2);
  check('truck brings another container', g._boxes.filter((b) => b.userData.onTruck && b.userData.kind === 'container').length === 1);
}

// 2. flip twice returns to the start, and a drop in the middle of a turn lands square
{
  const g = mk();
  g.run(0.3);
  g.setSupply('container'); g.run(0.2);
  g.park(-2, 20, 3.7); g.run(0.5); g.grab(); g.run(0.3);
  const c = g._sim.carrying;
  g.park(-2, 20, 14); g.run(1.5);
  g.park(14, 4, 14); g.run(2);
  g.flip(); g.run(0.5); g.flip(); g.run(0.5);
  check('flip then flip back', ext(c) === '3,1,1' && square(c), ext(c));
  g.flip(); g.run(0.5); g.turn(); g.run(0.5); g.flip(); g.run(0.5);
  check('flip, turn, flip lies flat again', c.userData.hy === 1 && square(c), ext(c));
  g.turn(); g.run(0.08);
  g.grab(); g.run(4);
  check('drop in the middle of a turn lands square', square(c) && g._falling.length === 0 && Math.abs(c.position.y - c.userData.hy) < 0.03, ext(c) + ' y=' + c.position.y.toFixed(2));
}

// 3. a container bridges two crates, and falls when one is taken away
{
  const g = mk();
  g.run(0.3);
  const a = dropAt(g, 'crate', 8, 10, 1.2);
  dropAt(g, 'crate', 12, 10, 1.2);
  const c = dropAt(g, 'container', 10, 10, 3.3);
  check('container bridges two crates', Math.abs(c.position.y - 3) < 0.03 && g._falling.length === 0, 'y=' + c.position.y.toFixed(2));
  check('bridge is 4 ft high', Math.abs(g._round.heightFt - 4) < 0.02);
  a.position.z += 8;
  g.run(5);
  check('bridge comes down when a support goes', c.position.y < 2.5 && g._falling.length === 0, 'y=' + c.position.y.toFixed(2));
}

// 4. a container set half off a crate slides off
{
  const g = mk();
  g.run(0.3);
  dropAt(g, 'crate', 10, 10, 1.2);
  const c = dropAt(g, 'container', 13.5, 10, 3.3, 5);
  check('overhanging container slid to the ground', Math.abs(c.position.y - 1) < 0.03 && g._falling.length === 0, 'y=' + c.position.y.toFixed(2));
}

// 5. joints weld what touches them
{
  const g = mk();
  g.run(0.3);
  const j = dropAt(g, 'joint', 10, 10, 1.2);
  const c = dropAt(g, 'container', 14.4, 10, 1.2);
  check('container drawn in flush to the joint', Math.abs(c.position.x - 14) < 0.01, 'x=' + c.position.x.toFixed(2));
  check('joint and container welded', j.userData.asm !== 0 && j.userData.asm === c.userData.asm && g.ev.some((e) => e.type === 'weld'));
  const k = dropAt(g, 'crate', 10, 10, 3.2);
  check('crate on top of the joint welded too', k.userData.asm === j.userData.asm && g._asms.get(j.userData.asm).length === 3);
  const lone = dropAt(g, 'crate', 14, 10, 3.2);
  check('crate on the container is not welded', lone.userData.asm === 0);
  lone.userData.falling = true; g._falling.push(lone); lone.userData.vz = 8; g.run(3);

  // lift the whole shape by the container
  g.park(14, 10, 2.5); g.run(0.6); g.grab(); g.run(0.3);
  check('grab takes the whole welded shape', g._sim.carrying === c && g._sim.group.length === 2 && g.snapshot().load === 2600 + 700 + 1100);
  g.park(14, 10, 14); g.run(1.5);
  check('joint rides with the container', Math.abs(j.position.x - (c.position.x - 4)) < 0.01 && Math.abs(j.position.y - c.position.y) < 0.01);
  g.turn(); g.run(0.5);
  check('turn swings the joint around', Math.abs(j.position.z - (c.position.z + 4)) < 0.01 && Math.abs(j.position.x - c.position.x) < 0.01,
    'dx=' + (j.position.x - c.position.x).toFixed(2) + ' dz=' + (j.position.z - c.position.z).toFixed(2));
  check('all three stay square', [j, c, k].every(square));
  g.park(-14, -10, 14); g.run(3);
  g.park(-14, -10, 2); g.run(3);
  g.grab(); g.run(3);
  check('shape set down in one piece', g._falling.length === 0 && Math.abs(c.position.y - 1) < 0.03 && Math.abs(j.position.y - 1) < 0.03 && Math.abs(k.position.y - 3) < 0.03,
    [c, j, k].map((m) => m.position.y.toFixed(2)).join(' '));
}

// 6. a standing container is knocked over by a carried crate
{
  const g = mk();
  g.run(0.3);
  const c = dropAt(g, 'container', 10, 10, 1.2);
  // stand it up by hand
  c.rotation.z = Math.PI / 2; c.userData.hx = 1; c.userData.hy = 3; c.position.y = 3;
  g.run(0.5);
  check('standing container stays up', c.userData.hy === 3 && g._falling.length === 0);
  g.park(-1, 20, 3.7); g.run(0.3); g.grab(); g.run(0.2);
  g.park(-1, 20, 9); g.run(0.6);
  g.park(13.4, 10, 9); g.run(2);
  g.park(13.4, 10, 3.5); g.run(2);
  g._sim.hookVX = -7;
  g.run(3);
  check('knocked container went over', c.userData.hy === 1 && g.ev.some((e) => e.type === 'tumble'), ext(c));
  check('it lies on the ground, square', Math.abs(c.position.y - 1) < 0.03 && square(c) && c.position.x < 9, 'x=' + c.position.x.toFixed(2) + ' y=' + c.position.y.toFixed(2));
}

// 7. a fast empty hook knocks over a standing container
{
  const g = mk();
  g.run(0.3);
  const c = dropAt(g, 'container', 10, 10, 1.2);
  c.rotation.z = Math.PI / 2; c.userData.hx = 1; c.userData.hy = 3; c.position.y = 3;
  g.park(13, 10, 3); g.run(0.5);
  g._sim.hookVX = -9;
  g.run(3);
  check('hook knocked it over', c.userData.hy === 1 && Math.abs(c.position.y - 1) < 0.03, ext(c));
}

// 8. a top heavy welded shape tips onto its side instead of balancing on a corner
{
  const g = mk();
  g.run(0.3);
  const j = dropAt(g, 'joint', 10, 10, 1.2);
  const c = dropAt(g, 'container', 14, 10, 1.2);
  check('welded L', j.userData.asm && j.userData.asm === c.userData.asm);
  // carry it, flip so the container hangs out to one side above the joint
  g.park(10, 10, 2.5); g.run(0.6); g.grab(); g.run(0.3);
  check('grabbed by the joint', g._sim.carrying === j);
  g.park(10, 10, 16); g.run(1.5);
  g.flip(); g.run(0.6);
  g.park(-12, 12, 16); g.run(3);
  g.park(-12, 12, 9); g.run(2);
  g.grab(); g.run(6);
  check('shape came to rest', g._falling.length === 0);
  check('both pieces square and on the ground or stacked', square(j) && square(c) && j.position.y - j.userData.hy > -0.03 && c.position.y - c.userData.hy > -0.03,
    'j ' + j.position.y.toFixed(2) + ' c ' + c.position.y.toFixed(2) + ' ' + ext(c));
}

// 9. timed rounds only ever bring crates
{
  const ev = [];
  const g = createGame({ mode: 'timed', onEvent: (e) => ev.push(e), supply: 'container' });
  g.setSupply('joint');
  for (let i = 0; i < 300; i++) g._step();
  check('timed round is crates only', g._boxes.every((b) => b.userData.kind === 'crate') && g.snapshot().supply === 'crate');
}

// 10. random play: nothing may break, hang in the air forever or end up crooked
{
  let bad = '';
  for (let seed = 1; seed <= 12 && !bad; seed++) {
    const g = mk(seed * 7919, 12);
    let r = seed * 104729;
    const rnd = () => { r = (r * 16807) % 2147483647; return r / 2147483647; };
    const keys = ['slewL', 'slewR', 'trolleyIn', 'trolleyOut', 'hoistUp', 'hoistDn'];
    for (let t = 0; t < 60 * 240 && !bad; t++) {
      if (t % 20 === 0) {
        g.clearInput();
        g.setInput(keys[Math.floor(rnd() * 6)], true);
        if (rnd() < 0.5) g.setInput(keys[Math.floor(rnd() * 6)], true);
        const a = rnd();
        if (a < 0.2) g.grab();
        else if (a < 0.3) g.turn();
        else if (a < 0.4) g.flip();
        else if (a < 0.47) g.setSupply(['crate', 'container', 'joint'][Math.floor(rnd() * 3)]);
        // now and then put the hook right on the truck load or over the build
        if (rnd() < 0.08) { const S = g._sim; if (!S.carrying) g.park(-1.5, 20, 3.6); else g.park(8 + rnd() * 8, -6 + rnd() * 12, 3 + rnd() * 14); }
      }
      g._step(); g._flush();
      for (const b of g._boxes) {
        const p = b.position, u = b.userData;
        if (!isFinite(p.x + p.y + p.z)) bad = 'seed ' + seed + ' NaN position';
        // a body rolling over keeps its old size until it lands, so it is checked after
        const lead = u.asm ? g._asms.get(u.asm)[0] : b;
        if (!u.smashing && !lead.userData.tumble && p.y - u.hy < -0.2) {
          bad = 'seed ' + seed + ' t ' + t + ' piece under the ground ' + (p.y - u.hy).toFixed(2) + ' ' + u.kind +
            (u.attached ? ' carried' : '') + (u.falling ? ' falling' : '') + (u.asm ? ' welded' : '') + ' size ' + ext(b) +
            (g._sim.spin ? ' spinning' : '') + (g._boxes.some((x) => x.userData.tumble) ? ' tumbling' : '');
        }
      }
    }
    if (bad) break;
    // let go and let everything settle
    g.clearInput();
    if (g._sim.carrying) g.grab();
    g.run(12);
    if (g._falling.length) bad = 'seed ' + seed + ' still falling: ' + g._falling.length;
    for (const b of g._boxes) {
      if (b.userData.smashing || b.userData.attached) continue;
      if (!square(b)) bad = 'seed ' + seed + ' crooked piece';
      if (b.userData.falling) bad = bad || 'seed ' + seed + ' falling flag left on';
    }
    for (const [id, list] of g._asms) {
      if (list.length < 2) bad = 'seed ' + seed + ' assembly of ' + list.length;
      if (list.some((m) => m.userData.asm !== id)) bad = 'seed ' + seed + ' assembly id mismatch';
    }
    console.log('  seed ' + seed + ': ' + g._boxes.length + ' pieces, ' + g._asms.size + ' welded shapes, ' +
      g.ev.filter((e) => e.type === 'weld').length + ' welds, ' + g.ev.filter((e) => e.type === 'tumble').length + ' tumbles, ' +
      g.ev.filter((e) => e.type === 'smash').length + ' smashes');
  }
  check('random play stays sound', !bad, bad);
}

console.log(failed ? failed + ' FAILED' : 'ALL PASSED');
process.exit(failed ? 1 : 0);
