import {lanceReleaseScale} from './warrior-expert.js';
import {inMap,lineOfSight,traceSegment} from './world-geometry.js';

// Authored presentation only: accepted runtime geometry is never expanded by
// the legacy mace/Judgement +10 center tolerance. No simulation state is written.
export const EXPERT_STYLE=Object.freeze({
 outline:'#161a25',outlineAlpha:.9,outlineWidth:3.4,
 banner:'#ead7b0',bannerAlpha:.92,bannerWidth:1.8,bannerFillAlpha:.06,
 bannerOutline:'#111420',bannerOutlineAlpha:.94,bannerOutlineWidth:4.2,bannerDash:Object.freeze([10,6]),
 flame:'#dfad73',lance:'#e7c58f',effectAlpha:.8,effectWidth:1.5,
 channel:'#abcfc8',channelAlpha:.82,channelWidth:1.5,
 text:'#e1dac4',negative:'#f0b9ad',positive:'#cbdac3'
});
const finitePoint=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
const positive=n=>Number.isFinite(n)&&n>1e-9;
const clamp=n=>Math.max(0,Math.min(1,n));
const seenPoint=(seen,p)=>!seen||!!seen[Math.floor(p.y/32)]?.[Math.floor(p.x/32)];
function clipRay(map,origin,end,seen){
 const hit=traceSegment(map,origin,end);
 if(!seen)return {x:hit.x,y:hit.y};
 const dx=hit.x-origin.x,dy=hit.y-origin.y,n=Math.max(1,Math.ceil(Math.hypot(dx,dy)/4));let safe={x:origin.x,y:origin.y};
 for(let i=1;i<=n;i++){const p={x:origin.x+dx*i/n,y:origin.y+dy*i/n};if(!seenPoint(seen,p))break;safe=p;}
 return safe;
}
function validOrigin(map,p,seen){return finitePoint(p)&&inMap(map,p.x,p.y,0)&&seenPoint(seen,p);}
function sectorOutline(map,origin,angle,radius,arc,seen){
 if(!validOrigin(map,origin,seen)||!Number.isFinite(angle)||!positive(radius)||radius>1000||!positive(arc)||arc>Math.PI*2)return [];
 const segments=Math.max(12,Math.ceil(radius*arc/3)),points=arc<Math.PI*2?[{x:origin.x,y:origin.y}]:[];
 for(let i=0;i<=segments;i++){
  const theta=angle-arc/2+arc*i/segments;
  points.push(clipRay(map,origin,{x:origin.x+Math.cos(theta)*radius,y:origin.y+Math.sin(theta)*radius},seen));
 }
 return points;
}
export function liveBanner(banner,regionId){
 return !!banner&&typeof regionId==='string'&&banner.region===regionId&&positive(banner.remaining)&&positive(banner.radius)&&banner.radius<=1000&&finitePoint(banner);
}
export function bannerOutline(map,banner,regionId,seen){
 return liveBanner(banner,regionId)?sectorOutline(map,banner,0,banner.radius,Math.PI*2,seen):[];
}
export function expertFootprint(effect){
 const shape=effect?.expertFootprint;
 return shape&&['flames_of_devotion','zealous_lance'].includes(shape.skillId)&&positive(effect.life)&&positive(effect.max)&&positive(shape.range)&&shape.range<=1000&&positive(shape.arcRadians)&&shape.arcRadians<=Math.PI*2&&finitePoint(effect)&&Number.isFinite(effect.angle)?shape:null;
}
export function expertEffectOutline(map,effect,seen){
 const shape=expertFootprint(effect);return shape?sectorOutline(map,effect,effect.angle,shape.range,shape.arcRadians,seen):[];
}
export function onslaughtPresentation(player){
 const action=player?.action,spec=action?.spec;
 if(!(player?.hp>0)||action?.id!=='zealous_onslaught'||!spec||!Number.isFinite(action.angle)||!Number.isFinite(action.elapsed)||action.elapsed<0||!positive(spec.duration)||!positive(spec.channelDuration)||!positive(spec.tickSeconds)||!positive(spec.range)||!positive(spec.halfWidth)||spec.range>1000||spec.halfWidth>1000||action.elapsed>=spec.duration+spec.channelDuration+1e-9)return null;
 const active=action.elapsed>=spec.duration,elapsed=Math.max(0,action.elapsed-spec.duration),paid=Number.isSafeInteger(action.paidSeconds)?action.paidSeconds:0,pulses=Number.isSafeInteger(action.pulses)?action.pulses:0;
 return {phase:active?'active':'startup',angle:action.angle,range:spec.range,halfWidth:spec.halfWidth,progress:clamp(active?elapsed/spec.channelDuration:action.elapsed/spec.duration),paid,pulses,maxPayments:spec.maxPayments,lanceScale:lanceReleaseScale(spec.lance,pulses),guard:active&&!!player.block,castId:action.castId,exitRecovery:spec.exitRecovery,
  motion:active?{action:'attack3',phase:.35+.13*((elapsed%spec.tickSeconds)/spec.tickSeconds)}:{action:'warcry',phase:.34*clamp(action.elapsed/spec.duration)},
  label:active?`진격 · ${paid}${Number.isSafeInteger(spec.maxPayments)?'/'+spec.maxPayments:''} 지불 · ${pulses}회${spec.lance?' · 선봉 '+Math.round(lanceReleaseScale(spec.lance,pulses)*100)+'%':''}`:'진격 준비'};
}
// Local playback remembers only a channel actually drawn in this battle. It
// never infers offense from persisted cooldowns/locks or advances while paused.
export function createOnslaughtPresentationTracker(){
 let previous=null;
 return state=>{
  const p=state.p,current=onslaughtPresentation(p),time=state.time??0;
  if(current){previous={...current,player:p,region:state.regionId,time};return current;}
  if(!previous||previous.player!==p||previous.region!==state.regionId||p.hp<=0||p.action||!positive(p.recoveryLock)||!positive(previous.exitRecovery)||p.recoveryLock>previous.exitRecovery+1e-9||time<previous.time||time>(previous.recoveryUntil??previous.time+previous.exitRecovery)+1e-9){previous=null;return null;}
  if(previous.recoveryUntil===undefined)previous={...previous,recoveryUntil:time+p.recoveryLock};
  const progress=1-clamp(p.recoveryLock/previous.exitRecovery);
  return {...previous,phase:'recovery',progress,guard:false,label:'진격 회수',motion:{action:'attack3',phase:.55+.45*progress}};
 };
}
export function onslaughtOutline(map,player,cue,seen){
 if(!cue||cue.phase==='recovery'||!validOrigin(map,player,seen))return [];
 const c=Math.cos(cue.angle),s=Math.sin(cue.angle),corners=[[0,-cue.halfWidth],[cue.range,-cue.halfWidth],[cue.range,cue.halfWidth],[0,cue.halfWidth]],points=[];
 // Sample every edge; a corner-only polygon could visually bridge a wall.
 for(let i=0;i<corners.length;i++){
  const a=corners[i],b=corners[(i+1)%corners.length],n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/3));
  for(let j=0;j<n;j++){const forward=a[0]+(b[0]-a[0])*j/n,side=a[1]+(b[1]-a[1])*j/n;points.push(clipRay(map,player,{x:player.x+c*forward-s*side,y:player.y+s*forward+c*side},seen));}
 }
 return points;
}
const STATUS_LABELS=Object.freeze({stun:'기절',silence:'침묵',disarm:'무장 해제',slow:'둔화',burn:'화상',poison:'중독'});
export function expertStatusHints(actor,{player=false,banner=null,regionId,map}={}){
 if(!(actor?.hp>0)||actor.dead||!player&&!actor.active)return [];
 const hints=[];
 if(player){
  for(const [id,label] of Object.entries(STATUS_LABELS))if(positive(actor.negativeStatuses?.[id]?.remaining))hints.push({id,label,negative:true});
  if(positive(actor.innerFlame?.remaining))hints.push({id:'inner_flame',label:'가슴속 잿불',negative:false});
  if(map&&liveBanner(banner,regionId)&&Math.hypot(actor.x-banner.x,actor.y-banner.y)<=banner.radius+1e-9&&lineOfSight(map,banner,actor)){
   const ranks=banner.augmentRanks;hints.push({id:'battle_banner',label:ranks?.banner_of_protection>0?'수호 깃발':ranks?.banner_of_zeal>0?'격려 깃발':'전투 깃발',negative:false});
  }
 }else for(const id of ['disarm','silence'])if(positive(actor[id]?.remaining))hints.push({id,label:STATUS_LABELS[id],negative:true});
 return hints;
}
function path(ctx,points,toScreen){ctx.beginPath();points.map(toScreen).forEach((v,i)=>i?ctx.lineTo(v.x,v.y):ctx.moveTo(v.x,v.y));ctx.closePath();}
function keyedStroke(ctx,color,alpha,width){ctx.strokeStyle=EXPERT_STYLE.outline;ctx.globalAlpha=EXPERT_STYLE.outlineAlpha;ctx.lineWidth=EXPERT_STYLE.outlineWidth;ctx.stroke();ctx.strokeStyle=color;ctx.globalAlpha=alpha;ctx.lineWidth=width;ctx.stroke();}
// Continuous dark casing keeps the exact boundary legible between the longer
// friendly dashes. Static screen-space widths do not expand its gameplay range.
function bannerStroke(ctx,dashed=false){
 ctx.setLineDash([]);ctx.strokeStyle=EXPERT_STYLE.bannerOutline;ctx.globalAlpha=EXPERT_STYLE.bannerOutlineAlpha;ctx.lineWidth=EXPERT_STYLE.bannerOutlineWidth;ctx.stroke();
 ctx.setLineDash(dashed?EXPERT_STYLE.bannerDash:[]);ctx.strokeStyle=EXPERT_STYLE.banner;ctx.globalAlpha=EXPERT_STYLE.bannerAlpha;ctx.lineWidth=EXPERT_STYLE.bannerWidth;ctx.stroke();
}
export function drawExpertFloor(ctx,{map,banner,regionId,seen,effects=[],p,cue,toScreen}){
 const ring=bannerOutline(map,banner,regionId,seen);
 if(ring.length){
  ctx.save();path(ctx,ring,toScreen);ctx.fillStyle=EXPERT_STYLE.banner;ctx.globalAlpha=EXPERT_STYLE.bannerFillAlpha;ctx.fill();bannerStroke(ctx,true);ctx.restore();
  // A small grounded flag, not an additive light or decorative attack effect.
  const q=toScreen(banner);ctx.save();ctx.beginPath();ctx.moveTo(q.x-3,q.y+3);ctx.lineTo(q.x-3,q.y-12);ctx.lineTo(q.x+6,q.y-9);ctx.lineTo(q.x-3,q.y-6);bannerStroke(ctx);ctx.restore();
 }
 for(const effect of effects){const points=expertEffectOutline(map,effect,seen);if(!points.length)continue;
  ctx.save();path(ctx,points,toScreen);ctx.setLineDash([4,4]);keyedStroke(ctx,expertFootprint(effect).skillId==='zealous_lance'?EXPERT_STYLE.lance:EXPERT_STYLE.flame,EXPERT_STYLE.effectAlpha,EXPERT_STYLE.effectWidth);ctx.restore();
 }
 const corridor=onslaughtOutline(map,p,cue,seen);
 if(corridor.length){ctx.save();path(ctx,corridor,toScreen);ctx.setLineDash(cue.phase==='startup'?[2,6]:[7,4]);keyedStroke(ctx,EXPERT_STYLE.channel,EXPERT_STYLE.channelAlpha,EXPERT_STYLE.channelWidth);ctx.restore();}
}
export function drawExpertHints(ctx,{actor,player=false,x,y,height,cue,hints=[]}){
 if(!hints.length&&!(player&&cue))return;
 const rows=[];
 if(player&&cue)rows.push({text:cue.label+(cue.guard?' · 방벽':''),color:EXPERT_STYLE.text});
 // Separate harmful statuses from buffs; at most six known status names plus
 // two positive effects. Small dark backplates do not occupy the danger floor.
 for(const negative of [true,false]){const group=hints.filter(h=>h.negative===negative);for(let i=0;i<group.length;i+=3)rows.push({text:group.slice(i,i+3).map(h=>h.label).join(' · '),color:negative?EXPERT_STYLE.negative:EXPERT_STYLE.positive});}
 ctx.save();ctx.font='10px EmberwatchKorean, sans-serif';ctx.textAlign='center';
 rows.forEach((row,i)=>{const yy=y-height-19-(rows.length-1-i)*14,width=Math.min(260,typeof ctx.measureText==='function'?ctx.measureText(row.text).width+10:row.text.length*8+10);ctx.globalAlpha=.9;ctx.fillStyle=EXPERT_STYLE.outline;ctx.fillRect(x-width/2,yy-10,width,13);ctx.globalAlpha=1;ctx.fillStyle=row.color;ctx.fillText(row.text,x,yy);});ctx.restore();
}
