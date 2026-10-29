VZ.load(P=>{
const {h32,poly,line,box,ring,label,INK,MUTED,MOTION}=VZ;
const cv=document.getElementById('cv'),ctx=cv.getContext('2d');
const SP={
  tanker:{label:'Whale, one of the biggest',len:72,v:10,band:[0.06,0.34],frac:0.84,amp:0.035,w:[0.08,0.12,0.135,0.135,0.13,0.12,0.1,0.08,0.06,0.04,0.025]},
  battle:{label:'Shark, big and fast',len:40,v:26,band:[0.2,0.6],frac:0.8,amp:0.06,w:[0.01,0.06,0.09,0.1,0.1,0.09,0.075,0.06,0.04,0.025,0.015]},
  cargo:{label:'Sea turtle, big and steady',len:26,v:12,band:[0.14,0.5]},
  tug:{label:'Squid, small and nimble',len:24,v:20,band:[0.5,0.82]},
  speed:{label:'Tuna, small and quick',len:18,v:34,band:[0.25,0.65],frac:0.8,amp:0.07,w:[0.01,0.08,0.13,0.15,0.15,0.13,0.1,0.07,0.04,0.02,0.012]},
  sail:{label:'Reef fish, light and easy',len:12,v:14,band:[0.68,0.9],frac:0.74,amp:0.08,w:[0.03,0.18,0.28,0.32,0.32,0.28,0.22,0.15,0.08,0.04,0.03]}
};
const swim=P.filter(p=>!p.old),rest=P.filter(p=>p.old);
document.getElementById('count').textContent=swim.length+' swimming, '+rest.length+' resting at the wreck';
let W,H,DPR,S,T,bg,SURF,kelp=[],bubbles=[];
const fish=swim.map(p=>({p,dir:h32(p.name,40)>0.5?1:-1,x:h32(p.name,41),band:h32(p.name,42),ph:h32(p.name,43)*6.28,wob:h32(p.name,44)*6.28,flip:0,flipT:5+h32(p.name,45)*12,
  v:SP[p.kind].v*(0.85+p.speed*0.3)}));
const floorY=x=>H*0.9+Math.sin(x/W*6.28*1.3+0.8)*H*0.015+Math.sin(x/W*6.28*3.1)*H*0.006;
const surfY=(x,t)=>SURF+Math.sin(x/37+t*1.2)*1.6*T+Math.sin(x/13-t*0.8)*0.8*T;
function build(){
  bg=document.createElement('canvas');bg.width=W*DPR;bg.height=H*DPR;const g=bg.getContext('2d');g.scale(DPR,DPR);
  const gr=g.createLinearGradient(0,SURF,0,H);gr.addColorStop(0,'#eef7f9');gr.addColorStop(1,'#dcebf0');
  g.fillStyle='#f7f9fa';g.fillRect(0,0,W,SURF);g.fillStyle=gr;g.fillRect(0,SURF,W,H-SURF);
  g.beginPath();g.moveTo(0,H);for(let x=0;x<=W;x+=4)g.lineTo(x,floorY(x));g.lineTo(W,H);g.closePath();g.fillStyle='#f3ead6';g.fill();
  g.strokeStyle='#8a7550';g.lineWidth=1.4;g.beginPath();for(let x=0;x<=W;x+=4){if(x===0)g.moveTo(x,floorY(x));else g.lineTo(x,floorY(x));}g.stroke();
  g.strokeStyle='#ddd0b2';g.lineWidth=1;for(let i=0;i<30;i++){const x=h32('sd'+i,1)*W,y=floorY(x)+6+h32('sdy'+i,2)*(H-floorY(x)-8);g.beginPath();g.moveTo(x-3,y);g.lineTo(x+3,y);g.stroke();}
  g.strokeStyle='rgba(18,58,74,.35)';g.lineWidth=1.2;g.beginPath();for(let x=0;x<=W;x+=4){const y=floorY(x)+5*T;if(x===0)g.moveTo(x,y);else g.lineTo(x,y);}g.stroke();
  g.strokeStyle='#c49a00';g.lineWidth=1;for(let x=10;x<W;x+=40){const y=floorY(x)+5*T;g.beginPath();g.arc(x,y,1.6*T,0,6.283);g.stroke();}
  const rx=W*0.06;for(let i=0;i<6;i++){const x=rx+i*W*0.045,y=floorY(x),r=(6+h32('rk'+i,3)*8)*T;g.strokeStyle='rgba(18,58,74,.55)';g.beginPath();g.moveTo(x-r,y+2);g.lineTo(x-r*0.6,y-r*0.7);g.lineTo(x+r*0.2,y-r);g.lineTo(x+r,y-r*0.3);g.lineTo(x+r*1.1,y+2);g.stroke();}
  for(let i=0;i<5;i++){const x=W*0.1+i*W*0.05,y=floorY(x)-4*T;g.strokeStyle=['#e07800','#d93636','#c49a00','#e07800','#d93636'][i];g.beginPath();g.moveTo(x,y);g.lineTo(x,y-14*T);g.moveTo(x,y-7*T);g.lineTo(x-5*T,y-13*T);g.moveTo(x,y-10*T);g.lineTo(x+5*T,y-16*T);g.stroke();}
  const wx=W*0.74,wy=floorY(wx)-2;g.save();g.translate(wx,wy);g.rotate(-0.12);g.strokeStyle='rgba(18,58,74,.7)';g.lineWidth=1.3;
  const hw=W*0.16;g.beginPath();g.moveTo(-hw,-14*T);g.lineTo(hw*0.9,-16*T);g.lineTo(hw,-4*T);g.lineTo(hw*0.55,4*T);g.lineTo(-hw*0.8,4*T);g.closePath();g.stroke();
  for(let i=0;i<4;i++)ring(g,-hw*0.55+i*hw*0.38,-6*T,2*T,'rgba(18,58,74,.6)');
  g.beginPath();g.moveTo(-hw*0.1,-15*T);g.lineTo(-hw*0.05,-46*T);g.moveTo(-hw*0.05,-36*T);g.lineTo(hw*0.2,-30*T);g.stroke();g.restore();
}
function resize(){
  DPR=Math.min(window.devicePixelRatio||1,2);W=innerWidth;H=innerHeight;cv.width=W*DPR;cv.height=H*DPR;
  T=Math.max(0.85,Math.min(1.3,Math.min(W,H)/360));S=Math.max(0.6,Math.min(1.25,Math.sqrt(W*H/(swim.length*3200))));SURF=H*0.14;
  kelp=[];for(let i=0;i<9;i++){const x=W*(0.3+h32('kp'+i,1)*0.38);kelp.push({x,h:(H*0.18+h32('kh'+i,2)*H*0.2),ph:h32('kf'+i,3)*6});}
  rest.forEach((p,i)=>{const wx=W*0.74,a=i/Math.max(1,rest.length)*6.283;p.hx=wx+Math.cos(a)*W*0.13;p.hy=floorY(wx)-30*T+Math.sin(a)*18*T;p.ph=h32(p.name,50)*6;p.dir=h32(p.name,51)>0.5?1:-1;});
  build();
}
function sampleW(arr,u){const f=u*(arr.length-1),i=Math.min(arr.length-2,Math.floor(f)),k=f-i;return arr[i]*(1-k)+arr[i+1]*k;}
function body(c,kind,L,col,ph){
  const sp=SP[kind],n=14,top=[],bot=[],sp1=[];const bl=L*sp.frac;
  for(let i=0;i<=n;i++){const u=i/n,x=L/2-u*bl,s=sp.amp*L*u*u*Math.sin(ph-u*3.2),w=sampleW(sp.w,u)*L;top.push([x,s-w]);bot.push([x,s+w]);sp1.push([x,s]);}
  c.beginPath();c.moveTo(top[0][0],top[0][1]);for(const q of top)c.lineTo(q[0],q[1]);for(let i=bot.length-1;i>=0;i--)c.lineTo(bot[i][0],bot[i][1]);c.closePath();c.strokeStyle=col;c.stroke();
  const e=sp1[n],d=sp1[n-1],a=Math.atan2(e[1]-d[1],e[0]-d[0]),tl=L-bl;
  const rot=(dx,dy)=>[e[0]+Math.cos(a)*dx-Math.sin(a)*dy,e[1]+Math.sin(a)*dx+Math.cos(a)*dy];
  if(kind==='tanker'){poly(c,[rot(0,0),rot(tl*0.9,-tl*0.35),rot(tl*0.6,0),rot(tl*0.9,tl*0.35)],col);ring(c,L*0.36,-L*0.02,Math.max(1,L*0.012),col);line(c,L*0.47,L*0.04,L*0.2,L*0.07,col);line(c,L*0.2,L*0.1,L*0.08,L*0.2,col);}
  else if(kind==='battle'){poly(c,[rot(0,-tl*0.05),rot(tl*1.05,-tl*0.75),rot(tl*0.55,0),rot(tl*0.7,tl*0.45),rot(0,tl*0.05)],col);const m=sp1[5];poly(c,[[m[0]+L*0.06,m[1]-L*0.09],[m[0]-L*0.02,m[1]-L*0.22],[m[0]-L*0.08,m[1]-L*0.09]],col);line(c,L*0.22,L*0.04,L*0.08,L*0.16,col);for(let k=0;k<3;k++)line(c,L*0.3-k*L*0.025,-L*0.04,L*0.3-k*L*0.025,L*0.04,col);ring(c,L*0.4,-L*0.02,Math.max(0.8,L*0.012),col);}
  else if(kind==='speed'){poly(c,[rot(0,0),rot(tl,-tl*0.8),rot(tl*0.45,0),rot(tl,tl*0.8)],col);ring(c,L*0.38,-L*0.02,Math.max(0.8,L*0.018),col);}
  else{poly(c,[rot(0,0),rot(tl,-tl*0.7),rot(tl*0.85,0),rot(tl,tl*0.7)],col);ring(c,L*0.32,-L*0.06,Math.max(0.8,L*0.03),col);line(c,0,-L*0.3,-L*0.12,-L*0.36,col);}
}
function turtle(c,L,col,ph){
  const a=Math.sin(ph)*0.6;
  c.save();c.translate(L*0.12,L*0.08);c.rotate(0.5+a);poly(c,[[0,0],[-L*0.08,L*0.22],[L*0.04,L*0.04]],col);c.restore();
  c.save();c.translate(-L*0.24,L*0.06);c.rotate(0.3-a*0.6);poly(c,[[0,0],[-L*0.1,L*0.1],[L*0.02,L*0.03]],col);c.restore();
  c.strokeStyle=col;c.beginPath();c.ellipse(0,0,L*0.32,L*0.15,0,0,6.283);c.stroke();
  line(c,-L*0.32,L*0.02,L*0.32,L*0.02,col);for(const k of [-0.12,0.08])line(c,L*k,-L*0.14,L*k,L*0.02,col);
  ring(c,L*0.4,-L*0.02,L*0.07,col);
}
function squid(c,L,col,ph){
  poly(c,[[L/2,0],[L*0.32,-L*0.1],[-L*0.04,-L*0.09],[-L*0.08,0],[-L*0.04,L*0.09],[L*0.32,L*0.1]],col);
  poly(c,[[L/2,0],[L*0.34,-L*0.17],[L*0.3,-L*0.08]],col);poly(c,[[L/2,0],[L*0.34,L*0.17],[L*0.3,L*0.08]],col);
  ring(c,-L*0.02,-L*0.03,Math.max(1,L*0.035),col);
  c.strokeStyle=col;for(let k=0;k<5;k++){const off=(k-2)*L*0.03,len=k===0||k===4?0.62:0.42;c.beginPath();for(let i=0;i<=8;i++){const u=i/8,x=-L*0.08-u*L*len,y=off*(1+u*0.6)+Math.sin(ph*1.5-u*4+k)*L*0.03*u;if(i===0)c.moveTo(x,y);else c.lineTo(x,y);}c.stroke();}
}
function drawFish(c,kind,L,col,ph){c.lineWidth=1.2;c.lineJoin='round';c.lineCap='round';if(kind==='cargo')turtle(c,L,col,ph);else if(kind==='tug')squid(c,L,col,ph);else body(c,kind,L,col,ph);}
let last=performance.now(),bubT=0,spouts=[];
function frame(now){
  const dt=Math.min(0.05,(now-last)/1000)*MOTION,t=now/1000;last=now;
  ctx.setTransform(DPR,0,0,DPR,0,0);ctx.drawImage(bg,0,0,W,H);
  ctx.strokeStyle='rgba(18,58,74,.55)';ctx.lineWidth=1.3;ctx.beginPath();for(let x=0;x<=W;x+=4){const y=surfY(x,t);if(x===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.stroke();
  for(let i=0;i<3;i++){const x=((t*(8+i*5)*T+i*W*0.37)%(W+60))-30,y=surfY(x,t);ctx.lineWidth=1.2;poly(ctx,[[x-14*T,y-5*T],[x+14*T,y-5*T],[x+10*T,y+1*T],[x-11*T,y+1*T]],INK);line(ctx,x-2*T,y-5*T,x-2*T,y-15*T,INK);poly(ctx,[[x-1*T,y-15*T],[x+9*T,y-7*T],[x-1*T,y-7*T]],i===1?'#1e9e3e':'#e07800');}
  for(const k of kelp){const fy=floorY(k.x);ctx.strokeStyle='#7f9f72';ctx.lineWidth=1.2;ctx.beginPath();for(let i=0;i<=12;i++){const u=i/12,y=fy-u*k.h,x=k.x+Math.sin(t*0.8+k.ph+u*2.5)*u*10*T;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.stroke();
    for(let i=2;i<12;i+=2){const u=i/12,y=fy-u*k.h,x=k.x+Math.sin(t*0.8+k.ph+u*2.5)*u*10*T;line(ctx,x,y,x+(i%4?6:-6)*T,y-4*T,'#9bb08a');}}
  bubT-=dt;if(bubT<=0){bubT=0.35;bubbles.push({x:W*(0.08+Math.random()*0.25),y:floorY(W*0.2)-10,r:(1+Math.random()*2)*T});}
  for(const b of bubbles){b.y-=22*T*dt;b.x+=Math.sin(t*3+b.r)*0.3;}bubbles=bubbles.filter(b=>b.y>SURF);
  for(const b of bubbles)ring(ctx,b.x,b.y,b.r,'rgba(18,58,74,.3)');
  rest.forEach(p=>{const L=SP[p.kind].len*p.sizeF*S*0.7,x=p.hx+Math.sin(t*0.3+p.ph)*4*T,y=p.hy+Math.sin(t*0.5+p.ph)*2*T;p._x=x;p._y=y;p._L=L;ctx.save();ctx.translate(x,y);ctx.scale(p.dir,1);drawFish(ctx,p.kind,L,p.color,t*1.2+p.ph);ctx.restore();});
  label(ctx,'Wreck, 90 days or more',W*0.97,floorY(W*0.74)+20*T,'right',10*T);
  label(ctx,'Cloudflare cable',W*0.03,H-8*T,'left',10*T);
  label(ctx,'Vercel boats',W*0.03,SURF-24*T,'left',10*T);
  const water=floorY(W/2)-SURF;
  const order=fish.slice().sort((a,b)=>SP[b.p.kind].len*b.p.sizeF-SP[a.p.kind].len*a.p.sizeF);
  for(const f of order){
    const sp=SP[f.p.kind],L=sp.len*f.p.sizeF*S;
    let v=f.v;if(f.p.kind==='tug'){v=f.v*(0.3+1.6*Math.pow(Math.max(0,Math.sin(t*1.5+f.wob)),3));f.flipT-=dt;if(f.flipT<=0){f.dir*=-1;f.flipT=7+Math.random()*10;}}
    f.x+=f.dir*v*T*dt/W;const m=L/W+0.02;if(f.x>1+m)f.x=-m;if(f.x<-m)f.x=1+m;
    f.ph+=dt*(2+v*0.18);
    const b=sp.band,depth=b[0]+(b[1]-b[0])*(0.5+0.5*Math.sin(t*0.07+f.wob+f.band*6));
    const x=f.x*W,y=SURF+depth*water+Math.sin(t*0.6+f.wob)*3*T;
    const tilt=Math.cos(t*0.07+f.wob+f.band*6)*0.07*f.dir;
    f._x=x;f._y=y;f._L=L;
    if(f.p.kind==='tanker'&&y<SURF+L*0.6&&Math.sin(t*0.4+f.wob)>0.97&&!f.sp){f.sp=1;spouts.push({x:x+f.dir*L*0.3,life:1});}if(Math.sin(t*0.4+f.wob)<0.9)f.sp=0;
    ctx.save();ctx.translate(x,y);ctx.rotate(tilt);ctx.scale(f.dir,1);drawFish(ctx,f.p.kind,L,f.p.color,f.ph);ctx.restore();
  }
  for(const s of spouts){s.life-=dt*0.7;const y=surfY(s.x,t);ctx.strokeStyle='rgba(18,58,74,'+(0.5*s.life).toFixed(2)+')';ctx.lineWidth=1;for(const k of [-1,0,1]){ctx.beginPath();ctx.moveTo(s.x,y);ctx.quadraticCurveTo(s.x+k*6*T,y-22*T*(1.2-s.life*0.4),s.x+k*12*T,y-14*T);ctx.stroke();}}
  spouts=spouts.filter(s=>s.life>0);
  const s=VZ.sel;if(s&&s.ref)VZ.selRing(ctx,s.ref._x,s.ref._y,s.ref._L*0.6+6);
  requestAnimationFrame(frame);
}
cv.addEventListener('pointerdown',e=>{
  let best=null,bd=1e9;const X=e.clientX,Y=e.clientY;
  const test=(o,p)=>{if(o._x==null)return;const d=Math.hypot(X-o._x,Y-o._y);if(d<Math.max(o._L*0.55,14)&&d<bd){bd=d;best=[o,p];}};
  for(const f of fish)test(f,f.p);for(const p of rest)test(p,p);
  if(best){const [o,p]=best;VZ.open({ref:o,title:p.name,kind:SP[p.kind].label+VZ.sizeText(p),age:VZ.ageText(p,p.old?'Resting, ':''),host:p.host});}else VZ.close();
});
addEventListener('resize',resize);resize();requestAnimationFrame(frame);
});
