// R4a authored Emberwatch first-dungeon content. These maps, rewards, tools and
// boss values are not Hammerwatch II measurements. No progression/world imports.
const freeze = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};
const rect = (x, y, w, h) => ({x, y, w, h});
const object = (id, name, x, y, actionKind, extra = {}) => ({type: 'dungeon', id, name, x, y, actionKind, ...extra});
export const DUNGEON_BOSS_ID = 'sluice-heartkeeper';
export const DUNGEON_GROUPS = freeze({
  upper_guard: ['sluice-upper-scout-1', 'sluice-upper-scout-2', 'sluice-upper-archer-1'],
  upper_control: ['sluice-control-bruiser', 'sluice-control-scout-1', 'sluice-control-scout-2'],
  lower_antechamber: ['sluice-lower-archer', 'sluice-lower-scout'],
  store: ['sluice-store-archer-1', 'sluice-store-archer-2', 'sluice-store-bruiser'],
  boss: [DUNGEON_BOSS_ID],
});
export const DUNGEON_FOES = freeze({
  sluice_keeper: {name: '수문 심장지기', role: 'boss', style: 'boss', hp: 220, armor: 8, speed: 48, xp: 100, gold: 26, tier: 'apprentice', damage: 16, range: 96, windup: 1, recovery: 1,
    patterns: [
      {id: 'sluice-sweep', shape: 'cone', range: 96, windup: 1, recovery: 1, damage: 16, halfAngle: 1.1},
      {id: 'sluice-bolt', shape: 'line', range: 280, windup: 1.1, recovery: 1.1, damage: 12, width: 20, speed: 240, travelRange: 440},
      {id: 'sluice-pulse', shape: 'circle', range: 112, radius: 112, windup: 1.25, recovery: 1.25, damage: 18},
    ],
  },
});
export const DUNGEON_REGIONS = freeze({
  sluice_upper: {id: 'sluice_upper', name: '잿불 수문소 · 상층', w: 28, h: 22, spawn: {x: 112, y: 576},
    rooms: [rect(1,14,7,7),rect(7,17,7,3),rect(12,13,8,8),rect(18,11,3,5),rect(18,7,9,6),rect(12,8,8,3),rect(9,3,8,8),rect(5,5,7,3),rect(1,1,7,8)],
    doors: [{...rect(17,8,1,3),unlockObjective: 'sluice_sequence_solved'},{...rect(7,5,2,3),unlockObjective: 'sluice_bridge_open'}],
    npcs: [],
    portals: [
      {id: 'upper-road-return', name: '감시자 뒤 잿길로', x: 80, y: 624, to: 'ash_road', arrival: {x: 944, y: 96}},
      {id: 'upper-descend', name: '수문소 하층으로', x: 112, y: 112, to: 'sluice_lower', arrival: {x: 112, y: 544}, gate: 'sluice_bridge'},
    ],
    objects: [
      object('sluice-entry-record','정비 기록 · 물결 → 톱니 → 불씨',240,512,'record'),
      object('sluice-crank','분리된 수문 손잡이',168,568,'crank'),
      object('sluice-rune-water','물결 봉인판',656,368,'rune',{rune: 0}),
      object('sluice-rune-gear','톱니 봉인판',704,368,'rune',{rune: 1}),
      object('sluice-rune-ember','불씨 봉인판',752,368,'rune',{rune: 2}),
      object('sluice-valve-inlet','급수 밸브 · 차단 0 / 개방 1',336,176,'inlet'),
      object('sluice-valve-outlet','배수 밸브 · 차단 0 / 개방 1',336,224,'outlet'),
      object('sluice-flow-selector','배수 방향 · 직통 1 / 창고 2',384,192,'flow'),
    ],
    foes: [
      {id: DUNGEON_GROUPS.upper_guard[0],kind:'scout',x:432,y:528,gate:'sluice_accepted'},
      {id: DUNGEON_GROUPS.upper_guard[1],kind:'scout',x:480,y:584,gate:'sluice_accepted'},
      {id: DUNGEON_GROUPS.upper_guard[2],kind:'archer',x:548,y:520,gate:'sluice_accepted'},
      {id: DUNGEON_GROUPS.upper_control[0],kind:'bruiser',x:496,y:240,gate:'sluice_sequence_solved'},
      {id: DUNGEON_GROUPS.upper_control[1],kind:'scout',x:416,y:256,gate:'sluice_sequence_solved'},
      {id: DUNGEON_GROUPS.upper_control[2],kind:'scout',x:464,y:320,gate:'sluice_sequence_solved'},
    ],
  },
  sluice_lower: {id:'sluice_lower',name:'잿불 수문소 · 하층',w:24,h:20,spawn:{x:112,y:544},
    rooms: [rect(1,13,8,6),rect(7,12,7,3),rect(11,9,7,7),rect(14,6,3,5),rect(10,1,13,7),rect(1,2,7,8),rect(5,9,9,3)],
    doors: [{...rect(5,9,3,3),unlockObjective:'sluice_store_open'},{...rect(14,8,3,1),unlockObjective:'sluice_boss_awakened'}],
    npcs: [],
    portals: [
      {id:'lower-ascend',name:'수문소 상층으로',x:80,y:576,to:'sluice_upper',arrival:{x:112,y:112},gate:'sluice_bridge'},
      {id:'lower-lift-town',name:'승강기로 마을 귀환',x:144,y:480,to:'ash_hamlet',arrival:{x:545,y:480},gate:'sluice_shortcut'},
    ],
    objects: [
      object('sluice-lift-chain','귀환 승강기 체인',144,480,'lift'),
      object('sluice-boss-bell','수문핵 봉인종',480,336,'bell'),
      object('sluice-core','멈춘 수문핵',624,112,'core'),
      object('sluice-store-cache','수문소 선택 창고',96,96,'store'),
    ],
    foes: [
      {id:DUNGEON_GROUPS.lower_antechamber[0],kind:'archer',x:512,y:352,gate:'sluice_bridge_open'},
      {id:DUNGEON_GROUPS.lower_antechamber[1],kind:'scout',x:416,y:400,gate:'sluice_bridge_open'},
      {id:DUNGEON_GROUPS.store[0],kind:'archer',x:128,y:192,gate:'sluice_store_open'},
      {id:DUNGEON_GROUPS.store[1],kind:'archer',x:224,y:160,gate:'sluice_store_open'},
      {id:DUNGEON_GROUPS.store[2],kind:'bruiser',x:192,y:272,gate:'sluice_store_open'},
      {id:DUNGEON_BOSS_ID,kind:'sluice_keeper',x:560,y:144,gate:'sluice_boss_awakened'},
    ],
  },
});
export const DUNGEON_LINKS = freeze({
  ash_road: [{id:'road-sluice-in',name:'잿불 수문소 입구',x:944,y:96,to:'sluice_upper',arrival:{x:112,y:576},gate:'sluice_entry'}],
  ash_hamlet: [{id:'town-sluice-lift',name:'수문소 하층 승강기',x:545,y:480,to:'sluice_lower',arrival:{x:112,y:544},gate:'sluice_shortcut'}],
});
export const DUNGEON_TOOLS = freeze({sluice_key:{name:'수문소 열쇠',consumed:false},sluice_crank:{name:'수문 손잡이',consumed:false}});
export const DUNGEON_REWARDS = freeze({
  'r4:crank': {xp:60,gold:0,materials:{},consumables:{}},
  'r4:sequence': {xp:60,gold:8,materials:{},consumables:{}},
  'r4:water': {xp:70,gold:12,materials:{iron:1},consumables:{}},
  'r4:core': {xp:70,gold:20,materials:{},consumables:{}},
  'r4:report': {xp:90,gold:60,materials:{},consumables:{}},
  'r4:store': {xp:30,gold:18,materials:{iron:1,wood:1,thread:2},consumables:{health_potion:1}},
});
export const DUNGEON_PROGRESS_DEFAULTS = freeze({
  sluice_accepted:1,sluice_record_read:0,sluice_crank_found:0,sluice_rune_step:0,
  sluice_sequence_solved:0,sluice_valve_inlet:1,sluice_valve_outlet:0,sluice_drain_mode:0,
  sluice_bridge_open:0,sluice_store_open:0,sluice_shortcut_open:0,sluice_boss_awakened:0,
  first_dungeon_cleared:0,adept_commission:0,
});
export const DUNGEON_RECEIPTS = freeze(['r4:accept','r4:crank','r4:sequence','r4:water','r4:lift','r4:bell','r4:core','r4:report','r4:store']);
