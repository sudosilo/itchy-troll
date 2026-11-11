/* City Seek v3. Shared scripts load in order: art, world, engine. */
'use strict';
  function visT(t, s) { if (t.sh && s < t.sh * 1.08) return false; if (t.hd && s > t.hd * 1.18) return false; return true; }

  function create(canvas, opts) {
    opts = opts || {};
    var ctx = canvas.getContext('2d');
    var pad = opts.pad || { t: 0, r: 0, b: 0, l: 0 };
    var world = null, mark = null, stamp = 0;
    var cam = { x: 0, y: 0, s: 0.1 }, vw = 1, vh = 1, dpr = 1;
    var dirty = true, anims = [], tween = null, hint = null, raf = 0;
    var stats = { misses: 0, hints: 0 };
    var FIND_S = 0.55, MAX_S = 5;
    var showMarks = true;
    var mini = opts.minimap || null, miniBase = null;
    var fxItems = [], bubbles = [], active = true, lastR = 0;
    var FXDUR = { jiggle: 650, hop: 550, spin: 750, pop: 4000, fly: 6000, crack: 8000 };

    function moverPos(m, ts) {
      var t = (ts + m.off) % m.period, n = m.pts.length;
      for (var i = 0; i < n; i++) {
        if (t < m.perch[i]) return { x: m.pts[i].x, y: m.pts[i].y, ang: m.face[i], fly: false };
        t -= m.perch[i];
        if (t < m.fly[i]) {
          var a = m.pts[i], b = m.pts[(i + 1) % n], k = t / m.fly[i], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, arc = Math.sin(k * Math.PI) * d * 0.12;
          return { x: a.x + dx * k - dy / d * arc, y: a.y + dy * k + dx / d * arc, ang: Math.atan2(dx, -dy), fly: true };
        }
        t -= m.fly[i];
      }
      return { x: m.pts[0].x, y: m.pts[0].y, ang: 0, fly: false };
    }
    function updateMovers(now) {
      if (!world || !world.movers) return;
      var ts = now / 1000;
      world.movers.forEach(function (m) {
        m.p = m.frozen || moverPos(m, ts);
        if (m.target) { m.target.x = m.target.wx = m.p.x; m.target.y = m.target.wy = m.p.y; }
      });
    }
    function itemVisible(it, s) { if (it.sh && s < it.sh * 1.08) return false; if (it.hd && s > it.hd * 1.15) return false; return true; }
    function hitItem(wx, wy) {
      var C = world.CELL, cx = Math.floor(wx / C), cy = Math.floor(wy / C);
      if (cx < 0 || cy < 0 || cx >= world.GW || cy >= world.GH) return null;
      var cell = world.grid[cy * world.GW + cx], best = null, bl = -1, bd = 1e9;
      for (var i = 0; i < cell.length; i++) {
        var it = world.items[cell[i]];
        if (!it.k || (!REACT[it.k] && it.k !== 'door') || (it.tgt && !it.tgt.found) || !itemVisible(it, cam.s)) continue;
        var d = Math.hypot(it.cx - wx, it.cy - wy), r = Math.max(6, Math.min((it.x1 - it.x0) / 2 * 0.75, 30)) + 6 / cam.s;
        if (it.k === 'door') r = 16 + 6 / cam.s;
        if (d > r) continue;
        if (it.L > bl || (it.L === bl && d < bd)) { best = it; bl = it.L; bd = d; }
      }
      return best;
    }
    function react(obj, kind, x, y, rad, now) {
      if (kind === 'door') { obj.door.openAt = obj.door.openUntil > now ? obj.door.openAt : now; obj.door.openUntil = now + 3200; SFX.play('creak'); return; }
      var r = REACT[kind]; if (!r) return;
      obj.fx = { type: r[0], t0: now, dur: FXDUR[r[0]] || 600, ang: Math.random() * TAU };
      if (fxItems.indexOf(obj) < 0) fxItems.push(obj);
      SFX.play(r[1]);
      if (r[2]) bubbles.push({ x: x, y: y - rad, text: r[2], t0: now });
      if (kind === 'pigeon') {
        var C = world.CELL, cell = world.grid[Math.floor(y / C) * world.GW + Math.floor(x / C)] || [];
        cell.forEach(function (id) { var o = world.items[id]; if (o !== obj && o.k === 'pigeon' && Math.hypot(o.cx - x, o.cy - y) < 50) { o.fx = { type: 'fly', t0: now + Math.random() * 200, dur: 6000 + Math.random() * 1500, ang: Math.atan2(o.cy - y, o.cx - x) + (Math.random() - 0.5) }; if (fxItems.indexOf(o) < 0) fxItems.push(o); } });
      }
    }
    function crackPath(c, it) {
      var cx = it.cx, cy = it.cy, R = Math.max(6, (it.x1 - it.x0) / 2 - 4), seed = (cx * 13 + cy * 7) | 0;
      c.beginPath();
      for (var i = 0; i < 7; i++) {
        var a = i / 7 * TAU + (seed % 10) * 0.1, x = cx, y = cy;
        c.moveTo(x, y);
        for (var j = 1; j <= 3; j++) { var rr2 = R * j / 3, wob = Math.sin(seed + i * 3 + j) * 0.3; c.lineTo(cx + Math.cos(a + wob) * rr2, cy + Math.sin(a + wob) * rr2); }
      }
    }
    function drawFx(c, t, e, now, s) {
      var el = now - e.t0, k = el / e.dur, cx = t.cx, cy = t.cy;
      if (el < 0) { t.f(c); return; }
      var a = 0, sc = 1, al = 1;
      if (e.type === 'jiggle') { a = Math.sin(k * TAU * 3) * 0.35 * (1 - k); sc = 1 + 0.12 * Math.sin(k * Math.PI); }
      else if (e.type === 'hop') { a = Math.sin(k * TAU * 2) * 0.15; sc = 1 + 0.45 * Math.sin(k * Math.PI); }
      else if (e.type === 'spin') { a = TAU * (1 - Math.pow(1 - k, 3)); sc = 1 + 0.2 * Math.sin(k * Math.PI); }
      else if (e.type === 'pop') {
        if (el < 260) { var q = el / 260; c.strokeStyle = 'rgba(230,57,70,' + (1 - q) + ')'; c.lineWidth = 1.4; c.beginPath(); for (var i = 0; i < 10; i++) { var b = i / 10 * TAU; c.moveTo(cx + Math.cos(b) * (4 + q * 6), cy + Math.sin(b) * (4 + q * 6)); c.lineTo(cx + Math.cos(b) * (8 + q * 12), cy + Math.sin(b) * (8 + q * 12)); } c.stroke(); return; }
        if (el < e.dur - 400) return;
        al = (el - (e.dur - 400)) / 400; sc = al;
      }
      else if (e.type === 'fly') {
        if (el < 1000) { var p = el / 1000; c.save(); c.globalAlpha = 1 - p * 0.7; c.translate(cx + Math.cos(e.ang) * 160 * p * p, cy + Math.sin(e.ang) * 160 * p * p); c.scale(1 + p * 0.8, 1 + p * 0.8); c.rotate(e.ang + Math.PI / 2); SP.bird(c, { col: '#8d93a0', belly: '#d6d9de', flap: (Math.sin(now / 35) + 1) / 2 }); c.restore(); return; }
        if (el < e.dur - 600) return;
        al = (el - (e.dur - 600)) / 600;
      }
      else if (e.type === 'crack') {
        t.f(c); var fade = k > 0.8 ? (1 - k) / 0.2 : 1;
        c.save(); c.globalAlpha = fade; crackPath(c, t); c.lineWidth = 1.6; c.strokeStyle = '#ffffff'; c.stroke(); c.lineWidth = 0.6; c.strokeStyle = INK; c.stroke(); c.restore(); return;
      }
      c.save(); if (al < 1) c.globalAlpha = al;
      c.translate(cx, cy); c.rotate(a); c.scale(sc, sc); c.translate(-cx, -cy); t.f(c); c.restore();
    }


    function minS() { return Math.min((vw - pad.l - pad.r) / world.W, (vh - pad.t - pad.b) / world.H); }
    function clampS(s) { return Math.max(minS(), Math.min(MAX_S, s)); }
    function clamp() {
      var s = cam.s, vW = vw / s, vH = vh / s;
      var minX = -pad.l / s, maxX = world.W + pad.r / s - vW;
      var minY = -pad.t / s, maxY = world.H + pad.b / s - vH;
      cam.x = maxX < minX ? (minX + maxX) / 2 : Math.min(maxX, Math.max(minX, cam.x));
      cam.y = maxY < minY ? (minY + maxY) / 2 : Math.min(maxY, Math.max(minY, cam.y));
    }
    function setCenter(wx, wy, s) { cam.s = clampS(s); cam.x = wx - vw / 2 / cam.s; cam.y = wy - vh / 2 / cam.s; clamp(); }
    function center() { return { x: cam.x + vw / 2 / cam.s, y: cam.y + vh / 2 / cam.s }; }
    function zoomAt(sx, sy, ns) { var wx = cam.x + sx / cam.s, wy = cam.y + sy / cam.s; cam.s = clampS(ns); cam.x = wx - sx / cam.s; cam.y = wy - sy / cam.s; clamp(); kick(); }
    function tweenTo(wx, wy, s, dur) { var c = center(); tween = { t0: performance.now(), dur: dur || 420, fx: c.x, fy: c.y, fs: cam.s, tx: wx, ty: wy, ts: clampS(s) }; kick(); }

    function resize() {
      var r = canvas.getBoundingClientRect(), c = world ? center() : null, olds = cam.s;
      dpr = Math.min(2, window.devicePixelRatio || 1); vw = Math.max(1, r.width); vh = Math.max(1, r.height);
      canvas.width = Math.round(vw * dpr); canvas.height = Math.round(vh * dpr);
      if (mini) { var mr = mini.getBoundingClientRect(); mini.width = Math.round(mr.width * dpr); mini.height = Math.round(mr.height * dpr); buildMini(); }
      if (world && c) setCenter(c.x, c.y, olds);
      kick();
    }

    function buildMini() {
      if (!mini || !world || !mini.width) return;
      miniBase = document.createElement('canvas'); miniBase.width = mini.width; miniBase.height = mini.height;
      var m = miniBase.getContext('2d'), sc = Math.min(mini.width / world.W, mini.height / world.H);
      m.fillStyle = '#ffffff'; m.fillRect(0, 0, mini.width, mini.height);
      m.setTransform(sc, 0, 0, sc, (mini.width - world.W * sc) / 2, (mini.height - world.H * sc) / 2);
      for (var i = 0; i < world.items.length; i++) { var it = world.items[i]; if (it.sh) continue; if (it.L <= 2) it.f(m); else if (it.L === 4 && it.dot) { m.fillStyle = it.dot; m.fillRect(it.x0, it.y0, it.x1 - it.x0, it.y1 - it.y0); } }
    }
    function drawMini() {
      if (!mini || !miniBase || mini.classList.contains('off')) return;
      var m = mini.getContext('2d'), sc = Math.min(mini.width / world.W, mini.height / world.H), ox = (mini.width - world.W * sc) / 2, oy = (mini.height - world.H * sc) / 2;
      m.setTransform(1, 0, 0, 1, 0, 0); m.drawImage(miniBase, 0, 0);
      m.setTransform(sc, 0, 0, sc, ox, oy);
      if (hint) { m.beginPath(); m.arc(hint.x, hint.y, hint.r, 0, TAU); m.fillStyle = 'rgba(255,210,63,.45)'; m.fill(); m.lineWidth = 2 / sc; m.strokeStyle = INK; m.stroke(); }
      (world.all || world.targets).forEach(function (t) { if (t.found) { m.beginPath(); m.arc(t.wx, t.wy, 4 / sc, 0, TAU); m.fillStyle = '#1f6fff'; m.fill(); } });
      m.lineWidth = 2.5 / sc; m.strokeStyle = '#1f6fff'; m.strokeRect(cam.x, cam.y, vw / cam.s, vh / cam.s);
    }

    function kick() { dirty = true; if (!raf) raf = requestAnimationFrame(frame); }
    function frame(now) {
      raf = 0;
      if (tween) {
        var k = Math.min(1, (now - tween.t0) / tween.dur), e = 1 - Math.pow(1 - k, 3);
        var s = tween.fs * Math.pow(tween.ts / tween.fs, e);
        setCenter(tween.fx + (tween.tx - tween.fx) * e, tween.fy + (tween.ty - tween.fy) * e, s);
        if (k >= 1) tween = null;
        dirty = true;
      }
      anims = anims.filter(function (a) { return now - a.t0 < a.dur; });
      if (hint && now - hint.t0 > hint.dur) hint = null;
      fxItems = fxItems.filter(function (it) { return it.fx && now - it.fx.t0 < it.fx.dur; });
      bubbles = bubbles.filter(function (b) { return now - b.t0 < 1000; });
      var busy = anims.length || hint || fxItems.length || bubbles.length;
      var ambient = active && world && world.live && cam.s >= 0.35 && !document.hidden;
      if (dirty || busy || (ambient && now - lastR > 33)) { render(now); dirty = false; lastR = now; }
      if (tween || busy || ambient) raf = requestAnimationFrame(frame);
    }

    function render(now) {
      var s = cam.s;
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#fbf8f1'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      if (!world) return;
      CS_NOW = now = now || performance.now(); updateMovers(now);
      ctx.setTransform(dpr * s, 0, 0, dpr * s, -cam.x * s * dpr, -cam.y * s * dpr);
      var x0 = cam.x, y0 = cam.y, x1 = cam.x + vw / s, y1 = cam.y + vh / s, C = world.CELL, items = world.items, grid = world.grid;
      stamp++; var list = [];
      var cy0 = Math.max(0, Math.floor(y0 / C)), cy1 = Math.min(world.GH - 1, Math.floor(y1 / C)), cx0 = Math.max(0, Math.floor(x0 / C)), cx1 = Math.min(world.GW - 1, Math.floor(x1 / C));
      for (var cy = cy0; cy <= cy1; cy++) for (var cx = cx0; cx <= cx1; cx++) {
        var cell = grid[cy * world.GW + cx];
        for (var i = 0; i < cell.length; i++) {
          var id = cell[i]; if (mark[id] === stamp) continue; mark[id] = stamp; var it = items[id];
          if (it.sh && s < it.sh) continue;
          if (it.hd && s > it.hd * 1.2) continue;
          if (it.x1 < x0 || it.x0 > x1 || it.y1 < y0 || it.y0 > y1) continue;
          list.push(id);
        }
      }
      list.sort(function (a, b) { return items[a].L - items[b].L || a - b; });
      var low = s < 0.22;
      for (var n = 0; n < list.length; n++) {
        var t = items[list[n]];
        if (low && t.L >= 3) {
          if (t.dot) { var w = Math.max(t.x1 - t.x0, 4) * 0.55; ctx.fillStyle = t.dot; ctx.fillRect((t.x0 + t.x1) / 2 - w / 2, (t.y0 + t.y1) / 2 - w / 2, w, w); }
          else if ((t.x1 - t.x0) * s >= 1.5) t.f(ctx);
          continue;
        }
        var al = 1;
        if (t.sh) al = Math.min(1, (s - t.sh) / (t.sh * 0.2));
        if (t.hd) al = Math.min(al, (t.hd * 1.2 - s) / (t.hd * 0.2));
        if (al <= 0.02) continue;
        if (t.fx) { if (now - t.fx.t0 < t.fx.dur) { if (al < 1) ctx.globalAlpha = al; drawFx(ctx, t, t.fx, now, s); ctx.globalAlpha = 1; continue; } t.fx = null; }
        if (al < 1) { ctx.globalAlpha = al; t.f(ctx); ctx.globalAlpha = 1; } else t.f(ctx);
      }
      if (world.movers) world.movers.forEach(function (m) {
        var p = m.p; if (!p || p.x < x0 - 20 || p.x > x1 + 20 || p.y < y0 - 20 || p.y > y1 + 20) return;
        if (low) { ctx.fillStyle = m.o.col; ctx.fillRect(p.x - 3, p.y - 3, 6, 6); return; }
        if (p.fly) { ctx.beginPath(); ctx.ellipse(p.x + 7, p.y + 10, 4, 2.5, 0, 0, TAU); ctx.fillStyle = 'rgba(26,26,46,.15)'; ctx.fill(); }
        var j = 0; if (m.fx && now - m.fx.t0 < m.fx.dur) { var kk = (now - m.fx.t0) / m.fx.dur; j = Math.sin(kk * TAU * 3) * 0.4 * (1 - kk); } else m.fx = null;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.ang + j); var bs = p.fly ? 1.3 : 1; ctx.scale(bs, bs);
        SP.bird(ctx, { col: m.o.col, belly: m.o.belly, flap: p.fly ? (Math.sin(now / 45 + m.off * 7) + 1) / 2 : -1 });
        ctx.restore();
      });
      ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.strokeRect(0, 0, world.W, world.H);
      if (showMarks) world.targets.forEach(function (tg) { if (!tg.found) return; ctx.beginPath(); ctx.arc(tg.x, tg.y, tg.r + 9, 0, TAU); ctx.lineWidth = Math.max(2.5, 3 / s); ctx.strokeStyle = '#1f6fff'; ctx.stroke(); });
      if (hint) {
        var hp = (now - hint.t0) / 600, pulse = 1 + Math.sin(hp * Math.PI) * 0.04;
        ctx.beginPath(); ctx.arc(hint.x, hint.y, hint.r * pulse, 0, TAU); ctx.fillStyle = 'rgba(255,210,63,.14)'; ctx.fill();
        ctx.setLineDash([18 / s, 12 / s]); ctx.lineWidth = 4 / s; ctx.strokeStyle = '#1f6fff'; ctx.stroke(); ctx.setLineDash([]);
      }
      anims.forEach(function (a) {
        var k = (now - a.t0) / a.dur;
        if (a.type === 'found') {
          ctx.beginPath(); ctx.arc(a.x, a.y, (a.r + 8) + k * 40 / s, 0, TAU); ctx.lineWidth = 5 / s * (1 - k) + 0.5; ctx.strokeStyle = 'rgba(31,111,255,' + (1 - k) + ')'; ctx.stroke();
        } else {
          ctx.beginPath(); ctx.arc(a.x, a.y, (6 + k * 14) / s, 0, TAU); ctx.lineWidth = 3 / s; ctx.strokeStyle = 'rgba(230,57,70,' + (1 - k) + ')'; ctx.stroke();
          var q = 6 / s; ctx.beginPath(); ctx.moveTo(a.x - q, a.y - q); ctx.lineTo(a.x + q, a.y + q); ctx.moveTo(a.x + q, a.y - q); ctx.lineTo(a.x - q, a.y + q); ctx.stroke();
        }
      });
      bubbles.forEach(function (b) {
        var k = (now - b.t0) / 1000, fz = 12 / s, y = b.y - k * 18 / s;
        ctx.save(); ctx.globalAlpha = k > 0.75 ? (1 - k) / 0.25 : 1;
        ctx.font = '900 ' + fz + 'px Trebuchet MS, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        var tw = ctx.measureText(b.text).width + fz; rr(ctx, b.x - tw / 2, y - fz * 0.9, tw, fz * 1.8, fz * 0.5);
        ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.lineWidth = 2 / s; ctx.strokeStyle = INK; ctx.stroke();
        ctx.fillStyle = INK; ctx.fillText(b.text, b.x, y + fz * 0.05); ctx.restore();
      });
      drawMini();
      if (opts.onView) opts.onView(s);
    }

    function tap(sx, sy) {
      if (!world) return;
      if (opts.onInteract) opts.onInteract();
      var wx = cam.x + sx / cam.s, wy = cam.y + sy / cam.s;
      if (cam.s < FIND_S) { tweenTo(wx, wy, Math.max(FIND_S * 1.7, cam.s * 3)); return; }
      var best = null, bd = 1e9, now0 = performance.now(); updateMovers(now0);
      world.targets.forEach(function (t) { if (t.found || !visT(t, cam.s)) return; var d = Math.hypot(t.x - wx, t.y - wy), tol = t.r + 12 / cam.s; if (d < tol && d < bd) { bd = d; best = t; } });
      var now = performance.now();
      if (best) {
        best.found = true; anims.push({ type: 'found', x: best.x, y: best.y, r: best.r, t0: now, dur: 900 });
        if (hint && hint.id === best.id) hint = null;
        if (best.mover) best.mover.frozen = best.mover.p;
        SFX.play('found');
        if (opts.onFind) opts.onFind(best);
      } else {
        if (world.movers) {
          var mb = null, md = 1e9;
          world.movers.forEach(function (m) { if (!m.p || (m.target && !m.target.found)) return; var d = Math.hypot(m.p.x - wx, m.p.y - wy); if (d < 10 + 8 / cam.s && d < md) { md = d; mb = m; } });
          if (mb) { mb.fx = { t0: now, dur: 650 }; SFX.play('chirp'); bubbles.push({ x: mb.p.x, y: mb.p.y - 12, text: 'TWEET', t0: now }); kick(); return; }
        }
        var hi = hitItem(wx, wy);
        if (hi) {
          react(hi, hi.k, hi.cx, hi.cy, Math.min((hi.y1 - hi.y0) / 2, 26), now);
          if (hi.decoy) { stats.misses++; if (opts.onMiss) opts.onMiss(stats.misses, true); }
          kick(); return;
        }
        var tw = null;
        if (world.towers) world.towers.forEach(function (q) { if (wx >= q.x0 && wx <= q.x1 && wy >= q.y0 && wy <= q.y1) tw = q; });
        if (tw && opts.onTower) { opts.onTower(tw); return; }
        stats.misses++; anims.push({ type: 'miss', x: wx, y: wy, t0: now, dur: 450 }); SFX.play('miss');
        if (opts.onMiss) opts.onMiss(stats.misses);
      }
      kick();
    }

    var P = new Map(), gest = null;
    function local(e) { var r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    function onDown(e) {
      canvas.setPointerCapture(e.pointerId); var p = local(e); P.set(e.pointerId, p); tween = null;
      if (P.size === 1) gest = { type: 'pan', sx: p.x, sy: p.y, cx: cam.x, cy: cam.y, moved: false, t: performance.now() };
      else if (P.size === 2) { var v = Array.from(P.values()), mx = (v[0].x + v[1].x) / 2, my = (v[0].y + v[1].y) / 2; gest = { type: 'pinch', d: Math.hypot(v[0].x - v[1].x, v[0].y - v[1].y) || 1, s: cam.s, wx: cam.x + mx / cam.s, wy: cam.y + my / cam.s }; }
    }
    function onMove(e) {
      if (!P.has(e.pointerId) || !gest) return; var p = local(e); P.set(e.pointerId, p);
      if (gest.type === 'pan' && P.size === 1) {
        var dx = p.x - gest.sx, dy = p.y - gest.sy;
        if (!gest.moved && Math.hypot(dx, dy) > 8) gest.moved = true;
        if (gest.moved) { cam.x = gest.cx - dx / cam.s; cam.y = gest.cy - dy / cam.s; clamp(); kick(); }
      } else if (gest.type === 'pinch' && P.size >= 2) {
        var v = Array.from(P.values()), mx = (v[0].x + v[1].x) / 2, my = (v[0].y + v[1].y) / 2, d = Math.hypot(v[0].x - v[1].x, v[0].y - v[1].y);
        cam.s = clampS(gest.s * d / gest.d); cam.x = gest.wx - mx / cam.s; cam.y = gest.wy - my / cam.s; clamp(); kick();
      }
    }
    function onUp(e) {
      if (!P.has(e.pointerId)) return; var p = local(e); P.delete(e.pointerId);
      if (gest && gest.type === 'pan' && !gest.moved && P.size === 0 && performance.now() - gest.t < 600) tap(p.x, p.y);
      if (P.size === 1) { var q = Array.from(P.values())[0]; gest = { type: 'pan', sx: q.x, sy: q.y, cx: cam.x, cy: cam.y, moved: true, t: 0 }; }
      else if (P.size === 0) gest = null;
    }
    function onWheel(e) { e.preventDefault(); var p = local(e); zoomAt(p.x, p.y, cam.s * Math.exp(-e.deltaY * 0.0015)); }
    canvas.addEventListener('pointerdown', onDown); canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp); canvas.addEventListener('pointercancel', onUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });

    var miniDrag = false;
    function miniGo(e) {
      var r = mini.getBoundingClientRect(), sc = Math.min(r.width / world.W, r.height / world.H), ox = (r.width - world.W * sc) / 2, oy = (r.height - world.H * sc) / 2;
      setCenter((e.clientX - r.left - ox) / sc, (e.clientY - r.top - oy) / sc, Math.max(cam.s, FIND_S)); kick();
    }
    if (mini) {
      mini.addEventListener('pointerdown', function (e) { if (!world) return; miniDrag = true; mini.setPointerCapture(e.pointerId); if (opts.onInteract) opts.onInteract(); miniGo(e); });
      mini.addEventListener('pointermove', function (e) { if (miniDrag) miniGo(e); });
      mini.addEventListener('pointerup', function () { miniDrag = false; });
      mini.addEventListener('pointercancel', function () { miniDrag = false; });
    }
    window.addEventListener('resize', resize);

    function load(w) {
      world = w; mark = new Int32Array(world.items.length); stamp = 0;
      anims = []; hint = null; tween = null; fxItems = []; bubbles = [];
      resize();
      setCenter(world.W / 2, world.H / 2, minS());
      buildMini(); kick();
    }
    function newGame(o) {
      o = o || {};
      var seed = (o.seed != null ? o.seed : Math.floor(Math.random() * 900000) + 100000) >>> 0;
      stats = { misses: 0, hints: 0 };
      load(build(seed, o.difficulty || 'normal'));
      return { seed: world.seed, difficulty: world.difficulty, targets: world.all };
    }
    function giveHint() {
      if (!world) return null;
      var left = (world.all || world.targets).filter(function (t) { return !t.found; });
      if (!left.length) return null;
      var t = left[Math.floor(Math.random() * left.length)], a = Math.random() * TAU, off = t.tower ? 60 : 120 + Math.random() * 160, r = 430;
      var hx = Math.max(r * 0.6, Math.min(world.W - r * 0.6, t.wx + Math.cos(a) * off)), hy = Math.max(r * 0.6, Math.min(world.H - r * 0.6, t.wy + Math.sin(a) * off));
      hint = { id: t.id, x: hx, y: hy, r: r, t0: performance.now(), dur: 9000 };
      stats.hints++;
      tweenTo(hx, hy, Math.min((vw - pad.l - pad.r) / (r * 2.2), (vh - pad.t - pad.b) / (r * 2.2)), 600);
      return t;
    }
    function drawIcon(cv, t) {
      var c = cv.getContext('2d'), w = cv.width, h = cv.height, sc = Math.min(w, h) / (t.r * 2.9);
      c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, w, h);
      if (t.kind === 'duck') { c.fillStyle = '#7cc4ff'; c.fillRect(0, 0, w, h); }
      if (t.kind === 'bucket' || t.kind === 'castle' || t.kind === 'toytruck') { c.fillStyle = '#f3dfa8'; c.fillRect(0, 0, w, h); }
      c.setTransform(sc, 0, 0, sc, w / 2, h / 2 + (t.kind === 'balloon' ? -2 * sc : t.kind === 'castle' ? 2 * sc : 0));
      SP[t.kind](c, t.o);
    }

    return {
      newGame: newGame,
      load: load,
      zoomBy: function (f) { zoomAt(vw / 2, vh / 2 + (pad.t - pad.b) / 2, cam.s * f); },
      fit: function () { tweenTo(world.W / 2, world.H / 2, minS(), 450); },
      hint: giveHint,
      drawIcon: drawIcon,
      resize: resize,
      setMarks: function (v) { showMarks = !!v; kick(); },
      redraw: kick,
      resetStats: function () { stats = { misses: 0, hints: 0 }; },
      getStats: function () { return { misses: stats.misses, hints: stats.hints }; },
      getTargets: function () { return world ? (world.all || world.targets) : []; },
      getWorld: function () { return world; },
      getScale: function () { return cam.s; },
      setActive: function (v) { active = !!v; kick(); },
      toScreen: function (x, y) { var r = canvas.getBoundingClientRect(); return { x: r.left + (x - cam.x) * cam.s, y: r.top + (y - cam.y) * cam.s }; },
      focus: function (x, y, s) { setCenter(x, y, s); kick(); }
    };
  }

  window.CitySeek = { create: create, buildFloor: buildFloor, TARGETS: TDEF, DIFFICULTY: DIFF, SPRITES: SP, ROOF_S: ROOF_S, setSound: SFX.set, version: 'v4' };
