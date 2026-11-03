import test from 'node:test';
import assert from 'node:assert/strict';
import {SoloPreview} from './preview.js';
import {ambientHome,ambientPhase} from '../../shared/ambient.mjs';
import {WORLD_OBSTACLES,WALK_HALF} from '../../shared/space.mjs';
import {BALL_PHYSICS} from '../../shared/ball.mjs';
const rooms=['sunroom','garden','moonlight'];
const nearestCat=p=>p.cats.reduce((near,c)=>Math.hypot(c.x-p.player.x,c.z-p.player.z)<Math.hypot(near.x-p.player.x,near.z-p.player.z)?c:near);

test('each solo room starts with one resting cat in reach on clear floor without moving the visitor',()=>{
 const arrivals=[];
 for(const room of rooms){
  const p=new SoloPreview(room),c=nearestCat(p),d=Math.hypot(c.x-p.player.x,c.z-p.player.z);
  assert.ok(d<=2.8,`${room}: the first cat is ${d.toFixed(2)} m away`);
  assert.ok(d>=1.1,`${room}: cat and visitor bodies need breathing room`);
  assert.equal(p.player.x,0);assert.equal(p.player.z,5);assert.equal(p.player.yaw,0);
  assert.equal(p.cats.length,18);assert.equal(p.cats.filter(cat=>Math.hypot(cat.x-p.player.x,cat.z-p.player.z)<=2.8).length,1);
  assert.ok(['sleep','rest'].includes(ambientPhase(c.id,0,room)));
  assert.equal(c.owner,null);assert.equal(c.mode,'idle');assert.equal(c.homeX,c.x);assert.equal(c.homeZ,c.z);
  assert.ok(Math.abs(c.x)<WALK_HALF-.63&&Math.abs(c.z)<WALK_HALF-.63);
  for(const obstacle of WORLD_OBSTACLES)assert.ok(Math.hypot(c.x-obstacle.x,c.z-obstacle.z)>=obstacle.r+.63);
  for(const other of p.cats.filter(cat=>cat!==c)){
   assert.ok(Math.hypot(c.x-other.x,c.z-other.z)>=1.36,'resting cats must not overlap');
   const home=ambientHome(Number(other.id.slice(4)));
   assert.equal(other.x,home.x);assert.equal(other.z,home.z);assert.equal(other.homeX,home.homeX);assert.equal(other.homeZ,home.homeZ);
  }
  arrivals.push(c.skin);
 }
 assert.equal(new Set(arrivals).size,3,'each room offers a different first cat');
});

test('the nearby solo cat rests in reach while a new visitor takes thirty seconds to look around',()=>{
 for(const room of rooms){
  const p=new SoloPreview(room),c=nearestCat(p),pose={x:c.x,z:c.z,yaw:c.yaw};
  for(let i=0;i<600;i++){
   p.tick();
   assert.ok(Math.hypot(c.x-p.player.x,c.z-p.player.z)<=2.8,`${room}: the first cat left reach`);
   assert.deepEqual({x:c.x,z:c.z,yaw:c.yaw},pose);
   assert.ok(['sleep','rest'].includes(ambientPhase(c.id,p.time*1000,room)));
  }
  assert.deepEqual(p.action('pet',c.id),{ok:true});
 }
});

test('solo room reentry restores the same calm arrival after prior movement and play',()=>{
 for(const room of rooms){
  const p=new SoloPreview(room),initial=p.snapshot(),c=nearestCat(p);
  assert.deepEqual(p.action('feather',c.id),{ok:true});
  for(let i=0;i<90;i++)p.tick({x:1,z:0});
  for(const otherRoom of rooms.filter(other=>other!==room))new SoloPreview(otherRoom).tick();
  assert.deepEqual(new SoloPreview(room).snapshot(),initial);
 }
});

test('every arrival cat supports immediate pet feather and ball with unchanged local ownership and expiry',()=>{
 for(const room of rooms)for(const action of ['pet','feather','ball']){
  const p=new SoloPreview(room),c=nearestCat(p),visitor={...p.player},pose={x:c.x,z:c.z};
  assert.deepEqual(p.action(action,c.id),{ok:true},`${room}: ${action} should work without walking`);
  assert.deepEqual(p.player,visitor);assert.equal(c.owner,p.player.id);assert.equal(c.mode,action);
  assert.equal(c.until,4);assert.equal(p.snapshot().cats.find(cat=>cat.id===c.id).until,4000);
  assert.equal(p.cats.filter(cat=>cat.owner!==null).length,1);
  assert.deepEqual(p.action(action,c.id),{ok:false,reason:'COOLDOWN'});
  if(action==='ball')assert.equal(p.toys.length,1);else assert.equal(p.toys.length,0);
  for(let i=0;i<90;i++){
   p.tick();assert.ok(p.valid(c.x,c.z));
   if(action==='pet')assert.deepEqual({x:c.x,z:c.z},pose);
   for(const ball of p.toys){assert.ok(p.valid(ball.x,ball.z));assert.ok(Math.hypot(c.x-ball.x,c.z-ball.z)>=BALL_PHYSICS.clearance-1e-8);}
  }
  assert.equal(c.owner,null);assert.equal(c.mode,'idle');assert.equal(p.toys.length,0);
  assert.ok(p.cats.every(cat=>cat.owner===null));assert.equal(p.snapshot().players.length,1);
 }
});

test('choosing another solo cat releases an arrival cat and its ball without extending the old lease',()=>{
 const p=new SoloPreview('garden'),arrival=nearestCat(p);
 assert.deepEqual(p.action('ball',arrival.id),{ok:true});
 for(let i=0;i<25;i++)p.tick();
 const next=p.cats.find(c=>c!==arrival);p.player.x=next.x+1.1;p.player.z=next.z;
 assert.deepEqual(p.action('pet',next.id),{ok:true});
 assert.equal(arrival.owner,null);assert.equal(arrival.until,0);assert.equal(p.toys.length,0);
 assert.equal(next.owner,p.player.id);assert.equal(next.until,p.time+4);assert.equal(p.cats.filter(c=>c.owner).length,1);
 p.tick();assert.equal(arrival.mode,'idle');
});

test('solo preview has eighteen local cats one player and no online occupancy',()=>{const p=new SoloPreview('garden'),s=p.snapshot();assert.equal(s.room,'garden');assert.equal(s.cats.length,18);assert.equal(s.players.length,1);assert.equal(s.players[0].id,'solo-you');assert.deepEqual(s.rooms,[]);assert.equal(s.preview,true);});
test('local motion is deterministic with resting cats and bounded player input',()=>{const a=new SoloPreview('sunroom'),b=new SoloPreview('sunroom'),before=a.snapshot();for(let i=0;i<60;i++){a.tick({x:1,z:1});b.tick({x:1,z:1});}assert.deepEqual(a.snapshot(),b.snapshot());assert.ok(a.snapshot().cats.some((c,i)=>c.x!==before.cats[i].x));assert.ok(a.snapshot().cats.every(c=>c.mode==='idle'));assert.ok(a.snapshot().cats.some((c,i)=>c.x===before.cats[i].x&&c.z===before.cats[i].z));const s=a.snapshot();a.tick({x:NaN,z:Infinity});assert.deepEqual(a.snapshot().players,s.players);});
test('solo actions enforce distance and supported actions, animate play and expire',()=>{const p=new SoloPreview('sunroom');assert.deepEqual(p.action('pet','cat-0'),{ok:false,reason:'TOO_FAR'});const near=p.snapshot().cats[14];p.player.x=near.x;p.player.z=near.z;assert.ok(near);assert.deepEqual(p.action('bad',near.id),{ok:false,reason:'INVALID_ACTION'});assert.deepEqual(p.action('ball',near.id),{ok:true});assert.equal(p.snapshot().toys.length,1);assert.equal(p.snapshot().cats.find(c=>c.id===near.id).mode,'ball');for(let i=0;i<90;i++)p.tick({x:0,z:0});assert.equal(p.snapshot().toys.length,0);assert.equal(p.snapshot().cats.find(c=>c.id===near.id).owner,null);});
test('solo module has no network or credentials; main gates sends and disconnects before preview',async()=>{const {readFile}=await import('node:fs/promises');const source=await readFile(new URL('./preview.js',import.meta.url),'utf8'),main=await readFile(new URL('./main.js',import.meta.url),'utf8');assert.doesNotMatch(source,/WebSocket|fetch\(|sessionStorage|localStorage/);assert.match(main,/function send\(message\)\{if\(preview\|\|/);assert.match(main,/function startPreview\(\)\{if\(!requireRenderer\(\)\)return;disconnect\(\);preview=new SoloPreview/);assert.match(main,/혼자 둘러보기 · 실시간 연결 아님/);});
test('solo simulation clamps large elapsed time and respects shared obstacles and boundary',async()=>{const {WORLD_OBSTACLES,WALK_HALF,PLAYER_RADIUS}=await import('../../shared/space.mjs');const a=new SoloPreview('sunroom'),b=new SoloPreview('sunroom');a.tick({x:1,z:0},9999);b.tick({x:1,z:0},.05);assert.deepEqual(a.snapshot(),b.snapshot());const obstacle=WORLD_OBSTACLES[0];assert.equal(a.valid(obstacle.x,obstacle.z),false);assert.equal(a.valid(WALK_HALF,0),false);a.player.x=WALK_HALF-PLAYER_RADIUS;const before=a.player.x;a.tick({x:1,z:0});assert.equal(a.player.x,before);});
test('pet and feather actions affect only solo cat and expire locally',()=>{for(const action of ['pet','feather']){const p=new SoloPreview('garden'),cat=p.snapshot().cats[14];p.player.x=cat.x;p.player.z=cat.z;assert.equal(p.action(action,cat.id).ok,true);assert.equal(p.snapshot().cats.find(c=>c.id===cat.id).mode,action);assert.equal(p.snapshot().players.length,1);assert.deepEqual(p.action(action,cat.id),{ok:false,reason:'COOLDOWN'});}});

test('solo feather has a quiet watching interval rather than orbiting a stationary visitor',()=>{
 const p=new SoloPreview('sunroom'),cat=p.cats[8];p.player.x=cat.x+.6;p.player.z=cat.z;assert.equal(p.action('feather',cat.id).ok,true);
 let distance=0,rotation=0,quiet=0;
 for(let i=0;i<79;i++){const old={...cat};p.tick({x:0,z:0});distance+=Math.hypot(cat.x-old.x,cat.z-old.z);rotation+=Math.abs(Math.atan2(Math.sin(cat.yaw-old.yaw),Math.cos(cat.yaw-old.yaw)));if(cat.x===old.x&&cat.z===old.z){quiet++;assert.equal(cat.yaw,old.yaw);}assert.ok(p.valid(cat.x,cat.z));}
 assert.ok(distance<3);assert.ok(rotation<Math.PI*2);assert.ok(quiet>=35);
});
test('solo snapshot action expiry and presentation clock use milliseconds together',()=>{
 const p=new SoloPreview('sunroom'),cat=p.cats[8];p.player.x=cat.x+.6;p.player.z=cat.z;assert.equal(p.action('feather',cat.id).ok,true);const s=p.snapshot();assert.equal(s.cats[8].until-s.time,4000);assert.equal(cat.until-p.time,4);
});

test('all profiles use their feather schedule with bounded travel and no stationary turning',async()=>{
 const {soloFeatherPhase}=await import('./solo-experience.js');
 for(const room of rooms)for(let index=0;index<18;index++){
  const p=new SoloPreview(room),c=p.cats[index];p.player.x=c.x+1.1;p.player.z=c.z;
  assert.equal(p.action('feather',c.id).ok,true);
  for(let step=0;step<79;step++){
   const before={...c};p.tick();const phase=soloFeatherPhase(c.id,c.until*1000,p.time*1000).phase;
   const distance=Math.hypot(c.x-before.x,c.z-before.z),turn=Math.abs(Math.atan2(Math.sin(c.yaw-before.yaw),Math.cos(c.yaw-before.yaw)));
   assert.ok(p.valid(c.x,c.z));assert.ok(distance<=2.4*.05+1e-9);assert.ok(turn<=2.6*.05+1e-9);
   if(['focus','pause'].includes(phase)||distance===0)assert.deepEqual({x:c.x,z:c.z,yaw:c.yaw},{x:before.x,z:before.z,yaw:before.yaw},`${room}/${c.id}/${phase}`);
  }
 }
});

test('every profile still plays every toy through the same lease and cooldown with ball clearance',async()=>{
 const {soloProfile}=await import('./solo-experience.js');
 for(const room of rooms)for(let index=0;index<18;index++)for(const action of ['pet','feather','ball']){
  const p=new SoloPreview(room),c=p.cats[index];p.player.x=c.x+1.1;p.player.z=c.z;
  assert.deepEqual(p.action(action,c.id),{ok:true});assert.equal(c.until,4);assert.equal(p.cooldown,1.2);
  for(let step=0;step<81;step++){
   const old={...c};p.tick();assert.ok(p.valid(c.x,c.z));
   if(c.mode==='pet')assert.deepEqual({x:c.x,z:c.z,yaw:c.yaw},{x:old.x,z:old.z,yaw:old.yaw});
   if(c.mode==='ball')assert.ok(Math.hypot(c.x-old.x,c.z-old.z)<=BALL_PHYSICS.chaseSpeed*soloProfile(c.id).ballStep*.05+1e-9);
   for(const ball of p.toys){assert.ok(p.valid(ball.x,ball.z));assert.ok(Math.hypot(c.x-ball.x,c.z-ball.z)>=BALL_PHYSICS.clearance-1e-8);}
  }
  assert.equal(c.mode,'idle');assert.equal(c.owner,null);assert.equal(p.toys.length,0);
 }
});

test('slower sleepy and observant ball chases still approach and catch up to a legal throw within four seconds',()=>{
 for(const room of rooms)for(let i=0;i<3;i++){
  const p=new SoloPreview(room),c=p.cats[i];Object.assign(c,{x:0,z:3,yaw:0});Object.assign(p.player,{x:1.1,z:3,yaw:0});
  assert.equal(p.action('ball',c.id).ok,true);let travel=0,contact=false;
  for(let step=0;step<79;step++){
   const old={...c};p.tick();travel+=Math.hypot(c.x-old.x,c.z-old.z);
   contact ||= Math.abs(Math.hypot(c.x-p.toys[0].x,c.z-p.toys[0].z)-BALL_PHYSICS.clearance)<.005;
  }
  assert.ok(travel>2,`${room}/${c.id} must visibly follow the ball`);assert.ok(contact,`${room}/${c.id} must reach the safe contact distance`);
 }
});

test('a completely blocked solo ball chase holds its stationary heading',()=>{
 const p=new SoloPreview('garden'),c=p.cats[0];Object.assign(c,{x:0,z:0,yaw:1.2,mode:'ball',owner:p.player.id,until:4});p.toys=[{id:'blocked',owner:p.player.id,x:2,z:2,vx:0,vz:0,until:4}];p.valid=()=>false;
 p.tick();assert.deepEqual({x:c.x,z:c.z,yaw:c.yaw},{x:0,z:0,yaw:1.2});
});

test('switching solo action clears the prior cat mode immediately, before another tick',()=>{
 const p=new SoloPreview('sunroom'),a=p.cats[0],b=p.cats[1];Object.assign(p.player,{x:a.x,z:a.z});assert.equal(p.action('ball',a.id).ok,true);for(let i=0;i<25;i++)p.tick();Object.assign(p.player,{x:b.x,z:b.z});assert.equal(p.action('pet',b.id).ok,true);assert.equal(a.mode,'idle');assert.equal(a.until,0);assert.equal(a.owner,null);assert.equal(p.toys.length,0);
});

test('solo profiles keep furniture-edge feather and ball actions in free space without stationary spin',()=>{
 const obstacle=WORLD_OBSTACLES[0];
 for(const room of rooms)for(let profile=0;profile<3;profile++)for(const action of ['feather','ball'])for(const angle of [0,Math.PI/2,Math.PI,Math.PI*1.5]){
  const p=new SoloPreview(room),c=p.cats[profile],radius=obstacle.r+.63+.01;
  Object.assign(c,{x:obstacle.x+Math.sin(angle)*radius,z:obstacle.z+Math.cos(angle)*radius,yaw:angle+Math.PI});assert.ok(p.valid(c.x,c.z));
  Object.assign(p.player,{x:c.x+Math.sin(angle)*1.1,z:c.z+Math.cos(angle)*1.1,yaw:angle+Math.PI});
  assert.deepEqual(p.action(action,c.id),{ok:true});
  for(let i=0;i<79;i++){
   const old={...c};p.tick();assert.ok(p.valid(c.x,c.z));if(c.x===old.x&&c.z===old.z)assert.equal(c.yaw,old.yaw);
   for(const ball of p.toys){assert.ok(p.valid(ball.x,ball.z));assert.ok(Math.hypot(ball.x-c.x,ball.z-c.z)>=BALL_PHYSICS.clearance-1e-8);}
  }
 }
});

test('solo temperament does not change shared ambient locomotion or stationary headings across a full cycle',async()=>{
 const {tickAmbient}=await import('../../shared/ambient.mjs');
 for(const room of rooms){
  const p=new SoloPreview(room),baseline=p.cats.map(c=>({...c}));
  for(let i=0;i<2400;i++){
   p.tick();for(let n=0;n<baseline.length;n++){tickAmbient(baseline[n],p.time*1000,.05,(x,z)=>p.valid(x,z),room);assert.equal(p.cats[n].x,baseline[n].x);assert.equal(p.cats[n].z,baseline[n].z);assert.equal(p.cats[n].yaw,baseline[n].yaw);}
  }
 }
});

test('explicit elapsed clock expires four-second leases and1.2-second cooldown without movement catch-up',()=>{
 for(const room of rooms)for(const action of ['pet','feather','ball']){
  const p=new SoloPreview(room),c=nearestCat(p);assert.equal(p.action(action,c.id).ok,true);
  const before={...p.player};p.tick({x:1,z:0},.05,1);assert.equal(p.time,1);assert.ok(Math.hypot(p.player.x-before.x,p.player.z-before.z)<=3.6*.05+1e-9);
  assert.equal(c.owner,p.player.id);assert.equal(c.until,4);assert.deepEqual(p.action('pet',c.id),{ok:false,reason:'COOLDOWN'});
  p.tick({x:0,z:0},0,.2);assert.equal(p.time,1.2);assert.equal(p.cooldown<=p.time,true);
  p.tick({x:0,z:0},.05,2.8);assert.equal(p.time,4);assert.equal(c.owner,null);assert.equal(c.mode,'idle');assert.equal(p.toys.length,0);
 }
});

test('clock-only resume expires leases and toys without moving cats player or ball',()=>{
 const p=new SoloPreview('moonlight'),c=nearestCat(p);assert.equal(p.action('ball',c.id).ok,true);
 const cats=p.cats.map(cat=>({x:cat.x,z:cat.z,yaw:cat.yaw})),player={...p.player};
 p.tick({x:1,z:1},0,60);assert.equal(p.time,60);assert.deepEqual(p.player,player);assert.deepEqual(p.cats.map(cat=>({x:cat.x,z:cat.z,yaw:cat.yaw})),cats);assert.equal(c.owner,null);assert.equal(c.mode,'idle');assert.equal(p.toys.length,0);
 assert.equal(p.action('pet',c.id).ok,true);assert.equal(c.until,64);
});

test('solo cat toy and cooldown comparisons tolerate only numerical noise at nonzero deadlines',()=>{
 const p=new SoloPreview('sunroom'),c=nearestCat(p);p.tick({x:0,z:0},0,.137);assert.equal(p.action('ball',c.id).ok,true);
 p.tick({x:0,z:0},0,1.199999);assert.deepEqual(p.action('pet',c.id),{ok:false,reason:'COOLDOWN'});
 p.tick({x:0,z:0},0,.000001);assert.equal(p.cooldown-p.time<1e-9,true);
 p.tick({x:0,z:0},0,2.799999);assert.equal(c.mode,'ball');assert.equal(p.toys.length,1);
 p.tick({x:0,z:0},0,.000001);assert.equal(c.mode,'idle');assert.equal(c.owner,null);assert.equal(p.toys.length,0);assert.equal(p.action('pet',c.id).ok,true);
});
