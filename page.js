// Page editor. Reads pages/REPO.json and writes it onto that game's itch.io
// page: short description, description, genre and tags. Uses the saved
// itch.io login from itch-session.enc. Fills the known fields directly and
// hands anything it cannot find to the hands agent, which works from
// screenshots.
//
// pages/REPO.json looks like:
// { "tagline": "...", "description": "Paragraph one\n\nParagraph two", "genre": "Puzzle", "tags": ["music", "rhythm"] }

const { chromium } = require('playwright');
const { execSync } = require('child_process');
const fs = require('fs');
const hands = require('./hands');

const USER = (process.env.ITCH_USERNAME || '').trim().toLowerCase();
const SITE = 'https://itch.io';

function log(msg) {
  console.log(`[page] ${msg}`);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, msg + '\n\n');
}

function reposToEdit() {
  const only = (process.env.PAGE_REPO || '').trim();
  if (only) return [only];
  let changed = '';
  try {
    changed = execSync(`git diff --name-only ${process.env.BEFORE_SHA || 'HEAD~1'} HEAD -- pages`, { encoding: 'utf8' });
  } catch {
    changed = execSync('git diff --name-only HEAD~1 HEAD -- pages', { encoding: 'utf8' });
  }
  return changed
    .split('\n')
    .map((f) => f.trim())
    .filter((f) => /^pages\/[^/]+\.json$/.test(f) && fs.existsSync(f))
    .map((f) => f.slice(6, -5));
}

async function openSavedLogin() {
  if (!fs.existsSync('itch-session.enc')) {
    throw new Error('No saved itch.io login yet. Run the itch-login workflow once, then push the page file again.');
  }
  fs.mkdirSync('work', { recursive: true });
  execSync('openssl enc -d -aes-256-cbc -pbkdf2 -pass env:ITCH_PASSWORD -in itch-session.enc -out work/session.json');
  const browser = await chromium.launch();
  const context = await browser.newContext({ storageState: 'work/session.json', viewport: { width: 1280, height: 900 } });
  fs.rmSync('work/session.json');
  const page = await context.newPage();
  await page.goto(`${SITE}/dashboard`, { waitUntil: 'domcontentloaded' });
  if (page.url().includes('/login')) throw new Error('The saved itch.io login expired. Run the itch-login workflow again.');
  log('Saved itch.io login works');
  return { browser, page };
}

async function findEditUrl(page, slug) {
  await page.goto(`https://${USER}.itch.io/${slug}`, { waitUntil: 'domcontentloaded' });
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
  if (!href) throw new Error(`Could not find the edit page for ${slug}. Is the page made on itch.io?`);
  return new URL(href, SITE).toString().split('?')[0];
}

async function fillTagline(page, text) {
  const box = page.locator('input[name="game[short_text]"]').first();
  if (!(await box.count())) return false;
  await box.fill(text);
  return true;
}

async function fillDescription(page, text) {
  const html = text
    .split(/\n\s*\n/)
    .map((p) => `<p>${p.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')}</p>`)
    .join('');
  return page.evaluate((h) => {
    const area = document.querySelector('textarea[name="game[description]"]');
    if (!area) return false;
    area.value = h;
    area.dispatchEvent(new Event('input', { bubbles: true }));
    area.dispatchEvent(new Event('change', { bubbles: true }));
    const root = area.closest('.input_row, .redactor-box, div') || document;
    const editor = root.querySelector('[contenteditable="true"]') || document.querySelector('.redactor-in, .redactor-editor, [contenteditable="true"]');
    if (editor) {
      editor.innerHTML = h;
      editor.dispatchEvent(new Event('input', { bubbles: true }));
      editor.dispatchEvent(new Event('keyup', { bubbles: true }));
    }
    return true;
  }, html);
}

async function readBack(page) {
  return page.evaluate(() => {
    const t = document.querySelector('input[name="game[short_text]"]');
    const d = document.querySelector('textarea[name="game[description]"]');
    const e = document.querySelector('.redactor-in, .redactor-editor, [contenteditable="true"]');
    return {
      tagline: t ? t.value : '',
      description: ((e && e.innerText) || (d && d.value) || '').replace(/\s+/g, ' ').trim(),
    };
  });
}

async function editOne(page, repo) {
  const slug = repo.toLowerCase();
  const spec = JSON.parse(fs.readFileSync(`pages/${repo}.json`, 'utf8'));
  log(`Editing the itch.io page for ${repo}`);
  const editUrl = await findEditUrl(page, slug);
  log(`Edit page found for ${repo}`);
  await page.goto(editUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  const missing = [];
  if (spec.tagline) {
    if (await fillTagline(page, spec.tagline)) log(`Short description set: ${spec.tagline}`);
    else missing.push(`Short description or tagline: type exactly "${spec.tagline}"`);
  }
  if (spec.description) {
    if (await fillDescription(page, spec.description)) log('Description filled');
    else missing.push(`Description: replace it with this text, keeping the paragraph breaks: ${spec.description}`);
  }

  const goals = [...missing];
  if (spec.genre) goals.push(`Genre (in the Metadata section): choose ${spec.genre}`);
  if (spec.tags && spec.tags.length) goals.push(`Tags: make sure these tags are added, one at a time, pressing Enter after each: ${spec.tags.join(', ')}`);

  if (goals.length) {
    await hands.run(
      page,
      `You are on the itch.io edit page for the project ${slug}. Do these and nothing else: ${goals.join('. ')}. ` +
        `Do not change the title, URL, pricing, uploads or visibility. Then click Save at the bottom of the form. ` +
        `Done means the page saved with no red error.`,
      null,
      40
    );
    log('Hands agent finished genre, tags and save');
  } else {
    const save = page.getByRole('button', { name: /^\s*save\s*$/i }).last();
    await Promise.all([page.waitForLoadState('domcontentloaded'), save.click()]);
    await page.waitForTimeout(3000);
    log('Saved');
  }

  const err = await page.locator('.form_errors, .errors').first().innerText().catch(() => '');
  if (err) throw new Error(`itch.io refused the save: ${err.replace(/\s+/g, ' ').slice(0, 200)}`);

  await page.goto(editUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  const back = await readBack(page);
  const tagOk = !spec.tagline || back.tagline === spec.tagline;
  const firstLine = (spec.description || '').split(/\n/)[0].slice(0, 40);
  const descOk = !spec.description || back.description.includes(firstLine);
  log(`Check after save: short description ${tagOk ? 'matches' : 'does not match'}, description ${descOk ? 'matches' : 'does not match'}`);
  if (!tagOk || !descOk) {
    log('Text did not stick, handing the description to the hands agent');
    await hands.run(
      page,
      `On this itch.io edit page, set the Short description or tagline to exactly "${spec.tagline || ''}" and replace the Description with this text, ` +
        `keeping blank lines between paragraphs: ${spec.description || ''}. Change nothing else. Click Save. Done means it saved with no red error.`,
      null,
      60
    );
  }
  log(`Page updated: ${USER}.itch.io/${slug}`);
}

(async () => {
  const repos = reposToEdit();
  if (!repos.length) {
    log('No page files changed, nothing to do');
    return;
  }
  log(`Pages to edit: ${repos.join(', ')}`);
  const { browser, page } = await openSavedLogin();
  let failed = 0;
  try {
    for (const repo of repos) {
      try {
        await editOne(page, repo);
      } catch (e) {
        failed += 1;
        log(`FAILED on ${repo}: ${e.message}`);
      }
    }
  } finally {
    await browser.close();
  }
  process.exitCode = failed ? 1 : 0;
})().catch((e) => {
  log(`FAILED: ${e.message}`);
  process.exitCode = 1;
});
