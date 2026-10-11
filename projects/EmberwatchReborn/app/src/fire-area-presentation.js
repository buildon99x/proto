import {lineOfSight,traceSegment,inMap} from './world-geometry.js';

// Authored visual envelope for the existing center-point sector hit rule.
// Keep the established +10 target tolerance; this is not a damage/range buff.
export const SECTOR_TARGET_PADDING=10;
export const FIRE_AREA_STYLE=Object.freeze({fill:'#dc9d50',fillAlpha:.11,outline:'#181823',outlineAlpha:.9,outlineWidth:3.6,edge:'#ffe0a0',edgeAlpha:.92,edgeWidth:1.7,edgeDash:Object.freeze([5,4])});
export function sectorContains(map,target,origin,angle,range,arc){
 const dx=target.x-origin.x,dy=target.y-origin.y,delta=Math.atan2(Math.sin(Math.atan2(dy,dx)-angle),Math.cos(Math.atan2(dy,dx)-angle));
 return lineOfSight(map,origin,target)&&Math.hypot(dx,dy)<=range+SECTOR_TARGET_PADDING&&Math.abs(delta)<=arc/2;
}
export function fireAreaOutline(map,area){
 if(!area||!['x','y','angle','range','arcRadians','age','duration','damage'].every(k=>Number.isFinite(area[k]))||area.age<0||area.duration<=0||area.age>=area.duration||area.damage<=0||area.range<=0||area.range>1000||area.arcRadians<=0||area.arcRadians>Math.PI*2||!inMap(map,area.x,area.y,0))return [];
 const radius=area.range+SECTOR_TARGET_PADDING,segments=Math.max(12,Math.ceil(radius*area.arcRadians/3)),points=[{x:area.x,y:area.y}];
 // <=3 world-unit arc samples; ray clipping uses the same <=4-unit collision
 // traversal as damage LOS. The drawing is a sampled outline, not new physics.
 for(let i=0;i<=segments;i++){
  const a=area.angle-area.arcRadians/2+area.arcRadians*i/segments;
  const p=traceSegment(map,area,{x:area.x+Math.cos(a)*radius,y:area.y+Math.sin(a)*radius});
  points.push({x:p.x,y:p.y});
 }
 return points;
}
