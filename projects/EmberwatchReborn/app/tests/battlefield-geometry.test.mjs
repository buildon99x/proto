import test from 'node:test';
import assert from 'node:assert/strict';
import {BATTLEFIELD_REGION,BATTLEFIELD_REGIONS,BATTLEFIELD_LINKS,BATTLEFIELD_FOES,BATTLEFIELD_GROUPS,BATTLEFIELD_REWARDS,BATTLEFIELD_TACTICS} from '../src/battlefield-content.js';
import {mapFromRegion,inMap,traceSegment,lineOfSight,findPathStep} from '../src/world-geometry.js';
import {experienceMultiplier,xpForLevel,grantExperience,createCharacter} from '../src/progression.js';
// Synthetic geometry/arithmetic fixtures. No normal play or survival claim.
const region=BATTLEFIELD_REGIONS[BATTLEFIELD_REGION];
function centers(map){const start=region.spawn,list=[start],seen=new Set([`${start.x}:${start.y}`]);for(let i=0;i<list.length;i++)for(const [dx,dy]of [[32,0],[-32,0],[0,32],[0,-32]]){const p=list[i],q={x:p.x+dx,y:p.y+dy},key=`${q.x}:${q.y}`;if(!seen.has(key)&&inMap(map,q.x,q.y,11)&&!traceSegment(map,p,q,11).blocked){seen.add(key);list.push(q);}}return list;}
for(const [west,east]of [[0,0],[1,0],[0,1],[1,1]])test(`synthetic B geometry: devices ${west}/${east}, continuous radius11 routes and gated boss LOS`,()=>{
 const flags={battlefield_accepted:1,battlefield_west_ready:west,battlefield_east_ready:east,battlefield_devices_ready:west&&east},map=mapFromRegion(region,flags),reachable=centers(map);
 assert.ok(reachable.length>140);
 for(const f of region.foes){const ready=f.gate==='battlefield_accepted'||!!flags[f.gate];assert.equal(!!findPathStep(map,region.spawn,f),ready,f.id);assert.equal(inMap(map,f.x,f.y,11),true,f.id);
  if(!ready)for(const p of reachable)for(const dx of [-6,0,6])for(const dy of [-6,0,6]){const q={x:p.x+dx,y:p.y+dy};if(!inMap(map,q.x,q.y,11))continue;assert.equal(lineOfSight(map,q,f),false);assert.equal(traceSegment(map,q,f,11).blocked,true);assert.equal(traceSegment(map,q,f,4).blocked,true);}
 }
 for(const o of region.objects.filter(o=>o.actionKind!=='beacon'||west&&east)){assert.ok(inMap(map,o.x,o.y,11),o.id);assert.ok(findPathStep(map,region.spawn,o),o.id);}
 for(const p of BATTLEFIELD_LINKS.ash_hamlet)assert.ok(inMap(map,p.arrival.x,p.arrival.y,11));
 assert.ok(inMap(map,region.portals[0].x,region.portals[0].y,11));
});
test('synthetic B geometry: arrivals are beyond visible activation range, cover blocks shots, lateral exits remain swept-clear',()=>{
 const map=mapFromRegion(region,{battlefield_accepted:1,battlefield_devices_ready:1});
 for(const f of region.foes)assert.ok(Math.hypot(f.x-region.spawn.x,f.y-region.spawn.y)>=300||!lineOfSight(map,region.spawn,f),`unsafe arrival ${f.id}`);
 const pocket=BATTLEFIELD_TACTICS.west.bannerPocket;assert.ok(inMap(map,pocket.x,pocket.y,11));
 assert.equal(inMap(map,208,496,0),false);assert.equal(lineOfSight(map,{x:144,y:496},{x:304,y:496}),false);
 const lane=BATTLEFIELD_TACTICS.east.channelLane;assert.equal(traceSegment(map,lane.from,lane.to,11).blocked,false);
 for(const p of BATTLEFIELD_TACTICS.east.lateralExits)assert.equal(traceSegment(map,{x:720,y:496},p,11).blocked,false);
 const boss=region.foes.at(-1);for(const p of [{x:368,y:176},{x:592,y:176},{x:480,y:80}])assert.equal(traceSegment(map,boss,p,11).blocked,false,'boss flanks have no forced commitment');
});
test('B content explicitly owns tags, distinct boss attacks, all six statuses and exact authored budget',()=>{
 assert.equal(region.foes.length,13);assert.equal(new Set(region.foes.map(f=>f.id)).size,13);
 assert.deepEqual(region.foes.map(f=>f.id).sort(),Object.values(BATTLEFIELD_GROUPS).flat().sort());
 assert.equal(region.foes.reduce((n,f)=>n+BATTLEFIELD_FOES[f.kind].xp,0),1320);
 assert.equal(region.foes.reduce((n,f)=>n+BATTLEFIELD_FOES[f.kind].gold,0),156);
 assert.equal(Object.values(BATTLEFIELD_REWARDS).reduce((n,r)=>n+r.xp,0),900);
 assert.equal(Object.values(BATTLEFIELD_REWARDS).reduce((n,r)=>n+r.gold,0),170);
 assert.deepEqual([...new Set(Object.values(BATTLEFIELD_FOES).flatMap(f=>f.patterns.flatMap(p=>p.statusRuleIds)))].sort(),['r11_burn','r11_disarm','r11_poison','r11_silence','r11_slow','r11_stun']);
 assert.ok(Object.values(BATTLEFIELD_FOES).every(f=>f.tier==='expert'&&f.tags.length&&f.patterns.every(p=>['weapon','spell'].includes(p.attackFamily)&&p.windup>=.85&&p.recovery>=1)));
 const boss=BATTLEFIELD_FOES.battlefield_usurper;assert.equal(boss.hp,200);assert.equal(boss.tags.includes('undead'),false);assert.deepEqual(boss.patterns.map(p=>[p.shape,p.attackFamily]),[['line','spell'],['cone','weapon']]);
 assert.throws(()=>boss.hp=900,TypeError);
});
const cumulative=c=>Array.from({length:c.level-1},(_,i)=>xpForLevel(i+1)).reduce((a,b)=>a+b,0)+c.xp;
for(const [difficulty,total,expected]of [['easy',6191,8411],['normal',6365.5,8585.5],['hard',5509.5,7399.5],['serious',5715.125,7605.125]])test(`synthetic arithmetic B budget from documented T ${difficulty} total, not played progression`,()=>{
 let c=grantExperience(createCharacter(),total).character;
 for(const f of region.foes)c=grantExperience(c,BATTLEFIELD_FOES[f.kind].xp*experienceMultiplier(c.level,'expert',difficulty)).character;
 c=grantExperience(c,900).character;assert.equal(cumulative(c),expected);assert.equal(c.level,['easy','normal'].includes(difficulty)?18:17);
});
