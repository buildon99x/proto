import {SPACE_SCALE} from './space.mjs';
// Ground-level window edges, rugs and sofa sides; never seats or raised ledges.
export const AMBIENT_SPOTS=Object.freeze([
 [-10,-9],[-7,-10],[-4,-8],[3,-9],[9,-10],[11,-6],
 [-11,-2],[-7,-1],[-3,0],[2,-1],[6,0],[10,1],
 [-10,5],[-6,7],[-2,8],[3,7],[7,9],[10,10]
].map(([x,z])=>Object.freeze({x:x*SPACE_SCALE,z:z*SPACE_SCALE})));
const index=id=>Number(id.slice(4))||0;
const roomOffset=room=>room==='garden'?23000:room==='moonlight'?47000:0;
const clock=(id,nowMs,room)=>Math.round(nowMs)+index(id)*6667+roomOffset(room);
export function ambientPhase(id,nowMs,room='sunroom'){
 const phase=((clock(id,nowMs,room)%120000)+120000)%120000;
 return phase<82000?'sleep':phase<104000?'rest':phase<109000?'groom':phase<112000?'stretch':'walk';
}
export function ambientHome(i){const {x,z}=AMBIENT_SPOTS[i%18];return{x,z,homeX:x,homeZ:z,yaw:(i%8-4)*Math.PI/4};}
// No timers, extra state, AI or network fields. Legacy checkpoint homes are anchors.
export function tickAmbient(cat,nowMs,dt,valid,room='sunroom'){
 if(ambientPhase(cat.id,nowMs,room)!=='walk')return;
 const i=index(cat.id),outward=Math.floor(clock(cat.id,nowMs,room)/120000)%2===0;
 const x=cat.homeX+(outward?((i%3)-1)*.65:0),z=cat.homeZ+(outward?((Math.floor(i/3)%3)-1)*.65:0);
 if(!valid(x,z))return;
 const dx=x-cat.x,dz=z-cat.z,d=Math.hypot(dx,dz);
 if(d<=.01)return;
 const step=Math.min(d,.5*Math.max(0,Math.min(.05,dt)));
 const nx=cat.x+dx/d*step,nz=cat.z+dz/d*step;
 if(valid(nx,nz)&&step>0){cat.x=nx;cat.z=nz;cat.yaw=Math.atan2(dx,dz);}
}
// One-time content migration for the known v1 grid only. Catalog homes act as
// the durable marker, so takeover cannot repeat it; custom homes are preserved.
export function migrateAmbientHome(cat,valid){
 if(cat.owner||cat.mode!=='idle')return false;
 const i=index(cat.id),oldX=(-5+(i%6)*2)*SPACE_SCALE,oldZ=(-3+Math.floor(i/6)*3)*SPACE_SCALE;
 if(Math.abs(cat.homeX-oldX)>1e-8||Math.abs(cat.homeZ-oldZ)>1e-8)return false;
 const home=ambientHome(i);if(!valid(home.x,home.z))return false;
 Object.assign(cat,home);cat.yaw=(i%8-4)*Math.PI/4;return true;
}
