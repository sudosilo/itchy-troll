// Packet factory simulation. A plan is a list of machines and belts. Packets are never saved: the page runs the
// factory live from the plan, so a plan stays small enough to share in a link.
import {MACHINES,autoRoute} from './machines.js';
import {SAUCES,STYLES} from './packets.js';

export const GAP = 1100;
const nk = (s)=>String(s).trim().toLowerCase();

function rng(seed){let a=seed>>>0||1;return ()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}

export function packetLabel(p){
  const st=p.st?STYLES[p.st][0]+' ':'';
  if(p.b>=0&&!p.half)return st+'Half '+SAUCES[p.s][1]+' Half '+SAUCES[p.b][1];
  if(p.half)return st+(p.half===1?'left':'right')+' half of '+SAUCES[p.s][1];
  return st+SAUCES[p.s][1];
}

export function buildSim(plan,seed){
  const R=rng(seed||7);
  const machines=new Map(),belts=[];
  for(const r of plan.machines)machines.set(nk(r.name),{r,type:r.type,M:MACHINES[r.type],q:[],out:[],hold:[],made:[],t:0,rr:0,n:{in:0,out:0,made:0,reject:0,miss:0},outs:[],ins:[],cur:null});
  for(const r of plan.belts){
    const A=machines.get(nk(r.from)),B=machines.get(nk(r.to));if(!A||!B||A===B)continue;
    const pts=r.pts||autoRoute(A.r,B.r);
    const d=[0];for(let i=1;i<pts.length;i++)d.push(d[i-1]+Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1],pts[i][2]-pts[i-1][2]));
    const b={r,A,B,out:r.out||'*',v:A.type==='tube'?Math.max(r.speed||1500,4500):r.speed||1500,pts,d,L:d[d.length-1]||1,items:[]};
    belts.push(b);A.outs.push(b);B.ins.push(b);
  }
  let uid=1,pair=1;
  const S={machines,belts,time:0,R,made:0};
  const rand=(n)=>Math.floor(R()*n);
  // Common sauces show up far more often than the weird ones, the same way the game unlocks them.
  const pickSauce=()=>{const t=R()<0.55?0:R()<0.6?1:R()<0.6?2:3+rand(6);let i=0,tries=0;do{i=rand(SAUCES.length);tries++;}while(SAUCES[i][3]>t&&tries<40);return i;};
  const newPacket=()=>{
    const p={u:uid++,s:pickSauce(),st:R()<0.5?0:1+rand(6),b:-1,half:0,pair:0};
    if(R()<0.35){p.b=pickSauce();if(p.b===p.s)p.b=(p.b+1)%SAUCES.length;p.pair=pair++;}
    return p;
  };
  S.newPacket=newPacket;

  const keyFor=(m,p)=>{
    const by=(m.r.meta&&m.r.meta.by)||'combo';
    if(by==='combo')return p.half?'half':p.b>=0?'combo':'whole';
    if(by==='style')return String(p.st);
    if(by==='tier')return String(SAUCES[p.s][3]);
    return SAUCES[p.s][0];
  };
  // Puts a packet on the start of a leaving conveyor. Returns false when that belt is backed up to the machine.
  const room=(b)=>!b.items.length||b.items[b.items.length-1].d>=GAP;
  const pick=(m,key)=>{let b=m.outs.find(o=>o.out===key);if(!b)b=m.outs.find(o=>o.out==='*');return b||null;};
  const emit=(m,p,key)=>{
    const b=pick(m,key||'*');
    if(!b){m.n.out++;if(key==='reject')m.n.reject++;return true;}
    if(!room(b))return false;
    b.items.push({p,d:0});m.n.out++;if(key==='reject')m.n.reject++;if(key==='miss')m.n.miss++;return true;
  };
  const flush=(m)=>{while(m.out.length){const [p,k]=m.out[0];if(!emit(m,p,k))break;m.out.shift();}};
  const cap=(m)=>({hopper:8,spacer:30,rack:60,cabinet:200,locker:200,clock:40,queue:60,fabricator:6,showroom:6,dock:6,reject:999,ticker:999,gap:0,bin:(m.r.meta&&m.r.meta.cap)||6,vending:(m.r.meta&&m.r.meta.cap)||8}[m.type]??3);

  S.accept=(m,p)=>{
    if((m.type==='bin'||m.type==='vending')&&m.q.length>=cap(m)){if(m.out.length<4){m.out.push([p,'miss']);m.n.in++;return true;}return false;}
    if(m.type==='rack'&&p.half){if(m.hold.length>=cap(m)){const old=m.hold.shift();m.out.push([old.p,'reject']);}m.hold.push({p,t:S.time});m.n.in++;return true;}
    if(m.q.length>=cap(m)||m.out.length>4)return false;
    m.q.push(p);m.n.in++;return true;
  };
  const opt=(m,k,d)=>{const v=m.r.meta&&m.r.meta[k];return v===undefined?d:v;};
  const sinkKeep=(m,p)=>{m.made.push(p);m.n.made++;S.made++;if(m.made.length>(m.type==='reject'||m.type==='ticker'?40:144))m.made.shift();};

  const TICK={
    hopper(m,dt){m.t-=dt;if(m.t<=0&&m.q.length<cap(m)){m.q.push(newPacket());m.n.in++;const r=opt(m,'rate',0.8);m.t=R()<0.3?r*0.15:r*(0.4+R()*1.6);}while(m.q.length&&emit(m,m.q[0],'*'))m.q.shift();},
    spacer(m,dt){m.t-=dt;if(m.t<=0&&m.q.length){if(emit(m,m.q[0],'*')){m.q.shift();m.t=opt(m,'every',1.4);}}},
    sorter(m){while(m.q.length&&emit(m,m.q[0],keyFor(m,m.q[0])))m.q.shift();},
    gate(m){if(!m.q.length||!m.outs.length)return;for(let k=0;k<m.outs.length;k++){const b=m.outs[(m.rr+k)%m.outs.length];if(room(b)){b.items.push({p:m.q.shift(),d:0});m.n.out++;m.rr=(m.rr+k+1)%m.outs.length;return;}}},
    rewrap(m,dt){if(!m.cur&&m.q.length){m.cur=m.q.shift();m.t=1.2;}if(m.cur){m.t-=dt;if(m.t<=0){const s=opt(m,'style',-1);m.cur.st=s>=0?s:Math.min(6,m.cur.st+1);m.out.push([m.cur,'*']);m.cur=null;}}flush(m);},
    splitter(m,dt){if(!m.cur&&m.q.length&&!m.out.length){m.cur=m.q.shift();m.t=0.9;}if(m.cur){m.t-=dt;if(m.t<=0){const p=m.cur;m.cur=null;if(p.b>=0&&!p.half){m.out.push([{u:uid++,s:p.s,st:p.st,b:p.b,half:1,pair:p.pair},'a'],[{u:uid++,s:p.b,st:p.st,b:p.s,half:2,pair:p.pair},'b']);}else m.out.push([p,'*']);}}flush(m);},
    rack(m){
      while(m.q.length){m.out.push([m.q.shift(),'*']);}
      for(let i=0;i<m.hold.length;i++){const a=m.hold[i];const j=m.hold.findIndex((h,k)=>k!==i&&h.p.pair===a.p.pair);if(j>=0){const L=a.p.half===1?a.p:m.hold[j].p;m.out.push([{u:uid++,s:L.s,st:L.st,b:L.b,half:0,pair:L.pair},'*']);m.hold=m.hold.filter((h,k)=>k!==i&&k!==j);m.n.made++;break;}}
      const ttl=opt(m,'ttl',25);while(m.hold.length&&S.time-m.hold[0].t>ttl){m.out.push([m.hold.shift().p,'reject']);}
      flush(m);
    },
    bin(m,dt){flush(m);m.t-=dt;if(m.t<=0&&m.q.length&&emit(m,m.q[0],'*')){m.q.shift();m.t=opt(m,'every',0.35);}},
    cabinet(m,dt){m.t-=dt;if(m.t<=0&&m.q.length&&emit(m,m.q[0],'*')){m.q.shift();m.t=opt(m,'every',2.2);}},
    clock(m,dt){m.t+=dt;const P=opt(m,'period',8);if(m.t>=P){m.t=0;m.open=true;m.n.made++;}if(m.open){while(m.q.length&&emit(m,m.q[0],'*'))m.q.shift();if(!m.q.length)m.open=false;}},
    turnstile(m){while(m.q.length){const p=m.q[0];if(!emit(m,p,p.st>=opt(m,'minStyle',1)?'*':'reject'))break;m.q.shift();}},
    window(m,dt){if(!m.cur&&m.q.length){m.cur=m.q.shift();m.t=0.6;}if(m.cur){m.t-=dt;if(m.t<=0){m.out.push([m.cur,m.cur.half?'reject':'*']);m.cur=null;}}flush(m);},
    arm(m,dt){if(!m.cur&&m.q.length){m.cur=m.q.shift();m.t=opt(m,'every',0.9);}if(m.cur){m.t-=dt;if(m.t<=0){const ops=opt(m,'ops',['upgrade']),op=ops[m.rr++%ops.length],p=m.cur;
      if(op==='upgrade')p.st=Math.min(6,p.st+1);else if(op==='downgrade')p.st=Math.max(0,p.st-1);else if(op==='plain')p.st=0;else if(op==='glitter')p.st=1;else if(op==='flip'&&p.b>=0&&!p.half){const t=p.s;p.s=p.b;p.b=t;}
      m.out.push([p,'*']);m.cur=null;}}flush(m);},
    fabricator(m,dt){m.t-=dt;if(m.t<=0&&m.q.length){sinkKeep(m,m.q.shift());m.t=0.25;}},
    dock(m,dt){m.t-=dt;if(m.t<=0&&m.q.length){sinkKeep(m,m.q.shift());m.t=0.3;}},
    reject(m){while(m.q.length){sinkKeep(m,m.q.shift());m.n.reject++;}},
    showroom(m,dt){m.t-=dt;if(m.t<=0&&m.q.length){sinkKeep(m,m.q.shift());m.t=0.3;}},
    ticker(m){while(m.q.length)sinkKeep(m,m.q.shift());},
    gap(){},
    queue(m){while(m.q.length&&emit(m,m.q[0],'*'))m.q.shift();},
    tube(m){while(m.q.length&&emit(m,m.q[0],'*'))m.q.shift();},
    arcade(m,dt){if(!m.cur&&m.q.length){m.cur=m.q.shift();m.t=1.6;}if(m.cur){m.t-=dt;if(m.t<=0){m.cur.st=6;m.out.push([m.cur,'*']);m.cur=null;}}flush(m);},
    register(m,dt){if(!m.cur&&m.q.length){m.cur=m.q.shift();m.t=0.8;}if(m.cur){m.t-=dt;if(m.t<=0){m.made.push({u:uid++,s:m.cur.s,st:2,b:-1,half:0,pair:0});if(m.made.length>60)m.made.shift();m.n.made++;m.out.push([m.cur,'*']);m.cur=null;}}flush(m);},
    bell(m){if(m.q.length&&!m.out.length){const p=m.q.shift();m.out.push([p,'*']);if(m.outs.some(o=>o.out==='copy'))m.out.push([{u:uid++,s:p.s,st:p.st,b:p.b,half:p.half,pair:p.pair},'copy']);}flush(m);},
    ai(m,dt){if(!m.cur&&m.q.length){m.cur=m.q.shift();m.t=1.5;}if(m.cur){m.t-=dt;if(m.t<=0){m.cur.s=pickSauce();if(m.cur.b>=0&&!m.cur.half){m.cur.b=pickSauce();}m.out.push([m.cur,'*']);m.cur=null;}}flush(m);},
    locker(m,dt){m.t-=dt;if(m.t<=0&&m.q.length&&emit(m,m.q[0],'*')){m.q.shift();m.t=opt(m,'every',4);}}
  };
  TICK.vending=(m,dt)=>{flush(m);m.t-=dt;if(m.t<=0&&m.q.length&&emit(m,m.q[0],'*')){m.q.shift();m.t=opt(m,'every',0.2);}};

  S.step=(dt)=>{
    dt=Math.min(dt,0.1);S.time+=dt;
    for(const b of belts){
      const v=b.v*dt;let lead=Infinity;
      for(const it of b.items){it.d=Math.min(it.d+v,b.L,lead-GAP);if(it.d<0)it.d=0;lead=it.d;}
      while(b.items.length&&b.items[0].d>=b.L-1&&S.accept(b.B,b.items[0].p))b.items.shift();
    }
    for(const m of machines.values())TICK[m.type](m,dt);
  };
  // Where a packet sits on a belt: position in mm and the direction it faces.
  S.beltPos=(b,d)=>{let i=1;while(i<b.d.length-1&&b.d[i]<d)i++;const p0=b.pts[i-1],p1=b.pts[i],f=(d-b.d[i-1])/((b.d[i]-b.d[i-1])||1);return [p0[0]+(p1[0]-p0[0])*f,p0[1]+(p1[1]-p0[1])*f,p0[2]+(p1[2]-p0[2])*f,Math.atan2(p1[1]-p0[1],p1[0]-p0[0])];};
  return S;
}
