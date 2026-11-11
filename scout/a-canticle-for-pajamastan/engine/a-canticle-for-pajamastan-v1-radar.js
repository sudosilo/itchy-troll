// A Canticle for Pajamastan engine, radar module, version one.
// Built from a-canticle-for-pajamastan-v1-spec-radar.md. Numbers and colors come from the radar tuning file.
// Draws onto any 2D canvas context. Shapes are rooms { id, x, y, w, h } and halls { x, y, w, h, a, b }.
(function (root) {
  var C = root.Canticle = root.Canticle || {};

  function create() { return { seen: {}, detectorLeft: 0 }; }

  // Mark the room the player is in, plus rooms at the far end of halls touching it.
  function reveal(t, r, rooms, halls, player) {
    var here = null;
    rooms.forEach(function (rm) { if (player.x >= rm.x && player.x <= rm.x + rm.w && player.y >= rm.y && player.y <= rm.y + rm.h) here = rm; });
    halls.forEach(function (h) {
      if (player.x >= h.x && player.x <= h.x + h.w && player.y >= h.y && player.y <= h.y + h.h) { r.seen['h' + h.a + '_' + h.b] = true; r.seen['r' + h.a] = true; r.seen['r' + h.b] = true; }
    });
    if (here) {
      r.seen['r' + here.id] = true;
      halls.forEach(function (h) { if (h.a === here.id || h.b === here.id) r.seen['h' + h.a + '_' + h.b] = true; });
    }
    return here;
  }

  function useDetector(t, r) { r.detectorLeft = t.detectorSeconds; }
  function tick(t, r, dt) { if (r.detectorLeft > 0) r.detectorLeft -= dt; }

  // icons: [{ x, y, kind, hidden }]. opts: { full, cx, cy, size, rotate }
  function draw(t, r, ctx, rooms, halls, player, icons, opts) {
    opts = opts || {};
    var size = opts.size || t.size, full = !!opts.full, cx = opts.cx, cy = opts.cy;
    var sc = full ? opts.scale || t.scale * 0.7 : t.scale;
    var col = t.colors;
    ctx.save();
    ctx.beginPath(); full ? ctx.rect(cx - size / 2, cy - size / 2, size, size) : ctx.arc(cx, cy, size / 2, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(cx - size / 2, cy - size / 2, size, size);
    ctx.translate(cx, cy);
    if (!full) ctx.rotate(-player.heading - Math.PI / 2);
    var ox = full ? opts.centerX || player.x : player.x, oy = full ? opts.centerY || player.y : player.y;
    ctx.scale(sc, sc); ctx.translate(-ox, -oy);
    halls.forEach(function (h) { if (!r.seen['h' + h.a + '_' + h.b]) return; ctx.fillStyle = h.blocked ? '#e6c4c4' : col.room; ctx.fillRect(h.x, h.y, h.w, h.h); });
    rooms.forEach(function (rm) { if (!r.seen['r' + rm.id]) return; ctx.fillStyle = col.room; ctx.fillRect(rm.x, rm.y, rm.w, rm.h); ctx.strokeStyle = col.edge; ctx.lineWidth = 2 / sc; ctx.strokeRect(rm.x, rm.y, rm.w, rm.h); });
    var live = t.liveRange, det = r.detectorLeft > 0;
    icons.forEach(function (ic) {
      if (ic.hidden && !(det && Math.hypot(ic.x - player.x, ic.y - player.y) <= t.detectorRange)) return;
      if (ic.kind === 'enemy' && Math.hypot(ic.x - player.x, ic.y - player.y) > live) return;
      var c = col[ic.kind] || '#999', s = (ic.kind === 'enemy' ? 5 : 6) / sc;
      ctx.fillStyle = c;
      if (ic.kind === 'door' || ic.kind === 'switch' || ic.kind === 'trap') ctx.fillRect(ic.x - s, ic.y - s, s * 2, s * 2);
      else { ctx.beginPath(); ctx.arc(ic.x, ic.y, s, 0, Math.PI * 2); ctx.fill(); }
    });
    ctx.fillStyle = col.player; ctx.beginPath();
    var hx = Math.cos(player.heading), hy = Math.sin(player.heading), s2 = 8 / sc;
    ctx.moveTo(player.x + hx * s2, player.y + hy * s2); ctx.lineTo(player.x - hx * s2 - hy * s2 * 0.7, player.y - hy * s2 + hx * s2 * 0.7); ctx.lineTo(player.x - hx * s2 + hy * s2 * 0.7, player.y - hy * s2 - hx * s2 * 0.7); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = col.player; ctx.lineWidth = 2;
    ctx.beginPath(); full ? ctx.rect(cx - size / 2, cy - size / 2, size, size) : ctx.arc(cx, cy, size / 2, 0, Math.PI * 2); ctx.stroke();
  }

  var api = { create: create, reveal: reveal, useDetector: useDetector, tick: tick, draw: draw };
  C.radar = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
