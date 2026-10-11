import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const base='/workspace/shared/emberwatch-frame-stall-diagnostics/app/src/',candidate=new URL('../../app/src/',import.meta.url).pathname;
const baseline=await import(base+'wilderness-presentation.js'),current=await import(candidate+'wilderness-presentation.js');
const {freezeOwnedSnapshot}=await import(candidate+'immutable-snapshot.js');
const oldCombat=await import(base+'combat.js'),newCombat=await import(candidate+'combat.js');
const {WILDERNESS_REGIONS,WILDERNESS_REGION,WILDERNESS_LINKS}=await import(base+'wilderness-content.js');
const W=WILDERNESS_REGIONS[WILDERNESS_REGION],fixtures=JSON.parse(readFileSync(new URL('./performance/earned-scene-fixtures.json',import.meta.url),'utf8'));
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const report={kind:'Isolated baseline a15 versus final a17 pure view/engine parity; scripted fixtures, not native play.',viewCalls:0,viewStages:[],simulationPairs:[],baselineRoot:base,candidateRoot:candidate};
for(const stage of Object.keys(fixtures)){
 const original=fixtures[stage],owned=freezeOwnedSnapshot(original),before=hash(original);
 for(const context of [undefined,{revision:7},{revision:-1}])for(const object of W.objects){assert.deepEqual(current.wildernessObjectView(owned,object,context),baseline.wildernessObjectView(original,object,context));report.viewCalls++;}
 for(const portal of [...W.portals,...WILDERNESS_LINKS.ash_hamlet]){assert.deepEqual(current.wildernessPortalView(owned,portal),baseline.wildernessPortalView(original,portal));report.viewCalls++;}
 for(const name of ['wildernessGuidance','wildernessClue'])if(name in current){assert.deepEqual(current[name](owned),baseline[name](original));report.viewCalls++;}
 for(const context of [undefined,{revision:7},{revision:-1}]){assert.deepEqual(current.wildernessElderView(owned,context),baseline.wildernessElderView(original,context));report.viewCalls++;}
 assert.equal(hash(original),before);assert.equal(hash(owned),before);report.viewStages.push(stage);
}
for(const stage of ['entered','chosen','approach','evidence'])for(const mode of ['idle','move','hammer']){
 const original=fixtures[stage],owned=freezeOwnedSnapshot(original),before=hash(original),a=oldCombat.createBattle(original),b=newCombat.createBattle(owned);
 for(let i=0;i<90;i++){const input={move:mode==='move'?{x:i%40<20?1:-1,y:0}:{x:0,y:0},aim:{x:a.p.x+150,y:a.p.y},hammer:mode==='hammer'&&i%30===0,attack:i%24===0,block:i%18<4};assert.deepEqual(oldCombat.stepBattle(a,original.character,1/60,input),newCombat.stepBattle(b,owned.character,1/60,structuredClone(input)));}
 assert.equal(hash(a),hash(b));assert.equal(hash(original),before);report.simulationPairs.push({stage,mode,frames:90,modelSha256:hash(a),seed:a.seed,combatDraws:a.combatDraws,fxSeed:a.fxSeed});
}
report.simulationCoverage={kind:'Non-consuming model/event/RNG-state equality only',combatDrawsConsumed:0,actualCombatRngConsumptionVerified:false};assert.ok(report.simulationPairs.every(x=>x.combatDraws===0));report.ok=true;writeFileSync(new URL('./view-model-parity.json',import.meta.url),JSON.stringify(report,null,2));console.log(JSON.stringify({ok:true,viewCalls:report.viewCalls,stages:report.viewStages.length,simulationPairs:report.simulationPairs.length}));
