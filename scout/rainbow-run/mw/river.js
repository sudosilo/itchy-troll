VZ.load(P=>{
const {h32,MOTION}=VZ;
const cv=document.getElementById('cv'),ctx=VZ.wire(cv.getContext('2d'));
const RIDE={tanker:'Party raft, one of the biggest',battle:'Canoe, big and fast',cargo:'Family raft, big and steady',tug:'Inner tube, small and nimble',speed:'Wakeboard, small and quick',sail:'Lazy tube, light and easy'};
const SPD=d=>d==null?0.6:d<7?1:d<30?0.85:d<60?0.7:d<90?0.55:0.4;
let W,H,DPR,T,foam=[],splash=[],rocks=[],trees=[];
const riders=P.map(p=>({p,seed:h32(p.name,500)*6,lane:h32(p.name,501)*1.6-0.8,v:SPD(p.days)*(p.kind==='speed'?1.5:1),y:0,swim:0,next:4+h32(p.name,502)*30}));
document.getElementById('count').textContent=riders.length+' floating, '+riders.filter(r=>r.p.kind==='speed').length+' on wakeboards';
const cx=(y,t)=>W/2+W*0.16*Math.sin(y*0.006+0.8)+W*0.06*Math.sin(y*0.017);
const hw=y=>W*(0.3+0.06*Math.sin(y*0.011+2));
const rapid=y=>{const k=((y/H)%1+1)%1;return (k>0.28&&k<0.4)||(k>0.7&&k<0.8);};
function resize(){DPR=Math.min(devicePixelRatio||1,2);W=innerWidth;H=innerHeight;cv.width=W*DPR;cv.height=H*DPR;T=Math.max(0.85,Math.min(1.4,Math.min(W,H)/380));
  riders.forEach((r,i)=>{r.y=H*(i/riders.length)*1.2-H*0.1;});
  foam=[...Array(140)].map(()=>({u:Math.random()*2-1,y:Math.random()*H,l:(8+Math.random()*16)*T}));
  rocks=[...Array(12)].map((_,i)=>{const y=H*(i<6?0.3+0.017*i:0.71+0.015*(i-6));return {y,u:(Math.random()*1.6-0.8),r:(4+Math.random()*6)*T};});
  trees=[...Array(40)].map((_,i)=>({side:i%2?1:-1,y:Math.random()*H,r:(10+Math.random()*12)*T,g:Math.random()}));}
function banks(t){
  ctx.fillStyle='#cfe3b5';ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#e9dcbc';ctx.beginPath();for(let y=0;y<=H;y+=8)ctx.lineTo(cx(y,t)-hw(y)-10*T,y);for(let y=H;y>=0;y-=8)ctx.lineTo(cx(y,t)+hw(y)+10*T,y);ctx.fill();
  const g=ctx.createLinearGradient(0,0,W,0);g.addColorStop(0,'#5ba7c6');g.addColorStop(0.5,'#78bdd6');g.addColorStop(1,'#5ba7c6');
  ctx.fillStyle=g;ctx.beginPath();for(let y=0;y<=H;y+=8)ctx.lineTo(cx(y,t)-hw(y),y);for(let y=H;y>=0;y-=8)ctx.lineTo(cx(y,t)+hw(y),y);ctx.fill();
  for(const tr of trees){const x=cx(tr.y,t)+tr.side*(hw(tr.y)+tr.r+18*T+tr.g*40*T);ctx.fillStyle=tr.g>0.5?'#6fa25a':'#5d8f4c';ctx.beginPath();ctx.arc(x,tr.y,tr.r,0,6.283);ctx.fill();ctx.fillStyle='rgba(255,255,255,.18)';ctx.beginPath();ctx.arc(x-tr.r*0.3,tr.y-tr.r*0.3,tr.r*0.45,0,6.283);ctx.fill();}
}
function water(t,dt){
  ctx.strokeStyle='rgba(255,255,255,.5)';ctx.lineCap='round';
  for(const f of foam){const sp=rapid(f.y)?150:60;f.y+=sp*T*dt;if(f.y>H+20)f.y=-20;const x=cx(f.y,t)+f.u*hw(f.y)*0.9;ctx.lineWidth=rapid(f.y)?2:1;ctx.beginPath();ctx.moveTo(x,f.y);ctx.lineTo(x+Math.sin(f.y*0.05)*3,f.y+f.l*(rapid(f.y)?0.6:1));ctx.stroke();}
  for(const r of rocks){const x=cx(r.y,t)+r.u*hw(r.y);ctx.fillStyle='rgba(255,255,255,.7)';ctx.beginPath();ctx.ellipse(x,r.y+r.r*0.6,r.r*1.6,r.r*0.9,0,0,6.283);ctx.fill();ctx.fillStyle='#8d8a80';ctx.beginPath();ctx.ellipse(x,r.y,r.r,r.r*0.75,0.3,0,6.283);ctx.fill();}
}
function person(x,y,s,t,ph,arms,col){
  ctx.fillStyle='#e8b48c';ctx.strokeStyle='#e8b48c';ctx.lineWidth=2*s;ctx.lineCap='round';
  if(arms){const a=Math.sin(t*6+ph)*0.6;ctx.beginPath();ctx.moveTo(x-3*s,y);ctx.lineTo(x-8*s,y-4*s-a*4*s);ctx.moveTo(x+3*s,y);ctx.lineTo(x+8*s,y-4*s+a*4*s);ctx.stroke();}
  ctx.fillStyle=col||'#2b2420';ctx.beginPath();ctx.ellipse(x,y+1*s,3.2*s,4*s,0,0,6.283);ctx.fill();
  ctx.fillStyle='#e8b48c';ctx.beginPath();ctx.arc(x,y-3.5*s,2.6*s,0,6.283);ctx.fill();
  ctx.fillStyle='#3a2a1e';ctx.beginPath();ctx.arc(x,y-4.2*s,2.6*s,3.3,6.1);ctx.fill();
}
function craft(r,x,y,s,t){
  const k=r.p.kind,c=r.p.color,ph=r.seed,spin=Math.sin(t*0.7+ph)*0.6;
  ctx.save();ctx.translate(x,y);
  if(k==='tanker'||k==='cargo'){const L=(k==='tanker'?30:24)*s,Wd=(k==='tanker'?18:15)*s;ctx.rotate(spin*0.3);
    ctx.fillStyle=c;ctx.beginPath();ctx.ellipse(0,0,Wd,L/2+4*s,0,0,6.283);ctx.fill();ctx.fillStyle='rgba(255,255,255,.3)';ctx.beginPath();ctx.ellipse(0,0,Wd*0.7,L/2-2*s,0,0,6.283);ctx.fill();
    const n=k==='tanker'?4:3;for(let i=0;i<n;i++)person((i%2?1:-1)*Wd*0.35,-L/2+L*(i+0.5)/n,s*0.95,t,ph+i,i===0,'#ffffff');}
  else if(k==='battle'){ctx.rotate(spin*0.15);ctx.fillStyle=c;ctx.beginPath();ctx.ellipse(0,0,6*s,22*s,0,0,6.283);ctx.fill();ctx.fillStyle='rgba(0,0,0,.18)';ctx.beginPath();ctx.ellipse(0,0,3.5*s,17*s,0,0,6.283);ctx.fill();
    for(const yy of [-8,7]){person(0,yy*s,s*0.9,t,ph+yy,false,'#ffffff');}const pa=Math.sin(t*4+ph);ctx.strokeStyle='#8a6a40';ctx.lineWidth=1.5*s;ctx.beginPath();ctx.moveTo(-12*s,-8*s+pa*4*s);ctx.lineTo(12*s,-8*s-pa*4*s);ctx.stroke();}
  else if(k==='speed'){ctx.strokeStyle='rgba(255,255,255,.7)';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(-10*s,-26*s);ctx.lineTo(-2*s,-8*s);ctx.moveTo(10*s,-26*s);ctx.lineTo(2*s,-8*s);ctx.stroke();
    ctx.rotate(Math.sin(t*2+ph)*0.25);ctx.fillStyle=c;ctx.beginPath();ctx.ellipse(0,0,3.5*s,11*s,0,0,6.283);ctx.fill();person(0,0,s,t,ph,true,'#ffffff');}
  else{const R=(k==='tug'?9:8)*s;ctx.rotate(t*0.4+ph);ctx.fillStyle=c;ctx.beginPath();ctx.arc(0,0,R,0,6.283);ctx.arc(0,0,R*0.45,0,6.283,true);ctx.fill();ctx.fillStyle='rgba(255,255,255,.35)';ctx.beginPath();ctx.arc(-R*0.35,-R*0.35,R*0.25,0,6.283);ctx.fill();
    ctx.rotate(-(t*0.4+ph));person(0,0,s,t,ph,k==='tug','#2f6fd6');}
  ctx.restore();
}
let last=performance.now();
function frame(now){
  const dt=Math.min(0.05,(now-last)/1000)*MOTION,t=now/1000;last=now;
  ctx.setTransform(DPR,0,0,DPR,0,0);ctx.bg('#eef7f9',W,H);banks(t);water(t,dt);
  for(const r of riders){
    const fast=rapid(r.y)?1.8:1;r.y+=(30+40*r.v)*T*fast*dt;
    if(r.y>H+40*T){r.y=-40*T-Math.random()*H*0.4;r.swim=0;}
    r.next-=dt;if(r.next<=0&&rapid(r.y)&&!r.swim){r.swim=2.2;r.dx=(Math.random()<0.5?-1:1)*14*T;for(let i=0;i<8;i++)splash.push({x:0,y:0,ref:r,a:i*0.8,life:1});r.next=15+Math.random()*30;}
    const s=T*(0.9+0.15*r.p.sizeF),u=r.lane+0.15*Math.sin(t*0.5+r.seed),x=cx(r.y,t)+u*hw(r.y)*0.75,y=r.y;
    r._x=x;r._y=y;r._r=16*s;
    if(r.swim>0){r.swim-=dt;const k=Math.min(1,r.swim/2.2),off=r.dx*(1-Math.abs(k*2-1))*1.6;
      const save=r.p.kind;craftEmpty(r,x,y,s,t);person(x+off,y+8*s,s,t,r.seed,true,'#2f6fd6');
      ctx.strokeStyle='rgba(255,255,255,.8)';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(x+off,y+9*s,7*s,3*s,0,0,6.283);ctx.stroke();}
    else craft(r,x,y,s,t);
  }
  for(const sp of splash){sp.life-=dt*1.6;const r=sp.ref;const R=(1-sp.life)*22*T;ctx.fillStyle='rgba(255,255,255,'+Math.max(0,sp.life)+')';ctx.beginPath();ctx.arc(r._x+Math.cos(sp.a)*R,r._y+Math.sin(sp.a)*R,2*T,0,6.283);ctx.fill();}
  splash=splash.filter(s=>s.life>0);
  const sel=VZ.sel;if(sel&&sel.ref)VZ.selRing(ctx,sel.ref._x,sel.ref._y,Math.max(14,sel.ref._r));
  requestAnimationFrame(frame);
}
function craftEmpty(r,x,y,s,t){ctx.save();ctx.translate(x,y);ctx.fillStyle=r.p.color;const k=r.p.kind;
  if(k==='tanker'||k==='cargo'){ctx.beginPath();ctx.ellipse(0,0,15*s,15*s,0,0,6.283);ctx.fill();}
  else if(k==='battle'){ctx.rotate(t);ctx.beginPath();ctx.ellipse(0,0,6*s,22*s,0,0,6.283);ctx.fill();}
  else if(k==='speed'){ctx.rotate(t*3);ctx.beginPath();ctx.ellipse(0,0,3.5*s,11*s,0,0,6.283);ctx.fill();}
  else{ctx.beginPath();ctx.arc(0,0,9*s,0,6.283);ctx.arc(0,0,4*s,0,6.283,true);ctx.fill();}
  ctx.restore();}
cv.addEventListener('pointerdown',e=>{let best=null,bd=1e9;const X=e.clientX,Y=e.clientY;
  for(const r of riders){if(r._x==null)continue;const d=Math.hypot(X-r._x,Y-r._y);if(d<Math.max(r._r,16)&&d<bd){bd=d;best=r;}}
  if(best){const p=best.p;VZ.open({ref:best,title:p.name,kind:RIDE[p.kind].split(',')[0]+VZ.sizeText(p),age:VZ.ageText(p),host:p.host});}else VZ.close();});
addEventListener('resize',resize);resize();requestAnimationFrame(frame);
});
