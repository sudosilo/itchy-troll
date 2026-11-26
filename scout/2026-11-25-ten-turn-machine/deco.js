// Draws the moving part on top of a tile. f is seconds since the ball reached it, or -1.
function deco(c,P,q,s,f,col,z){
 const S=64,cx=(q.x+.5)*S,cy=(q.y+.5)*S,k=q.k;
 c.strokeStyle=col;c.fillStyle=col;c.lineWidth=2.2*s;
 const L=(a,b)=>{c.beginPath();c.moveTo(a[0],a[1]);c.lineTo(b[0],b[1]);c.stroke();};
 const ez=t=>t<0?0:Math.min(1,t);
 if(k==="bell"){
  const px=cx-DY[q.din]*20,py=cy+DX[q.din]*20,top=P(cx,cy,z+1.5),hang=P(cx,cy,z+.62);
  L(P(px,py,z),P(px,py,z+1.5));L(P(px,py,z+1.5),top);
  const w=f<0?0:Math.sin(f*25)*Math.max(0,1-f)*.5,hh=hang[1]-top[1];
  c.save();c.translate(top[0],top[1]);c.rotate(w);c.beginPath();c.moveTo(-10*s,hh);
  c.quadraticCurveTo(-9*s,hh*.25,0,hh*.25);c.quadraticCurveTo(9*s,hh*.25,10*s,hh);c.closePath();c.fill();c.restore();
 } else if(k==="spring"){
  const sq=f>=0&&f<.25?.12:.4,a=[];
  for(let i=0;i<=6;i++){const p=P(cx,cy,z+sq*i/6);a.push([p[0]+(i>0&&i<6?(i%2?6:-6)*s:0),p[1]]);}
  c.beginPath();c.moveTo(a[0][0],a[0][1]);a.forEach(p=>c.lineTo(p[0],p[1]));c.stroke();
 } else if(k==="fan"){
  const px=cx-DX[q.din]*16,py=cy-DY[q.din]*16,p=P(px,py,z+.15),r=10*s;
  c.beginPath();c.arc(p[0],p[1],r,0,7);c.stroke();const a=f<0?0:f*18;
  for(let i=0;i<3;i++){const t=a+i*2.09;L(p,[p[0]+Math.cos(t)*r,p[1]+Math.sin(t)*r]);}
 } else if(k==="dominoes"){
  const ox=-DY[q.din]*14,oy=DX[q.din]*14;
  for(let i=0;i<3;i++){const u=(i-1)*.28*S,bx=cx+DX[q.din]*u+ox,by=cy+DY[q.din]*u+oy;
   const a=f<0?0:ez((f-i*.12)/.2)*1.3;
   L(P(bx,by,z),P(bx+DX[q.din]*Math.sin(a)*20,by+DY[q.din]*Math.sin(a)*20,z+.8*Math.cos(a)));}
 } else if(k==="drop"){
  const p=P(cx,cy,q.zin);c.beginPath();c.ellipse(p[0],p[1],16*s,8*s,0,0,7);c.stroke();
 } else if(k==="goal"){
  const p=P(cx,cy,z);c.globalAlpha*=.6;c.beginPath();c.ellipse(p[0],p[1],18*s,9*s,0,0,7);c.fill();c.globalAlpha/=.6;
 } else if(k==="start"){
  const a=P(cx-18,cy-18,z),b=P(cx-18,cy-18,z+1.4);L(a,b);c.fillStyle="#e8590c";
  c.beginPath();c.moveTo(b[0],b[1]);c.lineTo(b[0]+14*s,b[1]+5*s);c.lineTo(b[0],b[1]+10*s);c.closePath();c.fill();
 }
}
