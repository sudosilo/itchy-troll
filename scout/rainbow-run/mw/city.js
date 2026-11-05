VZ.load(P=>{
const {h32,poly,line,box,ring,label,INK,MOTION}=VZ;
const cv=document.getElementById('cv'),ctx=cv.getContext('2d');
const BT={tanker:{label:'Skyscraper, one of the biggest',h:1,fw:1},battle:{label:'Glass tower, big and fast',h:0.78,fw:0.9},speed:{label:'Slim tower, small and quick',h:0.62,fw:0.6},cargo:{label:'Office block, big and steady',h:0.4,fw:1},sail:{label:'Shop, light and easy',h:0.14,fw:0.85},tug:{label:'Brownstone, small and nimble',h:0.09,fw:0.7}};
const BG='#f7f9fa',GROUND='#f1efe6';
let W,H,DPR,T,blds=[],trees=[],cars=[],streets={v:[],h:[]},park=null;
document.getElementById('count').textContent=P.filter(p=>!p.old).length+' buildings, '+P.filter(p=>p.old).length+' under construction';
function layout(){
  const SW=9*T,TOP=82,C=W>700?7:4,bw=(W-(C+1)*SW)/C,bh=bw*0.82,R=Math.floor((H-TOP-SW)/(bh+SW));
  streets={v:[],h:[]};for(let c=0;c<=C;c++)streets.v.push(SW/2+c*(bw+SW));for(let r=0;r<=R;r++)streets.h.push(TOP+SW/2+r*(bh+SW));
  const pr=Math.floor(R/2)-1,pc=Math.floor(C/2)-1;park={x:streets.v[pc]+SW/2,y:streets.h[pr]+SW/2,w:2*bw+SW,h:2*bh+SW};
  const lots=[];for(let r=0;r<R;r++)for(let c=0;c<C;c++){if(r>=pr&&r<pr+2&&c>=pc&&c<pc+2)continue;const bx=streets.v[c]+SW/2,by=streets.h[r]+SW/2;
    for(let i=0;i<2;i++)for(let j=0;j<3;j++)lots.push({x:bx+i*bw/2+1.5,y:by+j*bh/3+1.5,w:bw/2-3,h:bh/3-3});}
  const cx=W/2,cy=TOP+(H-TOP)*0.42;lots.forEach(l=>{l.d=Math.hypot(l.x+l.w/2-cx,(l.y+l.h/2-cy)*1.2)+h32('lt'+l.x+l.y,1)*40;});lots.sort((a,b)=>a.d-b.d);
  const ps=P.slice().sort((a,b)=>(BT[b.kind].h*b.sizeF)-(BT[a.kind].h*a.sizeF));
  blds=[];trees=[];
  lots.forEach((l,i)=>{const p=ps[i];
    if(p){const bt=BT[p.kind],fw=bt.fw,w=l.w*fw,h=l.h*Math.min(1,fw+0.1);blds.push({p,x:l.x+(l.w-w)/2,y:l.y+(l.h-h)/2,w,h,ht:bt.h*Math.min(1.3,p.sizeF)*(0.9+h32(p.name,85)*0.2),seed:h32(p.name,86)});}
    else if(h32('lf'+i,2)<0.55)blds.push({x:l.x+1,y:l.y+1,w:l.w-2,h:l.h-2,ht:0.06+h32('lh'+i,3)*0.3,filler:true,seed:h32('ls'+i,4)});
    else for(let k=0;k<3;k++)trees.push({x:l.x+l.w*(0.2+k*0.3),y:l.y+l.h*(0.35+0.3*(k%2)),r:(3+h32('tr'+i+k,5)*2)*T});});
  for(let k=0;k<40;k++)trees.push({x:park.x+8+h32('pt'+k,1)*(park.w-16),y:park.y+8+h32('pu'+k,2)*(park.h-16),r:(3+h32('pr'+k,3)*4)*T});
  for(let k=0;k<60;k++){const vert=k%2,arr=vert?streets.v:streets.h,idx=Math.floor(h32('s'+k,6)*arr.length),along=h32('sa'+k,7);const side=h32('sd'+k,8)>0.5?1:-1;trees.push({x:vert?arr[idx]+side*SW*0.7:along*W,y:vert?TOP+along*(H-TOP):arr[idx]+side*SW*0.7,r:2.2*T,street:1});}
  const cv2=streets.v.filter((x,i)=>i!==pc+1),ch2=streets.h.filter((y,i)=>i!==pr+1);cars=[];for(let k=0;k<44;k++){const vert=k%2,arr=vert?cv2:ch2;cars.push({vert,line:arr[Math.floor(h32('c'+k,1)*arr.length)],dir:h32('cd'+k,2)>0.5?1:-1,s:h32('cs'+k,3),v:0.03+h32('cv'+k,4)*0.04,taxi:h32('ct'+k,5)<0.4});}
  blds.sort((a,b)=>a.ht-b.ht);
  const vx=W/2,vy=TOP+(H-TOP)*0.5,K=Math.min(W,H)*0.0011;
  blds.forEach(b=>{const cxb=b.x+b.w/2,cyb=b.y+b.h/2;b.ox=(cxb-vx)*b.ht*0.2;b.oy=(cyb-vy)*b.ht*0.2;});
  ctxBase=null;
}
let ctxBase=null;
function resize(){DPR=Math.min(window.devicePixelRatio||1,2);W=innerWidth;H=innerHeight;cv.width=W*DPR;cv.height=H*DPR;T=Math.max(0.85,Math.min(1.3,Math.min(W,H)/360));layout();buildBase();}
function buildBase(){
  ctxBase=document.createElement('canvas');ctxBase.width=W*DPR;ctxBase.height=H*DPR;const g=ctxBase.getContext('2d');g.scale(DPR,DPR);
  g.fillStyle=BG;g.fillRect(0,0,W,H);g.fillStyle=GROUND;
  g.strokeStyle='rgba(18,58,74,.25)';g.lineWidth=1;g.setLineDash([5,6]);
  for(const x of streets.v){g.beginPath();g.moveTo(x,0);g.lineTo(x,H);g.stroke();}for(const y of streets.h){g.beginPath();g.moveTo(0,y);g.lineTo(W,y);g.stroke();}g.setLineDash([]);
  g.fillStyle='#f0f4e6';g.fillRect(park.x,park.y,park.w,park.h);g.strokeStyle='#7f9f72';g.lineWidth=1.2;g.strokeRect(park.x,park.y,park.w,park.h);
  g.strokeStyle='#8fb8c4';g.beginPath();g.ellipse(park.x+park.w*0.62,park.y+park.h*0.4,park.w*0.16,park.h*0.12,0.3,0,6.283);g.stroke();
  g.strokeStyle='rgba(138,117,80,.6)';g.beginPath();g.moveTo(park.x,park.y+park.h*0.7);g.bezierCurveTo(park.x+park.w*0.3,park.y+park.h*0.4,park.x+park.w*0.5,park.y+park.h*0.95,park.x+park.w,park.y+park.h*0.6);g.moveTo(park.x+park.w*0.2,park.y);g.bezierCurveTo(park.x+park.w*0.35,park.y+park.h*0.4,park.x+park.w*0.1,park.y+park.h*0.6,park.x+park.w*0.3,park.y+park.h);g.stroke();
  for(const tr of trees){g.strokeStyle='#7f9f72';g.lineWidth=1.1;g.beginPath();g.arc(tr.x,tr.y,tr.r,0,6.283);g.stroke();g.beginPath();g.arc(tr.x,tr.y,0.7,0,6.283);g.stroke();}
}
function face(c,a,b2,col,fill){c.beginPath();c.moveTo(a[0],a[1]);c.lineTo(b2[0],b2[1]);c.lineTo(b2[2],b2[3]);c.lineTo(a[2],a[3]);c.closePath();c.fillStyle=fill;c.fill();c.strokeStyle=col;c.stroke();}
function drawB(c,b,t){
  const col=b.filler?'rgba(18,58,74,.4)':b.p.color,ox=b.ox,oy=b.oy,x=b.x,y=b.y,w=b.w,h=b.h;
  const base=[[x,y],[x+w,y],[x+w,y+h],[x,y+h]];const old=b.p&&b.p.old;const k=old?0.45:1;
  const roof=base.map(q=>[q[0]+ox*k,q[1]+oy*k]);c.lineWidth=b.filler?0.9:1.1;c.lineJoin='round';
  if(old){c.setLineDash([3,3]);}
  for(let i=0;i<4;i++){const j=(i+1)%4;c.beginPath();c.moveTo(base[i][0],base[i][1]);c.lineTo(base[j][0],base[j][1]);c.lineTo(roof[j][0],roof[j][1]);c.lineTo(roof[i][0],roof[i][1]);c.closePath();c.fillStyle=BG;c.fill();c.strokeStyle=col;c.globalAlpha=0.75;c.stroke();c.globalAlpha=1;
    if(!b.filler&&b.ht>0.35&&!old)for(const f of [0.25,0.5,0.75]){const a1=[base[i][0]+ox*f,base[i][1]+oy*f],a2=[base[j][0]+ox*f,base[j][1]+oy*f];c.globalAlpha=0.35;line(c,a1[0],a1[1],a2[0],a2[1],col);c.globalAlpha=1;}}
  c.beginPath();roof.forEach((q,i)=>{if(i)c.lineTo(q[0],q[1]);else c.moveTo(q[0],q[1]);});c.closePath();c.fillStyle=BG;c.fill();c.strokeStyle=col;c.stroke();c.setLineDash([]);
  const rx=x+ox*k,ry=y+oy*k;b.rx=rx;b.ry=ry;
  if(b.filler)return;
  if(old){const a=t*0.3+b.seed*6,mx=rx+w*0.2,my=ry+h*0.2,L=Math.max(w,h)*1.3;line(c,mx-Math.cos(a)*L*0.25,my-Math.sin(a)*L*0.25,mx+Math.cos(a)*L,my+Math.sin(a)*L,col);ring(c,mx,my,2*T,col);line(c,x,y,x+w,y+h,col);line(c,x+w,y,x,y+h,col);return;}
  const kd=b.p.kind;
  if(kd==='tanker'){box(c,rx+w*0.18,ry+h*0.18,rx+w*0.82,ry+h*0.82,col);ring(c,rx+w/2,ry+h/2,Math.min(w,h)*0.22,col);line(c,rx+w/2-2,ry+h/2-3,rx+w/2-2,ry+h/2+3,col);line(c,rx+w/2+2,ry+h/2-3,rx+w/2+2,ry+h/2+3,col);line(c,rx+w/2-2,ry+h/2,rx+w/2+2,ry+h/2,col);if(Math.sin(t*3+b.seed*9)>0.5)ring(c,rx+w*0.85,ry+h*0.15,1.6*T,'#d93636');}
  else if(kd==='battle'){line(c,rx,ry,rx+w,ry+h,col);line(c,rx+w*0.5,ry,rx+w,ry+h*0.5,col);}
  else if(kd==='speed'){ring(c,rx+w/2,ry+h/2,Math.min(w,h)*0.32,col);}
  else if(kd==='cargo'){for(let i=0;i<3;i++)box(c,rx+w*(0.12+i*0.28),ry+h*0.3,rx+w*(0.3+i*0.28),ry+h*0.65,col);}
  else if(kd==='sail'){for(let i=1;i<4;i++)line(c,rx+w*i/4,ry,rx+w*i/4,ry+h*0.25,col);}
  else{box(c,rx+w*0.65,ry+h*0.15,rx+w*0.85,ry+h*0.4,col);}
}
let last=performance.now();
function frame(now){
  const dt=Math.min(0.05,(now-last)/1000)*MOTION,t=now/1000;last=now;
  ctx.setTransform(DPR,0,0,DPR,0,0);ctx.drawImage(ctxBase,0,0,W,H);
  for(const c of cars){c.s=(c.s+c.dir*c.v*dt+1)%1;const off=c.dir*3*T;const x=c.vert?c.line+off:c.s*W,y=c.vert?82+c.s*(H-82):c.line+off;ctx.save();ctx.translate(x,y);if(c.vert)ctx.rotate(Math.PI/2);ctx.lineWidth=1;box(ctx,-4*T,-1.8*T,4*T,1.8*T,c.taxi?'#c49a00':'rgba(18,58,74,.6)');line(ctx,c.dir*1.5*T,-1.8*T,c.dir*1.5*T,1.8*T,c.taxi?'#c49a00':'rgba(18,58,74,.6)');ctx.restore();}
  for(const b of blds)drawB(ctx,b,t);
  label(ctx,'Park',park.x+park.w/2,park.y+park.h-6*T,'center',10*T);
  const s=VZ.sel;if(s&&s.ref){const b=s.ref;ctx.strokeStyle=INK;ctx.lineWidth=2;ctx.setLineDash([5,4]);ctx.strokeRect(b.rx-4,b.ry-4,b.w+8,b.h+8);ctx.setLineDash([]);}
  requestAnimationFrame(frame);
}
cv.addEventListener('pointerdown',e=>{const X=e.clientX,Y=e.clientY;let best=null;
  for(let i=blds.length-1;i>=0;i--){const b=blds[i];if(b.filler||b.rx==null)continue;if(X>=b.rx-3&&X<=b.rx+b.w+3&&Y>=b.ry-3&&Y<=b.ry+b.h+3){best=b;break;}}
  if(best){const p=best.p;VZ.open({ref:best,title:p.name,kind:(p.old?'Under construction, 90 days or more':BT[p.kind].label)+VZ.sizeText(p),age:VZ.ageText(p),host:p.host});}else VZ.close();});
addEventListener('resize',resize);resize();requestAnimationFrame(frame);
});
