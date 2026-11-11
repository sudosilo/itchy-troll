// A Canticle for Pajamastan engine, rng module, version one.
// Seeded random streams split into named channels, so one kind of roll never shifts another.
(function (root) {
  var C = root.Canticle = root.Canticle || {};

  function hashString(text) {
    var h = 2166136261 >>> 0;
    for (var i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
  }

  function stream(seed) {
    var state = seed >>> 0;
    function next() {
      state = (state + 0x6D2B79F5) >>> 0;
      var t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    return {
      next: next,
      ratio: next,
      below: function (n) { return Math.floor(next() * n); },
      range: function (lo, hi) { return lo + next() * (hi - lo); },
      intRange: function (lo, hi) { return lo + Math.floor(next() * (hi - lo + 1)); },
      chance: function (p) { return next() < p; },
      percent: function () { return next() * 100; },
      pick: function (list) { return list[Math.floor(next() * list.length)]; },
      weighted: function (weights) {
        var keys = Array.isArray(weights) ? weights.map(function (_, i) { return i; }) : Object.keys(weights);
        var total = 0;
        for (var i = 0; i < keys.length; i++) total += Math.max(0, Number(weights[keys[i]]) || 0);
        if (total <= 0) return keys[0];
        var roll = next() * total;
        for (var j = 0; j < keys.length; j++) {
          roll -= Math.max(0, Number(weights[keys[j]]) || 0);
          if (roll < 0) return keys[j];
        }
        return keys[keys.length - 1];
      },
      getState: function () { return state; },
      setState: function (s) { state = s >>> 0; }
    };
  }

  function channels(seed) {
    var base = typeof seed === 'string' ? hashString(seed) : (seed >>> 0);
    var made = {};
    return {
      seed: base,
      get: function (name) {
        if (!made[name]) made[name] = stream((base ^ hashString(String(name))) >>> 0);
        return made[name];
      }
    };
  }

  var api = { stream: stream, channels: channels, hashString: hashString };
  C.rng = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
