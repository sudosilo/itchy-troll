// RDSS page shell: site bar, Build and Survey tabs, Demo and More.
import { SECTIONS, MODES } from './schema.js';
import { state, on, get, set, isSet, save, loadSites, openSite, createSite, renameSite, loadDemoDoc, clearMode, blankDoc } from './store.js';
import { h, fill, fieldGrid, dropCard, readout, download } from './ui.js';
import { DEMOS } from './demos.js';
import { mountMenu, IN_FIELD_TWIN, askFieldTwin, onFieldTwin, fieldTwinContext } from './apps.js';

const $ = id => document.getElementById(id);
const TAB_KEY = 'rdss3:tab';
const TABS = [['build', 'Build'], ['survey', 'Survey'], ['demo', 'Demo'], ['more', 'More']];
let tab = 'build';
try { tab = localStorage.getItem(TAB_KEY) || 'build'; } catch (e) {}
if (!TABS.some(t => t[0] === tab)) tab = 'build';

// A section's answered count. In RDSS the switches are the checklist, so an on switch counts.
function tally(sec) {
  let done = 0, all = 0;
  sec.fields.forEach(f => {
    if (f.type === 'sub' || f.type === 'locate' || f.id === 'lat' || f.id === 'lon') return;
    all++;
    if (isSet(get(sec.id + '.' + f.id))) done++;
  });
  return [done, all];
}
function modeScore(mode) {
  let d = 0, a = 0;
  SECTIONS.filter(s => s.mode === mode).forEach(s => { const [x, y] = tally(s); d += x; a += y; });
  return a ? Math.round(d / a * 100) : 0;
}

let badges = [];
function renderMode(root, mode) {
  badges = [];
  const score = h('div', { class: 'score' }, h('b', { id: 'scoreVal' }, '0%'), h('span', {}, mode === 'build' ? 'Concept complete' : 'Survey complete'));
  const kids = [h('section', { class: 'card' }, score, h('div', { class: 'progress' }, h('i', { id: 'progressFill' })))];
  if (mode === 'survey') { const ft = fieldTwinCard(); if (ft) kids.push(ft); }
  SECTIONS.filter(s => s.mode === mode).forEach((sec, n) => {
    const grid = fieldGrid(sec.fields, { get: id => get(sec.id + '.' + id), set: (id, v) => set(sec.id + '.' + id, v) }, { prefix: sec.id + '.', global: get });
    const card = dropCard('r:' + sec.id, String(n + 1).padStart(2, '0') + '  ' + sec.title, '', grid);
    badges.push([sec, card]);
    kids.push(card);
  });
  kids.push(h('button', { type: 'button', class: 'danger wide', onclick: e => {
    if (e.target.dataset.sure) { clearMode(mode, SECTIONS); show(); }
    else { e.target.dataset.sure = 1; e.target.textContent = 'Tap again to clear every ' + mode + ' answer'; }
  } }, 'Clear ' + mode + ' answers'));
  root.replaceChildren(...kids);
  updateBits();
}

function updateBits() {
  badges.forEach(([sec, card]) => { const [d, a] = tally(sec); card.setBadge(d + ' of ' + a); });
  const mode = tab === 'survey' ? 'survey' : 'build';
  const pct = modeScore(mode);
  if ($('scoreVal')) $('scoreVal').textContent = pct + '%';
  if ($('progressFill')) $('progressFill').style.width = pct + '%';
  $('siteTitle').textContent = get('sId.name') || get('bId.name') || (state.demo ? 'Demo concept' : 'New survey');
}


// ===== FROM FIELD TWIN =====
// Opened inside Field Twin, the blank identity questions fill from what Field Twin knows about this place:
// name, address and location. Anything already answered is left alone.
let ftFilled = [];
function fieldTwinFill(ctx) {
  if (!ctx || ctx.site !== state.siteId || state.demo) return;
  ftFilled = [];
  const put = (path, v, label) => {
    if (v === undefined || v === null || v === '' || isSet(get(path))) return;
    set(path, String(v));
    ftFilled.push(label);
  };
  put('sId.name', ctx.business, 'name');
  const addr = [ctx.address, [ctx.city, ctx.state].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  put('sId.address', addr, 'address');
  if (isFinite(ctx.lat) && isFinite(ctx.lon) && !isSet(get('sId.lat')) && !isSet(get('sId.lon'))) { put('sId.lat', ctx.lat, 'location'); put('sId.lon', ctx.lon, ''); }
  ftFilled = ftFilled.filter(Boolean);
  show();
  if (ftFilled.length) save();
}
function fieldTwinCard() {
  const ctx = fieldTwinContext();
  if (!IN_FIELD_TWIN || !ctx || ctx.site !== state.siteId || state.demo) return null;
  const n = (ctx.stops || []).length;
  return h('section', { class: 'card ft-card' },
    h('h2', {}, 'From Field Twin'),
    h('p', { class: 'hint' }, ftFilled.length ? 'Filled from Field Twin: ' + ftFilled.join(', ') + '. Anything already answered was left alone.' : 'Identity answers here already match or were typed in, so nothing was changed.'),
    h('p', { class: 'hint' }, n ? 'Field Twin has ' + n + (n === 1 ? ' stop' : ' stops') + ' logged at this site. Its visit log is in RTSS.' : 'No Field Twin stops logged at this site yet.'));
}

function renderDemo(root) {
  root.replaceChildren(
    h('p', { class: 'hint' }, 'Sample concepts. Opening one loads it into Build so you can see a filled concept. Samples never save.'),
    ...Object.entries(DEMOS).map(([key, d]) => {
      const doc = blankDoc();
      Object.assign(doc.f, d.f);
      const live = Object.keys(d.f).filter(k => /Status$/.test(k) && d.f[k] === 'LIVE').length;
      const checks = Object.values(d.f).filter(v => v === true).length;
      return h('section', { class: 'card' }, h('h2', {}, d.title), h('p', { class: 'hint center' }, d.line),
        h('div', { class: 'readouts' }, readout('Checklist items done', String(checks)), readout('Listings live', String(live))),
        h('button', { type: 'button', class: 'primary wide', 'data-demo': key, onclick: () => { loadDemoDoc(doc); show('build'); } }, 'Open in Build'));
    }));
}

function summary() {
  const lines = [];
  MODES.forEach(([mode, label]) => {
    const secs = SECTIONS.filter(s => s.mode === mode);
    if (!secs.some(s => tally(s)[0])) return;
    lines.push(label.toUpperCase() + ', ' + modeScore(mode) + '% complete', '');
    secs.forEach(sec => {
      const rows = sec.fields.filter(f => f.id && isSet(get(sec.id + '.' + f.id)));
      if (!rows.length) return;
      lines.push(sec.title);
      rows.forEach(f => { const v = get(sec.id + '.' + f.id); lines.push('  ' + f.label + ': ' + (v === true ? 'Yes' : v)); });
      lines.push('');
    });
  });
  return lines.join('\n') || 'Nothing filled in yet.';
}

function renderMore(root) {
  const text = summary();
  const nameInput = h('input', { type: 'text', placeholder: 'New name for this site', 'aria-label': 'New site name' });
  const copyBtn = h('button', { type: 'button', onclick: async () => {
    try { await navigator.clipboard.writeText(text); copyBtn.textContent = 'Copied'; } catch (e) { copyBtn.textContent = 'Copy blocked, use download'; }
  } }, 'Copy summary');
  const base = (state.siteId || 'rdss').replace(/[^A-Za-z0-9_-]/g, '');
  fill(root,
    h('section', { class: 'card' }, h('h2', {}, 'Summary'), h('pre', { class: 'summary' }, text),
      h('div', { class: 'grid' }, copyBtn,
        h('button', { type: 'button', onclick: () => download(base + '-rdss.txt', text, 'text/plain') }, 'Download text'),
        h('button', { type: 'button', class: 'full', onclick: () => download(base + '-rdss.json', JSON.stringify(state.doc, null, 2), 'application/json') }, 'Download JSON'))),
    state.siteId ? h('section', { class: 'card' }, h('h2', {}, 'This site'),
      h('div', { class: 'addbar' }, nameInput, h('button', { type: 'button', onclick: () => { renameSite(nameInput.value); nameInput.value = ''; } }, 'Rename'))) : null,
    state.doc.legacy ? h('section', { class: 'card' }, h('h2', {}, 'Carried over'),
      h('p', { class: 'hint' }, 'This survey was filled in on the older RDSS page and carried over. The original save is kept inside it.'),
      h('button', { type: 'button', onclick: () => download(base + '-original.json', JSON.stringify(state.doc.legacy, null, 2), 'application/json') }, 'Download the original save')) : null);
}

const RENDER = { build: r => renderMode(r, 'build'), survey: r => renderMode(r, 'survey'), demo: renderDemo, more: renderMore };
function show(next) {
  if (next) tab = next;
  try { localStorage.setItem(TAB_KEY, tab); } catch (e) {}
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
  badges = [];
  RENDER[tab]($('main'));
  updateBits();
}

function fillSites() {
  const sel = $('site');
  sel.replaceChildren();
  const ids = Object.keys(state.sites);
  if (state.demo) sel.append(h('option', { value: '' }, 'Demo concept, not saved'));
  else if (!ids.length) sel.append(h('option', { value: '' }, 'No sites yet'));
  ids.forEach(id => sel.append(h('option', { value: id }, state.sites[id].name)));
  sel.value = state.demo ? '' : (state.siteId || '');
}

function init() {
  $('tabs').append(...TABS.map(([id, label]) => h('button', { type: 'button', 'data-tab': id, onclick: () => show(id) }, label)));
  $('site').addEventListener('change', e => { if (e.target.value) openSite(e.target.value); });
  $('saveBtn').addEventListener('click', save);
  const form = $('newForm');
  $('newBtn').addEventListener('click', () => { form.hidden = !form.hidden; if (!form.hidden) $('newName').focus(); });
  form.addEventListener('submit', e => {
    e.preventDefault();
    const name = $('newName').value;
    $('newName').value = '';
    form.hidden = true;
    createSite(name);
  });
  on('status', ([msg, kind]) => { const el = $('status'); el.textContent = msg; el.dataset.kind = kind; });
  on('sites', fillSites);
  on('load', () => { fillSites(); show(); askFieldTwin(state.siteId); });
  onFieldTwin(fieldTwinFill);
  on('change', updateBits);
  mountMenu($('menuBtn'), 'rdss', () => state.siteId);
  show();
  loadSites();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
