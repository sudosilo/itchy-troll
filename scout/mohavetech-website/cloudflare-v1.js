/* Cloudflare buttons on hub app rows. Reads cloudflare-v1.json, made by cloudflare-scan-v1.js. */
(function () {
  var ICON = '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" style="vertical-align:middle"><path d="M4.4 12.6h7.9a2.9 2.9 0 0 0 .4-5.8 4.1 4.1 0 0 0-7.9-1A3.4 3.4 0 0 0 4.4 12.6z" fill="none" stroke="#f6862f" stroke-width="1.5" stroke-linejoin="round"/></svg><span style="display:none">cloudflare</span>';
  var data = null;

  function key(s) { return String(s || "").toLowerCase().split("/").pop().trim(); }

  function urlFor(hit) {
    var base = "https://dash.cloudflare.com/";
    var k = hit.kinds || [];
    if (hit.worker) return base + "?to=/:account/workers/services/view/" + encodeURIComponent(hit.worker) + "/production";
    if (k.indexOf("worker") > -1) return base + "?to=/:account/workers-and-pages";
    if (k.indexOf("pages") > -1) return base + "?to=/:account/workers-and-pages";
    if (k.indexOf("r2") > -1) return base + "?to=/:account/r2/overview";
    return base;
  }

  function badges() {
    if (!data || !data.repos) return;
    var links = document.querySelectorAll("#category-view a, #alpha-view a");
    Array.prototype.forEach.call(links, function (a) {
      var p = a.parentNode;
      if (!p || p.getAttribute("data-cf")) return;
      var name = a.textContent.trim();
      var gh = p.querySelector(".gh-btn");
      var ghRepo = gh ? key((gh.title || "").replace(/^View\s+/, "").replace(/\s+on GitHub$/, "")) : "";
      var hit = (ghRepo && data.repos[ghRepo]) || data.repos[key(name)];
      if (!hit) return;
      p.setAttribute("data-cf", "1");
      var b = document.createElement("button");
      b.type = "button";
      b.className = "cf-btn";
      b.innerHTML = ICON;
      b.title = "Open " + name + " in Cloudflare";
      b.setAttribute("aria-label", "Open " + name + " in Cloudflare");
      b.style.cssText = "margin-left:8px;background:black;color:#ffffff;border:1px solid #888888;padding:1px 5px;cursor:pointer;line-height:1;";
      var url = urlFor(hit);
      b.onclick = function () { window.open(url, "_blank", "noopener"); };
      var after = p.querySelector(".sb-btn") || p.querySelector(".rw-btn") || p.querySelector("button[title*='itch']") || gh || a;
      after.insertAdjacentElement("afterend", b);
    });
  }

  function start() {
    var css = document.createElement("style");
    css.textContent = "@media (min-width: 900px) and (hover: hover) and (pointer: fine) { html.modern .cf-btn svg, html.future .cf-btn svg, html.retro .cf-btn svg { width: .9em; height: .9em; } }";
    document.head.appendChild(css);
    fetch("/cloudflare-v1.json", { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
      if (!j) return;
      data = j;
      badges();
      var n = 0, t = setInterval(function () { badges(); if (++n > 20) clearInterval(t); }, 1500);
    }).catch(function () {});
  }

  if (document.readyState === "complete") setTimeout(start, 700);
  else window.addEventListener("load", function () { setTimeout(start, 700); });
})();
