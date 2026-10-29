VZ.load(P=>{
const {h32,poly,line,box,ring,label,INK,MUTED,MOTION}=VZ;
const SCENE=document.body.dataset.scene||'cats';
const cv=document.getElementById('cv'),ctx=cv.getContext('2d');
const SPECIES={
 cats:{
  tanker:{label:'Lion, one of the biggest',L:48,bl:.55,bh:.22,ll:.26,nl:.08,na:.9,hl:.17,hh:.14,sn:.05,ear:'round',tail:'tuft',ex:['mane'],v:12},
  battle:{label:'Cheetah, big and fast',L:40,bl:.55,bh:.15,ll:.3,nl:.07,na:.7,hl:.12,hh:.09,sn:.03,ear:'round',tail:'long',ex:['spots'],v:42},
  cargo:{label:'Tiger, big and steady',L:44,bl:.58,bh:.2,ll:.24,nl:.07,na:.7,hl:.15,hh:.12,sn:.04,ear:'round',tail:'long',ex:['stripes'],v:15},
  tug:{label:'Kitten, small and nimble',L:14,bl:.45,bh:.2,ll:.2,nl:.05,na:1,hl:.22,hh:.19,sn:.02,ear:'pointy',tail:'up',ex:[],v:18,hop:1},
  speed:{label:'Tabby cat, small and quick',L:20,bl:.5,bh:.17,ll:.22,nl:.05,na:1,hl:.17,hh:.14,sn:.02,ear:'pointy',tail:'up',ex:['stripes'],v:26,zoom:1},
  sail:{label:'Persian cat, light and easy',L:21,bl:.5,bh:.24,ll:.15,nl:.05,na:1,hl:.19,hh:.17,sn:0,ear:'pointy',tail:'bushy',ex:['fluff'],v:9}
 },
 dogs:{
  tanker:{label:'Great Dane, one of the biggest',L:44,bl:.5,bh:.18,ll:.36,nl:.14,na:1,hl:.2,hh:.1,sn:.1,ear:'flop',tail:'wag',ex:['collar'],v:16},
  battle:{label:'Greyhound, big and fast',L:38,bl:.5,bh:.14,ll:.34,nl:.14,na:.8,hl:.18,hh:.07,sn:.1,ear:'fold',tail:'long',ex:['collar'],v:46},
  cargo:{label:'Saint Bernard, big and steady',L:42,bl:.55,bh:.25,ll:.24,nl:.08,na:.8,hl:.2,hh:.14,sn:.06,ear:'flop',tail:'bushy',ex:['patches','collar'],v:11},
  tug:{label:'Jack Russell, small and nimble',L:18,bl:.5,bh:.18,ll:.22,nl:.07,na:1,hl:.17,hh:.1,sn:.07,ear:'fold',tail:'wag',ex:['patches','collar'],v:22,hop:1},
  speed:{label:'Corgi, small and quick',L:22,bl:.6,bh:.2,ll:.12,nl:.05,na:.9,hl:.18,hh:.12,sn:.07,ear:'pointy',tail:'short',ex:['collar'],v:30,zoom:1},
  sail:{label:'Dachshund, light and easy',L:24,bl:.7,bh:.14,ll:.1,nl:.06,na:.8,hl:.2,hh:.08,sn:.1,ear:'flop',tail:'long',ex:['collar'],v:13}
 },
 farm:{
  tanker:{label:'Cow, one of the biggest',L:46,bl:.6,bh:.28,ll:.26,nl:.06,na:.4,hl:.2,hh:.11,sn:.05,ear:'side',tail:'tuft',ex:['patches','horns'],v:6},
  battle:{label:'Horse, big and fast',L:44,bl:.55,bh:.2,ll:.36,nl:.2,na:1.05,hl:.22,hh:.08,sn:.06,ear:'pointy',tail:'horse',ex:['mane2'],v:28},
  cargo:{label:'Donkey, big and steady',L:36,bl:.5,bh:.2,ll:.28,nl:.14,na:.9,hl:.22,hh:.09,sn:.05,ear:'long',tail:'tuft',ex:['mane2'],v:9},
  tug:{label:'Goat, small and nimble',L:22,bl:.45,bh:.17,ll:.26,nl:.1,na:1.1,hl:.15,hh:.07,sn:.05,ear:'side',tail:'short',ex:['goathorns','beard'],v:14,hop:1},
  speed:{label:'Pig, small and quick',L:24,bl:.55,bh:.26,ll:.12,nl:.02,na:.3,hl:.16,hh:.13,sn:.05,ear:'pointy',tail:'curly',ex:['pignose'],v:18,zoom:1},
  sail:{label:'Sheep, light and easy',L:24,bl:.5,bh:.26,ll:.18,nl:.05,na:.6,hl:.14,hh:.08,sn:.04,ear:'side',tail:'short',ex:['wool'],v:8}
 }
};
const SC={cats:{rest:'Pride rock, 90 days or more',walk:' on the savanna, ',restWord:' napping on the rock',ground:'#f4ead2',sky:'#f7f9fa'},
 dogs:{rest:'Beach towels, 90 days or more',walk:' at the beach, ',restWord:' sleeping under umbrellas',ground:'#f6eed8',sky:'#f7f9fa'},
 farm:{rest:'Hay bales, 90 days or more',walk:' in the pasture, ',restWord:' resting by the hay',ground:'#f1f0dc',sky:'#f7f9fa'}}[SCENE];
const SPC=SPECIES[SCENE];const HOOF=SCENE==='farm';
const walkers=P.filter(p=>!p.old),rest=P.filter(p=>p.old);
document.getElementById('count').textContent=walkers.length+SC.walk+rest.length+SC.restWord;
let W,H,DPR,S,T,bg,HOR,GB;
const UMAX=0.97;
function uMax(d){if(SCENE!=='farm')return UMAX;const y=yOf(d),z=(H*1.06-HOR)/Math.max(1,y-HOR);return Math.max(0.05,(TRK.vx+(TRK.x0-TRK.vx)/z-TRK.g0/z*2.2)/W-0.02);}
const an=walkers.map(p=>({p,u:0.03+h32(p.name,61)*(SCENE==='farm'?0.45:UMAX-0.06),d:0.05+h32(p.name,60)*0.85,th:(h32(p.name,62)-0.5)*1.4+(h32(p.name,66)>0.5?Math.PI:0),turn:0,turnT:0,idle:0,ph:h32(p.name,63)*6.28,wob:h32(p.name,64)*6.28,spin:0,spinT:4+h32(p.name,65)*10,v:SPC[p.kind].v*(0.85+p.speed*0.3)}));
const yOf=d=>HOR+(GB-HOR)*Math.pow(d,1.15),sOf=d=>0.42+0.78*d;
function tuft(g,x,y,s,col){g.strokeStyle=col;g.beginPath();g.moveTo(x-3*s,y-5*s);g.lineTo(x,y);g.lineTo(x+1*s,y-7*s);g.moveTo(x,y);g.lineTo(x+4*s,y-4*s);g.stroke();}
function acacia(g,x,y,s){g.strokeStyle='rgba(18,58,74,.55)';g.beginPath();g.moveTo(x,y);g.lineTo(x+2*s,y-26*s);g.lineTo(x-10*s,y-38*s);g.moveTo(x+2*s,y-26*s);g.lineTo(x+12*s,y-40*s);g.stroke();g.strokeStyle='#7f9f72';g.beginPath();g.ellipse(x+1*s,y-42*s,30*s,6*s,0,0,6.283);g.stroke();}
function palm(g,x,y,s,lean){g.strokeStyle='rgba(18,58,74,.55)';g.beginPath();g.moveTo(x,y);g.quadraticCurveTo(x+lean*10*s,y-30*s,x+lean*18*s,y-60*s);g.stroke();const tx=x+lean*18*s,ty=y-60*s;g.strokeStyle='#7f9f72';for(let k=0;k<6;k++){const a=-Math.PI*0.95+k*Math.PI*0.38;g.beginPath();g.moveTo(tx,ty);g.quadraticCurveTo(tx+Math.cos(a)*14*s,ty+Math.sin(a)*14*s-6*s,tx+Math.cos(a)*24*s,ty+Math.sin(a)*24*s+6*s);g.stroke();}}
const TRK={vx:0,x0:0,g0:0};
function tz(z){return [TRK.vx+(TRK.x0-TRK.vx)/z,HOR+(H*1.06-HOR)/z];}
function build(){
  bg=document.createElement('canvas');bg.width=W*DPR;bg.height=H*DPR;const g=bg.getContext('2d');g.scale(DPR,DPR);
  g.fillStyle=SC.sky;g.fillRect(0,0,W,HOR);g.fillStyle=SC.ground;g.fillRect(0,HOR,W,H-HOR);g.lineWidth=1.2;
  if(SCENE==='cats'){
    g.strokeStyle='rgba(224,120,0,.55)';g.beginPath();g.arc(W*0.7,HOR-8*T,26*T,Math.PI,0);g.stroke();
    g.strokeStyle='rgba(18,58,74,.35)';g.beginPath();g.moveTo(W*0.05,HOR);g.lineTo(W*0.28,HOR-52*T);g.lineTo(W*0.36,HOR-56*T);g.lineTo(W*0.6,HOR);g.stroke();g.beginPath();g.moveTo(W*0.24,HOR-44*T);g.lineTo(W*0.27,HOR-40*T);g.lineTo(W*0.31,HOR-46*T);g.lineTo(W*0.35,HOR-42*T);g.lineTo(W*0.39,HOR-48*T);g.stroke();
    acacia(g,W*0.84,HOR+2,0.9*T);acacia(g,W*0.12,HOR+2,0.7*T);acacia(g,W*0.5,HOR+4,0.5*T);
    for(let i=0;i<Math.round(W*H/1400);i++){const d=h32('gd'+i,2),x=h32('gx'+i,1)*W;tuft(g,x,yOf(d),sOf(d)*T,'#c9b48a');}
    const rx=W*0.58,ry=H*0.975;g.fillStyle=SC.ground;g.strokeStyle='rgba(18,58,74,.6)';g.lineWidth=1.4;g.beginPath();g.moveTo(rx-10*T,ry);g.lineTo(rx,ry-38*T);g.lineTo(rx+W*0.2,ry-44*T);g.lineTo(rx+W*0.4,ry-30*T);g.lineTo(rx+W*0.43,ry);g.closePath();g.fill();g.stroke();
    g.lineWidth=1;g.beginPath();g.moveTo(rx+W*0.08,ry-20*T);g.lineTo(rx+W*0.14,ry-8*T);g.moveTo(rx+W*0.28,ry-24*T);g.lineTo(rx+W*0.32,ry-10*T);g.stroke();bg.restTop=ry-42*T;bg.restX0=rx+8*T;bg.restX1=rx+W*0.38;
  }else if(SCENE==='dogs'){
    const sea=HOR+H*0.1;g.fillStyle='#eef7f9';g.fillRect(0,HOR,W,sea-HOR);g.strokeStyle='rgba(18,58,74,.5)';g.beginPath();g.moveTo(0,HOR);g.lineTo(W,HOR);g.stroke();
    g.strokeStyle='#c3dfe6';for(let i=0;i<30;i++){const x=h32('wv'+i,1)*W,y=HOR+4+h32('wy'+i,2)*(sea-HOR-10),s=3+h32('ws'+i,3)*4;g.beginPath();g.moveTo(x-s,y);g.lineTo(x-s/2,y-s*0.35);g.lineTo(x,y);g.lineTo(x+s/2,y-s*0.35);g.lineTo(x+s,y);g.stroke();}
    bg.sea=sea;palm(g,W*0.06,sea+30*T,1.1*T,1);palm(g,W*0.95,sea+24*T,1*T,-1);
    g.strokeStyle='#e2d3ad';for(let i=0;i<Math.round(W*H/2200);i++){const x=h32('sd'+i,1)*W,d=h32('se'+i,2),y=yOf(d)+(sea-HOR);if(y>H*0.86)continue;g.beginPath();g.arc(x,y,0.8,0,6.283);g.stroke();}
    const by=H*0.965;bg.restTop=by;bg.restX0=W*0.04;bg.restX1=W*0.96;
    for(let i=0;i<4;i++){const x=W*(0.13+i*0.25);g.strokeStyle='rgba(18,58,74,.55)';g.beginPath();g.moveTo(x,by+4*T);g.lineTo(x,by-46*T);g.stroke();g.strokeStyle=['#d93636','#2f6fd6','#e07800','#1e9e3e'][i];g.beginPath();g.moveTo(x-28*T,by-38*T);g.quadraticCurveTo(x,by-62*T,x+28*T,by-38*T);for(let k=0;k<=4;k++)g.lineTo(x+28*T-k*14*T,by-38*T+(k%2?3*T:0));g.stroke();g.strokeStyle='rgba(18,58,74,.35)';g.strokeRect(x-26*T,by-4*T,52*T,10*T);}
  }else{
    g.strokeStyle='rgba(18,58,74,.3)';g.beginPath();for(let x=0;x<=W;x+=4){const y=HOR-8*T-Math.sin(x/W*6.28*1.1+1)*10*T;if(x===0)g.moveTo(x,y);else g.lineTo(x,y);}g.stroke();
    const bx=W*0.08,by=HOR+6*T,bw=64*T,bh=40*T;g.fillStyle=SC.ground;g.strokeStyle='#d93636';g.beginPath();g.moveTo(bx,by);g.lineTo(bx,by-bh);g.lineTo(bx+bw*0.2,by-bh-14*T);g.lineTo(bx+bw*0.8,by-bh-14*T);g.lineTo(bx+bw,by-bh);g.lineTo(bx+bw,by);g.closePath();g.fill();g.stroke();
    g.strokeRect(bx+bw*0.3,by-24*T,bw*0.4,24*T);g.beginPath();g.moveTo(bx+bw*0.3,by-24*T);g.lineTo(bx+bw*0.7,by);g.moveTo(bx+bw*0.7,by-24*T);g.lineTo(bx+bw*0.3,by);g.stroke();
    g.strokeStyle=INK;g.strokeRect(bx+bw+4*T,by-58*T,14*T,58*T);g.beginPath();g.arc(bx+bw+11*T,by-58*T,7*T,Math.PI,0);g.stroke();
    const px=W*0.18,py=HOR+H*0.14;g.strokeStyle='#8fb8c4';g.beginPath();g.ellipse(px,py,W*0.1,H*0.025,0,0,6.283);g.stroke();g.beginPath();g.ellipse(px,py,W*0.06,H*0.013,0,0,6.283);g.stroke();
    g.strokeStyle='rgba(18,58,74,.5)';for(let x=6;x<W*0.3;x+=20*T){g.beginPath();g.moveTo(x,HOR+14*T);g.lineTo(x,HOR+2*T);g.stroke();}g.beginPath();g.moveTo(0,HOR+5*T);g.lineTo(W*0.3,HOR+5*T);g.moveTo(0,HOR+10*T);g.lineTo(W*0.3,HOR+10*T);g.stroke();
    TRK.vx=W*0.34;TRK.x0=W*0.96;TRK.g0=W*0.09;
    g.strokeStyle='#c9b48a';g.lineWidth=1.2;for(let z=1;z<40;z+=0.45){const [x,y]=tz(z),gg=TRK.g0/z;g.beginPath();g.moveTo(x-gg*1.5,y);g.lineTo(x+gg*1.5,y);g.stroke();}
    g.strokeStyle='rgba(18,58,74,.6)';for(const sd of [-1,1]){g.beginPath();for(let z=0.95;z<60;z*=1.05){const [x,y]=tz(z);const xx=x+sd*TRK.g0/z;if(z===0.95)g.moveTo(xx,y);else g.lineTo(xx,y);}g.stroke();}
    for(let i=0;i<Math.round(W*H/1600);i++){const d=h32('gd'+i,2),x=h32('gx'+i,1)*W;if(x>uMax(d)*W)continue;tuft(g,x,yOf(d),sOf(d)*T*0.8,'#b9c79a');}
    const hy=H*0.965;bg.restTop=hy;bg.restX0=W*0.04;bg.restX1=W*0.58;g.strokeStyle='#c49a00';for(let i=0;i<3;i++){const x=W*(0.08+i*0.2);g.strokeRect(x,hy-12*T,40*T,14*T);for(let k=1;k<4;k++){g.beginPath();g.moveTo(x+k*10*T,hy-12*T);g.lineTo(x+k*10*T,hy+2*T);g.stroke();}}
  }
}
function resize(){
  DPR=Math.min(window.devicePixelRatio||1,2);W=innerWidth;H=innerHeight;cv.width=W*DPR;cv.height=H*DPR;HOR=H*(SCENE==='dogs'?0.2:0.28);
  T=Math.max(0.85,Math.min(1.3,Math.min(W,H)/360));S=Math.max(0.9,Math.min(1.8,Math.sqrt(W*H*UMAX/(walkers.length*1050))));
  build();GB=SCENE==='cats'?H*0.86:H*0.84;if(SCENE==='dogs'){HOR=bg.sea;}
  const n=rest.length;rest.forEach((p,i)=>{p.rx=bg.restX0+(i+0.5)*(bg.restX1-bg.restX0)/n;p.ry=SCENE==='cats'?bg.restTop+(Math.sin(i*1.3)*3)*T:bg.restTop;});
}
function ik(hx,hy,fx,fy,a,b,bend){let dx=fx-hx,dy=fy-hy,d=Math.hypot(dx,dy);d=Math.min(d,a+b-0.01);const base=Math.atan2(dy,dx),A=Math.acos(Math.max(-1,Math.min(1,(a*a+d*d-b*b)/(2*a*d))));const k=base+bend*A;return [hx+Math.cos(k)*a,hy+Math.sin(k)*a];}
function bone(c,x1,y1,x2,y2,w1,w2,col,fill){const a=Math.atan2(y2-y1,x2-x1),nx=-Math.sin(a),ny=Math.cos(a);c.beginPath();c.moveTo(x1+nx*w1/2,y1+ny*w1/2);c.lineTo(x2+nx*w2/2,y2+ny*w2/2);c.lineTo(x2-nx*w2/2,y2-ny*w2/2);c.lineTo(x1-nx*w1/2,y1-ny*w1/2);c.closePath();c.fillStyle=fill;c.fill();c.strokeStyle=col;c.stroke();}
function superE(c,cx,cy,rx,ry,col,bumps,fill){c.beginPath();const n=bumps?bumps*2:28;
  for(let i=0;i<=n;i++){const a=i/n*6.283,ca=Math.cos(a),sa=Math.sin(a);let r=1;if(bumps)r=1+(i%2?0.12:0);const x=cx+rx*r*Math.sign(ca)*Math.pow(Math.abs(ca),0.75),y=cy+ry*r*Math.sign(sa)*Math.pow(Math.abs(sa),0.85);if(i===0)c.moveTo(x,y);else c.lineTo(x,y);}
  c.closePath();if(fill){c.fillStyle=fill;c.fill();}c.strokeStyle=col;c.stroke();}
function legPass(c,sp,L,col,ph,far,moving,fill){
  const bl=sp.bl*L,bh=sp.bh*L,ll=sp.ll*L,by=-(ll+bh/2),hipY=by+bh*0.22,w=Math.max(1.4,bh*0.3),stride=ll*0.5,lift=ll*0.22;
  for(const [front,off] of [[1,far?Math.PI:0],[0,far?0:Math.PI]]){
    const p=ph+off+(front?0:0.5),hx=(front?bl*0.34:-bl*0.34)+(far?bl*0.04:0);
    const fx=hx+(moving?Math.sin(p)*stride*0.5:0)+(front?ll*0.04:-ll*0.02),fy=moving?-Math.max(0,Math.cos(p))*lift:0;
    if(front){const pas=ll*0.12,wx=fx-pas*0.2,wy=fy-pas;const [ex,ey]=ik(hx,hipY,wx,wy,ll*0.5,ll*0.45,1);bone(c,hx,hipY,ex,ey,w,w*0.7,col,fill);bone(c,ex,ey,wx,wy,w*0.7,w*0.5,col,fill);bone(c,wx,wy,fx+pas*0.25,fy,w*0.5,w*0.45,col,fill);}
    else{const mt=ll*0.3,kx=fx-mt*0.28,ky=fy-mt;const [sx,sy]=ik(hx,hipY,kx,ky,ll*0.45,ll*0.42,-1);bone(c,hx,hipY,sx,sy,w*1.2,w*0.7,col,fill);bone(c,sx,sy,kx,ky,w*0.7,w*0.5,col,fill);bone(c,kx,ky,fx+ll*0.04,fy,w*0.5,w*0.45,col,fill);}
    if(HOOF)poly(c,[[fx-w*0.25,fy-w*0.5],[fx+w*0.45,fy-w*0.5],[fx+w*0.55,fy],[fx-w*0.3,fy]],col);else{c.beginPath();c.ellipse(fx+w*0.2,fy-w*0.2,w*0.4,w*0.22,0,0,6.283);c.fillStyle=fill;c.fill();c.strokeStyle=col;c.stroke();}
  }
}
function drawAnimal(c,sp,L,col,ph,t,resting,seed,moving,fill){
  c.lineWidth=1.15;c.lineJoin='round';c.lineCap='round';
  const bl=sp.bl*L,bh=sp.bh*L,ll=resting?bh*0.15:sp.ll*L,hl=sp.hl*L,hh=sp.hh*L,nl=sp.nl*L,ex=sp.ex;
  const by=-(ll+bh/2);
  if(!resting){c.globalAlpha=0.55;legPass(c,sp,L,col,ph,true,moving,fill);c.globalAlpha=1;}
  const bob=resting||!moving?0:Math.sin(ph*2)*hh*0.06;
  const nbx=bl*0.42,nby=by-bh*0.2;const na=resting?0.25:sp.na;const look=moving?0:Math.sin(t*0.7+seed)*0.25;
  const hx=nbx+nl*Math.cos(na)+hl*0.25,hy=(resting?-hh*0.6:nby-nl*Math.sin(na))+bob+look*hh;
  const tx=-bl*0.47,ty=by-bh*0.25,sw=Math.sin(t*2+seed);
  c.strokeStyle=col;c.beginPath();const tl=sp.tail;
  if(tl==='long'){c.moveTo(tx,ty);c.quadraticCurveTo(tx-L*0.25,ty+L*0.12,tx-L*0.38,ty-L*0.05+sw*L*0.04);}
  else if(tl==='up'){c.moveTo(tx,ty);c.quadraticCurveTo(tx-L*0.15,ty-L*0.05,tx-L*0.12+sw*L*0.03,ty-L*0.28);}
  else if(tl==='wag'){const a=-1.1+Math.sin(t*14+seed)*0.35;c.moveTo(tx,ty);c.lineTo(tx+Math.cos(Math.PI+a)*L*0.22,ty+Math.sin(Math.PI+a)*L*0.22*-1);}
  else if(tl==='tuft'){const ex2=tx-L*0.08+sw*L*0.03,ey=ty+L*0.3;c.moveTo(tx,ty);c.quadraticCurveTo(tx-L*0.08,ty+L*0.1,ex2,ey);c.moveTo(ex2,ey);c.lineTo(ex2-L*0.03,ey+L*0.06);c.moveTo(ex2,ey);c.lineTo(ex2+L*0.03,ey+L*0.06);}
  else if(tl==='horse'){for(let k=0;k<4;k++){c.moveTo(tx,ty);c.quadraticCurveTo(tx-L*0.12,ty+L*0.05,tx-L*0.1-k*L*0.02+sw*L*0.03,ty+L*(0.28+k*0.02));}}
  else if(tl==='bushy'){c.moveTo(tx,ty);c.quadraticCurveTo(tx-L*0.2,ty-L*0.02,tx-L*0.24+sw*L*0.03,ty-L*0.2);c.quadraticCurveTo(tx-L*0.12,ty-L*0.14,tx,ty-bh*0.1);}
  else if(tl==='curly'){for(let i=0;i<=12;i++){const a=i/12*9,r=L*0.05*(1-i/14);const x=tx-L*0.04-Math.cos(a)*r,y=ty-L*0.02-Math.sin(a)*r;if(i===0)c.moveTo(tx,ty);c.lineTo(x,y);}}
  else{c.moveTo(tx,ty);c.lineTo(tx-L*0.06,ty-L*0.07);}
  c.stroke();
  superE(c,0,by,bl/2,bh/2,col,ex.includes('wool')?14:ex.includes('fluff')?20:0,fill);
  if(ex.includes('spots'))for(let i=0;i<9;i++){const sx=(h32('s'+i,seed*7|0)-0.5)*bl*0.8,sy=by+(h32('t'+i,seed*7|0)-0.5)*bh*0.6;ring(c,sx,sy,Math.max(0.6,L*0.012),col);}
  if(ex.includes('stripes'))for(let i=0;i<6;i++){const sx=-bl*0.35+i*bl*0.13;c.beginPath();c.moveTo(sx,by-bh*0.48);c.quadraticCurveTo(sx+bl*0.03,by-bh*0.2,sx,by+bh*0.05);c.stroke();}
  if(ex.includes('patches'))for(let i=0;i<3;i++){const sx=(h32('p'+i,seed*5|0)-0.5)*bl*0.6,sy=by+(h32('q'+i,seed*5|0)-0.5)*bh*0.4,r=L*(0.04+h32('r'+i,seed*5|0)*0.04);c.beginPath();for(let k=0;k<=7;k++){const a=k/7*6.283,rr=r*(0.75+0.35*h32('k'+k+i,seed*3|0));if(k===0)c.moveTo(sx+Math.cos(a)*rr,sy+Math.sin(a)*rr*0.7);else c.lineTo(sx+Math.cos(a)*rr,sy+Math.sin(a)*rr*0.7);}c.closePath();c.stroke();}
  if(resting){line(c,bl*0.15,-bh*0.15,bl*0.5,-bh*0.12,col);line(c,-bl*0.3,-bh*0.1,-bl*0.05,-bh*0.08,col);}else legPass(c,sp,L,col,ph,false,moving,fill);
  const nt=Math.min(hh*0.75,bh*0.45);
  c.beginPath();c.moveTo(nbx-nt*0.3,nby-nt*0.4);c.lineTo(hx-hl*0.25,hy-hh*0.3);c.lineTo(hx-hl*0.1,hy+hh*0.35);c.lineTo(nbx+nt*0.5,nby+nt*0.6);c.closePath();c.fillStyle=fill;c.fill();c.strokeStyle=col;c.stroke();
  if(ex.includes('mane2'))for(let i=1;i<6;i++){const u=i/6,x=nbx-nt*0.3+(hx-hl*0.25-nbx+nt*0.3)*u,y=nby-nt*0.4+(hy-hh*0.3-nby+nt*0.4)*u;line(c,x,y,x-L*0.04,y-L*0.01+sw*L*0.01,col);}
  if(ex.includes('mane'))for(let i=0;i<18;i++){const a=Math.PI*0.35+i/18*Math.PI*1.3;line(c,hx-hl*0.1+Math.cos(a)*hh*0.55,hy+Math.sin(a)*hh*0.55,hx-hl*0.1+Math.cos(a)*hh*1.05,hy+Math.sin(a)*hh*1.05,col);}
  if(ex.includes('collar')){line(c,nbx+nt*0.1,nby-nt*0.5,nbx+nt*0.6,nby+nt*0.6,col);ring(c,nbx+nt*0.7,nby+nt*0.9,Math.max(0.8,L*0.015),col);}
  superE(c,hx,hy,hl/2,hh/2,col,0,fill);
  if(sp.sn>0){const sn=sp.sn*L;poly(c,[[hx+hl*0.38,hy-hh*0.22],[hx+hl*0.38+sn,hy-hh*0.05],[hx+hl*0.38+sn,hy+hh*0.32],[hx+hl*0.3,hy+hh*0.42]],col);ring(c,hx+hl*0.38+sn,hy-hh*0.02,Math.max(0.7,L*0.01),col);}
  if(ex.includes('pignose')){c.strokeStyle=col;c.beginPath();c.ellipse(hx+hl*0.5+sp.sn*L,hy+hh*0.1,L*0.012,hh*0.28,0,0,6.283);c.stroke();}
  if(resting)line(c,hx+hl*0.05,hy-hh*0.12,hx+hl*0.22,hy-hh*0.12,col);else ring(c,hx+hl*0.18,hy-hh*0.15,Math.max(0.7,L*0.012),col);
  if(ex.includes('beard'))line(c,hx+hl*0.3,hy+hh*0.45,hx+hl*0.2,hy+hh*1.1,col);
  const ex0=hx-hl*0.12,ey0=hy-hh*0.42,e=sp.ear;
  if(e==='pointy')poly(c,[[ex0-hl*0.12,ey0+hh*0.1],[ex0-hl*0.02,ey0-hh*0.55],[ex0+hl*0.12,ey0+hh*0.05]],col);
  else if(e==='round'){c.strokeStyle=col;c.beginPath();c.arc(ex0,ey0,hh*0.2,Math.PI,0);c.stroke();}
  else if(e==='flop')poly(c,[[ex0-hl*0.05,ey0+hh*0.05],[ex0-hl*0.22,ey0+hh*0.75],[ex0-hl*0.08,ey0+hh*0.85],[ex0+hl*0.08,ey0+hh*0.1]],col);
  else if(e==='fold')poly(c,[[ex0-hl*0.1,ey0+hh*0.1],[ex0,ey0-hh*0.3],[ex0+hl*0.15,ey0+hh*0.1]],col);
  else if(e==='long')poly(c,[[ex0-hl*0.12,ey0+hh*0.1],[ex0-hl*0.25,ey0-hh*1.6],[ex0-hl*0.02,ey0-hh*1.5],[ex0+hl*0.08,ey0+hh*0.05]],col);
  else poly(c,[[ex0,ey0+hh*0.15],[ex0-hl*0.35,ey0+hh*0.05],[ex0-hl*0.1,ey0+hh*0.4]],col);
  if(ex.includes('horns')){c.strokeStyle=col;c.beginPath();c.moveTo(ex0+hl*0.12,ey0);c.quadraticCurveTo(ex0+hl*0.3,ey0-hh*0.2,ex0+hl*0.22,ey0-hh*0.6);c.stroke();}
  if(ex.includes('goathorns')){c.strokeStyle=col;c.beginPath();c.moveTo(ex0+hl*0.1,ey0);c.quadraticCurveTo(ex0+hl*0.05,ey0-hh*1.3,ex0-hl*0.35,ey0-hh*0.9);c.stroke();}
}
const train={z:1.2,dir:1,wait:0},smoke=[],frisbees=[],gulls=[0,1,2].map(i=>({x:h32('gl'+i,1),y:0.05+h32('gy'+i,2)*0.1,v:0.02+h32('gv'+i,3)*0.02}));
function adiff(a,b){let d=a-b;while(d>Math.PI)d-=6.283;while(d<-Math.PI)d+=6.283;return d;}
function drawTrain(t,dt){
  if(train.wait>0){train.wait-=dt;}else{train.z*=Math.pow(1.22,train.dir*dt);if(train.z>45){train.dir=-1;train.wait=3;}if(train.z<0.75){train.dir=1;train.wait=4;}}
  const cars=[];for(let i=0;i<6;i++)cars.push(train.z+i*2.6*(train.dir>0?-1:-1)*-1);
  const zs=cars.map((z,i)=>[z,i]).filter(([z])=>z>0.6&&z<60).sort((a,b)=>b[0]-a[0]);
  for(const [z0,i] of zs){const z1=z0+2.2;const P0=tz(z0),P1=tz(z1),g0=TRK.g0/z0*1.25,g1=TRK.g0/z1*1.25,h0=TRK.g0*2/z0,h1=TRK.g0*2/z1;
    const col=i===0?INK:'rgba(18,58,74,.7)';ctx.lineWidth=Math.max(0.8,1.6/Math.sqrt(z0));
    const F=[[P0[0]-g0,P0[1]],[P0[0]+g0,P0[1]],[P0[0]+g0,P0[1]-h0],[P0[0]-g0,P0[1]-h0]],B2=[[P1[0]-g1,P1[1]],[P1[0]+g1,P1[1]],[P1[0]+g1,P1[1]-h1],[P1[0]-g1,P1[1]-h1]];
    ctx.fillStyle=SC.ground;ctx.beginPath();ctx.moveTo(F[3][0],F[3][1]);ctx.lineTo(B2[3][0],B2[3][1]);ctx.lineTo(B2[2][0],B2[2][1]);ctx.lineTo(F[2][0],F[2][1]);ctx.lineTo(F[1][0],F[1][1]);ctx.lineTo(F[0][0],F[0][1]);ctx.closePath();ctx.fill();
    poly(ctx,F,col);line(ctx,F[2][0],F[2][1],B2[2][0],B2[2][1],col);line(ctx,F[3][0],F[3][1],B2[3][0],B2[3][1],col);line(ctx,B2[2][0],B2[2][1],B2[3][0],B2[3][1],col);line(ctx,F[1][0],F[1][1],B2[1][0],B2[1][1],col);
    if(i===0){ring(ctx,P0[0],P0[1]-h0*0.55,g0*0.45,col);const sx=(P0[0]+P1[0])/2,sy=(P0[1]-h0+P1[1]-h1)/2;line(ctx,sx,sy,sx,sy-h0*0.35,col);if(Math.random()<dt*4)smoke.push({x:sx,y:sy-h0*0.35,r:g0*0.2,life:1});}
    else{line(ctx,(F[0][0]+F[1][0])/2,F[2][1],(F[0][0]+F[1][0])/2,F[0][1],col);}
  }
  label(ctx,'GitHub line',W*0.97,H*0.97,'right',10*T);
}
let last=performance.now();
function frame(now){
  const dt=Math.min(0.05,(now-last)/1000)*MOTION,t=now/1000;last=now;
  ctx.setTransform(DPR,0,0,DPR,0,0);ctx.drawImage(bg,0,0,W,H);
  if(SCENE==='dogs'){const sea=bg.sea;ctx.strokeStyle='rgba(18,58,74,.45)';ctx.lineWidth=1.2;for(let k=0;k<3;k++){const ph=((t*0.25+k/3)%1);const y=sea-(1-ph)*12*T;ctx.globalAlpha=1-ph;ctx.beginPath();for(let x=0;x<=W;x+=5){const yy=y+Math.sin(x/22+t+k)*2*T;if(x===0)ctx.moveTo(x,yy);else ctx.lineTo(x,yy);}ctx.stroke();}ctx.globalAlpha=1;
    if(Math.random()<dt*0.5&&frisbees.length<2)frisbees.push({x0:Math.random()*W,x1:Math.random()*W,y:HOR+(GB-HOR)*(0.3+Math.random()*0.6),t:0,c:['#d93636','#1e9e3e','#2f6fd6'][Math.floor(Math.random()*3)]});
    for(const f of frisbees){f.t+=dt*0.5;const x=f.x0+(f.x1-f.x0)*f.t,y=f.y-Math.sin(f.t*Math.PI)*70*T;ctx.strokeStyle=f.c;ctx.beginPath();ctx.ellipse(x,y,6*T,2*T,0,0,6.283);ctx.stroke();}
    frisbees.splice(0,frisbees.length,...frisbees.filter(f=>f.t<1));}
  for(const gl of gulls){gl.x=(gl.x+gl.v*dt)%1.1;const x=gl.x*W*1.1-W*0.05,y=gl.y*H,f=Math.sin(t*5+gl.v*100)*3*T;ctx.strokeStyle='rgba(18,58,74,.5)';ctx.lineWidth=1.1;ctx.beginPath();ctx.moveTo(x-7*T,y-f);ctx.quadraticCurveTo(x-3*T,y-4*T,x,y);ctx.quadraticCurveTo(x+3*T,y-4*T,x+7*T,y-f);ctx.stroke();}
  if(SCENE==='farm'){const wx=W*0.82,wy=HOR-4*T;line(ctx,wx,HOR+4*T,wx,wy-38*T,INK);for(let k=0;k<4;k++){const a=t*1.4+k*1.5708;line(ctx,wx,wy-38*T,wx+Math.cos(a)*15*T,wy-38*T+Math.sin(a)*15*T,INK);}}
  const order=an.slice().sort((a,b)=>a.d-b.d);
  for(const a of an){const sp=SPC[a.p.kind];
    a.turnT-=dt;if(a.turnT<=0){a.turn=(Math.random()-0.5)*1.2;a.turnT=1.5+Math.random()*3;if(Math.random()<0.18)a.idle=1+Math.random()*2.5;}
    if(sp.hop){a.spinT-=dt;if(a.spinT<=0){a.spin=Math.PI;a.spinT=4+Math.random()*7;}}
    let tr=a.turn;if(a.spin>0){const d=Math.min(a.spin,dt*2.5);a.th+=d;a.spin-=d;tr=0;}
    const m=0.03,um=uMax(a.d);if(a.u<m||a.u>um-m||a.d<0.04||a.d>0.93){const want=Math.atan2((0.5-a.d)*0.6,(um/2-a.u));tr=Math.sign(adiff(want,a.th))*2;a.idle=0;}
    a.th+=tr*dt;if(a.idle>0)a.idle-=dt;
    let v=a.idle>0?0:a.v;if(sp.zoom)v*=0.45+1.4*Math.pow(Math.max(0,Math.sin(t*0.45+a.wob)),2);if(a.spin>0)v*=0.3;
    const s=sOf(a.d);a.u+=Math.cos(a.th)*v*T*s*dt/W;a.d+=Math.sin(a.th)*v*T*s*dt/(GB-HOR)*0.6;
    a.u=Math.max(0.005,Math.min(um,a.u));a.d=Math.max(0.01,Math.min(0.97,a.d));
    if(v>0)a.ph+=dt*(2+v*0.16);a.moving=v>0;}
  for(const a of order){const sp=SPC[a.p.kind],s=sOf(a.d),L=sp.L*a.p.sizeF*S*s;let hop=0;if(sp.hop&&a.moving)hop=-Math.pow(Math.max(0,Math.sin(t*2.6+a.wob)),6)*L*0.3;
    const x=a.u*W,y=yOf(a.d)+hop;const c=Math.cos(a.th),fx=(c>=0?1:-1)*Math.max(0.28,Math.abs(c));a._x=x;a._y=y-L*0.3;a._L=L;
    ctx.save();ctx.translate(x,y);ctx.globalAlpha=0.12;ctx.fillStyle=INK;ctx.beginPath();ctx.ellipse(0,0,L*0.32*Math.max(0.5,Math.abs(c)),L*0.05,0,0,6.283);ctx.fill();ctx.globalAlpha=1;
    ctx.scale(fx,1);drawAnimal(ctx,sp,L,a.p.color,a.ph,t,false,a.wob,a.moving,SC.ground);ctx.restore();}
  if(SCENE==='farm')drawTrain(t,dt);
  for(const p of smoke){p.life-=dt*0.7;p.r+=dt*6*T;p.y-=dt*14*T;p.x-=dt*4*T;}smoke.splice(0,smoke.length,...smoke.filter(p=>p.life>0));for(const p of smoke)ring(ctx,p.x,p.y,p.r,'rgba(18,58,74,'+(0.3*p.life).toFixed(2)+')');
  rest.forEach((p,i)=>{const sp=SPC[p.kind],L=sp.L*p.sizeF*S*0.6;p._x=p.rx;p._y=p.ry-L*0.15;p._L=L;ctx.save();ctx.translate(p.rx,p.ry);if(i%2)ctx.scale(-1,1);drawAnimal(ctx,sp,L,p.color,0,t,true,h32(p.name,9)*6,false,SC.ground);ctx.restore();});
  const zt=t%3;ctx.globalAlpha=Math.max(0,1-zt/3);label(ctx,'z',bg.restX0+20*T+zt*4,bg.restTop-24*T-zt*8*T,'center',9*T);label(ctx,'z',(bg.restX0+bg.restX1)/2+zt*3,bg.restTop-30*T-zt*7*T,'center',8*T);ctx.globalAlpha=1;
  label(ctx,SC.rest,SCENE==='cats'?bg.restX1:W*0.04,SCENE==='cats'?bg.restTop-26*T:bg.restTop-(SCENE==='dogs'?66:20)*T,SCENE==='cats'?'right':'left',10*T);
  const sl=VZ.sel;if(sl&&sl.ref)VZ.selRing(ctx,sl.ref._x,sl.ref._y,sl.ref._L*0.55+6);
  requestAnimationFrame(frame);
}
cv.addEventListener('pointerdown',e=>{
  let best=null,bd=1e9;const X=e.clientX,Y=e.clientY;
  const test=(o,p)=>{if(o._x==null)return;const d=Math.hypot(X-o._x,Y-o._y);if(d<Math.max(o._L*0.5,14)&&d<bd){bd=d;best=[o,p];}};
  for(const a of an)test(a,a.p);for(const p of rest)test(p,p);
  if(best){const [o,p]=best;VZ.open({ref:o,title:p.name,kind:SPC[p.kind].label+VZ.sizeText(p),age:VZ.ageText(p,p.old?'Resting, ':''),host:p.host});}else VZ.close();
});
addEventListener('resize',resize);resize();requestAnimationFrame(frame);
});
