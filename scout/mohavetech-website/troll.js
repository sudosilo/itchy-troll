(function () {
  var BASE = "https://raw.githubusercontent.com/sudosilo/control-troll/main/";
  var GREEN = "#00ff00", YELLOW = "#ffff00", RED = "#ff4444", GRAY = "#888888", PINK = "#ff00ff";
  var STALE_HOURS = 48;

  function getJson(file) {
    return fetch(BASE + file, { cache: "no-store" }).then(function (r) {
      if (!r.ok) throw new Error(file + " " + r.status);
      return r.json();
    });
  }

  function keyOf(a) {
    try {
      var h = new URL(a.href).hostname.toLowerCase();
      return h.replace(/\.vercel\.app$/, "");
    } catch (e) {
      return a.textContent.trim();
    }
  }

  function klass(app) {
    if (!app.up) return "d";
    var tests = app.tests || [];
    if (tests.some(function (t) { return !t.pass; })) return "f";
    if ((app.errors || []).length) return "e";
    return "o";
  }

  var WORD = { o: "good", e: "working with console errors", f: "working but a feature test failed", d: "down", s: "status is stale", u: "not checked yet" };
  function colorOf(s) {
    if (s === "o") return GREEN;
    if (s === "e" || s === "f") return YELLOW;
    if (s === "d") return RED;
    return GRAY;
  }

  function line(box, text, color) {
    var p = document.createElement("div");
    p.textContent = text;
    p.style.margin = "3px 0";
    if (color) p.style.color = color;
    box.appendChild(p);
  }

  function panel(color) {
    var box = document.createElement("div");
    box.style.display = "none";
    box.style.width = "90%";
    box.style.boxSizing = "border-box";
    box.style.background = "black";
    box.style.color = color;
    box.style.border = "1px solid " + color;
    box.style.fontFamily = "monospace";
    box.style.fontSize = "12px";
    box.style.padding = "6px 8px";
    box.style.margin = "4px 0";
    box.className = "troll-panel";
    return box;
  }

  function arrow(text, color, box) {
    var t = document.createElement("span");
    t.textContent = " " + text;
    t.style.cursor = "pointer";
    t.style.color = color;
    t.style.marginLeft = "10px";
    t.className = "troll-toggle";
    t.addEventListener("click", function () {
      box.style.display = box.style.display === "none" ? "block" : "none";
    });
    return t;
  }

  function ageText(iso) {
    var mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
    if (mins < 90) return mins + " minutes ago";
    var hrs = Math.round(mins / 60);
    if (hrs < 48) return hrs + " hours ago";
    return Math.round(hrs / 24) + " days ago";
  }

  function dayKey(offset) {
    var d = new Date(Date.now() - 7 * 3600 * 1000 - offset * 86400000);
    return d.toISOString().slice(0, 10);
  }

  function strip(box, name, hist) {
    if (!hist || !hist.days) return;
    var row = document.createElement("div");
    row.style.margin = "6px 0 2px";
    var any = false;
    for (var i = 29; i >= 0; i--) {
      var rec = hist.days[dayKey(i)] && hist.days[dayKey(i)].apps[name];
      var c = "#333333";
      if (rec) {
        any = true;
        c = rec.s === "d" ? RED : (rec.s === "f" || rec.s === "e") ? YELLOW : GREEN;
      }
      var sq = document.createElement("span");
      sq.style.display = "inline-block";
      sq.style.width = "6px";
      sq.style.height = "10px";
      sq.style.marginRight = "1px";
      sq.style.background = c;
      row.appendChild(sq);
    }
    if (any) {
      box.appendChild(row);
      line(box, "last 30 days, oldest on the left", GRAY);
    }
  }

  function buildAbout(box, spec) {
    if (!spec) {
      line(box, "No spec on file in control troll yet.", GRAY);
      return;
    }
    if (spec.active === false) line(box, "Marked inactive in control troll.", YELLOW);
    (spec.features || []).forEach(function (f) { line(box, f); });
    if (spec.keepSeparate) line(box, "Kept separate: " + spec.keepSeparate, PINK);
    if (spec.overlap) line(box, "Overlap: " + (typeof spec.overlap === "string" ? spec.overlap : JSON.stringify(spec.overlap)), PINK);
    if (spec.futureIdea) line(box, "Future idea: " + spec.futureIdea, PINK);
    if (spec.problem) line(box, "Problem: " + spec.problem, YELLOW);
    if (spec.note) line(box, "Note: " + spec.note, PINK);
    if (!(spec.features || []).length && !spec.keepSeparate && !spec.overlap && !spec.futureIdea && !spec.problem && !spec.note) {
      line(box, "Spec exists but has no description yet.", GRAY);
    }
  }

  function buildStatus(box, app, state, checkedAt, hist) {
    line(box, "Status: " + WORD[state], colorOf(state));
    if (!app) {
      line(box, "Control troll has not checked this one yet. It checks every project linked on this page once a day.", GRAY);
      return;
    }
    var tests = app.tests || [];
    var failing = tests.filter(function (t) { return !t.pass; });
    line(box, "HTTP " + (app.status || "none") + ", " + (app.ms != null ? app.ms + " ms" : "no load") + (tests.length ? ", tests " + (tests.length - failing.length) + " of " + tests.length + " passing" : ""));
    failing.forEach(function (t) { line(box, "FAIL " + t.name + (t.error ? ": " + t.error : ""), YELLOW); });
    (app.errors || []).slice(0, 4).forEach(function (e) { line(box, e, state === "d" ? RED : YELLOW); });
    line(box, "Checked " + ageText(checkedAt), GRAY);
    strip(box, app.name, hist);
  }

  function run(status, specs, hist) {
    var byName = {};
    (status.apps || []).forEach(function (a) { byName[a.name] = a; });
    var stale = (Date.now() - new Date(status.checkedAt).getTime()) > STALE_HOURS * 3600000;

    var links = document.querySelectorAll("#category-view a, #alpha-view a");
    Array.prototype.forEach.call(links, function (a) {
      var p = a.parentNode;
      if (!p || p.getAttribute("data-troll")) return;
      p.setAttribute("data-troll", "1");
      var key = keyOf(a);
      var app = byName[key] || byName[a.textContent.trim()];
      var spec = specs[key] || specs[a.textContent.trim()];

      var state = app ? klass(app) : "u";
      if (stale && app) state = "s";

      var aboutBox = panel(PINK);
      buildAbout(aboutBox, spec);
      var statBox = panel(colorOf(state));
      buildStatus(statBox, app, state, status.checkedAt, hist);

      p.appendChild(arrow("\u25be", PINK, aboutBox));
      p.appendChild(arrow("\u25be", colorOf(state), statBox));
      p.parentNode.insertBefore(statBox, p.nextSibling);
      p.parentNode.insertBefore(aboutBox, p.nextSibling);
    });
  }

  function start() {
    Promise.all([getJson("status.json"), getJson("specs/all.json"), getJson("history.json").catch(function () { return null; })])
      .then(function (r) { run(r[0], r[1], r[2]); })
      .catch(function () {});
  }

  if (document.readyState === "complete") start();
  else window.addEventListener("load", start);
})();
/* starmark */
(function () {
  var COLORS = { blue: "#0088ff", orange: "#ff8800", green: "#00ff00", red: "#ff4444" };
  function stars() {
    Array.prototype.forEach.call(document.querySelectorAll(".tag"), function (t) {
      if (t.getAttribute("data-stars")) return;
      var words = t.textContent.split("-").map(function (w) { return w.trim().toLowerCase(); }).filter(function (w) { return COLORS[w]; });
      if (!words.length) return;
      t.setAttribute("data-stars", "1");
      t.textContent = "";
      words.forEach(function (w) {
        var s = document.createElement("span");
        s.textContent = String.fromCharCode(9733);
        s.style.color = COLORS[w];
        s.style.marginRight = "2px";
        s.style.pointerEvents = "none";
        t.appendChild(s);
      });
      var h = document.createElement("span");
      h.textContent = " " + words.join(" ");
      h.style.display = "none";
      t.appendChild(h);
    });
  }
  if (document.readyState === "complete") stars();
  else window.addEventListener("load", stars);
})();
/* fitmark */
(function () {
  var mq = window.matchMedia("(min-width: 900px) and (hover: hover) and (pointer: fine)");
  var st = document.createElement("style");
  st.textContent = "@media (min-width: 900px) and (hover: hover) and (pointer: fine) { #alpha-view p, #category-view p { margin: 2px 0; } #alpha-view h2, #category-view h2 { margin: 8px 0 4px; } }";
  document.head.appendChild(st);
  var busy = false;
  function fit() {
    if (busy) return;
    busy = true;
    ["category-view", "alpha-view"].forEach(function (id) {
      var v = document.getElementById(id);
      if (!v) return;
      if (!mq.matches) {
        v.style.height = ""; v.style.overflow = ""; v.style.columnFill = ""; v.style.columnCount = ""; v.style.fontSize = ""; v.style.columnGap = "";
        return;
      }
      if (v.offsetParent === null) return;
      var top = v.getBoundingClientRect().top + window.scrollY;
      v.style.height = Math.max(300, window.innerHeight - top - 14) + "px";
      v.style.overflow = "hidden";
      v.style.columnFill = "auto";
      v.style.columnGap = "28px";
      var sizes = [16, 15, 14, 13, 12, 11, 10, 9, 8];
      var done = false;
      for (var i = 0; i < sizes.length && !done; i++) {
        v.style.fontSize = sizes[i] + "px";
        var maxn = Math.max(1, Math.floor(v.clientWidth / (sizes[i] * 17)));
        for (var n = 1; n <= maxn; n++) {
          v.style.columnCount = n;
          if (v.scrollWidth <= v.clientWidth + 1) { done = true; break; }
        }
      }
    });
    busy = false;
  }
  function later() { setTimeout(fit, 60); }
  window.addEventListener("load", function () { fit(); setTimeout(fit, 1500); setTimeout(fit, 4000); });
  window.addEventListener("resize", later);
  document.addEventListener("click", later);
  document.addEventListener("input", later);
})();
/* linksmark */
(function () {
  function addLinks() {
    if (document.getElementById("links-view")) return;
    var css = document.createElement("style");
    css.textContent = "#links-frame { display: block; width: 100%; height: 80vh; border: 1px solid #00ff00; background: black; margin-top: 10px; } #links-view .tag a { color: #888888; }";
    document.head.appendChild(css);
    var view = document.createElement("div");
    view.id = "links-view";
    view.className = "hidden";
    view.innerHTML = '<h2>Free Links</h2><p class="tag">A plain index of free, useful links. <a href="https://free-as-in-links.vercel.app" target="_blank" rel="noopener">open full page</a> or <a href="linkrain.html">watch them rain</a></p><iframe id="links-frame" title="Free Links" loading="lazy"></iframe>';
    var cat = document.getElementById("category-view");
    if (cat) cat.parentNode.insertBefore(view, cat);
    if (typeof window.showLinks !== "function") {
      window.showLinks = function () {
        var frame = document.getElementById("links-frame");
        if (!frame.getAttribute("src")) frame.setAttribute("src", "https://free-as-in-links.vercel.app");
        ["stats-view", "alpha-view", "category-view"].forEach(function (id) { var e = document.getElementById(id); if (e) e.classList.add("hidden"); });
        view.classList.remove("hidden");
        document.getElementById("menu").classList.remove("open");
      };
    }
    var menu = document.getElementById("menu");
    if (menu) {
      var b = document.createElement("button");
      b.textContent = "Links";
      b.onclick = function () { window.showLinks(); };
      menu.appendChild(b);
      Array.prototype.forEach.call(menu.querySelectorAll("button"), function (btn) {
        var t = btn.textContent.trim();
        if (t === "Search") btn.addEventListener("click", function () { if (view.offsetParent !== null) showView("category"); }, true);
      });
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", addLinks);
  else addLinks();
})();
/* githubmark */
(function () {
  var OWNER = "sudosilo";
  var ALIAS = {
    "kvs": "kvs-roulette",
    "offset-listener": "song-offset-listener",
    "tanksandzombies": "tanks-and-zombies",
    "equivalence-engine": "cross-venue-equivalence-engine",
    "ebutuoy": "ebutuoy-frontend",
    "shitty-ass-trading": "shitty-ass-trading-app",
    "threat-atlas": "threat-atlas-v3",
    "tile-spinner": "tilespinneratlas",
    "dronesim-blue": "dronesim",
    "coffeekit1": "coffeekit",
    "rat-site": "rat",
    "skwiggle": "skwiggle-v105",
    "rtss": "RTSS"
  };
  var ICON = '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" style="vertical-align:middle;fill:currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>';
  var CACHE = "gh-repos-v1";

  function repoFor(name, have) {
    var want = ALIAS[name] || name;
    return have[want.toLowerCase()] || null;
  }

  function addButtons(have) {
    var links = document.querySelectorAll("#category-view a, #alpha-view a");
    Array.prototype.forEach.call(links, function (a) {
      var p = a.parentNode;
      if (!p || p.getAttribute("data-gh")) return;
      var repo = repoFor(a.textContent.trim(), have);
      if (!repo) return;
      p.setAttribute("data-gh", "1");
      var b = document.createElement("button");
      b.type = "button";
      b.className = "gh-btn";
      b.title = "View " + repo + " on GitHub";
      b.setAttribute("aria-label", "View " + repo + " on GitHub");
      b.innerHTML = ICON;
      b.style.cssText = "margin-left:8px;background:black;color:#ffffff;border:1px solid #888888;padding:1px 5px;cursor:pointer;line-height:1;";
      b.onclick = function () { window.open("https://github.com/" + OWNER + "/" + repo, "_blank", "noopener"); };
      a.insertAdjacentElement("afterend", b);
    });
  }

  function fromList(list) {
    var have = {};
    list.forEach(function (n) { have[n.toLowerCase()] = n; });
    return have;
  }

  function fetchPage(n) {
    return fetch("https://api.github.com/users/" + OWNER + "/repos?per_page=100&type=owner&page=" + n)
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); });
  }

  function load() {
    try {
      var c = JSON.parse(localStorage.getItem(CACHE) || "null");
      if (c && Date.now() - c.t < 3600000) return Promise.resolve(c.names);
    } catch (e) {}
    var names = [];
    function page(n) {
      return fetchPage(n).then(function (rows) {
        rows.forEach(function (r) { if (!r.private) names.push(r.name); });
        if (rows.length === 100 && n < 10) return page(n + 1);
        return names;
      });
    }
    return page(1).then(function (list) {
      try { localStorage.setItem(CACHE, JSON.stringify({ t: Date.now(), names: list })); } catch (e) {}
      return list;
    });
  }

  function start() {
    load().then(function (list) { addButtons(fromList(list)); }).catch(function () {});
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
/* searchmark */
(function () {
  window.filterHub = function (q) {
    q = String(q || "").trim().toLowerCase();
    ["alpha-view", "category-view"].forEach(function (id) {
      var box = document.getElementById(id);
      if (!box) return;
      var head = null, count = 0, show = true;
      function closeHead() { if (head) head.style.display = (!q || count) ? "" : "none"; }
      Array.prototype.slice.call(box.children).forEach(function (el) {
        if (el.tagName === "H2") {
          closeHead();
          head = el; count = 0; show = true; el.style.display = "";
          return;
        }
        if (el.tagName === "P") {
          show = !q || el.textContent.toLowerCase().indexOf(q) > -1;
          if (show) count++;
          el.style.display = show ? "" : "none";
          return;
        }
        if (!show) {
          if (!el.hasAttribute("data-fd")) el.setAttribute("data-fd", el.style.display);
          el.style.display = "none";
        } else if (el.hasAttribute("data-fd")) {
          el.style.display = el.getAttribute("data-fd");
          el.removeAttribute("data-fd");
        }
      });
      closeHead();
    });
  };
})();
/* vizmark */
(function () {
  function addViz() {
    if (document.querySelector('script[src^="viz-menu.js"]')) return;
    var s = document.createElement("script");
    s.src = "viz-menu.js?v=" + Date.now();
    document.body.appendChild(s);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", addViz);
  else addViz();
})();
/* itchmark */
(function () {
  function badges(map) {
    var links = document.querySelectorAll("#category-view a, #alpha-view a");
    Array.prototype.forEach.call(links, function (a) {
      var p = a.parentNode, name = a.textContent.trim(), page = map && map[name];
      if (!p || !page || p.getAttribute("data-itch")) return;
      p.setAttribute("data-itch", "1");
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = "itch";
      b.title = "Play " + name + " on itch.io";
      b.setAttribute("aria-label", "Play " + name + " on itch.io");
      b.style.cssText = "margin-left:8px;background:black;color:#b48cf0;border:1px solid #8a4bd6;padding:1px 5px;cursor:pointer;line-height:1;font-family:monospace;font-size:11px;";
      b.onclick = function () { window.open(page, "_blank", "noopener"); };
      var gh = p.querySelector(".gh-btn");
      (gh || a).insertAdjacentElement("afterend", b);
    });
  }
  function go() {
    if (window.ITCH) { window.ITCH.then(badges); return; }
    var s = document.createElement("script");
    s.src = "itch.js?v=" + Math.floor(Date.now() / 600000);
    s.onload = function () { window.ITCH.then(function (m) { badges(m); setTimeout(function () { badges(m); }, 2500); }); };
    document.body.appendChild(s);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", go);
  else go();
})();
