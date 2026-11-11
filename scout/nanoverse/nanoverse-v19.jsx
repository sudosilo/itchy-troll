import React, { useEffect, useRef, useState, useCallback } from 'react';

// ============================================================
// CITY GROWER v3 — cached layer, strict grid roads, road dots
// ============================================================
// Mobile-first. Single Canvas2D render. No external deps.
//
// Performance model:
//   - "settled" buildings (cell === 2) are drawn into an offscreen canvas
//     ONE time when they finish. Per frame we just blit that canvas.
//   - Roads + paper texture + radial wash live on a second offscreen
//     canvas that only rebuilds when yaw/zoom/seed/grid changes.
//   - Per-frame draw is only: ground/road cache + settled cache +
//     animating buildings (cell === 1) + site pulses + compass.
//
// When the camera rotates or zooms, we rebuild the caches once.

const GRID = 64;
const TILE_W = 22;
const TILE_H = 11;
const HEIGHT_UNIT = 7;
const MAX_BUILD_HEIGHT = 12;
const MIN_BUILD_HEIGHT = 2;
const ROAD_SPACING = 5;   // every 5th row/col is a road. STRICT.

// Two-phase growth: every building starts as a tiny ~1-unit base, then
// later passes add new strata on top. Each stratum has its own color.
const BASE_HEIGHT = 1.0;          // initial small building height (~1/10 of max)
const STRATUM_MIN = 1.5;          // each upgrowth step adds this much height
const STRATUM_MAX = 3.0;
const MAX_STRATA = 6;             // hard cap so things don't get silly
const UPGROWTH_PROB = 0.5;        // chance per growth tick to do an up-pass
                                  // instead of a place-new-building pass
const BUILD_DUR = 0.55;           // seconds per building/stratum animation
                                  // (faster so less time spent in live-draw)
const MAX_LIVE_BUILDS = 12;       // cap concurrent animations -- prevents
                                  // unbounded live-draw cost

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

// =====================================================================
// TILE PRIMITIVES
// =====================================================================
// Each shape defines its cell footprint as N corners in local grid space,
// where (0,0)..(1,1) is the unit cell. The footprint is centered on (0.5,0.5).
// Returns an array of { dx, dy } offsets to add to (gridX, gridY) to get
// world-space corner coordinates.
//
// Same primitive is used for the building base, top, and for road cells,
// so roads and buildings are always shape-coherent.

const TILE_CACHE = {};

// Available shapes for random mode. Each gets cached by name in TILE_CACHE.
const RANDOM_SHAPES = ['square', 'circle', 'hexagon', 'octagon', 'pentagon', 'diamond'];

function tileCorners(shape, x, y) {
  // Build once per shape; the corners are identical regardless of grid pos.
  let key = shape;
  // Triangles alternate orientation
  let upright = true;
  if (shape === 'triangle') {
    upright = ((x + y) % 2) === 0;
    key = upright ? 'triangle-up' : 'triangle-down';
  }
  // Random mode: each cell deterministically picks one of the base shapes
  // based on (x, y). Same cell -> same shape.
  if (shape === 'random') {
    const h = ((x * 73856093) ^ (y * 19349663)) >>> 0;
    const baseShape = RANDOM_SHAPES[h % RANDOM_SHAPES.length];
    return tileCorners(baseShape, x, y);
  }
  let pts = TILE_CACHE[key];
  if (!pts) {
    pts = buildTileCorners(shape, upright);
    TILE_CACHE[key] = pts;
  }
  // Return corners offset from the cell origin (gx, gy)
  return pts;
}

function buildTileCorners(shape, upright) {
  // All returned points are in [0,1] x [0,1] cell-local space.
  const cx = 0.5, cy = 0.5;
  if (shape === 'square' || shape === 'rectangle') {
    return [
      { dx: 0, dy: 0 },
      { dx: 1, dy: 0 },
      { dx: 1, dy: 1 },
      { dx: 0, dy: 1 },
    ];
  }
  if (shape === 'circle') {
    // Approximate a circle with a 16-sided polygon inscribed in the cell.
    const r = 0.5;
    const N = 16;
    const pts = [];
    for (let i = 0; i < N; i++) {
      const a = -Math.PI / 2 + i * (Math.PI * 2 / N);
      pts.push({ dx: cx + r * Math.cos(a), dy: cy + r * Math.sin(a) });
    }
    return pts;
  }
  if (shape === 'diamond') {
    return [
      { dx: 0.5, dy: 0.05 },
      { dx: 0.95, dy: 0.5 },
      { dx: 0.5, dy: 0.95 },
      { dx: 0.05, dy: 0.5 },
    ];
  }
  if (shape === 'hexagon') {
    // pointy-top hex inscribed in the cell, slightly inset
    const r = 0.5;
    const pts = [];
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + i * (Math.PI / 3);
      pts.push({ dx: cx + r * Math.cos(a), dy: cy + r * Math.sin(a) });
    }
    return pts;
  }
  if (shape === 'octagon') {
    const r = 0.5;
    const pts = [];
    for (let i = 0; i < 8; i++) {
      const a = -Math.PI / 8 + i * (Math.PI / 4);
      pts.push({ dx: cx + r * Math.cos(a), dy: cy + r * Math.sin(a) });
    }
    return pts;
  }
  if (shape === 'pentagon') {
    const r = 0.55;
    const pts = [];
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + i * (Math.PI * 2 / 5);
      pts.push({ dx: cx + r * Math.cos(a), dy: cy + r * Math.sin(a) });
    }
    return pts;
  }
  if (shape === 'triangle') {
    // Pointy up or pointy down; uses full cell
    if (upright) {
      return [
        { dx: 0.5, dy: 0.05 },
        { dx: 0.95, dy: 0.95 },
        { dx: 0.05, dy: 0.95 },
      ];
    } else {
      return [
        { dx: 0.05, dy: 0.05 },
        { dx: 0.95, dy: 0.05 },
        { dx: 0.5, dy: 0.95 },
      ];
    }
  }
  // Fallback
  return [
    { dx: 0, dy: 0 },
    { dx: 1, dy: 0 },
    { dx: 1, dy: 1 },
    { dx: 0, dy: 1 },
  ];
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// =====================================================================
// WATER (lakes + rivers)
// =====================================================================
// Generates a Uint8Array: 0 = land, 1 = water, 2 = sand/beach.
// A lake is a smooth low region of a second noise field; a river is a
// meandering path. Beaches are land cells adjacent to water.
function makeWater(seed, size, mode) {
  const water = new Uint8Array(size * size);
  if (mode === 'none') return water;

  const rand = mulberry32(seed ^ 0x51ed270b);
  // Secondary smooth noise field for lakes
  const coarse = 6;
  const grid = [];
  for (let y = 0; y <= coarse; y++) {
    const row = [];
    for (let x = 0; x <= coarse; x++) row.push(rand());
    grid.push(row);
  }
  const sample = (x, y) => {
    const gx = (x / size) * coarse;
    const gy = (y / size) * coarse;
    const x0 = Math.floor(gx), y0 = Math.floor(gy);
    const tx = gx - x0, ty = gy - y0;
    const a = grid[y0][x0], b = grid[y0][x0 + 1];
    const c = grid[y0 + 1][x0], d = grid[y0 + 1][x0 + 1];
    const u = tx * tx * (3 - 2 * tx);
    const v = ty * ty * (3 - 2 * ty);
    return lerp(lerp(a, b, u), lerp(c, d, u), v);
  };

  const wantLake = mode === 'lake' || mode === 'both';
  const wantRiver = mode === 'river' || mode === 'both';

  // LAKE: carve a smooth low pool offset from center so the city
  // (which starts at center) has to grow around it.
  if (wantLake) {
    // Lake center: pick an off-center location
    const angle = rand() * Math.PI * 2;
    const dist = size * (0.18 + rand() * 0.12);
    const lcx = size / 2 + Math.cos(angle) * dist;
    const lcy = size / 2 + Math.sin(angle) * dist;
    const lr = size * (0.10 + rand() * 0.05); // lake radius
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - lcx, dy = y - lcy;
        const d = Math.sqrt(dx * dx + dy * dy);
        // irregular edge using noise
        const edge = lr * (0.75 + sample(x, y) * 0.5);
        if (d < edge) water[y * size + x] = 1;
      }
    }
  }

  // RIVER: one smooth channel crossing the whole map with a single
  // gentle meander (not a zigzag). The phase offset is fixed ONCE so the
  // curve is continuous, and the amplitude/frequency are gentle.
  if (wantRiver) {
    const horizontal = rand() < 0.5;
    const span = size;
    const baseRand = mulberry32(seed ^ 0xabcd1234);
    const axis = size * (0.35 + baseRand() * 0.3);
    const ampMeander = size * 0.10;            // gentle sideways drift
    const phaseOffset = baseRand() * Math.PI * 2; // computed ONCE
    const cycles = 0.8 + baseRand() * 0.6;     // <1.5 cycles total → smooth
    const widthHalf = 1.6 + baseRand() * 1.0;  // ~3-5 cells wide
    for (let t = 0; t < span; t++) {
      const phase = (t / span) * Math.PI * 2 * cycles + phaseOffset;
      const center = axis + Math.sin(phase) * ampMeander;
      const lo = Math.floor(center - widthHalf);
      const hi = Math.ceil(center + widthHalf);
      for (let cc = lo; cc <= hi; cc++) {
        if (cc < 0 || cc >= size) continue;
        if (Math.abs(cc - center) > widthHalf) continue;
        if (horizontal) water[cc * size + t] = 1;
        else water[t * size + cc] = 1;
      }
    }
  }

  // BEACH/SAND: any land cell 4-adjacent to water becomes sand.
  // This guarantees sand always sits between grass and sea.
  const sandCells = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (water[y * size + x] !== 0) continue;
      let touchesWater = false;
      const nb = [[1,0],[-1,0],[0,1],[0,-1]];
      for (const [dx, dy] of nb) {
        const cx = x + dx, cy = y + dy;
        if (cx < 0 || cy < 0 || cx >= size || cy >= size) continue;
        if (water[cy * size + cx] === 1) { touchesWater = true; break; }
      }
      if (touchesWater) sandCells.push(y * size + x);
    }
  }
  for (const idx of sandCells) water[idx] = 2;

  return water;
}

function makeTerrain(seed, size, amp) {
  const rand = mulberry32(seed ^ 0x9e3779b9);
  const coarse = 8;
  const grid = [];
  for (let y = 0; y <= coarse; y++) {
    const row = [];
    for (let x = 0; x <= coarse; x++) row.push(rand());
    grid.push(row);
  }
  const out = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const gx = (x / size) * coarse;
      const gy = (y / size) * coarse;
      const x0 = Math.floor(gx), y0 = Math.floor(gy);
      const tx = gx - x0, ty = gy - y0;
      const a = grid[y0][x0];
      const b = grid[y0][x0 + 1];
      const c = grid[y0 + 1][x0];
      const d = grid[y0 + 1][x0 + 1];
      const u = tx * tx * (3 - 2 * tx);
      const v = ty * ty * (3 - 2 * ty);
      const n = lerp(lerp(a, b, u), lerp(c, d, u), v);
      out[y * size + x] = n * amp;
    }
  }
  return out;
}

// =====================================================================
// SUN + LIGHTING
// =====================================================================
// sunAngle: 0 = noon, PI/2 = sunset, PI = midnight, 3PI/2 = sunrise.
// Returns shadow direction, daylight 0..1, and atmosphere tints.
function lighting(sunAngle) {
  // Normalize to [0, 2PI)
  const a = ((sunAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  // Elevation: 1 at noon, -1 at midnight, 0 at horizons.
  // Using a cosine wave: cos(0) = 1 (noon), cos(PI) = -1 (midnight)
  const elev = Math.cos(a);
  // daylight: 0 at night, 1 at full day, smooth twilight
  const daylight = Math.max(0, Math.min(1, (elev + 0.2) / 0.8));
  // Sun "horizontal" angle for cast direction.
  // Sun travels east -> south -> west, projects into our iso frame.
  // We'll have shadows rotate around the building during the day.
  // sunAzimuth: a, mapped so morning has shadows pointing one way,
  // evening the opposite. Use sin/cos to get a direction vector.
  // Length scales inversely with elevation -- low sun = long shadow.
  const shadowLen = elev > 0 ? Math.max(0.4, (1 - elev * 0.8)) : 0;
  const dirX = Math.cos(a + Math.PI / 2); // perpendicular to time axis
  const dirY = -Math.sin(a + Math.PI / 2) * 0.6; // iso y-scale
  return {
    daylight,
    elev,
    sunAngle: a,
    shadowDX: dirX * shadowLen,
    shadowDY: dirY * shadowLen,
    // Sky tint: warm at sunrise/sunset, neutral midday, deep indigo at night
    skyTop:    daylight > 0.7 ? '#fdf7ec'
             : daylight > 0.3 ? '#f8d9b3'  // warm sunset
             : daylight > 0.1 ? '#7a6b8f'  // dusk purple
             :                  '#2a2c4a', // night indigo
    skyBottom: daylight > 0.7 ? '#f3e9d2'
             : daylight > 0.3 ? '#ecb18b'
             : daylight > 0.1 ? '#4a4264'
             :                  '#181a30',
    // Tint applied to building colors (multiplied or overlay).
    // Warm orange at golden hour, cool dim at night.
    tintR: daylight > 0.7 ? 1.0  : daylight > 0.3 ? 1.10 : daylight > 0.1 ? 0.65 : 0.42,
    tintG: daylight > 0.7 ? 1.0  : daylight > 0.3 ? 0.92 : daylight > 0.1 ? 0.60 : 0.40,
    tintB: daylight > 0.7 ? 1.0  : daylight > 0.3 ? 0.78 : daylight > 0.1 ? 0.70 : 0.55,
    // Window glow alpha: dark = bright glow
    windowGlow: 1 - daylight,
  };
}

function tintHex(hex, light) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const nr = Math.max(0, Math.min(255, r * light.tintR)) | 0;
  const ng = Math.max(0, Math.min(255, g * light.tintG)) | 0;
  const nb = Math.max(0, Math.min(255, b * light.tintB)) | 0;
  return '#' + nr.toString(16).padStart(2, '0') + ng.toString(16).padStart(2, '0') + nb.toString(16).padStart(2, '0');
}

function shapeScore(shape, x, y, cx, cy, r) {
  const dx = x - cx, dy = y - cy;
  // 'random' shape mode uses a circular city outline
  if (shape === 'random') {
    const d = Math.sqrt(dx * dx + dy * dy);
    return clamp(1 - d / r, 0, 1);
  }
  switch (shape) {
    case 'circle': {
      const d = Math.sqrt(dx * dx + dy * dy);
      return clamp(1 - d / r, 0, 1);
    }
    case 'square': {
      const d = Math.max(Math.abs(dx), Math.abs(dy));
      return clamp(1 - d / r, 0, 1);
    }
    case 'rectangle': {
      const rx = r * 1.5, ry = r * 0.7;
      const d = Math.max(Math.abs(dx) / rx, Math.abs(dy) / ry);
      return clamp(1 - d, 0, 1);
    }
    case 'triangle': {
      const h = r * 1.6;
      const yNorm = (-dy + r * 0.6) / h;
      if (yNorm < 0 || yNorm > 1) return 0;
      const widthAtY = r * (1 - yNorm);
      if (Math.abs(dx) > widthAtY) return 0;
      const edge = Math.min(yNorm, 1 - yNorm, 1 - Math.abs(dx) / Math.max(widthAtY, 0.001));
      return clamp(edge * 2, 0, 1);
    }
    case 'pentagon':
    case 'octagon':
    case 'hexagon': {
      const sides = shape === 'pentagon' ? 5 : (shape === 'hexagon' ? 6 : 8);
      const ang = Math.atan2(dy, dx);
      const step = (Math.PI * 2) / sides;
      const a = ((ang % step) + step) % step - step / 2;
      const dist = Math.sqrt(dx * dx + dy * dy) * Math.cos(a);
      const inradius = r * Math.cos(Math.PI / sides);
      return clamp(1 - dist / inradius, 0, 1);
    }
    case 'diamond': {
      // square rotated 45°: L-infinity in rotated frame = L1
      const d = Math.abs(dx) + Math.abs(dy);
      return clamp(1 - d / (r * 1.3), 0, 1);
    }
    default:
      return 0;
  }
}

// strict road rule
function isRoad(x, y) {
  return x % ROAD_SPACING === 0 || y % ROAD_SPACING === 0;
}

const NEIGHBORS = [
  { dx:  1, dy:  0, w: 1.0 },
  { dx: -1, dy:  0, w: 1.0 },
  { dx:  0, dy:  1, w: 1.0 },
  { dx:  0, dy: -1, w: 1.0 },
  { dx:  1, dy:  1, w: 0.45 },
  { dx:  1, dy: -1, w: 0.45 },
  { dx: -1, dy:  1, w: 0.45 },
  { dx: -1, dy: -1, w: 0.45 },
];

// Each theme is a list of palette families.
// A palette family = [topLight, frontMid, sideShade, accent]
const PALETTE_THEMES = {
  pastel: [
    ['#fbe5d6', '#f4b6a0', '#e08e7a', '#c96a55'], // peach
    ['#e8ecf7', '#bcc7e6', '#8c9fcc', '#6678a8'], // periwinkle
    ['#e7f3e1', '#bcdab1', '#8ec38a', '#6aa269'], // mint
    ['#fbe9f1', '#f1b7cf', '#d68bb0', '#b06a8c'], // rose
    ['#fff1d6', '#f6d9a0', '#e0b974', '#b58a4c'], // butter
    ['#e3f0f3', '#a7d2dd', '#79b4c2', '#558d9b'], // sky
    ['#efe6f5', '#cbb6dd', '#a288bf', '#7c629a'], // lilac
    ['#f7e9d9', '#e3c1a0', '#bf957a', '#946d56'], // sand
    ['#dff0e7', '#a4d4bb', '#75ad96', '#548873'], // sage
    ['#f6dfd2', '#e8a48a', '#c87d63', '#9b5440'], // terracotta
  ],
  seattle: [
    // moody PNW: cool grays, deep teals, evergreen, weathered cedar
    ['#dfe5e8', '#a8b4ba', '#7b8b94', '#4f6068'], // slate gray
    ['#cfd9d6', '#94a8a3', '#637771', '#3c5048'], // mossy stone
    ['#dde3df', '#abb8b1', '#7c8d83', '#4d605a'], // fog
    ['#d4dadc', '#a0aab0', '#727f86', '#465259'], // steel
    ['#c8d2cf', '#8ea29e', '#5d736f', '#39504a'], // pine
    ['#dbd2c4', '#b1a48f', '#82765f', '#534a39'], // weathered cedar
    ['#d6dee0', '#9eaeb4', '#6f8189', '#48595f'], // overcast sky
    ['#cad4cd', '#92a59c', '#637871', '#3e524b'], // fern
  ],
  london: [
    // brick + portland stone + slate: warm reds, creams, charcoal
    ['#e6dfd1', '#c0b39c', '#917f64', '#5a4a30'], // portland stone
    ['#e8d4c8', '#c69b8a', '#9c6c5b', '#683f31'], // london brick
    ['#dad2c4', '#a5998a', '#73685a', '#443a2d'], // mortar
    ['#e4dbcf', '#bba79d', '#896f64', '#54402c'], // sandstone
    ['#d8d0c4', '#a89c93', '#776b65', '#473c36'], // chimney soot
    ['#e0c8b8', '#b48970', '#834f3d', '#522715'], // terracotta brick
    ['#dcd5cd', '#aaa192', '#787161', '#48402f'], // tweed
    ['#e3dccf', '#b3a48f', '#82735f', '#52432d'], // hay
  ],
  tokyo: [
    // crisp whites, charcoal, soft accent. Modernist with a single neon.
    ['#f5f3ee', '#d8d4c9', '#a8a499', '#6d6963'],
    ['#ededeb', '#c8c6c2', '#94928e', '#5a5854'],
    ['#f4f0e8', '#cfc8b8', '#9b9384', '#615b4d'],
    ['#e8e4dc', '#bab3a4', '#857e6e', '#504a3c'],
    ['#f1ede5', '#d2cab9', '#9f9582', '#65594c'],
    // single bold accent palette (sakura)
    ['#f9e2e6', '#ee9aa6', '#c75d6e', '#7c2b3a'],
    // and an indigo accent
    ['#dde2eb', '#9ba7ba', '#5d6b80', '#2e3a4c'],
    ['#ebe7df', '#c4bcab', '#8c8270', '#544a3a'],
  ],
  miami: [
    // art deco: candy peach, mint, teal, hot pink, deco gold
    ['#ffe6d7', '#ffb09a', '#f47e5f', '#c44a2d'], // peach
    ['#dff5ec', '#92dac5', '#4ab59c', '#23866c'], // mint
    ['#daf0f3', '#8cd0d8', '#48a7b2', '#1d7a85'], // teal
    ['#ffe1ec', '#ff97b8', '#ed5d8b', '#b22d5f'], // hot pink
    ['#fff3d1', '#ffd884', '#e6b540', '#a8801b'], // deco gold
    ['#e9dff5', '#b6a1da', '#7e64b0', '#4d3878'], // lavender
    ['#ffe7d1', '#ffc488', '#e89b48', '#a36420'], // creamsicle
    ['#dff5f4', '#7fd4d1', '#3aa19e', '#177571'], // seafoam
  ],
  mono: [
    // grayscale, single accent — strongest readability
    ['#f5f3ed', '#d4d0c5', '#a59f93', '#6e695e'],
    ['#ecebe7', '#c6c4be', '#959288', '#5d5a52'],
    ['#dfddd6', '#b6b3aa', '#827e74', '#4d4940'],
    ['#e9e6df', '#beb9ad', '#88836f', '#4f4a3c'],
    ['#d8d5cd', '#a9a59a', '#74706a', '#43403a'],
    ['#f0eeea', '#d0cdc4', '#9f9b8e', '#6b675b'],
    // single warm accent
    ['#fce0d2', '#f0a282', '#c66a48', '#85391d'],
  ],
};

let PALETTES = PALETTE_THEMES.pastel;
const paletteFor = (i) => PALETTES[i % PALETTES.length];
const setPaletteTheme = (name) => {
  if (PALETTE_THEMES[name]) PALETTES = PALETTE_THEMES[name];
};

// ============================================================
export default function CityGrower() {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const rafRef = useRef(0);
  const lastTimeRef = useRef(0);
  const paperPatternRef = useRef(null);

  // Layer caches
  const groundCacheRef = useRef(null);     // {canvas, ctx, w, h, key}
  const roadsCacheRef = useRef(null);      // revealed road cells only
  const landCacheRef = useRef(null);
  const landFramesRef = useRef(0);
  const buildingsCacheRef = useRef(null);  // {canvas, ctx, w, h, dirtyCells: Set}
  const cacheKeyRef = useRef('');          // 'seed|yaw|zoom|w|h' -> invalidates everything
  const framesSinceRebuildRef = useRef(0);

  const [shape, setShape] = useState('circle');
  const [terrainAmp, setTerrainAmp] = useState(2.0);
  const [waterMode, setWaterMode] = useState('both'); // none | lake | river | both
  const [growthRate, setGrowthRate] = useState(6);
  const [maxSites, setMaxSites] = useState(3);
  const [growMode, setGrowMode] = useState('normal'); // 'normal' | 'isolated' | 'neighborhood'
  const [paletteName, setPaletteName] = useState('pastel');
  const [skin, setSkin] = useState('watercolor'); // watercolor | flat | outline | gradient | glass
  const [cycleSpeed, setCycleSpeed] = useState(0); // day/night auto-cycle removed; fixed time only
  const [carsEnabled, setCarsEnabled] = useState(true);
  // Light effects (building shadows, lamp, headlight and pedestrian glows).
  // Off by default because they are the heaviest thing the GPU draws.
  const [effectsOn, setEffectsOn] = useState(false);
  const effectsRef = useRef(false);
  const sunAngleRef = useRef(Math.PI * 0.25); // start mid-morning
  const lastSunRebuildRef = useRef(0);

  // ----- BLOCK PARTY MODE -----
  const [partyMode, setPartyMode] = useState(false);
  const [musicLoaded, setMusicLoaded] = useState(false);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [musicName, setMusicName] = useState('');
  const [musicVolume, setMusicVolume] = useState(0.7);

  const audioCtxRef = useRef(null);
  const audioSourceRef = useRef(null);
  const audioBufferRef = useRef(null);
  const audioGainRef = useRef(null);
  const analyserRef = useRef(null);
  const audioStartTimeRef = useRef(0);
  const audioOffsetRef = useRef(0);
  const fftDataRef = useRef(null);
  const audioFeaturesRef = useRef({
    rms: 0, bass: 0, mid: 0, treble: 0,
    bassPeak: 0, midPeak: 0, treblePeak: 0,
    beat: 0,
    bassAvg: 0,
    lastBeatTime: 0,
  });

  // Apply palette when name changes; invalidate cache so colors update.
  useEffect(() => {
    setPaletteTheme(paletteName);
    cacheKeyRef.current = ''; // forces full rebuild on next frame
  }, [paletteName]);

  // Cache must rebuild when skin changes too
  useEffect(() => {
    cacheKeyRef.current = '';
  }, [skin]);

  useEffect(() => {
    effectsRef.current = effectsOn;
    cacheKeyRef.current = '';
  }, [effectsOn]);

  // Party mode forces midnight (for the disco effect) and invalidates cache
  useEffect(() => {
    if (partyMode) {
      sunAngleRef.current = Math.PI; // midnight
      cacheKeyRef.current = '';
    }
  }, [partyMode]);
  const [running, setRunning] = useState(false);
  const [screen, setScreen] = useState('home'); // 'home' | 'city'
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e9));
  const [zoom, setZoom] = useState(1);
  const [yaw, setYaw] = useState(0);
  const [panel, setPanel] = useState(true);
  const [stats, setStats] = useState({ built: 0, sites: 0 });

  // --- init sim -----------------------------------------------
  const initSim = useCallback(() => {
    const rand = mulberry32(seed);
    const terrain = makeTerrain(seed, GRID, terrainAmp);
    const water = makeWater(seed, GRID, waterMode);

    const cells = new Uint8Array(GRID * GRID);
    const targetH = new Float32Array(GRID * GRID);
    const currentH = new Float32Array(GRID * GRID);
    const buildT = new Float32Array(GRID * GRID);
    const paletteIdx = new Uint8Array(GRID * GRID);
    const variance = new Float32Array(GRID * GRID);
    // Per-cell list of strata. Each entry: { h, palIdx }.
    // The bottom stratum covers 0..h[0], second covers h[0]..h[0]+h[1], etc.
    // Total target height = sum of all entries' h.
    const strata = new Array(GRID * GRID).fill(null);
    // Specials: map of ownerIdx -> { kind, size, palIdx, variance, ... }
    // Multi-cell specials mark non-owner cells in specialOwner.
    const specials = new Map();
    const specialOwner = new Int32Array(GRID * GRID).fill(-1);
    const buildDur = BUILD_DUR;

    // NOTE: roads are NOT pre-painted. The grid rule (isRoad) still
    // forbids buildings on those cells, but the road tile itself only
    // becomes visible (cell = 3) when a building is placed adjacent to it.

    // RAIL: one train line runs east to west along a mid-block row near the
    // center. Its land cells are reserved (cells = 4) so nothing builds on
    // them; road columns stay roads and become level crossings.
    const railR = GRID * 0.42;
    const railRowWater = (ry) => {
      let w = 0, n = 0;
      for (let x = 0; x < GRID; x++) {
        if (shapeScore(shape, x, ry, GRID / 2, GRID / 2, railR) <= -0.18) continue;
        n++;
        if (water[ry * GRID + x] === 1) w++;
      }
      return n ? w / n : 1;
    };
    let railY = Math.floor(GRID / 2) + ROAD_SPACING;
    while (railY % ROAD_SPACING !== 2) railY++;
    if (railRowWater(railY) > 0.5) railY -= 2 * ROAD_SPACING;
    let railX0 = GRID, railX1 = -1;
    for (let x = 0; x < GRID; x++) {
      if (shapeScore(shape, x, railY, GRID / 2, GRID / 2, railR) <= -0.18) continue;
      railX0 = Math.min(railX0, x);
      railX1 = Math.max(railX1, x);
      const ri = railY * GRID + x;
      if (!isRoad(x, railY) && water[ri] !== 1) cells[ri] = 4;
    }

    // First site: snap to a non-road, non-water cell near center
    let sx = Math.floor(GRID / 2);
    let sy = Math.floor(GRID / 2);
    let guard = 0;
    while ((isRoad(sx, sy) || water[sy * GRID + sx] !== 0 || sy === railY) && guard < GRID) {
      sx++;
      if (sx >= GRID) { sx = 0; sy++; }
      guard++;
    }
    const sites = [{ x: sx, y: sy, age: 0 }];

    stateRef.current = {
      rand, terrain, water, cells, targetH, currentH, buildT, paletteIdx, variance, strata, specials, specialOwner, buildDur,
      sites, cx: GRID / 2, cy: GRID / 2, r: GRID * 0.42, accumGrow: 0, built: 0,
      newlySettled: [],
      newlyUpgrown: [],
      newlyRevealedRoads: [],
      liveCount: 0,
      isolatedRelaxed: false,
      cars: [],
      carSpawnAccum: 0,
      peds: [],
      pedSpawnAccum: 0,
      lamps: [],
      airport: null,
      planes: [],
      planeSpawnAccum: 0,
      farms: new Map(),
      farmsDirty: true,
      boats: [],
      boatSpawnAccum: 0,
      docks: [],                // {x, y} dock platform anchor cells
      railY, railX0, railX1,
      train: null,
      ship: null,
      shipSpawnAccum: 0,
      stadium: null,
      bridges: new Set(),       // idx of water cells that are bridge decks
      bridgeSpans: [],          // [{cells:[idx], a:{x,y}, b:{x,y}, horizontal, len}]
    };

    computeBridgeNetwork(stateRef.current, sx, sy);

    computeDocks(stateRef.current);

    cacheKeyRef.current = '';
  }, [seed, terrainAmp, waterMode]);

  useEffect(() => { initSim(); }, [initSim]);

  // Reset isolatedRelaxed when switching modes
  useEffect(() => {
    if (stateRef.current) stateRef.current.isolatedRelaxed = false;
  }, [growMode]);

  // --- growth -------------------------------------------------
  const stepGrowth = useCallback((dt) => {
    const s = stateRef.current;
    if (!s) return;
    s.accumGrow += dt * growthRate;

    // Effective max sites per mode.
    // - neighborhood: only ever 1 site at a time, no new ones until current dies
    // - isolated: same as normal but with isolated rule (handled in placeBuilding)
    // - normal: respect user maxSites slider
    const effectiveMaxSites = growMode === 'neighborhood' ? 1 : maxSites;

    while (s.accumGrow >= 1) {
      s.accumGrow -= 1;

      const fullness = s.built / (GRID * GRID * 0.4);
      const wantTaller = s.rand() < (UPGROWTH_PROB * Math.min(1, fullness * 2));
      if (wantTaller && growTaller(s)) continue;

      // Sideways spreading
      let anyPlaced = false;
      for (let si = 0; si < s.sites.length; si++) {
        const site = s.sites[si];
        const idx0 = site.y * GRID + site.x;
        if (s.cells[idx0] === 0) {
          if (placeBuilding(s, site.x, site.y)) anyPlaced = true;
        }
        const next = pickNextCell(s, site, shape);
        if (next) { site.x = next.x; site.y = next.y; site.age++; }
        else { s.sites.splice(si, 1); si--; }
      }

      // Isolated-mode relaxation check: if we couldn't place anything
      // AND no sites are active, check if any isolated spots exist at all.
      // If not, flip the rule off so growth can resume normally.
      if (growMode === 'isolated' && !s.isolatedRelaxed && !anyPlaced && s.sites.length === 0) {
        if (!anyIsolatedSpotsLeft(s)) {
          s.isolatedRelaxed = true;
        }
      }

      // Spawn new growth sites from a boundary cell adjacent to existing
      // development. The city grows around water and never crosses it.
      if (s.sites.length < effectiveMaxSites && s.rand() < 0.04) {
        const seedCell = findBoundaryCell(s);
        if (seedCell) s.sites.push({ x: seedCell.x, y: seedCell.y, age: 0 });
      }

      // REVIVE: if growth stalls with no active sites, try to find any
      // boundary cell so it doesn't sit dead. If the city has genuinely
      // filled its landmass (water on all sides), it simply stops — that's
      // the city reaching its natural shoreline limit.
      if (s.sites.length === 0) {
        const revive = findBoundaryCell(s);
        if (revive) {
          s.sites.push({ x: revive.x, y: revive.y, age: 0 });
        }
      }

      // FOLLOW THE BRIDGE NETWORK: open any planned span whose near end
      // the city has reached, and seed growth on the far bank.
      if (s.bridgeSpans && s.bridgeSpans.length && s.rand() < 0.08) {
        const seed = followBridgeNetwork(s);
        if (seed) s.sites.push({ x: seed.x, y: seed.y, age: 0 });
      }
    }
  }, [shape, growthRate, maxSites, growMode]);

  // 10 special building kinds
  const SPECIAL_KINDS = [
    'marquee', 'pipelights', 'balcony', 'pyramid', 'dome',
    'spire', 'crown', 'striped', 'clock', 'penthouse',
    // new in v16
    'crane', 'vaulted', 'barn', 'mansard', 'stepped',
    // new: low-rise commercial + green space
    'stripmall', 'park',
    // new: residential conversions from farmland
    'neighborhood', 'apartment',
  ];

  // Try to spawn a special at (x,y). Returns the size (1, 2, or 4) if
  // success, or 0 if not eligible. Does NOT modify state -- caller decides.
  function tryEligibleSpecialSize(s, x, y) {
    if (s.rand() > 0.04) return 0; // base rate ~4% of new buildings
    // Choose target size weighted: small most common
    const r = s.rand();
    let targetSize = 1;
    if (r > 0.85) targetSize = 4;
    else if (r > 0.6) targetSize = 2;

    if (targetSize === 1) return 1;

    // Check footprint: cells must all exist, all be empty (cells[i]===0),
    // all non-road, all inside shape bounds with positive score.
    for (let dy = 0; dy < targetSize; dy++) {
      for (let dx = 0; dx < targetSize; dx++) {
        const cx = x + dx, cy = y + dy;
        if (cx < 0 || cy < 0 || cx >= GRID || cy >= GRID) return 1; // fall back to small
        if (isRoad(cx, cy)) return 1;
        if (s.cells[cy * GRID + cx] !== 0) return 1;
        if (shapeScore(shape, cx, cy, s.cx, s.cy, s.r) <= 0) return 1;
      }
    }
    return targetSize;
  }

  // ----- LOW-RISE PLACEMENT BIAS ----------------------------
  // Strip malls and parks belong on the outskirts of the city, in fresh
  // blocks, ideally adjacent to a road. This helper computes a
  // probability multiplier for a low-rise special at (x,y).
  // Returns a number in [0, ~3]; 0 means "definitely not here".
  function lowRiseScore(s, x, y) {
    // 1. Radial: 0 at city center, peaks at ~70% of city radius, then
    //    falls off at the edge. Strip malls thrive in the outer ring.
    const dxC = (x + 1) - s.cx;
    const dyC = (y + 1) - s.cy;
    const dist = Math.sqrt(dxC * dxC + dyC * dyC);
    const nDist = dist / Math.max(1, s.r);
    let radial;
    if (nDist < 0.25) radial = 0.1;            // city core: rare but possible
    else if (nDist < 0.5) radial = 0.5;
    else if (nDist < 0.85) radial = 1.6;       // suburb ring: strongly preferred
    else radial = 0.8;                          // far edge: fewer roads here

    // 2. Block-relative position: prefer the corner of a block, adjacent
    //    to a road. ROAD_SPACING is 5; cells 1,2,3,4 between roads.
    //    Corners (1 or 4) front directly onto two roads (great for storefronts).
    const bx = ((x % ROAD_SPACING) + ROAD_SPACING) % ROAD_SPACING;
    const by = ((y % ROAD_SPACING) + ROAD_SPACING) % ROAD_SPACING;
    const isCorner = (bx === 1 || bx === ROAD_SPACING - 1) &&
                     (by === 1 || by === ROAD_SPACING - 1);
    const isEdge = bx === 1 || bx === ROAD_SPACING - 1 ||
                   by === 1 || by === ROAD_SPACING - 1;
    const blockPos = isCorner ? 1.8 : isEdge ? 1.2 : 0.4;

    // 3. Block freshness: how many of the 2x2 footprint cells are empty?
    //    Mostly empty = great. Mostly built = abort.
    let emptyCount = 0;
    for (let dy = 0; dy < 2; dy++) {
      for (let dx = 0; dx < 2; dx++) {
        const cx = x + dx, cy = y + dy;
        if (cx < 0 || cy < 0 || cx >= GRID || cy >= GRID) continue;
        if (isRoad(cx, cy)) continue;
        if (s.cells[cy * GRID + cx] === 0) emptyCount++;
      }
    }
    if (emptyCount < 4) return 0; // need full empty 2x2

    return radial * blockPos;
  }

  // Should we PRE-EMPT this placement with a strip mall / park instead of
  // letting a normal special or building roll? Called when a 2x2 fits.
  // Returns 'stripmall', 'park', or null.
  function maybeLowRiseKind(s, x, y) {
    const score = lowRiseScore(s, x, y);
    if (score <= 0) return null;
    // base 12% chance, scaled by score. So a corner outskirts block has
    // ~12% * 1.6 * 1.8 = ~35%. A city-core mid-block has ~12% * 0.1 * 0.4 = ~0.5%.
    const p = 0.12 * score;
    if (s.rand() >= p) return null;
    // Parks are about 1/3 as common as strip malls
    return s.rand() < 0.25 ? 'park' : 'stripmall';
  }

  // ===================================================================
  // BRIDGE NETWORK — planned infrastructure, computed once at init.
  // ===================================================================
  // Bridges are decided up front as a spanning network over landmasses,
  // not reactively during growth. Guarantees: shortest spans, exactly one
  // bridge per region-pair (no redundancy), zero intersecting bridges (by
  // construction), and unreachable islands left unconnected.
  function computeBridgeNetwork(s, startX, startY) {
    if (!s.water) return;
    const W = s.water;
    const isLand = (x, y) =>
      x >= 0 && y >= 0 && x < GRID && y < GRID && W[y * GRID + x] !== 1; // land or sand
    const isWater = (x, y) =>
      x >= 0 && y >= 0 && x < GRID && y < GRID && W[y * GRID + x] === 1;

    // 1) Flood-fill land into regions. region[idx] = region id (-1 = water).
    const region = new Int32Array(GRID * GRID).fill(-1);
    let regionCount = 0;
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        const idx = y * GRID + x;
        if (region[idx] !== -1) continue;
        if (!isLand(x, y)) continue;
        // BFS flood
        const id = regionCount++;
        const stack = [idx];
        region[idx] = id;
        while (stack.length) {
          const ci = stack.pop();
          const cx = ci % GRID, cy = Math.floor(ci / GRID);
          const nb = [[1,0],[-1,0],[0,1],[0,-1]];
          for (const [dx, dy] of nb) {
            const nx = cx + dx, ny = cy + dy;
            if (!isLand(nx, ny)) continue;
            const nIdx = ny * GRID + nx;
            if (region[nIdx] !== -1) continue;
            region[nIdx] = id;
            stack.push(nIdx);
          }
        }
      }
    }
    if (regionCount <= 1) return; // single landmass, no bridges needed

    const rootRegion = region[startY * GRID + startX];
    if (rootRegion === -1) return;

    // 2) Find all legal crossings: straight cardinal spans of water,
    //    length within cap, with land at both ends in DIFFERENT regions.
    const maxLen = 2 * ROAD_SPACING; // length cap (≈2 blocks)
    const crossings = [];
    const scanLine = (cells) => {
      // cells: array of {x,y} along one row or column, in order
      let i = 0;
      while (i < cells.length) {
        // find a land cell
        if (!isLand(cells[i].x, cells[i].y)) { i++; continue; }
        const startLand = cells[i];
        // skip to the end of this land run
        let j = i;
        while (j < cells.length && isLand(cells[j].x, cells[j].y)) j++;
        // now cells[j..] begins a water run (if any)
        if (j >= cells.length) break;
        let k = j;
        while (k < cells.length && isWater(cells[k].x, cells[k].y)) k++;
        // cells[k] is the next land (far side), if in bounds
        if (k < cells.length && isLand(cells[k].x, cells[k].y)) {
          const span = k - j; // number of water cells
          const aLand = cells[j - 1];   // land cell just before water
          const bLand = cells[k];       // land cell just after water
          const ra = region[aLand.y * GRID + aLand.x];
          const rb = region[bLand.y * GRID + bLand.x];
          const inShape = shapeScore(shape, aLand.x, aLand.y, s.cx, s.cy, s.r) > 0 &&
                          shapeScore(shape, bLand.x, bLand.y, s.cx, s.cy, s.r) > 0;
          const touchesRail = s.railY !== undefined &&
            (aLand.y === s.railY || bLand.y === s.railY ||
             (cells[0].x === cells[cells.length - 1].x &&
              Math.min(aLand.y, bLand.y) < s.railY && Math.max(aLand.y, bLand.y) > s.railY));
          if (!touchesRail && inShape && span >= 1 && span <= maxLen && ra !== rb && ra !== -1 && rb !== -1) {
            const waterCells = [];
            for (let w = j; w < k; w++) waterCells.push(cells[w].y * GRID + cells[w].x);
            crossings.push({
              cells: waterCells, len: span,
              a: { x: aLand.x, y: aLand.y }, b: { x: bLand.x, y: bLand.y },
              ra, rb,
              horizontal: cells[0].y === cells[cells.length - 1].y,
            });
          }
        }
        i = k; // continue scanning from far land
      }
    };
    // scan every row and every column
    for (let y = 0; y < GRID; y++) {
      const row = [];
      for (let x = 0; x < GRID; x++) row.push({ x, y });
      scanLine(row);
    }
    for (let x = 0; x < GRID; x++) {
      const col = [];
      for (let y = 0; y < GRID; y++) col.push({ x, y });
      scanLine(col);
    }
    if (crossings.length === 0) return;

    // 3) Sort by length (shortest first), then build a spanning network.
    // Shortest span first; among equal lengths, the one closest to the
    // city center wins so bridges land where the city will reach them.
    const centerDist = (c) => {
      const mx = (c.a.x + c.b.x) / 2 - s.cx, my = (c.a.y + c.b.y) / 2 - s.cy;
      return Math.sqrt(mx * mx + my * my);
    };
    crossings.sort((p, q) => (p.len - q.len) || (centerDist(p) - centerDist(q)));

    // Union-Find over regions to avoid redundant bridges between the same
    // already-connected pair.
    const parent = new Array(regionCount);
    for (let i = 0; i < regionCount; i++) parent[i] = i;
    const find = (a) => { while (parent[a] !== a) { parent[a] = parent[parent[a]]; a = parent[a]; } return a; };
    const union = (a, b) => { parent[find(a)] = find(b); };

    // Geometric intersection test: does this span overlap any committed one?
    // Bridges are axis-aligned 1-cell-wide segments; two intersect if their
    // covered cell sets share a cell OR they cross perpendicularly through a
    // shared cell. Simplest robust check: do their occupied water cells (plus
    // a 1-cell halo) overlap?
    const committedCells = new Set();
    const spanConflicts = (cross) => {
      for (const idx of cross.cells) {
        const cx = idx % GRID, cy = Math.floor(idx / GRID);
        // check the cell and its 4-neighbors against committed cells
        if (committedCells.has(idx)) return true;
        const nb = [[1,0],[-1,0],[0,1],[0,-1]];
        for (const [dx, dy] of nb) {
          const nIdx = (cy + dy) * GRID + (cx + dx);
          if (committedCells.has(nIdx)) return true;
        }
      }
      return false;
    };

    for (const cross of crossings) {
      if (find(cross.ra) === find(cross.rb)) continue; // already connected
      if (spanConflicts(cross)) continue;              // would intersect another bridge
      // commit
      union(cross.ra, cross.rb);
      for (const idx of cross.cells) {
        s.bridges.add(idx);
        committedCells.add(idx);
      }
      s.bridgeSpans.push(cross);
    }

    // EXTRA BRIDGES: beyond the minimum network, add a few more crossings
    // so a long river gets several bridges. Each must still be a legal,
    // non-intersecting span and sit well apart from every other bridge.
    const MAX_EXTRA = 5;
    const MIN_SEP = 9;
    const mid = (c) => ({ x: (c.a.x + c.b.x) / 2, y: (c.a.y + c.b.y) / 2 });
    let extra = 0;
    for (const cross of crossings) {
      if (extra >= MAX_EXTRA) break;
      if (s.bridgeSpans.includes(cross)) continue;
      if (spanConflicts(cross)) continue;
      const m = mid(cross);
      let farEnough = true;
      for (const b of s.bridgeSpans) {
        const bm = mid(b);
        if (Math.hypot(bm.x - m.x, bm.y - m.y) < MIN_SEP) { farEnough = false; break; }
      }
      if (!farEnough) continue;
      for (const idx of cross.cells) {
        s.bridges.add(idx);
        committedCells.add(idx);
      }
      s.bridgeSpans.push(cross);
      extra++;
    }
  }

  // Docks: small piers on the water edge near where the city is likely to
  // grow. We place a few at random water-adjacent land cells. Each dock
  // gets a boat that bobs nearby.
  function computeDocks(s) {
    if (!s.water) return;
    const candidates = [];
    for (let y = 1; y < GRID - 1; y++) {
      for (let x = 1; x < GRID - 1; x++) {
        // land (or sand) cell that borders water, inside the shape
        const idx = y * GRID + x;
        if (s.water[idx] === 1) continue;
        if (y === s.railY) continue;
        if (shapeScore(shape, x, y, s.cx, s.cy, s.r) <= 0) continue;
        // adjacent to water?
        let waterDir = null;
        const nb = [[1,0],[-1,0],[0,1],[0,-1]];
        for (const [dx, dy] of nb) {
          if (s.water[(y + dy) * GRID + (x + dx)] === 1) { waterDir = { dx, dy }; break; }
        }
        if (waterDir) candidates.push({ x, y, dir: waterDir });
      }
    }
    // pick up to 4 spaced-out docks
    const chosen = [];
    const minDist = 6;
    // shuffle deterministically
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(s.rand() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
    for (const c of candidates) {
      if (chosen.length >= 4) break;
      let ok = true;
      for (const d of chosen) {
        const dd = Math.hypot(d.x - c.x, d.y - c.y);
        if (dd < minDist) { ok = false; break; }
      }
      if (ok) chosen.push(c);
    }
    s.docks = chosen;
  }

  function placeBuilding(s, x, y) {
    if (x < 0 || y < 0 || x >= GRID || y >= GRID) return false;
    if (isRoad(x, y)) return false;
    const idx = y * GRID + x;
    if (s.cells[idx] !== 0) return false;
    // Cannot build on open water. Sand (beach, water===2) IS buildable so
    // the city can expand onto beaches along the shoreline.
    if (s.water && s.water[idx] === 1) return false;

    const score = shapeScore(shape, x, y, s.cx, s.cy, s.r);
    if (score <= 0) return false;

    if (growMode === 'isolated' && !s.isolatedRelaxed) {
      for (const n of NEIGHBORS) {
        const nx = x + n.dx, ny = y + n.dy;
        if (nx < 0 || ny < 0 || nx >= GRID || ny >= GRID) continue;
        const c = s.cells[ny * GRID + nx];
        if (c === 1 || c === 2) return false;
      }
    }

    if (s.liveCount >= MAX_LIVE_BUILDS) return false;

    // FARM CONVERSION: was this cell a farm? If so, build a residential
    // structure: planned neighborhood (2x2 of uniform houses) or apartment
    // block (single mid-rise).
    const wasFarm = s.farms.has(idx);
    let farmPreempt = null;
    if (wasFarm) {
      let canBe2x2 = true;
      for (let dy = 0; dy < 2 && canBe2x2; dy++) {
        for (let dx = 0; dx < 2 && canBe2x2; dx++) {
          const cx = x + dx, cy = y + dy;
          if (cx < 0 || cy < 0 || cx >= GRID || cy >= GRID) { canBe2x2 = false; break; }
          if (isRoad(cx, cy)) { canBe2x2 = false; break; }
          if (s.cells[cy * GRID + cx] !== 0) { canBe2x2 = false; break; }
          if (shapeScore(shape, cx, cy, s.cx, s.cy, s.r) <= 0) { canBe2x2 = false; break; }
        }
      }
      farmPreempt = (canBe2x2 && s.rand() < 0.6) ? 'neighborhood' : 'apartment';
    }

    // ---- LOW-RISE PRE-EMPTION ----
    // Before the normal special roll, check if this spot is a strong
    // strip mall / park candidate. If so, place that instead — this
    // prevents towers from stealing all the 2x2 outskirts blocks.
    let preempted = null;
    {
      // Need full 2x2 footprint inside city bounds + score
      let ok = true;
      for (let dy = 0; dy < 2 && ok; dy++) {
        for (let dx = 0; dx < 2 && ok; dx++) {
          const cx = x + dx, cy = y + dy;
          if (cx < 0 || cy < 0 || cx >= GRID || cy >= GRID) { ok = false; break; }
          if (isRoad(cx, cy)) { ok = false; break; }
          if (s.cells[cy * GRID + cx] !== 0) { ok = false; break; }
          if (shapeScore(shape, cx, cy, s.cx, s.cy, s.r) <= 0) { ok = false; break; }
        }
      }
      if (ok) preempted = maybeLowRiseKind(s, x, y);
    }

    // Farm conversion overrides low-rise preempt
    if (farmPreempt) preempted = farmPreempt;

    // Decide if this is a special and what size
    let specialSize, isSpecial, finalSize;
    if (preempted === 'apartment') {
      specialSize = 1;
      isSpecial = true;
      finalSize = 1;
    } else if (preempted) {
      specialSize = 2;
      isSpecial = true;
      finalSize = 2;
    } else {
      specialSize = tryEligibleSpecialSize(s, x, y);
      isSpecial = specialSize > 0 && s.rand() < (specialSize === 1 ? 1 : 0.85);
      finalSize = isSpecial ? specialSize : 1;
    }

    // Specials get a taller base + boosted target height.
    // Low-rise (stripmall/park/neighborhood) stay low. Apartments mid-rise.
    const baseH = (preempted === 'stripmall' || preempted === 'park' || preempted === 'neighborhood')
      ? BASE_HEIGHT * (0.5 + score * 0.2 + s.rand() * 0.2)
      : preempted === 'apartment'
        ? BASE_HEIGHT * (1.6 + score * 0.5 + s.rand() * 0.4)
        : isSpecial
          ? BASE_HEIGHT * (1.5 + score * 0.8 + s.rand() * 0.5)
          : BASE_HEIGHT * (0.7 + score * 0.6 + s.rand() * 0.3);

    // palette inheritance
    let neighborPalette = -1;
    for (const n of NEIGHBORS) {
      const nx = x + n.dx, ny = y + n.dy;
      if (nx < 0 || ny < 0 || nx >= GRID || ny >= GRID) continue;
      const nIdx = ny * GRID + nx;
      if (s.cells[nIdx] === 2 && s.specialOwner[nIdx] === -1) {
        neighborPalette = s.paletteIdx[nIdx];
        break;
      }
    }
    const palIdx = neighborPalette >= 0 && s.rand() < 0.6
      ? neighborPalette
      : Math.floor(s.rand() * PALETTES.length);

    // Special: pick a random kind. Multi-cell specials avoid the
    // really-detailed kinds (clock, marquee with text) since the text
    // looks weird at large size. Prefer architectural kinds for big.
    let specialKind = null;
    if (isSpecial) {
      if (preempted) {
        specialKind = preempted;
      } else if (finalSize >= 2) {
        // Strip malls and parks are now handled by pre-emption only,
        // so leave them out of the architectural pool.
        const archKinds = [
          'pyramid', 'dome', 'crown', 'pipelights', 'balcony', 'striped', 'penthouse',
          'crane', 'vaulted', 'barn', 'mansard', 'stepped',
        ];
        specialKind = archKinds[Math.floor(s.rand() * archKinds.length)];
      } else {
        // single-cell specials: exclude wide-only / preempt-only kinds
        const singleKinds = SPECIAL_KINDS.filter(k =>
          k !== 'stripmall' && k !== 'park' &&
          k !== 'neighborhood' && k !== 'apartment');
        specialKind = singleKinds[Math.floor(s.rand() * singleKinds.length)];
      }
    }

    // Fill all cells in footprint
    for (let dy = 0; dy < finalSize; dy++) {
      for (let dx = 0; dx < finalSize; dx++) {
        const cx = x + dx, cy = y + dy;
        const cIdx = cy * GRID + cx;
        s.targetH[cIdx] = 0;
        s.currentH[cIdx] = 0;
        s.buildT[cIdx] = 0;
        s.paletteIdx[cIdx] = palIdx;
        s.variance[cIdx] = s.rand();
        s.strata[cIdx] = null;
        // Non-owner cells: marked as building (so growth treats them
        // as occupied), pointed at the owner via specialOwner.
        if (dx === 0 && dy === 0) {
          s.specialOwner[cIdx] = -1; // self-owner
        } else {
          s.specialOwner[cIdx] = idx; // owned by owner cell
        }
        s.cells[cIdx] = 1; // animating
      }
    }

    // Owner cell carries the target height + strata + special info
    s.targetH[idx] = baseH;
    if (!isSpecial) {
      s.strata[idx] = [{ h: baseH, palIdx }];
    }
    if (specialKind) {
      s.specials.set(idx, {
        kind: specialKind,
        size: finalSize,
        palIdx,
        variance: s.variance[idx],
        accentPalIdx: Math.floor(s.rand() * PALETTES.length),
      });
      // Parks get small lamps registered as glow sources, so the
      // existing nighttime lamp-glow pass lights them up automatically.
      // Positions match the four inset corners drawn inside drawPark.
      if (specialKind === 'park') {
        const inset = 0.55;
        const positions = [
          [x + inset,             y + inset],
          [x + finalSize - inset, y + inset],
          [x + inset,             y + finalSize - inset],
          [x + finalSize - inset, y + finalSize - inset],
        ];
        for (const [px, py] of positions) {
          s.lamps.push({ x: px, y: py, small: true });
        }
      }
    }

    s.liveCount++;
    s.built++;

    // Once-only: build the airport at exactly 1005 buildings.
    if (!s.stadium && s.built >= 300 && s.built % 15 === 0) {
      tryPlaceStadium(s);
    }
    if (s.built === 1005 && !s.airport) {
      tryPlaceAirport(s);
    }

    // Reveal adjacent reserved-road cells around the entire footprint
    for (let dy = 0; dy < finalSize; dy++) {
      for (let dx = 0; dx < finalSize; dx++) {
        const cx = x + dx, cy = y + dy;
        for (let n = 0; n < 4; n++) {
          const nx = cx + NEIGHBORS[n].dx;
          const ny = cy + NEIGHBORS[n].dy;
          if (nx < 0 || ny < 0 || nx >= GRID || ny >= GRID) continue;
          if (isRoad(nx, ny)) revealRoadAt(s, nx, ny);
          // Reveal an adjacent bridge deck and the whole span it belongs to,
          // so the bridge "lights up" as the city reaches it.
          else if (s.bridges && s.bridges.has(ny * GRID + nx)) {
            revealBridgeSpan(s, nx, ny);
          }
        }
      }
    }

    // Consume farms under the footprint and trigger a farms recompute
    // (border farms may be obsoleted by this new building).
    if (s.farms.size > 0) {
      let any = false;
      for (let dy = 0; dy < finalSize; dy++) {
        for (let dx = 0; dx < finalSize; dx++) {
          if (s.farms.delete((y + dy) * GRID + (x + dx))) any = true;
        }
      }
      if (any || wasFarm) s.farmsDirty = true;
    }

    return true;
  }

  // Reveal a road cell at (rx, ry), and cascade to fill any intersection
  // that lies adjacent to the newly-revealed cell. An intersection is a
  // cell where BOTH (x % ROAD_SPACING === 0) and (y % ROAD_SPACING === 0).
  // We also cascade through intersections so a revealed segment near a
  // corner fills the whole intersection node.
  function revealRoadAt(s, rx, ry) {
    if (rx < 0 || ry < 0 || rx >= GRID || ry >= GRID) return;
    if (!isRoad(rx, ry)) return;
    const ridx = ry * GRID + rx;
    if (s.cells[ridx] !== 0) return;
    // Don't pave over water — roads stop at the shoreline.
    if (s.water && s.water[ridx] === 1) return;
    s.cells[ridx] = 3;
    s.newlyRevealedRoads.push(ridx);
    // After revealing a road segment, check its 4 cardinal neighbors:
    // any intersection cell that is still hidden adjacent to a now-revealed
    // road should fill in too. This handles the gap at intersection corners.
    for (let n = 0; n < 4; n++) {
      const nx = rx + NEIGHBORS[n].dx;
      const ny = ry + NEIGHBORS[n].dy;
      if (nx < 0 || ny < 0 || nx >= GRID || ny >= GRID) continue;
      if (!isRoad(nx, ny)) continue;
      const nIdx = ny * GRID + nx;
      if (s.cells[nIdx] !== 0) continue;
      // Only auto-reveal if it's an intersection node.
      const isIntersection = (nx % ROAD_SPACING === 0) && (ny % ROAD_SPACING === 0);
      if (!isIntersection) continue;
      // Recurse: revealing this intersection may in turn need to fill
      // adjacent cells on the OTHER side of the intersection. By using
      // the same helper we let the cascade extend one cell further --
      // this fills the through-segment that exits the intersection on
      // the opposite axis so the intersection "connects".
      revealRoadAt(s, nx, ny);
    }
  }

  // Reveal an entire committed bridge span (mark its water-deck cells as
  // revealed road so they render as bridge deck). Triggered when the city
  // reaches either end of the bridge.
  function revealBridgeSpan(s, bx, by) {
    if (!s.bridgeSpans) return;
    const idx = by * GRID + bx;
    for (const span of s.bridgeSpans) {
      if (!span.cells.includes(idx)) continue;
      if (span.revealed) return;
      span.revealed = true;
      for (const cidx of span.cells) {
        if (s.cells[cidx] === 0) {
          s.cells[cidx] = 3;
          s.newlyRevealedRoads.push(cidx);
        }
      }
      return;
    }
  }

  // Walks the planned bridge network. For each span not yet opened, if
  // development (building or revealed road) sits within reach of one end,
  // open the whole deck, pave the land ends, and return a buildable cell
  // on the far bank to seed growth there. Returns {x,y} or null.
  function followBridgeNetwork(s) {
    const REACH = 3;
    const devNear = (cx, cy) => {
      for (let dy = -REACH; dy <= REACH; dy++) {
        for (let dx = -REACH; dx <= REACH; dx++) {
          const tx = cx + dx, ty = cy + dy;
          if (tx < 0 || ty < 0 || tx >= GRID || ty >= GRID) continue;
          const v = s.cells[ty * GRID + tx];
          if (v === 2 || v === 3) return true;
        }
      }
      return false;
    };
    // nearest buildable cell around (cx, cy), searching outward
    const buildableNear = (cx, cy) => {
      for (let r = 0; r <= 3; r++) {
        for (let dy = -r; dy <= r; dy++) {
          for (let dx = -r; dx <= r; dx++) {
            if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
            const tx = cx + dx, ty = cy + dy;
            if (tx < 0 || ty < 0 || tx >= GRID || ty >= GRID) continue;
            const ti = ty * GRID + tx;
            if (s.cells[ti] !== 0) continue;
            if (isRoad(tx, ty)) continue;
            if (s.water[ti] === 1) continue;
            if (shapeScore(shape, tx, ty, s.cx, s.cy, s.r) <= 0) continue;
            return { x: tx, y: ty };
          }
        }
      }
      return null;
    };
    for (const span of s.bridgeSpans) {
      if (span.revealed) continue;
      const aDev = devNear(span.a.x, span.a.y);
      const bDev = devNear(span.b.x, span.b.y);
      if (!aDev && !bDev) continue;
      const far = aDev ? span.b : span.a;
      const target = buildableNear(far.x, far.y);
      if (!target) continue;
      // open the deck and pave both land ends
      span.revealed = true;
      for (const cidx of span.cells) {
        if (s.cells[cidx] === 0) {
          s.cells[cidx] = 3;
          s.newlyRevealedRoads.push(cidx);
        }
      }
      for (const end of [span.a, span.b]) {
        const ei = end.y * GRID + end.x;
        if (s.cells[ei] === 0 && s.water[ei] !== 1) {
          s.cells[ei] = 3;
          s.newlyRevealedRoads.push(ei);
        }
      }
      return target;
    }
    return null;
  }

  // ----- AIRPORT --------------------------------------------------
  // Once the city reaches 1005 buildings, search for a clear-ish strip
  // of land on the outskirts and plant an airport. The airport occupies
  // a 12x4 footprint with two parallel runways and a terminal building.
  // ----- STADIUM --------------------------------------------------
  // Once the city has some size, claim one whole empty city block (the
  // 4x4 interior between roads) touching development and build a stadium.
  function tryPlaceStadium(s) {
    const cand = [];
    for (let by = 0; by + ROAD_SPACING < GRID; by += ROAD_SPACING) {
      for (let bx = 0; bx + ROAD_SPACING < GRID; bx += ROAD_SPACING) {
        let ok = true;
        for (let dy = 1; dy < ROAD_SPACING && ok; dy++) {
          for (let dx = 1; dx < ROAD_SPACING && ok; dx++) {
            const cx = bx + dx, cy = by + dy;
            const i = cy * GRID + cx;
            if (s.cells[i] !== 0) ok = false;
            else if (s.water[i] === 1) ok = false;
            else if (shapeScore(shape, cx, cy, s.cx, s.cy, s.r) <= 0) ok = false;
          }
        }
        if (!ok) continue;
        // must touch development on the surrounding road ring
        let dev = false;
        for (let k = 0; k <= ROAD_SPACING && !dev; k++) {
          const ring = [[bx + k, by], [bx + k, by + ROAD_SPACING], [bx, by + k], [bx + ROAD_SPACING, by + k]];
          for (const [rx, ry] of ring) {
            if (rx < 0 || ry < 0 || rx >= GRID || ry >= GRID) continue;
            const v = s.cells[ry * GRID + rx];
            if (v === 2 || v === 3) { dev = true; break; }
          }
        }
        if (dev) cand.push({ bx, by });
      }
    }
    if (!cand.length) return;
    const pick = cand[Math.floor(s.rand() * cand.length)];
    const ox = pick.bx + 1, oy = pick.by + 1;
    const ownerIdx = oy * GRID + ox;
    const size = ROAD_SPACING - 1;
    for (let dy = 0; dy < size; dy++) {
      for (let dx = 0; dx < size; dx++) {
        const i = (oy + dy) * GRID + (ox + dx);
        s.cells[i] = 2;
        s.specialOwner[i] = ownerIdx;
        s.currentH[i] = 0.6;
        s.targetH[i] = 0.6;
        s.farms.delete(i);
        s.newlySettled.push(i);
      }
    }
    s.specialOwner[ownerIdx] = -1;
    s.specials.set(ownerIdx, {
      kind: 'stadium', size, palIdx: 0, variance: s.rand(), accentPalIdx: 0,
    });
    s.stadium = { x: ox, y: oy, size };
    s.farmsDirty = true;
    s.landDirty = true;
    for (let k = 0; k <= ROAD_SPACING; k++) {
      revealRoadAt(s, pick.bx + k, pick.by);
      revealRoadAt(s, pick.bx + k, pick.by + ROAD_SPACING);
      revealRoadAt(s, pick.bx, pick.by + k);
      revealRoadAt(s, pick.bx + ROAD_SPACING, pick.by + k);
    }
  }

  function tryPlaceAirport(s) {
    const W = 12, H = 4;
    // Score every candidate top-left position by:
    //   1. how many cells in its footprint are currently empty
    //   2. how far it is from city center (we want it outside the core)
    //   3. flatness of terrain underneath
    let best = null;
    let bestScore = -Infinity;
    for (let y = 1; y < GRID - H - 1; y++) {
      for (let x = 1; x < GRID - W - 1; x++) {
        let emptyCount = 0;
        let inShape = 0;
        let elevMin = Infinity, elevMax = -Infinity;
        for (let dy = 0; dy < H; dy++) {
          for (let dx = 0; dx < W; dx++) {
            const cx = x + dx, cy = y + dy;
            const idx = cy * GRID + cx;
            if (shapeScore(shape, cx, cy, s.cx, s.cy, s.r) > 0) inShape++;
            if (s.cells[idx] === 0) emptyCount++;
            const e = s.terrain[idx];
            if (e < elevMin) elevMin = e;
            if (e > elevMax) elevMax = e;
          }
        }
        if (inShape < W * H * 0.7) continue;
        if (s.railY >= y && s.railY < y + H) continue;
        const dxC = (x + W / 2) - s.cx;
        const dyC = (y + H / 2) - s.cy;
        const dist = Math.sqrt(dxC * dxC + dyC * dyC) / Math.max(1, s.r);
        const score = emptyCount * 3
                    + dist * 25
                    - (elevMax - elevMin) * 30;
        if (score > bestScore) {
          bestScore = score;
          best = { x, y };
        }
      }
    }
    if (!best) return;

    const { x: ax, y: ay } = best;
    // Compute average terrain so the runway is flat at one level
    let elevSum = 0, elevN = 0;
    for (let dy = 0; dy < H; dy++) {
      for (let dx = 0; dx < W; dx++) {
        elevSum += s.terrain[(ay + dy) * GRID + (ax + dx)];
        elevN++;
      }
    }
    const flatElev = elevSum / elevN;
    // Flatten the terrain in the footprint
    for (let dy = 0; dy < H; dy++) {
      for (let dx = 0; dx < W; dx++) {
        s.terrain[(ay + dy) * GRID + (ax + dx)] = flatElev;
      }
    }
    // Stomp anything in the footprint (buildings, specials, roads).
    for (let dy = 0; dy < H; dy++) {
      for (let dx = 0; dx < W; dx++) {
        const cx = ax + dx, cy = ay + dy;
        const idx = cy * GRID + cx;
        if (s.specialOwner[idx] !== -1) {
          const ownerIdx = s.specialOwner[idx];
          s.specials.delete(ownerIdx);
          for (let i = 0; i < GRID * GRID; i++) {
            if (s.specialOwner[i] === ownerIdx) s.specialOwner[i] = -1;
          }
        }
        s.specials.delete(idx);
        s.specialOwner[idx] = -1;
        s.cells[idx] = 0;
        s.strata[idx] = null;
        s.currentH[idx] = 0;
        s.targetH[idx] = 0;
      }
    }

    // Mark the footprint as built and owned by the top-left cell.
    const ownerIdx = ay * GRID + ax;
    for (let dy = 0; dy < H; dy++) {
      for (let dx = 0; dx < W; dx++) {
        const cx = ax + dx, cy = ay + dy;
        const idx = cy * GRID + cx;
        s.cells[idx] = 2;
        s.specialOwner[idx] = ownerIdx;
        s.currentH[idx] = 0.02;
        s.targetH[idx] = 0.02;
        s.newlySettled.push(idx);
      }
    }
    s.specialOwner[ownerIdx] = -1;
    s.specials.set(ownerIdx, {
      kind: 'airport',
      size: Math.max(W, H),
      width: W,
      height: H,
      palIdx: 0,
      variance: s.rand(),
      accentPalIdx: 0,
    });
    s.airport = {
      x: ax, y: ay, w: W, h: H,
      elev: flatElev,
      runwayStartX: ax + 0.5,
      runwayEndX: ax + W - 0.5,
      runwayY1: ay + 1,        // northern runway centerline
      runwayY2: ay + 2.7,      // southern runway centerline (offset for terminal)
    };

    // Connect the airport to nearby roads
    for (let dx = -1; dx <= W; dx++) {
      const tx = ax + dx;
      if (tx >= 0 && tx < GRID) {
        if (ay - 1 >= 0 && isRoad(tx, ay - 1)) revealRoadAt(s, tx, ay - 1);
        if (ay + H < GRID && isRoad(tx, ay + H)) revealRoadAt(s, tx, ay + H);
      }
    }
    for (let dy = -1; dy <= H; dy++) {
      const ty = ay + dy;
      if (ty >= 0 && ty < GRID) {
        if (ax - 1 >= 0 && isRoad(ax - 1, ty)) revealRoadAt(s, ax - 1, ty);
        if (ax + W < GRID && isRoad(ax + W, ty)) revealRoadAt(s, ax + W, ty);
      }
    }
  }

  function growTaller(s) {
    if (s.liveCount >= MAX_LIVE_BUILDS) return false;
    for (let tries = 0; tries < 8; tries++) {
      const i = Math.floor(s.rand() * GRID * GRID);
      if (s.cells[i] !== 2) continue;
      const strata = s.strata[i];
      if (!strata || strata.length >= MAX_STRATA) continue;
      const x = i % GRID, y = Math.floor(i / GRID);
      const score = shapeScore(shape, x, y, s.cx, s.cy, s.r);
      const maxForThisCell = 1 + Math.floor(score * (MAX_STRATA - 1));
      if (strata.length >= maxForThisCell) continue;

      const lastPal = strata[strata.length - 1].palIdx;
      const palIdx = s.rand() < 0.6
        ? lastPal
        : Math.floor(s.rand() * PALETTES.length);
      const stepH = STRATUM_MIN + s.rand() * (STRATUM_MAX - STRATUM_MIN);

      strata.push({ h: stepH, palIdx, growing: true });
      s.targetH[i] += stepH;
      s.buildT[i] = 0;
      s.cells[i] = 1;
      s.liveCount++;
      return true;
    }
    return false;
  }

  // Check if any cell still qualifies for isolated placement.
  // Cheap-ish: sample ~120 random cells; if we find an isolated candidate
  // we return true. Only called when isolated mode is failing to grow.
  function anyIsolatedSpotsLeft(s) {
    for (let tries = 0; tries < 120; tries++) {
      const i = Math.floor(s.rand() * GRID * GRID);
      if (s.cells[i] !== 0) continue;
      const x = i % GRID, y = Math.floor(i / GRID);
      if (isRoad(x, y)) continue;
      if (shapeScore(shape, x, y, s.cx, s.cy, s.r) <= 0) continue;
      let hasNeighbor = false;
      for (const n of NEIGHBORS) {
        const nx = x + n.dx, ny = y + n.dy;
        if (nx < 0 || ny < 0 || nx >= GRID || ny >= GRID) continue;
        const c = s.cells[ny * GRID + nx];
        if (c === 1 || c === 2) { hasNeighbor = true; break; }
      }
      if (!hasNeighbor) return true;
    }
    return false;
  }

  function pickNextCell(s, site, shape) {
    const opts = [];
    let total = 0;
    for (const n of NEIGHBORS) {
      const nx = site.x + n.dx, ny = site.y + n.dy;
      if (nx < 0 || ny < 0 || nx >= GRID || ny >= GRID) continue;
      const idx = ny * GRID + nx;
      if (s.cells[idx] !== 0) continue; // skip roads (=3) and existing buildings
      if (s.water && s.water[idx] === 1) continue; // can't cross open water (sand ok)
      const sc = shapeScore(shape, nx, ny, s.cx, s.cy, s.r);
      if (sc <= 0) continue;
      const tBoost = 1 + Math.max(0, s.terrain[idx]) * 0.3;
      const w = n.w * (0.2 + sc) * tBoost;
      opts.push({ x: nx, y: ny, w });
      total += w;
    }
    // If we're stuck (surrounded by roads/buildings), allow stepping ACROSS
    // a road to a free cell on the other side. This keeps growth flowing
    // across the strict grid.
    if (!opts.length) {
      for (const n of NEIGHBORS) {
        const jx = site.x + n.dx * 2, jy = site.y + n.dy * 2;
        if (jx < 0 || jy < 0 || jx >= GRID || jy >= GRID) continue;
        const jdx = jy * GRID + jx;
        if (s.cells[jdx] !== 0) continue;
        if (s.water && s.water[jdx] === 1) continue;
        const sc = shapeScore(shape, jx, jy, s.cx, s.cy, s.r);
        if (sc <= 0) continue;
        opts.push({ x: jx, y: jy, w: 0.5 });
        total += 0.5;
      }
    }
    // BRIDGE CROSSING: if a cardinal neighbor is a bridge deck, walk the
    // span to the land on the far side and offer that cell. Bridges are the
    // only way across water; they were planned at init as a non-intersecting
    // network, so this just follows a committed span.
    if (s.bridges && s.bridges.size > 0 && s.water) {
      for (const n of NEIGHBORS) {
        if (n.dx === 0 && n.dy === 0) continue;
        if (n.dx !== 0 && n.dy !== 0) continue; // cardinal only
        let cx = site.x + n.dx, cy = site.y + n.dy;
        if (cx < 0 || cy < 0 || cx >= GRID || cy >= GRID) continue;
        // first step must be onto a bridge cell
        if (!s.bridges.has(cy * GRID + cx)) continue;
        // walk across consecutive bridge cells
        let steps = 0;
        while (steps <= 2 * ROAD_SPACING + 1 &&
               cx >= 0 && cy >= 0 && cx < GRID && cy < GRID &&
               s.bridges.has(cy * GRID + cx)) {
          cx += n.dx; cy += n.dy; steps++;
        }
        // cx,cy is now the cell just past the bridge — should be land
        if (cx < 0 || cy < 0 || cx >= GRID || cy >= GRID) continue;
        const landIdx = cy * GRID + cx;
        if (s.cells[landIdx] === 0 && s.water[landIdx] !== 1 &&
            shapeScore(shape, cx, cy, s.cx, s.cy, s.r) > 0) {
          opts.push({ x: cx, y: cy, w: 0.9 });
          total += 0.9;
        }
      }
    }
    if (!opts.length) return null;
    let r = s.rand() * total;
    for (const o of opts) { r -= o.w; if (r <= 0) return o; }
    return opts[opts.length - 1];
  }

  function findBoundaryCell(s) {
    for (let tries = 0; tries < 60; tries++) {
      const i = Math.floor(s.rand() * GRID * GRID);
      if (s.cells[i] !== 2) continue;
      const x = i % GRID, y = Math.floor(i / GRID);
      for (const n of NEIGHBORS) {
        const nx = x + n.dx, ny = y + n.dy;
        if (nx < 0 || ny < 0 || nx >= GRID || ny >= GRID) continue;
        const nIdx = ny * GRID + nx;
        if (s.cells[nIdx] === 0 && !(s.water && s.water[nIdx] === 1)) {
          return { x: nx, y: ny };
        }
      }
    }
    return null;
  }

  // ----- CARS ------------------------------------------------
  // A car has continuous position (x, y) in grid space and a cardinal
  // direction (dx, dy) in cells/sec. When it enters a new cell, it picks
  // a valid direction (must stay on revealed road = cell value 3).
  const MAX_CARS = 18;
  const CAR_SPEED = 2.0; // grid cells per second
  const CAR_COLORS = ['#c96a55', '#6678a8', '#6aa269', '#b06a8c', '#b58a4c', '#558d9b'];

  // ----- PEDESTRIANS ----------------------------------------
  // Cheaper than cars. They walk along revealed roads with a slight
  // sidewalk-side offset and a head-bob animation. They turn more freely
  // than cars (no straight-line bias).
  const MAX_PEDS = 32;
  const PED_SPEED = 0.7; // ~3x slower than cars
  // Pedestrians now wear pants + shirt + head. Mixed and matched per ped.
  const PED_PANTS = ['#2a2438','#3a2a4a','#4a3520','#1f3a4f','#6b4a2a','#33333d','#2e4830','#5a3a2a'];
  const PED_SHIRTS = ['#c96a55','#6678a8','#6aa269','#b58a4c','#7c629a','#558d9b','#d8a04c','#a85a6e','#e4d4a8','#4a8c8a'];
  const PED_HEADS = ['#d4a878','#a87850','#7a5638','#e8c4a0','#c89868','#8a6442'];

  function carRoadDirection(s, cx, cy) {
    // Given a road cell (integer coords), what cardinal directions lead
    // to another road cell?
    const dirs = [];
    const DXY = [[1,0],[-1,0],[0,1],[0,-1]];
    for (let i = 0; i < 4; i++) {
      const nx = cx + DXY[i][0], ny = cy + DXY[i][1];
      if (nx < 0 || ny < 0 || nx >= GRID || ny >= GRID) continue;
      if (s.cells[ny * GRID + nx] === 3) {
        dirs.push({ dx: DXY[i][0], dy: DXY[i][1] });
      }
    }
    return dirs;
  }

  function spawnCar(s) {
    if (s.cars.length >= MAX_CARS) return;
    // Try to find a random revealed-road intersection
    for (let tries = 0; tries < 40; tries++) {
      const i = Math.floor(s.rand() * GRID * GRID);
      if (s.cells[i] !== 3) continue;
      const x = i % GRID, y = Math.floor(i / GRID);
      const dirs = carRoadDirection(s, x, y);
      if (dirs.length === 0) continue;
      const d = dirs[Math.floor(s.rand() * dirs.length)];
      // ~1 in 12 cars is an emergency vehicle (white body, flashing lights)
      const emergency = s.rand() < (1 / 12);
      s.cars.push({
        x: x + 0.5, y: y + 0.5,
        cellX: x, cellY: y,
        dx: d.dx, dy: d.dy,
        color: emergency ? '#e8e6e0' : CAR_COLORS[Math.floor(s.rand() * CAR_COLORS.length)],
        emergency,
        flashPhase: s.rand() * Math.PI * 2,
      });
      return;
    }
  }

  function stepCars(dt) {
    const s = stateRef.current;
    if (!s) return;
    // Spawn periodically
    s.carSpawnAccum += dt;
    if (s.carSpawnAccum > 0.8 && s.cars.length < MAX_CARS) {
      s.carSpawnAccum = 0;
      spawnCar(s);
    }
    for (let i = 0; i < s.cars.length; i++) {
      const c = s.cars[i];
      c.x += c.dx * CAR_SPEED * dt;
      c.y += c.dy * CAR_SPEED * dt;
      const newCellX = Math.floor(c.x);
      const newCellY = Math.floor(c.y);
      if (newCellX !== c.cellX || newCellY !== c.cellY) {
        // Entered a new cell. Make sure it's a road; if not, despawn.
        if (newCellX < 0 || newCellY < 0 || newCellX >= GRID || newCellY >= GRID
            || s.cells[newCellY * GRID + newCellX] !== 3) {
          s.cars.splice(i, 1);
          i--;
          continue;
        }
        c.cellX = newCellX;
        c.cellY = newCellY;
        // Pick a new direction. Prefer to continue straight; allow turns.
        const dirs = carRoadDirection(s, newCellX, newCellY).filter(d => {
          // Disallow immediate reverse (avoid U-turns mid-block)
          return !(d.dx === -c.dx && d.dy === -c.dy);
        });
        if (dirs.length === 0) {
          s.cars.splice(i, 1);
          i--;
          continue;
        }
        // Prefer continuing straight
        const straight = dirs.find(d => d.dx === c.dx && d.dy === c.dy);
        const pick = straight && s.rand() < 0.7
          ? straight
          : dirs[Math.floor(s.rand() * dirs.length)];
        c.dx = pick.dx;
        c.dy = pick.dy;
        // Snap to road center perpendicular to motion to prevent drift
        if (c.dx !== 0) c.y = newCellY + 0.5;
        if (c.dy !== 0) c.x = newCellX + 0.5;
      }
    }
  }

  function spawnPed(s) {
    if (s.peds.length >= MAX_PEDS) return;
    for (let tries = 0; tries < 40; tries++) {
      const i = Math.floor(s.rand() * GRID * GRID);
      if (s.cells[i] !== 3) continue;
      const x = i % GRID, y = Math.floor(i / GRID);
      const dirs = carRoadDirection(s, x, y);
      if (dirs.length === 0) continue;
      const d = dirs[Math.floor(s.rand() * dirs.length)];
      // sidewalk offset perpendicular to direction
      const offU = (s.rand() - 0.5) * 0.5;
      s.peds.push({
        x: x + 0.5 + (d.dy ? offU : 0),
        y: y + 0.5 + (d.dx ? offU : 0),
        cellX: x, cellY: y,
        dx: d.dx, dy: d.dy,
        pants: PED_PANTS[Math.floor(s.rand() * PED_PANTS.length)],
        shirt: PED_SHIRTS[Math.floor(s.rand() * PED_SHIRTS.length)],
        head:  PED_HEADS[Math.floor(s.rand() * PED_HEADS.length)],
        bob: s.rand() * Math.PI * 2,
        offU,
      });
      return;
    }
  }

  function stepPeds(dt) {
    const s = stateRef.current;
    if (!s) return;
    s.pedSpawnAccum += dt;
    if (s.pedSpawnAccum > 0.6 && s.peds.length < MAX_PEDS) {
      s.pedSpawnAccum = 0;
      spawnPed(s);
    }
    for (let i = 0; i < s.peds.length; i++) {
      const p = s.peds[i];
      p.x += p.dx * PED_SPEED * dt;
      p.y += p.dy * PED_SPEED * dt;
      p.bob += dt * 7;
      const ncx = Math.floor(p.x);
      const ncy = Math.floor(p.y);
      if (ncx !== p.cellX || ncy !== p.cellY) {
        if (ncx < 0 || ncy < 0 || ncx >= GRID || ncy >= GRID
            || s.cells[ncy * GRID + ncx] !== 3) {
          s.peds.splice(i, 1); i--; continue;
        }
        p.cellX = ncx; p.cellY = ncy;
        const dirs = carRoadDirection(s, ncx, ncy).filter(d =>
          !(d.dx === -p.dx && d.dy === -p.dy));
        if (dirs.length === 0) { s.peds.splice(i, 1); i--; continue; }
        // pedestrians turn freely (no straight bias)
        const pick = dirs[Math.floor(s.rand() * dirs.length)];
        p.dx = pick.dx;
        p.dy = pick.dy;
        // resnap and re-offset
        if (p.dx !== 0) p.y = ncy + 0.5 + p.offU;
        if (p.dy !== 0) p.x = ncx + 0.5 + p.offU;
      }
    }
  }

  // ----- PLANES ---------------------------------------------------
  // Plane states: 'takeoff' (rolls then climbs) or 'landing' (descends
  // then rolls). Both follow a parameterized path along one runway.
  const PLANE_SPAWN_INTERVAL = 7.0; // seconds between spawns
  const PLANE_COLORS = ['#e8e6e0', '#dadad0', '#d8e0e8', '#e8d8d4'];

  function spawnPlane(s) {
    if (!s.airport) return;
    if (s.planes.length >= 4) return; // soft cap
    const ap = s.airport;
    const usingRunway2 = s.rand() < 0.5;
    const runwayY = usingRunway2 ? ap.runwayY2 : ap.runwayY1;
    const takingOff = s.rand() < 0.5;
    // Direction along runway: east (+1) or west (-1)
    const dir = s.rand() < 0.5 ? 1 : -1;
    s.planes.push({
      t: 0,                          // 0..1 lifecycle progress
      phase: takingOff ? 'takeoff' : 'landing',
      runwayY,
      dir,
      ax: ap.x, aw: ap.w,
      elev: ap.elev,
      color: PLANE_COLORS[Math.floor(s.rand() * PLANE_COLORS.length)],
      duration: takingOff ? 10 + s.rand() * 3 : 11 + s.rand() * 3,
    });
  }

  function stepPlanes(dt) {
    const s = stateRef.current;
    if (!s) return;
    if (!s.airport) return;
    s.planeSpawnAccum += dt;
    if (s.planeSpawnAccum > PLANE_SPAWN_INTERVAL) {
      s.planeSpawnAccum = 0;
      spawnPlane(s);
    }
    for (let i = 0; i < s.planes.length; i++) {
      const p = s.planes[i];
      p.t += dt / p.duration;
      if (p.t >= 1) {
        s.planes.splice(i, 1);
        i--;
      }
    }
  }

  // ----- BOATS -----
  const BOAT_COLORS = ['#c96a55', '#d8c8a8', '#6678a8', '#b58a4c', '#e4d4c0'];
  const MAX_BOATS = 5;
  // Spawn a boat on a random water cell, drifting in a cardinal direction.
  function spawnBoat(s) {
    if (!s.water) return;
    if (s.boats.length >= MAX_BOATS) return;
    for (let tries = 0; tries < 30; tries++) {
      const i = Math.floor(s.rand() * GRID * GRID);
      if (s.water[i] !== 1) continue;
      const x = i % GRID, y = Math.floor(i / GRID);
      // pick a direction that has water ahead
      const dirs = [[1,0],[-1,0],[0,1],[0,-1]].filter(([dx, dy]) => {
        const cx = x + dx, cy = y + dy;
        return cx >= 0 && cy >= 0 && cx < GRID && cy < GRID && s.water[cy * GRID + cx] === 1;
      });
      if (dirs.length === 0) continue;
      const d = dirs[Math.floor(s.rand() * dirs.length)];
      s.boats.push({
        x: x + 0.5, y: y + 0.5,
        dx: d[0], dy: d[1],
        color: BOAT_COLORS[Math.floor(s.rand() * BOAT_COLORS.length)],
        bob: s.rand() * Math.PI * 2,
        speed: 0.4 + s.rand() * 0.3,
      });
      return;
    }
  }

  // ----- TRAIN ----------------------------------------------------
  // A push pull train shuttles along the rail line, reversing at each end.
  const TRAIN_UNITS = 5;
  const TRAIN_UNIT_LEN = 0.9;
  const TRAIN_GAP = 0.12;
  function stepTrain(dt) {
    const s = stateRef.current;
    if (!s || s.railY === undefined || s.railX1 - s.railX0 < 8) return;
    const len = TRAIN_UNITS * TRAIN_UNIT_LEN + (TRAIN_UNITS - 1) * TRAIN_GAP;
    const lo = s.railX0 + 0.2, hi = s.railX1 + 0.8 - len;
    if (!s.train) s.train = { x: lo, dir: 1, wait: 0 };
    const t = s.train;
    if (t.wait > 0) { t.wait -= dt; return; }
    t.x += t.dir * 2.4 * dt;
    if (t.x >= hi) { t.x = hi; t.dir = -1; t.wait = 2.5; }
    if (t.x <= lo) { t.x = lo; t.dir = 1; t.wait = 2.5; }
  }

  // ----- BIG SHIP ---------------------------------------------------
  // One large ship cruises open water. It needs water ahead of its bow and
  // on both sides, so it stays in the wide parts of the lake or river.
  function shipFits(s, x, y, dx, dy) {
    const px = -dy, py = dx;
    for (const ahead of [0.9, 1.4]) {
      for (const side of [-0.5, 0, 0.5]) {
        const cx = Math.floor(x + dx * ahead + px * side);
        const cy = Math.floor(y + dy * ahead + py * side);
        if (cx < 0 || cy < 0 || cx >= GRID || cy >= GRID) return false;
        const i = cy * GRID + cx;
        if (s.water[i] !== 1 || s.bridges.has(i) || cy === s.railY) return false;
      }
    }
    return true;
  }
  function stepShip(dt) {
    const s = stateRef.current;
    if (!s || !s.water) return;
    if (!s.ship) {
      s.shipSpawnAccum += dt;
      if (s.shipSpawnAccum < 3) return;
      s.shipSpawnAccum = 0;
      for (let tries = 0; tries < 200; tries++) {
        const i = Math.floor(s.rand() * GRID * GRID);
        if (s.water[i] !== 1) continue;
        const x = i % GRID + 0.5, y = Math.floor(i / GRID) + 0.5;
        const dirs = [[1,0],[-1,0],[0,1],[0,-1]].filter(([dx, dy]) => shipFits(s, x, y, dx, dy));
        if (!dirs.length) continue;
        const [dx, dy] = dirs[Math.floor(s.rand() * dirs.length)];
        s.ship = { x, y, dx, dy };
        return;
      }
      return;
    }
    const sh = s.ship;
    if (shipFits(s, sh.x, sh.y, sh.dx, sh.dy)) {
      sh.x += sh.dx * 0.35 * dt;
      sh.y += sh.dy * 0.35 * dt;
      return;
    }
    // turn at the shore: snap to the cell center and pick a clear heading
    const cx = Math.floor(sh.x) + 0.5, cy = Math.floor(sh.y) + 0.5;
    const turns = [[1,0],[-1,0],[0,1],[0,-1]].filter(([dx, dy]) =>
      !(dx === -sh.dx && dy === -sh.dy) && shipFits(s, cx, cy, dx, dy));
    if (turns.length) {
      const [dx, dy] = turns[Math.floor(s.rand() * turns.length)];
      sh.x = cx; sh.y = cy; sh.dx = dx; sh.dy = dy;
    } else if (shipFits(s, cx, cy, -sh.dx, -sh.dy)) {
      sh.x = cx; sh.y = cy; sh.dx = -sh.dx; sh.dy = -sh.dy;
    } else {
      s.ship = null;
    }
  }

  function stepBoats(dt) {
    const s = stateRef.current;
    if (!s || !s.water) return;
    s.boatSpawnAccum += dt;
    if (s.boatSpawnAccum > 4 && s.boats.length < MAX_BOATS) {
      s.boatSpawnAccum = 0;
      spawnBoat(s);
    }
    for (let i = 0; i < s.boats.length; i++) {
      const b = s.boats[i];
      const nx = b.x + b.dx * b.speed * dt;
      const ny = b.y + b.dy * b.speed * dt;
      b.bob += dt * 2.5;
      // check the cell ahead is still water; if not, turn or despawn
      const cx = Math.floor(nx), cy = Math.floor(ny);
      if (cx < 0 || cy < 0 || cx >= GRID || cy >= GRID || s.water[cy * GRID + cx] !== 1) {
        // try to pick a new water direction
        const dirs = [[1,0],[-1,0],[0,1],[0,-1]].filter(([dx, dy]) => {
          const tx = Math.floor(b.x) + dx, ty = Math.floor(b.y) + dy;
          return tx >= 0 && ty >= 0 && tx < GRID && ty < GRID &&
                 s.water[ty * GRID + tx] === 1 && !(dx === -b.dx && dy === -b.dy);
        });
        if (dirs.length === 0) { s.boats.splice(i, 1); i--; continue; }
        const d = dirs[Math.floor(s.rand() * dirs.length)];
        b.dx = d[0]; b.dy = d[1];
      } else {
        b.x = nx; b.y = ny;
      }
    }
  }

  // Returns {x, y, z, headingX} for a plane at its current t.
  function planePose(p) {
    const ax = p.ax, aw = p.aw;
    // Runway endpoints with direction:
    // If dir=+1, plane moves from x=ax+0.5 (west end) to x=ax+aw-0.5 (east end)
    // If dir=-1, plane moves from x=ax+aw-0.5 (east end) to x=ax+0.5 (west end)
    const rwStart = p.dir === 1 ? ax + 0.5 : ax + aw - 0.5;
    const rwEnd   = p.dir === 1 ? ax + aw - 0.5 : ax + 0.5;
    // Off-screen approach/departure points
    const farStart = p.dir === 1 ? ax - 18 : ax + aw + 18;
    const farEnd   = p.dir === 1 ? ax + aw + 18 : ax - 18;
    let x, z;
    if (p.phase === 'takeoff') {
      // 0..0.45 rolling down runway, 0.45..1.0 climbing away
      if (p.t < 0.45) {
        const u = p.t / 0.45;
        // ease-in to simulate acceleration
        const ue = u * u;
        x = rwStart + (rwEnd - rwStart) * ue;
        z = 0;
      } else {
        const u = (p.t - 0.45) / 0.55;
        x = rwEnd + (farEnd - rwEnd) * u;
        // climb curve: starts at 0, ramps up
        z = 6 * (1 - Math.pow(1 - u, 1.8));
      }
    } else {
      // landing: 0..0.55 descending approach, 0.55..1.0 rolling down runway
      if (p.t < 0.55) {
        const u = p.t / 0.55;
        x = farStart + (rwStart - farStart) * u;
        z = 6 * Math.pow(1 - u, 1.6);
      } else {
        const u = (p.t - 0.55) / 0.45;
        // ease-out (decelerating on the ground)
        const ue = 1 - Math.pow(1 - u, 2);
        x = rwStart + (rwEnd - rwStart) * ue;
        z = 0;
      }
    }
    return { x, y: p.runwayY, z: p.elev + z, headingX: p.dir };
  }

  const animateBuildings = useCallback((dt) => {
    const s = stateRef.current;
    if (!s) return;
    for (let i = 0; i < s.cells.length; i++) {
      if (s.cells[i] === 1) {
        s.buildT[i] += dt / s.buildDur;
        if (s.buildT[i] >= 1) {
          s.buildT[i] = 1;
          s.cells[i] = 2;
          s.currentH[i] = s.targetH[i];
          if (s.liveCount > 0) s.liveCount--;
          const strata = s.strata[i];
          let wasUpgrowth = false;
          if (strata) {
            for (let k = 0; k < strata.length; k++) {
              if (strata[k].growing) {
                strata[k].growing = false;
                wasUpgrowth = true;
              }
            }
          }
          if (wasUpgrowth) s.newlyUpgrown.push(i);
          else s.newlySettled.push(i);
        } else {
          s.currentH[i] = s.targetH[i] * easeOutCubic(s.buildT[i]);
        }
      }
    }
  }, []);

  // --- paper pattern ------------------------------------------
  function buildPaperPattern(ctx) {
    const off = document.createElement('canvas');
    off.width = 256; off.height = 256;
    const o = off.getContext('2d');
    const g = o.createLinearGradient(0, 0, 256, 256);
    g.addColorStop(0, '#fdf7ec');
    g.addColorStop(1, '#f3e9d2');
    o.fillStyle = g;
    o.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 1200; i++) {
      o.fillStyle = `rgba(120,90,60,${Math.random() * 0.08})`;
      o.fillRect(Math.random() * 256, Math.random() * 256, 1, 1);
    }
    for (let i = 0; i < 30; i++) {
      o.strokeStyle = `rgba(120,90,60,0.06)`;
      o.lineWidth = 0.5;
      const x = Math.random() * 256, y = Math.random() * 256;
      o.beginPath();
      o.moveTo(x, y);
      o.lineTo(x + (Math.random() - 0.5) * 40, y + (Math.random() - 0.5) * 40);
      o.stroke();
    }
    return ctx.createPattern(off, 'repeat');
  }

  // ============================================================
  // Projection (depends on yaw, zoom, canvas size)
  // ============================================================
  function makeProjector(w, h) {
    const tw = TILE_W * zoom;
    const th = TILE_H * zoom;
    const hu = HEIGHT_UNIT * zoom;
    const cosY = Math.cos(yaw);
    const sinY = Math.sin(yaw);
    const cxC = GRID / 2, cyC = GRID / 2;
    const originX = w / 2;
    const originY = h / 2 - (GRID * th) / 4;
    return {
      tw, th, hu,
      project: (gx, gy, gz = 0) => {
        const rx = (gx - cxC) * cosY - (gy - cyC) * sinY + cxC;
        const ry = (gx - cxC) * sinY + (gy - cyC) * cosY + cyC;
        return {
          x: originX + (rx - ry) * tw / 2,
          y: originY + (rx + ry) * th / 2 - gz * hu,
        };
      },
    };
  }

  // ============================================================
  // Drawing helpers
  // ============================================================
  // Skin-aware polygon renderer. Buildings call this for side & top faces.
  // The 4th argument is the "face role": 'side' or 'top'. We can use that
  // to apply gradient variations on side faces.
  function watercolorPolygon(ctx, pts, fill, edgeAlpha = 0.16, faceRole = 'side') {
    if (skin === 'flat') {
      // Solid fill only — no stroke. Fastest path.
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      return;
    }
    if (skin === 'outline') {
      // White-ish fill + heavy ink outline. Drafting-paper look.
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.closePath();
      ctx.fillStyle = 'rgba(253,247,236,0.88)';
      ctx.fill();
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = 'rgba(40,30,25,0.75)';
      ctx.stroke();
      return;
    }
    if (skin === 'gradient') {
      // Vertical linear gradient: top brighter, bottom darker, even on top face.
      let minY = pts[0].y, maxY = pts[0].y;
      for (let i = 1; i < pts.length; i++) {
        if (pts[i].y < minY) minY = pts[i].y;
        if (pts[i].y > maxY) maxY = pts[i].y;
      }
      const grad = ctx.createLinearGradient(0, minY, 0, maxY);
      grad.addColorStop(0, lightenColor(fill, 0.12));
      grad.addColorStop(1, darkenColor(fill, 0.18));
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.lineWidth = 0.6;
      ctx.strokeStyle = `rgba(40,30,25,0.35)`;
      ctx.stroke();
      return;
    }
    if (skin === 'glass') {
      // Semi-transparent fill with a brighter top highlight strip.
      // Side faces get translucent; top faces get a brighter glassy sheen.
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.closePath();
      const baseAlpha = faceRole === 'top' ? 0.55 : 0.7;
      ctx.fillStyle = fadeColor(fill, baseAlpha);
      ctx.fill();
      // top highlight: a paler gradient from top of the polygon
      let minY = pts[0].y, maxY = pts[0].y;
      for (let i = 1; i < pts.length; i++) {
        if (pts[i].y < minY) minY = pts[i].y;
        if (pts[i].y > maxY) maxY = pts[i].y;
      }
      const grad = ctx.createLinearGradient(0, minY, 0, minY + (maxY - minY) * 0.5);
      grad.addColorStop(0, 'rgba(255,255,255,0.35)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.lineWidth = 0.6;
      ctx.strokeStyle = 'rgba(60,90,120,0.45)';
      ctx.stroke();
      return;
    }
    // default: watercolor (original)
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = `rgba(60,40,30,${edgeAlpha})`;
    ctx.stroke();
    ctx.restore();
    ctx.lineWidth = 0.8;
    ctx.strokeStyle = `rgba(60,40,30,${edgeAlpha * 1.6})`;
    ctx.stroke();
  }

  // Small color utilities used by skins.
  function parseRgba(c) {
    if (c.startsWith('#')) {
      const h = c.slice(1);
      return {
        r: parseInt(h.slice(0,2), 16),
        g: parseInt(h.slice(2,4), 16),
        b: parseInt(h.slice(4,6), 16),
        a: 1,
      };
    }
    // rgba(r,g,b,a)
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return { r: 0, g: 0, b: 0, a: 1 };
    const parts = m[1].split(',').map(s => parseFloat(s.trim()));
    return { r: parts[0]|0, g: parts[1]|0, b: parts[2]|0, a: parts.length > 3 ? parts[3] : 1 };
  }
  function lightenColor(c, amt) {
    const p = parseRgba(c);
    return `rgba(${clamp(p.r + 255 * amt, 0, 255)|0},${clamp(p.g + 255 * amt, 0, 255)|0},${clamp(p.b + 255 * amt, 0, 255)|0},${p.a})`;
  }
  function darkenColor(c, amt) {
    const p = parseRgba(c);
    return `rgba(${clamp(p.r * (1 - amt), 0, 255)|0},${clamp(p.g * (1 - amt), 0, 255)|0},${clamp(p.b * (1 - amt), 0, 255)|0},${p.a})`;
  }
  function fadeColor(c, alpha) {
    const p = parseRgba(c);
    return `rgba(${p.r},${p.g},${p.b},${alpha})`;
  }

  function withAlpha(hex, a) {
    const h = hex.replace('#', '');
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${a})`;
  }

  function lerpPt(a, b, t) { return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) }; }

  // Determine which 2 side faces of a building are visible to the camera
  // given current yaw. After yaw, a face is "front" if its outward normal
  // has a positive component along the screen-down direction (+y in iso).
  // For an axis-aligned cube in grid space, the four faces have outward
  // normals (1,0), (-1,0), (0,1), (0,-1). After yaw rotation, their iso-y
  // projection sign tells us visibility.
  function visibleFacesForYaw(yawRad) {
    // iso projects (rx,ry) -> screen y = (rx + ry) * th/2 - z*hu.
    // So a normal (nx, ny) in rotated grid space projects to screen y as
    // (nx + ny). The original (1,0) becomes (cosY, sinY) and so on.
    const cy = Math.cos(yawRad), sy = Math.sin(yawRad);
    const faces = [
      { name: 'east',  nx:  cy, ny:  sy }, // +x
      { name: 'west',  nx: -cy, ny: -sy }, // -x
      { name: 'south', nx: -sy, ny:  cy }, // +y
      { name: 'north', nx:  sy, ny: -cy }, // -y
    ];
    // visible if (nx + ny) > 0 (face points toward bottom of screen = camera)
    return new Set(faces.filter(f => f.nx + f.ny > 0).map(f => f.name));
  }

  // ============================================================
  // SPECIAL BUILDINGS
  // ============================================================
  // A special occupies a (size × size) cell footprint. We render its
  // base/top as a rectangle bridging the owner cell (top-left) and the
  // far cell. Each kind has distinctive features layered on the base box.
  //
  // Special heights: scaled by size. A 4x4 special is dramatically taller.
  function drawSpecial(ctx, s, idx, project, special, animating) {
    const x = idx % GRID, y = Math.floor(idx / GRID);
    const size = special.size;
    const bh = s.currentH[idx];
    const baseZ = Math.max(0, s.terrain[idx]);
    const sizeBoost = size === 4 ? 3.2 : (size === 2 ? 2.0 : 1.4);
    // Strip malls stay LOW. Parks are flat. Airport is flat tarmac.
    // Neighborhoods are low. Apartments use default sizeBoost (mid-rise).
    let visualH;
    if (special.kind === 'park') {
      visualH = bh * 0.08;
    } else if (special.kind === 'stripmall') {
      visualH = bh * 0.7;
    } else if (special.kind === 'airport') {
      visualH = 0.05;
    } else if (special.kind === 'neighborhood') {
      visualH = bh * 0.55;
    } else {
      visualH = bh * sizeBoost;
    }
    const topZ = baseZ + visualH;

    // Footprint: use the same per-shape tile primitive as normal cells,
    // scaled by `size` so multi-cell specials match the city's geometry.
    const unitCorners = tileCorners(shape, x, y);
    const fCorners = unitCorners.map(c => ({
      dx: c.dx * size,
      dy: c.dy * size,
    }));
    const N = fCorners.length;

    // Keep a separate "square" corner set for decorations that need
    // axis-aligned positioning (clock face, marquee panel, etc.). These
    // sit on top of the polygon base.
    const sq00 = { dx: 0, dy: 0 };
    const sq10 = { dx: size, dy: 0 };
    const sq11 = { dx: size, dy: size };
    const sq01 = { dx: 0, dy: size };

    const basePts = fCorners.map(c => project(x + c.dx, y + c.dy, baseZ));
    const topPts  = fCorners.map(c => project(x + c.dx, y + c.dy, topZ));

    const light = lighting(sunAngleRef.current);

    // Shadow
    if (effectsRef.current && light.daylight > 0.05) {
      const dx = light.shadowDX * visualH * 0.18;
      const dy = light.shadowDY * visualH * 0.18;
      const shadowPts = fCorners.map(c => project(x + c.dx + dx, y + c.dy + dy, baseZ));
      ctx.beginPath();
      ctx.moveTo(shadowPts[0].x, shadowPts[0].y);
      for (let i = 1; i < N; i++) ctx.lineTo(shadowPts[i].x, shadowPts[i].y);
      ctx.closePath();
      const shA = (0.12 + Math.min(0.28, visualH * 0.018)) * light.daylight;
      // Cheap shadow: solid polygon fill, no blur filter.
      // ctx.filter='blur(...)' forces a slow path on mobile.
      ctx.fillStyle = `rgba(60,45,80,${shA})`;
      ctx.fill();
    }

    const palette = paletteFor(special.palIdx).map(c => tintHex(c, light));
    const accent = paletteFor(special.accentPalIdx).map(c => tintHex(c, light));
    const a = animating ? 0.55 : 1.0;
    const isNight = light.daylight < 0.45;

    // Determine visible faces by polygon edge outward-normal test
    const cosY = Math.cos(yaw), sinY = Math.sin(yaw);
    const cellCx = size / 2, cellCy = size / 2;
    const sides = [];
    for (let i = 0; i < N; i++) {
      const j = (i + 1) % N;
      const mx = (fCorners[i].dx + fCorners[j].dx) / 2;
      const my = (fCorners[i].dy + fCorners[j].dy) / 2;
      const ox = mx - cellCx;
      const oy = my - cellCy;
      const rx = ox * cosY - oy * sinY;
      const ry = ox * sinY + oy * cosY;
      if ((rx + ry) > 0) {
        sides.push({ i, j, c1: fCorners[i], c2: fCorners[j] });
      }
    }

    // Back-to-front sort
    sides.sort((aa, bb) => {
      const am = project(x + (aa.c1.dx + aa.c2.dx) / 2, y + (aa.c1.dy + aa.c2.dy) / 2, baseZ);
      const bm = project(x + (bb.c1.dx + bb.c2.dx) / 2, y + (bb.c1.dy + bb.c2.dy) / 2, baseZ);
      return am.y - bm.y;
    });

    // ===== KIND-SPECIFIC RENDERING =====

    if (special.kind === 'pyramid' && !animating) {
      drawPyramid(ctx, project, x, y, size, baseZ, visualH, palette, accent, sides, light, unitCorners);
      drawSpecialOutlinePoly(ctx, project, x, y, topZ, fCorners, accent[3], 1.2);
      return;
    }

    // PARK: flat grass + path + trees, no walls.
    if (special.kind === 'park') {
      drawPark(ctx, project, x, y, size, baseZ, fCorners, light, special.variance, animating);
      return;
    }

    // AIRPORT: flat rectangular tarmac with runways, terminal, hangar.
    if (special.kind === 'airport') {
      drawAirport(ctx, project, x, y, special, baseZ, light, animating);
      return;
    }

    // STADIUM: oval bowl with tiered stands, a striped pitch and floodlights.
    if (special.kind === 'stadium') {
      drawStadium(ctx, project, x, y, special, baseZ, light);
      return;
    }

    // NEIGHBORHOOD: planned residential — small uniform houses in a grid.
    if (special.kind === 'neighborhood' && !animating) {
      drawNeighborhood(ctx, project, x, y, size, baseZ, visualH, palette, accent, light, special.variance);
      return;
    }

    // Common: draw simple box for side faces
    for (const side of sides) {
      const b1 = project(x + side.c1.dx, y + side.c1.dy, baseZ);
      const b2 = project(x + side.c2.dx, y + side.c2.dy, baseZ);
      const t1 = project(x + side.c1.dx, y + side.c1.dy, topZ);
      const t2 = project(x + side.c2.dx, y + side.c2.dy, topZ);
      const tone = palette[2];
      watercolorPolygon(ctx, [b1, b2, t2, t1], withAlpha(tone, a), 0.18);
    }

    // KIND-SPECIFIC DECORATIONS on the front-facing side
    const frontSide = sides[sides.length - 1];
    if (frontSide && !animating) {
      const b1 = project(x + frontSide.c1.dx, y + frontSide.c1.dy, baseZ);
      const b2 = project(x + frontSide.c2.dx, y + frontSide.c2.dy, baseZ);
      const t1 = project(x + frontSide.c1.dx, y + frontSide.c1.dy, topZ);
      const t2 = project(x + frontSide.c2.dx, y + frontSide.c2.dy, topZ);

      switch (special.kind) {
        case 'marquee':
          drawMarquee(ctx, b1, b2, t1, t2, visualH, accent, isNight, special.variance);
          break;
        case 'pipelights':
          drawPipelightsPoly(ctx, project, x, y, fCorners, baseZ, topZ, accent, isNight);
          break;
        case 'balcony':
          drawBalconiesPoly(ctx, project, x, y, fCorners, baseZ, visualH, palette, accent);
          break;
        case 'dome':
          break;
        case 'spire':
          break;
        case 'crown':
          drawCrown(ctx, b1, b2, t1, t2, visualH, accent, isNight);
          break;
        case 'striped':
          drawStripes(ctx, project, x, y, size, baseZ, topZ, palette, accent, sides);
          break;
        case 'clock':
          drawClockFace(ctx, b1, b2, t1, t2, visualH, accent, special.variance);
          break;
        case 'penthouse':
          break;
        case 'stripmall':
          drawStripMall(ctx, project, x, y, size, baseZ, visualH, palette, accent, isNight, sides);
          break;
        case 'apartment':
          drawApartmentFront(ctx, project, x, y, size, baseZ, visualH, sides, isNight);
          break;
      }
    }

    // TOP FACE -- normal flat top, or a roof shape
    if (special.kind === 'dome') {
      drawDomePoly(ctx, project, x, y, fCorners, topZ, accent, isNight, size);
    } else if (special.kind === 'penthouse') {
      watercolorPolygon(ctx, topPts, withAlpha(palette[0], a), 0.14, 'top');
      drawPenthousePoly(ctx, project, x, y, unitCorners, size, baseZ + visualH, accent, isNight);
    } else if (special.kind === 'vaulted') {
      drawVaultedRoof(ctx, project, x, y, fCorners, size, topZ, palette, accent, isNight);
    } else if (special.kind === 'barn') {
      drawBarnRoof(ctx, project, x, y, fCorners, size, topZ, palette, accent, isNight);
    } else if (special.kind === 'mansard') {
      drawMansardRoof(ctx, project, x, y, fCorners, size, topZ, palette, accent, isNight);
    } else if (special.kind === 'stepped') {
      // stepped is a stack of shrinking flat tops; draw the lowest top here
      watercolorPolygon(ctx, topPts, withAlpha(palette[0], a), 0.14, 'top');
      drawSteppedRoof(ctx, project, x, y, unitCorners, size, topZ, palette, accent, isNight);
    } else {
      watercolorPolygon(ctx, topPts, withAlpha(palette[0], a), 0.14, 'top');
    }

    if (special.kind === 'spire') {
      drawSpire(ctx, project, x, y, size, topZ, accent, isNight);
    }
    if (special.kind === 'crane') {
      drawCrane(ctx, project, x, y, size, topZ, accent, isNight, special.variance);
    }

    if (animating) {
      ctx.strokeStyle = accent[3];
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(topPts[0].x, topPts[0].y);
      for (let i = 1; i < N; i++) ctx.lineTo(topPts[i].x, topPts[i].y);
      ctx.closePath();
      ctx.stroke();
    }
  }

  function drawSpecialOutlinePoly(ctx, project, x, y, topZ, fCorners, color, lw) {
    ctx.strokeStyle = color;
    ctx.lineWidth = lw;
    ctx.beginPath();
    for (let i = 0; i < fCorners.length; i++) {
      const p = project(x + fCorners[i].dx, y + fCorners[i].dy, topZ);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    ctx.stroke();
  }

  function drawSpecialOutline(ctx, project, x, y, size, topZ, color, lw) {
    const p1 = project(x, y, topZ);
    const p2 = project(x + size, y, topZ);
    const p3 = project(x + size, y + size, topZ);
    const p4 = project(x, y + size, topZ);
    ctx.strokeStyle = color;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.lineTo(p3.x, p3.y);
    ctx.lineTo(p4.x, p4.y);
    ctx.closePath();
    ctx.stroke();
  }

  // ----- KIND IMPLEMENTATIONS -----------------------------

  // PARK: flat green plaza with diagonal path, fountain dot, and trees.
  // Trees are determinstic (seeded by variance + idx) so cache & live draws
  // match. Drawn flat on the terrain at baseZ, no walls.
  function drawPark(ctx, project, x, y, size, baseZ, fCorners, light, variance, animating) {
    // Grass base — fill the cell footprint at terrain elevation
    const grassPts = fCorners.map(c => project(x + c.dx, y + c.dy, baseZ + 0.02));
    ctx.beginPath();
    ctx.moveTo(grassPts[0].x, grassPts[0].y);
    for (let i = 1; i < grassPts.length; i++) ctx.lineTo(grassPts[i].x, grassPts[i].y);
    ctx.closePath();
    ctx.fillStyle = tintHex('#7fb069', light);
    ctx.fill();
    // soft grass speckle
    ctx.fillStyle = tintHex('#6a9a55', light);
    const rnd = mulberry32(Math.floor(variance * 1e9) ^ (y * GRID + x));
    for (let i = 0; i < 14; i++) {
      const tx = x + rnd() * size;
      const ty = y + rnd() * size;
      const p = project(tx, ty, baseZ + 0.03);
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.7, zoom * 0.5), 0, Math.PI * 2);
      ctx.fill();
    }

    // Diagonal path
    const pathA = project(x + 0.1, y + 0.1, baseZ + 0.04);
    const pathB = project(x + size - 0.1, y + size - 0.1, baseZ + 0.04);
    ctx.strokeStyle = tintHex('#d8c89b', light);
    ctx.lineWidth = Math.max(2, zoom * 1.4);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(pathA.x, pathA.y);
    ctx.lineTo(pathB.x, pathB.y);
    ctx.stroke();

    if (animating) return; // skip trees while animating

    // Fountain / focal point in center
    const center = project(x + size / 2, y + size / 2, baseZ + 0.05);
    ctx.fillStyle = tintHex('#a8c7d4', light);
    ctx.beginPath();
    ctx.arc(center.x, center.y, Math.max(2, zoom * 1.5), 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = tintHex('#5d7e8a', light);
    ctx.lineWidth = 0.7;
    ctx.stroke();

    // Trees: deterministic count + positions
    const treeCount = 5 + Math.floor(rnd() * 4);
    const trees = [];
    for (let i = 0; i < treeCount; i++) {
      const tx = x + 0.25 + rnd() * (size - 0.5);
      const ty = y + 0.25 + rnd() * (size - 0.5);
      // avoid the central fountain
      const cdx = tx - (x + size / 2), cdy = ty - (y + size / 2);
      if (Math.sqrt(cdx * cdx + cdy * cdy) < 0.4) continue;
      trees.push({ tx, ty });
    }
    // Painter-sort trees back to front
    const projected = trees.map(t => ({
      ...t,
      sy: project(t.tx, t.ty, baseZ).y,
    }));
    projected.sort((a, b) => a.sy - b.sy);
    for (const t of projected) {
      const trunkBot = project(t.tx, t.ty, baseZ);
      const trunkTop = project(t.tx, t.ty, baseZ + 0.7);
      // trunk
      ctx.strokeStyle = tintHex('#5e3f24', light);
      ctx.lineWidth = Math.max(1.4, zoom * 0.7);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(trunkBot.x, trunkBot.y);
      ctx.lineTo(trunkTop.x, trunkTop.y);
      ctx.stroke();
      // canopy (slightly translucent green)
      const cR = Math.max(2.5, zoom * 2.2);
      ctx.fillStyle = tintHex('#4f7d3a', light);
      ctx.beginPath();
      ctx.arc(trunkTop.x, trunkTop.y, cR, 0, Math.PI * 2);
      ctx.fill();
      // highlight
      ctx.fillStyle = tintHex('#6ea44a', light);
      ctx.beginPath();
      ctx.arc(trunkTop.x - cR * 0.25, trunkTop.y - cR * 0.25, cR * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }

    // Park lamps: 4 small posts at inset corners of the park footprint.
    // Match the positions registered in placeBuilding so the glow lands here.
    const inset = 0.55;
    const lampPositions = [
      [x + inset,         y + inset],
      [x + size - inset,  y + inset],
      [x + inset,         y + size - inset],
      [x + size - inset,  y + size - inset],
    ];
    for (const [lx, ly] of lampPositions) {
      const lFoot = project(lx, ly, baseZ);
      const lHead = project(lx, ly, baseZ + 0.55);
      // pole
      ctx.strokeStyle = tintHex('#3a2e26', light);
      ctx.lineWidth = Math.max(1, zoom * 0.4);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(lFoot.x, lFoot.y);
      ctx.lineTo(lHead.x, lHead.y);
      ctx.stroke();
      // bulb housing (static gray — glow added live in main draw pass)
      ctx.fillStyle = tintHex('#d2c8b4', light);
      ctx.beginPath();
      ctx.arc(lHead.x, lHead.y, Math.max(1.2, zoom * 0.85), 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = tintHex('#3a2e26', light);
      ctx.lineWidth = 0.4;
      ctx.stroke();
    }
  }

  // STRIP MALL: a low building with continuous storefront windows along
  // the front, a colored awning band, and a parking-lot strip painted at
  // the front edge. Drawn AFTER the side faces are already painted.
  function drawStripMall(ctx, project, x, y, size, baseZ, visualH, palette, accent, isNight, sides) {
    const topZ = baseZ + visualH;
    // The "front" side is the last in painter order (closest to camera)
    const front = sides[sides.length - 1];
    if (!front) return;

    const b1 = project(x + front.c1.dx, y + front.c1.dy, baseZ);
    const b2 = project(x + front.c2.dx, y + front.c2.dy, baseZ);
    const t1 = project(x + front.c1.dx, y + front.c1.dy, topZ);
    const t2 = project(x + front.c2.dx, y + front.c2.dy, topZ);

    // Awning band: top 18% of the front face, accent color
    const aw0 = 0.78, aw1 = 0.95;
    const pt = (u, vv) => {
      const aa = lerpPt(b1, b2, u);
      const bb = lerpPt(t1, t2, u);
      return lerpPt(aa, bb, 1 - vv);
    };
    ctx.fillStyle = accent[3];
    ctx.beginPath();
    ctx.moveTo(pt(0, aw1).x, pt(0, aw1).y);
    ctx.lineTo(pt(1, aw1).x, pt(1, aw1).y);
    ctx.lineTo(pt(1, aw0).x, pt(1, aw0).y);
    ctx.lineTo(pt(0, aw0).x, pt(0, aw0).y);
    ctx.closePath();
    ctx.fill();
    // awning shadow stripe at the bottom of the band
    ctx.strokeStyle = 'rgba(0,0,0,0.18)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(pt(0, aw0).x, pt(0, aw0).y);
    ctx.lineTo(pt(1, aw0).x, pt(1, aw0).y);
    ctx.stroke();

    // Storefront windows: a continuous strip 12%..70% of height,
    // divided into `size * 2` panes
    const wTop = 0.70, wBot = 0.18;
    const paneCount = Math.max(3, size * 3);
    const winFill = isNight
      ? 'rgba(255,220,140,0.95)'
      : 'rgba(190,210,225,0.65)';
    ctx.fillStyle = winFill;
    for (let i = 0; i < paneCount; i++) {
      const u0 = i / paneCount + 0.015;
      const u1 = (i + 1) / paneCount - 0.015;
      ctx.beginPath();
      ctx.moveTo(pt(u0, wTop).x, pt(u0, wTop).y);
      ctx.lineTo(pt(u1, wTop).x, pt(u1, wTop).y);
      ctx.lineTo(pt(u1, wBot).x, pt(u1, wBot).y);
      ctx.lineTo(pt(u0, wBot).x, pt(u0, wBot).y);
      ctx.closePath();
      ctx.fill();
    }
    // window divider strokes
    ctx.strokeStyle = 'rgba(40,30,25,0.45)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= paneCount; i++) {
      const u = i / paneCount;
      ctx.beginPath();
      ctx.moveTo(pt(u, wTop).x, pt(u, wTop).y);
      ctx.lineTo(pt(u, wBot).x, pt(u, wBot).y);
      ctx.stroke();
    }
    // top + bottom horizontal lines
    ctx.beginPath();
    ctx.moveTo(pt(0, wTop).x, pt(0, wTop).y);
    ctx.lineTo(pt(1, wTop).x, pt(1, wTop).y);
    ctx.moveTo(pt(0, wBot).x, pt(0, wBot).y);
    ctx.lineTo(pt(1, wBot).x, pt(1, wBot).y);
    ctx.stroke();

    // Parking lot stripes painted on the ground in front of the strip mall.
    // Project from the front edge outward by 0.4 cells along the normal.
    // We can't know which side faces a road, so we paint at ground level
    // immediately in front of the front face — looks like an outdoor lot.
    const lotDepth = 0.45;
    const fc1 = front.c1, fc2 = front.c2;
    // outward normal (perpendicular to c1->c2 in cell space)
    const ex = fc2.dx - fc1.dx;
    const ey = fc2.dy - fc1.dy;
    // rotate 90 deg outward (city center is at size/2,size/2, push away)
    const cellCx = size / 2, cellCy = size / 2;
    const mx = (fc1.dx + fc2.dx) / 2 - cellCx;
    const my = (fc1.dy + fc2.dy) / 2 - cellCy;
    // normalize the outward push
    const mLen = Math.sqrt(mx * mx + my * my) || 1;
    const nx = (mx / mLen) * lotDepth;
    const ny = (my / mLen) * lotDepth;
    const lp1 = project(x + fc1.dx, y + fc1.dy, baseZ + 0.01);
    const lp2 = project(x + fc2.dx, y + fc2.dy, baseZ + 0.01);
    const lp3 = project(x + fc2.dx + nx, y + fc2.dy + ny, baseZ + 0.01);
    const lp4 = project(x + fc1.dx + nx, y + fc1.dy + ny, baseZ + 0.01);
    ctx.fillStyle = '#3a3540';
    ctx.beginPath();
    ctx.moveTo(lp1.x, lp1.y);
    ctx.lineTo(lp2.x, lp2.y);
    ctx.lineTo(lp3.x, lp3.y);
    ctx.lineTo(lp4.x, lp4.y);
    ctx.closePath();
    ctx.fill();
    // parking stripes (white, perpendicular to building front)
    ctx.strokeStyle = 'rgba(245,235,210,0.7)';
    ctx.lineWidth = 0.7;
    const stripeCount = size * 3;
    for (let i = 1; i < stripeCount; i++) {
      const u = i / stripeCount;
      const sx = fc1.dx + (fc2.dx - fc1.dx) * u;
      const sy = fc1.dy + (fc2.dy - fc1.dy) * u;
      const a = project(x + sx, y + sy, baseZ + 0.01);
      const b = project(x + sx + nx, y + sy + ny, baseZ + 0.01);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  }

  // AIRPORT: flat tarmac slab with two parallel runways, taxiways,
  // a terminal building on one side, and threshold/centerline lights.
  // Axis aligned box in grid space. Side faces are painted back to front
  // by screen depth, then the top, so it reads right from any rotation.
  function drawGridBox(ctx, project, x0, y0, x1, y1, z0, z1, topCol, sideCol, edgeCol) {
    const c = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
    const faces = [];
    for (let i = 0; i < 4; i++) {
      const a = c[i], b = c[(i + 1) % 4];
      const pa0 = project(a[0], a[1], z0), pb0 = project(b[0], b[1], z0);
      const pa1 = project(a[0], a[1], z1), pb1 = project(b[0], b[1], z1);
      faces.push({ pts: [pa0, pb0, pb1, pa1], depth: (pa0.y + pb0.y) / 2 });
    }
    faces.sort((f, g) => f.depth - g.depth);
    for (const f of faces) {
      ctx.beginPath();
      ctx.moveTo(f.pts[0].x, f.pts[0].y);
      for (let i = 1; i < 4; i++) ctx.lineTo(f.pts[i].x, f.pts[i].y);
      ctx.closePath();
      ctx.fillStyle = sideCol;
      ctx.fill();
      if (edgeCol) { ctx.strokeStyle = edgeCol; ctx.lineWidth = 0.4; ctx.stroke(); }
    }
    const t = c.map(([px, py]) => project(px, py, z1));
    ctx.beginPath();
    ctx.moveTo(t[0].x, t[0].y);
    for (let i = 1; i < 4; i++) ctx.lineTo(t[i].x, t[i].y);
    ctx.closePath();
    ctx.fillStyle = topCol;
    ctx.fill();
    if (edgeCol) { ctx.strokeStyle = edgeCol; ctx.lineWidth = 0.4; ctx.stroke(); }
  }

  function drawStadium(ctx, project, x, y, special, baseZ, light) {
    const size = special.size;
    const cx = x + size / 2, cy = y + size / 2;
    const isNight = light.daylight < 0.4;
    const N = 44;
    const ring = (r, z) => {
      const pts = [];
      for (let i = 0; i < N; i++) {
        const a = (i / N) * Math.PI * 2;
        pts.push(project(cx + Math.cos(a) * r * 1.12, cy + Math.sin(a) * r * 0.9, z));
      }
      return pts;
    };
    const fillPoly = (pts, col) => {
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.closePath();
      ctx.fillStyle = col;
      ctx.fill();
    };
    const R = size * 0.46;
    const wallH = 0.95;
    // concourse plaza under the whole block
    const plaza = [[x, y], [x + size, y], [x + size, y + size], [x, y + size]].map(([px, py]) => project(px, py, baseZ + 0.01));
    fillPoly(plaza, tintHex('#cfc6b4', light));
    // outer wall band (front facing quads only)
    const bot = ring(R, baseZ), top = ring(R, baseZ + wallH);
    const centerY = project(cx, cy, baseZ).y;
    for (let i = 0; i < N; i++) {
      const j = (i + 1) % N;
      if ((bot[i].y + bot[j].y) / 2 < centerY) continue;
      ctx.beginPath();
      ctx.moveTo(bot[i].x, bot[i].y);
      ctx.lineTo(bot[j].x, bot[j].y);
      ctx.lineTo(top[j].x, top[j].y);
      ctx.lineTo(top[i].x, top[i].y);
      ctx.closePath();
      ctx.fillStyle = tintHex(i % 2 ? '#8b8f9c' : '#7f8492', light);
      ctx.fill();
    }
    // window band on the wall
    ctx.strokeStyle = isNight ? 'rgba(255,220,140,0.95)' : tintHex('#5a6070', light);
    ctx.lineWidth = Math.max(1, zoom * 0.8);
    ctx.beginPath();
    let started = false;
    const mid = ring(R, baseZ + wallH * 0.55);
    for (let i = 0; i <= N; i++) {
      const k = i % N;
      if (mid[k].y < centerY) { started = false; continue; }
      if (!started) { ctx.moveTo(mid[k].x, mid[k].y); started = true; }
      else ctx.lineTo(mid[k].x, mid[k].y);
    }
    ctx.stroke();
    // tiered stands, outer to inner, seats in blue
    const tiers = [
      { r: R, z: wallH, col: '#2f5f9e' },
      { r: R * 0.86, z: wallH * 0.78, col: '#3b72b8' },
      { r: R * 0.73, z: wallH * 0.56, col: '#2f5f9e' },
      { r: R * 0.62, z: wallH * 0.36, col: '#3b72b8' },
    ];
    for (const t of tiers) fillPoly(ring(t.r, baseZ + t.z), tintHex(t.col, light));
    // pitch
    const pitchZ = baseZ + wallH * 0.22;
    fillPoly(ring(R * 0.52, pitchZ), tintHex('#5f9a45', light));
    // mowing stripes and markings, clipped to the pitch oval
    ctx.save();
    const pitch = ring(R * 0.52, pitchZ);
    ctx.beginPath();
    ctx.moveTo(pitch[0].x, pitch[0].y);
    for (let i = 1; i < pitch.length; i++) ctx.lineTo(pitch[i].x, pitch[i].y);
    ctx.closePath();
    ctx.clip();
    ctx.strokeStyle = tintHex('#6fae52', light);
    ctx.lineWidth = Math.max(1.5, zoom * 1.6);
    for (let k = -4; k <= 4; k += 2) {
      const a = project(cx + k * 0.12, cy - R, pitchZ), b = project(cx + k * 0.12, cy + R, pitchZ);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(250,250,245,0.85)';
    ctx.lineWidth = 0.7;
    const m0 = project(cx, cy - R, pitchZ), m1 = project(cx, cy + R, pitchZ);
    ctx.beginPath(); ctx.moveTo(m0.x, m0.y); ctx.lineTo(m1.x, m1.y); ctx.stroke();
    const cc = ring(R * 0.14, pitchZ);
    ctx.beginPath();
    ctx.moveTo(cc[0].x, cc[0].y);
    for (let i = 1; i < cc.length; i++) ctx.lineTo(cc[i].x, cc[i].y);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
    // floodlight towers at the four corners
    const poleH = 2.4;
    for (const [px, py] of [[x + 0.25, y + 0.25], [x + size - 0.25, y + 0.25], [x + size - 0.25, y + size - 0.25], [x + 0.25, y + size - 0.25]]) {
      const b = project(px, py, baseZ), t = project(px, py, baseZ + poleH);
      ctx.strokeStyle = tintHex('#4a4d57', light);
      ctx.lineWidth = Math.max(1, zoom * 0.7);
      ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(t.x, t.y); ctx.stroke();
      ctx.fillStyle = isNight ? '#fff6d8' : tintHex('#d9d6cc', light);
      ctx.fillRect(t.x - 3 * zoom, t.y - 2 * zoom, 6 * zoom, 3 * zoom);
      if (isNight) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(t.x, t.y, 0, t.x, t.y, 26 * zoom);
        g.addColorStop(0, 'rgba(255,250,225,0.55)');
        g.addColorStop(1, 'rgba(255,250,225,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(t.x, t.y, 26 * zoom, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    }
  }

  function drawAirport(ctx, project, ax, ay, special, baseZ, light, animating) {
    const W = special.width, H = special.height;
    // Tarmac base
    const p00 = project(ax,     ay,     baseZ + 0.01);
    const p10 = project(ax + W, ay,     baseZ + 0.01);
    const p11 = project(ax + W, ay + H, baseZ + 0.01);
    const p01 = project(ax,     ay + H, baseZ + 0.01);
    ctx.fillStyle = tintHex('#2e2a32', light);
    ctx.beginPath();
    ctx.moveTo(p00.x, p00.y);
    ctx.lineTo(p10.x, p10.y);
    ctx.lineTo(p11.x, p11.y);
    ctx.lineTo(p01.x, p01.y);
    ctx.closePath();
    ctx.fill();

    // Outer fence/edge (thin warm line)
    ctx.strokeStyle = tintHex('#8a8074', light);
    ctx.lineWidth = 0.6;
    ctx.stroke();

    // Two runways (darker strips with white centerline dashes)
    const runways = [
      { yCenter: ay + 1.0, width: 0.55 },
      { yCenter: ay + 2.7, width: 0.55 },
    ];
    for (const rw of runways) {
      const y1 = rw.yCenter - rw.width / 2;
      const y2 = rw.yCenter + rw.width / 2;
      const r00 = project(ax + 0.4,    y1, baseZ + 0.02);
      const r10 = project(ax + W - 0.4, y1, baseZ + 0.02);
      const r11 = project(ax + W - 0.4, y2, baseZ + 0.02);
      const r01 = project(ax + 0.4,    y2, baseZ + 0.02);
      ctx.fillStyle = tintHex('#1a1820', light);
      ctx.beginPath();
      ctx.moveTo(r00.x, r00.y);
      ctx.lineTo(r10.x, r10.y);
      ctx.lineTo(r11.x, r11.y);
      ctx.lineTo(r01.x, r01.y);
      ctx.closePath();
      ctx.fill();

      // Centerline dashes
      ctx.strokeStyle = 'rgba(245,235,210,0.85)';
      ctx.lineWidth = 0.9;
      const dashCount = 14;
      for (let i = 0; i < dashCount; i++) {
        const u0 = i / dashCount + 0.02;
        const u1 = (i + 0.6) / dashCount;
        const dx0 = ax + 0.4 + u0 * (W - 0.8);
        const dx1 = ax + 0.4 + u1 * (W - 0.8);
        const a = project(dx0, rw.yCenter, baseZ + 0.025);
        const b = project(dx1, rw.yCenter, baseZ + 0.025);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }

      // Threshold bars at each end (perpendicular cluster of white stripes)
      ctx.lineWidth = 0.7;
      for (let i = 0; i < 5; i++) {
        const u = i * 0.04 + 0.01;
        const tx = ax + 0.4 + u * (W - 0.8) * 0.1;
        const a = project(tx, y1 + 0.05, baseZ + 0.025);
        const b = project(tx, y2 - 0.05, baseZ + 0.025);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        const tx2 = ax + W - 0.4 - u * (W - 0.8) * 0.1;
        const c = project(tx2, y1 + 0.05, baseZ + 0.025);
        const d = project(tx2, y2 - 0.05, baseZ + 0.025);
        ctx.beginPath();
        ctx.moveTo(c.x, c.y);
        ctx.lineTo(d.x, d.y);
        ctx.stroke();
      }

      // Edge lights at night
      if (light.daylight < 0.5) {
        const a = (0.5 - light.daylight) / 0.5;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 18; i++) {
          const u = i / 17;
          const xCoord = ax + 0.5 + u * (W - 1);
          // top edge light
          const pt = project(xCoord, y1 - 0.05, baseZ + 0.03);
          const R = Math.max(3, zoom * 3);
          const g = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, R);
          // ends are red, rest white
          const isThreshold = i === 0 || i === 17;
          const color = isThreshold ? '255,80,80' : '255,240,200';
          g.addColorStop(0, `rgba(${color},${0.75 * a})`);
          g.addColorStop(1, `rgba(${color},0)`);
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, R, 0, Math.PI * 2);
          ctx.fill();
          // bottom edge light
          const pb = project(xCoord, y2 + 0.05, baseZ + 0.03);
          const g2 = ctx.createRadialGradient(pb.x, pb.y, 0, pb.x, pb.y, R);
          g2.addColorStop(0, `rgba(${color},${0.75 * a})`);
          g2.addColorStop(1, `rgba(${color},0)`);
          ctx.fillStyle = g2;
          ctx.beginPath();
          ctx.arc(pb.x, pb.y, R, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    }

    // Terminal building on the south side (between/below the runways)
    const termX1 = ax + 1.0, termX2 = ax + W - 1.0;
    const termY1 = ay + H - 0.85, termY2 = ay + H - 0.15;
    const termH = 0.6;
    const tp00 = project(termX1, termY1, baseZ + 0.02);
    const tp10 = project(termX2, termY1, baseZ + 0.02);
    const tp11 = project(termX2, termY2, baseZ + 0.02);
    const tp01 = project(termX1, termY2, baseZ + 0.02);
    const tt00 = project(termX1, termY1, baseZ + termH);
    const tt10 = project(termX2, termY1, baseZ + termH);
    const tt11 = project(termX2, termY2, baseZ + termH);
    const tt01 = project(termX1, termY2, baseZ + termH);
    // front face
    ctx.fillStyle = tintHex('#a9a4ad', light);
    ctx.beginPath();
    ctx.moveTo(tp01.x, tp01.y);
    ctx.lineTo(tp11.x, tp11.y);
    ctx.lineTo(tt11.x, tt11.y);
    ctx.lineTo(tt01.x, tt01.y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = tintHex('#5a5560', light);
    ctx.lineWidth = 0.5;
    ctx.stroke();
    // side face (east)
    ctx.fillStyle = tintHex('#8d8a92', light);
    ctx.beginPath();
    ctx.moveTo(tp11.x, tp11.y);
    ctx.lineTo(tp10.x, tp10.y);
    ctx.lineTo(tt10.x, tt10.y);
    ctx.lineTo(tt11.x, tt11.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // roof
    ctx.fillStyle = tintHex('#bcb6c0', light);
    ctx.beginPath();
    ctx.moveTo(tt00.x, tt00.y);
    ctx.lineTo(tt10.x, tt10.y);
    ctx.lineTo(tt11.x, tt11.y);
    ctx.lineTo(tt01.x, tt01.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Terminal windows (rows of lit panes)
    const isNight = light.daylight < 0.4;
    ctx.fillStyle = isNight ? 'rgba(255,220,140,0.95)' : 'rgba(180,200,220,0.55)';
    const winCount = 18;
    for (let i = 0; i < winCount; i++) {
      const u0 = i / winCount + 0.02;
      const u1 = (i + 1) / winCount - 0.02;
      const wx0 = termX1 + u0 * (termX2 - termX1);
      const wx1 = termX1 + u1 * (termX2 - termX1);
      const wyf = termY2;
      const a0 = project(wx0, wyf, baseZ + termH * 0.25);
      const a1 = project(wx1, wyf, baseZ + termH * 0.25);
      const a2 = project(wx1, wyf, baseZ + termH * 0.7);
      const a3 = project(wx0, wyf, baseZ + termH * 0.7);
      ctx.beginPath();
      ctx.moveTo(a0.x, a0.y);
      ctx.lineTo(a1.x, a1.y);
      ctx.lineTo(a2.x, a2.y);
      ctx.lineTo(a3.x, a3.y);
      ctx.closePath();
      ctx.fill();
    }

    // Control tower beside the terminal
    const towerCx = ax + W - 0.7, towerCy = ay + H - 0.5;
    const towerH = 1.6;
    const tr = 0.25;
    // Tower mast (cylinder approximated as quad)
    const m00 = project(towerCx - tr * 0.5, towerCy, baseZ + 0.02);
    const m10 = project(towerCx + tr * 0.5, towerCy, baseZ + 0.02);
    const m11 = project(towerCx + tr * 0.5, towerCy, baseZ + towerH);
    const m01 = project(towerCx - tr * 0.5, towerCy, baseZ + towerH);
    ctx.fillStyle = tintHex('#928a8c', light);
    ctx.beginPath();
    ctx.moveTo(m00.x, m00.y);
    ctx.lineTo(m10.x, m10.y);
    ctx.lineTo(m11.x, m11.y);
    ctx.lineTo(m01.x, m01.y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = tintHex('#4c4448', light);
    ctx.lineWidth = 0.5;
    ctx.stroke();
    // Tower glass cap
    const cap = project(towerCx, towerCy, baseZ + towerH);
    ctx.fillStyle = isNight ? 'rgba(255,220,140,0.95)' : 'rgba(120,160,200,0.85)';
    ctx.beginPath();
    ctx.arc(cap.x, cap.y, Math.max(2, zoom * 1.8), 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = tintHex('#2a2530', light);
    ctx.lineWidth = 0.6;
    ctx.stroke();
    // Blinking red beacon at the very top
    const beaconPhase = (performance.now() / 1100 + special.variance * 7) % 1;
    if (!animating && beaconPhase < 0.4) {
      const beacon = project(towerCx, towerCy, baseZ + towerH + 0.15);
      ctx.fillStyle = 'rgba(255,60,60,0.95)';
      ctx.beginPath();
      ctx.arc(beacon.x, beacon.y, Math.max(1.4, zoom * 1.2), 0, Math.PI * 2);
      ctx.fill();
      if (isNight) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const bg = ctx.createRadialGradient(beacon.x, beacon.y, 0, beacon.x, beacon.y, 14);
        bg.addColorStop(0, 'rgba(255,60,60,0.7)');
        bg.addColorStop(1, 'rgba(255,60,60,0)');
        ctx.fillStyle = bg;
        ctx.beginPath();
        ctx.arc(beacon.x, beacon.y, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  // NEIGHBORHOOD: 2x2 footprint containing a tight grid of identical
  // small houses (4 houses, 1 cell each, with sloped roofs). Reads as
  // a planned residential subdivision.
  function drawNeighborhood(ctx, project, ax, ay, size, baseZ, visualH, palette, accent, light, variance) {
    // Subdivide footprint into a houseGrid (2x2 of single houses).
    const cellSize = size / 2;
    const isNight = light.daylight < 0.4;
    const houseColor = tintHex(palette[2], light);
    const roofColor = tintHex(accent[3], light);
    const trimColor = tintHex(palette[0], light);
    const wallH = visualH * 0.65;
    const roofPeakH = visualH;

    // Build a small lawn first beneath everything (flat at baseZ).
    const lawn = tintHex('#7fb069', light);
    const L00 = project(ax,        ay,        baseZ + 0.005);
    const L10 = project(ax + size, ay,        baseZ + 0.005);
    const L11 = project(ax + size, ay + size, baseZ + 0.005);
    const L01 = project(ax,        ay + size, baseZ + 0.005);
    ctx.fillStyle = lawn;
    ctx.beginPath();
    ctx.moveTo(L00.x, L00.y);
    ctx.lineTo(L10.x, L10.y);
    ctx.lineTo(L11.x, L11.y);
    ctx.lineTo(L01.x, L01.y);
    ctx.closePath();
    ctx.fill();

    // Painter-sort the 4 houses back-to-front
    const houses = [];
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 2; c++) {
        const hx = ax + c * cellSize + cellSize * 0.18;
        const hy = ay + r * cellSize + cellSize * 0.18;
        const hw = cellSize * 0.64;
        const hd = cellSize * 0.64;
        houses.push({ hx, hy, hw, hd, r, c });
      }
    }
    houses.sort((a, b) => {
      const pa = project(a.hx + a.hw / 2, a.hy + a.hd / 2, baseZ);
      const pb = project(b.hx + b.hw / 2, b.hy + b.hd / 2, baseZ);
      return pa.y - pb.y;
    });

    for (const h of houses) {
      const { hx, hy, hw, hd } = h;
      // 4 wall corners
      const b00 = project(hx,      hy,      baseZ + 0.01);
      const b10 = project(hx + hw, hy,      baseZ + 0.01);
      const b11 = project(hx + hw, hy + hd, baseZ + 0.01);
      const b01 = project(hx,      hy + hd, baseZ + 0.01);
      const t00 = project(hx,      hy,      baseZ + wallH);
      const t10 = project(hx + hw, hy,      baseZ + wallH);
      const t11 = project(hx + hw, hy + hd, baseZ + wallH);
      const t01 = project(hx,      hy + hd, baseZ + wallH);
      // South face (front)
      ctx.fillStyle = houseColor;
      ctx.beginPath();
      ctx.moveTo(b01.x, b01.y);
      ctx.lineTo(b11.x, b11.y);
      ctx.lineTo(t11.x, t11.y);
      ctx.lineTo(t01.x, t01.y);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = trimColor;
      ctx.lineWidth = 0.4;
      ctx.stroke();
      // East face
      ctx.fillStyle = tintHex(palette[1], light);
      ctx.beginPath();
      ctx.moveTo(b11.x, b11.y);
      ctx.lineTo(b10.x, b10.y);
      ctx.lineTo(t10.x, t10.y);
      ctx.lineTo(t11.x, t11.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Pitched roof: ridge runs along the y-axis at the center
      const ridgeY = hy + hd / 2;
      const ridge0 = project(hx,      ridgeY, baseZ + roofPeakH);
      const ridge1 = project(hx + hw, ridgeY, baseZ + roofPeakH);
      // Front roof half
      ctx.fillStyle = roofColor;
      ctx.beginPath();
      ctx.moveTo(t01.x, t01.y);
      ctx.lineTo(t11.x, t11.y);
      ctx.lineTo(ridge1.x, ridge1.y);
      ctx.lineTo(ridge0.x, ridge0.y);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = tintHex('#3a2018', light);
      ctx.lineWidth = 0.4;
      ctx.stroke();
      // Back roof half (slightly darker)
      ctx.fillStyle = tintHex(accent[2], light);
      ctx.beginPath();
      ctx.moveTo(t00.x, t00.y);
      ctx.lineTo(t10.x, t10.y);
      ctx.lineTo(ridge1.x, ridge1.y);
      ctx.lineTo(ridge0.x, ridge0.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Single front window (lit at night)
      ctx.fillStyle = isNight ? 'rgba(255,220,140,0.95)' : 'rgba(180,200,220,0.55)';
      const ws = 0.18;
      const wcx = hx + hw * 0.5, wcy = hy + hd;
      const wA = project(wcx - hw * ws, wcy, baseZ + wallH * 0.35);
      const wB = project(wcx + hw * ws, wcy, baseZ + wallH * 0.35);
      const wC = project(wcx + hw * ws, wcy, baseZ + wallH * 0.70);
      const wD = project(wcx - hw * ws, wcy, baseZ + wallH * 0.70);
      ctx.beginPath();
      ctx.moveTo(wA.x, wA.y);
      ctx.lineTo(wB.x, wB.y);
      ctx.lineTo(wC.x, wC.y);
      ctx.lineTo(wD.x, wD.y);
      ctx.closePath();
      ctx.fill();
    }
  }

  // APARTMENT: a regular grid of identical lit windows across the front
  // face. Drawn within the existing box render via the decoration switch.
  function drawApartmentFront(ctx, project, ax, ay, size, baseZ, visualH, sides, isNight) {
    if (!sides || sides.length === 0) return;
    const front = sides[sides.length - 1];
    const c1 = front.c1, c2 = front.c2;
    const topZ = baseZ + visualH;
    const pt = (u, v) => {
      const fx = ax + c1.dx + (c2.dx - c1.dx) * u;
      const fy = ay + c1.dy + (c2.dy - c1.dy) * u;
      return project(fx, fy, baseZ + visualH * v);
    };
    // Grid of windows: 5 cols x 4 rows of lit panes
    const cols = 5, rows = 4;
    const winFill = isNight ? 'rgba(255,220,140,0.95)' : 'rgba(180,200,225,0.55)';
    ctx.fillStyle = winFill;
    const padU = 0.08, padV = 0.10;
    const gapU = 0.02, gapV = 0.04;
    const usableU = 1 - 2 * padU;
    const usableV = 1 - 2 * padV;
    const wU = (usableU - gapU * (cols - 1)) / cols;
    const wV = (usableV - gapV * (rows - 1)) / rows;
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const u0 = padU + c * (wU + gapU);
        const u1 = u0 + wU;
        const v0 = padV + r * (wV + gapV);
        const v1 = v0 + wV;
        const a = pt(u0, v0);
        const b = pt(u1, v0);
        const cc = pt(u1, v1);
        const d = pt(u0, v1);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.lineTo(cc.x, cc.y);
        ctx.lineTo(d.x, d.y);
        ctx.closePath();
        ctx.fill();
      }
    }
    // Subtle frame strokes between window columns to give vertical rhythm
    ctx.strokeStyle = 'rgba(40,30,30,0.35)';
    ctx.lineWidth = 0.5;
    for (let c = 0; c <= cols; c++) {
      const u = padU + c * (wU + gapU) - gapU * 0.5;
      if (u < 0 || u > 1) continue;
      const a = pt(u, padV);
      const b = pt(u, 1 - padV);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  }

  function drawMarquee(ctx, b1, b2, t1, t2, bh, accent, isNight, variance) {
    // Vertical sign strip in the middle of the front face
    const u1 = 0.4, u2 = 0.6;
    const vTop = 0.95, vBot = 0.15;
    const pt = (u, vv) => {
      const a = lerpPt(b1, b2, u), b = lerpPt(t1, t2, u);
      return lerpPt(a, b, 1 - vv);
    };
    const p1 = pt(u1, vBot), p2 = pt(u2, vBot), p3 = pt(u2, vTop), p4 = pt(u1, vTop);
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.lineTo(p3.x, p3.y);
    ctx.lineTo(p4.x, p4.y);
    ctx.closePath();
    if (isNight) {
      ctx.fillStyle = 'rgba(255,220,140,0.9)';
      ctx.fill();
      // glow halo
      const m1 = lerpPt(p1, p3, 0.5);
      const g = ctx.createRadialGradient(m1.x, m1.y, 0, m1.x, m1.y, 18);
      g.addColorStop(0, 'rgba(255,220,140,0.5)');
      g.addColorStop(1, 'rgba(255,220,140,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(m1.x, m1.y, 18, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = accent[2];
      ctx.fill();
      ctx.strokeStyle = accent[3];
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }
    // dot pattern down the sign for "letters"
    const dotCount = Math.max(3, Math.floor(bh / 1.5));
    ctx.fillStyle = isNight ? 'rgba(180,90,40,0.95)' : accent[3];
    for (let i = 0; i < dotCount; i++) {
      const t = (i + 0.5) / dotCount;
      const cp = pt(0.5, lerp(vBot, vTop, t));
      ctx.beginPath();
      ctx.arc(cp.x, cp.y, 0.9, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawPipelights(ctx, project, x, y, size, baseZ, topZ, accent, isNight) {
    // Glowing lines along the 4 vertical edges and around the top.
    const color = isNight ? 'rgba(160,220,255,1)' : accent[3];
    const glowColor = 'rgba(160,220,255,0.45)';
    ctx.lineCap = 'round';
    // 4 vertical edges
    const verts = [
      [0, 0], [size, 0], [size, size], [0, size]
    ];
    for (const v of verts) {
      const b = project(x + v[0], y + v[1], baseZ);
      const t = project(x + v[0], y + v[1], topZ);
      if (isNight) {
        ctx.strokeStyle = glowColor;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(t.x, t.y);
        ctx.stroke();
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(t.x, t.y);
      ctx.stroke();
    }
    // top ring
    const t1 = project(x, y, topZ);
    const t2 = project(x + size, y, topZ);
    const t3 = project(x + size, y + size, topZ);
    const t4 = project(x, y + size, topZ);
    if (isNight) {
      ctx.strokeStyle = glowColor;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(t1.x, t1.y);
      ctx.lineTo(t2.x, t2.y);
      ctx.lineTo(t3.x, t3.y);
      ctx.lineTo(t4.x, t4.y);
      ctx.closePath();
      ctx.stroke();
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(t1.x, t1.y);
    ctx.lineTo(t2.x, t2.y);
    ctx.lineTo(t3.x, t3.y);
    ctx.lineTo(t4.x, t4.y);
    ctx.closePath();
    ctx.stroke();
    ctx.lineCap = 'butt';
  }

  // Polygon-aware variant: pipe lights along every polygon edge.
  function drawPipelightsPoly(ctx, project, x, y, fCorners, baseZ, topZ, accent, isNight) {
    const color = isNight ? 'rgba(160,220,255,1)' : accent[3];
    const glowColor = 'rgba(160,220,255,0.45)';
    ctx.lineCap = 'round';
    const N = fCorners.length;
    // verticals at each polygon corner
    for (let i = 0; i < N; i++) {
      const c = fCorners[i];
      const b = project(x + c.dx, y + c.dy, baseZ);
      const t = project(x + c.dx, y + c.dy, topZ);
      if (isNight) {
        ctx.strokeStyle = glowColor;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(t.x, t.y);
        ctx.stroke();
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(t.x, t.y);
      ctx.stroke();
    }
    // top ring along polygon perimeter
    if (isNight) {
      ctx.strokeStyle = glowColor;
      ctx.lineWidth = 4;
      ctx.beginPath();
      for (let i = 0; i < N; i++) {
        const c = fCorners[i];
        const p = project(x + c.dx, y + c.dy, topZ);
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.closePath();
      ctx.stroke();
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let i = 0; i < N; i++) {
      const c = fCorners[i];
      const p = project(x + c.dx, y + c.dy, topZ);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.lineCap = 'butt';
  }

  function drawBalconies(ctx, project, x, y, size, baseZ, bh, palette, accent) {
    // Every ~3 height units, draw a band that's slightly wider than building.
    const bands = Math.max(1, Math.floor(bh / 3));
    const overhang = 0.08;
    for (let i = 0; i < bands; i++) {
      const bz = baseZ + (i + 1) * (bh / (bands + 1));
      const bTop = bz + 0.4;
      const bBot = bz;
      const c1 = project(x - overhang, y - overhang, bBot);
      const c2 = project(x + size + overhang, y - overhang, bBot);
      const c3 = project(x + size + overhang, y + size + overhang, bBot);
      const c4 = project(x - overhang, y + size + overhang, bBot);
      const t1 = project(x - overhang, y - overhang, bTop);
      const t2 = project(x + size + overhang, y - overhang, bTop);
      const t3 = project(x + size + overhang, y + size + overhang, bTop);
      const t4 = project(x - overhang, y + size + overhang, bTop);
      // top of slab
      ctx.beginPath();
      ctx.moveTo(t1.x, t1.y);
      ctx.lineTo(t2.x, t2.y);
      ctx.lineTo(t3.x, t3.y);
      ctx.lineTo(t4.x, t4.y);
      ctx.closePath();
      ctx.fillStyle = accent[1];
      ctx.fill();
      ctx.strokeStyle = accent[3];
      ctx.lineWidth = 0.7;
      ctx.stroke();
      // bottom edge (front+right visible)
      ctx.beginPath();
      ctx.moveTo(t2.x, t2.y);
      ctx.lineTo(c2.x, c2.y);
      ctx.lineTo(c3.x, c3.y);
      ctx.lineTo(t3.x, t3.y);
      ctx.closePath();
      ctx.fillStyle = accent[2];
      ctx.fill();
      ctx.stroke();
    }
  }

  // Polygon-aware balconies: each band is a slightly enlarged polygon
  // perimeter at the band's height. We "enlarge" by moving each corner
  // away from the polygon centroid.
  function drawBalconiesPoly(ctx, project, x, y, fCorners, baseZ, bh, palette, accent) {
    const bands = Math.max(1, Math.floor(bh / 3));
    const overhangPct = 0.08;
    // centroid
    let ccx = 0, ccy = 0;
    for (const c of fCorners) { ccx += c.dx; ccy += c.dy; }
    ccx /= fCorners.length; ccy /= fCorners.length;
    // enlarged corners
    const expanded = fCorners.map(c => ({
      dx: c.dx + (c.dx - ccx) * overhangPct,
      dy: c.dy + (c.dy - ccy) * overhangPct,
    }));
    for (let i = 0; i < bands; i++) {
      const bz = baseZ + (i + 1) * (bh / (bands + 1));
      const bTop = bz + 0.4;
      const topPolys = expanded.map(c => project(x + c.dx, y + c.dy, bTop));
      // top of slab
      ctx.beginPath();
      ctx.moveTo(topPolys[0].x, topPolys[0].y);
      for (let k = 1; k < topPolys.length; k++) ctx.lineTo(topPolys[k].x, topPolys[k].y);
      ctx.closePath();
      ctx.fillStyle = accent[1];
      ctx.fill();
      ctx.strokeStyle = accent[3];
      ctx.lineWidth = 0.7;
      ctx.stroke();
    }
  }

  function drawPyramid(ctx, project, x, y, size, baseZ, bh, palette, accent, sides, light, unitCorners) {
    // 4 stacked stages, each smaller. Each gets polygon faces + top.
    const stages = 4;
    const a = 1.0;
    const N = unitCorners.length;
    const cosY = Math.cos(yaw), sinY = Math.sin(yaw);
    const cellCx = 0.5, cellCy = 0.5;

    // Pre-compute outward normals per edge (used for visibility test)
    const edgeVis = [];
    for (let i = 0; i < N; i++) {
      const j = (i + 1) % N;
      const mx = (unitCorners[i].dx + unitCorners[j].dx) / 2;
      const my = (unitCorners[i].dy + unitCorners[j].dy) / 2;
      const ox = mx - cellCx, oy = my - cellCy;
      const rx = ox * cosY - oy * sinY;
      const ry = ox * sinY + oy * cosY;
      edgeVis.push((rx + ry) > 0);
    }

    for (let st = 0; st < stages; st++) {
      const t0 = st / stages;
      const t1 = (st + 1) / stages;
      const z0 = baseZ + bh * t0;
      const z1 = baseZ + bh * t1;
      // Stage shrink factors -- in cell-local space, lerp each corner toward
      // the centroid.
      const shrink0 = 0.08 * st;
      const shrink1 = 0.08 * (st + 1);
      const shrunkBase = unitCorners.map(c => ({
        dx: lerp(c.dx, cellCx, shrink0),
        dy: lerp(c.dy, cellCy, shrink0),
      }));
      const shrunkTop = unitCorners.map(c => ({
        dx: lerp(c.dx, cellCx, shrink1),
        dy: lerp(c.dy, cellCy, shrink1),
      }));
      const basePts = shrunkBase.map(c => project(x + c.dx * size, y + c.dy * size, z0));
      const topPts  = shrunkTop.map(c =>  project(x + c.dx * size, y + c.dy * size, z1));

      // Visible side faces (back to front)
      const visEdges = [];
      for (let i = 0; i < N; i++) {
        if (!edgeVis[i]) continue;
        const j = (i + 1) % N;
        const ay = (basePts[i].y + basePts[j].y + topPts[i].y + topPts[j].y) / 4;
        visEdges.push({ i, j, depth: ay });
      }
      visEdges.sort((aa, bb) => aa.depth - bb.depth);
      for (const e of visEdges) {
        const tone = (e.i % 2 === 0) ? palette[2] : palette[1];
        watercolorPolygon(ctx, [basePts[e.i], basePts[e.j], topPts[e.j], topPts[e.i]],
          withAlpha(tone, a), 0.18);
      }
      // Stage top
      watercolorPolygon(ctx, topPts, withAlpha(palette[0], a), 0.14, 'top');
    }
  }

  function drawDome(ctx, project, x, y, size, topZ, accent, isNight) {
    // Approximate dome: draw a semicircle on top of the building.
    // We project the center + radius on screen and draw an ellipse.
    const cx = project(x + size / 2, y + size / 2, topZ);
    const edgeR = project(x + size, y + size / 2, topZ);
    const radiusX = Math.abs(edgeR.x - cx.x);
    const radiusY = radiusX * 0.65; // squashed for iso
    // gradient dome
    const g = ctx.createRadialGradient(
      cx.x - radiusX * 0.3, cx.y - radiusY * 0.5, 0,
      cx.x, cx.y, radiusX * 1.2
    );
    g.addColorStop(0, accent[0]);
    g.addColorStop(0.6, accent[1]);
    g.addColorStop(1, accent[2]);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(cx.x, cx.y - radiusY * 0.2, radiusX, radiusY, 0, Math.PI, 2 * Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = accent[3];
    ctx.lineWidth = 0.8;
    ctx.stroke();
    // small finial on top
    ctx.fillStyle = accent[3];
    ctx.beginPath();
    ctx.arc(cx.x, cx.y - radiusY * 1.1, 2, 0, Math.PI * 2);
    ctx.fill();
    if (isNight) {
      // glow on top
      const fg = ctx.createRadialGradient(cx.x, cx.y - radiusY * 1.1, 0, cx.x, cx.y - radiusY * 1.1, 10);
      fg.addColorStop(0, 'rgba(255,200,120,0.7)');
      fg.addColorStop(1, 'rgba(255,200,120,0)');
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.arc(cx.x, cx.y - radiusY * 1.1, 10, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Polygon-aware dome: uses the polygon centroid + radius derived from
  // the farthest corner.
  function drawDomePoly(ctx, project, x, y, fCorners, topZ, accent, isNight, size) {
    let ccx = 0, ccy = 0;
    for (const c of fCorners) { ccx += c.dx; ccy += c.dy; }
    ccx /= fCorners.length; ccy /= fCorners.length;
    const cx = project(x + ccx, y + ccy, topZ);
    // use a corner that's mostly on the X axis from centroid
    // find max horizontal distance among projected corners
    let maxR = 0;
    for (const c of fCorners) {
      const p = project(x + c.dx, y + c.dy, topZ);
      const d = Math.abs(p.x - cx.x);
      if (d > maxR) maxR = d;
    }
    const radiusX = maxR;
    const radiusY = radiusX * 0.65;
    const g = ctx.createRadialGradient(
      cx.x - radiusX * 0.3, cx.y - radiusY * 0.5, 0,
      cx.x, cx.y, radiusX * 1.2
    );
    g.addColorStop(0, accent[0]);
    g.addColorStop(0.6, accent[1]);
    g.addColorStop(1, accent[2]);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(cx.x, cx.y - radiusY * 0.2, radiusX, radiusY, 0, Math.PI, 2 * Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = accent[3];
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.fillStyle = accent[3];
    ctx.beginPath();
    ctx.arc(cx.x, cx.y - radiusY * 1.1, 2, 0, Math.PI * 2);
    ctx.fill();
    if (isNight) {
      const fg = ctx.createRadialGradient(cx.x, cx.y - radiusY * 1.1, 0, cx.x, cx.y - radiusY * 1.1, 10);
      fg.addColorStop(0, 'rgba(255,200,120,0.7)');
      fg.addColorStop(1, 'rgba(255,200,120,0)');
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.arc(cx.x, cx.y - radiusY * 1.1, 10, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawSpire(ctx, project, x, y, size, topZ, accent, isNight) {
    // Thin antenna line above the building, with a red blinking light
    // at night.
    const cx = project(x + size / 2, y + size / 2, topZ);
    const tip = project(x + size / 2, y + size / 2, topZ + 5);
    ctx.strokeStyle = accent[3];
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(cx.x, cx.y);
    ctx.lineTo(tip.x, tip.y);
    ctx.stroke();
    // tip light
    const blink = ((performance.now() / 700) % 1) > 0.5;
    ctx.fillStyle = isNight && blink ? '#ff5544' : (isNight ? '#aa3322' : accent[3]);
    ctx.beginPath();
    ctx.arc(tip.x, tip.y, isNight ? 3 : 1.6, 0, Math.PI * 2);
    ctx.fill();
    if (isNight && blink) {
      const g = ctx.createRadialGradient(tip.x, tip.y, 0, tip.x, tip.y, 12);
      g.addColorStop(0, 'rgba(255,90,70,0.6)');
      g.addColorStop(1, 'rgba(255,90,70,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(tip.x, tip.y, 12, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawCrown(ctx, b1, b2, t1, t2, bh, accent, isNight) {
    // Brighter glass strip across the top quarter of the building.
    const u0 = 0.0, u1 = 1.0;
    const vTop = 1.0, vBot = 0.75; // top 25%
    const pt = (u, vv) => {
      const a = lerpPt(b1, b2, u), b = lerpPt(t1, t2, u);
      return lerpPt(a, b, 1 - vv);
    };
    const p1 = pt(u0, vBot), p2 = pt(u1, vBot), p3 = pt(u1, vTop), p4 = pt(u0, vTop);
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.lineTo(p3.x, p3.y);
    ctx.lineTo(p4.x, p4.y);
    ctx.closePath();
    // gradient: lighter at top
    let minY = p1.y, maxY = p1.y;
    [p2, p3, p4].forEach(p => { if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y; });
    const g = ctx.createLinearGradient(0, maxY, 0, minY);
    g.addColorStop(0, accent[1]);
    g.addColorStop(1, isNight ? 'rgba(255,235,170,0.95)' : accent[0]);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = accent[3];
    ctx.lineWidth = 0.7;
    ctx.stroke();
    // mullions
    const mullCount = 3;
    ctx.strokeStyle = `rgba(60,40,30,0.35)`;
    ctx.lineWidth = 0.5;
    for (let i = 1; i < mullCount; i++) {
      const f = i / mullCount;
      const a = pt(f, vBot);
      const b = pt(f, vTop);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  }

  function drawStripes(ctx, project, x, y, size, baseZ, topZ, palette, accent, sides) {
    // Re-draw the side faces with alternating bands of accent + palette[2]
    const bh = topZ - baseZ;
    const bands = Math.max(3, Math.floor(bh));
    for (const side of sides) {
      for (let i = 0; i < bands; i++) {
        const t0 = i / bands;
        const t1 = (i + 1) / bands;
        const z0 = baseZ + bh * t0;
        const z1 = baseZ + bh * t1;
        const c1 = project(x + side.c1.dx, y + side.c1.dy, z0);
        const c2 = project(x + side.c2.dx, y + side.c2.dy, z0);
        const c3 = project(x + side.c2.dx, y + side.c2.dy, z1);
        const c4 = project(x + side.c1.dx, y + side.c1.dy, z1);
        const fill = (i % 2 === 0) ? palette[2] : accent[2];
        ctx.beginPath();
        ctx.moveTo(c1.x, c1.y);
        ctx.lineTo(c2.x, c2.y);
        ctx.lineTo(c3.x, c3.y);
        ctx.lineTo(c4.x, c4.y);
        ctx.closePath();
        ctx.fillStyle = fill;
        ctx.fill();
      }
    }
  }

  function drawClockFace(ctx, b1, b2, t1, t2, bh, accent, variance) {
    // Centered upper-third clock face: a circle with two hands.
    const cuPos = 0.5;
    const cvPos = 0.78; // up the wall
    const pt = (u, vv) => {
      const a = lerpPt(b1, b2, u), b = lerpPt(t1, t2, u);
      return lerpPt(a, b, 1 - vv);
    };
    const center = pt(cuPos, cvPos);
    // Estimate face radius from front-face width
    const corner = pt(0, cvPos);
    const dist = Math.hypot(corner.x - center.x, corner.y - center.y);
    const r = dist * 0.28;
    ctx.fillStyle = '#fdf7ec';
    ctx.beginPath();
    ctx.arc(center.x, center.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = accent[3];
    ctx.lineWidth = 1.0;
    ctx.stroke();
    // Hour ticks
    for (let i = 0; i < 12; i++) {
      const a = -Math.PI / 2 + i * (Math.PI / 6);
      const x1 = center.x + Math.cos(a) * r * 0.85;
      const y1 = center.y + Math.sin(a) * r * 0.85;
      const x2 = center.x + Math.cos(a) * r;
      const y2 = center.y + Math.sin(a) * r;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    // Hour + minute hand from current sun angle (so they spin during day-cycle)
    const sa = sunAngleRef.current;
    const hourAngle = sa - Math.PI / 2; // noon = up
    const minAngle = sa * 12 - Math.PI / 2;
    ctx.strokeStyle = accent[3];
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(center.x, center.y);
    ctx.lineTo(center.x + Math.cos(hourAngle) * r * 0.5, center.y + Math.sin(hourAngle) * r * 0.5);
    ctx.stroke();
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(center.x, center.y);
    ctx.lineTo(center.x + Math.cos(minAngle) * r * 0.7, center.y + Math.sin(minAngle) * r * 0.7);
    ctx.stroke();
    // center dot
    ctx.fillStyle = accent[3];
    ctx.beginPath();
    ctx.arc(center.x, center.y, 1.3, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawPenthouse(ctx, project, x, y, size, topZ, accent, isNight) {
    // Smaller offset box on top of the building (size * 0.5 footprint)
    const innerSize = size * 0.5;
    const offset = (size - innerSize) / 2;
    const ph = 1.2;
    const c00 = project(x + offset, y + offset, topZ);
    const c10 = project(x + offset + innerSize, y + offset, topZ);
    const c11 = project(x + offset + innerSize, y + offset + innerSize, topZ);
    const c01 = project(x + offset, y + offset + innerSize, topZ);
    const t00 = project(x + offset, y + offset, topZ + ph);
    const t10 = project(x + offset + innerSize, y + offset, topZ + ph);
    const t11 = project(x + offset + innerSize, y + offset + innerSize, topZ + ph);
    const t01 = project(x + offset, y + offset + innerSize, topZ + ph);
    // four sides
    const cosY = Math.cos(yaw), sinY = Math.sin(yaw);
    if ((cosY + sinY) > 0)   drawQuad(ctx, c10, c11, t11, t10, accent[2]);
    if ((-sinY + cosY) > 0)  drawQuad(ctx, c11, c01, t01, t11, accent[1]);
    if ((-cosY - sinY) > 0)  drawQuad(ctx, c01, c00, t00, t01, accent[2]);
    if ((sinY - cosY) > 0)   drawQuad(ctx, c00, c10, t10, t00, accent[1]);
    // top with glass
    ctx.beginPath();
    ctx.moveTo(t00.x, t00.y);
    ctx.lineTo(t10.x, t10.y);
    ctx.lineTo(t11.x, t11.y);
    ctx.lineTo(t01.x, t01.y);
    ctx.closePath();
    ctx.fillStyle = isNight ? 'rgba(255,220,140,0.85)' : accent[0];
    ctx.fill();
    ctx.strokeStyle = accent[3];
    ctx.lineWidth = 0.7;
    ctx.stroke();
  }

  // Polygon-aware penthouse: a scaled-down version of the building footprint
  // sits on top with a small extruded box.
  function drawPenthousePoly(ctx, project, x, y, unitCorners, size, topZ, accent, isNight) {
    const ph = 1.2;
    // shrink each corner toward centroid by 50%
    let ccx = 0, ccy = 0;
    for (const c of unitCorners) { ccx += c.dx; ccy += c.dy; }
    ccx /= unitCorners.length; ccy /= unitCorners.length;
    const shrunkCorners = unitCorners.map(c => ({
      dx: lerp(c.dx, ccx, 0.5) * size,
      dy: lerp(c.dy, ccy, 0.5) * size,
    }));
    const N = shrunkCorners.length;
    const basePts = shrunkCorners.map(c => project(x + c.dx, y + c.dy, topZ));
    const topPts  = shrunkCorners.map(c => project(x + c.dx, y + c.dy, topZ + ph));

    // visible faces
    const cosY = Math.cos(yaw), sinY = Math.sin(yaw);
    const centroid = { dx: ccx * size, dy: ccy * size };
    for (let i = 0; i < N; i++) {
      const j = (i + 1) % N;
      const mx = (shrunkCorners[i].dx + shrunkCorners[j].dx) / 2;
      const my = (shrunkCorners[i].dy + shrunkCorners[j].dy) / 2;
      const ox = mx - centroid.dx;
      const oy = my - centroid.dy;
      const rx = ox * cosY - oy * sinY;
      const ry = ox * sinY + oy * cosY;
      if ((rx + ry) > 0) {
        const tone = (i % 2 === 0) ? accent[2] : accent[1];
        drawQuad(ctx, basePts[i], basePts[j], topPts[j], topPts[i], tone);
      }
    }

    // top with glass
    ctx.beginPath();
    ctx.moveTo(topPts[0].x, topPts[0].y);
    for (let i = 1; i < N; i++) ctx.lineTo(topPts[i].x, topPts[i].y);
    ctx.closePath();
    ctx.fillStyle = isNight ? 'rgba(255,220,140,0.85)' : accent[0];
    ctx.fill();
    ctx.strokeStyle = accent[3];
    ctx.lineWidth = 0.7;
    ctx.stroke();
  }

  function drawQuad(ctx, p1, p2, p3, p4, fill) {
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.lineTo(p3.x, p3.y);
    ctx.lineTo(p4.x, p4.y);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = 'rgba(60,40,30,0.3)';
    ctx.lineWidth = 0.6;
    ctx.stroke();
  }

  // ============================================================
  // NEW IN v16: roofs + crane
  // ============================================================

  // Vaulted (barrel) roof: an arched cylinder along the building's longer axis.
  // Approximated as a 5-rib half-cylinder over the polygon's bounding box.
  function drawVaultedRoof(ctx, project, x, y, fCorners, size, topZ, palette, accent, isNight) {
    // Find polygon bbox in cell-local space
    let minDX = Infinity, maxDX = -Infinity, minDY = Infinity, maxDY = -Infinity;
    for (const c of fCorners) {
      if (c.dx < minDX) minDX = c.dx;
      if (c.dx > maxDX) maxDX = c.dx;
      if (c.dy < minDY) minDY = c.dy;
      if (c.dy > maxDY) maxDY = c.dy;
    }
    const w = maxDX - minDX;
    const h = maxDY - minDY;
    // Vault runs along the longer axis
    const alongX = w >= h;
    const vaultHeight = Math.min(w, h) * 0.4;
    const peakZ = topZ + vaultHeight;
    // Build N+1 rib points across the short axis
    const N = 8;
    const ribs = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      // Half-circle profile: angle from PI to 0
      const angle = Math.PI * (1 - t);
      const heightAt = Math.sin(angle) * vaultHeight;
      if (alongX) {
        // ribs run along x; spread across y
        const yPos = minDY + h * t;
        ribs.push({
          startEnd: [
            { dx: minDX, dy: yPos, z: topZ + heightAt },
            { dx: maxDX, dy: yPos, z: topZ + heightAt },
          ],
        });
      } else {
        const xPos = minDX + w * t;
        ribs.push({
          startEnd: [
            { dx: xPos, dy: minDY, z: topZ + heightAt },
            { dx: xPos, dy: maxDY, z: topZ + heightAt },
          ],
        });
      }
    }

    // Render the vault as a series of quads between adjacent ribs
    for (let i = 0; i < N; i++) {
      const a = ribs[i].startEnd;
      const b = ribs[i + 1].startEnd;
      const p1 = project(x + a[0].dx, y + a[0].dy, a[0].z);
      const p2 = project(x + a[1].dx, y + a[1].dy, a[0].z);
      const p3 = project(x + b[1].dx, y + b[1].dy, b[0].z);
      const p4 = project(x + b[0].dx, y + b[0].dy, b[0].z);
      // shading: lighter on the upper segments
      const segCenter = (i + 0.5) / N;
      // light when 0 < segCenter < 0.5, dark when > 0.5
      const lightFactor = Math.sin(Math.PI * segCenter); // 0..1..0
      const fill = lightFactor > 0.7 ? palette[0] : (lightFactor > 0.4 ? palette[1] : palette[2]);
      watercolorPolygon(ctx, [p1, p2, p3, p4], withAlpha(fill, 1.0), 0.16, 'top');
    }

    // End-cap arches (the two short ends)
    // Draw as filled arcs against the side wall.
    const endcap = (yEnd) => {
      const pts = [];
      for (let i = 0; i <= N; i++) {
        const t = i / N;
        const angle = Math.PI * (1 - t);
        const heightAt = Math.sin(angle) * vaultHeight;
        if (alongX) {
          pts.push(project(x + minDX + w * t, y + yEnd, topZ + heightAt));
        } else {
          pts.push(project(x + yEnd, y + minDY + h * t, topZ + heightAt));
        }
      }
      // Close at the bottom (along the building's top edge)
      if (alongX) {
        pts.push(project(x + maxDX, y + yEnd, topZ));
        pts.push(project(x + minDX, y + yEnd, topZ));
      } else {
        pts.push(project(x + yEnd, y + maxDY, topZ));
        pts.push(project(x + yEnd, y + minDY, topZ));
      }
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let k = 1; k < pts.length; k++) ctx.lineTo(pts[k].x, pts[k].y);
      ctx.closePath();
      ctx.fillStyle = palette[1];
      ctx.fill();
      ctx.strokeStyle = accent[3];
      ctx.lineWidth = 0.8;
      ctx.stroke();
    };
    if (alongX) {
      endcap(minDY); endcap(maxDY);
    } else {
      endcap(minDX); endcap(maxDX);
    }
  }

  // Barn / gabled roof: two sloped panels meeting at a ridge.
  function drawBarnRoof(ctx, project, x, y, fCorners, size, topZ, palette, accent, isNight) {
    let minDX = Infinity, maxDX = -Infinity, minDY = Infinity, maxDY = -Infinity;
    for (const c of fCorners) {
      if (c.dx < minDX) minDX = c.dx;
      if (c.dx > maxDX) maxDX = c.dx;
      if (c.dy < minDY) minDY = c.dy;
      if (c.dy > maxDY) maxDY = c.dy;
    }
    const w = maxDX - minDX;
    const h = maxDY - minDY;
    const alongX = w >= h;
    const peakHeight = Math.min(w, h) * 0.5;
    const peakZ = topZ + peakHeight;

    // Ridge endpoints (running along longer axis)
    let ridge1, ridge2, eave1a, eave1b, eave2a, eave2b;
    if (alongX) {
      const midY = (minDY + maxDY) / 2;
      ridge1 = { dx: minDX, dy: midY, z: peakZ };
      ridge2 = { dx: maxDX, dy: midY, z: peakZ };
      eave1a = { dx: minDX, dy: minDY, z: topZ };
      eave1b = { dx: maxDX, dy: minDY, z: topZ };
      eave2a = { dx: minDX, dy: maxDY, z: topZ };
      eave2b = { dx: maxDX, dy: maxDY, z: topZ };
    } else {
      const midX = (minDX + maxDX) / 2;
      ridge1 = { dx: midX, dy: minDY, z: peakZ };
      ridge2 = { dx: midX, dy: maxDY, z: peakZ };
      eave1a = { dx: minDX, dy: minDY, z: topZ };
      eave1b = { dx: minDX, dy: maxDY, z: topZ };
      eave2a = { dx: maxDX, dy: minDY, z: topZ };
      eave2b = { dx: maxDX, dy: maxDY, z: topZ };
    }

    const pr = (pt) => project(x + pt.dx, y + pt.dy, pt.z);

    // Determine which slope face is visible (lit) vs back
    // Use the iso-y of the midpoint of each face to sort and pick "front"
    const slopeA = [pr(eave1a), pr(eave1b), pr(ridge2), pr(ridge1)];
    const slopeB = [pr(eave2a), pr(eave2b), pr(ridge2), pr(ridge1)];
    const aMidY = (slopeA[0].y + slopeA[1].y + slopeA[2].y + slopeA[3].y) / 4;
    const bMidY = (slopeB[0].y + slopeB[1].y + slopeB[2].y + slopeB[3].y) / 4;
    // back slope draws first
    if (aMidY < bMidY) {
      watercolorPolygon(ctx, slopeA, withAlpha(palette[2], 1), 0.18, 'top');
      drawGable(ctx, pr, eave1a, eave2a, ridge1, palette, accent);
      drawGable(ctx, pr, eave1b, eave2b, ridge2, palette, accent);
      watercolorPolygon(ctx, slopeB, withAlpha(palette[1], 1), 0.18, 'top');
    } else {
      watercolorPolygon(ctx, slopeB, withAlpha(palette[2], 1), 0.18, 'top');
      drawGable(ctx, pr, eave1a, eave2a, ridge1, palette, accent);
      drawGable(ctx, pr, eave1b, eave2b, ridge2, palette, accent);
      watercolorPolygon(ctx, slopeA, withAlpha(palette[1], 1), 0.18, 'top');
    }
  }

  function drawGable(ctx, pr, eaveA, eaveB, ridge, palette, accent) {
    // Triangle on the building's end wall, filling between the two eaves
    // and the ridge. Acts as the gable end.
    ctx.beginPath();
    const p1 = pr(eaveA), p2 = pr(eaveB), p3 = pr(ridge);
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.lineTo(p3.x, p3.y);
    ctx.closePath();
    ctx.fillStyle = palette[1];
    ctx.fill();
    ctx.strokeStyle = accent[3];
    ctx.lineWidth = 0.6;
    ctx.stroke();
  }

  // Mansard: steep lower roof + flat upper. Two stacked extrusions.
  function drawMansardRoof(ctx, project, x, y, fCorners, size, topZ, palette, accent, isNight) {
    // Stage 1: a slightly-shrunk ring at a small height (the steep slope).
    let ccx = 0, ccy = 0;
    for (const c of fCorners) { ccx += c.dx; ccy += c.dy; }
    ccx /= fCorners.length; ccy /= fCorners.length;
    const lowerHeight = size * 0.7;
    const upperOffset = size * 0.18; // how much to inset the flat top

    const upperCorners = fCorners.map(c => ({
      dx: lerp(c.dx, ccx, 0.22),
      dy: lerp(c.dy, ccy, 0.22),
    }));
    const lowerPts = fCorners.map(c => project(x + c.dx, y + c.dy, topZ));
    const upperPts = upperCorners.map(c => project(x + c.dx, y + c.dy, topZ + lowerHeight));

    // Slopes -- one per polygon edge, drawn back-to-front
    const cosY = Math.cos(yaw), sinY = Math.sin(yaw);
    const N = fCorners.length;
    const slopes = [];
    for (let i = 0; i < N; i++) {
      const j = (i + 1) % N;
      const mx = (fCorners[i].dx + fCorners[j].dx) / 2;
      const my = (fCorners[i].dy + fCorners[j].dy) / 2;
      const ox = mx - ccx, oy = my - ccy;
      const rx = ox * cosY - oy * sinY;
      const ry = ox * sinY + oy * cosY;
      slopes.push({
        i, j,
        visible: (rx + ry) > 0,
        sortY: 0,
      });
    }
    for (const sl of slopes) {
      sl.sortY = (lowerPts[sl.i].y + lowerPts[sl.j].y + upperPts[sl.j].y + upperPts[sl.i].y) / 4;
    }
    slopes.sort((a, b) => a.sortY - b.sortY);
    for (const sl of slopes) {
      if (!sl.visible) continue;
      const quad = [lowerPts[sl.i], lowerPts[sl.j], upperPts[sl.j], upperPts[sl.i]];
      const fill = sl.i % 2 === 0 ? palette[2] : palette[1];
      watercolorPolygon(ctx, quad, withAlpha(fill, 1), 0.16, 'top');
    }

    // Flat upper deck
    watercolorPolygon(ctx, upperPts, withAlpha(palette[0], 1), 0.14, 'top');

    // Dormers: small bumps on the slopes. Skip for hex/triangle (looks messy).
    if (N === 4) {
      const dormerHeight = lowerHeight * 0.55;
      for (let i = 0; i < N; i++) {
        if (!slopes.find(s => s.i === i && s.visible)) continue;
        const j = (i + 1) % N;
        // Two dormers per face, evenly spaced
        for (let k = 0; k < 2; k++) {
          const t = 0.3 + k * 0.4;
          // dormer base center (lower edge of slope)
          const baseDx = lerp(fCorners[i].dx, fCorners[j].dx, t);
          const baseDy = lerp(fCorners[i].dy, fCorners[j].dy, t);
          const upDx = lerp(upperCorners[i].dx, upperCorners[j].dx, t);
          const upDy = lerp(upperCorners[i].dy, upperCorners[j].dy, t);
          // small rectangle inset along slope
          const dwHalf = 0.07;
          const dxLo1 = lerp(fCorners[i].dx, fCorners[j].dx, t - dwHalf);
          const dyLo1 = lerp(fCorners[i].dy, fCorners[j].dy, t - dwHalf);
          const dxLo2 = lerp(fCorners[i].dx, fCorners[j].dx, t + dwHalf);
          const dyLo2 = lerp(fCorners[i].dy, fCorners[j].dy, t + dwHalf);
          const baseZ = topZ;
          const peakZ = topZ + dormerHeight;
          const p1 = project(x + dxLo1, y + dyLo1, baseZ);
          const p2 = project(x + dxLo2, y + dyLo2, baseZ);
          const p3 = project(x + dxLo2, y + dyLo2, peakZ);
          const p4 = project(x + dxLo1, y + dyLo1, peakZ);
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.lineTo(p3.x, p3.y);
          ctx.lineTo(p4.x, p4.y);
          ctx.closePath();
          // window glow at night
          ctx.fillStyle = isNight ? 'rgba(255,215,140,0.85)' : palette[3];
          ctx.fill();
          ctx.strokeStyle = accent[3];
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }
      }
    }
  }

  // Stepped roof: three (or four) inset boxes stacked above the main top.
  // Like an art-deco skyscraper.
  function drawSteppedRoof(ctx, project, x, y, unitCorners, size, topZ, palette, accent, isNight) {
    const steps = 3;
    let ccx = 0, ccy = 0;
    for (const c of unitCorners) { ccx += c.dx; ccy += c.dy; }
    ccx /= unitCorners.length; ccy /= unitCorners.length;
    const N = unitCorners.length;
    const cosY = Math.cos(yaw), sinY = Math.sin(yaw);
    const stepHeight = size * 0.4;

    let prevZ = topZ;
    for (let st = 1; st <= steps; st++) {
      const shrink = st / (steps + 1) * 0.5; // 1/4, 2/4, 3/4 toward center
      const stepCorners = unitCorners.map(c => ({
        dx: lerp(c.dx, ccx, shrink) * size,
        dy: lerp(c.dy, ccy, shrink) * size,
      }));
      const thisZ = prevZ + stepHeight;
      const basePts = stepCorners.map(c => project(x + c.dx, y + c.dy, prevZ));
      const topPts = stepCorners.map(c => project(x + c.dx, y + c.dy, thisZ));

      // Visible side faces
      const visEdges = [];
      for (let i = 0; i < N; i++) {
        const j = (i + 1) % N;
        const mx = (stepCorners[i].dx + stepCorners[j].dx) / 2;
        const my = (stepCorners[i].dy + stepCorners[j].dy) / 2;
        const ox = mx - ccx * size;
        const oy = my - ccy * size;
        const rx = ox * cosY - oy * sinY;
        const ry = ox * sinY + oy * cosY;
        if ((rx + ry) > 0) {
          const ay = (basePts[i].y + basePts[j].y + topPts[i].y + topPts[j].y) / 4;
          visEdges.push({ i, j, depth: ay });
        }
      }
      visEdges.sort((a, b) => a.depth - b.depth);
      for (const e of visEdges) {
        const tone = (e.i % 2 === 0) ? palette[2] : palette[1];
        watercolorPolygon(ctx, [basePts[e.i], basePts[e.j], topPts[e.j], topPts[e.i]],
          withAlpha(tone, 1), 0.16);
      }
      // top
      watercolorPolygon(ctx, topPts, withAlpha(palette[0], 1), 0.14, 'top');
      prevZ = thisZ;
    }

    // Crowning accent block at the very top
    const tipBlockHeight = size * 0.25;
    let ccdx = 0, ccdy = 0;
    for (const c of unitCorners) { ccdx += c.dx * size; ccdy += c.dy * size; }
    ccdx /= unitCorners.length; ccdy /= unitCorners.length;
    const tipR = size * 0.1;
    const tipBase = project(x + ccdx, y + ccdy, prevZ);
    const tipTop = project(x + ccdx, y + ccdy, prevZ + tipBlockHeight);
    ctx.strokeStyle = accent[3];
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(tipBase.x, tipBase.y);
    ctx.lineTo(tipTop.x, tipTop.y);
    ctx.stroke();
    ctx.fillStyle = isNight ? '#ffe080' : accent[3];
    ctx.beginPath();
    ctx.arc(tipTop.x, tipTop.y, 2.5, 0, Math.PI * 2);
    ctx.fill();
    if (isNight) {
      const g = ctx.createRadialGradient(tipTop.x, tipTop.y, 0, tipTop.x, tipTop.y, 10);
      g.addColorStop(0, 'rgba(255,225,140,0.6)');
      g.addColorStop(1, 'rgba(255,225,140,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(tipTop.x, tipTop.y, 10, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Construction crane: vertical mast above the building, rotating
  // horizontal jib with a counter-jib, a small operator cab at the pivot,
  // and a hook cable hanging down. The jib rotates slowly over time.
  function drawCrane(ctx, project, x, y, size, topZ, accent, isNight, variance) {
    const cx = x + size / 2;
    const cy = y + size / 2;
    const mastHeight = size * 1.5 + 4; // tall above building
    const jibLength = size * 1.6;
    const counterJibLength = size * 0.6;

    const pBase = project(cx, cy, topZ);
    const pTop = project(cx, cy, topZ + mastHeight);

    // mast (vertical line) with crosshatch
    ctx.strokeStyle = '#c0a070';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(pBase.x, pBase.y);
    ctx.lineTo(pTop.x, pTop.y);
    ctx.stroke();
    // crosshatch
    ctx.strokeStyle = 'rgba(192,160,112,0.55)';
    ctx.lineWidth = 0.5;
    const segs = 6;
    for (let i = 0; i < segs; i++) {
      const za = topZ + (mastHeight * i) / segs;
      const zb = topZ + (mastHeight * (i + 0.5)) / segs;
      const lA = project(cx - 0.06, cy, za);
      const lB = project(cx + 0.06, cy, zb);
      ctx.beginPath();
      ctx.moveTo(lA.x, lA.y);
      ctx.lineTo(lB.x, lB.y);
      ctx.stroke();
      const lC = project(cx + 0.06, cy, za);
      const lD = project(cx - 0.06, cy, zb);
      ctx.beginPath();
      ctx.moveTo(lC.x, lC.y);
      ctx.lineTo(lD.x, lD.y);
      ctx.stroke();
    }

    // Jib animation: each crane picks one of four behaviors from variance.
    //   0: spin       — continuous slow rotation (original)
    //   1: sweep      — oscillates back and forth across ~120deg
    //   2: idle       — mostly still with occasional twitches
    //   3: lift cycle — slow rotation paired with strong hook drop/raise
    const behavior = Math.floor(variance * 4) % 4;
    const t = performance.now() / 1000;
    const baseAngle = variance * Math.PI * 2;
    let jibAngle;
    let hookDropFraction;
    if (behavior === 0) {
      // spin
      jibAngle = baseAngle + (t / 6) * Math.PI * 2;
      hookDropFraction = 0.5 + 0.4 * Math.sin(t / 1.7 + variance * 10);
    } else if (behavior === 1) {
      // sweep: ±60deg around baseAngle, ~4s period
      const sweepPhase = Math.sin(t * 0.5 + variance * 7);
      jibAngle = baseAngle + sweepPhase * (Math.PI / 3);
      // hook drops more at the ends of the sweep (when loading)
      hookDropFraction = 0.3 + 0.55 * (1 - Math.abs(sweepPhase));
    } else if (behavior === 2) {
      // idle with twitches: jib mostly fixed, occasional small jolt
      const twitchSeed = Math.floor(t * 0.4 + variance * 11);
      const twitchRnd = mulberry32(twitchSeed)();
      const twitching = twitchRnd > 0.85;
      const twitchAmp = twitching ? (twitchRnd - 0.85) * 6 : 0;
      jibAngle = baseAngle + twitchAmp * 0.15;
      // hook stays high while idle, drops occasionally
      hookDropFraction = 0.15 + (twitching ? 0.35 : 0) + 0.08 * Math.sin(t * 0.6 + variance * 3);
    } else {
      // lift cycle: hook does a strong up/down with the rotation
      jibAngle = baseAngle + (t / 8) * Math.PI * 2;
      // smooth lift envelope: drop -> hold -> rise -> hold
      const cyclePhase = ((t / 4 + variance * 3) % 1);
      // map [0..1] to drop fraction with a flat hold at top and bottom
      const ease = (u) => u < 0.25 ? (u / 0.25)
                       : u < 0.5  ? 1
                       : u < 0.75 ? (1 - (u - 0.5) / 0.25)
                       :            0;
      hookDropFraction = 0.15 + 0.75 * ease(cyclePhase);
    }
    const jibDX = Math.cos(jibAngle);
    const jibDY = Math.sin(jibAngle);
    const jibTopZ = topZ + mastHeight;

    const pJibEnd = project(cx + jibDX * jibLength, cy + jibDY * jibLength, jibTopZ);
    const pCounterEnd = project(cx - jibDX * counterJibLength, cy - jibDY * counterJibLength, jibTopZ);
    const pPivotTop = project(cx, cy, jibTopZ + 0.4);

    // jib (horizontal beam)
    ctx.strokeStyle = '#c0a070';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(pCounterEnd.x, pCounterEnd.y);
    ctx.lineTo(pJibEnd.x, pJibEnd.y);
    ctx.stroke();
    // triangle support cables from pivotTop down to each end of jib
    ctx.strokeStyle = 'rgba(60,40,30,0.7)';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(pPivotTop.x, pPivotTop.y);
    ctx.lineTo(pJibEnd.x, pJibEnd.y);
    ctx.moveTo(pPivotTop.x, pPivotTop.y);
    ctx.lineTo(pCounterEnd.x, pCounterEnd.y);
    ctx.stroke();
    // pivot triangle vertical
    ctx.strokeStyle = '#c0a070';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(pPivotTop.x, pPivotTop.y);
    ctx.lineTo(project(cx, cy, jibTopZ).x, project(cx, cy, jibTopZ).y);
    ctx.stroke();

    // operator cab — small box right at the pivot
    const cabSize = 0.18;
    const cabZ0 = jibTopZ;
    const cabZ1 = jibTopZ + 0.6;
    const cab1 = project(cx - cabSize, cy - cabSize, cabZ0);
    const cab2 = project(cx + cabSize, cy - cabSize, cabZ0);
    const cab3 = project(cx + cabSize, cy + cabSize, cabZ0);
    const cab4 = project(cx - cabSize, cy + cabSize, cabZ0);
    const cab5 = project(cx - cabSize, cy - cabSize, cabZ1);
    const cab6 = project(cx + cabSize, cy - cabSize, cabZ1);
    const cab7 = project(cx + cabSize, cy + cabSize, cabZ1);
    const cab8 = project(cx - cabSize, cy + cabSize, cabZ1);
    ctx.fillStyle = '#d8c098';
    ctx.beginPath();
    ctx.moveTo(cab2.x, cab2.y);
    ctx.lineTo(cab3.x, cab3.y);
    ctx.lineTo(cab7.x, cab7.y);
    ctx.lineTo(cab6.x, cab6.y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#806640';
    ctx.lineWidth = 0.6;
    ctx.stroke();
    ctx.fillStyle = '#e8d4b0';
    ctx.beginPath();
    ctx.moveTo(cab5.x, cab5.y);
    ctx.lineTo(cab6.x, cab6.y);
    ctx.lineTo(cab7.x, cab7.y);
    ctx.lineTo(cab8.x, cab8.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Hook cable from jib end down
    const hookZ = topZ + mastHeight * 0.5 * hookDropFraction;
    const pHook = project(cx + jibDX * jibLength, cy + jibDY * jibLength, hookZ);
    ctx.strokeStyle = 'rgba(60,40,30,0.85)';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(pJibEnd.x, pJibEnd.y);
    ctx.lineTo(pHook.x, pHook.y);
    ctx.stroke();
    // hook block
    ctx.fillStyle = '#806640';
    ctx.beginPath();
    ctx.arc(pHook.x, pHook.y, 1.6, 0, Math.PI * 2);
    ctx.fill();

    // Warning lights: at the tip of the jib and the top of the mast
    const blink = ((performance.now() / 600 + variance * 5) % 1) > 0.5;
    if (isNight) {
      // jib tip
      const tipColor = blink ? '#ff5544' : '#882211';
      ctx.fillStyle = tipColor;
      ctx.beginPath();
      ctx.arc(pJibEnd.x, pJibEnd.y, 2.2, 0, Math.PI * 2);
      ctx.fill();
      if (blink) {
        const g = ctx.createRadialGradient(pJibEnd.x, pJibEnd.y, 0, pJibEnd.x, pJibEnd.y, 8);
        g.addColorStop(0, 'rgba(255,90,70,0.6)');
        g.addColorStop(1, 'rgba(255,90,70,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(pJibEnd.x, pJibEnd.y, 8, 0, Math.PI * 2);
        ctx.fill();
      }
      // mast top
      ctx.fillStyle = blink ? '#ffe080' : '#a07020';
      ctx.beginPath();
      ctx.arc(pTop.x, pTop.y, 1.8, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // tiny accent in daylight
      ctx.fillStyle = '#c84030';
      ctx.beginPath();
      ctx.arc(pJibEnd.x, pJibEnd.y, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Draw one settled building into the target ctx (used by cache builder)
  function drawBuilding(ctx, s, idx, project, visibleFaces, animating = false) {
    // Special dispatch: if this cell owns a special, render it instead.
    const special = s.specials.get(idx);
    if (special) {
      drawSpecial(ctx, s, idx, project, special, animating);
      return;
    }

    const x = idx % GRID, y = Math.floor(idx / GRID);
    const bh = s.currentH[idx];
    const baseZ = Math.max(0, s.terrain[idx]);
    const topZ = baseZ + bh;

    // shape-aware tile footprint (N corners in cell-local [0,1] space)
    const corners = tileCorners(shape, x, y);
    const N = corners.length;

    // World-space base & top polygons
    const basePts = corners.map(c => project(x + c.dx, y + c.dy, baseZ));
    const topPts = corners.map(c => project(x + c.dx, y + c.dy, topZ));

    // Shadow direction from current sun position. Skipped at night.
    const light = lighting(sunAngleRef.current);
    const z = bh + baseZ;
    if (effectsRef.current && light.daylight > 0.05) {
      const dx = light.shadowDX * z * 0.18, dy = light.shadowDY * z * 0.18;
      const shadowPts = corners.map(c => project(x + c.dx + dx, y + c.dy + dy, baseZ));
      ctx.beginPath();
      ctx.moveTo(shadowPts[0].x, shadowPts[0].y);
      for (let i = 1; i < N; i++) ctx.lineTo(shadowPts[i].x, shadowPts[i].y);
      ctx.closePath();
      const shA = (0.10 + Math.min(0.22, z * 0.015)) * light.daylight;
      // Cheap shadow: solid polygon fill, no blur filter (mobile slow path).
      ctx.fillStyle = `rgba(60,45,80,${shA})`;
      ctx.fill();
    }

    const a = animating ? 0.55 : 1.0;
    const strata = s.strata[idx];
    const targetH = s.targetH[idx] || bh;
    const scale = targetH > 0 ? bh / targetH : 1;

    // Cumulative stratum bands
    const bands = [];
    let cursor = 0;
    if (strata && strata.length) {
      for (let k = 0; k < strata.length; k++) {
        const st = strata[k];
        bands.push({
          from: baseZ + cursor * scale,
          to: baseZ + (cursor + st.h) * scale,
          palIdx: st.palIdx,
          growing: st.growing,
        });
        cursor += st.h;
      }
    } else {
      bands.push({
        from: baseZ,
        to: baseZ + bh,
        palIdx: s.paletteIdx[idx] || 0,
        growing: animating,
      });
    }

    // Determine which edges (side faces) are visible.
    // For each edge i (from corner i to corner (i+1)%N):
    // - Compute edge midpoint in cell-local space
    // - Outward direction = (midpoint - cell centroid)
    // - Apply yaw rotation
    // - Visible if resulting (nx + ny) > 0 in iso projection space
    // (We trust the cached yaw via visibleFaces.has... but since we now
    // have N sides, we compute visibility inline using the yaw vector.)

    const cosY = Math.cos(yaw);
    const sinY = Math.sin(yaw);
    const cellCx = 0.5, cellCy = 0.5;

    const visEdges = []; // { idx, fromBase, toBase, fromTop, toTop, depth }
    for (let i = 0; i < N; i++) {
      const j = (i + 1) % N;
      const mx = (corners[i].dx + corners[j].dx) / 2;
      const my = (corners[i].dy + corners[j].dy) / 2;
      // outward vector in cell-local space (origin at centroid)
      const ox = mx - cellCx;
      const oy = my - cellCy;
      // rotate by yaw
      const rx = ox * cosY - oy * sinY;
      const ry = ox * sinY + oy * cosY;
      // iso "toward viewer" = positive (rx + ry)
      if ((rx + ry) > 0) {
        // compute depth for painter sort: avg screen-y of this side
        const a1 = basePts[i], a2 = basePts[j];
        const t1 = topPts[i],  t2 = topPts[j];
        const depth = (a1.y + a2.y + t1.y + t2.y) / 4;
        visEdges.push({ i, j, depth });
      }
    }
    visEdges.sort((a, b) => a.depth - b.depth);

    // Draw each visible side, stratum by stratum
    for (const e of visEdges) {
      const i = e.i, j = e.j;
      const topPalRaw = paletteFor(bands[bands.length - 1].palIdx);
      const topPal = topPalRaw.map(c => tintHex(c, light));

      for (const band of bands) {
        const paletteRaw = paletteFor(band.palIdx);
        const tone = tintHex(paletteRaw[2], light);

        const p1 = project(x + corners[i].dx, y + corners[i].dy, band.from);
        const p2 = project(x + corners[j].dx, y + corners[j].dy, band.from);
        const p3 = project(x + corners[j].dx, y + corners[j].dy, band.to);
        const p4 = project(x + corners[i].dx, y + corners[i].dy, band.to);

        const alphaBoost = (band.growing && animating) ? 0.85 : a;
        watercolorPolygon(ctx, [p1, p2, p3, p4], withAlpha(tone, alphaBoost), 0.14);
      }

      // Windows: at night, draw glowing yellow windows in random positions.
      // During day, draw the normal painted windows.
      if (!animating && bh > 4 && N <= 6) {
        const b1 = project(x + corners[i].dx, y + corners[i].dy, baseZ);
        const b2 = project(x + corners[j].dx, y + corners[j].dy, baseZ);
        const t1 = project(x + corners[i].dx, y + corners[i].dy, baseZ + bh);
        const t2 = project(x + corners[j].dx, y + corners[j].dy, baseZ + bh);
        if (light.daylight > 0.45) {
          drawWindows(ctx, b1, b2, t1, t2, bh, topPal);
        } else {
          drawLitWindows(ctx, b1, b2, t1, t2, bh, s.variance[idx], light.windowGlow);
        }
      }
    }

    // Top face polygon
    const topPaletteIdx = bands[bands.length - 1].palIdx;
    const topPal2Raw = paletteFor(topPaletteIdx);
    const topPal2 = topPal2Raw.map(c => tintHex(c, light));
    watercolorPolygon(ctx, topPts, withAlpha(topPal2[0], a), 0.14, 'top');

    // Rooftop accent (center of polygon)
    const v = s.variance[idx];
    if (!animating && v > 0.5) {
      ctx.fillStyle = topPal2[3];
      let cxAcc = 0, cyAcc = 0;
      for (const p of topPts) { cxAcc += p.x; cyAcc += p.y; }
      cxAcc /= N; cyAcc /= N;
      ctx.fillRect(cxAcc - 2, cyAcc - 2, 4, 4);
    }

    // Construction outline
    if (animating) {
      ctx.strokeStyle = topPal2[3];
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(topPts[0].x, topPts[0].y);
      for (let i = 1; i < N; i++) ctx.lineTo(topPts[i].x, topPts[i].y);
      ctx.closePath();
      ctx.stroke();
    }
  }

  function drawWindows(ctx, b1, b2, t1, t2, bh, palette) {
    const rows = Math.max(1, Math.floor(bh / 2));
    const cols = 2;
    ctx.fillStyle = withAlpha(palette[3], 0.45);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const u1 = (c + 0.25) / cols;
        const u2 = (c + 0.75) / cols;
        const vTop = 1 - (r + 0.7) / rows;
        const vBot = 1 - (r + 0.3) / rows;
        const pt = (u, vv) => {
          const a = lerpPt(b1, b2, u);
          const b = lerpPt(t1, t2, u);
          return lerpPt(a, b, vv);
        };
        const p1 = pt(u1, vBot), p2 = pt(u2, vBot), p3 = pt(u2, vTop), p4 = pt(u1, vTop);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.lineTo(p4.x, p4.y);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  // Night windows: a subset glow yellow-warm. The variance value (0..1)
  // seeds which windows are lit so the same building stays consistent.
  function drawLitWindows(ctx, b1, b2, t1, t2, bh, variance, glowStrength) {
    const rows = Math.max(1, Math.floor(bh / 2));
    const cols = 2;
    // Hash variance into a per-window-bitmask. Same building -> same lights.
    // ~60% of windows are lit at peak night.
    const litThreshold = 0.4 + (1 - glowStrength) * 0.5;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        // pseudo-random per (row,col) from variance
        const hash = ((variance * 9301 + r * 49297 + c * 233280) % 1);
        const isLit = hash > litThreshold;
        const u1 = (c + 0.25) / cols;
        const u2 = (c + 0.75) / cols;
        const vTop = 1 - (r + 0.7) / rows;
        const vBot = 1 - (r + 0.3) / rows;
        const pt = (u, vv) => {
          const a = lerpPt(b1, b2, u);
          const b = lerpPt(t1, t2, u);
          return lerpPt(a, b, vv);
        };
        const p1 = pt(u1, vBot), p2 = pt(u2, vBot), p3 = pt(u2, vTop), p4 = pt(u1, vTop);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.lineTo(p4.x, p4.y);
        ctx.closePath();
        if (isLit) {
          // warm window glow, intensity scales with night strength
          ctx.fillStyle = `rgba(255,215,130,${0.55 + glowStrength * 0.4})`;
        } else {
          // dark window
          ctx.fillStyle = 'rgba(30,25,40,0.55)';
        }
        ctx.fill();
      }
    }
  }

  // ============================================================
  // Ground / road cache
  // ============================================================
  // Each cache keeps ONE canvas for its whole life. Allocating a fresh
  // full screen canvas on every repaint piles up memory faster than
  // mobile browsers free it, which crashes them.
  function reuseCacheCanvas(ref, w, h, dpr) {
    const W = Math.max(1, Math.round(w * dpr));
    const H = Math.max(1, Math.round(h * dpr));
    let off = ref.current && ref.current.canvas;
    if (!off) off = document.createElement('canvas');
    if (off.width !== W || off.height !== H) {
      off.width = W;
      off.height = H;
    }
    const ctx = off.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, W, H);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { off, ctx };
  }

  function rebuildGroundCache(w, h, dpr) {
    const s = stateRef.current;
    if (!s) return;
    const { off, ctx } = reuseCacheCanvas(groundCacheRef, w, h, dpr);

    const light = lighting(sunAngleRef.current);

    // Sky gradient (paper is the base layer; sky overlays tint it)
    if (!paperPatternRef.current) paperPatternRef.current = buildPaperPattern(ctx);
    ctx.fillStyle = paperPatternRef.current || '#fdf7ec';
    ctx.fillRect(0, 0, w, h);

    // Sky tint overlay -- stronger at night
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
    skyGrad.addColorStop(0, light.skyTop);
    skyGrad.addColorStop(1, light.skyBottom);
    ctx.globalAlpha = light.daylight > 0.7 ? 0.0 : (1 - light.daylight) * 0.78;
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1;

    // big soft wash (subtle vignette)
    const wash = ctx.createRadialGradient(w / 2, h / 2, 60, w / 2, h / 2, Math.max(w, h) * 0.7);
    if (light.daylight > 0.4) {
      wash.addColorStop(0, 'rgba(255,240,210,0.45)');
      wash.addColorStop(1, 'rgba(255,240,210,0)');
    } else {
      // night vignette: warm city glow center, dark edges
      wash.addColorStop(0, `rgba(255,210,140,${0.18 * (1 - light.daylight)})`);
      wash.addColorStop(1, 'rgba(0,0,0,0)');
    }
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, w, h);

    const { project } = makeProjector(w, h);

    // No per-cell ground polygons. The paper texture + sky gradient above
    // serve as the background. Roads draw their own dark cells in the
    // roads cache, and buildings draw on top of everything.

    groundCacheRef.current = { canvas: off, w, h, dpr };
  }

  // ============================================================
  // Roads cache (revealed road cells only)
  // ============================================================
  // Returns the average terrain elevation at the corner of cells (x,y),
  // (x-1,y), (x,y-1), (x-1,y-1). This is what gives a *seam* between
  // adjacent road tiles a single shared height, so slopes look continuous
  // instead of plateau-stepped.
  function cornerElev(s, cx, cy) {
    // cx, cy are GRID corner coordinates in [0..GRID].
    // The four cells that touch this corner:
    const cells = [
      [cx - 1, cy - 1],
      [cx,     cy - 1],
      [cx - 1, cy],
      [cx,     cy],
    ];
    let sum = 0, count = 0;
    for (const [ex, ey] of cells) {
      if (ex < 0 || ey < 0 || ex >= GRID || ey >= GRID) continue;
      sum += Math.max(0, s.terrain[ey * GRID + ex]);
      count++;
    }
    return count > 0 ? sum / count : 0;
  }

  // Returns the bilinearly-interpolated elevation at an arbitrary point
  // (fractional x,y) inside the grid. Used so road markings sit on the
  // actual sloped surface, not pinned to a single cell's flat elevation.
  function pointElev(s, fx, fy) {
    const cx0 = Math.floor(fx);
    const cy0 = Math.floor(fy);
    const fxFrac = fx - cx0;
    const fyFrac = fy - cy0;
    const e00 = cornerElev(s, cx0,     cy0);
    const e10 = cornerElev(s, cx0 + 1, cy0);
    const e01 = cornerElev(s, cx0,     cy0 + 1);
    const e11 = cornerElev(s, cx0 + 1, cy0 + 1);
    const a = e00 * (1 - fxFrac) + e10 * fxFrac;
    const b = e01 * (1 - fxFrac) + e11 * fxFrac;
    return a * (1 - fyFrac) + b * fyFrac;
  }

  function drawRoadCellInto(ctx, s, x, y, project) {
    // Bridge deck cells render as a raised wooden deck over the water.
    if (s.bridges && s.bridges.has(y * GRID + x)) {
      drawBridgeDeck(ctx, s, project, x, y, lighting(sunAngleRef.current));
      return;
    }
    // Roads always use a square footprint regardless of the city shape.
    // Each corner uses the average elevation of its four touching cells,
    // so adjacent road tiles share their boundary heights and the road
    // becomes a continuous sloped surface instead of a series of plateaus.
    const e00 = cornerElev(s, x,     y);
    const e10 = cornerElev(s, x + 1, y);
    const e11 = cornerElev(s, x + 1, y + 1);
    const e01 = cornerElev(s, x,     y + 1);
    const p00 = project(x,     y,     e00);
    const p10 = project(x + 1, y,     e10);
    const p11 = project(x + 1, y + 1, e11);
    const p01 = project(x,     y + 1, e01);

    ctx.beginPath();
    ctx.moveTo(p00.x, p00.y);
    ctx.lineTo(p10.x, p10.y);
    ctx.lineTo(p11.x, p11.y);
    ctx.lineTo(p01.x, p01.y);
    ctx.closePath();
    ctx.fillStyle = '#1a1820';
    ctx.fill();

    // road markings: intersection node or directional dots
    const onCol = x % ROAD_SPACING === 0;
    const onRow = y % ROAD_SPACING === 0;
    const isIntersection = onCol && onRow;
    ctx.fillStyle = 'rgba(245,235,210,0.85)';
    if (isIntersection) {
      const p = project(x + 0.5, y + 0.5, pointElev(s, x + 0.5, y + 0.5));
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.4 * zoom, 0, Math.PI * 2);
      ctx.fill();
    } else if (onCol) {
      const p1 = project(x + 0.5, y + 0.3, pointElev(s, x + 0.5, y + 0.3));
      const p2 = project(x + 0.5, y + 0.7, pointElev(s, x + 0.5, y + 0.7));
      ctx.beginPath();
      ctx.arc(p1.x, p1.y, 0.9 * zoom, 0, Math.PI * 2);
      ctx.arc(p2.x, p2.y, 0.9 * zoom, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const p1 = project(x + 0.3, y + 0.5, pointElev(s, x + 0.3, y + 0.5));
      const p2 = project(x + 0.7, y + 0.5, pointElev(s, x + 0.7, y + 0.5));
      ctx.beginPath();
      ctx.arc(p1.x, p1.y, 0.9 * zoom, 0, Math.PI * 2);
      ctx.arc(p2.x, p2.y, 0.9 * zoom, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function rebuildRoadsCache(w, h, dpr) {
    const s = stateRef.current;
    if (!s) return;
    const { off, ctx } = reuseCacheCanvas(roadsCacheRef, w, h, dpr);
    const { project } = makeProjector(w, h);

    // painter-order revealed roads
    const items = [];
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        const idx = y * GRID + x;
        if (s.cells[idx] !== 3) continue;
        const p = project(x + 0.5, y + 0.5, 0);
        items.push({ x, y, sy: p.y });
      }
    }
    items.sort((a, b) => a.sy - b.sy);
    for (const it of items) drawRoadCellInto(ctx, s, it.x, it.y, project);

    // Compute lamp positions: every revealed intersection.
    // Draw the static post + bulb here so it goes into the cache.
    const lamps = [];
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        if (x % ROAD_SPACING !== 0 || y % ROAD_SPACING !== 0) continue;
        if (s.cells[y * GRID + x] !== 3) continue;
        lamps.push({ x, y });
      }
    }
    s.lamps = lamps.concat((s.lamps || []).filter(l => l.small));
    drawLampPostsInto(ctx, s, project);

    roadsCacheRef.current = { canvas: off, ctx, w, h, dpr };
    s.newlyRevealedRoads.length = 0;
  }

  function appendToRoadsCache(w, h, dpr) {
    const s = stateRef.current;
    const rc = roadsCacheRef.current;
    if (!s || !rc || !s.newlyRevealedRoads.length) return;
    const { project } = makeProjector(w, h);
    const items = s.newlyRevealedRoads.map(idx => {
      const x = idx % GRID, y = Math.floor(idx / GRID);
      const p = project(x + 0.5, y + 0.5, 0);
      return { x, y, sy: p.y };
    });
    items.sort((a, b) => a.sy - b.sy);
    for (const it of items) drawRoadCellInto(rc.ctx, s, it.x, it.y, project);
    // Check any newly revealed intersections; add lamps + draw posts
    const newLamps = [];
    for (const it of items) {
      if (it.x % ROAD_SPACING !== 0 || it.y % ROAD_SPACING !== 0) continue;
      newLamps.push({ x: it.x, y: it.y });
      s.lamps.push({ x: it.x, y: it.y });
    }
    if (newLamps.length) drawLampPostsInto(rc.ctx, s, project, newLamps);
    s.newlyRevealedRoads.length = 0;
  }

  // Paints the static lamp post + bulb into a target context.
  // If lampList is given, only those are drawn. Otherwise uses s.lamps.
  // Lamps with l.small are park lamps (smaller, fractional position).
  function drawLampPostsInto(ctx, s, project, lampList) {
    const list = lampList || s.lamps;
    if (!list || !list.length) return;
    for (const l of list) {
      // Street lamps store integer cell coords (offset to center).
      // Park lamps store exact float positions.
      const px = l.small ? l.x : l.x + 0.5;
      const py = l.small ? l.y : l.y + 0.5;
      // Interpolated elevation so the post sits on the sloped surface
      const tElev = pointElev(s, px, py);
      const poleH = l.small ? 0.55 : 1.0;
      const foot = project(px, py, tElev);
      const head = project(px, py, tElev + poleH);
      // pole
      ctx.strokeStyle = 'rgba(45,38,32,0.85)';
      ctx.lineWidth = Math.max(1, zoom * (l.small ? 0.4 : 0.55));
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(foot.x, foot.y);
      ctx.lineTo(head.x, head.y);
      ctx.stroke();
      // bulb housing
      ctx.fillStyle = 'rgba(210,200,180,0.95)';
      ctx.beginPath();
      ctx.arc(head.x, head.y, Math.max(1.2, zoom * (l.small ? 0.85 : 1.1)), 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(60,50,40,0.7)';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }
  }

  // ============================================================
  // Buildings cache (settled buildings only)
  // ============================================================

  // Only these special kinds animate per-frame (rotation, blink, hands).
  // Everything else is static once settled and belongs in the cache.
  const LIVE_ANIMATED_KINDS = new Set(['spire', 'crane', 'clock', 'airport']);
  function isLiveAnimatedSpecial(special) {
    return !!special && LIVE_ANIMATED_KINDS.has(special.kind);
  }

  // LAND CACHE: water, farms, dirt roads and grass. Expensive to paint,
  // so it lives on its own layer under roads and buildings and is only
  // repainted on a throttle when the land actually changed.
  function rebuildLandCache(w, h, dpr) {
    const s = stateRef.current;
    if (!s) return;
    const { off, ctx } = reuseCacheCanvas(landCacheRef, w, h, dpr);
    // Ground (paper and sky) is baked into the land layer so the frame
    // only blits one background image instead of two.
    const gcl = groundCacheRef.current;
    if (gcl) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(gcl.canvas, 0, 0);
      ctx.restore();
    }
    const { project } = makeProjector(w, h);
    const light = lighting(sunAngleRef.current);
    // FARMS: agricultural land covering undeveloped non-grass cells in shape.
    if (s.farmsDirty || s.farms.size === 0) {
      recomputeFarms(s);
      s.farmsDirty = false;
    }
    // WATER: lakes/rivers + sand beaches. Painted first (lowest layer).
    paintWaterInto(ctx, s, project, light);

    paintFarmsInto(ctx, s, project, light);

    // UNREVEALED ROADS: cells where a road CAN go but hasn't been
    // revealed yet. Paint them as either dirt roads (within 2 cells
    // of development) or as continuous farmland (everywhere else).
    paintUnrevealedRoadsInto(ctx, s, project, light);

    // GRASS: every empty interior cell that has at least one road or
    // building neighbor (within 1 cell, 8-direction). This turns
    // "vacant lots inside developed blocks" green until built up.
    paintGrassInto(ctx, s, project, light);

    // RAIL: the train line, on top of the land layer.
    paintRailInto(ctx, s, project, light);

    landCacheRef.current = { canvas: off, w, h, dpr };
    s.landDirty = false;
  }

  function rebuildBuildingsCache(w, h, dpr) {
    const s = stateRef.current;
    if (!s) return;
    const { off, ctx } = reuseCacheCanvas(buildingsCacheRef, w, h, dpr);

    const { project } = makeProjector(w, h);
    const visibleFaces = visibleFacesForYaw(yaw);
    const light = lighting(sunAngleRef.current);

    // gather settled buildings, painter-sorted.
    // Skip cells that are part of a multi-cell special (non-owner).
    // Skip ONLY live-animated specials (spire/crane/clock) — everything
    // else (parks, strip malls, domes, etc.) is static and goes in cache.
    const items = [];
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        const idx = y * GRID + x;
        if (s.cells[idx] !== 2) continue;
        if (s.specialOwner[idx] !== -1) continue;
        const sp = s.specials.get(idx);
        if (sp && isLiveAnimatedSpecial(sp)) continue; // live-rendered
        const p = project(x + 0.5, y + 0.5, 0);
        items.push({ idx, sy: p.y });
      }
    }
    items.sort((a, b) => a.sy - b.sy);
    for (const it of items) drawBuilding(ctx, s, it.idx, project, visibleFaces, false);

    buildingsCacheRef.current = { canvas: off, w, h, dpr, ctx };
    s.newlySettled.length = 0;
  }

  // ----- FARMS -----
  function pickCrop(s, x, y, idx) {
    const elev = s.terrain[idx];
    const dxC = x - s.cx, dyC = y - s.cy;
    const dist = Math.sqrt(dxC * dxC + dyC * dyC) / Math.max(1, s.r);
    const n = mulberry32(idx * 9173 + 1)();
    if (elev > 0.6) return 'trees';
    if (dist > 0.85 && n < 0.4) return 'vineyard';
    if (elev < 0.15 && n < 0.55) return 'grain';
    if (n < 0.40) return 'corn';
    if (n < 0.70) return 'grain';
    if (n < 0.88) return 'vineyard';
    return 'trees';
  }

  // Cell is a farm if: empty, inside agri-collar (shape + small outer ring),
  // not a road, NOT grass-adjacent (those become grass instead).
  function recomputeFarms(s) {
    s.farms.clear();
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        const idx = y * GRID + x;
        if (s.cells[idx] !== 0) continue;
        if (isRoad(x, y)) continue;
        if (s.water && s.water[idx] !== 0) continue; // no farms on water/sand
        const sc = shapeScore(shape, x, y, s.cx, s.cy, s.r);
        if (sc <= -0.18) continue;
        let nearDev = false;
        for (let ny = -1; ny <= 1 && !nearDev; ny++) {
          for (let nx = -1; nx <= 1 && !nearDev; nx++) {
            if (nx === 0 && ny === 0) continue;
            const cx = x + nx, cy = y + ny;
            if (cx < 0 || cy < 0 || cx >= GRID || cy >= GRID) continue;
            const v = s.cells[cy * GRID + cx];
            if (v === 1 || v === 2 || v === 3) { nearDev = true; }
          }
        }
        if (nearDev) continue;
        s.farms.set(idx, { crop: pickCrop(s, x, y, idx), variance: mulberry32(idx * 7331 + 17)() });
      }
    }
  }

  // Wooden bridge deck over a single water cell. Span-direction-aware
  // plank lines, side rails, and warm lamp glow at night.
  function drawBridgeDeck(ctx, s, project, x, y, light) {
    const z = 0.2; // deck sits above sea level
    const p00 = project(x,     y,     z);
    const p10 = project(x + 1, y,     z);
    const p11 = project(x + 1, y + 1, z);
    const p01 = project(x,     y + 1, z);
    // deck surface
    ctx.fillStyle = tintHex('#7a5a3a', light);
    ctx.beginPath();
    ctx.moveTo(p00.x, p00.y);
    ctx.lineTo(p10.x, p10.y);
    ctx.lineTo(p11.x, p11.y);
    ctx.lineTo(p01.x, p01.y);
    ctx.closePath();
    ctx.fill();
    // Determine span direction by looking at which neighbors are bridge/land
    const horiz = (s.bridges.has(y * GRID + (x - 1)) || s.bridges.has(y * GRID + (x + 1)) ||
                   (x > 0 && s.water[y * GRID + (x - 1)] !== 1) ||
                   (x < GRID - 1 && s.water[y * GRID + (x + 1)] !== 1));
    // plank lines perpendicular to travel
    ctx.strokeStyle = tintHex('#5e442a', light);
    ctx.lineWidth = 0.4;
    for (let i = 1; i < 5; i++) {
      const u = i / 5;
      if (horiz) {
        const a = project(x + u, y, z), b = project(x + u, y + 1, z);
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      } else {
        const a = project(x, y + u, z), b = project(x + 1, y + u, z);
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
    }
    // side rails
    ctx.strokeStyle = tintHex('#8a6a44', light);
    ctx.lineWidth = 0.7;
    if (horiz) {
      const r1 = project(x, y, z + 0.08), r2 = project(x + 1, y, z + 0.08);
      const r3 = project(x, y + 1, z + 0.08), r4 = project(x + 1, y + 1, z + 0.08);
      ctx.beginPath(); ctx.moveTo(r1.x, r1.y); ctx.lineTo(r2.x, r2.y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(r3.x, r3.y); ctx.lineTo(r4.x, r4.y); ctx.stroke();
    } else {
      const r1 = project(x, y, z + 0.08), r2 = project(x, y + 1, z + 0.08);
      const r3 = project(x + 1, y, z + 0.08), r4 = project(x + 1, y + 1, z + 0.08);
      ctx.beginPath(); ctx.moveTo(r1.x, r1.y); ctx.lineTo(r2.x, r2.y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(r3.x, r3.y); ctx.lineTo(r4.x, r4.y); ctx.stroke();
    }
    // warm lamp glow at night
    if (light.daylight < 0.4) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const c = project(x + 0.5, y + 0.5, z + 0.15);
      const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, 6);
      g.addColorStop(0, `rgba(255,220,150,${0.5 * (1 - light.daylight)})`);
      g.addColorStop(1, 'rgba(255,220,150,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(c.x, c.y, 6, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }

  // Paints water (lakes/rivers) and sand beaches into the buildings cache.
  // Water is a flat blue tile at a fixed low elevation; sand is tan.
  function paintWaterInto(ctx, s, project, light) {
    if (!s.water) return;
    const waterTop = tintHex('#3d6e8c', light);
    const waterDeep = tintHex('#2c5570', light);
    const sandHex = tintHex('#dcc89a', light);
    const sandSpeck = tintHex('#c8b07e', light);

    // Water sits at a fixed level (sea level = 0). Sand follows terrain.
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        const idx = y * GRID + x;
        const w = s.water[idx];
        if (w === 0) continue;

        // Bridge deck cells: always render the deck (planned infrastructure),
        // regardless of whether the city has reached them yet.
        if (s.bridges && s.bridges.has(idx) && s.cells[idx] !== 3) {
          drawBridgeDeck(ctx, s, project, x, y, light);
          continue;
        }

        if (w === 1) {
          // Water tile — flat at sea level (z=0), slight gradient by row
          const p00 = project(x,     y,     0.0);
          const p10 = project(x + 1, y,     0.0);
          const p11 = project(x + 1, y + 1, 0.0);
          const p01 = project(x,     y + 1, 0.0);
          // depth tint: deeper toward the middle of a water body (cells
          // with all-water neighbors look deeper)
          let waterNeighbors = 0;
          const nb = [[1,0],[-1,0],[0,1],[0,-1]];
          for (const [dx, dy] of nb) {
            const cx = x + dx, cy = y + dy;
            if (cx < 0 || cy < 0 || cx >= GRID || cy >= GRID) continue;
            if (s.water[cy * GRID + cx] === 1) waterNeighbors++;
          }
          ctx.fillStyle = waterNeighbors >= 4 ? waterDeep : waterTop;
          ctx.beginPath();
          ctx.moveTo(p00.x, p00.y);
          ctx.lineTo(p10.x, p10.y);
          ctx.lineTo(p11.x, p11.y);
          ctx.lineTo(p01.x, p01.y);
          ctx.closePath();
          ctx.fill();
          // subtle ripple lines
          ctx.strokeStyle = tintHex('#5a90ad', light);
          ctx.lineWidth = 0.4;
          const rnd = mulberry32(idx * 1733 + 5);
          for (let i = 0; i < 2; i++) {
            const ry = y + 0.3 + rnd() * 0.4;
            const a = project(x + 0.15, ry, 0.0);
            const b = project(x + 0.85, ry, 0.0);
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        } else if (w === 2) {
          // Sand beach — follows terrain elevation
          const e00 = cornerElev(s, x,     y);
          const e10 = cornerElev(s, x + 1, y);
          const e11 = cornerElev(s, x + 1, y + 1);
          const e01 = cornerElev(s, x,     y + 1);
          const p00 = project(x,     y,     e00 + 0.004);
          const p10 = project(x + 1, y,     e10 + 0.004);
          const p11 = project(x + 1, y + 1, e11 + 0.004);
          const p01 = project(x,     y + 1, e01 + 0.004);
          ctx.fillStyle = sandHex;
          ctx.beginPath();
          ctx.moveTo(p00.x, p00.y);
          ctx.lineTo(p10.x, p10.y);
          ctx.lineTo(p11.x, p11.y);
          ctx.lineTo(p01.x, p01.y);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = sandSpeck;
          const rnd = mulberry32(idx * 2917 + 3);
          for (let i = 0; i < 4; i++) {
            const fx = x + rnd() * 0.9 + 0.05;
            const fy = y + rnd() * 0.9 + 0.05;
            const p = project(fx, fy, pointElev(s, fx, fy) + 0.008);
            ctx.beginPath();
            ctx.arc(p.x, p.y, Math.max(0.5, zoom * 0.4), 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }

    // DOCKS: wooden piers projecting from a land cell into the water.
    if (s.docks) {
      for (const d of s.docks) drawDock(ctx, s, project, d, light);
    }
  }


  // A small wooden dock projecting from land cell d into adjacent water.
  function drawDock(ctx, s, project, d, light) {
    const dz = 0.16;
    const len = 1.4;
    const cx = d.x + 0.5, cy = d.y + 0.5;
    const ex = cx + d.dir.dx * len, ey = cy + d.dir.dy * len;
    const px = -d.dir.dy * 0.18, py = d.dir.dx * 0.18;
    const a = project(cx + px, cy + py, dz);
    const b = project(cx - px, cy - py, dz);
    const c = project(ex - px, ey - py, dz);
    const e = project(ex + px, ey + py, dz);
    ctx.fillStyle = tintHex('#7a5a3a', light);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineTo(c.x, c.y);
    ctx.lineTo(e.x, e.y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = tintHex('#5e442a', light);
    ctx.lineWidth = 0.4;
    for (let i = 1; i < 5; i++) {
      const u = i / 5;
      const m1 = project(cx + px + (ex - cx) * u, cy + py + (ey - cy) * u, dz);
      const m2 = project(cx - px + (ex - cx) * u, cy - py + (ey - cy) * u, dz);
      ctx.beginPath(); ctx.moveTo(m1.x, m1.y); ctx.lineTo(m2.x, m2.y); ctx.stroke();
    }
    ctx.fillStyle = tintHex('#4a3420', light);
    for (const corner of [[ex - px, ey - py], [ex + px, ey + py]]) {
      const top = project(corner[0], corner[1], dz);
      ctx.beginPath();
      ctx.arc(top.x, top.y, Math.max(0.8, zoom * 0.5), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function paintFarmsInto(ctx, s, project, light) {
    if (!s.farms || s.farms.size === 0) return;
    for (const [idx, farm] of s.farms) {
      const x = idx % GRID, y = Math.floor(idx / GRID);
      const e00 = cornerElev(s, x,     y);
      const e10 = cornerElev(s, x + 1, y);
      const e11 = cornerElev(s, x + 1, y + 1);
      const e01 = cornerElev(s, x,     y + 1);
      const p00 = project(x,     y,     e00 + 0.003);
      const p10 = project(x + 1, y,     e10 + 0.003);
      const p11 = project(x + 1, y + 1, e11 + 0.003);
      const p01 = project(x,     y + 1, e01 + 0.003);
      let groundHex;
      switch (farm.crop) {
        case 'trees':    groundHex = '#4a6b3e'; break;
        case 'corn':     groundHex = '#9aa84a'; break;
        case 'grain':    groundHex = '#d4b760'; break;
        case 'vineyard': groundHex = '#6f7e4d'; break;
        default:         groundHex = '#7fb069';
      }
      ctx.fillStyle = tintHex(groundHex, light);
      ctx.beginPath();
      ctx.moveTo(p00.x, p00.y);
      ctx.lineTo(p10.x, p10.y);
      ctx.lineTo(p11.x, p11.y);
      ctx.lineTo(p01.x, p01.y);
      ctx.closePath();
      ctx.fill();
      drawCropTexture(ctx, s, project, x, y, idx, farm, light);
    }
  }

  function drawCropTexture(ctx, s, project, x, y, idx, farm, light) {
    const rnd = mulberry32(idx * 2287 + 11);
    if (farm.crop === 'grain') {
      ctx.strokeStyle = tintHex('#b89a3e', light);
      ctx.lineWidth = 0.5;
      for (let i = 1; i < 4; i++) {
        const u = i / 4;
        const a = project(x,     y + u, cornerElev(s, x,     y + u) + 0.005);
        const b = project(x + 1, y + u, cornerElev(s, x + 1, y + u) + 0.005);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      ctx.fillStyle = tintHex('#e8d07a', light);
      for (let i = 0; i < 5; i++) {
        const fx = x + rnd() * 0.95 + 0.025;
        const fy = y + rnd() * 0.95 + 0.025;
        const p = project(fx, fy, pointElev(s, fx, fy) + 0.01);
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.5, zoom * 0.45), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (farm.crop === 'corn') {
      ctx.strokeStyle = tintHex('#3e6420', light);
      ctx.lineWidth = Math.max(0.7, zoom * 0.5);
      for (let r = 0; r < 4; r++) {
        const v = (r + 0.5) / 4;
        for (let c = 0; c < 6; c++) {
          const u = (c + 0.5) / 6;
          const sx = x + u, sy = y + v;
          const sz = pointElev(s, sx, sy);
          const top = project(sx, sy, sz + 0.18);
          const bot = project(sx, sy, sz + 0.02);
          ctx.beginPath();
          ctx.moveTo(bot.x, bot.y);
          ctx.lineTo(top.x, top.y);
          ctx.stroke();
        }
      }
    } else if (farm.crop === 'vineyard') {
      ctx.strokeStyle = tintHex('#3d4f25', light);
      ctx.lineWidth = 0.6;
      ctx.setLineDash([2, 1.2]);
      for (let r = 0; r < 5; r++) {
        const v = (r + 0.5) / 5;
        const a = project(x,     y + v, cornerElev(s, x,     y + v) + 0.005);
        const b = project(x + 1, y + v, cornerElev(s, x + 1, y + v) + 0.005);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.fillStyle = tintHex('#5a3f6e', light);
      for (let i = 0; i < 6; i++) {
        const fx = x + rnd() * 0.9 + 0.05;
        const fy = y + rnd() * 0.9 + 0.05;
        const p = project(fx, fy, pointElev(s, fx, fy) + 0.02);
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.6, zoom * 0.45), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (farm.crop === 'trees') {
      const count = 5 + Math.floor(rnd() * 3);
      const trees = [];
      for (let i = 0; i < count; i++) {
        trees.push({ tx: x + 0.15 + rnd() * 0.7, ty: y + 0.15 + rnd() * 0.7 });
      }
      const projected = trees.map(t => ({
        ...t,
        sy: project(t.tx, t.ty, pointElev(s, t.tx, t.ty)).y,
      }));
      projected.sort((a, b) => a.sy - b.sy);
      for (const t of projected) {
        const baseZ = pointElev(s, t.tx, t.ty);
        const trunkBot = project(t.tx, t.ty, baseZ);
        const trunkTop = project(t.tx, t.ty, baseZ + 0.32);
        ctx.strokeStyle = tintHex('#5a3a20', light);
        ctx.lineWidth = Math.max(0.8, zoom * 0.4);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(trunkBot.x, trunkBot.y);
        ctx.lineTo(trunkTop.x, trunkTop.y);
        ctx.stroke();
        const cR = Math.max(1.6, zoom * 1.1);
        ctx.fillStyle = tintHex('#3e6428', light);
        ctx.beginPath();
        ctx.arc(trunkTop.x, trunkTop.y, cR, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Paint unrevealed road cells (reserved-but-not-built road tiles).
  // Within 2 cells of any revealed road or building → render as a dirt road
  // (rural lane extending outward). Further out → continuous farmland that
  // matches the surrounding crop pattern.
  function paintUnrevealedRoadsInto(ctx, s, project, light) {
    const dirtBase = tintHex('#8a6a48', light);
    const dirtSpeck = tintHex('#6f5236', light);
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        if (!isRoad(x, y)) continue;
        const idx = y * GRID + x;
        if (s.cells[idx] !== 0) continue; // already revealed (=3) or built
        // Skip water cells (they're drawn by paintWaterInto).
        if (s.water && s.water[idx] !== 0) continue;
        // Stay inside the agri-collar (farms + city shape outer ring)
        const sc = shapeScore(shape, x, y, s.cx, s.cy, s.r);
        if (sc <= -0.18) continue;

        // Measure cell-distance to nearest revealed-road or built cell
        // (Chebyshev distance within a 2-cell window — bail at the first hit).
        let nearDev = false;
        for (let dy = -2; dy <= 2 && !nearDev; dy++) {
          for (let dx = -2; dx <= 2 && !nearDev; dx++) {
            if (dx === 0 && dy === 0) continue;
            const cx = x + dx, cy = y + dy;
            if (cx < 0 || cy < 0 || cx >= GRID || cy >= GRID) continue;
            const v = s.cells[cy * GRID + cx];
            if (v === 1 || v === 2 || v === 3) nearDev = true;
          }
        }

        // Sloped corner elevations
        const e00 = cornerElev(s, x,     y);
        const e10 = cornerElev(s, x + 1, y);
        const e11 = cornerElev(s, x + 1, y + 1);
        const e01 = cornerElev(s, x,     y + 1);
        const p00 = project(x,     y,     e00 + 0.004);
        const p10 = project(x + 1, y,     e10 + 0.004);
        const p11 = project(x + 1, y + 1, e11 + 0.004);
        const p01 = project(x,     y + 1, e01 + 0.004);

        if (nearDev) {
          // DIRT ROAD: warm brown tile, faint specks for texture.
          ctx.fillStyle = dirtBase;
          ctx.beginPath();
          ctx.moveTo(p00.x, p00.y);
          ctx.lineTo(p10.x, p10.y);
          ctx.lineTo(p11.x, p11.y);
          ctx.lineTo(p01.x, p01.y);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = dirtSpeck;
          const rnd = mulberry32(idx * 4051 + 9);
          for (let i = 0; i < 5; i++) {
            const fx = x + rnd() * 0.9 + 0.05;
            const fy = y + rnd() * 0.9 + 0.05;
            const p = project(fx, fy, pointElev(s, fx, fy) + 0.008);
            ctx.beginPath();
            ctx.arc(p.x, p.y, Math.max(0.5, zoom * 0.4), 0, Math.PI * 2);
            ctx.fill();
          }
        } else {
          // PLANT MATERIAL: continue the farm aesthetic across the
          // reserved road. Pick a crop deterministically from this idx
          // so it tiles naturally with neighbors.
          const farm = { crop: pickCrop(s, x, y, idx), variance: mulberry32(idx * 7331 + 17)() };
          let groundHex;
          switch (farm.crop) {
            case 'trees':    groundHex = '#4a6b3e'; break;
            case 'corn':     groundHex = '#9aa84a'; break;
            case 'grain':    groundHex = '#d4b760'; break;
            case 'vineyard': groundHex = '#6f7e4d'; break;
            default:         groundHex = '#7fb069';
          }
          ctx.fillStyle = tintHex(groundHex, light);
          ctx.beginPath();
          ctx.moveTo(p00.x, p00.y);
          ctx.lineTo(p10.x, p10.y);
          ctx.lineTo(p11.x, p11.y);
          ctx.lineTo(p01.x, p01.y);
          ctx.closePath();
          ctx.fill();
          drawCropTexture(ctx, s, project, x, y, idx, farm, light);
        }
      }
    }
  }

  // Train line along s.railY: ballast and ties on land, a timber trestle
  // over water. Revealed road cells at crossings are painted later by the
  // road layer, which reads as a level crossing.
  function paintRailInto(ctx, s, project, light) {
    if (s.railY === undefined || s.railX1 < s.railX0) return;
    const y = s.railY;
    const grassCol = tintHex('#7d9c5c', light);
    const ballast = tintHex('#8a8278', light);
    const tieCol = tintHex('#5a4632', light);
    const railCol = tintHex('#3a4a66', light);
    for (let x = s.railX0; x <= s.railX1; x++) {
      const idx = y * GRID + x;
      const overWater = s.water && s.water[idx] === 1;
      const zAt = (fx, fy) => overWater ? 0.24 : pointElev(s, fx, fy) + 0.01;
      if (overWater) {
        // trestle piles
        if (x % 2 === 0) {
          for (const py of [y + 0.3, y + 0.7]) {
            const b = project(x + 0.5, py, 0), t = project(x + 0.5, py, 0.24);
            ctx.strokeStyle = tintHex('#4e3a28', light);
            ctx.lineWidth = Math.max(1, zoom * 0.6);
            ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(t.x, t.y); ctx.stroke();
          }
        }
        const d = [[x, y + 0.25], [x + 1, y + 0.25], [x + 1, y + 0.75], [x, y + 0.75]].map(([px, py]) => project(px, py, 0.24));
        ctx.beginPath(); ctx.moveTo(d[0].x, d[0].y);
        for (let i = 1; i < 4; i++) ctx.lineTo(d[i].x, d[i].y);
        ctx.closePath();
        ctx.fillStyle = tintHex('#6e5640', light);
        ctx.fill();
      } else if (!(isRoad(x, y) && s.cells[idx] === 3)) {
        const full = [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]].map(([px, py]) => project(px, py, cornerElev(s, px, py) + 0.006));
        ctx.beginPath(); ctx.moveTo(full[0].x, full[0].y);
        for (let i = 1; i < 4; i++) ctx.lineTo(full[i].x, full[i].y);
        ctx.closePath();
        ctx.fillStyle = grassCol;
        ctx.fill();
        const bed = [[x, y + 0.27], [x + 1, y + 0.27], [x + 1, y + 0.73], [x, y + 0.73]].map(([px, py]) => project(px, py, zAt(px, py)));
        ctx.beginPath(); ctx.moveTo(bed[0].x, bed[0].y);
        for (let i = 1; i < 4; i++) ctx.lineTo(bed[i].x, bed[i].y);
        ctx.closePath();
        ctx.fillStyle = ballast;
        ctx.fill();
      }
      // ties
      ctx.strokeStyle = tieCol;
      ctx.lineWidth = Math.max(0.8, zoom * 0.6);
      for (let k = 0; k < 4; k++) {
        const tx = x + 0.125 + k * 0.25;
        const a = project(tx, y + 0.32, zAt(tx, y + 0.32) + 0.01);
        const b = project(tx, y + 0.68, zAt(tx, y + 0.68) + 0.01);
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
      // rails
      ctx.strokeStyle = railCol;
      ctx.lineWidth = Math.max(0.7, zoom * 0.5);
      for (const ry of [y + 0.4, y + 0.6]) {
        const a = project(x, ry, zAt(x, ry) + 0.03), b = project(x + 1, ry, zAt(x + 1, ry) + 0.03);
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
    }
  }

  // Paints grass for every empty interior cell adjacent to developed
  // (road or built) cells. Used inside the buildings cache rebuild.
  function paintGrassInto(ctx, s, project, light) {
    const baseColor = tintHex('#7fb069', light);
    const speckleColor = tintHex('#6a9a55', light);
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        const idx = y * GRID + x;
        if (s.cells[idx] !== 0) continue;       // must be empty
        if (isRoad(x, y)) continue;             // not a road cell
        if (s.water && s.water[idx] !== 0) continue; // water/sand drawn elsewhere
        if (shapeScore(shape, x, y, s.cx, s.cy, s.r) <= 0) continue; // outside shape
        // Adjacency check: at least one of the 8 neighbors must be road
        // (revealed → cells===3) or built (cells===2 or animating cells===1)
        let near = false;
        for (let ny = -1; ny <= 1 && !near; ny++) {
          for (let nx = -1; nx <= 1 && !near; nx++) {
            if (nx === 0 && ny === 0) continue;
            const cx = x + nx, cy = y + ny;
            if (cx < 0 || cy < 0 || cx >= GRID || cy >= GRID) continue;
            const v = s.cells[cy * GRID + cx];
            if (v === 2 || v === 1 || v === 3) near = true;
          }
        }
        if (!near) continue;

        // Draw grass tile. Use the four sloped corners so grass follows terrain.
        const e00 = cornerElev(s, x,     y);
        const e10 = cornerElev(s, x + 1, y);
        const e11 = cornerElev(s, x + 1, y + 1);
        const e01 = cornerElev(s, x,     y + 1);
        const p00 = project(x,     y,     e00 + 0.005);
        const p10 = project(x + 1, y,     e10 + 0.005);
        const p11 = project(x + 1, y + 1, e11 + 0.005);
        const p01 = project(x,     y + 1, e01 + 0.005);
        ctx.beginPath();
        ctx.moveTo(p00.x, p00.y);
        ctx.lineTo(p10.x, p10.y);
        ctx.lineTo(p11.x, p11.y);
        ctx.lineTo(p01.x, p01.y);
        ctx.closePath();
        ctx.fillStyle = baseColor;
        ctx.fill();

        // a few speckles for texture (deterministic seed per cell)
        const rnd = mulberry32(idx * 7919 + 1013);
        ctx.fillStyle = speckleColor;
        for (let i = 0; i < 4; i++) {
          const fx = x + rnd() * 0.9 + 0.05;
          const fy = y + rnd() * 0.9 + 0.05;
          const fz = pointElev(s, fx, fy) + 0.01;
          const p = project(fx, fy, fz);
          ctx.beginPath();
          ctx.arc(p.x, p.y, Math.max(0.5, zoom * 0.4), 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  // Append newly-settled buildings to the existing buildings cache,
  // without redrawing everything. They're already in painter order
  // relative to each other; relative to what's already there, the cache
  // might be slightly out of order for overlapping cells. For our grid
  // where most overlap is small, this is acceptable; for a full rebuild
  // we'd rebuild the whole cache (rare).
  function appendToBuildingsCache(w, h, dpr) {
    const s = stateRef.current;
    const bc = buildingsCacheRef.current;
    if (!s || !bc) return;
    const hasSettled = s.newlySettled.length;
    const hasUpgrown = s.newlyUpgrown && s.newlyUpgrown.length;
    if (!hasSettled && !hasUpgrown) return;
    const ctx = bc.ctx;
    const { project } = makeProjector(w, h);
    const visibleFaces = visibleFacesForYaw(yaw);

    // Combine both lists (de-dup using a Set), filter to owner cells only,
    // and skip only live-animated specials (parks/strip malls are cached).
    const indices = new Set();
    for (let i = 0; i < s.newlySettled.length; i++) {
      const idx = s.newlySettled[i];
      if (s.specialOwner[idx] !== -1) continue;
      const sp = s.specials.get(idx);
      if (sp && isLiveAnimatedSpecial(sp)) continue;
      indices.add(idx);
    }
    if (s.newlyUpgrown) {
      for (let i = 0; i < s.newlyUpgrown.length; i++) {
        const idx = s.newlyUpgrown[i];
        if (s.specialOwner[idx] !== -1) continue;
        const sp = s.specials.get(idx);
        if (sp && isLiveAnimatedSpecial(sp)) continue;
        indices.add(idx);
      }
    }

    const items = [];
    for (const idx of indices) {
      const x = idx % GRID, y = Math.floor(idx / GRID);
      const p = project(x + 0.5, y + 0.5, 0);
      items.push({ idx, sy: p.y });
    }
    items.sort((a, b) => a.sy - b.sy);
    for (const it of items) drawBuilding(ctx, s, it.idx, project, visibleFaces, false);
    s.newlySettled.length = 0;
    if (s.newlyUpgrown) s.newlyUpgrown.length = 0;
  }

  // ============================================================
  // Per-frame draw
  // ============================================================
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const s = stateRef.current;
    if (!s) return;

    // Cap the pixel ratio: phones report up to 3x, which makes every
    // layer blit and fill push several times more pixels for little gain.
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const pw = Math.round(w * dpr), ph = Math.round(h * dpr);
    if (canvas.width !== pw || canvas.height !== ph) {
      canvas.width = pw;
      canvas.height = ph;
      cacheKeyRef.current = ''; // force rebuild
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // cache key
    const key = `${seed}|${yaw.toFixed(3)}|${zoom.toFixed(3)}|${w}|${h}|${paletteName}|${skin}`;
    if (key !== cacheKeyRef.current) {
      rebuildGroundCache(w, h, dpr);
      rebuildLandCache(w, h, dpr);
      rebuildRoadsCache(w, h, dpr);
      rebuildBuildingsCache(w, h, dpr);
      landFramesRef.current = 0;
      cacheKeyRef.current = key;
      framesSinceRebuildRef.current = 0;
    } else {
      // append revealed roads
      const hasRevealedRoads = s.newlyRevealedRoads && s.newlyRevealedRoads.length;
      if (hasRevealedRoads) {
        appendToRoadsCache(w, h, dpr);
      }
      // append new + upgrown buildings
      const hasUpgrown = s.newlyUpgrown && s.newlyUpgrown.length;
      const hasSettled = s.newlySettled.length;
      if (hasUpgrown || hasSettled) {
        appendToBuildingsCache(w, h, dpr);
        if (s.newlyUpgrown) s.newlyUpgrown.length = 0;
      }
      // New road reveals expose fresh grass-eligible interior cells, so
      // rebuild buildings cache to repaint grass underneath.
      if (hasRevealedRoads || hasSettled) s.landDirty = true;
      landFramesRef.current++;
      if (s.landDirty && landFramesRef.current > 45) {
        rebuildLandCache(w, h, dpr);
        landFramesRef.current = 0;
      }
      {
        framesSinceRebuildRef.current++;
        if (framesSinceRebuildRef.current > 300) {
          rebuildBuildingsCache(w, h, dpr);
          framesSinceRebuildRef.current = 0;
        }
      }
    }

    // Blit caches: ground -> roads -> buildings
    const gc = groundCacheRef.current;
    const rc = roadsCacheRef.current;
    const bc = buildingsCacheRef.current;
    const lc = landCacheRef.current;
    if (lc) ctx.drawImage(lc.canvas, 0, 0, w, h);
    else if (gc) ctx.drawImage(gc.canvas, 0, 0, w, h);
    if (rc) ctx.drawImage(rc.canvas, 0, 0, w, h);
    if (bc) ctx.drawImage(bc.canvas, 0, 0, w, h);

    // Draw animating buildings on top (live, per-frame)
    const { project } = makeProjector(w, h);
    const visibleFaces = visibleFacesForYaw(yaw);
    const animItems = [];
    for (let i = 0; i < s.cells.length; i++) {
      if (s.cells[i] === 1 && s.specialOwner[i] === -1) {
        const x = i % GRID, y = Math.floor(i / GRID);
        const p = project(x + 0.5, y + 0.5, 0);
        animItems.push({ idx: i, sy: p.y });
      }
    }
    animItems.sort((a, b) => a.sy - b.sy);
    for (const it of animItems) drawBuilding(ctx, s, it.idx, project, visibleFaces, true);

    // Draw only LIVE-ANIMATED specials (spire/crane/clock) every frame.
    // Static specials (parks, strip malls, domes, etc.) live in the cache.
    const specialItems = [];
    for (const [idx, sp] of s.specials) {
      if (s.cells[idx] !== 2) continue; // skip those still animating (drawn above)
      if (!isLiveAnimatedSpecial(sp)) continue;
      const x = idx % GRID, y = Math.floor(idx / GRID);
      const p = project(x + 0.5, y + 0.5, 0);
      specialItems.push({ idx, sy: p.y });
    }
    specialItems.sort((a, b) => a.sy - b.sy);
    for (const it of specialItems) drawBuilding(ctx, s, it.idx, project, visibleFaces, false);

    // STREET LAMP GLOW — only at dusk and night. Additive composite so
    // overlapping lamps brighten together like real streetlights.
    // Park lamps (l.small) get smaller, slightly cooler glows.
    if (s.lamps && s.lamps.length) {
      const lampLight = lighting(sunAngleRef.current);
      if (effectsRef.current && lampLight.daylight < 0.5) {
        const a = (0.5 - lampLight.daylight) / 0.5; // 0..1 ramp into night
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (const l of s.lamps) {
          const px = l.small ? l.x : l.x + 0.5;
          const py = l.small ? l.y : l.y + 0.5;
          const tElev = pointElev(s, px, py);
          const poleH = l.small ? 0.55 : 1.0;
          const head = project(px, py, tElev + poleH);
          // Ground pool below the lamp (cheap radial gradient ellipse).
          const groundCenter = project(px, py, tElev + 0.02);
          const Rg = l.small ? Math.max(10, zoom * 13) : Math.max(18, zoom * 24);
          const gp = ctx.createRadialGradient(
            groundCenter.x, groundCenter.y, 0,
            groundCenter.x, groundCenter.y, Rg
          );
          const poolA = l.small ? 0.22 : 0.28;
          gp.addColorStop(0, `rgba(255,210,130,${poolA * a})`);
          gp.addColorStop(0.5, `rgba(255,195,110,${(poolA * 0.5) * a})`);
          gp.addColorStop(1, 'rgba(255,180,90,0)');
          ctx.fillStyle = gp;
          ctx.beginPath();
          ctx.ellipse(groundCenter.x, groundCenter.y, Rg, Rg * 0.55, 0, 0, Math.PI * 2);
          ctx.fill();

          // Bulb glow at lamp head
          const R = l.small ? Math.max(7, zoom * 9) : Math.max(12, zoom * 14);
          const bulbA = l.small ? 0.30 : 0.38;
          const g = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, R);
          g.addColorStop(0, `rgba(255,225,150,${bulbA * a})`);
          g.addColorStop(0.4, `rgba(255,205,120,${(bulbA * 0.5) * a})`);
          g.addColorStop(1, 'rgba(255,200,100,0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(head.x, head.y, R, 0, Math.PI * 2);
          ctx.fill();
          // brighter inner core for the bulb itself
          const coreA = l.small ? 0.55 : 0.65;
          const g2 = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, R * 0.22);
          g2.addColorStop(0, `rgba(255,240,200,${coreA * a})`);
          g2.addColorStop(1, 'rgba(255,240,200,0)');
          ctx.fillStyle = g2;
          ctx.beginPath();
          ctx.arc(head.x, head.y, R * 0.22, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    }

    // site pulses
    for (const site of s.sites) {
      const p = project(site.x + 0.5, site.y + 0.5, s.terrain[site.y * GRID + site.x] || 0);
      const pulse = 5 + Math.sin(performance.now() / 220) * 2;
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, pulse * 2.5);
      g.addColorStop(0, 'rgba(217,90,70,0.55)');
      g.addColorStop(1, 'rgba(217,90,70,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, pulse * 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // cars
    if (carsEnabled && s.cars && s.cars.length) {
      const carLight = lighting(sunAngleRef.current);
      for (let i = 0; i < s.cars.length; i++) {
        const c = s.cars[i];
        // Car elevation tracks the sloped road surface via bilinear
        // interpolation of corner heights, so the car visually rides the slope.
        const carZ = pointElev(s, c.x, c.y);
        const p = project(c.x, c.y, carZ);
        // headlight glow at night — projected slightly forward
        if (effectsRef.current && carLight.daylight < 0.4) {
          const pHead = project(c.x + c.dx * 0.45, c.y + c.dy * 0.45, carZ);
          const glowG = ctx.createRadialGradient(pHead.x, pHead.y, 0, pHead.x, pHead.y, 9);
          glowG.addColorStop(0, `rgba(255,235,160,${0.55 * (1 - carLight.daylight)})`);
          glowG.addColorStop(1, 'rgba(255,235,160,0)');
          ctx.fillStyle = glowG;
          ctx.beginPath();
          ctx.arc(pHead.x, pHead.y, 9, 0, Math.PI * 2);
          ctx.fill();
        }
        // car body — direction-aligned rectangle.
        // Project front, back, and side-offset points to get screen-space
        // quad. This keeps the orientation correct under yaw/zoom.
        const HALF_LEN = 0.32, HALF_WID = 0.18;
        // perpendicular direction (rotate dx,dy by 90deg in cell space)
        const px = -c.dy, py = c.dx;
        const fl = project(c.x + c.dx * HALF_LEN + px * HALF_WID, c.y + c.dy * HALF_LEN + py * HALF_WID, carZ);
        const fr = project(c.x + c.dx * HALF_LEN - px * HALF_WID, c.y + c.dy * HALF_LEN - py * HALF_WID, carZ);
        const br = project(c.x - c.dx * HALF_LEN - px * HALF_WID, c.y - c.dy * HALF_LEN - py * HALF_WID, carZ);
        const bl = project(c.x - c.dx * HALF_LEN + px * HALF_WID, c.y - c.dy * HALF_LEN + py * HALF_WID, carZ);
        ctx.fillStyle = c.color;
        ctx.beginPath();
        ctx.moveTo(fl.x, fl.y);
        ctx.lineTo(fr.x, fr.y);
        ctx.lineTo(br.x, br.y);
        ctx.lineTo(bl.x, bl.y);
        ctx.closePath();
        ctx.fill();
        // dark outline so it reads on light roads at day
        ctx.strokeStyle = 'rgba(20,15,25,0.7)';
        ctx.lineWidth = 0.7;
        ctx.stroke();
        // windshield: thin lighter strip near the front
        const wsA = project(c.x + c.dx * (HALF_LEN * 0.55) + px * HALF_WID * 0.8, c.y + c.dy * (HALF_LEN * 0.55) + py * HALF_WID * 0.8, carZ);
        const wsB = project(c.x + c.dx * (HALF_LEN * 0.55) - px * HALF_WID * 0.8, c.y + c.dy * (HALF_LEN * 0.55) - py * HALF_WID * 0.8, carZ);
        const wsC = project(c.x + c.dx * (HALF_LEN * 0.05) - px * HALF_WID * 0.8, c.y + c.dy * (HALF_LEN * 0.05) - py * HALF_WID * 0.8, carZ);
        const wsD = project(c.x + c.dx * (HALF_LEN * 0.05) + px * HALF_WID * 0.8, c.y + c.dy * (HALF_LEN * 0.05) + py * HALF_WID * 0.8, carZ);
        ctx.fillStyle = carLight.daylight < 0.4 ? 'rgba(40,30,25,0.85)' : 'rgba(180,200,220,0.55)';
        ctx.beginPath();
        ctx.moveTo(wsA.x, wsA.y);
        ctx.lineTo(wsB.x, wsB.y);
        ctx.lineTo(wsC.x, wsC.y);
        ctx.lineTo(wsD.x, wsD.y);
        ctx.closePath();
        ctx.fill();

        // Emergency flashing lights: red/blue alternating bar on the roof.
        // Strobe ~4 Hz, left side red, right side blue, swap which is bright.
        if (c.emergency) {
          const t = performance.now() / 1000;
          const phase = ((t * 4) + c.flashPhase) % 1;
          const redOn = phase < 0.5;
          // Light bar positions: top-center, offset left/right from car center
          const barOffset = HALF_LEN * 0.15; // along the length axis (slightly forward of center)
          const sideOffset = HALF_WID * 0.55; // perpendicular offset
          const lzx = c.x + c.dx * barOffset + px * sideOffset;
          const lzy = c.y + c.dy * barOffset + py * sideOffset;
          const rzx = c.x + c.dx * barOffset - px * sideOffset;
          const rzy = c.y + c.dy * barOffset - py * sideOffset;
          const lp = project(lzx, lzy, carZ);
          const rp = project(rzx, rzy, carZ);
          // halos (additive)
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          const haloR = Math.max(6, zoom * 7);
          // red side
          const rg = ctx.createRadialGradient(lp.x, lp.y, 0, lp.x, lp.y, haloR);
          const rA = redOn ? 0.85 : 0.25;
          rg.addColorStop(0, `rgba(255,40,40,${rA})`);
          rg.addColorStop(1, 'rgba(255,40,40,0)');
          ctx.fillStyle = rg;
          ctx.beginPath();
          ctx.arc(lp.x, lp.y, haloR, 0, Math.PI * 2);
          ctx.fill();
          // blue side
          const bg = ctx.createRadialGradient(rp.x, rp.y, 0, rp.x, rp.y, haloR);
          const bA = redOn ? 0.25 : 0.85;
          bg.addColorStop(0, `rgba(60,120,255,${bA})`);
          bg.addColorStop(1, 'rgba(60,120,255,0)');
          ctx.fillStyle = bg;
          ctx.beginPath();
          ctx.arc(rp.x, rp.y, haloR, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          // bulb dots
          ctx.fillStyle = redOn ? '#ff3030' : '#7a1010';
          ctx.beginPath();
          ctx.arc(lp.x, lp.y, Math.max(1, zoom * 0.8), 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = redOn ? '#1530a0' : '#3060ff';
          ctx.beginPath();
          ctx.arc(rp.x, rp.y, Math.max(1, zoom * 0.8), 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // pedestrians: tiny figures with pants, shirt, and head
    if (s.peds && s.peds.length) {
      const pedLight = lighting(sunAngleRef.current);
      const isNight = pedLight.daylight < 0.4;
      for (let i = 0; i < s.peds.length; i++) {
        const p = s.peds[i];
        const pedZ = pointElev(s, p.x, p.y);
        const bob = Math.abs(Math.sin(p.bob)) * 0.08;
        const totalH = 0.35 + bob;
        const foot = project(p.x, p.y, pedZ);
        const waist = project(p.x, p.y, pedZ + totalH * 0.45);
        const neck = project(p.x, p.y, pedZ + totalH * 0.85);
        const head = project(p.x, p.y, pedZ + totalH);
        // soft warm halo at night so peds read against dark roads
        if (effectsRef.current && isNight) {
          const halo = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, 6);
          halo.addColorStop(0, `rgba(255,220,150,${0.35 * (1 - pedLight.daylight)})`);
          halo.addColorStop(1, 'rgba(255,220,150,0)');
          ctx.fillStyle = halo;
          ctx.beginPath();
          ctx.arc(head.x, head.y, 6, 0, Math.PI * 2);
          ctx.fill();
        }
        const lw = Math.max(1.4, zoom * 1.1);
        ctx.lineCap = 'round';
        // pants: foot -> waist
        ctx.strokeStyle = p.pants;
        ctx.lineWidth = lw;
        ctx.beginPath();
        ctx.moveTo(foot.x, foot.y);
        ctx.lineTo(waist.x, waist.y);
        ctx.stroke();
        // shirt: waist -> neck (slightly wider to read as torso)
        ctx.strokeStyle = p.shirt;
        ctx.lineWidth = lw * 1.15;
        ctx.beginPath();
        ctx.moveTo(waist.x, waist.y);
        ctx.lineTo(neck.x, neck.y);
        ctx.stroke();
        // head dot
        ctx.fillStyle = p.head;
        ctx.beginPath();
        ctx.arc(head.x, head.y, Math.max(1.1, zoom * 0.9), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // PLANES: drawn on top of everything except party overlay.
    if (s.planes && s.planes.length) {
      const planeLight = lighting(sunAngleRef.current);
      const isNightPlanes = planeLight.daylight < 0.4;
      for (let i = 0; i < s.planes.length; i++) {
        const plane = s.planes[i];
        const pose = planePose(plane);
        // Body length & wing span in cell units
        const bodyHalf = 0.45;
        const wingHalf = 0.55;
        // Body axis along x (heading), wings perpendicular (along y)
        const noseX = pose.x + bodyHalf * pose.headingX;
        const tailX = pose.x - bodyHalf * pose.headingX;
        const nose = project(noseX, pose.y, pose.z);
        const tail = project(tailX, pose.y, pose.z);
        const wingL = project(pose.x, pose.y - wingHalf, pose.z);
        const wingR = project(pose.x, pose.y + wingHalf, pose.z);
        // Shadow on ground (only when above runway elev)
        if (pose.z > pose.elev + 0.05) {
          const shadowDrop = pose.elev + 0.01;
          const sNose = project(noseX, pose.y, shadowDrop);
          const sTail = project(tailX, pose.y, shadowDrop);
          const sWL = project(pose.x, pose.y - wingHalf, shadowDrop);
          const sWR = project(pose.x, pose.y + wingHalf, shadowDrop);
          ctx.fillStyle = `rgba(40,30,50,${0.25 * planeLight.daylight})`;
          ctx.beginPath();
          ctx.moveTo(sNose.x, sNose.y);
          ctx.lineTo(sWR.x, sWR.y);
          ctx.lineTo(sTail.x, sTail.y);
          ctx.lineTo(sWL.x, sWL.y);
          ctx.closePath();
          ctx.fill();
        }
        // Plane fuselage: thick line from nose to tail
        ctx.strokeStyle = plane.color;
        ctx.lineWidth = Math.max(3, zoom * 2.3);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(nose.x, nose.y);
        ctx.lineTo(tail.x, tail.y);
        ctx.stroke();
        // Wings
        ctx.lineWidth = Math.max(2, zoom * 1.6);
        ctx.beginPath();
        ctx.moveTo(wingL.x, wingL.y);
        ctx.lineTo(wingR.x, wingR.y);
        ctx.stroke();
        // Tail fin (small vertical at the back)
        const finTop = project(tailX, pose.y, pose.z + 0.18);
        ctx.lineWidth = Math.max(1.5, zoom * 1.2);
        ctx.beginPath();
        ctx.moveTo(tail.x, tail.y);
        ctx.lineTo(finTop.x, finTop.y);
        ctx.stroke();
        // Nose dot for direction read
        ctx.fillStyle = 'rgba(40,30,50,0.6)';
        ctx.beginPath();
        ctx.arc(nose.x, nose.y, Math.max(1, zoom * 0.8), 0, Math.PI * 2);
        ctx.fill();
        // Wingtip nav lights — red on left, green on right.
        // Blink the strobes 2 Hz.
        const strobe = ((performance.now() / 1000) * 2) % 1 < 0.15;
        const dayBoost = isNightPlanes ? 1 : 0.5;
        // red left
        ctx.fillStyle = `rgba(255,40,40,${0.9 * dayBoost})`;
        ctx.beginPath();
        ctx.arc(wingL.x, wingL.y, Math.max(1.2, zoom * 0.9), 0, Math.PI * 2);
        ctx.fill();
        // green right
        ctx.fillStyle = `rgba(60,255,80,${0.9 * dayBoost})`;
        ctx.beginPath();
        ctx.arc(wingR.x, wingR.y, Math.max(1.2, zoom * 0.9), 0, Math.PI * 2);
        ctx.fill();
        // strobe halos at night
        if (isNightPlanes && strobe) {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          for (const wt of [wingL, wingR]) {
            const R = 8;
            const g = ctx.createRadialGradient(wt.x, wt.y, 0, wt.x, wt.y, R);
            g.addColorStop(0, 'rgba(255,255,255,0.7)');
            g.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(wt.x, wt.y, R, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }
      }
    }

    // BIG SHIP
    if (s.ship) {
      const sh = s.ship;
      const lt = lighting(sunAngleRef.current);
      const night = lt.daylight < 0.4;
      const along = sh.dx !== 0;
      const box = (a0, a1, w, z0, z1, top, side) => {
        // a0..a1 along the heading, w half width, relative to ship center
        const d = along ? sh.dx : sh.dy;
        const lo = Math.min(a0 * d, a1 * d), hi = Math.max(a0 * d, a1 * d);
        if (along) drawGridBox(ctx, project, sh.x + lo, sh.y - w, sh.x + hi, sh.y + w, z0, z1, top, side, 'rgba(20,25,40,0.35)');
        else drawGridBox(ctx, project, sh.x - w, sh.y + lo, sh.x + w, sh.y + hi, z0, z1, top, side, 'rgba(20,25,40,0.35)');
      };
      // wake
      const tail = project(sh.x - sh.dx * 1.0, sh.y - sh.dy * 1.0, 0.01);
      const wakeEnd = project(sh.x - sh.dx * 2.2, sh.y - sh.dy * 2.2, 0.01);
      ctx.strokeStyle = 'rgba(225,238,248,0.35)';
      ctx.lineWidth = Math.max(2, zoom * 2.5);
      ctx.beginPath(); ctx.moveTo(tail.x, tail.y); ctx.lineTo(wakeEnd.x, wakeEnd.y); ctx.stroke();
      // hull, deckhouse, bridge, funnel
      box(-1.0, 1.0, 0.32, 0.0, 0.22, tintHex('#c9c2b2', lt), tintHex('#1f3d6b', lt));
      box(-0.75, 0.05, 0.24, 0.22, 0.5, tintHex('#f2efe8', lt), tintHex('#dcd8cf', lt));
      box(-0.7, -0.35, 0.2, 0.5, 0.68, tintHex('#f2efe8', lt), tintHex('#d2cec4', lt));
      box(-0.25, -0.05, 0.09, 0.5, 0.92, tintHex('#2f6fd0', lt), tintHex('#c8452f', lt));
      if (night) {
        const w0 = project(sh.x - sh.dx * 0.7, sh.y - sh.dy * 0.7, 0.38);
        const w1 = project(sh.x + sh.dx * 0.0, sh.y + sh.dy * 0.0, 0.38);
        ctx.strokeStyle = 'rgba(255,220,140,0.95)';
        ctx.lineWidth = Math.max(1, zoom * 0.8);
        ctx.beginPath(); ctx.moveTo(w0.x, w0.y); ctx.lineTo(w1.x, w1.y); ctx.stroke();
      }
    }

    // TRAIN
    if (s.train) {
      const tr = s.train;
      const lt = lighting(sunAngleRef.current);
      const night = lt.daylight < 0.4;
      const y = s.railY;
      for (let u = 0; u < TRAIN_UNITS; u++) {
        const x0 = tr.x + u * (TRAIN_UNIT_LEN + TRAIN_GAP);
        const x1 = x0 + TRAIN_UNIT_LEN;
        const mx = (x0 + x1) / 2;
        const ci = y * GRID + Math.max(0, Math.min(GRID - 1, Math.floor(mx)));
        const z0 = (s.water && s.water[ci] === 1) ? 0.27 : pointElev(s, mx, y + 0.5) + 0.04;
        const loco = u === 0 || u === TRAIN_UNITS - 1;
        drawGridBox(ctx, project, x0, y + 0.3, x1, y + 0.7, z0, z0 + 0.34,
          tintHex(loco ? '#2b5fae' : '#d8d4cc', lt),
          tintHex(loco ? '#1f4785' : '#9a3b32', lt),
          'rgba(20,20,30,0.45)');
        // window strip
        const wa = project(x0 + 0.1, y + 0.7, z0 + 0.22), wb = project(x1 - 0.1, y + 0.7, z0 + 0.22);
        ctx.strokeStyle = night ? 'rgba(255,220,140,0.95)' : 'rgba(40,50,70,0.7)';
        ctx.lineWidth = Math.max(1, zoom * 0.7);
        ctx.beginPath(); ctx.moveTo(wa.x, wa.y); ctx.lineTo(wb.x, wb.y); ctx.stroke();
      }
      if (night && effectsRef.current) {
        const len = TRAIN_UNITS * TRAIN_UNIT_LEN + (TRAIN_UNITS - 1) * TRAIN_GAP;
        const hx = tr.dir > 0 ? tr.x + len + 0.3 : tr.x - 0.3;
        const hp = project(hx, y + 0.5, pointElev(s, Math.max(0, Math.min(GRID - 1, hx)), y + 0.5) + 0.2);
        const g = ctx.createRadialGradient(hp.x, hp.y, 0, hp.x, hp.y, 14);
        g.addColorStop(0, 'rgba(255,240,190,0.7)');
        g.addColorStop(1, 'rgba(255,240,190,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(hp.x, hp.y, 14, 0, Math.PI * 2); ctx.fill();
      }
    }

    // BOATS: drawn on the water surface (z=0) with a bob + wake.
    if (s.boats && s.boats.length) {
      for (let i = 0; i < s.boats.length; i++) {
        const b = s.boats[i];
        const bob = Math.sin(b.bob) * 0.03;
        const z = 0.05 + bob;
        // hull: a short rectangle aligned to heading
        const halfLen = 0.32, halfWid = 0.16;
        const px = -b.dy, py = b.dx; // perpendicular
        const nose = project(b.x + b.dx * halfLen, b.y + b.dy * halfLen, z);
        const tailL = project(b.x - b.dx * halfLen + px * halfWid, b.y - b.dy * halfLen + py * halfWid, z);
        const tailR = project(b.x - b.dx * halfLen - px * halfWid, b.y - b.dy * halfLen - py * halfWid, z);
        const midL = project(b.x + px * halfWid, b.y + py * halfWid, z);
        const midR = project(b.x - px * halfWid, b.y - py * halfWid, z);
        // wake (subtle light triangle behind)
        const wakeEnd = project(b.x - b.dx * 0.9, b.y - b.dy * 0.9, 0.01);
        ctx.fillStyle = 'rgba(220,235,245,0.20)';
        ctx.beginPath();
        ctx.moveTo(tailL.x, tailL.y);
        ctx.lineTo(tailR.x, tailR.y);
        ctx.lineTo(wakeEnd.x, wakeEnd.y);
        ctx.closePath();
        ctx.fill();
        // hull
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.moveTo(nose.x, nose.y);
        ctx.lineTo(midR.x, midR.y);
        ctx.lineTo(tailR.x, tailR.y);
        ctx.lineTo(tailL.x, tailL.y);
        ctx.lineTo(midL.x, midL.y);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(30,25,35,0.55)';
        ctx.lineWidth = 0.6;
        ctx.stroke();
        // tiny cabin/mast dot
        const cabin = project(b.x, b.y, z + 0.12);
        ctx.strokeStyle = 'rgba(60,50,60,0.8)';
        ctx.lineWidth = Math.max(1, zoom * 0.7);
        const hullCtr = project(b.x, b.y, z);
        ctx.beginPath();
        ctx.moveTo(hullCtr.x, hullCtr.y);
        ctx.lineTo(cabin.x, cabin.y);
        ctx.stroke();
        ctx.fillStyle = 'rgba(245,245,235,0.9)';
        ctx.beginPath();
        ctx.arc(cabin.x, cabin.y, Math.max(1, zoom * 0.7), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // PARTY OVERLAY ------------------------------------------------
    if (partyMode) {
      drawPartyOverlay(ctx, s, project, w, h);
    }

    drawCompass(ctx, w - 50, 80, yaw);
  }, [seed, yaw, zoom, carsEnabled]);

  // ============================================================
  // BLOCK PARTY OVERLAY
  // ============================================================
  // Draws music-reactive lighting over the existing scene. Runs after
  // everything else so it sits on top.
  const partyRipplesRef = useRef([]); // active beat ripples
  const lastBeatHandledRef = useRef(0);

  function drawPartyOverlay(ctx, s, project, w, h) {
    const f = audioFeaturesRef.current;
    if (!f) return;

    // Spawn a new ripple on each new beat
    if (f.lastBeatTime !== lastBeatHandledRef.current) {
      lastBeatHandledRef.current = f.lastBeatTime;
      partyRipplesRef.current.push({
        x: s.cx, y: s.cy,
        r: 0,
        bornAt: performance.now() / 1000,
        // Random hue per beat for variety
        hue: Math.floor(Math.random() * 360),
        amp: 0.7 + f.bass * 0.6,
      });
      // Cap ripple count
      if (partyRipplesRef.current.length > 6) {
        partyRipplesRef.current.shift();
      }
    }

    // Per-building light blobs. Iterate settled buildings.
    // Light intensity = midPeak (sustained) + per-building phase offset
    // so they don't all pulse identically.
    const tNow = performance.now() / 1000;
    const lightLevel = f.midPeak * 0.7 + f.rms * 0.5;
    const bassPulse = f.bassPeak;

    if (lightLevel > 0.05 || bassPulse > 0.05) {
      ctx.globalCompositeOperation = 'screen';
      for (let y = 0; y < GRID; y += 1) {
        for (let x = 0; x < GRID; x += 1) {
          const idx = y * GRID + x;
          if (s.cells[idx] !== 2) continue;
          if (s.specialOwner[idx] !== -1) continue; // skip non-owner cells
          // Use the variance to give each building a unique phase
          const v = s.variance[idx];
          const palette = paletteFor(s.paletteIdx[idx]);
          const phase = v * Math.PI * 2 + tNow * 1.5;
          const localLight = lightLevel * (0.7 + 0.3 * Math.sin(phase));
          if (localLight < 0.04) continue;

          // Building height with bass scale modulation
          const baseZ = Math.max(0, s.terrain[idx]);
          const bh = s.currentH[idx];
          // Position the light blob roughly at the building's top center
          const cx = x + 0.5, cy = y + 0.5;
          const topPt = project(cx, cy, baseZ + bh + bassPulse * 1.5);

          const accent = palette[3] || '#ffffff';
          const radius = 12 * localLight + 4;
          const g = ctx.createRadialGradient(topPt.x, topPt.y, 0, topPt.x, topPt.y, radius);
          g.addColorStop(0, withAlpha(palette[1], 0.9 * localLight));
          g.addColorStop(0.5, withAlpha(accent, 0.45 * localLight));
          g.addColorStop(1, withAlpha(accent, 0));
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(topPt.x, topPt.y, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    // Beat ripples — expanding circles from city center
    const ripples = partyRipplesRef.current;
    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i];
      const age = tNow - r.bornAt;
      if (age > 1.4) { ripples.splice(i, 1); continue; }
      // Expand outward in grid units
      r.r = age * 30;
      const alpha = (1 - age / 1.4) * r.amp * 0.6;
      // Project an ellipse at the rippling radius from city center.
      // Approximate as a screen-space ellipse for cheapness.
      const cp = project(r.x, r.y, 0);
      const edge = project(r.x + r.r, r.y, 0);
      const rx = Math.abs(edge.x - cp.x);
      const ry = rx * 0.5; // iso squish
      ctx.strokeStyle = `hsla(${r.hue}, 90%, 65%, ${alpha})`;
      ctx.lineWidth = 2.5 * r.amp;
      ctx.beginPath();
      ctx.ellipse(cp.x, cp.y, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Treble shimmer: small bright dots scattered on rooftops on high treble
    if (f.treblePeak > 0.25) {
      const trebStrength = f.treblePeak;
      const sparkleCount = Math.floor(trebStrength * 30);
      ctx.fillStyle = `rgba(255,255,220,${0.7 * trebStrength})`;
      // Sample random buildings (deterministic from current time for stability)
      const seed = Math.floor(tNow * 30); // ~30/sec sparkle reseed
      let sIdx = seed;
      for (let k = 0; k < sparkleCount; k++) {
        // simple LCG to pick cell indices
        sIdx = (sIdx * 1103515245 + 12345) & 0x7fffffff;
        const cell = sIdx % (GRID * GRID);
        if (s.cells[cell] !== 2 || s.specialOwner[cell] !== -1) continue;
        const x = cell % GRID, y = Math.floor(cell / GRID);
        const baseZ = Math.max(0, s.terrain[cell]);
        const bh = s.currentH[cell];
        const p = project(x + 0.5, y + 0.5, baseZ + bh);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1 + trebStrength * 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Bottom-of-screen audio level meter (small, for feedback)
    const meterY = h - 4;
    const meterW = w * 0.7;
    const meterX = (w - meterW) / 2;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(meterX, meterY - 3, meterW, 3);
    ctx.fillStyle = 'hsl(' + (40 + f.rms * 60) + ', 90%, 60%)';
    ctx.fillRect(meterX, meterY - 3, meterW * f.rms, 3);
    // bass marker
    ctx.fillStyle = 'rgba(255,90,140,0.8)';
    ctx.fillRect(meterX + meterW * f.bass - 1, meterY - 5, 2, 5);
  }

  function drawCompass(ctx, cx, cy, yaw) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = 'rgba(253,247,236,0.85)';
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(60,40,30,0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.rotate(-yaw);
    ctx.fillStyle = '#c96a55';
    ctx.beginPath();
    ctx.moveTo(0, -16); ctx.lineTo(-4, 0); ctx.lineTo(4, 0); ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(60,40,30,0.5)';
    ctx.beginPath();
    ctx.moveTo(0, 16); ctx.lineTo(-3, 0); ctx.lineTo(3, 0); ctx.closePath();
    ctx.fill();
    ctx.font = 'bold 9px monospace';
    ctx.fillStyle = '#3a2a1e';
    ctx.textAlign = 'center';
    ctx.fillText('N', 0, -24);
    ctx.restore();
  }

  // --- main loop ----------------------------------------------
  useEffect(() => {
    const loop = (now) => {
      const last = lastTimeRef.current || now;
      const dt = Math.min(0.05, (now - last) / 1000);
      lastTimeRef.current = now;
      // Always analyse audio in party mode so visuals react even if
      // city growth is paused.
      if (partyMode && musicPlaying) analyseAudio(dt);
      if (running) {
        stepGrowth(dt);
        animateBuildings(dt);
        // Day/night auto-cycle removed — it forced full cache rebuilds on
        // every sun step, which was the main source of lag. Time of day is
        // now fixed; choose it with the NOON / SUNSET / MIDNIGHT buttons.
        if (carsEnabled) stepCars(dt);
        stepPeds(dt);
        stepPlanes(dt);
        stepBoats(dt);
        stepTrain(dt);
        stepShip(dt);
      }
      // Cars + peds should keep moving in party mode even if "running" is off
      if (partyMode && !running && carsEnabled) stepCars(dt);
      if (partyMode && !running) stepPeds(dt);
      if (partyMode && !running) stepPlanes(dt);
      draw();
      const s = stateRef.current;
      if (s) setStatsThrottled({ built: s.built, sites: s.sites.length });
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [running, stepGrowth, animateBuildings, draw, carsEnabled, partyMode, musicPlaying]);

  const lastStatsRef = useRef(0);
  function setStatsThrottled(next) {
    const now = performance.now();
    if (now - lastStatsRef.current > 250) {
      lastStatsRef.current = now;
      setStats(next);
    }
  }

  // --- gestures: 1-finger drag = yaw, 2-finger pinch = zoom ---
  const gestureRef = useRef({ touches: [], startYaw: 0, startZoom: 1, startDist: 0, lastX: 0 });

  const onTouchStart = (e) => {
    const g = gestureRef.current;
    g.touches = Array.from(e.touches);
    if (g.touches.length === 1) {
      g.lastX = g.touches[0].clientX;
      g.startYaw = yaw;
    } else if (g.touches.length === 2) {
      const dx = g.touches[0].clientX - g.touches[1].clientX;
      const dy = g.touches[0].clientY - g.touches[1].clientY;
      g.startDist = Math.hypot(dx, dy);
      g.startZoom = zoom;
    }
  };

  const onTouchMove = (e) => {
    e.preventDefault();
    const g = gestureRef.current;
    if (e.touches.length === 1 && g.touches.length === 1) {
      const dx = e.touches[0].clientX - g.lastX;
      g.lastX = e.touches[0].clientX;
      setYaw(y => y + (dx / window.innerWidth) * Math.PI * 2);
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const d = Math.hypot(dx, dy);
      if (g.startDist > 0) {
        const factor = d / g.startDist;
        setZoom(clamp(g.startZoom * factor, 0.4, 2.4));
      }
    }
  };

  const onTouchEnd = (e) => {
    gestureRef.current.touches = Array.from(e.touches);
    if (e.touches.length === 1) gestureRef.current.lastX = e.touches[0].clientX;
  };

  const mouseRef = useRef({ down: false, lastX: 0 });
  const onMouseDown = (e) => { mouseRef.current.down = true; mouseRef.current.lastX = e.clientX; };
  const onMouseMove = (e) => {
    if (!mouseRef.current.down) return;
    const dx = e.clientX - mouseRef.current.lastX;
    mouseRef.current.lastX = e.clientX;
    setYaw(y => y + (dx / window.innerWidth) * Math.PI * 2);
  };
  const onMouseUp = () => { mouseRef.current.down = false; };

  const reset = () => setSeed(Math.floor(Math.random() * 1e9));
  const goHome = () => {
    setRunning(false);
    setScreen('home');
    setYaw(0);
    setZoom(1);
  };
  const startCity = () => {
    setSeed(Math.floor(Math.random() * 1e9));
    setScreen('city');
    setRunning(true);
  };

  // ====== AUDIO ======
  function ensureAudioCtx() {
    if (audioCtxRef.current) return audioCtxRef.current;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    const ctx = new Ctx();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.7;
    const gain = ctx.createGain();
    gain.gain.value = musicVolume;
    gain.connect(analyser);
    analyser.connect(ctx.destination);
    audioCtxRef.current = ctx;
    analyserRef.current = analyser;
    audioGainRef.current = gain;
    fftDataRef.current = new Uint8Array(analyser.frequencyBinCount);
    return ctx;
  }

  async function loadMusicFile(file) {
    if (!file) return;
    const ctx = ensureAudioCtx();
    if (!ctx) {
      alert('Web Audio not supported on this browser.');
      return;
    }
    try {
      // Stop current playback if any
      stopMusic();
      const arrayBuffer = await file.arrayBuffer();
      const buffer = await ctx.decodeAudioData(arrayBuffer);
      audioBufferRef.current = buffer;
      audioOffsetRef.current = 0;
      setMusicLoaded(true);
      setMusicName(file.name);
      // Auto-play after load
      playMusic();
    } catch (err) {
      alert('Could not load audio file: ' + (err.message || err));
    }
  }

  function playMusic() {
    const ctx = audioCtxRef.current;
    const buffer = audioBufferRef.current;
    if (!ctx || !buffer) return;
    // Resume context (browsers require user gesture first)
    if (ctx.state === 'suspended') ctx.resume();
    // Stop previous source if any
    if (audioSourceRef.current) {
      try { audioSourceRef.current.stop(); } catch (e) {}
      audioSourceRef.current.disconnect();
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    src.connect(audioGainRef.current);
    src.start(0, audioOffsetRef.current % buffer.duration);
    audioStartTimeRef.current = ctx.currentTime - audioOffsetRef.current;
    audioSourceRef.current = src;
    setMusicPlaying(true);
  }

  function pauseMusic() {
    const ctx = audioCtxRef.current;
    if (!ctx || !audioSourceRef.current) return;
    audioOffsetRef.current = ctx.currentTime - audioStartTimeRef.current;
    try { audioSourceRef.current.stop(); } catch (e) {}
    audioSourceRef.current.disconnect();
    audioSourceRef.current = null;
    setMusicPlaying(false);
  }

  function stopMusic() {
    if (audioSourceRef.current) {
      try { audioSourceRef.current.stop(); } catch (e) {}
      audioSourceRef.current.disconnect();
      audioSourceRef.current = null;
    }
    audioOffsetRef.current = 0;
    setMusicPlaying(false);
  }

  // Update volume gain when slider changes
  useEffect(() => {
    if (audioGainRef.current) audioGainRef.current.gain.value = musicVolume;
  }, [musicVolume]);

  // Analyse the FFT each frame; extract features.
  function analyseAudio(dt) {
    const analyser = analyserRef.current;
    const data = fftDataRef.current;
    if (!analyser || !data) return;
    analyser.getByteFrequencyData(data);
    const bins = data.length;
    // Frequency bin ranges: bass = lowest ~8%, mid = next ~25%, treble = remainder
    const bassEnd = Math.floor(bins * 0.08);
    const midEnd = Math.floor(bins * 0.33);
    let bassSum = 0, midSum = 0, trebSum = 0, totSum = 0;
    for (let i = 0; i < bins; i++) {
      const v = data[i];
      totSum += v;
      if (i < bassEnd) bassSum += v;
      else if (i < midEnd) midSum += v;
      else trebSum += v;
    }
    const bass = bassSum / (bassEnd || 1) / 255;
    const mid = midSum / (midEnd - bassEnd || 1) / 255;
    const treble = trebSum / (bins - midEnd || 1) / 255;
    const rms = totSum / bins / 255;

    const f = audioFeaturesRef.current;
    // Rolling bass average (slow ~2s window) for beat detection
    const decay = Math.exp(-dt / 2.0);
    f.bassAvg = f.bassAvg * decay + bass * (1 - decay);
    // Beat: bass significantly above its rolling average, AND we haven't
    // already triggered a beat in the last 200ms.
    const now = performance.now() / 1000;
    if (bass > f.bassAvg * 1.45 && bass > 0.35 && (now - f.lastBeatTime) > 0.18) {
      f.beat = 1.0;
      f.lastBeatTime = now;
    } else {
      // beat envelope decays quickly
      f.beat = Math.max(0, f.beat - dt * 4.0);
    }

    // Peak-followers (slow attack, slow release) for sustained pulses
    f.bassPeak = Math.max(bass, f.bassPeak * Math.exp(-dt / 0.25));
    f.midPeak = Math.max(mid, f.midPeak * Math.exp(-dt / 0.30));
    f.treblePeak = Math.max(treble, f.treblePeak * Math.exp(-dt / 0.20));

    f.rms = rms;
    f.bass = bass;
    f.mid = mid;
    f.treble = treble;
  }

  return (
    <div style={styles.root}>
      <canvas
        ref={canvasRef}
        style={styles.canvas}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      />

      <div style={styles.topStrip}>
        <div style={styles.titleBlock}>
          <div style={styles.titleSmall}>INSTANCE</div>
          <div style={styles.titleBig}>NANOVERSE</div>
        </div>
        <div style={styles.statBlock}>
          <div style={styles.statRow}><span>BUILT</span><b>{stats.built}</b></div>
          <div style={styles.statRow}><span>SITES</span><b>{stats.sites}</b></div>
          <div style={styles.statRow}><span>SEED</span><b>{seed.toString(36).slice(0,6)}</b></div>
        </div>
      </div>


      <button
        onClick={() => setPanel(p => !p)}
        style={styles.tab}
        aria-label="Toggle controls"
      >
        {panel ? '▾ HIDE' : '▴ CONTROLS'}
      </button>

      {panel && (
        <div style={styles.panel}>
          <div style={styles.sectionLabel}>SHAPE</div>
          <div style={styles.shapeRow}>
            {['circle','square','rectangle','triangle','pentagon','hexagon','octagon','diamond','random'].map(s => (
              <button
                key={s}
                onClick={() => setShape(s)}
                style={{ ...styles.shapeBtn, ...(shape === s ? styles.shapeBtnActive : null) }}
              >{s}</button>
            ))}
          </div>
          <div style={styles.sliderRow}>
            <label style={styles.sliderLabel}>TERRAIN <b>{terrainAmp.toFixed(1)}</b></label>
            <input type="range" min="0" max="4" step="0.1"
              value={terrainAmp}
              onChange={e => setTerrainAmp(parseFloat(e.target.value))}
              style={styles.slider} />
          </div>
          <div style={styles.sectionLabel}>WATER <b style={{textTransform:'none'}}>{waterMode}</b></div>
          <div style={{ ...styles.btnRow, marginBottom: 14 }}>
            {['none', 'lake', 'river', 'both'].map(m => (
              <button key={m}
                style={{ ...styles.shapeBtn, ...(waterMode === m ? styles.shapeBtnActive : null), flex: 1 }}
                onClick={() => setWaterMode(m)}
              >{m}</button>
            ))}
          </div>
          <div style={styles.sliderRow}>
            <label style={styles.sliderLabel}>SPEED <b>{growthRate}</b></label>
            <input type="range" min="1" max="30" step="1"
              value={growthRate}
              onChange={e => setGrowthRate(parseInt(e.target.value))}
              style={styles.slider} />
          </div>
          <div style={styles.sliderRow}>
            <label style={styles.sliderLabel}>MAX SITES <b>{maxSites}</b></label>
            <input type="range" min="1" max="8" step="1"
              value={maxSites}
              onChange={e => setMaxSites(parseInt(e.target.value))}
              style={styles.slider} />
          </div>
          <div style={styles.sectionLabel}>GROWTH MODE</div>
          <div style={styles.modeRow}>
            {[
              { id: 'normal', label: 'normal' },
              { id: 'isolated', label: 'isolated' },
              { id: 'neighborhood', label: 'neighborhood' },
            ].map(m => (
              <button
                key={m.id}
                onClick={() => setGrowMode(m.id)}
                style={{ ...styles.shapeBtn, ...(growMode === m.id ? styles.shapeBtnActive : null) }}
              >{m.label}</button>
            ))}
          </div>
          <div style={styles.sectionLabel}>PALETTE</div>
          <div style={styles.shapeRow}>
            {['pastel','seattle','london','tokyo','miami','mono'].map(p => (
              <button
                key={p}
                onClick={() => setPaletteName(p)}
                style={{ ...styles.shapeBtn, ...(paletteName === p ? styles.shapeBtnActive : null) }}
              >{p}</button>
            ))}
          </div>
          <div style={styles.sectionLabel}>SKIN</div>
          <div style={styles.shapeRow}>
            {['watercolor','flat','outline','gradient','glass'].map(sk => (
              <button
                key={sk}
                onClick={() => setSkin(sk)}
                style={{ ...styles.shapeBtn, ...(skin === sk ? styles.shapeBtnActive : null) }}
              >{sk}</button>
            ))}
          </div>

          <div style={styles.sectionLabel}>TIME OF DAY</div>
          <div style={styles.btnRow}>
            <button
              style={{ ...styles.secondaryBtn, flex: 1 }}
              onClick={() => { sunAngleRef.current = 0; cacheKeyRef.current = ''; }}
            >NOON</button>
            <button
              style={{ ...styles.secondaryBtn, flex: 1 }}
              onClick={() => { sunAngleRef.current = Math.PI / 2; cacheKeyRef.current = ''; }}
            >SUNSET</button>
            <button
              style={{ ...styles.secondaryBtn, flex: 1 }}
              onClick={() => { sunAngleRef.current = Math.PI; cacheKeyRef.current = ''; }}
            >MIDNIGHT</button>
          </div>

          <div style={{ ...styles.sectionLabel, marginTop: 12 }}>CARS</div>
          <div style={styles.btnRow}>
            <button
              style={{ ...styles.shapeBtn, ...(carsEnabled ? styles.shapeBtnActive : null), flex: 1 }}
              onClick={() => setCarsEnabled(c => !c)}
            >{carsEnabled ? 'on' : 'off'}</button>
          </div>

          <div style={{ ...styles.sectionLabel, marginTop: 12 }}>LIGHT EFFECTS</div>
          <div style={styles.btnRow}>
            <button
              style={{ ...styles.shapeBtn, ...(effectsOn ? styles.shapeBtnActive : null), flex: 1 }}
              onClick={() => setEffectsOn(v => !v)}
            >{effectsOn ? 'on' : 'off'}</button>
          </div>

          <div style={{ ...styles.sectionLabel, marginTop: 12 }}>BLOCK PARTY</div>
          <div style={styles.btnRow}>
            <button
              style={{
                ...styles.shapeBtn,
                ...(partyMode ? styles.shapeBtnActive : null),
                flex: 1,
                background: partyMode ? '#c96a55' : 'transparent',
                color: partyMode ? '#fdf7ec' : '#3a2a1e',
                borderColor: partyMode ? '#c96a55' : 'rgba(90,60,40,0.4)',
              }}
              onClick={() => setPartyMode(p => !p)}
            >{partyMode ? 'party on' : 'party off'}</button>
          </div>
          <div style={{ ...styles.btnRow, marginTop: 6 }}>
            <label style={{ ...styles.shapeBtn, flex: 1, textAlign: 'center', cursor: 'pointer', display: 'block' }}>
              {musicLoaded ? '↪ CHANGE TRACK' : '↓ LOAD MUSIC'}
              <input
                type="file"
                accept="audio/*"
                onChange={e => {
                  if (e.target.files && e.target.files[0]) {
                    loadMusicFile(e.target.files[0]);
                  }
                }}
                style={{ display: 'none' }}
              />
            </label>
          </div>
          {musicLoaded && (
            <>
              <div style={{
                fontSize: 10, fontFamily: 'monospace',
                opacity: 0.7, marginTop: 6, marginBottom: 4,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                ♫ {musicName}
              </div>
              <div style={styles.btnRow}>
                <button
                  style={{ ...styles.shapeBtn, flex: 1 }}
                  onClick={() => (musicPlaying ? pauseMusic() : playMusic())}
                >{musicPlaying ? '❚❚ PAUSE' : '▶ PLAY'}</button>
                <button
                  style={{ ...styles.shapeBtn, flex: 1 }}
                  onClick={stopMusic}
                >■ STOP</button>
              </div>
              <div style={styles.sliderRow}>
                <label style={styles.sliderLabel}>VOLUME <b>{Math.round(musicVolume * 100)}</b></label>
                <input type="range" min="0" max="1" step="0.05"
                  value={musicVolume}
                  onChange={e => setMusicVolume(parseFloat(e.target.value))}
                  style={styles.slider} />
              </div>
            </>
          )}

          <div style={{ ...styles.btnRow, marginTop: 12 }}>
            <button
              style={{ ...styles.primaryBtn, background: running ? '#3a2a4a' : '#c96a55' }}
              onClick={() => setRunning(r => !r)}
            >{running ? 'PAUSE' : 'RESUME'}</button>
            <button style={styles.secondaryBtn} onClick={() => setYaw(0)}>RESET VIEW</button>
            <button style={styles.secondaryBtn} onClick={reset}>NEW SEED</button>
          </div>
          <div style={{ ...styles.btnRow, marginTop: 8 }}>
            <button style={styles.homeBtn} onClick={goHome}>↩ HOME SCREEN</button>
          </div>
        </div>
      )}

      {screen === 'home' && (
        <div style={styles.homeOverlay}>
          <div style={styles.homeInner}>
            <div style={styles.homeTitleSmall}>INSTANCE</div>
            <div style={styles.homeTitleBig}>NANOVERSE</div>
            <div style={styles.homeSub}>
              Choose a shape. The city will grow into it.
            </div>

            <div style={styles.sectionLabel}>SHAPE</div>
            <div style={styles.shapeRow}>
              {['circle','square','rectangle','triangle','pentagon','hexagon','octagon','diamond','random'].map(s => (
                <button
                  key={s}
                  onClick={() => setShape(s)}
                  style={{ ...styles.shapeBtn, ...(shape === s ? styles.shapeBtnActive : null) }}
                >{s}</button>
              ))}
            </div>

            <div style={styles.sliderRow}>
              <label style={styles.sliderLabel}>TERRAIN <b>{terrainAmp.toFixed(1)}</b></label>
              <input type="range" min="0" max="4" step="0.1"
                value={terrainAmp}
                onChange={e => setTerrainAmp(parseFloat(e.target.value))}
                style={styles.slider} />
            </div>

            <div style={styles.sectionLabel}>GROWTH MODE</div>
            <div style={styles.modeRow}>
              {[
                { id: 'normal', label: 'normal' },
                { id: 'isolated', label: 'isolated' },
                { id: 'neighborhood', label: 'neighborhood' },
              ].map(m => (
                <button
                  key={m.id}
                  onClick={() => setGrowMode(m.id)}
                  style={{ ...styles.shapeBtn, ...(growMode === m.id ? styles.shapeBtnActive : null) }}
                >{m.label}</button>
              ))}
            </div>

            <div style={styles.sectionLabel}>PALETTE</div>
            <div style={styles.shapeRow}>
              {['pastel','seattle','london','tokyo','miami','mono'].map(p => (
                <button
                  key={p}
                  onClick={() => setPaletteName(p)}
                  style={{ ...styles.shapeBtn, ...(paletteName === p ? styles.shapeBtnActive : null) }}
                >{p}</button>
              ))}
            </div>

            <div style={styles.sectionLabel}>SKIN</div>
            <div style={styles.shapeRow}>
              {['watercolor','flat','outline','gradient','glass'].map(sk => (
                <button
                  key={sk}
                  onClick={() => setSkin(sk)}
                  style={{ ...styles.shapeBtn, ...(skin === sk ? styles.shapeBtnActive : null) }}
                >{sk}</button>
              ))}
            </div>

            <button style={styles.startBtn} onClick={startCity}>
              START
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  root: {
    position: 'fixed',
    inset: 0,
    background: '#fdf7ec',
    fontFamily: 'Georgia, "Iowan Old Style", serif',
    color: '#3a2a1e',
    overflow: 'hidden',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    touchAction: 'none',
  },
  canvas: { position: 'absolute', inset: 0, width: '100%', height: '100%', touchAction: 'none' },
  topStrip: {
    position: 'absolute',
    top: 'env(safe-area-inset-top, 0px)',
    left: 0, right: 0,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '14px 16px',
    pointerEvents: 'none',
  },
  titleBlock: {
    background: 'rgba(253,247,236,0.85)',
    border: '1px solid rgba(90,60,40,0.3)',
    padding: '6px 10px',
    backdropFilter: 'blur(4px)',
  },
  titleSmall: { fontSize: 9, letterSpacing: 3, opacity: 0.55, fontFamily: 'monospace' },
  titleBig: { fontSize: 17, fontStyle: 'italic', letterSpacing: 1, marginTop: 2 },
  statBlock: {
    background: 'rgba(253,247,236,0.85)',
    border: '1px solid rgba(90,60,40,0.3)',
    padding: '6px 10px',
    fontSize: 11,
    fontFamily: 'monospace',
    textAlign: 'right',
    backdropFilter: 'blur(4px)',
  },
  statRow: { display: 'flex', justifyContent: 'space-between', gap: 12, minWidth: 110, letterSpacing: 1 },
  hint: {
    position: 'absolute',
    top: 'calc(env(safe-area-inset-top, 0px) + 72px)',
    left: 16,
    fontSize: 10,
    letterSpacing: 2,
    fontFamily: 'monospace',
    color: 'rgba(60,40,30,0.55)',
    pointerEvents: 'none',
  },
  tab: {
    position: 'absolute',
    bottom: 'calc(env(safe-area-inset-bottom, 0px) + 14px)',
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#3a2a4a',
    color: '#fdf7ec',
    border: 'none',
    padding: '8px 18px',
    fontFamily: 'monospace',
    fontSize: 11,
    letterSpacing: 2,
    cursor: 'pointer',
    zIndex: 5,
  },
  panel: {
    position: 'absolute',
    left: 12, right: 12,
    bottom: 'calc(env(safe-area-inset-bottom, 0px) + 56px)',
    background: 'rgba(253,247,236,0.96)',
    border: '1px solid rgba(90,60,40,0.4)',
    padding: '14px',
    boxShadow: '0 -10px 30px rgba(90,60,40,0.15)',
    backdropFilter: 'blur(6px)',
    maxHeight: '60vh',
    overflowY: 'auto',
    fontFamily: 'monospace',
  },
  sectionLabel: { fontSize: 10, letterSpacing: 3, opacity: 0.55, marginBottom: 6 },
  shapeRow: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 14 },
  modeRow: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 14 },
  shapeBtn: {
    background: 'transparent',
    border: '1px solid rgba(90,60,40,0.4)',
    color: '#3a2a1e',
    padding: '8px 0',
    fontFamily: 'monospace',
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    cursor: 'pointer',
  },
  shapeBtnActive: { background: '#3a2a4a', color: '#fdf7ec', borderColor: '#3a2a4a' },
  sliderRow: { marginBottom: 10 },
  sliderLabel: { display: 'block', fontSize: 10, letterSpacing: 2, marginBottom: 2, opacity: 0.85 },
  slider: { width: '100%' },
  btnRow: { display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' },
  primaryBtn: {
    flex: 1, minWidth: 90,
    background: '#3a2a4a', color: '#fdf7ec', border: 'none',
    padding: '12px', fontFamily: 'monospace', fontSize: 12, letterSpacing: 2, cursor: 'pointer',
  },
  secondaryBtn: {
    flex: 1, minWidth: 90,
    background: 'transparent', color: '#3a2a1e', border: '1px solid #3a2a4a',
    padding: '12px', fontFamily: 'monospace', fontSize: 12, letterSpacing: 2, cursor: 'pointer',
  },
  homeBtn: {
    flex: 1,
    background: '#fdf7ec',
    color: '#3a2a4a',
    border: '1px dashed #3a2a4a',
    padding: '10px',
    fontFamily: 'monospace',
    fontSize: 11,
    letterSpacing: 2,
    cursor: 'pointer',
  },
  homeOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(253,247,236,0.97)',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    padding: '20px 20px 40px 20px',
    paddingTop: 'calc(env(safe-area-inset-top, 0px) + 20px)',
    paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 40px)',
    zIndex: 100,
    backdropFilter: 'blur(8px)',
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
    touchAction: 'pan-y',
  },
  homeInner: {
    width: '100%',
    maxWidth: 380,
    background: '#fdf7ec',
    border: '1px solid rgba(90,60,40,0.4)',
    padding: 22,
    boxShadow: '0 10px 40px rgba(90,60,40,0.18)',
    marginTop: 'auto',
    marginBottom: 'auto',
  },
  homeTitleSmall: {
    fontSize: 10,
    letterSpacing: 4,
    opacity: 0.55,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  homeTitleBig: {
    fontSize: 28,
    fontStyle: 'italic',
    letterSpacing: 2,
    fontFamily: 'Georgia, "Iowan Old Style", serif',
    marginBottom: 8,
  },
  homeSub: {
    fontSize: 12,
    fontFamily: 'monospace',
    opacity: 0.7,
    marginBottom: 22,
    lineHeight: 1.5,
  },
  startBtn: {
    width: '100%',
    background: '#c96a55',
    color: '#fdf7ec',
    border: 'none',
    padding: '16px',
    fontFamily: 'monospace',
    fontSize: 14,
    letterSpacing: 4,
    cursor: 'pointer',
    marginTop: 14,
  },
};
