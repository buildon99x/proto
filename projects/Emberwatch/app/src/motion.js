// Original 24-pose articulated cutout animation. Baked from the generated source
// art by scripts/bake-motion.mjs; no runtime image manipulation or dependencies.
// This is authored skeletal animation, not 24 independently hand-drawn poses.
export const MOTION_FRAME_COUNT = 24;
export const MOTION_ACTIONS = Object.freeze(['idle','run','attack1','attack2','attack3','axes','warcry','dodge','hurt','death']);
export const MOTION_CLIPS = Object.freeze({
 idle:{duration:1.8,loop:true,frames:24},run:{duration:.64,loop:true,frames:24},
 attack1:{duration:.54,contact:.35,loop:false,frames:24},attack2:{duration:.52,contact:.35,loop:false,frames:24},attack3:{duration:.7,contact:.35,loop:false,frames:24},axes:{duration:.72,contact:.44,loop:false,frames:24},
 warcry:{duration:.8,contact:.44,loop:false,frames:24},dodge:{duration:.34,loop:false,frames:24},hurt:{duration:.24,loop:false,frames:24},death:{duration:.9,loop:false,frames:24}
});
export const MOTION_ASSETS = Object.freeze(Object.fromEntries(['hero'].map(kind=>[kind,{file:`assets/motion-${kind}.png`,frameWidth:112,frameHeight:112,bodyHeight:64,anchorX:56,anchorY:94,columns:24,rows:40,frames:960}])));
export const MOTION_AXE_ASSET = Object.freeze({file:'assets/motion-warrior-axe.png',width:180,height:224,anchorX:90,anchorY:112});
const motionClamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const motionMix=(a,b,t)=>a+(b-a)*t;
const motionEase=t=>t*t*(3-2*t);
function motionTrack(p,keys){for(let i=1;i<keys.length;i++){if(p<=keys[i][0]){const [a,av]=keys[i-1],[b,bv]=keys[i];return motionMix(av,bv,motionEase(motionClamp((p-a)/(b-a))));}}return keys.at(-1)[1];}
function motionFacing(direction){return direction===1?-1:direction===2?1:direction===3?.55:-.55;}
/** Returns independent local joint offsets/rotations in source body-height units.
 * Feet use stance/swing phases; loop starts and ends interpolate continuously.
 * Explicit phase [0,1] is deterministic. Non-looping end poses never wrap.
 */
export function sampleActorMotion({action='idle',phase=0,direction=0,kind='hero',variant=0}={}){
 action=action==='attack'?'attack1':action==='cast'?'axes':action;if(!MOTION_CLIPS[action])action='idle';phase=Number.isFinite(phase)?phase:0;const clip=MOTION_CLIPS[action],p=clip.loop?((phase%1)+1)%1:motionClamp(phase),tau=Math.PI*2,side=motionFacing(direction),cycle=p*tau;
 const pose={action,phase:p,direction,kind,variant,rootX:0,rootY:0,bodyAngle:0,bodyScaleY:1,headAngle:0,headX:0,headY:0,weaponAngle:0,weaponElbow:0,shieldAngle:0,clothAngle:0,clothX:0,clothY:0,leftFootX:0,leftFootY:0,rightFootX:0,rightFootY:0,leftKnee:0,rightKnee:0,alpha:1,shadowScale:1,contact:clip.contact??null};
 const breath=Math.sin(cycle),drift=Math.sin(cycle+.8),heavy=kind==='guardian'?.74:kind==='imp'?1.3:1;
 if(action==='idle'){
  pose.rootY=-.65*(1-Math.cos(cycle));pose.headY=-.35*breath;pose.headAngle=.7*drift;pose.weaponAngle=1.4*Math.sin(cycle+.45);pose.shieldAngle=-1.2*breath;pose.clothAngle=1.2*Math.sin(cycle+.9);pose.clothX=.25*drift;pose.leftKnee=.4*breath;pose.rightKnee=-.4*breath;
 }else if(action==='run'){
  const stride=kind==='rat'?7:direction===0||direction===3?5:9,foot=(q)=>{q=((q%1)+1)%1;return q<.58?{x:motionMix(stride,-stride,q/.58),y:0}:{x:motionMix(-stride,stride,(q-.58)/.42),y:-Math.sin((q-.58)/.42*Math.PI)*8};},l=foot(p),r=foot(p+.5);
  pose.leftFootX=l.x*side;pose.leftFootY=l.y;pose.rightFootX=r.x*side;pose.rightFootY=r.y;pose.leftKnee=Math.sin(cycle)*7;pose.rightKnee=-Math.sin(cycle)*7;
  pose.rootY=-1.4-Math.cos(cycle*2)*1.3;pose.rootX=side*1.8;pose.bodyAngle=side*4.5+Math.sin(cycle)*1.2;pose.headAngle=-side*2+Math.sin(cycle+.7);pose.headY=.55*Math.cos(cycle*2+.8);pose.weaponAngle=Math.sin(cycle+.4)*15*heavy;pose.weaponElbow=Math.sin(cycle-1)*4;pose.shieldAngle=-Math.sin(cycle+.4)*10;pose.clothAngle=Math.sin(cycle-1)*6;pose.clothX=-side*(3+Math.cos(cycle)*2);
 }else if(action.startsWith('attack')){
  const wind=motionTrack(p,[[0,0],[.22,1],[.35,0],[.62,0],[1,0]]),strike=motionTrack(p,[[0,0],[.23,0],[.35,1],[.47,.85],[.68,.25],[1,0]]),settle=Math.sin(p*Math.PI);
  pose.rootX=side*(-2.3*wind+4.5*strike);pose.rootY=1.4*wind+1.8*strike;pose.bodyAngle=side*(-8*wind+10*strike);pose.headAngle=side*(5*wind-6*strike);pose.weaponAngle=side*(-76*wind+57*strike);pose.weaponElbow=side*(-14*wind+14*strike);pose.shieldAngle=side*(14*wind-18*strike);pose.clothAngle=side*(-6*wind+10*motionTrack(p,[[0,0],[.31,0],[.48,1],[1,0]]));pose.leftFootX=-side*2.4*settle;pose.rightFootX=side*4.6*settle;pose.leftKnee=5*strike;pose.rightKnee=-3*wind;
 }else if(action==='axes'||action==='warcry'){
  const gather=motionTrack(p,[[0,0],[.29,1],[.44,.82],[.6,.55],[1,0]]),release=motionTrack(p,[[0,0],[.36,0],[.44,1],[.59,.7],[1,0]]);
  pose.rootY=2*gather-1.6*release;pose.bodyAngle=side*(-5*gather+9*release);pose.headAngle=-side*4*gather;pose.headY=-1.2*gather;pose.weaponAngle=side*(-58*gather+83*release);pose.weaponElbow=-side*9*gather;pose.shieldAngle=side*(38*gather-55*release);pose.clothAngle=-side*5*gather+side*8*release;pose.clothY=-2*release;pose.leftFootX=-side*1.5*gather;pose.rightFootX=side*2.5*gather;pose.leftKnee=3*gather;
 }else if(action==='dodge'){
  const dip=Math.sin(p*Math.PI),tuck=motionTrack(p,[[0,0],[.19,1],[.65,1],[1,0]]);
  pose.rootY=9*dip;pose.bodyAngle=side*32*tuck;pose.headAngle=-side*18*tuck;pose.headY=2*tuck;pose.weaponAngle=-side*42*tuck;pose.shieldAngle=-side*24*tuck;pose.clothAngle=-side*22*tuck+side*5*Math.sin(p*Math.PI*2);pose.weaponElbow=side*10*Math.sin(p*Math.PI*2)*tuck;pose.clothX=-side*5*dip;pose.leftFootX=side*9*dip;pose.rightFootX=-side*6*dip;pose.leftFootY=-2.5*dip;pose.rightFootY=-4*dip;pose.leftKnee=9*tuck;pose.rightKnee=-8*tuck;pose.shadowScale=1-.18*dip;
 }else if(action==='hurt'){
  const impact=motionTrack(p,[[0,0],[.13,1],[.35,.7],[.68,.22],[1,0]]),wobble=Math.sin(p*Math.PI*3)*(1-p);
  pose.rootX=-side*4*impact;pose.rootY=1.5*impact;pose.bodyAngle=-side*13*impact;pose.headAngle=side*9*impact;pose.headX=-side*1.5*impact;pose.weaponAngle=side*22*impact+wobble*3;pose.shieldAngle=-side*18*impact;pose.clothAngle=side*9*impact;pose.leftKnee=4*impact;pose.rightFootX=-side*2*impact;
 }else if(action==='death'){
  const collapse=motionTrack(p,[[0,0],[.18,.08],[.5,.7],[.76,1],[1,1]]),settle=motionTrack(p,[[0,0],[.7,0],[.86,1],[1,.78]]);
  const fall=direction<2?1:-1;pose.rootY=9*collapse+1.1*settle;pose.rootX=-fall*4*collapse;pose.bodyAngle=fall*76*collapse;pose.bodyScaleY=1-.24*collapse;pose.headAngle=side*(16*collapse+4*settle);pose.headY=4*collapse;pose.weaponAngle=side*(38*collapse+9*settle);pose.shieldAngle=-side*35*collapse;pose.clothAngle=side*18*collapse;pose.leftFootX=-fall*4*collapse;pose.rightFootX=fall*7*collapse;pose.leftFootY=-2*collapse;pose.rightFootY=0;pose.leftKnee=3*collapse;pose.rightKnee=-4*collapse;pose.alpha=1-.16*motionTrack(p,[[0,0],[.7,0],[1,1]]);pose.shadowScale=1+.3*collapse;
 }
 // Direction-specific shoulder + elbow arcs compensate the source poses. The
 // extension is articulated at both joints so the blade reaches toward aim at
 // contact instead of rotating a bent arm down toward the feet.
 if(action.startsWith('attack')){
  const attack=Number(action.at(-1))-1;
  const arcs=[
   [[132,-12,-28,-42],[91,-5,57,-98],[-95,-5,-56,76],[47,-16,-53,7]],
   [[-42,-32,39,12],[19,-12,64,-80],[-25,35,-57,66],[-48,-5,39,-34]],
   [[154,-7,-34,-39],[107,-4,60,-85],[-111,-9,-62,82],[-69,24,-35,-19]]
  ][attack][direction];
  const wind=motionTrack(p,[[0,0],[.22,1],[.35,0],[1,0]]),strike=motionTrack(p,[[0,0],[.23,0],[.35,1],[.48,.94],[.72,.24],[1,0]]);
  pose.weaponAngle=arcs[0]*wind+arcs[2]*strike;
  pose.weaponElbow=arcs[1]*wind+arcs[3]*strike;
  if(attack===1){pose.bodyAngle*=-.65;pose.shieldAngle*=.7;pose.clothAngle*=-1;pose.rootX*=.8;}
  if(attack===2){pose.rootY-=3.6*wind;pose.rootY+=2.1*strike;pose.bodyAngle=side*(-9*wind+15*strike);pose.headAngle=-pose.bodyAngle*.55;pose.clothY=-2*wind;}
 }
 if(action==='axes'){
  const wind=motionTrack(p,[[0,0],[.30,1],[.44,0],[1,0]]),release=motionTrack(p,[[0,0],[.34,0],[.44,1],[.59,.85],[1,0]]);
  const arcs=[[120,-5,-28,-45],[87,-8,63,-98],[-88,-2,-56,76],[44,-12,-48,4]][direction];
  pose.weaponAngle=arcs[0]*wind+arcs[2]*release;pose.weaponElbow=arcs[1]*wind+arcs[3]*release;
 }
 if(action==='warcry'){
  const lift=motionTrack(p,[[0,0],[.34,1],[.44,.98],[.70,.8],[1,0]]);
  pose.weaponAngle=[135,100,-94,-57][direction]*lift;
  pose.weaponElbow=[-5,-12,4,9][direction]*lift;
  pose.shieldAngle=[-59,-46,46,55][direction]*lift;
  pose.bodyAngle=-side*3*lift;pose.rootY=-1.5*lift;pose.headY=-2*lift;pose.headAngle=-side*4*lift;pose.clothY=-1.5*lift;pose.clothAngle=Math.sin(p*Math.PI*4)*2*lift;
 }
 return pose;
}
function motionActionName(action){return action==='attack'?'attack1':action==='cast'?'axes':MOTION_CLIPS[action]?action:'idle';}
/** Sampling and playback share this mapping. Contact is an exact authored pose,
 * never a neighboring anticipation frame. Final samples settle toward neutral;
 * we do not count a duplicated start/end pose as a new animation frame. */
export function motionSamplePhase(action='idle',frame=0){
 action=motionActionName(action);const clip=MOTION_CLIPS[action],f=motionClamp(Math.floor(Number.isFinite(frame)?frame:0),0,23);
 if(clip.contact!==undefined){const c=Math.round(clip.contact*23);return f<=c?f/c*clip.contact:clip.contact+(f-c)/(24-c)*(1-clip.contact);}
 return f/24;
}
export function motionFrame(action='idle',phase=0){
 action=motionActionName(action);const clip=MOTION_CLIPS[action];phase=Number.isFinite(phase)?phase:0;
 if(clip.loop)return Math.floor((((phase%1)+1)%1)*24+1e-9)%24;
 const p=motionClamp(phase);let f=p*24;if(clip.contact!==undefined){const c=Math.round(clip.contact*23);f=p<=clip.contact?p/clip.contact*c:c+(p-clip.contact)/(1-clip.contact)*(24-c);}
 return Math.min(23,Math.floor(f+1e-9));
}
export function remapMotionPhase(action,rawPhase,runtimeContact,runtimeDuration){
 const clip=MOTION_CLIPS[motionActionName(action)],p=motionClamp(Number.isFinite(rawPhase)?rawPhase:0);
 if(clip.contact===undefined||!Number.isFinite(runtimeContact)||!Number.isFinite(runtimeDuration)||runtimeDuration<=0)return p;
 const source=runtimeContact/runtimeDuration,target=clip.contact;if(source<=0||source>=1)return p;
 return p<=source?p/source*target:target+(p-source)/(1-source)*(1-target);
}
export function motionKind(actor={},player=false){return player?'hero':'guardian';}
export function resolveActorMotion(actor={},time=0,player=false){
 let action='idle',phase=0;const timed=actor.action;
 let requested=timed?.name;
 if(requested==='attack')requested=`attack${1+motionClamp(Math.floor(timed.payload?.combo??0),0,2)}`;
 if(requested==='cast')requested=String(timed.payload?.which||'q').toLowerCase()==='e'?'warcry':'axes';
 if(timed&&MOTION_CLIPS[requested]){
  action=requested;const duration=timed.duration||MOTION_CLIPS[action].duration;
  phase=remapMotionPhase(action,timed.phase??(timed.elapsed||0)/duration,timed.contact,duration);
 }else if(actor.hp<=0||actor.dead){action='death';phase=actor.deathPhase??(actor.deathTime||0)/.9;}
 else if(actor.dashTime>0){action='dodge';phase=1-actor.dashTime/.22;}
 else if(actor.hurtTime>0){action='hurt';phase=1-actor.hurtTime/.24;}
 else if(actor.moving){action='run';phase=actor.walkPhase??time/MOTION_CLIPS.run.duration;}
 else phase=time/MOTION_CLIPS.idle.duration+(typeof actor.id==='number'?actor.id:0)*.137;
 return {action,phase,kind:motionKind(actor,player),frame:motionFrame(action,phase)};
}
/** Integration: images.motion = { hero: Image }; only Warrior is implemented.
 * Caller gates by class. Manifest remains optional for the familiar contract.
 * x/y is a stable ground anchor, height is desired standing body height.
 * Returns false if art has not loaded, allowing the existing renderer fallback.
 */
export function createMotionRenderer(ctx,manifest,images={}){
 function draw({actor={},player=false,x=0,y=0,height=49,time=0,action,phase,direction=0,filter,alpha=1}={}){
  if(!player||(actor.classId&&actor.classId!=='warrior'))return false;const resolved=resolveActorMotion(actor,time,player);action=motionActionName(action||resolved.action);phase=phase??resolved.phase;const kind=resolved.kind,set=MOTION_ASSETS[kind];if(!set)return false;const image=(images.motion||images)[kind];if(!image||image.complete===false||(image.naturalWidth!==undefined&&image.naturalWidth===0))return false;direction=motionClamp(Math.floor(Number.isFinite(direction)?direction:0),0,3);
  const frame=motionFrame(action,phase),row=direction*MOTION_ACTIONS.length+Math.max(0,MOTION_ACTIONS.indexOf(action)),scale=height/set.bodyHeight;
  ctx.save();ctx.imageSmoothingEnabled=false;ctx.globalAlpha=alpha;if(filter)ctx.filter=filter;ctx.drawImage(image,frame*set.frameWidth,row*set.frameHeight,set.frameWidth,set.frameHeight,Math.round(x-set.anchorX*scale),Math.round(y-set.anchorY*scale),set.frameWidth*scale,set.frameHeight*scale);ctx.restore();return {kind,action,phase,frame,direction};
 }
 return {draw};
}
