import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveCursorAim,resolvePoeAim,isPoeAimTargetValid,REBORN_AIM_HEIGHTS} from '../src/cursor-targeting.js';
import {createVisualRenderer,projectWorld,screenToWorld,ISO} from '../src/visual.js';
import {mapFromRegion} from '../src/world-geometry.js';

const W=1180,H=757;
const enemy=(id='boss',rest={})=>({id,type:'boss',x:320,y:290,hp:220,active:true,...rest});
const fixture=()=>({p:{x:250,y:250},enemies:[enemy()],map:mapFromRegion({w:30,h:30})});
function screen(point,b,w=W,h=H,lift=0){const q=projectWorld(point.x-b.p.x,point.y-b.p.y);return {x:w*.5+q.x*ISO.zoom,y:h*.55+(q.y-lift)*ISO.zoom};}
const close=(a,b)=>{assert.ok(Math.abs(a.x-b.x)<1e-8,`${a.x} != ${b.x}`);assert.ok(Math.abs(a.y-b.y)<1e-8,`${a.y} != ${b.y}`);};

test('cursor mode intersects the literal screen pointer at each authored strike/projectile height',()=>{
 const b=fixture(),pointer={x:750,y:290};
 for(const targetingHeight of [0,REBORN_AIM_HEIGHTS.strike,REBORN_AIM_HEIGHTS.projectile,41]){
  const result=resolvePoeAim(pointer,b,W,H,{aimingMode:'cursor',targetingHeight});
  close(screen(result.aim,b,W,H,targetingHeight),pointer);
  close(result.groundPoint,screenToWorld(pointer.x,pointer.y,b.p,W,H));
  assert.equal(result.targetingHeight,targetingHeight);
 }
});
test('ground mode sends an elevated path above the pointer ground location',()=>{
 const b=fixture(),pointer={x:750,y:290},targetingHeight=23;
 const result=resolvePoeAim(pointer,b,W,H,{aimingMode:'ground',targetingHeight});
 close(result.aim,screenToWorld(pointer.x,pointer.y,b.p,W,H));
 close(screen(result.aim,b,W,H,targetingHeight),{x:pointer.x,y:pointer.y-targetingHeight*ISO.zoom});
 assert.notDeepEqual(result.aim,resolvePoeAim(pointer,b,W,H,{aimingMode:'cursor',targetingHeight}).aim);
});
test('ground-targeted skills use the same uncorrected ground point under either aiming mode',()=>{
 const b=fixture(),foot=screen(b.enemies[0],b),pointer={x:foot.x,y:foot.y-75};
 const cursor=resolvePoeAim(pointer,b,W,H,{aimingMode:'cursor',groundTargeted:true});
 const ground=resolvePoeAim(pointer,b,W,H,{aimingMode:'ground',groundTargeted:true});
 assert.deepEqual(cursor.aim,ground.aim);assert.deepEqual(cursor.aim,cursor.groundPoint);
 assert.equal(cursor.targetId,'boss');assert.notDeepEqual(cursor.aim,{x:320,y:290});
});
test('body hover is metadata and never snaps opt-in cursor/ground aim to actor feet',()=>{
 const b=fixture(),foot=screen(b.enemies[0],b),pointer={x:foot.x,y:foot.y-75};
 const old=resolveCursorAim(pointer,b,W,H),cursor=resolvePoeAim(pointer,b,W,H),ground=resolvePoeAim(pointer,b,W,H,{aimingMode:'ground'});
 assert.deepEqual(old,{aim:{x:320,y:290},targetId:'boss'});
 assert.equal(cursor.targetId,'boss');assert.equal(ground.targetId,'boss');
 assert.notDeepEqual(cursor.aim,old.aim);assert.notDeepEqual(ground.aim,old.aim);
 close(screen(cursor.aim,b,W,H,23),pointer);
});
test('empty ground never acquires a nearby or nearest target',()=>{
 const b=fixture(),pointer={x:940,y:640};
 assert.equal(resolvePoeAim(pointer,b,W,H).targetId,null);
 b.enemies.push(enemy('closer',{x:b.p.x+5,y:b.p.y}));
 assert.equal(resolvePoeAim(pointer,b,W,H).targetId,null);
});
test('hover and validity exclude dead, inactive, invalid and wall-occluded enemies',()=>{
 for(const change of [{hp:0},{hp:-1},{active:false},{dead:true},{x:NaN},{y:Infinity},{}]){
  const b=fixture(),foot=screen(b.enemies[0],b),pointer={x:foot.x,y:foot.y-60};
  Object.assign(b.enemies[0],change);
  if(!Object.keys(change).length)for(let y=0;y<30;y++)b.map.tiles[y][9]=0;
  assert.equal(resolvePoeAim(pointer,b,W,H).targetId,null,JSON.stringify(change));
  assert.equal(isPoeAimTargetValid('boss',b),false);
 }
 assert.equal(isPoeAimTargetValid('boss',fixture()),true);
});
test('overlap has stable score/depth/id selection independent of enemy array order',()=>{
 const b=fixture();b.enemies.push(enemy('another'));const foot=screen(b.enemies[0],b),pointer={x:foot.x,y:foot.y-60};
 assert.equal(resolvePoeAim(pointer,b,W,H).targetId,'another');
 b.enemies.reverse();assert.equal(resolvePoeAim(pointer,b,W,H).targetId,'another');
 // Two equidistant body centers: deeper visible body wins before id order.
 b.enemies=[enemy('a',{x:300,y:300}),enemy('z',{x:320,y:320})];
 const a=screen(b.enemies[0],b),z=screen(b.enemies[1],b),middle={x:a.x,y:(a.y+z.y)/2-50*ISO.zoom};
 assert.equal(resolvePoeAim(middle,b,W,H).targetId,'z');
});
test('camera translation and viewport resize recompute projection and hover without cached coordinates',()=>{
 const b=fixture();
 for(const [x,y,w,h]of [[250,250,1180,757],[300,230,1180,757],[300,230,390,780],[190,310,2400,1200]]){
  b.p={x,y};const pointer=screen(b.enemies[0],b,w,h,50);
  const result=resolvePoeAim(pointer,b,w,h,{targetingHeight:23});
  assert.equal(result.targetId,'boss');close(screen(result.aim,b,w,h,23),pointer);
 }
});
test('moving the camera with a fixed screen pointer moves the world point by the same amount',()=>{
 const b=fixture(),pointer={x:800,y:300},before=resolvePoeAim(pointer,b,W,H);
 b.p.x+=21;b.p.y-=11;const after=resolvePoeAim(pointer,b,W,H);
 close(after.aim,{x:before.aim.x+21,y:before.aim.y-11});
 close(after.groundPoint,{x:before.groundPoint.x+21,y:before.groundPoint.y-11});
});
test('target death/removal does not transfer an old hover to an unrelated live enemy',()=>{
 const b=fixture(),pointer=screen(b.enemies[0],b,W,H,50),initial=resolvePoeAim(pointer,b,W,H);
 b.enemies[0].hp=0;b.enemies.push(enemy('other',{x:520,y:420}));
 const after=resolvePoeAim(pointer,b,W,H);assert.equal(after.targetId,null);assert.deepEqual(after.aim,initial.aim);
 b.enemies=[];assert.equal(isPoeAimTargetValid('boss',b),false);
});
test('nonfinite/missing pointer, camera and viewport return null coordinates instead of propagating NaN',()=>{
 const b=fixture();
 for(const pointer of [null,{}, {x:NaN,y:1},{x:1,y:Infinity}]){
  const r=resolvePoeAim(pointer,b,W,H);assert.equal(r.aim,null);assert.equal(r.groundPoint,null);assert.equal(r.targetId,null);
 }
 for(const [w,h]of [[0,H],[-1,H],[W,0],[NaN,H],[W,Infinity]])assert.equal(resolvePoeAim({x:1,y:2},b,w,h).aim,null);
 for(const battle of [null,{}, {...b,p:{x:NaN,y:0}},{...b,p:{x:0,y:Infinity}}])assert.equal(resolvePoeAim({x:1,y:2},battle,W,H).aim,null);
});
test('invalid options/height are safe and a missing map disables selection without disabling free aim',()=>{
 const b=fixture(),pointer={x:600,y:400};
 for(const targetingHeight of [NaN,Infinity,-1,'23']){
  const r=resolvePoeAim(pointer,b,W,H,{aimingMode:'unknown',targetingHeight});assert.equal(r.targetingHeight,23);assert.equal(r.aimingMode,'cursor');assert.ok(Number.isFinite(r.aim.x));
 }
 assert.equal(resolvePoeAim(pointer,b,W,H,null).targetingHeight,23);
 for(const map of [null,{}, {tiles:null}]){const r=resolvePoeAim(pointer,{...b,map},W,H);assert.ok(r.aim);assert.equal(r.targetId,null);assert.equal(isPoeAimTargetValid('boss',{...b,map}),false);}
 for(const enemies of [null,{},[null,enemy(null)]]){assert.equal(resolvePoeAim(pointer,{...b,enemies},W,H).targetId,null);assert.equal(isPoeAimTargetValid('boss',{...b,enemies}),false);}
});
test('resolver does not mutate options, battle, pointer or returned point aliases',()=>{
 const b=fixture(),pointer={x:600,y:400},options={aimingMode:'ground'},before=JSON.stringify({b,pointer,options});
 const r=resolvePoeAim(pointer,b,W,H,options);assert.equal(JSON.stringify({b,pointer,options}),before);
 r.aim.x+=100;assert.notEqual(r.aim.x,r.groundPoint.x);
 assert.equal(JSON.stringify({b,pointer,options}),before);
});

// This runs the actual render handler against a recording canvas, not a
// browser/screenshot check. It prevents an invented height from passing only
// against a test that repeats the same projection formula.
test('opt-in aim matches actual shot and strike-impact render translations',()=>{
 const b=fixture(),pointer={x:750,y:290};
 for(const [kind,lift]of [['shot',REBORN_AIM_HEIGHTS.projectile],['impact',REBORN_AIM_HEIGHTS.strike]])for(const aimingMode of ['cursor','ground']){
  const translated=[],noop=()=>{},state={};
  const ctx=new Proxy({translate:(x,y)=>translated.push({x,y}),createRadialGradient:()=>({addColorStop:noop}),measureText:()=>({width:0})},{get:(o,k)=>k in o?o[k]:k in state?state[k]:noop,set:(_,k,v)=>(state[k]=v,true)});
  const aim=resolvePoeAim(pointer,b,W,H,{aimingMode,targetingHeight:lift}).aim;
  const shots=kind==='shot'?[{...aim,vx:1,vy:0,kind:'arrow'}]:[];
  const effects=kind==='impact'?[{...aim,type:'impact',angle:0,r:10,life:1,max:1,color:'#fff'}]:[];
  createVisualRenderer(ctx,{environment:{sprites:{}}},{},{createCanvas:null}).render({width:W,height:H,map:b.map,p:{...b.p,hp:100},entities:[],shots,effects,cleanView:true});
  close(translated.at(-1),{x:pointer.x,y:pointer.y-(aimingMode==='ground'?lift*ISO.zoom:0)});
 }
});
