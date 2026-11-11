// NOTA CITY BACKEND - index.js
// This is the main entry point for the Express server.
// Railway runs this file to start the backend.

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

// Create the Express app
const app = express();
const PORT = process.env.PORT || 3001;

// CORS allows the frontend on Vercel to talk to this backend on Railway
// Without this, the browser would block the requests
app.use(cors());
app.use(express.json());

// Database connection pool
// Pool manages multiple simultaneous connections to Postgres efficiently
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // required for Railway Postgres
});

// Make the pool available to route files
app.locals.db = pool;

// Routes - each file handles a different section of the API
// /api/city    - city meta: population, funds, tick count
// /api/tiles   - the 32x32 grid tile data
// /api/ticks   - tick log / event history
const cityRoutes = require('./routes/city');
const tilesRoutes = require('./routes/tiles');
const ticksRoutes = require('./routes/ticks');

app.use('/api/city', cityRoutes);
app.use('/api/tiles', tilesRoutes);
app.use('/api/ticks', ticksRoutes);

// Health check endpoint
// Vercel and Railway use this to confirm the server is alive
app.get('/health', (req, res) => {
  res.json({ status: 'ok', project: 'NOTA CITY' });
});

// Start the tick engine
// This is the heartbeat of the city - fires on 5/10/30 min intervals
require('./engine/tickEngine')(pool);

// Start the server
app.listen(PORT, () => {
  console.log(`NOTA CITY backend running on port ${PORT}`);
});
