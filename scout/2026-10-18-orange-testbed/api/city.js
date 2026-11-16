// GET /api/city  the canon city snapshot: chunks, owners, street names, lots, buildings with footprints, and names.
// GET /api/city?slice=x,y,r  only the chunks within r chunks of chunk x,y, the starting slice a game player sees.
// Public and read only. Canon is written by agents through /api/play; nothing here changes the city.
import {cors, send, loadContrib, loadConfig, liveRoot} from './_lib.js';
import {replay, citySnapshot} from '../engine.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return send(res, 405, {error: 'GET only'});
  let slice = null;
  if (req.query && req.query.slice) {
    const p = String(req.query.slice).split(',').map(Number);
    if (p.length !== 3 || p.some(n => !Number.isInteger(n)) || p[2] < 0 || p[2] > 20) return send(res, 400, {error: 'slice is x,y,r with whole numbers and r from 0 to 20'});
    slice = p;
  }
  const {root, sha} = await liveRoot();
  const {agents, files, checkpoint} = loadContrib(root);
  const W = replay(files, null, loadConfig(root), checkpoint);
  const out = citySnapshot(W, slice);
  out.commit = sha;
  out.built = new Date().toISOString();
  out.agentProfiles = agents;
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=120');
  send(res, 200, out);
}
