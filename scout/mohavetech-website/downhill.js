VZ.load(P=>{
const {h32,MOTION}=VZ;
const cv=document.getElementById('cv'),ctx=VZ.wire(cv.getContext('2d'));
const MODE=document.body.dataset.scene||'bike';
const NAMES={bike:{tanker:'Tandem, one of the biggest',battle:'Road bike, big and fast',cargo:'Cargo bike, big and steady',tug:'BMX, small and nimble',speed:'Fixie, small and quick',sail:'Cruiser, light and easy'},
  cheese:{tanker:'Big chaser, one of the biggest',battle:'Sprinter, big and fast',cargo:'Rugby player, big and steady',tug:'Little kid, small and nimble',speed:'Track star, small and quick',sail:'Jogger, light and easy'}}[MODE];
const SPD=d=>d==null?0.55:d<7?1:d<30?0.82:d<60?0.66:d<90?0.5:0.35;
const TRICKS=MODE==='bike'?['pedaling','no hands','on the phone','pedaling','wheelie','pedaling']:['sprinting','arms flailing','sprinting','diving','sprinting','waving'];
let W,H,DPR,T,scroll=0,lead=0,trees=[],dust=[];
const ppl=P.map((p,i)=>({p,seed:h32(p.name,600)*6,v:SPD(p.days),u:h32(p.name,601)*2-1,trick:0,trickT:3+h32(p.name,602)*10,crash:0,next:20+h32(p.name,603)*80,y:0}));
const fresh=ppl.filter(r=>r.p.days!=null&&r.p.days<7).length;
document.getElementById('count').textContent=ppl.length+(MODE==='bike'?' riders bombing the hill':' chasing the cheese')+', '+fresh+' in front';
const roadX=y=>W/2+W*0.08*Math.sin((y+scroll)*0.004);
const roadW=()=>W*0.86;
function resize(){DPR=Math.min(devicePixelRatio||1,2);W=innerWidth;H=innerHeight;cv.width=W*DPR;cv.height=H*DPR;T=Math.max(0.8,Math.min(1.3,Math.min(W,H)/380));
  trees=[...Array(30)].map(()=>({side:Math.random()<0.5?-1:1,y:Math.random()*H,r:(10+Math.random()*12)*T,off:Math.random()}));
  ppl.forEach(r=>{r.y=target(r);});}
function target(r){const top=MODE==='cheese'?H*0.08:H*0.12,bot=MODE==='cheese'?H*0.74:H*0.92;const band=(bot-top)/5,lvl=r.v>=1?4:r.v>=0.8?3:r.v>=0.6?2:r.v>=0.45?1:0;return top+band*(lvl+0.5)+(h32(r.p.name,604)-0.5)*band*0.95;}
function hill(dt){
  const sp=420*T;scroll+=sp*dt*MOTION;
  ctx.fillStyle='#bcd8a2';ctx.fillRect(0,0,W,H);
  const rw=roadW();
  ctx.fillStyle='#d9c9a3';ctx.beginPath();for(let y=0;y<=H;y+=8)ctx.lineTo(roadX(y)-rw/2-8*T,y);for(let y=H;y>=0;y-=8)ctx.lineTo(roadX(y)+rw/2+8*T,y);ctx.fill();
  ctx.fillStyle=MODE==='bike'?'#8f9599':'#9fc585';ctx.beginPath();for(let y=0;y<=H;y+=8)ctx.lineTo(roadX(y)-rw/2,y);for(let y=H;y>=0;y-=8)ctx.lineTo(roadX(y)+rw/2,y);ctx.fill();
  if(MODE==='bike'){ctx.fillStyle='#f3f1e6';const dash=40*T,gap=30*T,o=scroll%(dash+gap);for(let y=-dash+o;y<H;y+=dash+gap){ctx.fillRect(roadX(y)-1.5*T,y,3*T,dash);}}
  else{ctx.strokeStyle='rgba(80,130,60,.35)';ctx.lineWidth=1;const o=scroll%14;for(let y=o;y<H;y+=14)for(let k=-5;k<=5;k++){const x=roadX(y)+k*rw/11;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+2,y-4*T);ctx.stroke();}}
  for(const tr of trees){tr.y+=-sp*dt*MOTION*0+0;let y=((tr.y-scroll*1)%H+H)%H;y=H-y;const x=roadX(y)+tr.side*(rw/2+tr.r+12*T+tr.off*W*0.05);ctx.fillStyle='rgba(40,60,30,.2)';ctx.beginPath();ctx.ellipse(x+4*T,y+4*T,tr.r,tr.r*0.8,0,0,6.283);ctx.fill();ctx.fillStyle=tr.off>0.5?'#5f9a4b':'#4e8a3f';ctx.beginPath();ctx.arc(x,y,tr.r,0,6.283);ctx.fill();}
}
function head(x,y,s,col){ctx.fillStyle=col;ctx.beginPath();ctx.ellipse(x,y,3.6*s,4.2*s,0,0,6.283);ctx.fill();ctx.fillStyle='rgba(255,255,255,.4)';ctx.fillRect(x-0.6*s,y-3.6*s,1.2*s,7*s);}
function bike(r,s,t){
  const k=r.p.kind,c=r.p.color,tr=TRICKS[r.trick],pd=Math.sin(t*14*r.v+r.seed);
  const L=(k==='tanker'?26:k==='cargo'?22:k==='tug'?13:17)*s;
  ctx.fillStyle='#2b2420';ctx.fillRect(-1*s,-L/2,2*s,L);
  ctx.beginPath();ctx.ellipse(0,-L/2+3*s,1.6*s,4*s,0,0,6.283);ctx.ellipse(0,L/2-3*s,1.6*s,4*s,0,0,6.283);ctx.fill();
  if(k==='cargo'){ctx.fillStyle='#a77b4a';ctx.fillRect(-5*s,L/2-12*s,10*s,8*s);}
  const riders=k==='tanker'?[-L*0.18,L*0.18]:[0];
  for(const ry of riders){
    ctx.strokeStyle='#e8b48c';ctx.lineWidth=2*s;ctx.lineCap='round';
    if(tr==='no hands'){ctx.beginPath();ctx.moveTo(-3*s,ry-2*s);ctx.lineTo(-10*s,ry-6*s);ctx.moveTo(3*s,ry-2*s);ctx.lineTo(10*s,ry-6*s);ctx.stroke();}
    else{ctx.beginPath();ctx.moveTo(-3*s,ry-2*s);ctx.lineTo(-5*s,-L/2+5*s);ctx.moveTo(3*s,ry-2*s);ctx.lineTo(tr==='on the phone'?7*s:5*s,tr==='on the phone'?ry-6*s:-L/2+5*s);ctx.stroke();}
    if(tr==='on the phone'){ctx.fillStyle='#9fd3ff';ctx.fillRect(6*s,ry-9*s,3*s,4.5*s);}
    ctx.strokeStyle='#3a3a3a';ctx.lineWidth=2.2*s;ctx.beginPath();ctx.moveTo(-3*s,ry+3*s);ctx.lineTo(-4*s,ry+6*s+pd*2*s);ctx.moveTo(3*s,ry+3*s);ctx.lineTo(4*s,ry+6*s-pd*2*s);ctx.stroke();
    ctx.fillStyle=c;ctx.beginPath();ctx.ellipse(0,ry,5*s,6.5*s,0,0,6.283);ctx.fill();
    head(0,ry-4.5*s,s,'#f2c230');
  }
  if(tr==='wheelie'){ctx.fillStyle='rgba(0,0,0,.15)';ctx.beginPath();ctx.ellipse(0,L/2+2*s,4*s,2*s,0,0,6.283);ctx.fill();}
  return L;
}
function runner(r,s,t){
  const k=r.p.kind,c=r.p.color,tr=TRICKS[r.trick],g=t*(10+8*r.v)+r.seed,sw=Math.sin(g),sc=k==='tanker'?1.35:k==='cargo'?1.2:k==='tug'?0.75:1;s*=sc;
  ctx.strokeStyle='#3a3a3a';ctx.lineWidth=2.4*s;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(-2.5*s,3*s);ctx.lineTo(-3*s,3*s+sw*7*s);ctx.moveTo(2.5*s,3*s);ctx.lineTo(3*s,3*s-sw*7*s);ctx.stroke();
  ctx.strokeStyle='#e8b48c';ctx.lineWidth=2*s;
  if(tr==='arms flailing'||tr==='waving'){const a=Math.sin(g*1.7);ctx.beginPath();ctx.moveTo(-4*s,-1*s);ctx.lineTo(-11*s,-8*s+a*5*s);ctx.moveTo(4*s,-1*s);ctx.lineTo(11*s,(tr==='waving'?-12:-8)*s-a*5*s);ctx.stroke();}
  else if(tr==='diving'){ctx.beginPath();ctx.moveTo(-3*s,-2*s);ctx.lineTo(-4*s,-13*s);ctx.moveTo(3*s,-2*s);ctx.lineTo(4*s,-13*s);ctx.stroke();}
  else{ctx.beginPath();ctx.moveTo(-4*s,-1*s);ctx.lineTo(-6*s,-1*s-sw*6*s);ctx.moveTo(4*s,-1*s);ctx.lineTo(6*s,-1*s+sw*6*s);ctx.stroke();}
  ctx.fillStyle=c;ctx.beginPath();ctx.ellipse(0,0,5*s,6*s,0,0,6.283);ctx.fill();
  ctx.fillStyle='#e8b48c';ctx.beginPath();ctx.arc(0,-6*s,3.3*s,0,6.283);ctx.fill();ctx.fillStyle='#4a3020';ctx.beginPath();ctx.arc(0,-6.5*s,3.3*s,3.3,6.1);ctx.fill();
  return 14*s;
}
function cheese(t){
  lead=H*0.88;const x=roadX(lead)+Math.sin(t*1.3)*W*0.08,b=Math.abs(Math.sin(t*3.2))*6*T,R=17*T;
  ctx.fillStyle='rgba(0,0,0,.15)';ctx.beginPath();ctx.ellipse(x,lead+R*0.6,R,R*0.35,0,0,6.283);ctx.fill();
  ctx.save();ctx.translate(x,lead-b);ctx.fillStyle='#f2c94c';ctx.beginPath();ctx.ellipse(0,0,R,R*0.55,0,0,6.283);ctx.fill();
  ctx.fillStyle='#e0a92c';ctx.beginPath();ctx.ellipse(0,R*0.12,R,R*0.42,0,0,3.1416);ctx.fill();
  ctx.fillStyle='#d79a22';for(const [a,c] of [[-0.4,0.3],[0.3,-0.2],[0.6,0.25]]){ctx.beginPath();ctx.arc(a*R,c*R*0.5,R*0.1,0,6.283);ctx.fill();}
  ctx.strokeStyle='#c98b1c';ctx.lineWidth=1.5;const rot=t*9;ctx.beginPath();ctx.moveTo(Math.cos(rot)*R*0.8,Math.sin(rot)*R*0.4);ctx.lineTo(-Math.cos(rot)*R*0.8,-Math.sin(rot)*R*0.4);ctx.stroke();
  ctx.restore();
}
let last=performance.now();
function frame(now){
  const dt=Math.min(0.05,(now-last)/1000)*MOTION,t=now/1000;last=now;
  ctx.setTransform(DPR,0,0,DPR,0,0);ctx.bg('#f3f4ef',W,H);hill(dt);
  if(MODE==='cheese')cheese(t);
  ppl.sort((a,b)=>a.y-b.y);
  for(const r of ppl){
    const s=T*(0.9+0.12*r.p.sizeF);
    r.trickT-=dt;if(r.trickT<=0){r.trick=Math.floor(Math.random()*TRICKS.length);r.trickT=2+Math.random()*6;}
    if(r.crash>0){r.crash-=dt;r.y-=420*T*dt*0.9;if(r.y<-30*T){r.crash=0;r.y=-30*T;r.rejoin=1;}}
    else{r.next-=dt;if(r.next<=0&&r.y>0&&r.y<H){r.crash=3;r.spin=0;r.next=40+Math.random()*90;for(let i=0;i<6;i++)dust.push({x:r._x,y:r._y,vx:(Math.random()-0.5)*60*T,vy:-Math.random()*40*T,life:1});}
      const tg=target(r);r.y+=(tg-r.y)*Math.min(1,dt*(r.rejoin?0.6:1.5));if(Math.abs(tg-r.y)<5)r.rejoin=0;r.y+=Math.sin(t*0.7+r.seed)*0.3;}
    const x=roadX(r.y)+r.u*roadW()*0.4+Math.sin(t*0.4+r.seed)*8*T;
    ctx.save();ctx.translate(x,r.y);
    if(r.crash>0){r.spin=(r.spin||0)+dt*8;ctx.rotate(r.spin);}
    ctx.fillStyle='rgba(0,0,0,.14)';ctx.beginPath();ctx.ellipse(3*T,4*T,8*s,10*s,0,0,6.283);ctx.fill();
    const L=MODE==='bike'?bike(r,s,t):runner(r,s,t);
    ctx.restore();
    r._x=x;r._y=r.y;r._r=Math.max(12,L*0.6);
  }
  for(const d of dust){d.life-=dt*1.4;d.x+=d.vx*dt;d.y+=d.vy*dt-420*T*dt*0.5;ctx.fillStyle='rgba(160,140,110,'+Math.max(0,d.life*0.6)+')';ctx.beginPath();ctx.arc(d.x,d.y,(1-d.life)*8*T+2,0,6.283);ctx.fill();}
  dust=dust.filter(d=>d.life>0);
  const sel=VZ.sel;if(sel&&sel.ref)VZ.selRing(ctx,sel.ref._x,sel.ref._y,sel.ref._r);
  requestAnimationFrame(frame);
}
cv.addEventListener('pointerdown',e=>{let best=null,bd=1e9;const X=e.clientX,Y=e.clientY;
  for(const r of ppl){if(r._x==null)continue;const d=Math.hypot(X-r._x,Y-r._y);if(d<Math.max(r._r,16)&&d<bd){bd=d;best=r;}}
  if(best){const p=best.p;VZ.open({ref:best,title:p.name,kind:NAMES[p.kind].split(',')[0]+', '+(best.crash>0?'wiped out':TRICKS[best.trick])+VZ.sizeText(p),age:VZ.ageText(p),host:p.host});}else VZ.close();});
addEventListener('resize',resize);resize();requestAnimationFrame(frame);
});
