// Shared score client. Include with one script tag from this service.
// Every call resolves to an object with ok true or false. Nothing throws,
// so a game keeps running when the service is unreachable.
(function () {
  var base = '';
  try { base = new URL(document.currentScript.src).origin; } catch (e) {}
  var started = {};

  function call(path, opts) {
    opts = opts || {};
    var ctl = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = ctl ? setTimeout(function () { ctl.abort(); }, 6000) : null;
    if (ctl) opts.signal = ctl.signal;
    return fetch(base + path, opts)
      .then(function (r) { return r.json(); })
      .catch(function () { return { ok: false, error: 'offline' }; })
      .then(function (j) { if (timer) clearTimeout(timer); return j; });
  }

  window.Scores = {
    start: function (game) { started[game] = Date.now(); },
    elapsed: function (game) { return started[game] ? Date.now() - started[game] : 0; },
    cleanTag: function (t) {
      return String(t || '').toUpperCase().replace(/[^A-Z0-9 ]/g, '').slice(0, 3).padEnd(3, ' ');
    },
    submit: function (o) {
      o = o || {};
      return call('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game: o.game,
          tag: window.Scores.cleanTag(o.tag),
          link: o.link ? String(o.link).slice(0, 60) : '',
          score: Math.floor(Number(o.score) || 0),
          duration: Math.floor(Number(o.duration) || window.Scores.elapsed(o.game))
        })
      });
    },
    board: function (game, limit) {
      return call('/api/board?game=' + encodeURIComponent(game) + '&limit=' + (limit || 10));
    },
    activity: function (game, limit) {
      var q = '?limit=' + (limit || 20) + (game ? '&game=' + encodeURIComponent(game) : '');
      return call('/api/activity' + q);
    },
    games: function () { return call('/api/games'); },
    // Builds a safe element for a player link. Text is set as plain text, never as HTML.
    linkEl: function (entry) {
      var el;
      if (entry && entry.link && /^https?:\/\//i.test(entry.link)) {
        el = document.createElement('a');
        el.href = entry.link;
        el.rel = 'nofollow noopener noreferrer ugc';
        el.target = '_blank';
      } else {
        el = document.createElement('span');
      }
      el.textContent = (entry && entry.domain) || '';
      return el;
    }
  };
})();
