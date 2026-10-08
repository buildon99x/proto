// Deterministic source/runtime contracts with a mocked DOM. Never browser or actual-play evidence.
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';

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
  const nodes = new Map(), listeners = new Map(), storage = new Map(), selectorNodes = new Map();
  let failWrites = false;
  if (saved) storage.set('emberwatch-save', saved);
  const noop = () => {};
  const context = new Proxy({ createRadialGradient: () => ({ addColorStop: noop }) }, { get: (object, key) => object[key] ?? noop });
  const classList = { add: noop, remove: noop, toggle: noop };
  const listen = (target, type, callback) => listeners.set(`${target}:${type}`, callback);
  function node(id) {
    id = id.replace(/^#/, '');
    if (!nodes.has(id)) {
      let html = '';
      nodes.set(id, {
        get innerHTML() { return html; },
        set innerHTML(value) { html = value; if (id === 'overlay') selectorNodes.clear(); },
        textContent: '', style: {}, classList,
        addEventListener: (type, callback) => listen(id, type, callback),
        getContext: () => context, focus: noop,
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 1280, height: 800 })
      });
    }
    return nodes.get(id);
  }
  function select(selector) {
    if (selectorNodes.has(selector)) return selectorNodes.get(selector);
    const attribute = selector.match(/^\[data-([\w-]+)\]$/)?.[1];
    if (!attribute) return [];
    const elements = [];
    for (const match of node('overlay').innerHTML.matchAll(/<([a-z]+)\b([^>]*)>/gi)) {
      const attributes = match[2];
      const value = attributes.match(new RegExp(`\\bdata-${attribute}="([^"]*)"`))?.[1];
      if (value === undefined) continue;
      const element = { dataset: { [attribute.replace(/-([a-z])/g, (_, c) => c.toUpperCase())]: value }, disabled: /\bdisabled(?:\s|$)/.test(attributes) };
      elements.push(element);
    }
    selectorNodes.set(selector, elements);
    return elements;
  }
  const stableMath = Object.create(Math);
  stableMath.random = imports.seeded(9145);
  const silentAudio = new Proxy({ resume: () => Promise.resolve(), play: noop }, { get: (object, key) => object[key] ?? noop });
  const sandbox = {
    ...imports, createFantasyAudio: () => silentAudio,
    console, Math: stableMath, Date, performance: { now: () => 0 },
    AudioContext: function () {}, requestAnimationFrame: noop,
    document: { querySelector: node, querySelectorAll: select, getElementById: node, hidden: false, body: { classList }, addEventListener: (type, callback) => listen('document', type, callback) },
    window: { addEventListener: (type, callback) => listen('window', type, callback) },
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => { if(failWrites) throw new Error('Storage unavailable'); storage.set(key, value); } }
  };
  vm.createContext(sandbox);
  vm.runInContext(source.replace(/^import .*\n/gm, '') + `
    globalThis.lifecycle = {
      visualState: value=>{visualReady=value;refreshStartControls();}, beginRun, resumeRun, townPanel, trainingPanel, inventoryPanel, buildingsPanel, guide, loadFloor,
      interact, persist, pauseMenu, closePanel, gainXp, finishRun, stats, update,
      read: () => ({save, run, p, map, entities, objects, loot, panel, mode, pendingResume}),
      fixture: type => { objects = [{type, x:p.x, y:p.y, used:false, open:false}]; entities=[]; return objects[0]; },
      addObject: value => { const o={x:p.x, y:p.y, ...value}; objects.push(o); return o; }
    };`, sandbox);
  const api = sandbox.lifecycle;
  return {
    ...api, storage, node,
    failWrites(value = true) { failWrites = value; },
    header(id) { listeners.get(`${id}:click`)?.(); },
    options(attribute) { return select(`[data-${attribute}]`).map(item => item.dataset[attribute]); },
    key(key) { let prevented=false;listeners.get('window:keydown')?.({ key, repeat: false, preventDefault:()=>{prevented=true;} });return prevented; },
    click(id) { assert(node('overlay').innerHTML.includes(`id="${id}"`), `${id} must be visible`); listeners.get(`${id}:click`)?.(); },
    choose(attribute, value) {
      const item = select(`[data-${attribute}]`).find(item => value === undefined || item.dataset[attribute] === value);
      assert(item, `missing ${attribute} option ${value ?? ''}`);
      assert(!item.disabled, 'cannot choose a disabled button');
      item.onclick();
      return item.dataset[attribute];
    }
  };
}

for (const kind of ['orb', 'relic']) {
  test(`${kind} choice survives Escape and can be reopened without spending the reward`, () => {
    const game = runtime(); game.beginRun();
    const reward = game.fixture(kind);
    game.interact(); game.key('Escape');
    assert.equal(reward.used, false, 'opening then dismissing must not consume a reward');
    game.interact();
    const selected = game.choose(kind);
    assert.equal(reward.used, true, 'choice consumes the reward exactly once');
    const inventory = kind === 'orb' ? game.read().run.orbs : game.read().run.relics;
    assert.deepEqual([...inventory], [selected]);
    game.interact();
    assert.deepEqual([...inventory], [selected], 'repeated F cannot grant a second reward');
  });
  test(`${kind} choice survives saving and reloading before selection`, () => {
    const game = runtime(); game.beginRun(); game.fixture(kind); game.interact(); game.persist();
    const resumed = runtime(game.storage.get('emberwatch-save')); resumed.resumeRun();
    assert.equal(resumed.read().objects[0].used, false, 'unselected reward must remain available in the save');
    resumed.interact(); resumed.choose(kind);
    assert.equal(resumed.read().objects[0].used, true);
  });
}

test('an empty or rounded-to-zero courier attempt does not spend the courier', () => {
  const game = runtime(); game.beginRun(); const courier = game.fixture('bird');
  Object.assign(game.read().run, {gold:1, wood:1, stone:1, iron:1});
  game.interact();
  assert.equal(courier.used, false, 'no transfer means no courier charge');
  Object.assign(game.read().run, {gold:10, wood:3, stone:2, iron:0});
  game.interact();
  assert.equal(courier.used, true);
  assert.equal(game.read().save.gold, 5);
  assert.equal(game.read().run.gold, 5);
  assert.equal(game.read().save.wood, 1);
  assert.equal(game.read().run.wood, 2);
  game.interact();
  assert.equal(game.read().save.gold, 5, 'one courier cannot be reused after a transfer');
});

test('first chest grants persistent enchanted gear but requires an explicit Equip choice', () => {
  const game = runtime(); game.beginRun(); game.fixture('chest'); game.interact();
  const {save} = game.read(), item = save.gear[0];
  assert.equal(save.gear.length, 1);
  assert.equal(item.slot, 'weapon'); assert(item.affix);
  assert.equal(save.equipped.weapon, null, 'finding gear must not silently alter the build');
  game.inventoryPanel(); game.click('equipSelected');
  assert.equal(save.equipped.weapon, item.id);
  game.finishRun(false, true);
  const resumed = runtime(game.storage.get('emberwatch-save'));
  assert.equal(resumed.read().save.equipped.weapon, item.id);
  assert.equal(resumed.read().save.gear[0].id, item.id);
});

test('first level-up supports learning E or strengthening Q and keeps the chosen build through retreat', () => {
  for (const skill of ['q', 'e']) {
    const game = runtime(); game.beginRun(); game.gainXp(64);
    const hero = game.read().save.heroes.warrior;
    assert.equal(hero.level, 2); assert.equal(hero.skillPoints, 3); assert.equal(hero.attributePoints, 3);
    game.trainingPanel(); game.choose('train', skill); game.choose('attribute', 'vitality');
    assert.equal(hero.skills[skill], skill === 'q' ? 2 : 1);
    assert.equal(hero.skillPoints, 0); assert.equal(hero.attributes.vitality, 1);
    game.finishRun(false, true);
    assert.equal(game.read().save.heroes.warrior.skills[skill], skill === 'q' ? 2 : 1);
  }
});

test('the welcome screen preserves a suspended run while changing settings or reading help', () => {
  const game = runtime(); game.beginRun(); game.read().run.gold = 71; game.persist();
  const saved = game.storage.get('emberwatch-save'), resumed = runtime(saved);
  assert.equal(resumed.read().pendingResume, true);
  resumed.header('reduced'); resumed.guide(); resumed.click('guideBack'); resumed.persist();
  assert.equal(JSON.parse(resumed.storage.get('emberwatch-save')).run.gold, 71);
  resumed.resumeRun();
  assert.equal(resumed.read().run.gold, 71);
});

test('courier plus retreat settles only the unbanked remainder and another expedition resets temporary rewards', () => {
  const game = runtime(); game.beginRun(); game.fixture('bird');
  Object.assign(game.read().run, {gold:101, wood:7, stone:5, iron:3});
  game.read().run.relics.push('heart'); game.read().run.orbs.push('flow');
  game.interact(); game.finishRun(false, true);
  const {save} = game.read();
  assert.equal(save.gold, 80); assert.equal(save.wood, 5); assert.equal(save.stone, 3); assert.equal(save.iron, 2);
  assert.equal(save.run, null);
  game.beginRun();
  assert.equal(game.read().run.gold, 0); assert.equal(game.read().run.floor, 0);
  assert.equal(game.read().run.relics.length, 0); assert.equal(game.read().run.orbs.length, 0);
  assert.equal(game.read().save.gold, 80);
});


test('F skips spent objects and opens the eligible object advertised by the renderer', () => {
  const game = runtime(); game.beginRun(); const spent = game.fixture('relic'); spent.used = true;
  const chest = game.addObject({type:'chest', x:game.read().p.x+40, open:false});
  game.interact();
  assert.equal(chest.open, true, 'a consumed invisible relic cannot steal F from the nearby chest');
  assert.equal(game.read().save.gear.length, 1);
});

test('banked resources can fund Training Grounds and a rank-3 evolved Warrior build', () => {
  const game = runtime(); game.beginRun();
  const {save} = game.read();
  Object.assign(game.read().run, {gold:100, wood:10, stone:10});
  game.finishRun(false, true); game.townPanel();
  game.buildingsPanel(); game.choose('upgrade', 'training');
  assert.equal(save.buildings.training, 1);
  assert.equal(save.gold, 15); assert.equal(save.wood, 3); assert.equal(save.stone, 4);
  game.beginRun(); game.gainXp(500);
  const hero = save.heroes.warrior;
  assert(hero.level >= 4);
  game.trainingPanel(); game.choose('train', 'q'); game.choose('train', 'q');
  assert.equal(hero.skills.q, 3, 'construction unlocks the first shape-changing skill rank');
  game.finishRun(false, true); game.townPanel(); game.beginRun();
  assert.equal(game.read().save.buildings.training, 1);
  assert.equal(game.read().save.heroes.warrior.skills.q, 3);
});

test('victory starts a fresh harder expedition without deleting the permanent build', () => {
  const game = runtime(); game.beginRun();
  const {save, run} = game.read();
  run.gold = 125; run.relics.push('heart'); save.heroes.warrior.attributes.strength = 4;
  game.finishRun(true); game.townPanel(); game.beginRun();
  assert.equal(save.wins, 1); assert.equal(save.bosses, 3); assert.equal(save.gold, 125);
  assert.equal(game.read().run.ng, 1); assert.equal(game.read().run.floor, 0);
  assert.equal(game.read().run.relics.length, 0);
  assert.equal(save.heroes.warrior.attributes.strength, 4);
});


test('storage write failures surface a visible warning during an expedition', () => {
  const game = runtime(); game.beginRun();
  game.node('notice').textContent = '';
  game.failWrites(); game.persist();
  assert.match(game.node('notice').textContent, /저장|save|storage/i, 'a hidden footer status alone cannot warn an active player');
  assert.equal(game.read().run.floor, 0, 'save failure must not destroy the running session');
  game.failWrites(false); game.persist();
  assert.equal(JSON.parse(game.storage.get('emberwatch-save')).run.floor, 0, 'saving can recover when storage becomes writable');
});


test('the first-entry practice dummy is placed on walkable interior floor across compact room seeds', () => {
  const game = runtime(); game.beginRun();
  for (let seed=0; seed<100; seed++) {
    game.read().run.seed = seed; game.loadFloor();
    const {map, objects, entities} = game.read();
    const object = objects.find(object => object.type === 'dummy');
    const enemy = entities.find(enemy => enemy.type === 'dummy');
    assert(object && enemy, 'the entrance includes a practice target and its interactable');
    assert.equal(object.x, enemy.x); assert.equal(object.y, enemy.y);
    for (const dx of [-11, 11]) for (const dy of [-11, 11]) {
      assert.equal(map.tiles[Math.floor((object.y+dy)/32)]?.[Math.floor((object.x+dx)/32)], 1, `seed ${seed} embeds the practice dummy in a wall`);
    }
  }
});


test('reopening or reloading a relic choice preserves its original offer instead of granting free rerolls', () => {
  const game = runtime(); game.beginRun(); game.fixture('relic'); game.interact();
  const offered = game.options('relic'); assert.equal(offered.length, 3);
  game.key('Escape'); game.interact();
  assert.deepEqual(game.options('relic'), offered, 'closing a choice cannot reroll the three relics');
  game.persist();
  const resumed = runtime(game.storage.get('emberwatch-save')); resumed.resumeRun(); resumed.interact();
  assert.deepEqual(resumed.options('relic'), offered, 'a pending offer must survive serialization');
});

test('menu keyboard navigation keeps native Tab and Space while gameplay owns its shortcuts',()=>{const game=runtime();assert.equal(game.key('Tab'),false);assert.equal(game.key(' '),false);game.beginRun();assert.equal(game.key('Tab'),true);assert.equal(game.read().panel,true);assert.equal(game.key('Tab'),false);assert.equal(game.key(' '),false);game.key('Escape');assert.equal(game.key(' '),true);});

test('cold-load resume waits for art without consuming the saved expedition',()=>{const first=runtime();first.beginRun();first.persist();const raw=first.storage.get('emberwatch-save'),game=runtime(raw);game.visualState(false);assert.equal(game.node('resumeRun').disabled,true);assert.equal(game.resumeRun(),false);assert(game.read().pendingResume);assert.equal(game.read().run,null);assert.equal(game.storage.get('emberwatch-save'),raw);game.visualState(true);assert.equal(game.node('resumeRun').disabled,false);game.resumeRun();assert(game.read().run);});
