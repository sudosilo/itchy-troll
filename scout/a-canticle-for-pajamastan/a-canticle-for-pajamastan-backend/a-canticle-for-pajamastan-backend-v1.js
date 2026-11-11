// A Canticle for Pajamastan relay server, version one.
// Built from a-canticle-for-pajamastan-v1-spec-netsync.md. The server never runs the game.
// It holds rooms, hands out slots, picks the leader by join order, checks every game event
// with the same netsync rules the clients use, and forwards good events to the rest of the room.
//
// Client to server control messages (JSON):
//   { k: 'join', room, password, actor, name }      first message after connecting
//   { k: 'game', msg: { t, s, b } }                 a netsync game event
//   { k: 'ping' }
// Server to client:
//   { k: 'joined', slot, leader, players }          { k: 'peer', event: 'join'|'leave', slot, actor, name, leader }
//   { k: 'game', msg }                              { k: 'error', reason }   { k: 'pong', t }
const http = require('http');
const { WebSocketServer } = require('ws');
const net = require('./a-canticle-for-pajamastan-v1-netsync.js');

const PORT = process.env.PORT || 8080;
const MAX_ROOMS = 500;
const MAX_MSG_BYTES = 4096;
const MAX_MSGS_PER_SECOND = 40;
const rooms = new Map();

function roomView() {
  return [...rooms.values()].map((r) => ({ name: r.name, players: r.joinOrder.length, locked: !!r.password }));
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.url === '/rooms') { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(roomView())); return; }
  if (req.url === '/health') { res.end('ok'); return; }
  res.end('A Canticle for Pajamastan relay');
});

const wss = new WebSocketServer({ server, maxPayload: MAX_MSG_BYTES });

function send(ws, obj) { if (ws.readyState === 1) ws.send(JSON.stringify(obj)); }

function broadcast(room, obj, exceptSlot) {
  for (const slot of room.joinOrder) if (slot !== exceptSlot) send(room.sockets[slot], obj);
}

function rulebook(room) {
  const slots = {};
  for (const s of room.joinOrder) slots[s] = { actor: room.actors[s] };
  return { slots, leader: room.leader, entities: null };
}

function leave(ws) {
  const room = ws.room; if (!room) return;
  const slot = ws.slot;
  room.joinOrder = room.joinOrder.filter((s) => s !== slot);
  delete room.sockets[slot]; delete room.actors[slot]; delete room.names[slot];
  room.leader = net.pickLeader(room.joinOrder, room.sockets);
  ws.room = null;
  if (!room.joinOrder.length) rooms.delete(room.name);
  else broadcast(room, { k: 'peer', event: 'leave', slot, leader: room.leader });
}

wss.on('connection', (ws) => {
  ws.room = null; ws.slot = null; ws.bucket = { t: Date.now(), n: 0 };
  ws.on('message', (data) => {
    const now = Date.now();
    if (now - ws.bucket.t > 1000) ws.bucket = { t: now, n: 0 };
    if (++ws.bucket.n > MAX_MSGS_PER_SECOND) return;
    let m; try { m = JSON.parse(data); } catch (e) { return; }
    if (!m || typeof m !== 'object') return;

    if (m.k === 'ping') { send(ws, { k: 'pong', t: now }); return; }

    if (m.k === 'join') {
      if (ws.room) { send(ws, { k: 'error', reason: 'already in a room' }); return; }
      const name = String(m.room || '').slice(0, 32);
      const actor = String(m.actor || '').slice(0, 32);
      if (!name || !actor) { send(ws, { k: 'error', reason: 'room and actor needed' }); return; }
      let room = rooms.get(name);
      if (!room) {
        if (rooms.size >= MAX_ROOMS) { send(ws, { k: 'error', reason: 'server full' }); return; }
        room = { name, password: String(m.password || ''), joinOrder: [], sockets: {}, actors: {}, names: {}, leader: null };
        rooms.set(name, room);
      } else if (room.password && room.password !== String(m.password || '')) { send(ws, { k: 'error', reason: 'wrong password' }); return; }
      let slot = null;
      for (let s = 0; s < net.MAX_SLOTS; s++) if (!(s in room.sockets)) { slot = s; break; }
      if (slot === null) { send(ws, { k: 'error', reason: 'room full' }); return; }
      if (Object.values(room.actors).includes(actor)) { send(ws, { k: 'error', reason: 'actor already in room' }); return; }
      room.sockets[slot] = ws; room.actors[slot] = actor; room.names[slot] = String(m.name || actor).slice(0, 16);
      room.joinOrder.push(slot);
      room.leader = net.pickLeader(room.joinOrder, room.sockets);
      ws.room = room; ws.slot = slot;
      send(ws, { k: 'joined', slot, leader: room.leader, players: room.joinOrder.map((s) => ({ slot: s, actor: room.actors[s], name: room.names[s] })) });
      broadcast(room, { k: 'peer', event: 'join', slot, actor, name: room.names[slot], leader: room.leader }, slot);
      return;
    }

    if (m.k === 'game') {
      const room = ws.room; if (!room || !m.msg) return;
      if (m.msg.s !== ws.slot) return;
      const bad = net.validate(m.msg, rulebook(room));
      if (bad) { send(ws, { k: 'error', reason: bad }); return; }
      broadcast(room, { k: 'game', msg: m.msg }, ws.slot);
    }
  });
  ws.on('close', () => leave(ws));
  ws.on('error', () => leave(ws));
});

server.listen(PORT, () => console.log('relay listening on ' + PORT));
