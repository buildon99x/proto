import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createState,reduceRuntime} from '../src/state.js';
import {createBattle,stepBattle,acceptBattleInput} from '../src/combat.js';
import {poeControlPreset} from '../src/controls.js';
import {mapFromRegion} from '../src/world-geometry.js';
import {projectWorld} from '../src/visual.js';
import {enemyReactionPose} from '../src/enemy-reaction.js';

// Cross-module regression: production collision -> reaction metadata -> audio
// delivery. Audio calls are probes; no speaker-output or visual acceptance.
function delivery(audio,battle){
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 const start=main.indexOf('function deliverCombatAudio('),end=main.indexOf('\nfunction deliverCombatEvents(',start);
 assert.ok(start>=0&&end>start);
 return new Function('audio','battle','projectWorld',`${main.slice(start,end)};return deliverCombatAudio;`)(audio,battle,projectWorld);
}
function fixture(){
 let state=reduceRuntime(createState(),{type:'trainStarter',position:{x:260,y:325}}).state;
 state=reduceRuntime(state,{type:'setControls',controls:poeControlPreset(state.options.controls)}).state;
 const battle=createBattle(state);battle.map=mapFromRegion({w:60,h:60});battle.p.x=battle.p.y=600;battle.awaitingAdvance=false;
 const enemy={id:'integrated-target',kind:'scout',type:'guardian',x:628,y:600,hp:1,max:1,angle:Math.PI,active:true,state:'windup',timer:1,windupDuration:1,stun:0,moving:true,attackSpec:{damage:6,recovery:.8},telegraph:{phase:'windup',progress:0,shapes:[{type:'cone',x:628,y:600,r:45,angle:Math.PI,halfAngle:1}]}};
 battle.enemies=[enemy];return {state,battle,enemy};
}
for(const hz of [30,60,120])for(const skill of ['attack','hammer','charge'])test(`${hz}Hz ${skill}: ${skill==='charge'?'zero-damage stun':'lethal contact'} shares collision/audio identity`,()=>{
 const {state,battle,enemy}=fixture(),calls=[];
 const deliver=delivery({cancel:tag=>calls.push({type:'cancel',tag}),play:(name,options)=>{calls.push({kind:'play',name,...options});return true;}},battle);
 const events=acceptBattleInput(battle,{[skill]:true,attackPressed:skill==='attack',aim:{x:900,y:600}});let hit=null;
 for(let i=0;i<hz&&!hit;i++){
  const next=stepBattle(battle,state.character,1/hz,{});events.push(...next);hit=next.find(e=>e.type==='enemyHit');
 }
 assert.ok(hit);for(const e of events)deliver(e);
 const sound=events.find(e=>e.type==='sound'&&e.phase==='impact');
 assert.ok(sound);assert.equal(sound.castId,hit.context.castId);assert.equal(sound.hitId,hit.context.hitId);assert.equal(sound.tag,`impact:${hit.context.hitId}`);
 if(skill==='charge'){
  // The preserved unaugmented charge has zero damage and real stun. Never
  // invent a death/recoil just to satisfy presentation expectations.
  assert.equal(hit.rawDamage,0);assert.equal(enemy.hp,1);assert.ok(enemy.stun>0);assert.equal(enemy.reaction,undefined);assert.equal(enemyReactionPose(enemy).state,'stun');assert.equal(events.some(e=>e.type==='defeated'),false);assert.ok(calls.some(e=>e.type==='cancel'&&e.tag==='enemy:integrated-target'));assert.equal(battle.effects.find(e=>e.type==='impact').angle,0);assert.equal(calls.filter(e=>e.kind==='play'&&e.phase==='impact').length,1);return;
 }
 assert.equal(enemy.hp,0);assert.equal(enemy.state,'dead');assert.equal(enemy.telegraph,null);assert.equal(enemy.attackSpec,null);
 assert.equal(enemyReactionPose(enemy).state,'death');assert.ok(Math.abs(enemy.reaction.angle)<1e-8);
 const impact=battle.effects.find(e=>e.type==='impact');assert.equal(impact.angle,enemy.reaction.angle);
 assert.equal(events.filter(e=>e.type==='defeated').length,1);assert.ok(calls.some(e=>e.type==='cancel'&&e.tag==='enemy:integrated-target'));
 const played=calls.filter(e=>e.kind==='play'&&e.phase==='impact');assert.equal(played.length,1);assert.equal(played[0].hitId,hit.context.hitId);
 const before=structuredClone(enemy);enemyReactionPose(enemy);assert.deepEqual(enemy,before,'render sampling must not mutate enemy');
 for(let i=0;i<hz;i++){const next=stepBattle(battle,state.character,1/hz,{});events.push(...next);for(const e of next)deliver(e);}
 assert.equal(events.filter(e=>e.type==='defeated').length,1);assert.equal(events.filter(e=>e.type==='enemyHit').length,1);assert.equal(events.filter(e=>e.type==='sound'&&e.name==='enemyRelease').length,0);assert.equal(enemy.deathTime,0);
 assert.equal(battle.seed,battle.seed>>>0);assert.equal(battle.p.action,null);
});
