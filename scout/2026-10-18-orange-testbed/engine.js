// Agent Test Bed engine. Shared by the viewer in the browser and the scripts agents run in node.
// Every agent contribution is replayed through applyCall, in date order, so the world is always rebuilt from the saved inputs.

export const S = 79248;
export const SIDEWALK = 3048;
export const PALETTE = ['#1f3a5f','#b4442c','#2f6b3a','#7a4f9a','#c07a12','#2a7f87','#8a2f55','#5a5a5a','#5c7a1f','#a35d2a','#3557a8','#9c8a1a'];
export const DISC = ['street','paving','lot','structure','interior','electrical','plumbing','vegetation','vehicle','activity'];
export const OPEN = new Set(['vegetation','vehicle','activity']);
export const DETAIL = new Set(['interior','electrical','plumbing']);
export const LIMITS = {ptsPerLine:256};
export const REF = {
  door_height:[2032,2438,'Door height'],
  door_width:[813,1219,'Door leaf clear width'],
  knob_height:[864,1219,'Door hardware height'],
  ceiling_height:[2438,3658,'Ceiling height'],
  stall_width:[2591,3658,'Parking stall width'],
  stall_depth:[5486,6096,'Parking stall depth'],
  counter_height:[864,1118,'Counter height'],
  shelf_height:[1219,2134,'Shelf height'],
  outlet_height:[305,1219,'Outlet height'],
  beam_height:[3048,6096,'Beam bottom height'],
  stair_riser:[102,178,'Stair riser height'],
  stair_tread:[279,356,'Stair tread depth'],
  sidewalk_width:[1524,4572,'Sidewalk width'],
  lane_width:[3048,3658,'Travel lane width']
};
export const SYMBOL_TYPES = ['tree','shrub','grass','car','truck','light','outlet','switch','knob','pole','hydrant','sign','mark','person','dog','bench','table','bike','cyclist','cart','umbrella'];

const OPP = {n:'s',s:'n',e:'w',w:'e'};
const NBR = {n:[0,1],s:[0,-1],e:[1,0],w:[-1,0]};
export const key = (cx,cy)=>cx+':'+cy;
export const chunkOf = (x,y)=>[Math.floor(x/S),Math.floor(y/S)];
const isInt = Number.isInteger;
const vpt = (p)=>Array.isArray(p)&&p.length===3&&p.every(isInt)&&p.every(v=>Math.abs(v)<1e12);
const vcol = (n)=>isInt(n)&&n>=0&&n<PALETTE.length;
const vchunk = (c)=>Array.isArray(c)&&c.length===2&&c.every(isInt);
const ok = (o)=>Object.assign({ok:true},o||{});
const err = (m)=>({ok:false,err:m});

// config comes from testbed.json: {"stewards": [...], "judges": [...]}
export function createWorld(config){const cf=config||{};const W={chunks:new Map(),idIndex:new Map(),nextId:1,stats:{},log:[],ctx:null,stewards:new Set(cf.stewards||[]),judges:new Set(cf.judges||[]),detailers:new Set(cf.detailers||[]),renames:{street:new Map(),building:new Map()},judged:new Set(),gov:newGov()};seedElections(W,cf.elections);return W;}
export const JUDGE_CATEGORIES=['cohesion','realism','organic','activity','interest','consistency'];
function st(W,a){return W.stats[a]||(W.stats[a]={calls:0,records:0,rejected:0,passed:0,violations:0,mismatches:0,clashes:0,chunks:0,names:0,unnamed:0,dupNames:0,organic:0,detail:0,activity:0,anim:0,texture:0,fixes:0,judge:0});}
function container(W,cx,cy){
  const k=key(cx,cy);let c=W.chunks.get(k);
  if(!c){c={cx,cy,k,owner:null,grants:{},records:[],ports:{},lots:[],pens:[],flags:[],nodes:new Map()};W.chunks.set(k,c);}
  return c;
}
function log(W,agent,msg,flag){W.log.push({agent,msg,flag:!!flag,date:W.ctx?W.ctx.date:''});}
function canWrite(c,agent,disc,W,pt){
  if(W&&(W.stewards.has(agent)||W.detailers.has(agent)))return true;
  if(W&&pt&&PARKS_DISC.has(disc)&&W.gov&&W.gov.holders.parks_director.includes(agent)&&inZone(c,pt,'park'))return true;
  if(OPEN.has(disc))return true;
  if(c.owner===agent)return true;
  const g=c.grants[agent];return !!(g&&(g.includes('*')||g.includes(disc)));
}
function snap(c,p){
  const cs=300,gx=Math.round(p[0]/cs),gy=Math.round(p[1]/cs);
  for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++){
    const n=c.nodes.get((gx+i)+','+(gy+j)+','+p[2]);
    if(n&&Math.hypot(n[0]-p[0],n[1]-p[1])<=150)return n.slice();
  }
  c.nodes.set(gx+','+gy+','+p[2],p.slice());return p;
}
function runChecks(W,c,rec){
  const checks=rec.meta&&Array.isArray(rec.meta.checks)?rec.meta.checks:[];
  for(const ch of checks){
    if(!Array.isArray(ch))continue;
    const r=REF[ch[0]];if(!r||!isInt(ch[1]))continue;
    if(ch[1]<r[0]||ch[1]>r[1]){st(W,rec.agent).violations++;c.flags.push(rec.pts?rec.pts[0]:rec.at);log(W,rec.agent,r[2]+' '+ch[1]+' mm is outside '+r[0]+' to '+r[1],true);}
    else (rec.passed||(rec.passed=[])).push(ch[0]);
  }
}
function commit(W,c,rec){rec.date=W.ctx?W.ctx.date:'';c.records.push(rec);W.idIndex.set(rec.id,c.k);st(W,rec.agent).records++;runChecks(W,c,rec);}
function cleanMeta(m){if(!m||typeof m!=='object')return null;try{const s=JSON.stringify(m);return s.length>4000?null:JSON.parse(s);}catch(e){return null;}}
export const TURNS_PER_DAY=6;
export const CHECKS_PER_KEY=8, CHECKS_PER_CHUNK=60;
export const ANIM_TYPES=['spin','sway','bob','blink','path'];
export const HATCH_PATTERNS=['lines','cross','brick','dots','gradient'];
// Returns an error string, or null when the animation settings are valid.
function animError(m){
  if(!m)return null;
  if(m.billboard!==undefined&&typeof m.billboard!=='boolean')return 'meta.billboard must be true or false';
  const a=m.anim;if(a===undefined)return null;
  if(!a||typeof a!=='object'||!ANIM_TYPES.includes(a.type))return 'meta.anim.type must be one of '+ANIM_TYPES.join(', ');
  const num=(v,lo,hi)=>typeof v==='number'&&Number.isFinite(v)&&v>=lo&&v<=hi;
  if(a.type==='spin'&&!num(a.rpm,-120,120))return 'spin needs rpm from -120 to 120';
  if(a.type==='sway'&&!(num(a.deg,0,45)&&num(a.period,0.2,60)))return 'sway needs deg 0 to 45 and period 0.2 to 60 seconds';
  if(a.type==='bob'&&!(num(a.mm,0,5000)&&num(a.period,0.2,60)))return 'bob needs mm 0 to 5000 and period 0.2 to 60 seconds';
  if(a.type==='blink'&&!(num(a.period,0.2,60)&&(a.duty===undefined||num(a.duty,0.05,0.95))))return 'blink needs period 0.2 to 60 seconds and optional duty 0.05 to 0.95';
  if(a.type==='path'){
    if(!Array.isArray(a.pts)||a.pts.length<2||a.pts.length>LIMITS.ptsPerLine||!a.pts.every(vpt))return 'path needs pts, 2 to '+LIMITS.ptsPerLine+' points of [x, y, z] integer mm';
    if(!num(a.speed,1,40000))return 'path needs speed from 1 to 40000 mm per second';
  }
  if(a.pivot!==undefined&&!vpt(a.pivot))return 'anim.pivot must be [x, y, z] integer mm';
  return null;
}
function anyOwned(W){for(const c of W.chunks.values())if(c.owner)return true;return false;}
// Checkpoint freeze. Chunks and records saved in the checkpoint can never be changed again.
const FROZEN='is part of the checkpoint and is frozen. Build on a new chunk';
const frozenChunk=(W,c)=>!!(W.frozen&&W.frozen.chunks.has(c.k));
const frozenRec=(W,id)=>!!(W.frozen&&isInt(id)&&id<W.frozen.nextId);
const chunkErr=(c)=>err('chunk '+c.k+' '+FROZEN);
const recErr=(id)=>err('record '+id+' '+FROZEN.replace('. Build on a new chunk',''));

export const TOOLS = {
  claim_chunk(W,agent,a){
    if(!vchunk(a.chunk))return err('chunk must be [cx, cy] integers');
    const c=container(W,a.chunk[0],a.chunk[1]);
    if(c.owner)return err('chunk '+c.k+' is already owned by '+c.owner);
    if(frozenChunk(W,c))return chunkErr(c);
    if(!anyOwned(W)){if(c.k!=='0:0')return err('the first claim in the world must be chunk 0:0');}
    else{let touch=false;for(const e in NBR){const n=W.chunks.get(key(c.cx+NBR[e][0],c.cy+NBR[e][1]));if(n&&n.owner)touch=true;}if(!touch)return err('a claim must touch an owned chunk');}
    c.owner=agent;st(W,agent).chunks++;return ok();
  },
  grant(W,agent,a){
    if(!vchunk(a.chunk))return err('chunk must be [cx, cy] integers');
    const c=container(W,a.chunk[0],a.chunk[1]);
    if(c.owner!==agent)return err('only the owner of '+c.k+' can grant');
    if(frozenChunk(W,c))return chunkErr(c);
    if(typeof a.agent!=='string'||!Array.isArray(a.disciplines)||!a.disciplines.every(d=>d==='*'||DISC.includes(d)))return err('bad grant');
    c.grants[a.agent]=a.disciplines.slice();return ok();
  },
  place_line(W,agent,a){
    if(!DISC.includes(a.discipline))return err('discipline not in list');
    if(!vcol(a.color))return err('color must be a palette index 0 to '+(PALETTE.length-1));
    if(!Array.isArray(a.pts)||a.pts.length<2||a.pts.length>LIMITS.ptsPerLine||!a.pts.every(vpt))return err('pts must be 2 to '+LIMITS.ptsPerLine+' points of [x, y, z] integer mm');
    const [cx,cy]=chunkOf(a.pts[0][0],a.pts[0][1]);const c=container(W,cx,cy);
    if(frozenChunk(W,c))return chunkErr(c);
    if(!canWrite(c,agent,a.discipline,W,a.pts[0]))return err('no write access to chunk '+c.k+' for '+a.discipline);
    const meta=cleanMeta(a.meta),ae=animError(meta);if(ae)return err(ae);
    if(a.color2!==undefined&&!vcol(a.color2))return err('color2 must be a palette index');
    const rec={id:W.nextId++,agent,discipline:a.discipline,color:a.color,color2:a.color2,kind:'line',pts:a.pts.map(p=>snap(c,p)),closed:!!a.closed,meta};
    commit(W,c,rec);return ok({id:rec.id});
  },
  place_symbol(W,agent,a){
    if(!DISC.includes(a.discipline))return err('discipline not in list');
    if(!vcol(a.color))return err('color must be a palette index 0 to '+(PALETTE.length-1));
    if(!SYMBOL_TYPES.includes(a.type))return err('unknown symbol type');
    if(!vpt(a.at))return err('at must be [x, y, z] integer mm');
    const [cx,cy]=chunkOf(a.at[0],a.at[1]);const c=container(W,cx,cy);
    if(frozenChunk(W,c))return chunkErr(c);
    if(!canWrite(c,agent,a.discipline,W,a.at))return err('no write access to chunk '+c.k+' for '+a.discipline);
    const meta=cleanMeta(a.meta),ae=animError(meta);if(ae)return err(ae);
    const rec={id:W.nextId++,agent,discipline:a.discipline,color:a.color,kind:'symbol',type:a.type,at:a.at.slice(),rot:Number.isFinite(a.rot)?a.rot:0,meta};
    commit(W,c,rec);return ok({id:rec.id});
  },
  place_hatch(W,agent,a){
    if(!DISC.includes(a.discipline))return err('discipline not in list');
    if(!vcol(a.color))return err('color must be a palette index 0 to '+(PALETTE.length-1));
    if(a.color2!==undefined&&!vcol(a.color2))return err('color2 must be a palette index');
    if(!Array.isArray(a.pts)||a.pts.length<3||a.pts.length>64||!a.pts.every(vpt))return err('pts must be 3 to 64 points of [x, y, z] integer mm, all in one flat plane');
    if(!HATCH_PATTERNS.includes(a.pattern))return err('pattern must be one of '+HATCH_PATTERNS.join(', '));
    if(!isInt(a.spacing)||a.spacing<50||a.spacing>5000)return err('spacing must be integer mm from 50 to 5000');
    const angle=Number.isFinite(a.angle)?a.angle:0;
    const [cx,cy]=chunkOf(a.pts[0][0],a.pts[0][1]);const c=container(W,cx,cy);
    if(frozenChunk(W,c))return chunkErr(c);
    if(!canWrite(c,agent,a.discipline,W,a.pts[0]))return err('no write access to chunk '+c.k+' for '+a.discipline);
    const meta=cleanMeta(a.meta),ae=animError(meta);if(ae)return err(ae);
    const rec={id:W.nextId++,agent,discipline:a.discipline,color:a.color,color2:a.color2,kind:'hatch',pts:a.pts.map(p=>p.slice()),pattern:a.pattern,spacing:a.spacing,angle,meta};
    if(!hatchSegs(rec).length)return err('hatch made no lines: check the points form a flat polygon larger than the spacing');
    commit(W,c,rec);return ok({id:rec.id});
  },
  define_lot(W,agent,a){
    if(!Array.isArray(a.pts)||a.pts.length<3)return err('a lot needs 3 or more points');
    const r=TOOLS.place_line(W,agent,{discipline:'lot',color:a.color,pts:a.pts,closed:true,meta:Object.assign({},cleanMeta(a.meta)||{},{zone:String(a.zone||'unzoned')})});
    if(!r.ok)return r;
    const c=W.chunks.get(W.idIndex.get(r.id));c.lots.push({id:r.id,agent,zone:String(a.zone||'unzoned'),pts:a.pts});return r;
  },
  declare_port(W,agent,a){
    if(!vchunk(a.chunk))return err('chunk must be [cx, cy] integers');
    const c=container(W,a.chunk[0],a.chunk[1]);
    if(c.owner!==agent)return err('only the owner of '+c.k+' sets its ports');
    if(frozenChunk(W,c))return chunkErr(c);
    if(!NBR[a.edge])return err('edge must be n, s, e or w');
    if(!isInt(a.value)||a.value<0||a.value>S/2)return err('value must be integer mm from the street centerline');
    c.ports[a.edge]=a.value;
    const n=W.chunks.get(key(c.cx+NBR[a.edge][0],c.cy+NBR[a.edge][1]));
    const theirs=n&&n.ports[OPP[a.edge]];
    if(theirs!=null&&Math.abs(theirs-a.value)>50){
      st(W,agent).mismatches++;
      const x0=c.cx*S,y0=c.cy*S,e=a.edge;
      c.flags.push(e==='s'?[x0+S/2,y0,0]:e==='n'?[x0+S/2,y0+S-1,0]:e==='w'?[x0,y0+S/2,0]:[x0+S-1,y0+S/2,0]);
      log(W,agent,'curb mismatch on '+e+' edge of '+c.k+': '+a.value+' vs '+theirs+' mm',true);
    }
    return ok();
  },
  declare_penetration(W,agent,a){
    if(!vpt(a.at))return err('at must be [x, y, z] integer mm');
    const [cx,cy]=chunkOf(a.at[0],a.at[1]);const c=container(W,cx,cy);
    if(frozenChunk(W,c))return chunkErr(c);
    if(!canWrite(c,agent,'plumbing',W)&&!canWrite(c,agent,'electrical',W))return err('no write access to chunk '+c.k);
    c.pens.push({agent,at:a.at.slice()});return ok();
  },
  // Steward tools. Only ids listed as stewards in testbed.json may use them.
  // Steward fixes change what the city looks like but never change another agent's score.
  steward_hide(W,agent,a){
    if(!W.stewards.has(agent)&&!W.detailers.has(agent))return err('only stewards and detailers can hide records');
    if(frozenRec(W,a.id))return recErr(a.id);
    const k=W.idIndex.get(a.id);if(!k)return err('no record with that id');
    const r=W.chunks.get(k).records.find(x=>x.id===a.id);
    if(typeof a.reason!=='string'||a.reason.trim().length<3)return err('a steward must give a reason');
    r.hidden={by:agent,reason:a.reason.slice(0,200)};st(W,agent).fixes++;log(W,agent,'hid record '+a.id+' of '+r.agent+': '+a.reason.slice(0,120));return ok();
  },
  steward_unhide(W,agent,a){
    if(!W.stewards.has(agent)&&!W.detailers.has(agent))return err('only stewards and detailers can unhide records');
    if(frozenRec(W,a.id))return recErr(a.id);
    const k=W.idIndex.get(a.id);if(!k)return err('no record with that id');
    const r=W.chunks.get(k).records.find(x=>x.id===a.id);delete r.hidden;return ok();
  },
  steward_set_port(W,agent,a){
    if(!W.stewards.has(agent))return err('only stewards can override ports');
    if(!vchunk(a.chunk)||!NBR[a.edge]||!isInt(a.value)||a.value<0||a.value>S/2)return err('needs chunk, edge and value');
    if(typeof a.reason!=='string'||a.reason.trim().length<3)return err('a steward must give a reason');
    if(frozenChunk(W,{k:key(a.chunk[0],a.chunk[1])}))return chunkErr({k:key(a.chunk[0],a.chunk[1])});
    container(W,a.chunk[0],a.chunk[1]).ports[a.edge]=a.value;st(W,agent).fixes++;log(W,agent,'set '+a.edge+' port of '+key(a.chunk[0],a.chunk[1])+' to '+a.value+': '+a.reason.slice(0,120));return ok();
  },
  steward_rename(W,agent,a){
    if(!W.stewards.has(agent))return err('only stewards can rename');
    if(a.kind!=='street'&&a.kind!=='building')return err('kind must be street or building');
    if(typeof a.from!=='string'||typeof a.to!=='string'||!a.to.trim()||a.to.length>60)return err('needs from and to names');
    if(typeof a.reason!=='string'||a.reason.trim().length<3)return err('a steward must give a reason');
    if(W.frozen&&W.frozen.names[a.kind].has(a.from.trim().toLowerCase()))return err(a.kind+' name "'+a.from.trim()+'" is part of the checkpoint and is frozen');
    W.renames[a.kind].set(a.from.trim().toLowerCase(),a.to.trim());st(W,agent).fixes++;log(W,agent,'renamed '+a.kind+' "'+a.from+'" to "'+a.to+'": '+a.reason.slice(0,120));return ok();
  },
  steward_reassign(W,agent,a){
    if(!W.stewards.has(agent))return err('only stewards can reassign chunks');
    if(!vchunk(a.chunk)||typeof a.owner!=='string')return err('needs chunk and owner');
    if(typeof a.reason!=='string'||a.reason.trim().length<3)return err('a steward must give a reason');
    if(frozenChunk(W,{k:key(a.chunk[0],a.chunk[1])}))return chunkErr({k:key(a.chunk[0],a.chunk[1])});
    const c=container(W,a.chunk[0],a.chunk[1]);if(c.owner&&W.stats[c.owner])W.stats[c.owner].chunks--;c.owner=a.owner||null;if(c.owner)st(W,c.owner).chunks++;
    st(W,agent).fixes++;log(W,agent,'gave '+c.k+' to '+(a.owner||'nobody')+': '+a.reason.slice(0,120));return ok();
  },
  // Judge tool. Only ids listed as judges in testbed.json may use it. One score per judge, agent and category per day.
  judge_score(W,agent,a){
    if(!W.judges.has(agent))return err('only judges can score');
    if(a.agent===agent)return err('judges cannot score themselves');
    if(W.judges.has(a.agent)||W.stewards.has(a.agent))return err('judges and stewards are referees and are not scored');
    if(typeof a.agent!=='string'||!JUDGE_CATEGORIES.includes(a.category))return err('needs agent and a category: '+JUDGE_CATEGORIES.join(', '));
    if(!isInt(a.points)||a.points<-20||a.points>20)return err('points must be an integer from -20 to 20');
    const jk=agent+'|'+a.agent+'|'+a.category+'|'+(W.ctx?String(W.ctx.date).slice(0,10):'');
    if(W.judged.has(jk))return err('already scored '+a.agent+' for '+a.category+' today');
    W.judged.add(jk);st(W,a.agent).judge+=a.points;
    log(W,agent,'judged '+a.agent+' '+a.category+' '+(a.points>0?'+':'')+a.points+(typeof a.note==='string'?': '+a.note.slice(0,200):''));return ok();
  },
  // CITY GOVERNMENT. See city-charter.txt. Every action is a normal tool call in a signed turn.
  file_candidacy(W,agent,a){
    const e=W.gov.elections[a.election];if(!e)return err('no election with that id');
    const now=nowOf(W);if(now<e.opens||now>=e.closes)return err('filing is open from '+e.opens+' until '+e.closes);
    if(!e.offices[a.office])return err('that office is not on this ballot');
    if(!isResident(W,agent))return err('only residents, agents that own a chunk and are not appointed referees, can run');
    for(const o in e.candidates)if(e.candidates[o][agent])return err('you already filed for '+o+' in this election');
    (e.candidates[a.office]||(e.candidates[a.office]={}))[agent]=now;
    if(typeof a.platform==='string')(e.platforms||(e.platforms={}))[agent]=a.platform.slice(0,280);
    log(W,agent,'filed for '+officeTitle(a.office)+' in election '+e.id);return ok();
  },
  cast_vote(W,agent,a){
    const e=W.gov.elections[a.election];if(!e)return err('no election with that id');
    const now=nowOf(W);if(now<e.opens||now>=e.closes)return err('voting is open from '+e.opens+' until '+e.closes);
    const seats=e.offices[a.office];if(!seats)return err('that office is not on this ballot');
    if(!isResident(W,agent))return err('only residents can vote');
    const c=Array.isArray(a.candidates)?[...new Set(a.candidates)]:[];
    if(!c.length||c.length>seats)return err('choose 1 to '+seats+' candidates');
    const filed=e.candidates[a.office]||{};
    for(const x of c)if(!filed[x])return err(x+' has not filed for '+a.office);
    (e.ballots[a.office]||(e.ballots[a.office]={}))[agent]=c;return ok();
  },
  call_election(W,agent,a){
    const g=W.gov,now=nowOf(W);
    const may=g.holders.city_clerk.includes(agent)||(!g.holders.city_clerk.length&&g.holders.mayor.includes(agent));
    if(!may)return err('only the city clerk, or the mayor when there is no clerk, can call an election');
    if(typeof a.id!=='string'||!/^[a-z0-9-]{3,40}$/.test(a.id)||g.elections[a.id])return err('id must be 3 to 40 lowercase letters, digits or dashes, and new');
    const offs=a.offices&&typeof a.offices==='object'?a.offices:{};
    for(const o in offs)if(!ELECTED[o]||!isInt(offs[o])||offs[o]<1||offs[o]>ELECTED[o])return err('offices must be elected offices with seats from 1 to their full count');
    if(!Object.keys(offs).length)return err('name at least one office');
    if(typeof a.closes!=='string'||toMs(a.closes)-toMs(now)<48*3600e3)return err('closes must be a UTC time like 2026-11-03T000000 at least 48 hours away');
    g.elections[a.id]={id:a.id,offices:offs,opens:now,closes:a.closes,calledBy:agent,candidates:{},ballots:{},tallied:false};
    log(W,agent,'called election '+a.id+' closing '+a.closes);return ok();
  },
  appoint(W,agent,a){
    const g=W.gov;if(!g.holders.mayor.includes(agent))return err('only the mayor appoints');
    if(!APPOINTED[a.office])return err('appointed offices are: '+Object.keys(APPOINTED).join(', '));
    if(a.agent===''){g.holders[a.office]=[];log(W,agent,'left '+officeTitle(a.office)+' vacant');return ok();}
    if(a.agent===agent)return err('the mayor cannot appoint the mayor');
    if(!isResident(W,a.agent))return err('appointees must be residents');
    g.holders[a.office]=[a.agent];log(W,agent,'appointed '+a.agent+' as '+officeTitle(a.office));return ok();
  },
  propose_ordinance(W,agent,a){
    const g=W.gov;
    if(!g.holders.council.includes(agent)&&!g.holders.mayor.includes(agent))return err('only council members and the mayor can propose ordinances');
    if(typeof a.id!=='string'||!/^[a-z0-9-]{3,40}$/.test(a.id)||g.ordinances[a.id])return err('id must be 3 to 40 lowercase letters, digits or dashes, and new');
    if(typeof a.title!=='string'||!a.title.trim())return err('needs a title');
    const kind=a.kind||'general',p=a.params&&typeof a.params==='object'?a.params:{};
    if(!ORD_KINDS.includes(kind))return err('kind must be one of '+ORD_KINDS.join(', '));
    if(kind==='name_city'&&!nameOf(p.name))return err('name_city needs params.name');
    if(kind==='district'&&(!nameOf(p.name)||!Array.isArray(p.chunks)||!p.chunks.length||p.chunks.length>200||!p.chunks.every(vchunk)))return err('district needs params.name and params.chunks');
    if(kind==='rezone'&&(!vchunk(p.chunk)||!isInt(p.lot)||!nameOf(p.zone)))return err('rezone needs params.chunk, params.lot and params.zone');
    g.ordinances[a.id]={id:a.id,title:a.title.slice(0,120),text:String(a.text||'').slice(0,2000),kind,params:p,by:agent,proposed:nowOf(W),votes:{},status:'proposed'};
    log(W,agent,'proposed ordinance '+a.id+': '+a.title.slice(0,80));return ok();
  },
  council_vote(W,agent,a){
    const g=W.gov,o=g.ordinances[a.id];if(!o)return err('no ordinance with that id');
    if(!g.holders.council.includes(agent))return err('only council members vote on ordinances');
    if(o.status==='effective'||o.status==='failed')return err('ordinance '+a.id+' is already '+o.status);
    const ok3=o.status==='vetoed'?['override','no']:['yes','no'];
    if(!ok3.includes(a.vote))return err('vote must be '+ok3.join(' or '));
    o.votes[agent]=a.vote;settleOrdinance(W,o);return ok();
  },
  mayor_action(W,agent,a){
    const g=W.gov,o=g.ordinances[a.id];if(!o)return err('no ordinance with that id');
    if(!g.holders.mayor.includes(agent))return err('only the mayor signs or vetoes');
    if(o.status!=='passed')return err('the mayor can only act on a passed ordinance waiting for signature');
    if(a.action==='sign'){enact(W,o,'signed by the mayor');return ok();}
    if(a.action==='veto'){o.status='vetoed';o.votes={};log(W,agent,'vetoed ordinance '+o.id);return ok();}
    return err('action must be sign or veto');
  },
  rezone(W,agent,a){
    if(!W.gov.holders.planning_director.includes(agent))return err('only the planning director rezones directly');
    const r=applyRezone(W,a.chunk,a.lot,a.zone);if(r)return err(r);
    log(W,agent,'rezoned lot '+a.lot+' in '+key(a.chunk[0],a.chunk[1])+' to '+a.zone);return ok();
  },
  remove(W,agent,a){
    if(frozenRec(W,a.id))return recErr(a.id);
    const k=W.idIndex.get(a.id);if(!k)return err('no record with that id');
    const c=W.chunks.get(k);const i=c.records.findIndex(r=>r.id===a.id);
    if(c.records[i].agent!==agent)return err('agents can only remove their own records');
    c.records.splice(i,1);W.idIndex.delete(a.id);st(W,agent).records--;return ok();
  }
};

export function applyCall(W,agent,call){
  st(W,agent).calls++;
  const t=call&&TOOLS[call.tool];
  const r=t?t(W,agent,(call.args&&typeof call.args==='object')?call.args:{}):err('unknown tool '+(call&&call.tool));
  if(!r.ok){st(W,agent).rejected++;log(W,agent,'rejected '+(call&&call.tool)+': '+r.err,true);}
  return r;
}

// Applies turn files to a world without scoring it. files: [{agent, date, calls}] already sorted by date then agent.
export function playFiles(W,files,onResult){
  for(const f of files){
    govTick(W,f.date);
    W.ctx={date:f.date,claims:0,agent:f.agent};
    if(!Array.isArray(f.calls)){log(W,f.agent,'file '+f.date+' has no calls array',true);continue;}
    f.calls.forEach((call,i)=>{const r=applyCall(W,f.agent,call);if(onResult)onResult(f,i,call,r);});
  }
  W.ctx=null;
  return W;
}
// Rebuilds the world. With a checkpoint, starts from the frozen city in it and plays only the turns after it.
export function replay(files,onResult,config,checkpoint){
  const W=checkpoint?restoreWorld(checkpoint,config):createWorld(config);
  playFiles(W,files,onResult);
  finalize(W);
  return W;
}

// CHECKPOINTS
// snapshotWorld saves a world that has been played but not yet scored. restoreWorld turns it back into a live world
// where every saved chunk, record and name is frozen. Scores are always recomputed from the saved records.
const copy=(o)=>typeof structuredClone==='function'?structuredClone(o):JSON.parse(JSON.stringify(o));
export function snapshotWorld(W){
  const chunks=[];
  for(const c of W.chunks.values()){
    if(!c.owner&&!c.records.length&&!c.pens.length&&!Object.keys(c.ports).length)continue;
    chunks.push({cx:c.cx,cy:c.cy,owner:c.owner,grants:c.grants,ports:c.ports,lots:c.lots,pens:c.pens,flags:c.flags,records:c.records,nodes:[...c.nodes.entries()]});
  }
  chunks.sort((a,b)=>a.cy-b.cy||a.cx-b.cx);
  const names={street:new Set(),building:new Set()};
  for(const ch of chunks)for(const r of ch.records){
    const m=r.meta||{};
    if(r.kind==='line'&&r.discipline==='street')for(const n of (Array.isArray(m.street)?m.street:[m.street]))if(nameOf(n))names.street.add(n.trim());
    if(r.kind==='line'&&m.wall&&nameOf(m.building))names.building.add(m.building.trim());
  }
  const prev=W.frozen?W.frozen.names:{street:new Set(),building:new Set()};
  return copy({
    nextId:W.nextId,
    chunks,
    stats:W.stats,
    log:W.log,
    renames:{street:[...W.renames.street.entries()],building:[...W.renames.building.entries()]},
    judged:[...W.judged],
    gov:W.gov,
    names:{street:[...new Set([...prev.street,...names.street])].sort(),building:[...new Set([...prev.building,...names.building])].sort()}
  });
}
export function restoreWorld(cp,config){
  const W=createWorld(config),d=copy(cp);
  W.nextId=d.nextId;W.stats=d.stats||{};W.log=d.log||[];
  W.renames={street:new Map(d.renames&&d.renames.street||[]),building:new Map(d.renames&&d.renames.building||[])};
  W.judged=new Set(d.judged||[]);
  if(d.gov){const seeded=W.gov.elections;W.gov=d.gov;for(const id in seeded)if(!W.gov.elections[id])W.gov.elections[id]=seeded[id];}
  const fz={nextId:d.nextId,chunks:new Set(),names:{street:new Set(),building:new Set()}};
  for(const ch of d.chunks||[]){
    const c=container(W,ch.cx,ch.cy);
    Object.assign(c,{owner:ch.owner||null,grants:ch.grants||{},ports:ch.ports||{},lots:ch.lots||[],pens:ch.pens||[],flags:ch.flags||[],records:ch.records||[],nodes:new Map(ch.nodes||[])});
    for(const r of c.records)W.idIndex.set(r.id,c.k);
    fz.chunks.add(c.k);
  }
  for(const k of ['street','building'])for(const n of (d.names&&d.names[k])||[])fz.names[k].add(String(n).trim().toLowerCase());
  W.frozen=fz;W.checkpoint={through:cp.through||null,version:cp.version||null,names:{street:(d.names&&d.names.street)||[],building:(d.names&&d.names.building)||[]}};
  return W;
}


// CITY GOVERNMENT
// A mayor-council city. Elected: mayor and council. Appointed by the mayor: city clerk, planning director, parks director.
// Appointed by the owner in testbed.json: the Commissioner of Public Works (stewards) and municipal judges (judges).
// Offices give powers, never points.
export const ELECTED={mayor:1,council:5};
export const APPOINTED={city_clerk:1,planning_director:1,parks_director:1};
export const OFFICE_TITLES={mayor:'Mayor',council:'City Council',city_clerk:'City Clerk',planning_director:'Planning Director',parks_director:'Parks Director',commissioner:'Commissioner of Public Works',judge:'Municipal Judge'};
const ORD_KINDS=['general','name_city','district','rezone'];
const PARKS_DISC=new Set(['vegetation','activity','paving','structure','interior','electrical','plumbing']);
const officeTitle=(o)=>OFFICE_TITLES[o]||o;
function newGov(){return {elections:{},holders:{mayor:[],council:[],city_clerk:[],planning_director:[],parks_director:[]},ordinances:{},cityName:null,districts:{},history:[]};}
function seedElections(W,list){
  for(const e of Array.isArray(list)?list:[]){
    if(!e||typeof e.id!=='string'||W.gov.elections[e.id]||typeof e.opens!=='string'||typeof e.closes!=='string')continue;
    const offs={};for(const o in (e.offices||{}))if(ELECTED[o]&&isInt(e.offices[o])&&e.offices[o]>=1)offs[o]=Math.min(e.offices[o],ELECTED[o]);
    W.gov.elections[e.id]={id:e.id,offices:offs,opens:e.opens,closes:e.closes,calledBy:'charter',candidates:{},ballots:{},tallied:false};
  }
}
// Turn times look like 2026-10-26T015809. Day-only names count as midnight UTC.
function toMs(s){const m=String(s).match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2})(\d{2})(\d{2}))?$/);if(!m)return NaN;return Date.UTC(+m[1],+m[2]-1,+m[3],+(m[4]||0),+(m[5]||0),+(m[6]||0));}
function fromMs(ms){return new Date(ms).toISOString().slice(0,19).replace(/[-:]/g,(c,i)=>c===':'?'':c);}
function utcStamp(){return new Date().toISOString().slice(0,19).replace(/:/g,'');}
const nowOf=(W)=>String(W.ctx&&W.ctx.date||utcStamp()).padEnd(10,'');
function isResident(W,id){
  if(typeof id!=='string'||W.stewards.has(id)||W.judges.has(id)||W.detailers.has(id))return false;
  for(const c of W.chunks.values())if(c.owner===id)return true;
  return false;
}
function inZone(c,pt,zone){
  for(const l of c.lots){if(String(l.zone).toLowerCase()!==zone)continue;const xs=l.pts.map(p=>p[0]),ys=l.pts.map(p=>p[1]);if(pt[0]>=Math.min(...xs)&&pt[0]<=Math.max(...xs)&&pt[1]>=Math.min(...ys)&&pt[1]<=Math.max(...ys))return true;}
  return false;
}
function applyRezone(W,chunk,lot,zone){
  if(!vchunk(chunk))return 'chunk must be [cx, cy]';
  const c=W.chunks.get(key(chunk[0],chunk[1]));if(!c)return 'no such chunk';
  if(frozenChunk(W,c))return 'chunk '+c.k+' '+FROZEN;
  if(!nameOf(zone))return 'zone must be a short name';
  const l=c.lots.find(x=>x.id===lot);if(!l)return 'no lot with that id in '+c.k;
  l.zone=zone.trim();const r=c.records.find(x=>x.id===lot);if(r&&r.meta)r.meta.zone=l.zone;return null;
}
function councilSize(W){return W.gov.holders.council.length;}
function settleOrdinance(W,o){
  const n=councilSize(W);if(!n)return;
  const v=Object.entries(o.votes).filter(([a])=>W.gov.holders.council.includes(a)).map(([,x])=>x);
  const yes=v.filter(x=>x==='yes').length,no=v.filter(x=>x==='no').length,ov=v.filter(x=>x==='override').length;
  if(o.status==='proposed'){
    if(yes>n/2){o.status='passed';o.passed=nowOf(W);log(W,o.by,'ordinance '+o.id+' passed council '+yes+' to '+no);if(!W.gov.holders.mayor.length)enact(W,o,'passed with no sitting mayor');}
    else if(no>=n/2&&no>0&&yes+no===n){o.status='failed';log(W,o.by,'ordinance '+o.id+' failed '+yes+' to '+no);}
  }else if(o.status==='vetoed'&&ov>=Math.ceil(n*2/3)){enact(W,o,'veto overridden '+ov+' of '+n);}
}
function enact(W,o,how){
  o.status='effective';o.effective=nowOf(W);o.how=how;
  const p=o.params||{};
  if(o.kind==='name_city')W.gov.cityName=p.name.trim();
  if(o.kind==='district')W.gov.districts[p.name.trim()]=p.chunks.map(c=>[c[0],c[1]]);
  if(o.kind==='rezone'){const r=applyRezone(W,p.chunk,p.lot,p.zone);if(r)o.note='rezone could not apply: '+r;}
  log(W,o.by,'ordinance '+o.id+' took effect, '+how);
}
function tally(W,e){
  e.tallied=true;e.results={};
  for(const off in e.offices){
    const cands=e.candidates[off]||{},count={};
    for(const c in cands)count[c]=0;
    for(const voter in (e.ballots[off]||{}))for(const c of e.ballots[off][voter])if(c in count)count[c]++;
    const ranked=Object.keys(count).sort((a,b)=>count[b]-count[a]||String(cands[a]).localeCompare(String(cands[b])));
    const won=ranked.slice(0,e.offices[off]);
    e.results[off]={counts:count,winners:won};
    if(won.length){W.gov.holders[off]=won;W.gov.history.push({office:off,holders:won,from:e.closes,election:e.id});W.log.push({agent:'clerk',msg:officeTitle(off)+': '+won.join(', ')+' elected in '+e.id,flag:false,date:e.closes});}
  }
}
// Closes elections and enacts ordinances whose mayor's 48 hour window has passed, in time order, up to now.
function govTick(W,now){
  const g=W.gov;
  const due=Object.values(g.elections).filter(e=>!e.tallied&&e.closes<=now).sort((a,b)=>a.closes<b.closes?-1:1);
  for(const e of due)tally(W,e);
  for(const o of Object.values(g.ordinances))if(o.status==='passed'&&g.holders.mayor.length&&toMs(now)-toMs(o.passed)>=48*3600e3){const sv=W.ctx;W.ctx={date:fromMs(toMs(o.passed)+48*3600e3)};enact(W,o,'48 hours passed without a mayoral veto');W.ctx=sv;}
}
function govLabels(W){
  for(const [name,chs] of Object.entries(W.gov.districts)){const c=chs[0];W.labels.push({k:key(c[0],c[1]),text:name+' District',at:[(c[0]+0.5)*S,(c[1]+0.5)*S,9000],kind:'district'});}
}
export function govSummary(W){
  const g=W.gov,now=utcStamp();
  const officials={};for(const o in g.holders)officials[o]={title:officeTitle(o),holders:g.holders[o]};
  officials.commissioner={title:officeTitle('commissioner'),holders:[...W.stewards]};
  officials.judge={title:officeTitle('judge'),holders:[...W.judges]};
  const residents=[];for(const c of W.chunks.values())if(c.owner&&isResident(W,c.owner)&&!residents.includes(c.owner))residents.push(c.owner);
  const elections=Object.values(g.elections).map(e=>({id:e.id,offices:e.offices,opens:e.opens,closes:e.closes,status:e.tallied?'closed':(now<e.opens?'scheduled':'open'),candidates:Object.fromEntries(Object.entries(e.candidates).map(([o,c])=>[o,Object.keys(c)])),platforms:e.platforms||{},ballotsCast:Object.fromEntries(Object.entries(e.ballots).map(([o,b])=>[o,Object.keys(b).length])),results:e.results||null}));
  return {cityName:g.cityName,officials,residents:residents.sort(),elections,ordinances:Object.values(g.ordinances),districts:g.districts,history:g.history};
}

// Symbols and segments, all in mm.
function circle(cx,cy,z,r,n){const s=[];for(let i=0;i<n;i++){const a0=i/n*Math.PI*2,a1=(i+1)/n*Math.PI*2;s.push([cx+Math.cos(a0)*r,cy+Math.sin(a0)*r,z],[cx+Math.cos(a1)*r,cy+Math.sin(a1)*r,z]);}return s;}
function boxSegs(x0,y0,x1,y1,z0,z1){const q=[[x0,y0],[x1,y0],[x1,y1],[x0,y1]],s=[];for(let i=0;i<4;i++){const a=q[i],b=q[(i+1)%4];s.push([a[0],a[1],z0],[b[0],b[1],z0],[a[0],a[1],z1],[b[0],b[1],z1],[a[0],a[1],z0],[a[0],a[1],z1]);}return s;}
function rot(segs,ox,oy,oz,r){const c=Math.cos(r),s=Math.sin(r);return segs.map(p=>[ox+p[0]*c-p[1]*s,oy+p[0]*s+p[1]*c,oz+p[2]]);}
export const SYMBOLS = {
  tree:(x,y,z)=>[[x,y,z],[x,y,z+3000],...circle(x,y,z+3000,1800,8),...circle(x,y,z+4600,1200,8),...circle(x,y,z,500,6)],
  shrub:(x,y,z)=>[...circle(x,y,z+400,600,6),...circle(x,y,z+800,400,6)],
  grass:(x,y,z)=>[[x,y,z],[x-120,y,z+300],[x,y,z],[x,y,z+380],[x,y,z],[x+120,y,z+300]],
  car:(x,y,z,r)=>rot([...boxSegs(-914,-2286,914,2286,0,762),...boxSegs(-800,-1100,800,1000,762,1448)],x,y,z,r),
  truck:(x,y,z,r)=>rot([...boxSegs(-1219,-4572,1219,4572,0,1067),...boxSegs(-1219,1524,1219,4572,1067,2743),...boxSegs(-1219,-4572,1219,1300,1067,3658)],x,y,z,r),
  light:(x,y,z)=>{const h=305;return [[x-h,y-h,z],[x+h,y-h,z],[x+h,y-h,z],[x+h,y+h,z],[x+h,y+h,z],[x-h,y+h,z],[x-h,y+h,z],[x-h,y-h,z],[x-h,y-h,z],[x+h,y+h,z]];},
  outlet:(x,y,z)=>[[x,y,z-57],[x,y,z+57],[x-38,y,z],[x+38,y,z],[x,y-38,z],[x,y+38,z]],
  switch:(x,y,z)=>[[x,y,z-57],[x,y,z+57],[x-38,y,z+57],[x+38,y,z+57]],
  knob:(x,y,z)=>[[x-40,y,z],[x,y,z+40],[x,y,z+40],[x+40,y,z],[x+40,y,z],[x,y,z-40],[x,y,z-40],[x-40,y,z]],
  pole:(x,y,z)=>[[x,y,z],[x,y,z+9144],[x-900,y,z+8230],[x+900,y,z+8230]],
  hydrant:(x,y,z)=>[...circle(x,y,z,150,6),[x,y,z],[x,y,z+760],[x-200,y,z+500],[x+200,y,z+500]],
  sign:(x,y,z,r)=>rot([[0,0,0],[0,0,2134],[-300,0,2134],[300,0,2134],[300,0,2134],[300,0,2740],[300,0,2740],[-300,0,2740],[-300,0,2740],[-300,0,2134]],x,y,z,r),
  mark:(x,y,z)=>[[x-600,y-600,z],[x+600,y+600,z],[x-600,y+600,z],[x+600,y-600,z]],
  person:(x,y,z,r,m)=>{
    const pose=m&&m.pose;
    if(pose==='sitting')return rot([...circle(0,0,1250,110,6).map(p=>[p[0],p[1],p[2]]),[0,0,1140],[0,0,450],[0,0,450],[0,350,450],[0,350,450],[0,350,0],[0,0,950],[150,250,650],[0,0,950],[-150,250,650]],x,y,z,r);
    const w=pose==='walking'?220:0;
    return rot([...circle(0,0,1600,110,6),[0,0,1490],[0,0,900],[0,0,900],[-120,w,0],[0,0,900],[120,-w,0],[0,0,1350],[-300,-w,950],[0,0,1350],[300,w,950]],x,y,z,r);
  },
  dog:(x,y,z,r)=>rot([[0,-350,450],[0,350,450],[0,350,450],[0,500,600],[0,-350,450],[0,-450,600],[0,-300,450],[0,-300,0],[0,300,450],[0,300,0]],x,y,z,r),
  bench:(x,y,z,r)=>rot([...boxSegs(-900,-200,900,200,430,460),[-800,0,0],[-800,0,430],[800,0,0],[800,0,430],[-900,200,460],[-900,250,850],[900,200,460],[900,250,850],[-900,250,850],[900,250,850]],x,y,z,r),
  table:(x,y,z)=>[...circle(x,y,z+740,450,8),[x,y,z],[x,y,z+740],[x-300,y,z],[x+300,y,z]],
  bike:(x,y,z,r)=>{const v=(cy,cz,rr)=>{const o=[];for(let k=0;k<8;k++){const a0=k/8*Math.PI*2,a1=(k+1)/8*Math.PI*2;o.push([0,cy+Math.cos(a0)*rr,cz+Math.sin(a0)*rr],[0,cy+Math.cos(a1)*rr,cz+Math.sin(a1)*rr]);}return o;};return rot([...v(-550,330,330),...v(550,330,330),[0,-550,330],[0,0,600],[0,0,600],[0,550,330],[0,0,600],[0,-150,850],[0,550,330],[0,450,950]],x,y,z,r);},
  cyclist:(x,y,z,r)=>{const b=SYMBOLS.bike(0,0,0,0);return rot([...b,...circle(0,-50,1700,110,6),[0,-50,1590],[0,-150,950],[0,-150,950],[120,250,500],[0,-150,950],[-120,350,350],[0,-80,1450],[200,420,1000],[0,-80,1450],[-200,420,1000]],x,y,z,r);},
  cart:(x,y,z,r)=>rot([...boxSegs(-250,-400,250,400,300,800),[-250,-400,800],[-250,-650,1000],[250,-400,800],[250,-650,1000]],x,y,z,r),
  umbrella:(x,y,z)=>[[x,y,z],[x,y,z+2300],...circle(x,y,z+2100,1100,8),[x,y,z+2300],[x+1100,y,z+2100],[x,y,z+2300],[x-1100,y,z+2100]]
};
// Each returned point may carry a 4th value t from 0 to 1, used to blend color into color2.
export function recSegs(r){
  if(r.kind==='symbol')return SYMBOLS[r.type](r.at[0],r.at[1],r.at[2],r.rot,r.meta);
  if(r.kind==='hatch')return hatchSegs(r);
  const p=r.closed&&r.pts.length>2?r.pts.concat([r.pts[0]]):r.pts;
  const d=[0];for(let i=1;i<p.length;i++)d.push(d[i-1]+Math.hypot(p[i][0]-p[i-1][0],p[i][1]-p[i-1][1],p[i][2]-p[i-1][2]));
  const L=d[d.length-1]||1,s=[];
  for(let i=0;i<p.length-1;i++)s.push([p[i][0],p[i][1],p[i][2],d[i]/L],[p[i+1][0],p[i+1][1],p[i+1][2],d[i+1]/L]);
  return s;
}

// Fills a flat polygon with line patterns. Texture and shading come only from line spacing and color, never from lighting.
const hatchCache=new WeakMap();
export function hatchSegs(r){
  if(hatchCache.has(r))return hatchCache.get(r);
  const P=r.pts,o=P[0],sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],norm=(a)=>{const l=Math.hypot(...a)||1;return a.map(v=>v/l);};
  const e1=norm(sub(P[1],o));let n=null;
  for(let k=2;k<P.length;k++){const c=cross(sub(P[1],o),sub(P[k],o));if(Math.hypot(...c)>1e-3){n=norm(c);break;}}
  const out=[];
  if(!n){hatchCache.set(r,out);return out;}
  const e2=cross(n,e1);
  const Q=P.map(p=>{const d=sub(p,o);return [dot(d,e1),dot(d,e2)];});
  const to3=(u,v,t)=>[Math.round(o[0]+u*e1[0]+v*e2[0]),Math.round(o[1]+u*e1[1]+v*e2[1]),Math.round(o[2]+u*e1[2]+v*e2[2]),t];
  const inside=(u,v)=>{let c=false;for(let i=0,j=Q.length-1;i<Q.length;j=i++){const a=Q[i],b=Q[j];if((a[1]>v)!==(b[1]>v)&&u<(b[0]-a[0])*(v-a[1])/(b[1]-a[1])+a[0])c=!c;}return c;};
  const MAX=3000;
  const family=(deg,steps)=>{
    const a=deg*Math.PI/180,d=[Math.cos(a),Math.sin(a)],m=[-Math.sin(a),Math.cos(a)];
    const ms=Q.map(q=>q[0]*m[0]+q[1]*m[1]),lo=Math.min(...ms),hi=Math.max(...ms),span=hi-lo||1;
    for(const s of steps(lo,hi)){
      const ts=[];
      for(let i=0;i<Q.length;i++){const A=Q[i],B=Q[(i+1)%Q.length];const ma=A[0]*m[0]+A[1]*m[1],mb=B[0]*m[0]+B[1]*m[1];if((ma<s)!==(mb<s)){const f=(s-ma)/(mb-ma);const X=A[0]+f*(B[0]-A[0]),Y=A[1]+f*(B[1]-A[1]);ts.push(X*d[0]+Y*d[1]);}}
      ts.sort((x,y)=>x-y);
      const t=(s-lo)/span;
      for(let i=0;i+1<ts.length&&out.length<MAX;i+=2){out.push(to3(s*m[0]+ts[i]*d[0],s*m[1]+ts[i]*d[1],t),to3(s*m[0]+ts[i+1]*d[0],s*m[1]+ts[i+1]*d[1],t));}
    }
    return {d,m,lo,hi};
  };
  const even=(sp)=>(lo,hi)=>{const a=[];for(let s=lo+sp/2;s<hi;s+=sp)a.push(s);return a;};
  const sp=r.spacing,ang=r.angle||0;
  if(r.pattern==='lines')family(ang,even(sp));
  else if(r.pattern==='cross'){family(ang,even(sp));family(ang+90,even(sp));}
  else if(r.pattern==='gradient')family(ang,(lo,hi)=>{const a=[];let g=sp/3,s=lo+g;while(s<hi){a.push(s);g*=1.18;s+=g;}return a;});
  else if(r.pattern==='brick'){
    const f=family(ang,even(sp));const us=Q.map(q=>q[0]*f.d[0]+q[1]*f.d[1]),ulo=Math.min(...us),uhi=Math.max(...us);
    let row=0;for(let s=f.lo+sp/2;s+sp<f.hi;s+=sp,row++){for(let u=ulo+(row%2?sp:0);u<uhi&&out.length<MAX;u+=sp*2){const x=u*f.d[0]+(s+sp/2)*f.m[0],y=u*f.d[1]+(s+sp/2)*f.m[1];if(inside(x,y))out.push(to3(u*f.d[0]+s*f.m[0],u*f.d[1]+s*f.m[1],0),to3(u*f.d[0]+(s+sp)*f.m[0],u*f.d[1]+(s+sp)*f.m[1],0));}}
  }else if(r.pattern==='dots'){
    const a=ang*Math.PI/180,d=[Math.cos(a),Math.sin(a)],m=[-Math.sin(a),Math.cos(a)];
    const us=Q.map(q=>q[0]*d[0]+q[1]*d[1]),vs=Q.map(q=>q[0]*m[0]+q[1]*m[1]),h=Math.max(25,sp/8);
    for(let u=Math.min(...us)+sp/2;u<Math.max(...us);u+=sp)for(let v=Math.min(...vs)+sp/2;v<Math.max(...vs)&&out.length<MAX;v+=sp){const x=u*d[0]+v*m[0],y=u*d[1]+v*m[1];if(inside(x,y))out.push(to3(x-h*d[0],y-h*d[1],0),to3(x+h*d[0],y+h*d[1],0));}
  }
  hatchCache.set(r,out);return out;
}

// Plumbing or electrical runs that cross a wall need a declared penetration from the same agent within 400 mm.
// A wall is any line whose meta has wall: true, with meta.h as its top and meta.zmin as its bottom in mm.
export function clashCheck(W){
  for(const c of W.chunks.values()){
    const walls=c.records.filter(r=>r.kind==='line'&&r.meta&&r.meta.wall);
    if(!walls.length)continue;
    const runs=c.records.filter(r=>r.kind==='line'&&(r.discipline==='plumbing'||r.discipline==='electrical'));
    for(const run of runs){
      const rs=recSegs(run);
      for(let i=0;i<rs.length;i+=2){
        const a=rs[i],b=rs[i+1];
        for(const w of walls){
          const ws=recSegs(w),zt=isInt(w.meta.h)?w.meta.h:3048,zb=isInt(w.meta.zmin)?w.meta.zmin:0;
          for(let j=0;j<ws.length;j+=2){
            const p=ws[j],q=ws[j+1];
            const d=(b[0]-a[0])*(q[1]-p[1])-(b[1]-a[1])*(q[0]-p[0]);if(Math.abs(d)<1e-9)continue;
            const t=((p[0]-a[0])*(q[1]-p[1])-(p[1]-a[1])*(q[0]-p[0]))/d;
            const u=((p[0]-a[0])*(b[1]-a[1])-(p[1]-a[1])*(b[0]-a[0]))/d;
            if(t<=0.001||t>=0.999||u<0||u>1)continue;
            const X=a[0]+t*(b[0]-a[0]),Y=a[1]+t*(b[1]-a[1]),Z=a[2]+t*(b[2]-a[2]);
            if(Z<zb||Z>zt)continue;
            if(c.pens.some(pn=>pn.agent===run.agent&&Math.hypot(pn.at[0]-X,pn.at[1]-Y)<=400))continue;
            st(W,run.agent).clashes++;c.flags.push([Math.round(X),Math.round(Y),Math.round(Z)]);
            W.log.push({agent:run.agent,msg:run.discipline+' run '+run.id+' crosses wall '+w.id+' in '+c.k+' with no declared penetration',flag:true,date:run.date});
          }
        }
      }
    }
  }
}

// Naming, organic shape, detail and human activity. Recomputed from scratch after every replay.
const nameOf=(v)=>typeof v==='string'&&v.trim().length>=1&&v.length<=60;
export function finalize(W){
  govTick(W,utcStamp());
  clashCheck(W);
  for(const s of Object.values(W.stats)){s.passed=0;s.names=0;s.unnamed=0;s.dupNames=0;s.organic=0;s.detail=0;s.activity=0;s.anim=0;s.texture=0;}
  const buildings=new Map(),streetsSeen=new Set();
  W.labels=[];
  govLabels(W);
  const recs=[];for(const c of W.chunks.values())for(const r of c.records)recs.push([c,r]);
  recs.sort((a,b)=>a[1].id-b[1].id);
  const organic={},detail={},activity={},actText=new Set(),anim={},tex={},chk={};
  // Bonus caps refresh every turn, so an agent can keep coming back to a place and keep scoring.
  // Only the first TURNS_PER_DAY turns of each UTC day get a fresh window; later turns that day share the last one.
  const turnsByDay={};
  for(const [,r] of recs){const d=String(r.date||''),k=r.agent+'|'+d.slice(0,10);(turnsByDay[k]||(turnsByDay[k]=new Set())).add(d);}
  const turnIdx={};
  for(const k in turnsByDay){[...turnsByDay[k]].sort().forEach((d,i)=>{turnIdx[k.split('|')[0]+'|'+d]=Math.min(i,TURNS_PER_DAY-1);});}
  const win=(r)=>{const d=String(r.date||'');return d.slice(0,10)+'#'+(turnIdx[r.agent+'|'+d]||0);};
  for(const [c,r] of recs){
    const s=st(W,r.agent),m=r.meta||{},ak2=r.agent+'|'+c.k+'|'+win(r);
    // Passing reference checks: at most CHECKS_PER_KEY per check type and CHECKS_PER_CHUNK in all, per agent, chunk and turn.
    if(r.passed){for(const key of r.passed){const kk=ak2+'|'+key;if((chk[kk]||0)<CHECKS_PER_KEY&&(chk[ak2]||0)<CHECKS_PER_CHUNK){chk[kk]=(chk[kk]||0)+1;chk[ak2]=(chk[ak2]||0)+1;s.passed++;}}}
    if((m.anim||m.billboard)&&(anim[ak2]||0)<30){anim[ak2]=(anim[ak2]||0)+1;s.anim++;}
    if((r.kind==='hatch'||r.color2!==undefined)&&(tex[ak2]||0)<40){tex[ak2]=(tex[ak2]||0)+1;s.texture++;}
    if(r.kind==='line'&&r.discipline==='street'){
      const names=Array.isArray(m.street)?m.street:[m.street];
      if(!names.length||!names.every(nameOf)){s.unnamed++;c.flags.push(r.pts[0]);W.log.push({agent:r.agent,msg:'street record '+r.id+' in '+c.k+' has no meta.street name',flag:true,date:r.date});}
      else for(const n of names){const k=n.trim().toLowerCase();if(!streetsSeen.has(k)){streetsSeen.add(k);s.names+=1;}
        const lk=c.k+'|'+k;if(!streetsSeen.has(lk)){streetsSeen.add(lk);const p=r.pts[0],q=r.pts[r.pts.length>1?1:0];if(!r.hidden)W.labels.push({k:c.k,text:W.renames.street.get(k)||n.trim(),at:[(p[0]+q[0])/2,(p[1]+q[1])/2,300],kind:'street'});}}
    }
    if(r.kind==='line'&&m.wall){
      if(!nameOf(m.building)){s.unnamed++;c.flags.push(r.pts[0]);W.log.push({agent:r.agent,msg:'wall record '+r.id+' in '+c.k+' has no meta.building name',flag:true,date:r.date});}
      else{
        const k=m.building.trim().toLowerCase(),own=r.agent+'|'+c.k,b=buildings.get(k);
        if(!b){
          const xs=r.pts.map(p=>p[0]),ys=r.pts.map(p=>p[1]);
          buildings.set(k,{own,box:[Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)],agent:r.agent,ck:c.k,detail:0});s.names+=3;
          if(!r.hidden)W.labels.push({k:c.k,text:W.renames.building.get(k)||m.building.trim(),at:[(Math.min(...xs)+Math.max(...xs))/2,(Math.min(...ys)+Math.max(...ys))/2,(isInt(m.h)?m.h:3048)+1500],kind:'building'});
        }else if(b.own!==own){s.dupNames++;c.flags.push(r.pts[0]);W.log.push({agent:r.agent,msg:'building name "'+m.building.trim()+'" is already used by '+b.agent+' in '+b.ck,flag:true,date:r.date});}
      }
    }
    if(r.kind==='line'&&r.pts.length>=3){
      const ok2=(organic[ak2]||0)<60;
      if(ok2){for(let i=1;i<r.pts.length-1;i++){const a=r.pts[i-1],b=r.pts[i],d=r.pts[i+1];const a1=Math.atan2(b[1]-a[1],b[0]-a[0]),a2=Math.atan2(d[1]-b[1],d[0]-b[0]);if(Math.hypot(b[0]-a[0],b[1]-a[1])<1||Math.hypot(d[0]-b[0],d[1]-b[1])<1)continue;let t=Math.abs(a2-a1)*180/Math.PI%90;t=Math.min(t,90-t);if(t>5){s.organic++;organic[ak2]=(organic[ak2]||0)+1;break;}}}
    }
    if(r.kind==='symbol'&&r.discipline==='activity'){
      const t=typeof m.activity==='string'?m.activity.trim().toLowerCase():'';
      const ak=r.agent+c.k;
      if(t.length>=3&&t.length<=80&&!actText.has(ak+'|'+t)&&(activity[ak2]||0)<40){actText.add(ak+'|'+t);activity[ak2]=(activity[ak2]||0)+1;s.activity++;}
      if(typeof m.activity==='string'&&!r.hidden)W.labels.push({k:c.k,text:m.activity.trim().slice(0,80),at:[r.at[0],r.at[1],r.at[2]+2200],kind:'activity'});
    }
    if(r.kind==='symbol'&&r.type==='sign'&&typeof m.text==='string'&&!r.hidden)W.labels.push({k:c.k,text:m.text.trim().slice(0,60),at:[r.at[0],r.at[1],r.at[2]+3200],kind:'sign'});
  }
  for(const [c,r] of recs){
    if(!DETAIL.has(r.discipline))continue;
    const p=r.kind==='line'?r.pts[0]:r.at;
    for(const b of buildings.values()){
      if(b.ck===c.k&&p[0]>=b.box[0]&&p[0]<=b.box[2]&&p[1]>=b.box[1]&&p[1]<=b.box[3]){const dk=r.agent+'|'+b.own+'|'+b.ck+'|'+win(r);if((detail[dk]||0)<150){detail[dk]=(detail[dk]||0)+1;st(W,r.agent).detail++;}break;}
    }
  }
}

export const scoreOf = (s)=>(s.judge||0)+(s.passed||0)+(s.anim||0)+(s.texture||0)+(s.names||0)+(s.organic||0)+(s.detail||0)+2*(s.activity||0)-5*(s.violations||0)-10*(s.mismatches||0)-10*(s.clashes||0)-2*(s.unnamed||0)-5*(s.dupNames||0)-(s.rejected||0);

// Text summary agents read before they play.
export function summary(W,detailChunk,all){
  const owned=[],frontier=new Set();
  for(const c of W.chunks.values()){
    if(!c.owner&&!c.records.length)continue;
    const by={};for(const r of c.records)by[r.agent]=(by[r.agent]||0)+1;
    const o={chunk:[c.cx,c.cy],owner:c.owner,grants:c.grants,ports:c.ports,lots:c.lots.map(l=>({id:l.id,zone:l.zone,pts:l.pts})),recordsByAgent:by};
    if(frozenChunk(W,c))o.frozen=true;
    owned.push(o);
    if(c.owner)for(const e in NBR){const k=key(c.cx+NBR[e][0],c.cy+NBR[e][1]);const n=W.chunks.get(k);if((!n||!n.owner)&&!(W.frozen&&W.frozen.chunks.has(k)))frontier.add(k);}
  }
  const out={
    chunkSizeMm:S,
    worldEmpty:!owned.some(o=>o.owner),
    chunks:owned,
    claimableChunks:owned.some(o=>o.owner)?[...frontier].map(k=>k.split(':').map(Number)):[[0,0]],
    scores:Object.fromEntries(Object.entries(W.stats).map(([a,s])=>[a,Object.assign({score:scoreOf(s)},s)])),
    recentFlags:W.log.filter(l=>l.flag).slice(-40)
  };
  if(detailChunk){
    const c=W.chunks.get(key(detailChunk[0],detailChunk[1]));
    out.detail=c?{chunk:detailChunk,owner:c.owner,ports:c.ports,penetrations:c.pens,records:c.records.map(r=>{const o={id:r.id,agent:r.agent,discipline:r.discipline,color:r.color,kind:r.kind};if(r.kind==='line'||r.kind==='hatch'){o.pts=r.pts;if(r.kind==='line')o.closed=r.closed;else{o.pattern=r.pattern;o.spacing=r.spacing;o.angle=r.angle;}if(r.color2!==undefined)o.color2=r.color2;}else{o.type=r.type;o.at=r.at;o.rot=r.rot;}if(r.meta)o.meta=r.meta;if(r.hidden)o.hidden=r.hidden;if(frozenRec(W,r.id))o.frozen=true;return o;})}:null;
  }
  if(all){out.allRecords=[];for(const c of W.chunks.values())for(const r of c.records){const o={id:r.id,chunk:[c.cx,c.cy],agent:r.agent,discipline:r.discipline,kind:r.kind,date:r.date};if(r.kind==='symbol'){o.type=r.type;o.at=r.at;}else o.pts=r.pts;if(r.meta)o.meta=r.meta;if(r.hidden)o.hidden=r.hidden;if(frozenRec(W,r.id))o.frozen=true;out.allRecords.push(o);}}
  out.checkpoint=W.frozen?{version:W.checkpoint.version,through:W.checkpoint.through,frozenBelowRecordId:W.frozen.nextId,frozenChunks:[...W.frozen.chunks].map(k=>k.split(':').map(Number)),streetNames:W.checkpoint.names.street,buildingNames:W.checkpoint.names.building}:null;
  out.census=census(W);out.government=govSummary(W);out.stewards=[...W.stewards];out.judges=[...W.judges];out.detailers=[...W.detailers];out.renames={street:Object.fromEntries(W.renames.street),building:Object.fromEntries(W.renames.building)};
  return out;
}

// Census and tax roll. Recounted from the live city every time it is built, so nothing can be edited by hand.
// Housing units come from meta.units on a building's records when the builder declares them, otherwise from
// unit doors or the building's floor area. Population is 2.5 people per housing unit. Civic, park and church
// property is exempt. Taxes use the levy rate in CENSUS_RATES until the council changes it by ordinance.
export const CENSUS_RATES={household:2.5,landPerM2:{residential:200,commercial:400,industrial:150,agricultural:40,other:200},buildingPerM2:1500,levy:0.01,unitM2:75};
function polyArea(pts){let a=0;for(let i=0;i<pts.length;i++){const p=pts[i],q=pts[(i+1)%pts.length];a+=p[0]*q[1]-q[0]*p[1];}return Math.abs(a)/2e6;}
function hull(ps){const p=ps.map(q=>[q[0],q[1]]).sort((a,b)=>a[0]-b[0]||a[1]-b[1]);if(p.length<3)return p;const cr=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);const lo=[],up=[];for(const q of p){while(lo.length>1&&cr(lo[lo.length-2],lo[lo.length-1],q)<=0)lo.pop();lo.push(q);}for(const q of p.slice().reverse()){while(up.length>1&&cr(up[up.length-2],up[up.length-1],q)<=0)up.pop();up.push(q);}return lo.slice(0,-1).concat(up.slice(0,-1));}
function inPoly(x,y,pts){let c=false;for(let i=0,j=pts.length-1;i<pts.length;j=i++){const a=pts[i],b=pts[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])c=!c;}return c;}
function zoneClass(z){z=String(z||'').toLowerCase();if(/residential|rv park|housing|apartment|mobile|manufactured/.test(z))return 'residential';if(/park|cemetery|garden|splash/.test(z))return 'park';if(/civic|school|library|clinic|fire|church|depot|senior|utility|water/.test(z))return 'civic';if(/industrial|plant|works/.test(z))return 'industrial';if(/agri|farm|orchard/.test(z))return 'agricultural';if(/commercial|grocery|bank|amusement|carnival|dealership|diner|bakery|bowling|medical|parking/.test(z))return 'commercial';return 'other';}
const NOT_HOME=/office|laundry|clubhouse|shed|garage|pump|well house|comfort|ramada|coop|barn|skybridge|stand|booth/i;
const MULTI=/apartment|flats$|courts building|heights (west|east)|terrace|duplex|townhome|\brow\b/i;
const HOME=/house|home|cottage|bungalow|casita|residence|parsonage|bunkhouse|space \d+|farmhouse/i;
const ACCESSORY=/skybridge|ramada|comfort station|garden shed|chicken coop|equipment barn|office and laundry|clubhouse|farm stand/i;
const LODGING=/motor court|motel|hotel|\binn\b/i;
const CIVIC=/school|library|clinic|fire station|post office|chapel|church|fellowship|grange|senior|depot|cemetery|mausoleum|caretaker|district office|reading room|fire training|day nursery/i;
const INDUSTRIAL=/works|plant|press hall|treatment|reservoir|water tower|water tank|pump|well|drilling|welding|sheet metal|packing|pipe and supply|studios|newsroom/i;
export function census(W){
  const R=CENSUS_RATES,by={},tot={chunks:0,lotM2:0,buildings:0,housingUnits:0,homes:0,apartmentBuildings:0,lodgingRooms:0,businesses:0,civic:0,population:0,peopleSeen:0,assessed:0,exempt:0,tax:0},rows=[];
  const Z=JSON.stringify(tot),A=id=>by[id]||(by[id]=Object.assign({agent:id,resident:isResident(W,id)},JSON.parse(Z)));
  const bl={};
  for(const c of W.chunks.values()){
    if(c.owner){A(c.owner).chunks++;tot.chunks++;}
    for(const l of c.lots){const m2=polyArea(l.pts),zc=zoneClass(l.zone),o=c.owner||l.agent;const a=A(o);a.lotM2+=m2;tot.lotM2+=m2;
      if(zc==='park'||zc==='civic'){a.exempt+=m2*R.landPerM2.other;tot.exempt+=m2*R.landPerM2.other;}else{const v=m2*(R.landPerM2[zc]||R.landPerM2.other);a.assessed+=v;tot.assessed+=v;}}
    for(const r of c.records){
      if(r.hidden)continue;const m=r.meta||{};
      if(r.kind==='symbol'&&(r.type==='person'||r.type==='cyclist')){A(r.agent).peopleSeen++;tot.peopleSeen++;}
      if(typeof m.building!=='string')continue;
      const n=m.building.trim(),b=bl[n]||(bl[n]={name:n,agent:r.agent,chunk:c,pts:[],h:0,doors:new Set(),units:0});
      if(m.wall&&r.pts){for(const p of r.pts)b.pts.push(p);if(Number.isFinite(m.h))b.h=Math.max(b.h,m.h);}
      if(typeof m.door==='string')b.doors.add(m.door.toLowerCase());
      if(Number.isInteger(m.units)&&m.units>0&&m.units<=2000)b.units=Math.max(b.units,m.units);
    }
  }
  for(const b of Object.values(bl)){
    if(b.pts.length<3)continue;
    const fp=polyArea(hull(b.pts));
    const cx=b.pts.reduce((s,p)=>s+p[0],0)/b.pts.length,cy=b.pts.reduce((s,p)=>s+p[1],0)/b.pts.length;
    const lot=b.chunk.lots.find(l=>inPoly(cx,cy,l.pts)),zc=lot?zoneClass(lot.zone):'other';
    let use;
    if(LODGING.test(b.name))use='lodging';
    else if(CIVIC.test(b.name)||zc==='civic'||zc==='park')use='civic';
    else if(ACCESSORY.test(b.name))use='accessory';
    else if(!NOT_HOME.test(b.name)&&(MULTI.test(b.name)||HOME.test(b.name)||(zc==='residential'&&!/market|store|shop/i.test(b.name))))use='housing';
    else if(INDUSTRIAL.test(b.name)||zc==='industrial')use='industrial';
    else use='business';
    const floors=use==='housing'||use==='lodging'?Math.max(1,Math.min(40,Math.round(b.h/3200)||1)):Math.max(1,Math.min(40,Math.floor(b.h/4500)||1)),gross=fp*floors;
    const unitDoors=[...b.doors].filter(d=>/unit|apartment|space|room \d/.test(d)).length;
    let units=0;
    if(use==='housing')units=b.units||(MULTI.test(b.name)?Math.max(2,unitDoors,Math.round(gross*0.75/R.unitM2)):/duplex/i.test(b.name)?2:1);
    const a=A(b.agent);a.buildings++;tot.buildings++;
    const val=gross*R.buildingPerM2;
    if(use==='civic'){a.civic++;tot.civic++;a.exempt+=val;tot.exempt+=val;}else{a.assessed+=val;tot.assessed+=val;}
    if(use==='housing'){a.housingUnits+=units;tot.housingUnits+=units;if(units>1){a.apartmentBuildings++;tot.apartmentBuildings++;}else{a.homes++;tot.homes++;}}
    if(use==='lodging'){const rm=b.units||Math.max(1,[...b.doors].filter(d=>/room/.test(d)).length);a.lodgingRooms+=rm;tot.lodgingRooms+=rm;}
    if(use==='business'||use==='industrial'||use==='lodging'){a.businesses++;tot.businesses++;}
    rows.push({name:W.renames.building.get(b.name.toLowerCase())||b.name,agent:b.agent,chunk:[b.chunk.cx,b.chunk.cy],use,floors,footprintM2:Math.round(fp),units,declared:!!b.units});
  }
  for(const a of [tot,...Object.values(by)]){a.population=Math.round(a.housingUnits*R.household);a.tax=Math.round(a.assessed*R.levy);a.assessed=Math.round(a.assessed);a.exempt=Math.round(a.exempt);a.lotM2=Math.round(a.lotM2);}
  return {rates:R,totals:tot,byAgent:Object.values(by).sort((p,q)=>q.population-p.population||q.assessed-p.assessed),buildings:rows.sort((p,q)=>q.units-p.units||p.name.localeCompare(q.name))};
}
