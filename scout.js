// Copies every public sudosilo app repo with an index.html at the top into scout/<repo>/
// so the daily run can read them while only having access to itchy-troll.
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const OWNER = 'sudosilo';
const SKIP = new Set(['itchy-troll', 'heckle-troll', 'control-troll', 'sudosilo']);
const BACKEND = /(api|backend|server|poller)$/i;
const MAX_FILE = 600 * 1024;
const MAX_REPO = 4 * 1024 * 1024;
const KEEP = /\.(html?|css|js|mjs|json|svg|txt|md|webmanifest|png|jpe?g|gif|webp|ico|wav|mp3|ogg|woff2?)$/i;

async function listRepos() {
  const all = [];
  for (let p = 1; p < 10; p += 1) {
    const r = await fetch(`https://api.github.com/users/${OWNER}/repos?per_page=100&page=${p}&type=owner`, {
      headers: { Authorization: `Bearer ${process.env.GH_TOKEN}`, Accept: 'application/vnd.github+json' },
    });
    const j = await r.json();
    if (!Array.isArray(j)) throw new Error('GitHub said: ' + JSON.stringify(j).slice(0, 200));
    all.push(...j);
    if (j.length < 100) break;
  }
  return all;
}

function walk(dir, base = dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    if (name === '.git' || name === 'node_modules' || name === '.github' || name === '.vercel') continue;
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) walk(full, base, out);
    else out.push({ rel: path.relative(base, full), size: st.size });
  }
  return out;
}

(async () => {
  const repos = await listRepos();
  const index = [];
  fs.rmSync('scout', { recursive: true, force: true });
  fs.mkdirSync('scout', { recursive: true });
  fs.mkdirSync('/tmp/scout-src', { recursive: true });
  for (const r of repos) {
    const row = { name: r.name, fork: r.fork, private: r.private, description: r.description || '', pushed_at: r.pushed_at, size_kb: r.size };
    if (r.private || r.fork || r.archived) { row.skipped = 'private, fork or archived'; index.push(row); continue; }
    if (SKIP.has(r.name.toLowerCase())) { row.skipped = 'troll or profile repo'; index.push(row); continue; }
    if (BACKEND.test(r.name)) { row.skipped = 'backend name'; index.push(row); continue; }
    const src = `/tmp/scout-src/${r.name}`;
    try {
      execSync(`git clone -q --depth 1 https://github.com/${OWNER}/${r.name} "${src}"`, { stdio: 'inherit' });
    } catch {
      row.skipped = 'clone failed'; index.push(row); continue;
    }
    if (!fs.existsSync(`${src}/index.html`)) { row.skipped = 'no index.html at top'; index.push(row); continue; }
    const files = walk(src);
    let total = 0;
    const dropped = [];
    for (const f of files) {
      if (!KEEP.test(f.rel) || f.size > MAX_FILE || total + f.size > MAX_REPO) { dropped.push(f.rel); continue; }
      total += f.size;
      const dest = path.join('scout', r.name, f.rel);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(path.join(src, f.rel), dest);
    }
    row.copied_files = files.length - dropped.length;
    row.dropped = dropped.slice(0, 40);
    row.head = execSync(`git -C "${src}" rev-parse HEAD`).toString().trim();
    index.push(row);
  }
  fs.writeFileSync('scout/index.json', JSON.stringify({ at: new Date().toISOString(), repos: index }, null, 2) + '\n');
  console.log(`Scouted ${index.filter((x) => !x.skipped).length} app repos out of ${repos.length}`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
