/* One time setup: makes a Vercel token from this phone's Vercel login and stores it in GitHub,
   so GitHub can keep the mohave.wtf app list in sync on its own. */
const fs = require('fs'), path = require('path'), os = require('os'), { execSync } = require('child_process');
try { execSync('vercel whoami', { stdio: 'ignore' }); } catch (e) {}
const dirs = ['.local/share/com.vercel.cli', '.config/com.vercel.cli', '.vercel'].map(d => path.join(os.homedir(), d));
let login = null;
for (const d of dirs) { try { login = JSON.parse(fs.readFileSync(path.join(d, 'auth.json'), 'utf8')).token; if (login) break; } catch (e) {} }
if (!login) { console.log('No Vercel login found on this phone. Run: vercel login'); process.exit(1); }
(async () => {
  const r = await fetch('https://api.vercel.com/v3/user/tokens', { method: 'POST', headers: { Authorization: 'Bearer ' + login, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'mohave-wtf-sync' }) });
  const j = await r.json();
  if (!j.bearerToken) { console.log('Vercel said: ' + JSON.stringify(j.error || j) + '\nRun: vercel login, then this again.'); process.exit(1); }
  execSync('gh secret set VERCEL_TOKEN -R sudosilo/mohavetech-website', { input: j.bearerToken });
  try { execSync('gh workflow run vercel-sync -R sudosilo/mohavetech-website', { stdio: 'ignore' }); } catch (e) {}
  console.log('Done. GitHub now keeps the mohave.wtf app list in sync every 3 hours.');
})();
