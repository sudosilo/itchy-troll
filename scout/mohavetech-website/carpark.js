VZ.load(P=>{
const {h32,poly,line,box,ring,label,INK,MOTION}=VZ;
const cv=document.getElementById('cv'),ctx=cv.getContext('2d');
const VT={tanker:{label:'Motorhome, one of the biggest',l:0.98,w:0.86},battle:{label:'Muscle car, big and fast',l:0.86,w:0.72},cargo:{label:'Van, big and steady',l:0.88,w:0.76},tug:{label:'Pickup truck, small and nimble',l:0.9,w:0.74},speed:{label:'Sports car, small and quick',l:0.8,w:0.68},sail:{label:'Compact car, light and easy',l:0.7,w:0.64}};
const LOT='#f2f1ec',PAINT='#c9c6b8';
let W,H,DPR,T,SW,SH,AIS,stalls=[],cars=[],odd=[],parties=[],aisles=[],cruiser={a:0,x:0,dir:1},bg;
document.getElementById('count').textContent=P.filter(p=>!p.old).length+' parked, '+P.filter(p=>p.old).length+' under car covers';
const ODD=['cart','cone','couch','pool','boat','chair','dumpster','cone','cart','balloons','cart','couch'];
function layout(){
  const TOP=84,need=Math.round(P.length*1.45);
  for(let sw=34*T;sw>10;sw-=0.5){const sh=sw*1.8,ais=sw*1.5,isl=sw*1.1,pairH=2*sh+ais,pairs=Math.floor((H-TOP-12)/pairH),per=Math.floor((W-16-2*isl)/sw);if(pairs*2*per>=need){SW=sw;SH=sh;AIS=ais;
    const x0=(W-per*sw)/2;stalls=[];aisles=[];
    for(let p=0;p<pairs;p++){const y0=TOP+p*pairH;aisles.push(y0+sh*2+ais/2);for(let r=0;r<2;r++)for(let i=0;i<per;i++)stalls.push({x:x0+i*sw,y:y0+r*sh,row:p*2+r,i,face:r===0?1:-1});}
    stalls.forEach(s=>s.isl=[x0-isl,x0+per*sw]);break;}}
  const order=stalls.map((s,i)=>[h32('st'+i,1),i]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]);
  stalls.forEach(s=>{s.car=null;s.odd=null;s.party=null;});
  cars=[];P.forEach((p,k)=>{const s=stalls[order[k]];s.car=p;cars.push({p,s,face:h32(p.name,120)>0.5?s.face:-s.face,seed:h32(p.name,121)});});
  parties=[];for(const c of cars){if(parties.length>=6)break;if(c.p.old||(c.p.kind!=='tug'&&c.p.kind!=='battle'))continue;const nb=stalls.find(s=>s.row===c.s.row&&s.i===c.s.i+1);if(nb&&!nb.car&&!nb.odd&&!nb.party){nb.party=c;parties.push({s:nb,c,ppl:[0,1,2,3].map(k=>({a:h32('pa'+k+c.seed,1)*6.28,r:0.3+h32('pr'+k+c.seed,2)*0.15,col:['#2f6fd6','#d93636','#1e9e3e','#e07800'][k]}))});}}
  let k=0;odd=[];for(let j=P.length;j<stalls.length&&odd.length<14;j++){const s=stalls[order[j]];if(s.party||s.car)continue;if(h32('od'+j,3)<0.45){s.odd=ODD[k++%ODD.length];odd.push(s);}}
}
function buildBg(){
  bg=document.createElement('canvas');bg.width=W*DPR;bg.height=H*DPR;const g=bg.getContext('2d');g.scale(DPR,DPR);
  g.fillStyle=LOT;g.fillRect(0,0,W,H);g.lineWidth=1.2;
  g.strokeStyle=PAINT;for(const s of stalls){g.beginPath();g.moveTo(s.x,s.y);g.lineTo(s.x,s.y+SH);g.moveTo(s.x+SW,s.y);g.lineTo(s.x+SW,s.y+SH);g.stroke();if(s.face===1){g.beginPath();g.moveTo(s.x,s.y+SH);g.lineTo(s.x+SW,s.y+SH);g.stroke();}}
  const rows=[...new Set(stalls.map(s=>s.row))];
  for(const r of rows){if(r%2)continue;const s0=stalls.find(s=>s.row===r);const y0=s0.y,h=SH*2;for(const xx of s0.isl){const x=xx===s0.isl[0]?xx+2:xx+2,w=SW*1.1-4;g.strokeStyle='rgba(18,58,74,.45)';g.strokeRect(x,y0+3,w,h-6);g.strokeStyle='#7f9f72';for(let k=0;k<3;k++){g.beginPath();g.arc(x+w/2,y0+h*(0.2+k*0.3),w*0.32,0,6.283);g.stroke();}g.strokeStyle='rgba(18,58,74,.55)';g.beginPath();g.arc(x+w/2,y0+h*0.5,1.6*T,0,6.283);g.stroke();}}
  g.strokeStyle='rgba(201,198,184,.9)';g.setLineDash([6,8]);for(const y of aisles){g.beginPath();g.moveTo(SW,y);g.lineTo(W-SW,y);g.stroke();}g.setLineDash([]);
  g.fillStyle='#8a8a80';for(const y of aisles){for(const x of [W*0.3,W*0.7]){g.save();g.translate(x,y);g.strokeStyle=PAINT;g.beginPath();g.moveTo(-6*T,-3*T);g.lineTo(6*T,-3*T);g.lineTo(6*T,-6*T);g.lineTo(11*T,0);g.lineTo(6*T,6*T);g.lineTo(6*T,3*T);g.lineTo(-6*T,3*T);g.closePath();g.stroke();g.restore();}}
}
function resize(){DPR=Math.min(window.devicePixelRatio||1,2);W=innerWidth;H=innerHeight;cv.width=W*DPR;cv.height=H*DPR;T=Math.max(0.85,Math.min(1.3,Math.min(W,H)/360));layout();buildBg();}
function carShape(c,kind,L,Wd,col,old,t,seed,fresh){
  c.lineWidth=1.15;c.lineJoin='round';const l=L/2,w=Wd/2,fill=LOT;
  const body=(r)=>{c.beginPath();c.moveTo(-w+r,-l);c.lineTo(w-r,-l);c.quadraticCurveTo(w,-l,w,-l+r);c.lineTo(w,l-r);c.quadraticCurveTo(w,l,w-r,l);c.lineTo(-w+r,l);c.quadraticCurveTo(-w,l,-w,l-r);c.lineTo(-w,-l+r);c.quadraticCurveTo(-w,-l,-w+r,-l);c.closePath();c.fillStyle=fill;c.fill();c.strokeStyle=col;c.stroke();};
  if(old){c.setLineDash([3,3]);body(w*0.6);c.setLineDash([]);line(c,-w,-l*0.6,w,l*0.2,col);line(c,-w,l*0.1,w,l*0.8,col);line(c,-w*0.6,-l,w*0.2,-l*0.2,col);return;}
  if(kind==='tanker'){body(w*0.25);box(c,-w*0.8,-l*0.92,w*0.8,-l*0.72,col);box(c,-w*0.4,-l*0.3,w*0.4,l*0.05,col);box(c,-w*0.4,l*0.3,w*0.4,l*0.6,col);ring(c,w*0.4,l*0.8,w*0.12,col);}
  else if(kind==='tug'){body(w*0.35);poly(c,[[-w*0.8,-l*0.62],[w*0.8,-l*0.62],[w*0.7,-l*0.42],[-w*0.7,-l*0.42]],col);box(c,-w*0.75,-l*0.42,w*0.75,-l*0.1,col);box(c,-w*0.8,l*0.05,w*0.8,l*0.92,col);}
  else if(kind==='cargo'){body(w*0.3);poly(c,[[-w*0.85,-l*0.72],[w*0.85,-l*0.72],[w*0.75,-l*0.55],[-w*0.75,-l*0.55]],col);box(c,-w*0.75,-l*0.5,w*0.75,l*0.85,col);}
  else if(kind==='speed'){body(w*0.7);poly(c,[[-w*0.75,-l*0.3],[w*0.75,-l*0.3],[w*0.6,-l*0.05],[-w*0.6,-l*0.05]],col);box(c,-w*0.6,-l*0.05,w*0.6,l*0.3,col);line(c,-w*0.6,l*0.45,w*0.6,l*0.45,col);}
  else if(kind==='battle'){body(w*0.4);line(c,-w*0.18,-l,-w*0.18,-l*0.35,col);line(c,w*0.18,-l,w*0.18,-l*0.35,col);poly(c,[[-w*0.8,-l*0.32],[w*0.8,-l*0.32],[w*0.68,-l*0.1],[-w*0.68,-l*0.1]],col);box(c,-w*0.68,-l*0.1,w*0.68,l*0.35,col);poly(c,[[-w*0.68,l*0.35],[w*0.68,l*0.35],[w*0.78,l*0.55],[-w*0.78,l*0.55]],col);}
  else{body(w*0.8);poly(c,[[-w*0.75,-l*0.38],[w*0.75,-l*0.38],[w*0.6,-l*0.15],[-w*0.6,-l*0.15]],col);box(c,-w*0.6,-l*0.15,w*0.6,l*0.35,col);}
  if(fresh&&Math.sin(t*2.2+seed*20)>0.85){c.strokeStyle='#e07800';for(const s of [-1,1]){c.beginPath();c.arc(s*w*0.6,-l-2,2.4*T,0,6.283);c.stroke();}}
}
function oddThing(c,s,kind,t){const cx=s.x+SW/2,cy=s.y+SH/2;c.save();c.translate(cx,cy);c.lineWidth=1.1;const g='rgba(18,58,74,.6)';
  if(kind==='cart'){c.rotate(0.4);box(c,-SW*0.25,-SH*0.18,SW*0.25,SH*0.18,g);for(let k=-2;k<=2;k++)line(c,k*SW*0.1,-SH*0.18,k*SW*0.1,SH*0.18,g);line(c,-SW*0.3,SH*0.24,SW*0.3,SH*0.24,g);}
  else if(kind==='cone'){ring(c,0,0,SW*0.22,'#e07800');ring(c,0,0,SW*0.12,'#e07800');box(c,-SW*0.3,-SW*0.3,SW*0.3,SW*0.3,'#e07800');}
  else if(kind==='couch'){box(c,-SW*0.38,-SH*0.25,SW*0.38,SH*0.25,'#2f6fd6');box(c,-SW*0.38,-SH*0.25,-SW*0.22,SH*0.25,'#2f6fd6');box(c,SW*0.22,-SH*0.25,SW*0.38,SH*0.25,'#2f6fd6');line(c,-SW*0.22,0,SW*0.22,0,'#2f6fd6');}
  else if(kind==='pool'){ring(c,0,0,SW*0.4,'#2f6fd6');ring(c,0,0,SW*0.3,'#2f6fd6');c.strokeStyle='rgba(47,111,214,.6)';c.beginPath();c.moveTo(-SW*0.2,Math.sin(t*2)*2);c.quadraticCurveTo(0,-4,SW*0.2,Math.sin(t*2)*2);c.stroke();}
  else if(kind==='boat'){poly(c,[[0,-SH*0.45],[SW*0.35,-SH*0.15],[SW*0.3,SH*0.35],[-SW*0.3,SH*0.35],[-SW*0.35,-SH*0.15]],g);line(c,0,SH*0.35,0,SH*0.48,g);box(c,-SW*0.15,0,SW*0.15,SH*0.2,g);}
  else if(kind==='chair'){box(c,-SW*0.18,-SW*0.1,SW*0.18,SW*0.3,'#1e9e3e');c.strokeStyle='#d93636';c.beginPath();c.arc(0,-SW*0.05,SW*0.42,Math.PI,0);c.stroke();line(c,0,-SW*0.05,0,-SW*0.47,'#d93636');}
  else if(kind==='dumpster'){box(c,-SW*0.42,-SH*0.3,SW*0.42,SH*0.3,'#1e9e3e');line(c,-SW*0.42,0,SW*0.42,0,'#1e9e3e');line(c,-SW*0.42,-SH*0.3,SW*0.42,SH*0.3,'#1e9e3e');}
  else{for(const [dx,col] of [[-0.15,'#d93636'],[0.12,'#2f6fd6'],[0,'#c49a00']]){const bx=dx*SW+Math.sin(t*1.5+dx*9)*2,by=-SH*0.25+Math.cos(t*1.3+dx*7)*2;ring(c,bx,by,SW*0.16,col);line(c,bx,by+SW*0.16,0,SH*0.3,'rgba(18,58,74,.4)');}box(c,-SW*0.08,SH*0.28,SW*0.08,SH*0.36,g);}
  c.restore();}
function party(c,pt,t){const s=pt.s,cx=s.x+SW/2,cy=s.y+SH/2;c.lineWidth=1.1;c.setLineDash([4,3]);box(c,s.x+2,s.y+3,s.x+SW-2,s.y+SH*0.55,'rgba(18,58,74,.5)');c.setLineDash([]);line(c,s.x+2,s.y+3,s.x+SW-2,s.y+SH*0.55,'rgba(18,58,74,.25)');line(c,s.x+SW-2,s.y+3,s.x+2,s.y+SH*0.55,'rgba(18,58,74,.25)');
  const gx=cx,gy=s.y+SH*0.75;ring(c,gx,gy,SW*0.16,INK);line(c,gx-SW*0.12,gy,gx+SW*0.12,gy,INK);for(let k=0;k<3;k++){const ph=(t*0.6+k/3)%1;c.globalAlpha=0.4*(1-ph);ring(c,gx+Math.sin(t+k)*3,gy-ph*SH*0.5,2+ph*5,INK);}c.globalAlpha=1;
  box(c,s.x+SW*0.1,s.y+SH*0.12,s.x+SW*0.35,s.y+SH*0.25,'#2f6fd6');
  for(const p of pt.ppl){const a=p.a+t*0.15,x=cx+Math.cos(a)*SW*p.r,y=s.y+SH*0.38+Math.sin(a)*SH*0.12+Math.sin(t*4+p.a)*1.2;ring(c,x,y,SW*0.09,p.col);c.beginPath();c.ellipse(x,y,SW*0.16,SW*0.07,0,0,6.283);c.strokeStyle=p.col;c.stroke();}
  if(Math.sin(t*3+pt.c.seed*10)>0.3){c.font='600 '+Math.round(9*T)+'px sans-serif';c.fillStyle='rgba(18,58,74,.5)';c.fillText('\u266A',s.x+SW*0.8,s.y+SH*0.15-((t*20)%10));}}
let last=performance.now();
function frame(now){
  const dt=Math.min(0.05,(now-last)/1000)*MOTION,t=now/1000;last=now;
  ctx.setTransform(DPR,0,0,DPR,0,0);ctx.drawImage(bg,0,0,W,H);
  for(const s of odd)oddThing(ctx,s,s.odd,t);
  for(const pt of parties)party(ctx,pt,t);
  for(const c of cars){const vt=VT[c.p.kind],L=SH*vt.l*0.92,Wd=SW*vt.w,x=c.s.x+SW/2,y=c.s.y+SH/2;c._x=x;c._y=y;c._L=L;
    ctx.save();ctx.translate(x,y);if(c.face<0)ctx.rotate(Math.PI);carShape(ctx,c.p.kind,L,Wd,c.p.color,c.p.old,t,c.seed,c.p.days!=null&&c.p.days<7);ctx.restore();}
  if(aisles.length){cruiser.x+=cruiser.dir*24*T*dt;if(cruiser.x>W+20||cruiser.x<-20){cruiser.a=(cruiser.a+1)%aisles.length;cruiser.dir*=-1;cruiser.x=cruiser.dir>0?-20:W+20;}
    const y=aisles[cruiser.a]+cruiser.dir*SW*0.3;ctx.save();ctx.translate(cruiser.x,y);ctx.rotate(cruiser.dir>0?Math.PI/2:-Math.PI/2);carShape(ctx,'sail',SH*0.7,SW*0.62,'rgba(18,58,74,.55)',false,t,0,false);ctx.restore();}
  const s=VZ.sel;if(s&&s.ref){const c=s.ref;ctx.strokeStyle=INK;ctx.lineWidth=2;ctx.setLineDash([5,4]);ctx.strokeRect(c.s.x+1,c.s.y+1,SW-2,SH-2);ctx.setLineDash([]);}
  requestAnimationFrame(frame);
}
cv.addEventListener('pointerdown',e=>{const X=e.clientX,Y=e.clientY;let best=null;
  for(const c of cars)if(X>=c.s.x&&X<=c.s.x+SW&&Y>=c.s.y&&Y<=c.s.y+SH){best=c;break;}
  if(best){const p=best.p,pt=parties.find(q=>q.c===best);VZ.open({ref:best,title:p.name,kind:(p.old?'Under a car cover, 90 days or more':VT[p.kind].label+(pt?', throwing a tailgate party':''))+VZ.sizeText(p),age:VZ.ageText(p),host:p.host});}else VZ.close();});
addEventListener('resize',resize);resize();requestAnimationFrame(frame);
});
