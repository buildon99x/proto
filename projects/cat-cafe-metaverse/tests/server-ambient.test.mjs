import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../server/world.mjs';
import {SoloPreview} from '../app/src/preview.js';
import {exportWorld,importWorld} from '../server/state-codec.mjs';
test('unowned cats are stationary with stable yaw at least80 percent of a complete cycle',()=>{
 let now=0;const w=new World({clock:()=>now});let quiet=0,total=0;
 for(let step=0;step<2400;step++){const cats=w.rooms.get('sunroom').cats,before=cats.map(c=>[c.x,c.z,c.yaw]);now+=50;w.tick();cats.forEach((c,i)=>{total++;if(c.x===before[i][0]&&c.z===before[i][1]){quiet++;assert.equal(c.yaw,before[i][2]);}assert.ok(w.valid(c.x,c.z));});}
 assert.ok(quiet/total>=.8,`stationary fraction ${quiet/total}`);
});
test('one solo arrival home changes while live homes and shared ambient evolution stay intact',()=>{
 for(const room of ['sunroom','garden','moonlight']){
  let now=0;const w=new World({clock:()=>now}),solo=new SoloPreview(room),cats=w.rooms.get(room).cats;
  const moved=solo.cats.filter((c,i)=>c.homeX!==AMBIENT_SPOTS[i].x||c.homeZ!==AMBIENT_SPOTS[i].z);
  assert.equal(moved.length,1,'only the solo arrival home differs from the live catalog');
  const arrival=moved[0],arrivalHome={x:arrival.homeX,z:arrival.homeZ};
  assert.ok(Math.hypot(arrival.x-solo.player.x,arrival.z-solo.player.z)<=2.8);
  for(let step=0;step<2400;step++){
   now+=50;w.tick();solo.tick();
   for(let i=0;i<18;i++){
    const live=cats[i],local=solo.cats[i],home=AMBIENT_SPOTS[i];
    assert.equal(live.homeX,home.x);assert.equal(live.homeZ,home.z);
    if(local!==arrival){
     assert.equal(local.homeX,home.x);assert.equal(local.homeZ,home.z);
     assert.ok(Math.abs(live.x-local.x)<1e-8);assert.ok(Math.abs(live.z-local.z)<1e-8);
    }else{assert.equal(local.homeX,arrivalHome.x);assert.equal(local.homeZ,arrivalHome.z);}
    assert.ok(Math.abs((live.x-live.homeX)-(local.x-local.homeX))<1e-8);
    assert.ok(Math.abs((live.z-live.homeZ)-(local.z-local.homeZ))<1e-8);
    assert.ok(Math.abs(live.yaw-local.yaw)<1e-8);
    assert.equal(ambientPhase(local.id,solo.time*1000,room),ambientPhase(live.id,now,room));
    assert.equal(live.mode,'idle');assert.equal(local.mode,'idle');
   }
  }
  assert.ok(new Set(cats.map(c=>c.homeZ)).size>6,'not three-row grid');
 }
});
test('checkpoint homes survive import and quiet intervals without migration or teleport',()=>{
 let now=0;const w=new World({clock:()=>now});const c=w.rooms.get('sunroom').cats[0];c.homeX=1;c.homeZ=2;c.x=1;c.z=2;
 const saved=exportWorld(w);const restored=importWorld(saved,{clock:()=>now});now=50;restored.tick();const after=restored.rooms.get('sunroom').cats[0];assert.equal(after.homeX,1);assert.equal(after.homeZ,2);assert.ok(Math.hypot(after.x-1,after.z-2)<=.025);
});
import {AMBIENT_SPOTS,ambientPhase,tickAmbient} from '../shared/ambient.mjs';
test('18 distinct legal ground spots are separated and phase clocks stay staggered in every room',()=>{
 const w=new World();assert.equal(AMBIENT_SPOTS.length,18);
 for(let i=0;i<18;i++){const a=AMBIENT_SPOTS[i];assert.ok(w.valid(a.x,a.z));for(let j=0;j<i;j++)assert.ok(Math.hypot(a.x-AMBIENT_SPOTS[j].x,a.z-AMBIENT_SPOTS[j].z)>1.5);}
 for(const room of ['sunroom','garden','moonlight'])for(let now=0;now<120000;now+=50){const phases=Array.from({length:18},(_,i)=>ambientPhase(`cat-${i}`,now,room));assert.ok(phases.filter(p=>p==='walk').length<=2);assert.ok(phases.filter(p=>p==='sleep').length>=11);}
});
test('blocked ambient steps preserve yaw and endpoints never overshoot',()=>{
 const cat={id:'cat-0',homeX:0,homeZ:0,x:0,z:0,yaw:1};tickAmbient(cat,112000,.05,()=>false);assert.deepEqual(cat,{id:'cat-0',homeX:0,homeZ:0,x:0,z:0,yaw:1});
 for(let t=112000;t<120000;t+=50)tickAmbient(cat,t,.05,()=>true);assert.ok(Math.hypot(cat.x+.65,cat.z+.65)<=.01);const stopped={...cat};tickAmbient(cat,120000,.05,()=>true);assert.deepEqual(cat,stopped);
});
test('post-action cats remain quiet most of cycle and active pet lease overrides ambient movement',()=>{
 let now=0;const w=new World({clock:()=>now});w.join('owner','sunroom');const p=w.members.get('owner'),cat=w.rooms.get('sunroom').cats[0];p.x=cat.x;p.z=cat.z;assert.equal(w.action('owner',{requestId:'pet',action:'pet',catId:cat.id}).ok,true);
 const position=[cat.x,cat.z];for(let i=0;i<79;i++){now+=50;w.tick();assert.deepEqual([cat.x,cat.z],position);assert.equal(cat.mode,'pet');}
 let quiet=0;for(let i=0;i<2400;i++){const before=[cat.x,cat.z];now+=50;w.tick();if(cat.x===before[0]&&cat.z===before[1])quiet++;}assert.ok(quiet/2400>=.8);assert.equal(cat.mode,'idle');
});
test('legacy grid idle homes migrate once; active leases and custom homes stay untouched',()=>{
 let now=1000;const w=new World({clock:()=>now});w.join('visitor','sunroom');const player=w.members.get('visitor'),token=player.token;
 const cats=w.rooms.get('sunroom').cats;
 for(let i=0;i<18;i++){cats[i].homeX=(-5+(i%6)*2)*Math.SQRT2;cats[i].homeZ=(-3+Math.floor(i/6)*3)*Math.SQRT2;cats[i].x=cats[i].homeX;cats[i].z=cats[i].homeZ;}
 cats[1].owner=player.id;cats[1].mode='pet';cats[1].until=5000;const active=[cats[1].x,cats[1].z,cats[1].homeX,cats[1].homeZ];
 cats[2].homeX=1;cats[2].homeZ=2;cats[2].x=1;cats[2].z=2;
 w.tick();assert.deepEqual([cats[0].homeX,cats[0].homeZ],[AMBIENT_SPOTS[0].x,AMBIENT_SPOTS[0].z]);assert.deepEqual([cats[1].x,cats[1].z,cats[1].homeX,cats[1].homeZ],active);assert.equal(cats[1].mode,'pet');assert.deepEqual([cats[2].homeX,cats[2].homeZ],[1,2]);assert.equal(w.tokens.get(token),player);
 cats[0].x+=.3;const moved=cats[0].x;w.tick();assert.equal(cats[0].x,moved,'no repeated relocation');
 const restored=importWorld(exportWorld(w),{clock:()=>now});restored.tick();assert.equal(restored.rooms.get('sunroom').cats[0].x,moved,'takeover does not repeat migration');
 now=5000;w.tick();assert.deepEqual([cats[1].homeX,cats[1].homeZ],[AMBIENT_SPOTS[1].x,AMBIENT_SPOTS[1].z]);
});
test('fresh live and solo resting orientations are varied and identical',()=>{const world=new World(),solo=new SoloPreview('sunroom'),cats=world.rooms.get('sunroom').cats;assert.ok(new Set(cats.map(c=>c.yaw)).size>=6);assert.deepEqual(cats.map(c=>c.yaw),solo.cats.map(c=>c.yaw));});
