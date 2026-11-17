/* Anthropic, ElevenLabs, YouTube API, MusicBrainz and AudD buttons on hub app rows. Reads ai-v1.json, made by ai-scan-v1.js. */
(function () {
  var KINDS = [
    {
      id: "anthropic", cls: "an-btn", label: "Anthropic", url: "https://console.anthropic.com/usage",
      icon: '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" style="vertical-align:middle"><path d="M2.5 3.5h11a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H7l-3 2.5v-2.5H2.5a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1z" fill="none" stroke="#d4a27f" stroke-width="1.5" stroke-linejoin="round"/><circle cx="5.3" cy="7.5" r=".9" fill="#d4a27f"/><circle cx="8" cy="7.5" r=".9" fill="#d4a27f"/><circle cx="10.7" cy="7.5" r=".9" fill="#d4a27f"/></svg><span style="display:none">anthropic claude</span>'
    },
    {
      id: "elevenlabs", cls: "el-btn", label: "ElevenLabs", url: "https://elevenlabs.io/app/usage",
      icon: '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" style="vertical-align:middle"><path d="M1.5 8h1.6M4.5 5v6M7 2.5v11M9.5 4.5v7M12 6.5v3M14.5 8h0" fill="none" stroke="#5aa9ff" stroke-width="1.6" stroke-linecap="round"/></svg><span style="display:none">elevenlabs voice</span>'
    },
    {
      id: "youtube", cls: "yt-btn", label: "YouTube API", url: "https://console.cloud.google.com/apis/dashboard",
      icon: '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" style="vertical-align:middle"><rect x="1.5" y="3" width="13" height="8.5" rx="1.5" fill="none" stroke="#ff5a5a" stroke-width="1.5"/><path d="M5.5 14h5M8 11.5V14" stroke="#ff5a5a" stroke-width="1.5" stroke-linecap="round"/></svg><span style="display:none">youtube api</span>'
    },
    {
      id: "musicbrainz", cls: "mb-btn", label: "MusicBrainz", url: "https://musicbrainz.org/",
      icon: '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" style="vertical-align:middle"><path d="M6 12V3.2l7-1.4v8.6" fill="none" stroke="#f0a64b" stroke-width="1.5" stroke-linejoin="round"/><circle cx="4.3" cy="12" r="1.9" fill="#f0a64b"/><circle cx="11.3" cy="10.4" r="1.9" fill="#f0a64b"/></svg><span style="display:none">musicbrainz</span>'
    },
    {
      id: "audd", cls: "ad-btn", label: "AudD", url: "https://dashboard.audd.io/",
      icon: '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" style="vertical-align:middle"><circle cx="6.5" cy="6.5" r="4.6" fill="none" stroke="#2ec4b6" stroke-width="1.5"/><path d="M10 10l4.3 4.3" stroke="#2ec4b6" stroke-width="1.7" stroke-linecap="round"/><path d="M4.4 6.5h.6M5.9 5v3M7.3 4.2v4.6M8.7 5.6v1.8" stroke="#2ec4b6" stroke-width="1.1" stroke-linecap="round"/></svg><span style="display:none">audd song recognition</span>'
    }
  ];
  var data = null;

  function key(s) { return String(s || "").toLowerCase().split("/").pop().trim(); }

  function badges() {
    if (!data) return;
    var links = document.querySelectorAll("#category-view a, #alpha-view a");
    Array.prototype.forEach.call(links, function (a) {
      var p = a.parentNode;
      if (!p) return;
      var name = a.textContent.trim();
      var gh = p.querySelector(".gh-btn");
      var ghRepo = gh ? key((gh.title || "").replace(/^View\s+/, "").replace(/\s+on GitHub$/, "")) : "";
      KINDS.forEach(function (k) {
        var list = data[k.id] || {};
        if (p.getAttribute("data-" + k.id)) return;
        if (!((ghRepo && list[ghRepo]) || list[key(name)])) return;
        p.setAttribute("data-" + k.id, "1");
        var b = document.createElement("button");
        b.type = "button";
        b.className = k.cls;
        b.innerHTML = k.icon;
        b.title = "Open " + name + " in " + k.label;
        b.setAttribute("aria-label", "Open " + name + " in " + k.label);
        b.style.cssText = "margin-left:8px;background:black;color:#ffffff;border:1px solid #888888;padding:1px 5px;cursor:pointer;line-height:1;";
        b.onclick = function () { window.open(k.url, "_blank", "noopener"); };
        var after = p.querySelector(".ad-btn") || p.querySelector(".mb-btn") || p.querySelector(".yt-btn") || p.querySelector(".el-btn") || p.querySelector(".an-btn") || p.querySelector(".cf-btn") || p.querySelector(".sb-btn") || p.querySelector(".rw-btn") || p.querySelector("button[title*='itch']") || gh || a;
        after.insertAdjacentElement("afterend", b);
      });
    });
  }

  function start() {
    var css = document.createElement("style");
    css.textContent = "@media (min-width: 900px) and (hover: hover) and (pointer: fine) { html.modern .an-btn svg, html.future .an-btn svg, html.retro .an-btn svg, html.modern .el-btn svg, html.future .el-btn svg, html.retro .el-btn svg, html.modern .yt-btn svg, html.future .yt-btn svg, html.retro .yt-btn svg, html.modern .mb-btn svg, html.future .mb-btn svg, html.retro .mb-btn svg, html.modern .ad-btn svg, html.future .ad-btn svg, html.retro .ad-btn svg { width: .9em; height: .9em; } }";
    document.head.appendChild(css);
    fetch("/ai-v1.json", { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
      if (!j) return;
      data = j;
      badges();
      var n = 0, t = setInterval(function () { badges(); if (++n > 20) clearInterval(t); }, 1500);
    }).catch(function () {});
  }

  if (document.readyState === "complete") setTimeout(start, 800);
  else window.addEventListener("load", function () { setTimeout(start, 800); });
})();
