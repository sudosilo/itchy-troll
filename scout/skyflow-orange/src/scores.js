// Client for the shared score service. Every call resolves to an object with
// ok true or false and never throws, so the game keeps running offline.
const HUB = 'https://2026-10-30-orange-scores.vercel.app';
export const GAME = 'sky-flow';

async function call(path, opts) {
  const ctl = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = ctl ? setTimeout(() => ctl.abort(), 6000) : null;
  try {
    const r = await fetch(HUB + path, Object.assign({}, opts, ctl ? { signal: ctl.signal } : {}));
    return await r.json();
  } catch (e) {
    return { ok: false, error: 'offline' };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function cleanTag(t) {
  return String(t || '').toUpperCase().replace(/[^A-Z0-9 ]/g, '').slice(0, 3);
}

export function fetchBoard(limit) {
  return call('/api/board?game=' + encodeURIComponent(GAME) + '&limit=' + (limit || 10));
}

export function submitScore(tag, score, durationMs) {
  return call('/api/score', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      game: GAME,
      tag: cleanTag(tag).padEnd(3, ' '),
      link: '',
      score: Math.floor(score),
      duration: Math.floor(durationMs)
    })
  });
}

export function errorText(code) {
  const map = {
    offline: 'The leaderboard could not be reached. Your score is saved on this device.',
    unknown_game: 'The leaderboard is not open for this game yet. Your score is saved on this device.',
    tag_rejected: 'That tag was not accepted. Try different letters.',
    slow_down: 'Wait ten seconds, then send again.',
    score_rejected: 'The leaderboard did not accept that score.',
    score_too_fast: 'The leaderboard did not accept that score.',
    service_unavailable: 'The leaderboard is down right now. Your score is saved on this device.'
  };
  return map[code] || 'The score was not sent. Your score is saved on this device.';
}
