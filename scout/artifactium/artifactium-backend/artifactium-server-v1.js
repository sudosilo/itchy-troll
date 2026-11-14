// Artifactium backend v1: specimen records, contributions and photos.
// Postgres holds records and photos. Redis caches the catalog list.
// Photos move to Cloudflare R2 automatically when the R2 variables are set.
import express from 'express';
import pg from 'pg';
import { createClient } from 'redis';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { createHash } from 'crypto';

const PORT = process.env.PORT || 8080;
const DB_URL = process.env.DATABASE_URL;
const LIST_KEY = 'artifactium:list:v1';
// Supabase handles contributor sign in. The URL and publishable key are public values.
const SB_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SB_KEY = process.env.SUPABASE_ANON_KEY || '';
const AUTH_ON = !!(SB_URL && SB_KEY);

const pool = new pg.Pool({
  connectionString: DB_URL,
  ssl: !DB_URL || DB_URL.includes('.railway.internal') ? false : { rejectUnauthorized: false },
  max: 8
});

let redis = null;
if (process.env.REDIS_URL) {
  redis = createClient({ url: process.env.REDIS_URL });
  redis.on('error', e => console.error('redis', e.message));
  redis.connect().catch(e => { console.error('redis connect', e.message); redis = null; });
}

const R2 = process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET
  ? new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY }
    })
  : null;

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS specimens (
      code TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS photos (
      id BIGSERIAL PRIMARY KEY,
      code TEXT,
      mime TEXT NOT NULL DEFAULT 'image/jpeg',
      full_img BYTEA,
      thumb_img BYTEA,
      in_r2 BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS contributions (
      id BIGSERIAL PRIMARY KEY,
      code TEXT NOT NULL,
      data JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS contributions_code ON contributions(code);
    CREATE TABLE IF NOT EXISTS contributors (
      user_id TEXT PRIMARY KEY,
      email TEXT,
      handle TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'finder',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS contributors_handle_lower ON contributors (lower(handle));
    CREATE TABLE IF NOT EXISTS counters (
      fam TEXT PRIMARY KEY,
      n INTEGER NOT NULL
    );
  `);
}

const CODE_RE = /^ART-[A-Z]{3}-\d{4,}$/;
const FAM_RE = /^[A-Z]{3}$/;
const PHOTO_URL_RE = /^\/api\/photos\/\d+\/(full|thumb)$/;
const clip = (v, n) => String(v == null ? '' : v).slice(0, n);

function cleanRecord(rec, code) {
  if (!rec || typeof rec !== 'object' || Array.isArray(rec)) throw new Error('record missing');
  const r = { ...rec, code };
  delete r._t; delete r.sim;
  for (const k of ['photo', 'photoFull']) if (r[k] && !PHOTO_URL_RE.test(r[k])) delete r[k];
  if (JSON.stringify(r).length > 200000) throw new Error('record too large');
  return r;
}

function decodeImage(dataUrl, maxBytes) {
  if (!dataUrl) return null;
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!m) throw new Error('bad image');
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > maxBytes) throw new Error('image too large');
  return { mime: m[1], buf };
}

async function nextCode(fam) {
  const { rows } = await pool.query(
    `INSERT INTO counters (fam, n) VALUES ($1, 101)
     ON CONFLICT (fam) DO UPDATE SET n = counters.n + 1 RETURNING n`, [fam]);
  return `ART-${fam}-${String(rows[0].n).padStart(4, '0')}`;
}

async function storePhoto(code, full, thumb) {
  if (R2) {
    const { rows } = await pool.query(`INSERT INTO photos (code, mime, in_r2) VALUES ($1, $2, true) RETURNING id`, [code, full.mime]);
    const id = rows[0].id;
    await R2.send(new PutObjectCommand({ Bucket: process.env.R2_BUCKET, Key: `photos/${id}-full`, Body: full.buf, ContentType: full.mime }));
    await R2.send(new PutObjectCommand({ Bucket: process.env.R2_BUCKET, Key: `photos/${id}-thumb`, Body: (thumb || full).buf, ContentType: (thumb || full).mime }));
    return id;
  }
  const { rows } = await pool.query(
    `INSERT INTO photos (code, mime, full_img, thumb_img) VALUES ($1, $2, $3, $4) RETURNING id`,
    [code, full.mime, full.buf, (thumb || full).buf]);
  return rows[0].id;
}

const ROLES = ['finder', 'picker', 'engineer', 'tracer', 'maker', 'fashion'];
const HANDLE_RE = /^[A-Za-z0-9_]{3,24}$/;

async function userFrom(req) {
  if (!AUTH_ON) return null;
  const h = req.get('authorization') || '';
  const token = h.startsWith('Bearer ') ? h.slice(7).trim() : '';
  if (!token) return null;
  const key = 'artifactium:tok:' + createHash('sha256').update(token).digest('hex');
  if (redis && redis.isReady) {
    try { const hit = await redis.get(key); if (hit) return JSON.parse(hit); } catch {}
  }
  try {
    const r = await fetch(`${SB_URL}/auth/v1/user`, { headers: { apikey: SB_KEY, Authorization: `Bearer ${token}` } });
    if (!r.ok) return null;
    const u = await r.json();
    if (!u || !u.id) return null;
    const user = { id: u.id, email: u.email || '' };
    if (redis && redis.isReady) { try { await redis.set(key, JSON.stringify(user), { EX: 300 }); } catch {} }
    return user;
  } catch (e) { console.error('auth check', e.message); return null; }
}

async function profileOf(userId) {
  const { rows } = await pool.query('SELECT user_id, handle, role, created_at FROM contributors WHERE user_id = $1', [userId]);
  return rows[0] || null;
}

// Writes need a signed in contributor with a handle once Supabase is configured.
async function needContributor(req, res) {
  if (!AUTH_ON) return { anon: true };
  const user = await userFrom(req);
  if (!user) { res.status(401).json({ error: 'sign in' }); return null; }
  const profile = await profileOf(user.id);
  if (!profile) { res.status(403).json({ error: 'pick a handle' }); return null; }
  return { user, profile };
}

async function dropCache() { if (redis) { try { await redis.del(LIST_KEY); } catch {} } }

let READY = false;
const app = express();
app.disable('x-powered-by');
app.get('/', (req, res) => res.json({ name: 'artifactium-backend', ready: READY, photos: R2 ? 'r2' : 'postgres', auth: AUTH_ON }));
app.use(express.json({ limit: '15mb' }));
app.use((req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
app.use('/api', (req, res, next) => READY ? next() : res.status(503).json({ error: 'starting up' }));

app.get('/health', async (req, res) => {
  let db = false;
  try { await pool.query('SELECT 1'); db = true; } catch {}
  res.json({ ok: db, db, redis: !!(redis && redis.isReady), photos: R2 ? 'r2' : 'postgres', auth: AUTH_ON });
});

app.get('/api/config', (req, res) => res.json({ supabaseUrl: SB_URL, supabaseKey: SB_KEY, auth: AUTH_ON }));

app.get('/api/me', async (req, res) => {
  const user = await userFrom(req);
  if (!user) return res.status(401).json({ error: 'sign in' });
  res.json({ user: { email: user.email }, profile: await profileOf(user.id) });
});

app.post('/api/me', async (req, res) => {
  const user = await userFrom(req);
  if (!user) return res.status(401).json({ error: 'sign in' });
  const handle = String((req.body || {}).handle || '').trim();
  const role = ROLES.includes((req.body || {}).role) ? req.body.role : 'finder';
  if (!HANDLE_RE.test(handle)) return res.status(400).json({ error: 'Handles use letters, numbers and underscores, between three and twenty four characters.' });
  try {
    await pool.query(
      `INSERT INTO contributors (user_id, email, handle, role) VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id) DO UPDATE SET handle = EXCLUDED.handle, role = EXCLUDED.role`,
      [user.id, user.email, handle, role]);
    res.json({ profile: await profileOf(user.id) });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'That handle is taken.' });
    console.error(e); res.status(500).json({ error: 'save failed' });
  }
});

app.get('/api/contributors/:handle', async (req, res) => {
  const { rows } = await pool.query('SELECT handle, role, created_at FROM contributors WHERE lower(handle) = lower($1)', [req.params.handle]);
  if (!rows.length) return res.status(404).json({ error: 'not found' });
  const n = await pool.query(`SELECT count(*)::int AS n FROM contributions WHERE data->>'handle' = $1`, [rows[0].handle]);
  res.json({ profile: rows[0], contributions: n.rows[0].n });
});

app.get('/api/specimens', async (req, res) => {
  try {
    if (redis && redis.isReady) {
      const hit = await redis.get(LIST_KEY);
      if (hit) return res.type('application/json').send(hit);
    }
    const { rows } = await pool.query('SELECT data FROM specimens ORDER BY code');
    const body = JSON.stringify({ records: rows.map(r => r.data), at: new Date().toISOString() });
    if (redis && redis.isReady) await redis.set(LIST_KEY, body, { EX: 300 });
    res.type('application/json').send(body);
  } catch (e) { console.error(e); res.status(500).json({ error: 'list failed' }); }
});

app.get('/api/specimens/:code', async (req, res) => {
  if (!CODE_RE.test(req.params.code)) return res.status(400).json({ error: 'bad code' });
  const { rows } = await pool.query('SELECT data FROM specimens WHERE code = $1', [req.params.code]);
  if (!rows.length) return res.status(404).json({ error: 'not found' });
  const notes = await pool.query('SELECT data, created_at FROM contributions WHERE code = $1 ORDER BY id', [req.params.code]);
  res.json({ record: rows[0].data, contributions: notes.rows });
});

app.post('/api/specimens', async (req, res) => {
  try {
    const who = await needContributor(req, res);
    if (!who) return;
    const { record, fam, photo, thumb } = req.body || {};
    if (!FAM_RE.test(fam || '')) return res.status(400).json({ error: 'bad family' });
    const full = decodeImage(photo, 6 * 1024 * 1024);
    const small = decodeImage(thumb, 600 * 1024);
    const code = await nextCode(fam);
    const r = cleanRecord(record, code);
    delete r.photo; delete r.photoFull;
    if (full) {
      const id = await storePhoto(code, full, small);
      r.photo = `/api/photos/${id}/thumb`;
      r.photoFull = `/api/photos/${id}/full`;
    }
    if (!r.logged) r.logged = new Date().toISOString().slice(0, 10);
    if (who.profile) r.loggedBy = who.profile.handle;
    await pool.query('INSERT INTO specimens (code, data) VALUES ($1, $2)', [code, r]);
    await dropCache();
    res.json({ record: r });
  } catch (e) { console.error(e); res.status(400).json({ error: e.message }); }
});

app.post('/api/specimens/:code/contributions', async (req, res) => {
  try {
    const code = req.params.code;
    if (!CODE_RE.test(code)) return res.status(400).json({ error: 'bad code' });
    const who = await needContributor(req, res);
    if (!who) return;
    const { contribution, record } = req.body || {};
    const c = contribution || {};
    const note = { role: clip(c.role, 40), handle: clip(c.handle, 60) || 'anonymous', text: clip(c.text, 2000), target: clip(c.target, 80) };
    if (who.profile) { note.handle = who.profile.handle; note.user_id = who.user.id; }
    const r = cleanRecord(record, code);
    const old = await pool.query('SELECT data FROM specimens WHERE code = $1', [code]);
    if (old.rows.length) { const o = old.rows[0].data; r.photo = o.photo; r.photoFull = o.photoFull; if (!r.photo) { delete r.photo; delete r.photoFull; } if (o.loggedBy) r.loggedBy = o.loggedBy; else delete r.loggedBy; }
    await pool.query(
      `INSERT INTO specimens (code, data) VALUES ($1, $2)
       ON CONFLICT (code) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`, [code, r]);
    await pool.query('INSERT INTO contributions (code, data) VALUES ($1, $2)', [code, note]);
    await dropCache();
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(400).json({ error: e.message }); }
});

app.get('/api/photos/:id/:size', async (req, res) => {
  const id = Number(req.params.id), size = req.params.size;
  if (!Number.isInteger(id) || !['full', 'thumb'].includes(size)) return res.sendStatus(400);
  try {
    const { rows } = await pool.query(
      `SELECT mime, in_r2, ${size === 'full' ? 'full_img' : 'thumb_img'} AS img FROM photos WHERE id = $1`, [id]);
    if (!rows.length) return res.sendStatus(404);
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    res.type(rows[0].mime);
    if (rows[0].in_r2) {
      if (!R2) return res.sendStatus(503);
      const obj = await R2.send(new GetObjectCommand({ Bucket: process.env.R2_BUCKET, Key: `photos/${id}-${size}` }));
      return obj.Body.pipe(res);
    }
    res.send(rows[0].img);
  } catch (e) { console.error(e); res.sendStatus(500); }
});

app.listen(PORT, '0.0.0.0', () => console.log(`artifactium backend on ${PORT}`));
(async function boot(tries = 0) {
  try { await init(); READY = true; console.log('database ready'); }
  catch (e) { console.error('init failed, retrying', e.message); setTimeout(() => boot(tries + 1), Math.min(30000, 2000 * (tries + 1))); }
})();
