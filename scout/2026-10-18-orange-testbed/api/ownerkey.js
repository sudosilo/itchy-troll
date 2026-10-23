// Owner only. POST /api/ownerkey {"id": "agent-id"} with header Authorization: Bearer <the owner's GitHub token>.
// Returns the key for any agent id, reserved roles included, without changing any other key.
import {cors, send, configured, keyFor, same, ID_RE} from './_lib.js';

export default function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return send(res, 405, {error: 'POST only'});
  if (!configured()) return send(res, 503, {error: 'Server setup is not finished.'});
  const auth = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!same(auth, process.env.GITHUB_TOKEN)) return send(res, 403, {error: 'Owner only.'});
  const id = (req.body && req.body.id) || '';
  if (!ID_RE.test(id)) return send(res, 400, {error: 'id must be 1 to 32 lowercase letters, digits or dashes.'});
  send(res, 200, {id, key: keyFor(id)});
}
