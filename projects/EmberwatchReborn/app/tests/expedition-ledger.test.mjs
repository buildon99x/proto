import test from 'node:test';
import assert from 'node:assert/strict';
import {createExpeditionLedger,validateExpeditionLedger,validateExpeditionRun,reduceExpeditionLedger,EXPEDITION_LEDGER_VERSION,EXPEDITION_LEDGER_COMMANDS} from '../src/expedition-ledger.js';
import {EXPEDITION_TEMPLATES,EXPEDITION_FOES,EXPEDITION_DIFFICULTIES,EXPEDITION_COMBAT_SCALING,getExpeditionTemplate} from '../src/expedition-content.js';
import {CORE_REFERENCE} from '../src/reference-core.js';
import {getRegion} from '../src/world.js';
import {createState,reduceRuntime} from '../src/state.js';

// Production PURE LEDGER regressions. These do not fabricate a parallel game
// handler, authorize board/life context or claim integrated save/combat coverage.
const template=EXPEDITION_TEMPLATES.quarry_drill,ids=template.enemyIds;
const context=difficulty=>({difficulty:difficulty??'normal'});
const ref=(runId=1,difficulty='normal')=>({runId,templateId:template.templateId,contentVersion:template.contentVersion,difficulty});
const begin=(expectedRunId=1,difficulty='normal')=>({type:'beginExpedition',expectedRunId,templateId:template.templateId,contentVersion:template.contentVersion,difficulty});
const command=(type,runId=1,difficulty='normal',extra={})=>({type,...ref(runId,difficulty),...extra});
const kills=(defeated=ids,runId=1,difficulty='normal')=>command('recordExpeditionKills',runId,difficulty,{defeated});
const copy=value=>structuredClone(value);
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
function apply(ledger,input,scope=context()){
 const before=copy(ledger),request=copy(input),scopeBefore=copy(scope);
 const result=reduceExpeditionLedger(freeze(ledger),freeze(input),freeze(scope));
 assert.equal(result.ok,true,JSON.stringify(result));assert.equal(validateExpeditionLedger(result.ledger,scope).ok,true);
 assert.deepEqual(ledger,before);assert.deepEqual(input,request);assert.deepEqual(scope,scopeBefore);
 assert.notEqual(result.ledger,ledger);
 if(ledger.active&&result.ledger.active){assert.notEqual(result.ledger.active,ledger.active);assert.notEqual(result.ledger.active.defeated,ledger.active.defeated);}
 assert.ok(result.ledger.closedThrough>=ledger.closedThrough);
 assert.equal(result.ledger.completedCount+result.ledger.abandonedCount,result.ledger.closedThrough);
 return result;
}
function reject(ledger,input,code,scope=context()){
 const before=copy(ledger),request=copy(input),scopeBefore=copy(scope);
 const result=reduceExpeditionLedger(freeze(ledger),freeze(input),freeze(scope));
 assert.equal(result.ok,false,JSON.stringify(result));if(code)assert.equal(result.code,code);
 assert.equal(Object.hasOwn(result,'ledger'),false);assert.equal(Object.hasOwn(result,'rewardIntent'),false);
 assert.deepEqual(ledger,before);assert.deepEqual(input,request);assert.deepEqual(scope,scopeBefore);
 return result;
}
const active=(difficulty='normal')=>apply(createExpeditionLedger(),begin(1,difficulty),context(difficulty)).ledger;
const cleared=(difficulty='normal')=>apply(active(difficulty),kills(ids,1,difficulty),context(difficulty)).ledger;

test('detached foundation is not registered as a playable region or runtime command',()=>{
 assert.equal(getRegion('quarry_drill'),null);
 const state=createState();assert.equal(Object.hasOwn(state,'expeditionLedger'),false);
 assert.equal(reduceRuntime(state,begin()).code,'UNKNOWN_COMMAND');
 assert.deepEqual(EXPEDITION_LEDGER_COMMANDS,['beginExpedition','recordExpeditionKills','completeExpedition','abandonExpedition']);
});
test('frozen content has exactly six distinct non-campaign IDs across three fixed roles',()=>{
 assert.equal(ids.length,6);assert.equal(new Set(ids).size,6);
 const campaignIds=['ash_hamlet','ash_road','sluice_upper','sluice_lower','ember_quarry'].flatMap(id=>getRegion(id).foes.map(foe=>foe.id));
 assert.equal(ids.some(id=>campaignIds.includes(id)),false);
 for(const kind of Object.keys(EXPEDITION_FOES)){
  assert.equal(template.foes.filter(foe=>foe.kind===kind).length,2);
  const foe=EXPEDITION_FOES[kind];assert.equal(foe.xp,0);assert.equal(foe.gold,0);assert.equal(foe.tier,'adept');assert.ok(foe.patterns.length>0);
  assert.throws(()=>{foe.patterns[0].damage=999;},TypeError);
 }
 assert.deepEqual(template.rewards.kill,{xp:0,gold:0,materials:{}});
 assert.deepEqual(template.rewards.complete,{xp:0,gold:12,materials:{iron:1}});
 assert.throws(()=>ids.push('new-foe'),TypeError);assert.throws(()=>{template.rewards.complete.materials.iron=99;},TypeError);
});
test('known content lookup never falls back or accepts inherited object keys',()=>{
 assert.equal(getExpeditionTemplate('quarry_drill',1),template);
 for(const id of ['unknown','__proto__','constructor','toString',null,1,{}])assert.equal(getExpeditionTemplate(id,1),null);
 for(const version of [0,2,-1,'1',null,undefined,NaN,Infinity,{},Number.MAX_SAFE_INTEGER])assert.equal(getExpeditionTemplate('quarry_drill',version),null);
});
for(const difficulty of EXPEDITION_DIFFICULTIES)test(`${difficulty}: original base HP/damage scaling; zero kill XP/G and one bounded completion grant`,()=>{
 assert.deepEqual(EXPEDITION_COMBAT_SCALING[difficulty],{enemyHealth:CORE_REFERENCE.difficulty[difficulty].enemyHealth,enemyDamage:CORE_REFERENCE.difficulty[difficulty].enemyDamage});
 const start=apply(createExpeditionLedger(),begin(1,difficulty),context(difficulty));assert.equal(Object.hasOwn(start,'rewardIntent'),false);
 const dead=apply(start.ledger,kills(ids,1,difficulty),context(difficulty));assert.equal(Object.hasOwn(dead,'rewardIntent'),false);
 const closed=apply(dead.ledger,command('completeExpedition',1,difficulty),context(difficulty));
 assert.deepEqual(closed.rewardIntent,{...ref(1,difficulty),xp:0,gold:12,materials:{iron:1}});
 assert.deepEqual(closed.ledger,{version:1,closedThrough:1,completedCount:1,abandonedCount:0,active:null});
});
test('fresh ledgers are independent, versioned and require authoritative difficulty context',()=>{
 const a=createExpeditionLedger(),b=createExpeditionLedger();assert.notEqual(a,b);
 assert.equal(a.version,EXPEDITION_LEDGER_VERSION);assert.deepEqual(validateExpeditionLedger(a,context()),{ok:true});
 a.closedThrough=1;assert.deepEqual(b,{version:1,closedThrough:0,completedCount:0,abandonedCount:0,active:null});
 for(const scope of [undefined,null,{},'normal',{difficulty:'Normal'},{difficulty:'hard',life:0},{difficulty:'normal',alive:true}]){
  assert.equal(validateExpeditionLedger(b,scope).code,'INVALID_EXPEDITION_CONTEXT');
  assert.equal(reduceExpeditionLedger(b,begin(),scope).code,'INVALID_EXPEDITION_CONTEXT');
 }
});
test('begin requires the next expected ID and never silently restarts an active or cleared run',()=>{
 reject(createExpeditionLedger(),begin(2),'FUTURE_EXPEDITION_RUN');
 const a=active();assert.deepEqual(a.active,{...ref(),defeated:[],status:'active'});
 reject(a,begin(),'ACTIVE_EXPEDITION_EXISTS');reject(a,begin(2),'FUTURE_EXPEDITION_RUN');
 reject(cleared(),begin(),'ACTIVE_EXPEDITION_EXISTS');
});
test('kill reports union fixed IDs canonically and repeated same-run reports are value-idempotent',()=>{
 const first=apply(active(),kills([ids[4],ids[0],ids[4]])).ledger;
 assert.deepEqual(first.active.defeated,[ids[0],ids[4]]);
 const repeated=apply(first,kills([ids[4],ids[0]]));assert.equal(repeated.changed,false);assert.deepEqual(repeated.ledger,first);
 const empty=apply(first,kills([]));assert.equal(empty.changed,false);assert.deepEqual(empty.ledger,first);
 const next=apply(first,kills([ids[1],ids[5]]));assert.equal(next.changed,true);assert.deepEqual(next.ledger.active.defeated,[ids[0],ids[1],ids[4],ids[5]]);
 assert.equal(Object.hasOwn(next,'rewardIntent'),false);
 const unordered=copy(first);unordered.active.defeated.reverse();
 const unchanged=apply(unordered,kills([ids[0],ids[4]]));assert.equal(unchanged.changed,false);assert.deepEqual(unchanged.ledger,unordered);
});
test('unknown or campaign kill IDs reject the entire batch without retaining earlier valid IDs',()=>{
 const state=active();for(const id of ['quarry-raider-1','road-warden','unknown','','__proto__','constructor','x'.repeat(10000)])reject(state,kills([ids[0],id]),'UNKNOWN_EXPEDITION_ENEMY');
 for(const defeated of [null,{},'enemy',[1],[null],[undefined],Array(7).fill(ids[0])])reject(state,kills(defeated),'INVALID_EXPEDITION_COMMAND');
});
test('completion requires all six fixed IDs; ending never begins another run implicitly',()=>{
 for(let n=0;n<6;n++){const ledger=apply(active(),kills(ids.slice(0,n))).ledger;reject(ledger,command('completeExpedition'),'EXPEDITION_INCOMPLETE');}
 const closed=apply(cleared(),command('completeExpedition'));assert.equal(closed.ledger.active,null);assert.equal(closed.ledger.closedThrough,1);
 reject(closed.ledger,command('completeExpedition'),'EXPEDITION_RUN_CLOSED');
 reject(closed.ledger,kills(),'EXPEDITION_RUN_CLOSED');reject(closed.ledger,begin(),'EXPEDITION_RUN_CLOSED');
 const fresh=apply(closed.ledger,begin(2));assert.deepEqual(fresh.ledger.active.defeated,[]);assert.equal(Object.hasOwn(fresh,'rewardIntent'),false);
});
test('abandon closes zero, partial or all-six progress without reward, preserving cumulative counts',()=>{
 for(const defeated of [[],ids.slice(0,3),ids]){
  const ledger=apply(active(),kills(defeated)).ledger;
  const abandoned=apply(ledger,command('abandonExpedition'));assert.equal(Object.hasOwn(abandoned,'rewardIntent'),false);
  assert.deepEqual(abandoned.ledger,{version:1,closedThrough:1,completedCount:0,abandonedCount:1,active:null});
  reject(abandoned.ledger,command('completeExpedition'),'EXPEDITION_RUN_CLOSED');
  reject(abandoned.ledger,command('abandonExpedition'),'EXPEDITION_RUN_CLOSED');
 }
});
test('completion, abandonment and another start reject delayed cross-run reports and close commands',()=>{
 let ledger=apply(cleared(),command('completeExpedition')).ledger;
 ledger=apply(ledger,begin(2)).ledger;ledger=apply(ledger,kills(ids.slice(0,2),2)).ledger;
 for(const stale of [kills(ids,1),command('completeExpedition',1),command('abandonExpedition',1),begin(1)])reject(ledger,stale,'EXPEDITION_RUN_CLOSED');
 ledger=apply(ledger,command('abandonExpedition',2)).ledger;ledger=apply(ledger,begin(3)).ledger;
 for(const stale of [kills(ids,2),command('completeExpedition',2),command('abandonExpedition',2),begin(2)])reject(ledger,stale,'EXPEDITION_RUN_CLOSED');
 assert.deepEqual(ledger.active.defeated,[]);assert.equal(ledger.completedCount,1);assert.equal(ledger.abandonedCount,1);
});
test('no active run and future run identities reject without creating progress',()=>{
 for(const type of ['recordExpeditionKills','completeExpedition','abandonExpedition']){
  const extra=type==='recordExpeditionKills'?{defeated:ids}:{};
  reject(createExpeditionLedger(),command(type,1,'normal',extra),'NO_ACTIVE_EXPEDITION');
  reject(active(),command(type,2,'normal',extra),'FUTURE_EXPEDITION_RUN');
 }
});
test('active-run reference validator is reusable and checks every authoritative identity component',()=>{
 const ledger=active();assert.deepEqual(validateExpeditionRun(ledger,ref(),context()),{ok:true});
 assert.equal(validateExpeditionRun(ledger,ref(2),context()).code,'FUTURE_EXPEDITION_RUN');
 assert.equal(validateExpeditionRun(ledger,ref(0),context()).code,'INVALID_EXPEDITION_RUN');
 assert.equal(validateExpeditionRun(ledger,{...ref(),templateId:'ember_quarry'},context()).code,'UNKNOWN_EXPEDITION_CONTENT');
 assert.equal(validateExpeditionRun(ledger,{...ref(),contentVersion:2},context()).code,'UNKNOWN_EXPEDITION_CONTENT');
 assert.equal(validateExpeditionRun(ledger,ref(1,'hard'),context()).code,'EXPEDITION_DIFFICULTY_MISMATCH');
 assert.equal(validateExpeditionRun(ledger,{...ref(),life:0},context()).code,'INVALID_EXPEDITION_RUN');
 const closed=apply(ledger,command('abandonExpedition')).ledger;
 assert.equal(validateExpeditionRun(closed,ref(),context()).code,'EXPEDITION_RUN_CLOSED');
});
test('wrong difficulty in ledger, command or authoritative context fails closed on all operations',()=>{
 const ledger=active();assert.equal(validateExpeditionLedger(ledger,context('hard')).code,'EXPEDITION_DIFFICULTY_MISMATCH');
 for(const c of [begin(1,'hard'),kills(ids,1,'hard'),command('completeExpedition',1,'hard'),command('abandonExpedition',1,'hard')])reject(ledger,c,'EXPEDITION_DIFFICULTY_MISMATCH');
 reject(ledger,kills(),'EXPEDITION_DIFFICULTY_MISMATCH',context('hard'));
 reject(createExpeditionLedger(),begin(1,'hard'),'EXPEDITION_DIFFICULTY_MISMATCH');
});
test('unsupported templates/content versions fail closed in persisted data and all commands',()=>{
 for(const patch of [{templateId:'unknown'},{templateId:'ember_quarry'},{contentVersion:0},{contentVersion:2},{contentVersion:'1'}]){
  const bad=copy(active());Object.assign(bad.active,patch);assert.equal(validateExpeditionLedger(bad,context()).code,'UNKNOWN_EXPEDITION_CONTENT');
  for(const input of [begin(),kills(),command('completeExpedition'),command('abandonExpedition')])reject(active(),{...input,...patch},'UNKNOWN_EXPEDITION_CONTENT');
 }
});
test('ledger field/count/watermark/active corruption cannot be normalized into a usable run',()=>{
 const invalid=[null,undefined,{},[],Object.assign(createExpeditionLedger(),{extra:1})];
 for(const patch of [{version:0},{version:2},{version:'1'},{closedThrough:1},{completedCount:1},{abandonedCount:1},{closedThrough:1,completedCount:1,abandonedCount:1},{closedThrough:2,completedCount:1,abandonedCount:0},{active:undefined}])invalid.push({...createExpeditionLedger(),...patch});
 for(const key of ['closedThrough','completedCount','abandonedCount'])for(const value of [-1,-0,.5,NaN,Infinity,'0',null,Number.MAX_SAFE_INTEGER+1])invalid.push({...createExpeditionLedger(),[key]:value});
 for(const value of invalid)assert.equal(validateExpeditionLedger(value,context()).ok,false);
 for(const key of Object.keys(createExpeditionLedger())){const value=createExpeditionLedger();delete value[key];assert.equal(validateExpeditionLedger(value,context()).ok,false);}
 for(const patch of [{runId:0},{runId:2},{status:'complete'},{status:'abandoned'},{status:'ready'},{defeated:[ids[0],ids[0]]},{defeated:['quarry-raider-1']},{difficulty:'NORMAL'},{extra:1}]){
  const value=copy(active());Object.assign(value.active,patch);assert.equal(validateExpeditionLedger(value,context()).ok,false);
 }
 for(const key of Object.keys(active().active)){const value=copy(active());delete value.active[key];assert.equal(validateExpeditionLedger(value,context()).ok,false);}
});
test('active run must be exactly closedThrough+1, including when nonzero totals are internally valid',()=>{
 const ledger={...active(),closedThrough:7,completedCount:3,abandonedCount:4};
 assert.equal(validateExpeditionLedger(ledger,context()).ok,false);
 ledger.active={...ledger.active,runId:8};assert.equal(validateExpeditionLedger(ledger,context()).ok,true);
 for(const id of [1,7,9]){const bad=copy(ledger);bad.active.runId=id;assert.equal(validateExpeditionLedger(bad,context()).ok,false);}
});
test('strict command schema rejects missing identity, unknown/reward/resource fields and wrong types',()=>{
 const commands=[begin(),kills(),command('completeExpedition'),command('abandonExpedition')];
 for(const c of commands){
  for(const key of Object.keys(c)){const bad=copy(c);delete bad[key];reject(active(),bad,'INVALID_EXPEDITION_COMMAND');}
  for(const extra of [{rewardId:'expedition:1'},{gold:12},{xp:0},{materials:{iron:1}},{vitals:{hp:999}},{life:0},{position:{x:1,y:1}},{region:'quarry_drill'},{recovery:{}},{active:null},{closedThrough:0}])reject(active(),{...c,...extra},'INVALID_EXPEDITION_COMMAND');
 }
 for(const c of [null,undefined,{},[],'beginExpedition',{type:'retry'},{type:'rest'},{type:'travel'},{type:'resetExpedition'}]){
  assert.equal(reduceExpeditionLedger(active(),c,context()).code,'INVALID_EXPEDITION_COMMAND');
 }
 for(const value of [0,-0,-1,.1,'1',NaN,Infinity,null,Number.MAX_SAFE_INTEGER+1]){
  reject(createExpeditionLedger(),{...begin(),expectedRunId:value},'INVALID_EXPEDITION_RUN');
  reject(active(),{...kills(),runId:value},'INVALID_EXPEDITION_RUN');
 }
});
test('safe-integer limit permits the last run to end and then permanently refuses another begin',()=>{
 const m=Number.MAX_SAFE_INTEGER;
 for(const ending of ['completeExpedition','abandonExpedition']){
  const ledger={version:1,closedThrough:m-1,completedCount:m-2,abandonedCount:1,active:null};
  let result=apply(ledger,begin(m));assert.equal(result.ledger.active.runId,m);
  result=apply(result.ledger,kills(ids,m));result=apply(result.ledger,command(ending,m));
  assert.equal(result.ledger.closedThrough,m);assert.equal(validateExpeditionLedger(result.ledger,context()).ok,true);
  reject(result.ledger,begin(m),'EXPEDITION_RUN_LIMIT');
  reject(result.ledger,begin(m+1),'INVALID_EXPEDITION_RUN');
  reject(result.ledger,command('completeExpedition',m),'EXPEDITION_RUN_CLOSED');
  const corrupt=copy(result.ledger);corrupt.active={...ref(m),status:'active',defeated:[]};assert.equal(validateExpeditionLedger(corrupt,context()).ok,false);
 }
});
test('input getters, symbol/inherited/nonenumerable fields and exotic prototypes are rejected without reads',()=>{
 let reads=0;
 const distortions=[
  value=>Object.assign(Object.create({inherited:true}),value),
  value=>Object.assign(Object.create(null),value),
  value=>Object.assign(value,{[Symbol('hidden')]:1}),
  value=>Object.defineProperty(value,'unknown',{value:1,enumerable:false}),
  value=>Object.defineProperty(value,Object.keys(value)[0],{enumerable:true,get(){reads++;throw new Error('getter invoked');}}),
  value=>Object.defineProperty(value,'unknown',{enumerable:true,get(){reads++;return 1;}}),
  value=>Object.assign(value,{toJSON(){reads++;return {};}}),
  value=>Object.defineProperty(value,'__proto__',{enumerable:true,value:{bad:true}}),
 ];
 for(const distort of distortions){
  assert.equal(validateExpeditionLedger(distort(createExpeditionLedger()),context()).ok,false);
  const ledger=copy(active());ledger.active=distort(ledger.active);assert.equal(validateExpeditionLedger(ledger,context()).ok,false);
  assert.equal(reduceExpeditionLedger(active(),distort(kills()),context()).ok,false);
  assert.equal(validateExpeditionRun(active(),distort(ref()),context()).ok,false);
  assert.equal(validateExpeditionLedger(active(),distort(context())).ok,false);
 }
 assert.equal(reads,0);
});
test('array holes, inherited IDs, indexed accessors, symbols, decorations and changed prototypes fail safely',()=>{
 let reads=0;
 const badArrays=[Array(1),Object.assign([],{'1':ids[1]}),Object.assign([ids[0]],{extra:ids[1]}),Object.assign([ids[0]],{[Symbol('id')]:ids[1]})];
 badArrays.push(Object.defineProperty([ids[0]],'0',{get(){reads++;return ids[0];},enumerable:true}));
 badArrays.push(Object.defineProperty([ids[0]],'0',{value:ids[0],enumerable:false}));
 badArrays.push(Object.setPrototypeOf([ids[0]],Object.create(Array.prototype)));
 badArrays.push(Object.assign(Object.create([ids[0]]),{length:1}));
 for(const defeated of badArrays){
  const ledger=copy(active());ledger.active.defeated=defeated;
  assert.equal(validateExpeditionLedger(ledger,context()).ok,false);
  assert.equal(reduceExpeditionLedger(active(),kills(defeated),context()).ok,false);
 }
 assert.equal(reads,0);
});
test('cycles and throwing reflection proxies reject rather than throwing or invoking a custom serializer',()=>{
 const ledger=createExpeditionLedger();ledger.active=ledger;assert.equal(validateExpeditionLedger(ledger,context()).ok,false);
 const input=kills();input.defeated=[input];assert.equal(reduceExpeditionLedger(active(),input,context()).ok,false);
 const proxy=new Proxy({}, {getPrototypeOf(){throw new Error('revoked-like');}});
 assert.equal(validateExpeditionLedger(proxy,context()).ok,false);assert.equal(reduceExpeditionLedger(active(),proxy,context()).ok,false);
 const {proxy:revoked,revoke}=Proxy.revocable({},{});revoke();assert.equal(validateExpeditionLedger(revoked,context()).ok,false);
});
test('accepted results are detached from inputs, fixed content, and other reward intents',()=>{
 const a=active(),r=reduceExpeditionLedger(a,kills([ids[0]]),context());assert.equal(r.ok,true);
 r.ledger.active.defeated.push(ids[1]);assert.deepEqual(a.active.defeated,[]);assert.equal(ids.length,6);
 const one=reduceExpeditionLedger(cleared(),command('completeExpedition'),context());const two=reduceExpeditionLedger(cleared(),command('completeExpedition'),context());
 one.rewardIntent.materials.iron=999;assert.equal(two.rewardIntent.materials.iron,1);assert.equal(template.rewards.complete.materials.iron,1);
});
test('serialization/reentry preserves active kills; life/death/rest fields are intentionally not ledger authority',()=>{
 const ledger=apply(active(),kills(ids.slice(0,5))).ledger;
 const serialized=JSON.stringify(ledger),loaded=JSON.parse(serialized);
 assert.equal(validateExpeditionLedger(loaded,context()).ok,true);assert.deepEqual(loaded,ledger);assert.equal(loaded.active.runId,1);
 for(const type of ['retry','rest','death','reenterExpedition'])reject(loaded,{type,...ref()},'INVALID_EXPEDITION_COMMAND');
 // There is intentionally NO mock board/life gate here. The integration must
 // reject stale lives while preserving this same run after actual death/retry.
 assert.deepEqual(Object.keys(loaded.active).sort(),['contentVersion','defeated','difficulty','runId','status','templateId']);
});
test('the pure result has no state mutation surface, campaign receipt, resources or free recovery',()=>{
 const campaign=createState(),before=copy(campaign);
 for(const result of [apply(createExpeditionLedger(),begin()),apply(active(),kills()),apply(cleared(),command('completeExpedition')),apply(active(),command('abandonExpedition'))]){
  assert.equal(Object.hasOwn(result,'state'),false);
  for(const field of ['world','claimedRewards','vitals','recovery','hp','mana','stamina','cooldowns','life']){
   assert.equal(Object.hasOwn(result,field),false);assert.equal(Object.hasOwn(result.ledger,field),false);
   if(result.rewardIntent)assert.equal(Object.hasOwn(result.rewardIntent,field),false);
  }
 }
 assert.deepEqual(campaign,before);
});
test('all 64 kill subsets and every next ID retain exact union/completion behavior',()=>{
 for(let mask=0;mask<64;mask++){
  const subset=ids.filter((_,index)=>mask&(1<<index));const ledger=apply(active(),kills(subset)).ledger;
  assert.equal(reduceExpeditionLedger(ledger,command('completeExpedition'),context()).ok,mask===63);
  for(const id of ids){const r=apply(ledger,kills([id]));assert.deepEqual(r.ledger.active.defeated,ids.filter(value=>subset.includes(value)||value===id));}
 }
});
test('10,000 serial runs retain constant bounded structure, exact cumulative counts and closed-ID rejection',()=>{
 let ledger=createExpeditionLedger(),grants=0,maxBytes=0;
 const scope=context();
 for(let run=1;run<=10000;run++){
  let result=reduceExpeditionLedger(ledger,begin(run),scope);assert.equal(result.ok,true);ledger=result.ledger;
  result=reduceExpeditionLedger(ledger,kills(ids,run),scope);assert.equal(result.ok,true);ledger=result.ledger;
  assert.equal(ledger.active.defeated.length,6);assert.ok(JSON.stringify(ledger).length<512);
  const complete=run%3!==0;result=reduceExpeditionLedger(ledger,command(complete?'completeExpedition':'abandonExpedition',run),scope);assert.equal(result.ok,true);ledger=result.ledger;
  if(complete){grants++;assert.equal(result.rewardIntent.gold,12);}else assert.equal(Object.hasOwn(result,'rewardIntent'),false);
  assert.equal(ledger.closedThrough,run);assert.equal(ledger.completedCount+ledger.abandonedCount,run);assert.equal(Object.keys(ledger).length,5);assert.equal(ledger.active,null);
  maxBytes=Math.max(maxBytes,JSON.stringify(ledger).length);
  assert.equal(reduceExpeditionLedger(ledger,command('completeExpedition',run),scope).code,'EXPEDITION_RUN_CLOSED');
 }
 assert.equal(grants,6667);assert.equal(ledger.completedCount,6667);assert.equal(ledger.abandonedCount,3333);assert.ok(maxBytes<128,maxBytes);
 const next=reduceExpeditionLedger(ledger,begin(10001),scope);assert.equal(next.ok,true);assert.equal(next.ledger.active.runId,10001);
 assert.ok(JSON.stringify(next.ledger).length<512);
 for(const stale of [1,4096,9999,10000])assert.equal(reduceExpeditionLedger(next.ledger,kills(ids,stale),scope).code,'EXPEDITION_RUN_CLOSED');
});
