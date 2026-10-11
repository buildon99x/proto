// S-region: authored Emberwatch Reborn content, not original game measurements
// or restoration of lost source. All map, enemy, economy and timing values here
// are deliberate reimplementation tuning; no idle defence timer is involved.
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const rect=(x,y,w,h)=>({x,y,w,h});
const object=(id,name,x,y,actionKind,extra={})=>({type:'signal',id,name,x,y,actionKind,...extra});
export const SIGNAL_REGION='signal_basin';
export const SIGNAL_ROUTES=freeze({
 west:{value:1,first:1,order:['transmitter','receiver'],name:'서쪽 접근로',receipt:'r8:s:route-west'},
 east:{value:2,first:2,order:['receiver','transmitter'],name:'동쪽 접근로',receipt:'r8:s:route-east'},
});
export const SIGNAL_NODE_NAMES=freeze({transmitter:'송신',receiver:'수신'});
export const SIGNAL_GROUPS=freeze({
 entry:['signal-runner-1','signal-runner-2','signal-runner-3','signal-archer-1','signal-archer-2','signal-archer-3'],
 yard:['signal-runner-4','signal-runner-5','signal-runner-6','signal-archer-4','signal-archer-5','signal-archer-6'],
 receiver:['signal-keeper-1','signal-keeper-2','signal-keeper-3','signal-keeper-4'],
});
export const SIGNAL_FOES=freeze({
 signal_runner:{name:'중계소 돌격병',hp:58,armor:2,speed:88,damage:10,range:58,windup:.85,recovery:.85,xp:40,gold:5,tier:'adept',style:'melee',
  patterns:[{id:'signal-runner-thrust',shape:'cone',range:70,halfAngle:.32,damage:11,windup:.95,recovery:.8},
   {id:'signal-runner-cut',shape:'cone',range:48,halfAngle:.9,damage:8,windup:.65,recovery:.95}]},
 signal_archer:{name:'중계소 조준수',hp:44,armor:0,speed:36,damage:9,range:255,windup:1.2,recovery:1.25,xp:40,gold:5,tier:'adept',style:'ranged',
  patterns:[{id:'signal-archer-line',shape:'line',range:255,width:14,speed:230,travelRange:390,damage:9,windup:1.2,recovery:1.25}]},
 signal_keeper:{name:'수신탑 파수병',hp:82,armor:10,speed:43,damage:12,range:92,windup:1.05,recovery:1.15,xp:60,gold:8,tier:'adept',style:'cleave',
  patterns:[{id:'signal-keeper-stab',shape:'cone',range:112,halfAngle:.3,damage:13,windup:1.1,recovery:1},
   {id:'signal-keeper-sweep',shape:'cone',range:68,halfAngle:1.3,damage:11,windup:.9,recovery:1.2}]},
});
export const SIGNAL_REGIONS=freeze({
 signal_basin:{id:SIGNAL_REGION,name:'잿불 신호 분지',w:26,h:23,spawn:{x:112,y:656},
  // 26x23 compact basin. Solid centre breaks long aiming lines. Order opens
  // exactly one approach; both reach the SAME yard and rewards, with no warp.
  rooms:[rect(2,16,22,6),rect(3,10,3,7),rect(5,12,4,3),rect(20,10,3,7),rect(17,12,5,3),
   rect(7,6,12,3),rect(7,12,12,3),rect(7,9,4,3),rect(15,9,4,3),rect(11,4,4,3),rect(6,1,15,4)],
  doors:[{...rect(3,15,3,1),unlockObjective:'signal_west_open'},
   {...rect(20,15,3,1),unlockObjective:'signal_east_open'},
   {...rect(11,5,4,1),unlockObjective:'signal_transmitter_restored'}],npcs:[],
  portals:[{id:'signal-town-return',name:'분지 입구에서 마을로',x:112,y:672,to:'ash_hamlet',arrival:{x:144,y:448}},
   {id:'signal-town-shortcut',name:'중계 승강기로 마을 귀환',x:720,y:656,to:'ash_hamlet',arrival:{x:144,y:592},gate:'signal_shortcut'}],
  objects:[object('signal-code','고갯길 신호 해독판',432,560,'decode',{visualType:'relic'}),
   object('signal-route-transmitter','접근로 선택 · 송신 레버',400,624,'route',{node:'transmitter',visualType:'shrine'}),
   object('signal-route-receiver','접근로 선택 · 수신 레버',464,624,'route',{node:'receiver',visualType:'shrine'}),
   object('signal-transmitter','분지 송신기 복원',432,432,'transmitter',{visualType:'shrine'}),
   object('signal-receiver','북쪽 수신기 복원',432,144,'receiver',{visualType:'shrine'}),
   object('signal-shortcut','중계 승강기 연결',656,608,'shortcut',{visualType:'shrine',hideWhenCompleted:true})],
  foes:[{id:SIGNAL_GROUPS.entry[0],kind:'signal_runner',x:224,y:592,gate:'signal_accepted'},
   {id:SIGNAL_GROUPS.entry[1],kind:'signal_runner',x:352,y:656,gate:'signal_accepted'},
   {id:SIGNAL_GROUPS.entry[2],kind:'signal_runner',x:544,y:592,gate:'signal_accepted'},
   {id:SIGNAL_GROUPS.entry[3],kind:'signal_archer',x:288,y:544,gate:'signal_accepted'},
   {id:SIGNAL_GROUPS.entry[4],kind:'signal_archer',x:592,y:672,gate:'signal_accepted'},
   {id:SIGNAL_GROUPS.entry[5],kind:'signal_archer',x:688,y:560,gate:'signal_accepted'},
   {id:SIGNAL_GROUPS.yard[0],kind:'signal_runner',x:272,y:432,gate:'signal_route_ready'},
   {id:SIGNAL_GROUPS.yard[1],kind:'signal_runner',x:560,y:432,gate:'signal_route_ready'},
   {id:SIGNAL_GROUPS.yard[2],kind:'signal_runner',x:304,y:272,gate:'signal_route_ready'},
   {id:SIGNAL_GROUPS.yard[3],kind:'signal_archer',x:528,y:240,gate:'signal_route_ready'},
   {id:SIGNAL_GROUPS.yard[4],kind:'signal_archer',x:304,y:336,gate:'signal_route_ready'},
   {id:SIGNAL_GROUPS.yard[5],kind:'signal_archer',x:560,y:336,gate:'signal_route_ready'},
   {id:SIGNAL_GROUPS.receiver[0],kind:'signal_keeper',x:240,y:80,gate:'signal_transmitter_restored'},
   {id:SIGNAL_GROUPS.receiver[1],kind:'signal_keeper',x:336,y:112,gate:'signal_transmitter_restored'},
   {id:SIGNAL_GROUPS.receiver[2],kind:'signal_keeper',x:528,y:80,gate:'signal_transmitter_restored'},
   {id:SIGNAL_GROUPS.receiver[3],kind:'signal_keeper',x:624,y:112,gate:'signal_transmitter_restored'}],
 },
});
export const SIGNAL_LINKS=freeze({ash_hamlet:[
 {id:'town-signal-entry',name:'잿불 신호 분지로',x:112,y:448,to:SIGNAL_REGION,arrival:{x:112,y:656},gate:'signal_entry'},
 {id:'town-signal-shortcut',name:'신호 분지 중계 승강기',x:112,y:592,to:SIGNAL_REGION,arrival:{x:720,y:656},gate:'signal_shortcut'},
]});
export const SIGNAL_REWARDS=freeze({
 'r8:s:decode':{xp:100,gold:10,materials:{},consumables:{}},
 'r8:s:transmitter':{xp:110,gold:30,materials:{},consumables:{}},
 'r8:s:receiver':{xp:120,gold:40,materials:{iron:4,wood:1,thread:3,ember_shard:1},consumables:{health_potion:1}},
 'r8:s:report':{xp:90,gold:60,materials:{},consumables:{}},
});
export const SIGNAL_PROGRESS_DEFAULTS=freeze({signal_accepted:1,signal_decoded:0,signal_route_step:0,signal_route_first:0,
 signal_route_ready:0,signal_west_open:0,signal_east_open:0,signal_transmitter_restored:0,signal_receiver_restored:0,signal_shortcut_open:0,signal_reported:0});
export const SIGNAL_RECEIPTS=freeze(['r8:s:accept','r8:s:decode','r8:s:route-west','r8:s:route-east','r8:s:transmitter','r8:s:receiver','r8:s:shortcut','r8:s:report']);
export const SIGNAL_TOOLS=freeze({signal_cipher:{name:'중계 해독판 · 송신→수신 서쪽 / 수신→송신 동쪽',consumed:false}});
