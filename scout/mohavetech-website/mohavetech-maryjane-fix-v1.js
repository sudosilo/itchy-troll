/* Puts the Mary Jane Man game back on mary-jane-man.vercel.app.
   A Stumbler deploy landed on that project. This finds the newest production deploy that is not
   the Stumbler page and promotes it. Uses this phone's Vercel login. */
const fs = require('fs'), path = require('path'), os = require('os'), { execSync } = require('child_process');
try { execSync('vercel whoami', { stdio: 'ignore' }); } catch (e) {}
const dirs = ['.local/share/com.vercel.cli', '.config/com.vercel.cli', '.vercel'].map(d => path.join(os.homedir(), d));
let TOKEN = null;
for (const d of dirs) { try { TOKEN = JSON.parse(fs.readFileSync(path.join(d, 'auth.json'), 'utf8')).token; if (TOKEN) break; } catch (e) {} }
if (!TOKEN) { console.log('No Vercel login found on this phone.'); process.exit(1); }
const SLUG = 'sudosilo2-1771s-projects';
const API = 'https://api.vercel.com';

async function api(method, p) {
  const r = await fetch(API + p + (p.includes('?') ? '&' : '?') + 'slug=' + SLUG, { method, headers: { Authorization: 'Bearer ' + TOKEN } });
  const t = await r.text();
  let j = null;
  try { j = JSON.parse(t); } catch (e) {}
  if (!r.ok) throw new Error(method + ' ' + p.split('?')[0] + ' answered ' + r.status + ' ' + ((j && j.error && j.error.message) || ''));
  return j === null ? t : j;
}

function htmlFiles(tree, out = []) {
  for (const f of tree || []) {
    if (f.type === 'directory') htmlFiles(f.children, out);
    else if (/\.html$/i.test(f.name) && f.uid) out.push(f);
  }
  return out;
}

async function fileText(id, uid) {
  const r = await fetch(API + '/v7/deployments/' + id + '/files/' + uid + '?slug=' + SLUG, { headers: { Authorization: 'Bearer ' + TOKEN } });
  const t = await r.text();
  try { const j = JSON.parse(t); if (j && typeof j.data === 'string') return Buffer.from(j.data, 'base64').toString('utf8'); } catch (e) {}
  return t;
}

(async () => {
  const p = await api('GET', '/v9/projects/mary-jane-man');
  const list = await api('GET', '/v6/deployments?projectId=' + p.id + '&state=READY&limit=100');
  const deps = (list.deployments || []).sort((a, b) => b.created - a.created);
  for (const d of deps) {
    let tree;
    try { tree = await api('GET', '/v6/deployments/' + d.uid + '/files'); } catch (e) { continue; }
    const files = htmlFiles(Array.isArray(tree) ? tree : tree.files);
    if (!files.length) continue;
    let stumbler = false;
    for (const f of files) if (/vercel stumbler/i.test(await fileText(d.uid, f.uid))) { stumbler = true; break; }
    if (stumbler) continue;
    await api('POST', '/v10/projects/' + p.id + '/promote/' + d.uid);
    console.log('Mary Jane Man is back on mary-jane-man.vercel.app, deploy from ' + new Date(d.created).toLocaleString());
    return;
  }
  console.log('No Mary Jane Man deploy without Stumbler was found on Vercel.');
})().catch(e => console.log(e.message));
