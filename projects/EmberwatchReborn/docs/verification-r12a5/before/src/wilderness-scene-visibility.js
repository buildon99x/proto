// W-only read-only presentation. This never filters the simulation, changes a
// collision tile, or turns activation into visibility. Reachable idle foes are
// still bodies; an active threat does not vanish when its sightline is broken.
import {WILDERNESS_REGION,WILDERNESS_REGIONS} from './wilderness-content.js';
import {lineOfSight} from './world-geometry.js';
const region=WILDERNESS_REGIONS[WILDERNESS_REGION];
const foes=new Map(region.foes.map(o=>[o.id,o]));
const objects=new Map(region.objects.map(o=>[o.id,o]));
const portals=new Map(region.portals.map(o=>[o.id,o]));
export const WILDERNESS_LANDMARK_RANGE=160;
const names=Object.freeze({
 'wilderness-tablet':'측량판', 'wilderness-hook':'무료 갈고리',
 'wilderness-anchor':'귀환 닻', 'wilderness-glyph-wind':'바람깃 수신판',
 'wilderness-glyph-cairn':'돌무덤 수신판', 'wilderness-glyph-ember':'잿불 수신판',
 'wilderness-choice':'엄폐판 선택', 'wilderness-relay':'신호 중계기',
 'wilderness-evidence':'신호 기록핵', 'wilderness-scouts':'네리 · 선택 구조',
 'wilderness-town-return':'마을 귀환', 'wilderness-anchor-return':'닻다리 귀환',
 'wilderness-keeper-return':'단상 귀환',
});
function connectedFloor(map,p){
 const seen=map.tiles.map(row=>row.map(()=>false)),x=Math.floor(p.x/32),y=Math.floor(p.y/32);
 if(map.tiles[y]?.[x]!==1)return seen;
 const queue=[[x,y]];seen[y][x]=true;
 for(let head=0;head<queue.length;head++){
  const [x,y]=queue[head];
  for(const [dx,dy] of [[1,0],[0,1],[-1,0],[0,-1]]){
   const nx=x+dx,ny=y+dy;
   if(map.tiles[ny]?.[nx]===1&&!seen[ny][nx]){seen[ny][nx]=true;queue.push([nx,ny]);}
  }
 }
 return seen;
}
export function wildernessSceneVisibility(battle,{objectives={},objectView=()=>null,portalView=()=>null}={}){
 if(battle?.region!==WILDERNESS_REGION)return null;
 const {map,p,enemies=[],shots=[],effects=[]}=battle,seen=connectedFloor(map,p);
 const reachable=o=>!!seen[Math.floor(o.y/32)]?.[Math.floor(o.x/32)];
 const gateOpen=gate=>!gate||objectives[typeof gate==='string'?gate:gate.objective]>=(gate.minimum??1);
 const objectViews=new Map(region.objects.map(o=>[o.id,objectView(o)]));
 const portalViews=new Map(region.portals.map(o=>[o.id,portalView(o)]));
 const entityVisible=e=>reachable(e)&&gateOpen(e.gate??foes.get(e.id)?.gate);
 const objectVisible=o=>{
  if(!reachable(o))return false;
  if(portals.has(o.id))return portalViews.get(o.id)?.allowed===true;
  const source=objects.get(o.id);
  return !source?.hideWhenCompleted||objectViews.get(o.id)?.completed!==true;
 };
 // Residual hostile projectiles/area tells still own the screen after their
 // caster dies. Suppression lasts only as long as the live threat, not a timer.
 const combat=enemies.some(e=>e.active&&e.hp>0&&!e.dead&&entityVisible(e))||
  shots.some(s=>s.enemy)||effects.some(f=>f.life>0&&['enemyRelease','hostileZone','meteor'].includes(f.type));
 const landmarkLabel=o=>{
  if(combat||!names[o.id]||!objectVisible(o)||Math.hypot(o.x-p.x,o.y-p.y)>WILDERNESS_LANDMARK_RANGE||!lineOfSight(map,p,o))return null;
  if(o.id==='wilderness-keeper-return'&&portalViews.get(o.id)?.name?.includes('기록핵 미회수'))return '귀환 · 기록핵 미회수';
  return names[o.id]+(objectViews.get(o.id)?.completed?' · 완료':'');
 };
 return {seen,entityVisible,objectVisible,landmarkLabel,combat};
}
