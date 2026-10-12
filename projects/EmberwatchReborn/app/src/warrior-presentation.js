import {sampleActorMotion,resolveActorMotion,motionFrame,motionSamplePhase,remapMotionPhase,MOTION_CLIPS,RUN_GAIT} from './motion.js';
import {createWarriorRig} from './warrior-rig.js';
import {skillMovementFactor} from './poe-skill-policy.js';
// Emberwatch-authored presentation mappings, not PoE2 animation measurements.
// Gameplay timing, aim, costs, movement windows and saved state are read only.
export const WARRIOR_SKILL_CLIPS=Object.freeze({righteous_hammer:'axes',lay_on_hands:'warcry',judgement:'attack3',battle_banner:'warcry',shield_charge:'dodge'});
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(n)?n:0));
const ease=n=>n*n*(3-2*n);
const lift=(p,contact)=>p<=contact?ease(clamp(p/contact)):1-ease(clamp((p-contact)/(1-contact)));
const known=new Set(['mace_swing',...Object.keys(WARRIOR_SKILL_CLIPS),'zealous_onslaught']);
// advanceLocomotion already records collision-resolved distance in walk, in
// units of (158 / 10). Its public footstep phase intentionally remains locked
// during an action. Read that independent distance counter; never change it.
export function warriorActionGait(actor){
 if(!actor?.moving||!(actor.hp>0)||!Number.isFinite(actor.walk))return null;
 const phase=((actor.walk*(158/10)/RUN_GAIT.distance)%1+1)%1;
 return phase;
}
export function resolveWarriorPresentation(actor={},time=0,direction=0,override=null){
 const action=actor.action,id=action?.id,guard=actor.block===true&&!action;
 if(!(actor.hp>0)||actor.dead||!guard&&!known.has(id))return null;
 // Guard must not swallow the existing, authoritative hit-recoil clock.
 if(guard&&actor.hurtTime>0)return null;
 if(override&&['dodge','hurt','run'].includes(override.action)&&id!=='shield_charge')return null;
 direction=clamp(Math.floor(direction),0,3);const side=direction===1?-1:direction===2?1:direction===3?.55:-.55;
 let clip=guard?'idle':WARRIOR_SKILL_CLIPS[id]??resolveActorMotion(actor,time,true).action;
 let phase=guard?0:remapMotionPhase(clip,action.phase??(action.elapsed||0)/(action.duration||1),action.contact,action.duration);
 if(override?.action&&MOTION_CLIPS[override.action]){clip=override.action;phase=override.phase??phase;}
 const frame=motionFrame(clip,phase),sample=motionSamplePhase(clip,frame),pose=sampleActorMotion({action:clip,phase:sample,direction});
 let weapon='sword';
 if(guard){
  pose.shieldY=-2;pose.rootY=1;pose.bodyAngle=side*5;pose.headAngle=-side*3;pose.shieldAngle=[-14,-12,12,14][direction];pose.weaponAngle=[-12,25,-25,10][direction];pose.weaponElbow=[15,-10,10,-15][direction];
 }else if(id==='lay_on_hands'){
  const raised=lift(sample,.44);pose.rootX=0;pose.rootY=-1.6*raised;pose.bodyAngle=-side*2*raised;pose.headY=1.5*raised;pose.headAngle=side*4*raised;
  weapon=sample>.86?'sword':'none';pose.weaponAngle=[-12,18,-18,12][direction]*raised;pose.weaponElbow=[-85,-100,100,85][direction]*raised;pose.shieldAngle=[-16,-24,24,16][direction]*raised;pose.clothAngle=-side*3*raised;
 }else if(id==='battle_banner'){
  const raised=lift(sample,.44);pose.rootY=-2.2*raised;pose.bodyAngle=-side*5*raised;pose.shieldAngle=[-35,-30,30,35][direction]*raised;pose.headAngle=-side*6*raised;
 }else if(id==='righteous_hammer'){
  weapon=sample<.44?'hammer':sample>.83?'sword':'none';
 }else if(id==='shield_charge'){
  const brace=Math.sin(Math.PI*sample);pose.shieldY=-2;pose.rootY=1.4+2.4*brace;pose.bodyAngle=side*(5+9*brace);pose.headAngle=-side*(3+5*brace);pose.weaponAngle=[-10,20,-20,10][direction]*brace;pose.shieldAngle=[-14,-12,12,14][direction]*(.6+.4*brace);pose.clothAngle=-side*14*brace;
 }
 // moving also measures earlier recovery slices in this frame; the current
 // planted windup must use its own action legs instead of that older run gait.
 const gait=warriorActionGait(actor),moving=gait!==null&&skillMovementFactor(action)>0&&id!=='shield_charge'&&id!=='zealous_onslaught';
 const legs=moving?sampleActorMotion({action:'run',phase:motionSamplePhase('run',motionFrame('run',gait)),direction}):pose;
 return {id:guard?'shield_block':id,clip,phase,frame,sample,pose,legs,weapon,moving,gaitPhase:moving?gait:null};
}
export function createWarriorPresentationRenderer(ctx,images,{createCanvas}={}){
 const rig=createWarriorRig(images?.hero,{createCanvas});
 function draw({actor={},player=false,x=0,y=0,height=49,time=0,direction=0,motion=null,classId='warrior'}={}){
  if(!player||classId!=='warrior'||actor.classId&&actor.classId!=='warrior')return false;
  const presentation=resolveWarriorPresentation(actor,time,direction,motion);if(!presentation)return false;
  const result=rig.render(presentation.pose,{legs:presentation.legs,weapon:presentation.weapon});if(!result)return false;
  const scale=height/result.bodyHeight;ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(result.canvas,Math.round(x-result.anchorX*scale),Math.round(y-result.anchorY*scale),result.canvas.width*scale,result.canvas.height*scale);ctx.restore();return presentation;
 }
 return {draw,metrics:rig.metrics};
}
