// Isometric board (view math from Tiletopia) and the ball's path through the tiles.
const N=8,S=64,ZH=26,MAXZ=6,START={x:0,y:4,z:4},A=Math.SQRT1_2,B=A/2;
const SK={paper:{bg:"#fbfaf7",floor:"#efe9dd",line:"#d9d1c2",top:"#ffffff",side:"#e6dfd2",side2:"#d6cdbd",edge:"#1f2328"},
 cyber:{bg:"#f2f6fb",floor:"#e6f2fa",line:"rgba(0,150,200,.25)",top:"#f9fcff",side:"#d4f6ff",side2:"#b9e9f5",edge:"#00809e"}};
let W=0,H=0,s=1,dpr=1,tr=null,run=null;
function P(wx,wy,z){const vx=(wx-N*S/2)*s,vy=(wy-N*S/2)*s;return [A*(vx-vy)+W/2,B*(vx+vy)+H*.6-z*ZH*s];}
function unP(sx,sy,z){const X=sx-W/2,Y=sy-H*.6+z*ZH*s,vx=(X/A+Y/B)/2,vy=(Y/B-X/A)/2;return [vx/s+N*S/2,vy/s+N*S/2];}
function at(x,y){return st.board[x+","+y];}
function trace(){
 let x=START.x,y=START.y,z=START.z,d=1;const steps=[{x,y,zin:z,zout:z,din:d,dout:d,k:"start"}],seen=new Set();
 for(let i=0;i<70;i++){
  const nx=x+DX[d],ny=y+DY[d],end=m=>({steps,fail:m,fx:nx,fy:ny,fz:z,fd:d});
  if(nx<0||ny<0||nx>=N||ny>=N)return end("The ball rolls off the edge of the board.");
  const t=at(nx,ny);
  if(!t)return end("The ball falls at the red X. Place a part there.");
  if(t.r!==d)return end("The ball hits the side of the "+TILES[t.k].n.toLowerCase()+". Tap it to turn it.");
  if(seen.has(nx+","+ny))return end("The ball goes around in a loop.");seen.add(nx+","+ny);
  const T=TILES[t.k],z2=z+T.dz,dout=(d+T.out+4)%4;
  if(z2<0)return end("The "+T.n.toLowerCase()+" sends the ball into the floor.");
  if(z2>MAXZ)return end("The "+T.n.toLowerCase()+" throws the ball too high.");
  steps.push({x:nx,y:ny,zin:z,zout:z2,din:d,dout,k:t.k});
  if(T.end)return {steps,win:true};
  x=nx;y=ny;z=z2;d=dout;
 }
 return {steps,fail:"The track is too long."};
}
function pts(q){
 const cx=(q.x+.5)*S,cy=(q.y+.5)*S,r=.3,ex=cx-DX[q.din]*S/2,ey=cy-DY[q.din]*S/2,ox=cx+DX[q.dout]*S/2,oy=cy+DY[q.dout]*S/2;
 if(q.k==="start")return [[cx,cy,q.zin+r],[ox,oy,q.zout+r]];
 if(q.k==="goal")return [[ex,ey,q.zin+r],[cx,cy,q.zin+r]];
 if(q.k==="spring"||q.k==="fan")return [[ex,ey,q.zin+r],[cx,cy,q.zin+r],[cx+(ox-cx)*.5,cy+(oy-cy)*.5,q.zout+r+.5],[ox,oy,q.zout+r]];
 if(q.k==="drop")return [[ex,ey,q.zin+r],[cx,cy,q.zin+r],[cx,cy,q.zout+r],[ox,oy,q.zout+r]];
 return [[ex,ey,q.zin+r],[cx,cy,(q.zin+q.zout)/2+r],[ox,oy,q.zout+r]];
}
function pl(a){c.beginPath();c.moveTo(a[0][0],a[0][1]);for(const p of a.slice(1))c.lineTo(p[0],p[1]);c.stroke();}
function poly(a,fill,line,w){c.beginPath();c.moveTo(a[0][0],a[0][1]);for(const p of a.slice(1))c.lineTo(p[0],p[1]);c.closePath();c.fillStyle=fill;c.fill();c.strokeStyle=line;c.lineWidth=w;c.stroke();}
function block(x,y,h,K){const X0=x*S,Y0=y*S,X1=X0+S,Y1=Y0+S;
 if(h>0){poly([P(X0,Y1,h),P(X1,Y1,h),P(X1,Y1,0),P(X0,Y1,0)],K.side,K.edge,1);poly([P(X1,Y0,h),P(X1,Y1,h),P(X1,Y1,0),P(X1,Y0,0)],K.side2,K.edge,1);}
 poly([P(X0,Y0,h),P(X1,Y0,h),P(X1,Y1,h),P(X0,Y1,h)],K.top,K.edge,1.2);}
function drawStep(q,i,now,K,ghost){
 c.globalAlpha=ghost?.45:1;const h=ghost?0:Math.min(q.zin,q.zout);block(q.x,q.y,h,K);
 const col=q.k==="start"?"#1f2328":TILES[q.k].c,pp=pts(q).map(p=>P(p[0],p[1],p[2]-.3));
 c.lineCap="round";c.lineJoin="round";c.strokeStyle=K.edge;c.lineWidth=7*s;pl(pp);c.strokeStyle=col;c.lineWidth=4*s;pl(pp);
 deco(c,P,q,s,run&&run.fired[i]!=null?(now-run.fired[i])/1000:-1,col,h);c.globalAlpha=1;}
function ball(p){const q=P(p[0],p[1],p[2]);c.fillStyle="#e8590c";c.strokeStyle="#1f2328";c.lineWidth=1.5;c.beginPath();c.arc(q[0],q[1],7*s,0,7);c.fill();c.stroke();}
function draw(now){
 now=now||performance.now();const K=SK[st.skin];c.setTransform(dpr,0,0,dpr,0,0);c.fillStyle=K.bg;c.fillRect(0,0,W,H);
 for(let y=0;y<N;y++)for(let x=0;x<N;x++)poly([P(x*S,y*S,0),P(x*S+S,y*S,0),P(x*S+S,y*S+S,0),P(x*S,y*S+S,0)],K.floor,K.line,1);
 tr=trace();const chain={};tr.steps.forEach((q,i)=>chain[q.x+","+q.y]=i);
 const cells=[];for(let y=0;y<N;y++)for(let x=0;x<N;x++)if(chain[x+","+y]!=null||at(x,y))cells.push([x,y]);
 cells.sort((a,b)=>a[0]+a[1]-b[0]-b[1]);
 for(const [x,y] of cells){const i=chain[x+","+y];
  if(i!=null)drawStep(tr.steps[i],i,now,K,false);
  else{const t=at(x,y);drawStep({x,y,zin:0,zout:0,din:t.r,dout:(t.r+TILES[t.k].out+4)%4,k:t.k},-1,now,K,true);}}
 if(tr.fail&&!run&&tr.fx>=0&&tr.fy>=0&&tr.fx<N&&tr.fy<N){const p=P((tr.fx+.5)*S,(tr.fy+.5)*S,0),r=8*s;
  c.strokeStyle="#c0262d";c.lineWidth=3;pl([[p[0]-r,p[1]-r/2],[p[0]+r,p[1]+r/2]]);pl([[p[0]+r,p[1]-r/2],[p[0]-r,p[1]+r/2]]);}
 if(run&&run.pos)ball(run.pos);else if(!run)ball(pts(tr.steps[0])[0]);
}
