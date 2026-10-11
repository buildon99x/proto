import {createMainInputFixture,mainInputSource} from './support/main-input-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {mainImports} from './support/main-imports.mjs';
import {earnedPassRoute} from './support/earned-pass-route.mjs';
import {report,run,travel,settle} from './support/earned-route.mjs';
import {SIGNAL_REGIONS,SIGNAL_GROUPS,SIGNAL_REWARDS,SIGNAL_ROUTES} from '../src/signal-content.js';
import {signalObjectView,signalGuidance,signalBlacksmithView} from '../src/signal-presentation.js';

// Real main panel/click/controller/store handlers; DOM/audio are probes.
// Earned fixtures use scripted positions and defeat reports, never injected
// XP, quest flags or receipts. This is not browser or normal-input play proof.
const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const copy=value=>structuredClone(value),tick=()=>new Promise(resolve=>setImmediate(resolve));
const point=id=>SIGNAL_REGIONS.signal_basin.objects.find(object=>object.id===id);
function mainFunction(name){
 const start=new RegExp(`(?:async )?function ${name}\\(`).exec(source);assert.ok(start,name);
 for(let end=source.indexOf('}',start.index);end!==-1;end=source.indexOf('}',end+1)){
  const body=source.slice(start.index,end+1);try{new vm.Script('('+body+')');return body;}catch(error){if(!(error instanceof SyntaxError))throw error;}
 }
 assert.fail('complete production function '+name);
}
function between(start,end){const a=source.indexOf(start),b=source.indexOf(end,a+start.length);assert.ok(a>=0&&b>a,start);return source.slice(a,b);}
const names=['clearInput','flushActionSafety','panel','closePanel','report','syncVitals','dispatch','showSignal','showEquipment'];
const harnessSource=[mainInputSource,between('const config=','let controller='),between('const esc=','function clearInput('),between('const tierLabel=','const focusEvents='),between('const statNames=','let equipmentStation='),...names.map(mainFunction),between("document.addEventListener('click',","document.addEventListener('change',"),'return {showSignal,showEquipment,dispatch,get state(){return state},get battle(){return battle}};'].join('\n');
const cache=new Map(),acted=(s,id)=>run(s,{type:'interactSignal',objectId:id,...report(s,point(id))}).state;
function stage(name,direction='west'){
 const key=name+':'+direction;if(cache.has(key))return copy(cache.get(key));let s;
 if(name==='entry'){s=earnedPassRoute('normal',{full:false});s=run(s,{type:'acceptSignalQuest',...report(s,{x:250,y:470})}).state;s=travel(s,'town-signal-entry');}
 else if(name==='entry-partial'||name==='decode-ready')s=settle(stage('entry',direction),SIGNAL_GROUPS.entry.slice(0,name==='entry-partial'?3:6),point('signal-code'));
 else if(name==='decoded')s=acted(stage('decode-ready',direction),'signal-code');
 else if(name==='routed'){s=stage('decoded',direction);for(const node of SIGNAL_ROUTES[direction].order)s=acted(s,'signal-route-'+node);}
 else if(name==='yard-partial'||name==='transmitter-ready')s=settle(stage('routed',direction),SIGNAL_GROUPS.yard.slice(0,name==='yard-partial'?4:6),point('signal-transmitter'));
 else if(name==='transmitted')s=acted(stage('transmitter-ready',direction),'signal-transmitter');
 else if(name==='receiver-partial'||name==='receiver-ready')s=settle(stage('transmitted',direction),SIGNAL_GROUPS.receiver.slice(0,name==='receiver-partial'?3:4),point('signal-receiver'));
 else if(name==='restored')s=acted(stage('receiver-ready',direction),'signal-receiver');
 else if(name==='reported'){s=travel(stage('restored',direction),'signal-town-return');s=run(s,{type:'reportSignalQuest',...report(s,{x:250,y:470})}).state;s=travel(s,'town-signal-entry');}
 else assert.fail('fixture stage '+name);
 cache.set(key,copy(s));return copy(s);
}
const durable=s=>copy({character:s.character,stats:s.stats,gold:s.gold,inventory:s.inventory,objectives:s.world.objectives,receipts:s.world.claimedRewards,defeated:s.world.defeated,vitals:s.vitals,recovery:s.recovery});
async function harness(saved,{storage,seed=true}={}){
 const data=storage?.data??new Map();storage??={data,getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};
 const session=mainImports.createSession(storage,{request:async(_name,_options,fn)=>fn()},{profile:'qa-signal-copy',namespace:'qa-r12'});
 if(seed)assert.equal((await session.save(saved,{expectedRevision:0})).ok,true);
 const controller=mainImports.createController(session),loaded=await controller.load();assert.equal(loaded.ok,true);
 const handlers={},outcomes=[],messages=[],originalDispatch=controller.dispatch;controller.dispatch=async command=>{const result=await originalDispatch(command);outcomes.push(result);return result;};
 const modal={hidden:true,innerHTML:'',querySelector:()=>({focus(){}})},expertCapture=mainImports.createExpertInputCapture();
 const env={...createMainInputFixture(),...mainImports,expertCapture,expertSafety:mainImports.createActionSafety({capture:expertCapture,cancel:mainImports.cancelBattleAction}),state:loaded.state,battle:mainImports.createBattle(loaded.state),controller,
  modal,paused:false,busy:false,combatSaveElapsed:0,captureBinding:null,equipmentStation:null,suppressNextClick:false,last:0,saveNamespace:'qa-r12',candidate:true,
  gate:mainImports.createRuntimeGate(),router:mainImports.createInputRouter(),deferredImmediate:mainImports.createImmediateInput(),canvas:{focus(){}},audio:{pause(){},play(){}},toast:text=>messages.push(text),updateHud(){},document:{hidden:false,hasFocus:()=>true,addEventListener:(name,fn)=>handlers[name]=fn},
 };
 const ui=vm.compileFunction(harnessSource,Object.keys(env),{filename:'actual-main-signal-prerequisite-handlers.js'})(...Object.values(env));
 const click=async action=>{await handlers.click({target:{closest:()=>({disabled:false,dataset:{action}})},preventDefault(){},stopPropagation(){}});await tick();};
 const open=async id=>{const object=point(id);Object.assign(ui.battle.p,{x:object.x,y:object.y});await ui.showSignal(id);};
 return {ui,modal,outcomes,messages,storage,session,click,open};
}
const prerequisites=[
 ['entry','signal-code',/입구에 남은 적 6\/6명을 처치하세요\./,'ENTRY_GUARDS_ALIVE'],
 ['entry-partial','signal-code',/입구에 남은 적 3\/6명을 처치하세요\./,'ENTRY_GUARDS_ALIVE'],
 ['entry','signal-route-transmitter',/먼저 .*신호를 해독하세요\./,'DECODE_REQUIRED'],
 ['entry','signal-transmitter',/먼저 .*신호를 해독하세요\./,'DECODE_REQUIRED'],
 ['decoded','signal-transmitter',/해독 완료\. 두 레버 순서로 접근로를 고르세요\. 순서 0\/2/,'ROUTE_REQUIRED'],
 ['routed','signal-transmitter',/서쪽 접근로 선택 완료\. 중계장에 남은 적 6\/6명을 처치하세요\./,'YARD_GUARDS_ALIVE'],
 ['yard-partial','signal-transmitter',/서쪽 접근로 선택 완료\. 중계장에 남은 적 2\/6명을 처치하세요\./,'YARD_GUARDS_ALIVE'],
 ['routed','signal-receiver',/먼저 중앙 폐허 남쪽 송신기를 복원하세요\./,'TRANSMITTER_REQUIRED'],
 ['transmitted','signal-receiver',/송신기 복원 완료\. 수신탑에 남은 파수병 4\/4명을 처치하세요\./,'RECEIVER_GUARDS_ALIVE'],
 ['receiver-partial','signal-receiver',/송신기 복원 완료\. 수신탑에 남은 파수병 1\/4명을 처치하세요\./,'RECEIVER_GUARDS_ALIVE'],
 ['entry','signal-shortcut',/먼저 .*신호를 해독하세요\./,'DECODE_REQUIRED'],
];
for(const [name,id,pattern,code] of prerequisites)test(`actual ${id} panel at ${name} shows remaining work and preserves ${code}`,async()=>{
 const h=await harness(stage(name));await h.open(id);assert.match(h.modal.innerHTML,pattern);assert.ok(h.modal.innerHTML.includes(`data-action="signal:${id}"`));
 const before=copy(h.ui.state),bytes=new Map(h.storage.data);await h.click('signal:'+id);
 assert.equal(h.outcomes.at(-1).code,code);assert.deepEqual(h.ui.state,before);assert.deepEqual(h.storage.data,bytes);assert.match(h.modal.innerHTML,pattern);
});
for(const [name,id,pattern,receipt,label] of [
 ['decode-ready','signal-code',/입구 전투 완료\. 해독판에서 신호를 해독할 수 있습니다\./,'r8:s:decode','해독판 다시 읽기'],
 ['transmitter-ready','signal-transmitter',/접근로 선택·중계장 전투 완료\. 송신기를 복원할 수 있습니다\./,'r8:s:transmitter',null],
 ['receiver-ready','signal-receiver',/송신기 복원·파수병 처치 완료\. 수신기를 복원할 수 있습니다\./,'r8:s:receiver',null],
])test(`actual ready ${id} panel pays once and persists its completed copy`,async()=>{
 let h=await harness(stage(name));await h.open(id);assert.match(h.modal.innerHTML,pattern);assert.doesNotMatch(h.modal.innerHTML,/남은 (?:적|파수병)|0\/\d+명을 처치|먼저 .*복원하세요|접근로를 고르세요/);
 const before=durable(h.ui.state),reward=SIGNAL_REWARDS[receipt];await h.click('signal:'+id);
 assert.equal(h.ui.state.stats.earnedXp-before.stats.earnedXp,reward.xp);assert.equal(h.ui.state.gold-before.gold,reward.gold);
 for(const field of ['materials','consumables'])for(const [key,amount]of Object.entries(reward[field]))assert.equal((h.ui.state.inventory[field][key]??0)-(before.inventory[field][key]??0),amount);
 assert.equal(h.ui.state.world.claimedRewards.filter(value=>value===receipt).length,1);assert.match(h.modal.innerHTML,/이미 받았습니다/);
 if(label)assert.match(h.modal.innerHTML,new RegExp(label));else assert.doesNotMatch(h.modal.innerHTML,/data-action="signal:/);
 const completed=copy(h.ui.state);await h.click('signal:'+id);assert.equal(h.outcomes.at(-1).ok,!!label);if(!label)assert.equal(h.outcomes.at(-1).code,'ALREADY_CLAIMED');assert.deepEqual(h.ui.state,completed);
 h=await harness(null,{storage:h.storage,seed:false});await h.open(id);assert.match(h.modal.innerHTML,/이미 받았습니다/);assert.deepEqual(h.ui.state,completed);
});
for(const direction of ['west','east'])test(`actual ${direction} lever copy survives reset/reload and preserves exclusive selection`,async()=>{
 let h=await harness(stage('decoded'));const [first,second]=SIGNAL_ROUTES[direction].order;await h.open('signal-route-'+first);assert.match(h.modal.innerHTML,/순서 0\/2/);
 const before=durable(h.ui.state);await h.click('signal:signal-route-'+first);assert.match(h.modal.innerHTML,/순서 1\/2/);
 await h.click('signal:signal-route-'+first);assert.match(h.modal.innerHTML,/순서 0\/2/);assert.deepEqual(durable(h.ui.state),before);
 await h.click('signal:signal-route-'+first);const partial=durable(h.ui.state);await h.click('close');await h.open('signal-code');assert.match(h.modal.innerHTML,/순서 1\/2/);
 h=await harness(null,{storage:h.storage,seed:false});await h.open('signal-route-'+second);assert.match(h.modal.innerHTML,/순서 1\/2/);assert.deepEqual(durable(h.ui.state),partial);
 await h.click('signal:signal-route-'+second);assert.match(h.modal.innerHTML,new RegExp((direction==='west'?'서쪽':'동쪽')+' 접근로를 연결했습니다.*선택은 고정'));
 assert.doesNotMatch(h.modal.innerHTML,/data-action="signal:|미완료 순서|순서 0\/2|누르면/);assert.equal(h.ui.state.world.objectives.signal_west_open+h.ui.state.world.objectives.signal_east_open,1);
 assert.equal(h.ui.state.world.claimedRewards.filter(id=>id.startsWith('r8:s:route-')).length,1);assert.equal(h.ui.state.gold,before.gold);assert.equal(h.ui.state.stats.earnedXp,before.stats.earnedXp);
 const selected=durable(h.ui.state);for(const node of [first,second]){await h.open('signal-route-'+node);await h.click('signal:signal-route-'+node);assert.equal(h.outcomes.at(-1).code,'ALREADY_OPEN');}assert.deepEqual(durable(h.ui.state),selected);
 h=await harness(null,{storage:h.storage,seed:false});await h.open('signal-transmitter');assert.match(h.modal.innerHTML,new RegExp((direction==='west'?'서쪽':'동쪽')+' 접근로 선택 완료'));
});
test('actual optional lift stays optional, grants nothing and scopes resource copy to region transition',async()=>{
 let h=await harness(stage('decoded'));
 // Explicit already-paid live resource boundary, not progression evidence.
 h.ui.battle.p.hp-=3;h.ui.battle.p.mana-=2;h.ui.battle.p.stamina-=4;h.ui.battle.p.cooldowns.righteous_hammer=1.7;h.ui.battle.p.recoveryLock=.4;h.ui.battle.p.manaDelay=.8;
 await h.open('signal-shortcut');assert.match(h.modal.innerHTML,/해독 완료\. 지금 무료로 연결할 수 있습니다/);
 assert.match(h.modal.innerHTML,/지역 전환 자체는 자원을 회복하거나 쿨다운을 초기화하지 않습니다\. 보행 중에는 기존 회복·쿨다운 규칙이 적용됩니다\./);
 const before=durable(h.ui.state);await h.click('signal:signal-shortcut');assert.match(h.modal.innerHTML,/마을과 입구 동쪽이 연결되었습니다/);assert.doesNotMatch(h.modal.innerHTML,/data-action="signal:/);
 assert.equal(h.ui.state.gold,before.gold);assert.equal(h.ui.state.stats.earnedXp,before.stats.earnedXp);assert.deepEqual(h.ui.state.vitals,before.vitals);assert.deepEqual(h.ui.state.recovery,before.recovery);assert.equal(h.ui.state.world.objectives.signal_route_ready,0);
 assert.match(signalGuidance(h.ui.state).detail,/동쪽 승강기는 이미 연결되어 있습니다/);
 const connected=durable(h.ui.state);await h.click('signal:signal-shortcut');assert.equal(h.outcomes.at(-1).code,'ALREADY_OPEN');assert.deepEqual(durable(h.ui.state),connected);
 for(const portalId of ['signal-town-shortcut','town-signal-shortcut']){
  const portal=mainImports.getRegion(h.ui.state.world.region).portals.find(row=>row.id===portalId);Object.assign(h.ui.battle.p,{x:portal.x,y:portal.y});
  assert.equal(await h.ui.dispatch({type:'travel',portalId,to:portal.to,...mainImports.battleReport(h.ui.battle)},{rebuild:true}),true);assert.deepEqual(durable(h.ui.state),connected);
  if(h.ui.state.world.region==='ash_hamlet')assert.match(signalGuidance(h.ui.state).detail,/지역 전환 자체는.*보행 중에는 기존/);
 }
 h=await harness(null,{storage:h.storage,seed:false});await h.open('signal-shortcut');assert.match(h.modal.innerHTML,/연결 완료/);assert.deepEqual(durable(h.ui.state),connected);
});
test('actual report click without the optional lift pays once and all returned devices acknowledge completion',async()=>{
 let h=await harness(stage('restored'));await h.open('signal-receiver');assert.match(h.modal.innerHTML,/마을 대장장이 오린에게 보고하세요/);assert.equal(h.ui.state.world.objectives.signal_shortcut_open,0);
 const portal=mainImports.getRegion('signal_basin').portals.find(row=>row.id==='signal-town-return');Object.assign(h.ui.battle.p,{x:portal.x,y:portal.y});
 assert.equal(await h.ui.dispatch({type:'travel',portalId:portal.id,to:portal.to,...mainImports.battleReport(h.ui.battle)},{rebuild:true}),true);
 Object.assign(h.ui.battle.p,{x:250,y:470});h.ui.showEquipment('blacksmith');assert.match(h.modal.innerHTML,/data-action="signal-report"/);
 const before=durable(h.ui.state);await h.click('signal-report');assert.match(h.modal.innerHTML,/신호 복원 · 보고 완료/);assert.doesNotMatch(h.modal.innerHTML,/data-action="signal-report"/);
 assert.equal(h.ui.state.stats.earnedXp-before.stats.earnedXp,SIGNAL_REWARDS['r8:s:report'].xp);assert.equal(h.ui.state.gold-before.gold,SIGNAL_REWARDS['r8:s:report'].gold);
 const reported=durable(h.ui.state);await h.click('signal-report');assert.equal(h.outcomes.at(-1).code,'ALREADY_CLAIMED');assert.deepEqual(durable(h.ui.state),reported);
 h=await harness(null,{storage:h.storage,seed:false});h.ui.showEquipment('blacksmith');assert.match(h.modal.innerHTML,/신호 복원 · 보고 완료/);assert.deepEqual(durable(h.ui.state),reported);
 const entry=mainImports.getRegion('ash_hamlet').portals.find(row=>row.id==='town-signal-entry');Object.assign(h.ui.battle.p,{x:entry.x,y:entry.y});
 assert.equal(await h.ui.dispatch({type:'travel',portalId:entry.id,to:entry.to,...mainImports.battleReport(h.ui.battle)},{rebuild:true}),true);
 for(const id of ['signal-transmitter','signal-receiver']){await h.open(id);assert.match(h.modal.innerHTML,/이미 받았습니다.*오린에게 보고까지 마쳤습니다/);assert.doesNotMatch(h.modal.innerHTML,/data-action="signal:|처치하세요|보고하세요|복원하세요/);await h.click('signal:'+id);assert.equal(h.outcomes.at(-1).code,'ALREADY_CLAIMED');}assert.deepEqual(durable(h.ui.state),reported);
});
test('all views are read-only and completed fights never ask to defeat zero enemies',()=>{
 for(const name of ['entry','entry-partial','decode-ready','decoded','routed','yard-partial','transmitter-ready','transmitted','receiver-partial','receiver-ready','restored','reported']){
  const s=stage(name),before=copy(s);for(const object of SIGNAL_REGIONS.signal_basin.objects){signalObjectView(s,object);signalObjectView(s,object);}signalBlacksmithView(s);const guidance=signalGuidance(s);assert.doesNotMatch(guidance.detail,/(?:적|파수병) 0(?:\/\d+)?명을 처치/);assert.deepEqual(s,before);
  if(['decode-ready','transmitter-ready','receiver-ready'].includes(name))assert.match(guidance.detail,/완료.*(?:해독|복원)할 수 있습니다/);
 }
});
