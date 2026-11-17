/* Supabase buttons on hub app rows. Reads supabase-v1.json, made by supabase-scan-v1.js. */
(function () {
  var ICON = '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" style="vertical-align:middle"><ellipse cx="8" cy="3.6" rx="5.2" ry="2" fill="none" stroke="#3ecf6e" stroke-width="1.5"/><path d="M2.8 3.6v8.8c0 1.1 2.3 2 5.2 2s5.2-.9 5.2-2V3.6" fill="none" stroke="#3ecf6e" stroke-width="1.5"/><path d="M2.8 8c0 1.1 2.3 2 5.2 2s5.2-.9 5.2-2" fill="none" stroke="#3ecf6e" stroke-width="1.5"/></svg><span style="display:none">supabase</span>';
  var data = null;

  function key(s) { return String(s || "").toLowerCase().split("/").pop().trim(); }

  function urlFor(ref) {
    return ref ? "https://supabase.com/dashboard/project/" + ref : "https://supabase.com/dashboard/projects";
  }

  function badges() {
    if (!data || !data.repos) return;
    var links = document.querySelectorAll("#category-view a, #alpha-view a");
    Array.prototype.forEach.call(links, function (a) {
      var p = a.parentNode;
      if (!p || p.getAttribute("data-sb")) return;
      var name = a.textContent.trim();
      var gh = p.querySelector(".gh-btn");
      var ghRepo = gh ? key((gh.title || "").replace(/^View\s+/, "").replace(/\s+on GitHub$/, "")) : "";
      var hit = (ghRepo && data.repos[ghRepo]) || data.repos[key(name)];
      if (!hit) return;
      p.setAttribute("data-sb", "1");
      var b = document.createElement("button");
      b.type = "button";
      b.className = "sb-btn";
      b.innerHTML = ICON;
      b.title = "Open " + name + " in Supabase";
      b.setAttribute("aria-label", "Open " + name + " in Supabase");
      b.style.cssText = "margin-left:8px;background:black;color:#ffffff;border:1px solid #888888;padding:1px 5px;cursor:pointer;line-height:1;";
      var url = urlFor(hit.ref || data.defaultRef);
      b.onclick = function () { window.open(url, "_blank", "noopener"); };
      var after = p.querySelector(".rw-btn") || p.querySelector("button[title*='itch']") || gh || a;
      after.insertAdjacentElement("afterend", b);
    });
  }

  function start() {
    var css = document.createElement("style");
    css.textContent = "@media (min-width: 900px) and (hover: hover) and (pointer: fine) { html.modern .sb-btn svg, html.future .sb-btn svg, html.retro .sb-btn svg { width: .9em; height: .9em; } }";
    document.head.appendChild(css);
    fetch("/supabase-v1.json", { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
      if (!j) return;
      data = j;
      badges();
      var n = 0, t = setInterval(function () { badges(); if (++n > 20) clearInterval(t); }, 1500);
    }).catch(function () {});
  }

  if (document.readyState === "complete") setTimeout(start, 600);
  else window.addEventListener("load", function () { setTimeout(start, 600); });
})();
