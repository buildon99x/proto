// POE-oriented, Emberwatch-authored body model. These radii/classifications and
// deterministic sweep/slide/push rules are NOT measured POE2 engine parameters.
// Historical GGG basis (Dec 2024): rolling size shrinks; selected small monsters
// can be pushed; a zero-size player still cannot phase through monster bodies.
// https://www.pathofexile.com/forum/view-thread/3611705
// https://www.pathofexile.com/forum/view-thread/3621299
import {inMap} from './world-geometry.js';
export const ACTOR_BODY_TUNING=Object.freeze({wallRadius:11,heroRadius:11,rollingHeroRadius:0,enemyRadius:11});
const small=Object.freeze({radius:11,rollPushable:true}),large=Object.freeze({radius:11,rollPushable:false});
// Explicit authored categories, never inferred from HP or rendered sprite size.
export const ENEMY_BODY_CATALOG=Object.freeze({
 scout:small,archer:small,bruiser:large,warden:large,sluice_keeper:large,
 quarry_raider:small,quarry_slinger:small,quarry_guard:large,
 pass_raider:small,pass_ranger:small,pass_elite:large,
 signal_runner:small,signal_archer:small,signal_keeper:large,
 furnace_tender:small,furnace_nozzle:small,furnace_warden:large,
 tomb_blade:small,tomb_scribe:small,tomb_vigil:large,tomb_piercer:small,tomb_oathkeeper:large,
 battlefield_revenant:small,battlefield_hexer:small,battlefield_pyromancer:small,battlefield_lancer:small,battlefield_binder:small,battlefield_bulwark:large,battlefield_usurper:large,
 wilderness_flanker:small,wilderness_revenant:small,wilderness_hexer:small,wilderness_binder:small,wilderness_pyromancer:small,wilderness_lancer:small,wilderness_bulwark:large,wilderness_keeper:large,
});
const EPS=1e-9,SKIN=1e-7;
const bodyId=(b,actor)=>actor===b.p?'@hero':String(actor.id);
export function actorBodyPresent(b,actor){
 if(!(actor?.hp>0)||actor.dead)return false;
 const gate=actor.gate;if(!gate)return true;
 return (b.equipmentContext?.world?.objectives?.[typeof gate==='string'?gate:gate.objective]??0)>=(gate.minimum??1);
}
export function actorBodyRadius(b,actor,{rolling=b.poeMobility?.snapshot().state==='roll'}={}){
 return actor===b.p?(rolling?ACTOR_BODY_TUNING.rollingHeroRadius:ACTOR_BODY_TUNING.heroRadius):(ENEMY_BODY_CATALOG[actor.kind]??large).radius;
}
export const canRollPush=actor=>(ENEMY_BODY_CATALOG[actor.kind]??large).rollPushable&&actor.state!=='windup'&&!actor.telegraph;
const sortedActors=b=>[b.p,...b.enemies].filter(e=>actorBodyPresent(b,e)).sort((a,z)=>bodyId(b,a).localeCompare(bodyId(b,z)));
// Initial overlaps (old saves, legal roll-end expansion, spawn overlap) never
// teleport actors. Only monotone outward/tangent movement may leave an overlap.
function circleHit(p,v,q,r){
 const x=p.x-q.x,y=p.y-q.y,dot=x*v.x+y*v.y,c=x*x+y*y-r*r,a=v.x*v.x+v.y*v.y;
 if(a<EPS*EPS)return null;
 if(c<=EPS){if(dot>=-EPS)return null;const n=Math.hypot(x,y);return {t:0,nx:x/n,ny:y/n,overlap:c< -EPS};}
 if(dot>=0)return null;const disc=dot*dot-a*c;if(disc<0)return null;
 const t=(-dot-Math.sqrt(disc))/a;if(t< -EPS||t>1+EPS)return null;
 const nx=x+v.x*t,ny=y+v.y*t,n=Math.hypot(nx,ny);return {t:Math.max(0,Math.min(1,t)),nx:nx/n,ny:ny/n,overlap:false};
}
function wallHit(p,v,box){
 let enter=-Infinity,leave=Infinity,nx=0,ny=0;
 for(const [axis,lo,hi] of [['x',box.x0,box.x1],['y',box.y0,box.y1]]){
  const velocity=v[axis],position=p[axis];
  // Tangential or departing contact with a tile's expanded boundary is legal.
  if(Math.abs(velocity)<EPS){if(position<=lo+EPS||position>=hi-EPS)return null;continue;}
  const a=(lo-position)/velocity,z=(hi-position)/velocity,near=Math.min(a,z),far=Math.max(a,z);
  if(near>enter){enter=near;nx=axis==='x'?(velocity>0?-1:1):0;ny=axis==='y'?(velocity>0?-1:1):0;}
  leave=Math.min(leave,far);
 }
 if(enter>leave+EPS||leave<=EPS||enter< -EPS||enter>1+EPS)return null;
 return {t:Math.max(0,Math.min(1,enter)),nx,ny,wall:true};
}
function firstHit(b,actor,p,v,{rolling=false,ignore=null}={}){
 let best=null;const consider=(hit,id,other=null)=>{if(hit&&(!best||hit.t<best.t-EPS||Math.abs(hit.t-best.t)<=EPS&&id<best.id))best={...hit,id,other};};
 const radius=actorBodyRadius(b,actor,{rolling}),wall=ACTOR_BODY_TUNING.wallRadius;
 const x0=Math.floor((Math.min(p.x,p.x+v.x)-wall)/32),x1=Math.floor((Math.max(p.x,p.x+v.x)+wall)/32),y0=Math.floor((Math.min(p.y,p.y+v.y)-wall)/32),y1=Math.floor((Math.max(p.y,p.y+v.y)+wall)/32);
 for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)if(b.map.tiles[y]?.[x]!==1)consider(wallHit(p,v,{x0:x*32-wall,y0:y*32-wall,x1:(x+1)*32+wall,y1:(y+1)*32+wall}),`!wall:${y}:${x}`);
 for(const other of sortedActors(b))if(other!==actor&&other!==ignore){const otherRadius=actorBodyRadius(b,other,{rolling:other===b.p?b.poeMobility?.snapshot().state==='roll':false});consider(circleHit(p,v,other,radius+otherRadius),bodyId(b,other),other);}
 return best;
}
/** Mutates only actor/pushed positions. No damage, stun, aggro, RNG, or time.
 * Path times are fractions of this displacement's simulation slice. At most 32
 * contacts may be resolved per slice; exhaustion stops safely without phasing.
 */
export function moveActorBody(b,actor,dx,dy,{rolling=false,push=rolling&&actor===b.p}={}){
 const start={x:actor.x,y:actor.y},path=[];let v={x:dx,y:dy},time=0,left=1;
 const append=(x,y,until)=>{if(until>time+1e-12)path.push({x0:actor.x,y0:actor.y,x1:x,y1:y,t0:time,t1:until});actor.x=x;actor.y=y;time=until;};
 if(!Number.isFinite(dx)||!Number.isFinite(dy)||!inMap(b.map,actor.x,actor.y,ACTOR_BODY_TUNING.wallRadius))v={x:0,y:0};
 for(let i=0;i<32&&left>EPS&&Math.hypot(v.x,v.y)>EPS;i++){
  const hit=firstHit(b,actor,actor,v,{rolling});
  if(!hit){append(actor.x+v.x,actor.y+v.y,1);left=0;break;}
  const at=hit.t,skin=hit.wall?Math.min(at,SKIN/Math.max(Math.hypot(v.x,v.y),EPS)):0;
  append(actor.x+v.x*(at-skin),actor.y+v.y*(at-skin),time+left*at);left*=1-at;v.x*=1-at;v.y*=1-at;
  if(push&&hit.other&&!hit.overlap&&canRollPush(hit.other)){
   // Single-body push only. Obstruction is swept before either body moves; a
   // second monster never gets pushed as a chain or ignored as a fallback.
   const obstacle=firstHit(b,hit.other,hit.other,v,{ignore:actor}),heroObstacle=firstHit(b,actor,actor,v,{rolling,ignore:hit.other});
   let amount=Math.min(1,obstacle?.t??1,heroObstacle?.t??1);
   if(obstacle?.wall||heroObstacle?.wall)amount=Math.max(0,amount-SKIN/Math.max(Math.hypot(v.x,v.y),EPS));
   if(amount>EPS){hit.other.x+=v.x*amount;hit.other.y+=v.y*amount;append(actor.x+v.x*amount,actor.y+v.y*amount,time+left*amount);left*=1-amount;v.x*=1-amount;v.y*=1-amount;continue;}
  }
  const inward=v.x*hit.nx+v.y*hit.ny;if(inward>=-EPS)break;
  v.x-=hit.nx*inward;v.y-=hit.ny*inward;
 }
 if(time<1)append(actor.x,actor.y,1);
 return {x:actor.x-start.x,y:actor.y-start.y,path};
}
export function previewActorBody(b,actor,dx,dy,options={}){
 const hero={...b.p},enemies=b.enemies.map(e=>({...e})),copy={...b,p:hero,enemies},subject=actor===b.p?hero:enemies[b.enemies.indexOf(actor)];
 return moveActorBody(copy,subject,dx,dy,options);
}
/** Earliest relative contact along the resolved, possibly stopped/slid path. */
export function relativePathContact(path,shot,seconds,radius=15){
 let first=Infinity;if(!(seconds>0))return first;
 for(const leg of path){
  const duration=(leg.t1-leg.t0)*seconds;if(!(duration>0))continue;
  const start=leg.t0*seconds,p={x:shot.x+shot.vx*start-leg.x0,y:shot.y+shot.vy*start-leg.y0},v={x:shot.vx*duration-(leg.x1-leg.x0),y:shot.vy*duration-(leg.y1-leg.y0)};
  if(p.x*p.x+p.y*p.y<=radius*radius+1e-8)return start;
  const hit=circleHit(p,v,{x:0,y:0},radius);if(hit)first=Math.min(first,start+hit.t*duration);
 }
 return first;
}
