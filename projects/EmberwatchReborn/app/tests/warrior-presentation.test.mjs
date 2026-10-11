import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {configurePoeControls,acceptBattleInput,stepBattle} from '../src/combat.js';
import {poeControlPreset,enableSkillLoadout} from '../src/controls.js';
import {fixture} from './support/expert-fixture.mjs';
import {resolveWarriorPresentation,warriorActionGait,createWarriorPresentationRenderer} from '../src/warrior-presentation.js';
import {createWarriorRig,WARRIOR_RIG_LIMITS} from '../src/warrior-rig.js';
import {drawWarriorHammer} from '../src/warrior-projectile-presentation.js';
import {MOTION_CLIPS,motionSamplePhase,createMotionRenderer} from '../src/motion.js';
const ids=['mace_swing','righteous_hammer','lay_on_hands','judgement','battle_banner','shield_charge'];
const expected={mace_swing:'attack1',righteous_hammer:'axes',lay_on_hands:'warcry',judgement:'attack3',battle_banner:'warcry',shield_charge:'dodge'};
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
function setup(){const f=fixture({lay_on_hands:1,judgement:1,battle_banner:1});configurePoeControls(f.b,enableSkillLoadout(poeControlPreset(f.s.options.controls),{skills:f.s.character.skills,actionSlots:f.s.actionSlots}));return f;}
function start(f,id){return acceptBattleInput(f.b,{pressedSkillId:id,aim:{x:f.b.p.x+100,y:f.b.p.y}});}
function advance(f,t,input={}){for(let s=0;s<t-1e-10;){const dt=Math.min(1/120,t-s);stepBattle(f.b,f.s.character,dt,input);s+=dt;}}
function context(){
 const calls=[],stack=[],state={globalAlpha:1,globalCompositeOperation:'source-over'};
 const record=(op,...args)=>{calls.push({op,args,...state});for(const arg of args)if(typeof arg==='number')assert.ok(Number.isFinite(arg));};
 const methods={calls,save(){stack.push({...state});},restore(){assert.ok(stack.length);Object.assign(state,stack.pop());},get stackDepth(){return stack.length;}};
 for(const op of ['drawImage','translate','rotate','scale','beginPath','moveTo','lineTo','closePath','rect','clip','clearRect','stroke','fill','fillRect'])methods[op]=(...args)=>record(op,...args);
 return new Proxy(methods,{get:(t,k)=>k in t?t[k]:state[k],set:(_,k,v)=>(state[k]=v,true)});
}
function surfaces(){const made=[];return {made,createCanvas(w,h){const ctx=context(),c={width:w,height:h,getContext:()=>ctx};made.push(c);return c;}};}
for(const id of ids)for(let direction=0;direction<4;direction++)test(`${id} real contact selects expected articulated pose d${direction}`,()=>{
 const f=setup();start(f,id);const a=f.b.p.action;advance(f,a.contact);const before=JSON.stringify(f.b),r=resolveWarriorPresentation(f.b.p,f.b.time,direction);
 assert.equal(r.clip,expected[id]);assert.equal(r.pose.direction,direction);assert.equal(JSON.stringify(f.b),before);
 if(id!=='shield_charge')near(r.phase,MOTION_CLIPS[r.clip].contact);
 const keys=['bodyAngle','weaponAngle','weaponElbow','shieldAngle','leftFootX','rightFootY'];for(const k of keys)assert.ok(Number.isFinite(r.pose[k]));
});
for(const id of ids)for(let direction=0;direction<4;direction++)test(`${id} has 24 distinct joint samples excluding root and alpha d${direction}`,()=>{
 const f=setup();start(f,id);const action=f.b.p.action,clip=expected[id],contact=MOTION_CLIPS[clip].contact;const signatures=new Set();
 for(let frame=0;frame<24;frame++){
  const source=motionSamplePhase(clip,frame),ratio=action.contact/action.duration,phase=contact===undefined?source:source<=contact?source/contact*ratio:ratio+(source-contact)/(1-contact)*(1-ratio);
  const r=resolveWarriorPresentation({...f.b.p,action:{...action,phase,elapsed:phase*action.duration}},0,direction);
  assert.equal(r.frame,frame);signatures.add(['bodyAngle','headAngle','weaponAngle','weaponElbow','shieldAngle','clothAngle','leftFootX','rightFootX','leftKnee','rightKnee'].map(k=>(r.pose[k]??0).toFixed(5)).join(','));
 }assert.equal(signatures.size,24);
});
for(const id of ['mace_swing','righteous_hammer','lay_on_hands','judgement','battle_banner'])test(`${id} moving real handler keeps upper action and independent distance-driven legs`,()=>{
 const f=setup();start(f,id);const a=f.b.p.action;advance(f,.35,{move:{x:1,y:0},aim:{x:1000,y:f.b.p.y}});const frozen=structuredClone(f.b.p);const p=resolveWarriorPresentation(f.b.p,f.b.time,2);
 assert.equal(p.moving,true);assert.equal(p.legs.action,'run');assert.equal(p.clip,expected[id]);assert.notEqual(p.gaitPhase,0);assert.equal(f.b.p.walkPhase,0,'legacy footstep phase contract is preserved');assert.equal(f.b.p.action,a);assert.deepEqual(f.b.p,frozen);
 const prior=p.gaitPhase;advance(f,.015,{move:{x:1,y:0}});assert.notEqual(resolveWarriorPresentation(f.b.p,f.b.time,2).gaitPhase,prior);
});
test('stopped/wall-blocked/dead motion never invents leg travel or writes gait',()=>{
 for(const actor of [{hp:100,moving:false,walk:4},{hp:0,moving:true,walk:4},{hp:100,moving:true,walk:NaN}])assert.equal(warriorActionGait(actor),null);
 const f=setup();start(f,'righteous_hammer');const before=JSON.stringify(f.b.p);for(let i=0;i<100;i++)resolveWarriorPresentation(f.b.p,10+i,2);assert.equal(JSON.stringify(f.b.p),before);assert.equal(warriorActionGait(f.b.p),null);
});
test('same traveled distance gives same gait across 30/60/120 Hz',()=>{const rows=[];for(const hz of [30,60,120]){const f=setup();start(f,'battle_banner');for(let n=0;n<hz*.4;n++)stepBattle(f.b,f.s.character,1/hz,{move:{x:1,y:0}});rows.push(warriorActionGait(f.b.p));}near(rows[0],rows[1]);near(rows[1],rows[2]);});
test('pure guard requires real block, protects dead and mobility overrides',()=>{
 assert.equal(resolveWarriorPresentation({hp:100,block:false},0,2),null);assert.equal(resolveWarriorPresentation({hp:0,block:true},0,2),null);
 const guard=resolveWarriorPresentation({hp:100,block:true,moving:false},0,2);assert.equal(guard.id,'shield_block');assert.ok(guard.pose.shieldY<0);assert.equal(guard.pose.shieldX,undefined,'source occluded body is not exposed by translating shield pixels');
 const f=setup();start(f,'mace_swing');assert.equal(resolveWarriorPresentation(f.b.p,0,2,{action:'dodge',phase:.5}),null);
});
test('hammer leaves hand at real release while healing never throws an axe',()=>{
 const f=setup();start(f,'righteous_hammer');assert.equal(resolveWarriorPresentation(f.b.p,0,2).weapon,'hammer');advance(f,f.b.p.action.contact);assert.equal(resolveWarriorPresentation(f.b.p,0,2).weapon,'none');assert.equal(f.b.shots.length,1);
 const heal=setup();start(heal,'lay_on_hands');advance(heal,heal.b.p.action.contact);assert.equal(resolveWarriorPresentation(heal.b.p,0,2).weapon,'none');assert.equal(heal.b.shots.length,0);
});
test('rig caches only bounded four-direction cutouts and preserves Canvas stack',()=>{
 const f=setup();start(f,'judgement');advance(f,.2);const cs=surfaces(),rig=createWarriorRig({complete:true,width:1248,height:1248},cs);
 for(let i=0;i<20;i++)for(let d=0;d<4;d++){const p=resolveWarriorPresentation(f.b.p,0,d);assert.ok(rig.render(p.pose,p));}
 assert.equal(rig.metrics().directions,4);assert.ok(rig.metrics().pixels<WARRIOR_RIG_LIMITS.maxMaskPixels);assert.equal(rig.metrics().rendered,80);assert.equal(rig.metrics().disabled,false);for(const c of cs.made)assert.equal(c.getContext().stackDepth,0);
});
test('hero renderer falls back without source/canvas and never draws enemy classes',()=>{
 const f=setup();start(f,'judgement');const ctx=context(),cs=surfaces();assert.equal(createWarriorPresentationRenderer(ctx,{},cs).draw({actor:f.b.p,player:true}),false);
 assert.equal(createWarriorPresentationRenderer(ctx,{hero:{}},{}).draw({actor:f.b.p,player:true}),false);
 const renderer=createWarriorPresentationRenderer(ctx,{hero:{complete:true}},cs);assert.equal(renderer.draw({actor:f.b.p,player:false}),false);assert.equal(renderer.draw({actor:f.b.p,player:true,classId:'mage'}),false);assert.ok(renderer.draw({actor:f.b.p,player:true}));assert.equal(ctx.stackDepth,0);
});
for(const flashScale of [0,.5,1])for(const leg of ['outward','return'])test(`actual hammer silhouette follows ${leg} velocity, respects flash ${flashScale}, no state mutation`,()=>{
 const shot={kind:'hammer',enemy:false,life:.7,x:90,y:80,vx:leg==='return'?-560:560,vy:0,age:.1,leg},before=structuredClone(shot),ctx=context();assert.ok(drawWarriorHammer(ctx,shot,{project:p=>({x:p.x-p.y,y:(p.x+p.y)*.53}),zoom:1.26,flashScale}));assert.deepEqual(shot,before);assert.equal(ctx.stackDepth,0);assert.ok(ctx.calls.filter(c=>c.op==='fillRect').length===(flashScale?3:1),'only the gem remains at flash0; no decorative glints');assert.ok(ctx.calls.every(c=>c.globalCompositeOperation==='source-over'));
 const moves=ctx.calls.filter(c=>c.op==='moveTo'),lines=ctx.calls.filter(c=>c.op==='lineTo');assert.ok(moves.length&&lines.length);assert.ok(Math.hypot(moves[0].args[0]-lines[0].args[0],moves[0].args[1]-lines[0].args[1])<26,'wake remains local');
});
test('hammer renderer ignores hostile/expired/nonfinite shots and has finite stationary fallback',()=>{
 for(const s of [{kind:'arrow'},{kind:'hammer',enemy:true},{kind:'hammer',life:0},{kind:'hammer',life:1,x:NaN,y:0,vx:0,vy:0}])assert.equal(drawWarriorHammer(context(),s,{project:p=>p}),false);
 assert.ok(drawWarriorHammer(context(),{kind:'hammer',life:1,x:0,y:0,vx:0,vy:0},{project:p=>p}));
});
test('full production renderer contains bounded hero and actual projectile routes',()=>{
 const source=readFileSync(new URL('../src/visual.js',import.meta.url),'utf8');assert.ok(source.includes('warriorRenderer.draw({actor:a,player:true'));assert.ok(source.includes('drawWarriorHammer(ctx,b,{project:toScreen'));assert.ok(source.includes('shake=0'));assert.ok(source.includes('state.flashScale??1,reduced'));
});

for(const hurtTime of [.24,.12,.001])test(`guard hurt ${hurtTime} preserves existing atlas recoil and actor state`,()=>{
 const actor={hp:100,classId:'warrior',block:true,hurtTime,moving:false},before=structuredClone(actor),ctx=context(),cs=surfaces();
 assert.equal(resolveWarriorPresentation(actor,1,2),null);const rig=createWarriorPresentationRenderer(ctx,{hero:{complete:true}},cs);assert.equal(rig.draw({actor,player:true}),false);
 const fallback=createMotionRenderer(ctx,{}, {motion:{hero:{complete:true}}}).draw({actor,player:true});assert.equal(fallback.action,'hurt');near(fallback.phase,1-hurtTime/.24);assert.deepEqual(actor,before);assert.equal(ctx.stackDepth,0);
});
for(const direction of [1,-1])test(`real held-guard projectile contact from ${direction} keeps hurt presentation priority`,()=>{
 const f=setup(),p=f.b.p;p.angle=Math.PI;f.b.shots.push({kind:'arrow',enemy:true,x:p.x,y:p.y,vx:direction*100,vy:0,damage:10,life:1});
 const events=stepBattle(f.b,f.s.character,.01,{block:true,aim:{x:p.x-100,y:p.y}});assert.ok(events.some(e=>e.type==='heroHurt'));assert.ok(p.hurtTime>0);assert.equal(p.block,true);assert.equal(p.action,null);assert.equal(resolveWarriorPresentation(p,f.b.time,1),null);
 const before=structuredClone(p),ctx=context();assert.equal(createMotionRenderer(ctx,{}, {motion:{hero:{complete:true}}}).draw({actor:p,player:true}).action,'hurt');assert.deepEqual(p,before);
});
