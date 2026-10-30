// ==UserScript==
// @name         Itchy Troll page filler
// @namespace    sudosilo-itchy-troll
// @version      1.3.1
// @description  Fills an itch.io edit page from pages/REPO.json in the itchy-troll repo
// @match        https://itch.io/game/edit/*
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @connect      raw.githubusercontent.com
// @updateURL    https://raw.githubusercontent.com/sudosilo/itchy-troll/main/itchy-troll.user.js
// @downloadURL  https://raw.githubusercontent.com/sudosilo/itchy-troll/main/itchy-troll.user.js
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  const RAW = 'https://raw.githubusercontent.com/sudosilo/itchy-troll/main/pages/';

  function q(sel) {
    return document.querySelector(sel);
  }

  function slugFromPage() {
    const box = q('input[name="game[slug]"]') || q('input[name*="slug"]');
    if (box && box.value) return box.value.trim().toLowerCase();
    const link = [...document.querySelectorAll('a[href*=".itch.io/"]')].find((a) => /View page/i.test(a.textContent));
    if (link) return link.href.split('/').filter(Boolean).pop().toLowerCase();
    return '';
  }

  function load(slug) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: 'GET',
        url: `${RAW}${slug}.json?t=${Date.now()}`,
        onload: (r) => {
          if (r.status !== 200) return reject(new Error(`No page text in the repo for ${slug}`));
          try {
            resolve(JSON.parse(r.responseText));
          } catch (e) {
            reject(new Error(`pages/${slug}.json is not valid`));
          }
        },
        onerror: () => reject(new Error('Could not reach GitHub')),
      });
    });
  }

  function loadFile(rel) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: 'GET',
        url: `${RAW}${rel}?t=${Date.now()}`,
        responseType: 'arraybuffer',
        onload: (r) => {
          if (r.status !== 200) return reject(new Error(`Missing image pages/${rel}`));
          const name = rel.split('/').pop();
          resolve(new File([r.response], name, { type: name.endsWith('.jpg') ? 'image/jpeg' : 'image/png' }));
        },
        onerror: () => reject(new Error('Could not reach GitHub')),
      });
    });
  }

  // When itch.io opens a file picker, hand it our files instead.
  let pending = null;
  function armPicker() {
    const win = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
    const proto = win.HTMLInputElement.prototype;
    if (proto.__itchyArmed) return;
    const orig = proto.click;
    const patched = function () {
      if (this.type === 'file' && pending) {
        const files = pending;
        pending = null;
        giveFiles(this, files);
        return;
      }
      return orig.call(this);
    };
    try {
      proto.click = typeof exportFunction === 'function' ? exportFunction(patched, win) : patched;
      proto.__itchyArmed = true;
    } catch (e) {}
  }

  function giveFiles(input, files) {
    const dt = new DataTransfer();
    for (const f of files) dt.items.add(f);
    input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function buttonByText(re) {
    return [...document.querySelectorAll('button, a, .button, label')].find((b) => re.test((b.textContent || '').trim()));
  }

  async function uploadVia(buttonRe, files) {
    const btn = buttonByText(buttonRe);
    if (!btn) return false;
    const before = new Set(document.querySelectorAll('input[type="file"]'));
    pending = files;
    btn.click();
    await sleep(800);
    if (pending) {
      const fresh = [...document.querySelectorAll('input[type="file"]')].find((i) => !before.has(i)) ||
        (btn.closest('div') && btn.closest('div').querySelector('input[type="file"]'));
      if (!fresh) {
        pending = null;
        return false;
      }
      const f = pending;
      pending = null;
      giveFiles(fresh, f);
    }
    return true;
  }

  async function waitForUploads(ms) {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      const busy = [...document.querySelectorAll('.upload_progress, .progress, .uploading, [class*="progress"]')].some((e) => e.offsetParent !== null);
      if (!busy) return;
      await sleep(1000);
    }
  }

  function poke(el) {
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function setTagline(text) {
    const box = q('input[name="game[short_text]"]');
    if (!box) return false;
    box.value = text;
    poke(box);
    return true;
  }

  function setDescription(text) {
    const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const html = text
      .split(/\n\s*\n/)
      .map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`)
      .join('');
    const area = q('textarea[name="game[description]"]');
    if (!area) return false;
    area.value = html;
    poke(area);
    const wrap = area.parentElement;
    const editor = (wrap && wrap.querySelector('[contenteditable="true"]')) || q('.redactor-in') || q('.redactor-editor');
    if (editor) {
      editor.innerHTML = html;
      editor.dispatchEvent(new Event('input', { bubbles: true }));
      editor.dispatchEvent(new Event('keyup', { bubbles: true }));
    }
    return true;
  }

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  async function pickGenre(name) {
    if (setGenre(name)) return true;
    const want = name.trim().toLowerCase();
    const leaf = (el) => el.children.length === 0 && el.offsetParent !== null;
    const opener = [...document.querySelectorAll('input, div, span, button')].find(
      (el) => (el.placeholder && /no genre/i.test(el.placeholder)) || (leaf(el) && /^\s*no genre\s*$/i.test(el.textContent))
    );
    if (!opener) {
      // Already set: the menu shows the wanted genre instead of No genre.
      return [...document.querySelectorAll('input, div, span')].some(
        (el) => (el.placeholder && el.placeholder.trim().toLowerCase() === want) || (leaf(el) && el.textContent.trim().toLowerCase() === want)
      );
    }
    opener.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    opener.click();
    if (opener.focus) opener.focus();
    await sleep(400);
    const opt = [...document.querySelectorAll('li, div, span, a, button')].find(
      (el) => leaf(el) && el.textContent.trim().toLowerCase() === want
    );
    if (!opt) return false;
    opt.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    opt.click();
    await sleep(300);
    return true;
  }

  function setGenre(name) {
    const sel = q('select[name="game[genre]"]') || q('select[name*="genre"]') ||
      [...document.querySelectorAll('select')].find((s) => [...s.options].some((o) => /no genre/i.test(o.textContent)));
    if (!sel) return false;
    const want = name.trim().toLowerCase();
    const opt = [...sel.options].find((o) => o.textContent.trim().toLowerCase() === want) ||
      [...sel.options].find((o) => o.textContent.trim().toLowerCase().startsWith(want));
    if (!opt) return false;
    sel.value = opt.value;
    poke(sel);
    return true;
  }

  function setTags(tags) {
    const joined = tags.join(',');
    const hidden = q('input[name="game[tags]"]') || q('input[name*="tags"]') || q('textarea[name*="tags"]');
    if (!hidden) return false;
    const old = (hidden.value || '').split(',').map((t) => t.trim()).filter(Boolean);
    const merged = [...new Set([...old, ...tags])];
    hidden.value = merged.join(',');
    poke(hidden);
    const typer = hidden.parentElement && hidden.parentElement.querySelector('input[type="text"]:not([name])');
    if (typer) {
      for (const t of tags) {
        if (old.includes(t)) continue;
        typer.value = t;
        poke(typer);
        typer.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));
      }
    }
    return joined.length > 0;
  }

  function findSave() {
    return [...document.querySelectorAll('button, input[type="submit"]')].find((b) => /^\s*save\s*$/i.test(b.textContent || b.value || ''));
  }

  function panel() {
    const box = document.createElement('div');
    box.style.cssText =
      'position:fixed;left:12px;right:12px;bottom:12px;z-index:2147483647;background:#ffffff;color:#1d1d1b;' +
      'border:1px solid #d9d6cc;border-radius:12px;padding:12px;font:15px/1.4 system-ui,sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.12)';
    const btn = document.createElement('button');
    btn.textContent = 'Fill from Itchy Troll and Save';
    btn.style.cssText = 'width:100%;font:700 16px system-ui,sans-serif;padding:12px;border:0;border-radius:10px;background:#e8590c;color:#fff';
    const msg = document.createElement('div');
    msg.style.cssText = 'margin-top:8px;min-height:18px';
    const close = document.createElement('button');
    close.textContent = 'Hide';
    close.style.cssText = 'margin-top:6px;width:100%;padding:6px;border:0;background:none;color:#6b675c;font:14px system-ui,sans-serif';
    close.onclick = () => box.remove();
    box.append(btn, msg, close);
    document.body.appendChild(box);
    return { btn, msg };
  }

  const ui = panel();
  ui.btn.onclick = async () => {
    const slug = slugFromPage();
    if (!slug) {
      ui.msg.textContent = 'Could not read this project URL.';
      return;
    }
    ui.msg.textContent = `Loading text for ${slug}...`;
    let spec;
    try {
      spec = await load(slug);
    } catch (e) {
      ui.msg.textContent = e.message;
      return;
    }
    const missed = [];
    if (spec.tagline && !setTagline(spec.tagline)) missed.push('tagline');
    if (spec.description && !setDescription(spec.description)) missed.push('description');
    if (spec.tags && spec.tags.length && !setTags(spec.tags)) missed.push('tags');
    if (missed.length) {
      ui.msg.textContent = `Filled the rest. Could not find: ${missed.join(', ')}. Nothing saved yet.`;
      return;
    }
    const imgNotes = [];
    if (spec.cover || (spec.screenshots && spec.screenshots.length)) {
      armPicker();
      if (spec.cover) {
        ui.msg.textContent = 'Uploading cover image...';
        try {
          const ok = await uploadVia(/upload cover image|replace cover image|cover image/i, [await loadFile(spec.cover)]);
          imgNotes.push(ok ? 'cover uploaded' : 'cover button not found');
        } catch (e) {
          imgNotes.push(e.message);
        }
        await sleep(1500);
      }
      if (spec.screenshots && spec.screenshots.length) {
        ui.msg.textContent = 'Uploading screenshots...';
        try {
          const files = [];
          for (const rel of spec.screenshots) files.push(await loadFile(rel));
          const ok = await uploadVia(/add screenshots/i, files);
          imgNotes.push(ok ? `${files.length} screenshots uploaded` : 'screenshot button not found');
        } catch (e) {
          imgNotes.push(e.message);
        }
      }
      await sleep(2000);
      await waitForUploads(60000);
    }
    const imgText = imgNotes.length ? ` Images: ${imgNotes.join(', ')}.` : '';
    const skipped = spec.genre && !(await pickGenre(spec.genre)) ? ` Genre ${spec.genre} not set, pick it by hand.` : '';
    if (skipped) {
      ui.msg.textContent = `Filled.${imgText}${skipped} Then tap Save.`;
      return;
    }
    const save = findSave();
    if (!save) {
      ui.msg.textContent = 'Filled. Save button not found, tap Save yourself.';
      return;
    }
    ui.msg.textContent = `Filled.${imgText} Saving...`;
    save.click();
  };
})();
