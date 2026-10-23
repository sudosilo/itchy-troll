// Formation generators. Each returns an array of {x, y} in [-1, 1] space.
// Drone count is fixed (~100). Generators pad/truncate to N points.

export function packToN(points, N) {
  if (points.length === N) return points;
  if (points.length > N) return points.slice(0, N);
  // pad with copies (drones stack — looks like a denser cluster)
  const out = points.slice();
  let i = 0;
  while (out.length < N) {
    out.push({ ...points[i % points.length] });
    i++;
  }
  return out;
}

export function shapeCircle(N) {
  const pts = [];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    pts.push({ x: Math.cos(a) * 0.7, y: Math.sin(a) * 0.7 });
  }
  return pts;
}

export function shapeHeart(N) {
  const pts = [];
  for (let i = 0; i < N; i++) {
    const t = (i / N) * Math.PI * 2;
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    pts.push({ x: x / 18, y: y / 18 });
  }
  return pts;
}

export function shapeStar(N) {
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

export function shapeSquare(N) {
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

export function shapeSpiral(N) {
  const pts = [];
  const turns = 3;
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    const a = t * turns * Math.PI * 2;
    const r = t * 0.85;
    pts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
  }
  return pts;
}

export function shapeArrow(N) {
  // Up arrow
  const pts = [];
  // shaft (rect)
  // head (triangle)
  // We sample uniformly along the outline-ish
  for (let i = 0; i < N; i++) {
    const t = i / N;
    let x, y;
    if (t < 0.5) {
      // triangle head, top half
      const s = t * 2;
      x = (s - 0.5) * 0.8;
      y = -0.8 + s * 0.8;
    } else {
      // shaft
      const s = (t - 0.5) * 2;
      x = (s - 0.5) * 0.25;
      y = s * 0.8;
    }
    pts.push({ x, y });
  }
  return pts;
}

export function shapeRing(N) {
  // Two concentric rings
  const pts = [];
  const half = Math.floor(N / 2);
  for (let i = 0; i < half; i++) {
    const a = (i / half) * Math.PI * 2;
    pts.push({ x: Math.cos(a) * 0.85, y: Math.sin(a) * 0.85 });
  }
  for (let i = 0; i < N - half; i++) {
    const a = (i / (N - half)) * Math.PI * 2;
    pts.push({ x: Math.cos(a) * 0.45, y: Math.sin(a) * 0.45 });
  }
  return pts;
}

export function shapeGrid(N) {
  // Hover grid — same as square but spaced
  return shapeSquare(N);
}

export function shapeWave(N) {
  const pts = [];
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    const x = (t - 0.5) * 1.8;
    const y = Math.sin(t * Math.PI * 4) * 0.4;
    pts.push({ x, y });
  }
  return pts;
}

export function shapeSmile(N) {
  // Two eyes + smile arc
  const pts = [];
  const eyeCount = Math.floor(N * 0.2);
  // left eye
  for (let i = 0; i < Math.floor(eyeCount / 2); i++) {
    const a = (i / Math.floor(eyeCount / 2)) * Math.PI * 2;
    pts.push({ x: -0.35 + Math.cos(a) * 0.08, y: -0.3 + Math.sin(a) * 0.08 });
  }
  // right eye
  for (let i = 0; i < Math.floor(eyeCount / 2); i++) {
    const a = (i / Math.floor(eyeCount / 2)) * Math.PI * 2;
    pts.push({ x: 0.35 + Math.cos(a) * 0.08, y: -0.3 + Math.sin(a) * 0.08 });
  }
  // smile
  const remain = N - pts.length;
  for (let i = 0; i < remain; i++) {
    const t = i / (remain - 1);
    const a = Math.PI * 0.2 + t * Math.PI * 0.6;
    pts.push({ x: Math.cos(a) * 0.55, y: Math.sin(a) * 0.55 + 0.05 });
  }
  return packToN(pts, N);
}

export const SHAPES = [
  { id: 'circle',  name: 'CIRCLE',  fn: shapeCircle  },
  { id: 'heart',   name: 'HEART',   fn: shapeHeart   },
  { id: 'star',    name: 'STAR',    fn: shapeStar    },
  { id: 'square',  name: 'SQUARE',  fn: shapeSquare  },
  { id: 'spiral',  name: 'SPIRAL',  fn: shapeSpiral  },
  { id: 'arrow',   name: 'ARROW',   fn: shapeArrow   },
  { id: 'ring',    name: 'RING-2',  fn: shapeRing    },
  { id: 'grid',    name: 'GRID',    fn: shapeGrid    },
  { id: 'wave',    name: 'WAVE',    fn: shapeWave    },
  { id: 'smile',   name: 'SMILE',   fn: shapeSmile   },
];

// Generate formation from an uploaded image — sample dark pixels
export async function shapeFromImage(file, N) {
  const url = URL.createObjectURL(file);
  const img = new Image();
  await new Promise((res, rej) => {
    img.onload = res;
    img.onerror = rej;
    img.src = url;
  });
  const SIZE = 64;
  const c = document.createElement('canvas');
  c.width = SIZE; c.height = SIZE;
  const ctx = c.getContext('2d');
  // fit contain
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
      const r = data[i], g = data[i+1], b = data[i+2];
      const lum = 0.299*r + 0.587*g + 0.114*b;
      if (lum < 140) candidates.push({ x: (x / SIZE - 0.5) * 2, y: (y / SIZE - 0.5) * 2, lum });
    }
  }
  URL.revokeObjectURL(url);
  if (candidates.length === 0) return shapeCircle(N);
  // sample N points evenly
  const pts = [];
  for (let i = 0; i < N; i++) {
    const idx = Math.floor((i / N) * candidates.length);
    pts.push({ x: candidates[idx].x, y: candidates[idx].y });
  }
  return pts;
}
