import test from 'node:test';
import assert from 'node:assert/strict';
import {createAimIntent} from '../src/aim-intent.js';
import {resolvePoeAim,isPoeAimTargetValid} from '../src/cursor-targeting.js';
import {projectWorld,ISO} from '../src/visual.js';
import {mapFromRegion} from '../src/world-geometry.js';

const target=(x,y=50,targetId=null,rest={})=>({aim:{x,y},groundPoint:{x:x-10,y:y-10},targetId,aimingMode:'cursor',groundTargeted:false,targetingHeight:23,...rest});
const A=()=>target(100),B=()=>target(200),C=()=>target(300);
const fixture=()=>({p:{x:250,y:250},enemies:[{id:'boss',type:'boss',x:320,y:290,hp:220,active:true}],map:mapFromRegion({w:30,h:30})});
const screen=(e,b)=>{const q=projectWorld(e.x-b.p.x,e.y-b.p.y);return {x:590+q.x*ISO.zoom,y:757*.55+(q.y-50)*ISO.zoom};};

test('held aim updates with tracking either on or off while a skill permits retargeting',()=>{
 for(const cursorTrackingAfterRelease of [false,true]){
  const intent=createAimIntent({cursorTrackingAfterRelease});const start=intent.press(A());
  assert.equal(start.active,true);assert.equal(start.held,true);assert.deepEqual(start.aim,A().aim);
  assert.deepEqual(intent.snapshot(B()).aim,B().aim);assert.equal(intent.snapshot().cursorTrackingAfterRelease,cursorTrackingAfterRelease);
 }
});
test('release tracking OFF freezes the last held sample; ON refreshes from the new pointer',()=>{
 for(const cursorTrackingAfterRelease of [false,true]){
  const intent=createAimIntent({cursorTrackingAfterRelease});intent.press(A());
  const released=intent.release(B());assert.equal(released.held,false);assert.equal(released.active,true);assert.deepEqual(released.aim,B().aim);
  assert.deepEqual(intent.snapshot(C()).aim,(cursorTrackingAfterRelease?C():B()).aim);
 }
});
test('identical input immediately before and after release has no projection jump in either mode or tracking setting',()=>{
 const battle=fixture(),pointer={x:750,y:290};
 for(const aimingMode of ['cursor','ground'])for(const cursorTrackingAfterRelease of [false,true]){
  const aim=resolvePoeAim(pointer,battle,1180,757,{aimingMode}),intent=createAimIntent({cursorTrackingAfterRelease});
  intent.press(aim);const before=intent.snapshot(aim),atRelease=intent.release(aim),after=intent.snapshot(aim);
  assert.deepEqual(atRelease.aim,before.aim);assert.deepEqual(after.aim,before.aim);assert.deepEqual(after.groundPoint,before.groundPoint);
  assert.equal(after.held,false);assert.equal(after.aimingMode,aimingMode);
 }
});
test('skill retarget window independently blocks held and post-release tracking',()=>{
 for(const cursorTrackingAfterRelease of [false,true]){
  const intent=createAimIntent({cursorTrackingAfterRelease});intent.press(A());
  assert.deepEqual(intent.snapshot(B(),{canRetarget:false}).aim,A().aim);
  assert.deepEqual(intent.release(B(),{canRetarget:false}).aim,A().aim);
  assert.deepEqual(intent.snapshot(C(),{canRetarget:false}).aim,A().aim);
  assert.deepEqual(intent.snapshot(C(),{canRetarget:true}).aim,(cursorTrackingAfterRelease?C():A()).aim);
 }
});
test('repeated held presses are idempotent and cannot bypass the retarget window',()=>{
 const intent=createAimIntent();intent.press(A());assert.deepEqual(intent.press(B()).aim,A().aim);
 assert.deepEqual(intent.snapshot(C(),{canRetarget:false}).aim,A().aim);
 intent.release();assert.deepEqual(intent.press(C()).aim,C().aim);assert.equal(intent.snapshot().held,true);
});
test('release is idempotent and cannot create a new action or sample a later pointer',()=>{
 const intent=createAimIntent({cursorTrackingAfterRelease:true});
 assert.equal(intent.release(A()).active,false);intent.press(A());intent.release(B());
 assert.deepEqual(intent.release(C()).aim,B().aim);assert.deepEqual(intent.snapshot(C()).aim,C().aim);
});
test('queued refresh explicitly outranks canRetarget false and tracking OFF after key release',()=>{
 const intent=createAimIntent({cursorTrackingAfterRelease:false});intent.press(A());intent.release();
 assert.deepEqual(intent.snapshot(B(),{canRetarget:false}).aim,A().aim);
 assert.deepEqual(intent.snapshot(B(),{queued:true,canRetarget:false}).aim,B().aim);
 assert.deepEqual(intent.snapshot(C(),{queued:true,canRetarget:true}).aim,C().aim);
 // Consuming code stops passing queued:true when the pending action executes.
 assert.deepEqual(intent.snapshot(A(),{canRetarget:true}).aim,C().aim);
});
test('a separate queued intent refreshes without changing a frozen active skill',()=>{
 const active=createAimIntent(),queued=createAimIntent();active.press(A());active.release();queued.press(B());queued.release();
 const next=queued.snapshot(C(),{queued:true,canRetarget:false});assert.deepEqual(next.aim,C().aim);
 assert.deepEqual(active.snapshot(C(),{canRetarget:false}).aim,A().aim);
 queued.clear();assert.equal(queued.snapshot(C(),{queued:true}).active,false);assert.deepEqual(active.snapshot().aim,A().aim);
});
test('invalid live coordinates retain a valid committed point without allowing NaN into intent',()=>{
 const intent=createAimIntent({cursorTrackingAfterRelease:true});intent.press(A());
 for(const value of [null,{},target(NaN),target(Infinity),{aim:{x:1,y:NaN}}])assert.deepEqual(intent.snapshot(value).aim,A().aim);
 const invalid=createAimIntent();assert.equal(invalid.press(target(NaN,50,'boss')).targetId,null);assert.equal(invalid.snapshot().aim,null);
});
test('snapshots are detached copies and caller mutation cannot alter the stored aim',()=>{
 const intent=createAimIntent(),input=target(100,50,'boss'),before=JSON.stringify(input),result=intent.press(input);
 assert.equal(JSON.stringify(input),before);input.aim.x=-10;input.groundPoint.y=-20;result.aim.y=-30;result.groundPoint.x=-40;result.targetId='other';
 const next=intent.snapshot();assert.deepEqual(next.aim,{x:100,y:50});assert.deepEqual(next.groundPoint,{x:90,y:40});assert.equal(next.targetId,'boss');
});
test('dead/inactive/occluded/removed target metadata is cleared even with frozen aim and no valid new pointer',()=>{
 for(const invalidate of [b=>b.enemies[0].hp=0,b=>b.enemies[0].active=false,b=>b.enemies[0].dead=true,b=>b.enemies=[],b=>{for(let y=0;y<30;y++)b.map.tiles[y][9]=0;}]){
  const b=fixture(),pointer=screen(b.enemies[0],b),resolved=resolvePoeAim(pointer,b,1180,757),intent=createAimIntent();
  assert.equal(resolved.targetId,'boss');intent.press(resolved);intent.release();invalidate(b);
  const result=intent.snapshot(null,{canRetarget:false,isTargetValid:id=>isPoeAimTargetValid(id,b)});
  assert.equal(result.targetId,null);assert.deepEqual(result.aim,resolved.aim);assert.equal(result.held,false);
 }
});
test('post-release tracking follows a moved cursor rather than an entity ID or closest enemy',()=>{
 const b=fixture(),pointer=screen(b.enemies[0],b),first=resolvePoeAim(pointer,b,1180,757);
 const frozen=createAimIntent(),tracking=createAimIntent({cursorTrackingAfterRelease:true});
 for(const intent of [frozen,tracking]){intent.press(first);intent.release();}
 b.enemies[0].x+=200;const away=resolvePoeAim({x:940,y:650},b,1180,757);
 assert.equal(away.targetId,null);assert.deepEqual(frozen.snapshot(away).aim,first.aim);
 const tracked=tracking.snapshot(away);assert.equal(tracked.targetId,null);assert.deepEqual(tracked.aim,away.aim);
});
test('tracking and queued targets use fresh camera/viewport projection supplied by the caller',()=>{
 const b=fixture(),pointer={x:700,y:290},intent=createAimIntent({cursorTrackingAfterRelease:true});
 const first=resolvePoeAim(pointer,b,1180,757);intent.press(first);intent.release();
 b.p.x+=30;b.p.y-=12;const live=resolvePoeAim(pointer,b,1180,757);assert.deepEqual(intent.snapshot(live).aim,live.aim);assert.notDeepEqual(live.aim,first.aim);
 const resized=resolvePoeAim({x:300,y:290},b,390,780);assert.deepEqual(intent.snapshot(resized,{queued:true,canRetarget:false}).aim,resized.aim);
});
test('clear disarms aim across pause/death/scene/blur style resets; live pointer alone cannot rearm it',()=>{
 const intent=createAimIntent({cursorTrackingAfterRelease:true});intent.press(target(100,50,'boss'));intent.release();
 for(let n=0;n<2;n++){
  const cleared=intent.clear();assert.equal(cleared.active,false);assert.equal(cleared.held,false);assert.equal(cleared.aim,null);assert.equal(cleared.targetId,null);
  const live=intent.snapshot(B(),{queued:true});assert.equal(live.active,false);assert.equal(live.aim,null);
 }
 assert.equal(intent.press(C()).active,true);assert.deepEqual(intent.snapshot().aim,C().aim);
});

test('queued hover can change targets then return to free aim after target death',()=>{
 const b=fixture();b.enemies.push({...b.enemies[0],id:'other',x:420,y:420});
 const intent=createAimIntent(),resolve=e=>resolvePoeAim(screen(e,b),b,1180,757);
 intent.press(resolve(b.enemies[0]));intent.release();
 const policy={queued:true,canRetarget:false,isTargetValid:id=>isPoeAimTargetValid(id,b)};
 const other=resolve(b.enemies[1]);assert.equal(intent.snapshot(other,policy).targetId,'other');
 b.enemies[1].hp=0;const empty=resolve(b.enemies[1]),after=intent.snapshot(empty,policy);
 assert.equal(after.targetId,null);assert.deepEqual(after.aim,other.aim);assert.notEqual(after.targetId,'boss');
});
