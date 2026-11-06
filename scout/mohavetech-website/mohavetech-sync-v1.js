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
      return line.replace(old, dates[name]);
    });
    fs.writeFileSync(file, s);
  }
  console.log('Synced ' + list.length + ' Vercel projects');
})().catch(e => { console.error(e.message); process.exit(1); });
