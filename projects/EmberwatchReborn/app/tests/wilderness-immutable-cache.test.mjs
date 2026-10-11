import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {freezeOwnedSnapshot,isImmutableSnapshot} from '../src/immutable-snapshot.js';
import {validateWildernessProgress,validateWildernessAncestry,wildernessEligible,wildernessClue} from '../src/wilderness.js';
import {wildernessObjectView,wildernessPortalView,wildernessGuidance,wildernessElderView} from '../src/wilderness-presentation.js';
import {WILDERNESS_LINKS} from '../src/wilderness-content.js';
import {createBattle,stepBattle} from '../src/combat.js';
import {mainImports} from './support/main-imports.mjs';
import {W,stages} from './support/earned-wilderness-route.mjs';
let earned;const route=()=>earned??=stages();
const copy=structuredClone;
const mainSource=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const cacheSource=mainSource.slice(mainSource.indexOf('function wildernessView('),mainSource.indexOf('function interactionCandidates('));
const mainView=()=>new Function('deps',`const {${Object.keys(mainImports).join(',')}}=deps;${cacheSource};return wildernessView;`)(mainImports);
const validation=s=>({progress:validateWildernessProgress(s),ancestry:validateWildernessAncestry(s),eligible:wildernessEligible(s),clue:wildernessClue(s)});
const views=s=>({objects:W.objects.map(o=>wildernessObjectView(s,o)),portals:[...W.portals,...WILDERNESS_LINKS.ash_hamlet].map(o=>wildernessPortalView(s,o)),guidance:wildernessGuidance(s),elder:wildernessElderView(s,{revision:7})});
for(const stage of ['before','accepted','entered','survey','anchor','chosen','evidence','finished'])test(`immutable ${stage}: complete validation and every view equal fresh mutable calls`,()=>{
 const mutable=copy(route()[stage]),frozen=freezeOwnedSnapshot(copy(mutable)),before=JSON.stringify(frozen);
 assert.deepEqual(validation(frozen),validation(mutable));assert.deepEqual(views(frozen),views(mutable));assert.deepEqual(validation(frozen),validation(copy(mutable)));assert.equal(JSON.stringify(frozen),before);
});
const corruptions={
 objective:s=>s.world.objectives.wilderness_accepted=0,
 receipt:s=>s.world.claimedRewards.splice(s.world.claimedRewards.indexOf('r12:w:accept'),1),
 ancestry:s=>s.world.objectives.tomb_reported=0,
 vitals:s=>s.vitals.hp=999999,
 recovery:s=>s.recovery.lock=-1,
 economy:s=>s.gold++,
};
for(const [label,mutate] of Object.entries(corruptions))test(`mutable ${label} edit invalidates previous valid decision on same identity`,()=>{
 const s=copy(route().entered);assert.equal(validateWildernessProgress(s).ok,true);assert.equal(wildernessEligible(s),true);mutate(s);assert.equal(isImmutableSnapshot(s),false);assert.equal(validateWildernessProgress(s).ok,false);assert.equal(wildernessEligible(s),false);assert.deepEqual(validation(s),validation(copy(s)));
});
test('shallow-frozen root never reuses nested mutable validation or a main view',()=>{
 const s=Object.freeze(copy(route().entered));assert.equal(isImmutableSnapshot(s),false);assert.equal(validateWildernessProgress(s).ok,true);const view=mainView(),p=W.portals[0];assert.equal(view(s,'portal',p.id).allowed,true);s.world.objectives.wilderness_accepted=0;assert.equal(validateWildernessProgress(s).ok,false);assert.equal(view(s,'portal',p.id).allowed,false);
});
test('mutable main view observes in-place portal eligibility and completed changes',()=>{
 const s=copy(route().entered),view=mainView(),p=W.portals[0];assert.equal(view(s,'portal',p.id).allowed,true);s.world.lifeDown=true;s.vitals.hp=0;assert.deepEqual(view(s,'portal',p.id),wildernessPortalView(s,p));assert.equal(view(s,'portal',p.id).allowed,false);
 const object=W.objects.find(o=>o.actionKind==='hook');assert.equal(view(s,'object',object.id).completed,false);s.world.objectives.wilderness_hook_taken=1;assert.deepEqual(view(s,'object',object.id),wildernessObjectView(s,object));assert.equal(view(s,'object',object.id).completed,true);
});
test('fully frozen malformed state still validates and failure results cannot poison later calls',()=>{
 const badInput=copy(route().entered);badInput.gold++;const s=freezeOwnedSnapshot(badInput);assert.equal(isImmutableSnapshot(s),true);const bad=validateWildernessProgress(s);assert.equal(bad.ok,false);bad.ok=true;bad.code='FORGED';bad.reason='FORGED';assert.deepEqual(validateWildernessProgress(s),validateWildernessProgress(copy(s)));assert.equal(validateWildernessProgress(s).ok,false);
 const valid=freezeOwnedSnapshot(copy(route().entered)),yes=validateWildernessAncestry(valid);yes.ok=false;yes.code='FORGED';assert.deepEqual(validateWildernessAncestry(valid),{ok:true});assert.notEqual(validateWildernessAncestry(valid),validateWildernessAncestry(valid));
});
test('same objective revision in different save/profile snapshots never shares decisions or views',()=>{
 const a=freezeOwnedSnapshot(copy(route().entered)),changed=copy(a);changed.gold++;const b=freezeOwnedSnapshot(changed),view=mainView(),id=W.portals[0].id;assert.equal(a.world.objectives.wilderness_revision,b.world.objectives.wilderness_revision);assert.equal(validateWildernessProgress(a).ok,true);assert.equal(validateWildernessProgress(b).ok,false);assert.equal(view(a,'portal',id).allowed,true);assert.equal(view(b,'portal',id).allowed,false);assert.equal(view(a,'portal',id).allowed,true);
});
test('canonical immutable identity reuses validation without trusting arbitrary frozen proxies',()=>{
 const s=freezeOwnedSnapshot(copy(route().entered));let inspections=0;const inspect=Object.getOwnPropertyDescriptors;
 Object.getOwnPropertyDescriptors=value=>{if(value===s)inspections++;return inspect(value);};
 try {assert.equal(validateWildernessProgress(s).ok,true);const count=inspections;assert.ok(count>0);assert.equal(validateWildernessProgress(s).ok,true);assert.equal(validateWildernessAncestry(s).ok,true);assert.equal(inspections,count,'same canonical immutable identity avoids repeated descriptor validation');}
 finally {Object.getOwnPropertyDescriptors=inspect;}
 const proxy=new Proxy(s,{});assert.equal(isImmutableSnapshot(proxy),false);assert.deepEqual(validateWildernessProgress(proxy),validateWildernessProgress(s));
});
test('missing optional property on frozen Proxy stays uncached and revalidates original semantics',()=>{
 let region='ash_hamlet';const world=new Proxy(Object.freeze({objectives:Object.freeze({}),claimedRewards:Object.freeze([])}),{get(target,key){return key==='region'?region:Reflect.get(target,key);}});
 const s=Object.freeze({world,inventory:Object.freeze({tools:Object.freeze([])})});assert.equal(isImmutableSnapshot(s),false);assert.equal(validateWildernessProgress(s).ok,true);region='signal_wilderness';assert.equal(validateWildernessProgress(s).ok,false);
});
for(const label of ['accessor','symbol','nonenumerable','custom-prototype','sparse','cycle'])test(`malformed ${label} is not certified and retains original rejection on repeated calls`,()=>{
 const s=copy(route().entered);let reads=0;
 if(label==='accessor')Object.defineProperty(s,'extra',{enumerable:true,get(){reads++;return 1;}});
 if(label==='symbol')s[Symbol('extra')]=1;
 if(label==='nonenumerable')Object.defineProperty(s,'extra',{value:1});
 if(label==='custom-prototype')Object.setPrototypeOf(s,{extra:1});
 if(label==='sparse')s.inventory.tools.length+=1;
 if(label==='cycle')s.extra=s;
 Object.freeze(s);assert.equal(isImmutableSnapshot(s),false);assert.equal(validateWildernessProgress(s).ok,false);assert.equal(validateWildernessProgress(s).ok,false);assert.equal(reads,0);
});
for(const stage of ['entered','chosen','approach','evidence'])for(const mode of ['idle','move','hammer'])test(`frozen ${stage}/${mode} simulation and RNG match mutable state`,()=>{
 const mutable=copy(route()[stage]),frozen=freezeOwnedSnapshot(copy(mutable)),a=createBattle(mutable),b=createBattle(frozen),before=JSON.stringify(frozen);
 for(let i=0;i<90;i++){
  const input={move:mode==='move'?{x:i%40<20?1:-1,y:0}:{x:0,y:0},aim:{x:a.p.x+150,y:a.p.y},hammer:mode==='hammer'&&i%30===0,attack:i%24===0,block:i%18<4};
  assert.deepEqual(stepBattle(a,mutable.character,1/60,input),stepBattle(b,frozen.character,1/60,copy(input)));
 }
 assert.deepEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)));assert.equal(a.seed,b.seed);assert.equal(a.combatDraws,b.combatDraws);assert.equal(a.fxSeed,b.fxSeed);assert.equal(JSON.stringify(frozen),before);
});
