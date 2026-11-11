// NOTA CITY - engine/tickEngine.js
// The heartbeat of the city simulation.
// This module is loaded by index.js on server start.
// It runs three cron timers that fire independently on their own schedules.
// Each tick reads current city state, runs projection math, updates the DB,
// and writes a log entry so you have full history of how the city evolved.

const cron = require('node-cron');

module.exports = function startTickEngine(pool) {

  console.log('NOTA CITY tick engine started');

  // Helper: read current city meta from DB
  async function getCityMeta() {
    const result = await pool.query('SELECT * FROM city_meta LIMIT 1');
    return result.rows[0];
  }

  // Helper: count tiles by type to inform projections
  async function getTileCounts() {
    const result = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE zone_type = 'residential') AS residential,
        COUNT(*) FILTER (WHERE zone_type = 'commercial') AS commercial,
        COUNT(*) FILTER (WHERE zone_type = 'industrial') AS industrial,
        COUNT(*) FILTER (WHERE road_type != 'none') AS roads,
        COUNT(*) FILTER (WHERE power_type != 'none') AS power,
        COUNT(*) FILTER (WHERE water_type != 'none') AS water
      FROM grid_tiles
    `);
    return result.rows[0];
  }

  // Helper: write a tick log entry
  async function logTick(type, tickNumber, population, funds, notes) {
    await pool.query(
      `INSERT INTO tick_log 
        (tick_type, tick_number, population_snapshot, funds_snapshot, notes)
       VALUES ($1, $2, $3, $4, $5)`,
      [type, tickNumber, population, funds, notes]
    );
  }

  // FAST TICK - every 5 minutes
  // Handles: traffic flow, power demand, water pressure
  // These are short-cycle metrics that change frequently
  cron.schedule('*/5 * * * *', async () => {
    try {
      const city = await getCityMeta();
      const tiles = await getTileCounts();

      // Power demand: each residential tile draws 1 unit, industrial draws 3
      const powerDemand = (tiles.residential * 1) + (tiles.industrial * 3);
      const powerSupply = tiles.power * 5;
      const powerSurplus = powerSupply - powerDemand;

      const notes = `Power demand: ${powerDemand}, supply: ${powerSupply}, surplus: ${powerSurplus}`;
      console.log(`[FAST TICK] ${notes}`);

      await logTick('fast_tick', city.tick_count, city.population, city.funds, notes);

    } catch (err) {
      console.error('[FAST TICK] error:', err);
    }
  });

  // MID TICK - every 10 minutes
  // Handles: business revenue, utility bills
  // Commercial zones generate income, all zones draw utility costs
  cron.schedule('*/10 * * * *', async () => {
    try {
      const city = await getCityMeta();
      const tiles = await getTileCounts();

      // Commercial zones generate $50 per tile per mid tick
      const revenue = tiles.commercial * 50;

      // Every zone costs $5 in utility maintenance per mid tick
      const totalZones = parseInt(tiles.residential) + parseInt(tiles.commercial) + parseInt(tiles.industrial);
      const expenses = totalZones * 5;

      const newFunds = city.funds + revenue - expenses;

      // Update city funds
      await pool.query(
        'UPDATE city_meta SET funds = $1, updated_at = NOW() WHERE id = 1',
        [newFunds]
      );

      const notes = `Revenue: $${revenue}, expenses: $${expenses}, funds: $${newFunds}`;
      console.log(`[MID TICK] ${notes}`);

      await logTick('mid_tick', city.tick_count, city.population, newFunds, notes);

    } catch (err) {
      console.error('[MID TICK] error:', err);
    }
  });

  // SLOW TICK - every 30 minutes
  // Handles: population growth, city budget balance
  // Population grows when residential zones exist and city has funds
  cron.schedule('*/30 * * * *', async () => {
    try {
      const city = await getCityMeta();
      const tiles = await getTileCounts();

      // Each residential tile supports 10 people
      // Population moves toward the capacity over time
      const capacity = tiles.residential * 10;
      const currentPop = city.population;
      const growth = Math.floor((capacity - currentPop) * 0.1);
      const newPopulation = Math.max(0, currentPop + growth);

      // Increment the global tick count
      const newTickCount = city.tick_count + 1;

      await pool.query(
        'UPDATE city_meta SET population = $1, tick_count = $2, updated_at = NOW() WHERE id = 1',
        [newPopulation, newTickCount]
      );

      const notes = `Population: ${currentPop} -> ${newPopulation}, capacity: ${capacity}, tick: ${newTickCount}`;
      console.log(`[SLOW TICK] ${notes}`);

      await logTick('slow_tick', newTickCount, newPopulation, city.funds, notes);

    } catch (err) {
      console.error('[SLOW TICK] error:', err);
    }
  });

};
