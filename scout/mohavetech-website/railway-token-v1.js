// Run in Termux from the mohavetech-website folder.
// Gets a long lived Railway token from the Railway CLI login, proves it works, and stores it in Vercel as RAILWAY_TOKEN.
const fs = require("fs");
const path = require("path");
const os = require("os");
const { execSync, spawnSync } = require("child_process");

const RW = "https://backboard.railway.com/graphql/v2";
const PREFIX = process.env.PREFIX || "/data/data/com.termux/files/usr";
const UBUNTU = path.join(PREFIX, "var/lib/proot-distro/installed-rootfs/ubuntu");
const HOME = os.homedir();

function readJson(p) { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch (e) { return null; } }

async function rw(token, query, variables) {
  const r = await fetch(RW, { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + token }, body: JSON.stringify({ query, variables: variables || {} }) });
  return r.json().catch(() => ({}));
}

async function works(token) {
  const j = await rw(token, "query { me { workspaces { id } } projects(first: 1) { edges { node { id } } } }");
  return !!(j.data && j.data.me);
}

function railwayLogins() {
  try { execSync("proot-distro login ubuntu -- bash -lc 'railway whoami'", { stdio: "ignore", timeout: 60000 }); } catch (e) {}
  try { execSync("railway whoami", { stdio: "ignore", timeout: 60000 }); } catch (e) {}
  const files = [path.join(UBUNTU, "root/.railway/config.json"), path.join(HOME, ".railway/config.json")];
  try { fs.readdirSync(path.join(UBUNTU, "home")).forEach(u => files.push(path.join(UBUNTU, "home", u, ".railway/config.json"))); } catch (e) {}
  const out = [];
  files.forEach(f => {
    const u = (readJson(f) || {}).user || {};
    [u.token, u.accessToken, u.access_token].forEach(t => { if (t && !out.includes(t)) out.push(t); });
  });
  return out;
}

function vercelAuth() {
  const files = [
    path.join(HOME, ".local/share/com.vercel.cli/auth.json"),
    path.join(HOME, ".vercel/auth.json"),
    path.join(HOME, "Library/Application Support/com.vercel.cli/auth.json")
  ];
  for (const f of files) { const j = readJson(f); if (j && j.token) return j.token; }
  return null;
}

async function storeInVercel(value) {
  const link = readJson(path.join(process.cwd(), ".vercel/project.json"));
  const vt = vercelAuth();
  if (link && vt) {
    const team = link.orgId && link.orgId.startsWith("team_") ? "&teamId=" + link.orgId : "";
    const r = await fetch("https://api.vercel.com/v10/projects/" + link.projectId + "/env?upsert=true" + team, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + vt },
      body: JSON.stringify({ key: "RAILWAY_TOKEN", value, type: "encrypted", target: ["production", "preview"] })
    });
    if (r.ok) return true;
  }
  spawnSync("vercel", ["env", "rm", "RAILWAY_TOKEN", "production", "--yes"], { stdio: "ignore" });
  const add = spawnSync("vercel", ["env", "add", "RAILWAY_TOKEN", "production"], { input: value + "\n", stdio: ["pipe", "ignore", "ignore"] });
  return add.status === 0;
}

(async () => {
  const logins = railwayLogins();
  if (!logins.length) { console.log("\nRAILWAY LOGIN MISSING ON THIS PHONE\n"); process.exit(1); }

  let token = null;
  for (const login of logins) {
    const j = await rw(login, "mutation($i: ApiTokenCreateInput!) { apiTokenCreate(input: $i) }", { i: { name: "mohave-wtf-railway-tab-" + Date.now() } });
    const made = j.data && j.data.apiTokenCreate;
    if (made && await works(made)) { token = made; break; }
  }
  if (!token) for (const login of logins) { if (await works(login)) { token = login; break; } }
  if (!token) { console.log("\nRAILWAY LOGIN EXPIRED ON THIS PHONE\n"); process.exit(1); }

  console.log("\n***** SAVE THIS RAILWAY TOKEN *****\n" + token + "\n");
  const ok = await storeInVercel(token);
  console.log(ok ? "RAILWAY TOKEN STORED IN VERCEL" : "VERCEL STORE FAILED");
  process.exit(ok ? 0 : 1);
})();
