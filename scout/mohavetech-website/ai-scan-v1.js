// Run in Termux from the mohavetech-website folder.
// Finds every sudosilo repo whose code calls Anthropic, ElevenLabs, YouTube, MusicBrainz or AudD, saves ai-v1.json, and pushes it.
const fs = require("fs");
const { execSync } = require("child_process");

function run(cmd) {
  try { return execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 180000, maxBuffer: 64 * 1024 * 1024 }); } catch (e) { return (e && e.stdout) || ""; }
}

function names(q) {
  run("sleep 7");
  const out = run("gh search code " + JSON.stringify(q) + " --owner sudosilo --limit 1000 --json repository");
  let list = [];
  try { list = JSON.parse(out); } catch (e) {}
  return list.map(h => String((h.repository && (h.repository.name || h.repository.nameWithOwner)) || "").split("/").pop().toLowerCase()).filter(n => n && n !== "mohavetech-website");
}

function collect(queries) {
  const repos = {};
  queries.forEach(q => names(q).forEach(n => { repos[n] = { hits: ((repos[n] && repos[n].hits) || 0) + 1 }; }));
  return repos;
}

const out = {
  generated: new Date().toISOString(),
  anthropic: collect(["api.anthropic.com", "@anthropic-ai/sdk", "ANTHROPIC_API_KEY", "anthropic-version", "from anthropic import"]),
  elevenlabs: collect(["api.elevenlabs.io", "ELEVENLABS_API_KEY", "elevenlabs", "xi-api-key"]),
  youtube: collect(["googleapis.com/youtube", "YOUTUBE_API_KEY", "youtube/v3"]),
  musicbrainz: collect(["musicbrainz.org/ws", "musicbrainz"]),
  audd: collect(["api.audd.io", "AUDD_API_TOKEN", "audd.io"])
};

fs.writeFileSync("ai-v1.json", JSON.stringify(out, null, 1));
console.log("ANTHROPIC APPS FOUND: " + Object.keys(out.anthropic).length);
console.log("ELEVENLABS APPS FOUND: " + Object.keys(out.elevenlabs).length);
console.log("YOUTUBE APPS FOUND: " + Object.keys(out.youtube).length);
console.log("MUSICBRAINZ APPS FOUND: " + Object.keys(out.musicbrainz).length);
console.log("AUDD APPS FOUND: " + Object.keys(out.audd).length);
run("git add ai-v1.json");
run('git commit -m "API app list"');
run("git pull --rebase origin master");
const pushed = run("git push origin master 2>&1 && echo PUSHED");
console.log(/PUSHED/.test(pushed) ? "AI LIST PUSHED" : "AI LIST PUSH FAILED");
