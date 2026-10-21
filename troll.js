const { chromium } = require('playwright');
const { execSync } = require('child_process');
const fs = require('fs');

const USER = (process.env.ITCH_USERNAME || '').trim();
const PASS = process.env.ITCH_PASSWORD || '';
const SLUG = (process.env.GAME_SLUG || '').trim().toLowerCase();
const TITLE = (process.env.GAME_TITLE || '').trim();
const WIDTH = process.env.EMBED_WIDTH || '1280';
const HEIGHT = process.env.EMBED_HEIGHT || '720';
const GAME_DIR = process.env.GAME_DIR || 'game-dist';
const SITE = 'https://itch.io';
const PAGE_URL = `https://${USER.toLowerCase()}.itch.io/${SLUG}`;

fs.mkdirSync('shots', { recursive: true });
let step = 0;

function log(msg) {
  console.log(`[itchy-troll] ${msg}`);
}

function summary(msg) {
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, msg + '\n');
}

async function shot(page, name) {
  step += 1;
  const file = `shots/${String(step).padStart(2, '0')}-${name}.png`;
  await page.screenshot({ path: file, fullPage: true }).catch(() => {});
}

async function dumpFields(page) {
  const fields = await page
    .evaluate(() =>
      [...document.querySelectorAll('input, select, textarea, button, label')].map((e) => {
        const text = (e.innerText || e.value || '').replace(/\s+/g, ' ').slice(0, 80);
        return `${e.tagName} name=${e.name || ''} type=${e.type || ''} id=${e.id || ''} text=${text}`;
      })
    )
    .catch(() => []);
  fs.writeFileSync(`shots/fields-${step}.txt`, `${page.url()}\n${fields.join('\n')}`);
}

async function firstVisible(page, locators) {
  for (const loc of locators) {
    const el = loc.first();
    if ((await el.count()) > 0 && (await el.isVisible().catch(() => false))) return el;
  }
  return null;
}

async function login(page) {
  log('logging in');
  await page.goto(`${SITE}/login`, { waitUntil: 'domcontentloaded' });
  await shot(page, 'login-page');
  await page.locator('input[name="username"]').fill(USER);
  await page.locator('input[name="password"]').fill(PASS);
  await Promise.all([
    page.waitForLoadState('domcontentloaded'),
    page.locator('form').filter({ has: page.locator('input[name="password"]') }).locator('button').first().click(),
  ]);
  await page.waitForTimeout(3000);
  await shot(page, 'after-login');
  if (page.url().includes('/login')) {
    throw new Error('Login did not go through. Check the after-login screenshot.');
  }
  log('logged in');
}

async function pageExists(page) {
  const res = await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' });
  return res && res.status() === 200;
}

async function createProject(page) {
  log('creating project page');
  await page.goto(`${SITE}/game/new`, { waitUntil: 'domcontentloaded' });
  await shot(page, 'new-form');

  const title = await firstVisible(page, [
    page.locator('input[name="game[title]"]'),
    page.getByLabel(/^\s*title/i),
  ]);
  if (!title) throw new Error('Title field not found');
  await title.fill(TITLE);

  const slug = await firstVisible(page, [
    page.locator('input[name="game[slug]"]'),
    page.getByLabel(/project url/i),
  ]);
  if (!slug) throw new Error('Project URL field not found');
  await slug.fill(SLUG);

  const pickedHtml = await page.evaluate(() => {
    for (const s of document.querySelectorAll('select')) {
      const opt = [...s.options].find((o) => /^\s*HTML/i.test(o.textContent));
      if (opt) {
        s.value = opt.value;
        s.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
    }
    return false;
  });
  if (!pickedHtml) throw new Error('Kind of project HTML option not found');

  await shot(page, 'new-form-filled');
  const save = await firstVisible(page, [page.getByRole('button', { name: /save/i })]);
  if (!save) throw new Error('Save button not found on new project form');
  await Promise.all([page.waitForLoadState('domcontentloaded'), save.click()]);
  await page.waitForTimeout(3000);
  await shot(page, 'after-create');
  log(`created, now at ${page.url()}`);
}

async function findEditUrl(page) {
  if (/\/game\/edit\/\d+/.test(page.url())) return page.url().split('?')[0];
  await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' });
  let href = await page.locator('a[href*="/game/edit/"]').first().getAttribute('href').catch(() => null);
  if (!href) {
    await page.goto(`${SITE}/dashboard`, { waitUntil: 'domcontentloaded' });
    href = await page.evaluate((slug) => {
      for (const a of document.querySelectorAll('a[href*="/game/edit/"]')) {
        const row = a.closest('div, li, tr');
        if (row && row.innerHTML.includes(`/${slug}`)) return a.getAttribute('href');
      }
      return null;
    }, SLUG);
  }
  if (!href) throw new Error('Could not find the edit page for this project');
  return new URL(href, SITE).toString();
}

function butlerPush() {
  log('uploading build with butler');
  execSync(`butler push "${GAME_DIR}" ${USER}/${SLUG}:html5`, { stdio: 'inherit' });
}

async function finishSetup(page, editUrl) {
  log('waiting for the upload to show on the edit page');
  let checkbox = null;
  for (let i = 0; i < 24 && !checkbox; i += 1) {
    await page.goto(editUrl, { waitUntil: 'domcontentloaded' });
    checkbox = await firstVisible(page, [page.getByLabel(/played in the browser/i)]);
    if (!checkbox) await page.waitForTimeout(10000);
  }
  await shot(page, 'edit-page');
  if (!checkbox) throw new Error('Upload never showed up on the edit page');
  if (!(await checkbox.isChecked())) await checkbox.check();

  const width = await firstVisible(page, [page.locator('input[name*="width"]')]);
  const height = await firstVisible(page, [page.locator('input[name*="height"]')]);
  if (width) await width.fill(String(WIDTH));
  if (height) await height.fill(String(HEIGHT));

  for (const pattern of [/mobile friendly/i, /fullscreen button/i]) {
    const box = await firstVisible(page, [page.getByLabel(pattern)]);
    if (box && !(await box.isChecked().catch(() => true))) await box.check().catch(() => {});
  }

  const pub = await firstVisible(page, [
    page.locator('label').filter({ hasText: /^\s*Public\b/ }),
    page.getByLabel(/^\s*public/i),
  ]);
  if (pub) await pub.click();
  else log('Public option not found, page stays as draft');

  await shot(page, 'edit-filled');
  const save = await firstVisible(page, [page.getByRole('button', { name: /^\s*save\s*$/i })]);
  if (!save) throw new Error('Save button not found on edit page');
  await Promise.all([page.waitForLoadState('domcontentloaded'), save.click()]);
  await page.waitForTimeout(3000);
  await shot(page, 'after-save');
}

(async () => {
  if (!USER || !PASS || !SLUG || !TITLE) {
    console.error('Missing ITCH_USERNAME, ITCH_PASSWORD, game_repo or title');
    process.exit(1);
  }
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await login(page);
    if (await pageExists(page)) {
      log('page already exists, update only');
      butlerPush();
      summary(`Updated build: ${PAGE_URL.replace('https://', '')}`);
    } else {
      await createProject(page);
      const editUrl = await findEditUrl(page);
      log(`edit page ${editUrl}`);
      butlerPush();
      await finishSetup(page, editUrl);
      summary(`New page live: ${PAGE_URL.replace('https://', '')}`);
    }
    log(`done: ${PAGE_URL.replace('https://', '')}`);
  } catch (err) {
    console.error(`[itchy-troll] FAILED: ${err.message}`);
    await shot(page, 'failure');
    await dumpFields(page);
    summary(`Failed: ${err.message}`);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
