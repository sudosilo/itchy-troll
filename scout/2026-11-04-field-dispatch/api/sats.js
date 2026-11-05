// Returns orbit data for the satellite group the installers align to, cached for two hours.
module.exports = async (req, res) => {
  try {
    const r = await fetch("https://celestrak.org/NORAD/elements/gp.php?GROUP=iridium-NEXT&FORMAT=tle");
    if (!r.ok) return res.status(502).send("celestrak " + r.status);
    const text = await r.text();
    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Cache-Control", "s-maxage=7200, stale-while-revalidate=86400");
    res.status(200).send(text);
  } catch (e) {
    res.status(500).send(String(e));
  }
};
