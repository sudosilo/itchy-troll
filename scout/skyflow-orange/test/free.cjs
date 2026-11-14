// Browser check of Free build: containers, joints, welding, Turn and Flip.
// Run: node test/free.cjs [outDir]
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const out = process.argv[2] || '/tmp/skyshots-free';
const url = 'file://' + path.join(__dirname, '..', process.argv[3] || 'index.html') + '#debug';

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const opts = { args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] };
  if (fs.existsSync('/usr/bin/google-chrome')) opts.executablePath = '/usr/bin/google-chrome';
  const browser = await chromium.launch(opts);
  const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 412, height: 883 }, deviceScaleFactor: 2, hasTouch: true });
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error' && !/CORS|Failed to load resource|net::/i.test(m.text())) errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));
  const shot = (n) => page.screenshot({ path: path.join(out, n + '.png') });
  const need = (ok, what) => { console.log((ok ? 'PASS ' : 'FAIL ') + what); if (!ok) errors.push(what); };

  await page.goto(url);
  await page.waitForTimeout(1200);
  await shot('01-menu');
  need(await page.getByText('Version 2.0').count() === 1, 'menu shows Version 2.0');
  await page.getByText('How to play').click();
  await page.waitForTimeout(200);
  await shot('02-how');
  await page.getByText('Back').click();
  await page.getByText('Free build').click();
  await page.waitForTimeout(1500);
  await shot('03-free-start');
  need(await page.getByLabel('Turn the load').count() === 1 && await page.getByLabel('Flip the load').count() === 1, 'Turn and Flip buttons shown');

  await page.getByLabel('Truck brings Container').click();
  await page.waitForTimeout(600);
  await shot('04-container-on-truck');
  need(await page.evaluate(() => window.__sky._boxes.some((b) => b.userData.onTruck && b.userData.kind === 'container')), 'picker put a container on the truck');

  // helpers that live in the page
  await page.evaluate(() => {
    const g = window.__sky;
    const S = g._sim;
    g.setFreeWind(0);
    window.wait = (ms) => new Promise((r) => setTimeout(r, ms));
    window.park = (x, z, hookY) => {
      S.trolley = Math.hypot(x, z); S.slew = Math.atan2(-z, x);
      S.hookX = x; S.hookZ = z; S.hookVX = 0; S.hookVZ = 0; S.cable = 62.8 - hookY;
    };
    window.fetchLoad = async (tx) => {
      while (!g._boxes.some((b) => b.userData.onTruck)) await window.wait(200);
      window.park(tx, 20, 3.0); await window.wait(500);
      g.grab(); await window.wait(400);
      window.park(tx, 20, 12); await window.wait(500);
      return S.carrying;
    };
  });

  // lay a container on the ground, then weld a joint to its end
  await page.evaluate(async () => {
    const g = window.__sky;
    await window.fetchLoad(-2);
    window.park(14, 8, 12); await window.wait(700);
    window.park(14, 8, 2.0); await window.wait(1200);
  });
  await shot('05-container-set-down');
  await page.evaluate(async () => { window.__sky.grab(); await window.wait(900); });
  await page.getByLabel('Truck brings Joint').click();
  await page.waitForTimeout(500);
  await page.evaluate(async () => {
    const g = window.__sky;
    await window.fetchLoad(-1);
    window.park(9.7, 8, 12); await window.wait(700);
    window.park(9.7, 8, 2.0); await window.wait(1200);
  });
  await shot('06-joint-over-spot');
  await page.evaluate(async () => { window.__sky.grab(); await window.wait(450); });
  await shot('07-welded-popup');
  need(await page.evaluate(() => window.__sky._asms.size === 1), 'joint welded to the container end');

  // stand a second container on the joint
  await page.getByLabel('Truck brings Container').click();
  await page.waitForTimeout(500);
  await page.evaluate(async () => { await window.fetchLoad(-2); window.park(10, 8, 16); await window.wait(900); });
  await page.getByLabel('Flip the load').dispatchEvent('pointerdown');
  await page.waitForTimeout(160);
  await shot('08-flip-in-motion');
  await page.waitForTimeout(500);
  await shot('09-container-standing-on-hook');
  need(await page.evaluate(() => window.__sky._sim.carrying.userData.hy === 3), 'Flip button stood the container up');
  await page.evaluate(async () => { window.park(10, 8, 8.6); await window.wait(1500); window.__sky.grab(); await window.wait(1500); });
  await shot('10-welded-L');
  need(await page.evaluate(() => { const a = [...window.__sky._asms.values()]; return a.length === 1 && a[0].length === 3; }), 'three pieces welded into one shape');
  console.log('height', await page.evaluate(() => window.__sky._round.heightFt));

  // lift the whole shape by the joint and turn it
  await page.evaluate(async () => {
    window.park(14, 8, 3.0); await window.wait(600);
    window.__sky.grab(); await window.wait(400);
    window.park(14, 8, 14); await window.wait(900);
  });
  await shot('11-shape-lifted');
  need(await page.evaluate(() => window.__sky._sim.group.length === 2), 'whole shape rides the hook');
  await page.getByLabel('Turn the load').dispatchEvent('pointerdown');
  await page.waitForTimeout(700);
  await shot('12-shape-turned');
  await page.evaluate(async () => { window.park(14, 8, 2.2); await window.wait(1500); window.__sky.grab(); await window.wait(1500); });
  await shot('13-shape-set-down');
  need(await page.evaluate(() => window.__sky._falling.length === 0), 'shape came to rest');

  // knock a standing container over with a carried crate
  await page.evaluate(async () => {
    const g = window.__sky;
    await window.fetchLoad(-2);
    window.park(-14, 6, 16); await window.wait(700);
  });
  await page.getByLabel('Flip the load').dispatchEvent('pointerdown');
  await page.waitForTimeout(600);
  await page.evaluate(async () => { window.park(-14, 6, 6.6); await window.wait(1400); window.__sky.grab(); await window.wait(1200); });
  await page.getByLabel('Truck brings Crate').click();
  await page.waitForTimeout(500);
  await page.evaluate(async () => {
    await window.fetchLoad(-1);
    window.park(-10.4, 6, 12); await window.wait(700);
    window.park(-10.4, 6, 4.5); await window.wait(1400);
  });
  await shot('14-before-knock');
  await page.evaluate(async () => { window.__sky._sim.hookVX = -8; await window.wait(330); });
  await shot('15-going-over');
  await page.waitForTimeout(1600);
  await shot('16-knocked-flat');
  need(await page.evaluate(() => window.__sky._boxes.some((b) => b.userData.kind === 'container' && b.position.x < -14 && b.userData.hy === 1)), 'standing container was knocked flat');

  // views and the pause panel
  await page.locator('.burger').click();
  await page.waitForTimeout(300);
  await shot('17-panel');
  await page.locator('.seg button', { hasText: 'Orbit' }).click();
  await page.getByText('Resume').click();
  await page.waitForTimeout(600);
  await shot('18-orbit');

  await ctx.close();

  // desktop layout
  const d = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const p2 = await d.newPage();
  p2.on('pageerror', (e) => errors.push(e.message));
  await p2.goto(url);
  await p2.waitForTimeout(1000);
  await p2.getByText('Free build').click();
  await p2.waitForTimeout(1200);
  await p2.keyboard.press('Digit2');
  await p2.waitForTimeout(500);
  await p2.screenshot({ path: path.join(out, '20-desktop-free.png') });
  await d.close();

  await browser.close();
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'NO PAGE ERRORS');
  process.exit(errors.length ? 1 : 0);
})();
