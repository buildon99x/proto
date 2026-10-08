// Deterministic motion contracts and baked-art integrity, NOT browser play QA.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {MOTION_FRAME_COUNT,MOTION_ACTIONS,MOTION_CLIPS,MOTION_ASSETS,MOTION_AXE_ASSET,sampleActorMotion,motionSamplePhase,motionFrame,remapMotionPhase,resolveActorMotion,createMotionRenderer} from '../src/motion.js';
const near=(a,b,message)=>assert(Math.abs(a-b)<1e-8,message||`${a} != ${b}`);
assert.equal(MOTION_FRAME_COUNT,24);assert.equal(MOTION_ACTIONS.length,10);
const joints=['bodyAngle','headAngle','headY','weaponAngle','weaponElbow','shieldAngle','clothAngle','clothX','clothY','leftFootX','leftFootY','rightFootX','rightFootY','leftKnee','rightKnee'];
for(const action of MOTION_ACTIONS)for(let direction=0;direction<4;direction++){
 const signatures=new Set(),phases=[];
 for(let frame=0;frame<24;frame++){
  const phase=motionSamplePhase(action,frame),pose=sampleActorMotion({action,phase,direction});phases.push(phase);
  assert.equal(motionFrame(action,phase),frame,`${action}: phase/frame round trip`);
  for(const key of joints)assert(Number.isFinite(pose[key]),`${action} ${key} finite`);
  signatures.add(joints.map(k=>pose[k].toFixed(4)).join(','));
  if(action==='idle'){near(pose.leftFootX,0);near(pose.leftFootY,0);near(pose.rightFootX,0);near(pose.rightFootY,0);}
  if(action==='run')assert(pose.leftFootY===0||pose.rightFootY===0,'run always has a grounded stance foot');
 }
 assert.equal(signatures.size,24,`${action}/${direction} must have 24 distinct JOINT poses, excluding root translation and opacity`);
 for(let i=1;i<phases.length;i++)assert(phases[i]>phases[i-1],'ordered phase samples');
 if(!MOTION_CLIPS[action].loop){assert.equal(motionFrame(action,1),23);assert.equal(motionFrame(action,9),23);assert.equal(motionFrame(action,-1),0);}
 else{assert.equal(motionFrame(action,1),0);assert.equal(motionFrame(action,2.5),12);for(const key of joints)near(sampleActorMotion({action,phase:0,direction})[key],sampleActorMotion({action,phase:1,direction})[key],'loop seam');}
}
for(let combo=0;combo<3;combo++){
 const duration=[.38,.4,.48][combo],contact=duration*.3,a={name:'attack',elapsed:contact,duration,contact,payload:{kind:'attack',combo}};
 const resolved=resolveActorMotion({action:a},0,true);assert.equal(resolved.action,`attack${combo+1}`);near(resolved.phase,.35);assert.equal(resolved.frame,8);
 for(let t=0;t<=100;t++){const phase=remapMotionPhase(resolved.action,t/100,contact,duration);assert(phase>=0&&phase<=1);if(t)assert(phase>=remapMotionPhase(resolved.action,(t-1)/100,contact,duration));}
}
for(const [which,expected] of [['q','axes'],['e','warcry'],['E','warcry']]){const r=resolveActorMotion({action:{name:'cast',elapsed:.15,duration:.42,contact:.15,payload:{kind:'skill',which}}},0,true);assert.equal(r.action,expected);near(r.phase,.44);assert.equal(r.frame,10);}
assert.equal(resolveActorMotion({moving:true},.2,true).action,'run');assert.equal(resolveActorMotion({hp:0,deathPhase:1},0,true).frame,23);assert.equal(resolveActorMotion({dashTime:.11},0,true).action,'dodge');
assert.equal(motionFrame('unknown',NaN),0);near(remapMotionPhase('attack1',.5,0,0),.5);
const calls=[],ctx={save(){},restore(){},drawImage(...args){calls.push(args);}};
const image={complete:true,naturalWidth:2688},renderer=createMotionRenderer(ctx,null,{motion:{hero:image}});
assert.equal(createMotionRenderer(ctx,null,{}).draw({player:true}),false);
assert.equal(createMotionRenderer(ctx,null,{motion:{hero:{complete:false}}}).draw({player:true}),false);
assert.equal(renderer.draw({player:false}),false);assert.equal(renderer.draw({player:true,actor:{classId:'mage'}}),false);
let result=renderer.draw({actor:{classId:'warrior',action:{name:'attack',elapsed:.12,contact:.12,duration:.4,payload:{combo:2}}},player:true,x:100,y:100,direction:2,height:64});
assert.equal(result.action,'attack3');assert.equal(result.frame,8);assert.deepEqual(calls.at(-1).slice(1,5),[896,(2*10+4)*112,112,112]);assert.deepEqual(calls.at(-1).slice(5),[44,6,112,112]);
const bytes=fs.readFileSync(new URL('../src/'+MOTION_ASSETS.hero.file,import.meta.url));assert.equal(bytes.subarray(1,4).toString(),'PNG');assert.equal(bytes[25],6,'RGBA alpha is preserved');assert.equal(bytes.readUInt32BE(16),112*24);assert.equal(bytes.readUInt32BE(20),112*40);
const axe=fs.readFileSync(new URL('../src/'+MOTION_AXE_ASSET.file,import.meta.url));assert.equal(axe.readUInt32BE(16),MOTION_AXE_ASSET.width);assert.equal(axe.readUInt32BE(20),MOTION_AXE_ASSET.height);assert.equal(axe[25],6);
const report=JSON.parse(fs.readFileSync(new URL('../../assets/screenshots/motion-warrior/motion-warrior-validation.json',import.meta.url)));
assert.equal(report.atlasSha256,createHash('sha256').update(bytes).digest('hex'),'recorded raster checks correspond to shipped PNG');assert.equal(report.clips.length,40);assert.deepEqual(report.anchor,[56,94]);
for(const clip of report.clips){assert.equal(clip.frameCount,24);assert.equal(clip.uniqueFrames,24);assert.equal(new Set(clip.hashes).size,24);for(const b of clip.bboxes){assert(b.alpha>200,'visible body area');assert(b.minX>0&&b.minY>0&&b.maxX<111&&b.maxY<111,'no cell-edge clipping');}for(let f=0;f<24;f++){const expected=sampleActorMotion({action:clip.action,phase:motionSamplePhase(clip.action,f),direction:clip.direction});assert.deepEqual(clip.jointPoses[f],JSON.parse(JSON.stringify(expected)),'bake pose data must match current runtime source');}}
console.log('PASS: Warrior 960 distinct articulated joint poses, shared frame order, grounded stance feet, seamless loops, payload combo/Q/E mapping, exact runtime contact remap, renderer fallback/coordinates, RGBA assets and recorded baked-frame bounds. Not browser gameplay QA.');
