const express = require('express');
const cors = require('cors');
const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

const DB_PATH = path.join(__dirname, 'notes.db');
let db;

initSqlJs().then(SQL => {
  if (fs.existsSync(DB_PATH)) {
    const buf = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buf);
  } else {
    db = new SQL.Database();
  }
  db.run('CREATE TABLE IF NOT EXISTS notes (cell_id TEXT PRIMARY KEY, region TEXT, note TEXT, lat REAL, lon REAL, updated_at INTEGER)');
  function save() { fs.writeFileSync(DB_PATH, Buffer.from(db.export())); }
  app.get('/notes', (req, res) => {
    const rows = db.exec('SELECT * FROM notes');
    if (!rows.length) return res.json([]);
    const cols = rows[0].columns;
    res.json(rows[0].values.map(r => { const o = {}; cols.forEach((c,i) => o[c]=r[i]); return o; }));
  });
  app.post('/notes', (req, res) => {
    const { cell_id, region, note, lat, lon } = req.body;
    if (!cell_id || !note) return res.status(400).json({ error: 'missing fields' });
    db.run('INSERT INTO notes (cell_id,region,note,lat,lon,updated_at) VALUES (?,?,?,?,?,?) ON CONFLICT(cell_id) DO UPDATE SET region=excluded.region,note=excluded.note,updated_at=excluded.updated_at', [cell_id,region,note,lat,lon,Date.now()]);
    save();
    res.json({ ok: true });
  });
  app.delete('/notes/:cell_id', (req, res) => {
    db.run('DELETE FROM notes WHERE cell_id = ?', [req.params.cell_id]);
    save();
    res.json({ ok: true });
  });
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log('mind-globe api on ' + PORT));
});
