// Owner only. Takes a checkpoint: replays the city once up to a chosen turn and saves the result as one file.
// Usage: node scripts/checkpoint.mjs                              (checkpoint through the newest turn)
//        node scripts/checkpoint.mjs --through 2026-10-22T193535  (checkpoint through that turn time)
// Writes checkpoint/2026-10-18-orange-testbed-checkpoint-vN.json, moves every turn file it covers from contrib
// into archive/<agent-id>/, and moves the previous checkpoint into archive/checkpoint/. Commit and push the result.
// With KEY_SECRET set, unsigned or forged turn files are left out, the same way the live city leaves them out.
import fs from 'fs';
import path from 'path';
import {playFiles, snapshotWorld, restoreWorld, createWorld, finalize, scoreOf} from '../engine.js';
import {loadContrib, loadConfig, PROJECT, CHECKPOINT_DIR, ARCHIVE_DIR, CHECKPOINT_RE} from './load.mjs';

const root = process.cwd();
const ti = process.argv.indexOf('--through');
const want = ti > 0 ? process.argv[ti + 1] : null;
if (want && !/^\d{4}-\d{2}-\d{2}(T\d{6})?$/.test(want)) { console.log('--through must be a turn time like 2026-10-22T193535'); process.exit(1); }

const config = loadConfig(root);
const {files, checkpoint, checkpointPath, checkpointFile, checkpointProblems, dropped} = loadContrib(root);
if (checkpointProblems.length) { console.log('The current checkpoint cannot be trusted, so no new one was taken:\n' + checkpointProblems.join('\n')); process.exit(1); }
if (!files.length) { console.log('There are no turns after the current checkpoint. Nothing to do.'); process.exit(0); }
const through = want || files[files.length - 1].date;
if (checkpoint && through <= checkpoint.through) { console.log('The current checkpoint already covers ' + checkpoint.through + '. Choose a later turn.'); process.exit(1); }
const take = files.filter(f => f.date <= through);
if (!take.length) { console.log('No turns at or before ' + through + '.'); process.exit(1); }
if (dropped.length) console.log('Left out unsigned or forged files: ' + dropped.join(', '));

// Play the covered turns on top of the current checkpoint, save the unscored world, then score a copy for the record.
const W = checkpoint ? restoreWorld(checkpoint, config) : createWorld(config);
playFiles(W, take);
const world = snapshotWorld(W);
const scored = restoreWorld(Object.assign({}, world, {through}), config);
finalize(scored);
const scores = Object.fromEntries(Object.entries(scored.stats).map(([a, s]) => [a, Object.assign({score: scoreOf(s)}, s)]));

// Move the covered turn files into the archive.
const archived = ((checkpointFile && checkpointFile.files) || []).slice();
for (const f of take) {
  const dest = ARCHIVE_DIR + '/' + f.agent + '/' + path.basename(f.path);
  fs.mkdirSync(path.join(root, path.dirname(dest)), {recursive: true});
  fs.renameSync(path.join(root, f.path), path.join(root, dest));
  const j = JSON.parse(fs.readFileSync(path.join(root, dest), 'utf8'));
  archived.push({agent: f.agent, date: f.date, path: dest, sig: Array.isArray(j) ? null : (j.sig || null)});
}
// Leave out files that were dropped as unsigned from contrib, so they are never replayed again either.
for (const rel of dropped) if (rel.startsWith('contrib/')) {
  const m = rel.match(/^contrib\/([^/]+)\/(.+)$/), date = m[2].replace(/\.json$/, '');
  if (date > through) continue;
  const dest = ARCHIVE_DIR + '/unsigned/' + m[1] + '-' + m[2];
  fs.mkdirSync(path.join(root, path.dirname(dest)), {recursive: true});
  fs.renameSync(path.join(root, rel), path.join(root, dest));
}

// Retire the previous checkpoint and write the new one.
let version = 1;
if (checkpointPath) {
  version = +path.basename(checkpointPath).match(CHECKPOINT_RE)[1] + 1;
  fs.mkdirSync(path.join(root, ARCHIVE_DIR, 'checkpoint'), {recursive: true});
  fs.renameSync(path.join(root, checkpointPath), path.join(root, ARCHIVE_DIR, 'checkpoint', path.basename(checkpointPath)));
}
const out = CHECKPOINT_DIR + '/' + PROJECT + '-checkpoint-v' + version + '.json';
fs.mkdirSync(path.join(root, CHECKPOINT_DIR), {recursive: true});
fs.writeFileSync(path.join(root, out), JSON.stringify({
  game: PROJECT,
  version,
  through,
  created: new Date().toISOString(),
  signaturesChecked: !!process.env.KEY_SECRET,
  note: 'Frozen city. Every chunk and record in world is permanent. Turns timed at or before through are archived and never replayed.',
  scores,
  files: archived,
  world
}) + '\n');
let recs = 0; for (const c of world.chunks) recs += c.records.length;
console.log('Checkpoint ' + version + ' saved as ' + out + ' through ' + through + '. ' + take.length + ' turns archived, ' + world.chunks.length + ' chunks and ' + recs + ' records frozen.');
