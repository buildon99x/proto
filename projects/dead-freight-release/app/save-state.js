/* Keep pending awards separate until a synchronous browser-storage write succeeds. */
(function(root){
'use strict';
const KEY='deadfreight-best';
function decode(raw){
 const data=raw===null?{}:JSON.parse(raw);
 if(!data||typeof data!=='object'||Array.isArray(data))throw new Error('Invalid saved record');
 const cash=data.cash??0,storedLevel=data.level??(data.schema===2?1:0);
 if(!Number.isFinite(cash)||cash<0||!Number.isSafeInteger(storedLevel)||storedLevel<0||storedLevel>=Number.MAX_SAFE_INTEGER)throw new Error('Invalid saved values');
 const nextLevel=data.schema===2?Math.max(1,storedLevel):storedLevel+1;
 return {data,cash,nextLevel};
}
function create(storage){
 let saved={data:{},cash:0,nextLevel:1},known=false,pendingCash=0,pendingLevel=null,status='ready';
 function read(){saved=decode(storage.getItem(KEY));known=true;return saved;}
 try{read();}catch(error){status='read-error';}
 function snapshot(){return {known,bank:saved.cash,nextLevel:Math.max(saved.nextLevel,pendingLevel||1),pendingCash,pending:pendingLevel!==null,status};}
 function retry(){
  try{
   const base=read();
   if(pendingLevel!==null){const cash=base.cash+pendingCash;if(!Number.isFinite(cash))throw new Error('Bank total overflow');const data={...base.data,schema:2,cash,level:Math.max(base.nextLevel,pendingLevel)};storage.setItem(KEY,JSON.stringify(data));saved=decode(JSON.stringify(data));pendingCash=0;pendingLevel=null;}
   status='ready';return true;
  }catch(error){status=known?'write-error':'read-error';return false;}
 }
 function award(cash,nextLevel){
  if(!Number.isFinite(cash)||cash<0||!Number.isSafeInteger(nextLevel)||nextLevel<1)throw new Error('Invalid extraction award');
  pendingCash+=cash;pendingLevel=Math.max(pendingLevel||1,nextLevel);return retry();
 }
 return {snapshot,retry,award};
}
const api={KEY,decode,create};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.DFSaveState=api;
})(typeof globalThis!=='undefined'?globalThis:this);
