// Exact legacy damage/warning contracts; not browser-play or new-roster evidence.
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {ISO,projectWorld,screenToWorld,telegraphOutline} from '../src/visual.js';
import {planLegacyAttack,legacyTriggerRange,legacyRayDistance,legacyShapeContains,legacyTelegraph,advanceLegacyAttack,cancelLegacyAttack,legacyContactHit,legacyChargeHit,legacyZoneHit,legacyChargeStep,legacyProjectileStep,legacyProjectileHit} from '../src/legacy-telegraphs.js';

const near=(a,b,epsilon=1e-8)=>assert(Math.abs(a-b)<epsilon,`${a} != ${b}`);
const enemy=(type='boss',extra={})=>({type,x:200,y:300,r:type==='boss'?29:13,damage:40,attackCount:0,phase:1,...extra});
const player={x:400,y:300};
const boss=(guardian,pattern,options={})=>planLegacyAttack(enemy('boss',{attackCount:pattern,...options.enemy}),player,{floor:guardian*2,time:10,random:()=>.5,...options});
const assertProjectile=(shot,{angle,speed,damage,kind,life,r=4})=>{
  near(shot.angle,angle);assert.equal(shot.speed,speed);assert.equal(shot.damage,damage);assert.equal(shot.kind,kind);assert.equal(shot.life,life);assert.equal(shot.r,r);
  near(shot.maxDistance,speed*life);near(shot.shape.width,2*(r+10));
  near(shot.shape.x2,shot.x+Math.cos(angle)*speed*life);near(shot.shape.y2,shot.y+Math.sin(angle)*speed*life);
};

test('cheap trigger range agrees with plans for every archetype, guardian pattern and phase',()=>{
  for(const [type,r,range] of [['rat',11,41],['bandit',13,43],['skeleton',13,43],['knight',16,46],['archer',12,250],['mage',13,250],['imp',11,180]]) {
    const actor=enemy(type,{r});assert.equal(legacyTriggerRange(actor),range);assert.equal(planLegacyAttack(actor,player).triggerRange,range);
  }
  for(let floor=0;floor<6;floor++)for(let count=0;count<9;count++)for(const phase of [1,2]) {
    const actor=enemy('boss',{attackCount:count,phase}),range=floor<2&&count%3===0?110:290;
    assert.equal(legacyTriggerRange(actor,floor),range);assert.equal(planLegacyAttack(actor,player,{floor,random:()=>.5}).triggerRange,range);
  }
  assert.equal(legacyTriggerRange(null),0);assert.equal(legacyTriggerRange(enemy('dummy')),0);
});

test('all existing melee radii preserve strict e.r+43, never sprite or player padding',()=>{
  for(const [type,r] of [['rat',11],['bandit',13],['skeleton',13],['knight',16]]) {
    const plan=planLegacyAttack(enemy(type,{r}),player),radius=r+43;
    assert.equal(plan.windup,.42);assert.equal(plan.recovery,type==='rat'?.55:.8);assert.equal(plan.triggerRange,r+30);
    assert.equal(plan.release.contact.damage,40);assert.equal(plan.shapes[0].r,radius);
    for(const angle of [0,.63,Math.PI,4.8]) {
      const at=d=>({x:200+Math.cos(angle)*d,y:300+Math.sin(angle)*d});
      assert(legacyContactHit(plan,at(radius-1e-6)));assert(!legacyContactHit(plan,at(radius+1e-6)));
    }
    assert(!legacyContactHit(plan,{x:200+radius,y:300}));
  }
});

test('first guardian slam warning and collision both use exactly 125 world units',()=>{
  const plan=boss(0,0);assert.equal(plan.windup,1.15);assert.equal(plan.recovery,1.3);assert.equal(plan.triggerRange,110);
  assert.equal(plan.release.contact.shape.r,125);assert(legacyContactHit(plan,{x:324.999,y:300}));assert(!legacyContactHit(plan,{x:325,y:300}));
  assert(legacyContactHit(plan,{x:200,y:424.999}));assert(!legacyContactHit(plan,{x:200,y:425}));
  assert.equal(plan.release.contact.damage,40);assert.equal(plan.release.countAdvance,1);
});

test('normal archer and mage preserve exact projectile angles, speeds, damage and lifetimes',()=>{
  const archer=planLegacyAttack(enemy('archer'),{x:200,y:500});
  assert.equal(archer.windup,.75);assert.equal(archer.recovery,.8);assert.equal(archer.triggerRange,250);
  assertProjectile(archer.release.projectiles[0],{angle:Math.PI/2,speed:230,damage:40,kind:'arrow',life:2.5});
  const mage=planLegacyAttack(enemy('mage'),player);
  for(let i=0;i<3;i++)assertProjectile(mage.release.projectiles[i],{angle:(i-1)*.22,speed:160,damage:40,kind:'orb',life:3});
  const lane=mage.shapes[0],mid={x:(lane.x+lane.x2)/2,y:(lane.y+lane.y2)/2},normal={x:-Math.sin(-.22),y:Math.cos(-.22)};
  assert(legacyShapeContains(lane,{x:mid.x+normal.x*13.999,y:mid.y+normal.y*13.999}));
  assert(!legacyShapeContains(lane,{x:mid.x+normal.x*14.001,y:mid.y+normal.y*14.001}));
});

test('thorn radial volley preserves phase counts and exact gaps, orientation and travel',()=>{
  for(const phase of [1,2]) {
    const plan=boss(0,1,{enemy:{phase}}),n=phase===2?16:10;
    assert.equal(plan.release.projectiles.length,n);assert.equal(plan.windup,phase===2?.85:1.15);assert.equal(plan.recovery,phase===2?.9:1.3);
    plan.release.projectiles.forEach((shot,i)=>assertProjectile(shot,{angle:i*Math.PI*2/n,speed:135,damage:28,kind:'thorn',life:3}));
    const midGap=Math.PI/n,point={x:200+Math.cos(midGap)*350,y:300+Math.sin(midGap)*350};
    assert(!legacyShapeContains(plan.shapes,point),'radial projectile gaps must not become a filled disk');
  }
  const angle=.73,actor=enemy('boss',{angle,attackCount:1}),locked=planLegacyAttack(actor,player);
  near(locked.release.projectiles[0].angle,angle);actor.angle=4;
  near(advanceLegacyAttack(locked,10).release.projectiles[0].angle,angle);
});

test('summon markers use resolved locked spawn positions and never imply contact damage',()=>{
  const calls=[],plan=boss(0,2,{resolveSpawn:(type,x,y)=>{calls.push([type,x,y]);return {x:x+7,y:y-4};}});
  assert.equal(plan.release.summons.length,4);assert.equal(plan.release.contact,null);assert.equal(plan.release.projectiles.length,0);
  for(let i=0;i<4;i++) {
    const spawn=plan.release.summons[i],shape=plan.shapes[i];
    near(calls[i][1],200+Math.cos(i*Math.PI/2)*50);near(calls[i][2],300+Math.sin(i*Math.PI/2)*50);
    assert.equal(spawn.type,'rat');assert.equal(shape.x,spawn.x);assert.equal(shape.y,spawn.y);assert.equal(shape.purpose,'information');
    assert(!legacyShapeContains(shape,spawn));assert(!legacyContactHit(plan,spawn));
  }
});

test('Bell zones snapshot six random draws at windup and retain exact active intervals',()=>{
  const rolls=[0,.25,.5,.75,1,.1];let draws=0;
  const plan=boss(1,0,{random:()=>rolls[draws++]});assert.equal(draws,6);
  assert.deepEqual(plan.release.zones.map(({x,y})=>[x,y]),[[330,265],[400,335],[470,244]]);
  for(const zone of plan.release.zones) {
    assert.equal(zone.r,55);assert.equal(zone.life,1.8);assert.equal(zone.max,1.8);assert.equal(zone.delay,.7);assert.equal(zone.damage,40);
    assert(!legacyZoneHit(zone,zone,.7));assert(legacyZoneHit(zone,zone,.700001));assert(legacyZoneHit(zone,zone,1.799999));assert(!legacyZoneHit(zone,zone,1.8));
    assert(!legacyZoneHit(zone,{x:zone.x+55,y:zone.y},1));
  }
  advanceLegacyAttack(plan,10);legacyTelegraph(plan,.8);assert.equal(draws,6,'release/render must not resample positions');
});

test('Bell fan/radial volleys preserve all five/eight paths and lock clock-based radial aim',()=>{
  const fan=boss(1,1);fan.release.projectiles.forEach((shot,i)=>assertProjectile(shot,{angle:(i-2)*.24,speed:190,damage:32,kind:'orb',life:3}));
  assert.equal(fan.release.projectiles.length,5);
  for(const phase of [1,2]) {
    const radial=boss(1,2,{enemy:{phase}});
    assert.equal(radial.release.projectiles.length,8);
    radial.release.projectiles.forEach((shot,i)=>assertProjectile(shot,{angle:i*Math.PI/4+10+radial.windup,speed:110,damage:24,kind:'orb',life:4}));
    const released=advanceLegacyAttack(radial,20).release;
    assert.deepEqual(released.projectiles,radial.release.projectiles,'a late frame must not rotate the locked warning');
  }
});

test('final guardian fire ring uses projectile lanes and distinct persistent center zone',()=>{
  const plan=boss(2,1);assert.equal(plan.release.projectiles.length,12);
  plan.release.projectiles.forEach((shot,i)=>assertProjectile(shot,{angle:i*Math.PI/6,speed:160,damage:32,kind:'fire',life:3,r:7}));
  const zone=plan.release.zones[0];assert.equal(zone.r,95);assert.equal(zone.life,4);assert.equal(zone.delay,0);assert.equal(zone.damage,24);
  assert(!legacyZoneHit(zone,zone,0));assert(legacyZoneHit(zone,zone,.01));assert(!legacyZoneHit(zone,zone,4));
  assert.equal(plan.shapes.at(-1),zone.shape);
});

test('final guardian delayed zones lock ten draws with existing offset/radius/timing',()=>{
  let draws=0;const plan=boss(2,2,{random:()=>draws++%2?1:0});assert.equal(draws,10);
  for(const zone of plan.release.zones) {
    assert.deepEqual([zone.x,zone.y,zone.r,zone.life,zone.max,zone.delay,zone.damage],[260,440,50,2,2,.9,40]);
    assert(!legacyZoneHit(zone,zone,.9));assert(legacyZoneHit(zone,zone,.90001));assert(!legacyZoneHit(zone,zone,3));
  }
});

test('imp/final guardian charges use exact speed, duration, collider and bounded travel',()=>{
  for(const [plan,duration,radius,bodyRadius,damage] of [[planLegacyAttack(enemy('imp'),player),.35,25,8,40],[boss(2,0),.6,55,15,52]]) {
    const charge=plan.release.charge;assert.equal(charge.speed,310);assert.equal(charge.duration,duration);assert.equal(charge.radius,radius);assert.equal(charge.bodyRadius,bodyRadius);assert.equal(charge.damage,damage);assert.equal(plan.recovery,1);
    near(charge.maxDistance,310*duration);assert.equal(charge.shape.width,2*radius);
    const stalled=legacyChargeStep(charge,0,50);near(stalled.to.x,200+310*duration);assert(stalled.done);
    let age=0,last;while(age<duration){last=legacyChargeStep(charge,age,1/60);age=last.age;}near(last.to.x,stalled.to.x);
    assert(legacyChargeHit(charge,stalled.to,{x:stalled.to.x,y:300+radius-1e-6}));assert(!legacyChargeHit(charge,stalled.to,{x:stalled.to.x,y:300+radius}));
    assert(legacyShapeContains(charge.shape,{x:stalled.to.x,y:300+radius-1e-6}));assert(!legacyShapeContains(charge.shape,{x:stalled.to.x,y:300+radius+1e-6}));
  }
});

test('projectile ray ends at first tile wall and cannot warn/release beyond it during stalls',()=>{
  const solid=(x,y,r)=>[-r,r].some(dx=>[-r,r].some(dy=>Math.floor((x+dx)/32)===10&&Math.floor((y+dy)/32)===9));
  const plan=planLegacyAttack(enemy('archer'),player,{solid}),shot=plan.release.projectiles[0];
  near(shot.maxDistance,118,1e-6);assert(!solid(shot.shape.x2,shot.shape.y2,2));
  assert(solid(shot.shape.x2+1e-5,shot.shape.y2,2));
  const step=legacyProjectileStep(shot,0,100);near(step.to.x,318,1e-6);assert(step.done);
  assert(legacyProjectileHit(shot,step.from,step.to,{x:280,y:313.999}));assert(!legacyProjectileHit(shot,step.from,step.to,{x:280,y:314.001}));
  assert(!legacyProjectileHit(shot,step.from,step.to,{x:400,y:300}));assert(!legacyShapeContains(shot.shape,{x:400,y:300}));
});

test('ray clipping detects tiny diagonal tile-corner intersections and a blocked origin',()=>{
  const origin={x:0,y:31.999999},angle=-Math.PI/4;
  const solid=(x,y,r)=>[-r,r].some(dx=>[-r,r].some(dy=>Math.floor((x+dx)/32)===1&&Math.floor((y+dy)/32)===0));
  const distance=legacyRayDistance(origin,angle,100,solid,2);
  assert(distance<43,'a very short blocked corner must not be skipped by coarse samples');
  assert.equal(legacyRayDistance({x:35,y:15},0,100,solid,2),0);
  assert.equal(legacyRayDistance({x:0,y:100},0,0,solid,2),0);
});

test('charges stop at their body collision wall without sliding outside the capsule',()=>{
  const solid=(x,y,r)=>x+r>=320;
  const charge=planLegacyAttack(enemy('imp'),{x:600,y:600},{solid}).release.charge;
  // This short imp charge ends before this wall; the longer guardian reaches it.
  const longer=boss(2,0,{solid}).release.charge;
  near(longer.maxDistance,105,1e-6);near(legacyChargeStep(longer,0,10).to.x,305,1e-6);
  const end=legacyChargeStep(charge,0,10).to;assert(legacyShapeContains(charge.shape,end));
});

test('all projectile lifetimes cap exact travel including a final partial frame',()=>{
  for(const plan of [planLegacyAttack(enemy('archer'),player),planLegacyAttack(enemy('mage'),player),boss(0,1),boss(1,1),boss(1,2),boss(2,1)]) {
    for(const shot of plan.release.projectiles) {
      const result=legacyProjectileStep(shot,shot.life-.001,50);
      near(result.to.x,shot.shape.x2);near(result.to.y,shot.shape.y2);assert(result.done);assert.equal(result.age,shot.life);
      const normal=legacyProjectileStep(shot,0,shot.life);assert.deepEqual(normal.to,result.to);
    }
  }
});

test('locked plans serialize losslessly and ignore later actor/player movement',()=>{
  for(let guardian=0;guardian<3;guardian++)for(let pattern=0;pattern<3;pattern++) {
    const actor=enemy('boss',{attackCount:pattern}),target={...player},plan=planLegacyAttack(actor,target,{floor:guardian*2,time:5,random:()=>.3}),snapshot=JSON.stringify(plan);
    actor.x=-1000;actor.aim=20;actor.damage=999;target.x=8000;target.y=7000;
    assert.equal(JSON.stringify(plan),snapshot);assert.deepEqual(JSON.parse(snapshot),plan);
    const original=advanceLegacyAttack(plan,plan.windup).release,restored=advanceLegacyAttack(JSON.parse(snapshot),plan.windup).release;
    assert.deepEqual(restored,original);
  }
});

test('commit occurs once, pause cannot progress, cancellation removes warning/release',()=>{
  const original=boss(2,0),paused=advanceLegacyAttack(original,30,{paused:true});assert.equal(paused.plan,original);assert.equal(paused.release,null);
  let state=advanceLegacyAttack(original,original.windup-.001);assert.equal(state.release,null);
  state=advanceLegacyAttack(state.plan,5);assert.equal(state.release.countAdvance,1);assert(state.plan.released);
  assert.equal(advanceLegacyAttack(state.plan,100).release,null,'no duplicate boss pattern advance after a stall');
  for(const cancel of [cancelLegacyAttack(original),advanceLegacyAttack(original,20,{cancel:true}).plan]) {
    assert.equal(legacyTelegraph(cancel),null);assert.equal(advanceLegacyAttack(cancel,100).release,null);assert(!legacyContactHit(cancel,player));
  }
  assert.equal(original.cancelled,false,'cancellation must not mutate a snapshot');
  assert.equal(legacyTelegraph(null),null);assert.equal(advanceLegacyAttack(null,1).release,null);
});

test('canceled boss windups preserve sequence; committed charge unlocks both later existing patterns',()=>{
  const actor=enemy(),patterns=[];
  for(let i=0;i<4;i++) {
    const plan=planLegacyAttack(actor,player,{floor:4,random:()=>.5});patterns.push(plan.pattern);
    assert.equal(advanceLegacyAttack(cancelLegacyAttack(plan),10).release,null);
    actor.attackCount+=advanceLegacyAttack(plan,10).release.countAdvance;
  }
  assert.deepEqual(patterns,[0,1,2,0]);
});

test('world outlines project and invert correctly across zoom, camera and short/portrait viewports',()=>{
  const plans=[boss(0,0),boss(0,1),boss(1,0),boss(1,1),boss(2,0),boss(2,1)];
  for(const plan of plans)for(const shape of plan.shapes)for(const point of telegraphOutline(shape,80)) {
    for(const [width,height,zoom,camera] of [[1280,800,ISO.zoom,{x:100,y:90}],[390,844,.7,{x:900,y:400}],[844,390,1.8,{x:-200,y:100}]]) {
      const projected=projectWorld(point.x-camera.x,point.y-camera.y),back=screenToWorld(width/2+projected.x*zoom,height*.55+projected.y*zoom,camera,width,height,zoom);
      near(back.x,point.x);near(back.y,point.y);
    }
  }
  const outline=telegraphOutline(boss(0,0).shapes[0],80),horizontal=outline.map(p=>projectWorld(p.x-200,p.y-300).x*ISO.zoom);
  near(Math.max(...horizontal),125*Math.SQRT2*ISO.zoom);
  assert(Math.max(...horizontal)>100*ISO.zoom,'regression: the old screen-space ellipse under-covered the slam');
});
