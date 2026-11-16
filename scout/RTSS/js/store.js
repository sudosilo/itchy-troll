// RTSS store. One document per site holds everything: survey answers, lists, the integration profile,
// cabling numbers and the drive-thru model. It saves to the shared RIE API and keeps a copy on the phone.
import { SECTIONS, LISTS, eachField } from './schema.js';
import { siteFromUrl, siteToUrl } from './apps.js';
import { authHeader } from './account.js';

export const API = (typeof window !== 'undefined' && window.RIE_API) || 'https://rie-api-production.up.railway.app';
const SITE_KEY = 'rie_activeSite';
const CACHE = 'rtss3:doc:';
const MAX_BYTES = 1800000; // the API refuses bodies over 2 MB

export const state = {
  doc: blankDoc(),
  siteId: null,
  sites: {},
  demo: false,
  online: false,
  status: ['Starting', 'busy']
};

const subs = { change: [], load: [], status: [], sites: [] };
export function on(evt, fn) { subs[evt].push(fn); }
function emit(evt, arg) { subs[evt].forEach(fn => fn(arg)); }

export function newSurveyId() { return 'RTSS-' + Date.now().toString(36).toUpperCase(); }

export function blankDoc() {
  const l = {};
  Object.keys(LISTS).forEach(k => { l[k] = []; });
  return { _rtss: 3, surveyId: newSurveyId(), updatedAt: 0, f: {}, l, profile: {}, cabling: { ft: {}, custom: [], obs: [], rack: {} }, dt: null };
}

// Fill any part an older or partial document is missing, so the rest of the app never has to check.
export function shapeDoc(d) {
  const b = blankDoc();
  if (!d || d._rtss !== 3) return b;
  d.f = d.f || {};
  d.l = d.l || {};
  Object.keys(b.l).forEach(k => { if (!Array.isArray(d.l[k])) d.l[k] = []; });
  d.profile = d.profile || {};
  d.cabling = Object.assign({ ft: {}, custom: [], obs: [], rack: {} }, d.cabling || {});
  d.surveyId = d.surveyId || b.surveyId;
  if (d.dt === undefined) d.dt = null;
  return d;
}

// ===== READ AND WRITE =====
export function get(path) { return state.doc.f[path]; }
export function num(path) { return Math.max(0, parseInt(state.doc.f[path], 10) || 0); }
export function isSet(v) { return !(v === undefined || v === null || v === '' || v === false || (Array.isArray(v) && !v.length)); }

export function set(path, value, src) {
  if (state.doc.f[path] === value) return;
  if (isSet(value) || value === 0) state.doc.f[path] = value; else delete state.doc.f[path];
  touched({ path, src });
  queueProfile(path);
}

// Call after changing anything inside state.doc directly (lists, profile, cabling, drive-thru).
export function touched(info) {
  state.doc.updatedAt = Date.now();
  emit('change', info || {});
  queueSave();
}

function setStatus(msg, kind) { state.status = [msg, kind || '']; emit('status', state.status); }

// ===== API =====
async function api(path, method, body) {
  const opts = { method: method || 'GET', headers: { 'Content-Type': 'application/json', ...authHeader() } };
  if (body !== undefined) opts.body = typeof body === 'string' ? body : JSON.stringify(body);
  const res = await fetch(API + path, opts);
  if (!res.ok) throw new Error('API ' + res.status);
  return res.json();
}

// ===== PHONE COPY =====
function cacheWrite(dirty) {
  if (!state.siteId || state.demo) return;
  const rec = { dirty, doc: state.doc };
  try { localStorage.setItem(CACHE + state.siteId, JSON.stringify(rec)); }
  catch (e) {
    // photos can outgrow phone storage, keep the answers at least
    try {
      const slim = JSON.parse(JSON.stringify(state.doc));
      if (slim.dt) { (slim.dt.items || []).forEach(i => { delete i.photo; }); slim.dt.photos = []; }
      localStorage.setItem(CACHE + state.siteId, JSON.stringify({ dirty, doc: slim, slim: true }));
    } catch (e2) {}
  }
}
function cacheRead(id) {
  try { return JSON.parse(localStorage.getItem(CACHE + id)); } catch (e) { return null; }
}

// ===== SAVE =====
let saveTimer = null;
let dirty = false;
let saving = false;

export function docBytes() { return JSON.stringify(state.doc).length; }

export async function save() {
  clearTimeout(saveTimer);
  if (state.demo) { setStatus('Demo, not saved', 'warn'); return; }
  if (!state.siteId) { setStatus('Pick a site first', 'warn'); return; }
  if (saving) { dirty = true; return; }
  const body = JSON.stringify(state.doc);
  if (body.length > MAX_BYTES) { cacheWrite(true); setStatus('Too many photos to save', 'err'); return; }
  saving = true;
  dirty = false;
  setStatus('Saving', 'busy');
  const id = state.siteId;
  try {
    await api('/sites/' + id + '/survey', 'PUT', body);
    state.online = true;
    if (id === state.siteId) {
      cacheWrite(dirty);
      setStatus('Saved ' + new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }), 'ok');
    }
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
// A few answers are shared with the other RIE tools. They ride on the site profile instead of this survey.
const LINKS = {};
eachField((f, path) => { if (f.link) LINKS[path] = f.link; });
let profileTimer = null;
let profilePending = {};
let applyingProfile = false;

function queueProfile(path) {
  if (applyingProfile || !LINKS[path] || !state.siteId || state.demo) return;
  profilePending[LINKS[path]] = state.doc.f[path] || '';
  clearTimeout(profileTimer);
  profileTimer = setTimeout(() => {
    const patch = profilePending;
    profilePending = {};
    sendProfile(patch);
  }, 1200);
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
    else if (backfill && !theirs && mine) patch[key] = mine;
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
    // offline: offer whatever sites this phone has opened before
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(CACHE)) { const id = k.slice(CACHE.length); state.sites[id] = state.sites[id] || { name: siteNameFromCache(id) }; }
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
function siteNameFromCache(id) {
  const c = cacheRead(id);
  return (c && c.doc && c.doc.f && c.doc.f['site.name']) || id;
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
  let remote = null;
  let reached = true;
  try { remote = await api('/sites/' + id + '/survey'); } catch (e) { reached = false; }
  state.online = reached;
  let doc;
  let resave = false;
  if (remote && remote._rtss === 2) { doc = migrateV2(remote); resave = true; }
  else if (remote && remote._rtss === 3) doc = remote;
  // unsaved work on the phone wins over an older copy in the cloud
  if (cached && cached.dirty && cached.doc && cached.doc._rtss === 3 && !cached.slim &&
      (!doc || (cached.doc.updatedAt || 0) >= (doc.updatedAt || 0))) { doc = cached.doc; resave = reached; }
  if (!doc && !reached && cached && cached.doc) doc = cached.doc;
  state.doc = shapeDoc(doc);
  dirty = false;
  emit('load');
  if (reached) {
    await pullProfile(true);
    if (resave) save(); else setStatus('Synced', 'ok');
  } else setStatus('Offline, phone copy', 'warn');
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
    set('site.name', state.doc.f['site.name'] || name);
    emit('load');
  } catch (e) { setStatus('Create failed', 'err'); }
}

export async function renameSite(name) {
  name = (name || '').trim();
  if (!name || !state.siteId || state.demo) return;
  try {
    await api('/sites/' + state.siteId, 'PUT', { name });
    state.sites[state.siteId].name = name;
    emit('sites');
  } catch (e) { setStatus('Rename failed', 'err'); }
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

export function clearSurvey() {
  const keep = state.doc.surveyId;
  state.doc = blankDoc();
  state.doc.surveyId = keep;
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
// The 2026 page saved each answer under its label plus a running number, in page order.
// The schema keeps that label and that order, so walking it finds every old answer.
const clean = v => (typeof v === 'string' ? v.replace(/\s*\u2014\s*/g, ', ').replace(/\u2013/g, ' to ') : v);

export function migrateV2(data) {
  const doc = blankDoc();
  const fields = data.fields || {};
  const seen = {};
  const take = base => { seen[base] = (seen[base] || 0) + 1; return clean(fields[base + '#' + seen[base]]); };
  const c = data.counts || {};
  const html = data.customTechHtml || '';
  const custom = [];
  html.replace(/emerging-name">([^<]*)<[\s\S]*?class="tag[^"]*">([^<]*)</g, (m, name, cat) => { custom.push({ name: name.trim(), cat: cat.trim() === 'CUSTOM' ? '' : cat.trim() }); return m; });
  const counts = { registers: c.reg, kds: c.kds, labelPrinters: c.lp, tvZones: c.tv, customTech: custom.length };

  SECTIONS.forEach(sec => sec.fields.forEach(f => {
    if (f.type === 'sub') return;
    if (f.skip) {
      const v = take(f.old);
      if (f.old === 'ispOptions' && v && v !== 'Select ISP...' && !doc.f['net.isp']) doc.f['net.isp'] = v;
      return;
    }
    if (f.type === 'list') {
      const n = counts[f.id] || 0;
      for (let i = 0; i < n; i++) {
        const item = f.id === 'customTech' ? Object.assign({}, custom[i]) : {};
        f.fields.forEach(ff => {
          if (!ff.old) return;
          const v = take(ff.old);
          if (isSet(v)) item[ff.id] = v;
        });
        doc.l[f.id].push(item);
      }
      return;
    }
    if (!f.old) return;
    const v = take(f.old);
    if (isSet(v)) doc.f[sec.id + '.' + f.id] = v;
  }));

  const map = { kprinter: 'kitchen.kprinter', eprinter: 'kitchen.eprinter', foh: 'boards.foh', tv: 'av.tv',
    tablet: 'pos.tablet', ogun: 'pos.ogun', invtab: 'pos.invtab', kiosk: 'pos.kiosk', chgdock: 'pos.chgdock' };
  Object.entries(data.counters || {}).forEach(([k, v]) => { if (map[k] && v > 0) doc.f[map[k]] = v; });

  const chipNames = [];
  SECTIONS.forEach(sec => sec.fields.forEach(f => { if (f.type === 'chips') f.opts.forEach(o => chipNames.push([sec.id + '.' + f.id, o])); }));
  (data.chips || []).forEach(i => {
    if (!chipNames[i]) return;
    const [path, name] = chipNames[i];
    (doc.f[path] = doc.f[path] || []).push(name);
  });

  if (data.surveyId) doc.surveyId = data.surveyId;
  doc.legacy = data;
  doc.updatedAt = Date.now();
  return doc;
}
