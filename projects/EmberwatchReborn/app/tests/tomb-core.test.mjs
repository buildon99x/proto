import test from 'node:test';
import assert from 'node:assert/strict';
import {createState,reduceRuntime,validateState,migrateState} from '../src/state.js';
import {TOMB_REGION,TOMB_REGIONS,TOMB_FOES,TOMB_GROUPS,TOMB_LINKS,TOMB_REWARDS,TOMB_PROGRESS_DEFAULTS,TOMB_RECEIPTS,TOMB_SEQUENCE,TOMB_BOSS_PHASES} from '../src/tomb-content.js';
import {TOMB_COMMANDS,reduceTomb,validateTombProgress,tombPortalAllowed,tombTierAllowed,tombMap,tombWardCarried,tombInputRevision,invalidateTombInput} from '../src/tomb.js';
import {getRegion,createMap,inMap,lineOfSight,FOES} from '../src/world.js';
import {createBattle} from '../src/combat.js';
import {experienceMultiplier,xpForLevel} from '../src/progression.js';
import {createStore,createSession} from '../src/save.js';
import {createController} from '../src/controller.js';
import {earnedFurnaceRoute} from './support/earned-furnace-route.mjs';
import {report,run,travel,settle} from './support/earned-route.mjs';

// These tests execute production reducers/controller/save with SCRIPTED
// positions and defeat reports. They are not earned ordinary-input combat,
// boss phase observation, screenshots, survival, duration or fun acceptance.
// The named corruption/overflow fixtures intentionally edit invalid snapshots.
const copy=x=>structuredClone(x),freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const region=TOMB_REGIONS[TOMB_REGION],elder={x:450,y:325},point=id=>region.objects.find(o=>o.id===id);
const quest=(s,type)=>({type,...report(s,elder),expectedRevision:tombInputRevision(s)});
const at=(s,id)=>{const object=point(id);return {type:'interactTomb',objectId:id,...report(s,object),expectedRevision:tombInputRevision(s),...(object.actionKind==='glyph'?{glyph:object.glyph,expectedStep:s.world.objectives.tomb_sequence_step}:{})};};
const act=(s,id)=>run(s,at(s,id)).state;
const accepted=(difficulty='normal',options={})=>{const s=earnedFurnaceRoute(difficulty,options);return run(s,quest(s,'acceptTombQuest')).state;};
const enter=(difficulty='normal',options={})=>travel(accepted(difficulty,options),'town-tomb-entry');
const readyDecode=(difficulty='normal',options={})=>settle(enter(difficulty,options),TOMB_GROUPS.entry);
const decoded=(difficulty='normal',options={})=>act(readyDecode(difficulty,options),'tomb-projection');
const readySequence=(difficulty='normal',options={})=>settle(decoded(difficulty,options),TOMB_GROUPS.inscription);
function sequenced(difficulty='normal',options={}){let s=readySequence(difficulty,options);for(const id of ['tomb-glyph-crescent','tomb-glyph-split-beam','tomb-glyph-ember'])s=act(s,id);return s;}
const taken=(difficulty='normal',options={})=>act(sequenced(difficulty,options),'tomb-ward-origin');
const midpoint=(difficulty='normal',options={})=>act(settle(taken(difficulty,options),TOMB_GROUPS.ward_lower),'tomb-ward-midpoint');
const sealed=(difficulty='normal',options={})=>act(settle(midpoint(difficulty,options),TOMB_GROUPS.ward_upper),'tomb-ward-final');
const bossDown=(difficulty='normal',options={})=>settle(sealed(difficulty,options),TOMB_GROUPS.boss);
const oathTaken=(difficulty='normal',options={})=>act(bossDown(difficulty,options),'tomb-oath');
function finished(difficulty='normal',options={}){const s=travel(oathTaken(difficulty,options),'tomb-boss-return');return run(s,quest(s,'reportTombQuest')).state;}
function rejected(s,c,code,{direct=false}={}){const before=copy(s),request=copy(c),r=(direct?reduceTomb:reduceRuntime)(freeze(s),freeze(c));assert.equal(r.ok,false,JSON.stringify(r));if(code)assert.equal(r.code,code,JSON.stringify(r));assert.deepEqual(s,before);assert.deepEqual(c,request);return r;}
const cumulative=c=>Array.from({length:c.level-1},(_,i)=>xpForLevel(i+1)).reduce((a,b)=>a+b,0)+c.xp;
const memory=()=>{const data=new Map();return {data,getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};};
const locked={request:async(_key,_options,fn)=>fn()};
function reload(s,profile='qa-tomb-core'){const store=createStore(memory(),{profile});assert.equal(store.save(s,{expectedRevision:0}).ok,true);const loaded=store.load();assert.equal(loaded.ok,true);assert.deepEqual(loaded.state,s);return loaded.state;}

test('T authored content fixes all 19 rewards, 4 chambers, durable tools and phase-selector contract',()=>{
 assert.equal(region.foes.length,19);assert.equal(new Set(region.foes.map(f=>f.id)).size,19);
 assert.equal(region.foes.reduce((n,f)=>n+TOMB_FOES[f.kind].xp,0),960);assert.equal(region.foes.reduce((n,f)=>n+TOMB_FOES[f.kind].gold,0),144);
 assert.equal(Object.values(TOMB_REWARDS).reduce((n,r)=>n+r.xp,0),480);assert.equal(Object.values(TOMB_REWARDS).reduce((n,r)=>n+r.gold,0),160);
 assert.deepEqual(TOMB_SEQUENCE,['crescent','split_beam','ember']);assert.equal(TOMB_RECEIPTS.length,9);
 assert.equal(TOMB_FOES.tomb_oathkeeper.hp,210);assert.deepEqual(TOMB_FOES.tomb_oathkeeper.patternPhases,TOMB_BOSS_PHASES);
 assert.deepEqual(TOMB_BOSS_PHASES[1].patternIds,['tomb-oath-needle','tomb-oath-broken','tomb-oath-pulse']);
 assert.equal(TOMB_FOES.tomb_oathkeeper.patterns[2].travelRange,320);
 assert.ok(Object.values(TOMB_FOES).every(f=>f.tier==='adept'&&!f.fireAreaEscape));
 assert.throws(()=>TOMB_REWARDS['r10:t:report'].gold=999,TypeError);
});
test('untouched old states remain read-only without inferred T flags/reservation',()=>{
 for(const s of [createState(),earnedFurnaceRoute()]){const before=copy(s);assert.equal(validateTombProgress(freeze(s)).ok,true);assert.deepEqual(s,before);assert.equal('reservedTrainingGold' in s,false);assert.equal(Object.keys(migrateState(s).world.objectives).some(k=>k.startsWith('tomb_')),false);}
});
test('T core acceptance validates actual predecessor and Eda and atomically creates complete defaults',()=>{
 const s=earnedFurnaceRoute(),r=reduceTomb(freeze(s),freeze(quest(s,'acceptTombQuest')));assert.equal(r.ok,true,JSON.stringify(r));
 assert.deepEqual(Object.fromEntries(Object.keys(TOMB_PROGRESS_DEFAULTS).map(k=>[k,r.state.world.objectives[k]])),TOMB_PROGRESS_DEFAULTS);
 assert.deepEqual(r.state.reservedTrainingGold,{expert:0});assert.equal(r.state.gold,s.gold);assert.equal(r.state.stats.earnedXp,s.stats.earnedXp);assert.deepEqual(r.state.vitals,s.vitals);assert.deepEqual(r.state.recovery,s.recovery);
 rejected(s,{...quest(s,'acceptTombQuest'),position:{x:250,y:470}},'ELDER_REQUIRED',{direct:true});
 rejected(s,{...quest(s,'acceptTombQuest'),life:s.world.life+1},'STALE_LIFE',{direct:true});
 rejected(s,{...quest(s,'acceptTombQuest'),expectedRevision:1},'STALE_REVISION',{direct:true});
 for(const edit of [n=>n.world.claimedRewards=n.world.claimedRewards.filter(id=>id!=='r9:f:report'),n=>n.inventory.tools=n.inventory.tools.filter(id=>id!=='furnace_lens'),n=>n.world.objectives.furnace_reported=0]){const n=copy(s);edit(n);rejected(n,quest(n,'acceptTombQuest'),'ADEPT_REQUIRED',{direct:true});}
 assert.equal(tombTierAllowed('adept'),true);assert.equal(tombTierAllowed('expert'),true);assert.equal(tombTierAllowed('master'),false);
});
test('T uses production registration, world/geometry and real live-enemy initialization',()=>{
 assert.equal(getRegion(TOMB_REGION),region);assert.equal(FOES.tomb_blade,TOMB_FOES.tomb_blade);assert.deepEqual([...TOMB_COMMANDS],['acceptTombQuest','interactTomb','reportTombQuest']);
 for(const p of TOMB_LINKS.ash_hamlet)assert.ok(getRegion('ash_hamlet').portals.some(q=>p.id===q.id));
 const s=enter();assert.equal(validateState(s).ok,true);assert.deepEqual(createMap(TOMB_REGION,s),tombMap(s));assert.equal(createBattle(s).enemies.length,19);
});

for(const difficulty of ['easy','normal','hard','serious'])for(const full of [false,true])for(const mode of ['cover','channel'])for(const shortcut of [false,true])test(`scripted production T route ${difficulty}/${full?'full':'minimum'}/${mode}/stair-${shortcut?'open':'skip'} checks each actual grant`,()=>{
 const before=earnedFurnaceRoute(difficulty,{full,mode});let s=travel(run(before,quest(before,'acceptTombQuest')).state,'town-tomb-entry');
 const killGroup=group=>{for(const id of TOMB_GROUPS[group]){const foe=region.foes.find(f=>f.id===id),row=TOMB_FOES[foe.kind],xp=row.xp*experienceMultiplier(s.character.level,row.tier,difficulty),old=s;s=settle(s,[id]);assert.equal(s.stats.earnedXp-old.stats.earnedXp,xp,id);assert.equal(s.gold-old.gold,row.gold,id);}};
 const objective=(id,rewardId)=>{const old=s,r=run(s,at(s,id));s=r.state;const reward=TOMB_REWARDS[rewardId];assert.equal(s.stats.earnedXp-old.stats.earnedXp,reward.xp);assert.equal(s.gold-old.gold,reward.gold);assert.deepEqual(s.vitals,old.vitals);assert.equal(s.world.claimedRewards.filter(x=>x===rewardId).length,1);};
 killGroup('entry');objective('tomb-projection','r10:t:decode');
 if(shortcut){s=act(s,'tomb-shortcut');s=travel(s,'tomb-town-shortcut');s=travel(s,'town-tomb-shortcut');}
 killGroup('inscription');s=act(s,'tomb-glyph-crescent');s=act(s,'tomb-glyph-split-beam');objective('tomb-glyph-ember','r10:t:sequence');
 s=act(s,'tomb-ward-origin');assert.equal(tombWardCarried(s),true);killGroup('ward_lower');s=act(s,'tomb-ward-midpoint');assert.equal(tombWardCarried(s),true);
 killGroup('ward_upper');objective('tomb-ward-final','r10:t:ward');assert.equal(tombWardCarried(s),false);killGroup('boss');
 assert.equal(s.world.objectives.tomb_oath_taken,0);assert.equal(s.inventory.tools.includes('tomb_oath'),false);
 if(!full&&['hard','serious'].includes(difficulty)){assert.equal(s.character.level,14);assert.equal(cumulative(s.character),5369.5);}
 const preOath=s;s=act(s,'tomb-oath');assert.equal(s.gold,preOath.gold);assert.equal(s.stats.earnedXp,preOath.stats.earnedXp);
 s=travel(s,shortcut?'tomb-town-shortcut':'tomb-town-return');const preReport=s;s=run(s,quest(s,'reportTombQuest')).state;
 assert.equal(s.stats.earnedXp-preReport.stats.earnedXp,140);assert.equal(s.gold-preReport.gold,120);assert.deepEqual(s.vitals,preReport.vitals);
 assert.equal(s.gold-before.gold,304);assert.equal(s.stats.kills-before.stats.kills,19);assert.equal(s.character.tier,'adept');assert.equal(s.world.objectives.expert_commission,1);assert.deepEqual(s.reservedTrainingGold,{expert:120});
 const expected=['hard','serious'].includes(difficulty)?(full?5715.125:5509.5):(full?6365.5:6191);assert.equal(cumulative(s.character),expected);
 for(const [id,amount] of Object.entries({iron:4,wood:2,thread:3,ember_shard:2}))assert.equal(s.inventory.materials[id]-(before.inventory.materials[id]??0),amount);
 assert.equal(s.inventory.consumables.health_potion-before.inventory.consumables.health_potion,1);assert.ok(['signal_cipher','furnace_lens','tomb_oath'].every(id=>s.inventory.tools.includes(id)));
 assert.equal(s.world.objectives.tomb_shortcut_open,Number(shortcut));assert.equal(validateState(reload(s)).ok,true);
});

test('fresh wrong glyph only resets prefix; duplicate/stale/forged glyphs cannot reset newer progress',()=>{
 let s=readySequence();const original=s,first=at(s,'tomb-glyph-crescent');s=run(s,first).state;
 rejected(s,first,'STALE_REVISION');assert.equal(s.world.objectives.tomb_sequence_step,1);
 rejected(s,{...at(s,'tomb-glyph-ember'),expectedStep:0},'STALE_STEP');rejected(s,{...at(s,'tomb-glyph-crescent'),glyph:'split_beam'},'INVALID_COMMAND');
 const r=run(s,at(s,'tomb-glyph-ember'));s=r.state;assert.equal(s.world.objectives.tomb_sequence_step,0);assert.equal(r.events.find(e=>e.type==='tombSequenceReset').expectedGlyph,'split_beam');
 for(const k of ['gold','stats','character','inventory','vitals','recovery'])assert.deepEqual(s[k],original[k]);
 const revision=s.world.objectives.tomb_revision;s=run(s,at(s,'tomb-glyph-ember')).state;assert.equal(s.world.objectives.tomb_sequence_step,0);assert.equal(s.world.objectives.tomb_revision,revision+1);
});
test('partial glyph progress survives real save, travel and death/retry without replaying rewards',()=>{
 let s=act(readySequence(),'tomb-glyph-crescent'),stale=at(s,'tomb-glyph-split-beam');s=reload(s);assert.equal(s.world.objectives.tomb_sequence_step,1);
 s=travel(s,'tomb-town-return');s=travel(s,'town-tomb-entry');rejected(s,stale,'STALE_REVISION');
 const killed=[...s.world.defeated[TOMB_REGION]];s=run(s,{type:'settleCombat',defeated:[],...report(s),vitals:{...s.vitals,hp:0}}).state;
 rejected(s,at(s,'tomb-glyph-split-beam'),'HERO_DOWN');s=reload(s);s=run(s,{type:'retry'}).state;s=travel(s,'town-tomb-entry');
 rejected(s,stale,'STALE_LIFE');assert.equal(s.world.objectives.tomb_sequence_step,1);assert.deepEqual(s.world.defeated[TOMB_REGION],killed);
 s=act(s,'tomb-glyph-split-beam');s=act(s,'tomb-glyph-ember');assert.equal(s.world.claimedRewards.filter(id=>id==='r10:t:sequence').length,1);
});
test('projection reread preserves the full accessible clue and never pays twice',()=>{
 const s=decoded(),r=run(s,at(s,'tomb-projection'));assert.deepEqual(r.events.find(e=>e.type==='tombClueRead').sequence,TOMB_SEQUENCE);assert.equal(r.events.some(e=>e.type==='tombReward'),false);assert.equal(r.state.gold,s.gold);assert.equal(r.state.stats.earnedXp,s.stats.earnedXp);assert.deepEqual(r.state.inventory.tools,s.inventory.tools);
});
test('archive stair is independent after decode before B kills or ward, no fee or reward',()=>{
 const s=decoded(),n=act(s,'tomb-shortcut');assert.equal(n.world.objectives.tomb_sequence_step,0);assert.equal(n.stats.earnedXp,s.stats.earnedXp);assert.equal(n.gold,s.gold);assert.equal(tombPortalAllowed(n,{gate:'tomb_shortcut'}).ok,true);
 const t=travel(travel(n,'tomb-town-shortcut'),'town-tomb-shortcut');assert.deepEqual(t.world.position,{x:144,y:368});rejected(t,at(t,'tomb-shortcut'),'ALREADY_OPEN');
});
test('midpoint carry survives death/retry/save without timer, resource cost, new tool or enemy reset',()=>{
 let s=midpoint(),old=copy(s);assert.equal(tombWardCarried(s),true);assert.equal(s.world.objectives.tomb_ward_midpoint,1);
 s=run(s,{type:'settleCombat',defeated:[],...report(s),vitals:{...s.vitals,hp:0}}).state;s=reload(s);s=run(s,{type:'retry'}).state;s=travel(s,'town-tomb-entry');
 assert.equal(tombWardCarried(s),true);assert.deepEqual(s.world.defeated[TOMB_REGION],old.world.defeated[TOMB_REGION]);assert.deepEqual(s.inventory.tools,old.inventory.tools);
 rejected(s,at(s,'tomb-ward-origin'),'ALREADY_CLAIMED');rejected(s,at(s,'tomb-ward-midpoint'),'ALREADY_CLAIMED');
});
test('boss plus hero simultaneous death settles once and leaves explicit unpaid oath pickup for revisit',()=>{
 let s=sealed(),before=copy(s);s=run(s,{type:'settleCombat',defeated:TOMB_GROUPS.boss,...report(s),vitals:{...s.vitals,hp:0}}).state;
 assert.ok(s.world.defeated[TOMB_REGION].includes('tomb-oathkeeper'));assert.equal(s.world.objectives.tomb_oath_taken,0);assert.equal(s.world.objectives.tomb_reported,0);assert.equal(s.stats.kills,before.stats.kills+1);
 rejected(s,at(s,'tomb-oath'),'HERO_DOWN');rejected(s,quest(s,'reportTombQuest'),'HERO_DOWN');const paidDeaths=s.stats.deaths;s=reload(s);assert.equal(s.stats.deaths,paidDeaths);
 s=run(s,{type:'retry'}).state;s=travel(s,'town-tomb-entry');const old=s;s=act(s,'tomb-oath');assert.equal(s.gold,old.gold);assert.equal(s.stats.earnedXp,old.stats.earnedXp);assert.equal(s.inventory.tools.filter(t=>t==='tomb_oath').length,1);
});
test('report requires actual Eda and explicit oath, allows L14 and atomically reserves the granted120G',()=>{
 let s=travel(bossDown('hard'),'tomb-boss-return');rejected(s,quest(s,'reportTombQuest'),'OATH_REQUIRED');s=travel(s,'town-tomb-entry');s=act(s,'tomb-oath');s=travel(s,'tomb-boss-return');
 assert.equal(s.character.level,14);rejected(s,{...quest(s,'reportTombQuest'),position:{x:260,y:325}},'ELDER_REQUIRED');rejected(s,{...quest(s,'reportTombQuest'),position:{x:250,y:470}},'ELDER_REQUIRED');
 const before=s,n=run(s,quest(s,'reportTombQuest')).state;assert.equal(n.character.level,15);assert.equal(n.character.tier,'adept');assert.equal(n.gold,before.gold+120);assert.equal(n.stats.earnedGold,before.stats.earnedGold+120);assert.equal(n.stats.earnedXp,before.stats.earnedXp+140);assert.deepEqual(n.reservedTrainingGold,{expert:120});
 rejected(n,quest(n,'reportTombQuest'),'ALREADY_CLAIMED');assert.equal(n.stats.earnedGold-n.stats.spentGold,n.gold);
});

test('required stages and physical object reach reject unpaid actions unchanged',()=>{
 const s=enter();rejected(s,at(s,'tomb-projection'),'ENTRY_GUARDS_ALIVE');rejected(s,{...at(s,'tomb-projection'),position:{x:112,y:656}},'OBJECT_REQUIRED');
 const b=decoded();rejected(b,at(b,'tomb-glyph-crescent'),'INSCRIPTION_GUARDS_ALIVE');rejected(b,at(b,'tomb-ward-origin'),'SEQUENCE_REQUIRED');
 const c=taken();rejected(c,at(c,'tomb-ward-midpoint'),'LOWER_GUARDS_ALIVE');const d=midpoint();rejected(d,at(d,'tomb-ward-final'),'UPPER_GUARDS_ALIVE');const e=sealed();rejected(e,at(e,'tomb-oath'),'BOSS_REQUIRED');
 assert.equal(tombPortalAllowed(s,{gate:'tomb_shortcut'}).code,'SHORTCUT_REQUIRED');assert.equal(tombPortalAllowed(e,{gate:'tomb_boss_return'}).code,'BOSS_REQUIRED');assert.equal(tombPortalAllowed(s,{gate:'tomb_fake'}).code,'UNKNOWN_GATE');
});
test('validator rejects future kills, incomplete flags, unknown T IDs and both sides of receipts/tools/commission/reserve',()=>{
 const good=finished();for(const edit of [
  n=>delete n.world.objectives.tomb_sequence_step,n=>n.world.objectives.tomb_madeup=1,n=>n.world.claimedRewards.push('r10:t:fake'),n=>n.inventory.tools.push('tomb_fake'),n=>n.world.defeated[TOMB_REGION].push('tomb-fake'),
  n=>n.world.objectives.tomb_sequence_step=2,n=>n.world.objectives.expert_commission=0,n=>delete n.reservedTrainingGold,n=>n.reservedTrainingGold.expert=0,n=>n.reservedTrainingGold.expert=119,n=>n.reservedTrainingGold.other=0,
  n=>n.inventory.tools=n.inventory.tools.filter(t=>t!=='tomb_oath'),n=>n.world.claimedRewards=n.world.claimedRewards.filter(t=>t!=='r10:t:ward-midpoint'),n=>n.world.objectives.tomb_revision=1,
  n=>{n.gold=119;n.stats.spentGold=n.stats.earnedGold-119;},n=>n.world.claimedRewards.push('r10:promote:expert'),
 ]){const n=copy(good);edit(n);assert.equal(validateTombProgress(n).ok,false);}
 for(const [s,id] of [[enter(),'tomb-blade-4'],[decoded(),'tomb-vigil-1'],[taken(),'tomb-vigil-3'],[midpoint(),'tomb-oathkeeper']]){const n=copy(s);n.world.defeated[TOMB_REGION]??=[];n.world.defeated[TOMB_REGION].push(id);assert.equal(validateTombProgress(n).ok,false);rejected(s,{type:'settleCombat',defeated:[id],...report(s)});}
 const n=copy(accepted());n.reservedTrainingGold.expert=120;assert.equal(validateTombProgress(n).ok,false);
});
test('strict command JSON rejects excess authority, missing recovery/revision, bad glyph shape and unsafe values',()=>{
 const s=readySequence(),base=at(s,'tomb-glyph-crescent');for(const edit of [c=>delete c.recovery,c=>delete c.expectedRevision,c=>c.rewardId='r10:t:report',c=>c.expectedStep=4,c=>c.expectedRevision=-1,c=>c.glyph='constructor',c=>c.glyph='ember',c=>c.vitals.hp=Infinity,c=>c.life=NaN,c=>c.recovery.cooldowns.cheat=0]){const c=copy(base);edit(c);const before=copy(s);assert.equal(reduceTomb(s,c).ok,false);assert.deepEqual(s,before);}
 const c=at(s,'tomb-projection');c.glyph='crescent';rejected(s,c,'INVALID_COMMAND');
});
test('receipt/tool/economy/revision limits fail atomically without truncating history or issuing supplies',()=>{
 let s=readyDecode();while(s.world.claimedRewards.length<4096)s.world.claimedRewards.push('fixture:'+s.world.claimedRewards.length);rejected(s,at(s,'tomb-projection'),'RECEIPT_LIMIT');
 s=bossDown();while(s.inventory.tools.length<100)s.inventory.tools.push('fixture-tool-'+s.inventory.tools.length);rejected(s,at(s,'tomb-oath'),'VALUE_OVERFLOW');
 s=readySequence();s=act(s,'tomb-glyph-crescent');s=act(s,'tomb-glyph-split-beam');s.gold=Number.MAX_SAFE_INTEGER;s.stats.earnedGold=Number.MAX_SAFE_INTEGER;s.stats.spentGold=0;rejected(s,at(s,'tomb-glyph-ember'),'VALUE_OVERFLOW');
 s=settle(midpoint(),TOMB_GROUPS.ward_upper);s.inventory.materials.iron=Number.MAX_SAFE_INTEGER;rejected(s,at(s,'tomb-ward-final'),'VALUE_OVERFLOW');
 s=decoded();s.world.objectives.tomb_revision=Number.MAX_SAFE_INTEGER;rejected(s,at(s,'tomb-projection'),'REVISION_LIMIT');const before=copy(s);assert.equal(invalidateTombInput(s).code,'REVISION_LIMIT');assert.deepEqual(s,before);
});

test('controller double plate and competing tab cannot reinterpret stale prefix or claim a new reward',async()=>{
 const s=readySequence(),m=memory(),options={profile:'qa-tomb-race'},store=createSession(m,locked,options);await store.save(s,{expectedRevision:0});const a=createController(store),b=createController(createSession(m,locked,options));await a.load();await b.load();
 const c=at(s,'tomb-glyph-crescent'),[one,two]=await Promise.all([a.dispatch(c),a.dispatch(c)]);assert.equal(one.ok,true);assert.equal(two.code,'STALE_REVISION');assert.equal((await b.dispatch(c)).code,'CONFLICT');await b.load();assert.equal((await b.dispatch(c)).code,'STALE_REVISION');assert.equal(b.snapshot().world.objectives.tomb_sequence_step,1);
});
for(const stage of ['slot','pre-head','post-head'])test(`T report ${stage} storage fault keeps XP/gold/commission/reservation atomic and reconciles uncertainty`,async()=>{
 const s=travel(oathTaken('hard'),'tomb-boss-return'),m=memory(),store=createSession(m,locked,{profile:'qa-tomb-report-'+stage});await store.save(s,{expectedRevision:0});const c=createController(store);await c.load();const command=quest(s,'reportTombQuest'),write=m.setItem;
 m.setItem=(key,value)=>{const fails=stage==='slot'?store.keys.slots.includes(key):key===store.keys.head;if(!fails||stage==='post-head')write(key,value);if(fails)throw new Error('fixture: write fault');};
 assert.equal((await c.dispatch(command)).code,'COMMIT_UNCERTAIN');assert.deepEqual(c.snapshot(),s);assert.equal((await c.dispatch(command)).blocked,true);m.setItem=write;await c.load();
 const committed=stage==='post-head',n=c.snapshot();assert.equal(n.world.objectives.tomb_reported,Number(committed));assert.equal(n.world.objectives.expert_commission,Number(committed));assert.equal(n.reservedTrainingGold.expert,committed?120:0);assert.equal(n.gold,s.gold+(committed?120:0));assert.equal(n.stats.earnedXp,s.stats.earnedXp+(committed?140:0));
 const retry=await c.dispatch(command);assert.equal(retry.ok,!committed);if(committed)assert.equal(retry.code,'STALE_REVISION');assert.equal(c.snapshot().world.claimedRewards.filter(id=>id==='r10:t:report').length,1);
});
