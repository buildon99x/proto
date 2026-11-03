// One short hunt, a watchful pause, then a second chance to catch the feather.
// The existing four-second expiry is the entire action clock: no hidden state,
// checkpoint fields, timers, randomness or rotating world-clock target.
const HUNT=[
 [250,'focus'],[1150,'stalk'],[1650,'pounce'],[2850,'pause'],
 [3200,'stalk'],[3550,'pounce'],[4000,'pause']
];
export function featherPhase(untilMs,nowMs){
 const elapsed=Math.round(nowMs-(untilMs-4000));
 if(!Number.isFinite(elapsed)||elapsed<0||elapsed>=4000)return{phase:'idle',progress:0};
 let start=0;
 for(const [end,phase]of HUNT){
  if(elapsed<end)return{phase,progress:(elapsed-start)/(end-start)};
  start=end;
 }
}
const wrap=angle=>Math.atan2(Math.sin(angle),Math.cos(angle));
export function tickFeather(cat,owner,untilMs,nowMs,dt,valid){
 dt=Number.isFinite(dt)?Math.max(0,Math.min(.05,dt)):0;
 const {phase}=featherPhase(untilMs,nowMs);
 if(!dt||!owner||!['stalk','pounce'].includes(phase))return;
 // A different side for each cat, but a stationary owner never sends it around
 // in circles. Moving the owner moves the lure during the next active phase.
 const angle=(Number(cat.id.slice(4))||0)*Math.PI/4;
 const tx=owner.x+Math.sin(angle)*.8,tz=owner.z+Math.cos(angle)*.8;
 const dx=tx-cat.x,dz=tz-cat.z,d=Math.hypot(dx,dz);
 const clearance=phase==='stalk'?.45:.18;
 if(d<=clearance)return;
 const desired=Math.atan2(dx,dz),error=wrap(desired-cat.yaw);
 const yaw=wrap(cat.yaw+Math.max(-2.6*dt,Math.min(2.6*dt,error)));
 // Turn in a small forward arc instead of snapping or walking backwards.
 const alignment=Math.max(.1,Math.cos(wrap(desired-yaw)));
 const speed=phase==='stalk'?.55:2.4;
 const travel=Math.min(d-clearance,speed*dt*alignment);
 const nx=cat.x+Math.sin(yaw)*travel,nz=cat.z+Math.cos(yaw)*travel;
 // A blocked/arrived/watching cat holds its full pose, including heading.
 if(travel>1e-10&&valid(nx,nz)){cat.x=nx;cat.z=nz;cat.yaw=yaw;}
}
