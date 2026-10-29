VZ.load(P=>{
const {h32,poly,line,box,ring,label,INK,MOTION}=VZ;
const cv=document.getElementById('cv'),ctx=cv.getContext('2d');
const AC={tanker:{label:'Stilt walker, one of the biggest',v:8,idle:0.2},battle:{label:'Jogger, big and fast',v:30,idle:0.04},cargo:{label:'Pushing a stroller, big and steady',v:9,idle:0.2},tug:{label:'Dancer, small and nimble',v:6,idle:0.1},speed:{label:'Cyclist, small and quick',v:40,idle:0.04},sail:{label:'Strolling, light and easy',v:11,idle:0.4}};
const ACT={look:'stopped to look around',phone:'checking their phone',photo:'taking a picture'};
const act=P.filter(p=>!p.old),sit=P.filter(p=>p.old);
document.getElementById('count').textContent=act.length+' in the park, '+sit.length+' on the benches';
let W,H,DPR,S,T,HOR,GB,bg;
const yOf=d=>HOR+(GB-HOR)*Math.pow(d,1.15),sOf=d=>0.45+0.75*d;
const ps=act.map(p=>({p,u:0.04+h32(p.name,91)*0.92,d:0.04+h32(p.name,90)*0.9,th:h32(p.name,92)*6.28,turn:0,turnT:0,idle:0,act:null,ph:h32(p.name,93)*6,wob:h32(p.name,94)*6,spin:0,spinT:3+h32(p.name,95)*5,v:AC[p.kind].v*(0.85+p.speed*0.3)}));
const kiter=ps.find(a=>a.p.kind==='sail');
function build(){
  bg=document.createElement('canvas');bg.width=W*DPR;bg.height=H*DPR;const g=bg.getContext('2d');g.scale(DPR,DPR);
  g.fillStyle='#f7f9fa';g.fillRect(0,0,W,HOR);g.fillStyle='#f6f0e2';g.fillRect(0,HOR,W,H-HOR);
  g.strokeStyle='#8a7550';g.lineWidth=1.3;g.beginPath();g.moveTo(0,HOR);g.lineTo(W,HOR);g.stroke();
  g.strokeStyle='rgba(18,58,74,.35)';g.lineWidth=1.2;for(let i=0;i<9;i++){const x=W*(i/8),w=(18+h32('bw'+i,1)*26)*T,h=(30+h32('bh'+i,2)*60)*T;g.strokeRect(x-w/2,HOR-h,w,h);}
  for(let i=0;i<5;i++){const x=W*(0.1+i*0.2)+h32('tt'+i,3)*20,r=(12+h32('tr'+i,4)*8)*T;g.strokeStyle='#7f9f72';g.beginPath();g.arc(x,HOR+4*T-r-12*T,r,0,6.283);g.stroke();g.strokeStyle='rgba(18,58,74,.5)';g.beginPath();g.moveTo(x,HOR+4*T);g.lineTo(x,HOR+4*T-12*T);g.stroke();}
  g.strokeStyle='rgba(138,117,80,.35)';g.lineWidth=1;for(let k=0;k<3;k++){g.beginPath();for(let x=0;x<=W;x+=6){const d=0.2+k*0.3+Math.sin(x/W*6.28+k*2)*0.08,y=yOf(d);if(x===0)g.moveTo(x,y);else g.lineTo(x,y);}g.stroke();}
  g.strokeStyle='#b9c79a';for(let i=0;i<Math.round(W*H/2600);i++){const x=h32('gx'+i,1)*W,d=h32('gd'+i,2),y=yOf(d),s=sOf(d)*T;g.beginPath();g.moveTo(x-2*s,y);g.lineTo(x,y-3*s);g.lineTo(x+2*s,y);g.stroke();}
  for(let i=0;i<4;i++){const x=W*(0.12+i*0.26),y=yOf(0.25+(i%2)*0.35),s=sOf(0.25+(i%2)*0.35)*T;g.strokeStyle='rgba(18,58,74,.55)';g.lineWidth=1.2;g.beginPath();g.moveTo(x,y);g.lineTo(x,y-34*s);g.stroke();g.beginPath();g.arc(x,y-36*s,3*s,0,6.283);g.stroke();}
  const by=H*0.965;g.strokeStyle='rgba(18,58,74,.55)';g.lineWidth=1.2;const bw=W*0.9/3;
  for(let i=0;i<3;i++){const x=W*0.05+i*bw;g.beginPath();g.moveTo(x+4,by-10*T);g.lineTo(x+bw-4,by-10*T);g.moveTo(x+4,by-20*T);g.lineTo(x+bw-4,by-20*T);g.moveTo(x+8,by-10*T);g.lineTo(x+8,by);g.moveTo(x+bw-8,by-10*T);g.lineTo(x+bw-8,by);g.stroke();}
}
function resize(){DPR=Math.min(window.devicePixelRatio||1,2);W=innerWidth;H=innerHeight;cv.width=W*DPR;cv.height=H*DPR;HOR=H*0.26;GB=H*0.86;T=Math.max(0.85,Math.min(1.3,Math.min(W,H)/360));S=Math.max(0.95,Math.min(1.6,Math.sqrt(W*H/(act.length*1200))));
  sit.forEach((p,i)=>{p._x=W*0.07+(i+0.5)*(W*0.86/sit.length);p._y=H*0.965-18*T;p._L=22*T;});build();}
function limb(c,x,y,a1,l1,a2,l2,col){const kx=x+Math.sin(a1)*l1,ky=y+Math.cos(a1)*l1;c.strokeStyle=col;c.beginPath();c.moveTo(x,y);c.lineTo(kx,ky);c.lineTo(kx+Math.sin(a2)*l2,ky+Math.cos(a2)*l2);c.stroke();return [kx+Math.sin(a2)*l2,ky+Math.cos(a2)*l2];}
function person(c,kind,h,col,ph,t,seated,moving,doing,seed){
  c.lineWidth=1.2;c.lineJoin='round';c.lineCap='round';
  let lift=0,hip=-h*0.47,lean=0,legA=moving?0.5:0,armA=moving?0.5:0.08,stilt=0,headDown=0;
  if(kind==='tanker')stilt=h*0.5;
  if(kind==='battle'&&moving){lean=0.18;legA=0.8;armA=0.9;}
  if(kind==='tug'&&!doing){lift=-Math.max(0,Math.sin(ph*2))*h*0.12;legA=0.4;}
  if(doing==='phone')headDown=h*0.03;
  const by=lift-stilt;
  if(seated){hip=-h*0.3;line(c,0,by+hip,h*0.22,by+hip,col);line(c,h*0.22,by+hip,h*0.24,by,col);}
  else if(kind==='speed'&&!doing){const r=h*0.2;ring(c,-h*0.32,-r,r,col);ring(c,h*0.32,-r,r,col);c.strokeStyle=col;c.beginPath();c.moveTo(-h*0.32,-r);c.lineTo(-h*0.05,-r);c.lineTo(h*0.12,-h*0.48);c.lineTo(-h*0.1,-h*0.48);c.closePath();c.moveTo(h*0.32,-r);c.lineTo(h*0.2,-h*0.58);c.lineTo(h*0.12,-h*0.58);c.stroke();
    hip=-h*0.5;for(const o of [0,Math.PI]){const px=-h*0.05+Math.cos(ph*2+o)*h*0.08,py=-r+Math.sin(ph*2+o)*h*0.08;c.globalAlpha=o?0.5:1;line(c,0,hip,px*0.5+h*0.06,(hip+py)/2,col);line(c,px*0.5+h*0.06,(hip+py)/2,px,py,col);}c.globalAlpha=1;}
  else{for(const o of [0,Math.PI]){c.globalAlpha=o?0.5:1;const a=Math.sin(ph+o)*legA+(moving?0:(o?-0.08:0.08)),b=a-(moving?Math.max(0,Math.cos(ph+o))*0.7:0);const f=limb(c,0,by+hip,a,h*0.24,b,h*0.24,col);if(stilt)line(c,f[0],f[1],f[0]+Math.sin(a)*2,f[1]+stilt,col);else line(c,f[0],f[1],f[0]+h*0.07,f[1],col);}c.globalAlpha=1;
    if(kind==='speed'){const r=h*0.2;c.globalAlpha=0.6;ring(c,h*0.35,-r,r,col);ring(c,h*0.95,-r,r,col);line(c,h*0.35,-r,h*0.95,-r,col);c.globalAlpha=1;}}
  const sy=by+hip-h*0.32,sx=Math.sin(lean)*h*0.3;
  poly(c,[[-h*0.07,by+hip],[h*0.07,by+hip],[sx+h*0.09,sy],[sx-h*0.09,sy]],col);
  const hx=sx+h*0.03+headDown,hy=sy-h*0.12+headDown;ring(c,hx,hy,h*0.1,col);line(c,hx-h*0.09,hy-h*0.06,hx+h*0.07,hy-h*0.08,col);
  if(seated){line(c,sx+h*0.05,sy+h*0.06,sx+h*0.28,sy+h*0.08,col);box(c,sx+h*0.22,sy-h*0.06,sx+h*0.36,sy+h*0.14,col);return;}
  const shx=sx,shy=sy+h*0.03;
  if(doing==='phone'){for(const o of [0,1]){c.globalAlpha=o?0.5:1;limb(c,shx,shy,0.35,h*0.16,1.75,h*0.14,col);}c.globalAlpha=1;box(c,shx+h*0.18,shy+h*0.06,shx+h*0.24,shy+h*0.16,col);ring(c,shx+h*0.21,shy+h*0.11,0.3,'#2f6fd6');}
  else if(doing==='photo'){for(const o of [0,1]){c.globalAlpha=o?0.5:1;limb(c,shx,shy,1.5,h*0.15,2.7,h*0.13,col);}c.globalAlpha=1;const cx=shx+h*0.17,cy=shy-h*0.12;box(c,cx-h*0.03,cy-h*0.04,cx+h*0.08,cy+h*0.04,col);ring(c,cx+h*0.025,cy,h*0.02,col);if(Math.sin(t*1.7+seed)>0.97){c.strokeStyle='#e07800';for(let k=0;k<6;k++){const a=k/6*6.283;c.beginPath();c.moveTo(cx+h*0.1+Math.cos(a)*h*0.04,cy+Math.sin(a)*h*0.04);c.lineTo(cx+h*0.1+Math.cos(a)*h*0.11,cy+Math.sin(a)*h*0.11);c.stroke();}}}
  else if(doing==='look'){limb(c,shx,shy,2.2,h*0.17,2.3,h*0.15,col);c.globalAlpha=0.5;limb(c,shx,shy,0.05,h*0.17,0.1,h*0.15,col);c.globalAlpha=1;}
  else if(kind==='tug'){for(const s of [1,-1]){const a=Math.PI+s*(0.5+0.4*Math.sin(t*6+s));limb(c,shx,shy,a,h*0.18,a+s*0.3,h*0.16,col);}}
  else if(kind==='cargo'){limb(c,shx,shy,1.1,h*0.18,1.6,h*0.16,col);const cx=sx+h*0.42;line(c,sx+h*0.32,sy+h*0.15,cx,sy+h*0.15,col);c.strokeStyle=col;c.beginPath();c.moveTo(cx,sy+h*0.15);c.lineTo(cx+h*0.05,by-h*0.12);c.lineTo(cx+h*0.4,by-h*0.12);c.arc(cx+h*0.3,by-h*0.25,h*0.13,0.5,-1.6,true);c.stroke();ring(c,cx+h*0.08,by-h*0.05,h*0.05,col);ring(c,cx+h*0.35,by-h*0.05,h*0.05,col);}
  else if(kind==='speed'){limb(c,shx,shy,1.2,h*0.16,1.5,h*0.14,col);}
  else{for(const o of [0,Math.PI]){c.globalAlpha=o?0.5:1;const a=-Math.sin(ph+o)*armA;limb(c,shx,shy,a,h*0.17,a+(kind==='battle'&&moving?-1.2:0.15),h*0.15,col);}c.globalAlpha=1;}
}
function adiff(a,b){let d=a-b;while(d>Math.PI)d-=6.283;while(d<-Math.PI)d+=6.283;return d;}
let last=performance.now();
function frame(now){
  const dt=Math.min(0.05,(now-last)/1000)*MOTION,t=now/1000;last=now;
  ctx.setTransform(DPR,0,0,DPR,0,0);ctx.drawImage(bg,0,0,W,H);
  const fd=0.18,fx=W*0.5,fy=yOf(fd),fs=sOf(fd)*T;ctx.lineWidth=1.2;ctx.strokeStyle=INK;ctx.beginPath();ctx.ellipse(fx,fy,40*fs,7*fs,0,0,6.283);ctx.stroke();line(ctx,fx,fy,fx,fy-22*fs,INK);
  ctx.strokeStyle='rgba(47,111,214,.5)';for(let k=0;k<6;k++){const a=k/6*Math.PI-Math.PI/2+Math.sin(t*2)*0.05,len=(28+Math.sin(t*3+k)*2)*fs;ctx.beginPath();ctx.moveTo(fx,fy-22*fs);ctx.quadraticCurveTo(fx+Math.sin(a+Math.PI/2)*len*0.6,fy-40*fs,fx+Math.sin(a+Math.PI/2)*len,fy-2*fs);ctx.stroke();}
  for(const a of ps){const ac=AC[a.p.kind];
    a.turnT-=dt;if(a.turnT<=0){a.turn=(Math.random()-0.5)*1.4;a.turnT=1.5+Math.random()*3;if(!a.idle&&Math.random()<ac.idle){a.idle=2+Math.random()*4;a.act=['look','phone','photo'][Math.floor(Math.random()*3)];if(a.p.kind==='speed'||a.p.kind==='cargo')a.act='phone';}}
    if(a.p.kind==='tug'){a.spinT-=dt;if(a.spinT<=0){a.spin=Math.PI;a.spinT=2+Math.random()*4;}}
    let tr=a.turn;if(a.spin>0){const d=Math.min(a.spin,dt*3);a.th+=d;a.spin-=d;tr=0;}
    const m=0.03;if(a.u<m||a.u>1-m||a.d<0.03||a.d>0.95){const want=Math.atan2((0.5-a.d)*0.6,(0.5-a.u));tr=Math.sign(adiff(want,a.th))*2;a.idle=0;a.act=null;}
    a.th+=tr*dt*(a.idle>0?0.3:1);if(a.idle>0){a.idle-=dt;if(a.idle<=0)a.act=null;}
    const v=a.idle>0?0:a.v,s=sOf(a.d);a.u+=Math.cos(a.th)*v*T*s*dt/W;a.d+=Math.sin(a.th)*v*T*s*dt/(GB-HOR)*0.6;a.u=Math.max(0,Math.min(1,a.u));a.d=Math.max(0.01,Math.min(0.97,a.d));
    if(v>0||a.p.kind==='tug')a.ph+=dt*(1.6+v*0.15);a.moving=v>0;}
  const order=ps.slice().sort((a,b)=>a.d-b.d);
  for(const a of order){const s=sOf(a.d),h=26*S*s*(a.p.kind==='tanker'?1:0.85+a.p.sizeF*0.15),x=a.u*W,y=yOf(a.d);const c=Math.cos(a.th),fxs=(c>=0?1:-1)*Math.max(0.35,Math.abs(c));
    a._x=x;a._y=y-h*(a.p.kind==='tanker'?0.9:0.5);a._L=h*(a.p.kind==='tanker'?1.5:1);
    ctx.save();ctx.translate(x,y);ctx.globalAlpha=0.12;ctx.fillStyle=INK;ctx.beginPath();ctx.ellipse(0,0,h*0.18,h*0.04,0,0,6.283);ctx.fill();ctx.globalAlpha=1;ctx.scale(fxs,1);person(ctx,a.p.kind,h,a.p.color,a.ph,t,false,a.moving,a.act,a.wob);ctx.restore();
    if(a===kiter){const kx=x+fxs*h*0.2,ky=y-h*0.75,tx=Math.min(W-20,Math.max(20,x+W*0.18*Math.sign(fxs)+Math.sin(t*0.7)*14*T)),ty=HOR*0.5+Math.sin(t*1.1)*10*T;ctx.strokeStyle='rgba(18,58,74,.4)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(kx,ky);ctx.quadraticCurveTo((kx+tx)/2,ty+(ky-ty)*0.7,tx,ty);ctx.stroke();ctx.lineWidth=1.2;poly(ctx,[[tx,ty-12*T],[tx+8*T,ty],[tx,ty+12*T],[tx-8*T,ty]],a.p.color);line(ctx,tx,ty+12*T,tx-6*T+Math.sin(t*4)*3,ty+24*T,a.p.color);}}
  for(const p of sit){ctx.save();ctx.translate(p._x,H*0.965-10*T);person(ctx,p.kind,24*T,p.color,0,t,true,false,null,0);ctx.restore();}
  const zt=t%3;ctx.globalAlpha=Math.max(0,1-zt/3);label(ctx,'z',W*0.3+zt*3,H*0.965-44*T-zt*7*T,'center',9*T);ctx.globalAlpha=1;
  label(ctx,'Benches, 90 days or more',W*0.05,H*0.965-50*T,'left',10*T);
  const s=VZ.sel;if(s&&s.ref)VZ.selRing(ctx,s.ref._x,s.ref._y,s.ref._L*0.55+6);
  requestAnimationFrame(frame);
}
cv.addEventListener('pointerdown',e=>{let best=null,bd=1e9;const X=e.clientX,Y=e.clientY;
  const test=(o,p)=>{if(o._x==null)return;const d=Math.hypot(X-o._x,Y-o._y);if(d<Math.max(o._L*0.55,14)&&d<bd){bd=d;best=[o,p];}};
  for(const a of ps)test(a,a.p);for(const p of sit)test(p,p);
  if(best){const [o,p]=best;VZ.open({ref:o,title:p.name,kind:(p.old?'Reading on a bench':(o.act?AC[p.kind].label.split(',')[0]+', '+ACT[o.act]:AC[p.kind].label))+VZ.sizeText(p),age:VZ.ageText(p),host:p.host});}else VZ.close();});
addEventListener('resize',resize);resize();requestAnimationFrame(frame);
});
