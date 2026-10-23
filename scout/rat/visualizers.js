// RAT shared visualizers. One file used by the RAT hub and the RAT-30 deck.
// Each renderer draws on the 2D canvas handed to RATVIZ.create().
(function(){
function create(canvas){
  var c = canvas.getContext('2d');
  var W = canvas.width, H = canvas.height;
  var analyser = null;
  var freq = new Uint8Array(1024), timeData = new Uint8Array(2048);
  var frameCount = 0;
  var accent = '#e8a020';
  var quality = 'high';
  // Low quality: canvas glow (shadowBlur) is the most expensive thing a phone draws, so it is switched off
  function setQuality(q){
    quality = q === 'low' ? 'low' : 'high';
    if (quality === 'low') {
      try { Object.defineProperty(c, 'shadowBlur', { configurable: true, get: function(){ return 0; }, set: function(){} }); } catch(e) {}
    } else {
      try { delete c.shadowBlur; } catch(e) {}
    }
  }
  function getBass(){ var b=0; for(var i=0;i<10;i++) b+=freq[i]; return b/10/255; }
  function getMid(){ var m=0; for(var i=10;i<100;i++) m+=freq[i]; return m/90/255; }
  function getTreble(){ var t=0; for(var i=100;i<300;i++) t+=freq[i]; return t/200/255; }

// ===================== STATE =====================
let moonSt={}, gallaSt={}, blipSt={}, stankSt={}, slickSt={}, houseSt={};

function resetState(id){
  if(id==='moon'){
    moonSt={beat:0,prev:0,speed:0,
      stars:Array.from({length:200},()=>({x:Math.random()*2-1,y:Math.random()*2-1,z:Math.random(),pz:0})),
      rings:[],sparks:[],
      checks:Array.from({length:60},()=>({x:(Math.random()-0.5)*8,z:Math.random()*20,col:Math.random()>0.5?'#ff00ff':'#00ffff',size:0.4+Math.random()*0.4}))};
  } else if(id==='galla'){
    gallaSt={beat:0,prev:0,speed:0,scanY:0,strobe:0,
      pistons:Array.from({length:8},(_,i)=>({x:(i/8)*1.1-0.05,phase:(i/8)*Math.PI*2,speed:0.04+Math.random()*0.02,height:0.15+Math.random()*0.1})),
      debris:Array.from({length:80},()=>({x:Math.random()*2,y:Math.random(),vx:(Math.random()-0.5)*0.003,vy:-0.001-Math.random()*0.003,size:1+Math.random()*3,alpha:0.2+Math.random()*0.5,col:Math.random()>0.6?'#ff6600':'#442200'}))};
  } else if(id==='blip'){
    blipSt={beat:0,prev:0,speed:0,dropped:false,dropProgress:0,
      particles:Array.from({length:120},()=>({x:Math.random(),y:Math.random(),vx:(Math.random()-0.5)*0.0015,vy:-0.0005-Math.random()*0.002,size:1+Math.random()*3,alpha:0.15+Math.random()*0.4,col:['#ff8800','#ffcc44','#ff4400','#cc6600'][Math.floor(Math.random()*4)]})),
      ripples:[],krings:[]};
  } else if(id==='stank'){
    stankSt={beat:0,prev:0,speed:0,roadOffset:0,
      trees:Array.from({length:16},(_,i)=>({side:i%2===0?-1:1,z:i*25+20,wobble:Math.random()*Math.PI*2})),
      cars:[],sparks:[]};
  } else if(id==='slick'){
    slickSt={beat:0,prev:0,wobble:0,wobbleV:0,phase:0,glitchTimer:0,glitchX:0,glitchW:0,glitchAlpha:0,
      nodes:Array.from({length:24},()=>({x:Math.random()*0.8+0.1,y:Math.random()*0.8+0.1,vx:(Math.random()-0.5)*0.004,vy:(Math.random()-0.5)*0.004,baseSize:3+Math.random()*5,hue:Math.random()*120+80})),
      rings:Array.from({length:7},(_,i)=>({baseR:60+i*55,wobblePhase:i*0.7,speed:0.008+i*0.003*(i%2===0?1:-1)})),
      aberr:0,
      trails:Array.from({length:60},()=>({x:Math.random(),y:Math.random(),vx:(Math.random()-0.5)*0.006,vy:(Math.random()-0.5)*0.006,life:Math.random(),decay:0.005+Math.random()*0.01,hue:Math.random()*120+80,size:1+Math.random()*4})),
      tears:[],pulses:[]};
  } else if(id==='house'){
    houseSt={beat:0,prev:0,phase:0,midPrev:0,vocalPeak:0,
      surface:new Float32Array(120).fill(0),
      surfaceV:new Float32Array(120).fill(0),
      drops:[],
      keys:Array.from({length:24},(_,i)=>({x:(i/24)*0.85+0.075,glow:0})),
      ripples:[],
      orbs:Array.from({length:30},()=>({x:Math.random(),y:Math.random(),vx:(Math.random()-0.5)*0.003,vy:(Math.random()-0.5)*0.002,r:3+Math.random()*8,alpha:0.15+Math.random()*0.3,phase:Math.random()*Math.PI*2})),
      wisps:[],glowPulse:0};
  } else if(id==='haunt'){
    initHaunt();
  }
}

// ===================== OVER THE MOON =====================
function renderMoon(){
  const s=moonSt,bass=getBass(),mid=getMid(),energy=bass*0.6+mid*0.4;
  if(bass>s.prev*1.4&&bass>0.3){s.beat=1.0;s.rings.push({r:60,maxR:300+energy*200,alpha:1,col:Math.random()>0.5?'#00ffff':'#ff00ff',thick:2+energy*4});if(Math.random()>0.4)for(let i=0;i<12;i++){let a=Math.random()*Math.PI*2,sp=(2+Math.random()*6)*(0.5+energy);s.sparks.push({x:W/2,y:H*0.38,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:1,decay:0.03+Math.random()*0.04,col:Math.random()>0.5?'#ffdd00':'#ff6600',size:2+Math.random()*3});}}
  s.prev=bass*0.85+s.prev*0.15;s.beat*=0.88;s.speed=s.speed*0.9+bass*0.1;
  c.fillStyle='rgba(0,0,8,0.35)';c.fillRect(0,0,W,H);
  c.save();c.translate(W/2,H/2);
  for(let st of s.stars){st.pz=st.z;st.z-=0.004+s.speed*0.025;if(st.z<=0){st.x=Math.random()*2-1;st.y=Math.random()*2-1;st.z=1;st.pz=1;}let sx=(st.x/st.z)*(W/2),sy=(st.y/st.z)*(H/2),px=(st.x/st.pz)*(W/2),py=(st.y/st.pz)*(H/2);let bright=Math.floor((1-st.z)*255);c.strokeStyle='rgb('+bright+','+bright+',255)';c.lineWidth=(1-st.z)*3;c.beginPath();c.moveTo(px,py);c.lineTo(sx,sy);c.stroke();}
  c.restore();
  const hz=H*0.55,vx=W/2;
  let gr=c.createLinearGradient(0,hz,0,H);gr.addColorStop(0,'rgba(60,0,80,0.9)');gr.addColorStop(1,'rgba(0,0,20,0.9)');c.fillStyle=gr;c.fillRect(0,hz,W,H-hz);
  c.save();c.globalAlpha=0.5;
  for(let i=0;i<12;i++){let t=i/12,y=hz+(H-hz)*(t*t);c.strokeStyle='rgba(255,0,255,'+(t*0.7)+')';c.lineWidth=1;c.beginPath();c.moveTo(0,y);c.lineTo(W,y);c.stroke();}
  for(let i=-12;i<=12;i++){c.strokeStyle='rgba(0,255,255,0.3)';c.lineWidth=1;c.beginPath();c.moveTo(vx,hz);c.lineTo(vx+(i/12)*W*1.2,H);c.stroke();}
  c.restore();
  for(let t of s.checks){t.z-=0.08+s.speed*0.3;if(t.z<=0.5)t.z=20;let p=200/t.z,tx=vx+t.x*p,ty=hz+p*0.4;if(ty>H+40||ty<hz)continue;let ts=t.size*p*0.12;c.save();c.globalAlpha=Math.min(1,(ty-hz)/80)*0.7;c.fillStyle=t.col;c.fillRect(tx-ts/2,ty-ts/2,ts,ts);c.restore();}
  for(let i=0;i<80;i++){let val=freq[Math.floor(i*freq.length/80)]/255,bh=val*H*0.35,col=i<20?'#00ffff':i<50?'#ff00ff':'#ffdd00';c.save();c.globalAlpha=0.85;c.fillStyle=col;c.shadowColor=col;c.shadowBlur=10+val*20;c.fillRect((W/2)-(i+1)*(W/80),H*0.52-bh,(W/80)-1,bh);c.fillRect((W/2)+i*(W/80),H*0.52-bh,(W/80)-1,bh);c.restore();}
  c.save();c.globalAlpha=0.7;c.strokeStyle='#00ffff';c.lineWidth=2;c.shadowColor='#00ffff';c.shadowBlur=12;c.beginPath();for(let i=0;i<timeData.length;i++){let x=(i/timeData.length)*W,v=(timeData[i]/128)-1;i===0?c.moveTo(x,H*0.52+v*60):c.lineTo(x,H*0.52+v*60);}c.stroke();c.restore();
  for(let i=s.rings.length-1;i>=0;i--){let r=s.rings[i];r.r+=(r.maxR-r.r)*0.07;r.alpha-=0.018;if(r.alpha<=0){s.rings.splice(i,1);continue;}c.save();c.globalAlpha=r.alpha;c.strokeStyle=r.col;c.lineWidth=r.thick*r.alpha;c.shadowColor=r.col;c.shadowBlur=20;c.beginPath();c.arc(W/2,H*0.38,r.r,0,Math.PI*2);c.stroke();c.restore();}
  const cx=W/2,cy=H*0.38,r=30+energy*60+s.beat*30;
  let gl=c.createRadialGradient(cx,cy,0,cx,cy,r*2.5);gl.addColorStop(0,'rgba(0,255,255,'+(0.1+energy*0.2)+')');gl.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=gl;c.beginPath();c.arc(cx,cy,r*2.5,0,Math.PI*2);c.fill();
  let co=c.createRadialGradient(cx-r*0.2,cy-r*0.2,0,cx,cy,r);co.addColorStop(0,'#ffffff');co.addColorStop(0.3,'#00ffff');co.addColorStop(0.7,'#0044ff');co.addColorStop(1,'rgba(0,0,80,0)');c.fillStyle=co;c.beginPath();c.arc(cx,cy,r,0,Math.PI*2);c.fill();
  for(let i=s.sparks.length-1;i>=0;i--){let sp=s.sparks[i];sp.x+=sp.vx;sp.y+=sp.vy;sp.vy+=0.15;sp.life-=sp.decay;if(sp.life<=0){s.sparks.splice(i,1);continue;}c.save();c.globalAlpha=sp.life;c.fillStyle=sp.col;c.shadowColor=sp.col;c.shadowBlur=8;c.beginPath();c.arc(sp.x,sp.y,sp.size*sp.life,0,Math.PI*2);c.fill();c.restore();}
  if(s.beat>0.5){c.save();c.globalAlpha=(s.beat-0.5)*0.15;c.fillStyle='#ffffff';c.fillRect(0,0,W,H);c.restore();}
}

// ===================== GALLAMATRIX =====================
function renderGalla(){
  const s=gallaSt,bass=getBass(),mid=getMid(),energy=bass*0.65+mid*0.35;
  if(bass>s.prev*1.35&&bass>0.25)s.beat=1.0;
  s.prev=bass*0.85+s.prev*0.15;s.beat*=0.87;s.speed=s.speed*0.9+bass*0.1;
  let bg=c.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#050200');bg.addColorStop(0.5,'#0f0800');bg.addColorStop(1,'#1a0a00');c.fillStyle=bg;c.fillRect(0,0,W,H);
  c.save();c.globalAlpha=0.07+energy*0.05;c.strokeStyle='#ff6600';c.lineWidth=1;for(let x=0;x<W;x+=60){c.beginPath();c.moveTo(x,0);c.lineTo(x,H);c.stroke();}for(let y=0;y<H;y+=60){c.beginPath();c.moveTo(0,y);c.lineTo(W,y);c.stroke();}c.fillStyle='#ff6600';c.globalAlpha=0.15+energy*0.1;for(let x=0;x<W;x+=60)for(let y=0;y<H;y+=60){c.beginPath();c.arc(x,y,2.5,0,Math.PI*2);c.fill();}c.restore();
  c.save();c.globalAlpha=0.2;for(let x=-80;x<W+80;x+=80){c.fillStyle='#ff6600';c.save();c.translate(x,H-18);c.rotate(-Math.PI/4);c.fillRect(0,0,40,60);c.restore();}c.restore();
  for(let i=s.debris.length-1;i>=0;i--){let d=s.debris[i];d.x+=d.vx;d.y+=d.vy;if(d.decay)d.alpha-=0.02;if(d.y<-0.05||d.alpha<=0){s.debris.splice(i,1);continue;}if(d.y>1.05){d.y=1.1;d.vy=-Math.abs(d.vy);}c.save();c.globalAlpha=d.alpha;c.fillStyle=d.col;c.shadowColor=d.col;c.shadowBlur=4;c.fillRect(d.x*W,d.y*H,d.size,d.size);c.restore();}
  const baseY=H*0.75;
  for(let p of s.pistons){p.phase+=p.speed*(1+energy*3);let px=p.x*W,rodTop=baseY-(0.12+p.height*(0.5+energy))*H,pistonY=baseY+Math.sin(p.phase)*p.height*H*0.5;c.save();c.globalAlpha=0.7;let sg=c.createLinearGradient(px-8,0,px+8,0);sg.addColorStop(0,'#221100');sg.addColorStop(0.4,'#664400');sg.addColorStop(0.6,'#aa6600');sg.addColorStop(1,'#331100');c.fillStyle=sg;c.fillRect(px-6,rodTop,12,pistonY-rodTop);let hg=c.createLinearGradient(px-20,0,px+20,0);hg.addColorStop(0,'#332200');hg.addColorStop(0.3,'#886633');hg.addColorStop(0.7,'#ffaa44');hg.addColorStop(1,'#443300');c.fillStyle=hg;c.fillRect(px-18,pistonY-12,36,24);if(energy>0.4){c.globalAlpha=energy*0.6;let gw=c.createRadialGradient(px,baseY,0,px,baseY,40);gw.addColorStop(0,'#ff4400');gw.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=gw;c.beginPath();c.arc(px,baseY,40,0,Math.PI*2);c.fill();}if(s.beat>0.6&&Math.random()>0.7)for(let j=0;j<3;j++)s.debris.push({x:px/W+(Math.random()-0.5)*0.05,y:rodTop/H,vx:(Math.random()-0.5)*0.008,vy:-0.005-Math.random()*0.01,size:1+Math.random()*2,alpha:0.9,col:'#ffaa00',decay:true});c.restore();}
  c.save();c.globalAlpha=0.9;let fl=c.createLinearGradient(0,baseY,0,baseY+30);fl.addColorStop(0,'#443300');fl.addColorStop(1,'#0f0800');c.fillStyle=fl;c.fillRect(0,baseY,W,30);c.strokeStyle='#ff660044';c.lineWidth=2;c.beginPath();c.moveTo(0,baseY);c.lineTo(W,baseY);c.stroke();c.restore();
  for(let i=0;i<64;i++){let val=freq[Math.floor(i*freq.length/64)]/255,bh=val*H*0.45,r2=255,g2=Math.floor(60+val*160),b2=Math.floor(val*val*80);c.save();c.globalAlpha=0.9;c.fillStyle='rgb('+r2+','+g2+','+b2+')';c.shadowColor='#ff4400';c.shadowBlur=8+val*20;c.fillRect(i*(W/64),baseY-bh,(W/64)-2,bh);if(val>0.5){c.globalAlpha=(val-0.5)*0.6;c.fillStyle='#ffffff';c.fillRect(i*(W/64),baseY-bh,(W/64)-2,3);}c.restore();}
  c.save();c.globalAlpha=0.5;c.strokeStyle='#ff4400';c.lineWidth=1.5;c.shadowColor='#ff6600';c.shadowBlur=8;c.beginPath();for(let i=0;i<timeData.length;i++){let x=(i/timeData.length)*W,v=(timeData[i]/128)-1;i===0?c.moveTo(x,H*0.5+v*50):c.lineTo(x,H*0.5+v*50);}c.stroke();c.restore();
  const cx=W/2,cy=H*0.42,rr=20+energy*50+s.beat*25;
  c.save();c.globalAlpha=0.3+energy*0.4;for(let i=0;i<8;i++){let a1=(i/8)*Math.PI*2+frameCount*0.01;c.strokeStyle=i%2===0?'#ff6600':'#222200';c.lineWidth=8;c.beginPath();c.arc(cx,cy,rr+30,a1,a1+Math.PI/9);c.stroke();}for(let i=0;i<8;i++){let a1=(i/8)*Math.PI*2-frameCount*0.015;c.strokeStyle=i%2===0?'#ff2200':'#330800';c.lineWidth=5;c.beginPath();c.arc(cx,cy,rr+50,a1,a1+Math.PI/10);c.stroke();}c.restore();
  let gw=c.createRadialGradient(cx,cy,0,cx,cy,rr*2.5);gw.addColorStop(0,'rgba(255,120,0,'+(0.2+energy*0.3)+')');gw.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=gw;c.beginPath();c.arc(cx,cy,rr*2.5,0,Math.PI*2);c.fill();
  let co=c.createRadialGradient(cx,cy,0,cx,cy,rr);co.addColorStop(0,'#ffffff');co.addColorStop(0.2,'#ffdd88');co.addColorStop(0.5,'#ff6600');co.addColorStop(0.8,'#aa2200');co.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=co;c.beginPath();c.arc(cx,cy,rr,0,Math.PI*2);c.fill();
  s.scanY+=2;if(s.scanY>H)s.scanY=0;c.save();c.globalAlpha=0.06;for(let y=0;y<H;y+=4){c.fillStyle='#000';c.fillRect(0,y,W,2);}c.globalAlpha=0.04;c.fillStyle='#ff6600';c.fillRect(0,s.scanY,W,3);c.restore();
  if(s.beat>0.7)s.strobe=Math.min(0.18,s.strobe+0.08);else s.strobe*=0.85;if(s.strobe>0.01){c.save();c.globalAlpha=s.strobe;c.fillStyle='#ff4400';c.fillRect(0,0,W,H);c.restore();}
}

// ===================== BLIPPEN SLIP =====================
function renderBlip(){
  const s=blipSt,bass=getBass(),mid=getMid(),treble=getTreble(),energy=bass*0.55+mid*0.3+treble*0.15;
  if(!s.dropped&&bass>0.35){s.dropProgress+=0.02;if(s.dropProgress>1){s.dropped=true;s.dropProgress=1;}}
  const dp=s.dropProgress;
  c.fillStyle='rgba('+Math.floor(10+dp*5)+','+Math.floor(5+dp*3)+','+Math.floor(15+dp*5)+',0.4)';c.fillRect(0,0,W,H);
  const horizY=H*0.58;let sg=c.createLinearGradient(0,horizY-100,0,horizY+60);sg.addColorStop(0,'rgba(0,0,0,0)');sg.addColorStop(0.4,'rgba(255,'+Math.floor(80+energy*60)+',0,'+(0.08+energy*0.15)+')');sg.addColorStop(0.7,'rgba(255,40,0,'+(0.06+energy*0.1)+')');sg.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=sg;c.fillRect(0,horizY-100,W,160);
  for(let p of s.particles){p.x+=p.vx*(1+energy*2);p.y+=p.vy*(1+energy*3);if(p.y<-0.05){p.y=1.05;p.x=Math.random();}c.save();c.globalAlpha=p.alpha*(0.4+dp*0.6);c.fillStyle=p.col;c.shadowColor=p.col;c.shadowBlur=4+energy*8;c.beginPath();c.arc(p.x*W,p.y*H,p.size*(0.5+energy*0.8),0,Math.PI*2);c.fill();c.restore();}
  if(!s.dropped&&treble>0.15&&Math.random()>0.7)s.krings.push({x:W*0.3+Math.random()*W*0.4,y:H*0.5+Math.random()*H*0.15,r:5,maxR:80+treble*60,alpha:0.6,col:'#ffcc44'});
  for(let i=s.krings.length-1;i>=0;i--){let kr=s.krings[i];kr.r+=(kr.maxR-kr.r)*0.06;kr.alpha-=0.012;if(kr.alpha<=0){s.krings.splice(i,1);continue;}c.save();c.globalAlpha=kr.alpha*(1-dp*0.5);c.strokeStyle=kr.col;c.lineWidth=1.5;c.shadowColor=kr.col;c.shadowBlur=10;c.beginPath();c.arc(kr.x,kr.y,kr.r,0,Math.PI*2);c.stroke();c.restore();}
  if(bass>s.prev*1.35&&bass>0.25){s.beat=1.0;s.ripples.push({r:40,maxR:250+energy*200,alpha:1,col:dp>0.5?'#ff6600':'#ffaa44',thick:1.5+dp*3+energy*3});if(dp>0.5&&Math.random()>0.5)for(let i=0;i<8;i++){let a=Math.random()*Math.PI*2,sp=(1+Math.random()*5)*(0.5+energy);s.particles.push({x:0.5+Math.cos(a)*0.1,y:0.4+Math.sin(a)*0.1,vx:Math.cos(a)*sp*0.003,vy:Math.sin(a)*sp*0.003-0.004,size:2+Math.random()*3,alpha:0.9,col:'#ff8800'});}}
  s.prev=bass*0.85+s.prev*0.15;s.beat*=0.88;
  for(let i=s.ripples.length-1;i>=0;i--){let rp=s.ripples[i];rp.r+=(rp.maxR-rp.r)*0.06;rp.alpha-=0.016;if(rp.alpha<=0){s.ripples.splice(i,1);continue;}c.save();c.globalAlpha=rp.alpha;c.strokeStyle=rp.col;c.lineWidth=rp.thick*rp.alpha;c.shadowColor=rp.col;c.shadowBlur=16;c.beginPath();c.arc(W/2,H*0.42,rp.r,0,Math.PI*2);c.stroke();c.restore();}
  const cx=W/2,cy=H*0.42,orbR=25+energy*45+s.beat*20;
  let sgl=c.createRadialGradient(cx,cy,0,cx,cy,orbR*3);sgl.addColorStop(0,'rgba(255,'+(120+Math.floor(energy*80))+',0,'+(0.15+energy*0.2)+')');sgl.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=sgl;c.beginPath();c.arc(cx,cy,orbR*3,0,Math.PI*2);c.fill();
  let sc=c.createRadialGradient(cx,cy,0,cx,cy,orbR);sc.addColorStop(0,'#ffffff');sc.addColorStop(0.25,'#ffeeaa');sc.addColorStop(0.55,'#ff8800');sc.addColorStop(0.85,'#cc3300');sc.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=sc;c.beginPath();c.arc(cx,cy,orbR,0,Math.PI*2);c.fill();
  c.save();c.globalAlpha=0.18+energy*0.15;let rfl=c.createLinearGradient(0,horizY,0,H);rfl.addColorStop(0,'rgba(255,100,0,0.5)');rfl.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=rfl;c.fillRect(cx-30-energy*60,horizY,60+energy*120,H-horizY);c.restore();
  for(let i=0;i<72;i++){let val=freq[Math.floor(i*freq.length/72)]/255,bh=val*H*0.3,r2=255,g2=Math.floor(dp<0.5?(100+val*100):(50+val*150)),b2=Math.floor(dp>0.5?val*val*60:val*40);c.save();c.globalAlpha=0.75+dp*0.15;c.fillStyle='rgb('+r2+','+g2+','+b2+')';c.shadowColor='#ff8800';c.shadowBlur=6+val*14;c.fillRect((W/2)-(i+1)*(W/72),horizY-bh,(W/72)-1,bh);c.fillRect((W/2)+i*(W/72),horizY-bh,(W/72)-1,bh);c.restore();}
  c.save();c.globalAlpha=0.55;c.strokeStyle='#ffcc44';c.lineWidth=1.5;c.shadowColor='#ff8800';c.shadowBlur=8;c.beginPath();for(let i=0;i<timeData.length;i++){let x=(i/timeData.length)*W,v=(timeData[i]/128)-1;i===0?c.moveTo(x,horizY+v*40):c.lineTo(x,horizY+v*40);}c.stroke();c.restore();
  if(dp>0.8&&s.beat>0.6){c.save();c.globalAlpha=(s.beat-0.6)*0.12;c.fillStyle='#ff6600';c.fillRect(0,0,W,H);c.restore();}
}

// ===================== STANKWICH =====================
function renderStank(){
  const s=stankSt,bass=getBass(),mid=getMid(),treble=getTreble(),energy=bass*0.5+mid*0.35+treble*0.15;
  if(bass>s.prev*1.3&&bass>0.2){s.beat=1.0;if(Math.random()>0.5)for(let i=0;i<6;i++){let a=Math.random()*Math.PI*2,sp=(3+Math.random()*5)*energy;s.sparks.push({x:W/2+(Math.random()-0.5)*W*0.3,y:H*0.62,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-2,life:1,decay:0.025+Math.random()*0.03,col:Math.random()>0.5?'#ff44aa':'#ffdd00',size:2+Math.random()*3});}}
  s.prev=bass*0.85+s.prev*0.15;s.beat*=0.88;s.speed=s.speed*0.88+energy*0.12;s.roadOffset=(s.roadOffset+s.speed*4+energy*3)%60;
  const horizY=H*0.48;
  let sky=c.createLinearGradient(0,0,0,horizY);sky.addColorStop(0,'#0a0015');sky.addColorStop(0.4,'#1a0035');sky.addColorStop(0.7,'#3d0060');sky.addColorStop(1,'#cc0055');c.fillStyle=sky;c.fillRect(0,0,W,horizY);
  c.save();for(let i=0;i<60;i++){let sx=(Math.sin(i*137.5)*0.5+0.5)*W,sy=(Math.cos(i*97.3)*0.5+0.5)*horizY*0.8,twinkle=0.3+0.5*Math.abs(Math.sin(frameCount*0.03+i));c.globalAlpha=twinkle;c.fillStyle='#ffffff';c.beginPath();c.arc(sx,sy,0.8,0,Math.PI*2);c.fill();}c.restore();
  const sunX=W/2,sunY=horizY*0.72,sunR=horizY*0.28;
  c.save();let sunGlow=c.createRadialGradient(sunX,sunY,0,sunX,sunY,sunR*2.5);sunGlow.addColorStop(0,'rgba(255,80,180,0.35)');sunGlow.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=sunGlow;c.beginPath();c.arc(sunX,sunY,sunR*2.5,0,Math.PI*2);c.fill();c.fillStyle='#ff3399';c.beginPath();c.arc(sunX,sunY,sunR,0,Math.PI*2);c.fill();c.globalCompositeOperation='destination-out';let stripeH=sunR*0.1,stripeGap=sunR*0.13;for(let i=0;i<8;i++){let sy2=sunY-sunR+sunR*0.5+i*(stripeH+stripeGap);c.fillStyle='rgba(0,0,0,1)';c.fillRect(sunX-sunR,sy2,sunR*2,stripeH);}c.globalCompositeOperation='source-over';c.strokeStyle='#ff88cc';c.lineWidth=2;c.shadowColor='#ff44aa';c.shadowBlur=20;c.beginPath();c.arc(sunX,sunY,sunR,0,Math.PI*2);c.stroke();c.restore();
  c.save();c.fillStyle='#1a0030';c.beginPath();c.moveTo(0,horizY);for(let x=0;x<=W;x+=40){let mh=Math.sin(x*0.007+frameCount*0.002)*30+Math.sin(x*0.013)*20+20;c.lineTo(x,horizY-mh);}c.lineTo(W,horizY);c.closePath();c.fill();c.restore();
  let roadGrad=c.createLinearGradient(0,horizY,0,H);roadGrad.addColorStop(0,'#1a1a2e');roadGrad.addColorStop(0.5,'#2d2d44');roadGrad.addColorStop(1,'#1a1a2e');c.fillStyle=roadGrad;c.beginPath();c.moveTo(W/2,horizY);c.lineTo(W*0.05,H);c.lineTo(W*0.95,H);c.closePath();c.fill();
  c.save();c.strokeStyle='#ff44aa';c.lineWidth=2;c.shadowColor='#ff44aa';c.shadowBlur=12;c.beginPath();c.moveTo(W/2,horizY);c.lineTo(W*0.05,H);c.stroke();c.beginPath();c.moveTo(W/2,horizY);c.lineTo(W*0.95,H);c.stroke();c.restore();
  c.save();c.strokeStyle='#ffffff';c.lineWidth=3;c.shadowColor='#ffffff';c.shadowBlur=6;for(let i=0;i<12;i++){let t=((i/12)+s.roadOffset/600+s.speed*0.01)%1;if(t<0.5){let y1=horizY+(H-horizY)*t,xw=(W*0.9)*t;c.beginPath();c.moveTo(W/2-xw*0.05,y1);c.lineTo(W/2+xw*0.05,y1);c.stroke();}}c.restore();
  for(let t of s.trees){t.z-=s.speed*1.5+energy*2;if(t.z<=5)t.z=250+Math.random()*50;let p=400/t.z,tx=W/2+t.side*(W*0.46+p*8),ty=horizY+p*1.2;if(ty>H+80||ty<horizY)continue;let th=p*1.8,tw=p*0.18;c.save();c.globalAlpha=Math.min(1,(ty-horizY)/60);c.fillStyle='#2d1a00';c.fillRect(tx-tw/2,ty-th,tw,th);c.strokeStyle='#1a4d00';c.lineWidth=Math.max(1,tw*0.8);c.shadowColor='#00aa44';c.shadowBlur=6;for(let j=0;j<6;j++){let fa=(-0.5+j/5)*Math.PI*0.9+Math.sin(frameCount*0.04+t.wobble)*0.08,fl=th*0.55;c.beginPath();c.moveTo(tx,ty-th);c.lineTo(tx+Math.cos(fa)*fl,ty-th+Math.sin(fa)*fl*0.5);c.stroke();}c.restore();}
  if(Math.random()>0.985)s.cars.push({z:5,lane:(Math.random()-0.5)*0.3,col:Math.random()>0.5?'#ffffff':'#ffeeaa'});
  for(let i=s.cars.length-1;i>=0;i--){let car=s.cars[i];car.z+=s.speed*3+energy*4+3;if(car.z>350){s.cars.splice(i,1);continue;}let p=400/car.z,cx2=W/2+car.lane*W*p*0.15,cy2=horizY+p*0.9;if(cy2>H){s.cars.splice(i,1);continue;}let ls=p*0.18;c.save();c.globalAlpha=Math.min(1,car.z/30);c.fillStyle=car.col;c.shadowColor=car.col;c.shadowBlur=8+p*2;c.beginPath();c.arc(cx2-ls,cy2,ls,0,Math.PI*2);c.fill();c.beginPath();c.arc(cx2+ls,cy2,ls,0,Math.PI*2);c.fill();c.restore();}
  for(let i=0;i<80;i++){let val=freq[Math.floor(i*freq.length/80)]/255,bh=val*H*0.18,r2=255,g2=Math.floor(val*60),b2=Math.floor(100+val*155);c.save();c.globalAlpha=0.8;c.fillStyle='rgb('+r2+','+g2+','+b2+')';c.shadowColor='#ff44aa';c.shadowBlur=8+val*16;c.fillRect(i*(W/80),H-bh,(W/80)-1,bh);c.restore();}
  c.save();c.globalAlpha=0.5;c.strokeStyle='#ff88cc';c.lineWidth=1.5;c.shadowColor='#ff44aa';c.shadowBlur=8;c.beginPath();for(let i=0;i<timeData.length;i++){let x=(i/timeData.length)*W,v=(timeData[i]/128)-1;i===0?c.moveTo(x,horizY+v*25):c.lineTo(x,horizY+v*25);}c.stroke();c.restore();
  for(let i=s.sparks.length-1;i>=0;i--){let sp=s.sparks[i];sp.x+=sp.vx;sp.y+=sp.vy;sp.vy+=0.12;sp.life-=sp.decay;if(sp.life<=0){s.sparks.splice(i,1);continue;}c.save();c.globalAlpha=sp.life;c.fillStyle=sp.col;c.shadowColor=sp.col;c.shadowBlur=8;c.beginPath();c.arc(sp.x,sp.y,sp.size*sp.life,0,Math.PI*2);c.fill();c.restore();}
  if(s.beat>0.55){c.save();c.globalAlpha=(s.beat-0.55)*0.12;c.fillStyle='#ff44aa';c.fillRect(0,0,W,H);c.restore();}
}

// ===================== SLICK BREAKS =====================
function renderSlick(){
  const s=slickSt,bass=getBass(),mid=getMid(),treble=getTreble(),energy=bass*0.5+mid*0.35+treble*0.15;
  if(bass>s.prev*1.32&&bass>0.22){s.beat=1.0;s.wobbleV+=0.4+energy*0.6;s.pulses.push({r:20,maxR:Math.min(W,H)*0.6+energy*200,alpha:0.9,thick:2+energy*5,hue:80+Math.random()*100});s.tears.push({y:Math.random()*H,h:2+Math.random()*12,offset:(Math.random()-0.5)*40,alpha:0.9,life:1});}
  s.prev=bass*0.85+s.prev*0.15;s.beat*=0.87;s.phase+=0.008+energy*0.015;s.wobbleV*=0.82;s.wobble+=s.wobbleV*0.1;s.wobble*=0.88;s.aberr=s.aberr*0.8+energy*12;
  s.glitchTimer-=1;if(s.glitchTimer<0&&energy>0.3&&Math.random()>0.85){s.glitchTimer=3+Math.random()*8;s.glitchX=Math.random()*W*0.6;s.glitchW=40+Math.random()*W*0.4;s.glitchAlpha=0.5+energy*0.5;}
  c.fillStyle='rgba(2,8,2,0.45)';c.fillRect(0,0,W,H);
  const cx=W/2,cy=H/2;
  for(let i=s.trails.length-1;i>=0;i--){let p=s.trails[i];p.x+=p.vx*(1+energy*3+s.wobble*0.3);p.y+=p.vy*(1+energy*3+s.wobble*0.3);p.life-=p.decay;if(p.life<=0){p.x=0.3+Math.random()*0.4;p.y=0.3+Math.random()*0.4;p.vx=(Math.random()-0.5)*0.006;p.vy=(Math.random()-0.5)*0.006;p.life=0.6+Math.random()*0.4;p.hue=80+Math.random()*120;continue;}if(p.x<0||p.x>1)p.vx*=-1;if(p.y<0||p.y>1)p.vy*=-1;c.save();c.globalAlpha=p.life*0.7;c.fillStyle='hsl('+p.hue+',100%,60%)';c.shadowColor='hsl('+p.hue+',100%,70%)';c.shadowBlur=6+energy*10;c.beginPath();c.arc(p.x*W,p.y*H,p.size*(0.5+energy*1.5)*p.life,0,Math.PI*2);c.fill();c.restore();}
  for(let ri=0;ri<s.rings.length;ri++){let ring=s.rings[ri];ring.wobblePhase+=ring.speed*(1+energy*2);let wobbleAmt=s.wobble*18+energy*22+s.beat*12;let r=ring.baseR+wobbleAmt*Math.sin(ring.wobblePhase+ri);let hue=100+ri*18+frameCount*0.4,pts=80;let offsets=[[s.aberr,'rgba(255,0,0,'],[0,'rgba(0,255,80,'],[-(s.aberr),'rgba(0,80,255,']];for(let [ox,colPfx] of offsets){c.save();c.globalAlpha=0.28+energy*0.2;c.strokeStyle=colPfx+(0.5+energy*0.3)+')';c.lineWidth=1.5+s.beat*2;c.shadowColor='hsl('+hue+',100%,60%)';c.shadowBlur=8+energy*14;c.beginPath();for(let j=0;j<=pts;j++){let angle=(j/pts)*Math.PI*2;let wobR=r+Math.sin(angle*3+ring.wobblePhase*1.3+s.phase)*wobbleAmt*0.5+Math.sin(angle*5+ring.wobblePhase*0.7)*wobbleAmt*0.3+Math.sin(angle*7-ring.wobblePhase*1.1)*wobbleAmt*0.2+Math.sin(angle*2+frameCount*0.02)*s.beat*15;let px2=cx+ox+Math.cos(angle)*wobR;let py2=cy+Math.sin(angle)*wobR;j===0?c.moveTo(px2,py2):c.lineTo(px2,py2);}c.closePath();c.stroke();c.restore();}}
  for(let n of s.nodes){n.x+=n.vx*(1+energy*2+s.wobble*0.2);n.y+=n.vy*(1+energy*2+s.wobble*0.2);if(n.x<0.05||n.x>0.95)n.vx*=-1;if(n.y<0.05||n.y>0.95)n.vy*=-1;}
  for(let i=0;i<s.nodes.length;i++){for(let j=i+1;j<s.nodes.length;j++){let dx=(s.nodes[i].x-s.nodes[j].x)*W,dy=(s.nodes[i].y-s.nodes[j].y)*H,dist=Math.sqrt(dx*dx+dy*dy),maxDist=W*0.28;if(dist<maxDist){let alpha=(1-dist/maxDist)*0.5*(0.4+energy*0.6),hue2=(s.nodes[i].hue+s.nodes[j].hue)/2+frameCount*0.2;c.save();c.globalAlpha=alpha;c.strokeStyle='hsl('+hue2+',100%,65%)';c.lineWidth=0.8+energy*1.5;c.shadowColor='hsl('+hue2+',100%,60%)';c.shadowBlur=4+energy*8;c.beginPath();c.moveTo(s.nodes[i].x*W,s.nodes[i].y*H);c.lineTo(s.nodes[j].x*W,s.nodes[j].y*H);c.stroke();c.restore();}}}
  for(let n of s.nodes){c.save();c.globalAlpha=0.8+energy*0.2;c.fillStyle='hsl('+n.hue+',100%,70%)';c.shadowColor='hsl('+n.hue+',100%,80%)';c.shadowBlur=10+energy*16;c.beginPath();c.arc(n.x*W,n.y*H,n.baseSize*(0.5+energy*1.2+s.beat*0.4),0,Math.PI*2);c.fill();c.restore();}
  for(let i=s.pulses.length-1;i>=0;i--){let p=s.pulses[i];p.r+=(p.maxR-p.r)*0.06;p.alpha-=0.02;if(p.alpha<=0){s.pulses.splice(i,1);continue;}let split=s.aberr*0.5;c.save();c.globalAlpha=p.alpha*0.5;c.strokeStyle='rgba(255,0,0,0.8)';c.lineWidth=p.thick*0.7;c.beginPath();c.arc(cx+split,cy,p.r,0,Math.PI*2);c.stroke();c.globalAlpha=p.alpha;c.strokeStyle='hsl('+p.hue+',100%,65%)';c.lineWidth=p.thick;c.shadowColor='hsl('+p.hue+',100%,70%)';c.shadowBlur=20;c.beginPath();c.arc(cx,cy,p.r,0,Math.PI*2);c.stroke();c.globalAlpha=p.alpha*0.5;c.strokeStyle='rgba(0,100,255,0.8)';c.lineWidth=p.thick*0.7;c.beginPath();c.arc(cx-split,cy,p.r,0,Math.PI*2);c.stroke();c.restore();}
  let blobR=35+energy*55+s.beat*25+s.wobble*15;
  c.save();let blobGlow=c.createRadialGradient(cx,cy,0,cx,cy,blobR*2.2);blobGlow.addColorStop(0,'rgba(80,255,0,'+(0.12+energy*0.18)+')');blobGlow.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=blobGlow;c.beginPath();c.arc(cx,cy,blobR*2.2,0,Math.PI*2);c.fill();
  for(let [ox,colStr] of [[s.aberr*0.6,'r'],[0,'g'],[-(s.aberr*0.6),'b']]){c.globalAlpha=ox===0?0.9:0.35;c.beginPath();for(let j=0;j<=32;j++){let angle=(j/32)*Math.PI*2;let bR=blobR+Math.sin(angle*4+s.phase*2.1)*blobR*0.25+Math.sin(angle*6+s.phase*1.4)*blobR*0.15+Math.sin(angle*2-s.phase*0.8)*blobR*0.1+s.beat*Math.sin(angle*8+s.phase*3)*blobR*0.12;c.lineTo?c.lineTo(cx+ox+Math.cos(angle)*bR,cy+Math.sin(angle)*bR):c.moveTo(cx+ox+Math.cos(angle)*bR,cy+Math.sin(angle)*bR);}c.closePath();let blobCore=c.createRadialGradient(cx+ox,cy,0,cx+ox,cy,blobR);blobCore.addColorStop(0,'#ffffff');blobCore.addColorStop(0.3,ox===0?'#aaff00':'rgba(120,255,0,0.5)');blobCore.addColorStop(0.7,ox===0?'#22aa00':'rgba(0,80,0,0.3)');blobCore.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=blobCore;c.shadowColor='#aaff00';c.shadowBlur=ox===0?30:0;c.fill();}
  c.restore();
  let barMaxLen=Math.min(W,H)*0.22;c.save();c.translate(cx,cy);for(let i=0;i<64;i++){let val=freq[Math.floor(i*freq.length/64)]/255,angle=(i/64)*Math.PI*2-Math.PI/2,innerR=blobR+4,outerR=innerR+val*barMaxLen,hue=80+i*2.5+frameCount*0.3;c.save();c.globalAlpha=0.75+val*0.25;c.strokeStyle='hsl('+hue+',100%,'+(50+val*40)+'%)';c.shadowColor='hsl('+hue+',100%,60%)';c.shadowBlur=6+val*14;c.lineWidth=2.5+val*3;c.beginPath();c.moveTo(Math.cos(angle)*innerR,Math.sin(angle)*innerR);c.lineTo(Math.cos(angle)*outerR,Math.sin(angle)*outerR);c.stroke();c.restore();}c.restore();
  c.save();c.globalAlpha=0.4;c.strokeStyle='rgba(255,0,0,0.8)';c.lineWidth=1.5;c.beginPath();for(let i=0;i<timeData.length;i++){let x=(i/timeData.length)*W+s.aberr,v=(timeData[i]/128)-1;i===0?c.moveTo(x,cy+v*45):c.lineTo(x,cy+v*45);}c.stroke();c.globalAlpha=0.75;c.strokeStyle='#aaff00';c.lineWidth=2;c.shadowColor='#88ff00';c.shadowBlur=12;c.beginPath();for(let i=0;i<timeData.length;i++){let x=(i/timeData.length)*W,v=(timeData[i]/128)-1;i===0?c.moveTo(x,cy+v*45):c.lineTo(x,cy+v*45);}c.stroke();c.globalAlpha=0.4;c.strokeStyle='rgba(0,80,255,0.8)';c.lineWidth=1.5;c.beginPath();for(let i=0;i<timeData.length;i++){let x=(i/timeData.length)*W-s.aberr,v=(timeData[i]/128)-1;i===0?c.moveTo(x,cy+v*45):c.lineTo(x,cy+v*45);}c.stroke();c.restore();
  for(let i=s.tears.length-1;i>=0;i--){let t=s.tears[i];t.life-=0.08;if(t.life<=0){s.tears.splice(i,1);continue;}c.save();c.globalAlpha=t.life*0.8;c.fillStyle='rgba(170,255,0,'+(t.life*0.15)+')';c.fillRect(0,t.y,W,t.h);c.restore();}
  if(s.glitchTimer>0){c.save();c.globalAlpha=s.glitchAlpha*0.15;c.fillStyle='#aaff00';c.fillRect(s.glitchX,Math.random()*H,s.glitchW,2+Math.random()*6);c.globalAlpha=s.glitchAlpha*0.08;c.fillStyle='rgba(255,0,0,0.8)';c.fillRect(s.glitchX+Math.random()*10,Math.random()*H,s.glitchW,1+Math.random()*4);c.restore();}
  if(s.beat>0.55){c.save();c.globalAlpha=(s.beat-0.55)*0.14;c.fillStyle='#aaff00';c.fillRect(0,0,W,H);c.restore();}
  c.save();c.globalAlpha=0.04;for(let y=0;y<H;y+=3){c.fillStyle='#000';c.fillRect(0,y,W,1);}c.restore();
}

// ===================== SLICK HOUSE =====================
function renderHouse(){
  const s=houseSt,bass=getBass(),mid=getMid(),treble=getTreble(),energy=bass*0.5+mid*0.35+treble*0.15;
  let vocalHit=false;if(mid>s.midPrev*1.5&&mid>0.25&&bass<0.4){vocalHit=true;s.vocalPeak=1.0;}
  s.midPrev=mid*0.7+s.midPrev*0.3;s.vocalPeak*=0.9;
  if(bass>s.prev*1.35&&bass>0.22){s.beat=1.0;let ix=Math.floor(Math.random()*s.surface.length);s.surfaceV[ix]-=8+energy*20;s.ripples.push({x:W*(ix/s.surface.length),y:H*0.72,r:10,maxR:120+energy*160,alpha:0.9,thick:2+energy*4});}
  s.prev=bass*0.85+s.prev*0.15;s.beat*=0.88;s.phase+=0.012+energy*0.01;s.glowPulse=s.glowPulse*0.9+energy*0.1;
  if(vocalHit){let dx=W*0.2+Math.random()*W*0.6;s.drops.push({x:dx,y:H*0.68,vx:(Math.random()-0.5)*3,vy:-4-Math.random()*6,r:4+Math.random()*6,life:1,decay:0.018+Math.random()*0.012});s.ripples.push({x:dx,y:H*0.72,r:5,maxR:60+mid*80,alpha:0.7,thick:1.5});}
  for(let i=0;i<s.keys.length;i++){let fBin=Math.floor(15+i*(80/s.keys.length)),val=freq[fBin]/255;if(val>0.5)s.keys[i].glow=Math.min(1,s.keys[i].glow+val*0.4);s.keys[i].glow*=0.88;}
  for(let i=1;i<s.surface.length-1;i++){s.surfaceV[i]+=(s.surface[i-1]+s.surface[i+1]-2*s.surface[i])*0.3;s.surfaceV[i]*=0.985;}
  for(let i=0;i<s.surface.length;i++)s.surface[i]+=s.surfaceV[i];
  if(energy>0.1){let ri=Math.floor(Math.random()*s.surface.length);s.surfaceV[ri]-=energy*3;}
  if(s.beat>0.7&&Math.random()>0.6)s.wisps.push({x:Math.random()*W,y:H*0.65+Math.random()*H*0.1,vx:(Math.random()-0.5)*0.8,vy:-0.5-Math.random()*1.5,r:8+Math.random()*20,alpha:0.25,life:1,decay:0.008+Math.random()*0.006});
  c.fillStyle='rgba(8,0,2,0.5)';c.fillRect(0,0,W,H);
  let ambGlow=c.createRadialGradient(W/2,H,0,W/2,H,H*0.9);ambGlow.addColorStop(0,'rgba(160,0,20,'+(0.12+s.glowPulse*0.2)+')');ambGlow.addColorStop(0.5,'rgba(80,0,10,'+(0.06+s.glowPulse*0.08)+')');ambGlow.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=ambGlow;c.fillRect(0,0,W,H);
  for(let o of s.orbs){o.x+=o.vx;o.y+=o.vy+Math.sin(s.phase+o.phase)*0.001;if(o.x<0)o.x=1;if(o.x>1)o.x=0;if(o.y<0)o.y=1;if(o.y>1)o.y=0;let or=o.r*(0.8+energy*0.5);let og=c.createRadialGradient(o.x*W,o.y*H,0,o.x*W,o.y*H,or*2);og.addColorStop(0,'rgba(220,0,30,'+(o.alpha*(0.5+energy*0.5))+')');og.addColorStop(0.5,'rgba(120,0,15,'+(o.alpha*0.3)+')');og.addColorStop(1,'rgba(0,0,0,0)');c.save();c.fillStyle=og;c.beginPath();c.arc(o.x*W,o.y*H,or*2,0,Math.PI*2);c.fill();c.restore();}
  for(let i=s.wisps.length-1;i>=0;i--){let w=s.wisps[i];w.x+=w.vx;w.y+=w.vy;w.r+=0.5;w.life-=w.decay;w.alpha=w.life*0.25;if(w.life<=0){s.wisps.splice(i,1);continue;}let wg=c.createRadialGradient(w.x,w.y,0,w.x,w.y,w.r);wg.addColorStop(0,'rgba(180,0,20,'+w.alpha+')');wg.addColorStop(1,'rgba(0,0,0,0)');c.save();c.fillStyle=wg;c.beginPath();c.arc(w.x,w.y,w.r,0,Math.PI*2);c.fill();c.restore();}
  for(let i=s.ripples.length-1;i>=0;i--){let rp=s.ripples[i];rp.r+=(rp.maxR-rp.r)*0.07;rp.alpha-=0.016;if(rp.alpha<=0){s.ripples.splice(i,1);continue;}c.save();c.globalAlpha=rp.alpha;c.strokeStyle='rgba(255,20,40,'+rp.alpha+')';c.lineWidth=rp.thick*rp.alpha;c.shadowColor='#ff1122';c.shadowBlur=14;c.beginPath();c.ellipse(rp.x,rp.y,rp.r,rp.r*0.3,0,0,Math.PI*2);c.stroke();c.restore();}
  const keyY=H*0.82,keyH=H*0.1,keyW=W*0.85/s.keys.length;
  for(let i=0;i<s.keys.length;i++){let k=s.keys[i],kx=k.x*W,isBlack=[1,3,6,8,10,13,15,18,20,22].includes(i%24);c.save();c.globalAlpha=0.15+k.glow*0.7;if(isBlack){c.fillStyle='rgba(80,0,10,0.9)';c.fillRect(kx,keyY,keyW-1,keyH*0.65);if(k.glow>0.1){c.fillStyle='rgba(255,20,40,'+k.glow+')';c.fillRect(kx,keyY,keyW-1,keyH*0.65);}}else{c.fillStyle='rgba(180,0,25,0.6)';c.fillRect(kx,keyY,keyW-1,keyH);if(k.glow>0.1){c.fillStyle='rgba(255,60,80,'+k.glow*0.8+')';c.fillRect(kx,keyY,keyW-1,keyH);}}if(k.glow>0.2){c.globalAlpha=k.glow*0.5;c.shadowColor='#ff1133';c.shadowBlur=20;c.strokeStyle='#ff2244';c.lineWidth=1;c.strokeRect(kx,keyY,keyW-1,isBlack?keyH*0.65:keyH);}c.restore();}
  c.save();c.globalAlpha=0.3;c.strokeStyle='#440010';c.lineWidth=1;c.beginPath();c.moveTo(W*0.075,keyY);c.lineTo(W*0.925,keyY);c.stroke();c.restore();
  const surfY=H*0.72,surfStep=W/s.surface.length;
  c.save();let reflGrad=c.createLinearGradient(0,surfY,0,surfY+H*0.08);reflGrad.addColorStop(0,'rgba(200,0,20,0.18)');reflGrad.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=reflGrad;c.fillRect(0,surfY,W,H*0.08);c.restore();
  c.save();c.beginPath();c.moveTo(0,H);for(let i=0;i<s.surface.length;i++){let sx=i*surfStep,sy=surfY+s.surface[i];i===0?c.lineTo(sx,sy):c.lineTo(sx,sy);}c.lineTo(W,H);c.closePath();let liqGrad=c.createLinearGradient(0,surfY,0,H);liqGrad.addColorStop(0,'rgba(220,0,30,0.85)');liqGrad.addColorStop(0.15,'rgba(160,0,20,0.7)');liqGrad.addColorStop(0.5,'rgba(80,0,10,0.8)');liqGrad.addColorStop(1,'rgba(20,0,5,0.95)');c.fillStyle=liqGrad;c.fill();
  c.beginPath();for(let i=0;i<s.surface.length;i++){let sx=i*surfStep,sy=surfY+s.surface[i];i===0?c.moveTo(sx,sy):c.lineTo(sx,sy);}c.strokeStyle='rgba(255,80,100,0.9)';c.lineWidth=2;c.shadowColor='#ff2244';c.shadowBlur=16+energy*20;c.stroke();
  c.beginPath();for(let i=0;i<s.surface.length;i++){let sx=i*surfStep,sy=surfY+s.surface[i]-1.5;i===0?c.moveTo(sx,sy):c.lineTo(sx,sy);}c.strokeStyle='rgba(255,200,210,0.3)';c.lineWidth=1;c.shadowBlur=0;c.stroke();c.restore();
  for(let i=0;i<64;i++){let val=freq[Math.floor(i*freq.length/64)]/255,bh=val*H*0.45,bx=i*(W/64),surfOff=s.surface[Math.floor(i*s.surface.length/64)]||0,by=surfY+surfOff-bh,r2=Math.floor(120+val*135),g2=Math.floor(val*20),b2=Math.floor(val*30);c.save();c.globalAlpha=0.75;c.fillStyle='rgb('+r2+','+g2+','+b2+')';c.shadowColor='#ff1133';c.shadowBlur=6+val*16;c.fillRect(bx,by,(W/64)-1,bh);if(val>0.6){c.globalAlpha=(val-0.6)*1.5;c.fillStyle='#ffaaaa';c.fillRect(bx,by,(W/64)-1,3);}c.restore();}
  c.save();c.globalAlpha=0.65;c.strokeStyle='#ff4466';c.lineWidth=2;c.shadowColor='#ff1133';c.shadowBlur=12;c.beginPath();for(let i=0;i<timeData.length;i++){let x=(i/timeData.length)*W,v=(timeData[i]/128)-1,sy=surfY+(s.surface[Math.floor(i*s.surface.length/timeData.length)]||0);i===0?c.moveTo(x,sy+v*30):c.lineTo(x,sy+v*30);}c.stroke();c.restore();
  for(let i=s.drops.length-1;i>=0;i--){let d=s.drops[i];d.x+=d.vx;d.y+=d.vy;d.vy+=0.18;d.life-=d.decay;if(d.y>=surfY){let si=Math.floor(d.x/surfStep);if(si>=0&&si<s.surface.length)s.surfaceV[si]-=d.r*0.8;s.drops.splice(i,1);continue;}if(d.life<=0){s.drops.splice(i,1);continue;}c.save();c.globalAlpha=d.life;let dr=c.createRadialGradient(d.x,d.y,0,d.x,d.y,d.r*2);dr.addColorStop(0,'rgba(255,60,80,0.9)');dr.addColorStop(0.5,'rgba(200,0,30,0.6)');dr.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=dr;c.beginPath();c.arc(d.x,d.y,d.r*2,0,Math.PI*2);c.fill();c.fillStyle='rgba(255,120,140,0.9)';c.shadowColor='#ff1133';c.shadowBlur=10;c.beginPath();c.arc(d.x,d.y,d.r*0.6,0,Math.PI*2);c.fill();c.restore();}
  if(s.beat>0.4){c.save();c.globalAlpha=(s.beat-0.4)*0.1;c.fillStyle='#ff1133';c.fillRect(0,0,W,H);c.restore();}
  c.save();c.globalAlpha=0.05;for(let y=0;y<H;y+=4){c.fillStyle='#000';c.fillRect(0,y,W,2);}c.restore();
}

// ===================== HAUNT ME =====================
let hauntSt = {};
function initHaunt(){
  hauntSt = {
    phase: 0, beat: 0, prev: 0, glowPulse: 0,
    hearts: [],
    rings: Array.from({length:5}, (_,i) => ({
      baseR: 60 + i*38,
      wobble: 0,
      speed: 0.008 + i*0.003,
      phase: (i/5)*Math.PI*2
    })),
    petals: Array.from({length:28}, () => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random()-0.5)*0.0008,
      vy: 0.0003 + Math.random()*0.0006,
      r: 4 + Math.random()*8,
      rot: Math.random()*Math.PI*2,
      rotV: (Math.random()-0.5)*0.03,
      hue: Math.random()<0.5 ? '#ff2d78' : (Math.random()<0.5 ? '#ff00cc' : '#c77dff'),
      alpha: 0.3 + Math.random()*0.5
    })),
    stars: Array.from({length:80}, () => ({
      x: Math.random(), y: Math.random(),
      r: 0.5 + Math.random()*1.8,
      t: Math.random()*Math.PI*2,
      spd: 0.01 + Math.random()*0.03
    })),
    glyphs: ['♥','♡','❤','✿','☆'],
    beatCool: 0
  };
}
initHaunt();

function renderHaunt(){
  const s = hauntSt;
  const bass = getBass(), mid = getMid(), treble = getTreble();
  const energy = bass*0.55 + mid*0.3 + treble*0.15;

  if(bass > s.prev*1.35 && bass > 0.2){ s.beat = 1.0; }
  s.prev = bass*0.85 + s.prev*0.15;
  s.beat *= 0.88;
  s.phase += 0.012 + energy*0.01;
  s.glowPulse = s.glowPulse*0.9 + energy*0.1;

  // spawn hearts on beat
  if(s.beatCool > 0) s.beatCool--;
  if(s.beat > 0.65 && s.beatCool === 0){
    const count = s.beat > 0.85 ? 4 : 1;
    for(let i=0; i<count; i++){
      s.hearts.push({
        x: W*(0.2 + Math.random()*0.6),
        y: H*0.75,
        vx: (Math.random()-0.5)*2.5,
        vy: -(2 + Math.random()*4),
        size: 14 + Math.random()*20,
        alpha: 1, life: 1,
        decay: 0.007 + Math.random()*0.008,
        glyph: s.glyphs[Math.floor(Math.random()*s.glyphs.length)],
        hue: Math.random()<0.5 ? '#ff2d78' : '#c77dff',
        wobble: Math.random()*Math.PI*2,
        wobSpd: 0.05 + Math.random()*0.05
      });
    }
    s.beatCool = 18;
  }
  // ambient hearts
  if(Math.random() < 0.012){
    s.hearts.push({
      x: Math.random()*W, y: H+10,
      vx: (Math.random()-0.5)*0.8,
      vy: -(0.6 + Math.random()*1.4),
      size: 8 + Math.random()*14,
      alpha: 0.5, life: 1,
      decay: 0.003 + Math.random()*0.004,
      glyph: s.glyphs[Math.floor(Math.random()*s.glyphs.length)],
      hue: '#ff2d78',
      wobble: Math.random()*Math.PI*2,
      wobSpd: 0.02 + Math.random()*0.03
    });
  }

  const cx = W/2, cy = H*0.42;

  // ---- BG ----
  c.fillStyle = 'rgba(10,0,20,0.45)';
  c.fillRect(0,0,W,H);

  // radial glow
  let bgGrad = c.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W,H)*0.75);
  bgGrad.addColorStop(0, 'rgba(40,0,60,'+(0.3+s.glowPulse*0.3)+')');
  bgGrad.addColorStop(0.5, 'rgba(15,0,30,0.2)');
  bgGrad.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = bgGrad;
  c.fillRect(0,0,W,H);

  // beat flash
  if(s.beat > 0.7){
    c.save();
    c.globalAlpha = (s.beat-0.7)*0.18;
    c.fillStyle = '#ff2d78';
    c.fillRect(0,0,W,H);
    c.restore();
  }

  // perspective grid
  c.save();
  c.globalAlpha = 0.06 + s.glowPulse*0.06;
  c.strokeStyle = '#ff2d78';
  c.lineWidth = 1;
  const horizon = H*0.65;
  const vp = {x: cx, y: horizon};
  for(let i=-14; i<=14; i++){
    c.beginPath();
    c.moveTo(vp.x, vp.y);
    c.lineTo(cx + i*(W/13), H+10);
    c.stroke();
  }
  for(let j=0; j<16; j++){
    const t = j/16;
    const ease = Math.pow(t, 2.5);
    const y = horizon + ease*(H+10-horizon);
    const xSpan = ease*W*1.15;
    c.beginPath();
    c.moveTo(cx - xSpan/2, y);
    c.lineTo(cx + xSpan/2, y);
    c.stroke();
  }
  c.restore();

  // stars
  s.stars.forEach(st => {
    st.t += st.spd;
    const a = 0.2 + 0.8*(0.5 + 0.5*Math.sin(st.t));
    c.save();
    c.globalAlpha = a;
    c.fillStyle = '#e8c8ff';
    c.shadowColor = '#c77dff';
    c.shadowBlur = 4;
    c.beginPath();
    c.arc(st.x*W, st.y*H, st.r, 0, Math.PI*2);
    c.fill();
    c.restore();
  });

  // ---- FREQUENCY BARS ----
  const barCount = 80;
  const barW = (W*0.68)/barCount;
  const barX0 = W*0.16;
  const barBaseY = H*0.72;
  const maxBH = H*0.32;

  for(let i=0; i<barCount; i++){
    const idx = Math.floor(i/barCount * freq.length * 0.55);
    const val = freq[idx]/255;
    const bh = val * maxBH;
    const t = i/barCount;
    const r2 = Math.round(255*(0.7 + t*0.3));
    const g2 = Math.round(45*t);
    const b2 = Math.round(120 + t*135);
    c.save();
    c.shadowColor = 'rgb('+r2+','+g2+','+b2+')';
    c.shadowBlur = 14;
    const grd = c.createLinearGradient(0, barBaseY-bh, 0, barBaseY);
    grd.addColorStop(0, 'rgba('+r2+','+g2+','+b2+',1)');
    grd.addColorStop(1, 'rgba('+r2+','+g2+','+b2+',0.15)');
    c.fillStyle = grd;
    const x = barX0 + i*barW;
    const gap = barW*0.28;
    c.fillRect(x+gap/2, barBaseY-bh, barW-gap, bh);
    c.globalAlpha = 0.12;
    c.fillRect(x+gap/2, barBaseY, barW-gap, bh*0.35);
    c.restore();
  }

  // ---- OSCILLOSCOPE RINGS ----
  s.rings.forEach((ring, ri) => {
    ring.wobble += ring.speed*(1 + energy*2);
    const r = ring.baseR*(Math.min(W,H)/600) + s.beat*22 + energy*18;
    const pts = 128;
    const hues = ['#ff2d78','#ff00cc','#c77dff','#00fff7','#ff2d78'];
    c.save();
    c.globalAlpha = 0.5 - ri*0.07;
    c.strokeStyle = hues[ri % hues.length];
    c.shadowColor  = hues[ri % hues.length];
    c.shadowBlur   = 14 - ri*2;
    c.lineWidth    = 1.8 - ri*0.2;
    c.beginPath();
    for(let j=0; j<=pts; j++){
      const angle = (j/pts)*Math.PI*2 - Math.PI/2 + ring.phase;
      const idx2 = Math.floor(j/pts * timeData.length);
      const amp = (timeData[idx2]-128)/128;
      const rr = r + amp*r*0.4 + Math.sin(angle*3 + ring.wobble)*r*0.08;
      const px2 = cx + Math.cos(angle)*rr;
      const py2 = cy + Math.sin(angle)*rr;
      j===0 ? c.moveTo(px2,py2) : c.lineTo(px2,py2);
    }
    c.closePath();
    c.stroke();
    c.restore();
    ring.phase += 0.004;
  });

  // ---- CENTER ORB ----
  const orbR = Math.min(W,H)*0.055 + s.beat*18 + energy*14;
  const orbG = c.createRadialGradient(cx,cy,0,cx,cy,orbR);
  orbG.addColorStop(0, 'rgba(255,200,230,0.98)');
  orbG.addColorStop(0.35, 'rgba(255,45,120,0.75)');
  orbG.addColorStop(1, 'rgba(255,0,200,0)');
  c.save();
  c.shadowColor = '#ff2d78';
  c.shadowBlur = 40 + s.beat*30;
  c.fillStyle = orbG;
  c.beginPath();
  c.arc(cx, cy, orbR, 0, Math.PI*2);
  c.fill();
  // heart glyph in center
  c.font = Math.round(16 + s.beat*14 + energy*10) + 'px serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillStyle = '#fff0f8';
  c.shadowBlur = 18;
  c.fillText('♥', cx, cy);
  c.restore();

  // ---- FLOATING PETALS ----
  s.petals.forEach(p => {
    p.x += p.vx; p.y += p.vy;
    p.rot += p.rotV;
    if(p.y > 1.05) p.y = -0.05;
    if(p.x < -0.05) p.x = 1.05;
    if(p.x > 1.05) p.x = -0.05;
    c.save();
    c.globalAlpha = p.alpha*(0.5 + energy*0.5);
    c.translate(p.x*W, p.y*H);
    c.rotate(p.rot);
    c.font = p.r*2 + 'px serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillStyle = p.hue;
    c.shadowColor = p.hue;
    c.shadowBlur = 8;
    c.fillText('♥', 0, 0);
    c.restore();
  });

  // ---- HEARTS (beat spawned) ----
  for(let i=s.hearts.length-1; i>=0; i--){
    const h = s.hearts[i];
    h.wobble += h.wobSpd;
    h.x += h.vx + Math.sin(h.wobble)*0.6;
    h.y += h.vy;
    h.life -= h.decay;
    if(h.life <= 0 || h.y < -30){ s.hearts.splice(i,1); continue; }
    c.save();
    c.globalAlpha = h.life * h.alpha;
    c.font = h.size + 'px serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillStyle = h.hue;
    c.shadowColor = h.hue;
    c.shadowBlur = 16;
    c.fillText(h.glyph, h.x, h.y);
    c.restore();
  }

  // scanlines
  c.save();
  c.globalAlpha = 0.04;
  for(let y=0; y<H; y+=4){ c.fillStyle='#000'; c.fillRect(0,y,W,1); }
  c.restore();
}

// ===================== DEFAULT (any track without its own) =====================
let defSt = {beat:0, prev:0, rings:[], phase:0};
function hexA(hex, a){ var n=parseInt(hex.slice(1),16); return 'rgba('+((n>>16)&255)+','+((n>>8)&255)+','+(n&255)+','+a+')'; }
function renderDefault(){
  const s=defSt, bass=getBass(), mid=getMid(), energy=bass*0.6+mid*0.4;
  if(bass>s.prev*1.35&&bass>0.22){ s.beat=1; s.rings.push({r:40, a:1}); }
  s.prev=bass*0.85+s.prev*0.15; s.beat*=0.88; s.phase+=0.01+energy*0.02;
  c.fillStyle='rgba(6,6,10,0.35)'; c.fillRect(0,0,W,H);
  const cx=W/2, cy=H*0.45, base=Math.min(W,H)*0.12+energy*40+s.beat*20;
  for(let i=s.rings.length-1;i>=0;i--){ const r=s.rings[i]; r.r+=(Math.max(W,H)*0.6-r.r)*0.05; r.a-=0.02; if(r.a<=0){s.rings.splice(i,1);continue;} c.strokeStyle=hexA(accent,r.a); c.lineWidth=2+r.a*3; c.beginPath(); c.arc(cx,cy,r.r,0,Math.PI*2); c.stroke(); }
  c.save(); c.translate(cx,cy);
  for(let i=0;i<96;i++){ const v=freq[Math.floor(i*freq.length/96*0.6)]/255, a=(i/96)*Math.PI*2+s.phase, r1=base, r2=base+v*Math.min(W,H)*0.3;
    c.strokeStyle=hexA(accent,0.35+v*0.65); c.lineWidth=2+v*3; c.beginPath(); c.moveTo(Math.cos(a)*r1,Math.sin(a)*r1); c.lineTo(Math.cos(a)*r2,Math.sin(a)*r2); c.stroke(); }
  c.restore();
  const g=c.createRadialGradient(cx,cy,0,cx,cy,base); g.addColorStop(0,'#ffffff'); g.addColorStop(0.4,accent); g.addColorStop(1,'rgba(0,0,0,0)'); c.fillStyle=g; c.beginPath(); c.arc(cx,cy,base,0,Math.PI*2); c.fill();
  c.strokeStyle=hexA(accent,0.7); c.lineWidth=2; c.beginPath();
  for(let i=0;i<timeData.length;i+=4){ const x=(i/timeData.length)*W, y=H*0.82+((timeData[i]/128)-1)*50; i===0?c.moveTo(x,y):c.lineTo(x,y); }
  c.stroke();
}

var RENDER = { moon:renderMoon, galla:renderGalla, blip:renderBlip, stank:renderStank, slick:renderSlick, house:renderHouse, haunt:renderHaunt };
var current = 'default';
return {
  setAnalyser: function(a){ analyser=a; freq=new Uint8Array(a.frequencyBinCount); timeData=new Uint8Array(a.fftSize); },
  reset: function(id, color){
    current = RENDER[id] ? id : 'default';
    if(color) accent = color;
    frameCount = 0;
    W = canvas.width; H = canvas.height;
    c.globalAlpha = 1; c.fillStyle = '#000'; c.fillRect(0,0,W,H);
    if(current==='default') defSt={beat:0,prev:0,rings:[],phase:0}; else resetState(current);
  },
  frame: function(){
    W = canvas.width; H = canvas.height;
    if(analyser){ analyser.getByteFrequencyData(freq); analyser.getByteTimeDomainData(timeData); }
    frameCount++;
    (RENDER[current] || renderDefault)();
  },
  setQuality: setQuality,
  quality: function(){ return quality; },
  styles: Object.keys(RENDER).concat(['default'])
};
}

// Guess what the device can handle before anything is drawn
function detectTier(){
  var ua = navigator.userAgent || '', reasons = [];
  var touch = navigator.maxTouchPoints || 0;
  var mobile = (navigator.userAgentData && navigator.userAgentData.mobile) || /Android|iPhone|iPad|iPod|Mobile/i.test(ua) || (/Macintosh/.test(ua) && touch > 1);
  if (mobile) reasons.push('mobile os');
  var small = Math.min(window.screen.width, window.screen.height) < 820;
  if (small && touch > 0) reasons.push('small touch screen');
  var cores = navigator.hardwareConcurrency || 8;
  if (cores <= 2) reasons.push(cores + ' cpu cores');
  var mem = navigator.deviceMemory || 8;
  if (mem <= 2) reasons.push(mem + ' gb memory');
  return { tier: reasons.length ? 'low' : 'high', reasons: reasons };
}

// Watches the real frame rate and calls onSlow once if it stays under about 35 fps
function fpsGuard(onSlow){
  var hist = [], last = 0, fired = false;
  return {
    tick: function(now){
      if (last) { if (!document.hidden) { hist.push(Math.min(now - last, 250)); if (hist.length > 150) hist.shift(); } }
      last = now;
      var sum = hist.reduce(function(a, b){ return a + b; }, 0);
      if (!fired && hist.length >= 20 && sum >= 3000) {   // judge after about 3 seconds of frames
        var avg = sum / hist.length;
        if (avg > 28) { fired = true; onSlow(Math.round(1000 / avg)); }
      }
    },
    reset: function(){ hist = []; last = 0; fired = false; }
  };
}

window.RATVIZ = { create: create, detectTier: detectTier, fpsGuard: fpsGuard };
})();
