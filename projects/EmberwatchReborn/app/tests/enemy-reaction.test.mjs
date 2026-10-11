import test from 'node:test';
import assert from 'node:assert/strict';
import {createState,reduceRuntime} from '../src/state.js';
import {createBattle,stepBattle,acceptBattleInput} from '../src/combat.js';
import {poeControlPreset} from '../src/controls.js';
import {mapFromRegion} from '../src/world-geometry.js';
import {animationFrame} from '../src/visual.js';
function fixture({hp=1,type='guardian',poe=true}={}){
 let s=reduceRuntime(createState(),{type:'trainStarter',position:{x:260,y:325}}).state;
 if(poe)s=reduceRuntime(s,{type:'setControls',controls:poeControlPreset(s.options.controls)}).state;
 const b=createBattle(s);b.map=mapFromRegion({w:60,h:60});b.p.x=b.p.y=600;b.awaitingAdvance=false;
 const e={id:'reaction-target',kind:'scout',type,x:628,y:600,hp,max:hp,angle:Math.PI,active:true,state:'windup',timer:1,windupDuration:1,stun:0,moving:true,attackSpec:{damage:6,recovery:.8},telegraph:{phase:'windup',progress:0,shapes:[{type:'cone',x:628,y:600,r:45,angle:Math.PI,halfAngle:1}]}};b.enemies=[e];return {s,b,e,events:[]};
}
function tick(f,dt,input={}){const events=stepBattle(f.b,f.s.character,dt,input);f.events.push(...events);return events;}
function hit(f,hz=120){acceptBattleInput(f.b,{attack:true,attackPressed:true,aim:{x:900,y:600}});for(let i=0;i<hz&&!f.events.some(e=>e.type==='enemyHit');i++)tick(f,1/hz);assert.ok(f.events.some(e=>e.type==='enemyHit'));}
for(const hz of [30,60,120])for(const type of ['guardian','boss'])test(`${hz}Hz ${type}: lethal contact immediately ends old attack and selects a non-windup body`,()=>{
 const f=fixture({type});assert.equal(animationFrame(f.e,0),3);hit(f,hz);assert.equal(f.e.hp,0);assert.equal(f.e.dead,true);assert.equal(f.e.state,'dead');assert.equal(f.e.telegraph,null);assert.equal(f.e.moving,false);assert.notEqual(animationFrame(f.e,f.b.time),3);
 const deadAt=f.b.time;for(let t=0;t<1;t+=1/hz)tick(f,1/hz);assert.equal(f.e.deathTime,0);assert.equal(f.events.filter(e=>e.type==='defeated').length,1);assert.equal(f.events.filter(e=>e.type==='sound'&&e.name==='enemyRelease').length,0);assert.ok(deadAt<.3);
});
test('nonlethal contact records an immutable hit heading without cancelling the living windup',()=>{
 const f=fixture({hp:100});hit(f);assert.ok(f.e.hp>0);assert.equal(f.e.state,'windup');assert.ok(f.e.telegraph);assert.equal(f.e.stun,0);assert.equal(f.e.reaction?.angle,0);assert.ok(f.e.reaction?.remaining>0);f.b.p.angle=Math.PI;assert.equal(f.e.reaction.angle,0);
});
test('real stun selects a resting body instead of a stale walking or attack pose',()=>{
 const e={hp:100,active:true,moving:true,state:'windup',stun:.3};assert.equal(animationFrame(e,0),0);
});

import {enemyReactionPose,recordEnemyReaction,stepEnemyReaction,drawEnemyReaction,drawEnemyDeathFeedback,ENEMY_REACTION} from '../src/enemy-reaction.js';
import {ART} from '../src/art.js';
for(const type of ['guardian','boss'])test(`${type}: immediate buckle, independent torso fall, landing and fade without duplicate atlas frames`,()=>{
 const e={hp:0,dead:true,type,state:'windup',deathTime:.7,angle:0,reaction:{angle:0,facing:Math.PI}};
 const start=enemyReactionPose(e);assert.equal(start.state,'death');assert.equal(start.frame,0);assert.ok(start.upperAngle>0);assert.ok(start.legScaleY<1);assert.equal(start.facing,Math.PI);assert.equal(start.alpha,1);
 const samples=Array.from({length:16},(_,i)=>enemyReactionPose({...e,deathTime:.7-i*.04}));assert.ok(new Set(samples.map(p=>[p.upperAngle,p.legScaleY,p.alpha].join(':'))).size>10);assert.ok(samples.some(p=>p.land>.9));assert.ok(samples.at(-1).upperAngle>1.3);assert.ok(samples.at(-1).legScaleY<.25);assert.equal(enemyReactionPose({...e,deathTime:0}).alpha,0);assert.equal(e.state,'windup');
});
test('boss delays the fall but keeps exactly the existing .7-second lifetime',()=>{
 const e={hp:0,dead:true,deathTime:.55};const normal=enemyReactionPose(e),boss=enemyReactionPose({...e,type:'boss'});assert.ok(Math.abs(boss.upperAngle)<Math.abs(normal.upperAngle));assert.equal(ENEMY_REACTION.deathSeconds,.7);
});
for(const angle of [0,Math.PI/4,Math.PI/2,Math.PI,Math.PI*1.25,-Math.PI/2])test(`hit direction ${angle} projects the body response along its immutable source`,()=>{
 const e={hp:100,angle:Math.PI,state:'idle',stun:0,x:10,y:20};recordEnemyReaction(e,{angle,heavy:true,damage:10});stepEnemyReaction(e,.03);const before=structuredClone(e),p=enemyReactionPose(e),dx=Math.cos(angle)-Math.sin(angle);if(Math.abs(dx)>.1)assert.equal(Math.sign(p.rootX),Math.sign(dx));assert.equal(p.state,'hit');assert.deepEqual(e,before);stepEnemyReaction(e,1);assert.equal(enemyReactionPose(e).state,'none');assert.equal(e.stun,0);assert.equal(e.state,'idle');assert.equal(e.x,10);assert.equal(e.y,20);
});
test('zero damage makes no new body reaction; overlapping hits preserve the active envelope deadline',()=>{
 const e={hp:100,angle:0};recordEnemyReaction(e,{damage:0});assert.equal(e.reaction,undefined);recordEnemyReaction(e,{damage:1,angle:1});const first=e.reaction;stepEnemyReaction(e,.1);const remaining=e.reaction.remaining;recordEnemyReaction(e,{damage:1,angle:2});assert.notEqual(e.reaction,first);assert.equal(e.reaction.angle,2);assert.equal(e.reaction.remaining,remaining);assert.equal(e.reaction.duration,.18);
});
test('overlapping heavy and light hits never rewind phase or reduce active peak strength',()=>{
 const e={hp:100,angle:0};recordEnemyReaction(e,{damage:20,heavy:true});stepEnemyReaction(e,.08);const phase=enemyReactionPose(e).phase,remaining=e.reaction.remaining;
 for(let i=0;i<20;i++){recordEnemyReaction(e,{damage:1,heavy:false,angle:i*.1});assert.equal(e.reaction.heavy,true);assert.equal(e.reaction.remaining,remaining);assert.equal(enemyReactionPose(e).phase,phase);}
 stepEnemyReaction(e,remaining);assert.equal(enemyReactionPose(e).state,'none');recordEnemyReaction(e,{damage:2,angle:1});assert.equal(e.reaction.remaining,.18);assert.equal(e.reaction.heavy,false);
});
test('continuous positive hits cannot keep one reaction envelope alive beyond its original duration',()=>{
 const e={hp:100,angle:0};recordEnemyReaction(e,{damage:1});for(let i=0;i<17;i++){stepEnemyReaction(e,.01);recordEnemyReaction(e,{damage:1,heavy:i===3});}assert.ok(e.reaction.remaining<.011);assert.equal(e.reaction.duration,.18);stepEnemyReaction(e,.011);assert.equal(enemyReactionPose(e).state,'none');
});
test('death wins over actual stun and transient flinch, and stun wins over walking',()=>{
 const e={hp:0,dead:true,stun:10,moving:true,state:'windup',deathTime:.6,reaction:{remaining:.1,duration:.18,angle:0}};assert.equal(enemyReactionPose(e).state,'death');assert.equal(enemyReactionPose({...e,hp:10,dead:false}).state,'stun');assert.equal(enemyReactionPose({...e,hp:10,dead:false,stun:0}).state,'hit');
});
function record(){const calls=[],stack=[],state={globalAlpha:1};const ctx=new Proxy({save(){stack.push({...state});},restore(){Object.assign(state,stack.pop());},translate(...args){calls.push(['translate',...args]);},rotate(...args){calls.push(['rotate',...args]);},scale(...args){calls.push(['scale',...args]);},drawImage(...args){calls.push(['image',state.globalAlpha,...args]);},beginPath(){},ellipse(...args){calls.push(['ellipse',...args]);},fill(){calls.push(['fill',state.globalAlpha]);},fillRect(...args){calls.push(['rect',state.globalAlpha,...args]);}},{get:(o,k)=>k in o?o[k]:state[k],set:(_,k,v)=>(state[k]=v,true)});return {ctx,calls,stack};}
for(const flashScale of [0,1])test(`flash${flashScale} keeps articulated death geometry and balanced Canvas state`,()=>{
 const r=record(),e={hp:0,dead:true,type:'boss',deathTime:.35},p=enemyReactionPose(e),before=structuredClone(p);assert.equal(drawEnemyReaction(r.ctx,{},ART.enemy.frames[0],{x:50,y:100,k:.3,height:85,pose:p,flashScale,reduced:flashScale===0}),true);assert.equal(r.calls.filter(c=>c[0]==='image').length,4);assert.ok(r.calls.some(c=>c[0]==='rotate'&&Math.abs(c[1])>.4));assert.equal(r.stack.length,0);assert.deepEqual(p,before);
});
test('heavy live reaction uses at most one echo; windup and reduced flash suppress it',()=>{
 const e={hp:100,state:'idle',reaction:{remaining:.2,duration:.23,heavy:true,angle:0}},sample=(p,flashScale)=>{const r=record();drawEnemyReaction(r.ctx,{},ART.enemy.frames[0],{x:0,y:0,k:1,height:46,pose:p,flashScale});return r.calls.filter(c=>c[0]==='image').length;};assert.equal(sample(enemyReactionPose(e),1),2);assert.equal(sample(enemyReactionPose(e),0),1);assert.equal(sample(enemyReactionPose({...e,state:'windup'}),1),1);
});
test('five kills use bounded quiet ground feedback; flash0 suppresses all debris pixels',()=>{
 const effects=Array.from({length:5},(_,i)=>[{type:'enemyDeath',x:i*10,y:0,life:.2,max:.32},...Array.from({length:5},()=>({type:'particle',deathParticle:true,x:i*10,y:0,life:.2,max:.45,size:3,color:'#e9b071'}))]).flat(),before=structuredClone(effects),full=record(),low=record();drawEnemyDeathFeedback(full.ctx,effects,p=>p,1,{flashScale:1});drawEnemyDeathFeedback(low.ctx,effects,p=>p,1,{flashScale:0});assert.equal(full.calls.filter(c=>c[0]==='rect').length,25);assert.equal(low.calls.filter(c=>c[0]==='rect').length,0);assert.equal(low.calls.filter(c=>c[0]==='ellipse').length,5);assert.deepEqual(effects,before);assert.equal(full.stack.length,0);assert.equal(low.stack.length,0);
});

import {createVisualRenderer} from '../src/visual.js';
function renderCommands(scene){
 const calls=[],stack=[],state={globalAlpha:1,fillStyle:'#000',strokeStyle:'#000',filter:'none'};
 const methods={save(){stack.push({...state});},restore(){Object.assign(state,stack.pop());},beginPath(){},closePath(){},moveTo(){},lineTo(){},ellipse(){},fill(){calls.push({op:'fill',...state});},stroke(){calls.push({op:'stroke',...state});},fillRect(...args){calls.push({op:'rect',args,...state});},drawImage(...args){calls.push({op:'image',args,...state});},fillText(...args){calls.push({op:'text',args,...state});},translate(){},rotate(){},scale(){},clip(){},setLineDash(){},createRadialGradient(){return {addColorStop(){}};}};
 const ctx=new Proxy(methods,{get:(o,k)=>k in o?o[k]:state[k],set:(_,k,v)=>(state[k]=v,true)});
 createVisualRenderer(ctx,ART,{hero:{id:'hero'},enemy:{id:'enemy'}},{createCanvas:null}).render(scene);assert.equal(stack.length,0);return calls;
}
for(const flashScale of [0,1])test(`production renderer flash${flashScale}: five corpses and debris precede loot, danger and living feet`,()=>{
 const corpses=Array.from({length:5},(_,i)=>({id:'dead'+i,kind:'scout',type:i===0?'boss':'guardian',x:600+i*10,y:580,hp:0,max:10,active:true,dead:true,deathTime:.35,angle:Math.PI/4,state:'windup',telegraph:{phase:'windup',color:'#badbad',shapes:[{type:'circle',x:600,y:580,r:50}]}}));
 const live={id:'live',kind:'scout',type:'guardian',x:620,y:620,hp:10,max:10,active:true,angle:0,state:'windup',telegraph:{phase:'windup',color:'#f29187',progress:.5,locked:true,shapes:[{type:'circle',x:620,y:620,r:55}]}};
 const scene={width:900,height:650,map:mapFromRegion({w:40,h:40}),regionId:'ash_road',p:{x:600,y:600,hp:55,max:55,angle:0},entities:[...corpses,live],loot:[{x:600,y:580,type:'gold',bob:0}],effects:[{type:'enemyDeath',x:600,y:580,life:.2,max:.32}],time:1,cleanView:true,flashScale,reduced:flashScale===0};const before=structuredClone(scene),calls=renderCommands(scene),bodies=calls.filter(c=>c.op==='image'&&c.args[0].id==='enemy'),dead=bodies.filter(c=>c.args[2]>=13&&c.args[2]<302),danger=calls.filter(c=>c.op==='stroke'&&c.strokeStyle==='#f29187'),gold=calls.filter(c=>c.op==='rect'&&c.fillStyle==='#e8c07b'),hero=calls.filter(c=>c.op==='image'&&c.args[0].id==='hero');
 assert.equal(dead.length,20);assert.ok(danger.length&&gold.length&&hero.length);assert.ok(dead.every(c=>[...danger,...gold,...hero].every(after=>calls.indexOf(c)<calls.indexOf(after))));assert.equal(calls.some(c=>c.strokeStyle==='#badbad'),false);assert.equal(calls.some(c=>c.op==='rect'&&c.args[2]===26),false);assert.deepEqual(scene,before);
 const expired=renderCommands({...scene,entities:corpses.map(e=>({...e,deathTime:0}))});assert.equal(expired.some(c=>c.op==='image'&&c.args[0].id==='enemy'),false);
});

import {fixture as expertFixture,enemy as expertEnemy,cast as expertCast,until as expertUntil,seedFor} from './support/expert-fixture.mjs';
import {quoteAction} from '../src/combat.js';
test('persistent fire keeps its authored cast heading after the hero turns away',()=>{
 const f=expertFixture({trial_by_fire:1});const e=expertEnemy(f);expertCast(f,'judgement');expertUntil(f,()=>f.b.areas.length===1);expertUntil(f,()=>!f.b.p.action);const area=f.b.areas[0];let hit=false;for(let i=0;i<120&&!hit;i++){const events=stepBattle(f.b,f.s.character,1/120,{aim:{x:f.b.p.x-200,y:f.b.p.y}});hit=events.some(e=>e.type==='enemyHit'&&e.context.originSkillId==='judgement'&&e.context.procDepth===1);}assert.ok(hit);assert.equal(f.b.p.angle,Math.PI);assert.equal(e.reaction.angle,area.angle);assert.equal(e.reaction.angle,0);assert.equal(f.b.effects.findLast(e=>e.type==='impact').angle,0);
});
test('secondary critical explosion pushes a lateral target away from its impact origin',()=>{
 const f=expertFixture({flaming_wrath:1});const first=expertEnemy(f,{id:'a',x:360,y:300,hp:1}),second=expertEnemy(f,{id:'b',x:360,y:340});f.b.seed=seedFor(next=>next()<quoteAction(f.b,'righteous_hammer').offense.criticalChance);expertCast(f,'hammer');const events=expertUntil(f,()=>second.hp<second.max);assert.ok(events.some(e=>e.type==='enemyHit'&&e.id==='b'&&e.context.originSkillId==='flaming_wrath'));assert.equal(first.dead,true);assert.equal(second.reaction.angle,Math.PI/2);assert.equal(f.b.effects.findLast(e=>e.type==='impact').angle,Math.PI/2);
});

test('a lethal overlapping hit freezes the latest visible facing without restarting recoil',()=>{
 const enemy={hp:100,angle:0};recordEnemyReaction(enemy,{damage:1});stepEnemyReaction(enemy,.1);const remaining=enemy.reaction.remaining;enemy.angle=Math.PI/2;enemy.hp=0;enemy.dead=true;enemy.deathTime=.7;recordEnemyReaction(enemy,{damage:100,angle:Math.PI});assert.equal(enemy.reaction.remaining,remaining);assert.equal(enemyReactionPose(enemy).facing,Math.PI/2);assert.equal(enemy.reaction.angle,Math.PI);
});
