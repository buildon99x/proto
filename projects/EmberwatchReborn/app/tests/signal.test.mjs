import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';

// Historical integration-preview transforms are retained as a regression
// detector. The first test now requires ZERO transforms: all runtime wiring
// must exist in the production source, rather than being supplied by a hook.
// The original preview could add only these hooks:
// 1. world.js: import/spread S regions, foes and town links.
// 2. state.js: import/route S commands and append S progress validation.
// 3. campaign.js: import/select S portal guard. Existing combat settlement,
//    life/death, economy, validation, store and controller code is unchanged.
// After parent integration the corresponding hook becomes a no-op. Real
// runtime tests/browser QA must be rerun by the integrator on that exact source.
const previewEdits=[];
const hook=registerHooks({load(url,context,nextLoad){
 const result=nextLoad(url,context);if(!url.includes('/app/src/'))return result;
 let source=typeof result.source==='string'?result.source:result.source?.toString();if(!source)return result;
 const replace=(from,to)=>{assert.ok(source.includes(from),`preview integration anchor missing in ${url}: ${from}`);source=source.replace(from,to);};
 if(url.endsWith('/world.js')&&!source.includes('signal-content.js')){
  source="import {SIGNAL_REGIONS,SIGNAL_FOES,SIGNAL_LINKS} from './signal-content.js';\n"+source;
  replace('...PASS_FOES,','...PASS_FOES,...SIGNAL_FOES,');replace('...PASS_REGIONS,','...PASS_REGIONS,...SIGNAL_REGIONS,');replace('...PASS_LINKS.ash_hamlet,','...PASS_LINKS.ash_hamlet,...SIGNAL_LINKS.ash_hamlet,');previewEdits.push('world registration');
 }
 if(url.endsWith('/state.js')&&!source.includes("from './signal.js'")){
  source="import {SIGNAL_COMMANDS,reduceSignal,validateSignalProgress} from './signal.js';\n"+source;
  replace('const pass=validatePassProgress(state);if(!pass.ok)return pass;','const pass=validatePassProgress(state);if(!pass.ok)return pass;\n  const signal=validateSignalProgress(state);if(!signal.ok)return signal;');
  replace('if(PASS_COMMANDS.has(command.type))',"if(SIGNAL_COMMANDS.has(command.type)){const result=reduceSignal(state,command);if(!result.ok)return result;const check=validateState(result.state);return check.ok?result:check;}\n  if(PASS_COMMANDS.has(command.type))");previewEdits.push('state routing/validation');
 }
 if(url.endsWith('/campaign.js')&&!source.includes("from './signal.js'")){
  source="import {signalPortalAllowed} from './signal.js';\n"+source;
  replace("const allowed=portal.gate?.startsWith('pass_')?", "const allowed=portal.gate?.startsWith('signal_')?signalPortalAllowed(next,portal):portal.gate?.startsWith('pass_')?");previewEdits.push('campaign portal guard');
 }
 return {...result,source};
}});
const [{createState,reduceRuntime,validateState},{SIGNAL_REGIONS,SIGNAL_FOES,SIGNAL_LINKS,SIGNAL_GROUPS,SIGNAL_REWARDS,SIGNAL_PROGRESS_DEFAULTS,SIGNAL_RECEIPTS,SIGNAL_TOOLS,SIGNAL_ROUTES},
 {SIGNAL_COMMANDS,reduceSignal,validateSignalProgress,signalPortalAllowed,signalTierAllowed,signalMap},{signalObjectView,signalGuidance,signalBlacksmithView},
 {getRegion,createMap,inMap,lineOfSight,findPathStep},{createBattle,stepBattle},{emptyRecovery},{createStore,createSession},{createController},
 {report,run,travel,settle},{earnedPassRoute}]=await Promise.all([
 import('../src/state.js'),import('../src/signal-content.js'),import('../src/signal.js'),import('../src/signal-presentation.js'),import('../src/world.js'),
 import('../src/combat.js'),import('../src/recovery.js'),import('../src/save.js'),import('../src/controller.js'),import('./support/earned-route.mjs'),import('./support/earned-pass-route.mjs'),
]);
hook.deregister();
// SCRIPTED SETTLEMENT FIXTURES, not actual combat or normal-input completion.
// Coordinates/kill reports go through real handlers. No XP, level, skill rank
// or progress flag is assigned in earned paths. Corruption/resource boundary
// fixtures are explicitly named below and are never progression evidence.
const copy=x=>structuredClone(x),freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const smith={x:250,y:470},cache=new Map(),region=SIGNAL_REGIONS.signal_basin;
function predecessor(difficulty='normal',full=false){const key=difficulty+full;if(!cache.has(key))cache.set(key,earnedPassRoute(difficulty,{full}));return copy(cache.get(key));}
const quest=(s,type)=>({type,...report(s,smith)}),point=id=>region.objects.find(o=>o.id===id),at=(s,id)=>({type:'interactSignal',objectId:id,...report(s,point(id))});
const interact=(s,id)=>run(s,at(s,id)).state;
function accepted(difficulty='normal',full=false){const s=predecessor(difficulty,full);return run(s,quest(s,'acceptSignalQuest')).state;}
const enter=(difficulty='normal',full=false)=>travel(accepted(difficulty,full),'town-signal-entry');
function decoded(difficulty='normal',full=false){let s=enter(difficulty,full);s=settle(s,SIGNAL_GROUPS.entry,point('signal-code'));return interact(s,'signal-code');}
function chosen(direction='west',difficulty='normal',full=false,shortcut=true){let s=decoded(difficulty,full);if(shortcut)s=interact(s,'signal-shortcut');for(const node of SIGNAL_ROUTES[direction].order)s=interact(s,'signal-route-'+node);return s;}
function transmitted(direction='west',difficulty='normal',full=false,shortcut=true){let s=chosen(direction,difficulty,full,shortcut);s=settle(s,SIGNAL_GROUPS.yard,point('signal-transmitter'));return interact(s,'signal-transmitter');}
function restored(direction='west',difficulty='normal',full=false,shortcut=true){let s=transmitted(direction,difficulty,full,shortcut);s=settle(s,SIGNAL_GROUPS.receiver,point('signal-receiver'));return interact(s,'signal-receiver');}
function finished(direction='west',difficulty='normal',full=false,shortcut=true){let s=restored(direction,difficulty,full,shortcut);s=travel(s,shortcut?'signal-town-shortcut':'signal-town-return');return run(s,quest(s,'reportSignalQuest')).state;}
function rejected(s,c,code,{direct=false}={}){const before=copy(s),request=copy(c),r=(direct?reduceSignal:reduceRuntime)(freeze(s),freeze(c));assert.equal(r.ok,false,JSON.stringify(r));if(code)assert.equal(r.code,code,JSON.stringify(r));assert.deepEqual(s,before);assert.deepEqual(c,request);return r;}
const memory=()=>{const data=new Map();return {data,getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};},locked={request:async(_key,_options,fn)=>fn()};

test('integrated production runtime requires no registration/routing preview transforms',()=>{
 assert.deepEqual(previewEdits,[],'S must be wired in production source; a preview hook cannot satisfy integration');
 assert.ok(previewEdits.every(x=>['world registration','state routing/validation','campaign portal guard'].includes(x)));
 assert.equal(new Set(previewEdits).size,previewEdits.length);assert.equal(SIGNAL_COMMANDS.size,3);assert.equal(SIGNAL_RECEIPTS.length,8);
});
test('authored content has 16 unique Adept foes, exact 720XP/92G combat and 420XP/140G objectives',()=>{
 assert.equal(region.foes.length,16);assert.deepEqual(Object.values(SIGNAL_GROUPS).map(x=>x.length),[6,6,4]);
 let xp=0,gold=0;for(const row of region.foes){const f=SIGNAL_FOES[row.kind];assert.equal(f.tier,'adept');assert.ok(f.hp<=82);xp+=f.xp;gold+=f.gold;assert.ok(['melee','ranged','cleave'].includes(f.style));assert.ok(f.patterns.every(p=>['line','cone'].includes(p.shape)));}assert.equal(xp,720);assert.equal(gold,92);
 assert.equal(Object.values(SIGNAL_REWARDS).reduce((n,r)=>n+r.xp,0),420);assert.equal(Object.values(SIGNAL_REWARDS).reduce((n,r)=>n+r.gold,0),140);
 const old=['ash_hamlet','ash_road','sluice_upper','sluice_lower','ember_quarry','ashwind_pass'];for(const key of ['foes','objects']){const ids=old.flatMap(id=>getRegion(id)[key].map(x=>x.id));assert.equal(new Set([...ids,...region[key].map(x=>x.id)]).size,ids.length+region[key].length);}
 assert.equal(SIGNAL_TOOLS.signal_cipher.consumed,false);assert.equal(Object.isFrozen(SIGNAL_REGIONS.signal_basin.foes),true);
});
for(const full of [false,true])for(const difficulty of ['easy','normal','hard','serious'])test(`earned ${full?'full':'minimum'} ${difficulty} preview path keeps exact S budget and no automatic promotion`,()=>{
 const start=predecessor(difficulty,full),s=finished('west',difficulty,full);const hard=['hard','serious'].includes(difficulty);
 assert.equal(s.stats.earnedXp-start.stats.earnedXp,hard?960:1140);assert.equal(s.gold-start.gold,232);assert.equal(s.stats.kills-start.stats.kills,16);assert.equal(s.character.tier,'adept');assert.equal(s.world.objectives.signal_reported,1);
 assert.equal(s.stats.earnedXp,full?(hard?3435.125:3995.5):(hard?3229.5:3761));assert.ok(s.character.level<15);
 for(const [key,n]of Object.entries({iron:4,wood:1,thread:3,ember_shard:1}))assert.equal(s.inventory.materials[key]-(start.inventory.materials[key]??0),n);
 assert.equal(s.inventory.consumables.health_potion-start.inventory.consumables.health_potion,1);assert.equal(validateState(s).ok,true);assert.equal(validateSignalProgress(s).ok,true);
});
test('both legal orders alter approach doors to same arena and yield identical non-route rewards',()=>{
 const a=chosen('west'),b=chosen('east');for(const [s,west,east]of [[a,true,false],[b,false,true]]){const map=signalMap(s);assert.equal(inMap(map,144,496),west);assert.equal(inMap(map,688,496),east);assert.ok(findPathStep(map,region.spawn,point('signal-transmitter')));assert.equal(findPathStep(map,region.spawn,point('signal-receiver')),null);}
 const fa=finished('west'),fb=finished('east');assert.equal(fa.stats.earnedXp,fb.stats.earnedXp);assert.equal(fa.gold,fb.gold);assert.deepEqual(fa.inventory,fb.inventory);assert.deepEqual(fa.world.defeated,fb.world.defeated);
 assert.ok(fa.world.claimedRewards.includes('r8:s:route-west'));assert.ok(!fa.world.claimedRewards.includes('r8:s:route-east'));assert.ok(fb.world.claimedRewards.includes('r8:s:route-east'));
});
test('compact map has traversable objectives, no disconnected foe or portal and locked receiver route',()=>{
 const done=restored();const map=signalMap(done);for(const row of [...region.foes,...region.objects,...region.portals,region.spawn]){assert.equal(inMap(map,row.x,row.y),true,row.id);assert.ok(findPathStep(map,region.spawn,row),row.id);}
 const s=decoded(),m=signalMap(s);assert.equal(findPathStep(m,region.spawn,point('signal-transmitter')),null);assert.ok(findPathStep(m,region.spawn,point('signal-code')));assert.ok(findPathStep(m,region.spawn,point('signal-shortcut')));
 assert.ok(region.w<=26&&region.h<=23);assert.deepEqual(map,createMap('signal_basin',done));
});
test('two authored approach paths reach yard from opposing sides rather than teleporting',()=>{
 function path(s){const map=signalMap(s),goal=point('signal-transmitter'),points=[region.spawn];let p=region.spawn;for(let n=0;n<1000&&Math.hypot(p.x-goal.x,p.y-goal.y)>1;n++){p=findPathStep(map,p,goal);assert.ok(p);points.push(p);}assert.ok(points.length<1000);return points;}
 const west=path(chosen('west')),east=path(chosen('east'));assert.ok(west.some(p=>p.x<192&&p.y<512));assert.ok(east.some(p=>p.x>640&&p.y<512));assert.ok(!west.some(p=>p.x>640&&p.y<512));assert.ok(!east.some(p=>p.x<192&&p.y<512));
});
test('quest acceptance requires genuine Pass completion, correct NPC, living life, and no fee',()=>{
 const s=predecessor(),r=reduceSignal(s,quest(s,'acceptSignalQuest'));assert.equal(r.ok,true);assert.equal(r.state.gold,s.gold);assert.equal(r.state.stats.earnedXp,s.stats.earnedXp);assert.deepEqual(r.state.vitals,s.vitals);assert.deepEqual(r.state.recovery,s.recovery);assert.deepEqual(r.state.world.defeated,s.world.defeated);
 rejected(s,{...quest(s,'acceptSignalQuest'),position:{x:450,y:325}},'BLACKSMITH_REQUIRED',{direct:true});
 rejected(s,{...quest(s,'acceptSignalQuest'),life:s.world.life+1},'STALE_LIFE',{direct:true});
 rejected(r.state,quest(r.state,'acceptSignalQuest'),'ALREADY_ACCEPTED');
 const missing=copy(s);missing.world.claimedRewards=missing.world.claimedRewards.filter(id=>id!=='r7:p:report');rejected(missing,quest(missing,'acceptSignalQuest'),'ADEPT_REQUIRED',{direct:true});
 assert.equal(signalTierAllowed('adept'),true);assert.equal(signalTierAllowed('apprentice'),false);assert.equal(signalTierAllowed('expert'),true); // complete historical guards still required
});
test('ordinary progression failures block decode, future fights and objective rewards',()=>{
 let s=enter();rejected(s,at(s,'signal-code'),'ENTRY_GUARDS_ALIVE');rejected(s,at(s,'signal-route-transmitter'),'DECODE_REQUIRED');rejected(s,at(s,'signal-shortcut'),'DECODE_REQUIRED');
 rejected(s,{type:'settleCombat',defeated:SIGNAL_GROUPS.yard,...report(s)},'ENCOUNTER_LOCKED');
 s=decoded();rejected(s,{type:'settleCombat',defeated:SIGNAL_GROUPS.yard,...report(s)},'ENCOUNTER_LOCKED');
 s=chosen();rejected(s,at(s,'signal-transmitter'),'YARD_GUARDS_ALIVE');rejected(s,{type:'settleCombat',defeated:SIGNAL_GROUPS.receiver,...report(s)},'ENCOUNTER_LOCKED');
 s=transmitted();rejected(s,at(s,'signal-receiver'),'RECEIVER_GUARDS_ALIVE');s=travel(s,'signal-town-shortcut');rejected(s,quest(s,'reportSignalQuest'),'RECEIVER_REQUIRED');
});
test('wrong repeated input resets only unfinished sequence; reread never awards again',()=>{
 let s=decoded(),before=copy(s);s=interact(s,'signal-code');assert.equal(s.stats.earnedXp,before.stats.earnedXp);assert.deepEqual(s.inventory,before.inventory);
 s=interact(s,'signal-route-transmitter');assert.equal(s.world.objectives.signal_route_step,1);const r=run(s,at(s,'signal-route-transmitter'));s=r.state;assert.equal(s.world.objectives.signal_route_step,0);assert.equal(s.world.objectives.signal_route_first,0);assert.ok(r.events.some(e=>e.type==='signalRouteReset'));assert.equal(s.gold,before.gold);assert.deepEqual(s.world.claimedRewards,before.world.claimedRewards);
 for(const node of SIGNAL_ROUTES.east.order)s=interact(s,'signal-route-'+node);assert.equal(s.world.objectives.signal_east_open,1);rejected(s,at(s,'signal-route-transmitter'),'ALREADY_OPEN');
});
test('shortcut opens after decode independently of route/final reward and preserves resources/recovery',()=>{
 let s=decoded();const c={...at(s,'signal-shortcut'),vitals:{hp:15,mana:4,stamina:8},recovery:{...emptyRecovery(),cooldowns:{righteous_hammer:2},lock:.1,manaDelay:2,potionCooldown:3}};const before=copy(s);s=run(s,c).state;
 assert.equal(s.world.objectives.signal_route_ready,0);assert.equal(s.world.objectives.signal_receiver_restored,0);assert.equal(s.gold,before.gold);assert.equal(s.stats.earnedXp,before.stats.earnedXp);assert.deepEqual(s.vitals,c.vitals);assert.deepEqual(s.recovery,c.recovery);
 s=travel(s,'signal-town-shortcut');s=travel(s,'town-signal-shortcut');assert.deepEqual(s.vitals,c.vitals);assert.deepEqual(s.recovery,c.recovery);rejected(s,at(s,'signal-shortcut'),'ALREADY_OPEN');
 assert.equal(finished('east','normal',false,false).world.objectives.signal_shortcut_open,0);
});
test('portal guards reject unknown/corrupt prerequisites, locked shortcut, and dead state',()=>{
 assert.equal(signalPortalAllowed(createState(),SIGNAL_LINKS.ash_hamlet[0]).code,'ADEPT_REQUIRED');assert.equal(signalPortalAllowed(predecessor(),SIGNAL_LINKS.ash_hamlet[0]).code,'QUEST_REQUIRED');
 assert.equal(signalPortalAllowed(accepted(),SIGNAL_LINKS.ash_hamlet[0]).ok,true);assert.equal(signalPortalAllowed(accepted(),SIGNAL_LINKS.ash_hamlet[1]).code,'SHORTCUT_REQUIRED');assert.equal(signalPortalAllowed(accepted(),{gate:'signal_unknown'}).code,'UNKNOWN_GATE');
 const s=settle(decoded(),[],point('signal-code'),{vitals:{hp:0,mana:0,stamina:0}});assert.equal(signalPortalAllowed(s,SIGNAL_LINKS.ash_hamlet[0]).code,'HERO_DOWN');
});
test('stale-life travel cannot use entry or independent return shortcut',()=>{
 for(const [s,p]of [[accepted(),SIGNAL_LINKS.ash_hamlet[0]],[chosen(),region.portals[1]]])rejected(s,{type:'travel',portalId:p.id,to:p.to,...report(s,p),life:s.world.life+1},'STALE_LIFE');
});
test('all objective/report rewards are once-only including full reload',()=>{
 const s=finished(),xp=s.stats.earnedXp,gold=s.gold,m=memory(),store=createStore(m);assert.equal(store.save(s,{expectedRevision:0}).ok,true);let n=store.load().state;rejected(n,quest(n,'reportSignalQuest'),'ALREADY_CLAIMED');n=travel(n,'town-signal-shortcut');for(const id of ['signal-transmitter','signal-receiver'])rejected(n,at(n,id),'ALREADY_CLAIMED');n=settle(n,region.foes.map(f=>f.id));assert.equal(n.stats.earnedXp,xp);assert.equal(n.gold,gold);assert.equal(createBattle(n).enemies.length,0);
});
test('partial order survives real JSON store, town round-trip, death/retry and chosen opposite route',()=>{
 let s=decoded();s=interact(s,'signal-shortcut');s=interact(s,'signal-route-receiver');const m=memory(),store=createStore(m,{profile:'qa-signal-partial'}),receipts=copy(s.world.claimedRewards),dead=copy(s.world.defeated);assert.equal(store.save(s,{expectedRevision:0}).ok,true);s=createStore(m,{profile:'qa-signal-partial'}).load().state;assert.equal(s.world.objectives.signal_route_step,1);assert.equal(s.world.objectives.signal_route_first,2);
 s=travel(s,'signal-town-shortcut');s=travel(s,'town-signal-shortcut');assert.equal(s.world.objectives.signal_route_step,1);s=settle(s,[],s.world.position,{vitals:{...s.vitals,hp:0}});assert.equal(s.world.lifeDown,true);rejected(s,at(s,'signal-route-transmitter'),'HERO_DOWN');assert.equal(store.save(s,{expectedRevision:1}).ok,true);s=store.load().state;s=run(s,{type:'retry'}).state;assert.deepEqual(s.world.claimedRewards,receipts);assert.deepEqual(s.world.defeated,dead);s=travel(s,'town-signal-shortcut');s=interact(s,'signal-route-transmitter');assert.equal(s.world.objectives.signal_east_open,1);assert.equal(s.world.objectives.signal_west_open,0);
});
test('last receiver guard and hero die in one settlement: kill persists, no auto-objective or duplicate death fee',()=>{
 let s=transmitted('east','hard');s=settle(s,SIGNAL_GROUPS.receiver.slice(0,3),point('signal-receiver'));const xp=s.stats.earnedXp;s=settle(s,SIGNAL_GROUPS.receiver.slice(3),point('signal-receiver'),{vitals:{...s.vitals,hp:0}});assert.equal(s.stats.earnedXp,xp+45);assert.equal(s.world.lifeDown,true);assert.equal(s.world.objectives.signal_receiver_restored,0);const dead=copy(s.world.defeated),deaths=s.stats.deaths;rejected(s,at(s,'signal-receiver'),'HERO_DOWN');rejected(s,{type:'settleCombat',defeated:[],...report(s)},'STALE_ENCOUNTER');s=run(s,{type:'retry'}).state;s=travel(s,'town-signal-shortcut');assert.deepEqual(s.world.defeated,dead);assert.equal(s.stats.deaths,deaths);s=interact(s,'signal-receiver');assert.equal(s.stats.earnedXp,xp+45+120);
});
test('direct reducer rejects malformed command/accessor/extra payload without mutation or getter execution',()=>{
 const s=decoded();for(const change of [c=>c.life=-1,c=>c.life=1.1,c=>c.position.x=Infinity,c=>c.position.extra=1,c=>c.vitals.hp=-1,c=>c.vitals.hp=1e7,c=>c.objectId='',c=>c.extra=true,c=>c.recovery={cooldowns:{}}]){const c=at(s,'signal-route-transmitter');change(c);assert.equal(reduceSignal(s,c).ok,false);}
 let reads=0;const c=at(s,'signal-route-transmitter');Object.defineProperty(c,'injected',{enumerable:true,get(){reads++;return 1;}});assert.equal(reduceSignal(s,c).ok,false);assert.equal(reads,0);
 rejected(s,{...at(s,'signal-code'),position:{x:0,y:0}},'INVALID_REPORT',{direct:true});rejected(s,{...at(s,'signal-code'),position:{x:112,y:656}},'OBJECT_REQUIRED',{direct:true});rejected(s,{...at(s,'signal-code'),objectId:'pass-clue'},'UNKNOWN_OBJECT',{direct:true});
});
test('corrupt progress rejects exact receipt/tool mismatches, unknown flags and invalid bounded route',()=>{
 const source=chosen();for(const edit of [s=>delete s.world.objectives.signal_decoded,s=>s.world.objectives.signal_future=1,s=>s.world.objectives.signal_route_step=3,s=>s.world.objectives.signal_route_first=0,s=>s.world.objectives.signal_east_open=1,s=>s.world.claimedRewards.push('r8:s:future'),s=>s.world.claimedRewards.push('r8:s:route-east'),s=>s.world.claimedRewards=s.world.claimedRewards.filter(id=>id!=='r8:s:route-west'),s=>s.inventory.tools=s.inventory.tools.filter(id=>id!=='signal_cipher'),s=>s.inventory.tools.push('signal_future')]){const s=copy(source);edit(s);assert.equal(validateSignalProgress(s).ok,false);}
 const untouched=createState();assert.equal(validateSignalProgress(untouched).ok,true);assert.equal(Object.keys(untouched.world.objectives).some(k=>k.startsWith('signal_')),false);
});
test('corrupt future kills, predecessor report and receiver/report chains fail closed',()=>{
 for(const [source,edit]of [[enter(),s=>s.world.defeated.signal_basin=SIGNAL_GROUPS.yard],[decoded(),s=>s.world.defeated.signal_basin.push(...SIGNAL_GROUPS.yard)],[chosen(),s=>s.world.defeated.signal_basin.push(...SIGNAL_GROUPS.receiver)],[finished(),s=>s.world.defeated.signal_basin.pop()],[chosen(),s=>s.world.claimedRewards=s.world.claimedRewards.filter(id=>id!=='r7:p:report')]]){const s=copy(source);edit(s);assert.equal(validateSignalProgress(s).ok,false);}
});
test('corrupt life, location, resources, recovery and economy reject direct commands before cloning',()=>{
 const source=decoded();for(const edit of [s=>s.world.life=-1,s=>s.world.lifeDown=1,s=>s.vitals.hp=0,s=>s.world.lifeDown=true,s=>s.world.position={x:0,y:0},s=>s.world.position.extra=2,s=>s.vitals.mana=Infinity,s=>s.vitals.mana=-1,s=>s.vitals.hp=1e6,s=>s.recovery.cooldowns.righteous_hammer=61,s=>s.gold++,s=>s.stats.kills=-1,s=>s.inventory.materials.iron=-1,s=>s.world.visited=s.world.visited.filter(x=>x!=='signal_basin')]){const s=copy(source);edit(s);assert.equal(validateSignalProgress(s).ok,false);assert.equal(reduceSignal(s,at(s,'signal-code')).ok,false);}
});
test('malformed state trees reject sparse arrays, cyclic objects, accessors and coercion',()=>{
 for(const edit of [s=>s.world.visited='signal_basin',s=>s.world.defeated.signal_basin={},s=>s.inventory.tools=new Array(1),s=>s.world.objectives.signal_decoded=NaN,s=>s.world.claimedRewards.push(1),s=>s.self=s]){const s=decoded();edit(s);assert.equal(validateSignalProgress(s).ok,false);}
 let reads=0;const s=decoded();Object.defineProperty(s,'bad',{enumerable:true,get(){reads++;return 1;}});assert.equal(validateSignalProgress(s).ok,false);assert.equal(reads,0);
});
test('receipt, material and gold overflow abort entire final reward transaction',()=>{
 let base=transmitted();base=settle(base,SIGNAL_GROUPS.receiver,point('signal-receiver'));
 for(const edit of [s=>{s.stats.earnedGold=Number.MAX_SAFE_INTEGER;s.stats.spentGold=Number.MAX_SAFE_INTEGER-s.gold;},s=>s.inventory.materials.iron=Number.MAX_SAFE_INTEGER,s=>s.inventory.consumables.health_potion=Number.MAX_SAFE_INTEGER]){const bad=copy(base);edit(bad);rejected(bad,at(bad,'signal-receiver'),'VALUE_OVERFLOW');}
 const full=copy(base);while(full.world.claimedRewards.length<4096)full.world.claimedRewards.push('fixture:'+full.world.claimedRewards.length);rejected(full,at(full,'signal-receiver'),'RECEIPT_LIMIT');
});
test('zero-gold resource boundary fixture has no entry or mandatory puzzle fee',()=>{
 let s=predecessor();s.stats.spentGold+=s.gold;s.gold=0; // Explicit economy constraint, not earned progression evidence.
 s=run(s,quest(s,'acceptSignalQuest')).state;assert.equal(s.gold,0);s=travel(s,'town-signal-entry');assert.equal(s.gold,0);s=settle(s,SIGNAL_GROUPS.entry);s=interact(s,'signal-code');const gold=s.gold;s=interact(s,'signal-route-transmitter');s=interact(s,'signal-route-receiver');assert.equal(s.gold,gold);assert.equal(s.world.objectives.signal_route_ready,1);
});
test('save/controller queues report once and another tab cannot commit same receipt',async()=>{
 const m=memory(),opts={profile:'qa-signal-tabs'},store=createSession(m,locked,opts);const s=travel(restored(),'signal-town-shortcut');assert.equal((await store.save(s,{expectedRevision:0})).ok,true);const a=createController(store),b=createController(createSession(m,locked,opts));await a.load();await b.load();const c=quest(s,'reportSignalQuest');const [one,two]=await Promise.all([a.dispatch(c),a.dispatch(c)]);assert.equal(one.ok,true);assert.equal(two.code,'ALREADY_CLAIMED');assert.equal((await b.dispatch(c)).code,'CONFLICT');assert.deepEqual(b.snapshot(),s);await b.load();assert.equal((await b.dispatch(c)).code,'ALREADY_CLAIMED');assert.equal(b.snapshot().gold,s.gold+60);assert.equal(b.snapshot().world.claimedRewards.filter(id=>id==='r8:s:report').length,1);
});
for(const afterWrite of [false,true])test(`real store ${afterWrite?'post':'pre'}-head failure leaves receiver reward all-or-nothing`,async()=>{
 const m=memory(),store=createSession(m,locked,{profile:'qa-signal-uncertain'});let s=transmitted();s=settle(s,SIGNAL_GROUPS.receiver,point('signal-receiver'));assert.equal((await store.save(s,{expectedRevision:0})).ok,true);const c=createController(store);await c.load();const command=at(s,'signal-receiver'),original=m.setItem;
 m.setItem=(key,value)=>{if(key!==store.keys.head||afterWrite)original(key,value);if(key===store.keys.head)throw new Error('fixture: head write failed');};assert.equal((await c.dispatch(command)).code,'COMMIT_UNCERTAIN');assert.deepEqual(c.snapshot(),s);assert.equal((await c.dispatch(command)).blocked,true);m.setItem=original;await c.load();assert.equal(c.snapshot().world.objectives.signal_receiver_restored,afterWrite?1:0);const retry=await c.dispatch(command);assert.equal(retry.ok,!afterWrite);if(afterWrite)assert.equal(retry.code,'ALREADY_CLAIMED');assert.equal(c.snapshot().stats.earnedXp,s.stats.earnedXp+120);assert.equal(c.snapshot().gold,s.gold+40);assert.equal(c.snapshot().inventory.materials.iron,s.inventory.materials.iron+4);
});
test('two tabs cannot commit opposite approach routes from the same partial sequence revision',async()=>{
 const m=memory(),options={profile:'qa-signal-route-tabs'},store=createSession(m,locked,options);let s=decoded();s=interact(s,'signal-route-transmitter');await store.save(s,{expectedRevision:0});const a=createController(store),b=createController(createSession(m,locked,options));await a.load();await b.load();assert.equal((await a.dispatch(at(s,'signal-route-receiver'))).ok,true);assert.equal((await b.dispatch(at(s,'signal-route-transmitter'))).code,'CONFLICT');await b.load();assert.equal(b.snapshot().world.objectives.signal_west_open,1);assert.equal((await b.dispatch(at(b.snapshot(),'signal-route-transmitter'))).code,'ALREADY_OPEN');
});
test('runner and keeper real generic AI alternate distinct locked cone tells; archer uses existing line',()=>{
 const s=enter(),b=createBattle(s);b.awaitingAdvance=false;const e=b.enemies.find(e=>e.kind==='signal_runner');e.active=true;b.p.x=e.x-35;b.p.y=e.y;stepBattle(b,s.character,.02,{});assert.equal(e.attackSpec.id,'signal-runner-thrust');assert.equal(e.telegraph.shapes[0].halfAngle,.32);e.state='idle';e.timer=0;e.telegraph=null;stepBattle(b,s.character,.02,{});assert.equal(e.attackSpec.id,'signal-runner-cut');assert.equal(e.telegraph.shapes[0].halfAngle,.9);
 const archer=b.enemies.find(e=>e.kind==='signal_archer');archer.state='idle';archer.timer=0;archer.active=true;b.p.x=archer.x-50;b.p.y=archer.y;stepBattle(b,s.character,.02,{});assert.equal(archer.telegraph.shapes[0].type,'line');assert.equal(archer.windupDuration,1.2);
 const n=transmitted(),fight=createBattle(n),keeper=fight.enemies.find(e=>e.kind==='signal_keeper');fight.awaitingAdvance=false;keeper.active=true;fight.p.x=keeper.x+35;fight.p.y=keeper.y;stepBattle(fight,n.character,.02,{});assert.equal(keeper.attackSpec.id,'signal-keeper-stab');assert.equal(keeper.telegraph.shapes[0].r,112);keeper.state='idle';keeper.timer=0;keeper.telegraph=null;stepBattle(fight,n.character,.02,{});assert.equal(keeper.attackSpec.id,'signal-keeper-sweep');assert.equal(keeper.telegraph.shapes[0].r,68);
});
test('guidance gives ordered route, correct blacksmith and truthful campaign boundary',()=>{
 assert.equal(signalGuidance(createState()),null);assert.equal(signalBlacksmithView(createState()),null);assert.equal(signalGuidance(predecessor()).id,'signal-accept');assert.equal(signalBlacksmithView(predecessor()).action,'accept');assert.equal(signalGuidance(enter()).id,'signal-decode');let s=decoded();assert.equal(signalGuidance(s).id,'signal-route');s=interact(s,'signal-route-transmitter');assert.match(signalGuidance(s).detail,/1\/2.*수신/);assert.equal(signalGuidance(chosen()).id,'signal-transmitter');assert.equal(signalGuidance(transmitted()).id,'signal-receiver');assert.equal(signalGuidance(restored()).id,'signal-report');assert.equal(signalBlacksmithView(restored()).action,'report');const done=finished();assert.equal(signalGuidance(done).id,'signal-complete');assert.match(signalGuidance(done).detail,/아직 구현되지/);assert.equal(signalBlacksmithView(done).action,null);
 for(const o of region.objects){const v=signalObjectView(done,o);assert.equal(v.actions.length,o.actionKind==='decode'?1:0);if(['transmitter','receiver','shortcut'].includes(o.actionKind))assert.doesNotMatch(v.detail,/처치하세요|처치가 필요|해독판을 얻으면/);}
});

test('closed north door blocks a nearby receiver interaction with line-of-sight guard',()=>{
 const s=chosen(),position={x:432,y:208};assert.equal(inMap(signalMap(s),position.x,position.y),true);assert.ok(Math.hypot(position.x-point('signal-receiver').x,position.y-point('signal-receiver').y)<=76);assert.equal(lineOfSight(signalMap(s),position,point('signal-receiver')),false);rejected(s,{...at(s,'signal-receiver'),position},'WALL_BLOCKED');
});
test('tool capacity and route receipt capacity failures leave input state intact',()=>{
 let s=enter();s=settle(s,SIGNAL_GROUPS.entry,point('signal-code'));while(s.inventory.tools.length<100)s.inventory.tools.push('fixture-tool-'+s.inventory.tools.length);rejected(s,at(s,'signal-code'),'VALUE_OVERFLOW');
 s=decoded();s=interact(s,'signal-route-transmitter');while(s.world.claimedRewards.length<4096)s.world.claimedRewards.push('fixture:'+s.world.claimedRewards.length);rejected(s,at(s,'signal-route-receiver'),'RECEIPT_LIMIT');assert.equal(s.world.objectives.signal_route_step,1);assert.equal(s.world.objectives.signal_route_ready,0);
});
test('S objective reward keeps reported paid resources and optional recovery omission intact',()=>{
 let s=chosen();s=settle(s,SIGNAL_GROUPS.yard,point('signal-transmitter'));const recovery={...emptyRecovery(),cooldowns:{righteous_hammer:1.5},lock:.2,manaDelay:2,staminaDelay:1,potionCooldown:3};
 const c={...at(s,'signal-transmitter'),vitals:{hp:12,mana:6,stamina:9},recovery},r=run(s,c);assert.deepEqual(r.state.vitals,c.vitals);assert.deepEqual(r.state.recovery,recovery);assert.ok(r.events.some(e=>e.type==='signalReward'&&e.xp===110&&e.gold===30));
 const before=copy(r.state.recovery),noRecovery=at(r.state,'signal-code');delete noRecovery.recovery;const n=run(r.state,noRecovery).state;assert.deepEqual(n.recovery,before);assert.deepEqual(n.vitals,r.state.vitals);
});
