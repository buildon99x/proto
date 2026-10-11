// Lightweight logical-clock reproduction. Not a CPU benchmark, save-duration
// measurement, native input, or full combat simulation.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import vm from 'node:vm';
import {createInputRouter,controlPreset,poeControlPreset,isPoeControls} from '../emberwatch-r14a17-scene-cache-project/app/src/controls.js';
import {createRuntimeGate} from '../emberwatch-r14a17-scene-cache-project/app/src/runtime-gate.js';
import {createInputLatency} from '../emberwatch-r14a17-scene-cache-project/app/src/input-latency.js';
const source=readFileSync(new URL('../emberwatch-r14a17-scene-cache-project/app/src/main.js',import.meta.url),'utf8');
function extract(name){const start=source.indexOf('function '+name+'(');assert.ok(start>=0);for(let end=source.indexOf('}',start);end>=0;end=source.indexOf('}',end+1)){const text=source.slice(start,end+1);try{new vm.Script('('+text+')');return text;}catch(e){if(!(e instanceof SyntaxError))throw e;}}throw Error(name);}
const results=[];
for(const age of [149,150,151,300]){
 let now=100;const controls=poeControlPreset(controlPreset()),router=createInputRouter({captureAttackTap:true,now:()=>now}),inputLatency=createInputLatency({now:()=>now}),seen=[],toasts=[];
 const env={router,inputLatency,performance:{now:()=>now},config:()=>controls,isPoeControls,EXPERT_SLOTS:['expert1','expert2'],SKILL_SLOTS:[],slotSkill:()=>null,showInputFeedback(){},expertCapture:{deferred:{clear(){}}},skillCapture:{deferred:{clear(){}},expirePending:()=>[]},expertSafety:{pending:false},contextClick:{active:false,clear(){}},contextSuppressHeld:false,locomotionIntent:{clear(){}},flushActionSafety:()=>false,paused:false,busy:true,battle:{p:{hp:100},stateLife:0,region:'signal_wilderness'},state:{world:{lifeDown:false}},gate:createRuntimeGate(),document:{hidden:false,hasFocus:()=>true},sampledCombatInput:()=>router.snapshot(controls),acceptBattleInput:(battle,input)=>{seen.push(input);return [];},deliverCombatEvents(){},toast:text=>toasts.push(text),panel(){}};
 const app=new Function(...Object.keys(env),extract('acceptCombatPress')+'\n'+extract('flushFreshCombatInput')+'\nreturn {acceptCombatPress,flushFreshCombatInput,releaseSave(){busy=false;}};')(...Object.values(env));
 router.down('KeyD',controls);const action=router.down('Space',controls);assert.equal(action,'dodgeSprint');app.acceptCombatPress(action,'Space');app.flushFreshCombatInput();assert.equal(seen.length,0,'in-flight save gates input');
 now+=age;app.releaseSave();app.flushFreshCombatInput();assert.equal(seen.length,1);assert.equal(seen[0].dodgeSprint,age<=150);assert.equal(toasts.length,age>150?1:0);assert.equal(seen[0].dodgeSprintHeld,true,'held key alone does not restore expired initial roll pulse');
 const observations=inputLatency.snapshot();results.push({logicalSaveWaitAgeMs:age,dodgePulseDelivered:seen[0].dodgeSprint,heldAfterExpiry:seen[0].dodgeSprintHeld,toast:toasts[0]??null,observations});
}
const result={ok:true,scope:'Two extracted production main handlers + real router/gate/latency with logical clock; combat delivery is a probe. No actual store I/O or native timing measured.',results};writeFileSync(new URL('./input-expiry-reproduction.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({ok:true,cases:results.map(({observations,...r})=>r)},null,2));
