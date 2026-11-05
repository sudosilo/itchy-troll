// Storage. Swap these two functions for the database later; nothing else changes.
const KEY = "field-dispatch-v1";
const Store = {
  load() { try { const s = localStorage.getItem(KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; } },
  save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }
};

let S = Store.load() || {
  cash: CONFIG.startGrant, units: [], tickets: [], player: null, lastTick: Date.now(),
  jobsDone: 0, lastDividend: 0, nextId: 1, prev: null, moving: false, passenger: false, cams: {}
};
S.cams = S.cams || {};
S.scans = S.scans || {};
S.declined = S.declined || { count: 0, sites: {} };
S.orders = S.orders || [];
S.units.forEach(u => { if (!u.stock) u.stock = Object.assign({}, THEME.units[u.type].kit); if (!u.need) u.need = []; });

// Live data. Real cameras from the Nevada roads feed and orbits for the satellite installers.
let CAMS = [], SATS = [];
fetch("/api/cameras").then(r => r.ok ? r.json() : []).then(d => { CAMS = Array.isArray(d) ? d : []; }).catch(() => {});
fetch("/api/sats").then(r => r.ok ? r.text() : "").then(t => {
  const L = t.split("\n").map(x => x.trim()).filter(Boolean);
  for (let i = 0; i + 2 < L.length + 1 && L[i + 2]; i += 3) {
    try { SATS.push({ name: L[i], rec: satellite.twoline2satrec(L[i + 1], L[i + 2]) }); } catch (e) {}
  }
}).catch(() => {});
const camById = id => CAMS.find(c => c.id === id);
// Plate readers. Known locations from public map data, any age. Contracts can be declined for good.
let ALPRS = [], alprTile = "";
function loadAlpr(p) {
  const t = Math.floor(p[0] / 0.5) + ":" + Math.floor(p[1] / 0.5);
  if (t === alprTile) return; alprTile = t;
  fetch("/api/alpr?lat=" + p[0] + "&lng=" + p[1]).then(r => r.ok ? r.json() : []).then(d => { ALPRS = Array.isArray(d) ? d : []; }).catch(() => { alprTile = ""; });
}
// Site scans. One scan per 500 meter cell, kept in the save so the server is never asked twice.
const cellOf = (lat, lng) => Math.floor(lat / 0.005) + ":" + Math.floor(lng / 0.005);
function scanSite(k) {
  const c = cellOf(k.lat, k.lng), have = S.scans[c];
  if (have && have.networks !== undefined) return;
  fetch("/api/scan?lat=" + k.lat + "&lng=" + k.lng).then(r => r.json()).then(d => { if (d && d.networks !== undefined) S.scans[c] = d; }).catch(() => {});
}
function scanText(k) {
  const d = k && S.scans[cellOf(k.lat, k.lng)];
  if (!d) return "";
  const open = (d.encryption.none || 0) + (d.encryption.wep || 0), top = d.busiestChannels[0];
  return "Site scan: " + d.networks + " networks nearby, " + open + " open or weak" + (top ? ", busiest channel " + top.channel : "") + ". ";
}
function satAt(sat, date, site) {
  const pv = satellite.propagate(sat.rec, date);
  if (!pv || !pv.position) return null;
  const g = satellite.gstime(date), ecf = satellite.eciToEcf(pv.position, g), geo = satellite.eciToGeodetic(pv.position, g);
  const look = site ? satellite.ecfToLookAngles({ latitude: site[0] * Math.PI / 180, longitude: site[1] * Math.PI / 180, height: 0.7 }, ecf) : null;
  return { lat: satellite.degreesLat(geo.latitude), lng: satellite.degreesLong(geo.longitude), elev: look ? look.elevation * 180 / Math.PI : 0 };
}
function nextPass(site, from) {
  if (!SATS.length) return null;
  for (let t = from; t < from + CONFIG.passSearchH * 3600000; t += 30000) {
    const d = new Date(t);
    for (const sat of SATS) { const a = satAt(sat, d, site); if (a && a.elev >= CONFIG.passMinElevDeg) return { t, name: sat.name }; }
  }
  return null;
}

const jobByKey = Object.fromEntries(THEME.jobs.map(j => [j.key, j]));
const money = n => "$" + Math.round(n).toLocaleString("en-US");
function dur(ms) {
  const s = Math.max(0, Math.round(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60;
  return h ? h + "h " + m + "m" : m ? m + "m " + x + "s" : x + "s";
}
function meters(a, b) {
  const R = 6371000, r = Math.PI / 180, dLat = (b[0] - a[0]) * r, dLng = (b[1] - a[1]) * r;
  const q = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(q));
}
function travelMs(u, a, b) {
  const mps = THEME.units[u.type].kmh / 3.6;
  return meters(a, b) * CONFIG.roadFactor / mps * 1000 / CONFIG.timeScale;
}
function playerPt() { return S.player ? [S.player.lat, S.player.lng] : CONFIG.fallbackCenter; }
function unitPt(u, now) {
  if (u.state === "idle") return playerPt();
  if (u.state === "onsite") { const t = S.tickets.find(k => k.id === u.ticketId); return t ? [t.lat, t.lng] : playerPt(); }
  const L = u.leg, f = Math.min(1, Math.max(0, (now - L.start) / (L.end - L.start || 1)));
  if (L.path && L.cum) {
    const d = f * L.cum[L.cum.length - 1]; let i = 1;
    while (i < L.cum.length - 1 && L.cum[i] < d) i++;
    const a = L.path[i - 1], b = L.path[i], g = (d - L.cum[i - 1]) / ((L.cum[i] - L.cum[i - 1]) || 1);
    return [a[0] + (b[0] - a[0]) * g, a[1] + (b[1] - a[1]) * g];
  }
  return [L.from[0] + (L.to[0] - L.from[0]) * f, L.from[1] + (L.to[1] - L.from[1]) * f];
}
// Roads. Each leg starts as a straight line estimate, then snaps to the real road route once it arrives.
const ROUTES = {};
const routeKey = (a, b) => a[0].toFixed(4) + "," + a[1].toFixed(4) + ";" + b[0].toFixed(4) + "," + b[1].toFixed(4);
function getRoute(a, b) {
  const k = routeKey(a, b);
  if (!ROUTES[k]) ROUTES[k] = fetch("/api/route?from=" + a[0] + "," + a[1] + "&to=" + b[0] + "," + b[1])
    .then(r => r.ok ? r.json() : null).then(d => {
      if (!d || !d.path || d.path.length < 2) { delete ROUTES[k]; return null; }
      const cum = [0]; for (let i = 1; i < d.path.length; i++) cum.push(cum[i - 1] + meters(d.path[i - 1], d.path[i]));
      d.cum = cum; ROUTES[k].done = d; return d;
    }).catch(() => { delete ROUTES[k]; return null; });
  return ROUTES[k];
}
const routeNow = (a, b) => { const p = ROUTES[routeKey(a, b)]; return p && p.done; };
function startLeg(u, from, to, t) {
  const leg = { from, to, start: t, end: t + travelMs(u, from, to), path: null, cum: null };
  u.leg = leg;
  getRoute(from, to).then(r => { if (r && u.leg === leg) { leg.path = r.path; leg.cum = r.cum; leg.end = leg.start + r.dur * 1000 / CONFIG.timeScale; } });
}
function randomNear(c) {
  const km = CONFIG.spawnKm[0] + Math.random() * (CONFIG.spawnKm[1] - CONFIG.spawnKm[0]);
  const b = Math.random() * 2 * Math.PI, dLat = km / 111.32 * Math.cos(b);
  const dLng = km / (111.32 * Math.cos(c[0] * Math.PI / 180)) * Math.sin(b);
  return [c[0] + dLat, c[1] + dLng];
}

