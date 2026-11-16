// RTSS page shell: the site bar, the tabs, the Survey tab and the More tab.
import { SECTIONS, LISTS, ISP_BY_STATE } from './schema.js';
import { state, on, get, set, isSet, touched, save, loadSites, openSite, createSite, renameSite, loadDemoDoc, clearSurvey, blankDoc, docBytes } from './store.js';
import { h, fill, fieldGrid, dropCard, listBox, download } from './ui.js';
import { renderTopology, renderProfile, renderCabling, csvRows } from './derived.js';
import { renderDriveThru } from './drivethru.js';
import { defaults as dtDefaults } from './dtmodel.js';
import { mountMenu, IN_FIELD_TWIN, askFieldTwin, onFieldTwin, fieldTwinContext } from './apps.js';

const $ = id => document.getElementById(id);
const TAB_KEY = 'rtss3:tab';
const TABS = [['survey', 'Survey'], ['drive', 'Drive-thru'], ['topo', 'Topology'], ['profile', 'Integration'], ['cable', 'Cabling'], ['more', 'More']];
let tab = 'survey';
try { tab = localStorage.getItem(TAB_KEY) || 'survey'; } catch (e) {}
if (!TABS.some(t => t[0] === tab)) tab = 'survey';

// ===== SURVEY TAB =====
// How many of a section's questions have an answer. Switches and check boxes are left out, off is an answer too.
function tally(sec) {
  let done = 0, all = 0;
  sec.fields.forEach(f => {
    if (f.skip || f.type === 'sub' || f.type === 'check' || f.type === 'toggle' || f.type === 'locate') return;
    if (f.when && !get(f.when)) return;
    all++;
    if (f.type === 'list' ? state.doc.l[f.id].length : isSet(get(sec.id + '.' + f.id))) done++;
  });
  return [done, all];
}

let badges = [];
function renderSurvey(root) {
  badges = [];
  const bar = h('div', { class: 'progress' }, h('i', { id: 'progressFill' }));
  const kids = [bar, fieldTwinCard()];
  SECTIONS.forEach((sec, n) => {
    const acc = { get: id => get(sec.id + '.' + id), set: (id, v) => set(sec.id + '.' + id, v, 'form') };
    const grid = fieldGrid(sec.fields, acc, {
      prefix: sec.id + '.',
      global: get,
      list: f => listBox(LISTS[f.id], state.doc.l[f.id], () => touched({ src: 'form' }))
    });
    const card = dropCard('s:' + sec.id, String(n + 1).padStart(2, '0') + '  ' + sec.title, '', [sec.note ? h('p', { class: 'hint' }, sec.note) : null, grid]);
    badges.push([sec, card]);
    kids.push(card);
  });
  root.replaceChildren(...kids.filter(Boolean));
  const isp = root.querySelector('[data-path="net.isp"]');
  if (isp) isp.setAttribute('list', 'ispList');
  updateSurveyBits();
}

function updateSurveyBits() {
  let done = 0, all = 0;
  badges.forEach(([sec, card]) => { const [d, a] = tally(sec); done += d; all += a; card.setBadge(d + ' of ' + a); });
  const fill = $('progressFill');
  if (fill) fill.style.width = (all ? Math.round(done / all * 100) : 0) + '%';
  const list = $('ispList');
  list.replaceChildren(...(ISP_BY_STATE[get('site.state')] || []).map(n => h('option', { value: n })));
  $('siteTitle').textContent = get('site.name') || (state.demo ? 'Demo site' : 'New survey');
}


// ===== FROM FIELD TWIN =====
// Opened inside Field Twin, the blank site questions fill from what Field Twin knows about this place. Its stops
// here are listed so each one can be added to the visit log with a tap; none are added on their own.
const STATE_OPTS = (SECTIONS.find(s => s.id === 'site').fields.find(f => f.id === 'state').opts || []).map(o => (Array.isArray(o) ? o[0] : o));
function fieldTwinFill(ctx) {
  if (!ctx || ctx.site !== state.siteId || state.demo) return;
  let changed = false;
  const put = (path, v) => {
    if (v === undefined || v === null || v === '' || isSet(get(path))) return;
    set(path, String(v), 'ft');
    changed = true;
  };
  put('site.name', ctx.business);
  put('site.address', ctx.address);
  put('site.city', ctx.city);
  if (ctx.state && STATE_OPTS.includes(ctx.state)) put('site.state', ctx.state);
  if (isFinite(ctx.lat) && isFinite(ctx.lon) && !isSet(get('site.lat')) && !isSet(get('site.lon'))) { put('site.lat', ctx.lat); put('site.lon', ctx.lon); }
  show();
  if (changed) save();
}
function fieldTwinCard() {
  const ctx = fieldTwinContext();
  if (!IN_FIELD_TWIN || !ctx || ctx.site !== state.siteId || state.demo) return null;
  const stops = ctx.stops || [];
  const visits = state.doc.l.visits;
  const rows = stops.map(st => {
    const have = visits.some(v => v.ft === st.id);
    return h('div', { class: 'ft-stop' },
      h('div', {}, h('b', {}, st.date + (st.kind ? ', ' + st.kind : '')), st.notes ? h('p', { class: 'hint' }, st.notes) : null),
      have ? h('span', { class: 'hint' }, 'In the visit log') : h('button', { type: 'button', onclick: () => {
        visits.push({ date: st.date, role: st.role || 'Other', notes: st.notes || '', ft: st.id });
        touched({ src: 'ft' });
        show();
      } }, 'Add to visit log'));
  });
  return h('section', { class: 'card ft-card' },
    h('h2', {}, 'From Field Twin'),
    h('p', { class: 'hint' }, 'Blank site questions were filled from Field Twin: name, address, city, state and location. Anything already answered was left alone.'),
    stops.length ? h('p', { class: 'hint' }, 'Stops Field Twin logged here. Add the ones you want to the visit log.') : h('p', { class: 'hint' }, 'No Field Twin stops logged here yet.'),
    rows);
}

// ===== MORE TAB =====
function demoDoc() {
  const d = blankDoc();
  Object.assign(d.f, {
    'site.name': 'Sample Burger 101', 'site.brand': 'Sample Burger', 'site.ownership': 'Franchise', 'site.address': '100 Example Rd', 'site.city': 'Sampletown', 'site.state': 'AZ',
    'venue.buildingType': 'Standalone Building', 'venue.serviceModel': 'Quick Service (QSR)', 'venue.seatingCapacity': '48', 'venue.driveThru': true, 'venue.numberOfLanes': '1',
    'net.isp': 'Cox', 'net.downloadSpeed': '300', 'net.uploadSpeed': '30', 'net.firewallVendor': 'Cisco Meraki', 'pos.software': 'PAR Brink',
    'pos.tablet': 2, 'pos.kiosk': 1, 'pos.mgrDevice': 'Desktop', 'pos.mgrConn': 'Wired (Ethernet)', 'kitchen.kprinter': 1, 'kitchen.eprinter': 1, 'boards.foh': 3,
    'dt.boardCount': '1', 'dt.headsetSystem': 'HME', 'dt.headsetSetsNeeded': '6', 'dt.driveThruTimerSystem': 'HME ZOOM', 'pay.processors': ['Heartland'],
    'notes.generalSiteNotes': 'Demo data. Nothing here is a real site.'
  });
  d.l.registers = [{ type: 'Stationary Countertop', printer: 'Thermal, new', runPos: true, runPin: true }, { type: 'Stationary Countertop', printer: 'Thermal, existing' }, { type: 'Drive-Thru Window', printer: 'Thermal, new' }];
  d.l.kds = [{ desig: 'Grill' }, { desig: 'Fryer' }, { desig: 'Drive-Thru Expo' }];
  d.l.labelPrinters = [{ dept: 'Prep', conn: 'Ethernet' }];
  d.l.tvZones = [{ zone: 'Dining Room', count: '2', conn: 'wired' }];
  d.dt = dtDefaults();
  return d;
}

function renderMore(root) {
  const idInput = h('input', { type: 'text', value: state.doc.surveyId, 'data-path': 'surveyId', oninput: e => { state.doc.surveyId = e.target.value.trim() || state.doc.surveyId; touched({ src: 'more' }); } });
  const nameInput = h('input', { type: 'text', placeholder: 'New name for this site', 'aria-label': 'New site name' });
  const base = () => (state.doc.surveyId || 'rtss').replace(/[^A-Za-z0-9_-]/g, '');
  const csv = () => csvRows().map(r => r.map(c => '"' + String(c ?? '').replace(/"/g, '""') + '"').join(',')).join('\n');
  fill(root,
    h('section', { class: 'card' }, h('h2', {}, 'Export'),
      h('div', { class: 'grid' }, h('label', { class: 'field full' }, h('span', {}, 'Survey ID'), idInput),
        h('button', { type: 'button', id: 'exJson', onclick: () => download(base() + '.json', JSON.stringify(state.doc, null, 2), 'application/json') }, 'Download JSON'),
        h('button', { type: 'button', id: 'exCsv', onclick: () => download(base() + '.csv', csv(), 'text/csv') }, 'Download CSV')),
      h('p', { class: 'hint' }, 'Survey size ' + Math.round(docBytes() / 1024) + ' KB of 1750 KB. Photos take most of it.')),
    state.siteId ? h('section', { class: 'card' }, h('h2', {}, 'This site'),
      h('div', { class: 'addbar' }, nameInput, h('button', { type: 'button', onclick: () => { renameSite(nameInput.value); nameInput.value = ''; } }, 'Rename'))) : null,
    state.doc.legacy ? h('section', { class: 'card' }, h('h2', {}, 'Carried over'),
      h('p', { class: 'hint' }, 'This survey was filled in on the older RTSS page and carried over. The original save is kept inside it.'),
      h('button', { type: 'button', onclick: () => download(base() + '-original.json', JSON.stringify(state.doc.legacy, null, 2), 'application/json') }, 'Download the original save')) : null,
    h('section', { class: 'card' }, h('h2', {}, 'Demo and reset'),
      h('div', { class: 'grid' },
        h('button', { type: 'button', id: 'demoBtn', onclick: () => { loadDemoDoc(demoDoc()); show('survey'); } }, 'Load a demo site'),
        h('button', { type: 'button', class: 'danger', onclick: e => {
          if (e.target.dataset.sure) { clearSurvey(); show('survey'); }
          else { e.target.dataset.sure = 1; e.target.textContent = 'Tap again to clear every answer'; }
        } }, 'Clear this survey')),
      h('p', { class: 'hint' }, 'The demo is made-up data and never saves. Pick a site from the list to leave it.')));
}

// ===== SHELL =====
const RENDER = { survey: renderSurvey, drive: renderDriveThru, topo: renderTopology, profile: renderProfile, cable: renderCabling, more: renderMore };
function show(next) {
  if (next) tab = next;
  try { localStorage.setItem(TAB_KEY, tab); } catch (e) {}
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
  badges = [];
  RENDER[tab]($('main'));
  updateSurveyBits();
}

function fillSites() {
  const sel = $('site');
  sel.replaceChildren();
  const ids = Object.keys(state.sites);
  if (state.demo) sel.append(h('option', { value: '' }, 'Demo site, not saved'));
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
  on('change', info => { if (info.src !== 'dt') updateSurveyBits(); });
  mountMenu($('menuBtn'), 'rtss', () => state.siteId);
  show();
  loadSites();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
