/*
  Rocketbench flight core. Pure simulation, no DOM, no rendering.

  var sim = RocketSim.create();
  sim.on('apogee', function (e) {});
  sim.setDesign(design);
  sim.launch({ tilt: 0, wind: 4, spin: 0, autoStab: true, autoStage: true, autoChute: true, breakMode: false });
  each frame: sim.step(realSeconds);
  sim.reset();

  Units are SI: meters, kilograms, seconds, newtons, pascals.
  World frame: x downrange, y altitude. Body angle th is measured from vertical,
  positive tilts the nose toward +x. Body stations s run from the nose tip (0) to the tail.
*/
(function (root) {
  'use strict';

  var G0 = 9.80665, RE = 6371000, RAIR = 287.053, GAM = 1.4;
  var SIGMA_ALLOW = 60e6;  // allowable wall stress after buckling knockdown
  var WALL_RHO = 1600;     // composite wall density
  var RAIL_LEN = 6;
  var DT = 0.002;
  var NST = 48;            // load stations per body
  var RCS_ISP = 70;        // cold gas

  // ---------- US Standard Atmosphere 1976 (to 86 km, isothermal above) ----------
  var LAY = [[0, -0.0065], [11000, 0], [20000, 0.001], [32000, 0.0028], [47000, 0], [51000, -0.0028], [71000, -0.002], [84852, 0]];
  var LT = [288.15], LP = [101325];
  (function () {
    for (var i = 1; i < LAY.length; i++) {
      var hb = LAY[i - 1][0], L = LAY[i - 1][1], h = LAY[i][0], Tb = LT[i - 1], Pb = LP[i - 1];
      if (L === 0) { LT.push(Tb); LP.push(Pb * Math.exp(-G0 * (h - hb) / (RAIR * Tb))); }
      else { var T = Tb + L * (h - hb); LT.push(T); LP.push(Pb * Math.pow(T / Tb, -G0 / (L * RAIR))); }
    }
  })();
  function atmosphere(alt) {
    var z = Math.max(0, alt);
    var h = RE * z / (RE + z);
    var k = LAY.length - 1;
    while (k > 0 && h < LAY[k][0]) k--;
    var hb = LAY[k][0], L = LAY[k][1], Tb = LT[k], Pb = LP[k], T, P;
    if (L === 0) { T = Tb; P = Pb * Math.exp(-G0 * (h - hb) / (RAIR * Tb)); }
    else { T = Tb + L * (h - hb); P = Pb * Math.pow(T / Tb, -G0 / (L * RAIR)); }
    return { T: T, p: P, rho: P / (RAIR * T), a: Math.sqrt(GAM * RAIR * T) };
  }
  function gravity(y) { var k = RE / (RE + Math.max(0, y)); return G0 * k * k; }

  // ---------- engines ----------
  // Fvac vacuum thrust N, Isp vacuum s, Ae nozzle exit area m2. Thrust at altitude = Fvac - p * Ae.
  // dia is the widest point (casing or bell exit). Solids carry their own grain.
  var ENGINES = {
    A:     { key: 'A',     label: 'A solid',      kind: 'solid',  cryo: false, Fvac: 5000,  Isp: 225, Ae: 0.006, prop: 30,  dry: 10,  len: 1.0, dia: 0.16, gimbal: 0, bell: 'sea' },
    C:     { key: 'C',     label: 'C solid',      kind: 'solid',  cryo: false, Fvac: 14000, Isp: 235, Ae: 0.016, prop: 100, dry: 30,  len: 1.6, dia: 0.24, gimbal: 0, bell: 'sea' },
    E:     { key: 'E',     label: 'E solid',      kind: 'solid',  cryo: false, Fvac: 40000, Isp: 245, Ae: 0.035, prop: 360, dry: 100, len: 2.4, dia: 0.36, gimbal: 0, bell: 'sea' },
    Meth:  { key: 'Meth',  label: 'Meth methalox', kind: 'biprop', cryo: true,  Fvac: 60000, Isp: 330, Ae: 0.09,  dry: 120, len: 1.5, dia: 0.36, gimbal: 5, bell: 'sea', rho: 830 },
    Vac:   { key: 'Vac',   label: 'Vac methalox',  kind: 'biprop', cryo: true,  Fvac: 36000, Isp: 365, Ae: 0.36,  dry: 95,  len: 2.0, dia: 0.68, gimbal: 4, bell: 'vac', rho: 830 },
    Perox: { key: 'Perox', label: 'Perox peroxide', kind: 'mono',  cryo: false, Fvac: 9000,  Isp: 190, Ae: 0.05,  dry: 32,  len: 1.0, dia: 0.26, gimbal: 3, bell: 'vac', rho: 1390 }
  };
  function mdotOf(e) { return e.Fvac / (e.Isp * G0); }
  function engineThrust(e, pAmb) {
    var back = pAmb * e.Ae, sep = false, F = e.Fvac - back;
    if (back > 0.55 * e.Fvac) { sep = true; F = 0.45 * e.Fvac - 0.2 * back; }
    return { F: Math.max(0, F), sep: sep };
  }

  // ---------- random ----------
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0; var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function gauss(r) { var u = r() || 1e-9, v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.283185 * v); }
  function wrapPi(a) { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  // ---------- parts ----------
  // design: { dia, wall (mm), parts: [ {type:'nose',len}, {type:'tank',len}, {type:'engine',key},
  //   {type:'decoupler'}, {type:'fins',span,count}, {type:'rcs'}, {type:'chute',dia} ] } listed top to bottom
  function buildParts(design, rand) {
    var D = design.dia, r = D / 2, t = design.wall / 1000;
    var aw = t * WALL_RHO * 2.0;
    var A = Math.PI * r * r;
    var parts = [], s = 0, section = 0, sections = [{ id: 0, propType: null, engines: [], tanks: [] }];
    design.parts.forEach(function (src, idx) {
      var p = { type: src.type, src: src, idx: idx, sTop: s, len: 0, dry: 0, prop: 0, cap: 0, strength: 1, section: section };
      switch (src.type) {
        case 'nose':
          p.len = src.len;
          p.payload = Math.max(0, +src.payload || 0);
          p.dry = aw * Math.PI * r * Math.sqrt(src.len * src.len + r * r) + 3 + p.payload;
          break;
        case 'tank':
          p.len = src.len;
          p.dry = aw * (Math.PI * D * src.len + 2 * A * 1.5);
          break;
        case 'engine':
          var e = ENGINES[src.key] || ENGINES.C;
          p.eng = e; p.len = e.len;
          p.dry = e.dry + aw * Math.PI * D * e.len * 0.65;
          if (e.kind === 'solid') { p.prop = p.cap = e.prop; }
          p.strength = 3;
          p.mis = (rand() - 0.5) * 0.005;
          p.gim = 0; p.firing = false; p.burnedOut = false; p.igniteT = 0; p.sideOU = 0;
          break;
        case 'decoupler':
          section++;
          sections.push({ id: section, propType: null, engines: [], tanks: [] });
          p.section = section;
          p.len = 0.3;
          p.dry = aw * Math.PI * D * 0.3 * 1.5 + 3 + 6 * A;
          p.strength = 0.75;
          break;
        case 'fins':
          var span = src.span, cr = 0.15 + 0.9 * span, ct = 0.4 * cr, n = src.count | 0;
          p.span = span; p.cr = cr; p.ct = ct; p.count = n;
          p.area = 0.5 * (cr + ct) * span;
          p.dry = n * p.area * Math.max(0.003, 3 * t) * WALL_RHO;
          p.sLE = Math.max(0, s - cr);
          p.strength = 1.2;
          if (parts.length) p.section = parts[parts.length - 1].section;
          break;
        case 'rcs':
          p.len = 0.3;
          p.dry = aw * Math.PI * D * 0.3 + 6;
          p.prop = p.cap = 8 + 10 * A;
          p.strength = 1.2; p.cmd = 0;
          break;
        case 'chute':
          p.chuteDia = src.dia;
          p.len = 0.35 + src.dia * 0.02;
          p.dry = aw * Math.PI * D * p.len + 0.3 * src.dia * src.dia + 0.8;
          p.rating = 2200 * src.dia * src.dia;
          break;
      }
      s += p.len;
      parts.push(p);
    });
    // load liquid propellant per section
    parts.forEach(function (p) {
      var sec = sections[p.section];
      if (p.type === 'engine') sec.engines.push(p);
      if (p.type === 'tank') sec.tanks.push(p);
    });
    sections.forEach(function (sec) {
      var liq = sec.engines.filter(function (p) { return p.eng.kind !== 'solid'; });
      sec.propType = liq.length ? liq[0].eng.key : null;
      sec.mixed = liq.some(function (p) { return p.eng.rho !== liq[0].eng.rho; });
      sec.tanks.forEach(function (p) {
        p.usable = Math.max(0, p.len - 0.25);  // ullage, sump and residuals lost per tank
        p.lossUllage = p.len > 0 ? 1 - p.usable / p.len : 0;
        p.lossBoil = 0;
        if (!sec.propType) { p.cap = 0; p.prop = 0; return; }
        var e = ENGINES[sec.propType];
        var cap = e.rho * A * p.usable;
        if (e.cryo) { var sv = 4 / D + 2 / p.len; p.lossBoil = Math.min(0.4, 0.008 * sv); }
        p.cap = cap;
        p.prop = cap * (1 - p.lossBoil);
        p.fluid = e.kind;
        p.dry += 0.07 * cap;
      });
    });
    return { parts: parts, sections: sections, D: D, A: A, wall: t };
  }

  function partCenter(p) { return p.type === 'fins' ? p.sLE + p.cr * 0.5 : p.sTop + p.len * 0.5; }
  function propCenter(p) {
    if (p.type === 'tank') { var f = p.cap > 0 ? p.prop / p.cap : 0; return p.sTop + p.len - p.usable * f * 0.5 - 0.12; }
    return p.sTop + p.len * 0.5;
  }

  // ---------- bodies ----------
  var bodyId = 0;
  function newBody(parts, geo) {
    var b = { id: ++bodyId, parts: parts, D: geo.D, r: geo.D / 2, A: geo.A, wall: geo.wall,
      x: 0, y: 0, vx: 0, vy: 0, th: 0, om: 0, spin: 0, roll: 0,
      onRail: false, railDist: 0, railV: 0, alive: true, isMain: false, broken: false, landed: false,
      outcome: null, maxY: 0, rising: false, pastApogee: false, chuteOpen: false, chuteFrac: 0, chuteT: 0, chuteRipped: false,
      traj: [], trajT: 0, lastF: null, loads: new Float32Array(NST), loadMax: 0, mp: null, tele: {} };
    prepBody(b);
    return b;
  }
  function prepBody(b) {
    var off = b.parts.length ? b.parts[0].sTop : 0;
    b.parts.forEach(function (p) { p.sTop -= off; if (p.type === 'fins') p.sLE -= off; });
    var last = b.parts[b.parts.length - 1];
    var L = 0;
    b.parts.forEach(function (p) { L = Math.max(L, p.sTop + p.len); });
    b.L = Math.max(0.3, L);
    var top = b.parts[0];
    var lift = [];
    if (top && top.type === 'nose') {
      b.Ln = top.len; b.sinD2 = Math.pow(Math.sin(Math.atan(b.r / top.len)), 2);
      lift.push({ cna: 2, s: 0.666 * top.len });
    } else { b.Ln = 0; b.sinD2 = 1; lift.push({ cna: 2, s: 0.02 }); }
    var finDrag = 0, finPlan = 0;
    b.parts.forEach(function (p) {
      if (p.type !== 'fins' || p.count < 1) return;
      var s = p.span, cr = p.cr, ct = p.ct, xt = cr - ct, R = b.r, D = b.D;
      var lm = Math.sqrt(s * s + Math.pow(xt + ct / 2 - cr / 2, 2));
      var n = p.count;
      var cna = (1 + R / (s + R)) * (4 * n * Math.pow(s / D, 2)) / (1 + Math.sqrt(1 + Math.pow(2 * lm / (cr + ct), 2)));
      if (n > 4) cna *= 0.92;
      var xf = xt * (cr + 2 * ct) / (3 * (cr + ct)) + (1 / 6) * (cr + ct - cr * ct / (cr + ct));
      p.cna = cna;
      lift.push({ cna: cna, s: p.sLE + xf });
      finDrag += n * p.area * 0.02;
      finPlan += 2 * p.area;
    });
    b.lift = lift;
    b.cnaTot = lift.reduce(function (a, l) { return a + l.cna; }, 0);
    b.sCp = lift.reduce(function (a, l) { return a + l.cna * l.s; }, 0) / b.cnaTot;
    b.cdFric = 0.0035 * (Math.PI * b.D * b.L) / b.A;
    b.cdFins = finDrag / b.A;
    b.finPlan = finPlan;
    b.hasNose = !!(top && top.type === 'nose');
    // station map
    var ds = b.L / NST;
    b.ds = ds;
    b.stPart = new Int16Array(NST);
    b.stDry = new Float32Array(NST);
    for (var j = 0; j < NST; j++) {
      var sj = (j + 0.5) * ds, k = 0;
      for (var i = 0; i < b.parts.length; i++) { var p = b.parts[i]; if (p.len > 0 && sj >= p.sTop && sj < p.sTop + p.len) { k = i; break; } if (p.len > 0 && sj >= p.sTop) k = i; }
      b.stPart[j] = k;
    }
    b.parts.forEach(function (p) {
      var a0 = p.type === 'fins' ? p.sLE : p.sTop, l = p.type === 'fins' ? p.cr : p.len;
      spread(b.stDry, a0, l, p.dry, ds);
    });
    b.chutePart = null;
    b.parts.forEach(function (p) { if (p.type === 'chute' && !b.chutePart) b.chutePart = p; });
    b.rcsParts = b.parts.filter(function (p) { return p.type === 'rcs'; });
  }
  function spread(arr, a0, l, mass, ds) {
    if (mass <= 0) return;
    if (l <= 1e-6) { arr[clamp(Math.floor(a0 / ds), 0, NST - 1)] += mass; return; }
    var a1 = a0 + l;
    for (var j = clamp(Math.floor(a0 / ds), 0, NST - 1); j < NST; j++) {
      var s0 = j * ds, s1 = s0 + ds;
      if (s0 >= a1) break;
      var ov = Math.min(s1, a1) - Math.max(s0, a0);
      if (ov > 0) arr[j] += mass * ov / l;
    }
  }

  function massProps(b) {
    var m = 0, ms = 0;
    for (var i = 0; i < b.parts.length; i++) {
      var p = b.parts[i];
      m += p.dry; ms += p.dry * partCenter(p);
      if (p.prop > 0) { m += p.prop; ms += p.prop * propCenter(p); }
    }
    var scg = ms / m, I = 0;
    for (i = 0; i < b.parts.length; i++) {
      p = b.parts[i];
      var c = partCenter(p), l = p.type === 'fins' ? p.cr : p.len;
      I += p.dry * ((c - scg) * (c - scg) + l * l / 12);
      if (p.prop > 0) { var pc = propCenter(p); I += p.prop * ((pc - scg) * (pc - scg) + l * l / 24); }
    }
    I += m * b.r * b.r / 4;
    return { m: m, scg: scg, Iy: Math.max(I, 0.01), Ix: Math.max(m * b.r * b.r * 0.6, 0.001) };
  }

  function liquidPool(b, section) {
    var tot = 0;
    for (var i = 0; i < b.parts.length; i++) { var p = b.parts[i]; if (p.type === 'tank' && p.section === section) tot += p.prop; }
    return tot;
  }
  function drainLiquid(b, section, dm) {
    var tot = liquidPool(b, section);
    if (tot <= 0) return 0;
    var take = Math.min(dm, tot), f = take / tot;
    for (var i = 0; i < b.parts.length; i++) { var p = b.parts[i]; if (p.type === 'tank' && p.section === section) p.prop -= p.prop * f; }
    return take / dm;
  }
  function engineHasProp(b, p, secs) {
    if (p.eng.kind === 'solid') return p.prop > 0;
    var sec = secs[p.section];
    if (!sec || sec.propType === null || p.eng.rho !== ENGINES[sec.propType].rho) return false;
    return liquidPool(b, p.section) > 0.01;
  }

  function windProfile(y, w0) {
    if (w0 <= 0) return 0;
    var w = w0 * Math.pow(Math.max(y, 2) / 10, 0.14);
    if (y > 1000) w = w0 * 1.9;
    w += 1.5 * w0 * Math.exp(-Math.pow((y - 11000) / 3500, 2));
    if (y > 20000) w *= Math.exp(-(y - 20000) / 8000);
    return w;
  }

  // ---------- design analysis (static) ----------
  function analyze(design) {
    var g = buildParts(design, rng(1));
    var parts = g.parts, secs = g.sections;
    var warnings = [], blockers = [];
    var b = newBody(parts.slice(), g);
    var mp = massProps(b);
    if (!parts.length) blockers.push('Add parts to build a rocket.');
    parts.forEach(function (p) {
      if (p.type === 'engine' && p.eng.dia > g.D + 1e-6) blockers.push('Engine ' + p.eng.key + ' is ' + p.eng.dia.toFixed(2) + ' m wide and does not fit a ' + g.D.toFixed(2) + ' m body.');
    });
    if (parts.length && parts[0].type !== 'nose') warnings.push('No nose cone on top: blunt front, heavy drag and supersonic wave drag.');
    if (!parts.some(function (p) { return p.type === 'chute'; })) warnings.push('No parachute: the rocket will not survive landing.');
    if (parts.length && parts[parts.length - 1].type === 'decoupler') warnings.push('Decoupler at the very bottom does nothing.');
    // stages from bottom
    var stages = [];
    var maxSec = secs.length - 1;
    for (var k = maxSec; k >= 0; k--) {
      var sec = secs[k];
      var above = parts.filter(function (p) { return p.section <= k; });
      var m0 = 0, propS = 0;
      above.forEach(function (p) { m0 += p.dry + p.prop; });
      var eng = sec.engines;
      var Fsl = 0, Fv = 0, md = 0, isp = 0;
      eng.forEach(function (p) {
        var ok = p.eng.kind === 'solid' || (sec.propType && p.eng.rho === ENGINES[sec.propType].rho);
        if (!ok) return;
        Fv += p.eng.Fvac; Fsl += engineThrust(p.eng, 101325).F; md += mdotOf(p.eng);
        propS += p.eng.kind === 'solid' ? p.prop : 0;
      });
      sec.tanks.forEach(function (p) { propS += p.prop; });
      var ispv = md > 0 ? Fv / (md * G0) : 0, ispsl = md > 0 ? Fsl / (md * G0) : 0;
      var m1 = m0 - propS;
      var burn = md > 0 ? propS / md : 0;
      stages.push({ n: maxSec - k + 1, section: k, mass: m0, prop: propS, dvVac: ispv * G0 * Math.log(m0 / Math.max(m1, 1e-6)),
        dvSL: ispsl * G0 * Math.log(m0 / Math.max(m1, 1e-6)), twrSL: Fsl / (m0 * G0), twrVac: Fv / (m0 * G0), burn: burn,
        engines: eng.map(function (p) { return p.eng.key; }) });
      var liq = eng.filter(function (p) { return p.eng.kind !== 'solid'; });
      if (sec.tanks.length && !liq.length) warnings.push('Stage ' + (maxSec - k + 1) + ' has tanks but no liquid engine, they fly empty.');
      if (liq.length && !sec.tanks.length) blockers.push('Engine ' + liq[0].eng.key + ' in stage ' + (maxSec - k + 1) + ' has no tank to feed it.');
      if (sec.mixed) warnings.push('Stage ' + (maxSec - k + 1) + ' mixes propellants. Tanks load for ' + sec.propType + ' only.');
      if (!eng.length && k === maxSec) blockers.push('The bottom stage has no engine.');
      if (eng.length > 1) warnings.push('Stage ' + (maxSec - k + 1) + ' has ' + eng.length + ' engines stacked inline, the upper ones fire into the lower ones.');
      sec.tanks.forEach(function (p) {
        var loss = 1 - p.prop / Math.max(1e-6, p.cap / (1 - p.lossUllage));
        if (p.cap > 0 && (p.lossBoil + p.lossUllage) > 0.12) warnings.push('Tank of ' + p.len.toFixed(1) + ' m in stage ' + (maxSec - k + 1) + ' loses ' + Math.round((p.lossBoil + p.lossUllage) * 100) + '% to ' + (p.lossBoil > 0 ? 'boil off and ' : '') + 'ullage. Longer tanks waste less.');
      });
      eng.forEach(function (p) {
        if (k === maxSec && p.eng.bell === 'vac' && p.eng.kind !== 'mono') warnings.push('Vacuum bell on the first stage: at sea level the flow separates and thrust collapses.');
      });
    }
    var s1 = stages[0];
    if (s1 && s1.twrSL < 1) blockers.push('Liftoff thrust to weight is ' + s1.twrSL.toFixed(2) + '. It cannot leave the pad.');
    else if (s1 && s1.twrSL < 2) warnings.push('Liftoff thrust to weight ' + s1.twrSL.toFixed(2) + ': slow off the rail, wind will push it around.');
    // stability at liftoff and at first burnout
    var margin0 = (b.sCp - mp.scg) / g.D;
    var saved = parts.map(function (p) { return p.prop; });
    parts.forEach(function (p) { if (p.section === maxSec && (p.type === 'tank' || p.type === 'engine')) p.prop = 0; });
    var mpB = massProps(b);
    var margin1 = (b.sCp - mpB.scg) / g.D;
    parts.forEach(function (p, i) { p.prop = saved[i]; });
    var gimbaled = parts.some(function (p) { return p.type === 'engine' && p.eng.gimbal > 0 && p.section === maxSec; });
    if (margin0 < 0) warnings.push('Unstable: center of pressure is ahead of center of mass by ' + (-margin0).toFixed(2) + ' calibers.' + (gimbaled ? ' Gimbal can hold it under power only.' : ' Add fins lower down or move mass up.'));
    else if (margin0 < 1) warnings.push('Stability margin ' + margin0.toFixed(2) + ' calibers is thin. One to two is the usual target.');
    else if (margin0 > 4) warnings.push('Margin ' + margin0.toFixed(1) + ' calibers is very high: it will weathercock hard into the wind.');
    // margin of each upper stage flying on its own, full and empty
    stages.forEach(function (st) {
      if (st.n === 1) { st.margin = margin0; st.marginEmpty = margin1; return; }
      var sub = buildParts(design, rng(1)).parts.filter(function (p) { return p.section <= st.section; });
      if (!sub.length) return;
      var sb = newBody(sub, g), m1p = massProps(sb);
      st.margin = (sb.sCp - m1p.scg) / g.D;
      sub.forEach(function (p) { if (p.section === st.section && (p.type === 'tank' || p.type === 'engine')) p.prop = 0; });
      st.marginEmpty = (sb.sCp - massProps(sb).scg) / g.D;
      var gim = sub.some(function (p) { return p.type === 'engine' && p.section === st.section && p.eng.gimbal > 0; });
      var rcs = sub.some(function (p) { return p.type === 'rcs'; });
      if (st.margin < 0 && !gim && !rcs) warnings.push('Stage ' + st.n + ' is unstable on its own (' + st.margin.toFixed(2) + ' calibers) and has no gimbal or RCS.');
    });
    return { mass: mp.m, length: b.L, scg: mp.scg, scp: b.sCp, margin0: margin0, margin1: margin1, stages: stages,
      warnings: warnings, blockers: blockers, ok: blockers.length === 0, cnaTot: b.cnaTot, D: g.D };
  }

  // ---------- simulation instance ----------
  function create() {
    var handlers = {};
    var sim = {
      state: 'idle', t: 0, warp: 1, bodies: [], design: null, opts: null, geo: null,
      input: { nose: 0, tail: 0 }, summary: null, wind: 0, gust: 0
    };
    var rand = rng(7), gustOU = 0, gustT = 0, gustDur = 0, gustAmp = 0, gustNext = 5;
    var stageTimer = -1, maxQ = 0, maxQDone = false, liftoff = false, ended = false;

    function on(name, fn) { (handlers[name] = handlers[name] || []).push(fn); return sim; }
    function off(name, fn) { var h = handlers[name]; if (h) handlers[name] = h.filter(function (f) { return f !== fn; }); return sim; }
    function emit(name, data) { var h = handlers[name]; if (h) h.slice().forEach(function (f) { try { f(data || {}, sim); } catch (e) { if (root.console) console.error(e); } }); }

    function setDesign(design) { sim.design = JSON.parse(JSON.stringify(design)); reset(); }

    function reset() {
      sim.state = 'idle'; sim.t = 0; sim.summary = null; ended = false; liftoff = false;
      stageTimer = -1; maxQ = 0; maxQDone = false; sim.input.nose = 0; sim.input.tail = 0;
      sim.geo = null; sim.bodies = [];
      if (sim.design) {
        var g = buildParts(sim.design, rng(3));
        sim.geo = g;
        var b = newBody(g.parts, g);
        b.isMain = true;
        placeOnPad(b, 0);
        sim.bodies = [b];
      }
      emit('reset');
    }
    function placeOnPad(b, tilt) {
      var mp = massProps(b);
      b.mp = mp;
      b.th = tilt;
      var tailToCg = b.L - mp.scg;
      b.x = Math.sin(tilt) * tailToCg; b.y = Math.cos(tilt) * tailToCg + 0.05;
      b.vx = b.vy = 0; b.om = 0; b.onRail = true; b.railDist = 0; b.railV = 0;
    }

    function launch(opts) {
      opts = opts || {};
      sim.opts = {
        tilt: (opts.tilt || 0) * Math.PI / 180, wind: opts.wind || 0, spin: (opts.spin || 0) * 2 * Math.PI,
        autoStab: opts.autoStab !== false, autoStage: opts.autoStage !== false, autoChute: opts.autoChute !== false,
        breakMode: !!opts.breakMode, chuteAlt: +opts.chuteAlt || 0, seed: opts.seed || ((Math.random() * 1e9) | 0)
      };
      if (!sim.design) return false;
      var seed = sim.opts.seed;
      rand = rng(seed);
      var g = buildParts(sim.design, rand);
      sim.geo = g;
      var b = newBody(g.parts, g);
      b.isMain = true;
      placeOnPad(b, sim.opts.tilt);
      sim.bodies = [b];
      sim.t = 0; ended = false; liftoff = false; stageTimer = -1; maxQ = 0; maxQDone = false;
      gustOU = 0; gustT = 0; gustNext = 3 + rand() * 6;
      sim.summary = { apogee: 0, maxV: 0, maxMach: 0, maxQ: 0, peakG: 0, peakLoad: 0, railExitV: 0, lostControl: false,
        result: 'flying', landV: 0, landX: 0, time: 0, stages: 0, chuteRipped: false, seed: seed,
        payload: (b.parts[0] && b.parts[0].payload) || 0, wall: sim.design.wall, tilt: opts.tilt || 0, wind: sim.opts.wind, breakMode: sim.opts.breakMode };
      sim.state = 'flying';
      ignite(b, 0);
      emit('launch', { seed: seed });
      return true;
    }

    function lowestSection(b) { var m = -1; b.parts.forEach(function (p) { if (p.section > m) m = p.section; }); return m; }
    function ignite(b, delay) {
      var sec = lowestSection(b), any = false;
      b.parts.forEach(function (p) {
        if (p.type === 'engine' && p.section === sec && !p.burnedOut && engineHasProp(b, p, sim.geo.sections)) {
          p.firing = true; p.igniteT = delay; any = true;
        }
      });
      if (any) emit('ignition', { body: b.id, section: sec, delay: delay });
      return any;
    }

    function splitBody(b, k, dvSep) {
      var mp = massProps(b);
      var ux = Math.sin(b.th), uy = Math.cos(b.th);
      var tipX = b.x + mp.scg * ux, tipY = b.y + mp.scg * uy;
      var sK = b.parts[k].sTop;
      var upParts = b.parts.slice(0, k), loParts = b.parts.slice(k);
      var up = newBody(upParts, sim.geo), lo = newBody(loParts, sim.geo);
      [up, lo].forEach(function (nb, i) {
        var tX = i === 0 ? tipX : tipX - sK * ux, tY = i === 0 ? tipY : tipY - sK * uy;
        var m2 = massProps(nb); nb.mp = m2;
        nb.x = tX - m2.scg * ux; nb.y = tY - m2.scg * uy;
        nb.vx = b.vx; nb.vy = b.vy; nb.th = b.th; nb.om = b.om; nb.spin = b.spin; nb.roll = b.roll;
        nb.maxY = b.maxY; nb.rising = b.rising; nb.pastApogee = b.pastApogee;
        nb.traj = i === 0 ? b.traj : b.traj.slice(-2);
      });
      var mU = up.mp.m, mL = lo.mp.m, mT = mU + mL;
      up.vx += dvSep * ux * mL / mT; up.vy += dvSep * uy * mL / mT;
      lo.vx -= dvSep * ux * mU / mT; lo.vy -= dvSep * uy * mU / mT;
      up.isMain = b.isMain; up.broken = b.broken; lo.broken = b.broken;
      if (b.chuteOpen) { if (up.chutePart === b.chutePart) { up.chuteOpen = true; up.chuteFrac = b.chuteFrac; } else if (lo.chutePart === b.chutePart) { lo.chuteOpen = true; lo.chuteFrac = b.chuteFrac; } }
      var i0 = sim.bodies.indexOf(b);
      sim.bodies.splice(i0, 1, up, lo);
      return { up: up, lo: lo };
    }

    function stage() {
      var main = mainBody();
      if (!main || !main.alive || main.onRail) return false;
      var k = -1;
      main.parts.forEach(function (p, i) { if (p.type === 'decoupler') k = i; });
      if (k <= 0) return false;
      main.parts.forEach(function (p) { if (p.type === 'engine' && p.section >= main.parts[k].section) p.firing = false; });
      var r = splitBody(main, k, 2.0);
      r.lo.om += (rand() - 0.5) * 0.2;
      sim.summary.stages++;
      emit('stage', { upper: r.up.id, spent: r.lo.id, alt: r.up.y, t: sim.t });
      ignite(r.up, 0.8);
      return true;
    }

    function deployChute(b) {
      b = b || mainBody();
      if (!b || !b.alive || !b.chutePart || b.chuteOpen || b.chuteRipped || b.onRail) return false;
      b.chuteOpen = true; b.chuteFrac = 0; b.chuteT = 0;
      emit('chute', { body: b.id, alt: b.y, main: b.isMain });
      return true;
    }

    function mainBody() { for (var i = 0; i < sim.bodies.length; i++) if (sim.bodies[i].isMain) return sim.bodies[i]; return null; }

    // ----- control: autopilot plus manual -----
    function control(b, mp, V, gam, thrusting, dt) {
      var nose = b.isMain ? sim.input.nose : 0, tail = b.isMain ? sim.input.tail : 0;
      var auto = b.isMain && sim.opts.autoStab && !b.broken && !b.chuteOpen;
      var Mcmd = 0;
      if (auto) {
        var target = thrusting || V < 20 ? sim.opts.tilt : gam;
        if (b.onRail) target = b.th;
        var e = wrapPi(b.th - target);
        Mcmd = -mp.Iy * (6 * e + 4 * b.om) - (b.mAero || 0);
      }
      // gimbal
      var Mg = 0;
      b.parts.forEach(function (p) {
        if (p.type !== 'engine' || !p.firing || p.igniteT > 0 || p.eng.gimbal <= 0) { if (p.type === 'engine') p.gimCmd = 0; return; }
        var gmax = p.eng.gimbal * Math.PI / 180;
        var d = mp.scg - (p.sTop + p.len);
        var F = p.lastF || p.eng.Fvac * 0.8;
        var want = 0;
        if (auto && Math.abs(d) > 0.05 && F > 0) want = Math.asin(clamp((Mcmd - Mg) / (d * F), -1, 1));
        want += tail * gmax;
        p.gimCmd = clamp(want, -gmax, gmax);
        Mg += d * F * Math.sin(p.gimCmd);
      });
      var Mrem = Mcmd - Mg;
      var Frcs = 150 + 600 * b.A;
      b.rcsParts.forEach(function (p) {
        p.cmd = 0;
        if (p.prop <= 0 || b.broken) return;
        var d = mp.scg - partCenter(p);
        if (d > 0 && nose) p.cmd = nose;
        else if (d < 0 && tail) p.cmd = tail;
        else if (auto && Math.abs(d) > 0.1 && Math.abs(Mrem) > 0.25 * Math.abs(d) * Frcs) {
          p.cmd = (Mrem * d > 0) ? 1 : -1;
          Mrem -= p.cmd * d * Frcs;
        }
      });
      b.rcsF = Frcs;
    }

    // ----- one body, one substep -----
    function stepBody(b, dt) {
      var atm = atmosphere(b.y);
      var mp = massProps(b); b.mp = mp;
      var m = mp.m, scg = mp.scg;
      var ux = Math.sin(b.th), uy = Math.cos(b.th), nx = uy, ny = -ux;
      var wx = windProfile(b.y, sim.opts.wind) + (sim.gust) * Math.exp(-b.y / 12000);
      var vax = b.vx - wx, vay = b.vy;
      var V = Math.hypot(vax, vay);
      var q = 0.5 * atm.rho * V * V, M = V / atm.a;
      var gam = Math.atan2(vax, vay);
      var Fx = 0, Fy = 0, Mst = 0, Mdist = 0, Mdamp = 0;
      var pf = b.pf || (b.pf = []); pf.length = 0;  // point forces for loads: s, axial, normal
      var thrusting = false, Ftot = 0, sepAny = false, mdTot = 0, mThr = 0;

      // thrust
      for (var i = 0; i < b.parts.length; i++) {
        var p = b.parts[i];
        if (p.type !== 'engine' || !p.firing) continue;
        if (p.igniteT > 0) { p.igniteT -= dt; continue; }
        var e = p.eng, th = engineThrust(e, atm.p), F = th.F, md = mdotOf(e) * dt, frac = 1;
        if (e.kind === 'solid') {
          if (p.prop < 0.05 * p.cap) frac = Math.max(0, p.prop / (0.05 * p.cap));
          p.prop = Math.max(0, p.prop - md * Math.max(frac, 0.2));
          if (p.prop <= 1e-6) { p.prop = 0; p.firing = false; p.burnedOut = true; emit('burnout', { body: b.id, engine: e.key, t: sim.t, alt: b.y }); }
        } else {
          frac = drainLiquid(b, p.section, md);
          if (frac < 1) { p.firing = false; p.burnedOut = true; emit('burnout', { body: b.id, engine: e.key, t: sim.t, alt: b.y }); }
        }
        F *= frac;
        p.lastF = F; p.sep = th.sep; p.thrustFrac = F / e.Fvac;
        if (F <= 0) continue;
        thrusting = true; Ftot += F; mdTot += mdotOf(e) * frac; if (th.sep) sepAny = true;
        p.gim += clamp((p.gimCmd || 0) - p.gim, -0.35 * dt, 0.35 * dt);
        var fa = F * Math.cos(p.gim), fn = F * Math.sin(p.gim);
        Fx += fa * ux + fn * nx; Fy += fa * uy + fn * ny;
        var sE = p.sTop + p.len;
        Mst += (scg - sE) * fn; mThr += (scg - sE) * fn;
        var dist = F * p.mis;
        if (th.sep) { p.sideOU += (-p.sideOU / 0.15) * dt + Math.sqrt(2 / 0.15 * dt) * gauss(rand); dist += e.Fvac * 0.05 * p.sideOU; }
        Mdist += (scg - sE) * dist;
        pf.push(p.sTop, fa, fn + dist);
      }
      b.thrusting = thrusting;

      // control after knowing thrust state
      control(b, mp, V, gam, thrusting, dt);

      // aero
      var alpha = 0;
      if (V > 0.3 && atm.rho > 1e-9) {
        var vhx = vax / V, vhy = vay / V;
        var ca = ux * vhx + uy * vhy;
        var sa = vhx * uy - vhy * ux;
        alpha = Math.atan2(sa, ca);
        var cd = cdOf(b, M, thrusting);
        var Dg = q * b.A * cd;
        Fx -= Dg * vhx; Fy -= Dg * vhy;
        pf.push(0, -Dg * ca, 0);
        var dn = -Dg * (vhx * nx + vhy * ny);
        pf.push(b.L * 0.5, 0, dn);
        Mst += (scg - b.L * 0.5) * dn;
        var vu = vax * ux + vay * uy;
        var cfx = -(vax - vu * ux), cfy = -(vay - vu * uy);
        var cfl = Math.hypot(cfx, cfy);
        if (cfl > 1e-6) {
          var dir = (cfx * nx + cfy * ny) / cfl;
          var asa = Math.abs(sa), aca = Math.abs(ca);
          for (var li = 0; li < b.lift.length; li++) {
            var l = b.lift[li];
            var Nn = q * b.A * l.cna * asa * aca * dir;
            Fx += Nn * nx; Fy += Nn * ny;
            var mom = (scg - l.s) * Nn;
            pf.push(l.s, 0, Nn);
            Mst += mom;
          }
          var Nc = q * 1.2 * asa * asa * b.D * b.L * dir;
          Fx += Nc * nx; Fy += Nc * ny; pf.push(b.L * 0.5, 0, Nc);
          Mst += (scg - b.L * 0.5) * Nc;
        }
        b.mAero = Mst - mThr;
        // pitch damping, linear (potential) plus quadratic crossflow for tumbling
        var kd = 0;
        for (li = 0; li < b.lift.length; li++) { var dd = b.lift[li].s - scg; kd += q * b.A * b.lift[li].cna * dd * dd / V; }
        Mdamp -= kd * b.om;
      } else b.mAero = 0;
      var tumbleK = 0.5 * atm.rho * 1.2 * b.D * (Math.pow(scg, 4) + Math.pow(b.L - scg, 4)) / 4;
      Mdamp -= tumbleK * b.om * Math.abs(b.om);

      // spin: gyroscopic stiffness against overturning when aerodynamically unstable
      if (b.spin > 0.5) {
        if (b.sCp < scg && q > 1) {
          var Ma = q * b.A * b.cnaTot * (scg - b.sCp);
          var Sg = Math.pow(mp.Ix * b.spin, 2) / (4 * mp.Iy * Ma);
          Mst /= (1 + Sg);
        }
        Mdist /= (1 + Math.pow(b.spin / 3, 2));
        b.spin *= (1 - 0.03 * dt * (0.2 + atm.rho));
      }
      b.roll += b.spin * dt;

      // RCS
      var Frcs = b.rcsF || 0;
      b.rcsParts.forEach(function (rp) {
        if (!rp.cmd || rp.prop <= 0) return;
        var f = rp.cmd * Frcs;
        Fx += f * nx; Fy += f * ny;
        Mst += (scg - partCenter(rp)) * f;
        pf.push(partCenter(rp), 0, f);
        rp.prop = Math.max(0, rp.prop - Frcs / (RCS_ISP * G0) * dt);
      });

      // parachute
      if (b.chuteOpen && b.chutePart) {
        b.chuteT += dt;
        var tf = 2.5 + 0.15 * b.chutePart.chuteDia;
        b.chuteFrac = Math.min(1, Math.pow(b.chuteT / tf, 2));
        if (V > 0.3) {
          var Ac = Math.PI * Math.pow(b.chutePart.chuteDia / 2, 2) * b.chuteFrac;
          var Fc = q * 1.3 * Ac;
          if (Fc > b.chutePart.rating) {
            b.chuteOpen = false; b.chuteRipped = true;
            if (b.isMain) sim.summary.chuteRipped = true;
            emit('chuteRip', { body: b.id, force: Fc, alt: b.y, v: V, main: b.isMain });
          } else {
            var cvx = -vax / V, cvy = -vay / V;
            Fx += Fc * cvx; Fy += Fc * cvy;
            var sC = partCenter(b.chutePart);
            var cn = Fc * (cvx * nx + cvy * ny), cax = Fc * (cvx * ux + cvy * uy);
            Mst += (scg - sC) * cn;
            pf.push(sC, cax, cn);
            Mdamp -= 0.5 * atm.rho * V * 1.3 * Ac * Math.pow(Math.max(0, b.L - scg + 4), 2) * b.om * 0.2;
          }
        }
      }

      var Fng = { x: Fx, y: Fy };
      var g = gravity(b.y);
      Fy -= m * g;
      var Mth = Mst + Mdist + Mdamp;

      if (b.onRail) {
        var aAlong = (Fx * ux + Fy * uy) / m;
        if (b.railV <= 0 && aAlong <= 0) { b.railV = 0; }
        else {
          if (!liftoff) { liftoff = true; emit('liftoff', { t: sim.t }); }
          b.railV = Math.max(0, b.railV + aAlong * dt);
          b.railDist += b.railV * dt;
          b.x += b.railV * ux * dt; b.y += b.railV * uy * dt;
          b.vx = b.railV * ux; b.vy = b.railV * uy;
        }
        b.om = 0;
        if (b.railDist >= RAIL_LEN) {
          b.onRail = false;
          b.spin = sim.opts.spin;
          sim.summary.railExitV = b.railV;
          emit('railExit', { v: b.railV, t: sim.t });
        }
      } else {
        b.vx += Fx / m * dt; b.vy += Fy / m * dt;
        b.x += b.vx * dt; b.y += b.vy * dt;
        b.om += Mth / mp.Iy * dt;
        b.om = clamp(b.om, -40, 40);
        b.th = wrapPi(b.th + b.om * dt);
      }

      b.lastF = { ax: (Fng.x * ux + Fng.y * uy) / m, an: (Fng.x * nx + Fng.y * ny) / m, thdd: b.onRail ? 0 : Mth / mp.Iy };
      b.tele = { alt: b.y, V: V, vx: b.vx, vy: b.vy, M: M, q: q, rho: atm.rho, p: atm.p, alpha: alpha, gam: gam,
        thrust: Ftot, isp: mdTot > 0 ? Ftot / (mdTot * G0) : 0, sep: sepAny, m: m, scg: scg,
        margin: (b.sCp - scg) / b.D, gNG: Math.hypot(Fng.x, Fng.y) / m / G0, wind: wx };
      return b;
    }

    function cdOf(b, M, thrusting) {
      var g = M < 0.8 ? 0 : (M < 1.1 ? (M - 0.8) / 0.3 : Math.sqrt(1.1 / M));
      var c = b.cdFric * (M < 1 ? 1 : Math.pow(M, -0.25));
      c += b.sinD2 * (0.8 + 1.6 * g) + 0.05 * g;
      c += thrusting ? 0.04 : (M < 1 ? 0.12 + 0.13 * M * M : 0.25 / M);
      c += b.cdFins * (1 + 0.6 * g);
      return c;
    }

    // ----- structural loads along the body (beam statics with d'Alembert inertia) -----
    function computeLoads(b) {
      var lf = b.lastF, mp = b.mp;
      if (!lf || !mp) return 0;
      var ds = b.ds, n = NST;
      var ms = b.msBuf || (b.msBuf = new Float32Array(n));
      var fa = b.faBuf || (b.faBuf = new Float32Array(n));
      var fn = b.fnBuf || (b.fnBuf = new Float32Array(n));
      ms.set(b.stDry); fa.fill(0); fn.fill(0);
      b.parts.forEach(function (p) {
        if (p.prop <= 0) return;
        if (p.type === 'tank') { var f = p.cap > 0 ? p.prop / p.cap : 0, h = p.usable * f; spread(ms, p.sTop + p.len - 0.12 - h, Math.max(h, 0.01), p.prop, ds); }
        else spread(ms, p.sTop, p.len, p.prop, ds);
      });
      var pf = b.pf || [];
      for (var i = 0; i < pf.length; i += 3) {
        var j = clamp(Math.floor(pf[i] / ds), 0, n - 1);
        fa[j] += pf[i + 1]; fn[j] += pf[i + 2];
      }
      var t = b.wall, r = b.r;
      var Pcap = SIGMA_ALLOW * 2 * Math.PI * r * t, Mcap = SIGMA_ALLOW * Math.PI * r * r * t;
      var P = 0, Vs = 0, Mb = 0, sPrev = 0, worst = 0, worstJ = 0, om2 = b.om * b.om;
      for (j = 0; j < n; j++) {
        var sj = (j + 0.5) * ds, d = mp.scg - sj;
        Mb += Vs * (sj - sPrev); sPrev = sj;
        P += fa[j] - ms[j] * (lf.ax - om2 * d);
        Vs += fn[j] - ms[j] * (lf.an + lf.thdd * d);
        var sCut = (j + 1) * ds;
        var Mcut = Mb + Vs * (sCut - sj);
        var C = -P;
        var part = b.parts[b.stPart[Math.min(j + 1, n - 1)]] || b.parts[0];
        var k = part.strength * (part.type === 'tank' && part.prop > 0 ? 1.6 : 1);
        var ratio = (C > 0 ? C / Pcap : -C / (2 * Pcap)) / k + Math.abs(Mcut) / (Mcap * k);
        if (j === n - 1) ratio *= 0.2;
        b.loads[j] = ratio;
        if (ratio > worst) { worst = ratio; worstJ = j; }
      }
      b.loadMax = worst; b.loadWorstS = (worstJ + 1) * ds;
      return worst;
    }

    function breakup(b) {
      var s = b.loadWorstS, best = -1, bd = 1e9;
      for (var k = 1; k < b.parts.length; k++) {
        var p = b.parts[k];
        if (p.type === 'fins' || p.len <= 0) continue;
        var d = Math.abs(p.sTop - s);
        if (d < bd) { bd = d; best = k; }
      }
      b.parts.forEach(function (p) { if (p.type === 'engine') p.firing = false; });
      b.broken = true;
      emit('breakup', { body: b.id, alt: b.y, load: b.loadMax, s: s, t: sim.t });
      if (best > 0) {
        var r = splitBody(b, best, 0.5);
        r.up.om += (rand() - 0.5) * 3; r.lo.om += (rand() - 0.5) * 3;
        r.up.broken = r.lo.broken = true;
      }
      if (sim.summary) { sim.summary.result = 'broke up'; if (!sim.summary.breakT) sim.summary.breakT = sim.t; }
    }

    function land(b) {
      var v = Math.hypot(b.vx, b.vy);
      b.alive = false; b.y = 0; b.landV = v;
      b.parts.forEach(function (p) { if (p.type === 'engine') p.firing = false; if (p.type === 'rcs') p.cmd = 0; });
      b.outcome = b.broken ? 'debris' : (v < 9 ? 'landed' : (v < 20 ? 'hard landing' : 'crashed'));
      emit(b.outcome === 'landed' ? 'landed' : 'impact', { body: b.id, v: v, x: b.x, main: b.isMain, outcome: b.outcome });
      if (b.isMain && sim.summary) {
        sim.summary.landV = v; sim.summary.landX = b.x;
        if (sim.summary.result !== 'broke up') sim.summary.result = b.outcome;
      }
    }

    function updateGust(dt) {
      var w0 = sim.opts.wind;
      var sig = 0.25 * w0 + (w0 > 0 ? 0.8 : 0);
      gustOU += (-gustOU / 2) * dt + sig * Math.sqrt(dt) * gauss(rand);
      gustNext -= dt;
      var disc = 0;
      if (gustNext <= 0 && gustDur <= 0 && w0 > 0) {
        gustDur = 1.5 + rand() * 1.5; gustT = 0; gustAmp = (rand() < 0.5 ? -1 : 1) * (0.6 * w0 + 2) * (0.5 + rand() * 0.5);
        emit('gust', { amp: gustAmp });
      }
      if (gustDur > 0) {
        gustT += dt;
        disc = gustAmp * 0.5 * (1 - Math.cos(2 * Math.PI * gustT / gustDur));
        if (gustT >= gustDur) { gustDur = 0; gustNext = 4 + rand() * 7; }
      }
      sim.gust = gustOU + disc;
    }

    function substep(dt) {
      updateGust(dt);
      var main = mainBody();
      for (var i = 0; i < sim.bodies.length; i++) {
        var b = sim.bodies[i];
        if (!b.alive) continue;
        stepBody(b, dt);
        if (b.vy > 0.5 && !b.onRail) b.rising = true;
        if (b.y > b.maxY) b.maxY = b.y;
        if (b.rising && !b.pastApogee && b.vy <= 0) {
          b.pastApogee = true;
          emit('apogee', { body: b.id, alt: b.maxY, main: b.isMain, t: sim.t, x: b.x });
        }
        if (sim.opts.autoChute && b.pastApogee && !b.chuteOpen && !b.chuteRipped && b.chutePart && !b.broken) {
          b.apoT = (b.apoT || 0) + dt;
          var lowMode = sim.opts.chuteAlt > 0;
          if ((!lowMode && b.apoT > 0.6) || (lowMode && b.y < sim.opts.chuteAlt) || (lowMode && b.maxY < sim.opts.chuteAlt && b.apoT > 0.6)) deployChute(b);
        }
        if (!b.onRail && b.y <= 0 && b.vy < 0) land(b);
        else if (b.onRail && b.railV <= 0 && liftoff && b.y < 0.06) { /* settled on pad */ }
      }
      // telemetry bookkeeping for main
      main = mainBody();
      if (main && main.alive) {
        var T = main.tele, s = sim.summary;
        if (main.maxY > s.apogee) s.apogee = main.maxY;
        if (T.V > s.maxV && !main.onRail) s.maxV = T.V;
        if (T.M > s.maxMach) s.maxMach = T.M;
        if (T.q > s.maxQ) s.maxQ = T.q;
        if (T.gNG > s.peakG && main.thrusting) s.peakG = T.gNG;
        if (!maxQDone && liftoff && T.q > 500 && T.q < maxQ * 0.97) { maxQDone = true; emit('maxq', { q: maxQ, alt: main.y, t: sim.t }); }
        if (T.q > maxQ) maxQ = T.q;
        if (Math.abs(T.alpha) > 0.8 && T.q > 800 && !main.chuteOpen && !main.pastApogee) {
          if (!s.lostControl) emit('tumble', { alt: main.y, t: sim.t });
          s.lostControl = true;
        }
        // auto staging
        var sec = lowestSection(main), hasDec = main.parts.some(function (p) { return p.type === 'decoupler'; });
        var firing = main.parts.some(function (p) { return p.type === 'engine' && p.firing; });
        var spentAll = main.parts.filter(function (p) { return p.type === 'engine' && p.section === sec; }).every(function (p) { return p.burnedOut || !p.firing; });
        if (sim.opts.autoStage && hasDec && liftoff && !main.onRail && !firing && spentAll && stageTimer < 0) stageTimer = 0.5;
      }
      if (stageTimer >= 0) { stageTimer -= dt; if (stageTimer < 0) { stage(); stageTimer = -1; } }
    }

    function step(realDt) {
      if (sim.state !== 'flying') return;
      var simDt = Math.min(0.1, realDt) * sim.warp;
      var thin = sim.bodies.every(function (b) { return !b.alive || (b.y > 120000 && !b.thrusting && !b.onRail); });
      var calm = sim.bodies.every(function (b) { return !b.alive || (!b.thrusting && !b.onRail && b.tele && b.tele.q < 5000 && (!b.chuteOpen || b.chuteFrac >= 1)); });
      var n = Math.min(1500, Math.ceil(simDt / (thin ? 0.02 : (calm ? 0.005 : DT))));
      var h = simDt / n;
      for (var i = 0; i < n; i++) {
        substep(h);
        sim.t += h;
        if (ended) break;
        // loads at 50 Hz sim time for break checks
        if ((i & 7) === 0) checkLoads();
      }
      checkLoads();
      // trajectories
      sim.bodies.forEach(function (b) {
        if (!b.alive) return;
        if (sim.t - b.trajT >= 0.2 || !b.traj.length) { b.traj.push(b.x, b.y); b.trajT = sim.t; if (b.traj.length > 12000) b.traj.splice(0, 2); }
      });
      checkEnd();
    }
    function checkLoads() {
      for (var i = 0; i < sim.bodies.length; i++) {
        var b = sim.bodies[i];
        if (!b.alive || b.onRail && !liftoff) continue;
        var w = computeLoads(b);
        if (b.isMain && sim.summary && w > sim.summary.peakLoad) sim.summary.peakLoad = w;
        if (w > 1 && sim.opts.breakMode && !b.broken) { breakup(b); break; }
      }
    }
    function checkEnd() {
      if (ended) return;
      var main = mainBody();
      var s = sim.summary;
      var padFail = !liftoff && sim.t > 2 && !sim.bodies[0].parts.some(function (p) { return p.type === 'engine' && (p.firing); });
      var allDown = sim.bodies.every(function (b) { return !b.alive || (b.broken && b.isMain === false && false); });
      var mainDown = main && !main.alive;
      var brokenDown = s.result === 'broke up' && sim.bodies.every(function (b) { return !b.alive; });
      if (padFail || mainDown || brokenDown || sim.t > 3600 || (s.result === 'broke up' && sim.t - (s.breakT || 0) > 600)) {
        ended = true;
        if (padFail) s.result = 'stuck on pad';
        if (s.result === 'flying') s.result = 'timeout';
        s.time = sim.t;
        sim.state = 'done';
        emit('end', s);
      }
    }

    function setWarp(w) { sim.warp = clamp(w, 0.25, 200); }

    sim.on = on; sim.off = off; sim.setDesign = setDesign; sim.reset = reset; sim.launch = launch;
    sim.step = step; sim.stage = stage; sim.deployChute = function () { return deployChute(); }; sim.setWarp = setWarp;
    sim.mainBody = mainBody;
    sim.analyze = function () { return sim.design ? analyze(sim.design) : null; };
    return sim;
  }

  root.RocketSim = { create: create, analyze: analyze, ENGINES: ENGINES, atmosphere: atmosphere, NST: NST, engineThrust: engineThrust };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.RocketSim;
})(typeof window !== 'undefined' ? window : globalThis);
