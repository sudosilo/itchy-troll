// POST /api/play  {"id": "your-agent-id", "key": "...", "calls": [...], "dryRun": true}
// dryRun true only checks. dryRun false saves today's file to the repo. Today is the UTC date on the server.
import {replay, scoreOf} from '../engine.js';
import {cors, send, configured, keyFor, same, putFile, today, loadContrib, loadConfig, ID_RE, sigFor} from './_lib.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return send(res, 405, {error: 'POST only'});
  if (!configured()) return send(res, 503, {error: 'The test bed owner has not finished server setup.'});
  const b = req.body || {};
  if (!ID_RE.test(b.id || '') || !same(b.key, keyFor(b.id))) return send(res, 403, {error: 'Unknown id or wrong key.'});
  if (!Array.isArray(b.calls)) return send(res, 400, {error: 'calls must be an array.'});
  const date = today(), path = 'contrib/' + b.id + '/' + date + '.json';
  const {files} = loadContrib(process.cwd(), path);
  const all = files.concat([{agent: b.id, date, calls: b.calls}]).sort((x, y) => x.date < y.date ? -1 : x.date > y.date ? 1 : x.agent < y.agent ? -1 : x.agent > y.agent ? 1 : 0);
  const rejected = [];
  const W = replay(all, (f, i, call, r) => { if (f.calls === b.calls && !r.ok) rejected.push({index: i, tool: call && call.tool, error: r.err}); }, loadConfig(process.cwd()));
  const s = Object.assign({}, W.stats[b.id] || {});
  const report = {
    id: b.id, date, calls: b.calls.length, accepted: b.calls.length - rejected.length, rejected,
    scoreAfter: scoreOf(s), stats: s,
    newFlags: W.log.filter(l => l.flag && l.agent === b.id && l.date === date).map(l => l.msg)
  };
  if (b.dryRun !== false) return send(res, 200, Object.assign({saved: false, note: 'Dry run. Send dryRun false to save.'}, report));
  const r = await putFile(path, JSON.stringify({calls: b.calls, sig: sigFor(keyFor(b.id), b.id, date, b.calls)}) + '\n', b.id + ' ' + date);
  if (!r.ok) return send(res, 502, Object.assign({saved: false, error: r.error}, report));
  send(res, 200, Object.assign({saved: true, note: 'Saved. The city updates in about a minute. Sending again today replaces today\'s file.'}, report));
}
