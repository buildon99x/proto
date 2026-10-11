import {createMainInputFixture,mainInputSource} from './support/main-input-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createSession} from '../src/save.js';
import {createController as productionController} from '../src/controller.js';
import {createBattle,clearBattleIntent,cancelBattleAction} from '../src/combat.js';
import {battleReport} from '../src/recovery.js';
import {createRuntimeGate} from '../src/runtime-gate.js';
import {createExpertInputCapture} from '../src/expert-input.js';
import {createActionSafety} from '../src/action-safety.js';
import {copyReleaseQaProfile} from '../src/candidate-profile.js';
import {editableTarget,createInputRouter,rebindControl,poeControlPreset,restorePriorControls} from '../src/controls.js';
import {createState,reduceRuntime} from '../src/state.js';
import {createStore,profileKeys} from '../src/save.js';
const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const next=()=>new Promise(resolve=>setImmediate(resolve));
const copy=structuredClone;
function fn(name){const match=new RegExp(`(?:async )?function ${name}\\(`).exec(source);assert.ok(match,name);for(let end=source.indexOf('}',match.index);end>=0;end=source.indexOf('}',end+1)){const text=source.slice(match.index,end+1);try{new vm.Script('('+text+')');return text;}catch(error){if(!(error instanceof SyntaxError))throw error;}}throw Error(name);}
const declaration=name=>source.split('\n').find(line=>line.startsWith('const '+name+'='));
const namespace='qa-r11',a='qa-load-a',b='qa-load-b';
function trained(){let r=reduceRuntime(createState(),{type:'trainStarter',position:{x:260,y:325}});assert.equal(r.ok,true);const battle=createBattle(r.state);r=reduceRuntime(r.state,{type:'checkpoint',...battleReport(battle),vitals:{hp:7,mana:3,stamina:5}});assert.equal(r.ok,true);return r.state;}
// Execute real profile loader/title/report, controller, store and WebLock-backed
// session. Only browser/audio boundaries and explicit delayed reads are probes.
// This is an asynchronous handler reproduction, not a live R11 exploit claim.
function harness({namespace='qa-r11'}={}){
 const data=new Map(),writes=[],lockCalls=[],controllers=[],loads=new Map(),pendingLocks=new Map();
 const storage={getItem:key=>data.get(key)??null,setItem:(key,value)=>{writes.push({key,value});data.set(key,value);}},store=name=>createStore(storage,{profile:name,namespace});
 const delayedLocks=new Set(),locks={request(key,_options,callback){lockCalls.push(key);if(!delayedLocks.has(key))return Promise.resolve(callback());delayedLocks.delete(key);return new Promise((resolve,reject)=>pendingLocks.set(key,{callback,resolve,reject}));}};
 const delayedReads=new Set();
 const createController=store=>{const owner=productionController(store);controllers.push(owner);const load=owner.load;owner.load=async()=>{const result=await load();if(!delayedReads.has(store.keys.head))return result;delayedReads.delete(store.keys.head);return new Promise((resolve,reject)=>loads.set(store.keys.head,{result,resolve,reject}));};return owner;};
 const handlers={},calls=[],elements={hud:{hidden:true},toast:{textContent:''},profile:{value:a},sourceProfile:{value:'qa-copy-source'},sourceNamespace:{value:'qa-r10'},difficulty:{value:'normal'},newControlsPreset:{value:'unchanged'}},modal={hidden:false,innerHTML:'initial title',presentationEpoch:0,querySelector:()=>({focus(){}})},expertCapture=createExpertInputCapture(),expertSafety=createActionSafety({capture:expertCapture,cancel:cancelBattleAction});
 const env={...createMainInputFixture(),createSession,createController,createBattle,clearBattleIntent,battleReport,copyReleaseQaProfile,editableTarget,controller:null,profile:null,state:null,battle:null,paused:true,busy:false,localStorage:storage,navigator:{locks},saveNamespace:namespace,candidate:true,gate:createRuntimeGate(),modal,
  suppressNextClick:false,document:{addEventListener:(name,handler)=>handlers[name]=handler},window:{addEventListener:(name,handler)=>handlers[name]=handler},captureBinding:null,expertSafety,expertCapture,deferredImmediate:{clear(){}},router:createInputRouter(),config:()=>{throw new Error('title keyboard must remain modal-owned');},input:{aim:null,pointerScreen:null},noticeUntil:0,displayTime:0,combatTime:0,menuTime:0,walkTime:0,arrivalWaitTime:0,
  $:id=>elements[id],audio:{pause:v=>calls.push(['pause',v]),setMasterVolume:v=>calls.push(['volume',v]),setEnabled:v=>calls.push(['enabled',v])},toast:text=>calls.push(['toast',text]),keyName:()=> 'F',updateHud:()=>calls.push(['hud'])};
 const names=['clearInput','panel','closePanel','immediateAction','loadProfile','showDeath','showTitle','syncAudioOptions','report'];
 const program=[mainInputSource,declaration('esc'),declaration('button'),declaration('BUILD_LABEL'),...names.map(fn),source.slice(source.indexOf("document.addEventListener('click',"),source.indexOf("document.addEventListener('change',")),source.slice(source.indexOf("window.addEventListener('keydown',"),source.indexOf("window.addEventListener('keyup',")),'return {loadProfile,showTitle,closePanel,report,get state(){return state},get battle(){return battle},get profile(){return profile},get controller(){return controller},get paused(){return paused},get busy(){return busy}};'].join('\n');
 const ui=vm.compileFunction(program,Object.keys(env))(...Object.values(env));
 return {ui,store,data,writes,lockCalls,controllers,calls,modal,elements,gate:env.gate,key:code=>handlers.keydown({code,target:{tagName:'DIV'},repeat:false,preventDefault(){},stopImmediatePropagation(){}}),click:action=>handlers.click({target:{closest:()=>({dataset:{action},disabled:false})},preventDefault(){},stopPropagation(){},detail:1}),
  delaySave:name=>delayedLocks.add(profileKeys(name,namespace).lock),delayLoad:name=>delayedReads.add(profileKeys(name,namespace).head),
  async releaseSave(name,{fail=false}={}){const key=profileKeys(name,namespace).lock,pending=pendingLocks.get(key);assert.ok(pending,'requested save reached WebLock');pendingLocks.delete(key);if(fail)pending.reject(new Error('deliberate lock failure'));else pending.resolve(pending.callback());await next();},
  async releaseLoad(name,{fail=false}={}){const key=profileKeys(name,namespace).head,pending=loads.get(key);assert.ok(pending,'load reached delayed result');loads.delete(key);if(fail)pending.reject(new Error('deliberate late read failure'));else pending.resolve(pending.result);await next();},
 };
}
const seed=(h,name,state=trained())=>{assert.equal(h.store(name).save(state,{expectedRevision:0}).ok,true);return state;};
const visible=h=>({state:copy(h.ui.state),battle:h.ui.battle,owner:h.ui.controller,profile:h.ui.profile,html:h.modal.innerHTML,hidden:h.modal.hidden,paused:h.ui.paused,calls:copy(h.calls)});
function unchanged(h,before){assert.deepEqual(h.ui.state,before.state);assert.equal(h.ui.battle,before.battle);assert.equal(h.ui.controller,before.owner);assert.equal(h.ui.profile,before.profile);assert.equal(h.modal.innerHTML,before.html);assert.equal(h.modal.hidden,before.hidden);assert.equal(h.ui.paused,before.paused);assert.deepEqual(h.calls,before.calls);}

test('delayed A first WebLock save cannot replace loaded B or bind A pools to B revision',async()=>{
 const h=harness(),savedB=seed(h,b),bytesB=new Map(h.data);h.delaySave(a);const old=h.ui.loadProfile(a,true);await next();const ownerA=h.controllers[0];await h.ui.loadProfile(b,false);const before=visible(h),writesBefore=h.writes.length;assert.deepEqual(before.state,savedB);await h.releaseSave(a);await old;unchanged(h,before);
 assert.equal(h.store(a).load().revision,1);assert.deepEqual(ownerA.snapshot(),createState());assert.equal(h.writes.length-writesBefore,2,'only the already-requested A slot and head may finish');for(const [key,value]of bytesB)assert.equal(h.data.get(key),value);assert.deepEqual(h.store(b).load().state,savedB);
 const captured=h.ui.report();assert.deepEqual(captured.vitals,savedB.vitals);if(Object.hasOwn(captured,'expectedStoreRevision'))assert.equal(captured.expectedStoreRevision,h.ui.controller.revision());const result=await h.ui.controller.dispatch({type:'checkpoint',...captured});assert.equal(result.ok,true);assert.deepEqual(h.store(b).load().state.vitals,savedB.vitals);assert.deepEqual(h.store(a).load().state,createState());
});
for(const start of [false,true])test(`obsolete delayed ${start?'new-game preflight':'saved-profile load'} cannot replace B or start a new save`,async()=>{
 const h=harness();if(!start)seed(h,a,createState({difficulty:'hard'}));seed(h,b);h.delayLoad(a);const old=h.ui.loadProfile(a,start);await next();await h.ui.loadProfile(b,false);const before=visible(h),bytes=new Map(h.data),writes=h.writes.length;await h.releaseLoad(a);await old;unchanged(h,before);assert.deepEqual(h.data,bytes);assert.equal(h.writes.length,writes);assert.equal(h.lockCalls.length,0);
});
for(const phase of ['load','start'])test(`late failed A ${phase} cannot clear B, change its modal or reset load state`,async()=>{
 const h=harness();seed(h,b);phase==='load'?h.delayLoad(a):h.delaySave(a);const old=h.ui.loadProfile(a,true);await next();await h.ui.loadProfile(b,false);const before=visible(h),bytes=new Map(h.data);await (phase==='load'?h.releaseLoad(a,{fail:true}):h.releaseSave(a,{fail:true}));await old;unchanged(h,before);assert.deepEqual(h.data,bytes);assert.equal(h.ui.controller.snapshot().vitals.hp,7);
});
for(const phase of ['load','start'])test(`showTitle dismisses a pending ${phase} without obsolete success or error reopening gameplay`,async()=>{
 for(const fail of [false,true]){const h=harness();phase==='load'?h.delayLoad(a):h.delaySave(a);const old=h.ui.loadProfile(a,true);await next();h.ui.showTitle();const before=visible(h),writes=h.writes.length;await (phase==='load'?h.releaseLoad(a,{fail}):h.releaseSave(a,{fail}));await old;unchanged(h,before);assert.equal(h.ui.controller,null);assert.equal(h.ui.state,null);assert.equal(h.ui.battle,null);assert.equal(h.writes.length-writes,phase==='start'&&!fail?2:0);}
});
test('same-profile overlapping continue owns the latest invocation and never starts an obsolete requested new game',async()=>{
 const h=harness();seed(h,a);h.delayLoad(a);const old=h.ui.loadProfile(a,true);await next();await h.ui.loadProfile(a,false);const before=visible(h),writes=h.writes.length;await h.releaseLoad(a);await old;unchanged(h,before);assert.equal(h.writes.length,writes);assert.equal(h.lockCalls.length,0);
});
test('normal load, reload and fresh start retain storage behavior and never remap existing progress',async()=>{
 const h=harness(),saved=seed(h,b),bytes=new Map(h.data);await h.ui.loadProfile(b,false);assert.equal(h.ui.profile,b);assert.deepEqual(h.ui.state,saved);assert.deepEqual(h.ui.controller.snapshot(),saved);assert.equal(h.ui.paused,false);assert.equal(h.modal.hidden,true);assert.deepEqual(h.data,bytes);
 const owner=h.ui.controller;await h.ui.loadProfile(b,false);assert.notEqual(h.ui.controller,owner);assert.deepEqual(h.ui.state,saved);assert.deepEqual(h.data,bytes);assert.equal(h.lockCalls.length,0);
 h.ui.showTitle();await h.ui.loadProfile(a,true,'hard');assert.equal(h.ui.profile,a);assert.equal(h.ui.state.difficulty,'hard');assert.equal(h.ui.controller.snapshot().difficulty,'hard');assert.equal(h.store(a).load().revision,1);assert.deepEqual(h.store(b).load().state,saved);
});
test('current load/start failures still present the title error and preserve existing raw saves',async()=>{
 const h=harness();await h.ui.loadProfile(a,false);assert.equal(h.ui.state,null);assert.match(h.modal.innerHTML,/저장이 없습니다/);seed(h,a);const bytes=new Map(h.data);await h.ui.loadProfile(a,true);assert.equal(h.ui.controller,null);assert.match(h.modal.innerHTML,/진행 중인 게임/);assert.deepEqual(h.data,bytes);await h.ui.loadProfile('invalid-profile',false);assert.match(h.modal.innerHTML,/Invalid profile/);assert.deepEqual(h.data,bytes);
});
test('reloading while gameplay was active pauses simulation throughout a delayed load',async()=>{
 const h=harness();seed(h,b);await h.ui.loadProfile(b,false);assert.equal(h.ui.paused,false);h.delayLoad(b);const pending=h.ui.loadProfile(b,false);await next();assert.equal(h.ui.paused,true);assert.equal(h.gate.canStep({hasBattle:true,paused:h.ui.paused,busy:h.ui.busy,hidden:false}),false);await h.releaseLoad(b);await pending;assert.equal(h.ui.paused,false);assert.deepEqual(h.ui.state,h.ui.controller.snapshot());
});
function seedCopy(h){const source=createStore({getItem:k=>h.data.get(k)??null,setItem:(k,v)=>h.data.set(k,v)},{profile:'qa-copy-source',namespace:'qa-r10'}),saved=trained();assert.equal(source.save(saved,{expectedRevision:0}).ok,true);return {source,saved,bytes:new Map(h.data)};}
for(const fail of [false,true])test(`actual delayed candidate-copy ${fail?'failure':'success'} cannot steal a newer continue selection`,async()=>{
 const h=harness(),source=seedCopy(h);seed(h,b,createState({difficulty:'hard'}));h.delaySave(a);const copying=h.click('candidate-copy');await next();h.elements.profile.value=b;await h.click('qa-continue');const before=visible(h),writes=h.writes.length;await h.releaseSave(a,{fail});await copying;unchanged(h,before);assert.equal(h.ui.profile,b);assert.equal(h.writes.length-writes,fail?0:2);for(const [key,value]of source.bytes)assert.equal(h.data.get(key),value);assert.equal(h.controllers.length,1,'obsolete copy completion must not start another profile load');
 if(!fail)assert.deepEqual(h.store(a).load().state,source.saved);
});
for(const fail of [false,true])test(`title dismissal invalidates delayed candidate-copy ${fail?'failure':'success'}`,async()=>{
 const h=harness();seedCopy(h);h.delaySave(a);const copying=h.click('candidate-copy');await next();h.ui.showTitle();const before=visible(h);await h.releaseSave(a,{fail});await copying;unchanged(h,before);assert.equal(h.controllers.length,0);
});
test('candidate-copy intent immediately supersedes an older delayed new-game preflight',async()=>{
 const h=harness(),original=seedCopy(h);h.delayLoad(b);const old=h.ui.loadProfile(b,true);await next();await h.click('candidate-copy');const before=visible(h),bytes=new Map(h.data);await h.releaseLoad(b);await old;unchanged(h,before);assert.equal(h.ui.profile,a);assert.deepEqual(h.ui.state,original.saved);assert.equal(h.store(b).load().state,null);assert.deepEqual(h.data,bytes);assert.equal(h.lockCalls.filter(k=>k===profileKeys(b,namespace).lock).length,0);
});
test('overlapping candidate copies preserve the latest target even when the earlier copy finishes last',async()=>{
 const h=harness();seedCopy(h);h.delaySave(a);const first=h.click('candidate-copy');await next();h.elements.profile.value=b;await h.click('candidate-copy');const before=visible(h);await h.releaseSave(a);await first;unchanged(h,before);assert.equal(h.ui.profile,b);assert.equal(h.store(a).load().revision,1);assert.equal(h.store(b).load().revision,1);assert.equal(h.controllers.length,1);
});
test('ordinary current candidate-copy still loads its target exactly once and keeps original bytes',async()=>{
 const h=harness(),source=seedCopy(h);await h.click('candidate-copy');assert.equal(h.ui.profile,a);assert.deepEqual(h.ui.state,source.saved);assert.deepEqual(h.ui.controller.snapshot(),source.saved);assert.equal(h.controllers.length,1);for(const [key,value]of source.bytes)assert.equal(h.data.get(key),value);const bytes=new Map(h.data);await h.click('candidate-copy');assert.equal(h.ui.controller,null);assert.match(h.modal.innerHTML,/이미 후보 기록/);assert.deepEqual(h.data,bytes);
});
for(const operation of ['start','copy'])test(`actual title pending ${operation}: Escape/pause, menu key and close cannot resume a prior battle`,async()=>{
 const h=harness(),savedB=seed(h,b);if(operation==='copy')seedCopy(h);
 await h.ui.loadProfile(b,false);const previousBattle=h.ui.battle;assert.ok(previousBattle);h.ui.showTitle();assert.equal(h.ui.battle,null);assert.equal(h.ui.state,null);assert.equal(h.ui.controller,null);assert.equal(h.elements.hud.hidden,true);
 h.elements.profile.value=a;h.delaySave(a);const pending=h.click(operation==='start'?'qa-new':'candidate-copy');await next();const epoch=h.modal.presentationEpoch,lockCount=h.lockCalls.length,writes=h.writes.length;
 for(const action of [()=>h.key('Escape'),()=>h.key('KeyC'),()=>h.ui.closePanel(),()=>h.click('close')]){
  await action();assert.equal(h.ui.battle,null);assert.equal(h.ui.state,null);assert.equal(h.ui.paused,true);assert.equal(h.gate.canStep({hasBattle:!!h.ui.battle,paused:h.ui.paused,busy:h.ui.busy,hidden:false}),false);assert.equal(h.modal.presentationEpoch,epoch);assert.equal(h.writes.length,writes);assert.equal(h.lockCalls.length,lockCount);assert.throws(()=>h.ui.report(),'no old battle can produce a report for the loading owner');
 }
 h.elements.profile.value=b;await h.click('qa-continue');const before=visible(h);assert.notEqual(h.ui.battle,previousBattle);assert.deepEqual(h.ui.state,savedB);await h.releaseSave(a);await pending;unchanged(h,before);assert.deepEqual(h.ui.state,h.ui.controller.snapshot());assert.deepEqual(h.store(b).load().state,savedB);
});
for(const operation of ['start','copy'])test(`actual title pending ${operation} still installs its sole current owner after ignored Escape and close`,async()=>{
 const h=harness();if(operation==='copy')seedCopy(h);h.ui.showTitle();h.delaySave(a);const pending=h.click(operation==='start'?'qa-new':'candidate-copy');await next();h.key('Escape');await h.click('close');assert.equal(h.ui.paused,true);assert.equal(h.ui.battle,null);await h.releaseSave(a);await pending;assert.equal(h.ui.profile,a);assert.equal(h.ui.paused,false);assert.equal(h.modal.hidden,true);assert.deepEqual(h.ui.state,h.ui.controller.snapshot());assert.deepEqual(h.ui.state,h.store(a).load().state);
});

// R14 title selection runs through the production click handler and both real
// controller commits. Existing ownership tests above retain their explicit
// unchanged preset so their original first-save scenarios stay intact.
const newPresets=['wasd:combined','click:combined','wasd:separate','click:separate'];
for(const selection of newPresets)test(`actual qa-new ${selection} commits only the chosen controls and starts matching mobility`,async()=>{
 const h=harness({namespace:'qa-r14'}),base=createState({difficulty:'hard'}),[mode,run]=selection.split(':');
 h.elements.newControlsPreset.value=selection;h.elements.difficulty.value='hard';await h.click('qa-new');
 const saved=h.store(a).load(),expected=poeControlPreset(base.options.controls,mode,run);
 assert.equal(saved.ok,true);assert.equal(saved.revision,2);assert.equal(h.ui.profile,a);assert.equal(h.ui.paused,false);assert.equal(h.modal.hidden,true);
 assert.deepEqual(h.ui.state,saved.state);assert.deepEqual(h.ui.controller.snapshot(),saved.state);assert.deepEqual(saved.state.options.controls,expected);
 assert.equal(saved.state.options.controls.version,4);assert.deepEqual(restorePriorControls(saved.state.options.controls),base.options.controls);
 assert.deepEqual({...saved.state,options:{...saved.state.options,controls:base.options.controls}},base,'choosing inputs never trains, awards XP, spends resources or changes difficulty');
 assert.deepEqual(h.ui.battle.poeInput,expected.poe);assert.equal(h.ui.battle.poeMobility.snapshot().state,'idle');
 assert.deepEqual(saved.state.options.controls.bindings[run==='combined'?'dodgeSprint':'dodgeOnly'],['Space']);
 assert.deepEqual(saved.state.options.controls.bindings.sprint,run==='separate'?['ShiftLeft','ShiftRight']:[]);
 assert.equal(h.lockCalls.filter(key=>key===profileKeys(a,'qa-r14').lock).length,2);
});
test('actual qa-new unchanged choice preserves the original v3 controls with one commit',async()=>{
 const h=harness({namespace:'qa-r14'});h.elements.newControlsPreset.value='unchanged';await h.click('qa-new');
 assert.deepEqual(h.ui.state,createState());assert.deepEqual(h.store(a).load().state,createState());assert.equal(h.store(a).load().revision,1);assert.equal(h.ui.state.options.controls.version,3);assert.equal(h.ui.battle.poeMobility,undefined);assert.equal(h.lockCalls.length,1);
});
function customControlState(){
 const saved=trained(),binding=rebindControl(saved.options.controls,'hammer',0,'KeyP');assert.equal(binding.ok,true);
 const updated=reduceRuntime(saved,{type:'setControls',controls:binding.controls});assert.equal(updated.ok,true);return updated.state;
}
for(const selection of newPresets)for(const operation of ['continue','copy'])test(`actual ${operation} ignores new-game ${selection} selection and preserves custom saved controls`,async()=>{
 const h=harness({namespace:'qa-r14'}),saved=customControlState();h.elements.newControlsPreset.value=selection;
 let original;
 if(operation==='continue')seed(h,a,saved);
 else {
  const source=createStore({getItem:key=>h.data.get(key)??null,setItem:(key,value)=>h.data.set(key,value)},{profile:'qa-copy-source',namespace:'qa-r12'});
  assert.equal(source.save(saved,{expectedRevision:0}).ok,true);h.elements.sourceNamespace.value='qa-r12';
 }
 original=new Map(h.data);await h.click(operation==='continue'?'qa-continue':'candidate-copy');
 assert.equal(h.ui.profile,a);assert.deepEqual(h.ui.state,saved);assert.deepEqual(h.ui.controller.snapshot(),saved);assert.deepEqual(h.store(a).load().state,saved);
 assert.equal(h.ui.state.options.controls.version,3);assert.deepEqual(h.ui.state.options.controls.bindings.hammer,['KeyP']);assert.equal(h.ui.battle.poeMobility,undefined);
 assert.equal(h.store(a).load().revision,1);for(const [key,value]of original)assert.equal(h.data.get(key),value,'source and existing save bytes remain unchanged');
 if(operation==='continue'){assert.deepEqual(h.data,original);assert.equal(h.writes.length,2,'only the test seed wrote');assert.equal(h.lockCalls.length,0);}
 else assert.equal(h.writes.length,2,'copy writes one slot and one head, with no preset save');
});
for(const selection of newPresets)test(`failed second ${selection} preset save leaves an untrained v3 profile that continue recovers unchanged`,async()=>{
 const h=harness({namespace:'qa-r14'}),base=createState();h.elements.newControlsPreset.value=selection;h.delaySave(a);
 const pending=h.click('qa-new');await next();assert.equal(h.store(a).load().state,null);assert.equal(h.ui.state,null);assert.equal(h.ui.paused,true);
 h.delaySave(a);await h.releaseSave(a);
 const first=h.store(a).load(),bytes=new Map(h.data),writes=h.writes.length;assert.equal(first.revision,1);assert.deepEqual(first.state,base);assert.equal(first.state.options.controls.version,3);assert.equal(h.ui.state,null,'the game does not expose a half-configured profile');
 await h.releaseSave(a,{fail:true});await pending;
 assert.equal(h.ui.controller,null);assert.equal(h.ui.battle,null);assert.equal(h.ui.state,null);assert.equal(h.ui.paused,true);assert.equal(h.modal.hidden,false);assert.match(h.modal.innerHTML,/저장 잠금을 얻지 못했습니다/);
 assert.deepEqual(h.data,bytes);assert.equal(h.writes.length,writes);assert.deepEqual(h.store(a).load().state,base);assert.equal(h.store(a).load().revision,1);
 await h.click('qa-continue');assert.deepEqual(h.ui.state,base);assert.deepEqual(h.ui.controller.snapshot(),base);assert.equal(h.ui.paused,false);assert.equal(h.modal.hidden,true);assert.equal(h.ui.battle.poeMobility,undefined);
 assert.deepEqual(h.data,bytes);assert.equal(h.store(a).load().revision,1);assert.equal(h.ui.state.options.controls.version,3);
});
for(const selection of newPresets)test(`late second ${selection} preset commit cannot replace a newer loaded profile`,async()=>{
 const h=harness({namespace:'qa-r14'}),savedB=seed(h,b),beforeB=h.store(b).load();h.elements.newControlsPreset.value=selection;h.delaySave(a);
 const pending=h.click('qa-new');await next();h.delaySave(a);await h.releaseSave(a);assert.equal(h.store(a).load().revision,1);
 h.elements.profile.value=b;await h.click('qa-continue');const before=visible(h),bytesB=new Map([...h.data].filter(([key])=>key.startsWith(profileKeys(b,'qa-r14').head.replace(/\.head$/,''))));
 await h.releaseSave(a);await pending;unchanged(h,before);
 assert.equal(h.ui.profile,b);assert.deepEqual(h.ui.state,savedB);assert.deepEqual(h.store(b).load(),beforeB);for(const [key,value]of bytesB)assert.equal(h.data.get(key),value);
 assert.equal(h.store(a).load().revision,2);assert.equal(h.store(a).load().state.options.controls.version,4);
});
