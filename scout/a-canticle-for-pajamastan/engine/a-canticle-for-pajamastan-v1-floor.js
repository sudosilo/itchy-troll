// A Canticle for Pajamastan engine, floor module, version one.
// Built from a-canticle-for-pajamastan-v1-spec-floor.md. Numbers come from the floor tuning file.
// Same seed, same tuning and same depth always build the same floor.
(function (root) {
  var C = root.Canticle = root.Canticle || {};
  var DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  function key(x, y) { return x + ',' + y; }

  function generate(t, seed, opts) {
    opts = opts || {};
    var depth = opts.depth || 0;
    var lastFloor = !!opts.lastFloor;
    var rng = C.rng || (typeof require === 'function' ? require('./a-canticle-for-pajamastan-v1-rng.js') : null);
    var R = rng.channels('floor:' + seed + ':' + depth);
    var layout = R.get('layout'), kinds = R.get('kinds'), fill = R.get('fill');
    var taken = {};
    var rooms = [];
    var edges = [];

    function addRoom(x, y, kind, onMain) {
      var r = { id: rooms.length, gx: x, gy: y, kind: kind, main: onMain, doors: [], containers: [], waves: 0, switches: 0, playersNeeded: 0, keyFor: null };
      rooms.push(r); taken[key(x, y)] = r; return r;
    }
    function link(a, b) {
      var e = { a: a.id, b: b.id, lockedBy: null };
      edges.push(e); a.doors.push(b.id); b.doors.push(a.id); return e;
    }
    function freeNeighbors(r) {
      return DIRS.map(function (d) { return [r.gx + d[0], r.gy + d[1]]; }).filter(function (p) { return !taken[key(p[0], p[1])]; });
    }

    // Main path, retrying until a walk of full length fits.
    var length = layout.intRange(t.mainPathMin, t.mainPathMax);
    var path;
    for (var attempt = 0; attempt < 40; attempt++) {
      taken = {}; rooms = []; edges = [];
      path = [addRoom(0, 0, 'entry', true)];
      var ok = true;
      for (var i = 1; i < length; i++) {
        var opts2 = freeNeighbors(path[path.length - 1]);
        if (!opts2.length) { ok = false; break; }
        var p = layout.pick(opts2);
        var r = addRoom(p[0], p[1], 'plain', true);
        link(path[path.length - 1], r);
        path.push(r);
      }
      if (ok) break;
    }
    path[path.length - 1].kind = lastFloor ? 'boss' : 'exit';

    // Room kinds on the main path, deeper floors lean toward wave rooms.
    var weights = {};
    Object.keys(t.roomKindWeights).forEach(function (k) { weights[k] = t.roomKindWeights[k]; });
    weights.wave = (weights.wave || 0) + depth * t.waveRoomDepthBonus;
    for (var m = 1; m < path.length - 1; m++) path[m].kind = kinds.weighted(weights);

    // Side branches.
    var branches = [];
    for (var b = 1; b < path.length - 1; b++) {
      if (!layout.chance(t.branchChance)) continue;
      var from = path[b];
      var len = layout.intRange(1, t.branchLengthMax);
      var chain = [];
      for (var s = 0; s < len; s++) {
        var fn = freeNeighbors(from);
        if (!fn.length) break;
        var q = layout.pick(fn);
        var br = addRoom(q[0], q[1], s === len - 1 ? 'cache' : kinds.weighted({ plain: 3, switch: 1 }), false);
        br.branchOf = path[b].id;
        link(from, br);
        chain.push(br);
        from = br;
      }
      if (chain.length) branches.push({ at: b, rooms: chain });
    }

    // Keys: lock a main path door, place its key in a branch that hangs off an earlier room.
    var keysMade = 0;
    var usable = branches.slice();
    while (keysMade < t.keysMax && usable.length) {
      var bi = fill.below(usable.length);
      var branch = usable.splice(bi, 1)[0];
      var lockIndex = fill.intRange(branch.at, path.length - 2);
      var edge = edges.filter(function (e) { return e.a === path[lockIndex].id && e.b === path[lockIndex + 1].id; })[0];
      if (!edge || edge.lockedBy !== null) continue;
      var holder = branch.rooms[branch.rooms.length - 1];
      holder.keyFor = keysMade;
      edge.lockedBy = keysMade;
      keysMade++;
    }

    // Fill rooms with waves, switches and containers.
    rooms.forEach(function (r) {
      if (r.kind === 'wave') r.waves = fill.intRange(t.wavesMin, t.wavesMax) + Math.floor(depth * t.wavesDepthBonus);
      if (r.kind === 'switch') {
        r.switches = fill.intRange(1, t.switchCountMax);
        r.playersNeeded = fill.intRange(1, t.switchPlayersNeededMax);
      }
      if (r.kind === 'rest' || r.kind === 'entry') return;
      var n = fill.intRange(0, t.containersPerRoomMax) + (r.kind === 'cache' ? 2 : 0);
      for (var c = 0; c < n; c++) r.containers.push({ trapped: fill.chance(t.trapChance) });
    });

    return { seed: seed, depth: depth, rooms: rooms, edges: edges, path: path.map(function (r) { return r.id; }) };
  }

  var api = { generate: generate };
  C.floor = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
