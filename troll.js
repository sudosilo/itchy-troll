const { chromium } = require('playwright');
const { execSync, execFileSync } = require('child_process');
const fs = require('fs');

let SHIP = {};
try {
  SHIP = JSON.parse(fs.readFileSync('ship.json', 'utf8'));
} catch {}

const USER = (process.env.ITCH_USERNAME || '').trim();
const PASS = process.env.ITCH_PASSWORD || '';
const OWNER = process.env.GH_OWNER || 'sudosilo';
const REPO = (process.env.GAME_REPO || SHIP.repo || '').trim();
const PRICE = String(process.env.GAME_PRICE || SHIP.price || '0.99').trim();
const TITLE_IN = (process.env.GAME_TITLE || SHIP.title || '').trim();
const SLUG = REPO.toLowerCase();
const WIDTH = '1280';
const HEIGHT = '720';
const SITE = 'https://itch.io';
const LEDGER_FILE = 'itch-ledger.json';
const PAGE_URL = `https://${USER.toLowerCase()}.itch.io/${SLUG}`;

fs.mkdirSync('shots', { recursive: true });
fs.mkdirSync('work', { recursive: true });

let step = 0;
let browser = null;
let page = null;

function log(msg) {
  console.log(`[itchy-troll] ${msg}`);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, msg + '\n\n');
}

function plain(url) {
  return url.replace('https://', '');
}

function loadLedger() {
  try {
    return JSON.parse(fs.readFileSync(LEDGER_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function saveLedger(ledger) {
  fs.writeFileSync(LEDGER_FILE, JSON.stringify(ledger, null, 2) + '\n');
}

async function shot(name) {
  if (!page) return;
  step += 1;
  await page.screenshot({ path: `shots/${String(step).padStart(2, '0')}-${name}.png`, fullPage: true }).catch(() => {});
}

async function dumpFields() {
  if (!page) return;
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

async function firstVisible(locators) {
  for (const loc of locators) {
    const el = loc.first();
    if ((await el.count()) > 0 && (await el.isVisible().catch(() => false))) return el;
  }
  return null;
}

function titleFrom(html) {
  const m = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  let t = (m ? m[1] : '')
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
  if (!t) t = REPO.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return t.slice(0, 80);
}

/* Build */

function prepareBuild() {
  const src = `work/src`;
  const dist = `work/dist`;
  execSync(`rm -rf "${src}" "${dist}"`);
  const local = (SHIP.build || '').trim();
  if (local && fs.existsSync(`${local}/index.html`)) {
    log(`Using the gated build stored in ${local}`);
    execSync(`cp -r "${local}" "${src}"`);
  } else {
    execSync(`git clone --depth 1 https://github.com/${OWNER}/${REPO} "${src}"`, { stdio: 'inherit' });
  }
  fs.mkdirSync(dist, { recursive: true });
  execSync(`rsync -a --exclude .git --exclude .github --exclude .vercel --exclude node_modules "${src}/" "${dist}/"`);
  if (!fs.existsSync(`${dist}/index.html`)) throw new Error('No index.html at the top of the repo');
  log(`Build ready: ${fs.readdirSync(dist).length} files for ${OWNER}/${REPO}`);
  return dist;
}

function butlerPush(dir) {
  for (const channel of ['html5', 'offline']) {
    log(`Uploading channel ${channel} with butler`);
    // No shell here, so odd characters in the username secret cannot break the command.
    execFileSync('butler', ['push', dir, `${USER.toLowerCase()}/${SLUG}:${channel}`, '--if-changed'], { stdio: 'inherit' });
  }
}

/* Browser */

async function startBrowser() {
  browser = await chromium.launch();
  page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  log('Logging into itch.io');
  await page.goto(`${SITE}/login`, { waitUntil: 'domcontentloaded' });
  await page.locator('input[name="username"]').fill(USER);
  await page.locator('input[name="password"]').fill(PASS);
  await Promise.all([
    page.waitForLoadState('domcontentloaded'),
    page.locator('form').filter({ has: page.locator('input[name="password"]') }).locator('button').first().click(),
  ]);
  await page.waitForTimeout(3000);
  await shot('after-login');
  if (page.url().includes('/login')) throw new Error('Login did not go through. See the after-login screenshot.');
  log('Logged in');
}

async function pageExists() {
  const res = await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' });
  return res && res.status() === 200;
}

async function createProject(title) {
  log(`Creating the itch.io page "${title}"`);
  await page.goto(`${SITE}/game/new`, { waitUntil: 'domcontentloaded' });
  await shot('new-form');

  const titleBox = await firstVisible([page.locator('input[name="game[title]"]'), page.getByLabel(/^\s*title/i)]);
  if (!titleBox) throw new Error('Title field not found');
  await titleBox.fill(title);

  const slugBox = await firstVisible([page.locator('input[name="game[slug]"]'), page.getByLabel(/project url/i)]);
  if (!slugBox) throw new Error('Project URL field not found');
  await slugBox.fill(SLUG);

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

  await shot('new-form-filled');
  const save = await firstVisible([page.getByRole('button', { name: /save/i })]);
  if (!save) throw new Error('Save button not found on new project form');
  await Promise.all([page.waitForLoadState('domcontentloaded'), save.click()]);
  await page.waitForTimeout(3000);
  await shot('after-create');
  log('Page created as a draft');
}

async function findEditUrl() {
  if (/\/game\/edit\/\d+/.test(page.url())) return page.url().split('?')[0];
  await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' });
  let href = await page.locator('a[href*="/game/edit/"]').first().getAttribute('href').catch(() => null);
  if (!href) {
    await page.goto(`${SITE}/dashboard`, { waitUntil: 'domcontentloaded' });
    href = await page.evaluate((s) => {
      for (const a of document.querySelectorAll('a[href*="/game/edit/"]')) {
        const row = a.closest('div, li, tr');
        if (row && row.innerHTML.includes(`/${s}`)) return a.getAttribute('href');
      }
      return null;
    }, SLUG);
  }
  if (!href) throw new Error('Could not find the edit page for this project');
  return new URL(href, SITE).toString().split('?')[0];
}

async function markBrowserUpload() {
  return page.evaluate(() => {
    const boxes = [...document.querySelectorAll('input[type="checkbox"]')].filter((b) => {
      const label = b.closest('label') || document.querySelector(`label[for="${b.id}"]`);
      return label && /played in the browser/i.test(label.textContent);
    });
    for (const b of boxes) {
      let el = b.parentElement;
      for (let i = 0; i < 8 && el; i += 1, el = el.parentElement) {
        const text = el.textContent || '';
        const hasHtml = /html5/i.test(text);
        const hasOffline = /offline/i.test(text);
        if (hasHtml && !hasOffline) {
          b.setAttribute('data-itchy', 'browser');
          return boxes.length;
        }
        if (hasOffline) break;
      }
    }
    if (boxes.length) boxes[0].setAttribute('data-itchy', 'browser');
    return boxes.length;
  });
}

async function finishSetup(editUrl) {
  log('Waiting for both uploads to show on the edit page');
  let count = 0;
  for (let i = 0; i < 30 && count < 2; i += 1) {
    await page.goto(editUrl, { waitUntil: 'domcontentloaded' });
    count = await markBrowserUpload();
    if (count < 2) await page.waitForTimeout(10000);
  }
  await shot('edit-page');
  if (count < 1) throw new Error('Uploads never showed up on the edit page');

  const box = page.locator('input[data-itchy="browser"]');
  if (!(await box.isChecked())) await box.check();
  log('Browser play turned on for the html5 upload');

  const width = await firstVisible([page.locator('input[name*="width"]')]);
  const height = await firstVisible([page.locator('input[name*="height"]')]);
  if (width) await width.fill(WIDTH);
  if (height) await height.fill(HEIGHT);

  for (const pattern of [/mobile friendly/i, /fullscreen button/i]) {
    const opt = await firstVisible([page.getByLabel(pattern)]);
    if (opt && !(await opt.isChecked().catch(() => true))) await opt.check().catch(() => {});
  }

  const paid = await firstVisible([page.locator('label').filter({ hasText: /^\s*Paid\b/ }), page.getByLabel(/^\s*paid/i)]);
  if (paid) {
    await paid.click();
    await page.waitForTimeout(500);
    const priceBox = await firstVisible([page.locator('input[name*="price"]')]);
    if (priceBox) {
      await priceBox.fill(PRICE);
      log(`Price set to $${PRICE}`);
    } else {
      log('Price box not found after choosing Paid');
    }
  } else {
    log('Paid option not found, pricing left unchanged');
  }

  const pub = await firstVisible([page.locator('label').filter({ hasText: /^\s*Public\b/ }), page.getByLabel(/^\s*public/i)]);
  if (pub) await pub.click();
  else log('Public option not found, page stays as draft');

  await shot('edit-filled');
  const save = await firstVisible([page.getByRole('button', { name: /^\s*save\s*$/i })]);
  if (!save) throw new Error('Save button not found on edit page');
  await Promise.all([page.waitForLoadState('domcontentloaded'), save.click()]);
  await page.waitForTimeout(3000);
  await shot('after-save');
  const err = await page.locator('.form_errors, .errors').first().innerText().catch(() => '');
  if (err) throw new Error(`itch.io refused the save: ${err.replace(/\s+/g, ' ').slice(0, 200)}`);
  log('Edit page saved');
}

/* Main */

(async () => {
  if (!USER || !PASS || !process.env.BUTLER_API_KEY || !REPO) {
    throw new Error('Missing ITCH_USERNAME, ITCH_PASSWORD or BUTLER_API_KEY secret, or the repo input');
  }
  const ledger = loadLedger();
  const dist = prepareBuild();
  const title = TITLE_IN || (ledger[REPO] && ledger[REPO].title) || titleFrom(fs.readFileSync(`${dist}/index.html`, 'utf8'));
  log(`Publishing ${REPO} as "${title}" at $${PRICE}`);

  if (process.env.PUBLISH_MODE !== 'browser') {
    // itch.io puts a human check on its login page, so the robot never logs in.
    // The owner makes the page by hand once. After that butler uploads every build.
    log('Uploading with butler only. The itch.io page must already exist.');
    try {
      butlerPush(dist);
    } catch (e) {
      throw new Error(`butler could not upload to ${USER}/${SLUG} (${e.message.split('\n')[0]}). If the page does not exist yet, create it at itch.io/game/new with the URL ${SLUG}`);
    }
    ledger[REPO] = {
      ...(ledger[REPO] || {}),
      title,
      state: 'uploaded',
      price: PRICE,
      page: plain(PAGE_URL),
      updated: new Date().toISOString(),
    };
  } else if (ledger[REPO] && ledger[REPO].state === 'live') {
    log('Page already live, uploading the new build only');
    butlerPush(dist);
    ledger[REPO].updated = new Date().toISOString();
  } else {
    await startBrowser();
    if (await pageExists()) log('Page already exists on itch.io, finishing its setup');
    else await createProject(title);
    const editUrl = await findEditUrl();
    const gameId = (editUrl.match(/\/game\/edit\/(\d+)/) || [])[1] || '';
    log(`Edit page found, game id ${gameId}`);
    butlerPush(dist);
    await finishSetup(editUrl);
    ledger[REPO] = {
      title,
      state: 'live',
      price: PRICE,
      game_id: gameId,
      page: plain(PAGE_URL),
      shipped: new Date().toISOString(),
      updated: new Date().toISOString(),
    };
  }
  saveLedger(ledger);
  log(`Done: ${plain(PAGE_URL)}`);
})()
  .catch(async (err) => {
    log(`FAILED: ${err.message}`);
    if (page) {
      const where = await page.evaluate(() => ({ url: location.href, title: document.title, text: (document.body ? document.body.innerText : '').replace(/\s+/g, ' ').slice(0, 600) })).catch(() => null);
      if (where) log(`Page at failure: ${where.url} | title: ${where.title} | text: ${where.text}`);
    }
    await shot('failure');
    await dumpFields();
    const ledger = loadLedger();
    ledger[REPO] = { ...(ledger[REPO] || {}), state: ledger[REPO] && ledger[REPO].state === 'live' ? 'live' : 'failed', error: err.message, updated: new Date().toISOString() };
    if (REPO) saveLedger(ledger);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (browser) await browser.close();
  });
