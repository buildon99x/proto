import {WORLD_CONTENT, applyWorldCommand, getWorldView, validateCampaignWorld} from './world.js';
import {createCampaignLevel, campaignFloorContains, moveCampaignActor} from './levels.js';

// Geometry/UI distances, not character statistics or reference-game balance.
export const CAMPAIGN_NAVIGATION = Object.freeze({version: 1, radius: 12, reach: 48, maxFrameSeconds: .1});
const copy = value => JSON.parse(JSON.stringify(value));
const record = value => !!value && typeof value === 'object' && !Array.isArray(value);
const nodes = Object.assign(Object.create(null), Object.fromEntries(WORLD_CONTENT.nodes.map(node => [node.id, node])));
const exits = Object.assign(Object.create(null), Object.fromEntries(WORLD_CONTENT.exits.map(exit => [exit.id, exit])));
const levels = new Map();
const freeze = value => {if (value && typeof value === 'object') {Object.values(value).forEach(freeze); Object.freeze(value);} return value;};
const level = id => {if (!levels.has(id)) levels.set(id, freeze(createCampaignLevel(id))); return levels.get(id);};
const fail = (code, extra = {}) => ({ok: false, code, ...extra});
const inRoom = (room, x, y) => x >= room.x * 32 && x < (room.x + room.w) * 32 && y >= room.y * 32 && y < (room.y + room.h) * 32;
const roomAt = (map, x, y) => map.rooms.find(room => inRoom(room, x, y));
const corridorFor = (map, exit) => map.corridors.find(c => c.from === exit.from && c.to === exit.to || c.from === exit.to && c.to === exit.from);
function onCorridor(corridor, tx, ty) {
  return corridor.points.slice(1).some((b, i) => {
    const a = corridor.points[i], ax = Math.floor(a.x / 32), ay = Math.floor(a.y / 32), bx = Math.floor(b.x / 32), by = Math.floor(b.y / 32);
    return tx >= Math.min(ax, bx) - 1 && tx <= Math.max(ax, bx) + 1 && ty >= Math.min(ay, by) - 1 && ty <= Math.max(ay, by) + 1;
  });
}
function positionFits(map, position) {
  if (!record(position) || !Number.isFinite(position.x) || !Number.isFinite(position.y) || nodes[position.nodeId]?.regionId !== map.id || !campaignFloorContains(map, position.x, position.y, CAMPAIGN_NAVIGATION.radius)) return false;
  const room = roomAt(map, position.x, position.y);
  if (room?.id === position.nodeId) return true;
  if (room && WORLD_CONTENT.exits.some(exit => exit.from === position.nodeId && exit.to === room.id)) return false;
  // Some fixed L galleries cross a third room (the dock gallery crosses the
  // shed). Traversing the authored gallery is valid without inventing an edge.
  return map.corridors.some(c => (c.from === position.nodeId || c.to === position.nodeId) && onCorridor(c, Math.floor(position.x / 32), Math.floor(position.y / 32)));
}

export function validateCampaignNavigation(save) {
  const world = validateCampaignWorld(save);
  if (!world.ok) return world;
  const nav = save.world.navigation;
  if (!record(nav)) return fail('NAVIGATION_MISSING');
  if (nav.version !== CAMPAIGN_NAVIGATION.version || nav.layoutVersion !== 1) return fail('NAVIGATION_VERSION');
  if (!record(nav.positions)) return fail('INVALID_NAVIGATION_POSITIONS');
  for (const [regionId, position] of Object.entries(nav.positions)) {
    if (!WORLD_CONTENT.regions.some(region => region.id === regionId) || !save.world.visitedLevels.includes(regionId) || !save.world.visitedNodes.includes(position?.nodeId) || !positionFits(level(regionId), position)) return fail('INVALID_NAVIGATION_POSITION', {regionId});
  }
  const current = nav.positions[save.world.currentRegionId];
  if (!current || current.nodeId !== save.world.currentNodeId) return fail('NAVIGATION_LOCATION_MISMATCH');
  if (!campaignFloorContains(collisionLevel(save), current.x, current.y, CAMPAIGN_NAVIGATION.radius)) return fail('NAVIGATION_BEHIND_GATE');
  return {ok: true};
}

// Adds an optional field to campaign.v2; never replaces progress or guesses a
// repair for an invalid/newer navigation record. Existing saves start at their
// already committed node, not at the campaign's first region.
export function initializeCampaignNavigation(save) {
  const world = validateCampaignWorld(save);
  if (!world.ok) return {...world, save};
  if (save.world.navigation !== undefined) {
    const check = validateCampaignNavigation(save);
    return check.ok ? {ok: true, save, unchanged: true, events: []} : {...check, save};
  }
  const next = copy(save), w = next.world;
  w.navigation = {version: CAMPAIGN_NAVIGATION.version, layoutVersion: 1, positions: {
    [w.currentRegionId]: {nodeId: w.currentNodeId, ...level(w.currentRegionId).anchors[w.currentNodeId]}
  }};
  return {ok: true, save: next, events: [{type: 'navigationInitialized'}]};
}

// A closed segment touching a wall corner is obstructed. Tile sampling alone
// misses this diagonal case; clip against every intersected wall rectangle.
export function campaignLineOfSight(map, from, to) {
  if (![from?.x, from?.y, to?.x, to?.y].every(Number.isFinite) || !campaignFloorContains(map, from.x, from.y, 0) || !campaignFloorContains(map, to.x, to.y, 0)) return false;
  const dx = to.x - from.x, dy = to.y - from.y;
  const intersects = (left, top) => {
    let low = 0, high = 1;
    for (const [start, delta, min, max] of [[from.x, dx, left, left + 32], [from.y, dy, top, top + 32]]) {
      if (delta === 0) {if (start < min || start > max) return false;}
      else {const a = (min - start) / delta, b = (max - start) / delta; low = Math.max(low, Math.min(a, b)); high = Math.min(high, Math.max(a, b)); if (low > high) return false;}
    }
    return true;
  };
  for (let y = Math.floor(Math.min(from.y, to.y) / 32) - 1; y <= Math.floor(Math.max(from.y, to.y) / 32); y++) {
    for (let x = Math.floor(Math.min(from.x, to.x) / 32) - 1; x <= Math.floor(Math.max(from.x, to.x) / 32); x++) {
      if (map.tiles[y]?.[x] !== 1 && intersects(x * 32, y * 32)) return false;
    }
  }
  return true;
}

export function getCampaignNavigationTargets(save) {
  const view = getWorldView(save);
  if (!view.ok) return [];
  const map = level(view.region.id), anchor = map.anchors[view.node.id], result = [];
  // Placement uses the complete authored NPC order, so a time-window change
  // cannot move another NPC under a held interaction key.
  const localNpcs = WORLD_CONTENT.npcs.filter(npc => npc.nodeId === view.node.id);
  for (const npc of view.npcs) {
    const index = localNpcs.findIndex(item => item.id === npc.id);
    result.push({id: `npc:${npc.id}`, kind: 'npc', nodeId: view.node.id, name: npc.name, x: anchor.x + (index - (localNpcs.length - 1) / 2) * 48, y: anchor.y - 64, command: {type: 'talk', npcId: npc.id}});
  }
  for (const item of view.interactions) if (!item.used) result.push({id: `interaction:${item.id}`, kind: item.kind, nodeId: view.node.id, name: item.name, x: anchor.x, y: anchor.y - 64, missing: item.missing, command: {type: 'interact', interactionId: item.id}});
  for (const puzzle of view.puzzles) if (!puzzle.state.solved) {
    const controls = puzzle.kind === 'sequence' ? puzzle.symbols : puzzle.controls;
    controls.forEach((control, index) => result.push({id: `puzzle:${puzzle.id}:${control.id}`, kind: 'puzzle', nodeId: view.node.id, name: `${puzzle.name}: ${control.name}`, x: anchor.x + (index - (controls.length - 1) / 2) * 64, y: anchor.y - 64, missing: puzzle.missing,
      command: puzzle.kind === 'sequence' ? {type: 'puzzleInput', puzzleId: puzzle.id, input: control.id} : {type: 'puzzleInput', puzzleId: puzzle.id, control: control.id, value: !puzzle.state.controls[control.id]}}));
  }
  for (const portal of map.portals.filter(p => p.nodeId === view.node.id)) {
    const exit = view.exits.find(e => e.id === portal.id);
    if (exit.hidden && exit.locked) continue;
    result.push({id: `portal:${exit.id}`, kind: 'portal', nodeId: view.node.id, name: exit.destination.name, x: portal.x, y: portal.y, missing: exit.missing, command: {type: 'travel', exitId: exit.id}});
  }
  return result;
}

function collisionLevel(save) {
  const map = level(save.world.currentRegionId), view = getWorldView(save), allowed = view.exits.filter(exit => !exit.locked && exit.destination.regionId === map.id);
  const rooms = map.rooms.filter(room => room.id === view.node.id || allowed.some(exit => exit.to === room.id));
  const corridors = allowed.map(exit => corridorFor(map, exit)).filter(Boolean);
  // A gallery junction can sit inside an adjacent room. Keep its exit throat
  // open; crossing onto that gallery first commits the real edge back to its
  // owning node. This avoids trapping actors in incidental overlapping rooms.
  for (const exit of allowed) {
    const probe = copy(save); probe.world.currentNodeId = exit.to;
    for (const next of getWorldView(probe).exits.filter(e => !e.locked && e.destination.regionId === map.id)) {
      const corridor = corridorFor(map, next); if (corridor) corridors.push(corridor);
    }
  }
  const tiles = map.tiles.map((row, y) => row.map((tile, x) => tile && (rooms.some(room => inRoom(room, x * 32 + 16, y * 32 + 16)) || corridors.some(c => onCorridor(c, x, y))) ? 1 : 0));
  return {...map, tiles};
}
function doorway(map, exit) {
  const corridor = corridorFor(map, exit);
  if (!corridor) return null;
  const points = corridor.from === exit.from ? corridor.points : [...corridor.points].reverse(), start = points[0], next = points.find(p => p.x !== start.x || p.y !== start.y);
  const room = map.rooms.find(r => r.id === exit.from), dx = Math.sign(next.x - start.x), dy = Math.sign(next.y - start.y);
  return {x: dx > 0 ? (room.x + room.w) * 32 : dx < 0 ? room.x * 32 : start.x, y: dy > 0 ? (room.y + room.h) * 32 : dy < 0 ? room.y * 32 : start.y, axis: dx ? 'vertical' : 'horizontal'};
}
function putPosition(save, position) {
  save.world.navigation.positions[save.world.currentRegionId] = {nodeId: save.world.currentNodeId, x: position.x, y: position.y};
}
function arrivalFor(exit) {
  const map = level(nodes[exit.to].regionId);
  // Always enter through this edge. A saved coordinate from another entrance
  // must never teleport the actor beyond a door or shortcut.
  const portal = map.portals.find(p => p.nodeId === exit.to && p.destinationNodeId === exit.from);
  return portal ? {x: portal.x, y: portal.y} : {...map.anchors[exit.to]};
}

export function createCampaignNavigation(controller, {speed} = {}) {
  if (!Number.isFinite(speed) || speed <= 0) throw new Error('Navigation requires an explicit positive movement speed.');
  let actor = null, regionId = null, nodeId = null, held = false, moving = false, paused = false, pending = null, ready = false;
  let collision = null, collisionKey = '', dirty = false, committedPosition = null;
  const disarmedPortals = new Set();
  const snapshot = () => controller.snapshot();
  const locationMatches = save => save?.world.currentRegionId === regionId && save.world.currentNodeId === nodeId;
  const sync = save => {
    const p = save.world.navigation.positions[save.world.currentRegionId];
    actor = {x: p.x, y: p.y}; committedPosition = copy(p); regionId = save.world.currentRegionId; nodeId = save.world.currentNodeId; dirty = false; collisionKey = '';
  };
  function armOnDeparture() {
    for (const portal of level(regionId).portals) if (Math.hypot(actor.x - portal.x, actor.y - portal.y) > CAMPAIGN_NAVIGATION.reach) disarmedPortals.delete(portal.id);
  }
  function disarmArrival() {
    disarmedPortals.clear();
    for (const portal of level(regionId).portals) if (Math.hypot(actor.x - portal.x, actor.y - portal.y) <= CAMPAIGN_NAVIGATION.reach) disarmedPortals.add(portal.id);
  }
  function currentCollision(save) {
    const key = `${nodeId}:${controller.revision()}`;
    if (key !== collisionKey) {collision = collisionLevel(save); collisionKey = key;}
    return collision;
  }
  function checkState() {
    if (!ready) return fail('NAVIGATION_NOT_READY');
    if (pending) return fail('NAVIGATION_PENDING');
    const save = snapshot(), check = validateCampaignNavigation(save);
    if (!check.ok) return check;
    if (!locationMatches(save)) return fail('EXTERNAL_LOCATION_CHANGE');
    if (JSON.stringify(save.world.navigation.positions[regionId]) !== JSON.stringify(committedPosition)) return fail('EXTERNAL_POSITION_CHANGE');
    return {ok: true, save};
  }
  function targetsFor(save) {
    const map = currentCollision(save);
    return getCampaignNavigationTargets(save).map(target => ({...target, distance: Math.hypot(actor.x - target.x, actor.y - target.y), reachable: Math.hypot(actor.x - target.x, actor.y - target.y) <= CAMPAIGN_NAVIGATION.reach && campaignLineOfSight(map, actor, target), armed: target.kind !== 'portal' || !disarmedPortals.has(target.command.exitId)}));
  }
  function run(command, destination = null) {
    const source = {x: actor.x, y: actor.y}, expectedRevision = controller.revision(), expectedRegion = regionId, expectedNode = nodeId;
    // Capture and set the latch before dispatch can yield. Failed writes leave
    // the actor and visible world at their departure state.
    let captured; try {captured = copy(command);} catch {return Promise.resolve(fail('INVALID_COMMAND'));}
    const intent = {command: captured, source, destination, expectedRevision, expectedRegion, expectedNode};
    const task = Promise.resolve().then(() => controller.dispatch(intent, (save, action) => {
      if (controller.revision() !== action.expectedRevision || save.world.currentRegionId !== action.expectedRegion || save.world.currentNodeId !== action.expectedNode) return fail('STALE_NAVIGATION');
      const check = validateCampaignNavigation(save); if (!check.ok) return check;
      putPosition(save, action.source);
      const result = action.command.type === 'checkpoint' ? {ok: true, save, events: []} : applyWorldCommand(save, action.command);
      if (!result.ok) return result;
      if (action.destination) putPosition(result.save, action.destination);
      const final = validateCampaignNavigation(result.save);
      return final.ok ? result : final;
    })).then(result => {
      if (result.ok) {const changedRegion = result.save.world.currentRegionId !== regionId; sync(result.save); if (changedRegion) disarmArrival();}
      return result;
    }).catch(() => fail('NAVIGATION_COMMIT_FAILED')).finally(() => {pending = null;});
    pending = task;
    return task;
  }
  async function restore() {
    if (pending) return fail('NAVIGATION_PENDING');
    ready = false;
    const save = snapshot();
    if (!save) return fail('NO_CAMPAIGN');
    const initialized = initializeCampaignNavigation(save);
    if (!initialized.ok) return initialized;
    if (!initialized.unchanged) {
      pending = controller.dispatch({type: 'initializeNavigation'}, current => initializeCampaignNavigation(current));
      let result; try {result = await pending;} catch {return fail('NAVIGATION_COMMIT_FAILED');} finally {pending = null;}
      if (!result.ok) return result;
    }
    const current = snapshot(), check = validateCampaignNavigation(current); if (!check.ok) return check;
    sync(current); ready = true; held = false; moving = false; disarmArrival();
    return {ok: true, position: {...actor}, regionId, nodeId};
  }
  function request(command) {
    const check = checkState(); if (!check.ok) return Promise.resolve(check);
    if (paused) return Promise.resolve(fail('NAVIGATION_PAUSED'));
    if (!record(command)) return Promise.resolve(fail('INVALID_COMMAND'));
    const save = check.save, targets = targetsFor(save);
    let id;
    switch (command.type) {
      case 'talk': case 'requestService': id = `npc:${command.npcId}`; break;
      case 'acceptQuest': case 'turnInQuest': {
        const quest = WORLD_CONTENT.quests.find(q => q.id === command.questId);
        if (!quest) return Promise.resolve(fail('UNKNOWN_QUEST'));
        id = `npc:${command.type === 'acceptQuest' ? quest.giver : quest.turnIn}`; break;
      }
      case 'rest': id = 'npc:mira'; break;
      case 'interact': case 'beginInteraction': id = `interaction:${command.interactionId}`; break;
      case 'commitInteraction': case 'cancelInteraction': {
        const interaction = save.world.pendingInteraction;
        if (!interaction || interaction.token !== command.token) return Promise.resolve(fail('NO_PENDING_INTERACTION'));
        id = `interaction:${interaction.interactionId}`; break;
      }
      case 'puzzleInput': {
        const puzzle = WORLD_CONTENT.puzzles.find(p => p.id === command.puzzleId);
        if (!puzzle) return Promise.resolve(fail('UNKNOWN_PUZZLE'));
        id = `puzzle:${command.puzzleId}:${puzzle.kind === 'sequence' ? command.input : command.control}`; break;
      }
      case 'travel': {
        const exit = exits[command.exitId];
        if (!exit) return Promise.resolve(fail('UNKNOWN_EXIT'));
        if (nodes[exit.to].regionId === nodes[exit.from].regionId) return Promise.resolve(fail('WALK_TO_DESTINATION'));
        id = `portal:${exit.id}`; break;
      }
      default: return Promise.resolve(fail('UNSUPPORTED_NAVIGATION_COMMAND'));
    }
    const target = targets.find(t => t.id === id);
    if (!target) return Promise.resolve(fail('TARGET_UNAVAILABLE'));
    if (!target.reachable) return Promise.resolve(fail('TARGET_OUT_OF_REACH'));
    if (!target.armed) return Promise.resolve(fail('PORTAL_DEPARTURE_REQUIRED'));
    return run(command, command.type === 'travel' ? arrivalFor(exits[command.exitId]) : null);
  }
  function checkpoint() {
    const check = checkState(); if (!check.ok) return Promise.resolve(check);
    if (!dirty) return Promise.resolve({ok: true, unchanged: true});
    return run({type: 'checkpoint'});
  }
  function step(input = {}, seconds = 0) {
    if (!record(input)) return {...fail('INVALID_MOVEMENT'), dx: 0, dy: 0, commit: null};
    const pressed = input.interact === true && !held;
    held = input.interact === true;
    if (typeof input.paused === 'boolean') paused = input.paused;
    const check = checkState(); if (!check.ok) return {...check, dx: 0, dy: 0, commit: null};
    if (paused) {moving = false; return {ok: true, paused: true, dx: 0, dy: 0, commit: null};}
    if (!Number.isFinite(seconds) || seconds < 0 || ![input.x ?? 0, input.y ?? 0].every(Number.isFinite)) return {...fail('INVALID_MOVEMENT'), dx: 0, dy: 0, commit: null};
    const x = Math.max(-1, Math.min(1, input.x ?? 0)), y = Math.max(-1, Math.min(1, input.y ?? 0)), scale = Math.max(1, Math.hypot(x, y));
    const map = currentCollision(check.save), start = {...actor}, distance = Math.min(speed * Math.min(seconds, CAMPAIGN_NAVIGATION.maxFrameSeconds), Math.hypot(map.w, map.h) * 32);
    const dx = x / scale * distance, dy = y / scale * distance, count = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 8));
    let commit = null;
    outer: for (let i = 0; i < count; i++) for (const [sx, sy] of [[dx / count, 0], [0, dy / count]]) {
      const next = {...actor}; moveCampaignActor(next, map, sx, sy, CAMPAIGN_NAVIGATION.radius);
      const room = roomAt(map, next.x, next.y);
      if (room && room.id !== nodeId) {
        const exit = getWorldView(check.save).exits.find(e => e.to === room.id);
        if (exit?.locked) continue;
        if (exit) {commit = run({type: 'travel', exitId: exit.id}, next); break outer;}
      }
      if (!positionFits(level(regionId), {nodeId, ...next})) {
        const rejoin = getWorldView(check.save).exits.find(exit => !exit.locked && exit.destination.regionId === regionId && positionFits(level(regionId), {nodeId: exit.to, ...next}));
        if (!rejoin) continue;
        commit = run({type: 'travel', exitId: rejoin.id}, next); break outer;
      }
      if (next.x !== actor.x || next.y !== actor.y) {actor = next; dirty = true;}
    }
    armOnDeparture();
    const wasMoving = moving; moving = x !== 0 || y !== 0;
    if (!commit && pressed) {
      const target = targetsFor(check.save).filter(t => t.reachable && t.armed).sort((a, b) => a.distance - b.distance || a.id.localeCompare(b.id))[0];
      commit = target ? request(target.command) : Promise.resolve(fail('NO_NEARBY_TARGET'));
    }
    if (!commit && wasMoving && !moving && dirty) commit = checkpoint();
    return {ok: true, dx: actor.x - start.x, dy: actor.y - start.y, blocked: Math.hypot(actor.x - start.x, actor.y - start.y) < .001 && moving, commit};
  }
  function view() {
    if (!ready) return {ok: false, code: 'NAVIGATION_NOT_READY', pending: !!pending};
    const save = snapshot();
    if (!locationMatches(save)) return fail('EXTERNAL_LOCATION_CHANGE');
    const world = getWorldView(save), targets = targetsFor(save), map = level(regionId);
    return {ok: true, regionId, nodeId, position: {...actor}, paused, pending: !!pending, dirty, targets,
      focus: targets.filter(t => t.reachable && t.armed).sort((a, b) => a.distance - b.distance || a.id.localeCompare(b.id))[0] ?? null,
      gates: world.exits.filter(exit => exit.locked && nodes[exit.to].regionId === regionId).map(exit => ({exitId: exit.id, missing: exit.missing, ...doorway(map, exit)}))};
  }
  return {restore, step, request, checkpoint, view, level: () => ready ? level(regionId) : null, setPaused(value) {paused = !!value; moving = false;}, pending: () => pending};
}
