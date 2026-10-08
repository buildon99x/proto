// Existing expedition attacks only. This is not the deferred encounter roster.
// Every coordinate/radius is in world space; widths describe player-center danger.
const LT_TAU = Math.PI * 2;
const ltClamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const ltPoint = p => ({x:p.x,y:p.y});
const ltCircle = (x,y,r,source,purpose='damage') => ({type:'circle',x,y,r,source,purpose});
const ltDistance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);

/** Cheap idle eligibility lookup; does not construct shapes or query walls. */
export function legacyTriggerRange(enemy,floor=0) {
  if(!enemy||enemy.type==='dummy') return 0;
  if(enemy.type==='boss') return Math.floor(floor/2)===0&&((enemy.attackCount||0)%3+3)%3===0?110:290;
  if(enemy.type==='archer'||enemy.type==='mage') return 250;
  if(enemy.type==='imp') return 180;
  return enemy.r+30;
}

/** First obstruction using the legacy solid(x,y,r) tile-corner predicate.
 * Tile-boundary probes catch even a very short diagonal corner intersection.
 * Regular probes additionally support non-tile test/fallback predicates.
 * The endpoint remains on the clear side of a wall, to 1e-7 world units.
 */
export function legacyRayDistance(origin,angle,length,solid,radius=2,tileSize=32) {
  if (!(length>0)) return 0;
  if (!solid) return length;
  const ux=Math.cos(angle),uy=Math.sin(angle),at=d=>solid(origin.x+ux*d,origin.y+uy*d,radius);
  if (at(0)) return 0;
  const cuts=[0,length];
  for(let d=1;d<length;d++) cuts.push(d);
  for(const [start,velocity] of [[origin.x,ux],[origin.y,uy]]) {
    if(Math.abs(velocity)<1e-12) continue;
    for(const offset of [-radius,radius]) {
      const a=start+offset,b=a+velocity*length;
      for(let tile=Math.floor(Math.min(a,b)/tileSize);tile<=Math.ceil(Math.max(a,b)/tileSize);tile++) {
        const distance=(tile*tileSize-a)/velocity;
        if(distance>0&&distance<length) cuts.push(distance);
      }
    }
  }
  cuts.sort((a,b)=>a-b);
  let clear=0;
  for(let i=1;i<cuts.length;i++) {
    const end=cuts[i],middle=(cuts[i-1]+end)/2;
    for(const probe of [middle,end]) {
      if(at(probe)) {
        let lo=clear,hi=probe;
        while(hi-lo>1e-7) {const mid=(lo+hi)/2;if(at(mid))hi=mid;else lo=mid;}
        return lo;
      }
      clear=probe;
    }
  }
  return length;
}

function ltLane(origin,angle,distance,radius,source) {
  return {type:'line',x:origin.x,y:origin.y,x2:origin.x+Math.cos(angle)*distance,y2:origin.y+Math.sin(angle)*distance,width:radius*2,source,purpose:'damage'};
}

/** Geometry membership. Informational summon markers can never cause damage.
 * Circles retain legacy strict <; projectile capsules retain swept <= contact.
 */
export function legacyShapeContains(shape,point) {
  if(!shape||!point||shape.purpose==='information') return false;
  if(Array.isArray(shape)) return shape.some(item=>legacyShapeContains(item,point));
  const dx=point.x-shape.x,dy=point.y-shape.y,d=Math.hypot(dx,dy);
  if(shape.type==='circle') return d<shape.r;
  if(shape.type==='ring') return d>=shape.inner&&d<shape.r;
  if(shape.type==='cone') return d<shape.r&&(d===0||Math.abs(Math.atan2(Math.sin(Math.atan2(dy,dx)-shape.angle),Math.cos(Math.atan2(dy,dx)-shape.angle)))<shape.halfAngle);
  if(shape.type==='line') {
    const vx=shape.x2-shape.x,vy=shape.y2-shape.y,length2=vx*vx+vy*vy,t=length2?ltClamp((dx*vx+dy*vy)/length2,0,1):0;
    const distance=Math.hypot(dx-vx*t,dy-vy*t);
    return shape.source==='charge'?distance<shape.width/2:distance<=shape.width/2;
  }
  return false;
}

/** Snapshot the next CURRENT legacy attack. No actor/player mutation.
 * Inject random for deterministic construction; no random value is used later.
 * resolveSpawn(type,x,y) must mirror spawnEnemy's wall relocation, if supplied.
 */
export function planLegacyAttack(enemy,player,{floor=0,time=0,random=Math.random,solid,resolveSpawn}={}) {
  if(!enemy||!player||enemy.type==='dummy'||!['rat','bandit','skeleton','knight','archer','mage','imp','boss'].includes(enemy.type)) return null;
  const boss=enemy.type==='boss',guardian=boss?ltClamp(Math.floor(floor/2),0,2):null;
  const pattern=boss?((enemy.attackCount||0)%3+3)%3:0,phase=enemy.phase===2?2:1;
  const origin=ltPoint(enemy),target=ltPoint(player),aim=Math.atan2(target.y-origin.y,target.x-origin.x);
  const ranged=enemy.type==='archer'||enemy.type==='mage';
  const plan={schema:1,id:boss?`legacy-guardian-${guardian}-${pattern}`:`legacy-${enemy.type}`,name:'근접 공격',role:boss?'boss':ranged?'ranged':'melee',color:boss?'#efb16e':'#e8ad7c',enemyType:enemy.type,guardian,pattern,phase,origin,target,aim,
    windup:boss?(phase===2?.85:1.15):ranged?.75:enemy.type==='imp'?.6:.42,
    recovery:boss?(phase===2?.9:1.3):enemy.type==='rat'?.55:.8,
    triggerRange:legacyTriggerRange(enemy,floor),
    shapes:[],release:{countAdvance:boss?1:0,contact:null,projectiles:[],zones:[],summons:[],charge:null},elapsed:0,released:false,cancelled:false};
  const addContact=(radius,multiplier=1)=>{const shape=ltCircle(origin.x,origin.y,radius,'contact');plan.shapes.push(shape);plan.release.contact={shape,damage:enemy.damage*multiplier};};
  const addProjectile=(angle,speed,multiplier,kind,life)=>{
    const r=kind==='fire'?7:kind==='soul'?6:4,maxDistance=legacyRayDistance(origin,angle,speed*life,solid,2);
    const shape=ltLane(origin,angle,maxDistance,r+10,'projectile');
    plan.shapes.push(shape);plan.release.projectiles.push({...origin,angle,speed,damage:enemy.damage*multiplier,kind,life,r,maxDistance,wallRadius:2,shape});
  };
  const addZone=(x,y,r,color,life,delay,multiplier=1)=>{
    const shape={...ltCircle(x,y,r,'zone'),delay,life};plan.shapes.push(shape);
    plan.release.zones.push({type:'hostileZone',x,y,r,color,life,max:life,delay,damage:enemy.damage*multiplier,shape});
  };
  const addSummon=(type,x,y)=>{
    const resolved=resolveSpawn?resolveSpawn(type,x,y):{x,y};
    const spawn={type,x:resolved.x,y:resolved.y};plan.release.summons.push(spawn);
    // Marker radius is informational, never an attack/hit radius.
    plan.shapes.push(ltCircle(spawn.x,spawn.y,14,'summon','information'));
  };
  const addCharge=(duration,radius,bodyRadius,multiplier)=>{
    const speed=310,maxDistance=legacyRayDistance(origin,aim,speed*duration,solid,bodyRadius),shape=ltLane(origin,aim,maxDistance,radius,'charge');
    plan.shapes.push(shape);plan.recovery=1;
    plan.release.charge={...origin,aim,speed,duration,radius,bodyRadius,damage:enemy.damage*multiplier,maxDistance,shape,recovery:1};
  };
  if(!boss) {
    if(enemy.type==='archer') {plan.name='화살';addProjectile(aim,230,1,'arrow',2.5);}
    else if(enemy.type==='mage') {plan.name='세 갈래 마력탄';for(let k=-1;k<=1;k++)addProjectile(aim+k*.22,160,1,'orb',3);}
    else if(enemy.type==='imp') {plan.name='돌진';addCharge(.35,25,8,1);}
    else addContact(enemy.r+43);
  } else if(guardian===0) {
    if(pattern===0) {plan.name='내려찍기';addContact(125);}
    else if(pattern===1) {plan.name='가시 방출';const n=phase===2?16:10,base=Number.isFinite(enemy.angle)?enemy.angle:aim;for(let i=0;i<n;i++)addProjectile(i*LT_TAU/n+base,135,.7,'thorn',3);}
    else {plan.name='쥐 소환';for(let k=0;k<4;k++)addSummon('rat',origin.x+Math.cos(k*LT_TAU/4)*50,origin.y+Math.sin(k*LT_TAU/4)*50);}
  } else if(guardian===1) {
    if(pattern===0) {plan.name='지연 마법진';for(let i=0;i<3;i++)addZone(target.x+(random()*2-1)*70,target.y+(random()*2-1)*70,55,'#ab91d0',1.8,.7);}
    else if(pattern===1) {plan.name='다섯 갈래 마력탄';for(let k=-2;k<=2;k++)addProjectile(aim+k*.24,190,.8,'orb',3);}
    else {plan.name='회전 마력탄';const angle=time+plan.windup;for(let k=0;k<8;k++)addProjectile(k*LT_TAU/8+angle,110,.6,'orb',4);}
  } else {
    if(pattern===0) {plan.name='왕의 돌진';addCharge(.6,55,15,1.3);}
    else if(pattern===1) {plan.name='불꽃 방출';for(let k=0;k<12;k++)addProjectile(k*LT_TAU/12,160,.8,'fire',3);addZone(origin.x,origin.y,95,'#d97852',4,0,.6);}
    else {plan.name='지연 화염진';for(let i=0;i<5;i++)addZone(target.x+(random()*2-1)*140,target.y+(random()*2-1)*140,50,'#d98c5c',2,.9);}
  }
  return plan;
}

export function legacyTelegraph(plan,progress=0,phase='windup') {
  if(!plan||plan.cancelled) return null;
  return {legacy:true,id:plan.id,name:plan.name,color:plan.color,locked:true,progress:ltClamp(progress,0,1),phase,shapes:plan.shapes};
}

/** Pure one-shot commitment. Elapsed simulation time, never wall-clock time.
 * A long frame can commit once, but cannot resample/retarget/recommit an attack.
 * Cancel before stepping when interrupted, unreadable, dead, or reloading.
 */
export function advanceLegacyAttack(plan,dt,{paused=false,cancel=false}={}) {
  if(!plan) return {plan:null,release:null};
  if(cancel||plan.cancelled) return {plan:{...plan,cancelled:true},release:null};
  if(paused||plan.released) return {plan,release:null};
  const elapsed=plan.elapsed+Math.max(0,Number.isFinite(dt)?dt:0),released=elapsed+1e-12>=plan.windup;
  return {plan:{...plan,elapsed,released},release:released?plan.release:null};
}

export function cancelLegacyAttack(plan) {return plan?{...plan,cancelled:true}:null;}
export function legacyContactHit(plan,point) {return !!plan&&!plan.cancelled&&!!plan.release.contact&&legacyShapeContains(plan.release.contact.shape,point);}
export function legacyChargeHit(charge,position,point) {return !!charge&&ltDistance(position,point)<charge.radius;}
export function legacyZoneHit(zone,point,age) {return !!zone&&age>zone.delay&&age<zone.max&&legacyShapeContains(zone.shape||ltCircle(zone.x,zone.y,zone.r,'zone'),point);}

/** A planned charge follows its warned straight path and stops at its first wall.
 * Runtime must not apply axis-slide motion or a full dt beyond duration.
 */
export function legacyChargeStep(charge,age,dt) {
  const before=ltClamp(age,0,charge.duration),after=ltClamp(before+Math.max(0,dt),0,charge.duration);
  const at=t=>({x:charge.x+Math.cos(charge.aim)*Math.min(charge.maxDistance,charge.speed*t),y:charge.y+Math.sin(charge.aim)*Math.min(charge.maxDistance,charge.speed*t)});
  const from=at(before),to=at(after);
  return {from,to,dx:to.x-from.x,dy:to.y-from.y,age:after,done:after>=charge.duration};
}

/** Swept projectile center positions, bounded by BOTH legacy lifetime and wall.
 * Feed the returned segment to legacyProjectileHit before dropping a done shot.
 */
export function legacyProjectileStep(projectile,age,dt) {
  const before=ltClamp(age,0,projectile.life),after=ltClamp(before+Math.max(0,dt),0,projectile.life);
  const at=t=>({x:projectile.x+Math.cos(projectile.angle)*Math.min(projectile.maxDistance,projectile.speed*t),y:projectile.y+Math.sin(projectile.angle)*Math.min(projectile.maxDistance,projectile.speed*t)});
  return {from:at(before),to:at(after),age:after,done:after>=projectile.life||projectile.speed*after>=projectile.maxDistance};
}
export function legacyProjectileHit(projectile,from,to,point) {return legacyShapeContains({...ltLane(from,Math.atan2(to.y-from.y,to.x-from.x),ltDistance(from,to),projectile.r+10,'projectile'),x2:to.x,y2:to.y},point);}
