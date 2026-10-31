// Mission Operator Meshtastic relay
// Pulls the public node map once, keeps only nodes near the player, caches for ten minutes.

async function fetchT(url, opts, ms) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms || 8000);
  try {
    return await fetch(url, Object.assign({}, opts, { signal: c.signal }));
  } finally {
    clearTimeout(t);
  }
}

function snap(v) {
  return Math.round(v * 2) / 2;
}

function coord(v) {
  if (typeof v !== "number") return null;
  return Math.abs(v) > 1000 ? v / 1e7 : v;
}

module.exports = async function handler(req, res) {
  const lat = parseFloat(req.query.lat);
  const lon = parseFloat(req.query.lon);
  if (!isFinite(lat) || !isFinite(lon)) {
    res.status(400).json({ error: "lat and lon required", hint: "send lat and lon in decimal degrees", items: [] });
    return;
  }
  const sLat = snap(lat);
  const sLon = snap(lon);
  try {
    const r = await fetchT("https://meshtastic.liamcottle.net/api/v1/nodes", { headers: { "User-Agent": "mission-operator" } }, 9000);
    if (!r.ok) throw new Error("upstream " + r.status);
    const data = await r.json();
    const items = (data.nodes || [])
      .map((n) => ({ id: String(n.node_id), name: n.long_name || n.short_name || "MESH NODE", lat: coord(n.latitude), lon: coord(n.longitude) }))
      .filter((n) => n.lat != null && n.lon != null && Math.abs(n.lat - sLat) < 1.2 && Math.abs(n.lon - sLon) < 1.2)
      .slice(0, 120);
    res.setHeader("Cache-Control", "public, s-maxage=600, stale-while-revalidate=1200");
    res.status(200).json({ cell: [sLat, sLon], items });
  } catch (e) {
    res.setHeader("Cache-Control", "public, s-maxage=60");
    res.status(502).json({ error: "feed unavailable", hint: "the public Meshtastic node map did not answer, try again shortly", items: [] });
  }
};
