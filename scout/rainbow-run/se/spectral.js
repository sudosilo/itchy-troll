/* Spectral Engine inside the Rainbow Run wall host.
   The twelve Spectral Engine visualizers, with their drawing code unchanged. Spectral Engine already
   builds its spectrum from the stompbox band instead of a microphone: it reads the room's loop, works out
   which drum hits and notes are sounding, and fills the same spectrum and waveform arrays an audio file
   would. Here that runs on the wall host's shared steps of time, so every phone draws the same picture.
   While the band is stopped, a slow shared drift keeps the picture alive. */
(function(){
const MODE_ID=document.body.dataset.scene||"spectrum";
const canvas=document.getElementById("cv");
const ctx=canvas.getContext("2d");
let W,H,DPR;
function resize(){DPR=window.devicePixelRatio||1;W=innerWidth;H=innerHeight;canvas.width=Math.round(W*DPR);canvas.height=Math.round(H*DPR);ctx.setTransform(DPR,0,0,DPR,0,0);ctx.fillStyle="#f8fdf9";ctx.fillRect(0,0,W,H)}
resize();

/* ---- the same analysis values the original keeps ---- */
const N=1024,SR=44100,BIN_HZ=SR/2048;
const audioCtx=undefined;
const analyser={fftSize:2048,frequencyBinCount:N};
let freqData=new Uint8Array(N),timeData=new Uint8Array(N),bufLen=N;
let bass=0,mid=0,high=0,peak=0,rms=0,zcr=0,bpmEst=0,beatHistory=[],lastBeat=0,dominantStep=0,frameCount=0;
let particles=[],trailCanvas,trailCtx,hexGrid=[],lissPhase=0,spiralAngle=0,branchState=[],ribbonPoints=[],constellationNodes=[],gridHistory=[];
let pendulumAngle=[0,0,0],pendulumVel=[0.02,0.031,0.017];
window.pendulumTrail=[];
const EDO=31,A4=440;
const SHORT=['C','C↑','D♭','C♯','D','D↑','E♭','D♯','E','E↑','F♭','F','F↑','G♭','F♯','G','G↑','A♭','G♯','A','A↑','B♭','A♯','B','B↑','C♭','C↑↑','D♭↑','C♯↑','D♭♭','B♯♯'];
function freqToEdo(freq){if(freq<=0)return 0;return(((Math.round(12*Math.log2(freq/A4)*EDO/12))%EDO)+EDO)%EDO}
function hsl(h,s,l,a=1){return `hsla(${h},${s}%,${l}%,${a})`}
function freqColor(i,n,a=1){return hsl((120+(i/n)*220)%360,80,42,a)}
function energyColor(e,a=1){return hsl(120+e*140,75,35+e*20,a)}
function getTrail(){
  if(!trailCanvas){trailCanvas=document.createElement("canvas");trailCtx=trailCanvas.getContext("2d")}
  if(trailCanvas.width!==W||trailCanvas.height!==H){trailCanvas.width=W;trailCanvas.height=H}
  return trailCtx;
}
function avg(arr,s,e){let sum=0;for(let i=s;i<e;i++)sum+=arr[i];return sum/(e-s)||0}

/* ---- the band, as Spectral Engine's band source builds it ---- */
const acc=new Float32Array(N);
function bump(centerHz,widthBins,amp){
  const c=centerHz/BIN_HZ,lo=Math.max(0,Math.floor(c-widthBins*3)),hi=Math.min(N-1,Math.ceil(c+widthBins*3));
  for(let i=lo;i<=hi;i++){const d=(i-c)/widthBins;acc[i]+=amp*Math.exp(-d*d)}
}
function band(loHz,hiHz,amp,rough){
  const lo=Math.max(0,Math.floor(loHz/BIN_HZ)),hi=Math.min(N-1,Math.ceil(hiHz/BIN_HZ));
  for(let i=lo;i<=hi;i++)acc[i]+=amp*(1-rough+rough*Math.random());
}
const DRUM_DECAY={bd:0.22,sd:0.16,hh:0.05,oh:0.25,cp:0.12,ck:0.05,cl:0.05};
function drum(name,amp){
  if(name==="bd"){bump(55,2.2,amp);bump(110,2,amp*0.6)}
  else if(name==="sd"){bump(190,3,amp*0.7);band(400,5000,amp*0.45,0.6)}
  else if(name==="hh")band(7000,14000,amp*0.5,0.7);
  else if(name==="oh")band(6000,15000,amp*0.55,0.7);
  else if(name==="cp")band(900,3000,amp*0.6,0.6);
  else if(name==="ck")bump(1600,1.5,amp*0.8);
  else if(name==="cl")bump(1000,1.5,amp*0.6);
}
const hz=function(m){return 440*Math.pow(2,(m-69)/12)};
const partAt=function(s,bar){return s.pending&&bar>=s.pending.atBar?s.pending:s};
/* BLUE PHONE: while the phone's microphone is on, the spectrum and waveform come straight from it. */
function micFill(){
  let M=null;try{M=window.__mic?window.__mic():null}catch(e){}
  if(!M)return null;
  freqData.set(M.freq.subarray(0,N));timeData.set(M.time.subarray(0,N));
  let top=0,at=0;for(let i=2;i<N;i++)if(freqData[i]>top){top=freqData[i];at=i}
  return {loudHz:top>40?at*M.rate/M.fft:0,t:performance.now()/1000};
}
function fill(){
  const live=micFill();if(live)return live;
  const r=window.__room?window.__room():null,ep=r?r.epoch:0,room=r&&r.state&&typeof r.state.tempo==="number"&&r.state.tempo>0&&typeof r.state.epoch==="number"?r.state:null;
  const P=window.StompboxPattern,sNow=ep+performance.now(),tNow=sNow/1000;
  acc.fill(0);
  const tones=[];let noise=0,loudest=0,loudHz=0;
  if(room&&room.playing&&P){
    const bar=P.barAt(room,sNow);
    for(let b=bar-1;b<=bar;b++){
      if(b<room.barOffset)continue;
      const t0=P.barTime(room,b),part=partAt(room,b),ms=240000/part.tempo;
      ["drums","bass","lead","pad"].forEach(function(slot){
        const src=part.slots&&part.slots[slot];
        if(typeof src!=="string"||src.length>400)return;
        const evs=P.events(src,b);
        for(let k=0;k<evs.length;k++){
          const ev=evs[k],ts=t0+ev.pos*ms,age=(sNow-ts)/1000;
          if(age<0)continue;
          if(ev.drum){const amp=Math.exp(-age/(DRUM_DECAY[ev.drum]||0.1));if(amp<0.02)continue;drum(ev.drum,amp);if(ev.drum!=="bd")noise+=amp*0.3}
          else{
            const len=ev.dur*ms/1000*(slot==="pad"?1:0.85),base=slot==="bass"?0.95:slot==="pad"?0.45:0.75;
            const amp=base*(age<len?Math.exp(-age*(slot==="pad"?0.3:1.6)):Math.exp(-(age-len)/0.12)*Math.exp(-len*1.6));
            if(amp<0.02)continue;
            const f=hz(ev.note);for(let h=1;h<=4;h++)bump(f*h,1.4,amp/(h*h*0.8+0.2));
            tones.push({f:f,a:amp});if(amp>loudest){loudest=amp;loudHz=f}
          }
        }
      });
    }
    /* a soft pulse on every beat so a sparse pattern still breathes with the tempo */
    const part=partAt(room,bar),beatMs=60000/part.tempo,intoBeat=(sNow-P.barTime(room,bar))%beatMs/1000;
    bump(70,4,0.25*Math.exp(-intoBeat/0.15));
    bpmEst=part.tempo;
  }else{
    /* band stopped: a slow shared drift so the screens stay alive and move together */
    const breath=0.18+0.12*Math.sin(tNow*0.9);
    bump(80+40*Math.sin(tNow*0.3),6,breath);
    bump(440+200*Math.sin(tNow*0.21),10,breath*0.6);
    tones.push({f:110+30*Math.sin(tNow*0.3),a:breath});
  }
  for(let i=0;i<N;i++){const floor=0.04*Math.exp(-i/260)+0.015*Math.random(),v=Math.min(1,acc[i]+floor);freqData[i]=Math.round(freqData[i]*0.55+v*255*0.45)}
  for(let i=0;i<N;i++){
    const t=tNow+i/SR;let v=0;
    for(let k=0;k<tones.length;k++)v+=tones[k].a*Math.sin(2*Math.PI*tones[k].f*t);
    v=v*0.45+(Math.random()*2-1)*Math.min(0.5,noise);
    timeData[i]=Math.max(0,Math.min(255,Math.round(128+v*100)));
  }
  return {loudHz:loudHz,t:tNow};
}
function analyzeFrame(){
  const f=fill();
  bass=avg(freqData,0,Math.floor(bufLen*0.05));mid=avg(freqData,Math.floor(bufLen*0.05),Math.floor(bufLen*0.3));high=avg(freqData,Math.floor(bufLen*0.3),Math.floor(bufLen*0.7));
  peak=0;for(let i=0;i<N;i++)if(freqData[i]>peak)peak=freqData[i];
  let sum2=0;for(let i=0;i<timeData.length;i++){const v=(timeData[i]/128-1);sum2+=v*v}rms=Math.sqrt(sum2/timeData.length);
  let zc=0;for(let i=1;i<timeData.length;i++)if((timeData[i-1]-128)*(timeData[i]-128)<0)zc++;zcr=zc;
  if(f.loudHz)dominantStep=freqToEdo(f.loudHz);
  beatHistory.push(bass);if(beatHistory.length>43)beatHistory.shift();
  const bmean=beatHistory.reduce((a,b)=>a+b,0)/beatHistory.length;
  if(bass>bmean*1.38&&f.t-lastBeat>0.22){lastBeat=f.t}
  frameCount++;
}

/* ===== the twelve visualizers, copied from Spectral Engine ===== */
// ════════════════════════════════════════════════════════════════════
// 01 · SPECTRUM
// ════════════════════════════════════════════════════════════════════
function spectrum() {
  ctx.fillStyle='#f8fdf9'; ctx.fillRect(0,0,W,H);
  const split = H*0.68;
  const bars = Math.floor(W/3);
  const bw = W/bars;
  for(let i=0;i<bars;i++){
    const idx=Math.floor(i*bufLen*0.75/bars);
    const v=freqData[idx]/255;
    const bh=v*split*0.94;
    const x=i*bw;
    const col=freqColor(i,bars);
    // Filled bar (semi-transparent)
    ctx.fillStyle=col.replace('hsla','hsla').replace(/,[\d.]+\)$/,`,${0.12+v*0.18})`);
    ctx.fillStyle=freqColor(i,bars,0.12+v*0.18);
    ctx.fillRect(x,split-bh,bw-1,bh);
    // Outline
    ctx.strokeStyle=freqColor(i,bars,0.7+v*0.3);
    ctx.lineWidth=1;
    ctx.strokeRect(x,split-bh,bw-1,bh);
    // Peak cap
    ctx.fillStyle=freqColor(i,bars,1);
    ctx.fillRect(x,split-bh-2,bw-1,2);
  }
  // Axis
  ctx.strokeStyle='#b0d8b8'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(0,split); ctx.lineTo(W,split); ctx.stroke();
  // Waveform below
  const wy=split+10, wh=H-split-18;
  ctx.beginPath(); ctx.strokeStyle='#22c55e'; ctx.lineWidth=1.5;
  for(let i=0;i<timeData.length;i++){
    const x=(i/timeData.length)*W;
    const y=wy+wh/2+(timeData[i]/128-1)*(wh/2);
    i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
  }
  ctx.stroke();
  // Beat flash
  if(bass>185){ ctx.fillStyle=`rgba(34,197,94,${(bass-185)/70*0.07})`; ctx.fillRect(0,0,W,H); }
}

// ════════════════════════════════════════════════════════════════════
// 02 · WAVEFORM, multi-layer phase-offset waveform stack
// ════════════════════════════════════════════════════════════════════
function waveform() {
  ctx.fillStyle='rgba(248,253,249,0.25)'; ctx.fillRect(0,0,W,H);
  const layers = 8;
  for(let l=0;l<layers;l++){
    const offset = Math.floor((l/layers)*timeData.length*0.3);
    const yBase = (l/(layers-1))*H*0.85 + H*0.075;
    const amp = (H/(layers*1.6)) * (0.4+rms*1.6);
    const hue = 120+(l/layers)*180;
    ctx.beginPath();
    ctx.strokeStyle=`hsla(${hue},75%,40%,${0.3+l/layers*0.55})`;
    ctx.lineWidth=1+rms*2;
    for(let i=0;i<timeData.length;i++){
      const idx=(i+offset)%timeData.length;
      const x=(i/timeData.length)*W;
      const y=yBase+(timeData[idx]/128-1)*amp;
      i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
    }
    ctx.stroke();
  }
  // Center mirror bold line
  ctx.beginPath(); ctx.strokeStyle=`rgba(34,197,94,${0.6+rms*0.4})`; ctx.lineWidth=2;
  for(let i=0;i<timeData.length;i++){
    const x=(i/timeData.length)*W;
    const y=H/2+(timeData[i]/128-1)*H*0.38*(0.3+rms*1.2);
    i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
  }
  ctx.stroke();
}

// ════════════════════════════════════════════════════════════════════
// 03 · MANDALA, n-fold radial symmetry
// ════════════════════════════════════════════════════════════════════
function mandala() {
  ctx.fillStyle='rgba(248,253,249,0.14)'; ctx.fillRect(0,0,W,H);
  const cx=W/2,cy=H/2;
  const baseR=Math.min(W,H)*0.1;
  const maxR=Math.min(W,H)*0.45;
  const sym = 8;
  const bars=120;
  for(let s=0;s<sym;s++){
    ctx.save(); ctx.translate(cx,cy); ctx.rotate((s/sym)*Math.PI*2);
    for(let i=0;i<bars;i++){
      const idx=Math.floor(i*bufLen*0.55/bars);
      const v=freqData[idx]/255;
      const angle=(i/bars)*Math.PI*2/sym;
      const r=baseR+v*(maxR-baseR);
      ctx.save(); ctx.rotate(angle);
      ctx.strokeStyle=freqColor(i+s*20,bars+60,0.5+v*0.5);
      ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(0,baseR); ctx.lineTo(0,r); ctx.stroke();
      if(v>0.4){
        ctx.beginPath(); ctx.arc(0,r,1.5,0,Math.PI*2);
        ctx.fillStyle=freqColor(i+s*20,bars+60,1); ctx.fill();
      }
      ctx.restore();
    }
    // inner waveform
    ctx.beginPath();
    const wR=baseR*0.65;
    for(let i=0;i<Math.floor(timeData.length/sym);i++){
      const a=(i/(timeData.length/sym))*Math.PI*2/sym - Math.PI/2;
      const r=wR+(timeData[i]/128-1)*10;
      const x=Math.cos(a)*r, y=Math.sin(a)*r;
      i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
    }
    ctx.strokeStyle=`rgba(34,197,94,0.55)`; ctx.lineWidth=1; ctx.stroke();
    ctx.restore();
  }
  // center
  ctx.beginPath(); ctx.arc(cx,cy,3+rms*8,0,Math.PI*2);
  ctx.strokeStyle='#1a5c2e'; ctx.lineWidth=1.5; ctx.stroke();
}

// ════════════════════════════════════════════════════════════════════
// 04 · 31-EDO RING
// ════════════════════════════════════════════════════════════════════
function edo() {
  ctx.fillStyle='rgba(248,253,249,0.22)'; ctx.fillRect(0,0,W,H);
  const cx=W/2,cy=H/2;
  const R=Math.min(W,H)*0.34;
  const stepE=new Float32Array(EDO);
  const bins=Math.floor(bufLen*0.6);
  for(let i=2;i<bins;i++){
    const freq=i*(audioCtx ? audioCtx.sampleRate : 44100)/analyser.fftSize;
    const s=freqToEdo(freq);
    stepE[s]+=freqData[i];
  }
  const maxE=Math.max(...stepE,1);
  // Track
  ctx.beginPath(); ctx.arc(cx,cy,R,0,Math.PI*2);
  ctx.strokeStyle='#b0d8b8'; ctx.lineWidth=1; ctx.stroke();
  // Spokes
  const active=[];
  for(let s=0;s<EDO;s++){
    const a=(s/EDO)*Math.PI*2-Math.PI/2;
    const e=stepE[s]/maxE;
    const iR=R*0.28, sR=iR+e*(R-iR)*0.88;
    const col=freqColor(s,EDO);
    ctx.strokeStyle=col; ctx.lineWidth=e>0.15?2:0.8;
    ctx.globalAlpha=0.28+e*0.72;
    ctx.beginPath();
    ctx.moveTo(cx+Math.cos(a)*iR,cy+Math.sin(a)*iR);
    ctx.lineTo(cx+Math.cos(a)*sR,cy+Math.sin(a)*sR);
    ctx.stroke();
    if(e>0.18){
      ctx.beginPath(); ctx.arc(cx+Math.cos(a)*sR,cy+Math.sin(a)*sR,2+e*5,0,Math.PI*2);
      ctx.strokeStyle=col; ctx.lineWidth=1; ctx.stroke();
      active.push({s,e,x:cx+Math.cos(a)*sR,y:cy+Math.sin(a)*sR,col,a});
    }
    // step labels
    const lr=R+15;
    ctx.font=`${e>0.3?'bold ':''} 9px "Share Tech Mono"`;
    ctx.fillStyle=e>0.18?col:'#b0d8b8';
    ctx.globalAlpha=e>0.1?0.45+e*0.55:0.28;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(s, cx+Math.cos(a)*lr, cy+Math.sin(a)*lr);
  }
  ctx.globalAlpha=1;
  // Polygon
  if(active.length>=2){
    const sorted=[...active].sort((a,b)=>a.s-b.s);
    ctx.beginPath(); sorted.forEach((p,i)=>i===0?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y));
    ctx.closePath(); ctx.strokeStyle='rgba(34,197,94,0.45)'; ctx.lineWidth=1.2; ctx.stroke();
    sorted.forEach(p=>{ ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(p.x,p.y); ctx.strokeStyle=p.col; ctx.lineWidth=0.7; ctx.globalAlpha=p.e*0.35; ctx.stroke(); });
  }
  ctx.globalAlpha=1;
  // Center pulse
  const pr=7+(bass/255)*22;
  ctx.beginPath(); ctx.arc(cx,cy,pr,0,Math.PI*2);
  ctx.strokeStyle='#22c55e'; ctx.lineWidth=1.5; ctx.stroke();
  // Note labels
  [...active].sort((a,b)=>b.e-a.e).slice(0,5).forEach(p=>{
    const lr=R+30;
    ctx.font='bold 10px "Share Tech Mono"';
    ctx.fillStyle=p.col; ctx.globalAlpha=p.e;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(SHORT[p.s], cx+Math.cos(p.a)*lr, cy+Math.sin(p.a)*lr);
  });
  ctx.globalAlpha=1;
}

// ════════════════════════════════════════════════════════════════════
// 05 · PARTICLES, beat-spawned frequency-colored particles
// ════════════════════════════════════════════════════════════════════
function drawParticles() {
  ctx.fillStyle='rgba(248,253,249,0.18)'; ctx.fillRect(0,0,W,H);
  const cx=W/2,cy=H/2;
  // Spawn on energy
  const spawnCount=Math.floor(rms*40+bass/255*8);
  for(let i=0;i<spawnCount;i++){
    const idx=Math.floor(Math.random()*bufLen*0.7);
    const v=freqData[idx]/255;
    if(v<0.15) continue;
    const angle=Math.random()*Math.PI*2;
    const speed=(0.5+v*4)*( (bass/180)>1?1.6:1 );
    const hue=120+(idx/bufLen)*220;
    particles.push({
      x:cx,y:cy,
      vx:Math.cos(angle)*speed,
      vy:Math.sin(angle)*speed,
      life:1, decay:0.012+Math.random()*0.018,
      size:1+v*4,
      hue, sat:75, lit:38+v*20,
      trail:[]
    });
  }
  if(particles.length>1800) particles.splice(0,particles.length-1800);
  // Update & draw
  particles.forEach((p,i)=>{
    p.trail.push({x:p.x,y:p.y});
    if(p.trail.length>8) p.trail.shift();
    p.x+=p.vx; p.y+=p.vy;
    p.vx*=0.97; p.vy*=0.97;
    p.vy+=0.04;
    p.life-=p.decay;
    // Trail
    if(p.trail.length>1){
      ctx.beginPath();
      ctx.moveTo(p.trail[0].x,p.trail[0].y);
      p.trail.forEach(t=>ctx.lineTo(t.x,t.y));
      ctx.strokeStyle=`hsla(${p.hue},${p.sat}%,${p.lit}%,${p.life*0.4})`;
      ctx.lineWidth=p.size*0.5; ctx.stroke();
    }
    // Dot
    ctx.beginPath(); ctx.arc(p.x,p.y,Math.max(0,p.size*p.life),0,Math.PI*2); // BLUE PHONE: v2 a fading particle could reach a negative radius and throw
    ctx.fillStyle=`hsla(${p.hue},${p.sat}%,${p.lit}%,${p.life})`;
    ctx.fill();
  });
  particles=particles.filter(p=>p.life>0 && p.x>-50 && p.x<W+50 && p.y>-50 && p.y<H+50);
  // Ring
  ctx.beginPath(); ctx.arc(cx,cy,20+bass/255*30,0,Math.PI*2);
  ctx.strokeStyle=`rgba(34,197,94,${0.3+rms*0.5})`; ctx.lineWidth=1.5; ctx.stroke();
}

// ════════════════════════════════════════════════════════════════════
// 06 · LISSAJOUS, XY scope figure driven by stereo-ish FFT bins
// ════════════════════════════════════════════════════════════════════
function lissajous() {
  ctx.fillStyle='rgba(248,253,249,0.08)'; ctx.fillRect(0,0,W,H);
  const cx=W/2,cy=H/2;
  const r=Math.min(W,H)*0.4;
  const steps=512;
  lissPhase+=0.003+rms*0.01;
  // Use different freq bands as X/Y modulation
  const bassNorm=bass/255, midNorm=mid/255, highNorm=high/255;
  const freqA=2+bassNorm*3, freqB=3+midNorm*4;
  ctx.beginPath();
  for(let i=0;i<steps;i++){
    const t=(i/steps)*Math.PI*2;
    const xMod=1+highNorm*0.4*Math.sin(t*7+lissPhase);
    const yMod=1+midNorm*0.3*Math.sin(t*5-lissPhase*1.3);
    const x=cx+Math.sin(freqA*t+lissPhase)*r*0.85*xMod;
    const y=cy+Math.sin(freqB*t)*r*0.85*yMod;
    // Color by angle
    const hue=120+(i/steps)*200+lissPhase*30;
    if(i===0){ ctx.moveTo(x,y); ctx.beginPath(); ctx.moveTo(x,y); }
    else {
      ctx.lineTo(x,y);
    }
  }
  ctx.closePath();
  // Gradient stroke (approximate with multiple short segments)
  ctx.strokeStyle=`hsla(${(120+lissPhase*20)%360},75%,40%,${0.5+rms*0.4})`;
  ctx.lineWidth=1.2+rms*2; ctx.stroke();
  // Overlay second figure with offset
  ctx.beginPath();
  for(let i=0;i<steps;i++){
    const t=(i/steps)*Math.PI*2;
    const x=cx+Math.sin((freqA+1)*t-lissPhase*0.7)*r*0.55;
    const y=cy+Math.sin(freqB*t+Math.PI/3)*r*0.55;
    i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
  }
  ctx.closePath();
  ctx.strokeStyle=`hsla(${(180+lissPhase*15)%360},70%,45%,${0.3+rms*0.3})`;
  ctx.lineWidth=1; ctx.stroke();
  // Center cross
  ctx.strokeStyle='rgba(26,92,46,0.3)'; ctx.lineWidth=0.5;
  ctx.beginPath(); ctx.moveTo(cx-10,cy); ctx.lineTo(cx+10,cy); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx,cy-10); ctx.lineTo(cx,cy+10); ctx.stroke();
}

// ════════════════════════════════════════════════════════════════════
// 07 · HEX GRID, frequency-reactive hexagonal grid
// ════════════════════════════════════════════════════════════════════
function hexgrid() {
  ctx.fillStyle='rgba(248,253,249,0.35)'; ctx.fillRect(0,0,W,H);
  const size=26;
  const cols=Math.ceil(W/(size*1.75))+1;
  const rows=Math.ceil(H/(size*1.52))+1;
  const t=performance.now()*0.0004;
  for(let row=0;row<rows;row++){
    for(let col=0;col<cols;col++){
      const offset=(col%2)*size*0.76;
      const cx=col*size*1.73;
      const cy=row*size*1.52+offset;
      // Map position to freq bin
      const binIdx=Math.floor((col/cols+row/rows)*0.5*bufLen*0.6);
      const e=freqData[Math.min(binIdx,bufLen-1)]/255;
      // Wobble radius
      const wobble=size*(0.3+e*0.65);
      const hue=120+(col/cols+row/rows)*0.5*200 + t*30;
      // Hex outline
      ctx.beginPath();
      for(let k=0;k<6;k++){
        const a=k*Math.PI/3+t*0.2*(col%2?1:-1);
        const px=cx+Math.cos(a)*wobble;
        const py=cy+Math.sin(a)*wobble;
        k===0?ctx.moveTo(px,py):ctx.lineTo(px,py);
      }
      ctx.closePath();
      ctx.strokeStyle=`hsla(${hue%360},72%,38%,${0.25+e*0.65})`;
      ctx.lineWidth=0.8+e*1.5;
      ctx.stroke();
      if(e>0.5){
        ctx.fillStyle=`hsla(${hue%360},72%,70%,${(e-0.5)*0.25})`;
        ctx.fill();
      }
    }
  }
}

// ════════════════════════════════════════════════════════════════════
// 08 · SPIRAL, frequency data wound into an Archimedean spiral
// ════════════════════════════════════════════════════════════════════
function spiral() {
  ctx.fillStyle='rgba(248,253,249,0.15)'; ctx.fillRect(0,0,W,H);
  const cx=W/2,cy=H/2;
  const turns=4;
  const points=freqData.length;
  const maxR=Math.min(W,H)*0.44;
  spiralAngle+=0.004+rms*0.012;
  ctx.beginPath();
  let px=0,py=0;
  for(let i=0;i<points;i++){
    const t=i/points;
    const baseR=t*maxR;
    const v=freqData[i]/255;
    const r=baseR*(0.6+v*0.5);
    const angle=t*turns*Math.PI*2+spiralAngle;
    const x=cx+Math.cos(angle)*r;
    const y=cy+Math.sin(angle)*r;
    const hue=120+t*220;
    if(i===0){ ctx.moveTo(x,y); px=x; py=y; }
    else {
      // Color segments
      ctx.strokeStyle=freqColor(i,points,0.5+v*0.5);
      ctx.lineWidth=0.8+v*2;
      ctx.beginPath(); ctx.moveTo(px,py); ctx.lineTo(x,y); ctx.stroke();
      // Node on high energy
      if(v>0.6){
        ctx.beginPath(); ctx.arc(x,y,1.5,0,Math.PI*2);
        ctx.fillStyle=freqColor(i,points,1); ctx.fill();
      }
      px=x; py=y;
    }
  }
  // Center dot
  ctx.beginPath(); ctx.arc(cx,cy,3+rms*6,0,Math.PI*2);
  ctx.fillStyle='#1a5c2e'; ctx.fill();
}

// ════════════════════════════════════════════════════════════════════
// 09 · NEURAL, branching lines growing from center like a neural net
// ════════════════════════════════════════════════════════════════════
function branches() {
  ctx.fillStyle='rgba(248,253,249,0.12)'; ctx.fillRect(0,0,W,H);
  const cx=W/2,cy=H/2;
  // Init branches
  if(branchState.length===0){
    for(let i=0;i<12;i++){
      const a=(i/12)*Math.PI*2;
      branchState.push({ x:cx,y:cy, a, len:0, gen:0,
        binStart:Math.floor(i/12*bufLen*0.6), hue:120+(i/12)*180 });
    }
  }
  const newBranches=[];
  branchState.forEach(b=>{
    const e=freqData[Math.min(b.binStart+Math.floor(b.len/3),bufLen-1)]/255;
    const speed=1+e*5;
    const jitter=(Math.random()-0.5)*0.15;
    b.a+=jitter;
    b.x+=Math.cos(b.a)*speed; b.y+=Math.sin(b.a)*speed;
    b.len+=speed;
    const hue=b.hue+e*40;
    ctx.strokeStyle=`hsla(${hue%360},72%,38%,${0.4+e*0.5})`;
    ctx.lineWidth=Math.max(0.4, (3-b.gen)*0.7+e*1.5);
    ctx.beginPath();
    ctx.moveTo(b.x-Math.cos(b.a)*speed, b.y-Math.sin(b.a)*speed);
    ctx.lineTo(b.x,b.y); ctx.stroke();
    // Spawn child branches on high energy
    if(e>0.55 && b.gen<3 && Math.random()<0.04){
      newBranches.push({
        x:b.x,y:b.y,a:b.a+(Math.random()>0.5?1:-1)*0.5,
        len:0,gen:b.gen+1,
        binStart:b.binStart+Math.floor(Math.random()*20),
        hue:b.hue+30
      });
    }
    // Kill if off screen or too long
    if(b.x<-20||b.x>W+20||b.y<-20||b.y>H+20||b.len>300) b.dead=true;
  });
  branchState=branchState.filter(b=>!b.dead);
  branchState.push(...newBranches);
  // Regrow on beat
  if(bass>beatHistory.reduce((a,c)=>a+c,0)/beatHistory.length*1.4 && branchState.length<80){
    for(let i=0;i<4;i++){
      const a=(i/4)*Math.PI*2+Math.random();
      branchState.push({x:cx,y:cy,a,len:0,gen:0,
        binStart:Math.floor(Math.random()*bufLen*0.4),hue:120+Math.random()*180});
    }
  }
  if(branchState.length>300) branchState.splice(0,50);
}

// ════════════════════════════════════════════════════════════════════
// 10 · RIBBON, flowing ribbon driven by waveform
// ════════════════════════════════════════════════════════════════════
function ribbon() {
  ctx.fillStyle='rgba(248,253,249,0.18)'; ctx.fillRect(0,0,W,H);
  const ribbonCount=6;
  for(let r=0;r<ribbonCount;r++){
    const yBase=(r/(ribbonCount-1))*H*0.78+H*0.11;
    const binStart=Math.floor(r/ribbonCount*bufLen*0.5);
    const width=12+freqData[binStart]/255*24;
    const hue=120+(r/ribbonCount)*200;
    // Build points from waveform
    const pts=[];
    const n=80;
    for(let i=0;i<n;i++){
      const idx=Math.floor(i/n*timeData.length);
      const v=(timeData[idx]/128-1);
      const x=(i/n)*W;
      const fBin=Math.floor(i/n*bufLen*0.5+binStart);
      const fe=freqData[Math.min(fBin,bufLen-1)]/255;
      const y=yBase+v*(30+fe*80);
      pts.push({x,y,e:fe});
    }
    // Upper edge
    ctx.beginPath();
    pts.forEach((p,i)=>{ const y=p.y-width*(0.5+p.e*0.5); i===0?ctx.moveTo(p.x,y):ctx.lineTo(p.x,y); });
    // Lower edge (reverse)
    for(let i=pts.length-1;i>=0;i--){ const p=pts[i]; const y=p.y+width*(0.5+p.e*0.5); ctx.lineTo(p.x,y); }
    ctx.closePath();
    ctx.fillStyle=`hsla(${hue%360},70%,55%,0.15)`;
    ctx.fill();
    ctx.strokeStyle=`hsla(${hue%360},75%,38%,0.65)`;
    ctx.lineWidth=1; ctx.stroke();
    // Spine
    ctx.beginPath();
    pts.forEach((p,i)=>i===0?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y));
    ctx.strokeStyle=`hsla(${hue%360},80%,30%,0.5)`;
    ctx.lineWidth=0.8; ctx.stroke();
  }
}

// ════════════════════════════════════════════════════════════════════
// 11 · CONSTELLATION, nodes connected by proximity, beat-reactive
// ════════════════════════════════════════════════════════════════════
function constellation() {
  ctx.fillStyle='rgba(248,253,249,0.14)'; ctx.fillRect(0,0,W,H);
  // Spawn nodes
  const target=60+Math.floor(rms*80);
  while(constellationNodes.length<target){
    const binIdx=Math.floor(Math.random()*bufLen*0.7);
    constellationNodes.push({
      x:Math.random()*W, y:Math.random()*H,
      vx:(Math.random()-0.5)*0.8, vy:(Math.random()-0.5)*0.8,
      bin:binIdx, life:1, decay:0.003+Math.random()*0.004,
      hue:120+Math.random()*200
    });
  }
  // On beat, burst
  const bmean=beatHistory.reduce((a,b)=>a+b,0)/beatHistory.length;
  if(bass>bmean*1.4){
    constellationNodes.forEach(n=>{ n.vx+=(Math.random()-0.5)*3; n.vy+=(Math.random()-0.5)*3; });
  }
  // Update
  constellationNodes.forEach(n=>{
    const e=freqData[n.bin]/255;
    n.x+=n.vx*(0.5+e*1.5); n.y+=n.vy*(0.5+e*1.5);
    n.vx*=0.99; n.vy*=0.99;
    if(n.x<0||n.x>W) n.vx*=-1;
    if(n.y<0||n.y>H) n.vy*=-1;
    n.life-=n.decay*(1-e*0.8);
  });
  constellationNodes=constellationNodes.filter(n=>n.life>0);
  // Connect nearby nodes
  const maxDist=80+rms*120;
  for(let i=0;i<constellationNodes.length;i++){
    const a=constellationNodes[i];
    const ea=freqData[a.bin]/255;
    for(let j=i+1;j<constellationNodes.length;j++){
      const b=constellationNodes[j];
      const dx=a.x-b.x, dy=a.y-b.y;
      const d=Math.sqrt(dx*dx+dy*dy);
      if(d<maxDist){
        const alpha=(1-d/maxDist)*0.5*a.life*b.life;
        ctx.beginPath();
        ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y);
        ctx.strokeStyle=`hsla(${(a.hue+b.hue)/2},72%,42%,${alpha})`;
        ctx.lineWidth=0.7+ea*1.2;
        ctx.stroke();
      }
    }
    // Draw node
    ctx.beginPath(); ctx.arc(a.x,a.y,1.5+ea*3,0,Math.PI*2);
    ctx.fillStyle=`hsla(${a.hue},75%,40%,${a.life})`;
    ctx.fill();
  }
}

// ════════════════════════════════════════════════════════════════════
// 12 · PENDULUM, multi-pendulum trace driven by frequency bands
// ════════════════════════════════════════════════════════════════════
function pendulum() {
  ctx.fillStyle='rgba(248,253,249,0.08)'; ctx.fillRect(0,0,W,H);
  const cx=W/2, pivotY=H*0.18;
  const arms=3;
  const armLen=[H*0.22, H*0.18, H*0.14];
  const bands=[bass,mid,high].map(v=>v/255);
  // Drive pendulum angles with frequency bands
  pendulumAngle.forEach((_,i)=>{
    pendulumVel[i]+=(bands[i]*0.08-0.04) * (Math.random()*0.3+0.85);
    pendulumAngle[i]+=pendulumVel[i];
    pendulumVel[i]*=0.97;
  });
  // Compute joint positions
  const joints=[{x:cx,y:pivotY}];
  let x=cx,y=pivotY;
  for(let i=0;i<arms;i++){
    x+=Math.sin(pendulumAngle[i])*armLen[i];
    y+=Math.cos(pendulumAngle[i])*armLen[i];
    joints.push({x,y});
  }
  const tip=joints[joints.length-1];
  // Record tip trail
  if(!pendulumTrail) window.pendulumTrail=[];
  window.pendulumTrail.push({x:tip.x,y:tip.y,hue:120+bands[0]*180,e:rms});
  if(window.pendulumTrail.length>600) window.pendulumTrail.shift();
  // Draw trail
  if(window.pendulumTrail.length>1){
    const trail=window.pendulumTrail;
    for(let i=1;i<trail.length;i++){
      const alpha=(i/trail.length)*0.8;
      ctx.beginPath();
      ctx.moveTo(trail[i-1].x,trail[i-1].y);
      ctx.lineTo(trail[i].x,trail[i].y);
      ctx.strokeStyle=`hsla(${trail[i].hue},72%,38%,${alpha})`;
      ctx.lineWidth=0.8+trail[i].e*2;
      ctx.stroke();
    }
  }
  // Draw arms
  for(let i=0;i<arms;i++){
    const hue=120+i*60;
    ctx.strokeStyle=`hsla(${hue},70%,38%,0.7)`;
    ctx.lineWidth=1.5;
    ctx.beginPath();
    ctx.moveTo(joints[i].x,joints[i].y);
    ctx.lineTo(joints[i+1].x,joints[i+1].y);
    ctx.stroke();
    // Joint dot
    ctx.beginPath(); ctx.arc(joints[i].x,joints[i].y,3,0,Math.PI*2);
    ctx.fillStyle=`hsla(${hue},72%,38%,0.8)`; ctx.fill();
  }
  // Pivot
  ctx.beginPath(); ctx.arc(cx,pivotY,5,0,Math.PI*2);
  ctx.fillStyle='#1a5c2e'; ctx.fill();
  // Tip dot
  ctx.beginPath(); ctx.arc(tip.x,tip.y,4+rms*8,0,Math.PI*2);
  ctx.strokeStyle='#22c55e'; ctx.lineWidth=1.5; ctx.stroke();
}

const DRAW={spectrum,waveform,mandala,edo,particles:drawParticles,lissajous,hexgrid,spiral,branches,ribbon,constellation,pendulum};
const draw=DRAW[MODE_ID]||spectrum;
/* These modes keep nothing from one frame to the next, so while catching up they can skip the work. */
const STATELESS={spectrum:1,waveform:1,mandala:1,edo:1};
function frame(){
  requestAnimationFrame(frame);
  if(window.__skip&&STATELESS[MODE_ID])return;
  analyzeFrame();
  ctx.setTransform(DPR,0,0,DPR,0,0);
  draw();
}
requestAnimationFrame(frame);
})();
