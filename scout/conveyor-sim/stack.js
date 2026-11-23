// Turns a software stack, the list of tools a pipeline builder picks, into a packet factory plan.
// Every tool is matched to a kind of machine. A tool with no match becomes a gap machine, so the
// factory shows which parts of the stack still have no machine designed for them.

// Category names the way the pipeline builder writes them.
export const CATS = ['frontend','realtime/game','backend','data','auth','payments','plumbing','infra','observability','ai'];
const CAT_ALIAS = {'observe':'observability','media':'realtime/game','realtime':'realtime/game','game':'realtime/game','realtime / game':'realtime/game','database':'data','databases':'data','infrastructure':'infra','hosting':'infra','monitoring':'observability','analytics':'observability','ml':'ai','api':'plumbing'};
export const normCat = (c)=>{const k=String(c||'').trim().toLowerCase();return CATS.includes(k)?k:CAT_ALIAS[k]||null;};

// Tool name patterns to machine kinds, checked in order. A kind says which machine stands in for the tool.
const RULES = [
  [/tailwind|bootstrap|css|sass|styled|chakra|shadcn|material ui|mui/i,'styler'],
  [/three\.?js|phaser|canvas|pixi|babylon|unity|godot|colyseus/i,'game'],
  [/socket|websocket|pusher|ably|realtime|liveblocks|partykit/i,'live'],
  [/next|react|vue|svelte|astro|angular|solid|remix|nuxt|html|pwa|vite|expo|react native|flutter/i,'frontend'],
  [/cron/i,'cron'],
  [/worker|celery|sidekiq|inngest|temporal/i,'worker'],
  [/bullmq|queue|rabbit|kafka|sqs|nats/i,'queue'],
  [/mqtt|mosquitto/i,'live'],
  [/webhook/i,'webhook'],
  [/graphql|\brest\b|trpc|grpc|openapi/i,'api'],
  [/cdn|cloudflare(?! workers)|fastly|akamai/i,'cdn'],
  [/redis|upstash|memcache|valkey|keydb/i,'cache'],
  [/pinecone|pgvector|vector|weaviate|qdrant|chroma/i,'vector'],
  [/elastic|meili|algolia|typesense|search/i,'search'],
  [/s3|r2|blob|storage|bucket|cloudinary|uploadthing/i,'storage'],
  [/postgres|mysql|sqlite|mongo|supabase(?! auth)|planetscale|neon|dynamo|firestore|turso|mariadb|cockroach|sql/i,'sql'],
  [/jwt|oauth|auth0|clerk|passkey|magic link|supabase auth|lucia|session|login|auth/i,'auth'],
  [/stripe|paypal|square|lemon|paddle|braintree|payment/i,'pay'],
  [/sentry|datadog|posthog|plausible|uptime|grafana|prometheus|logrocket|new relic|honeycomb|logtail|axiom|analytics/i,'watch'],
  [/claude|openai|gpt|ollama|anthropic|gemini|llama|mistral|rag|whisper|elevenlabs|hugging/i,'ai'],
  [/resend|sendgrid|mailgun|postmark|email|smtp|twilio|sms/i,'mail'],
  [/vercel|railway|fly\.io|fly|netlify|render|heroku|cloudflare workers|aws|gcp|azure|digitalocean|hetzner|vps|github pages/i,'host'],
  [/express|fastify|fastapi|django|rails|flask|hono|koa|nest|laravel|spring|\bgo\b|\bchi\b|\bgin\b|node|deno|bun|serverless|lambda|function/i,'backend']
];
// When a tool's name says nothing, its category or layer decides. Teardowns from Repo Find send layers
// like server, client or data, with the description as detail.
const CAT_KIND = {frontend:'frontend',client:'frontend',native:'frontend',ui:'styler',backend:'backend',server:'backend',servers:'backend',api:'api',architecture:'backend',
  data:'sql',database:'sql',storage:'storage',files:'storage',assets:'storage',saves:'storage',auth:'auth',accounts:'auth',payments:'pay',rails:'pay',banking:'pay',
  plumbing:'api',protocol:'api',live:'live',realtime:'live',media:'live',netcode:'live','realtime/game':'game',game:'game',games:'game',engine:'game',graphics:'game',rendering:'game',physics:'game',
  infra:'host',hosting:'host',observability:'watch',observe:'watch',analytics:'watch',ai:'ai',ml:'ai',search:'search',queue:'queue',jobs:'queue',cdn:'cdn',email:'mail',notifications:'mail'};
export function kindOf(name,detail,cat){
  for(const [re,k] of RULES)if(re.test(name))return k;
  if(detail)for(const [re,k] of RULES)if(re.test(detail))return k;
  const c=String(cat||'').trim().toLowerCase();return CAT_KIND[c]||CAT_KIND[String(name).trim().toLowerCase()]||null;
}

// What each kind is built as, and the line of the factory it sits on.
export const KIND = {
  frontend:{type:'showroom',lane:'front'}, styler:{type:'rewrap',lane:'front'}, game:{type:'arcade',lane:'game'},
  live:{type:'tube',lane:'main'}, backend:{type:'arm',lane:'main'}, api:{type:'window',lane:'main'},
  auth:{type:'turnstile',lane:'main'}, cdn:{type:'vending',lane:'edge'}, webhook:{type:'bell',lane:'main'},
  cache:{type:'bin',lane:'data'}, sql:{type:'cabinet',lane:'data'}, vector:{type:'cabinet',lane:'data'}, search:{type:'sorter',lane:'data'}, storage:{type:'locker',lane:'data'},
  queue:{type:'queue',lane:'jobs'}, cron:{type:'clock',lane:'jobs'}, worker:{type:'arm',lane:'jobs'},
  pay:{type:'register',lane:'pay'}, ai:{type:'ai',lane:'ai'}, mail:{type:'dock',lane:'mail'}, watch:{type:'ticker',lane:'watch'}, host:{type:null,lane:'host'}
};
const FRONT_HOST=/vercel|netlify|cloudflare pages|github pages|pages/i;
export const HOST_COLORS=['#d8e3f0','#e6dcef','#dceadb','#f2e2cc','#e9d8d8'];

// Reads pasted text. Lines like "Frontend: Next.js, Tailwind CSS" work, and so does text copied
// straight off the stack page, where a category name sits on its own line above its tools.
export function parseStack(text){
  const tools=[];let cat=null,title='';
  for(let line of String(text).split(/\r?\n/)){
    line=line.replace(/^[\s•*-]+/,'').trim();if(!line)continue;
    if(/^why this stack/i.test(line)||/^load into builder$/i.test(line))continue;
    const m=line.match(/^([A-Za-z /]+):\s*(.*)$/);
    if(m&&normCat(m[1])){cat=normCat(m[1]);line=m[2];if(!line)continue;}
    else if(normCat(line)){cat=normCat(line);continue;}
    else if(!cat&&!title&&!line.includes(',')){title=line;continue;}
    for(const n of line.split(/,|·|\|/).map(x=>x.trim()).filter(Boolean))tools.push({cat:cat||'',name:n});
  }
  return {title:title||'Pasted stack',tools};
}

// Lays the stack out as a factory. Requests flow from the users on the left to the showroom on the right.
// The main line carries edge, auth, API, live and backend machines. After the backend a flipper gate
// splits work onto side lines: data, game, payments, AI and background jobs. Lines meet again at the
// front end. Hosts color the floor under the machines they run.
export function stackToPlan(stack){
  const X=12000,Y0=0,tools=stack.tools.map(t=>Object.assign({},t,{kind:kindOf(t.name,t.detail,t.cat)}));
  const machines=[],belts=[],used=new Set(),report=[];
  const nameFor=(t)=>{let n=t.name.slice(0,40),k=1;while(used.has(n.toLowerCase()))n=t.name.slice(0,36)+' '+(++k);used.add(n.toLowerCase());return n;};
  const add=(t,type,x,y,meta)=>{const m={type,name:nameFor(t),at:[x,y,0],meta:meta||{},tool:t.name,cat:t.cat};if(t.detail)m.detail=t.detail;machines.push(m);return m;};
  const belt=(a,b,out,pts)=>{if(!a||!b)return;const r={from:a.name,to:b.name};if(out&&out!=='*')r.out=out;if(pts)r.pts=pts.map(p=>[p[0],p[1],900]);belts.push(r);};
  const by=(k)=>tools.filter(t=>t.kind===k);
  const hosts=by('host');
  let x=0;
  const users=add({name:'Users'},'hopper',x,Y0,{rate:0.7});
  let last=users;
  const main=(t,type,meta)=>{x+=X;const m=add(t,type,x,Y0,meta);belt(last,m);last=m;return m;};

  // Main line.
  for(const t of by('cdn'))main(t,'vending',{cap:8});
  let gate=null,rejectSink=null;const turnstiles=[];
  for(const t of by('auth'))turnstiles.push(main(t,'turnstile',{minStyle:1}));
  for(const t of by('api'))main(t,'window');
  for(const t of by('live'))main(t,'tube');
  for(const t of by('backend'))main(t,'arm',{ops:['upgrade'],every:0.45});
  for(const t of by('webhook'))main(t,'bell');

  // Side lines after the backend, each a row of machines.
  const lanes=[];
  const data=[...by('cache'),...by('search'),...by('vector'),...by('sql'),...by('storage')];
  if(data.length)lanes.push({key:'data',tools:data});
  if(by('game').length)lanes.push({key:'game',tools:by('game')});
  if(by('pay').length)lanes.push({key:'pay',tools:by('pay')});
  if(by('ai').length)lanes.push({key:'ai',tools:by('ai')});
  const jobs=[...by('queue'),...by('cron'),...by('worker')];
  if(jobs.length)lanes.push({key:'jobs',tools:jobs});
  if(!lanes.length)lanes.push({key:'pass',tools:[]});
  if(lanes.length>1){x+=X;gate=add({name:'Work Splitter'},'gate',x,Y0);belt(last,gate);last=gate;}
  const offs=[0,-14000,14000,-28000,28000,-42000,42000];
  const laneEnds=[];let maxX=x;let dbMachine=null;
  lanes.forEach((L,i)=>{
    const y=Y0+offs[i];let lx=x,prev=last,first=true;
    const step=(m)=>{if(first){belt(prev,m,'*',prev.at[1]===y?null:[[prev.at[0],prev.at[1]],[prev.at[0],y],[m.at[0],y]]);first=false;}else belt(prev,m);prev=m;};
    if(L.key==='data'){
      let cache=null;
      for(const t of L.tools){
        lx+=X;
        if(t.kind==='cache'){cache=add(t,'bin',lx,y,{cap:3,every:7});step(cache);}
        else if(t.kind==='search'){step(add(t,'sorter',lx,y,{by:'combo'}));}
        else if(t.kind==='storage'){step(add(t,'locker',lx,y,{every:4}));}
        else{
          if(cache){const db=add(t,'cabinet',cache.at[0],y-7000,{every:2.6});belt(cache,db,'miss');dbMachine=dbMachine||db;laneEnds.push({m:db,y:y-7000});lx-=X;}
          else{const db=add(t,'cabinet',lx,y,{every:1.6});step(db);dbMachine=dbMachine||db;}
        }
      }
    }else if(L.key==='jobs'){
      for(const t of L.tools){lx+=X;step(add(t,KIND[t.kind].type,lx,y,t.kind==='cron'?{period:6}:t.kind==='worker'?{ops:['upgrade']}:{}));}
    }else{
      for(const t of L.tools){lx+=X;step(add(t,KIND[t.kind].type,lx,y));}
    }
    laneEnds.push({m:prev,y,jobs:L.key==='jobs'});maxX=Math.max(maxX,lx);
  });

  // Front end: stylers, then the showroom. Every side line feeds into it, except background jobs,
  // which write into the database when there is one.
  const fronts=by('frontend'),stylers=by('styler');
  let fx=maxX+X;
  const front=[];
  for(const t of stylers){front.push(add(t,'rewrap',fx,Y0,{style:5}));fx+=X;}
  for(const t of fronts.slice(1)){front.push(add(t,'rewrap',fx,Y0));fx+=X;}
  const show=add(fronts[0]||{name:'Page'},'showroom',fx,Y0);
  front.push(show);
  for(let i=0;i<front.length-1;i++)belt(front[i],front[i+1]);
  const entry=front[0];
  let fed=false;
  for(const e of laneEnds){
    if(e.m===users)continue;fed=true;
    if(e.jobs&&dbMachine&&e.m!==dbMachine){belt(e.m,dbMachine,'*',[[e.m.at[0],e.m.at[1]],[e.m.at[0]+3000,e.m.at[1]],[e.m.at[0]+3000,dbMachine.at[1]-1500],[dbMachine.at[0],dbMachine.at[1]-1500],[dbMachine.at[0],dbMachine.at[1]]]);continue;}
    if(e.m.at[1]===Y0)belt(e.m,entry);
    else belt(e.m,entry,'*',[[e.m.at[0],e.m.at[1]],[entry.at[0]-2000,e.m.at[1]],[entry.at[0]-2000,Y0],[entry.at[0],Y0]]);
  }
  if(!fed)belt(last,entry);

  // Mail goes out a dock beside the showroom. Monitoring hears the rejects.
  let mx=fx;
  for(const t of by('mail')){mx+=X;const d=add(t,'dock',mx,Y0+9000);belt(show===entry?last:entry,d,'*');}
  const watch=by('watch');
  watch.forEach((t,i)=>{const w=add(t,'ticker',(turnstiles[0]?turnstiles[0].at[0]:X)+i*6000,Y0-12000);if(i===0)rejectSink=w;});
  for(const ts of turnstiles){if(!rejectSink)rejectSink=add({name:'Dead Letter Bin'},'reject',ts.at[0],Y0-12000);belt(ts,rejectSink,'reject');}

  // Hosts. The first front end host covers the showroom side, the next covers the rest.
  const frontHost=hosts.find(h=>FRONT_HOST.test(h.name))||hosts[0];
  const backHost=hosts.find(h=>h!==frontHost)||frontHost;
  const FRONT_TYPES=new Set(['showroom','vending']);
  for(const m of machines){
    if(m.type==='hopper'||m.type==='ticker')continue;
    const isFront=FRONT_TYPES.has(m.type)||front.includes(m)||m.type==='arcade';
    const h=isFront?frontHost:backHost;if(h)m.host=h.name;
  }

  // Tools with no machine yet sit in the gap row.
  const gaps=tools.filter(t=>!t.kind);
  const minY=Math.min(...machines.map(m=>m.at[1]));
  gaps.forEach((t,i)=>add(t,'gap',X*(i+1),minY-16000));

  for(const t of tools){
    const m=machines.find(mm=>mm.tool===t.name);
    report.push({cat:t.cat,name:t.name,detail:t.detail||'',kind:t.kind,machine:m?m.name:null,type:m?m.type:t.kind==='host'?'host':null});
  }
  return {title:stack.title||'Stack',about:stack.about||'',machines,belts,hosts:hosts.map(h=>h.name),report,stack:{title:stack.title,tools:stack.tools}};
}

// Example stacks, written the way the pipeline builder shows them.
export const STACKS = [
  {title:'Neopets-style virtual pet game',about:'Browser-based persistent state needs accounts, a database for pet stats, real-time mini-games, and a queue for slow background tasks like pet hunger ticking down.',tools:[
    {cat:'frontend',name:'Next.js'},{cat:'frontend',name:'Tailwind CSS'},{cat:'realtime/game',name:'Phaser'},
    {cat:'backend',name:'Fastify (Node.js)'},{cat:'backend',name:'Cron jobs'},{cat:'data',name:'PostgreSQL'},{cat:'data',name:'Redis (Upstash)'},
    {cat:'auth',name:'Local JWT auth'},{cat:'payments',name:'Stripe'},{cat:'plumbing',name:'BullMQ (Redis queue)'},
    {cat:'infra',name:'Vercel'},{cat:'infra',name:'Railway'},{cat:'observability',name:'Sentry'}]}
];
