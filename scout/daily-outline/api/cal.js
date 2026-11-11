// Vercel serverless function: fetches the private calendar feed and returns
// recent events as JSON grouped by local date. Stores nothing.
// The feed address lives only in the Vercel env var CAL_ICS_URL.
// Only answers for a signed-in user whose email matches ALLOWED_EMAIL.

const SUPABASE_URL = "https://zasyjjoypkpvyqdueums.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inphc3lqam95cGtwdnlxZHVldW1zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyMjk1NjQsImV4cCI6MjEwNjgwNTU2NH0.PZrUvG4qsTpMQeihXbbzaFYUAAJ9YV7FtxLTkcQGFVI";

async function signedInEmail(req) {
  const h = req.headers.authorization || "";
  const tok = h.startsWith("Bearer ") ? h.slice(7) : "";
  if (!tok) return "";
  const r = await fetch(SUPABASE_URL + "/auth/v1/user", {
    headers: { apikey: SUPABASE_ANON, Authorization: "Bearer " + tok }
  });
  if (!r.ok) return "";
  const u = await r.json();
  return (u && u.email ? u.email : "").toLowerCase();
}

const TZ_OFFSET_HOURS = -7; // local time, no daylight saving

function unfold(text) {
  return text.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "");
}

function unescapeIcs(s) {
  return (s || "")
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

function parseStart(line) {
  // line looks like DTSTART;PARAMS:VALUE
  const colon = line.indexOf(":");
  const params = line.slice(0, colon);
  const value = line.slice(colon + 1).trim();
  if (/VALUE=DATE(?!-)/.test(params) || /^\d{8}$/.test(value)) {
    return { date: value.slice(0, 4) + "-" + value.slice(4, 6) + "-" + value.slice(6, 8), time: "" };
  }
  const m = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/);
  if (!m) return null;
  if (m[7] === "Z") {
    const utc = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
    const local = new Date(utc + TZ_OFFSET_HOURS * 3600 * 1000);
    const y = local.getUTCFullYear();
    const mo = String(local.getUTCMonth() + 1).padStart(2, "0");
    const d = String(local.getUTCDate()).padStart(2, "0");
    const hh = String(local.getUTCHours()).padStart(2, "0");
    const mm = String(local.getUTCMinutes()).padStart(2, "0");
    return { date: y + "-" + mo + "-" + d, time: hh + ":" + mm };
  }
  // floating or TZID time: use as written
  return { date: m[1] + "-" + m[2] + "-" + m[3], time: m[4] + ":" + m[5] };
}

function parseIcs(text) {
  const lines = unfold(text).split("\n");
  const events = [];
  let cur = null;
  for (const line of lines) {
    if (line === "BEGIN:VEVENT") { cur = {}; continue; }
    if (line === "END:VEVENT") {
      if (cur && cur.start) {
        events.push({
          date: cur.start.date,
          time: cur.start.time,
          title: unescapeIcs(cur.summary) || "(untitled)",
          note: unescapeIcs(cur.description)
        });
      }
      cur = null;
      continue;
    }
    if (!cur) continue;
    if (line.startsWith("DTSTART")) cur.start = parseStart(line);
    else if (line.startsWith("SUMMARY")) cur.summary = line.slice(line.indexOf(":") + 1);
    else if (line.startsWith("DESCRIPTION")) cur.description = line.slice(line.indexOf(":") + 1);
  }
  return events;
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store");
  const allowed = (process.env.ALLOWED_EMAIL || "").toLowerCase().trim();
  let email = "";
  try { email = await signedInEmail(req); } catch (e) { email = ""; }
  if (!allowed || !email || email !== allowed) {
    res.status(401).json({ denied: true, events: [] });
    return;
  }
  const url = process.env.CAL_ICS_URL;
  if (!url) {
    res.status(200).json({ connected: false, events: [] });
    return;
  }
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error("feed returned " + r.status);
    const text = await r.text();
    const now = Date.now() + TZ_OFFSET_HOURS * 3600 * 1000;
    const from = new Date(now - 30 * 86400000).toISOString().slice(0, 10);
    const to = new Date(now + 86400000).toISOString().slice(0, 10);
    const events = parseIcs(text)
      .filter(function (e) { return e.date >= from && e.date <= to; })
      .sort(function (a, b) { return (a.date + a.time).localeCompare(b.date + b.time); });
    res.status(200).json({ connected: true, events: events });
  } catch (err) {
    res.status(200).json({ connected: true, error: String(err.message || err), events: [] });
  }
};
