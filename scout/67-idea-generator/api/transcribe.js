// Sends one take to ElevenLabs speech to text and returns the words
const access = require("./_auth");

function errText(d) {
  if (!d) return "Transcription failed";
  if (typeof d.detail === "string") return d.detail;
  if (d.detail && d.detail.message) return d.detail.message;
  return "Transcription failed";
}

module.exports = async (req, res) => {
  if (req.method !== "POST") { res.status(405).json({ error: "POST only" }); return; }
  const a = await access(req);
  if (!a.key) { res.status(a.status).json({ error: a.error }); return; }
  const key = a.key;
  const parts = [];
  for await (const c of req) parts.push(c);
  const buf = Buffer.concat(parts);
  if (!buf.length) { res.status(400).json({ error: "No audio received" }); return; }
  const type = req.headers["content-type"] || "audio/webm";
  const ext = type.includes("mp4") ? "m4a" : type.includes("ogg") ? "ogg" : "webm";
  const fd = new FormData();
  fd.append("model_id", "scribe_v2");
  fd.append("timestamps_granularity", "word");
  fd.append("file", new Blob([buf], { type: type }), "take." + ext);
  const r = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
    method: "POST", headers: { "xi-api-key": key }, body: fd
  });
  const data = await r.json().catch(() => null);
  if (!r.ok) { res.status(r.status).json({ error: r.status === 401 ? "ElevenLabs refused the key. Check it in Settings." : errText(data) }); return; }
  const words = ((data && data.words) || []).filter(w => w.type === "word").map(w => ({ t: w.text, s: w.start, e: w.end }));
  res.status(200).json({ text: (data && data.text) || "", words: words });
};
