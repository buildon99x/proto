/* World-space obstruction query shared by muzzle gating and shot redirection. */
(function(root){
'use strict';const EPS=1e-8;
const valid=p=>p&&['x','y','z'].every(k=>Number.isFinite(p[k]));
function segmentBox(a,b,wall,radius=0){let enter=0,leave=1,normal={x:0,y:0,z:0};const mins={x:wall.x-wall.w/2-radius,y:(wall.y||0)-radius,z:wall.z-wall.d/2-radius},maxs={x:wall.x+wall.w/2+radius,y:(wall.y||0)+wall.h+radius,z:wall.z+wall.d/2+radius};
 for(const axis of ['x','y','z']){const delta=b[axis]-a[axis];if(Math.abs(delta)<EPS){if(a[axis]<mins[axis]||a[axis]>maxs[axis])return null;continue;}let low=(mins[axis]-a[axis])/delta,high=(maxs[axis]-a[axis])/delta,sign=-1;if(low>high){[low,high]=[high,low];sign=1;}if(low>enter){enter=low;normal={x:0,y:0,z:0};normal[axis]=sign;}leave=Math.min(leave,high);if(enter>leave)return null;}
 return {fraction:enter,normal};
}
function trace(world,from,to,radius=0){if(!valid(from)||!valid(to)||!world?.wallCandidates)return null;let nearest=null;const distance=Math.hypot(to.x-from.x,to.y-from.y,to.z-from.z);
 for(const wall of world.wallCandidates(Math.min(from.x,to.x)-radius,Math.min(from.z,to.z)-radius,Math.max(from.x,to.x)+radius,Math.max(from.z,to.z)+radius)){if(!wall.alive)continue;const hit=segmentBox(from,to,wall,radius);if(hit&&(!nearest||hit.fraction<nearest.fraction)){const t=hit.fraction;nearest={...hit,wall,distance:distance*t,point:{x:from.x+(to.x-from.x)*t,y:from.y+(to.y-from.y)*t,z:from.z+(to.z-from.z)*t}};}}
 return nearest;
}
function resolve(world,eye,muzzle,target,{contactDistance=.14,radius=.02}={}){
 if(!valid(eye)||!valid(muzzle)||!valid(target))return {blocked:true,reason:'invalid-muzzle',hit:null};
 const crossing=trace(world,eye,muzzle,radius);if(crossing)return {blocked:true,reason:'muzzle-inside-cover',hit:crossing};
 const hit=trace(world,muzzle,target,0);return {blocked:!!hit&&hit.distance<=contactDistance,reason:hit?(hit.distance<=contactDistance?'muzzle-contact':'wall-intercept'):null,hit};
}
const api={trace,resolve,segmentBox};root.DFMuzzleBallistics=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
