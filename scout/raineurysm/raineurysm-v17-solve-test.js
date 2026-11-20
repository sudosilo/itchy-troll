// raineurysm puzzle solve test: plays every puzzle level headless with a known layout and checks it wins.
// Run: node raineurysm-v17-solve-test.js raineurysm-v17.html
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.resolve(process.argv[2] || 'raineurysm-v17.html'), 'utf8');
let js = html.match(/<script>([\s\S]*?)<\/script>/g).pop().replace(/^<script>|<\/script>$/g, '');
const hook = '  machineSetup();\n  restoreMachine();';
if (js.indexOf(hook) < 0) { console.log('FAIL could not find the setup hook'); process.exit(1); }
js = js.replace(hook, '  global.__R = { loadLevel: i => loadLevel(i), add: (t, x, y, w, a) => { const c = addCup(x * W, y * H, w * W, t); c.a = a || 0; return c; }, setMode: m => setMode(m), won: () => levelWon, count: () => LEVELS.length };\n' + hook);
let T=0;const raf=[];
function mkEl(id){const e={id,value:'0',style:{},dataset:{},kids:[],textContent:'',href:'',options:[],
 classList:{s:new Set(),add(c){this.s.add(c)},remove(c){this.s.delete(c)},toggle(c,f){if(f===undefined)f=!this.s.has(c);f?this.s.add(c):this.s.delete(c);return f},contains(c){return this.s.has(c)}},
 addEventListener(t,f){(this.l=this.l||{})[t]=f},appendChild(c){this.kids.push(c);return c},focus(){},blur(){},click(){this.onclick&&this.onclick()},
 getBoundingClientRect(){return{left:0,top:0,right:60,bottom:60,width:400,height:800}},getContext:()=>ctx};
 e.previousElementSibling={textContent:'Width'};return e;}
const ctx=new Proxy({},{get:(t,k)=>k==='createLinearGradient'?()=>({addColorStop(){}}):k==='measureText'?()=>({width:20}):(t[k]!==undefined?t[k]:()=>{}),set:(t,k,v)=>{t[k]=v;return true}});
const els={};const el=id=>els[id]||(els[id]=mkEl(id));
global.document={getElementById:el,createElement:()=>mkEl(),querySelectorAll:()=>[],addEventListener(){},visibilityState:'visible',body:mkEl('body'),documentElement:mkEl('html')};
global.window={innerWidth:400,innerHeight:800,devicePixelRatio:1,addEventListener(){}};
const store={};global.localStorage={getItem:k=>k in store?store[k]:null,setItem:(k,v)=>{store[k]=String(v)}};
global.location={search:'',protocol:'file:'};
global.performance={now:()=>T,timeOrigin:Date.now()};window.performance=global.performance;
global.requestAnimationFrame=f=>raf.push(f);
const P=()=>({value:0,setValueAtTime(){},exponentialRampToValueAtTime(){},cancelScheduledValues(){}});
const node=()=>new Proxy({},{get:(t,k)=>{if(k in t)return t[k];if(['gain','frequency','Q','delayTime','threshold','ratio','attack','release','pan'].includes(k))return t[k]=P();if(k==='stream')return {};return ()=>{}},set:(t,k,v)=>{t[k]=v;return true}});
window.AudioContext=function(){return new Proxy({currentTime:0,sampleRate:100,state:'running'},{get:(t,k)=>k in t?t[k]:(k==='createBuffer'?()=>({getChannelData:()=>new Float32Array(100)}):()=>node())})};
global.setTimeout=()=>0;global.setInterval=()=>0;global.clearTimeout=()=>{};global.clearInterval=()=>{};
global.WebSocket=function(){this.readyState=0};WebSocket.prototype.send=()=>{};WebSocket.prototype.close=()=>{};

new Function('global', 'window', 'document', 'localStorage', 'location', 'performance', 'requestAnimationFrame', 'WebSocket', js)(global, window, document, localStorage, location, performance, requestAnimationFrame, WebSocket);
const step = n => { for (let i = 0; i < n; i++){ T += 16; raf.shift()(T); } };
const R = global.__R;
// a known working layout for each level: part, x, y, width as fractions of the screen, tilt in radians
const SOLUTIONS = [
  [['trough', .4, .4, .5, .08], ['funnel', .72, .66, .45, 0]],
  [['trough', .3, .4, .4, .08], ['trough', .7, .45, .4, -.08], ['funnel', .5, .68, .55, 0]],
  [['trough', .86, .33, .26, .25], ['trough', .35, .45, .55, .08], ['funnel', .74, .68, .3, 0]],
  [['funnel', .25, .62, .48, 0], ['funnel', .78, .62, .44, 0]],
  [['trough', .3, .4, .45, .06], ['trough', .7, .4, .45, -.06], ['funnel', .5, .66, .62, 0]],
  [['trough', .32, .4, .42, .08], ['trough', .68, .45, .42, -.08], ['funnel', .5, .68, .55, 0]],
  [['trough', .7, .36, .5, -.06], ['trough', .4, .48, .45, -.05], ['funnel', .12, .68, .24, 0]],
  [['trough', .25, .3, .14, .3], ['funnel', .2, .68, .35, 0]],
  [['funnel', .33, .7, .5, 0], ['trough', .75, .62, .4, -.1]],
  [['funnel', .18, .68, .36, 0], ['funnel', .82, .68, .36, 0], ['trough', .42, .5, .16, -.3], ['trough', .58, .5, .16, .3]],
  [['funnel', .2, .66, .4, 0], ['funnel', .8, .66, .4, 0]],
  [['trough', .25, .38, .45, .07], ['trough', .75, .42, .45, -.07], ['funnel', .5, .66, .55, 0]],
  [['trough', .77, .32, .16, .3], ['trough', .42, .58, .5, .03], ['funnel', .7, .7, .4, 0]],
  [['trough', .5, .27, .3, -.12], ['trough', .22, .5, .3, .06], ['funnel', .35, .68, .45, 0]],
  [['trough', .25, .56, .45, .05], ['trough', .75, .58, .45, -.05], ['funnel', .5, .72, .5, 0]],
  [['trough', .32, .4, .36, .07], ['trough', .7, .42, .36, -.07], ['funnel', .5, .68, .55, 0]],
  [['funnel', .5, .72, .5, 0], ['trough', .2, .35, .4, .12], ['trough', .8, .35, .4, -.12], ['trough', .12, .7, .24, .1], ['trough', .88, .7, .24, -.1]],
  [['trough', .22, .3, .35, .06], ['trough', .78, .3, .35, -.06], ['funnel', .5, .7, .5, 0]],
  [['trough', .62, .34, .6, -.04], ['funnel', .24, .66, .44, 0]],
  [['funnel', .18, .68, .36, 0], ['funnel', .82, .68, .36, 0], ['trough', .42, .5, .16, -.3], ['trough', .58, .5, .16, .3]],
  [['funnel', .14, .66, .34, 0], ['funnel', .86, .66, .34, 0], ['funnel', .5, .4, .16, 0]],
  [['cup', .5, .3, .1, 0], ['trough', .37, .38, .22, -.12], ['trough', .63, .38, .22, .12], ['funnel', .2, .68, .36, 0], ['funnel', .8, .68, .36, 0]],
  [['trough', .5, .25, .86, .03], ['funnel', .97, .29, .1, 0], ['trough', .58, .42, .58, -.035], ['funnel', .22, .68, .44, 0], ['funnel', .8, .68, .42, 0]],
  [['trough', .26, .38, .46, .06], ['trough', .74, .42, .46, -.06], ['funnel', .5, .66, .55, 0]]
];
R.setMode('puzzle'); step(5);
let bad = 0;
if (SOLUTIONS.length !== R.count()) { console.log('FAIL there are ' + R.count() + ' levels and ' + SOLUTIONS.length + ' known layouts'); bad++; }
SOLUTIONS.forEach((parts, i) => {
  R.loadLevel(i); step(2);
  parts.forEach(p => R.add(p[0], p[1], p[2], p[3], p[4]));
  let t = 0; while (!R.won() && t < 6000){ step(60); t += 60; }
  if (R.won()) console.log('PASS level ' + (i + 1) + ' solved in ' + Math.round(t * 16 / 1000) + ' seconds of game time');
  else { console.log('FAIL level ' + (i + 1) + ' was not solved'); bad++; }
});
console.log(bad ? 'FAILED' : 'all levels passed');
process.exit(bad ? 1 : 0);
