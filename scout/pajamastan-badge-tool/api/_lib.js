export const SUPABASE_URL = (process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
export const SUPABASE_ANON_KEY = (process.env.SUPABASE_ANON_KEY || '').trim();
export const ANTHROPIC_API_KEY = (process.env.ANTHROPIC_API_KEY || '').trim();
export const MODEL = (process.env.MODEL || 'claude-sonnet-5-5').trim();

export async function userFromToken(req) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!token || !SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  const r = await fetch(SUPABASE_URL + '/auth/v1/user', {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + token }
  });
  if (!r.ok) return null;
  const u = await r.json();
  return u && u.id ? u : null;
}

const KINDS = ['band', 'stripe', 'photo', 'name', 'role', 'details', 'seal', 'pattern'];
const hex = (v, d) => (typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v) ? v.toLowerCase() : d);
const frac = (v) => { const n = Number(v); return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0; };

export function clean(raw) {
  const out = {
    orientation: raw.orientation === 'portrait' ? 'portrait' : 'landscape',
    card: { color: hex(raw.card && raw.card.color, '#ffffff') },
    parts: []
  };
  const parts = Array.isArray(raw.parts) ? raw.parts.slice(0, 20) : [];
  for (const p of parts) {
    if (!p || !KINDS.includes(p.kind)) continue;
    const part = {
      kind: p.kind,
      x: frac(p.x), y: frac(p.y), w: frac(p.w), h: frac(p.h),
      color: hex(p.color, '#1f4e9c'),
      textColor: hex(p.textColor, '#111111'),
      align: ['left', 'center', 'right'].includes(p.align) ? p.align : 'left',
      shape: p.shape === 'round' ? 'round' : 'rect',
      text: typeof p.text === 'string' ? p.text.slice(0, 80) : ''
    };
    if (part.w < 0.01 || part.h < 0.005) continue;
    out.parts.push(part);
  }
  return out;
}

export const PROMPT = `This photo shows a hand made mockup of an ID badge, drawn with pen or built from construction paper.
Find the edges of the badge in the photo and measure everything relative to the badge itself, not the whole photo.
Return only one JSON object, no other text, in this shape:
{"orientation":"landscape or portrait","card":{"color":"#rrggbb"},"parts":[{"kind":"band","x":0,"y":0,"w":1,"h":0.2,"color":"#rrggbb","textColor":"#rrggbb","align":"left","shape":"rect","text":""}]}
x, y, w, h are fractions of the badge width and height, from the top left corner.
kind is one of: band (a wide colored strip holding the title), stripe (a thin colored line), photo (the box or circle for the face picture), name, role (job title), details (ID number and dates block), seal (an emblem or logo spot), pattern (a faint repeated text or texture area).
Use written labels like "photo", "name", "title", "ID" to decide the kind when present. Copy any written label into text.
color is the fill color of a block. textColor is the ink color of writing. shape is round for a circle photo.
Leave out anything you are unsure about.`;
