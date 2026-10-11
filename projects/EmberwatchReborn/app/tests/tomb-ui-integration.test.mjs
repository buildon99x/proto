import {createMainInputFixture,mainInputSource,tracedInputRouter} from './support/main-input-fixture.mjs';
import {wildernessSceneVisibility} from '../src/wilderness-scene-visibility.js';
import {mainImports} from './support/main-imports.mjs';
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
const exposed=['showBattlefield','showTomb','showJournal','showMenu','updateHud','loadProfile','dispatch','nearest','interact','showFurnace','showNpc','showEquipment','showObjective','showTitle','showDeath','drawLabels','closePanel'];
const harnessSource=[mainInputSource,
 between('const esc=','function clearInput('),between('const tierLabel=','const focusEvents='),between('const config=','let controller='),
 between('const statNames=','let equipmentStation='),...browserFunctions.map(mainFunction),
 // Execute the current production objective HUD fragment, including its guard.

 between("document.addEventListener('click',", "document.addEventListener('change',"),
 `return {${exposed.join(',')},get state(){return state},get battle(){return battle},get paused(){return paused},get busy(){return busy},get controller(){return controller},get equipmentStation(){return equipmentStation}};`,
].join('\n');
const cache=new Map();
function stage(name='predecessor',difficulty='hard'){
 const key=[name,difficulty].join(':');if(cache.has(key))return copy(cache.get(key));let s;
 if(name==='predecessor')s=earnedFurnaceRoute(difficulty);
 else if(name==='accepted'){s=stage('predecessor',difficulty);s=run(s,{type:'acceptTombQuest',...report(s,elder),expectedRevision:tombInputRevision(s)}).state;}
 else if(name==='entry')s=travel(stage('accepted',difficulty),'town-tomb-entry');
 else if(name==='decode-ready')s=settle(stage('entry',difficulty),TOMB_GROUPS.entry,point('tomb-projection'));
 else if(name==='decoded')s=acted(stage('decode-ready',difficulty),'tomb-projection');
 else if(name==='glyph-ready')s=settle(stage('decoded',difficulty),TOMB_GROUPS.inscription,point('tomb-glyph-crescent'));
 else if(name==='partial')s=acted(stage('glyph-ready',difficulty),'tomb-glyph-crescent');
 else if(name==='solved'){s=acted(stage('partial',difficulty),'tomb-glyph-split-beam');s=acted(s,'tomb-glyph-ember');}
 else if(name==='carried')s=acted(stage('solved',difficulty),'tomb-ward-origin');
 else if(name==='midpoint-ready')s=settle(stage('carried',difficulty),TOMB_GROUPS.ward_lower,point('tomb-ward-midpoint'));
 else if(name==='midpoint')s=acted(stage('midpoint-ready',difficulty),'tomb-ward-midpoint');
 else if(name==='seal-ready')s=settle(stage('midpoint',difficulty),TOMB_GROUPS.ward_upper,point('tomb-ward-final'));
 else if(name==='sealed')s=acted(stage('seal-ready',difficulty),'tomb-ward-final');
 else if(name==='boss-down')s=settle(stage('sealed',difficulty),TOMB_GROUPS.boss,point('tomb-oath'));
 else if(name==='oath')s=acted(stage('boss-down',difficulty),'tomb-oath');
 else if(name==='report-ready')s=travel(stage('oath',difficulty),'tomb-boss-return');
 else if(name==='reported'){s=stage('report-ready',difficulty);s=run(s,{type:'reportTombQuest',...report(s,elder),expectedRevision:tombInputRevision(s)}).state;}
 else assert.fail('unknown fixture stage '+name);
 assert.equal(validateState(s).ok,true);cache.set(key,copy(s));return copy(s);
}
function acted(s,id){const object=point(id);return run(s,{type:'interactTomb',objectId:id,...report(s,object),expectedRevision:tombInputRevision(s),...(object.actionKind==='glyph'?{glyph:object.glyph,expectedStep:s.world.objectives.tomb_sequence_step}:{})}).state;}
const economy=s=>copy({character:s.character,gold:s.gold,stats:s.stats,inventory:s.inventory,receipts:s.world.claimedRewards});
async function browser(saved,{storage=memory(),profile='qa-tomb-ui',namespace='qa-r10',reload=false}={}){
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
 const imports={...mainImports,BATTLEFIELD_TOOLS,BATTLEFIELD_COMMANDS,battlefieldObjectView,battlefieldElderView,battlefieldGuidance,battlefieldCommandFields,battlefieldPortalLabel,battlefieldEventCopy,previewExpertPromotion,quoteAction,EXPERT_SLOTS,emptyActionSlots,combatCheckpoint,createController,createSession,previewSkill,RUNTIME_SKILL_IDS,xpForLevel,previewPromotion,tokenLabel,FOES,TOMB_COMMANDS,TOMB_TOOLS,tombWardCarried,tombObjectView,tombElderView,tombCommandFields,tombClueView,tombEventCopy,tombGoldView,tombPortalLabel,createBattle,clearBattleIntent,battleReport,syncCommittedBattle,getRegion,createMap,near,lineOfSight,selectInteractionTarget,deriveStats,equipmentRows,quoteEquipment,previewRecipe,EQUIPMENT_ITEMS,EQUIPMENT_RECIPES,EQUIPMENT_SLOTS,EQUIPMENT_UPGRADES,DUNGEON_TOOLS,QUARRY_TOOLS,PASS_TOOLS,SIGNAL_TOOLS,FURNACE_TOOLS,DUNGEON_COMMANDS,QUARRY_COMMANDS,PASS_COMMANDS,SIGNAL_COMMANDS,FURNACE_COMMANDS,dungeonObjectView,quarryObjectView,quarryElderView,passObjectView,passElderView,signalObjectView,signalBlacksmithView,furnaceObjectView,furnaceBlacksmithView,campaignGuidance,chestPresentation,copyReleaseQaProfile,controlsFor,actionLabel};
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
 const tombButton=(id)=>buttons().find(target=>target.dataset.action==='tomb-action'&&(!id||JSON.parse(target.dataset.tombCommand).objectId===id));
 const click=async(action,{disabled=false,target=null,detail=1}={})=>{const node=target??buttons().find(row=>row.dataset.action===action)??{disabled,dataset:{action}};await handlers.click({detail,target:{closest:()=>node},preventDefault(){},stopPropagation(){}});await nextTurn();};
 const clickTomb=async(id,options={})=>{const target=options.target??tombButton(id);assert.ok(target,'rendered Tomb button '+id);await click('tomb-action',{...options,target});};
 const move=position=>{Object.assign(ui.battle.p,{x:position.x,y:position.y});};
 const release=async failure=>{await nextTurn();assert.ok(pending,'save reached deliberate delayed boundary');const work=pending;pending=null;work.resolve(failure??store.save(work.state,work.options));await nextTurn();};
 return {ui,modal,messages,calls,events,labels,storage,store,elements,gate,commands,outcomes,buttons,tombButton,click,clickTomb,move,release,delay:()=>{delayed=true;},fail:failure=>{failNext=failure;},get saveCount(){return saveCount;}};
}
function deplete(h){Object.assign(h.ui.battle.p,{hp:12,mana:3,stamina:5,recoveryLock:.3,manaDelay:.8,staminaDelay:.7,potionCooldown:2});h.ui.battle.p.cooldowns.righteous_hammer=1.7;return battleReport(h.ui.battle);}
async function usePortal(h,id){h.ui.closePanel();const portal=getRegion(h.ui.state.world.region).portals.find(row=>row.id===id);assert.ok(portal,id);h.move(portal);assert.equal(h.ui.nearest().id,id);h.ui.interact();await nextTurn();assert.equal(h.ui.state.world.region,portal.to);}
async function scriptedDefeats(h,group,id){h.ui.closePanel();h.move(point(id));for(const enemy of h.ui.battle.enemies)if(TOMB_GROUPS[group].includes(enemy.id))enemy.hp=0;assert.equal(await h.ui.dispatch({type:'settleCombat',defeated:TOMB_GROUPS[group],...battleReport(h.ui.battle)}),true);}
function renderObjects(h){const line=source.split('\n').find(line=>line.includes('const r=getRegion(battle.region),objects='));return vm.compileFunction(line+'\nreturn objects;',['state','battle','getRegion','battlefieldObjectView','tombObjectView','furnaceObjectView','signalObjectView','passObjectView','quarryObjectView','dungeonObjectView'])(h.ui.state,h.ui.battle,getRegion,battlefieldObjectView,tombObjectView,furnaceObjectView,signalObjectView,passObjectView,quarryObjectView,dungeonObjectView);}

for(const difficulty of ['normal','hard'])for(const shortcut of [false,true])test(`actual ${difficulty} T UI completes explicit four chambers, ${shortcut?'optional stair':'original return'}, oath and Eda report`,async()=>{
 const h=await browser(stage('predecessor',difficulty)),start=copy(h.ui.state);h.move(elder);h.ui.showNpc('elder');await nextTurn();assert.match(h.modal.innerHTML,/신호 묘실 조사 수락/);const accept=h.tombButton();assert.equal(JSON.parse(accept.dataset.tombCommand).expectedRevision,0);
 await h.clickTomb();assert.equal(h.ui.state.world.objectives.tomb_accepted,1);assert.equal(h.ui.state.gold,start.gold);await usePortal(h,'town-tomb-entry');
 await scriptedDefeats(h,'entry','tomb-projection');await h.ui.showTomb('tomb-projection');await h.clickTomb();assert.equal(h.ui.state.world.objectives.tomb_decoded,1);assert.match(h.modal.innerHTML,/초승달 → 갈라진 빛줄기 → 잿불/);
 if(shortcut){h.ui.closePanel();h.move(point('tomb-shortcut'));await h.ui.showTomb('tomb-shortcut');await h.clickTomb();await usePortal(h,'tomb-town-shortcut');await usePortal(h,'town-tomb-shortcut');}else{await usePortal(h,'tomb-town-return');await usePortal(h,'town-tomb-entry');}
 await scriptedDefeats(h,'inscription','tomb-glyph-crescent');
 for(const id of ['tomb-glyph-crescent','tomb-glyph-split-beam','tomb-glyph-ember']){h.move(point(id));await h.ui.showTomb(id);await h.clickTomb(id);}
 assert.equal(h.ui.state.world.objectives.tomb_sequence_solved,1);
 for(const [group,id,flag] of [[null,'tomb-ward-origin','tomb_ward_taken'],['ward_lower','tomb-ward-midpoint','tomb_ward_midpoint'],['ward_upper','tomb-ward-final','tomb_ward_sealed']]){
  if(group)await scriptedDefeats(h,group,id);h.move(point(id));await h.ui.showTomb(id);await h.clickTomb(id);assert.equal(h.ui.state.world.objectives[flag],1);assert.equal(h.tombButton(id),undefined);
 }
 await scriptedDefeats(h,'boss','tomb-oath');assert.equal(h.ui.state.world.objectives.tomb_oath_taken,0);assert.equal(h.ui.state.inventory.tools.includes('tomb_oath'),false);
 h.ui.drawLabels();assert.ok(h.labels.some(text=>/서약문 미회수/.test(text)));await h.ui.showTomb('tomb-oath');await h.clickTomb();assert.equal(h.ui.state.world.objectives.tomb_oath_taken,1);assert.equal(h.ui.state.world.objectives.tomb_reported,0);
 await usePortal(h,'tomb-boss-return');h.move(elder);h.ui.showNpc('elder');await nextTurn();assert.match(h.modal.innerHTML,/에다에게 신호 묘실 보고/);
 const before=copy(h.ui.state),button=h.tombButton();await h.clickTomb();assert.equal(h.ui.state.world.objectives.tomb_reported,1);assert.equal(h.ui.state.gold,before.gold+120);assert.equal(h.ui.state.reservedTrainingGold.expert,120);assert.equal(h.ui.state.character.tier,'adept');assert.equal(h.ui.state.world.objectives.tomb_shortcut_open,Number(shortcut));
 assert.equal(h.ui.state.stats.earnedXp-before.stats.earnedXp,140);assert.equal(h.ui.state.world.claimedRewards.filter(id=>id==='r10:t:report').length,1);assert.equal(h.tombButton(),undefined);assert.match(h.modal.innerHTML,/자동 승급이나 기술 습득이 아닙니다/);
 const once=copy(h.ui.state);await h.clickTomb(null,{target:button});assert.deepEqual(h.ui.state,once);assert.deepEqual(h.store.load().state,once);
 if(difficulty==='hard'){assert.equal(before.character.level,14);assert.equal(h.ui.state.character.level,15);}
});

for(const [stageName,id] of [['decode-ready','tomb-projection'],['partial','tomb-glyph-split-beam'],['solved','tomb-ward-origin'],['midpoint-ready','tomb-ward-midpoint'],['seal-ready','tomb-ward-final']])test(`actual ${stageName} map update preserves the battle, live tells and paid resource recovery`,async()=>{
 const h=await browser(stage(stageName));h.move(point(id));await h.ui.showTomb(id);const b=h.ui.battle,map=b.map,enemies=b.enemies,shots=b.shots,areas=b.areas,paid=deplete(h),live=b.enemies.find(e=>e.hp>0);
 live.pathTimer=8;live.windup=.4;live.tell={fixture:'committed'};const tell=live.tell;
 await h.clickTomb(id);assert.equal(h.ui.battle,b);assert.equal(b.enemies,enemies);assert.equal(b.shots,shots);assert.equal(b.areas,areas);assert.equal(live.tell,tell);assert.equal(live.windup,.4);
 assert.deepEqual(h.ui.state.vitals,paid.vitals);assert.deepEqual(h.ui.state.recovery,paid.recovery);assert.deepEqual(battleReport(b).vitals,paid.vitals);assert.deepEqual(battleReport(b).recovery,paid.recovery);
 if(stageName==='partial'){assert.equal(b.map,map);assert.equal(live.pathTimer,8);}else{assert.notEqual(b.map,map);assert.equal(live.pathTimer,0);}
});

test('actual captured glyph tokens reject old panel clicks and double-click activation without becoming a wrong glyph',async()=>{
 const h=await browser(stage('glyph-ready'));h.move(point('tomb-glyph-crescent'));await h.ui.showTomb('tomb-glyph-crescent');const old=h.tombButton(),fields=JSON.parse(old.dataset.tombCommand);
 assert.equal(fields.glyph,'crescent');assert.equal(fields.expectedStep,0);assert.equal(fields.expectedRevision,tombInputRevision(h.ui.state));
 await h.clickTomb(null,{target:old});assert.equal(h.ui.state.world.objectives.tomb_sequence_step,1);const after=copy(h.ui.state),count=h.commands.length;
 await h.clickTomb(null,{target:old});await h.clickTomb(null,{detail:2});assert.deepEqual(h.ui.state,after);assert.equal(h.commands.length,count);assert.equal(h.messages.some(text=>/초기화했습니다/.test(text)),false);
 // Separate genuinely fresh single activation of the wrong plate resets only prefix.
 const fresh=h.tombButton();await h.clickTomb(null,{target:fresh,detail:1});assert.equal(h.ui.state.world.objectives.tomb_sequence_step,0);assert.equal(h.ui.state.gold,after.gold);assert.equal(h.ui.state.stats.earnedXp,after.stats.earnedXp);assert.deepEqual(h.ui.state.vitals,after.vitals);assert.match(h.messages.at(-1),/초승달.*갈라진 빛줄기.*0\/3/);
});

test('actual current panel carries the old revision through another committed T input and gets STALE_REVISION',async()=>{
 const h=await browser(stage('glyph-ready'));h.move(point('tomb-glyph-crescent'));await h.ui.showTomb('tomb-glyph-crescent');const captured=h.tombButton(),fields=JSON.parse(captured.dataset.tombCommand);
 assert.equal(await h.ui.dispatch({...fields,...battleReport(h.ui.battle)}),true);const once=copy(h.ui.state);await h.clickTomb(null,{target:captured});assert.equal(h.outcomes.at(-1).code,'STALE_REVISION');assert.deepEqual(h.ui.state,once);assert.equal(h.commands.at(-1).expectedRevision,fields.expectedRevision);assert.equal(h.commands.at(-1).expectedStep,0);
});

test('actual rapid concurrent glyph clicks issue one controller command and award once',async()=>{
 const h=await browser(stage('decode-ready'));h.move(point('tomb-projection'));await h.ui.showTomb('tomb-projection');const target=h.tombButton(),before=copy(h.ui.state);h.delay();const first=h.clickTomb(null,{target});await nextTurn();const count=h.commands.length;await h.clickTomb(null,{target});assert.equal(h.commands.length,count);await h.release();await first;
 assert.equal(h.ui.state.stats.earnedXp-before.stats.earnedXp,100);assert.equal(h.ui.state.world.claimedRewards.filter(id=>id==='r10:t:decode').length,1);
});

for(const operation of ['decode','glyph','accept','report'])for(const navigation of ['close','objective','menu','journal'])test(`actual pending T ${operation} commit cannot replace newer ${navigation} navigation`,async()=>{
 const name={decode:'decode-ready',glyph:'glyph-ready',accept:'predecessor',report:'report-ready'}[operation],h=await browser(stage(name));
 if(operation==='accept'||operation==='report'){h.move(elder);h.ui.showNpc('elder');await nextTurn();}else{const id=operation==='decode'?'tomb-projection':'tomb-glyph-crescent';h.move(point(id));await h.ui.showTomb(id);}
 h.delay();const committing=h.clickTomb();await nextTurn();assert.equal(h.ui.busy,true);await h.click(navigation);const html=h.modal.innerHTML,hidden=h.modal.hidden,paused=h.ui.paused,count=h.saveCount;
 await h.release();await committing;assert.equal(h.modal.innerHTML,html);assert.equal(h.modal.hidden,hidden);assert.equal(h.ui.paused,paused);assert.equal(h.saveCount,count);assert.deepEqual(h.store.load().state,h.ui.state);
 assert.equal(h.ui.state.world.objectives[{decode:'tomb_decoded',glyph:'tomb_sequence_step',accept:'tomb_accepted',report:'tomb_reported'}[operation]],1);
});

for(const navigation of ['close','objective','menu','journal'])test(`actual pending T opening checkpoint yields to newer ${navigation}`,async()=>{
 const h=await browser(stage('decode-ready'));h.move(point('tomb-projection'));h.delay();const opening=h.ui.showTomb('tomb-projection');await nextTurn();await h.click(navigation);const html=h.modal.innerHTML,hidden=h.modal.hidden,paused=h.ui.paused;await h.release();await opening;assert.equal(h.modal.innerHTML,html);assert.equal(h.modal.hidden,hidden);assert.equal(h.ui.paused,paused);assert.equal(h.ui.state.world.objectives.tomb_decoded,0);
});

test('actual delayed commit cannot replace a newly loaded profile or its modal ownership',async()=>{
 const h=await browser(stage('decode-ready'));h.move(point('tomb-projection'));await h.ui.showTomb('tomb-projection');h.delay();const choosing=h.clickTomb();await nextTurn();
 const other=createStore(h.storage,{profile:'qa-other',namespace:'qa-r10'});assert.equal(other.save(createState(),{expectedRevision:0}).ok,true);await h.ui.loadProfile('qa-other',false);assert.ok(h.ui.state,h.modal.innerHTML);const newer=copy(h.ui.state),b=h.ui.battle;await h.release();await choosing;
 assert.deepEqual(h.ui.state,newer);assert.equal(h.ui.battle,b);assert.equal(h.ui.state.world.objectives.tomb_accepted,undefined);assert.equal(h.store.load().state.world.objectives.tomb_decoded,1);
});

for(const name of ['decoded','partial','solved','carried','midpoint','sealed','boss-down','oath','report-ready','reported'])test(`actual ${name} journal preserves the complete decoded clue independently of the current goal`,async()=>{
 const h=await browser(stage(name));assert.deepEqual(campaignGuidance(h.ui.state),tombGuidance(h.ui.state));h.ui.showObjective();await nextTurn();assert.ok(h.modal.innerHTML.includes(tombGuidance(h.ui.state).title));assert.match(h.modal.innerHTML,/data-action="journal"/);const before=copy(h.ui.state);await h.click('journal');assert.match(h.modal.innerHTML,/초승달 → 갈라진 빛줄기 → 잿불/);assert.match(h.modal.innerHTML,/기록/);assert.deepEqual(h.ui.state,before);assert.equal(h.ui.paused,true);
 const resumed=await browser(null,{storage:h.storage,reload:true});resumed.ui.showJournal();assert.match(resumed.modal.innerHTML,/초승달 → 갈라진 빛줄기 → 잿불/);
});

test('actual decoded projection remains available and reread updates its token without extra reward',async()=>{
 const h=await browser(stage('solved'));h.move(point('tomb-projection'));assert.equal(h.ui.nearest().id,'tomb-projection');await h.ui.showTomb('tomb-projection');assert.match(h.modal.innerHTML,/투영 단서 다시 읽기/);const before=copy(h.ui.state);await h.clickTomb();assert.deepEqual(economy(h.ui.state),economy(before));assert.equal(tombInputRevision(h.ui.state),tombInputRevision(before)+1);assert.equal(h.ui.state.world.objectives.tomb_sequence_solved,1);assert.ok(h.tombButton());
});

for(const [name,id,used]of [['entry','tomb-projection',false],['entry','tomb-ward-origin',false],['entry','tomb-oath',false],['decoded','tomb-projection',true],['solved','tomb-glyph-crescent',true],['carried','tomb-ward-origin',true],['midpoint','tomb-ward-midpoint',true],['sealed','tomb-ward-final',true],['oath','tomb-oath',true]])test(`actual ${name} object ${id} uses explicit completed state rather than absent actions`,async()=>{
 const h=await browser(stage(name)),object=point(id),view=tombObjectView(h.ui.state,object);h.move(object);await h.ui.showTomb(id);assert.equal(view.completed,used);assert.equal(renderObjects(h).find(o=>o.id===id).used,used);assert.equal(renderObjects(h).find(o=>o.id===id).glyph,object.glyph);
 if(object.hideWhenCompleted)assert.equal(h.ui.nearest()?.id===id,!used);if(!used&&!view.actions.length)assert.equal(h.tombButton(),undefined);
});

for(const ready of [false,true])test(`actual town T portals are ${ready?'visible and selectable after acceptance':'absent from labels, render objects and selection before acceptance'}`,async()=>{
 const h=await browser(stage(ready?'accepted':'predecessor')),portals=getRegion('ash_hamlet').portals.filter(p=>p.gate?.startsWith('tomb_'));h.ui.drawLabels();
 for(const portal of portals){h.move(portal);assert.equal(h.labels.includes(tombPortalLabel(h.ui.state,portal)),ready);assert.equal(renderObjects(h).some(o=>o.id===portal.id),ready);assert.equal(h.ui.nearest()?.id===portal.id,ready);}
});

test('actual T optional stair precedence is limited to its ready reachable console pair',async()=>{
 const h=await browser(stage('decoded'));h.move({x:124,y:368});assert.equal(h.ui.nearest()?.id,'tomb-shortcut');h.ui.battle.map=copy(h.ui.battle.map);h.ui.battle.map.tiles[11][3]=0;assert.notEqual(h.ui.nearest()?.id,'tomb-shortcut');
 h.ui.battle.map=createMap(TOMB_REGION,h.ui.state);h.move({x:156.001,y:368});assert.equal(h.ui.nearest()?.id,'tomb-town-shortcut');h.move({x:156,y:368});assert.equal(h.ui.nearest()?.id,'tomb-shortcut');
 h.move(point('tomb-shortcut'));await h.ui.showTomb('tomb-shortcut');await h.clickTomb();h.move({x:124,y:368});assert.equal(h.ui.nearest()?.id,'tomb-town-shortcut');assert.equal(h.ui.state.world.objectives.tomb_sequence_solved,0);
 const unready=await browser(stage('entry'));unready.move({x:124,y:368});assert.equal(unready.ui.nearest()?.id,'tomb-town-shortcut');
});

for(const name of ['predecessor','report-ready','reported'])test(`actual ${name} T quest actions belong only to Eda while Orin keeps equipment and Bran keeps skills`,async()=>{
 const h=await browser(stage(name));for(const [id,position]of [['blacksmith',smith],['trainer',trainer]]){h.move(position);h.ui.showNpc(id);await nextTurn();assert.equal(h.tombButton(),undefined);assert.match(h.modal.innerHTML,id==='blacksmith'?/data-action="buy:/:/전사의 훈련/);}
 h.move(elder);h.ui.showNpc('elder');await nextTurn();assert.equal(!!h.tombButton(),name!=='reported');
});

test('actual T HUD, inventory, shop and workshop show the same total, spendable and protected gold',async()=>{
 const h=await browser(stage('reported')),balance=tombGoldView(h.ui.state);h.ui.updateHud();for(const text of [`총 ${balance.totalGold} G`,`사용 가능 ${balance.spendableGold} G`,'훈련 예약 120 G'])assert.ok(h.elements.vitals.innerHTML.includes(text));
 for(const station of [null,'blacksmith','workshop']){h.ui.showEquipment(station);assert.ok(h.modal.innerHTML.includes(balance.detail));assert.match(h.modal.innerHTML,/서약문/);assert.doesNotMatch(h.modal.innerHTML,/tomb_oath/);}
 // Explicit economic fixture: retain globally valid earned T receipts but spend all ordinary gold.
 let s=stage('reported');s.gold=120;s.stats.spentGold=s.stats.earnedGold-120;assert.equal(validateState(s).ok,true);const poor=await browser(s);poor.move(smith);poor.ui.showEquipment('blacksmith');assert.match(poor.modal.innerHTML,/쓸 수 있는 금화 0/);const buy=poor.buttons().find(b=>b.dataset.action==='buy:padded_hood');assert.equal(buy.disabled,true);const before=copy(poor.ui.state);await poor.click('buy:padded_hood');assert.deepEqual(poor.ui.state,before);
});

test('actual custom interaction label stays synchronized in T object, objective and HUD text',async()=>{
 let s=stage('partial');const rebound=rebindControl(controlsFor(s),'interact',0,'KeyG');assert.equal(rebound.ok,true);s=run(s,{type:'setControls',controls:rebound.controls}).state;const h=await browser(s);h.move(point('tomb-glyph-split-beam'));await h.ui.showTomb('tomb-glyph-split-beam');assert.match(h.modal.innerHTML,/상호작용\(G\)/);h.ui.showObjective();await nextTurn();assert.match(h.modal.innerHTML,/상호작용\(G\)/);assert.match(h.elements.objective.innerHTML,/G 대화/);
});

for(const failure of [{ok:false,code:'SAVE_FAILED',reason:'fixture pre-head storage failure'},{ok:false,code:'COMMIT_UNCERTAIN',reason:'fixture ambiguous durable commit'}])test(`actual T ${failure.code} neither advances the panel nor invents reward and reload restores saved prefix`,async()=>{
 const h=await browser(stage('partial'));h.move(point('tomb-glyph-split-beam'));await h.ui.showTomb('tomb-glyph-split-beam');const before=copy(h.ui.state),target=h.tombButton();h.fail(failure);await h.clickTomb(null,{target});assert.deepEqual(h.ui.state,before);assert.equal(h.ui.state.world.objectives.tomb_sequence_step,1);assert.equal(h.messages.some(text=>/순서 2\/3/.test(text)),false);
 if(failure.code==='COMMIT_UNCERTAIN'){assert.equal(h.gate.blocked,true);await h.click('reload');assert.equal(h.gate.blocked,false);await h.ui.showTomb('tomb-glyph-split-beam');}
 await h.clickTomb();assert.equal(h.ui.state.world.objectives.tomb_sequence_step,2);assert.deepEqual(h.store.load().state,h.ui.state);
});

test('actual dead carry save shows retry, cannot manipulate T, and preserves relay progress after retry and return',async()=>{
 const h=await browser(stage('midpoint'));h.ui.battle.p.hp=0;assert.equal(await h.ui.dispatch({type:'settleCombat',defeated:[],...battleReport(h.ui.battle)}),true);h.ui.showDeath();const dead=copy(h.ui.state),html=h.modal.innerHTML;assert.match(html,/예약금은 보존/);await h.ui.showTomb('tomb-ward-final');h.ui.showNpc('elder');assert.equal(h.modal.innerHTML,html);assert.deepEqual(h.ui.state,dead);
 const resumed=await browser(null,{storage:h.storage,reload:true});resumed.ui.showDeath();await resumed.click('retry');await usePortal(resumed,'town-tomb-entry');assert.equal(resumed.ui.state.world.objectives.tomb_ward_midpoint,1);assert.equal(tombWardCarried(resumed.ui.state),true);assert.equal(resumed.ui.state.world.objectives.tomb_ward_sealed,0);
});

test('actual main renderer forwards the durable carried ward without changing game state',async()=>{
 const start=source.indexOf('const renderObservation=inputLatency.renderEntered('),end=source.indexOf('drawLabels(sceneVisibility);',start)+'drawLabels(sceneVisibility);'.length;
 for(const name of ['solved','carried','midpoint','sealed']){const saved=stage(name),before=copy(saved),battle=createBattle(saved);let rendered;vm.runInNewContext(source.slice(start,end),{...createMainInputFixture(),config:()=>controlsFor(saved),sceneVisibility:wildernessSceneVisibility(battle),renderer:{render:args=>rendered=args},canvas:{width:900,height:650},battle,objects:[],state:saved,tombWardCarried,drawLabels(){}});assert.equal(rendered.wardCarried,['carried','midpoint'].includes(name));assert.deepEqual(saved,before);}
});

test('actual R11 candidate title separates observed Normal T from unqualified Expert/B and offers R10 forward copy',async()=>{
 const h=await browser(stage('predecessor'),{namespace:'qa-r11'});h.ui.showTitle();assert.match(h.modal.innerHTML,/R14a8 · POE형 전사 입력 개발 후보/);assert.match(h.modal.innerHTML,/일반 조작으로 확인했습니다/);assert.match(h.modal.innerHTML,/마스터.*아직 완성되지 않았습니다/);assert.match(h.modal.innerHTML,/<option value="qa-r10">/);assert.match(h.modal.innerHTML,/전문가 승급.*일반 입력 검증 중/);assert.doesNotMatch(h.modal.innerHTML,/data-action="new"/);
});

for(const operation of ['accept','oath','report'])test(`actual T ${operation} synchronizes paid pools without rebuilding the live battle`,async()=>{
 const h=await browser(stage({accept:'predecessor',oath:'boss-down',report:'report-ready'}[operation]));if(operation==='oath'){h.move(point('tomb-oath'));await h.ui.showTomb('tomb-oath');}else{h.move(elder);h.ui.showNpc('elder');await nextTurn();}
 const b=h.ui.battle,map=b.map,paid=deplete(h);await h.clickTomb();assert.equal(h.ui.battle,b);assert.equal(b.map,map);assert.deepEqual(h.ui.state.vitals,paid.vitals);assert.deepEqual(h.ui.state.recovery,paid.recovery);assert.deepEqual(battleReport(b).vitals,paid.vitals);assert.deepEqual(battleReport(b).recovery,paid.recovery);
});

test('actual T two-tab glyph conflict blocks resume and reload restores exactly the other saved prefix',async()=>{
 const h=await browser(stage('glyph-ready'));h.move(point('tomb-glyph-crescent'));await h.ui.showTomb('tomb-glyph-crescent');const before=copy(h.ui.state),other=createStore(h.storage,{profile:'qa-tomb-ui',namespace:'qa-r10'}),latest=other.load(),advanced=acted(latest.state,'tomb-glyph-crescent');assert.equal(other.save(advanced,{expectedRevision:latest.revision}).ok,true);
 await h.clickTomb();assert.equal(h.outcomes.at(-1).code,'CONFLICT');assert.equal(h.gate.blocked,true);assert.deepEqual(h.ui.state,before);assert.match(h.modal.innerHTML,/저장을 확인해야 합니다/);h.ui.closePanel();assert.equal(h.modal.hidden,false);
 await h.click('reload');assert.equal(h.gate.blocked,false);assert.deepEqual(h.ui.state,advanced);assert.equal(h.ui.state.world.objectives.tomb_sequence_step,1);h.move(point('tomb-glyph-split-beam'));await h.ui.showTomb('tomb-glyph-split-beam');await h.clickTomb();assert.equal(h.ui.state.world.objectives.tomb_sequence_step,2);
});

test('actual dead report snapshot cannot pay the commission even if its old Eda button is replayed',async()=>{
 const h=await browser(stage('report-ready'));h.move(elder);h.ui.showNpc('elder');await nextTurn();const target=h.tombButton();h.ui.battle.p.hp=0;const before=copy(h.ui.state);await h.clickTomb(null,{target});assert.equal(h.outcomes.at(-1).code,'HERO_DOWN');assert.deepEqual(h.ui.state,before);assert.equal(h.ui.state.reservedTrainingGold.expert,0);
});

test('actual no-prerequisite Eda and fresh town never expose T acceptance or either T entrance',async()=>{
 const h=await browser(createState());h.ui.showNpc('elder');await nextTurn();assert.equal(h.tombButton(),undefined);h.ui.drawLabels();for(const portal of getRegion('ash_hamlet').portals.filter(row=>row.gate?.startsWith('tomb_'))){h.move(portal);assert.notEqual(h.ui.nearest()?.id,portal.id);assert.equal(renderObjects(h).some(row=>row.id===portal.id),false);assert.equal(h.labels.some(label=>label.startsWith(portal.name)),false);}
});

test('actual T report with explicitly spent-to-zero gold remains available at earned Hard L14 and reserves its own reward',async()=>{
 // Economic-only synthetic fixture: XP, level, tier, tools and quest flags remain command-earned.
 const saved=stage('report-ready');saved.gold=0;saved.stats.spentGold=saved.stats.earnedGold;assert.equal(saved.character.level,14);assert.equal(validateState(saved).ok,true);
 const h=await browser(saved);h.move(elder);h.ui.showNpc('elder');await nextTurn();assert.ok(h.tombButton());await h.clickTomb();assert.equal(h.ui.state.character.level,15);assert.equal(h.ui.state.gold,120);assert.equal(h.ui.state.reservedTrainingGold.expert,120);assert.equal(tombGoldView(h.ui.state).spendableGold,0);
});

test('actual R10 copy handler loads an earned R9 source into a new isolated slot and never overwrites either source or existing target',async()=>{
 const storage=memory(),saved=stage('predecessor'),original=createStore(storage,{profile:'qa-r9-source',namespace:'qa-r9'});assert.equal(original.save(saved,{expectedRevision:0}).ok,true);
 const h=await browser(saved,{storage}),before=new Map(storage.data);h.elements.profile.value='qa-r10-copy';h.elements.sourceNamespace.value='qa-r9';h.elements.sourceProfile.value='qa-r9-source';h.ui.showTitle();await h.click('candidate-copy');assert.deepEqual(h.ui.state,saved);
 const target=createStore(storage,{profile:'qa-r10-copy',namespace:'qa-r10'});assert.deepEqual(target.load().state,saved);for(const [key,value]of before)assert.equal(storage.data.get(key),value);const bytes=new Map(storage.data);h.ui.showTitle();await h.click('candidate-copy');assert.deepEqual(storage.data,bytes);assert.match(h.modal.innerHTML,/이미 후보 기록/);
});

test('guidance correction: actual first T acceptance uses neutral travel copy and one current-goal paragraph at Eda',async()=>{
 const h=await browser(stage('predecessor'));h.move(elder);h.ui.showNpc('elder');await nextTurn();await h.clickTomb();
 assert.equal(h.ui.state.world.objectives.tomb_accepted,1);assert.equal(h.ui.state.world.region,'ash_hamlet');
 assert.equal(campaignGuidance(h.ui.state).title,'신호 묘실로 이동해 조사하기');
 const detail=tombElderView(h.ui.state).detail;assert.equal(h.modal.innerHTML.split(detail).length-1,1);
 assert.match(h.modal.innerHTML,/첫 순찰을 마쳤고 보상은 이미 지급/);assert.match(h.modal.innerHTML,/완료한 첫 순찰 보상\(재수령 불가\)/);
 assert.equal(h.buttons().some(button=>['accept','claim'].includes(button.dataset.action)),false);
});

test('guidance correction: actual returning, report-ready and completed Eda cards do not repeat the current T detail',async()=>{
 for(const saved of [travel(stage('midpoint'),'tomb-town-return'),stage('report-ready'),stage('reported')]){
  const h=await browser(saved);h.move(elder);h.ui.showNpc('elder');await nextTurn();const detail=tombElderView(h.ui.state).detail;
  assert.equal(h.modal.innerHTML.split(detail).length-1,1);assert.match(h.modal.innerHTML,/첫 순찰을 마쳤고 보상은 이미 지급/);
  assert.equal(h.buttons().some(button=>['accept','claim'].includes(button.dataset.action)),false);
  if(h.ui.state.world.objectives.tomb_reported)assert.equal((h.modal.innerHTML.match(/전문 훈련 예약 120/g)??[]).length,1);
 }
});

test('guidance correction: actual unfinished first-patrol accept/report and duplicate-reward protection remain intact',async()=>{
 const fresh=await browser(createState());fresh.ui.showNpc('elder');await nextTurn();assert.equal(fresh.buttons().find(button=>button.dataset.action==='accept').disabled,true);
 const trained=run(createState(),{type:'trainStarter',position:trainer}).state,h=await browser(trained);h.move(elder);h.ui.showNpc('elder');await nextTurn();
 assert.match(h.modal.innerHTML,/길목의 적 여섯/);assert.equal(h.buttons().find(button=>button.dataset.action==='accept').disabled,false);await h.click('accept');
 h.ui.showNpc('elder');await nextTurn();assert.match(h.modal.innerHTML,/척후를 0\/6 처치/);assert.equal(h.buttons().some(button=>button.dataset.action==='claim'),false);
 const outside=travel(h.ui.state,'road'),cleared=settle(outside,getRegion('ash_road').foes.filter(foe=>foe.kind==='scout').slice(0,6).map(foe=>foe.id)),ready=travel(cleared,'home');
 const reportUi=await browser(ready);reportUi.move(elder);reportUi.ui.showNpc('elder');await nextTurn();const claim=reportUi.buttons().find(button=>button.dataset.action==='claim');assert.ok(claim);
 const before=economy(reportUi.ui.state);await reportUi.click('claim');assert.equal(reportUi.ui.state.gold,before.gold+20);assert.equal(reportUi.ui.state.stats.earnedXp,before.stats.earnedXp+70);
 reportUi.ui.showNpc('elder');await nextTurn();assert.match(reportUi.modal.innerHTML,/완료한 첫 순찰 보상\(재수령 불가\)/);assert.ok(reportUi.modal.innerHTML.includes(campaignGuidance(reportUi.ui.state).detail));
 assert.equal(reportUi.buttons().some(button=>button.dataset.action==='claim'),false);const once=copy(reportUi.ui.state);await reportUi.click('claim',{target:claim});assert.deepEqual(reportUi.ui.state,once);
 assert.deepEqual(reportUi.store.load().state,once);
});

test('guidance correction: actual Eda Pass history names completed rewards and implemented S/F/T scope',async()=>{
 const h=await browser(stage('predecessor'));h.move(elder);h.ui.showNpc('elder');await nextTurn();
 for(const view of [passElderView(h.ui.state),passGuidance(h.ui.state)]){
  assert.match(view.detail,/보고 보상은 이미 받았습니다/);assert.match(view.detail,/신호 복원·용광로·신호 묘실·전문가 승급·봉화 전장·황야 조사까지 연결/);
  assert.doesNotMatch(view.detail,/이후 지역.*개발 중|신호 복원 지역.*아직 구현되지/);assert.match(view.detail,/달인 승급과 전체 캠페인 결말은 아직 구현되지/);
 }
 assert.ok(h.modal.innerHTML.includes(passElderView(h.ui.state).detail));assert.equal(h.buttons().some(button=>button.dataset.action==='pass-report'),false);
 assert.equal(passGuidance(h.ui.state).title,'고갯길 조사 완료');
});

test('guidance correction: actual final glyph, journal and projection stop warning about resetting a completed sequence',async()=>{
 const h=await browser(acted(stage('partial'),'tomb-glyph-split-beam'));h.move(point('tomb-glyph-ember'));await h.ui.showTomb('tomb-glyph-ember');
 assert.match(h.modal.innerHTML,/잘못 누르면 순서만 0\/3/);await h.clickTomb('tomb-glyph-ember');assert.equal(h.ui.state.world.objectives.tomb_sequence_solved,1);
 const paid=economy(h.ui.state);
 for(const open of [()=>h.ui.showTomb('tomb-glyph-ember'),()=>h.ui.showJournal(),()=>h.ui.showTomb('tomb-projection')]){
  await open();assert.match(h.modal.innerHTML,/3\/3 · 해제 완료/);assert.doesNotMatch(h.modal.innerHTML,/잘못 누르면|순서만 0\/3|올바른 앞 순서는 저장/);assert.deepEqual(economy(h.ui.state),paid);
 }
 await h.ui.showTomb('tomb-glyph-ember');assert.equal(h.tombButton('tomb-glyph-ember'),undefined);
});

test('guidance correction: actual lower ward panels distinguish missing, carried, clear and already-connected states',async()=>{
 for(const [name,expected,forbidden,ready] of [
  ['solved',/먼저 비문실에서 운반 봉인을 받으세요/,/운반 봉인을 보유/,false],
  ['carried',/운반 봉인을 보유.*3\/3명 남음/,/먼저 비문실에서 운반 봉인을 받으세요/,false],
  ['midpoint-ready',/운반 봉인을 보유.*세 적을 모두 처치했습니다/,/먼저 비문실|명 남음|처치 후/,true],
  ['midpoint',/상부 봉인실이 열렸습니다/,/먼저 비문실/,false],
  ['seal-ready',/상부 봉인실의 세 적을 모두 처치했습니다/,/상부 적을 처치하고|먼저 비문실/,false],
  ['sealed',/상부 봉인까지 완성했습니다/,/먼저 비문실|상부 적을 처치하고/,false],
 ]){
  const h=await browser(stage(name));await h.ui.showTomb('tomb-ward-midpoint');assert.match(h.modal.innerHTML,expected,name);assert.doesNotMatch(h.modal.innerHTML,forbidden,name);assert.equal(!!h.tombButton('tomb-ward-midpoint'),ready,name);
 }
});

test('guidance correction: actual upper ward panels distinguish missing ward, pending midpoint, clear and sealed states',async()=>{
 for(const [name,expected,forbidden,ready] of [
  ['solved',/먼저 비문실에서 운반 봉인을 받으세요/,/하부 중계는 완료/,false],
  ['carried',/하부 중계를 먼저 연결하세요/,/먼저 비문실|하부 중계는 완료/,false],
  ['midpoint',/하부 중계는 완료.*3\/3명 남음/,/하부 중계를 먼저 연결하세요/,false],
  ['seal-ready',/상부 봉인실의 세 적을 모두 처치했습니다/,/먼저 연결|명 남음|처치한 뒤/,true],
  ['sealed',/봉인 보상은 이미 받았습니다.*서약 수호자를 처치한 뒤/,/먼저 연결/,false],
  ['boss-down',/수호자는 처치했지만 서약문은 아직 회수하지 않았습니다/,/수호자를 처치한 뒤/,false],
  ['oath',/서약문도 회수했습니다.*에다에게 보고하세요/,/아직 회수하지|수호자를 처치한 뒤/,false],
  ['reported',/에다에게 보고까지 마쳤습니다/,/에다에게 보고하세요|아직 회수하지/,false],
 ]){
  const saved=name==='reported'?travel(stage(name),'town-tomb-entry'):stage(name),h=await browser(saved);await h.ui.showTomb('tomb-ward-final');assert.match(h.modal.innerHTML,expected,name);assert.doesNotMatch(h.modal.innerHTML,forbidden,name);assert.equal(!!h.tombButton('tomb-ward-final'),ready,name);
 }
});

test('guidance correction: actual oath panel stops repeating completed seal and boss prerequisites',async()=>{
 for(const [name,expected,forbidden,ready] of [
  ['midpoint',/상부 봉인을 완성하고 서약 수호자를 먼저 처치하세요/,/서약 수호자를 처치했습니다/,false],
  ['sealed',/상부 봉인은 완료했습니다.*서약 수호자를 먼저 처치하세요/,/상부 봉인을 완성하고/,false],
  ['boss-down',/서약 수호자를 처치했습니다.*따로 상호작용/,/먼저 처치|상부 봉인을 완성하고/,true],
  ['oath',/비소모 서약문을 보관.*에다에게 보고하세요/,/따로 상호작용|먼저 처치/,false],
  ['reported',/촌장 에다에게 보고까지 마쳤습니다/,/에다에게 보고하세요|따로 상호작용/,false],
 ]){
  const saved=name==='reported'?travel(stage(name),'town-tomb-entry'):stage(name),h=await browser(saved);await h.ui.showTomb('tomb-oath');assert.match(h.modal.innerHTML,expected,name);assert.doesNotMatch(h.modal.innerHTML,forbidden,name);assert.equal(!!h.tombButton('tomb-oath'),ready,name);
 }
});

test('guidance correction: actual current-goal and carried-ward origin panels recognize already-cleared pockets',async()=>{
 for(const [name,expected,forbidden] of [
  ['midpoint-ready',/하부 봉인실의 세 적을 모두 처치했습니다/,/세 적을 처치하고|세 명 처치 후/],
  ['seal-ready',/상부 봉인실의 세 적을 모두 처치했습니다/,/세 명을 처치한 뒤|상부 적을 처치하고/],
 ]){
  const h=await browser(stage(name));await h.ui.showTomb('tomb-ward-origin');assert.match(h.modal.innerHTML,expected);assert.doesNotMatch(h.modal.innerHTML,forbidden);assert.equal(h.tombButton('tomb-ward-origin'),undefined);
  h.ui.showObjective();await nextTurn();assert.match(h.modal.innerHTML,expected);assert.doesNotMatch(h.modal.innerHTML,forbidden);
 }
});

// B uses the same unchanged production main handlers and durable controller.
// Position/defeat reports below are synthetic settlement fixtures, not play.
function expertForBattlefield(){const s=earnedTombRoute('normal',{full:true}),r=reduceRuntime(s,{type:'promoteExpert',...report(s,trainer),expectedRevision:0,expectedGoldCost:120},{revision:0});assert.equal(r.ok,true,JSON.stringify(r));return r.state;}
const bPoint=id=>getRegion(BATTLEFIELD_REGION).objects.find(o=>o.id===id);
const bButton=h=>h.buttons().find(row=>row.dataset.action==='battlefield-action');
async function bClick(h,options={}){const target=options.target??bButton(h);assert.ok(target,'rendered B command');await h.click('battlefield-action',{...options,target});}
async function bStart(){const h=await browser(expertForBattlefield(),{namespace:'qa-r11',profile:'qa-r11-b-ui'});h.move(elder);h.ui.showNpc('elder');await nextTurn();assert.match(h.modal.innerHTML,/봉화 전장 의뢰 수락/);await bClick(h);await usePortal(h,'town-battlefield-entry');return h;}
async function bSettle(h,side){h.ui.closePanel();const id=side==='boss'?'battlefield-beacon':`battlefield-${side}-device`;h.move(bPoint(id));for(const enemy of h.ui.battle.enemies)if(BATTLEFIELD_GROUPS[side].includes(enemy.id))enemy.hp=0;assert.equal(await h.ui.dispatch({type:'settleCombat',defeated:BATTLEFIELD_GROUPS[side],...battleReport(h.ui.battle)}),true);await h.ui.showBattlefield(id);}
for(const order of [['west','east'],['east','west']])test(`actual B main UI ${order.join(' then ')} opens map without resetting live battle, then separately collects/reports`,async()=>{
 const h=await bStart();assert.equal(h.ui.state.character.tier,'expert');assert.equal(battlefieldGuidance(h.ui.state).id,'battlefield-devices');
 for(const [index,side] of order.entries()){
  await bSettle(h,side);const b=h.ui.battle,map=b.map,enemies=b.enemies,shots=b.shots,areas=b.areas,paid=deplete(h),live=enemies.find(e=>e.hp>0);live.pathTimer=8;live.windup=.4;live.tell={committed:true};const tell=live.tell,token=bButton(h);
  await bClick(h);assert.equal(h.ui.state.world.objectives[`battlefield_${side}_ready`],1);assert.equal(h.ui.battle,b);assert.equal(b.enemies,enemies);assert.equal(b.shots,shots);assert.equal(b.areas,areas);assert.equal(live.tell,tell);assert.equal(live.windup,.4);assert.deepEqual(battleReport(b).vitals,paid.vitals);assert.deepEqual(battleReport(b).recovery,paid.recovery);
  if(index===0){assert.equal(b.map,map);assert.equal(live.pathTimer,8);}else{assert.notEqual(b.map,map);assert.equal(live.pathTimer,0);}
  const once=copy(h.ui.state);await bClick(h,{target:token});assert.deepEqual(h.ui.state,once);assert.equal(bButton(h),undefined);assert.ok(renderObjects(h).find(o=>o.id===`battlefield-${side}-device`).used);
 }
 await bSettle(h,'boss');assert.equal(h.ui.state.world.objectives.battlefield_beacon_taken,0);h.ui.drawLabels();assert.ok(h.labels.some(x=>/봉화핵 미회수/.test(x)));await bClick(h);assert.equal(h.ui.state.world.objectives.battlefield_beacon_taken,1);assert.equal(h.ui.state.world.objectives.chapter_three_complete,0);
 await usePortal(h,'battlefield-boss-return');h.move(elder);h.ui.showNpc('elder');await nextTurn();const before=copy(h.ui.state),token=bButton(h);await bClick(h);assert.equal(h.ui.state.world.objectives.chapter_three_complete,1);assert.equal(h.ui.state.world.objectives.battlefield_reported,1);assert.ok(h.ui.state.gold>before.gold);assert.match(h.modal.innerHTML,/Master.*구현 중/);assert.deepEqual(h.store.load().state,h.ui.state);const once=copy(h.ui.state);await bClick(h,{target:token});assert.deepEqual(h.ui.state,once);
 const restored=await browser(null,{namespace:'qa-r11',profile:'qa-r11-b-ui',storage:h.storage,reload:true});assert.deepEqual(restored.ui.state,once);assert.equal(battlefieldGuidance(restored.ui.state).id,'battlefield-complete');
});
test('actual B UI rejects double activation, stale dialog epochs and failed persistence without marking a device',async()=>{
 const h=await bStart();await bSettle(h,'west');const target=bButton(h),before=copy(h.ui.state);await bClick(h,{target,detail:2});assert.deepEqual(h.ui.state,before);
 h.ui.closePanel();await h.ui.showBattlefield('battlefield-west-device');await bClick(h,{target});assert.deepEqual(h.ui.state,before);
 const fresh=bButton(h);h.fail({ok:false,code:'QUOTA',reason:'fixture full'});await bClick(h,{target:fresh});assert.deepEqual(h.ui.state,before);assert.deepEqual(h.store.load().state,before);assert.equal(h.ui.state.world.objectives.battlefield_west_ready,0);
});
test('closing actual B panel during delayed successful commit does not reopen a stale dialog',async()=>{
 const h=await bStart();await bSettle(h,'west');h.delay();const pending=bClick(h);await nextTurn();assert.equal(h.ui.busy,true);h.ui.closePanel();assert.equal(h.modal.hidden,true);await h.release();await pending;assert.equal(h.modal.hidden,true);assert.equal(h.ui.state.world.objectives.battlefield_west_ready,1);assert.deepEqual(h.store.load().state,h.ui.state);
});

// R11a1 actual-screen findings: after kills the instruction must advance, and
// the non-consumed beacon must use its authored name in the real inventory UI.
test('actual B ready-device copy and collected beacon inventory use current objective labels',async()=>{
 const h=await bStart();
 for(const side of ['west','east']){await bSettle(h,side);assert.match(h.modal.innerHTML,/여섯 명을 모두 처치했습니다/);assert.doesNotMatch(h.modal.innerHTML,/0\/6명 남음/);assert.ok(bButton(h));await bClick(h);assert.match(h.modal.innerHTML,/이미 받았습니다/);assert.equal(bButton(h),undefined);}
 await bSettle(h,'boss');await bClick(h);const before=copy(h.ui.state);h.ui.showEquipment();
 assert.match(h.modal.innerHTML,/회수한 봉화핵 · 비소모/);assert.doesNotMatch(h.modal.innerHTML,/battlefield_beacon/);assert.deepEqual(h.ui.state,before);
});
