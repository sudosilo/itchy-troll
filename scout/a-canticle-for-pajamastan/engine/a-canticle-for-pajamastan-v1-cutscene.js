// A Canticle for Pajamastan engine, cutscene module, version one.
// Built from a-canticle-for-pajamastan-v1-spec-cutscene.md. Default timings come from the cutscene tuning file.
// steps: [{ do: 'camera'|'look'|'line'|'move'|'face'|'anim'|'sound'|'fade'|'shake'|'flag'|'wait', ... } | { group: [steps] }]
// stage: { camera: {x,y}, actors: { id: {x,y,heading} }, flags: {}, fade: 0..1, line: null, onSound(name), onAnim(id,name), onShake(n) }
(function (root) {
  var C = root.Canticle = root.Canticle || {};

  function duration(t, s) {
    if (s.group) return Math.max.apply(null, s.group.map(function (g) { return duration(t, g); }).concat([0]));
    if (s.do === 'line') return s.seconds || t.lineTimeout;
    if (s.do === 'fade') return s.seconds || t.fadeSeconds;
    if (s.do === 'camera' || s.do === 'move' || s.do === 'wait') return s.seconds || t.cameraEase;
    return 0;
  }

  function create(t, steps, stage) {
    return { t: t, steps: steps, stage: stage, at: 0, clock: 0, started: false, from: null, done: false, waitingTap: false };
  }

  function begin(cs, s, stage) {
    var st = stage, list = s.group || [s];
    list.forEach(function (x) {
      x._from = null;
      if (x.do === 'camera') x._from = { x: st.camera.x, y: st.camera.y };
      if (x.do === 'move') { var a = st.actors[x.actor]; x._from = { x: a.x, y: a.y }; }
      if (x.do === 'fade') x._from = st.fade;
      if (x.do === 'line') st.line = { speaker: x.speaker, text: x.text, shown: 0 };
      if (x.do === 'look') st.camera.look = x.target;
      if (x.do === 'face') { var b = st.actors[x.actor], tg = st.actors[x.target] || x.point; if (b && tg) b.heading = Math.atan2(tg.y - b.y, tg.x - b.x); }
      if (x.do === 'anim' && st.onAnim) st.onAnim(x.actor, x.name);
      if (x.do === 'sound' && st.onSound) st.onSound(x.name);
      if (x.do === 'shake' && st.onShake) st.onShake(x.amount || 10);
      if (x.do === 'flag') { if (x.on === false) delete st.flags[x.flag]; else st.flags[x.flag] = true; }
    });
  }

  function apply(cs, s, k) {
    var st = cs.stage, list = s.group || [s], e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    list.forEach(function (x) {
      var d = duration(cs.t, x), kk = d ? Math.min(1, (k * duration(cs.t, s)) / d) : 1, ee = kk < 0.5 ? 2 * kk * kk : 1 - Math.pow(-2 * kk + 2, 2) / 2;
      if (x.do === 'camera') { st.camera.x = x._from.x + (x.x - x._from.x) * ee; st.camera.y = x._from.y + (x.y - x._from.y) * ee; }
      if (x.do === 'move') { var a = st.actors[x.actor]; a.x = x._from.x + (x.x - x._from.x) * ee; a.y = x._from.y + (x.y - x._from.y) * ee; a.heading = Math.atan2(x.y - x._from.y, x.x - x._from.x); }
      if (x.do === 'fade') st.fade = x._from + ((x.to === undefined ? 1 : x.to) - x._from) * kk;
      if (x.do === 'line' && st.line) st.line.shown = Math.min(st.line.text.length, Math.floor(kk * duration(cs.t, x) * cs.t.charsPerSecond));
    });
  }

  // Returns false when finished.
  function tick(cs, dt) {
    if (cs.done) return false;
    var s = cs.steps[cs.at];
    if (!s) { cs.done = true; cs.stage.line = null; return false; }
    if (!cs.started) { begin(cs, s, cs.stage); cs.started = true; cs.clock = 0; }
    cs.clock += dt;
    var d = duration(cs.t, s);
    apply(cs, s, d ? Math.min(1, cs.clock / d) : 1);
    if (cs.clock >= d && !(s.do === 'line' && s.waitTap && !cs.tapped)) { cs.at++; cs.started = false; cs.tapped = false; if (s.do === 'line') cs.stage.line = null; }
    return true;
  }

  function tap(cs) { var s = cs.steps[cs.at]; if (s && s.do === 'line') { if (cs.stage.line && cs.stage.line.shown < cs.stage.line.text.length) cs.clock = duration(cs.t, s); else { cs.tapped = true; cs.clock = duration(cs.t, s); } } }

  // Skip: run every remaining step to its end state immediately.
  function skip(cs) {
    while (cs.at < cs.steps.length) { var s = cs.steps[cs.at]; if (!cs.started) begin(cs, s, cs.stage); apply(cs, s, 1); cs.at++; cs.started = false; }
    cs.stage.line = null; cs.done = true;
  }

  var api = { create: create, tick: tick, tap: tap, skip: skip, duration: duration };
  C.cutscene = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
