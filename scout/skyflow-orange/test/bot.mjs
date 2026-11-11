// A simple input-only bot that plays a timed round, to size up pacing and scores.
// Run from the build folder: node ../test/bot.mjs [patienceSeconds] [seed]
import { createGame } from '../src/game.js';

const patience = parseFloat(process.argv[2] || '0.5');
let seed = parseInt(process.argv[3] || '7', 10);
const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

const ev = [];
const g = createGame({ mode: 'timed', onEvent: (e) => ev.push(e), random });
const S = g._sim;
const R = g._round;

const stack = { x: 12, z: 14 };
let state = 'toTruck';
let hold = 0;
let cycles = 0;

function aim(x, z, hookY, tolA, tolR) {
  const a = Math.atan2(-z, x);
  let da = a - S.slew;
  while (da > Math.PI) da -= Math.PI * 2;
  while (da < -Math.PI) da += Math.PI * 2;
  const r = Math.hypot(x, z);
  const dr = r - S.trolley;
  const wantCable = 62.8 - hookY;
  const dc = wantCable - S.cable;
  g.setInput('slewL', da > tolA); g.setInput('slewR', da < -tolA);
  g.setInput('trolleyOut', dr > tolR); g.setInput('trolleyIn', dr < -tolR);
  g.setInput('hoistDn', dc > 0.15); g.setInput('hoistUp', dc < -0.15);
  return Math.abs(da) <= tolA && Math.abs(dr) <= tolR && Math.abs(dc) <= 0.3;
}

const stackTop = () => R.heightFt;
let steps = 0;
while (R.phase !== 'done' && steps < 60 * 400) {
  steps++;
  if (R.phase === 'playing') {
    const snap = g.snapshot();
    const carryY = stackTop() + 6;
    if (state === 'toTruck') {
      if (aim(-1, 20, Math.max(7, S.hookY > 7 ? 7 : 7), 0.01, 0.15) && snap.swing < 0.6) state = 'lowerTruck';
    } else if (state === 'lowerTruck') {
      aim(-1, 20, 2.5, 0.01, 0.15);
      if (S.slack > 0.05 || snap.canGrab && S.hookY < 4.2) { g.grab(); state = 'lift'; hold = 0; }
    } else if (state === 'lift') {
      if (!S.carrying) { hold++; if (hold > 30) state = 'toTruck'; }
      else if (aim(-1, 20, carryY + 1.4, 0.5, 5)) state = 'toStack';
    } else if (state === 'toStack') {
      if (!S.carrying) { state = 'toTruck'; continue; }
      if (aim(stack.x, stack.z, carryY + 1.4, 0.004, 0.08) && snap.swing < 0.35) { state = 'lower'; hold = 0; }
    } else if (state === 'lower') {
      if (!S.carrying) { state = 'toTruck'; continue; }
      aim(stack.x, stack.z, stackTop() + 0.5, 0.004, 0.08);
      if (S.slack > 0.05) { hold += 1 / 60; if (hold >= patience) { g.grab(); state = 'rise'; cycles++; } }
    } else if (state === 'rise') {
      if (aim(stack.x, stack.z, stackTop() + 6, 0.5, 5)) state = 'toTruck';
    }
  } else {
    g.clearInput();
  }
  g._step();
  g._flush();
}
const end = ev.find((e) => e.type === 'roundEnd');
const places = ev.filter((e) => e.type === 'place').map((p) => p.quality[0] + p.offset.toFixed(2));
console.log('patience', patience, 'cycles', cycles, 'result', JSON.stringify(end && end.result));
console.log('placements', places.join(' '), '| misses', ev.filter((e) => e.type === 'miss').length,
  'collapses', ev.filter((e) => e.type === 'collapse').length, 'smashes', ev.filter((e) => e.type === 'smash').length);
