// Lists the ElevenLabs voices on the account
const access = require("./_auth");

module.exports = async (req, res) => {
  const a = await access(req);
  if (!a.key) { res.status(a.status).json({ error: a.error }); return; }
  const key = a.key;
  const r = await fetch("https://api.elevenlabs.io/v1/voices", { headers: { "xi-api-key": key } });
  const data = await r.json().catch(() => null);
  if (!r.ok || !data) { res.status(r.status || 500).json({ error: r.status === 401 ? "ElevenLabs refused the key. Check it in Settings." : "Could not load voices" }); return; }
  const voices = (data.voices || []).map(v => ({ id: v.voice_id, name: v.name }));
  voices.sort((a, b) => a.name.localeCompare(b.name));
  res.status(200).json({ voices: voices });
};
