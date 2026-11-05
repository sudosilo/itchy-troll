VZ.load(P=>{
const {h32,INK,MOTION}=VZ;
const cv=document.getElementById('cv'),ctx=VZ.wire(cv.getContext('2d'));
const FL={tanker:{label:'Sunflower, one of the biggest',h:1},battle:{label:'Tulip, big and fast',h:0.62},cargo:{label:'Rose bush, big and steady',h:0.55},tug:{label:'Daisy, small and nimble',h:0.4},speed:{label:'Poppy, small and quick',h:0.5},sail:{label:'Lavender, light and easy',h:0.48}};
const STAGE=d=>d==null?2:d<7?0:d<30?1:d<60?2:d<90?3:4;
const SN=['in full bloom','open','starting to close','wilting','gone to seed'];
const ROWS=6;
let W,H,DPR,S,T,HOR,bg,bees=[],flies=[],petals=[],seeds=[],clouds=[];

function hex(c){c=c.replace('#','');if(c.length===3)c=c.split('').map(x=>x+x).join('');const n=parseInt(c,16);return [n>>16&255,n>>8&255,n&255];}
function rgb(a){return 'rgb('+a.map(v=>Math.round(Math.max(0,Math.min(255,v)))).join(',')+')';}
function mix(c,d,t){const a=hex(c),b=hex(d);return rgb(a.map((v,i)=>v+(b[i]-v)*t));}
function tint(c,t){return mix(c,'#ffffff',t);}
function shade(c,t){return mix(c,'#000000',t);}
function wilt(c,st){return st>=3?mix(c,'#9a7b4f',st===3?0.45:0.7):st===2?mix(c,'#9a7b4f',0.15):c;}

const pl=P.map(p=>({p,row:Math.floor(h32(p.name,140)*ROWS),x:0.04+0.92*h32(p.name,141),seed:h32(p.name,142)*6,lean:(h32(p.name,143)-0.5)*0.25,st:STAGE(p.days)}));
pl.sort((a,b)=>a.row-b.row||a.x-b.x);
document.getElementById('count').textContent=pl.filter(f=>f.st===0).length+' in full bloom, '+pl.filter(f=>f.st===4).length+' gone to seed';
const rowY=r=>HOR+(H*0.92-HOR)*((r+0.75)/ROWS),rowS=r=>0.55+0.1*r;

function hill(g,base,amp,freq,ph,col){g.fillStyle=col;g.beginPath();g.moveTo(0,H);g.lineTo(0,base);for(let x=0;x<=W;x+=8)g.lineTo(x,base-amp*(0.6+0.4*Math.sin(x*freq+ph))*(0.7+0.3*Math.sin(x*freq*0.37+ph*2)));g.lineTo(W,H);g.closePath();g.fill();}

function build(){
  bg=document.createElement('canvas');bg.width=W*DPR;bg.height=H*DPR;const g=VZ.wire(bg.getContext('2d'));g.bg('#f6f0e2',W*DPR,H*DPR);g.scale(DPR,DPR);
  let gr=g.createLinearGradient(0,0,0,HOR);gr.addColorStop(0,'#bfe1f2');gr.addColorStop(1,'#f4fafc');g.fillStyle=gr;g.fillRect(0,0,W,HOR+2);
  const sx=W*0.82,sy=HOR*0.42,sr=16*T;
  gr=g.createRadialGradient(sx,sy,sr*0.5,sx,sy,sr*4);gr.addColorStop(0,'rgba(255,214,120,.55)');gr.addColorStop(1,'rgba(255,214,120,0)');g.fillStyle=gr;g.fillRect(sx-sr*4,sy-sr*4,sr*8,sr*8);
  g.fillStyle='#ffd36b';g.beginPath();g.arc(sx,sy,sr,0,6.283);g.fill();
  hill(g,HOR+2,HOR*0.35,0.011,1.3,'#d7e8c8');
  hill(g,HOR+6,HOR*0.2,0.017,4.1,'#c3dbac');
  const fy=HOR+4;
  g.fillStyle='#fbfbf7';g.strokeStyle='rgba(18,58,74,.18)';g.lineWidth=1;
  g.fillRect(0,fy-15*T,W,3*T);g.fillRect(0,fy-7*T,W,3*T);
  for(let x=4;x<W;x+=11*T){g.beginPath();g.moveTo(x,fy+2);g.lineTo(x,fy-20*T);g.lineTo(x+3*T,fy-24*T);g.lineTo(x+6*T,fy-20*T);g.lineTo(x+6*T,fy+2);g.closePath();g.fill();g.stroke();}
  gr=g.createLinearGradient(0,HOR,0,H);gr.addColorStop(0,'#eef4e1');gr.addColorStop(1,'#e2ead0');g.fillStyle=gr;g.fillRect(0,HOR+4,W,H-HOR);
  for(let r=0;r<ROWS;r++){
    const y=rowY(r),s=rowS(r)*T,bh=7*s;
    g.fillStyle='#7a5a3c';g.beginPath();g.ellipse(W/2,y+bh*0.3,W*0.62,bh,0,0,6.283);g.fill();
    g.fillStyle='#93704d';g.beginPath();g.ellipse(W/2,y,W*0.6,bh*0.65,0,0,6.283);g.fill();
    g.strokeStyle='rgba(90,140,70,.45)';g.lineWidth=1;
    for(let x=0;x<W;x+=7*s){const yy=y+bh*1.6+((x*13)%5)*s;g.beginPath();g.moveTo(x,yy);g.lineTo(x-2*s,yy-5*s);g.moveTo(x,yy);g.lineTo(x+1.5*s,yy-6*s);g.stroke();}
  }
  const cx=W*0.9,cy=H*0.955,k=T;
  g.fillStyle='#4f9ab0';g.beginPath();g.moveTo(cx-14*k,cy);g.lineTo(cx-12*k,cy-14*k);g.lineTo(cx+6*k,cy-14*k);g.lineTo(cx+8*k,cy);g.closePath();g.fill();
  g.strokeStyle='#4f9ab0';g.lineWidth=2.5*k;g.lineCap='round';g.beginPath();g.moveTo(cx+6*k,cy-9*k);g.lineTo(cx+17*k,cy-19*k);g.stroke();
  g.lineWidth=2*k;g.beginPath();g.arc(cx-3*k,cy-16*k,7*k,3.4,6.0);g.stroke();
  g.fillStyle='#3d7f93';g.fillRect(cx+15*k,cy-22*k,5*k,4*k);
}

function resize(){
  DPR=Math.min(window.devicePixelRatio||1,2);W=innerWidth;H=innerHeight;cv.width=W*DPR;cv.height=H*DPR;HOR=H*0.24;
  T=Math.max(0.85,Math.min(1.3,Math.min(W,H)/360));S=Math.max(0.9,Math.min(1.6,Math.sqrt(W*H/(P.length*1500))));build();
  const green=pl.filter(f=>f.st===0);
  bees=[...Array(Math.min(10,green.length))].map((_,i)=>({x:Math.random()*W,y:HOR+Math.random()*(H-HOR),tgt:green[i%green.length],t:0}));
  flies=[0,1,2,3].map(i=>({x:Math.random()*W,y:HOR+Math.random()*H*0.5,a:Math.random()*6,c:['#5b8def','#f29a3a','#e8607a','#9b7be0'][i]}));
  clouds=[0,1,2].map(i=>({x:Math.random()*W,y:HOR*(0.15+0.22*i),s:(0.8+Math.random()*0.6)*T,v:(4+i*2)*T}));
}

function leaf(c,x,y,ang,len,col){c.save();c.translate(x,y);c.rotate(ang);c.fillStyle=col;c.beginPath();c.moveTo(0,0);c.quadraticCurveTo(len*0.5,-len*0.35,len,0);c.quadraticCurveTo(len*0.5,len*0.35,0,0);c.fill();c.restore();}

function head(c,f,R,t){
  const k=f.p.kind,st=f.st,base=wilt(f.p.base||f.p.color,st),open=[1,0.9,0.72,0.55][st],paint=f.p.itch&&window.itchPaint?window.itchPaint(base):base;
  if(st===4){
    c.fillStyle='rgba(255,255,255,.85)';c.strokeStyle='rgba(120,120,120,.45)';c.lineWidth=0.7;
    for(let i=0;i<14;i++){const a=i/14*6.283;c.beginPath();c.moveTo(0,0);c.lineTo(Math.cos(a)*R*1.1,Math.sin(a)*R*1.1);c.stroke();c.beginPath();c.arc(Math.cos(a)*R*1.15,Math.sin(a)*R*1.15,R*0.16,0,6.283);c.fill();}
    c.fillStyle='#8a7350';c.beginPath();c.arc(0,0,R*0.22,0,6.283);c.fill();return;
  }
  const light=tint(base,0.35),dark=shade(base,0.25);
  if(k==='sail'){
    for(let i=0;i<7;i++){const y=-i*R*0.75,w=R*0.42*open*(1-i*0.07);c.fillStyle=i%2?light:paint;c.beginPath();c.ellipse(-w*0.5,y,w*0.6,w*0.9,-0.3,0,6.283);c.fill();c.beginPath();c.ellipse(w*0.5,y,w*0.6,w*0.9,0.3,0,6.283);c.fill();}
    return;
  }
  if(k==='battle'){
    c.fillStyle=dark;c.beginPath();c.moveTo(-R*0.75,-R*0.1);c.quadraticCurveTo(-R*0.95,-R*1.25*open,-R*0.15,-R*1.45);c.quadraticCurveTo(0,-R*0.6,-R*0.1,R*0.3);c.closePath();c.fill();
    c.beginPath();c.moveTo(R*0.75,-R*0.1);c.quadraticCurveTo(R*0.95,-R*1.25*open,R*0.15,-R*1.45);c.quadraticCurveTo(0,-R*0.6,R*0.1,R*0.3);c.closePath();c.fill();
    c.fillStyle=paint;c.beginPath();c.moveTo(-R*0.6,0);c.quadraticCurveTo(-R*0.7,-R*1.3,0,-R*1.55*open);c.quadraticCurveTo(R*0.7,-R*1.3,R*0.6,0);c.quadraticCurveTo(0,R*0.55,-R*0.6,0);c.fill();
    c.fillStyle=light;c.beginPath();c.ellipse(-R*0.2,-R*0.75,R*0.12,R*0.45,0.15,0,6.283);c.fill();
    return;
  }
  if(k==='cargo'){
    c.fillStyle=dark;c.beginPath();c.arc(0,0,R,0,6.283);c.fill();
    for(let i=0;i<4;i++){const r=R*(0.85-i*0.2)*(0.7+0.3*open);c.fillStyle=i%2?paint:light;c.beginPath();c.arc(Math.cos(i*1.9)*R*0.06,Math.sin(i*1.9)*R*0.06,r,i*1.4,i*1.4+5.2);c.closePath();c.fill();}
    c.fillStyle=dark;c.beginPath();c.arc(0,0,R*0.16,0,6.283);c.fill();
    return;
  }
  const n=k==='tug'?13:k==='tanker'?18:5,pr=R*open;
  const pc=k==='tug'?(f.p.itch&&window.itchPaint?window.itchPaint(tint(base,0.7)):tint(base,0.7)):paint,pe=k==='tug'?tint(base,0.45):light;
  for(let pass=0;pass<(k==='tanker'?2:1);pass++)for(let i=0;i<n;i++){
    const a=i/n*6.283+pass*(3.1416/n)+Math.sin(t*0.6+f.seed)*0.04;
    c.save();c.rotate(a);c.fillStyle=pass?pe:pc;c.beginPath();
    if(k==='speed'){c.ellipse(pr*0.55,0,pr*0.6,pr*0.5,0,0,6.283);}
    else if(k==='tanker'){c.moveTo(R*0.4,-pr*0.14);c.quadraticCurveTo(pr*1.05,-pr*0.12,pr*1.25,0);c.quadraticCurveTo(pr*1.05,pr*0.12,R*0.4,pr*0.14);c.closePath();}
    else{c.ellipse(pr*0.62,0,pr*0.5,pr*0.15,0,0,6.283);}
    c.fill();c.restore();
  }
  if(k==='speed'){c.fillStyle='rgba(255,255,255,.25)';for(let i=0;i<n;i++){const a=i/n*6.283;c.beginPath();c.ellipse(Math.cos(a)*pr*0.5,Math.sin(a)*pr*0.5,pr*0.2,pr*0.12,a,0,6.283);c.fill();}}
  const cr=R*(k==='tanker'?0.48:k==='speed'?0.24:0.28);
  c.fillStyle=k==='tanker'?'#5a3a1e':k==='speed'?'#2b2420':'#e9b43a';c.beginPath();c.arc(0,0,cr,0,6.283);c.fill();
  if(k==='tanker'){c.fillStyle='#7c5430';for(let i=0;i<14;i++){const a=i*2.4,r=cr*Math.sqrt(i/14)*0.9;c.beginPath();c.arc(Math.cos(a)*r,Math.sin(a)*r,cr*0.08,0,6.283);c.fill();}}
  else{c.fillStyle='rgba(255,255,255,.35)';c.beginPath();c.arc(-cr*0.3,-cr*0.3,cr*0.35,0,6.283);c.fill();}
}

function flower(c,f,hgt,s,t){
  const st=f.st,sw=Math.sin(t*1.1+f.seed)*0.05*(st===4?0.6:1)+f.lean*0.4;
  const droop=[0,0.05,0.3,1.0,0.25][st];
  const tx=Math.sin(sw)*hgt,ty=-Math.cos(sw)*hgt;
  const stem=st>=3?'#8a8a4e':'#4e8f3e',leafc=st>=3?'#9b9452':'#5fa64a';
  c.lineCap='round';c.strokeStyle=stem;c.lineWidth=Math.max(1.2,1.8*s);
  c.beginPath();c.moveTo(0,0);c.quadraticCurveTo(tx*0.2+droop*4*s,ty*0.55,tx+droop*5*s,ty+droop*6*s);c.stroke();
  leaf(c,tx*0.12,ty*0.3,-0.6-droop*0.6+sw,9*s,leafc);
  leaf(c,tx*0.2,ty*0.48,3.1416+0.6+droop*0.6+sw,8*s,leafc);
  const hx=tx+droop*5*s,hy=ty+droop*6*s;
  const R=1.3*(f.p.kind==='tanker'?9:f.p.kind==='cargo'?6.2:f.p.kind==='battle'?5.6:f.p.kind==='speed'?5.8:f.p.kind==='tug'?5:3.2)*s*f.p.sizeF;
  c.save();c.translate(hx,hy);c.rotate(droop*1.1+sw*1.5);c.shadowColor='rgba(30,50,40,.35)';c.shadowBlur=2*s;head(c,f,R,t);c.restore();
  f._hx=hx;f._hy=hy;
  if(st===3&&Math.random()<0.003*MOTION)petals.push({x:f._bx+hx,y:f._by+hy,vx:(Math.random()-0.5)*10,vy:8,life:1,col:wilt(f.p.base||f.p.color,3),r:Math.random()*6});
  if(st===4&&Math.random()<0.002*MOTION)seeds.push({x:f._bx+hx,y:f._by+hy,vx:8+Math.random()*10,vy:-4-Math.random()*6,life:1});
}

let last=performance.now();
function frame(now){
  const dt=Math.min(0.05,(now-last)/1000)*MOTION,t=now/1000;last=now;
  ctx.setTransform(DPR,0,0,DPR,0,0);ctx.drawImage(bg,0,0,W,H);
  ctx.fillStyle='rgba(255,255,255,.9)';
  for(const cl of clouds){cl.x+=cl.v*dt;if(cl.x>W+60*cl.s)cl.x=-60*cl.s;const s=cl.s;ctx.beginPath();ctx.ellipse(cl.x,cl.y,22*s,8*s,0,0,6.283);ctx.ellipse(cl.x+14*s,cl.y-5*s,14*s,9*s,0,0,6.283);ctx.ellipse(cl.x-12*s,cl.y-3*s,11*s,7*s,0,0,6.283);ctx.fill();}
  for(const f of pl){
    const r=f.row,y=rowY(r),s=rowS(r)*S*T;
    const hgt=(26+FL[f.p.kind].h*44)*s*Math.min(1.3,f.p.sizeF)*[1,1,0.95,0.82,0.92][f.st];
    const x=f.x*W;f._bx=x;f._by=y;f._L=hgt*0.6;
    ctx.fillStyle='rgba(40,60,30,.18)';ctx.beginPath();ctx.ellipse(x,y+1,6*s,2*s,0,0,6.283);ctx.fill();
    ctx.save();ctx.translate(x,y);flower(ctx,f,hgt,s,t);ctx.restore();
    f._x=x+f._hx;f._y=y+f._hy;
  }
  for(const p of petals){p.x+=p.vx*dt;p.y+=p.vy*T*dt;p.r+=dt*2;p.life-=dt*0.35;ctx.globalAlpha=Math.max(0,p.life);ctx.fillStyle=p.col;ctx.beginPath();ctx.ellipse(p.x,p.y,3*T,1.5*T,p.r,0,6.283);ctx.fill();}
  ctx.fillStyle='#ffffff';
  for(const p of seeds){p.x+=p.vx*T*dt;p.y+=p.vy*T*dt;p.vy+=Math.sin(t*2+p.x)*dt*4;p.life-=dt*0.18;ctx.globalAlpha=Math.max(0,p.life)*0.9;ctx.beginPath();ctx.arc(p.x,p.y,1.6*T,0,6.283);ctx.fill();}
  ctx.globalAlpha=1;petals=petals.filter(p=>p.life>0);seeds=seeds.filter(p=>p.life>0&&p.x<W+10);
  for(const b of bees){
    const g=b.tgt;if(!g||g._x==null)continue;const dx=g._x-b.x,dy=g._y-4*T-b.y,d=Math.hypot(dx,dy);
    if(d>4){b.x+=dx/d*42*T*dt+Math.sin(t*9+b.y)*0.6;b.y+=dy/d*42*T*dt+Math.cos(t*8+b.x)*0.6;}
    else{b.t+=dt;if(b.t>2){const gs=pl.filter(f=>f.st===0);b.tgt=gs[Math.floor(Math.random()*gs.length)];b.t=0;}}
    const w=Math.abs(Math.sin(t*40))*2.5*T;
    ctx.fillStyle='rgba(255,255,255,.75)';ctx.beginPath();ctx.ellipse(b.x-1*T,b.y-3*T,2.2*T,w+0.5,0.5,0,6.283);ctx.ellipse(b.x+1.5*T,b.y-3*T,2.2*T,w+0.5,-0.5,0,6.283);ctx.fill();
    ctx.fillStyle='#f2c230';ctx.beginPath();ctx.ellipse(b.x,b.y,3.6*T,2.4*T,0,0,6.283);ctx.fill();
    ctx.fillStyle='#2b2420';ctx.fillRect(b.x-1.3*T,b.y-2.3*T,1*T,4.6*T);ctx.fillRect(b.x+0.9*T,b.y-2.1*T,1*T,4.2*T);
  }
  for(const f of flies){
    f.a+=dt*(Math.sin(t*0.7+f.x)*1.5);f.x=(f.x+Math.cos(f.a)*22*T*dt+W)%W;f.y=Math.max(HOR,Math.min(H*0.85,f.y+Math.sin(f.a)*22*T*dt));
    const o=Math.abs(Math.sin(t*9+f.x))*5*T+1;
    ctx.fillStyle=f.c;ctx.beginPath();ctx.ellipse(f.x-o*0.6,f.y-1*T,o,4*T,-0.3,0,6.283);ctx.ellipse(f.x+o*0.6,f.y-1*T,o,4*T,0.3,0,6.283);ctx.fill();
    ctx.fillStyle=tint(f.c,0.4);ctx.beginPath();ctx.ellipse(f.x-o*0.5,f.y+2.5*T,o*0.7,2.5*T,0.4,0,6.283);ctx.ellipse(f.x+o*0.5,f.y+2.5*T,o*0.7,2.5*T,-0.4,0,6.283);ctx.fill();
    ctx.fillStyle='#2b2420';ctx.fillRect(f.x-0.6*T,f.y-4*T,1.2*T,8*T);
  }
  const sel=VZ.sel;if(sel&&sel.ref)VZ.selRing(ctx,sel.ref._x,sel.ref._y,Math.max(12,sel.ref._L*0.4));
  requestAnimationFrame(frame);
}
cv.addEventListener('pointerdown',e=>{let best=null,bd=1e9;const X=e.clientX,Y=e.clientY;
  for(const f of pl){if(f._x==null)continue;const d=Math.hypot(X-f._x,Y-f._y);if(d<Math.max(f._L*0.45,14)&&d<bd){bd=d;best=f;}}
  if(best){const p=best.p;VZ.open({ref:best,title:p.name,kind:FL[p.kind].label.split(',')[0]+', '+SN[best.st]+VZ.sizeText(p),age:VZ.ageText(p),host:p.host});}else VZ.close();});
addEventListener('resize',resize);resize();requestAnimationFrame(frame);
});
