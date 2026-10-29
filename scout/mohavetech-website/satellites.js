VZ.load(P=>{
const {h32,poly,line,box,ring,label,INK,MUTED,MOTION}=VZ;
const cv=document.getElementById('cv'),ctx=cv.getContext('2d');
const D=Math.PI/180;
const SHELL={
  geo:{label:'Geostationary satellite, one of the biggest',r:1.85,w:0.05,planes:[[0,0]]},
  leo:{label:'Low orbit satellite',r:1.2,w:0.16,planes:[0,60,120,180,240,300].map(o=>[53,o])},
  polar:{label:'Polar orbit satellite, small and nimble',r:1.3,w:0.15,planes:[[87,20],[87,110]]},
  meo:{label:'Mid orbit satellite',r:1.55,w:0.08,planes:[[55,0],[55,120],[55,240]]},
  grave:{label:'Graveyard orbit, 90 days or more',r:2.05,w:0.025,planes:[[9,40]]}
};
const KL={battle:'Low orbit satellite, big and fast',speed:'Low orbit smallsat, small and quick',cargo:'Mid orbit satellite, big and steady',sail:'Mid orbit satellite with a solar sail, light and easy'};
const shellOf=p=>p.old?'grave':p.kind==='tanker'?'geo':p.kind==='tug'?'polar':(p.kind==='battle'||p.kind==='speed')?'leo':'meo';
const groups={};P.forEach(p=>{const s=shellOf(p);(groups[s]=groups[s]||[]).push(p);});
const sats=[];
for(const k in groups){const sh=SHELL[k],list=groups[k],np=sh.planes.length;
  list.forEach((p,i)=>{const pi=i%np,idx=Math.floor(i/np),per=Math.ceil(list.length/np);sats.push({p,shell:k,inc:sh.planes[pi][0]*D,raan:sh.planes[pi][1]*D,r:sh.r,w:sh.w*(0.9+p.speed*0.2),th:idx/per*6.283+pi*0.4});});}
const live=sats.filter(s=>s.shell!=='grave').length;
document.getElementById('count').textContent=live+' in orbit, '+(groups.grave||[]).length+' in the graveyard';
const STATIONS=[['Vercel',35,-114],['GitHub',45,-75],['Railway',20,10],['Cloudflare',-25,135],['Redis',52,80]];
let W,H,DPR,R,S,T,cx,cy,yaw=0.6,pitch=0.55,spin=0,beams=[];
function resize(){DPR=Math.min(window.devicePixelRatio||1,2);W=innerWidth;H=innerHeight;cv.width=W*DPR;cv.height=H*DPR;R=Math.min(W*0.245,H*0.22);cx=W/2;cy=H*0.5;T=Math.max(0.85,Math.min(1.3,Math.min(W,H)/360));S=Math.max(0.85,Math.min(1.4,R/85));}
function view(x,y,z){const c=Math.cos(yaw),s=Math.sin(yaw);const x1=x*c-y*s,y1=x*s+y*c;const cp=Math.cos(pitch),sp=Math.sin(pitch);return [cx+x1,cy-(y1*sp+z*cp),y1*cp-z*sp];}
function orbitPos(inc,raan,r,th){const x=r*Math.cos(th),y0=r*Math.sin(th);const y=y0*Math.cos(inc),z=y0*Math.sin(inc);return [x*Math.cos(raan)-y*Math.sin(raan),x*Math.sin(raan)+y*Math.cos(raan),z];}
function surf(lat,lon){const a=lat*D,b=lon*D+spin;return [R*Math.cos(a)*Math.cos(b),R*Math.cos(a)*Math.sin(b),R*Math.sin(a)];}
function drawOrbits(front){
  const seen=new Set();
  for(const s of sats){const key=s.shell+s.inc+'_'+s.raan;if(seen.has(key))continue;seen.add(key);
    ctx.strokeStyle=s.shell==='grave'?'rgba(140,140,140,.35)':'rgba(18,58,74,.16)';ctx.lineWidth=1;ctx.beginPath();let pen=false;
    for(let k=0;k<=96;k++){const [x,y,z]=orbitPos(s.inc,s.raan,s.r*R,k/96*6.283);const [sx,sy,d]=view(x,y,z);const ok=front?d<=0:d>0;if(ok){if(!pen){ctx.moveTo(sx,sy);pen=true;}else ctx.lineTo(sx,sy);}else pen=false;}
    ctx.stroke();}
}
function drawSat(s,t){
  const [x,y,z]=orbitPos(s.inc,s.raan,s.r*R,s.th),[sx,sy,d]=view(x,y,z),[x2,y2,z2]=orbitPos(s.inc,s.raan,s.r*R,s.th+0.05),[tx,ty]=view(x2,y2,z2);
  s._x=sx;s._y=sy;s._d=d;
  const b=(s.shell==='geo'?4.2:s.p.kind==='battle'||s.p.kind==='cargo'?3.2:2.6)*S*Math.min(1.3,s.p.sizeF);s._L=b*6;
  let ux=tx-sx,uy=ty-sy;const n=Math.hypot(ux,uy)||1;ux/=n;uy/=n;const nx=-uy,ny=ux;
  const col=s.p.color;ctx.lineWidth=1.1;ctx.globalAlpha=d>0?0.45:1;
  ctx.save();ctx.translate(sx,sy);ctx.rotate(Math.atan2(uy,ux));
  box(ctx,-b/2,-b/2,b/2,b/2,col);
  if(s.p.kind==='sail'&&s.shell!=='grave'){poly(ctx,[[0,-b/2],[-b*1.8,-b*2.6],[b*1.8,-b*2.6]],col);}
  else{const pl=b*1.7;box(ctx,-b*0.45,-b/2-pl,b*0.45,-b/2-1,col);box(ctx,-b*0.45,b/2+1,b*0.45,b/2+pl,col);line(ctx,0,-b/2-pl,0,-b/2-1,col);line(ctx,0,b/2+1,0,b/2+pl,col);}
  if(s.shell==='geo'){ctx.beginPath();ctx.arc(b*0.9,0,b*0.55,-1.2,1.2);ctx.strokeStyle=col;ctx.stroke();}
  ctx.restore();ctx.globalAlpha=1;
}
function drawGlobe(){
  ctx.fillStyle='#fbfcfd';ctx.beginPath();ctx.arc(cx,cy,R,0,6.283);ctx.fill();
  ctx.strokeStyle='rgba(18,58,74,.18)';ctx.lineWidth=1;
  const seg=(pts)=>{ctx.beginPath();let pen=false;for(const p of pts){const [sx,sy,d]=view(...p);if(d<=0){if(!pen){ctx.moveTo(sx,sy);pen=true;}else ctx.lineTo(sx,sy);}else pen=false;}ctx.stroke();};
  for(let lat=-60;lat<=60;lat+=30){const pts=[];for(let lon=0;lon<=360;lon+=6)pts.push(surf(lat,lon));seg(pts);}
  for(let lon=0;lon<360;lon+=30){const pts=[];for(let lat=-90;lat<=90;lat+=6)pts.push(surf(lat,lon));seg(pts);}
  ctx.strokeStyle=INK;ctx.lineWidth=1.4;ctx.beginPath();ctx.arc(cx,cy,R,0,6.283);ctx.stroke();
  for(const [name,la,lo] of STATIONS){const [sx,sy,d]=view(...surf(la,lo));if(d>-R*0.15)continue;ctx.lineWidth=1.2;poly(ctx,[[sx,sy-4*T],[sx-3.5*T,sy+2.5*T],[sx+3.5*T,sy+2.5*T]],INK);label(ctx,name,sx+6*T,sy+3*T,'left',9.5*T);}
}
let last=performance.now(),beamT=0;
function frame(now){
  const dt=Math.min(0.05,(now-last)/1000)*MOTION,t=now/1000;last=now;
  if(!drag)yaw+=0.04*dt;spin+=0.05*dt;
  for(const s of sats)s.th+=s.w*dt*(s.shell==='geo'?1:1);
  ctx.setTransform(DPR,0,0,DPR,0,0);ctx.fillStyle='#eef2f7';ctx.fillRect(0,0,W,H);
  ctx.fillStyle='rgba(18,58,74,.25)';for(let i=0;i<90;i++){const x=h32('sx'+i,1)*W,y=h32('sy'+i,2)*H;ctx.fillRect(x,y,1,1);}
  drawOrbits(false);
  const back=[],fr=[];for(const s of sats){const [x,y,z]=orbitPos(s.inc,s.raan,s.r*R,s.th);(view(x,y,z)[2]>0?back:fr).push(s);}
  for(const s of back)drawSat(s,t);
  drawGlobe();
  drawOrbits(true);
  for(const s of fr)drawSat(s,t);
  beamT-=dt;
  if(beamT<=0){beamT=1.2;const green=fr.filter(s=>s.p.days!=null&&s.p.days<7&&s.shell!=='grave');if(green.length){const s=green[Math.floor(Math.random()*green.length)];let best=null,bd=1e9;for(const st of STATIONS){const [sx,sy,d]=view(...surf(st[1],st[2]));if(d>-R*0.15)continue;const dd=Math.hypot(sx-s._x,sy-s._y);if(dd<bd){bd=dd;best=st;}}if(best)beams.push({s,st:best,life:1});}}
  for(const b of beams){b.life-=dt*0.9;const [sx,sy,d]=view(...surf(b.st[1],b.st[2]));if(d>-R*0.1||b.s._d>0)continue;ctx.strokeStyle='rgba(30,158,62,'+(0.7*b.life).toFixed(2)+')';ctx.lineWidth=1.2;ctx.setLineDash([3,4]);ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(b.s._x,b.s._y);ctx.stroke();ctx.setLineDash([]);}
  beams=beams.filter(b=>b.life>0);
  const s=VZ.sel;if(s&&s.ref)VZ.selRing(ctx,s.ref._x,s.ref._y,s.ref._L*0.6+6);
  requestAnimationFrame(frame);
}
let drag=false,down=null;
cv.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY,yaw,pitch};drag=false;cv.setPointerCapture(e.pointerId);});
cv.addEventListener('pointermove',e=>{if(!down)return;const dx=e.clientX-down.x,dy=e.clientY-down.y;if(Math.hypot(dx,dy)>6)drag=true;if(drag){yaw=down.yaw-dx*0.008;pitch=Math.max(-1.3,Math.min(1.3,down.pitch+dy*0.006));}});
cv.addEventListener('pointerup',e=>{const wasDrag=drag;drag=false;down=null;if(wasDrag)return;
  let best=null,bd=1e9;const X=e.clientX,Y=e.clientY;
  for(const s of sats){if(s._x==null)continue;const d=Math.hypot(X-s._x,Y-s._y);if(d<Math.max(s._L*0.6,14)&&d<bd&&!(s._d>0&&Math.hypot(s._x-cx,s._y-cy)<R)){bd=d;best=s;}}
  if(best){const p=best.p;VZ.open({ref:best,title:p.name,kind:(best.shell==='leo'||best.shell==='meo'?KL[p.kind]:SHELL[best.shell].label)+VZ.sizeText(p),age:VZ.ageText(p),host:p.host});}else VZ.close();
});
addEventListener('resize',resize);resize();requestAnimationFrame(frame);
});
