// R7 authored Emberwatch Adept continuation. Map, combat and reward values are
// explicit port adjustments, not original Hammerwatch II measurements.
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const rect=(x,y,w,h)=>({x,y,w,h});
const object=(id,name,x,y,actionKind,extra={})=>({type:'pass',id,name,x,y,actionKind,...extra});
export const PASS_SEQUENCE=freeze(['wind','ember','stone']);
export const PASS_RUNE_NAMES=freeze({wind:'바람',ember:'불꽃',stone:'돌'});
export const PASS_GROUPS=freeze({
 entry:['pass-raider-1','pass-raider-2','pass-ranger-1','pass-ranger-2','pass-elite-1'],
 rescue:['pass-raider-3','pass-raider-4','pass-ranger-3','pass-ranger-4','pass-elite-2'],
 signal:['pass-raider-5','pass-raider-6','pass-ranger-5','pass-ranger-6','pass-elite-3'],
});
export const PASS_FOES=freeze({
 pass_raider:{name:'고갯길 추격병',hp:60,armor:2,speed:78,damage:9,range:48,windup:.85,recovery:.9,xp:35,gold:4,tier:'adept',style:'melee',
  patterns:[{id:'pass-raider-cut',shape:'cone',range:48,halfAngle:.7,damage:9,windup:.85,recovery:.9}]},
 pass_ranger:{name:'고갯길 신호 사수',hp:48,armor:0,speed:44,damage:9,range:260,windup:1.1,recovery:1.2,xp:40,gold:5,tier:'adept',style:'ranged',
  patterns:[{id:'pass-ranger-shot',shape:'line',range:260,width:16,speed:225,travelRange:420,damage:9,windup:1.1,recovery:1.2}]},
 pass_elite:{name:'잿바람 선봉장',hp:90,armor:12,speed:48,damage:14,range:90,windup:1.1,recovery:1.15,xp:50,gold:6,tier:'adept',style:'cleave',
  patterns:[{id:'pass-elite-ring',shape:'circle',range:84,radius:84,damage:14,windup:1.15,recovery:1.2},
   {id:'pass-elite-sweep',shape:'cone',range:100,halfAngle:.75,damage:14,windup:1,recovery:1.1}]},
});
export const PASS_REGIONS=freeze({
 ashwind_pass:{id:'ashwind_pass',name:'잿바람 고갯길',w:30,h:24,spawn:{x:80,y:688},
  // West clue terrace is remote from the eastern signals. The upper shelf has
  // two free routes around a solid 3x3 rock island; no paid gate or jump input.
  rooms:[rect(1,12,9,11),rect(2,7,3,6),rect(1,2,9,6),rect(9,18,5,3),rect(13,15,15,8),
   rect(23,11,3,5),rect(13,2,15,4),rect(13,9,15,3),rect(13,5,6,5),rect(22,5,6,5)],
  doors:[{...rect(11,18,1,3),unlockObjective:'pass_clue_read'},{...rect(23,13,3,1),unlockObjective:'pass_rescue_complete'}],npcs:[],
  portals:[{id:'pass-town-return',name:'고갯길 입구에서 마을로',x:80,y:704,to:'ash_hamlet',arrival:{x:144,y:320}},
   {id:'pass-town-shortcut',name:'구조 밧줄길로 마을 귀환',x:848,y:688,to:'ash_hamlet',arrival:{x:144,y:544},gate:'pass_shortcut'}],
  objects:[object('pass-clue','먼 서쪽의 신호 비문',240,112,'clue',{visualType:'relic'}),
   object('pass-rescue','고립된 길잡이 구조',848,528,'rescue',{visualType:'bird'}),
   object('pass-shortcut','귀환 밧줄길 연결',816,688,'shortcut',{visualType:'shrine',hideWhenCompleted:true}),
   object('pass-signal-wind','바람 신호 장치',464,112,'signal',{rune:'wind',visualType:'shrine'}),
   object('pass-signal-ember','불꽃 신호 장치',848,112,'signal',{rune:'ember',visualType:'shrine'}),
   object('pass-signal-stone','돌 신호 장치',464,336,'signal',{rune:'stone',visualType:'shrine'})],
  foes:[{id:PASS_GROUPS.entry[0],kind:'pass_raider',x:224,y:576,gate:'pass_accepted'},
   {id:PASS_GROUPS.entry[1],kind:'pass_raider',x:176,y:640,gate:'pass_accepted'},
   {id:PASS_GROUPS.entry[2],kind:'pass_ranger',x:240,y:496,gate:'pass_accepted'},
   {id:PASS_GROUPS.entry[3],kind:'pass_ranger',x:112,y:464,gate:'pass_accepted'},
   {id:PASS_GROUPS.entry[4],kind:'pass_elite',x:208,y:528,gate:'pass_accepted'},
   {id:PASS_GROUPS.rescue[0],kind:'pass_raider',x:496,y:640,gate:'pass_clue_read'},
   {id:PASS_GROUPS.rescue[1],kind:'pass_raider',x:656,y:592,gate:'pass_clue_read'},
   {id:PASS_GROUPS.rescue[2],kind:'pass_ranger',x:752,y:656,gate:'pass_clue_read'},
   {id:PASS_GROUPS.rescue[3],kind:'pass_ranger',x:816,y:576,gate:'pass_clue_read'},
   {id:PASS_GROUPS.rescue[4],kind:'pass_elite',x:624,y:688,gate:'pass_clue_read'},
   {id:PASS_GROUPS.signal[0],kind:'pass_raider',x:496,y:160,gate:'pass_rescue_complete'},
   {id:PASS_GROUPS.signal[1],kind:'pass_raider',x:752,y:336,gate:'pass_rescue_complete'},
   {id:PASS_GROUPS.signal[2],kind:'pass_ranger',x:560,y:272,gate:'pass_rescue_complete'},
   {id:PASS_GROUPS.signal[3],kind:'pass_ranger',x:816,y:176,gate:'pass_rescue_complete'},
   {id:PASS_GROUPS.signal[4],kind:'pass_elite',x:752,y:112,gate:'pass_rescue_complete'}],
 },
});
export const PASS_LINKS=freeze({ash_hamlet:[
 {id:'town-pass-entry',name:'잿바람 고갯길로',x:112,y:320,to:'ashwind_pass',arrival:{x:80,y:688},gate:'pass_entry'},
 {id:'town-pass-shortcut',name:'고갯길 구조 밧줄길',x:112,y:544,to:'ashwind_pass',arrival:{x:848,y:688},gate:'pass_shortcut'},
]});
export const PASS_REWARDS=freeze({
 'r7:p:clue':{xp:80,gold:10,materials:{},consumables:{}},
 'r7:p:rescue':{xp:90,gold:20,materials:{},consumables:{}},
 'r7:p:align':{xp:130,gold:40,materials:{iron:3,wood:3,thread:2,ember_shard:1},consumables:{health_potion:1}},
 'r7:p:report':{xp:90,gold:60,materials:{},consumables:{}},
});
export const PASS_PROGRESS_DEFAULTS=freeze({pass_accepted:1,pass_clue_read:0,pass_rescue_complete:0,pass_signal_step:0,pass_signal_aligned:0,pass_shortcut_open:0,pass_reported:0});
export const PASS_RECEIPTS=freeze(['r7:p:accept','r7:p:clue','r7:p:rescue','r7:p:align','r7:p:shortcut','r7:p:report']);
export const PASS_TOOLS=freeze({pass_rune_note:{name:'신호 비문 사본 · 바람 → 불꽃 → 돌',consumed:false}});
