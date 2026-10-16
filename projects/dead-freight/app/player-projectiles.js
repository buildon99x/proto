/* Fixed120Hz player ballistics. Lightweight swept CCD; no near-range hitscan switch. */
(function(root){
'use strict';const M=root.DFMuzzleBallistics||(typeof require==='function'?require('./muzzle-ballistics.js'):null),Metal=root.DFLiquidMetal||(typeof require==='function'?require('./liquid-metal.js'):null),STEP=1/120,EPS=1e-9;
const copy=p=>({x:p.x,y:p.y||0,z:p.z}),lerp=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t});
function snapshots(world){return world.enemies.map(e=>({...copy(e),id:e.id,boss:!!e.boss,alive:e.alive,yaw:Metal.isMetal(e)?e.metal.yaw:Math.atan2(world.player.x-e.x,world.player.z-e.z)+Math.PI,...(Metal.isMetal(e)?{metalPose:Metal.pose(e),coreExposed:!!e.metal.coreExposed}:{})}));}
function sphere(a,b,r){const d={x:b.x-a.x,y:b.y-a.y,z:b.z-a.z},A=d.x*d.x+d.y*d.y+d.z*d.z,B=2*(a.x*d.x+a.y*d.y+a.z*d.z),C=a.x*a.x+a.y*a.y+a.z*a.z-r*r;if(C<=0)return 0;if(A<EPS)return null;const disc=B*B-4*A*C;if(disc<0)return null;const t=(-B-Math.sqrt(disc))/(2*A);return t>=0&&t<=1?t:null;}
function local(p,target,scale,yaw){const x=(p.x-target.x)/scale,z=(p.z-target.z)/scale,c=Math.cos(yaw),s=Math.sin(yaw);return {x:x*c-z*s,y:(p.y-target.y)/scale,z:x*s+z*c};}
function metalBoxes(pose){const sy=pose.bodyScaleY??1,spread=pose.torsoSpread??0;return [...[-1,1].map(sign=>({x:sign*(.145+spread),y:.72*sy,z:0,w:.29,h:.8*sy,d:.35,part:'torso'})),...[-1,1].flatMap(sign=>[{x:sign*.18,y:.02*sy,z:-.04,w:.24,h:.72*sy,d:.36,part:'limb'},{x:sign*(.43+spread),y:.84*sy,z:-.15,w:.25,h:.69*sy,d:.46,part:'limb'}])];}
// Swept AABB with linearly changing bounds; unlike a frozen end pose this cannot
// skip a thin box while its shell is collapsing. Deformation slices are <=1/960s.
function movingBox(a,b,old,now){let enter=0,exit=1;for(const [key,size] of [['x','w'],['y','h'],['z','d']]){const lo=o=>o[key]-(key==='y'?0:o[size]/2),hi=o=>o[key]+(key==='y'?o[size]:o[size]/2);for(const [q0,q1] of [[a[key]-lo(old),b[key]-lo(now)],[hi(old)-a[key],hi(now)-b[key]]]){if(q0<0&&q1<0)return null;if(q0<0)enter=Math.max(enter,-q0/(q1-q0));else if(q1<0)exit=Math.min(exit,q0/(q0-q1));if(enter>exit)return null;}}return enter;}
function enemyHit(from,to,old,now){
 const scale=now.boss?1.18:1,yaw=old.yaw,a=local(from,old,scale,yaw),b=local(to,now,scale,yaw),pose=now.metalPose;let best=null;
 if(pose){
  // The fixed-position core and the historical shell both use physical contact time.
  if(pose.core.exposed||now.coreTest){const c=pose.core,shift=p=>({x:p.x-c.x,y:p.y-c.y,z:p.z-c.z}),t=sphere(shift(a),shift(b),c.r);if(t!==null&&(!now.coreTest||now.coreTest(t)))best={fraction:t,part:'core',coreExposedAtContact:true};}
  const at=now.metalPoseAt||(()=>pose),p0=at(0),p1=at(1),changing=Math.abs(p0.bodyScaleY-p1.bodyScaleY)>EPS||Math.abs(p0.torsoSpread-p1.torsoSpread)>EPS,boundaries=[0];
  if(changing&&Number.isFinite(now.spanTime)&&now.spanTime>EPS){const start=now.startTime,end=start+now.spanTime;for(let t=(Math.floor(start*960+EPS)+1)/960;t<end-EPS;t+=1/960)boundaries.push((t-start)/now.spanTime);}
  boundaries.push(1);
  for(let i=1;i<boundaries.length;i++){const lo=boundaries[i-1],hi=boundaries[i];if(best&&lo>best.fraction)break;const pa=lo===0?p0:at(lo),pb=hi===1?p1:at(hi),sa=lerp(a,b,lo),sb=lerp(a,b,hi),sy0=Math.max(.05,pa.bodyScaleY),sy1=Math.max(.05,pb.bodyScaleY);
   const head=sphere({...sa,y:sa.y/sy0-1.83},{...sb,y:sb.y/sy1-1.83},.24),boxes0=metalBoxes(pa),boxes1=metalBoxes(pb);
   const accept=(t,part)=>{if(t===null)return;const fraction=lo+(hi-lo)*t;if(!best||fraction<best.fraction)best={fraction,part,coreExposedAtContact:now.coreTest?now.coreTest(fraction):!!pose.core.exposed};};
   accept(head,'head');for(let j=0;j<boxes0.length;j++)accept(movingBox(sa,sb,boxes0[j],boxes1[j]),boxes0[j].part);
  }
 }else{
  const sh=p=>({...p,y:p.y-1.83}),head=sphere(sh(a),sh(b),.24);if(head!==null)best={fraction:head,part:'head'};
  const boxes=[{x:0,y:.72,z:0,w:.58,h:.8,d:.35,part:'torso'},...[-1,1].flatMap(sign=>[{x:sign*.18,y:.02,z:-.04,w:.24,h:.72,d:.36,part:'limb'},{x:sign*.43,y:.84,z:-.15,w:.25,h:.69,d:.46,part:'limb'}])];
  for(const box of boxes){const h=M.segmentBox(a,b,box);if(h&&(!best||h.fraction<best.fraction))best={fraction:h.fraction,part:box.part};}
 }
 return best;
}
function pointAt(shot,time){const age=time-shot.birth,c=shot.record.config;return {x:shot.origin.x+shot.velocity.x*age,y:shot.origin.y+shot.velocity.y*age-.5*c.gravity*age*age,z:shot.origin.z+shot.velocity.z*age};}
function validLaunch(config,launch){return launch&&launch.origin&&['x','y','z'].every(k=>Number.isFinite(launch.origin[k]))&&Array.isArray(launch.directions)&&launch.directions.length===config.pellets&&launch.directions.every(d=>d&&['x','y','z'].every(k=>Number.isFinite(d[k]))&&Math.hypot(d.x,d.y,d.z)>EPS);}
class Projectiles {
 constructor(){this.active=[];this.next=STEP;this.log=[];}
 launch(world,record,origin,directions){if(!origin||!['x','y','z'].every(k=>Number.isFinite(origin[k]))||directions.length!==record.config.pellets)return false;const targets=snapshots(world);for(let i=0;i<directions.length;i++){const d=directions[i],length=Math.hypot(d.x,d.y,d.z);if(!Number.isFinite(length)||length<EPS)return false;}for(let i=0;i<directions.length;i++){const d=directions[i],length=Math.hypot(d.x,d.y,d.z),velocity={x:d.x/length*record.config.speed,y:d.y/length*record.config.speed,z:d.z/length*record.config.speed};this.active.push({record,pelletId:i,origin:copy(origin),position:copy(origin),previous:copy(origin),velocity,birth:world.time,last:world.time,distance:0,targets,contacts:new Set(),damageScale:1});}return true;}
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
  for(let i=0;i<world.enemies.length;i++){const e=world.enemies[i];if(!e.alive||shot.contacts.has('enemy:'+e.id))continue;const now={...targets[i],...(Metal.isMetal(e)?{metalPose:Metal.pose(e),startTime:shot.last,spanTime:(time-shot.last)*scale,metalPoseAt:f=>Metal.poseAt(e,shot.last+(time-shot.last)*scale*f),coreExposed:!!e.metal.coreExposed,coreTest:f=>Metal.exposedAt?Metal.exposedAt(e,shot.last+(time-shot.last)*scale*f):!!e.metal.coreExposed}:{})},old=shot.targets[i]||now;if(Math.max(old.x,now.x)+1.2<Math.min(from.x,to.x)||Math.min(old.x,now.x)-1.2>Math.max(from.x,to.x)||Math.max(old.z,now.z)+1.2<Math.min(from.z,to.z)||Math.min(old.z,now.z)-1.2>Math.max(from.z,to.z))continue;const h=enemyHit(from,to,old,{...now,...lerp(old,now,scale)});if(h&&(!best||h.fraction<best.fraction-EPS))best={kind:'enemy',id:e.id,...h};}
  for(const item of world.pickups){if(!item.alive||item.type!=='barrel')continue;const h=M.segmentBox(from,to,{x:item.x,y:item.y||0,z:item.z,w:1.1,d:1.1,h:1.45});if(h&&(!best||h.fraction<best.fraction-EPS))best={kind:'barrel',id:world.pickups.indexOf(item),...h};}

  const fraction=best?.fraction??1,point=lerp(from,to,fraction),impactTime=shot.last+(time-shot.last)*scale*fraction;return {shot,from,point,span,scale,fraction,best,impactTime};
 }
 finish(world,candidate,time,targets,contactContext){const {shot,from,point,span,scale,fraction,best,impactTime}=candidate;shot.previous=copy(from);shot.position=point;shot.distance+=span*fraction;
  if(best){const speed=Math.hypot(shot.velocity.x,shot.velocity.y,shot.velocity.z),hit={...best,damageScale:shot.damageScale,direction:{x:shot.velocity.x/speed,y:shot.velocity.y/speed,z:shot.velocity.z/speed},head:best.part==='head',distance:shot.distance,point,flightTime:impactTime-shot.birth,impactTime};const result=world.shotResolver.resolve(world,shot.record,hit,shot.pelletId,contactContext);world.emit('bulletcontact',{...hit,weapon:shot.record.weapon,shotId:shot.record.shotId,pelletId:shot.pelletId,contactId:result?.contactId,result});this.log.push({shotId:shot.record.shotId,pelletId:shot.pelletId,birth:shot.birth,origin:shot.origin,velocity:shot.velocity,...hit,result});
   if(result?.transmit&&shot.contacts.size<8){shot.contacts.add(best.kind+':'+best.id);shot.damageScale*=.7;const fractionTime=(impactTime-shot.last)/Math.max(EPS,time-shot.last);shot.targets=targets.map((e,i)=>({...e,...lerp(shot.targets[i]||e,e,fractionTime)}));shot.last=impactTime;return;}
   shot.done=true;}
  else if(scale<1||shot.distance>=shot.record.config.maxRange-EPS||point.y<0){world.shotResolver.resolve(world,shot.record,null,shot.pelletId);shot.done=true;}
  shot.last=time;shot.targets=targets;
 }
 step(world,time,targets){
  let pending=this.active.filter(shot=>!shot.done&&time>Math.max(shot.birth,shot.last)+EPS).map(shot=>this.sweep(world,shot,time,targets));
  while(pending.length){
   let first=Infinity;for(const c of pending)if(c.best)first=Math.min(first,c.impactTime);
   if(!Number.isFinite(first)){for(const c of pending)this.finish(world,c,time,targets);break;}
   // Simultaneous contacts all stop at the pre-contact surface. Later arrivals see destruction.
   const group=pending.filter(c=>c.best&&Math.abs(c.impactTime-first)<=EPS),selected=new Set(group),target=c=>c.best.kind==='wall'?world.walls[c.best.id]:c.best.kind==='enemy'?world.enemies[c.best.id]:world.pickups[c.best.id],liveBefore=group.map(c=>({alive:!!target(c)?.alive,exposed:!!target(c)?.metal?.coreExposed}));
   const contactContext={metalExposure:world.enemies.map(e=>Metal.exposedAt(e,first))};
   for(const c of group){this.finish(world,c,time,targets,contactContext);if(world.player.hp<=0||world.extracted){this.clear();return;}}
   const changed=group.some((c,i)=>liveBefore[i].alive!==!!target(c)?.alive||liveBefore[i].exposed!==!!target(c)?.metal?.coreExposed);pending=pending.filter(c=>!selected.has(c));
   if(changed)pending=pending.map(c=>{
    // New colliders cannot reach backward into already-travelled time. Every remaining
    // candidate was contact-free until this group, under the pre-change world.
    const shot=c.shot;if(!c.best&&c.impactTime<=first+EPS&&(c.scale<1||shot.distance+c.span>=shot.record.config.maxRange-EPS||c.point.y<0)){this.finish(world,c,time,targets);return null;}if(first>shot.last+EPS){const fractionTime=(first-shot.last)/Math.max(EPS,time-shot.last),point=pointAt(shot,first);shot.distance+=Math.hypot(point.x-shot.position.x,point.y-shot.position.y,point.z-shot.position.z);shot.position=point;shot.targets=targets.map((e,i)=>({...e,...lerp(shot.targets[i]||e,e,fractionTime)}));shot.last=first;}
    return this.sweep(world,shot,time,targets);
   }).filter(Boolean);
   for(const c of group)if(!c.shot.done)pending.push(this.sweep(world,c.shot,time,targets));
  }
  this.active=this.active.filter(s=>!s.done);while(this.log.length>512)this.log.shift();
 }

}
const api={validLaunch,STEP,Projectiles,snapshots,pointAt,enemyHit};root.DFProjectiles=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
