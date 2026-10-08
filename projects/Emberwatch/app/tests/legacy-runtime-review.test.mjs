import test from 'node:test';import assert from 'node:assert/strict';
import {runtime} from './helpers/warrior-runtime.mjs';
import {planLegacyAttack,legacyShapeContains} from '../src/legacy-telegraphs.js';
import {telegraphOutline} from '../src/visual.js';
function scene(type='boss',floor=1){const h=runtime();h.beginRun();h.arena();h.isometric();const state=h.read();state.run.floor=floor;state.run.entryProtected=false;const e={type,x:612,y:512,hp:2000,max:2000,r:type==='boss'?29:13,active:true,state:'idle',timer:0,angle:0,aim:0,speed:43,damage:25,phase:1,attackCount:0,walk:0,flash:0,slow:0,burn:0,stagger:0};state.entities.push(e);return {h,e,p:state.p};}
function advance(h,e,seconds,dt=1/120){for(let t=0;t<seconds-1e-9;t+=dt)h.enemyUpdate(e,Math.min(dt,seconds-t));}
test('actual first guardian warning and contact agree at the formerly misleading slam boundary',()=>{
 for(const distance of [124.9,125,125.1]){const {h,e,p}=scene();advance(h,e,.21);assert.equal(e.state,'windup');const plan=e.legacyAttack;assert.equal(plan.release.contact.shape.r,125);assert.deepEqual(e.telegraph.shapes,plan.shapes);p.x=e.x+distance;p.y=e.y;const before=p.hp;advance(h,e,1.16);assert.equal(before-p.hp,distance<125?25:0);assert.equal(e.attackCount,1);assert.equal(e.telegraph,null);assert.equal(h.sounds.filter(s=>s.type==='enemyRelease').length,1);}
});
test('a normal stagger cancels its pending contact and warning without a ghost release',()=>{
 const {h,e,p}=scene('bandit');e.x=p.x+35;advance(h,e,.21);assert.equal(e.state,'windup');h.hit(e,1,10);assert.equal(e.legacyAttack,null);assert.equal(e.telegraph,null);const before=p.hp;advance(h,e,.5);assert.equal(p.hp,before);assert.equal(h.sounds.filter(s=>s.type==='enemyRelease').length,0);
});
test('sub-poise boss impacts cannot displace a locked attack; real stagger cancels it',()=>{
 const {h,e}=scene();advance(h,e,.21);const x=e.x,y=e.y,plan=e.legacyAttack;h.hit(e,1,10);assert.equal(e.x,x);assert.equal(e.y,y);assert.equal(e.legacyAttack,plan);for(let i=0;i<5;i++)h.hit(e,1,10);assert.equal(e.legacyAttack,null);assert.equal(e.telegraph,null);
});
test('last guardian proceeds from charge to radial fire and delayed zones exactly once per commitment',()=>{
 const {h,e,p}=scene('boss',5);p.invuln=999;const names=[];let previous=null;
 for(let i=0;i<1500&&e.attackCount<3;i++){h.enemyUpdate(e,1/120);const id=e.legacyAttack?.id;if(id&&id!==previous){names.push(id);previous=id;}if(!id)previous=null;}
 assert.deepEqual(names.slice(0,3),['legacy-guardian-2-0','legacy-guardian-2-1','legacy-guardian-2-2']);assert.equal(e.attackCount,3);assert.equal(h.read().shots.length,12);assert.equal(h.read().effects.filter(f=>f.type==='hostileZone').length,6);
});
test('delayed zones keep their announced locations when the target moves during windup',()=>{
 const {h,e,p}=scene('boss',3);p.invuln=999;advance(h,e,.21);const zones=structuredClone(e.legacyAttack.release.zones);p.x+=50;p.y+=20;advance(h,e,1.16);const actual=h.read().effects.filter(f=>f.type==='hostileZone');assert.deepEqual(JSON.parse(JSON.stringify(actual)),zones);for(const zone of actual){assert(legacyShapeContains(zone.shape,{x:zone.x+zone.r-.01,y:zone.y}));assert(!legacyShapeContains(zone.shape,{x:zone.x+zone.r+.01,y:zone.y}));}
});
test('bounded hostile paths test their last segment and cannot damage beyond the wall endpoint',()=>{
 for(const offset of [20,50]){const {h,p}=scene('archer');h.read().entities.length=0;const plan=planLegacyAttack({type:'archer',x:512,y:512,r:12,damage:10},{x:612,y:512},{solid:x=>x>=542});const shot=plan.release.projectiles[0];p.x=512+offset;p.y=512;const before=p.hp;h.projectile(shot.x,shot.y,shot.angle,shot.speed,shot.damage,shot.kind,true,{life:shot.life,r:shot.r,legacyPath:shot,legacyAge:0});h.update(.2);assert.equal(before-p.hp,offset===20?10:0);assert.equal(h.read().shots.length,0);}
});
test('death and saved resume discard all transient warning plans',()=>{
 const {h,e}=scene();advance(h,e,.21);h.persist();h.resumeRun();assert.equal(h.read().entities[0].legacyAttack,null);assert.equal(h.read().entities[0].telegraph,null);const enemy=h.read().entities[0];enemy.hp=1;h.hit(enemy,10000);assert.equal(enemy.legacyAttack,null);assert.equal(enemy.telegraph,null);
});

test('art-failure fallback draws the same locked warning geometry, including active charge and informational summons',()=>{
 for(const pattern of [0,1,2]){const {h,e}=scene();e.attackCount=pattern;advance(h,e,.21);const points=e.telegraph.shapes.flatMap(shape=>telegraphOutline(shape));h.drawLegacyWarnings();const drawn=h.canvasCommands.filter(c=>['moveTo','lineTo'].includes(c.name)).map(c=>c.args);assert.deepEqual(JSON.parse(JSON.stringify(drawn)),points.map(p=>[p.x,p.y]));if(pattern===2)assert(h.canvasCommands.some(c=>c.name==='setLineDash'&&c.args[0].length===2));}
 const {h,e}=scene('boss',5);advance(h,e,.21);advance(h,e,1.16);assert.equal(e.state,'charge');h.drawLegacyWarnings();assert(h.canvasCommands.some(c=>c.name==='lineTo'));
});
