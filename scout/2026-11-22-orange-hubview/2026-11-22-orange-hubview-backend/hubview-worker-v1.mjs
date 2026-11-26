// Hub View worker. Runs in GitHub Actions on a schedule (workflow hubview-worker-v1.yml in sudosilo/field-twin).
// For each queued scan it downloads the manuals, keeps the useful pages and diagrams, extracts the parts,
// builds the parts model, fact checks it against the manual and publishes it to the shared library in Supabase.
import { execFileSync } from "node:child_process";
import { writeFileSync, readFileSync, mkdtempSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const SB_URL = process.env.SB_URL, SB_KEY = process.env.SB_KEY, SHARED = process.env.SHARED;
const BUCKET = "hv-files";
const START = Date.now(), BUDGET = 40 * 60 * 1000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

async function sb(path, opt = {}) {
  const r = await fetch(SB_URL + "/rest/v1/" + path, {
    method: opt.method || "GET",
    headers: Object.assign({ apikey: SB_KEY, Authorization: "Bearer " + SB_KEY, "Content-Type": "application/json" }, opt.headers || {}),
    body: opt.body ? JSON.stringify(opt.body) : undefined
  });
  const t = await r.text();
  if (!r.ok) throw new Error("db " + r.status + " " + t.slice(0, 200));
  return t ? JSON.parse(t) : null;
}
async function upload(path, buf, type) {
  const r = await fetch(SB_URL + "/storage/v1/object/" + BUCKET + "/" + path, {
    method: "POST", headers: { apikey: SB_KEY, Authorization: "Bearer " + SB_KEY, "Content-Type": type, "x-upsert": "true" }, body: buf
  });
  if (!r.ok) throw new Error("upload " + r.status + " " + (await r.text()).slice(0, 200));
  return pub(path);
}
const pub = (path) => SB_URL + "/storage/v1/object/public/" + BUCKET + "/" + path;

async function ai(app, body, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(SHARED, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(Object.assign({ app, text: app }, body)), signal: AbortSignal.timeout(320000) });
      const d = await r.json().catch(() => ({ error: "bad reply" }));
      if (r.ok && !d.error) return d;
      log(app, "failed", r.status, JSON.stringify(d).slice(0, 200));
      if (r.status === 400 || r.status === 404) break;
    } catch (e) { log(app, "error", e.message); }
    await sleep(15000 * (i + 1));
  }
  throw new Error(app + " did not answer");
}

async function stage(job, s, note) {
  log(job.id, s, note || "");
  await sb("hv_jobs?id=eq." + job.id, { method: "PATCH", body: { stage: s, note: note || null, updated_at: new Date().toISOString() } });
}

async function download(url, max = 60e6) {
  const r = await fetch(url, { redirect: "follow", headers: { "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) HubViewWorker/1.0", Accept: "application/pdf,*/*" }, signal: AbortSignal.timeout(90000) });
  if (!r.ok) throw new Error("http " + r.status);
  const len = Number(r.headers.get("content-length") || 0);
  if (len > max) throw new Error("too big");
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length > max) throw new Error("too big");
  return buf;
}

const WORDS = [
  [/exploded|illustrated parts|parts illustration|spare parts|parts list|parts catalog/i, 6],
  [/removal|remove the|replacement procedure|disassembl|install/i, 3],
  [/specification|dimensions|form factor|weight|height|width|depth/i, 3],
  [/screw|torque|thread|m3|6-32|phillips|torx/i, 3],
  [/system board|motherboard|power supply|hard drive|optical|fan|heat ?sink|memory|bracket|chassis|bezel|cover|panel/i, 2],
  [/component locations|figure|illustration|callout|item/i, 2]
];
function pickPages(text, limit) {
  const pages = text.split("\f");
  const scored = pages.map((t, i) => {
    let s = 0; WORDS.forEach(([re, w]) => { const m = t.match(new RegExp(re.source, "gi")); if (m) s += w * Math.min(m.length, 4); });
    if (t.trim().length < 400 && /\d/.test(t)) s += 2;
    if (i < 3) s += 3;
    return { p: i + 1, s };
  }).filter((x) => x.s > 0);
  return scored.sort((a, b) => b.s - a.s).slice(0, limit).map((x) => x.p).sort((a, b) => a - b);
}

function geometry(build, overall) {
  const items = [];
  (build.groups || []).forEach((g) => (g.items || []).forEach((it) => items.push(it)));
  const env = (overall && overall.some((v) => v > 0) ? overall : build.size_mm || [0, 0, 0]).map((v) => v * 1.2);
  const out = [];
  items.forEach((it) => {
    const s = it.size_mm || [0, 0, 0];
    if (!it.lib && s.every((v) => !v)) out.push({ part: it.name, ok: false, note: "No size given." });
    if (env.some((v) => v > 0)) {
      const half = [env[0] / 2, env[1], env[2] / 2];
      const at = it.at_mm || [0, 0, 0];
      const far = [Math.abs(at[0]) > half[0], at[1] > half[1] || at[1] < -env[1] * 0.1, Math.abs(at[2]) > half[2]];
      if (far.some(Boolean)) out.push({ part: it.name, ok: false, note: "Sits outside the product's overall size." });
      if (Math.max(...s) > Math.max(...env)) out.push({ part: it.name, ok: false, note: "Bigger than the whole product." });
    }
  });
  return { items: items.length, fails: out };
}

async function work(job) {
  const ident = job.ident || {};
  const product = [ident.maker, ident.exact_model || ident.name].filter(Boolean).join(" ");
  const dir = mkdtempSync(join(tmpdir(), "hv-"));
  const photoUrl = job.photo_path ? pub(job.photo_path) : "";
  let photo64 = "";
  if (photoUrl) photo64 = (await download(photoUrl, 8e6)).toString("base64");

  await stage(job, "gather", "Downloading manuals");
  const seen = new Set(), cands = [];
  const add = (u, t) => { if (u && !seen.has(u)) { seen.add(u); cands.push({ url: u, title: t || u }); } };
  (ident.sources || []).forEach((s) => add(s.url, s.title));
  try { (await ai("hubview-manuals", { product })).pdfs.forEach((s) => add(s.url, s.title)); } catch (e) { log("manual search", e.message); }
  const pdfs = [];
  for (const c of cands.slice(0, 10)) {
    if (pdfs.length >= 2) break;
    try {
      const buf = await download(c.url);
      if (buf.slice(0, 5).toString() !== "%PDF-") continue;
      const f = join(dir, "doc" + pdfs.length + ".pdf");
      writeFileSync(f, buf);
      const info = execFileSync("pdfinfo", [f]).toString();
      const pages = parseInt((info.match(/Pages:\s+(\d+)/) || [])[1] || "0", 10);
      if (!pages) continue;
      pdfs.push({ f, url: c.url, title: c.title, pages });
      log("got", c.url, pages, "pages");
    } catch (e) { log("skip", c.url, e.message); }
  }

  let extracted = { overall_size_mm: [0, 0, 0], facts: [], parts: [], diagram_pages: [] }, pagesUrl = null, diagrams = [], pageMap = [];
  if (pdfs.length) {
    await stage(job, "pages", "Keeping the useful pages");
    const args = ["--empty", "--pages"];
    const per = pdfs.length > 1 ? 20 : 36;
    pdfs.forEach((d) => {
      let text = "";
      try { text = execFileSync("pdftotext", ["-layout", d.f, "-"], { maxBuffer: 200e6 }).toString(); } catch (e) { text = ""; }
      const pick = text ? pickPages(text, per) : Array.from({ length: Math.min(per, d.pages) }, (_, i) => i + 1);
      d.pick = pick.length ? pick : [1];
      args.push(d.f, d.pick.join(","));
      d.pick.forEach((p) => pageMap.push({ doc: d.title, url: d.url, page: p }));
    });
    const out = join(dir, "pages.pdf");
    args.push("--", out);
    execFileSync("qpdf", args);
    if (statSync(out).size > 30e6) throw new Error("kept pages are too big");
    pagesUrl = await upload("docs/" + job.key + "/" + job.key + "-pages.pdf", readFileSync(out), "application/pdf");

    await stage(job, "extract", "Reading the manual");
    extracted = await ai("hubview-extract", { docs: [pagesUrl], product });

    await stage(job, "diagrams", "Saving the diagrams");
    for (const p of (extracted.diagram_pages || []).filter((n) => n <= pageMap.length).slice(0, 12)) {
      try {
        const base = join(dir, "d" + p);
        execFileSync("pdftoppm", ["-png", "-r", "80", "-f", String(p), "-l", String(p), "-singlefile", out, base]);
        if (!existsSync(base + ".png")) continue;
        const u = await upload("docs/" + job.key + "/" + job.key + "-diagram-p" + p + ".png", readFileSync(base + ".png"), "image/png");
        diagrams.push({ url: u, page: pageMap[p - 1].page, doc: pageMap[p - 1].doc });
      } catch (e) { log("diagram", p, e.message); }
    }
  }

  await stage(job, "build", "Building the parts model");
  const facts = [].concat(ident.facts || [], extracted.facts || [],
    (extracted.parts || []).map((p) => "Manual part " + p.name + (p.part_number ? " part number " + p.part_number : "") + (p.qty ? " qty " + p.qty : "") + (p.size_mm && p.size_mm.some((v) => v) ? " size " + p.size_mm.join(" x ") + " mm" : "")));
  if (extracted.overall_size_mm && extracted.overall_size_mm.some((v) => v)) facts.unshift("Overall size " + extracted.overall_size_mm.join(" x ") + " mm");
  const build = await ai("hubview-scan", { image: photo64, cars: [], context: Object.assign({}, ident, { facts }) });
  if (!build.groups || !build.groups.length) throw new Error("build came back empty");

  await stage(job, "verify", "Fact checking against the manual");
  const geo = geometry(build, extracted.overall_size_mm);
  let verify;
  if (pdfs.length) {
    try { verify = await ai("hubview-verify", { build, manual: { overall_size_mm: extracted.overall_size_mm, facts: extracted.facts, parts: extracted.parts }, geometry: geo.fails }); }
    catch (e) { verify = { verdict: "flag", summary: "The fact check did not run.", checks: [], missing: [] }; }
  } else verify = { verdict: "flag", summary: "No manual could be downloaded, so this build is checked against the web facts only.", checks: [], missing: [] };
  verify.geometry = geo.fails;
  const status = verify.verdict === "pass" && geo.fails.length <= Math.max(1, Math.floor(geo.items / 10)) ? "verified" : "draft";

  await stage(job, "publish", "Saving to the shared library");
  await sb("hv_builds?on_conflict=key", {
    method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: {
      key: job.key, name: build.name, maker: ident.maker || "", exact_model: ident.exact_model || "", kind: build.kind, status,
      data: build, ident, extracted: Object.assign({}, extracted, { pages: pageMap, manuals: pdfs.map((d) => ({ title: d.title, url: d.url, pages: d.pages })) }),
      verify, pages_url: pagesUrl, diagrams, photo_url: photoUrl, updated_at: new Date().toISOString()
    }
  });
  await sb("hv_jobs?id=eq." + job.id, { method: "PATCH", body: { status: "done", stage: "done", note: status === "verified" ? "Verified and saved" : "Saved as a draft", error: null, updated_at: new Date().toISOString() } });
  log(job.id, "done", status);
}

async function main() {
  if (!SB_URL || !SB_KEY || !SHARED) throw new Error("missing settings");
  while (Date.now() - START < BUDGET) {
    const next = await sb("hv_jobs?status=eq.queued&order=created_at.asc&limit=1&select=*");
    if (!next.length) break;
    const job = next[0];
    const claimed = await sb("hv_jobs?id=eq." + job.id + "&status=eq.queued", {
      method: "PATCH", headers: { Prefer: "return=representation" },
      body: { status: "working", stage: "start", attempts: job.attempts + 1, updated_at: new Date().toISOString() }
    });
    if (!claimed.length) continue;
    try {
      const done = await sb("hv_builds?key=eq." + encodeURIComponent(job.key) + "&status=eq.verified&select=key");
      if (done.length) {
        await sb("hv_jobs?id=eq." + job.id, { method: "PATCH", body: { status: "done", stage: "done", note: "Already in the library" } });
        continue;
      }
      await work(claimed[0]);
    } catch (e) {
      log(job.id, "failed", e.message);
      const again = claimed[0].attempts < 3;
      await sb("hv_jobs?id=eq." + job.id, { method: "PATCH", body: { status: again ? "queued" : "failed", error: String(e.message).slice(0, 300), note: again ? "Trying again shortly" : "Could not build this one", updated_at: new Date().toISOString() } });
    }
  }
  // jobs stuck in working from a run that died go back in the queue
  const stale = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  await sb("hv_jobs?status=eq.working&updated_at=lt." + stale, { method: "PATCH", body: { status: "queued", note: "Trying again shortly" } });
}
main().catch((e) => { console.error(e.message); process.exit(1); });
