import {createMainInputFixture,mainInputSource} from './support/main-input-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {mainImports} from './support/main-imports.mjs';
import {route,report,run,travel,settle} from './support/earned-route.mjs';
import {QUARRY_GROUPS,QUARRY_REWARDS} from '../src/quarry-content.js';
import {quarryObjectView} from '../src/quarry-presentation.js';
import {validateState} from '../src/state.js';
import {getRegion} from '../src/world.js';
import {emptyRecovery} from '../src/recovery.js';

// Reuses the parser-bound actual-main handler approach from the existing S/F/T
// UI integration suites. Production functions and the full click listener are
// unchanged. Only DOM/audio/scheduling are probes. Earned reducer settlements
// use scripted positions/defeats, not browser play or injected progress/rewards.
const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const copy=value=>structuredClone(value),tick=()=>new Promise(resolve=>setImmediate(resolve));
const point=id=>getRegion('ember_quarry').objects.find(object=>object.id===id);
function mainFunction(name){
 const start=new RegExp(`(?:async )?function ${name}\\(`).exec(source);assert.ok(start,name);
 for(let end=source.indexOf('}',start.index);end!==-1;end=source.indexOf('}',end+1)){
  const body=source.slice(start.index,end+1);try{new vm.Script('('+body+')');return body;}catch(error){if(!(error instanceof SyntaxError))throw error;}
 }
 assert.fail('complete production function '+name);
}
function between(start,end){const a=source.indexOf(start),b=source.indexOf(end,a+start.length);assert.ok(a>=0&&b>a,start);return source.slice(a,b);}
const names=['clearInput','flushActionSafety','panel','closePanel','report','syncVitals','dispatch','showQuarry','showObjective'];
const harnessSource=[mainInputSource,between('const config=','let controller='),between('const esc=','function clearInput('),between('const tierLabel=','const focusEvents='),...names.map(mainFunction),between("document.addEventListener('click',","document.addEventListener('change',"),'return {showQuarry,showObjective,closePanel,dispatch,get state(){return state},get battle(){return battle},get paused(){return paused}};'].join('\n');
const cache=new Map();
const acted=(s,id)=>run(s,{type:'interactQuarry',objectId:id,...report(s,point(id))}).state;
function stage(name){
 if(cache.has(name))return copy(cache.get(name));let s;
 if(name==='entry'){
  s=route().state;s=run(s,{type:'promoteAdept',...report(s,{x:260,y:325}),recovery:s.recovery??emptyRecovery()}).state;
  s=run(s,{type:'acceptQuarryQuest',...report(s,{x:450,y:325})}).state;s=travel(s,'town-quarry-entry');
 }else if(name==='tool-ready')s=settle(stage('entry'),QUARRY_GROUPS.entry);
 else if(name==='tool')s=acted(stage('tool-ready'),'quarry-tool');
 else if(name==='rescue-ready')s=settle(stage('tool'),QUARRY_GROUPS.rescue,point('quarry-rescue'));
 else if(name==='rescued')s=acted(stage('rescue-ready'),'quarry-rescue');
 else if(name==='shortcut')s=acted(stage('rescued'),'quarry-shortcut');
 else if(name==='guards-cleared')s=settle(stage('shortcut'),QUARRY_GROUPS.winch,point('quarry-winch'));
 else if(name==='anchor-a'||name==='anchor-b')s=acted(stage('guards-cleared'),'quarry-'+name);
 else if(name==='anchors')s=acted(stage('anchor-a'),'quarry-anchor-b');
 else if(name==='winch')s=acted(stage('anchors'),'quarry-winch');
 else if(name==='reported'){s=travel(stage('winch'),'quarry-town-lift');s=run(s,{type:'reportQuarryQuest',...report(s,{x:450,y:325})}).state;}
 else assert.fail('fixture stage '+name);
 assert.equal(validateState(s).ok,true);cache.set(name,copy(s));return copy(s);
}
const durable=s=>copy({character:s.character,stats:s.stats,gold:s.gold,inventory:s.inventory,objectives:s.world.objectives,receipts:s.world.claimedRewards,defeated:s.world.defeated,vitals:s.vitals,recovery:s.recovery});
async function browser(saved,{storage,seed=true}={}){
 const data=storage?.data??new Map();storage??={data,getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};
 // main.js imports createSession, so use its exact public store boundary.
 const session=mainImports.createSession(storage,{request:async(_name,_options,fn)=>fn()},{profile:'qa-quarry-completion',namespace:'qa-r12'});
 if(seed)assert.equal((await session.save(saved,{expectedRevision:0})).ok,true);
 const controller=mainImports.createController(session),loaded=await controller.load();assert.equal(loaded.ok,true);
 const handlers={},messages=[],commands=[],outcomes=[],actualDispatch=controller.dispatch;controller.dispatch=async command=>{commands.push(command);const result=await actualDispatch(command);outcomes.push(result);return result;};
 const modal={hidden:true,innerHTML:'',querySelector:()=>({focus(){}})},expertCapture=mainImports.createExpertInputCapture();
 const elements={toast:{textContent:'',classList:{add(){},remove(){}}}};
 const env={...createMainInputFixture(),...mainImports,expertCapture,expertSafety:mainImports.createActionSafety({capture:expertCapture,cancel:mainImports.cancelBattleAction}),state:loaded.state,battle:mainImports.createBattle(loaded.state),controller,
  $:id=>elements[id],noticeUntil:0,modal,paused:false,busy:false,combatSaveElapsed:0,captureBinding:null,suppressNextClick:false,last:0,saveNamespace:'qa-r12',candidate:true,
  gate:mainImports.createRuntimeGate(),router:mainImports.createInputRouter(),deferredImmediate:mainImports.createImmediateInput(),canvas:{focus(){}},audio:{cancel(){},pause(){},play(){}},toast:text=>messages.push(text),updateHud(){},document:{hidden:false,hasFocus:()=>true,addEventListener:(name,fn)=>handlers[name]=fn},
 };
 const ui=vm.compileFunction(harnessSource,Object.keys(env),{filename:'actual-main-quarry-completion-handlers.js'})(...Object.values(env));
 const click=async action=>{await handlers.click({target:{closest:()=>({disabled:false,dataset:{action}})},preventDefault(){},stopPropagation(){}});await tick();};
 const open=async id=>{Object.assign(ui.battle.p,{x:point(id).x,y:point(id).y});await ui.showQuarry(id);};
 return {ui,modal,messages,commands,outcomes,controller,storage,session,click,open};
}
const cases=[
 ['tool-ready','quarry-tool','quarry_tool_found','tool',/회수해 보유하고 있습니다.*경험치 60은 이미 받았으며 다시 지급되지 않습니다.*비소모 도구/,/동쪽 구조 구역 돌파 · 광부 구조/],
 ['rescue-ready','quarry-rescue','quarry_rescue_complete','rescue',/구조 보상은 이미 받았으며 다시 지급되지 않습니다/,/귀환 승강기 연결/],
 ['rescued','quarry-shortcut','quarry_shortcut_open',null,/연결 보상은 없으며 지역 전환 자체는 자원을 회복시키지 않습니다/,/상부 운반장 정리/],
 ['guards-cleared','quarry-anchor-a','quarry_anchor_a',null,/이미 고정했습니다.*별도 보상/,/남은 닻: 동쪽/],
 ['guards-cleared','quarry-anchor-b','quarry_anchor_b',null,/이미 고정했습니다.*별도 보상/,/남은 닻: 서쪽/],
 ['anchors','quarry-winch','quarry_winch_repaired','winch',/수리 보상과 보급품은 이미 받았으며 다시 지급되지 않습니다/,/촌장 에다에게 채석장 조사 보고/],
];
for(const [before,id,flag,reward,completed,next]of cases)test(`actual ${id} click renders completion and next step; reopen/reload never repay`,async()=>{
 const h=await browser(stage(before));await h.open(id);assert.match(h.modal.innerHTML,new RegExp(`data-action="quarry:${id}"`));const initial=durable(h.ui.state);await h.click('quarry:'+id);
 assert.equal(h.ui.state.world.objectives[flag],1);assert.match(h.modal.innerHTML,completed);assert.match(h.modal.innerHTML,next);assert.doesNotMatch(h.modal.innerHTML,new RegExp(`data-action="quarry:${id}"`));
 const paid=reward?QUARRY_REWARDS['r6:q:'+reward]:{xp:0,gold:0};assert.equal(h.ui.state.stats.earnedXp-initial.stats.earnedXp,paid.xp);assert.equal(h.ui.state.gold-initial.gold,paid.gold);
 const once=durable(h.ui.state);await h.click('quarry:'+id);assert.deepEqual(durable(h.ui.state),once);await h.click('close');await h.open(id);assert.match(h.modal.innerHTML,completed);assert.match(h.modal.innerHTML,next);assert.deepEqual(durable(h.ui.state),once);
 const reloaded=await browser(null,{storage:h.storage,seed:false});await reloaded.open(id);assert.match(reloaded.modal.innerHTML,completed);assert.match(reloaded.modal.innerHTML,next);assert.deepEqual(durable(reloaded.ui.state),once);assert.equal(reloaded.ui.state.world.claimedRewards.filter(receipt=>receipt==='r6:q:'+id.slice(7)).length,1);
});
for(const [before,id,code,copyMatch]of [
 ['entry','quarry-tool','ENTRY_GUARDS_ALIVE',/입구의 적 네 명을 처치하면 곡괭이를 회수합니다/],
 ['entry','quarry-rescue','TOOL_REQUIRED',/구조 구역의 적 네 명/],
 ['tool','quarry-rescue','RESCUE_GUARDS_ALIVE',/곡괭이로 잔해를 걷어내세요/],
 ['tool','quarry-shortcut','RESCUE_REQUIRED',/광부를 구조한 뒤/],
 ['shortcut','quarry-anchor-a','WINCH_GUARDS_ALIVE',/상부 운반장 적 네 명/],
 ['shortcut','quarry-anchor-b','WINCH_GUARDS_ALIVE',/두 닻을 각각/],
 ['anchor-a','quarry-winch','ANCHORS_REQUIRED',/서쪽·동쪽 닻을 고정하면/],
])test(`actual unfinished ${id} at ${before} keeps prerequisite copy and atomic ${code}`,async()=>{
 const h=await browser(stage(before));await h.open(id);assert.match(h.modal.innerHTML,copyMatch);assert.match(h.modal.innerHTML,new RegExp(`data-action="quarry:${id}"`));assert.doesNotMatch(h.modal.innerHTML,/이미 받았으며|이미 고정했습니다|귀환 승강기가 연결되어/);const old=durable(h.ui.state);await h.click('quarry:'+id);assert.deepEqual(durable(h.ui.state),old);assert.equal(h.outcomes.at(-1).code,code);assert.equal(h.messages.at(-1),h.outcomes.at(-1).reason);
});
test('completed anchor panels advance from remaining anchor to winch and then report',async()=>{
 const h=await browser(stage('anchor-a'));await h.open('quarry-anchor-a');assert.match(h.modal.innerHTML,/남은 닻: 동쪽/);await h.open('quarry-anchor-b');await h.click('quarry:quarry-anchor-b');assert.match(h.modal.innerHTML,/북동쪽 운반기를 직접 수리/);await h.open('quarry-anchor-a');assert.match(h.modal.innerHTML,/북동쪽 운반기를 직접 수리/);await h.open('quarry-winch');await h.click('quarry:quarry-winch');for(const id of ['quarry-tool','quarry-rescue','quarry-shortcut','quarry-anchor-a','quarry-anchor-b']){await h.open(id);assert.match(h.modal.innerHTML,/촌장 에다에게 채석장 조사 보고/);assert.doesNotMatch(h.modal.innerHTML,/남은 닻:|상부 적 \d명을 처치하세요/);}
});
for(const [,id]of cases)test(`reported return to ${id} does not request quarry report or past tasks again`,async()=>{
 const s=travel(stage('reported'),'town-quarry-lift'),h=await browser(s),before=durable(s);await h.open(id);assert.match(h.modal.innerHTML,/채석장 조사 보고까지 마쳤습니다.*현재 목표에서 다음 조사/);assert.doesNotMatch(h.modal.innerHTML,/에다에게 보고하면|적 네 명을 처치|두 닻을 각각|체인을 연결하면|무료로 수리합니다/);assert.doesNotMatch(h.modal.innerHTML,new RegExp(`data-action="quarry:${id}"`));assert.deepEqual(durable(h.ui.state),before);
});
test('presentation reads completed snapshots without mutating any state or one-time reward receipt',()=>{
 for(const name of ['tool','rescued','shortcut','anchor-a','anchor-b','anchors','winch','reported']){const state=stage(name),before=copy(state);for(const [,id]of cases){quarryObjectView(state,point(id));quarryObjectView(state,point(id));}assert.deepEqual(state,before);}
});
test('completed anchors guide only the unfinished side and then winch even without optional shortcut',async()=>{
 let s=settle(stage('rescued'),QUARRY_GROUPS.winch,point('quarry-winch'));s=acted(s,'quarry-anchor-b');const h=await browser(s);await h.open('quarry-anchor-b');assert.match(h.modal.innerHTML,/남은 닻: 서쪽.*아직 고정하지 않은 닻만/);assert.doesNotMatch(h.modal.innerHTML,/둘 다 고정하세요|귀환 승강기 연결/);await h.open('quarry-anchor-a');await h.click('quarry:quarry-anchor-a');assert.match(h.modal.innerHTML,/북동쪽 운반기를 직접 수리/);assert.equal(h.ui.state.world.objectives.quarry_shortcut_open,0);
});
test('unfinished and completed lift copy limits no-recovery statement to the region transition itself',async()=>{
 for(const [name,id]of [['rescued','quarry-shortcut'],['shortcut','quarry-shortcut'],['rescued','quarry-tool']]){const h=await browser(stage(name));await h.open(id);assert.match(h.modal.innerHTML,/지역 전환 자체는 자원을 회복시키지 않습니다/);assert.doesNotMatch(h.modal.innerHTML,/자동 자원 회복은 없습니다|연결 비용·보상·자원 회복은 없습니다|보상·회복은 없으며/);if(name==='rescued'){await h.click('objective');assert.match(h.modal.innerHTML,/지역 전환 자체는 자원을 회복시키지 않습니다/);assert.doesNotMatch(h.modal.innerHTML,/보상·회복은 없으며/);}}
});
