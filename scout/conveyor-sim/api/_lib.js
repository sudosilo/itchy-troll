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
