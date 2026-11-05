VZ.load(P=>{
const {h32,MOTION}=VZ;
const cv=document.getElementById('cv'),ctx=VZ.wire(cv.getContext('2d'));
const THINGS=['cow','car','log','cat','plane','boat','house','tractor','mailbox','dog','bathtub','fish'];
const LBL={cow:'Cow',car:'Car',log:'Log',cat:'Cat',plane:'Airplane',boat:'Boat',house:'Roof',tractor:'Tractor',mailbox:'Mailbox',dog:'Dog',bathtub:'Bathtub',fish:'Fish'};
const SZ={tanker:1.5,battle:1.2,cargo:1.3,tug:0.85,speed:0.9,sail:0.8};
const SPD=d=>d==null?0.6:d<7?1:d<30?0.82:d<60?0.66:d<90?0.5:0.35;
let W,H,DPR,T,cx,top,bot,dust=[];
const items=P.map(p=>({p,thing:THINGS[Math.floor(h32(p.name,700)*THINGS.length)],a:h32(p.name,701)*6.283,h:h32(p.name,702),v:SPD(p.days),sz:SZ[p.kind]*(0.85+0.2*p.sizeF),spin:h32(p.name,703)*6,rise:0.02+0.04*h32(p.name,704),out:h32(p.name,705)}));
document.getElementById('count').textContent=items.length+' things in the twister';
const rad=h=>(18+150*Math.pow(h,1.25))*T*Math.min(1.6,W/420);
function resize(){DPR=Math.min(devicePixelRatio||1,2);W=innerWidth;H=innerHeight;cv.width=W*DPR;cv.height=H*DPR;T=Math.max(0.8,Math.min(1.3,Math.min(W,H)/380));cx=W/2;top=H*0.1;bot=H*0.84;
  dust=[...Array(120)].map(()=>({a:Math.random()*6.283,h:Math.random(),r:Math.random()}));}
function pos(h,a,extra){const y=bot-(bot-top)*h,R=rad(h)*(1+extra);return [cx+Math.sin(h*5+performance.now()/1400)*16*T+Math.cos(a)*R,y+Math.sin(a)*R*0.22,Math.sin(a)];}
function sky(){let g=ctx.createLinearGradient(0,0,0,bot);g.addColorStop(0,'#9aa8b3');g.addColorStop(1,'#d9dfd8');ctx.fillStyle=g;ctx.fillRect(0,0,W,bot);
  g=ctx.createLinearGradient(0,bot,0,H);g.addColorStop(0,'#b7c48e');g.addColorStop(1,'#9caf6f');ctx.fillStyle=g;ctx.fillRect(0,bot,W,H-bot);
  ctx.fillStyle='rgba(90,100,110,.35)';for(let i=0;i<6;i++){const x=(i*W*0.23+performance.now()*0.01)%(W+200)-100,y=H*0.04+i%3*14*T;ctx.beginPath();ctx.ellipse(x,y,70*T,18*T,0,0,6.283);ctx.fill();}
  ctx.strokeStyle='#8a7350';ctx.lineWidth=1.5;for(let x=10;x<W;x+=18*T){ctx.beginPath();ctx.moveTo(x,bot+H*0.06);ctx.lineTo(x,bot+H*0.06-10*T);ctx.stroke();}ctx.beginPath();ctx.moveTo(0,bot+H*0.06-7*T);ctx.lineTo(W,bot+H*0.06-7*T);ctx.stroke();
  ctx.fillStyle='#b5442f';ctx.fillRect(W*0.08,bot-6*T,30*T,24*T);ctx.fillStyle='#7d2f20';ctx.beginPath();ctx.moveTo(W*0.08-4*T,bot-6*T);ctx.lineTo(W*0.08+15*T,bot-20*T);ctx.lineTo(W*0.08+34*T,bot-6*T);ctx.fill();}
function funnel(t,back){
  for(let i=0;i<46;i++){const h=i/45,y=bot-(bot-top)*h,R=rad(h),x=cx+Math.sin(h*5+t/1.4)*16*T;
    if(i%3)continue;ctx.strokeStyle=back?'rgba(79,111,124,.3)':'rgba(79,111,124,.6)';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(x,y,R,R*0.22+6*T,0,back?3.14:0,back?6.283:3.14);ctx.stroke();}
  ctx.strokeStyle=back?'rgba(79,111,124,.25)':'rgba(79,111,124,.45)';ctx.lineWidth=1;
  for(const d of dust){d.a+=0.03*MOTION*(1.5-d.h);d.h+=0.0008*MOTION;if(d.h>1)d.h=0;const [x,y,z]=pos(d.h,d.a,d.r*0.2);if((z<0)!==back)continue;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-Math.sin(d.a)*6*T,y+Math.cos(d.a)*1.5*T);ctx.stroke();}
}
function draw(it,s){
  const c=it.p.color;ctx.fillStyle=c;
  switch(it.thing){
    case 'cow':ctx.beginPath();ctx.ellipse(0,0,10*s,6*s,0,0,6.283);ctx.fill();ctx.beginPath();ctx.ellipse(11*s,-3*s,4*s,3.4*s,0,0,6.283);ctx.fill();ctx.fillStyle='#ffffff';ctx.beginPath();ctx.ellipse(-3*s,-1*s,3*s,2.4*s,0.4,0,6.283);ctx.ellipse(4*s,2*s,2.5*s,2*s,0,0,6.283);ctx.fill();ctx.fillStyle='#2b2420';for(const x of [-7,-3,4,8])ctx.fillRect(x*s,5*s,1.6*s,5*s);break;
    case 'car':ctx.beginPath();ctx.roundRect(-12*s,-4*s,24*s,8*s,3*s);ctx.fill();ctx.beginPath();ctx.roundRect(-6*s,-9*s,12*s,6*s,2*s);ctx.fill();ctx.fillStyle='#cfe8f5';ctx.fillRect(-4*s,-8*s,8*s,3.5*s);ctx.fillStyle='#2b2420';ctx.beginPath();ctx.arc(-7*s,4.5*s,3*s,0,6.283);ctx.arc(7*s,4.5*s,3*s,0,6.283);ctx.fill();break;
    case 'log':ctx.beginPath();ctx.roundRect(-13*s,-4*s,26*s,8*s,4*s);ctx.fill();ctx.fillStyle='#e7c89a';ctx.beginPath();ctx.ellipse(13*s,0,2.5*s,4*s,0,0,6.283);ctx.fill();ctx.strokeStyle='#b08a5a';ctx.lineWidth=0.8;ctx.beginPath();ctx.ellipse(13*s,0,1.2*s,2*s,0,0,6.283);ctx.stroke();break;
    case 'cat':case 'dog':ctx.beginPath();ctx.ellipse(0,0,7*s,4.5*s,0,0,6.283);ctx.fill();ctx.beginPath();ctx.arc(7*s,-3*s,3.6*s,0,6.283);ctx.fill();
      if(it.thing==='cat'){ctx.beginPath();ctx.moveTo(5*s,-5*s);ctx.lineTo(6*s,-9*s);ctx.lineTo(8*s,-6*s);ctx.moveTo(8*s,-6*s);ctx.lineTo(10*s,-9*s);ctx.lineTo(10.5*s,-5*s);ctx.fill();ctx.strokeStyle=c;ctx.lineWidth=2*s;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-7*s,0);ctx.quadraticCurveTo(-12*s,-2*s,-11*s,-7*s);ctx.stroke();}
      else{ctx.beginPath();ctx.ellipse(9.5*s,-1*s,2*s,3.5*s,0.3,0,6.283);ctx.fill();}
      ctx.fillStyle='#2b2420';for(const x of [-5,-2,2,5])ctx.fillRect(x*s,3.5*s,1.4*s,4*s);break;
    case 'plane':ctx.beginPath();ctx.ellipse(0,0,14*s,3*s,0,0,6.283);ctx.fill();ctx.beginPath();ctx.moveTo(-2*s,0);ctx.lineTo(-6*s,-11*s);ctx.lineTo(-1*s,-11*s);ctx.lineTo(5*s,0);ctx.moveTo(-2*s,0);ctx.lineTo(-6*s,11*s);ctx.lineTo(-1*s,11*s);ctx.lineTo(5*s,0);ctx.moveTo(-11*s,0);ctx.lineTo(-14*s,-6*s);ctx.lineTo(-11*s,-5*s);ctx.fill();break;
    case 'boat':ctx.beginPath();ctx.moveTo(-13*s,0);ctx.lineTo(13*s,0);ctx.lineTo(9*s,6*s);ctx.lineTo(-9*s,6*s);ctx.fill();ctx.fillStyle='#fbf6ea';ctx.beginPath();ctx.moveTo(0,-1*s);ctx.lineTo(0,-16*s);ctx.lineTo(9*s,-2*s);ctx.fill();break;
    case 'house':ctx.beginPath();ctx.moveTo(-13*s,4*s);ctx.lineTo(0,-8*s);ctx.lineTo(13*s,4*s);ctx.fill();ctx.fillStyle='#8a5a32';ctx.fillRect(5*s,-6*s,3*s,6*s);break;
    case 'tractor':ctx.fillRect(-9*s,-4*s,16*s,7*s);ctx.fillRect(-9*s,-11*s,7*s,8*s);ctx.fillStyle='#2b2420';ctx.beginPath();ctx.arc(-6*s,5*s,5.5*s,0,6.283);ctx.arc(7*s,6*s,3.5*s,0,6.283);ctx.fill();ctx.fillStyle='#d0d0d0';ctx.beginPath();ctx.arc(-6*s,5*s,2*s,0,6.283);ctx.fill();break;
    case 'mailbox':ctx.beginPath();ctx.roundRect(-8*s,-5*s,16*s,10*s,[5*s,5*s,1,1]);ctx.fill();ctx.fillStyle='#8a5a32';ctx.fillRect(-1.2*s,5*s,2.4*s,10*s);ctx.fillStyle='#d93636';ctx.fillRect(5*s,-8*s,2*s,6*s);break;
    case 'bathtub':ctx.beginPath();ctx.moveTo(-12*s,-3*s);ctx.lineTo(12*s,-3*s);ctx.quadraticCurveTo(12*s,6*s,0,6*s);ctx.quadraticCurveTo(-12*s,6*s,-12*s,-3*s);ctx.fill();ctx.fillStyle='#ffffff';ctx.fillRect(-12*s,-4*s,24*s,2*s);ctx.fillStyle='#b0b0b0';ctx.fillRect(-9*s,6*s,2*s,3*s);ctx.fillRect(7*s,6*s,2*s,3*s);break;
    default:ctx.beginPath();ctx.ellipse(0,0,9*s,4.5*s,0,0,6.283);ctx.fill();ctx.beginPath();ctx.moveTo(-8*s,0);ctx.lineTo(-14*s,-5*s);ctx.lineTo(-14*s,5*s);ctx.fill();ctx.fillStyle='#2b2420';ctx.beginPath();ctx.arc(5*s,-1*s,1*s,0,6.283);ctx.fill();
  }
}
let last=performance.now();
function frame(now){
  const dt=Math.min(0.05,(now-last)/1000)*MOTION,t=now/1000;last=now;
  ctx.setTransform(DPR,0,0,DPR,0,0);ctx.bg('#f3f4ef',W,H);sky();
  for(const it of items){it.a+=dt*(0.6+1.6*it.v)*(1.3-it.h*0.6);it.h+=dt*it.rise*(0.5+it.v);if(it.h>1)it.h=0.02;it.spin+=dt*(1+2*it.v);
    const [x,y,z]=pos(it.h,it.a,0.15+it.out*0.5);it._x=x;it._y=y;it._z=z;}
  items.sort((a,b)=>a._z-b._z);
  const drawSet=back=>{for(const it of items){if((it._z<0)!==back)continue;const s=T*it.sz*(0.75+0.25*(it._z+1))*(0.7+0.4*it.h);
    ctx.save();ctx.globalAlpha=back?0.55:1;ctx.translate(it._x,it._y);ctx.rotate(it.spin);draw(it,s);ctx.restore();it._r=14*s;}};
  funnel(t,true);drawSet(true);funnel(t,false);drawSet(false);
  ctx.globalAlpha=1;
  const sel=VZ.sel;if(sel&&sel.ref)VZ.selRing(ctx,sel.ref._x,sel.ref._y,Math.max(14,sel.ref._r));
  requestAnimationFrame(frame);
}
cv.addEventListener('pointerdown',e=>{let best=null,bd=1e9;const X=e.clientX,Y=e.clientY;
  for(const it of items){if(it._x==null)continue;const d=Math.hypot(X-it._x,Y-it._y)-(it._z>0?4:0);if(d<Math.max(it._r,16)&&d<bd){bd=d;best=it;}}
  if(best){const p=best.p;VZ.open({ref:best,title:p.name,kind:LBL[best.thing]+' in the twister'+VZ.sizeText(p),age:VZ.ageText(p),host:p.host});}else VZ.close();});
addEventListener('resize',resize);resize();requestAnimationFrame(frame);
});
