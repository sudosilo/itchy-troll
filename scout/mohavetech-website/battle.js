VZ.load(P=>{
const {h32,poly,line,box,ring,label,INK,MOTION}=VZ;
const cv=document.getElementById('cv'),ctx=cv.getContext('2d');
const UT={tanker:{label:'Tank, one of the biggest',hp:6,v:8,rng:150,rate:2.6,L:20},battle:{label:'Commando, big and fast',hp:2,v:30,rng:90,rate:0.9,L:9},cargo:{label:'Heavy gunner, big and steady',hp:3,v:12,rng:110,rate:0.5,L:10},tug:{label:'Medic, small and nimble',hp:1,v:28,rng:0,rate:0,L:8},speed:{label:'Scout, small and quick',hp:1,v:38,rng:70,rate:1.1,L:8},sail:{label:'Rifleman, light and easy',hp:2,v:18,rng:100,rate:1.2,L:8}};
const fight=P.filter(p=>!p.old),vets=P.filter(p=>p.old);
let W,H,DPR,T,S,TOP=80,shots=[],booms=[];
const units=fight.map(p=>({p,team:h32(p.name,160)>0.5?1:0,x:0,y:0,th:0,hp:0,down:0,cool:h32(p.name,161)*2,ph:h32(p.name,162)*6,seed:h32(p.name,163)}));
const flags=[0,0];
function base(team){return team?{x:W*0.5,y:H-46*T}:{x:W*0.5,y:TOP+30*T};}
function spawn(u,init){const b=base(u.team);u.x=b.x+(h32(u.p.name+(init?'':Math.random()),164)-0.5)*W*0.85;u.y=b.y+(u.team?-1:1)*(init?h32(u.p.name,165)*H*0.25:0)+(Math.random()-0.5)*14*T;u.hp=UT[u.p.kind].hp;u.down=0;u.th=u.team?-Math.PI/2:Math.PI/2;}
function resize(){DPR=Math.min(window.devicePixelRatio||1,2);W=innerWidth;H=innerHeight;cv.width=W*DPR;cv.height=H*DPR;T=Math.max(0.85,Math.min(1.3,Math.min(W,H)/360));S=Math.max(1,Math.min(1.6,Math.sqrt(W*H/(fight.length*2500))));units.forEach(u=>spawn(u,true));}
document.getElementById('count').textContent=fight.length+' in battle, '+vets.length+' veterans in the mess tent';
function soldier(c,u,L,t){const col=u.p.color,k=u.p.kind;c.lineWidth=1.1;c.lineCap='round';
  if(u.down>0){c.save();c.rotate(1.3);c.strokeStyle=col;c.beginPath();c.ellipse(0,0,L*0.55,L*0.25,0,0,6.283);c.stroke();line(c,-L*0.3,-L*0.3,L*0.3,L*0.3,col);c.restore();return;}
  if(k==='tanker'){box(c,-L*0.5,-L*0.35,L*0.5,L*0.35,col);for(const s of [-1,1]){box(c,-L*0.55,s*L*0.35,L*0.55,s*L*0.48,col);for(let i=0;i<5;i++)line(c,-L*0.5+i*L*0.25+((t*20)%(L*0.25)),s*L*0.35,-L*0.5+i*L*0.25+((t*20)%(L*0.25)),s*L*0.48,col);}ring(c,0,0,L*0.22,col);line(c,0,0,L*0.75,0,col);return;}
  const st=Math.sin(u.ph*8)*L*0.25;line(c,-L*0.05,-L*0.18,-L*0.05+st,-L*0.32,col);line(c,-L*0.05,L*0.18,-L*0.05-st,L*0.32,col);
  c.fillStyle='#f2efe4';c.beginPath();c.ellipse(0,0,L*0.22,L*0.36,0,0,6.283);c.fill();c.strokeStyle=col;c.stroke();ring(c,L*0.05,0,L*0.2,col);
  if(k==='tug'){line(c,L*0.05,-L*0.1,L*0.05,L*0.1,'#d93636');line(c,-0.05*L,0,0.15*L,0,'#d93636');}
  else{line(c,L*0.1,L*0.15,L*(k==='cargo'?0.8:0.62),L*0.15,col);if(k==='cargo')box(c,L*0.25,L*0.08,L*0.45,L*0.22,col);}
  if(u.team){line(c,-L*0.22,0,-L*0.34,0,'#2f6fd6');}}
function adiff(a,b){let d=a-b;while(d>Math.PI)d-=6.283;while(d<-Math.PI)d+=6.283;return d;}
let last=performance.now();
function frame(now){
  const dt=Math.min(0.05,(now-last)/1000)*MOTION,t=now/1000;last=now;
  ctx.setTransform(DPR,0,0,DPR,0,0);ctx.fillStyle='#f2efe4';ctx.fillRect(0,0,W,H);
  ctx.strokeStyle='#c9cfa8';ctx.lineWidth=1;for(let i=0;i<Math.round(W*H/2200);i++){const x=h32('g'+i,1)*W,y=TOP+h32('h'+i,2)*(H-TOP);ctx.beginPath();ctx.moveTo(x-2,y);ctx.lineTo(x,y-3);ctx.lineTo(x+2,y);ctx.stroke();}
  for(let i=0;i<5;i++){const x=W*(0.1+i*0.2),y=H*0.5+(i%2?-1:1)*H*0.06;ctx.strokeStyle='#c49a00';for(let k=0;k<4;k++){ctx.beginPath();ctx.ellipse(x-12*T+k*8*T,y,4.5*T,2.5*T,0,0,6.283);ctx.stroke();}}
  for(let i=0;i<4;i++){const x=h32('tr'+i,3)*W,y=TOP+H*0.25+h32('ts'+i,4)*H*0.45;ctx.strokeStyle='#7f9f72';ctx.beginPath();ctx.arc(x,y,9*T,0,6.283);ctx.stroke();}
  for(const tm of [0,1]){const b=base(tm);ctx.strokeStyle='rgba(18,58,74,.55)';ctx.lineWidth=1.3;ctx.strokeRect(b.x-W*0.42,b.y-14*T,W*0.84,28*T);for(let x=b.x-W*0.42;x<b.x+W*0.42;x+=10*T)line(ctx,x,b.y-14*T,x+5*T,b.y-14*T-4*T,'rgba(18,58,74,.35)');const fx=b.x+W*0.36,fy=b.y-14*T;line(ctx,fx,fy,fx,fy-24*T,INK);const wv=Math.sin(t*3+tm)*2*T;poly(ctx,[[fx,fy-24*T],[fx+14*T,fy-20*T+wv],[fx,fy-15*T]],tm?'#2f6fd6':'#d93636');label(ctx,tm?'Blue camp':'Red camp',b.x-W*0.4,b.y+4*T,'left',10*T);}
  const mx=W*0.5,my=H*0.5;ctx.strokeStyle='rgba(18,58,74,.5)';ctx.strokeRect(W*0.04,my-14*T,44*T,22*T);line(ctx,W*0.04,my-14*T,W*0.04+22*T,my-24*T,'rgba(18,58,74,.5)');line(ctx,W*0.04+44*T,my-14*T,W*0.04+22*T,my-24*T,'rgba(18,58,74,.5)');
  label(ctx,'Mess tent, 90 days or more',W*0.04,my+20*T,'left',9.5*T);
  vets.forEach((p,i)=>{const x=W*0.04+6*T+(i%5)*8*T,y=my-8*T+Math.floor(i/5)*6*T;p._x=x;p._y=y;p._L=8*T;ring(ctx,x,y,2.6*T,p.color);});
  for(const u of units){const sp=UT[u.p.kind],L=sp.L*S*T;u._x=u.x;u._y=u.y;u._L=L;
    if(u.down>0){u.down-=dt;if(u.down<=0)spawn(u,false);continue;}
    let best=null,bd=1e9;for(const o of units){if(o.down>0)continue;if(u.p.kind==='tug'?o.team!==u.team:o.team===u.team)continue;const d=Math.hypot(o.x-u.x,o.y-u.y);if(d<bd){bd=d;best=o;}}
    if(u.p.kind==='tug'){let hurt=null,hd=1e9;for(const o of units){if(o.team!==u.team||o.down<=0)continue;const d=Math.hypot(o.x-u.x,o.y-u.y);if(d<hd){hd=d;hurt=o;}}if(hurt){best=hurt;bd=hd;if(hd<10*T){hurt.down=Math.min(hurt.down,0.3);}}}
    let want=u.team?-Math.PI/2:Math.PI/2;if(best)want=Math.atan2(best.y-u.y,best.x-u.x);u.th+=Math.sign(adiff(want,u.th))*Math.min(Math.abs(adiff(want,u.th)),dt*4);
    const inRange=best&&sp.rng&&bd<sp.rng*T&&u.p.kind!=='tug';
    if(!inRange){const v=sp.v*T*S*0.8;u.x+=Math.cos(u.th)*v*dt;u.y+=Math.sin(u.th)*v*dt;u.ph+=dt;}
    u.x=Math.max(6,Math.min(W-6,u.x));u.y=Math.max(TOP,Math.min(H-8,u.y));
    u.cool-=dt;if(inRange&&u.cool<=0){u.cool=sp.rate*(0.8+Math.random()*0.6);shots.push({x0:u.x,y0:u.y,x1:best.x,y1:best.y,life:0.15,big:u.p.kind==='tanker',col:u.p.color});if(Math.random()<(u.p.kind==='tanker'?0.7:0.3)){best.hp--;if(best.hp<=0){best.down=3+Math.random()*3;if(u.p.kind==='tanker')booms.push({x:best.x,y:best.y,life:1});}}}}
  for(const u of units){ctx.save();ctx.translate(u.x,u.y);ctx.rotate(u.th);soldier(ctx,u,u._L,t);ctx.restore();}
  for(const s of shots){s.life-=dt;ctx.strokeStyle=s.big?'rgba(224,120,0,.8)':'rgba(18,58,74,.5)';ctx.lineWidth=s.big?1.6:0.8;const f=0.6;ctx.beginPath();ctx.moveTo(s.x0+(s.x1-s.x0)*(1-f),s.y0+(s.y1-s.y0)*(1-f));ctx.lineTo(s.x1,s.y1);ctx.stroke();}shots=shots.filter(s=>s.life>0);
  for(const b of booms){b.life-=dt*1.2;ctx.strokeStyle='rgba(224,120,0,'+(b.life*0.8).toFixed(2)+')';ctx.lineWidth=1.3;for(let k=0;k<8;k++){const a=k/8*6.283,r=(1-b.life)*18*T;line(ctx,b.x+Math.cos(a)*r*0.4,b.y+Math.sin(a)*r*0.4,b.x+Math.cos(a)*r,b.y+Math.sin(a)*r,ctx.strokeStyle);}}booms=booms.filter(b=>b.life>0);
  const s=VZ.sel;if(s&&s.ref)VZ.selRing(ctx,s.ref._x,s.ref._y,Math.max(10,s.ref._L));
  requestAnimationFrame(frame);
}
cv.addEventListener('pointerdown',e=>{let best=null,bd=1e9;const X=e.clientX,Y=e.clientY;
  for(const u of units){const d=Math.hypot(X-u._x,Y-u._y);if(d<Math.max(u._L,14)&&d<bd){bd=d;best=[u,u.p];}}for(const p of vets){const d=Math.hypot(X-p._x,Y-p._y);if(d<10&&d<bd){bd=d;best=[p,p];}}
  if(best){const [o,p]=best;VZ.open({ref:o,title:p.name,kind:(p.old?'Veteran in the mess tent':UT[p.kind].label+(o.team?', blue camp':', red camp')+(o.down>0?', down and respawning':''))+VZ.sizeText(p),age:VZ.ageText(p),host:p.host});}else VZ.close();});
addEventListener('resize',resize);resize();requestAnimationFrame(frame);
});
