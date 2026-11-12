// Reads every agent folder under contrib and returns turn files sorted by time, then agent id.
// When a checkpoint exists, it also returns the frozen city from it, and only turns timed after the checkpoint are returned.
import fs from 'fs';
import path from 'path';
import {sigOk} from './sig.mjs';

export const ID_RE = /^[a-z0-9-]{1,32}$/;
// A turn file is named by its UTC time, YYYY-MM-DDTHHMMSS.json. Older files named by day only still load.
export const FILE_RE = /^(\d{4}-\d{2}-\d{2}(?:T\d{6})?)\.json$/;
export const PROJECT = '2026-10-18-orange-testbed';
export const CHECKPOINT_DIR = 'checkpoint';
export const ARCHIVE_DIR = 'archive';
export const CHECKPOINT_RE = new RegExp('^' + PROJECT + '-checkpoint-v(\\d+)\\.json$');

export const byTime = (a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : a.agent < b.agent ? -1 : a.agent > b.agent ? 1 : 0;

export function loadConfig(root){
  try { const j = JSON.parse(fs.readFileSync(path.join(root, 'testbed.json'), 'utf8')); return {stewards: j.stewards || [], judges: j.judges || [], detailers: j.detailers || [], elections: j.elections || []}; } catch (e) { return {stewards: [], judges: [], detailers: [], elections: []}; }
}

function readTurn(abs){
  try { const j = JSON.parse(fs.readFileSync(abs, 'utf8')); return {calls: Array.isArray(j) ? j : j.calls, sig: j.sig}; } catch (e) { return {calls: null, sig: null}; }
}

// Path of the newest checkpoint file, relative to root, or null.
export function checkpointPath(root){
  const dir = path.join(root, CHECKPOINT_DIR);
  if (!fs.existsSync(dir)) return null;
  let best = null, bv = -1;
  for (const f of fs.readdirSync(dir)) { const m = f.match(CHECKPOINT_RE); if (m && +m[1] > bv) { bv = +m[1]; best = CHECKPOINT_DIR + '/' + f; } }
  return best;
}

// Reads the newest checkpoint. With the server secret present, every archived turn it lists must still be in the
// archive with a valid signature, or the checkpoint is ignored and the whole city is replayed from the archive instead.
export function loadCheckpoint(root){
  const rel = checkpointPath(root);
  if (!rel) return {checkpoint: null, problems: []};
  let j;
  try { j = JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8')); } catch (e) { return {checkpoint: null, path: rel, problems: [rel + ' is not valid JSON']}; }
  const problems = [];
  if (!j.world || typeof j.through !== 'string') problems.push(rel + ' has no world or through time');
  if (process.env.KEY_SECRET && !problems.length) {
    for (const f of j.files || []) {
      const t = readTurn(path.join(root, f.path));
      if (!t.calls) problems.push(f.path + ' is missing from the archive');
      else if ((t.sig || null) !== (f.sig || null) || !sigOk(process.env.KEY_SECRET, f.agent, f.date, t.calls, t.sig)) problems.push(f.path + ' fails its signature');
    }
  }
  if (problems.length) return {checkpoint: null, path: rel, file: j, problems};
  return {checkpoint: Object.assign({}, j.world, {through: j.through, version: j.version}), path: rel, file: j, problems};
}

// Every archived turn file, for a full replay when the checkpoint cannot be trusted.
function loadArchive(root, files, dropped){
  const dir = path.join(root, ARCHIVE_DIR);
  if (!fs.existsSync(dir)) return;
  for (const id of fs.readdirSync(dir).sort()) {
    const ad = path.join(dir, id);
    if (!ID_RE.test(id) || !fs.statSync(ad).isDirectory()) continue;
    for (const f of fs.readdirSync(ad).sort()) {
      const m = f.match(FILE_RE); if (!m) continue;
      const rel = ARCHIVE_DIR + '/' + id + '/' + f, t = readTurn(path.join(ad, f));
      if (process.env.KEY_SECRET && !sigOk(process.env.KEY_SECRET, id, m[1], t.calls, t.sig)) { dropped.push(rel); continue; }
      files.push({agent: id, date: m[1], path: rel, calls: t.calls, archived: true});
    }
  }
}

export function loadContrib(root, skipPath){
  const dir = path.join(root, 'contrib');
  const agents = [], files = [], dropped = [], stale = [];
  const cp = loadCheckpoint(root);
  const through = cp.checkpoint ? cp.checkpoint.through : null;
  if (!cp.checkpoint && cp.file) loadArchive(root, files, dropped);
  if (fs.existsSync(dir)) {
    for (const id of fs.readdirSync(dir).sort()) {
      const ad = path.join(dir, id);
      if (!ID_RE.test(id) || !fs.statSync(ad).isDirectory()) continue;
      let info = {};
      const ap = path.join(ad, 'agent.json');
      if (fs.existsSync(ap)) { try { info = JSON.parse(fs.readFileSync(ap, 'utf8')); } catch (e) { info = {error: 'agent.json is not valid JSON'}; } }
      agents.push({id, info});
      for (const f of fs.readdirSync(ad).sort()) {
        const m = f.match(FILE_RE); if (!m) continue;
        const rel = 'contrib/' + id + '/' + f;
        if (skipPath && path.resolve(root, rel) === path.resolve(skipPath)) continue;
        // Turns timed at or before the checkpoint can never be added to the frozen city.
        if (through && m[1] <= through) { stale.push(rel); continue; }
        const t = readTurn(path.join(ad, f));
        // With the server secret present (builds and the web API), unsigned or forged files are dropped.
        if (process.env.KEY_SECRET && !sigOk(process.env.KEY_SECRET, id, m[1], t.calls, t.sig)) { dropped.push(rel); continue; }
        files.push({agent: id, date: m[1], path: rel, calls: t.calls});
      }
    }
  }
  // Agents that only have archived turns still get listed.
  const known = new Set(agents.map(a => a.id));
  for (const f of (cp.file && cp.file.files) || []) if (!known.has(f.agent)) { known.add(f.agent); agents.push({id: f.agent, info: {}}); }
  agents.sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  files.sort(byTime);
  return {agents, files, dropped, stale, checkpoint: cp.checkpoint, checkpointPath: cp.checkpoint ? cp.path : null, checkpointFile: cp.file || null, checkpointProblems: cp.problems};
}
