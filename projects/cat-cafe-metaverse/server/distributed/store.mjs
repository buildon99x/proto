import {ATOMIC_SCRIPT as script} from './atomic-script.mjs';
import {createRedisTransport} from './rest.mjs';
export const DEFAULT_LIMITS=Object.freeze({dayOps:100000,monthOps:350000,dayBytes:256*1024*1024,monthBytes:1024*1024*1024,activeMs:30*60000});
export function createRedisStore({url,token,namespace,budgetNamespace,limits={},fetchImpl,clock=Date.now}={}){
 for(const value of [namespace,budgetNamespace])if(typeof value!=='string'||!/^cat-cafe:[a-zA-Z0-9:_-]{1,120}$/.test(value))throw Error('Invalid fixed store namespace');
 const transport=createRedisTransport({url,token,fetchImpl});
 const bounded={...DEFAULT_LIMITS,...limits};for(const [key,max] of Object.entries(DEFAULT_LIMITS))if(!Number.isSafeInteger(bounded[key])||bounded[key]<1||bounded[key]>max)throw Error('Invalid budget limit');
 let blocked=null;
 async function invoke(operation,request){
  if(blocked?.availability.resetAt&&clock()>=blocked.availability.resetAt)blocked=null;
  if(blocked&&operation!=='bootstrap')return blocked;
  const args=['EVAL',script,2,budgetNamespace,namespace,operation,JSON.stringify(request),JSON.stringify(bounded)];
  args.push(Buffer.byteLength(JSON.stringify(args))+32);
  const result=await transport.command(args);
  const view=JSON.parse(result);
  if(!view.availability||typeof view.availability.ok!=='boolean')throw Error('Invalid store response');
  if(operation==='bootstrap'&&view.availability.ok)blocked=null;
  if(view.checkpoint)view.checkpoint=JSON.parse(view.checkpoint);
  if(typeof view.snapshots==='string')view.snapshots=JSON.parse(view.snapshots);
  if(view.commands&&!Array.isArray(view.commands))view.commands=Object.values(view.commands);
  if(['BUDGET_EXHAUSTED','STORE_NOT_INITIALIZED','SCHEMA_MISMATCH','STATE_TOO_LARGE','BUDGET_STATE_MISSING'].includes(view.availability.reason))blocked=view;
  return view;
 }
 return {
  metrics:transport.metrics,
  bootstrap:()=>invoke('bootstrap',{}),
  check:()=>invoke('check',{}),
  open:request=>{
   if(!Array.isArray(request.commands)||request.commands.length>128)throw Error('Invalid command batch');
   for(const command of request.commands){
    if(!command||typeof command.connectionId!=='string'||command.connectionId.length>128||!/^\d{1,16}:[a-zA-Z0-9-]+$/.test(command.connectionId)||!Number.isSafeInteger(command.seq)||command.seq<0||command.id!==`${command.connectionId}:${command.seq}`||!Number.isSafeInteger(command.issuedAt)||!['join','move','action','leave','disconnect','presence'].includes(command.type)||Buffer.byteLength(JSON.stringify(command))>2048)throw Error('Invalid command');
   }
   return invoke('open',request);
  },
  commit:request=>{
   const snapshots=request.snapshots??{},results=request.results??{};
   // Each of six visitors sees only its room; reserve protocol/framing overhead.
   const largest=Math.max(0,...Object.values(snapshots).map(value=>Buffer.byteLength(JSON.stringify(value))));
   const egressBytes=6*(largest+512)+Buffer.byteLength(JSON.stringify(results))+32*Object.keys(results).length;
   return invoke('commit',{...request,egressBytes,checkpoint:JSON.stringify(request.checkpoint),snapshots:JSON.stringify(snapshots)});
  },
  release:request=>invoke('release',request)
 };
}
