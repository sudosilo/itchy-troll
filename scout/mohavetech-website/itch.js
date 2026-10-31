/* Apps published on itch.io. Read live from the Itchy Troll ledger, so new itch releases show up without a rebuild. */
(function () {
  var LEDGER = "https://raw.githubusercontent.com/sudosilo/itchy-troll/main/itch-ledger.json";
  var PURPLE = "#8a4bd6";
  var REPO_TO_HUB = {
    "kvs-roulette": "kvs", "song-offset-listener": "offset-listener", "tanks-and-zombies": "tanksandzombies",
    "cross-venue-equivalence-engine": "equivalence-engine", "ebutuoy-frontend": "ebutuoy", "shitty-ass-trading-app": "shitty-ass-trading",
    "threat-atlas-v3": "threat-atlas", "tilespinneratlas": "tile-spinner", "dronesim": "dronesim-blue", "coffeekit": "coffeekit1",
    "rat": "rat-site", "skwiggle-v105": "skwiggle", "rtss": "rtss"
  };
  var cache = {};
  window.ITCH_COLOR = PURPLE;
  window.itchPaint = function (hex) {
    if (typeof hex !== "string") return hex;
    if (cache[hex]) return cache[hex];
    var c = document.createElement("canvas");
    c.width = c.height = 8;
    var g = c.getContext("2d");
    g.fillStyle = hex; g.fillRect(0, 0, 8, 8);
    g.strokeStyle = PURPLE; g.lineWidth = 2.6; g.lineCap = "square";
    g.beginPath(); g.moveTo(-2, 10); g.lineTo(10, -2); g.moveTo(-2, 2); g.lineTo(2, -2); g.moveTo(6, 10); g.lineTo(10, 6); g.stroke();
    var p = g.createPattern(c, "repeat");
    cache[hex] = p;
    return p;
  };
  var pending = [];
  window.ITCH_MAP = null;
  function mark(o) {
    if (!o || !o.name || o.itch || !window.ITCH_MAP) return;
    var page = window.ITCH_MAP[o.name];
    if (!page) return;
    o.itch = page;
    if (typeof o.color === "string") { o.base = o.color; o.color = window.itchPaint(o.color); }
    if (typeof o.accent === "string") o.accent = o.color;
  }
  window.itchApply = function (list) {
    if (!list) return list;
    if (window.ITCH_MAP) list.forEach(mark); else pending.push(list);
    return list;
  };
  var timeout = new Promise(function (r) { setTimeout(function () { r(null); }, 3000); });
  var load = fetch(LEDGER + "?t=" + Math.floor(Date.now() / 600000), { cache: "no-store" })
    .then(function (r) { return r.ok ? r.json() : {}; })
    .catch(function () { return {}; });
  window.ITCH = Promise.race([load, timeout]).then(function (ledger) {
    var map = {};
    Object.keys(ledger || {}).forEach(function (repo) {
      var e = ledger[repo];
      if (!e || e.state !== "uploaded") return;
      var hub = REPO_TO_HUB[repo.toLowerCase()] || repo.toLowerCase();
      map[hub] = "https://" + String(e.page || ("sudosilo.itch.io/" + repo)).replace(/^https?:\/\//, "");
    });
    window.ITCH_MAP = map;
    pending.forEach(function (l) { l.forEach(mark); });
    pending = [];
    return map;
  });
})();
