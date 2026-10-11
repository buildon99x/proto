import test from 'node:test';
import assert from 'node:assert/strict';
import {createState,validateState,reduceRuntime} from '../src/state.js';
import {deriveStats} from '../src/warrior-growth.js';
import {experienceMultiplier,grantExperience} from '../src/progression.js';
import {WILDERNESS_REGION,WILDERNESS_GROUPS,WILDERNESS_FOES,WILDERNESS_REWARDS,WILDERNESS_RECEIPTS,WILDERNESS_SEQUENCE} from '../src/wilderness-content.js';
import {validateWildernessProgress,validateWildernessAncestry,reduceWilderness,reduceWildernessRuntime,wildernessEligible,wildernessClue,wildernessInputRevision,wildernessPortalAllowed,wildernessEncounterAllowed,invalidateWildernessInput} from '../src/wilderness.js';
import {W,elder,earnedBattlefield,stages,quest,interaction,object,wRun,wSettle,act,wTravel,travelCommand,report,copyRuntime,inheritRuntimeRevision,runtimeContext,storeRevision,retryCommand} from './support/earned-wilderness-route.mjs';
const copy=copyRuntime,freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const cached=new Map();function stage(mode='cover',difficulty='normal'){const key=mode+':'+difficulty;if(!cached.has(key))cached.set(key,stages(difficulty,mode));return copy(cached.get(key));}
function reject(s,c,code){const before=copy(s),request=copy(c);const r=reduceWildernessRuntime(freeze(s),freeze(c),runtimeContext(s));assert.equal(r.ok,false,JSON.stringify(r));if(code)assert.equal(r.code,code,JSON.stringify(r));assert.deepEqual(s,before);assert.deepEqual(c,request);return r;}
function serialize(s){const bytes=JSON.stringify(s),loaded=inheritRuntimeRevision(JSON.parse(bytes),s);assert.equal(validateWildernessProgress(loaded).ok,true);assert.equal(JSON.stringify(loaded),bytes);return loaded;}
const retained=(before,after,keys=['vitals','recovery','inventory','character','gold','stats'])=>keys.forEach(k=>assert.deepEqual(after[k],before[k],k));

test('untouched existing state gets no W defaults, rewards or eligibility',()=>{const s=createState(),before=copy(s);assert.deepEqual(validateWildernessProgress(freeze(s)),{ok:true});assert.equal(wildernessEligible(s),false);assert.equal(wildernessClue(s),null);assert.deepEqual(s,before);});
for(const difficulty of ['easy','normal','hard','serious'])for(const mode of ['cover','channel'])test(`real detached W handlers ${difficulty}/${mode}: five groups, exact budget, retained history and correct Eda report`,()=>{
 const all=stage(mode,difficulty),{before,accepted,finished}=all;retained(before,accepted);assert.equal(finished.stats.kills-before.stats.kills,21);assert.equal(finished.gold-before.gold,360);assert.equal(finished.stats.earnedXp-before.stats.earnedXp,['hard','serious'].includes(difficulty)?2660:3280);
 for(const [id,n]of Object.entries({iron:6,wood:4,thread:4,ember_shard:2}))assert.equal(finished.inventory.materials[id]-(before.inventory.materials[id]??0),n);
 assert.equal(finished.inventory.consumables.health_potion-before.inventory.consumables.health_potion,2);assert.equal(finished.world.objectives.wilderness_scouts_rescued,0);assert.equal(finished.world.objectives.wilderness_reported,1);assert.equal(finished.character.tier,'expert');assert.deepEqual(finished.reservedTrainingGold,before.reservedTrainingGold);assert.deepEqual(finished.character.skills,before.character.skills);assert.deepEqual(finished.character.attributes,before.character.attributes);assert.deepEqual(finished.character.equipment,before.character.equipment);assert.deepEqual(finished.actionSlots,before.actionSlots);
 assert.deepEqual(Object.fromEntries(Object.entries(finished.world.objectives).filter(([k])=>!k.startsWith('wilderness_')&&!['battlefield_revision','tomb_revision'].includes(k))),Object.fromEntries(Object.entries(before.world.objectives).filter(([k])=>!['battlefield_revision','tomb_revision'].includes(k))));
 for(const id of before.world.claimedRewards)assert.ok(finished.world.claimedRewards.includes(id));for(const [region,ids]of Object.entries(before.world.defeated))assert.deepEqual(finished.world.defeated[region],ids);
 assert.deepEqual(finished.world.claimedRewards.filter(id=>id.startsWith('r12:w')).sort(),WILDERNESS_RECEIPTS.filter(id=>id!=='r12:w:scouts').toSorted());serialize(finished);reject(finished,quest(finished,'reportWildernessQuest'),'ALREADY_CLAIMED');
 const result=wRun(all.home,quest(all.home,'reportWildernessQuest'));assert.deepEqual(result.events.find(e=>e.type==='wildernessReported'),{type:'wildernessReported',nextNpcId:'blacksmith',nextRegionImplemented:false});assert.deepEqual(result.state.vitals,all.home.vitals);
});

test('B report cannot be forged by level, incomplete beacon/report history, or wrong Eda location',()=>{
 const good=earnedBattlefield();for(const edit of [s=>s.character.tier='adept',s=>s.world.objectives.battlefield_reported=0,s=>s.world.objectives.chapter_three_complete=0,s=>s.world.claimedRewards=s.world.claimedRewards.filter(id=>id!=='r11:b:report'),s=>s.world.claimedRewards=s.world.claimedRewards.filter(id=>id!=='r10:promote:expert'),s=>s.inventory.tools=s.inventory.tools.filter(id=>id!=='battlefield_beacon'),s=>s.world.objectives.battlefield_west_ready=0,s=>s.world.defeated.beacon_battlefield.pop(),s=>s.world.objectives.tomb_sequence_solved=0]){const s=copy(good);edit(s);assert.equal(reduceWildernessRuntime(s,quest(s,'acceptWildernessQuest'),runtimeContext(s)).ok,false);}
 reject(good,{...quest(good,'acceptWildernessQuest'),position:{x:250,y:470}},'ELDER_REQUIRED');
 const accepted=stage().accepted;reject(accepted,quest(accepted,'acceptWildernessQuest'),'ALREADY_ACCEPTED');reject(accepted,quest(good,'acceptWildernessQuest'),'STALE_REVISION');
});

test('free hook pickup and explicit anchor are distinct and immediately open safe return without puzzle, boss or spending',()=>{
 const all=stage(),before=all.anchorGuards,hook=all.hook;retained(before,hook,['vitals','recovery','character','gold','stats']);assert.equal(hook.inventory.tools.filter(x=>x==='wilderness_hook').length,1);assert.equal(hook.world.objectives.wilderness_anchored,0);assert.equal(wildernessPortalAllowed(hook,{gate:'wilderness_anchor_return'}).code,'ANCHOR_REQUIRED');
 reject(before,interaction(before,'anchor'),'HOOK_REQUIRED');assert.equal(all.anchor.world.objectives.wilderness_calibrated,0);assert.equal(all.anchor.world.objectives.wilderness_keeper_open,0);let s=wTravel(all.anchor,'wilderness-anchor-return');s=wTravel(s,'town-wilderness-anchor');retained(all.anchor,s);assert.equal(s.world.objectives.wilderness_anchored,1);reject(s,interaction(s,'hook'),'ALREADY_CLAIMED');reject(s,interaction(s,'anchor'),'ALREADY_CLAIMED');
 const empty=copy(before);empty.gold=0;empty.stats.spentGold=empty.stats.earnedGold;empty.inventory.materials={};empty.inventory.consumables={};assert.equal(validateWildernessProgress(empty).ok,true);s=act(act(empty,'hook'),'anchor');assert.equal(s.gold,20);assert.ok(s.inventory.tools.includes('wilderness_hook'));
});

test('readable clue survives JSON round trip; wrong order resets only prefix, no XP/resource/tool loss or hidden timer',()=>{
 const all=stage(),initial=all.receiverGuards,first=all.prefix,clue=wildernessClue(first);assert.match(clue.text,/바람깃/);assert.equal(clue.sequenceText,'바람깃 → 돌무덤 → 잿불');assert.equal(clue.step,1);assert.deepEqual(wildernessClue(serialize(first)),clue);
 const wrong=wRun(first,interaction(first,'glyph-ember'));assert.equal(wrong.state.world.objectives.wilderness_sequence_step,0);retained(first,wrong.state);assert.match(wrong.events.find(e=>e.type==='wildernessSequenceChanged').reason,/진행 중인 입력만/);assert.equal(wrong.state.world.objectives.wilderness_revision,first.world.objectives.wilderness_revision+1);assert.deepEqual(wrong.state.world.claimedRewards,first.world.claimedRewards);
 reject(first,interaction(initial,'glyph-cairn'),'STALE_REVISION');reject(first,{...interaction(first,'glyph-cairn'),expectedStep:0},'STALE_STEP');let s=wrong.state;for(const glyph of WILDERNESS_SEQUENCE)s=act(serialize(s),'glyph-'+glyph);assert.equal(s.stats.earnedXp-first.stats.earnedXp,150);assert.deepEqual(s.vitals,first.vitals);reject(s,interaction(s,'glyph-ember'),'ALREADY_CLAIMED');
});

for(const mode of ['cover','channel'])test(`pre-encounter ${mode} choice costs nothing, permits all D guards once and cannot change after commitment`,()=>{
 const all=stage(mode),c=interaction(all.calibrated,'choice',{choice:mode});for(const id of WILDERNESS_GROUPS.relay)assert.equal(wildernessEncounterAllowed(all.calibrated,id).code,'ENCOUNTER_LOCKED');
 const r=wRun(all.calibrated,c);retained(all.calibrated,r.state);assert.equal(r.state.world.objectives.wilderness_mode,mode==='cover'?1:2);assert.equal(r.events.find(e=>e.type==='wildernessChanged').mapChanged,true);for(const id of WILDERNESS_GROUPS.relay)assert.equal(wildernessEncounterAllowed(r.state,id).ok,true);
 reject(r.state,c,'STALE_REVISION');reject(r.state,interaction(r.state,'choice',{choice:mode==='cover'?'channel':'cover'}),'ALREADY_CLAIMED');reject(r.state,interaction(r.state,'relay'),'GUARDS_ALIVE');
});

test('relic is explicit; immediate boss return is safe before relic, report remains blocked, no automatic reward',()=>{
 const all=stage();assert.equal(all.boss.inventory.tools.includes('wilderness_evidence'),false);assert.equal(all.boss.world.objectives.wilderness_evidence_taken,0);let s=wTravel(all.boss,'wilderness-keeper-return');retained(all.boss,s);reject(s,quest(s,'reportWildernessQuest'),'EVIDENCE_REQUIRED');s=wTravel(s,'town-wilderness-entry');s=act(s,'evidence');assert.equal(s.world.objectives.wilderness_reported,0);assert.equal(s.inventory.tools.filter(x=>x==='wilderness_evidence').length,1);reject(s,interaction(s,'evidence'),'ALREADY_CLAIMED');
 s=wTravel(s,'wilderness-keeper-return');for(const position of [{x:250,y:470},{x:260,y:325}])reject(s,{...quest(s,'reportWildernessQuest'),position},'ELDER_REQUIRED');
});
for(const postReport of [false,true])test(`optional scout rescue ${postReport?'after':'before'} Eda report never gates route and pays exactly once`,()=>{
 const all=stage(),before=postReport?all.finished:all.evidence;let s=postReport?wTravel(before,'town-wilderness-entry'):before;s=wSettle(s,'scouts');s=act(s,'scouts');assert.equal(s.stats.kills-before.stats.kills,4);assert.equal(s.stats.earnedXp-before.stats.earnedXp,640);assert.equal(s.gold-before.gold,84);assert.equal(s.inventory.materials.wood-before.inventory.materials.wood,2);assert.equal(s.inventory.materials.thread-before.inventory.materials.thread,2);assert.equal(s.inventory.consumables.health_potion-before.inventory.consumables.health_potion,1);reject(s,interaction(s,'scouts'),'ALREADY_CLAIMED');assert.equal(s.world.objectives.wilderness_reported,Number(postReport));
 if(!postReport){s=wTravel(s,'wilderness-keeper-return');s=wRun(s,quest(s,'reportWildernessQuest')).state;}assert.equal(s.world.objectives.wilderness_reported,1);assert.equal(s.world.objectives.wilderness_scouts_rescued,1);
});

test('depleted paid recovery survives objectives, wrong input, JSON re-entry and both return paths without healing',()=>{
 let s=stage().receiverGuards;const recovery={...copy(s.recovery),cooldowns:{shield_charge:2.5,righteous_hammer:3.25},lock:.4,manaDelay:.3,staminaDelay:.2,potionCooldown:1.5,combatRng:{state:42,draws:19}};
 s=wRun(s,{type:'checkpoint',...report(s),vitals:{hp:23,mana:5,stamina:7},recovery}).state;const before=copy(s);s=act(s,'glyph-wind');s=serialize(s);s=wTravel(s,'wilderness-anchor-return');s=wTravel(s,'town-wilderness-anchor');s=act(s,'glyph-ember');s=serialize(s);assert.deepEqual(s.vitals,before.vitals);assert.deepEqual(s.recovery,before.recovery);assert.deepEqual(s.world.defeated,before.world.defeated);assert.deepEqual(s.gold,before.gold);
});

test('simultaneous keeper kill and death settle once; explicit retry preserves clue, choice, paid cooldown/RNG and historical kills',()=>{
 let s=stage().approach;const stale=interaction(s,'evidence'),before=copy(s),c={type:'settleCombat',defeated:WILDERNESS_GROUPS.boss,...report(s),vitals:{hp:0,mana:4,stamina:6},recovery:{...copy(s.recovery),cooldowns:{shield_charge:2.5},combatRng:{state:99,draws:7}}};
 s=wRun(s,c).state;assert.equal(s.stats.earnedXp-before.stats.earnedXp,280);assert.equal(s.stats.kills-before.stats.kills,1);assert.equal(s.stats.deaths-before.stats.deaths,1);assert.equal(s.gold,before.gold+40-Math.floor((before.gold+40)*.05));assert.equal(s.world.objectives.wilderness_evidence_taken,0);const dead=serialize(s);reject(dead,c,'STALE_ENCOUNTER');reject(dead,interaction(dead,'evidence'),'HERO_DOWN');s=wRun(dead,retryCommand(dead)).state;assert.equal(s.world.life,before.world.life+1);assert.equal(s.stats.deaths,dead.stats.deaths);assert.equal(s.gold,dead.gold);assert.deepEqual(s.world.objectives,dead.world.objectives);assert.deepEqual(s.world.defeated,dead.world.defeated);assert.deepEqual(s.recovery.cooldowns,c.recovery.cooldowns);assert.deepEqual(s.recovery.combatRng,c.recovery.combatRng);reject(s,retryCommand(s),'NOT_DOWN');s=wTravel(s,'town-wilderness-entry');reject(s,stale,'STALE_LIFE');s=act(s,'evidence');assert.equal(s.world.claimedRewards.filter(x=>x==='r12:w:evidence').length,1);
});

test('per-foe settlement applies current-level Expert scaling at exact L30 crossing, with no batch-entry multiplier',()=>{
 // Explicit high-XP boundary fixture only, not an earned-route endpoint.
 let s=stage().entered;const cumulative=s.stats.earnedXp,gain=grantExperience(s.character,22600-cumulative-100);assert.equal(gain.ok,true);s.character=gain.character;s.stats.earnedXp=22500;assert.equal(s.character.level,29);assert.equal(validateWildernessProgress(s).ok,true);const before=copy(s);s=wSettle(s,'survey');assert.equal(s.stats.earnedXp-before.stats.earnedXp,220);assert.equal(s.character.level,30);assert.equal(s.stats.kills-before.stats.kills,3);assert.equal(s.gold-before.gold,18);
});

test('duplicate defeats are no-op rewards; locked, foreign, duplicated and invalid reports fail before mutation',()=>{
 const s=stage().surveyGuards,c={type:'settleCombat',defeated:WILDERNESS_GROUPS.survey,...report(s)};const result=wRun(s,c);retained(s,result.state);assert.deepEqual(s.world.defeated,result.state.world.defeated);
 reject(s,{...c,defeated:[WILDERNESS_GROUPS.boss[0]]},'ENCOUNTER_LOCKED');reject(s,{...c,defeated:['battlefield-usurper']},'UNKNOWN_ENEMY');reject(s,{...c,defeated:[c.defeated[0],c.defeated[0]]},'INVALID_REPORT');reject(s,{...c,life:s.world.life+1},'STALE_ENCOUNTER');
 for(const edit of [c=>c.vitals.hp=Infinity,c=>c.position.x=-1,c=>c.recovery.cooldowns.fake=2,c=>c.rewardId='r12:w:report',c=>delete c.recovery]){const bad=copy(c);edit(bad);assert.equal(reduceWildernessRuntime(s,bad,runtimeContext(s)).ok,false);}
});

test('all objective and ancestry histories fail closed on missing/reversed/forged relationships',()=>{
 const good=stage().finished;
 const edits=[s=>delete s.world.objectives.wilderness_hook_taken,s=>s.world.objectives.wilderness_fake=1,s=>s.world.objectives.wilderness_revision=1,s=>s.world.objectives.wilderness_mode=2,s=>s.world.objectives.wilderness_sequence_step=2,s=>s.world.objectives.wilderness_anchored=0,s=>s.world.objectives.wilderness_keeper_open=0,s=>s.world.claimedRewards.push('r12:w:fake'),s=>s.world.claimedRewards=s.world.claimedRewards.filter(x=>x!=='r12:w:anchor'),s=>s.inventory.tools=s.inventory.tools.filter(x=>x!=='wilderness_hook'),s=>s.inventory.tools.push('wilderness_fake'),s=>s.world.defeated[WILDERNESS_REGION].pop(),s=>s.world.defeated[WILDERNESS_REGION].push('forged'),s=>s.world.visited=s.world.visited.filter(x=>x!==WILDERNESS_REGION),s=>s.world.objectives.battlefield_reported=0,s=>s.world.claimedRewards=s.world.claimedRewards.filter(x=>x!=='r10:t:report'),s=>s.gold++,s=>s.version=3,s=>s.character.tier='master'];
 for(const edit of edits){const s=copy(good);edit(s);assert.equal(validateWildernessProgress(s).ok,false,edit.toString());}
 const forged=stage().calibrated;forged.world.defeated[WILDERNESS_REGION].push(WILDERNESS_GROUPS.relay[0]);assert.equal(validateWildernessProgress(forged).ok,false);
});

test('registered ancestry validates real W position/pools/visited/life without location projection',()=>{
 const good=stage().prefix;assert.equal(validateWildernessAncestry(good).ok,true);const before=copy(good);assert.deepEqual(good,before);
 for(const edit of [s=>s.world.position={x:0,y:0},s=>s.world.position={x:0,y:0,z:0},s=>s.world.position.x=NaN,s=>s.world.region='fake_wilderness',s=>s.world.visited=s.world.visited.filter(x=>x===WILDERNESS_REGION),s=>s.world.visited=s.world.visited.filter(x=>x!==WILDERNESS_REGION),s=>s.world.life=-1,s=>s.world.lifeDown=true,s=>s.vitals.hp=0,s=>s.vitals.mana=Infinity,s=>s.vitals.stamina=deriveStats(s.character,s).stats.staminaMax+1,s=>s.recovery.cooldowns.fake=1,s=>s.world.objectives.battlefield_east_ready=0]){const s=copy(good);edit(s);assert.equal(validateWildernessAncestry(s).ok,false,edit.toString());assert.equal(validateWildernessProgress(s).ok,false);}
 assert.equal(validateState(good).ok,true,'registered shared validator accepts the complete W history');assert.equal(reduceRuntime(good,{type:'checkpoint',...report(good)},runtimeContext(good)).ok,true,'registered runtime uses the captured trusted epoch');
});

test('stale revision, far/wall-bound/foreign interactions and unknown gates cannot grant rewards',()=>{
 const all=stage(),s=all.surveyGuards;reject(s,{...interaction(s,'tablet'),expectedRevision:wildernessInputRevision(s)-1},'STALE_REVISION');reject(s,{...interaction(s,'tablet'),position:W.spawn},'OBJECT_REQUIRED');reject(s,{...interaction(s,'tablet'),objectId:'battlefield-beacon'},'UNKNOWN_OBJECT');assert.equal(wildernessPortalAllowed(s,{gate:'wilderness_fake'}).code,'UNKNOWN_GATE');
 for(const edit of [c=>c.expectedRevision=-1,c=>c.expectedRevision=NaN,c=>delete c.expectedRevision,c=>c.life=-1,c=>c.recovery=null,c=>c.gold=100,c=>c.position.x=Infinity]){const bad=interaction(s,'tablet');edit(bad);assert.equal(reduceWildernessRuntime(s,bad,runtimeContext(s)).ok,false);}
 const rev=wildernessInputRevision(all.prefix);let moved=wTravel(all.prefix,'wilderness-anchor-return');moved=wTravel(moved,'town-wilderness-anchor');assert.equal(wildernessInputRevision(moved),rev+2);reject(moved,interaction(all.prefix,'glyph-cairn'),'STALE_REVISION');
});

test('overflow and bounded ledgers reject atomically without clearing old records',()=>{
 let s=stage().surveyGuards;while(s.world.claimedRewards.length<4096)s.world.claimedRewards.push('fixture:'+s.world.claimedRewards.length);reject(s,interaction(s,'tablet'),'RECEIPT_LIMIT');
 s=stage().surveyGuards;s.inventory.materials.wood=Number.MAX_SAFE_INTEGER;reject(s,interaction(s,'tablet'),'VALUE_OVERFLOW');
 s=stage().anchorGuards;while(s.inventory.tools.length<100)s.inventory.tools.push('fixture-tool-'+s.inventory.tools.length);reject(s,interaction(s,'hook'),'VALUE_OVERFLOW');
 s=stage().entered;s.world.objectives.wilderness_revision=Number.MAX_SAFE_INTEGER;reject(s,interaction(s,'tablet'),'REVISION_LIMIT');reject(s,travelCommand(s,'wilderness-town-return'),'REVISION_LIMIT');const before=copy(s);assert.equal(invalidateWildernessInput(s).code,'REVISION_LIMIT');assert.deepEqual(s,before);
});

test('receipt/kill tables implement only combat-weighted W, no minimum-envelope second reward layer',()=>{
 assert.deepEqual(['survey','anchor','receiver','relay','approach'].map(g=>WILDERNESS_GROUPS[g].length),[3,4,5,4,4]);assert.equal(WILDERNESS_GROUPS.boss.length,1);assert.equal(Object.values(WILDERNESS_REWARDS).filter(x=>x!==WILDERNESS_REWARDS['r12:w:scouts']).reduce((n,r)=>n+r.xp,0),800);for(const [id,f]of Object.entries(WILDERNESS_FOES)){assert.equal(f.tier,'expert');assert.equal(f.xp,id==='wilderness_keeper'?280:110);assert.equal(f.gold,id==='wilderness_keeper'?40:6);}assert.equal(experienceMultiplier(29,'expert','hard'),.75);assert.equal(experienceMultiplier(30,'expert','hard'),.375);
});

test('malformed JSON/accessors, foreign permanent histories and recovery cannot be projected into valid W progress',()=>{
 const good=stage().prefix;let calls=0;const accessor=copy(good);Object.defineProperty(accessor.world,'position',{enumerable:true,get(){calls++;throw Error('must not run');}});assert.equal(validateWildernessProgress(accessor).ok,false);assert.equal(validateWildernessAncestry(accessor).ok,false);assert.equal(calls,0);
 for(const edit of [s=>s.world.defeated.fake_region=[],s=>s.world.defeated.ash_road.push('forged-ancestor-foe'),s=>s.world.objectives.unowned='fake',s=>s.inventory.tools.push(s.inventory.tools[0]),s=>s.world.claimedRewards.push(s.world.claimedRewards[0]),s=>s.world.position=Object.assign(Object.create({x:100}),{y:100}),s=>s.world.life=Number.MAX_SAFE_INTEGER+1,s=>s.world[Symbol('hidden')]=1,s=>s.self=s]){const s=copy(good);edit(s);assert.equal(validateWildernessProgress(s).ok,false,edit.toString());}
 const bad=interaction(good,'glyph-cairn');Object.defineProperty(bad,'choice',{enumerable:true,get(){calls++;return 'cover';}});assert.equal(reduceWildernessRuntime(good,bad,runtimeContext(good)).ok,false);assert.equal(calls,0);
});

test('every ancestor-owned validator runs explicitly, including Dungeon and corrupted optional store history',()=>{
 const good=stage().surveyGuards;
 for(const edit of [s=>s.world.objectives.sluice_sequence_solved=0,s=>s.world.objectives.sluice_rune_step=2,s=>s.inventory.tools=s.inventory.tools.filter(x=>x!=='sluice_crank'),s=>s.world.claimedRewards=s.world.claimedRewards.filter(x=>x!=='r4:sequence'),s=>s.world.claimedRewards.push('r4:store'),s=>{s.world.objectives.sluice_store_open=0;s.world.objectives.sluice_drain_mode=2;},s=>s.world.objectives.quarry_tool_found=0,s=>s.world.objectives.pass_reported=0,s=>s.world.objectives.signal_reported=0,s=>s.world.objectives.furnace_reported=0,s=>s.world.objectives.tomb_reported=0,s=>s.world.objectives.battlefield_reported=0]){
  const s=copy(good);edit(s);
  assert.equal(validateWildernessAncestry(s).ok,false,edit.toString());assert.equal(validateWildernessProgress(s).ok,false,edit.toString());reject(s,interaction(s,'tablet'),'INVALID_WILDERNESS_STATE');
 }
});

test('captured tablet cannot restore resources, paid cooldowns or RNG after a newer same-life checkpoint',()=>{
 const s=stage().surveyGuards,old=interaction(s,'tablet'),before=copy(s);
 const hurt=wRun(s,{type:'checkpoint',...report(s),vitals:{hp:1,mana:1,stamina:1},recovery:{...copy(s.recovery),cooldowns:{shield_charge:2.5},combatRng:{state:99,draws:20}}}).state;
 assert.equal(wildernessInputRevision(hurt),wildernessInputRevision(s));assert.equal(storeRevision(hurt),storeRevision(s)+1);reject(hurt,old,'STALE_STORE_REVISION');
 // A caller must not be able to bypass the committed-pool boundary by merely
 // refreshing an old command's stamp around stale values.
 reject(hurt,{...old,expectedStoreRevision:storeRevision(hurt)},'REPORT_NOT_COMMITTED');
 const fresh=wRun(hurt,interaction(hurt,'tablet')).state;assert.deepEqual(fresh.vitals,{hp:1,mana:1,stamina:1});assert.deepEqual(fresh.recovery,hurt.recovery);assert.equal(fresh.stats.earnedXp-before.stats.earnedXp,100);assert.equal(fresh.world.claimedRewards.filter(x=>x==='r12:w:survey').length,1);
});

test('reverse freshness: older checkpoint cannot rewind a newer objective or overwrite a newer paid checkpoint',()=>{
 const s=stage().surveyGuards,old={type:'checkpoint',...report(s)},current=wRun(s,interaction(s,'tablet')).state;reject(current,old,'STALE_STORE_REVISION');
 const prior={type:'checkpoint',...report(current),vitals:{hp:9,mana:8,stamina:7}},newer=wRun(current,{type:'checkpoint',...report(current),vitals:{hp:3,mana:2,stamina:1},recovery:{...copy(current.recovery),cooldowns:{shield_charge:2},combatRng:{state:101,draws:22}}}).state;
 reject(newer,prior,'STALE_STORE_REVISION');assert.equal(newer.world.objectives.wilderness_surveyed,1);assert.deepEqual(newer.vitals,{hp:3,mana:2,stamina:1});
 // A genuinely new live checkpoint is allowed to report changed pools. The
 // exact-pool check belongs to objective rewards, not live combat snapshots.
 const live=wRun(newer,{type:'checkpoint',...report(newer),vitals:{hp:2,mana:1,stamina:1}}).state;assert.equal(live.vitals.hp,2);assert.equal(live.world.objectives.wilderness_surveyed,1);
});
for(const type of ['checkpoint','settleCombat','travel'])test(`captured ${type} snapshots reject newer store epochs independently of unchanged W puzzle revision`,()=>{
 const s=stage().survey,c=type==='travel'?travelCommand(s,'wilderness-town-return'):{type,...report(s),...(type==='settleCombat'?{defeated:WILDERNESS_GROUPS.anchor}:{})};
 const changed=wRun(s,{type:'checkpoint',...report(s),vitals:{hp:2,mana:2,stamina:2},recovery:{...copy(s.recovery),cooldowns:{shield_charge:2.5},combatRng:{state:77,draws:13}}}).state;
 assert.equal(wildernessInputRevision(changed),wildernessInputRevision(s));reject(changed,c,'STALE_STORE_REVISION');
});

test('objective rewards require exact committed pools and recovery even at the current store epoch',()=>{
 const s=stage().surveyGuards;for(const edit of [c=>c.vitals.hp--,c=>c.vitals.mana--,c=>c.vitals.stamina--,c=>c.recovery.cooldowns.shield_charge=2.5,c=>c.recovery.combatRng={state:99,draws:20}]){const c=interaction(s,'tablet');edit(c);reject(s,c,'REPORT_NOT_COMMITTED');}
 const c=interaction(s,'tablet');c.recovery=Object.fromEntries(Object.entries(c.recovery).reverse());const result=wRun(s,c);assert.deepEqual(result.state.vitals,s.vitals);assert.deepEqual(result.state.recovery,s.recovery);
});

test('required trusted store context cannot come from command data, W objective token, or an omitted default',()=>{
 const s=stage().surveyGuards,c=interaction(s,'tablet');for(const fn of [reduceWilderness,reduceWildernessRuntime]){
  for(const context of [undefined,null,{revision:-1},{revision:'2'},{revision:storeRevision(s),untrusted:true}])assert.equal(fn(s,c,context).ok,false);
  assert.equal(fn(s,c,{revision:storeRevision(s)+1}).code,'STALE_STORE_REVISION');
  const missing=copy(c);delete missing.expectedStoreRevision;assert.equal(fn(s,missing,runtimeContext(s)).ok,false);
  assert.equal(fn(s,{...c,context:runtimeContext(s)},runtimeContext(s)).ok,false);
 }
});

test('corrupt optional rescue flags, receipts, prerequisites or defeat history cannot be rewarded again',()=>{
 let rescued=wSettle(stage().evidence,'scouts');rescued=act(rescued,'scouts');
 for(const edit of [s=>s.world.objectives.wilderness_scouts_rescued=0,s=>s.world.claimedRewards=s.world.claimedRewards.filter(x=>x!=='r12:w:scouts'),s=>s.world.objectives.wilderness_evidence_taken=0,s=>s.inventory.tools=s.inventory.tools.filter(x=>x!=='wilderness_evidence'),s=>s.world.defeated[WILDERNESS_REGION]=s.world.defeated[WILDERNESS_REGION].filter(x=>x!==WILDERNESS_GROUPS.scouts[0])]){const bad=copy(rescued);edit(bad);assert.equal(validateWildernessProgress(bad).ok,false);reject(bad,interaction(bad,'scouts'),'INVALID_WILDERNESS_STATE');}
 const before=stage().evidence;before.world.objectives.wilderness_scouts_rescued=1;before.world.claimedRewards.push('r12:w:scouts');assert.equal(validateWildernessProgress(before).ok,false);
});

test('already-settled kill report cannot replay pre-level-up pools or later paid recovery under the old epoch',()=>{
 const s=stage().entered,c={type:'settleCombat',defeated:WILDERNESS_GROUPS.survey,...report(s),vitals:{hp:10,mana:10,stamina:10}},settled=wRun(s,c).state;
 assert.ok(settled.character.level>s.character.level);assert.ok(settled.vitals.hp>10);assert.equal(settled.stats.kills-s.stats.kills,3);reject(settled,c,'STALE_STORE_REVISION');
 const replay={type:'settleCombat',defeated:WILDERNESS_GROUPS.survey,...report(settled)},paid=wRun(settled,{type:'checkpoint',...report(settled),vitals:{hp:2,mana:1,stamina:1},recovery:{...copy(settled.recovery),cooldowns:{shield_charge:2.5},combatRng:{state:123,draws:30}}}).state;
 reject(paid,replay,'STALE_STORE_REVISION');assert.deepEqual(paid.recovery.cooldowns,{shield_charge:2.5});assert.deepEqual(paid.recovery.combatRng,{state:123,draws:30});assert.equal(paid.stats.earnedXp,settled.stats.earnedXp);
});
