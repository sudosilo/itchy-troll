/* rainbow-run-stadium-v1-virus.js
   BLUE PHONE: virus mode on a phone. While the host runs a virus cue, the phone plays its motif in its own slot
   of the shared cycle: the crisp tick that measures, then the soft owo that makes it music. It listens the whole
   time, finds every tick it hears with the matched filters in rainbow-run-stadium-v1-virus-core.js, and after
   each cycle reports the times on its own audio clock to the server. The server sends back its strain, its hops
   from the seed, and where the map puts it.

   Once infected, the phone joins its strain's sound bubble: every phone with that strain plays the same low
   groove in step off the shared clock, loudest near the seed and lightest at the edge. The groove stays below the
   tick bands, so it never gets in the way of the measuring. */
(function(){
"use strict";
const V = window.STADIUM_VX;
const WORKLET = "class X extends AudioWorkletProcessor{constructor(){super();this.b=new Float32Array(1024);this.n=0}" +
  "process(i){const c=i[0]&&i[0][0];if(!c)return true;for(let k=0;k<c.length;k++){this.b[this.n++]=c[k];if(this.n===1024){this.port.postMessage({d:this.b.slice(0),f:currentFrame+k+1});this.n=0}}return true}}" +
  "registerProcessor('rr-virus',X)";
/* each strain has its own groove: a kick pattern over the eight beats of a cycle and a bass line */
const GROOVES = [
  { kick: [1, 0, 0, 1, 1, 0, 1, 0], bass: [55, 55, 65.41, 49] },
  { kick: [1, 0, 1, 0, 1, 0, 1, 1], bass: [61.74, 61.74, 73.42, 55] },
  { kick: [1, 1, 0, 1, 0, 1, 0, 0], bass: [49, 58.27, 49, 43.65] },
  { kick: [1, 0, 0, 0, 1, 0, 1, 0], bass: [73.42, 65.41, 55, 61.74] }
];
const BEAT_MS = V.CYCLE_MS / 8;

function create(o) {
  /* o: actx, now() server ms, send(msg), cue() current cue */
  const actx = o.actx;
  let me = null, stream = null, node = null, src = null, mute = null, stopped = false;
  let rate = 0, r = 1, ring = null, written = 0, acc = 0, accN = 0, anchorN = 0, anchorT = 0, bankF = null, wideF = null;
  let started = false, scheduled = -1, groovedTo = -1, doneSlot = -1, curCycle = -1, report = null, tickBufs = [];
  const bus = actx.createGain(); bus.gain.value = 0.9; bus.connect(o.out || actx.destination);

  function cycleOf(t) { const c = o.cue(); return c ? Math.floor((t - c.at) / V.CYCLE_MS) : -1; }
  function slotStart(c, s) { return o.cue().at + c * V.CYCLE_MS + s * V.SLOT_MS; }
  function plays(c) { return me && ((c % me.G) + me.G) % me.G === me.group; }
  function at(t) { return actx.currentTime + (t - o.now()) / 1000 - (actx.outputLatency || actx.baseLatency || 0); }
  /* Round trip calibration. A phone hears its own tick some time after it was meant to play: the speaker's
     delay plus the microphone's. Half of that is taken off when playing, so ticks leave on time, and half is
     added when listening, so each slot's window sits where that slot's sound lands. */
  let R = null; const selfR = [], shiftAt = new Map();
  function half() { return R === null ? 0 : R / 2; }

  /* ---------- sound out ---------- */
  function tickBuf(id) {
    if (tickBufs[id] && tickBufs[id].sampleRate === actx.sampleRate) return tickBufs[id];
    const t = V.tick(id, actx.sampleRate), b = actx.createBuffer(1, t.length, actx.sampleRate); b.copyToChannel(t, 0);
    return (tickBufs[id] = b);
  }
  function note(f, t0, len, vol) {
    const os = actx.createOscillator(), g = actx.createGain(); os.type = "triangle"; os.frequency.value = f;
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + 0.015); g.gain.exponentialRampToValueAtTime(0.0005, t0 + len);
    os.connect(g); g.connect(bus); os.start(t0); os.stop(t0 + len + 0.02);
  }
  function kick(t0, vol, f) {
    const os = actx.createOscillator(), g = actx.createGain(); os.type = "sine";
    os.frequency.setValueAtTime(f * 2.4, t0); os.frequency.exponentialRampToValueAtTime(f, t0 + 0.09);
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0005, t0 + 0.32);
    os.connect(g); g.connect(bus); os.start(t0); os.stop(t0 + 0.35);
  }
  function motif(c) {
    shiftAt.set(c, half());
    const t0 = at(slotStart(c, me.slot)) - half() / 1000; if (t0 < actx.currentTime + 0.02) return;
    const s = actx.createBufferSource(), g = actx.createGain(); g.gain.value = 0.95; s.buffer = tickBuf(me.id); s.connect(g); g.connect(bus); s.start(t0);
    /* the owo: soft while calling, fuller once infected */
    const n = V.notes(me.slot, me.strain < 0 ? 0 : me.strain + 1), v = me.strain < 0 ? 0.12 : 0.22;
    note(n[0], t0 + 0.02, 0.11, v); note(n[1], t0 + 0.14, 0.18, v);
  }
  function groove(c) {
    if (!me || me.strain < 0) return;
    const G = GROOVES[me.strain % GROOVES.length], fall = Math.max(0.15, 1 - me.hops * 0.12);
    for (let b = 0; b < 8; b++) {
      const t = o.cue().at + c * V.CYCLE_MS + b * BEAT_MS, t0 = at(t); if (t0 < actx.currentTime + 0.02) continue;
      if (G.kick[b]) kick(t0, 0.55 * fall, 48);
      /* the bass only near the seed, so the bubble swells toward its middle */
      if (b % 2 === 0 && me.hops <= 3) note(G.bass[b / 2], t0, 0.4, 0.18 * fall);
    }
  }

  /* ---------- listening ---------- */
  async function listen() {
    stream = o.mic ? await o.mic() : await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    r = Math.max(1, Math.floor(actx.sampleRate / 22050)); rate = actx.sampleRate / r;
    ring = new Float32Array(Math.round(rate * 2.5)); bankF = V.bank(rate, Math.round(rate * 0.135)); wideF = V.bank(rate, Math.round(rate * 0.8));
    const url = URL.createObjectURL(new Blob([WORKLET], { type: "application/javascript" }));
    await actx.audioWorklet.addModule(url);
    src = actx.createMediaStreamSource(stream); node = new AudioWorkletNode(actx, "rr-virus"); mute = actx.createGain(); mute.gain.value = 0;
    src.connect(node); node.connect(mute); mute.connect(actx.destination);
    node.port.onmessage = e => {
      if (stopped) return;
      const d = e.data.d;
      for (let i = 0; i < d.length; i++) { acc += d[i]; if (++accN === r) { ring[written % ring.length] = acc / r; written++; acc = 0; accN = 0; } }
      anchorN = written; anchorT = o.now() + (e.data.f / actx.sampleRate - actx.currentTime) * 1000 - (actx.baseLatency || 0) * 1000;
      tick();
    };
  }
  /* the sample index on this phone's own recording at a server time */
  function idxAt(t) { return anchorN - (anchorT - t) / 1000 * rate; }
  function work() {
    const cue = o.cue(); if (!cue || cue.type !== "virus" || !me || !rate) return;
    const now = anchorT, c = cycleOf(now - 200);
    if (c < 0) return;
    /* start from the cycle that is running when listening begins */
    if (!started) { started = true; doneSlot = c * V.SLOTS - 1; }
    /* each slot window once its sound has had time to cross the floor */
    for (;;) {
      const nextSlot = doneSlot + 1, cc = Math.floor(nextSlot / V.SLOTS), s = nextSlot % V.SLOTS;
      /* its own slot gets a wide window, since its own tick is the loudest thing it hears and sets the calibration */
      const mine = s === me.slot && plays(cc) && shiftAt.has(cc);
      const t0 = mine ? slotStart(cc, s) - 250 - shiftAt.get(cc) : slotStart(cc, s) - 15 + half(), span = mine ? 800 : 135, t1 = t0 + span;
      if (idxAt(t1) > written) break;
      doneSlot = nextSlot;
      if (cc !== curCycle) { flush(); curCycle = cc; report = { c: cc, own: null, h: [] }; }
      const i0 = Math.round(idxAt(t0)), len = Math.round(span / 1000 * rate);
      if (mine) {
        if (i0 < written - ring.length || i0 < 0) continue;
        const win = new Float32Array(len); for (let k = 0; k < len; k++) win[k] = ring[(i0 + k) % ring.length];
        const own = wideF.find(win, 7).filter(h => h.id === me.id).sort((a, b) => b.snr - a.snr)[0];
        if (own) {
          report.own = (i0 + own.at) / rate;
          const late = (t0 + own.at / rate * 1000) - (slotStart(cc, s) - shiftAt.get(cc));
          selfR.push(late); if (selfR.length > 7) selfR.shift();
          const sr = selfR.slice().sort((a, b) => a - b); R = sr[sr.length >> 1];
        }
        continue;
      }
      if (i0 < written - ring.length || i0 < 0) continue;
      const win = new Float32Array(len); for (let k = 0; k < len; k++) win[k] = ring[(i0 + k) % ring.length];
      const hits = bankF.find(win, 7);
      hits.forEach(h => {
        const local = (i0 + h.at) / rate;
        if (s === me.slot && h.id === me.id) return;
        report.h.push([s, h.id, Math.round(local * 1e6) / 1e6, Math.round(h.snr * 10) / 10]);
      });
    }
  }
  function flush() {
    if (!report) return;
    report.h.sort((a, b) => b[3] - a[3]);
    o.send({ type: "stadium-vx", c: report.c, own: report.own === null ? null : Math.round(report.own * 1e6) / 1e6, h: report.h.slice(0, 24) });
    report = null;
  }
  /* schedules the next cycle's motif and groove a little ahead */
  function tick() {
    const cue = o.cue(); if (!cue || cue.type !== "virus" || !me) return;
    const c = cycleOf(o.now() + 600);
    if (c >= 0 && c > scheduled) { scheduled = c; if (plays(c)) motif(c); }
    if (c >= 0 && c > groovedTo) { groovedTo = c; groove(c); }
    work();
  }
  const timer = setInterval(() => { if (!rate) tick(); }, 250);
  listen().catch(() => { if (o.onError) o.onError("the microphone did not open"); });
  return {
    you: function(m) { me = Object.assign(me || {}, m); },
    get me() { return me; },
    get latency() { return R; },
    stop: function() {
      stopped = true; clearInterval(timer);
      try { node && node.disconnect(); src && src.disconnect(); stream && stream.getTracks().forEach(t => t.stop()); bus.disconnect(); } catch (e) {}
    }
  };
}
const COLORS = [[47, 111, 214], [226, 54, 160], [120, 210, 40], [255, 140, 20], [20, 200, 220], [240, 60, 60], [250, 210, 30], [150, 80, 230]];
window.STADIUM_VIRUS = { create: create, COLORS: COLORS, BEAT_MS: BEAT_MS };
})();
