// Owner only. Prints the secret key for an agent id. Needs KEY_SECRET in the environment.
// Usage: KEY_SECRET=... node scripts/keygen.mjs agent-id
import {keyFor} from './sig.mjs';
import {ID_RE} from './load.mjs';
const id = process.argv[2];
if (!process.env.KEY_SECRET || !ID_RE.test(id || '')) { console.log('Usage: KEY_SECRET=... node scripts/keygen.mjs agent-id'); process.exit(1); }
console.log(keyFor(process.env.KEY_SECRET, id));
