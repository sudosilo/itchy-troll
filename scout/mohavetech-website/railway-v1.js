/* Railway tab and per app Railway buttons for the hub. Reads /api/railway-v1, which pulls the live Railway account. */
(function () {
  var BLUE = "#2447f5";
  var feed = null;
  var ICON = '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" style="vertical-align:middle"><rect x="3" y="1.5" width="10" height="10" rx="2.5" fill="none" stroke="#7aa2ff" stroke-width="1.6"/><rect x="5" y="3.5" width="6" height="3" rx="0.8" fill="#7aa2ff"/><circle cx="5.6" cy="9" r="0.9" fill="#7aa2ff"/><circle cx="10.4" cy="9" r="0.9" fill="#7aa2ff"/><path d="M5 12.5 L3.5 14.8 M11 12.5 L12.5 14.8" stroke="#7aa2ff" stroke-width="1.4" stroke-linecap="round"/></svg>';

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
      "@media (min-width: 900px) and (hover: hover) and (pointer: fine) { html.modern .rw-btn svg, html.future .rw-btn svg, html.retro .rw-btn svg, html.modern button[title*=\"itch\"] svg, html.future button[title*=\"itch\"] svg, html.retro button[title*=\"itch\"] svg { width: .9em; height: .9em; } }";
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
      b.innerHTML = ICON;
      b.title = "Open " + name + " in Railway";
      b.setAttribute("aria-label", "Open " + name + " in Railway");
      b.style.cssText = "margin-left:8px;background:black;color:#ffffff;border:1px solid #888888;padding:1px 5px;cursor:pointer;line-height:1;";
      b.onclick = function () { window.open(url, "_blank", "noopener"); };
      var after = p.querySelector("button[title*='itch']") || gh || a;
      after.insertAdjacentElement("afterend", b);
    });
  }

  function pill() {}

  function start() {
    addCss();
    addView();
    pill("railway ...", true);
    var apiError = "";
    fetch("/api/railway-v1", { cache: "no-store" })
      .then(function (r) { return r.json().catch(function () { return { error: "railway feed missing (" + r.status + ")" }; }); })
      .then(function (j) {
        if (j && j.projects && j.projects.length) return j;
        apiError = (j && j.error) || "no data";
        return fetch("/railway-snapshot-v1.json", { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
      })
      .then(function (j) {
        if (j && j.projects && j.projects.length) {
          feed = j;
          badges();
          var n = 0, t = setInterval(function () { badges(); if (++n > 20) clearInterval(t); }, 1500);
          if (j.snapshot) { pill("railway \u00b7 " + j.projects.length + " projects", true); return; }
          var now = 0; (j.workspaces || []).forEach(function (w) { now += w.currentUsage || 0; });
          pill("railway $" + now.toFixed(2) + " \u00b7 " + j.projects.length + " projects", true);
        } else {
          pill("railway: " + (apiError || "no data"), false);
        }
      })
      .catch(function (e) { pill("railway: " + (e.message || e), false); });
  }

  if (document.readyState === "complete") setTimeout(start, 400);
  else window.addEventListener("load", function () { setTimeout(start, 400); });
})();
