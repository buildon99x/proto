import {createMainInputFixture,mainInputSource,tracedInputRouter} from './support/main-input-fixture.mjs';
import {mainImports} from './support/main-imports.mjs';
import {WILDERNESS_COMMANDS,wildernessClue} from '../src/wilderness.js';
import {WILDERNESS_TOOLS,WILDERNESS_REGION,WILDERNESS_GROUPS} from '../src/wilderness-content.js';
import {wildernessObjectView,wildernessElderView,wildernessGuidance,wildernessCommandFields,wildernessPortalView,WILDERNESS_CONTINUATION_NOTICE} from '../src/wilderness-presentation.js';
import {earnedBattlefield,stages,object as wObject} from './support/earned-wilderness-route.mjs';
import {BATTLEFIELD_TOOLS,BATTLEFIELD_REGION,BATTLEFIELD_GROUPS} from '../src/battlefield-content.js';
import {BATTLEFIELD_COMMANDS,battlefieldInputRevision} from '../src/battlefield.js';
import {battlefieldObjectView,battlefieldElderView,battlefieldGuidance,battlefieldCommandFields,battlefieldPortalLabel,battlefieldEventCopy} from '../src/battlefield-presentation.js';
import {quoteAction} from '../src/combat.js';
import {createExpertInputCapture,EXPERT_SLOTS,emptyActionSlots} from '../src/expert-input.js';
import {createActionSafety} from '../src/action-safety.js';
import {cancelBattleAction} from '../src/combat.js';
import {combatCheckpoint} from '../src/combat-persistence.js';
import {TOMB_COMMANDS,tombWardCarried,tombInputRevision} from '../src/tomb.js';
import {TOMB_REGION,TOMB_GROUPS,TOMB_REWARDS,TOMB_SEQUENCE,TOMB_TOOLS} from '../src/tomb-content.js';
import {tombObjectView,tombElderView,tombCommandFields,tombClueView,tombEventCopy,tombGoldView,tombPortalLabel,tombGuidance} from '../src/tomb-presentation.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createState,validateState,reduceRuntime} from '../src/state.js';
import {createStore,createSession,profileKeys} from '../src/save.js';
import {createController} from '../src/controller.js';
import {candidatePath,candidateNamespace,copyReleaseQaProfile} from '../src/candidate-profile.js';
import {createRuntimeGate} from '../src/runtime-gate.js';
import {createBattle,clearBattleIntent} from '../src/combat.js';
import {battleReport} from '../src/recovery.js';
import {syncCommittedBattle} from '../src/runtime-sync.js';
import {getRegion,createMap,inMap,near,lineOfSight,FOES} from '../src/world.js';
import {selectInteractionTarget} from '../src/interaction-target.js';
import {deriveStats,previewSkill,RUNTIME_SKILL_IDS} from '../src/warrior-growth.js';
import {equipmentRows,quoteEquipment,previewRecipe} from '../src/equipment.js';
import {EQUIPMENT_ITEMS,EQUIPMENT_RECIPES,EQUIPMENT_SLOTS,EQUIPMENT_UPGRADES} from '../src/equipment-content.js';
import {DUNGEON_TOOLS} from '../src/dungeon-content.js';
import {QUARRY_TOOLS} from '../src/quarry-content.js';
import {PASS_TOOLS} from '../src/pass-content.js';
import {SIGNAL_TOOLS,SIGNAL_GROUPS} from '../src/signal-content.js';
import {DUNGEON_COMMANDS} from '../src/dungeon.js';
import {QUARRY_COMMANDS} from '../src/quarry.js';
import {PASS_COMMANDS} from '../src/pass.js';
import {SIGNAL_COMMANDS} from '../src/signal.js';
import {FURNACE_COMMANDS} from '../src/furnace.js';
import {FURNACE_TOOLS,FURNACE_GROUPS,FURNACE_MODES,FURNACE_REWARDS,FURNACE_REGION} from '../src/furnace-content.js';
import {furnaceObjectView,furnaceBlacksmithView,furnaceGuidance} from '../src/furnace-presentation.js';
import {dungeonObjectView} from '../src/dungeon-presentation.js';
import {quarryObjectView,quarryElderView} from '../src/quarry-presentation.js';
import {passObjectView,passElderView,passGuidance} from '../src/pass-presentation.js';
import {signalObjectView,signalBlacksmithView} from '../src/signal-presentation.js';
import {campaignGuidance,chestPresentation} from '../src/campaign-guidance.js';
import {earnedPassRoute} from './support/earned-pass-route.mjs';
import {report,run,travel,settle} from './support/earned-route.mjs';
import {controlsFor,actionLabel,rebindControl,tokenLabel,editableTarget,createInputRouter,controlPreset} from '../src/controls.js';

import {earnedFurnaceRoute} from './support/earned-furnace-route.mjs';
import {earnedTombRoute} from './support/earned-tomb-route.mjs';
import {xpForLevel} from '../src/progression.js';
import {previewPromotion,previewExpertPromotion} from '../src/promotion.js';

// These tests invoke UNCHANGED production main.js functions and its click
// listener in the imports' realm. The real controller, store, reducers, battle,
// world, guidance and presentation are used. DOM/audio/scheduling are boundary
// probes; an optional delayed/failing persistence boundary is explicit below.
// Every predecessor reward, XP, skill, level and flag comes from earned runtime
// commands. Scripted positions and defeated-enemy reports are SETTLEMENT FIXTURES,
// NOT browser play, ordinary-input combat, AI survival or visual QA evidence.
const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const copy=value=>structuredClone(value),smith={x:250,y:470},elder={x:450,y:325},trainer={x:260,y:325};
const point=id=>getRegion(TOMB_REGION).objects.find(object=>object.id===id);
const memory=()=>{const data=new Map();return {data,getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};};
const locks={request:async(_key,_options,callback)=>callback()};
const nextTurn=()=>new Promise(resolve=>setImmediate(resolve));
function mainFunction(name){
 const match=new RegExp(`(?:async )?function ${name}\\(`).exec(source);assert.ok(match,`production function ${name} must exist`);
 for(let end=source.indexOf('}',match.index);end!==-1;end=source.indexOf('}',end+1)){
  const body=source.slice(match.index,end+1);
  try{new vm.Script('('+body+')');return body;}catch(error){if(!(error instanceof SyntaxError))throw error;}
 }
 assert.fail(`complete production function ${name}`);
}
function between(start,end){const a=source.indexOf(start),b=source.indexOf(end,a+start.length);assert.ok(a>=0&&b>a,`production boundaries: ${start}`);return source.slice(a,b);}
const browserFunctions=['wildernessView','wildernessActionButton','showWilderness','showMenu','effectText','updateHud','loadProfile','syncAudioOptions','battlefieldActionButton','showBattlefield','tombActionButton','showTomb','showJournal','flushActionSafety','acceptCombatPress','releaseCombatToken','checkpointPanel','showTraining','showActionSlots','clearInput','panel','closePanel','report','syncVitals','dispatch','nearest','interact','showFurnace','showSignal','showNpc','showEquipment','equipmentAction','showObjective','showTitle','showDeath','drawLabels'];
const exposed=['report','showWilderness','showBattlefield','showTomb','showJournal','showMenu','updateHud','loadProfile','dispatch','nearest','interact','showFurnace','showNpc','showEquipment','showObjective','showTitle','showDeath','drawLabels','closePanel'];
const harnessSource=[mainInputSource,
 between('const esc=','function clearInput('),between('const tierLabel=','const focusEvents='),between('const config=','let controller='),
 between('const statNames=','let equipmentStation='),...browserFunctions.map(mainFunction),
 // Execute the current production objective HUD fragment, including its guard.

 between("document.addEventListener('click',", "document.addEventListener('change',"),
 `return {${exposed.join(',')},get state(){return state},get battle(){return battle},get paused(){return paused},get busy(){return busy},get controller(){return controller},get equipmentStation(){return equipmentStation}};`,
].join('\n');
const economy=s=>copy({character:s.character,gold:s.gold,stats:s.stats,inventory:s.inventory,receipts:s.world.claimedRewards});
async function browser(saved,{storage=memory(),profile='qa-tomb-ui',namespace='qa-r12',reload=false}={}){
 const store=createStore(storage,{profile,namespace});if(!reload)assert.equal(store.save(saved,{expectedRevision:0}).ok,true);
 let delayed=false,pending=null,failNext=null,saveCount=0;
 const controller=createController({load:store.load,save:(state,options)=>{
  saveCount++;if(failNext){const failure=failNext;failNext=null;return failure;}
  if(!delayed)return store.save(state,options);
  assert.equal(pending,null,'production UI cannot stack save requests');delayed=false;return new Promise(resolve=>{pending={state,options,resolve};});
 }}),loaded=await controller.load();assert.equal(loaded.ok,true);
 const events=[],messages=[],calls=[],handlers={},labels=[],commands=[],outcomes=[];controller.subscribe(event=>events.push(event));
 const actualDispatch=controller.dispatch;controller.dispatch=async command=>{commands.push(copy(command));const result=await actualDispatch(command);outcomes.push(result);return result;};
 const modal={hidden:true,innerHTML:'',querySelector:()=>({focus:()=>calls.push(['focus-modal'])})};
 const elements={toast:{textContent:''},vitals:{innerHTML:''},hotbar:{querySelector:()=>null},menuButton:{textContent:''},boss:{innerHTML:''},hud:{hidden:false},objective:{innerHTML:''},profile:{value:'qa-r9-copy'},sourceProfile:{value:'qa-r8-source'},sourceNamespace:{value:'qa-r8'}};
 const imports={...mainImports,WILDERNESS_COMMANDS,wildernessClue,WILDERNESS_TOOLS,wildernessObjectView,wildernessElderView,wildernessGuidance,wildernessCommandFields,wildernessPortalView,WILDERNESS_CONTINUATION_NOTICE,BATTLEFIELD_TOOLS,BATTLEFIELD_COMMANDS,battlefieldObjectView,battlefieldElderView,battlefieldGuidance,battlefieldCommandFields,battlefieldPortalLabel,battlefieldEventCopy,previewExpertPromotion,quoteAction,EXPERT_SLOTS,emptyActionSlots,combatCheckpoint,createController,createSession,previewSkill,RUNTIME_SKILL_IDS,xpForLevel,previewPromotion,tokenLabel,FOES,TOMB_COMMANDS,TOMB_TOOLS,tombWardCarried,tombObjectView,tombElderView,tombCommandFields,tombClueView,tombEventCopy,tombGoldView,tombPortalLabel,createBattle,clearBattleIntent,battleReport,syncCommittedBattle,getRegion,createMap,near,lineOfSight,selectInteractionTarget,deriveStats,equipmentRows,quoteEquipment,previewRecipe,EQUIPMENT_ITEMS,EQUIPMENT_RECIPES,EQUIPMENT_SLOTS,EQUIPMENT_UPGRADES,DUNGEON_TOOLS,QUARRY_TOOLS,PASS_TOOLS,SIGNAL_TOOLS,FURNACE_TOOLS,DUNGEON_COMMANDS,QUARRY_COMMANDS,PASS_COMMANDS,SIGNAL_COMMANDS,FURNACE_COMMANDS,dungeonObjectView,quarryObjectView,quarryElderView,passObjectView,passElderView,signalObjectView,signalBlacksmithView,furnaceObjectView,furnaceBlacksmithView,campaignGuidance,chestPresentation,copyReleaseQaProfile,controlsFor,actionLabel};
 const declaredImports=new Set([...source.matchAll(/^import\s*\{([^}]+)\}/gm)].flatMap(match=>match[1].split(',').map(name=>name.trim())));
 for(const name of Object.keys(imports))assert.ok(declaredImports.has(name),`production main must import ${name}`);
 const expertCapture=createExpertInputCapture(),expertSafety=createActionSafety({capture:expertCapture,cancel:cancelBattleAction});
 const gate=createRuntimeGate(),env={...createMainInputFixture(),expertCapture,expertSafety,...imports,state:loaded.state,battle:createBattle(loaded.state),controller,paused:false,busy:false,combatSaveElapsed:0,captureBinding:null,equipmentStation:null,suppressNextClick:false,lastObjectiveHtml:'',
  profile,pauseReason:'',noticeUntil:0,input:{},displayTime:0,combatTime:0,walkTime:0,menuTime:0,arrivalWaitTime:0,focusEvents:{},
  modal,gate,candidate:namespace!=='release',saveNamespace:namespace,localStorage:storage,navigator:{locks},
  $:id=>elements[id],document:{visibilityState:'visible',hasFocus:()=>true,addEventListener:(name,fn)=>{handlers[name]=fn;}},
  audio:{setMasterVolume(){},setEnabled(){},pause:value=>calls.push(['audio-pause',value]),play:name=>calls.push(['audio-play',name])},
  router:tracedInputRouter(options=>calls.push(['router-clear',options])),deferredImmediate:{clear:()=>calls.push(['deferred-clear'])},
  canvas:{width:1280,height:720,focus:()=>calls.push(['focus-canvas'])},last:0,
  ctx:{save(){},restore(){},fillRect(){},fillText:text=>labels.push(text)},projectWorld:(x,y)=>({x,y}),ISO:{zoom:1},
  toast:text=>messages.push(text),performance:{now:()=>100},crypto:{randomUUID:()=>String(commands.length)},
 };
 const ui=vm.compileFunction(harnessSource,Object.keys(env),{filename:'production-main-tomb-ui-handlers.js'})(...Object.values(env));
 const unescape=value=>value.replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
 const buttons=()=>[...modal.innerHTML.matchAll(/<button\b([^>]*)>/g)].map(match=>({disabled:/\bdisabled\b/.test(match[1]),dataset:Object.fromEntries([...match[1].matchAll(/data-([a-z-]+)="([^"]*)"/g)].map(([,key,value])=>[key.replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase()),unescape(value)]))}));
 const wildernessButton=(id,choice)=>buttons().find(target=>{if(target.dataset.action!=='wilderness-action')return false;const c=JSON.parse(target.dataset.wildernessCommand);return (!id||c.objectId==='wilderness-'+id)&&(!choice||c.choice===choice);});
 const tombButton=(id)=>buttons().find(target=>target.dataset.action==='tomb-action'&&(!id||JSON.parse(target.dataset.tombCommand).objectId===id));
 const click=async(action,{disabled=false,target=null,detail=1}={})=>{const node=target??buttons().find(row=>row.dataset.action===action)??{disabled,dataset:{action}};await handlers.click({detail,target:{closest:()=>node},preventDefault(){},stopPropagation(){}});await nextTurn();};
 const clickTomb=async(id,options={})=>{const target=options.target??tombButton(id);assert.ok(target,'rendered Tomb button '+id);await click('tomb-action',{...options,target});};
 const move=position=>{Object.assign(ui.battle.p,{x:position.x,y:position.y});};
 const release=async failure=>{await nextTurn();assert.ok(pending,'save reached deliberate delayed boundary');const work=pending;pending=null;work.resolve(failure??store.save(work.state,work.options));await nextTurn();};
 return {ui,modal,messages,calls,events,labels,storage,store,elements,gate,commands,outcomes,buttons,tombButton,wildernessButton,click,clickTomb,move,release,delay:()=>{delayed=true;},fail:failure=>{failNext=failure;},get saveCount(){return saveCount;}};
}
function deplete(h){Object.assign(h.ui.battle.p,{hp:12,mana:3,stamina:5,recoveryLock:.3,manaDelay:.8,staminaDelay:.7,potionCooldown:2});h.ui.battle.p.cooldowns.righteous_hammer=1.7;return battleReport(h.ui.battle);}
async function usePortal(h,id){h.ui.closePanel();const portal=getRegion(h.ui.state.world.region).portals.find(row=>row.id===id);assert.ok(portal,id);h.move(portal);assert.equal(h.ui.nearest().id,id);h.ui.interact();await nextTurn();assert.equal(h.ui.state.world.region,portal.to);}

// This harness executes the unchanged production handlers with real controller,
// storage and reducers. Positions and kill reports are scripted test inputs;
// these results do not claim normal-input combat victories or visual quality.
const fixtures=new Map();function fixture(key='before',mode='cover'){if(!fixtures.has(mode))fixtures.set(mode,stages('normal',mode));return copy(fixtures.get(mode)[key]);}
async function actW(h,id,choice){h.move(wObject(id));await h.ui.showWilderness('wilderness-'+id);const target=h.wildernessButton(id,choice);assert.ok(target,'rendered action '+id);await h.click('wilderness-action',{target});}
async function settleW(h,group,at){h.ui.closePanel();if(at)h.move(wObject(at));for(const e of h.ui.battle.enemies)if(WILDERNESS_GROUPS[group].includes(e.id))e.hp=0;assert.equal(await h.ui.dispatch({type:'settleCombat',defeated:WILDERNESS_GROUPS[group],...h.ui.report()}),true);}
for(const mode of ['cover','channel'])test(`real main W ${mode}: Eda, five required groups, relic, report and optional post-report rescue`,async()=>{
 const h=await browser(earnedBattlefield()),start=copy(h.ui.state);h.move(elder);await h.ui.showNpc('elder');assert.match(h.modal.innerHTML,/황야 조사 수락/);await h.click('wilderness-action',{target:h.wildernessButton()});assert.equal(h.ui.state.world.objectives.wilderness_accepted,1);await usePortal(h,'town-wilderness-entry');
 await settleW(h,'survey','tablet');await actW(h,'tablet');assert.match(h.modal.innerHTML,/바람깃 → 돌무덤 → 잿불/);
 await settleW(h,'anchor','hook');await actW(h,'hook');assert.equal(h.ui.state.world.objectives.wilderness_anchored,0);await actW(h,'anchor');await usePortal(h,'wilderness-anchor-return');await usePortal(h,'town-wilderness-anchor');
 await settleW(h,'receiver','glyph-wind');await actW(h,'glyph-wind');h.ui.showJournal();assert.match(h.modal.innerHTML,/입력 1\/3/);await actW(h,'glyph-ember');assert.equal(h.ui.state.world.objectives.wilderness_sequence_step,0);assert.ok(h.messages.some(t=>/진행 중인 입력만/.test(t)));
 for(const glyph of ['wind','cairn','ember'])await actW(h,'glyph-'+glyph);await actW(h,'choice',mode);assert.equal(h.ui.state.world.objectives.wilderness_mode,mode==='cover'?1:2);
 await settleW(h,'relay','relay');await actW(h,'relay');await settleW(h,'approach');await settleW(h,'boss','evidence');assert.equal(h.ui.state.world.objectives.wilderness_evidence_taken,0);h.ui.drawLabels();assert.ok(h.labels.some(t=>t.includes('기록핵 미회수')));await actW(h,'evidence');await usePortal(h,'wilderness-keeper-return');
 h.move(elder);await h.ui.showNpc('elder');await h.click('wilderness-action',{target:h.wildernessButton()});assert.equal(h.ui.state.world.objectives.wilderness_reported,1);assert.equal(h.ui.state.world.objectives.wilderness_scouts_rescued,0);assert.equal(h.ui.state.stats.kills-start.stats.kills,21);assert.equal(h.ui.state.stats.earnedXp-start.stats.earnedXp,3280);assert.equal(h.ui.state.gold-start.gold,360);assert.match(h.modal.innerHTML,/후속 제작 선택은 아직 구현 준비 중/);
 h.ui.showEquipment('blacksmith');assert.match(h.modal.innerHTML,/수리소 준비 중/);assert.equal(h.buttons().some(b=>/wilderness|repair/.test(b.dataset.action)),false);assert.match(h.modal.innerHTML,/대장장이 · 매입 자금/);
 await usePortal(h,'town-wilderness-entry');await settleW(h,'scouts','scouts');await actW(h,'scouts');assert.equal(h.ui.state.world.objectives.wilderness_scouts_rescued,1);assert.equal(h.ui.state.stats.earnedXp-start.stats.earnedXp,3920);assert.equal(h.ui.state.gold-start.gold,444);assert.equal(h.wildernessButton('scouts'),undefined);
});
test('W button serializes one committed report and rejects detached stale token without restamping or healing',async()=>{
 const h=await browser(fixture('surveyGuards'));h.move(wObject('tablet'));deplete(h);await h.ui.showWilderness('wilderness-tablet');const target=h.wildernessButton(),captured=JSON.parse(target.dataset.wildernessCommand);assert.deepEqual(captured.vitals,h.store.load().state.vitals);assert.deepEqual(captured.recovery,h.store.load().state.recovery);assert.equal(captured.expectedStoreRevision,h.ui.controller.revision());
 Object.assign(h.ui.battle.p,{hp:1,mana:1,stamina:1});h.ui.battle.p.cooldowns.shield_charge=2.5;assert.equal(await h.ui.dispatch({type:'checkpoint',...h.ui.report()}),true);const paid=copy(h.ui.state);await h.click('wilderness-action',{target});assert.deepEqual(h.ui.state,paid);assert.equal(h.outcomes.at(-1).code,'STALE_STORE_REVISION');assert.deepEqual(h.commands.at(-1),captured);assert.equal(h.ui.state.world.objectives.wilderness_surveyed,0);
});
test('W placeholder pauses before delayed checkpoint, preserves newer panel, and does not expose an action early',async()=>{
 const h=await browser(fixture('surveyGuards'));h.move(wObject('tablet'));h.delay();const pending=h.ui.showWilderness('wilderness-tablet');await nextTurn();assert.equal(h.ui.paused,true);assert.equal(h.ui.busy,true);assert.equal(h.wildernessButton(),undefined);h.ui.closePanel();await h.release();await pending;assert.equal(h.modal.hidden,true);assert.equal(h.ui.state.world.objectives.wilderness_surveyed,0);
});
test('W Eda placeholder waits for an existing commit before capturing its exact revision and depleted pools',async()=>{
 const h=await browser(earnedBattlefield());h.move(elder);deplete(h);h.delay();const prior=h.ui.dispatch({type:'checkpoint',...h.ui.report()}),show=h.ui.showNpc('elder');await nextTurn();assert.equal(h.wildernessButton(),undefined);await h.release();await prior;await show;const c=JSON.parse(h.wildernessButton().dataset.wildernessCommand);assert.equal(c.expectedStoreRevision,h.ui.controller.revision());assert.deepEqual(c.vitals,h.ui.state.vitals);await h.click('wilderness-action',{target:h.wildernessButton()});assert.deepEqual(h.ui.state.vitals,c.vitals);
});
test('W double click, old modal epoch and delayed objective save never create optimistic or duplicate rewards',async()=>{
 const h=await browser(fixture('surveyGuards'));h.move(wObject('tablet'));await h.ui.showWilderness('wilderness-tablet');const target=h.wildernessButton(),before=copy(h.ui.state);await h.click('wilderness-action',{target,detail:2});assert.deepEqual(h.ui.state,before);h.delay();const pending=h.click('wilderness-action',{target});await nextTurn();assert.deepEqual(h.ui.state,before);await h.click('wilderness-action',{target});h.ui.showJournal();await h.release();await pending;assert.equal(h.ui.state.world.objectives.wilderness_surveyed,1);assert.match(h.modal.innerHTML,/탐험 기록/);assert.equal(h.ui.state.world.claimedRewards.filter(x=>x==='r12:w:survey').length,1);await h.click('wilderness-action',{target});assert.equal(h.ui.state.world.claimedRewards.filter(x=>x==='r12:w:survey').length,1);
});
for(const code of ['UNAVAILABLE','COMMIT_UNCERTAIN','CONFLICT'])test(`W failed ${code} action preserves real storage, pools and unclaimed reward`,async()=>{
 const h=await browser(fixture('surveyGuards'));h.move(wObject('tablet'));deplete(h);await h.ui.showWilderness('wilderness-tablet');const before=copy(h.ui.state);h.fail({ok:false,code,reason:code});await h.click('wilderness-action',{target:h.wildernessButton()});assert.deepEqual(h.ui.state,before);assert.deepEqual(h.store.load().state,before);assert.equal(h.ui.state.world.objectives.wilderness_surveyed,0);
});
test('W map-only choice preserves living actor identity, HP, projectiles, areas and committed paid recovery',async()=>{
 const h=await browser(fixture('calibrated'));h.move(wObject('choice'));deplete(h);const b=h.ui.battle,enemy=b.enemies.find(e=>e.hp>0);enemy.hp-=3;const hp=enemy.hp,shots=b.shots,areas=b.areas;shots.push({id:'retained-shot',x:1,y:2});areas.push({id:'retained-area'});await h.ui.showWilderness('wilderness-choice');const report=JSON.parse(h.wildernessButton('choice','channel').dataset.wildernessCommand),map=b.map;await h.click('wilderness-action',{target:h.wildernessButton('choice','channel')});assert.equal(h.ui.battle,b);assert.notEqual(b.map,map);assert.equal(b.enemies.find(e=>e.id===enemy.id),enemy);assert.equal(enemy.hp,hp);assert.equal(b.shots,shots);assert.equal(b.areas,areas);assert.deepEqual(h.ui.state.vitals,report.vitals);assert.deepEqual(h.ui.state.recovery,report.recovery);
});
test('W journal prefix, paid recovery and receipts survive real reload; dead retry carries a fresh captured store token',async()=>{
 const h=await browser(fixture('prefix'));h.move(wObject('glyph-cairn'));deplete(h);await h.ui.showWilderness('wilderness-glyph-cairn');const before=copy(h.ui.state),loaded=await browser(null,{storage:h.storage,reload:true});loaded.ui.showJournal();assert.match(loaded.modal.innerHTML,/바람깃 → 돌무덤 → 잿불/);assert.match(loaded.modal.innerHTML,/입력 1\/3/);assert.deepEqual(loaded.ui.state.recovery,before.recovery);
 loaded.ui.closePanel();loaded.ui.battle.p.hp=0;assert.equal(await loaded.ui.dispatch({type:'settleCombat',defeated:[],...loaded.ui.report()}),true);const revision=loaded.ui.controller.revision(),dead=copy(loaded.ui.state);loaded.ui.showDeath();await loaded.click('retry');assert.equal(loaded.commands.findLast(c=>c.type==='retry').expectedStoreRevision,revision);assert.equal(loaded.ui.state.world.life,dead.world.life+1);assert.equal(loaded.ui.state.stats.deaths,dead.stats.deaths);assert.equal(loaded.ui.state.world.objectives.wilderness_sequence_step,1);
});
test('current candidate title offers explicit R11 forward-copy without changing source profile',async()=>{
 const h=await browser(earnedBattlefield());h.ui.showTitle();assert.match(h.modal.innerHTML,/R14a11/);assert.match(h.modal.innerHTML,/<option value="qa-r11">이전 R11 후보 QA/);assert.match(h.modal.innerHTML,/일반 입력 검증은 아직 필요/);
});
test('W Eda capture waits for busy paid Onslaught then durable safety cancellation before exposing a command',async()=>{
 const h=await browser(earnedBattlefield());h.move(trainer);assert.equal(await h.ui.dispatch({type:'purchaseSkill',skillId:'zealous_onslaught',position:trainer}),true);h.move(elder);const b=h.ui.battle,stamina=b.p.stamina;
 mainImports.stepBattle(b,h.ui.state.character,.02,{expert1:'zealous_onslaught',channel:{held:true,ownerToken:'w-safety-fixture'}});assert.equal(b.p.action?.id,'zealous_onslaught');assert.equal(b.p.stamina,stamina-9);h.delay();const prior=h.ui.dispatch({type:'checkpoint',...h.ui.report()}),show=h.ui.showNpc('elder');await nextTurn();assert.equal(h.wildernessButton(),undefined);await h.release();await prior;await show;
 assert.equal(b.p.action,null);assert.equal(b.events.some(e=>e.type==='lanceResolved'),false);const captured=JSON.parse(h.wildernessButton().dataset.wildernessCommand);assert.equal(captured.expectedStoreRevision,h.ui.controller.revision());assert.equal(captured.vitals.stamina,stamina-9);assert.ok(captured.recovery.cooldowns.zealous_onslaught>0);assert.deepEqual(captured.recovery,h.store.load().state.recovery);assert.ok(h.commands.filter(c=>c.type==='checkpoint').length>=3);await h.click('wilderness-action',{target:h.wildernessButton()});assert.equal(h.ui.state.world.objectives.wilderness_accepted,1);assert.equal(h.ui.state.vitals.stamina,stamina-9);
});
test('W pending opening checkpoint never captures or reopens into a newer profile',async()=>{
 const h=await browser(fixture('surveyGuards'));h.move(wObject('tablet'));h.delay();const opening=h.ui.showWilderness('wilderness-tablet');await nextTurn();const other=createStore(h.storage,{profile:'qa-w-other',namespace:'qa-r12'});assert.equal(other.save(createState(),{expectedRevision:0}).ok,true);await h.ui.loadProfile('qa-w-other',false);assert.ok(h.ui.state);const newer=copy(h.ui.state),owner=h.ui.controller,battle=h.ui.battle;await h.release();await opening;assert.equal(h.ui.controller,owner);assert.equal(h.ui.battle,battle);assert.deepEqual(h.ui.state,newer);assert.equal(h.wildernessButton(),undefined);
});
test('W actual interaction resolves its object and leaves completed hidden pickups out of target selection',async()=>{
 const h=await browser(fixture('anchorGuards'));h.move(wObject('hook'));assert.equal(h.ui.nearest().id,'wilderness-hook');h.ui.interact();await nextTurn();assert.ok(h.wildernessButton('hook'));await h.click('wilderness-action',{target:h.wildernessButton('hook')});h.ui.closePanel();assert.notEqual(h.ui.nearest()?.id,'wilderness-hook');assert.equal(h.ui.state.inventory.tools.filter(x=>x==='wilderness_hook').length,1);
});
test('W captured Eda action cannot complete at Orin and keeps his existing shop intact',async()=>{
 const h=await browser(earnedBattlefield());h.move(smith);await h.ui.showNpc('elder');const before=copy(h.ui.state);await h.click('wilderness-action',{target:h.wildernessButton()});assert.deepEqual(h.ui.state,before);assert.equal(h.outcomes.at(-1).code,'ELDER_REQUIRED');await h.ui.showNpc('blacksmith');assert.match(h.modal.innerHTML,/대장장이 · 매입 자금/);assert.equal(h.wildernessButton(),undefined);
});
test('fresh untrained profile keeps manual checkpoint and save-to-title behavior with implicit life zero',async()=>{
 const h=await browser(createState());assert.equal(h.ui.state.world.life,undefined);assert.equal(h.ui.battle.stateLife,0);await h.click('save');assert.equal(h.outcomes.at(-1).ok,true);assert.equal(h.ui.state.vitals,undefined);await h.click('leave');assert.equal(h.ui.state,null);assert.match(h.modal.innerHTML,/EMBERWATCH/);assert.equal(h.store.load().state.vitals,undefined);
});
