// W: new authored Emberwatch values. Original wilderness names, geometry,
// enemy numbers, damage and timing are UNKNOWN, not recovered measurements.
// Ordinary B role/status contracts are reused without increasing their HP.
// The keeper has its own authored line -> radial-burst contract below.
import {BATTLEFIELD_FOES} from './battlefield-content.js';
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const rect=(x,y,w,h)=>({x,y,w,h});
export const WILDERNESS_REGION='signal_wilderness';
export const WILDERNESS_GROUPS=freeze(Object.fromEntries([
 ['survey',3],['anchor',4],['receiver',5],['relay',4],['approach',4],['boss',1],['scouts',4],
].map(([group,count])=>[group,Array.from({length:count},(_,i)=>`wilderness-${group}-${i+1}`)])));
const role=(source,name,extra={})=>{
 // B's finite lateral-step policy is region-gated. Do not advertise that
 // copied metadata as executable W behavior before separate integration.
 const {battlefieldRoleMovement,...base}=BATTLEFIELD_FOES[source];
 return {...base,name,xp:110,gold:6,...extra};
};
// W-only authored candidate: lateral dodge, then radial retreat/punish. These
// use existing locked patterns, full recovery and ordinary vulnerable movement;
// no B-only footwork or new immunity/HP is implied. See the encounter contract.
const keeperPatterns=[
 {id:'wilderness-keeper-fireline',shape:'line',range:240,width:18,speed:200,travelRange:320,damage:13,damageType:'fire',attackFamily:'spell',statusRuleIds:['r11_burn'],windup:1.15,recovery:.9},
 {id:'wilderness-keeper-burst',shape:'circle',range:72,radius:72,damage:12,damageType:'physical',attackFamily:'weapon',statusRuleIds:[],windup:1.2,recovery:1.65},
];
export const WILDERNESS_FOES=freeze({
 wilderness_flanker:role('battlefield_revenant','황야 척후 · 무장해제',{tags:['living']}),
 wilderness_revenant:role('battlefield_revenant','신호 망자 · 무장해제'),
 wilderness_hexer:role('battlefield_hexer','망자 신호술사 · 독'),
 wilderness_binder:role('battlefield_binder','황야 봉쇄술사 · 침묵'),
 wilderness_pyromancer:role('battlefield_pyromancer','황야 화염술사 · 화상'),
 wilderness_lancer:role('battlefield_lancer','황야 창병 · 둔화'),
 wilderness_bulwark:role('battlefield_bulwark','돌무덤 방패병 · 짧은 기절'),
 wilderness_keeper:{name:'갈라진 신호지기 · 화염선과 원형 파열',role:'boss',hp:200,armor:6,speed:42,style:'cleave',roleGlyph:'broken-ring',tags:['living'],attackFamily:'spell',tier:'expert',xp:280,gold:40,damage:13,range:240,windup:1.15,recovery:.9,patterns:keeperPatterns,fireAreaEscape:true},
});
export const WILDERNESS_SEQUENCE=freeze(['wind','cairn','ember']);
export const WILDERNESS_GLYPHS=freeze({wind:'바람깃',cairn:'돌무덤',ember:'잿불'});
export const WILDERNESS_CLUE=freeze({title:'파손된 측량판의 기록',text:'바람깃이 먼저 방향을 알린다. 돌무덤이 그 빛을 받고, 마지막 잿불이 신호를 잇는다.',sequenceText:'바람깃 → 돌무덤 → 잿불',retainedTool:'wilderness_survey'});
export const WILDERNESS_MODES=freeze({
 cover:{value:1,name:'엄폐판 유지',detail:'가운데 엄폐판을 남깁니다. 양옆 통로로 사수의 사선을 끊고 돌아갈 수 있습니다.'},
 channel:{value:2,name:'중앙 통로 개방',detail:'가운데 엄폐판을 내려 곧은 진격 사선을 만듭니다. 적 화염선에도 노출되며 양옆 퇴로는 그대로 열립니다.'},
});
const gates={survey:'wilderness_accepted',anchor:'wilderness_surveyed',receiver:'wilderness_anchored',relay:'wilderness_mode',approach:'wilderness_routed',boss:'wilderness_keeper_open',scouts:'wilderness_evidence_taken'};
const encounter=(group,index,kind,x,y)=>({id:WILDERNESS_GROUPS[group][index],kind:'wilderness_'+kind,x,y,gate:gates[group]});
const object=(id,name,x,y,actionKind,extra={})=>({id:'wilderness-'+id,name,x,y,type:'wilderness',actionKind,visualType:actionKind==='evidence'?'relic':'shrine',...extra});
export const WILDERNESS_REGIONS=freeze({[WILDERNESS_REGION]:{
 id:WILDERNESS_REGION,name:'갈라진 신호 황야',w:38,h:35,spawn:{x:144,y:1072},npcs:[],
 rooms:[rect(2,23,11,2),rect(2,25,4,3),rect(8,25,5,3),rect(2,28,11,2),rect(9,30,2,1),rect(2,31,9,3),rect(13,26,4,2),rect(17,23,11,8),rect(26,21,3,3),
  rect(23,14,12,8),rect(20,17,3,2),rect(9,13,11,9),rect(9,11,3,2),
  rect(3,3,10,8),rect(13,6,4,2),rect(17,3,12,8),rect(29,7,2,2),rect(31,2,6,9)],
 doors:[
  {...rect(13,26,4,2),unlockObjective:'wilderness_surveyed'},
  {...rect(26,21,3,3),unlockObjective:'wilderness_anchored'},
  {...rect(20,17,3,2),unlockObjective:'wilderness_mode'},
  {...rect(14,16,2,3),unlockObjective:'wilderness_channel_open'},
  {...rect(9,11,3,2),unlockObjective:'wilderness_routed'},
  {...rect(13,6,4,2),unlockObjective:'wilderness_keeper_open'},
  {...rect(29,7,2,2),unlockObjective:'wilderness_evidence_taken'},
 ],
 portals:[
  {id:'wilderness-town-return',name:'안전한 입구에서 마을로',x:80,y:1072,to:'ash_hamlet',arrival:{x:80,y:208}},
  {id:'wilderness-anchor-return',name:'연결한 닻다리로 마을 귀환',x:848,y:912,to:'ash_hamlet',arrival:{x:240,y:248},gate:'wilderness_anchor_return'},
  {id:'wilderness-keeper-return',name:'신호지기 단상에서 에다에게',x:720,y:304,to:'ash_hamlet',arrival:{x:448,y:368},gate:'wilderness_keeper_return'},
 ],
 objects:[
  object('tablet','파손된 측량판',176,784,'survey'),
  object('hook','무료 신호 갈고리 · 재사용',592,912,'hook',{hideWhenCompleted:true}),
  object('anchor','갈고리를 걸어 귀환 닻다리 연결',720,912,'anchor'),
  ...Object.entries(WILDERNESS_GLYPHS).map(([glyph,label],i)=>object('glyph-'+glyph,label+' 수신판',784+i*128,496,'glyph',{glyph})),
  object('choice','교전 전 신호 엄폐판 선택',784,624,'choice'),
  object('relay','엄폐판 너머 신호 중계기',480,496,'relay'),
  object('evidence','회수할 갈라진 신호 기록핵',720,144,'evidence',{hideWhenCompleted:true}),
  object('scouts','고립된 정찰대 네리 · 선택 구조',1136,112,'scouts'),
 ],
 foes:[
  encounter('survey',0,'flanker',176,848),encounter('survey',1,'flanker',336,880),encounter('survey',2,'hexer',80,784),
  encounter('anchor',0,'bulwark',624,848),encounter('anchor',1,'hexer',816,784),encounter('anchor',2,'pyromancer',560,784),encounter('anchor',3,'flanker',816,864),
  encounter('receiver',0,'binder',1072,560),encounter('receiver',1,'revenant',944,624),encounter('receiver',2,'revenant',816,592),encounter('receiver',3,'hexer',784,464),encounter('receiver',4,'lancer',1008,496),
  encounter('relay',0,'pyromancer',336,528),encounter('relay',1,'lancer',560,464),encounter('relay',2,'lancer',432,656),encounter('relay',3,'bulwark',336,624),
  encounter('approach',0,'flanker',176,272),encounter('approach',1,'flanker',368,240),encounter('approach',2,'hexer',112,112),encounter('approach',3,'bulwark',304,144),
  encounter('boss',0,'keeper',720,240),
  encounter('scouts',0,'lancer',1072,304),encounter('scouts',1,'binder',1168,240),encounter('scouts',2,'flanker',1008,176),encounter('scouts',3,'hexer',1136,80),
 ],
}});
export const WILDERNESS_LINKS=freeze({ash_hamlet:[
 // Preserve town/legacy targets. The W circles and actual atlas arches do not
 // overlap each other; the anchor retains only documented outer legacy reach
 // overlap. Short labels stay inside the existing 120px label backgrounds.
 {id:'town-wilderness-entry',name:'신호 황야 입구',x:80,y:168,to:WILDERNESS_REGION,arrival:{x:144,y:1072},gate:'wilderness_entry'},
 {id:'town-wilderness-anchor',name:'황야 닻다리',x:240,y:208,to:WILDERNESS_REGION,arrival:{x:848,y:912},gate:'wilderness_anchor_return'},
]});
export const WILDERNESS_REWARDS=freeze({
 'r12:w:survey':{xp:100,gold:30,materials:{wood:2,thread:2},consumables:{}},
 'r12:w:anchor':{xp:150,gold:20,materials:{iron:2},consumables:{}},
 'r12:w:calibrate':{xp:150,gold:35,materials:{iron:2,ember_shard:1},consumables:{health_potion:1}},
 'r12:w:relay':{xp:150,gold:35,materials:{thread:2,ember_shard:1},consumables:{}},
 'r12:w:evidence':{xp:100,gold:20,materials:{iron:2,wood:2},consumables:{health_potion:1}},
 'r12:w:report':{xp:150,gold:60,materials:{},consumables:{}},
 'r12:w:scouts':{xp:200,gold:60,materials:{wood:2,thread:2},consumables:{health_potion:1}},
});
export const WILDERNESS_PROGRESS_DEFAULTS=freeze({wilderness_accepted:1,wilderness_surveyed:0,wilderness_hook_taken:0,wilderness_anchored:0,wilderness_sequence_step:0,wilderness_calibrated:0,wilderness_mode:0,wilderness_channel_open:0,wilderness_routed:0,wilderness_keeper_open:0,wilderness_evidence_taken:0,wilderness_scouts_rescued:0,wilderness_reported:0,wilderness_revision:1});
export const WILDERNESS_RECEIPTS=freeze(['r12:w:accept','r12:w:hook','r12:w:choice',...Object.keys(WILDERNESS_REWARDS)]);
export const WILDERNESS_TOOLS=freeze({wilderness_survey:{name:'황야 측량판 기록 · 계속 읽기',consumed:false},wilderness_hook:{name:'신호 갈고리 · 비소모',consumed:false},wilderness_evidence:{name:'회수한 갈라진 신호 기록핵',consumed:false}});
export const WILDERNESS_TACTICS=freeze({
 survey:'두 척후와 떨어진 독술사의 사선을 나누세요. 빠른 정리와 뒤쪽 사수 우회 중 선택할 수 있습니다.',
 anchor:'방패병을 모서리에 묶거나 떨어진 두 사수를 먼저 압박하세요. 갈고리는 무료이며 다리에 직접 걸어야 합니다.',
 receiver:'침묵술사는 살아 있고 두 검병과 독술사는 망자입니다. 침묵을 먼저 끊거나 망자에게 맞는 기술을 쓰세요.',
 relay:'교전 전에 엄폐판을 고르세요. 엄폐 유지와 직선 진격 모두 옆 퇴로가 남고 보상은 같습니다.',
 approach:'양옆 척후에 둘러싸이기 전에 방향을 바꾸세요. 다음 보스 전투에 자원을 남기는 선택도 가능합니다.',
 boss:'고정된 화염 조준선은 옆으로 피하세요. 다음 원형 파열은 뒤로 돌아도 맞으므로 충분히 멀어지세요. 공격 후 회복 동안에도 공격이 통합니다.',
 scouts:'선택 구조입니다. 신호 기록핵만 가져가도 에다에게 본 의뢰를 보고할 수 있습니다.',
});
