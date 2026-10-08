import {createCampaignSave,validateCampaignSave} from './save.js';

const copy=value=>JSON.parse(JSON.stringify(value));
// Coordinates immutable game commands with persistence. Rewards, equipment and
// world transitions become visible only after their complete save commits.
export function createCampaignController(store,{validate=validateCampaignSave}={}){
 let current=null,revision=0,queue=Promise.resolve(),blocked=null;
 const listeners=new Set();
 const snapshot=()=>current?copy(current):null;
 function announce(event){for(const listener of listeners){try{listener(event);}catch{/* UI observer cannot invalidate a committed save. */}}}
 function enqueue(operation){const result=queue.then(operation);queue=result.catch(()=>{});return result;}
 async function load(){return enqueue(async()=>{
  const result=store.load();if(!result.ok){blocked=result;return result;}
  if(result.save){const check=validate(result.save);if(!check.ok){blocked={ok:false,code:'INVALID_CAMPAIGN',errors:check.errors};return blocked;}}
  current=result.save?copy(result.save):null;revision=result.revision;blocked=null;
  return {...result,save:snapshot()};
 });}
 async function start(classId,initialize=save=>({ok:true,save})){
  return enqueue(async()=>{
   if(blocked)return {...blocked,blocked:true};
   if(current)return {ok:false,code:'CAMPAIGN_EXISTS'};
   const loaded=store.load();if(!loaded.ok)return loaded;if(loaded.save)return {ok:false,code:'CAMPAIGN_EXISTS'};
   const result=initialize(createCampaignSave(classId));if(!result.ok)return result;
   const check=validate(result.save);if(!check.ok)return {ok:false,code:'INVALID_CAMPAIGN',errors:check.errors};
   const saved=await store.save(result.save,{expectedRevision:loaded.revision});
   if(!saved.ok)return saved;
   current=copy(result.save);revision=saved.revision;announce({type:'started',revision});return {ok:true,save:snapshot(),revision};
  });
 }
 async function dispatch(command,reducer){
  // Snapshot user intent now, before the queued asynchronous write can yield.
  let intent;try{intent=copy(command);}catch{return {ok:false,code:'INVALID_COMMAND'};}
  return enqueue(async()=>{
   if(blocked)return {...blocked,blocked:true};
   if(!current)return {ok:false,code:'NO_CAMPAIGN'};
   let result;try{result=reducer(copy(current),intent);}catch{return {ok:false,code:'COMMAND_FAILED'};}
   if(!result?.ok)return result??{ok:false,code:'INVALID_RESULT'};
   const check=validate(result.save);if(!check.ok)return {ok:false,code:'INVALID_CAMPAIGN',errors:check.errors};
   const saved=await store.save(result.save,{expectedRevision:revision});
   if(!saved.ok){if(saved.code==='CONFLICT')blocked=saved;announce({type:'saveFailed',code:saved.code});return saved;}
   current=copy(result.save);revision=saved.revision;
   const events=copy(result.events??[]);announce({type:'committed',revision,events});
   return {...result,save:snapshot(),revision,events};
  });
 }
 return {load,start,dispatch,snapshot,revision:()=>revision,subscribe(listener){listeners.add(listener);return ()=>listeners.delete(listener);}};
}
