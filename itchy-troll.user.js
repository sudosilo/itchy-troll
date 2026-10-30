// ==UserScript==
// @name         Itchy Troll page filler
// @namespace    sudosilo-itchy-troll
// @version      1.0.0
// @description  Fills an itch.io edit page from pages/REPO.json in the itchy-troll repo
// @match        https://itch.io/game/edit/*
// @grant        GM_xmlhttpRequest
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

  function setGenre(name) {
    const sel = q('select[name="game[genre]"]') || q('select[name*="genre"]');
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
    if (spec.genre && !setGenre(spec.genre)) missed.push('genre');
    if (spec.tags && spec.tags.length && !setTags(spec.tags)) missed.push('tags');
    if (missed.length) {
      ui.msg.textContent = `Filled the rest. Could not find: ${missed.join(', ')}. Nothing saved yet.`;
      return;
    }
    const save = findSave();
    if (!save) {
      ui.msg.textContent = 'Filled. Save button not found, tap Save yourself.';
      return;
    }
    ui.msg.textContent = 'Filled. Saving...';
    save.click();
  };
})();
