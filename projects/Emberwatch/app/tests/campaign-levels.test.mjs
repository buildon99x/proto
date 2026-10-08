import test from 'node:test';
import assert from 'node:assert/strict';
import {WORLD_CONTENT} from '../src/campaign/world-content.js';
import {CAMPAIGN_LAYOUTS,createCampaignLevel,campaignFloorContains,moveCampaignActor,closestCampaignLandmark} from '../src/campaign/levels.js';
test('every authored node has exactly one stable, walkable landmark',()=>{
 const ids=[];for(const region of WORLD_CONTENT.regions){const map=createCampaignLevel(region.id);assert.deepEqual(createCampaignLevel(region.id),map);for(const room of map.rooms){ids.push(room.id);const p=map.anchors[room.id];assert(campaignFloorContains(map,p.x,p.y));assert.equal(closestCampaignLandmark(map,p.x,p.y).id,room.id);assert.equal(WORLD_CONTENT.nodes.find(n=>n.id===room.id).regionId,region.id);}}
 assert.equal(new Set(ids).size,ids.length);assert.deepEqual(ids.sort(),WORLD_CONTENT.nodes.map(n=>n.id).sort());assert.equal(Object.keys(CAMPAIGN_LAYOUTS).length,7);
});
test('same-region graph links have connected floor; cross-region links have explicit portals',()=>{
 for(const region of WORLD_CONTENT.regions){const map=createCampaignLevel(region.id);for(const c of map.corridors){const first=map.anchors[c.from],target=map.anchors[c.to],start=[Math.floor(first.x/32),Math.floor(first.y/32)],queue=[start],seen=new Set([start.join(',')]);for(let i=0;i<queue.length;i++){const [x,y]=queue[i];for(const [dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const X=x+dx,Y=y+dy,key=[X,Y].join(',');if(map.tiles[Y]?.[X]===1&&!seen.has(key)){seen.add(key);queue.push([X,Y]);}}}assert(seen.has([Math.floor(target.x/32),Math.floor(target.y/32)].join(',')),c.id);}
  for(const portal of map.portals){assert(campaignFloorContains(map,portal.x,portal.y));assert(WORLD_CONTENT.exits.some(e=>e.id===portal.id));assert.notEqual(portal.destinationRegionId,region.id);}
 }
});
test('wall collision stops walking and long charge steps without tunnelling; corners slide',()=>{
 const map=createCampaignLevel('ash_hamlet'),p={...map.anchors.hamlet_square};const movement=moveCampaignActor(p,map,10000,0);assert(campaignFloorContains(map,p.x,p.y));assert(movement.dx<10000);const x=p.x;moveCampaignActor(p,map,60,30);assert.equal(p.x,x);assert(campaignFloorContains(map,p.x,p.y));const snapshot={...p};assert.deepEqual(moveCampaignActor(p,map,NaN,1),{dx:0,dy:0,blocked:true});assert.deepEqual(p,snapshot);assert(!campaignFloorContains(map,Infinity,0));
});
