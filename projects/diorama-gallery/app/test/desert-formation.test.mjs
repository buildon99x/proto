import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {toolkit} from '../../.agents/skills/diorama-worlds/kit/world.js';

const source=new URL('../src/desert-formation.js',import.meta.url);
const load=async()=>{assert.ok(existsSync(source),'the independent desert formation module exists');return import(source);};
const T=toolkit({}).THREE;
const near=(a,b,message)=>assert.ok(Math.abs(a-b)<1e-9,message??`${a} differs from ${b}`);
const matrixNear=(a,b)=>a.elements.forEach((v,i)=>near(v,b.elements[i]));

test('formation exposes frozen named stages with a completed hold before 120 seconds',async()=>{
 const {FORMATION_DURATION,FORMATION_STAGES,formationAt}=await load();
 assert.equal(FORMATION_DURATION,120);
 assert.deepEqual(FORMATION_STAGES.map(s=>s.id),['terrain','river','oasis','settlement','pyramids','temples','life']);
 assert.deepEqual(FORMATION_STAGES.map(s=>[s.start,s.end]),[[0,18],[12,30],[24,46],[38,70],[58,90],[78,104],[96,114]]);
 assert.ok(Object.isFrozen(FORMATION_STAGES)&&FORMATION_STAGES.every(Object.isFrozen));
 const first=formationAt(0),last=formationAt(120),hold=formationAt(115);
 assert.equal(first.progress,0);assert.ok(Object.values(first.stages).every(v=>v===0));
 assert.equal(last.time,120);assert.equal(last.progress,1);assert.equal(last.complete,true);assert.equal(last.stage,'complete');
 assert.ok(Object.values(last.stages).every(v=>v===1));assert.ok(Object.values(hold.stages).every(v=>v===1));
 assert.equal(formationAt(50).stage,'settlement');assert.equal(formationAt(-20).time,0);assert.equal(formationAt(900).time,120);
});

test('absolute-time stages are monotonic, eased and independent of evaluation order',async()=>{
 const {FORMATION_STAGES,formationAt,formationProgress}=await load();
 for(const stage of FORMATION_STAGES){
  assert.equal(formationProgress(stage.start,stage.id),0);assert.equal(formationProgress(stage.end,stage.id),1);
  let previous=0;for(let t=0;t<=120;t+=.125){const p=formationProgress(t,stage.id);assert.ok(p>=previous&&p>=0&&p<=1);previous=p;}
  const epsilon=.001;assert.ok(formationProgress(stage.start+epsilon,stage.id)<1e-8);assert.ok(1-formationProgress(stage.end-epsilon,stage.id)<1e-8);
 }
 const snapshot=formationAt(67.25);for(const t of [120,0,80,12,114,8])formationAt(t);assert.deepEqual(formationAt(67.25),snapshot);
 assert.deepEqual(formationAt(30,{duration:60}).stages,formationAt(60).stages);
});

test('staggered construction sites start in a stable order and all finish inside their stage',async()=>{
 const {formationProgress}=await load();
 const sites=Array.from({length:5},(_,index)=>({index,count:5,stagger:.55}));
 const at=t=>sites.map(options=>formationProgress(t,'settlement',options));
 assert.ok(at(48)[0]>at(48)[1]&&at(48)[1]>at(48)[4]);
 assert.deepEqual(at(38),[0,0,0,0,0]);assert.deepEqual(at(70),[1,1,1,1,1]);
 for(let t=38;t<=70;t+=.125){const values=at(t);for(let i=1;i<values.length;i++)assert.ok(values[i-1]>=values[i]);}
 assert.equal(formationProgress(54,'settlement',{count:1,index:0,stagger:.9}),.5);
});

test('formation rejects invalid times, durations, tracks and construction-site options',async()=>{
 const {formationAt,formationProgress,createFormationClock}=await load();
 for(const value of [NaN,Infinity,-Infinity,'20'])assert.throws(()=>formationAt(value),/finite/i);
 for(const duration of [0,-1,NaN,Infinity])assert.throws(()=>formationAt(10,{duration}),/duration/i);
 assert.throws(()=>formationProgress(20,'unknown'),/stage/i);
 for(const options of [{count:0},{index:-1},{count:2,index:2},{count:1.5},{stagger:1},{stagger:-.1},{stagger:NaN}])assert.throws(()=>formationProgress(30,'river',options));
 assert.throws(()=>createFormationClock({speed:0}),/speed/i);
});

test('formation clock pauses, resumes, seeks, resets, changes speed and holds its completed state',async()=>{
 const {createFormationClock}=await load();const clock=createFormationClock();
 assert.equal(clock.update(50).time,0);assert.equal(clock.update(50).playing,false);
 clock.play(50);assert.equal(clock.update(75).time,25);assert.equal(clock.pause(80).time,30);assert.equal(clock.update(200).time,30);
 clock.play(200);assert.equal(clock.update(215).time,45);clock.setSpeed(2,215);assert.equal(clock.update(220).time,55);
 clock.seek(10,220);assert.equal(clock.update(225).time,20);
 const reset=clock.reset(230);assert.equal(reset.time,0);assert.equal(reset.playing,false);assert.equal(reset.speed,2);
 clock.play(300);const end=clock.update(400);assert.equal(end.time,120);assert.equal(end.playing,false);assert.equal(end.complete,true);
 assert.equal(clock.update(9999).time,120);assert.equal(clock.play(10000).time,0);assert.equal(clock.update(10005).time,10);
});

test('clock results do not depend on frame count, and two instances never share playback state',async()=>{
 const {createFormationClock}=await load();const a=createFormationClock({playing:true}),b=createFormationClock({playing:true}),c=createFormationClock({duration:60});
 for(let now=0;now<=80;now+=.1)a.update(now);assert.deepEqual(a.update(80),b.update(80));
 a.pause(80);a.seek(15,100);assert.equal(b.update(100).time,100);assert.equal(a.update(100).time,15);
 c.reset(20,{play:true});assert.equal(c.update(40).time,20);assert.equal(c.update(90).time,60);assert.equal(c.update(90).playing,false);
 const before=b.update(101);assert.throws(()=>b.setSpeed(Infinity,101),/speed/i);assert.throws(()=>b.seek(NaN,101),/finite/i);assert.throws(()=>b.pause(NaN),/finite/i);assert.deepEqual(b.update(101),before);
});

test('group binding preserves a rotated local anchor and restores the exact authored transform',async()=>{
 const {bindFormationGroup}=await load();const root=new T.Group();root.position.set(3,-.038,-2);root.rotation.set(.1,.4,-.2);root.scale.set(2,1.4,.8);root.updateMatrix();
 const baseline=root.matrix.clone(),anchor=new T.Vector3(.3,-.4,.2),fixed=root.localToWorld(anchor.clone()),binding=bindFormationGroup(root,'pyramids',{anchor:anchor.toArray()});
 assert.equal(binding.dynamicRoot,root);assert.equal(binding.apply(0),0);assert.deepEqual(root.scale.toArray(),[0,0,0]);
 for(const t of [59,65,74,89,58,70]){binding.apply(t);root.updateMatrixWorld(true);near(root.localToWorld(anchor.clone()).distanceTo(fixed),0);}
 binding.apply(90);matrixNear(root.matrix,baseline);binding.apply(65);binding.restore();matrixNear(root.matrix,baseline);
 root.visible=false;binding.apply(120);assert.equal(root.visible,false,'visibility is owned by the renderer, never by the formation binding');
});

test('growth is continuous at zero for flat ground details, with uniform and xz variants',async()=>{
 const {bindFormationGroup}=await load();
 for(const axis of ['y','uniform','xz']){const group=new T.Group(),binding=bindFormationGroup(group,'river',{axis});
  binding.apply(12);assert.deepEqual(group.scale.toArray(),[0,0,0]);binding.apply(12.001);assert.ok(Math.max(...group.scale.toArray())<1e-6);
  binding.apply(21);if(axis==='y'){assert.equal(group.scale.x,1);near(group.scale.y,.5);}if(axis==='uniform')group.scale.toArray().forEach(v=>near(v,.5));if(axis==='xz'){near(group.scale.x,.5);assert.equal(group.scale.y,1);near(group.scale.z,.5);}
  binding.apply(30);assert.deepEqual(group.scale.toArray(),[1,1,1]);
 }
 assert.throws(()=>bindFormationGroup(new T.Mesh(),'river'),/group/i);
 assert.throws(()=>bindFormationGroup(new T.Group(),'river',{axis:'z'}),/axis/i);
 assert.throws(()=>bindFormationGroup(new T.Group(),'river',{anchor:[0,NaN,0]}),/anchor/i);
});

test('actual toolkit batches hide zero-progress instances and keep static unrelated uploads unchanged',async()=>{
 const {bindFormationGroup}=await load();const scene=new T.Group(),W=toolkit(scene),timed=W.group(2,-.038,0),fixed=W.group(-3,0,0);
 const moving=[W.box(1,2,1,'#aaaaaa',0,1,0,timed),W.box(1,1,1,'#aaaaaa',1,.5,0,timed)];
 W.box(1,1,1,'#aaaaaa',0,.5,0,fixed);W.box(1,1,1,'#aaaaaa',1,.5,0,fixed);scene.updateMatrixWorld(true);const baseline=moving.map(o=>o.matrixWorld.clone());
 const binding=bindFormationGroup(timed,'settlement');binding.apply(0);W.batch({staticScene:true,dynamicRoots:[binding.dynamicRoot]});W.updateBatches();
 const batches=scene.children.filter(o=>o.isInstancedMesh),dynamic=batches.find(b=>b.instanceMatrix.usage===T.DynamicDrawUsage),stationary=batches.find(b=>b!==dynamic);assert.ok(dynamic&&stationary);assert.equal(timed.matrixAutoUpdate,true);
 const matrix=new T.Matrix4();for(let i=0;i<dynamic.count;i++){dynamic.getMatrixAt(i,matrix);assert.equal(new T.Vector3().setFromMatrixScale(matrix).length(),0);}
 const version=stationary.instanceMatrix.version;binding.apply(55);W.updateBatches();dynamic.getMatrixAt(0,matrix);assert.ok(new T.Vector3().setFromMatrixScale(matrix).length()>0);
 binding.apply(70);W.updateBatches();for(let i=0;i<dynamic.count;i++){dynamic.getMatrixAt(i,matrix);matrix.elements.forEach((v,k)=>assert.ok(Math.abs(v-baseline[i].elements[k])<1e-6));}
 assert.ok(moving.every(o=>!o.visible),'batch originals are never made visible again');assert.equal(stationary.instanceMatrix.version,version);W.dispose();
});

test('independent wrappers leave moving boat poses and shared geometry/materials untouched',async()=>{
 const {bindFormationGroup}=await load();const scene=new T.Group(),W=toolkit(scene),a=W.group(),b=W.group(),boat=W.group(1,-.015,4,a),mesh=W.box(.2,.5,.7,'#c0ab89',0,.25,0,boat);
 const geometry=mesh.geometry,material=mesh.material,first=bindFormationGroup(a,'life'),second=bindFormationGroup(b,'life');
 first.apply(100);second.apply(120);assert.notEqual(a.scale.y,b.scale.y);
 const pose=()=>[...boat.position.toArray(),...boat.quaternion.toArray(),...boat.scale.toArray()];boat.position.set(2,-.015,-3);boat.rotation.y=1.2;const authoredPose=pose();
 for(const t of [96,100,114,120,0,112])first.apply(t);assert.deepEqual(pose(),authoredPose);assert.equal(mesh.geometry,geometry);assert.equal(mesh.material,material);W.dispose();
});

test('near-completion floating point never overshoots the promised progress range',async()=>{
 const {formationProgress}=await load();
 const p=formationProgress(38+32*.99999999,'settlement');assert.ok(p<=1&&p>=0,'quintic roundoff is clamped to its promised range');
});

test('caller-owned options cannot move the captured local pivot',async()=>{
 const {bindFormationGroup}=await load();
 const group=new T.Group(),anchor=[.3,-.4,.2];group.position.set(2,3,4);group.rotation.y=.4;group.scale.set(2,1.3,.7);const fixed=group.localToWorld(new T.Vector3(...anchor));
 const binding=bindFormationGroup(group,'settlement',{anchor});anchor.fill(900);binding.apply(54);near(group.localToWorld(new T.Vector3(.3,-.4,.2)).distanceTo(fixed),0,'binding captures its local anchor rather than borrowing a mutable array');
});
