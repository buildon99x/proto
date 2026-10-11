import {createMainInputFixture,mainInputSource} from './support/main-input-fixture.mjs';
import {mainImports} from './support/main-imports.mjs';
import {BATTLEFIELD_COMMANDS} from '../src/battlefield.js';
import {battlefieldObjectView,battlefieldElderView,battlefieldGuidance,battlefieldCommandFields,battlefieldPortalLabel,battlefieldEventCopy} from '../src/battlefield-presentation.js';
import {quoteAction} from '../src/combat.js';
import {previewPromotion,previewExpertPromotion} from '../src/promotion.js';
import {createExpertInputCapture,EXPERT_SLOTS,emptyActionSlots} from '../src/expert-input.js';
import {createActionSafety} from '../src/action-safety.js';
import {cancelBattleAction} from '../src/combat.js';
import {combatCheckpoint} from '../src/combat-persistence.js';
import {TOMB_COMMANDS,tombWardCarried} from '../src/tomb.js';
import {TOMB_TOOLS} from '../src/tomb-content.js';
import {tombObjectView,tombElderView,tombCommandFields,tombClueView,tombEventCopy,tombGoldView,tombPortalLabel,tombGuidance} from '../src/tomb-presentation.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createStore} from '../src/save.js';
import {createController} from '../src/controller.js';
import {createBattle,clearBattleIntent} from '../src/combat.js';
import {battleReport} from '../src/recovery.js';
import {syncCommittedBattle} from '../src/runtime-sync.js';
import {createRuntimeGate} from '../src/runtime-gate.js';
import {createImmediateInput} from '../src/immediate-input.js';
import {ACTIONS,controlsFor,actionLabel,editableTarget,createInputRouter} from '../src/controls.js';
import {getRegion,createMap,near} from '../src/world.js';
import {deriveStats} from '../src/warrior-growth.js';
import {selectInteractionTarget} from '../src/interaction-target.js';
import {DUNGEON_COMMANDS} from '../src/dungeon.js';
import {QUARRY_COMMANDS} from '../src/quarry.js';
import {PASS_COMMANDS} from '../src/pass.js';
import {SIGNAL_COMMANDS} from '../src/signal.js';
import {FURNACE_COMMANDS} from '../src/furnace.js';
import {furnaceObjectView} from '../src/furnace-presentation.js';
import {dungeonObjectView} from '../src/dungeon-presentation.js';
import {quarryObjectView} from '../src/quarry-presentation.js';
import {passObjectView} from '../src/pass-presentation.js';
import {signalObjectView} from '../src/signal-presentation.js';
import {campaignGuidance,chestPresentation} from '../src/campaign-guidance.js';
import {SIGNAL_GROUPS} from '../src/signal-content.js';
import {earnedPassRoute} from './support/earned-pass-route.mjs';
import {run,report,travel,settle} from './support/earned-route.mjs';

// Unchanged production handlers, real router/controller/store/reducers/battle,
// and an explicitly delayed save boundary. DOM/audio are assignment probes.
// The earned route uses scripted positions and defeat reports, not browser play
// or actual combat; it never assigns levels, XP, reward, or objective flags.
const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const nextTurn=()=>new Promise(resolve=>setImmediate(resolve));
function mainFunction(name){
 const start=new RegExp(`(?:async )?function ${name}\\(`).exec(source);assert.ok(start,name);
 for(let end=source.indexOf('}',start.index);end!==-1;end=source.indexOf('}',end+1)){
  const body=source.slice(start.index,end+1);
  try{new vm.Script('('+body+')');return body;}catch(error){if(!(error instanceof SyntaxError))throw error;}
 }
 assert.fail('complete function '+name);
}
function between(start,end){const a=source.indexOf(start),b=source.indexOf(end,a+start.length);assert.ok(a>=0&&b>a,start);return source.slice(a,b);}
let savedFixture;
function shortcutFixture(){
 if(!savedFixture){
  let state=earnedPassRoute();state=run(state,{type:'acceptSignalQuest',...report(state,{x:250,y:470})}).state;
  state=settle(travel(state,'town-signal-entry'),SIGNAL_GROUPS.entry);
  for(const id of ['signal-code','signal-shortcut']){
   const object=getRegion('signal_basin').objects.find(row=>row.id===id);
   state=run(state,{type:'interactSignal',objectId:id,...report(state,object)}).state;
  }
  savedFixture=state;
 }
 return structuredClone(savedFixture);
}
const functions=['wildernessView','wildernessActionButton','showWilderness','flushActionSafety','acceptCombatPress','releaseCombatToken','checkpointPanel','showTraining','showActionSlots','clearInput','panel','closePanel','report','syncVitals','dispatch','nearest','interact','showObjective','showMenu','help','showTitle','immediateAction'];
const harnessSource=[mainInputSource,
 between('const esc=','function clearInput('),between('const tierLabel=','const focusEvents='),
 'const config=()=>controlsFor(state);const keyName=action=>actionLabel(config(),action);',
 ...functions.map(mainFunction),
 // Use the production objective HUD fragment, including its unchanged-node guard.
 'function updateHud(){'+between(' const objective=campaignGuidance(state).title;',' const entries=')+'}',
 between("document.addEventListener('click',","document.addEventListener('change',"),
 between("window.addEventListener('keydown'","window.addEventListener('mousedown'"),
 'return {get state(){return state},get battle(){return battle},get paused(){return paused},get busy(){return busy},get controller(){return controller}};',
].join('\n');

async function browser(){
 const data=new Map(),storage={getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};
 const store=createStore(storage,{profile:'qa-pause-travel',namespace:'qa-r8'});
 assert.equal(store.save(shortcutFixture(),{expectedRevision:0}).ok,true);
 let pending=null,saveCount=0;
 const controller=createController({load:store.load,save:(state,options)=>{
  saveCount++;assert.equal(pending,null,'runtime must never stack save requests');
  return new Promise(resolve=>{pending={state,options,resolve};});
 }});
 const loaded=await controller.load();assert.equal(loaded.ok,true);
 const commands=[],actualDispatch=controller.dispatch;controller.dispatch=command=>{commands.push(command.type);return actualDispatch(command);};
 const handlers={},messages=[],calls=[],elements={toast:{textContent:'',classList:{add(){},remove(){}}},objective:{innerHTML:''},hud:{hidden:false}};
 let activeElement,html='',modalWrites=0,regionNode=null,buttonNode=null;
 const canvas={tagName:'CANVAS',focus(){activeElement=canvas;calls.push('focus-canvas');}};activeElement=canvas;
 const modal={hidden:true,get innerHTML(){return html;},set innerHTML(value){
  html=value;modalWrites++;regionNode=null;
  const region=/<span data-pause-region>([^<]*)<\/span>/.exec(html);
  if(region){let text=region[1];regionNode={get textContent(){return text;},set textContent(value){text=value;html=html.replace(/(<span data-pause-region>)[^<]*(<\/span>)/,(_,a,b)=>a+value+b);}};}
  buttonNode=/<button\b/.test(html)?{tagName:'BUTTON',focus(){activeElement=buttonNode;calls.push('focus-modal');}}:null;
 },querySelector(selector){if(selector==='[data-pause-region]')return regionNode;if(selector.includes('button')||selector.includes('data-action="close"'))return buttonNode;return null;}};
 const gate=createRuntimeGate(),router=createInputRouter();
 const document={visibilityState:'visible',hidden:false,hasFocus:()=>true,addEventListener:(name,handler)=>handlers[name]=handler};
 const imports={...mainImports,BATTLEFIELD_COMMANDS,battlefieldObjectView,battlefieldElderView,battlefieldGuidance,battlefieldCommandFields,battlefieldPortalLabel,battlefieldEventCopy,previewExpertPromotion,quoteAction,EXPERT_SLOTS,emptyActionSlots,combatCheckpoint,TOMB_COMMANDS,TOMB_TOOLS,tombWardCarried,tombObjectView,tombElderView,tombCommandFields,tombClueView,tombEventCopy,tombGoldView,tombPortalLabel,createBattle,clearBattleIntent,battleReport,syncCommittedBattle,getRegion,createMap,near,deriveStats,selectInteractionTarget,DUNGEON_COMMANDS,QUARRY_COMMANDS,PASS_COMMANDS,SIGNAL_COMMANDS,FURNACE_COMMANDS,dungeonObjectView,quarryObjectView,passObjectView,signalObjectView,furnaceObjectView,campaignGuidance,chestPresentation,ACTIONS,controlsFor,actionLabel,editableTarget};
 const expertCapture=createExpertInputCapture(),expertSafety=createActionSafety({capture:expertCapture,cancel:cancelBattleAction});
 const env={...createMainInputFixture(),...imports,expertCapture,expertSafety,state:loaded.state,battle:createBattle(loaded.state),controller,paused:false,busy:false,combatSaveElapsed:0,captureBinding:null,suppressNextClick:false,
  noticeUntil:0,modal,gate,router,deferredImmediate:createImmediateInput(),canvas,document,window:{addEventListener:(name,handler)=>handlers[name]=handler},
  $:id=>elements[id],audio:{cancel(){},pause:value=>calls.push(['pause',value]),play:value=>calls.push(['play',value])},toast:text=>messages.push(text),
  profile:'qa-pause-travel',candidate:true,saveNamespace:'qa-r8',pauseReason:'사용자 요청',focusEvents:{blurAt:'없음',visibilityAt:'없음',visibilityState:'초기'},
  last:0,lastObjectiveHtml:'',displayTime:0,combatTime:0,walkTime:0,menuTime:0,arrivalWaitTime:0,
 };
 const ui=vm.compileFunction(harnessSource,Object.keys(env),{filename:'production-pause-travel-handlers.js'})(...Object.values(env));
 // Already-paid live resource/recovery fixture; travel must retain every value.
 Object.assign(ui.battle.p,{hp:ui.battle.p.hp-3,mana:ui.battle.p.mana-2,stamina:ui.battle.p.stamina-4,recoveryLock:.3,manaDelay:.6});
 ui.battle.p.cooldowns.righteous_hammer=1.2;
 const portal=getRegion('signal_basin').portals.find(row=>row.id==='signal-town-shortcut');Object.assign(ui.battle.p,{x:portal.x,y:portal.y});
 const press=code=>{const event={code,target:activeElement,repeat:false,preventDefault(){},stopImmediatePropagation(){}};handlers.keydown(event);handlers.keyup(event);};
 const click=action=>handlers.click({target:{closest:()=>({disabled:false,dataset:{action}})},preventDefault(){},stopPropagation(){}});
 const release=async failure=>{await nextTurn();assert.ok(pending,'save reached the deliberately delayed boundary');const work=pending;pending=null;work.resolve(failure??store.save(work.state,work.options));await nextTurn();};
 return {ui,modal,store,gate,messages,calls,commands,elements,press,click,release,handlers,document,get saveCount(){return saveCount;},get modalWrites(){return modalWrites;},get activeElement(){return activeElement;},get regionNode(){return regionNode;}};
}
function beginTravelAndPause(h){
 assert.equal(controlsFor(h.ui.state).bindings.interact[0],'KeyF');h.press('KeyF');assert.equal(h.ui.busy,true);
 h.press('Escape');assert.equal(h.ui.paused,true);assert.equal(h.modal.hidden,false);
 assert.match(h.modal.innerHTML,new RegExp(getRegion('signal_basin').name));
 assert.deepEqual(h.commands,['travel']);
}
function assertArrived(h,paid){
 assert.equal(h.ui.state.world.region,'ash_hamlet');assert.equal(h.ui.battle.region,'ash_hamlet');assert.equal(h.ui.busy,false);
 assert.deepEqual(h.ui.state.vitals,paid.vitals);assert.deepEqual(h.ui.state.recovery,paid.recovery);
 assert.deepEqual(h.store.load().state,h.ui.state);assert.match(h.elements.objective.innerHTML,new RegExp(getRegion('ash_hamlet').name));
 assert.deepEqual(h.commands,['travel']);assert.equal(h.saveCount,1);
}

test('actual F → Escape refreshes the pause region after durable travel without rebuilding or saving again',async()=>{
 const h=await browser(),paid=battleReport(h.ui.battle),before=structuredClone(h.ui.state);beginTravelAndPause(h);
 const node=h.regionNode,focus=h.activeElement,writes=h.modalWrites;await h.release();assertArrived(h,paid);
 assert.match(h.modal.innerHTML,new RegExp(getRegion('ash_hamlet').name),'open pause menu must name the committed destination');
 assert.equal(h.ui.paused,true);assert.equal(h.modal.hidden,false);assert.equal(h.regionNode,node);assert.equal(h.activeElement,focus);assert.equal(h.modalWrites,writes);
 assert.equal(h.regionNode.textContent,getRegion('ash_hamlet').name);assert.doesNotMatch(h.modal.innerHTML,new RegExp(getRegion('signal_basin').name));
 assert.deepEqual(h.ui.state.character,before.character);assert.deepEqual(h.ui.state.inventory,before.inventory);assert.deepEqual(h.ui.state.stats,before.stats);assert.equal(h.ui.state.gold,before.gold);assert.deepEqual(h.ui.state.world.claimedRewards,before.world.claimedRewards);
 await nextTurn();assert.equal(h.saveCount,1);assert.equal(h.modalWrites,writes);
});
for(const exit of ['Escape','close'])test(`actual ${exit} dismissal while travel is pending is not reopened by commit`,async()=>{
 const h=await browser(),paid=battleReport(h.ui.battle);beginTravelAndPause(h);
 if(exit==='Escape')h.press('Escape');else await h.click('close');
 assert.equal(h.ui.paused,false);assert.equal(h.modal.hidden,true);const focus=h.activeElement,writes=h.modalWrites;
 await h.release();assertArrived(h,paid);assert.equal(h.ui.paused,false);assert.equal(h.modal.hidden,true);assert.equal(h.modal.innerHTML,'');assert.equal(h.activeElement,focus);assert.equal(h.modalWrites,writes);
});
for(const action of ['help','objective'])test(`actual newer ${action} panel wins over the travel completion callback`,async()=>{
 const h=await browser(),paid=battleReport(h.ui.battle);beginTravelAndPause(h);await h.click(action);
 const html=h.modal.innerHTML,focus=h.activeElement,writes=h.modalWrites;assert.equal(h.regionNode,null);
 await h.release();assertArrived(h,paid);assert.equal(h.modal.innerHTML,html);assert.equal(h.activeElement,focus);assert.equal(h.modalWrites,writes);assert.equal(h.ui.paused,true);
});
test('actual repeated Escape and menu navigation refresh only the latest open menu',async()=>{
 const h=await browser(),paid=battleReport(h.ui.battle);beginTravelAndPause(h);const abandoned=h.regionNode;
 h.press('Escape');h.press('Escape');await h.click('help');await h.click('menu');const current=h.regionNode,focus=h.activeElement,writes=h.modalWrites;
 assert.notEqual(current,abandoned);await h.release();assertArrived(h,paid);
 assert.equal(current.textContent,getRegion('ash_hamlet').name);assert.equal(abandoned.textContent,getRegion('signal_basin').name);assert.equal(h.activeElement,focus);assert.equal(h.modalWrites,writes);
});
test('actual failed pending travel keeps departure region and a single save attempt',async()=>{
 const h=await browser(),before=h.store.load();beginTravelAndPause(h);const focus=h.activeElement,writes=h.modalWrites;
 await h.release({ok:false,code:'WRITE_FAILED',reason:'fixture write failed'});
 assert.equal(h.ui.state.world.region,'signal_basin');assert.equal(h.regionNode.textContent,getRegion('signal_basin').name);assert.equal(h.activeElement,focus);assert.equal(h.modalWrites,writes);
 assert.deepEqual(h.store.load(),before);assert.deepEqual(h.commands,['travel']);assert.equal(h.saveCount,1);assert.equal(h.ui.busy,false);assert.equal(h.gate.blocked,false);assert.deepEqual(h.messages,['fixture write failed']);
});
test('actual uncertain pending travel replaces pause menu with the recovery gate and blocks Escape',async()=>{
 const h=await browser(),before=h.store.load();beginTravelAndPause(h);await h.release({ok:false,code:'COMMIT_UNCERTAIN',reason:'fixture uncertain commit'});
 assert.equal(h.gate.blocked,true);assert.equal(h.regionNode,null);assert.match(h.modal.innerHTML,/저장을 확인해야 합니다/);h.press('Escape');
 assert.equal(h.ui.paused,true);assert.equal(h.modal.hidden,false);assert.deepEqual(h.store.load(),before);assert.deepEqual(h.commands,['travel']);assert.equal(h.saveCount,1);
});
test('actual save-and-title click during travel does not enqueue a stale checkpoint or exit before saving',async()=>{
 const h=await browser(),paid=battleReport(h.ui.battle);beginTravelAndPause(h);await h.click('leave');await h.release();assertArrived(h,paid);
 assert.ok(h.ui.controller);assert.equal(h.regionNode.textContent,getRegion('ash_hamlet').name);
 const leaving=h.click('leave');await h.release();await leaving;
 assert.deepEqual(h.commands,['travel','checkpoint']);assert.equal(h.saveCount,2);assert.equal(h.ui.controller,null);assert.equal(h.ui.state,null);assert.equal(h.regionNode,null);assert.match(h.modal.innerHTML,/EMBERWATCH/);
 assert.equal(h.store.load().state.world.region,'ash_hamlet');assert.deepEqual(h.store.load().state.vitals,paid.vitals);assert.deepEqual(h.store.load().state.recovery,paid.recovery);
});
test('actual ordinary pause checkpoint refreshes the current label without recursive saves or focus changes',async()=>{
 const h=await browser();h.press('Escape');assert.equal(h.ui.paused,true);assert.deepEqual(h.commands,['checkpoint']);
 const label=h.regionNode,focus=h.activeElement,writes=h.modalWrites;await h.release();await nextTurn();
 assert.equal(h.ui.busy,false);assert.equal(h.regionNode,label);assert.equal(label.textContent,getRegion('signal_basin').name);assert.equal(h.activeElement,focus);assert.equal(h.modalWrites,writes);
 assert.deepEqual(h.commands,['checkpoint']);assert.equal(h.saveCount,1);assert.deepEqual(h.store.load().state,h.ui.state);
});
