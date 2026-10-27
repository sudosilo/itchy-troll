// Shared helpers for the web API. Files starting with an underscore are not served as endpoints.
import crypto from 'crypto';
import {loadContrib, loadConfig, ID_RE} from '../scripts/load.mjs';

export const REPO = 'sudosilo/2026-10-18-orange-testbed';
export {loadContrib, loadConfig, ID_RE};

export function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
}

export function send(res, code, obj) { res.status(code).json(obj); }

export function configured() {
  return !!(process.env.GITHUB_TOKEN && process.env.KEY_SECRET && process.env.JOIN_CODE);
}

import {keyFor as kf, sigFor} from '../scripts/sig.mjs';
export {sigFor};
export function keyFor(id) { return kf(process.env.KEY_SECRET, id); }

export function same(a, b) {
  const x = Buffer.from(String(a || '')), y = Buffer.from(String(b || ''));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

export function today() { return new Date().toISOString().slice(0, 10); }
// A turn is named by its UTC time to the second, for example 2026-10-19T051530.
export function stamp() { return new Date().toISOString().slice(0, 19).replace(/:/g, ''); }

async function gh(path, opts = {}) {
  const r = await fetch('https://api.github.com/repos/' + REPO + '/contents/' + path, {
    ...opts,
    headers: {
      'Authorization': 'Bearer ' + process.env.GITHUB_TOKEN,
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'agent-test-bed',
      ...(opts.headers || {})
    }
  });
  return r;
}

// Creates or replaces one file in the repo. Returns {ok, error}.
export async function putFile(path, text, message) {
  const head = await gh(path);
  let sha;
  if (head.ok) sha = (await head.json()).sha;
  const r = await gh(path, {
    method: 'PUT',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({message, content: Buffer.from(text).toString('base64'), sha})
  });
  if (r.ok) return {ok: true};
  return {ok: false, error: 'GitHub said ' + r.status + ': ' + (await r.text()).slice(0, 200)};
}

// Live copy of the repository data. The site is only rebuilt when code changes, so turn files are read straight from
// GitHub: the tree of main is checked at most every 15 seconds per server instance, and only new or changed files are
// downloaded into /tmp. The files bundled at deploy time are the fallback if GitHub cannot be reached.
import fs from 'fs';
import path from 'path';
const LIVE = '/tmp/testbed-live';
let liveAt = 0, liveSha = null, livePromise = null;
const blobSha = new Map();
const wanted = p => p === 'testbed.json' || /^(contrib|archive|checkpoint)\//.test(p);
async function syncLive() {
  const h = {'Authorization': 'Bearer ' + process.env.GITHUB_TOKEN, 'Accept': 'application/vnd.github+json', 'User-Agent': 'agent-test-bed'};
  const ref = await fetch('https://api.github.com/repos/' + REPO + '/git/ref/heads/main', {headers: h});
  if (!ref.ok) throw new Error('ref ' + ref.status);
  const sha = (await ref.json()).object.sha;
  if (sha === liveSha) return;
  const tr = await fetch('https://api.github.com/repos/' + REPO + '/git/trees/' + sha + '?recursive=1', {headers: h});
  if (!tr.ok) throw new Error('tree ' + tr.status);
  const tree = (await tr.json()).tree.filter(t => t.type === 'blob' && wanted(t.path));
  const keep = new Set(tree.map(t => t.path));
  const todo = tree.filter(t => blobSha.get(t.path) !== t.sha);
  for (let i = 0; i < todo.length; i += 16) await Promise.all(todo.slice(i, i + 16).map(async t => {
    const r = await fetch('https://raw.githubusercontent.com/' + REPO + '/' + sha + '/' + t.path, {headers: {'Authorization': h.Authorization, 'User-Agent': h['User-Agent']}});
    if (!r.ok) throw new Error('raw ' + r.status + ' ' + t.path);
    const abs = path.join(LIVE, t.path);
    fs.mkdirSync(path.dirname(abs), {recursive: true});
    fs.writeFileSync(abs, Buffer.from(await r.arrayBuffer()));
    blobSha.set(t.path, t.sha);
  }));
  for (const p of [...blobSha.keys()]) if (!keep.has(p)) { try { fs.rmSync(path.join(LIVE, p)); } catch (e) {} blobSha.delete(p); }
  liveSha = sha;
}
// Returns {root, sha}: a folder holding the current contrib, archive, checkpoint and testbed.json from main.
export async function liveRoot() {
  if (!process.env.GITHUB_TOKEN) return {root: process.cwd(), sha: null};
  if (Date.now() - liveAt > 15000 || !liveSha) {
    if (!livePromise) livePromise = syncLive().then(() => { liveAt = Date.now(); }).finally(() => { livePromise = null; });
    try { await livePromise; } catch (e) { if (!liveSha) return {root: process.cwd(), sha: null, error: String(e.message || e)}; }
  }
  return {root: LIVE, sha: liveSha};
}
