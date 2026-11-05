VZ.load(P=>{
const {h32,poly,line,box,ring,label,INK,MOTION}=VZ;
const cv=document.getElementById('cv'),ctx=cv.getContext('2d');
const BX={tanker:{label:'Big crate, one of the biggest',s:1.6},battle:{label:'Express box, big and fast',s:1.15},cargo:{label:'Pallet, big and steady',s:1.35},tug:{label:'Small parcel, small and nimble',s:0.8},speed:{label:'Priority envelope, small and quick',s:0.75},sail:{label:'Padded mailer, light and easy',s:0.85}};
const FLOOR='#f3f2ee';
const live=P.filter(p=>!p.old),stock=P.filter(p=>p.old);
const lifts=live.filter(p=>p.kind==='battle'||p.kind==='tanker').slice(0,8);
const belt=live.filter(p=>!lifts.includes(p));
document.getElementById('count').textContent=belt.length+' on the conveyor, '+lifts.length+' on forklifts, '+stock.length+' in overstock';
let W,H,DPR,T,U,TOP=80,loop={},LEN,head=0,fork=[],docks=[],racks=[];
function resize(){DPR=Math.min(window.devicePixelRatio||1,2);W=innerWidth;H=innerHeight;cv.width=W*DPR;cv.height=H*DPR;T=Math.max(0.85,Math.min(1.3,Math.min(W,H)/360));
  loop={x:W*0.1,y:TOP+H*0.06,w:W*0.8,h:H*0.58,r:W*0.12,bw:13*T};LEN=2*(loop.w+loop.h-4*loop.r)+2*Math.PI*loop.r;U=Math.min(10*T,LEN/belt.length*0.62);
  docks=[0,1,2,3].map(i=>({x:W*(0.14+i*0.24),y:H-30*T}));racks=[0,1,2,3,4].map(i=>({x:loop.x+loop.w*0.18,y:loop.y+loop.h*(0.18+i*0.15),w:loop.w*0.64,h:10*T}));
  fork=lifts.map((p,i)=>({p,x:docks[i%4].x,y:docks[i%4].y-30*T,tgt:null,state:'go',wait:0,th:-Math.PI/2,seed:h32(p.name,170)}));}
function onLoop(s){const {x,y,w,h,r}=loop;const segs=[w-2*r,Math.PI*r/2,h-2*r,Math.PI*r/2,w-2*r,Math.PI*r/2,h-2*r,Math.PI*r/2];s=((s%LEN)+LEN)%LEN;let i=0;while(s>segs[i]){s-=segs[i];i++;}
  if(i===0)return[x+r+s,y,0];if(i===1){const a=-Math.PI/2+s/r;return[x+w-r+Math.cos(a)*r,y+r+Math.sin(a)*r,a+Math.PI/2];}if(i===2)return[x+w,y+r+s,Math.PI/2];if(i===3){const a=s/r;return[x+w-r+Math.cos(a)*r,y+h-r+Math.sin(a)*r,a+Math.PI/2];}
  if(i===4)return[x+w-r-s,y+h,Math.PI];if(i===5){const a=Math.PI/2+s/r;return[x+r+Math.cos(a)*r,y+h-r+Math.sin(a)*r,a+Math.PI/2];}if(i===6)return[x,y+h-r-s,-Math.PI/2];const a=Math.PI+s/r;return[x+r+Math.cos(a)*r,y+r+Math.sin(a)*r,a+Math.PI/2];}
function parcel(c,kind,s,col,old){c.lineWidth=1.1;const a=s/2;c.fillStyle=FLOOR;c.fillRect(-a,-a,s,s);
  if(old){c.setLineDash([2,2]);box(c,-a,-a,a,a,col);c.setLineDash([]);line(c,-a,-a,a,a,col);line(c,a,-a,-a,a,col);return;}
  box(c,-a,-a,a,a,col);if(kind==='cargo'){for(let k=1;k<3;k++)line(c,-a,-a+k*s/3,a,-a+k*s/3,col);}else if(kind==='speed'||kind==='sail'){line(c,-a,-a,0,0,col);line(c,a,-a,0,0,col);}else{line(c,0,-a,0,a,col);if(kind==='tanker'){line(c,-a,0,a,0,col);box(c,-a*0.8,-a*0.8,-a*0.3,-a*0.4,col);}else box(c,a*0.2,a*0.3,a*0.8,a*0.7,col);}}
function forklift(c,f,t){const L=16*T,w=9*T;c.lineWidth=1.1;box(c,-L*0.5,-w/2,L*0.2,w/2,INK);box(c,-L*0.42,-w*0.35,-L*0.05,w*0.35,'rgba(18,58,74,.6)');ring(c,-L*0.22,0,w*0.18,INK);line(c,L*0.2,-w*0.35,L*0.62,-w*0.35,INK);line(c,L*0.2,w*0.35,L*0.62,w*0.35,INK);if(Math.sin(t*6+f.seed*9)>0)ring(c,-L*0.5,-w/2,1.3*T,'#e07800');}
let last=performance.now();
function frame(now){
  const dt=Math.min(0.05,(now-last)/1000)*MOTION,t=now/1000;last=now;
  ctx.setTransform(DPR,0,0,DPR,0,0);ctx.fillStyle=FLOOR;ctx.fillRect(0,0,W,H);
  ctx.strokeStyle='rgba(18,58,74,.07)';ctx.lineWidth=1;for(let x=0;x<W;x+=40*T){line(ctx,x,TOP,x,H,ctx.strokeStyle);}for(let y=TOP;y<H;y+=40*T)line(ctx,0,y,W,y,'rgba(18,58,74,.07)');
  ctx.lineWidth=1.3;for(const r of racks){box(ctx,r.x,r.y,r.x+r.w,r.y+r.h,'rgba(18,58,74,.55)');for(let x=r.x;x<r.x+r.w;x+=r.h*1.2){box(ctx,x+1.5,r.y+1.5,x+r.h*1.2-1.5,r.y+r.h-1.5,'rgba(138,117,80,.6)');}}
  label(ctx,'Racking',loop.x+loop.w/2,racks[0].y-4*T,'center',9.5*T);
  ctx.lineWidth=1.2;for(const sd of [-1,1]){ctx.strokeStyle='rgba(18,58,74,.6)';ctx.beginPath();for(let s=0;s<=LEN;s+=4){const [x,y,a]=onLoop(s);const X=x-Math.sin(a)*sd*loop.bw/2,Y=y+Math.cos(a)*sd*loop.bw/2;if(s===0)ctx.moveTo(X,Y);else ctx.lineTo(X,Y);}ctx.closePath();ctx.stroke();}
  head+=dt*26*T;const ro=head%(6*T);ctx.strokeStyle='rgba(18,58,74,.2)';ctx.lineWidth=1;for(let s=ro;s<LEN;s+=6*T){const [x,y,a]=onLoop(s);const nx=-Math.sin(a)*loop.bw/2,ny=Math.cos(a)*loop.bw/2;ctx.beginPath();ctx.moveTo(x-nx,y-ny);ctx.lineTo(x+nx,y+ny);ctx.stroke();}
  const gap=LEN/belt.length;belt.forEach((p,i)=>{const [x,y,a]=onLoop(head+i*gap);const s=U*BX[p.kind].s*Math.min(1.2,p.sizeF);p._x=x;p._y=y;p._L=s;ctx.save();ctx.translate(x,y);ctx.rotate(a);parcel(ctx,p.kind,s,p.color,false);ctx.restore();});
  const sx=loop.x+loop.w*0.5,sy=loop.y;ctx.lineWidth=1.3;box(ctx,sx-14*T,sy-12*T,sx+14*T,sy+12*T,'rgba(18,58,74,.5)');const scanY=sy-10*T+((t*30)%(20*T));line(ctx,sx-14*T,scanY,sx+14*T,scanY,'#d93636');label(ctx,'Scanner',sx,sy-16*T,'center',9.5*T);
  for(const d of docks){box(ctx,d.x-20*T,H-24*T,d.x+20*T,H,'rgba(18,58,74,.55)');for(let k=1;k<4;k++)line(ctx,d.x-20*T,H-24*T+k*6*T,d.x+20*T,H-24*T+k*6*T,'rgba(18,58,74,.25)');}
  label(ctx,'Loading docks',W*0.5,H-28*T,'center',9.5*T);
  const ox=W*0.02,oy=TOP-2*T,ow=W*0.3;label(ctx,'Overstock, 90 days or more',W*0.98,oy+6*T,'right',9.5*T);
  stock.forEach((p,i)=>{const s=9*T,x=W*0.98-s/2-(i%13)*(s+2*T),y=oy+16*T;p._x=x;p._y=y;p._L=s;ctx.save();ctx.translate(x,y);parcel(ctx,p.kind,s,p.color,true);ctx.restore();});
  for(const f of fork){if(f.state==='wait'){f.wait-=dt;if(f.wait<=0)f.state='go';}else{if(!f.tgt){const pick=Math.random()<0.5;if(pick){const d=docks[Math.floor(Math.random()*4)];f.tgt={x:d.x,y:H-36*T};}else{const r=racks[Math.floor(Math.random()*racks.length)];f.tgt={x:r.x+Math.random()*r.w,y:r.y+r.h+10*T};}}
      const dx=f.tgt.x-f.x,dy=f.tgt.y-f.y,d=Math.hypot(dx,dy),want=Math.atan2(dy,dx);f.th+=Math.max(-dt*3,Math.min(dt*3,((want-f.th+Math.PI*3)%(Math.PI*2))-Math.PI));const v=34*T;if(d>4){f.x+=Math.cos(f.th)*v*dt;f.y+=Math.sin(f.th)*v*dt;}else{f.tgt=null;f.state='wait';f.wait=1+Math.random()*2;}}
    ctx.save();ctx.translate(f.x,f.y);ctx.rotate(f.th);forklift(ctx,f,t);ctx.save();ctx.translate(16*T*0.42,0);const s=U*BX[f.p.kind].s*1.1;parcel(ctx,f.p.kind,s,f.p.color,false);ctx.restore();ctx.restore();f._x=f.x+Math.cos(f.th)*7*T;f._y=f.y+Math.sin(f.th)*7*T;f._L=14*T;}
  const sl=VZ.sel;if(sl&&sl.ref)VZ.selRing(ctx,sl.ref._x,sl.ref._y,Math.max(10,sl.ref._L));
  requestAnimationFrame(frame);
}
cv.addEventListener('pointerdown',e=>{let best=null,bd=1e9;const X=e.clientX,Y=e.clientY;
  const test=(o,p,how)=>{if(o._x==null)return;const d=Math.hypot(X-o._x,Y-o._y);if(d<Math.max(o._L,12)&&d<bd){bd=d;best=[o,p,how];}};
  for(const p of belt)test(p,p,'on the conveyor');for(const f of fork)test(f,f.p,'on a forklift');for(const p of stock)test(p,p,'in overstock');
  if(best){const [o,p,how]=best;VZ.open({ref:o,title:p.name,kind:BX[p.kind].label.split(',')[0]+', '+how+VZ.sizeText(p),age:VZ.ageText(p),host:p.host});}else VZ.close();});
addEventListener('resize',resize);resize();requestAnimationFrame(frame);
});
