const fs = require('fs');
const path = require('path');
const os = require('os');

const dirs = [
  path.join(os.homedir(), '.local/share/com.vercel.cli'),
  path.join(os.homedir(), '.config/com.vercel.cli'),
  path.join(os.homedir(), 'Library/Application Support/com.vercel.cli'),
  path.join(os.homedir(), '.vercel')
];

function readJson(name) {
  for (const d of dirs) {
    const p = path.join(d, name);
    if (fs.existsSync(p)) {
      try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) {}
    }
  }
  return {};
}

const token = process.env.VERCEL_TOKEN || readJson('auth.json').token;
const team = readJson('config.json').currentTeam;

function day(ms) {
  return new Date(ms).toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
}

async function getProjects() {
  const out = [];
  let until = null;
  for (;;) {
    const q = new URLSearchParams({ limit: '100' });
    if (team) q.set('teamId', team);
    if (until) q.set('until', String(until));
    const r = await fetch('https://api.vercel.com/v9/projects?' + q, {
      headers: { Authorization: 'Bearer ' + token }
    });
    const j = await r.json();
    if (!j.projects) throw new Error(JSON.stringify(j));
    out.push(...j.projects);
    if (!j.pagination || !j.pagination.next) break;
    until = j.pagination.next;
  }
  return out;
}

const SKIP = new Set(['mohavetech-website', 'db-stumbler-blue']);

function prodUrl(p) {
  const a = p.aliases.filter(x => x.endsWith('.vercel.app') && !x.includes('sudosilo') && !x.includes('-git-'));
  a.sort((x, y) => x.length - y.length);
  return 'https://' + (a[0] || p.name + '.vercel.app');
}

function editBlock(s, start, end, fn) {
  const i = s.indexOf(start), j = s.indexOf(end, i + start.length);
  if (i < 0 || j < 0) throw new Error('block not found: ' + start);
  const head = s.slice(0, i + start.length), body = s.slice(i + start.length, j), tail = s.slice(j);
  return head + fn(body) + tail;
}

function insertSorted(rows, row, key) {
  const k = key(row);
  const i = rows.findIndex(r => key(r) > k);
  if (i < 0) rows.push(row); else rows.splice(i, 0, row);
}

function objBlock(body, removed, added) {
  let rows = body.split('\n').filter(l => l.trim()).map(l => l.replace(/,\s*$/, ''));
  rows = rows.filter(l => !removed.some(n => l.trim().startsWith('"' + n + '":')));
  for (const a of added) insertSorted(rows, '  "' + a.name + '": "' + a.date + '"', l => l.trim().split('"')[1]);
  return '\n' + rows.join(',\n') + '\n';
}

function addRemove(list, script) {
  if (list.length < 100) { console.log('Vercel list looks short, skipping add and remove'); return; }
  let html = fs.readFileSync('index.html', 'utf8');
  const alpha = html.slice(html.indexOf('<div id="alpha-view"'), html.indexOf('<div id="stats-view"'));
  const hub = [...alpha.matchAll(/<a [^>]*>([^<]+)<\/a>/g)].map(m => m[1]);
  const live = new Set(list.map(p => p.name));
  const added = list.filter(p => !hub.includes(p.name) && !SKIP.has(p.name));
  const removed = hub.filter(n => !live.has(n));
  if (!added.length && !removed.length) { console.log('Hub matches Vercel'); return; }

  const lineOf = p => '<p><a href="' + prodUrl(p) + '">' + p.name + '</a></p>';
  const isRemoved = l => removed.some(n => l.includes('>' + n + '</a>'));
  html = html.split('\n').filter(l => !(l.startsWith('<p><a') && isRemoved(l))).join('\n');
  html = editBlock(html, '<div id="alpha-view" class="hidden">', '</div>', body => {
    const rows = body.split('\n').filter(l => l.trim());
    const key = l => (l.match(/>([^<]+)<\/a>/) || [, l])[1];
    for (const p of added) insertSorted(rows, lineOf(p), key);
    return '\n' + rows.join('\n') + '\n';
  });
  if (added.length) html = html.replace('<h2>Unsorted</h2>\n', '<h2>Unsorted</h2>\n' + added.map(lineOf).join('\n') + '\n');
  fs.writeFileSync('index.html', html);

  let fleet = fs.readFileSync('fleet.html', 'utf8');
  fleet = editBlock(fleet, 'const RAW=`', '`;', body => {
    let rows = body.split('\n').filter(l => l.trim());
    rows = rows.filter(l => !removed.includes(l.split('|')[0]));
    for (const p of added) insertSorted(rows, p.name + '|=|', l => l.split('|')[0]);
    return rows.join('\n');
  });
  fleet = editBlock(fleet, 'const DATES={', '};', b => objBlock(b, removed, added));
  fs.writeFileSync('fleet.html', fleet);

  let js = fs.readFileSync(script, 'utf8');
  js = editBlock(js, 'const baseDates = {', '};', b => objBlock(b, removed, added));
  fs.writeFileSync(script, js);

  for (const p of added) console.log('Added to Unsorted: ' + p.name + '  ' + prodUrl(p).slice(8));
  for (const n of removed) console.log('Removed, gone from Vercel: ' + n);
}

(async () => {
  const projects = await getProjects();
  const list = projects.map(p => {
    const prod = p.targets && p.targets.production;
    const ms = (prod && (prod.createdAt || prod.readyAt)) || p.updatedAt;
    const alias = prod && prod.alias ? prod.alias : [];
    return { name: p.name, date: day(ms), aliases: alias };
  }).sort((a, b) => a.name.localeCompare(b.name));

  fs.writeFileSync('mohavetech-vercel-projects-v1.json', JSON.stringify(list, null, 1) + '\n');

  const dates = Object.fromEntries(list.map(p => [p.name, p.date]));
  const script = fs.readdirSync('.').filter(f => /^script-v\d+\.js$/.test(f)).sort((a, b) => parseInt(b.slice(8)) - parseInt(a.slice(8)))[0];
  for (const file of [script, 'fleet.html']) {
    let s = fs.readFileSync(file, 'utf8');
    s = s.replace(/^(\s*)"([a-z0-9-]+)": "(\d{4}-\d{2}-\d{2})",?$/gm, (line, sp, name, old) => {
      if (!dates[name] || dates[name] <= old) return line;
      return sp + '"' + name + '": "' + dates[name] + '"' + (line.trim().endsWith(',') ? ',' : '');
    });
    fs.writeFileSync(file, s);
  }
  addRemove(list, script);
  console.log('Synced ' + list.length + ' Vercel projects');
})().catch(e => { console.error(e.message); process.exit(1); });
