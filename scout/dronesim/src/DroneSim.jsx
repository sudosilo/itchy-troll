// Formation generators. Each returns an array of {x, y, color?} in [-1, 1] space.
// Optional `behavior` key on the shape descriptor tells the renderer how to animate.

function packToN(points, N) {
  if (points.length === N) return points;
  if (points.length > N) return points.slice(0, N);
  const out = points.slice();
  let i = 0;
  while (out.length < N) {
    out.push({ ...points[i % points.length] });
    i++;
  }
  return out;
}

function shapeCircle(N) {
  const pts = [];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    pts.push({ x: Math.cos(a) * 0.7, y: Math.sin(a) * 0.7, _angle: a });
  }
  return pts;
}

function shapeHeart(N) {
  const pts = [];
  for (let i = 0; i < N; i++) {
    const t = (i / N) * Math.PI * 2;
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    pts.push({ x: x / 18, y: y / 18 });
  }
  return pts;
}

function shapeStar(N) {
  const pts = [];
  const spikes = 5;
  const outer = 0.8, inner = 0.35;
  const total = spikes * 2;
  for (let i = 0; i < N; i++) {
    const t = i / N;
    const idx = t * total;
    const seg = Math.floor(idx);
    const frac = idx - seg;
    const r0 = seg % 2 === 0 ? outer : inner;
    const r1 = (seg + 1) % 2 === 0 ? outer : inner;
    const a0 = (seg / total) * Math.PI * 2 - Math.PI / 2;
    const a1 = ((seg + 1) / total) * Math.PI * 2 - Math.PI / 2;
    const r = r0 + (r1 - r0) * frac;
    const a = a0 + (a1 - a0) * frac;
    pts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
  }
  return pts;
}

function shapeSquare(N) {
  const side = Math.ceil(Math.sqrt(N));
  const pts = [];
  for (let i = 0; i < side; i++) {
    for (let j = 0; j < side; j++) {
      if (pts.length >= N) break;
      pts.push({
        x: (j / (side - 1) - 0.5) * 1.4,
        y: (i / (side - 1) - 0.5) * 1.4
      });
    }
  }
  return packToN(pts, N);
}

function shapeSpiral(N) {
  const pts = [];
  const turns = 3;
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    const a = t * turns * Math.PI * 2;
    const r = t * 0.85;
    pts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r, _t: t });
  }
  return pts;
}

function shapeArrow(N) {
  const pts = [];
  for (let i = 0; i < N; i++) {
    const t = i / N;
    let x, y;
    if (t < 0.5) {
      const s = t * 2;
      x = (s - 0.5) * 0.8;
      y = -0.8 + s * 0.8;
    } else {
      const s = (t - 0.5) * 2;
      x = (s - 0.5) * 0.25;
      y = s * 0.8;
    }
    pts.push({ x, y });
  }
  return pts;
}

function shapeRing(N) {
  const pts = [];
  const half = Math.floor(N / 2);
  for (let i = 0; i < half; i++) {
    const a = (i / half) * Math.PI * 2;
    pts.push({ x: Math.cos(a) * 0.85, y: Math.sin(a) * 0.85, _angle: a, _ring: 0 });
  }
  for (let i = 0; i < N - half; i++) {
    const a = (i / (N - half)) * Math.PI * 2;
    pts.push({ x: Math.cos(a) * 0.45, y: Math.sin(a) * 0.45, _angle: a, _ring: 1 });
  }
  return pts;
}

function shapeGrid(N) {
  return shapeSquare(N);
}

function shapeWave(N) {
  const pts = [];
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    const x = (t - 0.5) * 1.8;
    const y = Math.sin(t * Math.PI * 4) * 0.4;
    pts.push({ x, y, _t: t });
  }
  return pts;
}

function shapeSmile(N) {
  const pts = [];
  const eyeCount = Math.floor(N * 0.2);
  for (let i = 0; i < Math.floor(eyeCount / 2); i++) {
    const a = (i / Math.floor(eyeCount / 2)) * Math.PI * 2;
    pts.push({ x: -0.35 + Math.cos(a) * 0.08, y: -0.3 + Math.sin(a) * 0.08 });
  }
  for (let i = 0; i < Math.floor(eyeCount / 2); i++) {
    const a = (i / Math.floor(eyeCount / 2)) * Math.PI * 2;
    pts.push({ x: 0.35 + Math.cos(a) * 0.08, y: -0.3 + Math.sin(a) * 0.08 });
  }
  const remain = N - pts.length;
  for (let i = 0; i < remain; i++) {
    const t = i / (remain - 1);
    const a = Math.PI * 0.2 + t * Math.PI * 0.6;
    pts.push({ x: Math.cos(a) * 0.55, y: Math.sin(a) * 0.55 + 0.05 });
  }
  return packToN(pts, N);
}

// SHAPES include a behavior id — renderer looks it up to animate.
const SHAPES = [
  { id: 'circle',  name: 'CIRCLE',  fn: shapeCircle,  behavior: 'rotate'  },
  { id: 'heart',   name: 'HEART',   fn: shapeHeart,   behavior: 'beat'    },
  { id: 'star',    name: 'STAR',    fn: shapeStar,    behavior: 'twinkle' },
  { id: 'square',  name: 'SQUARE',  fn: shapeSquare,  behavior: 'shimmer' },
  { id: 'spiral',  name: 'SPIRAL',  fn: shapeSpiral,  behavior: 'spin'    },
  { id: 'arrow',   name: 'ARROW',   fn: shapeArrow,   behavior: 'pulse'   },
  { id: 'ring',    name: 'RING-2',  fn: shapeRing,    behavior: 'rings'   },
  { id: 'grid',    name: 'GRID',    fn: shapeGrid,    behavior: 'shimmer' },
  { id: 'wave',    name: 'WAVE',    fn: shapeWave,    behavior: 'wave'    },
  { id: 'smile',   name: 'SMILE',   fn: shapeSmile,   behavior: 'pulse'   },
];

// Color image reproduction — each drone gets the source pixel color.
async function shapeFromImage(file, N) {
  const url = URL.createObjectURL(file);
  const img = new Image();
  await new Promise((res, rej) => {
    img.onload = res;
    img.onerror = rej;
    img.src = url;
  });
  const SIZE = N >= 500 ? 96 : 64;
  const c = document.createElement('canvas');
  c.width = SIZE; c.height = SIZE;
  const ctx = c.getContext('2d');
  const scale = Math.min(SIZE / img.width, SIZE / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.drawImage(img, (SIZE - w) / 2, (SIZE - h) / 2, w, h);
  const data = ctx.getImageData(0, 0, SIZE, SIZE).data;

  const candidates = [];
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const i = (y * SIZE + x) * 4;
      const r = data[i], g = data[i+1], b = data[i+2], a = data[i+3];
      if (a < 32) continue;
      const distFromWhite = Math.max(255 - r, 255 - g, 255 - b);
      if (distFromWhite < 40) continue;
      candidates.push({
        x: (x / SIZE - 0.5) * 2,
        y: (y / SIZE - 0.5) * 2,
        color: `rgb(${r},${g},${b})`,
      });
    }
  }
  URL.revokeObjectURL(url);
  if (candidates.length === 0) return shapeCircle(N).map(p => ({ ...p, color: '#ff5a1f' }));

  shuffleInPlace(candidates);
  const pts = [];
  for (let i = 0; i < N; i++) {
    const idx = Math.floor((i / N) * candidates.length);
    pts.push(candidates[idx]);
  }
  return pts;
}

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

import { useState, useRef, useEffect, useMemo } from 'react';

const DEFAULT_DURATION = 60;
const PIXEL_SIZE = 4;
const COLORS = ['#ff5a1f', '#ffb020', '#ffd60a', '#f72585', '#7209b7', '#4361ee', '#06d6a0', '#ef476f'];
const COUNT_OPTIONS = [100, 250, 500, 1000];

function uid() { return Math.random().toString(36).slice(2, 9); }

function assignTargets(current, targets) {
  const N = Math.min(current.length, targets.length);
  const used = new Array(targets.length).fill(false);
  const order = Array.from({ length: N }, (_, i) => i).sort(() => Math.random() - 0.5);
  const out = new Array(N);
  for (const i of order) {
    let best = -1, bestD = Infinity;
    for (let j = 0; j < targets.length; j++) {
      if (used[j]) continue;
      const dx = current[i].x - targets[j].x;
      const dy = current[i].y - targets[j].y;
      const d = dx*dx + dy*dy;
      if (d < bestD) { bestD = d; best = j; }
    }
    out[i] = targets[best];
    used[best] = true;
  }
  return out;
}

function lerpColor(a, b, t) {
  const ah = parseInt(a.slice(1), 16);
  const bh = parseInt(b.slice(1), 16);
  const ar = (ah >> 16) & 0xff, ag = (ah >> 8) & 0xff, ab = ah & 0xff;
  const br = (bh >> 16) & 0xff, bg = (bh >> 8) & 0xff, bb = bh & 0xff;
  return `rgb(${Math.round(ar+(br-ar)*t)},${Math.round(ag+(bg-ag)*t)},${Math.round(ab+(bb-ab)*t)})`;
}

function fmt(t) {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function makeClip(shapeId, start, duration, N) {
  const shape = SHAPES.find(s => s.id === shapeId);
  return {
    id: uid(),
    shapeId,
    name: shape ? shape.name : 'CUSTOM',
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    behavior: shape ? shape.behavior : 'none',
    colorEffect: 'none',
    start, duration,
    points: shape ? shape.fn(N) : shapeCircle(N),
    useImageColors: false,
  };
}

// Color effects — applied to the drone's base color each frame.
// Returns { color, alpha } where alpha is multiplied with behavior opacity.
const COLOR_EFFECTS = [
  { id: 'none',    name: 'NONE'    },
  { id: 'strobe',  name: 'STROBE'  },
  { id: 'wave',    name: 'WAVE'    },
  { id: 'sparkle', name: 'SPARKLE' },
  { id: 'whip',    name: 'WHIP'    },
  { id: 'rainbow', name: 'RAINBOW' },
];

// Cheap deterministic pseudo-random for per-drone seeds
function hash01(i) {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

// Parse a color (#rrggbb or rgb(r,g,b)) into [r,g,b]
function parseColor(c) {
  if (!c) return [255, 90, 31];
  if (c[0] === '#') {
    const h = parseInt(c.slice(1), 16);
    return [(h >> 16) & 0xff, (h >> 8) & 0xff, h & 0xff];
  }
  const m = c.match(/(\d+),\s*(\d+),\s*(\d+)/);
  if (m) return [+m[1], +m[2], +m[3]];
  return [255, 90, 31];
}

// HSL → RGB for rainbow/wave (returns "rgb(...)" string)
function hslStr(h, s, l) {
  h = ((h % 1) + 1) % 1;
  s = Math.max(0, Math.min(1, s));
  l = Math.max(0, Math.min(1, l));
  const f = (n) => {
    const k = (n + h * 12) % 12;
    const a = s * Math.min(l, 1 - l);
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return `rgb(${Math.round(f(0)*255)},${Math.round(f(8)*255)},${Math.round(f(4)*255)})`;
}

// Per-drone color effect. p has _t / _angle when relevant.
// Returns { color, alphaMul }.
function applyColorEffect(baseColor, p, idx, total, t, effect) {
  switch (effect) {
    case 'strobe': {
      // ~6 Hz square wave on/off
      const on = Math.sin(t * Math.PI * 12) > 0;
      return { color: baseColor, alphaMul: on ? 1 : 0.05 };
    }
    case 'wave': {
      // Brightness sweeps left-to-right; period ~2s
      const xNorm = (p.x + 1) / 2;
      const phase = t * 0.7 - xNorm;
      const v = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(phase * Math.PI * 2));
      const [r, g, b] = parseColor(baseColor);
      return { color: `rgb(${Math.round(r*v)},${Math.round(g*v)},${Math.round(b*v)})`, alphaMul: 1 };
    }
    case 'sparkle': {
      // Each drone has its own random sparkle moment
      const seed = hash01(idx);
      const phase = (t * 0.6 + seed * 10) % 1;
      // 8% of the time, flash white
      if (phase < 0.08) {
        const intensity = 1 - phase / 0.08;
        return { color: '#ffffff', alphaMul: 0.6 + intensity * 0.4 };
      }
      return { color: baseColor, alphaMul: 1 };
    }
    case 'whip': {
      // Color chases around the formation by index — bright leading edge, dim tail
      const head = (t * 1.5) % 1; // 0..1
      const dronePos = idx / total;
      let dist = dronePos - head;
      if (dist < 0) dist += 1;
      // dist=0 → bright, dist→1 dim. Tail length ~0.15
      const tail = 0.15;
      if (dist < tail) {
        const k = 1 - dist / tail;
        return { color: '#ffffff', alphaMul: 0.4 + k * 0.6 };
      }
      return { color: baseColor, alphaMul: 0.25 };
    }
    case 'rainbow': {
      // All drones cycle the spectrum together
      const hue = (t * 0.15) % 1;
      return { color: hslStr(hue, 0.85, 0.55), alphaMul: 1 };
    }
    default:
      return { color: baseColor, alphaMul: 1 };
  }
}

// Per-frame behavior — applied as offset to base target (px, py in canvas coords)
function applyBehavior(p, idx, total, t, behavior, scale) {
  let ox = 0, oy = 0, sx = 1, sy = 1, op = 1;
  switch (behavior) {
    case 'rotate': {
      // rotate the whole circle slowly
      const a = (p._angle ?? (idx / total * Math.PI * 2)) + t * 0.6;
      ox = (Math.cos(a) - Math.cos(p._angle ?? 0)) * 0.7 * scale;
      oy = (Math.sin(a) - Math.sin(p._angle ?? 0)) * 0.7 * scale;
      break;
    }
    case 'beat': {
      // heart pulse at ~1.2 Hz
      const pulse = 1 + Math.sin(t * 7.5) * 0.08;
      sx = sy = pulse;
      break;
    }
    case 'twinkle': {
      // per-drone phase opacity sparkle
      op = 0.5 + 0.5 * Math.abs(Math.sin(t * 4 + idx * 0.7));
      break;
    }
    case 'shimmer': {
      // tiny per-drone position jitter, looks like hovering
      ox = Math.sin(t * 3 + idx * 1.7) * 0.01 * scale;
      oy = Math.cos(t * 2.5 + idx * 2.3) * 0.01 * scale;
      break;
    }
    case 'spin': {
      // spiral rotates around center
      const cur_a = Math.atan2(p.y, p.x);
      const r = Math.sqrt(p.x * p.x + p.y * p.y);
      const a2 = cur_a + t * 1.2;
      ox = (Math.cos(a2) * r - p.x) * scale;
      oy = (Math.sin(a2) * r - p.y) * scale;
      break;
    }
    case 'pulse': {
      // expand-contract from center
      const k = 1 + Math.sin(t * 2.5) * 0.12;
      sx = sy = k;
      break;
    }
    case 'rings': {
      // two rings counter-rotate
      const a = (p._angle ?? 0) + t * (p._ring === 0 ? 0.8 : -1.2);
      const r = p._ring === 0 ? 0.85 : 0.45;
      ox = (Math.cos(a) * r - p.x) * scale;
      oy = (Math.sin(a) * r - p.y) * scale;
      break;
    }
    case 'wave': {
      // wave undulates left-to-right
      const tt = p._t ?? (idx / total);
      const phase = tt * Math.PI * 4 + t * 3;
      oy = (Math.sin(phase) * 0.4 - p.y) * scale;
      break;
    }
    default: break;
  }
  return { ox, oy, sx, sy, op };
}

export default function App() {
  const [nDrones, setNDrones] = useState(100);
  const [clips, setClips] = useState(() => [
    makeClip('circle', 0, 8, 100),
    makeClip('star', 8, 8, 100),
    makeClip('heart', 16, 10, 100),
    makeClip('spiral', 26, 8, 100),
    makeClip('wave', 34, 6, 100),
  ]);
  const [duration, setDuration] = useState(DEFAULT_DURATION);
  const [playhead, setPlayhead] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [selectedClipId, setSelectedClipId] = useState(null);
  const [audioFile, setAudioFile] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [view, setView] = useState('sky');
  const [fps, setFps] = useState(60);

  const audioRef = useRef(null);
  const canvasRef = useRef(null);
  const dronesRef = useRef(null);
  const rafRef = useRef(null);
  const lastTimeRef = useRef(0);
  const lastClipIdRef = useRef(null);
  const playheadRef = useRef(0);
  const playingRef = useRef(false);
  const durationRef = useRef(DEFAULT_DURATION);
  const activeClipRef = useRef(null);
  const fpsCounter = useRef({ frames: 0, last: 0 });

  useEffect(() => { playheadRef.current = playhead; }, [playhead]);
  useEffect(() => { playingRef.current = playing; }, [playing]);
  useEffect(() => { durationRef.current = duration; }, [duration]);

  // Initialize / resize drone array when count changes
  useEffect(() => {
    const prev = dronesRef.current || [];
    const next = Array.from({ length: nDrones }, (_, i) => {
      if (prev[i]) return prev[i];
      return {
        x: (Math.random() - 0.5) * 1.8,
        y: 0.9 + Math.random() * 0.1,
        tx: (Math.random() - 0.5) * 1.8,
        ty: 0.9,
        jitter: Math.random() * Math.PI * 2,
        color: COLORS[i % COLORS.length],
        tcolor: COLORS[i % COLORS.length],
      };
    });
    dronesRef.current = next;
    // Rebuild clip points to match new drone count
    setClips(prev => prev.map(c => {
      if (c.shapeId.startsWith('image:')) return c; // keep image points (will mismatch — user can re-upload)
      const shape = SHAPES.find(s => s.id === c.shapeId);
      return shape ? { ...c, points: shape.fn(nDrones) } : c;
    }));
    lastClipIdRef.current = null;
  }, [nDrones]);

  const activeClip = useMemo(
    () => clips.find(c => playhead >= c.start && playhead < c.start + c.duration) || null,
    [clips, playhead]
  );
  useEffect(() => { activeClipRef.current = activeClip; }, [activeClip]);

  useEffect(() => {
    if (!activeClip) {
      lastClipIdRef.current = null;
      return;
    }
    if (lastClipIdRef.current !== activeClip.id) {
      const drones = dronesRef.current;
      const N = drones.length;
      // Pad clip points if drone count > clip points (shouldn't happen, but safe)
      let pts = activeClip.points;
      if (pts.length < N) {
        const padded = [];
        for (let i = 0; i < N; i++) padded.push({ ...pts[i % pts.length] });
        pts = padded;
      }
      const assigned = assignTargets(drones, pts);
      for (let i = 0; i < N; i++) {
        drones[i].tx = assigned[i].x;
        drones[i].ty = assigned[i].y;
        // Color: image clip → use the point's own color. Shape clip → clip color.
        if (activeClip.useImageColors && assigned[i].color) {
          drones[i].tcolor = assigned[i].color;
        } else {
          drones[i].tcolor = activeClip.color;
        }
      }
      lastClipIdRef.current = activeClip.id;
    }
  }, [activeClip]);

  useEffect(() => {
    function tick(t) {
      if (!lastTimeRef.current) lastTimeRef.current = t;
      const dt = Math.min((t - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = t;

      // FPS readout
      fpsCounter.current.frames++;
      if (t - fpsCounter.current.last >= 1000) {
        setFps(fpsCounter.current.frames);
        fpsCounter.current.frames = 0;
        fpsCounter.current.last = t;
      }

      if (playingRef.current) {
        const newPh = playheadRef.current + dt;
        if (newPh >= durationRef.current) {
          setPlayhead(0);
          setPlaying(false);
          if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
        } else {
          setPlayhead(newPh);
        }
      }

      const drones = dronesRef.current;
      const factor = 1 - Math.exp(-3.0 * dt);
      for (let i = 0; i < drones.length; i++) {
        const d = drones[i];
        d.x += (d.tx - d.x) * factor;
        d.y += (d.ty - d.y) * factor;
        d.jitter += dt * 2;
        // ease color too (cheap — just snap, since assigning per-frame would cost)
        d.color = d.tcolor;
      }

      drawSky(t / 1000);
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  function drawSky(tSec) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const ph = playheadRef.current;
    const dur = durationRef.current;
    const dusk = Math.min(1, ph / dur);

    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, lerpColor('#cfe3f2', '#2a3a5e', dusk * 0.7));
    grad.addColorStop(0.6, lerpColor('#e8d8c0', '#5a3a5a', dusk * 0.7));
    grad.addColorStop(1, lerpColor('#f0e3c8', '#2a1a3a', dusk * 0.7));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = lerpColor('#0e1a24', '#000000', dusk * 0.5);
    ctx.fillRect(0, H * 0.92, W, H * 0.08);
    ctx.fillRect(W/2 - 4, H * 0.88, 8, H * 0.04);

    if (dusk > 0.3) {
      ctx.fillStyle = `rgba(255,255,255,${(dusk - 0.3) * 0.8})`;
      for (let i = 0; i < 40; i++) {
        const sx = (i * 137.5) % W;
        const sy = ((i * 79.3) % (H * 0.7));
        ctx.fillRect(Math.floor(sx), Math.floor(sy), 1, 1);
      }
    }

    const cx = W / 2;
    const skyTop = H * 0.05;
    const skyBot = H * 0.88;
    const skyW = W * 0.85;

    const drones = dronesRef.current;
    const clip = activeClipRef.current;
    const behavior = clip ? clip.behavior : 'none';
    const colorEffect = clip ? (clip.colorEffect || 'none') : 'none';
    const isMotionBehavior = behavior === 'rotate' || behavior === 'spin' || behavior === 'rings' || behavior === 'wave';
    const N = drones.length;

    // Drone size scales down a touch at high counts
    const ps = N >= 500 ? 3 : N >= 250 ? 3 : PIXEL_SIZE;
    const useGlow = N <= 250; // skip glow rect at high counts for FPS

    // Time-corrected follow factor for motion behaviors.
    // Use the dt from the update loop, exposed via lastTimeRef diff would be cleaner,
    // but we already cap dt at 0.05; use a stable per-frame factor based on 60fps reference.
    const dtNow = Math.min(0.05, (performance.now() - (drawSky._lastT || performance.now())) / 1000);
    drawSky._lastT = performance.now();
    const motionFollow = 1 - Math.exp(-9 * dtNow); // converges fast, framerate-independent

    for (let i = 0; i < N; i++) {
      const d = drones[i];
      const p = (clip && clip.points && clip.points[i]) || { x: d.tx, y: d.ty };
      const beh = applyBehavior(p, i, N, tSec, behavior, 1);

      let nx, ny;
      if (isMotionBehavior) {
        const liveTx = p.x + beh.ox;
        const liveTy = p.y + beh.oy;
        d.x += (liveTx - d.x) * motionFollow;
        d.y += (liveTy - d.y) * motionFollow;
        nx = d.x;
        ny = d.y;
      } else {
        nx = d.x;
        ny = d.y;
      }

      // Hover-jitter only when NOT in a motion behavior (otherwise it fights the motion)
      let jx = 0, jy = 0;
      if (!isMotionBehavior) {
        jx = Math.sin(d.jitter) * 0.0018;
        jy = Math.cos(d.jitter * 1.3) * 0.0018;
      }
      const sxv = (nx + jx) * beh.sx;
      const syv = (ny + jy) * beh.sy;

      const px = cx + sxv * (skyW / 2);
      const py = skyTop + ((syv + 1) / 2) * (skyBot - skyTop);

      const baseColor = d.color || '#ff5a1f';
      const fx = applyColorEffect(baseColor, p, i, N, tSec, colorEffect);
      const color = fx.color;
      const finalAlpha = beh.op * fx.alphaMul;

      // Sub-pixel render: no Math.floor (kills the snap-to-integer shimmer)
      if (useGlow && finalAlpha > 0.3) {
        ctx.globalAlpha = finalAlpha * 0.25;
        ctx.fillStyle = color;
        ctx.fillRect(px - ps, py - ps, ps * 2, ps * 2);
      }
      ctx.globalAlpha = finalAlpha;
      ctx.fillStyle = color;
      ctx.fillRect(px - ps/2, py - ps/2, ps, ps);
    }
    ctx.globalAlpha = 1;

    // HUD crosshair
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(W/2, 0); ctx.lineTo(W/2, H * 0.92);
    ctx.moveTo(0, (skyTop + skyBot) / 2); ctx.lineTo(W, (skyTop + skyBot) / 2);
    ctx.stroke();
  }

  useEffect(() => {
    function resize() {
      const c = canvasRef.current;
      if (!c) return;
      const rect = c.getBoundingClientRect();
      c.width = rect.width;
      c.height = rect.height;
    }
    resize();
    window.addEventListener('resize', resize);
    const id = setTimeout(resize, 50);
    return () => { window.removeEventListener('resize', resize); clearTimeout(id); };
  }, [view]);

  function play() {
    setPlaying(true);
    if (audioRef.current) {
      audioRef.current.currentTime = playhead;
      audioRef.current.play().catch(() => {});
    }
  }
  function pause() {
    setPlaying(false);
    if (audioRef.current) audioRef.current.pause();
  }
  function stop() {
    setPlaying(false);
    setPlayhead(0);
    lastClipIdRef.current = null;
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
  }
  function seek(t) {
    const v = Math.max(0, Math.min(duration, t));
    setPlayhead(v);
    if (audioRef.current) audioRef.current.currentTime = v;
    lastClipIdRef.current = null;
  }

  function addClip(shapeId) {
    const start = Math.min(playhead, duration - 4);
    setClips(prev => [...prev, makeClip(shapeId, start, 6, nDrones)]);
  }
  function deleteClip(id) {
    setClips(prev => prev.filter(c => c.id !== id));
    if (selectedClipId === id) setSelectedClipId(null);
  }
  function updateClip(id, patch) {
    setClips(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));
  }

  async function handleImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const points = await shapeFromImage(file, nDrones);
    const start = Math.min(playhead, duration - 4);
    setClips(prev => [...prev, {
      id: uid(),
      shapeId: 'image:' + file.name,
      name: 'IMG:' + file.name.replace(/\..+$/, '').slice(0, 8).toUpperCase(),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      behavior: 'shimmer',
      colorEffect: 'none',
      start, duration: 6, points,
      useImageColors: true,
    }]);
    e.target.value = '';
  }

  function handleAudioUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioFile(file);
    setAudioUrl(URL.createObjectURL(file));
    e.target.value = '';
  }

  function onAudioMeta() {
    if (audioRef.current && audioRef.current.duration) {
      setDuration(Math.ceil(audioRef.current.duration));
    }
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      <Header view={view} setView={setView} nDrones={nDrones} setNDrones={setNDrones} fps={fps} />
      {view === 'sky' ? (
        <SkyView canvasRef={canvasRef} />
      ) : (
        <TimelineView
          clips={clips} duration={duration} playhead={playhead} seek={seek}
          selectedClipId={selectedClipId} setSelectedClipId={setSelectedClipId}
          updateClip={updateClip} deleteClip={deleteClip}
        />
      )}
      <Transport
        playing={playing} play={play} pause={pause} stop={stop}
        playhead={playhead} duration={duration} seek={seek}
        activeClip={activeClip}
      />
      <Toolbar onAddShape={addClip} onImage={handleImageUpload} onAudio={handleAudioUpload} audioFile={audioFile} />
      {audioUrl && (
        <audio ref={audioRef} src={audioUrl} onLoadedMetadata={onAudioMeta} style={{ display: 'none' }} />
      )}
    </div>
  );
}

function Header({ view, setView, nDrones, setNDrones, fps }) {
  return (
    <header style={{
      borderBottom: '1px solid var(--line)', padding: '10px 14px',
      display: 'flex', alignItems: 'center', gap: 10, background: 'var(--panel)', flexWrap: 'wrap',
    }}>
      <div style={{ fontFamily: 'VT323, monospace', fontSize: 22, letterSpacing: '0.08em' }}>
        ▲ DRONESIM <span style={{ color: 'var(--accent)' }}>//</span>{' '}
        <span style={{ color: 'var(--ink-dim)', fontSize: 16 }}>v0.2</span>
      </div>
      <span className="label" style={{ marginLeft: 6 }}>DRONES</span>
      <select
        value={nDrones}
        onChange={e => setNDrones(parseInt(e.target.value))}
        style={{
          fontFamily: 'inherit', fontSize: 12,
          border: '1px solid var(--line)', background: 'var(--panel)',
          padding: '5px 6px', borderRadius: 2,
        }}
      >
        {COUNT_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
      </select>
      <span className="label" style={{ color: fps < 40 ? 'var(--warn)' : 'var(--good)' }}>
        {fps} FPS
      </span>
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
        <button className={view === 'sky' ? 'primary' : ''} onClick={() => setView('sky')}>SKY</button>
        <button className={view === 'timeline' ? 'primary' : ''} onClick={() => setView('timeline')}>TIMELINE</button>
      </div>
    </header>
  );
}

function SkyView({ canvasRef }) {
  return (
    <div style={{ flex: 1, position: 'relative', overflow: 'hidden', minHeight: 0 }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block', imageRendering: 'pixelated' }} />
    </div>
  );
}

function Transport({ playing, play, pause, stop, playhead, duration, seek, activeClip }) {
  return (
    <div style={{
      borderTop: '1px solid var(--line)', background: 'var(--panel)',
    }}>
      <div style={{
        padding: '4px 14px',
        fontSize: 10,
        fontFamily: 'JetBrains Mono, monospace',
        color: 'var(--ink-dim)',
        borderBottom: '1px solid var(--line)',
        display: 'flex', gap: 12, alignItems: 'center',
      }}>
        <span>FORMATION: <span style={{ color: 'var(--ink)' }}>{activeClip ? activeClip.name : '—'}</span></span>
        <span>BEHAVIOR: <span style={{ color: 'var(--ink)' }}>{activeClip ? activeClip.behavior.toUpperCase() : '—'}</span></span>
        <span>FX: <span style={{ color: 'var(--ink)' }}>{activeClip ? (activeClip.colorEffect || 'none').toUpperCase() : '—'}</span></span>
      </div>
      <div style={{
        padding: '10px 14px',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <button onClick={stop} title="Stop">■</button>
        {playing
          ? <button className="primary" onClick={pause}>▮▮ PAUSE</button>
          : <button className="accent" onClick={play}>▶ PLAY</button>}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="label" style={{ minWidth: 50 }}>{fmt(playhead)}</span>
          <input type="range" min="0" max={duration} step="0.05" value={playhead}
            onChange={e => seek(parseFloat(e.target.value))} style={{ flex: 1 }} />
          <span className="label" style={{ minWidth: 50, textAlign: 'right' }}>{fmt(duration)}</span>
        </div>
      </div>
    </div>
  );
}

function Toolbar({ onAddShape, onImage, onAudio, audioFile }) {
  return (
    <div style={{
      padding: '8px 14px', borderTop: '1px solid var(--line)',
      background: 'var(--panel-2)', display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center',
    }}>
      <span className="label">+ FORMATION</span>
      {SHAPES.map(s => (
        <button key={s.id} onClick={() => onAddShape(s.id)}>{s.name}</button>
      ))}
      <span className="label" style={{ marginLeft: 8 }}>+ MEDIA</span>
      <label className="upload-btn">
        IMAGE…
        <input type="file" accept="image/*" onChange={onImage} style={{ display: 'none' }} />
      </label>
      <label className="upload-btn">
        AUDIO…
        <input type="file" accept="audio/*" onChange={onAudio} style={{ display: 'none' }} />
      </label>
      {audioFile && <span style={{ fontSize: 11, color: 'var(--ink-dim)' }}>♪ {audioFile.name}</span>}
      <style>{`
        .upload-btn {
          font-family: inherit; border: 1px solid var(--line);
          background: var(--panel); color: var(--ink);
          padding: 6px 10px; border-radius: 2px; cursor: pointer;
          font-size: 12px; letter-spacing: 0.02em;
        }
        .upload-btn:hover { background: var(--panel-2); }
      `}</style>
    </div>
  );
}

function TimelineView({ clips, duration, playhead, seek, selectedClipId, setSelectedClipId, updateClip, deleteClip }) {
  const trackRef = useRef(null);
  const [drag, setDrag] = useState(null);
  const PIXELS_PER_SEC = 30;
  const trackWidth = duration * PIXELS_PER_SEC;
  const TRACK_H = 60;

  function onPointerDownClip(e, clip, mode) {
    e.stopPropagation();
    setSelectedClipId(clip.id);
    setDrag({ id: clip.id, mode, startX: e.clientX, origStart: clip.start, origDuration: clip.duration });
  }

  useEffect(() => {
    if (!drag) return;
    function onMove(e) {
      const dx = (e.clientX - drag.startX) / PIXELS_PER_SEC;
      if (drag.mode === 'move') {
        const s = Math.max(0, Math.min(duration - drag.origDuration, drag.origStart + dx));
        updateClip(drag.id, { start: s });
      } else if (drag.mode === 'resize-l') {
        const s = Math.max(0, Math.min(drag.origStart + drag.origDuration - 0.5, drag.origStart + dx));
        const d = drag.origDuration - (s - drag.origStart);
        updateClip(drag.id, { start: s, duration: d });
      } else if (drag.mode === 'resize-r') {
        const d = Math.max(0.5, Math.min(duration - drag.origStart, drag.origDuration + dx));
        updateClip(drag.id, { duration: d });
      }
    }
    function onUp() { setDrag(null); }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [drag, duration, updateClip]);

  function onTrackClick(e) {
    if (drag) return;
    const rect = trackRef.current.getBoundingClientRect();
    const t = (e.clientX - rect.left + trackRef.current.scrollLeft) / PIXELS_PER_SEC;
    seek(t);
  }

  const ticks = [];
  for (let s = 0; s <= duration; s += 5) ticks.push(s);

  return (
    <div style={{ flex: 1, overflow: 'auto', background: '#f6f8fa', minHeight: 0 }} ref={trackRef}>
      <div style={{ width: trackWidth, minWidth: '100%', position: 'relative' }}>
        <div style={{
          height: 24, borderBottom: '1px solid var(--line)',
          position: 'relative', background: 'var(--panel)', cursor: 'pointer',
        }} onClick={onTrackClick}>
          {ticks.map(s => (
            <div key={s} style={{
              position: 'absolute', left: s * PIXELS_PER_SEC, top: 0, height: '100%',
              borderLeft: '1px solid var(--line)',
              fontFamily: 'VT323, monospace', fontSize: 14,
              color: 'var(--ink-dim)', paddingLeft: 4,
            }}>{fmt(s)}</div>
          ))}
        </div>

        <div
          style={{
            height: TRACK_H, position: 'relative',
            background: `repeating-linear-gradient(90deg, transparent 0, transparent ${PIXELS_PER_SEC-1}px, rgba(14,26,36,0.05) ${PIXELS_PER_SEC-1}px, rgba(14,26,36,0.05) ${PIXELS_PER_SEC}px)`,
            borderBottom: '1px solid var(--line)',
          }}
          onClick={onTrackClick}
        >
          <div className="label" style={{ position: 'absolute', left: 6, top: 4, fontSize: 12 }}>FORMATION TRACK</div>
          {clips.map(clip => (
            <div
              key={clip.id}
              onPointerDown={e => onPointerDownClip(e, clip, 'move')}
              onClick={e => { e.stopPropagation(); setSelectedClipId(clip.id); }}
              style={{
                position: 'absolute',
                left: clip.start * PIXELS_PER_SEC,
                width: clip.duration * PIXELS_PER_SEC,
                top: 20, height: TRACK_H - 24,
                background: clip.color,
                border: selectedClipId === clip.id ? '2px solid var(--ink)' : '1px solid rgba(0,0,0,0.3)',
                borderRadius: 2, color: '#fff',
                fontSize: 11, fontWeight: 700,
                padding: '4px 8px', cursor: 'move',
                userSelect: 'none', overflow: 'hidden',
                whiteSpace: 'nowrap', boxShadow: '0 1px 0 rgba(0,0,0,0.1)',
                touchAction: 'none',
              }}
            >
              <div onPointerDown={e => onPointerDownClip(e, clip, 'resize-l')}
                style={{ position: 'absolute', left: 0, top: 0, width: 8, height: '100%', cursor: 'ew-resize', touchAction: 'none' }} />
              <div onPointerDown={e => onPointerDownClip(e, clip, 'resize-r')}
                style={{ position: 'absolute', right: 0, top: 0, width: 8, height: '100%', cursor: 'ew-resize', touchAction: 'none' }} />
              {clip.name}
            </div>
          ))}

          <div style={{
            position: 'absolute', left: playhead * PIXELS_PER_SEC,
            top: -24, width: 2, height: TRACK_H + 24,
            background: 'var(--accent)', pointerEvents: 'none', zIndex: 10,
          }}>
            <div style={{
              position: 'absolute', top: 0, left: -5,
              width: 12, height: 12, background: 'var(--accent)',
              clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
            }} />
          </div>
        </div>

        {selectedClipId && (
          <ClipInspector
            clip={clips.find(c => c.id === selectedClipId)}
            onChange={patch => updateClip(selectedClipId, patch)}
            onDelete={() => deleteClip(selectedClipId)}
          />
        )}
      </div>
    </div>
  );
}

function ClipInspector({ clip, onChange, onDelete }) {
  if (!clip) return null;
  return (
    <div style={{
      position: 'sticky', bottom: 0, background: 'var(--panel)',
      borderTop: '1px solid var(--line)', padding: '10px 14px',
      display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap',
    }}>
      <span className="label">CLIP</span>
      <span style={{ fontWeight: 700 }}>{clip.name}</span>
      <span style={{ fontSize: 10, color: 'var(--ink-dim)' }}>BEH: {clip.behavior}</span>
      <label style={{ fontSize: 11 }}>
        start <input type="number" step="0.1" value={clip.start.toFixed(2)}
          onChange={e => onChange({ start: parseFloat(e.target.value) || 0 })}
          style={{ width: 60, fontFamily: 'inherit' }} />
      </label>
      <label style={{ fontSize: 11 }}>
        dur <input type="number" step="0.1" value={clip.duration.toFixed(2)}
          onChange={e => onChange({ duration: parseFloat(e.target.value) || 0.5 })}
          style={{ width: 60, fontFamily: 'inherit' }} />
      </label>
      {!clip.useImageColors && (
        <label style={{ fontSize: 11 }}>
          color <input type="color" value={clip.color}
            onChange={e => onChange({ color: e.target.value })} />
        </label>
      )}
      {clip.useImageColors && (
        <span style={{ fontSize: 10, color: 'var(--good)' }}>● IMG COLORS</span>
      )}
      <label style={{ fontSize: 11 }}>
        fx <select value={clip.colorEffect || 'none'}
          onChange={e => onChange({ colorEffect: e.target.value })}
          style={{ fontFamily: 'inherit', fontSize: 11, padding: '3px 4px' }}>
          {COLOR_EFFECTS.map(fx => <option key={fx.id} value={fx.id}>{fx.name}</option>)}
        </select>
      </label>
      <button onClick={onDelete} style={{ marginLeft: 'auto', borderColor: 'var(--bad)', color: 'var(--bad)' }}>DELETE</button>
    </div>
  );
}
