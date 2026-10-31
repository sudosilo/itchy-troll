(function(){
const SRC='https://raw.githubusercontent.com/sudosilo/free-as-in-links/main/index.html';
const cv=document.getElementById('cv'),ctx=VZ.wire(cv.getContext('2d')),MOTION=VZ.MOTION;
const countEl=document.getElementById('count');
countEl.textContent='loading links...';
fetch(SRC).then(r=>r.text()).then(src=>{
  const i=src.indexOf('var DATA = ')+11,j=src.indexOf('\n',i);
  start(JSON.parse(src.slice(i,j).trim().replace(/;$/,'')));
}).catch(()=>{countEl.textContent='links did not load, try again';});

function start(DATA){
  const cats=DATA.map((c,k)=>({name:c[1],col:'hsl('+Math.round(k*360/DATA.length)+',62%,'+(k%2?42:36)+'%)'}));
  const links=[];DATA.forEach((c,k)=>c[2].forEach(m=>links.push({title:m[0],url:m[1],cat:k})));
  countEl.textContent=links.length.toLocaleString()+' links in '+cats.length+' categories, raining';
  let W,H,DPR,T,HZ,N,drops=[],ripples=[],mist=[],filter=-1;
  const pick=()=>{let l;do{l=links[Math.floor(Math.random()*links.length)];}while(filter>=0&&l.cat!==filter);return l;};
  function spawn(d,first){d.l=pick();d.sz=0.75+Math.random()*0.6;d.x=W*(0.04+0.92*Math.random());d.depth=Math.random();d.land=HZ+(H-HZ)*(0.08+0.88*d.depth);d.y=first?-Math.random()*H:-20*T-Math.random()*H*0.5;d.vy=0;d.wob=Math.random()*6;d.v=0.5+Math.random()*0.5;}
  function resize(){DPR=Math.min(devicePixelRatio||1,2);W=innerWidth;H=innerHeight;cv.width=W*DPR;cv.height=H*DPR;T=Math.max(0.85,Math.min(1.4,Math.min(W,H)/380));HZ=H*0.62;
    N=Math.max(80,Math.min(260,Math.round(W*H/2600)));drops=[...Array(N)].map(()=>{const d={};spawn(d,true);return d;});
    mist=[...Array(60)].map(()=>({x:Math.random()*W,y:Math.random()*HZ,l:(6+Math.random()*10)*T}));}
  function scene(t){
    ctx.strokeStyle='rgba(79,111,124,.5)';ctx.lineWidth=1;
    for(let i=0;i<5;i++){const x=((i*W*0.31+t*6*T*(1+i*0.2))%(W+200))-100,y=H*(0.06+0.05*i),s=T*(1.2+0.3*(i%3));ctx.beginPath();ctx.ellipse(x,y,40*s,12*s,0,0,6.283);ctx.stroke();ctx.beginPath();ctx.ellipse(x+26*s,y-8*s,24*s,14*s,0,0,6.283);ctx.stroke();}
    ctx.beginPath();for(let x=0;x<=W;x+=10)ctx.lineTo(x,HZ-12*T-8*T*Math.sin(x*0.013+1)-5*T*Math.sin(x*0.031));ctx.stroke();
    ctx.strokeStyle='rgba(79,111,124,.22)';for(let k=0;k<14;k++){const y=HZ+(H-HZ)*Math.pow(k/14,1.6)+2;ctx.beginPath();for(let x=0;x<=W;x+=12)ctx.lineTo(x,y+Math.sin(x*0.02+t*0.8+k)*1.2*T*(1+k*0.1));ctx.stroke();}
    ctx.strokeStyle='rgba(120,140,155,.35)';for(const m of mist){m.y+=260*T*0.016*MOTION;if(m.y>HZ)m.y=-m.l;ctx.beginPath();ctx.moveTo(m.x,m.y);ctx.lineTo(m.x-m.l*0.15,m.y+m.l);ctx.stroke();}
  }
  function legend(){
    const fs=10*T;ctx.font='600 '+fs+'px "Avenir Next","Segoe UI",Roboto,Helvetica,Arial,sans-serif';ctx.textAlign='left';
    const cols=W>700?4:2,cw=(W-28)/cols,y0=H-((Math.ceil(cats.length/cols))*fs*1.5)-10;
    cats.forEach((c,k)=>{const x=14+(k%cols)*cw,y=y0+Math.floor(k/cols)*fs*1.5;c._x=x;c._y=y;c._w=cw;c._h=fs*1.5;
      ctx.globalAlpha=filter<0||filter===k?1:0.35;ctx.fillStyle=c.col;ctx.beginPath();ctx.arc(x+4,y-fs*0.35,3.5,0,6.283);ctx.fill();ctx.fillStyle='#123a4a';ctx.fillText(c.name,x+12,y);});
    ctx.globalAlpha=1;
  }
  function drop(d,s){const x=d.x,y=d.y,r=4.2*T*d.sz*s,c=cats[d.l.cat].col;
    ctx.strokeStyle=c;ctx.lineWidth=1.1;ctx.beginPath();ctx.moveTo(x,y-r*2.4);ctx.bezierCurveTo(x+r*0.9,y-r*0.9,x+r,y+r*0.2,x,y+r);ctx.bezierCurveTo(x-r,y+r*0.2,x-r*0.9,y-r*0.9,x,y-r*2.4);ctx.stroke();
    d._x=x;d._y=y-r*0.5;d._r=r*2;}
  let last=performance.now();
  function frame(now){
    const dt=Math.min(0.05,(now-last)/1000)*MOTION,t=now/1000;last=now;
    ctx.setTransform(DPR,0,0,DPR,0,0);ctx.bg('#eef3f5',W,H);scene(t);
    for(const r of ripples){r.age+=dt;const k=r.age/r.dur;for(let i=0;i<3;i++){const kk=k-i*0.18;if(kk<=0||kk>=1)continue;const R=r.max*kk;ctx.globalAlpha=(1-kk)*0.9;ctx.strokeStyle=r.col;ctx.lineWidth=Math.max(0.8,1.8*T*r.s*(1-kk));ctx.beginPath();ctx.ellipse(r.x,r.y,R,R*0.32,0,0,6.283);ctx.stroke();}}
    ctx.globalAlpha=1;ripples=ripples.filter(r=>r.age<r.dur);
    drops.sort((a,b)=>a.depth-b.depth);
    for(const d of drops){d.vy=Math.min(d.vy+900*T*dt,(220+260*d.v)*T*(0.6+0.4*d.depth));d.y+=d.vy*dt;d.x+=Math.sin(t*1.3+d.wob)*6*T*dt;const s=0.6+0.5*d.depth;
      if(d.y>=d.land){ripples.push({x:d.x,y:d.land,age:0,dur:1.4+d.sz*0.6,max:(16+14*d.sz)*T*s,col:cats[d.l.cat].col,s,l:d.l});if(VZ.sel&&VZ.sel.ref===d)VZ.sel.ref=null;spawn(d,false);continue;}
      drop(d,s);}
    legend();
    const sel=VZ.sel;if(sel&&sel.ref&&sel.ref._x!=null)VZ.selRing(ctx,sel.ref._x,sel.ref._y,Math.max(12,sel.ref._r));
    requestAnimationFrame(frame);
  }
  cv.addEventListener('pointerdown',e=>{const X=e.clientX,Y=e.clientY;
    for(let k=0;k<cats.length;k++){const c=cats[k];if(c._x!=null&&X>=c._x&&X<c._x+c._w&&Y>c._y-c._h&&Y<c._y+c._h*0.3){filter=filter===k?-1:k;drops.forEach(d=>{if(filter>=0&&d.l.cat!==filter)d.l=pick();});return;}}
    let best=null,bd=1e9;for(const d of drops){if(d._x==null||d.y<0)continue;const k=Math.hypot(X-d._x,Y-d._y);if(k<Math.max(d._r*1.5,18)&&k<bd){bd=k;best=d;}}
    let link=best&&best.l;
    if(!best)for(const r of ripples){const k=Math.hypot(X-r.x,(Y-r.y)*3);if(k<r.max&&k<bd){bd=k;link=r.l;}}
    if(link){const host=link.url.replace(/^https?:\/\//,'').replace(/\/$/,'');VZ.open({ref:best,title:link.title,kind:cats[link.cat].name,age:'',host});}else VZ.close();});
  addEventListener('resize',resize);resize();requestAnimationFrame(frame);
}
})();
