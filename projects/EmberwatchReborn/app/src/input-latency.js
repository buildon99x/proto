// Bounded in-memory observations. These clocks measure handler/render calls,
// not physical display scanout, loudspeaker onset, or original POE2 timing.
export function createInputLatency({limit=96,now=()=>performance.now()}={}){
 const records=[];let sequence=0,pending=null,castToSequence=new Map(),mobility=null;
 const add=(kind,data={})=>{const item={kind,at:now(),...data};records.push(item);if(records.length>limit)records.shift();return item;};
 return {
  press(action){pending={sequence:++sequence,action,receivedAt:now()};add('input',pending);return {...pending};},
  waiting(){if(pending)add('save-wait',{...pending});},
  // An unlinked held start has an observed start clock, not a physical receipt.
  // Preserve its independent identity without reporting invented 0ms input lag.
  started(event){const value=pending??{sequence:++sequence,action:event.id,receivedAt:null,heldRepeat:true};pending=null;castToSequence.set(event.castId,value.sequence);if(castToSequence.size>limit)castToSequence.delete(castToSequence.keys().next().value);add('action-start',{...value,castId:event.castId,skillId:event.id,timingBasis:value.heldRepeat?'action-start':'input',delayMs:value.heldRepeat?null:Math.max(0,now()-value.receivedAt)});},
  mobilityStarted(event){const value=pending??{sequence:++sequence,action:event.type,receivedAt:null,heldTransition:true};pending=null;mobility={sequence:value.sequence,state:event.type==='roll-start'?'roll':'sprint',rendered:false};add('mobility-start',{...value,state:mobility.state,timingBasis:value.heldTransition?'mobility-start':'input',delayMs:value.heldTransition?null:Math.max(0,now()-value.receivedAt)});},
  mobilityRendered(pose){if(mobility&&!mobility.rendered&&pose?.state===mobility.state){add('mobility-first-render-dispatch',{sequence:mobility.sequence,state:mobility.state});mobility.rendered=true;}},
  mark(kind,castId){add(kind,{castId,sequence:castToSequence.get(castId)??null});},
  clear(reason='safety'){if(pending)add('cancelled',{...pending,reason});pending=null;},
  snapshot(){return records.map(x=>({...x}));}
 };
}
