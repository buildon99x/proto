/* Authoritative ammunition commits and per-consumer shot identity claims. */
(function(root){
'use strict';
const integer=n=>Number.isSafeInteger(n)&&n>=0;
const identity=s=>typeof s==='string'&&s.length>0&&s.length<=180&&!/[\u0000-\u001f]/.test(s);
function shotId(weaponInstanceId,sessionId,sequence){if(!identity(weaponInstanceId)||!identity(sessionId)||!Number.isSafeInteger(sequence)||sequence<1)throw new TypeError('Invalid shot identity');return JSON.stringify([weaponInstanceId,sessionId,sequence]);}
class ShotJournal{
 constructor(){this.entries=new Map();}
 claim(id,consumer='simulation'){
  if(typeof id!=='string'||!id.length||id.length>500||!identity(consumer))return false;
  let entry=this.entries.get(id);if(entry?.has(consumer))return false;
  if(!entry){entry=new Set();this.entries.set(id,entry);}entry.add(consumer);return true;
 }
 has(id,consumer='simulation'){return !!this.entries.get(id)?.has(consumer);}
 get size(){return this.entries.size;}
}
class AmmoLedger{
 constructor({magazineSize=30,magazine=0,chamber=0,reserve=0}={}){
  if(!integer(magazineSize)||magazineSize<1)throw new RangeError('Invalid ledger magazine capacity');this.magazineSize=magazineSize;this.entries=[];this.commits=new Set();this.serial=0;
  this.state=this.validate({magazine,chamber,reserve});this.initial=this.total;this.external=0;this.spent=0;
 }
 validate(state){if(!state||!integer(state.magazine)||state.magazine>this.magazineSize||![0,1].includes(state.chamber)||!integer(state.reserve)||!Number.isSafeInteger(state.magazine+state.chamber+state.reserve))throw new RangeError('Invalid ammunition state');return Object.freeze({magazine:state.magazine,chamber:state.chamber,reserve:state.reserve});}
 get magazine(){return this.state.magazine;}get chamber(){return this.state.chamber;}get reserve(){return this.state.reserve;}get total(){return this.magazine+this.chamber+this.reserve;}
 snapshot(){return {...this.state,total:this.total,initial:this.initial,external:this.external,spent:this.spent};}
 commit(id,type,next,spent=0,external=0){
  if(typeof id!=='string'||!id.length||this.commits.has(id))return null;
  const valid=this.validate(next),before=this.total,after=valid.magazine+valid.chamber+valid.reserve;
  if(after!==before+external-spent)throw new Error('Ammunition conservation violation');
  const entry=Object.freeze({id,type,before:this.state,after:valid,spent,external});this.state=valid;this.spent+=spent;this.external+=external;this.commits.add(id);this.entries.push(entry);return entry;
 }
 shot(id){if(!this.chamber)return null;const next={...this.state,chamber:0};if(next.magazine>0){next.magazine--;next.chamber=1;}return this.commit(id,'shot',next,1);}
 reload(id){const transfer=Math.min(this.magazineSize-this.magazine,this.reserve);return this.commit(id,'reload',{...this.state,magazine:this.magazine+transfer,reserve:this.reserve-transfer});}
 chamberRound(id){if(this.chamber||!this.magazine)return null;return this.commit(id,'chamber',{...this.state,magazine:this.magazine-1,chamber:1});}
 reconcile(next,reason='restore'){const valid=this.validate({...this.state,...next}),external=valid.magazine+valid.chamber+valid.reserve-this.total;if(!external&&valid.magazine===this.magazine&&valid.chamber===this.chamber&&valid.reserve===this.reserve)return true;this.commit('reconcile:'+ ++this.serial,reason,valid,0,external);return true;}
 verify(){return this.total===this.initial+this.external-this.spent;}
 drainEntries(){return this.entries.splice(0);}
}
const API={AmmoLedger,ShotJournal,shotId,validIdentity:identity};root.DFAmmo=API;if(typeof module!=='undefined')module.exports=API;
})(typeof globalThis!=='undefined'?globalThis:this);
