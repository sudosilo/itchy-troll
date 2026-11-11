const GROUPS = new Set(['stations', 'gps-ops', 'galileo', 'glo-ops', 'beidou', 'geo', 'weather', 'starlink', 'science', 'resource']);

module.exports = async (req, res) => {
  const group = String((req.query || {}).group || '');
  if (!GROUPS.has(group)) {
    res.status(400).send('bad group');
    return;
  }
  try {
    const r = await fetch(`https://celestrak.org/NORAD/elements/gp.php?GROUP=${group}&FORMAT=tle`, {
      signal: AbortSignal.timeout(15000),
      headers: { 'user-agent': 'pajamastan-space-administration' }
    });
    const text = await r.text();
    if (!r.ok || !/^1 /m.test(text)) throw new Error('bad upstream');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=7200, stale-while-revalidate=86400');
    res.status(200).send(text);
  } catch (e) {
    res.status(502).send('upstream unavailable');
  }
};
