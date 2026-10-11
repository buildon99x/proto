// R9 Furnace is authored Emberwatch Reborn content, not an original-game map
// or measured balance. Reference tiers/XP multipliers remain in progression.js.
// Mechanical repair is free; there is no timer, material bypass or heat damage.
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const rect=(x,y,w,h)=>({x,y,w,h});
const object=(id,name,x,y,actionKind,extra={})=>({type:'furnace',id,name,x,y,actionKind,...extra});
export const FURNACE_REGION='ember_furnace';
export const FURNACE_MODES=freeze({
 cover:{value:1,name:'엄폐판 유지',detail:'양쪽 우회로가 열리고 중앙 엄폐판은 남습니다. 선택은 되돌릴 수 없으며 보상은 같습니다.'},
 channel:{value:2,name:'중앙 통로 개방',detail:'양쪽 우회로와 중앙 통로가 열립니다. 선택은 되돌릴 수 없으며 보상은 같습니다.'},
});
export const FURNACE_GROUPS=freeze({
 cooling:['furnace-tender-1','furnace-tender-2','furnace-nozzle-1','furnace-nozzle-2','furnace-warden-1'],
 exhaust:['furnace-tender-3','furnace-tender-4','furnace-nozzle-3','furnace-nozzle-4','furnace-warden-2','furnace-warden-3'],
 ignition:['furnace-tender-5','furnace-tender-6','furnace-nozzle-5','furnace-nozzle-6','furnace-warden-4','furnace-warden-5'],
});
export const FURNACE_FOES=freeze({
 furnace_tender:{name:'용광로 화부',hp:54,armor:2,speed:82,damage:9,range:56,windup:.8,recovery:.85,xp:40,gold:5,tier:'adept',style:'melee',fireAreaEscape:true,
  patterns:[{id:'furnace-tender-cut',shape:'cone',range:56,halfAngle:.65,damage:9,windup:.8,recovery:.85}]},
 furnace_nozzle:{name:'슬래그 사수',hp:44,armor:0,speed:40,damage:9,range:240,windup:1.2,recovery:1.25,xp:50,gold:6,tier:'adept',style:'ranged',
  patterns:[{id:'furnace-nozzle-line',shape:'line',range:240,width:14,speed:220,travelRange:360,damage:9,windup:1.2,recovery:1.25}]},
 furnace_warden:{name:'용광로 파수병',hp:82,armor:10,speed:43,damage:13,range:112,windup:1.1,recovery:1,xp:60,gold:8,tier:'adept',style:'cleave',
  patterns:[{id:'furnace-warden-thrust',shape:'cone',range:112,halfAngle:.3,damage:13,windup:1.1,recovery:1},
   {id:'furnace-warden-sweep',shape:'cone',range:68,halfAngle:1.3,damage:11,windup:.9,recovery:1.2}]},
});
const foe=(group,index,kind,x,y,gate)=>({id:FURNACE_GROUPS[group][index],kind,x,y,gate});
export const FURNACE_REGIONS=freeze({
 ember_furnace:{id:FURNACE_REGION,name:'잿불 용광로',w:24,h:20,spawn:{x:112,y:560},
  // Both side flanks open together. Retained center cover blocks friendly and
  // hostile shots alike; exhaust opens the entire rear cross-aisle at once.
  rooms:[rect(2,14,20,1),rect(2,15,6,2),rect(10,15,4,2),rect(16,15,6,2),rect(2,17,20,1),
   rect(2,4,5,11),rect(17,4,5,11),rect(5,8,14,3),rect(10,10,4,5),rect(10,4,4,5),
   rect(2,2,20,1),rect(2,3,5,2),rect(9,3,6,2),rect(17,3,5,2),rect(2,5,20,1)],
  doors:[{...rect(2,13,5,1),unlockObjective:'furnace_cooled'},
   {...rect(17,13,5,1),unlockObjective:'furnace_cooled'},
   {...rect(10,11,4,3),unlockObjective:'furnace_center_open'},
   {...rect(2,5,20,1),unlockObjective:'furnace_exhausted'},
   {...rect(10,6,4,2),unlockObjective:'furnace_exhausted'}],npcs:[],
  portals:[{id:'furnace-town-return',name:'용광로 입구에서 마을로',x:112,y:560,to:'ash_hamlet',arrival:{x:352,y:544}},
   {id:'furnace-town-shortcut',name:'화물 승강기로 마을 귀환',x:656,y:496,to:'ash_hamlet',arrival:{x:528,y:576},gate:'furnace_shortcut'}],
  objects:[object('furnace-cooling','냉각 장치 · 엄폐판 선택',560,560,'cooling',{visualType:'shrine'}),
   object('furnace-exhaust','작업 고리 배기 장치',368,304,'exhaust',{visualType:'shrine'}),
   object('furnace-ignition','북쪽 점화 장치',368,80,'ignition',{visualType:'shrine'}),
   object('furnace-lens','용광로 렌즈 회수',656,112,'lens',{visualType:'relic'}),
   object('furnace-shortcut','화물 승강기 연결',656,560,'shortcut',{visualType:'shrine',hideWhenCompleted:true})],
  foes:[foe('cooling',0,'furnace_tender',240,464,'furnace_accepted'),foe('cooling',1,'furnace_tender',560,528,'furnace_accepted'),
   foe('cooling',2,'furnace_nozzle',400,464,'furnace_accepted'),foe('cooling',3,'furnace_nozzle',656,464,'furnace_accepted'),
   foe('cooling',4,'furnace_warden',368,528,'furnace_accepted'),
   foe('exhaust',0,'furnace_tender',176,368,'furnace_cooled'),foe('exhaust',1,'furnace_tender',592,368,'furnace_cooled'),
   foe('exhaust',2,'furnace_nozzle',272,304,'furnace_cooled'),foe('exhaust',3,'furnace_nozzle',496,304,'furnace_cooled'),
   foe('exhaust',4,'furnace_warden',208,240,'furnace_cooled'),foe('exhaust',5,'furnace_warden',560,240,'furnace_cooled'),
   foe('ignition',0,'furnace_tender',176,112,'furnace_exhausted'),foe('ignition',1,'furnace_tender',592,112,'furnace_exhausted'),
   foe('ignition',2,'furnace_nozzle',304,80,'furnace_exhausted'),foe('ignition',3,'furnace_nozzle',624,80,'furnace_exhausted'),
   foe('ignition',4,'furnace_warden',368,144,'furnace_exhausted'),foe('ignition',5,'furnace_warden',560,144,'furnace_exhausted')],
 },
});
export const FURNACE_LINKS=freeze({ash_hamlet:[
 {id:'town-furnace-entry',name:'잿불 용광로로',x:352,y:560,to:FURNACE_REGION,arrival:{x:112,y:560},gate:'furnace_entry'},
 {id:'town-furnace-shortcut',name:'용광로 화물 승강기',x:528,y:560,to:FURNACE_REGION,arrival:{x:656,y:512},gate:'furnace_shortcut'},
]});
export const FURNACE_REWARDS=freeze({
 'r9:f:cooling':{xp:100,gold:10,materials:{},consumables:{}},
 'r9:f:exhaust':{xp:120,gold:30,materials:{},consumables:{}},
 'r9:f:ignition':{xp:140,gold:50,materials:{iron:5,wood:2,thread:2,ember_shard:2},consumables:{health_potion:1}},
 'r9:f:report':{xp:90,gold:60,materials:{},consumables:{}},
});
export const FURNACE_PROGRESS_DEFAULTS=freeze({furnace_accepted:1,furnace_cooled:0,furnace_mode:0,furnace_center_open:0,
 furnace_exhausted:0,furnace_ignited:0,furnace_lens_taken:0,furnace_shortcut_open:0,furnace_reported:0});
export const FURNACE_RECEIPTS=freeze(['r9:f:accept','r9:f:cooling','r9:f:exhaust','r9:f:ignition','r9:f:lens','r9:f:shortcut','r9:f:report']);
export const FURNACE_TOOLS=freeze({furnace_lens:{name:'용광로 렌즈 · 비소모 회수물',consumed:false}});
