// Has an ElevenLabs voice read a transcript and returns the mp3
const access = require("./_auth");

module.exports = async (req, res) => {
  if (req.method !== "POST") { res.status(405).json({ error: "POST only" }); return; }
  const a = await access(req);
  if (!a.key) { res.status(a.status).json({ error: a.error }); return; }
  const key = a.key;
  let body = req.body || {};
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  const text = String(body.text || "").slice(0, 5000);
  const voice = String(body.voice_id || "");
  if (!text) { res.status(400).json({ error: "No text to read" }); return; }
  if (!/^[A-Za-z0-9]+$/.test(voice)) { res.status(400).json({ error: "Pick a voice first" }); return; }
  const r = await fetch("https://api.elevenlabs.io/v1/text-to-speech/" + voice + "?output_format=mp3_44100_128", {
    method: "POST",
    headers: { "xi-api-key": key, "Content-Type": "application/json", Accept: "audio/mpeg" },
    body: JSON.stringify({ text: text, model_id: "eleven_multilingual_v2" })
  });
  if (!r.ok) {
    const t = await r.text();
    res.status(r.status).json({ error: r.status === 401 ? "ElevenLabs refused the key. Check it in Settings." : (t.slice(0, 300) || "Voice failed") });
    return;
  }
  const buf = Buffer.from(await r.arrayBuffer());
  res.setHeader("Content-Type", "audio/mpeg");
  res.status(200).send(buf);
};
