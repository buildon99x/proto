import {near,lineOfSight} from './world.js';

// Explicit authored relationships, not a generic "actionable objects first"
// priority. Town endpoints and unrelated locked portals are deliberately absent.
export const SHORTCUT_INTERACTIONS=Object.freeze([
 Object.freeze({regionId:'signal_tomb',portalId:'tomb-town-shortcut',gate:'tomb_shortcut',objectId:'tomb-shortcut',kind:'tomb',openObjective:'tomb_shortcut_open',requiredObjectives:Object.freeze(['tomb_accepted','tomb_decoded'])}),
 Object.freeze({regionId:'ember_furnace',portalId:'furnace-town-shortcut',gate:'furnace_shortcut',objectId:'furnace-shortcut',kind:'furnace',openObjective:'furnace_shortcut_open',requiredObjectives:Object.freeze(['furnace_accepted','furnace_cooled'])}),
 Object.freeze({regionId:'signal_basin',portalId:'signal-town-shortcut',gate:'signal_shortcut',objectId:'signal-shortcut',kind:'signal',openObjective:'signal_shortcut_open',requiredObjectives:Object.freeze(['signal_accepted','signal_decoded'])}),
 Object.freeze({regionId:'ashwind_pass',portalId:'pass-town-shortcut',gate:'pass_shortcut',objectId:'pass-shortcut',kind:'pass',openObjective:'pass_shortcut_open',requiredObjectives:Object.freeze(['pass_accepted','pass_rescue_complete'])}),
 Object.freeze({regionId:'ember_quarry',portalId:'quarry-town-lift',gate:'quarry_shortcut',objectId:'quarry-shortcut',kind:'quarry',openObjective:'quarry_shortcut_open',requiredObjectives:Object.freeze(['quarry_accepted','quarry_tool_found','quarry_rescue_complete'])}),
]);
const record=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const point=value=>record(value)&&Number.isFinite(value.x)&&Number.isFinite(value.y);
const text=value=>typeof value==='string'&&value.length>0&&value.length<=100;
const target=value=>point(value)&&text(value.id)&&text(value.kind);
const validMap=map=>record(map)&&Number.isInteger(map.w)&&map.w>0&&Number.isInteger(map.h)&&map.h>0&&Array.isArray(map.tiles)&&map.tiles.length===map.h&&map.tiles.every(row=>Array.isArray(row)&&row.length===map.w&&row.every(tile=>tile===0||tile===1));
const flag=(objectives,key,value)=>record(objectives)&&Object.hasOwn(objectives,key)&&objectives[key]===value;
const actionable=object=>Array.isArray(object.actions)&&object.actions.some(action=>record(action)&&typeof action.label==='string'&&action.label.trim().length>0&&(!Object.hasOwn(action,'disabled')||action.disabled===false));

// Read-only target selection. Reach/LOS, stable distance ties and existing
// command handlers remain authoritative. Return an original candidate reference.
export function selectInteractionTarget(input){
 if(!record(input))return null;
 const {position,map,candidates,regionId,objectives}=input;
 if(!point(position)||!validMap(map)||!Array.isArray(candidates))return null;
 const reachable=candidates.filter(object=>target(object)&&near(position,object)&&lineOfSight(map,position,object));
 let nearest=null,distance=Infinity;
 for(const object of reachable){
  const next=Math.hypot(object.x-position.x,object.y-position.y);
  if(next<distance){nearest=object;distance=next;}
 }
 if(nearest?.kind!=='portal')return nearest;
 const link=SHORTCUT_INTERACTIONS.find(row=>row.regionId===regionId&&row.portalId===nearest.id&&row.gate===nearest.gate);
 if(!link||!flag(objectives,link.openObjective,0)||!link.requiredObjectives.every(key=>flag(objectives,key,1)))return nearest;
 // Reject ambiguous/stale duplicate identities, even when only one is nearby.
 const matches=candidates.filter(object=>record(object)&&object.id===link.objectId&&object.kind===link.kind);
 if(matches.length!==1)return nearest;
 const object=matches[0];
 return object.actionKind==='shortcut'&&actionable(object)&&reachable.includes(object)?object:nearest;
}
