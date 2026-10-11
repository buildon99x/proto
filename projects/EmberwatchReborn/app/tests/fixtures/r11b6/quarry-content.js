// R6a authored Emberwatch quarry slice. Geometry, combat tuning, rewards and
// puzzle rules are Emberwatch values, not Hammerwatch II measurements.
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const rect=(x,y,w,h)=>({x,y,w,h});
const object=(id,name,x,y,actionKind,extra={})=>({type:'quarry',id,name,x,y,actionKind,...extra});
export const QUARRY_GROUPS=freeze({
 entry:['quarry-raider-1','quarry-raider-2','quarry-slinger-1','quarry-guard-1'],
 rescue:['quarry-raider-3','quarry-slinger-2','quarry-slinger-3','quarry-guard-2'],
 winch:['quarry-raider-4','quarry-slinger-4','quarry-guard-3','quarry-guard-4'],
});
export const QUARRY_FOES=freeze({
 quarry_raider:{name:'채석장 쇄도병',hp:58,armor:2,speed:76,damage:9,range:48,windup:.78,recovery:.85,xp:35,gold:4,tier:'adept',style:'melee',
  patterns:[{id:'quarry-raider-cut',shape:'cone',range:48,halfAngle:.75,damage:9,windup:.78,recovery:.85}]},
 quarry_slinger:{name:'채석장 투석수',hp:44,armor:0,speed:44,damage:8,range:250,windup:1.05,recovery:1.2,xp:35,gold:4,tier:'adept',style:'ranged',
  patterns:[{id:'quarry-slinger-shot',shape:'line',range:250,width:16,speed:220,travelRange:420,damage:8,windup:1.05,recovery:1.2}]},
 quarry_guard:{name:'채석장 장갑 파수꾼',hp:92,armor:18,speed:44,damage:13,range:80,windup:1.05,recovery:1.2,xp:50,gold:6,tier:'adept',style:'cleave',
  patterns:[{id:'quarry-guard-thrust',shape:'cone',range:70,halfAngle:.45,damage:14,windup:.95,recovery:1},{id:'quarry-guard-sweep',shape:'cone',range:85,halfAngle:1.15,damage:11,windup:1.2,recovery:1.25}]},
});
export const QUARRY_REGIONS=freeze({
 ember_quarry:{id:'ember_quarry',name:'잿불 채석장',w:28,h:22,spawn:{x:80,y:624},
  rooms:[rect(1,14,9,7),rect(9,16,4,3),rect(12,12,10,8),rect(16,9,3,4),rect(12,1,13,9)],
  doors:[{...rect(10,16,1,3),unlockObjective:'quarry_tool_found'},{...rect(16,10,3,1),unlockObjective:'quarry_rescue_complete'}],npcs:[],
  portals:[{id:'quarry-town-return',name:'채석장 입구에서 마을로',x:80,y:640,to:'ash_hamlet',arrival:{x:592,y:280}},
   {id:'quarry-town-lift',name:'운반 승강기로 마을 귀환',x:656,y:608,to:'ash_hamlet',arrival:{x:600,y:544},gate:'quarry_shortcut'}],
  objects:[object('quarry-tool','걸린 채석 곡괭이',272,624,'tool',{visualType:'relic'}),
   object('quarry-rescue','매몰 광부 구조',656,416,'rescue',{visualType:'bird'}),
   object('quarry-anchor-a','서쪽 운반 닻',432,80,'anchor',{anchor:'a',visualType:'shrine'}),
   object('quarry-anchor-b','동쪽 운반 닻',752,288,'anchor',{anchor:'b',visualType:'shrine'}),
   object('quarry-winch','멈춘 광석 운반기',752,80,'winch',{visualType:'barrel'}),
   object('quarry-shortcut','귀환 승강기 체인',656,608,'shortcut',{visualType:'shrine',hideWhenCompleted:true})],
  foes:[{id:QUARRY_GROUPS.entry[0],kind:'quarry_raider',x:240,y:544,gate:'quarry_accepted'},
   {id:QUARRY_GROUPS.entry[1],kind:'quarry_raider',x:272,y:592,gate:'quarry_accepted'},
   {id:QUARRY_GROUPS.entry[2],kind:'quarry_slinger',x:280,y:488,gate:'quarry_accepted'},
   {id:QUARRY_GROUPS.entry[3],kind:'quarry_guard',x:184,y:496,gate:'quarry_accepted'},
   {id:QUARRY_GROUPS.rescue[0],kind:'quarry_raider',x:464,y:512,gate:'quarry_tool_found'},
   {id:QUARRY_GROUPS.rescue[1],kind:'quarry_slinger',x:560,y:480,gate:'quarry_tool_found'},
   {id:QUARRY_GROUPS.rescue[2],kind:'quarry_slinger',x:640,y:544,gate:'quarry_tool_found'},
   {id:QUARRY_GROUPS.rescue[3],kind:'quarry_guard',x:592,y:608,gate:'quarry_tool_found'},
   {id:QUARRY_GROUPS.winch[0],kind:'quarry_raider',x:496,y:256,gate:'quarry_rescue_complete'},
   {id:QUARRY_GROUPS.winch[1],kind:'quarry_slinger',x:672,y:240,gate:'quarry_rescue_complete'},
   {id:QUARRY_GROUPS.winch[2],kind:'quarry_guard',x:592,y:144,gate:'quarry_rescue_complete'},
   {id:QUARRY_GROUPS.winch[3],kind:'quarry_guard',x:704,y:96,gate:'quarry_rescue_complete'}],
 },
});
export const QUARRY_LINKS=freeze({ash_hamlet:[
 {id:'town-quarry-entry',name:'잿불 채석장으로',x:620,y:300,to:'ember_quarry',arrival:{x:80,y:624},gate:'quarry_entry'},
 {id:'town-quarry-lift',name:'채석장 구조 구역 승강기',x:620,y:560,to:'ember_quarry',arrival:{x:656,y:624},gate:'quarry_shortcut'},
]});
export const QUARRY_REWARDS=freeze({
 'r6:q:tool':{xp:60,gold:0,materials:{},consumables:{}},
 'r6:q:rescue':{xp:90,gold:20,materials:{},consumables:{}},
 'r6:q:winch':{xp:120,gold:40,materials:{iron:4,wood:2,thread:2},consumables:{health_potion:1}},
 'r6:q:report':{xp:90,gold:60,materials:{},consumables:{}},
});
export const QUARRY_PROGRESS_DEFAULTS=freeze({quarry_accepted:1,quarry_tool_found:0,quarry_rescue_complete:0,quarry_anchor_a:0,quarry_anchor_b:0,quarry_winch_repaired:0,quarry_shortcut_open:0,quarry_reported:0});
export const QUARRY_RECEIPTS=freeze(['r6:q:accept','r6:q:tool','r6:q:rescue','r6:q:anchor-a','r6:q:anchor-b','r6:q:winch','r6:q:shortcut','r6:q:report']);
export const QUARRY_TOOLS=freeze({quarry_pick:{name:'채석 곡괭이',consumed:false}});
