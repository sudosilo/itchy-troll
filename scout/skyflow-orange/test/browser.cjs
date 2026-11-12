// Browser smoke test. Run: node test/browser.cjs [outDir]
const { chromium } = require('playwright');
const path = require('path');

const out = process.argv[2] || '/tmp/skyshots';
const url = 'file://' + path.join(__dirname, '..', 'index.html') + '#debug';

(async () => {
  require('fs').mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const errors = [];
  const run = async (name, viewport, fn) => {
    const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, hasTouch: viewport.width < 600 });
    const page = await ctx.newPage();
    page.on('console', (m) => { if (m.type() === 'error' && !/CORS|Failed to load resource|net::/i.test(m.text())) errors.push(name + ': ' + m.text()); });
    page.on('pageerror', (e) => errors.push(name + ': ' + e.message));
    await page.goto(url);
    await page.waitForTimeout(1200);
    await fn(page);
    await ctx.close();
  };
  const shot = (page, n) => page.screenshot({ path: path.join(out, n + '.png') });

  await run('phone', { width: 412, height: 883 }, async (page) => {
    await shot(page, '01-menu');
    await page.getByText('How to play').click();
    await page.waitForTimeout(200);
    await shot(page, '02-how');
    await page.getByText('Back').click();
    await page.getByText('Timed build').click();
    await page.waitForTimeout(1500);
    await shot(page, '03-countdown');
    await page.waitForTimeout(2600);
    await shot(page, '04-start');

    // scripted play through the debug handle
    const res = await page.evaluate(async () => {
      const g = window.__sky;
      const S = g._sim;
      const wait = (ms) => new Promise((r) => setTimeout(r, ms));
      const park = (x, z, hookY) => {
        S.trolley = Math.hypot(x, z); S.slew = Math.atan2(-z, x);
        S.hookX = x; S.hookZ = z; S.hookVX = 0; S.hookVZ = 0; S.cable = 62.8 - hookY;
      };
      const log = [];
      for (let i = 0; i < 4; i++) {
        while (!g._boxes.some((b) => b.userData.onTruck)) await wait(200);
        park(-1, 20, 3.4); await wait(500);
        g.grab(); await wait(500);
        park(-1, 20, 6 + i * 2); await wait(300);
        park(12, 12, 6 + i * 2); await wait(900);
        park(12, 12, 1.2 + i * 2); await wait(900);
        park(12, 12, 1.2 + i * 2);
        if (i === 3) { window.__carry = true; break; }
        g.grab(); await wait(1200);
        log.push(g._round.heightFt);
      }
      return log;
    });
    console.log('heights after drops', JSON.stringify(res));
    await page.waitForTimeout(300);
    await shot(page, '05-carrying-over-stack');
    await page.evaluate(() => window.__sky.grab());
    await page.waitForTimeout(700);
    await shot(page, '06-placed-popup');
    await page.waitForTimeout(1200);
    await shot(page, '07-stack');

    // menu panel
    await page.locator('.burger').click();
    await page.waitForTimeout(300);
    await shot(page, '08-panel');
    for (const v of ['Cab', 'Orbit', 'Spotter']) {
      await page.locator('.seg button', { hasText: v }).click();
      await page.locator('.burger').click();
      await page.waitForTimeout(500);
      await shot(page, '09-view-' + v.toLowerCase());
      await page.locator('.burger').click();
      await page.waitForTimeout(150);
    }
    await page.locator('.seg button', { hasText: 'Follow' }).click();
    await page.getByText('Resume').click();

    // touch controls move the crane
    const before = await page.evaluate(() => ({ s: window.__sky._sim.slew, t: window.__sky._sim.trolley, c: window.__sky._sim.cable }));
    const hold = async (label, ms) => {
      const b = await page.getByLabel(label).boundingBox();
      await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
      await page.mouse.down(); await page.waitForTimeout(ms); await page.mouse.up();
    };
    await hold('Slew left', 600); await hold('Trolley out', 600); await hold('Hoist up', 600);
    const after = await page.evaluate(() => ({ s: window.__sky._sim.slew, t: window.__sky._sim.trolley, c: window.__sky._sim.cable }));
    console.log('controls', JSON.stringify({ slew: after.s - before.s, trolley: after.t - before.t, cable: after.c - before.c }));
    if (!(after.s > before.s && after.t > before.t && after.c < before.c)) errors.push('controls did not move the crane');

    // jump to the end of the round
    await page.evaluate(() => { window.__sky._round.timeLeft = 4; });
    await page.waitForTimeout(2500);
    await shot(page, '10-last-seconds');
    await page.waitForTimeout(4500);
    await shot(page, '11-result');
    const txt = await page.locator('.result').innerText();
    console.log('result sheet:', txt.replace(/\n+/g, ' | '));
    await page.locator('#tag').fill('abc');
    await page.getByText('Post score').click();
    await page.waitForTimeout(1500);
    await shot(page, '12-post-attempt');
    await page.getByText('Main menu').click();
    await page.waitForTimeout(800);
    await shot(page, '13-menu-again');
    await page.getByText('Free build').click();
    await page.waitForTimeout(1500);
    await shot(page, '14-free');
  });

  await run('desktop', { width: 1280, height: 720 }, async (page) => {
    await shot(page, '20-desktop-menu');
    await page.getByText('Timed build').click();
    await page.waitForTimeout(4200);
    await page.keyboard.down('KeyA'); await page.waitForTimeout(500); await page.keyboard.up('KeyA');
    await page.keyboard.down('ArrowDown'); await page.waitForTimeout(800); await page.keyboard.up('ArrowDown');
    await shot(page, '21-desktop-play');
  });

  await run('small', { width: 360, height: 640 }, async (page) => {
    await shot(page, '30-small-menu');
    await page.getByText('Timed build').click();
    await page.waitForTimeout(4200);
    await shot(page, '31-small-play');
  });

  await browser.close();
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'NO PAGE ERRORS');
  process.exit(errors.length ? 1 : 0);
})();
