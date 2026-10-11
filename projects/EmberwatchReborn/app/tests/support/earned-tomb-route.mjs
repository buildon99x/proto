// SCRIPTED PRODUCTION-HANDLER FIXTURE, NOT ordinary-input gameplay.
// No XP/level/item/flag injection: only positions and kill reports are scripted.
import {earnedFurnaceRoute} from './earned-furnace-route.mjs';
import {report,run,travel,settle} from './earned-route.mjs';
import {TOMB_REGIONS,TOMB_GROUPS} from '../../src/tomb-content.js';
import {tombInputRevision} from '../../src/tomb.js';
const cache=new Map();
export function earnedTombRoute(difficulty='normal',{full=false,mode='cover',shortcut=false,reportQuest=true}={}){
 const key=JSON.stringify([difficulty,full,mode,shortcut,reportQuest]);if(cache.has(key))return structuredClone(cache.get(key));
 let state=earnedFurnaceRoute(difficulty,{full,mode});
 const quest=type=>{state=run(state,{type,...report(state,{x:450,y:325}),expectedRevision:tombInputRevision(state)}).state;};
 const interact=id=>{const object=TOMB_REGIONS.signal_tomb.objects.find(o=>o.id===id);state=run(state,{type:'interactTomb',objectId:id,...report(state,object),expectedRevision:tombInputRevision(state),...(object.actionKind==='glyph'?{glyph:object.glyph,expectedStep:state.world.objectives.tomb_sequence_step}:{})}).state;};
 quest('acceptTombQuest');state=travel(state,'town-tomb-entry');state=settle(state,TOMB_GROUPS.entry);interact('tomb-projection');
 if(shortcut){interact('tomb-shortcut');state=travel(state,'tomb-town-shortcut');state=travel(state,'town-tomb-shortcut');}
 state=settle(state,TOMB_GROUPS.inscription);for(const id of ['tomb-glyph-crescent','tomb-glyph-split-beam','tomb-glyph-ember'])interact(id);
 interact('tomb-ward-origin');state=settle(state,TOMB_GROUPS.ward_lower);interact('tomb-ward-midpoint');state=settle(state,TOMB_GROUPS.ward_upper);interact('tomb-ward-final');
 state=settle(state,TOMB_GROUPS.boss);interact('tomb-oath');state=travel(state,shortcut?'tomb-town-shortcut':'tomb-boss-return');if(reportQuest)quest('reportTombQuest');
 cache.set(key,structuredClone(state));return state;
}
