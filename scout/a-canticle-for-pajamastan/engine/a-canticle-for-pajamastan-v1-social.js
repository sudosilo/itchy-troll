// A Canticle for Pajamastan engine, social module, version one.
// Built from a-canticle-for-pajamastan-v1-spec-social.md. Numbers and phrase lists come from the social tuning file.
(function (root) {
  var C = root.Canticle = root.Canticle || {};

  // Quick chat travels as two numbers plus optional fills.
  function quickCode(t, category, index, fills) {
    var cats = Object.keys(t.quickChat);
    return { c: cats.indexOf(category), i: index, f: fills || {} };
  }
  function quickText(t, code) {
    var cats = Object.keys(t.quickChat), cat = cats[code.c];
    if (!cat || !t.quickChat[cat][code.i]) return null;
    return t.quickChat[cat][code.i].replace(/\{(\w+)\}/g, function (_, k) { return code.f && code.f[k] !== undefined ? String(code.f[k]) : '...'; });
  }

  // Symbol message: { face, parts: [{ s, x, y, size, color, flip }] } packed into a number list.
  function packSymbol(t, msg) {
    var out = [t.symbolFaces.indexOf(msg.face)];
    (msg.parts || []).slice(0, t.symbolMaxParts).forEach(function (p) {
      out.push(t.symbolShapes.indexOf(p.s), p.x | 0, p.y | 0, p.size | 0, p.color | 0, p.flip ? 1 : 0);
    });
    return out;
  }
  function unpackSymbol(t, nums) {
    if (!Array.isArray(nums) || !nums.length) return null;
    var msg = { face: t.symbolFaces[nums[0]] || 'blank', parts: [] };
    for (var i = 1; i + 5 < nums.length + 1 && msg.parts.length < t.symbolMaxParts; i += 6) {
      var s = t.symbolShapes[nums[i]];
      if (!s) continue;
      msg.parts.push({ s: s, x: Math.max(0, Math.min(255, nums[i + 1])), y: Math.max(0, Math.min(255, nums[i + 2])), size: Math.max(1, Math.min(64, nums[i + 3])), color: nums[i + 4] & 0xffffff, flip: !!nums[i + 5] });
    }
    return msg;
  }

  function filter(t, text) {
    var out = String(text);
    t.bannedWords.forEach(function (w) { out = out.replace(new RegExp('\\b' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi'), function (m) { return new Array(m.length + 1).join('*'); }); });
    return out;
  }

  function card(t, opts) {
    return { number: opts.number, name: String(opts.name || '').slice(0, 16), className: opts.className, level: opts.level, comment: String(opts.comment || '').slice(0, t.cardCommentMax) };
  }

  function cardBook(t) {
    var book = { cards: [], muted: {}, mail: [] };
    return {
      book: book,
      add: function (c) { if (book.cards.some(function (x) { return x.number === c.number; })) return 'already have it'; if (book.cards.length >= t.cardBookSlots) return 'book full'; book.cards.push(c); return 'added'; },
      remove: function (number) { book.cards = book.cards.filter(function (x) { return x.number !== number; }); },
      mute: function (number, on) { if (on) book.muted[number] = true; else delete book.muted[number]; },
      isMuted: function (number) { return !!book.muted[number]; },
      mailTo: function (number, text) { return { to: number, text: filter(t, String(text).slice(0, t.mailMax)) }; }
    };
  }

  function canTradeCards(t, a, b) { var dx = a.x - b.x, dy = a.y - b.y; return Math.sqrt(dx * dx + dy * dy) <= t.cardTradeDistance; }

  // Rooms: name, password, tier, leader.
  function room(t, opts) {
    var r = { name: opts.name, password: opts.password || '', tier: opts.tier || 0, players: [], leader: null, mode: opts.mode || 'normal' };
    r.join = function (player, password) {
      if (r.password && password !== r.password) return 'wrong password';
      if (r.players.length >= t.roomMaxPlayers) return 'room full';
      r.players.push(player); if (!r.leader) r.leader = player.id; return 'joined';
    };
    r.leave = function (id) { r.players = r.players.filter(function (p) { return p.id !== id; }); if (r.leader === id) r.leader = r.players.length ? r.players[0].id : null; };
    return r;
  }

  var api = { quickCode: quickCode, quickText: quickText, packSymbol: packSymbol, unpackSymbol: unpackSymbol, filter: filter, card: card, cardBook: cardBook, canTradeCards: canTradeCards, room: room };
  C.social = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
