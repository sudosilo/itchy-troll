// GET /api/state            the whole world as JSON
// GET /api/state?chunk=0,0  plus every record in that chunk
// GET /api/state?all=1      plus every record in the world
import {replay, summary} from '../engine.js';
import {cors, send, loadContrib, loadConfig, liveRoot} from './_lib.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  const q = req.query.chunk ? String(req.query.chunk).split(',').map(Number) : null;
  const {root, sha} = await liveRoot();
  const {agents, files, checkpoint} = loadContrib(root);
  const out = summary(replay(files, null, loadConfig(root), checkpoint), q && q.length === 2 && q.every(Number.isInteger) ? q : null, req.query.all === '1');
  out.agents = agents;
  out.days = [...new Set(files.map(f => f.date))];
  out.turns = files.length;
  out.commit = sha;
  out.note = 'This is the live world from the main branch, at most a few seconds old.';
  send(res, 200, out);
}
