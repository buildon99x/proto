import {TOMB_REGION,TOMB_REGIONS} from './tomb-content.js';
import {lowCoverSegments,openedDoorFloors,FURNACE_SCENE_STYLE} from './furnace-readability.js';
const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
const arc=(rx,ry,start,end,n=12)=>Array.from({length:n+1},(_,i)=>{const a=start+(end-start)*i/n;return [Math.cos(a)*rx,Math.sin(a)*ry+6];});
export const TOMB_SCENE_STYLE=freeze({...FURNACE_SCENE_STYLE,edgeColor:'#acb5c5',passageFill:'#a7b2c2',passageEdge:'#ccd4e2'});
export const isTombScene=id=>id===TOMB_REGION;
export const tombCoverSegments=(id,map,seen)=>isTombScene(id)?lowCoverSegments(map,seen):[];
export const tombOpenFloor=(id,map,hero,seen)=>isTombScene(id)?openedDoorFloors(TOMB_REGIONS[TOMB_REGION].doors,map,hero,seen):[];
const roles=freeze({
 tomb_blade:{mark:'wedge',lines:[[[-16,9],[0,0],[16,9]],[[-10,10],[0,5],[10,10]]]},
 tomb_scribe:{mark:'slit',lines:[[[-14,4],[14,4]],[[-14,9],[14,9]],[[0,0],[0,13]]]},
 tomb_vigil:{mark:'segmented-circle',lines:[arc(18,7,-.6,.6),arc(18,7,Math.PI-.6,Math.PI+.6),[[-7,0],[7,0]],[[-7,13],[7,13]]]},
 tomb_piercer:{mark:'split-shaft',lines:[[[-16,2],[-4,7],[-16,12]],[[16,2],[4,7],[16,12]],[[-4,7],[4,7]]]},
 tomb_oathkeeper:{mark:'oath-ring',lines:[arc(25,9,.3,Math.PI-.3),arc(25,9,Math.PI+.3,Math.PI*2-.3)]},
});
const cracked=freeze({mark:'cracked-ring',lines:[arc(25,9,.3,Math.PI-.3),arc(25,9,Math.PI+.3,Math.PI*2-.3),[[-4,-3],[2,2],[-2,7],[4,13]]]});
export function tombRolePresentation(actor,id){
 if(!isTombScene(id)||!Object.hasOwn(roles,actor?.kind))return null;
 return actor.kind==='tomb_oathkeeper'&&actor.patternPhase?.cue==='cracked-ring'?cracked:roles[actor.kind];
}
const glyphs=freeze({
 crescent:[arc(12,10,-Math.PI/2,Math.PI/2),[[0,-4],[-7,1],[-7,11],[0,16]]],
 split_beam:[[[0,16],[0,5],[-12,-4]],[[0,5],[12,-4]],[[-4,14],[-4,7]],[[4,14],[4,7]]],
 ember:[[[0,-5],[11,8],[0,17],[-11,8],[0,-5]],[[-4,8],[0,2],[4,8],[0,12],[-4,8]]],
});
export const tombGlyphLines=(glyph,id)=>isTombScene(id)&&Object.hasOwn(glyphs,glyph)?glyphs[glyph]:null;
export const TOMB_MARK_STYLE=freeze({color:'#c6d9e0',outline:'#14192a',offsetY:15,width:1.5,outlineWidth:3.5,alpha:.85});
export const WARD_LINES=freeze([[[-17,1],[-11,-5],[-5,1],[-11,7],[-17,1]],[[-14,1],[-8,1]]]);
