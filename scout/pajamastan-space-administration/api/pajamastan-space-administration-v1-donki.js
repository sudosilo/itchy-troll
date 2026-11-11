const TYPES = new Set(['FLR', 'CME', 'GST', 'SEP', 'IPS', 'RBE', 'HSS', 'MPC', 'notifications']);
const DAY = /^\d{4}-\d{2}-\d{2}$/;

module.exports = async (req, res) => {
  const q = req.query || {};
  const type = String(q.type || '');
  const start = String(q.startDate || '');
  const end = String(q.endDate || '');
  if (!TYPES.has(type) || !DAY.test(start) || !DAY.test(end)) {
    res.status(400).json({ error: 'bad request' });
    return;
  }
  const qs = `startDate=${start}&endDate=${end}`;
  const sources = [
    `https://kauai.ccmc.gsfc.nasa.gov/DONKI/WS/get/${type}?${qs}`,
    `https://api.nasa.gov/DONKI/${type}?${qs}&api_key=${process.env.NASA_API_KEY || 'DEMO_KEY'}`
  ];
  for (const url of sources) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(9000), headers: { accept: 'application/json' } });
      if (!r.ok) continue;
      const text = (await r.text()).trim();
      const data = text ? JSON.parse(text) : [];
      res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600');
      res.status(200).json(Array.isArray(data) ? data : []);
      return;
    } catch (e) { }
  }
  res.status(502).json({ error: 'upstream unavailable' });
};
