// Deterministic projection and asset contract checks, not browser interaction QA.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {ART} from '../src/art.js';
import {ISO,projectWorld,screenMovement,screenToWorld,spriteDirection,animationFrame} from '../src/visual.js';
const near=(a,b)=>assert(Math.abs(a-b)<1e-8,`${a} != ${b}`);
for(let x=-300;x<=300;x+=30)for(let y=-300;y<=300;y+=30){
 const projected=projectWorld(x,y),back=screenMovement(projected.x,projected.y);near(x,back.x);near(y,back.y);
 for(const [w,h] of [[1280,800],[736,1313],[390,844]]){
  const p={x:200,y:350},target=screenToWorld(w*.5+projected.x*ISO.zoom,h*.55+projected.y*ISO.zoom,p,w,h);
  near(target.x,p.x+x);near(target.y,p.y+y);
 }
}
for(const [sx,sy,d] of [[0,1,0],[-1,0,1],[1,0,2],[0,-1,3]]){const v=screenMovement(sx,sy);assert.equal(spriteDirection(Math.atan2(v.y,v.x)),d);}
assert.equal(animationFrame({},0,true),0);assert.equal(animationFrame({attack:.3},0,true),3);
assert.equal(animationFrame({state:'windup'},0),3);assert.equal(animationFrame({dashTime:.1},0,true),1);
assert(new Set(Array.from({length:40},(_,i)=>animationFrame({moving:true,walk:i/5},0,true))).size===2);
for(const [name,set] of Object.entries(ART)){
 const bytes=fs.readFileSync(new URL('../src/'+set.file,import.meta.url));assert.equal(bytes.subarray(1,4).toString(),'PNG');
 const w=bytes.readUInt32BE(16),h=bytes.readUInt32BE(20);assert.equal(bytes[25],6,'RGBA transparency must be retained');
 const frames=set.frames||Object.values(set.sprites);if(set.frames)assert.equal(frames.length,16);
 for(const r of frames){assert(r.x>=0&&r.y>=0&&r.w>0&&r.h>0&&r.x+r.w<=w&&r.y+r.h<=h,name+' frame bounds');assert(r.ax>=0&&r.ax<=r.w&&r.ay>=0&&r.ay<=r.h,name+' foot anchor');}
}
console.log('PASS: 441 projection/inverse cases × 3 viewport shapes, four screen-facing directions, animation states, 48 RGBA atlas regions and foot anchors. Not browser QA.');
