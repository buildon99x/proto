import test from 'node:test';
import assert from 'node:assert/strict';
import {TOMB_REGIONS,TOMB_REGION,TOMB_LINKS} from '../src/tomb-content.js';
import {mapFromRegion,inMap,traceSegment,lineOfSight,findPathStep} from '../src/world-geometry.js';
// Authored geometry/continuous sweep fixtures, not visual, encounter or player
// acceptance. Full live projectile/AI and rendered-stage QA remain separate.
const region=TOMB_REGIONS[TOMB_REGION];
const stages=[{}, {tomb_decoded:1}, {tomb_decoded:1,tomb_sequence_solved:1},
 {tomb_decoded:1,tomb_sequence_solved:1,tomb_ward_taken:1},
 {tomb_decoded:1,tomb_sequence_solved:1,tomb_ward_taken:1,tomb_ward_midpoint:1},
 {tomb_decoded:1,tomb_sequence_solved:1,tomb_ward_taken:1,tomb_ward_midpoint:1,tomb_ward_sealed:1}];
function centers(map){const start={x:112,y:656},list=[start],seen=new Set(['112:656']);for(let i=0;i<list.length;i++){const p=list[i];for(const [dx,dy]of [[32,0],[-32,0],[0,32],[0,-32]]){const q={x:p.x+dx,y:p.y+dy},key=q.x+':'+q.y;if(!seen.has(key)&&inMap(map,q.x,q.y,11)&&!traceSegment(map,p,q,11).blocked){seen.add(key);list.push(q);}}}return list;}
for(const [index,flags]of stages.entries())test(`T physical stage${index} has reachable active anchors and blocks sub-tile LOS/swept access to future foes`,()=>{
 const objectives={tomb_accepted:1,...flags},map=mapFromRegion(region,objectives),reachable=centers(map),offsets=[-4,0,4];
 for(const foe of region.foes){const available=!!objectives[foe.gate];assert.equal(!!findPathStep(map,region.spawn,foe),available,foe.id);
  if(!available)for(const tile of reachable)for(const dx of offsets)for(const dy of offsets){const p={x:tile.x+dx,y:tile.y+dy};if(!inMap(map,p.x,p.y,11))continue;assert.equal(lineOfSight(map,p,foe),false,`LOS ${foe.id} from ${p.x},${p.y}`);assert.equal(traceSegment(map,p,foe,11).blocked,true,`swept charge ${foe.id}`);assert.equal(traceSegment(map,p,foe,4).blocked,true,`projectile ${foe.id}`);}
 }
 assert.ok(reachable.length>0);assert.equal(inMap(map,region.spawn.x,region.spawn.y,11),true);
 for(const door of region.doors)if(!objectives[door.unlockObjective])for(let y=door.y;y<door.y+door.h;y++)for(let x=door.x;x<door.x+door.w;x++)assert.equal(map.tiles[y][x],0);
 if(index>0){const previous=mapFromRegion(region,{tomb_accepted:1,...stages[index-1]});for(let y=0;y<map.h;y++)for(let x=0;x<map.w;x++)assert.ok(map.tiles[y][x]>=previous.tiles[y][x],'transitions never close under actors');}
});
test('T fixed objects and arrival points are valid with prerequisites and both sarcophagi/plinth are physical',()=>{
 const map=mapFromRegion(region,{tomb_accepted:1,...stages.at(-1)});
 for(const o of region.objects){assert.ok(inMap(map,o.x,o.y,11),o.id);assert.ok(findPathStep(map,region.spawn,o),o.id);}
 for(const p of TOMB_LINKS.ash_hamlet)assert.ok(inMap(map,p.arrival.x,p.arrival.y,11),p.id);
 for(const [x,y]of [[144,528],[272,592],[176,176]])assert.equal(inMap(map,x,y,0),false);
 assert.equal(lineOfSight(map,{x:80,y:528},{x:240,y:528}),false,'lower offset sarcophagus blocks fire');
 assert.equal(lineOfSight(map,{x:112,y:208},{x:272,y:208}),false,'plinth blocks fire from either side');
 assert.equal(lineOfSight(map,{x:272,y:208},{x:112,y:208}),false);
});
