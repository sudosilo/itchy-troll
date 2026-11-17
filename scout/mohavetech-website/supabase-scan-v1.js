// Run in Termux from the mohavetech-website folder.
// Finds every sudosilo repo whose code uses Supabase, records which Supabase project each one points at, saves supabase-v1.json, and pushes it.
const fs = require("fs");
const { execSync } = require("child_process");

function run(cmd) {
  try { return execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 180000, maxBuffer: 64 * 1024 * 1024 }); } catch (e) { return (e && e.stdout) || ""; }
}

function search(q) {
  run("sleep 7");
  const out = run("gh search code " + JSON.stringify(q) + " --owner sudosilo --limit 1000 --json repository,path,textMatches");
  try { return JSON.parse(out); } catch (e) { return []; }
}

const repos = {};
const REF = /([a-z0-9]{20})\.supabase\.(co|in)/g;

["supabase", "supabase.co", "createClient supabase", "SUPABASE_URL"].forEach(q => {
  search(q).forEach(hit => {
    const name = String((hit.repository && (hit.repository.name || hit.repository.nameWithOwner)) || "").split("/").pop().toLowerCase();
    if (!name || name === "mohavetech-website") return;
    if (!repos[name]) repos[name] = { ref: null };
    (hit.textMatches || []).forEach(m => {
      let r; REF.lastIndex = 0;
      while ((r = REF.exec(String(m.fragment || "")))) { if (!repos[name].ref) repos[name].ref = r[1]; }
    });
  });
});

let projects = [];
try {
  const raw = run("proot-distro login ubuntu -- bash -lc 'supabase projects list -o json'");
  const i = raw.indexOf("[");
  if (i >= 0) projects = JSON.parse(raw.slice(i)).map(p => ({ ref: p.id || p.ref, name: p.name }));
} catch (e) {}

const counts = {};
Object.values(repos).forEach(r => { if (r.ref) counts[r.ref] = (counts[r.ref] || 0) + 1; });
const top = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0] || (projects[0] && projects[0].ref) || null;

const out = { generated: new Date().toISOString(), defaultRef: top, projects, repos };
fs.writeFileSync("supabase-v1.json", JSON.stringify(out, null, 1));
console.log("SUPABASE APPS FOUND: " + Object.keys(repos).length);
run("git add supabase-v1.json");
run('git commit -m "Supabase app list"');
run("git pull --rebase origin master");
const pushed = run("git push origin master 2>&1 && echo PUSHED");
console.log(/PUSHED/.test(pushed) ? "SUPABASE LIST PUSHED" : "SUPABASE LIST PUSH FAILED");
