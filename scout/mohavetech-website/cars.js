VZ.load(P=>{
const {h32,poly,line,box,ring,label,INK,MUTED,MOTION}=VZ;
const cv=document.getElementById('cv'),ctx=cv.getContext('2d');
const VK={tanker:{label:'Fuel tanker truck, one of the biggest',len:34,v:30},battle:{label:'Bus, big and fast',len:26,v:42},cargo:{label:'Container truck, big and steady',len:32,v:32},tug:{label:'Pickup truck, small and nimble',len:15,v:44},speed:{label:'Sports car, small and quick',len:13,v:56},sail:{label:'Compact car, light and easy',len:12,v:38}};
const driving=P.filter(p=>!p.old),parked=P.filter(p=>p.old);
document.getElementById('count').textContent=driving.length+' on the highway, '+parked.length+' at the rest stop';
let W,H,DPR,S,T,bg,LANE,LR,PAD=60;
const LAND='#f6f0e2',SEA='#eef7f9';
const roadX=y=>W*(0.4+0.07*Math.sin(6.2832*y/(H*1.1)));
const trackX=y=>roadX(y)+W*0.2+W*0.015*Math.sin(6.2832*y/(H*0.7));
const bayX=y=>roadX(y)+W*0.29+W*0.04*Math.sin(6.2832*y/(H*0.8)+1);
const cars=driving.map(p=>({p,vd:(VK[p.kind].v+(p.speed-0.5)*10),v:0,s:0,lane:0}));
const lanes=[[],[],[],[],[],[]];
cars.slice().sort((a,b)=>b.vd-a.vd).forEach((c,i)=>{const tier=Math.min(2,Math.floor(i/(cars.length/3)));const dir=i%2;const li=dir*3+tier;c.lane=li;lanes[li].push(c);});
lanes.forEach(L=>L.forEach((c,i)=>{c.s=i/L.length;c.v=c.vd;}));
function laneOff(li){const dir=li<3?-1:1,k=li%3;return dir*(1.5*T+(k+0.5)*LANE);}
function laneXY(li,s){const dir=li<3?1:-1,y=dir>0?-PAD+s*LR:H+PAD-s*LR;return [roadX(y)+laneOff(li),y,dir];}
const train={s:0};const boats=[];
for(let i=0;i<5;i++){const p=driving[Math.floor(h32('cb'+i,3)*driving.length)];boats.push({p,s:h32('cs'+i,4),f:0.2+h32('cf'+i,5)*0.6,v:(h32('cv'+i,6)>0.5?1:-1)*(0.012+h32('cw'+i,7)*0.01),side:1});}
function build(){
  bg=document.createElement('canvas');bg.width=W*DPR;bg.height=H*DPR;
  const g=bg.getContext('2d');g.scale(DPR,DPR);
  g.fillStyle=LAND;g.fillRect(0,0,W,H);
  g.strokeStyle='#e7dcc2';g.lineWidth=1;
  for(let k=0;k<9;k++){g.beginPath();const base=H*(k/8);for(let x=0;x<=W*0.32;x+=4){const y=base+Math.sin(x/28+k)*8+Math.sin(x/9+k*2)*2;if(x===0)g.moveTo(x,y);else g.lineTo(x,y);}g.stroke();}
  for(let i=0;i<70;i++){const y=h32('ty'+i,1)*H,x=h32('tx'+i,2)*(roadX(y)-3*LANE-14*T);if(x<4)continue;if(y>H*0.58&&y<H*0.92&&x>roadX(y)-3*LANE-80*T)continue;const r=(2.5+h32('tr'+i,3)*2.5)*T;g.strokeStyle='#9bb08a';g.beginPath();g.arc(x,y,r,0,6.283);g.stroke();g.beginPath();g.arc(x,y,0.6,0,6.283);g.stroke();}
  g.beginPath();g.moveTo(W,-6);for(let y=-6;y<=H+6;y+=5)g.lineTo(bayX(y),y);g.lineTo(W,H+6);g.closePath();g.fillStyle=SEA;g.fill();
  g.strokeStyle='#8a7550';g.lineWidth=1.4;g.beginPath();for(let y=-6;y<=H+6;y+=5){if(y===-6)g.moveTo(bayX(y),y);else g.lineTo(bayX(y),y);}g.stroke();
  g.strokeStyle='#c3dfe6';g.lineWidth=1;
  for(let i=0;i<30;i++){const y=h32('wy'+i,9)*H,bx=bayX(y),x=bx+8+h32('wx'+i,10)*(W-bx-10),s=3+h32('ws'+i,11)*3;if(x>W-4)continue;g.beginPath();g.moveTo(x-s,y);g.lineTo(x-s/2,y-s*0.35);g.lineTo(x,y);g.lineTo(x+s/2,y-s*0.35);g.lineTo(x+s,y);g.stroke();}
  for(let y=-6;y<H+6;y+=6*T){const x=trackX(y);g.strokeStyle='#c9b48a';g.beginPath();g.moveTo(x-4*T,y);g.lineTo(x+4*T,y);g.stroke();}
  g.strokeStyle='rgba(18,58,74,.55)';for(const d of [-2.2,2.2]){g.beginPath();for(let y=-6;y<=H+6;y+=4){const x=trackX(y)+d*T;if(y===-6)g.moveTo(x,y);else g.lineTo(x,y);}g.stroke();}
  const half=1.5*T+3*LANE;
  g.lineWidth=1.3;g.strokeStyle=INK;
  for(const d of [-1,1]){g.beginPath();for(let y=-6;y<=H+6;y+=4){const x=roadX(y)+d*half;if(y===-6)g.moveTo(x,y);else g.lineTo(x,y);}g.stroke();}
  g.strokeStyle='#c49a00';g.lineWidth=1;for(const d of [-0.6,0.6]){g.beginPath();for(let y=-6;y<=H+6;y+=4){const x=roadX(y)+d*T;if(y===-6)g.moveTo(x,y);else g.lineTo(x,y);}g.stroke();}
  g.strokeStyle='rgba(18,58,74,.4)';g.setLineDash([7,9]);
  for(const d of [-1,1])for(const k of [1,2]){g.beginPath();for(let y=-6;y<=H+6;y+=4){const x=roadX(y)+d*(1.5*T+k*LANE);if(y===-6)g.moveTo(x,y);else g.lineTo(x,y);}g.stroke();}
  g.setLineDash([]);
  const L0=H*0.62,L1=H*0.9,lx1=roadX(L0)-half-16*T,lx0=lx1-62*T;
  g.strokeStyle=INK;g.lineWidth=1.2;g.strokeRect(lx0,L0,lx1-lx0,L1-L0);
  g.beginPath();g.moveTo(lx1,L0+8*T);g.lineTo(roadX(L0-30*T)-half,L0-30*T);g.moveTo(lx1,L1-8*T);g.lineTo(roadX(L1+30*T)-half,L1+30*T);g.stroke();
  g.strokeStyle='rgba(18,58,74,.3)';const n=Math.max(1,parked.length);for(let i=1;i<n;i++){const y=L0+i*(L1-L0)/n;g.beginPath();g.moveTo(lx0,y);g.lineTo(lx0+20*T,y);g.stroke();}
  bg.lot={x0:lx0,x1:lx1,y0:L0,y1:L1};
}
function resize(){
  DPR=Math.min(window.devicePixelRatio||1,2);W=innerWidth;H=innerHeight;cv.width=W*DPR;cv.height=H*DPR;
  T=Math.max(0.85,Math.min(1.3,Math.min(W,H)/360));LANE=Math.min(12*T,W*0.03);S=LANE*0.6/7.5;LR=H+2*PAD;build();
}
function drawVeh(c,kind,L,col){
  const w=7.5*S;c.lineWidth=1.15;c.lineJoin='round';c.lineCap='round';
  if(kind==='tanker'||kind==='cargo'){
    box(c,L/2-L*0.2,-w*0.42,L/2,w*0.42,col);line(c,L/2-L*0.06,-w*0.42,L/2-L*0.06,w*0.42,col);
    const x1=L/2-L*0.24,x0=-L/2;
    if(kind==='tanker'){poly(c,[[x1-w*0.4,-w/2],[x1,-w*0.2],[x1,w*0.2],[x1-w*0.4,w/2],[x0+w*0.4,w/2],[x0,w*0.2],[x0,-w*0.2],[x0+w*0.4,-w/2]],col);line(c,x0+w*0.5,0,x1-w*0.5,0,col);}
    else{box(c,x0,-w/2,x1,w/2,col);for(let k=1;k<5;k++){const x=x0+(x1-x0)*k/5;line(c,x,-w/2,x,w/2,col);}}
  }else if(kind==='battle'){
    poly(c,[[L/2,-w*0.4],[L/2-w*0.1,-w/2],[-L/2,-w/2],[-L/2,w/2],[L/2-w*0.1,w/2],[L/2,w*0.4]],col);
    line(c,L/2-L*0.08,-w*0.4,L/2-L*0.08,w*0.4,col);box(c,-L*0.15,-w*0.22,L*0.12,w*0.22,col);
  }else if(kind==='tug'){
    poly(c,[[L/2,-w*0.4],[L/2-w*0.15,-w/2],[-L/2,-w/2],[-L/2,w/2],[L/2-w*0.15,w/2],[L/2,w*0.4]],col);
    line(c,L*0.14,-w/2,L*0.14,w/2,col);box(c,-L/2+1.5*S,-w*0.3,-L*0.02,w*0.3,col);
  }else if(kind==='speed'){
    poly(c,[[L/2,-w*0.25],[L*0.3,-w/2],[-L/2,-w*0.45],[-L/2,w*0.45],[L*0.3,w/2],[L/2,w*0.25]],col);
    c.strokeStyle=col;c.beginPath();c.moveTo(L*0.18,-w*0.34);c.lineTo(L*0.02,0);c.lineTo(L*0.18,w*0.34);c.stroke();
  }else{
    poly(c,[[L/2,-w*0.3],[L*0.35,-w/2],[-L*0.4,-w/2],[-L/2,-w*0.3],[-L/2,w*0.3],[-L*0.4,w/2],[L*0.35,w/2],[L/2,w*0.3]],col);
    line(c,L*0.18,-w*0.38,L*0.18,w*0.38,col);line(c,-L*0.26,-w*0.38,-L*0.26,w*0.38,col);
  }
}
let last=performance.now();
function frame(now){
  const dt=Math.min(0.05,(now-last)/1000)*MOTION,t=now/1000;last=now;
  ctx.setTransform(DPR,0,0,DPR,0,0);ctx.drawImage(bg,0,0,W,H);
  for(const b of boats){b.s=(b.s+b.v*dt+1)%1;const y=b.s*H,bx=bayX(y),x=bx+8*T+b.f*(W-bx-14*T);if(x>W-6)continue;ctx.save();ctx.translate(x,y);ctx.rotate(b.v>0?Math.PI/2:-Math.PI/2);VZ.boat(ctx,b.p.kind,12*T,b.p.color,1);ctx.restore();}
  train.s=(train.s+26*T*dt/LR)%1;
  for(let i=0;i<14;i++){const y=H+PAD-((train.s*LR+i*-12*T)%LR+LR)%LR;const x=trackX(y);ctx.lineWidth=1.1;box(ctx,x-3.4*T,y-5*T,x+3.4*T,y+5*T,i===0?INK:'rgba(18,58,74,.6)');if(i===0)ring(ctx,x,y-2*T,1.6*T,INK);}
  for(const L of lanes){
    const n=L.length;if(!n)continue;
    const order=L.slice().sort((a,b)=>a.s-b.s);
    for(let i=0;i<n;i++){
      const c=order[i],ahead=order[(i+1)%n];
      let gap=(ahead.s-c.s)*LR;if(gap<=0)gap+=LR;
      const need=(VK[c.p.kind].len*c.p.sizeF*S+VK[ahead.p.kind].len*ahead.p.sizeF*S)/2+5*T;
      const target=n>1?Math.min(c.vd,Math.max(0,(gap-need)*1.8)):c.vd;
      c.v+=(target-c.v)*Math.min(1,dt*2.5);
    }
    for(const c of L){c.s=(c.s+c.v*T*dt/LR)%1;}
  }
  for(const c of cars){
    const L=VK[c.p.kind].len*c.p.sizeF*S,[x,y,dir]=laneXY(c.lane,c.s),[x2,y2]=laneXY(c.lane,c.s+0.002);
    c._x=x;c._y=y;c._L=L;if(y<-40||y>H+40)continue;
    ctx.save();ctx.translate(x,y);ctx.rotate(Math.atan2(y2-y,x2-x));drawVeh(ctx,c.p.kind,L,c.p.color);ctx.restore();
  }
  const lot=bg.lot,n=Math.max(1,parked.length);
  parked.forEach((p,i)=>{const L=Math.min(VK[p.kind].len*p.sizeF*S,lot.x1-lot.x0-6*T),y=lot.y0+(i+0.5)*(lot.y1-lot.y0)/n,x=lot.x0+3*T+L/2;p._x=x;p._y=y;p._L=L;ctx.save();ctx.translate(x,y);drawVeh(ctx,p.kind,L,p.color);ctx.restore();});
  label(ctx,'Rest stop, 90 days or more',lot.x0,lot.y0-7*T,'left',10*T);
  const gy=H*0.2,gx=roadX(gy),half=1.5*T+3*LANE;
  ctx.lineWidth=1.3;line(ctx,gx-half-6*T,gy,gx+half+6*T,gy,INK);ring(ctx,gx-half-6*T,gy,2*T,INK);ring(ctx,gx+half+6*T,gy,2*T,INK);
  ctx.fillStyle='rgba(255,255,255,.9)';ctx.fillRect(gx-half+2*T,gy-9*T,half*2-4*T,13*T);box(ctx,gx-half+2*T,gy-9*T,gx+half-2*T,gy+4*T,'#1e9e3e');
  label(ctx,'Exit to Vercel',gx,gy+0.5*T,'center',Math.min(9.5*T,(half*2-6*T)/7.2));
  label(ctx,'GitHub line',trackX(H*0.38)+6*T,H*0.38,'left',10*T);
  const s=VZ.sel;if(s&&s.ref)VZ.selRing(ctx,s.ref._x,s.ref._y,s.ref._L*0.6+6);
  requestAnimationFrame(frame);
}
cv.addEventListener('pointerdown',e=>{
  let best=null,bd=1e9;const X=e.clientX,Y=e.clientY;
  const test=(o,p)=>{if(o._x==null)return;const d=Math.hypot(X-o._x,Y-o._y);if(d<Math.max(o._L*0.6,14)&&d<bd){bd=d;best=[o,p];}};
  for(const c of cars)test(c,c.p);for(const p of parked)test(p,p);
  if(best){const [o,p]=best;VZ.open({ref:o,title:p.name,kind:VK[p.kind].label+VZ.sizeText(p),age:VZ.ageText(p,p.old?'Parked, ':''),host:p.host});}else VZ.close();
});
addEventListener('resize',resize);resize();requestAnimationFrame(frame);
});
