VZ.load(P=>{
const {h32,poly,line,box,ring,label,INK,MUTED,MOTION}=VZ;
const cv=document.getElementById('cv'),ctx=cv.getContext('2d');
const PL={tanker:{label:'Jumbo jet, one of the biggest',len:34},battle:{label:'Fighter jet, big and fast',len:20},cargo:{label:'Cargo plane, big and steady',len:28},tug:{label:'Helicopter, small and nimble',len:15},speed:{label:'Business jet, small and quick',len:16},sail:{label:'Glider, light and easy',len:15}};
const flying=P.filter(p=>!p.old),parked=P.filter(p=>p.old);
document.getElementById('count').textContent=flying.length+' in the air, '+parked.length+' parked';
let W,H,DPR,S,T,WH,ground,off=0,heading=0;
const LAND='#f6f0e2',SEA='#eef7f9';
const coastX=wy=>W*(0.6+0.1*Math.sin(6.2832*wy/WH)+0.05*Math.sin(3*6.2832*wy/WH+1));
const trackX=wy=>coastX(wy)-W*0.14+W*0.02*Math.sin(2*6.2832*wy/WH);
const RUN={x:0.13,y0:0.6,y1:0.9};
const boats=[];const train={wy:0};
for(let i=0;i<10;i++){const p=flying[Math.floor(h32('b'+i,3)*flying.length)];boats.push({p,wy:h32('by'+i,4),f:0.15+h32('bf'+i,5)*0.7,v:(h32('bv'+i,6)-0.5)*0.03,side:h32('bs'+i,7)>0.5?1:-1});}
const planes=flying.map(p=>({p,x:h32(p.name,30),y:h32(p.name,31),alt:h32(p.name,32),ph:h32(p.name,33)*6.28,
  vr:(p.kind==='battle'?0.7:p.kind==='speed'?0.45:p.kind==='tanker'?0.05:p.kind==='cargo'?-0.15:p.kind==='tug'?-0.45:-0.35)+(p.speed-0.5)*0.3,
  rot:0,spin:0,spinT:4+h32(p.name,34)*10}));
function W2S(wy){let y=(wy+off)%WH;if(y<0)y+=WH;if(y>H+80)y-=WH;return y;}
function build(){
  ground=document.createElement('canvas');ground.width=W*DPR;ground.height=WH*DPR;
  const g=ground.getContext('2d');g.scale(DPR,DPR);
  g.fillStyle=LAND;g.fillRect(0,0,W,WH);
  g.strokeStyle='#e7dcc2';g.lineWidth=1;
  for(let i=0;i<14;i++){const x=h32('fx'+i,1)*W*0.35,y=h32('fy'+i,2)*WH,w=20+h32('fw'+i,3)*40,h=20+h32('fh'+i,4)*50;if(y>RUN.y0*WH-60&&y<RUN.y1*WH+20&&x<W*0.36)continue;if(x+w>trackX(y)-10)continue;g.strokeRect(x,y,w,h);for(let k=6;k<w+h;k+=6){g.beginPath();g.moveTo(x+Math.max(0,k-h),y+Math.min(k,h));g.lineTo(x+Math.min(k,w),y+Math.max(0,k-w));g.stroke();}}
  g.strokeStyle='#d9ccb0';
  for(let i=0;i<24;i++){const x=h32('tx'+i,5)*W*0.4,y=h32('ty'+i,6)*WH;if(y>RUN.y0*WH-40&&y<RUN.y1*WH+20&&x<W*0.36)continue;for(let k=0;k<5;k++){const bx=x+h32('t'+i+k,7)*18,by=y+h32('u'+i+k,8)*14;g.strokeRect(bx,by,4,4);}}
  g.beginPath();g.moveTo(W,-6);for(let y=-6;y<=WH+6;y+=6)g.lineTo(coastX(y),y);g.lineTo(W,WH+6);g.closePath();g.fillStyle=SEA;g.fill();
  g.strokeStyle='#8a7550';g.lineWidth=1.4;g.beginPath();for(let y=0;y<=WH;y+=6){if(y===0)g.moveTo(coastX(y),y);else g.lineTo(coastX(y),y);}g.stroke();
  g.strokeStyle='#c3dfe6';g.lineWidth=1;
  for(let i=0;i<90;i++){const y=h32('wy'+i,9)*WH,cx=coastX(y),x=cx+12+h32('wx'+i,10)*(W-cx-16),s=3+h32('ws'+i,11)*4;g.beginPath();g.moveTo(x-s,y);g.lineTo(x-s/2,y-s*0.35);g.lineTo(x,y);g.lineTo(x+s/2,y-s*0.35);g.lineTo(x+s,y);g.stroke();}
  for(let y=0;y<WH;y+=5*T){const x=trackX(y);g.strokeStyle='#c9b48a';g.beginPath();g.moveTo(x-3*T,y);g.lineTo(x+3*T,y);g.stroke();}
  g.strokeStyle='rgba(18,58,74,.45)';for(const d of [-1.6,1.6]){g.beginPath();for(let y=0;y<=WH;y+=4){const x=trackX(y)+d*T;if(y===0)g.moveTo(x,y);else g.lineTo(x,y);}g.stroke();}
  const py=0.3*WH,px=coastX(py);g.strokeStyle='rgba(18,58,74,.7)';g.lineWidth=1.2;
  g.strokeRect(px-4,py-3*T,26*T,6*T);g.beginPath();g.moveTo(px-8*T,py-8*T);g.lineTo(px-8*T,py+6*T);g.moveTo(px-8*T,py-8*T);g.lineTo(px+8*T,py-5*T);g.stroke();
  const rx=RUN.x*W,ry0=RUN.y0*WH,ry1=RUN.y1*WH;g.strokeStyle='rgba(18,58,74,.6)';g.strokeRect(rx-7*T,ry0,14*T,ry1-ry0);
  g.setLineDash([6,6]);g.beginPath();g.moveTo(rx,ry0+8);g.lineTo(rx,ry1-8);g.stroke();g.setLineDash([]);
  g.strokeStyle='rgba(18,58,74,.35)';g.strokeRect(rx+12*T,ry0+10,W*0.2,ry1-ry0-20);
}
function resize(){
  DPR=Math.min(window.devicePixelRatio||1,2);W=innerWidth;H=innerHeight;cv.width=W*DPR;cv.height=H*DPR;WH=H*2.2;
  T=Math.max(0.85,Math.min(1.3,Math.min(W,H)/360));S=Math.max(0.6,Math.min(1.25,Math.sqrt(W*H/(flying.length*4200))));
  build();
}
function drawPlane(c,kind,L,col,t,rot){
  c.lineWidth=1.2;c.lineJoin='round';c.lineCap='round';
  const f=L*0.06;
  if(kind==='tanker'){
    poly(c,[[0,-L/2],[f*1.2,-L*.42],[f*1.2,L*.4],[0,L/2],[-f*1.2,L*.4],[-f*1.2,-L*.42]],col);
    for(const s of [-1,1]){poly(c,[[s*f*1.2,-L*.08],[s*L*.5,L*.14],[s*L*.5,L*.2],[s*f*1.2,L*.06]],col);poly(c,[[s*f*1.2,L*.34],[s*L*.18,L*.44],[s*L*.18,L*.48],[s*f*1.2,L*.42]],col);
      box(c,s*L*.2-f*0.5,L*.0,s*L*.2+f*0.5,L*.08,col);box(c,s*L*.36-f*0.5,L*.07,s*L*.36+f*0.5,L*.15,col);}
  }else if(kind==='battle'){
    poly(c,[[0,-L/2],[L*.08,-L*.2],[L*.42,L*.3],[L*.12,L*.32],[L*.1,L*.46],[-L*.1,L*.46],[-L*.12,L*.32],[-L*.42,L*.3],[-L*.08,-L*.2]],col);
    line(c,0,-L*.32,0,-L*.12,col);line(c,L*.06,L*.32,L*.06,L*.46,col);line(c,-L*.06,L*.32,-L*.06,L*.46,col);
  }else if(kind==='cargo'){
    poly(c,[[0,-L/2],[f*1.6,-L*.42],[f*1.4,L*.38],[0,L*.46],[-f*1.4,L*.38],[-f*1.6,-L*.42]],col);
    box(c,-L*.55,-L*.12,L*.55,-L*.02,col);box(c,-L*.2,L*.38,L*.2,L*.44,col);
    for(const s of [-1,1])for(const k of [0.2,0.38]){ring(c,s*L*k,-L*.15,f*0.8,col);}
  }else if(kind==='tug'){
    ring(c,0,-L*.12,L*.2,col);line(c,0,L*.08,0,L*.5,col);line(c,-L*.1,L*.48,L*.1,L*.48,col);
    const a=t*14+rot;for(const k of [0,Math.PI/2]){line(c,Math.cos(a+k)*L*.55,-L*.12+Math.sin(a+k)*L*.55,-Math.cos(a+k)*L*.55,-L*.12-Math.sin(a+k)*L*.55,col);}
  }else if(kind==='speed'){
    poly(c,[[0,-L/2],[f,-L*.4],[f,L*.42],[0,L/2],[-f,L*.42],[-f,-L*.4]],col);
    for(const s of [-1,1]){poly(c,[[s*f,-L*.02],[s*L*.36,L*.16],[s*L*.36,L*.22],[s*f,L*.1]],col);ring(c,s*f*2.2,L*.3,f*0.8,col);line(c,s*f,L*.4,s*L*.16,L*.48,col);}
  }else{
    poly(c,[[0,-L/2],[f*0.7,-L*.38],[f*0.5,L*.44],[0,L*.5],[-f*0.5,L*.44],[-f*0.7,-L*.38]],col);
    box(c,-L*.85,-L*.12,L*.85,-L*.05,col);line(c,-L*.18,L*.46,L*.18,L*.46,col);
  }
}
function hud(t){
  ctx.save();ctx.strokeStyle='rgba(18,58,74,.32)';ctx.lineWidth=1.2;
  const cx=W/2,cy=H*0.5;
  ring(ctx,cx,cy,7*T,'rgba(18,58,74,.32)');line(ctx,cx-16*T,cy,cx-7*T,cy,'rgba(18,58,74,.32)');line(ctx,cx+7*T,cy,cx+16*T,cy,'rgba(18,58,74,.32)');line(ctx,cx,cy-7*T,cx,cy-13*T,'rgba(18,58,74,.32)');
  for(const k of [-2,-1,1,2]){const y=cy+k*H*0.12+Math.sin(t*0.3)*4;ctx.setLineDash(k>0?[4,4]:[]);line(ctx,cx-50*T,y,cx-22*T,y,'rgba(18,58,74,.25)');line(ctx,cx+22*T,y,cx+50*T,y,'rgba(18,58,74,.25)');ctx.setLineDash([]);}
  const hy=H*0.13;line(ctx,W*0.25,hy,W*0.75,hy,'rgba(18,58,74,.3)');
  for(let d=-60;d<=60;d+=10){const v=Math.round(heading/10)*10+d,x=cx+(v-heading)*2.2*T;if(x<W*0.25||x>W*0.75)continue;line(ctx,x,hy,x,hy-(v%30===0?8:4)*T,'rgba(18,58,74,.3)');if(v%30===0){ctx.globalAlpha=0.6;label(ctx,String(((v%360)+360)%360).padStart(3,'0'),x,hy-11*T,'center',10*T);ctx.globalAlpha=1;}}
  line(ctx,cx,hy+2,cx-4*T,hy+8*T,'rgba(18,58,74,.45)');line(ctx,cx,hy+2,cx+4*T,hy+8*T,'rgba(18,58,74,.45)');
  ctx.globalAlpha=0.6;label(ctx,'350 kt',14*T,cy+4*T,'left',11*T);label(ctx,'12,000 ft',W-14*T,cy+4*T,'right',11*T);ctx.globalAlpha=1;
  ctx.strokeStyle='rgba(18,58,74,.18)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,H*0.82);ctx.quadraticCurveTo(W*0.08,H*0.35,W*0.32,0);ctx.moveTo(W,H*0.82);ctx.quadraticCurveTo(W*0.92,H*0.35,W*0.68,0);ctx.stroke();
  ctx.restore();
}
let last=performance.now();
function frame(now){
  const dt=Math.min(0.05,(now-last)/1000)*MOTION,t=now/1000;last=now;
  const V=38*T;off+=V*dt;heading=Math.sin(t*0.07)*25;
  ctx.setTransform(DPR,0,0,DPR,0,0);
  const o=off%WH;ctx.drawImage(ground,0,o-WH+1,W,WH);ctx.drawImage(ground,0,o,W,WH);
  train.wy=(train.wy-28*T*dt+WH)%WH;
  for(let i=0;i<9;i++){const wy=(train.wy+i*11*T)%WH,y=W2S(wy);if(y<-20||y>H+20)continue;const x=trackX(wy);ctx.lineWidth=1;VZ.box(ctx,x-3*T,y-4.5*T,x+3*T,y+4.5*T,i===0?INK:'rgba(18,58,74,.55)');}
  for(const b of boats){b.wy=(b.wy+b.v*dt+1)%1;const wy=b.wy*WH,y=W2S(wy);if(y<-20||y>H+20)continue;const cx=coastX(wy),x=cx+10+b.f*(W-cx-18);ctx.save();ctx.translate(x,y);ctx.rotate(b.v<0?-Math.PI/2:Math.PI/2);ctx.globalAlpha=0.75;VZ.boat(ctx,b.p.kind,11*T,b.p.color,b.side);ctx.restore();}
  ctx.globalAlpha=1;
  const portY=W2S(0.3*WH);if(portY>-20&&portY<H+20)label(ctx,'Vercel port',coastX(0.3*WH)+30*T,portY+4*T,'left',10*T);
  const tl=W2S(0.55*WH);if(tl>-20&&tl<H+20)label(ctx,'GitHub line',trackX(0.55*WH)-6*T,tl,'right',10*T);
  const ry0=W2S(RUN.y0*WH);
  parked.forEach((p,i)=>{const L=PL[p.kind].len*p.sizeF*S*0.8,x=RUN.x*W+12*T+W*0.1,y=ry0+22+i*((RUN.y1-RUN.y0)*WH-44)/Math.max(1,parked.length-1);p._x=x;p._y=y;p._L=L;if(y<-30||y>H+30)return;ctx.save();ctx.translate(x,y);ctx.rotate(Math.PI/2);drawPlane(ctx,p.kind,L,p.color,0,0);ctx.restore();});
  if(ry0>-20&&ry0<H+20)label(ctx,'Parked, 90 days or more',RUN.x*W+12*T,ry0-6,'left',10*T);
  for(const a of planes){
    a.y-=a.vr*V*0.6*dt/H;if(a.y<-0.08)a.y+=1.16;if(a.y>1.08)a.y-=1.16;
    a.x+=Math.sin(t*0.4+a.ph)*0.01*dt;if(a.x<0.03)a.x=0.03;if(a.x>0.97)a.x=0.97;
    if(a.p.kind==='tug'){a.spinT-=dt;if(a.spinT<=0&&a.spin<=0){a.spin=6.283;a.spinT=6+Math.random()*8;}if(a.spin>0){const d=Math.min(a.spin,dt*3);a.rot+=d;a.spin-=d;}}
  }
  const sorted=planes.slice().sort((a,b)=>a.alt-b.alt);
  for(const a of sorted){const L=PL[a.p.kind].len*a.p.sizeF*S*(0.75+0.5*a.alt),x=a.x*W,y=a.y*H,sh=(1-a.alt)*14*T+6*T;a._x=x;a._y=y;a._L=L;
    ctx.save();ctx.translate(x+sh*0.7,y+sh);ctx.rotate(a.p.kind==='tug'?a.rot:Math.sin(t*0.4+a.ph)*0.25);ctx.globalAlpha=0.09;drawPlane(ctx,a.p.kind,L,INK,t,0);ctx.restore();
    ctx.save();ctx.translate(x,y);ctx.rotate(a.p.kind==='tug'?a.rot:Math.sin(t*0.4+a.ph)*0.25);ctx.globalAlpha=1;drawPlane(ctx,a.p.kind,L,a.p.color,t,0);ctx.restore();}
  hud(t);
  const s=VZ.sel;if(s&&s.ref){VZ.selRing(ctx,s.ref._x,s.ref._y,s.ref._L*0.6+6);}
  requestAnimationFrame(frame);
}
cv.addEventListener('pointerdown',e=>{
  let best=null,bd=1e9;const X=e.clientX,Y=e.clientY;
  const test=(o,p)=>{if(o._x==null)return;const d=Math.hypot(X-o._x,Y-o._y);if(d<Math.max(o._L*0.6,16)&&d<bd){bd=d;best=[o,p];}};
  for(const a of planes)test(a,a.p);for(const p of parked)test(p,p);
  if(best){const [o,p]=best;VZ.open({ref:o,title:p.name,kind:PL[p.kind].label+VZ.sizeText(p),age:VZ.ageText(p,p.old?'Parked, ':''),host:p.host});}else VZ.close();
});
addEventListener('resize',resize);resize();requestAnimationFrame(frame);
});
