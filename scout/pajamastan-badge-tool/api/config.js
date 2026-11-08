import { SUPABASE_URL, SUPABASE_ANON_KEY, ANTHROPIC_API_KEY } from './_lib.js';

export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ supabaseUrl: SUPABASE_URL, supabaseAnonKey: SUPABASE_ANON_KEY, ai: !!ANTHROPIC_API_KEY });
}
