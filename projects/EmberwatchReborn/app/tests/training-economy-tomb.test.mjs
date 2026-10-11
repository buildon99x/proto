import test from 'node:test';
import assert from 'node:assert/strict';
import {reduceRuntime,validateState} from '../src/state.js';
import {quoteEquipment} from '../src/equipment.js';
import {trainingGoldBalances} from '../src/training-economy.js';
import {tombInputRevision} from '../src/tomb.js';
import {getRegion,FOES} from '../src/world.js';
import {createStore} from '../src/save.js';
import {earnedTombRoute} from './support/earned-tomb-route.mjs';
import {report,run,travel} from './support/earned-route.mjs';

// Real registered reducer/save handlers and an entirely command-earned
// predecessor/T route, with SCRIPTED positions/defeat reports. Boundary tests
// explicitly adjust the prior-spending ledger to model low balances; they are
// NOT an earned low-gold playthrough, live combat, or browser QA.
const clone=value=>structuredClone(value),smith={x:250,y:470},workshop={x:430,y:480},elder={x:450,y:325};
function balance(state,gold){const next=clone(state);assert.ok(next.stats.earnedGold>=gold);next.gold=gold;next.stats.spentGold=next.stats.earnedGold-gold;assert.equal(validateState(next).ok,true);return next;}
const gear=(state,operation)=>run(state,{type:'equipment',operation,position:['craftItem','upgradeItem'].includes(operation.type)?workshop:smith}).state;
function prepare(kind){
 let state=earnedTombRoute('hard');
 if(kind!=='buy'&&!state.inventory.tools.includes('smith_tools'))state=gear(state,{type:'receiveEquipmentAward',commandId:'economy-workshop-kit',awardId:'workshop_supplies',station:'blacksmith'});
 if(kind==='upgrade')state=gear(state,{type:'buyEquipment',commandId:'economy-upgrade-item',baseId:'oak_shield',station:'blacksmith'});
 return state;
}
function operation(state,kind){
 if(kind==='buy')return {type:'buyEquipment',commandId:'tomb-economy-buy',baseId:'padded_hood',station:'blacksmith',expectedGold:18};
 if(kind==='craft')return {type:'craftItem',commandId:'tomb-economy-craft',recipeId:'oak_shield',station:'workshop',expectedGold:15};
 return {type:'upgradeItem',commandId:'tomb-economy-upgrade',itemId:state.inventory.equipmentInstances.at(-1).id,expectedRank:0,station:'workshop',expectedGold:12};
}
for(const kind of ['buy','craft','upgrade'])for(const offset of [-1,0,1])test(`registered T ${kind} uses reserved balance in quote/runtime at ${offset===-1?'below':offset===0?'exact':'excess'} boundary`,()=>{
 let state=prepare(kind);const action=operation(state,kind);state=balance(state,120+action.expectedGold+offset);const before=clone(state);
 const quote=quoteEquipment(state,action),command={type:'equipment',operation:action,position:kind==='buy'?smith:workshop},result=reduceRuntime(state,command);
 assert.equal(quote.ok,offset>=0,JSON.stringify(quote));assert.equal(result.ok,quote.ok,JSON.stringify(result));assert.deepEqual(state,before);
 if(offset<0){assert.equal(result.code,'GOLD_SHORTAGE');return;}
 state=result.state;assert.equal(validateState(state).ok,true);assert.equal(state.gold,120+offset);assert.deepEqual(state.reservedTrainingGold,{expert:120});
 assert.equal(state.stats.spentGold,before.stats.spentGold+action.expectedGold);assert.equal(state.stats.earnedGold,before.stats.earnedGold);
 const duplicate=run(state,command);assert.equal(duplicate.replayed,true);assert.deepEqual(duplicate.state,state);
});
test('registered L14 T report at synthetic gold0 grants only its existing120 and protects it through shop failure/death/save/retry',()=>{
 let state=balance(earnedTombRoute('hard',{reportQuest:false}),0);assert.equal(state.character.level,14);const before=clone(state),command={type:'reportTombQuest',...report(state,elder),expectedRevision:tombInputRevision(state)};
 state=run(state,command).state;assert.equal(state.gold,120);assert.equal(state.stats.earnedGold,before.stats.earnedGold+120);assert.equal(state.stats.spentGold,before.stats.spentGold);
 assert.equal(state.stats.earnedXp-before.stats.earnedXp,140);assert.equal(state.character.level,15);assert.equal(state.character.tier,'adept');assert.equal(state.world.objectives.expert_commission,1);
 assert.deepEqual(trainingGoldBalances(state),{ok:true,totalGold:120,reservedGold:120,spendableGold:0});
 assert.equal(reduceRuntime(state,{...command,expectedRevision:tombInputRevision(state)}).ok,false);
 assert.equal(reduceRuntime(state,{type:'equipment',operation:operation(state,'buy'),position:smith}).code,'GOLD_SHORTAGE');
 const memory=new Map(),store=createStore({getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,value)},{profile:'qa-r10-protected-economy'});
 for(let n=0;n<2;n++){
  state=run(state,{type:'settleCombat',defeated:[],...report(state),vitals:{...state.vitals,hp:0}}).state;
  assert.equal(state.gold,120);assert.deepEqual(state.reservedTrainingGold,{expert:120});assert.equal(state.stats.spentGold,before.stats.spentGold);
  assert.equal(store.save(state,{expectedRevision:n}).ok,true);const loaded=store.load();assert.equal(loaded.ok,true);assert.deepEqual(loaded.state,state);
  state=run(loaded.state,{type:'retry'}).state;
 }
});
test('registered T sale creates ordinary spendable income without releasing the fee',()=>{
 let state=gear(earnedTombRoute(),{type:'buyEquipment',commandId:'tomb-sale-source',baseId:'oak_shield',station:'blacksmith'});state=balance(state,120);
 const before=clone(state),action={type:'sellItem',commandId:'tomb-sale',itemId:state.inventory.equipmentInstances.at(-1).id,station:'blacksmith'};
 state=gear(state,action);assert.equal(state.gold,130);assert.equal(state.stats.earnedGold,before.stats.earnedGold+10);assert.equal(state.stats.spentGold,before.stats.spentGold);assert.deepEqual(state.reservedTrainingGold,{expert:120});
 assert.deepEqual(gear(state,action),state);
});
test('registered reported-T later kills settle before death and old enemy receipts never pay twice',()=>{
 let state=balance(earnedTombRoute(),137);state=travel(state,'road');
 const candidates=getRegion('ash_road').foes.filter(foe=>!state.world.defeated.ash_road.includes(foe.id)&&FOES[foe.kind].gold===3);assert.ok(candidates.length>=2);
 const [first,second]=candidates,prior=clone(state);
 state=run(state,{type:'settleCombat',defeated:[first.id],...report(state)}).state;assert.equal(state.gold,140);
 state=run(state,{type:'settleCombat',defeated:[first.id,second.id],...report(state),vitals:{...state.vitals,hp:0}}).state;
 assert.equal(state.gold,142);assert.equal(state.stats.earnedGold,prior.stats.earnedGold+6);assert.equal(state.stats.spentGold,prior.stats.spentGold+1);assert.equal(state.stats.kills,prior.stats.kills+2);assert.deepEqual(state.reservedTrainingGold,{expert:120});
 assert.equal(state.vitals.hp,0);assert.equal(validateState(state).ok,true);
});
test('global T guards block malformed or semantically forged allocations before any spending',()=>{
 const source=earnedTombRoute();
 for(const edit of [s=>delete s.reservedTrainingGold,s=>s.reservedTrainingGold={expert:0},s=>s.reservedTrainingGold={expert:119},s=>s.reservedTrainingGold={expert:121},s=>s.reservedTrainingGold={expert:120,other:0},s=>s.world.objectives.expert_commission=0,s=>s.world.claimedRewards=s.world.claimedRewards.filter(id=>id!=='r10:t:report'),s=>s.world.claimedRewards.push('r10:promote:expert'),s=>{s.gold=119;s.stats.spentGold=s.stats.earnedGold-119;}]){
  const state=clone(source);edit(state);const before=clone(state);assert.equal(validateState(state).ok,false);
  assert.equal(reduceRuntime(state,{type:'equipment',operation:operation(state,'buy'),position:smith}).ok,false);assert.deepEqual(state,before);
 }
});
