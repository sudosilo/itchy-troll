

let lang = 'en';
/* bridge to the Parcelsun 3D model */
const EMBED = window.parent !== window;
let BANK = { cols: [], total: 0 }, pendingNum = null;
function toBank(msg) { if (EMBED) window.parent.postMessage(Object.assign({ src: 'kiosk' }, msg), '*'); }
window.addEventListener('message', e => {
  const d = e.data || {};
  if (d.src !== 'parcelsun') return;
  if (d.type === 'layout') { BANK = { cols: d.cols || [], total: d.total || 0 }; if (window.sendSize) window.sendSize(); }
  if (d.type === 'opened') { const el = document.getElementById('rnum'); if (el) el.textContent = d.n == null ? '--' : d.n; }
});
if (EMBED) {
  document.documentElement.classList.add('embed');
  const sendSize = window.sendSize = () => { const el = document.getElementById('housing') || document.body; toBank({ type: 'size', h: Math.ceil(el.getBoundingClientRect().height) + 4 }); };
  window.addEventListener('resize', sendSize);
  window.addEventListener('load', () => { toBank({ type: 'ready' }); sendSize(); });
}
const t = k => (T[lang][k] ?? T.en[k] ?? k);
function paint(){
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-t]').forEach(el => el.textContent = t(el.dataset.t));
  buildHelp(); buildLangs(); drawEntry(); drawTech();
}

/* attract slides */
const kraft=(x,y,w,h,f)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="var(--kraft)"/><rect x="${x}" y="${y}" width="${w}" height="${h*.18}" fill="var(--kraft-dark)" opacity=".55"/><rect x="${x+w*.42}" y="${y}" width="${w*.16}" height="${h}" fill="var(--tape)" opacity=".85"/>`+(f?`<rect x="${x+w*.08}" y="${y+h*.55}" width="${w*.26}" height="${h*.22}" rx="2" fill="#fff" opacity=".9"/><rect x="${x+w*.11}" y="${y+h*.6}" width="${w*.18}" height="${h*.03}" fill="#9aa"/><rect x="${x+w*.11}" y="${y+h*.67}" width="${w*.12}" height="${h*.03}" fill="#9aa"/>`:'');
const scenes=[
  ['#cfe3ea','#b4d0d9',kraft(70,250,180,110,1)+kraft(90,170,140,80,0)+kraft(110,110,100,60,1)+`<circle cx="160" cy="88" r="20" fill="#e8b4c4"/><rect x="146" y="70" width="28" height="8" rx="4" fill="#7fb8a0"/>`],
  ['#e4ddf0','#cfc4e3',kraft(50,230,130,130,1)+kraft(170,270,110,90,0)+`<rect x="190" y="230" width="70" height="40" rx="6" fill="#5fa0c9"/><path d="M80 230 q35 -50 70 0" stroke="#f0c75e" stroke-width="10" fill="none" stroke-linecap="round"/>`],
  ['#f2e6d0','#e3d2b2',kraft(100,200,150,160,1)+`<rect x="60" y="300" width="40" height="60" rx="6" fill="#7fb8a0"/><rect x="66" y="290" width="28" height="12" rx="3" fill="#5c9a80"/><circle cx="275" cy="335" r="25" fill="#e8b4c4"/><circle cx="275" cy="335" r="12" fill="#fff" opacity=".5"/>`],
  ['#d6ecdf','#bddcc9',kraft(40,280,120,80,0)+kraft(170,260,140,100,1)+kraft(110,180,120,90,1)+`<rect x="240" y="220" width="16" height="40" rx="3" fill="#5fa0c9"/><rect x="234" y="214" width="28" height="10" rx="3" fill="#41779a"/>`]
];
const frame=document.getElementById('frame');
scenes.forEach(([bg,fl,body],i)=>{const d=document.createElement('div');d.className='slide'+(i?'':' on');
  d.innerHTML=`<svg viewBox="0 0 340 420" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="340" height="420" fill="${bg}"/><rect y="350" width="340" height="70" fill="${fl}"/>${body}</svg>`;frame.appendChild(d);});
let si=0;setInterval(()=>{const s=frame.children;s[si].classList.remove('on');si=(si+1)%s.length;s[si].classList.add('on');},6000);

/* navigation */
const views=['attract','scan','entry','result','ts','offline','door','part'];
let curView='attract';
function go(v){if(v!==curView&&['door','part'].includes(curView))tok++;curView=v;if(['ts','offline','door','part'].includes(v))techView=v;views.forEach(id=>document.getElementById(id).classList.toggle('show',id===v));closeModals();}
function closeModals(){document.querySelectorAll('.scrim').forEach(m=>m.classList.remove('show'));}
function modal(id){closeModals();document.getElementById(id).classList.add('show');}
document.getElementById('attract').addEventListener('click',()=>go('scan'));
document.getElementById('attract').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go('scan');}});
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',closeModals));
document.querySelectorAll('.scrim').forEach(s=>s.addEventListener('click',e=>{if(e.target===s)closeModals();}));
document.querySelectorAll('[data-act]').forEach(b=>b.addEventListener('click',()=>{
  const a=b.dataset.act;
  if(a==='enter'){mode='code';val='';msg='';go('entry');}
  if(a==='exit')go('attract');
  if(a==='help')modal('helpModal');
  if(a==='lang')modal('langModal');
  if(a==='contrast')document.getElementById('housing').classList.toggle('hc');
  if(a==='details'){drawInfo();modal('infoModal');}
  if(a==='tsback'){tok++;techView='ts';drawTech();go('ts');}
  if(a==='techhelp'){$('dTitle').textContent=t('help');$('dBody').textContent=t('thBody');$('dBody2').textContent='';$('qr').hidden=true;modal('detailModal');}
}));

/* scan simulation */
document.getElementById('fakeScan').addEventListener('click',()=>{
  const lamp=document.getElementById('lamp');lamp.classList.add('lit');
  setTimeout(()=>{lamp.classList.remove('lit');openLocker();},700);
});

/* entry */
let mode='code',val='',msg='';
const boxes=document.getElementById('boxes'),track=document.getElementById('track'),pad=document.getElementById('pad'),kb=document.getElementById('kb');
for(let i=0;i<6;i++){const b=document.createElement('div');b.className='box';boxes.appendChild(b);}
const delSvg='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M8 5h12v14H8l-6-7z"/><path d="M11 9l6 6M17 9l-6 6"/></svg>';
['1','2','3','4','5','6','7','8','9','','0','del'].forEach(k=>{
  if(!k){pad.appendChild(document.createElement('span'));return;}
  const b=document.createElement('button');b.className='key'+(k==='del'?' plain':'');b.dataset.k=k;
  b.innerHTML=k==='del'?delSvg:`<span>${k}</span>`;
  b.setAttribute('aria-label',k==='del'?'Delete':k);pad.appendChild(b);
});
[['1','2','3','4','5','6','7','8','9','0','del'],['Q','W','E','R','T','Y','U','I','O','P'],['A','S','D','F','G','H','J','K','L'],['Z','X','C','V','B','N','M','sub']].forEach(row=>{
  const r=document.createElement('div');
  row.forEach(k=>{const b=document.createElement('button');b.className='kk'+(k==='sub'?' sub':'');b.dataset.k=k;
    b.innerHTML=k==='del'?delSvg:k==='sub'?'<span data-t="submit"></span>':`<span>${k}</span>`;
    if(k==='del')b.setAttribute('aria-label','Delete');r.appendChild(b);});
  kb.appendChild(r);
});
pad.addEventListener('click',e=>{
  const b=e.target.closest('.key');if(!b)return;const k=b.dataset.k;msg='';
  if(k==='del')val=val.slice(0,-1);
  else if(val.length<6){val+=k;if(val.length===6)setTimeout(check,250);}
  drawEntry();
});
kb.addEventListener('click',e=>{
  const b=e.target.closest('.kk');if(!b)return;const k=b.dataset.k;msg='';
  if(k==='del')val=val.slice(0,-1);
  else if(k==='sub'){if(val.length<8)msg=t('needT');else{check();return;}}
  else if(val.length<22)val+=k;
  drawEntry();
});
function check(){
  if(mode==='code'&&val==='999999'){val='';openTech();return;}
  if(mode==='code'&&val==='000000'){msg=t('bad');val='';drawEntry();return;}
  openLocker();
}
document.getElementById('tCode').addEventListener('click',()=>{mode='code';val='';msg='';drawEntry();});
document.getElementById('tTrack').addEventListener('click',()=>{mode='track';val='';msg='';drawEntry();});
function drawEntry(){
  document.getElementById('tCode').classList.toggle('on',mode==='code');
  document.getElementById('tTrack').classList.toggle('on',mode==='track');
  boxes.hidden=pad.hidden=mode!=='code';track.hidden=kb.hidden=mode!=='track';
  [...boxes.children].forEach((b,i)=>b.textContent=val[i]||'');
  track.textContent=val||t('trackHint');track.classList.toggle('empty',!val);
  kb.querySelectorAll('[data-t]').forEach(el=>el.textContent=t(el.dataset.t));
  document.getElementById('emsg').textContent=msg;
}

/* tech mode */
const parts=['tScan','tKey','tNet','tCol','tCam','tAud','tSpk'];
let offline=[],techView='ts',doorStep='issue',curPart='',ps='',tok=0,kpField='',kpFlag={};
const $=id=>document.getElementById(id);
const on=(id,fn)=>{const e=$(id);if(e)e.onclick=fn;};
const later=(ms,fn)=>{const my=tok;setTimeout(()=>{if(my===tok)fn();},ms);};
function speak(txt,done){
  let fired=false;const fin=()=>{if(!fired){fired=true;done&&done();}};
  try{const u=new SpeechSynthesisUtterance(txt);u.lang={en:'en-US',fr:'fr-FR',de:'de-DE',it:'it-IT',es:'es-ES'}[lang];u.onend=fin;speechSynthesis.cancel();speechSynthesis.speak(u);}catch(e){}
  setTimeout(fin,3500);
}
let actx;
function beep(f){try{actx=actx||new (window.AudioContext||window.webkitAudioContext)();const o=actx.createOscillator(),g=actx.createGain();o.frequency.value=f||880;g.gain.value=.06;o.connect(g);g.connect(actx.destination);o.start();o.stop(actx.currentTime+.08);}catch(e){}}

function openTech(){
  const n=Math.random()<.7?1:2;offline=[];
  const nc=BANK.cols.length||12;
  while(offline.length<n){const c=Math.floor(Math.random()*nc)+1,sl=Math.floor(Math.random()*(BANK.cols[c-1]||10))+1;
    if(!offline.some(o=>o.c===c&&o.s===sl))offline.push({c,s:sl,type:Math.random()<.5?'door':'sensor'});}
  techView='ts';drawTech();go('ts');
}
function drawTech(){
  const sub=$('tsSub');if(!sub)return;
  sub.innerHTML=offline.length?`<span class="bang">!</span><span>${t('tsBad')}</span>`:`<span>${t('tsOk')}</span>`;
  const tiles=$('tiles');tiles.innerHTML='';
  ['tOff',...parts].forEach(k=>{const b=document.createElement('button');b.className='tile'+(k==='tOff'&&offline.length?' bad':'');
    b.innerHTML=(k==='tOff'&&offline.length?'<span class="bang">!</span>':'')+`<span>${t(k)}</span>`;
    b.addEventListener('click',()=>{if(k==='tOff'){techView='offline';drawOffline();go('offline');}else{curPart=k;go('part');setPs('intro');}});
    tiles.appendChild(b);});
  if(techView==='offline')drawOffline();
  if(techView==='door')drawDoor();
  if(techView==='part')drawPart();
}
function drawOffline(){
  const n=offline.length,body=$('offBody');
  body.innerHTML=n?`<span class="bang big">!</span><h3>${n===1?t('off1'):tf('offN',{n})}</h3><button class="primary" id="goFirst">${t('connect')}</button>`
    :`<span class="okdot">&#10003;</span><h3>${t('off0')}</h3><button class="ghost" id="goBack">${t('back')}</button>`;
  on('goFirst',()=>{techView='door';go('door');setDoor('issue');});
  on('goBack',()=>{techView='ts';drawTech();go('ts');});
}

/* door and sensor repair flow */
function setDoor(s){
  tok++;doorStep=s;drawDoor();
  const o=offline[0];
  if(o&&s==='opening')toBank({type:'techOpen',c:o.c,s:o.s});
  if(o&&(s==='detected'||s==='noissue'))toBank({type:'techClose',c:o.c,s:o.s});
  if(s==='opening')later(1400,()=>setDoor('ask'));
  if(s==='noissue')later(2400,()=>{offline.shift();if(offline.length){setDoor('issue');}else{techView='offline';drawOffline();go('offline');}});
}
function drawDoor(){
  const o=offline[0];if(!o)return;
  $('colName').textContent=tf('column',{c:o.c});
  const col=$('col');col.innerHTML='';
  const st=doorStep==='issue'?' off':doorStep==='detected'?' ok':doorStep==='noissue'?'':' open';
  const nCells=BANK.cols[o.c-1]||10;
  for(let i=1;i<=nCells;i++){const c=document.createElement('div');
    c.className='cell'+(i===o.s?st+(doorStep==='place'?' tap':''):'');
    c.innerHTML=`<i class="${i%2?'l':'r'}">${i}</i>`;
    if(i===o.s&&doorStep==='place')c.onclick=()=>setDoor('detected');
    col.appendChild(c);}
  const d=$('dside');const sensor=o.type==='sensor';
  const S=doorStep;
  if(S==='issue'){
    const steps=sensor?['e1','e2','e3','s4']:['s1','s2','s3','s4'];
    d.innerHTML=`<span class="bang big">!</span><h3>${t(sensor?'sensorTitle':'doorTitle')}</h3><h4>${tf('doorSub',{c:o.c,s:o.s})}</h4>
      <div class="steps">${steps.map(k=>`<span>${t(k)}</span>`).join('')}</div>
      <div class="drow"><button class="ghost" id="dSkip">${t('skip')}</button><button class="soft" id="dFix">${t('fixed')}</button><button class="primary" id="dOpen">${t('openDoor')}</button></div>`;
    on('dSkip',()=>{offline.push(offline.shift());if(offline.length>1)setDoor('issue');else{techView='ts';drawTech();go('ts');}});
    on('dFix',()=>setDoor('noissue'));
    on('dOpen',()=>setDoor('opening'));
  }else if(S==='opening'){
    d.innerHTML=`<h3>${t('opening')}</h3><div class="bar2"><b id="ob"></b></div>`;
    requestAnimationFrame(()=>requestAnimationFrame(()=>{const b=$('ob');if(b)b.style.width='100%';}));
  }else if(S==='ask'){
    d.innerHTML=`<h3>${t('isPkg')}</h3><div class="drow"><button class="soft" id="dNo">${t('no')}</button><button class="primary" id="dYes">${t('yes')}</button></div>`;
    on('dNo',()=>setDoor('empty'));on('dYes',()=>setDoor('remove'));
  }else if(S==='remove'){
    d.innerHTML=`<h3>${t('removePkg')}</h3><div class="drow"><button class="primary" id="dDone">${t('done')}</button></div>`;
    on('dDone',()=>setDoor('empty'));
  }else if(S==='empty'){
    d.innerHTML=`<h3>${t('empty')}</h3><p class="dp">${t('emptySub')}</p><div class="drow"><button class="primary" id="dCont">${t('cont')}</button></div>`;
    on('dCont',()=>setDoor('place'));
  }else if(S==='place'){
    d.innerHTML=`<h3>${t('place')}</h3><p class="hint">${t('placeHint')}</p>`;
  }else if(S==='detected'){
    d.innerHTML=`<span class="okdot">&#10003;</span><h3>${t('detected')}</h3><p class="dp">${t('detectedSub')}</p><div class="drow"><button class="soft" id="dRe">${t('openDoor')}</button><button class="primary" id="dCont">${t('cont')}</button></div>`;
    on('dRe',()=>setDoor('opening'));on('dCont',()=>setDoor('noissue'));
  }else if(S==='noissue'){
    d.innerHTML=`<span class="okdot">&#10003;</span><h3>${t('noIssue')}</h3>`;
  }
}

/* part tests */
let colN=0;
function setPs(s){
  tok++;ps=s;
  if(curPart==='tKey'&&s==='nums'){kpField='';}
  if(curPart==='tKey')kpFlag={};
  if(curPart==='tNet'&&s==='run')later(1700,()=>setPs('pass'));
  if(curPart==='tCol'&&s==='run'){colN=1;const step=()=>{drawPart();if(colN<12){later(260,()=>{colN++;step();});}else later(400,()=>setPs('pass'));};drawPart();later(260,step);return;}
  if(curPart==='tCam'&&s==='intro'){ps='run';drawPart();later(1600,()=>setPs(Math.random()<.4?'bad':'pass'));return;}
  if(curPart==='tAud'&&s==='intro')speak(t('welcome'));
  if(curPart==='tSpk'&&s==='run'){drawPart();const my=tok;speak(t('spkMsg'),()=>{if(my===tok)setPs('pass');});return;}
  drawPart();
}
function drawPart(){
  const B=$('partBody');if(!curPart||!B)return;
  const okv=k=>`<span class="okdot">&#10003;</span><h3>${t(k)}</h3><button class="ghost" id="pBack">${t('back')}</button>`;
  const badv=(k,steps)=>`<span class="bang big">!</span><h3>${t(k)}</h3><div class="steps">${steps.map(s=>`<span>${t(s)}</span>`).join('')}</div><button class="soft" id="pRetry">${t('retry')}</button>`;
  const prog=h=>`<h3>${h}</h3><div class="bar2"><b id="pb"></b></div>`;
  const field=()=>`<div class="tin${kpField?'':' empty'}">${kpField||t('eg')}</div>`;
  const btn=(id,k,cls,dis)=>`<button class="${cls||'primary'}" id="${id}"${dis?' disabled':''}>${t(k)}</button>`;
  let h='';const P=curPart,S=ps;
  if(P==='tKey'){
    if(S==='intro')h=`<h3>${t('kIntro')}</h3>`+btn('pGo','cont');
    else if(S==='nums')h=`<h3>${t('kNums')}</h3><p>${t('kNumsSub')}</p>${field()}<p>${t('kAll')}</p><div class="drow">${btn('pNo','no','soft')}${btn('pYes','yes')}</div>`;
    else if(S==='clear')h=`<h3>${t('kClear')}</h3><p>${t('kClearSub')}</p>${field()}`+btn('pGo','kClearBtn','soft',!kpFlag.clear);
    else if(S==='cancel')h=`<h3>${t('kCancel')}</h3>${field()}`+btn('pGo','kCancelBtn','soft',!kpFlag.cancel);
    else if(S==='vol')h=`<h3>${t('kVol')}</h3>`+btn('pGo','kVolBtn','soft',!kpFlag.vol);
    else if(S==='enter')h=`<h3>${t('kEnter')}</h3><p>${t('kEnterSub')}</p>`+btn('pGo','kEnterBtn','soft',!kpFlag.enter);
    else if(S==='pass')h=okv('kOk');
    else if(S==='bad')h=badv('kBad',['k1','k2','k3','s4']);
  }else if(P==='tNet'){
    if(S==='intro')h=`<span class="okdot">&#10003;</span><h3>${t('netOk')}</h3><div class="steps">${['n1','n2','n3','s4'].map(k=>`<span>${t(k)}</span>`).join('')}</div><p>${t('netNote')}</p>`+btn('pGo','testNet');
    else if(S==='run')h=prog(t('testing'));
    else h=okv('netPass');
  }else if(P==='tCol'){
    if(S==='intro')h=`<h3>${t('colIntro')}</h3><button class="primary" id="pGo">${tf('colConnect',{c:1})}</button>`;
    else if(S==='run')h=`<h3>${tf('colTesting',{c:colN})}</h3><div class="bar2"><b style="width:${colN/12*100}%;transition:width .2s"></b></div>`;
    else h=`<span class="okdot">&#10003;</span><h3>${tf('colPass',{n:12})}</h3><button class="ghost" id="pBack">${t('back')}</button>`;
  }else if(P==='tCam'){
    if(S==='run')h=prog(t('camTesting'));
    else if(S==='bad')h=badv('camBad',['c1','c2','c3','s4']);
    else h=okv('camOk');
  }else if(P==='tAud'){
    if(S==='intro')h=`<h3>${t('audQ')}</h3><p>${t('audSub')}</p><div class="drow">${btn('pNo','no','soft')}${btn('pYes','yes')}</div>`;
    else if(S==='bad')h=badv('audBad',['a1','a2','a3','s4']);
    else h=okv('audOk');
  }else if(P==='tSpk'){
    if(S==='intro')h=`<h3>${t('spkIntro')}</h3>`+btn('pGo','play');
    else if(S==='run')h=prog(t('play'));
    else h=okv('spkOk');
  }else if(P==='tScan'){
    if(S==='intro')h=`<h3>${t('scnIntro')}</h3><p class="hint">${t('scnSub')}</p>`;
    else h=okv('scnOk');
  }
  B.innerHTML=h;
  const b=$('pb');if(b)requestAnimationFrame(()=>requestAnimationFrame(()=>{b.style.width='100%';}));
  on('pBack',()=>{tok++;techView='ts';drawTech();go('ts');});
  on('pRetry',()=>setPs('intro'));
  const next={intro:'nums',clear:'cancel',cancel:'vol',vol:'enter',enter:'pass'};
  on('pGo',()=>{
    if(P==='tKey')setPs(next[S]);
    else if(P==='tNet'||P==='tCol'||P==='tSpk')setPs('run');
  });
  on('pYes',()=>setPs(P==='tKey'?'clear':'pass'));
  on('pNo',()=>setPs('bad'));
}

/* physical keypad and scanner window */
const PK=[['1','2','3','enter'],['4','5','6','clear'],['7','8','9','cancel'],['vol','0','','']];
const pkp=$('pkp');
PK.flat().forEach(k=>{
  const b=document.createElement('button');
  if(!k){b.className='pk blank';b.disabled=true;b.setAttribute('aria-hidden','true');pkp.appendChild(b);return;}
  b.className='pk'+(k.length>1?' fn '+k:'');b.dataset.k=k;
  b.innerHTML=k==='vol'?'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 8c1.5 1.5 1.5 6.5 0 8M18.5 5.5c3 3 3 10 0 13" stroke="currentColor" stroke-width="1.6" fill="none"/></svg>':k.length>1?`<span>${k.toUpperCase()}</span>`:k;
  b.setAttribute('aria-label',k);
  b.addEventListener('click',()=>physKey(k));
  pkp.appendChild(b);
});
function physKey(k){
  beep(k==='vol'?660:k==='enter'?1040:880);
  if(curView==='part'&&curPart==='tKey'){
    if(/^\d$/.test(k)){if(ps==='nums'||ps==='clear')kpField=(kpField+k).slice(-12);}
    else if(k==='clear'){kpField='';if(ps==='clear')kpFlag.clear=true;}
    else if(ps===k)kpFlag[k]=true;
    drawPart();return;
  }
  if(curView==='entry'){
    if(/^\d$/.test(k)){msg='';if(mode==='code'){if(val.length<6){val+=k;if(val.length===6)setTimeout(check,250);}}else if(val.length<22)val+=k;drawEntry();}
    else if(k==='clear'){val='';msg='';drawEntry();}
    else if(k==='cancel')go('attract');
    else if(k==='enter'&&mode==='track'){if(val.length<8){msg=t('needT');drawEntry();}else check();}
    return;
  }
  if(k==='cancel'&&curView==='scan')go('attract');
}
document.querySelector('.scanner').addEventListener('click',()=>{
  const lamp=$('lamp');lamp.classList.add('lit');beep(1200);
  setTimeout(()=>{lamp.classList.remove('lit');
    if(curView==='scan')openLocker();
    else if(curView==='part'&&curPart==='tScan'&&ps==='intro')setPs('pass');
  },500);
});

function drawInfo(){
  const now=new Date();
  $('info').innerHTML=`<span>${t('iName')}</span><span>Unit xxxx</span><span>${t('iCols')}</span><span>${BANK.cols.length||12}</span><span>${t('iSlots')}</span><span>${BANK.total||120}</span><span>${t('iVer')}</span><span>4.2.0</span><span>${t('iUp')}</span><span>${now.toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})}</span>`;
}

/* result */
let rTimer;
function openLocker(){
  if(EMBED){document.getElementById('rnum').textContent='';toBank({type:'open'});}
  else document.getElementById('rnum').textContent=Math.floor(Math.random()*48)+1;
  go('result');clearTimeout(rTimer);rTimer=setTimeout(()=>go('attract'),8000);
}

/* language */
function buildLangs(){
  const box=document.getElementById('langs');box.innerHTML='';
  Object.keys(T).forEach(code=>{const b=document.createElement('button');b.textContent=T[code].name;b.className=code===lang?'on':'';
    b.addEventListener('click',()=>{lang=code;paint();closeModals();});box.appendChild(b);});
}

/* help */
function buildHelp(){
  const list=document.getElementById('helpList');list.innerHTML='';
  const add=(g,items)=>{const h=document.createElement('div');h.className='group';h.textContent=t(g);list.appendChild(h);
    items.forEach(n=>{const r=document.createElement('button');r.className='row';r.innerHTML=`<span>${t('h'+n)}</span><span aria-hidden="true">&#8250;</span>`;
      r.addEventListener('click',()=>showDetail(n));list.appendChild(r);});};
  add('gCust',[1,2,3,4]);add('gCarr',[5,6]);
}
function showDetail(n){
  document.getElementById('dTitle').textContent=t('h'+n);
  document.getElementById('dBody').textContent=t('b'+n);
  document.getElementById('dBody2').textContent=t('b'+n+'b');
  document.getElementById('qr').hidden=n!==1;
  modal('detailModal');
}

/* decorative square code */
(function(){
  const c=document.getElementById('qr').getContext('2d');c.fillStyle='#fff';c.fillRect(0,0,25,25);c.fillStyle='#16202a';
  for(let y=0;y<25;y++)for(let x=0;x<25;x++)if(Math.random()<.5)c.fillRect(x,y,1,1);
  [[0,0],[18,0],[0,18]].forEach(([x,y])=>{c.fillStyle='#16202a';c.fillRect(x,y,7,7);c.fillStyle='#fff';c.fillRect(x+1,y+1,5,5);c.fillStyle='#16202a';c.fillRect(x+2,y+2,3,3);
    c.fillStyle='#fff';if(x===0&&y===0){c.fillRect(7,0,1,8);c.fillRect(0,7,8,1);}if(x===18){c.fillRect(17,0,1,8);c.fillRect(17,7,8,1);}if(y===18){c.fillRect(7,17,1,8);c.fillRect(0,17,8,1);}});
})();

/* idle back to start */
let idle;
['click','keydown'].forEach(ev=>document.addEventListener(ev,()=>{clearTimeout(idle);idle=setTimeout(()=>go('attract'),45000);}));

paint();
