// Presentation only. The owned four-direction guardian atlas supplies neutral
// cutouts; these continuous two-joint poses are not additional drawn frames.
// Timing/offsets below are authored Emberwatch feedback, not PoE2 measurements.
export const ENEMY_REACTION = Object.freeze({deathSeconds:.7,hitSeconds:.18,heavyHitSeconds:.23});
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const ease=t=>{t=clamp(t);return t*t*(3-2*t);};
const mix=(a,b,t)=>a+(b-a)*t;
const finite=(v,fallback=0)=>Number.isFinite(v)?v:fallback;
function track(p,keys){for(let i=1;i<keys.length;i++)if(p<=keys[i][0])return mix(keys[i-1][1],keys[i][1],ease((p-keys[i-1][0])/(keys[i][0]-keys[i-1][0])));return keys.at(-1)[1];}
export function recordEnemyReaction(enemy,{angle=0,heavy=false,damage=0}={}){
 if(!(damage>0))return;
 // Overlapping hits update direction and peak strength without rewinding or
 // extending an active envelope. A later light hit cannot erase a heavy hit.
 const active=enemy.reaction;
 if(active?.remaining>0){enemy.reaction={...active,angle:finite(angle),facing:finite(enemy.angle),heavy:active.heavy||!!heavy};return;}
 const duration=heavy?ENEMY_REACTION.heavyHitSeconds:ENEMY_REACTION.hitSeconds;
 enemy.reaction={angle:finite(angle),facing:finite(enemy.angle),heavy:!!heavy,duration,remaining:duration};
}
export function stepEnemyReaction(enemy,dt){
 if(enemy.reaction)enemy.reaction.remaining=Math.max(0,enemy.reaction.remaining-Math.max(0,finite(dt)));
}
/** State precedence: death > true stun > transient visual hit > ordinary art.
 * Hit metadata never writes AI/stun/position or touches a gameplay RNG. */
export function enemyReactionPose(enemy={}){
 const dead=enemy.dead===true||enemy.hp<=0,r=enemy.reaction;
 const angle=finite(r?.angle,finite(enemy.angle)),dx=Math.cos(angle)-Math.sin(angle),dy=(Math.cos(angle)+Math.sin(angle))*.53,length=Math.hypot(dx,dy)||1,ux=dx/length,uy=dy/length;
 const side=Math.abs(ux)>.12?Math.sign(ux):(uy>=0?1:-1),boss=enemy.type==='boss';
 const pose={state:'none',phase:0,frame:null,facing:finite(enemy.angle),rootX:0,rootY:0,upperAngle:0,upperScaleY:1,legScaleY:1,alpha:1,shadowScale:1,echo:0,land:0,side};
 if(dead){
  const p=clamp(1-finite(enemy.deathTime,ENEMY_REACTION.deathSeconds)/ENEMY_REACTION.deathSeconds);
  const buckle=track(p,boss?[[0,.16],[.18,.48],[.48,.94],[.66,1],[1,1]]:[[0,.22],[.16,.58],[.45,1],[1,1]]);
  const fall=track(p,boss?[[0,.05],[.18,.14],[.58,1],[.7,.96],[1,.96]]:[[0,.08],[.16,.24],[.48,1],[.62,.96],[1,.96]]);
  const fade=ease((p-(boss?.82:.74))/(boss?.18:.26));
  return {...pose,state:'death',phase:p,frame:0,facing:finite(r?.facing,finite(enemy.angle)),rootX:side*.075*fall,rootY:0,upperAngle:side*1.42*fall,upperScaleY:1-.12*fall,legScaleY:1-.79*buckle,alpha:1-fade,shadowScale:1+.42*fall,land:track(p,boss?[[0,0],[.45,0],[.61,1],[.88,0],[1,0]]:[[0,0],[.32,0],[.49,1],[.76,0],[1,0]])};
 }
 if(enemy.stun>0){
  return {...pose,state:'stun',frame:0,upperAngle:side*.2,upperScaleY:.94,legScaleY:.78,rootX:side*.015,shadowScale:1.07};
 }
 if(r?.remaining>0){
  const p=clamp(1-r.remaining/r.duration),impact=track(p,[[0,.5],[.14,1],[.4,.62],[1,0]]),windup=['windup','charge'].includes(enemy.state),strength=(r.heavy?1:.7)*(boss?.62:1)*(windup?.6:1);
  return {...pose,state:'hit',phase:p,rootX:ux*.035*impact*strength,rootY:uy*.008*impact*strength,upperAngle:side*.23*impact*strength,upperScaleY:1-.035*impact*strength,legScaleY:1-.09*impact*strength,echo:r.heavy&&!windup?.12*impact:0};
 }
 return pose;
}
/** Feet remain grounded; the torso pivots at the knee/cloth seam while the
 * lower cutout buckles independently. The blade follows the torso; a foot-only strip
 * prevents the sword cutout from stealing a boot; no replicated atlas. Transient hits keep their complete pose. */
export function drawEnemyReaction(ctx,image,frame,{x,y,k,kx=k,pose,height,direction=0,opacity=1,reduced=false,flashScale=1}={}){
 if(!pose||pose.state==='none')return false;
 const ax=frame.ax??frame.w/2,ay=frame.ay??frame.h,split=Math.round(frame.h*.68),hipY=(split-ay)*k*pose.legScaleY;
 // Neutral atlas swords extend below the knee. Keep the blade with the torso
 // instead of cutting it in half and leaving its tip attached to a foot.
 const bladeLeft=direction<2,cut=Math.round(frame.w*[.27,.45,.66,.755][direction]);
 const bladeEnd=Math.round(frame.h*[.85,.80,.795,.85][direction]);
 const legX=bladeLeft?cut:0,legWidth=bladeLeft?frame.w-cut:cut,bladeX=bladeLeft?0:cut,bladeWidth=bladeLeft?cut:frame.w-cut;
 const paint=(extraX=0,alpha=1)=>{
  ctx.save();ctx.globalAlpha=opacity*pose.alpha*alpha;ctx.translate(x+(pose.rootX+extraX)*height,y+pose.rootY*height);
  if(pose.state==='hit'){ctx.rotate(pose.upperAngle*.65);ctx.scale(1,pose.legScaleY);ctx.drawImage(image,frame.x,frame.y,frame.w,frame.h,-ax*kx,-ay*k,frame.w*kx,frame.h*k);ctx.restore();return;}
  ctx.save();ctx.scale(1,pose.legScaleY);ctx.drawImage(image,frame.x+legX,frame.y+split,legWidth,bladeEnd-split,(legX-ax)*kx,(split-ay)*k,legWidth*kx,(bladeEnd-split)*k);
  ctx.drawImage(image,frame.x,frame.y+bladeEnd,frame.w,frame.h-bladeEnd,-ax*kx,(bladeEnd-ay)*k,frame.w*kx,(frame.h-bladeEnd)*k);ctx.restore();
  ctx.translate(0,hipY);ctx.rotate(pose.upperAngle);ctx.scale(1,pose.upperScaleY);
  // Two-pixel source overlap keeps the joint closed on nearest-neighbor art.
  ctx.drawImage(image,frame.x,frame.y,frame.w,Math.min(frame.h,split+2),-ax*kx,-split*k,frame.w*kx,Math.min(frame.h,split+2)*k);
  ctx.drawImage(image,frame.x+bladeX,frame.y+split+2,bladeWidth,bladeEnd-split-2,(bladeX-ax)*kx,2*k,bladeWidth*kx,(bladeEnd-split-2)*k);ctx.restore();
 };
 if(!reduced&&flashScale>0&&pose.echo>0)paint(-pose.side*.025,pose.echo*Math.min(1,flashScale));
 paint();return true;
}
/** Quiet death debris uses the existing bounded FX budget and belongs below
 * loot, hostile warnings and living bodies. Flash0 keeps the collapse itself. */
export function drawEnemyDeathFeedback(ctx,effects,toScreen,zoom,{reduced=false,flashScale=1}={}){
 for(const f of effects){
  if(!(f.life>0)||(f.type!=='enemyDeath'&&!f.deathParticle))continue;
  const p=toScreen(f),a=clamp(f.life/f.max);
  ctx.save();ctx.globalAlpha=a*.38;ctx.fillStyle='#202331';
  if(f.type==='enemyDeath'){
   const radius=(f.boss?23:12)*zoom*(1+(1-a)*.3);ctx.beginPath();ctx.ellipse(p.x,p.y+2*zoom,radius,radius*.22,0,0,Math.PI*2);ctx.fill();
  }else if(!reduced&&flashScale>0){
   ctx.globalAlpha=a*.65*Math.min(1,flashScale);ctx.fillStyle=f.color;const size=Math.max(1,f.size*zoom*.45);ctx.fillRect(Math.round(p.x),Math.round(p.y)-2,size,size*.6);
  }
  ctx.restore();
 }
}
