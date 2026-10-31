import {randomUUID} from 'node:crypto';
import {createRedisStore} from './distributed/store.mjs';
import {createCoordinator} from './distributed/coordinator.mjs';
import {createGateway,publicStatus} from './vercel-gateway.mjs';

export function allowUpgrade(request){
 try{const page=new URL(request.url);return page.protocol==='https:'&&request.headers.get('origin')===page.origin&&request.headers.get('upgrade')?.toLowerCase()==='websocket';}catch{return false;}
}
export function createRuntime({env=process.env,clock=Date.now,storeFactory=createRedisStore}={}){
 let store,transport,health=null,checked=-Infinity,checking=null;
 const configured=()=>publicStatus(env,{ok:true}).available;
 function getStore(){
  if(!configured())throw Error('Realtime service unavailable');
  store??=storeFactory({url:env.CAT_CAFE_REDIS_REST_URL,token:env.CAT_CAFE_REDIS_REST_TOKEN,
   namespace:'cat-cafe:preview:v1',budgetNamespace:'cat-cafe:resource-budget:v1'});
  return store;
 }
 async function status(){
  if(!configured())return publicStatus(env);
  if(clock()-checked>=15000&&!checking){
   checking=Promise.resolve().then(()=>getStore().check()).then(value=>{health=value.availability??value;},()=>{health={ok:false,reason:'SERVER_UNAVAILABLE'};}).finally(()=>{checked=clock();checking=null;});
  }
  if(checking)await checking;
  return publicStatus(env,health);
 }
 function gateway(){
  if(!publicStatus(env,health).available)throw Error('Realtime service unavailable');
  transport??=createGateway({coordinator:createCoordinator({store:getStore(),ownerId:randomUUID()}),clock,onHealth:value=>{health=value.availability??value;checked=clock();}});
  return transport;
 }
 return{status,gateway};
}
// This singleton contains local sockets/cache only, never authoritative rooms.
let runtimeInstance;
export function getRuntime(){return runtimeInstance??=createRuntime();}
