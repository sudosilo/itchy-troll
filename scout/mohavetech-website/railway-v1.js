/* Railway tab and per app Railway buttons for the hub. Reads /api/railway-v1, which pulls the live Railway account. */
(function () {
  var BLUE = "#2447f5";
  var feed = null;

  function norm(s) {
    s = String(s || "").toLowerCase().trim();
    var prev;
    do { prev = s; s = s.replace(/[-_ ]?(backend|api|server|frontend|web|service)$/, ""); } while (s !== prev);
    return s.replace(/[^a-z0-9]/g, "");
  }

  function addCss() {
    var css = document.createElement("style");
    css.textContent =
      "#railway-frame { display: block; width: 100%; height: 80vh; border: 1px solid " + BLUE + "; background: #f4f7fc; margin-top: 10px; }" +
      "html.modern #railway-view { background: var(--panel); border: 1px solid var(--hair); border-radius: 12px; padding: 10px 12px 12px; }" +
      "html.modern #railway-view > h2:first-child { margin-top: 0; }" +
      "html.modern #category-view p button.rw-btn, html.modern #alpha-view p button.rw-btn { border-color: #b9c7fb !important; color: " + BLUE + " !important; -webkit-text-fill-color: " + BLUE + "; }";
    document.head.appendChild(css);
  }

  function addView() {
    if (document.getElementById("railway-view")) return;
    var view = document.createElement("div");
    view.id = "railway-view";
    view.className = "hidden";
    view.innerHTML = '<h2>Railway</h2><p class="tag">Every Railway project and service, priced for this billing period. <a href="railway-v1.html" target="_blank" rel="noopener">open full page</a></p><iframe id="railway-frame" title="Railway" loading="lazy"></iframe>';
    var cat = document.getElementById("category-view");
    if (cat) cat.parentNode.insertBefore(view, cat);

    window.showRailway = function () {
      var frame = document.getElementById("railway-frame");
      if (!frame.getAttribute("src")) frame.setAttribute("src", "railway-v1.html");
      ["stats-view", "alpha-view", "category-view", "links-view"].forEach(function (id) { var e = document.getElementById(id); if (e) e.classList.add("hidden"); });
      view.classList.remove("hidden");
      document.getElementById("menu").classList.remove("open");
    };

    var hide = function () { view.classList.add("hidden"); };
    var oldShow = window.showView;
    if (typeof oldShow === "function") window.showView = function (v) { hide(); return oldShow.apply(this, arguments); };
    var oldStats = window.showStats;
    if (typeof oldStats === "function") window.showStats = function () { hide(); return oldStats.apply(this, arguments); };
    var oldLinks = window.showLinks;
    if (typeof oldLinks === "function") window.showLinks = function () { hide(); return oldLinks.apply(this, arguments); };

    var menu = document.getElementById("menu");
    if (menu && !menu.querySelector(".rw-menu")) {
      var b = document.createElement("button");
      b.className = "rw-menu";
      b.textContent = "Railway";
      b.onclick = function () { window.showRailway(); };
      var first = menu.querySelector("details");
      if (first) menu.insertBefore(b, first); else menu.appendChild(b);
      Array.prototype.forEach.call(menu.querySelectorAll("button"), function (btn) {
        var t = btn.textContent.trim();
        if (t === "Search" || t === "Links") btn.addEventListener("click", hide, true);
      });
    }
  }

  function repoKey(r) { return String(r || "").toLowerCase().split("/").pop(); }

  function badges() {
    if (!feed || !feed.projects) return;
    var byName = {}, byRepo = {};
    feed.projects.forEach(function (p) {
      var k = norm(p.name);
      if (k && !byName[k]) byName[k] = p.url;
      p.services.forEach(function (s) {
        var ks = norm(s.name);
        if (ks && !byName[ks]) byName[ks] = s.url;
        var kr = repoKey(s.repo);
        if (kr && !byRepo[kr]) byRepo[kr] = s.url;
      });
    });
    var links = document.querySelectorAll("#category-view a, #alpha-view a");
    Array.prototype.forEach.call(links, function (a) {
      var p = a.parentNode;
      if (!p || p.getAttribute("data-rw")) return;
      var name = a.textContent.trim();
      var gh = p.querySelector(".gh-btn");
      var ghRepo = gh ? repoKey((gh.title || "").replace(/^View\s+/, "").replace(/\s+on GitHub$/, "")) : "";
      var url = (ghRepo && byRepo[ghRepo]) || byRepo[repoKey(name)] || byName[norm(name)] || (ghRepo && byName[norm(ghRepo)]);
      if (!url) return;
      p.setAttribute("data-rw", "1");
      var b = document.createElement("button");
      b.type = "button";
      b.className = "rw-btn";
      b.textContent = "railway";
      b.title = "Open " + name + " in Railway";
      b.setAttribute("aria-label", "Open " + name + " in Railway");
      b.style.cssText = "margin-left:8px;background:black;color:#7aa2ff;border:1px solid " + BLUE + ";padding:1px 5px;cursor:pointer;line-height:1;font-family:monospace;font-size:11px;";
      b.onclick = function () { window.open(url, "_blank", "noopener"); };
      var after = p.querySelector("button[title*='itch']") || gh || a;
      after.insertAdjacentElement("afterend", b);
    });
  }

  function start() {
    addCss();
    addView();
    fetch("/api/railway-v1").then(function (r) { return r.json(); }).then(function (j) {
      if (j && j.projects) { feed = j; badges(); var n = 0, t = setInterval(function () { badges(); if (++n > 20) clearInterval(t); }, 1500); }
    }).catch(function () {});
  }

  if (document.readyState === "complete") setTimeout(start, 400);
  else window.addEventListener("load", function () { setTimeout(start, 400); });
})();
