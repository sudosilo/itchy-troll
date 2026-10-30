const baseDates = {
  "2026-10-18-orange-testbed": "2026-10-26",
  "2026-10-20-orange-dialbeat": "2026-10-22",
  "2026-10-22-orange-agent": "2026-10-25",
  "2026-10-23-orange-smash": "2026-10-29",
  "67-press-proccessor": "2026-10-08",
  "access-terminal": "2026-10-05",
  "access-terminal-admin": "2026-10-04",
  "access-terminal-orange": "2026-10-05",
  "access-terminal-red": "2026-10-05",
  "access-termonal-blue": "2026-10-05",
  "aerophin-twin": "2026-10-18",
  "aliens-win": "2026-10-22",
  "androids": "2026-10-08",
  "anthropic-percentage-pop-up-game": "2026-10-23",
  "ascend": "2026-10-18",
  "axiom": "2026-10-24",
  "beesim-green": "2026-09-10",
  "birdix": "2026-10-11",
  "bitfield-synth": "2026-09-08",
  "blue-agent": "2026-10-22",
  "boba-breakeven-x8k4": "2026-10-18",
  "cabin-viewer": "2026-09-10",
  "campus-ebutuoy": "2026-06-27",
  "carchive": "2026-10-06",
  "chassisquiver": "2026-10-25",
  "checkin-kiosk": "2026-10-21",
  "chromahum-zq": "2026-10-25",
  "chromatogram": "2026-08-16",
  "circuit-musicfx": "2026-09-11",
  "cockpit-racer": "2026-10-22",
  "coffee-autosim": "2026-10-22",
  "coffeekit1": "2026-06-22",
  "control-troll": "2026-10-29",
  "conveyor-sim": "2026-10-28",
  "cypher-wars": "2026-09-11",
  "daily-outline": "2026-10-20",
  "datacenter-osint": "2026-10-21",
  "diamond-driller": "2026-10-19",
  "doctrine-duel-qx": "2026-10-29",
  "dronecamp": "2026-10-13",
  "dronesim-blue": "2026-09-11",
  "ebutuoy": "2026-10-22",
  "edmia": "2026-05-21",
  "engine-companion": "2026-09-17",
  "equivalence-engine": "2026-10-08",
  "ether-wand": "2026-10-23",
  "fatty-fart-pedal": "2026-10-25",
  "field-study": "2026-10-08",
  "field-twin": "2026-10-29",
  "field-twin-glaucous": "2026-10-17",
  "field-twin-violet": "2026-10-25",
  "field-twin-viridian": "2026-10-24",
  "final-victor": "2026-10-24",
  "fogwarren-vx": "2026-10-25",
  "ghost-kitchen-builder": "2026-10-22",
  "gladhand-dockyard": "2026-10-23",
  "groundcore": "2026-10-18",
  "hackercons": "2026-06-15",
  "hackercons-roulette": "2026-10-19",
  "heckle-troll": "2026-10-29",
  "hexnote-3d": "2026-10-08",
  "hoofer-sync": "2026-10-24",
  "infinicanvan": "2026-09-10",
  "infinite-centerpoint": "2026-09-02",
  "inkrunner": "2026-10-24",
  "irrigation-station": "2026-07-13",
  "itchy-troll": "2026-10-29",
  "j30p4rdy": "2026-07-26",
  "kat-chat": "2026-10-09",
  "kvs": "2026-10-10",
  "legends": "2026-05-14",
  "looper": "2026-10-24",
  "mary-jane-man": "2026-10-20",
  "mill-ionaire": "2026-10-26",
  "ming-globe": "2026-10-09",
  "mission-operator": "2026-10-15",
  "mohave-wtf": "2026-10-24",
  "mohavetech-contracts": "2026-10-18",
  "nanoverse": "2026-10-20",
  "note-note-note": "2026-10-19",
  "offset-listener": "2026-10-25",
  "open-pipeline": "2026-07-02",
  "ordersim": "2026-10-21",
  "page-wide-pof": "2026-10-22",
  "pajamastan": "2026-10-08",
  "pajamastan-invoices": "2026-10-23",
  "pajamastan-warrants": "2026-10-19",
  "pancake-orange": "2026-10-04",
  "pancakes": "2026-09-12",
  "parcelsun-kq": "2026-10-23",
  "parkingten": "2026-10-23",
  "pdf-yourself": "2026-10-29",
  "pipeline-builder": "2026-09-10",
  "pixelcoop-farm": "2026-10-22",
  "pixelmill": "2026-10-22",
  "polygon-arcade": "2026-09-13",
  "qsr-receipt-sim": "2026-10-08",
  "qsr-timeline": "2026-10-28",
  "rat-site": "2026-10-20",
  "rat30-deck": "2026-10-08",
  "repofind": "2026-10-08",
  "restack": "2026-10-22",
  "rogue-rail": "2026-10-09",
  "rosetta-pone": "2026-10-25",
  "rtss": "2026-10-21",
  "scope-listener": "2026-10-14",
  "screensaver-musicfx": "2026-06-21",
  "secureops": "2026-10-20",
  "shared-server": "2026-10-25",
  "shitty-ass-finance": "2026-10-02",
  "shitty-ass-trading": "2026-10-08",
  "skwiggle": "2026-09-24",
  "skyflow-orange": "2026-09-10",
  "snapshot-engine": "2026-09-28",
  "spaceout": "2026-10-13",
  "spectral-engine": "2026-10-24",
  "spectrastrain": "2026-10-06",
  "spirits-atlas": "2026-09-11",
  "stackloom-meta": "2026-10-25",
  "stompbox-lab": "2026-10-24",
  "stumbler": "2026-10-05",
  "suno-forge": "2026-10-13",
  "swh-sumbler": "2026-07-14",
  "tanksandzombies": "2026-10-13",
  "tapperator": "2026-10-24",
  "termbeat": "2026-10-18",
  "text-based-game": "2026-10-25",
  "threat-atlas": "2026-09-11",
  "tickle-boxie": "2026-10-24",
  "tile-spinner": "2026-09-11",
  "tinewood-keys": "2026-10-22",
  "topdown-pixeltown": "2026-10-06",
  "topo-wars": "2026-10-03",
  "topo-wars-server": "2026-10-25",
  "torque-converter": "2026-10-23",
  "tower-builder": "2026-10-18",
  "tower-builder-one": "2026-09-02",
  "tractor-tool": "2026-10-23",
  "tunnelfx": "2026-06-20",
  "virality-snapshot": "2026-09-27",
  "virality-trader": "2026-09-27",
  "welcome-to-the-madness": "2026-07-10"
};



const links = document.querySelectorAll('#category-view a, #alpha-view a');
const now = Date.now();
links.forEach(a => {
  const name = a.textContent.trim();
  const base = baseDates[name];
  if (!base) return;
  const d = Math.floor((now - new Date(base).getTime()) / 86400000);
  let c = '#888888';
  if (d < 7) c = '#00ff00';
  else if (d < 30) c = '#ffff00';
  else if (d < 60) c = '#ffa500';
  else if (d < 90) c = '#ff4444';
  a.style.color = c;
});

function stumble() {
  const links = document.querySelectorAll('#category-view a:not(.nostumble)');
  const pick = links[Math.floor(Math.random() * links.length)];
  window.location.href = pick.href;
}

fetch('/api/ratings').then(r => r.json()).then(ratings => {
  document.querySelectorAll('#category-view a, #alpha-view a').forEach(a => {
    const name = a.textContent.trim();
    const count = ratings[name] || 0;
    const btn = document.createElement('button');
    btn.textContent = '+1 (' + count + ')';
    btn.style.marginLeft = '10px';
    btn.style.background = 'black';
    btn.style.color = '#00ffff';
    btn.style.border = '1px solid #00ffff';
    btn.style.fontFamily = 'monospace';
    btn.style.fontSize = '11px';
    btn.onclick = () => {
      fetch('/api/rate?name=' + name, { method: 'POST' }).then(r => r.json()).then(d => {
        btn.textContent = '+1 (' + d.votes + ')';
      });
    };
    a.parentNode.appendChild(btn);
  });
});

function showView(view) {
  document.getElementById('stats-view').classList.add('hidden');
  document.getElementById('links-view').classList.add('hidden');
  document.getElementById('alpha-view').classList.add('hidden');
  document.getElementById('category-view').classList.add('hidden');
  document.getElementById(view + '-view').classList.remove('hidden');
  document.getElementById('menu').classList.remove('open');
}
function toggleInfo() {
  document.getElementById('info-box').classList.toggle('hidden');
  document.getElementById('menu').classList.remove('open');
}

document.querySelectorAll('#category-view a, #alpha-view a').forEach(a => {
  const name = a.textContent.trim();
  const toggle = document.createElement('span');
  toggle.textContent = ' \u25be';
  toggle.style.cursor = 'pointer';
  toggle.style.color = '#00ffff';
  a.parentNode.appendChild(toggle);

  const box = document.createElement('textarea');
  box.style.display = 'none';
  box.style.width = '90%';
  box.style.background = 'black';
  box.style.color = '#00ff00';
  box.style.border = '1px solid #00ff00';
  box.style.fontFamily = 'monospace';
  box.style.fontSize = '12px';
  box.rows = 2;
  box.value = localStorage.getItem('note:' + name) || '';
  box.addEventListener('input', () => {
    localStorage.setItem('note:' + name, box.value);
  });
  a.parentNode.parentNode.insertBefore(box, a.parentNode.nextSibling);

  toggle.addEventListener('click', () => {
    box.style.display = box.style.display === 'none' ? 'block' : 'none';
  });
});

function showLinks() {
  const frame = document.getElementById('links-frame');
  if (!frame.getAttribute('src')) frame.setAttribute('src', 'https://free-as-in-links.vercel.app');
  showView('links');
}

function showStats() {
  document.getElementById('links-view').classList.add('hidden');
  document.getElementById('alpha-view').classList.add('hidden');
  document.getElementById('category-view').classList.add('hidden');
  document.getElementById('stats-view').classList.remove('hidden');
  document.getElementById('menu').classList.remove('open');
  renderStats();
}

function renderStats() {
  const el = document.getElementById('stats-view');
  const now = Date.now();
  const entries = Object.entries(baseDates);
  const total = entries.length;

  const buckets = {};
  entries.forEach(([name, date]) => {
    const d = new Date(date);
    const weekLabel = d.getFullYear() + '-W' + String(Math.ceil((((d - new Date(d.getFullYear(),0,1)) / 86400000) + new Date(d.getFullYear(),0,1).getDay() + 1) / 7)).padStart(2, '0');
    buckets[weekLabel] = (buckets[weekLabel] || 0) + 1;
  });
  const sortedWeeks = Object.keys(buckets).sort();
  const maxCount = Math.max(...Object.values(buckets));

  let thisWeek = 0, lastWeek = 0;
  entries.forEach(([name, date]) => {
    const days = Math.floor((now - new Date(date).getTime()) / 86400000);
    if (days < 7) thisWeek++;
    else if (days < 14) lastWeek++;
  });

  const oldest = entries
    .map(([name, date]) => ({ name, days: Math.floor((now - new Date(date).getTime()) / 86400000) }))
    .sort((a, b) => b.days - a.days)
    .slice(0, 5);

  let html = '<h2>Statistics</h2>';
  html += '<p>This page is an index archive for Mohave Technology Group projects. It links out to each live project without hosting or archiving the projects themselves.</p>';
  html += '<p>Total tracked deployments: ' + total + '</p>';
  html += '<p>Updated in the last 7 days: ' + thisWeek + '</p>';
  html += '<p>Updated the 7 days before that: ' + lastWeek + '</p>';
  html += '<p>' + (thisWeek >= lastWeek ? 'Up' : 'Down') + ' week over week by ' + Math.abs(thisWeek - lastWeek) + '</p>';

  html += '<h2>Deploy Timeline</h2>';
  sortedWeeks.forEach(w => {
    const count = buckets[w];
    const barWidth = Math.round((count / maxCount) * 200);
    html += '<div style="margin-bottom:4px">' + w + ' <span style="display:inline-block;background:#00ff00;height:10px;width:' + barWidth + 'px;vertical-align:middle"></span> ' + count + '</div>';
  });

  html += '<h2>Could Use Some Love</h2>';
  oldest.forEach(o => {
    html += '<p>' + o.name + ' - ' + o.days + ' days</p>';
  });

  html += '<h2>Favorite Project</h2>';
  html += '<p id="favorite-slot">loading...</p>';

  el.innerHTML = html;

  fetch('/api/ratings').then(r => r.json()).then(ratings => {
    let best = null, bestVotes = -1;
    for (const name in ratings) {
      if (ratings[name] > bestVotes) {
        best = name;
        bestVotes = ratings[name];
      }
    }
    document.getElementById('favorite-slot').textContent = best ? (best + ' with ' + bestVotes + ' votes') : 'no votes yet';
  }).catch(() => {
    document.getElementById('favorite-slot').textContent = 'ratings unavailable';
  });
}

document.querySelectorAll('#alpha-view a').forEach(a => {
  a.style.color = '#00ffff';
});

function applyVisitedColors() {
  document.querySelectorAll('#alpha-view a').forEach(a => {
    const name = a.textContent.trim();
    if (localStorage.getItem('visited:' + name)) {
      a.style.color = '#006666';
    } else {
      a.style.color = '#00ffff';
    }
  });
}
applyVisitedColors();
window.addEventListener('pageshow', applyVisitedColors);

document.querySelectorAll('#alpha-view a').forEach(a => {
  const name = a.textContent.trim();
  a.addEventListener('click', () => {
    localStorage.setItem('visited:' + name, 'true');
  });
});

const hubEntryAlpha = document.createElement('p');
hubEntryAlpha.innerHTML = '<span style="color:#ffffff">mohavetech-website</span><span class="tag">-blue</span>';
document.getElementById('alpha-view').appendChild(hubEntryAlpha);

const hubEntryCategory = hubEntryAlpha.cloneNode(true);
document.getElementById('category-view').appendChild(hubEntryCategory);

(function() {
  const canvas = document.createElement('canvas');
  canvas.id = 'starfield';
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.zIndex = '-1';
  canvas.style.pointerEvents = 'none';
  document.body.insertBefore(canvas, document.body.firstChild);

  const ctx = canvas.getContext('2d');
  let lastWidth = window.innerWidth;
  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', () => {
    if (window.innerWidth !== lastWidth) {
      lastWidth = window.innerWidth;
      resize();
    }
  });

  const palette = ['#00ffff', '#ff00ff', '#ffff00', '#00ff00', '#ff8800', '#0088ff'];
  const sprites = {
    tree: [[0,2,'#8b5a2b'],[0,1,'#00aa00'],[-1,0,'#00aa00'],[0,0,'#00aa00'],[1,0,'#00aa00']],
    house: [[-1,1,'#cc4444'],[0,1,'#cc4444'],[1,1,'#cc4444'],[-1,0,'#dddddd'],[0,0,'#dddddd'],[1,0,'#dddddd'],[0,-1,'#8b5a2b']],
    bird: [[-1,0,'#333333'],[0,-1,'#333333'],[1,0,'#333333']]
  };
  const spriteNames = Object.keys(sprites);

  function makeStar() {
    const isEasterEgg = Math.random() < 0.07;
    return {
      x: (Math.random() - 0.5) * 2,
      y: (Math.random() - 0.5) * 2,
      z: Math.random() * 1000 + 1,
      color: Math.random() < 0.2 ? '#ffffff' : palette[Math.floor(Math.random() * palette.length)],
      shape: isEasterEgg ? spriteNames[Math.floor(Math.random() * spriteNames.length)] : null
    };
  }

  const stars = [];
  for (let i = 0; i < 140; i++) stars.push(makeStar());

  function frame() {
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    stars.forEach(star => {
      star.z -= 2;
      if (star.z <= 1) {
        Object.assign(star, makeStar());
        star.z = 1000;
      }
      const scale = 200 / star.z;
      const sx = cx + star.x * scale * cx;
      const sy = cy + star.y * scale * cy;
      const size = Math.max(0.5, (1000 - star.z) / 150);

      if (sx < 0 || sx > canvas.width || sy < 0 || sy > canvas.height) return;

      if (star.shape && size > 6) {
        const pixels = sprites[star.shape];
        const px = size / 3;
        pixels.forEach(([dx, dy, color]) => {
          ctx.fillStyle = color;
          ctx.fillRect(sx + dx * px, sy - dy * px, px, px);
        });
      } else {
        ctx.fillStyle = star.color;
        ctx.fillRect(sx, sy, size, size);
      }
    });

    requestAnimationFrame(frame);
  }
  frame();
})();
