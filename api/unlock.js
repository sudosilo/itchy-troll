// Checks an itch.io purchase for a page and tells the game whether to unlock.
// GET /api/unlock?page=user/slug&key=xxxx   (download key from the buyer's download link)
// GET /api/unlock?page=user/slug&email=xxxx (email the buyer paid with)
// GET /api/unlock?page=user/slug            (price and buy link only)

const API_KEY = process.env.ITCH_API_KEY || '';
let gamesCache = { at: 0, games: [] };

async function myGames() {
  if (Date.now() - gamesCache.at < 10 * 60 * 1000 && gamesCache.games.length) return gamesCache.games;
  const r = await fetch(`https://itch.io/api/1/${API_KEY}/my-games`);
  const j = await r.json();
  gamesCache = { at: Date.now(), games: j.games || [] };
  return gamesCache.games;
}

function priceText(cents) {
  if (!cents) return '';
  return '$' + (cents / 100).toFixed(2);
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!API_KEY) return res.status(500).json({ ok: false, error: 'ITCH_API_KEY is not set' });

  const page = String(req.query.page || '').trim().toLowerCase();
  const key = String(req.query.key || '').trim();
  const email = String(req.query.email || '').trim();
  if (!page.includes('/')) return res.status(400).json({ ok: false, error: 'page must look like user/slug' });

  try {
    const [user, slug] = page.split('/');
    const games = await myGames();
    const game = games.find((g) => {
      const u = String(g.url || '').toLowerCase().replace(/\/$/, '');
      return u.endsWith(`${user}.itch.io/${slug}`);
    });
    if (!game) return res.status(404).json({ ok: false, error: 'game not found' });

    const info = { url: game.url, price: priceText(game.min_price) };
    let ok = false;

    if (key) {
      const r = await fetch(`https://itch.io/api/1/${API_KEY}/game/${game.id}/download_keys?download_key=${encodeURIComponent(key)}`);
      const j = await r.json();
      ok = !!(j.download_key && String(j.download_key.game_id) === String(game.id));
    } else if (email) {
      const r = await fetch(`https://itch.io/api/1/${API_KEY}/game/${game.id}/purchases?email=${encodeURIComponent(email)}`);
      const j = await r.json();
      ok = Array.isArray(j.purchases) && j.purchases.length > 0;
    }

    return res.status(200).json({ ok, ...info });
  } catch (err) {
    return res.status(502).json({ ok: false, error: String(err.message || err) });
  }
};
