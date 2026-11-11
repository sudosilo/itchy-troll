// A Canticle for Pajamastan engine, character maker module, version one.
// Built from a-canticle-for-pajamastan-v1-spec-maker.md. Numbers and palettes come from the maker tuning file.
// Save slots are written through a storage object with get and set, so it works with localStorage or a server.
(function (root) {
  var C = root.Canticle = root.Canticle || {};

  function checkName(t, name, filterFn) {
    var n = String(name || '');
    if (n.length < t.nameMin) return { ok: false, reason: 'too short' };
    if (n.length > t.nameMax) return { ok: false, reason: 'too long' };
    if (!new RegExp(t.nameChars).test(n)) return { ok: false, reason: 'letters, numbers, spaces and . \' ! - only' };
    if (/^ | $/.test(n)) return { ok: false, reason: 'no space at the start or end' };
    if (/  /.test(n)) return { ok: false, reason: 'no double spaces' };
    if (filterFn && filterFn(n) !== n) return { ok: false, reason: 'that word is not allowed' };
    return { ok: true };
  }

  function clamp(v, r) { return Math.max(r[0], Math.min(r[1], v)); }

  function randomLook(t, className, rand) {
    rand = rand || Math.random;
    function pick(list) { return list[Math.floor(rand() * list.length)]; }
    var hr = t.heightRange[className], br = t.buildRange[className];
    return { height: +(hr[0] + rand() * (hr[1] - hr[0])).toFixed(2), build: +(br[0] + rand() * (br[1] - br[0])).toFixed(2), head: pick(t.heads), hair: pick(t.hair), face: pick(t.faces), skin: pick(t.skin), hairColor: pick(t.hairColors), costume: pick(t.costume) };
  }

  function fixLook(t, className, look) {
    var l = JSON.parse(JSON.stringify(look || {}));
    l.height = clamp(+l.height || 1, t.heightRange[className]);
    l.build = clamp(+l.build || 1, t.buildRange[className]);
    if (t.heads.indexOf(l.head) < 0) l.head = t.heads[0];
    if (t.hair.indexOf(l.hair) < 0) l.hair = t.hair[0];
    if (t.faces.indexOf(l.face) < 0) l.face = t.faces[0];
    if (t.skin.indexOf(l.skin) < 0) l.skin = t.skin[0];
    if (t.hairColors.indexOf(l.hairColor) < 0) l.hairColor = t.hairColors[0];
    if (t.costume.indexOf(l.costume) < 0) l.costume = t.costume[0];
    return l;
  }

  function make(t, className, name, look, filterFn) {
    var chk = checkName(t, name, filterFn);
    if (!chk.ok) return chk;
    return { ok: true, character: { className: className, name: name, look: fixLook(t, className, look), level: 1, exp: 0, boosts: {}, inventory: {}, storage: [], cards: [], companion: null, flags: {}, made: Date.now() } };
  }

  // store: { get(key) -> string|null, set(key, string) }. Whole slot written at once.
  function slots(t, store, prefix) {
    prefix = prefix || 'canticle-slot-';
    return {
      list: function () { var out = []; for (var i = 0; i < t.slots; i++) { var raw = store.get(prefix + i); out.push(raw ? JSON.parse(raw) : null); } return out; },
      save: function (i, ch) { if (i < 0 || i >= t.slots) return false; store.set(prefix + i, JSON.stringify(ch)); return true; },
      load: function (i) { var raw = store.get(prefix + i); return raw ? JSON.parse(raw) : null; },
      remove: function (i, confirmedTwice) { if (!confirmedTwice) return 'confirm twice'; store.set(prefix + i, ''); return 'deleted'; }
    };
  }

  var api = { checkName: checkName, randomLook: randomLook, fixLook: fixLook, make: make, slots: slots };
  C.maker = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
