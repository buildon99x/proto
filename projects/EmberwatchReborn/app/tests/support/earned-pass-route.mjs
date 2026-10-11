// SCRIPTED SETTLEMENT FIXTURE, NOT actual combat/AI or ordinary-input play.
// Every predecessor quest, purchase, travel and kill reward uses real runtime
// handlers. Coordinates/defeated reports are scripted; XP/levels/skills/flags
// are NEVER assigned. Consumers must retain this evidence distinction.
import {earnedQuarryRoute} from './earned-quarry-route.mjs';
import {report,run,travel,settle} from './earned-route.mjs';
import {PASS_REGIONS,PASS_GROUPS,PASS_SEQUENCE} from '../../src/pass-content.js';
export function earnedPassRoute(difficulty='normal',{full=false,shortcut=true}={}){
 let s=earnedQuarryRoute(difficulty,{full,shortcut});
 const elder={x:450,y:325},point=id=>PASS_REGIONS.ashwind_pass.objects.find(o=>o.id===id);
 s=run(s,{type:'acceptPassQuest',...report(s,elder)}).state;s=travel(s,'town-pass-entry');
 const interact=id=>{s=run(s,{type:'interactPass',objectId:id,...report(s,point(id))}).state;};
 s=settle(s,PASS_GROUPS.entry);interact('pass-clue');
 s=settle(s,PASS_GROUPS.rescue,point('pass-rescue'));interact('pass-rescue');
 if(shortcut)interact('pass-shortcut');
 s=settle(s,PASS_GROUPS.signal,point('pass-signal-wind'));
 for(const rune of PASS_SEQUENCE)interact('pass-signal-'+rune);
 s=travel(s,shortcut?'pass-town-shortcut':'pass-town-return');
 return run(s,{type:'reportPassQuest',...report(s,elder)}).state;
}
