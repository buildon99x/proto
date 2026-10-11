// Read-only presentation core. Connectivity is taken from this frame's real
// collision map; neither sightlines nor enemy activation decide floor access.
import {lineOfSight} from './world-geometry.js';
export function connectedFloor(map,p){
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
export function connectedSceneVisibility(battle,{region,names,range,objectives={},objectView=()=>null,portalView=()=>null,retainThreats=false,labelOverride=()=>null}){
 const {map,p,enemies=[],shots=[],effects=[]}=battle,seen=connectedFloor(map,p),gates={...objectives};
 const foes=new Map(region.foes.map(o=>[o.id,o])),objects=new Map(region.objects.map(o=>[o.id,o])),portals=new Map(region.portals.map(o=>[o.id,o]));
 const reachable=o=>!!seen[Math.floor(o.y/32)]?.[Math.floor(o.x/32)];
 const gateOpen=gate=>!gate||gates[typeof gate==='string'?gate:gate.objective]>=(gate.minimum??1);
 const objectViews=new Map(region.objects.map(o=>[o.id,objectView(o)]));
 const portalViews=new Map(region.portals.map(o=>[o.id,portalView(o)]));
 // Safety exception for S: even an inconsistent gate/map snapshot must never
 // erase an already live threat or its committed warning. Idle foes still need
 // BOTH connected floor and their authored encounter gate.
 const threatVisible=e=>retainThreats&&e.hp>0&&!e.dead&&!!(e.active||e.telegraph?.shapes?.length);
 const entityVisible=e=>threatVisible(e)||reachable(e)&&gateOpen(e.gate??foes.get(e.id)?.gate);
 const objectVisible=o=>{
  if(!reachable(o))return false;
  if(portals.has(o.id))return portalViews.get(o.id)?.allowed===true;
  const source=objects.get(o.id);
  return !source?.hideWhenCompleted||objectViews.get(o.id)?.completed!==true;
 };
 // Residual hostile shots/area tells keep labels quiet after their caster dies.
 const combat=enemies.some(e=>e.hp>0&&!e.dead&&(e.active||retainThreats&&e.telegraph?.shapes?.length)&&entityVisible(e))||
  shots.some(s=>s.enemy)||effects.some(f=>f.life>0&&['enemyRelease','hostileZone','meteor'].includes(f.type));
 const landmarkLabel=o=>{
  if(combat||!names[o.id]||!objectVisible(o)||Math.hypot(o.x-p.x,o.y-p.y)>range||!lineOfSight(map,p,o))return null;
  return labelOverride(o,portalViews.get(o.id))??names[o.id]+(objectViews.get(o.id)?.completed?' · 완료':'');
 };
 return {seen,entityVisible,objectVisible,landmarkLabel,combat,threatVisible};
}
