(function () {
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }
  function ago(ts) {
    var s = Math.max(0, Math.round((Date.now() - ts) / 1000));
    if (s < 60) return s + 's ago';
    if (s < 3600) return Math.round(s / 60) + 'm ago';
    if (s < 86400) return Math.round(s / 3600) + 'h ago';
    return Math.round(s / 86400) + 'd ago';
  }
  function fill(box, nodes, emptyText) {
    box.replaceChildren();
    if (!nodes.length) { box.appendChild(el('p', 'empty', emptyText)); return; }
    nodes.forEach(function (n) { box.appendChild(n); });
  }

  function loadGames() {
    Scores.games().then(function (r) {
      var box = document.getElementById('games');
      if (!r.ok) return fill(box, [], 'Service unreachable');
      fill(box, r.games.map(function (g) {
        var row = el('div', 'row');
        row.appendChild(el('span', 'game', g.name));
        if (g.top) {
          row.appendChild(el('span', 'tag', g.top.tag));
          row.appendChild(el('span', 'score', g.top.score.toLocaleString()));
        } else {
          row.appendChild(el('span', 'score dim', 'no scores yet'));
        }
        return row;
      }), 'No games registered');
    });
  }

  function loadFeed() {
    Scores.activity(null, 25).then(function (r) {
      var box = document.getElementById('feed');
      if (!r.ok) return fill(box, [], 'Service unreachable');
      fill(box, r.activity.map(function (a) {
        var row = el('div', 'row');
        row.appendChild(el('span', 'tag', a.tag));
        row.appendChild(el('span', 'game', a.name));
        if (a.domain) row.appendChild(Scores.linkEl(a));
        row.appendChild(el('span', 'score', a.score.toLocaleString()));
        row.appendChild(el('span', 'dim', ago(a.ts)));
        return row;
      }), 'No plays yet');
    });
  }

  loadGames();
  loadFeed();
  setInterval(loadFeed, 15000);
  setInterval(loadGames, 60000);
})();
