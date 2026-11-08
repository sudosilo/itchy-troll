/* rainbow-run-stadium-v1-virus-core.js
   BLUE PHONE: virus mode sound core, shared by the phones and the tests.

   Every phone owns a slot in a repeating cycle of the shared clock, and in its slot it plays a short motif:
   a crisp tick, which is the measuring signal, then the soft owo of two low notes, which is the music.
   The tick is a quick swept shaker hit in one of four high bands, sweeping up or down, so it carries one of
   eight identities. A swept hit has a hard, wide edge, so a listening phone can pin its arrival to a small
   fraction of a millisecond even through a cheap speaker, and different identities barely look alike.

   Distance needs no shared clock. Each phone hears its own tick and its neighbor's tick on its own audio clock.
   With A hearing itself at aa and B at ab, and B hearing itself at bb and A at ba, the distance is
   half the speed of sound times ((ab minus aa) minus (bb minus ba)). That is the BeepBeep method. */
(function(root){
"use strict";
const CYCLE_MS = 4000, SLOTS = 32, SLOT_MS = CYCLE_MS / SLOTS, IDS = 8, SOUND = 343;
const TICK_S = 0.010, BANDS = [[2000, 3500], [3500, 5000], [5000, 6500], [6500, 8000]];
/* the owo: two notes of a pentatonic scale, chosen by slot, so any crowd of calls is a melody */
const SCALE = [220, 246.94, 277.18, 329.63, 369.99, 440, 493.88, 554.37, 659.25, 739.99];

function ident(id) { return { band: (id >> 1) % BANDS.length, down: !!(id & 1) }; }

/* the measuring tick for one identity, as samples at a rate; analytic gives the matching complex template */
function tick(id, rate, analytic) {
  const I = ident(id), n = Math.round(TICK_S * rate), f0 = BANDS[I.band][I.down ? 1 : 0], f1 = BANDS[I.band][I.down ? 0 : 1], k = (f1 - f0) / TICK_S;
  const re = new Float32Array(n), im = analytic ? new Float32Array(n) : null;
  for (let i = 0; i < n; i++) {
    const t = i / rate, w = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (n - 1)), ph = 2 * Math.PI * (f0 * t + k * t * t / 2);
    re[i] = w * Math.cos(ph); if (im) im[i] = w * Math.sin(ph);
  }
  return analytic ? { re: re, im: im } : re;
}
function notes(slot, strain) {
  const a = (slot * 3 + (strain || 0) * 2) % (SCALE.length - 2);
  return [SCALE[a + 2], SCALE[a]];
}

function fft(re, im, inv) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) { let b = n >> 1; for (; j & b; b >>= 1) j ^= b; j ^= b; if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; } }
  for (let len = 2; len <= n; len <<= 1) {
    const a = 2 * Math.PI / len * (inv ? 1 : -1), wr = Math.cos(a), wi = Math.sin(a), h = len >> 1;
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let j = 0; j < h; j++) {
        const p = i + j, q = p + h, xr = re[q] * cr - im[q] * ci, xi = re[q] * ci + im[q] * cr;
        re[q] = re[p] - xr; im[q] = im[p] - xi; re[p] += xr; im[p] += xi;
        const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr;
      }
    }
  }
  if (inv) for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
}

/* A matched filter bank for one sample rate. find(samples) looks through a stretch of sound for every tick
   identity and returns [{id, at, snr}], with at in samples from the start of the stretch, to a fraction of
   a sample, at the front edge of the strongest arrival, which is the straight path rather than an echo. */
function bank(rate, len) {
  let n = 1; while (n < len + Math.round(TICK_S * rate) + 8) n <<= 1;
  const T = [];
  for (let id = 0; id < IDS; id++) {
    const t = tick(id, rate, true), r = new Float32Array(n), i = new Float32Array(n);
    r.set(t.re); i.set(t.im); fft(r, i, false);
    T.push({ re: r, im: i });
  }
  const xr = new Float32Array(n), xi = new Float32Array(n), yr = new Float32Array(n), yi = new Float32Array(n), env = new Float32Array(n);
  return {
    n: n,
    find: function(s, minSnr) {
      minSnr = minSnr || 7;
      xr.fill(0); xi.fill(0); xr.set(s.subarray(0, Math.min(s.length, n)));
      fft(xr, xi, false);
      const span = Math.min(s.length, n) - Math.round(TICK_S * rate), out = [];
      for (let id = 0; id < IDS; id++) {
        const t = T[id];
        /* times the conjugate of the template, which slides the template along the sound */
        for (let k = 0; k < n; k++) { yr[k] = xr[k] * t.re[k] + xi[k] * t.im[k]; yi[k] = xi[k] * t.re[k] - xr[k] * t.im[k]; }
        fft(yr, yi, true);
        let best = 0, at = -1, sum = 0;
        for (let k = 0; k < span; k++) { const e = Math.sqrt(yr[k] * yr[k] + yi[k] * yi[k]); env[k] = e; sum += e; if (e > best) { best = e; at = k; } }
        if (at < 0) continue;
        const floor = sum / span || 1e-9;
        const snr = best / floor;
        if (snr < minSnr) continue;
        /* the straight path arrives first: the earliest point within a few milliseconds before the peak that
           already reaches most of its height */
        let first = at; const look = Math.round(0.004 * rate);
        for (let k = Math.max(0, at - look); k < at; k++) if (env[k] > best * 0.7) { first = k; break; }
        let pk = first; while (pk + 1 < span && env[pk + 1] > env[pk]) pk++;
        const a = env[pk - 1] || env[pk], b = env[pk], c = env[pk + 1] || env[pk], den = a - 2 * b + c;
        const frac = den < 0 ? 0.5 * (a - c) / den : 0;
        out.push({ id: id, at: pk + Math.max(-0.5, Math.min(0.5, frac)), snr: snr });
      }
      return out;
    }
  };
}

/* distance in meters from the four hearing times, each pair on its own phone's clock, in seconds */
/* a phone hears its own tick from its own speaker a hand's width away, which the raw sum takes off once */
const SELF_M = 0.08;
function distance(aa, ab, bb, ba) { return SOUND / 2 * ((ab - aa) - (bb - ba)) + SELF_M; }

const api = { CYCLE_MS: CYCLE_MS, SLOTS: SLOTS, SLOT_MS: SLOT_MS, IDS: IDS, SOUND: SOUND, TICK_S: TICK_S, BANDS: BANDS, SCALE: SCALE,
  tick: tick, notes: notes, bank: bank, distance: distance, fft: fft, ident: ident };
if (typeof module !== "undefined" && module.exports) module.exports = api; else root.STADIUM_VX = api;
})(typeof window !== "undefined" ? window : this);
