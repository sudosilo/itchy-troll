VZ.load(P=>{
const {h32,poly,line,box,ring,label,INK,MOTION}=VZ;
const cv=document.getElementById('cv'),ctx=cv.getContext('2d');
const AK={tanker:{label:'Queen ant, one of the biggest',L:22},battle:{label:'Soldier ant, big and fast',L:15},cargo:{label:'Worker ant carrying food, big and steady',L:13},tug:{label:'Scout ant, small and nimble',L:9},speed:{label:'Runner ant, small and quick',L:10},sail:{label:'Nurse ant, light and easy',L:10}};
const SOIL='#efe6d2';
const live=P.filter(p=>!p.old),sleep=P.filter(p=>p.old);
document.getElementById('count').textContent=live.length+' ants at work, '+sleep.length+' hibernating';
let W,H,DPR,T,S,SURF,ch={},tun=[];
function resize(){DPR=Math.min(window.devicePixelRatio||1,2);W=innerWidth;H=innerHeight;cv.width=W*DPR;cv.height=H*DPR;T=Math.max(0.85,Math.min(1.3,Math.min(W,H)/360));S=Math.max(0.9,Math.min(1.5,Math.sqrt(W*H/(live.length*2200))));SURF=H*0.2;
  ch={entrance:{x:W*0.5,y:SURF,rx:0,ry:0},queen:{x:W*0.5,y:H*0.5,rx:W*0.2,ry:H*0.06},nursery:{x:W*0.2,y:H*0.36,rx:W*0.14,ry:H*0.05},food:{x:W*0.8,y:H*0.38,rx:W*0.14,ry:H*0.05},barracks:{x:W*0.22,y:H*0.66,rx:W*0.15,ry:H*0.05},store:{x:W*0.78,y:H*0.7,rx:W*0.16,ry:H*0.06},deep:{x:W*0.5,y:H*0.87,rx:W*0.3,ry:H*0.06}};
  const P2=(a,b,bend)=>{const pts=[];for(let i=0;i<=24;i++){const u=i/24,x=a.x+(b.x-a.x)*u+Math.sin(u*Math.PI)*bend,y=a.y+(b.y-a.y)*u;pts.push([x,y]);}return pts;};
  tun=[P2(ch.entrance,ch.nursery,-W*0.05),P2(ch.entrance,ch.food,W*0.05),P2(ch.nursery,ch.queen,W*0.06),P2(ch.food,ch.queen,-W*0.06),P2(ch.queen,ch.barracks,-W*0.04),P2(ch.queen,ch.store,W*0.04),P2(ch.barracks,ch.deep,W*0.05),P2(ch.store,ch.deep,-W*0.05),P2(ch.nursery,ch.barracks,-W*0.06),P2(ch.food,ch.store,W*0.06)];
  tun.forEach(t=>{let L=0;t.cum=[0];for(let i=1;i<t.length;i++){L+=Math.hypot(t[i][0]-t[i-1][0],t[i][1]-t[i-1][1]);t.cum.push(L);}t.len=L;});
  sleep.forEach((p,i)=>{const n=sleep.length,a=(i+0.5)/n;p._x=ch.deep.x-ch.deep.rx*0.8+a*ch.deep.rx*1.6;p._y=ch.deep.y+Math.sin(a*9)*ch.deep.ry*0.3;p._L=12*T;});}
const home={tanker:'queen',sail:'nursery',battle:'barracks'};
const ants=live.map(p=>({p,mode:home[p.kind]?'room':'tunnel',room:home[p.kind],tu:Math.floor(h32(p.name,150)*10),s:h32(p.name,151),dir:h32(p.name,152)>0.5?1:-1,a:h32(p.name,153)*6.28,u:h32(p.name,154),w:h32(p.name,155),ph:h32(p.name,156)*6,v:(p.kind==='tug'||p.kind==='speed'?30:p.kind==='cargo'?14:18)*(0.85+p.speed*0.3),surf:0}));
function atT(t,s){const L=t.len;s=Math.max(0,Math.min(L,s));let i=1;while(i<t.length-1&&t.cum[i]<s)i++;const f=(s-t.cum[i-1])/((t.cum[i]-t.cum[i-1])||1);return [t[i-1][0]+(t[i][0]-t[i-1][0])*f,t[i-1][1]+(t[i][1]-t[i-1][1])*f,Math.atan2(t[i][1]-t[i-1][1],t[i][0]-t[i-1][0])];}
function ant(c,L,col,ph,carry,curled){c.lineWidth=1.1;c.lineCap='round';
  if(curled){c.strokeStyle=col;c.beginPath();c.arc(0,0,L*0.32,0.4,5.6);c.stroke();ring(c,L*0.28,-L*0.12,L*0.1,col);return;}
  for(const sx of [-0.12,0,0.12])for(const sd of [1,-1]){const sw=Math.sin(ph*8+sx*20+(sd>0?0:Math.PI))*0.4;c.strokeStyle=col;c.beginPath();c.moveTo(sx*L,0);c.lineTo(sx*L+Math.cos(1.2+sw)*L*0.22*(sx<0?-1:1)*0.6,sd*L*0.18);c.lineTo(sx*L+(sx*1.5+sw*0.2)*L*0.4,sd*L*0.3);c.stroke();}
  c.fillStyle=SOIL;for(const [x,rx,ry] of [[-L*0.3,L*0.22,L*0.14],[0,L*0.12,L*0.08],[L*0.24,L*0.12,L*0.1]]){c.beginPath();c.ellipse(x,0,rx,ry,0,0,6.283);c.fill();c.strokeStyle=col;c.stroke();}
  line(c,L*0.33,-L*0.05,L*0.48,-L*0.2,col);line(c,L*0.33,L*0.05,L*0.48,L*0.2,col);
  if(carry==='leaf'){c.strokeStyle='#1e9e3e';c.beginPath();c.ellipse(L*0.5,-L*0.25,L*0.2,L*0.1,-0.6,0,6.283);c.stroke();}else if(carry==='crumb')box(c,L*0.38,-L*0.1,L*0.56,L*0.08,'#c49a00');}
let last=performance.now();
function frame(now){
  const dt=Math.min(0.05,(now-last)/1000)*MOTION,t=now/1000;last=now;
  ctx.setTransform(DPR,0,0,DPR,0,0);ctx.fillStyle='#f7f9fa';ctx.fillRect(0,0,W,SURF);ctx.fillStyle=SOIL;ctx.fillRect(0,SURF,W,H-SURF);
  ctx.strokeStyle='#8a7550';ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(0,SURF);ctx.lineTo(W*0.42,SURF);ctx.quadraticCurveTo(W*0.5,SURF-28*T,W*0.58,SURF);ctx.lineTo(W,SURF);ctx.stroke();
  ctx.strokeStyle='#9bb08a';for(let x=4;x<W;x+=7*T){if(Math.abs(x-W*0.5)<W*0.09)continue;const sw=Math.sin(t*1.3+x)*2;line(ctx,x,SURF,x+sw,SURF-6*T-(x*7%5)*T,'#9bb08a');}
  ctx.strokeStyle='rgba(18,58,74,.12)';for(let i=0;i<70;i++){const x=h32('pb'+i,1)*W,y=SURF+h32('pc'+i,2)*(H-SURF);ctx.beginPath();ctx.arc(x,y,1+h32('pd'+i,3)*2,0,6.283);ctx.stroke();}
  ctx.fillStyle='#fbf7ee';ctx.strokeStyle='rgba(138,117,80,.7)';ctx.lineWidth=1.2;
  for(const t2 of tun){ctx.lineWidth=12*T;ctx.strokeStyle='rgba(138,117,80,.7)';ctx.beginPath();t2.forEach((q,i)=>i?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]));ctx.stroke();}
  for(const t2 of tun){ctx.lineWidth=9.6*T;ctx.strokeStyle='#fbf7ee';ctx.beginPath();t2.forEach((q,i)=>i?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]));ctx.stroke();}
  ctx.lineWidth=1.3;for(const k in ch){const r=ch[k];if(!r.rx)continue;ctx.beginPath();ctx.ellipse(r.x,r.y,r.rx,r.ry,0,0,6.283);ctx.fillStyle='#fbf7ee';ctx.fill();ctx.strokeStyle='rgba(138,117,80,.8)';ctx.stroke();}
  const names={queen:'Queen chamber',nursery:'Nursery',food:'Pantry',barracks:'Barracks',store:'Storeroom',deep:'Hibernation chamber, 90 days or more'};
  for(const k in names)label(ctx,names[k],ch[k].x,ch[k].y+ch[k].ry+12*T,'center',9.5*T);
  for(let i=0;i<14;i++){const a=i/14*6.283;ctx.strokeStyle='rgba(18,58,74,.4)';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(ch.nursery.x+Math.cos(a)*ch.nursery.rx*0.6,ch.nursery.y+Math.sin(a)*ch.nursery.ry*0.5,2.2*T,1.4*T,a,0,6.283);ctx.stroke();}
  for(let i=0;i<10;i++){box(ctx,ch.food.x-ch.food.rx*0.6+i*ch.food.rx*0.13,ch.food.y+ch.food.ry*0.2-((i*7)%3)*3*T,ch.food.x-ch.food.rx*0.6+i*ch.food.rx*0.13+4*T,ch.food.y+ch.food.ry*0.2-((i*7)%3)*3*T+3*T,'#c49a00');}
  for(const p of sleep){ctx.save();ctx.translate(p._x,p._y);ant(ctx,p._L,p.color,0,null,true);ctx.restore();}
  for(const a of ants){const sp=AK[a.p.kind],L=sp.L*S*T*Math.min(1.3,a.p.sizeF);let x,y,ang;
    if(a.mode==='room'){const r=ch[a.room];a.a+=dt*(0.3+Math.sin(t+a.w*9)*0.5);a.u+=dt*0.1;x=r.x+Math.cos(a.a)*r.rx*(0.2+0.55*(0.5+0.5*Math.sin(a.u*3+a.w*6)));y=r.y+Math.sin(a.a)*r.ry*0.5;ang=a.a+Math.PI/2;if(a.p.kind==='tanker'){x=r.x+(a.w-0.5)*r.rx*1.2;y=r.y+Math.sin(t*0.5+a.w*9)*2;ang=Math.sin(t*0.3+a.w)*0.3;}}
    else{const tt=tun[a.tu];a.s+=a.dir*a.v*T*dt/tt.len;a.ph+=dt*a.v*0.05;if(a.s>1||a.s<0){a.dir*=-1;a.s=Math.max(0,Math.min(1,a.s));const end=a.s<0.5?tt[0]:tt[tt.length-1];const opts=tun.map((q,i)=>i).filter(i=>{const q=tun[i];return Math.hypot(q[0][0]-end[0],q[0][1]-end[1])<4||Math.hypot(q[q.length-1][0]-end[0],q[q.length-1][1]-end[1])<4;});const ni=opts[Math.floor(Math.random()*opts.length)];if(ni!=null&&ni!==a.tu){const q=tun[ni];a.tu=ni;if(Math.hypot(q[0][0]-end[0],q[0][1]-end[1])<4){a.s=0;a.dir=1;}else{a.s=1;a.dir=-1;}}}
      [x,y,ang]=atT(tt,a.s*tt.len);if(a.dir<0)ang+=Math.PI;}
    a._x=x;a._y=y;a._L=L;ctx.save();ctx.translate(x,y);ctx.rotate(ang);const carry=a.p.kind==='cargo'?(a.dir>0?'crumb':'leaf'):(a.p.days!=null&&a.p.days<7&&a.mode==='tunnel'?'leaf':null);ant(ctx,L,a.p.color,a.ph+t*3,carry,false);ctx.restore();}
  const s=VZ.sel;if(s&&s.ref)VZ.selRing(ctx,s.ref._x,s.ref._y,Math.max(12,s.ref._L*0.7));
  requestAnimationFrame(frame);
}
cv.addEventListener('pointerdown',e=>{let best=null,bd=1e9;const X=e.clientX,Y=e.clientY;
  for(const a of ants){const d=Math.hypot(X-a._x,Y-a._y);if(d<Math.max(a._L,14)&&d<bd){bd=d;best=[a,a.p];}}for(const p of sleep){const d=Math.hypot(X-p._x,Y-p._y);if(d<14&&d<bd){bd=d;best=[p,p];}}
  if(best){const [o,p]=best;VZ.open({ref:o,title:p.name,kind:(p.old?'Hibernating':AK[p.kind].label)+VZ.sizeText(p),age:VZ.ageText(p),host:p.host});}else VZ.close();});
addEventListener('resize',resize);resize();requestAnimationFrame(frame);
});
