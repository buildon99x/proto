import test from 'node:test';
import assert from 'node:assert/strict';
import {trainingGoldBalances,validateTrainingGold} from '../src/training-economy.js';
import {createState} from '../src/state.js';
import {reduceCampaign} from '../src/campaign.js';
import {applyEquipmentCommand,quoteEquipment,validateEquipmentState} from '../src/equipment.js';
import {reduceEquipmentRuntime} from '../src/equipment-runtime.js';
import {EQUIPMENT_ITEMS,EQUIPMENT_RECIPES,EQUIPMENT_UPGRADES} from '../src/equipment-content.js';
import {emptyRecovery} from '../src/recovery.js';
import {getRegion,FOES} from '../src/world.js';

// Explicitly SYNTHETIC economic boundary fixtures. We execute unchanged
// production equipment/campaign handlers, but supply balances/materials/flags
// and scripted combat reports. These fixtures are NOT globally legal earned T
// saves, T-report/promotion proof, real AI combat, or ordinary-input play.
// T and global integration tests own exact receipt/tier/0-or-120 semantics.
const clone=value=>structuredClone(value);
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const smith={x:250,y:470},workshop={x:430,y:480};
const report=(state,position=state.world.position)=>({life:state.world.life??0,position:{...position},vitals:{...state.vitals},recovery:clone(state.recovery??emptyRecovery())});
function runCampaign(state,command){
 const before=clone(state),request=clone(command),result=reduceCampaign(freeze(state),freeze(command));
 assert.equal(result.ok,true,JSON.stringify(result));assert.deepEqual(state,before);assert.deepEqual(command,request);
 assert.equal(result.state.stats.earnedGold-result.state.stats.spentGold,result.state.gold);return result;
}
function funded(state,gold,reserved=120){
 const next=clone(state);next.gold=gold;next.stats.earnedGold=next.stats.spentGold+gold;
 if(reserved===undefined)delete next.reservedTrainingGold;else next.reservedTrainingGold={expert:reserved};
 return next;
}
function fixture(gold=120,reserved=120){
 let state=runCampaign(createState(),{type:'trainStarter',position:{x:260,y:325}}).state;
 state=funded(state,gold,reserved);state.inventory.materials={iron:100,wood:100,thread:100,ember_shard:100};state.inventory.tools=['smith_tools'];
 state.world.objectives.first_dungeon_cleared=1;return state;
}
function itemFixture(rank=0){
 let state=fixture(1000,0);
 const bought=applyEquipmentCommand(state,{type:'buyEquipment',commandId:'seed-item',baseId:'oak_shield',station:'blacksmith'});
 assert.equal(bought.ok,true,JSON.stringify(bought));state=bought.state;
 if(rank){const upgraded=applyEquipmentCommand(state,{type:'upgradeItem',commandId:'seed-upgrade',itemId:state.inventory.equipmentInstances[0].id,expectedRank:0,station:'workshop'});assert.equal(upgraded.ok,true,JSON.stringify(upgraded));state=upgraded.state;}
 return state;
}
function operationFor(kind,id,state){
 const commandId='boundary-'+kind+'-'+id;
 if(kind==='buy')return {type:'buyEquipment',commandId,baseId:id,station:'blacksmith',expectedGold:EQUIPMENT_ITEMS[id].price};
 if(kind==='craft')return {type:'craftItem',commandId,recipeId:id,station:'workshop',expectedGold:EQUIPMENT_RECIPES[id].gold};
 return {type:'upgradeItem',commandId,itemId:state.inventory.equipmentInstances[0].id,expectedRank:Number(id)-1,station:'workshop',expectedGold:EQUIPMENT_UPGRADES[id].gold};
}
const cases=[...Object.values(EQUIPMENT_ITEMS).map(row=>['buy',row.id,row.price]),...Object.values(EQUIPMENT_RECIPES).map(row=>['craft',row.id,row.gold]),...Object.values(EQUIPMENT_UPGRADES).map(row=>['upgrade',String(row.rank),row.gold])];
for(const [kind,id,cost] of cases)for(const delta of [-1,0,1])test(`reserved120: real ${kind} ${id} quote and handler at ${delta===-1?'below':delta===0?'exact':'excess'} spendable cost`,()=>{
 const state=freeze(funded(kind==='upgrade'?itemFixture(Number(id)-1):fixture(),120+cost+delta)),before=clone(state),operation=freeze(operationFor(kind,id,state));
 const quote=quoteEquipment(state,operation),result=applyEquipmentCommand(state,operation);
 const runtime=reduceEquipmentRuntime(state,{type:'equipment',operation,position:kind==='buy'?smith:workshop});
 assert.deepEqual(state,before);assert.equal(result.ok,delta>=0,JSON.stringify(result));assert.equal(runtime.ok,result.ok);assert.equal(quote.ok,result.ok);
 if(delta<0){assert.equal(result.code,'GOLD_SHORTAGE');assert.deepEqual(quote,result);assert.equal(runtime.code,result.code);return;}
 assert.equal(quote.goldCost,cost);assert.equal(result.state.gold,120+delta);assert.equal(result.state.reservedTrainingGold.expert,120);
 assert.equal(result.state.stats.spentGold,before.stats.spentGold+cost);assert.equal(result.state.stats.earnedGold,before.stats.earnedGold);
 assert.equal(result.state.stats.earnedGold-result.state.stats.spentGold,result.state.gold);
 assert.deepEqual(result.state.inventory,runtime.state.inventory);assert.equal(runtime.state.gold,result.state.gold);
 assert.equal(validateEquipmentState(result.state).ok,true);
 const repeated=applyEquipmentCommand(result.state,operation);assert.equal(repeated.ok,true);assert.equal(repeated.replayed,true);assert.deepEqual(repeated.state,result.state);
 assert.equal(quoteEquipment(result.state,operation).goldCost,0);
});

test('helper permits absent pre-T reservation without creating it and reports exact current balances',()=>{
 for(const gold of [0,1,119,120,Number.MAX_SAFE_INTEGER]){
  const state=freeze({gold});assert.deepEqual(trainingGoldBalances(state),{ok:true,totalGold:gold,reservedGold:0,spendableGold:gold});
  assert.deepEqual(validateTrainingGold(state),{ok:true});assert.equal(Object.hasOwn(state,'reservedTrainingGold'),false);
 }
 assert.deepEqual(trainingGoldBalances({gold:121,reservedTrainingGold:{expert:120}}),{ok:true,totalGold:121,reservedGold:120,spendableGold:1});
});
test('wallet helper owns range only; progression validators must reject semantically wrong amounts',()=>{
 for(const expert of [0,1,119,120,121])assert.equal(trainingGoldBalances({gold:121,reservedTrainingGold:{expert}}).ok,true);
});
const malformed=[['undefined',undefined],['null',null],['array',[]],['number',120],['missing expert',{}],['wrong key',{adept:120}],['extra key',{expert:120,other:0}],['negative',{expert:-1}],['fraction',{expert:.5}],['NaN',{expert:NaN}],['infinity',{expert:Infinity}],['unsafe',{expert:Number.MAX_SAFE_INTEGER+1}],['above gold',{expert:121}],['string',{expert:'120'}]];
for(const [name,value] of malformed)test(`malformed reservation fails closed before real handlers: ${name}`,()=>{
 const state=fixture();state.reservedTrainingGold=value;const before=clone(state);
 assert.equal(trainingGoldBalances(state).code,'INVALID_TRAINING_GOLD');assert.equal(validateTrainingGold(state).ok,false);
 const operation={type:'buyEquipment',commandId:'malformed',baseId:'oak_shield',station:'blacksmith'};
 for(const result of [quoteEquipment(state,operation),applyEquipmentCommand(state,operation),reduceEquipmentRuntime(state,{type:'equipment',operation,position:smith}),reduceCampaign(state,{type:'settleCombat',defeated:[],...report(state),vitals:{...state.vitals,hp:0}})])assert.equal(result.ok,false,JSON.stringify(result));
 assert.deepEqual(state,before);
});
test('accessors, hidden keys, symbols and inherited reservation shapes fail without invoking getters',()=>{
 let reads=0;
 const accessor={gold:120};Object.defineProperty(accessor,'reservedTrainingGold',{enumerable:true,get(){reads++;return {expert:0};}});
 assert.equal(trainingGoldBalances(accessor).ok,false);assert.equal(reduceCampaign(accessor,{type:'retry'}).ok,false);
 const expert={};Object.defineProperty(expert,'expert',{enumerable:true,get(){reads++;return 0;}});
 assert.equal(trainingGoldBalances({gold:120,reservedTrainingGold:expert}).ok,false);
 for(const reservation of [Object.create({expert:120}),Object.assign(Object.create(null),{expert:120}),Object.defineProperty({expert:120},'hidden',{value:0}),Object.assign({expert:120},{[Symbol('extra')]:0}),Object.defineProperty({},'expert',{value:120})])assert.equal(trainingGoldBalances({gold:120,reservedTrainingGold:reservation}).ok,false);
 const hidden=Object.defineProperty({gold:120},'reservedTrainingGold',{value:{expert:0}});assert.equal(trainingGoldBalances(hidden).ok,false);
 assert.equal(reads,0);
});
test('helper rejects malformed gold and never subtracts from a nominal fallback balance',()=>{
 for(const gold of [-1,.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1,undefined,'120'])assert.equal(trainingGoldBalances({gold,reservedTrainingGold:{expert:0}}).ok,false);
 const getter=Object.defineProperty({},'gold',{enumerable:true,get(){throw new Error('must not read');}});assert.equal(trainingGoldBalances(getter).ok,false);
});

test('sale is ordinary income; zero-spendable inventory sale preserves the entire allocation and cannot replay income',()=>{
 let state=funded(itemFixture(),120);const id=state.inventory.equipmentInstances[0].id,operation={type:'sellItem',commandId:'protected-sale',itemId:id,station:'blacksmith'};
 const before=clone(state),quote=quoteEquipment(state,operation),result=reduceEquipmentRuntime(freeze(state),{type:'equipment',operation,position:smith});
 assert.equal(result.ok,true,JSON.stringify(result));state=result.state;
 assert.equal(quote.goldGain,10);assert.equal(state.gold,130);assert.equal(state.stats.earnedGold,before.stats.earnedGold+10);assert.equal(state.stats.spentGold,before.stats.spentGold);
 assert.deepEqual(trainingGoldBalances(state),{ok:true,totalGold:130,reservedGold:120,spendableGold:10});
 const replay=reduceEquipmentRuntime(state,{type:'equipment',operation,position:smith});assert.equal(replay.ok,true);assert.equal(replay.replayed,true);assert.deepEqual(replay.state,state);
 assert.equal(applyEquipmentCommand(state,{...operation,commandId:'second-sale'}).code,'ITEM_NOT_OWNED');
});
test('no-gold equipment kinds preserve zero-spendable reservation: award, equip, unequip',()=>{
 let state=funded(itemFixture(),120);state.inventory.tools=[];
 const commands=[{type:'receiveEquipmentAward',commandId:'free-supplies',awardId:'workshop_supplies',station:'blacksmith'},{type:'equipItem',commandId:'wear',itemId:state.inventory.equipmentInstances[0].id},{type:'unequipItem',commandId:'unwear',slot:'offHand'}];
 for(const operation of commands){const before=clone(state),result=reduceEquipmentRuntime(state,{type:'equipment',operation,position:smith});assert.equal(result.ok,true,JSON.stringify(result));state=result.state;assert.equal(state.gold,before.gold);assert.deepEqual(state.reservedTrainingGold,{expert:120});assert.deepEqual(state.stats,before.stats);}
});
function field(gold=120,reserved=120){
 let state=fixture(gold,reserved);delete state.world.objectives.first_dungeon_cleared;state=runCampaign(state,{type:'acceptPatrol',position:{x:450,y:325}}).state;
 return runCampaign(state,{type:'travel',to:'ash_road',...report(state,{x:590,y:375})}).state;
}
function death(state,defeated=[]){return runCampaign(state,{type:'settleCombat',defeated,...report(state),vitals:{...state.vitals,hp:0}});}
for(const spare of [0,1,19,20,21,100])test(`death charges only floor(spendable*.05) with reserved120 + ${spare}`,()=>{
 const state=field(120+spare),result=death(state),loss=Math.floor(spare*.05);
 assert.equal(result.state.gold,120+spare-loss);assert.equal(result.state.stats.spentGold,state.stats.spentGold+loss);assert.equal(result.state.stats.deaths,1);assert.deepEqual(result.state.reservedTrainingGold,{expert:120});
 assert.deepEqual(result.events.find(event=>event.type==='died'),{type:'died',lostGold:loss});
 assert.equal(reduceCampaign(result.state,{type:'settleCombat',defeated:[],...report(result.state)}).code,'STALE_ENCOUNTER');
});
for(const gold of [0,19,20,120,121])test(`untouched pre-T death retains old full-wallet rule at gold ${gold}`,()=>{
 const state=field(gold,0);delete state.reservedTrainingGold;
 const result=death(state);assert.equal(result.state.gold,gold-Math.floor(gold*.05));assert.equal(Object.hasOwn(result.state,'reservedTrainingGold'),false);
});
test('post-accept zero reservation preserves the pre-report death rule',()=>{
 const result=death(field(121,0));assert.equal(result.state.gold,115);assert.equal(result.state.stats.spentGold,6);assert.deepEqual(result.state.reservedTrainingGold,{expert:0});
});
test('current-frame boss income settles before the protected death fee, once, without living level-up refill',()=>{
 const state=field(),result=death(state,['road-warden']),boss=FOES[getRegion('ash_road').foes.find(row=>row.id==='road-warden').kind];
 assert.equal(boss.gold,28);assert.equal(result.state.gold,147);assert.equal(result.state.stats.earnedGold,148);assert.equal(result.state.stats.spentGold,1);assert.equal(result.state.stats.kills,1);assert.equal(result.state.vitals.hp,0);assert.deepEqual(result.state.reservedTrainingGold,{expert:120});
 assert.equal(reduceCampaign(result.state,{type:'settleCombat',defeated:['road-warden'],...report(result.state)}).code,'STALE_ENCOUNTER');
});
test('earlier kill plus later new kill/death charges the whole remaining spendable balance and never repeats old income',()=>{
 let state=field();state=runCampaign(state,{type:'settleCombat',defeated:['road-warden'],...report(state)}).state;
 assert.equal(state.gold,148);
 const result=death(state,['road-warden','road-0-0']);state=result.state;
 assert.equal(state.stats.kills,2);assert.equal(state.stats.earnedGold,151);assert.equal(state.stats.spentGold,1);assert.equal(state.gold,150);assert.deepEqual(state.reservedTrainingGold,{expert:120});
 assert.equal(result.events.find(event=>event.type==='combatSettled').kills,1);
});
test('successive zero-spendable deaths and retries retain120 without double fees or receipt loss',()=>{
 let state=field();
 for(let count=1;count<=3;count++){
  state=death(state).state;assert.equal(state.gold,120);assert.equal(state.stats.spentGold,0);assert.equal(state.stats.deaths,count);
  state=runCampaign(state,{type:'retry'}).state;assert.equal(state.world.life,count);assert.deepEqual(state.reservedTrainingGold,{expert:120});
  state=runCampaign(state,{type:'travel',to:'ash_road',...report(state,{x:590,y:375})}).state;
 }
});
test('potion inventory consumption and free rest preserve zero-spendable gold allocation',()=>{
 let state=fixture();const before=clone(state),potion=runCampaign(state,{type:'drinkPotion',...report(state),vitals:{...state.vitals,hp:1}});state=potion.state;
 assert.equal(state.inventory.consumables.health_potion,before.inventory.consumables.health_potion-1);assert.equal(state.gold,120);assert.deepEqual(state.reservedTrainingGold,{expert:120});assert.deepEqual(state.stats,before.stats);
 assert.equal(reduceCampaign(state,{type:'drinkPotion',...report(state),vitals:{...state.vitals,hp:1}}).code,'POTION_COOLDOWN');
 state=runCampaign(state,{type:'rest',position:{x:350,y:250}}).state;assert.equal(state.gold,120);assert.deepEqual(state.reservedTrainingGold,{expert:120});assert.deepEqual(state.stats,before.stats);
});
test('gold119 with an alleged120 allocation cannot die, buy, sell, or be converted into a valid zero allocation',()=>{
 const state=funded(itemFixture(),119),before=clone(state),id=state.inventory.equipmentInstances[0].id;
 for(const operation of [{type:'buyEquipment',commandId:'invalid-buy',baseId:'padded_hood',station:'blacksmith'},{type:'sellItem',commandId:'invalid-sale',itemId:id,station:'blacksmith'}])assert.equal(applyEquipmentCommand(state,operation).code,'INVALID_TRAINING_GOLD');
 assert.equal(reduceCampaign(state,{type:'settleCombat',defeated:[],...report(state),vitals:{...state.vitals,hp:0}}).code,'INVALID_TRAINING_GOLD');assert.deepEqual(state,before);
});

test('successful real travel advances a synthetic active-T input token, without altering the wallet or paid recovery',()=>{
 let state=field();state.world.objectives.tomb_accepted=1;state.world.objectives.tomb_revision=7;
 state.recovery={...emptyRecovery(),cooldowns:{righteous_hammer:2},manaDelay:1};
 const before=clone(state);state=runCampaign(state,{type:'travel',to:'ash_hamlet',...report(state,{x:92,y:728})}).state;
 assert.equal(state.world.objectives.tomb_revision,8);assert.equal(state.gold,before.gold);assert.deepEqual(state.reservedTrainingGold,before.reservedTrainingGold);assert.deepEqual(state.recovery,before.recovery);assert.deepEqual(state.vitals,before.vitals);
 state=runCampaign(state,{type:'travel',to:'ash_road',...report(state,{x:590,y:375})}).state;
 assert.equal(state.world.objectives.tomb_revision,9);assert.equal(state.world.life,before.world.life);
});
test('failed real travel and exhausted active-T input token preserve the original state unchanged',()=>{
 const state=field();state.world.objectives.tomb_accepted=1;state.world.objectives.tomb_revision=Number.MAX_SAFE_INTEGER;
 const before=clone(state),atPortal={type:'travel',to:'ash_hamlet',...report(state,{x:92,y:728})};
 assert.equal(reduceCampaign(freeze(state),atPortal).code,'REVISION_LIMIT');assert.deepEqual(state,before);
 const below=clone(state);below.world.objectives.tomb_revision=7;const earlier=clone(below);
 assert.equal(reduceCampaign(below,{...atPortal,life:999}).code,'STALE_LIFE');assert.deepEqual(below,earlier);
 assert.equal(reduceCampaign(below,{...atPortal,vitals:{...below.vitals,hp:0}}).code,'INVALID_REPORT');assert.deepEqual(below,earlier);
});
test('ordinary legacy travel never creates a T revision or reservation',()=>{
 let state=fixture(120,0);delete state.reservedTrainingGold;delete state.world.objectives.first_dungeon_cleared;
 state=runCampaign(state,{type:'acceptPatrol',position:{x:450,y:325}}).state;
 state=runCampaign(state,{type:'travel',to:'ash_road',...report(state,{x:590,y:375})}).state;
 assert.equal(Object.hasOwn(state.world.objectives,'tomb_revision'),false);assert.equal(Object.hasOwn(state,'reservedTrainingGold'),false);
});
