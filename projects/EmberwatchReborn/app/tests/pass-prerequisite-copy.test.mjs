import {createMainInputFixture,mainInputSource} from './support/main-input-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {mainImports} from './support/main-imports.mjs';
import {earnedQuarryRoute} from './support/earned-quarry-route.mjs';
import {report,run,travel,settle} from './support/earned-route.mjs';
import {PASS_REGIONS,PASS_GROUPS,PASS_REWARDS,PASS_SEQUENCE} from '../src/pass-content.js';
import {passObjectView} from '../src/pass-presentation.js';

// Real main panel/click/controller/store handlers; DOM/audio are probes.
// Earned fixtures use scripted positions and defeat reports, never injected
// XP, quest flags or receipts. This is not browser or normal-input play proof.
const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const copy=value=>structuredClone(value),tick=()=>new Promise(resolve=>setImmediate(resolve));
const point=id=>PASS_REGIONS.ashwind_pass.objects.find(object=>object.id===id);
function mainFunction(name){
 const start=new RegExp(`(?:async )?function ${name}\\(`).exec(source);assert.ok(start,name);
 for(let end=source.indexOf('}',start.index);end!==-1;end=source.indexOf('}',end+1)){
  const body=source.slice(start.index,end+1);try{new vm.Script('('+body+')');return body;}catch(error){if(!(error instanceof SyntaxError))throw error;}
 }
 assert.fail('complete production function '+name);
}
function between(start,end){const a=source.indexOf(start),b=source.indexOf(end,a+start.length);assert.ok(a>=0&&b>a,start);return source.slice(a,b);}
const names=['clearInput','flushActionSafety','panel','closePanel','report','syncVitals','dispatch','showPass'];
const harnessSource=[mainInputSource,between('const config=','let controller='),between('const esc=','function clearInput('),between('const tierLabel=','const focusEvents='),...names.map(mainFunction),between("document.addEventListener('click',","document.addEventListener('change',"),'return {showPass,get state(){return state},get battle(){return battle}};'].join('\n');
const cache=new Map(),acted=(s,id)=>run(s,{type:'interactPass',objectId:id,...report(s,point(id))}).state;
function stage(name){
 if(cache.has(name))return copy(cache.get(name));let s;
 if(name==='entry'){s=earnedQuarryRoute('normal',{full:false});s=run(s,{type:'acceptPassQuest',...report(s,{x:450,y:325})}).state;s=travel(s,'town-pass-entry');}
 else if(name==='clue')s=acted(settle(stage('entry'),PASS_GROUPS.entry),'pass-clue');
 else if(name==='rescued')s=acted(settle(stage('clue'),PASS_GROUPS.rescue,point('pass-rescue')),'pass-rescue');
 else if(name==='two-defeats'||name==='four-defeats'||name==='ready')s=settle(stage('rescued'),PASS_GROUPS.signal.slice(0,name==='two-defeats'?2:name==='four-defeats'?4:5),point('pass-signal-wind'));
 else if(name==='aligned'){s=stage('ready');for(const rune of PASS_SEQUENCE)s=acted(s,'pass-signal-'+rune);}
 else if(name==='reported'){s=travel(stage('aligned'),'pass-town-return');s=run(s,{type:'reportPassQuest',...report(s,{x:450,y:325})}).state;s=travel(s,'town-pass-entry');}
 else assert.fail('fixture stage '+name);
 cache.set(name,copy(s));return copy(s);
}
const durable=s=>copy({character:s.character,stats:s.stats,gold:s.gold,inventory:s.inventory,objectives:s.world.objectives,receipts:s.world.claimedRewards,defeated:s.world.defeated,vitals:s.vitals,recovery:s.recovery});
async function harness(saved,{storage,seed=true}={}){
 const data=storage?.data??new Map();storage??={data,getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};
 const session=mainImports.createSession(storage,{request:async(_name,_options,fn)=>fn()},{profile:'qa-pass-copy',namespace:'qa-r12'});
 if(seed)assert.equal((await session.save(saved,{expectedRevision:0})).ok,true);
 const controller=mainImports.createController(session),loaded=await controller.load();assert.equal(loaded.ok,true);
 const handlers={},outcomes=[],messages=[],originalDispatch=controller.dispatch;controller.dispatch=async command=>{const result=await originalDispatch(command);outcomes.push(result);return result;};
 const modal={hidden:true,innerHTML:'',querySelector:()=>({focus(){}})},expertCapture=mainImports.createExpertInputCapture();
 const elements={toast:{textContent:'',classList:{add(){},remove(){}}}};
 const env={...createMainInputFixture(),...mainImports,expertCapture,expertSafety:mainImports.createActionSafety({capture:expertCapture,cancel:mainImports.cancelBattleAction}),state:loaded.state,battle:mainImports.createBattle(loaded.state),controller,
  $:id=>elements[id],noticeUntil:0,modal,paused:false,busy:false,combatSaveElapsed:0,captureBinding:null,suppressNextClick:false,last:0,saveNamespace:'qa-r12',candidate:true,
  gate:mainImports.createRuntimeGate(),router:mainImports.createInputRouter(),deferredImmediate:mainImports.createImmediateInput(),canvas:{focus(){}},audio:{pause(){},play(){}},toast:text=>messages.push(text),updateHud(){},document:{hidden:false,hasFocus:()=>true,addEventListener:(name,fn)=>handlers[name]=fn},
 };
 const ui=vm.compileFunction(harnessSource,Object.keys(env),{filename:'actual-main-pass-prerequisite-handlers.js'})(...Object.values(env));
 const click=async action=>{await handlers.click({target:{closest:()=>({disabled:false,dataset:{action}})},preventDefault(){},stopPropagation(){}});await tick();};
 const open=async rune=>{const object=point('pass-signal-'+rune);Object.assign(ui.battle.p,{x:object.x,y:object.y});await ui.showPass(object.id);};
 return {ui,modal,outcomes,messages,storage,click,open};
}
for(const [name,pattern,code] of [
 ['entry',/비문 확인과 길잡이 구조가 필요합니다\. 신호대 적 5\/5명이 남았습니다\./,'CLUE_REQUIRED'],
 ['clue',/길잡이 구조가 필요합니다\. 신호대 적 5\/5명이 남았습니다\./,'RESCUE_REQUIRED'],
 ['rescued',/길잡이 구조 완료\. 신호대에 남은 적 5\/5명을 처치하세요\./,'SIGNAL_GUARDS_ALIVE'],
 ['two-defeats',/길잡이 구조 완료\. 신호대에 남은 적 3\/5명을 처치하세요\./,'SIGNAL_GUARDS_ALIVE'],
 ['four-defeats',/길잡이 구조 완료\. 신호대에 남은 적 1\/5명을 처치하세요\./,'SIGNAL_GUARDS_ALIVE'],
])test(`actual signal panel at ${name} identifies only unfinished prerequisites and preserves ${code}`,async()=>{
 const h=await harness(stage(name));await h.open('wind');assert.match(h.modal.innerHTML,pattern);assert.match(h.modal.innerHTML,/data-action="pass:pass-signal-wind"/);assert.doesNotMatch(h.modal.innerHTML,/신호를 맞출 수 있습니다/);
 const before=durable(h.ui.state);await h.click('pass:pass-signal-wind');assert.equal(h.outcomes.at(-1).code,code);assert.deepEqual(durable(h.ui.state),before);assert.match(h.modal.innerHTML,pattern);
});
test('ready, partial, reset and reloaded actual panels retain readiness without repeating completed prerequisites',async()=>{
 let h=await harness(stage('ready'));await h.open('wind');const before=durable(h.ui.state);
 const ready=()=>{assert.match(h.modal.innerHTML,/길잡이 구조·신호대 전투 완료\. 신호를 맞출 수 있습니다\./);assert.doesNotMatch(h.modal.innerHTML,/구조가 필요|적 다섯 명 처치가 필요|남은 적 .*명을 처치/);};
 ready();assert.match(h.modal.innerHTML,/정렬 0\/3\. 다음은 바람\./);await h.click('pass:pass-signal-wind');ready();assert.match(h.modal.innerHTML,/정렬 1\/3\. 다음은 불꽃\./);
 await h.click('pass:pass-signal-wind');ready();assert.match(h.modal.innerHTML,/정렬 0\/3\. 다음은 바람\./);assert.deepEqual(durable(h.ui.state),before,'wrong order resets only the puzzle step and grants nothing');
 await h.click('pass:pass-signal-wind');await h.open('ember');await h.click('pass:pass-signal-ember');ready();assert.match(h.modal.innerHTML,/정렬 2\/3\. 다음은 돌\./);
 const partial=durable(h.ui.state);await h.click('close');await h.open('stone');ready();assert.deepEqual(durable(h.ui.state),partial);
 h=await harness(null,{storage:h.storage,seed:false});await h.open('stone');ready();assert.match(h.modal.innerHTML,/정렬 2\/3\. 다음은 돌\./);assert.deepEqual(durable(h.ui.state),partial);
 const reward=PASS_REWARDS['r7:p:align'];await h.click('pass:pass-signal-stone');assert.match(h.modal.innerHTML,/세 신호의 정렬이 완료되었습니다.*정렬 보상은 이미 받았습니다.*마을 에다에게 돌아가 조사 결과를 보고하세요/);assert.doesNotMatch(h.modal.innerHTML,/data-action="pass:|신호를 맞출 수 있습니다|필요합니다/);
 assert.equal(h.ui.state.stats.earnedXp-partial.stats.earnedXp,reward.xp);assert.equal(h.ui.state.gold-partial.gold,reward.gold);assert.equal(h.ui.state.world.claimedRewards.filter(id=>id==='r7:p:align').length,1);
 const aligned=durable(h.ui.state);await h.click('pass:pass-signal-stone');assert.equal(h.outcomes.at(-1).code,'ALREADY_CLAIMED');assert.deepEqual(durable(h.ui.state),aligned);
 h=await harness(null,{storage:h.storage,seed:false});for(const rune of PASS_SEQUENCE){await h.open(rune);assert.match(h.modal.innerHTML,/정렬 완료.*정렬 보상은 이미 받았습니다.*조사 결과를 보고하세요/);assert.doesNotMatch(h.modal.innerHTML,/data-action="pass:/);}assert.deepEqual(durable(h.ui.state),aligned);
});
test('reported return panels retain completed report without asking for past work or paying again',async()=>{
 const h=await harness(stage('reported')),before=durable(h.ui.state);for(const rune of PASS_SEQUENCE){await h.open(rune);assert.match(h.modal.innerHTML,/정렬 보상은 이미 받았습니다\. 마을 보고까지 마쳤습니다\./);assert.doesNotMatch(h.modal.innerHTML,/data-action="pass:|보고하세요|필요합니다|처치하세요/);await h.click('pass:pass-signal-'+rune);assert.equal(h.outcomes.at(-1).code,'ALREADY_CLAIMED');}assert.deepEqual(durable(h.ui.state),before);
});
test('all prerequisite and completion views are read-only across the three signal objects',()=>{
 for(const name of ['entry','clue','rescued','two-defeats','four-defeats','ready','aligned','reported']){const state=stage(name),before=copy(state);for(const rune of PASS_SEQUENCE){passObjectView(state,point('pass-signal-'+rune));passObjectView(state,point('pass-signal-'+rune));}assert.deepEqual(state,before);}
});
