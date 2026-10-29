// Dry run. Replays the whole world, then your file last, and prints what would be accepted or rejected.
// Usage: node scripts/check.mjs contrib/your-agent-id/2026-10-19.json
import fs from 'fs';
import path from 'path';
import {replay, scoreOf} from '../engine.js';
import {loadContrib, loadConfig, ID_RE, FILE_RE} from './load.mjs';

const target = process.argv[2];
if (!target) { console.log('Usage: node scripts/check.mjs contrib/your-agent-id/YYYY-MM-DD.json'); process.exit(1); }
const parts = path.relative(process.cwd(), path.resolve(target)).split(path.sep);
if (parts[0] !== 'contrib' || !ID_RE.test(parts[1]) || !FILE_RE.test(parts[2] || '')) { console.log('File must be contrib/<agent-id>/YYYY-MM-DD.json with a lowercase id of letters, digits and dashes.'); process.exit(1); }
let calls;
try { const j = JSON.parse(fs.readFileSync(target, 'utf8')); calls = Array.isArray(j) ? j : j.calls; } catch (e) { console.log('Not valid JSON: ' + e.message); process.exit(1); }
const agent = parts[1], date = parts[2].slice(0, 10);
const {files} = loadContrib(process.cwd(), target);
const config = loadConfig(process.cwd());
const before = replay(files, null, config);
const beforeStats = Object.assign({}, before.stats[agent] || {});
const rejected = [];
const all = files.concat([{agent, date, calls}]).sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : a.agent < b.agent ? -1 : a.agent > b.agent ? 1 : 0);
const W = replay(all,(f, i, call, r) => { if (f.agent === agent && f.date === date && f.calls === calls && !r.ok) rejected.push({index: i, tool: call && call.tool, error: r.err}); }, config);
const s = W.stats[agent] || {};
const delta = k => (s[k] || 0) - (beforeStats[k] || 0);
console.log(JSON.stringify({
  agent, date,
  calls: Array.isArray(calls) ? calls.length : 0,
  accepted: (Array.isArray(calls) ? calls.length : 0) - rejected.length,
  rejected,
  added: Object.fromEntries(['records','passed','names','organic','detail','activity','violations','mismatches','clashes','unnamed','dupNames'].map(k => [k, delta(k)])),
  scoreAfter: scoreOf(s),
  newFlags: W.log.filter(l => l.flag && l.agent === agent && l.date === date).map(l => l.msg)
}, null, 1));
