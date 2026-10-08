// Runtime contract regressions. Mocked DOM/Canvas only: not browser gameplay proof.
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
import { MOTION_CLIPS, resolveActorMotion } from '../src/motion.js';

const gameURL = new URL('../src/game.js', import.meta.url);
const source = fs.readFileSync(gameURL, 'utf8');
const imports = {};
for (const match of source.matchAll(/^import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"];?$/gm)) {
  const module = await import(new URL(match[2], gameURL));
  for (const item of match[1].split(',')) {
    const [name, alias = name] = item.trim().split(/\s+as\s+/);
    imports[alias] = module[name];
  }
}

function runtime(saved = null) {
  const nodes = new Map(), listeners = new Map(), storage = new Map();
  if (saved) storage.set('emberwatch-save', saved);
  const noop = () => {};
  const context = new Proxy({ createRadialGradient: () => ({ addColorStop: noop }) }, { get: (object, key) => object[key] ?? noop });
  const classList = { add: noop, remove: noop, toggle: noop };
  const listen = (target, type, callback) => listeners.set(`${target}:${type}`, callback);
  function node(id) {
    if (!nodes.has(id)) nodes.set(id, {
      innerHTML: '', textContent: '', style: {}, classList,
      addEventListener: (type, callback) => listen(id, type, callback),
      getContext: () => context, focus: noop,
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 1280, height: 800 })
    });
    return nodes.get(id);
  }
  const stableMath = Object.create(Math);
  stableMath.random = () => .5;
  const silentAudio = new Proxy({ status: () => ({ enabled: false, loaded: false }), resume: () => Promise.resolve(), play: noop }, { get: (object, key) => object[key] ?? noop });
  const sandbox = {
    ...imports, createFantasyAudio: () => silentAudio,
    console, Math: stableMath, Date, performance: { now: () => 0 },
    AudioContext: function () {}, requestAnimationFrame: noop,
    document: { querySelector: node, querySelectorAll: () => [], getElementById: node, hidden: false, body: { classList }, addEventListener: (type, callback) => listen('document', type, callback) },
    window: { addEventListener: (type, callback) => listen('window', type, callback) },
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) }
  };
  vm.createContext(sandbox);
  vm.runInContext(source.replace(/^import .*\n/gm, '') + `
    globalThis.review = {
      beginRun, resumeRun, attack, skill, dodge, hit, enemyUpdate, damagePlayer,
      projectile, update, persist, potion,
      beginFrameworkEnemy: e => updateEncounterEnemy(e,0,{player:p,entities,floor:0,move,chase,lineClear,solid,damagePlayer,projectile}),
      read: () => ({ save, run, p, entities, shots, effects, hitstop, actionBuffer }),
      mouse: value => Object.assign(mouse, value),
      arena: () => {
        entities = []; shots = []; effects = []; objects = []; loot = [];
        hitstop = 0; actionBuffer = {}; keys = {}; mouse.down = false;
        map = { w: 40, h: 40, rooms: [], tiles: Array.from({length:40}, () => Array(40).fill(1)) };
        seen = Array.from({length:40}, () => Array(40).fill(true)); discovered = [];
        p.x = 512; p.y = 512; p.angle = 0;
      }
    };`, sandbox);
  const api = sandbox.review;
  return {
    ...api, storage,
    key(key, down = true) { listeners.get(`window:${down ? 'keydown' : 'keyup'}`)?.({ key, repeat: false, preventDefault: noop }); },
    step(seconds, dt = 1 / 120) { for (let elapsed = 0; elapsed < seconds - 1e-9; elapsed += dt) api.update(Math.min(dt, seconds - elapsed)); }
  };
}

function warrior() {
  const game = runtime();
  game.beginRun(); game.arena();
  const { save, p } = game.read();
  save.heroes.warrior.skills.q = 3; save.heroes.warrior.skills.e = 3;
  p.mana = 70;
  return game;
}

test('a hostile projectile checks its final legal partial-tick segment and stops at its endpoint', () => {
  const game = warrior(), { p } = game.read(), hp = p.hp;
  game.projectile(p.x - 25, p.y, 0, 1000, 10, 'arrow', true, { life: .03, r: 1 });
  const shot = game.read().shots[0], endpoint = shot.x + 30;
  game.update(.035);
  assert(shot.x <= endpoint + 1e-8, `projectile exceeded its lane by ${shot.x - endpoint}px`);
  assert.equal(game.read().p.hp, hp - 10, 'legal final segment must still make contact');
  assert.equal(game.read().shots.length, 0, 'expired projectile is removed after final contact');
});

test('a hostile projectile cannot hit beyond its advertised terminal capsule', () => {
  const game = warrior(), { p } = game.read(), hp = p.hp;
  game.projectile(p.x - 50, p.y, 0, 1000, 10, 'arrow', true, { life: .03, r: 1 });
  game.update(.035);
  assert.equal(game.read().p.hp, hp, 'player is 20px beyond a lane with an 11px cap');
});

test('sub-poise hits keep a committed armored enemy aligned to its fixed warning', () => {
  const game = warrior(), { p, entities } = game.read();
  const enemy = { type: 'knight', x: p.x + 50, y: p.y, hp: 1000, max: 1000, r: 16, damage: 21, speed: 40, active: true, encounterVersion: 1, phase: 1, timer: 0, walk: 0, slow: 0, burn: 0, flash: 0 };
  entities.push(enemy); game.beginFrameworkEnemy(enemy);
  assert(enemy.encounterAttack, 'fixture started a committed attack');
  const origin = { ...enemy.encounterAttack.origin };
  game.hit(enemy, 1, 10);
  assert.equal(enemy.stagger || 0, 0, 'one light hit must not break knight poise');
  assert.equal(enemy.x, origin.x, 'unbroken commitment must not shift away from its warning');
  assert.equal(enemy.y, origin.y);
  assert.equal(enemy.encounterAttack.shapes[0].x, origin.x);
});

test('a buffered Q wins over a held basic attack at recovery completion', () => {
  const game = warrior();
  assert(game.attack());
  const { p } = game.read();
  p.action.elapsed = p.action.duration - .05; p.attack = .05;
  game.mouse({ down: true }); game.key('q'); game.key('q', false);
  let started = false;
  for (let tick = 0; tick < 20; tick++) {
    game.update(.01);
    const state = game.read();
    started ||= state.p.action?.payload?.which === 'q' || state.p.q > 0 || state.shots.length > 0;
  }
  assert(started, 'held basic attack starved the buffered skill');
});

test('canceling an uncommitted swing with dodge resets the next combo to attack1', () => {
  const game = warrior();
  assert(game.attack()); assert(game.dodge()); game.step(.5);
  assert(game.attack());
  assert.equal(game.read().p.action.payload.combo, 0, 'a canceled first swing must not advance the combo');
});

test('a queued dodge cancels a pending contact before the next simulation tick dispatches it', () => {
  const game = warrior(), { p, entities } = game.read();
  const enemy = { type: 'dummy', x: p.x + 40, y: p.y, hp: 1000, max: 1000, r: 12, active: false, walk: 0 };
  entities.push(enemy);
  assert(game.attack());
  p.action.elapsed = p.action.contact - .001;
  game.key(' '); game.key(' ', false); game.update(1 / 60);
  assert.equal(game.read().effects.some(effect => effect.type === 'slash'), false, 'cancel input arrived before this tick but pending slash still fired');
  assert.equal(game.read().p.action.name, 'dodge');
});

test('an unavailable skill cannot cancel basic-attack recovery for free', () => {
  for (const reason of ['cooldown', 'mana']) {
    const game = warrior(); assert(game.attack());
    const { p } = game.read();
    p.action.elapsed = p.action.duration * .7; p.action.committed = true;
    const originalAction = p.action, attackCooldown = p.attack;
    if (reason === 'cooldown') p.q = 2;
    else p.mana = 0;
    assert.equal(game.skill('q'), false);
    assert.equal(p.action, originalAction, `${reason} failure canceled the active swing`);
    assert.equal(p.attack, attackCooldown);
  }
});

test('potion input cannot spend a potion or heal a hero during death', () => {
  const game = warrior(), { p } = game.read();
  game.damagePlayer(p.hp + 1, { x: 500, y: 512 });
  const hp = p.hp, potions = p.potions;
  game.key('r'); game.key('r', false);
  assert.equal(p.potions, potions);
  assert.equal(p.hp, hp);
});

test('a save made during death cannot resume as a controllable nonpositive-HP hero', () => {
  const game = warrior();
  game.read().run.gold = 100;
  game.damagePlayer(1e6, { x: 500, y: 512 }); game.persist();
  const resumed = runtime(game.storage.get('emberwatch-save'));
  resumed.resumeRun();
  const state = resumed.read();
  assert(!state.run || state.p.deathTime > 0, 'resume discarded death but kept its dead player');
  resumed.step(2);
  assert.equal(resumed.read().run, null, 'resumed death must finish settlement');
  assert.equal(resumed.read().save.gold, 60, 'death settlement must happen exactly once');
});

test('a saved death remains authoritative even if same-tick healing left positive HP', () => {
  const game = warrior();
  game.damagePlayer(1e6, { x: 500, y: 512 });
  // Old saves can contain health from a pickup processed after lethal contact.
  game.read().p.hp = 12; game.persist();
  const resumed = runtime(game.storage.get('emberwatch-save'));
  resumed.resumeRun();
  assert(!resumed.read().run || resumed.read().p.deathTime > 0, 'positive HP erased a saved death commitment');
  resumed.step(2);
  assert.equal(resumed.read().run, null);
});

test('Warrior runtime actions select attack1/2/3, axes and warcry with matching contact phases', () => {
  const game = warrior();
  for (let combo = 0; combo < 3; combo++) {
    const { p } = game.read();
    p.action = null; p.attack = 0;
    assert(game.attack());
    p.action.elapsed = p.action.contact;
    const motion = resolveActorMotion(p, 0, true), expected = `attack${combo + 1}`;
    assert.equal(motion.action, expected, 'runtime combo payload must select its own clip');
    assert(Math.abs(motion.phase - MOTION_CLIPS[expected].contact) < 1e-8, 'melee contact must align with baked strike');
  }
  for (const [which, expected] of [['q', 'axes'], ['e', 'warcry']]) {
    const { p } = game.read(); p.action = null; p[which] = 0; p.mana = 70;
    assert(game.skill(which));
    p.action.elapsed = p.action.contact;
    const motion = resolveActorMotion(p, 0, true);
    assert.equal(motion.action, expected);
    assert(Math.abs(motion.phase - MOTION_CLIPS[expected].contact) < 1e-8, 'skill release must align with baked motion');
  }
});
