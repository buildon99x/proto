// R11 authored Emberwatch content. No original map, enemy/status taxonomy,
// reward or timing value is known. Earlier Tomb foes are deliberately unchanged.
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const rect=(x,y,w,h)=>({x,y,w,h});
export const BATTLEFIELD_REGION='beacon_battlefield';
export const BATTLEFIELD_GROUPS=freeze({
 west:['battlefield-revenant-1','battlefield-revenant-2','battlefield-hexer-1','battlefield-pyromancer-1','battlefield-lancer-1','battlefield-bulwark-1'],
 east:['battlefield-revenant-3','battlefield-hexer-2','battlefield-binder-1','battlefield-lancer-2','battlefield-lancer-3','battlefield-bulwark-2'],
 boss:['battlefield-usurper'],
});
const roleMovement=(triggerRange,distance,seconds,afterFirstAttack=false)=>({triggerRange,distance,seconds,afterFirstAttack,interval:6,tether:80});
const foe=(name,hp,armor,speed,style,roleGlyph,tags,attackFamily,pattern,extra={})=>({name,hp,armor,speed,style,roleGlyph,tags,attackFamily,tier:'expert',xp:90,gold:9,damage:pattern.damage,range:pattern.range,windup:pattern.windup,recovery:pattern.recovery,patterns:[pattern],fireAreaEscape:true,...(style==='ranged'?{battlefieldRoleMovement:roleMovement(176,48,1.5)}:{}),...extra});
const line=(id,damage,damageType,statusRuleIds)=>({id,shape:'line',range:256,width:16,speed:205,travelRange:352,damage,damageType,attackFamily:'spell',statusRuleIds,windup:1.15,recovery:1.25});
export const BATTLEFIELD_FOES=freeze({
 battlefield_revenant:foe('망자 검병 · 무장해제',58,3,64,'melee','wedge',['undead'],'weapon',{id:'battlefield-revenant-cut',shape:'cone',range:64,halfAngle:.6,damage:9,damageType:'physical',attackFamily:'weapon',statusRuleIds:['r11_disarm'],windup:.85,recovery:1}),
 battlefield_hexer:foe('망자 독술사 · 독',44,0,35,'ranged','slit',['undead'],'spell',line('battlefield-hexer-poison',6,'poison',['r11_poison'])),
 battlefield_pyromancer:foe('화염술사 · 화상',46,0,35,'ranged','forked-arrow',['living'],'spell',line('battlefield-pyromancer-burn',7,'fire',['r11_burn'])),
 battlefield_lancer:foe('고삐 창병 · 둔화',62,4,60,'melee','split-shaft',['living'],'weapon',{id:'battlefield-lancer-thrust',shape:'cone',range:92,halfAngle:.28,damage:10,damageType:'physical',attackFamily:'weapon',statusRuleIds:['r11_slow'],windup:.95,recovery:1.15},{battlefieldRoleMovement:roleMovement(148,32,.6)}),
 battlefield_binder:foe('봉화 봉쇄술사 · 침묵',44,0,32,'ranged','slit',['living'],'spell',line('battlefield-binder-silence',6,'lightning',['r11_silence'])),
 battlefield_bulwark:foe('망자 방패병 · 짧은 기절',78,10,38,'cleave','segmented-circle',['undead'],'weapon',{id:'battlefield-bulwark-slam',shape:'circle',range:64,radius:64,damage:10,damageType:'physical',attackFamily:'weapon',statusRuleIds:['r11_stun'],windup:1.3,recovery:1.35}),
 battlefield_usurper:foe('봉화 탈취자 · 검격과 화염',200,6,42,'cleave','broken-ring',['living'],'spell',
  {id:'battlefield-usurper-fireline',shape:'line',range:280,width:24,speed:220,travelRange:352,damage:13,damageType:'fire',attackFamily:'spell',statusRuleIds:['r11_burn'],windup:1.25,recovery:1.55},
  {role:'boss',xp:240,gold:48,battlefieldRoleMovement:roleMovement(160,48,1.2,true),patterns:[
   {id:'battlefield-usurper-fireline',shape:'line',range:280,width:24,speed:220,travelRange:352,damage:13,damageType:'fire',attackFamily:'spell',statusRuleIds:['r11_burn'],windup:1.25,recovery:1.55},
   {id:'battlefield-usurper-sweep',shape:'cone',range:100,halfAngle:1.15,damage:15,damageType:'physical',attackFamily:'weapon',statusRuleIds:[],windup:1.1,recovery:1.5},
  ]}),
});
const encounter=(group,index,kind,x,y)=>({id:BATTLEFIELD_GROUPS[group][index],kind,x,y,gate:group==='boss'?'battlefield_devices_ready':'battlefield_accepted'});
const object=(id,name,x,y,actionKind)=>({id,name,x,y,actionKind,type:'battlefield',visualType:actionKind==='beacon'?'relic':'shrine',hideWhenCompleted:actionKind==='beacon'});
export const BATTLEFIELD_REGIONS=freeze({
 [BATTLEFIELD_REGION]:{id:BATTLEFIELD_REGION,name:'갈라진 봉화 전장',w:30,h:26,spawn:{x:480,y:752},npcs:[],
  // Independent yards share a short safe southern approach. The central
  // northern lane is physically closed until BOTH devices are operated.
  rooms:[rect(12,19,6,6),rect(2,20,26,2),
   rect(2,10,10,4),rect(2,14,4,3),rect(8,14,4,3),rect(2,17,10,3),
   rect(18,10,10,10),rect(13,8,4,11),rect(9,2,12,6)],
  doors:[{...rect(13,8,4,11),unlockObjective:'battlefield_devices_ready'}],
  portals:[{id:'battlefield-town-return',name:'전장 입구에서 마을로',x:480,y:784,to:'ash_hamlet',arrival:{x:336,y:160}},
   {id:'battlefield-boss-return',name:'봉화 단상에서 에다에게',x:592,y:112,to:'ash_hamlet',arrival:{x:448,y:208},gate:'battlefield_boss_return'}],
  objects:[object('battlefield-west-device','서쪽 방벽 중계기',112,368,'west'),object('battlefield-east-device','동쪽 조준 중계기',848,368,'east'),object('battlefield-beacon','회수할 봉화핵',480,80,'beacon')],
  foes:[encounter('west',0,'battlefield_revenant',112,592),encounter('west',1,'battlefield_revenant',240,560),encounter('west',2,'battlefield_hexer',80,400),encounter('west',3,'battlefield_pyromancer',336,400),encounter('west',4,'battlefield_lancer',336,464),encounter('west',5,'battlefield_bulwark',240,368),
   // Keep the short open channel lane and every map tile/save position. The
   // lancers begin on separate flanks; low-HP frontliners can still be cleaved.
   encounter('east',0,'battlefield_revenant',720,560),encounter('east',1,'battlefield_hexer',848,464),encounter('east',2,'battlefield_binder',592,400),encounter('east',3,'battlefield_lancer',624,496),encounter('east',4,'battlefield_lancer',816,400),encounter('east',5,'battlefield_bulwark',816,560),
   encounter('boss',0,'battlefield_usurper',480,176)],
 },
});
// Town's northern open floor keeps B's 76-unit reach clear of older gates.
// Only B's entry/ordinary return move; stored town positions remain valid.
export const BATTLEFIELD_LINKS=freeze({ash_hamlet:[{id:'town-battlefield-entry',name:'갈라진 봉화 전장으로',x:304,y:104,to:BATTLEFIELD_REGION,arrival:{x:480,y:752},gate:'battlefield_entry'}]});
export const BATTLEFIELD_REWARDS=freeze({
 'r11:b:west':{xp:280,gold:35,materials:{iron:3,wood:2},consumables:{health_potion:1}},
 'r11:b:east':{xp:280,gold:35,materials:{thread:4,ember_shard:2},consumables:{health_potion:1}},
 'r11:b:beacon':{xp:160,gold:20,materials:{iron:3,wood:2,ember_shard:2},consumables:{}},
 'r11:b:report':{xp:180,gold:80,materials:{},consumables:{}},
});
export const BATTLEFIELD_PROGRESS_DEFAULTS=freeze({battlefield_accepted:1,battlefield_west_ready:0,battlefield_east_ready:0,battlefield_devices_ready:0,battlefield_beacon_taken:0,battlefield_reported:0,battlefield_revision:1,chapter_three_complete:0});
export const BATTLEFIELD_RECEIPTS=freeze(['r11:b:accept',...Object.keys(BATTLEFIELD_REWARDS)]);
export const BATTLEFIELD_TOOLS=freeze({battlefield_beacon:{name:'회수한 봉화핵 · 비소모',consumed:false}});
export const BATTLEFIELD_TACTICS=freeze({
 west:{bannerPocket:{x:176,y:592,radius:128},cover:{x:6,y:14,w:2,h:3},hint:'가운데 방벽이 두 사수의 사선을 나눕니다. 남쪽 깃발 자리에서 싸우거나 양옆으로 돌아 주문부터 끊으세요.'},
 east:{channelLane:{from:{x:720,y:624},to:{x:720,y:368}},lateralExits:[{x:624,y:496},{x:816,y:496}],hint:'앞의 근접 적은 함께 베고 양옆 창병과 사수의 예고선을 살피세요. 짧은 옆걸음 뒤에는 다시 공격합니다. 진격은 짧게 끊고 열린 옆 공간을 쓰세요.'},
 boss:{hint:'긴 화염 조준선은 옆으로 피하고 넓은 검격은 뒤로 돌아 피하세요. 회복이 끝난 뒤 짧게 옆으로 걸을 수 있지만 그때도 공격이 통합니다. 예고가 시작되면 방향은 바뀌지 않습니다.'},
});
