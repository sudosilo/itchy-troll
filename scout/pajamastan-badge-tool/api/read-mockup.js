import { ANTHROPIC_API_KEY, MODEL, PROMPT, clean, userFromToken } from './_lib.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.status(405).json({ error: 'post_only' }); return; }
  try {
    const user = await userFromToken(req);
    if (!user) { res.status(401).json({ error: 'login_required' }); return; }
    if (!ANTHROPIC_API_KEY) { res.status(503).json({ error: 'ai_not_set_up' }); return; }
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const m = /^data:(image\/(?:jpeg|png|webp|gif));base64,(.+)$/.exec(body.image || '');
    if (!m) { res.status(400).json({ error: 'bad_image' }); return; }
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1500,
        messages: [{ role: 'user', content: [
          { type: 'image', source: { type: 'base64', media_type: m[1], data: m[2] } },
          { type: 'text', text: PROMPT }
        ] }]
      })
    });
    if (!r.ok) { res.status(502).json({ error: 'model_' + r.status }); return; }
    const j = await r.json();
    const text = (j.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
    const s = text.indexOf('{'), e = text.lastIndexOf('}');
    if (s < 0 || e < s) { res.status(502).json({ error: 'no_json' }); return; }
    res.status(200).json(clean(JSON.parse(text.slice(s, e + 1))));
  } catch (err) {
    res.status(502).json({ error: String(err && err.message || err) });
  }
}
