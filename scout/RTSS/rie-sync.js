/* RIE sync for RTSS: site selector, cloud save, cloud load, autosave. */
(function () {
  const API = window.RIE_API || 'https://rie-api-production.up.railway.app';
  const SITE_KEY = 'rie_activeSite';
  let activeSiteId = null;
  let sites = {};
  let restoring = false;
  let saveTimer = null;
  let dirty = false;

  // Page 1 is the first .app block; pages 2 and 3 are built from it.
  const scope = () => document.querySelector('body > .app');

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

  // Stable key per field: its id, else its label or placeholder plus occurrence number.
  function fieldEntries() {
    const seen = {};
    const out = [];
    scope().querySelectorAll('input, select, textarea').forEach((el) => {
      if (el.id === 'surveyId') return;
      const base = el.id || el.name ||
        el.closest('.field')?.querySelector('label')?.textContent?.trim() ||
        el.placeholder || el.tagName.toLowerCase();
      seen[base] = (seen[base] || 0) + 1;
      out.push([base + '#' + seen[base], el]);
    });
    return out;
  }

  function snapshot() {
    const fields = {};
    fieldEntries().forEach(([key, el]) => {
      fields[key] = el.type === 'checkbox' || el.type === 'radio' ? el.checked : el.value;
    });
    const chips = [];
    scope().querySelectorAll('.vendor-chip').forEach((c, i) => { if (c.classList.contains('selected')) chips.push(i); });
    const ctl = document.getElementById('customTechList');
    return {
      _rtss: 2,
      surveyId: document.getElementById('surveyId').value,
      counts: { reg: regCount, kds: kdsCount, lp: lpCount, tv: tvZoneCount },
      counters: Object.assign({}, counters),
      chips,
      customTechHtml: ctl ? ctl.innerHTML : '',
      fields
    };
  }

  function restore(data) {
    restoring = true;
    try {
      clearForm();
      if (!data || data._rtss !== 2) return;
      const c = data.counts || {};
      for (let i = 0; i < (c.reg || 0); i++) addReg();
      for (let i = 0; i < (c.kds || 0); i++) addKds();
      for (let i = 0; i < (c.lp || 0); i++) addLabelPrinter();
      for (let i = 0; i < (c.tv || 0); i++) addTvZone();
      const ctl = document.getElementById('customTechList');
      if (ctl && data.customTechHtml) ctl.innerHTML = data.customTechHtml;
      Object.entries(data.counters || {}).forEach(([k, v]) => {
        counters[k] = v;
        const el = document.getElementById(k + '-val');
        if (el) el.textContent = v;
      });
      const fields = data.fields || {};
      fieldEntries().forEach(([key, el]) => {
        if (!(key in fields)) return;
        if (el.type === 'checkbox' || el.type === 'radio') el.checked = !!fields[key];
        else el.value = fields[key];
        el.dispatchEvent(new Event('change', { bubbles: true }));
      });
      const chipEls = scope().querySelectorAll('.vendor-chip');
      (data.chips || []).forEach((i) => chipEls[i] && chipEls[i].classList.add('selected'));
      if (data.surveyId) {
        document.getElementById('surveyId').value = data.surveyId;
        updateSurveyId(data.surveyId);
      }
      updateProgress();
      renderTopology();
    } finally {
      // clearForm wipes every select on the page, including the site picker
      const sel = document.getElementById('rie-site');
      if (sel && activeSiteId) sel.value = activeSiteId;
      restoring = false;
    }
  }


  const LINKS = {
    'Restaurant / Business Name#1': 'business_name',
    'Brand / Chain#1': 'brand',
    'Address#1': 'address',
    'City#1': 'city',
    'stateSelect#1': 'state',
    'ispField#1': 'isp',
    'POS Software (site-wide)#1': 'pos_brand',
    'Firewall / Router Vendor#1': 'firewall_vendor'
  };
  function linkedFields() {
    return fieldEntries().filter(([k]) => LINKS[k]).map(([k, el]) => [LINKS[k], el]);
  }
  function afterProfileApplied() {
    updateProgress();
    renderTopology();
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
      await api('/sites/' + activeSiteId + '/survey', 'PUT', snapshot());
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
      restore(await api('/sites/' + activeSiteId + '/survey'));
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
      #rie-bar { display:flex; align-items:center; gap:8px; padding:8px 16px;
        background:var(--surface); border-bottom:1px solid var(--border); }
      #rie-bar select, #rie-bar button { font-family:'DM Mono',monospace; font-size:11px; height:30px;
        background:var(--surface2); color:var(--text); border:1px solid var(--border); border-radius:4px; padding:0 10px; }
      #rie-bar select { flex:1; min-width:0; color:var(--accent); }
      #rie-bar button { cursor:pointer; letter-spacing:1px; text-transform:uppercase; }
      #rie-bar button.primary { border-color:var(--accent); color:var(--accent); }
      #rie-status { font-family:'DM Mono',monospace; font-size:10px; letter-spacing:1px; color:var(--text-dim); min-width:64px; text-align:right; }
      #rie-status[data-kind="ok"] { color:var(--green); }
      #rie-status[data-kind="warn"], #rie-status[data-kind="busy"] { color:var(--accent); }
      #rie-status[data-kind="err"] { color:var(--accent2); }
    `;
    document.head.appendChild(style);
    const bar = document.createElement('div');
    bar.id = 'rie-bar';
    bar.innerHTML = '<select id="rie-site" aria-label="Site"></select>' +
      '<button type="button" id="rie-new">New site</button>' +
      '<button type="button" class="primary" id="rie-save">Save</button>' +
      '<span id="rie-status"></span>';
    document.querySelector('header').insertAdjacentElement('afterend', bar);
    document.getElementById('rie-site').addEventListener('change', (e) => openSite(e.target.value));
    document.getElementById('rie-new').addEventListener('click', newSite);
    document.getElementById('rie-save').addEventListener('click', save);
  }

  async function init() {
    buildBar();
    const root = scope();
    root.addEventListener('input', (e) => { queueSave(); queueProfile(e.target); });
    root.addEventListener('change', (e) => { queueSave(); queueProfile(e.target); });
    root.addEventListener('click', (e) => {
      if (e.target.closest('.vendor-chip, button, .counter-btn')) queueSave();
    });
    document.getElementById('surveyId').addEventListener('input', queueSave);
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
