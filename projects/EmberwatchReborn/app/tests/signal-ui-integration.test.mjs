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
import {FURNACE_TOOLS} from '../src/furnace-content.js';
import {furnaceObjectView,furnaceBlacksmithView,furnaceGuidance} from '../src/furnace-presentation.js';
import {dungeonObjectView} from '../src/dungeon-presentation.js';
import {quarryObjectView,quarryElderView} from '../src/quarry-presentation.js';
import {passObjectView,passElderView} from '../src/pass-presentation.js';
import {signalObjectView,signalBlacksmithView,signalGuidance} from '../src/signal-presentation.js';
import {campaignGuidance,chestPresentation} from '../src/campaign-guidance.js';
import {earnedPassRoute} from './support/earned-pass-route.mjs';
import {report,run,travel,settle} from './support/earned-route.mjs';

// These tests execute unchanged production main.js handlers with the actual
// controller, durable in-memory store, reducers, battle and presentation code.
// Only browser boundaries (DOM, audio, HUD scheduling) are probes. compileFunction
// uses the same realm as the imports: no JSON/prototype repair is applied to UI
// commands, and no production source transformation or module-load hook is used.
// Coordinates and defeated reports below are SCRIPTED SETTLEMENT FIXTURES, NOT
// browser play, AI combat, visual QA, or an ordinary-input progression claim.
// Earned fixtures never assign XP, level, skills, rewards, or objective flags.
const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const copy=value=>structuredClone(value);
const point=id=>getRegion('signal_basin').objects.find(object=>object.id===id);
const smith={x:250,y:470};
const memory=()=>{const data=new Map();return {data,getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};};
const locks={request:async(_key,_options,callback)=>callback()};
const nextTurn=()=>new Promise(resolve=>setImmediate(resolve));

// Locate the complete function by asking the parser, including nested template
// strings. A missing/changed production boundary fails instead of using a mock.
function mainFunction(name){
 const match=new RegExp(`(?:async )?function ${name}\\(`).exec(source);
 assert.ok(match,`production function ${name} must exist`);
 for(let end=source.indexOf('}',match.index);end!==-1;end=source.indexOf('}',end+1)){
  const body=source.slice(match.index,end+1);
  try{new vm.Script('('+body+')');return body;}catch(error){if(!(error instanceof SyntaxError))throw error;}
 }
 assert.fail(`complete production function ${name}`);
}
function between(start,end){const a=source.indexOf(start),b=source.indexOf(end,a+start.length);assert.ok(a>=0&&b>a,`production boundaries: ${start}`);return source.slice(a,b);}
const browserFunctions=['wildernessView','wildernessActionButton','showWilderness','battlefieldActionButton','showBattlefield','tombActionButton','showTomb','showJournal','flushActionSafety','acceptCombatPress','releaseCombatToken','checkpointPanel','showTraining','showActionSlots','clearInput','panel','closePanel','report','syncVitals','dispatch','nearest','interact','showSignal','showNpc','showEquipment','equipmentAction','showObjective','showTitle','drawLabels'];
const exposed=['dispatch','nearest','interact','showSignal','showNpc','showEquipment','showObjective','showTitle','drawLabels','closePanel'];
const harnessSource=[mainInputSource,between('const config=','let controller='),
 between('const esc=','function clearInput('),between('const tierLabel=','const focusEvents='),
 between('const statNames=','let equipmentStation='),
 ...browserFunctions.map(mainFunction),
 between("document.addEventListener('click',", "document.addEventListener('change',"),
 `return {${exposed.join(',')},get state(){return state},get battle(){return battle},get paused(){return paused},get busy(){return busy},get controller(){return controller},get equipmentStation(){return equipmentStation}};`,
].join('\n');

const stageCache=new Map();
function stage(name='predecessor',direction='west'){
 const key=name+':'+direction;if(stageCache.has(key))return copy(stageCache.get(key));
 let state;
 if(name==='predecessor')state=earnedPassRoute();
 else if(name==='accepted')state=run(stage('predecessor'),{type:'acceptSignalQuest',...report(stage('predecessor'),smith)}).state;
 else if(name==='entry')state=settle(travel(stage('accepted'),'town-signal-entry'),SIGNAL_GROUPS.entry);
 else if(name==='decoded')state=interacted(stage('entry'),'signal-code');
 else if(name==='routed'){
  state=stage('decoded');for(const node of direction==='west'?['transmitter','receiver']:['receiver','transmitter'])state=interacted(state,'signal-route-'+node);
 }else if(name==='transmitter')state=interacted(settle(stage('routed',direction),SIGNAL_GROUPS.yard,point('signal-transmitter')),'signal-transmitter');
 else if(name==='receiver')state=interacted(settle(stage('transmitter',direction),SIGNAL_GROUPS.receiver,point('signal-receiver')),'signal-receiver');
 else if(name==='reported'){
  state=travel(stage('receiver',direction),'signal-town-return');state=run(state,{type:'reportSignalQuest',...report(state,smith)}).state;
 }else assert.fail('unknown fixture stage '+name);
 assert.equal(validateState(state).ok,true);stageCache.set(key,copy(state));return copy(state);
}
const interacted=(state,id)=>run(state,{type:'interactSignal',objectId:id,...report(state,point(id))}).state;
const economy=state=>copy({character:state.character,gold:state.gold,stats:state.stats,inventory:state.inventory,receipts:state.world.claimedRewards});

async function browser(saved,{storage=memory(),profile='qa-signal-ui',namespace='qa-r8'}={}){
 const store=createStore(storage,{profile,namespace});assert.equal(store.save(saved,{expectedRevision:0}).ok,true);
 const controller=createController(store),loaded=await controller.load();assert.equal(loaded.ok,true);
 const events=[],messages=[],calls=[],handlers={},labels=[];controller.subscribe(event=>events.push(event));
 const modal={hidden:true,innerHTML:'',querySelector:()=>({focus:()=>calls.push(['focus-modal'])})};
 const elements={toast:{textContent:'',classList:{add(){},remove(){}}},hud:{hidden:false},profile:{value:'qa-r8-copy'},sourceProfile:{value:'qa-r7-source'},sourceNamespace:{value:'qa-r7'}};
 const imports={...mainImports,BATTLEFIELD_COMMANDS,battlefieldObjectView,battlefieldElderView,battlefieldGuidance,battlefieldCommandFields,battlefieldPortalLabel,battlefieldEventCopy,previewExpertPromotion,quoteAction,EXPERT_SLOTS,emptyActionSlots,combatCheckpoint,TOMB_COMMANDS,TOMB_TOOLS,tombWardCarried,tombObjectView,tombElderView,tombCommandFields,tombClueView,tombEventCopy,tombGoldView,tombPortalLabel,createBattle,clearBattleIntent,battleReport,syncCommittedBattle,getRegion,createMap,near,lineOfSight,selectInteractionTarget,deriveStats,equipmentRows,quoteEquipment,previewRecipe,EQUIPMENT_ITEMS,EQUIPMENT_RECIPES,EQUIPMENT_SLOTS,EQUIPMENT_UPGRADES,DUNGEON_TOOLS,QUARRY_TOOLS,PASS_TOOLS,SIGNAL_TOOLS,FURNACE_TOOLS,DUNGEON_COMMANDS,QUARRY_COMMANDS,PASS_COMMANDS,SIGNAL_COMMANDS,FURNACE_COMMANDS,dungeonObjectView,quarryObjectView,quarryElderView,passObjectView,passElderView,signalObjectView,signalBlacksmithView,furnaceObjectView,furnaceBlacksmithView,campaignGuidance,chestPresentation,copyReleaseQaProfile};
 const declaredImports=new Set([...source.matchAll(/^import\s*\{([^}]+)\}/gm)].flatMap(match=>match[1].split(',').map(name=>name.trim())));
 for(const name of Object.keys(imports))assert.ok(declaredImports.has(name),`production main must import ${name}`);
 const expertCapture=createExpertInputCapture(),expertSafety=createActionSafety({capture:expertCapture,cancel:cancelBattleAction});
 const env={...createMainInputFixture(),...imports,expertCapture,expertSafety,state:loaded.state,battle:createBattle(loaded.state),controller,paused:false,busy:false,combatSaveElapsed:0,captureBinding:null,equipmentStation:null,suppressNextClick:false,
  noticeUntil:0,modal,gate:createRuntimeGate(),candidate:namespace!=='release',saveNamespace:namespace,localStorage:storage,navigator:{locks},
  $:id=>elements[id],document:{hidden:false,hasFocus:()=>true,addEventListener:(name,fn)=>{handlers[name]=fn;}},
  audio:{cancel(){},pause:value=>calls.push(['audio-pause',value]),play:name=>calls.push(['audio-play',name])},
  router:tracedInputRouter(options=>calls.push(['router-clear',options])),deferredImmediate:{clear:()=>calls.push(['deferred-clear'])},
  canvas:{width:1280,height:720,focus:()=>calls.push(['focus-canvas'])},last:0,
  ctx:{save(){},restore(){},fillRect(){},fillText:text=>labels.push(text)},projectWorld:(x,y)=>({x,y}),ISO:{zoom:1},
  toast:text=>messages.push(text),updateHud:()=>calls.push(['hud']),
  loadProfile:async(...args)=>calls.push(['load-profile',...args]),
 };
 const ui=vm.compileFunction(harnessSource,Object.keys(env),{filename:'production-main-signal-ui-handlers.js'})(...Object.values(env));
 const click=async(action,{disabled=false}={})=>{await handlers.click({target:{closest:()=>({disabled,dataset:{action}})},preventDefault(){},stopPropagation(){}});await nextTurn();};
 const move=position=>{Object.assign(ui.battle.p,{x:position.x,y:position.y});};
 return {ui,modal,messages,calls,events,labels,storage,store,elements,click,move};
}

// Ordinary blacksmith transactions are deliberately exercised alongside S.
test('actual Orin panel offers S acceptance beside existing equipment and keeps Eda unchanged',async()=>{
 const h=await browser(stage());h.move(smith);h.ui.showNpc('blacksmith');await nextTurn();
 assert.match(h.modal.innerHTML,/대장장이 오린/);assert.match(h.modal.innerHTML,/data-action="signal-accept"/);
 assert.match(h.modal.innerHTML,/data-action="buy:/);assert.match(h.modal.innerHTML,/data-action="award:workshop_supplies"/);
 const before=economy(h.ui.state);await h.click('signal-accept');
 assert.equal(h.ui.state.world.objectives.signal_accepted,1);assert.equal(h.ui.state.gold,before.gold);assert.deepEqual(h.ui.state.character,before.character);
 assert.match(h.modal.innerHTML,/신호 복원 진행 중/);assert.doesNotMatch(h.modal.innerHTML,/data-action="signal-accept"/);assert.match(h.modal.innerHTML,/data-action="buy:/);
 h.move({x:450,y:325});h.ui.showNpc('elder');await nextTurn();assert.match(h.modal.innerHTML,/촌장 에다/);assert.doesNotMatch(h.modal.innerHTML,/data-action="signal-(?:accept|report)"/);
});

test('actual S acceptance and existing purchase handlers share Orin without replacing shop transactions',async()=>{
 const h=await browser(stage());h.move(smith);h.ui.showEquipment('blacksmith');await h.click('signal-accept');
 const item=Object.values(EQUIPMENT_ITEMS).find(row=>quoteEquipment(h.ui.state,{type:'buyEquipment',baseId:row.id,station:'blacksmith',commandId:'quote:ui-test'}).ok);assert.ok(item,'earned route can buy at least one existing item');
 const before=copy(h.ui.state);await h.click('buy:'+item.id);
 assert.equal(h.ui.state.gold,before.gold-item.price);assert.equal(h.ui.state.inventory.equipmentInstances.length,before.inventory.equipmentInstances.length+1);
 assert.deepEqual(h.ui.state.world.objectives,before.world.objectives);assert.deepEqual(h.ui.state.world.claimedRewards,before.world.claimedRewards);
 assert.match(h.modal.innerHTML,/신호 복원 진행 중/);assert.match(h.modal.innerHTML,/data-action="buy:/);assert.equal(h.ui.equipmentStation,'blacksmith');
});

test('actual F interaction finds S decoder, checkpoints, pauses, and the real click saves its once-only reward',async()=>{
 const h=await browser(stage('entry'));h.move(point('signal-code'));h.ui.battle.skillIntent={id:'righteous_hammer'};
 assert.equal(h.ui.nearest().kind,'signal');assert.equal(h.ui.nearest().id,'signal-code');
 h.ui.interact();await nextTurn();assert.equal(h.ui.paused,true);assert.equal(h.ui.battle.skillIntent,null);
 assert.equal(h.ui.state.world.position.x,point('signal-code').x);assert.match(h.modal.innerHTML,/data-action="signal:signal-code"/);
 const xp=h.ui.state.stats.earnedXp,gold=h.ui.state.gold;await h.click('signal:signal-code');
 assert.equal(h.ui.state.stats.earnedXp-xp,100);assert.equal(h.ui.state.gold-gold,10);assert.equal(h.ui.state.world.objectives.signal_decoded,1);
 assert.ok(h.messages.some(message=>/경험치 100 \/ 금화 10/.test(message)));assert.match(h.modal.innerHTML,/해독판 다시 읽기/);assert.match(h.modal.innerHTML,/송신 → 수신.*서쪽/);
 assert.deepEqual(h.store.load().state,h.ui.state);
 const before=economy(h.ui.state);await h.click('signal:signal-code');assert.deepEqual(economy(h.ui.state),before);
 assert.equal(h.ui.state.world.claimedRewards.filter(id=>id==='r8:s:decode').length,1);
});

for(const [direction,nodes,label] of [['west',['transmitter','receiver'],'서쪽'],['east',['receiver','transmitter'],'동쪽']])test(`actual ${direction} route click feedback and map-only refresh retain live battle and paid recovery`,async()=>{
 const h=await browser(stage('decoded')),b=h.ui.battle,enemy=b.enemies[0];
 // Explicit live-combat boundary fixture, not earned combat evidence: model
 // already-paid resources/CDs and a partially damaged living foe before a gate.
 b.p.hp-=3;b.p.mana-=2;b.p.stamina-=4;b.p.cooldowns.righteous_hammer=1.7;b.p.recoveryLock=.4;b.p.manaDelay=.8;
 enemy.hp-=7;enemy.x+=1;enemy.pathTimer=9;b.shots.push({id:'existing-shot'});b.effects.push({id:'existing-effect'});
 const hp=enemy.hp,x=enemy.x,player=b.p,shots=b.shots,effects=b.effects,map=b.map,resources=battleReport(b);
 h.move(point('signal-route-'+nodes[0]));await h.click('signal:signal-route-'+nodes[0]);
 assert.equal(h.ui.state.world.objectives.signal_route_step,1);assert.equal(b.map,map);assert.equal(enemy.pathTimer,9);
 assert.ok(h.messages.some(message=>new RegExp('1/2.*다음 '+(nodes[1]==='receiver'?'수신':'송신')).test(message)));
 h.move(point('signal-route-'+nodes[1]));const before=economy(h.ui.state);await h.click('signal:signal-route-'+nodes[1]);
 assert.equal(h.ui.state.world.objectives['signal_'+direction+'_open'],1);assert.notEqual(b.map,map);
 assert.equal(h.ui.battle,b);assert.equal(b.p,player);assert.equal(b.enemies[0],enemy);assert.equal(enemy.hp,hp);assert.equal(enemy.x,x);assert.equal(enemy.pathTimer,0);
 assert.equal(b.shots,shots);assert.equal(b.effects,effects);assert.deepEqual(battleReport(b).vitals,resources.vitals);assert.deepEqual(battleReport(b).recovery,resources.recovery);
 assert.equal(h.ui.state.gold,before.gold);assert.deepEqual(h.ui.state.character,before.character);
 assert.ok(h.messages.some(message=>message.includes(label+' 접근로를 열었습니다')));assert.match(h.modal.innerHTML,new RegExp(label+' 접근로를 연결'));
 assert.doesNotMatch(h.modal.innerHTML,/data-action="signal:signal-route-/);
 assert.equal(inMap(b.map,128,496),direction==='west');assert.equal(inMap(b.map,672,496),direction==='east');
 const saved=economy(h.ui.state);await h.click('signal:signal-route-'+nodes[1]);assert.deepEqual(economy(h.ui.state),saved);
 assert.equal(h.ui.state.world.claimedRewards.filter(id=>/^r8:s:route-/.test(id)).length,1);
});

test('actual repeated first lever resets visible order only, without reward, route, or map rebuild',async()=>{
 const h=await browser(stage('decoded'));h.move(point('signal-route-transmitter'));await h.click('signal:signal-route-transmitter');
 const before=economy(h.ui.state),map=h.ui.battle.map;await h.click('signal:signal-route-transmitter');
 assert.equal(h.ui.state.world.objectives.signal_route_step,0);assert.equal(h.ui.state.world.objectives.signal_route_first,0);assert.equal(h.ui.state.world.objectives.signal_route_ready,0);
 assert.deepEqual(economy(h.ui.state),before);assert.equal(h.ui.battle.map,map);assert.ok(h.messages.some(message=>/0\/2로 초기화/.test(message)));assert.match(h.modal.innerHTML,/순서 0\/2/);
 assert.match(h.modal.innerHTML,/data-action="signal:signal-route-transmitter"/);
});

test('actual nearest elevates the ready S shortcut only within reach and LOS, then exposes its unlocked portal',async()=>{
 const h=await browser(stage('decoded'));const overlap={x:700,y:640},shortcut=point('signal-shortcut'),portal=getRegion('signal_basin').portals.find(row=>row.id==='signal-town-shortcut');
 h.move(overlap);assert.ok(near(overlap,shortcut));assert.ok(near(overlap,portal));assert.ok(lineOfSight(h.ui.battle.map,overlap,shortcut));
 assert.ok(Math.hypot(portal.x-overlap.x,portal.y-overlap.y)<Math.hypot(shortcut.x-overlap.x,shortcut.y-overlap.y));
 assert.equal(h.ui.nearest().id,'signal-shortcut');const before=economy(h.ui.state);await h.click('signal:signal-shortcut');
 assert.equal(h.ui.state.world.objectives.signal_shortcut_open,1);assert.equal(h.ui.state.world.objectives.signal_route_ready,0);assert.equal(h.ui.nearest().id,'signal-town-shortcut');
 assert.equal(h.ui.state.gold,before.gold);assert.deepEqual(h.ui.state.character,before.character);assert.match(h.modal.innerHTML,/연결 완료/);assert.doesNotMatch(h.modal.innerHTML,/data-action="signal:signal-shortcut"/);
 const paid=battleReport(h.ui.battle);h.ui.closePanel();h.ui.interact();await nextTurn();assert.equal(h.ui.state.world.region,'ash_hamlet');assert.deepEqual(h.ui.state.vitals,paid.vitals);assert.deepEqual(h.ui.state.recovery,paid.recovery);
 const far=await browser(stage('decoded'));far.move(portal);assert.equal(near(portal,shortcut),false);assert.equal(far.ui.nearest().id,'signal-town-shortcut');
 const unready=await browser(stage('entry'));unready.move(overlap);assert.equal(unready.ui.nearest().id,'signal-town-shortcut');
});

test('actual transmitter click opens the north door and preserves damaged enemies while displaying objective reward',async()=>{
 const prepared=settle(stage('routed'),SIGNAL_GROUPS.yard,point('signal-transmitter')),h=await browser(prepared),b=h.ui.battle;
 h.move(point('signal-transmitter'));assert.equal(inMap(b.map,432,176),false);b.enemies[0].hp-=5;const enemy=b.enemies[0],hp=enemy.hp,map=b.map,xp=h.ui.state.stats.earnedXp;
 await h.click('signal:signal-transmitter');assert.equal(h.ui.state.stats.earnedXp-xp,110);assert.equal(h.ui.state.world.objectives.signal_transmitter_restored,1);
 assert.equal(h.ui.battle,b);assert.equal(b.enemies[0],enemy);assert.equal(enemy.hp,hp);assert.notEqual(b.map,map);assert.equal(inMap(b.map,432,176),true);
 assert.ok(h.messages.some(message=>/경험치 110 \/ 금화 30/.test(message)));assert.match(h.modal.innerHTML,/복원 완료/);assert.match(h.modal.innerHTML,/보상은 이미/);assert.doesNotMatch(h.modal.innerHTML,/data-action="signal:signal-transmitter"/);
 const before=economy(h.ui.state);await h.click('signal:signal-transmitter');assert.deepEqual(economy(h.ui.state),before);
});

test('actual receiver and Orin report clicks show and commit rewards once and retain truthful completed panels',async()=>{
 const prepared=settle(stage('transmitter'),SIGNAL_GROUPS.receiver,point('signal-receiver')),h=await browser(prepared);h.move(point('signal-receiver'));
 const before=copy(h.ui.state);await h.click('signal:signal-receiver');
 assert.equal(h.ui.state.stats.earnedXp-before.stats.earnedXp,120);assert.equal(h.ui.state.gold-before.gold,40);
 for(const [key,amount]of Object.entries({iron:4,wood:1,thread:3,ember_shard:1}))assert.equal(h.ui.state.inventory.materials[key]-(before.inventory.materials[key]??0),amount);
 assert.equal(h.ui.state.inventory.consumables.health_potion-before.inventory.consumables.health_potion,1);
 assert.match(h.modal.innerHTML,/복원 완료/);assert.match(h.modal.innerHTML,/오린에게 보고/);assert.doesNotMatch(h.modal.innerHTML,/data-action="signal:signal-receiver"/);
 assert.ok(h.messages.some(message=>/경험치 120 \/ 금화 40/.test(message)));const once=economy(h.ui.state);await h.click('signal:signal-receiver');assert.deepEqual(economy(h.ui.state),once);
 const portal=getRegion('signal_basin').portals.find(row=>row.id==='signal-town-return');h.move(portal);assert.equal(await h.ui.dispatch({type:'travel',to:portal.to,portalId:portal.id,...battleReport(h.ui.battle)},{rebuild:true}),true);
 h.move(smith);h.ui.showEquipment('blacksmith');assert.match(h.modal.innerHTML,/data-action="signal-report"/);assert.match(h.modal.innerHTML,/경험치90·금화60/);assert.match(h.modal.innerHTML,/data-action="buy:/);
 const reporting=economy(h.ui.state);await h.click('signal-report');assert.equal(h.ui.state.stats.earnedXp-reporting.stats.earnedXp,90);assert.equal(h.ui.state.gold-reporting.gold,60);
 assert.match(h.modal.innerHTML,/신호 복원 · 보고 완료/);assert.doesNotMatch(h.modal.innerHTML,/data-action="signal-report"/);assert.match(h.modal.innerHTML,/달인 승급과 기술은 아직 개발 중/);assert.match(h.modal.innerHTML,/data-action="buy:/);
 assert.ok(h.messages.some(message=>/경험치 90 \/ 금화 60/.test(message)));const completed=economy(h.ui.state);await h.click('signal-report');assert.deepEqual(economy(h.ui.state),completed);assert.deepEqual(h.store.load().state,h.ui.state);
});

test('actual inventory renders the permanent signal tool name instead of its internal ID',async()=>{
 const h=await browser(stage('decoded'));h.ui.showEquipment();assert.ok(h.modal.innerHTML.includes(SIGNAL_TOOLS.signal_cipher.name));assert.doesNotMatch(h.modal.innerHTML,/signal_cipher/);assert.match(h.modal.innerHTML,/송신→수신 서쪽 \/ 수신→송신 동쪽/);
});

test('actual signal panel does not open when its prerequisite checkpoint fails or save is blocked',async()=>{
 const h=await browser(stage('entry'));h.move(point('signal-code'));h.ui.battle.stateLife++;
 const before=copy(h.ui.state),bytes=new Map(h.storage.data);await h.ui.showSignal('signal-code');
 assert.equal(h.modal.hidden,true);assert.deepEqual(h.ui.state,before);assert.deepEqual(h.storage.data,bytes);assert.ok(h.messages.some(message=>/생명|현재/.test(message)));
 const blocked=await browser(stage('entry'));blocked.move(point('signal-code'));
 const other=createStore(blocked.storage,{profile:'qa-signal-ui',namespace:'qa-r8'}),loaded=other.load();assert.equal(other.save(loaded.state,{expectedRevision:loaded.revision}).ok,true);
 await blocked.ui.showSignal('signal-code');assert.equal(blocked.ui.paused,true);assert.match(blocked.modal.innerHTML,/저장을 확인해야 합니다/);assert.match(blocked.modal.innerHTML,/data-action="reload"/);assert.doesNotMatch(blocked.modal.innerHTML,/data-action="signal:/);
 blocked.ui.closePanel();assert.equal(blocked.ui.paused,true);await blocked.click('signal:signal-code');assert.equal(blocked.ui.state.world.objectives.signal_decoded,0);
});

test('disabled S controls and failed decoder prerequisites never pay, pause incorrectly, or create receipts',async()=>{
 const h=await browser(travel(stage('accepted'),'town-signal-entry'));h.move(point('signal-code'));await h.ui.showSignal('signal-code');
 const before=copy(h.ui.state),revision=h.ui.controller.revision();await h.click('signal:signal-code',{disabled:true});assert.deepEqual(h.ui.state,before);assert.equal(h.ui.controller.revision(),revision);
 await h.click('signal:signal-code');assert.deepEqual(h.ui.state,before);assert.equal(h.ui.controller.revision(),revision);assert.equal(h.ui.paused,true);assert.ok(h.messages.some(message=>/입구의 적 여섯/.test(message)));
 assert.doesNotMatch(h.messages.join(' '),/탐험 기록 저장/);
});

for(const [name,expected]of [['predecessor','signal-accept'],['accepted','signal-travel'],['decoded','signal-route'],['routed','signal-transmitter'],['transmitter','signal-receiver'],['receiver','signal-report'],['reported','furnace-accept']])test(`S guidance and completed F handoff take priority over Pass at ${name}, including actual paused objective panel`,async()=>{
 const saved=stage(name),before=copy(saved);assert.equal(campaignGuidance(saved).id,expected);assert.deepEqual(campaignGuidance(saved),name==='reported'?furnaceGuidance(saved):signalGuidance(saved));assert.deepEqual(saved,before);
 const h=await browser(saved);h.ui.showObjective();await nextTurn();assert.equal(h.ui.paused,true);assert.match(h.modal.innerHTML,/안내를 읽는 동안 일시정지/);assert.ok(h.modal.innerHTML.includes(campaignGuidance(saved).title));assert.ok(h.modal.innerHTML.includes(campaignGuidance(saved).detail));
 if(name==='reported'){assert.equal(saved.character.tier,'adept');assert.equal(signalGuidance(saved).id,'signal-complete');assert.match(signalGuidance(saved).detail,/아직 구현되지 않았습니다/);assert.match(h.modal.innerHTML,/대장장이 오린/);assert.match(h.modal.innerHTML,/용광로/);}
});

test('actual S label and renderer object preparation reflect saved completed actions',async()=>{
 const saved=stage('receiver'),h=await browser(saved);h.move({...point('signal-receiver'),x:528});h.ui.drawLabels();assert.ok(h.labels.includes('북쪽 수신기 · 완료'));h.move(point('signal-receiver'));assert.equal(h.ui.nearest().name,'북쪽 수신기 · 복원 완료');
 const objectLine=source.split('\n').find(line=>line.includes('const r=getRegion(battle.region),objects='));assert.ok(objectLine,'production render objects');
 const names=['tombObjectView','state','battle','getRegion','signalObjectView','passObjectView','quarryObjectView','dungeonObjectView'];
 const objects=vm.compileFunction(objectLine+'\nreturn objects;',names)(tombObjectView,saved,h.ui.battle,getRegion,signalObjectView,passObjectView,quarryObjectView,dungeonObjectView);
 for(const id of ['signal-route-transmitter','signal-route-receiver','signal-transmitter','signal-receiver']){const object=objects.find(row=>row.id===id);assert.equal(object.type,'shrine');assert.equal(object.used,true);}
 assert.equal(objects.find(row=>row.id==='signal-code').type,'relic');assert.equal(objects.find(row=>row.id==='signal-code').used,false,'non-consuming decoder rereading remains available');
 assert.equal(objects.find(row=>row.id==='signal-shortcut').used,false,'independent unused return stays actionable');
});

test('actual qa-r8 title and candidate-copy handler preserve earned R7 source and release bytes',async()=>{
 assert.equal(candidateNamespace('/qa-r8/'),'qa-r8');assert.equal(candidateNamespace('/qa-r8-other/'),null);assert.equal(candidatePath('/qa-r8'),true);assert.equal(candidatePath('/'),false);assert.throws(()=>profileKeys('main','qa-r8'));
 const storage=memory(),saved=stage(),sourceStore=createStore(storage,{profile:'qa-r7-source',namespace:'qa-r7'}),release=createStore(storage,{profile:'main'});
 assert.equal(sourceStore.save(saved,{expectedRevision:0}).ok,true);assert.equal(release.save(createState(),{expectedRevision:0}).ok,true);
 const h=await browser(saved,{storage}),before=new Map(storage.data);h.ui.showTitle();
 assert.match(h.modal.innerHTML,/<option value="qa-r7">/);assert.match(h.modal.innerHTML,/data-action="candidate-copy"/);assert.doesNotMatch(h.modal.innerHTML,/data-action="new"/);
 await h.click('candidate-copy');const copied=createStore(storage,{profile:'qa-r8-copy',namespace:'qa-r8'}).load();assert.equal(copied.ok,true);assert.deepEqual(copied.state,saved);assert.equal(copied.checksum,sourceStore.load().checksum);
 assert.ok(h.calls.some(([name,profile,start])=>name==='load-profile'&&profile==='qa-r8-copy'&&start===false));for(const [key,value]of before)assert.equal(storage.data.get(key),value,key);
 const bytes=new Map(storage.data);await h.click('candidate-copy');assert.deepEqual(storage.data,bytes);assert.match(h.modal.innerHTML,/이미 후보 기록/);
 const copyStore=createStore(storage,{profile:'qa-r8-copy',namespace:'qa-r8'}),current=copyStore.load(),progress=run(current.state,{type:'acceptSignalQuest',...report(current.state,smith)}).state;
 assert.equal(copyStore.save(progress,{expectedRevision:current.revision}).ok,true);for(const [key,value]of before)assert.equal(storage.data.get(key),value,key);assert.equal(sourceStore.load().revision,1);
 assert.equal(sourceStore.load().state.world.objectives.signal_accepted,undefined);assert.equal(release.load().state.world.objectives.signal_accepted,undefined);
 for(const targetNamespace of ['release','qa-r4','qa-r5','qa-r6','qa-r7','qa-r8'])assert.equal((await copyReleaseQaProfile(storage,locks,{sourceProfile:'qa-r8-copy',sourceNamespace:'qa-r8',targetProfile:'qa-no-overwrite',targetNamespace})).code,'INVALID_NAMESPACE');
});

test('actual nearest never promotes the S shortcut through a wall or beyond 76-unit reach',async()=>{
 const h=await browser(stage('decoded')),shortcut=point('signal-shortcut'),portal=getRegion('signal_basin').portals.find(row=>row.id==='signal-town-shortcut'),position={x:700,y:654};
 h.move(position);assert.equal(h.ui.nearest().id,shortcut.id);
 // Deliberate geometry-only boundary: block the segment to the unlock object,
 // while the same near locked portal remains in the player's visible corridor.
 h.ui.battle.map=copy(h.ui.battle.map);h.ui.battle.map.tiles[19][21]=0;
 assert.equal(inMap(h.ui.battle.map,position.x,position.y),true);assert.equal(inMap(h.ui.battle.map,shortcut.x,shortcut.y),true);
 assert.equal(lineOfSight(h.ui.battle.map,position,shortcut),false);assert.equal(lineOfSight(h.ui.battle.map,position,portal),true);assert.equal(h.ui.nearest().id,portal.id);
 h.ui.battle.map=createMap('signal_basin',h.ui.state);h.move({x:732,y:608});assert.equal(near(h.ui.battle.p,shortcut),true);assert.equal(h.ui.nearest().id,shortcut.id);
 h.move({x:732.000001,y:608});assert.equal(near(h.ui.battle.p,shortcut),false);assert.equal(h.ui.nearest().id,portal.id);
});

test('concurrent actual decoder clicks commit and display one reward while busy input is ignored',async()=>{
 const h=await browser(stage('entry'));h.move(point('signal-code'));await h.ui.showSignal('signal-code');
 const before=copy(h.ui.state),revision=h.ui.controller.revision();
 await Promise.all([h.click('signal:signal-code'),h.click('signal:signal-code'),h.click('signal:signal-code')]);
 assert.equal(h.ui.state.stats.earnedXp-before.stats.earnedXp,100);assert.equal(h.ui.state.gold-before.gold,10);assert.equal(h.ui.controller.revision(),revision+1);
 assert.equal(h.messages.filter(message=>/탐험 기록 저장/.test(message)).length,1);assert.equal(h.ui.state.world.claimedRewards.filter(id=>id==='r8:s:decode').length,1);
 assert.equal(h.ui.busy,false);assert.equal(h.ui.paused,true);assert.match(h.modal.innerHTML,/해독판 다시 읽기/);assert.deepEqual(h.store.load().state,h.ui.state);
});

test('actual route commit conflict cannot open the map, reset the live battle, or display success',async()=>{
 const h=await browser(stage('decoded'));h.move(point('signal-route-transmitter'));await h.click('signal:signal-route-transmitter');h.move(point('signal-route-receiver'));
 const b=h.ui.battle,map=b.map,enemy=b.enemies[0];enemy.hp-=4;enemy.pathTimer=11;
 const before=copy(h.ui.state),enemyBefore=copy(enemy),resources=battleReport(b),other=createStore(h.storage,{profile:'qa-signal-ui',namespace:'qa-r8'}),latest=other.load();
 assert.equal(other.save(latest.state,{expectedRevision:latest.revision}).ok,true);const bytes=new Map(h.storage.data);h.messages.length=0;
 await h.click('signal:signal-route-receiver');assert.deepEqual(h.ui.state,before);assert.deepEqual(h.storage.data,bytes);assert.equal(h.ui.battle,b);assert.equal(b.map,map);assert.deepEqual(enemy,enemyBefore);assert.deepEqual(battleReport(b),resources);
 assert.equal(h.ui.state.world.objectives.signal_route_ready,0);assert.equal(h.ui.state.world.objectives.signal_route_step,1);assert.equal(h.ui.busy,false);assert.equal(h.ui.paused,true);
 assert.match(h.modal.innerHTML,/저장을 확인해야 합니다/);assert.doesNotMatch(h.messages.join(' '),/접근로를 열었습니다|탐험 기록 저장/);
});

test('actual unknown signal object and out-of-range stale action do not turn into chest interactions or rewards',async()=>{
 const h=await browser(stage('decoded'));const before=copy(h.ui.state),revision=h.ui.controller.revision();
 await h.ui.showSignal('unknown-object');assert.equal(h.modal.hidden,true);await h.click('signal:unknown-object');assert.deepEqual(h.ui.state,before);assert.equal(h.ui.controller.revision(),revision);
 h.move(getRegion('signal_basin').spawn);await h.click('signal:signal-route-transmitter');assert.deepEqual(h.ui.state,before);assert.equal(h.ui.controller.revision(),revision);assert.ok(h.messages.some(message=>/가까이/.test(message)));assert.doesNotMatch(h.messages.join(' '),/탐험 기록 저장/);
});
