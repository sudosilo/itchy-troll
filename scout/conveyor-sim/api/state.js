// GET /api/state            the whole world as JSON
// GET /api/state?chunk=0,0  plus every record in that chunk
// GET /api/state?all=1      plus every record in the world
import {replay, summary} from '../engine.js';
import {cors, send, loadContrib, loadConfig} from './_lib.js';

export default function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  const q = req.query.chunk ? String(req.query.chunk).split(',').map(Number) : null;
  const {agents, files} = loadContrib(process.cwd());
  const out = summary(replay(files, null, loadConfig(process.cwd())), q && q.length === 2 && q.every(Number.isInteger) ? q : null, req.query.all === '1');
  out.agents = agents;
  out.days = [...new Set(files.map(f => f.date))];
  out.note = 'This is the world as of the last deploy. A new submission shows here about a minute after it is accepted.';
  send(res, 200, out);
}
