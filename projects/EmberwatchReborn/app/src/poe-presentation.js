// Reuses Emberwatch motion/audio and deterministic Canvas motifs. No combat,
// targeting, HP, physics, RNG or saved state is changed by presentation.
export const POE_FEEDBACK_STYLES=Object.freeze({
 mace_swing:{color:'#eee0c5',accent:'#cbb180',motif:'arc'},
 righteous_hammer:{color:'#ffe29a',accent:'#a9dfe9',motif:'orbit'},
 shield_charge:{color:'#b5e7df',accent:'#e1f2f0',motif:'shield'},
 lay_on_hands:{color:'#bce5bb',accent:'#eef4cf',motif:'petal'},
 judgement:{color:'#f4c868',accent:'#fff1bc',motif:'flame'},
 battle_banner:{color:'#e8d398',accent:'#b7dce0',motif:'banner'},
 zealous_onslaught:{color:'#b9d7eb',accent:'#f0dbab',motif:'lance'}
});
// Counts are actual Canvas stroke/fillRect calls, including the local keyline.
export const POE_FEEDBACK_LIMITS=Object.freeze({effects:12,pathsPerEffect:16,preparationPaths:12,movementPaths:4,destinationPaths:2,sparksPerEffect:8,outline:'#111520'});
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
   // Crusher contact is a weapon swing, not a free ground payoff. Its real
   // damaging hit/Heavy Stun/wave are rendered from authoritative combat FX.
   if(e.type==='actionContact'&&(e.crusher===true||e.storm===true||e.magma===true))continue;
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
  if(particles.length>POE_FEEDBACK_LIMITS.effects)particles=particles.slice(-POE_FEEDBACK_LIMITS.effects);
 },step(dt){if(!Number.isFinite(dt)||dt<0)return;particles=particles.map(e=>({...e,life:e.life-dt})).filter(e=>e.life>0);},snapshot(){return particles.map(e=>({...e}));}};
}
function path(ctx,points,project){points.map(project).forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));}
function polar(origin,radius,angle){return{x:origin.x+Math.cos(angle)*radius,y:origin.y+Math.sin(angle)*radius};}
function arc(origin,radius,start,sweep,n=12){return Array.from({length:n+1},(_,i)=>polar(origin,radius,start+i*sweep/n));}
// Called before hostile tells, loot, and actors: even reduced FX leave useful
// silhouettes without overpainting enemy danger or producing white flashes.
export function drawPoeGroundFeedback(ctx,{player,pose,destination,feedback=[],project,zoom=1,flashScale=1,enabled=false}={}){
 if(!enabled||!player||typeof project!=='function')return {paths:0,sparks:0};
 const intensity=bounded(flashScale),metrics={paths:0,sparks:0};ctx.save();ctx.lineCap='round';ctx.lineJoin='round';ctx.globalCompositeOperation='source-over';
 // A crisp same-path dark casing separates motifs from noisy stone without
 // blur, additive bloom, floor fills or a new apparent gameplay boundary.
 const stroke=(points,color,alpha=.8,width=2.3,screen=false)=>{ctx.beginPath();path(ctx,points,screen?p=>p:project);ctx.strokeStyle=POE_FEEDBACK_LIMITS.outline;ctx.globalAlpha=Math.min(.94,alpha*1.12);ctx.lineWidth=width+2.8;ctx.stroke();ctx.strokeStyle=color;ctx.globalAlpha=alpha;ctx.lineWidth=width;ctx.stroke();metrics.paths+=2;};
 const glyph=(origin,points,color,alpha,width=2.3,lift=0)=>{const at=project(origin);stroke(points.map(([x,y])=>({x:at.x+x*zoom,y:at.y+(y-lift)*zoom})),color,alpha,width,true);};
 if(destination&&Number.isFinite(destination.x)&&Number.isFinite(destination.y))stroke([polar(destination,8,0),polar(destination,8,Math.PI/2),polar(destination,8,Math.PI),polar(destination,8,Math.PI*1.5),polar(destination,8,0)],'#c2d5e1',.65,1.7);
 if(pose?.state==='roll'||pose?.state==='sprint'){
  const angle=Math.atan2(pose.direction?.y??0,pose.direction?.x??1),length=pose.state==='roll'?26:20;
  for(let i=0;i<2;i++){const o=polar(player,-i*10,angle);stroke([polar(o,length*.7,angle+2.55),o,polar(o,length*.7,angle-2.55)],'#b9d8df',.38-i*.1,1.4);}
 }
 const action=player.action,style=POE_FEEDBACK_STYLES[action?.id];
 // Channels never set fired: their accepted startup boundary ends preparation.
 if(style&&!action.fired&&action.contact>0&&(!action.spec?.channel||action.elapsed+1e-9<action.contact)){
  const phase=bounded(action.elapsed/action.contact),angle=action.angle??player.angle,radius=13+9*phase;
  // Four separated inward braces read as preparation, not an expanding AoE.
  for(let i=0;i<4;i++){const theta=angle+i*Math.PI*.5;stroke([polar(player,radius+8,theta-.14),polar(player,radius,theta),polar(player,radius+8,theta+.14)],style.accent,.66+.18*phase,1.8);}
  if(['arc','shield','lance'].includes(style.motif)){const r=25+phase*7;stroke(arc(player,r,angle-.65,1.3),style.color,.7+.16*phase,2.4);}
  else if(style.motif==='orbit')glyph(polar(player,17,angle),[[-6,-13],[6,-13],[6,-8],[-6,-8],[-6,-13]],style.color,.7+.16*phase,2,5);
  else if(style.motif==='petal')for(let i=0;i<2;i++)glyph(player,i?[[-5,-8],[5,-8]]:[[0,-13],[0,-3]],style.color,.7+.16*phase,2,5);
  else if(style.motif==='flame')glyph(polar(player,17,angle),[[-5,0],[-3,-9],[0,-5],[3,-16],[6,-2]],style.color,.7+.16*phase,2,7);
  else glyph(polar(player,17,angle),[[-4,0],[-4,-19],[7,-15],[-4,-11]],style.color,.7+.16*phase,2,5);
 }
 for(const effect of feedback.slice(-POE_FEEDBACK_LIMITS.effects)){
  const style=POE_FEEDBACK_STYLES[effect.skillId];if(!style)continue;const progress=bounded(1-effect.life/effect.duration),fade=Math.pow(1-progress,.7)*(.84+.1*intensity),radius=23+progress*30,angle=effect.angle;
  const local=(forward,side)=>{const o=polar(effect,forward,angle);return polar(o,side,angle+Math.PI/2);};
  if(style.motif==='arc'){
   for(let band=0;band<2;band++)stroke(arc(effect,radius+band*8,angle-1.05+progress*.22,1.85,18),band?style.accent:style.color,fade*(band?.66:1),band?1.7:3.5);
   for(let i=0;i<3;i++){const a=angle-.45+i*.45;stroke([polar(effect,radius-4,a),polar(effect,radius+10-i*2,a+.06)],style.accent,fade,2.1);}
  }else if(style.motif==='lance'){
   // Compact forward crests and a spear-shaped accent, never a closed lane.
   for(let i=0;i<3;i++){const o=local(14+progress*30+i*12,0);stroke([polar(o,18,angle+2.5),o,polar(o,18,angle-2.5)],i===1?style.accent:style.color,fade*(1-i*.12),3.3-i*.35);}
   stroke([local(10+progress*18,0),local(52+progress*18,0)],style.accent,fade*.86,2.2);
   for(const side of [-1,1])stroke([local(5+progress*14,side*18),local(24+progress*24,side*12)],style.color,fade*.6,1.8);
  }else if(style.motif==='shield'){
   const front=24+progress*22;stroke([local(front-9,-16),local(front+5,-11),local(front+10,0),local(front+5,11),local(front-9,16)],style.color,fade,3.6);
   stroke([local(front-2,-10),local(front+3,0),local(front-2,10)],style.accent,fade,2.1);
   for(let i=0;i<2;i++)stroke([local(-12-i*12,-13),local(2-i*12,0),local(-12-i*12,13)],style.color,fade*(.75-i*.16),2.4);
   for(const side of [-1,1])stroke([local(front-18,side*21),local(front+2,side*19)],style.accent,fade*.6,1.6);
  }else if(style.motif==='petal'){
   for(let i=0;i<6;i++){const a=i*Math.PI/3+progress*.18;stroke([polar(effect,radius*.52,a-.2),polar(effect,radius,a),polar(effect,radius*.52,a+.2)],style.color,fade,2.5);}
   const rise=7+progress*13;glyph(effect,[[0,-12],[0,0]],style.accent,fade,2.5,rise);glyph(effect,[[-6,-6],[6,-6]],style.accent,fade,2.5,rise);
  }else if(style.motif==='orbit'){
   for(let i=0;i<2;i++)stroke(arc(effect,radius+i*6,angle+progress*.7+i*Math.PI,Math.PI*.72,14),i?style.accent:style.color,fade*(i?.65:1),i?1.8:3);
   const at=local(34+progress*20,0),rise=12+progress*6;
   glyph(at,[[-10,-13],[9,-13],[9,-4],[-10,-4],[-10,-13]],style.color,fade,3,rise);glyph(at,[[0,-4],[0,12]],style.accent,fade,2.5,rise);
   glyph(at,[[-6,-10],[5,-10]],style.accent,fade,1.5,rise);
   for(const side of [-1,1])glyph(at,[[side*15,-12],[side*20,-17]],style.accent,fade*.7,1.8,rise);
  }else if(style.motif==='flame'){
   for(let i=0;i<3;i++){const at=local(19+progress*22,(i-1)*17),rise=5+progress*10+(i===1?5:0);
    glyph(at,[[-7,2],[-5,-9],[-2,-4],[2,-23],[8,-6],[6,2]],style.color,fade*(i===1?1:.82),2.8,rise);
    glyph(at,[[-1,0],[2,-10],[4,-2]],style.accent,fade*.85,1.7,rise);
   }
   for(const side of [-1,1])stroke([local(12,side*26),local(34+progress*24,side*30)],style.accent,fade*.65,2);
  }else if(style.motif==='banner'){
   const at=local(30,0),rise=4+progress*8;
   glyph(at,[[-5,5],[-5,-30]],style.accent,fade,2.5,rise);glyph(at,[[-5,-29],[15,-23],[9,-17],[-5,-19]],style.color,fade,3,rise);
   glyph(at,[[1,-25],[9,-23],[5,-21]],style.accent,fade*.8,1.6,rise);
   for(let i=0;i<3;i++)stroke(arc(effect,radius+i*7,angle+.4+i*.12,1.05,8),i%2?style.accent:style.color,fade*(.76-i*.16),2.1);
   glyph(at,[[-9,-33],[-5,-37],[-1,-33]],style.color,fade*.7,1.7,rise);
  }
  if(intensity>0)for(let i=0;i<POE_FEEDBACK_LIMITS.sparksPerEffect;i++){const a=effect.angle+i*2.39996+progress*.7,r=radius*(.55+(i%3)*.2),at=project(polar(effect,r,a));ctx.globalAlpha=fade*intensity;ctx.fillStyle=i%2?style.accent:style.color;const size=(1-progress)*(i%3?1.6:2.5)*zoom;ctx.fillRect(at.x-size/2,at.y-size/2,size,size);metrics.sparks++;}
 }
 ctx.restore();return metrics;
}
