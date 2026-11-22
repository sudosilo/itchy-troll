// Machine catalog and line drawings. Every machine is one piece of a software pipeline built as a physical mechanism.
// Units are mm. x is east, y is north, z is up.
export const PALETTE = ['#1f3a5f','#b4442c','#2f6b3a','#7a4f9a','#c07a12','#2a7f87','#8a2f55','#5a5a5a','#5c7a1f','#a35d2a','#3557a8','#9c8a1a'];
export const BELT_Z = 900;
export const MACHINES = {
  hopper:{size:[3000,3000,3600],outs:['*'],name:'Hopper',web:'Incoming traffic. Drops a messy, random stream of packets onto the belt, like users hitting a site.',opts:'meta.rate seconds between drops, 0.2 to 10, default 0.8'},
  spacer:{size:[2400,2400,1800],outs:['*'],name:'Spacer',web:'Rate limiter. Lets packets out on an exact beat no matter how they arrive.',opts:'meta.every seconds between releases, 0.2 to 10, default 1.4'},
  sorter:{size:[3000,3000,2400],outs:['*','combo','whole','half','0','1','2','3','4','5','6','sauce id'],name:'Sorter',web:'Router. Reads one trait of each packet and kicks it down the matching chute.',opts:'meta.by is combo, style, tier or sauce. Each leaving conveyor sets out to the value it takes, and * catches the rest'},
  gate:{size:[2400,2400,2000],outs:['*'],name:'Flipper Gate',web:'Load balancer. Flips packets into its output lanes in turn so no lane gets buried.',opts:'no options, every leaving conveyor uses out *'},
  rewrap:{size:[3600,3000,3000],outs:['*'],name:'Rewrap Press',web:'Transform step. Same sauce inside, new wrapper outside, the way data changes format between services.',opts:'meta.style 0 to 6 sets the new wrapper, default is one style up'},
  splitter:{size:[3000,3000,2400],outs:['*','a','b'],name:'Half Splitter',web:'Packet splitter. Cuts a 50/50 packet into its two halves, like a file broken into pieces to travel.',opts:'out a takes left halves, out b takes right halves, * takes anything that is not a 50/50'},
  rack:{size:[4800,2400,3000],outs:['*','reject'],name:'Half Rack',web:'Reassembly buffer. Holds halves until the exact matching partner arrives, then rebuilds the whole packet. TCP does this under every website.',opts:'meta.ttl seconds a half may wait, 3 to 120, default 25. Halves that time out go to out reject'},
  bin:{size:[1800,1800,1500],outs:['*','miss'],name:'Counter Bin',web:'Cache. A small fast bin next to the big cabinet. When it is full, packets spill to out miss.',opts:'meta.cap 1 to 30, default 6. meta.every seconds between packets out, default 0.35'},
  cabinet:{size:[4200,3000,3600],outs:['*'],name:'Filing Cabinet',web:'Database. Stores everything and a clerk walks each packet back out, slower than the bin.',opts:'meta.every seconds per clerk trip, 0.5 to 20, default 2.2'},
  clock:{size:[1800,1800,4200],outs:['*'],name:'Cuckoo Clock',web:'Cron job. Collects packets and lets the whole batch go when the clock strikes.',opts:'meta.period seconds, 2 to 120, default 8'},
  turnstile:{size:[1800,2400,2200],outs:['*','reject'],name:'Key Turnstile',web:'Auth. Only packets with a good enough wrapper get through. The rest go to out reject.',opts:'meta.minStyle 0 to 6, default 1'},
  window:{size:[3000,2400,2800],outs:['*','reject'],name:'Order Window',web:'API. Takes packets in one fixed format. A half packet is a bad order slip and is sent to out reject.',opts:'no options'},
  arm:{size:[2400,2400,3000],outs:['*'],name:'Robot Arm',web:'JavaScript. A programmable arm that runs a punch card of steps on each packet.',opts:'meta.ops list of upgrade, downgrade, flip, plain, glitter, run in turn, one per packet'},
  fabricator:{size:[4800,4200,4200],outs:[],name:'Fabricator',web:'The finished product of a site. Turns packets into one thing and shows it.',opts:'meta.product is wallpaper (gallery page), roll (feed), brick (archive or backup), receipt (dashboard) or token (login or payment)'},
  dock:{size:[6000,4800,4000],outs:[],name:'Shipping Dock',web:'Web server. Ships finished packets out to the customer.',opts:'no options'},
  reject:{size:[2400,2400,1500],outs:[],name:'Dead Letter Bin',web:'Dead letter queue. Where refused and timed out packets pile up so someone can see what went wrong.',opts:'no options'},
  showroom:{size:[5400,3000,4200],outs:[],name:'Showroom',web:'Frontend. The display window the customer looks through. Finished packets end up on its shelves, the way data ends up on a page.',opts:'no options'},
  arcade:{size:[3000,3000,3600],outs:['*'],name:'Arcade Cabinet',web:'Game engine or realtime canvas. Packets go in, bounce around inside the game, and come out glowing.',opts:'no options'},
  register:{size:[2400,2400,2400],outs:['*'],name:'Cash Register',web:'Payments. Rings up each packet, drops a coin in the till, and passes the packet on as paid.',opts:'no options'},
  queue:{size:[4200,4200,3000],outs:['*'],name:'Holding Hopper',web:'Job queue. A big bin that holds work and lets one packet out whenever the belt ahead has room.',opts:'no options'},
  tube:{size:[1800,1800,3000],outs:['*'],name:'Pneumatic Tube',web:'WebSocket or live connection. Shoots packets out three times faster than a normal belt, and the line stays open.',opts:'no options'},
  bell:{size:[1800,1800,2400],outs:['*','copy'],name:'Doorbell',web:'Webhook. Every packet that passes rings the bell, and a copy is sent to out copy for another building to hear.',opts:'no options'},
  vending:{size:[1800,1800,3600],outs:['*','miss'],name:'Vending Machine',web:'CDN. A stocked machine near the customer that hands out packets fast. When it runs dry, packets go to out miss and travel the long way.',opts:'meta.cap 1 to 30, default 8'},
  ticker:{size:[2400,1800,2400],outs:[],name:'Ticker Tape',web:'Monitoring and analytics. Prints every packet it receives on a running tape so someone can read what happened.',opts:'no options'},
  ai:{size:[3000,3000,3600],outs:['*'],name:'Oracle',web:'AI model. Takes a packet in and makes a different one come out, a new sauce it was never handed.',opts:'no options'},
  locker:{size:[4800,2400,3600],outs:['*'],name:'Cold Locker',web:'File or object storage. Holds packets in big lockers and hands them back slowly.',opts:'meta.every seconds per trip, default 4'},
  gap:{size:[2400,2400,2400],outs:[],name:'Unbuilt Machine',web:'A part of the stack that has no machine yet. It sits in the gap row until one is designed for it.',opts:'no options'}
};
export const PRODUCTS = ['wallpaper','roll','brick','receipt','token'];
export const ARM_OPS = ['upgrade','downgrade','flip','plain','glitter'];
function boxSegs(x0,y0,x1,y1,z0,z1){const q=[[x0,y0],[x1,y0],[x1,y1],[x0,y1]],s=[];for(let i=0;i<4;i++){const a=q[i],b=q[(i+1)%4];s.push([a[0],a[1],z0],[b[0],b[1],z0],[a[0],a[1],z1],[b[0],b[1],z1],[a[0],a[1],z0],[a[0],a[1],z1]);}return s;}
function rot(segs,ox,oy,oz,r){const c=Math.cos(r),s=Math.sin(r);return segs.map(p=>[ox+p[0]*c-p[1]*s,oy+p[0]*s+p[1]*c,oz+p[2]]);}
// Line drawing of each machine. Flat, unlit, the same line style as the rest of the city.
function vcircle(cx,cz,r,n,y){const s=[];for(let i=0;i<n;i++){const a0=i/n*Math.PI*2,a1=(i+1)/n*Math.PI*2;s.push([cx+Math.cos(a0)*r,y,cz+Math.sin(a0)*r],[cx+Math.cos(a1)*r,y,cz+Math.sin(a1)*r]);}return s;}
export function machineSegs(r){
  const M=MACHINES[r.type],[w,d,h]=M.size,x=w/2,y=d/2,s=[];
  const add=(...q)=>s.push(...q);
  if(r.type==='hopper'){add(...boxSegs(-x*0.5,-y*0.5,x*0.5,y*0.5,0,h*0.45));const t=h*0.45;for(const [a,b] of [[[-x*.5,-y*.5],[-x,-y]],[[x*.5,-y*.5],[x,-y]],[[x*.5,y*.5],[x,y]],[[-x*.5,y*.5],[-x,y]]])add([a[0],a[1],t],[b[0],b[1],h]);add(...boxSegs(-x,-y,x,y,h,h));}
  else if(r.type==='clock'){add(...boxSegs(-x,-y,x,y,0,h));add(...vcircle(0,h*0.72,x*0.7,12,-y-20));add([0,-y-20,h*0.72],[0,-y-20,h*0.72+x*0.55],[0,-y-20,h*0.72],[x*0.4,-y-20,h*0.72]);add([-x,-y,h],[0,-y,h+x*0.8],[0,-y,h+x*0.8],[x,-y,h],[-x,y,h],[0,y,h+x*0.8],[0,y,h+x*0.8],[x,y,h],[0,-y,h+x*0.8],[0,y,h+x*0.8]);}
  else if(r.type==='rack'){add(...boxSegs(-x,-y,x,y,0,h));for(let k=1;k<4;k++){const z=h*k/4;add([-x,-y,z],[x,-y,z],[-x,y,z],[x,y,z]);}}
  else if(r.type==='dock'){add(...boxSegs(-x,-y,x,y,0,h));add([-x*0.6,-y-10,0],[-x*0.6,-y-10,h*0.75],[-x*0.6,-y-10,h*0.75],[x*0.6,-y-10,h*0.75],[x*0.6,-y-10,h*0.75],[x*0.6,-y-10,0]);for(let k=1;k<6;k++)add([-x*0.6,-y-10,h*0.75*k/6],[x*0.6,-y-10,h*0.75*k/6]);}
  else if(r.type==='arm'){add(...boxSegs(-x*0.6,-y*0.6,x*0.6,y*0.6,0,h*0.25));add([0,0,h*0.25],[x*0.2,0,h*0.75],[x*0.2,0,h*0.75],[x*0.9,0,h*0.55],[x*0.9,0,h*0.55],[x*0.9,-y*0.3,h*0.4],[x*0.9,0,h*0.55],[x*0.9,y*0.3,h*0.4]);}
  else if(r.type==='turnstile'){add([0,0,0],[0,0,h],[-x,-y,0],[-x,-y,h],[-x,y,0],[-x,y,h],[-x,-y,h],[-x,y,h]);for(let k=0;k<3;k++){const a=k/3*Math.PI*2;add([0,0,h*0.6],[Math.cos(a)*x*0.9,Math.sin(a)*y*0.9,h*0.6]);}}
  else if(r.type==='bin'||r.type==='reject'){add(...boxSegs(-x,-y,x,y,0,h));add([-x,-y,h],[x,y,h],[-x,y,h],[x,-y,h]);}
  else if(r.type==='window'){add(...boxSegs(-x,-y,x,y,0,h));add([-x*0.5,-y-10,BELT_Z],[x*0.5,-y-10,BELT_Z],[x*0.5,-y-10,BELT_Z],[x*0.5,-y-10,BELT_Z+900],[x*0.5,-y-10,BELT_Z+900],[-x*0.5,-y-10,BELT_Z+900],[-x*0.5,-y-10,BELT_Z+900],[-x*0.5,-y-10,BELT_Z]);}
  else if(r.type==='fabricator'){add(...boxSegs(-x,-y,x,y,0,h));add([-x,-y,h*0.5],[x,-y,h*0.5],[-x,y,h*0.5],[x,y,h*0.5],[0,0,h],[0,0,h+1500],[-300,0,h+1500],[300,0,h+1500]);}
  else if(r.type==='showroom'){add(...boxSegs(-x,-y,x,y,0,h));for(let k=1;k<4;k++){add([-x,-y-10,h*k/4],[x,-y-10,h*k/4]);add([-x+w*k/4,-y-10,0],[-x+w*k/4,-y-10,h]);}}
  else if(r.type==='arcade'){add(...boxSegs(-x,-y*0.4,x,y,0,h));add([-x,-y,0],[-x,-y,h*0.45],[x,-y,0],[x,-y,h*0.45],[-x,-y,h*0.45],[x,-y,h*0.45],[-x,-y,h*0.45],[-x,-y*0.4,h],[x,-y,h*0.45],[x,-y*0.4,h],[-x,-y,0],[x,-y,0]);add([-x*0.6,-y*0.75,h*0.6],[x*0.6,-y*0.75,h*0.6],[x*0.6,-y*0.75,h*0.6],[x*0.6,-y*0.55,h*0.85],[x*0.6,-y*0.55,h*0.85],[-x*0.6,-y*0.55,h*0.85],[-x*0.6,-y*0.55,h*0.85],[-x*0.6,-y*0.75,h*0.6]);}
  else if(r.type==='register'){add(...boxSegs(-x,-y,x,y,0,h*0.6));add([-x*0.5,0,h*0.6],[-x*0.5,0,h],[x*0.5,0,h*0.6],[x*0.5,0,h],[-x*0.5,0,h],[x*0.5,0,h]);}
  else if(r.type==='queue'){add(...boxSegs(-x*0.4,-y*0.4,x*0.4,y*0.4,0,h*0.4));for(const [a,b] of [[[-x*.4,-y*.4],[-x,-y]],[[x*.4,-y*.4],[x,-y]],[[x*.4,y*.4],[x,y]],[[-x*.4,y*.4],[-x,y]]])add([a[0],a[1],h*0.4],[b[0],b[1],h]);add(...boxSegs(-x,-y,x,y,h,h));}
  else if(r.type==='tube'){add(...vcircle(0,BELT_Z+300,x*0.5,10,-y));add([0,-y,BELT_Z+300+x*0.5],[0,y,h],[0,y,h],[0,y,BELT_Z]);add(...boxSegs(-x*0.5,-y*0.5,x*0.5,y*0.5,0,BELT_Z));}
  else if(r.type==='bell'){add(...boxSegs(-x,-y,x,y,0,h*0.6));add(...vcircle(0,h*0.8,x*0.6,10,-y-10));}
  else if(r.type==='vending'){add(...boxSegs(-x,-y,x,y,0,h));for(let k=1;k<5;k++)add([-x*0.8,-y-10,h*k/5],[x*0.3,-y-10,h*k/5]);add([x*0.3,-y-10,h*0.2],[x*0.3,-y-10,h*0.9]);}
  else if(r.type==='ticker'){add(...boxSegs(-x,-y,x,y,0,h*0.7));add([0,-y,h*0.7],[0,-y-900,h*0.95],[0,-y-900,h*0.95],[0,-y-1800,h*0.6]);}
  else if(r.type==='ai'){add(...boxSegs(-x,-y,x,y,0,h*0.7));add(...vcircle(0,h*0.85,x*0.5,12,0));add([0,0,h*0.7],[0,0,h*1.2]);}
  else if(r.type==='locker'){add(...boxSegs(-x,-y,x,y,0,h));for(let k=1;k<4;k++)add([-x+w*k/4,-y-10,0],[-x+w*k/4,-y-10,h]);add([-x,-y-10,h/2],[x,-y-10,h/2]);}
  else if(r.type==='gap'){add(...boxSegs(-x,-y,x,y,0,h));const q=-y-10;add([-x*0.3,q,h*0.75],[0,q,h*0.88],[0,q,h*0.88],[x*0.3,q,h*0.75],[x*0.3,q,h*0.75],[0,q,h*0.5],[0,q,h*0.5],[0,q,h*0.35],[0,q,h*0.2],[0,q,h*0.12]);}
  else{add(...boxSegs(-x,-y,x,y,0,h));add([-x,0,BELT_Z],[x,0,BELT_Z]);}
  return rot(s,r.at[0],r.at[1],r.at[2],r.rot||0);
}
export const BELT_W = 1200;
export function conveyorSegs(r){
  const s=[],p=r.pts,h=BELT_W/2;
  for(let i=0;i<p.length-1;i++){
    const a=p[i],b=p[i+1],dx=b[0]-a[0],dy=b[1]-a[1],L=Math.hypot(dx,dy)||1,nx=-dy/L*h,ny=dx/L*h;
    s.push([a[0]+nx,a[1]+ny,a[2]],[b[0]+nx,b[1]+ny,b[2]],[a[0]-nx,a[1]-ny,a[2]],[b[0]-nx,b[1]-ny,b[2]]);
    const n=Math.floor(L/3000);for(let k=0;k<=n;k++){const f=n?k/n:0,x=a[0]+dx*f,y=a[1]+dy*f,z=a[2]+(b[2]-a[2])*f;s.push([x+nx,y+ny,z],[x+nx,y+ny,0],[x-nx,y-ny,z],[x-nx,y-ny,0],[x+nx,y+ny,z],[x-nx,y-ny,z]);}
  }
  return s;
}
// Default route for a belt: straight when the machines line up, otherwise one bend.
export function autoRoute(A,B){
  const p=[A.at[0],A.at[1],BELT_Z],q=[B.at[0],B.at[1],BELT_Z];
  return p[0]===q[0]||p[1]===q[1]?[p,q]:[p,[q[0],p[1],BELT_Z],q];
}
export const DEFAULT_COLOR={hopper:1,spacer:10,sorter:3,gate:10,rewrap:5,splitter:3,rack:6,bin:2,cabinet:0,clock:4,turnstile:6,window:0,arm:11,fabricator:4,dock:2,reject:7,showroom:4,arcade:3,register:2,queue:9,tube:5,bell:11,vending:8,ticker:7,ai:6,locker:0,gap:7};
