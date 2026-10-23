/* RIE sync for RDSS: site selector, cloud save, cloud load, autosave. */
(function () {
  const API = window.RIE_API || 'https://rie-api-production.up.railway.app';
  const SITE_KEY = 'rie_activeSite';
  const PANELS = ['#tab-build', '#tab-survey'];
  let activeSiteId = null;
  let sites = {};
  let restoring = false;
  let saveTimer = null;
  let dirty = false;

  async function api(path, method, body) {
    const opts = { method: method || 'GET', headers: { 'Content-Type': 'application/json' } };
    if (body !== undefined) opts.body = JSON.stringify(body);
    const res = await fetch(API + path, opts);
    if (!res.ok) throw new Error('API ' + res.status);
    return res.json();
  }

  function status(msg, kind) {
    const el = document.getElementById('rie-status');
    if (!el) return;
    el.textContent = msg;
    el.dataset.kind = kind || '';
  }

  // Stable key per field: id, else checklist data-key, else label or placeholder plus occurrence.
  function fieldEntries() {
    const seen = {};
    const out = [];
    PANELS.forEach((sel) => {
      const panel = document.querySelector(sel);
      if (!panel) return;
      panel.querySelectorAll('input, select, textarea').forEach((el) => {
        const item = el.closest('.check-item');
        const base = sel + ':' + (el.id ||
          (item && item.dataset.key ? 'check-' + item.dataset.key : '') ||
          el.closest('.field, .form-group')?.querySelector('label')?.textContent?.trim() ||
          el.placeholder || el.tagName.toLowerCase());
        seen[base] = (seen[base] || 0) + 1;
        out.push([base + '#' + seen[base], el]);
      });
    });
    return out;
  }

  function snapshot() {
    const fields = {};
    fieldEntries().forEach(([key, el]) => {
      fields[key] = el.type === 'checkbox' || el.type === 'radio' ? el.checked : el.value;
    });
    return { _rdss: 2, fields };
  }

  function blank() {
    fieldEntries().forEach(([, el]) => {
      if (el.type === 'checkbox' || el.type === 'radio') el.checked = false;
      else el.value = '';
      const item = el.closest('.check-item');
      if (item) item.classList.remove('checked');
    });
  }

  function restore(data) {
    restoring = true;
    try {
      blank();
      const fields = (data && data._rdss === 2 && data.fields) || {};
      fieldEntries().forEach(([key, el]) => {
        if (!(key in fields)) return;
        if (el.type === 'checkbox' || el.type === 'radio') {
          el.checked = !!fields[key];
          const item = el.closest('.check-item');
          if (item) item.classList.toggle('checked', el.checked);
        } else {
          el.value = fields[key];
        }
      });
      if (typeof updateScore === 'function') updateScore();
      if (typeof updateSurveyScore === 'function') updateSurveyScore();
    } finally {
      restoring = false;
    }
  }


  const LINKS = {
    'b-name': 'business_name', 's-name': 'business_name',
    'b-concept': 'concept', 's-concept': 'concept',
    'b-domain': 'website', 's-domain': 'website',
    'b-phone': 'phone', 's-phone': 'phone',
    'b-address': 'address', 's-address': 'address',
    's-pos-brand': 'pos_brand',
    's-ordering': 'ordering_platform'
  };
  function linkedFields() {
    return Object.entries(LINKS).map(([id, key]) => [key, document.getElementById(id)]).filter(([, el]) => el);
  }
  function afterProfileApplied() {
    if (typeof updateScore === 'function') updateScore();
    if (typeof updateSurveyScore === 'function') updateSurveyScore();
    queueSave();
  }

  // ===== SHARED SITE PROFILE =====
  let profileTimer = null;
  let profilePending = {};

  // A select left on its first option (Select..., Unknown / TBD) counts as empty.
  function linkedValue(el) {
    if (el.tagName === 'SELECT' && el.selectedIndex <= 0) return '';
    return (el.value || '').trim();
  }

  function setLinked(el, v) {
    if (el.tagName === 'SELECT') {
      const want = String(v).trim().toLowerCase();
      const opt = [...el.options].find((o) => o.value.toLowerCase() === want || o.text.trim().toLowerCase() === want);
      if (!opt || el.value === opt.value) return false;
      el.value = opt.value;
    } else {
      if (el.value === v) return false;
      el.value = v;
    }
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  function applyProfile(profile) {
    if (!profile) return;
    const wasRestoring = restoring;
    restoring = true;
    let changed = false;
    try {
      linkedFields().forEach(([key, el]) => {
        const v = profile[key];
        if (v && el !== document.activeElement && setLinked(el, v)) changed = true;
      });
    } finally {
      restoring = wasRestoring;
    }
    if (changed) afterProfileApplied();
  }

  // Push values this tool has but the profile lacks, so older saves fill the profile once.
  function backfillProfile(profile) {
    const patch = {};
    linkedFields().forEach(([key, el]) => {
      const v = linkedValue(el);
      if (v && !(profile && profile[key]) && !patch[key]) patch[key] = v;
    });
    if (Object.keys(patch).length) sendProfile(patch);
  }

  async function sendProfile(patch) {
    if (!activeSiteId) return;
    try { await api('/sites/' + activeSiteId + '/profile', 'PATCH', patch); } catch (e) {}
  }

  function queueProfile(target) {
    if (restoring || !activeSiteId) return;
    const hit = linkedFields().find(([, el]) => el === target);
    if (!hit) return;
    profilePending[hit[0]] = linkedValue(target);
    clearTimeout(profileTimer);
    profileTimer = setTimeout(() => {
      const patch = profilePending;
      profilePending = {};
      sendProfile(patch);
    }, 1200);
  }

  async function pullProfile(backfill) {
    if (!activeSiteId) return;
    try {
      const profile = await api('/sites/' + activeSiteId + '/profile');
      applyProfile(profile);
      if (backfill) backfillProfile(profile);
    } catch (e) {}
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') pullProfile(false);
  });

  async function save() {
    if (!activeSiteId) { status('Pick a site first', 'warn'); return; }
    clearTimeout(saveTimer);
    dirty = false;
    status('Saving', 'busy');
    try {
      await api('/sites/' + activeSiteId + '/design', 'PUT', snapshot());
      status('Saved ' + new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }), 'ok');
    } catch (e) {
      dirty = true;
      status('Save failed', 'err');
    }
  }

  function queueSave() {
    if (restoring || !activeSiteId) return;
    dirty = true;
    status('Unsaved', 'warn');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 2500);
  }

  function fillSelect() {
    const sel = document.getElementById('rie-site');
    sel.innerHTML = '';
    const ids = Object.keys(sites);
    if (!ids.length) {
      const o = document.createElement('option');
      o.textContent = 'No sites yet';
      o.value = '';
      sel.appendChild(o);
      return;
    }
    ids.forEach((id) => {
      const o = document.createElement('option');
      o.value = id;
      o.textContent = sites[id].name;
      o.selected = id === activeSiteId;
      sel.appendChild(o);
    });
  }

  async function openSite(id) {
    if (dirty && activeSiteId) await save();
    activeSiteId = id || null;
    try { localStorage.setItem(SITE_KEY, activeSiteId || ''); } catch (e) {}
    if (!activeSiteId) { restore(null); return; }
    status('Loading', 'busy');
    try {
      restore(await api('/sites/' + activeSiteId + '/design'));
      await pullProfile(true);
      status('Synced', 'ok');
    } catch (e) {
      status('Load failed', 'err');
    }
  }

  async function newSite() {
    const name = (prompt('New site name') || '').trim();
    if (!name) return;
    const id = 'site-' + Date.now().toString(36);
    try {
      await api('/sites', 'POST', { id, name });
      sites[id] = { name };
      if (dirty && activeSiteId) await save();
      activeSiteId = null;
      fillSelect();
      document.getElementById('rie-site').value = id;
      await openSite(id);
    } catch (e) {
      status('Create failed', 'err');
    }
  }

  function buildBar() {
    const style = document.createElement('style');
    style.textContent = `
      #rie-bar { display:flex; align-items:center; gap:8px; padding:8px 16px; position:sticky; top:56px; z-index:99;
        background:var(--surface); border-bottom:1px solid var(--border); }
      #rie-bar select, #rie-bar button { font-family:'DM Mono',monospace; font-size:11px; height:30px;
        background:var(--surface2); color:var(--text); border:1px solid var(--border); padding:0 10px; }
      #rie-bar select { flex:1; min-width:0; color:var(--accent); }
      #rie-bar button { cursor:pointer; letter-spacing:1px; text-transform:uppercase; }
      #rie-bar button.primary { border-color:var(--accent); color:var(--accent); }
      #rie-status { font-family:'DM Mono',monospace; font-size:10px; letter-spacing:1px; color:var(--muted); min-width:64px; text-align:right; }
      #rie-status[data-kind="ok"] { color:var(--success); }
      #rie-status[data-kind="warn"], #rie-status[data-kind="busy"] { color:var(--warning); }
      #rie-status[data-kind="err"] { color:var(--accent2); }
    `;
    document.head.appendChild(style);
    const bar = document.createElement('div');
    bar.id = 'rie-bar';
    bar.innerHTML = '<select id="rie-site" aria-label="Site"></select>' +
      '<button type="button" id="rie-new">New site</button>' +
      '<button type="button" class="primary" id="rie-save">Save</button>' +
      '<span id="rie-status"></span>';
    document.querySelector('.header').insertAdjacentElement('afterend', bar);
    document.getElementById('rie-site').addEventListener('change', (e) => openSite(e.target.value));
    document.getElementById('rie-new').addEventListener('click', newSite);
    document.getElementById('rie-save').addEventListener('click', save);
  }

  async function init() {
    buildBar();
    PANELS.forEach((sel) => {
      const panel = document.querySelector(sel);
      if (!panel) return;
      panel.addEventListener('input', (e) => { queueSave(); queueProfile(e.target); });
      panel.addEventListener('change', (e) => { queueSave(); queueProfile(e.target); });
      panel.addEventListener('click', (e) => { if (e.target.closest('.check-item')) queueSave(); });
    });
    status('Connecting', 'busy');
    try {
      (await api('/sites')).forEach((s) => { sites[s.id] = { name: s.name }; });
    } catch (e) {
      status('API offline', 'err');
      fillSelect();
      return;
    }
    let saved = '';
    try { saved = localStorage.getItem(SITE_KEY) || ''; } catch (e) {}
    activeSiteId = sites[saved] ? saved : (Object.keys(sites)[0] || null);
    fillSelect();
    if (activeSiteId) await openSite(activeSiteId);
    else status('Create a site', 'warn');
  }

  window.rieSave = save;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
