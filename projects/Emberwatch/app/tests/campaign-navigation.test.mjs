import test from 'node:test';
import assert from 'node:assert/strict';
import {CAMPAIGN_SAVE, createCampaignSave, createCampaignStore} from '../src/campaign/save.js';
import {createCampaignController} from '../src/campaign/controller.js';
import {WORLD_CONTENT, initializeCampaignWorld, applyWorldCommand, validateCampaignWorld} from '../src/campaign/world.js';
import {createCampaignLevel, campaignFloorContains} from '../src/campaign/levels.js';
import {CAMPAIGN_NAVIGATION, initializeCampaignNavigation, validateCampaignNavigation, campaignLineOfSight, getCampaignNavigationTargets, createCampaignNavigation} from '../src/campaign/navigation.js';

const copy = value => JSON.parse(JSON.stringify(value));
const fresh = () => initializeCampaignWorld(createCampaignSave('warrior')).save;
function worldAt(nodeId, {unlocked = false} = {}) {
  const save = fresh(), w = save.world, node = WORLD_CONTENT.nodes.find(n => n.id === nodeId);
  // Explicit synthetic fixture. Actual tool/quest acquisition is also exercised
  // below through normal movement and the existing world reducer.
  w.currentNodeId = nodeId; w.currentRegionId = node.regionId;
  w.visitedNodes = WORLD_CONTENT.nodes.map(n => n.id); w.visitedLevels = WORLD_CONTENT.regions.map(r => r.id);
  if (unlocked) {
    Object.values(w.questLog).forEach(q => {q.status = 'completed';});
    w.clues = ['bell_record', 'fissure_record']; save.inventory.tools = ['tide_hook'];
    w.openedDoors = ['sluice_entry', 'cinder_gate']; w.openedShortcuts = ['drain_return']; w.bossFlags.drowned_warden = true;
    w.puzzleStates.bell_order = {inputs: ['cinder', 'reed', 'bell'], solved: true};
    w.puzzleStates.water_balance = {controls: {intake: false, bypass: true, spill: true}, solved: true};
  }
  assert(validateCampaignWorld(save).ok); return save;
}
async function fixture(save = fresh(), options = {}) {
  const data = new Map(), storage = {fail: null, getItem: key => data.get(key) ?? null, setItem(key, value) {if (this.fail === key) throw Error('quota'); data.set(key, value);}};
  const store = createCampaignStore(storage), gate = {hold: false, releases: [], writes: 0};
  const session = {...store, async save(value, expected) {
    gate.writes++;
    if (gate.hold) await new Promise(resolve => gate.releases.push(resolve));
    return store.save(value, expected);
  }};
  const controller = createCampaignController(session);
  assert((await controller.start('warrior', () => ({ok: true, save}))).ok);
  const navigation = createCampaignNavigation(controller, {speed: 320, ...options});
  assert((await navigation.restore()).ok);
  return {navigation, controller, store, storage, gate};
}
async function walkTo(f, target) {
  for (let step = 0; step < 1000; step++) {
    const p = f.navigation.view().position, dx = target.x - p.x, dy = target.y - p.y;
    if (Math.hypot(dx, dy) < .001) return;
    const move = f.navigation.step({x: dx / 32, y: dy / 32}, .1);
    if (move.commit) {const result = await move.commit; assert(result.ok, result.code);}
    else assert(!move.blocked, `Blocked before ${JSON.stringify(target)} from ${JSON.stringify(p)}`);
  }
  assert.fail('Movement did not converge');
}
async function use(f, command) {
  const target = getCampaignNavigationTargets(f.controller.snapshot()).find(t => command.type === 'acceptQuest' || command.type === 'turnInQuest'
    ? t.id === `npc:${WORLD_CONTENT.quests.find(q => q.id === command.questId)[command.type === 'acceptQuest' ? 'giver' : 'turnIn']}`
    : t.command.type === command.type && Object.entries(command).every(([key, value]) => key === 'type' || t.command[key] === value));
  assert(target, JSON.stringify(command)); await walkTo(f, target);
  const result = await f.navigation.request(command); assert(result.ok, `${command.type}: ${result.code}`); return result;
}
async function walkExit(f, exitId) {
  const exit = WORLD_CONTENT.exits.find(e => e.id === exitId), map = f.navigation.level();
  assert.equal(f.navigation.view().nodeId, exit.from);
  await walkTo(f, map.anchors[exit.from]);
  const portal = map.portals.find(p => p.id === exit.id);
  if (portal) {
    await walkTo(f, portal);
    const result = f.navigation.step({interact: true}, 0); assert(result.commit); assert((await result.commit).ok);
    f.navigation.step({interact: false}, 0);
  } else {
    const corridor = map.corridors.find(c => c.from === exit.from && c.to === exit.to || c.from === exit.to && c.to === exit.from);
    for (const point of corridor.from === exit.from ? corridor.points : [...corridor.points].reverse()) await walkTo(f, point);
  }
  assert.equal(f.navigation.view().nodeId, exit.to); assert(validateCampaignNavigation(f.store.load().save).ok);
}
const tick = () => new Promise(resolve => setImmediate(resolve));

test('migration preserves progressed worlds, character, inventory, and source; malformed/newer positions fail closed', () => {
  const before = worldAt('water_valves'), original = copy(before), result = initializeCampaignNavigation(before);
  assert(result.ok); assert.deepEqual(before, original);
  assert.deepEqual(result.save.world.navigation.positions.sunken_hall_2, {nodeId: 'water_valves', ...createCampaignLevel('sunken_hall_2').anchors.water_valves});
  assert.deepEqual(result.save.character, before.character); assert.deepEqual(result.save.inventory, before.inventory);
  assert(initializeCampaignNavigation(result.save).unchanged);
  for (const change of [s => s.world.navigation.version = 9, s => s.world.navigation.layoutVersion = 9, s => s.world.navigation.positions.sunken_hall_2.x = 0,
    s => s.world.navigation.positions.sunken_hall_2.nodeId = 'hamlet_square', s => s.world.navigation.positions = {},
    s => s.world.navigation.positions.missing = {nodeId: 'water_valves', x: 1, y: 1}]) {
    const damaged = copy(result.save); change(damaged); const snapshot = copy(damaged);
    assert(!initializeCampaignNavigation(damaged).ok); assert.deepEqual(damaged, snapshot);
  }
});

test('movement speed is explicit; normalized world-space input ignores camera and rejects non-finite movement', async () => {
  assert.throws(() => createCampaignNavigation({}), /explicit/);
  const a = await fixture(), b = await fixture(), start = a.navigation.view().position;
  a.navigation.step({x: 1, camera: {zoom: 100}}, .1); b.navigation.step({x: 1, y: 1, camera: {zoom: .01}}, .1);
  const p = a.navigation.view().position, q = b.navigation.view().position;
  assert(Math.abs(Math.hypot(p.x - start.x, p.y - start.y) - Math.hypot(q.x - start.x, q.y - start.y)) < 1e-9);
  const snapshot = b.navigation.view().position;
  assert.equal(b.navigation.step(null, .1).code, 'INVALID_MOVEMENT');
  assert.equal(b.navigation.step({x: NaN}, .1).code, 'INVALID_MOVEMENT');
  assert.equal(b.navigation.step({x: 1}, Infinity).code, 'INVALID_MOVEMENT'); assert.deepEqual(b.navigation.view().position, snapshot);
});

test('swept movement stops at walls, slides around corners, and clamps suspended frames', async () => {
  const f = await fixture(fresh(), {speed: 10000});
  f.navigation.step({x: 1}, 100); const wall = f.navigation.view().position;
  assert(campaignFloorContains(f.navigation.level(), wall.x, wall.y)); assert(wall.x < 27 * 32);
  f.navigation.step({x: 1, y: -1}, .01); const slid = f.navigation.view().position;
  assert(slid.y < wall.y); assert(campaignFloorContains(f.navigation.level(), slid.x, slid.y));
  const a = await fixture(), b = await fixture(); a.navigation.step({x: 1}, 100); b.navigation.step({x: 1}, .1);
  assert.deepEqual(a.navigation.view().position, b.navigation.view().position);
});

test('line of sight rejects walls and exact diagonal wall corners', () => {
  const map = {tiles: [[1, 0, 1], [1, 1, 1], [1, 1, 1]]};
  assert(!campaignLineOfSight(map, {x: 16, y: 16}, {x: 80, y: 16}));
  assert(!campaignLineOfSight(map, {x: 16, y: 16}, {x: 48, y: 48}));
  assert(campaignLineOfSight(map, {x: 16, y: 48}, {x: 80, y: 48}));
  assert(!campaignLineOfSight(map, {x: NaN, y: 0}, {x: 48, y: 48}));
});

test('remote clicks cannot travel, talk, collect, solve puzzles, rest, or grant combat rewards', async () => {
  const f = await fixture(), before = f.controller.snapshot();
  for (const command of [{type: 'talk', npcId: 'serin'}, {type: 'rest', minutes: 60}, {type: 'travel', exitId: 'hamlet_pine'}, {type: 'interact', interactionId: 'hook_cache'}, {type: 'puzzleInput', puzzleId: 'bell_order', input: 'cinder'}]) assert(!(await f.navigation.request(command)).ok);
  assert.equal((await f.navigation.request({type: 'travel', exitId: 'pine_lookout_path'})).code, 'WALK_TO_DESTINATION');
  assert.equal((await f.navigation.request({type: 'defeatEncounter', encounterId: 'road_cinderling'})).code, 'UNSUPPORTED_NAVIGATION_COMMAND');
  assert.equal((await f.navigation.request({type: 'advanceTime', minutes: 60})).code, 'UNSUPPORTED_NAVIGATION_COMMAND');
  assert.deepEqual(f.controller.snapshot(), before);
});

test('nearby NPC actions reuse quest and service rules; walking away closes physical authority', async () => {
  const f = await fixture();
  await use(f, {type: 'talk', npcId: 'serin'});
  assert((await f.navigation.request({type: 'acceptQuest', questId: 'lost_signal'})).ok);
  const service = await f.navigation.request({type: 'requestService', npcId: 'serin', service: 'training'});
  assert.deepEqual(service.events, [{type: 'serviceRequested', npcId: 'serin', service: 'training'}]);
  await walkTo(f, f.navigation.level().anchors.hamlet_square);
  assert.equal((await f.navigation.request({type: 'requestService', npcId: 'serin', service: 'training'})).code, 'TARGET_OUT_OF_REACH');
});

test('paused and held input cannot activate a target on resume or repeat a chest', async () => {
  const f = await fixture(worldAt('pine_gate'));
  await walkTo(f, getCampaignNavigationTargets(f.controller.snapshot()).find(t => t.kind === 'chest'));
  const initial = f.navigation.view().position, revision = f.controller.revision();
  f.navigation.step({x: 1, interact: true, paused: true}, .1);
  assert.deepEqual(f.navigation.view().position, initial);
  assert.equal((await f.navigation.request({type: 'interact', interactionId: 'pine_supply_cache'})).code, 'NAVIGATION_PAUSED');
  assert.equal(f.navigation.step({interact: true, paused: false}, 0).commit, null);
  assert.equal(f.controller.revision(), revision);
  f.navigation.step({interact: false}, 0);
  assert((await f.navigation.step({interact: true}, 0).commit).ok);
  const after = f.controller.revision();
  for (let i = 0; i < 20; i++) assert.equal(f.navigation.step({interact: true}, 0).commit, null);
  assert.equal(f.controller.revision(), after); assert.equal(f.controller.snapshot().inventory.materials.salvaged_iron, 1);
});

test('portal saves serialize before visibility and require physical departure before returning', async () => {
  const f = await fixture(); await walkTo(f, f.navigation.level().portals[0]);
  const before = f.navigation.view(), minutes = f.controller.snapshot().world.timeMinutes;
  f.gate.hold = true; const transition = f.navigation.step({interact: true}, 0).commit;
  assert(transition); assert(f.navigation.view().pending); await tick();
  assert.equal(f.navigation.view().regionId, 'ash_hamlet'); assert.deepEqual(f.navigation.view().position, before.position);
  assert.equal((await f.navigation.request({type: 'travel', exitId: 'hamlet_pine'})).code, 'NAVIGATION_PENDING');
  assert.equal(f.navigation.step({x: 1, interact: true}, .1).code, 'NAVIGATION_PENDING');
  assert.equal(f.gate.releases.length, 1); f.gate.hold = false; f.gate.releases.shift()(); assert((await transition).ok);
  assert.equal(f.navigation.view().regionId, 'pine_reach'); assert.equal(f.controller.snapshot().world.timeMinutes, minutes + 8);
  assert.equal(f.navigation.step({interact: true}, 0).commit, null);
  assert.equal((await f.navigation.request({type: 'travel', exitId: 'hamlet_pine_back'})).code, 'PORTAL_DEPARTURE_REQUIRED');
  await walkExit(f, 'hamlet_pine_back'); assert.equal(f.controller.snapshot().world.timeMinutes, minutes + 16);
});

test('failed portal and reward writes leave visible and durable state unchanged and permit an explicit retry', async () => {
  const f = await fixture(); await walkTo(f, f.navigation.level().portals[0]);
  const before = f.navigation.view().position, persisted = f.store.load().save;
  f.storage.fail = CAMPAIGN_SAVE.head;
  assert.equal((await f.navigation.request({type: 'travel', exitId: 'hamlet_pine'})).code, 'WRITE_FAILED');
  assert.deepEqual(f.navigation.view().position, before); assert.equal(f.navigation.view().regionId, 'ash_hamlet'); assert.deepEqual(f.store.load().save, persisted);
  f.storage.fail = null; assert((await f.navigation.request({type: 'travel', exitId: 'hamlet_pine'})).ok);
  await walkTo(f, getCampaignNavigationTargets(f.controller.snapshot()).find(t => t.kind === 'chest'));
  f.storage.fail = CAMPAIGN_SAVE.head;
  assert.equal((await f.navigation.request({type: 'interact', interactionId: 'pine_supply_cache'})).code, 'WRITE_FAILED');
  assert.equal(f.controller.snapshot().inventory.materials.salvaged_iron, undefined);
  f.storage.fail = null; assert((await f.navigation.request({type: 'interact', interactionId: 'pine_supply_cache'})).ok);
  assert.equal(f.store.load().save.inventory.materials.salvaged_iron, 1);
});

test('same-region walking commits its authored edge and elapsed time before room entry is visible', async () => {
  const f = await fixture(worldAt('pine_gate'));
  await walkTo(f, {x: f.navigation.view().position.x, y: 15 * 32 + 8});
  f.gate.hold = true; const before = f.navigation.view().position;
  const move = f.navigation.step({y: -1}, .1); assert(move.commit); await tick();
  assert.equal(f.navigation.view().nodeId, 'pine_gate'); assert(f.navigation.view().position.y >= 15 * 32);
  assert(f.navigation.view().position.y <= before.y);
  f.gate.hold = false; f.gate.releases.shift()(); assert((await move.commit).ok);
  assert.equal(f.navigation.view().nodeId, 'pine_lookout'); assert.equal(f.controller.snapshot().world.timeMinutes, 4);
  assert(f.navigation.view().position.y < 15 * 32);
});

test('locked same-region doorway cannot be crossed through overlapping corridors or long steps', async () => {
  const f = await fixture(worldAt('hall_bells'), {speed: 10000});
  const gate = f.navigation.view().gates.find(g => g.exitId === 'bell_stairway'); assert(gate);
  for (let i = 0; i < 5; i++) f.navigation.step({x: 1, y: -1}, .1);
  assert.equal(f.navigation.view().nodeId, 'hall_bells'); assert(!f.controller.snapshot().world.puzzleStates.bell_order.solved);
  assert(campaignFloorContains(f.navigation.level(), f.navigation.view().position.x, f.navigation.view().position.y));
  assert.equal((await f.navigation.request({type: 'travel', exitId: 'bell_stairway'})).code, 'WALK_TO_DESTINATION');
});

test('saved positions cannot move across a locked route or masquerade as an adjacent node', () => {
  const initial = initializeCampaignNavigation(worldAt('hall_bells')).save;
  const corridor = createCampaignLevel('sunken_hall_1').corridors.find(c => c.id === 'bell_stairway');
  const locked = copy(initial); Object.assign(locked.world.navigation.positions.sunken_hall_1, corridor.points[1]);
  assert.equal(validateCampaignNavigation(locked).code, 'NAVIGATION_BEHIND_GATE');
  const wrongRoom = copy(initial); Object.assign(wrongRoom.world.navigation.positions.sunken_hall_1, createCampaignLevel('sunken_hall_1').anchors.hall_stairs);
  assert.equal(validateCampaignNavigation(wrongRoom).code, 'INVALID_NAVIGATION_POSITION');
});

test('each puzzle control requires proximity to that control even with misleading extra command fields', async () => {
  const f = await fixture(worldAt('water_valves'));
  const target = getCampaignNavigationTargets(f.controller.snapshot()).find(t => t.id === 'puzzle:water_balance:intake');
  await walkTo(f, target);
  assert.equal((await f.navigation.request({type: 'puzzleInput', puzzleId: 'water_balance', input: 'intake', control: 'spill', value: true})).code, 'TARGET_OUT_OF_REACH');
  assert((await f.navigation.request({type: 'puzzleInput', puzzleId: 'water_balance', control: 'intake', value: false})).ok);
  assert.equal(f.controller.snapshot().world.puzzleStates.water_balance.controls.spill, false);
});

test('nearby puzzle solving opens the physical gate and the shortcut persists through restart', async () => {
  const initial = worldAt('water_valves'), f = await fixture(initial);
  for (const [control, value] of [['intake', false], ['bypass', true], ['spill', true]]) await use(f, {type: 'puzzleInput', puzzleId: 'water_balance', control, value});
  assert(f.controller.snapshot().world.puzzleStates.water_balance.solved);
  await walkExit(f, 'drained_walkway'); await use(f, {type: 'interact', interactionId: 'drain_return'}); await walkExit(f, 'bank_shortcut');
  const reloaded = createCampaignController(f.store); assert((await reloaded.load()).ok);
  const navigation = createCampaignNavigation(reloaded, {speed: 320}); assert((await navigation.restore()).ok);
  const g = {...f, navigation, controller: reloaded}; await use(g, {type: 'interact', interactionId: 'bank_memorial_cache'}); await walkExit(g, 'bank_pine');
  assert.equal(g.navigation.view().nodeId, 'pine_canal');
  assert.equal(g.controller.snapshot().inventory.rewardDescriptors.filter(item => item.id === 'waterkeeper_band').length, 1);
});

test('pending two-phase interactions keep rewards uncommitted and reject completion after walking away', async () => {
  const f = await fixture(worldAt('pine_gate'));
  await walkTo(f, getCampaignNavigationTargets(f.controller.snapshot()).find(t => t.kind === 'chest'));
  assert((await f.navigation.request({type: 'beginInteraction', interactionId: 'pine_supply_cache', token: 'nav:chest'})).ok);
  assert.equal(f.controller.snapshot().inventory.materials.salvaged_iron, undefined);
  await walkTo(f, f.navigation.level().anchors.pine_gate);
  assert.equal((await f.navigation.request({type: 'commitInteraction', token: 'nav:chest'})).code, 'TARGET_OUT_OF_REACH');
  await walkTo(f, getCampaignNavigationTargets(f.controller.snapshot()).find(t => t.kind === 'chest'));
  assert((await f.navigation.request({type: 'commitInteraction', token: 'nav:chest'})).ok);
  assert.equal((await f.navigation.request({type: 'commitInteraction', token: 'nav:chest'})).code, 'NO_PENDING_INTERACTION');
  assert.equal(f.controller.snapshot().inventory.materials.salvaged_iron, 1);
});

test('incompatible or failed navigation migration never exposes an uncommitted actor', async () => {
  const f = await fixture(), controller = createCampaignController(f.store);
  await controller.load();
  assert((await controller.dispatch({}, save => {delete save.world.navigation; return {ok: true, save};})).ok);
  const navigation = createCampaignNavigation(controller, {speed: 320}); f.storage.fail = CAMPAIGN_SAVE.head;
  assert.equal((await navigation.restore()).code, 'WRITE_FAILED'); assert.equal(navigation.view().code, 'NAVIGATION_NOT_READY');
  f.storage.fail = null; assert((await navigation.restore()).ok);
  assert((await controller.dispatch({}, save => {save.world.navigation.version = 99; return {ok: true, save};})).ok);
  assert.equal((await navigation.restore()).code, 'NAVIGATION_VERSION'); assert.equal(navigation.view().code, 'NAVIGATION_NOT_READY');
});

test('every directed authored edge can be walked or used at its actual portal when requirements are fulfilled', async () => {
  for (const exit of WORLD_CONTENT.exits) {
    const f = await fixture(worldAt(exit.from, {unlocked: true}));
    const travelled = []; f.controller.subscribe(event => travelled.push(...(event.events ?? []).filter(e => e.type === 'travelled')));
    await walkExit(f, exit.id);
    assert(travelled.some(event => event.exitId === exit.id), exit.id);
    assert.equal(f.controller.snapshot().world.timeMinutes, travelled.reduce((total, event) => total + WORLD_CONTENT.exits.find(e => e.id === event.exitId).minutes, 0), exit.id);
  }
});

test('physical first-quest journey acquires the tool, revisits the village and opens the gated dungeon', async () => {
  const f = await fixture();
  await use(f, {type: 'talk', npcId: 'serin'}); await use(f, {type: 'acceptQuest', questId: 'lost_signal'}); await use(f, {type: 'talk', npcId: 'nari'});
  await walkExit(f, 'hamlet_pine'); await walkExit(f, 'pine_canal_path');
  await walkTo(f, f.navigation.level().portals.find(p => p.id === 'canal_crossing'));
  assert.equal((await f.navigation.request({type: 'travel', exitId: 'canal_crossing'})).code, 'REQUIREMENTS');
  await walkExit(f, 'pine_canal_path_back'); await walkExit(f, 'pine_lookout_path');
  await use(f, {type: 'interact', interactionId: 'read_bell_record'});
  await walkExit(f, 'pine_lookout_path_back'); await walkExit(f, 'ridge_route'); await walkExit(f, 'shed_path');
  await use(f, {type: 'interact', interactionId: 'hook_cache'});
  assert(f.controller.snapshot().inventory.tools.includes('tide_hook'));
  await walkExit(f, 'shed_path_back'); await walkExit(f, 'ridge_route_back'); await walkExit(f, 'hamlet_pine_back');
  await use(f, {type: 'turnInQuest', questId: 'lost_signal'});
  await walkExit(f, 'hamlet_pine'); await walkExit(f, 'pine_canal_path');
  await use(f, {type: 'interact', interactionId: 'sluice_entry'}); await walkExit(f, 'canal_crossing');
  assert.equal(f.navigation.view().nodeId, 'hall_foyer'); assert.equal(f.controller.snapshot().world.questLog.lost_signal.status, 'completed');
  assert.equal(f.controller.snapshot().world.rewardReceipts['interaction:hook_cache'].rewards.filter(r => r.kind === 'tool').length, 1);
});

test('stopping movement saves exact position, reload restores it, and other entrances cannot reuse an unrelated room position', async () => {
  const f = await fixture(); f.navigation.step({x: 1, y: 1}, .1);
  const exact = f.navigation.view().position; const stop = f.navigation.step({}, 0); assert(stop.commit); assert((await stop.commit).ok);
  const controller = createCampaignController(f.store); assert((await controller.load()).ok);
  const resumed = createCampaignNavigation(controller, {speed: 320}); assert((await resumed.restore()).ok); assert.deepEqual(resumed.view().position, exact);
  const g = await fixture(worldAt('pine_canal', {unlocked: true}));
  await walkExit(g, 'canal_crossing'); await walkExit(g, 'canal_crossing_back'); await walkExit(g, 'pine_canal_path_back'); await walkExit(g, 'hamlet_pine_back'); await walkExit(g, 'hamlet_pine');
  assert.equal(g.navigation.view().nodeId, 'pine_gate');
  const arrival = g.navigation.level().portals.find(p => p.id === 'hamlet_pine_back');
  assert.deepEqual(g.navigation.view().position, {x: arrival.x, y: arrival.y});
  assert(g.controller.snapshot().world.navigation.positions.sunken_hall_1);
});

test('queued unrelated commits invalidate stale navigation intent without overwriting new state', async () => {
  const f = await fixture(); await walkTo(f, f.navigation.level().portals[0]);
  f.gate.hold = true;
  const other = f.controller.dispatch({type: 'external'}, save => {save.gold++; return {ok: true, save};});
  await tick(); const transition = f.navigation.request({type: 'travel', exitId: 'hamlet_pine'});
  f.gate.hold = false; f.gate.releases.shift()(); assert((await other).ok);
  assert.equal((await transition).code, 'STALE_NAVIGATION'); assert.equal(f.controller.snapshot().gold, 1); assert.equal(f.navigation.view().regionId, 'ash_hamlet');
});

test('navigation snapshots cannot mutate the actor or frozen geometry; an external location change needs restore', async () => {
  const f = await fixture(); const view = f.navigation.view(); view.position.x = 0; view.targets.length = 0;
  assert(f.navigation.view().position.x > 0); assert(Object.isFrozen(f.navigation.level().tiles[0]));
  const result = await f.controller.dispatch({type: 'travel', exitId: 'hamlet_pine'}, (save, command) => {
    const moved = applyWorldCommand(save, command); delete moved.save.world.navigation; return initializeCampaignNavigation(moved.save);
  });
  assert(result.ok); assert.equal(f.navigation.step({x: 1}, .1).code, 'EXTERNAL_LOCATION_CHANGE');
  assert((await f.navigation.restore()).ok); assert.equal(f.navigation.view().nodeId, 'pine_gate');
});

test('an external position change in the same node cannot be overwritten by stale local movement', async () => {
  const f = await fixture();
  assert((await f.controller.dispatch({}, save => {save.world.navigation.positions.ash_hamlet.x += 32; return {ok: true, save};})).ok);
  const stored = copy(f.controller.snapshot().world.navigation.positions.ash_hamlet);
  assert.equal(f.navigation.step({x: -1}, .1).code, 'EXTERNAL_POSITION_CHANGE');
  assert.equal((await f.navigation.checkpoint()).code, 'EXTERNAL_POSITION_CHANGE');
  assert.deepEqual(f.controller.snapshot().world.navigation.positions.ash_hamlet, stored);
  assert((await f.navigation.restore()).ok); assert.deepEqual(f.navigation.view().position, {x: stored.x, y: stored.y});
});
