/* Coffeekit screensavers inside the Rainbow Run wall host.
   The seven modes from coffeekit (plasma, lines, warp, pipes, matrix, blob, bounce), drawn on a light
   ground instead of black. They run one step per sixtieth of a second, the same on every phone.
   Instead of a microphone, the music comes from the stompbox band loop: while the band plays, the
   beat pumps the shapes the way loud bass did in the original. */
(function(){
"use strict";
const MODE=document.body.dataset.scene||"plasma";
const canvas=document.getElementById("cv"),ctx=canvas.getContext("2d");
const BG="#eef3f5",INK="#123a4a";
const FADE=function(a){return "rgba(238,243,245,"+a+")"};
let W,H,DPR,t=0,plasma_buf,plasma_ctx;

/* ---- the beat, from Rainbow Run's shared loop ---- */
const audio={level:0,bass:0,mid:0,treble:0,beat:false,beatPulse:0,active:false};
let lastBeat=null;
function band(){
  const f=window.__band,s=f?f(performance.now()):null;
  if(!s||!s.active){audio.active=false;audio.level=audio.bass=audio.mid=audio.treble=0;audio.beat=false;audio.beatPulse*=0.9;lastBeat=null;return}
  const b=s.beat,whole=Math.floor(b),frac=b-whole;
  audio.active=true;
  audio.beat=lastBeat!==null&&whole!==lastBeat;lastBeat=whole;
  if(audio.beat)audio.beatPulse=1;
  audio.beatPulse*=0.9;
  audio.bass=0.2+0.6*Math.exp(-frac*5);
  audio.mid=0.35+0.25*Math.sin(b*Math.PI/2);
  audio.treble=0.25+0.35*Math.exp(-((b*2)%1)*6);
  audio.level=(audio.bass+audio.mid+audio.treble)/3;
}

function resize(){
  DPR=window.devicePixelRatio||1;W=innerWidth;H=innerHeight;
  canvas.width=Math.round(W*DPR);canvas.height=Math.round(H*DPR);
  ctx.setTransform(DPR,0,0,DPR,0,0);ctx.fillStyle=BG;ctx.fillRect(0,0,W,H);
  plasma_buf=document.createElement("canvas");plasma_buf.width=Math.floor(W/3);plasma_buf.height=Math.floor(H/3);plasma_ctx=plasma_buf.getContext("2d");
}

function hsl2rgb(h,s,l){
  h/=360;const a=s*Math.min(l,1-l);
  const f=function(n){const k=(n+h*12)%12;return l-a*Math.max(-1,Math.min(k-3,9-k,1))};
  return [Math.round(f(0)*255),Math.round(f(8)*255),Math.round(f(4)*255)];
}

/* ===== PLASMA ===== */
function drawPlasma(){
  const pw=plasma_buf.width,ph=plasma_buf.height,img=plasma_ctx.createImageData(pw,ph),d=img.data;
  const spd=t*0.012*(audio.active?1+audio.bass*2.5:1),sat=audio.active?Math.min(0.85,0.55+audio.treble*0.4):0.6;
  for(let y=0;y<ph;y++)for(let x=0;x<pw;x++){
    const v=Math.sin(x*0.08+spd)+Math.sin(y*0.06+spd*0.7)+Math.sin((x+y)*0.05+spd*1.3)+Math.sin(Math.sqrt((x-pw/2)*(x-pw/2)+(y-ph/2)*(y-ph/2))*0.1-spd*0.9);
    const n=(v+4)/8,hue=(n*360+t*0.5+audio.mid*60)%360,c=hsl2rgb(hue,sat,0.74+audio.beatPulse*0.06),i=(y*pw+x)*4;
    d[i]=c[0];d[i+1]=c[1];d[i+2]=c[2];d[i+3]=255;
  }
  plasma_ctx.putImageData(img,0,0);
  ctx.save();ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality="high";ctx.drawImage(plasma_buf,0,0,W,H);ctx.restore();
}

/* ===== LINES ===== */
let lines=[];
function initLines(){
  lines=Array.from({length:12},function(_,i){return {x1:Math.random()*W,y1:Math.random()*H,x2:Math.random()*W,y2:Math.random()*H,
    vx1:(Math.random()-0.5)*3,vy1:(Math.random()-0.5)*3,vx2:(Math.random()-0.5)*3,vy2:(Math.random()-0.5)*3,hue:i*30,trail:[]}});
}
function drawLines(){
  ctx.fillStyle=FADE(0.08);ctx.fillRect(0,0,W,H);
  const speedMul=audio.active?1+audio.bass*3:1,widthMul=audio.active?1+audio.beatPulse*2.5:1;
  lines.forEach(function(l){
    l.x1+=l.vx1*speedMul;l.y1+=l.vy1*speedMul;l.x2+=l.vx2*speedMul;l.y2+=l.vy2*speedMul;
    if(l.x1<0||l.x1>W)l.vx1*=-1;if(l.y1<0||l.y1>H)l.vy1*=-1;if(l.x2<0||l.x2>W)l.vx2*=-1;if(l.y2<0||l.y2>H)l.vy2*=-1;
    l.hue=(l.hue+0.4+audio.treble*2)%360;
    l.trail.push({x1:l.x1,y1:l.y1,x2:l.x2,y2:l.y2});if(l.trail.length>20)l.trail.shift();
    l.trail.forEach(function(pt,i){
      ctx.strokeStyle="hsla("+l.hue+",80%,45%,"+((i/l.trail.length)*0.7)+")";
      ctx.lineWidth=(1+(i/l.trail.length)*1.5)*widthMul;
      ctx.beginPath();ctx.moveTo(pt.x1,pt.y1);ctx.lineTo(pt.x2,pt.y2);ctx.stroke();
    });
  });
}

/* ===== WARP, the coffeekit starfield ===== */
let stars=[],shootingStars=[];
function initStars(){
  const n=Math.round(300*Math.max(1,(W*H)/(640*360)/2));
  stars=Array.from({length:n},function(){return {x:Math.random()*W,y:Math.random()*H,z:Math.random()*1000,pz:0}});shootingStars=[];
}
function drawStars(){
  ctx.fillStyle=FADE(0.2);ctx.fillRect(0,0,W,H);
  const cx=W/2,cy=H/2,warpMul=audio.active?1+audio.bass*5:1;
  stars.forEach(function(s){
    s.pz=s.z;s.z-=4*warpMul;
    if(s.z<=0){s.x=Math.random()*W;s.y=Math.random()*H;s.z=1000;s.pz=1000}
    const sx=(s.x-cx)/s.z*300+cx,sy=(s.y-cy)/s.z*300+cy,px=(s.x-cx)/s.pz*300+cx,py=(s.y-cy)/s.pz*300+cy;
    const bright=1-s.z/1000;
    ctx.strokeStyle="rgba(18,58,74,"+Math.min(1,0.15+bright*1.1)+")";ctx.lineWidth=Math.max(0.8,bright*3.5);
    ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(sx,sy);ctx.stroke();
  });
  if(audio.beat||Math.random()<0.015){
    const side=Math.random()<0.5;
    shootingStars.push({x:side?-10:W+10,y:Math.random()*H*0.6,vx:side?14:-14,vy:4+Math.random()*4,life:1,hue:audio.active?100+audio.treble*180:Math.random()*60+160});
  }
  for(let i=shootingStars.length-1;i>=0;i--){
    const ss=shootingStars[i];ss.x+=ss.vx;ss.y+=ss.vy;ss.life-=0.018;
    const grd=ctx.createLinearGradient(ss.x-ss.vx*6,ss.y-ss.vy*6,ss.x,ss.y);
    grd.addColorStop(0,"rgba(238,243,245,0)");grd.addColorStop(1,"hsla("+ss.hue+",80%,40%,"+Math.max(0,ss.life)+")");
    ctx.strokeStyle=grd;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(ss.x-ss.vx*6,ss.y-ss.vy*6);ctx.lineTo(ss.x,ss.y);ctx.stroke();
    if(ss.life<=0||ss.x<-50||ss.x>W+50)shootingStars.splice(i,1);
  }
}

/* ===== PIPES ===== */
let pipes=[];const CELL=28;
function initPipes(){pipes=[];ctx.fillStyle=BG;ctx.fillRect(0,0,W,H);const n=Math.max(6,Math.round(6*(W*H)/(640*360)));for(let i=0;i<n;i++)addPipe()}
function addPipe(){
  const dirs=[[1,0],[-1,0],[0,1],[0,-1]],dir=dirs[Math.floor(Math.random()*4)];
  pipes.push({x:Math.floor(Math.random()*Math.floor(W/CELL))*CELL+CELL/2,y:Math.floor(Math.random()*Math.floor(H/CELL))*CELL+CELL/2,
    dx:dir[0],dy:dir[1],hue:Math.random()*360,life:200+Math.random()*400,px:0,py:0,first:true});
}
function drawPipes(){
  const jointPulse=audio.active?1+audio.beatPulse*1.8:1,turnChance=audio.active?0.25+audio.treble*0.25:0.25;
  for(let i=pipes.length-1;i>=0;i--){
    const p=pipes[i];
    if(p.first){p.px=p.x;p.py=p.y;p.first=false}
    ctx.strokeStyle="hsl("+p.hue+",65%,"+(audio.active?42+audio.mid*12:45)+"%)";ctx.lineWidth=7;ctx.lineCap="round";
    ctx.beginPath();ctx.moveTo(p.px,p.py);p.x+=p.dx*CELL;p.y+=p.dy*CELL;ctx.lineTo(p.x,p.y);ctx.stroke();
    ctx.fillStyle="hsl("+p.hue+",70%,62%)";ctx.beginPath();ctx.arc(p.x,p.y,5.5*jointPulse,0,Math.PI*2);ctx.fill();
    p.px=p.x;p.py=p.y;p.life--;
    if(Math.random()<turnChance){const ds=[[1,0],[-1,0],[0,1],[0,-1]].filter(function(d){return !(d[0]===-p.dx&&d[1]===-p.dy)}),nd=ds[Math.floor(Math.random()*ds.length)];p.dx=nd[0];p.dy=nd[1]}
    if(p.x<0){p.x=Math.floor(W/CELL)*CELL;p.px=p.x}if(p.x>W){p.x=0;p.px=p.x}
    if(p.y<0){p.y=Math.floor(H/CELL)*CELL;p.py=p.y}if(p.y>H){p.y=0;p.py=p.y}
    if(p.life<=0){pipes.splice(i,1);if(Math.random()<0.3){ctx.fillStyle=FADE(0.5);ctx.fillRect(0,0,W,H)}addPipe()}
  }
}

/* ===== MATRIX ===== */
let cols=[];const CHARS="ｦｧｨｩｪｫｬｭｮｯｰｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789ABCDEF",FS=16;
function initMatrix(){ctx.fillStyle=BG;ctx.fillRect(0,0,W,H);cols=Array.from({length:Math.ceil(W/FS)},function(){return {y:Math.random()*H,speed:1+Math.random()*2.5}})}
function drawMatrix(){
  ctx.fillStyle=FADE(0.06);ctx.fillRect(0,0,W,H);
  const speedMul=audio.active?1+audio.bass*4:1,green=audio.active?Math.min(150,110+audio.treble*45):120;
  cols.forEach(function(col,i){
    const ch=CHARS[Math.floor(Math.random()*CHARS.length)],x=i*FS;
    ctx.fillStyle=audio.beat?"hsl("+(100+audio.mid*40)+",70%,30%)":INK;ctx.font="bold "+FS+"px ui-monospace,monospace";ctx.fillText(ch,x,col.y);
    ctx.fillStyle="rgba(20,"+Math.round(green)+",70,0.85)";ctx.font=FS+"px ui-monospace,monospace";
    const prev=CHARS[Math.floor(Math.random()*CHARS.length)];if(col.y>FS)ctx.fillText(prev,x,col.y-FS);
    col.y+=col.speed*FS*0.5*speedMul;if(col.y>H+FS)col.y=-FS*(Math.random()*20);
  });
}

/* ===== BLOB ===== */
let blob={};
function initBlob(){
  blob={x:W/2,y:H/2,vx:(Math.random()-0.5)*3,vy:(Math.random()-0.5)*3,baseR:Math.min(W,H)*0.18,hue:Math.random()*360,hueSpeed:0.4,
    noiseOffsets:Array.from({length:8},function(){return Math.random()*100}),noiseSpeeds:Array.from({length:8},function(){return (Math.random()-0.5)*0.012+0.008}),trail:[]};
  ctx.fillStyle=BG;ctx.fillRect(0,0,W,H);
}
function drawBlob(){
  ctx.fillStyle=FADE(0.18);ctx.fillRect(0,0,W,H);
  const speedMul=audio.active?1+audio.mid*1.5:1;
  blob.x+=blob.vx*speedMul;blob.y+=blob.vy*speedMul;
  const pad=blob.baseR*1.4;
  if(blob.x<pad||blob.x>W-pad){blob.vx*=-1;blob.x=Math.max(pad,Math.min(W-pad,blob.x))}
  if(blob.y<pad||blob.y>H-pad){blob.vy*=-1;blob.y=Math.max(pad,Math.min(H-pad,blob.y))}
  blob.hue=(blob.hue+blob.hueSpeed+audio.treble*3)%360;
  const wobbleMul=audio.active?1+audio.treble*2:1;
  blob.noiseOffsets=blob.noiseOffsets.map(function(o,i){return o+blob.noiseSpeeds[i]*wobbleMul});
  const pumpR=audio.active?blob.baseR*(1+audio.bass*0.4+audio.beatPulse*0.25):blob.baseR;
  blob.trail.push({x:blob.x,y:blob.y});if(blob.trail.length>28)blob.trail.shift();
  blob.trail.forEach(function(pt,i){ctx.beginPath();ctx.arc(pt.x,pt.y,pumpR*0.55*(i/blob.trail.length),0,Math.PI*2);ctx.fillStyle="hsla("+((blob.hue+i*2)%360)+",85%,55%,"+((i/blob.trail.length)*0.18)+")";ctx.fill()});
  const noiseAmp=audio.active?0.12+audio.treble*0.12:0.12;
  ctx.beginPath();
  for(let i=0;i<=180;i++){
    const angle=(i/180)*Math.PI*2;let r=pumpR;
    blob.noiseOffsets.forEach(function(off,k){r+=Math.sin(angle*(k+2)+off)*pumpR*noiseAmp});
    const px=blob.x+Math.cos(angle)*r,py=blob.y+Math.sin(angle)*r;i===0?ctx.moveTo(px,py):ctx.lineTo(px,py);
  }
  ctx.closePath();
  const grad=ctx.createRadialGradient(blob.x-pumpR*0.3,blob.y-pumpR*0.3,pumpR*0.05,blob.x,blob.y,pumpR*1.3);
  grad.addColorStop(0,"hsla("+((blob.hue+60)%360)+",90%,80%,0.95)");grad.addColorStop(0.4,"hsla("+blob.hue+",85%,"+((0.5+audio.beatPulse*0.1)*100)+"%,0.9)");grad.addColorStop(1,"hsla("+((blob.hue+180)%360)+",80%,35%,0.7)");
  ctx.fillStyle=grad;ctx.fill();
  ctx.save();ctx.clip();
  const shine=ctx.createRadialGradient(blob.x-pumpR*0.35,blob.y-pumpR*0.38,2,blob.x-pumpR*0.2,blob.y-pumpR*0.2,pumpR*0.65);
  shine.addColorStop(0,"rgba(255,255,255,0.45)");shine.addColorStop(1,"rgba(255,255,255,0)");ctx.fillStyle=shine;ctx.fill();ctx.restore();
}

/* ===== BOUNCE, a badge that bounces around the wall and flashes when it hits a corner ===== */
let bb={};
function initBounce(){const size=Math.min(W,H)*0.22;bb={x:W*0.3,y:H*0.3,w:size*2.2,h:size,vx:2.8,vy:2.1,hue:Math.random()*360,flash:0,trail:[]};ctx.fillStyle=BG;ctx.fillRect(0,0,W,H)}
function badge(x,y,w,h,hue,alpha){
  ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,y);
  const rx=w/2,ry=h/2;ctx.beginPath();ctx.ellipse(0,0,rx,ry,0,0,Math.PI*2);
  const g=ctx.createRadialGradient(-rx*0.2,-ry*0.25,1,0,0,rx);
  g.addColorStop(0,"hsl("+((hue+50)%360)+",90%,80%)");g.addColorStop(0.5,"hsl("+hue+",80%,55%)");g.addColorStop(1,"hsl("+((hue+200)%360)+",70%,35%)");
  ctx.fillStyle=g;ctx.fill();
  ctx.fillStyle="rgba(18,58,74,0.85)";ctx.font="bold "+(h*0.3)+"px ui-rounded,system-ui,sans-serif";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("RUN",0,h*0.04);
  ctx.strokeStyle="rgba(18,58,74,0.35)";ctx.lineWidth=h*0.04;ctx.beginPath();ctx.moveTo(-rx*0.7,ry*0.3);ctx.lineTo(rx*0.7,ry*0.3);ctx.stroke();
  ctx.restore();
}
function drawBounce(){
  ctx.fillStyle=FADE(0.35);ctx.fillRect(0,0,W,H);
  const speedMul=audio.active?1+audio.bass*1.8:1;bb.x+=bb.vx*speedMul;bb.y+=bb.vy*speedMul;
  const sizeMul=audio.active?1+audio.beatPulse*0.3:1,dw=bb.w*sizeMul,dh=bb.h*sizeMul,hw=dw/2,hh=dh/2;let corner=false;
  if(bb.x-hw<=0||bb.x+hw>=W){bb.vx*=-1;bb.x=bb.x-hw<=0?hw:W-hw;if(bb.y-hh<=0||bb.y+hh>=H)corner=true;bb.hue=(bb.hue+47)%360}
  if(bb.y-hh<=0||bb.y+hh>=H){bb.vy*=-1;bb.y=bb.y-hh<=0?hh:H-hh;bb.hue=(bb.hue+47)%360}
  if(corner)bb.flash=18;
  if(bb.flash>0){ctx.save();ctx.globalAlpha=bb.flash/18*0.5;ctx.fillStyle="hsl("+bb.hue+",90%,70%)";ctx.fillRect(0,0,W,H);ctx.restore();bb.flash--}
  bb.trail.push({x:bb.x,y:bb.y,hue:bb.hue});if(bb.trail.length>10)bb.trail.shift();
  bb.trail.forEach(function(pt,i){badge(pt.x,pt.y,dw,dh,pt.hue,(i/bb.trail.length)*0.12)});
  badge(bb.x,bb.y,dw,dh,bb.hue,1);
}

resize();
if(MODE==="lines")initLines();else if(MODE==="warp")initStars();else if(MODE==="pipes")initPipes();
else if(MODE==="matrix")initMatrix();else if(MODE==="blob")initBlob();else if(MODE==="bounce")initBounce();

function frame(){
  t++;band();
  ctx.setTransform(DPR,0,0,DPR,0,0);
  if(MODE==="plasma"){if(!window.__skip)drawPlasma()}
  else if(MODE==="lines")drawLines();else if(MODE==="warp")drawStars();else if(MODE==="pipes")drawPipes();
  else if(MODE==="matrix")drawMatrix();else if(MODE==="blob")drawBlob();else if(MODE==="bounce")drawBounce();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
})();
