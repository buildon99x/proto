// Actual source runtime contracts with a mocked DOM/Canvas. These are logic
// regressions, not browser playtesting or evidence of perceived threat clarity.
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
import {updateEntryProtection, enemyThreatReadable, advanceThreatReadiness, THREAT_NOTICE_SECONDS} from '../src/threat-visibility.js';

const room = {x: 3, y: 2, w: 12, h: 7}, player = {x: 288, y: 160};
test('entry protection is explicit, bounded, and never re-enabled by returning', () => {
  assert.equal(updateEntryProtection(true, player, room), true);
  for (const position of [{x: 95, y: 160}, {x: 480, y: 160}, {x: 288, y: 63}, {x: 288, y: 288}])
    assert.equal(updateEntryProtection(true, position, room), false);
  assert.equal(updateEntryProtection(false, player, room), false);
  assert.equal(updateEntryProtection(undefined, player, room), false, 'old saves do not reset existing combat');
  assert.equal(updateEntryProtection(true, player, null), false);
});

test('threat gate uses the revealed tile and full actor/warning bounds', () => {
  const p = {x: 512, y: 512}, e = {type: 'archer', x: 592, y: 512};
  const seen = Array.from({length: 40}, () => Array(40).fill(true));
  const viewport = {width: 390, height: 600, seen};
  assert.equal(enemyThreatReadable(e, p, viewport), true);
  seen[16][18] = false;
  assert.equal(enemyThreatReadable(e, p, viewport), false);
  seen[16][18] = true;
  assert.equal(enemyThreatReadable({...e, x: 742}, p, viewport), false, 'portrait offscreen archer');
  assert.equal(enemyThreatReadable({...e, x: 512, y: 720}, p, {width: 800, height: 400, seen}), false, 'cut-off warning below frame');
  assert.equal(enemyThreatReadable(e, p, {...viewport, occluders: [{left: 285, right: 340, top: 340, bottom: 410}]}), false);
  assert.equal(enemyThreatReadable(e, p, {width: 0, height: 600}), false);
});

test('fallback renderer gate follows actual camera rather than isometric projection', () => {
  const p = {x: 512, y: 512}, e = {type: 'archer', x: 592, y: 512};
  assert.equal(enemyThreatReadable(e, p, {width: 390, height: 600, isometric: false, camera: {x: 400, y: 250}}), true);
  assert.equal(enemyThreatReadable(e, p, {width: 390, height: 600, isometric: false, camera: {x: 200, y: 250}}), false);
  assert.equal(enemyThreatReadable(e, p, {width: 390, height: 600, isometric: false}), false);
});

test('readability notice is continuous and robust at common update rates', () => {
  for (const hz of [30, 60, 120]) {
    const enemy = {};
    assert.equal(advanceThreatReadiness(enemy, 0, true), false);
    for (let frame = 0; frame < THREAT_NOTICE_SECONDS * hz - 1; frame++) assert.equal(advanceThreatReadiness(enemy, 1 / hz, true), false);
    assert.equal(advanceThreatReadiness(enemy, 1 / hz, true), true);
    assert.equal(advanceThreatReadiness(enemy, 1 / hz, false), false);
    assert.equal(enemy.threatReadableTime, 0);
    assert.equal(advanceThreatReadiness(enemy, THREAT_NOTICE_SECONDS / 2, true), false);
  }
});

const gameURL = new URL('../src/game.js', import.meta.url), source = fs.readFileSync(gameURL, 'utf8'), imports = {};
for (const match of source.matchAll(/^import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"];?$/gm)) {
  const module = await import(new URL(match[2], gameURL));
  for (const item of match[1].split(',')) { const [name, alias = name] = item.trim().split(/\s+as\s+/); imports[alias] = module[name]; }
}
function runtime(seed, width = 1188, height = 761) {
  const noop = () => {}, nodes = new Map(), storage = new Map(), events = [];
  const classList = {add: noop, remove: noop, toggle: noop};
  const context = new Proxy({createRadialGradient: () => ({addColorStop: noop})}, {get: (object, key) => object[key] ?? noop});
  function node(id) { if (!nodes.has(id)) nodes.set(id, {innerHTML: '', textContent: '', style: {}, classList, addEventListener: noop,
    getContext: () => context, focus: noop, getBoundingClientRect: () => ({left: 0, top: 0, width, height})}); return nodes.get(id); }
  const stableMath = Object.create(Math); stableMath.random = () => .5;
  const sandbox = {...imports, enemyThreatReadable, console, Math: stableMath, Date, performance: {now: () => 0}, requestAnimationFrame: noop,
    createFantasyAudio: () => new Proxy({}, {get: () => noop}), AudioContext: function () {},
    document: {querySelector: node, querySelectorAll: () => [], getElementById: node, hidden: false, body: {classList}, addEventListener: noop},
    window: {addEventListener: noop}, localStorage: {getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value)},
    record: event => events.push(event)};
  vm.createContext(sandbox);
  vm.runInContext(source.replace(/^import .*\n/gm, '') + `
    const originalProjectile = projectile;
    projectile = function(x,y,angle,speed,damage,kind,enemy,options) {
      if (enemy) { const attacker=entities.find(e=>e.x===x&&e.y===y); record({kind:'projectile',readable:attacker&&enemyThreatReadable(attacker,p,{width:W,height:H,seen,isometric:!!visualRenderer,camera:cam}),attacker:attacker&&{...attacker}}); }
      return originalProjectile(x,y,angle,speed,damage,kind,enemy,options);
    };
    globalThis.review = {beginRun, update, hit, loadFloor, persist, resumeRun,
      read:()=>({run,p,map,entities,shots,seen}),
      setSeed:value=>{run.seed=value;loadFloor();},
      viewport:(w,h)=>{W=w;H=h;visualRenderer={};},
      arena:()=>{entities=[];shots=[];objects=[];effects=[];loot=[];hitstop=0;
        map={w:40,h:40,rooms:[],tiles:Array.from({length:40},()=>Array(40).fill(1))};
        seen=Array.from({length:40},()=>Array(40).fill(true)); discovered=[];
        p.x=512;p.y=512;p.invuln=100;run.entryProtected=false;},
      spawnEnemy
    };`, sandbox);
  const api = sandbox.review; api.beginRun(); api.setSeed(seed); api.viewport(width, height);
  return {...api, events, step(seconds, dt = 1 / 60) { for (let elapsed = 0; elapsed < seconds - 1e-9; elapsed += dt) {
    if (!api.read().p || api.read().p.hp <= 0) break;
    api.update(Math.min(dt, seconds - elapsed));
  }}};
}

test('seeded first-room idle stays safe at actual desktop and narrow viewport sizes', () => {
  for (const [width, height] of [[1188, 761], [390, 600], [800, 400]]) for (const seed of [3, 10, 28, 46, 69, 80]) {
    const game = runtime(seed, width, height), initial = game.read().p.hp;
    game.step(35);
    assert.equal(game.read().p?.hp, initial, `seed ${seed} at ${width}×${height}`);
    assert.equal(game.events.length, 0, 'no hostile release during undisturbed practice');
    assert.equal(game.read().entities.some(e => e.type !== 'dummy' && e.active), false);
  }
});

test('dummy practice remains safe, but hitting a real enemy ends protection', () => {
  const game = runtime(3), {entities} = game.read();
  game.hit(entities.find(e => e.type === 'dummy'), 1, 0); game.step(1);
  assert.equal(game.read().run.entryProtected, true);
  game.hit(entities.find(e => e.type !== 'dummy'), 1, 0);
  assert.equal(game.read().run.entryProtected, false);
  game.step(5);
  assert(game.events.some(e => e.kind === 'projectile'), 'combat can start from a deliberate real-enemy hit');
});

test('leaving and returning never re-enables protection; current save retains the flag', () => {
  const game = runtime(3), {p, map} = game.read(), origin = {x:p.x,y:p.y};
  p.x = (map.rooms[0].x + map.rooms[0].w) * 32 + 1; game.step(1 / 60);
  assert.equal(game.read().run.entryProtected, false);
  Object.assign(p, origin); game.step(1 / 60);
  assert.equal(game.read().run.entryProtected, false);
  game.persist(); game.resumeRun();
  assert.equal(game.read().run.entryProtected, false);
});

test('resume keeps fresh practice safety, defaults old saves off, and resets notice time', () => {
  const game = runtime(3);
  const e = game.read().entities.find(enemy => enemy.type !== 'dummy');
  e.threatReadableTime = THREAT_NOTICE_SECONDS;
  game.persist(); game.resumeRun();
  assert.equal(game.read().run.entryProtected, true);
  assert.equal(game.read().entities.find(enemy => enemy.type !== 'dummy').threatReadableTime, 0);
  game.step(2);
  assert.equal(game.read().p.hp, 150);
  delete game.read().run.entryProtected;
  game.persist(); game.resumeRun();
  assert.equal(game.read().run.entryProtected, false, 'missing flag cannot grant a renewed safe room');
});

test('offscreen ranged foe closes into a readable position before releasing', () => {
  const game = runtime(3, 390, 600); game.arena();
  const e = game.spawnEnemy('archer', 742, 512); e.active = true; e.timer = 0;
  game.step(.5);
  assert.equal(game.events.length, 0, 'offscreen attack cannot start or release');
  game.step(8);
  assert(game.events.length > 0, 'foe must close distance instead of stalling outside frame');
  assert(game.events.every(event => event.readable), 'all hostile releases have a readable attacker');
});

test('losing readable space during windup prevents a hidden release', () => {
  const game = runtime(3); game.arena();
  const e = game.spawnEnemy('archer', 742, 512); e.active = true; e.timer = 0;
  game.step(.35);
  assert.equal(e.state, 'windup');
  game.viewport(390, 600);
  game.step(.8);
  assert.equal(game.events.length, 0);
  game.step(8);
  assert(game.events.length > 0);
  assert(game.events.every(event => event.readable));
});
