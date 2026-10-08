import test from 'node:test';import assert from 'node:assert/strict';
import {CAMPAIGN_SAVE,createCampaignStore} from '../src/campaign/save.js';
import {createCampaignController} from '../src/campaign/controller.js';
import {initializeCampaignWorld,applyWorldCommand,validateCampaignWorld,getWorldView} from '../src/campaign/world.js';
import {tradeCampaignItem,validateCampaignEconomy} from '../src/campaign/economy.js';
// Synthetic pricing exists only in this test. Production HWII prices remain unknown.
const provenance={kind:'test_fixture',source:'campaign-integration.test.mjs'};
const catalog={id:'integration',revision:'1',provenance,bases:[{id:'tide_hook',category:'tool',toolType:'hook',provenance}]};
const vendor={id:'tools',revision:'1',provenance,cash:100,sellPrices:{tide_hook:5},buyPrices:{tide_hook:1},refresh:{intervalMinutes:1440,cash:'reset',stock:'replace'},stockCycles:[[{id:'hook',baseId:'tide_hook',quantity:1}]]};
function fixture(){const data=new Map(),storage={fail:null,getItem:key=>data.get(key)??null,setItem(key,value){if(this.fail===key)throw Error('quota');data.set(key,value);}},store=createCampaignStore(storage);const controller=createCampaignController(store,{validate:validateCampaignWorld});return {storage,store,controller};}
const buy=(save,request)=>tradeCampaignItem(save,catalog,vendor,request);
const request={transactionId:'buy-hook',direction:'buy',stockId:'hook',quantity:1};
test('bought tools update quest readiness only after the money, stock and tool commit together',async()=>{
 const f=fixture(),c=f.controller;await c.start('warrior',save=>{save.gold=10;return initializeCampaignWorld(save);});
 for(const command of [{type:'talk',npcId:'serin'},{type:'acceptQuest',questId:'lost_signal'}])assert((await c.dispatch(command,applyWorldCommand)).ok);
 f.storage.fail=CAMPAIGN_SAVE.head;assert.equal((await c.dispatch(request,buy)).code,'WRITE_FAILED');assert.deepEqual(c.snapshot().inventory.tools,[]);assert.equal(c.snapshot().gold,10);
 f.storage.fail=null;assert((await c.dispatch(request,buy)).ok);assert.equal(c.snapshot().gold,5);assert.deepEqual(c.snapshot().inventory.tools,['tide_hook']);assert.equal(c.snapshot().economy.vendors.tools.stock[0].quantity,0);
 const restored=createCampaignController(f.store,{validate:validateCampaignWorld});assert((await restored.load()).ok);assert(validateCampaignEconomy(restored.snapshot(),catalog).ok);assert((await restored.dispatch(request,buy)).replayed);assert.equal(restored.snapshot().gold,5);
 const command={type:'talk',npcId:'serin'};assert((await restored.dispatch(command,applyWorldCommand)).ok);const quest=getWorldView(restored.snapshot()).journal.find(q=>q.id==='lost_signal');assert(quest.objectives.some(o=>o.complete));
});
test('world-time rest triggers the same vendor cycle after save/reload without reopening rerolls',async()=>{
 const f=fixture(),c=f.controller;await c.start('warrior',save=>{save.gold=10;return initializeCampaignWorld(save);});await c.dispatch(request,buy);
 assert((await c.dispatch({type:'rest',minutes:1440},applyWorldCommand)).ok);
 const restored=createCampaignController(f.store,{validate:validateCampaignWorld});await restored.load();assert((await restored.dispatch({type:'talk',npcId:'mira'},applyWorldCommand)).ok);
 const second=await restored.dispatch({...request,transactionId:'buy-already-owned'},buy);assert.equal(second.code,'TOOL_ALREADY_OWNED');assert.equal(restored.snapshot().gold,5);assert.equal(restored.snapshot().world.timeMinutes,1440);
});
