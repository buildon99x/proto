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
const KEY='deadfreight-best',BACKUP_KEY='deadfreight-backup-v2',SCHEMA=3,TOMBSTONE_LIMIT=64;
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
 if(data.schema!==undefined&&![1,2,3].includes(data.schema))error('unsupported-save-schema');
 const cash=data.cash??0,level=data.level??(data.schema>=2?1:0);
 if(!Number.isFinite(cash)||cash<0||!Number.isSafeInteger(level)||level<0||level>=Number.MAX_SAFE_INTEGER)error('invalid-save-values');
 const nextLevel=data.schema>=2?Math.max(1,level):level+1;
 let stash=[],activeRaid=null,revision=0,settledRaids=[];
 // An already-open 0.7.2 tab preserves unknown inventory fields but writes
 // schema:2 when banking. Retain and validate those fields instead of treating
 // a mixed-version record as an empty stash on the next load.
 if(data.schema===SCHEMA||Object.hasOwn(data,'stash')||Object.hasOwn(data,'activeRaid')){
  stash=data.stash===undefined?[]:data.stash;activeRaid=data.activeRaid===undefined?null:data.activeRaid;revision=data.revision===undefined?0:data.revision;settledRaids=data.settledRaids===undefined?[]:data.settledRaids;
  if(!Array.isArray(stash)||!Number.isSafeInteger(revision)||revision<0||revision>=Number.MAX_SAFE_INTEGER||!Array.isArray(settledRaids))error('invalid-save-profile');
  const ids=new Set();for(const stack of stash){stackCheck(stack);if(ids.has(stack.uid))error('duplicate-stash-uid');ids.add(stack.uid);}
  const settledIds=new Set();for(const settled of settledRaids){if(!object(settled)||!validId(settled.id)||typeof settled.win!=='boolean'||settledIds.has(settled.id))error('invalid-raid-history');settledIds.add(settled.id);}
  if(activeRaid!==null){
   if(!object(activeRaid)||!validId(activeRaid.id)||!Object.hasOwn(activeRaid,'safe')||settledIds.has(activeRaid.id))error('invalid-active-raid');
   safeCheck(activeRaid.safe);
   if(activeRaid.safe&&ids.has(activeRaid.safe.uid))error('active-safe-already-in-stash');
  }
 }
 return {raw,data,cash,nextLevel,stash,activeRaid,revision,settledRaids};
}
function create(storage){
 let saved={raw:null,data:{},cash:0,nextLevel:1,stash:[],activeRaid:null,revision:0,settledRaids:[]};
 let known=false,status='ready',pending=null,ownedRaidId=null,interrupted=false,lastReason=null;
 function accept(record){saved=record;known=true;interrupted=!!record.activeRaid&&record.activeRaid.id!==ownedRaidId;}
 function read(){return decode(storage.getItem(KEY));}
 try{accept(read());if(interrupted)status='interrupted-raid';}catch(e){status='read-error';lastReason=e.reason||e.message;}
 function snapshot(){return {
  known,bank:saved.cash,nextLevel:saved.nextLevel,status,pending:pending!==null,
  pendingKind:pending?pending.kind:null,pendingCash:pending&&pending.kind==='settle'&&pending.win?pending.cash:0,
  pendingRaidId:pending?pending.raidId:null,stash:clone(saved.stash),activeRaid:clone(saved.activeRaid),interrupted,
  revision:saved.revision,reason:lastReason
 };}
 function result(ok,raidId,reason){return {ok,raidId:raidId||null,...(reason?{reason}:{}),pending:pending!==null};}
 function fail(reason,raidId){lastReason=reason;return result(false,raidId,reason);}
 function settled(record,id){return record.settledRaids.some(entry=>entry.id===id);}
 function finish(record,op){
  if(op.kind==='deploy')ownedRaidId=op.raidId;
  if(op.kind==='settle'||op.kind==='recover')ownedRaidId=null;
  accept(record);pending=null;status=interrupted?'interrupted-raid':'ready';lastReason=null;
 }
 function merge(stash,retained){
  const result=clone(stash),ids=new Set(result.map(stack=>stack.uid));
  for(const stack of retained){
   stackCheck(stack);
   if(Equipment.Catalog[stack.itemId].category==='quest')continue;
   if(ids.has(stack.uid))error('retained-item-already-in-stash');
   ids.add(stack.uid);result.push(clone(stack));
  }
  return result;
 }
 function build(base,op){
  const data={...base.data,schema:SCHEMA,cash:base.cash,level:base.nextLevel,stash:clone(base.stash),activeRaid:clone(base.activeRaid),revision:base.revision+1,settledRaids:clone(base.settledRaids).slice(-TOMBSTONE_LIMIT),lastMutation:op.id};
  if(op.kind==='deploy'){
   if(base.activeRaid)error('active-raid-exists');
   const byId=new Map(base.stash.map(stack=>[stack.uid,stack])),withdrawn=new Set();
   for(const carried of stacks(op.carry)){
    const source=byId.get(carried.uid);
    if(source){
     if(source.quantity!==carried.quantity)error('partial-stack-withdrawal-unsupported');
     if(!equal(source,carried))error('stash-item-changed');
     withdrawn.add(carried.uid);
    }else if(!carried.issued)error('item-not-in-stash');
   }
   data.stash=data.stash.filter(stack=>!withdrawn.has(stack.uid));
   data.activeRaid={id:op.raidId,safe:clone(op.carry.safe),startedAt:op.startedAt};
  }else{
   if(!base.activeRaid||base.activeRaid.id!==op.raidId)error('raid-mismatch');
   if(op.kind==='safe')data.activeRaid={...base.activeRaid,safe:clone(op.safe)};
   else{
    const retained=op.kind==='settle'&&op.win?stacks(op.carry):(base.activeRaid.safe?[base.activeRaid.safe]:[]);
    data.stash=merge(base.stash,retained);data.activeRaid=null;
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
  if(base.data.lastMutation===op.id||((op.kind==='settle'||op.kind==='recover')&&settled(base,op.raidId))){finish(base,op);return true;}
  if(base.raw!==op.expectedRaw){accept(base);status='stale-state';lastReason='save-changed-in-another-session';return false;}
  let raw;
  try{raw=build(base,op);decode(raw);}catch(e){status='invalid-operation';lastReason=e.reason||e.message;return false;}
  if(base.data.schema!==SCHEMA&&base.raw!==null){
   try{if(storage.getItem(BACKUP_KEY)===null)storage.setItem(BACKUP_KEY,base.raw);}
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
  const ok=attempt();return result(ok,kind==='deploy'&&!ok?null:raidId,ok?null:lastReason||status);
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
 return {snapshot,deploy,updateSafe,settle,recoverInterrupted,retry};
}
return {KEY,BACKUP_KEY,SCHEMA,TOMBSTONE_LIMIT,decode,create};
});
