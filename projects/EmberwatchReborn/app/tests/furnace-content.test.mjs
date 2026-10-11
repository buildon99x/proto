import test from 'node:test';
import assert from 'node:assert/strict';
import {FURNACE_REGION,FURNACE_REGIONS,FURNACE_FOES,FURNACE_GROUPS,FURNACE_LINKS,FURNACE_REWARDS,FURNACE_MODES,FURNACE_PROGRESS_DEFAULTS,FURNACE_RECEIPTS,FURNACE_TOOLS} from '../src/furnace-content.js';
import {mapFromRegion,inMap,traceSegment,lineOfSight,findPathStep} from '../src/world-geometry.js';

// Authored content/geometry checks. Synthetic flags are geometry inputs only,
// never earned progression, ordinary-input play, or tactical-quality evidence.
const region=FURNACE_REGIONS[FURNACE_REGION];
const flags=(mode=0,exhausted=false)=>({...FURNACE_PROGRESS_DEFAULTS,furnace_cooled:Number(mode>0),furnace_mode:mode,furnace_center_open:Number(mode===2),furnace_exhausted:Number(exhausted)});
function reachable(map,start=region.spawn){
 const key=p=>`${p.x},${p.y}`,queue=[{x:start.x,y:start.y}],seen=new Set([key(start)]);
 for(let i=0;i<queue.length;i++)for(const [dx,dy]of [[32,0],[-32,0],[0,32],[0,-32]]){
  const a=queue[i],p={x:a.x+dx,y:a.y+dy};
  if(!seen.has(key(p))&&inMap(map,p.x,p.y,11)&&!traceSegment(map,a,p,11).blocked){seen.add(key(p));queue.push(p);}
 }
 return queue;
}
function walk(map,start,end){
 let p={...start};const path=[p];
 for(let i=0;i<1000;i++){
  if(Math.hypot(p.x-end.x,p.y-end.y)<.001)return path;
  const next=findPathStep(map,p,end);assert.ok(next,`path missing: ${JSON.stringify({p,end})}`);
  assert.equal(traceSegment(map,p,next,11).blocked,false,`swept path blocked ${JSON.stringify({p,next})}`);p=next;path.push(p);
 }
 assert.fail('bounded navigation failed to reach endpoint');
}
test('F content is frozen authored 24x20 map, three mixed permanent groups and fixed rewards',()=>{
 assert.equal(region.w,24);assert.equal(region.h,20);assert.equal(region.foes.length,17);assert.equal(new Set(region.foes.map(f=>f.id)).size,17);
 assert.deepEqual(region.foes.map(f=>f.id),Object.values(FURNACE_GROUPS).flat());
 for(const [group,xp,gold,size]of [['cooling',240,30,5],['exhaust',300,38,6],['ignition',300,38,6]]){
  const rows=region.foes.filter(f=>FURNACE_GROUPS[group].includes(f.id));assert.equal(rows.length,size);assert.equal(new Set(rows.map(f=>f.kind)).size,3);
  assert.equal(rows.reduce((sum,f)=>sum+FURNACE_FOES[f.kind].xp,0),xp);assert.equal(rows.reduce((sum,f)=>sum+FURNACE_FOES[f.kind].gold,0),gold);
 }
 assert.equal(Object.values(FURNACE_REWARDS).reduce((n,r)=>n+r.xp,0),450);assert.equal(Object.values(FURNACE_REWARDS).reduce((n,r)=>n+r.gold,0),150);
 assert.ok(region.foes.every(f=>FURNACE_FOES[f.kind].tier==='adept'));
 assert.deepEqual(Object.keys(FURNACE_MODES),['cover','channel']);assert.equal(FURNACE_RECEIPTS.filter(r=>r.includes('cooling')).length,1);assert.equal(FURNACE_TOOLS.furnace_lens.consumed,false);
 assert.ok(Object.isFrozen(region.foes[0]));assert.ok(Object.isFrozen(FURNACE_FOES.furnace_warden.patterns[0]));
});
test('F staged geometry admits only current encounters with radius-11 continuous paths',()=>{
 for(const [mode,exhausted]of [[0,false],[1,false],[2,false],[1,true],[2,true]]){
  const o=flags(mode,exhausted),map=mapFromRegion(region,o),points=reachable(map);
  assert.equal(points.length,mode===0?72:exhausted?(mode===1?262:274):(mode===1?182:194));
  for(const f of region.foes){
   const active=Boolean(o[f.gate]);
   if(active){assert.ok(inMap(map,f.x,f.y,11),f.id);walk(map,region.spawn,f);walk(map,f,region.spawn);}
   else{assert.equal(findPathStep(map,region.spawn,f),null,f.id);assert.ok(points.every(p=>!lineOfSight(map,p,f)),f.id+' premature sightline');}
  }
  for(const object of region.objects){
   const reachableNow=['cooling','shortcut'].includes(object.actionKind)||object.actionKind==='exhaust'&&mode>0||exhausted;
   if(reachableNow)walk(map,region.spawn,object);
  }
  for(const portal of region.portals)walk(map,region.spawn,portal);
 }
});
test('both cooling modes preserve both side flanks and only channel removes center collision',()=>{
 const before=mapFromRegion(region,flags()),cover=mapFromRegion(region,flags(1)),channel=mapFromRegion(region,flags(2));
 for(const x of [112,624]){
  assert.equal(traceSegment(before,{x,y:464},{x,y:368},11).blocked,true);
  assert.equal(traceSegment(cover,{x,y:464},{x,y:368},11).blocked,false);
  assert.equal(traceSegment(channel,{x,y:464},{x,y:368},11).blocked,false);
 }
 for(const radius of [0,3,11]){
  assert.equal(traceSegment(cover,{x:368,y:464},{x:368,y:304},radius).blocked,true);
  assert.equal(traceSegment(channel,{x:368,y:464},{x:368,y:304},radius).blocked,false);
 }
 for(const mode of [1,2]){
  const closed=mapFromRegion(region,flags(mode)),opened=mapFromRegion(region,flags(mode,true));
  for(const x of [112,368,624]){assert.equal(traceSegment(closed,{x,y:272},{x,y:144},11).blocked,true);assert.equal(traceSegment(opened,{x,y:272},{x,y:144},11).blocked,false);}
 }
});
test('all geometry changes are monotonic and never close a tile under a live actor',()=>{
 const initial=mapFromRegion(region,flags());
 for(const mode of [1,2]){
  const cooled=mapFromRegion(region,flags(mode)),exhausted=mapFromRegion(region,flags(mode,true));
  for(let y=0;y<region.h;y++)for(let x=0;x<region.w;x++){assert.ok(initial.tiles[y][x]<=cooled.tiles[y][x]);assert.ok(cooled.tiles[y][x]<=exhausted.tiles[y][x]);}
 }
});
test('future groups cannot be shot from sampled continuous accessible-floor points',()=>{
 // More than tile-center BFS: sample the entire reachable footprint every 8
 // units with actual radius-11 legality and the production segment predicate.
 for(const mode of [0,1,2]){
  const o=flags(mode),map=mapFromRegion(region,o),tileKeys=new Set(reachable(map).map(p=>`${Math.floor(p.x/32)},${Math.floor(p.y/32)}`));
  const future=region.foes.filter(f=>!o[f.gate]);let checked=0;
  for(let y=64;y<576;y+=8)for(let x=64;x<704;x+=8){
   if(!tileKeys.has(`${Math.floor(x/32)},${Math.floor(y/32)}`)||!inMap(map,x,y,11))continue;
   for(const f of future)assert.equal(lineOfSight(map,{x,y},f),false,`stage ${mode} at ${x},${y} sees ${f.id}`);checked++;
  }
  assert.ok(checked>200);
 }
});
test('F entry and lift arrivals are legal with radius 11 and ordinary return remains free',()=>{
 const closed=mapFromRegion(region,flags());
 for(const link of FURNACE_LINKS.ash_hamlet)assert.ok(inMap(closed,link.arrival.x,link.arrival.y,11));
 assert.equal(region.portals[0].gate,undefined);assert.equal(region.portals[1].gate,'furnace_shortcut');
 assert.notEqual(region.objects.find(o=>o.actionKind==='shortcut').id,region.objects.find(o=>o.actionKind==='cooling').id);
});
