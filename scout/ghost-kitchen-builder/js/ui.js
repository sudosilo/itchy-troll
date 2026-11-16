// Small page-building helpers shared by every tab.

// h('div', { class: 'card' }, child, 'text') builds an element. Text always goes in as text, never as markup.
export function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  Object.entries(attrs || {}).forEach(([k, v]) => {
    if (v === false || v === null || v === undefined) return;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'value') el.value = v;
    else if (k === 'checked') el.checked = !!v;
    else el.setAttribute(k, v === true ? '' : v);
  });
  kids.flat().forEach(k => { if (k !== null && k !== undefined && k !== false) el.append(k.nodeType ? k : String(k)); });
  return el;
}

// Swap an element's children, skipping blanks.
export function fill(el, ...kids) { el.replaceChildren(...kids.flat().filter(k => k !== null && k !== undefined && k !== false)); }

// ===== DROP-DOWN CARDS =====
// Closed to start. The page remembers which ones are open.
const OPEN_KEY = 'rtss3:open';
let openSet = {};
try { openSet = JSON.parse(localStorage.getItem(OPEN_KEY)) || {}; } catch (e) {}
export function isOpen(key) { return !!openSet[key]; }
export function setOpen(key, open) {
  if (open) openSet[key] = 1; else delete openSet[key];
  try { localStorage.setItem(OPEN_KEY, JSON.stringify(openSet)); } catch (e) {}
}

export function dropCard(key, title, badge, body, onOpen) {
  const tag = h('span', { class: 'tag' }, badge || '');
  const card = h('section', { class: 'card drop' + (isOpen(key) ? ' open' : ''), 'data-key': key },
    h('h2', { onclick: () => {
      const open = !card.classList.contains('open');
      card.classList.toggle('open', open);
      setOpen(key, open);
      if (open && onOpen) onOpen();
    } }, h('span', {}, title), tag),
    h('div', { class: 'drop-body' }, body));
  card.setBadge = t => { tag.textContent = t || ''; };
  return card;
}

// ===== FIELDS =====
// fields: a list from the schema. acc: { get(id), set(id, value) } for wherever the answers live.
// Returns the grid element. Call grid.refresh() after outside changes to re-check which fields show.
export function fieldGrid(fields, acc, ctx) {
  ctx = ctx || {};
  const grid = h('div', { class: 'grid' });
  const conds = [];
  fields.forEach(f => {
    if (f.skip) return;
    const el = fieldEl(f, acc, ctx, () => grid.refresh());
    if (!el) return;
    if (f.when) conds.push([el, () => !!ctx.global(f.when)]);
    if (f.whenItem) conds.push([el, () => acc.get(f.whenItem[0]) === f.whenItem[1]]);
    grid.append(el);
  });
  grid.refresh = () => conds.forEach(([el, test]) => { el.hidden = !test(); });
  grid.refresh();
  return grid;
}

function optList(f) { return f.opts.map(o => (Array.isArray(o) ? o : [o, o])); }

function fieldEl(f, acc, ctx, changed) {
  const path = ctx.prefix ? ctx.prefix + f.id : f.id;
  const cur = acc.get(f.id);
  const put = v => { acc.set(f.id, v); changed(); };
  if (f.type === 'sub') return h('div', { class: 'subhead' }, f.label);
  if (f.type === 'list') return ctx.list ? ctx.list(f) : null;

  if (f.type === 'locate') {
    const b = h('button', { type: 'button', class: 'locate', onclick: () => {
      if (!navigator.geolocation) { b.textContent = 'Location not available'; return; }
      b.textContent = 'Finding you';
      navigator.geolocation.getCurrentPosition(pos => {
        const [la, lo] = f.targets;
        acc.set(la, Math.round(pos.coords.latitude * 1e5) / 1e5);
        acc.set(lo, Math.round(pos.coords.longitude * 1e5) / 1e5);
        const root = b.closest('.grid');
        [la, lo].forEach(t => { const el = root && root.querySelector('[data-path="' + (ctx.prefix || '') + t + '"]'); if (el) el.value = acc.get(t); });
        b.textContent = f.label;
        changed();
      }, () => { b.textContent = 'Location not available'; }, { enableHighAccuracy: true, timeout: 15000 });
    } }, f.label);
    return b;
  }
  if (f.type === 'check') {
    return h('label', { class: 'check full' }, h('input', { type: 'checkbox', checked: !!cur, 'data-path': path, onchange: e => put(e.target.checked) }), f.label);
  }
  if (f.type === 'toggle') {
    return h('label', { class: 'toggle full' },
      h('span', {}, h('b', {}, f.label), f.sub ? h('small', {}, f.sub) : null),
      h('input', { type: 'checkbox', checked: !!cur, 'data-path': path, onchange: e => put(e.target.checked) }));
  }
  if (f.type === 'counter') {
    const out = h('b', { 'data-path': path }, String(parseInt(cur, 10) || 0));
    const step = d => { const n = Math.max(0, (parseInt(acc.get(f.id), 10) || 0) + d); out.textContent = n; put(n); };
    return h('div', { class: 'counter full' },
      h('span', {}, h('b', {}, f.label), f.sub ? h('small', {}, f.sub) : null),
      h('div', {}, h('button', { type: 'button', 'aria-label': 'One fewer ' + f.label, onclick: () => step(-1) }, '-'), out,
        h('button', { type: 'button', 'aria-label': 'One more ' + f.label, onclick: () => step(1) }, '+')));
  }
  if (f.type === 'chips') {
    const sel = () => (Array.isArray(acc.get(f.id)) ? acc.get(f.id) : []);
    const box = h('div', { class: 'chips' });
    f.opts.forEach(o => {
      const b = h('button', { type: 'button', class: sel().includes(o) ? 'on' : '', onclick: () => {
        const now = sel().includes(o) ? sel().filter(x => x !== o) : sel().concat(o);
        b.classList.toggle('on', now.includes(o));
        put(now);
      } }, o);
      box.append(b);
    });
    return h('div', { class: 'field full' }, h('span', {}, f.label), box);
  }
  if (f.type === 'select') {
    const opts = optList(f);
    const s = h('select', { 'data-path': path, onchange: e => put(e.target.value) });
    opts.forEach(([v, t]) => s.append(h('option', { value: v }, t)));
    // an answer from an older save that is no longer on the list still shows
    if (cur !== undefined && cur !== '' && !opts.some(([v]) => v === cur)) s.append(h('option', { value: cur }, cur));
    if (cur !== undefined) s.value = cur;
    return h('label', { class: 'field' + (f.full ? ' full' : '') }, h('span', {}, f.label), s);
  }
  if (f.type === 'area') {
    return h('label', { class: 'field full' }, h('span', {}, f.label),
      h('textarea', { rows: 3, placeholder: f.ph || '', 'data-path': path, value: cur || '', oninput: e => put(e.target.value) }));
  }
  if (f.type === 'range') {
    const out = h('b', {}, String(cur ?? 0));
    const r = h('input', { type: 'range', min: f.min ?? 0, max: f.max ?? 100, step: f.step || 1, value: cur ?? 0, 'data-path': path,
      oninput: e => { out.textContent = e.target.value; put(parseFloat(e.target.value)); } });
    return h('label', { class: 'field full' }, h('span', {}, f.label, ' ', out), r);
  }
  const inp = h('input', { type: f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text', placeholder: f.ph || '',
    inputmode: f.type === 'number' ? 'decimal' : null, step: f.type === 'number' ? 'any' : null, 'data-path': path, list: f.datalist || null,
    value: cur ?? '', oninput: e => put(e.target.value) });
  return h('label', { class: 'field' + (f.full ? ' full' : '') }, h('span', {}, f.label), inp);
}

// ===== REPEATING ITEMS =====
// items: the live array. onChange fires after any add, remove or edit.
export function listBox(def, items, onChange, extra) {
  const box = h('div', { class: 'list full' });
  const title = (it, i) => {
    const t = it[def.titleField];
    const host = def.id === 'registers' ? (i === 0 ? ', host' : ', client') : '';
    return def.noun + ' ' + (i + 1) + host + (t ? ', ' + t : '');
  };
  const draw = () => {
    box.replaceChildren();
    items.forEach((it, i) => {
      const key = 'li:' + def.id + ':' + i;
      const head = h('span', {}, title(it, i));
      const grid = fieldGrid(def.fields, { get: id => it[id], set: (id, v) => {
        if (v === '' || v === false || v === undefined) delete it[id]; else it[id] = v;
        head.textContent = title(it, i);
        onChange();
      } }, { prefix: def.id + '.' + i + '.' });
      const item = h('div', { class: 'item' + (isOpen(key) ? ' open' : '') },
        h('div', { class: 'item-head', onclick: () => { const o = !item.classList.contains('open'); item.classList.toggle('open', o); setOpen(key, o); } },
          head, h('i', {})),
        h('div', { class: 'item-body' }, grid, extra ? extra(it, i) : null,
          h('button', { type: 'button', class: 'danger', onclick: () => { items.splice(i, 1); setOpen(key, false); draw(); onChange(); } }, 'Remove ' + def.noun.toLowerCase() + ' ' + (i + 1))));
      box.append(item);
    });
    box.append(h('button', { type: 'button', class: 'add', onclick: () => {
      items.push({});
      setOpen('li:' + def.id + ':' + (items.length - 1), true);
      draw();
      onChange();
    } }, def.addLabel));
  };
  draw();
  box.redraw = draw;
  return box;
}

export function readout(label, value, kind) {
  return h('div', { class: 'ro' + (kind ? ' ' + kind : '') }, h('b', {}, label), h('span', {}, value));
}

export function download(name, text, mime) {
  const a = h('a', { href: URL.createObjectURL(new Blob([text], { type: mime })), download: name });
  document.body.append(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

// Shrink a phone photo so it fits in the survey document.
export function shrinkPhoto(file, maxSide, quality) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, (maxSide || 900) / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', quality || 0.6));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Not a photo')); };
    img.src = url;
  });
}
