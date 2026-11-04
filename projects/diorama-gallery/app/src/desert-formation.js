// Opt-in formation sequence for the new desert version. No scene, timer, RAF,
// geometry, material or global playback state is created by this module.
export const FORMATION_DURATION=120;
export const FORMATION_STAGES=Object.freeze([
 {id:'terrain',label:'모래 지형이 자리잡습니다',start:0,end:18},
 {id:'river',label:'굽이치는 강이 흐릅니다',start:12,end:30},
 {id:'oasis',label:'강가에 생명이 뿌리내립니다',start:24,end:46},
 {id:'settlement',label:'작은 정착지가 도시로 자랍니다',start:38,end:70},
 {id:'pyramids',label:'피라미드가 층층이 세워집니다',start:58,end:90},
 {id:'temples',label:'신전과 회랑이 완성됩니다',start:78,end:104},
 {id:'life',label:'사람과 범선이 도시를 채웁니다',start:96,end:114}
].map(Object.freeze));
const byId=new Map(FORMATION_STAGES.map(stage=>[stage.id,stage]));
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const ease=value=>{const x=clamp(value,0,1);return clamp(x*x*x*(x*(x*6-15)+10),0,1);};
const finite=(value,name)=>{if(typeof value!=='number'||!Number.isFinite(value))throw new TypeError(`${name} must be finite.`);return value;};
const validDuration=duration=>{finite(duration,'Duration');if(duration<=0)throw new RangeError('Duration must be positive.');return duration;};
function siteOptions({duration=FORMATION_DURATION,index=0,count=1,stagger=.55}={}){
 validDuration(duration);
 if(!Number.isInteger(count)||count<1||!Number.isInteger(index)||index<0||index>=count)throw new RangeError('Construction site index/count must be valid integers.');
 finite(stagger,'Stagger');if(stagger<0||stagger>=1)throw new RangeError('Stagger must be at least zero and less than one.');
 return {duration,index,count,stagger};
}
function stageProgress(time,stage,options){
 const span=stage.end-stage.start,spread=options.count===1?0:options.stagger;
 const delay=options.count===1?0:span*spread*options.index/(options.count-1);
 return ease((time-stage.start-delay)/(span*(1-spread)));
}

// Pure absolute-time sampling: out-of-range finite times clamp, never wrap.
// Caller-owned stable site indices provide stagger without mutable randomness.
export function formationProgress(seconds,stageId,options={}){
 finite(seconds,'Time');const stage=byId.get(stageId);if(!stage)throw new RangeError(`Unknown formation stage: ${stageId}`);
 const site=siteOptions(options),time=clamp(seconds/site.duration,0,1)*FORMATION_DURATION;
 return stageProgress(time,stage,site);
}
export function formationAt(seconds,{duration=FORMATION_DURATION}={}){
 finite(seconds,'Time');validDuration(duration);const time=clamp(seconds,0,duration),progress=time/duration,canonical=progress*FORMATION_DURATION;
 const stages=Object.fromEntries(FORMATION_STAGES.map(stage=>[stage.id,stageProgress(canonical,stage,{count:1})]));
 const stage=canonical>=114?null:FORMATION_STAGES.findLast(stage=>canonical>=stage.start);
 return {time,progress,complete:time===duration,stage:stage?.id??'complete',label:stage?.label??'사막 강가 도시가 완성되었습니다',stages};
}

// Optional transport for standalone consumers. Pass an absolute clock in seconds
// to every method; the existing world runtime can instead call formationAt(t).
// A completed playback holds its last frame; play() explicitly replays it.
export function createFormationClock({duration=FORMATION_DURATION,playing=false,speed=1}={}){
 validDuration(duration);const validSpeed=value=>{finite(value,'Speed');if(value<.25||value>3)throw new RangeError('Speed must be between 0.25 and 3.');return value;};
 validSpeed(speed);let anchorTime=0,anchorNow=0,running=Boolean(playing),rate=speed;
 function update(now){
  finite(now,'Clock time');const time=clamp(anchorTime+(running?Math.max(0,now-anchorNow)*rate:0),0,duration);
  if(time===duration){anchorTime=time;anchorNow=now;running=false;}
  return {...formationAt(time,{duration}),playing:running,speed:rate};
 }
 return {
  update,
  play(now){const frame=update(now);if(running)return frame;if(anchorTime===duration)anchorTime=0;anchorNow=now;running=true;return update(now);},
  pause(now){const frame=update(now);anchorTime=frame.time;anchorNow=now;running=false;return update(now);},
  seek(seconds,now){finite(seconds,'Time');finite(now,'Clock time');anchorTime=clamp(seconds,0,duration);anchorNow=now;if(anchorTime===duration)running=false;return update(now);},
  reset(now,{play=false}={}){finite(now,'Clock time');anchorTime=0;anchorNow=now;running=Boolean(play);return update(now);},
  setSpeed(value,now){validSpeed(value);const frame=update(now);anchorTime=frame.time;anchorNow=now;rate=value;return update(now);}
 };
}

// Bind only a dedicated Group, never a mesh hidden by W.batch. Register the
// returned dynamicRoot in parts.dynamicRoots BEFORE the runtime calls W.batch:
// its instance matrices must remain dynamic. Batch visibility is never changed.
// Put moving boats inside a formation wrapper, so their own pose stays intact.
// anchor is a point in this group's authored local coordinate system.
export function bindFormationGroup(group,stageId,{axis='y',anchor=[0,0,0],...options}={}){
 if(!group?.isGroup)throw new TypeError('Formation binding needs a dedicated Group.');
 if(!['y','uniform','xz'].includes(axis))throw new RangeError('Formation axis must be y, uniform or xz.');
 if(!Array.isArray(anchor)||anchor.length!==3||anchor.some(value=>typeof value!=='number'||!Number.isFinite(value)))throw new TypeError('Formation anchor must contain three finite local coordinates.');
 const site=siteOptions(options),pivot=anchor.slice();formationProgress(0,stageId,site);
 const position=group.position.clone(),quaternion=group.quaternion.clone(),scale=group.scale.clone(),offset=position.clone();
 function restore(){group.position.copy(position);group.quaternion.copy(quaternion);group.scale.copy(scale);group.updateMatrix();}
 return {
  dynamicRoot:group,
  apply(seconds){
   const progress=formationProgress(seconds,stageId,site);
   if(progress===1){restore();return progress;}
   // A y-only zero scale leaves flat roofs/water drawn. Collapse every axis at
   // zero, smoothly opening the other axes during the first 12% of growth.
   const open=ease(progress/.12),x=axis==='y'?open:progress,y=axis==='xz'?open:progress,z=x;
   group.scale.set(scale.x*x,scale.y*y,scale.z*z);group.quaternion.copy(quaternion);
   offset.set(pivot[0]*(scale.x-group.scale.x),pivot[1]*(scale.y-group.scale.y),pivot[2]*(scale.z-group.scale.z)).applyQuaternion(quaternion);
   group.position.copy(position).add(offset);group.updateMatrix();return progress;
  },
  restore
 };
}
