const { chromium } = require('playwright');
const { execSync } = require('child_process');
const fs = require('fs');

const USER = (process.env.ITCH_USERNAME || '').trim();
const PASS = process.env.ITCH_PASSWORD || '';
const OWNER = process.env.GH_OWNER || 'sudosilo';
const TOKEN = process.env.GITHUB_TOKEN || '';
const ONLY_REPO = (process.env.ONLY_REPO || '').trim();
const NEW_PER_RUN = 5;
const WIDTH = '1280';
const HEIGHT = '720';
const SITE = 'https://itch.io';
const LEDGER_FILE = 'itch-ledger.json';
const SKIP_NAME = /(^|-)(api|backend|server|poller)$/i;

fs.mkdirSync('shots', { recursive: true });
fs.mkdirSync('work', { recursive: true });

let step = 0;
let tag = 'run';
let browser = null;
let page = null;

function log(msg) {
  console.log(`[itchy-troll] ${msg}`);
}

function summary(msg) {
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, msg + '\n\n');
}

function pageUrl(slug) {
  return `https://${USER.toLowerCase()}.itch.io/${slug}`;
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
  const file = `shots/${String(step).padStart(3, '0')}-${tag}-${name}.png`;
  await page.screenshot({ path: file, fullPage: true }).catch(() => {});
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
  fs.writeFileSync(`shots/fields-${tag}-${step}.txt`, `${page.url()}\n${fields.join('\n')}`);
}

async function firstVisible(locators) {
  for (const loc of locators) {
    const el = loc.first();
    if ((await el.count()) > 0 && (await el.isVisible().catch(() => false))) return el;
  }
  return null;
}

/* Finding games */

async function ghJson(url) {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'itchy-troll',
    },
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status} on ${url}`);
  return res.json();
}

async function listRepos() {
  const all = [];
  for (let p = 1; p < 20; p += 1) {
    const batch = await ghJson(`https://api.github.com/users/${OWNER}/repos?per_page=100&page=${p}&type=owner`);
    all.push(...batch);
    if (batch.length < 100) break;
  }
  return all.filter((r) => !r.fork && !r.private && !r.archived && r.name !== 'itchy-troll');
}

async function readIndex(repo) {
  const res = await fetch(`https://raw.githubusercontent.com/${OWNER}/${repo.name}/${repo.default_branch}/index.html`);
  return res.ok ? res.text() : null;
}

function looksLikeGame(html) {
  const strong = [/game\s*over/i, /\bscore\b/i, /high\s*score/i, /\byou\s+(win|lose|died)\b/i];
  const weak = [/<canvas/i, /requestAnimationFrame/, /keydown|touchstart|pointerdown/, /\blives?\b/i, /\blevel\b/i, /\bplayer\b/i, /\benem(y|ies)\b/i];
  const strongHits = strong.filter((r) => r.test(html)).length;
  const weakHits = weak.filter((r) => r.test(html)).length;
  return strongHits >= 1 && strongHits * 2 + weakHits >= 6;
}

function titleFrom(html, name) {
  const m = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  let t = m ? m[1] : '';
  t = t
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
  if (!t) t = name.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return t.slice(0, 80);
}

/* Getting game files */

function prepareBuild(name) {
  const src = `work/src-${name}`;
  const dist = `work/dist-${name}`;
  execSync(`rm -rf "${src}" "${dist}"`);
  execSync(`git clone --depth 1 https://github.com/${OWNER}/${name} "${src}"`, { stdio: 'inherit' });
  fs.mkdirSync(dist, { recursive: true });
  execSync(`rsync -a --exclude .git --exclude .github --exclude .vercel --exclude node_modules "${src}/" "${dist}/"`);
  if (!fs.existsSync(`${dist}/index.html`)) throw new Error('No index.html at the top of the repo');
  return dist;
}

function butlerPush(dir, slug) {
  log(`uploading ${slug} with butler`);
  execSync(`butler push "${dir}" ${USER}/${slug}:html5 --if-changed`, { stdio: 'inherit' });
}

/* Browser work */

async function ensureBrowser() {
  if (page) return;
  browser = await chromium.launch();
  page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  log('logging in');
  await page.goto(`${SITE}/login`, { waitUntil: 'domcontentloaded' });
  await shot('login-page');
  await page.locator('input[name="username"]').fill(USER);
  await page.locator('input[name="password"]').fill(PASS);
  await Promise.all([
    page.waitForLoadState('domcontentloaded'),
    page.locator('form').filter({ has: page.locator('input[name="password"]') }).locator('button').first().click(),
  ]);
  await page.waitForTimeout(3000);
  await shot('after-login');
  if (page.url().includes('/login')) throw new Error('Login did not go through. Check the after-login screenshot.');
  log('logged in');
}

async function pageExists(slug) {
  const res = await page.goto(pageUrl(slug), { waitUntil: 'domcontentloaded' });
  return res && res.status() === 200;
}

async function createProject(slug, title) {
  log(`creating page for ${slug}`);
  await page.goto(`${SITE}/game/new`, { waitUntil: 'domcontentloaded' });
  await shot('new-form');

  const titleBox = await firstVisible([page.locator('input[name="game[title]"]'), page.getByLabel(/^\s*title/i)]);
  if (!titleBox) throw new Error('Title field not found');
  await titleBox.fill(title);

  const slugBox = await firstVisible([page.locator('input[name="game[slug]"]'), page.getByLabel(/project url/i)]);
  if (!slugBox) throw new Error('Project URL field not found');
  await slugBox.fill(slug);

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
  log(`created, now at ${page.url()}`);
}

async function findEditUrl(slug) {
  if (/\/game\/edit\/\d+/.test(page.url())) return page.url().split('?')[0];
  await page.goto(pageUrl(slug), { waitUntil: 'domcontentloaded' });
  let href = await page.locator('a[href*="/game/edit/"]').first().getAttribute('href').catch(() => null);
  if (!href) {
    await page.goto(`${SITE}/dashboard`, { waitUntil: 'domcontentloaded' });
    href = await page.evaluate((s) => {
      for (const a of document.querySelectorAll('a[href*="/game/edit/"]')) {
        const row = a.closest('div, li, tr');
        if (row && row.innerHTML.includes(`/${s}`)) return a.getAttribute('href');
      }
      return null;
    }, slug);
  }
  if (!href) throw new Error('Could not find the edit page for this project');
  return new URL(href, SITE).toString();
}

async function finishSetup(editUrl) {
  log('waiting for the upload to show on the edit page');
  let checkbox = null;
  for (let i = 0; i < 24 && !checkbox; i += 1) {
    await page.goto(editUrl, { waitUntil: 'domcontentloaded' });
    checkbox = await firstVisible([page.getByLabel(/played in the browser/i)]);
    if (!checkbox) await page.waitForTimeout(10000);
  }
  await shot('edit-page');
  if (!checkbox) throw new Error('Upload never showed up on the edit page');
  if (!(await checkbox.isChecked())) await checkbox.check();

  const width = await firstVisible([page.locator('input[name*="width"]')]);
  const height = await firstVisible([page.locator('input[name*="height"]')]);
  if (width) await width.fill(WIDTH);
  if (height) await height.fill(HEIGHT);

  for (const pattern of [/mobile friendly/i, /fullscreen button/i]) {
    const box = await firstVisible([page.getByLabel(pattern)]);
    if (box && !(await box.isChecked().catch(() => true))) await box.check().catch(() => {});
  }

  const pub = await firstVisible([
    page.locator('label').filter({ hasText: /^\s*Public\b/ }),
    page.getByLabel(/^\s*public/i),
  ]);
  if (pub) await pub.click();
  else log('Public option not found, page stays as draft');

  await shot('edit-filled');
  const save = await firstVisible([page.getByRole('button', { name: /^\s*save\s*$/i })]);
  if (!save) throw new Error('Save button not found on edit page');
  await Promise.all([page.waitForLoadState('domcontentloaded'), save.click()]);
  await page.waitForTimeout(3000);
  await shot('after-save');
}

/* Main */

(async () => {
  if (!USER || !PASS || !process.env.BUTLER_API_KEY) {
    console.error('Missing ITCH_USERNAME, ITCH_PASSWORD or BUTLER_API_KEY secret');
    process.exit(1);
  }

  const ledger = loadLedger();
  let failures = 0;

  let repos = await listRepos();
  if (ONLY_REPO) repos = repos.filter((r) => r.name === ONLY_REPO);
  log(`checking ${repos.length} repos`);

  const updates = [];
  const fresh = [];
  for (const repo of repos) {
    const name = repo.name;
    const entry = ledger[name];
    if (entry && entry.state === 'skip') continue;
    if (!ONLY_REPO && SKIP_NAME.test(name)) continue;
    const html = await readIndex(repo);
    if (!html) continue;
    const title = (entry && entry.title) || titleFrom(html, name);
    if (entry && entry.state === 'live') updates.push({ name, title });
    else if (ONLY_REPO || looksLikeGame(html)) fresh.push({ name, title });
  }

  log(`updates: ${updates.map((g) => g.name).join(', ') || 'none'}`);
  log(`new games: ${fresh.map((g) => g.name).join(', ') || 'none'}`);

  for (const game of updates) {
    tag = game.name;
    try {
      const dir = prepareBuild(game.name);
      butlerPush(dir, game.name.toLowerCase());
      ledger[game.name].updated = new Date().toISOString();
      summary(`Updated ${game.title}: ${plain(pageUrl(game.name.toLowerCase()))}`);
    } catch (err) {
      failures += 1;
      console.error(`[itchy-troll] update failed for ${game.name}: ${err.message}`);
      summary(`Update failed for ${game.name}: ${err.message}`);
    }
    saveLedger(ledger);
  }

  for (const game of fresh.slice(0, NEW_PER_RUN)) {
    tag = game.name;
    const slug = game.name.toLowerCase();
    try {
      await ensureBrowser();
      const dir = prepareBuild(game.name);
      if (!(await pageExists(slug))) await createProject(slug, game.title);
      const editUrl = await findEditUrl(slug);
      log(`edit page ${editUrl}`);
      butlerPush(dir, slug);
      await finishSetup(editUrl);
      ledger[game.name] = {
        title: game.title,
        state: 'live',
        page: plain(pageUrl(slug)),
        updated: new Date().toISOString(),
      };
      summary(`New page for ${game.title}: ${plain(pageUrl(slug))}`);
      log(`done: ${plain(pageUrl(slug))}`);
    } catch (err) {
      failures += 1;
      console.error(`[itchy-troll] FAILED on ${game.name}: ${err.message}`);
      await shot('failure');
      await dumpFields();
      ledger[game.name] = { title: game.title, state: 'failed', error: err.message, updated: new Date().toISOString() };
      summary(`Failed on ${game.name}: ${err.message}`);
    }
    saveLedger(ledger);
  }

  if (fresh.length > NEW_PER_RUN) {
    summary(`${fresh.length - NEW_PER_RUN} more new games wait for the next run.`);
  }

  if (browser) await browser.close();
  process.exitCode = failures ? 1 : 0;
})().catch(async (err) => {
  console.error(`[itchy-troll] FAILED: ${err.message}`);
  await shot('failure');
  await dumpFields();
  if (browser) await browser.close();
  process.exit(1);
});
