// Mission Operator ship relay
// Opens the AISstream socket on the server for a few seconds, collects position reports,
// closes it, and caches the result so the key never reaches the browser.
// The AISstream key is read from the Redis key store (see api/_keys.js).

const { getKey } = require("./_keys.js");

function snap(v) {
  return Math.round(v * 2) / 2;
}

// Collect window. Kept well under the function limit so the socket always closes in time.
const COLLECT_MS = 4500;
const MAX_SHIPS = 80;

module.exports = async function handler(req, res) {
  try {
    const k = await getKey("AISSTREAM_KEY");
    if (!k.value) {
      res.setHeader("Cache-Control", "public, s-maxage=60");
      res.status(200).json({
        error: "key",
        missing: "AISSTREAM_KEY",
        hint: "Add AISSTREAM_KEY to the Redis key store. It is a free key from aisstream.io",
        store: k.detail ? "redis unreachable" : "redis reachable, key absent",
        ships: [],
      });
      return;
    }
    const key = k.value;
    const lat = parseFloat(req.query.lat);
    const lon = parseFloat(req.query.lon);
    if (!isFinite(lat) || !isFinite(lon)) {
      res.status(400).json({ error: "lat and lon required", hint: "send lat and lon in decimal degrees", ships: [] });
      return;
    }
    if (typeof WebSocket === "undefined") {
      res.status(502).json({ error: "feed unavailable", hint: "this runtime has no WebSocket, so the AIS feed cannot be opened", ships: [] });
      return;
    }
    const sLat = snap(lat);
    const sLon = snap(lon);
    const d = 1.5;
    const ships = {};

    await new Promise((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        try { ws.close(); } catch (e) {}
        resolve();
      };
      const ws = new WebSocket("wss://stream.aisstream.io/v0/stream");
      const timer = setTimeout(finish, COLLECT_MS);
      ws.onopen = () => {
        ws.send(JSON.stringify({
          APIKey: key,
          BoundingBoxes: [[[sLat - d, sLon - d], [sLat + d, sLon + d]]],
          FilterMessageTypes: ["PositionReport"],
        }));
      };
      ws.onmessage = async (ev) => {
        try {
          const text = typeof ev.data === "string" ? ev.data : await new Response(ev.data).text();
          const m = JSON.parse(text);
          const md = m.MetaData || {};
          const pr = (m.Message && m.Message.PositionReport) || {};
          const id = md.MMSI || pr.UserID;
          if (!id) return;
          ships[id] = {
            id: id,
            name: (md.ShipName || "").trim() || "MMSI " + id,
            lat: md.latitude != null ? md.latitude : pr.Latitude,
            lon: md.longitude != null ? md.longitude : pr.Longitude,
            heading: pr.TrueHeading != null && pr.TrueHeading < 360 ? pr.TrueHeading : pr.Cog || 0,
            speed: pr.Sog || 0,
          };
          if (Object.keys(ships).length >= MAX_SHIPS) { clearTimeout(timer); finish(); }
        } catch (e) {}
      };
      ws.onerror = () => { clearTimeout(timer); finish(); };
      ws.onclose = () => { clearTimeout(timer); finish(); };
    });

    const list = Object.values(ships).filter((s) => typeof s.lat === "number" && typeof s.lon === "number");
    res.setHeader("Cache-Control", "public, s-maxage=90, stale-while-revalidate=180");
    res.status(200).json({ cell: [sLat, sLon], ships: list });
  } catch (e) {
    res.setHeader("Cache-Control", "public, s-maxage=30");
    res.status(502).json({ error: "feed unavailable", hint: "the AIS stream did not answer, try again shortly", ships: [] });
  }
};
