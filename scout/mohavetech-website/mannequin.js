VZ.load(P=>{
const {h32,MOTION,INK}=VZ;
const cv=document.getElementById('cv'),ctx=cv.getContext('2d');
let W,H,DPR,yaw=0.5,pitch=0.12,dist=2.4,auto=true,idle=0,last=performance.now();
let NOTE=0.08;

/* body profile: half width and depth of the cross section at height y */
function body(y){
  const k=[[0.0,0.07,0.07],[0.62,0.145,0.095],[0.75,0.165,0.11],[0.9,0.188,0.125],[1.0,0.16,0.11],[1.1,0.112,0.083],[1.2,0.13,0.092],[1.3,0.145,0.1],[1.4,0.185,0.09],[1.47,0.13,0.07],[1.53,0.05,0.05]];
  for(let i=1;i<k.length;i++)if(y<=k[i][0]){const a=k[i-1],b=k[i],t=(y-a[0])/(b[0]-a[0]);return [a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];}
  return [0.05,0.05];
}
/* the gown: follows the body down to the hips, then flares out to the hem */
const TOP=1.44,HEM=0.66;
function gown(y){const b=body(y);return [b[0]+0.006,b[1]+0.006];}
/* bust in front, seat in back, added on top of the round cross section */
function bump(u,y){
  const f=Math.cos(u),sd=Math.sin(u);let r=0;
  if(f>0)r+=0.048*Math.exp(-Math.pow((y-1.27)/0.055,2))*(Math.exp(-Math.pow((sd-0.42)/0.22,2))+Math.exp(-Math.pow((sd+0.42)/0.22,2)))*f;
  if(f<0)r+=0.03*Math.exp(-Math.pow((y-0.88)/0.08,2))*(-f);
  return r;
}
/* newest apps up top, oldest at the hem: an ombre gown */
const apps=P.slice().sort((a,b)=>(a.days==null?1e9:a.days)-(b.days==null?1e9:b.days));
const notes=[];
(function(){
  let len=0,prev=null;const steps=200,ys=[];
  for(let i=0;i<=steps;i++){const y=TOP-(TOP-HEM)*i/steps,g=gown(y),pt=[g[0],y];if(prev)len+=Math.hypot(pt[0]-prev[0],pt[1]-prev[1]);ys.push([len,y]);prev=pt;}
  const circ=y=>{const g=gown(y);return Math.PI*(3*(g[0]+g[1])-Math.sqrt((3*g[0]+g[1])*(g[0]+3*g[1])));};
  let area=0;for(let i=1;i<ys.length;i++)area+=(ys[i][0]-ys[i-1][0])*circ(ys[i][1]);
  const cell=Math.sqrt(area/apps.length);NOTE=cell*1.06;const rows=Math.max(4,Math.round(len/cell));
  const plan=[];let total=0;
  for(let r=0;r<rows;r++){const s=(r+0.5)/rows*len;let y=ys[ys.length-1][1];for(const q of ys)if(q[0]>=s){y=q[1];break;}const n=Math.max(3,circ(y)/cell);plan.push([y,n]);total+=n;}
  let k=0;
  plan.forEach(([y,n],r)=>{
    const cnt=r===plan.length-1?apps.length-k:Math.min(apps.length-k,Math.round(n*apps.length/total));
    for(let i=0;i<cnt;i++){const p=apps[k++];notes.push({p,b:y,a:(i+(r%2?0.5:0))/cnt*6.2832,row:r,size:cell*1.06,tilt:(h32(p.name,9)-0.5)*0.22,curl:0.04+0.1*h32(p.name,11),ph:h32(p.name,12)*6.28});}
  });
})();


function surf(fn,u,y,out){const g=fn(y),b=bump(u,y);const x=Math.sin(u)*(g[0]+b*Math.abs(Math.sin(u))),z=Math.cos(u)*(g[1]+b);return [x*(1+out),y,z*(1+out)];}
function sub(a,b){return [a[0]-b[0],a[1]-b[1],a[2]-b[2]];}
function add(a,b,k){return [a[0]+b[0]*k,a[1]+b[1]*k,a[2]+b[2]*k];}
function norm(a){const l=Math.hypot(a[0],a[1],a[2])||1;return [a[0]/l,a[1]/l,a[2]/l];}
function cross(a,b){return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];}

let cam,TG=[0,0.88,0];
function setCam(){const cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);cam={cy,sy,cp,sp,f:Math.min(H*0.95,W*2.2)};}
function proj(v){
  let x=v[0]-TG[0],y=v[1]-TG[1],z=v[2]-TG[2];
  const x1=x*cam.cy-z*cam.sy,z1=x*cam.sy+z*cam.cy;
  const y2=y*cam.cp-z1*cam.sp,z2=y*cam.sp+z1*cam.cp;
  const d=dist-z2,s=cam.f/Math.max(d,0.02);
  return [W/2+x1*s,H*0.52-y2*s,d];
}
function eyePos(){return [TG[0]+Math.sin(yaw)*Math.cos(pitch)*dist,TG[1]+Math.sin(pitch)*dist,TG[2]+Math.cos(yaw)*Math.cos(pitch)*dist];}
function line3(a,b,col,w){const p=proj(a),q=proj(b);if(p[2]<0.03||q[2]<0.03)return;ctx.strokeStyle=col;ctx.lineWidth=w||1;ctx.beginPath();ctx.moveTo(p[0],p[1]);ctx.lineTo(q[0],q[1]);ctx.stroke();}
function ringAt(fn,y,col,w){ctx.strokeStyle=col;ctx.lineWidth=w||1;ctx.beginPath();for(let i=0;i<=40;i++){const p=proj(surf(fn,i/40*6.2832,y,0));i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]);}ctx.stroke();}
function limb(a,b,r,col){
  const d=norm(sub(b,a)),side=norm(cross(d,[0,0,1])),up=cross(side,d);
  for(let k=0;k<4;k++){const ang=k/4*6.2832,o=[side[0]*Math.cos(ang)*r+up[0]*Math.sin(ang)*r,side[1]*Math.cos(ang)*r+up[1]*Math.sin(ang)*r,side[2]*Math.cos(ang)*r+up[2]*Math.sin(ang)*r];line3([a[0]+o[0],a[1]+o[1],a[2]+o[2]],[b[0]+o[0],b[1]+o[1],b[2]+o[2]],col,1);}
  for(let t=0;t<=1;t+=0.25){const c=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];ctx.strokeStyle=col;ctx.beginPath();for(let i=0;i<=16;i++){const ang=i/16*6.2832,v=[c[0]+side[0]*Math.cos(ang)*r+up[0]*Math.sin(ang)*r,c[1]+side[1]*Math.cos(ang)*r+up[1]*Math.sin(ang)*r,c[2]+side[2]*Math.cos(ang)*r+up[2]*Math.sin(ang)*r];const p=proj(v);i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]);}ctx.stroke();}
}
const LINE='rgba(18,58,74,.55)',FAINT='rgba(18,58,74,.22)';
function stand(){
  ctx.strokeStyle=FAINT;ctx.lineWidth=1;
  for(const r of [0.32,0.22]){ctx.beginPath();for(let i=0;i<=48;i++){const a=i/48*6.2832,p=proj([Math.sin(a)*r,0,Math.cos(a)*r]);i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]);}ctx.stroke();}
  for(let i=0;i<8;i++){const a=i/8*6.2832;line3([Math.sin(a)*0.22,0,Math.cos(a)*0.22],[Math.sin(a)*0.32,0,Math.cos(a)*0.32],FAINT);}
  line3([0,0,-0.18],[0,0.6,-0.1],LINE,1.4);
}
function legs(){for(const s of [-1,1]){limb([s*0.07,0.05,0.01],[s*0.075,0.36,0.0],0.042,LINE);limb([s*0.075,0.36,0.0],[s*0.08,HEM+0.04,0],0.062,LINE);}}
function torsoLines(){for(let y=1.5;y>=HEM;y-=0.06)ringAt(body,y,FAINT);for(let i=0;i<8;i++){const u=i/8*6.2832;ctx.strokeStyle=FAINT;ctx.beginPath();for(let y=1.56;y>=HEM;y-=0.04){const p=proj(surf(body,u,y,0));y===1.56?ctx.moveTo(p[0],p[1]):ctx.lineTo(p[0],p[1]);}ctx.stroke();}}
function arms(front){
  for(const s of [-1,1]){
    const sh=[s*0.19,1.41,0],el=[s*0.25,1.1,0.02],wr=[s*0.27,0.84,0.08];
    const zc=proj(el)[2],zt=proj([0,1.12,0])[2];
    if((zc<zt)===front)limb(sh,el,0.045,LINE),limb(el,wr,0.038,LINE);
  }
}
function head(){
  const c=[0,1.68,0],r=0.105;
  for(let k=0;k<6;k++){const lat=-1.2+k*0.48;ctx.strokeStyle=LINE;ctx.lineWidth=1;ctx.beginPath();for(let i=0;i<=24;i++){const a=i/24*6.2832,p=proj([c[0]+Math.sin(a)*Math.cos(lat)*r*0.85,c[1]+Math.sin(lat)*r*1.15,c[2]+Math.cos(a)*Math.cos(lat)*r]);i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]);}ctx.stroke();}
  for(let k=0;k<10;k++){const a=k/10*6.2832;ctx.beginPath();for(let i=0;i<=24;i++){const lat=-1.57+i/24*3.1416,p=proj([c[0]+Math.sin(a)*Math.cos(lat)*r*0.85*Math.cos(i/24*6.2832)*0+Math.sin(a)*Math.cos(lat)*r*0.85,c[1]+Math.sin(lat)*r*1.15,c[2]+Math.cos(a)*Math.cos(lat)*r]);i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]);}ctx.stroke();}
  limb([0,1.5,0],[0,1.6,0],0.04,LINE);
}

function mannequinQuad(n,t){
  const out=0.002*(n.row%2+1)+0.0004*(n.rank||0);
  const c=surf(gown,n.a,n.b,out),du=0.01,dy=0.01;
  const tu=norm(sub(surf(gown,n.a+du,n.b,out),c)),tv=norm(sub(surf(gown,n.a,n.b-dy,out),c));
  return quad(n,c,tu,tv,norm(cross(tv,tu)),n.size,t);
}
/* one sticky note: square with a lifted, slightly curled bottom corner */
function quad(n,c,tu,tv,nrm,h,t){
  const ct=Math.cos(n.tilt),st=Math.sin(n.tilt);
  const ax=[tu[0]*ct+tv[0]*st,tu[1]*ct+tv[1]*st,tu[2]*ct+tv[2]*st],ay=[tv[0]*ct-tu[0]*st,tv[1]*ct-tu[1]*st,tv[2]*ct-tu[2]*st];
  const sway=n.curl*(1+0.35*Math.sin(t*1.6+n.ph)*MOTION),lift=h*0.55*sway;
  const P=(a,b,l)=>[c[0]+ax[0]*a*h+ay[0]*(b*h-h*0.15)+nrm[0]*l,c[1]+ax[1]*a*h+ay[1]*(b*h-h*0.15)+nrm[1]*l,c[2]+ax[2]*a*h+ay[2]*(b*h-h*0.15)+nrm[2]*l];
  return {pts:[P(-0.5,-0.5,0),P(0.5,-0.5,0),P(0.5,0.35,lift*0.35),P(0.15,0.5,lift),P(-0.5,0.5,lift*0.5)],c,nrm};
}

/* wireframe building blocks, stored as line segments [a,b,strong] */
function ring3(segs,c,u,v,r,k,strong){let prev=null;for(let i=0;i<=k;i++){const a=i/k*6.2832,p=[c[0]+(u[0]*Math.cos(a)+v[0]*Math.sin(a))*r,c[1]+(u[1]*Math.cos(a)+v[1]*Math.sin(a))*r,c[2]+(u[2]*Math.cos(a)+v[2]*Math.sin(a))*r];if(prev)segs.push([prev,p,strong]);prev=p;}}
function path3(segs,pts,closed,strong){for(let i=1;i<pts.length;i++)segs.push([pts[i-1],pts[i],strong]);if(closed)segs.push([pts[pts.length-1],pts[0],strong]);}
function boxEdges(segs,x0,y0,z0,x1,y1,z1,strong){const c=[[x0,y0,z0],[x1,y0,z0],[x1,y1,z0],[x0,y1,z0],[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]];[[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]].forEach(([a,b])=>segs.push([c[a],c[b],strong]));}
function wheel(segs,x,y,z,r){ring3(segs,[x,y,z],[1,0,0],[0,1,0],r,20,1);ring3(segs,[x,y,z],[1,0,0],[0,1,0],r*0.55,14,0);for(let i=0;i<5;i++){const a=i/5*6.2832;segs.push([[x+Math.cos(a)*r*0.2,y+Math.sin(a)*r*0.2,z],[x+Math.cos(a)*r*0.55,y+Math.sin(a)*r*0.55,z],0]);}}
function floor(segs,x0,x1,z0,z1,step){for(let x=x0;x<=x1+1e-6;x+=step)segs.push([[x,0,z0],[x,0,z1],0]);for(let z=z0;z<=z1+1e-6;z+=step)segs.push([[x0,0,z],[x1,0,z],0]);}

/* grid of notes on a flat patch, newest first, laid out in a square block */
/* notes on a surface: each note has surface coordinates a,b; the surface maps them to 3D */
function gridSlots(colsMax){const N=apps.length,cols=Math.min(colsMax||99,Math.ceil(Math.sqrt(N))),pitch=NOTE*1.02;return apps.map((p,i)=>[(i%cols+0.5)*pitch,(Math.floor(i/cols)+0.5)*pitch]);}
function mkNotes(){return apps.map(p=>({p,a:0,b:0,rank:0,tilt:(h32(p.name,9)-0.5)*0.16,curl:0.05+0.12*h32(p.name,11),ph:h32(p.name,12)*6.28}));}
function plane(origin,tu,tv,nrm){return {
  map:(a,b,k)=>({c:add(add(add(origin,tu,a),tv,b),nrm,0.004+0.0004*k),tu,tv,nrm}),
  hit(o,d){const den=d[0]*nrm[0]+d[1]*nrm[1]+d[2]*nrm[2];if(Math.abs(den)<1e-6)return null;const w=sub(origin,o),t=(w[0]*nrm[0]+w[1]*nrm[1]+w[2]*nrm[2])/den;if(t<=0)return null;const q=sub(add(o,d,t),origin);return [q[0]*tu[0]+q[1]*tu[1]+q[2]*tu[2],q[0]*tv[0]+q[1]*tv[1]+q[2]*tv[2]];}};}
function flatScene(o){const notes=mkNotes();o.notes=notes;o.quads=t=>notes.map(n=>{const m=o.surface.map(n.a,n.b,n.rank);return {n,...quad(n,m.c,m.tu,m.tv,m.nrm,NOTE,t)};});return o;}
const SCENES={};
SCENES.mannequin={label:'Mannequin',target:[0,0.95,0],dist:2.4,min:0.4,max:6,
  back(){stand();legs();torsoLines();arms(false);},front(){arms(true);head();},
  quads:t=>notes.map(n=>({n,...mannequinQuad(n,t)})),notes,slots:notes.map(n=>[n.a,n.b]),
  surface:{hit(o,d,n){const c=surf(gown,n.a,n.b,0),w=sub(c,o),nd=norm(d),t=w[0]*nd[0]+w[1]*nd[1]+w[2]*nd[2];if(t<=0)return null;const q=add(o,nd,t);return [Math.atan2(q[0],q[2]),Math.max(HEM+0.02,Math.min(TOP,q[1]))];}},
  count:()=>notes.length+' sticky notes, newest at the top'};

SCENES.wall=(function(){const segs=[];
  path3(segs,[[-2.5,0,0],[2.5,0,0],[2.5,2.6,0],[-2.5,2.6,0]],true,1);
  for(let x=-2.4;x<2.5;x+=0.4)segs.push([[x,0,0],[x,2.6,0],0]);
  segs.push([[-2.5,0.1,0.02],[2.5,0.1,0.02],1]);floor(segs,-2.5,2.5,0,2.5,0.5);
  const cols=Math.ceil(Math.sqrt(apps.length)),w=cols*NOTE*1.02;
  return flatScene({label:'Wall',segs,surface:plane([-w/2,1.95,0],[1,0,0],[0,-1,0],[0,0,1]),slots:gridSlots(),target:[0,1.45,0.3],dist:3.2,min:0.3,max:9,yaw:0.35,pitch:0.08,count:()=>'One block of notes on a 5 meter wall'});})();

SCENES.car=(function(){const segs=[];
  const prof=[[-2.3,0.35],[-2.3,0.8],[-2.0,0.92],[-1.2,0.96],[-0.7,1.4],[0.6,1.42],[1.1,1.0],[2.2,0.86],[2.32,0.55],[2.25,0.35]];
  for(const z of [-0.85,0.85])path3(segs,prof.map(p=>[p[0],p[1],z]),true,1);
  prof.forEach(p=>segs.push([[p[0],p[1],-0.85],[p[0],p[1],0.85],0]));
  for(const z of [-0.86,0.86])path3(segs,[[-1.05,1.0,z],[-0.62,1.34,z],[0.55,1.36,z],[0.95,1.02,z]],true,0);
  for(const z of [-0.9,0.9])for(const x of [-1.45,1.45])wheel(segs,x,0.34,z,0.33);
  floor(segs,-3,3,-2,2,0.5);
  const a=[1.12,1.0],b=[2.2,0.86],tv=norm([b[0]-a[0],b[1]-a[1],0]),nrm=norm(cross([0,0,1],tv));
  return flatScene({label:'Car',segs,surface:plane([a[0]+0.03,a[1]+0.005,-0.72],[0,0,1],tv,nrm),slots:gridSlots(18),target:[0.6,0.8,0],dist:6.5,min:0.3,max:16,yaw:0.9,pitch:0.4,count:()=>'Notes across the hood of a sedan'});})();

SCENES.trailer=(function(){const segs=[];
  boxEdges(segs,-8,1.15,-1.3,8.2,4.1,1.3,1);
  for(let x=-7.4;x<8.2;x+=0.6)for(const z of [-1.3,1.3])segs.push([[x,1.15,z],[x,4.1,z],0]);
  for(let x=-8;x<8.2;x+=2)segs.push([[x,4.1,-1.3],[x,4.1,1.3],0]);
  for(const x of [-6.0,-7.2])for(const z of [-1.0,1.0])wheel(segs,x,0.52,z+(z>0?0.2:-0.2),0.52);
  for(const z of [-0.9,0.9])segs.push([[5.6,0,z],[5.6,1.15,z],1]);
  segs.push([[-8,0.9,-1.3],[-8,0.9,1.3],1]);floor(segs,-10,10,-4,4,1);
  const cols=Math.ceil(Math.sqrt(apps.length)),w=cols*NOTE*1.02;
  return flatScene({label:'Semi trailer',segs,surface:plane([-w/2,3.1,1.3],[1,0,0],[0,-1,0],[0,0,1]),slots:gridSlots(),target:[0,2.6,1.3],dist:16,min:0.3,max:40,yaw:0.4,pitch:0.12,count:()=>'One patch on a 53 foot trailer'});})();

SCENES.jet=(function(){const segs=[];
  const R=x=>x>27?3.1*Math.sqrt(Math.max(0,1-Math.pow((x-27)/8.2,2))):x<-22?3.1*Math.max(0.12,1-(-22-x)/14):3.1;
  const CY=x=>x<-22?5+(-22-x)*0.12:5;
  const hump=(x,a)=>x>8&&x<30&&Math.sin(a)>0.3?Math.sin(a)*1.2*Math.sin((x-8)/22*Math.PI)*Math.min(1,(30-x)/6):0;
  const L=[];for(let x=-35;x<=35.2;x+=2.5)L.push(x);
  for(const x of L){const pts=[];for(let i=0;i<=20;i++){const a=i/20*6.2832,r=R(x)+hump(x,a);pts.push([x,CY(x)+Math.sin(a)*r,Math.cos(a)*r]);}path3(segs,pts,false,0);}
  for(let i=0;i<12;i++){const a=i/12*6.2832,pts=L.map(x=>{const r=R(x)+hump(x,a);return [x,CY(x)+Math.sin(a)*r,Math.cos(a)*r];});path3(segs,pts,false,1);}
  for(const s of [-1,1]){path3(segs,[[14,3.6,s*2.8],[3,3.6,s*2.8],[-14,4.6,s*32],[-10,4.6,s*32]],true,1);
    for(const zz of [10,21]){const x0=11-zz*0.5;for(let k=0;k<=4;k++){const x=x0-k*1.4;ring3(segs,[x,2.5+zz*0.03,s*zz],[0,0,1],[0,1,0],1.15,12,k===0||k===4?1:0);}for(let i=0;i<6;i++){const a=i/6*6.2832;segs.push([[x0,2.5+zz*0.03+Math.sin(a)*1.15,s*zz+Math.cos(a)*1.15],[x0-5.6,2.5+zz*0.03+Math.sin(a)*1.15,s*zz+Math.cos(a)*1.15],0]);}}
    path3(segs,[[-27,6,s*1.2],[-31,6.2,s*1.2],[-35,6.8,s*11],[-32.5,6.8,s*11]],true,1);
    for(const x of [-1,2])segs.push([[x,2,s*2],[x,0.6,s*2.2],1]),wheel(segs,x,0.6,s*2.2,0.6);}
  path3(segs,[[-26,7.5,0],[-33,19,0],[-36.5,19,0],[-35,7,0]],true,1);
  segs.push([[25,2,0],[25,0.55,0],1]);wheel(segs,25,0.55,0,0.55);
  floor(segs,-40,40,-36,36,4);
  /* a patch near the forward door: a runs back along the fuselage, b wraps down around its curve */
  const x0=22,r=3.1;
  const surface={map:(a,b,k)=>{const ang=0.12-b/r,rr=r+0.004+0.0004*k;return {c:[x0-a,5+Math.sin(ang)*rr,Math.cos(ang)*rr],nrm:[0,Math.sin(ang),Math.cos(ang)],tu:[-1,0,0],tv:[0,-Math.cos(ang),Math.sin(ang)]};},
    hit(o,d){const A=d[1]*d[1]+d[2]*d[2],B=2*((o[1]-5)*d[1]+o[2]*d[2]),C=(o[1]-5)*(o[1]-5)+o[2]*o[2]-r*r,D=B*B-4*A*C;if(D<0||A<1e-9)return null;const t=(-B-Math.sqrt(D))/(2*A);if(t<=0)return null;const q=add(o,d,t);return [x0-q[0],(0.12-Math.atan2(q[1]-5,q[2]))*r];}};
  return flatScene({label:'747',segs,surface,slots:gridSlots(),target:[21.4,5,3.1],dist:95,min:0.3,max:180,yaw:0.9,pitch:0.25,count:()=>'Zoom in by the front door to find them'});})();

SCENES.wind=(function(){const segs=[];floor(segs,-4,4,-3,3,0.5);
  segs.push([[-3.6,0,-2.4],[-3.6,3.2,-2.4],1]);
  for(let k=0;k<=4;k++){const x=-3.6+k*0.35,r=0.22-k*0.03;ring3(segs,[x,3.1-k*0.04,-2.4],[0,1,0],[0,0,1],r,12,k===0?1:0);}
  const B={x:4,y0:0.15,y1:3.2,z:2.6};
  const ns=apps.map(p=>({p,x:-B.x+h32(p.name,21)*2*B.x,y:B.y0+h32(p.name,22)*(B.y1-B.y0),z:-B.z+h32(p.name,23)*2*B.z,a:h32(p.name,24)*6.28,b:h32(p.name,25)*6.28,c:h32(p.name,26)*6.28,v:0.6+h32(p.name,27)*0.8,tilt:0,curl:0.15,ph:h32(p.name,12)*6.28}));
  return {label:'Wind',segs,target:[0,1.5,0],dist:6,min:0.3,max:14,yaw:0.5,pitch:0.1,count:()=>'All the notes blowing in the wind',
    quads(t,dt){const g=0.6+0.5*Math.sin(t*0.4)+0.3*Math.sin(t*1.3);
      return ns.map(n=>{
        n.x+=(1.1*g*n.v+0.25*Math.sin(t*0.9+n.ph))*dt*MOTION;n.y+=(0.35*Math.sin(t*1.1+n.ph*2)-0.08)*dt*MOTION;n.z+=0.3*Math.cos(t*0.7+n.ph)*dt*MOTION;
        if(n.x>B.x)n.x-=2*B.x;if(n.y<B.y0)n.y=B.y1;if(n.y>B.y1)n.y=B.y0;if(n.z>B.z)n.z-=2*B.z;if(n.z<-B.z)n.z+=2*B.z;
        n.a+=dt*(2+3*n.v)*MOTION;n.b+=dt*1.7*MOTION;
        const ca=Math.cos(n.a),sa=Math.sin(n.a),cb=Math.cos(n.b),sb=Math.sin(n.b);
        const tu=norm([ca,sa*cb,sa*sb]),tmp=norm([-sa,ca*cb,ca*sb]),nrm=norm(cross(tu,tmp)),tv=cross(nrm,tu);
        return {n,...quad(n,[n.x,n.y,n.z],tu,tv,nrm,NOTE,t)};
      });}};})();

const ORDER=['mannequin','wall','car','trailer','jet','wind'];
let scene,sceneKey='mannequin',rankTop=1;
/* layouts: an order for the slots, plus any notes moved by hand, saved per surface */
const STORE='sticky-layout-v1';
let saved={};try{saved=JSON.parse(localStorage.getItem(STORE)||'{}')||{};}catch(e){}
function save(){try{localStorage.setItem(STORE,JSON.stringify(saved));}catch(e){}}
const SORTS={age:a=>a.slice(),name:a=>a.slice().sort((x,y)=>x.p.name.localeCompare(y.p.name)),shuffle:a=>{const r=a.slice();for(let i=r.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[r[i],r[j]]=[r[j],r[i]];}return r;}};
function layout(k){
  const sc=SCENES[k];if(!sc.slots)return;const st=saved[k]||{order:'age',seq:null,pos:{}};
  let seq=st.seq?st.seq.map(nm=>sc.notes.find(n=>n.p.name===nm)).filter(Boolean):null;
  if(!seq||seq.length!==sc.notes.length)seq=SORTS.age(sc.notes);
  seq.forEach((n,i)=>{const s=sc.slots[i];n.a=s[0];n.b=s[1];n.rank=0;});
  for(const n of sc.notes){const q=st.pos[n.p.name];if(q){n.a=q[0];n.b=q[1];n.rank=q[2]||0;rankTop=Math.max(rankTop,n.rank+1);}}
}
function organize(mode){
  const sc=SCENES[sceneKey];if(!sc.slots)return;
  const seq=SORTS[mode](SORTS.age(sc.notes.slice().sort((a,b)=>apps.indexOf(a.p)-apps.indexOf(b.p))));
  saved[sceneKey]={order:mode,seq:seq.map(n=>n.p.name),pos:{}};save();layout(sceneKey);
}
ORDER.forEach(k=>{if(SCENES[k].slots){SCENES[k].notes.sort((a,b)=>apps.indexOf(a.p)-apps.indexOf(b.p));layout(k);}});
function useScene(k){
  if(!SCENES[k])k='mannequin';sceneKey=k;scene=SCENES[k];
  document.getElementById('organize').hidden=!scene.slots;TG=scene.target;dist=scene.dist;yaw=scene.yaw!=null?scene.yaw:0.5;pitch=scene.pitch!=null?scene.pitch:0.12;auto=true;VZ.close();
  document.getElementById('count').textContent=scene.count();
  document.querySelectorAll('#surfaces button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.k===k?'true':'false'));
  try{history.replaceState(null,'','#'+k);}catch(e){}
}
const bar=document.getElementById('surfaces');
ORDER.forEach(k=>{const b=document.createElement('button');b.textContent=SCENES[k].label;b.dataset.k=k;b.onclick=()=>useScene(k);bar.appendChild(b);});
const org=document.getElementById('organize');
[['Newest first','age'],['A to Z','name'],['Shuffle','shuffle']].forEach(([t,m])=>{const b=document.createElement('button');b.textContent=t;b.onclick=()=>organize(m);org.appendChild(b);});

function drawSegs(segs){
  for(const s of segs){const p=proj(s[0]),q=proj(s[1]);if(p[2]<0.03||q[2]<0.03)continue;ctx.strokeStyle=s[2]?LINE:FAINT;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(p[0],p[1]);ctx.lineTo(q[0],q[1]);ctx.stroke();}
}
let drawn=[];
function frame(now){
  const dt=Math.min(0.05,(now-last)/1000);last=now;
  if(auto)yaw+=dt*0.15*MOTION;else if((idle+=dt)>6)auto=true;
  const t=now/1000;
  ctx.setTransform(DPR,0,0,DPR,0,0);ctx.fillStyle='#f3f1ee';ctx.fillRect(0,0,W,H);
  setCam();ctx.lineJoin='round';ctx.lineCap='round';
  if(scene.segs)drawSegs(scene.segs);if(scene.back)scene.back();
  const eye=eyePos();
  const list=[];
  for(const q of scene.quads(t,dt)){const pp=q.pts.map(proj);if(pp.some(p=>p[2]<0.03))continue;let z=0;for(const p of pp)z+=p[2];const e=sub(eye,q.c);list.push({n:q.n,pp,z:z/pp.length,front:e[0]*q.nrm[0]+e[1]*q.nrm[1]+e[2]*q.nrm[2]>0});}
  list.sort((a,b)=>b.z-a.z);
  for(const d of list){
    const col=d.n.p.base||d.n.p.color;
    ctx.beginPath();d.pp.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();
    ctx.globalAlpha=d.front?0.92:0.6;ctx.fillStyle=d.front?d.n.p.color:'#fbf6e4';ctx.fill();ctx.globalAlpha=1;
    ctx.lineWidth=1;ctx.strokeStyle=d.front?'rgba(18,58,74,.7)':col;ctx.stroke();
  }
  drawn=list;
  if(scene.front)scene.front();
  const sel=VZ.sel;
  if(sel&&sel.ref){const d=list.find(x=>x.n===sel.ref);if(d){let x=0,y=0;d.pp.forEach(p=>{x+=p[0];y+=p[1];});VZ.selRing(ctx,x/d.pp.length,y/d.pp.length,22);}}
  requestAnimationFrame(frame);
}
function inside(pt,poly){let c=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>pt[1])!==(b[1]>pt[1])&&pt[0]<(b[0]-a[0])*(pt[1]-a[1])/(b[1]-a[1])+a[0])c=!c;}return c;}
function pick(x,y){for(let i=drawn.length-1;i>=0;i--)if(inside([x,y],drawn[i].pp))return drawn[i].n;return null;}
const clampD=d=>Math.max(scene.min,Math.min(scene.max,d));
/* screen point to a ray in the world */
function ray(sx,sy){
  setCam();const dx=(sx-W/2)/cam.f,dy=-(sy-H*0.52)/cam.f;
  const toW=v=>{const y=v[1]*cam.cp+v[2]*cam.sp,z1=-v[1]*cam.sp+v[2]*cam.cp;return [v[0]*cam.cy+z1*cam.sy,y,-v[0]*cam.sy+z1*cam.cy];};
  const o=toW([0,0,dist]);return {o:[o[0]+TG[0],o[1]+TG[1],o[2]+TG[2]],d:norm(toW([dx,dy,-1]))};
}
const ptrs=new Map();let moved=0,pinch0=0,dist0=dist,drag=null;
cv.addEventListener('pointerdown',e=>{cv.setPointerCapture(e.pointerId);ptrs.set(e.pointerId,[e.clientX,e.clientY]);moved=0;auto=false;idle=0;
  if(ptrs.size===1&&scene.surface){const n=pick(e.clientX,e.clientY);if(n){const r=ray(e.clientX,e.clientY),h=scene.surface.hit(r.o,r.d,n);if(h)drag={n,da:n.a-h[0],db:n.b-h[1]};}}
  if(ptrs.size===2){drag=null;const [a,b]=[...ptrs.values()];pinch0=Math.hypot(a[0]-b[0],a[1]-b[1]);dist0=dist;}});
cv.addEventListener('pointermove',e=>{
  if(!ptrs.has(e.pointerId))return;const p=ptrs.get(e.pointerId),dx=e.clientX-p[0],dy=e.clientY-p[1];ptrs.set(e.pointerId,[e.clientX,e.clientY]);idle=0;
  if(ptrs.size===1&&drag){moved+=Math.abs(dx)+Math.abs(dy);if(moved<6)return;const r=ray(e.clientX,e.clientY),h=scene.surface.hit(r.o,r.d,drag.n);if(h){drag.n.a=h[0]+drag.da;drag.n.b=h[1]+drag.db;drag.n.rank=rankTop;}}
  else if(ptrs.size===1){moved+=Math.abs(dx)+Math.abs(dy);yaw-=dx*0.008;pitch=Math.max(-0.6,Math.min(1.3,pitch+dy*0.006));}
  else if(ptrs.size===2){moved=99;const [a,b]=[...ptrs.values()],d=Math.hypot(a[0]-b[0],a[1]-b[1]);if(pinch0)dist=clampD(dist0*pinch0/d);}
});
function up(e){
  if(drag&&moved>=6){const n=drag.n;rankTop++;const st=saved[sceneKey]||(saved[sceneKey]={order:'age',seq:null,pos:{}});st.pos[n.p.name]=[+n.a.toFixed(4),+n.b.toFixed(4),n.rank];save();}
  else if(ptrs.size===1&&moved<8){const n=pick(e.clientX,e.clientY);if(n){const p=n.p;VZ.open({ref:n,title:p.name,kind:p.itch?'Sticky note, also on itch.io':'Sticky note',age:VZ.ageText(p),host:p.host});}else VZ.close();}
  drag=null;ptrs.delete(e.pointerId);if(ptrs.size<2)pinch0=0;}
cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',e=>{drag=null;ptrs.delete(e.pointerId);pinch0=0;});
cv.addEventListener('wheel',e=>{e.preventDefault();auto=false;idle=0;dist=clampD(dist*Math.exp(e.deltaY*0.0012));},{passive:false});
function resize(){DPR=Math.min(devicePixelRatio||1,2);W=innerWidth;H=innerHeight;cv.width=W*DPR;cv.height=H*DPR;}
addEventListener('resize',resize);resize();useScene((location.hash||'').slice(1));requestAnimationFrame(frame);
});
