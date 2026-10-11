import {inMap,lineOfSight,traceSegment} from './world-geometry.js';

// R11B authored B-only footwork. This module does not inspect player input,
// action, aim or future damage. It owns no attack, reward, health or save field.
const REGION='beacon_battlefield',EPS=1e-9;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const policy=(b,f)=>b.region===REGION?f.battlefieldRoleMovement:null;

export function interruptBattlefieldRoleMovement(e){
 if(!e.roleMovement?.step)return;
 e.roleMovement.step=null;
 if(e.state==='roleStep'){e.state='idle';e.moving=false;}
}
export function recordBattlefieldRoleAttack(b,e,f){
 if(policy(b,f))e.roleAttacksReleased=(e.roleAttacksReleased??0)+1;
}
export function deferBattlefieldRoleMovement(b,e,f){
 const rules=policy(b,f);if(!rules)return;
 interruptBattlefieldRoleMovement(e);
 const response=e.roleMovement??(e.roleMovement={home:{x:e.x,y:e.y},nextAt:0,lastReleased:-1,step:null});
 response.nextAt=b.time+rules.interval;response.lastReleased=e.roleAttacksReleased??0;
}

function destination(b,e,rules,home){
 const dx=e.x-b.p.x,dy=e.y-b.p.y,d=Math.hypot(dx,dy);
 if(d<EPS)return null;
 // Two lateral rays, never a predicted dodge or an unlimited retreat. A
 // stable ID tie break keeps the same scene deterministic without RNG draws.
 const first=[...e.id].reduce((n,c)=>n+c.charCodeAt(0),0)%2?1:-1;
 let best=null;
 for(const side of [first,-first])for(const length of [rules.distance,rules.distance/2]){
  const target={x:e.x-dy/d*side*length,y:e.y+dx/d*side*length};
  if(distance(home,target)>rules.tether+EPS||!inMap(b.map,target.x,target.y,11)||traceSegment(b.map,e,target,11).blocked||!lineOfSight(b.map,target,b.p))continue;
  // Maintain a real firing/re-engagement lane. Never seek hidden cover or
  // pass through another actor just to preserve a preferred side.
  let clearance=96,occupied=false;
  for(const other of b.enemies)if(other!==e&&other.hp>0&&lineOfSight(b.map,e,other)){
   const start=distance(e,other),finish=distance(target,other);
   if(finish<26||start>=26&&segmentNear(other,e,target)<26){occupied=true;break;}
   clearance=Math.min(clearance,finish);
  }
  if(occupied)continue;
  const score=clearance+length*.25;
  if(!best||score>best.score+EPS)best={...target,score};
 }
 return best&&{x:best.x,y:best.y};
}
function segmentNear(p,a,z){
 const dx=z.x-a.x,dy=z.y-a.y,q=dx*dx+dy*dy;
 const t=q?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/q)):0;
 return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);
}

export function stepBattlefieldRoleMovement(b,e,f,dt,{visible,suppressed,move}){
 const rules=policy(b,f);
 if(!rules||!(dt>0))return false;
 if(e.hp<=0||b.p.hp<=0||!e.active||e.stun>0||suppressed||e.state==='windup'||e.timer>EPS){interruptBattlefieldRoleMovement(e);return false;}
 let response=e.roleMovement;
 if(response?.step&&e.state!=='roleStep')interruptBattlefieldRoleMovement(e);
 if(!response?.step){
  const released=e.roleAttacksReleased??0;
  if(!visible||distance(e,b.p)>rules.triggerRange||rules.afterFirstAttack&&!released||response&&(b.time<response.nextAt-EPS||released<=response.lastReleased))return false;
  if(!response)e.roleMovement=response={home:{x:e.x,y:e.y},nextAt:0,lastReleased:-1,step:null};
  // A blocked attempt consumes its opportunity too. No frame-by-frame
  // path probing, idle orbit or repeated evasion while attacks are denied.
  response.nextAt=b.time+rules.interval;response.lastReleased=released;
  const target=destination(b,e,rules,response.home);
  if(!target)return false;
  response.step={target,elapsed:0,distance:0};e.state='roleStep';
  b.events.push({type:'enemyRepositionStarted',id:e.id,target:{...target}});
 }
 const step=response.step,dx=step.target.x-e.x,dy=step.target.y-e.y,d=Math.hypot(dx,dy);
 const elapsed=Math.min(dt,Math.max(0,rules.seconds-step.elapsed));
 const requested=Math.min(d,Math.max(0,rules.distance-step.distance),f.speed*(e.shackles?.moveMultiplier??1)*elapsed);
 // Recheck the actual remaining route if geometry or other actors changed.
 const blocked=traceSegment(b.map,e,step.target,11).blocked||b.enemies.some(other=>other!==e&&other.hp>0&&distance(e,other)>=26&&segmentNear(other,e,step.target)<26);
 if(blocked){interruptBattlefieldRoleMovement(e);return true;}
 e.angle=Math.atan2(dy,dx);
 const delta=move(b,e,d?dx/d*requested:0,d?dy/d*requested:0),moved=Math.hypot(delta.x,delta.y);
 step.elapsed+=elapsed;step.distance+=moved;e.moving=moved>.01;e.walk=(e.walk??0)+moved/16;
 if(step.elapsed>=rules.seconds-EPS||step.distance>=rules.distance-EPS||distance(e,step.target)<.01||requested>EPS&&moved<Math.min(.01,requested*.5)){
  b.events.push({type:'enemyRepositionEnded',id:e.id,distance:step.distance,seconds:step.elapsed});interruptBattlefieldRoleMovement(e);
 }
 // No movement and new attack in the same frame. Next frame resumes the
 // unmodified locked-attack/pursuit path, even after a short/blocked step.
 return true;
}
