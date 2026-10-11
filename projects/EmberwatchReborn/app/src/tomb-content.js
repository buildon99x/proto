// R10 Signal Tomb is authored Emberwatch Reborn content, not a restored
// original map or measured original-game balance. See the authored ledger.
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const rect=(x,y,w,h)=>({x,y,w,h});
const object=(id,name,x,y,actionKind,extra={})=>({type:'tomb',id,name,x,y,actionKind,...extra});
export const TOMB_REGION='signal_tomb';
export const TOMB_SEQUENCE=freeze(['crescent','split_beam','ember']);
export const TOMB_GLYPHS=freeze({
 crescent:{name:'초승달',order:1,shape:'crescent'},
 split_beam:{name:'갈라진 빛줄기',order:2,shape:'split-beam'},
 ember:{name:'잿불',order:3,shape:'ember'},
});
export const TOMB_GROUPS=freeze({
 entry:['tomb-blade-1','tomb-blade-2','tomb-blade-3','tomb-scribe-1','tomb-scribe-2','tomb-scribe-3'],
 inscription:['tomb-blade-4','tomb-blade-5','tomb-blade-6','tomb-scribe-4','tomb-scribe-5','tomb-scribe-6'],
 ward_lower:['tomb-vigil-1','tomb-piercer-1','tomb-vigil-2'],
 ward_upper:['tomb-vigil-3','tomb-piercer-2','tomb-piercer-3'],
 boss:['tomb-oathkeeper'],
});
// The selector is opt-in. A phase is activated only between committed attacks;
// its data alone does not implement or verify the runtime transition/cue.
export const TOMB_BOSS_PHASES=freeze([
 {id:'whole',hpRatioAtMost:1,patternIds:['tomb-oath-needle','tomb-oath-pulse']},
 {id:'cracked',hpRatioAtMost:.5,patternIds:['tomb-oath-needle','tomb-oath-broken','tomb-oath-pulse'],cue:'cracked-ring'},
]);
export const TOMB_FOES=freeze({
 tomb_blade:{name:'묘실 검수',hp:52,armor:2,speed:80,damage:9,range:64,windup:.75,recovery:.8,xp:40,gold:5,tier:'adept',style:'melee',roleGlyph:'wedge',
  patterns:[{id:'tomb-blade-cut',shape:'cone',range:64,halfAngle:.55,damage:9,windup:.75,recovery:.8}]},
 tomb_scribe:{name:'묘실 서기관',hp:42,armor:0,speed:36,damage:8,range:240,windup:1.1,recovery:1.2,xp:40,gold:5,tier:'adept',style:'ranged',roleGlyph:'slit',
  patterns:[{id:'tomb-scribe-line',shape:'line',range:240,width:12,speed:210,travelRange:320,damage:8,windup:1.1,recovery:1.2}]},
 tomb_vigil:{name:'봉인 감시자',hp:74,armor:10,speed:42,damage:11,range:72,windup:1.15,recovery:1.25,xp:60,gold:8,tier:'adept',style:'cleave',roleGlyph:'segmented-circle',
  patterns:[{id:'tomb-vigil-pulse',shape:'circle',radius:72,range:72,damage:11,windup:1.15,recovery:1.25}]},
 tomb_piercer:{name:'봉인 관통자',hp:46,armor:2,speed:40,damage:10,range:240,windup:1.25,recovery:1.1,xp:60,gold:8,tier:'adept',style:'ranged',roleGlyph:'split-shaft',
  patterns:[{id:'tomb-piercer-line',shape:'line',range:240,width:18,speed:200,travelRange:320,damage:10,windup:1.25,recovery:1.1}]},
 tomb_oathkeeper:{name:'서약 수호자',role:'boss',hp:210,armor:8,speed:44,damage:16,range:132,windup:1.25,recovery:1.05,xp:120,gold:36,tier:'adept',style:'cleave',roleGlyph:'broken-ring',
  patterns:[{id:'tomb-oath-needle',shape:'cone',range:132,halfAngle:.22,damage:16,windup:1.25,recovery:1.05},
   {id:'tomb-oath-pulse',shape:'circle',radius:96,range:96,damage:14,windup:1.35,recovery:1.45},
   {id:'tomb-oath-broken',shape:'line',range:250,width:16,speed:200,travelRange:320,damage:12,windup:1.2,recovery:1.1}],patternPhases:TOMB_BOSS_PHASES},
});
const foe=(group,index,kind,x,y,gate)=>({id:TOMB_GROUPS[group][index],kind,x,y,gate});
export const TOMB_REGIONS=freeze({
 signal_tomb:{id:TOMB_REGION,name:'신호 묘실',w:24,h:24,spawn:{x:112,y:656},
  rooms:[rect(2,14,9,2),rect(2,16,2,2),rect(6,16,5,2),rect(2,18,6,2),rect(10,18,1,2),rect(2,20,9,2),
   rect(2,2,9,3),rect(2,5,3,3),rect(7,5,4,3),rect(2,8,9,4),
   rect(13,8,9,4),rect(13,2,9,5),rect(16,7,3,1),rect(13,14,9,8),
   rect(5,12,3,2),rect(11,9,2,3),rect(16,12,3,2)],
  // These solid overlays protect future foes from movement, charge, both
  // sides' projectiles and LOS. Every transition only opens existing floor.
  doors:[{...rect(5,12,3,2),unlockObjective:'tomb_decoded'},
   {...rect(11,9,2,3),unlockObjective:'tomb_sequence_solved'},
   {...rect(13,8,1,4),unlockObjective:'tomb_ward_taken'},
   {...rect(16,7,3,1),unlockObjective:'tomb_ward_midpoint'},
   {...rect(16,12,3,2),unlockObjective:'tomb_ward_sealed'}],npcs:[],
  portals:[{id:'tomb-town-return',name:'묘실 입구에서 마을로',x:112,y:688,to:'ash_hamlet',arrival:{x:624,y:144}},
   {id:'tomb-town-shortcut',name:'기록 보관 계단으로 마을 귀환',x:144,y:368,to:'ash_hamlet',arrival:{x:464,y:144},gate:'tomb_shortcut'},
   {id:'tomb-boss-return',name:'서약실에서 에다에게 귀환',x:656,y:656,to:'ash_hamlet',arrival:{x:448,y:208},gate:'tomb_boss_return'}],
  objects:[object('tomb-projection','렌즈 투영 장치',304,688,'decode',{visualType:'shrine'}),
   object('tomb-glyph-crescent','1 · 초승달 석판',112,240,'glyph',{glyph:'crescent',visualType:'shrine'}),
   object('tomb-glyph-split-beam','2 · 갈라진 빛줄기 석판',304,208,'glyph',{glyph:'split_beam',visualType:'shrine'}),
   object('tomb-glyph-ember','3 · 잿불 석판',208,112,'glyph',{glyph:'ember',visualType:'shrine'}),
   object('tomb-shortcut','기록 보관 계단 연결',80,368,'shortcut',{visualType:'shrine',hideWhenCompleted:true}),
   object('tomb-ward-origin','운반 봉인 받기',336,368,'wardTake',{visualType:'relic',hideWhenCompleted:true}),
   object('tomb-ward-midpoint','하부 중계 받침',656,272,'wardMidpoint',{visualType:'shrine'}),
   object('tomb-ward-final','상부 봉인 받침',528,80,'wardSeal',{visualType:'shrine'}),
   object('tomb-oath','서약문 회수',656,560,'oath',{visualType:'relic',hideWhenCompleted:true})],
  foes:[foe('entry',0,'tomb_blade',208,656,'tomb_accepted'),foe('entry',1,'tomb_blade',240,560,'tomb_accepted'),foe('entry',2,'tomb_blade',336,592,'tomb_accepted'),
   foe('entry',3,'tomb_scribe',304,464,'tomb_accepted'),foe('entry',4,'tomb_scribe',80,464,'tomb_accepted'),foe('entry',5,'tomb_scribe',208,464,'tomb_accepted'),
   foe('inscription',0,'tomb_blade',112,304,'tomb_decoded'),foe('inscription',1,'tomb_blade',240,336,'tomb_decoded'),foe('inscription',2,'tomb_blade',272,176,'tomb_decoded'),
   foe('inscription',3,'tomb_scribe',80,112,'tomb_decoded'),foe('inscription',4,'tomb_scribe',304,80,'tomb_decoded'),foe('inscription',5,'tomb_scribe',304,272,'tomb_decoded'),
   foe('ward_lower',0,'tomb_vigil',464,304,'tomb_ward_taken'),foe('ward_lower',1,'tomb_piercer',592,272,'tomb_ward_taken'),foe('ward_lower',2,'tomb_vigil',656,336,'tomb_ward_taken'),
   foe('ward_upper',0,'tomb_vigil',464,176,'tomb_ward_midpoint'),foe('ward_upper',1,'tomb_piercer',624,112,'tomb_ward_midpoint'),foe('ward_upper',2,'tomb_piercer',656,176,'tomb_ward_midpoint'),
   foe('boss',0,'tomb_oathkeeper',560,560,'tomb_ward_sealed')],
 },
});
export const TOMB_LINKS=freeze({ash_hamlet:[
 {id:'town-tomb-entry',name:'신호 묘실로',x:624,y:112,to:TOMB_REGION,arrival:{x:112,y:656},gate:'tomb_entry'},
 {id:'town-tomb-shortcut',name:'묘실 기록 보관 계단',x:464,y:112,to:TOMB_REGION,arrival:{x:144,y:368},gate:'tomb_shortcut'},
]});
export const TOMB_REWARDS=freeze({
 'r10:t:decode':{xp:100,gold:0,materials:{},consumables:{}},
 'r10:t:sequence':{xp:110,gold:10,materials:{},consumables:{}},
 'r10:t:ward':{xp:130,gold:30,materials:{iron:4,wood:2,thread:3,ember_shard:2},consumables:{health_potion:1}},
 'r10:t:report':{xp:140,gold:120,materials:{},consumables:{}},
});
export const TOMB_PROGRESS_DEFAULTS=freeze({tomb_accepted:1,tomb_decoded:0,tomb_sequence_step:0,tomb_sequence_solved:0,
 tomb_ward_taken:0,tomb_ward_midpoint:0,tomb_ward_sealed:0,tomb_oath_taken:0,tomb_shortcut_open:0,tomb_reported:0,tomb_revision:1,expert_commission:0});
export const TOMB_RECEIPTS=freeze(['r10:t:accept','r10:t:decode','r10:t:sequence','r10:t:ward-take','r10:t:ward-midpoint','r10:t:ward','r10:t:oath','r10:t:shortcut','r10:t:report']);
export const TOMB_TOOLS=freeze({tomb_oath:{name:'서약문 · 비소모 회수물',consumed:false}});
export const TOMB_TRAINING_RESERVE=120;
