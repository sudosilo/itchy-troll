VZ.load(P=>{
const {h32,poly,line,box,ring,label,INK,MOTION}=VZ;
const cv=document.getElementById('cv'),ctx=cv.getContext('2d');
const FL={tanker:{label:'Sunflower, one of the biggest',h:1},battle:{label:'Tulip, big and fast',h:0.62},cargo:{label:'Rose bush, big and steady',h:0.55},tug:{label:'Daisy, small and nimble',h:0.4},speed:{label:'Poppy, small and quick',h:0.5},sail:{label:'Lavender, light and easy',h:0.48}};
const STAGE=d=>d==null?2:d<7?0:d<30?1:d<60?2:d<90?3:4;
const SN=['in full bloom','open','starting to close','wilting','gone to seed'];
let W,H,DPR,S,T,HOR,bg,bees=[],petals=[],flies=[];const ROWS=6;
const pl=P.map(p=>({p,row:Math.floor(h32(p.name,140)*ROWS),x:h32(p.name,141),seed:h32(p.name,142)*6,st:STAGE(p.days)}));
document.getElementById('count').textContent=pl.filter(f=>f.st===0).length+' in full bloom, '+pl.filter(f=>f.st===4).length+' gone to seed';
const rowY=r=>HOR+(H*0.9-HOR)*((r+0.6)/ROWS),rowS=r=>0.55+0.09*r;
function build(){bg=document.createElement('canvas');bg.width=W*DPR;bg.height=H*DPR;const g=bg.getContext('2d');g.scale(DPR,DPR);
  g.fillStyle='#f7f9fa';g.fillRect(0,0,W,HOR);g.fillStyle='#f6f0e2';g.fillRect(0,HOR,W,H-HOR);
  g.strokeStyle='rgba(224,120,0,.55)';g.lineWidth=1.2;g.beginPath();g.arc(W*0.82,HOR*0.4,14*T,0,6.283);g.stroke();
  g.strokeStyle='rgba(18,58,74,.5)';for(let x=4;x<W;x+=12*T){g.beginPath();g.moveTo(x,HOR+2);g.lineTo(x,HOR-22*T);g.lineTo(x+3*T,HOR-26*T);g.lineTo(x+6*T,HOR-22*T);g.lineTo(x+6*T,HOR+2);g.stroke();}
  g.beginPath();g.moveTo(0,HOR-7*T);g.lineTo(W,HOR-7*T);g.moveTo(0,HOR-17*T);g.lineTo(W,HOR-17*T);g.stroke();
  for(let r=0;r<ROWS;r++){const y=rowY(r),s=rowS(r);g.strokeStyle='rgba(138,117,80,.55)';g.beginPath();g.moveTo(0,y+3*s*T);g.lineTo(W,y+3*s*T);g.stroke();g.strokeStyle='rgba(138,117,80,.25)';for(let x=6;x<W;x+=9*T*s){g.beginPath();g.moveTo(x,y+5*s*T);g.lineTo(x+3*s*T,y+7*s*T);g.stroke();}}
  const cx=W*0.9,cy=H*0.955;g.strokeStyle=INK;g.strokeRect(cx-14*T,cy-14*T,20*T,14*T);g.beginPath();g.moveTo(cx+6*T,cy-10*T);g.lineTo(cx+16*T,cy-18*T);g.moveTo(cx-14*T,cy-12*T);g.quadraticCurveTo(cx-24*T,cy-14*T,cx-20*T,cy-4*T);g.stroke();}
function resize(){DPR=Math.min(window.devicePixelRatio||1,2);W=innerWidth;H=innerHeight;cv.width=W*DPR;cv.height=H*DPR;HOR=H*0.22;T=Math.max(0.85,Math.min(1.3,Math.min(W,H)/360));S=Math.max(0.9,Math.min(1.6,Math.sqrt(W*H/(P.length*1500))));build();
  const green=pl.filter(f=>f.st===0);bees=[...Array(Math.min(12,green.length))].map((_,i)=>({x:Math.random()*W,y:HOR+Math.random()*(H-HOR),tgt:green[i%green.length],t:0}));
  flies=[0,1,2].map(i=>({x:Math.random()*W,y:HOR+Math.random()*H*0.5,a:Math.random()*6,c:['#2f6fd6','#e07800','#d93636'][i]}));}
function flower(c,f,hgt,s,t){const k=f.p.kind,col=f.p.color,st=f.st,sw=Math.sin(t*1.1+f.seed)*0.06*(st===4?0.5:1);
  c.lineWidth=1.15;c.lineCap='round';c.lineJoin='round';
  const droop=[0,0,0.25,0.9,0.5][st];const tx=Math.sin(sw)*hgt,ty=-Math.cos(sw)*hgt;
  c.strokeStyle=col;c.beginPath();c.moveTo(0,0);c.quadraticCurveTo(tx*0.3,ty*0.5,tx,ty);c.stroke();
  for(const sd of [1,-1]){const ly=ty*(0.3+0.15*(sd+1));poly(c,[[tx*0.3,ly],[tx*0.3+sd*7*s,ly-3*s+droop*4*s],[tx*0.3+sd*2*s,ly-6*s+droop*3*s]],col);}
  c.save();c.translate(tx,ty);c.rotate(droop*1.2+sw*2);
  const R=(k==='tanker'?9:k==='cargo'?6:k==='battle'?5:k==='speed'?5.5:k==='tug'?4.5:3)*s*f.p.sizeF;
  if(st===4){for(let i=0;i<10;i++){const a=i/10*6.283;line(c,0,0,Math.cos(a)*R*0.9,Math.sin(a)*R*0.9,col);ring(c,Math.cos(a)*R,Math.sin(a)*R,0.8,col);}c.restore();return;}
  const open=[1,0.85,0.6,0.45][st];
  if(k==='sail'){for(let i=0;i<5;i++)ring(c,0,-i*R*0.9,R*0.5*open,col);}
  else if(k==='battle'){poly(c,[[-R*0.7,0],[-R*0.8*open,-R*1.3],[-R*0.25,-R*0.9],[0,-R*1.5*open],[R*0.25,-R*0.9],[R*0.8*open,-R*1.3],[R*0.7,0],[0,R*0.4]],col);}
  else if(k==='cargo'){ring(c,0,0,R,col);for(let i=0;i<3;i++){c.strokeStyle=col;c.beginPath();c.arc(0,0,R*(0.25+i*0.22)*open,i,i+4.5);c.stroke();}}
  else{const n=k==='tug'?12:k==='tanker'?16:5;for(let i=0;i<n;i++){const a=i/n*6.283+t*0.05,pr=R*open;c.save();c.rotate(a);c.beginPath();c.ellipse(pr*0.65,0,pr*0.5,pr*(k==='speed'?0.38:0.18),0,0,6.283);c.strokeStyle=col;c.stroke();c.restore();}ring(c,0,0,R*(k==='tanker'?0.45:0.25),col);if(k==='tanker')for(let i=0;i<6;i++)ring(c,Math.cos(i)*R*0.2,Math.sin(i)*R*0.2,0.6,col);}
  c.restore();
  if(st===3&&Math.random()<0.004)petals.push({x:tx,y:ty,ox:f._bx,oy:f._by,vx:(Math.random()-0.5)*8,vy:6,life:1,col});}
let last=performance.now();
function frame(now){
  const dt=Math.min(0.05,(now-last)/1000)*MOTION,t=now/1000;last=now;
  ctx.setTransform(DPR,0,0,DPR,0,0);ctx.drawImage(bg,0,0,W,H);
  for(let r=0;r<ROWS;r++){const y=rowY(r),s=rowS(r)*S*T;for(const f of pl){if(f.row!==r)continue;const hgt=(28+FL[f.p.kind].h*44)*s*Math.min(1.3,f.p.sizeF)*[1,1,0.95,0.85,0.9][f.st];const x=f.x*W;f._bx=x;f._by=y;f._x=x;f._y=y-hgt*0.8;f._L=hgt*0.6;ctx.save();ctx.translate(x,y);flower(ctx,f,hgt,s,t);ctx.restore();}}
  for(const p of petals){p.x+=p.vx*dt;p.y+=p.vy*T*dt;p.life-=dt*0.4;ctx.globalAlpha=Math.max(0,p.life);ctx.strokeStyle=p.col;ctx.beginPath();ctx.ellipse(p.ox+p.x,p.oy+p.y,2.5*T,1.2*T,t+p.x,0,6.283);ctx.stroke();}ctx.globalAlpha=1;petals=petals.filter(p=>p.life>0);
  for(const b of bees){const g=b.tgt;if(g._x==null)continue;const dx=g._x-b.x,dy=g._y-b.y,d=Math.hypot(dx,dy);if(d>4){b.x+=dx/d*40*T*dt+Math.sin(t*9+b.y)*0.6;b.y+=dy/d*40*T*dt+Math.cos(t*8+b.x)*0.6;}else{b.t+=dt;if(b.t>2){const gs=pl.filter(f=>f.st===0);b.tgt=gs[Math.floor(Math.random()*gs.length)];b.t=0;}}
    ctx.lineWidth=1;ctx.strokeStyle=INK;ctx.beginPath();ctx.ellipse(b.x,b.y,3*T,2*T,0,0,6.283);ctx.stroke();line(ctx,b.x-1*T,b.y-2*T,b.x-1*T,b.y+2*T,'#c49a00');line(ctx,b.x+1*T,b.y-2*T,b.x+1*T,b.y+2*T,'#c49a00');const w=Math.sin(t*40)*2*T;ctx.beginPath();ctx.ellipse(b.x,b.y-3*T-w*0.3,2*T,1.2*T,0.4,0,6.283);ctx.stroke();}
  for(const f of flies){f.a+=dt*(Math.sin(t*0.7+f.x)*1.5);f.x=(f.x+Math.cos(f.a)*22*T*dt+W)%W;f.y=Math.max(HOR,Math.min(H*0.85,f.y+Math.sin(f.a)*22*T*dt));const o=Math.abs(Math.sin(t*10+f.x))*5*T;ctx.strokeStyle=f.c;ctx.beginPath();ctx.ellipse(f.x-o*0.6,f.y,o,4*T,0,0,6.283);ctx.ellipse(f.x+o*0.6,f.y,o,4*T,0,0,6.283);ctx.stroke();}
  label(ctx,'Watering can',W*0.9-4*T,H*0.955+10*T,'center',9.5*T);
  const s=VZ.sel;if(s&&s.ref)VZ.selRing(ctx,s.ref._x,s.ref._y,Math.max(12,s.ref._L*0.5));
  requestAnimationFrame(frame);
}
cv.addEventListener('pointerdown',e=>{let best=null,bd=1e9;const X=e.clientX,Y=e.clientY;
  for(const f of pl){if(f._x==null)continue;const d=Math.hypot(X-f._x,Y-f._y);if(d<Math.max(f._L*0.45,14)&&d<bd){bd=d;best=f;}}
  if(best){const p=best.p;VZ.open({ref:best,title:p.name,kind:FL[p.kind].label.split(',')[0]+', '+SN[best.st]+VZ.sizeText(p),age:VZ.ageText(p),host:p.host});}else VZ.close();});
addEventListener('resize',resize);resize();requestAnimationFrame(frame);
});
