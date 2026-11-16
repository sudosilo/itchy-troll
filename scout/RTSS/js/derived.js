// Everything worked out from the survey: the device inventory, the topology diagram,
// the integration profile and the cabling materials list.
import { state, touched } from './store.js';
import { h, fieldGrid, dropCard, readout, listBox } from './ui.js';
import { DT_TYPES, analyze, shape } from './dtmodel.js';

const plural = (n, word) => n + ' ' + word + (n === 1 ? '' : 's');

// ===== INVENTORY =====
export function inventory() {
  const f = state.doc.f, L = state.doc.l;
  const n = k => Math.max(0, parseInt(f[k], 10) || 0);
  const dtRows = state.doc.dt ? analyze(shape(state.doc.dt)).rows : [];
  const atm = f['atm.status'] || '';
  return {
    name: f['site.name'] || 'New survey',
    isp: f['net.isp'] || 'ISP / WAN',
    firewall: f['net.firewallVendor'] || 'Firewall',
    pos: f['pos.software'] || '',
    regs: L.registers, kds: L.kds, lps: L.labelPrinters, tvZones: L.tvZones,
    kdsHead: f['kitchen.kdsHead'] || 'yes',
    tablets: n('pos.tablet'), guns: n('pos.ogun'), invtabs: n('pos.invtab'), kiosks: n('pos.kiosk'),
    kprinters: n('kitchen.kprinter'), eprinters: n('kitchen.eprinter'), foh: n('boards.foh'), tvs: n('av.tv'),
    mgr: (f['pos.mgrDevice'] && f['pos.mgrDevice'] !== 'None') || f['pos.mgrCable'] ? (f['pos.mgrDevice'] || 'Workstation') : '',
    mgrWifi: f['pos.mgrConn'] === undefined || f['pos.mgrConn'] === 'WiFi',
    hasBar: !!f['venue.bar'],
    hasDT: !!f['venue.driveThru'] || dtRows.length > 0,
    hasATM: /^(Present|Planned)/.test(atm),
    processor: (f['pay.processors'] || [])[0] || '',
    tvHead: f['tvd.tvHeadType'] || 'iptv',
    dtRows
  };
}

// ===== TOPOLOGY =====
function node(label, sub, kind) { return h('div', { class: 'node ' + (kind || 'wired') }, h('b', {}, label), sub ? h('small', {}, sub) : null); }
function band(title, kind, nodes) {
  if (!nodes.length) return null;
  return h('div', { class: 'band ' + kind }, h('div', { class: 'band-title' }, title), h('div', { class: 'band-nodes' }, nodes));
}
const many = (count, label, kind) => Array.from({ length: count }, (x, i) => node(label + ' ' + (i + 1), '', kind));

export function renderTopology(root) {
  const v = inventory();
  const wifiKds = v.kdsHead === 'wifi';
  const bands = [
    band('POS terminals' + (v.pos ? ', ' + v.pos : ''), 'wired', v.regs.map((r, i) => node('Terminal ' + (i + 1), (i ? 'Client' : 'Host') + (r.type ? ', ' + r.type : '')))),
    band('Kitchen display' + (v.kdsHead === 'switch' ? '' : ', through a ' + (wifiKds ? 'WiFi' : 'wired') + ' controller'), wifiKds ? 'wifi' : 'wired',
      v.kds.map((k, i) => node('KDS ' + (i + 1), k.desig || 'Expo / Expediter', wifiKds ? 'wifi' : 'wired'))),
    band('Printers', 'wired', many(v.kprinters, 'Kitchen printer').concat(many(v.eprinters, 'Expo printer'),
      v.lps.filter(p => p.conn === 'Ethernet').map((p, i) => node('Label printer', p.dept || '')))),
    band('Menu boards and kiosks', 'wired', many(v.foh, 'Menu board').concat(many(v.kiosks, 'Kiosk'))),
    band('Drive-thru', 'wired', v.dtRows.filter(r => DT_TYPES[r.it.type].cable).map(r => node(r.name, DT_TYPES[r.it.type].cable === 'cat6' ? 'Ethernet' : DT_TYPES[r.it.type].cable === 'audio' ? 'Audio pair' : 'Loop lead'))),
    band('Back office', 'wired', [v.mgr && !v.mgrWifi ? node('Manager', v.mgr) : null, v.hasATM ? node('ATM', '') : null].filter(Boolean)),
    band('WiFi devices', 'wifi', many(v.tablets, 'Tablet POS', 'wifi').concat(many(v.guns, 'Handheld', 'wifi'), many(v.invtabs, 'Inventory tablet', 'wifi'),
      v.mgr && v.mgrWifi ? [node('Manager', v.mgr, 'wifi')] : [],
      v.lps.filter(p => p.conn === 'WiFi' || p.conn === 'Bluetooth').map(p => node('Label printer', p.dept || '', 'wifi')))),
    band('TV zones, ' + ({ iptv: 'IPTV headend', cable: 'cable box per TV', stream: 'streaming sticks', commercial: 'commercial IPTV' }[v.tvHead] || v.tvHead),
      'tv', v.tvZones.map((z, i) => node(z.zone || 'Bar', plural(parseInt(z.count, 10) || 1, 'TV') + ', ' + ({ wifi: 'WiFi', mixed: 'mixed' }[z.conn] || 'wired'), z.conn === 'wifi' ? 'wifi' : 'tv')))
  ].filter(Boolean);

  root.replaceChildren(
    h('section', { class: 'card' },
      h('h2', {}, 'System topology'),
      h('div', { class: 'topo' },
        h('div', { class: 'spine' }, node(v.isp, 'Internet', 'core'), node(v.firewall, 'Firewall / router', 'core'), node('Network switch', 'LAN', 'core'),
          bands.some(b => b.classList.contains('wifi')) ? node('WiFi access point', 'Wireless', 'wifi') : null),
        bands.length ? bands : h('p', { class: 'hint' }, 'Add terminals, screens and printers in the Survey tab and they show up here.')),
      h('div', { class: 'legend' }, h('span', {}, h('i', { class: 'k-wired' }), 'Wired'), h('span', {}, h('i', { class: 'k-wifi' }), 'WiFi'), h('span', {}, h('i', { class: 'k-tv' }), 'TV'))));
}

// ===== INTEGRATION PROFILE =====
const YNU = ['Unknown', 'Yes', 'No'];
const T = (label, ph) => ({ label, type: 'text', ph });
const S = (label, opts) => ({ label, type: 'select', opts: ['Unknown'].concat(opts.filter(o => o !== 'Unknown')) });
const PROFILE = [
  { id: 'reg', title: 'POS Software and OS', cards: v => v.regs.map((r, i) => 'Terminal ' + (i + 1) + (i ? '' : ', host') + (r.type ? ', ' + r.type : '')), fields: [
    T('POS Software and Version', 'Name and version'), T('Hardware Make and Model', 'Like PAX A920, Epson TM-T88VI'),
    S('Operating System', ['Windows 10', 'Windows 11', 'Android', 'Linux', 'iOS', 'Proprietary']), S('License Type', ['SaaS / Subscription', 'Per-terminal license', 'Site license']),
    S('Cloud or On-Premise', ['Cloud', 'On-premise', 'Hybrid']), S('Remote Access', ['None', 'TeamViewer', 'AnyDesk', 'Built-in MDM', 'RDP']),
    S('Admin Credentials Documented', YNU), S('Peripheral Comm Method', ['USB', 'Serial / COM port', 'Ethernet', 'Bluetooth', 'Mixed']), T('Known Issues', 'Brief description or none')] },
  { id: 'kds', title: 'KDS Software and Config', cards: v => v.kds.map((k, i) => 'KDS ' + (i + 1) + ', ' + (k.desig || 'Expo / Expediter')), fields: [
    T('KDS Software and Version', 'Name and version'), T('Hardware Make and Model', 'Like Epson DM-D70, PAR EverServ'), S('Operating System', ['Android', 'Windows', 'Linux', 'Proprietary']),
    S('Software Source', ['Standalone KDS app', 'Driven by POS', 'Cloud-managed', 'Local config only']), S('Config Managed Via', ['Cloud portal', 'Local settings', 'POS back-office']),
    T('Bump Bar Model', 'Model or N/A'), T('Driver Notes', 'Any driver quirks or N/A')] },
  { id: 'rp', title: 'Receipt Printers', cards: v => v.regs.map((r, i) => (r.printer && r.printer !== 'None' ? 'Receipt printer, terminal ' + (i + 1) : null)), fields: [
    T('Make and Model', 'Like Epson TM-T88VI, Star TSP143'), S('Connection Type', ['USB', 'Serial / COM', 'Ethernet', 'Bluetooth']),
    S('Driver Source', ['Manufacturer stock', 'POS-bundled driver', 'Custom driver', 'Plug-and-play / no driver']), S('Paper Width', ['80mm', '58mm']),
    S('Shared or Dedicated', ['Dedicated to one terminal', 'Shared across terminals'])] },
  { id: 'lp', title: 'Label Printers', cards: v => v.lps.map((p, i) => 'Label printer ' + (i + 1) + (p.dept ? ', ' + p.dept : '')), fields: [
    T('Firmware Version', 'Version'), T('Make and Model', 'Like Zebra ZD220, Brother QL-820'), S('Connection Type', ['USB', 'Ethernet', 'Bluetooth', 'WiFi']),
    S('Print Software', ['ZPL native', 'Manufacturer utility', 'Custom app', 'POS-managed', 'None / standalone']), T('Label Format / Size', 'Like 4x2 in, 2x1 in')] },
  { id: 'scan', title: 'Barcode and QR Scanners', cards: () => ['Scanner config'], fields: [
    T('Make and Model', 'Like Honeywell Voyager, Zebra DS2208'), S('Connection Type', ['USB HID (plug-and-play)', 'USB serial', 'Bluetooth', 'Built into terminal']),
    S('Driver Required', ['No, plug-and-play HID', 'Yes, manufacturer driver', 'Yes, custom driver']), S('What It Scans', ['Product UPC / barcode', 'Loyalty QR codes', 'ID verification', 'Inventory', 'Multiple uses']),
    S('Configured In', ['Integrated to POS', 'Standalone operation', 'Both'])] },
  { id: 'tab', title: 'Tablet Software and MDM', cards: v => Array.from({ length: v.tablets }, (x, i) => 'Tablet ' + (i + 1)), fields: [
    T('App Installed and Version', 'Name and version'), T('Make and Model', 'Like iPad 10th Gen, Samsung Galaxy Tab A8'), S('Grade', ['Consumer grade', 'White-label Android', 'Commercial / rugged', 'Apple iPad']),
    T('OS and Version', 'Like iOS 17.2, Android 13'), S('MDM Enrolled', ['No MDM', 'Jamf', 'Microsoft Intune', 'Android Enterprise', 'Custom MDM']), S('Cellular Capable', ['WiFi only', 'WiFi + Cellular']),
    T('Mount / Case Type', 'Like OtterBox, none')] },
  { id: 'fw', title: 'Network and Firewall Config', cards: v => ['Firewall, ' + v.firewall, 'Switch and access point'], fieldsFor: i => (i === 0 ? [
    T('Firmware Version', 'Version'), T('Make and Model', 'Like Cisco Meraki MX67'), S('Managed By', ['Us, full control', 'Client IT team', 'ISP managed', 'MSP']), T('Remote Access Method', 'Like Meraki dashboard, SSH, VPN'),
    S('VLAN Segmentation', ['Yes, in place', 'No', 'Recommended, not yet done']), S('PCI Network Segment Isolated', YNU)] : [
    T('AP Firmware Version', 'Version'), T('Switch Make and Model', 'Like Cisco SG110, Netgear GS308'), T('Ports Used / Total', 'Like 8 of 16'), T('AP Make and Model', 'Like Meraki MR36, Ubiquiti UAP-AC-Lite'),
    S('WiFi Standard', ['WiFi 5 (802.11ac)', 'WiFi 6 (802.11ax)', 'WiFi 6E', 'WiFi 7', 'Older'])]) },
  { id: 'mb', title: 'Menu Board CMS and Players', cards: v => (v.foh || v.dtRows.some(r => ['menu', 'presell', 'ocd'].includes(r.it.type)) ? ['Media player / CMS'] : []), fields: [
    T('CMS Platform and Version', 'Name and version'), T('Media Player Hardware', 'Like BrightSign XT1144, custom SBC'), S('Player OS', ['BrightOS', 'Android', 'Windows', 'Raspberry Pi OS', 'Proprietary']),
    S('Content Update Method', ['Remote push via cloud', 'USB manual update', 'Scheduled pull', 'On-site manual']), S('CMS Login Documented', YNU), S('Who Manages Content', ['Us', 'Client', 'Franchisor / corporate', 'Third-party agency'])] },
  { id: 'tv', title: 'TV Distribution Software', cards: v => (v.tvZones.length ? ['Head unit and distribution'] : []), fields: [
    T('Firmware / Software Version', 'Version'), T('Head Unit Make and Model', 'Like Amino A140, ZeeVee ZvPro'), T('Channel Management Platform', 'Like DirecTV for Business, custom IPTV'),
    S('Who Controls Content', ['Us', 'Client', 'Cable provider', 'Corporate / franchisor']), S('Login Credentials Documented', YNU)] },
  { id: 'pin', title: 'Payment Terminals and PIN Pads', cards: () => ['PIN pad / payment terminal', 'Processor account'], fieldsFor: i => (i === 0 ? [
    T('Firmware Version', 'Version'), T('Make and Model', 'Like Verifone VX805, Ingenico iPP320, PAX S300'), S('Firmware Managed By', ['Processor, do not touch', 'Us, we update', 'Client IT', 'Locked']),
    S('Encryption Method', ['P2PE', 'E2EE', 'SRED']), S('Key Injection By', ['Processor', 'Reseller / us']), T('Key Injection Date', 'Date or unknown'), S('PCI Scope', ['In scope', 'Out of scope, P2PE listed']),
    S('Integrated to POS', ['Yes, fully integrated', 'Standalone', 'Semi-integrated'])] : [
    T('Processor Name', 'Like GlobalPay, Heartland, Elavon'), T('Merchant ID (MID)', 'From the statement'), T('Gateway (if separate)', 'Name or none'), S('Processing Model', ['Interchange plus', 'Flat rate', 'Tiered', 'Subscription']),
    T('Effective Rate (if known)', 'Percent'), S('Contract Status', ['Month to month', 'Under contract', 'Contract end date known']), T('Contract End Date', 'Date or N/A'),
    S('Early Termination Fee', ['None', 'Yes, amount known', 'Yes, amount unknown']), S('Account Owned By', ['Franchisee', 'Franchisor / corporate', 'Independent owner']),
    S('Equipment Rental vs Owned', ['Client owns all equipment', 'Processor renting terminals', 'Mixed']), S('Statement Reviewed On Site', ['Yes', 'No', 'Client refused'])]) },
  { id: 'dt', title: 'Drive-Thru Audio and Timer', cards: v => (v.hasDT ? ['Headset and timer system'] : []), fields: [
    T('Make and Model', 'Like HME ZOOM, Panasonic'), S('Base Station Software', ['Manufacturer stock', 'Custom config', 'Cloud-managed']), T('Timer System', 'Like HME ZOOM, Delphi, none'),
    S('Range Extension Method', ['None needed', 'Vendor extender', 'In-house build (SBC)'])] },
  { id: 'atm', title: 'ATM', cards: v => (v.hasATM ? ['ATM'] : []), fields: [
    T('Make and Model', 'Like Nautilus Hyosung NH-2700, Genmega G2500'), S('Floor Material at Install Point', ['Concrete', 'Tile over concrete', 'Wood subfloor']), S('Managed By', ['Us', 'Third-party ATM company', 'Client']),
    S('Network Connection', ['Ethernet, dedicated drop', 'Ethernet, shared', 'Cellular modem']), T('Processor / Network', 'Like Cardtronics, unknown')] }
];
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

export function renderProfile(root) {
  const v = inventory();
  const P = state.doc.profile;
  const kids = [h('p', { class: 'hint' }, 'One card per device from the Survey tab. Fill these in at the site, with the gear in front of you.')];
  PROFILE.forEach(group => {
    const titles = group.cards(v);
    const live = titles.map((t, i) => [t, i]).filter(([t]) => t);
    if (!live.length) return;
    const body = live.map(([title, i]) => {
      const key = group.id + '-' + (i + 1);
      const fields = (group.fieldsFor ? group.fieldsFor(i) : group.fields).map(f => Object.assign({ id: slug(f.label) }, f));
      return h('div', { class: 'pcard' }, h('div', { class: 'subhead' }, title),
        fieldGrid(fields, { get: id => (P[key] || {})[id], set: (id, val) => {
          P[key] = P[key] || {};
          if (val === '' || val === undefined) delete P[key][id]; else P[key][id] = val;
          touched({ src: 'profile-tab' });
        } }, { prefix: 'profile.' + key + '.' }));
    });
    const nk = group.id + '-notes';
    body.push(fieldGrid([{ id: 'notes', label: 'Site Notes for This Group', type: 'area', ph: 'Quirks, workarounds and who to call' }],
      { get: () => (P[nk] || {}).notes, set: (id, val) => { P[nk] = { notes: val }; touched({ src: 'profile-tab' }); } }, { prefix: 'profile.' + nk + '.' }));
    kids.push(dropCard('p:' + group.id, group.title, plural(live.length, 'card'), body));
  });
  root.replaceChildren(...kids);
}

// ===== CABLING =====
// Each wired device is one Cat6 drop back to the rack. 100 ft unless you measure it, or the drive-thru model works it out.
export function drops() {
  const v = inventory();
  const out = [];
  const add = (key, label, ft) => out.push({ key, label, ft: ft || 100, auto: !!ft });
  v.regs.forEach((r, i) => {
    const t = 'Terminal ' + (i + 1) + (r.type ? ' (' + r.type + ')' : '');
    add('reg' + i + 'pos', t + ', POS');
    add('reg' + i + 'pin', t + ', PIN pad');
  });
  if (v.regs.length) add('regspare', 'Register area, spare drop');
  v.kds.forEach((k, i) => add('kds' + i, 'KDS ' + (i + 1) + ', ' + (k.desig || 'Expo / Expediter')));
  for (let i = 0; i < v.kiosks; i++) add('kiosk' + i, 'Kiosk ' + (i + 1));
  for (let i = 0; i < v.kprinters; i++) add('kp' + i, 'Kitchen printer ' + (i + 1));
  for (let i = 0; i < v.eprinters; i++) add('ep' + i, 'Expo printer ' + (i + 1));
  for (let i = 0; i < v.foh; i++) add('foh' + i, 'Menu board ' + (i + 1));
  v.lps.forEach((p, i) => { if (p.conn === 'Ethernet') add('lp' + i, 'Label printer ' + (i + 1) + (p.dept ? ', ' + p.dept : '')); });
  if (v.mgr) add('mgr', 'Manager workstation');
  if (v.hasATM) add('atm', 'ATM');
  const other = [];
  v.dtRows.forEach(r => {
    const c = DT_TYPES[r.it.type].cable;
    if (c === 'cat6') add('dt' + r.it.id, 'Drive-thru, ' + r.name, r.run);
    else if (c) other.push({ label: r.name, kind: c === 'audio' ? 'Audio pair' : 'Loop lead-in', ft: r.run });
  });
  state.doc.cabling.custom.forEach((c, i) => add('custom' + i, c.label || 'Custom drop', 0));
  const C = state.doc.cabling.ft;
  out.forEach(d => { d.qty = 1; if (C[d.key] !== undefined && C[d.key] !== '') d.ft = Math.max(0, parseInt(C[d.key], 10) || 0); });
  return { list: out, other, v };
}

function spools(ft) {
  const a = Math.ceil(ft / 300), b = Math.ceil(ft / 1000);
  const wa = a * 300 - ft, wb = b * 1000 - ft;
  const big = wb < wa || ft > 600;
  return [['300 ft spools', a + ', ' + wa + ' ft left over'], ['1000 ft spools', b + ', ' + wb + ' ft left over'],
    ['Buy', big ? plural(b, '1000 ft spool') : plural(a, '300 ft spool')]];
}

const RACK = [
  { id: 'status', label: 'Rack Status', type: 'select', opts: ['Unknown', 'Yes, existing rack, reuse', 'No, wall mount only', 'New rack needed, purchase'] },
  { id: 'size', label: 'Rack Size', type: 'select', opts: ['TBD', '4U wall mount', '6U wall mount', '9U wall mount', '12U wall mount', '12U floor standing', '18U floor standing', '24U floor standing'] },
  { id: 'wall', label: 'Wall Material at Rack', type: 'select', opts: ['Unknown', 'Drywall, wood stud', 'Drywall, metal stud', 'Drywall, no stud (anchor needed)', 'Concrete block / CMU', 'Brick'] },
  { id: 'electrician', label: 'Electrician Needed', type: 'select', opts: ['Unknown', 'No, existing outlets sufficient', 'Yes, minor work', 'Yes, significant work'] },
  { id: 'notes', label: 'Rack Notes', type: 'area', ph: 'Rack brand preference, UPS model, special mounting requirements' }
];
const OBS = { id: 'obs', noun: 'Obstruction', addLabel: 'Add obstruction', titleField: 'where', fields: [
  { id: 'where', label: 'Location / Run Affected', type: 'text', ph: 'Like Front counter to KDS 2', full: true },
  { id: 'what', label: 'Obstruction', type: 'text', ph: 'Like Concrete wall, HVAC duct blocking path', full: true }] };
const CUSTOM = { id: 'cdrop', noun: 'Custom drop', addLabel: 'Add custom drop', titleField: 'label', fields: [
  { id: 'label', label: 'What It Feeds', type: 'text', ph: 'Like Camera over the back door', full: true }] };

export function renderCabling(root) {
  const C = state.doc.cabling;
  const totals = h('div', { class: 'readouts' });
  const mats = h('div', {});
  const table = h('div', { class: 'drops' });

  const recalc = () => {
    const { list, other, v } = drops();
    const n = list.length;
    const ft = list.reduce((s, d) => s + d.ft, 0);
    const panels = Math.ceil(n / 24) || 1;
    totals.replaceChildren(readout('Total drops', String(n)), readout('Cat6 footage', ft + ' ft'), ...spools(ft).map(([a, b]) => readout(a, b)),
      ...other.map(o => readout(o.label + ', ' + o.kind, o.ft + ' ft')));
    const group = (title, rows) => [h('div', { class: 'subhead' }, title), h('div', { class: 'mats' }, rows.map(([name, qty, note]) =>
      h('div', { class: 'mat' }, h('b', {}, String(qty)), h('span', {}, name, h('small', {}, note)))))];
    mats.replaceChildren(...[
      group('Termination hardware', [
        ['Single-port keystone faceplate', n, 'One per drop'], ['Blank keystone filler', Math.ceil(n * 0.5), 'Fills unused ports'],
        ['Cat6 keystone jack', n * 2, 'Two per drop, device end and panel end'], ['Surface mount box, 1 port', Math.round(n * 0.6), 'For ceiling and surface drops'],
        ['Patch panel, 24 port, 1U', panels, 'One per 24 drops']]),
      group('Patch cables', [
        ['Patch cable, 3 ft, device end', n, 'Faceplate to device'], ['Patch cable, 1 ft, rack end', n, 'Panel to switch'], ['Spare patch cables, 3 ft and 6 ft', Math.ceil(n * 0.2), 'About 20 percent spare']]),
      group('Rack equipment', [
        ['Rack-mount power strip, 1U', panels, 'One per rack'], ['UPS / battery backup', v.regs.length, 'One per register position'], ['Rack-mount switch, 24 port', panels, 'Match the patch panels'],
        ['1U rack shelf', 1, 'For gear without rack ears'], ['Rack screws and cage nuts, bag', 1, 'For all rack gear']]),
      group('Installation accessories', [
        ['Sticky-back zip tie mounts', Math.max(20, n * 3), 'About three per drop'], ['Zip ties, 8 inch, bag of 100', Math.ceil(n / 20), 'One bag per 20 drops'], ['Velcro cable ties, bag of 25', 1, 'Reusable'],
        ['Double-sided foam tape roll', 1, 'Heavy duty'], ['Drywall screws, assortment', 1, '1.5 and 2.5 inch'], ['Lag bolts with large washers', v.kds.length * 2, 'For KDS mounts'],
        ['Masonry anchors, assortment', 1, 'Concrete and block'], ['Toggle bolts', 1, 'Hollow drywall without a stud'], ['Cable raceway, 6 ft sections', Math.ceil(n * 0.3), 'Surface runs'],
        ['Low-voltage mounting brackets', Math.round(n * 0.4), 'In-wall keystones']])
    ].flat());
  };

  const drawTable = () => {
    const { list } = drops();
    table.replaceChildren(h('div', { class: 'drop-row head' }, h('span', {}, 'Drop'), h('span', {}, 'Feet')),
      ...list.map(d => h('label', { class: 'drop-row' }, h('span', {}, d.label, d.auto && C.ft[d.key] === undefined ? h('small', {}, 'From the drive-thru model') : null),
        h('input', { type: 'number', min: 0, inputmode: 'numeric', value: d.ft, 'data-path': 'cabling.ft.' + d.key,
          oninput: e => { if (e.target.value === '') delete C.ft[d.key]; else C.ft[d.key] = e.target.value; touched({ src: 'cabling' }); recalc(); } }))));
    if (!list.length) table.append(h('p', { class: 'hint' }, 'No wired devices yet. Add them in the Survey tab.'));
    recalc();
  };
  drawTable();

  root.replaceChildren(
    h('section', { class: 'card' }, h('h2', {}, 'Cable drops'),
      h('p', { class: 'hint' }, 'Each wired device is one Cat6 run. Runs start at 100 ft. Type the measured length to change one, or 0 to leave it out. Registers get two drops, POS and PIN pad. Tablets use WiFi.'),
      table,
      listBox(CUSTOM, C.custom, () => { touched({ src: 'cabling' }); drawTable(); })),
    h('section', { class: 'card' }, h('h2', {}, 'Totals'), totals),
    dropCard('c:mats', 'Materials', '', mats),
    dropCard('c:rack', 'Rack and power', '', fieldGrid(RACK, { get: id => C.rack[id], set: (id, val) => { C.rack[id] = val; touched({ src: 'cabling' }); } }, { prefix: 'cabling.rack.' })),
    dropCard('c:obs', 'Obstructions', '', listBox(OBS, C.obs, () => touched({ src: 'cabling' }))));
}

// ===== EXPORT ROWS =====
export function csvRows() {
  const rows = [['Group', 'Field', 'Value']];
  const d = state.doc;
  rows.push(['Survey', 'Survey ID', d.surveyId]);
  Object.entries(d.f).forEach(([k, val]) => rows.push(['Survey', k, Array.isArray(val) ? val.join('; ') : val]));
  Object.entries(d.l).forEach(([k, arr]) => arr.forEach((it, i) => Object.entries(it).forEach(([fk, val]) => rows.push([k + ' ' + (i + 1), fk, val]))));
  Object.entries(d.profile).forEach(([k, obj]) => Object.entries(obj).forEach(([fk, val]) => rows.push(['Profile ' + k, fk, val])));
  drops().list.forEach(x => rows.push(['Cabling', x.label, x.ft + ' ft']));
  d.cabling.obs.forEach((o, i) => rows.push(['Obstruction ' + (i + 1), o.where || '', o.what || '']));
  Object.entries(d.cabling.rack).forEach(([k, val]) => rows.push(['Rack', k, val]));
  if (d.dt) {
    const A = analyze(shape(d.dt));
    ['lat', 'lon', 'facing', 'bldgW', 'bldgD', 'bldgH', 'laneLen', 'laneWidth', 'lanes'].forEach(k => rows.push(['Drive-thru', k, d.dt[k]]));
    A.queue.parts.forEach(([a, b]) => rows.push(['Drive-thru stack', a, b + ' cars']));
    A.rows.forEach(r => {
      const g = 'Drive-thru ' + (r.idx + 1) + ' ' + r.name;
      rows.push([g, 'Distance from entry (ft)', r.it.pos]);
      if (r.faces !== null) rows.push([g, 'Faces (deg)', Math.round(r.faces)], [g, 'Direct sun (h)', r.sunH], [g, 'Peak face temp (F)', Math.round(r.peakT)]);
      rows.push([g, 'Run to closet (ft)', r.run]);
      Object.entries(r.it.v).forEach(([fk, val]) => rows.push([g, fk, val]));
    });
  }
  return rows;
}
