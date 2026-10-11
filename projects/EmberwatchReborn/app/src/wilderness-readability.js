// W presentation reuses owned low masonry and established non-color role marks.
// Actual collision tiles, not objective predictions, own every visible opening.
import {WILDERNESS_REGION,WILDERNESS_REGIONS,WILDERNESS_FOES} from './wilderness-content.js';
import {BATTLEFIELD_FOES} from './battlefield-content.js';
import {battlefieldRolePresentation,BATTLEFIELD_SCENE_STYLE,BATTLEFIELD_UNDEAD_LINES,drawBattlefieldRoleLabel} from './battlefield-readability.js';
import {lowCoverSegments,openedDoorFloors} from './furnace-readability.js';
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
export const isWildernessScene=id=>id===WILDERNESS_REGION;
export const WILDERNESS_SCENE_STYLE=freeze({...BATTLEFIELD_SCENE_STYLE});
export const wildernessCoverSegments=(id,map,seen)=>isWildernessScene(id)?lowCoverSegments(map,seen):[];
export const wildernessOpenFloor=(id,map,hero,seen)=>isWildernessScene(id)?openedDoorFloors(WILDERNESS_REGIONS[WILDERNESS_REGION].doors,map,hero,seen):[];
const roles=freeze(Object.fromEntries(Object.entries(WILDERNESS_FOES).map(([kind,foe])=>{
 const undead=foe.tags.includes('undead'),source=Object.entries(BATTLEFIELD_FOES).find(([,candidate])=>candidate.roleGlyph===foe.roleGlyph&&candidate.tags.includes('undead')===undead);
 // W has one living flanker with B's undead wedge. Use the same role geometry
 // without the side skull; every other role shares its explicit tag combination.
 const fallback=source??Object.entries(BATTLEFIELD_FOES).find(([,candidate])=>candidate.roleGlyph===foe.roleGlyph),glyph=battlefieldRolePresentation({kind:fallback?.[0]},'beacon_battlefield');
 if(!glyph)throw new Error(`Unsupported wilderness role glyph: ${foe.roleGlyph}`);
 const lines=!source&&glyph.undead&&!undead?glyph.lines.slice(0,-BATTLEFIELD_UNDEAD_LINES.length):glyph.lines;
 return [kind,{mark:foe.roleGlyph,lines,undead,label:foe.name+(undead?' · 망자':'')}];
})));
export const wildernessRolePresentation=(actor,id)=>isWildernessScene(id)&&Object.hasOwn(roles,actor?.kind)?roles[actor.kind]:null;
export const drawWildernessRoleLabel=drawBattlefieldRoleLabel;
