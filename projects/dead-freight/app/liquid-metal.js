/* Original SILT sentinel controller. Deterministic simulation; presentation reads pose(). */
(function(root){
'use strict';
const EPS=1e-9;
const TUNING=Object.freeze({cohesion:100,coreHp:80,activation:24,leash:30,speed:2.2,reach:3,width:.5,damage:32,windup:.75,aimLock:.25,strike:.16,recovery:.7,disrupted:1.4,reform:1,holeLife:.6,maxHoles:6});
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),finite=(n,f=0)=>Number.isFinite(n)?n:f;
const smooth=n=>{const t=clamp(n,0,1);return t*t*(3-2*t);};
function isMetal(e){return !!e&&e.archetype==='silt';}
function initialize(e){
 if(!isMetal(e))return null;if(e.metal)return e.metal;
 e.homeX=finite(e.homeX,finite(e.x));e.homeZ=finite(e.homeZ,finite(e.z));e.hp=TUNING.coreHp;e.armor=0;
 e.metal={state:e.alive===false?'dead':'idle',stateTime:0,remaining:0,cohesion:TUNING.cohesion,coreHp:TUNING.coreHp,yaw:finite(e.yaw),aimX:0,aimY:0,aimZ:-1,holes:[],coreExposed:false,exposureStart:null,exposureEnd:null,attackId:0,aimLocked:false};
 return e.metal;
}
// Physical-time exposure survives the end-of-step reform transition. Caller owns liveness.
function exposedAt(e,time){const m=e&&e.metal;return !!(isMetal(e)&&m&&Number.isFinite(time)&&Number.isFinite(m.exposureStart)&&Number.isFinite(m.exposureEnd)&&time>=m.exposureStart&&time<m.exposureEnd);}
function emit(world,type,data){if(typeof world.emit==='function')world.emit(type,data);}
function enter(e,state,time){const m=e.metal;m.state=state;m.stateTime=0;m.remaining=TUNING[state]||0;m.enteredAt=time;m.coreExposed=state==='disrupted'||state==='reform';if(state!=='windup')m.aimLocked=state==='strike'||state==='recovery';}
function bladeOrigin(e){const m=e.metal,c=Math.cos(m.yaw),s=Math.sin(m.yaw);return {x:e.x+.48*c-.15*s,y:finite(e.y)+1.25,z:e.z-.48*s-.15*c};}
function aim(e,p){const m=e.metal,dx=p.x-e.x,dz=p.z-e.z;if(Math.hypot(dx,dz)>EPS)m.yaw=Math.atan2(-dx,-dz);const from=bladeOrigin(e),x=p.x-from.x,y=finite(p.y)+finite(p.bodyHeight,1.75)*.65-from.y,z=p.z-from.z,length=Math.hypot(x,y,z);if(length>EPS){m.aimX=x/length;m.aimY=y/length;m.aimZ=z/length;}}
function describePose(m){
 let collapse=0,bladeLength=0;
 if(m.state==='disrupted')collapse=smooth(m.stateTime/.14);
 else if(m.state==='reform')collapse=1-smooth(m.stateTime/TUNING.reform);
 else if(m.state==='dead')collapse=1;
 if(m.state==='windup')bladeLength=TUNING.reach*smooth(m.stateTime/TUNING.windup);
 else if(m.state==='strike')bladeLength=TUNING.reach;
 else if(m.state==='recovery')bladeLength=TUNING.reach*(1-smooth(m.stateTime/TUNING.recovery));
 const c=Math.cos(m.yaw),s=Math.sin(m.yaw);
 return {state:m.state,stateTime:m.stateTime,remaining:m.remaining,yaw:m.yaw,bodyScaleY:1-.72*collapse,torsoSpread:.24*collapse,bladeLength,bladeOrigin:{x:.48,y:1.25,z:-.15},bladeDirection:{x:m.aimX*c-m.aimZ*s,y:m.aimY,z:m.aimX*s+m.aimZ*c},core:{x:0,y:1.25,z:0,r:.24,exposed:!!m.coreExposed}};
}
function pose(e){const m=initialize(e);return m?describePose(m):null;}
// Sample only shell/core deformation historically; yaw and locked blade metadata stay current.
// The most recent finite window is enough for the bounded projectile integration interval.
function poseAt(e,time){
 if(!isMetal(e)||!e.metal||!Number.isFinite(time))return null;
 const m=e.metal,p=describePose(m),exposed=exposedAt(e,time);let collapse=0;
 if(exposed){const age=time-m.exposureStart;collapse=age<TUNING.disrupted?smooth(age/.14):1-smooth((age-TUNING.disrupted)/TUNING.reform);}
 p.bodyScaleY=1-.72*collapse;p.torsoSpread=.24*collapse;p.core.exposed=exposed;return p;
}
function copyPoint(p,fallback){return p&&['x','y','z'].every(k=>Number.isFinite(p[k]))?{x:p.x,y:p.y,z:p.z}:{...fallback};}
function closeHoles(m,time){m.holes=m.holes.filter(h=>time-h.time<TUNING.holeLife-EPS);}
function impact(world,e,hit={}){
 const m=initialize(e),source=hit.source||'bullet',raw=Math.max(0,finite(hit.damage)),time=finite(hit.time,finite(world.time));
 const response={damage:0,cohesionDamage:0,material:'liquid-metal',transmit:source==='bullet',coreHit:false,killed:false};
 if(!m||e.alive===false||m.state==='dead'||raw<=0)return response;
 const exposed=typeof hit.coreExposedAtContact==='boolean'?hit.coreExposedAtContact:exposedAt(e,time);
 const coreHit=exposed&&(hit.part==='core'||source==='frag'||source==='barrel');
 e.hit=.16;e.alert=true;
 if(coreHit){
  response.coreHit=true;response.material='metal-core';response.transmit=false;response.damage=Math.min(m.coreHp,raw);m.coreHp=Math.max(0,m.coreHp-raw);e.hp=m.coreHp;
  if(m.coreHp<=EPS){m.coreHp=0;e.hp=0;m.attackId++;m.holes.length=0;enter(e,'dead',time);response.killed=true;if(typeof world.kill==='function')world.kill(e,120);else e.alive=false;}
  return response;
 }
 if(source==='bullet'){
  closeHoles(m,finite(world.time,time));const direction=copyPoint(hit.direction,{x:-Math.sin(m.yaw),y:0,z:-Math.cos(m.yaw)}),length=Math.hypot(direction.x,direction.y,direction.z)||1;
  m.holes.push({point:copyPoint(hit.point,{x:e.x,y:finite(e.y)+1.25,z:e.z}),direction:{x:direction.x/length,y:direction.y/length,z:direction.z/length},time});
  if(m.holes.length>TUNING.maxHoles)m.holes.splice(0,m.holes.length-TUNING.maxHoles);
 }
 if(m.state!=='disrupted'&&m.state!=='reform'&&!exposedAt(e,time)){
  response.cohesionDamage=Math.min(m.cohesion,raw);m.cohesion=Math.max(0,m.cohesion-raw);
  if(m.cohesion<=EPS){m.cohesion=0;m.attackId++;m.exposureStart=time;m.exposureEnd=time+TUNING.disrupted+TUNING.reform;enter(e,'disrupted',time);
   // Contacts resolve after movement; retain physical impact time instead of adding a frame.
   const age=Math.max(0,finite(world.time,time)-time);m.stateTime=Math.min(TUNING.disrupted,age);m.remaining=Math.max(0,TUNING.disrupted-age);
   emit(world,'metaldisrupt',{id:e.id,x:e.x,y:finite(e.y),z:e.z,time});
  }
 }
 return response;
}
function visible(world,e,p){if(Math.hypot(p.x-e.x,p.z-e.z)>TUNING.activation+EPS)return false;const sy=finite(e.y)+1.3,py=finite(p.y)+finite(p.bodyHeight,1.75)*.7;if(typeof world.wallHit==='function')return world.wallHit(e.x,sy,e.z,p.x,py,p.z,.02)===null;if(typeof world.segmentWall==='function')return !world.segmentWall(e.x,e.z,p.x,p.z,sy,py);return true;}
function segmentBox(a,b,min,max){let enter=0,exit=1;for(const key of ['x','y','z']){const d=b[key]-a[key];if(Math.abs(d)<EPS){if(a[key]<min[key]||a[key]>max[key])return null;continue;}let t0=(min[key]-a[key])/d,t1=(max[key]-a[key])/d;if(t0>t1)[t0,t1]=[t1,t0];enter=Math.max(enter,t0);exit=Math.min(exit,t1);if(enter>exit)return null;}return enter;}
function queueStrike(world,e,time,contacts){
 const m=e.metal,id=m.attackId,from=bladeOrigin(e),to={x:from.x+m.aimX*TUNING.reach,y:from.y+m.aimY*TUNING.reach,z:from.z+m.aimZ*TUNING.reach};let applied=false;
 contacts.push({time,apply:()=>{
  if(applied)return;applied=true;if(e.alive===false||m.attackId!==id||m.state==='dead'||m.state==='disrupted'||m.state==='reform'||world.paused||world.extracted||world.player.hp<=0)return;
  const p=world.player,r=.38+TUNING.width/2,half=TUNING.width/2,body=segmentBox(from,to,{x:p.x-r,y:finite(p.y)-half,z:p.z-r},{x:p.x+r,y:finite(p.y)+finite(p.bodyHeight,1.75)+half,z:p.z+r}),wall=typeof world.wallHit==='function'?world.wallHit(from.x,from.y,from.z,to.x,to.y,to.z,half):null,hit=body!==null&&(wall===null||body<wall-EPS);
  emit(world,'metalstrike',{id:e.id,x:from.x,y:from.y,z:from.z,time,hit,blocked:wall!==null,from:{...from},to:{...to}});
  if(hit&&typeof world.damage==='function')world.damage(TUNING.damage*finite(world.difficulty,1),{x:from.x,z:from.z});
 }});
}
function move(world,e,dt,p){const dx=p.x-e.x,dz=p.z-e.z,d=Math.hypot(dx,dz);if(d<=TUNING.reach+EPS)return;const distance=Math.min(TUNING.speed*dt,d-TUNING.reach),nx=e.x+dx/d*distance,nz=e.z+dz/d*distance;if(Math.hypot(nx-e.homeX,nz-e.homeZ)>TUNING.leash+EPS)return;const blocked=(x,z)=>typeof world.blocked==='function'&&world.blocked(x,z,.34,finite(e.y),1.95);if(!blocked(nx,e.z))e.x=nx;if(!blocked(e.x,nz))e.z=nz;}
function tick(world,e,dt,incomingContacts=[]){
 const m=initialize(e);if(!m||!Number.isFinite(dt)||dt<=0||world.paused)return;
 if(e.alive===false||m.coreHp<=0){if(m.state!=='dead'){m.attackId++;enter(e,'dead',finite(world.time));}m.holes.length=0;return;}
 if(!world.player||world.player.hp<=0||world.extracted){m.attackId++;enter(e,'idle',finite(world.time));m.holes.length=0;return;}
 e.hit=Math.max(0,finite(e.hit)-dt);
 const end=finite(world.time),p=world.player;let left=dt,time=end-dt;
 closeHoles(m,end);
 while(left>EPS){
  if(m.state==='idle'||m.state==='pursue'){
   if(!visible(world,e,p)){e.alert=false;if(m.state!=='idle')enter(e,'idle',time);m.stateTime+=left;return;}
   e.alert=true;aim(e,p);const distance=Math.hypot(p.x-e.x,p.z-e.z);
   if(distance<=TUNING.reach+EPS){m.attackId++;enter(e,'windup',time);aim(e,p);emit(world,'metalwarning',{id:e.id,x:e.x,z:e.z,time,duration:TUNING.windup});continue;}
   if(m.state!=='pursue')enter(e,'pursue',time);
   const step=Math.min(left,(distance-TUNING.reach)/TUNING.speed);move(world,e,step,p);m.stateTime+=step;left-=step;time+=step;
   if(step<=EPS)return;
   continue;
  }
  if(m.state==='windup'&&!m.aimLocked){
   if(!visible(world,e,p)){m.attackId++;enter(e,'idle',time);continue;}
   aim(e,p);if(m.stateTime>=TUNING.windup-TUNING.aimLock-EPS)m.aimLocked=true;
  }
  const untilLock=m.state==='windup'&&!m.aimLocked?TUNING.windup-TUNING.aimLock-m.stateTime:Infinity;
  const step=Math.min(left,m.remaining,untilLock);m.stateTime+=step;m.remaining=Math.max(0,m.remaining-step);left-=step;time+=step;
  if(m.state==='windup'&&!m.aimLocked&&m.stateTime>=TUNING.windup-TUNING.aimLock-EPS)m.aimLocked=true;
  if(m.remaining>EPS)continue;
  if(m.state==='windup'){enter(e,'strike',time);queueStrike(world,e,time,incomingContacts);}
  else if(m.state==='strike')enter(e,'recovery',time);
  else if(m.state==='recovery')enter(e,'idle',time);
  else if(m.state==='disrupted'){enter(e,'reform',time);emit(world,'metalreform',{id:e.id,x:e.x,y:finite(e.y),z:e.z,time});}
  else if(m.state==='reform'){m.cohesion=TUNING.cohesion;enter(e,'idle',time);}
  else return;
 }
}
const api={TUNING,isMetal,initialize,exposedAt,pose,poseAt,impact,tick};root.DFLiquidMetal=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
