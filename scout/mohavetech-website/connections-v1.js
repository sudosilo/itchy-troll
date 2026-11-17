/* Chain buttons showing which of Blue's apps call each other. Reads the links part of apis-v1.json, made by apis-scan-v1.js. */
(function () {
  var BLUE = "#2447f5";
  var ICON = '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" style="vertical-align:middle"><path d="M6.6 9.4l2.8-2.8" stroke="#7aa2ff" stroke-width="1.6" stroke-linecap="round"/><path d="M7.2 4.6l1.5-1.5a2.6 2.6 0 0 1 3.7 3.7l-1.5 1.5" fill="none" stroke="#7aa2ff" stroke-width="1.6" stroke-linecap="round"/><path d="M8.8 11.4l-1.5 1.5a2.6 2.6 0 0 1-3.7-3.7l1.5-1.5" fill="none" stroke="#7aa2ff" stroke-width="1.6" stroke-linecap="round"/></svg><span style="display:none">connected</span>';
  var data = null, graph = null;

  function key(s) { return String(s || "").toLowerCase().split("/").pop().trim(); }
  function norm(s) {
    s = String(s || "").toLowerCase().trim();
    var prev = null;
    do { prev = s; s = s.replace(/[-_ ]?(backend|api|server|frontend|web|service|production)$/, ""); } while (s !== prev);
    return s.replace(/[^a-z0-9]/g, "");
  }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  function rows() {
    var list = [];
    Array.prototype.forEach.call(document.querySelectorAll("#category-view a, #alpha-view a"), function (a) {
      var p = a.parentNode;
      if (!p || p.tagName !== "P") return;
      var host = "";
      try { host = new URL(a.href).hostname.toLowerCase(); } catch (e) {}
      var gh = p.querySelector(".gh-btn");
      var repo = gh ? key((gh.title || "").replace(/^View\s+/, "").replace(/\s+on GitHub$/, "")) : "";
      list.push({ a: a, p: p, name: a.textContent.trim(), host: host, repo: repo });
    });
    return list;
  }

  function build() {
    var all = rows();
    var byHost = {}, byNorm = {}, byRepo = {};
    all.forEach(function (r) {
      if (r.host && !byHost[r.host]) byHost[r.host] = r.name;
      var n = norm(r.name);
      if (n && !byNorm[n]) byNorm[n] = r.name;
      if (r.repo && !byRepo[r.repo]) byRepo[r.repo] = r.name;
      if (!byRepo[key(r.name)]) byRepo[key(r.name)] = r.name;
    });
    function target(host) {
      if (byHost[host]) return { name: byHost[host] };
      var sub = host.split(".")[0];
      if (/\.vercel\.app$/.test(host)) sub = sub.replace(/-git-.*$/, "").replace(/-sudosilo.*$/, "");
      if (/\.up\.railway\.app$/.test(host)) sub = sub.replace(/-production(-[a-z0-9]+)?$/, "").replace(/-[a-z0-9]{4}$/, "");
      var n = norm(sub);
      if (byNorm[n]) return { name: byNorm[n] };
      return { name: null, label: sub, host: host };
    }
    var out = {}, inc = {};
    Object.keys(data.links || {}).forEach(function (repo) {
      var src = byRepo[repo] || byNorm[norm(repo)];
      if (!src) return;
      (data.links[repo] || []).forEach(function (h) {
        var t = target(h);
        if (t.name === src) return;
        out[src] = out[src] || [];
        if (!out[src].some(function (x) { return (x.name || x.label) === (t.name || t.label); })) out[src].push(t);
        if (t.name) { inc[t.name] = inc[t.name] || []; if (inc[t.name].indexOf(src) < 0) inc[t.name].push(src); }
      });
    });
    graph = { out: out, inc: inc };
  }

  function overlay() {
    var o = document.getElementById("conn-overlay");
    if (o) return o;
    o = document.createElement("div");
    o.id = "conn-overlay";
    o.style.cssText = "position:fixed;inset:0;z-index:10000;background:rgba(14,19,32,.45);display:none;";
    o.innerHTML = '<div style="position:absolute;left:10px;right:10px;top:70px;max-width:440px;margin:0 auto;max-height:70vh;overflow:auto;background:#ffffff;color:#0e1320;border:2px solid ' + BLUE + ';border-radius:10px;font-family:Arial,Helvetica,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.35);">' +
      '<div style="position:sticky;top:0;background:#ffffff;display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-bottom:1px solid #d6deec;">' +
      '<b id="conn-title" style="color:' + BLUE + ';font-size:15px;"></b>' +
      '<button type="button" id="conn-close" style="font:700 14px Arial,sans-serif;background:' + BLUE + ';color:#ffffff;border:none;border-radius:6px;padding:6px 12px;cursor:pointer;">Close</button></div>' +
      '<div id="conn-list" style="padding:6px 12px 12px;"></div></div>';
    document.body.appendChild(o);
    o.addEventListener("click", function (e) { if (e.target === o) o.style.display = "none"; });
    o.querySelector("#conn-close").onclick = function () { o.style.display = "none"; };
    o.querySelector("#conn-list").addEventListener("click", function (e) {
      var t = e.target.closest("[data-go]");
      if (!t) return;
      o.style.display = "none";
      jump(t.getAttribute("data-go"));
    });
    return o;
  }

  function jump(name) {
    var hit = null;
    rows().forEach(function (r) { if (!hit && r.name === name && r.p.offsetParent !== null) hit = r; });
    if (!hit) return;
    hit.p.scrollIntoView({ behavior: "smooth", block: "center" });
    var old = hit.p.style.boxShadow, oldBg = hit.p.style.background;
    hit.p.style.transition = "box-shadow .4s, background .4s";
    hit.p.style.boxShadow = "0 0 0 3px " + BLUE;
    hit.p.style.background = "rgba(36,71,245,.25)";
    setTimeout(function () { hit.p.style.boxShadow = old; hit.p.style.background = oldBg; }, 1800);
  }

  function section(title, items) {
    if (!items.length) return "";
    return '<div style="font:700 12px Arial,sans-serif;color:#5b6475;margin:10px 0 2px;text-transform:uppercase;letter-spacing:.04em;">' + esc(title) + '</div>' + items.join("");
  }

  function show(name) {
    var o = overlay();
    var outs = (graph.out[name] || []).map(function (t) {
      if (t.name) return '<div data-go="' + esc(t.name) + '" style="padding:9px 0;border-bottom:1px solid #e3e8f2;cursor:pointer;color:' + BLUE + ';font-weight:700;font-size:14px;">' + esc(t.name) + '</div>';
      return '<div style="padding:9px 0;border-bottom:1px solid #e3e8f2;font-size:14px;color:#0e1320;">' + esc(t.label) + '<div style="font-size:11px;color:#5b6475;word-break:break-all;">' + esc(t.host) + ' (not on the hub)</div></div>';
    });
    var ins = (graph.inc[name] || []).map(function (n) {
      return '<div data-go="' + esc(n) + '" style="padding:9px 0;border-bottom:1px solid #e3e8f2;cursor:pointer;color:' + BLUE + ';font-weight:700;font-size:14px;">' + esc(n) + '</div>';
    });
    o.querySelector("#conn-title").textContent = name + " connections";
    o.querySelector("#conn-list").innerHTML = section("Talks to", outs) + section("Called by", ins);
    o.style.display = "block";
  }

  function badges() {
    if (!data) return;
    build();
    rows().forEach(function (r) {
      if (r.p.getAttribute("data-conn")) return;
      if (!(graph.out[r.name] || graph.inc[r.name])) return;
      r.p.setAttribute("data-conn", "1");
      var b = document.createElement("button");
      b.type = "button";
      b.className = "conn-btn";
      b.innerHTML = ICON;
      b.title = "Apps connected to " + r.name;
      b.setAttribute("aria-label", "Apps connected to " + r.name);
      b.style.cssText = "margin-left:8px;background:black;color:#ffffff;border:1px solid #888888;padding:1px 5px;cursor:pointer;line-height:1;";
      b.onclick = function () { show(r.name); };
      var btns = r.p.querySelectorAll("button");
      var after = btns.length ? btns[btns.length - 1] : r.a;
      after.insertAdjacentElement("afterend", b);
    });
  }

  function start() {
    var css = document.createElement("style");
    css.textContent = "@media (min-width: 900px) and (hover: hover) and (pointer: fine) { html.modern .conn-btn svg, html.future .conn-btn svg, html.retro .conn-btn svg { width: .9em; height: .9em; } }";
    document.head.appendChild(css);
    fetch("/apis-v1.json", { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
      if (!j || !j.links) return;
      data = j;
      setTimeout(badges, 5000);
      var n = 0, t = setInterval(function () { badges(); if (++n > 20) clearInterval(t); }, 1500);
    }).catch(function () {});
  }

  if (document.readyState === "complete") setTimeout(start, 1000);
  else window.addEventListener("load", function () { setTimeout(start, 1000); });
})();
