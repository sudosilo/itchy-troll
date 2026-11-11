// NOTA CITY - routes/tiles.js
// Handles the 32x32 grid tile data
// GET /api/tiles           - returns all 1024 tiles
// GET /api/tiles/:x/:y     - returns one specific tile
// PUT /api/tiles/:x/:y     - updates one tile (used by layer editors)

const express = require('express');
const router = express.Router();

// GET /api/tiles
// Returns all 1024 tiles ordered by coordinates
router.get('/', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const result = await db.query(
      'SELECT * FROM grid_tiles ORDER BY y, x'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('GET /api/tiles error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /api/tiles/:x/:y
// Returns one specific tile by coordinates
router.get('/:x/:y', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { x, y } = req.params;
    const result = await db.query(
      'SELECT * FROM grid_tiles WHERE x = $1 AND y = $2',
      [x, y]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tile not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('GET /api/tiles/:x/:y error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// PUT /api/tiles/:x/:y
// Updates a single tile - called by the layer editor pages
// Body can contain any of: terrain, zone_type, road_type, power_type, water_type
router.put('/:x/:y', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { x, y } = req.params;
    const { terrain, zone_type, road_type, power_type, water_type } = req.body;
    const result = await db.query(
      `INSERT INTO grid_tiles (x, y, terrain, zone_type, road_type, power_type, water_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (x, y) DO UPDATE SET
         terrain = COALESCE($3, grid_tiles.terrain),
         zone_type = COALESCE($4, grid_tiles.zone_type),
         road_type = COALESCE($5, grid_tiles.road_type),
         power_type = COALESCE($6, grid_tiles.power_type),
         water_type = COALESCE($7, grid_tiles.water_type)
       RETURNING *`,
      [x, y, terrain, zone_type, road_type, power_type, water_type]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('PUT /api/tiles/:x/:y error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
