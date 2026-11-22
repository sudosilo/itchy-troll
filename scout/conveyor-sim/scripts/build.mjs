// Vercel build step. Copies the static site into public.
import fs from 'fs';
import path from 'path';

const root = process.cwd();
const out = path.join(root, 'public');
fs.rmSync(out, {recursive: true, force: true});
fs.mkdirSync(out, {recursive: true});
for (const f of ['index.html', 'machines.js', 'sim.js', 'packets.js', 'presets.js', 'stack.js']) fs.copyFileSync(path.join(root, f), path.join(out, f));
console.log('Built.');
