(function(){
const AGE=[[7,'#1e9e3e'],[30,'#c49a00'],[60,'#e07800'],[90,'#d93636'],[1e9,'#8c8c8c']];
const INK='#123a4a',MUTED='#4f6f7c';
const MOTION=matchMedia('(prefers-reduced-motion: reduce)').matches?0.35:1;
function h32(str,seed){let h=(2166136261^seed)>>>0;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619);}h^=h>>>13;h=Math.imul(h,0x5bd1e995);h^=h>>>15;return (h>>>0)/4294967296;}
function classify(s,v,a){if(s>0.62)return v>0.5?'battle':'cargo';if(a>0.68)return 'tug';if(v>0.55)return 'speed';return 'sail';}
function build(RAW,DATES,REAL){
  const now=Date.now();
  return RAW.trim().split('\n').map(line=>{
    const [name,sub]=line.split('|');
    const size=h32(name,1),speed=h32(name,2),agility=h32(name,3),kb=REAL[name]||0;
    const kind=kb>=5000?'tanker':kb>=1000?(speed>0.5?'battle':'cargo'):classify(size,speed,agility);
    const days=DATES[name]?Math.floor((now-new Date(DATES[name]).getTime())/86400000):null;
    const color=days==null?INK:AGE.find(a=>days<a[0])[1];
    return {name,host:(sub==='='?name:sub)+'.vercel.app',kind,kb,days,color,speed,agility,
      old:days!=null&&days>=90,railway:name==='blue-agent'||name==='2026-10-18-orange-testbed',
      sizeF:kb?Math.min(1.5,0.9+0.12*Math.log2(kb/1000)):0.82+0.36*h32(name,4)};
  });
}
function load(cb0){
  const cb=list=>(window.ITCH||Promise.resolve()).then(()=>cb0(window.itchApply?window.itchApply(list):list));
  if(window.FLEET_DATA){const d=window.FLEET_DATA;cb(build(d.RAW,d.DATES,d.REAL));return;}
  fetch('fleet.html').then(r=>r.text()).then(src=>{
    const RAW=src.split('const RAW=`')[1].split('`;')[0];
    const DATES=JSON.parse(src.split('const DATES=')[1].split(';\nconst REAL')[0]);
    const REAL=JSON.parse(src.split('const REAL=')[1].split(';\n')[0].replace(/'/g,'"'));
    cb(build(RAW,DATES,REAL));
  });
}
function q(id){return document.getElementById(id);}
let sel=null;
function open(o){sel=o;q('bname').textContent=o.title;q('bkind').textContent=o.kind||'';q('bage').textContent=o.age||'';q('bhost').textContent=o.host||'';q('go').hidden=!o.host;q('sheet').classList.add('open');}
function close(){sel=null;q('sheet').classList.remove('open');}
q('go').addEventListener('click',()=>{if(sel&&sel.host)window.open('https://'+sel.host,'_blank','noopener');});
q('shut').addEventListener('click',close);
function ageText(p,prefix){return p.days==null?'No update date':(prefix||'')+'updated '+p.days+(p.days===1?' day ago':' days ago');}
function sizeText(p){return p.kb?', '+(p.kb/1024).toFixed(1)+' MB':'';}
function poly(c,p,col){c.beginPath();c.moveTo(p[0][0],p[0][1]);for(let i=1;i<p.length;i++)c.lineTo(p[i][0],p[i][1]);c.closePath();c.strokeStyle=col;c.stroke();}
function line(c,x1,y1,x2,y2,col){c.strokeStyle=col;c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();}
function box(c,x0,y0,x1,y1,col){poly(c,[[x0,y0],[x1,y0],[x1,y1],[x0,y1]],col);}
function ring(c,x,y,r,col){c.strokeStyle=col;c.beginPath();c.arc(x,y,r,0,6.283);c.stroke();}
function label(c,text,x,y,align,px){c.font='600 '+Math.round(px||11)+'px "Avenir Next","Segoe UI",Roboto,Helvetica,Arial,sans-serif';c.textAlign=align||'center';c.fillStyle=MUTED;c.fillText(text,x,y);}
function boat(c,kind,L,col,side){
  c.lineWidth=1.1;c.lineJoin='round';c.lineCap='round';
  if(kind==='cargo'||kind==='tanker'){const w=L*0.24;poly(c,[[L/2,0],[L*.36,-w/2],[-L/2,-w/2],[-L/2,w/2],[L*.36,w/2]],col);const x0=-L*.3,cw=L*.15;for(let i=0;i<4;i++)box(c,x0+i*cw+0.6,-w*.3,x0+(i+1)*cw-0.6,w*.3,col);}
  else if(kind==='tug'){const w=L*0.5;poly(c,[[L/2,0],[L*.36,-w*.42],[L*.1,-w/2],[-L*.36,-w/2],[-L/2,-w*.3],[-L/2,w*.3],[-L*.36,w/2],[L*.1,w/2],[L*.36,w*.42]],col);box(c,-L*.14,-w*.22,L*.18,w*.22,col);}
  else if(kind==='speed'||kind==='battle'){const w=L*0.34;poly(c,[[L/2,0],[L*.05,-w/2],[-L/2,-w*.42],[-L/2,w*.42],[L*.05,w/2]],col);}
  else{const w=L*0.28;poly(c,[[L/2,0],[L*.15,-w/2],[-L*.45,-w*.38],[-L/2,0],[-L*.45,w*.38],[L*.15,w/2]],col);poly(c,[[L*.12,0],[-L*.2,(side||1)*L*.32],[-L*.45,(side||1)*L*.22]],col);}
}
function selRing(c,x,y,r){c.strokeStyle=INK;c.lineWidth=2;c.setLineDash([5,4]);c.beginPath();c.arc(x,y,r,0,6.283);c.stroke();c.setLineDash([]);}

function wire(c){
  if(c._wired)return c;c._wired=1;
  const F=c.fill.bind(c),FR=c.fillRect.bind(c);
  function col(fs){
    if(typeof fs!=='string')return (typeof CanvasGradient!=='undefined'&&fs instanceof CanvasGradient)?null:fs;
    const t=fs.replace(/\s/g,'');let r,g,b,a=1,m;
    if((m=t.match(/^#([0-9a-f]{6})$/i))){const n=parseInt(m[1],16);r=n>>16&255;g=n>>8&255;b=n&255;}
    else if((m=t.match(/^#([0-9a-f]{3})$/i))){r=parseInt(m[1][0]+m[1][0],16);g=parseInt(m[1][1]+m[1][1],16);b=parseInt(m[1][2]+m[1][2],16);}
    else if((m=t.match(/^rgba?\(([\d.]+),([\d.]+),([\d.]+)(?:,([\d.]+))?\)$/))){r=+m[1];g=+m[2];b=+m[3];a=m[4]==null?1:+m[4];}
    else return fs;
    if(a<0.6)return null;
    if((0.299*r+0.587*g+0.114*b)/255>0.86)return MUTED;
    return fs;
  }
  c.fill=function(){const k=col(this.fillStyle);if(!k)return;this.save();this.strokeStyle=k;this.lineWidth=1.1;this.shadowBlur=0;this.stroke();this.restore();};
  c.fillRect=function(x,y,w,h){const k=col(this.fillStyle);if(!k)return;this.save();this.strokeStyle=k;this.lineWidth=1.1;this.strokeRect(x,y,w,h);this.restore();};
  c.bg=function(color,w,h){this.save();this.fillStyle=color;FR(0,0,w,h);this.restore();};
  return c;
}
window.VZ={wire,AGE,INK,MUTED,MOTION,h32,load,open,close,ageText,sizeText,poly,line,box,ring,label,boat,selRing,get sel(){return sel;}};
})();
(function(){if(!document.querySelector('script[src="viz-menu.js"]')){const s=document.createElement('script');s.src='viz-menu.js';document.head.appendChild(s);}})();
