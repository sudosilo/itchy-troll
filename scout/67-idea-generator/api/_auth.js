// Checks the Supabase sign-in and picks which ElevenLabs key to use.
// A key sent from the person's own Settings always wins.
// Without one, only accounts listed in IDEA67_ALLOWED_USERS get the server key.
const SB_URL = "https://vogxdikogfaxhwcgajfg.supabase.co";
const SB_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvZ3hkaWtvZ2ZheGh3Y2dhamZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzOTk4MDAsImV4cCI6MjEwNjk3NTgwMH0.fUosu3JdsUI5GFnQjDbOxfYCWO1hfijQO3O8lJVsU98";

module.exports = async function access(req) {
  const h = req.headers.authorization || "";
  if (!h.startsWith("Bearer ")) return { status: 401, error: "Sign in first" };
  const r = await fetch(SB_URL + "/auth/v1/user", { headers: { Authorization: h, apikey: SB_ANON } });
  if (!r.ok) return { status: 401, error: "Sign in again" };
  const u = await r.json();
  if (!u || !u.id || u.is_anonymous) return { status: 401, error: "Sign in first" };
  const own = String(req.headers["x-elevenlabs-key"] || "").trim();
  if (own) {
    if (!/^[A-Za-z0-9_\-]{10,200}$/.test(own)) return { status: 400, error: "That ElevenLabs key does not look right. Check it in Settings." };
    return { user: u, key: own };
  }
  const allow = (process.env.IDEA67_ALLOWED_USERS || "").split(",").map(s => s.trim()).filter(Boolean);
  if (allow.indexOf(u.id) !== -1 && process.env.ELEVENLABS_API_KEY) return { user: u, key: process.env.ELEVENLABS_API_KEY };
  return { status: 403, error: "Add your own ElevenLabs key in Settings to use transcripts and voices." };
};
