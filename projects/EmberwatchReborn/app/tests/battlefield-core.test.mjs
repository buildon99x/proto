import test from 'node:test';
import assert from 'node:assert/strict';
import {createState,reduceRuntime} from '../src/state.js';
import {reduceBattlefield,validateBattlefieldProgress,battlefieldEligible,battlefieldInputRevision,battlefieldPortalAllowed,invalidateBattlefieldInput} from '../src/battlefield.js';
import {BATTLEFIELD_REGION,BATTLEFIELD_REGIONS,BATTLEFIELD_GROUPS} from '../src/battlefield-content.js';
import {battlefieldObjectView,battlefieldGuidance,battlefieldElderView,battlefieldCommandFields,battlefieldPortalView,battlefieldEventCopy,battlefieldPresentationHints} from '../src/battlefield-presentation.js';
import {getRegion,FOES} from '../src/world.js';
import {createBattle,stepBattle} from '../src/combat.js';
import {experienceMultiplier} from '../src/progression.js';
import {createStore} from '../src/save.js';
import {earnedTombRoute} from './support/earned-tomb-route.mjs';
import {report,run,settle} from './support/earned-route.mjs';
// SYNTHETIC SETTLEMENT/LOCATION FIXTURES, NOT ORDINARY-INPUT PLAY.
// T XP, promotion, kills, rewards, death/retry and save use production handlers.
// B commands call the pure reducer directly. B travel is explicitly simulated
// here because campaign/state/controller/UI integration is parent-owned.
// No handler/path/AI/survival result is implied by scripted defeat reports.
const region=BATTLEFIELD_REGIONS[BATTLEFIELD_REGION],elder={x:450,y:325},copy=x=>structuredClone(x);
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const object=id=>region.objects.find(o=>o.id===id);
const quest=(s,type)=>({type,...report(s,elder),expectedRevision:battlefieldInputRevision(s)});
const interaction=(s,id)=>({type:'interactBattlefield',objectId:id,...report(s,object(id)),expectedRevision:battlefieldInputRevision(s)});
function bRun(s,c){const before=copy(s),command=copy(c),r=reduceBattlefield(freeze(s),freeze(c));assert.equal(r.ok,true,JSON.stringify(r));assert.deepEqual(s,before);assert.deepEqual(c,command);assert.equal(validateBattlefieldProgress(r.state).ok,true);return r;}
function reject(s,c,code){const before=copy(s),command=copy(c),r=reduceBattlefield(freeze(s),freeze(c));assert.equal(r.ok,false,JSON.stringify(r));if(code)assert.equal(r.code,code,JSON.stringify(r));assert.deepEqual(s,before);assert.deepEqual(c,command);return r;}
function promoted(difficulty='normal',options={}){let s=earnedTombRoute(difficulty,options);const r=reduceRuntime(s,{type:'promoteExpert',...report(s,{x:260,y:325}),expectedRevision:0,expectedGoldCost:120},{revision:0});assert.equal(r.ok,true,JSON.stringify(r));s=r.state;assert.equal(s.character.tier,'expert');assert.ok(s.world.claimedRewards.includes('r10:promote:expert'));return s;}
function syntheticTravel(s,id){const p=getRegion(s.world.region).portals.find(p=>p.id===id);assert.ok(p,id);assert.equal(battlefieldPortalAllowed(s,p).ok,true);const n=copy(s);assert.equal(invalidateBattlefieldInput(n).ok,true);n.world.region=p.to;n.world.position={...p.arrival};if(!n.world.visited.includes(p.to))n.world.visited.push(p.to);assert.equal(validateBattlefieldProgress(n).ok,true);return n;}
const accepted=(difficulty='normal',options={})=>{const s=promoted(difficulty,options);return bRun(s,quest(s,'acceptBattlefieldQuest')).state;};
const entered=(difficulty='normal',options={})=>syntheticTravel(accepted(difficulty,options),'town-battlefield-entry');
const act=(s,id)=>bRun(s,interaction(s,id)).state;
const device=(s,side)=>act(settle(s,BATTLEFIELD_GROUPS[side]),'battlefield-'+side+'-device');
function devices(order=['west','east']){let s=entered();for(const side of order)s=device(s,side);return s;}
const bossDown=()=>settle(devices(),BATTLEFIELD_GROUPS.boss);
const beacon=()=>act(bossDown(),'battlefield-beacon');
const finish=()=>{const s=syntheticTravel(beacon(),'battlefield-boss-return');return bRun(s,quest(s,'reportBattlefieldQuest')).state;};
function reload(s){const m=new Map(),store=createStore({getItem:key=>m.get(key)??null,setItem:(key,value)=>m.set(key,value)},{profile:'qa-r11-battlefield-module'});assert.equal(store.save(s,{expectedRevision:0}).ok,true);const r=store.load();assert.equal(r.ok,true);assert.deepEqual(r.state,s);assert.equal(validateBattlefieldProgress(r.state).ok,true);return r.state;}

test('B validator leaves untouched old states byte-identical and does not infer completion',()=>{const s=createState(),before=copy(s);assert.equal(validateBattlefieldProgress(freeze(s)).ok,true);assert.deepEqual(s,before);assert.equal(battlefieldEligible(s),false);assert.equal(battlefieldGuidance(s),null);});
test('synthetic B prerequisites: T report/level/commission cannot substitute for real Expert history',()=>{
 const s=earnedTombRoute();assert.equal(battlefieldEligible(s),false);reject(s,quest(s,'acceptBattlefieldQuest'),'EXPERT_REQUIRED');
 const expert=promoted();for(const edit of [n=>n.character.tier='adept',n=>n.world.claimedRewards=n.world.claimedRewards.filter(id=>id!=='r10:promote:expert'),n=>n.world.objectives.tomb_reported=0,n=>n.world.claimedRewards=n.world.claimedRewards.filter(id=>id!=='r10:t:report'),n=>n.world.objectives.tomb_sequence_solved=0]){const n=copy(expert);edit(n);assert.equal(reduceBattlefield(n,quest(n,'acceptBattlefieldQuest')).ok,false);}
 reject(expert,{...quest(expert,'acceptBattlefieldQuest'),position:{x:260,y:325}},'ELDER_REQUIRED');
 const n=copy(expert);n.character.tier='master';assert.equal(battlefieldEligible(n),false);
});
for(const full of [false,true])for(const difficulty of ['easy','normal','hard','serious'])for(const order of [['west','east'],['east','west']])test(`synthetic production B settlement ${full?'full':'minimum'} ${difficulty}, ${order.join('→')}: exact one-time budgets and Eda-only completion`,()=>{
 let s=entered(difficulty,{full}),before=copy(s);assert.equal(s.world.objectives.chapter_three_complete,0);
 for(const side of order){for(const id of BATTLEFIELD_GROUPS[side]){const prev=s,f=FOES[region.foes.find(e=>e.id===id).kind];s=settle(s,[id]);assert.equal(s.stats.earnedXp-prev.stats.earnedXp,f.xp*experienceMultiplier(prev.character.level,f.tier,difficulty));}
  const prev=s,r=bRun(s,interaction(s,'battlefield-'+side+'-device'));s=r.state;assert.equal(s.gold-prev.gold,35);assert.equal(s.stats.earnedXp-prev.stats.earnedXp,280);assert.deepEqual(s.vitals,prev.vitals);assert.equal(r.events.at(-1).mapChanged,side===order[1]);
 }
 assert.equal(s.world.objectives.battlefield_devices_ready,1);assert.equal(s.world.objectives.chapter_three_complete,0);s=settle(s,BATTLEFIELD_GROUPS.boss);assert.equal(s.world.objectives.battlefield_beacon_taken,0);
 s=act(s,'battlefield-beacon');assert.equal(s.world.objectives.chapter_three_complete,0);s=syntheticTravel(s,'battlefield-boss-return');
 reject(s,{...quest(s,'reportBattlefieldQuest'),position:{x:250,y:470}},'ELDER_REQUIRED');s=bRun(s,quest(s,'reportBattlefieldQuest')).state;
 assert.equal(s.world.objectives.chapter_three_complete,1);assert.equal(s.gold-before.gold,326);assert.equal(s.stats.kills-before.stats.kills,13);assert.equal(s.stats.earnedXp-before.stats.earnedXp,['hard','serious'].includes(difficulty)?1890:2220);
 for(const [id,n]of Object.entries({iron:6,wood:4,thread:4,ember_shard:4}))assert.equal(s.inventory.materials[id]-(before.inventory.materials[id]??0),n);
 assert.equal(s.inventory.consumables.health_potion-before.inventory.consumables.health_potion,2);assert.equal(s.inventory.tools.filter(x=>x==='battlefield_beacon').length,1);assert.deepEqual(s.reservedTrainingGold,{expert:0});assert.equal(s.character.tier,'expert');assert.equal(s.character.level,['hard','serious'].includes(difficulty)?17:18);reload(s);reject(s,quest(s,'reportBattlefieldQuest'),'ALREADY_CLAIMED');
});
test('synthetic B guards reject future boss kills, unpaid devices, early report and remote/forged commands',()=>{
 const s=entered();reject(s,interaction(s,'battlefield-west-device'),'WEST_GUARDS_ALIVE');reject(s,interaction(s,'battlefield-east-device'),'EAST_GUARDS_ALIVE');
 const r=reduceRuntime(s,{type:'settleCombat',defeated:BATTLEFIELD_GROUPS.boss,...report(s)});assert.equal(r.ok,false);
 reject(s,{...interaction(s,'battlefield-west-device'),position:region.spawn},'OBJECT_REQUIRED');reject(s,{...interaction(s,'battlefield-west-device'),objectId:'tomb-oath'},'UNKNOWN_OBJECT');
 const home=syntheticTravel(s,'battlefield-town-return');reject(home,quest(home,'reportBattlefieldQuest'),'BEACON_REQUIRED');
 assert.equal(battlefieldPortalAllowed(s,{gate:'battlefield_boss_return'}).code,'BOSS_REQUIRED');assert.equal(battlefieldPortalAllowed(s,{gate:'battlefield_fake'}).code,'UNKNOWN_GATE');
 for(const edit of [c=>delete c.recovery,c=>delete c.expectedRevision,c=>c.rewardId='r11:b:report',c=>c.expectedRevision=-1,c=>c.life=NaN,c=>c.vitals.hp=Infinity,c=>c.recovery.cooldowns.cheat=0,c=>c.position.x=-10]){const c=interaction(s,'battlefield-west-device');edit(c);assert.equal(reduceBattlefield(s,c).ok,false);}
});
test('synthetic B repeat/stale clicks and partial-device load/re-entry keep earned state without refill',()=>{
 let s=settle(entered(),BATTLEFIELD_GROUPS.west),command=interaction(s,'battlefield-west-device');s=bRun(s,command).state;reject(s,command,'STALE_REVISION');reject(s,interaction(s,'battlefield-west-device'),'ALREADY_CLAIMED');
 const checkpoint={...report(s),vitals:{hp:30,mana:7,stamina:9}};s=run(s,{type:'checkpoint',...checkpoint}).state;const prior=copy(s);s=reload(s);s=syntheticTravel(syntheticTravel(s,'battlefield-town-return'),'town-battlefield-entry');
 assert.deepEqual(s.vitals,prior.vitals);assert.deepEqual(s.recovery,prior.recovery);assert.deepEqual(s.world.defeated,prior.world.defeated);assert.equal(s.world.objectives.battlefield_west_ready,1);assert.equal(s.world.objectives.battlefield_east_ready,0);reject(s,command,'STALE_REVISION');
 const b=createBattle(s);assert.ok(b.enemies.every(e=>!BATTLEFIELD_GROUPS.west.includes(e.id)));assert.ok(b.enemies.every(e=>e.hp===e.max));assert.equal(b.p.hp,30);
});
test('synthetic B boss/hero simultaneous settlement pays once, dead load cannot claim beacon, explicit retry keeps progress',()=>{
 let s=devices(),previous=copy(s),stale=interaction(s,'battlefield-beacon');s=run(s,{type:'settleCombat',defeated:BATTLEFIELD_GROUPS.boss,...report(s),vitals:{...s.vitals,hp:0}}).state;
 assert.equal(s.stats.kills,previous.stats.kills+1);assert.equal(s.stats.deaths,previous.stats.deaths+1);assert.equal(s.world.objectives.battlefield_beacon_taken,0);reject(s,interaction(s,'battlefield-beacon'),'HERO_DOWN');
 s=reload(s);assert.equal(s.stats.deaths,previous.stats.deaths+1);s=run(s,{type:'retry'}).state;s=syntheticTravel(s,'town-battlefield-entry');reject(s,stale,'STALE_LIFE');s=act(s,'battlefield-beacon');assert.equal(s.world.claimedRewards.filter(id=>id==='r11:b:beacon').length,1);assert.equal(createBattle(s).enemies.length,0);
});
test('B bidirectional load validator rejects unknown/partial/forged progress and inaccessible boss receipts',()=>{
 const good=finish();for(const edit of [n=>delete n.world.objectives.battlefield_east_ready,n=>n.world.objectives.battlefield_fake=1,n=>n.world.objectives.chapter_three_complete=0,n=>n.world.objectives.battlefield_devices_ready=0,n=>n.world.claimedRewards.push('r11:b:fake'),n=>n.world.claimedRewards=n.world.claimedRewards.filter(id=>id!=='r11:b:west'),n=>n.inventory.tools=n.inventory.tools.filter(id=>id!=='battlefield_beacon'),n=>n.inventory.tools.push('battlefield_fake'),n=>n.world.defeated[BATTLEFIELD_REGION].pop(),n=>n.world.defeated[BATTLEFIELD_REGION].push('fake'),n=>n.world.objectives.battlefield_revision=1,n=>n.world.visited=n.world.visited.filter(id=>id!==BATTLEFIELD_REGION)]){const n=copy(good);edit(n);assert.equal(validateBattlefieldProgress(n).ok,false);}
 const n=copy(entered());n.world.defeated[BATTLEFIELD_REGION]=[...BATTLEFIELD_GROUPS.boss];assert.equal(validateBattlefieldProgress(n).ok,false);
});
test('B bounded ledgers fail atomically without truncation, extra supplies or revised progress',()=>{
 let s=settle(entered(),BATTLEFIELD_GROUPS.west);while(s.world.claimedRewards.length<4096)s.world.claimedRewards.push('fixture:'+s.world.claimedRewards.length);reject(s,interaction(s,'battlefield-west-device'),'RECEIPT_LIMIT');
 s=settle(entered(),BATTLEFIELD_GROUPS.west);s.inventory.materials.iron=Number.MAX_SAFE_INTEGER;reject(s,interaction(s,'battlefield-west-device'),'VALUE_OVERFLOW');
 s=bossDown();while(s.inventory.tools.length<100)s.inventory.tools.push('fixture-tool-'+s.inventory.tools.length);reject(s,interaction(s,'battlefield-beacon'),'VALUE_OVERFLOW');
 s=entered();s.world.objectives.battlefield_revision=Number.MAX_SAFE_INTEGER;reject(s,interaction(s,'battlefield-west-device'),'REVISION_LIMIT');const before=copy(s);assert.equal(invalidateBattlefieldInput(s).code,'REVISION_LIMIT');assert.deepEqual(s,before);
});
test('B pure presentation gives current orders, completed/reward/continuation truth and minimal command fields',()=>{
 const fresh=promoted(),elderView=battlefieldElderView(fresh);assert.equal(elderView.type,'acceptBattlefieldQuest');assert.deepEqual(battlefieldCommandFields(elderView),{type:'acceptBattlefieldQuest',expectedRevision:0});
 let s=entered();assert.equal(battlefieldObjectView(s,object('battlefield-west-device')).actions.length,0);s=device(s,'west');assert.equal(battlefieldObjectView(s,object('battlefield-west-device')).completed,true);assert.match(battlefieldGuidance(s).detail,/동쪽/);
 const done=finish(),before=copy(done);assert.equal(battlefieldElderView(done).action,null);assert.match(battlefieldGuidance(done).detail,/캠페인 전체 완료가 아닙니다/);assert.match(battlefieldEventCopy({type:'chapterThreeCompleted'}),/Master/);assert.deepEqual(done,before);
 assert.equal(battlefieldObjectView(done,{id:'fake',type:'battlefield'}).actions.length,0);assert.equal(battlefieldCommandFields({type:'interactBattlefield',objectId:'fake',expectedRevision:0}),null);
 const down=bossDown();assert.match(battlefieldPortalView(down,'battlefield-boss-return').name,/미회수/);assert.equal(battlefieldPortalView(down,'battlefield-boss-return').allowed,true);
 const hints=battlefieldPresentationHints();assert.equal(hints.foeLabels.battlefield_hexer.undead,true);assert.deepEqual(hints.foeLabels.battlefield_usurper.attackFamilies,['spell','weapon']);assert.match(hints.reentry,/원정 초기화나 반복 보상은 제공하지 않습니다/);
});

function battleWith(kind,skills=[]){
 let s=promoted();for(const skillId of skills)s=run(s,{type:'purchaseSkill',skillId,position:{x:260,y:325}}).state;
 s=bRun(s,quest(s,'acceptBattlefieldQuest')).state;s=syntheticTravel(s,'town-battlefield-entry');
 const b=createBattle(s),e=b.enemies.find(e=>e.kind===kind);assert.ok(e,kind);
 // Synthetic placement/isolation only; actual map, foe specs, HP, skills,
 // resources and attack AI remain production values and run normally.
 b.enemies=[e];b.awaitingAdvance=false;b.p.x=720;b.p.y=528;e.x=720;e.y=480;e.active=true;
 return {s,b,e};
}
function advance(f,predicate,max=250,input={}){const events=[];for(let i=0;!predicate()&&i<max;i++)events.push(...stepBattle(f.b,f.s.character,.02,input));assert.ok(predicate(),'bounded live handler fixture');return events;}
for(const [kind,status]of [['battlefield_revenant','disarm'],['battlefield_hexer','poison'],['battlefield_pyromancer','burn'],['battlefield_lancer','slow'],['battlefield_binder','silence'],['battlefield_bulwark','stun']])test(`synthetic isolated live B AI: authored ${kind} actually produces ${status}`,()=>{
 const f=battleWith(kind),events=advance(f,()=>!!f.b.p.negativeStatuses[status]);
 assert.ok(events.some(e=>e.type==='heroHurt'&&e.context.attackerId===f.e.id));assert.equal(f.b.p.negativeStatuses[status].ruleId,'r11_'+status);assert.equal(f.b.p.negativeStatuses[status].sourceId,f.e.id);assert.ok(f.b.p.hp<f.s.vitals.hp);
});
test('synthetic isolated live B AI poison is actually cleansed by a purchased heal, without altering earlier Tomb taxonomy',()=>{
 const f=battleWith('battlefield_hexer',['lay_on_hands','cleansing_touch']);advance(f,()=>!!f.b.p.negativeStatuses.poison);
 const mana=f.b.p.mana;assert.ok(stepBattle(f.b,f.s.character,0,{heal:true,aim:{x:720,y:480}}).some(e=>e.type==='actionStarted'));
 const events=advance(f,()=>!f.b.p.negativeStatuses.poison);assert.ok(events.some(e=>e.type==='heroStatusChanged'&&e.cleansed));assert.ok(f.b.p.mana<mana);assert.ok(f.b.p.cooldowns.lay_on_hands>17);
 for(const [kind,foe]of Object.entries(FOES))if(kind.startsWith('tomb_'))assert.equal(foe.tags?.includes('undead')??false,false);
});
test('synthetic isolated real heal burns only authored undead in a mixed B encounter',()=>{
 const f=battleWith('battlefield_revenant',['lay_on_hands','turn_undead']),livingSpec=region.foes.find(e=>e.kind==='battlefield_lancer'),row=FOES[livingSpec.kind];
 const living={...livingSpec,x:750,y:496,hp:row.hp,max:row.hp,angle:0,active:true,state:'idle',timer:0,stun:0,telegraph:null};f.b.enemies.push(living);
 stepBattle(f.b,f.s.character,0,{heal:true,aim:{x:720,y:480}});const events=advance(f,()=>f.e.hp===0);
 assert.equal(living.hp,living.max);assert.equal(events.filter(e=>e.type==='enemyHit'&&e.context.originSkillId==='lay_on_hands'&&e.id===f.e.id).length,1);assert.equal(events.filter(e=>e.type==='enemyHit'&&e.id===living.id).length,0);
});
test('synthetic isolated live B spell retains its owner and enables purchased Lawbringer rather than relying on ranged shape',()=>{
 const f=battleWith('battlefield_pyromancer',['lawbringer']);f.b.seed=1972; // Explicit deterministic combat-RNG fixture, not natural proc-frequency evidence.
 const events=advance(f,()=>!!f.e.silence);assert.ok(events.some(e=>e.type==='lawbringerRolled'&&e.success&&e.attackerId===f.e.id));assert.ok(f.e.disarm.remaining>0);assert.ok(f.e.silence.remaining>0);assert.ok(events.some(e=>e.type==='heroHurt'&&e.context.attackFamily==='spell'));
});
test('synthetic isolated live B boss alternates committed long spell line and broad weapon sweep, with real recovery',()=>{
 const s=devices(),b=createBattle(s),e=b.enemies.find(e=>e.id===BATTLEFIELD_GROUPS.boss[0]);b.enemies=[e];b.awaitingAdvance=false;b.p.x=480;b.p.y=224;e.active=true;
 const released=[];let maxRecovery=0;
 for(let i=0;i<400&&released.length<2;i++){const pattern=e.attackSpec?.id,events=stepBattle(b,s.character,.02,{});if(events.some(event=>event.type==='sound'&&event.name==='enemyRelease'))released.push(pattern);if(e.state==='recovery')maxRecovery=Math.max(maxRecovery,e.timer);}
 assert.deepEqual(released,['battlefield-usurper-fireline','battlefield-usurper-sweep']);assert.ok(maxRecovery>=1.5);assert.ok(b.p.hp>0);assert.equal(e.hp,e.max);
});
test('relocated town B entrance guidance names northern clearing, never old southeast gate stack',()=>{const s=accepted();assert.match(battlefieldGuidance(s).detail,/마을 북쪽 빈터의 봉화 전장 입구/);assert.doesNotMatch(battlefieldGuidance(s).detail,/남동쪽/);s.world.region='signal_tomb';assert.match(battlefieldGuidance(s).detail,/마을에 돌아간 뒤 북쪽 빈터의 봉화 전장 입구/);});
