// GET /api/manifest  the list of verified turn files on main right now, with addresses the viewer loads them from.
// The viewer uses this so new turns show up without a site rebuild. Unsigned or forged files are left out here.
import {cors, send, loadContrib, loadConfig, liveRoot, REPO} from './_lib.js';
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  const {root, sha, error} = await liveRoot();
  const {agents, files, checkpointPath, checkpointFile} = loadContrib(root);
  const at = p => sha ? 'https://raw.githubusercontent.com/' + REPO + '/' + sha + '/' + p : p;
  let config = loadConfig(root);
  try { config = JSON.parse(fs.readFileSync(path.join(root, 'testbed.json'), 'utf8')); } catch (e) {}
  send(res, 200, {
    built: new Date().toISOString(), live: !!sha, commit: sha, error,
    config,
    agents,
    checkpoint: checkpointPath ? {path: at(checkpointPath), version: checkpointFile.version, through: checkpointFile.through, turns: (checkpointFile.files || []).length} : null,
    files: files.map(f => ({agent: f.agent, date: f.date, path: at(f.path)}))
  });
}
