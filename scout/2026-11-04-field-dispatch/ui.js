// Drawing
const map = L.map("map", { zoomControl: false }).setView(CONFIG.fallbackCenter, 12);
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(map);
const me = L.marker(CONFIG.fallbackCenter, { icon: L.divIcon({ className: "", html: '<div class="me"></div>', iconSize: [22, 22] }) }).addTo(map);
const marks = {}, lines = {};
function pin(id, pt, icon, dim) {
  if (!marks[id]) {
    marks[id] = L.marker(pt, { icon: L.divIcon({ className: "", html: '<div class="pin' + (dim ? " dim" : "") + '">' + icon + "</div>", iconSize: [24, 24] }) }).addTo(map);
    if (id[0] === "t") marks[id].on("click", () => { sel = +id.slice(1); tab = "tickets"; draw(Date.now()); });
  } else marks[id].setLatLng(pt);
}
let tab = "tickets", sel = null;
function draw(now) {
  document.getElementById("cash").textContent = money(S.cash);
  document.getElementById("status").textContent = S.units.length + " crew, " + S.tickets.length + " tickets. " + locStatus;
  const MV = { still: ["🧍", "Still", "b-still"], walking: ["🚶", "Walking", "b-walk"], maybe: ["🚗", "Driving?", "b-maybe"], driving: ["🚗", "Driving", "b-drive"] }[moveState];
  const mb = document.getElementById("move"); mb.textContent = MV[0] + " " + MV[1]; mb.className = "badge " + MV[2];
  document.getElementById("lock").style.display = S.moving && !S.passenger ? "block" : "none";
  me.setLatLng(playerPt());
  const live = new Set();
  S.tickets.forEach(t => { const id = "t" + t.id; live.add(id); pin(id, [t.lat, t.lng], jobByKey[t.key].icon); });
  S.units.filter(u => u.state !== "idle").forEach(u => { const id = "u" + u.id; live.add(id); pin(id, unitPt(u, now), THEME.units[u.type].icon); });
  CAMS.forEach(c => {
    const st = S.cams[c.id]; if (!st && meters(playerPt(), [c.lat, c.lng]) > CONFIG.camMaxKm * 1000) return;
    if (S.tickets.some(t => t.camId === c.id)) return;
    const id = "c" + c.id; live.add(id); pin(id, [c.lat, c.lng], st ? "🎥" : "📷", !st);
  });
  S.units.filter(u => u.state === "onsite" && u.pass).forEach(u => {
    const sat = SATS.find(x => x.name === u.pass); const a = sat && satAt(sat, new Date(now));
    if (a) { const id = "s" + u.id; live.add(id); pin(id, [a.lat, a.lng], "🛰️"); }
  });
  Object.keys(marks).forEach(id => { if (!live.has(id)) { map.removeLayer(marks[id]); delete marks[id]; } });
  const liveLines = new Set();
  S.units.filter(u => u.leg && u.leg.path).forEach(u => {
    const id = "l" + u.id; liveLines.add(id);
    if (!lines[id] || lines[id].src !== u.leg.path) {
      if (lines[id]) map.removeLayer(lines[id]);
      lines[id] = L.polyline(u.leg.path, { color: u.state === "returning" ? "#5B6B7A" : "#1F6FEB", weight: 4, opacity: 0.55, dashArray: u.state === "returning" ? "6 6" : null }).addTo(map);
      lines[id].src = u.leg.path;
    }
  });
  Object.keys(lines).forEach(id => { if (!liveLines.has(id)) { map.removeLayer(lines[id]); delete lines[id]; } });
  document.querySelectorAll("nav button").forEach(b => b.classList.toggle("on", b.dataset.tab === tab));
  const P = document.getElementById("pane"), top = P.scrollTop;
  if (tab === "cams") { drawCams(P); return; }
  P.innerHTML = tab === "tickets" ? ticketsHtml(now) : tab === "crew" ? crewHtml(now) : tab === "stock" ? stockHtml(now) : shopHtml();
  P.scrollTop = top;
}
function ticketsHtml(now) {
  if (!S.units.length) return '<div class="empty">Hire your first crew in the Shop to start getting tickets.</div>';
  if (!S.tickets.length) return '<div class="empty">No tickets yet. New ones arrive as your crew grows.</div>';
  const locked = S.moving && !S.passenger;
  return S.tickets.slice().sort((a, b) => a.deadline - b.deadline).map(t => {
    const j = jobByKey[t.key], left = t.deadline - now, km = (meters(playerPt(), [t.lat, t.lng]) * CONFIG.roadFactor / 1000).toFixed(1);
    let h = '<div class="row" data-act="select" data-id="' + t.id + '"><h3>' + j.icon + " " + j.label + "</h3>" +
      '<div class="meta">' + (left < 3600000 / CONFIG.timeScale ? '<span class="tag t-late">SLA</span>' : "") +
      "Pays " + money(j.pay) + ". " + km + " km away. SLA in " + dur(left) + ". " + (t.status === "assigned" ? "Crew assigned." : "") + "</div>";
    if (sel === t.id && t.status === "open") {
      const ok = S.units.filter(u => u.state === "idle" && THEME.units[u.type].tags.includes(j.needs));
      h += ok.length ? ok.map(u => {
        const miss = missingFor(u, j);
        if (miss.length) return '<div class="meta">' + THEME.units[u.type].label + " is out of " + miss.map(([p]) => PART(p).label.toLowerCase()).join(", ") + ". Order more in Stock.</div>";
        return '<button class="btn main" data-act="send" data-u="' + u.id + '" data-t="' + t.id + '"' + (locked ? " disabled" : "") +
          ">Send " + THEME.units[u.type].label + ", " + etaText(u, playerPt(), [t.lat, t.lng]) + "</button>";
      }).join("")
        : '<div class="meta">No crew with you can take this job.</div>';
      if (t.key === "alpr") h += '<button class="btn" data-act="decline" data-t="' + t.id + '">Decline contract</button>';
    }
    return h + "</div>";
  }).join("");
}
function etaText(u, a, b) {
  const r = routeNow(a, b);
  return r ? dur(r.dur * 1000 / CONFIG.timeScale) + " by road" : "about " + dur(travelMs(u, a, b));
}
function crewHtml(now) {
  if (!S.units.length) return '<div class="empty">No crew yet. Hire one in the Shop.</div>';
  const words = { idle: "With you", enroute: "Driving to job", onsite: "Working", returning: "Coming back" };
  return S.units.map(u => {
    const T = THEME.units[u.type];
    if (u.state === "onsite" && u.need.length) return '<div class="row"><h3>' + T.icon + " " + T.label + '</h3><div class="meta"><span class="wait">Waiting on parts</span>Needs ' +
      u.need.map(p => PART(p).label.toLowerCase()).join(", ") + ". " + (u.need.some(p => onOrder(u, p)) ? "On order." : "Order it in Stock.") + "</div></div>";
    const left = u.state === "onsite" ? (u.pass ? "Waiting for " + u.pass + " to pass overhead, done in " : "Done in ") + dur(u.workEnd - now) : u.leg ? "Arrives in " + dur(u.leg.end - now) : "";
    return '<div class="row"><h3>' + T.icon + " " + T.label + '</h3><div class="meta"><span class="tag t-' + u.state + '">' +
      words[u.state] + "</span>" + (left ? left + ". " : "") + (u.state === "onsite" ? scanText(S.tickets.find(x => x.id === u.ticketId)) : "") + "Wage " + money(T.wage) + " an hour.</div></div>";
  }).join("");
}
function stockHtml(now) {
  if (!S.units.length) return '<div class="empty">No crew yet. Hire one in the Shop.</div>';
  const total = S.units.reduce((a, u) => a + stockValue(u), 0);
  return '<div class="row"><div class="meta">Stock on all crews is worth ' + money(total) + ".</div></div>" + S.units.map(u => {
    const T = THEME.units[u.type];
    const rows = partsFor(u).map(k => {
      const P = PART(k), have = u.stock[k] || 0, coming = S.orders.filter(o => o.unitId === u.id && o.part === k);
      const eta = coming.length ? " " + coming.reduce((a, o) => a + o.qty, 0) + " coming in " + dur(Math.min(...coming.map(o => o.arrive)) - now) + "." : "";
      return '<div class="item"><span>' + P.label + ": <b>" + have + "</b>" + (P.sell ? " (sells " + money(P.sell) + ")" : "") + '<span class="meta">' + eta + "</span></span>" +
        '<span><button class="btn" data-act="order" data-u="' + u.id + '" data-p="' + k + '" data-q="1">+1</button><button class="btn" data-act="order" data-u="' + u.id + '" data-p="' + k + '" data-q="5">+5</button></span></div>';
    }).join("");
    return '<div class="row"><h3>' + T.icon + " " + T.label + '</h3><div class="meta">Stock worth ' + money(stockValue(u)) + ".</div>" + rows +
      '<button class="btn" data-act="restock" data-u="' + u.id + '">Restock to full kit</button></div>';
  }).join("");
}
let watching = null, camsKey = "";
function drawCams(P) {
  const mine = Object.keys(S.cams).map(id => ({ id, cam: camById(id), st: S.cams[id] })).filter(x => x.cam);
  const key = watching + "|" + mine.map(x => x.id + (x.st.broken ? "b" : "")).join(",");
  if (key === camsKey) return;
  camsKey = key;
  if (!mine.length) { P.innerHTML = '<div class="empty">No cameras installed yet. Hire an AV crew and take a Camera install ticket.</div>'; return; }
  P.innerHTML = mine.map(x => '<div class="row"><h3>' + (x.st.broken ? "🔧 " : "🎥 ") + x.cam.name + "</h3>" +
    '<div class="meta">' + (x.st.broken ? '<span class="tag t-late">Down</span>Repair ticket open.' : '<span class="tag t-onsite">Live</span>') + "</div>" +
    (!x.st.broken ? '<button class="btn" data-act="watch" data-c="' + x.id + '">' + (watching === x.id ? "Stop feed" : "Watch feed") + "</button>" : "") +
    (watching === x.id && !x.st.broken ? '<video id="feed" muted playsinline autoplay controls></video>' : "") + "</div>").join("");
  const v = document.getElementById("feed");
  if (v) {
    const src = camById(watching).video;
    if (v.canPlayType("application/vnd.apple.mpegurl")) v.src = src;
    else if (window.Hls && Hls.isSupported()) { const h = new Hls(); h.loadSource(src); h.attachMedia(v); }
    else v.src = src;
  }
}
function shopHtml() {
  return '<div class="row">' + (S.declined.count ? '<div class="meta">Plate reader contracts declined: ' + S.declined.count + "</div>" : "") +
    '<button class="btn" data-act="restart">Restart game</button></div>' + Object.entries(THEME.units).map(([k, T]) => '<div class="row"><h3>' + T.icon + " " + T.label + "</h3>" +
    '<div class="meta">' + money(T.price) + " to hire plus " + money(kitValue(k)) + " starting stock. Wage " + money(T.wage) + " an hour.</div>" +
    '<button class="btn" data-act="buy" data-k="' + k + '"' + (S.cash < T.price + kitValue(k) ? " disabled" : "") + ">Hire</button></div>").join("");
}
let tt;
function toast(m) { const e = document.getElementById("toast"); e.textContent = m; e.style.display = "block"; clearTimeout(tt); tt = setTimeout(() => e.style.display = "none", 3500); }

document.querySelector("nav").addEventListener("click", e => { const b = e.target.closest("button"); if (b) { tab = b.dataset.tab; camsKey = ""; draw(Date.now()); } });
document.body.addEventListener("click", e => {
  const b = e.target.closest("[data-act]"); if (!b) return;
  const a = b.dataset.act;
  if (a === "buy") buy(b.dataset.k);
  else if (a === "send") { e.stopPropagation(); dispatch(+b.dataset.u, +b.dataset.t); }
  else if (a === "passenger") { S.passenger = true; tick(); }
  else if (a === "order") { const u = S.units.find(x => x.id === +b.dataset.u); if (u) { order(u, b.dataset.p, +b.dataset.q); tick(); } }
  else if (a === "restock") { const u = S.units.find(x => x.id === +b.dataset.u); if (u) { restock(u); tick(); } }
  else if (a === "decline") {
    e.stopPropagation();
    const t = S.tickets.find(x => x.id === +b.dataset.t);
    if (t) { S.declined.count++; S.declined.sites[t.alprId] = 1; S.tickets = S.tickets.filter(x => x.id !== t.id); sel = null; toast("Contract declined. That site will not be offered again."); tick(); }
  }
  else if (a === "watch") { watching = watching === b.dataset.c ? null : b.dataset.c; camsKey = ""; draw(Date.now()); }
  else if (a === "restart") { if (confirm("Wipe this game and start over with the grant?")) { try { localStorage.removeItem(KEY); } catch (e) {} location.reload(); } }
  else if (a === "select") { const id = +b.dataset.id; sel = sel === id ? null : id; const t = S.tickets.find(x => x.id === id); if (t) { map.panTo([t.lat, t.lng]); getRoute(playerPt(), [t.lat, t.lng]).then(() => draw(Date.now())); } draw(Date.now()); }
});

if (S.player) map.setView(playerPt(), 13);
loadAlpr(playerPt());
S.units.forEach(u => {
  const leg = u.leg; if (!leg || leg.path) return;
  getRoute(leg.from, leg.to).then(r => { if (r && u.leg === leg) { leg.path = r.path; leg.cum = r.cum; leg.end = leg.start + r.dur * 1000 / CONFIG.timeScale; } });
});
locate(); setInterval(locate, CONFIG.locationEveryMs);
document.addEventListener("visibilitychange", () => { if (!document.hidden) { locate(); tick(); } });
tick(); setInterval(tick, 1000);
