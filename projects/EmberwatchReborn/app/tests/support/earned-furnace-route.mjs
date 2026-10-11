// SCRIPTED PRODUCTION SETTLEMENT ROUTE, NOT combat simulation or browser play.
// All XP, levels, training, flags, tools and reward receipts come from real
// runtime commands. Positions and enemy-defeat reports are test fixtures.
import {earnedPassRoute} from './earned-pass-route.mjs';
import {report,run,travel,settle} from './earned-route.mjs';
import {SIGNAL_REGIONS,SIGNAL_GROUPS,SIGNAL_ROUTES} from '../../src/signal-content.js';
import {FURNACE_REGIONS,FURNACE_GROUPS} from '../../src/furnace-content.js';
const cache=new Map();
export function earnedFurnaceRoute(difficulty='normal',{full=false,mode='cover',direction='west',shortcut=true}={}){
 const key=JSON.stringify([difficulty,full,mode,direction,shortcut]);if(cache.has(key))return structuredClone(cache.get(key));
 let state=earnedPassRoute(difficulty,{full,shortcut}),smith={x:250,y:470};
 state=run(state,{type:'acceptSignalQuest',...report(state,smith)}).state;state=travel(state,'town-signal-entry');
 const signal=id=>{state=run(state,{type:'interactSignal',objectId:id,...report(state,SIGNAL_REGIONS.signal_basin.objects.find(o=>o.id===id))}).state;};
 state=settle(state,SIGNAL_GROUPS.entry);signal('signal-code');
 for(const node of SIGNAL_ROUTES[direction].order)signal('signal-route-'+node);
 state=settle(state,SIGNAL_GROUPS.yard);signal('signal-transmitter');state=settle(state,SIGNAL_GROUPS.receiver);signal('signal-receiver');
 state=travel(state,'signal-town-return');state=run(state,{type:'reportSignalQuest',...report(state,smith)}).state;
 state=run(state,{type:'acceptFurnaceQuest',...report(state,smith)}).state;state=travel(state,'town-furnace-entry');
 const furnace=(id,choice)=>{state=run(state,{type:'interactFurnace',objectId:id,...report(state,FURNACE_REGIONS.ember_furnace.objects.find(o=>o.id===id)),...(choice===undefined?{}:{choice})}).state;};
 state=settle(state,FURNACE_GROUPS.cooling);furnace('furnace-cooling',mode);if(shortcut)furnace('furnace-shortcut');
 state=settle(state,FURNACE_GROUPS.exhaust);furnace('furnace-exhaust');state=settle(state,FURNACE_GROUPS.ignition);furnace('furnace-ignition');furnace('furnace-lens');
 state=travel(state,shortcut?'furnace-town-shortcut':'furnace-town-return');state=run(state,{type:'reportFurnaceQuest',...report(state,smith)}).state;
 cache.set(key,structuredClone(state));return state;
}
