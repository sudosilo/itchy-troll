(function(){
const NAV=[['Ships','fleet.html'],['Trains','trains.html'],['Planes','planes.html'],['Cars',[['Highway','cars.html'],['Car park','carpark.html']]],['Races',[['Cars','race.html'],['Boats','boatrace.html'],['Horses','horserace.html']]],['Satellites','satellites.html'],['City','city.html'],['Garden','garden.html'],['Warehouse','warehouse.html'],['Battle','battle.html'],['Animals',[['Fish','fish.html'],['Cats','cats.html'],['Dogs','dogs.html'],['Farm','farm.html'],['Birds','birds.html'],['Polar','polar.html'],['People','people.html'],['Snakes','snakes.html'],['Ants','ants.html']]]];
const here=(location.pathname.split('/').pop()||'index.html');
const isHome=!!document.getElementById('menu');
function build(cls){
  let h='';
  for(const [name,v] of NAV){
    if(Array.isArray(v)){const open=v.some(x=>x[1]===here);h+='<details class="'+cls+'-g"'+(open?' open':'')+'><summary>'+name+'</summary>';for(const [n2,u] of v)h+='<button class="'+cls+'-sub'+(u===here?' cur':'')+'" onclick="location.href=\''+u+'\'">'+n2+'</button>';h+='</details>';}
    else h+='<button class="'+(v===here?'cur':'')+'" onclick="location.href=\''+v+'\'">'+name+'</button>';
  }
  return h;
}
const st=document.createElement('style');
if(isHome){
  st.textContent='.menu details{border-bottom:1px solid #00ff00}.menu summary{color:#00ff00;padding:10px;font-family:monospace;font-size:16px;cursor:pointer;list-style:none}.menu summary::-webkit-details-marker{display:none}.menu summary::after{content:" +"}.menu details[open] summary::after{content:" -"}.menu details button{display:block;width:100%;padding-left:28px}';
  document.head.appendChild(st);
  const menu=document.getElementById('menu');
  [...menu.querySelectorAll('button')].forEach(b=>{const o=b.getAttribute('onclick')||'';if(/location\.href='[a-z0-9-]+\.html'/.test(o))b.remove();});
  menu.insertAdjacentHTML('beforeend',build('vm'));
  return;
}
st.textContent='.back{display:none!important}.vzm-btn{position:fixed;right:14px;top:calc(env(safe-area-inset-top,0px) + 12px);z-index:20;background:rgba(255,255,255,.9);color:#123a4a;border:0;border-radius:10px;padding:8px 14px;font:600 20px/1 "Avenir Next","Segoe UI",Roboto,Helvetica,Arial,sans-serif;cursor:pointer}'+
'.vzm-panel{position:fixed;right:14px;top:calc(env(safe-area-inset-top,0px) + 58px);z-index:20;width:210px;max-height:calc(100% - 80px);overflow:auto;background:#fff;border-radius:14px;box-shadow:0 6px 24px rgba(18,58,74,.18);padding:6px;display:none;font-family:"Avenir Next","Segoe UI",Roboto,Helvetica,Arial,sans-serif}'+
'.vzm-panel.open{display:block}.vzm-panel button,.vzm-panel summary{display:block;width:100%;text-align:left;background:none;border:0;border-radius:8px;padding:10px 12px;font-size:15px;font-weight:600;line-height:1.2;font-family:inherit;color:#123a4a;cursor:pointer;list-style:none}'+
'.vzm-panel summary::-webkit-details-marker{display:none}.vzm-panel summary::after{content:" +";color:#4f6f7c}.vzm-panel details[open] summary::after{content:" -"}.vzm-panel .vzm-sub{padding-left:26px;font-weight:500}.vzm-panel .cur{background:#eef4f6}.vzm-panel button:focus-visible,.vzm-btn:focus-visible{outline:3px solid #2f6fd6}';
document.head.appendChild(st);
const btn=document.createElement('button');btn.className='vzm-btn';btn.setAttribute('aria-label','Menu');btn.innerHTML='&#9776;';
const panel=document.createElement('div');panel.className='vzm-panel';panel.innerHTML='<button onclick="location.href=\'/\'">Home</button>'+build('vzm');
btn.onclick=e=>{e.stopPropagation();panel.classList.toggle('open');};
document.addEventListener('pointerdown',e=>{if(!panel.contains(e.target)&&e.target!==btn)panel.classList.remove('open');});
document.body.appendChild(btn);document.body.appendChild(panel);
})();
