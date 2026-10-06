import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  act, captureChance, createGame, FACILITIES, ITEMS, loadGame, parseSave, RECIPES,
  SAVE_KEY, saveGame, serializeGame, SPECIES, tickEconomy,
  type GameState, type SpeciesId, type StorageLike,
} from './model';

function capture(state: GameState, species: SpeciesId) {
  state.inventory.card += 1;
  const result = act(state, { type: 'capture', species, hpRatio: .1, groggy: true, roll: 0 });
  assert.equal(result.ok, true, result.message);
  assert.ok(result.captured);
  return result.captured;
}
function stocked() {
  const state = createGame();
  for (const key of Object.keys(ITEMS) as (keyof typeof ITEMS)[]) state.inventory[key] = 100;
  capture(state, 'slime'); capture(state, 'stump'); capture(state, 'mushroom'); capture(state, 'boar');
  return state;
}
function build(state: GameState, type: keyof typeof FACILITIES) {
  const result = act(state, { type: 'build', facility: type });
  assert.equal(result.ok, true, result.message);
  return state.facilities.at(-1)!;
}
class MemoryStorage implements StorageLike {
  data = new Map<string, string>(); writes = 0;
  getItem(key: string) { return this.data.get(key) ?? null; }
  setItem(key: string, value: string) { this.data.set(key, value); this.writes++; }
}

test('content has six distinct collectible species, six facilities and fifteen paid recipes', () => {
  assert.equal(Object.keys(SPECIES).length, 6);
  assert.equal(Object.keys(FACILITIES).length, 6);
  assert.equal(Object.keys(RECIPES).length, 15);
  for (const recipe of Object.values(RECIPES)) {
    assert.ok(Object.values(recipe.ingredients).every(n => n > 0));
    assert.ok(Object.values(recipe.output).every(n => n > 0));
    assert.ok(recipe.seconds > 0);
  }
});

test('new expedition starts with eight cards, food, a field workbench and no free equipment', () => {
  const state = createGame();
  assert.equal(state.inventory.card, 8); assert.equal(state.inventory.food, 2);
  assert.equal(state.inventory.wood, 0); assert.equal(state.equipment.weapon, 0);
  assert.equal(state.facilities[0].type, 'workbench'); assert.equal(state.flags.campUnlocked, false);
  assert.deepEqual(parseSave(serializeGame(state)), { ok: true, state });
});

test('starter flow gathers, crafts and equips a sword, captures first friend and unlocks camp', () => {
  const state = createGame();
  assert.equal(act(state, { type: 'gather', item: 'wood', amount: 4 }).ok, true);
  assert.equal(act(state, { type: 'craft', recipeId: 'sword' }).ok, true);
  assert.equal(state.inventory.wood, 0); assert.equal(state.equipment.weapon, 0);
  tickEconomy(state, 3);
  assert.equal(state.equipment.weapon, 1); assert.equal(state.inventory.sword, 1);
  const first = act(state, { type: 'capture', species: 'slime', hpRatio: 1, roll: 1 });
  assert.equal(first.ok, true); assert.equal(first.chance, 1); assert.equal(state.inventory.card, 7);
  assert.equal(state.flags.campUnlocked, true);
  assert.equal(act(state, { type: 'camp' }).ok, true);
  assert.deepEqual(state.completedQuests.slice(0, 4), ['gather', 'sword', 'capture', 'camp']);
});

test('capture improves with low HP, groggy status and stronger cards, bounded at 90%', () => {
  const state = createGame(); capture(state, 'slime');
  const normal = captureChance(state, 'boar', 1);
  const hurt = captureChance(state, 'boar', .1);
  const groggy = captureChance(state, 'boar', .1, true);
  const strong = captureChance(state, 'boar', .1, true, true);
  assert.ok(normal < hurt && hurt < groggy && groggy < strong);
  for (const species of Object.keys(SPECIES) as SpeciesId[]) {
    assert.ok(captureChance(state, species, .1, true, 'royalCard') <= .9);
    assert.ok(captureChance(state, species, 1) >= .03);
  }
});

test('failed capture consumes exactly one selected card and grants no monster', () => {
  const state = createGame(); capture(state, 'slime'); state.inventory.enhancedCard = 2;
  const before = state.monsters.length;
  const result = act(state, { type: 'capture', species: 'boar', hpRatio: 1, card: 'enhancedCard', roll: .999 });
  assert.equal(result.ok, false); assert.equal(state.inventory.enhancedCard, 1); assert.equal(state.monsters.length, before);
});

test('invalid, dead, boss and no-card captures do not spend anything', () => {
  const state = createGame(); const original = serializeGame(state);
  assert.equal(act(state, { type: 'capture', species: 'slime', hpRatio: 0 }).ok, false);
  assert.equal(act(state, { type: 'capture', species: 'guardian' as SpeciesId, hpRatio: 1 }).ok, false);
  assert.equal(act(state, { type: 'capture', species: 'slime', hpRatio: 1, card: 'enhancedCard' }).ok, false);
  assert.equal(serializeGame(state), original);
});

test('duplicate captures leave room for every missing species instead of blocking collection progression', () => {
  const state = createGame();
  for (let i = 0; i < 55; i++) capture(state, 'slime');
  const original = serializeGame(state);
  assert.equal(act(state, { type: 'capture', species: 'slime', hpRatio: .1, roll: 0 }).ok, false);
  assert.equal(serializeGame(state), original);
  for (const species of ['mushroom', 'stump', 'octopus', 'boar', 'rare'] as const) capture(state, species);
  assert.equal(state.monsters.length, 60); assert.equal(new Set(state.monsters.map(m => m.species)).size, 6);
  assert.equal(parseSave(serializeGame(state)).ok, true);
});

test('building costs are atomic, slots bounded and occupied slots rejected', () => {
  const state = createGame(); capture(state, 'slime');
  state.inventory.wood = 4; state.inventory.stone = 1;
  const before = serializeGame(state);
  assert.equal(act(state, { type: 'build', facility: 'storage' }).ok, false);
  assert.equal(serializeGame(state), before);
  state.inventory.stone++;
  assert.equal(act(state, { type: 'build', facility: 'storage', slot: 0 }).ok, false);
  assert.equal(act(state, { type: 'build', facility: 'storage', slot: 8 }).ok, false);
  assert.equal(act(state, { type: 'build', facility: 'storage', slot: 1 }).ok, true);
  assert.equal(state.inventory.wood, 0); assert.equal(state.inventory.stone, 0);
});

test('partner and worker roles are exclusive and work suitability is enforced', () => {
  const state = stocked(); const storage = build(state, 'storage'); const farm = build(state, 'farm');
  const slime = state.monsters.find(m => m.species === 'slime')!;
  assert.equal(act(state, { type: 'assign', facilityId: farm.id, monsterId: slime.id }).ok, false);
  assert.equal(act(state, { type: 'assign', facilityId: storage.id, monsterId: slime.id }).ok, true);
  assert.equal(act(state, { type: 'partner', monsterId: slime.id }).ok, false);
  assert.equal(act(state, { type: 'assign', facilityId: state.facilities[0].id, monsterId: slime.id }).ok, false);
  act(state, { type: 'assign', facilityId: storage.id, monsterId: null });
  assert.equal(act(state, { type: 'partner', monsterId: slime.id }).ok, true);
  assert.equal(act(state, { type: 'assign', facilityId: storage.id, monsterId: slime.id }).ok, false);
});

test('collection breadth unlocks camp levels and advanced production', () => {
  const state = createGame(); capture(state, 'slime');
  assert.equal(state.campLevel, 1);
  assert.equal(act(state, { type: 'build', facility: 'logging' }).ok, false);
  capture(state, 'stump'); assert.equal(state.campLevel, 2);
  capture(state, 'mushroom'); capture(state, 'octopus'); assert.equal(state.campLevel, 3);
});

test('production needs a compatible worker and stops at finite buffer capacity', () => {
  const state = stocked(); const logging = build(state, 'logging');
  const initialWood = state.inventory.wood;
  tickEconomy(state, 60); assert.deepEqual(logging.buffer, {});
  const stump = state.monsters.find(m => m.species === 'stump')!;
  act(state, { type: 'assign', facilityId: logging.id, monsterId: stump.id });
  tickEconomy(state, 240);
  assert.equal(logging.buffer.wood, 24); assert.equal(state.inventory.wood, initialWood);
  tickEconomy(state, 240); assert.equal(logging.buffer.wood, 24);
  assert.equal(act(state, { type: 'collect', facilityId: logging.id }).ok, true);
  assert.equal(state.inventory.wood, initialWood + 24); assert.equal(logging.buffer.wood, 0);
});

test('transport moves real output into inventory with no duplication', () => {
  const state = stocked(); const logging = build(state, 'logging'); const storage = build(state, 'storage');
  logging.buffer.wood = 12;
  const stagedWood = storage.buffer.wood ?? 0;
  const before = state.inventory.wood;
  act(state, { type: 'assign', facilityId: storage.id, monsterId: state.monsters[0].id });
  tickEconomy(state, 12);
  assert.equal(logging.buffer.wood, 0); assert.equal(storage.buffer.wood, 0);
  assert.equal(state.inventory.wood, before + 12 + stagedWood); assert.equal(state.stats.transported, 12 + stagedWood);
  tickEconomy(state, 12); assert.equal(state.inventory.wood, before + 12 + stagedWood);
});

test('the first storage stages existing wood and a real transport cycle conserves it', () => {
  const state = stocked(); const before = state.inventory.wood; const storage = build(state, 'storage');
  assert.equal(storage.buffer.wood, 3);
  assert.equal(state.inventory.wood, before - 4 - 3);
  assert.equal(state.inventory.wood + storage.buffer.wood, before - 4);
  assert.equal(parseSave(serializeGame(state)).ok, true);
  act(state, { type: 'assign', facilityId: storage.id, monsterId: state.monsters[0].id });
  assert.equal(state.stats.transported, 0);
  tickEconomy(state, 3);
  assert.equal(storage.buffer.wood, 0); assert.equal(state.inventory.wood, before - 4);
  assert.equal(state.stats.transported, 3); assert.equal(state.stats.produced, 0);
  tickEconomy(state, 30);
  assert.equal(state.inventory.wood, before - 4); assert.equal(state.stats.transported, 3);
  const second = build(state, 'storage');
  assert.deepEqual(second.buffer, {}); assert.equal(state.inventory.wood, before - 8);
});

test('storage tutorial stages only available leftover wood and rejects unrelated buffer items', () => {
  for (const leftover of [0, 1, 2, 3, 4]) {
    const state = createGame(); capture(state, 'slime');
    state.inventory.wood = 4 + leftover; state.inventory.stone = 2;
    const storage = build(state, 'storage');
    assert.equal(storage.buffer.wood ?? 0, Math.min(3, leftover));
    assert.equal(state.inventory.wood, Math.max(0, leftover - 3));
    assert.equal(parseSave(serializeGame(state)).ok, true);
    storage.buffer.essence = 1;
    assert.equal(parseSave(serializeGame(state)).ok, false);
  }
});

test('legacy assignment-only storage quest completion stays valid without inventing transport', () => {
  const state = createGame();
  act(state, { type: 'gather', item: 'wood', amount: 4 });
  act(state, { type: 'craft', recipeId: 'sword' }); tickEconomy(state, 3);
  capture(state, 'slime'); act(state, { type: 'camp' });
  const storage = build(state, 'storage');
  act(state, { type: 'assign', facilityId: storage.id, monsterId: state.monsters[0].id });
  assert.equal(state.completedQuests.includes('storage'), false);
  tickEconomy(state, 3); assert.equal(state.completedQuests.includes('storage'), true);
  // Earlier v1 completed this quest on assignment, without any delivery.
  state.stats.transported = 0; storage.buffer = {};
  const parsed = parseSave(serializeGame(state)); assert.equal(parsed.ok, true);
  if (parsed.ok) {
    assert.equal(parsed.state.stats.transported, 0);
    assert.deepEqual(parsed.state.completedQuests, state.completedQuests);
  }
});

test('an exact-cost storage build can stage newly gathered wood without creating resources', () => {
  const state = createGame(); capture(state, 'slime');
  state.inventory.wood = 4; state.inventory.stone = 2;
  const storage = build(state, 'storage');
  assert.equal(state.inventory.wood, 0); assert.deepEqual(storage.buffer, {});
  const empty = serializeGame(state);
  assert.equal(act(state, { type: 'stageDelivery', facilityId: storage.id }).ok, false);
  assert.equal(serializeGame(state), empty);
  act(state, { type: 'gather', item: 'wood', amount: 2 });
  assert.equal(act(state, { type: 'stageDelivery', facilityId: storage.id }).ok, true);
  assert.equal(state.inventory.wood, 0); assert.equal(storage.buffer.wood, 2);
  assert.equal(parseSave(serializeGame(state)).ok, true);
  act(state, { type: 'assign', facilityId: storage.id, monsterId: state.monsters[0].id });
  tickEconomy(state, 3);
  assert.equal(state.inventory.wood, 2); assert.equal(storage.buffer.wood, 0); assert.equal(state.stats.transported, 2);
  const delivered = serializeGame(state);
  assert.equal(act(state, { type: 'stageDelivery', facilityId: storage.id }).ok, false);
  assert.equal(serializeGame(state), delivered);
});

test('staging is bounded to three logs and rejects pending delivery, wrong facilities and completed tutorials', () => {
  const state = stocked(); const storage = build(state, 'storage');
  for (const facilityId of [storage.id, state.facilities[0].id, 'missing']) {
    const before = serializeGame(state);
    assert.equal(act(state, { type: 'stageDelivery', facilityId }).ok, false);
    assert.equal(serializeGame(state), before);
  }
  act(state, { type: 'collect', facilityId: storage.id });
  const before = state.inventory.wood;
  assert.equal(act(state, { type: 'stageDelivery', facilityId: storage.id }).ok, true);
  assert.equal(storage.buffer.wood, 3); assert.equal(state.inventory.wood, before - 3);
  act(state, { type: 'collect', facilityId: storage.id });
  state.completedQuests.push('storage');
  const completed = serializeGame(state);
  assert.equal(act(state, { type: 'stageDelivery', facilityId: storage.id }).ok, false);
  assert.equal(serializeGame(state), completed);
});

test('crafting spends once on enqueue, advances serially, and cannot create unpaid output', () => {
  const state = createGame(); state.inventory.wood = 8;
  act(state, { type: 'craft', recipeId: 'sword' }); act(state, { type: 'craft', recipeId: 'sword' });
  assert.equal(state.inventory.wood, 0); assert.equal(state.queue.length, 2);
  const original = serializeGame(state);
  assert.equal(act(state, { type: 'craft', recipeId: 'sword' }).ok, false); assert.equal(serializeGame(state), original);
  tickEconomy(state, 3); assert.equal(state.inventory.sword, 1); assert.equal(state.queue.length, 1);
  tickEconomy(state, 3); assert.equal(state.inventory.sword, 2); assert.equal(state.queue.length, 0);
  tickEconomy(state, 60); assert.equal(state.inventory.sword, 2);
});

test('craft specialist speeds the queue while a tired worker can rest', () => {
  const normal = stocked(); const skilled = structuredClone(normal);
  const octopus = capture(skilled, 'octopus');
  act(skilled, { type: 'assign', facilityId: skilled.facilities[0].id, monsterId: octopus.id });
  act(normal, { type: 'craft', recipeId: 'ironSword' }); act(skilled, { type: 'craft', recipeId: 'ironSword' });
  tickEconomy(normal, 6); tickEconomy(skilled, 6);
  assert.equal(normal.equipment.weapon, 0); assert.equal(skilled.equipment.weapon, 2);
  assert.ok(octopus.vitality < 100);
  act(skilled, { type: 'assign', facilityId: skilled.facilities[0].id, monsterId: null });
  tickEconomy(skilled, 10); assert.equal(octopus.vitality, 100);
});

test('empty vitality pauses resource production; food consumption restores work', () => {
  const state = stocked(); const logging = build(state, 'logging');
  const stump = state.monsters.find(m => m.species === 'stump')!;
  state.inventory.food = 0; state.inventory.berry = 0; stump.vitality = 0;
  act(state, { type: 'assign', facilityId: logging.id, monsterId: stump.id });
  tickEconomy(state, 10); assert.deepEqual(logging.buffer, {}); assert.equal(stump.resting, true);
  state.inventory.food = 1; tickEconomy(state, 10);
  assert.equal(state.inventory.food, 0); assert.ok(stump.vitality > 0); assert.equal(stump.resting, false); assert.ok((logging.buffer.wood ?? 0) > 0);
});

test('an exhausted assigned worker rests without food, reloads safely and returns to the same job', () => {
  const state = stocked(); const logging = build(state, 'logging');
  const stump = state.monsters.find(m => m.species === 'stump')!;
  state.inventory.food = 0; state.inventory.berry = 0; stump.vitality = 0;
  act(state, { type: 'assign', facilityId: logging.id, monsterId: stump.id });
  tickEconomy(state, 15);
  assert.equal(stump.resting, true); assert.ok(stump.vitality > 0 && stump.vitality < 30);
  assert.deepEqual(logging.buffer, {});
  const restored = parseSave(serializeGame(state)); assert.equal(restored.ok, true);
  if (!restored.ok) return;
  tickEconomy(state, 50); tickEconomy(restored.state, 50);
  assert.deepEqual(restored.state, state);
  assert.equal(stump.resting, false); assert.equal(logging.workerId, stump.id); assert.ok((logging.buffer.wood ?? 0) > 0);
});

test('old version-one monsters without the optional resting field remain loadable', () => {
  const state = stocked();
  for (const m of state.monsters) delete m.resting;
  assert.equal(parseSave(serializeGame(state)).ok, true);
});

test('duplicate buildings cannot consume the slots needed for any missing facility type', () => {
  const state = stocked();
  build(state, 'workbench'); build(state, 'storage'); build(state, 'storage'); build(state, 'logging');
  const before = serializeGame(state);
  assert.equal(act(state, { type: 'build', facility: 'logging' }).ok, false);
  assert.equal(serializeGame(state), before);
  build(state, 'farm'); build(state, 'quarry'); build(state, 'kitchen');
  assert.equal(state.facilities.length, 8); assert.equal(new Set(state.facilities.map(f => f.type)).size, 6);
});

test('a second workbench takes an independent queue instead of remaining unusable', () => {
  const state = stocked(); const second = build(state, 'workbench');
  act(state, { type: 'craft', recipeId: 'ironSword' }); act(state, { type: 'craft', recipeId: 'ironSword' });
  assert.deepEqual(state.queue.map(q => q.facilityId), [state.facilities[0].id, second.id]);
  const before = state.inventory.ironSword;
  tickEconomy(state, 16); assert.equal(state.inventory.ironSword, before + 2); assert.equal(state.queue.length, 0);
});

test('healing consumes one item, never exceeds max HP, and does not waste food at full health', () => {
  const state = createGame();
  assert.equal(act(state, { type: 'heal' }).ok, false); assert.equal(state.inventory.food, 2);
  act(state, { type: 'damage', amount: 20 });
  assert.equal(act(state, { type: 'heal', item: 'food' }).ok, true); assert.equal(state.hp, 100); assert.equal(state.inventory.food, 1);
});

test('boss gives its rare reward only once and is never capturable', () => {
  const state = createGame();
  assert.equal(act(state, { type: 'boss' }).ok, true); const first = serializeGame(state);
  assert.equal(state.inventory.crystal, 3); assert.equal(state.campLevel, 3);
  assert.equal(act(state, { type: 'boss' }).ok, false); assert.equal(serializeGame(state), first);
});

test('queue, buffers, collection, settings and exact progress survive save/reload', () => {
  const state = stocked(); const logging = build(state, 'logging'); const storage = build(state, 'storage');
  act(state, { type: 'assign', facilityId: logging.id, monsterId: state.monsters[1].id });
  act(state, { type: 'assign', facilityId: storage.id, monsterId: state.monsters[0].id });
  act(state, { type: 'craft', recipeId: 'ironSword' }); act(state, { type: 'craft', recipeId: 'card' });
  state.settings.muted = true; tickEconomy(state, 2.5);
  const storageApi = new MemoryStorage();
  assert.equal(saveGame(storageApi, state).ok, true);
  const loaded = loadGame(storageApi); assert.equal(loaded.status, 'loaded'); assert.deepEqual(loaded.state, state);
  tickEconomy(state, 13.5); tickEconomy(loaded.state, 13.5); assert.deepEqual(loaded.state, state);
});

test('malformed saves and unsupported versions are not silently overwritten', () => {
  for (const raw of ['broken JSON', '{}', '{"version":99}', serializeGame({ ...createGame(), inventory: { wood: -1 } } as unknown as GameState)]) {
    const storage = new MemoryStorage(); storage.data.set(SAVE_KEY, raw);
    const result = loadGame(storage); assert.equal(result.status, 'error');
    assert.equal(saveGame(storage, createGame()).ok, false); assert.equal(storage.writes, 0); assert.equal(storage.getItem(SAVE_KEY), raw);
  }
});

test('save graph rejects duplicated identities, worker assignments and partner conflicts', () => {
  const state = stocked(); const storage = build(state, 'storage');
  act(state, { type: 'assign', facilityId: storage.id, monsterId: state.monsters[0].id });
  const duplicate = structuredClone(state); duplicate.monsters.push({ ...duplicate.monsters[0] });
  assert.equal(parseSave(serializeGame(duplicate)).ok, false);
  const worker = structuredClone(state); worker.facilities[0].workerId = worker.monsters[0].id;
  assert.equal(parseSave(serializeGame(worker)).ok, false);
  const partner = structuredClone(state); partner.partnerId = partner.monsters[0].id;
  assert.equal(parseSave(serializeGame(partner)).ok, false);
});

test('save graph rejects wrong identity namespaces, invalid quest order and inconsistent progression flags', () => {
  const original = stocked();
  const mutations: ((s: GameState) => void)[] = [
    s => { s.monsters[0].id = 'facility-1'; },
    s => { s.flags.campUnlocked = false; },
    s => { s.stats.captured = 0; },
    s => { s.encountered = []; },
    s => { s.completedQuests = ['guardian']; },
    s => { s.campLevel = 1; },
    s => { s.flags.automationStarted = true; },
    s => { s.monsters[0].resting = 'yes' as unknown as boolean; },
    s => { s.facilities[0].buffer = { guardianBlade: 1 }; },
    s => { s.nextId = 1; },
  ];
  for (const mutate of mutations) { const state = structuredClone(original); mutate(state); assert.equal(parseSave(serializeGame(state)).ok, false); }
});

test('natural sources can unlock all six facilities and pay for all fifteen recipes without a dependency dead end', () => {
  const state = createGame();
  const attempt = (action: Parameters<typeof act>[1]) => { const r = act(state, action); assert.equal(r.ok, true, r.message); };
  const make = (id: keyof typeof RECIPES) => { attempt({ type: 'craft', recipeId: id }); tickEconomy(state, RECIPES[id].seconds); };
  attempt({ type: 'gather', item: 'wood', amount: 4 }); make('sword');
  attempt({ type: 'capture', species: 'slime', hpRatio: 1, roll: .99 }); attempt({ type: 'camp' });
  const storage = build(state, 'storage'); attempt({ type: 'assign', facilityId: storage.id, monsterId: state.monsters[0].id });
  assert.equal(state.completedQuests.includes('storage'), false);
  tickEconomy(state, 3);
  assert.equal(state.stats.transported, 3); assert.equal(state.completedQuests.includes('storage'), true);
  make('card');
  for (const species of ['stump', 'mushroom', 'boar', 'octopus', 'rare'] as const) attempt({ type: 'capture', species, hpRatio: .1, groggy: true, roll: 0 });
  for (const type of ['logging', 'farm', 'quarry', 'kitchen'] as const) {
    for (const [item, count] of Object.entries(FACILITIES[type].cost)) while (state.inventory[item as 'wood' | 'stone'] < count) attempt({ type: 'gather', item: item as 'wood' | 'stone', amount: 5 });
    build(state, type);
  }
  const logging = state.facilities.find(f => f.type === 'logging')!;
  attempt({ type: 'assign', facilityId: logging.id, monsterId: state.monsters.find(m => m.species === 'stump')!.id });
  tickEconomy(state, 10);
  const ensure = (item: keyof typeof ITEMS, count: number, depth = 0): void => {
    assert.ok(depth < 8, 'recipe graph contains a cycle');
    while (state.inventory[item] < count) {
      if (['wood', 'stone', 'herb', 'ore'].includes(item)) attempt({ type: 'gather', item, amount: 5 });
      else if (item === 'berry' || item === 'essence') attempt({ type: 'kill', species: 'slime' });
      else if (item === 'hide') attempt({ type: 'kill', species: 'boar' });
      else if (item === 'crystal') attempt({ type: 'boss' });
      else {
        const recipe = Object.values(RECIPES).find(r => r.output[item]); assert.ok(recipe, `no source for ${item}`);
        for (const [ingredient, needed] of Object.entries(recipe.ingredients)) ensure(ingredient as keyof typeof ITEMS, needed, depth + 1);
        make(recipe.id);
      }
    }
  };
  for (const recipe of Object.values(RECIPES)) {
    for (const [item, needed] of Object.entries(recipe.ingredients)) ensure(item as keyof typeof ITEMS, needed);
    make(recipe.id);
  }
  assert.equal(state.equipment.weapon, 3); assert.equal(state.equipment.armor, 1); assert.equal(state.completedQuests.length, 10);
  assert.equal(state.flags.bossDefeated, true); assert.equal(new Set(state.facilities.map(f => f.type)).size, 6);
  assert.equal(parseSave(serializeGame(state)).ok, true); assert.ok(state.playSeconds < 600);
});

test('storage failures are explicit and never leak a successful-save claim', () => {
  const storage: StorageLike = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('quota'); } };
  assert.equal(loadGame(storage).status, 'error'); assert.equal(saveGame(storage, createGame()).ok, false);
  const quota: StorageLike = { getItem() { return null; }, setItem() { throw new Error('quota'); } };
  assert.equal(saveGame(quota, createGame()).ok, false);
});

test('finite invalid inputs cannot corrupt inventory, health or simulation time', () => {
  const state = createGame(); const before = serializeGame(state);
  act(state, { type: 'gather', item: 'wood', amount: -1 }); act(state, { type: 'gather', item: 'crystal', amount: 1 });
  act(state, { type: 'damage', amount: NaN }); tickEconomy(state, Infinity); tickEconomy(state, -10);
  assert.equal(serializeGame(state), before);
});

test('a long mixed simulation keeps all inventory and buffers nonnegative and saves valid', () => {
  const state = stocked(); const facilities = [build(state, 'logging'), build(state, 'farm'), build(state, 'quarry'), build(state, 'storage'), build(state, 'kitchen')];
  const species: SpeciesId[] = ['stump', 'mushroom', 'boar', 'slime'];
  for (let i = 0; i < 4; i++) act(state, { type: 'assign', facilityId: facilities[i].id, monsterId: state.monsters.find(m => m.species === species[i])!.id });
  const recipes = Object.keys(RECIPES) as (keyof typeof RECIPES)[];
  for (let i = 0; i < 250; i++) {
    act(state, { type: 'craft', recipeId: recipes[i % recipes.length] }); tickEconomy(state, 2);
    if (i % 10 === 0) act(state, { type: 'feed' });
    for (const n of Object.values(state.inventory)) assert.ok(n >= 0 && Number.isInteger(n));
    for (const f of state.facilities) { const count = Object.values(f.buffer).reduce((sum, n) => sum + n, 0); assert.ok(count >= 0 && count <= FACILITIES[f.type].capacity); }
    assert.equal(parseSave(serializeGame(state)).ok, true, `save invalid at step ${i}`);
  }
});
