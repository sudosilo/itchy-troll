// Menu shared by RTSS and RDSS. Same file in both repos, keep them matched.
// Each link carries the open site so the next app opens on the same place.
import { accountBox } from './account.js';
export const APPS = [
  { id: 'rtss', name: 'RTSS', sub: 'Technology site survey, drive-thru model', url: 'https://rtss-sigma.vercel.app/', param: 'site' },
  { id: 'rdss', name: 'RDSS', sub: 'Design and setup survey', url: 'https://ghost-kitchen-builder.vercel.app/', param: 'site' },
  { id: 'ft', name: 'Field Twin', sub: 'Sites on the map, visits and photos', url: 'https://field-twin-teal.vercel.app/', param: 'rie' }
];

// The site named in the address, like ?site=site-abc
export function siteFromUrl() {
  try { return new URLSearchParams(location.search).get('site') || ''; } catch (e) { return ''; }
}

// Keep the address in step with the open site, so a refresh or a shared link lands on it.
export function siteToUrl(id) {
  try {
    const u = new URL(location.href);
    if (id) u.searchParams.set('site', id); else u.searchParams.delete('site');
    history.replaceState(null, '', u);
  } catch (e) {}
}

export function appLink(app, siteId) {
  const q = [];
  if (siteId) q.push(app.param + '=' + encodeURIComponent(siteId));
  if (IN_FIELD_TWIN && app.id !== 'ft') q.push('ft=1');
  return app.url + (q.length ? '?' + q.join('&') : '');
}

// ===== OPENED INSIDE FIELD TWIN =====
// Field Twin opens RTSS and RDSS in a window over its map with ?ft=1. The page asks Field Twin what it knows about
// the open site, and Field Twin answers with the name, address, location and the stops it logged there.
// Each app decides what to fill: only questions still blank, so nothing typed here is ever replaced.
export const IN_FIELD_TWIN = (() => {
  try { return window.parent !== window && new URLSearchParams(location.search).get('ft') === '1'; } catch (e) { return false; }
})();
let ftContext = null;
const ftSubs = [];
export function fieldTwinContext() { return ftContext; }
export function onFieldTwin(fn) { ftSubs.push(fn); }
export function askFieldTwin(siteId) {
  ftContext = null;
  if (!IN_FIELD_TWIN || !siteId) return;
  try { window.parent.postMessage({ rieReady: { site: siteId } }, '*'); } catch (e) {}
}
if (IN_FIELD_TWIN) {
  window.addEventListener('message', ev => {
    if (ev.source !== window.parent || !ev.data || !ev.data.rieContext) return;
    ftContext = ev.data.rieContext;
    ftSubs.forEach(fn => { try { fn(ftContext); } catch (e) {} });
  });
}

// btn: the menu button. current: this app's id. getSite: returns the open site id, or nothing.
export function mountMenu(btn, current, getSite) {
  const shade = document.createElement('div');
  shade.id = 'menuShade';
  const drawer = document.createElement('nav');
  drawer.id = 'drawer';
  drawer.setAttribute('aria-label', 'Apps');
  document.body.append(shade, drawer);
  const close = () => { drawer.classList.remove('open'); shade.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); };
  const open = () => {
    const id = getSite();
    drawer.replaceChildren();
    const head = document.createElement('div');
    head.className = 'drawer-head';
    head.textContent = 'Apps';
    drawer.append(head);
    APPS.forEach(a => {
      if (IN_FIELD_TWIN && a.id === 'ft') return;
      const el = document.createElement(a.id === current ? 'div' : 'a');
      el.className = 'app-link' + (a.id === current ? ' here' : '');
      if (a.id !== current) el.href = appLink(a, id);
      const b = document.createElement('b');
      b.textContent = a.name + (a.id === current ? ', open now' : '');
      const s = document.createElement('small');
      s.textContent = a.sub;
      el.append(b, s);
      drawer.append(el);
    });
    const note = document.createElement('p');
    note.className = 'hint';
    note.textContent = (id ? 'Links open the same site.' : 'Pick a site and the links open it too.') + (IN_FIELD_TWIN ? ' Back to Field Twin is at the top of the screen.' : '');
    drawer.append(note, accountBox());
    drawer.classList.add('open');
    shade.classList.add('open');
    btn.setAttribute('aria-expanded', 'true');
  };
  btn.setAttribute('aria-expanded', 'false');
  btn.addEventListener('click', () => (drawer.classList.contains('open') ? close() : open()));
  shade.addEventListener('click', close);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
}
