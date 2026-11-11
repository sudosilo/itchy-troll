import * as THREE from 'three';

// World scale: 1 unit = 1 foot. A crate is a 2 ft cube.
export const CARGO = 2;
const HALF = CARGO / 2;
const MAST_H = 60;
const JIB_LEN = 30;
const TROLLEY_Y = 1.8;
const ANCHOR_Y = 1 + MAST_H + TROLLEY_Y;
const HOOK_HALF = 0.4;
const STEP = 1 / 60;
export const ROUND_SECONDS = 180;
const CRATE_LB = 1100;

const TRUCK = { x: 0, z: 20 };
const BED = { cx: TRUCK.x - 1, cz: TRUCK.z, hx: 2, hz: 1.4, top: 1.25 };
const CABB = {
  minX: TRUCK.x + 1.25, maxX: TRUCK.x + 3.75,
  minY: 0.5, maxY: 2.7,
  minZ: TRUCK.z - 1.25, maxZ: TRUCK.z + 1.25
};
const SPAWN = { x: BED.cx, y: BED.top + HALF, z: BED.cz };
const TRUCK_RESPAWN = 3;
const SMASH_TIME = 0.35;

// Crate physics, tuned at 60 steps per second.
const G = 22;
const AIR_DRAG = 0.995;
const BOUNCE = 0.35;
const FLOOR_FRICTION = 0.7;
const GROUND_FRICTION = 0.88;
const SETTLE_VY = 0.8;
const SETTLE_H = 0.3;
const GRAB_RANGE = 4.5;
const GRAB_DEBOUNCE = 0.3;

// Scoring.
export const RULES = {
  perFoot: 100,
  perfect: 150,
  great: 75,
  ok: 25,
  comboStep: 50,
  smash: 100,
  fall: 25,
  perfectOffset: 0.25,
  greatOffset: 0.6
};

const COLORS = [0xd9713a, 0x3aa86b, 0x6a6fd0, 0xd3a03a, 0xb04fb0, 0x4a9fd0];

const noop = () => {};

function canvasTexture(size, draw) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function latticeTexture(rx, ry) {
  const t = canvasTexture(64, (g, s) => {
    g.fillStyle = '#b98a17';
    g.fillRect(0, 0, s, s);
    g.strokeStyle = '#ffd23f';
    g.lineWidth = 10;
    g.strokeRect(0, 0, s, s);
    g.lineWidth = 6;
    g.beginPath();
    g.moveTo(0, 0); g.lineTo(s, s);
    g.moveTo(s, 0); g.lineTo(0, s);
    g.stroke();
  });
  t.repeat.set(rx, ry);
  return t;
}

function crateTexture() {
  return canvasTexture(128, (g, s) => {
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, s, s);
    g.strokeStyle = 'rgba(0,0,0,0.10)';
    g.lineWidth = 2;
    for (let i = 1; i < 5; i++) {
      g.beginPath();
      g.moveTo(0, (s / 5) * i); g.lineTo(s, (s / 5) * i);
      g.stroke();
    }
    g.strokeStyle = 'rgba(0,0,0,0.16)';
    g.lineWidth = 9;
    g.beginPath();
    g.moveTo(10, 10); g.lineTo(s - 10, s - 10);
    g.stroke();
    g.strokeStyle = 'rgba(0,0,0,0.34)';
    g.lineWidth = 12;
    g.strokeRect(6, 6, s - 12, s - 12);
  });
}

function windowTexture() {
  return canvasTexture(64, (g, s) => {
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, s, s);
    g.fillStyle = 'rgba(60,100,140,0.16)';
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) g.fillRect(4 + x * 16, 5 + y * 16, 9, 9);
    }
  });
}

export function createGame(opts) {
  const mount = opts.mount || null;
  const visual = !!mount;
  const mode = opts.mode || 'timed';
  const onHud = opts.onHud || noop;
  const onEvent = opts.onEvent || noop;
  const rand = opts.random || Math.random;

  let trim = Object.assign({ slew: 0.5, trolley: 4, hoist: 5 }, opts.trim || {});
  let view = opts.view || 'follow';
  let freeWindMph = opts.freeWind == null ? 8 : opts.freeWind;
  let paused = false;
  let disposed = false;

  const input = { slewL: false, slewR: false, trolleyIn: false, trolleyOut: false, hoistUp: false, hoistDn: false };
  let grabRequested = false;

  // ---------- scene ----------
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xcfe6f5);
  scene.fog = new THREE.Fog(0xcfe6f5, 70, 250);

  const camera = new THREE.PerspectiveCamera(60, 1, 0.3, 600);
  let renderer = null;
  if (visual) {
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.touchAction = 'none';
  }

  scene.add(new THREE.HemisphereLight(0xffffff, 0xd8cfa6, 0.95));
  const sun = new THREE.DirectionalLight(0xffffff, 1.5);
  sun.position.set(40, 80, 30);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -48;
  sun.shadow.camera.right = 48;
  sun.shadow.camera.top = 48;
  sun.shadow.camera.bottom = -48;
  sun.shadow.camera.near = 10;
  sun.shadow.camera.far = 220;
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.04;
  scene.add(sun);

  const lam = (o) => new THREE.MeshLambertMaterial(o);
  function mesh(geo, mat, cast, receive) {
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = !!cast;
    m.receiveShadow = !!receive;
    return m;
  }

  const ground = mesh(new THREE.PlaneGeometry(700, 700), lam({ color: 0xd9d0a0 }), false, true);
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  const pad = mesh(new THREE.CircleGeometry(32, 48), lam({ color: 0xe6e3d6 }), false, true);
  pad.rotation.x = -Math.PI / 2;
  pad.position.y = 0.01;
  scene.add(pad);

  const grid = new THREE.GridHelper(60, 12, 0x8d8a70, 0xb0ad96);
  grid.position.y = 0.03;
  scene.add(grid);

  // traffic cones for scale
  {
    const orange = lam({ color: 0xff6622 });
    const white = lam({ color: 0xf2f2f2 });
    const black = lam({ color: 0x222222 });
    const bodyG = new THREE.ConeGeometry(0.3, 1, 12);
    const stripeG = new THREE.ConeGeometry(0.22, 0.15, 12);
    const baseG = new THREE.BoxGeometry(0.6, 0.08, 0.6);
    [[10, 20], [-10, 20], [20, 20], [-20, 20], [25, 0], [25, -15], [-25, -10],
      [0, -22], [-15, -22], [15, -22], [-22, 22], [8, -12], [-8, 12]].forEach(([x, z]) => {
      const c = new THREE.Group();
      const b = mesh(bodyG, orange, true); b.position.y = 0.55; c.add(b);
      const s = mesh(stripeG, white); s.position.y = 0.65; c.add(s);
      const f = mesh(baseG, black); f.position.y = 0.04; c.add(f);
      c.position.set(x, 0, z);
      scene.add(c);
    });
  }

  // backdrop buildings, outside the working radius
  if (visual) {
    const tints = [0xe8d9c4, 0xd4dde6, 0xe6cdbf, 0xcfdccb, 0xe3e0d2, 0xd9cfe0];
    const spots = [[120, 25, 22, 24], [108, 78, 30, 20], [50, 126, 18, 30], [-38, 130, 34, 26], [-112, 78, 24, 22],
      [-130, 0, 38, 28], [-114, -72, 20, 24], [-42, -126, 30, 30], [48, -122, 24, 22], [120, -56, 36, 26],
      [170, -14, 52, 32], [-166, 112, 48, 36], [14, 180, 44, 32], [-14, -180, 56, 32]];
    spots.forEach(([x, z, h, w], i) => {
      const tex = windowTexture();
      tex.repeat.set(Math.round(w / 8), Math.round(h / 8));
      const b = mesh(new THREE.BoxGeometry(w, h, w), lam({ color: tints[i % tints.length], map: tex }));
      b.position.set(x, h / 2, z);
      scene.add(b);
    });
  }

  // clouds drift with the wind
  const clouds = [];
  if (visual) {
    const cm = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false, transparent: true, opacity: 0.9 });
    const cg = new THREE.SphereGeometry(1, 10, 8);
    for (let i = 0; i < 9; i++) {
      const g = new THREE.Group();
      for (let j = 0; j < 4; j++) {
        const p = new THREE.Mesh(cg, cm);
        p.scale.set(14 + rand() * 12, 4 + rand() * 3, 9 + rand() * 7);
        p.position.set((j - 1.5) * 13, rand() * 3, rand() * 8 - 4);
        g.add(p);
      }
      const a = rand() * Math.PI * 2;
      const r = 120 + rand() * 140;
      g.position.set(Math.cos(a) * r, 95 + rand() * 50, Math.sin(a) * r);
      scene.add(g);
      clouds.push(g);
    }
  }

  // ---------- crane ----------
  const crane = new THREE.Group();
  scene.add(crane);
  const yellow = lam({ color: 0xffcc33 });
  const steel = lam({ color: 0x3a3f45 });

  const base = mesh(new THREE.BoxGeometry(4, 1, 4), lam({ color: 0x555a60 }), true, true);
  base.position.y = 0.5;
  crane.add(base);

  const mastMat = visual ? lam({ color: 0xffffff, map: latticeTexture(1, MAST_H / 2) }) : yellow;
  const mast = mesh(new THREE.BoxGeometry(2, MAST_H, 2), mastMat, true);
  mast.position.y = 1 + MAST_H / 2;
  crane.add(mast);

  const slewing = new THREE.Group();
  slewing.position.y = 1 + MAST_H;
  crane.add(slewing);

  const turntable = mesh(new THREE.CylinderGeometry(1.7, 1.7, 0.6, 20), steel, true);
  turntable.position.y = 1.7;
  slewing.add(turntable);

  // Operator cab. It hangs below the jib at the jib root, in front of the mast.
  // Mast face is at x = 1. Cab center at x = 2.2 leaves a small gap to the mast.
  // Jib underside is at local y = 2. Cab top is at y = 1.
  {
    const cabW = 2, cabH = 2, cabD = 2, thk = 0.15;
    const cab = new THREE.Group();
    cab.position.set(2.2, 0, 0);
    slewing.add(cab);
    const frame = lam({ color: 0x2266aa });
    const glass = new THREE.MeshLambertMaterial({ color: 0x88ccee, transparent: true, opacity: 0.22, side: THREE.DoubleSide });
    const postG = new THREE.BoxGeometry(thk, cabH, thk);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
      const p = mesh(postG, frame, true);
      p.position.set(sx * (cabW / 2 - thk / 2), 0, sz * (cabD / 2 - thk / 2));
      cab.add(p);
    });
    const railX = new THREE.BoxGeometry(cabW, thk, thk);
    const railZ = new THREE.BoxGeometry(thk, thk, cabD);
    [-1, 1].forEach((s) => {
      const a = mesh(railX, frame); a.position.set(0, cabH / 2 - thk / 2, s * (cabD / 2 - thk / 2)); cab.add(a);
      const b = mesh(railZ, frame); b.position.set(s * (cabW / 2 - thk / 2), cabH / 2 - thk / 2, 0); cab.add(b);
      // no bottom rail on the jib side, so the view down to the load stays open
      if (s < 0) { const c = mesh(railZ, frame); c.position.set(s * (cabW / 2 - thk / 2), -cabH / 2 + thk / 2, 0); cab.add(c); }
    });
    const back = mesh(railX, frame); back.position.set(0, -cabH / 2 + thk / 2, -(cabD / 2 - thk / 2)); cab.add(back);
    const roof = mesh(new THREE.BoxGeometry(cabW, thk, cabD), frame, true); roof.position.y = cabH / 2; cab.add(roof);
    const hanger = mesh(new THREE.BoxGeometry(0.3, 1, 0.3), frame); hanger.position.y = cabH / 2 + 0.5; cab.add(hanger);
    const gF = new THREE.Mesh(new THREE.PlaneGeometry(cabW, cabH), glass); gF.position.z = cabD / 2; cab.add(gF);
    const gB = new THREE.Mesh(new THREE.PlaneGeometry(cabW, cabH), glass); gB.position.z = -cabD / 2; cab.add(gB);
    const gL = new THREE.Mesh(new THREE.PlaneGeometry(cabD, cabH), glass); gL.position.x = -cabW / 2; gL.rotation.y = Math.PI / 2; cab.add(gL);
    const gR = new THREE.Mesh(new THREE.PlaneGeometry(cabD, cabH), glass); gR.position.x = cabW / 2; gR.rotation.y = Math.PI / 2; cab.add(gR);
    const gD = new THREE.Mesh(new THREE.PlaneGeometry(cabW, cabD), glass); gD.position.y = -cabH / 2; gD.rotation.x = Math.PI / 2; cab.add(gD);
  }

  const jibMat = visual ? lam({ color: 0xffffff, map: latticeTexture(JIB_LEN, 1) }) : yellow;
  const jib = mesh(new THREE.BoxGeometry(JIB_LEN, 1, 1), jibMat, true);
  jib.position.set(JIB_LEN / 2 - 2, 2.5, 0);
  slewing.add(jib);

  const cjMat = visual ? lam({ color: 0xffffff, map: latticeTexture(8, 1) }) : yellow;
  const counterJib = mesh(new THREE.BoxGeometry(8, 1, 1), cjMat, true);
  counterJib.position.set(-6, 2.5, 0);
  slewing.add(counterJib);

  const counterweight = mesh(new THREE.BoxGeometry(3, 2, 2), lam({ color: 0x74777c }), true);
  counterweight.position.set(-8, 2, 0);
  slewing.add(counterweight);

  // tower peak with tie bars to the jib and counter jib
  {
    const peakH = 7;
    const peak = mesh(new THREE.CylinderGeometry(0.15, 0.7, peakH, 4), yellow, true);
    peak.position.set(0, 3 + peakH / 2, 0);
    slewing.add(peak);
    const top = new THREE.Vector3(0, 3 + peakH, 0);
    const tie = (to) => {
      const d = new THREE.Vector3().subVectors(to, top);
      const bar = mesh(new THREE.CylinderGeometry(0.07, 0.07, d.length(), 5), steel);
      bar.position.copy(top).addScaledVector(d, 0.5);
      bar.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
      slewing.add(bar);
    };
    tie(new THREE.Vector3(19, 3, 0));
    tie(new THREE.Vector3(-9.5, 3, 0));
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff3b30 }));
    lamp.position.copy(top).y += 0.25;
    slewing.add(lamp);
  }

  const trolley = mesh(new THREE.BoxGeometry(1.5, 0.8, 1.5), steel, true);
  slewing.add(trolley);

  const CABLE_SEGS = 32;
  const cablePos = new Float32Array((CABLE_SEGS + 1) * 3);
  const cableGeo = new THREE.BufferGeometry();
  cableGeo.setAttribute('position', new THREE.BufferAttribute(cablePos, 3));
  const cable = new THREE.Line(cableGeo, new THREE.LineBasicMaterial({ color: 0x1c1c1c }));
  cable.frustumCulled = false;
  scene.add(cable);

  const hook = new THREE.Group();
  {
    const block = mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), lam({ color: 0x24272b }), true);
    hook.add(block);
    const band = mesh(new THREE.BoxGeometry(0.84, 0.22, 0.84), yellow);
    band.position.y = 0.1;
    hook.add(band);
  }
  scene.add(hook);

  // ground marker under the hook, a landing outline for the carried crate, and a plumb line
  const markerMat = new THREE.MeshBasicMaterial({ color: 0xff3333, side: THREE.DoubleSide, transparent: true, opacity: 0.9, depthWrite: false });
  const marker = new THREE.Mesh(new THREE.RingGeometry(1.25, 1.5, 28), markerMat);
  marker.rotation.x = -Math.PI / 2;
  marker.renderOrder = 2;
  scene.add(marker);

  const ghostMat = new THREE.LineBasicMaterial({ color: 0xffa000 });
  const ghost = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-HALF, 0, -HALF), new THREE.Vector3(HALF, 0, -HALF),
      new THREE.Vector3(HALF, 0, HALF), new THREE.Vector3(-HALF, 0, HALF)
    ]),
    ghostMat
  );
  ghost.visible = false;
  scene.add(ghost);
  const ghostFill = new THREE.Mesh(
    new THREE.PlaneGeometry(CARGO, CARGO),
    new THREE.MeshBasicMaterial({ color: 0xffa000, transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide })
  );
  ghostFill.rotation.x = -Math.PI / 2;
  ghostFill.visible = false;
  scene.add(ghostFill);

  const plumbPos = new Float32Array(6);
  const plumbGeo = new THREE.BufferGeometry();
  plumbGeo.setAttribute('position', new THREE.BufferAttribute(plumbPos, 3));
  const plumb = new THREE.Line(plumbGeo, new THREE.LineDashedMaterial({ color: 0x555555, dashSize: 0.5, gapSize: 0.5, transparent: true, opacity: 0.6 }));
  plumb.frustumCulled = false;
  scene.add(plumb);

  // ---------- truck ----------
  {
    const truck = new THREE.Group();
    truck.position.set(TRUCK.x, 0, TRUCK.z);
    scene.add(truck);
    const cabM = mesh(new THREE.BoxGeometry(2.5, 2.2, 2.5), lam({ color: 0x2f6fb5 }), true, true);
    cabM.position.set(2.5, 1.6, 0);
    truck.add(cabM);
    const glassM = lam({ color: 0xbfe3f5 });
    const wind1 = mesh(new THREE.BoxGeometry(0.06, 0.8, 2.1), glassM); wind1.position.set(3.76, 2.05, 0); truck.add(wind1);
    const sideA = mesh(new THREE.BoxGeometry(1.3, 0.8, 0.06), glassM); sideA.position.set(2.8, 2.05, 1.26); truck.add(sideA);
    const sideB = sideA.clone(); sideB.position.z = -1.26; truck.add(sideB);
    const bumper = mesh(new THREE.BoxGeometry(0.2, 0.35, 2.6), lam({ color: 0x33373c })); bumper.position.set(3.8, 0.7, 0); truck.add(bumper);
    const bed = mesh(new THREE.BoxGeometry(4, 0.3, 2.8), lam({ color: 0x6d7074 }), true, true);
    bed.position.set(-1, 1.1, 0);
    truck.add(bed);
    const frameM = mesh(new THREE.BoxGeometry(5.6, 0.3, 1.2), lam({ color: 0x3a3d41 }), true); frameM.position.set(-0.2, 0.8, 0); truck.add(frameM);
    const wheelG = new THREE.CylinderGeometry(0.5, 0.5, 0.4, 16);
    const wheelM = lam({ color: 0x1e1e1e });
    [[2.5, 0.5, 1.4], [2.5, 0.5, -1.4], [-1.5, 0.5, 1.4], [-1.5, 0.5, -1.4]].forEach(([x, y, z]) => {
      const w = mesh(wheelG, wheelM, true);
      w.rotation.x = Math.PI / 2;
      w.position.set(x, y, z);
      truck.add(w);
    });
  }

  // wind sock near the truck
  const sock = new THREE.Group();
  {
    const pole = mesh(new THREE.CylinderGeometry(0.08, 0.08, 7, 6), steel, true);
    pole.position.set(-8, 3.5, 25);
    scene.add(pole);
    sock.position.set(-8, 6.9, 25);
    scene.add(sock);
    const cone = mesh(new THREE.ConeGeometry(0.55, 3, 10, 1, true), new THREE.MeshLambertMaterial({ color: 0xff6a1a, side: THREE.DoubleSide }), true);
    cone.rotation.z = Math.PI / 2;
    cone.position.x = 1.5;
    sock.add(cone);
  }

  // ---------- crates ----------
  const boxes = [];
  const falling = [];
  const smashing = [];
  const crateGeo = new THREE.BoxGeometry(CARGO, CARGO, CARGO);
  const crateTex = visual ? crateTexture() : null;
  let colorIdx = 0;

  function spawnCrate() {
    const color = COLORS[colorIdx % COLORS.length];
    colorIdx++;
    const m = mesh(crateGeo, lam({ color, map: crateTex }), true, true);
    m.position.set(SPAWN.x, SPAWN.y, SPAWN.z);
    m.userData = {
      weight: CRATE_LB, attached: false, onTruck: true, falling: false, smashing: false,
      dropped: false, clear: true, vx: 0, vy: 0, vz: 0, born: sim.time, smashStart: 0
    };
    scene.add(m);
    boxes.push(m);
    emit({ type: 'spawn' });
    return m;
  }

  function startFalling(c) {
    if (!c.userData.falling) {
      c.userData.falling = true;
      falling.push(c);
    }
  }
  function stopFalling(c) {
    if (c.userData.falling) {
      c.userData.falling = false;
      const i = falling.indexOf(c);
      if (i !== -1) falling.splice(i, 1);
    }
  }

  // ---------- simulation state ----------
  const sim = {
    time: 0,
    slew: -1.2, trolley: 16, cable: 50,
    slewV: 0, trolleyV: 0, hoistV: 0,
    trolleyMin: 3, trolleyMax: JIB_LEN - 3,
    cableMin: 2, cableMax: 70,
    hookX: 0, hookY: ANCHOR_Y - 50, hookZ: 0, hookVX: 0, hookVZ: 0,
    slack: 0,
    pendulum: 156, damping: 0.985,
    carrying: null,
    carryOffX: 0, carryOffY: 0, carryOffZ: 0,
    lastGrab: -10,
    truckEmptySince: null,
    windMph: 0, windAngle: rand() * Math.PI * 2, windVX: 0, windVZ: 0,
    windP1: rand() * 6, windP2: rand() * 6, windP3: rand() * 6,
    canGrab: null,
    surfaceTop: 0
  };
  sim.hookX = Math.cos(sim.slew) * sim.trolley;
  sim.hookZ = -Math.sin(sim.slew) * sim.trolley;

  const round = {
    phase: mode === 'timed' ? 'countdown' : (mode === 'attract' ? 'attract' : 'playing'),
    countdown: 3.2,
    countShown: 4,
    timeLeft: ROUND_SECONDS,
    played: 0,
    settleFor: 0,
    quiet: 0,
    lastTick: 11,
    heightFt: 0,
    bonus: 0,
    penalty: 0,
    combo: 0,
    bestCombo: 0,
    perfects: 0,
    greats: 0,
    placed: 0,
    smashed: 0,
    fallen: 0
  };

  const events = [];
  function emit(e) { events.push(e); }
  const scoring = () => round.phase === 'playing' && mode === 'timed';

  function liveScore() {
    return Math.max(0, Math.round(round.heightFt * RULES.perFoot) + round.bonus - round.penalty);
  }

  // ---------- support queries ----------
  // Center height a crate would rest at for a given x,z. Only surfaces at or
  // below maxRest count, so a crate never pops up onto something beside it.
  function supportAt(x, z, self, maxRest) {
    let y = HALF, box = null, kind = 'ground';
    if (Math.abs(x - BED.cx) < BED.hx + 0.5 && Math.abs(z - BED.cz) < BED.hz + 0.5) {
      const r = BED.top + HALF;
      if (r <= maxRest) { y = r; kind = 'bed'; }
    }
    for (let i = 0; i < boxes.length; i++) {
      const o = boxes[i];
      if (o === self) continue;
      const u = o.userData;
      if (u.attached || u.smashing || u.falling) continue;
      if (Math.abs(o.position.x - x) < CARGO && Math.abs(o.position.z - z) < CARGO) {
        const r = o.position.y + CARGO;
        if (r > y && r <= maxRest) { y = r; box = o; kind = 'box'; }
      }
    }
    return { y, box, kind };
  }

  // Chain of crates under a resting crate, top first. Stops at ground, bed or truck crate.
  function chainBelow(top) {
    const out = [top];
    let cur = top;
    while (out.length < 80) {
      const s = supportAt(cur.position.x, cur.position.z, cur, cur.position.y + 0.3);
      if (!s.box || Math.abs(s.y - cur.position.y) > 0.3) {
        out.rooted = s.kind;
        break;
      }
      if (s.box.userData.onTruck) { out.rooted = 'truck'; break; }
      out.push(s.box);
      cur = s.box;
    }
    return out;
  }

  function dislodge(c, vx, vy, vz, penalize) {
    const u = c.userData;
    if (!u.falling) {
      if (penalize && scoring() && !u.dropped && c.position.y > HALF + 0.05) {
        round.fallen++;
        round.penalty += RULES.fall;
        round.combo = 0;
        emit({ type: 'fall', points: -RULES.fall });
      }
      startFalling(c);
    }
    u.vx = vx; u.vy = vy; u.vz = vz;
  }

  function smashCrate(c) {
    const u = c.userData;
    if (u.smashing) return;
    u.smashing = true;
    u.smashStart = sim.time;
    c.material = c.material.clone();
    c.material.color.setHex(0xff3322);
    smashing.push(c);
    if (sim.carrying === c) {
      u.attached = false;
      sim.carrying = null;
    }
    stopFalling(c);
    if (scoring()) {
      round.smashed++;
      round.penalty += RULES.smash;
      round.combo = 0;
    }
    emit({ type: 'smash', points: scoring() ? -RULES.smash : 0 });
  }

  function overlapsCab(c) {
    const p = c.position;
    return (p.x + HALF) > CABB.minX && (p.x - HALF) < CABB.maxX &&
      (p.y + HALF) > CABB.minY && (p.y - HALF) < CABB.maxY &&
      (p.z + HALF) > CABB.minZ && (p.z - HALF) < CABB.maxZ;
  }
  function hitsBedSide(c) {
    const p = c.position;
    if (p.y - HALF > BED.top - 0.15) return false;
    return (BED.hx + HALF - Math.abs(p.x - BED.cx)) > 0.1 && (BED.hz + HALF - Math.abs(p.z - BED.cz)) > 0.1;
  }

  // ---------- grab and drop ----------
  function findGrabTarget() {
    let best = null, bestD = GRAB_RANGE;
    for (let i = 0; i < boxes.length; i++) {
      const c = boxes[i];
      const u = c.userData;
      if (u.attached || u.falling || u.smashing) continue;
      const dx = c.position.x - sim.hookX;
      const dy = c.position.y - sim.hookY;
      const dz = c.position.z - sim.hookZ;
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (d < bestD) { best = c; bestD = d; }
    }
    return best;
  }

  function grabOrDrop() {
    if (sim.time - sim.lastGrab < GRAB_DEBOUNCE) return;
    if (round.phase !== 'playing') return;
    sim.lastGrab = sim.time;
    if (sim.carrying) {
      const c = sim.carrying;
      const u = c.userData;
      u.attached = false;
      u.dropped = true;
      u.vx = sim.hookVX; u.vy = 0; u.vz = sim.hookVZ;
      sim.carrying = null;
      startFalling(c);
      emit({ type: 'drop' });
    } else {
      const c = findGrabTarget();
      if (!c) { emit({ type: 'nograb' }); return; }
      const u = c.userData;
      u.attached = true;
      u.clear = !u.onTruck;
      u.onTruck = false;
      u.dropped = false;
      sim.carrying = c;
      sim.carryOffX = c.position.x - sim.hookX;
      sim.carryOffY = c.position.y - (sim.hookY - HOOK_HALF - HALF);
      sim.carryOffZ = c.position.z - sim.hookZ;
      emit({ type: 'grab' });
    }
  }

  // ---------- placement scoring ----------
  function onSettle(c, s) {
    const u = c.userData;
    const wasDropped = u.dropped;
    u.dropped = false;
    if (!s.box) {
      if (wasDropped && scoring()) emit({ type: 'base' });
      return;
    }
    const chain = chainBelow(c);
    // lean check: the crates above any crate must keep their center of mass over it
    for (let i = chain.length - 1; i >= 1; i--) {
      let mx = 0, mz = 0;
      for (let k = 0; k < i; k++) { mx += chain[k].position.x; mz += chain[k].position.z; }
      mx /= i; mz /= i;
      const ox = mx - chain[i].position.x;
      const oz = mz - chain[i].position.z;
      const d = Math.sqrt(ox * ox + oz * oz);
      if (d > HALF) {
        const nx = ox / d, nz = oz / d;
        for (let k = 0; k < i; k++) {
          const b = chain[k];
          if (b === c) { b.userData.dropped = false; }
          dislodge(b, nx * (1.5 + (i - k) * 0.4), 0.6, nz * (1.5 + (i - k) * 0.4), b !== c);
          b.position.y += 0.05;
        }
        round.combo = 0;
        emit({ type: 'collapse', count: i });
        return;
      }
    }
    if (!wasDropped || !scoring() || chain.rooted === 'truck' || chain.rooted === 'bed') return;
    const ox = c.position.x - s.box.position.x;
    const oz = c.position.z - s.box.position.z;
    const off = Math.sqrt(ox * ox + oz * oz);
    let quality, points;
    if (off <= RULES.perfectOffset) {
      quality = 'perfect';
      points = RULES.perfect + round.combo * RULES.comboStep;
      round.combo++;
      round.perfects++;
      if (round.combo > round.bestCombo) round.bestCombo = round.combo;
    } else if (off <= RULES.greatOffset) {
      quality = 'great';
      points = RULES.great;
      round.greats++;
      round.combo = 0;
    } else {
      quality = 'ok';
      points = RULES.ok;
      round.combo = 0;
    }
    round.placed++;
    round.bonus += points;
    emit({ type: 'place', quality, points, combo: round.combo, level: chain.length, offset: off });
  }

  // ---------- one fixed physics step ----------
  function step() {
    sim.time += STEP;
    const playing = round.phase === 'playing';

    // wind
    {
      const t = round.played;
      let baseMph;
      if (mode === 'timed') baseMph = 4 + 12 * Math.min(1, t / ROUND_SECONDS);
      else if (mode === 'attract') baseMph = 6;
      else baseMph = freeWindMph;
      const gust = baseMph * 0.3 * Math.sin(0.9 * sim.time + sim.windP1) * Math.sin(0.31 * sim.time + sim.windP2);
      sim.windMph = Math.max(0, baseMph + gust);
      const ang = sim.windAngle + 0.6 * Math.sin(0.045 * sim.time + sim.windP3);
      const fps = sim.windMph * 1.467;
      sim.windVX = Math.cos(ang) * fps;
      sim.windVZ = -Math.sin(ang) * fps;
    }

    // controls, eased so the machine ramps up and down
    {
      let ts = 0, tt = 0, th = 0;
      if (playing) {
        if (input.slewL) ts += trim.slew;
        if (input.slewR) ts -= trim.slew;
        if (input.trolleyOut) tt += trim.trolley;
        if (input.trolleyIn) tt -= trim.trolley;
        if (input.hoistDn) th += trim.hoist;
        if (input.hoistUp) th -= trim.hoist;
      } else if (round.phase === 'attract') {
        ts = 0.12;
      }
      // slow ramp up so a short tap is a small nudge, quick stop on release
      const ease = (v, target) => {
        const speedingUp = Math.abs(target) > Math.abs(v) && target * v >= 0;
        return v + (target - v) * Math.min(1, STEP * (speedingUp ? 3 : 16));
      };
      sim.slewV = ease(sim.slewV, ts);
      sim.trolleyV = ease(sim.trolleyV, tt);
      sim.hoistV = ease(sim.hoistV, th);
      sim.slew += sim.slewV * STEP;
      sim.trolley += sim.trolleyV * STEP;
      if (sim.trolley < sim.trolleyMin) { sim.trolley = sim.trolleyMin; sim.trolleyV = 0; }
      if (sim.trolley > sim.trolleyMax) { sim.trolley = sim.trolleyMax; sim.trolleyV = 0; }
      sim.cable += sim.hoistV * STEP;
      if (sim.cable < sim.cableMin) { sim.cable = sim.cableMin; sim.hoistV = 0; }
      if (sim.cable > sim.cableMax) { sim.cable = sim.cableMax; sim.hoistV = 0; }
    }

    if (grabRequested) { grabRequested = false; grabOrDrop(); }

    // hook pendulum
    const tx = Math.cos(sim.slew) * sim.trolley;
    const tz = -Math.sin(sim.slew) * sim.trolley;
    {
      const accel = sim.pendulum / Math.max(1, sim.cable);
      sim.hookVX += (tx - sim.hookX) * accel * STEP;
      sim.hookVZ += (tz - sim.hookZ) * accel * STEP;
      const w = sim.carrying ? 0.12 : 0.25;
      sim.hookVX += sim.windVX * w * STEP;
      sim.hookVZ += sim.windVZ * w * STEP;
      sim.hookVX *= sim.damping;
      sim.hookVZ *= sim.damping;
      sim.hookX += sim.hookVX * STEP;
      sim.hookZ += sim.hookVZ * STEP;
    }

    // hook height. It rests on the ground, the truck bed, or the top of a crate.
    {
      let restY;
      const prevBottom = sim.hookY - HOOK_HALF;
      if (sim.carrying) {
        const cy = sim.hookY - HOOK_HALF - HALF;
        const s = supportAt(sim.hookX, sim.hookZ, sim.carrying, cy + 0.3);
        restY = s.y + HALF + HOOK_HALF;
        sim.surfaceTop = s.y - HALF;
      } else {
        let top = 0;
        const reach = HALF + HOOK_HALF;
        if (Math.abs(sim.hookX - BED.cx) < BED.hx + HOOK_HALF && Math.abs(sim.hookZ - BED.cz) < BED.hz + HOOK_HALF &&
          prevBottom >= BED.top - 0.3) top = BED.top;
        for (let i = 0; i < boxes.length; i++) {
          const o = boxes[i];
          const u = o.userData;
          if (u.attached || u.smashing) continue;
          const dx = sim.hookX - o.position.x;
          const dz = sim.hookZ - o.position.z;
          const ox = reach - Math.abs(dx);
          const oz = reach - Math.abs(dz);
          if (ox <= 0 || oz <= 0) continue;
          const boxTop = o.position.y + HALF;
          if (prevBottom >= boxTop - 0.3) {
            if (boxTop > top) top = boxTop;
          } else if (!u.falling && sim.hookY + HOOK_HALF > o.position.y - HALF) {
            // the hook block bumps the side of a crate and stops
            if (ox < oz) {
              const sgn = dx >= 0 ? 1 : -1;
              sim.hookX += sgn * ox;
              if (sim.hookVX * sgn < 0) sim.hookVX *= -0.2;
            } else {
              const sgn = dz >= 0 ? 1 : -1;
              sim.hookZ += sgn * oz;
              if (sim.hookVZ * sgn < 0) sim.hookVZ *= -0.2;
            }
          }
        }
        restY = top + HOOK_HALF;
        sim.surfaceTop = top;
      }
      const freeY = ANCHOR_Y - sim.cable;
      if (freeY <= restY) {
        sim.hookY = restY;
        sim.slack = restY - freeY;
        if (sim.carrying && sim.slack > 0.15) {
          // the crate's weight is on the surface, so it stays put
          sim.hookVX = 0;
          sim.hookVZ = 0;
        } else {
          sim.hookVX *= 0.85;
          sim.hookVZ *= 0.85;
        }
      } else {
        sim.hookY = freeY;
        sim.slack = 0;
      }
    }

    if (sim.carrying) {
      sim.carryOffX *= 0.8; sim.carryOffY *= 0.8; sim.carryOffZ *= 0.8;
      sim.carrying.position.set(
        sim.hookX + sim.carryOffX,
        sim.hookY - HOOK_HALF - HALF + sim.carryOffY,
        sim.hookZ + sim.carryOffZ
      );
    }

    // falling, bouncing and sliding crates
    for (let i = falling.length - 1; i >= 0; i--) {
      const c = falling[i];
      const u = c.userData;
      const prevY = c.position.y;
      u.vy -= G * STEP;
      u.vx *= AIR_DRAG;
      u.vz *= AIR_DRAG;
      if (c.position.y > HALF + 0.1) {
        u.vx += sim.windVX * 0.08 * STEP;
        u.vz += sim.windVZ * 0.08 * STEP;
      }
      c.position.x += u.vx * STEP;
      c.position.y += u.vy * STEP;
      c.position.z += u.vz * STEP;

      const s = supportAt(c.position.x, c.position.z, c, Math.max(prevY, c.position.y) + 0.3);
      if (c.position.y > s.y) continue;
      const impact = -u.vy;
      c.position.y = s.y;

      if (s.box) {
        const ox = c.position.x - s.box.position.x;
        const oz = c.position.z - s.box.position.z;
        const off = Math.sqrt(ox * ox + oz * oz);
        if (off > HALF) {
          // more than half off the crate below, so it tips over the edge
          const len = Math.max(0.001, off);
          u.vx = (ox / len) * 2 + u.vx * 0.5;
          u.vz = (oz / len) * 2 + u.vz * 0.5;
          u.vy = 0.5;
          c.position.y = s.y + 0.05;
          if (u.dropped) {
            u.dropped = false;
            if (scoring()) { round.combo = 0; emit({ type: 'miss' }); }
          }
          continue;
        }
      }

      if (Math.abs(u.vy) < SETTLE_VY) {
        const h = Math.sqrt(u.vx * u.vx + u.vz * u.vz);
        if (h < SETTLE_H) {
          u.vx = 0; u.vy = 0; u.vz = 0;
          stopFalling(c);
          onSettle(c, s);
        } else {
          u.vy = 0;
          u.vx *= GROUND_FRICTION;
          u.vz *= GROUND_FRICTION;
        }
      } else {
        u.vy = -u.vy * BOUNCE;
        u.vx *= FLOOR_FRICTION;
        u.vz *= FLOOR_FRICTION;
        emit({ type: 'land', impact });
      }
    }

    // crate against crate, side to side
    {
      const hookSpeed = Math.sqrt(sim.hookVX * sim.hookVX + sim.hookVZ * sim.hookVZ);
      const pushSpeed = Math.max(6, hookSpeed * 1.2);
      for (let i = 0; i < boxes.length; i++) {
        const a = boxes[i];
        const ua = a.userData;
        if (ua.onTruck || ua.smashing) continue;
        for (let j = i + 1; j < boxes.length; j++) {
          const b = boxes[j];
          const ub = b.userData;
          if (ub.onTruck || ub.smashing) continue;
          if (ua.attached && ub.attached) continue;
          const anyAttached = ua.attached || ub.attached;
          if (!anyAttached && !ua.falling && !ub.falling) continue;
          if (Math.abs(a.position.y - b.position.y) >= CARGO - 0.1) continue;
          const size = anyAttached ? CARGO + 0.4 : CARGO;
          const ddx = b.position.x - a.position.x;
          const ddz = b.position.z - a.position.z;
          const ox = size - Math.abs(ddx);
          const oz = size - Math.abs(ddz);
          if (ox <= 0 || oz <= 0) continue;
          let px = 0, pz = 0;
          if (ox < oz) px = (ddx >= 0 ? 1 : -1) * ox;
          else pz = (ddz >= 0 ? 1 : -1) * oz;
          const len = Math.max(0.001, Math.abs(px) + Math.abs(pz));
          const nx = px / len, nz = pz / len;
          if (ua.attached) {
            b.position.x += px; b.position.z += pz;
            const kick = b.position.y < HALF + 0.05 ? 0 : 0.5;
            dislodge(b, nx * pushSpeed, kick, nz * pushSpeed, true);
            emit({ type: 'bump' });
          } else if (ub.attached) {
            a.position.x -= px; a.position.z -= pz;
            const kick = a.position.y < HALF + 0.05 ? 0 : 0.5;
            dislodge(a, -nx * pushSpeed, kick, -nz * pushSpeed, true);
            emit({ type: 'bump' });
          } else {
            a.position.x -= px * 0.5; a.position.z -= pz * 0.5;
            b.position.x += px * 0.5; b.position.z += pz * 0.5;
            const aVN = ua.vx * nx + ua.vz * nz;
            const bVN = ub.vx * nx + ub.vz * nz;
            const rel = bVN - aVN;
            let ax = ua.vx, az = ua.vz, bx = ub.vx, bz = ub.vz;
            if (rel < 0) {
              const imp = -rel * 1.7 * 0.5;
              ax -= imp * nx; az -= imp * nz;
              bx += imp * nx; bz += imp * nz;
            }
            if (!ua.falling) dislodge(a, ax, a.position.y < HALF + 0.05 ? 0 : 0.3, az, true);
            else { ua.vx = ax; ua.vz = az; }
            if (!ub.falling) dislodge(b, bx, b.position.y < HALF + 0.05 ? 0 : 0.3, bz, true);
            else { ub.vx = bx; ub.vz = bz; }
          }
        }
      }
    }

    // a resting crate that lost what was under it starts to fall
    for (let i = 0; i < boxes.length; i++) {
      const c = boxes[i];
      const u = c.userData;
      if (u.attached || u.onTruck || u.smashing || u.falling) continue;
      if (c.position.y <= HALF + 0.05) continue;
      const s = supportAt(c.position.x, c.position.z, c, c.position.y + 0.3);
      if (c.position.y > s.y + 0.1) {
        dislodge(c, (rand() - 0.5) * 0.3, 0, (rand() - 0.5) * 0.3, true);
      }
    }

    // anything that hits the truck is smashed
    for (let i = 0; i < boxes.length; i++) {
      const c = boxes[i];
      const u = c.userData;
      if (u.onTruck || u.smashing) continue;
      if (!u.clear) {
        // a crate lifted off the bed cannot be smashed until it has cleared the truck once
        const p = c.position;
        if (p.y - HALF > CABB.maxY + 0.2 || p.x + HALF < BED.cx - BED.hx || p.x - HALF > CABB.maxX ||
          Math.abs(p.z - TRUCK.z) > BED.hz + HALF) u.clear = true;
        continue;
      }
      if (overlapsCab(c) || hitsBedSide(c)) smashCrate(c);
    }
    for (let i = smashing.length - 1; i >= 0; i--) {
      const c = smashing[i];
      const t = (sim.time - c.userData.smashStart) / SMASH_TIME;
      if (t >= 1) {
        scene.remove(c);
        c.material.dispose();
        const k = boxes.indexOf(c);
        if (k !== -1) boxes.splice(k, 1);
        smashing.splice(i, 1);
      } else {
        const sc = Math.max(0.01, 1 - t);
        c.scale.set(sc, sc * 0.4, sc);
        c.position.y = Math.max(0.05, c.position.y - 0.1 * t);
      }
    }

    // the truck brings a new crate 3 seconds after the last one leaves
    if (round.phase === 'playing' || round.phase === 'countdown') {
      let has = false;
      for (let i = 0; i < boxes.length; i++) if (boxes[i].userData.onTruck) { has = true; break; }
      if (has) sim.truckEmptySince = null;
      else if (sim.truckEmptySince === null) sim.truckEmptySince = sim.time;
      else if (sim.time - sim.truckEmptySince >= TRUCK_RESPAWN) {
        let blocked = false;
        for (let i = 0; i < boxes.length; i++) {
          const c = boxes[i];
          const u = c.userData;
          if (u.smashing) { if (Math.abs(c.position.x - SPAWN.x) < CARGO && Math.abs(c.position.z - SPAWN.z) < CARGO) blocked = true; continue; }
          if (Math.abs(c.position.x - SPAWN.x) < CARGO && Math.abs(c.position.z - SPAWN.z) < CARGO &&
            Math.abs(c.position.y - SPAWN.y) < CARGO) {
            blocked = true;
            if (!u.attached) smashCrate(c);
          }
        }
        if (!blocked) { spawnCrate(); sim.truckEmptySince = null; }
      }
    }

    // tallest standing crate top, in feet
    {
      let top = 0;
      for (let i = 0; i < boxes.length; i++) {
        const c = boxes[i];
        const u = c.userData;
        if (u.onTruck || u.attached || u.falling || u.smashing) continue;
        const t = c.position.y + HALF;
        if (t > top) top = t;
      }
      round.heightFt = top;
    }

    sim.canGrab = (!sim.carrying && playing) ? findGrabTarget() : null;

    // round clock
    if (round.phase === 'countdown') {
      round.countdown -= STEP;
      const n = Math.ceil(round.countdown);
      if (n < round.countShown && n >= 1) { round.countShown = n; emit({ type: 'count', n }); }
      if (round.countdown <= 0) { round.phase = 'playing'; emit({ type: 'go' }); }
    } else if (round.phase === 'playing') {
      round.played += STEP;
      if (mode === 'timed') {
        round.timeLeft -= STEP;
        const sec = Math.ceil(round.timeLeft);
        if (sec <= 10 && sec < round.lastTick && sec >= 1) { round.lastTick = sec; emit({ type: 'tick', n: sec }); }
        if (round.timeLeft <= 0) {
          round.timeLeft = 0;
          round.phase = 'settling';
          if (sim.carrying) {
            const c = sim.carrying;
            c.userData.attached = false;
            c.userData.vx = sim.hookVX; c.userData.vy = 0; c.userData.vz = sim.hookVZ;
            sim.carrying = null;
            startFalling(c);
          }
          emit({ type: 'buzzer' });
        }
      }
    } else if (round.phase === 'settling') {
      round.settleFor += STEP;
      round.quiet = falling.length === 0 ? round.quiet + STEP : 0;
      if (round.quiet > 0.6 || round.settleFor > 5) {
        round.phase = 'done';
        const heightPts = Math.round(round.heightFt * RULES.perFoot);
        emit({
          type: 'roundEnd',
          result: {
            heightFt: round.heightFt,
            heightPts,
            bonus: round.bonus,
            penalty: round.penalty,
            perfects: round.perfects,
            greats: round.greats,
            placed: round.placed,
            smashed: round.smashed,
            fallen: round.fallen,
            bestCombo: round.bestCombo,
            score: Math.max(0, heightPts + round.bonus - round.penalty),
            durationMs: Math.round(round.played * 1000)
          }
        });
      }
    }
  }

  // ---------- camera ----------
  const cam = {
    yaw: 0, pitch: 0.52, dist: 26, orbitYaw: 0.7, orbitDist: 66,
    tx: sim.hookX, ty: 8, tz: sim.hookZ, dirA: 0, ready: false,
    px: 0, py: 0, pz: 0
  };
  const tmpV = new THREE.Vector3();

  function updateCamera(dt) {
    const k = cam.ready ? 1 - Math.exp(-dt * 5) : 1;
    if (view === 'cab') {
      const cx = Math.cos(sim.slew) * 2.2;
      const cz = -Math.sin(sim.slew) * 2.2;
      camera.position.set(cx, 1 + MAST_H + 0.6, cz);
      camera.lookAt(sim.hookX, sim.hookY, sim.hookZ);
    } else if (view === 'spotter') {
      camera.position.set(35, 4, 0);
      cam.tx += (sim.hookX - cam.tx) * k;
      cam.ty += (sim.hookY - cam.ty) * k;
      cam.tz += (sim.hookZ - cam.tz) * k;
      camera.lookAt(cam.tx, cam.ty, cam.tz);
    } else if (view === 'orbit' || round.phase === 'attract') {
      const attract = round.phase === 'attract';
      if (attract) cam.orbitYaw += dt * 0.07;
      const r = attract ? 84 : cam.orbitDist;
      camera.position.set(Math.cos(cam.orbitYaw) * r, 20 + r * 0.25, Math.sin(cam.orbitYaw) * r);
      camera.lookAt(0, attract ? 46 : 27, 0);
    } else {
      // follow: sits off the mast side of the load, turned a little so both
      // slew and trolley movement read clearly
      const gap = Math.max(0, sim.hookY - sim.surfaceTop);
      const wantY = Math.max(2.5, (sim.hookY + sim.surfaceTop) / 2);
      cam.tx += (sim.hookX - cam.tx) * k;
      cam.ty += (wantY - cam.ty) * k;
      cam.tz += (sim.hookZ - cam.tz) * k;
      const a = Math.atan2(-Math.sin(sim.slew), Math.cos(sim.slew));
      let da = a - cam.dirA;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      cam.dirA += da * k;
      const ang = cam.dirA + Math.PI + 0.6 + cam.yaw;
      const dist = cam.dist + gap * 0.55;
      const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
      const wx = cam.tx + Math.cos(ang) * dist * cp;
      const wy = cam.ty + dist * sp;
      const wz = cam.tz + Math.sin(ang) * dist * cp;
      if (!cam.ready) { cam.px = wx; cam.py = wy; cam.pz = wz; }
      cam.px += (wx - cam.px) * k; cam.py += (wy - cam.py) * k; cam.pz += (wz - cam.pz) * k;
      camera.position.set(cam.px, cam.py, cam.pz);
      camera.lookAt(cam.tx, cam.ty, cam.tz);
    }
    cam.ready = true;
  }

  // wind direction relative to the screen, degrees clockwise from up
  function windScreenDeg() {
    camera.getWorldDirection(tmpV);
    const fy = Math.abs(tmpV.y);
    let fx = tmpV.x, fz = tmpV.z;
    const e = camera.matrixWorld.elements;
    const ux = e[4], uz = e[6];
    fx = fx * (1 - fy) + ux * fy;
    fz = fz * (1 - fy) + uz * fy;
    const fl = Math.sqrt(fx * fx + fz * fz) || 1;
    fx /= fl; fz /= fl;
    const rx = -fz, rz = fx;
    const sx = sim.windVX * rx + sim.windVZ * rz;
    const sy = sim.windVX * fx + sim.windVZ * fz;
    return Math.atan2(sx, sy) * 180 / Math.PI;
  }

  // ---------- per frame visuals ----------
  let lastEmissive = null;
  function updateVisuals(dt) {
    slewing.rotation.y = sim.slew;
    trolley.position.set(sim.trolley, TROLLEY_Y, 0);
    const frac = (sim.trolley - sim.trolleyMin) / (sim.trolleyMax - sim.trolleyMin);
    counterweight.position.x = -2.6 - frac * 5.9;
    hook.position.set(sim.hookX, sim.hookY, sim.hookZ);

    const tx = Math.cos(sim.slew) * sim.trolley;
    const tz = -Math.sin(sim.slew) * sim.trolley;
    const hx = sim.hookX, hy = sim.hookY + HOOK_HALF, hz = sim.hookZ;
    let n = 0;
    const put = (x, y, z) => { cablePos[n++] = x; cablePos[n++] = y; cablePos[n++] = z; };
    if (sim.slack <= 0) {
      const load = sim.carrying ? 0.25 : 1;
      const d = Math.sqrt((hx - tx) ** 2 + (hy - ANCHOR_Y) ** 2 + (hz - tz) ** 2);
      const sag = 0.4 * load * Math.min(1, d / 10);
      for (let i = 0; i <= CABLE_SEGS; i++) {
        const t = i / CABLE_SEGS;
        put(tx + (hx - tx) * t, ANCHOR_Y + (hy - ANCHOR_Y) * t - sag * 4 * t * (1 - t), tz + (hz - tz) * t);
      }
    } else {
      const hang = Math.floor(CABLE_SEGS * 0.7);
      const pile = CABLE_SEGS - hang;
      const bow = Math.min(2.5, 0.6 + sim.slack * 0.25);
      for (let i = 0; i <= hang; i++) {
        const t = i / hang;
        put(tx + (hx - tx) * t, ANCHOR_Y + (hy - ANCHOR_Y) * t - bow * 4 * t * (1 - t) * 0.3, tz + (hz - tz) * t + bow * Math.sin(t * Math.PI) * 0.3);
      }
      const l = Math.sqrt(hx * hx + hz * hz) || 1;
      const dx = hx / l, dz = hz / l;
      // loose cable lies on whatever the hook is resting on
      const onGround = !sim.carrying && sim.surfaceTop < 0.01;
      const len = onGround ? Math.min(sim.slack, 8) : Math.min(sim.slack, 0.8);
      const lieY = sim.carrying ? hy : sim.surfaceTop;
      for (let i = 1; i <= pile; i++) {
        const t = i / pile;
        put(hx + dx * len * t, lieY + 0.05 + 0.05 * Math.sin(i * 1.7), hz + dz * len * t);
      }
    }
    cableGeo.attributes.position.needsUpdate = true;

    // marker, landing outline and plumb line
    const lift = 0.06;
    if (sim.carrying) {
      const cy = sim.hookY - HOOK_HALF - HALF;
      const s = supportAt(sim.hookX, sim.hookZ, sim.carrying, cy + 0.3);
      const topY = s.y - HALF + lift;
      marker.visible = false;
      ghost.visible = ghostFill.visible = true;
      ghost.position.set(sim.hookX, topY, sim.hookZ);
      ghostFill.position.set(sim.hookX, topY - 0.01, sim.hookZ);
      // once the crate is set down the outline widens into a colored rim around it
      const rim = sim.slack > 0 ? 1.14 : 1;
      ghost.scale.set(rim, 1, rim);
      ghostFill.scale.set(rim, rim, 1);
      let col = 0xffa000;
      if (s.box && !s.box.userData.onTruck) {
        const ox = sim.hookX - s.box.position.x, oz = sim.hookZ - s.box.position.z;
        const off = Math.sqrt(ox * ox + oz * oz);
        col = off <= RULES.perfectOffset ? 0x17b05b : (off <= RULES.greatOffset ? 0xd6c400 : (off <= HALF ? 0xff8a00 : 0xe5352b));
      }
      ghostMat.color.setHex(col);
      ghostFill.material.color.setHex(col);
      plumbPos[0] = sim.hookX; plumbPos[1] = cy - HALF; plumbPos[2] = sim.hookZ;
      plumbPos[3] = sim.hookX; plumbPos[4] = topY; plumbPos[5] = sim.hookZ;
    } else {
      marker.visible = round.phase !== 'attract';
      ghost.visible = ghostFill.visible = false;
      marker.position.set(sim.hookX, sim.surfaceTop + lift, sim.hookZ);
      markerMat.color.setHex(sim.canGrab ? 0x17b05b : 0xff3333);
      plumbPos[0] = sim.hookX; plumbPos[1] = sim.hookY - HOOK_HALF; plumbPos[2] = sim.hookZ;
      plumbPos[3] = sim.hookX; plumbPos[4] = sim.surfaceTop + lift; plumbPos[5] = sim.hookZ;
    }
    plumb.visible = round.phase !== 'attract';
    plumbGeo.attributes.position.needsUpdate = true;
    plumb.computeLineDistances();

    if (lastEmissive !== sim.canGrab) {
      if (lastEmissive && lastEmissive.material) lastEmissive.material.emissive.setHex(0x000000);
      if (sim.canGrab) sim.canGrab.material.emissive.setHex(0x3a3a12);
      lastEmissive = sim.canGrab;
    }

    // new crates pop in on the truck
    for (let i = 0; i < boxes.length; i++) {
      const c = boxes[i];
      const u = c.userData;
      if (u.smashing) continue;
      const age = sim.time - u.born;
      if (age < 0.25) { const s = 0.2 + 0.8 * (age / 0.25); c.scale.set(s, s, s); }
      else if (c.scale.x !== 1) c.scale.set(1, 1, 1);
    }

    // wind sock and clouds
    const wAng = Math.atan2(-sim.windVZ, sim.windVX);
    sock.rotation.y = wAng;
    sock.rotation.z = -Math.max(0, 1.1 - sim.windMph / 14) + Math.sin(sim.time * 7) * 0.04;
    for (let i = 0; i < clouds.length; i++) {
      const c = clouds[i];
      c.position.x += sim.windVX * 0.12 * dt;
      c.position.z += sim.windVZ * 0.12 * dt;
      const r2 = c.position.x * c.position.x + c.position.z * c.position.z;
      if (r2 > 290 * 290) { c.position.x *= -0.95; c.position.z *= -0.95; }
    }
  }

  // ---------- pointer camera control ----------
  const pointers = new Map();
  let pinch = 0;
  function pDown(e) {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try { renderer.domElement.setPointerCapture(e.pointerId); } catch (err) { /* not capturable */ }
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = Math.hypot(a.x - b.x, a.y - b.y);
    }
  }
  function pMove(e) {
    const p = pointers.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    if (pointers.size === 1) {
      if (view === 'orbit') cam.orbitYaw += dx * 0.008;
      else if (view === 'follow') {
        cam.yaw += dx * 0.008;
        cam.pitch = Math.min(1.35, Math.max(0.12, cam.pitch + dy * 0.006));
      }
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch > 0) zoom(pinch / d);
      pinch = d;
    }
  }
  function pUp(e) { pointers.delete(e.pointerId); pinch = 0; }
  function zoom(f) {
    if (view === 'orbit') cam.orbitDist = Math.min(110, Math.max(35, cam.orbitDist * f));
    else cam.dist = Math.min(60, Math.max(12, cam.dist * f));
  }
  function onWheel(e) { e.preventDefault(); zoom(e.deltaY > 0 ? 1.08 : 0.93); }

  function resize() {
    if (!visual) return;
    const w = mount.clientWidth || 1, h = mount.clientHeight || 1;
    camera.aspect = w / h;
    camera.fov = camera.aspect < 1 ? 74 : 58;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  if (visual) {
    const el = renderer.domElement;
    el.addEventListener('pointerdown', pDown);
    el.addEventListener('pointermove', pMove);
    el.addEventListener('pointerup', pUp);
    el.addEventListener('pointercancel', pUp);
    el.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('resize', resize);
    resize();
  }

  // ---------- main loop ----------
  let last = visual ? performance.now() : 0;
  let acc = 0;
  let raf = 0;
  let hudClock = 0;

  function hudSnapshot() {
    const tx = Math.cos(sim.slew) * sim.trolley;
    const tz = -Math.sin(sim.slew) * sim.trolley;
    let deg = Math.round(sim.slew * 180 / Math.PI) % 360;
    if (deg < 0) deg += 360;
    return {
      phase: round.phase,
      mode,
      slew: deg,
      trolley: sim.trolley,
      cable: sim.cable,
      swing: Math.hypot(tx - sim.hookX, tz - sim.hookZ),
      load: sim.carrying ? sim.carrying.userData.weight : 0,
      hookFt: Math.max(0, sim.hookY - HOOK_HALF),
      heightFt: round.heightFt,
      score: liveScore(),
      combo: round.combo,
      timeLeft: round.timeLeft,
      windMph: sim.windMph,
      windDeg: visual ? windScreenDeg() : 0,
      carrying: !!sim.carrying,
      canGrab: !!sim.canGrab,
      moving: Math.abs(sim.slewV) / 0.5 + Math.abs(sim.trolleyV) / 4 + Math.abs(sim.hoistV) / 5,
      crates: boxes.length
    };
  }

  function flush() {
    if (!events.length) return;
    const out = events.splice(0, events.length);
    for (let i = 0; i < out.length; i++) onEvent(out[i]);
  }

  function advance(dt) {
    if (!paused) {
      acc += Math.min(dt, 0.1);
      let n = 0;
      while (acc >= STEP && n < 6) { step(); acc -= STEP; n++; }
      if (n === 6) acc = 0;
    }
  }

  function frame() {
    if (disposed) return;
    raf = requestAnimationFrame(frame);
    const now = performance.now();
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    advance(dt);
    updateVisuals(paused ? 0 : dt);
    updateCamera(dt);
    renderer.render(scene, camera);
    flush();
    hudClock += dt;
    if (hudClock >= 0.1) { hudClock = 0; onHud(hudSnapshot()); }
  }

  spawnCrate();
  events.length = 0;
  if (visual) {
    updateVisuals(0);
    updateCamera(0);
    raf = requestAnimationFrame(frame);
  }

  return {
    setInput(key, on) { if (key in input) input[key] = !!on; },
    clearInput() { for (const k in input) input[k] = false; },
    grab() { grabRequested = true; },
    setTrim(t) { trim = Object.assign({}, trim, t); },
    setView(v) { view = v; cam.ready = false; },
    setFreeWind(m) { freeWindMph = m; },
    setPaused(p) { paused = !!p; last = visual ? performance.now() : 0; },
    isPaused() { return paused; },
    snapshot: hudSnapshot,
    // test hooks
    _sim: sim, _round: round, _boxes: boxes, _falling: falling, _step: step, _flush: flush, _spawn: spawnCrate,
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      if (!visual) return;
      const el = renderer.domElement;
      el.removeEventListener('pointerdown', pDown);
      el.removeEventListener('pointermove', pMove);
      el.removeEventListener('pointerup', pUp);
      el.removeEventListener('pointercancel', pUp);
      el.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', resize);
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          const ms = Array.isArray(o.material) ? o.material : [o.material];
          ms.forEach((m) => { if (m.map) m.map.dispose(); m.dispose(); });
        }
      });
      renderer.dispose();
      if (el.parentNode) el.parentNode.removeChild(el);
    }
  };
}
