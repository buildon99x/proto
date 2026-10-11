// Explicit, read-only QA overlay. No input dispatch, clocks, events, body preview,
// collision solving, persistence or simulation mutation belongs in this module.
import {actorBodyPresent,actorBodyRadius,ENEMY_BODY_CATALOG} from './actor-body.js';
import {ISO,projectWorld} from './visual.js';

export const CONTACT_TRACE_LIMITS=Object.freeze({frames:96,actors:24,scan:128,path:33,circleSegments:32,range:160,nearGap:.75});
const EMPTY=Object.freeze([]);
const OFF=Object.freeze({enabled:false,frames:EMPTY,bodies:EMPTY,path:EMPTY,markers:EMPTY});
const finitePoint=p=>Number.isFinite(p?.x)&&Number.isFinite(p?.y);
const point=p=>({x:p.x,y:p.y});
const scalar=value=>typeof value==='string'?value.slice(0,80):Number.isFinite(value)?value:null;
const bounded=(value,fallback,max)=>Number.isFinite(value)?Math.max(1,Math.min(max,Math.floor(value))):fallback;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const copyFrame=f=>({...f});
const copyBody=b=>({...b});
const copyMarker=m=>({...m});

/** Same ground projection and shake translation as visual.js. No sprite lift. */
export function contactTraceToScreen(p,{focus,width,height,time=0,shake=0,zoom=ISO.zoom}){
 if(!finitePoint(p)||!finitePoint(focus)||!(width>0)||!(height>0)||!Number.isFinite(width)||!Number.isFinite(height)||!Number.isFinite(zoom)||!(zoom>0))return null;
 const q=projectWorld(p.x-focus.x,p.y-focus.y),t=Number.isFinite(time)?time:0,s=Number.isFinite(shake)?shake:0;
 return {x:width*.5+q.x*zoom+Math.sin(t*133)*s*.4,y:height*.55+q.y*zoom+Math.cos(t*117)*s*.4};
}

/** World-ground circle, including a zero-radius roll body. Projection is later. */
export function contactTraceCircle(body){
 if(!finitePoint(body)||!Number.isFinite(body.radius)||body.radius<0)return [];
 return Array.from({length:CONTACT_TRACE_LIMITS.circleSegments+1},(_,i)=>{const a=i/CONTACT_TRACE_LIMITS.circleSegments*Math.PI*2;return {x:body.x+Math.cos(a)*body.radius,y:body.y+Math.sin(a)*body.radius};});
}

function readPath(battle,hero,allowed){
 if(!allowed||!Array.isArray(battle.poeHeroPath))return {path:[],pathClipped:false};
 const source=battle.poeHeroPath,path=[],count=Math.min(source.length,CONTACT_TRACE_LIMITS.path);
 for(let i=0;i<count;i++){
  const leg=source[i];
  if(!leg||!['x0','y0','x1','y1','t0','t1'].every(k=>Number.isFinite(leg[k]))||leg.t0<0||leg.t1>1+1e-8||leg.t1<leg.t0)return {path:[],pathClipped:false};
  if(i&&(Math.hypot(leg.x0-path[i-1].x1,leg.y0-path[i-1].y1)>1e-6||leg.t0<path[i-1].t1-1e-8))return {path:[],pathClipped:false};
  path.push({x0:leg.x0,y0:leg.y0,x1:leg.x1,y1:leg.y1,t0:leg.t0,t1:leg.t1});
 }
 const pathClipped=source.length>count;
 // A stale path left by a reset/load/other movement is not this hero's path.
 if(!pathClipped&&path.length&&Math.hypot(path.at(-1).x1-hero.x,path.at(-1).y1-hero.y)>1e-6)return {path:[],pathClipped:false};
 return {path,pathClipped};
}

function geometryMarkers(hero,bodies,path){
 const markers=[];
 for(const body of bodies){
  const d=distance(hero,body),gap=d-hero.radius-body.radius;
  if(gap>CONTACT_TRACE_LIMITS.nearGap)continue;
  const nx=d?(body.x-hero.x)/d:0,ny=d?(body.y-hero.y)/d:0;
  // Midpoint of the two closest circle surfaces, NOT a collision event point.
  markers.push({kind:gap< -1e-6?'overlap':'proximity',bodyId:body.id,x:hero.x+nx*(hero.radius+gap/2),y:hero.y+ny*(hero.radius+gap/2),gap,inferred:true,basis:'snapshot-circle-distance',cause:'unknown'});
 }
 for(let i=1;i<path.length;i++){
  const a=path[i-1],b=path[i],ax=a.x1-a.x0,ay=a.y1-a.y0,bx=b.x1-b.x0,by=b.y1-b.y0,al=Math.hypot(ax,ay),bl=Math.hypot(bx,by);
  if(al>1e-6&&bl>1e-6&&(ax*bx+ay*by)/(al*bl)<.985)markers.push({kind:'deflection',x:b.x0,y:b.y0,inferred:true,basis:'resolved-path-bend',cause:'unknown'});
 }
 return markers;
}

/**
 * Observe after the real stepBattle call with {stepped:true}. It copies only
 * finite snapshot values. `path` is the engine's LAST simulation slice, never
 * the complete display frame, contact event stream, or a resimulated path.
 * Optional entityVisible runs only on bounded eligible live actors, during
 * observation; it and the actors are never retained. OFF does not read inputs.
 */
export function createContactTrace({enabled=false,frameLimit=CONTACT_TRACE_LIMITS.frames,actorLimit=CONTACT_TRACE_LIMITS.actors}={}){
 const maxFrames=bounded(frameLimit,CONTACT_TRACE_LIMITS.frames,CONTACT_TRACE_LIMITS.frames),maxActors=bounded(actorLimit,CONTACT_TRACE_LIMITS.actors,CONTACT_TRACE_LIMITS.actors);
 let on=enabled===true,frames=[],latest=null,sequence=0;
 const clear=()=>{frames=[];latest=null;sequence=0;};
 function observe(battle,options){
  if(!on)return false;
  if(!battle||!finitePoint(battle.p)||!Number.isFinite(battle.time)||battle.dead||!actorBodyPresent(battle,battle.p)){clear();return false;}
  const opts=options??{},mobility=battle.poeMobility?.snapshot(),rolling=mobility?.state==='roll',poe=!!battle.poeMobility;
  const hero={id:'@hero',...point(battle.p),radius:actorBodyRadius(battle,battle.p,{rolling}),rolling};
  const region=scalar(battle.region),life=scalar(battle.stateLife),time=battle.time;
  if(latest&&(latest.region!==region||latest.life!==life||time<latest.time||distance(latest.hero,hero)>CONTACT_TRACE_LIMITS.range))clear();
  const previous=latest,advanced=!!previous&&time>previous.time;
  const bodies=[],enemies=Array.isArray(battle.enemies)?battle.enemies:[],count=Math.min(enemies.length,CONTACT_TRACE_LIMITS.scan);
  let eligible=0;
  for(let i=0;i<count;i++){
   const actor=enemies[i];
   if(!finitePoint(actor)||!actorBodyPresent(battle,actor)||distance(hero,actor)>CONTACT_TRACE_LIMITS.range||typeof opts.entityVisible==='function'&&!opts.entityVisible(actor))continue;
   eligible++;
   const body={id:scalar(actor.id),kind:scalar(actor.kind),...point(actor),radius:actorBodyRadius(battle,actor,{rolling:false}),rollPushable:ENEMY_BODY_CATALOG[actor.kind]?.rollPushable===true};
   // Keep nearest bodies within the bounded scan, so crowded QA still shows
   // immediate contacts instead of whichever enemies happen to be listed first.
   bodies.push(body);bodies.sort((a,b)=>distance(hero,a)-distance(hero,b)||String(a.id).localeCompare(String(b.id)));if(bodies.length>maxActors)bodies.pop();
  }
  const {path,pathClipped}=readPath(battle,hero,opts.stepped===true&&poe&&(!previous||advanced));
  const fresh=!previous||advanced||hero.x!==previous.hero.x||hero.y!==previous.hero.y||hero.radius!==previous.hero.radius;
  if(fresh){frames.push({sequence:++sequence,time,...point(hero),radius:hero.radius});if(frames.length>maxFrames)frames.shift();}
  latest={region,life,time,hero,bodies,path,pathClipped,markers:geometryMarkers(hero,bodies,path),move:finitePoint(opts.move)?point(opts.move):null,bodyModel:poe?'poe-actor-body':'reference-only-legacy-wall-movement',pathBasis:path.length?'engine-final-slice':null,engineContactsAvailable:false,scanClipped:enemies.length>count,actorsClipped:eligible>bodies.length,scanned:count};
  return true;
 }
 function snapshot(){
  if(!on)return OFF;
  if(!latest)return {enabled:true,frames:[],bodies:[],path:[],markers:[],engineContactsAvailable:false};
  return {...latest,enabled:true,hero:copyBody(latest.hero),bodies:latest.bodies.map(copyBody),path:latest.path.map(leg=>({...leg})),frames:frames.map(copyFrame),markers:latest.markers.map(copyMarker),move:latest.move?point(latest.move):null};
 }
 function draw(ctx,view){
  if(!on||!latest)return false;
  const project=p=>contactTraceToScreen(p,view);
  if(!project(latest.hero))return false;
  const stroke=(points,color,width=1.25,dash=[])=>{
   if(!points.length)return;ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash(dash);ctx.beginPath();points.forEach((p,i)=>{const q=project(p);if(i)ctx.lineTo(q.x,q.y);else ctx.moveTo(q.x,q.y);});ctx.stroke();
  };
  ctx.save();
  try{
   ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.filter='none';ctx.lineCap='round';ctx.lineJoin='round';
   // Dashed sample-to-sample chords are explicitly inferred. A curved path
   // between samples is not reconstructed or certified by this trail.
   stroke(frames,'#75ddeb',1.25,[3,4]);
   for(const leg of latest.path)stroke([{x:leg.x0,y:leg.y0},{x:leg.x1,y:leg.y1}],'#c7ffab',2);
   for(const body of [latest.hero,...latest.bodies]){
    const color=body.id==='@hero'?'#75ddeb':'#f6abd9';
    if(body.radius>0)stroke(contactTraceCircle(body),color,1.5);
    const q=project(body);ctx.setLineDash([]);ctx.strokeStyle=color;ctx.lineWidth=1.25;ctx.beginPath();ctx.moveTo(q.x-3,q.y);ctx.lineTo(q.x+3,q.y);ctx.moveTo(q.x,q.y-3);ctx.lineTo(q.x,q.y+3);ctx.stroke();
   }
   for(const marker of latest.markers){const q=project(marker);ctx.strokeStyle=marker.kind==='overlap'?'#ffae92':'#ffe58f';ctx.lineWidth=1.5;ctx.setLineDash([2,2]);ctx.beginPath();ctx.moveTo(q.x,q.y-5);ctx.lineTo(q.x+5,q.y);ctx.lineTo(q.x,q.y+5);ctx.lineTo(q.x-5,q.y);ctx.closePath();ctx.stroke();}
   ctx.setLineDash([]);ctx.font='11px monospace';ctx.textAlign='left';ctx.textBaseline='top';ctx.fillStyle='#c9f0f3';
   const text=latest.bodyModel==='poe-actor-body'?`QA body r${latest.hero.radius} / mob r11 · markers inferred`:'QA body reference only · legacy movement';
   ctx.fillText(text,12,12);ctx.fillText('dashed: sampled trail · green: last-slice path',12,27);ctx.fillText('No engine contact events · cause unconfirmed',12,42);
   if(latest.scanClipped||latest.actorsClipped||latest.pathClipped)ctx.fillText('QA trace clipped by fixed limits',12,57);
  }finally{ctx.restore();}
  return true;
 }
 return {get enabled(){return on;},setEnabled(value){const next=value===true;if(next!==on){on=next;clear();}return on;},clear,observe,snapshot,draw};
}
