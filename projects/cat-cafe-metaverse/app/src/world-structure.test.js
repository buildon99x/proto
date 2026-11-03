// Real Three geometry/object graph, stub renderer. Not WebGL, pixels, draw calls or FPS.
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync}from'node:fs';import*as Three from'three';import{mergeGeometries}from'three/addons/utils/BufferGeometryUtils.js';import{crowdPlan}from'./logic.js';import*as motion from'./motion.js';import{ambientPhase}from'../../shared/ambient.mjs';import{soloExperience}from'./solo-experience.js';import{SoloPreview}from'./preview.js';import*as coat from'./coat.js';import{SPACE_SCALE,FLOOR_SIZE}from'../../shared/space.mjs';import*as policy from'./render-policy.js';import{batchStaticScene}from'./static-batch.js';
function fixture({batch=true,reduced=false}={}){let scene,camera,batchReport=null,clockMs=0;const query={matches:reduced};class Renderer{constructor(){this.shadowMap={};this.info={autoReset:true,reset(){}};}setPixelRatio(){}setSize(){}render(s,c){scene=s;camera=c;}}const source=readFileSync(new URL('./world.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replaceAll('export ','');const args={performance:{now:()=>clockMs},T:{...Three,WebGLRenderer:Renderer},mergeGeometries,crowdPlan,...motion,ambientPhase,soloExperience,...coat,...policy,motionPreference:()=>query,batchStaticScene:batch?root=>(batchReport=batchStaticScene(root)):()=>{},S:SPACE_SCALE,FLOOR_SIZE,devicePixelRatio:1,innerWidth:1440,innerHeight:900,window:{addEventListener(){}}};const create=new Function(...Object.keys(args),source+';return createWorld;')(...Object.values(args));const canvas={dataset:{}},world=create(canvas,()=>{});world.render(0);return{world,query,canvas,setTime:t=>{clockMs=t*1000;},get batchReport(){return batchReport;},get scene(){return scene;},get camera(){return camera;}};}
function structure(scene){scene.updateMatrixWorld(true);const bounds=new Three.Box3();let meshes=0,triangles=0,shadowTriangles=0;const attributed={};scene.traverse(o=>{if(!o.isMesh||o.isInstancedMesh)return;meshes++;const n=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;triangles+=n;const key=[o.material.type,o.material.color?.getHex(),o.castShadow,o.receiveShadow].join(':');attributed[key]=(attributed[key]||0)+n;if(o.castShadow)shadowTriangles+=n;bounds.union(new Three.Box3().setFromObject(o));});return{meshes,triangles,shadowTriangles,attributed,bounds:[...bounds.min.toArray(),...bounds.max.toArray()]};}
test('actual café static batching preserves triangles bounds and shadow geometry with fewer mesh objects',()=>{const before=structure(fixture({batch:false}).scene),after=structure(fixture().scene);assert.equal(before.meshes,145);assert.equal(after.meshes,29);assert.equal(before.triangles,20896);assert.equal(after.triangles,before.triangles);assert.equal(after.shadowTriangles,before.shadowTriangles);assert.deepEqual(after.attributed,before.attributed);for(let i=0;i<6;i++)assert.ok(Math.abs(after.bounds[i]-before.bounds[i])<1e-6);});
test('live reduced-motion preference suppresses cosmetics without freezing authoritative movement or active cat state',()=>{const f=fixture({reduced:true});const snapshot=(time,x)=>({time,preview:true,room:'sunroom',players:[{id:'me',name:'visitor',x,z:0,yaw:0,color:0}],cats:[{id:'cat-2',name:'cat',x,z:2,yaw:0,skin:0,mode:'feather',until:2800,owner:'me'}],toys:[]});f.world.update(snapshot(0,0),'me',0);f.world.update(snapshot(100,1),'me',.1);f.world.render(.2);const player=f.scene.children.find(o=>o.userData.limbs),cat=f.scene.children.find(o=>o.userData.catId);const x=player.position.x;f.world.render(.23);assert.ok(player.position.x>x);assert.equal(player.position.y,0);assert.ok(player.userData.limbs.every(({part})=>part.rotation.x===0));assert.equal(cat.position.y,0);assert.equal(player.userData.wand.visible,true);f.query.matches=false;f.world.render(.24);assert.ok(cat.position.y>0);});

test('static batching reports bounded added geometry storage separately from GPU memory',()=>{const r=fixture().batchReport;assert.equal(r.beforeMeshes,145);assert.equal(r.afterMeshes,29);assert.ok(r.addedMergedGeometryBytes>0&&r.addedMergedGeometryBytes<2*1024*1024);assert.ok(r.peakTemporaryCloneBytes>0&&r.peakTemporaryCloneBytes<1024*1024);console.log('STATIC_GEOMETRY_ARRAY_BYTES',JSON.stringify(r));});

test('actual successful renderer calls publish bounded frame intervals and explicit pause clears them',()=>{
 const f=fixture();for(let i=1;i<=100;i++){f.setTime(i/60);f.world.render(i/60);}
 assert.equal(f.canvas.dataset.initialFrameSamples,'60');assert.ok(Number(f.canvas.dataset.warmFrameSamples)>0);assert.ok(Math.abs(Number(f.canvas.dataset.warmFrameP50Ms)-16.67)<.02);
 f.world.resetFrameMetrics();assert.equal(f.canvas.dataset.renderedFrames,undefined);f.setTime(30);f.world.render(30);assert.equal(f.canvas.dataset.initialFrameSamples,'0');
});


test('actual scene switches solo to live clocks and resets old profile pose even when cat IDs are reused',()=>{
 const f=fixture(),packet=(preview,time,mode='pet',until=time+4000)=>({preview,time,room:'sunroom',cats:[{id:'cat-0',name:'cat',x:0,z:2,yaw:0,skin:0,mode,until,owner:'me'}],players:[],toys:[]});
 f.world.update(packet(true,1000),'me',1);f.world.render(1.2);let cat=f.scene.children.find(o=>o.userData.catId);
 assert.equal(cat.userData.eyes[0].scale.y,.043*.10);assert.equal(cat.userData.heart.visible,true);
 // Live authority has a different epoch. The old solo interpolation samples must not survive.
 f.world.update(packet(false,900000),'me',1.3);f.world.render(1.5);
 assert.equal(cat.userData.eyes[0].scale.y,.043*.25);assert.equal(cat.userData.motion.size,1);
 f.world.update(packet(false,900100,'feather',904000),'me',1.4);f.world.render(1.6);
 assert.ok(Math.abs(cat.position.y-Math.max(0,Math.sin(1.6*7))*.4)<1e-12);
 f.world.clear();f.world.render(1.7);assert.equal(f.scene.children.filter(o=>o.userData.catId).length,0);
 f.world.setRoom('garden');f.world.update({...packet(true,60000,'idle',0),room:'garden'},'me',2);f.world.render(2.2);cat=f.scene.children.find(o=>o.userData.catId);
 assert.equal(cat.userData.eyes[0].scale.y,.043);assert.equal(cat.userData.heart.visible,false);assert.equal(cat.position.y,0);
 f.world.setRoom('sunroom');f.world.update(packet(false,0,'idle',0),'me',3);f.world.render(3.2);
 assert.equal(cat.userData.eyes[0].scale.y,.043*.035);assert.equal(cat.userData.heart.visible,false);
});

test('actual solo scene holds a paused simulation lease and expires only with its source snapshot',()=>{
 for(const mode of ['pet','feather','ball']){
  const f=fixture(),cat={id:'cat-0',name:'cat',x:0,z:2,yaw:0,skin:0,mode,until:4000,owner:'me'},packet=time=>({preview:true,time,room:'sunroom',cats:[cat],players:[],toys:[]});
  f.world.update(packet(1000),'me',1);f.world.render(1.2);const model=f.scene.children.find(o=>o.userData.catId),eyes=model.userData.eyes[0].scale.y;
  f.world.render(40.2);assert.equal(model.userData.eyes[0].scale.y,eyes);assert.equal(model.userData.heart.visible,mode==='pet');
  f.world.update(packet(4000),'me',41);f.world.render(41.2);assert.equal(model.userData.heart.visible,false);assert.equal(model.position.y,0);assert.equal(model.userData.eyes[0].scale.y,.043*.035);assert.equal(model.userData.head.position.z,-.43);
 }
});

test('actual solo scene keeps pose physics and lease coherent across repeated one-second callback gaps and new actions',()=>{
 const f=fixture(),p=new SoloPreview('moonlight'),c=p.cats[15];assert.equal(p.action('pet',c.id).ok,true);
 f.world.update(p.snapshot(),p.player.id,0);let wall=0;
 const delayedTick=()=>{p.tick();wall++;f.world.update(p.snapshot(),p.player.id,wall);f.world.render(wall+.2);return f.scene.children.find(o=>o.userData.catId===c.id);};
 for(let i=0;i<30;i++){
  const model=delayedTick();assert.equal(c.mode,'pet');assert.equal(model.userData.heart.visible,true);assert.equal(model.userData.eyes[0].scale.y,.043*.10);assert.equal(model.position.x,c.x);assert.equal(model.position.z,c.z);
 }
 assert.equal(p.action('feather',c.id).ok,true);let sawPounce=false;
 for(let i=0;i<79;i++){
  const model=delayedTick(),experience=soloExperience({...c,until:c.until*1000},p.time*1000,p.room);
  assert.equal(experience.action,'feather');assert.equal(model.userData.heart.visible,false);assert.equal(model.position.x,c.x);assert.equal(model.position.z,c.z);
  if(experience.hunt.phase==='pounce'&&experience.hunt.progress>0&&experience.hunt.progress<1){assert.ok(model.position.y>0);sawPounce=true;}else assert.equal(model.position.y,0);
 }
 assert.ok(sawPounce);delayedTick();delayedTick();assert.equal(c.mode,'idle');assert.equal(f.scene.children.find(o=>o.userData.catId===c.id).position.y,0);
});

test('solo position and source time resume interpolation after delayed callbacks return to fifty milliseconds',()=>{
 const f=fixture(),p=new SoloPreview('moonlight');let wall=0;
 for(let n=0;n<6;n++){p.tick();wall++;f.world.update(p.snapshot(),p.player.id,wall);f.world.render(wall+.2);}
 let previousX;
 for(let n=0;n<4;n++){previousX=p.player.x;p.tick({x:-1,z:0});wall+=.05;f.world.update(p.snapshot(),p.player.id,wall);}
 f.world.render(wall+.125);const player=f.scene.children.find(o=>o.userData.limbs),cat=f.scene.children.find(o=>o.userData.catId==='cat-15');
 assert.ok(Math.abs(player.position.x-(previousX+p.player.x)/2)<1e-8,'receipt-time positions should interpolate again after a long delay');
 assert.ok(Math.abs(cat.userData.motion.output.presentationTime-(p.time*1000-25))<1e-7,'pose time must use the same interpolation bracket');
});

test('elapsed-time solo physics and rendered action expire together at the four-second callback without catch-up',()=>{
 for(const action of ['pet','feather','ball']){
  const f=fixture(),p=new SoloPreview('moonlight'),c=p.cats[15];assert.equal(p.action(action,c.id).ok,true);f.world.update(p.snapshot(),p.player.id,0);
  for(let wall=1;wall<=4;wall++){
   const old={...c};p.tick({x:0,z:0},.05,1);f.world.update(p.snapshot(),p.player.id,wall);f.world.render(wall+.2);const model=f.scene.children.find(o=>o.userData.catId===c.id);
   assert.ok(Math.hypot(c.x-old.x,c.z-old.z)<=2.4*.05+1e-9);assert.equal(model.position.x,c.x);assert.equal(model.position.z,c.z);
   if(wall<4){assert.equal(c.mode,action);assert.equal(model.userData.heart.visible,action==='pet');}
   else{assert.equal(c.mode,'idle');assert.equal(c.owner,null);assert.equal(model.userData.heart.visible,false);assert.equal(model.position.y,0);assert.equal(p.toys.length,0);}
  }
 }
});


test('actual camera zoom keeps both bounds after repeated touch-sized steps and does not rotate',()=>{
 const f=fixture(),focus=new Three.Vector3(0,0,1),distance=()=>f.camera.position.distanceTo(focus),before=distance(),yaw=f.world.yaw;
 const direction=f.camera.position.clone().sub(focus).normalize();
 f.world.zoom(-240);f.world.render(.1);assert.ok(Math.abs(distance()-(before-3.6))<1e-10);
 f.world.zoom(240);f.world.render(.2);assert.ok(Math.abs(distance()-before)<1e-10);
 for(let i=0;i<100;i++)f.world.zoom(-240);f.world.render(.3);assert.ok(Math.abs(distance()-12)<1e-10);
 for(let i=0;i<100;i++)f.world.zoom(240);f.world.render(.4);assert.ok(Math.abs(distance()-38*Math.SQRT2)<1e-10);
 assert.equal(f.world.yaw,yaw);assert.ok(f.camera.position.clone().sub(focus).normalize().distanceTo(direction)<1e-10);
});
