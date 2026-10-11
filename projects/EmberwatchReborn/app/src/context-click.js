import {ART} from './art.js';
import {inMap,lineOfSight,traceSegment,findPathStep} from './world-geometry.js';

// Authored Emberwatch input policy, not measured or unpublished PoE2 values.
export const CONTEXT_CLICK_POLICY=Object.freeze({reach:76,approachRadius:64,collisionRadius:11,stallSeconds:2.5,maxSeconds:20});
const kinds=new Set(['npc','dungeon','quarry','pass','signal','furnace','tomb','battlefield','wilderness','portal','chest']);
const point=p=>!!p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
const target=o=>point(o)&&typeof o.id==='string'&&o.id.length>0&&kinds.has(o.kind);
const key=o=>JSON.stringify([o.kind,o.id]);
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const mapValid=m=>!!m&&Number.isInteger(m.w)&&m.w>0&&Number.isInteger(m.h)&&m.h>0&&Array.isArray(m.tiles)&&m.tiles.length===m.h&&m.tiles.every(row=>Array.isArray(row)&&row.length===m.w);
const alive=b=>!!b&&!b.dead&&point(b.p)&&b.p.hp>0&&mapValid(b.map);
const copy=p=>p?{x:p.x,y:p.y}:null;
const yes=(predicate,o)=>{try{return typeof predicate==='function'&&predicate(o)===true;}catch{return false;}};
const shown=(o,visible)=>target(o)&&o.hidden!==true&&o.rendered!==false&&o.visible!==false&&!(o.hideWhenCompleted&&(o.completed===true||Array.isArray(o.actions)&&o.actions.length===0))&&yes(visible,o);
function unique(candidates,o){return Array.isArray(candidates)&&candidates.filter(c=>c&&c.kind===o.kind&&c.id===o.id).length===1;}
function fingerprint(o){
 try{return JSON.stringify([o.open,o.completed,o.closed,o.locked,o.allowed,o.disabled,o.to,o.gate,o.actionKind,Array.isArray(o.actions)?o.actions.map(a=>[a?.label,a?.value,a?.disabled]):null]);}catch{return null;}
}
function sprite(o){
 let type=o.kind==='npc'?'shrine':o.kind==='portal'?(o.to==='ash_hamlet'?'return':'exit'):o.kind==='chest'?'chest':o.kind==='dungeon'?({record:'bird',crank:'barrel',rune:'orb',inlet:'shrine',outlet:'shrine',flow:'shrine',lift:'shrine',bell:'relic',core:'relic',store:'chest'}[o.actionKind]):o.visualType??'relic';
 const used=o.used===true||(['wilderness','battlefield','tomb'].includes(o.kind)?o.completed===true:['quarry','pass','signal','furnace'].includes(o.kind)?Array.isArray(o.actions)&&o.actions.length===0:o.kind==='dungeon'&&['crank','core'].includes(o.actionKind)&&Array.isArray(o.actions)&&o.actions.length===0);
 if(used&&['orb','relic'].includes(type))return null;
 const names={chest:'chest',barrel:'barrel',bird:'skeleton',shrine:'statue',relic:'crystal',orb:'crystal',dummy:'statue',exit:'arch',return:'arch'},widths={chest:38,barrel:28,bird:37,shrine:44,relic:35,orb:28,dummy:38,exit:110,return:100};
 return names[type]?{frame:ART.environment.sprites[names[type]],width:widths[type]}:null;
}

// Coordinates are in the same canvas coordinate space as drawLabels. Labels
// are fixed 120x21 pixels; bodies follow the actual art atlas and render widths.
// The inscribed ellipse avoids making each transparent sprite corner clickable.
export function pickContextClickTarget({screenPoint,candidates,toScreen,visible,labelVisible,width,height,zoom=1.26}={}){
 if(!point(screenPoint)||!Array.isArray(candidates)||typeof toScreen!=='function'||!Number.isFinite(width)||width<=0||!Number.isFinite(height)||height<=0||!Number.isFinite(zoom)||zoom<=0||screenPoint.x<0||screenPoint.x>=width||screenPoint.y<0||screenPoint.y>=height)return null;
 const hits=[];
 for(const o of candidates){
  if(!shown(o,visible)||!unique(candidates,o))continue;
  let p;try{p=toScreen(o);}catch{continue;}if(!point(p))continue;
  const label=yes(labelVisible,o)&&screenPoint.x>=p.x-60&&screenPoint.x<=p.x+60&&screenPoint.y>=p.y-74&&screenPoint.y<=p.y-53;
  let body=false,score=Infinity;const art=sprite(o);
  if(art){const k=art.width*zoom/art.frame.w,rx=art.width*zoom/2,ry=art.frame.h*k/2,cx=p.x+(art.frame.w/2-art.frame.ax)*k,cy=p.y+(art.frame.h/2-art.frame.ay)*k;score=((screenPoint.x-cx)/rx)**2+((screenPoint.y-cy)/ry)**2;body=score<=1;}
  if(label||body)hits.push({o,layer:label?1:0,depth:o.x+o.y,score:label?((screenPoint.x-p.x)/60)**2+((screenPoint.y-(p.y-63.5))/10.5)**2:score,key:key(o)});
 }
 hits.sort((a,b)=>b.layer-a.layer||b.depth-a.depth||a.score-b.score||(a.key<b.key?-1:a.key>b.key?1:0));
 return hits[0]?.o??null;
}

const reachable=(map,from,to)=>!traceSegment(map,from,to,CONTEXT_CLICK_POLICY.collisionRadius).blocked||findPathStep(map,from,to)!==null;
const inReach=(map,from,o)=>distance(from,o)<=CONTEXT_CLICK_POLICY.reach&&lineOfSight(map,from,o);

// A target may be visible around a corner. Only the final approach point needs
// LOS to it; never demand a direct start-to-target ray before trying navigation.
export function planContextApproach({battle,target:object}={}){
 if(!alive(battle)||!target(object)||!inMap(battle.map,battle.p.x,battle.p.y,CONTEXT_CLICK_POLICY.collisionRadius))return null;
 const {map,p}=battle;if(inReach(map,p,object))return copy(p);
 const angle=Math.atan2(p.y-object.y,p.x-object.x),points=[copy(object)];
 for(const radius of [64,48,32,16])for(let n=0;n<16;n++){const a=angle+n*Math.PI/8;points.push({x:object.x+Math.cos(a)*radius,y:object.y+Math.sin(a)*radius});}
 // Tile centers cover narrow passages that fall between the radial samples.
 for(let y=Math.floor((object.y-64)/32);y<=Math.floor((object.y+64)/32);y++)for(let x=Math.floor((object.x-64)/32);x<=Math.floor((object.x+64)/32);x++){const q={x:x*32+16,y:y*32+16};if(distance(q,object)<=64)points.push(q);}
 points.sort((a,b)=>distance(p,a)-distance(p,b)||distance(a,object)-distance(b,object)||a.y-b.y||a.x-b.x);
 for(const q of points)if(inMap(map,q.x,q.y,CONTEXT_CLICK_POLICY.collisionRadius)&&inReach(map,q,object)&&reachable(map,p,q))return q;
 return null;
}

export function createContextClickIntent({stallSeconds=CONTEXT_CLICK_POLICY.stallSeconds,maxSeconds=CONTEXT_CLICK_POLICY.maxSeconds}={}){
 const stallLimit=Number.isFinite(stallSeconds)&&stallSeconds>0?stallSeconds:CONTEXT_CLICK_POLICY.stallSeconds,ageLimit=Number.isFinite(maxSeconds)&&maxSeconds>0?maxSeconds:CONTEXT_CLICK_POLICY.maxSeconds;
 let intent=null;
 function clear(reason='cleared'){intent=null;return {status:'cancelled',reason,target:null,destination:null};}
 function press({target:object,battle,candidates,visible}={}){
  clear();if(!alive(battle)||!shown(object,visible)||!unique(candidates,object))return false;
  const current=candidates.find(c=>c&&c.kind===object.kind&&c.id===object.id);
  if(!shown(current,visible)||current.x!==object.x||current.y!==object.y||fingerprint(current)!==fingerprint(object))return false;
  const signature=fingerprint(current),destination=planContextApproach({battle,target:current});if(signature===null||!destination)return false;
  intent={battle,life:battle.stateLife,region:battle.region,id:current.id,kind:current.kind,position:copy(current),signature,destination,elapsed:0,stalled:0,lastProgress:copy(battle.p)};
  return true;
 }
 function step({battle,candidates,visible,dt=0,blocked=false,busy=false,execute}={}){
  if(!intent)return {status:'idle',target:null,destination:null};
  if(!alive(battle)||intent.battle!==battle||intent.life!==battle.stateLife||intent.region!==battle.region)return clear('identity');
  const matches=Array.isArray(candidates)?candidates.filter(o=>o&&o.kind===intent.kind&&o.id===intent.id):[];
  const object=matches[0];
  if(matches.length!==1||!shown(object,visible)||object.x!==intent.position.x||object.y!==intent.position.y||fingerprint(object)!==intent.signature)return clear('target');
  const seconds=Number.isFinite(dt)&&dt>0?dt:0;intent.elapsed+=seconds;
  if(distance(battle.p,intent.lastProgress)>=1&&!blocked){intent.lastProgress=copy(battle.p);intent.stalled=0;}else intent.stalled+=seconds;
  if(intent.elapsed>=ageLimit||intent.stalled>=stallLimit)return clear('timeout');
  if(inReach(battle.map,battle.p,object)){
   if(busy||typeof execute!=='function')return {status:'waiting',target:object,destination:null};
   // Disarm before invoking user code, including a throwing/reentrant handler.
   intent=null;execute(object);return {status:'consumed',target:object,destination:null};
  }
  if(!inMap(battle.map,intent.destination.x,intent.destination.y,CONTEXT_CLICK_POLICY.collisionRadius)||!inReach(battle.map,intent.destination,object)||!reachable(battle.map,battle.p,intent.destination)){
   const destination=planContextApproach({battle,target:object});if(!destination)return clear('blocked');intent.destination=destination;
  }
  return {status:'approaching',target:object,destination:copy(intent.destination)};
 }
 return {press,step,clear,get active(){return intent!==null;},get destination(){return copy(intent?.destination);},get target(){return intent?{id:intent.id,kind:intent.kind,...intent.position}:null;}};
}
