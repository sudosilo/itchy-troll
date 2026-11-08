/* rainbow-run-stadium-v1-youtube.js
   BLUE PHONE: YouTube videos in stadium mode. The host pastes a YouTube link, and every seat phone plays that
   video full screen through YouTube's own embedded player, held in step with the server clock. The player is
   checked about once a second and jumps to where the show is whenever it drifts too far.

   YouTube does not let a page read the pixels of its player, so a YouTube video plays whole on every screen and
   cannot run as a video stunt across the crowd. Each phone streams it from YouTube itself.

   STADIUM_YT.parse(link) gives {id, start} or null.
   STADIUM_YT.sync(box, cue, nowMs) keeps a player in box playing the cue, or removes it when cue is not a
   YouTube cue. */
(function(){
"use strict";
let apiReady=null,player=null,key="",box=null,ready=false,lastCheck=0,wantSound=false,failed="";

function load(){
  if(apiReady)return apiReady;
  apiReady=new Promise(function(res){
    if(window.YT&&window.YT.Player){res();return}
    const prev=window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady=function(){if(prev)try{prev()}catch(e){}res()};
    const s=document.createElement("script");s.src="https://www.youtube.com/iframe_api";s.async=true;
    s.onerror=function(){apiReady=null;failed="YouTube did not load"};
    document.head.appendChild(s);
  });
  return apiReady;
}

/* Reads the video id and start time out of any usual YouTube link, or a bare id. */
function parse(link){
  link=String(link||"").trim();
  if(/^[A-Za-z0-9_-]{11}$/.test(link))return {id:link,start:0};
  let u;try{u=new URL(/^https?:\/\//i.test(link)?link:"https://"+link)}catch(e){return null}
  const host=u.hostname.replace(/^(www|m|music)\./,"");
  let id="";
  if(host==="youtu.be")id=u.pathname.slice(1,12);
  else if(host==="youtube.com"||host==="youtube-nocookie.com"){
    if(u.pathname==="/watch")id=u.searchParams.get("v")||"";
    else{const m=/^\/(embed|shorts|live|v)\/([A-Za-z0-9_-]{11})/.exec(u.pathname);if(m)id=m[2]}
  }
  if(!/^[A-Za-z0-9_-]{11}$/.test(id))return null;
  const t=u.searchParams.get("t")||u.searchParams.get("start")||"";
  let start=0;const hms=/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/.exec(t);
  if(hms)start=(+hms[1]||0)*3600+(+hms[2]||0)*60+(+hms[3]||0);
  return {id:id,start:Math.min(start,43200)};
}

function clear(){
  if(player){try{player.destroy()}catch(e){}}
  player=null;ready=false;key="";
  if(box){box.innerHTML="";box.style.display="none"}
}

/* Sizes the player to show the whole video, or to fill the screen and crop the edges. */
function fit(cue){
  if(!box)return;const f=box.firstElementChild;if(!f)return;
  const W=box.clientWidth,H=box.clientHeight,ar=16/9;
  let w=W,h=W/ar;
  if(cue.fit==="cover"){if(h<H){h=H;w=H*ar}}else if(h>H){h=H;w=H*ar}
  f.style.cssText="position:absolute;left:"+((W-w)/2)+"px;top:"+((H-h)/2)+"px;width:"+w+"px;height:"+h+"px;border:0";
}

function target(cue,now){
  const t=(now-cue.at)/1000+(cue.start||0);
  if(!ready)return t;
  const d=player.getDuration?player.getDuration():0;
  if(cue.loop&&d>0)return (cue.start||0)+(((now-cue.at)/1000)%Math.max(1,d-(cue.start||0)));
  return t;
}

function sync(el,cue,now,opts){
  opts=opts||{};
  if(!cue||(cue.type!=="youtube"&&cue.type!=="share")||!cue.id){if(player||key)clear();return}
  const k=cue.id+"|"+cue.at;
  if(box!==el){clear();box=el}
  if(key!==k){
    clear();box=el;key=k;box.style.display="block";
    const holder=document.createElement("div");box.appendChild(holder);
    wantSound=!cue.muted&&!opts.muted;
    load().then(function(){
      if(key!==k)return;
      player=new YT.Player(holder,{videoId:cue.id,width:"100%",height:"100%",
        playerVars:{autoplay:0,controls:0,disablekb:1,fs:0,iv_load_policy:3,modestbranding:1,playsinline:1,rel:0,start:Math.floor(cue.start||0)},
        events:{
          onReady:function(){if(key!==k)return;ready=true;if(wantSound)player.unMute();else player.mute();fit(cue)},
          onAutoplayBlocked:function(){try{player.mute();player.playVideo()}catch(e){}},
          onError:function(e){failed=e&&(e.data===101||e.data===150)?"that video's owner does not allow it to play on other sites":"YouTube could not play that video"}
        }});
      fit(cue);
    });
    return;
  }
  fit(cue);
  if(!ready||now<cue.at-200)return;
  if(now-lastCheck<900)return;lastCheck=now;
  const st=player.getPlayerState(),d=player.getDuration()||0,tgt=target(cue,now);
  if(!cue.loop&&d>0&&tgt>d){if(st===1)player.pauseVideo();return}
  if(st!==1&&st!==3){player.seekTo(Math.max(0,tgt),true);player.playVideo();return}
  const off=tgt-player.getCurrentTime();
  if(Math.abs(off)>0.3)player.seekTo(Math.max(0,tgt+0.15),true);
}

window.STADIUM_YT={parse:parse,sync:sync,clear:clear,get error(){return failed},set error(v){failed=v||""}};
})();
