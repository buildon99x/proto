// Original Emberwatch geography, writing and tuning. This is a functional
// campaign fixture, not copied Hammerwatch II content or measured economics.
const freeze = value => {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};
const req = (type, id, extra = {}) => ({type, id, ...extra});
const objective = (id, label, requirement) => ({id, label, requirement});
const material = (id, amount) => ({kind: 'material', id, amount});
const gold = amount => ({kind: 'gold', amount});
const regions = [
  {id: 'ash_hamlet', name: '재빛 피난촌', kind: 'hub', floor: null, description: '꺼지지 않는 화로를 중심으로 다시 모인 마을.'},
  {id: 'pine_reach', name: '솔바람 고개', kind: 'field', floor: null, description: '부러진 종탑과 마른 수로가 길을 가르는 숲.'},
  {id: 'glass_marsh', name: '유리갈대 습지', kind: 'field', floor: null, description: '옛 양수장과 나룻터 사이로 갈대가 빛나는 물가.'},
  {id: 'echo_cave', name: '메아리 틈굴', kind: 'cave', floor: 1, description: '바위 틈 너머에 숨은 작은 지하 호수.'},
  {id: 'sunken_hall_1', name: '침수 전당 · 종의 회랑', kind: 'dungeon', floor: 1, description: '세 개의 종이 수문의 봉인을 지킨다.'},
  {id: 'sunken_hall_2', name: '침수 전당 · 물길 제어실', kind: 'dungeon', floor: 2, description: '수로를 바꾸면 오래된 귀환로가 모습을 드러낸다.'},
  {id: 'sunken_hall_3', name: '침수 전당 · 잿불 심장', kind: 'dungeon', floor: 3, description: '물에 잠긴 봉화와 그 곁을 떠나지 못한 수호자.'}
];
const node = (id, regionId, name, role, description) => ({id, regionId, name, role, description});
const nodes = [
  node('hamlet_square', 'ash_hamlet', '공동 화로', 'safe', '상인과 장인, 길잡이들이 모인 안전한 광장.'),
  node('pine_gate', 'pine_reach', '그을린 이정표', 'combat', '습지로 가는 짧은 능선길과 긴 갈대길의 갈림길.'),
  node('pine_lookout', 'pine_reach', '부러진 종탑', 'clue', '멀리 전당을 바라보는 종탑. 밤에는 등불지기가 찾아온다.'),
  node('pine_canal', 'pine_reach', '끊어진 수로', 'tool_gate', '건너편 고리에 줄을 걸면 전당 입구에 닿을 수 있다.'),
  node('pine_hidden_bank', 'pine_reach', '물 아래 계단', 'secret', '전당의 물길을 돌린 뒤에야 드러나는 비밀 계단.'),
  node('marsh_edge', 'glass_marsh', '백색 갈대밭', 'combat', '능선을 따라 빨리 갈 수 있지만 매복에 노출되는 물가.'),
  node('marsh_reeds', 'glass_marsh', '낮은 징검길', 'cover', '돌담을 따라 우회하는 긴 길. 철편이 흩어져 있다.'),
  node('marsh_shed', 'glass_marsh', '기울어진 양수장', 'tool', '예전 수문지기가 남긴 도구함이 있다.'),
  node('marsh_dock', 'glass_marsh', '마른 나룻터', 'delivery', '연락꾼 리오가 피난촌의 보급을 기다린다.'),
  node('cave_mouth', 'glass_marsh', '노래하는 바위', 'secret', '종탑의 기록을 알아야 틈새를 찾을 수 있다.'),
  node('cave_entry', 'echo_cave', '휘어진 입구', 'narrow', '발소리가 여러 방향에서 돌아오는 좁은 길.'),
  node('cave_lake', 'echo_cave', '거울 호수', 'treasure', '물 아래에 묻힌 장인의 상자를 찾을 수 있다.'),
  node('hall_foyer', 'sunken_hall_1', '수문 현관', 'locked_door', '끊어진 수로를 건너 들어오는 전당의 첫 방.'),
  node('hall_bells', 'sunken_hall_1', '세 종의 뜰', 'sequence_puzzle', '숲의 기록과 같은 문양이 종마다 새겨져 있다.'),
  node('hall_stairs', 'sunken_hall_1', '마모된 내리막', 'stairs', '종의 봉인을 풀면 아래 제어실로 내려갈 수 있다.'),
  node('water_landing', 'sunken_hall_2', '물안개 발코니', 'crossroads', '밸브실을 경유하거나 짧은 함정다리를 건널 수 있다.'),
  node('water_valves', 'sunken_hall_2', '세 갈래 밸브실', 'environment_puzzle', '유입을 막고 우회로와 배출로를 열면 바닥이 드러난다.'),
  node('water_causeway', 'sunken_hall_2', '철제 둑길', 'trap', '짧은 직행로는 압력판 위를 지난다. 밸브실 쪽 길은 안전하다.'),
  node('heart_threshold', 'sunken_hall_3', '잿불 인장문', 'locked_door', '피난촌에서 되찾은 인장으로 마지막 문을 연다.'),
  node('heart_ring', 'sunken_hall_3', '침묵의 원형당', 'boss', '마지막 수문지기가 봉화를 지킨다.'),
  node('heart_beacon', 'sunken_hall_3', '수몰 봉화', 'resolution', '수호자를 쓰러뜨린 뒤 봉화를 다시 밝힐 수 있다.')
];
const exits = [];
function link(id, from, to, minutes, requirements = [], extra = {}) {
  exits.push({id, from, to, minutes, requirements, ...extra});
  exits.push({id: `${id}_back`, from: to, to: from, minutes, requirements, ...extra});
}
link('hamlet_pine', 'hamlet_square', 'pine_gate', 8);
link('pine_lookout_path', 'pine_gate', 'pine_lookout', 4);
link('pine_canal_path', 'pine_gate', 'pine_canal', 4);
link('ridge_route', 'pine_gate', 'marsh_edge', 5, [], {route: 'short_exposed', threat: 'ridge_ambush'});
link('reed_route', 'pine_gate', 'marsh_reeds', 10, [], {route: 'long_sheltered'});
link('reed_edge', 'marsh_reeds', 'marsh_edge', 5);
link('shed_path', 'marsh_edge', 'marsh_shed', 4);
link('dock_path', 'marsh_edge', 'marsh_dock', 5);
link('cave_path', 'marsh_reeds', 'cave_mouth', 5);
link('fissure_passage', 'cave_mouth', 'cave_entry', 3, [req('clue', 'fissure_record')], {hidden: true});
link('cave_lake_path', 'cave_entry', 'cave_lake', 3);
link('canal_crossing', 'pine_canal', 'hall_foyer', 3, [req('tool', 'tide_hook'), req('quest', 'lost_signal'), req('door', 'sluice_entry')]);
link('foyer_gallery', 'hall_foyer', 'hall_bells', 2);
link('bell_stairway', 'hall_bells', 'hall_stairs', 2, [req('puzzle', 'bell_order')]);
link('lower_stairway', 'hall_stairs', 'water_landing', 2);
link('valve_path', 'water_landing', 'water_valves', 3, [], {route: 'long_sheltered'});
link('pressure_bridge', 'water_landing', 'water_causeway', 1, [], {route: 'short_hazardous', hazard: 'pressure_plates'});
link('drained_walkway', 'water_valves', 'water_causeway', 3, [req('puzzle', 'water_balance')], {route: 'long_sheltered'});
link('bank_shortcut', 'water_causeway', 'pine_hidden_bank', 2, [req('shortcut', 'drain_return')], {hidden: true});
link('bank_pine', 'pine_hidden_bank', 'pine_canal', 2, [req('shortcut', 'drain_return')], {hidden: true});
link('heart_stairway', 'water_causeway', 'heart_threshold', 2, [req('puzzle', 'water_balance')]);
link('cinder_gateway', 'heart_threshold', 'heart_ring', 2, [req('door', 'cinder_gate')]);
link('beacon_path', 'heart_ring', 'heart_beacon', 1, [req('boss', 'drowned_warden')]);

const npcs = [
  {id: 'serin', name: '길잡이 세린', nodeId: 'hamlet_square', services: ['quest', 'training'], line: '종탑의 신호가 끊겼어. 먼저 숲에서 무슨 일이 있었는지 알아봐 줘.', completedLine: '봉화가 돌아왔군. 이제 성채로 향할 길을 준비할 수 있겠어.'},
  {id: 'boro', name: '대장장이 보로', nodeId: 'hamlet_square', services: ['equipment', 'crafting'], line: '갈대밭의 옛 철편은 아직 쓸 만해. 버리지 말고 가져와.'},
  {id: 'nari', name: '도구장인 나리', nodeId: 'hamlet_square', services: ['tools', 'quest', 'navigation'], line: '양수장에 남겨 둔 갈고리면 끊어진 수로도 건널 수 있어.'},
  {id: 'yuun', name: '약초상 윤', nodeId: 'hamlet_square', services: ['consumables', 'quest'], line: '나룻터로 보낼 약병이 있어. 봉인을 연 뒤에는 오래 보관할 수 없어.', failedLine: '이번 약병은 기한을 넘겼어. 길을 찾은 기록은 남아 있으니 괜찮아.'},
  {id: 'mira', name: '여관지기 미라', nodeId: 'hamlet_square', services: ['rest', 'quest'], line: '해가 지면 종탑의 등불지기가 옛 물길 이야기를 해 줄 거야.'},
  {id: 'lio', name: '연락꾼 리오', nodeId: 'marsh_dock', services: ['delivery'], line: '윤의 보급을 기다리고 있었어.'},
  {id: 'night_keeper', name: '종탑 등불지기', nodeId: 'pine_lookout', services: ['clue'], timeWindow: {start: 1080, end: 360}, line: '밤의 종은 물보다 먼저 들려. 기록을 가진 사람에게만 그 소리가 길을 알려 주지.'}
];
const quests = [
  {id: 'lost_signal', kind: 'main', title: '끊어진 신호', giver: 'serin', turnIn: 'nari', prerequisites: [], hint: '솔바람 고개의 부러진 종탑을 조사하고 유리갈대 습지의 양수장에서 갈고리를 찾으세요.', objectives: [objective('record', '종탑의 수문 기록 읽기', req('clue', 'bell_record')), objective('hook', '양수장에서 물길 갈고리 확보', req('tool', 'tide_hook'))], rewards: [gold(20), material('salvaged_iron', 1)]},
  {id: 'water_below', kind: 'main', title: '전당 아래의 물길', giver: 'nari', turnIn: 'nari', prerequisites: [req('quest', 'lost_signal')], hint: '끊어진 수로로 돌아가 전당에 들어간 뒤 종의 순서와 밸브를 해결하세요.', objectives: [objective('bells', '종의 봉인 해제', req('puzzle', 'bell_order')), objective('valves', '물길 제어실 배수', req('puzzle', 'water_balance')), objective('return', '배수로 귀환길 개방', req('shortcut', 'drain_return'))], rewards: [gold(35), {kind: 'questItem', id: 'ember_seal'}]},
  {id: 'rekindle_beacon', kind: 'main', title: '다시 켜는 봉화', giver: 'serin', turnIn: 'serin', prerequisites: [req('quest', 'water_below')], hint: '인장으로 전당 3층을 열고 마지막 수문지기를 쓰러뜨린 뒤 봉화를 켜세요.', objectives: [objective('warden', '마지막 수문지기 처치', req('boss', 'drowned_warden')), objective('beacon', '수몰 봉화 점화', req('flag', 'beacon_lit'))], rewards: [gold(60), {kind: 'flag', id: 'cinder_citadel_open'}, {kind: 'flag', id: 'hamlet_advanced_stock'}]},
  {id: 'salvage_order', kind: 'side', title: '다시 쓸 수 있는 철', giver: 'boro', turnIn: 'boro', prerequisites: [], hint: '낮은 징검길의 철편과 숲의 보급 상자를 조사하세요.', objectives: [objective('iron', '회수한 철편 3개 가져오기', req('material', 'salvaged_iron', {amount: 3}))], consume: [material('salvaged_iron', 3)], rewards: [gold(18), material('tempered_fragment', 1)]},
  {id: 'marsh_delivery', kind: 'side', title: '식기 전에 전할 약', giver: 'yuun', turnIn: 'lio', prerequisites: [], durationMinutes: 90, hint: '수락 후 90분이 지나기 전에 나룻터의 리오에게 말을 걸고 약병을 건네세요.', startRewards: [{kind: 'questItem', id: 'sealed_warming_flask'}], objectives: [objective('recipient', '리오와 전달 약속 확인', req('conversation', 'lio')), objective('flask', '봉인한 약병 소지', req('questItem', 'sealed_warming_flask'))], consume: [{kind: 'questItem', id: 'sealed_warming_flask'}], rewards: [gold(15), material('marsh_leaf', 2)]},
  {id: 'night_watch', kind: 'side', title: '밤에만 보이는 길', giver: 'mira', turnIn: 'mira', prerequisites: [], hint: '18시부터 다음 날 6시 전까지 부러진 종탑의 등불지기를 만나세요.', objectives: [objective('witness', '밤의 등불지기와 대화', req('conversation', 'night_keeper', {timeWindow: {start: 1080, end: 360}}))], rewards: [gold(12), {kind: 'clue', id: 'night_watermark'}]},
  {id: 'fissure_echo', kind: 'side', title: '바위 안쪽의 메아리', giver: 'nari', turnIn: 'nari', prerequisites: [], hint: '종탑 기록의 바위 표식을 따라 선택 구역인 메아리 틈굴을 탐사하세요.', objectives: [objective('lake', '거울 호수 발견', req('visitedNode', 'cave_lake')), objective('cache', '호수의 장인 상자 회수', req('chest', 'cave_artisan_cache'))], rewards: [gold(20), material('resonant_shard', 1)]},
  {id: 'reed_hunt', kind: 'side', title: '보급로의 위협', giver: 'serin', turnIn: 'serin', prerequisites: [], hint: '이정표, 백색 갈대밭, 낮은 징검길을 위협하는 세 적을 처치하세요.', objectives: [objective('route', '보급로의 적 3마리 처치', req('encounters', 'supply_route', {amount: 3}))], rewards: [gold(22), material('marsh_leaf', 1)]}
];
const interactions = [
  {id: 'read_bell_record', nodeId: 'pine_lookout', name: '낡은 수문 기록', kind: 'clue', text: '재가 내려앉고, 갈대가 고개를 숙이면, 마지막 종이 길을 연다. 노래하는 바위의 세 줄 자국은 빈틈을 가리킨다.', rewards: [{kind: 'clue', id: 'bell_record'}, {kind: 'clue', id: 'fissure_record'}]},
  {id: 'hook_cache', nodeId: 'marsh_shed', name: '수문지기의 도구함', kind: 'chest', rewards: [{kind: 'tool', id: 'tide_hook'}, material('salvaged_iron', 1)]},
  {id: 'reed_salvage', nodeId: 'marsh_reeds', name: '철편 더미', kind: 'chest', rewards: [material('salvaged_iron', 2)]},
  {id: 'pine_supply_cache', nodeId: 'pine_gate', name: '버려진 보급 상자', kind: 'chest', rewards: [material('salvaged_iron', 1), material('marsh_leaf', 1)]},
  {id: 'sluice_entry', nodeId: 'pine_canal', name: '전당 수문', kind: 'door', requirements: [req('quest', 'lost_signal'), req('tool', 'tide_hook')], rewards: []},
  {id: 'drain_return', nodeId: 'water_causeway', name: '오래된 배수로 문', kind: 'shortcut', requirements: [req('puzzle', 'water_balance')], rewards: []},
  {id: 'bank_memorial_cache', nodeId: 'pine_hidden_bank', name: '물길지기의 유품', kind: 'chest', requirements: [req('shortcut', 'drain_return')], rewards: [{kind: 'equipmentDescriptor', id: 'waterkeeper_band', slot: 'accessory', identity: 'unique', name: '물길지기의 고리', status: 'AWAITING_ITEM_CATALOG'}]},
  {id: 'cave_artisan_cache', nodeId: 'cave_lake', name: '호수의 장인 상자', kind: 'chest', rewards: [{kind: 'equipmentDescriptor', id: 'echo_mantle', slot: 'chest', identity: 'unique', name: '메아리 망토', status: 'AWAITING_ITEM_CATALOG'}, material('resonant_shard', 1)]},
  {id: 'cinder_gate', nodeId: 'heart_threshold', name: '잿불 인장문', kind: 'door', requirements: [req('quest', 'water_below'), req('questItem', 'ember_seal')], consume: [{kind: 'questItem', id: 'ember_seal'}], rewards: []},
  {id: 'light_beacon', nodeId: 'heart_beacon', name: '수몰 봉화', kind: 'flag', requirements: [req('boss', 'drowned_warden')], rewards: [{kind: 'flag', id: 'beacon_lit'}]}
];
const puzzles = [
  {id: 'bell_order', nodeId: 'hall_bells', name: '세 종의 봉인', kind: 'sequence', requirements: [req('clue', 'bell_record')], symbols: [{id: 'cinder', name: '재'}, {id: 'reed', name: '갈대'}, {id: 'bell', name: '종'}], solution: ['cinder', 'reed', 'bell'], initial: {inputs: [], solved: false}, rewards: [material('resonant_shard', 1)]},
  {id: 'water_balance', nodeId: 'water_valves', name: '세 갈래 물길', kind: 'environment', requirements: [], controls: [{id: 'intake', name: '유입 수문'}, {id: 'bypass', name: '우회 수문'}, {id: 'spill', name: '배출 수문'}], solution: {intake: false, bypass: true, spill: true}, initial: {controls: {intake: true, bypass: false, spill: false}, solved: false}, rewards: [material('salvaged_iron', 1)]}
];
const encounters = [
  {id: 'road_cinderling', nodeId: 'pine_gate', name: '재를 뒤집어쓴 길짐승', tag: 'supply_route', role: 'melee', rewards: []},
  {id: 'reed_stalker', nodeId: 'marsh_edge', name: '갈대 매복꾼', tag: 'supply_route', role: 'ranged', rewards: []},
  {id: 'mire_wisp', nodeId: 'marsh_reeds', name: '늪불', tag: 'supply_route', role: 'status', rewards: []},
  {id: 'drowned_warden', nodeId: 'heart_ring', name: '마지막 수문지기', tag: 'guardian', role: 'boss', boss: true, requirements: [req('quest', 'water_below')], rewards: [gold(30), material('warden_ember', 1)]}
];

export const WORLD_CONTENT = freeze({
  id: 'emberwatch-sunken-signal', version: 1, initialNodeId: 'hamlet_square',
  // World minutes are campaign elapsed time. At elapsed 0, local time is 08:00.
  clock: {dayMinutes: 1440, initialMinuteOfDay: 480, nightStart: 1080, nightEnd: 360},
  provenance: 'Original Emberwatch authored content and provisional reward quantities; no exact HW2 XP, death, shop or promotion rule is asserted.',
  regions, nodes, exits, npcs, quests, interactions, puzzles, encounters
});
