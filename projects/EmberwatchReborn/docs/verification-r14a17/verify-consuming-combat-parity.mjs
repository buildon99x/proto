import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const base='/workspace/shared/emberwatch-frame-stall-diagnostics/app/src/';
const candidate=new URL('../../app/src/',import.meta.url).pathname;
const oldCombat=await import(base+'combat.js'),newCombat=await import(candidate+'combat.js');
const {createState,reduceRuntime}=await import(base+'state.js');
const {poeControlPreset}=await import(base+'controls.js');
const {mapFromRegion}=await import(base+'world-geometry.js');
const {freezeOwnedSnapshot}=await import(candidate+'immutable-snapshot.js');
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
function fixture(combat,state){
 // Exact existing combat-presentation-integration.test.mjs boundary fixture:
 // synthetic close 1-HP target and open map, not a normal-play/loot fixture.
 const battle=combat.createBattle(state);battle.map=mapFromRegion({w:60,h:60});battle.p.x=battle.p.y=600;battle.awaitingAdvance=false;
 battle.enemies=[{id:'integrated-target',kind:'scout',type:'guardian',x:628,y:600,hp:1,max:1,angle:Math.PI,active:true,state:'windup',timer:1,windupDuration:1,stun:0,moving:true,attackSpec:{damage:6,recovery:.8},telegraph:{phase:'windup',progress:0,shapes:[{type:'cone',x:628,y:600,r:45,angle:Math.PI,halfAngle:1}]}}];return battle;
}
const report={kind:'Separate consuming combat boundary parity, unchanged production engine a15 vs a17 canonical-copy state.',fixtureSource:'app/tests/combat-presentation-integration.test.mjs',normalPlay:false,lootRngCovered:false,pairs:[],limits:['Synthetic close-target fixture; no native input or browser acceptance.','No loot RNG or broad gameplay coverage is claimed.','Separate from wilderness view-output equivalence and earlier zero-draw simulations.']};
for(const hz of [30,60,120])for(const skill of ['attack','hammer']){
 let state=reduceRuntime(createState(),{type:'trainStarter',position:{x:260,y:325}}).state;
 state=reduceRuntime(state,{type:'setControls',controls:poeControlPreset(state.options.controls)}).state;
 const before=hash(state),owned=freezeOwnedSnapshot(state),a=fixture(oldCombat,state),b=fixture(newCombat,owned),initialSeed=a.seed,initialDraws=a.combatDraws;
 const input={[skill]:true,attackPressed:skill==='attack',aim:{x:900,y:600}};
 const events=oldCombat.acceptBattleInput(a,input);assert.deepEqual(events,newCombat.acceptBattleInput(b,structuredClone(input)));
 for(let i=0;i<hz*2;i++){const oldEvents=oldCombat.stepBattle(a,state.character,1/hz,{}),newEvents=newCombat.stepBattle(b,owned.character,1/hz,{});assert.deepEqual(newEvents,oldEvents);events.push(...oldEvents);assert.equal(hash(a),hash(b));}
 const consumed=a.combatDraws-initialDraws,hits=events.filter(e=>e.type==='enemyHit'),rng=events.filter(e=>e.type==='combatRandom'),defeated=events.filter(e=>e.type==='defeated');
 assert.ok(consumed>0);assert.equal(rng.length,consumed);assert.ok(hits.some(e=>e.rawDamage>0));assert.equal(defeated.length,1);assert.notEqual(a.seed,initialSeed);assert.equal(hash(state),before);assert.equal(hash(owned),before);
 report.pairs.push({hz,skill,frames:hz*2,initialSeed,finalSeed:a.seed,combatDrawsConsumed:consumed,combatRandomEvents:rng.length,positiveDamageHits:hits.filter(e=>e.rawDamage>0).length,defeatedEvents:defeated.length,modelSha256:hash(a),eventsSha256:hash(events)});
}
report.ok=true;report.combatDrawsConsumed=report.pairs.reduce((n,p)=>n+p.combatDrawsConsumed,0);writeFileSync(new URL('./consuming-combat-parity.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
