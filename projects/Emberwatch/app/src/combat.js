// Serializable event-timed combat. Simulation events never depend on render frames.
export function startCombatAction(actor, {name='attack', duration=.4, contact=.12, payload={}, movement=.72, replace=false}={}) {
 if(actor.action&&!replace)return false;
 actor.action={name,elapsed:0,duration:Math.max(.01,duration),contact:Math.max(0,Math.min(contact,duration)),committed:false,payload,movement};
 return true;
}
export function advanceCombatAction(actor, dt) {
 const a=actor.action;if(!a)return null;
 a.elapsed=Math.min(a.duration,a.elapsed+Math.max(0,dt));
 const contact=!a.committed&&a.elapsed>=a.contact;
 if(contact)a.committed=true;
 const finished=a.elapsed>=a.duration;
 const event={action:a,contact,finished};
 if(finished)actor.action=null;
 return event;
}
export function cancelCombatAction(actor) {const previous=actor.action;actor.action=null;return previous;}
export function combatPose(actor) {const a=actor.action;return a?{action:a.name,phase:Math.min(1,a.elapsed/a.duration),frame:Math.min(23,Math.floor(24*a.elapsed/a.duration))}:null;}
export function combatHitstop({heavy=false,critical=false,spell=false}={}) {return heavy?.075:critical?.055:spell?.035:.042;}
export function segmentHitsCircle(ax,ay,bx,by,cx,cy,r){let dx=bx-ax,dy=by-ay,l=dx*dx+dy*dy,t=l?Math.max(0,Math.min(1,((cx-ax)*dx+(cy-ay)*dy)/l)):0;return Math.hypot(ax+t*dx-cx,ay+t*dy-cy)<=r;}
