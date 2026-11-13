import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { createGame, RULES, ROUND_SECONDS, KINDS, KIND_LIST } from './game.js';
import { createAudio } from './audio.js';
import { fetchBoard, submitScore, cleanTag, errorText } from './scores.js';

const store = {
  get(key, fallback) {
    try {
      const v = window.localStorage.getItem(key);
      return v ? Object.assign({}, fallback, JSON.parse(v)) : fallback;
    } catch (e) { return fallback; }
  },
  set(key, value) {
    try { window.localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage blocked */ }
  }
};

const DEFAULT_SETTINGS = {
  trim: { slew: 0.5, trolley: 4, hoist: 5 },
  view: 'follow',
  sound: true,
  gauges: true,
  freeWind: 8,
  supply: 'crate',
  tag: ''
};
const VERSION = '2.0';
const DEFAULT_BEST = { score: 0, heightFt: 0, freeHeightFt: 0 };
const VIEWS = [['follow', 'Follow'], ['cab', 'Cab'], ['orbit', 'Orbit'], ['spotter', 'Spotter']];
const KEYS = {
  KeyA: 'slewL', ArrowLeft: 'slewL', KeyD: 'slewR', ArrowRight: 'slewR',
  KeyW: 'trolleyOut', KeyS: 'trolleyIn', ArrowUp: 'hoistUp', ArrowDown: 'hoistDn'
};

const num = (n) => Math.round(n).toLocaleString('en-US');
function clock(sec) {
  const s = Math.max(0, Math.ceil(sec));
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

function HoldButton({ k, engineRef, children, label }) {
  const [down, setDown] = useState(false);
  const set = (on) => (e) => {
    e.preventDefault();
    if (on) { try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ } }
    setDown(on);
    if (engineRef.current) engineRef.current.setInput(k, on);
  };
  return (
    <button
      type="button"
      className={'ctl' + (down ? ' is-down' : '')}
      aria-label={label}
      onPointerDown={set(true)}
      onPointerUp={set(false)}
      onPointerCancel={set(false)}
      onLostPointerCapture={set(false)}
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
    </button>
  );
}

function Board({ rows, highlightId }) {
  if (!rows || !rows.length) return null;
  return (
    <ol className="board">
      {rows.map((r) => (
        <li key={r.id} className={r.id === highlightId ? 'is-you' : ''}>
          <span className="board-rank">{r.rank}</span>
          <span className="board-tag">{r.tag}</span>
          <span className="board-score">{num(r.score)}</span>
        </li>
      ))}
    </ol>
  );
}

// Itchy Troll demo gate: three timed rounds free, then the purchase. Free build is the full version.
// Skipped if the unlock kit is missing.
const DEMO_ROUNDS = 3;
let gateBought = false;
function fullVersion() {
  return gateBought || !window.ItchyUnlock || window.ItchyUnlock.isUnlocked();
}
function demoUsed() {
  try { return parseInt(window.localStorage.getItem('skyflow.demoRounds') || '0', 10) || 0; } catch (e) { return 0; }
}
function demoLeft() {
  return Math.max(0, DEMO_ROUNDS - demoUsed());
}
function demoCount() {
  try { window.localStorage.setItem('skyflow.demoRounds', String(demoUsed() + 1)); } catch (e) { /* storage blocked */ }
}

function App() {
  const mountRef = useRef(null);
  const engineRef = useRef(null);
  const audioRef = useRef(null);
  if (!audioRef.current) audioRef.current = createAudio();

  const [screen, setScreen] = useState('menu');
  const [mode, setMode] = useState('timed');
  const [runId, setRunId] = useState(0);
  const [settings, setSettings] = useState(() => {
    const s = store.get('skyflow.settings', DEFAULT_SETTINGS);
    s.trim = Object.assign({}, DEFAULT_SETTINGS.trim, s.trim);
    return s;
  });
  const [best, setBest] = useState(() => store.get('skyflow.best', DEFAULT_BEST));
  const [hud, setHud] = useState(null);
  const [popups, setPopups] = useState([]);
  const [count, setCount] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [howOpen, setHowOpen] = useState(false);
  const [result, setResult] = useState(null);
  const [board, setBoard] = useState({ state: 'idle', rows: [] });
  const [post, setPost] = useState({ state: 'idle', rank: null, id: null, error: '' });
  const [tag, setTag] = useState(settings.tag || '');

  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const bestRef = useRef(best);
  bestRef.current = best;
  const popId = useRef(0);

  const saveSettings = useCallback((patch) => {
    setSettings((s) => {
      const next = Object.assign({}, s, patch);
      store.set('skyflow.settings', next);
      return next;
    });
  }, []);

  const popup = useCallback((text, kind) => {
    const id = ++popId.current;
    setPopups((p) => p.concat({ id, text, kind }).slice(-4));
    setTimeout(() => setPopups((p) => p.filter((x) => x.id !== id)), 1400);
  }, []);

  const loadBoard = useCallback(() => {
    setBoard((b) => ({ state: 'loading', rows: b.rows }));
    fetchBoard(10).then((r) => {
      if (r && r.ok) setBoard({ state: 'ready', rows: r.board || [] });
      else setBoard({ state: 'off', rows: [] });
    });
  }, []);

  useEffect(() => { loadBoard(); }, [loadBoard]);

  // engine lifecycle
  useEffect(() => {
    const audio = audioRef.current;
    const engineMode = screen === 'menu' ? 'attract' : mode;
    const s = settingsRef.current;
    setHud(null);
    setCount(null);
    setPopups([]);
    const engine = createGame({
      mount: mountRef.current,
      mode: engineMode,
      trim: s.trim,
      view: s.view,
      freeWind: s.freeWind,
      supply: s.supply,
      onHud: (h) => {
        setHud(h);
        if (engineMode !== 'attract') audio.ambient(h.moving, h.windMph, engine.isPaused() || h.phase === 'done');
        if (engineMode === 'free' && h.heightFt > bestRef.current.freeHeightFt + 0.05) {
          const nb = Object.assign({}, bestRef.current, { freeHeightFt: h.heightFt });
          bestRef.current = nb;
          setBest(nb);
          store.set('skyflow.best', nb);
        }
      },
      onEvent: (e) => {
        if (engineMode === 'attract') return;
        switch (e.type) {
          case 'grab': audio.grab(); break;
          case 'drop': audio.drop(); break;
          case 'nograb': audio.nograb(); break;
          case 'land': audio.land(e.impact); break;
          case 'bump': audio.bump(); break;
          case 'spawn': audio.spawn(); break;
          case 'smash': audio.smash(); popup(e.points ? 'Smashed ' + e.points : 'Smashed', 'bad'); break;
          case 'fall': popup('Fell ' + e.points, 'bad'); break;
          case 'collapse': audio.collapse(); popup('Tower leaned too far', 'bad'); break;
          case 'miss': audio.miss(); popup('Slid off', 'bad'); break;
          case 'base': audio.ok(); popup('Base crate set', 'plain'); break;
          case 'weld': audio.weld(); popup(e.count > 2 ? 'Welded, ' + e.count + ' pieces' : 'Welded', 'good'); break;
          case 'tumble': audio.tumble(); popup('Went over', 'bad'); break;
          case 'turn': case 'flip': audio.turn(); break;
          case 'place':
            if (e.quality === 'perfect') { audio.perfect(e.combo); popup((e.combo > 1 ? 'Perfect x' + e.combo : 'Perfect') + ' +' + e.points, 'perfect'); }
            else if (e.quality === 'great') { audio.great(); popup('Great +' + e.points, 'good'); }
            else { audio.ok(); popup('Placed +' + e.points, 'plain'); }
            break;
          case 'count': audio.count(); setCount(String(e.n)); break;
          case 'go': audio.go(); setCount('Go'); setTimeout(() => setCount(null), 700); break;
          case 'tick': audio.tick(); break;
          case 'buzzer': audio.buzzer(); setCount('Time'); break;
          case 'roundEnd': {
            audio.quiet();
            setCount(null);
            const r = e.result;
            const prev = bestRef.current;
            r.isBest = r.score > prev.score;
            if (r.isBest) audio.fanfare();
            const nb = Object.assign({}, prev, {
              score: Math.max(prev.score, r.score),
              heightFt: Math.max(prev.heightFt, r.heightFt)
            });
            bestRef.current = nb;
            setBest(nb);
            store.set('skyflow.best', nb);
            setPost({ state: 'idle', rank: null, id: null, error: '' });
            setResult(r);
            loadBoard();
            break;
          }
          default: break;
        }
      }
    });
    engineRef.current = engine;
    if (window.location.hash.indexOf('debug') !== -1) window.__sky = engine;
    return () => {
      engine.dispose();
      engineRef.current = null;
      audio.quiet();
    };
  }, [screen, mode, runId, popup, loadBoard]);

  // push live settings into the engine
  useEffect(() => { if (engineRef.current) engineRef.current.setTrim(settings.trim); }, [settings.trim]);
  useEffect(() => { if (engineRef.current) engineRef.current.setView(settings.view); }, [settings.view]);
  useEffect(() => { if (engineRef.current) engineRef.current.setFreeWind(settings.freeWind); }, [settings.freeWind]);
  useEffect(() => { if (engineRef.current) engineRef.current.setSupply(settings.supply); }, [settings.supply]);
  useEffect(() => { audioRef.current.setEnabled(settings.sound); }, [settings.sound]);

  // the side menu pauses the game
  useEffect(() => {
    if (engineRef.current && screen === 'play') {
      engineRef.current.setPaused(menuOpen);
      if (menuOpen) engineRef.current.clearInput();
    }
  }, [menuOpen, screen, runId]);

  useEffect(() => {
    const onHide = () => {
      if (document.hidden && screen === 'play' && !result) setMenuOpen(true);
    };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, [screen, result]);

  // keyboard
  useEffect(() => {
    if (screen !== 'play') return undefined;
    const typing = (e) => e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA');
    const down = (e) => {
      if (typing(e)) return;
      const eng = engineRef.current;
      if (!eng) return;
      if (KEYS[e.code]) { eng.setInput(KEYS[e.code], true); e.preventDefault(); return; }
      if (e.repeat) return;
      if (e.code === 'Space') { eng.grab(); e.preventDefault(); }
      else if (e.code === 'KeyR') eng.turn();
      else if (e.code === 'KeyF') eng.flip();
      else if (e.code === 'Digit1' || e.code === 'Digit2' || e.code === 'Digit3') saveSettings({ supply: KIND_LIST[parseInt(e.code.slice(5), 10) - 1] });
      else if (e.code === 'KeyC') {
        const i = VIEWS.findIndex((v) => v[0] === settingsRef.current.view);
        saveSettings({ view: VIEWS[(i + 1) % VIEWS.length][0] });
      } else if (e.code === 'KeyM') saveSettings({ sound: !settingsRef.current.sound });
      else if (e.code === 'Escape' || e.code === 'KeyP') setMenuOpen((o) => !o);
    };
    const up = (e) => {
      const eng = engineRef.current;
      if (eng && KEYS[e.code]) eng.setInput(KEYS[e.code], false);
    };
    const blur = () => { if (engineRef.current) engineRef.current.clearInput(); };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, [screen, saveSettings]);

  const startGame = async (m) => {
    audioRef.current.start();
    if (!fullVersion() && (m === 'free' || demoLeft() <= 0)) {
      let ok = false;
      try { ok = await window.ItchyUnlock.require(); } catch (e) { ok = false; }
      if (!ok) return;
      gateBought = true;
    }
    if (m === 'timed' && !fullVersion()) demoCount();
    setMode(m);
    setResult(null);
    setMenuOpen(false);
    setScreen('play');
    setRunId((n) => n + 1);
  };
  const toMenu = () => {
    setResult(null);
    setMenuOpen(false);
    setScreen('menu');
    loadBoard();
  };

  const sendScore = () => {
    const t = cleanTag(tag);
    if (!t.trim() || !result || post.state === 'sending') return;
    saveSettings({ tag: t });
    setPost({ state: 'sending', rank: null, id: null, error: '' });
    submitScore(t, result.score, result.durationMs).then((r) => {
      if (r && r.ok) {
        setPost({ state: 'sent', rank: r.rank, id: r.entry && r.entry.id, error: '' });
        loadBoard();
      } else {
        setPost({ state: 'failed', rank: null, id: null, error: errorText(r && r.error) });
      }
    });
  };

  const playing = screen === 'play';
  const timed = mode === 'timed';
  const lowTime = playing && timed && hud && hud.phase === 'playing' && hud.timeLeft <= 10;

  return (
    <div className="app">
      <div ref={mountRef} className="stage" />

      {screen === 'menu' && (
        <div className="menu">
          <header className="menu-head">
            <h1 className="title">Sky Flow</h1>
            <div className="hazard" aria-hidden="true" />
            <p className="tagline">Run the tower crane. Stack crates as high as they will stand.</p>
          </header>

          <div className="menu-foot">
            {howOpen ? (
              <section className="sheet how">
                <h2>How to play</h2>
                <p>Lower the hook onto the crate on the truck and press Grab. Carry it to open ground, set it down, and press Drop. The truck brings a new crate three seconds later.</p>
                <p>Stack crates on top of each other. The outline under a carried crate turns green when it is lined up. Wind pushes the load and grows through the round.</p>
                <p>You score {RULES.perFoot} points for each foot of tower still standing when time runs out, plus a bonus for every well centered crate. Crates that hit the truck or fall off the tower cost points.</p>
                <p>Free build has no clock and adds containers and weld joints. Pick what the truck brings at the top of the screen. Turn and Flip swing the load a quarter turn, so a container can lie either way or stand on end. Any piece set flush against a joint is welded to it, and a welded shape lifts, turns and falls as one. Tall pieces go over when you knock them.</p>
                <p className="keys">Keyboard: A and D slew, W and S move the trolley, up and down arrows hoist, Space grabs and drops, R turns the load, F flips it, 1 2 3 pick the truck load, C changes the camera, P pauses. Drag the scene to turn the camera. Pinch or scroll to zoom.</p>
                <button type="button" className="btn" onClick={() => setHowOpen(false)}>Back</button>
              </section>
            ) : (
              <section className="sheet">
                <button type="button" className="btn btn-primary" onClick={() => startGame('timed')}>
                  <span className="btn-main">Timed build</span>
                  <span className="btn-sub">{clock(ROUND_SECONDS)} on the clock, scored{fullVersion() ? '' : `, ${demoLeft()} free ${demoLeft() === 1 ? 'round' : 'rounds'} left`}</span>
                </button>
                <button type="button" className="btn" onClick={() => startGame('free')}>
                  <span className="btn-main">Free build</span>
                  <span className="btn-sub">{fullVersion() ? 'Containers and weld joints, no clock' : 'Full version. Containers and weld joints, no clock'}</span>
                </button>
                <div className="menu-row">
                  <button type="button" className="btn btn-small" onClick={() => setHowOpen(true)}>How to play</button>
                  <button type="button" className="btn btn-small" onClick={() => saveSettings({ sound: !settings.sound })}>
                    {settings.sound ? 'Sound on' : 'Sound off'}
                  </button>
                </div>
                {(best.score > 0 || best.freeHeightFt > 0) && (
                  <p className="best-line">
                    {best.score > 0 && <span>Your best score {num(best.score)}</span>}
                    {best.score > 0 && best.heightFt > 0 && <span>Tallest timed tower {best.heightFt.toFixed(0)} ft</span>}
                    {best.freeHeightFt > 0 && <span>Tallest free tower {best.freeHeightFt.toFixed(0)} ft</span>}
                  </p>
                )}
                <p className="version">Version {VERSION}</p>
                {board.state === 'ready' && (
                  <div className="menu-board">
                    <h2>Top scores</h2>
                    {board.rows.length ? <Board rows={board.rows.slice(0, 5)} /> : <p className="muted">No scores posted yet. Yours could be the first.</p>}
                  </div>
                )}
              </section>
            )}
          </div>
        </div>
      )}

      {playing && (
        <div className="hud">
          <div className="top">
            <button type="button" className={'burger' + (menuOpen ? ' is-open' : '')} aria-label="Menu" onClick={() => setMenuOpen((o) => !o)}>
              <span /><span /><span />
            </button>
            <div className="plate">
              <div className="plate-cell">
                <span className="plate-label">Height</span>
                <span className="plate-value">{hud ? hud.heightFt.toFixed(1) : '0.0'} ft</span>
              </div>
              {timed ? (
                <div className="plate-cell">
                  <span className="plate-label">Score</span>
                  <span className="plate-value">{hud ? num(hud.score) : 0}</span>
                </div>
              ) : (
                <div className="plate-cell">
                  <span className="plate-label">Best</span>
                  <span className="plate-value">{best.freeHeightFt.toFixed(1)} ft</span>
                </div>
              )}
              {timed && (
                <div className={'plate-cell plate-time' + (lowTime ? ' is-low' : '')}>
                  <span className="plate-label">Time</span>
                  <span className="plate-value">{clock(hud ? hud.timeLeft : ROUND_SECONDS)}</span>
                </div>
              )}
            </div>
            <div className="wind" aria-label="Wind">
              <div className="wind-dial">
                <div className="wind-arrow" style={{ transform: 'rotate(' + (hud ? hud.windDeg : 0) + 'deg)' }} />
              </div>
              <div className="wind-text">
                <span className="plate-label">Wind</span>
                <span className="plate-value">{hud ? hud.windMph.toFixed(0) : 0} mph</span>
              </div>
            </div>
          </div>

          {settings.gauges && hud && !menuOpen && (
            <dl className="gauges">
              <div><dt>Slew</dt><dd>{hud.slew}&deg;</dd></div>
              <div><dt>Trolley</dt><dd>{hud.trolley.toFixed(1)} ft</dd></div>
              <div><dt>Hook</dt><dd>{hud.hookFt.toFixed(1)} ft</dd></div>
              <div><dt>Swing</dt><dd>{hud.swing.toFixed(1)} ft</dd></div>
              <div><dt>Load</dt><dd>{num(hud.load)} lb</dd></div>
            </dl>
          )}

          {!timed && !menuOpen && !result && (
            <div className="supply">
              <span className="supply-label">Truck brings</span>
              <div className="supply-row">
                {KIND_LIST.map((k) => (
                  <button
                    key={k} type="button" aria-label={'Truck brings ' + KINDS[k].name}
                    className={settings.supply === k ? 'is-on' : ''}
                    onClick={() => saveSettings({ supply: k })}
                  >
                    <span className={'pc pc-' + k} aria-hidden="true" />
                    <span>{KINDS[k].name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="popups" aria-live="polite">
            {popups.map((p) => <div key={p.id} className={'popup popup-' + p.kind}>{p.text}</div>)}
          </div>
          {count && <div className="count" key={count}>{count}</div>}

          {menuOpen && (
            <div className="panel-wrap" onPointerDown={(e) => { if (e.target === e.currentTarget) setMenuOpen(false); }}>
              <aside className="panel">
                <h2>Paused</h2>
                <h3>Trim</h3>
                {[['slew', 'Slew', 0.05, 1.5, 0.05, 2], ['trolley', 'Trolley', 0.5, 10, 0.5, 1], ['hoist', 'Hoist', 0.5, 12, 0.5, 1]].map(([k, name, min, max, stepV, digits]) => (
                  <label key={k} className="slider">
                    <span>{name} {settings.trim[k].toFixed(digits)}</span>
                    <input
                      type="range" min={min} max={max} step={stepV} value={settings.trim[k]}
                      onChange={(e) => saveSettings({ trim: Object.assign({}, settings.trim, { [k]: parseFloat(e.target.value) }) })}
                    />
                  </label>
                ))}
                {!timed && (
                  <label className="slider">
                    <span>Wind {settings.freeWind.toFixed(0)} mph</span>
                    <input
                      type="range" min="0" max="25" step="1" value={settings.freeWind}
                      onChange={(e) => saveSettings({ freeWind: parseFloat(e.target.value) })}
                    />
                  </label>
                )}
                <h3>View</h3>
                <div className="seg">
                  {VIEWS.map(([v, name]) => (
                    <button key={v} type="button" className={settings.view === v ? 'is-on' : ''} onClick={() => saveSettings({ view: v })}>{name}</button>
                  ))}
                </div>
                <div className="seg seg-2">
                  <button type="button" className={settings.sound ? 'is-on' : ''} onClick={() => saveSettings({ sound: !settings.sound })}>{settings.sound ? 'Sound on' : 'Sound off'}</button>
                  <button type="button" className={settings.gauges ? 'is-on' : ''} onClick={() => saveSettings({ gauges: !settings.gauges })}>{settings.gauges ? 'Gauges on' : 'Gauges off'}</button>
                </div>
                <button type="button" className="btn btn-primary btn-small" onClick={() => setMenuOpen(false)}>Resume</button>
                <button type="button" className="btn btn-small" onClick={() => startGame(mode)}>Restart</button>
                <button type="button" className="btn btn-small" onClick={toMenu}>Main menu</button>
              </aside>
            </div>
          )}

          {!result && (
            <div className="controls">
              <div className="pad pad-left">
                {!timed && (
                  <button
                    type="button" aria-label="Turn the load"
                    className={'ctl act' + (hud && hud.carrying ? '' : ' is-off')}
                    onPointerDown={(e) => { e.preventDefault(); if (engineRef.current) engineRef.current.turn(); }}
                    onContextMenu={(e) => e.preventDefault()}
                  >
                    Turn
                  </button>
                )}
                {!timed && (
                  <button
                    type="button" aria-label="Flip the load"
                    className={'ctl act' + (hud && hud.carrying ? '' : ' is-off')}
                    onPointerDown={(e) => { e.preventDefault(); if (engineRef.current) engineRef.current.flip(); }}
                    onContextMenu={(e) => e.preventDefault()}
                  >
                    Flip
                  </button>
                )}
                <HoldButton k="slewL" engineRef={engineRef} label="Slew left"><span className="glyph">&#8630;</span></HoldButton>
                <HoldButton k="slewR" engineRef={engineRef} label="Slew right"><span className="glyph">&#8631;</span></HoldButton>
                <HoldButton k="trolleyIn" engineRef={engineRef} label="Trolley in">&larr; In</HoldButton>
                <HoldButton k="trolleyOut" engineRef={engineRef} label="Trolley out">Out &rarr;</HoldButton>
              </div>
              <div className="pad pad-right">
                <HoldButton k="hoistUp" engineRef={engineRef} label="Hoist up">&uarr; Up</HoldButton>
                <HoldButton k="hoistDn" engineRef={engineRef} label="Hoist down">&darr; Dn</HoldButton>
                <button
                  type="button"
                  className={'ctl grab' + (hud && hud.carrying ? ' is-carrying' : (hud && hud.canGrab ? ' is-ready' : ''))}
                  onPointerDown={(e) => { e.preventDefault(); if (engineRef.current) engineRef.current.grab(); }}
                  onContextMenu={(e) => e.preventDefault()}
                >
                  {hud && hud.carrying ? 'Drop' : 'Grab'}
                </button>
              </div>
            </div>
          )}

          {result && (
            <div className="panel-wrap panel-center">
              <section className="sheet result">
                <h2>{result.isBest ? 'New best' : 'Time'}</h2>
                <div className="result-score">{num(result.score)}</div>
                <table className="tally">
                  <tbody>
                    <tr><th>Tower {result.heightFt.toFixed(1)} ft</th><td>{num(result.heightPts)}</td></tr>
                    <tr>
                      <th>Placement bonus<small>{result.perfects} perfect, {result.greats} great, {result.placed} stacked</small></th>
                      <td>+{num(result.bonus)}</td>
                    </tr>
                    <tr>
                      <th>Penalties<small>{result.smashed} smashed, {result.fallen} fallen</small></th>
                      <td>{result.penalty ? '-' + num(result.penalty) : '0'}</td>
                    </tr>
                  </tbody>
                </table>
                {result.score > 0 && post.state !== 'sent' && (
                  <div className="post">
                    <label htmlFor="tag">Your tag, 3 letters</label>
                    <div className="post-row">
                      <input
                        id="tag" type="text" inputMode="text" autoComplete="off" autoCapitalize="characters" maxLength={3}
                        value={tag} placeholder="AAA"
                        onChange={(e) => setTag(cleanTag(e.target.value))}
                        onKeyDown={(e) => { if (e.key === 'Enter') sendScore(); }}
                      />
                      <button type="button" className="btn btn-primary btn-small" disabled={!tag.trim() || post.state === 'sending'} onClick={sendScore}>
                        {post.state === 'sending' ? 'Posting' : 'Post score'}
                      </button>
                    </div>
                    {post.state === 'failed' && <p className="post-note">{post.error}</p>}
                  </div>
                )}
                {result.score === 0 && <p className="muted">Stack one crate on another to put a score on the board.</p>}
                {post.state === 'sent' && <p className="post-ok">Score posted{post.rank ? ', rank ' + post.rank : ''}.</p>}
                {board.state === 'ready' && board.rows.length > 0 && <Board rows={board.rows} highlightId={post.id} />}
                <div className="menu-row">
                  <button type="button" className="btn btn-primary btn-small" onClick={() => startGame('timed')}>Play again</button>
                  <button type="button" className="btn btn-small" onClick={toMenu}>Main menu</button>
                </div>
              </section>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
