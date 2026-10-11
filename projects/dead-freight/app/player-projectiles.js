/* Fixed120Hz player ballistics. Lightweight swept CCD; no near-range hitscan switch. */
(function(root){
'use strict';const M=root.DFMuzzleBallistics||(typeof require==='function'?require('./muzzle-ballistics.js'):null),STEP=1/120,EPS=1e-9;
const copy=p=>({x:p.x,y:p.y||0,z:p.z}),lerp=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t});
function snapshots(world){return world.enemies.map(e=>({...copy(e),id:e.id,boss:!!e.boss,alive:e.alive,yaw:Math.atan2(world.player.x-e.x,world.player.z-e.z)+Math.PI}));}
function sphere(a,b,r){const d={x:b.x-a.x,y:b.y-a.y,z:b.z-a.z},A=d.x*d.x+d.y*d.y+d.z*d.z,B=2*(a.x*d.x+a.y*d.y+a.z*d.z),C=a.x*a.x+a.y*a.y+a.z*a.z-r*r;if(C<=0)return 0;if(A<EPS)return null;const disc=B*B-4*A*C;if(disc<0)return null;const t=(-B-Math.sqrt(disc))/(2*A);return t>=0&&t<=1?t:null;}
function local(p,target,scale,yaw){const x=(p.x-target.x)/scale,z=(p.z-target.z)/scale,c=Math.cos(yaw),s=Math.sin(yaw);return {x:x*c-z*s,y:(p.y-target.y)/scale,z:x*s+z*c};}
function enemyHit(from,to,old,now){const scale=now.boss?1.18:1,yaw=old.yaw,a=local(from,old,scale,yaw),b=local(to,now,scale,yaw),sh=(p)=>({...p,y:p.y-1.83});let best=null;const head=sphere(sh(a),sh(b),.24);if(head!==null)best={fraction:head,part:'head'};
 // Author-authored collision boxes follow the visible trunk/limb extents, excluding gun/hat decoration.
 const boxes=[{x:0,y:.72,z:0,w:.58,h:.8,d:.35,part:'torso'},...[-1,1].flatMap(s=>[{x:s*.18,y:.02,z:-.04,w:.24,h:.72,d:.36,part:'limb'},{x:s*.43,y:.84,z:-.15,w:.25,h:.69,d:.46,part:'limb'}])];
 for(const box of boxes){const h=M.segmentBox(a,b,box);if(h&&(!best||h.fraction<best.fraction))best={fraction:h.fraction,part:box.part};}return best;
}
function pointAt(shot,time){const age=time-shot.birth,c=shot.record.config;return {x:shot.origin.x+shot.velocity.x*age,y:shot.origin.y+shot.velocity.y*age-.5*c.gravity*age*age,z:shot.origin.z+shot.velocity.z*age};}
function validLaunch(config,launch){return launch&&launch.origin&&['x','y','z'].every(k=>Number.isFinite(launch.origin[k]))&&Array.isArray(launch.directions)&&launch.directions.length===config.pellets&&launch.directions.every(d=>d&&['x','y','z'].every(k=>Number.isFinite(d[k]))&&Math.hypot(d.x,d.y,d.z)>EPS);}
class Projectiles {
 constructor(){this.active=[];this.next=STEP;this.log=[];}
 launch(world,record,origin,directions){if(!origin||!['x','y','z'].every(k=>Number.isFinite(origin[k]))||directions.length!==record.config.pellets)return false;const targets=snapshots(world);for(let i=0;i<directions.length;i++){const d=directions[i],length=Math.hypot(d.x,d.y,d.z);if(!Number.isFinite(length)||length<EPS)return false;}for(let i=0;i<directions.length;i++){const d=directions[i],length=Math.hypot(d.x,d.y,d.z),velocity={x:d.x/length*record.config.speed,y:d.y/length*record.config.speed,z:d.z/length*record.config.speed};this.active.push({record,pelletId:i,origin:copy(origin),position:copy(origin),previous:copy(origin),velocity,birth:world.time,last:world.time,distance:0,targets});}return true;}
 clear(){this.active.length=0;}
 advance(world,dt,before,incomingContacts=[]){const end=world.time,start=end-dt;if(this.next<start-EPS)this.next=(Math.floor((start+EPS)/STEP)+1)*STEP;
  // Incoming damage is a timed boundary too: it cannot cancel an earlier player contact.
  const contacts=incomingContacts.slice().sort((a,b)=>a.time-b.time);let index=0;
  while(this.next<=end+EPS||index<contacts.length){const contactTime=index<contacts.length?Math.max(start,Math.min(end,contacts[index].time)):Infinity,time=Math.min(this.next,contactTime),t=Math.max(0,Math.min(1,(time-start)/dt)),after=snapshots(world),targets=after.map((e,i)=>{const old=before[i]||e,delta=Math.atan2(Math.sin(e.yaw-old.yaw),Math.cos(e.yaw-old.yaw));return {...e,...lerp(old,e,t),yaw:old.yaw+delta*t};});
   this.step(world,time,targets);if(this.next<=time+EPS)this.next+=STEP;
   if(world.player.hp<=0||world.extracted){this.clear();return;}
   while(index<contacts.length&&contacts[index].time<=time+EPS){contacts[index++].apply();if(world.player.hp<=0||world.extracted){this.clear();return;}}
  }
 }
 sweep(world,shot,time,targets){const from=shot.position,full=pointAt(shot,time),length=Math.hypot(full.x-from.x,full.y-from.y,full.z-from.z),remaining=shot.record.config.maxRange-shot.distance,scale=length>remaining?remaining/length:1,to=lerp(from,full,scale),wall=M.trace(world,from,to),span=length*scale;let best=wall?{kind:'wall',id:wall.wall.id,fraction:wall.fraction,normal:wall.normal}:null;
  for(let i=0;i<world.enemies.length;i++){const e=world.enemies[i];if(!e.alive)continue;const now=targets[i],old=shot.targets[i]||now;if(Math.max(old.x,now.x)+.8<Math.min(from.x,to.x)||Math.min(old.x,now.x)-.8>Math.max(from.x,to.x)||Math.max(old.z,now.z)+.8<Math.min(from.z,to.z)||Math.min(old.z,now.z)-.8>Math.max(from.z,to.z))continue;const h=enemyHit(from,to,old,{...now,...lerp(old,now,scale)});if(h&&(!best||h.fraction<best.fraction-EPS))best={kind:'enemy',id:e.id,...h};}
  for(const item of world.pickups){if(!item.alive||item.type!=='barrel')continue;const h=M.segmentBox(from,to,{x:item.x,y:item.y||0,z:item.z,w:1.1,d:1.1,h:1.45});if(h&&(!best||h.fraction<best.fraction-EPS))best={kind:'barrel',id:world.pickups.indexOf(item),...h};}

  const fraction=best?.fraction??1,point=lerp(from,to,fraction),impactTime=shot.last+(time-shot.last)*scale*fraction;return {shot,from,point,span,scale,fraction,best,impactTime};
 }
 finish(world,candidate,time,targets){const {shot,from,point,span,scale,fraction,best,impactTime}=candidate;shot.previous=copy(from);shot.position=point;shot.distance+=span*fraction;
  if(best){const hit={...best,head:best.part==='head',distance:shot.distance,point,flightTime:impactTime-shot.birth,impactTime};const result=world.shotResolver.resolve(world,shot.record,hit,shot.pelletId);world.emit('bulletcontact',{...hit,weapon:shot.record.weapon,shotId:shot.record.shotId,pelletId:shot.pelletId,result});this.log.push({shotId:shot.record.shotId,pelletId:shot.pelletId,birth:shot.birth,origin:shot.origin,velocity:shot.velocity,...hit,result});shot.done=true;}
  else if(scale<1||shot.distance>=shot.record.config.maxRange-EPS||point.y<0){world.shotResolver.resolve(world,shot.record,null,shot.pelletId);shot.done=true;}
  shot.last=time;shot.targets=targets;
 }
 step(world,time,targets){
  let pending=this.active.filter(shot=>!shot.done&&time>Math.max(shot.birth,shot.last)+EPS).map(shot=>this.sweep(world,shot,time,targets));
  while(pending.length){
   let first=Infinity;for(const c of pending)if(c.best)first=Math.min(first,c.impactTime);
   if(!Number.isFinite(first)){for(const c of pending)this.finish(world,c,time,targets);break;}
   // Simultaneous contacts all stop at the pre-contact surface. Later arrivals see destruction.
   const group=pending.filter(c=>c.best&&Math.abs(c.impactTime-first)<=EPS),selected=new Set(group),target=c=>c.best.kind==='wall'?world.walls[c.best.id]:c.best.kind==='enemy'?world.enemies[c.best.id]:world.pickups[c.best.id],liveBefore=group.map(c=>!!target(c)?.alive);
   for(const c of group){this.finish(world,c,time,targets);if(world.player.hp<=0||world.extracted){this.clear();return;}}
   const changed=group.some((c,i)=>liveBefore[i]&&!target(c)?.alive);pending=pending.filter(c=>!selected.has(c));
   if(changed)pending=pending.map(c=>this.sweep(world,c.shot,time,targets));
  }
  this.active=this.active.filter(s=>!s.done);while(this.log.length>512)this.log.shift();
 }

}
const api={validLaunch,STEP,Projectiles,snapshots,pointAt,enemyHit};root.DFProjectiles=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
