VZ.load(P=>{
const {h32,MOTION}=VZ;
const cv=document.getElementById('cv'),ctx=VZ.wire(cv.getContext('2d'));
const DROP={tanker:'Cloudburst drop, one of the biggest',battle:'Storm drop, big and fast',cargo:'Heavy drop, big and steady',tug:'Sprinkle, small and nimble',speed:'Streak, small and quick',sail:'Mist drop, light and easy'};
const SZ={tanker:1.5,battle:1.2,cargo:1.25,tug:0.8,speed:0.85,sail:0.7};
const SPD=d=>d==null?0.6:d<7?1:d<30?0.85:d<60?0.7:d<90?0.55:0.4;
let W,H,DPR,T,HZ,ripples=[],mist=[];
const drops=P.map(p=>({p,seed:h32(p.name,400),sz:SZ[p.kind]*(0.85+0.2*p.sizeF),v:SPD(p.days)}));
document.getElementById('count').textContent=drops.length+' drops, '+drops.filter(d=>d.p.days!=null&&d.p.days<7).length+' pouring';
function spawn(d,first){d.x=W*(0.04+0.92*Math.random());d.depth=Math.random();d.land=HZ+(H-HZ)*(0.08+0.88*d.depth);d.y=first?-Math.random()*H:-20*T-Math.random()*H*0.5;d.vy=0;d.wob=Math.random()*6;}
function resize(){DPR=Math.min(devicePixelRatio||1,2);W=innerWidth;H=innerHeight;cv.width=W*DPR;cv.height=H*DPR;T=Math.max(0.85,Math.min(1.4,Math.min(W,H)/380));HZ=H*0.62;drops.forEach(d=>spawn(d,true));
  mist=[...Array(60)].map(()=>({x:Math.random()*W,y:Math.random()*HZ,l:(6+Math.random()*10)*T}));}
function scene(t){
  let g=ctx.createLinearGradient(0,0,0,HZ);g.addColorStop(0,'#c9d3dc');g.addColorStop(1,'#e8eef2');ctx.fillStyle=g;ctx.fillRect(0,0,W,HZ);
  ctx.fillStyle='rgba(255,255,255,.55)';
  for(let i=0;i<5;i++){const x=((i*W*0.31+t*6*T*(1+i*0.2))%(W+200))-100,y=H*(0.04+0.05*i),s=T*(1.2+0.3*(i%3));ctx.beginPath();ctx.ellipse(x,y,40*s,12*s,0,0,6.283);ctx.ellipse(x+26*s,y-8*s,24*s,14*s,0,0,6.283);ctx.ellipse(x-22*s,y-4*s,20*s,11*s,0,0,6.283);ctx.fill();}
  ctx.fillStyle='#b9c7a8';ctx.beginPath();ctx.moveTo(0,HZ);for(let x=0;x<=W;x+=10)ctx.lineTo(x,HZ-12*T-8*T*Math.sin(x*0.013+1)-5*T*Math.sin(x*0.031));ctx.lineTo(W,HZ);ctx.fill();
  g=ctx.createLinearGradient(0,HZ,0,H);g.addColorStop(0,'#cfdfe6');g.addColorStop(1,'#9fbfcd');ctx.fillStyle=g;ctx.fillRect(0,HZ,W,H-HZ);
  ctx.strokeStyle='rgba(255,255,255,.35)';ctx.lineWidth=1;
  for(let i=0;i<14;i++){const y=HZ+(H-HZ)*Math.pow(i/14,1.6)+2;ctx.beginPath();ctx.moveTo(0,y);for(let x=0;x<=W;x+=12)ctx.lineTo(x,y+Math.sin(x*0.02+t*0.8+i)*1.2*T*(1+i*0.1));ctx.stroke();}
  ctx.strokeStyle='rgba(120,140,155,.35)';ctx.lineWidth=1;
  for(const m of mist){m.y+=260*T*0.016*MOTION;if(m.y>HZ)m.y=-m.l;ctx.beginPath();ctx.moveTo(m.x,m.y);ctx.lineTo(m.x-m.l*0.15,m.y+m.l);ctx.stroke();}
}
function drop(d,s){
  const x=d.x,y=d.y,r=4.2*T*d.sz*s;
  ctx.fillStyle=d.p.color;ctx.beginPath();ctx.moveTo(x,y-r*2.4);ctx.bezierCurveTo(x+r*0.9,y-r*0.9,x+r,y+r*0.2,x,y+r);ctx.bezierCurveTo(x-r,y+r*0.2,x-r*0.9,y-r*0.9,x,y-r*2.4);ctx.fill();
  ctx.fillStyle='rgba(255,255,255,.55)';ctx.beginPath();ctx.ellipse(x-r*0.35,y-r*0.3,r*0.18,r*0.4,-0.3,0,6.283);ctx.fill();
  d._x=x;d._y=y-r*0.5;d._r=r*2;
}
let last=performance.now();
function frame(now){
  const dt=Math.min(0.05,(now-last)/1000)*MOTION,t=now/1000;last=now;
  ctx.setTransform(DPR,0,0,DPR,0,0);ctx.bg('#eef3f5',W,H);scene(t);
  for(const r of ripples){r.age+=dt;const k=r.age/r.dur;if(k>=1)continue;
    for(let i=0;i<3;i++){const kk=k-i*0.18;if(kk<=0)continue;const R=r.max*kk;ctx.globalAlpha=(1-kk)*0.9;ctx.strokeStyle=r.col;ctx.lineWidth=Math.max(0.8,2.2*T*r.s*(1-kk));ctx.beginPath();ctx.ellipse(r.x,r.y,R,R*0.32,0,0,6.283);ctx.stroke();}
    if(r.age<0.25){ctx.globalAlpha=1-r.age/0.25;ctx.fillStyle=r.col;for(let i=0;i<5;i++){const a=3.14+i*0.785,h=r.age*90*T*r.s;ctx.beginPath();ctx.arc(r.x+Math.cos(a)*h*0.6,r.y+Math.sin(a)*h-h*0.2,1.6*T*r.s,0,6.283);ctx.fill();}}
  }
  ctx.globalAlpha=1;ripples=ripples.filter(r=>r.age<r.dur);
  drops.sort((a,b)=>a.depth-b.depth);
  for(const d of drops){
    d.vy=Math.min(d.vy+900*T*dt,(220+260*d.v)*T*(0.6+0.4*d.depth));d.y+=d.vy*dt;d.x+=Math.sin(t*1.3+d.wob)*6*T*dt;
    const s=0.6+0.5*d.depth;
    if(d.y>=d.land){ripples.push({x:d.x,y:d.land,age:0,dur:1.6+d.sz*0.6,max:(18+16*d.sz)*T*s,col:d.p.color,s,ref:d});
      if(VZ.sel&&VZ.sel.ref===d)VZ.sel.ref=null;spawn(d,false);d.y-=Math.random()*H*0.3;continue;}
    drop(d,s);
  }
  const sel=VZ.sel;if(sel&&sel.ref&&sel.ref._x!=null)VZ.selRing(ctx,sel.ref._x,sel.ref._y,Math.max(12,sel.ref._r));
  requestAnimationFrame(frame);
}
cv.addEventListener('pointerdown',e=>{let best=null,bd=1e9;const X=e.clientX,Y=e.clientY;
  for(const d of drops){if(d._x==null||d.y<0)continue;const k=Math.hypot(X-d._x,Y-d._y);if(k<Math.max(d._r*1.5,18)&&k<bd){bd=k;best=d;}}
  if(!best)for(const r of ripples){const k=Math.hypot(X-r.x,(Y-r.y)*3);if(k<r.max&&k<bd){bd=k;best=r.ref;}}
  if(best){const p=best.p;VZ.open({ref:best,title:p.name,kind:DROP[p.kind].split(',')[0]+VZ.sizeText(p),age:VZ.ageText(p),host:p.host});}else VZ.close();});
addEventListener('resize',resize);resize();requestAnimationFrame(frame);
});
