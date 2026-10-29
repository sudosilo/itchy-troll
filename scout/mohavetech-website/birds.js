VZ.load(P=>{
const {h32,poly,line,box,ring,label,INK,MOTION}=VZ;
const cv=document.getElementById('cv'),ctx=cv.getContext('2d');
const B={tanker:{label:'Turkey, one of the biggest',L:34,bh:.55,bl:.7,ll:.32,hs:.11,tail:'fan',v:7,snood:1},
battle:{label:'Rooster, big and fast',L:26,bh:.42,bl:.6,ll:.4,hs:.13,tail:'sickle',comb:1,v:20},
cargo:{label:'Pheasant, big and steady',L:30,bh:.3,bl:.55,ll:.3,hs:.11,tail:'long',v:10},
tug:{label:'Chick, small and nimble',L:11,bh:.6,bl:.7,ll:.28,hs:.28,tail:'none',v:12,hop:1},
speed:{label:'Hen, small and quick',L:20,bh:.45,bl:.62,ll:.3,hs:.15,tail:'hen',comb:1,v:22,zoom:1},
sail:{label:'Duck, light and easy',L:20,bh:.36,bl:.72,ll:.16,hs:.15,tail:'duck',v:9,bill:1}};
const walk=P.filter(p=>!p.old),eggs=P.filter(p=>p.old);
document.getElementById('count').textContent=walk.length+' in the yard, '+eggs.length+' eggs in the nest';
const ROWS=6;let W,H,DPR,S,T,HOR,bg;
const rowY=r=>H*(0.34+r*0.1),rowS=r=>0.62+0.08*r;
const bs=walk.map(p=>({p,row:Math.floor(h32(p.name,70)*ROWS),x:h32(p.name,71),dir:h32(p.name,72)>0.5?1:-1,ph:h32(p.name,73)*6,wob:h32(p.name,74)*6,peck:0,peckT:2+h32(p.name,75)*6,flipT:4+h32(p.name,76)*8,v:B[p.kind].v*(0.85+p.speed*0.3)}));
function build(){
  bg=document.createElement('canvas');bg.width=W*DPR;bg.height=H*DPR;const g=bg.getContext('2d');g.scale(DPR,DPR);
  g.fillStyle='#f7f9fa';g.fillRect(0,0,W,HOR);g.fillStyle='#f6f0e2';g.fillRect(0,HOR,W,H-HOR);
  g.strokeStyle='rgba(224,120,0,.6)';g.lineWidth=1.2;g.beginPath();g.arc(W*0.84,HOR*0.45,13*T,0,6.283);g.stroke();
  g.strokeStyle='#8a7550';g.lineWidth=1.3;g.beginPath();g.moveTo(0,HOR);g.lineTo(W,HOR);g.stroke();
  const cx=W*0.06,cw=70*T,ch=34*T;g.strokeStyle='#d93636';g.lineWidth=1.2;g.beginPath();g.moveTo(cx,HOR);g.lineTo(cx,HOR-ch);g.lineTo(cx+cw/2,HOR-ch-20*T);g.lineTo(cx+cw,HOR-ch);g.lineTo(cx+cw,HOR);g.stroke();
  g.strokeRect(cx+cw*0.6,HOR-16*T,10*T,16*T);g.beginPath();g.moveTo(cx+cw*0.6+10*T,HOR-2*T);g.lineTo(cx+cw+24*T,HOR+8*T);g.stroke();
  for(let k=1;k<5;k++){const u=k/5;g.beginPath();g.moveTo(cx+cw*0.6+10*T+u*(14*T+cw*0.4),HOR-2*T+u*10*T);g.lineTo(cx+cw*0.6+10*T+u*(14*T+cw*0.4),HOR-2*T+u*10*T+3*T);g.stroke();}
  g.strokeStyle='rgba(18,58,74,.5)';for(let x=W*0.4;x<W;x+=12*T){g.beginPath();g.moveTo(x,HOR+1);g.lineTo(x,HOR-18*T);g.stroke();}g.beginPath();g.moveTo(W*0.4,HOR-6*T);g.lineTo(W,HOR-6*T);g.moveTo(W*0.4,HOR-14*T);g.lineTo(W,HOR-14*T);g.stroke();
  g.strokeStyle='#c49a00';for(let i=0;i<Math.round(W*H/1800);i++){const x=h32('fd'+i,1)*W,y=HOR+8+h32('fe'+i,2)*(H*0.88-HOR);g.beginPath();g.arc(x,y,0.7,0,6.283);g.stroke();}
  const ny=H*0.955,nw=W*0.9/Math.max(1,eggs.length);g.strokeStyle='rgba(18,58,74,.55)';
  for(let i=0;i<eggs.length;i++){const x=W*0.05+i*nw;g.strokeRect(x+1,ny-14*T,nw-2,16*T);g.strokeStyle='#c49a00';g.beginPath();g.arc(x+nw/2,ny-2*T,nw*0.36,0.15,Math.PI-0.15);g.stroke();g.strokeStyle='rgba(18,58,74,.55)';}
}
function resize(){DPR=Math.min(window.devicePixelRatio||1,2);W=innerWidth;H=innerHeight;cv.width=W*DPR;cv.height=H*DPR;HOR=H*0.25;T=Math.max(0.85,Math.min(1.3,Math.min(W,H)/360));S=Math.max(0.9,Math.min(1.8,Math.sqrt(W*H/(walk.length*1100))));
  const nw=W*0.9/Math.max(1,eggs.length);eggs.forEach((p,i)=>{p._x=W*0.05+i*nw+nw/2;p._y=H*0.955-9*T;p._L=Math.min(nw*0.7,14*T);});build();}
function bird(c,sp,L,col,ph,t,peck,fan){
  c.lineWidth=1.2;c.lineJoin='round';c.lineCap='round';
  const rx=sp.bl*L/2,ry=sp.bh*L/2,ll=sp.ll*L,by=-(ll+ry*0.8),hs=sp.hs*L;
  for(const off of [0,Math.PI]){const hx=off?-rx*0.12:rx*0.12,hy=by+ry*0.7,fx=hx+Math.sin(ph+off)*ll*0.35,fy=-Math.max(0,Math.cos(ph+off))*ll*0.18;c.globalAlpha=off?0.5:1;line(c,hx,hy,fx,fy,col);line(c,fx,fy,fx+L*0.08,fy,col);line(c,fx,fy,fx+L*0.05,fy-L*0.03,col);}
  c.globalAlpha=1;
  const tx=-rx*0.8,ty=by-ry*0.2;c.strokeStyle=col;c.beginPath();
  if(sp.tail==='fan'){const R=L*0.42*(0.55+0.45*fan);for(let i=0;i<=10;i++){const a=Math.PI*(0.55+i*0.09);c.moveTo(tx,ty);c.lineTo(tx+Math.cos(a)*R,ty-Math.abs(Math.sin(a))*R);}c.moveTo(tx+Math.cos(Math.PI*0.55)*R,ty-Math.sin(Math.PI*0.55)*R);c.arc(tx,ty,R,-Math.PI*0.45,-Math.PI*1.45,true);}
  else if(sp.tail==='sickle'){for(let k=0;k<3;k++){c.moveTo(tx,ty);c.quadraticCurveTo(tx-L*(0.15+k*0.05),ty-L*(0.45-k*0.08),tx-L*(0.32+k*0.04),ty-L*(0.05-k*0.04));}}
  else if(sp.tail==='long'){c.moveTo(tx,ty);c.lineTo(tx-L*0.55,ty-L*0.12);c.moveTo(tx,ty+2);c.lineTo(tx-L*0.5,ty-L*0.05);}
  else if(sp.tail==='hen'){c.moveTo(tx+rx*0.2,ty-ry*0.5);c.lineTo(tx-L*0.12,ty-L*0.22);c.lineTo(tx-L*0.04,ty+ry*0.2);}
  else if(sp.tail==='duck'){c.moveTo(tx,ty);c.lineTo(tx-L*0.12,ty-L*0.08);}
  c.stroke();
  c.beginPath();c.ellipse(0,by,rx,ry,-0.1,0,6.283);c.stroke();
  c.beginPath();c.arc(-rx*0.1,by-ry*0.05,ry*0.6,0.2,2.6);c.stroke();
  const nx=rx*0.7,ny=by-ry*0.6;const hx=peck?rx*1.15:rx*0.95,hy=peck?-hs*1.2:by-ry*1.1-hs*0.6;
  line(c,nx,ny,hx-hs*0.6,hy+hs*0.2,col);line(c,nx+rx*0.1,by-ry*0.1,hx-hs*0.2,hy+hs*0.8,col);
  ring(c,hx,hy,hs,col);ring(c,hx+hs*0.35,hy-hs*0.2,Math.max(0.6,hs*0.12),col);
  if(sp.bill)box(c,hx+hs*0.8,hy-hs*0.1,hx+hs*1.9,hy+hs*0.35,col);else poly(c,[[hx+hs*0.85,hy-hs*0.25],[hx+hs*1.7,hy+hs*0.1],[hx+hs*0.85,hy+hs*0.35]],col);
  if(sp.comb){c.strokeStyle=col;c.beginPath();for(let k=0;k<3;k++)c.arc(hx-hs*0.4+k*hs*0.45,hy-hs*0.95,hs*0.25,Math.PI,0);c.stroke();c.beginPath();c.ellipse(hx+hs*0.7,hy+hs*0.75,hs*0.18,hs*0.35,0,0,6.283);c.stroke();}
  if(sp.snood){line(c,hx+hs*0.9,hy-hs*0.3,hx+hs*1.3,hy+hs*1.2,col);c.beginPath();c.ellipse(hx+hs*0.5,hy+hs*1.2,hs*0.25,hs*0.55,0,0,6.283);c.stroke();}
}
let last=performance.now();
function frame(now){
  const dt=Math.min(0.05,(now-last)/1000)*MOTION,t=now/1000;last=now;
  ctx.setTransform(DPR,0,0,DPR,0,0);ctx.drawImage(bg,0,0,W,H);
  for(let r=0;r<ROWS;r++){const gy=rowY(r),rs=rowS(r);
    for(const b of bs){if(b.row!==r)continue;const sp=B[b.p.kind],L=sp.L*b.p.sizeF*S*rs;
      b.peckT-=dt;if(b.peckT<=0){b.peck=0.7;b.peckT=3+Math.random()*6;}if(b.peck>0)b.peck-=dt;
      let v=b.peck>0?0:b.v;if(sp.zoom)v*=0.4+1.5*Math.pow(Math.max(0,Math.sin(t*0.5+b.wob)),2);
      let hop=0;if(sp.hop){hop=-Math.pow(Math.max(0,Math.sin(t*3+b.wob)),6)*L*0.5;b.flipT-=dt;if(b.flipT<=0){b.dir*=-1;b.flipT=4+Math.random()*7;}}
      b.x+=b.dir*v*T*rs*dt/W;const m=L/W+0.04;if(b.x>1+m)b.x=-m;if(b.x<-m)b.x=1+m;
      if(v>0)b.ph+=dt*(2+v*0.25);
      const x=b.x*W,y=gy+hop;b._x=x;b._y=y-L*0.4;b._L=L;
      ctx.save();ctx.translate(x,y);ctx.scale(b.dir,1);bird(ctx,sp,L,b.p.color,b.ph,t,b.peck>0,0.5+0.5*Math.sin(t*0.6+b.wob));ctx.restore();}}
  ctx.lineWidth=1.2;for(const p of eggs){ctx.strokeStyle=p.color;ctx.beginPath();ctx.ellipse(p._x,p._y,p._L*0.32,p._L*0.42,0,0,6.283);ctx.stroke();}
  label(ctx,'Nest boxes, 90 days or more',W*0.05,H*0.955-20*T,'left',10*T);
  label(ctx,'Coop',W*0.06+35*T,HOR-60*T,'center',10*T);
  const s=VZ.sel;if(s&&s.ref)VZ.selRing(ctx,s.ref._x,s.ref._y,s.ref._L*0.55+6);
  requestAnimationFrame(frame);
}
cv.addEventListener('pointerdown',e=>{let best=null,bd=1e9;const X=e.clientX,Y=e.clientY;
  const test=(o,p)=>{if(o._x==null)return;const d=Math.hypot(X-o._x,Y-o._y);if(d<Math.max(o._L*0.55,14)&&d<bd){bd=d;best=[o,p];}};
  for(const b of bs)test(b,b.p);for(const p of eggs)test(p,p);
  if(best){const [o,p]=best;VZ.open({ref:o,title:p.name,kind:(p.old?'Egg in the nest':B[p.kind].label)+VZ.sizeText(p),age:VZ.ageText(p),host:p.host});}else VZ.close();});
addEventListener('resize',resize);resize();requestAnimationFrame(frame);
});
