// B-only presentation from authored content. Actual tiles own walls/passages;
// no tactical suggestion, quest flag or actor glyph can create a walkable path.
import {BATTLEFIELD_REGION,BATTLEFIELD_REGIONS,BATTLEFIELD_FOES} from './battlefield-content.js';
import {lowCoverSegments,openedDoorFloors,FURNACE_SCENE_STYLE} from './furnace-readability.js';
import {tombRolePresentation} from './tomb-readability.js';
import {signalRolePresentation,SIGNAL_MARK_STYLE} from './signal-readability.js';
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
export const isBattlefieldScene=id=>id===BATTLEFIELD_REGION;
export const BATTLEFIELD_SCENE_STYLE=freeze({...FURNACE_SCENE_STYLE,edgeColor:'#b8bfad',passageFill:'#acb7a8',passageEdge:'#d0d7c3'});
export const battlefieldCoverSegments=(id,map,seen)=>isBattlefieldScene(id)?lowCoverSegments(map,seen):[];
export const battlefieldOpenFloor=(id,map,hero,seen)=>isBattlefieldScene(id)?openedDoorFloors(BATTLEFIELD_REGIONS[BATTLEFIELD_REGION].doors,map,hero,seen):[];
// Reuse the established non-color role vocabulary. A side skull distinguishes
// explicitly undead B content; no earlier foe is relabelled from its artwork.
const sourceGlyphs={
 wedge:tombRolePresentation({kind:'tomb_blade'},'signal_tomb'),
 slit:tombRolePresentation({kind:'tomb_scribe'},'signal_tomb'),
 'split-shaft':tombRolePresentation({kind:'tomb_piercer'},'signal_tomb'),
 'segmented-circle':tombRolePresentation({kind:'tomb_vigil'},'signal_tomb'),
 'forked-arrow':signalRolePresentation({kind:'signal_archer'},'signal_basin'),
 'broken-ring':tombRolePresentation({kind:'tomb_oathkeeper',patternPhase:{cue:'cracked-ring'}},'signal_tomb'),
};
export const BATTLEFIELD_UNDEAD_LINES=freeze([
 [[-31,2],[-28,0],[-25,2],[-25,7],[-27,7],[-27,9],[-29,9],[-29,7],[-31,7],[-31,2]],
 [[-29.5,3],[-29.5,4]],[[-26.5,3],[-26.5,4]],
]);
const roles=freeze(Object.fromEntries(Object.entries(BATTLEFIELD_FOES).map(([kind,foe])=>{
 const glyph=sourceGlyphs[foe.roleGlyph],undead=foe.tags.includes('undead');
 if(!glyph)throw new Error(`Unsupported battlefield role glyph: ${foe.roleGlyph}`);
 return [kind,{mark:foe.roleGlyph,lines:undead?[...glyph.lines,...BATTLEFIELD_UNDEAD_LINES]:glyph.lines,undead,label:foe.name}];
})));
export function battlefieldRolePresentation(actor,regionId){return isBattlefieldScene(regionId)&&Object.hasOwn(roles,actor?.kind)?roles[actor.kind]:null;}
export const BATTLEFIELD_LABEL_STYLE=freeze({color:'#d7ddd1',outline:SIGNAL_MARK_STYLE.roleOutlineColor,alpha:.95,offsetY:35,size:9});
// Current disabling statuses are above the actor's head. The authored threat
// label belongs below the ground glyph, so it cannot be mistaken for a buff.
// The renderer still draws all role labels BEFORE hostile warning paths.
export function drawBattlefieldRoleLabel(ctx,role,x,y,zoom){
 if(!role?.label)return;
 const yy=y+BATTLEFIELD_LABEL_STYLE.offsetY*zoom;
 ctx.save();ctx.font=`${BATTLEFIELD_LABEL_STYLE.size}px EmberwatchKorean, sans-serif`;ctx.textAlign='center';ctx.globalAlpha=BATTLEFIELD_LABEL_STYLE.alpha;
 ctx.fillStyle=BATTLEFIELD_LABEL_STYLE.outline;ctx.fillText(role.label,x+1,yy+1);ctx.fillStyle=BATTLEFIELD_LABEL_STYLE.color;ctx.fillText(role.label,x,yy);ctx.restore();
}
