// Pure ledger foundation, NOT a runtime/domain authorization boundary. The
// future handler must first check life, region, alive/board, report and recovery
// context, then commit this result AND its reward intent in the same state save.
import {EXPEDITION_DIFFICULTIES,getExpeditionTemplate} from './expedition-content.js';

export const EXPEDITION_LEDGER_VERSION=1;
export const EXPEDITION_LEDGER_COMMANDS=Object.freeze([
 'beginExpedition','recordExpeditionKills','completeExpedition','abandonExpedition',
]);
const LEDGER_KEYS=['version','closedThrough','completedCount','abandonedCount','active'];
const RUN_KEYS=['runId','templateId','contentVersion','difficulty'];
const ACTIVE_KEYS=[...RUN_KEYS,'defeated','status'];
const maximum=Number.MAX_SAFE_INTEGER;
const count=value=>Number.isSafeInteger(value)&&value>=0&&!Object.is(value,-0);
const runId=value=>count(value)&&value>0;
const fail=code=>({ok:false,code});

// Inspect descriptors before accessing values. Accessors, symbols, inherited
// fields, exotic prototypes, sparse arrays and unknown keys are not JSON data.
// No arbitrary getter, toJSON or iterator is invoked, including on rejection.
function readRecord(value,keys){
 try{
  if(value===null||typeof value!=='object'||Object.getPrototypeOf(value)!==Object.prototype)return null;
  const descriptors=Object.getOwnPropertyDescriptors(value),ownKeys=Reflect.ownKeys(descriptors);
  if(ownKeys.length!==keys.length||ownKeys.some(key=>typeof key!=='string'||!keys.includes(key)))return null;
  if(keys.some(key=>!Object.hasOwn(descriptors,key)||!Object.hasOwn(descriptors[key],'value')||!descriptors[key].enumerable))return null;
  return Object.fromEntries(keys.map(key=>[key,descriptors[key].value]));
 }catch{return null;}
}
function readIds(value,max=6){
 try{
  if(!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype)return null;
  const length=Object.getOwnPropertyDescriptor(value,'length');
  if(!length||!Object.hasOwn(length,'value')||!count(length.value)||length.value>max)return null;
  const keys=Array.from({length:length.value},(_,index)=>String(index));
  const descriptors=Object.getOwnPropertyDescriptors(value);
  if(Reflect.ownKeys(descriptors).length!==keys.length+1)return null;
  if(keys.some(key=>!Object.hasOwn(descriptors,key)||!Object.hasOwn(descriptors[key],'value')||!descriptors[key].enumerable||typeof descriptors[key].value!=='string'))return null;
  return keys.map(key=>descriptors[key].value);
 }catch{return null;}
}
function readContext(context){
 const value=readRecord(context,['difficulty']);
 return value&&EXPEDITION_DIFFICULTIES.includes(value.difficulty)?value:null;
}
function inspectLedger(ledger,context){
 const scope=readContext(context);if(!scope)return fail('INVALID_EXPEDITION_CONTEXT');
 const data=readRecord(ledger,LEDGER_KEYS);
 if(!data||data.version!==EXPEDITION_LEDGER_VERSION||!count(data.closedThrough)||!count(data.completedCount)||!count(data.abandonedCount)||
  data.abandonedCount>data.closedThrough||data.completedCount!==data.closedThrough-data.abandonedCount)return fail('INVALID_EXPEDITION_LEDGER');
 if(data.active!==null){
  const active=readRecord(data.active,ACTIVE_KEYS);
  if(!active||data.closedThrough===maximum||!runId(active.runId)||active.runId!==data.closedThrough+1||active.status!=='active')return fail('INVALID_EXPEDITION_LEDGER');
  const template=getExpeditionTemplate(active.templateId,active.contentVersion);
  if(!template)return fail('UNKNOWN_EXPEDITION_CONTENT');
  if(!EXPEDITION_DIFFICULTIES.includes(active.difficulty))return fail('INVALID_EXPEDITION_LEDGER');
  if(active.difficulty!==scope.difficulty)return fail('EXPEDITION_DIFFICULTY_MISMATCH');
  const defeated=readIds(active.defeated);
  if(!defeated||new Set(defeated).size!==defeated.length||defeated.some(id=>!template.enemyIds.includes(id)))return fail('INVALID_EXPEDITION_LEDGER');
  data.active={...active,defeated};
 }
 return {ok:true,ledger:data,context:scope};
}
function inspectReference(ledger,reference,context){
 const ref=readRecord(reference,RUN_KEYS);
 if(!ref||!runId(ref.runId))return fail('INVALID_EXPEDITION_RUN');
 if(!getExpeditionTemplate(ref.templateId,ref.contentVersion))return fail('UNKNOWN_EXPEDITION_CONTENT');
 if(ref.difficulty!==context.difficulty)return fail('EXPEDITION_DIFFICULTY_MISMATCH');
 if(ref.runId<=ledger.closedThrough)return fail('EXPEDITION_RUN_CLOSED');
 if(ledger.closedThrough===maximum||ref.runId!==ledger.closedThrough+1)return fail('FUTURE_EXPEDITION_RUN');
 if(!ledger.active)return fail('NO_ACTIVE_EXPEDITION');
 if(RUN_KEYS.some(key=>ref[key]!==ledger.active[key]))return fail('EXPEDITION_RUN_MISMATCH');
 return {ok:true};
}
function readCommand(command){
 try{
  if(command===null||typeof command!=='object'||Object.getPrototypeOf(command)!==Object.prototype)return null;
  const type=Object.getOwnPropertyDescriptor(command,'type');
  if(!type||!Object.hasOwn(type,'value')||!EXPEDITION_LEDGER_COMMANDS.includes(type.value))return null;
  return readRecord(command,['type',...(type.value==='beginExpedition'?['expectedRunId',...RUN_KEYS.slice(1)]:RUN_KEYS),
   ...(type.value==='recordExpeditionKills'?['defeated']:[])]);
 }catch{return null;}
}

export function createExpeditionLedger(){
 return {version:EXPEDITION_LEDGER_VERSION,closedThrough:0,completedCount:0,abandonedCount:0,active:null};
}

/** Required context contains the authoritative campaign difficulty, no client flags. */
export function validateExpeditionLedger(ledger,context){
 const result=inspectLedger(ledger,context);return result.ok?{ok:true}:result;
}

/** Reuse for the expedition branch of battleReport/checkpoint/travel gates. */
export function validateExpeditionRun(ledger,reference,context){
 const result=inspectLedger(ledger,context);return result.ok?inspectReference(result.ledger,reference,result.context):result;
}

/**
 * Returns detached ledger data; failures never mutate or return a partial state.
 * Only completeExpedition emits rewardIntent. It is not a receipt to apply later:
 * the controller must atomically persist it with this exact returned ledger.
 * This pure module cannot authorize alive-at-board completion or stale lives.
 */
export function reduceExpeditionLedger(ledger,command,context){
 const inspected=inspectLedger(ledger,context);if(!inspected.ok)return inspected;
 const input=readCommand(command);if(!input)return fail('INVALID_EXPEDITION_COMMAND');
 const next=inspected.ledger,scope=inspected.context;
 const template=getExpeditionTemplate(input.templateId,input.contentVersion);
 if(!template)return fail('UNKNOWN_EXPEDITION_CONTENT');
 if(input.difficulty!==scope.difficulty)return fail('EXPEDITION_DIFFICULTY_MISMATCH');

 if(input.type==='beginExpedition'){
  if(!runId(input.expectedRunId))return fail('INVALID_EXPEDITION_RUN');
  if(next.closedThrough===maximum)return fail('EXPEDITION_RUN_LIMIT');
  if(input.expectedRunId<=next.closedThrough)return fail('EXPEDITION_RUN_CLOSED');
  if(input.expectedRunId!==next.closedThrough+1)return fail('FUTURE_EXPEDITION_RUN');
  if(next.active)return fail('ACTIVE_EXPEDITION_EXISTS');
  next.active={runId:input.expectedRunId,templateId:input.templateId,contentVersion:input.contentVersion,difficulty:input.difficulty,defeated:[],status:'active'};
  return {ok:true,ledger:next,changed:true};
 }

 const reference=Object.fromEntries(RUN_KEYS.map(key=>[key,input[key]]));
 const valid=inspectReference(next,reference,scope);if(!valid.ok)return valid;
 if(input.type==='recordExpeditionKills'){
  const ids=readIds(input.defeated);if(!ids)return fail('INVALID_EXPEDITION_COMMAND');
  if(ids.some(id=>!template.enemyIds.includes(id)))return fail('UNKNOWN_EXPEDITION_ENEMY');
  const union=new Set([...next.active.defeated,...ids]),changed=union.size!==next.active.defeated.length;
  if(changed)next.active.defeated=template.enemyIds.filter(id=>union.has(id));
  return {ok:true,ledger:next,changed};
 }

 const complete=input.type==='completeExpedition';
 if(complete&&next.active.defeated.length!==template.enemyIds.length)return fail('EXPEDITION_INCOMPLETE');
 next.closedThrough=next.active.runId;
 next[complete?'completedCount':'abandonedCount']++;
 next.active=null;
 const result={ok:true,ledger:next,changed:true};
 if(complete)result.rewardIntent={...reference,xp:template.rewards.complete.xp,gold:template.rewards.complete.gold,materials:{...template.rewards.complete.materials}};
 return result;
}
