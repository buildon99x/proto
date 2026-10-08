/* Browser-local raid transactions. Reads never migrate or repair stored data.
 * localStorage has no compare-and-swap: revision checks detect observed stale
 * writers, but this module does not promise cross-tab atomicity. */
(function(root,factory){
'use strict';
const inventory=typeof module!=='undefined'&&module.exports?require('./inventory.js'):root.DFInventory;
const api=factory(inventory);
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.DFStashProfile=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(Equipment){
'use strict';
const KEY='deadfreight-best',BACKUP_KEY='deadfreight-backup-v2',BACKUP_V3_KEY='deadfreight-backup-v3',BACKUP_V4_KEY='deadfreight-backup-v4',SCHEMA=5,TOMBSTONE_LIMIT=64;
const INITIAL_CAPACITY=24,CAPACITY_STEP=8,EXPANSION_COSTS=Object.freeze([500,750,1000,1500,2000]);
const capacity=tier=>INITIAL_CAPACITY+CAPACITY_STEP*tier;
const homeKind=kind=>['expand','sell','claim'].includes(kind);
let sequence=0;
const clone=value=>JSON.parse(JSON.stringify(value));
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const validId=value=>typeof value==='string'&&value.length>0&&value.length<=200;
const token=prefix=>`${prefix}-${Date.now().toString(36)}-${(++sequence).toString(36)}-${Math.random().toString(36).slice(2)}`;
function error(reason){const e=new Error(reason);e.reason=reason;throw e;}
function stackCheck(stack){
 if(!Equipment||typeof Equipment.validateStack!=='function')error('inventory-unavailable');
 const check=Equipment.validateStack(stack);if(!check.ok)error(`invalid-stack:${check.reason||'invalid'}`);
}
function safeCheck(stack){
 if(stack===null)return;
 stackCheck(stack);
 const allowed=Equipment.canPlace('safe',stack);
 if(allowed===false||(object(allowed)&&!allowed.ok))error('invalid-safe-item');
}
function inventoryCheck(carry){
 if(!Equipment||typeof Equipment.validateSnapshot!=='function')error('inventory-unavailable');
 const check=Equipment.validateSnapshot(carry);if(!check.ok)error(`invalid-inventory:${check.reason||'invalid'}`);
 return clone(carry);
}
function stacks(carry){return [...carry.bag,...carry.weapons,carry.armor,...carry.quick,carry.safe].filter(Boolean);}
function equal(a,b){
 if(a===b)return true;
 if(!object(a)||!object(b))return false;
 const ak=Object.keys(a).sort(),bk=Object.keys(b).sort();
 return ak.length===bk.length&&ak.every((key,i)=>key===bk[i]&&(a[key]===b[key]||(object(a[key])&&equal(a[key],b[key]))||(Array.isArray(a[key])&&JSON.stringify(a[key])===JSON.stringify(b[key]))));
}
function decode(raw){
 const data=raw===null?{}:JSON.parse(raw);
 if(!object(data))error('invalid-save');
 if(data.schema!==undefined&&![1,2,3,4,5].includes(data.schema))error('unsupported-save-schema');
 const cash=Object.hasOwn(data,'cash')?data.cash:0,level=Object.hasOwn(data,'level')?data.level:(data.schema>=2?1:0);
 if(!Number.isFinite(cash)||cash<0||!Number.isSafeInteger(level)||level<0||level>=Number.MAX_SAFE_INTEGER)error('invalid-save-values');
 const nextLevel=data.schema>=2?Math.max(1,level):level+1;
 let stash=[],activeRaid=null,revision=0,settledRaids=[],stashTier=0,recovery=[],stashReceipts=[];
 // Older tabs preserve unknown fields while downgrading the schema number.
 // Validate all progression fields together; never reset a partly corrupt tier.
 if(data.schema>=4||['stashTier','recovery','stashReceipts'].some(key=>Object.hasOwn(data,key))){
  ({stashTier,recovery,stashReceipts}=data);
  if(!Number.isSafeInteger(stashTier)||stashTier<0||stashTier>EXPANSION_COSTS.length||!Array.isArray(recovery)||!Array.isArray(stashReceipts)||['cash','level','stash','activeRaid','revision','settledRaids'].some(key=>!Object.hasOwn(data,key)))error('invalid-stash-progression');
  const requestIds=new Set(),purchasedTiers=new Set();
  for(const receipt of stashReceipts){
   if(!object(receipt)||!validId(receipt.id)||requestIds.has(receipt.id)||!homeKind(receipt.kind))error('invalid-stash-receipt');
   requestIds.add(receipt.id);
   if(receipt.kind==='expand'){
    if(!Number.isSafeInteger(receipt.expectedLevel)||receipt.expectedLevel<0||receipt.expectedLevel>=EXPANSION_COSTS.length||receipt.tier!==receipt.expectedLevel+1||receipt.cost!==EXPANSION_COSTS[receipt.expectedLevel]||receipt.tier>stashTier||purchasedTiers.has(receipt.tier))error('invalid-stash-receipt');
    purchasedTiers.add(receipt.tier);
   }else if(receipt.kind==='sell'){
    if(!['stash','recovery'].includes(receipt.source)||!validId(receipt.uid)||!Number.isFinite(receipt.value)||receipt.value<0)error('invalid-stash-receipt');
   }else if(!validId(receipt.target)||!Array.isArray(receipt.uids)||!receipt.uids.length||receipt.uids.some(uid=>!validId(uid))||new Set(receipt.uids).size!==receipt.uids.length||receipt.target!=='all'&&(receipt.uids.length!==1||receipt.uids[0]!==receipt.target))error('invalid-stash-receipt');
  }
 }
 // An already-open 0.7.2 tab preserves unknown inventory fields but writes
 // schema:2 when banking. Retain and validate those fields instead of treating
 // a mixed-version record as an empty stash on the next load.
 if(data.schema>=3||Object.hasOwn(data,'stash')||Object.hasOwn(data,'activeRaid')||recovery.length){
  stash=data.stash===undefined?[]:data.stash;activeRaid=data.activeRaid===undefined?null:data.activeRaid;revision=data.revision===undefined?0:data.revision;settledRaids=data.settledRaids===undefined?[]:data.settledRaids;
  if(!Array.isArray(stash)||!Number.isSafeInteger(revision)||revision<0||revision>=Number.MAX_SAFE_INTEGER||!Array.isArray(settledRaids))error('invalid-save-profile');
  const ids=new Set();for(const stack of stash){stackCheck(stack);if(ids.has(stack.uid))error('duplicate-stash-uid');ids.add(stack.uid);}
  for(const stack of recovery){stackCheck(stack);if(ids.has(stack.uid))error('duplicate-recovery-uid');ids.add(stack.uid);}
  const settledIds=new Set();for(const settled of settledRaids){if(!object(settled)||!validId(settled.id)||typeof settled.win!=='boolean'||settledIds.has(settled.id))error('invalid-raid-history');settledIds.add(settled.id);}
  if(activeRaid!==null){
   if(!object(activeRaid)||!validId(activeRaid.id)||!Object.hasOwn(activeRaid,'safe')||settledIds.has(activeRaid.id))error('invalid-active-raid');
   safeCheck(activeRaid.safe);
   if(activeRaid.safe&&ids.has(activeRaid.safe.uid))error('active-safe-already-in-stash');
  }
 }
 const retiredIds=stashReceipts.filter(receipt=>receipt.kind==='sell').map(receipt=>receipt.uid);if(retiredIds.length&&!Equipment.reserveIdentities(retiredIds).ok)error('invalid-stash-receipt');
 if([...stash,...recovery,...(activeRaid?.safe?[activeRaid.safe]:[])].some(stack=>retiredIds.includes(stack.uid)))error('retired-item-present');
 return {raw,data,cash,nextLevel,stash,activeRaid,revision,settledRaids,stashTier,recovery,stashReceipts};
}
function create(storage){
 let saved={raw:null,data:{},cash:0,nextLevel:1,stash:[],activeRaid:null,revision:0,settledRaids:[],stashTier:0,recovery:[],stashReceipts:[]};
 let known=false,status='ready',pending=null,ownedRaidId=null,interrupted=false,lastReason=null;
 function accept(record){saved=record;known=true;interrupted=!!record.activeRaid&&record.activeRaid.id!==ownedRaidId;}
 function read(){return decode(storage.getItem(KEY));}
 try{accept(read());if(interrupted)status='interrupted-raid';}catch(e){status='read-error';lastReason=e.reason||e.message;}
 function snapshot(){return {
  known,bank:saved.cash,nextLevel:saved.nextLevel,status,pending:pending!==null,
  pendingKind:pending?pending.kind:null,pendingCash:pending&&pending.kind==='settle'&&pending.win?pending.cash:0,
  pendingRaidId:pending?pending.raidId:null,stash:clone(saved.stash),activeRaid:clone(saved.activeRaid),interrupted,
  revision:saved.revision,reason:lastReason,
  capacity:capacity(saved.stashTier),used:saved.stash.length,tier:saved.stashTier,
  available:Math.max(0,capacity(saved.stashTier)-saved.stash.length),overCapacity:Math.max(0,saved.stash.length-capacity(saved.stashTier)),
  nextCost:EXPANSION_COSTS[saved.stashTier]??null,nextCapacity:saved.stashTier<EXPANSION_COSTS.length?capacity(saved.stashTier+1):null,
  recovery:clone(saved.recovery),recoveryCount:saved.recovery.length
 };}
 function result(ok,raidId,reason){return {ok,raidId:raidId||null,...(reason?{reason}:{}),pending:pending!==null};}
 function fail(reason,raidId){lastReason=reason;return result(false,raidId,reason);}
 function settled(record,id){return record.settledRaids.some(entry=>entry.id===id);}
 function receiptFor(record,id){return record.stashReceipts.find(receipt=>receipt.id===id);}
 function matches(receipt,op){
  return receipt.kind===op.kind&&(op.kind==='expand'?receipt.expectedLevel===op.expectedLevel:op.kind==='sell'?receipt.source===op.source&&receipt.uid===op.uid:receipt.target===op.target);
 }
 function homeResult(ok,op,alreadyApplied=false){
  const receipt=ok&&receiptFor(saved,op.requestId);
  return {...result(ok,null,ok?null:lastReason||status),...(receipt?{receipt:clone(receipt),alreadyApplied}:{}),...(receipt&&op.kind==='sell'?{value:receipt.value}:{}),...(receipt&&op.kind==='claim'?{claimed:receipt.uids.length}:{})};
 }
 function finish(record,op){
  if(op.kind==='deploy')ownedRaidId=op.raidId;
  if(op.kind==='settle'||op.kind==='recover')ownedRaidId=null;
  accept(record);pending=null;status=interrupted?'interrupted-raid':'ready';lastReason=null;
 }
 function retain(data,retained){
  const stashIds=new Set(data.stash.map(stack=>stack.uid)),ids=new Set([...stashIds,...data.recovery.map(stack=>stack.uid)]);
  for(const stack of retained){
   stackCheck(stack);
   if(Equipment.Catalog[stack.itemId].category==='quest')continue;
   if(data.stashReceipts.some(receipt=>receipt.kind==='sell'&&receipt.uid===stack.uid))error('retired-item-present');
   if(ids.has(stack.uid))error(stashIds.has(stack.uid)?'retained-item-already-in-stash':'retained-item-already-in-recovery');
   ids.add(stack.uid);(data.stash.length<capacity(data.stashTier)?data.stash:data.recovery).push(clone(stack));
  }
 }
 function build(base,op){
  const data={...base.data,schema:SCHEMA,cash:base.cash,level:base.nextLevel,stash:clone(base.stash),activeRaid:clone(base.activeRaid),revision:base.revision+1,settledRaids:clone(base.settledRaids).slice(-TOMBSTONE_LIMIT),lastMutation:op.id,stashTier:base.stashTier,recovery:clone(base.recovery),stashReceipts:clone(base.stashReceipts)};
  if(homeKind(op.kind)){
   if(base.activeRaid)error('active-raid-exists');
   let receipt={id:op.requestId,kind:op.kind};
   if(op.kind==='expand'){
    if(op.expectedLevel!==base.stashTier)error('stale-expansion-quote');
    if(base.stashTier===EXPANSION_COSTS.length)error('stash-at-maximum');
    const cost=EXPANSION_COSTS[base.stashTier];if(base.cash<cost)error('insufficient-funds');
    data.cash-=cost;if(base.cash-data.cash!==cost)error('bank-overflow');
    data.stashTier++;receipt={...receipt,expectedLevel:op.expectedLevel,tier:data.stashTier,cost};
   }else if(op.kind==='sell'){
    const index=data[op.source].findIndex(stack=>stack.uid===op.uid);if(index===-1)error('item-not-found');
    const value=Equipment.stackValue(data[op.source][index]);if(!Number.isFinite(value)||value<0)error('invalid-sale-value');
    data.cash+=value;if(!Number.isFinite(data.cash)||data.cash-base.cash!==value)error('bank-overflow');
    data[op.source].splice(index,1);receipt={...receipt,source:op.source,uid:op.uid,value};
   }else{
    const free=Math.max(0,capacity(base.stashTier)-base.stash.length);
    const eligible=op.target==='all'?data.recovery:data.recovery.filter(stack=>stack.uid===op.target);
    if(!eligible.length)error('recovery-item-not-found');if(!free)error('stash-full');
    const claimed=eligible.slice(0,free),ids=new Set(claimed.map(stack=>stack.uid));
    data.stash.push(...claimed);data.recovery=data.recovery.filter(stack=>!ids.has(stack.uid));
    receipt={...receipt,target:op.target,uids:claimed.map(stack=>stack.uid)};
   }
   // These receipts intentionally survive later mutations and reloads. Dropping
   // them would turn an old repeated purchase/claim confirmation into new work.
   data.stashReceipts.push(receipt);
  }else if(op.kind==='deploy'){
   if(base.activeRaid)error('active-raid-exists');
   if(base.recovery.length)error('recovery-required');
   const byId=new Map(base.stash.map(stack=>[stack.uid,stack])),withdrawn=new Set();
   for(const carried of stacks(op.carry)){
    const source=byId.get(carried.uid);
    if(source){
     if(source.quantity!==carried.quantity)error('partial-stack-withdrawal-unsupported');
     if(!equal(source,carried))error('stash-item-changed');
     withdrawn.add(carried.uid);
    }else if(!carried.issued||base.stashReceipts.some(receipt=>receipt.kind==='sell'&&receipt.uid===carried.uid))error('item-not-in-stash');
   }
   data.stash=data.stash.filter(stack=>!withdrawn.has(stack.uid));
   data.activeRaid={id:op.raidId,safe:clone(op.carry.safe),startedAt:op.startedAt};
  }else{
   if(!base.activeRaid||base.activeRaid.id!==op.raidId)error('raid-mismatch');
   if(op.kind==='safe')data.activeRaid={...base.activeRaid,safe:clone(op.safe)};
   else{
    const retained=op.kind==='settle'&&op.win?stacks(op.carry):(base.activeRaid.safe?[base.activeRaid.safe]:[]);
    retain(data,retained);data.activeRaid=null;
    const win=op.kind==='settle'&&op.win;
    if(win){data.cash=base.cash+op.cash;if(!Number.isFinite(data.cash))error('bank-overflow');data.level=Math.max(base.nextLevel,op.nextLevel);}
    data.settledRaids=[...data.settledRaids,{id:op.raidId,win}].slice(-TOMBSTONE_LIMIT);
   }
  }
  return JSON.stringify(data);
 }
 function attempt(){
  const op=pending;if(!op)return false;
  let base;
  try{base=read();}catch(e){status='read-error';lastReason=e.reason||e.message;return false;}
  // A storage implementation may report failure after accepting a write. The
  // transaction marker and raid tombstones make that ambiguous retry harmless.
  const receipt=homeKind(op.kind)&&receiptFor(base,op.requestId);
  if(receipt&&!matches(receipt,op)){status='invalid-operation';lastReason='request-id-conflict';return false;}
  if(base.data.lastMutation===op.id||receipt||((op.kind==='settle'||op.kind==='recover')&&settled(base,op.raidId))){finish(base,op);return true;}
  if(base.raw!==op.expectedRaw){accept(base);status='stale-state';lastReason='save-changed-in-another-session';return false;}
  let raw;
  try{raw=build(base,op);decode(raw);}catch(e){status='invalid-operation';lastReason=e.reason||e.message;return false;}
  if(base.data.schema!==SCHEMA&&base.raw!==null){
   const backupKey=base.data.schema===4?BACKUP_V4_KEY:base.data.schema===3?BACKUP_V3_KEY:BACKUP_KEY;
   try{if(storage.getItem(backupKey)===null)storage.setItem(backupKey,base.raw);}
   catch(e){status='backup-error';lastReason='legacy-backup-failed';return false;}
  }
  try{storage.setItem(KEY,raw);}catch(e){status='write-error';lastReason='save-write-failed';return false;}
  finish(decode(raw),op);return true;
 }
 function prepare(kind,raidId,payload){
  if(pending)return fail('pending-operation',raidId);
  let base;
  try{base=read();}catch(e){status='read-error';return fail(e.reason||'save-read-failed',raidId);}
  if(!known){accept(base);status=interrupted?'interrupted-raid':'ready';}
  if(base.raw!==saved.raw){accept(base);status='stale-state';return fail('save-changed-in-another-session',raidId);}
  const op={kind,raidId,id:token('op'),expectedRaw:base.raw,...payload};
  try{decode(build(base,op));}catch(e){return fail(e.reason||'invalid-operation',raidId);}
  pending=op;
  const ok=attempt();return homeKind(kind)?homeResult(ok,op):result(ok,kind==='deploy'&&!ok?null:raidId,ok?null:lastReason||status);
 }
 function homeRequest(kind,payload){
  const op={kind,...payload};
  if(!validId(op.requestId))return fail('invalid-request-id');
  if(pending){
   if(homeKind(pending.kind)&&pending.requestId===op.requestId){
    if(!matches(pending,op))return fail('request-id-conflict');
    return homeResult(attempt(),op);
   }
   return fail('pending-operation');
  }
  let current;try{current=read();}catch(e){status='read-error';return fail(e.reason||'save-read-failed');}
  const receipt=receiptFor(current,op.requestId);
  if(receipt){
   if(!matches(receipt,op))return fail('request-id-conflict');
   accept(current);status=interrupted?'interrupted-raid':'ready';lastReason=null;return homeResult(true,op,true);
  }
  return prepare(kind,null,payload);
 }
 function expandStash(options={}){
  if(!object(options)||!Number.isSafeInteger(options.expectedLevel)||options.expectedLevel<0||options.expectedLevel>EXPANSION_COSTS.length)return fail('invalid-expansion-level');
  return homeRequest('expand',{expectedLevel:options.expectedLevel,requestId:options.requestId});
 }
 function sellStack(source,uid,requestId){
  if(!['stash','recovery'].includes(source)||!validId(uid))return fail('invalid-sale');
  return homeRequest('sell',{source,uid,requestId});
 }
 function claimRecovery(target='all',requestId=token('claim')){
  if(!validId(target))return fail('invalid-recovery-target');
  return homeRequest('claim',{target,requestId});
 }
 function deploy(carry){
  if(pending)return fail('pending-operation');
  if(saved.activeRaid)return fail(interrupted?'interrupted-raid':'active-raid-exists');
  try{carry=inventoryCheck(carry);}catch(e){return fail(e.reason||'invalid-inventory');}
  const raidId=token('raid');return prepare('deploy',raidId,{carry,startedAt:Date.now()});
 }
 function updateSafe(raidId,safeStack){
  if(pending)return fail('pending-operation',raidId);
  if(interrupted)return fail('interrupted-raid',raidId);
  if(!saved.activeRaid||saved.activeRaid.id!==raidId)return fail('raid-mismatch',raidId);
  try{safeCheck(safeStack);}catch(e){return fail(e.reason||'invalid-safe-item',raidId);}
  if(equal(saved.activeRaid.safe,safeStack)){
   let current;try{current=read();}catch(e){status='read-error';return fail(e.reason||'save-read-failed',raidId);}
   if(current.raw!==saved.raw){accept(current);status='stale-state';return fail('save-changed-in-another-session',raidId);}
   return result(true,raidId);
  }
  return prepare('safe',raidId,{safe:clone(safeStack)});
 }
 function settle(raidId,win,carry,cash=0,nextLevel=saved.nextLevel){
  if(!validId(raidId)||typeof win!=='boolean'||!Number.isFinite(cash)||cash<0||!Number.isSafeInteger(nextLevel)||nextLevel<1||nextLevel>=Number.MAX_SAFE_INTEGER)return fail('invalid-settlement',raidId);
  if(pending){
   if((pending.kind==='settle'||pending.kind==='recover')&&pending.raidId===raidId){const ok=attempt();return result(ok,raidId,ok?null:lastReason||status);}
   return fail('pending-operation',raidId);
  }
  let current;try{current=read();}catch(e){status='read-error';return fail(e.reason||'save-read-failed',raidId);}
  if(settled(current,raidId)){accept(current);status=interrupted?'interrupted-raid':'ready';lastReason=null;return {...result(true,raidId),alreadySettled:true};}
  if(interrupted)return fail('interrupted-raid',raidId);
  if(!saved.activeRaid||saved.activeRaid.id!==raidId)return fail('raid-mismatch',raidId);
  if(win){try{carry=inventoryCheck(carry);}catch(e){return fail(e.reason||'invalid-inventory',raidId);}}
  return prepare('settle',raidId,{win,carry:win?carry:null,cash,nextLevel});
 }
 function recoverInterrupted(){
  if(pending)return fail('pending-operation',saved.activeRaid&&saved.activeRaid.id);
  if(!saved.activeRaid)return {...result(true,null),alreadySettled:true};
  if(!interrupted)return fail('raid-still-active',saved.activeRaid.id);
  return prepare('recover',saved.activeRaid.id,{});
 }
 function retry(){
  if(pending)return attempt();
  try{accept(read());status=interrupted?'interrupted-raid':'ready';lastReason=null;return true;}
  catch(e){status='read-error';lastReason=e.reason||e.message;return false;}
 }
 return {snapshot,deploy,updateSafe,settle,recoverInterrupted,retry,expandStash,sellStack,claimRecovery};
}
return {KEY,BACKUP_KEY,BACKUP_V3_KEY,BACKUP_V4_KEY,SCHEMA,TOMBSTONE_LIMIT,INITIAL_CAPACITY,CAPACITY_STEP,EXPANSION_COSTS,decode,create};
});
