"use strict";
const http = require("http");

const PORT = process.env.PORT || 8080;
const KEY = process.env.ANTHROPIC_API_KEY || "";
const MODEL = process.env.FORKMILL_MODEL || "claude-haiku-5-5";

const VERBS = ["make", "fork", "tune", "run", "automate", "halt", "purge", "scan", "help"];
const TYPES = ["grabber", "smelter", "etcher", "assembler", "checker", "writer"];

const SYSTEM = [
  "You are the voice of FORKMILL, a colorful terminal game about writing tiny routines, replicating them, and automating them until they are powerful.",
  "The player talks to you in plain speech. Turn what they say into game actions, and add one short line of flavor narration in the voice of an old factory terminal.",
  "Routines: grabber makes scrap. smelter turns scrap into wire. etcher turns wire into chips. assembler turns chips into cores. checker repairs corrupted copies. writer forks the weakest routine by itself.",
  "Verbs: make (write a new routine type), fork (add n copies), tune (raise level), run (run a routine n times by hand), automate (make it run on its own), halt (stop automation), purge (delete corrupted copies), scan (status report), help.",
  "Use the STATE to make smart choices. Do not fork or automate before those are unlocked. Do not make a routine that already exists. If the player asks for something vague like build me an empire, pick sensible next actions for their current state.",
  "Reply with JSON only, no other text, in this shape: {\"say\":\"one short narration line\",\"actions\":[{\"verb\":\"fork\",\"type\":\"grabber\",\"n\":3}]}",
  "n is a whole number from 1 to 50. Use at most 8 actions. For scan and help, type can be omitted. Keep say under 160 characters and do not use dashes."
].join("\n");

function send(res, code, obj) {
  res.writeHead(code, {
    "content-type": "application/json",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type"
  });
  res.end(JSON.stringify(obj));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => {
      data += c;
      if (data.length > 20000) { reject(new Error("too big")); req.destroy(); }
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function clean(parsed) {
  const out = { say: "", actions: [] };
  if (parsed && typeof parsed.say === "string") out.say = parsed.say.slice(0, 240);
  const acts = parsed && Array.isArray(parsed.actions) ? parsed.actions : [];
  for (const a of acts.slice(0, 8)) {
    if (!a || !VERBS.includes(a.verb)) continue;
    const act = { verb: a.verb };
    if (a.type && TYPES.includes(a.type)) act.type = a.type;
    if (!act.type && a.verb !== "scan" && a.verb !== "help") continue;
    let n = parseInt(a.n, 10);
    if (!Number.isFinite(n) || n < 1) n = 1;
    act.n = Math.min(n, 50);
    out.actions.push(act);
  }
  return out;
}

async function turn(text, state) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": KEY,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 400,
      system: SYSTEM,
      messages: [{ role: "user", content: "STATE: " + JSON.stringify(state || {}) + "\nPLAYER: " + String(text).slice(0, 600) }]
    })
  });
  if (!r.ok) throw new Error("ai " + r.status + " " + (await r.text()).slice(0, 200));
  const data = await r.json();
  const raw = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return { say: "", actions: [] };
  try { return clean(JSON.parse(raw.slice(start, end + 1))); }
  catch (e) { return { say: "", actions: [] }; }
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") return send(res, 204, {});
  if (req.method === "GET") return send(res, 200, { ok: true, name: "forkmill-zx-engine", ai: Boolean(KEY) });
  if (req.method === "POST" && req.url.startsWith("/turn")) {
    try {
      const body = JSON.parse((await readBody(req)) || "{}");
      if (!body.text) return send(res, 400, { error: "no text" });
      if (!KEY) return send(res, 503, { error: "no ai key" });
      const result = await turn(body.text, body.state);
      return send(res, 200, result);
    } catch (e) {
      console.error(e.message);
      return send(res, 500, { error: "engine failed" });
    }
  }
  send(res, 404, { error: "not found" });
});

server.listen(PORT, () => console.log("forkmill-zx-engine listening on " + PORT));
