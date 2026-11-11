// Small synthesized sound set. No audio files. Everything is safe to call
// before the audio context exists or when sound is off.
export function createAudio() {
  let ctx = null;
  let master = null;
  let motorGain = null, motorOsc = null, motorFilter = null;
  let windGain = null;
  let enabled = true;

  function noiseBuffer(seconds) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }
  let noise = null;

  function start() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = enabled ? 0.8 : 0;
      master.connect(ctx.destination);
      noise = noiseBuffer(2);

      motorOsc = ctx.createOscillator();
      motorOsc.type = 'sawtooth';
      motorOsc.frequency.value = 52;
      motorFilter = ctx.createBiquadFilter();
      motorFilter.type = 'lowpass';
      motorFilter.frequency.value = 260;
      motorGain = ctx.createGain();
      motorGain.gain.value = 0;
      motorOsc.connect(motorFilter).connect(motorGain).connect(master);
      motorOsc.start();

      const ws = ctx.createBufferSource();
      ws.buffer = noise;
      ws.loop = true;
      const wf = ctx.createBiquadFilter();
      wf.type = 'bandpass';
      wf.frequency.value = 420;
      wf.Q.value = 0.6;
      windGain = ctx.createGain();
      windGain.gain.value = 0;
      ws.connect(wf).connect(windGain).connect(master);
      ws.start();
    } catch (e) {
      ctx = null;
    }
  }

  function tone(freq, dur, type, vol, slideTo, delay) {
    if (!ctx || !enabled) return;
    const t = ctx.currentTime + (delay || 0);
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.2, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  function burst(dur, filterType, freq, vol, delay) {
    if (!ctx || !enabled) return;
    const t = ctx.currentTime + (delay || 0);
    const s = ctx.createBufferSource();
    s.buffer = noise;
    const f = ctx.createBiquadFilter();
    f.type = filterType;
    f.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(master);
    s.start(t, Math.random());
    s.stop(t + dur + 0.05);
  }

  return {
    start,
    setEnabled(on) {
      enabled = !!on;
      if (master && ctx) master.gain.setTargetAtTime(enabled ? 0.8 : 0, ctx.currentTime, 0.05);
    },
    isEnabled() { return enabled; },
    // called about ten times a second with the machine and wind state
    ambient(moving, windMph, paused) {
      if (!ctx) return;
      const m = paused ? 0 : Math.min(1, moving);
      motorGain.gain.setTargetAtTime(m * 0.09, ctx.currentTime, 0.08);
      motorOsc.frequency.setTargetAtTime(48 + m * 26, ctx.currentTime, 0.1);
      windGain.gain.setTargetAtTime(paused ? 0 : Math.min(0.14, windMph * 0.006), ctx.currentTime, 0.3);
    },
    quiet() {
      if (!ctx) return;
      motorGain.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
      windGain.gain.setTargetAtTime(0, ctx.currentTime, 0.2);
    },
    grab() { tone(170, 0.09, 'square', 0.16); burst(0.06, 'highpass', 1800, 0.18); },
    drop() { tone(240, 0.07, 'square', 0.1, 120); },
    nograb() { tone(110, 0.08, 'square', 0.06); },
    land(impact) {
      const v = Math.min(0.5, 0.08 + impact * 0.03);
      burst(0.16, 'lowpass', 220, v);
      tone(70, 0.14, 'sine', v, 40);
    },
    bump() { burst(0.08, 'lowpass', 500, 0.2); },
    smash() { burst(0.35, 'bandpass', 900, 0.5); tone(160, 0.3, 'sawtooth', 0.18, 40); },
    perfect(combo) {
      const base = 660 * Math.pow(1.06, Math.min(8, combo));
      tone(base, 0.12, 'triangle', 0.22);
      tone(base * 1.5, 0.22, 'triangle', 0.22, null, 0.09);
    },
    great() { tone(587, 0.16, 'triangle', 0.2); },
    ok() { tone(440, 0.12, 'triangle', 0.14); },
    miss() { tone(196, 0.22, 'sawtooth', 0.12, 110); },
    collapse() { burst(0.5, 'lowpass', 300, 0.45); tone(130, 0.4, 'sawtooth', 0.14, 50); },
    spawn() { tone(520, 0.06, 'sine', 0.07); },
    count() { tone(440, 0.12, 'square', 0.12); },
    go() { tone(880, 0.3, 'square', 0.14); },
    tick() { tone(1000, 0.05, 'square', 0.1); },
    buzzer() { tone(196, 0.7, 'sawtooth', 0.22); tone(147, 0.7, 'sawtooth', 0.18); },
    fanfare() {
      tone(523, 0.14, 'triangle', 0.2);
      tone(659, 0.14, 'triangle', 0.2, null, 0.13);
      tone(784, 0.3, 'triangle', 0.22, null, 0.26);
    }
  };
}
