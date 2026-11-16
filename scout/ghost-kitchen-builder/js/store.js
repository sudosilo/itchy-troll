// RDSS store. One document per site, saved to the shared RIE API with a copy kept on the phone.
import { eachField } from './schema.js';
import { siteFromUrl, siteToUrl } from './apps.js';
import { authHeader } from './account.js';

export const API = (typeof window !== 'undefined' && window.RIE_API) || 'https://rie-api-production.up.railway.app';
const SITE_KEY = 'rie_activeSite';
const CACHE = 'rdss3:doc:';

export const state = { doc: blankDoc(), siteId: null, sites: {}, demo: false, online: false, status: ['Starting', 'busy'] };

const subs = { change: [], load: [], status: [], sites: [] };
export function on(evt, fn) { subs[evt].push(fn); }
function emit(evt, arg) { subs[evt].forEach(fn => fn(arg)); }

export function blankDoc() { return { _rdss: 3, updatedAt: 0, f: {} }; }
function shapeDoc(d) {
  if (!d || d._rdss !== 3) return blankDoc();
  d.f = d.f || {};
  return d;
}

export function get(path) { return state.doc.f[path]; }
export function isSet(v) { return !(v === undefined || v === null || v === '' || v === false || (Array.isArray(v) && !v.length)); }
export function set(path, value) {
  if (state.doc.f[path] === value) return;
  if (isSet(value) || value === 0) state.doc.f[path] = value; else delete state.doc.f[path];
  touched({ path });
  queueProfile(path);
}
export function touched(info) {
  state.doc.updatedAt = Date.now();
  emit('change', info || {});
  queueSave();
}
function setStatus(msg, kind) { state.status = [msg, kind || '']; emit('status', state.status); }

async function api(path, method, body) {
  const opts = { method: method || 'GET', headers: { 'Content-Type': 'application/json', ...authHeader() } };
  if (body !== undefined) opts.body = typeof body === 'string' ? body : JSON.stringify(body);
  const res = await fetch(API + path, opts);
  if (!res.ok) throw new Error('API ' + res.status);
  return res.json();
}

function cacheWrite(dirty) {
  if (!state.siteId || state.demo) return;
  try { localStorage.setItem(CACHE + state.siteId, JSON.stringify({ dirty, doc: state.doc })); } catch (e) {}
}
function cacheRead(id) { try { return JSON.parse(localStorage.getItem(CACHE + id)); } catch (e) { return null; } }

// ===== SAVE =====
let saveTimer = null, dirty = false, saving = false;
export async function save() {
  clearTimeout(saveTimer);
  if (state.demo) { setStatus('Demo, not saved', 'warn'); return; }
  if (!state.siteId) { setStatus('Pick a site first', 'warn'); return; }
  if (saving) { dirty = true; return; }
  saving = true;
  dirty = false;
  setStatus('Saving', 'busy');
  const id = state.siteId;
  try {
    await api('/sites/' + id + '/design', 'PUT', state.doc);
    state.online = true;
    if (id === state.siteId) { cacheWrite(dirty); setStatus('Saved ' + new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }), 'ok'); }
  } catch (e) {
    dirty = true;
    cacheWrite(true);
    setStatus('Saved on phone only', 'warn');
  }
  saving = false;
  if (dirty && id === state.siteId) queueSave();
}
function queueSave() {
  if (state.demo) { setStatus('Demo, not saved', 'warn'); return; }
  if (!state.siteId) { setStatus('Pick a site first', 'warn'); return; }
  dirty = true;
  cacheWrite(true);
  setStatus('Unsaved', 'warn');
  clearTimeout(saveTimer);
  saveTimer = setTimeout(save, 2500);
}

// ===== SHARED SITE PROFILE =====
const LINKS = {};
eachField((f, path) => { if (f.link) LINKS[path] = f.link; });
let profileTimer = null, profilePending = {}, applyingProfile = false;
function queueProfile(path) {
  if (applyingProfile || !LINKS[path] || !state.siteId || state.demo) return;
  profilePending[LINKS[path]] = state.doc.f[path] || '';
  clearTimeout(profileTimer);
  profileTimer = setTimeout(() => { const patch = profilePending; profilePending = {}; sendProfile(patch); }, 1200);
}
async function sendProfile(patch) {
  if (!state.siteId || state.demo) return;
  try { await api('/sites/' + state.siteId + '/profile', 'PATCH', patch); } catch (e) {}
}
export async function pullProfile(backfill) {
  if (!state.siteId || state.demo) return;
  let profile;
  try { profile = await api('/sites/' + state.siteId + '/profile'); } catch (e) { return; }
  const focus = typeof document !== 'undefined' && document.activeElement ? document.activeElement.dataset.path : '';
  let changed = false;
  const patch = {};
  applyingProfile = true;
  Object.entries(LINKS).forEach(([path, key]) => {
    const theirs = profile && profile[key];
    const mine = state.doc.f[path];
    if (theirs && theirs !== mine && path !== focus) { state.doc.f[path] = theirs; changed = true; }
    else if (backfill && !theirs && mine && !patch[key]) patch[key] = mine;
  });
  applyingProfile = false;
  if (changed) { touched({ src: 'profile' }); emit('load'); }
  if (Object.keys(patch).length) sendProfile(patch);
}

// ===== SITES =====
export async function loadSites() {
  setStatus('Connecting', 'busy');
  try {
    const rows = await api('/sites');
    state.sites = {};
    rows.forEach(s => { state.sites[s.id] = { name: s.name }; });
    state.online = true;
  } catch (e) {
    state.online = false;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(CACHE)) { const id = k.slice(CACHE.length); const c = cacheRead(id); state.sites[id] = { name: (c && c.doc && (c.doc.f['sId.name'] || c.doc.f['bId.name'])) || id }; }
      }
    } catch (e2) {}
  }
  emit('sites');
  let saved = siteFromUrl();
  if (!state.sites[saved]) { try { saved = localStorage.getItem(SITE_KEY) || ''; } catch (e) {} }
  const first = state.sites[saved] ? saved : (Object.keys(state.sites)[0] || null);
  if (first) await openSite(first);
  else setStatus(state.online ? 'Create a site' : 'Offline', state.online ? 'warn' : 'err');
}

export async function openSite(id) {
  if (dirty && state.siteId && !state.demo) await save();
  state.demo = false;
  state.siteId = id || null;
  try { localStorage.setItem(SITE_KEY, state.siteId || ''); } catch (e) {}
  siteToUrl(state.siteId);
  if (!state.siteId) { state.doc = blankDoc(); emit('load'); return; }
  setStatus('Loading', 'busy');
  const cached = cacheRead(id);
  let remote = null, reached = true;
  try { remote = await api('/sites/' + id + '/design'); } catch (e) { reached = false; }
  state.online = reached;
  let doc, resave = false;
  if (remote && remote._rdss === 2) { doc = migrateV2(remote); resave = true; }
  else if (remote && remote._rdss === 3) doc = remote;
  if (cached && cached.dirty && cached.doc && cached.doc._rdss === 3 && (!doc || (cached.doc.updatedAt || 0) >= (doc.updatedAt || 0))) { doc = cached.doc; resave = reached; }
  if (!doc && !reached && cached && cached.doc) doc = cached.doc;
  state.doc = shapeDoc(doc);
  dirty = false;
  emit('load');
  if (reached) { await pullProfile(true); if (resave) save(); else setStatus('Synced', 'ok'); }
  else setStatus('Offline, phone copy', 'warn');
}

export async function createSite(name) {
  name = (name || '').trim();
  if (!name) return;
  const id = 'site-' + Date.now().toString(36);
  try {
    await api('/sites', 'POST', { id, name });
    state.sites[id] = { name };
    emit('sites');
    await openSite(id);
    if (!state.doc.f['sId.name']) set('sId.name', name);
    emit('load');
  } catch (e) { setStatus('Create failed', 'err'); }
}

export async function renameSite(name) {
  name = (name || '').trim();
  if (!name || !state.siteId || state.demo) return;
  try { await api('/sites/' + state.siteId, 'PUT', { name }); state.sites[state.siteId].name = name; emit('sites'); }
  catch (e) { setStatus('Rename failed', 'err'); }
}

export function loadDemoDoc(doc) {
  if (dirty && state.siteId && !state.demo) save();
  state.demo = true;
  state.siteId = null;
  siteToUrl('');
  state.doc = shapeDoc(doc);
  emit('sites');
  emit('load');
  setStatus('Demo, not saved', 'warn');
}

export function clearMode(mode, sections) {
  sections.filter(s => s.mode === mode).forEach(s => Object.keys(state.doc.f).forEach(k => { if (k.startsWith(s.id + '.')) delete state.doc.f[k]; }));
  emit('load');
  touched({ src: 'clear' });
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') pullProfile(false);
    else if (dirty) save();
  });
}

// ===== OLD SAVES =====
// The 2026 page saved each answer under a key built from the page. The schema keeps that key on each field.
const UNSET = ['-- STATUS', '-- Select', 'Select...'];
export function migrateV2(data) {
  const doc = blankDoc();
  const fields = data.fields || {};
  eachField((f, path) => {
    if (!f.old || !(f.old in fields)) return;
    let v = fields[f.old];
    if (typeof v === 'string') { v = v.trim(); if (UNSET.includes(v)) v = ''; }
    if (isSet(v)) doc.f[path] = v;
  });
  doc.legacy = data;
  doc.updatedAt = Date.now();
  return doc;
}
