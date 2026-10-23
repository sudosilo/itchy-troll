// Prints what Agent Orange owns and has built, so a run can pick where to deepen next.
// Usage: node tools/inventory.mjs /path/to/testbed > inventory.json
import path from 'path';
import {pathToFileURL} from 'url';

const testbed = path.resolve(process.argv[2] || '../2026-10-18-orange-testbed');
const agent = process.argv[3] || 'agent-orange';
const eng = await import(pathToFileURL(path.join(testbed, 'engine.js')).href);
const ld = await import(pathToFileURL(path.join(testbed, 'scripts', 'load.mjs')).href);
const W = eng.replay(ld.loadContrib(testbed).files, null, ld.loadConfig(testbed));
const S = eng.S;

const out = {agent, score: eng.scoreOf(W.stats[agent] || {}), chunks: [], streets: {horizontal: {}, vertical: {}}, hiddenByReferees: [], claimable: []};
// Street names on chunk edges, from every agent's street records.
for (const c of W.chunks.values()) for (const r of c.records) {
  if (r.kind !== 'line' || r.discipline !== 'street' || !r.meta || typeof r.meta.street !== 'string' || r.pts.length < 2) continue;
  const ys = r.pts.map(p => p[1]), xs = r.pts.map(p => p[0]);
  if (Math.max(...ys) - Math.min(...ys) < 400) { const row = Math.round(ys[0] / S); if (Math.abs(ys[0] - row * S) < 4000) out.streets.horizontal[row] = r.meta.street; }
  if (Math.max(...xs) - Math.min(...xs) < 400) { const col = Math.round(xs[0] / S); if (Math.abs(xs[0] - col * S) < 4000) out.streets.vertical[col] = r.meta.street; }
}
for (const c of W.chunks.values()) {
  const mine = c.records.filter(r => r.agent === agent);
  if (c.owner !== agent && !mine.length) continue;
  const buildings = {};
  for (const r of mine) if (r.kind === 'line' && r.meta && r.meta.wall && r.meta.building && r.closed && !buildings[r.meta.building]) {
    const xs = r.pts.map(p => p[0]), ys = r.pts.map(p => p[1]);
    buildings[r.meta.building] = {box: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]};
  }
  for (const b of Object.values(buildings)) b.detailRecords = mine.filter(r => eng.DETAIL.has(r.discipline) && (() => { const p = r.kind === 'line' || r.kind === 'hatch' ? r.pts[0] : r.at; return p[0] >= b.box[0] && p[0] <= b.box[2] && p[1] >= b.box[1] && p[1] <= b.box[3]; })()).length;
  const byDisc = {};
  for (const r of mine) byDisc[r.discipline] = (byDisc[r.discipline] || 0) + 1;
  const acts = mine.filter(r => r.kind === 'symbol' && r.meta && typeof r.meta.activity === 'string').map(r => r.meta.activity.trim().toLowerCase());
  out.chunks.push({chunk: [c.cx, c.cy], owner: c.owner, lastTouched: mine.reduce((m, r) => r.date > m ? r.date : m, ''), records: mine.length, byDiscipline: byDisc, buildings, activitiesUsed: acts});
  for (const r of mine) if (r.hidden) out.hiddenByReferees.push({id: r.id, chunk: [c.cx, c.cy], what: (r.meta && (r.meta.part || r.meta.activity || r.meta.building)) || r.type || r.discipline, reason: r.hidden.reason, by: r.hidden.by});
}
out.claimable = eng.summary(W).claimableChunks;
out.chunks.sort((a, b) => a.lastTouched < b.lastTouched ? -1 : 1);
console.log(JSON.stringify(out, null, 1));
