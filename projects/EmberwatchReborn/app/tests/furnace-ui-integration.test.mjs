import {createMainInputFixture,mainInputSource,tracedInputRouter} from './support/main-input-fixture.mjs';
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
import {createState,validateState} from '../src/state.js';
import {createStore,profileKeys} from '../src/save.js';
import {createController} from '../src/controller.js';
import {candidatePath,candidateNamespace,copyReleaseQaProfile} from '../src/candidate-profile.js';
import {createRuntimeGate} from '../src/runtime-gate.js';
import {createBattle,clearBattleIntent} from '../src/combat.js';
import {battleReport} from '../src/recovery.js';
import {syncCommittedBattle} from '../src/runtime-sync.js';
import {getRegion,createMap,inMap,near,lineOfSight} from '../src/world.js';
import {selectInteractionTarget} from '../src/interaction-target.js';
import {deriveStats} from '../src/warrior-growth.js';
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
import {passObjectView,passElderView} from '../src/pass-presentation.js';
import {signalObjectView,signalBlacksmithView} from '../src/signal-presentation.js';
import {campaignGuidance,chestPresentation} from '../src/campaign-guidance.js';
import {earnedPassRoute} from './support/earned-pass-route.mjs';
import {report,run,travel,settle} from './support/earned-route.mjs';
import {controlsFor,actionLabel,rebindControl} from '../src/controls.js';

// These tests invoke UNCHANGED production main.js functions and its click
// listener in the imports' realm. The real controller, store, reducers, battle,
// world, guidance and presentation are used. DOM/audio/scheduling are boundary
// probes; an optional delayed/failing persistence boundary is explicit below.
// Every predecessor reward, XP, skill, level and flag comes from earned runtime
// commands. Scripted positions and defeated-enemy reports are SETTLEMENT FIXTURES,
// NOT browser play, ordinary-input combat, AI survival or visual QA evidence.
const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const copy=value=>structuredClone(value),smith={x:250,y:470};
const point=id=>getRegion(FURNACE_REGION).objects.find(object=>object.id===id);
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
const browserFunctions=['wildernessView','wildernessActionButton','showWilderness','battlefieldActionButton','showBattlefield','tombActionButton','showTomb','showJournal','flushActionSafety','acceptCombatPress','releaseCombatToken','checkpointPanel','showTraining','showActionSlots','clearInput','panel','closePanel','report','syncVitals','dispatch','nearest','interact','showFurnace','showSignal','showNpc','showEquipment','equipmentAction','showObjective','showTitle','showDeath','drawLabels'];
const exposed=['dispatch','nearest','interact','showFurnace','showNpc','showEquipment','showObjective','showTitle','showDeath','drawLabels','closePanel'];
const harnessSource=[mainInputSource,
 between('const esc=','function clearInput('),between('const tierLabel=','const focusEvents='),between('const config=','let controller='),
 between('const statNames=','let equipmentStation='),...browserFunctions.map(mainFunction),
 // Execute the current production objective HUD fragment, including its guard.
 'function updateHud(){'+between(' const objective=campaignGuidance(state).title;',' const entries=')+'}',
 between("document.addEventListener('click',", "document.addEventListener('change',"),
 `return {${exposed.join(',')},get state(){return state},get battle(){return battle},get paused(){return paused},get busy(){return busy},get controller(){return controller},get equipmentStation(){return equipmentStation}};`,
].join('\n');
const cache=new Map();
function stage(name='predecessor',choice='cover',difficulty='normal'){
 const key=[name,choice,difficulty].join(':');if(cache.has(key))return copy(cache.get(key));let s;
 if(name==='predecessor'){
  s=earnedPassRoute(difficulty);s=run(s,{type:'acceptSignalQuest',...report(s,smith)}).state;s=travel(s,'town-signal-entry');
  const p=id=>getRegion('signal_basin').objects.find(object=>object.id===id),act=id=>{s=run(s,{type:'interactSignal',objectId:id,...report(s,p(id))}).state;};
  s=settle(s,SIGNAL_GROUPS.entry);act('signal-code');for(const node of ['transmitter','receiver'])act('signal-route-'+node);
  s=settle(s,SIGNAL_GROUPS.yard,p('signal-transmitter'));act('signal-transmitter');
  s=settle(s,SIGNAL_GROUPS.receiver,p('signal-receiver'));act('signal-receiver');
  s=travel(s,'signal-town-return');s=run(s,{type:'reportSignalQuest',...report(s,smith)}).state;
 }else if(name==='accepted'){s=stage('predecessor',choice,difficulty);s=run(s,{type:'acceptFurnaceQuest',...report(s,smith)}).state;}
 else if(name==='entry')s=travel(stage('accepted',choice,difficulty),'town-furnace-entry');
 else if(name==='cooling-ready')s=settle(stage('entry',choice,difficulty),FURNACE_GROUPS.cooling,point('furnace-cooling'));
 else if(name==='cooled')s=acted(stage('cooling-ready',choice,difficulty),'furnace-cooling',choice);
 else if(name==='exhaust-ready')s=settle(stage('cooled',choice,difficulty),FURNACE_GROUPS.exhaust,point('furnace-exhaust'));
 else if(name==='exhausted')s=acted(stage('exhaust-ready',choice,difficulty),'furnace-exhaust');
 else if(name==='ignition-ready')s=settle(stage('exhausted',choice,difficulty),FURNACE_GROUPS.ignition,point('furnace-ignition'));
 else if(name==='ignited')s=acted(stage('ignition-ready',choice,difficulty),'furnace-ignition');
 else if(name==='lens')s=acted(stage('ignited',choice,difficulty),'furnace-lens');
 else if(name==='reported'){s=travel(stage('lens',choice,difficulty),'furnace-town-return');s=run(s,{type:'reportFurnaceQuest',...report(s,smith)}).state;}
 else assert.fail('unknown fixture stage '+name);
 assert.equal(validateState(s).ok,true);cache.set(key,copy(s));return copy(s);
}
function acted(s,id,choice){return run(s,{type:'interactFurnace',objectId:id,...(choice===undefined?{}:{choice}),...report(s,point(id))}).state;}
const economy=s=>copy({character:s.character,gold:s.gold,stats:s.stats,inventory:s.inventory,receipts:s.world.claimedRewards});
async function browser(saved,{storage=memory(),profile='qa-furnace-ui',namespace='qa-r9',reload=false}={}){
 const store=createStore(storage,{profile,namespace});if(!reload)assert.equal(store.save(saved,{expectedRevision:0}).ok,true);
 let delayed=false,pending=null,failNext=null,saveCount=0;
 const controller=createController({load:store.load,save:(state,options)=>{
  saveCount++;if(failNext){const failure=failNext;failNext=null;return failure;}
  if(!delayed)return store.save(state,options);
  assert.equal(pending,null,'production UI cannot stack save requests');delayed=false;return new Promise(resolve=>{pending={state,options,resolve};});
 }}),loaded=await controller.load();assert.equal(loaded.ok,true);
 const events=[],messages=[],calls=[],handlers={},labels=[],commands=[],outcomes=[];controller.subscribe(event=>events.push(event));
 const actualDispatch=controller.dispatch;controller.dispatch=async command=>{commands.push(copy(command));const result=await actualDispatch(command);outcomes.push(result);return result;};
 const modal={hidden:true,innerHTML:'',contains(target){return !!target?.dataset?.action&&this.innerHTML.includes('data-action="'+target.dataset.action+'"');},querySelector:()=>({focus:()=>calls.push(['focus-modal'])})};
 const elements={toast:{textContent:'',classList:{add(){},remove(){}}},hud:{hidden:false},objective:{innerHTML:''},profile:{value:'qa-r9-copy'},sourceProfile:{value:'qa-r8-source'},sourceNamespace:{value:'qa-r8'}};
 const imports={...mainImports,BATTLEFIELD_COMMANDS,battlefieldObjectView,battlefieldElderView,battlefieldGuidance,battlefieldCommandFields,battlefieldPortalLabel,battlefieldEventCopy,previewExpertPromotion,quoteAction,EXPERT_SLOTS,emptyActionSlots,combatCheckpoint,TOMB_COMMANDS,TOMB_TOOLS,tombWardCarried,tombObjectView,tombElderView,tombCommandFields,tombClueView,tombEventCopy,tombGoldView,tombPortalLabel,createBattle,clearBattleIntent,battleReport,syncCommittedBattle,getRegion,createMap,near,lineOfSight,selectInteractionTarget,deriveStats,equipmentRows,quoteEquipment,previewRecipe,EQUIPMENT_ITEMS,EQUIPMENT_RECIPES,EQUIPMENT_SLOTS,EQUIPMENT_UPGRADES,DUNGEON_TOOLS,QUARRY_TOOLS,PASS_TOOLS,SIGNAL_TOOLS,FURNACE_TOOLS,DUNGEON_COMMANDS,QUARRY_COMMANDS,PASS_COMMANDS,SIGNAL_COMMANDS,FURNACE_COMMANDS,dungeonObjectView,quarryObjectView,quarryElderView,passObjectView,passElderView,signalObjectView,signalBlacksmithView,furnaceObjectView,furnaceBlacksmithView,campaignGuidance,chestPresentation,copyReleaseQaProfile,controlsFor,actionLabel};
 const declaredImports=new Set([...source.matchAll(/^import\s*\{([^}]+)\}/gm)].flatMap(match=>match[1].split(',').map(name=>name.trim())));
 for(const name of Object.keys(imports))assert.ok(declaredImports.has(name),`production main must import ${name}`);
 const expertCapture=createExpertInputCapture(),expertSafety=createActionSafety({capture:expertCapture,cancel:cancelBattleAction});
 const gate=createRuntimeGate(),env={...createMainInputFixture(),expertCapture,expertSafety,...imports,state:loaded.state,battle:createBattle(loaded.state),controller,paused:false,busy:false,combatSaveElapsed:0,captureBinding:null,equipmentStation:null,suppressNextClick:false,lastObjectiveHtml:'',
  noticeUntil:0,modal,gate,candidate:namespace!=='release',saveNamespace:namespace,localStorage:storage,navigator:{locks},
  $:id=>elements[id],document:{hidden:false,hasFocus:()=>true,addEventListener:(name,fn)=>{handlers[name]=fn;}},
  audio:{cancel(){},pause:value=>calls.push(['audio-pause',value]),play:name=>calls.push(['audio-play',name])},
  router:tracedInputRouter(options=>calls.push(['router-clear',options])),deferredImmediate:{clear:()=>calls.push(['deferred-clear'])},
  canvas:{width:1280,height:720,focus:()=>calls.push(['focus-canvas'])},last:0,
  ctx:{save(){},restore(){},fillRect(){},fillText:text=>labels.push(text)},projectWorld:(x,y)=>({x,y}),ISO:{zoom:1},
  toast:text=>messages.push(text),loadProfile:async(...args)=>calls.push(['load-profile',...args]),
 };
 const ui=vm.compileFunction(harnessSource,Object.keys(env),{filename:'production-main-furnace-ui-handlers.js'})(...Object.values(env));
 const click=async(action,{disabled=false}={})=>{await handlers.click({target:{closest:()=>({disabled,dataset:{action}})},preventDefault(){},stopPropagation(){}});await nextTurn();};
 const move=position=>{Object.assign(ui.battle.p,{x:position.x,y:position.y});};
 const release=async failure=>{await nextTurn();assert.ok(pending,'save reached deliberate delayed boundary');const work=pending;pending=null;work.resolve(failure??store.save(work.state,work.options));await nextTurn();};
 return {ui,modal,messages,calls,events,labels,storage,store,elements,gate,commands,outcomes,click,move,release,delay:()=>{delayed=true;},fail:failure=>{failNext=failure;},get saveCount(){return saveCount;}};
}
function assertReward(h,before,id){const row=FURNACE_REWARDS['r9:f:'+id];assert.equal(h.ui.state.stats.earnedXp-before.stats.earnedXp,row.xp);assert.equal(h.ui.state.gold-before.gold,row.gold);assert.ok(h.messages.some(text=>text.includes(`경험치 ${row.xp} / 금화 ${row.gold}`)));assert.equal(h.ui.state.world.claimedRewards.filter(receipt=>receipt==='r9:f:'+id).length,1);}
function deplete(h){Object.assign(h.ui.battle.p,{hp:12,mana:3,stamina:5,recoveryLock:.3,manaDelay:.8,staminaDelay:.7,potionCooldown:2});h.ui.battle.p.cooldowns.righteous_hammer=1.7;return battleReport(h.ui.battle);}
async function usePortal(h,id){h.ui.closePanel();const portal=getRegion(h.ui.state.world.region).portals.find(row=>row.id===id);assert.ok(portal,id);h.move(portal);assert.equal(h.ui.nearest().id,id);h.ui.interact();await nextTurn();assert.equal(h.ui.state.world.region,portal.to);}
async function scriptedDefeats(h,group,id){h.ui.closePanel();h.move(point(id));for(const enemy of h.ui.battle.enemies)if(FURNACE_GROUPS[group].includes(enemy.id))enemy.hp=0;assert.equal(await h.ui.dispatch({type:'settleCombat',defeated:FURNACE_GROUPS[group],...battleReport(h.ui.battle)}),true);}

for(const choice of ['cover','channel'])test(`actual ${choice} route accepts, cools, exhausts, ignites, explicitly collects lens and reports once`,async()=>{
 const h=await browser(stage()),start=economy(h.ui.state);h.move(smith);h.ui.showNpc('blacksmith');await nextTurn();
 assert.match(h.modal.innerHTML,/data-action="furnace-accept"/);assert.match(h.modal.innerHTML,/data-action="buy:/);assert.match(h.modal.innerHTML,/data-action="award:workshop_supplies"/);
 await h.click('furnace-accept');assert.equal(h.ui.state.world.objectives.furnace_accepted,1);assert.deepEqual(economy(h.ui.state),{...start,receipts:[...start.receipts,'r9:f:accept']});
 assert.match(h.modal.innerHTML,/용광로 수리 진행 중/);assert.doesNotMatch(h.modal.innerHTML,/data-action="furnace-accept"/);
 await usePortal(h,'town-furnace-entry');
 for(const [group,id,flag]of [['cooling','furnace-cooling','furnace_cooled'],['exhaust','furnace-exhaust','furnace_exhausted'],['ignition','furnace-ignition','furnace_ignited']]){
  await scriptedDefeats(h,group,id);h.ui.interact();await nextTurn();assert.equal(h.ui.paused,true);assert.match(h.modal.innerHTML,new RegExp(`data-action="furnace:${id}`));
  if(group==='cooling'){
   assert.match(h.modal.innerHTML,/data-action="furnace:furnace-cooling:cover"/);assert.match(h.modal.innerHTML,/data-action="furnace:furnace-cooling:channel"/);
   assert.match(h.modal.innerHTML,/보상은 같습니다/);assert.match(h.modal.innerHTML,/선택은 되돌릴 수 없습니다/);assert.match(h.modal.innerHTML,/양쪽 우회로/);
  }else assert.doesNotMatch(h.modal.innerHTML,/data-action="furnace:[^"]+:(?:cover|channel)"/);
  const before=copy(h.ui.state);await h.click('furnace:'+id+(group==='cooling'?':'+choice:''));assertReward(h,before,group);
  assert.equal(h.ui.state.world.objectives[flag],1);assert.doesNotMatch(h.modal.innerHTML,new RegExp(`data-action="furnace:${id}(?:[:"])`));
  const once=economy(h.ui.state);await h.click('furnace:'+id+(group==='cooling'?':'+choice:''));assert.deepEqual(economy(h.ui.state),once);
 }
 assert.equal(h.ui.state.world.objectives.furnace_mode,FURNACE_MODES[choice].value);assert.equal(h.ui.state.world.objectives.furnace_lens_taken,0);assert.equal(h.ui.state.world.objectives.furnace_reported,0);
 assert.equal(h.ui.state.inventory.tools.includes('furnace_lens'),false);assert.match(h.modal.innerHTML,/렌즈.*따로 상호작용/);
 h.ui.closePanel();h.move(point('furnace-lens'));h.ui.interact();await nextTurn();assert.match(h.modal.innerHTML,/data-action="furnace:furnace-lens"/);
 const ignition=economy(h.ui.state);await h.click('furnace:furnace-lens');assert.equal(h.ui.state.stats.earnedXp,ignition.stats.earnedXp);assert.equal(h.ui.state.gold,ignition.gold);
 assert.equal(h.ui.state.inventory.tools.filter(id=>id==='furnace_lens').length,1);assert.equal(h.ui.state.world.objectives.furnace_lens_taken,1);assert.equal(h.ui.state.world.objectives.furnace_reported,0);
 assert.match(h.modal.innerHTML,/용광로 렌즈 · 회수 완료/);assert.doesNotMatch(h.modal.innerHTML,/data-action="furnace:furnace-lens"/);
 const lens=economy(h.ui.state);await h.click('furnace:furnace-lens');assert.deepEqual(economy(h.ui.state),lens);
 assert.equal(h.ui.state.world.objectives.furnace_shortcut_open,0,'optional freight lift is not required');await usePortal(h,'furnace-town-return');
 h.move(smith);h.ui.showNpc('blacksmith');await nextTurn();assert.match(h.modal.innerHTML,/data-action="furnace-report"/);assert.match(h.modal.innerHTML,/경험치90·금화60/);
 const before=copy(h.ui.state);await h.click('furnace-report');assertReward(h,before,'report');assert.equal(h.ui.state.world.objectives.furnace_reported,1);
 assert.match(h.modal.innerHTML,/용광로 수리 · 보고 완료/);assert.match(h.modal.innerHTML,/촌장 에다/);assert.match(h.modal.innerHTML,/신호 묘실/);assert.match(h.modal.innerHTML,/data-action="buy:/);assert.doesNotMatch(h.modal.innerHTML,/data-action="furnace-(?:accept|report)"/);
 const completed=economy(h.ui.state);await h.click('furnace-report');assert.deepEqual(economy(h.ui.state),completed);
 assert.equal(h.ui.state.stats.earnedXp-start.stats.earnedXp,1290);assert.equal(h.ui.state.gold-start.gold,256);assert.equal(h.ui.state.character.tier,'adept');assert.ok(h.ui.state.character.level<15);
 assert.equal(h.ui.state.inventory.consumables.health_potion-start.inventory.consumables.health_potion,1);
 for(const [id,amount]of Object.entries({iron:5,wood:2,thread:2,ember_shard:2}))assert.equal(h.ui.state.inventory.materials[id]-start.inventory.materials[id],amount);
 assert.deepEqual(h.store.load().state,h.ui.state);const reopened=await browser(null,{storage:h.storage,reload:true});assert.deepEqual(reopened.ui.state,h.ui.state);
 const requests=h.commands.filter(command=>command.type==='interactFurnace');assert.ok(requests.length>=8);
 for(const command of requests)assert.equal(Object.hasOwn(command,'choice'),command.objectId==='furnace-cooling','only the cooling handler submits a choice');
});

test('actual F acceptance shares Orin with S completion and existing purchase handlers; Eda does not offer F',async()=>{
 const h=await browser(stage());h.move(smith);h.ui.showNpc('blacksmith');await nextTurn();assert.match(h.modal.innerHTML,/신호 복원 · 보고 완료/);
 await h.click('furnace-accept');const item=Object.values(EQUIPMENT_ITEMS).find(row=>quoteEquipment(h.ui.state,{type:'buyEquipment',baseId:row.id,station:'blacksmith',commandId:'quote:furnace-ui'}).ok);assert.ok(item);
 const before=copy(h.ui.state);await h.click('buy:'+item.id);assert.equal(h.ui.state.gold,before.gold-item.price);assert.equal(h.ui.state.inventory.equipmentInstances.length,before.inventory.equipmentInstances.length+1);
 assert.deepEqual(h.ui.state.world.objectives,before.world.objectives);assert.deepEqual(h.ui.state.world.claimedRewards,before.world.claimedRewards);assert.match(h.modal.innerHTML,/용광로 수리 진행 중/);assert.equal(h.ui.equipmentStation,'blacksmith');
 h.move({x:450,y:325});h.ui.showNpc('elder');await nextTurn();assert.match(h.modal.innerHTML,/촌장 에다/);assert.doesNotMatch(h.modal.innerHTML,/data-action="furnace-(?:accept|report)"/);
});

for(const choice of ['cover','channel'])test(`actual ${choice} cooling map-only refresh preserves damaged living enemies, projectiles and paid recovery`,async()=>{
 const h=await browser(stage('cooling-ready')),b=h.ui.battle;h.move(point('furnace-cooling'));await h.ui.showFurnace('furnace-cooling');
 const enemy=b.enemies[0];enemy.hp-=7;enemy.x+=1;enemy.pathTimer=9;b.shots.push({id:'existing-shot'});b.effects.push({id:'existing-effect'});
 const hp=enemy.hp,x=enemy.x,player=b.p,shots=b.shots,effects=b.effects,map=b.map,resources=deplete(h);
 assert.equal(inMap(map,112,432),false);assert.equal(inMap(map,624,432),false);assert.equal(inMap(map,368,400),false);
 const before=copy(h.ui.state);await h.click('furnace:furnace-cooling:'+choice);assertReward(h,before,'cooling');
 assert.equal(h.ui.battle,b);assert.equal(b.p,player);assert.equal(b.enemies[0],enemy);assert.equal(enemy.hp,hp);assert.equal(enemy.x,x);assert.equal(enemy.pathTimer,0);
 assert.notEqual(b.map,map);assert.equal(b.shots,shots);assert.equal(b.effects,effects);assert.deepEqual(battleReport(b).vitals,resources.vitals);assert.deepEqual(battleReport(b).recovery,resources.recovery);
 assert.deepEqual(h.ui.state.vitals,resources.vitals);assert.deepEqual(h.ui.state.recovery,resources.recovery);assert.deepEqual(b.stats,deriveStats(h.ui.state.character,h.ui.state).stats);
 assert.equal(inMap(b.map,112,432),true);assert.equal(inMap(b.map,624,432),true);assert.equal(inMap(b.map,368,400),choice==='channel');
 assert.match(h.modal.innerHTML,new RegExp(FURNACE_MODES[choice].name));assert.match(h.modal.innerHTML,/추가 보상은 없습니다/);
 const once=copy(h.ui.state),opened=b.map;await h.click('furnace:furnace-cooling:'+(choice==='cover'?'channel':'cover'));assert.deepEqual(h.ui.state,once);assert.equal(b.map,opened);
 assert.equal(h.outcomes.at(-1).code,'ALREADY_CLAIMED');assert.equal(h.ui.state.world.claimedRewards.filter(id=>id==='r9:f:cooling').length,1);
});

test('actual exhaust opens rear aisle and central connection together without rebuilding live battle',async()=>{
 const h=await browser(stage('exhaust-ready')),b=h.ui.battle;h.move(point('furnace-exhaust'));await h.ui.showFurnace('furnace-exhaust');
 const enemy=b.enemies[0],map=b.map;enemy.hp-=6;enemy.pathTimer=4;const hp=enemy.hp,resources=deplete(h),before=copy(h.ui.state);
 assert.equal(inMap(map,112,176),false);assert.equal(inMap(map,368,208),false);await h.click('furnace:furnace-exhaust');assertReward(h,before,'exhaust');
 assert.equal(h.ui.battle,b);assert.equal(b.enemies[0],enemy);assert.equal(enemy.hp,hp);assert.equal(enemy.pathTimer,0);assert.notEqual(b.map,map);
 assert.equal(inMap(b.map,112,176),true);assert.equal(inMap(b.map,368,208),true);assert.deepEqual(battleReport(b).vitals,resources.vitals);assert.deepEqual(battleReport(b).recovery,resources.recovery);
 assert.match(h.modal.innerHTML,/뒤쪽 가로 통로와 중앙 연결로가 모두 열렸습니다/);assert.doesNotMatch(h.modal.innerHTML,/data-action="furnace:furnace-exhaust"/);
});

test('actual ignition level-up synchronizes new caps without resource refill, lens collection or map replacement',async()=>{
 const h=await browser(stage('ignition-ready')),b=h.ui.battle;h.move(point('furnace-ignition'));await h.ui.showFurnace('furnace-ignition');
 const resources=deplete(h),before=copy(h.ui.state),map=b.map;await h.click('furnace:furnace-ignition');assertReward(h,before,'ignition');
 assert.equal(h.ui.state.character.level,before.character.level+1);assert.equal(h.ui.battle,b);assert.equal(b.map,map);assert.deepEqual(b.stats,deriveStats(h.ui.state.character,h.ui.state).stats);
 assert.deepEqual(battleReport(b).vitals,resources.vitals);assert.deepEqual(battleReport(b).recovery,resources.recovery);assert.deepEqual(h.ui.state.vitals,resources.vitals);
 assert.equal(h.ui.state.world.objectives.furnace_lens_taken,0);assert.equal(h.ui.state.inventory.tools.includes('furnace_lens'),false);assert.equal(h.ui.state.world.objectives.furnace_reported,0);
 assert.match(h.modal.innerHTML,/렌즈는 자동 회수되지 않습니다/);assert.doesNotMatch(h.modal.innerHTML,/data-action="furnace:furnace-ignition"/);
});

for(const choice of ['cover','channel'])test(`actual ${choice} rapid opposite cooling clicks publish exactly one durable choice and reward`,async()=>{
 const h=await browser(stage('cooling-ready'));h.move(point('furnace-cooling'));await h.ui.showFurnace('furnace-cooling');const before=copy(h.ui.state),revision=h.ui.controller.revision(),map=h.ui.battle.map,saves=h.saveCount;
 h.delay();const first=h.click('furnace:furnace-cooling:'+choice);await nextTurn();assert.equal(h.ui.busy,true);assert.deepEqual(h.ui.state,before);assert.equal(h.ui.battle.map,map);assert.doesNotMatch(h.messages.join(' '),/경험치 100/);
 await Promise.all([h.click('furnace:furnace-cooling:'+(choice==='cover'?'channel':'cover')),h.click('furnace:furnace-cooling:'+choice)]);
 assert.equal(h.saveCount,saves+1);await h.release();await first;assertReward(h,before,'cooling');assert.equal(h.ui.state.world.objectives.furnace_mode,FURNACE_MODES[choice].value);
 assert.equal(h.ui.controller.revision(),revision+1);assert.equal(h.messages.filter(message=>/경험치 100 \/ 금화 10/.test(message)).length,1);assert.equal(h.ui.busy,false);assert.equal(h.ui.paused,true);assert.deepEqual(h.store.load().state,h.ui.state);
});

for(const code of ['WRITE_FAILED','COMMIT_UNCERTAIN'])test(`actual cooling ${code} preserves state, choice and map and exposes the correct recovery behavior`,async()=>{
 const h=await browser(stage('cooling-ready'));h.move(point('furnace-cooling'));await h.ui.showFurnace('furnace-cooling');const before=copy(h.ui.state),bytes=new Map(h.storage.data),b=h.ui.battle,map=b.map,resources=deplete(h);
 h.fail({ok:false,code,reason:'fixture '+code});await h.click('furnace:furnace-cooling:channel');assert.deepEqual(h.ui.state,before);assert.deepEqual(h.storage.data,bytes);assert.equal(h.ui.battle,b);assert.equal(b.map,map);assert.deepEqual(battleReport(b).vitals,resources.vitals);assert.deepEqual(battleReport(b).recovery,resources.recovery);
 assert.equal(h.ui.state.world.objectives.furnace_cooled,0);assert.equal(h.ui.state.world.objectives.furnace_mode,0);assert.doesNotMatch(h.messages.join(' '),/경험치 100|통로를 열었/);
 if(code==='COMMIT_UNCERTAIN'){
  assert.equal(h.gate.blocked,true);assert.match(h.modal.innerHTML,/저장을 확인해야 합니다/);assert.match(h.modal.innerHTML,/data-action="reload"/);assert.doesNotMatch(h.modal.innerHTML,/data-action="furnace:/);
  const commands=h.commands.length;h.ui.closePanel();await h.click('furnace:furnace-cooling:cover');assert.equal(h.ui.paused,true);assert.equal(h.commands.length,commands);assert.deepEqual(h.ui.state,before);
 }else{
  assert.equal(h.gate.blocked,false);assert.match(h.modal.innerHTML,/data-action="furnace:furnace-cooling:channel"/);await h.click('furnace:furnace-cooling:cover');assertReward(h,before,'cooling');assert.equal(h.ui.state.world.objectives.furnace_mode,1);
 }
});

test('actual conflicting cooling commit cannot open either route or display success',async()=>{
 const h=await browser(stage('cooling-ready'));h.move(point('furnace-cooling'));await h.ui.showFurnace('furnace-cooling');const b=h.ui.battle,map=b.map,enemy=b.enemies[0];enemy.hp-=4;enemy.pathTimer=11;
 const before=copy(h.ui.state),enemyBefore=copy(enemy),resources=deplete(h),other=createStore(h.storage,{profile:'qa-furnace-ui',namespace:'qa-r9'}),latest=other.load();assert.equal(other.save(latest.state,{expectedRevision:latest.revision}).ok,true);const bytes=new Map(h.storage.data);
 await h.click('furnace:furnace-cooling:channel');assert.deepEqual(h.ui.state,before);assert.deepEqual(h.storage.data,bytes);assert.equal(h.ui.battle,b);assert.equal(b.map,map);assert.deepEqual(enemy,enemyBefore);assert.deepEqual(battleReport(b).vitals,resources.vitals);assert.deepEqual(battleReport(b).recovery,resources.recovery);
 assert.equal(h.gate.blocked,true);assert.equal(h.outcomes.at(-1).code,'CONFLICT');assert.match(h.modal.innerHTML,/저장을 확인해야 합니다/);assert.doesNotMatch(h.messages.join(' '),/탐험 기록 저장|통로를 열었/);
});

for(const [name,id,choice,code,reason]of [
 ['entry','furnace-cooling','cover','COOLING_GUARDS_ALIVE',/적 다섯/],
 ['entry','furnace-exhaust',undefined,'COOLING_REQUIRED',/엄폐판 유지 또는 중앙 통로 개방/],
 ['cooled','furnace-exhaust',undefined,'EXHAUST_GUARDS_ALIVE',/적 여섯/],
 ['cooled','furnace-ignition',undefined,'EXHAUST_REQUIRED',/배기 장치/],
 ['exhausted','furnace-ignition',undefined,'IGNITION_GUARDS_ALIVE',/열일곱/],
 ['exhausted','furnace-lens',undefined,'IGNITION_REQUIRED',/점화 장치/],
 ['entry','furnace-shortcut',undefined,'COOLING_REQUIRED',/엄폐판 유지 또는 중앙 통로 개방/],
])test(`actual ${id} rejects ${code} visibly without a reward or commit`,async()=>{
 const h=await browser(stage(name));h.move(point(id));await h.ui.showFurnace(id);assert.equal(h.ui.paused,true);
 const before=copy(h.ui.state),revision=h.ui.controller.revision(),map=h.ui.battle.map,bytes=new Map(h.storage.data);await h.click('furnace:'+id+(choice===undefined?'':':'+choice));
 assert.equal(h.outcomes.at(-1).code,code);assert.ok(h.messages.some(text=>reason.test(text)));assert.deepEqual(h.ui.state,before);assert.equal(h.ui.controller.revision(),revision);assert.deepEqual(h.storage.data,bytes);assert.equal(h.ui.battle.map,map);assert.equal(h.ui.paused,true);assert.doesNotMatch(h.messages.join(' '),/탐험 기록 저장/);
});

test('actual disabled/malformed cooling controls and non-cooling choice payloads cannot award or write',async()=>{
 const h=await browser(stage('cooling-ready'));h.move(point('furnace-cooling'));await h.ui.showFurnace('furnace-cooling');
 const before=copy(h.ui.state),revision=h.ui.controller.revision(),commands=h.commands.length;await h.click('furnace:furnace-cooling:cover',{disabled:true});assert.equal(h.commands.length,commands);
 for(const action of ['furnace:furnace-cooling','furnace:furnace-cooling:','furnace:furnace-cooling:west','furnace:furnace-cooling:__proto__']){await h.click(action);assert.equal(h.outcomes.at(-1).code,'INVALID_COMMAND');}
 h.move(point('furnace-exhaust'));await h.click('furnace:furnace-exhaust:cover');assert.equal(h.outcomes.at(-1).code,'INVALID_COMMAND');
 assert.deepEqual(h.ui.state,before);assert.equal(h.ui.controller.revision(),revision);assert.doesNotMatch(h.messages.join(' '),/탐험 기록 저장/);
});

test('actual acceptance requires the earned S report and Orin, and report requires its separate lens',async()=>{
 const unready=await browser(earnedPassRoute());unready.move(smith);unready.ui.showNpc('blacksmith');await nextTurn();assert.doesNotMatch(unready.modal.innerHTML,/data-action="furnace-accept"/);
 const before=copy(unready.ui.state);await unready.click('furnace-accept');assert.equal(unready.outcomes.at(-1).code,'ADEPT_REQUIRED');assert.deepEqual(unready.ui.state,before);
 const far=await browser(stage());far.move({x:450,y:325});await far.click('furnace-accept');assert.equal(far.outcomes.at(-1).code,'BLACKSMITH_REQUIRED');assert.equal(far.ui.state.world.objectives.furnace_accepted,undefined);
 const noLens=await browser(travel(stage('ignited'),'furnace-town-return'));noLens.move(smith);noLens.ui.showNpc('blacksmith');await nextTurn();assert.doesNotMatch(noLens.modal.innerHTML,/data-action="furnace-report"/);assert.match(noLens.modal.innerHTML,/렌즈/);
 const pending=copy(noLens.ui.state);await noLens.click('furnace-report');assert.equal(noLens.outcomes.at(-1).code,'LENS_REQUIRED');assert.deepEqual(noLens.ui.state,pending);assert.ok(noLens.messages.some(text=>/따로 회수/.test(text)));
});

test('actual object opening checkpoints before pausing, rejects stale life, and respects blocked storage',async()=>{
 const h=await browser(stage('cooling-ready'));h.move(point('furnace-cooling'));h.ui.battle.skillIntent={id:'righteous_hammer'};assert.equal(h.ui.nearest().kind,'furnace');assert.equal(h.ui.nearest().id,'furnace-cooling');
 const paid=deplete(h);h.ui.interact();await nextTurn();assert.equal(h.ui.paused,true);assert.equal(h.ui.battle.skillIntent,null);assert.deepEqual(h.ui.state.world.position,paid.position);assert.deepEqual(h.ui.state.vitals,paid.vitals);assert.deepEqual(h.ui.state.recovery,paid.recovery);assert.match(h.modal.innerHTML,/data-action="furnace:furnace-cooling:cover"/);
 const stale=await browser(stage('cooling-ready'));stale.move(point('furnace-cooling'));stale.ui.battle.stateLife++;const before=copy(stale.ui.state),bytes=new Map(stale.storage.data);await stale.ui.showFurnace('furnace-cooling');assert.equal(stale.modal.hidden,true);assert.deepEqual(stale.ui.state,before);assert.deepEqual(stale.storage.data,bytes);assert.ok(stale.messages.some(text=>/생명|현재/.test(text)));
 const blocked=await browser(stage('cooling-ready'));blocked.move(point('furnace-cooling'));const other=createStore(blocked.storage,{profile:'qa-furnace-ui',namespace:'qa-r9'}),latest=other.load();assert.equal(other.save(latest.state,{expectedRevision:latest.revision}).ok,true);
 await blocked.ui.showFurnace('furnace-cooling');assert.equal(blocked.ui.paused,true);assert.equal(blocked.gate.blocked,true);assert.match(blocked.modal.innerHTML,/저장을 확인해야 합니다/);assert.doesNotMatch(blocked.modal.innerHTML,/data-action="furnace:/);
 blocked.ui.closePanel();await blocked.click('furnace:furnace-cooling:cover');assert.equal(blocked.ui.paused,true);assert.equal(blocked.ui.state.world.objectives.furnace_cooled,0);
});

test('actual unknown, out-of-range and stale-life F actions stay failed instead of turning into chests',async()=>{
 const h=await browser(stage('cooling-ready')),before=copy(h.ui.state),revision=h.ui.controller.revision();await h.ui.showFurnace('unknown-object');assert.equal(h.modal.hidden,true);await h.click('furnace:unknown-object');assert.equal(h.outcomes.at(-1).code,'UNKNOWN_OBJECT');
 h.move(getRegion(FURNACE_REGION).spawn);await h.click('furnace:furnace-cooling:cover');assert.equal(h.outcomes.at(-1).code,'OBJECT_REQUIRED');assert.ok(h.messages.some(text=>/가까이/.test(text)));
 assert.deepEqual(h.ui.state,before);assert.equal(h.ui.controller.revision(),revision);assert.doesNotMatch(h.messages.join(' '),/탐험 기록 저장/);
 // A stale-life envelope is rejected before an otherwise valid cooling choice.
 const stale=await browser(stage('cooling-ready'));stale.move(point('furnace-cooling'));stale.ui.battle.stateLife++;await stale.click('furnace:furnace-cooling:cover');assert.equal(stale.outcomes.at(-1).code,'STALE_LIFE');
});

for(const choice of ['cover','channel'])test(`actual ${choice} lift outranks its nearer locked portal only when ready, visible and within reach`,async()=>{
 const h=await browser(stage('cooled',choice)),position={x:692,y:527},shortcut=point('furnace-shortcut'),portal=getRegion(FURNACE_REGION).portals.find(row=>row.id==='furnace-town-shortcut');h.move(position);
 assert.ok(near(position,shortcut));assert.ok(near(position,portal));assert.ok(lineOfSight(h.ui.battle.map,position,shortcut));assert.ok(Math.hypot(portal.x-position.x,portal.y-position.y)<Math.hypot(shortcut.x-position.x,shortcut.y-position.y));assert.equal(h.ui.nearest().id,shortcut.id);
 const unready=await browser(stage('entry'));unready.move(position);assert.equal(unready.ui.nearest().id,portal.id);
 h.ui.battle.map=copy(h.ui.battle.map);h.ui.battle.map.tiles[17][21]=0;assert.equal(inMap(h.ui.battle.map,position.x,position.y),true);assert.equal(inMap(h.ui.battle.map,shortcut.x,shortcut.y),true);
 assert.equal(lineOfSight(h.ui.battle.map,position,shortcut),false);assert.equal(lineOfSight(h.ui.battle.map,position,portal),true);assert.equal(h.ui.nearest().id,portal.id);
 h.ui.battle.map=createMap(FURNACE_REGION,h.ui.state);h.move({x:656,y:484});assert.equal(near(h.ui.battle.p,shortcut),true);assert.equal(h.ui.nearest().id,shortcut.id);
 h.move({x:656,y:483.999999});assert.equal(near(h.ui.battle.p,shortcut),false);assert.equal(h.ui.nearest().id,portal.id);
 h.move(position);h.ui.interact();await nextTurn();const before=economy(h.ui.state),paid=deplete(h);await h.click('furnace:furnace-shortcut');assert.equal(h.ui.state.world.objectives.furnace_shortcut_open,1);assert.equal(h.ui.nearest().id,portal.id);
 assert.deepEqual(economy(h.ui.state),{...before,receipts:[...before.receipts,'r9:f:shortcut']});assert.match(h.modal.innerHTML,/연결 완료/);assert.doesNotMatch(h.modal.innerHTML,/data-action="furnace:furnace-shortcut"/);
 const opened=economy(h.ui.state);await h.click('furnace:furnace-shortcut');assert.deepEqual(economy(h.ui.state),opened);
 await usePortal(h,'furnace-town-shortcut');assert.deepEqual(h.ui.state.vitals,paid.vitals);assert.deepEqual(h.ui.state.recovery,paid.recovery);await usePortal(h,'town-furnace-shortcut');assert.deepEqual(h.ui.state.vitals,paid.vitals);assert.deepEqual(h.ui.state.recovery,paid.recovery);assert.equal(h.ui.state.world.objectives.furnace_mode,FURNACE_MODES[choice].value);
});

for(const choice of ['cover','channel'])test(`actual ${choice} death/retry and saved reentry retain partial earned stage and prohibit stale rewards`,async()=>{
 let saved=settle(stage('cooled',choice),FURNACE_GROUPS.exhaust.slice(0,2),point('furnace-exhaust'));const h=await browser(saved),before=copy(h.ui.state);h.ui.battle.p.hp=0;
 assert.equal(await h.ui.dispatch({type:'settleCombat',defeated:[],...battleReport(h.ui.battle)}),true);h.ui.showDeath();assert.equal(h.ui.state.world.lifeDown,true);assert.equal(h.ui.state.gold,before.gold-Math.floor(before.gold*.05));
 const dead=copy(h.ui.state),revision=h.ui.controller.revision(),commands=h.commands.length,outcomes=h.outcomes.length;await h.click('furnace:furnace-exhaust');assert.equal(h.commands.length,commands,'stale dead UI is rejected before dispatch');assert.equal(h.outcomes.length,outcomes);assert.deepEqual(h.ui.state,dead);assert.equal(h.ui.controller.revision(),revision);h.ui.closePanel();assert.equal(h.ui.paused,true);
 const resumed=await browser(null,{storage:h.storage,reload:true});resumed.ui.showDeath();assert.deepEqual(resumed.ui.state,dead);await resumed.click('retry');assert.equal(resumed.ui.state.world.region,'ash_hamlet');assert.equal(resumed.ui.state.world.life,before.world.life+1);assert.equal(resumed.ui.state.world.lifeDown,false);
 await usePortal(resumed,'town-furnace-entry');assert.deepEqual(resumed.ui.state.world.objectives,before.world.objectives);assert.deepEqual(resumed.ui.state.world.claimedRewards,before.world.claimedRewards);assert.deepEqual(resumed.ui.state.world.defeated,before.world.defeated);assert.deepEqual(resumed.ui.state.inventory,before.inventory);assert.equal(resumed.ui.state.stats.earnedXp,before.stats.earnedXp);
 assert.equal(resumed.ui.battle.enemies.length,10);assert.equal(inMap(resumed.ui.battle.map,368,400),choice==='channel');
 resumed.move(point('furnace-cooling'));await resumed.ui.showFurnace('furnace-cooling');assert.match(resumed.modal.innerHTML,new RegExp(FURNACE_MODES[choice].name));assert.doesNotMatch(resumed.modal.innerHTML,/data-action="furnace:furnace-cooling:/);
 const once=economy(resumed.ui.state);await resumed.click('furnace:furnace-cooling:'+(choice==='cover'?'channel':'cover'));assert.deepEqual(economy(resumed.ui.state),once);assert.equal(resumed.outcomes.at(-1).code,'ALREADY_CLAIMED');assert.deepEqual(resumed.store.load().state,resumed.ui.state);
});

for(const [name,expected]of [['predecessor','furnace-accept'],['accepted','furnace-travel'],['entry','furnace-cooling'],['cooled','furnace-exhaust'],['exhausted','furnace-ignition'],['ignited','furnace-lens'],['lens','furnace-report'],['reported','tomb-accept']])test(`actual ${name} objective panel and HUD show current F goal without mutating progress`,async()=>{
 const saved=stage(name),before=copy(saved);assert.equal(campaignGuidance(saved).id,expected);assert.deepEqual(campaignGuidance(saved),name==='reported'?tombGuidance(saved):furnaceGuidance(saved));assert.deepEqual(saved,before);
 const h=await browser(saved);h.ui.showObjective();await nextTurn();assert.equal(h.ui.paused,true);assert.match(h.modal.innerHTML,/안내를 읽는 동안 일시정지/);assert.ok(h.modal.innerHTML.includes(campaignGuidance(saved).title));assert.ok(h.modal.innerHTML.includes(campaignGuidance(saved).detail));assert.ok(h.elements.objective.innerHTML.includes(campaignGuidance(saved).title));assert.deepEqual(economy(h.ui.state),economy(saved));assert.deepEqual(h.ui.state.world.objectives,saved.world.objectives);
 if(name==='reported'){assert.equal(saved.character.tier,'adept');assert.match(h.modal.innerHTML,/촌장 에다/);assert.match(h.modal.innerHTML,/신호 묘실/);}
});

test('actual F goal names the saved custom interaction key and inventory resolves the permanent lens label',async()=>{
 let saved=stage('lens');const binding=rebindControl(controlsFor(saved),'interact',0,'KeyG');assert.equal(binding.ok,true);saved=run(saved,{type:'setControls',controls:binding.controls}).state;
 const h=await browser(saved);h.ui.showObjective();await nextTurn();assert.match(h.modal.innerHTML,/상호작용\(G\)/);assert.match(h.elements.objective.innerHTML,/G 대화/);
 h.ui.showEquipment();assert.ok(h.modal.innerHTML.includes(FURNACE_TOOLS.furnace_lens.name));assert.doesNotMatch(h.modal.innerHTML,/furnace_lens/);assert.match(h.modal.innerHTML,/비소모 회수물/);
});

for(const [name,id,used]of [['cooled','furnace-cooling',true],['exhausted','furnace-exhaust',true],['ignited','furnace-ignition',true],['ignited','furnace-lens',false],['lens','furnace-lens',true]])test(`actual ${name} ${id} labels and render preparation reflect its true completion`,async()=>{
 const saved=stage(name),h=await browser(saved),object=point(id),view=furnaceObjectView(saved,object);h.move(object);h.ui.drawLabels();assert.ok(h.labels.includes(view.name));await h.ui.showFurnace(id);
 if(used)assert.doesNotMatch(h.modal.innerHTML,new RegExp(`data-action="furnace:${id}(?:[:"])`));else assert.match(h.modal.innerHTML,new RegExp(`data-action="furnace:${id}"`));
 const objectLine=source.split('\n').find(line=>line.includes('const r=getRegion(battle.region),objects='));assert.ok(objectLine,'production renderer object preparation must exist');
 const names=['tombObjectView','state','battle','getRegion','furnaceObjectView','signalObjectView','passObjectView','quarryObjectView','dungeonObjectView'];
 const objects=vm.compileFunction(objectLine+'\nreturn objects;',names)(tombObjectView,saved,h.ui.battle,getRegion,furnaceObjectView,signalObjectView,passObjectView,quarryObjectView,dungeonObjectView);
 assert.equal(objects.find(row=>row.id===id).type,object.visualType);assert.equal(objects.find(row=>row.id===id).used,used);assert.equal(objects.find(row=>row.id==='furnace-shortcut').used,false,'independent unused lift stays actionable');
});

test('actual qa-r9 title and forward-copy handler preserve earned qa-r8 source and all earlier namespace bytes',async()=>{
 assert.equal(candidateNamespace('/qa-r9/'),'qa-r9');assert.equal(candidateNamespace('/qa-r9-other/'),null);assert.equal(candidatePath('/qa-r9'),true);assert.equal(candidatePath('/'),false);assert.throws(()=>profileKeys('main','qa-r9'));
 const storage=memory(),saved=stage(),sourceStore=createStore(storage,{profile:'qa-r8-source',namespace:'qa-r8'});assert.equal(sourceStore.save(saved,{expectedRevision:0}).ok,true);
 for(const namespace of ['release','qa-r4','qa-r5','qa-r6','qa-r7'])assert.equal(createStore(storage,{profile:namespace==='release'?'main':'qa-preserved',namespace}).save(createState(),{expectedRevision:0}).ok,true);
 const h=await browser(saved,{storage}),before=new Map(storage.data);h.ui.showTitle();assert.match(h.modal.innerHTML,/<option value="qa-r8">/);assert.match(h.modal.innerHTML,/data-action="candidate-copy"/);assert.doesNotMatch(h.modal.innerHTML,/data-action="new"/);
 await h.click('candidate-copy');const target=createStore(storage,{profile:'qa-r9-copy',namespace:'qa-r9'}),copied=target.load();assert.equal(copied.ok,true);assert.deepEqual(copied.state,saved);assert.equal(copied.checksum,sourceStore.load().checksum);assert.ok(h.calls.some(([name,profile,start])=>name==='load-profile'&&profile==='qa-r9-copy'&&start===false));
 for(const [key,value]of before)assert.equal(storage.data.get(key),value,key);const bytes=new Map(storage.data);await h.click('candidate-copy');assert.deepEqual(storage.data,bytes);assert.match(h.modal.innerHTML,/이미 후보 기록/);
 const progress=run(copied.state,{type:'acceptFurnaceQuest',...report(copied.state,smith)}).state;assert.equal(target.save(progress,{expectedRevision:copied.revision}).ok,true);for(const [key,value]of before)assert.equal(storage.data.get(key),value,key);
 assert.equal(sourceStore.load().revision,1);assert.equal(sourceStore.load().state.world.objectives.furnace_accepted,undefined);
 for(const targetNamespace of ['release','qa-r4','qa-r5','qa-r6','qa-r7','qa-r8','qa-r9'])assert.equal((await copyReleaseQaProfile(storage,locks,{sourceProfile:'qa-r9-copy',sourceNamespace:'qa-r9',targetProfile:'qa-no-overwrite',targetNamespace})).code,'INVALID_NAMESPACE');
});

for(const action of ['close','objective'])test(`actual pending cooling commit preserves a newer ${action} action instead of reopening its old panel`,async()=>{
 const h=await browser(stage('cooling-ready'));h.move(point('furnace-cooling'));await h.ui.showFurnace('furnace-cooling');
 h.delay();const choosing=h.click('furnace:furnace-cooling:cover');await nextTurn();assert.equal(h.ui.busy,true);await h.click(action);
 const html=h.modal.innerHTML,hidden=h.modal.hidden,paused=h.ui.paused,saves=h.saveCount;await h.release();await choosing;
 assert.equal(h.ui.state.world.objectives.furnace_cooled,1);assert.equal(h.modal.innerHTML,html,'newer navigation must retain its panel');assert.equal(h.modal.hidden,hidden);assert.equal(h.ui.paused,paused);assert.equal(h.saveCount,saves,'completion must not enqueue another checkpoint');assert.deepEqual(h.store.load().state,h.ui.state);
});

for(const ready of [false,true])test(`actual town F entrances ${ready?'appear after acceptance':'stay hidden before acceptance'} without removing core gates`,async()=>{
 const saved=stage(ready?'accepted':'predecessor'),h=await browser(saved),entrances=getRegion('ash_hamlet').portals.filter(portal=>portal.gate?.startsWith('furnace_'));assert.equal(entrances.length,2);
 h.ui.drawLabels();const objectLine=source.split('\n').find(line=>line.includes('const r=getRegion(battle.region),objects='));assert.ok(objectLine);
 const names=['tombObjectView','state','battle','getRegion','furnaceObjectView','signalObjectView','passObjectView','quarryObjectView','dungeonObjectView'];
 const objects=vm.compileFunction(objectLine+'\nreturn objects;',names)(tombObjectView,saved,h.ui.battle,getRegion,furnaceObjectView,signalObjectView,passObjectView,quarryObjectView,dungeonObjectView);
 for(const portal of entrances){h.move(portal);assert.equal(h.labels.includes(portal.name),ready);assert.equal(objects.some(object=>object.id===portal.id),ready);if(ready)assert.equal(h.ui.nearest().id,portal.id);else assert.notEqual(h.ui.nearest()?.id,portal.id);}
 if(!ready){const portal=entrances.find(row=>row.id==='town-furnace-entry'),before=copy(h.ui.state);h.move(portal);assert.equal(await h.ui.dispatch({type:'travel',to:portal.to,portalId:portal.id,...battleReport(h.ui.battle)},{rebuild:true}),false);assert.equal(h.outcomes.at(-1).code,'QUEST_REQUIRED');assert.deepEqual(h.ui.state,before);}
});

test('actual new untrained Warrior sees no F town entrance or lift label',async()=>{
 const h=await browser(createState());h.ui.drawLabels();for(const portal of getRegion('ash_hamlet').portals.filter(row=>row.gate?.startsWith('furnace_'))){h.move(portal);assert.notEqual(h.ui.nearest()?.id,portal.id);assert.equal(h.labels.includes(portal.name),false);}
});

for(const operation of ['accept','report'])for(const action of ['close','objective'])test(`actual pending F ${operation} commit retains newer ${action} navigation`,async()=>{
 const saved=operation==='accept'?stage():travel(stage('lens'),'furnace-town-return'),h=await browser(saved);h.move(smith);h.ui.showNpc('blacksmith');await nextTurn();
 h.delay();const committing=h.click('furnace-'+operation);await nextTurn();assert.equal(h.ui.busy,true);await h.click(action);
 const html=h.modal.innerHTML,hidden=h.modal.hidden,paused=h.ui.paused,saves=h.saveCount;await h.release();await committing;
 assert.equal(h.ui.state.world.objectives[operation==='accept'?'furnace_accepted':'furnace_reported'],1);assert.equal(h.modal.innerHTML,html);assert.equal(h.modal.hidden,hidden);assert.equal(h.ui.paused,paused);assert.equal(h.saveCount,saves);assert.deepEqual(h.store.load().state,h.ui.state);
});

for(const operation of ['accept','lens','report'])test(`actual F ${operation} retains paid HP/MP/stamina and cooldowns without a map rebuild`,async()=>{
 const saved=operation==='accept'?stage():operation==='lens'?stage('ignited'):travel(stage('lens'),'furnace-town-return'),h=await browser(saved);
 if(operation==='lens'){h.move(point('furnace-lens'));await h.ui.showFurnace('furnace-lens');}else{h.move(smith);h.ui.showNpc('blacksmith');await nextTurn();}
 const b=h.ui.battle,map=b.map,paid=deplete(h);await h.click(operation==='lens'?'furnace:furnace-lens':'furnace-'+operation);
 assert.equal(h.ui.state.world.objectives[{accept:'furnace_accepted',lens:'furnace_lens_taken',report:'furnace_reported'}[operation]],1);assert.equal(h.ui.battle,b);assert.equal(b.map,map);assert.deepEqual(h.ui.state.vitals,paid.vitals);assert.deepEqual(h.ui.state.recovery,paid.recovery);assert.deepEqual(battleReport(b).vitals,paid.vitals);assert.deepEqual(battleReport(b).recovery,paid.recovery);
 const before=copy(h.ui.state),revision=h.ui.controller.revision();await h.click(operation==='lens'?'furnace:furnace-lens':'furnace-'+operation);assert.deepEqual(h.ui.state,before);assert.equal(h.ui.controller.revision(),revision);assert.deepEqual(h.store.load().state,h.ui.state);
});

for(const action of ['close','objective'])test(`actual pending F opening checkpoint honors newer ${action} navigation`,async()=>{
 const h=await browser(stage('cooling-ready'));h.move(point('furnace-cooling'));const before=economy(h.ui.state);h.delay();const opening=h.ui.showFurnace('furnace-cooling');await nextTurn();assert.equal(h.ui.busy,true);await h.click(action);
 const html=h.modal.innerHTML,hidden=h.modal.hidden,paused=h.ui.paused;await h.release();await opening;assert.equal(h.modal.innerHTML,html);assert.equal(h.modal.hidden,hidden);assert.equal(h.ui.paused,paused);assert.equal(h.saveCount,1);assert.deepEqual(economy(h.ui.state),before);assert.deepEqual(h.store.load().state,h.ui.state);
});

test('actual reload click resolves a cooling conflict to the durable opposite choice without paying again',async()=>{
 const h=await browser(stage('cooling-ready'));h.move(point('furnace-cooling'));await h.ui.showFurnace('furnace-cooling');const before=copy(h.ui.state),oldBattle=h.ui.battle;
 const other=createStore(h.storage,{profile:'qa-furnace-ui',namespace:'qa-r9'}),latest=other.load(),chosen=acted(latest.state,'furnace-cooling','channel');assert.equal(other.save(chosen,{expectedRevision:latest.revision}).ok,true);
 await h.click('furnace:furnace-cooling:cover');assert.equal(h.outcomes.at(-1).code,'CONFLICT');assert.equal(h.gate.blocked,true);assert.deepEqual(h.ui.state,before);
 await h.click('reload');assert.equal(h.gate.blocked,false);assert.equal(h.modal.hidden,true);assert.equal(h.ui.paused,false);assert.notEqual(h.ui.battle,oldBattle);assert.deepEqual(h.ui.state,chosen);assert.equal(h.ui.state.world.objectives.furnace_mode,2);assert.equal(inMap(h.ui.battle.map,368,400),true);
 h.move(point('furnace-cooling'));await h.ui.showFurnace('furnace-cooling');assert.match(h.modal.innerHTML,/중앙 통로 개방 완료/);assert.doesNotMatch(h.modal.innerHTML,/data-action="furnace:furnace-cooling:/);
 const durable=copy(h.ui.state);await h.click('furnace:furnace-cooling:cover');assert.equal(h.outcomes.at(-1).code,'ALREADY_CLAIMED');assert.deepEqual(h.ui.state,durable);assert.equal(h.ui.state.stats.earnedXp-before.stats.earnedXp,100);assert.equal(h.ui.state.world.claimedRewards.filter(id=>id==='r9:f:cooling').length,1);
});

test('actual reload after an uncertain uncommitted cooling choice resumes saved stage before a fresh choice',async()=>{
 const h=await browser(stage('cooling-ready'));h.move(point('furnace-cooling'));await h.ui.showFurnace('furnace-cooling');const before=copy(h.ui.state);h.fail({ok:false,code:'COMMIT_UNCERTAIN',reason:'fixture uncertain, unchanged durable head'});
 await h.click('furnace:furnace-cooling:channel');assert.equal(h.gate.blocked,true);await h.click('reload');assert.equal(h.gate.blocked,false);assert.equal(h.ui.paused,false);assert.equal(h.modal.hidden,true);assert.deepEqual(h.ui.state,before);assert.equal(h.ui.state.world.objectives.furnace_mode,0);
 h.move(point('furnace-cooling'));await h.ui.showFurnace('furnace-cooling');assert.match(h.modal.innerHTML,/data-action="furnace:furnace-cooling:cover"/);await h.click('furnace:furnace-cooling:cover');assertReward(h,before,'cooling');assert.equal(h.ui.state.world.objectives.furnace_mode,1);assert.deepEqual(h.store.load().state,h.ui.state);
});
