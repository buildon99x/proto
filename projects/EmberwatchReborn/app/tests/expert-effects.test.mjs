import test from 'node:test';
import assert from 'node:assert/strict';
import {WARRIOR_REFERENCE} from '../src/reference-warrior.js';
import {FOES} from '../src/world.js';
import {mapFromRegion} from '../src/world-geometry.js';
import {previewSkill,purchaseSkill,validateWarriorGrowth,RUNTIME_SKILL_IDS} from '../src/warrior-growth.js';
import {bannerAt,quoteAction,physicalDamage,applyHeroStatus,createBattle} from '../src/combat.js';
import {battleReport,validateRecovery} from '../src/recovery.js';
import {rows,close,expertState,learn,fixture,enemy,undeadTaxonomy,aim,tick,cast,until,run,placeBanner,seedFor,noncriticalSeed,incoming} from './support/expert-fixture.mjs';

// All tests below use synthetic Expert tier/target/RNG fixtures documented in
// support/expert-fixture.mjs. Damage is produced by createBattle/stepBattle and
// accepted action handlers, never standalone effect mocks or fabricated hits.
const expertRows=WARRIOR_REFERENCE.skills.filter(row=>row.tier==='expert');
const hits=(events,part)=>events.filter(e=>e.type==='enemyHit'&&(!part||e.context.hitId.includes(`:${part}:`)));
function rejection(s,id,code){const before=structuredClone(s);const r=purchaseSkill(s.character,id,s);assert.equal(r.ok,false,id);assert.equal(r.code,code,id);assert.deepEqual(s,before,id);assert.equal(Object.hasOwn(r,'character'),false);}
function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
function expireAction(f){return until(f,()=>!f.b.p.action);}

for(const row of expertRows)test(`synthetic purchase: ${row.id} every rank, exact SP, immutable preview and max rank`,()=>{
 const s=expertState();if(row.baseId)learn(s,row.baseId);
 for(let rank=1;rank<=row.upgradeCosts.length;rank++){
  const before=structuredClone(s),quote=previewSkill(freeze(structuredClone(s.character)),row.id,s);
  assert.equal(quote.ok,true);assert.equal(quote.available,true);assert.equal(quote.rank,rank-1);assert.equal(quote.nextRank,rank);assert.equal(quote.cost,row.upgradeCosts[rank-1]);
  assert.equal(quote.next.runtimeStatus,'authored_mapping_not_play_verified');assert.ok(quote.next.runtimeValues,`${row.id} has an executable preview`);assert.deepEqual(s,before);
  const remaining=s.character.skillPoints;learn(s,row.id,rank);assert.equal(s.character.skills[row.id],rank);assert.equal(remaining-s.character.skillPoints,row.upgradeCosts[rank-1]);
  const valid=validateWarriorGrowth(s.character,s);assert.equal(valid.ok,true);assert.equal(valid.spentSkillPoints+remaining-row.upgradeCosts[rank-1],valid.earnedSkillPoints);
  const current=previewSkill(s.character,row.id,s);assert.deepEqual(current.current,quote.next);
 }
 const max=previewSkill(s.character,row.id,s);assert.equal(max.next,null);assert.equal(max.nextRank,null);assert.equal(max.cost,null);assert.equal(max.code,'MAX_RANK');rejection(s,row.id,'MAX_RANK');
});

test('synthetic purchases: all fifteen require Expert, valid SP ledger, full starters and the exact parent',()=>{
 assert.equal(expertRows.length,15);assert.equal(RUNTIME_SKILL_IDS.length,40);
 for(const row of expertRows){
  const lower=expertState();lower.character.tier='adept';rejection(lower,row.id,'TIER_REQUIRED');
  const ledger=expertState();ledger.character.skillPoints--;rejection(ledger,row.id,'SKILL_POINT_LEDGER');
  const untrained=expertState();untrained.character.skills={};rejection(untrained,row.id,'STARTER_REQUIRED');
  if(row.baseId&&!['mace_swing','righteous_hammer','shield_block','shield_charge'].includes(row.baseId)){
   const orphan=expertState();assert.equal(previewSkill(orphan.character,row.id,orphan).code,'BASE_SKILL');rejection(orphan,row.id,'BASE_SKILL');
   orphan.character.skills[row.id]=1;orphan.character.skillPoints-=row.upgradeCosts[0];assert.equal(validateWarriorGrowth(orphan.character,orphan).code,'BASE_SKILL');
  }
  let poor;
  // Spend the real L29 budget through legal purchases; search purchase order
  // rather than fabricating zero SP and accidentally testing only bad ledgers.
  for(let attempt=0;attempt<30;attempt++){
   poor=expertState();if(row.baseId)learn(poor,row.baseId);let seed=attempt+1;
   while(poor.character.skillPoints>=row.upgradeCosts[0]){const choices=RUNTIME_SKILL_IDS.filter(id=>id!==row.id&&(!row.exclusiveGroup||rows.get(id).exclusiveGroup!==row.exclusiveGroup)).map(id=>previewSkill(poor.character,id,poor)).filter(q=>q.ok&&q.available);if(!choices.length)break;seed=(Math.imul(seed,1664525)+1013904223)>>>0;const q=choices[seed%choices.length];learn(poor,q.id,q.nextRank);}
   if(poor.character.skillPoints<row.upgradeCosts[0])break;
  }
  assert.ok(poor.character.skillPoints<row.upgradeCosts[0],row.id);assert.equal(validateWarriorGrowth(poor.character,poor).ok,true);
  if(row.exclusiveGroup&&poor.character.exclusiveBranches[row.exclusiveGroup])assert.equal(previewSkill(poor.character,row.id,poor).code,'EXCLUSIVE');else rejection(poor,row.id,'SKILL_POINTS');
 }
});

test('synthetic purchase/load validation: Banner and hammer branches are exclusive in both directions; all Master remains data-only',()=>{
 for(const pair of [['banner_of_protection','banner_of_zeal'],['hammer_of_wrath','hammer_of_sundering']])for(const chosen of pair){
  const other=pair.find(id=>id!==chosen),s=expertState({[chosen]:1});rejection(s,other,'EXCLUSIVE');
  const quote=previewSkill(s.character,other,s);assert.equal(quote.exclusiveSelection,chosen);assert.equal(quote.next.runtimeStatus,'exclusive_unavailable');
  s.character.skills[other]=1;s.character.skillPoints-=rows.get(other).upgradeCosts[0];assert.equal(validateWarriorGrowth(s.character,s).code,'EXCLUSIVE');
 }
 for(const row of WARRIOR_REFERENCE.skills.filter(r=>r.tier==='master')){const s=expertState();rejection(s,row.id,'DATA_ONLY');s.character.skills[row.id]=1;s.character.skillPoints-=row.upgradeCosts[0];assert.equal(validateWarriorGrowth(s.character,s).code,'DATA_ONLY');}
 const invalid=expertState();invalid.character.tier='master';assert.equal(validateWarriorGrowth(invalid.character,invalid).ok,false);
 const unknown=expertState();rejection(unknown,'unregistered_expert','UNKNOWN_SKILL');
});

test('real Banner acceptance charges full first cost, immutable paid rank, starts lifetime at contact and emits once at dt0',()=>{
 const f=fixture({battle_banner:1,banner_of_zeal:1}),mana=f.b.p.mana;
 const starts=cast(f,'battle_banner');assert.equal(starts.filter(e=>e.type==='actionStarted').length,1);close(f.b.p.mana,mana-40);assert.equal(f.b.banner,null);assert.equal(f.b.p.cooldowns.battle_banner,30);
 const accepted=f.b.p.action.spec;assert.equal(Object.isFrozen(accepted),true);learn(f.s,'battle_banner',2);learn(f.s,'banner_of_zeal',2);
 for(let i=0;i<5;i++)assert.equal(tick(f,{},0).some(e=>e.type==='bannerPlaced'),false);
 const events=until(f,()=>!!f.b.banner);assert.equal(events.filter(e=>e.type==='bannerPlaced').length,1);close(f.b.banner.remaining+(f.b.p.action.elapsed-accepted.contact),15);close(f.b.banner.damageMultiplier,1.1);close(f.b.banner.manaCostMultiplier,.9);
 assert.equal(f.b.banner.castId,1);assert.equal(f.b.p.action.spec,accepted);assert.equal(f.b.contacts,0);
});

test('real Banner membership is live, inclusive at radius, regional and wall-LOS limited',()=>{
 const f=fixture({battle_banner:1});placeBanner(f);const a=f.b.banner;
 for(const [dx,dy,inside] of [[0,0,true],[128,0,true],[128.0001,0,false],[0,-128,true],[100,100,false]]){f.b.p.x=a.x+dx;f.b.p.y=a.y+dy;assert.equal(!!bannerAt(f.b),inside,`${dx},${dy}`);}
 f.b.region='synthetic-other-region';assert.equal(bannerAt(f.b),null);f.b.region=a.region;
 f.b.map=mapFromRegion({w:20,h:20,rooms:[{x:1,y:1,w:9,h:18},{x:11,y:1,w:8,h:18}]});f.b.p.x=365;f.b.p.y=300;assert.ok(Math.hypot(f.b.p.x-a.x,f.b.p.y-a.y)<128);assert.equal(bannerAt(f.b),null);
});

test('real Banner expiry is before the exact next cast and leaves paid outgoing snapshots untouched',()=>{
 const f=fixture({battle_banner:1,banner_of_zeal:3});placeBanner(f);f.b.banner.remaining=.05;f.b.p.manaDelay=100;
 const mana=f.b.p.mana;const events=cast(f,'hammer',.05);const started=events.find(e=>e.type==='actionStarted');assert.ok(started);close(started.manaCost,f.b.stats.actions.righteous_hammer.manaCost);assert.equal(f.b.banner,null);close(f.b.p.mana,mana-started.manaCost);
 const g=fixture({battle_banner:1,banner_of_zeal:3});placeBanner(g);const manaBefore=g.b.p.mana;cast(g,'hammer');const accepted=g.b.p.action.spec;close(accepted.offense.damageMultiplier,1.1);close(accepted.manaCost,g.b.stats.actions.righteous_hammer.manaCost*.7);
 g.b.p.x+=129;assert.equal(bannerAt(g.b),null);until(g,()=>g.b.shots.length>0);assert.equal(g.b.shots[0].spec,accepted);close(manaBefore-g.b.p.mana,accepted.manaCost);
});

for(let rank=1;rank<=3;rank++)test(`real Protection rank ${rank}: incoming reduction follows current position, defense and successful block once`,()=>{
 for(const inside of [true,false])for(const block of [true,false]){
  const f=fixture({battle_banner:1,banner_of_protection:rank});placeBanner(f);if(!inside)f.b.p.x+=129;
  const hp=f.b.p.hp,stamina=f.b.p.stamina;incoming(f,{damage:20,damageType:'fire'});const events=tick(f,{block,aim:aim(f)},.05);const hurt=events.find(e=>e.type==='heroHurt');assert.ok(hurt);
  close(hp-f.b.p.hp,20*(block?.3:1)*(inside?[.9,.85,.8][rank-1]:1));assert.equal(hurt.blocked,block);close(stamina-f.b.p.stamina,block?f.b.stats.actions.shield_block.staminaCost:0);
 }
});

for(let rank=1;rank<=3;rank++)test(`real Zeal rank ${rank}: all finite spells use one final MP factor, fixed cooldown and cast-speed quote`,()=>{
 for(const [skills,pulse,id] of [[{hammer_of_wrath:1},'hammer','righteous_hammer'],[{hammer_of_sundering:1},'hammer','righteous_hammer'],[{cleansing_touch:1},'heal','lay_on_hands'],[{trial_by_fire:1},'judgement','judgement'],[{},'battle_banner','battle_banner']]){
  const f=fixture({battle_banner:1,banner_of_zeal:rank,...skills});placeBanner(f);if(id==='battle_banner')f.b.p.cooldowns.battle_banner=0; // synthetic second-placement availability
  const base=f.b.stats.actions[id],q=quoteAction(f.b,id),factor=[.9,.8,.7][rank-1],speed=[1.2,1.35,1.5][rank-1];close(q.manaCost,base.manaCost*factor);close(q.duration,Math.max(.3,base.duration/speed));assert.equal(q.cooldown,base.cooldown);
  f.b.p.mana=q.manaCost;f.b.p.manaDelay=100;const e=cast(f,pulse).find(e=>e.type==='actionStarted');assert.ok(e);close(e.manaCost,q.manaCost);assert.equal(f.b.p.mana,0);assert.equal(f.b.p.cooldowns[id],base.cooldown);
  const rejected=fixture({battle_banner:1,banner_of_zeal:rank,...skills});placeBanner(rejected);if(id==='battle_banner')rejected.b.p.cooldowns.battle_banner=0;rejected.b.p.mana=quoteAction(rejected.b,id).manaCost-1e-6;rejected.b.p.manaDelay=100;
  const before=rejected.b.p.mana;assert.equal(cast(rejected,pulse).some(e=>e.type==='actionStarted'),false);assert.equal(rejected.b.p.mana,before);
 }
});

test('real Banner survives fire-area replacement; one newer Banner replaces rather than stacks and load removes only its world object',()=>{
 const f=fixture({battle_banner:1,trial_by_fire:1});placeBanner(f);const first=f.b.banner;cast(f,'judgement');until(f,()=>f.b.areas.length===1);assert.equal(f.b.banner,first);expireAction(f);
 f.b.p.cooldowns.battle_banner=0;f.b.p.mana=f.b.stats.manaMax;placeBanner(f);assert.notEqual(f.b.banner,first);close(f.b.banner.damageMultiplier,1.1);assert.equal(f.b.areas.length,1);
 const report=battleReport(f.b),loaded=createBattle({...f.s,...report});assert.equal(loaded.banner,null);assert.equal(loaded.p.mana,report.vitals.mana);assert.equal(loaded.p.cooldowns.battle_banner,report.recovery.cooldowns.battle_banner);
});

for(let rank=1;rank<=3;rank++)test(`real Flames rank ${rank}: one terminal fire arc per target even after empty or multiple mace contact`,()=>{
 const f=fixture({flames_of_devotion:rank}),a=enemy(f,{id:'a',x:340}),b=enemy(f,{id:'b',x:345,y:310}),edge=enemy(f,{id:'edge',x:390}),far=enemy(f,{id:'far',x:391}),rear=enemy(f,{id:'rear',x:260});
 cast(f,'attack');const spec=f.b.p.action.spec,events=expireAction(f),flames=hits(events,'flame');assert.deepEqual(flames.map(e=>e.id),['a','b','edge']);assert.equal(hits(events,'mace').length,2);
 for(const hit of flames){close(hit.damage,spec.flameArc.damage);assert.equal(hit.critical,false);assert.equal(hit.context.procDepth,1);assert.equal(hit.context.canTriggerOnHit,false);}
 assert.equal(far.hp,far.max);assert.equal(rear.hp,rear.max);close(edge.max-edge.hp,f.b.stats.intelligence*[.3,.4,.5][rank-1]);assert.ok(a.hp<a.max&&b.hp<b.max);
 const lone=fixture({flames_of_devotion:rank});enemy(lone,{x:389});cast(lone,'attack');const empty=expireAction(lone);assert.equal(hits(empty,'mace').length,0);assert.equal(hits(empty,'flame').length,1);
});

test('real Flames keeps accepted rank and fire-only multipliers, obeys walls, and never recurses through Guilt or Flaming Wrath',()=>{
 const f=fixture({flames_of_devotion:1,inner_flame:1,flaming_wrath:1,guilt_by_association:1});f.b.p.innerFlame={rank:1,remaining:3};
 f.b.foeTypes={...FOES,fixture_fire_resistant:{...FOES.scout,armor:999,resistances:{fire:50}}};const e=enemy(f,{x:390,kind:'fixture_fire_resistant'});e.disarm={remaining:2};cast(f,'attack');const accepted=f.b.p.action.spec;learn(f.s,'flames_of_devotion',3);const events=expireAction(f);close(e.max-e.hp,accepted.flameArc.damage*1.1*.5);assert.equal(events.some(e=>e.type==='procCooldownStarted'),false);
 const wall=fixture({flames_of_devotion:1});wall.b.map=mapFromRegion({w:20,h:20,rooms:[{x:1,y:1,w:9,h:18},{x:11,y:1,w:8,h:18}]});const hidden=enemy(wall,{x:365});cast(wall,'attack');expireAction(wall);assert.equal(hidden.hp,hidden.max);
});

for(const branch of ['hammer_of_wrath','hammer_of_sundering'])test(`real returning hammer with ${branch}: one charge, one hit per leg and preserved branch payload`,()=>{
 const f=fixture({hammer_of_devotion:1,[branch]:1}),e=enemy(f,{x:440});f.b.seed=noncriticalSeed();const mana=f.b.p.mana;cast(f,'hammer');const accepted=f.b.p.action.spec;assert.equal(f.b.p.cooldowns.righteous_hammer,2);close(mana-f.b.p.mana,accepted.manaCost);f.b.p.manaDelay=100; // suppress fixture regen to measure payments only
 const events=until(f,()=>!f.b.p.action&&!f.b.shots.length);assert.equal(events.filter(e=>e.type==='hammerReturned').length,1);const root=events.filter(e=>e.type==='enemyHit'&&e.context.procDepth===0);assert.deepEqual(root.map(e=>e.context.hitId),['1:outward:target','1:return:target']);
 assert.equal(new Set(root.map(e=>e.context.hitId)).size,2);assert.equal(root.every(e=>e.context.castId===1),true);close(mana-f.b.p.mana,accepted.manaCost);assert.ok(e.hp<e.max);
 if(branch==='hammer_of_sundering'){assert.ok(e.armorBreak);const first=physicalDamage(accepted.damage,FOES.scout.armor,accepted.armorPenetration);close(root[0].damage,first*(root[0].critical?1.5:1));close(root[1].damage,physicalDamage(accepted.damage,Math.max(0,FOES.scout.armor-accepted.armorBreak.amount),accepted.armorPenetration)*(root[1].critical?1.5:1));}
 else assert.ok(events.some(e=>e.type==='enemyHit'&&e.context.hitId.includes(':lightning:')&&e.context.procDepth===1));
 const after=e.hp;run(f,.3);assert.equal(e.hp,after);assert.equal(f.b.shots.length,0);
});

test('real returning hammer follows current hero, returns once at a wall, and load drops it without cost refund',()=>{
 const f=fixture({hammer_of_devotion:1});cast(f,'hammer');until(f,()=>f.b.shots[0]?.leg==='return');f.b.p.y+=90;tick(f);assert.ok(f.b.shots[0].vy>0);const report=battleReport(f.b),loaded=createBattle({...f.s,...report});assert.equal(loaded.shots.length,0);assert.equal(loaded.p.mana,report.vitals.mana);assert.deepEqual(loaded.p.cooldowns,report.recovery.cooldowns);until(f,()=>!f.b.shots.length);
 const wall=fixture({hammer_of_devotion:1});wall.b.map=mapFromRegion({w:20,h:20,rooms:[{x:1,y:1,w:9,h:18},{x:11,y:1,w:8,h:18}]});cast(wall,'hammer');const events=until(wall,()=>!wall.b.p.action&&!wall.b.shots.length);assert.equal(events.filter(e=>e.type==='hammerReturned').length,1);
});

for(let rank=1;rank<=3;rank++)test(`real Turn Undead rank ${rank}: explicit taxonomy, pure defenses, radius96/LOS and combined heal augments`,()=>{
 const f=fixture({turn_undead:rank,cleansing_touch:1,invigorating_touch:1});undeadTaxonomy(f,{armor:999,resistances:{fire:90,pure:90}});f.b.seed=noncriticalSeed();
 const tagged=enemy(f,{id:'a-undead',kind:'fixture_undead',x:340}),edge=enemy(f,{id:'b-edge',kind:'fixture_undead',x:396}),outside=enemy(f,{id:'outside',kind:'fixture_undead',x:396.001}),living=enemy(f,{id:'living',x:345}),misnamed=enemy(f,{id:'undead_tomb_name_is_not_a_tag',x:350});
 applyHeroStatus(f.b,'r11_burn','fixture-source');applyHeroStatus(f.b,'r11_slow','fixture-source');applyHeroStatus(f.b,'r11_disarm','fixture-source');
 const mana=f.b.p.mana;cast(f,'heal');assert.equal(f.b.p.cooldowns.lay_on_hands,18);close(mana-f.b.p.mana,30);const events=until(f,()=>!!f.b.p.regenBuff);const dealt=hits(events,'undead');assert.deepEqual(dealt.map(e=>e.id),['a-undead','b-edge']);
 for(const e of [tagged,edge])close(e.max-e.hp,[100,200,400][rank-1]);for(const e of [outside,living,misnamed])assert.equal(e.hp,e.max);
 assert.equal(events.filter(e=>e.type==='healApplied').length,1);assert.equal(events.find(e=>e.type==='healApplied').amount,0,'full-HP cast still performs all augments');assert.deepEqual(f.b.p.negativeStatuses,{});assert.ok(f.b.p.regenBuff.remaining>3.9);
 const wall=fixture({turn_undead:rank});undeadTaxonomy(wall);wall.b.map=mapFromRegion({w:20,h:20,rooms:[{x:1,y:1,w:9,h:18},{x:11,y:1,w:8,h:18}]});const hidden=enemy(wall,{kind:'fixture_undead',x:365});cast(wall,'heal');expireAction(wall);assert.equal(hidden.hp,hidden.max);
});

test('real Cleanse clears current registered noninterrupting negatives and pending ticks, retains paid/benevolent state and never resurrects',()=>{
 const f=fixture({cleansing_touch:1,invigorating_touch:1,inner_flame:1});f.b.p.hp=10;f.b.p.cooldowns.righteous_hammer=5;f.b.p.procCooldowns.flaming_wrath=.5;
 cast(f,'heal');for(const rule of ['r11_slow','r11_disarm','r11_burn','r11_poison'])assert.equal(applyHeroStatus(f.b,rule,'fixture-source'),true);
 const events=until(f,()=>!!f.b.p.regenBuff);assert.equal(events.filter(e=>e.type==='heroStatusChanged'&&e.cleansed).length,4);assert.deepEqual(f.b.p.negativeStatuses,{});close(f.b.p.hp,70);assert.ok(f.b.p.innerFlame);assert.ok(f.b.p.cooldowns.righteous_hammer>4);assert.ok(f.b.p.cooldowns.lay_on_hands>17);assert.ok(f.b.p.manaDelay>0);
 const hp=f.b.p.hp;run(f,1.2);assert.equal(f.b.p.hp,hp,'cleansed periodic ticks do not survive');
 const none=fixture({cleansing_touch:1});cast(none,'heal');assert.equal(expireAction(none).filter(e=>e.type==='heroStatusChanged'&&e.cleansed).length,0);
 const dead=fixture({cleansing_touch:1});dead.b.p.hp=0;dead.b.dead=true;assert.equal(cast(dead,'heal').some(e=>e.type==='actionStarted'||e.type==='healApplied'),false);assert.equal(dead.b.p.hp,0);
});

test('real interrupting stun/silence prevents new heal and cancels an already paid Cleanse before contact with cost/CD retained',()=>{
 for(const rule of ['r11_stun','r11_silence']){
  const blocked=fixture({cleansing_touch:1});applyHeroStatus(blocked.b,rule,'fixture-source');const mana=blocked.b.p.mana;assert.equal(cast(blocked,'heal').some(e=>e.type==='actionStarted'),false);assert.equal(blocked.b.p.mana,mana);
  const canceled=fixture({cleansing_touch:1});cast(canceled,'heal');const paid=canceled.b.p.mana;applyHeroStatus(canceled.b,rule,'fixture-source');assert.equal(canceled.b.p.action,null);assert.equal(canceled.b.p.mana,paid);assert.equal(canceled.b.p.cooldowns.lay_on_hands,18);assert.equal(run(canceled,.5).some(e=>e.type==='healApplied'),false);
 }
});

for(let rank=1;rank<=4;rank++)test(`real Inner Flame rank ${rank}: first cast snapshots old offense, later cast benefits, live fire defense and single refresh`,()=>{
 const f=fixture({inner_flame:rank,lay_on_hands:1});const first=cast(f,'hammer');assert.equal(first.filter(e=>e.type==='innerFlameChanged').length,1);assert.equal(f.b.p.action.spec.offense.fireDamageMultiplier,1);assert.deepEqual(f.b.p.innerFlame,{rank,remaining:3});
 const hp=f.b.p.hp;incoming(f,{damage:20,damageType:'fire'});tick(f,{},.05);close(hp-f.b.p.hp,20*(1-[.2,.3,.4,.5][rank-1]));expireAction(f);
 cast(f,'heal');close(f.b.p.action.spec.offense.fireDamageMultiplier,[1.1,1.15,1.2,1.25][rank-1]);assert.deepEqual(f.b.p.innerFlame,{rank,remaining:3});
 const previous=f.b.p.innerFlame.remaining;assert.equal(cast(f,'heal').some(e=>e.type==='innerFlameChanged'),false);assert.equal(f.b.p.innerFlame.remaining,previous);for(let n=0;n<4;n++)tick(f,{},0);assert.equal(f.b.p.innerFlame.remaining,3);
 const report=battleReport(f.b);assert.equal(validateRecovery(report.recovery,{character:f.s.character}),true);const loaded=createBattle({...f.s,...report});assert.deepEqual(loaded.p.innerFlame,f.b.p.innerFlame);assert.equal(loaded.castSerial,0);
 f.b.p.innerFlame.remaining=.05;f.b.p.invuln=0;const before=f.b.p.hp;incoming(f,{damage:20,damageType:'fire'});tick(f,{},.05);assert.equal(f.b.p.innerFlame,null);close(before-f.b.p.hp,20);
});

for(let rank=1;rank<=3;rank++)test(`real Flaming Wrath rank ${rank}: one caster-wide terminal proc, lethal-root origin and original-victim inclusion`,()=>{
 const f=fixture({flaming_wrath:rank,judgement:1});const chance=quoteAction(f.b,'judgement').offense.criticalChance;close(chance,.05+[.05,.1,.15][rank-1]);f.b.seed=seedFor(next=>next()<chance&&next()<chance);
 const first=enemy(f,{id:'a',x:350,hp:1}),second=enemy(f,{id:'b',x:360}),outside=enemy(f,{id:'outside',x:415,y:80});cast(f,'judgement');const events=expireAction(f),procs=events.filter(e=>e.type==='procCooldownStarted');assert.equal(procs.length,1);assert.equal(procs[0].id,'flaming_wrath');
 assert.equal(events.filter(e=>e.type==='defeated'&&e.id==='a').length,1);assert.equal(first.dead,true);const splash=events.filter(e=>e.type==='enemyHit'&&e.context.originSkillId==='flaming_wrath');assert.deepEqual(splash.map(e=>e.id),['b']);close(splash[0].damage,[40,60,100][rank-1]);assert.equal(splash[0].critical,false);assert.equal(splash[0].context.procDepth,1);assert.equal(splash[0].context.canTriggerOnHit,false);assert.equal(outside.hp,outside.max);assert.equal(second.dead,undefined);
 const own=fixture({flaming_wrath:rank});const victim=enemy(own,{x:360});own.b.seed=seedFor(next=>next()<quoteAction(own.b,'righteous_hammer').offense.criticalChance);cast(own,'hammer');const ownEvents=until(own,()=>victim.hp<victim.max);assert.equal(ownEvents.filter(e=>e.type==='enemyHit'&&e.id===victim.id).length,2);assert.equal(ownEvents.filter(e=>e.type==='combatRandom').length,1,'the terminal explosion has no critical or recursive RNG');
 const report=battleReport(own.b);assert.ok(report.recovery.procCooldowns.flaming_wrath>0);const loaded=createBattle({...own.s,...report});close(loaded.p.procCooldowns.flaming_wrath,report.recovery.procCooldowns.flaming_wrath);
});

test('real Flaming Wrath exact caster-wide cooldown boundary and secondary fire/lightning have no spell-critical loops',()=>{
 for(const remaining of [.01,.010001]){
  const f=fixture({flaming_wrath:1});const victim=enemy(f,{x:500});cast(f,'hammer');until(f,()=>f.b.shots.length>0);const shot=f.b.shots[0];victim.x=shot.x+25;f.b.p.procCooldowns.flaming_wrath=remaining;f.b.seed=seedFor(next=>next()<shot.spec.offense.criticalChance);
  const e=tick(f,{},.01);assert.equal(e.filter(e=>e.type==='procCooldownStarted').length,remaining===.01?1:0);
 }
 for(const skills of [{trial_by_fire:1},{hammer_of_wrath:1}]){
  const f=fixture({flaming_wrath:3,...skills}),target=enemy(f,skills.trial_by_fire?{x:385,y:335}:{x:440,y:350});f.b.seed=noncriticalSeed();cast(f,skills.trial_by_fire?'judgement':'hammer');const events=run(f,6);const secondary=events.filter(e=>e.type==='enemyHit'&&e.context.procDepth===1);assert.ok(secondary.length);assert.equal(secondary.every(e=>!e.critical&&!e.context.canTriggerOnHit),true);assert.equal(events.filter(e=>e.type==='procCooldownStarted').length,0);assert.ok(target.hp<target.max);
 }
});

for(let rank=1;rank<=3;rank++)test(`real Lawbringer rank ${rank}: deterministic success/failure boundary and single roll on block plus positive damage`,()=>{
 for(const success of [false,true]){
  const f=fixture({lawbringer:rank}),owner=enemy(f,{x:350});f.b.seed=seedFor(next=>(next()<[.1,.15,.2][rank-1])===success);incoming(f,{owner,damageType:'fire'});const draws=f.b.combatDraws,events=tick(f,{block:true,aim:aim(f)},.05),rolls=events.filter(e=>e.type==='lawbringerRolled');
  assert.equal(rolls.length,1);assert.equal(rolls[0].success,success);assert.equal(f.b.combatDraws-draws,1);assert.ok(events.some(e=>e.type==='heroHurt'&&e.blocked&&e.damage>0));assert.equal(!!owner.disarm,success);assert.equal(!!owner.silence,success);if(success){close(owner.disarm.remaining,2);close(owner.silence.remaining,2);}
 }
});

test('real Lawbringer uses live ranged owner identity, interrupts weapon/spell windups, and does not erase already-fired shots',()=>{
 for(const family of ['weapon','spell']){
  const f=fixture({lawbringer:1}),owner=enemy(f,{x:350,inert:false,state:'windup',timer:1,windupDuration:1,attackSpec:{attackFamily:family,recovery:1,damage:20},telegraph:{progress:0,shapes:[{type:'cone',x:350,y:300,angle:Math.PI,r:80,halfAngle:1}]}});
  f.b.seed=seedFor(next=>next()<.1);incoming(f,{owner,damageType:'fire',attackFamily:family});f.b.shots.push({kind:'arrow',enemy:true,x:800,y:500,vx:0,vy:100,damage:1,damageType:'fire',attackerId:owner.id,attackFamily:family,life:1});
  const events=tick(f,{},.05);assert.equal(events.filter(e=>e.type==='enemyAttackInterrupted'&&e.id===owner.id).length,1);assert.equal(owner.state,'recovery');assert.equal(owner.telegraph,null);assert.equal(f.b.shots.length,1,'an already fired unrelated shot survives');
  owner.timer=0;tick(f);assert.notEqual(owner.state,'windup');assert.ok(owner.disarm&&owner.silence);owner.disarm.remaining=.02;owner.silence.remaining=.02;owner.x=330;owner.timer=0;tick(f);assert.equal(owner.disarm,null);assert.equal(owner.silence,null);assert.equal(owner.state,'windup');
 }
});

test('real Lawbringer exclusions: ignored invulnerability, fatal hit, missing/dead/off-map owner and environment never roll',()=>{
 for(const mode of ['invulnerable','fatal','missing','dead','off-map','environment']){
  const f=fixture({lawbringer:3}),owner=enemy(f,{x:350});if(mode==='invulnerable')f.b.p.invuln=1;if(mode==='fatal')f.b.p.hp=1;if(mode==='dead')owner.hp=0;if(mode==='off-map'){owner.x=-100;owner.y=-100;}
  f.b.seed=seedFor(next=>next()<.2);incoming(f,{owner:mode==='missing'?null:owner,damageType:'fire',attackFamily:mode==='environment'?'environment':'weapon'});const events=tick(f,{},.05);assert.equal(events.some(e=>e.type==='lawbringerRolled'),false,mode);assert.equal(owner.disarm,undefined,mode);
 }
});

for(let rank=1;rank<=3;rank++)test(`real Punish rank ${rank}: live disarm OR silence once, separate Shackles, and no stun-only bonus`,()=>{
 for(const tags of [[],['disarm'],['silence'],['disarm','silence'],['stun']]){
  const f=fixture({punish_the_wicked:rank,turn_undead:1});undeadTaxonomy(f);const e=enemy(f,{kind:'fixture_undead'});f.b.seed=noncriticalSeed();cast(f,'heal');for(const id of tags)if(id==='stun')e.stun=2;else e[id]={remaining:2};e.shackles={remaining:2,damageTakenMultiplier:1.2,moveMultiplier:.5};const events=expireAction(f),hit=hits(events,'undead')[0];assert.ok(hit);close(hit.damage,100*1.2*(tags.some(id=>id==='disarm'||id==='silence')?[1.1,1.2,1.3][rank-1]:1));
 }
 const expiry=fixture({punish_the_wicked:rank,turn_undead:1});undeadTaxonomy(expiry);const e=enemy(expiry,{kind:'fixture_undead'});expiry.b.seed=noncriticalSeed();cast(expiry,'heal');const action=expiry.b.p.action;e.silence={remaining:action.spec.contact};const events=expireAction(expiry);close(hits(events,'undead')[0].damage,100);
});

for(let rank=1;rank<=3;rank++)test(`real Guilt rank ${rank}: raw mainhand once, one shared proc, lethal/disabled primary and terminal eligible neighbors`,()=>{
 const f=fixture({guilt_by_association:rank,mace_swing:3,crushing_might:1}),a=enemy(f,{id:'a-primary',hp:1,x:340}),b=enemy(f,{id:'b-primary',x:345,y:302}),neighbor=enemy(f,{id:'c-neighbor',x:415,y:300}),blocked=enemy(f,{id:'d-disabled',x:380,y:340}),outside=enemy(f,{id:'z-outside',x:430,y:360});
 a.disarm={remaining:2};b.silence={remaining:2};blocked.disarm={remaining:2};f.b.seed=noncriticalSeed();cast(f,'attack');const spec=f.b.p.action.spec,events=expireAction(f),procs=events.filter(e=>e.type==='procCooldownStarted');assert.equal(procs.length,1);assert.equal(procs[0].id,'guilt_by_association');assert.equal(procs[0].remaining,[1.5,1,.5][rank-1]);
 const splash=events.filter(e=>e.type==='enemyHit'&&e.context.originSkillId==='guilt_by_association');assert.deepEqual(splash.map(e=>e.id),['c-neighbor']);close(splash[0].damage,physicalDamage(f.b.stats.physicalDamage*[.5,.75,1][rank-1],FOES.scout.armor,spec.offense.guilt.armorPenetration));assert.equal(splash[0].critical,false);assert.equal(splash[0].context.procDepth,1);assert.equal(splash[0].context.canTriggerOnHit,false);assert.equal(a.dead,true);assert.equal(events.filter(e=>e.type==='defeated'&&e.id===a.id).length,1);assert.equal(blocked.hp,blocked.max);assert.equal(outside.hp,outside.max);assert.ok(neighbor.hp<neighbor.max);
 const report=battleReport(f.b);assert.equal(validateRecovery(report.recovery,{character:f.s.character}),true);const loaded=createBattle({...f.s,...report});assert.deepEqual(loaded.p.procCooldowns,report.recovery.procCooldowns);
});

test('real Guilt claims its cooldown even with no neighbors; direct spells and terminal Flames never trigger it',()=>{
 const empty=fixture({guilt_by_association:1});const target=enemy(empty);target.disarm={remaining:2};cast(empty,'attack');assert.equal(expireAction(empty).filter(e=>e.type==='procCooldownStarted'&&e.id==='guilt_by_association').length,1);
 for(const pulse of ['hammer','judgement','heal']){const f=fixture({guilt_by_association:1,judgement:1,turn_undead:1});undeadTaxonomy(f);const e=enemy(f,{kind:'fixture_undead'});e.disarm={remaining:2};cast(f,pulse);const events=run(f,.7);assert.ok(hits(events).length);assert.equal(events.some(e=>e.type==='procCooldownStarted'),false);}
});

test('synthetic all-rank corruption: fractional, zero, excessive, negative and missing-branch records fail without mutation',()=>{
 for(const row of expertRows)for(const rank of [0,.5,-1,row.upgradeCosts.length+1]){
  const s=expertState();if(row.baseId)learn(s,row.baseId);s.character.skills[row.id]=rank;const before=structuredClone(s);assert.equal(validateWarriorGrowth(s.character,s).ok,false,`${row.id} rank ${rank}`);assert.deepEqual(s,before);
 }
 for(const id of ['banner_of_protection','banner_of_zeal']){const s=expertState({[id]:1});delete s.character.exclusiveBranches.battle_banner_support;assert.equal(validateWarriorGrowth(s.character,s).code,'EXCLUSIVE');}
});

test('real Banner live incoming coverage updates after movement and outgoing fire damage preserves accepted aura after leaving',()=>{
 for(const leaving of [true,false]){
  const f=fixture({battle_banner:1,banner_of_protection:3});placeBanner(f);const banner=f.b.banner;f.b.p.x=banner.x+(leaving?127:129);f.b.p.invuln=0;const hp=f.b.p.hp;
  incoming(f,{x:f.b.p.x+30,damageType:'fire'});const events=tick(f,{move:{x:leaving?1:-1,y:0}},.05);assert.ok(events.some(e=>e.type==='heroHurt'));assert.equal(!!bannerAt(f.b),!leaving);close(hp-f.b.p.hp,20*(leaving?1:.8));
 }
 const f=fixture({battle_banner:1,trial_by_fire:1,inner_flame:2});placeBanner(f);const target=enemy(f,{x:380});f.b.seed=noncriticalSeed();cast(f,'judgement');const accepted=f.b.p.action.spec;close(accepted.offense.damageMultiplier,1.1);close(accepted.offense.fireDamageMultiplier,1.15);until(f,()=>f.b.areas.length>0);f.b.p.x=600;f.b.p.innerFlame=null;assert.equal(bannerAt(f.b),null);
 const events=run(f,.7),fire=events.filter(e=>e.type==='enemyHit'&&e.context.hitId.includes(':fire:'));assert.equal(fire.length,1);close(fire[0].damage,accepted.fireArea.damage*1.1*1.15);assert.ok(target.hp<target.max);
});

test('real Lawbringer passive fully absorbed physical block rolls once without active stamina payment',()=>{
 const f=fixture({lawbringer:1}),owner=enemy(f,{x:350});const chance=f.b.stats.actions.shield_block.passiveBlockChance;f.b.seed=seedFor(next=>next()<chance&&next()<.1);const hp=f.b.p.hp,stamina=f.b.p.stamina,draws=f.b.combatDraws;
 incoming(f,{owner,damage:1,damageType:'physical'});const events=tick(f,{},.05),hurt=events.find(e=>e.type==='heroHurt');assert.ok(hurt);assert.equal(hurt.blocked,true);assert.equal(hurt.damage,0);assert.equal(f.b.p.hp,hp);assert.equal(f.b.p.stamina,stamina);assert.equal(f.b.combatDraws-draws,2);assert.equal(events.filter(e=>e.type==='lawbringerRolled').length,1);assert.ok(owner.disarm&&owner.silence);
});

test('real Lawbringer suppresses only the matching weapon/spell family, refreshes to two seconds, and leaves pursuit available',()=>{
 for(const [family,suppressedBy,other] of [['weapon','disarm','silence'],['spell','silence','disarm']]){
  const f=fixture({lawbringer:1});f.b.foeTypes={...FOES,fixture_family:{...FOES.scout,attackFamily:family}};const owner=enemy(f,{kind:'fixture_family',x:330,inert:false});owner[other]={remaining:1};tick(f);assert.equal(owner.state,'windup','irrelevant status does not suppress this family');
  owner[suppressedBy]={remaining:1};tick(f);assert.equal(owner.state,'recovery');owner.timer=0;const x=owner.x;owner.x=420;tick(f);assert.ok(owner.x<420,'pursuit remains active');assert.notEqual(owner.state,'windup');
  owner.gate={objective:'synthetic_expert_fixture',minimum:1};f.b.seed=seedFor(next=>next()<.1);f.b.p.invuln=0;incoming(f,{owner,damageType:'fire'});tick(f,{},.05);close(owner.disarm.remaining,2);close(owner.silence.remaining,2);assert.notEqual(owner.x,x);
 }
});

test('real Lawbringer actual 10/15/20% RNG path has deterministic distribution sanity, not a balance measurement',()=>{
 for(let rank=1;rank<=3;rank++){
  const f=fixture({lawbringer:rank}),owner=enemy(f,{x:350});let successes=0;const count=1000;
  for(let i=0;i<count;i++){f.b.p.hp=f.b.stats.hpMax;f.b.p.invuln=0;incoming(f,{owner,x:f.b.p.x,damage:1,damageType:'fire'});const roll=tick(f,{},0).find(e=>e.type==='lawbringerRolled');assert.ok(roll);if(roll.success)successes++;}
  const expected=[.1,.15,.2][rank-1];assert.ok(Math.abs(successes/count-expected)<.045,`rank ${rank}: ${successes}/${count}`);assert.equal(f.b.combatDraws,count);
 }
});

test('real Guilt and Flaming splashes honor exact radius and wall LOS; corpse origin still has one defeat receipt',()=>{
 for(const kind of ['guilt','flaming']){
  const f=fixture(kind==='guilt'?{guilt_by_association:1}:{flaming_wrath:1});const origin=enemy(f,{id:'a-origin',x:340,hp:1});if(kind==='guilt')origin.disarm={remaining:2};const radius=kind==='guilt'?80:64;
  const edge=enemy(f,{id:'b-edge',x:340,y:300+radius}),outside=enemy(f,{id:'c-outside',x:340,y:300+radius+.001});f.b.seed=kind==='guilt'?noncriticalSeed():seedFor(next=>next()<.1);cast(f,kind==='guilt'?'attack':'hammer');const events=run(f,.65),id=kind==='guilt'?'guilt_by_association':'flaming_wrath';const splash=events.filter(e=>e.type==='enemyHit'&&e.context.originSkillId===id);assert.deepEqual(splash.map(e=>e.id),['b-edge']);assert.ok(edge.hp<edge.max);assert.equal(outside.hp,outside.max);assert.equal(events.filter(e=>e.type==='defeated'&&e.id===origin.id).length,1);
  const wall=fixture(kind==='guilt'?{guilt_by_association:1}:{flaming_wrath:1});wall.b.map=mapFromRegion({w:20,h:20,rooms:[{x:1,y:1,w:9,h:18},{x:11,y:1,w:8,h:18}]});wall.b.p.x=270;const source=enemy(wall,{id:'a-origin',x:300});if(kind==='guilt')source.silence={remaining:2};const hidden=enemy(wall,{id:'b-hidden',x:365});wall.b.seed=kind==='guilt'?noncriticalSeed():seedFor(next=>next()<.1);cast(wall,kind==='guilt'?'attack':'hammer');run(wall,.65);assert.equal(hidden.hp,hidden.max);
 }
});

test('real same-timestamp hammer targets claim Flaming in target-ID order independently of insertion order',()=>{
 function order(reverse){const f=fixture({flaming_wrath:3});const order=reverse?['z','a']:['a','z'];for(const id of order)enemy(f,{id,x:380,y:300});f.b.seed=seedFor(next=>next()<.2&&next()<.2);cast(f,'hammer');const events=until(f,()=>f.b.contacts>0);return events.filter(e=>e.type==='enemyHit').map(e=>({id:e.id,context:e.context,damage:e.damage,critical:e.critical}));}
 assert.deepEqual(order(false),order(true));
});

test('real returning hammer receipts, single payment and turn count are stable across .01/.02/.05 frames and repeated dt0',()=>{
 for(const branch of ['hammer_of_wrath','hammer_of_sundering']){
  const outcomes=[];
  for(const dt of [.01,.02,.05]){
   const f=fixture({hammer_of_devotion:1,[branch]:1});enemy(f,{x:440});f.b.seed=noncriticalSeed();const start=cast(f,'hammer');f.b.p.manaDelay=100;const paid=f.b.p.mana,events=[...start];
   events.push(...until(f,()=>!f.b.p.action&&!f.b.shots.length,{dt}));for(let i=0;i<10;i++)events.push(...tick(f,{},0));
   const roots=events.filter(e=>e.type==='enemyHit'&&e.context.procDepth===0);outcomes.push({root:roots.map(e=>({id:e.context.hitId,damage:e.damage,critical:e.critical})),starts:events.filter(e=>e.type==='actionStarted').length,turns:events.filter(e=>e.type==='hammerReturned').length,paid});
  }
  assert.deepEqual(outcomes[0],outcomes[1],branch);assert.deepEqual(outcomes[1],outcomes[2],branch);assert.equal(outcomes[0].starts,1);assert.equal(outcomes[0].turns,1);
 }
});

test('real positive and failed Lawbringer RNG outcomes resume after load instead of replaying the same draw',()=>{
 const f=fixture({lawbringer:1}),owner=enemy(f);f.b.seed=seedFor(next=>next()<.1&&next()>.1);incoming(f,{owner,x:f.b.p.x,damage:1});const first=tick(f,{},0).find(e=>e.type==='lawbringerRolled');assert.equal(first.success,true);
 const report=battleReport(f.b),loaded=createBattle({...f.s,...report});loaded.map=f.b.map;loaded.enemies=[];loaded.awaitingAdvance=false;const next={s:f.s,b:loaded},other=enemy(next);next.b.p.invuln=0;incoming(next,{owner:other,x:next.b.p.x,damage:1});const second=tick(next,{},0).find(e=>e.type==='lawbringerRolled');assert.equal(second.success,false);assert.equal(next.b.combatDraws,2);assert.notEqual(next.b.seed,report.recovery.combatRng.state);
});

test('real flame contact exposes exact accepted footprint metadata without changing hit geometry',()=>{const f=fixture({flames_of_devotion:1});cast(f,'attack');const spec=f.b.p.action.spec;until(f,()=>f.b.p.action.fired);const effect=f.b.effects.find(e=>e.expertFootprint?.skillId==='flames_of_devotion');assert.deepEqual(effect.expertFootprint,{skillId:'flames_of_devotion',range:spec.flameArc.range,arcRadians:spec.flameArc.arcRadians});});
