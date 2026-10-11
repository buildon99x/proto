// Legal reducer settlement fixture, NOT normal-input play. Positions/kill
// reports are scripted; XP, level, resources and flags are never injected.
import {route,report,run,travel,settle} from './earned-route.mjs';
import {QUARRY_REGIONS,QUARRY_GROUPS} from '../../src/quarry-content.js';
import {emptyRecovery} from '../../src/recovery.js';
export function earnedQuarryRoute(difficulty='normal',{full=true,shortcut=true}={}){
 let s=route(difficulty,full,full).state;
 s=run(s,{type:'promoteAdept',...report(s,{x:260,y:325}),recovery:s.recovery??emptyRecovery()}).state;
 s=run(s,{type:'acceptQuarryQuest',...report(s,{x:450,y:325})}).state;
 s=travel(s,'town-quarry-entry');
 const point=id=>QUARRY_REGIONS.ember_quarry.objects.find(o=>o.id===id);
 const interact=id=>{s=run(s,{type:'interactQuarry',objectId:id,...report(s,point(id))}).state;};
 s=settle(s,QUARRY_GROUPS.entry);interact('quarry-tool');
 s=settle(s,QUARRY_GROUPS.rescue,point('quarry-rescue'));interact('quarry-rescue');
 if(shortcut)interact('quarry-shortcut');
 s=settle(s,QUARRY_GROUPS.winch,point('quarry-winch'));
 interact('quarry-anchor-a');interact('quarry-anchor-b');interact('quarry-winch');
 s=travel(s,shortcut?'quarry-town-lift':'quarry-town-return');
 return run(s,{type:'reportQuarryQuest',...report(s,{x:450,y:325})}).state;
}
