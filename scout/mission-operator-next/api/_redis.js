// Mission Operator Redis client
// A very small RESP2 client built on node:net, so the relays can read the API key
// store without adding a dependency or a build step.
// Connection comes from the REDIS_URL environment variable, which is a connection
// string only. The API keys themselves live in Redis, never in the environment.

const net = require("node:net");

// ---------- RESP2 encoding ----------

function encode(args) {
  let out = "*" + args.length + "\r\n";
  for (let i = 0; i < args.length; i++) {
    const s = String(args[i]);
    out += "$" + Buffer.byteLength(s) + "\r\n" + s + "\r\n";
  }
  return out;
}

// ---------- RESP2 decoding ----------
// Reads one reply from buf starting at pos. Returns null when the reply is not
// complete yet, otherwise { value, pos }.

function decode(buf, pos) {
  if (pos >= buf.length) return null;
  const nl = buf.indexOf("\r\n", pos);
  if (nl === -1) return null;
  const type = buf[pos];
  const head = buf.toString("utf8", pos + 1, nl);
  const next = nl + 2;

  if (type === 43) return { value: head, pos: next };                 // + simple string
  if (type === 45) return { value: new Error(head), pos: next };      // - error
  if (type === 58) return { value: parseInt(head, 10), pos: next };   // : integer

  if (type === 36) {                                                  // $ bulk string
    const len = parseInt(head, 10);
    if (len === -1) return { value: null, pos: next };
    if (buf.length < next + len + 2) return null;
    return { value: buf.toString("utf8", next, next + len), pos: next + len + 2 };
  }

  if (type === 42) {                                                  // * array
    const count = parseInt(head, 10);
    if (count === -1) return { value: null, pos: next };
    const items = [];
    let p = next;
    for (let i = 0; i < count; i++) {
      const r = decode(buf, p);
      if (!r) return null;
      if (r.value instanceof Error) return { value: r.value, pos: r.pos };
      items.push(r.value);
      p = r.pos;
    }
    return { value: items, pos: p };
  }

  return { value: new Error("unexpected RESP type " + JSON.stringify(String.fromCharCode(type))), pos: next };
}

// ---------- connection ----------

function parseUrl(raw) {
  if (!raw) return null;
  let u;
  try {
    u = new URL(raw);
  } catch (e) {
    return null;
  }
  const host = u.hostname;
  const port = parseInt(u.port || "6379", 10);
  if (!host || !isFinite(port)) return null;
  const user = u.username ? decodeURIComponent(u.username) : "";
  const pass = u.password ? decodeURIComponent(u.password) : "";
  return { host, port, user, pass, tls: u.protocol === "rediss:" };
}

// Runs one command against Redis and resolves with its reply.
// Rejects on socket error, on a Redis error reply, or when the timeout fires.
function command(args, timeoutMs) {
  const conn = parseUrl(process.env.REDIS_URL);
  if (!conn) return Promise.reject(new Error("REDIS_URL is not set or is not a redis:// URL"));
  const ms = timeoutMs || 2500;

  return new Promise((resolve, reject) => {
    let settled = false;
    let buf = Buffer.alloc(0);
    let sent = false;

    const socket = conn.tls
      ? require("node:tls").connect({ host: conn.host, port: conn.port, servername: conn.host })
      : net.connect({ host: conn.host, port: conn.port });

    const finish = (err, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { socket.destroy(); } catch (e) {}
      if (err) reject(err); else resolve(value);
    };

    const timer = setTimeout(() => finish(new Error("redis timeout after " + ms + "ms")), ms);

    socket.on("error", (e) => finish(e));
    socket.on("close", () => finish(new Error("redis closed before replying")));

    socket.on("data", (chunk) => {
      buf = Buffer.concat([buf, chunk]);

      if (!sent) {
        const first = decode(buf, 0);
        if (!first) return;
        if (first.value instanceof Error) return finish(new Error("redis rejected auth: " + first.value.message));
        buf = buf.subarray(first.pos);
        sent = true;
        socket.write(encode(args));
      }

      const reply = decode(buf, 0);
      if (!reply) return;
      if (reply.value instanceof Error) return finish(new Error(reply.value.message));
      finish(null, reply.value);
    });

    socket.on("connect", () => {
      if (conn.pass) {
        socket.write(encode(conn.user ? ["AUTH", conn.user, conn.pass] : ["AUTH", conn.pass]));
      } else {
        sent = true;
        socket.write(encode(args));
      }
    });
  });
}

module.exports = { command, parseUrl };
