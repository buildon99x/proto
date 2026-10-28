/* Timed visual/action arbitration. Resources remain owned by the inventory bridge. */
(function(root){
'use strict';
const EPS=1e-8;
class LoadoutAction {
 constructor({slot=0,draw=false,timingFor,validSlot=()=>true}={}){if(typeof timingFor!=='function')throw Error('Loadout timings must come from weapon data');this.timingFor=timingFor;this.validSlot=validSlot;this.reset(slot,{draw});}
 reset(slot,{draw=false}={}){this.lastGunSlot=slot;this.shownSlot=slot;this.desiredSlot=slot;this.lower=draw?1:0;this.events=[];this.generation=(this.generation||0)+1;return this.snapshot();}
 get state(){return this.desiredSlot===null?(this.shownSlot===null?'HOLSTERED':'UNEQUIPPING'):this.shownSlot!==this.desiredSlot?'UNEQUIPPING':this.lower>EPS?'EQUIPPING':'READY_HIP';}
 get ready(){return this.state==='READY_HIP';}
 get holstered(){return this.state==='HOLSTERED';}
 requestSlot(slot){if(!Number.isInteger(slot)||slot<0||slot>1||!this.validSlot(slot))return false;this.lastGunSlot=slot;if(this.desiredSlot===slot)return false;this.desiredSlot=slot;return true;}
 requestHolster(){if(this.desiredSlot===null)return false;this.desiredSlot=null;return true;}
 toggleHolster(){if(this.desiredSlot!==null)return this.requestHolster();const slot=this.validSlot(this.lastGunSlot)?this.lastGunSlot:[0,1].find(i=>this.validSlot(i));return slot===undefined?false:this.requestSlot(slot);}
 failCommit(){this.desiredSlot=null;this.shownSlot=null;this.lower=1;this.events=[];}
 _time(slot,key){const value=Number(this.timingFor(slot)?.[key]);if(!Number.isFinite(value)||value<=0||value>10)throw Error('Invalid loadout '+key+' timing');return value;}
 tick(dt){if(!Number.isFinite(dt)||dt<=0)return [];let remaining=Math.min(dt,.25);const emitted=[];
  for(let guard=0;remaining>EPS&&guard<4;guard++){
   if(this.desiredSlot!==this.shownSlot){
    if(this.shownSlot!==null&&this.lower<1-EPS){const duration=this._time(this.shownSlot,'unequip'),used=Math.min(remaining,(1-this.lower)*duration);this.lower=Math.min(1,this.lower+used/duration);remaining-=used;if(this.lower<1-EPS)break;}
    this.lower=1;const previousSlot=this.shownSlot;this.shownSlot=this.desiredSlot;
    emitted.push({type:this.shownSlot===null?'holster':'equip',slot:this.shownSlot,previousSlot,generation:this.generation});
   }
   if(this.shownSlot===null){this.lower=1;break;}
   if(this.lower>EPS){const duration=this._time(this.shownSlot,'equip'),used=Math.min(remaining,this.lower*duration);this.lower=Math.max(0,this.lower-used/duration);remaining-=used;if(this.lower<=EPS){this.lower=0;emitted.push({type:'ready',slot:this.shownSlot,generation:this.generation});}else break;}
   else break;
  }
  if(this.lower>1-EPS)this.lower=1;
  return emitted;
 }
 snapshot(){return {state:this.state,ready:this.ready,holstered:this.holstered,shownSlot:this.shownSlot,pendingSlot:this.desiredSlot,lastGunSlot:this.lastGunSlot,lower:this.lower};}
}
const api={LoadoutAction};root.DFLoadoutAction=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
