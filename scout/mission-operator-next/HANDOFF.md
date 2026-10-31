# Handoff notes — mission-operator-next and mission-operator-redis

Written October 30, 2026 by Crock Pot. Read this before changing either project.

## 1. Railway project `mission-operator-redis`

Owner is Dick's own connected Railway account. Nothing was created outside it.

- Account: `dicktemple` (@sudosilo)
- Email: sudosilo2@gmail.com
- Account ID: `f2da583e-a7db-4124-9cb7-04d29330fe2e`
- Registration status: REGISTERED (created 2026-04-08)
- Workspace: Rex Project
- Project ID: `2009ca81-fce2-46ae-b6b6-c5bd48c065b7`
- Environment: production `cdb4cd98-9dbc-4e02-8a26-71f714086fb6`

One service, **Redis** (`77bf2721-7fa6-47af-8d75-1d7a00d83a1e`), built from the
official `redis` template on image `redis:8.2`, one replica in `us-east4`, status
SUCCESS (deployment `53a2b479-c6c9-42a2-900e-f3d597463407`). A 5GB volume
`redis-volume` is mounted at `/data`, so keys survive a redeploy.

A TCP proxy exists on `mainline.proxy.rlwy.net:38912` forwarding to application port
6379, and Railway reports it ACTIVE. This is what lets the Vercel relays reach Redis
from outside Railway's private network.

**Connection test result, stated plainly: it did not succeed from the box.**
The first attempt timed out. The retest against the finished deployment also failed,
returning `HTTP/1.1 400 Bad Request / Server: Pingora`, which is Railway's HTTP edge
answering instead of Redis. The cause is the box's network, not the service:
`mainline.proxy.rlwy.net` resolves to `198.18.0.1`, a sinkhole address, and all
outbound traffic is forced through an HTTP egress proxy that rejects raw Redis
protocol bytes. So no one has yet authenticated against this Redis instance from
outside Railway. Treat reachability as unproven until a test from inside a Vercel
function says otherwise.

## 2. Only three of the seven relays need a key

Four of the seven relays use no key at all: `aircraft.js`, `mesh.js`, `osm.js`,
`weather.js`. The three that do are:

- `N2YO_KEY` — `api/sats.js`. Satellites (Starlink, GPS, weather sats, debris, rocket
  bodies) all come from one N2YO call. Free key from n2yo.com.
- `AISSTREAM_KEY` — `api/ships.js`. Ships via the AISstream WebSocket. Free key from
  aisstream.io.
- `WIGLE_AUTH` — `api/wigle.js`. Wi-Fi and Bluetooth. This is the "Encoded for use"
  value from the WiGLE account API page, not the raw username and password.

The earlier figure of four keys was wrong. There are three. A note that says four
will send the next agent looking for a variable that does not exist.

## 3. The variable that had to be re-set

`REDIS_PASSWORD` on the Redis service. The first write landed the literal text of a
shell substitution rather than the password itself, which would have started the
server with the wrong password and made `REDISPASSWORD` and `REDIS_URL` resolve
wrongly too. It was re-written with the actual 40-character value, so all three
derived variables are now correct.

The correct value is generated once and kept **outside the repo** at
`/home/box/.secrets/railway-redis-password` on the box. Do not copy it into the repo,
into a commit, into a chat message, or into these notes. If it is lost, read it from
the service's Variables tab in the Railway dashboard, or rotate it there and update
the same file.

## 4. `mission-operator-next` — what the fork build actually did

Standalone copy of `sudosilo/mission-operator` at
https://github.com/sudosilo/mission-operator-next. It is a copy, not a GitHub fork,
because GitHub will not let one account own both a parent and a fork of it. The
original repo is untouched.

Commit **`2fc4422`** (`2fc44226f61ea2f877608e16898ea9361a9d58f1`) is on **`main`**.
There is no branch named `mission-operator-next`; if a note tells you to check out
that branch, it is wrong.

Changes in that commit:

- Every upstream HTTP call goes through one `fetchT` timeout helper, so no relay can
  hang a function: 6s aircraft, 9s mesh, 12s per OSM mirror inside an 18s total
  budget, 8s satellites and WiGLE, 8s plus 5s on weather.
- `api/ships.js` has no `fetchT` and should not get one. It speaks the AISstream
  WebSocket, so there is no HTTP fetch to wrap; it is covered by a 4.5s collect
  window and a top-level catch that returns 502 instead of a bare 500.
- `vercel.json` raises `api/ships.js` to `maxDuration: 20`.
- Every relay answers in one shape, `{error, missing?, hint, items|ships|aircraft|sats}`,
  with a hint in plain words. No relay returns a bare 500.
- The client's `get()` always resolves, aborts at 20s, checks `r.ok` and survives a
  non-JSON body. Global `error` and `unhandledrejection` listeners are guarded for
  early DOM.
- Dead feeds are tracked per group, so a relay that can never succeed stops being
  polled. `RETRY KEYS` in Settings re-polls on demand. Observed over a 200s run:
  ships and sats hit once each, healthy aircraft hit 10 times.
- Scoring is deterministic, via a local string hash instead of `Math.random()`.
  Three loads of the same Wi-Fi list scored 269 points each time.
- Smaller fixes: `scansLeft()` saves on day rollover, sats status set for disabled
  layers, `renderPanes` returns early on the MAP tab, aria-labels on scan, recenter
  and map, meta description plus OG and Twitter tags, an inline SVG favicon,
  `VERSION` at `v2026.10.31`.

Verification that was actually run: `node --check` on all seven relays and the
extracted inline script; headless Chrome against a stub server serving canned JSON
including a 502 with a non-JSON body and a 404, four runs, no page errors; 24 handler
assertions against the real `api/` code with a mocked fetch.

Not deployed to Vercel yet.

## 5. Redis key store — in progress, not committed

Being written on top of `2fc4422` and **not yet committed or pushed**:

- `api/_redis.js` — a small RESP2 client on `node:net`, no dependency, no build step.
  Reads `REDIS_URL` as a connection string only.
- `api/_keys.js` — reads the hash `mission-operator:keys` with `HMGET` over
  `N2YO_KEY`, `AISSTREAM_KEY`, `WIGLE_AUTH`. Caches in process for 30s so one scan
  does not open a socket per call. Never throws: a Redis outage empties a layer
  instead of breaking a relay.
- `api/sats.js`, `api/ships.js`, `api/wigle.js` now call `getKey(...)` instead of
  reading `process.env`. The `process.env` references are gone from all three.
  When a key is absent they return the same honest missing-key body as before, plus a
  `store` field that distinguishes "redis reachable, key absent" from "redis
  unreachable".

No key value is hardcoded anywhere. The only environment variable in the design is
`REDIS_URL`, and it holds a connection string, not a key. Whoever finishes this needs
to set `REDIS_URL` on the Vercel project from the Railway service's Variables tab,
deploy, and confirm a real successful `PING` from inside a function.

## 6. Where the secrets live

Nothing sensitive is in either repo or in this file.

- Redis password and `REDIS_URL`: Railway dashboard, `mission-operator-redis` →
  Redis service → Variables. Also mirrored at `/home/box/.secrets/railway-redis-password`
  on the box for scripted use.
- Vercel side needs only `REDIS_URL`, set on the project's environment variables.
- The three API keys belong in the Redis hash `mission-operator:keys`, not in Vercel
  env vars and not in the repo.

## 7. Current status

Redis is provisioned and healthy. The key store is written but uncommitted, the app
is not deployed, and end-to-end reachability from Vercel to Railway is unproven.
Crock Pot is finishing the wiring and the deploy and will report only once it is live
and proven working.
