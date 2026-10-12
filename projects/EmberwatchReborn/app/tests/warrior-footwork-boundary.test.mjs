import test from 'node:test';
import assert from 'node:assert/strict';
import {reduceRuntime} from '../src/state.js';
import {poeControlPreset,enableSkillLoadout} from '../src/controls.js';
import {createBattle,acceptBattleInput,stepBattle} from '../src/combat.js';
import {resolveWarriorPresentation,warriorActionGait} from '../src/warrior-presentation.js';
import {mapFromRegion} from '../src/world-geometry.js';
import {earnedQuarryRoute} from './support/earned-quarry-route.mjs';
// Legal earned progression, then synthetic empty arena and direct production
// input handlers. Not browser play, actual Canvas pixels, or latency evidence.
let cached;
function fixture(version=4){
 if(!cached){let s=earnedQuarryRoute();for(const id of ['judgement','lay_on_hands']){if(!s.character.skills[id]){const r=reduceRuntime(s,{type:'purchaseSkill',skillId:id,position:{x:260,y:325}});assert.equal(r.ok,true,JSON.stringify(r));s=r.state;}}cached=s;}
 let s=structuredClone(cached),controls=poeControlPreset(s.options.controls);if(version===5)controls=enableSkillLoadout(controls,{skills:s.character.skills,actionSlots:s.actionSlots});
 const r=reduceRuntime(s,{type:'setControls',controls});assert.equal(r.ok,true);s=r.state;
 const b=createBattle(s);b.map=mapFromRegion({w:80,h:80});b.p.x=b.p.y=600;b.enemies=[];b.awaitingAdvance=false;return {s,b};
}
const held={attack:true,attackHeld:true,heldActions:{attack:true},move:{x:1,y:0},aim:{x:1100,y:600}};
const tick=(f,dt,input=held)=>stepBattle(f.b,f.s.character,dt,input);
function advance(f,time,input=held){for(let t=0;t<time-1e-10;){const dt=Math.min(1/120,time-t);tick(f,dt,input);t+=dt;}}
function presentation(f,direction=2){const before=JSON.stringify(f.b),r=resolveWarriorPresentation(f.b.p,f.b.time,direction);assert.equal(JSON.stringify(f.b),before,'presentation must not mutate movement/timing/resources');return r;}
for(const version of [4,5])for(const hz of [30,60,120])for(const next of ['mace_swing','judgement'])test(`footwork controls${version} ${hz}Hz mace recovery → ${next} renders current planted preparation despite earlier-frame movement`,()=>{
 const f=fixture(version);acceptBattleInput(f.b,{...held,attackPressed:true});const first=f.b.p.action.castId;let offered=false,transition=null;
 for(let n=0;n<100;n++){
  if(next==='judgement'&&!offered&&f.b.p.action.duration-f.b.p.action.elapsed<=.14){acceptBattleInput(f.b,{...held,judgement:true,pressedSkillId:'judgement'});assert.equal(f.b.skillIntent?.id,next);offered=true;}
  const x=f.b.p.x,events=tick(f,1/hz);
  if(f.b.p.action?.castId!==first){transition={dx:f.b.p.x-x,events};break;}
 }
 assert.ok(transition);assert.equal(f.b.p.action.id,next);assert.ok(f.b.p.action.elapsed<f.b.p.action.contact);
 assert.ok(transition.dx>0);assert.equal(f.b.p.moving,true,'keep aggregate recovery movement bookkeeping');assert.notEqual(warriorActionGait(f.b.p),null,'keep independent measured gait phase');
 const r=presentation(f);assert.equal(r.moving,false);assert.equal(r.legs,r.pose);assert.equal(r.gaitPhase,null);
 assert.equal(transition.events.filter(e=>e.type==='actionStarted'&&e.id===next).length,1);
 const x=f.b.p.x;tick(f,.01);assert.equal(f.b.p.x,x,'existing gameplay already plants this windup');assert.equal(presentation(f).moving,false);
});
for(const id of ['mace_swing','judgement'])test(`footwork ${id} permits actual walking recovery immediately after contact without a new lock`,()=>{
 const f=fixture();acceptBattleInput(f.b,{move:{x:1,y:0},aim:{x:1100,y:600},pressedSkillId:id,attack:id==='mace_swing',attackPressed:id==='mace_swing'});const a=f.b.p.action;
 advance(f,a.contact+.02,{move:{x:1,y:0},aim:{x:1100,y:600}});assert.equal(a.fired,true);assert.equal(f.b.p.moving,true);assert.ok(f.b.p.x>600);
 const r=presentation(f);assert.equal(r.moving,true);assert.equal(r.legs.action,'run');assert.notEqual(r.gaitPhase,null);assert.equal(f.b.p.action,a);
});
for(const id of ['righteous_hammer','lay_on_hands'])test(`footwork ${id} retains moving cast legs and independent upper-body clip before contact`,()=>{
 const f=fixture();acceptBattleInput(f.b,{pressedSkillId:id,aim:{x:1100,y:600}});const a=f.b.p.action;advance(f,.05,{move:{x:1,y:0},aim:{x:1100,y:600}});
 assert.ok(a.elapsed<a.contact);assert.ok(f.b.p.x>600);const r=presentation(f);assert.equal(r.moving,true);assert.equal(r.legs.action,'run');assert.equal(r.id,id);assert.equal(f.b.p.action,a);
});
test('footwork direction/upper action pose stay intact; stopped actor never invents running legs',()=>{
 const f=fixture();acceptBattleInput(f.b,{...held,attackPressed:true});tick(f,.01);for(let d=0;d<4;d++){const r=presentation(f,d);assert.equal(r.pose.direction,d);assert.equal(r.legs,r.pose);assert.equal(r.clip,'attack1');}
});
