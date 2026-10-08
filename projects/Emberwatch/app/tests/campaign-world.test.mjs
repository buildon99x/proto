import test from 'node:test';
import assert from 'node:assert/strict';
import {createCampaignSave, createCampaignStore, CAMPAIGN_SAVE} from '../src/campaign/save.js';
import {WORLD_CONTENT, initializeCampaignWorld, applyWorldCommand, validateCampaignWorld, getWorldView, getQuestJournal, worldClock} from '../src/campaign/world.js';

const copy = value => JSON.parse(JSON.stringify(value));
const fresh = classId => initializeCampaignWorld(createCampaignSave(classId)).save;
const memory = () => {
  const data = new Map();
  return {data, fail: null, getItem: key => data.get(key) ?? null, setItem(key, value) { if (this.fail === key) throw new Error('interrupted'); data.set(key, value); }};
};
function driver(initial = fresh(), {persist = false} = {}) {
  let save = initial;
  const storage = memory(), store = createCampaignStore(storage, {now: () => '2026-10-08T00:00:00.000Z'});
  function act(type, fields = {}) {
    const before = copy(save), result = applyWorldCommand(save, {type, ...fields});
    assert.deepEqual(save, before, `input mutated by ${type}`);
    assert.equal(result.ok, true, `${type}: ${result.code}`);
    save = result.save;
    assert.equal(validateCampaignWorld(save).ok, true);
    if (persist) { assert.equal(store.save(save).ok, true); save = createCampaignStore(storage).load().save; }
    return result;
  }
  function go(target) {
    const queue = [{node: save.world.currentNodeId, path: []}], visited = new Set();
    while (queue.length) {
      const entry = queue.shift();
      if (entry.node === target) { for (const exitId of entry.path) act('travel', {exitId}); return; }
      if (visited.has(entry.node)) continue;
      visited.add(entry.node);
      const probe = copy(save); probe.world.currentNodeId = entry.node;
      probe.world.currentRegionId = WORLD_CONTENT.nodes.find(node => node.id === entry.node).regionId;
      for (const exit of getWorldView(probe).exits.filter(exit => !exit.locked)) queue.push({node: exit.to, path: [...entry.path, exit.id]});
    }
    assert.fail(`No unlocked path to ${target}`);
  }
  return {get save() { return save; }, act, go, storage, store};
}
function rejected(save, command, code) {
  const snapshot = copy(save), result = applyWorldCommand(save, command);
  assert.equal(result.ok, false); if (code) assert.equal(result.code, code);
  assert.strictEqual(result.save, save); assert.deepEqual(save, snapshot); assert.deepEqual(result.events, []);
}
function completeFirstQuest(d) {
  d.act('talk', {npcId: 'serin'}); d.act('talk', {npcId: 'nari'});
  d.act('acceptQuest', {questId: 'lost_signal'});
  d.go('pine_lookout'); d.act('interact', {interactionId: 'read_bell_record'});
  d.go('marsh_shed'); d.act('interact', {interactionId: 'hook_cache'});
  d.go('hamlet_square'); d.act('turnInQuest', {questId: 'lost_signal'});
}
function enterBells(d) {
  completeFirstQuest(d); d.act('acceptQuest', {questId: 'water_below'});
  d.go('pine_canal'); d.act('interact', {interactionId: 'sluice_entry'}); d.go('hall_bells');
}
function solveBells(d) { for (const input of ['cinder', 'reed', 'bell']) d.act('puzzleInput', {puzzleId: 'bell_order', input}); }
function solveWater(d) { d.go('water_valves'); for (const [control, value] of [['intake', false], ['bypass', true], ['spill', true]]) d.act('puzzleInput', {puzzleId: 'water_balance', control, value}); }

test('authored content has one hub, two fields, three dungeon floors, optional cave, five functional hub NPCs and 3+5 quests', () => {
  for (const [kind, count] of [['hub', 1], ['field', 2], ['dungeon', 3], ['cave', 1]]) assert.equal(WORLD_CONTENT.regions.filter(region => region.kind === kind).length, count);
  assert.equal(WORLD_CONTENT.npcs.filter(npc => npc.nodeId === 'hamlet_square' && npc.services.length).length, 5);
  assert.equal(WORLD_CONTENT.quests.filter(quest => quest.kind === 'main').length, 3);
  assert.equal(WORLD_CONTENT.quests.filter(quest => quest.kind === 'side').length, 5);
  assert.deepEqual(WORLD_CONTENT.puzzles.map(puzzle => puzzle.kind), ['sequence', 'environment']);
  assert(WORLD_CONTENT.exits.filter(exit => exit.hidden).length >= 4);
  assert(WORLD_CONTENT.exits.some(exit => exit.route === 'short_exposed'));
  assert(WORLD_CONTENT.exits.some(exit => exit.route === 'short_hazardous'));
  assert(Object.isFrozen(WORLD_CONTENT.nodes[0]));
  const ids = new Set(WORLD_CONTENT.nodes.map(node => node.id));
  assert.equal(ids.size, WORLD_CONTENT.nodes.length);
  for (const exit of WORLD_CONTENT.exits) { assert(ids.has(exit.from)); assert(ids.has(exit.to)); assert(Number.isSafeInteger(exit.minutes)); }
  for (const row of [...WORLD_CONTENT.interactions, ...WORLD_CONTENT.puzzles, ...WORLD_CONTENT.encounters, ...WORLD_CONTENT.npcs]) assert(ids.has(row.nodeId));
});

test('initialization is immutable, class-neutral, idempotent, versioned and does not reinterpret existing progress', () => {
  for (const classId of ['warrior', 'mage', 'archer']) {
    const original = createCampaignSave(classId), snapshot = copy(original), result = initializeCampaignWorld(original);
    assert(result.ok); assert.deepEqual(original, snapshot); assert.equal(result.save.character.classId, classId);
    assert.deepEqual(worldClock(result.save), {elapsedMinutes: 0, day: 1, minuteOfDay: 480, hour: 8, minute: 0, isNight: false});
    assert.strictEqual(initializeCampaignWorld(result.save).save, result.save);
  }
  const old = createCampaignSave(); old.world.questFlags.some_other_content = 'completed';
  assert.equal(initializeCampaignWorld(old).code, 'UNRECOGNIZED_WORLD_PROGRESS');
  const newer = fresh(); newer.world.contentVersion = 999;
  assert.equal(initializeCampaignWorld(newer).code, 'WORLD_VERSION');
});

test('end-to-end authored journey completes all eight quests, revisit, optional cave, both puzzles and boss with save reload after every action', () => {
  const d = driver(fresh(), {persist: true});
  for (const npcId of ['serin', 'boro', 'nari', 'yuun', 'mira']) d.act('talk', {npcId});
  for (const questId of ['lost_signal', 'salvage_order', 'marsh_delivery', 'night_watch', 'fissure_echo', 'reed_hunt']) d.act('acceptQuest', {questId});
  d.go('pine_gate'); d.act('interact', {interactionId: 'pine_supply_cache'}); d.act('defeatEncounter', {encounterId: 'road_cinderling'});
  d.go('pine_lookout'); d.act('interact', {interactionId: 'read_bell_record'});
  d.go('marsh_edge'); d.act('defeatEncounter', {encounterId: 'reed_stalker'});
  d.go('marsh_reeds'); d.act('interact', {interactionId: 'reed_salvage'}); d.act('defeatEncounter', {encounterId: 'mire_wisp'});
  d.go('marsh_shed'); d.act('beginInteraction', {interactionId: 'hook_cache', token: 'journey:hook'});
  assert.equal(d.save.inventory.tools.length, 0);
  d.act('commitInteraction', {token: 'journey:hook'});
  d.go('marsh_dock'); d.act('talk', {npcId: 'lio'}); d.act('turnInQuest', {questId: 'marsh_delivery'});
  assert(d.save.world.timeMinutes < 90);
  d.go('cave_lake'); d.act('interact', {interactionId: 'cave_artisan_cache'});
  d.go('hamlet_square');
  for (const questId of ['lost_signal', 'salvage_order', 'fissure_echo', 'reed_hunt']) d.act('turnInQuest', {questId});
  d.act('acceptQuest', {questId: 'water_below'});
  const untilEveningDeparture = (1080 - worldClock(d.save).minuteOfDay - 12 + 1440) % 1440;
  if (untilEveningDeparture) d.act('rest', {minutes: untilEveningDeparture});
  d.go('pine_lookout'); assert.equal(worldClock(d.save).hour, 18);
  d.act('talk', {npcId: 'night_keeper'}); d.go('hamlet_square'); d.act('turnInQuest', {questId: 'night_watch'});
  d.go('pine_canal'); d.act('interact', {interactionId: 'sluice_entry'}); d.go('hall_bells'); solveBells(d); solveWater(d);
  d.go('water_causeway'); d.act('interact', {interactionId: 'drain_return'});
  d.go('pine_hidden_bank'); d.act('interact', {interactionId: 'bank_memorial_cache'});
  d.go('hamlet_square'); d.act('turnInQuest', {questId: 'water_below'}); d.act('acceptQuest', {questId: 'rekindle_beacon'});
  d.go('heart_threshold'); d.act('interact', {interactionId: 'cinder_gate'});
  assert(!d.save.inventory.questItems.includes('ember_seal'));
  d.go('heart_ring'); d.act('defeatEncounter', {encounterId: 'drowned_warden'});
  d.go('heart_beacon'); d.act('interact', {interactionId: 'light_beacon'});
  d.go('hamlet_square'); d.act('turnInQuest', {questId: 'rekindle_beacon'});
  assert(Object.values(d.save.world.questLog).every(quest => quest.status === 'completed'));
  assert(getQuestJournal(d.save).every(quest => quest.objectives.every(objective => objective.complete)));
  assert.equal(d.save.world.visitedLevels.length, 7);
  assert(d.save.world.flags.cinder_citadel_open); assert(d.save.world.flags.hamlet_advanced_stock);
  assert(d.save.world.bossFlags.drowned_warden);
  assert.deepEqual(d.save.inventory.rewardDescriptors.map(reward => reward.id).sort(), ['echo_mantle', 'waterkeeper_band']);
  assert(d.save.inventory.rewardDescriptors.every(reward => reward.status === 'AWAITING_ITEM_CATALOG' && reward.grantId));
  const completed = copy(d.save);
  d.act('turnInQuest', {questId: 'rekindle_beacon'});
  assert.deepEqual(d.save, completed);
  assert.deepEqual(d.store.load().save, completed);
});

test('locked travel, absent NPCs, unknown/prototype IDs and invalid commands do not mutate state', () => {
  const d = driver(); d.go('pine_canal');
  rejected(d.save, {type: 'travel', exitId: 'canal_crossing'}, 'REQUIREMENTS');
  rejected(d.save, {type: 'interact', interactionId: 'sluice_entry'}, 'REQUIREMENTS');
  rejected(d.save, {type: 'travel', exitId: 'heart_stairway'}, 'WRONG_LOCATION');
  rejected(d.save, {type: 'talk', npcId: 'mira'}, 'WRONG_LOCATION');
  rejected(d.save, {type: 'rest', minutes: 60}, 'REST_UNAVAILABLE');
  for (const id of ['unknown', 'constructor', '__proto__', 'toString']) {
    rejected(d.save, {type: 'acceptQuest', questId: id}, 'UNKNOWN_QUEST');
    rejected(d.save, {type: 'interact', interactionId: id}, 'UNKNOWN_INTERACTION');
    rejected(d.save, {type: 'defeatEncounter', encounterId: id}, 'UNKNOWN_ENCOUNTER');
  }
  for (const command of [null, [], {}, {type: 'notACommand'}]) rejected(d.save, command);
});

test('quest discovery, acceptance and completion dependencies are enforced', () => {
  const d = driver();
  rejected(d.save, {type: 'acceptQuest', questId: 'lost_signal'}, 'QUEST_NOT_AVAILABLE');
  d.act('talk', {npcId: 'nari'});
  assert.equal(d.save.world.questLog.water_below.status, 'undiscovered');
  rejected(d.save, {type: 'acceptQuest', questId: 'water_below'}, 'QUEST_NOT_AVAILABLE');
  d.act('talk', {npcId: 'serin'}); d.act('acceptQuest', {questId: 'lost_signal'});
  rejected(d.save, {type: 'turnInQuest', questId: 'lost_signal'}, 'QUEST_NOT_READY');
  rejected(d.save, {type: 'acceptQuest', questId: 'lost_signal'}, 'QUEST_NOT_AVAILABLE');
  assert.equal(getQuestJournal(d.save).find(quest => quest.id === 'lost_signal').status, 'active');
});

test('chest/door/boss rewards and consumptions are atomic and exactly once, including repeated callbacks', () => {
  const d = driver(); completeFirstQuest(d);
  d.go('marsh_shed'); const before = copy(d.save); d.act('interact', {interactionId: 'hook_cache'}); assert.deepEqual(d.save, before);
  d.go('pine_canal'); d.act('interact', {interactionId: 'sluice_entry'}); const opened = copy(d.save);
  d.act('interact', {interactionId: 'sluice_entry'}); assert.deepEqual(d.save, opened);
  d.go('hall_bells'); solveBells(d); solveWater(d); d.go('water_causeway'); d.act('interact', {interactionId: 'drain_return'});
  d.go('hamlet_square'); d.act('acceptQuest', {questId: 'water_below'}); d.act('turnInQuest', {questId: 'water_below'});
  d.go('heart_threshold'); d.act('interact', {interactionId: 'cinder_gate'}); const door = copy(d.save);
  d.act('interact', {interactionId: 'cinder_gate'}); assert.deepEqual(d.save, door);
  assert.deepEqual(getWorldView(d.save).interactions[0].missing, []);
  d.go('heart_ring'); d.act('defeatEncounter', {encounterId: 'drowned_warden'}); const boss = copy(d.save);
  d.act('defeatEncounter', {encounterId: 'drowned_warden'}); assert.deepEqual(d.save, boss);
});

test('interrupted interactions grant nothing, survive reload, can cancel, and commit once', () => {
  const d = driver(fresh(), {persist: true}); d.go('pine_gate');
  d.act('beginInteraction', {interactionId: 'pine_supply_cache', token: 'chest:1'});
  assert.equal(d.save.inventory.materials.salvaged_iron, undefined);
  rejected(d.save, {type: 'commitInteraction', token: 'wrong'}, 'NO_PENDING_INTERACTION');
  rejected(d.save, {type: 'beginInteraction', interactionId: 'pine_supply_cache', token: 'chest:2'}, 'INTERACTION_PENDING');
  d.act('cancelInteraction', {token: 'chest:1'}); assert.equal(d.save.world.openedChests.length, 0);
  d.act('beginInteraction', {interactionId: 'pine_supply_cache', token: 'chest:2'});
  d.act('commitInteraction', {token: 'chest:2'}); const once = copy(d.save);
  d.act('commitInteraction', {token: 'chest:2'}); assert.deepEqual(d.save, once);
  rejected(d.save, {type: 'beginInteraction', interactionId: 'pine_supply_cache', token: 'chest:2'}, 'TOKEN_ALREADY_COMMITTED');
  d.go('marsh_shed'); d.act('beginInteraction', {interactionId: 'hook_cache', token: 'hook:leave'});
  d.go('marsh_edge'); assert.equal(d.save.world.pendingInteraction, null);
  rejected(d.save, {type: 'commitInteraction', token: 'hook:leave'}, 'NO_PENDING_INTERACTION');
  assert(!d.save.inventory.tools.includes('tide_hook'));
});

test('failed save commit replays from prior snapshot without duplicated rewards', () => {
  const d = driver(); d.go('pine_gate');
  const storage = memory(), store = createCampaignStore(storage);
  assert(store.save(d.save).ok);
  const result = applyWorldCommand(d.save, {type: 'interact', interactionId: 'pine_supply_cache'});
  storage.fail = CAMPAIGN_SAVE.head; assert.equal(store.save(result.save).code, 'WRITE_FAILED');
  const recovered = createCampaignStore(storage).load().save;
  assert.equal(recovered.inventory.materials.salvaged_iron, undefined);
  const replay = applyWorldCommand(recovered, {type: 'interact', interactionId: 'pine_supply_cache'});
  storage.fail = null; assert(store.save(replay.save).ok);
  const loaded = createCampaignStore(storage).load().save;
  assert.equal(loaded.inventory.materials.salvaged_iron, 1);
  assert.deepEqual(applyWorldCommand(loaded, {type: 'interact', interactionId: 'pine_supply_cache'}).save, loaded);
});

test('partial puzzle states persist, wrong sequence resets, invalid inputs do not mutate, and rewards do not repeat', () => {
  const d = driver(fresh(), {persist: true}); enterBells(d);
  assert(!Object.hasOwn(getWorldView(d.save).puzzles[0], 'solution'));
  d.act('puzzleInput', {puzzleId: 'bell_order', input: 'cinder'});
  assert.deepEqual(d.store.load().save.world.puzzleStates.bell_order.inputs, ['cinder']);
  rejected(d.save, {type: 'puzzleInput', puzzleId: 'bell_order', input: 'fire'}, 'INVALID_PUZZLE_INPUT');
  d.act('puzzleInput', {puzzleId: 'bell_order', input: 'bell'}); assert.deepEqual(d.save.world.puzzleStates.bell_order.inputs, []);
  solveBells(d); const solved = copy(d.save); d.act('puzzleInput', {puzzleId: 'bell_order', input: 'cinder'}); assert.deepEqual(d.save, solved);
  d.go('water_valves'); d.act('puzzleInput', {puzzleId: 'water_balance', control: 'intake', value: false});
  assert.equal(d.store.load().save.world.puzzleStates.water_balance.controls.intake, false);
  rejected(d.save, {type: 'puzzleInput', puzzleId: 'water_balance', control: 'spill', value: 1}, 'INVALID_PUZZLE_INPUT');
  d.act('puzzleInput', {puzzleId: 'water_balance', control: 'bypass', value: true});
  assert.equal(d.save.world.puzzleStates.water_balance.solved, false);
  d.act('puzzleInput', {puzzleId: 'water_balance', control: 'spill', value: true});
  assert.equal(d.save.world.puzzleStates.water_balance.solved, true);
});

test('timed delivery succeeds before deadline and fails exactly at it, even if objectives became ready', () => {
  for (const elapsed of [89, 90, 91]) {
    const d = driver(fresh(), {persist: true}); d.act('talk', {npcId: 'yuun'}); d.act('acceptQuest', {questId: 'marsh_delivery'});
    assert.equal(d.save.world.questLog.marsh_delivery.deadlineAt, 90);
    d.go('marsh_dock'); d.act('talk', {npcId: 'lio'});
    assert.equal(d.save.world.questLog.marsh_delivery.status, 'ready');
    d.act('advanceTime', {minutes: elapsed - d.save.world.timeMinutes});
    if (elapsed === 89) { d.act('turnInQuest', {questId: 'marsh_delivery'}); d.act('advanceTime', {minutes: 100}); assert.equal(d.save.world.questLog.marsh_delivery.status, 'completed'); }
    else {
      assert.equal(d.save.world.questLog.marsh_delivery.status, 'failed');
      rejected(d.save, {type: 'turnInQuest', questId: 'marsh_delivery'}, 'DEADLINE');
      assert(!d.save.inventory.questItems.includes('sealed_warming_flask'));
      assert.equal(d.save.gold, 0);
      d.go('hamlet_square'); const talk = d.act('talk', {npcId: 'yuun'}); assert(talk.events.some(event => event.text?.includes('기한')));
    }
  }
});

test('travel crossing a deadline expires the timed quest without rolling back arrival', () => {
  const d = driver(); d.act('talk', {npcId: 'yuun'}); d.act('acceptQuest', {questId: 'marsh_delivery'});
  d.act('advanceTime', {minutes: 85}); d.act('travel', {exitId: 'hamlet_pine'});
  assert.equal(d.save.world.timeMinutes, 93); assert.equal(d.save.world.currentNodeId, 'pine_gate');
  assert.equal(d.save.world.questLog.marsh_delivery.status, 'failed');
});

test('night NPC appears at 18:00 and disappears at 06:00; daylight conversations cannot fulfill night quest', () => {
  for (const [elapsed, present] of [[599, false], [600, true], [1319, true], [1320, false]]) {
    const d = driver(); d.act('talk', {npcId: 'mira'}); d.act('acceptQuest', {questId: 'night_watch'});
    d.go('pine_lookout'); d.act('advanceTime', {minutes: elapsed - d.save.world.timeMinutes});
    assert.equal(getWorldView(d.save).npcs.some(npc => npc.id === 'night_keeper'), present);
    if (present) { d.act('talk', {npcId: 'night_keeper'}); assert.equal(d.save.world.questLog.night_watch.status, 'ready'); }
    else rejected(d.save, {type: 'talk', npcId: 'night_keeper'}, 'NPC_UNAVAILABLE');
  }
});

test('world time and authored requirement snapshots roundtrip; midnight weather is cosmetic and deterministic', () => {
  const d = driver(fresh(), {persist: true}); d.act('talk', {npcId: 'yuun'}); d.act('acceptQuest', {questId: 'marsh_delivery'});
  const deadline = d.save.world.questLog.marsh_delivery.deadlineAt;
  const requirements = copy(d.save.world.travelRequirements), questRules = copy(d.save.world.questLog.marsh_delivery.objectives);
  d.act('advanceTime', {minutes: 959}); assert.equal(worldClock(d.save).hour, 23); assert.equal(d.save.world.weather, 'fair');
  d.act('advanceTime', {minutes: 1}); assert.equal(worldClock(d.save).day, 2); assert.equal(worldClock(d.save).hour, 0); assert.equal(d.save.world.weather, 'mist');
  assert.equal(d.store.load().save.world.questLog.marsh_delivery.deadlineAt, deadline);
  assert.deepEqual(d.store.load().save.world.travelRequirements, requirements);
  assert.deepEqual(d.store.load().save.world.questLog.marsh_delivery.objectives, questRules);
  assert.deepEqual(d.save.character, fresh().character);
  for (const minutes of [-1, 0, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER]) rejected(d.save, {type: 'advanceTime', minutes});
});

test('NPC service dispatch exposes functional boundaries without inventing training or commerce mutations', () => {
  const d = driver();
  for (const [npcId, service] of [['serin', 'training'], ['boro', 'equipment'], ['boro', 'crafting'], ['nari', 'tools'], ['yuun', 'consumables'], ['mira', 'rest']]) {
    const before = copy(d.save), result = d.act('requestService', {npcId, service});
    assert.deepEqual(d.save, before); assert.deepEqual(result.events, [{type: 'serviceRequested', npcId, service}]);
  }
  rejected(d.save, {type: 'requestService', npcId: 'mira', service: 'training'}, 'UNKNOWN_SERVICE');
  d.act('rest', {minutes: 60}); assert.equal(d.save.world.timeMinutes, 60);
});

test('save validation rejects damaged requirements, partial quest records and incompatible content without mutation', () => {
  const damaged = fresh(); damaged.world.travelRequirements.canal_crossing = [];
  rejected(damaged, {type: 'advanceTime', minutes: 1}, 'INVALID_TRAVEL_REQUIREMENTS');
  const malformed = fresh(); malformed.world.questLog.lost_signal.objectives = [null];
  rejected(malformed, {type: 'talk', npcId: 'serin'}, 'INVALID_QUEST');
  const puzzle = fresh(); puzzle.world.puzzleStates.bell_order.inputs = null;
  rejected(puzzle, {type: 'advanceTime', minutes: 1}, 'INVALID_PUZZLE');
});
