// Builds one turn from a plan file, writes it into the test bed, dry runs it, and checks for overlaps.
// Usage: node tools/turn.mjs /path/to/testbed plans/2026-10-23-a.mjs
// A plan is a module whose default export is async (kit) => {...} and uses the kit helpers.
// Prints the turn file path, the dry run result, and any overlaps. Exit code 1 means fix before submitting.
import fs from 'fs';
import path from 'path';
import {execFileSync} from 'child_process';
import {pathToFileURL} from 'url';
import {makeKit} from '../lib/kit.mjs';

const testbed = path.resolve(process.argv[2]);
const plan = path.resolve(process.argv[3]);
const agent = 'agent-orange';
const kit = await makeKit(testbed, agent);
await (await import(pathToFileURL(plan).href)).default(kit);
if (!kit.calls.length) { console.log('The plan made no calls.'); process.exit(1); }

const turn = new Date().toISOString().replace(/[-:]/g, '').replace(/^(\d{4})(\d{2})(\d{2})T(\d{6}).*$/, '$1-$2-$3T$4');
const rel = path.join('contrib', agent, turn + '.json');
fs.writeFileSync(path.join(testbed, rel), JSON.stringify({calls: kit.calls}) + '\n');
console.log('TURN FILE ' + rel + ' with ' + kit.calls.length + ' calls');

const check = JSON.parse(execFileSync('node', ['scripts/check.mjs', rel], {cwd: testbed}).toString());
console.log('DRY RUN accepted ' + check.accepted + ' of ' + check.calls + ', score after ' + check.scoreAfter);
console.log('ADDED ' + JSON.stringify(check.added));
for (const r of check.rejected) console.log('REJECTED call ' + r.index + ' ' + r.tool + ': ' + r.error);
for (const f of check.newFlags) console.log('FLAG ' + f);

// Overlap check: new ground symbols near other symbols, or sitting on structure, paving or interior lines below 2 m.
const eng = kit.eng;
const ld = await import(pathToFileURL(path.join(testbed, 'scripts', 'load.mjs')).href);
const before = eng.replay(ld.loadContrib(testbed, path.join(testbed, rel)).files, null, ld.loadConfig(testbed));
const W = eng.replay(ld.loadContrib(testbed).files, null, ld.loadConfig(testbed));
const all = []; for (const c of W.chunks.values()) for (const r of c.records) if (!r.hidden) all.push(r);
const firstNew = before.nextId;
const ground = new Set(['tree', 'shrub', 'car', 'truck', 'person', 'dog', 'bench', 'table', 'bike', 'cyclist', 'cart', 'umbrella', 'pole', 'hydrant', 'sign']);
const pair = new Set(['umbrella', 'table', 'bench']);
const syms = all.filter(r => r.kind === 'symbol' && ground.has(r.type) && r.at[2] > -100 && r.at[2] < 600 && !(r.meta && r.meta.anim && r.meta.anim.type === 'path'));
const lines = all.filter(r => r.kind === 'line' && ['structure', 'paving', 'interior'].includes(r.discipline) && r.pts.every(p => p[2] < 2000));
const segD = (p, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy || 1; let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L; t = Math.max(0, Math.min(1, t)); return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy); };
const label = r => (r.meta && (r.meta.activity || r.meta.part || r.meta.text)) || r.type;
let overlaps = 0;
for (const s of syms.filter(r => r.id >= firstNew)) {
  for (const o of syms) if (o.id !== s.id && Math.hypot(o.at[0] - s.at[0], o.at[1] - s.at[1]) < 700 && !(pair.has(s.type) || pair.has(o.type))) { overlaps++; console.log('OVERLAP ' + s.type + ' "' + label(s) + '" is near ' + o.agent + ' ' + o.type + ' "' + label(o) + '"'); }
  for (const l of lines) { const sg = eng.recSegs(l); for (let i = 0; i < sg.length; i += 2) if (segD(s.at, sg[i], sg[i + 1]) < 250) { overlaps++; console.log('ON LINE ' + s.type + ' "' + label(s) + '" sits on ' + l.agent + ' "' + ((l.meta && (l.meta.part || l.meta.building)) || l.discipline) + '"'); break; } }
}
console.log('OVERLAPS ' + overlaps + ' (people seated in a chair or at a table are fine; fix the rest)');

// Other agents must come out exactly as before.
for (const a of Object.keys(W.stats)) if (a !== agent && JSON.stringify(W.stats[a]) !== JSON.stringify(before.stats[a] || W.stats[a])) console.log('WARNING this turn changes the result for ' + a);
process.exit(check.rejected.length || check.newFlags.length ? 1 : 0);
