// NOTA CITY - routes/city.js
// Handles the global city metadata: population, funds, tick count
// GET /api/city       - returns current city stats
// PUT /api/city       - updates city stats (funds, population)

const express = require('express');
const router = express.Router();

// GET /api/city
// Returns the single row from city_meta
router.get('/', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const result = await db.query('SELECT * FROM city_meta LIMIT 1');
    res.json(result.rows[0]);
  } catch (err) {
    console.error('GET /api/city error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// PUT /api/city
// Updates population and funds
router.put('/', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { population, funds } = req.body;
    const result = await db.query(
      `UPDATE city_meta 
       SET population = $1, funds = $2, updated_at = NOW() 
       WHERE id = 1 
       RETURNING *`,
      [population, funds]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('PUT /api/city error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
