// Mission Operator WiGLE relay for Wi-Fi and Bluetooth
// The WiGLE auth value is read from the Redis key store (see api/_keys.js): the
// "Encoded for use" value from the WiGLE account API page.
// Cached for a day per small grid cell to protect the quota.

const { getKey } = require("./_keys.js");

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
  return Math.round(v * 200) / 200;
}

module.exports = async function handler(req, res) {
  const k = await getKey("WIGLE_AUTH");
  if (!k.value) {
    res.setHeader("Cache-Control", "public, s-maxage=60");
    res.status(200).json({
      error: "key",
      missing: "WIGLE_AUTH",
      hint: "Add WIGLE_AUTH to the Redis key store. It is the \"Encoded for use\" value from your WiGLE account API page",
      store: k.detail ? "redis unreachable" : "redis reachable, key absent",
      items: [],
    });
    return;
  }
  const auth = k.value;
  const type = req.query.type === "bt" ? "bt" : "wifi";
  const lat = parseFloat(req.query.lat);
  const lon = parseFloat(req.query.lon);
  if (!isFinite(lat) || !isFinite(lon)) {
    res.status(400).json({ error: "lat and lon required", hint: "send lat and lon in decimal degrees", items: [] });
    return;
  }
  const sLat = snap(lat);
  const sLon = snap(lon);
  const d = 0.006;
  const range = `latrange1=${(sLat - d).toFixed(4)}&latrange2=${(sLat + d).toFixed(4)}&longrange1=${(sLon - d).toFixed(4)}&longrange2=${(sLon + d).toFixed(4)}`;
  const path = type === "bt" ? "bluetooth/search" : "network/search";
  try {
    const r = await fetchT(`https://api.wigle.net/api/v2/${path}?${range}&resultsPerPage=100`, {
      headers: { Authorization: "Basic " + auth, Accept: "application/json" },
    }, 8000);
    const data = await r.json();
    if (!r.ok || data.success === false) {
      res.setHeader("Cache-Control", "public, s-maxage=300");
      res.status(200).json({ error: "upstream", hint: data.message || "WiGLE refused the request, check the WIGLE_AUTH value", items: [] });
      return;
    }
    const items = (data.results || [])
      .filter((n) => typeof n.trilat === "number" && typeof n.trilong === "number")
      .map((n) => ({ id: n.netid, name: n.ssid || n.name || (type === "bt" ? "BT DEVICE" : "HIDDEN"), lat: n.trilat, lon: n.trilong }));
    res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=86400");
    res.status(200).json({ type, cell: [sLat, sLon], items });
  } catch (e) {
    res.setHeader("Cache-Control", "public, s-maxage=60");
    res.status(502).json({ error: "feed unavailable", hint: "WiGLE did not answer, try again shortly", items: [] });
  }
};
