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
      'part-lift-1': 300, 'part-lift-2': 800, 'part-tires-1': 400, 'part-engine-1': 600, 'part-snorkel-1': 300, 'part-tank-1': 350,
      'part-tires-2': 450, 'part-lockers-1': 500, 'part-sliders-1': 350, 'part-guard-1': 300, 'part-shocks-1': 550, 'part-chains-1': 250, 'part-rope-1': 300, 'part-winch-1': 350,
      'veh-sxs': 1500, 'veh-suv': 1500, 'veh-pickup': 2500
    }
  }
};
