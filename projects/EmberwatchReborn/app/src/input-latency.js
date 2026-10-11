// Bounded in-memory observations. These clocks measure handler/render calls,
// not physical display scanout, loudspeaker onset, or original POE2 timing.
const MOBILITY_ACTIONS=['dodgeSprint','dodgeOnly','sprint'];
// Only these immediately adjacent start/sound pairs have a known cast identity
// in the existing combat event contract. Impacts/releases/foley stay unlinked.
const START_SOUNDS={mace_swing:'slash',shield_charge:'dash',righteous_hammer:'magicCharge',lay_on_hands:'magicCharge',judgement:'magicCharge',battle_banner:'magicCharge',zealous_onslaught:'magicCharge'};
export function createInputLatency({limit=96,now=()=>performance.now()}={}){
 const records=[];let sequence=0,pending=null,mobility=null;const casts=new Map();
 const add=(kind,data={})=>{const item={kind,at:now(),...data};records.push(item);if(records.length>limit)records.shift();return item;};
 const clear=(reason='safety')=>{if(pending)add('cancelled',{...pending,reason});pending=null;};
 const consume=(matches,reason)=>{if(!pending)return null;if(!matches(pending)){clear(reason);return null;}const value=pending;pending=null;return value;};
 const accepted=value=>typeof value==='boolean'?value:null;
 return {
  // The caller resolves the slot at receipt time. Never resolve it later from
  // a changed loadout or infer a skill from an old slot name.
  press(action,{skillId=null}={}){clear('superseded-input');pending={sequence:++sequence,action,skillId,intent:MOBILITY_ACTIONS.includes(action)?'mobility':skillId?'skill':'unresolved',receivedAt:now()};add('input',pending);return {...pending};},
  waiting(){if(pending)add('save-wait',{...pending});},
  // An unlinked held start has an observed start clock, not a physical receipt.
  // A guard/other skill receipt must never become this action's input baseline.
  started(event){const value=consume(p=>p.intent==='skill'&&p.skillId===event.id,'unmatched-action-start')??{sequence:++sequence,action:event.id,receivedAt:null,heldRepeat:true};casts.set(event.castId,{sequence:value.sequence,rendered:false});if(casts.size>limit)casts.delete(casts.keys().next().value);return add('action-start',{...value,castId:event.castId,skillId:event.id,timingBasis:value.heldRepeat?'action-start':'input',delayMs:value.heldRepeat?null:Math.max(0,now()-value.receivedAt)});},
  mobilityStarted(event){const state=event.type==='roll-start'?'roll':'sprint',value=consume(p=>p.intent==='mobility'&&p.action===event.reason&&(state==='roll'?p.action!=='sprint':p.action==='sprint'),'unmatched-mobility-start')??{sequence:++sequence,action:event.type,receivedAt:null,heldTransition:true};mobility={sequence:value.sequence,state,rendered:false};return add('mobility-start',{...value,state,timingBasis:value.heldTransition?'mobility-start':'input',delayMs:value.heldTransition?null:Math.max(0,now()-value.receivedAt)});},
  // Capture identities before the actual renderer call and return them to its
  // caller. Only a successfully returned call receives a matching return mark.
  renderEntered(action,pose){const observation=[];const cast=casts.get(action?.castId);if(cast&&!cast.rendered){cast.rendered=true;observation.push({kind:'first-render',castId:action.castId,sequence:cast.sequence});}if(mobility&&!mobility.rendered&&pose?.state===mobility.state){mobility.rendered=true;observation.push({kind:'mobility-first-render',sequence:mobility.sequence,state:mobility.state});}for(const {kind,...data} of observation)add(kind+'-enter',data);return observation;},
  renderReturned(observation){for(const {kind,...data} of observation)add(kind+'-return',data);},
  soundRequested(event,result,previous){const castId=previous?.type==='actionStarted'&&START_SOUNDS[previous.id]===event.name&&casts.has(previous.castId)?previous.castId:null;add('audio-request-result',{name:event.name,accepted:accepted(result),castId,sequence:casts.get(castId)?.sequence??null,linkBasis:castId===null?null:'adjacent-action-start'});},
  mobilitySoundRequested(start,result){add('audio-request-result',{name:'dash',accepted:accepted(result),castId:null,sequence:start.sequence,linkBasis:'mobility-start'});},
  mark(kind,castId){add(kind,{castId,sequence:casts.get(castId)?.sequence??null});},
  clear,
  snapshot(){return records.map(x=>({...x}));}
 };
}
