// Runs in GitHub Actions on every pull request, using the code on main, never the code in the pull request.
// A submission passes only if it touches one agent folder, adds or replaces signed daily files dated around today,
// and every file is signed with that agent's key. Anything else is refused.
import {replay, scoreOf} from '../engine.js';
import {loadContrib, loadConfig, ID_RE} from './load.mjs';
import {sigOk} from './sig.mjs';

const {GH_TOKEN, KEY_SECRET, PR, REPO} = process.env;
const api = async (p, opts = {}) => {
  const r = await fetch('https://api.github.com/repos/' + REPO + p, {...opts, headers: {Authorization: 'Bearer ' + GH_TOKEN, Accept: 'application/vnd.github+json', 'User-Agent': 'testbed-verify', ...(opts.headers || {})}});
  if (!r.ok && !opts.soft) throw new Error(p + ' ' + r.status);
  return r.status === 204 ? null : r.json();
};
const comment = (body) => api('/issues/' + PR + '/comments', {method: 'POST', body: JSON.stringify({body})});
const fail = async (reasons, close) => {
  await comment('Submission refused.\n\n' + reasons.map(r => '- ' + r).join('\n') + (close ? '\n\nThis pull request has been closed. Fix the problems and open a new one.' : ''));
  if (close) await api('/pulls/' + PR, {method: 'PATCH', body: JSON.stringify({state: 'closed'})});
  console.log(reasons.join('\n'));
  process.exit(1);
};

const pr = await api('/pulls/' + PR);
const files = [];
for (let page = 1; ; page++) { const b = await api('/pulls/' + PR + '/files?per_page=100&page=' + page); files.push(...b); if (b.length < 100) break; }
const RE = /^contrib\/([a-z0-9-]{1,32})\/(agent\.json|(\d{4}-\d{2}-\d{2})\.json)$/;
const outside = files.filter(f => !RE.test(f.filename));
if (outside.length) await fail(['This pull request changes files outside an agent folder: ' + outside.map(f => f.filename).join(', ') + '. Only the owner can merge changes to the game itself.'], false);
const ids = [...new Set(files.map(f => f.filename.match(RE)[1]))];
const reasons = [];
if (ids.length !== 1) reasons.push('A submission must touch exactly one agent folder. This one touches: ' + ids.join(', '));
for (const f of files) if (!['added', 'modified'].includes(f.status)) reasons.push(f.filename + ' is ' + f.status + '. Files can only be added or replaced.');
if (!KEY_SECRET) reasons.push('The verifier has no KEY_SECRET. The owner must finish setup.');
if (reasons.length) await fail(reasons, true);

const id = ids[0];
const now = Date.now(), ok = new Set([-1, 0, 1].map(d => new Date(now + d * 86400000).toISOString().slice(0, 10)));
const daily = [];
for (const f of files) {
  const m = f.filename.match(RE);
  const c = await api('/contents/' + f.filename + '?ref=' + pr.head.sha);
  if (c.size > 3000000) { reasons.push(f.filename + ' is larger than 3 MB.'); continue; }
  let j; try { j = JSON.parse(Buffer.from(c.content, 'base64').toString('utf8')); } catch (e) { reasons.push(f.filename + ' is not valid JSON.'); continue; }
  if (m[2] === 'agent.json') { if (typeof j !== 'object' || Array.isArray(j) || JSON.stringify(j).length > 2000) reasons.push('agent.json must be a small JSON object.'); continue; }
  const date = m[3];
  if (!ok.has(date)) reasons.push(f.filename + ' is dated ' + date + '. Only yesterday, today or tomorrow in UTC can be submitted, and past days can never be changed.');
  if (!sigOk(KEY_SECRET, id, date, j.calls, j.sig)) reasons.push(f.filename + ' is not signed with the key for ' + id + '. Sign it with: AGENT_KEY=yourkey node scripts/sign.mjs ' + f.filename);
  daily.push({agent: id, date, calls: j.calls, path: f.filename});
}
if (!daily.length) reasons.push('No daily file. agent.json can only come with a signed daily file.');
if (reasons.length) await fail(reasons, true);

// Dry run against the city on main, for the report.
const root = process.cwd(), config = loadConfig(root);
const {files: existing} = loadContrib(root);
const keep = existing.filter(e => !daily.some(d => d.path === e.path));
const all = keep.concat(daily).sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : a.agent < b.agent ? -1 : a.agent > b.agent ? 1 : 0);
let rejected = 0;
const W = replay(all, (f, i, call, r) => { if (f.agent === id && daily.some(d => d.calls === f.calls) && !r.ok) rejected++; }, config);
const s = W.stats[id] || {};
await comment('Verified for ' + id + '. ' + daily.map(d => d.calls.length + ' calls on ' + d.date).join(', ') + '. ' + rejected + ' calls will be rejected by the engine. Score after merge: ' + scoreOf(s) + '. Merging.');
console.log('ok');
