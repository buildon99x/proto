// Reuses Emberwatch motion/audio and deterministic Canvas motifs. No combat,
// targeting, HP, physics, RNG or saved state is changed by presentation.
export const POE_FEEDBACK_STYLES=Object.freeze({
 mace_swing:{color:'#eee0c5',accent:'#cbb180',motif:'arc'},
 righteous_hammer:{color:'#ffe29a',accent:'#a9dfe9',motif:'orbit'},
 shield_charge:{color:'#b5e7df',accent:'#e1f2f0',motif:'chevron'},
 lay_on_hands:{color:'#bce5bb',accent:'#eef4cf',motif:'petal'},
 judgement:{color:'#f4c868',accent:'#fff1bc',motif:'rune'},
 battle_banner:{color:'#e8d398',accent:'#b7dce0',motif:'rune'},
 zealous_onslaught:{color:'#b9d7eb',accent:'#f0dbab',motif:'chevron'}
});
const bounded=v=>Math.max(0,Math.min(1,Number.isFinite(v)?v:0));
export function mobilityMotion(pose,actor=null){
 if(!pose||!Number.isFinite(pose.elapsed))return null;
 if(pose.state==='roll')return {action:'dodge',phase:bounded(pose.elapsed/(pose.elapsed+pose.remaining||1))};
 if(pose.state==='knockdown')return {action:'hurt',phase:bounded(pose.elapsed/(pose.elapsed+pose.remaining||1))};
 if(pose.state==='sprint')return {action:'run',phase:Number.isFinite(actor?.walkPhase)?actor.walkPhase:(pose.elapsed*2.8)%1};
 return null;
}
export function createPoeFeedback(){
 let particles=[];const seen=new Set(),channels=new Set();
 return {clear(){particles=[];seen.clear();channels.clear();},accept(events,p){
  for(const e of events){
   // Onslaught emits real channelPulse events instead of actionContact. Track
   // accepted casts so its last pulse still works when combat already ended it.
   if(e.type==='actionStarted'&&e.id==='zealous_onslaught'){channels.add(e.castId);if(channels.size>96)channels.delete(channels.values().next().value);continue;}
   if(e.type==='channelEnded'){channels.delete(e.castId);continue;}
   const pulse=e.type==='channelPulse'&&channels.has(e.castId)&&Number.isInteger(e.index)&&e.index>0;
   const id=pulse?'zealous_onslaught':e.type==='actionContact'?e.id:null;
   if(!POE_FEEDBACK_STYLES[id])continue;
   const key=`${e.castId}:${id}${pulse?`:pulse:${e.index}`:''}`;
   if(seen.has(key))continue;seen.add(key);if(seen.size>96)seen.delete(seen.values().next().value);particles.push({skillId:id,castId:e.castId,x:p.x,y:p.y,angle:p.action?.angle??p.angle,life:.42,duration:.42});
  }
  if(particles.length>12)particles=particles.slice(-12);
 },step(dt){if(!Number.isFinite(dt)||dt<0)return;particles=particles.map(e=>({...e,life:e.life-dt})).filter(e=>e.life>0);},snapshot(){return particles.map(e=>({...e}));}};
}
function path(ctx,points,project){points.map(project).forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));}
function polar(origin,radius,angle){return{x:origin.x+Math.cos(angle)*radius,y:origin.y+Math.sin(angle)*radius};}
function circle(origin,radius,n=24,offset=0){return Array.from({length:n+1},(_,i)=>polar(origin,radius,offset+i*Math.PI*2/n));}
// Called before hostile tells, loot, and actors: even reduced FX leave useful
// silhouettes without overpainting enemy danger or producing white flashes.
export function drawPoeGroundFeedback(ctx,{player,pose,destination,feedback=[],project,zoom=1,flashScale=1,enabled=false}={}){
 if(!enabled||!player||typeof project!=='function')return {paths:0,sparks:0};
 const intensity=bounded(flashScale),metrics={paths:0,sparks:0};ctx.save();ctx.lineCap='round';
 const stroke=(points,color,alpha=.5,width=1.4)=>{ctx.beginPath();path(ctx,points,project);ctx.strokeStyle=color;ctx.globalAlpha=alpha;ctx.lineWidth=width;ctx.stroke();metrics.paths++;};
 if(destination&&Number.isFinite(destination.x)&&Number.isFinite(destination.y))stroke([polar(destination,8,0),polar(destination,8,Math.PI/2),polar(destination,8,Math.PI),polar(destination,8,Math.PI*1.5),polar(destination,8,0)],'#c2d5e1',.65,1.7);
 if(pose?.state==='roll'||pose?.state==='sprint'){
  const angle=Math.atan2(pose.direction?.y??0,pose.direction?.x??1),length=pose.state==='roll'?26:20;
  for(let i=0;i<2;i++){const o=polar(player,-i*10,angle);stroke([polar(o,length*.7,angle+2.55),o,polar(o,length*.7,angle-2.55)],'#b9d8df',.38-i*.1,1.4);}
 }
 const action=player.action,style=POE_FEEDBACK_STYLES[action?.id];
 // Channels never set fired: their accepted startup boundary ends preparation.
 if(style&&!action.fired&&action.contact>0&&(!action.spec?.channel||action.elapsed+1e-9<action.contact)){
  const phase=bounded(action.elapsed/action.contact),angle=action.angle??player.angle,radius=13+9*phase;
  stroke(circle(player,radius,24,-phase),style.color,.3+.15*phase,1.1);
  for(let i=0;i<4;i++){const theta=angle+i*Math.PI*.5;stroke([polar(player,radius+3,theta),polar(player,radius+9,theta)],style.accent,.55,1.4);}
  if(style.motif==='arc'||style.motif==='chevron'){const r=Math.min(action.spec?.range??60,72)*.48;stroke(Array.from({length:13},(_,i)=>polar(player,r,angle-.7+i*1.4/12)),style.color,.5,2);}
 }
 for(const effect of feedback.slice(-12)){
  const style=POE_FEEDBACK_STYLES[effect.skillId];if(!style)continue;const progress=bounded(1-effect.life/effect.duration),fade=(1-progress)*(.48+.16*intensity),radius=20+progress*44;
  if(style.motif==='arc')for(let band=0;band<2;band++)stroke(Array.from({length:19},(_,i)=>polar(effect,radius+band*7,effect.angle-1.05+i*1.85/18)),band?style.accent:style.color,fade,band?1:2.3);
  else if(style.motif==='chevron')for(let i=0;i<3;i++){const o=polar(effect,progress*45+i*10,effect.angle);stroke([polar(o,17,effect.angle+2.5),o,polar(o,17,effect.angle-2.5)],style.color,fade,2);}
  else if(style.motif==='petal')for(let i=0;i<6;i++){const a=i*Math.PI/3;stroke([polar(effect,radius*.55,a-.12),polar(effect,radius,a),polar(effect,radius*.55,a+.12)],style.color,fade,1.8);}
  else {stroke(circle(effect,radius,32,progress),style.color,fade,2);stroke(circle(effect,radius*.72,24,-progress),style.accent,fade*.8,1);for(let i=0;i<6;i++){const a=i*Math.PI/3+progress;stroke([polar(effect,radius*.83,a),polar(effect,radius*1.08,a)],style.accent,fade,1.7);}}
  if(intensity>0)for(let i=0;i<8;i++){const a=effect.angle+i*2.39996+progress*.7,r=radius*(.55+(i%3)*.2),at=project(polar(effect,r,a));ctx.globalAlpha=fade*intensity;ctx.fillStyle=i%2?style.accent:style.color;const size=(1-progress)*(i%3?1.6:2.5)*zoom;ctx.fillRect(at.x-size/2,at.y-size/2,size,size);metrics.sparks++;}
 }
 ctx.restore();return metrics;
}
