'use strict';
// Independent regression: a later array entry can reach a shared collider first.
const assert=require('node:assert/strict');
const P=require('./player-projectiles.js'),S=require('./shot-resolver.js');
function run(kind,reverse=false){
 const engine=new P.Projectiles(),resolver=new S.ShotResolver();
 const w={time:0,player:{x:0,z:0},enemies:[{id:0,x:0,y:0,z:-5.7,alive:true,hp:1000,armor:0}],pickups:[],walls:[],hits:0,destroyed:0,events:[],shotResolver:resolver,
  wallCandidates(){return this.walls;},emit(type,data){this.events.push({type,...data});},kill(e){e.alive=false;},explode(e){e.alive=false;}};
 if(kind==='wall')w.walls.push({id:0,x:0,y:0,z:-5,w:20,h:5,d:.001,alive:true,hp:5});
 if(kind==='enemy')w.enemies.push({id:1,x:0,y:0,z:-5,alive:true,hp:5,armor:0});
 if(kind==='barrel')w.pickups.push({id:0,type:'barrel',x:0,y:0,z:-5,alive:true,hp:5});
 const slow={x:.04,y:0,z:-1},fast={x:0,y:0,z:-1};
 const directions=[...(reverse?[fast,slow]:[slow,fast]),...Array.from({length:7},()=>({x:1,y:0,z:0}))];
 const record=resolver.begin({weapon:1,config:S.configuration(1)});
 assert(engine.launch(w,record,{x:0,y:1.12,z:0},directions));
 for(let i=0;i<3;i++){const before=P.snapshots(w);w.time+=P.STEP;engine.advance(w,P.STEP,before);}
 const earlierId=reverse?0:1,laterId=reverse?1:0;
 assert.equal(engine.log[0].pelletId,earlierId,kind+': earliest geometric contact must resolve first, regardless of array order');
 assert.equal(engine.log[0].kind,kind);
 assert.equal(engine.log[1].pelletId,laterId);
 assert.equal(engine.log[1].kind,'enemy');
 assert.equal(engine.log[1].id,0,kind+': later pellet must retrace past destroyed collider to rear enemy');
 assert(engine.log[0].impactTime<engine.log[1].impactTime);
 return {rearHp:w.enemies[0].hp,times:engine.log.map(l=>l.impactTime)};
}
let checks=0;
for(const kind of ['wall','enemy','barrel']){
 const a=run(kind),b=run(kind,true);
 assert.equal(a.rearHp,b.rearHp,kind+': array order must not change total damage');
 assert.deepEqual(a.times,b.times,kind+': array order must not change contact times');
 checks++;console.log('PASS chronological '+kind+' removal and reverse pellet order');
}
{
 const {Mission}=require('./core.js'),w=new Mission(1,1,731,{world:false});
 w.enemies.forEach(e=>e.alive=false);w.walls.forEach(e=>e.alive=false);
 Object.assign(w.player,{x:0,z:0,hp:1,armor:0});
 w.pickups=[{id:0,type:'barrel',x:0,y:0,z:-2,alive:true,hp:1}];
 const rear=w.enemies[0];Object.assign(rear,{alive:true,x:0,y:0,z:-10,hp:500,armor:0,activationRange:.1,leash:.1});
 w.switchWeapon(1);w.cooldown=0;const ammo=w.ammo[1];
 assert(w.fire(null,{ballistic:{origin:{x:0,y:1.12,z:0},directions:Array.from({length:9},()=>({x:0,y:0,z:-1}))}}));
 w.tick(P.STEP);
 assert.equal(w.player.hp,0);assert.equal(w.playerBullets.active.length,0);
 assert.equal(w.playerBullets.log.length,1,'fatal first barrel contact must cancel all remaining contacts');
 assert.equal(rear.hp,500);assert.equal(w.ammo[1],ammo-1);
 checks++;console.log('PASS fatal barrel contact cancels remaining in-flight pellets');
}
function incomingFixture({distance=1,health=1,incoming=[{x:.5,z:0}],reverse=false}={}){
 const {Mission}=require('./core.js'),w=new Mission(1,1,731,{world:false});
 w.walls=[];w.pickups=[];w.enemies.forEach(e=>e.alive=false);
 Object.assign(w.player,{x:0,z:0,hp:health,armor:0});
 const target=w.enemies[0];Object.assign(target,{alive:true,x:0,y:0,z:-distance,hp:500,armor:0,activationRange:.1,leash:.1});
 w.projectiles=incoming.map(({x,z})=>({x,y:1,z,vx:-12,vy:0,vz:0,life:1,alive:true}));if(reverse)w.projectiles.reverse();
 const ammo=w.ammo[0];assert(w.fire(null,{ballistic:{origin:{x:0,y:1.12,z:0},directions:[{x:0,y:0,z:-1}]}}));
 return {w,target,ammo};
}
for(const hz of [30,60,120,1000]){
 const {w,target,ammo}=incomingFixture();for(let i=0;i<Math.ceil(hz*.02);i++)w.tick(1/hz);
 assert.equal(w.player.hp,0);assert.equal(target.hp,452,'earlier player contact must survive later incoming death at '+hz+' Hz');
 assert.equal(w.playerBullets.log.length,1);assert(Math.abs(w.playerBullets.log[0].impactTime-.825/350)<1e-9);
 assert.equal(w.playerBullets.active.length,0);assert.equal(w.ammo[0],ammo-1);assert.equal(w.hits,1);
 assert(w.events.findIndex(e=>e.type==='bulletcontact')<w.events.findIndex(e=>e.type==='hurt'));
}
checks++;console.log('PASS player hit before fatal incoming contact at30/60/120/1000Hz');
for(const hz of [30,60,120,1000]){
 const {w,target,ammo}=incomingFixture({distance:3});for(let i=0;i<Math.ceil(hz*.02);i++)w.tick(1/hz);
 assert.equal(w.player.hp,0);assert.equal(target.hp,500,'later player contact must be cancelled after incoming death at '+hz+' Hz');
 assert.equal(w.playerBullets.log.length,0);assert.equal(w.playerBullets.active.length,0);assert.equal(w.ammo[0],ammo-1);
}
checks++;console.log('PASS fatal incoming contact cancels only later player flight at30/60/120/1000Hz');
for(const reverse of [false,true]){
 // The early incoming hit is nonfatal. A player hit between the two incoming hits must count.
 const {w,target}=incomingFixture({distance:2.1,health:30,incoming:[{x:.536,z:.1},{x:.476,z:-.1}],reverse});
 w.tick(P.STEP);
 assert.equal(w.player.hp,0);assert.equal(target.hp,452);assert.equal(w.playerBullets.log.length,1);
 assert.deepEqual(w.events.filter(e=>e.type==='hurt').map(e=>e.sourceZ),[-.1,.1]);
 const contactIndex=w.events.findIndex(e=>e.type==='bulletcontact'),hurtIndices=w.events.map((e,i)=>e.type==='hurt'?i:-1).filter(i=>i>=0);
 assert(hurtIndices[0]<contactIndex&&contactIndex<hurtIndices[1]);
}
checks++;console.log('PASS incoming contacts and intervening player hit ignore incoming array order');
{
 // An incoming contact can divide a120Hz interval before a moving target reaches the shot.
 const engine=new P.Projectiles(),resolver=new S.ShotResolver(),w={time:0,player:{x:0,z:0,hp:100},enemies:[{id:0,x:-.6,y:0,z:-2,alive:true,hp:500,armor:0}],pickups:[],walls:[],hits:0,destroyed:0,shotResolver:resolver,wallCandidates(){return [];},emit(){},kill(e){e.alive=false;}};
 const record=resolver.begin({weapon:0,config:S.configuration(0)});assert(engine.launch(w,record,{x:0,y:1.12,z:0},[{x:0,y:0,z:-1}]));
 const before=P.snapshots(w);w.time=P.STEP;w.enemies[0].x=0;let incoming=0;
 engine.advance(w,P.STEP,before,[{time:.003,apply:()=>incoming++}]);
 assert.equal(incoming,1);assert.equal(engine.log.length,1);assert.equal(w.enemies[0].hp,452);assert.equal(record.claimed.size,1);
 assert(engine.log[0].impactTime>.003&&engine.log[0].impactTime<P.STEP);
 const hp=w.enemies[0].hp;engine.step(w,P.STEP,P.snapshots(w));assert.equal(w.enemies[0].hp,hp);
}
checks++;console.log('PASS timed incoming boundary preserves relative moving-target collision and single claim');
console.log(checks+' independent ballistic contact-order checks passed');
