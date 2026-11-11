const MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter"
];

const QUERY = `[out:json][timeout:50][bbox:35.95,-115.35,36.35,-114.95];
(
  nwr["shop"~"^(alcohol|wine|beer|beverages)$"];
  nwr["amenity"~"^(bar|pub|nightclub)$"]["name"];
  nwr["amenity"="casino"];
)->.a;
.a out center tags;
way["amenity"="casino"]->.c;
.c out geom tags;`;

async function tryMirror(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 50000);
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "lv-liquor-map/4"
      },
      body: "data=" + encodeURIComponent(QUERY),
      signal: ctrl.signal
    });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const d = await r.json();
    if (!Array.isArray(d.elements) || d.elements.length === 0) throw new Error(d.remark || "empty");
    return d.elements;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const attempts = MIRRORS.map(u => tryMirror(u));
  try {
    const elements = await Promise.any(attempts);
    res.setHeader("Cache-Control", "public, s-maxage=43200, stale-while-revalidate=604800");
    res.status(200).json({ t: Date.now(), elements });
  } catch (e) {
    res.setHeader("Cache-Control", "no-store");
    res.status(502).json({ error: "all mirrors failed" });
  }
};
