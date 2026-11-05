VZ.load(P=>{
const {h32,poly,line,box,ring,label,INK,MOTION}=VZ;
const cv=document.getElementById('cv'),ctx=cv.getContext('2d');
const SK={tanker:{label:'Python, one of the biggest',n:44,v:22,r:4.2},battle:{label:'Racer snake, big and fast',n:30,v:48,r:3.2},cargo:{label:'Boa, big and steady',n:32,v:18,r:3.8},tug:{label:'Garter snake, small and nimble',n:14,v:34,r:2.4},speed:{label:'Whip snake, small and quick',n:18,v:56,r:2.2},sail:{label:'Grass snake, light and easy',n:12,v:24,r:2.4}};
const live=P.filter(p=>!p.old),dead=P.filter(p=>p.old);
document.getElementById('count').textContent=live.length+' snakes in the arena, '+dead.length+' shed skins';
let W,H,DPR,S,T,pellets=[],TOP=80;
const sn=live.map(p=>({p,x:h32(p.name,130),y:h32(p.name,131),th:h32(p.name,132)*6.28,turn:0,turnT:0,trail:[],ph:h32(p.name,133)*6,grow:0,v:SK[p.kind].v*(0.85+p.speed*0.3)}));
function resize(){DPR=Math.min(window.devicePixelRatio||1,2);W=innerWidth;H=innerHeight;cv.width=W*DPR;cv.height=H*DPR;T=Math.max(0.85,Math.min(1.3,Math.min(W,H)/360));S=Math.max(0.7,Math.min(1.3,Math.sqrt(W*H/(live.length*3600))));
  pellets=[...Array(70)].map((_,i)=>({x:10+h32('px'+i,1)*(W-20),y:TOP+10+h32('py'+i,2)*(H-TOP-20),c:['#1e9e3e','#c49a00','#e07800','#d93636','#2f6fd6'][i%5]}));
  for(const s of sn){s.trail=[];const x=s.x*W,y=TOP+s.y*(H-TOP);for(let k=0;k<200;k++)s.trail.push([x-Math.cos(s.th)*k,y-Math.sin(s.th)*k]);}
  dead.forEach((p,i)=>{p.sx=W*(0.08+(i%5)*0.21);p.sy=H-40*T-Math.floor(i/5)*22*T;p.seed=h32(p.name,134)*6;});}
function adiff(a,b){let d=a-b;while(d>Math.PI)d-=6.283;while(d<-Math.PI)d+=6.283;return d;}
let last=performance.now();
function frame(now){
  const dt=Math.min(0.05,(now-last)/1000)*MOTION,t=now/1000;last=now;
  ctx.setTransform(DPR,0,0,DPR,0,0);ctx.fillStyle='#f5f6f2';ctx.fillRect(0,0,W,H);
  ctx.fillStyle='rgba(18,58,74,.12)';const g=26*T;for(let y=TOP;y<H;y+=g)for(let x=(Math.floor((y-TOP)/g)%2)*g/2;x<W;x+=g)ctx.fillRect(x,y,1.2,1.2);
  ctx.strokeStyle='rgba(18,58,74,.4)';ctx.lineWidth=1.3;ctx.strokeRect(4,TOP-6,W-8,H-TOP+2);
  for(const pl of pellets){ring(ctx,pl.x,pl.y,2*T+Math.sin(t*3+pl.x)*0.5,pl.c);}
  ctx.lineCap='round';ctx.lineJoin='round';
  for(const p of dead){const n=SK[p.kind].n*0.6,r=SK[p.kind].r*S*T;ctx.setLineDash([2,3]);ctx.strokeStyle=p.color;ctx.lineWidth=1;ctx.beginPath();for(let i=0;i<n;i++){const x=p.sx+i*r*0.9,y=p.sy+Math.sin(i*0.5+p.seed)*r*1.6;if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);}ctx.stroke();ctx.setLineDash([]);p._x=p.sx+n*r*0.45;p._y=p.sy;p._L=n*r*0.9;}
  label(ctx,'Shed skins, 90 days or more',W*0.04,H-8*T,'left',10*T);
  for(const s of sn){const sp=SK[s.p.kind],r=sp.r*S*T,hx=s.trail[0][0],hy=s.trail[0][1];
    s.turnT-=dt;if(s.turnT<=0){s.turn=(Math.random()-0.5)*2;s.turnT=0.6+Math.random()*1.5;}
    let tr=s.turn;let best=null,bd=110*T;for(const pl of pellets){const d=Math.hypot(pl.x-hx,pl.y-hy);if(d<bd){bd=d;best=pl;}}
    if(best){tr=Math.sign(adiff(Math.atan2(best.y-hy,best.x-hx),s.th))*2.4;if(bd<r+3){best.x=10+Math.random()*(W-20);best.y=TOP+10+Math.random()*(H-TOP-60*T);if(s.p.days!=null&&s.p.days<7)s.grow=Math.min(12,s.grow+1);}}
    const m=20*T;if(hx<m||hx>W-m||hy<TOP+m||hy>H-70*T){tr=Math.sign(adiff(Math.atan2(H*0.5-hy,W*0.5-hx),s.th))*3.5;}
    s.th+=tr*dt;s.ph+=dt*6;const v=s.v*T*S,nx=hx+Math.cos(s.th)*v*dt,ny=hy+Math.sin(s.th)*v*dt;s.trail.unshift([nx,ny]);
    const n=Math.round(sp.n*Math.min(1.4,s.p.sizeF))+s.grow,spc=r*1.25;
    let acc=0,j=0;const pts=[];for(let i=0;i<n;i++){const target=i*spc;while(j<s.trail.length-1&&acc<target){acc+=Math.hypot(s.trail[j][0]-s.trail[j+1][0],s.trail[j][1]-s.trail[j+1][1]);j++;}pts.push(s.trail[j]);}
    s.trail.length=Math.min(s.trail.length,j+5);
    const wig=(i)=>Math.sin(s.ph-i*0.6)*r*0.25;
    ctx.strokeStyle=s.p.color;ctx.lineWidth=1.2;
    for(let i=pts.length-1;i>=0;i--){const q=pts[i],rr=r*(1-0.55*i/pts.length);const nb=pts[Math.max(0,i-1)],a=Math.atan2(q[1]-nb[1],q[0]-nb[0])+Math.PI/2,w=wig(i);ctx.fillStyle='#f5f6f2';ctx.beginPath();ctx.arc(q[0]+Math.cos(a)*w,q[1]+Math.sin(a)*w,rr,0,6.283);ctx.fill();ctx.stroke();}
    const a=s.th;ctx.save();ctx.translate(nx,ny);ctx.rotate(a);ctx.fillStyle='#f5f6f2';ctx.beginPath();ctx.ellipse(r*0.3,0,r*1.5,r*1.15,0,0,6.283);ctx.fill();ctx.stroke();ring(ctx,r*0.7,-r*0.55,r*0.28,s.p.color);ring(ctx,r*0.7,r*0.55,r*0.28,s.p.color);
    if(Math.sin(t*4+s.ph)>0.5){line(ctx,r*1.8,0,r*2.8,0,'#d93636');line(ctx,r*2.8,0,r*3.2,-r*0.35,'#d93636');line(ctx,r*2.8,0,r*3.2,r*0.35,'#d93636');}ctx.restore();
    s._x=nx;s._y=ny;s._L=r*4;}
  const sl=VZ.sel;if(sl&&sl.ref)VZ.selRing(ctx,sl.ref._x,sl.ref._y,Math.max(14,sl.ref._L*0.6));
  requestAnimationFrame(frame);
}
cv.addEventListener('pointerdown',e=>{let best=null,bd=1e9;const X=e.clientX,Y=e.clientY;
  for(const s of sn){const d=Math.hypot(X-s._x,Y-s._y);if(d<18&&d<bd){bd=d;best=[s,s.p];}}
  for(const p of dead){if(Math.abs(X-p._x)<p._L*0.55&&Math.abs(Y-p._y)<14){best=[p,p];break;}}
  if(best){const [o,p]=best;VZ.open({ref:o,title:p.name,kind:(p.old?'Shed skin':SK[p.kind].label)+VZ.sizeText(p),age:VZ.ageText(p),host:p.host});}else VZ.close();});
addEventListener('resize',resize);resize();requestAnimationFrame(frame);
});
