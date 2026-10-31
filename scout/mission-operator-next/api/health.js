// Mission Operator health check
// Reports whether the process can actually reach the Redis key store, and which of
// the three API keys are present. Presence only: this endpoint never returns a value,
// so it is safe to leave public.

const { status } = require("./_keys.js");

module.exports = async function handler(req, res) {
  const started = Date.now();
  const store = await status();
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({
    ok: store.reachable,
    store: store.store,
    reachable: store.reachable,
    error: store.error || null,
    fields: store.fields,
    ms: Date.now() - started,
    at: new Date().toISOString(),
  });
};
