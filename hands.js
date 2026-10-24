// Hands agent. Looks at a screenshot of the page, asks Claude what to do next,
// does it, and repeats until the goal is met. Used for itch.io pages that
// butler cannot create or set up.

const fs = require('fs');

const W = 1280;
const H = 900;
const MODEL = process.env.HANDS_MODEL || 'claude-sonnet-4-5';
const KEY = process.env.ANTHROPIC_API_KEY || '';

function log(msg) {
  console.log(`[hands] ${msg}`);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `hands: ${msg}\n\n`);
}

const RULES = `You control a web browser by looking at screenshots. The screenshot is ${W} by ${H} pixels.
Reply with one JSON object and nothing else. Pick one action:
{"action":"click","x":0,"y":0,"why":"..."}
{"action":"type","text":"...","why":"..."}  types into the field that has focus, click it first
{"action":"clear","x":0,"y":0,"why":"..."}  clicks a text field and empties it
{"action":"key","key":"Enter","why":"..."}  Enter, Tab, Escape or Backspace
{"action":"select","x":0,"y":0,"option":"visible option text","why":"..."}  for dropdown menus
{"action":"scroll","dy":600,"why":"..."}  positive scrolls down
{"action":"goto","url":"https://itch.io/...","why":"..."}  only itch.io addresses
{"action":"done","why":"..."}  the goal is fully met and saved
{"action":"fail","why":"..."}  the goal cannot be met, say exactly what blocks it
Never type passwords or payment details. Never delete anything. Never change account settings.`;

async function ask(goal, history, png, url) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 400,
      system: RULES,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/png', data: png.toString('base64') } },
            {
              type: 'text',
              text: `Goal: ${goal}\nCurrent address: ${url}\nActions so far:\n${history.slice(-15).join('\n') || 'none'}\nWhat is the next action?`,
            },
          ],
        },
      ],
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    const m = (data.error && data.error.message) || res.statusText;
    throw new Error(`Claude API ${res.status}: ${m}`);
  }
  const text = (data.content || []).map((c) => c.text || '').join('');
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('Claude did not answer with an action');
  return JSON.parse(m[0]);
}

async function act(page, a) {
  const x = Math.max(0, Math.min(W - 1, Number(a.x) || 0));
  const y = Math.max(0, Math.min(H - 1, Number(a.y) || 0));
  if (a.action === 'click') await page.mouse.click(x, y);
  else if (a.action === 'type') await page.keyboard.type(String(a.text || ''), { delay: 20 });
  else if (a.action === 'clear') {
    await page.mouse.click(x, y);
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Backspace');
  } else if (a.action === 'key' && ['Enter', 'Tab', 'Escape', 'Backspace'].includes(a.key)) await page.keyboard.press(a.key);
  else if (a.action === 'select') {
    const ok = await page.evaluate(
      ({ x, y, option }) => {
        let el = document.elementFromPoint(x, y);
        while (el && el.tagName !== 'SELECT') el = el.parentElement;
        if (!el) {
          const near = [...document.querySelectorAll('select')].find((s) => {
            const r = s.getBoundingClientRect();
            return Math.abs(r.top + r.height / 2 - y) < 30;
          });
          el = near || null;
        }
        if (!el) return false;
        const want = option.trim().toLowerCase();
        const opt = [...el.options].find((o) => o.textContent.trim().toLowerCase().startsWith(want));
        if (!opt) return false;
        el.value = opt.value;
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      },
      { x, y, option: String(a.option || '') }
    );
    if (!ok) throw new Error(`No dropdown option "${a.option}" there`);
  } else if (a.action === 'scroll') await page.mouse.wheel(0, Number(a.dy) || 0);
  else if (a.action === 'goto') {
    const u = new URL(String(a.url));
    if (!/(^|\.)itch\.io$/.test(u.hostname)) throw new Error('goto outside itch.io refused');
    await page.goto(u.toString(), { waitUntil: 'domcontentloaded' });
  }
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await page.waitForTimeout(1200);
}

async function run(page, goal, startUrl, maxSteps = 40) {
  if (!KEY) throw new Error('ANTHROPIC_API_KEY secret is missing');
  await page.setViewportSize({ width: W, height: H });
  if (startUrl) await page.goto(startUrl, { waitUntil: 'domcontentloaded' });
  log(`Goal: ${goal}`);
  const history = [];
  for (let i = 1; i <= maxSteps; i += 1) {
    const png = await page.screenshot();
    const a = await ask(goal, history, png, page.url());
    const line = `${i}. ${a.action}${a.x !== undefined ? ` ${a.x},${a.y}` : ''}${a.option ? ` "${a.option}"` : ''}${a.text ? ` "${String(a.text).slice(0, 60)}"` : ''} because ${a.why || ''}`;
    log(line);
    if (a.action === 'done') return a.why || 'done';
    if (a.action === 'fail') throw new Error(`Hands gave up: ${a.why}`);
    try {
      await act(page, a);
      history.push(line);
    } catch (e) {
      history.push(`${line} -> that failed: ${e.message}`);
    }
  }
  throw new Error(`Hands ran out of steps on: ${goal.slice(0, 80)}`);
}

module.exports = { run };
