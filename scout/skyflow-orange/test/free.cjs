// Browser check of Free build: three trucks, welding, Turn and Flip.
// Run: node test/free.cjs [outDir] [page]
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const out = process.argv[2] || '/tmp/skyshots-free';
const page0 = process.argv[3] ? path.resolve(process.argv[3]) : path.join(__dirname, '..', 'index.html');
const url = 'file://' + page0 + '#debug';

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const opts = { args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] };
  if (fs.existsSync('/usr/bin/google-chrome')) opts.executablePath = '/usr/bin/google-chrome';
  const browser = await chromium.launch(opts);
  const errors = [];
  const need = (ok, what) => { console.log((ok ? 'PASS ' : 'FAIL ') + what); if (!ok) errors.push(what); };
  const open = async (w, h) => {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true });
    // the itch.io copy loads an unlock kit from the web; stand in an unlocked one
    await ctx.route('**/unlock-kit.js', (r) => r.fulfill({ contentType: 'text/javascript', body: 'window.ItchyUnlock={isUnlocked:()=>true,require:async()=>true,offer:async()=>true};' }));
    const page = await ctx.newPage();
    page.on('console', (m) => { if (m.type() === 'error' && !/CORS|Failed to load resource|net::/i.test(m.text())) errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(url);
    await page.waitForTimeout(1200);
    return page;
  };

  const page = await open(412, 883);
  const shot = (n) => page.screenshot({ path: path.join(out, n + '.png') });
  await shot('01-menu');
  await page.getByText('Free build').click();
  await page.waitForTimeout(1500);
  await shot('02-three-trucks');
  need(await page.evaluate(() => { const k = window.__sky._boxes.filter((b) => b.userData.onTruck).map((b) => b.userData.kind).sort().join(); return k === 'container,crate,joint'; }), 'three trucks loaded: container, crate, joint');
  need(await page.getByLabel('Turn the load').count() === 1 && await page.getByLabel('Flip the load').count() === 1, 'Turn and Flip buttons shown');

  await page.evaluate(() => {
    const g = window.__sky; const S = g._sim;
    g.setFreeWind(0);
    window.wait = (ms) => new Promise((r) => setTimeout(r, ms));
    window.park = (x, z, hookY) => { S.trolley = Math.hypot(x, z); S.slew = Math.atan2(-z, x); S.hookX = x; S.hookZ = z; S.hookVX = 0; S.hookVZ = 0; S.cable = 62.8 - hookY; };
    window.fetchLoad = async (kind) => {
      const tx = { container: -12, crate: -1, joint: 9 }[kind];
      while (!g._boxes.some((b) => b.userData.onTruck && b.userData.kind === kind)) await window.wait(200);
      window.park(tx, 20, 3.0); await window.wait(500);
      g.grab(); await window.wait(400);
      window.park(tx, 20, 12); await window.wait(500);
      return S.carrying.userData.kind;
    };
  });

  need(await page.evaluate(async () => { const k = await window.fetchLoad('container'); window.park(8, 6, 12); await window.wait(700); window.park(8, 6, 2.0); await window.wait(1200); window.__sky.grab(); await window.wait(900); return k; }) === 'container', 'container taken from its truck');
  need(await page.evaluate(async () => { const k = await window.fetchLoad('joint'); window.park(3.7, 6, 12); await window.wait(700); window.park(3.7, 6, 2.0); await window.wait(1200); window.__sky.grab(); await window.wait(450); return k; }) === 'joint', 'joint taken from its truck');
  await shot('03-welded');
  need(await page.evaluate(() => window.__sky._asms.size === 1), 'joint welded to the container end');
  await page.evaluate(async () => { await window.fetchLoad('container'); window.park(4, 6, 16); await window.wait(900); });
  await page.getByLabel('Flip the load').dispatchEvent('pointerdown');
  await page.waitForTimeout(700);
  await page.evaluate(async () => { window.park(4, 6, 8.6); await window.wait(1500); window.__sky.grab(); await window.wait(1500); });
  need(await page.evaluate(() => { const a = [...window.__sky._asms.values()]; return a.length === 1 && a[0].length === 3; }), 'three pieces welded into one shape');
  need(await page.evaluate(async () => { const k = await window.fetchLoad('crate'); window.park(8, 6, 12); await window.wait(700); window.park(8, 6, 4.2); await window.wait(1200); window.__sky.grab(); await window.wait(1500); return k; }) === 'crate', 'crate taken from its truck');
  await page.evaluate(async () => { window.park(2, 12, 20); await window.wait(3400); });
  await shot('04-build-and-trucks');
  need(await page.evaluate(() => window.__sky._boxes.filter((b) => b.userData.onTruck).length === 3), 'all three trucks reloaded');
  await page.context().close();

  // phone held sideways, which is how the itch.io page shows it
  const land = await open(800, 360);
  await land.getByText('Free build').click();
  await land.waitForTimeout(1500);
  await land.screenshot({ path: path.join(out, '05-phone-landscape.png') });
  await land.context().close();

  const desk = await open(1280, 720);
  await desk.getByText('Free build').click();
  await desk.waitForTimeout(1500);
  await desk.screenshot({ path: path.join(out, '06-desktop.png') });
  await desk.context().close();

  await browser.close();
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'NO PAGE ERRORS');
  process.exit(errors.length ? 1 : 0);
})();
