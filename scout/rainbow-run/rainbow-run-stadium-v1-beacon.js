/* rainbow-run-stadium-v1-beacon.js
   BLUE PHONE: timing beacon. The host phone, plugged into the venue speakers, plays a short rising chirp at every
   whole four seconds of server time. A seat phone listens with its microphone, finds the chirp in what it heard by
   matching it against the same chirp, and subtracts the time the sound took to travel from the speakers to its seat.
   What is left is how late the chirp landed: the speaker system's own delay, which is the same for every phone,
   plus this phone's own clock error. The server shares the middle of every phone's report as the speaker delay,
   and each phone takes the rest as its clock error and corrects for it. Phones that cannot hear keep the network clock.

   This is the same idea as Offset Listener's acoustic sync: the room's own sound is the reference, and the
   network only has to carry the reports. */
(function(){
"use strict";
const EVERY = 4000, F0 = 2500, F1 = 6000, LEN = 0.12, SOUND = 343;

function chirp(rate) {
  const n = Math.round(LEN * rate), out = new Float32Array(n), k = (F1 - F0) / LEN;
  for (let i = 0; i < n; i++) { const t = i / rate, w = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (n - 1)); out[i] = w * Math.sin(2 * Math.PI * (F0 * t + k * t * t / 2)); }
  return out;
}

/* ---------- host: play the chirp on every beat of the beacon ---------- */
function player(actx, nowFn) {
  let on = false, done = -1, timer = null, buf = null;
  function tick() {
    if (!on) return;
    if (!buf || buf.sampleRate !== actx.sampleRate) { const c = chirp(actx.sampleRate); buf = actx.createBuffer(1, c.length, actx.sampleRate); buf.copyToChannel(c, 0); }
    const now = nowFn(), k = Math.ceil((now + 500) / EVERY);
    if (k <= done) return;
    const start = actx.currentTime + (k * EVERY - now) / 1000 - (actx.outputLatency || actx.baseLatency || 0);
    if (start < actx.currentTime + 0.02) { done = k; return; }
    const src = actx.createBufferSource(), g = actx.createGain(); g.gain.value = 0.9;
    src.buffer = buf; src.connect(g); g.connect(actx.destination); src.start(start); done = k;
  }
  return {
    set: function(v){ on = !!v; clearInterval(timer); if (on) { timer = setInterval(tick, 250); tick(); } },
    get on(){ return on; }
  };
}

/* ---------- seat: listen and measure ---------- */
function fft(re, im, inv) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) { let b = n >> 1; for (; j & b; b >>= 1) j ^= b; j ^= b; if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; } }
  for (let len = 2; len <= n; len <<= 1) {
    const a = 2 * Math.PI / len * (inv ? 1 : -1), wr = Math.cos(a), wi = Math.sin(a);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let j = 0; j < len / 2; j++) {
        const ur = re[i + j], ui = im[i + j], xr = re[i + j + len / 2], xi = im[i + j + len / 2];
        const vr = xr * cr - xi * ci, vi = xr * ci + xi * cr;
        re[i + j] = ur + vr; im[i + j] = ui + vi; re[i + j + len / 2] = ur - vr; im[i + j + len / 2] = ui - vi;
        const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr;
      }
    }
  }
  if (inv) for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
}

const WORKLET = "class B extends AudioWorkletProcessor{constructor(){super();this.b=new Float32Array(2048);this.n=0}" +
  "process(i){const c=i[0]&&i[0][0];if(!c)return true;for(let k=0;k<c.length;k++){this.b[this.n++]=c[k];if(this.n===2048){this.port.postMessage({d:this.b.slice(0),f:currentFrame+k+1});this.n=0}}return true}}" +
  "registerProcessor('rr-beacon',B)";

/* listener(actx, stream, rawNow, where) : rawNow is the network clock without any beacon correction,
   where() returns {x, y, sx, sy} for the seat and the speakers, report(err) sends a measurement. */
async function listener(actx, stream, rawNow, where, report) {
  const r = Math.max(1, Math.floor(actx.sampleRate / 16000)), rate = actx.sampleRate / r;
  const ring = new Float32Array(Math.round(rate * 4)), tmpl = chirp(rate);
  let written = 0, anchorN = 0, anchorT = 0, tried = -1, stopped = false, acc = 0, accN = 0;
  const url = URL.createObjectURL(new Blob([WORKLET], { type: "application/javascript" }));
  await actx.audioWorklet.addModule(url);
  const src = actx.createMediaStreamSource(stream), node = new AudioWorkletNode(actx, "rr-beacon"), mute = actx.createGain();
  mute.gain.value = 0; src.connect(node); node.connect(mute); mute.connect(actx.destination);
  node.port.onmessage = function(e){
    const d = e.data.d;
    for (let i = 0; i < d.length; i++) { acc += d[i]; if (++accN === r) { ring[written % ring.length] = acc / r; written++; acc = 0; accN = 0; } }
    /* server time of the newest sample: when the block ended on the audio clock, minus how late input reaches us */
    const endCtx = e.data.f / actx.sampleRate;
    anchorN = written; anchorT = rawNow() + (endCtx - actx.currentTime) * 1000 - (actx.baseLatency || 0) * 1000;
    check();
  };
  function timeOf(i) { return anchorT - (anchorN - i) / rate * 1000; }
  function check() {
    const w = where(); if (!w) return;
    const travel = Math.hypot(w.x - w.sx, w.y - w.sy) / SOUND * 1000, now = timeOf(anchorN);
    /* look for the newest beacon once its sound must have passed, allowing up to half a second of speaker delay */
    const k = Math.floor((now - travel - 700) / EVERY);
    if (k <= tried) return;
    tried = k;
    const t0 = k * EVERY + travel - 100, t1 = k * EVERY + travel + 600 + LEN * 1000;
    const i0 = Math.round(anchorN - (anchorT - t0) / 1000 * rate), i1 = Math.round(anchorN - (anchorT - t1) / 1000 * rate);
    if (i0 < written - ring.length || i1 > written || i1 <= i0) return;
    let n = 1; while (n < (i1 - i0) + tmpl.length) n <<= 1;
    const xr = new Float32Array(n), xi = new Float32Array(n), tr = new Float32Array(n), ti = new Float32Array(n);
    for (let i = i0; i < i1; i++) xr[i - i0] = ring[i % ring.length];
    tr.set(tmpl);
    fft(xr, xi, false); fft(tr, ti, false);
    for (let i = 0; i < n; i++) { const a = xr[i] * tr[i] + xi[i] * ti[i], b = xi[i] * tr[i] - xr[i] * ti[i]; xr[i] = a; xi[i] = b; }
    fft(xr, xi, true);
    const span = i1 - i0 - tmpl.length;
    let best = 0, at = -1, sum = 0;
    for (let i = 0; i < span; i++) { const v = Math.abs(xr[i]); sum += v; if (v > best) { best = v; at = i; } }
    let second = 0; const gap = Math.round(rate * 0.006);
    for (let i = 0; i < span; i++) if (Math.abs(i - at) > gap) second = Math.max(second, Math.abs(xr[i]));
    const mean = sum / Math.max(1, span);
    if (at < 0 || best < mean * 8 || best < second * 1.4) return;
    const arrival = timeOf(i0 + at), err = arrival - k * EVERY - travel;
    report(err, best / mean);
  }
  return { stop: function(){ stopped = true; try { node.disconnect(); src.disconnect(); stream.getTracks().forEach(function(t){ t.stop(); }); } catch (e) {} } };
}

window.STADIUM_BEACON = { player: player, listener: listener, chirp: chirp, EVERY: EVERY, SOUND: SOUND };
})();
