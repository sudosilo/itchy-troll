VZ.load(P=>{
const {h32,poly,line,box,ring,label,INK,MOTION}=VZ;
const cv=document.getElementById('cv'),ctx=cv.getContext('2d');
const SP={tanker:{label:'Walrus, one of the biggest',L:40,v:5,zone:'ice'},battle:{label:'Orca, big and fast',L:46,v:30,zone:'sea'},cargo:{label:'Polar bear, big and steady',L:34,v:10,zone:'ice'},tug:{label:'Penguin, marching in line',L:12,v:11,zone:'line'},speed:{label:'Sea lion, small and quick',L:24,v:34,zone:'sea'},sail:{label:'Puffin, light and easy',L:12,v:28,zone:'sky'}};
const live=P.filter(p=>!p.old),frozen=P.filter(p=>p.old);
document.getElementById('count').textContent=live.length+' on the ice and in the sea, '+frozen.length+' frozen in the iceberg';
let W,H,DPR,S,T,bg;const ICE='#fbfdfe',SEA='#e6f1f5';
const iceX=y=>W*(0.5+0.07*Math.sin(y/H*6.28*1.3+0.5)+0.03*Math.sin(y/H*6.28*4.1));
const cr=live.map(p=>({p,x:h32(p.name,100),y:h32(p.name,101),th:h32(p.name,102)*6.28,ph:h32(p.name,103)*6,wob:h32(p.name,104)*6,turn:0,turnT:0,idle:0,v:SP[p.kind].v*(0.85+p.speed*0.3)}));
const pens=cr.filter(c=>c.p.kind==='tug');const lines=[];const per=7;
for(let i=0;i<pens.length;i+=per)lines.push({members:pens.slice(i,i+per),x:0.08+h32('ln'+i,1)*0.28,y:0.15+h32('lm'+i,2)*0.7,th:h32('lt'+i,3)*6.28,turn:0,turnT:0,trail:[]});
const floes=[...Array(7)].map((_,i)=>({x:h32('fx'+i,1),y:h32('fy'+i,2),r:14+h32('fr'+i,3)*22,rot:h32('fo'+i,4)*6,v:0.004+h32('fv'+i,5)*0.006}));
const snow=[...Array(50)].map((_,i)=>({x:h32('sx'+i,1),y:h32('sy'+i,2),v:0.015+h32('sv'+i,3)*0.02}));
function build(){
  bg=document.createElement('canvas');bg.width=W*DPR;bg.height=H*DPR;const g=bg.getContext('2d');g.scale(DPR,DPR);
  g.fillStyle=SEA;g.fillRect(0,0,W,H);g.beginPath();g.moveTo(0,0);for(let y=0;y<=H;y+=6)g.lineTo(iceX(y),y);g.lineTo(0,H);g.closePath();g.fillStyle=ICE;g.fill();
  g.strokeStyle='rgba(18,58,74,.7)';g.lineWidth=1.4;g.beginPath();for(let y=0;y<=H;y+=6){if(y===0)g.moveTo(iceX(y),y);else g.lineTo(iceX(y),y);}g.stroke();
  g.strokeStyle='rgba(18,58,74,.18)';g.lineWidth=1;for(let i=0;i<26;i++){const x=h32('cx'+i,1)*W*0.5,y=h32('cy'+i,2)*H,l=8+h32('cl'+i,3)*20;g.beginPath();g.moveTo(x,y);g.lineTo(x+l*0.6,y+l*0.3);g.lineTo(x+l,y+l*0.1);g.stroke();}
  g.strokeStyle='#c3dfe6';for(let i=0;i<50;i++){const y=h32('wy'+i,9)*H,x0=iceX(y)+8,x=x0+h32('wx'+i,10)*(W-x0),s=3+h32('ws'+i,11)*4;if(x>W-3)continue;g.beginPath();g.moveTo(x-s,y);g.lineTo(x-s/2,y-s*0.35);g.lineTo(x,y);g.lineTo(x+s/2,y-s*0.35);g.lineTo(x+s,y);g.stroke();}
  const ix=W*0.7,iy=H*0.66,iw=W*0.27,ih=H*0.24;bg.ice={x:ix,y:iy,w:iw,h:ih};
  const pts=[[0.1,0],[0.6,0.04],[1,0.22],[0.95,0.7],[0.6,1],[0.15,0.92],[0,0.5]];g.fillStyle=ICE;g.beginPath();pts.forEach((p,i)=>{const x=ix+p[0]*iw,y=iy+p[1]*ih;if(i)g.lineTo(x,y);else g.moveTo(x,y);});g.closePath();g.fill();g.strokeStyle='rgba(18,58,74,.6)';g.lineWidth=1.3;g.stroke();
  g.strokeStyle='rgba(18,58,74,.2)';g.beginPath();pts.forEach((p,i)=>{const x=ix+iw*(0.5+(p[0]-0.5)*0.8),y=iy+ih*(0.5+(p[1]-0.5)*0.8);if(i)g.lineTo(x,y);else g.moveTo(x,y);});g.closePath();g.stroke();
}
function resize(){DPR=Math.min(window.devicePixelRatio||1,2);W=innerWidth;H=innerHeight;cv.width=W*DPR;cv.height=H*DPR;T=Math.max(0.85,Math.min(1.3,Math.min(W,H)/360));S=Math.max(0.8,Math.min(1.4,Math.sqrt(W*H/(live.length*2600))));build();
  const ic=bg.ice;frozen.forEach((p,i)=>{const cols=4;p._x=ic.x+ic.w*(0.18+(i%cols)*0.21);p._y=ic.y+ic.h*(0.2+Math.floor(i/cols)*0.2);p._L=13*T;});}
function onIce(x,y,m){return x<iceX(y)-m&&x>m&&y>m+60&&y<H-m;}
function inSea(x,y,m){const ic=bg.ice;if(x>ic.x-m&&x<ic.x+ic.w+m&&y>ic.y-m&&y<ic.y+ic.h+m)return false;return x>iceX(y)+m&&x<W-m&&y>m&&y<H-m;}
function adiff(a,b){let d=a-b;while(d>Math.PI)d-=6.283;while(d<-Math.PI)d+=6.283;return d;}
function penguin(c,L,col,ph){c.rotate(Math.sin(ph*2)*0.12);c.fillStyle=ICE;c.beginPath();c.ellipse(0,0,L*0.42,L*0.3,0,0,6.283);c.fill();c.strokeStyle=col;c.stroke();c.beginPath();c.ellipse(-L*0.05,0,L*0.22,L*0.16,0,0,6.283);c.stroke();ring(c,L*0.42,0,L*0.18,col);poly(c,[[L*0.58,-L*0.06],[L*0.75,0],[L*0.58,L*0.06]],'#e07800');const f=Math.sin(ph*3)*0.3;line(c,0,-L*0.28,-L*0.15,-L*0.45-f*L*0.1,col);line(c,0,L*0.28,-L*0.15,L*0.45+f*L*0.1,col);}
function bear(c,L,col,ph){for(const [x,s] of [[L*0.22,1],[L*0.22,-1],[-L*0.22,1],[-L*0.22,-1]]){const o=Math.sin(ph+(x>0?0:Math.PI)+(s>0?0:Math.PI))*L*0.06;c.fillStyle=ICE;c.beginPath();c.ellipse(x+o,s*L*0.2,L*0.07,L*0.05,0,0,6.283);c.fill();c.strokeStyle=col;c.stroke();}
  c.fillStyle=ICE;c.beginPath();c.ellipse(0,0,L*0.36,L*0.18,0,0,6.283);c.fill();c.strokeStyle=col;c.stroke();c.beginPath();c.ellipse(L*0.42,0,L*0.12,L*0.09,0,0,6.283);c.fill();c.stroke();ring(c,L*0.38,-L*0.08,L*0.03,col);ring(c,L*0.38,L*0.08,L*0.03,col);ring(c,L*0.54,0,Math.max(0.8,L*0.02),col);}
function walrus(c,L,col,ph){const s=1+Math.sin(ph)*0.04;c.fillStyle=ICE;c.beginPath();c.ellipse(0,0,L*0.4*s,L*0.2/s,0,0,6.283);c.fill();c.strokeStyle=col;c.stroke();ring(c,L*0.4,0,L*0.12,col);line(c,L*0.48,-L*0.04,L*0.66,-L*0.05,col);line(c,L*0.48,L*0.04,L*0.66,L*0.05,col);for(const s2 of [1,-1]){poly(c,[[L*0.15,s2*L*0.18],[L*0.05,s2*L*0.34],[-L*0.02,s2*L*0.2]],col);}poly(c,[[-L*0.38,0],[-L*0.55,-L*0.12],[-L*0.55,L*0.12]],col);}
function swimmer(c,kind,L,col,ph){const w=Math.sin(ph)*0.35;c.strokeStyle=col;c.fillStyle=SEA;
  c.beginPath();c.ellipse(0,0,L*0.42,L*(kind==='battle'?0.12:0.09),0,0,6.283);c.fill();c.stroke();
  if(kind==='battle'){line(c,L*0.05,0,-L*0.08,0,col);c.beginPath();c.ellipse(L*0.25,-L*0.06,L*0.06,L*0.025,0,0,6.283);c.stroke();for(const s of [1,-1])poly(c,[[L*0.12,s*L*0.1],[0,s*L*0.24],[-L*0.02,s*L*0.1]],col);}
  else{ring(c,L*0.36,0,L*0.08,col);for(const s of [1,-1])poly(c,[[L*0.12,s*L*0.08],[0,s*L*0.2],[-L*0.02,s*L*0.07]],col);}
  c.save();c.translate(-L*0.42,0);c.rotate(w);poly(c,[[0,0],[-L*0.14,-L*0.14],[-L*0.08,0],[-L*0.14,L*0.14]],col);c.restore();}
function puffin(c,L,col,ph){const f=0.6+0.4*Math.sin(ph*5);c.strokeStyle=col;c.fillStyle=SEA;c.beginPath();c.ellipse(0,0,L*0.32,L*0.14,0,0,6.283);c.stroke();ring(c,L*0.32,0,L*0.1,col);poly(c,[[L*0.4,-L*0.05],[L*0.56,0],[L*0.4,L*0.05]],'#e07800');for(const s of [1,-1])poly(c,[[L*0.08,s*L*0.1],[-L*0.05,s*L*0.6*f],[-L*0.15,s*L*0.1]],col);}
let last=performance.now();
function frame(now){
  const dt=Math.min(0.05,(now-last)/1000)*MOTION,t=now/1000;last=now;
  ctx.setTransform(DPR,0,0,DPR,0,0);ctx.drawImage(bg,0,0,W,H);ctx.lineJoin='round';ctx.lineCap='round';
  for(const f of floes){f.y=(f.y+f.v*dt)%1.1;const y=f.y*H*1.1-H*0.05,x0=iceX(y)+20,x=x0+f.x*(W-x0-10),r=f.r*T;ctx.fillStyle=ICE;ctx.strokeStyle='rgba(18,58,74,.5)';ctx.lineWidth=1.2;ctx.beginPath();for(let k=0;k<7;k++){const a=f.rot+k/7*6.283,rr=r*(0.75+0.3*h32('fl'+k,f.r|0));if(k)ctx.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr*0.7);else ctx.moveTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr*0.7);}ctx.closePath();ctx.fill();ctx.stroke();}
  const ic=bg.ice;ctx.lineWidth=1.1;frozen.forEach(p=>{ctx.save();ctx.translate(p._x,p._y);ctx.globalAlpha=0.75;const k=p.kind,L=p._L*1.3;if(k==='tug')penguin(ctx,L,p.color,0);else if(k==='battle'||k==='speed')swimmer(ctx,k,L*1.4,p.color,0);else if(k==='sail')puffin(ctx,L,p.color,0);else if(k==='tanker')walrus(ctx,L*1.3,p.color,0);else bear(ctx,L*1.2,p.color,0);ctx.restore();});ctx.globalAlpha=1;
  label(ctx,'Iceberg, 90 days or more',ic.x+ic.w,ic.y+ic.h+14*T,'right',10*T);label(ctx,'Ice shelf',W*0.04,H*0.97,'left',10*T);
  for(const ln of lines){ln.turnT-=dt;if(ln.turnT<=0){ln.turn=(Math.random()-0.5)*0.8;ln.turnT=2+Math.random()*3;}
    const x=ln.x*W,y=ln.y*H;let tr=ln.turn;if(!onIce(x+Math.cos(ln.th)*30*T,y+Math.sin(ln.th)*30*T,24*T)){const want=Math.atan2(H*0.5-y,W*0.25-x);tr=Math.sign(adiff(want,ln.th))*1.6;}
    ln.th+=tr*dt;const v=11*T*S;ln.x+=Math.cos(ln.th)*v*dt/W;ln.y+=Math.sin(ln.th)*v*dt/H;
    ln.trail.unshift([ln.x*W,ln.y*H,ln.th]);if(ln.trail.length>600)ln.trail.pop();
    const sp=13*T*S;let acc=0,j=0;ln.members.forEach((m,i)=>{const target=i*sp;while(j<ln.trail.length-1&&acc<target){acc+=Math.hypot(ln.trail[j][0]-ln.trail[j+1][0],ln.trail[j][1]-ln.trail[j+1][1]);j++;}const q=ln.trail[Math.min(j,ln.trail.length-1)];m._px=q[0];m._py=q[1];m._th=q[2];});}
  const drawOrder=[[],[],[]];
  for(const c of cr){const sp=SP[c.p.kind],L=sp.L*c.p.sizeF*S;c.ph+=dt*(2+c.v*0.12);let x,y,th;
    if(sp.zone==='line'){x=c._px;y=c._py;th=c._th;if(x==null)continue;}
    else{c.turnT-=dt;if(c.turnT<=0){c.turn=(Math.random()-0.5)*(sp.zone==='sky'?0.6:1.2);c.turnT=1.5+Math.random()*3;if(sp.zone==='ice'&&Math.random()<0.25)c.idle=1.5+Math.random()*2;}
      x=c.x*W;y=c.y*H;let tr=c.turn;const nx=x+Math.cos(c.th)*L,ny=y+Math.sin(c.th)*L;
      const ok=sp.zone==='ice'?onIce(nx,ny,12*T):sp.zone==='sea'?inSea(nx,ny,10*T):(nx>10&&nx<W-10&&ny>80&&ny<H-10);
      if(!ok){const want=sp.zone==='ice'?Math.atan2(H*0.55-y,W*0.25-x):sp.zone==='sea'?Math.atan2(H*0.35-y,W*0.85-x):Math.atan2(H*0.5-y,W*0.5-x);tr=Math.sign(adiff(want,c.th))*2.2;c.idle=0;}
      c.th+=tr*dt;if(c.idle>0)c.idle-=dt;const v=(c.idle>0?0:c.v)*T*S;c.x+=Math.cos(c.th)*v*dt/W;c.y+=Math.sin(c.th)*v*dt/H;th=c.th;
      if(sp.zone==='ice'&&!onIce(c.x*W,c.y*H,0)){c.x=0.25;c.y=0.5;}if(sp.zone==='sea'&&!inSea(c.x*W,c.y*H,0)){c.x=0.85;c.y=0.3;}}
    c._x=x;c._y=y;c._L=L;c._th=th;drawOrder[sp.zone==='sky'?2:sp.zone==='sea'?0:1].push(c);}
  for(const grp of drawOrder)for(const c of grp){const k=c.p.kind,L=c._L,col=c.p.color;ctx.lineWidth=1.2;
    if(k==='sail'){ctx.save();ctx.translate(c._x+10*T,c._y+14*T);ctx.rotate(c._th);ctx.globalAlpha=0.12;puffin(ctx,L,INK,c.ph);ctx.restore();ctx.globalAlpha=1;}
    ctx.save();ctx.translate(c._x,c._y);ctx.rotate(c._th);
    if(k==='tug')penguin(ctx,L,col,c.ph);else if(k==='cargo')bear(ctx,L,col,c.ph);else if(k==='tanker')walrus(ctx,L,col,c.ph);else if(k==='sail')puffin(ctx,L,col,c.ph);else swimmer(ctx,k,L,col,c.ph);ctx.restore();}
  for(const s of snow){s.y+=s.v*dt;if(s.y>1)s.y=0;const x=s.x*W+Math.sin(t+s.x*20)*6,y=s.y*H;line(ctx,x-2,y,x+2,y,'rgba(18,58,74,.25)');line(ctx,x,y-2,x,y+2,'rgba(18,58,74,.25)');}
  const s=VZ.sel;if(s&&s.ref)VZ.selRing(ctx,s.ref._x,s.ref._y,s.ref._L*0.55+6);
  requestAnimationFrame(frame);
}
cv.addEventListener('pointerdown',e=>{let best=null,bd=1e9;const X=e.clientX,Y=e.clientY;
  const test=(o,p)=>{if(o._x==null)return;const d=Math.hypot(X-o._x,Y-o._y);if(d<Math.max(o._L*0.55,14)&&d<bd){bd=d;best=[o,p];}};
  for(const c of cr)test(c,c.p);for(const p of frozen)test(p,p);
  if(best){const [o,p]=best;VZ.open({ref:o,title:p.name,kind:(p.old?'Frozen in the iceberg':SP[p.kind].label)+VZ.sizeText(p),age:VZ.ageText(p),host:p.host});}else VZ.close();});
addEventListener('resize',resize);resize();requestAnimationFrame(frame);
});
