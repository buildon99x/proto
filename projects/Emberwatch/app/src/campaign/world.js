import {WORLD_CONTENT} from './world-content.js';
import {validateCampaignSave} from './save.js';

const clone = value => JSON.parse(JSON.stringify(value));
const record = value => !!value && typeof value === 'object' && !Array.isArray(value);
const integer = value => Number.isSafeInteger(value) && value >= 0;
const index = rows => Object.assign(Object.create(null), Object.fromEntries(rows.map(row => [row.id, row])));
const content = WORLD_CONTENT;
const nodes = index(content.nodes), npcs = index(content.npcs), quests = index(content.quests);
const exits = index(content.exits), interactions = index(content.interactions);
const puzzles = index(content.puzzles), encounters = index(content.encounters);
const add = (list, value) => { if (!list.includes(value)) list.push(value); };
const remove = (list, value) => { const at = list.indexOf(value); if (at >= 0) list.splice(at, 1); };
const fail = (save, code, detail = {}) => ({ok: false, save, events: [], code, ...detail});
const pass = (save, events = [], extra = {}) => ({ok: true, save, events, ...extra});

export function worldClock(save) {
  const elapsed = save.world.timeMinutes;
  const absolute = elapsed + content.clock.initialMinuteOfDay;
  const minuteOfDay = absolute % content.clock.dayMinutes;
  return {elapsedMinutes: elapsed, day: Math.floor(absolute / content.clock.dayMinutes) + 1,
    minuteOfDay, hour: Math.floor(minuteOfDay / 60), minute: minuteOfDay % 60,
    isNight: minuteOfDay >= content.clock.nightStart || minuteOfDay < content.clock.nightEnd};
}
function inWindow(save, window) {
  const minute = worldClock(save).minuteOfDay;
  return window.start < window.end ? minute >= window.start && minute < window.end : minute >= window.start || minute < window.end;
}
function npcPresent(save, npc) {
  return npc && npc.nodeId === save.world.currentNodeId && (!npc.timeWindow || inWindow(save, npc.timeWindow));
}
function fulfilled(save, requirement, questState = null, objectiveId = null) {
  const w = save.world, i = save.inventory, id = requirement.id;
  switch (requirement.type) {
    case 'quest': return w.questLog[id]?.status === (requirement.status || 'completed');
    case 'tool': return i.tools.includes(id);
    case 'questItem': return i.questItems.includes(id);
    case 'material': return (i.materials[id] || 0) >= requirement.amount;
    case 'clue': return w.clues.includes(id);
    case 'door': return w.openedDoors.includes(id);
    case 'shortcut': return w.openedShortcuts.includes(id);
    case 'chest': return w.openedChests.includes(id);
    case 'puzzle': return w.puzzleStates[id]?.solved === true;
    case 'boss': return w.bossFlags[id] === true;
    case 'flag': return w.flags[id] === true;
    case 'visitedNode': return w.visitedNodes.includes(id);
    case 'conversation': return questState?.progress[objectiveId] === true;
    case 'timeWindow': return inWindow(save, requirement);
    case 'encounters': return w.defeatedEncounters.filter(key => encounters[key]?.tag === id).length >= requirement.amount;
    default: return false;
  }
}
const missing = (save, requirements = []) => requirements.filter(requirement => !fulfilled(save, requirement));
function questReady(save, state) {
  return state.objectives.every(item => fulfilled(save, item.requirement, state, item.id));
}
function syncQuests(save, events) {
  const w = save.world;
  for (const definition of content.quests) {
    const state = w.questLog[definition.id];
    if ((state.status === 'active' || state.status === 'ready') && state.deadlineAt !== null && w.timeMinutes >= state.deadlineAt) {
      state.status = 'failed'; state.failedAt = w.timeMinutes; state.failureReason = 'DEADLINE';
      for (const reward of definition.startRewards || []) if (reward.kind === 'questItem') remove(save.inventory.questItems, reward.id);
      events.push({type: 'questFailed', questId: definition.id, reason: 'DEADLINE'});
    }
    if (state.status === 'undiscovered' && w.metNpcs.includes(definition.giver) && !missing(save, state.prerequisites).length) state.status = 'available';
    if (state.status === 'active' || state.status === 'ready') {
      const next = questReady(save, state) ? 'ready' : 'active';
      if (next === 'ready' && state.status !== 'ready') events.push({type: 'questReady', questId: definition.id});
      state.status = next;
    }
    w.questFlags[definition.id] = state.status;
  }
}
function grant(save, receiptId, rewards, events) {
  const w = save.world;
  if (w.rewardReceipts[receiptId]) return;
  // All effects and their receipt are returned in one snapshot. The caller must
  // persist this whole snapshot before acknowledging an external reward.
  for (const reward of rewards) {
    switch (reward.kind) {
      case 'gold': save.gold += reward.amount; break;
      case 'material': save.inventory.materials[reward.id] = (save.inventory.materials[reward.id] || 0) + reward.amount; break;
      case 'tool': add(save.inventory.tools, reward.id); break;
      case 'questItem': add(save.inventory.questItems, reward.id); break;
      case 'clue': add(w.clues, reward.id); break;
      case 'flag': w.flags[reward.id] = true; break;
      case 'equipmentDescriptor':
        save.inventory.rewardDescriptors.push({...clone(reward), grantId: `${receiptId}:${reward.id}`}); break;
      default: throw new Error(`Unsupported authored reward: ${reward.kind}`);
    }
  }
  w.rewardReceipts[receiptId] = {at: w.timeMinutes, rewards: clone(rewards)};
  if (rewards.length) events.push({type: 'rewardsGranted', receiptId, rewards: clone(rewards)});
}
function canConsume(save, items = []) {
  return items.every(item => item.kind === 'questItem' ? save.inventory.questItems.includes(item.id) : item.kind === 'material' && (save.inventory.materials[item.id] || 0) >= item.amount);
}
function consume(save, items = []) {
  for (const item of items) {
    if (item.kind === 'questItem') remove(save.inventory.questItems, item.id);
    else save.inventory.materials[item.id] -= item.amount;
  }
}
function advanceClock(save, minutes, events) {
  save.world.timeMinutes += minutes;
  // Cosmetic, deterministic Emberwatch weather only; no combat modifiers.
  save.world.weather = ['fair', 'mist', 'rain'][Math.floor((save.world.timeMinutes + content.clock.initialMinuteOfDay) / content.clock.dayMinutes) % 3];
  if (minutes) events.push({type: 'timeAdvanced', minutes, timeMinutes: save.world.timeMinutes});
  syncQuests(save, events);
}
function visit(save, nodeId) {
  save.world.currentNodeId = nodeId;
  save.world.currentRegionId = nodes[nodeId].regionId;
  add(save.world.visitedNodes, nodeId); add(save.world.visitedLevels, nodes[nodeId].regionId);
}

export function validateCampaignWorld(save) {
  const basic = validateCampaignSave(save);
  if (!basic.ok) return {ok: false, code: 'INVALID_CAMPAIGN', errors: basic.errors};
  const w = save.world;
  if (w.contentId !== content.id || w.contentVersion !== content.version) return {ok: false, code: 'WORLD_VERSION'};
  if (!nodes[w.currentNodeId] || nodes[w.currentNodeId].regionId !== w.currentRegionId) return {ok: false, code: 'INVALID_LOCATION'};
  const lists = ['visitedNodes', 'visitedLevels', 'openedShortcuts', 'openedChests', 'metNpcs', 'clues', 'openedDoors', 'defeatedEncounters', 'usedInteractions', 'interactionCommits'];
  if (lists.some(key => !Array.isArray(w[key]) || !w[key].every(item => typeof item === 'string'))) return {ok: false, code: 'INVALID_WORLD_LIST'};
  if (!['questLog', 'travelRequirements', 'flags', 'bossFlags', 'rewardReceipts'].every(key => record(w[key]))) return {ok: false, code: 'INVALID_WORLD_RECORD'};
  if (!Array.isArray(save.inventory.rewardDescriptors) || !integer(w.timeMinutes) || !integer(w.timeMinutes + content.clock.initialMinuteOfDay)) return {ok: false, code: 'INVALID_WORLD_CLOCK_OR_REWARDS'};
  if (!Object.values(save.inventory.materials).every(integer) || !save.inventory.tools.every(item => typeof item === 'string') || !save.inventory.questItems.every(item => typeof item === 'string')) return {ok: false, code: 'INVALID_WORLD_INVENTORY'};
  for (const definition of content.quests) {
    const q = w.questLog[definition.id];
    if (!record(q) || !['undiscovered', 'available', 'active', 'ready', 'completed', 'failed'].includes(q.status) || JSON.stringify(q.prerequisites) !== JSON.stringify(definition.prerequisites) || JSON.stringify(q.objectives) !== JSON.stringify(definition.objectives) || !record(q.progress) || !['acceptedAt', 'deadlineAt', 'completedAt', 'failedAt'].every(key => q[key] === null || integer(q[key]))) return {ok: false, code: 'INVALID_QUEST', questId: definition.id};
    if (definition.durationMinutes && q.acceptedAt !== null && q.deadlineAt !== q.acceptedAt + definition.durationMinutes) return {ok: false, code: 'INVALID_QUEST_DEADLINE', questId: definition.id};
  }
  for (const exit of content.exits) if (JSON.stringify(w.travelRequirements[exit.id]) !== JSON.stringify(exit.requirements)) return {ok: false, code: 'INVALID_TRAVEL_REQUIREMENTS'};
  for (const puzzle of content.puzzles) {
    const state = w.puzzleStates[puzzle.id];
    if (!record(state) || typeof state.solved !== 'boolean') return {ok: false, code: 'INVALID_PUZZLE'};
    if (puzzle.kind === 'sequence') {
      if (!Array.isArray(state.inputs) || state.inputs.length > puzzle.solution.length || !state.inputs.every((input, position) => input === puzzle.solution[position]) || state.solved !== (state.inputs.length === puzzle.solution.length)) return {ok: false, code: 'INVALID_PUZZLE'};
    } else if (!record(state.controls) || !puzzle.controls.every(control => typeof state.controls[control.id] === 'boolean') || state.solved !== Object.entries(puzzle.solution).every(([key, value]) => state.controls[key] === value)) return {ok: false, code: 'INVALID_PUZZLE'};
  }
  if (w.pendingInteraction !== null && (!record(w.pendingInteraction) || typeof w.pendingInteraction.token !== 'string' || !interactions[w.pendingInteraction.interactionId] || !nodes[w.pendingInteraction.nodeId])) return {ok: false, code: 'INVALID_PENDING_INTERACTION'};
  return {ok: true};
}

export function initializeCampaignWorld(save) {
  const basic = validateCampaignSave(save);
  if (!basic.ok) return fail(save, 'INVALID_CAMPAIGN', {errors: basic.errors});
  if (save.world.contentId !== undefined) {
    const validation = validateCampaignWorld(save);
    return validation.ok ? pass(save, [], {unchanged: true}) : fail(save, validation.code);
  }
  // Initialization is deliberately explicit. It does not migrate legacy runs.
  if (save.world.currentRegionId !== 'ash_hamlet' || save.world.visitedLevels.length || Object.keys(save.world.questFlags).length) return fail(save, 'UNRECOGNIZED_WORLD_PROGRESS');
  if (!integer(save.world.timeMinutes) || !integer(save.world.timeMinutes + content.clock.initialMinuteOfDay)) return fail(save, 'INVALID_WORLD_CLOCK');
  let next;
  try { next = clone(save); } catch { return fail(save, 'INVALID_SERIALIZATION'); }
  const w = next.world;
  Object.assign(w, {contentId: content.id, contentVersion: content.version, currentNodeId: content.initialNodeId,
    visitedNodes: [], metNpcs: [], clues: [], openedDoors: [], defeatedEncounters: [], usedInteractions: [], interactionCommits: [],
    questLog: {}, travelRequirements: {}, flags: {}, bossFlags: {}, rewardReceipts: {}, pendingInteraction: null});
  for (const exit of content.exits) w.travelRequirements[exit.id] = clone(exit.requirements);
  for (const definition of content.quests) w.questLog[definition.id] = {
    status: 'undiscovered', acceptedAt: null, deadlineAt: null, completedAt: null, failedAt: null,
    prerequisites: clone(definition.prerequisites), objectives: clone(definition.objectives), progress: {}
  };
  for (const puzzle of content.puzzles) w.puzzleStates[puzzle.id] = clone(puzzle.initial);
  next.inventory.rewardDescriptors = [];
  visit(next, content.initialNodeId); advanceClock(next, 0, []);
  const validation = validateCampaignWorld(next);
  if (!validation.ok) return fail(save, validation.code);
  return pass(next, [{type: 'worldInitialized', contentId: content.id, contentVersion: content.version}]);
}

function interactionCheck(save, definition) {
  if (!definition) return {code: 'UNKNOWN_INTERACTION'};
  if (definition.nodeId !== save.world.currentNodeId) return {code: 'WRONG_LOCATION'};
  if (save.world.usedInteractions.includes(definition.id)) return {alreadyUsed: true};
  const unmet = missing(save, definition.requirements);
  if (unmet.length) return {code: 'REQUIREMENTS', missing: clone(unmet)};
  if (!canConsume(save, definition.consume)) return {code: 'MISSING_ITEMS'};
  return {};
}
function performInteraction(save, definition, events) {
  consume(save, definition.consume);
  add(save.world.usedInteractions, definition.id);
  if (definition.kind === 'chest') add(save.world.openedChests, definition.id);
  if (definition.kind === 'door') add(save.world.openedDoors, definition.id);
  if (definition.kind === 'shortcut') add(save.world.openedShortcuts, definition.id);
  grant(save, `interaction:${definition.id}`, definition.rewards, events);
  events.push({type: 'interactionCompleted', interactionId: definition.id, kind: definition.kind, text: definition.text || null});
}

export function applyWorldCommand(save, command) {
  const validation = validateCampaignWorld(save);
  if (!validation.ok) return fail(save, validation.code);
  if (!record(command) || typeof command.type !== 'string') return fail(save, 'INVALID_COMMAND');
  let next;
  try { next = clone(save); } catch { return fail(save, 'INVALID_SERIALIZATION'); }
  const w = next.world, events = [];
  const reject = (code, detail = {}) => fail(save, code, detail);
  switch (command.type) {
    case 'travel': {
      const exit = exits[command.exitId];
      if (!exit) return reject('UNKNOWN_EXIT');
      if (exit.from !== w.currentNodeId) return reject('WRONG_LOCATION');
      const unmet = missing(next, w.travelRequirements[exit.id]);
      if (unmet.length) return reject('REQUIREMENTS', {missing: clone(unmet)});
      if (!integer(w.timeMinutes + exit.minutes + content.clock.initialMinuteOfDay)) return reject('TIME_OVERFLOW');
      if (w.pendingInteraction) { events.push({type: 'interactionInterrupted', token: w.pendingInteraction.token}); w.pendingInteraction = null; }
      visit(next, exit.to); advanceClock(next, exit.minutes, events);
      events.push({type: 'travelled', exitId: exit.id, nodeId: exit.to, regionId: w.currentRegionId, hazard: exit.hazard || null});
      break;
    }
    case 'talk': {
      const npc = npcs[command.npcId];
      if (!npc) return reject('UNKNOWN_NPC');
      if (!npcPresent(next, npc)) return reject(npc.nodeId === w.currentNodeId ? 'NPC_UNAVAILABLE' : 'WRONG_LOCATION');
      add(w.metNpcs, npc.id);
      for (const state of Object.values(w.questLog)) if (state.status === 'active' || state.status === 'ready') {
        for (const item of state.objectives) {
          const requirement = item.requirement;
          if (requirement.type === 'conversation' && requirement.id === npc.id && (!requirement.timeWindow || inWindow(next, requirement.timeWindow))) state.progress[item.id] = true;
        }
      }
      const line = npc.id === 'yuun' && w.questLog.marsh_delivery.status === 'failed' ? npc.failedLine : npc.id === 'serin' && w.questLog.rekindle_beacon.status === 'completed' ? npc.completedLine : npc.line;
      events.push({type: 'dialogue', npcId: npc.id, text: line, services: [...npc.services]});
      break;
    }
    case 'acceptQuest': {
      const definition = quests[command.questId], state = w.questLog[command.questId];
      if (!definition) return reject('UNKNOWN_QUEST');
      if (!npcPresent(next, npcs[definition.giver])) return reject('WRONG_LOCATION');
      if (state.status !== 'available') return reject('QUEST_NOT_AVAILABLE');
      const unmet = missing(next, state.prerequisites);
      if (unmet.length) return reject('REQUIREMENTS', {missing: clone(unmet)});
      if (definition.durationMinutes && !integer(w.timeMinutes + definition.durationMinutes)) return reject('TIME_OVERFLOW');
      state.status = 'active'; state.acceptedAt = w.timeMinutes;
      state.deadlineAt = definition.durationMinutes ? w.timeMinutes + definition.durationMinutes : null;
      grant(next, `quest:${definition.id}:start`, definition.startRewards || [], events);
      events.push({type: 'questAccepted', questId: definition.id, deadlineAt: state.deadlineAt});
      break;
    }
    case 'turnInQuest': {
      const definition = quests[command.questId], state = w.questLog[command.questId];
      if (!definition) return reject('UNKNOWN_QUEST');
      if (state.status === 'completed') return pass(save, [], {unchanged: true});
      if (!npcPresent(next, npcs[definition.turnIn])) return reject('WRONG_LOCATION');
      if (state.deadlineAt !== null && w.timeMinutes >= state.deadlineAt) return reject('DEADLINE');
      if (!['active', 'ready'].includes(state.status) || !questReady(next, state)) return reject('QUEST_NOT_READY');
      if (!canConsume(next, definition.consume)) return reject('MISSING_ITEMS');
      consume(next, definition.consume); state.status = 'completed'; state.completedAt = w.timeMinutes;
      grant(next, `quest:${definition.id}:complete`, definition.rewards, events);
      events.push({type: 'questCompleted', questId: definition.id});
      break;
    }
    case 'interact': {
      const definition = interactions[command.interactionId], check = interactionCheck(next, definition);
      if (check.code) return reject(check.code, check);
      if (check.alreadyUsed) return pass(save, [], {unchanged: true});
      performInteraction(next, definition, events); break;
    }
    case 'beginInteraction': {
      if (typeof command.token !== 'string' || !/^[a-zA-Z0-9_:-]{1,80}$/.test(command.token)) return reject('INVALID_TOKEN');
      if (w.interactionCommits.includes(command.token)) return reject('TOKEN_ALREADY_COMMITTED');
      if (w.pendingInteraction) return reject('INTERACTION_PENDING');
      const definition = interactions[command.interactionId], check = interactionCheck(next, definition);
      if (check.code) return reject(check.code, check);
      if (check.alreadyUsed) return pass(save, [], {unchanged: true});
      w.pendingInteraction = {token: command.token, interactionId: definition.id, nodeId: w.currentNodeId, startedAt: w.timeMinutes};
      events.push({type: 'interactionStarted', ...w.pendingInteraction}); break;
    }
    case 'commitInteraction': {
      if (typeof command.token !== 'string') return reject('INVALID_TOKEN');
      if (w.interactionCommits.includes(command.token)) return pass(save, [], {unchanged: true});
      const pending = w.pendingInteraction;
      if (!pending || pending.token !== command.token) return reject('NO_PENDING_INTERACTION');
      if (pending.nodeId !== w.currentNodeId) return reject('WRONG_LOCATION');
      const definition = interactions[pending.interactionId], check = interactionCheck(next, definition);
      if (check.code) return reject(check.code, check);
      if (!check.alreadyUsed) performInteraction(next, definition, events);
      add(w.interactionCommits, command.token); w.pendingInteraction = null; break;
    }
    case 'cancelInteraction': {
      if (!w.pendingInteraction || w.pendingInteraction.token !== command.token) return reject('NO_PENDING_INTERACTION');
      events.push({type: 'interactionInterrupted', token: command.token}); w.pendingInteraction = null; break;
    }
    case 'puzzleInput': {
      const definition = puzzles[command.puzzleId];
      if (!definition) return reject('UNKNOWN_PUZZLE');
      if (definition.nodeId !== w.currentNodeId) return reject('WRONG_LOCATION');
      const state = w.puzzleStates[definition.id];
      if (state.solved) return pass(save, [], {unchanged: true});
      const unmet = missing(next, definition.requirements);
      if (unmet.length) return reject('REQUIREMENTS', {missing: clone(unmet)});
      if (definition.kind === 'sequence') {
        if (!definition.symbols.some(symbol => symbol.id === command.input)) return reject('INVALID_PUZZLE_INPUT');
        if (command.input === definition.solution[state.inputs.length]) state.inputs.push(command.input);
        else { state.inputs = []; events.push({type: 'puzzleReset', puzzleId: definition.id}); }
        state.solved = state.inputs.length === definition.solution.length;
      } else {
        if (!definition.controls.some(control => control.id === command.control) || typeof command.value !== 'boolean') return reject('INVALID_PUZZLE_INPUT');
        state.controls[command.control] = command.value;
        state.solved = Object.entries(definition.solution).every(([key, value]) => state.controls[key] === value);
      }
      if (state.solved) { state.solvedAt = w.timeMinutes; grant(next, `puzzle:${definition.id}`, definition.rewards, events); events.push({type: 'puzzleSolved', puzzleId: definition.id}); }
      else events.push({type: 'puzzleChanged', puzzleId: definition.id});
      break;
    }
    case 'defeatEncounter': {
      const definition = encounters[command.encounterId];
      if (!definition) return reject('UNKNOWN_ENCOUNTER');
      if (definition.nodeId !== w.currentNodeId) return reject('WRONG_LOCATION');
      if (w.defeatedEncounters.includes(definition.id)) return pass(save, [], {unchanged: true});
      const unmet = missing(next, definition.requirements);
      if (unmet.length) return reject('REQUIREMENTS', {missing: clone(unmet)});
      add(w.defeatedEncounters, definition.id);
      if (definition.boss) w.bossFlags[definition.id] = true;
      grant(next, `encounter:${definition.id}`, definition.rewards, events);
      events.push({type: 'encounterDefeated', encounterId: definition.id, boss: !!definition.boss}); break;
    }
    case 'advanceTime':
    case 'rest': {
      if (!integer(command.minutes) || command.minutes < 1 || !integer(w.timeMinutes + command.minutes + content.clock.initialMinuteOfDay)) return reject('INVALID_TIME');
      if (command.type === 'rest' && !npcPresent(next, npcs.mira)) return reject('REST_UNAVAILABLE');
      if (w.pendingInteraction) { events.push({type: 'interactionInterrupted', token: w.pendingInteraction.token}); w.pendingInteraction = null; }
      advanceClock(next, command.minutes, events);
      if (command.type === 'rest') events.push({type: 'rested', npcId: 'mira', minutes: command.minutes});
      break;
    }
    case 'requestService': {
      const npc = npcs[command.npcId];
      if (!npc) return reject('UNKNOWN_NPC');
      if (!npcPresent(next, npc)) return reject('WRONG_LOCATION');
      if (!npc.services.includes(command.service)) return reject('UNKNOWN_SERVICE');
      // Typed dispatch contract for the owner's progression/economy modules.
      // No gold, skill or item mutation is invented here.
      return pass(save, [{type: 'serviceRequested', npcId: npc.id, service: command.service}]);
    }
    default: return reject('UNKNOWN_COMMAND');
  }
  syncQuests(next, events);
  const finalValidation = validateCampaignWorld(next);
  if (!finalValidation.ok) return reject('INVALID_RESULT', {errors: finalValidation.errors});
  return pass(next, events);
}

export function getQuestJournal(save, {includeUndiscovered = false} = {}) {
  const validation = validateCampaignWorld(save);
  if (!validation.ok) return [];
  return content.quests.filter(definition => includeUndiscovered || save.world.questLog[definition.id].status !== 'undiscovered').map(definition => {
    const state = save.world.questLog[definition.id];
    return {id: definition.id, kind: definition.kind, title: definition.title, status: state.status, giver: definition.giver, turnIn: definition.turnIn,
      hint: definition.hint, acceptedAt: state.acceptedAt, deadlineAt: state.deadlineAt,
      minutesRemaining: state.deadlineAt === null ? null : Math.max(0, state.deadlineAt - save.world.timeMinutes),
      objectives: state.objectives.map(item => ({id: item.id, label: item.label, complete: state.status === 'completed' || fulfilled(save, item.requirement, state, item.id)})),
      rewards: clone(definition.rewards)};
  });
}

export function getWorldView(save) {
  const validation = validateCampaignWorld(save);
  if (!validation.ok) return {ok: false, code: validation.code};
  const w = save.world;
  return {ok: true, node: clone(nodes[w.currentNodeId]), region: clone(content.regions.find(region => region.id === w.currentRegionId)),
    clock: worldClock(save), weather: w.weather,
    exits: content.exits.filter(exit => exit.from === w.currentNodeId).map(exit => {
      const unmet = missing(save, w.travelRequirements[exit.id]);
      return {...clone(exit), destination: clone(nodes[exit.to]), locked: unmet.length > 0, missing: clone(unmet)};
    }),
    npcs: content.npcs.filter(npc => npcPresent(save, npc)).map(clone),
    interactions: content.interactions.filter(item => item.nodeId === w.currentNodeId).map(item => ({...clone(item), used: w.usedInteractions.includes(item.id), missing: w.usedInteractions.includes(item.id) ? [] : clone(missing(save, item.requirements))})),
    puzzles: content.puzzles.filter(item => item.nodeId === w.currentNodeId).map(item => {
      const {solution, ...visible} = item;
      return {...clone(visible), state: clone(w.puzzleStates[item.id]), missing: clone(missing(save, item.requirements))};
    }),
    encounters: content.encounters.filter(item => item.nodeId === w.currentNodeId).map(item => ({...clone(item), defeated: w.defeatedEncounters.includes(item.id)})),
    journal: getQuestJournal(save), pendingInteraction: clone(w.pendingInteraction)};
}

export {WORLD_CONTENT};
