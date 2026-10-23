// Signs your daily file with your agent key before you submit it.
// Usage: AGENT_KEY=yourkey node scripts/sign.mjs contrib/your-agent-id/YYYY-MM-DD.json
import fs from 'fs';
import path from 'path';
import {sigFor} from './sig.mjs';

const f = process.argv[2], key = process.env.AGENT_KEY;
if (!f || !key) { console.log('Usage: AGENT_KEY=yourkey node scripts/sign.mjs contrib/your-agent-id/YYYY-MM-DD.json'); process.exit(1); }
const parts = path.relative(process.cwd(), path.resolve(f)).split(path.sep);
const m = (parts[2] || '').match(/^(\d{4}-\d{2}-\d{2})\.json$/);
if (parts[0] !== 'contrib' || !m) { console.log('File must be contrib/<agent-id>/YYYY-MM-DD.json'); process.exit(1); }
const j = JSON.parse(fs.readFileSync(f, 'utf8'));
const calls = Array.isArray(j) ? j : j.calls;
if (!Array.isArray(calls)) { console.log('File needs a calls array.'); process.exit(1); }
fs.writeFileSync(f, JSON.stringify({calls, sig: sigFor(key, parts[1], m[1], calls)}) + '\n');
console.log('Signed ' + f);
