/* rainbow-run-stadium-v1-mosaic.js
   BLUE PHONE: stadium mosaics. A demo cue runs one of the Rainbow Run animations, and a video stunt cue runs a
   video, on a small hidden screen the shape of the venue. Every seat phone runs the same frame from the server
   clock and lights its whole screen with the color under its own seat, so the crowd together shows the picture.
   The host screen runs the same thing and colors every seat in its preview, so it shows what the stands show.

   STADIUM_MOSAIC.make(cue, aspect, now, loop) gives a source for that cue, or the same one again while the cue
   holds. source.grab() returns {w, h, data} or null, and source.tainted turns true when a video's site
   will not let its pixels be read, in which case the video can only play whole on each screen. */
(function(){
"use strict";
let cur = null;

function gridSize(aspect) {
  aspect = Math.max(0.2, Math.min(5, aspect || 1.6));
  return aspect >= 1 ? [200, Math.max(40, Math.round(200 / aspect))] : [Math.max(40, Math.round(200 * aspect)), 200];
}
function hideStyle(el, w, h) {
  /* kept on screen behind everything, so the browser keeps drawing it */
  el.style.cssText = "position:fixed;left:0;top:0;width:" + w + "px;height:" + h + "px;border:0;z-index:-1;opacity:0.01;pointer-events:none";
}

function demoSource(cue, aspect) {
  const sz = gridSize(aspect), f = document.createElement("iframe");
  hideStyle(f, sz[0], sz[1]);
  f.setAttribute("aria-hidden", "true"); f.tabIndex = -1;
  f.src = "index.html?embed=1&scene=" + encodeURIComponent(cue.scene || "crow");
  document.body.appendChild(f);
  return {
    el: f, w: sz[0], h: sz[1], tainted: false,
    grab: function(){ try { const g = f.contentWindow && f.contentWindow.__stadiumGrab; if (!g) return null; return { w: sz[0], h: sz[1], data: g(sz[0], sz[1]) }; } catch (e) { return null; } },
    destroy: function(){ f.remove(); }
  };
}

function videoSource(cue, aspect, nowFn) {
  const sz = gridSize(aspect), v = document.createElement("video"), c = document.createElement("canvas");
  c.width = sz[0]; c.height = sz[1];
  const x = c.getContext("2d", { willReadFrequently: true });
  v.crossOrigin = "anonymous"; v.playsInline = true; v.muted = cue.muted !== false ? true : false; v.loop = !!cue.loop; v.preload = "auto";
  v.setAttribute("playsinline", ""); hideStyle(v, 2, 2);
  v.src = cue.url; document.body.appendChild(v);
  let lastSync = 0;
  const src = {
    el: v, w: sz[0], h: sz[1], tainted: false,
    grab: function(){
      if (src.tainted) return null;
      const now = nowFn(), want = (now - cue.at) / 1000;
      if (want < 0 || v.readyState < 2 || !isFinite(v.duration)) { if (v.paused && v.readyState >= 1 && want >= 0) v.play().catch(function(){ v.muted = true; v.play().catch(function(){}); }); return null; }
      let tgt = cue.loop ? want % v.duration : want;
      if (!cue.loop && want > v.duration) { v.pause(); tgt = v.duration; }
      else {
        if (v.paused) { v.currentTime = tgt; v.play().catch(function(){ v.muted = true; v.play().catch(function(){}); }); }
        if (now - lastSync > 1000) { lastSync = now; const d = tgt - v.currentTime; if (Math.abs(d) > 0.35) v.currentTime = tgt; else v.playbackRate = Math.max(0.95, Math.min(1.05, 1 + d * 0.5)); }
      }
      /* the video is laid over the venue shape the way a screen with fill would show it */
      const vw = v.videoWidth, vh = v.videoHeight; if (!vw || !vh) return null;
      const s = Math.max(sz[0] / vw, sz[1] / vh), dw = vw * s, dh = vh * s;
      x.fillStyle = "#000"; x.fillRect(0, 0, sz[0], sz[1]);
      x.drawImage(v, (sz[0] - dw) / 2, (sz[1] - dh) / 2, dw, dh);
      try { return { w: sz[0], h: sz[1], data: x.getImageData(0, 0, sz[0], sz[1]).data }; }
      catch (e) { src.tainted = true; v.muted = true; v.pause(); return null; }
    },
    destroy: function(){ v.pause(); v.removeAttribute("src"); try { v.load(); } catch (e) {} v.remove(); }
  };
  return src;
}

function wants(cue) { return !!cue && (cue.type === "demo" || (cue.type === "video" && cue.stunt)); }

function make(cue, aspect, nowFn) {
  if (!wants(cue)) { if (cur) { cur.src.destroy(); cur = null; } return null; }
  const key = cue.type + "|" + cue.at + "|" + (cue.scene || cue.url) + "|" + Math.round((aspect || 1) * 20);
  if (cur && cur.key === key) return cur.src;
  if (cur) cur.src.destroy();
  cur = { key: key, src: cue.type === "demo" ? demoSource(cue, aspect) : videoSource(cue, aspect, nowFn) };
  return cur.src;
}

/* The color under one seat. s carries u and v across the venue, or across the cue's box when the show fits the guests. */
function sample(frame, u, v) {
  if (!frame) return null;
  const x = Math.max(0, Math.min(frame.w - 1, Math.floor(u * frame.w))), y = Math.max(0, Math.min(frame.h - 1, Math.floor(v * frame.h))), i = (y * frame.w + x) * 4;
  return [frame.data[i], frame.data[i + 1], frame.data[i + 2]];
}

/* The scenes Rainbow Run can run, in the groups its own menu shows. */
const GROUPS = [
  ["Wall", [["crow", "Crow"], ["highway", "Highway"], ["rain", "Rain"], ["stars", "Stars"]]],
  ["Roads", [["cars", "Cars"], ["carpark", "Car park"], ["race", "Car race"], ["bikes", "Downhill bikes"], ["cheese", "Cheese roll"]]],
  ["Sky", [["planes", "Planes"], ["birds", "Birds"], ["satellites", "Satellites"], ["polar", "Polar"], ["tornado", "Tornado"]]],
  ["Water", [["fish", "Fish"], ["galleon", "Galleon"], ["river", "River"], ["boatrace", "Boat race"]]],
  ["Animals", [["cats", "Cats"], ["dogs", "Dogs"], ["farm", "Farm"], ["horserace", "Horse race"], ["ants", "Ants"], ["snakes", "Snakes"], ["people", "People"]]],
  ["Screensavers", [["plasma", "Plasma"], ["lines", "Lines"], ["warp", "Warp"], ["pipes", "Pipes"], ["matrix", "Matrix"], ["blob", "Blob"], ["bounce", "Bounce"]]],
  ["Spectral Engine", [["spectrum", "Spectrum"], ["waveform", "Waveform"], ["mandala", "Mandala"], ["edo", "31-EDO Ring"], ["particles", "Particles"], ["lissajous", "Lissajous"], ["hexgrid", "Hex Grid"], ["spiral", "Spiral"], ["neural", "Neural"], ["ribbon", "Ribbon"], ["constellation", "Constellation"], ["pendulum", "Pendulum"]]],
  ["Places", [["city", "City"], ["garden", "Garden"], ["warehouse", "Warehouse"], ["battle", "Battle"]]]
];

window.STADIUM_MOSAIC = { make: make, sample: sample, wants: wants, GROUPS: GROUPS, current: function(){ return cur && cur.src; } };
})();
