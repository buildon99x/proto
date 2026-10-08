// Offscreen CPU and pixel-contract checks, not a browser FPS or gameplay test.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {ART} from '../src/art.js';
import {FLOOR_CACHE,createVisualRenderer,foregroundAlpha,screenMovement} from '../src/visual.js';
import {createMap} from '../src/data.js';
const require=createRequire(import.meta.url);
let canvasModule;
try{canvasModule=require('@napi-rs/canvas');}catch(error){
 if(error.code!=='MODULE_NOT_FOUND')throw error;
 console.log('SKIP: optional @napi-rs/canvas is unavailable; offscreen renderer performance is unmeasured.');
 process.exit(0);
}
const {createCanvas,loadImage}=canvasModule;
const images={motion:{hero:await loadImage(new URL('../src/assets/motion-hero.png',import.meta.url).pathname)},axe:await loadImage(new URL('../src/assets/motion-warrior-axe.png',import.meta.url).pathname)};for(const key of ['environment','hero','enemy'])images[key]=await loadImage(new URL('../src/'+ART[key].file,import.meta.url).pathname);
const map=createMap(803214,2,2),room=map.rooms[5],p={x:(room.cx+.5)*32,y:(room.cy+.5)*32,angle:-.7,classId:'warrior',action:{name:'attack',elapsed:.13,duration:.42,contact:.13,payload:{kind:'attack',combo:2}},hp:150,mana:80,attack:0,walk:0,invuln:0,moving:false},seen=Array.from({length:map.h},(_,y)=>Array.from({length:map.w},(_,x)=>Math.hypot(x-p.x/32,y-p.y/32)<17));
const objects=[];for(const r of map.rooms){objects.push({type:'torch',x:(r.x+1)*32,y:(r.y+1)*32},{type:'torch',x:(r.x+r.w-2)*32,y:(r.y+1)*32});if(r.index%3===1)objects.push({type:'chest',x:(r.cx+2)*32,y:r.cy*32});if(r.index%3===2)objects.push({type:'barrel',x:(r.x+2)*32,y:(r.y+r.h-2)*32});}
objects.push({type:'shrine',x:p.x-160,y:p.y-40},{type:'relic',x:p.x+65,y:p.y-140},{type:'exit',x:p.x+210,y:p.y+120});
const entities=[{type:'skeleton',x:p.x+150,y:p.y+30,hp:65,max:65,angle:-2.2,walk:1,state:'idle',active:true},{type:'knight',x:p.x-110,y:p.y+160,hp:90,max:90,angle:-.7,walk:0,state:'idle',active:true}];
const state={map,p,objects,entities,seen,shots:[{x:p.x+70,y:p.y+45,vx:200,vy:30,kind:'axe'}],effects:[{type:'slash',x:p.x,y:p.y,angle:-.7,r:74,life:.13,max:.16,color:'#f5d08a',heavy:true},{type:'impact',x:p.x+55,y:p.y-40,angle:-.7,r:30,life:.14,max:.18,color:'#ffefc4',heavy:true}],floaters:[],loot:[],time:3.5,shake:0,stats:{hp:150,mana:80},cleanView:true,classId:'warrior'};

const width=1280,height=800,origin={...p};
state.width=width;state.height=height;
const directCanvas=createCanvas(width,height),cachedCanvas=createCanvas(width,height);
const direct=createVisualRenderer(directCanvas.getContext('2d'),ART,images,{createCanvas:null});
let allocations=0;
const cached=createVisualRenderer(cachedCanvas.getContext('2d'),ART,images,{createCanvas:(w,h)=>{allocations++;assert(w*h<=FLOOR_CACHE.maxPixels);return createCanvas(w,h);}});
function renderPair(){direct.render(state);cached.render(state);}
function difference(a=directCanvas,b=cachedCanvas){
 const av=a.getContext('2d').getImageData(0,0,a.width,a.height).data,bv=b.getContext('2d').getImageData(0,0,b.width,b.height).data;
 let absolute=0,large=0,max=0;
 for(let i=0;i<av.length;i+=4){let pixelMax=0;for(let c=0;c<3;c++){const d=Math.abs(av[i+c]-bv[i+c]);absolute+=d;pixelMax=Math.max(pixelMax,d);}max=Math.max(max,pixelMax);if(pixelMax>16)large++;assert.equal(av[i+3],bv[i+3]);}
 return {mean:absolute/(a.width*a.height*3),large:large/(a.width*a.height),max};
}
function closeFrames(tolerance=.03,largeTolerance=.001){const d=difference();assert(d.mean<tolerance,JSON.stringify(d));assert(d.large<largeTolerance,JSON.stringify(d));return d;}
renderPair();const stationaryPixels=closeFrames();
assert(cached.metrics().floorCache.enabled);
assert.equal(cached.metrics().floorCache.width,width+FLOOR_CACHE.guard*2);
assert.equal(cached.metrics().floorCache.height,height+FLOOR_CACHE.guard*2);
assert.equal(cached.metrics().floorCache.rebuilds,1);
renderPair();assert.equal(cached.metrics().floorCache.rebuilt,false);closeFrames();
const motionPixels=[];
// Integer screen-space camera moves retain raster phase; the guard band must
// cover all viewport edges until a rebuild, including large jumps backwards.
for(const [dx,dy] of [[20,40],[90,-90],[97,97],[-350,120],[900,-500],[0,0]]){
 const movement=screenMovement(dx/1.26,dy/1.26);state.p={...origin,x:origin.x+movement.x,y:origin.y+movement.y};renderPair();closeFrames();
}
// Nearest-neighbor cached pixels differ from rerasterizing fractional clips by
// at most a subpixel sampling phase. Bound the aggregate error, never blur art.
for(const [dx,dy] of [[.3,.7],[5,8],[50,20]]){
 state.p={...origin,x:origin.x+dx,y:origin.y+dy};renderPair();motionPixels.push(closeFrames(4.5,.1));
}
state.p={...origin};renderPair();
// Reveal/re-hide existing rows in place, change walkability, replace the map,
// and resize. Each must invalidate immediately, without a simulation hook.
const gx=Math.floor(p.x/32),gy=Math.floor(p.y/32);
for(const mutate of [()=>{seen[gy][gx]=false;},()=>{seen[gy][gx]=true;},()=>{map.tiles[gy][gx]=0;},()=>{map.tiles[gy][gx]=1;},()=>{state.map={...map};}]){
 const before=cached.metrics().floorCache.rebuilds;mutate();renderPair();assert.equal(cached.metrics().floorCache.rebuilds,before+1);closeFrames();
}
state.map=map;
for(const [w,h] of [[736,1313],[390,844],[1280,800]]){
 directCanvas.width=cachedCanvas.width=state.width=w;directCanvas.height=cachedCanvas.height=state.height=h;renderPair();closeFrames();assert.equal(cached.metrics().floorCache.pixels,(w+FLOOR_CACHE.guard*2)*(h+FLOOR_CACHE.guard*2));
}
state.shake=24;renderPair();closeFrames(4.5,.1);state.shake=0;
const beforeOversize=allocations;state.width=4096;state.height=4096;cached.render(state);
assert.equal(cached.metrics().floorCache.enabled,false);assert.equal(allocations,beforeOversize,'oversize viewport must not allocate a huge surface');
state.width=width;state.height=height;
for(const factory of [()=>null,()=>{throw new Error('surface unavailable');}]){
 const fallbackCanvas=createCanvas(width,height),fallback=createVisualRenderer(fallbackCanvas.getContext('2d'),ART,images,{createCanvas:factory});direct.render(state);fallback.render(state);assert.equal(fallback.metrics().floorCache.enabled,false);assert.equal(difference(directCanvas,fallbackCanvas).mean,0);
}
// Foreground fades use actual atlas anchors, exclude background props and
// short debris, and protect nearby opponents/tells without changing depth.
const protectedActor={left:90,right:110,top:40,bottom:101,depth:100};
for(const key of ['wallSE','pillar','statue','arch']){
 const drawable={type:key==='wallSE'?'wall':'decor',key,x:100,y:120,width:60,depth:120};
 assert(foregroundAlpha(drawable,ART.environment.sprites[key],[protectedActor])<1,key);
 assert.equal(foregroundAlpha({...drawable,depth:90},ART.environment.sprites[key],[protectedActor]),1);
 assert.equal(foregroundAlpha({...drawable,x:500},ART.environment.sprites[key],[protectedActor]),1);
 assert.equal(foregroundAlpha({...drawable,o:{broken:true}},ART.environment.sprites[key],[protectedActor]),1);
}
assert.equal(foregroundAlpha({type:'decor',key:'rubble',x:100,y:120,width:60,depth:120},ART.environment.sprites.rubble,[protectedActor]),1);
renderPair();const beforeFade=cached.metrics().fadedForeground;
state.objects=[...objects,{type:'shrine',x:p.x+16,y:p.y+16}];renderPair();closeFrames();assert(cached.metrics().fadedForeground>beforeFade,'overlapping foreground statue must fade for the Warrior');state.objects=objects;
const savedEntities=state.entities;
for(const distance of [100,300]){
 const enemy={type:'skeleton',x:p.x+distance,y:p.y+distance,hp:65,max:65,angle:0,active:true,state:'idle'};
 state.entities=[enemy];state.objects=[];cached.render(state);const before=cached.metrics().fadedForeground;
 state.objects=[{type:'shrine',x:enemy.x+16,y:enemy.y+16}];cached.render(state);
 assert.equal(cached.metrics().fadedForeground,before+(distance===100?1:0),'only active nearby opponents are protected from foreground props');
}
state.entities=savedEntities;state.objects=objects;
function summary(samples){samples.sort((a,b)=>a-b);return {meanMs:+(samples.reduce((a,b)=>a+b,0)/samples.length).toFixed(3),medianMs:+samples[Math.floor(samples.length*.5)].toFixed(3),p95Ms:+samples[Math.floor(samples.length*.95)].toFixed(3)};}
const timings={};
for(const kind of ['stationary','moving']){
 state.p={...origin};const samples=[[],[]];
 for(let i=-16;i<120;i++){
  if(kind==='moving'){state.p.x+=1.5;state.p.y+=.9;}state.time=3.5+Math.max(0,i)/60;
  // Alternate order to reduce systematic warmup/scheduling bias.
  for(const j of (i%2?[0,1]:[1,0])){const start=performance.now();(j?cached:direct).render(state);(j?cachedCanvas:directCanvas).getContext('2d').getImageData(0,0,1,1);if(i>=0)samples[j].push(performance.now()-start);}
 }
 timings[kind]={direct:summary(samples[0]),cached:summary(samples[1])};
}
// Timings are reported, not hardware-dependent CI pass criteria.
console.log('PASS: bounded viewport floor cache, reuse, guard-band movement, fractional pixel tolerance, immediate reveal/hide/map invalidation, resize, shake, allocation cap, direct fallback and selective foreground combat visibility.');
console.log(JSON.stringify({evidence:'Offscreen @napi-rs/canvas CPU render plus 1-pixel readback flush; not actual-browser 60 FPS proof',viewport:[width,height],framesPerPath:120,timings,stationaryPixels,motionPixels,cache:cached.metrics().floorCache},null,2));
