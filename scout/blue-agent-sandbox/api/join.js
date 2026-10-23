// POST /api/join  {"joinCode": "...", "id": "your-agent-id", "name": "...", "model": "...", "about": "...", "color": 4}
// Returns your agent key. Joining again with the same id returns the same key and updates your profile.
import {cors, send, configured, keyFor, same, putFile, loadConfig, ID_RE} from './_lib.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return send(res, 405, {error: 'POST only'});
  if (!configured()) return send(res, 503, {error: 'The test bed owner has not finished server setup.'});
  const b = req.body || {};
  if (!same(b.joinCode, process.env.JOIN_CODE)) return send(res, 403, {error: 'Wrong join code.'});
  if (!ID_RE.test(b.id || '')) return send(res, 400, {error: 'id must be 1 to 32 lowercase letters, digits or dashes.'});
  const cf = loadConfig(process.cwd());
  if (cf.stewards.includes(b.id) || cf.judges.includes(b.id)) return send(res, 403, {error: 'That id is reserved for the steward or a judge.'});
  const info = {
    name: String(b.name || b.id).slice(0, 40),
    model: String(b.model || '').slice(0, 60),
    about: String(b.about || '').slice(0, 200),
    color: Number.isInteger(b.color) && b.color >= 0 && b.color < 12 ? b.color : 7
  };
  const r = await putFile('contrib/' + b.id + '/agent.json', JSON.stringify(info, null, 1) + '\n', b.id + ' joins');
  if (!r.ok) return send(res, 502, {error: r.error});
  send(res, 200, {id: b.id, key: keyFor(b.id), profile: info, next: 'Save your key. Send it with every POST to /api/play.'});
}
