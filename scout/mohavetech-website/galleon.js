VZ.load(P=>{
const {h32,INK,MOTION}=VZ;
const cv=document.getElementById('cv'),ctx=VZ.wire(cv.getContext('2d'));
const GUN={tanker:{label:'Great cannon, one of the biggest',s:1.35},battle:{label:'Long gun, big and fast',s:1.15},cargo:{label:'Heavy cannon, big and steady',s:1.1},tug:{label:'Swivel gun, small and nimble',s:0.8},speed:{label:'Carronade, small and quick',s:0.85},sail:{label:'Signal gun, light and easy',s:0.75}};
const STATE=d=>d==null?'standing by':d<7?'firing':d<30?'loaded':d<60?'cooling':d<90?'rusting':'ports shut';
const guns=P.map(p=>({p,seed:h32(p.name,300)*6,next:2+h32(p.name,301)*8,recoil:0,flash:0}))
  .sort((a,b)=>(b.p.sizeF*GUN[b.p.kind].s)-(a.p.sizeF*GUN[a.p.kind].s)||a.p.name.localeCompare(b.p.name));
const fresh=guns.filter(g=>g.p.days!=null&&g.p.days<7).length,shut=guns.filter(g=>g.p.days!=null&&g.p.days>=90).length;
document.getElementById('count').textContent=guns.length+' guns, '+fresh+' firing, '+shut+' ports shut';
let W,H,DPR,T,cols,rows,cell,deckH,hx0,hx1,hTop,hBot,wl,smoke=[],balls=[],splash=[],gulls=[];

function layout(){
  DPR=Math.min(devicePixelRatio||1,2);W=innerWidth;H=innerHeight;cv.width=W*DPR;cv.height=H*DPR;
  T=Math.max(0.8,Math.min(1.4,Math.min(W,H)/380));
  hx0=W*0.08;hx1=W*0.86;
  cols=Math.max(8,Math.min(26,Math.floor((hx1-hx0)/(20*T))));
  rows=Math.ceil(guns.length/cols);
  cell=(hx1-hx0)/cols;
  wl=H*0.86;
  deckH=Math.min(cell*1.25,(wl-H*0.42)/rows);
  hBot=wl+deckH*0.6;hTop=hBot-deckH*(rows+0.6);
  guns.forEach((g,i)=>{const r=Math.floor(i/cols),c=i%cols,stag=(r%2)*0.5;g.r=r;g.c=c;
    g.x=hx0+cell*(Math.min(c+0.5+stag*0.6,cols-0.2));g.y=hBot-deckH*(r+1.05);});
  gulls=[0,1,2].map(i=>({x:Math.random()*W,y:H*(0.06+0.06*i),v:(14+i*5)*T,ph:Math.random()*6}));
}

function sky(){
  let g=ctx.createLinearGradient(0,0,0,wl);g.addColorStop(0,'#bfe0f2');g.addColorStop(1,'#eef7fb');ctx.fillStyle=g;ctx.fillRect(0,0,W,wl);
  ctx.fillStyle='rgba(255,255,255,.85)';
  for(let i=0;i<4;i++){const x=((i*W*0.37+performance.now()*0.004*T*(1+i*0.3))%(W+160))-80,y=H*(0.05+0.07*i),s=T*(0.8+0.25*i);
    ctx.beginPath();ctx.ellipse(x,y,26*s,9*s,0,0,6.283);ctx.ellipse(x+16*s,y-6*s,15*s,10*s,0,0,6.283);ctx.ellipse(x-14*s,y-3*s,12*s,8*s,0,0,6.283);ctx.fill();}
}

function water(t,front){
  const y0=wl+(front?deckH*0.4:0);
  ctx.fillStyle=front?'rgba(46,120,160,.92)':'#5aa4c8';
  ctx.beginPath();ctx.moveTo(0,H);
  for(let x=0;x<=W;x+=6)ctx.lineTo(x,y0+Math.sin(x*0.03+t*(front?1.6:1.1))*3*T+Math.sin(x*0.011-t*0.7)*4*T);
  ctx.lineTo(W,H);ctx.closePath();ctx.fill();
  if(front){ctx.strokeStyle='rgba(255,255,255,.55)';ctx.lineWidth=1.2;ctx.beginPath();
    for(let x=0;x<=W;x+=6){const y=y0+Math.sin(x*0.03+t*1.6)*3*T+Math.sin(x*0.011-t*0.7)*4*T;x?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.stroke();}
}

function sail(x,yTop,yBot,w,t,k){
  const bulge=(8+3*Math.sin(t*0.8+k))*T;
  ctx.fillStyle='#fbf6ea';ctx.strokeStyle='rgba(120,100,70,.5)';ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(x-w/2,yTop);ctx.lineTo(x+w/2,yTop);ctx.quadraticCurveTo(x+w/2+bulge,(yTop+yBot)/2,x+w/2*0.9,yBot);
  ctx.lineTo(x-w/2*0.9,yBot);ctx.quadraticCurveTo(x-w/2+bulge,(yTop+yBot)/2,x-w/2,yTop);ctx.fill();ctx.stroke();
  ctx.strokeStyle='#6b4a2b';ctx.lineWidth=2.5*T;ctx.beginPath();ctx.moveTo(x-w/2-4*T,yTop);ctx.lineTo(x+w/2+4*T,yTop);ctx.stroke();
}

function rigging(t){
  const deckY=hTop,masts=[hx0+(hx1-hx0)*0.2,hx0+(hx1-hx0)*0.5,hx0+(hx1-hx0)*0.78],top=Math.max(H*0.07,deckY-(deckY-H*0.07));
  ctx.strokeStyle='rgba(70,50,30,.45)';ctx.lineWidth=0.8;
  masts.forEach(m=>{ctx.beginPath();ctx.moveTo(m,top);ctx.lineTo(hx0-cell,deckY);ctx.moveTo(m,top);ctx.lineTo(hx1+cell*1.5,deckY);ctx.stroke();});
  masts.forEach((m,i)=>{
    const h=deckY-top*(i===1?1:1.25);
    ctx.fillStyle='#7a5532';ctx.fillRect(m-3*T,top+(i===1?0:h*0.12),6*T,deckY-top);
    const span=deckY-top-(i===1?0:h*0.12),y0=top+(i===1?0:h*0.12)+6*T,n=3,seg=(span-12*T)/n;
    for(let k=0;k<n;k++){const w=(hx1-hx0)*(0.16+0.04*k)*(i===1?1.1:1);sail(m,y0+k*seg,y0+(k+0.86)*seg,w,t,i*3+k);}
    ctx.fillStyle=i===1?'#d93636':'#2f6fd6';ctx.beginPath();const fy=top+(i===1?0:h*0.12);ctx.moveTo(m,fy);ctx.lineTo(m+(16+3*Math.sin(t*3+i))*T,fy+4*T);ctx.lineTo(m,fy+8*T);ctx.fill();
  });
}

function hull(){
  const bow=hx1+cell*2.2,stern=hx0-cell*0.8;
  ctx.fillStyle='#6b4325';ctx.beginPath();
  ctx.moveTo(stern,hTop-deckH*0.9);ctx.lineTo(hx0+cell,hTop-deckH*0.9);ctx.lineTo(hx0+cell*1.4,hTop);
  ctx.lineTo(hx1,hTop);ctx.quadraticCurveTo(bow,hTop-deckH*0.3,bow+cell*1.2,hTop-deckH*0.6);
  ctx.quadraticCurveTo(bow,hBot-deckH*0.5,hx1-cell,hBot+deckH*0.35);
  ctx.lineTo(hx0+cell,hBot+deckH*0.35);ctx.quadraticCurveTo(stern-cell*0.4,hBot,stern,hTop-deckH*0.9);ctx.fill();
  for(let r=0;r<=rows;r++){const y=hBot-deckH*(r+0.45);ctx.fillStyle=r%2?'#8a5a32':'#7b4e2b';ctx.fillRect(hx0-cell*0.3,y-deckH*0.5,hx1-hx0+cell*0.9,deckH*0.5);
    ctx.fillStyle='#c79a3a';ctx.fillRect(hx0-cell*0.3,y-1*T,hx1-hx0+cell*0.9,2*T);}
  ctx.strokeStyle='rgba(40,25,10,.35)';ctx.lineWidth=0.8;
  for(let y=hTop;y<hBot;y+=deckH/3){ctx.beginPath();ctx.moveTo(hx0-cell*0.3,y);ctx.lineTo(hx1+cell*0.6,y);ctx.stroke();}
  ctx.fillStyle='#4a2d17';ctx.fillRect(stern,hTop-deckH*1.6,cell*2.4,deckH*0.75);
  ctx.fillStyle='#f3d27a';for(let i=0;i<3;i++)ctx.fillRect(stern+cell*(0.35+i*0.7),hTop-deckH*1.45,cell*0.4,deckH*0.35);
  ctx.strokeStyle='#6b4325';ctx.lineWidth=3*T;ctx.beginPath();ctx.moveTo(bow+cell*1.1,hTop-deckH*0.6);ctx.lineTo(bow+cell*4,hTop-deckH*2.2);ctx.stroke();
  ctx.fillStyle='#b44a3a';ctx.beginPath();ctx.arc(bow+cell*0.9,hTop-deckH*0.2,4*T,0,6.283);ctx.fill();
}

function cannon(g,t){
  const p=g.p,d=p.days,s=Math.min(1.25,GUN[p.kind].s*(0.85+0.15*p.sizeF)),pw=Math.min(cell*0.8,deckH*0.8)*s*0.85,x=g.x,y=g.y;
  ctx.fillStyle='#1c120a';ctx.fillRect(x-pw/2,y-pw/2,pw,pw);
  ctx.strokeStyle='#c79a3a';ctx.lineWidth=1;ctx.strokeRect(x-pw/2,y-pw/2,pw,pw);
  if(d!=null&&d>=90){ctx.fillStyle='#7b4e2b';ctx.fillRect(x-pw/2+1,y-pw/2+1,pw-2,pw-2);ctx.fillStyle=p.color;ctx.fillRect(x-pw*0.15,y-pw*0.15,pw*0.3,pw*0.3);g._x=x;g._y=y;g._r=pw;return;}
  const droop=d==null?0:d<30?0:d<60?0.08:0.25,len=pw*(1.25+0.25*s),rec=g.recoil*pw*0.45;
  ctx.save();ctx.translate(x+len*0.1-rec,y);ctx.rotate(droop);
  ctx.fillStyle=p.color;ctx.beginPath();ctx.moveTo(-pw*0.2,-pw*0.3);ctx.lineTo(len,-pw*0.2);ctx.lineTo(len,pw*0.2);ctx.lineTo(-pw*0.2,pw*0.3);ctx.closePath();ctx.fill();
  ctx.fillStyle='rgba(0,0,0,.28)';ctx.fillRect(len*0.35,-pw*0.25,pw*0.12,pw*0.5);ctx.fillRect(len-pw*0.12,-pw*0.24,pw*0.12,pw*0.48);
  ctx.fillStyle='rgba(255,255,255,.25)';ctx.fillRect(0,-pw*0.22,len*0.9,pw*0.08);
  if(g.flash>0){ctx.fillStyle='rgba(255,200,80,'+g.flash+')';ctx.beginPath();ctx.moveTo(len,-pw*0.3);ctx.lineTo(len+pw*1.6*g.flash,0);ctx.lineTo(len,pw*0.3);ctx.fill();}
  ctx.restore();
  g._x=x+len*0.4;g._y=y;g._r=Math.max(pw,len*0.6);
  g._mx=x+len*1.1;g._my=y;
}

function fire(g){
  g.recoil=1;g.flash=1;
  for(let i=0;i<5;i++)smoke.push({x:g._mx,y:g._my,vx:(14+Math.random()*24)*T,vy:(-6-Math.random()*10)*T,r:(3+Math.random()*3)*T,life:1});
  const v=(120+Math.random()*90)*T;balls.push({x:g._mx,y:g._my,vx:v,vy:-(40+Math.random()*50)*T,life:1});
}

let last=performance.now();
function frame(now){
  const dt=Math.min(0.05,(now-last)/1000)*MOTION,t=now/1000;last=now;
  ctx.setTransform(DPR,0,0,DPR,0,0);ctx.bg('#eef7f9',W,H);
  sky();
  ctx.strokeStyle='#4f6f7c';ctx.lineWidth=1.2;
  for(const b of gulls){b.x+=b.v*dt;if(b.x>W+20)b.x=-20;const f=Math.sin(t*6+b.ph)*3*T;ctx.beginPath();ctx.moveTo(b.x-6*T,b.y+f);ctx.quadraticCurveTo(b.x-3*T,b.y-3*T,b.x,b.y);ctx.quadraticCurveTo(b.x+3*T,b.y-3*T,b.x+6*T,b.y+f);ctx.stroke();}
  water(t,false);
  const roll=Math.sin(t*0.6)*0.012,bob=Math.sin(t*0.9)*2.5*T;
  ctx.save();ctx.translate(W/2,wl);ctx.rotate(roll);ctx.translate(-W/2,-wl+bob);
  rigging(t);hull();
  for(const g of guns){
    if(g.p.days!=null&&g.p.days<7){g.next-=dt;if(g.next<=0&&g._mx!=null){fire(g);g.next=4+Math.random()*9;}}
    g.recoil=Math.max(0,g.recoil-dt*2.5);g.flash=Math.max(0,g.flash-dt*5);
    cannon(g,t);
  }
  ctx.restore();
  for(const s of smoke){s.x+=s.vx*dt;s.y+=s.vy*dt;s.vx*=0.97;s.r+=dt*10*T;s.life-=dt*0.45;ctx.fillStyle='rgba(200,200,200,'+Math.max(0,s.life*0.7)+')';ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,6.283);ctx.fill();}
  ctx.fillStyle='#2b2420';
  for(const b of balls){b.vy+=120*T*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;ctx.beginPath();ctx.arc(b.x,b.y,2.2*T,0,6.283);ctx.fill();
    if(b.y>wl+deckH*0.4){b.life=0;splash.push({x:b.x,y:wl+deckH*0.4,life:1});}}
  for(const s of splash){s.life-=dt*1.5;ctx.strokeStyle='rgba(255,255,255,'+Math.max(0,s.life)+')';ctx.lineWidth=1.5;const h=(1-s.life)*14*T;
    ctx.beginPath();ctx.moveTo(s.x-4*T,s.y);ctx.lineTo(s.x-6*T,s.y-h);ctx.moveTo(s.x,s.y);ctx.lineTo(s.x,s.y-h*1.4);ctx.moveTo(s.x+4*T,s.y);ctx.lineTo(s.x+6*T,s.y-h);ctx.stroke();}
  smoke=smoke.filter(s=>s.life>0);balls=balls.filter(b=>b.life>0&&b.x<W+20);splash=splash.filter(s=>s.life>0);
  water(t,true);
  const sel=VZ.sel;if(sel&&sel.ref)VZ.selRing(ctx,sel.ref._x,sel.ref._y+bob,Math.max(12,sel.ref._r*0.8));
  requestAnimationFrame(frame);
}
cv.addEventListener('pointerdown',e=>{
  let best=null,bd=1e9;const X=e.clientX,Y=e.clientY;
  for(const g of guns){if(g._x==null)continue;const d=Math.hypot(X-g._x,Y-g._y);if(d<Math.max(g._r,14)&&d<bd){bd=d;best=g;}}
  if(best){const p=best.p;if(p.days!=null&&p.days<7&&best._mx!=null)fire(best);
    VZ.open({ref:best,title:p.name,kind:GUN[p.kind].label.split(',')[0]+', '+STATE(p.days)+VZ.sizeText(p),age:VZ.ageText(p),host:p.host});}
  else VZ.close();
});
addEventListener('resize',layout);layout();requestAnimationFrame(frame);
});
