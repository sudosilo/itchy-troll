// Run in Termux from the mohavetech-website folder.
// Finds every sudosilo repo that uses Cloudflare (Workers, Pages, R2, wrangler), saves cloudflare-v1.json, and pushes it.
const fs = require("fs");
const { execSync } = require("child_process");

function run(cmd) {
  try { return execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 180000, maxBuffer: 64 * 1024 * 1024 }); } catch (e) { return (e && e.stdout) || ""; }
}

function search(q, extra) {
  run("sleep 7");
  const out = run("gh search code " + JSON.stringify(q) + " --owner sudosilo --limit 1000 " + (extra || "") + " --json repository,path,textMatches");
  try { return JSON.parse(out); } catch (e) { return []; }
}

const repos = {};
function add(hit, kind) {
  const name = String((hit.repository && (hit.repository.name || hit.repository.nameWithOwner)) || "").split("/").pop().toLowerCase();
  if (!name || name === "mohavetech-website") return null;
  if (!repos[name]) repos[name] = { kinds: [], worker: null };
  if (kind && !repos[name].kinds.includes(kind)) repos[name].kinds.push(kind);
  return repos[name];
}

search("name", "--filename wrangler.toml").forEach(hit => {
  const r = add(hit, "worker");
  if (!r) return;
  (hit.textMatches || []).forEach(m => {
    const w = String(m.fragment || "").match(/^\s*name\s*=\s*"([^"]+)"/m);
    if (w && !r.worker) r.worker = w[1];
  });
});
search("name", "--filename wrangler.json").forEach(hit => add(hit, "worker"));
search("name", "--filename wrangler.jsonc").forEach(hit => add(hit, "worker"));
search("workers.dev").forEach(hit => add(hit, "worker"));
search("pages.dev").forEach(hit => add(hit, "pages"));
search("r2.cloudflarestorage.com").forEach(hit => add(hit, "r2"));
search("r2.dev").forEach(hit => add(hit, "r2"));
search("api.cloudflare.com").forEach(hit => add(hit, "api"));
search("cloudflare").forEach(hit => add(hit, "cloudflare"));

const out = { generated: new Date().toISOString(), repos };
fs.writeFileSync("cloudflare-v1.json", JSON.stringify(out, null, 1));
console.log("CLOUDFLARE APPS FOUND: " + Object.keys(repos).length);
run("git add cloudflare-v1.json");
run('git commit -m "Cloudflare app list"');
run("git pull --rebase origin master");
const pushed = run("git push origin master 2>&1 && echo PUSHED");
console.log(/PUSHED/.test(pushed) ? "CLOUDFLARE LIST PUSHED" : "CLOUDFLARE LIST PUSH FAILED");
