import test from 'node:test';
import assert from 'node:assert/strict';
import {CAT_STYLE,sceneLayout,catMotion} from './world.js';
test('reference-inspired cat silhouette is plump, big-headed and short-footed with six original palettes',()=>{assert.ok(CAT_STYLE.body[0]>=.48);assert.ok(CAT_STYLE.head[0]/CAT_STYLE.body[0]>=.85);assert.ok(CAT_STYLE.foot[1]<=.13);assert.equal(CAT_STYLE.palettes.length,6);assert.equal(CAT_STYLE.outlineParts,4);assert.ok(CAT_STYLE.outlineScale<=1.04);});
test('floor area doubles exactly without doubling furniture dimensions',()=>{const l=sceneLayout();assert.ok(Math.abs(l.floorSize*l.floorSize/(26*26)-2)<1e-12);assert.equal(l.tableRadius,1.25);assert.equal(l.sofaWidth,2.6);assert.ok(Math.abs(l.tableAnchors[0].x-(-7*Math.SQRT2))<1e-12);assert.equal(l.cameraDistance,27*Math.SQRT2);});
test('recreated local avatars reuse the cached marker geometry across room switches',async()=>{const {readFile}=await import('node:fs/promises');const source=await readFile(new URL('./world.js',import.meta.url),'utf8');assert.match(source,/geometry\('player-marker',\(\)=>new T\.TorusGeometry\(\.45,\.035,8,24\)\)/);assert.doesNotMatch(source,/mesh\(new T\.TorusGeometry\(\.45/);});
test('original SD block-toy visitor has oversized head and short limbs',async()=>{const {PLAYER_STYLE}=await import('./world.js');assert.ok(PLAYER_STYLE.headRadius*2>PLAYER_STYLE.body[0]);assert.ok(PLAYER_STYLE.headHeight>=PLAYER_STYLE.body[1]);assert.ok(PLAYER_STYLE.legHeight<=.25);assert.ok(PLAYER_STYLE.armHeight<=.3);assert.equal(PLAYER_STYLE.remoteBatches,2);});
test('resting and petted cats stop their feet while walking cats have a gait',async()=>{const {catMotion}=await import('./world.js');assert.equal(catMotion('rest',false,1).stride,0);assert.equal(catMotion('pet',true,1).stride,0);assert.notEqual(catMotion('idle',true,1).stride,0);assert.equal(catMotion('idle',false,1).stride,0);assert.ok(catMotion('rest',false,1).headY<catMotion('idle',true,1).headY);});
test('coat markings use cached surface textures and never extra patch meshes',async()=>{const {readFile}=await import('node:fs/promises');const source=await readFile(new URL('./world.js',import.meta.url),'utf8');assert.match(source,/function coatMaterial/);assert.match(source,/new T\.DataTexture\(coatPixels/);assert.match(source,/texture\.colorSpace=T\.SRGBColorSpace/);assert.doesNotMatch(source,/ell\([^;\n]*palette\.(patch|second)/);});
test('pet feather and ball responses are distinct and reset at idle',async()=>{const {catMotion}=await import('./world.js');const pet=catMotion('pet',false,1),feather=catMotion('feather',true,1),ball=catMotion('ball',true,1),idle=catMotion('idle',false,1);assert.ok(pet.eyeOpen<1);assert.equal(pet.heart,true);assert.ok(feather.jump>=0&&feather.jump<=.4);assert.ok(ball.tailAmplitude>idle.tailAmplitude);assert.equal(idle.jump,0);assert.ok(idle.eyeOpen<=.05);assert.ok(idle.tailAmplitude<=.01);assert.ok(idle.bodyHeight<.45);assert.equal(idle.heart,false);});
test('room selection reset immediately hides old rings and reused cat IDs stay unselected',async()=>{const {createCatSelection}=await import('./world.js');const old={userData:{ring:{visible:false}}},cats=new Map([['cat-0',old]]),selection=createCatSelection(cats);selection.choose('cat-0');assert.equal(old.userData.ring.visible,true);selection.reset();assert.equal(selection.current,null);assert.equal(old.userData.ring.visible,false);const next={userData:{ring:{visible:false}}};cats.set('cat-0',next);assert.notEqual(selection.current,'cat-0');selection.choose('cat-0');assert.equal(next.userData.ring.visible,true);selection.reset();assert.equal(next.userData.ring.visible,false);});
test('room and clear lifecycle call selection reset and play ball uses cached contrast surface',async()=>{const {readFile}=await import('node:fs/promises');const {BALL_STYLE}=await import('./world.js');assert.ok(BALL_STYLE.radius>=.22&&BALL_STYLE.radius<=.26);const source=await readFile(new URL('./world.js',import.meta.url),'utf8');assert.match(source,/setRoom\(room\)\{selection.reset\(\)/);assert.match(source,/clear\(\)\{selection.reset\(\)/);assert.match(source,/geometry\('play-ball'/);assert.match(source,/vertexColors:true/);});
test('resumePresentation reseeds motion at current receipt time without clearing room selection or model maps',async()=>{const {readFile}=await import('node:fs/promises');const source=await readFile(new URL('./world.js',import.meta.url),'utf8');assert.match(source,/function resumePresentation\(state,id,receivedAt=performance\.now\(\)\/1000\)\{resetMotion\(\);update\(state,id,receivedAt\);\}/);assert.match(source,/return\{update,resumePresentation,render/);assert.match(source,/timeline\.authorityTime\(t\)-INTERPOLATION_DELAY/);assert.doesNotMatch(source,/let timelineOffset/);});

test('feather pose uses a single bounded action-relative pounce and stays grounded while watching',()=>{
 for(const phase of ['focus','stalk','pause','idle'])for(const t of [0,.2,1,9,100])assert.equal(catMotion('feather',false,t,'sleep',false,{phase,progress:.5}).jump,0);
 for(const progress of [0,.25,.5,.75,1]){const pose=catMotion('feather',true,19,'sleep',false,{phase:'pounce',progress});assert.ok(Math.abs(pose.jump-Math.sin(Math.PI*progress)*.24)<1e-10);}
 assert.equal(catMotion('feather',true,19,'sleep',true,{phase:'pounce',progress:.5}).jump,0);
});

test('legacy live feather keeps its existing pose until matching authority rollout',()=>{
 assert.equal(catMotion('feather',false,.2).jump,Math.max(0,Math.sin(.2*7))*.4);
 assert.equal(catMotion('feather',false,.2,'sleep',true).jump,0);
});

test('solo pet pose uses the exact three profile envelopes and reduced motion retains identity',async()=>{
 const {catPresentation}=await import('./world.js');
 for(const [id,eyes,nuzzle]of [['cat-0',.10,.055],['cat-1',.35,.020],['cat-2',.25,.035]])for(const reduced of [false,true]){
  const cat={id,mode:'pet',owner:'solo-you',until:4000},p=catPresentation(cat,false,999,1000,'sunroom',reduced,true);
  assert.equal(p.eyeOpen,eyes);assert.equal(p.nuzzle,reduced?0:Math.sin(2.5)*nuzzle);assert.equal(p.heart,true);assert.equal(p.jump,0);assert.equal(p.stride,0);
  assert.deepEqual(p,catPresentation(cat,false,1,1000,'sunroom',reduced,true),'solo reaction time must be the lease clock, not a new wall clock');
 }
});

test('solo routines and feather poses derive from policy while expired actions and live use no solo traits',async()=>{
 const {catPresentation}=await import('./world.js');const {soloExperience}=await import('./solo-experience.js');
 for(const room of ['sunroom','garden','moonlight'])for(let i=0;i<18;i++)for(const time of [0,1000,1550,2400,3000,4000,83000]){
  const cat={id:`cat-${i}`,mode:'feather',owner:'solo-you',until:4000},experience=soloExperience(cat,time,room),p=catPresentation(cat,false,.2,time,room,false,true);
  if(experience.hunt?.phase!=='pounce')assert.equal(p.jump,0);
  assert.ok(p.jump<=.24);assert.equal(catPresentation(cat,false,.2,time,room,true,true).jump,0);
  if(time>=4000)assert.equal(p.heart,false);
  assert.deepEqual(catPresentation(cat,false,.2,time,room,false,false),catMotion('feather',false,.2),'live always preserves original feather pose');
 }
 const idle={id:'cat-0',mode:'idle',owner:null,until:0};
 assert.equal(catPresentation(idle,false,0,83000,'sunroom',false,true).stretch,.07);
 assert.equal(catPresentation(idle,false,0,86000,'sunroom',false,true).stretch,0);
 assert.equal(catPresentation(idle,false,0,60000,'garden',false,true).eyeOpen,1);
 assert.equal(catPresentation(idle,false,0,36000,'moonlight',false,true).eyeOpen,.08);
 for(const action of ['pet','ball','feather'])assert.equal(catPresentation({...idle,mode:action,owner:'solo-you',until:4000},false,.2,4000,'sunroom',false,true).heart,false);
});

test('optional shared feather phase preserves default behavior while allowing solo focus duration',async()=>{
 const {tickFeather,featherPhase}=await import('../../shared/feather.mjs');
 for(let now=0;now<4100;now+=50){
  const a={id:'cat-0',x:0,z:0,yaw:1},b={...a};tickFeather(a,{x:1,z:1},4000,now,.05,()=>true);tickFeather(b,{x:1,z:1},4000,now,.05,()=>true,featherPhase(4000,now));assert.deepEqual(a,b);
 }
 const c={id:'cat-0',x:0,z:0,yaw:1},before={...c};tickFeather(c,{x:1,z:1},4000,500,.05,()=>true,{phase:'focus',progress:.5});assert.deepEqual(c,before);
});
