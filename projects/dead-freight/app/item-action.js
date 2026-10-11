/* Single-owner first-person item timeline. No inventory or renderer side effects. */
(function(root){
'use strict';
const timings=Object.freeze({frag:{lower:.22,present:.32,use:.38,commit:.23,recover:.66},bandage:{lower:.22,present:.38,use:1.5,commit:1.18,recover:.66},medkit:{lower:.22,present:.4,use:2.1,commit:1.72,recover:.70},scanner:{lower:.22,present:.3,use:.55,commit:.32,recover:.64}});
class ItemAction {
 constructor(){this.sequence=0;this.reset();}
 reset(){this.stage='idle';this.elapsed=0;this.itemId=null;this.uid=null;this.location=null;this.committed=false;this.cancelled=false;this.recoverFrom=null;this.triggerInput=null;this.cues=[];this.cueKeys=new Set();}
 get active(){return this.stage!=='idle';}
 start(stack,location){if(this.active||!stack?.uid||!timings[stack.itemId])return false;this.itemId=stack.itemId;this.uid=stack.uid;this.location=location;this.stage='lower';this.elapsed=0;this.committed=false;this.cancelled=false;this.sequence++;this.cueKeys.clear();this.cues=[];this.cue('lower','cloth-out');return true;}
 trigger(input=null){if(this.itemId!=='frag'||this.stage!=='ready')return false;this.stage='aim';this.elapsed=0;this.triggerInput=input;return true;}
 release(input=null){if(this.stage!=='aim'||input!==this.triggerInput)return false;const ready=this.elapsed>=.1-1e-9;this.stage=ready?'use':'ready';this.elapsed=0;this.triggerInput=null;return ready;}
 cue(marker,cue){if(this.cancelled||this.cueKeys.has(marker))return;this.cueKeys.add(marker);this.cues.push({cue,marker,sequence:this.sequence,itemId:this.itemId});}
 drainCues(){return this.cues.splice(0);}
 cancel(){if(!this.active||this.stage==='recover')return false;this.recoverFrom=this.snapshot();this.cues=[];this.cancelled=true;this.stage='recover';this.elapsed=0;return true;}
 tick(dt){if(!Number.isFinite(dt)||dt<=0||!this.active)return [];let left=Math.min(.25,dt),events=[];const t=timings[this.itemId];for(let guard=0;guard<6&&left>1e-9&&this.active;guard++){
  if(this.stage==='ready')break;if(this.stage==='aim'){this.elapsed=Math.min(.1,this.elapsed+left);break;}
  const length=t[this.stage],next=this.stage==='use'&&!this.committed&&!this.cancelled?t.commit:length;
  const step=Math.min(left,Math.max(0,next-this.elapsed));this.elapsed+=step;left-=step;
  if(this.stage==='use'){if(this.itemId==='frag'&&this.elapsed>=.09-1e-9)this.cue('pin','pin');if(['bandage','medkit'].includes(this.itemId)&&this.elapsed>=(this.itemId==='bandage'?.30:.42)-1e-9)this.cue('treatment','medical');}
  if(this.stage==='use'&&!this.committed&&this.elapsed>=t.commit-1e-9){this.committed=true;if(this.itemId==='frag')this.cue('release','cloth-out');events.push({type:'commit',itemId:this.itemId,uid:this.uid,location:this.location,sequence:this.sequence});continue;}
  if(this.elapsed<length-1e-9)break;
  if(this.stage==='recover'){events.push({type:'complete',sequence:this.sequence});this.reset();break;}
  if(this.stage==='use')this.recoverFrom=this.snapshot();
  this.stage=this.stage==='lower'?'present':this.stage==='present'?(this.itemId==='frag'?'ready':'use'):'recover';this.elapsed=0;
  if(this.stage==='present')this.cue('present','cloth-in');if(this.stage==='recover')this.cue('return','cloth-in');
  events.push({type:'stage',stage:this.stage,itemId:this.itemId,sequence:this.sequence});
 }return events;}
 snapshot(){const t=timings[this.itemId],progress=t&&!['ready','aim'].includes(this.stage)?Math.min(1,this.elapsed/t[this.stage]):0,total=t?t.lower+t.present+t.use+t.recover:1,offset=t?({lower:0,present:t.lower,ready:t.lower+t.present,aim:t.lower+t.present,use:t.lower+t.present,recover:t.lower+t.present+t.use})[this.stage]||0:0,totalProgress=this.cancelled&&this.recoverFrom?this.recoverFrom.totalProgress+(1-this.recoverFrom.totalProgress)*progress:Math.min(1,(offset+(this.stage==='aim'?0:this.elapsed))/total);return {holdProgress:this.stage==='aim'?Math.min(1,this.elapsed/.1):0,totalProgress,active:this.active,stage:this.stage,itemId:this.itemId,uid:this.uid,location:this.location,sequence:this.sequence,elapsed:this.elapsed,progress:t&&!['ready','aim'].includes(this.stage)?Math.min(1,this.elapsed/t[this.stage]):0,committed:this.committed,cancelled:this.cancelled,recoverFrom:this.recoverFrom};}
}
const api={ItemAction,timings};root.DFItemAction=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
