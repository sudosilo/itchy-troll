// Token wallets. The server clock sets the cycle, so a player cannot change the game code to get more tokens.
// grant: tokens added each cycle. cap: most a wallet can hold. items: what tokens buy and their prices.
// To give another game a wallet, add one entry here and push.
module.exports = {
  mobbyhill: {
    name: 'MobbyHill',
    grant: 1000,
    cap: 3000,
    items: {
      fuelcan: 120, repair: 150, turbo: 300, sticky: 250,
      'part-lift-1': 300, 'part-lift-2': 800, 'part-tires-1': 400, 'part-engine-1': 600, 'part-snorkel-1': 300, 'part-tank-1': 350
    }
  }
};
