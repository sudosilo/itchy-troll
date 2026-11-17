// Run in Termux from the mohavetech-website folder.
// Reads every Railway project and service through the Railway CLI login, saves railway-snapshot-v1.json, and pushes it to GitHub.
const fs = require("fs");
const path = require("path");
const os = require("os");
const { execSync } = require("child_process");

const HOME = os.homedir();
const PREFIX = process.env.PREFIX || "/data/data/com.termux/files/usr";

function run(cmd) {
  try { return execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 120000, maxBuffer: 64 * 1024 * 1024 }); } catch (e) { return (e && e.stdout) || ""; }
}

function jsonFrom(out) {
  const a = out.indexOf("["), o = out.indexOf("{");
  const i = a >= 0 && (o < 0 || a < o) ? a : o;
  if (i < 0) return null;
  try { return JSON.parse(out.slice(i)); } catch (e) { return null; }
}

function railway(args) {
  const tries = [
    "proot-distro login ubuntu -- bash -lc 'railway " + args + "'",
    "railway " + args
  ];
  for (const t of tries) { const j = jsonFrom(run(t)); if (j) return j; }
  return null;
}

function edges(x) {
  if (!x) return [];
  if (Array.isArray(x)) return x.map(e => (e && e.node) || e);
  if (Array.isArray(x.edges)) return x.edges.map(e => e.node || e);
  return [];
}

const listed = railway("list --json");
if (!listed) { console.log("\nRAILWAY CLI GAVE NO PROJECT LIST\n"); process.exit(1); }
const raw = Array.isArray(listed) ? listed : edges(listed.projects || listed);

const projects = raw.map(p => {
  const envs = edges(p.environments);
  const prod = envs.find(e => /prod/i.test(e.name || "")) || envs[0] || {};
  const services = edges(p.services).map(s => ({
    id: s.id,
    name: s.name,
    repo: null,
    url: "https://railway.com/project/" + p.id + "/service/" + s.id + (prod.id ? "?environmentId=" + prod.id : ""),
    status: "NONE",
    lastDeploy: null,
    domain: null,
    sleeping: false,
    updatedAt: s.updatedAt || null,
    cost: 0
  }));
  return {
    id: p.id,
    name: p.name,
    workspace: (p.workspace && p.workspace.name) || "Railway",
    url: "https://railway.com/project/" + p.id,
    createdAt: p.createdAt || null,
    updatedAt: p.updatedAt || null,
    lastDeploy: p.updatedAt || null,
    cost: 0,
    estimate: 0,
    services
  };
}).filter(p => p.id && p.name);

const names = Array.from(new Set(projects.map(p => p.workspace)));
const out = {
  generated: new Date().toISOString(),
  snapshot: true,
  workspaces: names.map(n => ({ name: n, currentUsage: 0, estimate: 0 })),
  projects
};

fs.writeFileSync("railway-snapshot-v1.json", JSON.stringify(out, null, 1));
console.log("RAILWAY PROJECTS FOUND: " + projects.length);
run("git add railway-snapshot-v1.json");
run('git commit -m "Railway snapshot"');
run("git pull --rebase origin master");
const pushed = run("git push origin master 2>&1 && echo PUSHED");
console.log(/PUSHED/.test(pushed) ? "RAILWAY SNAPSHOT PUSHED" : "RAILWAY SNAPSHOT PUSH FAILED");
