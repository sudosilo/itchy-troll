// Game registry. To plug in a new game, add one line here and push.
// max: highest believable score. perSecond: highest believable score gained per second of play.
// maxMs: longest believable run in milliseconds, for games played over days. Defaults to six hours.
// fmt: how the hub shows a score. flagsTime packs checkpoints and time as flags*100000 + (99999 - tenths of a second). meters is tenths of a meter.
module.exports = {
  edmia: { name: 'EDMIA', max: 200000, perSecond: 2000 },
  'mill-ionaire': { name: 'Mill-ionaire', max: Number.MAX_SAFE_INTEGER, perSecond: 1000000000000, maxMs: 400 * 24 * 3600 * 1000 },
  'fogwarren-vx': { name: 'FogWarren', max: 30000, perSecond: 5000, maxMs: 24 * 3600 * 1000 },
  'sky-flow': { name: 'Sky Flow', max: 20000, perSecond: 150 },
  mobbyhill: { name: 'MobbyHill', max: 99999999, perSecond: 60000, fmt: 'flagsTime' },
  'mobbyhill-fuel': { name: 'MobbyHill Fuel', max: 99999999, perSecond: 60000, fmt: 'flagsTime' },
  'mobbyhill-climb': { name: 'MobbyHill Climb', max: 999999, perSecond: 200, fmt: 'meters' },
  'mobbyhill-climbfuel': { name: 'MobbyHill Climb Fuel', max: 999999, perSecond: 200, fmt: 'meters' }
};
