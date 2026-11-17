/* API plug buttons on hub app rows. Reads apis-v1.json, made by apis-scan-v1.js. Tapping a plug opens an overlay listing every outside API that app calls. */
(function () {
  var BLUE = "#2447f5";
  var ICON = '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" style="vertical-align:middle"><path d="M5.5 1.5v3M10.5 1.5v3" stroke="#7aa2ff" stroke-width="1.6" stroke-linecap="round"/><path d="M3.5 4.5h9v2.5a4.5 4.5 0 0 1-9 0z" fill="none" stroke="#7aa2ff" stroke-width="1.5" stroke-linejoin="round"/><path d="M8 11.5v3" stroke="#7aa2ff" stroke-width="1.6" stroke-linecap="round"/></svg><span style="display:none">api</span>';
  var data = null;

  function key(s) { return String(s || "").toLowerCase().split("/").pop().trim(); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  function overlay() {
    var o = document.getElementById("api-overlay");
    if (o) return o;
    o = document.createElement("div");
    o.id = "api-overlay";
    o.style.cssText = "position:fixed;inset:0;z-index:10000;background:rgba(14,19,32,.45);display:none;";
    o.innerHTML = '<div id="api-panel" style="position:absolute;left:10px;right:10px;top:70px;max-width:440px;margin:0 auto;max-height:70vh;overflow:auto;background:#ffffff;color:#0e1320;border:2px solid ' + BLUE + ';border-radius:10px;font-family:Arial,Helvetica,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.35);">' +
      '<div style="position:sticky;top:0;background:#ffffff;display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-bottom:1px solid #d6deec;">' +
      '<b id="api-title" style="color:' + BLUE + ';font-size:15px;"></b>' +
      '<button type="button" id="api-close" style="font:700 14px Arial,sans-serif;background:' + BLUE + ';color:#ffffff;border:none;border-radius:6px;padding:6px 12px;cursor:pointer;">Close</button></div>' +
      '<div id="api-list" style="padding:6px 12px 12px;"></div></div>';
    document.body.appendChild(o);
    o.addEventListener("click", function (e) { if (e.target === o) o.style.display = "none"; });
    o.querySelector("#api-close").onclick = function () { o.style.display = "none"; };
    return o;
  }

  function show(name, list) {
    var o = overlay();
    o.querySelector("#api-title").textContent = name + " APIs";
    o.querySelector("#api-list").innerHTML = list.map(function (x) {
      var sub = x.hosts && x.hosts.length && x.hosts.join(", ") !== x.label ? '<div style="font-size:11px;color:#5b6475;margin-top:2px;word-break:break-all;">' + esc(x.hosts.join(", ")) + '</div>' : "";
      return '<a href="' + esc(x.url) + '" target="_blank" rel="noopener" style="display:block;padding:9px 0;border-bottom:1px solid #e3e8f2;color:#0e1320;text-decoration:none;">' +
        '<span style="color:' + BLUE + ';font-weight:700;font-size:14px;">' + esc(x.label) + '</span>' + sub + '</a>';
    }).join("");
    o.style.display = "block";
  }

  function badges() {
    if (!data || !data.repos) return;
    var links = document.querySelectorAll("#category-view a, #alpha-view a");
    Array.prototype.forEach.call(links, function (a) {
      var p = a.parentNode;
      if (!p || p.getAttribute("data-api")) return;
      var name = a.textContent.trim();
      var gh = p.querySelector(".gh-btn");
      var ghRepo = gh ? key((gh.title || "").replace(/^View\s+/, "").replace(/\s+on GitHub$/, "")) : "";
      var list = (ghRepo && data.repos[ghRepo]) || data.repos[key(name)];
      if (!list || !list.length) return;
      p.setAttribute("data-api", "1");
      var b = document.createElement("button");
      b.type = "button";
      b.className = "api-btn";
      b.innerHTML = ICON;
      b.title = "Outside APIs " + name + " calls";
      b.setAttribute("aria-label", "Outside APIs " + name + " calls");
      b.style.cssText = "margin-left:8px;background:black;color:#ffffff;border:1px solid #888888;padding:1px 5px;cursor:pointer;line-height:1;";
      b.onclick = function () { show(name, list); };
      var btns = p.querySelectorAll("button");
      var after = btns.length ? btns[btns.length - 1] : a;
      after.insertAdjacentElement("afterend", b);
    });
  }

  function start() {
    var css = document.createElement("style");
    css.textContent = "@media (min-width: 900px) and (hover: hover) and (pointer: fine) { html.modern .api-btn svg, html.future .api-btn svg, html.retro .api-btn svg { width: .9em; height: .9em; } }";
    document.head.appendChild(css);
    fetch("/apis-v1.json", { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
      if (!j) return;
      data = j;
      setTimeout(badges, 4000);
      var n = 0, t = setInterval(function () { badges(); if (++n > 20) clearInterval(t); }, 1500);
    }).catch(function () {});
  }

  if (document.readyState === "complete") setTimeout(start, 900);
  else window.addEventListener("load", function () { setTimeout(start, 900); });
})();
