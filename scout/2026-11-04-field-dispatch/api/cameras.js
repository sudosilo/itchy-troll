// Returns Nevada 511 cameras in a slim shape. The key stays on the server.
module.exports = async (req, res) => {
  try {
    const key = process.env.NVROADS_KEY;
    if (!key) return res.status(500).json({ error: "NVROADS_KEY is not set" });
    const r = await fetch("https://www.nvroads.com/api/v2/get/cameras?format=json&key=" + encodeURIComponent(key));
    if (!r.ok) return res.status(502).json({ error: "nvroads " + r.status });
    const list = await r.json();
    const cams = list
      .filter(c => c.VideoUrl && c.Status !== "Disabled" && c.Latitude && c.Longitude)
      .map(c => ({ id: String(c.Id), name: c.Name || c.RoadwayName || "Camera", lat: +c.Latitude, lng: +c.Longitude, video: c.VideoUrl }));
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
    res.status(200).json(cams);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
};
