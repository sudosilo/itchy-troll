// Login relay. Opens the itch.io login in a real browser on the GitHub runner,
// shows it live on a phone page through a temporary tunnel, and passes the
// owner's taps and typing back to the browser. The owner passes the human
// check by hand. When the login goes through, the session is saved, locked
// with the itch password, and committed as itch-session.enc.

const { chromium } = require('playwright');
const { spawn, execSync } = require('child_process');
const crypto = require('crypto');
const http = require('http');
const fs = require('fs');

const USER = (process.env.ITCH_USERNAME || '').trim();
const PASS = process.env.ITCH_PASSWORD || '';
const PORT = 8080;
const W = 1280;
const H = 900;
const LIMIT_MS = 20 * 60 * 1000;
const tokens = new Set();

let page = null;
let done = false;

function log(msg) {
  console.log(`[login-relay] ${msg}`);
}

function git(cmd) {
  execSync(`git ${cmd}`, { stdio: 'inherit' });
}

function commit(files, message) {
  git('config user.name "itchy-troll"');
  git('config user.email "itchy-troll@users.noreply.github.com"');
  git(`add -A ${files.join(' ')}`);
  try {
    execSync(`git commit -q -m "${message}"`);
  } catch {
    return;
  }
  git('pull --rebase -q origin main');
  git('push -q');
}

function safeEqual(a, b) {
  const x = crypto.createHash('sha256').update(String(a)).digest();
  const y = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(x, y);
}

function authed(req) {
  const m = (req.headers.cookie || '').match(/relay=([a-f0-9]{64})/);
  return m && tokens.has(m[1]);
}

function body(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => {
      data += c;
      if (data.length > 10000) req.destroy();
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(data || '{}'));
      } catch {
        resolve({});
      }
    });
  });
}

const GATE = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Itchy Troll login</title><style>
body{margin:0;background:#fafaf7;color:#222;font:17px system-ui,sans-serif;padding:16px}
input,button{font:inherit;padding:12px;border-radius:8px;border:1px solid #bbb;width:100%;box-sizing:border-box;margin-top:10px}
button{background:#ff7a45;color:#fff;border:0}</style></head><body>
<p>Type the value you saved as ITCH_PASSWORD to open the live login.</p>BAD
<form method="post" action="/auth"><input type="password" name="pw" autocomplete="current-password"><button>Open</button></form>
</body></html>`;

const LIVE = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Itchy Troll login</title><style>
body{margin:0;background:#fafaf7;color:#222;font:16px system-ui,sans-serif;padding:16px}
#shot{width:100%;border:1px solid #ccc;border-radius:6px;touch-action:manipulation;display:block}
.row{display:flex;gap:8px;margin-top:10px}
input{flex:1;font:inherit;padding:12px;border-radius:8px;border:1px solid #bbb;min-width:0}
button{font:inherit;padding:12px 14px;border-radius:8px;border:0;background:#ff7a45;color:#fff}
button.soft{background:#e8e4dc;color:#222}
#msg{margin:10px 0}</style></head><body>
<div id="msg">Tap the picture where you would tap on itch.io. It updates every second.</div>
<img id="shot" alt="Live itch.io login">
<div class="row"><input id="txt" placeholder="Text to type"><button id="send">Type</button></div>
<div class="row"><button class="soft" id="enter">Enter</button><button class="soft" id="back">Backspace</button><button class="soft" id="up">Scroll up</button><button class="soft" id="down">Scroll down</button></div>
<script>
const img=document.getElementById('shot');const msg=document.getElementById('msg');
function post(path,data){return fetch(path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data||{})});}
function refresh(){img.src='/shot.png?t='+Date.now();}
img.onload=()=>{msg.textContent='Tap the picture where you would tap on itch.io. It updates every second.';setTimeout(refresh,900);};
img.onerror=()=>{msg.textContent='Picture did not load, trying again.';setTimeout(refresh,2000);};refresh();
img.addEventListener('click',e=>{const r=img.getBoundingClientRect();post('/tap',{x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height});});
document.getElementById('send').onclick=()=>{const t=document.getElementById('txt');post('/type',{text:t.value});t.value='';};
document.getElementById('enter').onclick=()=>post('/key',{key:'Enter'});
document.getElementById('back').onclick=()=>post('/key',{key:'Backspace'});
document.getElementById('up').onclick=()=>post('/scroll',{dy:-400});
document.getElementById('down').onclick=()=>post('/scroll',{dy:400});
setInterval(async()=>{try{const s=await (await fetch('/status')).json();if(s.done){msg.textContent='Logged in and saved. You can close this page.';}}catch{}},2000);
</script></body></html>`;

function startServer() {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    if (req.method === 'POST' && url.pathname === '/auth') {
      let raw = '';
      req.on('data', (c) => (raw += c));
      req.on('end', () => {
        const pw = new URLSearchParams(raw).get('pw') || '';
        if (PASS && safeEqual(pw, PASS)) {
          const t = crypto.randomBytes(32).toString('hex');
          tokens.add(t);
          res.writeHead(303, { 'set-cookie': `relay=${t}; HttpOnly; Secure; SameSite=Strict; Path=/`, location: '/' });
          return res.end();
        }
        log('Someone typed a password that does not match ITCH_PASSWORD');
        res.writeHead(303, { location: '/?bad=1' });
        res.end();
      });
      return;
    }
    if (!authed(req)) {
      res.writeHead(200, { 'content-type': 'text/html' });
      const bad = url.searchParams.has('bad') ? '<p style="color:#b3261e">That does not match ITCH_PASSWORD. Try again.</p>' : '';
      return res.end(GATE.replace('BAD', bad));
    }
    try {
      if (url.pathname === '/') {
        log('Owner opened the live login');
        res.writeHead(200, { 'content-type': 'text/html' });
        return res.end(LIVE);
      }
      if (url.pathname === '/status') {
        res.writeHead(200, { 'content-type': 'application/json' });
        return res.end(JSON.stringify({ done }));
      }
      if (url.pathname === '/shot.png') {
        const png = await page.screenshot();
        res.writeHead(200, { 'content-type': 'image/png', 'cache-control': 'no-store' });
        return res.end(png);
      }
      const data = await body(req);
      if (url.pathname === '/tap') await page.mouse.click(Math.round(data.x * W), Math.round(data.y * H));
      else if (url.pathname === '/type') await page.keyboard.type(String(data.text || '').slice(0, 200), { delay: 40 });
      else if (url.pathname === '/key' && ['Enter', 'Backspace', 'Tab'].includes(data.key)) await page.keyboard.press(data.key);
      else if (url.pathname === '/scroll') await page.mouse.wheel(0, Number(data.dy) || 0);
      res.writeHead(204);
      res.end();
    } catch (e) {
      res.writeHead(500);
      res.end();
    }
  });
  server.listen(PORT);
  return server;
}

function startTunnel() {
  return new Promise((resolve, reject) => {
    const proc = spawn('./cloudflared', ['tunnel', '--no-autoupdate', '--url', `http://localhost:${PORT}`]);
    const timer = setTimeout(() => reject(new Error('Tunnel did not start')), 60000);
    const read = (chunk) => {
      const m = String(chunk).match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
      if (m) {
        clearTimeout(timer);
        resolve(m[0]);
      }
    };
    proc.stdout.on('data', read);
    proc.stderr.on('data', read);
  });
}

async function fillLoginIfShown() {
  const u = page.locator('input[name="username"]').first();
  if ((await u.count()) && (await u.isVisible().catch(() => false)) && !(await u.inputValue().catch(() => 'x'))) {
    await u.fill(USER);
    await page.locator('input[name="password"]').first().fill(PASS);
    log('Login form filled. Waiting for the owner to tap Log in and pass the check.');
  }
}

async function loggedIn() {
  // itch.io sends you away from /login once the login works.
  const url = page.url();
  return url.startsWith('https://itch.io') && !url.includes('/login');
}

(async () => {
  if (!USER || !PASS) throw new Error('ITCH_USERNAME or ITCH_PASSWORD secret is missing');
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: W, height: H } });
  page = await context.newPage();
  await page.goto('https://itch.io/login', { waitUntil: 'domcontentloaded' });

  startServer();
  const link = await startTunnel();
  fs.writeFileSync('login-link.txt', link.replace('https://', '') + '\n');
  commit(['login-link.txt'], 'Login link [no heckle]');
  log('Login page is live. The link is in login-link.txt.');

  const start = Date.now();
  while (Date.now() - start < LIMIT_MS) {
    await fillLoginIfShown().catch(() => {});
    if (await loggedIn().catch(() => false)) {
      await page.goto('https://itch.io/dashboard', { waitUntil: 'domcontentloaded' });
      if (!page.url().includes('/login')) {
        await context.storageState({ path: 'itch-session.json' });
        execSync('openssl enc -aes-256-cbc -pbkdf2 -salt -pass env:ITCH_PASSWORD -in itch-session.json -out itch-session.enc');
        fs.rmSync('itch-session.json');
        fs.rmSync('login-link.txt', { force: true });
        commit(['itch-session.enc', 'login-link.txt'], 'Save itch login [no heckle]');
        done = true;
        log('Logged in. Session saved as itch-session.enc.');
        await new Promise((r) => setTimeout(r, 8000));
        await browser.close();
        process.exit(0);
      }
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  fs.rmSync('login-link.txt', { force: true });
  commit(['login-link.txt'], 'Login link expired [no heckle]');
  throw new Error('Nobody finished the login within 20 minutes');
})().catch((e) => {
  log(`FAILED: ${e.message}`);
  try {
    fs.rmSync('login-link.txt', { force: true });
    commit(['login-link.txt'], 'Login link expired [no heckle]');
  } catch {}
  process.exit(1);
});
