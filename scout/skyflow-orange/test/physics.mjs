// Headless physics checks. Run from the build folder: node ../test/physics.mjs
import { createGame, RULES, ROUND_SECONDS } from '../src/game.js';

let failed = 0;
function check(name, ok, extra) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : ''));
  if (!ok) failed++;
}

function mk(mode, seed) {
  let s = seed || 1;
  const random = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const ev = [];
  const g = createGame({ mode: mode || 'free', onEvent: (e) => ev.push(e), random, freeWind: 0 });
  g.ev = ev;
  g.run = (sec) => { const n = Math.round(sec * 60); for (let i = 0; i < n; i++) { g._step(); g._flush(); } };
  // drive the crane to put the hook over x,z at hook height y, by direct state set
  g.park = (x, z, hookY) => {
    const S = g._sim;
    S.trolley = Math.hypot(x, z);
    S.slew = Math.atan2(-z, x);
    S.hookX = x; S.hookZ = z; S.hookVX = 0; S.hookVZ = 0;
    S.cable = 62.8 - hookY;
  };
  return g;
}

// 1. crate spawns on the truck and can be grabbed
{
  const g = mk('free');
  g.run(0.5);
  check('one crate on truck', g._boxes.length === 1 && g._boxes[0].userData.onTruck);
  g.park(-1, 20, 3.0);
  g.run(0.5);
  check('hook rests on truck crate', Math.abs(g._sim.hookY - (3.25 + 0.4)) < 0.05, 'hookY=' + g._sim.hookY.toFixed(2));
  g.grab(); g.run(0.2);
  check('grabbed', !!g._sim.carrying);
  // lift and carry to open ground, set down, release
  g.park(-1, 20, 9); g.run(1);
  g.park(10, 10, 9); g.run(3);
  g.park(10, 10, 1.0); g.run(2);
  check('carried crate rests on ground', Math.abs(g._sim.carrying.position.y - 1) < 0.02, 'y=' + g._sim.carrying.position.y.toFixed(2));
  check('cable slack when set down', g._sim.slack > 0);
  g.grab(); g.run(1);
  check('released and settled', !g._sim.carrying && g._falling.length === 0);
  check('height 2 ft', Math.abs(g._round.heightFt - 2) < 0.01, 'h=' + g._round.heightFt);
  g.run(3.2);
  check('truck respawned', g._boxes.filter((b) => b.userData.onTruck).length === 1);
}

// helper: place a crate by teleporting it above a spot and dropping it as a player drop
function dropAt(g, x, z, y) {
  const c = g._spawn();
  c.userData.onTruck = false;
  c.userData.dropped = true;
  c.position.set(x, y, z);
  c.userData.falling = true;
  g._falling.push(c);
  g.run(3);
  return c;
}

// 2. stacking, scoring and perfect combo
{
  const g = mk('timed');
  g.run(3.5);
  check('round playing after countdown', g._round.phase === 'playing');
  dropAt(g, 10, 10, 1.2);
  dropAt(g, 10.1, 10, 3.2);
  dropAt(g, 10.1, 10.1, 5.2);
  check('three high = 6 ft', Math.abs(g._round.heightFt - 6) < 0.01, 'h=' + g._round.heightFt);
  const places = g.ev.filter((e) => e.type === 'place');
  check('two placements scored', places.length === 2, JSON.stringify(places.map((p) => [p.quality, p.points])));
  check('perfect combo grows', places[0].points === 150 && places[1].points === 200);
  const snap = g.snapshot();
  check('live score = 600 + 350', snap.score === 950, 'score=' + snap.score);
  // great and ok
  dropAt(g, 10.5, 10.1, 7.2);
  dropAt(g, 11.3, 10.1, 9.2);
  const p2 = g.ev.filter((e) => e.type === 'place').slice(2);
  check('great then ok', p2[0].quality === 'great' && p2[1].quality === 'ok', JSON.stringify(p2.map((p) => [p.quality, p.offset.toFixed(2)])));
}

// 3. topple when more than half off
{
  const g = mk('timed');
  g.run(3.5);
  dropAt(g, 10, 10, 1.2);
  const c = dropAt(g, 11.3, 10, 3.2);
  check('overhanging crate fell to ground', Math.abs(c.position.y - 1) < 0.02, 'y=' + c.position.y.toFixed(2));
  check('miss event', g.ev.some((e) => e.type === 'miss'));
  check('height stays 2', Math.abs(g._round.heightFt - 2) < 0.01);
}

// 4. lean collapse: staircase of 0.9 offsets must not stand
{
  const g = mk('timed');
  g.run(3.5);
  for (let i = 0; i < 6; i++) dropAt(g, 10 + i * 0.9, 10, 1.2 + i * 2);
  check('staircase collapsed', g.ev.some((e) => e.type === 'collapse'), 'h=' + g._round.heightFt);
  check('tower shorter than 12', g._round.heightFt < 12);
}

// 5. pulling out the base drops the tower, with penalties
{
  const g = mk('timed');
  g.run(3.5);
  const base = dropAt(g, 10, 10, 1.2);
  dropAt(g, 10, 10, 3.2);
  dropAt(g, 10, 10, 5.2);
  const before = g._round.penalty;
  base.userData.falling = true; g._falling.push(base); base.userData.vx = 9; base.userData.vz = 0;
  g.run(4);
  check('tower fell after base knocked out', g._round.heightFt <= 4.01, 'h=' + g._round.heightFt);
  check('fall penalty applied', g._round.penalty > before, 'pen=' + g._round.penalty);
  check('nothing left in the air', g._falling.length === 0 && g._boxes.every((b) => b.userData.onTruck || Math.abs((b.position.y - 1) % 2) < 0.02));
}

// 6. truck smash
{
  const g = mk('timed');
  g.run(3.5);
  const c = dropAt(g, 2.5, 20, 8);
  check('crate dropped on truck cab is smashed', g.ev.some((e) => e.type === 'smash') && g._boxes.indexOf(c) === -1);
  check('smash penalty', g._round.penalty === RULES.smash);
  const d = g._spawn(); d.userData.onTruck = false; d.position.set(-4.4, 1, 20); d.userData.falling = true; g._falling.push(d); d.userData.vx = 8;
  g.run(2);
  check('crate sliding into bed is smashed', g._boxes.indexOf(d) === -1);
}

// 7. carried crate knocks a ground crate, hook bumps a stack side
{
  const g = mk('free');
  g.run(0.5);
  const a = dropAt(g, 10, 10, 1.2);
  g.park(-1, 20, 3.7); g.run(0.3); g.grab(); g.run(0.2);
  g.park(-1, 20, 8); g.run(0.5);
  g.park(13, 10, 8); g.run(2);
  g.park(13, 10, 2.5); g.run(2);
  const S = g._sim;
  S.hookVX = -6;
  g.run(1.5);
  check('ground crate shoved by carried crate', a.position.x < 9.5, 'x=' + a.position.x.toFixed(2));
}
{
  const g = mk('free');
  g.run(0.5);
  dropAt(g, 10, 10, 1.2);
  dropAt(g, 10, 10, 3.2);
  g.park(13, 10, 2.0); g.run(1);
  g._sim.hookVX = -8;
  g.run(0.5);
  check('empty hook stops at stack side', g._sim.hookX > 11.3, 'x=' + g._sim.hookX.toFixed(2));
  check('hook did not pop on top', g._sim.hookY < 3);
  g.park(10, 10, 9); g.run(0.3);
  g.park(10, 10, 2); g.run(1);
  check('hook lands on stack top', Math.abs(g._sim.hookY - 4.4) < 0.05, 'y=' + g._sim.hookY.toFixed(2));
}

// 8. full timed round ends and reports
{
  const g = mk('timed');
  g.run(3.5);
  dropAt(g, 10, 10, 1.2);
  dropAt(g, 10, 10, 3.2);
  g.run(ROUND_SECONDS + 8);
  const end = g.ev.find((e) => e.type === 'roundEnd');
  check('round ended', !!end && g._round.phase === 'done');
  check('final score 400 + 150', end && end.result.score === 550, end ? JSON.stringify(end.result) : '');
  check('ticks in last 10 s', g.ev.filter((e) => e.type === 'tick').length === 10);
}

// 9. wind pushes a hanging hook off plumb
{
  const g = createGame({ mode: 'free', freeWind: 20 });
  for (let i = 0; i < 600; i++) g._step();
  const s = g.snapshot();
  check('wind swings the hook', s.swing > 0.3, 'swing=' + s.swing.toFixed(2) + ' wind=' + s.windMph.toFixed(1));
}

console.log(failed ? failed + ' FAILED' : 'ALL PASSED');
process.exit(failed ? 1 : 0);
