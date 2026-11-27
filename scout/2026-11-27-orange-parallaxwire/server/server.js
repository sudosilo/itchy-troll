const http = require('http');
const { WebSocketServer } = require('ws');
const PORT = process.env.PORT || 8080;
const corners = new Map();
let shot = null;

const send = (ws, m) => { if (ws.readyState === 1) ws.send(JSON.stringify(m)); };
const broadcast = m => { for (const ws of corners.values()) send(ws, m); };
const roster = () => broadcast({ t: 'roster', r: [...corners.keys()] });

function finish() {
  if (!shot || shot.done) return;
  shot.done = true;
  clearTimeout(shot.timer);
  broadcast({ t: 'ready', id: shot.id, corners: [...shot.frames.keys()].sort((a, b) => a - b) });
}
function checkDone() {
  if (shot && !shot.done && [...shot.want].every(c => shot.frames.has(c) || !corners.has(c))) finish();
}
function startShot() {
  if (shot && !shot.done) return;
  const now = Date.now();
  shot = { id: now, want: new Set(corners.keys()), frames: new Map(), done: false };
  shot.timer = setTimeout(finish, 20000);
  broadcast({ t: 'shoot', id: shot.id, at: now + 3000 });
}

const srv = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const u = new URL(req.url, 'http://x');
  if (u.pathname === '/frame') {
    const id = +u.searchParams.get('id'), c = +u.searchParams.get('c');
    if (shot && shot.id === id && shot.frames.has(c)) {
      res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Cache-Control': 'no-store' });
      return res.end(shot.frames.get(c));
    }
    res.writeHead(404); return res.end('gone');
  }
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('parallax relay ok, ' + corners.size + ' phones');
});

const wss = new WebSocketServer({ server: srv, maxPayload: 40 * 1024 * 1024 });
wss.on('connection', ws => {
  let c = 0;
  for (let k = 1; k <= 4; k++) if (!corners.has(k)) { c = k; break; }
  if (!c) { send(ws, { t: 'full' }); return ws.close(); }
  corners.set(c, ws);
  ws.alive = true;
  ws.on('pong', () => { ws.alive = true; });
  send(ws, { t: 'welcome', corner: c });
  roster();
  ws.on('message', (data, isBinary) => {
    if (isBinary) {
      if (shot && !shot.done && shot.want.has(c)) {
        shot.frames.set(c, Buffer.from(data));
        broadcast({ t: 'shot', s: [...shot.frames.keys()] });
        checkDone();
      }
      return;
    }
    let m; try { m = JSON.parse(data); } catch (e) { return; }
    if (m.t === 'ping') send(ws, { t: 'pong', id: m.id, h: Date.now() });
    else if (m.t === 'arm') startShot();
  });
  ws.on('close', () => { if (corners.get(c) === ws) corners.delete(c); roster(); checkDone(); });
});

setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.alive) { ws.terminate(); continue; }
    ws.alive = false; ws.ping();
  }
}, 20000);

srv.listen(PORT, () => console.log('relay on ' + PORT));
