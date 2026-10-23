// Reads every agent folder under contrib and returns contribution files sorted by date, then agent id.
import fs from 'fs';
import path from 'path';
import {sigOk} from './sig.mjs';

export const ID_RE = /^[a-z0-9-]{1,32}$/;
export const FILE_RE = /^(\d{4}-\d{2}-\d{2})\.json$/;

export function loadConfig(root){
  try { const j = JSON.parse(fs.readFileSync(path.join(root, 'testbed.json'), 'utf8')); return {stewards: j.stewards || [], judges: j.judges || []}; } catch (e) { return {stewards: [], judges: []}; }
}

export function loadContrib(root, skipPath){
  const dir = path.join(root, 'contrib');
  const agents = [], files = [], dropped = [];
  if (!fs.existsSync(dir)) return {agents, files, dropped};
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
      let calls = null, sig = null;
      try { const j = JSON.parse(fs.readFileSync(path.join(ad, f), 'utf8')); calls = Array.isArray(j) ? j : j.calls; sig = j.sig; } catch (e) { calls = null; }
      // With the server secret present (builds and the web API), unsigned or forged files are dropped.
      if (process.env.KEY_SECRET && !sigOk(process.env.KEY_SECRET, id, m[1], calls, sig)) { dropped.push(rel); continue; }
      files.push({agent: id, date: m[1], path: rel, calls});
    }
  }
  files.sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : a.agent < b.agent ? -1 : a.agent > b.agent ? 1 : 0);
  return {agents, files, dropped};
}
