import {World} from './world.mjs';
import {WALK_HALF} from '../shared/space.mjs';

// Private, server-only storage format. Never send this checkpoint to a browser.
// A distributed adapter supplies stable nonempty connection IDs and trusted time.
// Local ws-object connections stay supported by World but cannot be checkpointed.
export const WORLD_CHECKPOINT_VERSION=1;
const ROOM_IDS=['sunroom','garden','moonlight'];
const FAILURES=['INVALID_ACTION','TOO_FAR','CAT_BUSY','COOLDOWN','NO_SPACE'];
const bad=()=>{throw Object.assign(new Error('Invalid World checkpoint'),{code:'INVALID_CHECKPOINT'});};
const check=(condition)=>{if(!condition)bad();};
function shape(value,keys){
 check(value!==null&&typeof value==='object'&&!Array.isArray(value));
 check([Object.prototype,null].includes(Object.getPrototypeOf(value)));
 const own=Reflect.ownKeys(value);check(own.length===keys.length&&own.every(k=>keys.includes(k)));
 for(const key of keys){const d=Object.getOwnPropertyDescriptor(value,key);check(d&&'value' in d);}
}
const text=(v,max=128)=>check(typeof v==='string'&&v.length>0&&v.length<=max&&!/[\x00-\x1f\x7f]/.test(v));
const number=(v,min=-Number.MAX_SAFE_INTEGER,max=Number.MAX_SAFE_INTEGER)=>check(Number.isFinite(v)&&v>=min&&v<=max);
const integer=(v,min=0,max=Number.MAX_SAFE_INTEGER)=>{number(v,min,max);check(Number.isSafeInteger(v));};
const array=(v,max)=>check(Array.isArray(v)&&v.length<=max&&Object.keys(v).length===v.length);
const time=v=>integer(v);
const coord=v=>number(v,-WALK_HALF,WALK_HALF);
const unique=(set,key)=>{check(!set.has(key));set.add(key);};
function validate(c){
 shape(c,['schema','version','savedAt','seq','reservationMs','players','members','rooms']);
 check(c.schema==='cat-cafe-world'&&c.version===WORLD_CHECKPOINT_VERSION);time(c.savedAt);integer(c.seq);integer(c.reservationMs,1,20000);
 array(c.players,300);array(c.members,300);array(c.rooms,3);check(c.rooms.length===3);
 const ids=new Map(),tokens=new Set(),connections=new Set();
 for(const p of c.players){
  shape(p,['id','token','name','room','x','z','yaw','color','connection','expires','input','seq','cooldown','results']);
  check(typeof p.id==='string'&&/^[a-f0-9]{16}$/.test(p.id));check(!ids.has(p.id));ids.set(p.id,p);
  check(typeof p.token==='string'&&/^[A-Za-z0-9_-]{43}$/.test(p.token));unique(tokens,p.token);
  text(p.name,64);check(ROOM_IDS.includes(p.room));coord(p.x);coord(p.z);number(p.yaw,-Math.PI,Math.PI);integer(p.color,0,5);
  if(p.connection!==null){text(p.connection,256);unique(connections,p.connection);check(p.expires===0);}else{time(p.expires);check(p.expires<=c.savedAt+c.reservationMs);}
  shape(p.input,['x','z','at']);number(p.input.x,-1,1);number(p.input.z,-1,1);check(Math.hypot(p.input.x,p.input.z)<=1+1e-12);time(p.input.at);check(p.input.at<=c.savedAt);
  if(p.connection===null)check(p.input.x===0&&p.input.z===0&&p.input.at===0);
  integer(p.seq,-1);time(p.cooldown);check(p.cooldown<=c.savedAt+1200);
  array(p.results,64);const requests=new Set();for(const entry of p.results){array(entry,2);check(entry.length===2);check(typeof entry[0]==='string'&&entry[0].length>0&&entry[0].length<=64);unique(requests,entry[0]);const result=entry[1];check(result&&typeof result.ok==='boolean');shape(result,result.ok?['ok']:['ok','reason']);if(!result.ok)check(FAILURES.includes(result.reason));}
 }
 const memberConnections=new Set();for(const entry of c.members){array(entry,2);check(entry.length===2);text(entry[0],256);unique(memberConnections,entry[0]);check(ids.has(entry[1])&&ids.get(entry[1]).connection===entry[0]);}check(memberConnections.size===connections.size);
 const roomIds=new Set(),placed=new Set();
 for(const r of c.rooms){
  shape(r,['id','name','playerIds','cats','toys']);check(ROOM_IDS.includes(r.id));unique(roomIds,r.id);text(r.name,64);array(r.playerIds,100);
  const localPlayers=new Set();for(const id of r.playerIds){check(ids.has(id)&&ids.get(id).room===r.id);unique(placed,id);localPlayers.add(id);}
  array(r.cats,18);check(r.cats.length===18);const catIds=new Set(),owners=new Set(),ballOwners=new Map();
  for(const cat of r.cats){
   shape(cat,['id','name','x','z','yaw','skin','mode','owner','until','homeX','homeZ']);check(typeof cat.id==='string'&&/^cat-(?:[0-9]|1[0-7])$/.test(cat.id));unique(catIds,cat.id);text(cat.name,64);coord(cat.x);coord(cat.z);coord(cat.homeX);coord(cat.homeZ);number(cat.yaw,-Math.PI,Math.PI);integer(cat.skin,0,5);check(['idle','pet','feather','ball'].includes(cat.mode));time(cat.until);check(cat.until<=c.savedAt+4000);
   if(cat.owner===null)check(cat.mode==='idle');else{check(localPlayers.has(cat.owner)&&ids.get(cat.owner).connection!==null&&cat.mode!=='idle');unique(owners,cat.owner);if(cat.mode==='ball')ballOwners.set(cat.owner,cat.until);}
  }
  array(r.toys,18);const toyIds=new Set(),toyOwners=new Set();for(const toy of r.toys){
   shape(toy,['id','x','z','vx','vz','owner','until']);text(toy.id,64);unique(toyIds,toy.id);coord(toy.x);coord(toy.z);number(toy.vx,-2,2);number(toy.vz,-2,2);check(ballOwners.has(toy.owner)&&ballOwners.get(toy.owner)===toy.until);unique(toyOwners,toy.owner);time(toy.until);
  }check(toyOwners.size===ballOwners.size);
 }check(placed.size===ids.size);
 return c;
}

export function exportWorld(world){
 check(world instanceof World);time(world.clock());
 const players=[...world.tokens.values()].map(p=>({...p,input:{...p.input},results:[...p.results].map(([id,result])=>[id,{...result}])}));
 const checkpoint={schema:'cat-cafe-world',version:WORLD_CHECKPOINT_VERSION,savedAt:world.clock(),seq:world.seq,reservationMs:world.reservationMs,players,members:[...world.members].map(([connection,p])=>[connection,p.id]),rooms:[...world.rooms.values()].map(r=>({id:r.id,name:r.name,playerIds:[...r.players.keys()],cats:r.cats.map(c=>({...c})),toys:r.toys.map(t=>({...t}))}))};
 // Validate source aliases too; silently repairing inconsistent authority is unsafe.
 for(const [token,p] of world.tokens)check(token===p.token);
 for(const [connection,p] of world.members)check(world.tokens.get(p.token)===p&&p.connection===connection);
 for(const [roomId,r] of world.rooms){check(roomId===r.id);for(const [id,p] of r.players)check(id===p.id&&world.tokens.get(p.token)===p);}
 return validate(checkpoint);
}

export function importWorld(checkpoint,{clock=Date.now}={}){
 validate(checkpoint);check(typeof clock==='function');const now=clock();time(now);check(now>=checkpoint.savedAt);
 // No simulation replay: seq/positions/velocities survive unchanged. Absolute
 // expiries age against trusted time; an adapter must reconcile presence before
 // its first tick/ack. Recovered live connection IDs are NOT socket objects.
 const w=new World({clock,reservationMs:checkpoint.reservationMs});w.seq=checkpoint.seq;w.rooms.clear();
 for(const p of checkpoint.players){const restored={...p,input:{...p.input},results:new Map(p.results.map(([id,result])=>[id,{...result}]))};w.tokens.set(restored.token,restored);}
 const byId=new Map([...w.tokens.values()].map(p=>[p.id,p]));
 for(const r of checkpoint.rooms)w.rooms.set(r.id,{id:r.id,name:r.name,players:new Map(r.playerIds.map(id=>[id,byId.get(id)])),cats:r.cats.map(c=>({...c})),toys:r.toys.map(t=>({...t}))});
 for(const [connection,id] of checkpoint.members)w.members.set(connection,byId.get(id));
 w.clean();
 for(const p of w.tokens.values())if(now-p.input.at>250)p.input={x:0,z:0,at:0};
 for(const r of w.rooms.values()){
  r.toys=r.toys.filter(t=>t.until>now);
  for(const c of r.cats)if(c.owner!==null&&c.until<=now){c.owner=null;c.mode='idle';c.until=0;}
 }
 return w;
}
