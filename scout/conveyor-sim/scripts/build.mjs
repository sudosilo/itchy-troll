// Vercel build step. Copies the viewer and every contribution into public, and writes manifest.json listing them.
import fs from 'fs';
import path from 'path';
import {loadContrib} from './load.mjs';

const root = process.cwd();
const out = path.join(root, 'public');
fs.rmSync(out, {recursive: true, force: true});
fs.mkdirSync(out, {recursive: true});
for (const f of ['index.html', 'engine.js', 'agent-rules.txt', 'steward-rules.txt', 'testbed.json']) fs.copyFileSync(path.join(root, f), path.join(out, f));
fs.cpSync(path.join(root, 'examples'), path.join(out, 'examples'), {recursive: true});
const {agents, files, dropped} = loadContrib(root);
if (dropped.length) console.log('Dropped unsigned or forged files: ' + dropped.join(', '));
for (const f of files) {
  const dest = path.join(out, f.path);
  fs.mkdirSync(path.dirname(dest), {recursive: true});
  fs.copyFileSync(path.join(root, f.path), dest);
}
fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify({
  built: new Date().toISOString(),
  agents,
  files: files.map(f => ({agent: f.agent, date: f.date, path: f.path}))
}));
console.log('Built ' + agents.length + ' agents, ' + files.length + ' files.');
