// Scripted production-handler fixture, NOT AI victory or ordinary-input play.
// Earlier route is earned through registered production handlers. Detached W
// uses the exact new runtime reducers, with explicit positions/defeat reports.
// No XP, level, promotion, objective or item injection on this route.
import assert from 'node:assert/strict';
import {reduceRuntime} from '../../src/state.js';
import {earnedTombRoute} from './earned-tomb-route.mjs';
import {report as legacyReport,run,travel,settle} from './earned-route.mjs';
import {battlefieldInputRevision} from '../../src/battlefield.js';
import {BATTLEFIELD_REGIONS,BATTLEFIELD_GROUPS} from '../../src/battlefield-content.js';
import {WILDERNESS_REGIONS,WILDERNESS_REGION,WILDERNESS_GROUPS,WILDERNESS_LINKS} from '../../src/wilderness-content.js';
import {reduceWildernessRuntime,validateWildernessProgress,wildernessInputRevision} from '../../src/wilderness.js';
export const W=WILDERNESS_REGIONS[WILDERNESS_REGION],elder={x:450,y:325};
const cache=new Map();
// Explicit trusted in-memory controller-epoch harness; no epoch is stored in
// game data and no fresh stamp is attached to an already-captured command.
const epochs=new WeakMap();
export const storeRevision=s=>epochs.get(s)??0;
export const runtimeContext=s=>({revision:storeRevision(s)});
export const inheritRuntimeRevision=(next,previous)=>{epochs.set(next,storeRevision(previous));return next;};
export function copyRuntime(value){const copied=structuredClone(value);const visit=(a,b)=>{if(!a||typeof a!=='object')return;if(epochs.has(a))epochs.set(b,epochs.get(a));for(const key of Object.keys(a))visit(a[key],b[key]);};visit(value,copied);return copied;}
export const report=(s,position=s.world.position)=>({...legacyReport(s,position),expectedStoreRevision:storeRevision(s)});
export const retryCommand=s=>({type:'retry',expectedStoreRevision:storeRevision(s)});
export function earnedBattlefield(difficulty='normal'){
 if(cache.has(difficulty))return structuredClone(cache.get(difficulty));
 let s=earnedTombRoute(difficulty),r=reduceRuntime(s,{type:'promoteExpert',...legacyReport(s,{x:260,y:325}),expectedRevision:0,expectedGoldCost:120},{revision:0});assert.equal(r.ok,true,JSON.stringify(r));s=r.state;
 const quest=type=>{s=run(s,{type,...legacyReport(s,elder),expectedRevision:battlefieldInputRevision(s)}).state;};
 const interact=id=>{const object=BATTLEFIELD_REGIONS.beacon_battlefield.objects.find(o=>o.id===id);s=run(s,{type:'interactBattlefield',objectId:id,...legacyReport(s,object),expectedRevision:battlefieldInputRevision(s)}).state;};
 quest('acceptBattlefieldQuest');s=travel(s,'town-battlefield-entry');for(const side of ['west','east']){s=settle(s,BATTLEFIELD_GROUPS[side]);interact('battlefield-'+side+'-device');}s=settle(s,BATTLEFIELD_GROUPS.boss);interact('battlefield-beacon');s=travel(s,'battlefield-boss-return');quest('reportBattlefieldQuest');cache.set(difficulty,structuredClone(s));return s;
}
export const quest=(s,type)=>({type,...report(s,elder),expectedRevision:wildernessInputRevision(s)});
export const object=id=>W.objects.find(o=>o.id==='wilderness-'+id);
export function interaction(s,id,extra={}){const o=object(id);assert.ok(o,id);return {type:'interactWilderness',objectId:o.id,...report(s,o),expectedRevision:wildernessInputRevision(s),...(o.actionKind==='glyph'?{expectedStep:s.world.objectives.wilderness_sequence_step}:{}),...extra};}
export function wRun(s,c){const before=structuredClone(s),request=structuredClone(c),r=reduceWildernessRuntime(s,c,runtimeContext(s));assert.equal(r.ok,true,JSON.stringify({command:c.type,id:c.objectId??c.portalId,result:r}));assert.deepEqual(s,before);assert.deepEqual(c,request);assert.equal(validateWildernessProgress(r.state).ok,true);epochs.set(r.state,storeRevision(s)+1);return r;}
export const act=(s,id,extra)=>wRun(s,interaction(s,id,extra)).state;
export const wSettle=(s,group,extra={})=>wRun(s,{type:'settleCombat',defeated:WILDERNESS_GROUPS[group],...report(s),...extra}).state;
export function travelCommand(s,id){const portals=s.world.region===WILDERNESS_REGION?W.portals:WILDERNESS_LINKS.ash_hamlet;const p=portals.find(p=>p.id===id);assert.ok(p,id);return {type:'travel',portalId:id,to:p.to,...report(s,p)};}
export const wTravel=(s,id)=>wRun(s,travelCommand(s,id)).state;
export function stages(difficulty='normal',mode='cover'){
 const out={before:earnedBattlefield(difficulty)};let s=out.before;s=wRun(s,quest(s,'acceptWildernessQuest')).state;out.accepted=s;s=wTravel(s,'town-wilderness-entry');out.entered=s;
 s=wSettle(s,'survey');out.surveyGuards=s;s=act(s,'tablet');out.survey=s;
 s=wSettle(s,'anchor');out.anchorGuards=s;s=act(s,'hook');out.hook=s;s=act(s,'anchor');out.anchor=s;
 s=wSettle(s,'receiver');out.receiverGuards=s;s=act(s,'glyph-wind');out.prefix=s;s=act(s,'glyph-cairn');s=act(s,'glyph-ember');out.calibrated=s;
 s=act(s,'choice',{choice:mode});out.chosen=s;s=wSettle(s,'relay');out.relayGuards=s;s=act(s,'relay');out.routed=s;
 s=wSettle(s,'approach');out.approach=s;s=wSettle(s,'boss');out.boss=s;s=act(s,'evidence');out.evidence=s;
 s=wTravel(s,'wilderness-keeper-return');out.home=s;s=wRun(s,quest(s,'reportWildernessQuest')).state;out.finished=s;return out;
}
