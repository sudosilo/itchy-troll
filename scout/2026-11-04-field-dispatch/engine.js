// Inventory. Every tech carries a stock of parts, orders take real time to arrive, and add on items can be sold.
const PART = k => THEME.parts[k];
const kitValue = type => Object.entries(THEME.units[type].kit).reduce((a, [k, q]) => a + PART(k).cost * q, 0);
const stockValue = u => Object.entries(u.stock).reduce((a, [k, q]) => a + PART(k).cost * q, 0);
function partsFor(u) {
  const keys = new Set(Object.keys(THEME.units[u.type].kit)), tags = THEME.units[u.type].tags;
  THEME.jobs.filter(j => tags.includes(j.needs)).forEach(j => {
    Object.keys(j.use || {}).forEach(k => keys.add(k)); Object.keys(j.extra || {}).forEach(k => keys.add(k)); (j.upsell || []).forEach(k => keys.add(k));
  });
  return [...keys];
}
function missingFor(u, job) { return Object.entries(job.use || {}).filter(([k, q]) => (u.stock[k] || 0) < q); }
function onOrder(u, k) { return S.orders.filter(o => o.unitId === u.id && o.part === k).reduce((a, o) => a + o.qty, 0); }
function order(u, k, qty) {
  const P = PART(k), cost = P.cost * qty;
  if (S.cash < cost) return toast("Not enough cash to order " + P.label + ".");
  S.cash -= cost;
  S.orders.push({ unitId: u.id, part: k, qty, arrive: Date.now() + P.leadMin * 60000 / CONFIG.timeScale });
  toast("Ordered " + qty + " " + P.label + " for " + money(cost) + ".");
}
function restock(u) {
  Object.entries(THEME.units[u.type].kit).forEach(([k, q]) => { const gap = q - (u.stock[k] || 0) - onOrder(u, k); if (gap > 0) order(u, k, gap); });
}
function satisfy(u, t) {
  if (!u.need.length) return;
  u.need = u.need.filter(k => { if ((u.stock[k] || 0) > 0) { u.stock[k]--; return false; } return true; });
  if (!u.need.length) { u.workEnd = t + u.remain; toast(THEME.units[u.type].label + " has the parts and is back to work."); }
}
function deliver(now) {
  const due = S.orders.filter(o => o.arrive <= now).sort((a, b) => a.arrive - b.arrive);
  if (!due.length) return;
  S.orders = S.orders.filter(o => o.arrive > now);
  due.forEach(o => {
    const u = S.units.find(x => x.id === o.unitId); if (!u) return;
    u.stock[o.part] = (u.stock[o.part] || 0) + o.qty;
    toast(o.qty + " " + PART(o.part).label + " delivered to " + THEME.units[u.type].label + ".");
    if (u.state === "onsite") satisfy(u, o.arrive);
  });
}

// Engine
function ownedTags() { const t = new Set(); S.units.forEach(u => THEME.units[u.type].tags.forEach(x => t.add(x))); return t; }
function spawn(now, dtH) {
  if (!S.units.length) return;
  const cap = CONFIG.baseTickets + CONFIG.ticketsPerUnit * S.units.length;
  if (S.tickets.filter(t => t.status === "open").length >= cap) return;
  const anyOpen = S.tickets.some(t => t.status === "open");
  if (anyOpen && Math.random() > Math.min(1, S.units.length * CONFIG.jobsPerUnitHour * dtH)) return;
  const tags = ownedTags();
  const freeCams = CAMS.filter(c => !S.cams[c.id] && !S.tickets.some(t => t.camId === c.id) && meters(playerPt(), [c.lat, c.lng]) <= CONFIG.camMaxKm * 1000);
  const freeAlpr = ALPRS.filter(a => !S.declined.sites[a.id] && !S.tickets.some(t => t.alprId === a.id) && meters(playerPt(), [a.lat, a.lng]) <= CONFIG.camMaxKm * 1000);
  const pool = THEME.jobs.filter(j => j.w > 0 && tags.has(j.needs) && (j.key !== "camera" || freeCams.length) && (j.key !== "alpr" || freeAlpr.length));
  if (!pool.length) return;
  let r = Math.random() * pool.reduce((a, j) => a + j.w, 0), job = pool[0];
  for (const j of pool) { r -= j.w; if (r <= 0) { job = j; break; } }
  const cam = job.key === "camera" ? freeCams[Math.floor(Math.random() * freeCams.length)] : null;
  const alpr = job.key === "alpr" ? freeAlpr[Math.floor(Math.random() * freeAlpr.length)] : null;
  const p = cam ? [cam.lat, cam.lng] : alpr ? [alpr.lat, alpr.lng] : randomNear(playerPt());
  S.tickets.push({ id: S.nextId++, key: job.key, lat: p[0], lng: p[1], created: now, camId: cam ? cam.id : null, alprId: alpr ? alpr.id : null,
    deadline: now + job.slaH * 3600000 / CONFIG.timeScale, status: "open" });
}
function breakdowns(now, dtH) {
  Object.entries(S.cams).forEach(([id, c]) => {
    if (c.broken || Math.random() > CONFIG.camBreakPerHour * dtH) return;
    const cam = camById(id); if (!cam) return;
    c.broken = true;
    S.tickets.push({ id: S.nextId++, key: "camfix", lat: cam.lat, lng: cam.lng, created: now, camId: id,
      deadline: now + jobByKey.camfix.slaH * 3600000 / CONFIG.timeScale, status: "open" });
    toast(cam.name + " camera went down.");
  });
}
function complete(u, t) {
  const k = S.tickets.find(x => x.id === u.ticketId), job = jobByKey[k.key];
  const late = t > k.deadline, pay = job.pay * (late ? CONFIG.latePay : 1);
  S.cash += pay; S.jobsDone++;
  toast(job.label + " done. " + money(pay) + (late ? " (late)" : ""));
  if (k.key === "camera" && k.camId) { S.cams[k.camId] = { installed: t, broken: false }; toast("Camera feed is live. " + money(pay)); }
  if (k.key === "camfix" && S.cams[k.camId]) S.cams[k.camId].broken = false;
  (job.upsell || []).forEach(p => {
    if ((u.stock[p] || 0) > 0 && Math.random() < 0.25) { u.stock[p]--; S.cash += PART(p).sell; toast("Sold a " + PART(p).label.toLowerCase() + " for " + money(PART(p).sell) + "."); }
  });
  S.tickets = S.tickets.filter(x => x.id !== k.id);
  u.state = "returning"; u.ticketId = null;
  startLeg(u, [k.lat, k.lng], playerPt(), t);
}
function stepUnit(u, now) {
  for (let i = 0; i < 6; i++) {
    if (u.state === "enroute" && now >= u.leg.end) {
      const job = jobByKey[S.tickets.find(k => k.id === u.ticketId).key];
      const k = S.tickets.find(x => x.id === u.ticketId);
      const arrived = u.leg.end;
      u.state = "onsite"; u.workEnd = arrived + job.mins * 60000 / CONFIG.timeScale; u.leg = null; u.pass = null; u.need = [];
      scanSite(k);
      Object.entries(job.extra || {}).forEach(([p, chance]) => {
        if (Math.random() >= chance) return;
        if ((u.stock[p] || 0) > 0) u.stock[p]--; else u.need.push(p);
      });
      if (u.need.length) { u.remain = u.workEnd - arrived; toast(THEME.units[u.type].label + " needs a " + PART(u.need[0]).label.toLowerCase() + " to finish."); }
      if (job.key === "dish") { const ps = nextPass([k.lat, k.lng], u.workEnd); if (ps) { u.workEnd = ps.t; u.pass = ps.name; } }
      continue;
    }
    if (u.state === "onsite" && !u.need.length && now >= u.workEnd) { complete(u, u.workEnd); continue; }
    if (u.state === "returning" && now >= u.leg.end) {
      if (meters(u.leg.to, playerPt()) <= CONFIG.returnRadiusM) {
        u.state = "idle"; u.leg = null; toast(THEME.units[u.type].label + " is back with you."); break;
      }
      startLeg(u, u.leg.to, playerPt(), u.leg.end); continue;
    }
    break;
  }
}
function tick() {
  const now = Date.now(), dtMs = Math.max(0, now - S.lastTick), dtH = dtMs * CONFIG.timeScale / 3600000;
  S.cash -= S.units.reduce((a, u) => a + THEME.units[u.type].wage, 0) * dtH;
  deliver(now);
  S.units.forEach(u => stepUnit(u, now));
  S.tickets = S.tickets.filter(t => t.status !== "open" || t.key === "camfix" || now < t.deadline);
  breakdowns(now, dtH);
  spawn(now, dtH);
  const D = CONFIG.dividend;
  if (S.units.length < D.belowUnits && S.cash < D.belowCash && S.jobsDone >= D.minJobs &&
      now - S.lastDividend > D.cooldownH * 3600000) {
    S.cash += D.amount; S.lastDividend = now; toast("County dividend paid: " + money(D.amount));
  }
  S.lastTick = now; Store.save(S); draw(now);
}

// Motion. Feels still, walking or driving from the phone's own sensors, with no location involved.
const MO = { buf: [], gx: 0, gy: 0, gz: 0, gInit: false, mode: "idle", pending: "idle", n: 0, live: false, floor: 0.006 };
function onMotion(e) {
  const t = performance.now(), a = e.acceleration; let lx, ly, lz;
  if (a && a.x !== null && a.y !== null && a.z !== null) { lx = a.x; ly = a.y; lz = a.z; }
  else {
    const g = e.accelerationIncludingGravity; if (!g || g.x === null) return;
    if (!MO.gInit) { MO.gx = g.x; MO.gy = g.y; MO.gz = g.z; MO.gInit = true; }
    MO.gx = 0.94 * MO.gx + 0.06 * g.x; MO.gy = 0.94 * MO.gy + 0.06 * g.y; MO.gz = 0.94 * MO.gz + 0.06 * g.z;
    lx = g.x - MO.gx; ly = g.y - MO.gy; lz = g.z - MO.gz;
  }
  MO.live = true;
  MO.buf.push({ t, m: Math.sqrt(lx * lx + ly * ly + lz * lz) / 9.81 });
  while (MO.buf.length && t - MO.buf[0].t > 4000) MO.buf.shift();
}
function classifyMotion() {
  const b = MO.buf, n = b.length; if (n < 40) return;
  const rate = n / ((b[n - 1].t - b[0].t) / 1000);
  let mean = 0; for (const x of b) mean += x.m; mean /= n;
  let v = 0; for (const x of b) v += (x.m - mean) ** 2; const std = Math.sqrt(v / n);
  let jerk = 0; for (let i = 1; i < n; i++) jerk += Math.abs(b[i].m - b[i - 1].m); const buzz = jerk / (n - 1);
  let best = 0, bestLag = 0; const minLag = Math.round(rate * 0.28), maxLag = Math.round(rate * 0.85);
  if (v > 0) for (let lag = minLag; lag <= maxLag && lag < n - 10; lag++) {
    let c = 0; for (let i = 0; i + lag < n; i++) c += (b[i].m - mean) * (b[i + lag].m - mean);
    c = c / ((n - lag) * (v / n)); if (c > best) { best = c; bestLag = lag; }
  }
  const cad = bestLag ? rate / bestLag : 0, f = MO.floor * 1.6;
  const guess = std < f && buzz < f ? "idle" : best > 0.35 && std > 0.05 && cad >= 1.2 && cad <= 3.6 ? "walking" : best <= 0.35 ? "driving" : "walking";
  if (guess === MO.pending) MO.n++; else { MO.pending = guess; MO.n = 1; }
  if (MO.n >= 3) MO.mode = MO.pending;
}
window.addEventListener("devicemotion", onMotion, true);
document.addEventListener("click", function askMotion() {
  document.removeEventListener("click", askMotion);
  if (typeof DeviceMotionEvent !== "undefined" && typeof DeviceMotionEvent.requestPermission === "function") DeviceMotionEvent.requestPermission().catch(() => {});
});

// Movement badge. Motion sensors react in seconds; location confirms driving after holding the speed long enough.
let FIXES = [], moveState = "still";
function speedOver(sec) {
  if (FIXES.length < 2) return null;
  const last = FIXES[FIXES.length - 1];
  if (Date.now() - last.t > 60000) return null;
  for (let i = FIXES.length - 2; i >= 0; i--) {
    const dt = (last.t - FIXES[i].t) / 1000;
    if (dt >= sec) return meters([FIXES[i].lat, FIXES[i].lng], [last.lat, last.lng]) / dt;
  }
  return null;
}
function updateMove() {
  const sp = speedOver(CONFIG.driveConfirmS), fast = sp !== null && sp >= CONFIG.driveMph * 0.44704;
  const m = MO.live ? MO.mode : null;
  if (fast && m !== "idle" && m !== "walking") moveState = "driving";
  else if (m === "driving") moveState = "maybe";
  else if (m === "walking" || (!MO.live && sp !== null && sp > 0.6)) moveState = "walking";
  else moveState = "still";
  S.moving = moveState === "driving";
  if (!S.moving) S.passenger = false;
}
setInterval(() => { classifyMotion(); updateMove(); }, 500);

// Location. Uses the fix the phone already has when it is fresh enough.
function onFix(p) {
  const now = Date.now(), pt = { lat: p.coords.latitude, lng: p.coords.longitude, t: p.timestamp };
  if (!FIXES.length || pt.t > FIXES[FIXES.length - 1].t) FIXES.push(pt);
  FIXES = FIXES.filter(f => now - f.t < 360000);
  const first = !S.player; S.prev = pt; S.player = pt;
  S.units.filter(u => u.state === "returning" && meters(u.leg.to, playerPt()) > 300).forEach(u => startLeg(u, unitPt(u, now), playerPt(), now));
  if (first) map.setView(playerPt(), 13);
  loadAlpr(playerPt());
  locStatus = "Location " + dur(now - pt.t) + " old";
}
let locStatus = "Finding location";
function locate() {
  if (!navigator.geolocation) { locStatus = "No location, using default"; return; }
  navigator.geolocation.getCurrentPosition(onFix, () => { locStatus = "Location off, using default"; },
    { enableHighAccuracy: false, maximumAge: CONFIG.fixMaxAgeMs, timeout: 10000 });
}

// Actions
function buy(type) {
  const T = THEME.units[type], total = T.price + kitValue(type);
  if (S.cash < total) return toast("Not enough cash for " + T.label + ".");
  S.cash -= total; S.units.push({ id: S.nextId++, type, state: "idle", stock: Object.assign({}, T.kit), need: [] });
  toast(T.label + " hired with starting stock."); tick();
}
function dispatch(unitId, ticketId) {
  if (S.moving && !S.passenger) return;
  const u = S.units.find(x => x.id === unitId), k = S.tickets.find(x => x.id === ticketId);
  if (!u || !k || u.state !== "idle" || k.status !== "open") return;
  const job = jobByKey[k.key];
  if (missingFor(u, job).length) return toast("Not enough stock. Order parts in the Stock tab.");
  Object.entries(job.use || {}).forEach(([p, q]) => { u.stock[p] -= q; });
  u.state = "enroute"; u.ticketId = k.id; k.status = "assigned";
  startLeg(u, playerPt(), [k.lat, k.lng], Date.now()); sel = null; tick();
}

