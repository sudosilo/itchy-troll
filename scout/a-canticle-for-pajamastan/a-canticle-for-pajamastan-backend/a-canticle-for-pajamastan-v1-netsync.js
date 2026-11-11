// A Canticle for Pajamastan engine, network sync module, version one.
// Built from a-canticle-for-pajamastan-v1-spec-netsync.md.
// Runs the same in the browser and in a Node relay, so both sides validate with one rulebook.
(function (root) {
  var C = root.Canticle = root.Canticle || {};

  var MAX_SLOTS = 4;
  var MAX_TARGETS = 8;
  var MAX_FLOOR = 18;
  var ATTACK_KINDS = ['quick', 'heavy', 'special'];

  // owner: 'self' means the body.actor must be the sender's own character.
  // owner: 'leader' means only the room leader may send it.
  var TYPES = {
    setPosition: { owner: 'self', body: ['actor', 'x', 'y', 'floor'] },
    walkTo: { owner: 'self', body: ['actor', 'x', 'y'] },
    runTo: { owner: 'self', body: ['actor', 'x', 'y'] },
    stopAt: { owner: 'self', body: ['actor', 'x', 'y', 'heading'] },
    attack: { owner: 'self', body: ['actor', 'kind', 'targets', 'combo'] },
    hitResult: { owner: 'leader', body: ['target', 'damage', 'crit'] },
    changeHp: { owner: 'self', body: ['actor', 'hp'] },
    die: { owner: 'self', body: ['actor'] },
    revive: { owner: 'self', body: ['actor'] },
    changeFloor: { owner: 'self', body: ['actor', 'floor'] },
    warp: { owner: 'self', body: ['actor', 'x', 'y'] },
    dropItem: { owner: 'leader', body: ['itemId', 'item', 'x', 'y', 'floor'] },
    pickUp: { owner: 'self', body: ['actor', 'itemId'] },
    useItem: { owner: 'self', body: ['actor', 'itemId'] },
    equip: { owner: 'self', body: ['actor', 'itemId'] },
    unequip: { owner: 'self', body: ['actor', 'itemId'] },
    levelUp: { owner: 'self', body: ['actor', 'level'] },
    stepSwitch: { owner: 'self', body: ['actor', 'room', 'switch', 'on'] },
    openDoor: { owner: 'self', body: ['actor', 'room', 'door'] },
    roomCleared: { owner: 'leader', body: ['room'] },
    enemyState: { owner: 'leader', body: ['enemy', 'state', 'x', 'y', 'hp'] },
    floorSeed: { owner: 'leader', body: ['floor', 'seed'] },
    quickChat: { owner: 'self', body: ['actor', 'code'] },
    symbolChat: { owner: 'self', body: ['actor', 'nums'] }
  };

  function make(type, slot, body) {
    return { t: type, s: slot, b: body || {} };
  }

  function isNum(v) { return typeof v === 'number' && isFinite(v); }

  // room: { slots: { slotNumber: { actor } }, leader: slotNumber, entities: function(id) -> bool }
  function validate(msg, room) {
    if (!msg || typeof msg !== 'object') return 'not an object';
    var spec = TYPES[msg.t];
    if (!spec) return 'unknown type';
    if (!isNum(msg.s) || msg.s < 0 || msg.s >= MAX_SLOTS) return 'bad slot';
    var who = room.slots[msg.s];
    if (!who) return 'empty slot';
    var b = msg.b;
    if (!b || typeof b !== 'object') return 'no body';
    for (var i = 0; i < spec.body.length; i++) if (!(spec.body[i] in b)) return 'missing ' + spec.body[i];
    if (spec.owner === 'self' && b.actor !== who.actor) return 'not owner';
    if (spec.owner === 'leader' && msg.s !== room.leader) return 'not leader';
    if ('floor' in b && (!isNum(b.floor) || b.floor < 0 || b.floor > MAX_FLOOR)) return 'bad floor';
    if ('x' in b && !isNum(b.x)) return 'bad x';
    if ('y' in b && !isNum(b.y)) return 'bad y';
    if ('hp' in b && (!isNum(b.hp) || b.hp < 0)) return 'bad hp';
    if ('damage' in b && (!isNum(b.damage) || b.damage < 0)) return 'bad damage';
    if (msg.t === 'attack') {
      if (ATTACK_KINDS.indexOf(b.kind) < 0) return 'bad kind';
      if (!Array.isArray(b.targets) || b.targets.length > MAX_TARGETS) return 'bad targets';
      if (room.entities) for (var j = 0; j < b.targets.length; j++) if (!room.entities(b.targets[j])) return 'unknown target';
    }
    if (msg.t === 'quickChat' && (!b.code || !isNum(b.code.c) || !isNum(b.code.i))) return 'bad chat code';
    if (msg.t === 'symbolChat' && (!Array.isArray(b.nums) || b.nums.length > 64 || !b.nums.every(isNum))) return 'bad symbol';
    if ((msg.t === 'hitResult') && room.entities && !room.entities(b.target)) return 'unknown target';
    if ((msg.t === 'enemyState') && room.entities && !room.entities(b.enemy)) return 'unknown enemy';
    return null;
  }

  // The leader is the earliest joined player still in the room.
  function pickLeader(joinOrder, slots) {
    for (var i = 0; i < joinOrder.length; i++) if (slots[joinOrder[i]]) return joinOrder[i];
    return null;
  }

  // Smooth a remote actor toward its newest reported position.
  function ease(current, reported, dt, rate) {
    var k = 1 - Math.exp(-(rate || 10) * dt);
    current.x += (reported.x - current.x) * k;
    current.y += (reported.y - current.y) * k;
    return current;
  }

  var api = { TYPES: TYPES, MAX_SLOTS: MAX_SLOTS, make: make, validate: validate, pickLeader: pickLeader, ease: ease };
  C.netsync = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
