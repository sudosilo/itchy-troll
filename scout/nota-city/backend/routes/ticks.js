// NOTA CITY - routes/ticks.js
// Handles the tick event log
// GET /api/ticks           - returns last 100 tick events
// GET /api/ticks/:type     - returns ticks filtered by type (fast/mid/slow)

const express = require('express');
const router = express.Router();

// GET /api/ticks
// Returns the 100 most recent tick log entries
router.get('/', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const result = await db.query(
      'SELECT * FROM tick_log ORDER BY fired_at DESC LIMIT 100'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('GET /api/ticks error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /api/ticks/:type
// Returns ticks filtered by type: fast_tick, mid_tick, or slow_tick
router.get('/:type', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { type } = req.params;
    const result = await db.query(
      'SELECT * FROM tick_log WHERE tick_type = $1 ORDER BY fired_at DESC LIMIT 50',
      [type]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('GET /api/ticks/:type error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
