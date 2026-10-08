/* Pure mission lifecycle regressions. No browser or listening quality claim. */
'use strict';
const assert=require('node:assert/strict');
const {Mission}=require('./core.js');
const World=require('./world.js');
let checks=0;
function test(name,fn){fn();checks++;console.log('PASS',name);}
function advance(m,seconds){for(let t=0;t<seconds;t+=.01)m.tick(Math.min(.01,seconds-t));}
function nearby(m,type,data={}){return {type,x:m.player.x,z:m.player.z,y:m.player.y,alive:true,...data};}
function pickups(m){return m.events.filter(e=>e.type==='pickup');}
function fireAtBoss(m){const boss=m.enemies.find(e=>e.boss);assert(m.requestTrigger());assert(m.fire({kind:'enemy',id:boss.id,distance:10,part:'torso'}));return {hp:boss.hp,armor:boss.armor};}

for(const world of [true,false]){
 const label=world?'production region':'legacy fixture';
 const mission=weapon=>new Mission(1,1,731,{world,weapon});
 for(const [type,stat] of [['health','hp'],['armor','armor']]){
  test(`${label}: full ${type} supply stays available without a false pickup, then works once`,()=>{
   const m=mission();m.player[stat]=100;m.pickups=[nearby(m,type)];const item=m.pickups[0];
   assert.equal(m.interact(),false);assert.equal(m.player[stat],100);assert(item.alive);assert.deepEqual(m.events,[]);
   assert.equal(m.interact(),false);assert(item.alive);assert.deepEqual(m.events,[]);
   m.player[stat]=80;assert(m.interact());assert.equal(m.player[stat],100);assert.equal(item.alive,false);
   assert.deepEqual(pickups(m).map(e=>e.kind),[type]);
   m.player[stat]=80;assert.equal(m.interact(),false);assert.equal(m.player[stat],80);assert.equal(pickups(m).length,1);
  });
 }
 test(`${label}: supplies stop consuming as soon as the stat fills`,()=>{
  const m=mission();m.player.hp=99;m.player.armor=99;
  m.pickups=['health','health','armor','armor'].map(type=>nearby(m,type));
  assert(m.interact());assert.equal(m.player.hp,100);assert.equal(m.player.armor,100);
  assert.deepEqual(m.pickups.map(item=>item.alive),[false,true,false,true]);
  assert.deepEqual(pickups(m).map(e=>e.kind),['health','armor']);assert.equal(m.interact(),false);
 });
 test(`${label}: full supplies do not block ammo, cargo, bounty or extraction`,()=>{
  const m=mission();m.enemies=[];m.player.hp=100;m.player.armor=100;
  m.pickups=['health','armor','ammo','cargo','bounty'].map(type=>nearby(m,type,{value:type==='cargo'?225:0}));
  const reserves=m.reserve.slice();assert(m.interact());
  assert.deepEqual(m.pickups.map(item=>item.alive),[true,true,false,false,false]);
  assert.deepEqual(pickups(m).map(e=>e.kind),['ammo','cargo','bounty']);
  assert.deepEqual(m.reserve,reserves.map((n,i)=>n+[24,8,60,90][i]));assert.equal(m.rifle.reserve,m.reserve[3]);
  assert.equal(m.player.hp,100);assert.equal(m.player.armor,100);assert.equal(m.cargo,1);assert.equal(m.cash,225);assert(m.bounty);
  assert(m.extractionZone);assert.equal(m.interact(),false);assert.equal(pickups(m).length,3);
  advance(m,6.1);assert(m.extracted);assert.equal(m.events.filter(e=>e.type==='win').length,1);
  assert.equal(m.interact(),false);assert.equal(m.cargo,1);assert.equal(m.cash,225);
 });
 test(`${label}: starting pistol then equipping rifle has the same boss armor as starting rifle`,()=>{
  const pistol=mission(0),rifle=mission(3);
  for(const m of [pistol,rifle]){assert.equal(m.enemies.find(e=>e.boss).armor,60);assert(m.enemies.filter(e=>!e.boss).every(e=>e.armor===0));}
  assert.equal(pistol.weapon,0);assert(pistol.switchWeapon(3));
  const hp=pistol.enemies.find(e=>e.boss).hp;
  for(const m of [pistol,rifle])advance(m,.4);
  for(const expected of [{hp,armor:30},{hp,armor:0},{hp:hp-30,armor:0}]){
   for(const m of [pistol,rifle]){assert.deepEqual(fireAtBoss(m),expected);advance(m,.11);}
  }
  for(const m of [pistol,rifle]){
   assert.equal(m.events.filter(e=>e.type==='armorhit'&&e.stopped).length,2);
   assert.equal(m.events.filter(e=>e.type==='blood').length,1);
   assert(m.switchWeapon(0));assert(m.switchWeapon(3));assert.equal(m.enemies.find(e=>e.boss).armor,0);
   assert.equal(m.ammo[0],6);assert.equal(m.ammo[3],27);
  }
 });
 test(`${label}: enemy armor does not change legacy pistol damage`,()=>{
  const m=mission(0),boss=m.enemies.find(e=>e.boss),hp=boss.hp;
  assert(m.fire({kind:'enemy',id:boss.id}));assert.equal(boss.hp,hp-48);assert.equal(boss.armor,60);
 });
 test(`${label}: explicit enemy armor, including zero, survives mission initialization`,()=>{
  for(const armor of [0,17]){
   let m;
   if(world){
    const enemies=[World.definition.enemies[0],World.definition.enemies.find(e=>e.boss)];
    const previous=enemies.map(e=>Object.getOwnPropertyDescriptor(e,'armor'));
    try{for(const e of enemies)e.armor=armor;m=mission(3);}
    finally{enemies.forEach((e,i)=>{if(previous[i])Object.defineProperty(e,'armor',previous[i]);else delete e.armor;});}
   }else{
    class AuthoredMission extends Mission{build(){super.build();this.enemies[0].armor=armor;this.enemies.find(e=>e.boss).armor=armor;}}
    m=new AuthoredMission(1,1,731,{world:false,weapon:3});
   }
   assert.equal(m.enemies[0].armor,armor);const boss=m.enemies.find(e=>e.boss),hp=boss.hp;assert.equal(boss.armor,armor);
   advance(m,.4);assert.deepEqual(fireAtBoss(m),{hp:hp-(30-armor),armor:0});
  }
 });
}
console.log(`FINAL: ${checks} core lifecycle checks passed.`);
