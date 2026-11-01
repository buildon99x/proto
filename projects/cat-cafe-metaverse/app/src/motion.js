// Render only authoritative history. No prediction, extra packets, or simulation changes.
export const INTERPOLATION_DELAY=.15;
// Explicitly rebase only when a paused local simulation resumes. Ordinary live
// delivery keeps its initial epoch; packet jitter never rewrites authority time.
export class PresentationClock {
 constructor(){this.reset();}
 reset(){this.offset=null;}
 stamp(authorityTime,receivedAt){if(this.offset===null)this.offset=receivedAt-authorityTime;return authorityTime+this.offset;}
 authorityTime(renderAt){return renderAt-(this.offset??0);}
}

export class MotionTrack {
 constructor(){this.reset();}
 reset(){this.samples=[];this.lastX=0;this.lastZ=0;this.lastRender=null;this.lastMoving=-Infinity;this.walking=false;this.output={};}
 get size(){return this.samples.length;}
 push(time,data){if(!Number.isFinite(time)||!Number.isFinite(data.x)||!Number.isFinite(data.z))return;const last=this.samples.at(-1);if(last&&time<last.time)return;const gap=last?time-last.time:0,discontinuous=last&&(gap>.25+1e-9||Math.hypot(data.x-last.data.x,data.z-last.data.z)>Math.max(1,gap*6));if(discontinuous){this.samples.length=0;this.lastRender=null;this.lastMoving=-Infinity;this.walking=false;}else if(last&&time===last.time){last.data={...data};return;}this.samples.push({time,data:{...data}});if(this.samples.length>8)this.samples.shift();}

 sample(now){if(!this.samples.length)return null;const target=now-INTERPOLATION_DELAY;let a=this.samples[0],b=a;for(const item of this.samples){if(item.time<=target)a=item;if(item.time>=target){b=item;break;}b=item;}const ratio=b.time>a.time?Math.max(0,Math.min(1,(target-a.time)/(b.time-a.time))):0;const yawA=a.data.yaw||0,yawB=b.data.yaw||0,pose=this.output;Object.assign(pose,a.data);pose.x=a.data.x+(b.data.x-a.data.x)*ratio;pose.z=a.data.z+(b.data.z-a.data.z)*ratio;pose.yaw=yawA+Math.atan2(Math.sin(yawB-yawA),Math.cos(yawB-yawA))*ratio;const dt=this.lastRender===null?0:now-this.lastRender;const velocity=dt>0&&dt<=.25?Math.hypot(pose.x-this.lastX,pose.z-this.lastZ)/dt:0;if(dt>.25){this.walking=false;this.lastMoving=-Infinity;}if(velocity>.12){this.walking=true;this.lastMoving=now;}else if(velocity<.04&&now-this.lastMoving>.18)this.walking=false;this.lastX=pose.x;this.lastZ=pose.z;this.lastRender=now;pose.walking=this.walking;pose.velocity=velocity;return pose;}
}
export const catVisualYaw=yaw=>yaw+Math.PI;
export function ambientPose(mode,walking,phase='sleep'){if(['pet','feather','ball'].includes(mode))return mode;if(walking)return'walk';if(mode==='rest')return'rest';return['sleep','rest','groom','stretch','walk'].includes(phase)?phase:'sleep';}
// Follow the rendered ground pose, never its cosmetic leg/head bob.
export function followGround(rendered,target){target.x=rendered.x;target.y=0;target.z=rendered.z;return target;}
