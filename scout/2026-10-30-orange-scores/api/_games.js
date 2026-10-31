// Game registry. To plug in a new game, add one line here and push.
// max: highest believable score. perSecond: highest believable score gained per second of play.
// maxMs: longest believable run in milliseconds, for games played over days. Defaults to six hours.
module.exports = {
  edmia: { name: 'EDMIA', max: 200000, perSecond: 2000 },
  'mill-ionaire': { name: 'Mill-ionaire', max: Number.MAX_SAFE_INTEGER, perSecond: 1000000000000, maxMs: 400 * 24 * 3600 * 1000 }
};
