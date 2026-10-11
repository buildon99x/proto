// Read-only paired production-handler simulation against the frozen baseline.
// This tests new integrated code, not a rerun of standalone audio verification.
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {writeFileSync} from 'node:fs';
const load=async root=>{const [state,combat,controls,geometry]=await Promise.all(['state.js','combat.js','controls.js','world-geometry.js'].map(f=>import(pathToFileURL(root+'/app/src/'+f))));return {...state,...combat,...controls,...geometry};};
const baseline=await load(process.argv[2]),integrated=await load(process.argv[3]);
function fixture(api,{poe,hp,type}){
 let state=api.reduceRuntime(api.createState(),{type:'trainStarter',position:{x:260,y:325}}).state;
 if(poe)state=api.reduceRuntime(state,{type:'setControls',controls:api.poeControlPreset(state.options.controls)}).state;
 const battle=api.createBattle(state);battle.map=api.mapFromRegion({w:60,h:60});battle.p.x=battle.p.y=600;battle.awaitingAdvance=false;
 battle.enemies=[{id:'target',kind:'scout',type,x:628,y:600,hp,max:hp,angle:Math.PI,active:true,state:'windup',timer:1,windupDuration:1,stun:0,moving:true,attackSpec:{damage:6,recovery:.8},telegraph:{phase:'windup',progress:0,shapes:[{type:'cone',x:628,y:600,r:45,angle:Math.PI,halfAngle:1}]}}];
 return {state,battle};
}
function gameplay(b){
 const result={};for(const key of ['p','time','seed','combatDraws','fxSeed','contacts','hitstop','shake','skillIntent','shots','areas','dead'])result[key]=structuredClone(b[key]);
 result.enemies=b.enemies.map(enemy=>{const value=structuredClone(enemy);delete value.reaction;if(enemy.hp<=0)for(const key of ['state','timer','telegraph','moving','attackSpec'])delete value[key];return value;});
 return result;
}
const mechanics=events=>events.filter(e=>!['sound','soundCancel'].includes(e.type));
const cases=[];
for(const hz of [30,60,120])for(const poe of [false,true])for(const hp of [1,100])for(const type of ['guardian','boss'])for(const skill of ['attack','hammer','charge'])for(const moving of [false,true]){
 const options={hz,poe,hp,type,skill,moving},a=fixture(baseline,options),z=fixture(integrated,options);
 const input={[skill]:true,attackPressed:skill==='attack',aim:{x:900,y:600}};
 assert.deepEqual(mechanics(integrated.acceptBattleInput(z.battle,input)),mechanics(baseline.acceptBattleInput(a.battle,input)),JSON.stringify({...options,at:'input'}));
 for(let i=0;i<hz*1.5;i++){
  const move=moving?{move:{x:0,y:1}}:{};
  const ae=baseline.stepBattle(a.battle,a.state.character,1/hz,move),ze=integrated.stepBattle(z.battle,z.state.character,1/hz,move);
  assert.deepEqual(mechanics(ze),mechanics(ae),JSON.stringify({...options,frame:i,at:'non-audio events'}));
  assert.deepEqual(gameplay(z.battle),gameplay(a.battle),JSON.stringify({...options,frame:i,at:'gameplay state/RNG'}));
 }
 cases.push({...options,identical:true});
}
writeFileSync(new URL('gameplay-parity.json',import.meta.url),JSON.stringify({scope:'144 paired isolated cases; exact per-step gameplay/non-audio events/RNG. Excludes new enemy render metadata and intentionally cleared dead-only attack fields. No campaign-wide or subjective equivalence implied.',cases},null,2)+'\n');
console.log(`${cases.length} integrated/baseline gameplay, non-audio event and RNG parity cases passed.`);
