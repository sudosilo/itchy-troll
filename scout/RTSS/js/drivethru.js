// Drive-thru tab. A 3D model of the lane and its equipment with the sun moving over it,
// built the same way as the Parcelsun locker model: a view on top, drop-down cards underneath.
import { state, touched, docBytes } from './store.js';
import { h, fill, fieldGrid, dropCard, readout, shrinkPhoto, isOpen, setOpen } from './ui.js';
import * as M from './dtmodel.js';

let dt = null;          // the saved model, state.doc.dt
let A = null;           // the latest analysis of it
let V = null;           // the 3D view, built once and reused
let THREE = null;
let ui = {};            // page parts that get refreshed
let showCars = true;
let playing = null;

const INK = 0x111111, HOT = 0xf6d04d, ACCENT = 0xd9610f;

// ===== 3D VIEW =====
async function makeView() {
  if (V) return V;
  THREE = await import('three');
  const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf4f1ea);
  const camera = new THREE.PerspectiveCamera(42, 1, 1, 3000);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.maxPolarAngle = Math.PI / 2 - 0.03;
  controls.minDistance = 20;
  controls.maxDistance = 900;
  controls.target.set(0, 4, 0);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd8d2c4, 1.1));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -260, right: 260, top: 260, bottom: -260, near: 1, far: 1400 });
  sun.shadow.bias = -0.0006;
  scene.add(sun, sun.target);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(9, 20, 12), new THREE.MeshBasicMaterial({ color: 0xf2a900 }));
  scene.add(ball);
  const world = new THREE.Group();
  scene.add(world);
  V = { renderer, scene, camera, controls, sun, ball, world, picks: [], tex: {}, draw: () => renderer.render(scene, camera) };
  controls.addEventListener('change', V.draw);

  // a tap that did not drag picks the part under the finger
  let down = null;
  const el = renderer.domElement;
  el.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
  el.addEventListener('pointerup', e => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6) return;
    const r = el.getBoundingClientRect();
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1), camera);
    const hit = ray.intersectObjects(V.picks, true)[0];
    if (!hit) return;
    let o = hit.object;
    while (o && o.userData.id === undefined) o = o.parent;
    if (o) openItem(o.userData.id);
  });
  return V;
}

function sizeView() {
  if (!V || !ui.view) return;
  const w = ui.view.clientWidth, hgt = ui.view.clientHeight;
  if (!w || !hgt) return;
  V.renderer.setSize(w, hgt, false);
  V.camera.aspect = w / hgt;
  V.camera.updateProjectionMatrix();
  V.draw();
}

function setCamera(top) {
  if (!V) return;
  const G = A.G;
  const r = Math.max(G.W, G.D) * 0.75 + 55;
  if (top) V.camera.position.set(0, r * 1.9, 0.01);
  else V.camera.position.set(r * 0.9, r * 0.75, r * 1.05);
  V.controls.target.set(0, 4, 0);
  V.controls.update();
  V.draw();
}

const mat = (color, extra) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.9 }, extra || {}));
function box(w, hgt, d, color, x, y, z, extra) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, hgt, d), mat(color, extra));
  m.position.set(x || 0, y || 0, z || 0);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}
function edged(mesh) {
  mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry), new THREE.LineBasicMaterial({ color: INK })));
  return mesh;
}
// a round tag with the part number on it
function tag(text, y) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#fff'; g.beginPath(); g.arc(32, 32, 28, 0, 7); g.fill();
  g.lineWidth = 5; g.strokeStyle = '#111'; g.stroke();
  g.fillStyle = '#111'; g.font = '800 30px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 32, 34);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false }));
  s.scale.set(7, 7, 1);
  s.position.y = y;
  s.renderOrder = 5;
  return s;
}

// a strip of pavement between two distances along the lane
function ribbon(G, d0, d1, lane, color, y) {
  const pts = [];
  for (let d = d0; d < d1; d += 2) pts.push(M.laneAt(G, d, lane));
  pts.push(M.laneAt(G, d1, lane));
  const pos = [], idx = [];
  pts.forEach((p, i) => {
    pos.push(p.x + p.nx * G.lw / 2, y, p.z + p.nz * G.lw / 2, p.x - p.nx * G.lw / 2, y, p.z - p.nz * G.lw / 2);
    if (i) { const a = (i - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 1, side: THREE.DoubleSide }));
  m.receiveShadow = true;
  return m;
}

function partMesh(row) {
  const it = row.it, T = M.DT_TYPES[it.type], G = A.G;
  const p = M.place(G, it);
  const g = new THREE.Group();
  g.position.set(p.x, 0, p.z);
  g.rotation.y = Math.atan2(p.fx, p.fz);   // the group's own z axis points out of the part's front
  g.userData.id = it.id;
  const y = p.y;
  const lit = row.now.lit;
  let top = y + 2;
  if (it.type === 'menu' || it.type === 'presell' || it.type === 'ocd' || it.type === 'sign') {
    const w = T.w, tall = T.tall;
    g.add(box(0.5, Math.max(0.5, y - tall / 2), 0.5, 0x8a8580, 0, Math.max(0.25, (y - tall / 2) / 2), -0.1));
    g.add(edged(box(w, tall, 0.7, 0x2b2b2b, 0, y, 0)));
    const face = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.4, tall - 0.4), new THREE.MeshBasicMaterial({ color: lit ? HOT : 0x3d4a57 }));
    if (it.photo) {
      const key = it.id + ':' + it.photo.length;
      V.tex[key] = V.tex[key] || new THREE.TextureLoader().load(it.photo, () => V.draw());
      V.tex[key].colorSpace = THREE.SRGBColorSpace;
      face.material = new THREE.MeshBasicMaterial({ map: V.tex[key], color: lit ? 0xfff0b8 : 0xffffff });
    }
    face.position.set(0, y, 0.36);
    g.add(face);
    top = y + tall / 2 + 2.5;
  } else if (T.wall) {
    g.add(edged(box(T.w, T.tall, 0.8, lit ? HOT : 0x9ec9f0, 0, y + 0.5, 0)));
    g.add(box(T.w + 1, 0.3, 1.6, 0x8a8580, 0, y - T.tall / 2 + 0.4, 0.5));
    top = y + T.tall / 2 + 3;
  } else if (it.type === 'speaker') {
    g.add(edged(box(1.1, y + 1, 1.1, 0x6f6a62, 0, (y + 1) / 2, 0)));
    g.add(box(0.8, 0.8, 0.1, INK, 0, y, 0.56));
  } else if (it.type === 'clearance') {
    const reach = G.lw + 3;
    g.add(box(0.5, y + 1.5, 0.5, 0x6f6a62, 0, (y + 1.5) / 2, 0));
    g.add(box(0.35, 0.35, reach, HOT, 0, y, reach / 2));
    top = y + 3;
  } else if (it.type === 'canopy') {
    g.rotation.y = Math.atan2(p.tx, p.tz);
    const len = parseFloat(it.len) || 16, wid = parseFloat(it.wid) || 16;
    g.add(edged(box(wid, 1, len, 0xe7e2d8, 0, y + 0.5, 0)));
    [[1, 1], [1, -1]].forEach(([a, b]) => g.add(box(0.6, y, 0.6, 0x6f6a62, a * (wid / 2 - 0.5), y / 2, b * (len / 2 - 1))));
    top = y + 3.5;
  } else if (it.type === 'loop') {
    const ring = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(6, 0.05, 6)), new THREE.LineBasicMaterial({ color: 0x2f6fa8 }));
    ring.position.y = 0.2;
    g.add(ring, box(6, 0.06, 6, 0x2f6fa8, 0, 0.12, 0, { transparent: true, opacity: 0.35 }));
    top = 3;
  } else if (it.type === 'bay') {
    g.add(box(9, 0.06, 18, 0xffffff, 0, 0.1, -9 - 1, { transparent: true, opacity: 0.6 }));
    top = 3;
  } else if (it.type === 'bollard') {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, y, 12), mat(HOT));
    c.position.y = y / 2; c.castShadow = true;
    g.add(c);
  } else {
    g.add(box(0.4, y, 0.4, 0x6f6a62, 0, y / 2, 0));
    g.add(edged(box(1.2, 0.8, 1.2, it.type === 'camera' ? (lit ? HOT : 0x2b2b2b) : 0xffffff, 0, y, 0.3)));
  }
  g.add(tag(String(row.idx + 1), top));
  return g;
}

function buildScene() {
  if (!V) return;
  const G = A.G, W = V.world;
  W.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material && o.material.dispose) o.material.dispose(); });
  W.clear();
  V.picks = [];
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600), new THREE.MeshStandardMaterial({ color: 0xe6e0d2, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  W.add(ground);
  // building, with the front door wall marked
  W.add(edged(box(G.W, G.H, G.D, 0xffffff, 0, G.H / 2, 0)));
  W.add(box(Math.min(8, G.W * 0.3), 7.5, 0.4, ACCENT, 0, 3.75, G.D / 2 + 0.1));
  W.add(box(G.W, 1.2, 0.5, ACCENT, 0, G.H - 0.6, G.D / 2 + 0.1));
  const c = M.closetPoint(dt, G);
  W.add(edged(box(4, 0.6, 4, 0x2f6fa8, c.x, G.H + 0.3, c.z)));
  // lanes
  W.add(ribbon(G, 0, G.len, '1', 0x55524c, 0.04));
  if (G.two) W.add(ribbon(G, 0, G.merge, '2', 0x6a665e, 0.03));
  for (let d = 12; d < G.len - 4; d += 28) {
    const p = M.laneAt(G, d, '1');
    const tri = new THREE.Mesh(new THREE.ConeGeometry(1.6, 4.5, 3), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    tri.rotation.set(Math.PI / 2, 0, 0);
    const holder = new THREE.Group();
    holder.add(tri);
    holder.position.set(p.x, 0.2, p.z);
    holder.rotation.y = Math.atan2(p.tx, p.tz);
    holder.scale.y = 0.05;
    W.add(holder);
  }
  // parts
  A.rows.forEach(row => { const m = partMesh(row); W.add(m); V.picks.push(m); });
  // cars, stacked back from the last window
  if (showCars) {
    const stops = dt.items.filter(i => M.DT_TYPES[i.type].stop).map(i => parseFloat(i.pos) || 0);
    const head = stops.length ? Math.max(...stops) : G.len - 10;
    const colors = [0xc8102e, 0x2f6fa8, 0xffffff, 0x3a3a3a, 0x8a8580, 0x2e7d4f];
    let k = 0;
    const car = (d, lane) => {
      const p = M.laneAt(G, d, lane);
      const g = new THREE.Group();
      g.add(edged(box(6, 2.6, 15, colors[k % colors.length], 0, 2.1, 0)));
      g.add(box(5.6, 1.8, 7.5, 0x9ec9f0, 0, 4.2, -0.8));
      g.position.set(p.x, 0, p.z);
      g.rotation.y = Math.atan2(p.tx, p.tz);
      W.add(g);
      k++;
    };
    for (let d = head - 3; d > 8; d -= G.car) {
      car(d, '1');
      if (G.two && d < G.merge - G.car / 2) car(d, '2');
    }
  }
  // north arrow on the ground
  const nb = -(parseFloat(dt.facing) - 180) * M.D2R;
  const arrow = new THREE.Group();
  const shaft = box(1.2, 0.2, 22, 0xc8102e, 0, 0.2, 0);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(3.2, 8, 3), new THREE.MeshBasicMaterial({ color: 0xc8102e }));
  tip.rotation.x = -Math.PI / 2; tip.position.set(0, 0.25, -15); tip.scale.z = 0.08;
  arrow.add(shaft, tip, tag('N', 5));
  arrow.position.set(-(G.W / 2 + G.g + G.lw + 26), 0, -(G.D / 2 + G.g + 14));
  arrow.rotation.y = -nb;
  W.add(arrow);
  placeSun();
}

function placeSun() {
  if (!V) return;
  const s = M.sunVec(dt, A.sun);
  const up = A.sun.alt > 0.01;
  V.sun.visible = up;
  V.ball.visible = up;
  V.sun.position.set(s.x * 500, s.y * 500, s.z * 500);
  V.ball.position.set(s.x * 420, s.y * 420, s.z * 420);
  V.scene.background = new THREE.Color(up ? 0xf4f1ea : 0xdcd8cf);
  V.draw();
}

// ===== NUMBERS UNDER THE VIEW =====
const deg = r => Math.round(r / M.D2R);
function refresh(kind) {
  A = M.analyze(dt);
  // parts change color as the sun reaches them, so a time change rebuilds only when a part flips
  const sig = A.rows.map(r => (r.now.lit ? 1 : 0)).join('');
  if (kind === 'build' || (kind === 'time' && sig !== ui.sig)) buildScene();
  else if (kind === 'time') placeSun();
  ui.sig = sig;

  ui.clock.textContent = M.clock(A.hour);
  ui.hudL.textContent = M.MONTHS[dt.month].slice(0, 3) + ' ' + dt.day + ', ' + M.clock(A.hour);
  ui.hudR.textContent = A.sun.alt > 0.01 ? 'Sun ' + deg(A.sun.alt) + ' up, ' + M.compass(A.sunBearing) : 'Sun is down';

  const faces = A.rows.filter(r => M.DT_TYPES[r.it.type].face);
  const glare = A.rows.filter(r => r.now.glare);
  ui.now.replaceChildren(
    readout('Outside air', Math.round(A.amb) + ' F'),
    readout('Sun height', A.sun.alt > 0 ? deg(A.sun.alt) + ' deg' : 'Down'),
    readout('Sun bearing', Math.round(A.sunBearing) + ' ' + M.compass(A.sunBearing)),
    readout('Parts in direct sun', faces.filter(r => r.now.lit).length + ' of ' + faces.length),
    ...faces.map(r => readout((r.idx + 1) + ' ' + r.name, r.it.type === 'camera' ? (r.now.lit ? 'Sun in lens' : 'Clear') : (r.now.lit ? 'Sun, ' : 'Shade, ') + Math.round(r.now.temp) + ' F',
      r.now.lit ? (r.now.temp > 150 ? 'alarm' : 'warn') : '')),
    ...glare.map(r => readout((r.idx + 1) + ' ' + r.name, 'Low sun in driver eyes', 'warn')));

  ui.day.replaceChildren(
    h('div', { class: 'trow head' }, h('span', {}, 'Part'), h('span', {}, 'Faces'), h('span', {}, 'Direct sun'), h('span', {}, 'Peak face')),
    ...faces.map(r => h('div', { class: 'trow' + (r.sunH >= 4 ? ' warn' : '') }, h('span', {}, (r.idx + 1) + ' ' + r.name),
      h('span', {}, Math.round(r.faces) + ' ' + M.compass(r.faces)),
      h('span', {}, r.sunH ? r.sunH + ' h' : 'None', r.sunH ? h('small', {}, 'Between ' + r.sunSpan.replace(' to ', ' and ')) : null),
      h('span', {}, r.it.type === 'camera' ? '' : Math.round(r.peakT) + ' F', r.it.type === 'camera' ? null : h('small', {}, 'At ' + M.clock(r.peakAt))))),
    ...A.rows.filter(r => r.glareH).map(r => h('div', { class: 'trow warn' }, h('span', {}, (r.idx + 1) + ' ' + r.name), h('span', {}, 'Driver'),
      h('span', {}, r.glareH + ' h low sun', h('small', {}, 'Between ' + r.glareSpan.replace(' to ', ' and '))), h('span', {}, ''))));
  if (!faces.length) ui.day.append(h('p', { class: 'hint' }, 'Add a menu board, window or camera to see its sun hours.'));

  const Q = A.queue;
  fill(ui.queue, readout('Lane length', Math.round(Q.len) + ' ft'), ...Q.parts.map(([a, b]) => readout(a, b + (b === 1 ? ' car' : ' cars'))),
    Q.exitFt !== undefined ? readout('Last window to exit', Q.exitFt + ' ft') : null);
  if (!Q.parts.length) ui.queue.append(h('p', { class: 'hint' }, 'Add an order point and a window to count the car stack.'));

  A.rows.forEach(r => { const box = ui.itemRo && ui.itemRo[r.it.id]; if (box) box.replaceChildren(...itemReadouts(r)); });
  if (ui.meter) ui.meter.textContent = 'Survey size ' + Math.round(docBytes() / 1024) + ' KB of 1750 KB';
}

function itemReadouts(r) {
  const T = M.DT_TYPES[r.it.type];
  const out = [];
  if (T.face) out.push(readout('Front faces', Math.round(r.faces) + ' ' + M.compass(r.faces)), readout(T.lens ? 'Sun in lens' : 'Direct sun', r.sunH ? r.sunH + ' h a day' : 'None', r.sunH >= 4 ? 'warn' : ''));
  if (T.face && !T.lens) out.push(readout('Peak face temp', Math.round(r.peakT) + ' F', r.peakT > 150 ? 'alarm' : ''));
  if (T.stop) out.push(readout('Low sun in driver eyes', r.glareH ? r.glareH + ' h a day' : 'None', r.glareH ? 'warn' : ''));
  if (T.cable) out.push(readout('Run to closet', r.run + ' ft'));
  return out;
}

function changed(kind) { touched({ src: 'dt' }); refresh(kind); }

// ===== EQUIPMENT LIST =====
function openItem(id) {
  setOpen('dt:equip', true);
  setOpen('dti:' + id, true);
  drawItems();
  ui.equip.classList.add('open');
  const el = ui.items.querySelector('[data-id="' + id + '"]');
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function drawItems() {
  const G = M.dims(dt);
  ui.itemRo = {};
  ui.items.replaceChildren();
  dt.items.forEach((it, i) => {
    const T = M.DT_TYPES[it.type];
    const key = 'dti:' + it.id;
    const head = h('span', {});
    const title = () => { head.textContent = (i + 1) + '. ' + (it.v.label || T.name) + ', ' + Math.round(it.pos) + ' ft'; };
    title();
    const place = M.PLACE_FIELDS.filter(f => !(f.id === 'lane' && !G.two) && !(f.id === 'aim' && !T.face) && !((f.id === 'setback' || f.id === 'side') && (T.wall || it.type === 'canopy')))
      .map(f => (f.id === 'pos' ? Object.assign({}, f, { max: Math.round(G.len) }) : f));
    if (it.type === 'canopy') place.push({ id: 'len', label: 'Length Along Lane (ft)', type: 'number' }, { id: 'wid', label: 'Width Across Lane (ft)', type: 'number' });
    const ro = h('div', { class: 'readouts' });
    ui.itemRo[it.id] = ro;
    const thumb = h('div', { class: 'photo' });
    const drawPhoto = () => fill(thumb, it.photo ? h('img', { src: it.photo, alt: 'Photo of ' + (it.v.label || T.name) }) : null,
      h('label', { class: 'btn' }, it.photo ? 'Retake photo' : 'Take photo', h('input', { type: 'file', accept: 'image/*', capture: 'environment', hidden: true, onchange: async e => {
        const file = e.target.files[0];
        if (!file) return;
        try { it.photo = await shrinkPhoto(file, 900, 0.6); drawPhoto(); changed('build'); } catch (err) {}
      } })),
      it.photo ? h('button', { type: 'button', onclick: () => { delete it.photo; drawPhoto(); changed('build'); } }, 'Remove photo') : null);
    drawPhoto();
    const item = h('div', { class: 'item' + (isOpen(key) ? ' open' : ''), 'data-id': it.id },
      h('div', { class: 'item-head', onclick: () => { const o = !item.classList.contains('open'); item.classList.toggle('open', o); setOpen(key, o); } }, head, h('i', {})),
      h('div', { class: 'item-body' },
        h('div', { class: 'subhead' }, 'Where it sits'),
        fieldGrid(place, { get: id => it[id], set: (id, v) => { it[id] = v; title(); changed('build'); } }, { prefix: 'dt.' + it.id + '.' }),
        ro,
        h('div', { class: 'subhead' }, 'What it is'),
        fieldGrid(M.itemFields(it.type), { get: id => it.v[id], set: (id, v) => { if (v === '') delete it.v[id]; else it.v[id] = v; title(); changed(id === 'label' ? 'build' : 'none'); } }, { prefix: 'dt.' + it.id + '.v.' }),
        thumb,
        h('button', { type: 'button', class: 'danger', onclick: () => { dt.items.splice(i, 1); drawItems(); changed('build'); } }, 'Remove this part')));
    ui.items.append(item);
  });
  if (!dt.items.length) ui.items.append(h('p', { class: 'hint' }, 'Nothing placed yet. Pick a part below and add it.'));
  if (ui.equip) ui.equip.setBadge(dt.items.length + (dt.items.length === 1 ? ' part' : ' parts'));
  if (A) A.rows.forEach(r => { if (ui.itemRo[r.it.id]) ui.itemRo[r.it.id].replaceChildren(...itemReadouts(r)); });
}

function drawPhotos() {
  ui.photos.replaceChildren(...dt.photos.map((p, i) => h('div', { class: 'shot' }, h('img', { src: p.data, alt: p.cap || 'Site photo ' + (i + 1) }),
    h('input', { type: 'text', placeholder: 'Caption', value: p.cap || '', oninput: e => { p.cap = e.target.value; touched({ src: 'dt' }); } }),
    h('button', { type: 'button', class: 'danger', onclick: () => { dt.photos.splice(i, 1); drawPhotos(); changed('none'); } }, 'Remove'))));
}

// ===== THE TAB =====
export function renderDriveThru(root) {
  clearInterval(playing);
  playing = null;
  if (!state.doc.dt) {
    dt = null;
    root.replaceChildren(h('section', { class: 'card center' }, h('h2', {}, 'Drive-thru model'),
      h('p', {}, 'This site has no drive-thru model yet. Starting one lays out a single lane around the building with the usual equipment, ready to move into place.'),
      h('button', { type: 'button', class: 'primary', id: 'dtStart', onclick: () => {
        state.doc.dt = M.defaults();
        // start the sun model at the site's pin when it has one
        const la = parseFloat(state.doc.f['site.lat']), lo = parseFloat(state.doc.f['site.lon']);
        if (isFinite(la) && isFinite(lo)) { state.doc.dt.lat = la; state.doc.dt.lon = lo; }
        state.doc.f['venue.driveThru'] = true;
        touched({ src: 'dt' });
        renderDriveThru(root);
      } }, 'Start drive-thru model')));
    return;
  }
  dt = state.doc.dt = M.shape(state.doc.dt);
  dt.items.sort((a, b) => (parseFloat(a.pos) || 0) - (parseFloat(b.pos) || 0));
  A = M.analyze(dt);
  ui = {};

  const acc = build => ({ get: id => dt[id], set: (id, v) => { dt[id] = v; if (id === 'lanes' || id === 'laneLen' || id === 'laneStart') drawItems(); changed(build); } });
  const G = A.G;

  ui.hudL = h('span', {});
  ui.hudR = h('span', {});
  ui.view = h('section', { class: 'card', id: 'view' },
    h('div', { class: 'hud' }, ui.hudL, ui.hudR),
    h('div', { class: 'viewbar' },
      h('button', { type: 'button', onclick: () => setCamera(true) }, 'Top'),
      h('button', { type: 'button', onclick: () => setCamera(false) }, 'Angle'),
      h('label', {}, h('input', { type: 'checkbox', checked: showCars, onchange: e => { showCars = e.target.checked; buildScene(); } }), 'Cars')),
    h('p', { class: 'hint', id: 'viewMsg' }, 'Loading the 3D view'));

  ui.clock = h('div', { class: 'clock' });
  const month = h('select', { 'aria-label': 'Month', onchange: e => { dt.month = parseInt(e.target.value, 10); changed('time'); } }, M.MONTHS.map((m, i) => h('option', { value: i }, m)));
  month.value = dt.month;
  const hour = h('input', { type: 'range', min: 0, max: 23.75, step: 0.25, value: dt.hour, 'aria-label': 'Time of day', oninput: e => { dt.hour = parseFloat(e.target.value); changed('time'); } });
  const play = h('button', { type: 'button', onclick: () => {
    if (playing) { clearInterval(playing); playing = null; play.textContent = 'Play day'; return; }
    play.textContent = 'Stop';
    playing = setInterval(() => { dt.hour = (dt.hour + 0.25) % 24; hour.value = dt.hour; refresh('time'); }, 120);
  } }, 'Play day');
  const timeCard = h('section', { class: 'card' }, h('h2', {}, 'Date and time'),
    h('div', { class: 'timebar' }, month,
      h('input', { type: 'number', min: 1, max: 31, value: dt.day, 'aria-label': 'Day of month', oninput: e => { dt.day = Math.min(31, Math.max(1, parseInt(e.target.value, 10) || 1)); changed('time'); } }), play),
    ui.clock, hour);

  ui.now = h('div', { class: 'readouts' });
  ui.day = h('div', { class: 'table' });
  ui.queue = h('div', { class: 'readouts' });
  ui.items = h('div', { class: 'list' });
  ui.photos = h('div', { class: 'shots' });
  ui.meter = h('p', { class: 'hint' });

  const typeSel = h('select', { 'aria-label': 'Part to add' }, Object.entries(M.DT_TYPES).map(([k, T]) => h('option', { value: k }, T.name)));
  typeSel.value = 'menu';
  const addBar = h('div', { class: 'addbar' }, typeSel, h('button', { type: 'button', class: 'primary', onclick: () => {
    const it = M.newItem(typeSel.value, Math.round(M.dims(dt).len / 2));
    dt.items.push(it);
    setOpen('dti:' + it.id, true);
    drawItems();
    changed('build');
    const el = ui.items.querySelector('[data-id="' + it.id + '"]');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } }, 'Add part'));

  const siteFields = [
    { id: 'facing', label: 'Front Door Wall Faces (deg, 180 is south)', type: 'range', min: 0, max: 359 },
    { id: 'lat', label: 'Latitude', type: 'number' }, { id: 'lon', label: 'Longitude', type: 'number' },
    { id: 'tz', label: 'Hours From UTC, Standard Time', type: 'number', ph: 'Blank works it out' }, { id: 'dst', label: 'Daylight saving clock', type: 'check' },
    { type: 'sub', label: 'Building' },
    { id: 'bldgW', label: 'Width Along the Front (ft)', type: 'number' }, { id: 'bldgD', label: 'Depth, Front to Back (ft)', type: 'number' },
    { id: 'bldgH', label: 'Height (ft)', type: 'number' }, { id: 'wind', label: 'Wind (mph)', type: 'number' },
    { id: 'closetX', label: 'Network Closet, Left to Right (percent)', type: 'range', min: 0, max: 100 },
    { id: 'closetZ', label: 'Network Closet, Back to Front (percent)', type: 'range', min: 0, max: 100 },
    { type: 'sub', label: 'Weather for the day' },
    { id: 'hi', label: 'Day High (F)', type: 'number', ph: 'Blank uses the month average' }, { id: 'lo', label: 'Day Low (F)', type: 'number', ph: 'Blank uses the month average' }
  ];
  const laneFields = [
    { id: 'laneStart', label: 'Lane Entry, Feet Around the Building From the Front Right Corner', type: 'range', min: -150, max: Math.round(G.P - 20) },
    { id: 'laneLen', label: 'Lane Length (ft)', type: 'range', min: 20, max: Math.round(G.P + 150), step: 5 },
    { id: 'laneWidth', label: 'Lane Width (ft)', type: 'number' }, { id: 'laneGap', label: 'Gap Between Wall and Lane (ft)', type: 'number' },
    { id: 'lanes', label: 'Order Lanes', type: 'select', opts: [['1', 'One lane'], ['2', 'Two lanes that merge']] },
    { id: 'merge', label: 'Lanes Merge At (ft from entry)', type: 'number' },
    { id: 'carLen', label: 'Space Per Car (ft)', type: 'number' }
  ];
  const geo = h('button', { type: 'button', onclick: () => {
    if (!navigator.geolocation) return;
    geo.textContent = 'Finding you';
    navigator.geolocation.getCurrentPosition(pos => {
      dt.lat = Math.round(pos.coords.latitude * 10000) / 10000;
      dt.lon = Math.round(pos.coords.longitude * 10000) / 10000;
      changed('time');
      renderDriveThru(root);
    }, () => { geo.textContent = 'Location not available'; }, { enableHighAccuracy: true, timeout: 15000 });
  } }, 'Use my location');

  ui.equip = dropCard('dt:equip', 'Equipment', '', [ui.items, addBar]);
  fill(root,
    ui.view, timeCard,
    h('section', { class: 'card' }, h('h2', {}, 'At this moment'), ui.now),
    dropCard('dt:day', 'Whole day', '', [ui.day, h('p', { class: 'hint' }, 'Direct sun on a screen washes it out and heats it. Peak face is an estimate for a dark face in that sun and wind.')]),
    dropCard('dt:queue', 'Car stack', '', ui.queue),
    ui.equip,
    dropCard('dt:lane', 'Lane', '', fieldGrid(laneFields, acc('build'), { prefix: 'dt.' })),
    dropCard('dt:site', 'Site and building', '', [fieldGrid(siteFields, acc('build'), { prefix: 'dt.' }), geo]),
    dropCard('dt:photos', 'Site photos', '', [ui.photos,
      h('label', { class: 'btn' }, 'Add site photo', h('input', { type: 'file', accept: 'image/*', capture: 'environment', hidden: true, onchange: async e => {
        const file = e.target.files[0];
        if (!file) return;
        try { dt.photos.push({ data: await shrinkPhoto(file, 1000, 0.6), cap: '' }); drawPhotos(); changed('none'); } catch (err) {}
      } })), ui.meter]),
    h('button', { type: 'button', class: 'danger wide', onclick: e => {
      // two taps, so a slip does not wipe the model
      if (e.target.dataset.sure) { state.doc.dt = null; touched({ src: 'dt' }); renderDriveThru(root); }
      else { e.target.dataset.sure = 1; e.target.textContent = 'Tap again to remove the drive-thru model'; }
    } }, 'Remove drive-thru model'));

  drawItems();
  drawPhotos();
  refresh('none');

  makeView().then(() => {
    document.getElementById('viewMsg')?.remove();
    ui.view.prepend(V.renderer.domElement);
    if (!V.ro) { V.ro = new ResizeObserver(sizeView); }
    V.ro.disconnect();
    V.ro.observe(ui.view);
    buildScene();
    sizeView();
    if (!V.aimed) { setCamera(false); V.aimed = true; }
  }).catch(() => {
    const msg = document.getElementById('viewMsg');
    if (msg) msg.textContent = 'The 3D view needs a connection the first time. Everything below still works.';
  });
}
