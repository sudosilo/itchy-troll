// Unlock kit. A game loads it like this:
// <script src="https://xxxx/unlock-kit.js" data-itch-page="user/slug"></script>
// Then calls ItchyUnlock.isUnlocked() to check, or await ItchyUnlock.require() at the demo limit.

(function () {
  var script = document.currentScript;
  var API = new URL(script.src).origin + '/api/unlock';
  var PAGE = (script.getAttribute('data-itch-page') || '').toLowerCase();
  var STORE = 'itchy-unlock:' + PAGE;
  var info = { url: 'https://' + PAGE.replace('/', '.itch.io/'), price: '' };

  function readFlag() {
    try { return localStorage.getItem(STORE) === 'yes'; } catch (e) { return false; }
  }
  function writeFlag() {
    try { localStorage.setItem(STORE, 'yes'); } catch (e) {}
  }

  fetch(API + '?page=' + encodeURIComponent(PAGE))
    .then(function (r) { return r.json(); })
    .then(function (j) { if (j.url) info.url = j.url; if (j.price) info.price = j.price; })
    .catch(function () {});

  function check(value) {
    var v = String(value || '').trim();
    if (!v) return Promise.resolve(false);
    var keyMatch = v.match(/download\/([A-Za-z0-9_-]{10,})/);
    var param = v.indexOf('@') > 0 ? 'email=' + encodeURIComponent(v) : 'key=' + encodeURIComponent(keyMatch ? keyMatch[1] : v);
    return fetch(API + '?page=' + encodeURIComponent(PAGE) + '&' + param)
      .then(function (r) { return r.json(); })
      .then(function (j) { if (j.ok) writeFlag(); return !!j.ok; })
      .catch(function () { return false; });
  }

  function overlay(resolve, allowClose) {
    var wrap = document.createElement('div');
    wrap.setAttribute('style', 'position:fixed;inset:0;z-index:2147483647;background:rgba(250,250,247,0.94);display:flex;align-items:center;justify-content:center;padding:16px;font-family:system-ui,sans-serif;color:#1d1d1b');
    var card = document.createElement('div');
    card.setAttribute('style', 'background:#ffffff;border:1px solid #d9d6cc;border-radius:14px;max-width:360px;width:100%;padding:20px;box-shadow:0 8px 30px rgba(0,0,0,0.08)');
    card.innerHTML =
      '<div style="font-size:20px;font-weight:700;margin-bottom:8px">Unlock the full version</div>' +
      '<div style="font-size:15px;line-height:1.45;margin-bottom:14px">The free demo ends here. Buy it on itch.io' +
      (info.price ? ' for ' + info.price : '') +
      ', then paste the email you paid with or your download link.</div>' +
      '<a target="_blank" rel="noopener" style="display:block;text-align:center;background:#e8590c;color:#fff;text-decoration:none;font-weight:700;padding:12px;border-radius:10px;margin-bottom:12px">Buy on itch.io</a>' +
      '<input style="width:100%;box-sizing:border-box;font-size:16px;padding:11px;border:1px solid #c9c5b8;border-radius:10px;margin-bottom:10px" placeholder="Email or download link">' +
      '<button style="width:100%;font-size:16px;padding:11px;border:1px solid #1d1d1b;background:#fff;border-radius:10px;font-weight:700">Unlock</button>' +
      '<div data-msg style="font-size:14px;margin-top:10px;min-height:18px"></div>' +
      (allowClose ? '<button data-close style="width:100%;font-size:14px;padding:8px;border:0;background:none;color:#6b675c;margin-top:4px">Keep playing the demo</button>' : '');
    card.querySelector('a').href = info.url;
    wrap.appendChild(card);
    document.body.appendChild(wrap);

    var input = card.querySelector('input');
    var msg = card.querySelector('[data-msg]');
    card.querySelector('button').onclick = function () {
      msg.textContent = 'Checking...';
      check(input.value).then(function (ok) {
        if (ok) {
          msg.textContent = 'Unlocked. Enjoy.';
          setTimeout(function () { wrap.remove(); resolve(true); }, 600);
        } else {
          msg.textContent = 'No purchase found for that. Check the email or link.';
        }
      });
    };
    var close = card.querySelector('[data-close]');
    if (close) close.onclick = function () { wrap.remove(); resolve(false); };
  }

  window.ItchyUnlock = {
    page: PAGE,
    isUnlocked: readFlag,
    check: check,
    require: function () {
      if (readFlag()) return Promise.resolve(true);
      return new Promise(function (resolve) { overlay(resolve, false); });
    },
    offer: function () {
      if (readFlag()) return Promise.resolve(true);
      return new Promise(function (resolve) { overlay(resolve, true); });
    }
  };
})();
