// Mission Operator key store
// API keys live in one Redis hash, mission-operator:keys, with one field per relay.
// The relays call getKey("N2YO_KEY") and get back either the value or a null plus a
// plain-words reason, so the browser is always told the truth about why a layer is empty.
//
// REDIS_URL is the only environment variable involved and it is a connection string,
// not a key. No key value is ever written into this repo.

const { command } = require("./_redis.js");

const HASH = "mission-operator:keys";
const FIELDS = ["N2YO_KEY", "AISSTREAM_KEY", "WIGLE_AUTH"];

// A short in-process cache keeps one scan from opening a socket per relay call.
// Kept short so a freshly added key shows up within a minute without a redeploy.
const TTL_MS = 30000;
let cache = { at: 0, values: null, error: null };

function fresh() {
  return cache.values && Date.now() - cache.at < TTL_MS;
}

async function loadAll() {
  const reply = await command(["HMGET", HASH].concat(FIELDS), 2500);
  const values = {};
  FIELDS.forEach((f, i) => {
    const v = reply && reply[i];
    if (typeof v === "string" && v.length) values[f] = v;
  });
  return values;
}

// Resolves with { value } on success or { value: null, reason, detail } when the key
// cannot be used. Never throws, so a Redis outage can only ever empty a layer, not
// break a relay.
async function getKey(name) {
  if (fresh()) {
    const v = cache.values[name];
    return v ? { value: v } : missing(name, cache.error);
  }
  try {
    const values = await loadAll();
    cache = { at: Date.now(), values, error: null };
    const v = values[name];
    return v ? { value: v } : missing(name, null);
  } catch (e) {
    // Do not cache a failure for the full window; retry sooner but not on every call.
    cache = { at: Date.now() - TTL_MS + 5000, values: cache.values || {}, error: e.message };
    return missing(name, e.message);
  }
}

function missing(name, detail) {
  return { value: null, reason: "key", detail: detail || null, missing: name };
}

// The store's own state, for the health endpoint and the settings pane.
async function status() {
  try {
    const values = await loadAll();
    cache = { at: Date.now(), values, error: null };
    return {
      store: "redis",
      reachable: true,
      fields: FIELDS.map((f) => ({ name: f, present: !!values[f] })),
    };
  } catch (e) {
    return {
      store: "redis",
      reachable: false,
      error: e.message,
      fields: FIELDS.map((f) => ({ name: f, present: false })),
    };
  }
}

module.exports = { getKey, status, HASH, FIELDS };
