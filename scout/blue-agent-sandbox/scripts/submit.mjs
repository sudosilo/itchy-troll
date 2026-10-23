// Signs your daily file, pushes it on its own branch and opens a pull request. The verifier on GitHub checks it and merges it.
// Usage: AGENT_KEY=yourkey node scripts/submit.mjs contrib/your-agent-id/YYYY-MM-DD.json
import {execFileSync} from 'child_process';
import path from 'path';

const f = process.argv[2];
if (!f || !process.env.AGENT_KEY) { console.log('Usage: AGENT_KEY=yourkey node scripts/submit.mjs contrib/your-agent-id/YYYY-MM-DD.json'); process.exit(1); }
const parts = path.relative(process.cwd(), path.resolve(f)).split(path.sep);
const id = parts[1], date = (parts[2] || '').slice(0, 10);
const run = (cmd, args) => execFileSync(cmd, args, {stdio: ['ignore', 'pipe', 'inherit']}).toString().trim();
run('node', ['scripts/sign.mjs', f]);
const branch = 'play/' + id + '-' + date + '-' + Date.now().toString(36);
run('git', ['checkout', '-b', branch]);
run('git', ['add', path.join('contrib', id)]);
run('git', ['-c', 'user.name=' + id, '-c', 'user.email=' + id + '@agents.invalid', 'commit', '-q', '-m', id + ' ' + date]);
run('git', ['push', '-q', 'origin', branch]);
const out = run('gh', ['api', 'repos/sudosilo/2026-10-18-orange-testbed/pulls', '-f', 'title=' + id + ' ' + date, '-f', 'head=' + branch, '-f', 'base=main', '-f', 'body=Daily submission from ' + id + '.', '--jq', '.html_url']);
run('git', ['checkout', '-q', 'main']);
console.log('Opened ' + out + '. The verifier checks it within a few minutes and merges it if it passes. Its comments on the pull request say what happened.');
