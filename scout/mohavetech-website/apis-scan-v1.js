// Run in Termux from the mohavetech-website folder.
// Shallow clones every sudosilo repo one at a time, finds every outside web address its code calls, saves apis-v1.json, and pushes it.
const fs = require("fs");
const path = require("path");
const os = require("os");
const { execSync } = require("child_process");

function run(cmd, opts) {
  try { return execSync(cmd, Object.assign({ encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 300000, maxBuffer: 256 * 1024 * 1024 }, opts || {})); } catch (e) { return (e && e.stdout) || ""; }
}

const KNOWN = [
  [/(^|\.)openstreetmap\.(org|fr)$|overpass-api\.de$|overpass\.kumi\.systems$/, "OpenStreetMap", "https://www.openstreetmap.org/"],
  [/(^|\.)wigle\.net$/, "WiGLE", "https://wigle.net/"],
  [/(^|\.)nvroads\.com$/, "Nevada road cameras", "https://www.nvroads.com/"],
  [/(^|\.)az511\.(gov|com)$/, "Arizona road cameras", "https://az511.gov/"],
  [/(^|\.)anthropic\.com$/, "Anthropic", "https://console.anthropic.com/usage"],
  [/(^|\.)elevenlabs\.io$/, "ElevenLabs", "https://elevenlabs.io/app/usage"],
  [/youtube|ytimg\.com$/, "YouTube", "https://console.cloud.google.com/apis/dashboard"],
  [/(^|\.)musicbrainz\.org$|coverartarchive\.org$/, "MusicBrainz", "https://musicbrainz.org/"],
  [/(^|\.)audd\.io$/, "AudD", "https://dashboard.audd.io/"],
  [/(^|\.)supabase\.(co|in)$/, "Supabase", "https://supabase.com/dashboard/projects"],
  [/(^|\.)up\.railway\.app$|(^|\.)railway\.app$/, "Railway server", "https://railway.com/dashboard"],
  [/(^|\.)workers\.dev$|(^|\.)pages\.dev$|(^|\.)r2\.dev$|api\.cloudflare\.com$/, "Cloudflare", "https://dash.cloudflare.com/"],
  [/(^|\.)open-meteo\.com$/, "Open-Meteo weather", "https://open-meteo.com/"],
  [/(^|\.)weather\.gov$/, "National Weather Service", "https://www.weather.gov/documentation/services-web-api"],
  [/(^|\.)noaa\.gov$/, "NOAA", "https://www.noaa.gov/"],
  [/(^|\.)celestrak\.(org|com)$/, "CelesTrak satellites", "https://celestrak.org/"],
  [/(^|\.)opensky-network\.org$/, "OpenSky aircraft", "https://opensky-network.org/"],
  [/(^|\.)adsb\.(lol|fi|one)$|adsbexchange\.com$|airplanes\.live$/, "ADS-B aircraft", "https://adsb.lol/"],
  [/(^|\.)usgs\.gov$/, "USGS", "https://www.usgs.gov/"],
  [/(^|\.)nasa\.gov$/, "NASA", "https://api.nasa.gov/"],
  [/(^|\.)archive\.org$/, "Internet Archive", "https://archive.org/"],
  [/(^|\.)softwareheritage\.org$/, "Software Heritage", "https://archive.softwareheritage.org/"],
  [/(^|\.)rosettacode\.org$/, "Rosetta Code", "https://rosettacode.org/"],
  [/(^|\.)getyarn\.io$/, "getyarn", "https://getyarn.io/"],
  [/(^|\.)api\.github\.com$/, "GitHub API", "https://github.com/settings/tokens"],
  [/(^|\.)openai\.com$/, "OpenAI", "https://platform.openai.com/usage"],
  [/(^|\.)x\.ai$/, "xAI", "https://console.x.ai/"],
  [/(^|\.)finnhub\.io$/, "Finnhub", "https://finnhub.io/dashboard"],
  [/(^|\.)alphavantage\.co$/, "Alpha Vantage", "https://www.alphavantage.co/"],
  [/(^|\.)polygon\.io$/, "Polygon", "https://polygon.io/dashboard"],
  [/(^|\.)coingecko\.com$/, "CoinGecko", "https://www.coingecko.com/"],
  [/(^|\.)wikipedia\.org$|(^|\.)wikimedia\.org$|wikidata\.org$/, "Wikipedia", "https://www.wikipedia.org/"],
  [/(^|\.)upstash\.io$/, "Upstash", "https://console.upstash.com/"],
  [/(^|\.)stripe\.com$/, "Stripe", "https://dashboard.stripe.com/"],
  [/(^|\.)polygonscan\.com$|(^|\.)alchemy\.com$|(^|\.)infura\.io$/, "Polygon chain", "https://polygonscan.com/"],
  [/(^|\.)itunes\.apple\.com$/, "iTunes search", "https://performance-partners.apple.com/search-api"],
  [/(^|\.)deezer\.com$/, "Deezer", "https://developers.deezer.com/"],
  [/(^|\.)spotify\.com$/, "Spotify", "https://developer.spotify.com/dashboard"],
  [/(^|\.)reddit\.com$/, "Reddit", "https://www.reddit.com/prefs/apps"],
  [/(^|\.)hacker-news\.firebaseio\.com$|hn\.algolia\.com$/, "Hacker News", "https://news.ycombinator.com/"],
  [/(^|\.)ipapi\.co$|ipinfo\.io$|ip-api\.com$/, "IP lookup", "https://ipinfo.io/"],
  [/(^|\.)purelymail\.com$/, "Purelymail", "https://purelymail.com/"]
];

const SKIP = /(^|\.)(w3\.org|schema\.org|example\.(com|org)|localhost|github\.com|githubusercontent\.com|vercel\.com|jsdelivr\.net|unpkg\.com|cdnjs\.cloudflare\.com|fonts\.googleapis\.com|fonts\.gstatic\.com|gstatic\.com|google\.com|googletagmanager\.com|linkedin\.com|itch\.io|itch\.zone|railway\.com|mohave\.wtf|mohavetech\.wtf|npmjs\.(com|org)|nodejs\.org|mozilla\.org|developer\.mozilla\.org|reactjs\.org|react\.dev|vitejs\.dev|tailwindcss\.com|esm\.sh|skypack\.dev|twitter\.com|x\.com|facebook\.com|instagram\.com|creativecommons\.org|opensource\.org|apache\.org|gnu\.org|json-schema\.org|xmlns\.com|purl\.org|ogp\.me|wikipedia\.org\/wiki|claude\.ai|anthropic\.com\/news|0\.0\.0\.0|127\.0\.0\.1)$/;

const EXT = /\.(js|mjs|cjs|jsx|ts|tsx|html|htm|py|json|toml|yaml|yml|sh|vue|svelte)$/i;
const URL_RE = /https?:\/\/([a-z0-9][a-z0-9.-]*\.[a-z]{2,})(?::\d+)?/gi;

function walk(dir, out) {
  let list = [];
  try { list = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return; }
  list.forEach(d => {
    if (d.name === ".git" || d.name === "node_modules" || d.name === "dist" || d.name === "build") return;
    const f = path.join(dir, d.name);
    if (d.isDirectory()) walk(f, out);
    else if (EXT.test(d.name) && !/lock\.json$|\.min\.js$/i.test(d.name)) out.push(f);
  });
}

let repoList = [];
try { repoList = JSON.parse(run("gh repo list sudosilo --limit 1000 --json name")).map(r => r.name); } catch (e) {}
if (!repoList.length) { console.log("\nGITHUB REPO LIST CAME BACK EMPTY\n"); process.exit(1); }

const tmp = path.join(os.tmpdir(), "mohave-apis-scan");
const repos = {};
const links = {};
const OWN = /\.vercel\.app$|\.up\.railway\.app$/;
repoList.forEach((name, i) => {
  if (name === "mohavetech-website") return;
  const dir = path.join(tmp, name);
  run("rm -rf " + JSON.stringify(dir));
  run("git clone --depth 1 --filter=blob:limit=800k --quiet https://github.com/sudosilo/" + name + ".git " + JSON.stringify(dir));
  const files = [];
  walk(dir, files);
  const hosts = {};
  const own = {};
  files.forEach(f => {
    let txt = "";
    try { if (fs.statSync(f).size < 2000000) txt = fs.readFileSync(f, "utf8"); } catch (e) {}
    let m; URL_RE.lastIndex = 0;
    while ((m = URL_RE.exec(txt))) {
      const h = m[1].toLowerCase().replace(/\.$/, "");
      if (OWN.test(h)) { own[h] = true; continue; }
      if (SKIP.test(h)) continue;
      hosts[h] = true;
    }
  });
  run("rm -rf " + JSON.stringify(dir));
  const found = {};
  Object.keys(hosts).forEach(h => {
    const k = KNOWN.find(x => x[0].test(h));
    const label = k ? k[1] : h;
    if (!found[label]) found[label] = { label, url: k ? k[2] : "https://" + h + "/", hosts: [] };
    found[label].hosts.push(h);
  });
  const list = Object.values(found).sort((a, b) => (KNOWN.some(k => k[1] === b.label) - KNOWN.some(k => k[1] === a.label)) || a.label.localeCompare(b.label));
  if (list.length) repos[name.toLowerCase()] = list;
  const ownList = Object.keys(own).filter(h => h.split(".")[0] !== name.toLowerCase());
  if (ownList.length) links[name.toLowerCase()] = ownList.sort();
  process.stdout.write("\rSCANNED " + (i + 1) + " OF " + repoList.length + "   ");
});

const out = { generated: new Date().toISOString(), repos, links };
fs.writeFileSync("apis-v1.json", JSON.stringify(out, null, 1));
console.log("\nAPPS WITH OUTSIDE APIS: " + Object.keys(repos).length);
console.log("APPS LINKED TO YOUR OTHER APPS: " + Object.keys(links).length);
run("git add apis-v1.json");
run('git commit -m "Outside API list"');
run("git pull --rebase origin master");
const pushed = run("git push origin master 2>&1 && echo PUSHED");
console.log(/PUSHED/.test(pushed) ? "API LIST PUSHED" : "API LIST PUSH FAILED");
