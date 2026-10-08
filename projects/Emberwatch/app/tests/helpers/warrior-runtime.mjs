// Runtime contract regressions. Mocked DOM/Canvas only: not browser gameplay proof.
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
import { MOTION_CLIPS, resolveActorMotion, RUN_GAIT, advanceLocomotion } from '../../src/motion.js';
import {spriteDirection,projectWorld} from '../../src/visual.js';
import {AUDIO_EVENTS} from '../../src/audio.js';

const gameURL = new URL('../../src/game.js', import.meta.url);
const source = fs.readFileSync(gameURL, 'utf8');
const imports = {};
for (const match of source.matchAll(/^import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"];?$/gm)) {
  const module = await import(new URL(match[2], gameURL));
  for (const item of match[1].split(',')) {
    const [name, alias = name] = item.trim().split(/\s+as\s+/);
    imports[alias] = module[name];
  }
}

export function runtime(saved = null) {
  const nodes = new Map(), listeners = new Map(), storage = new Map(), sounds = [], cancellations = [], canvasCommands = [];
  if (saved) storage.set('emberwatch-save', saved);
  const noop = () => {};
  const recordCanvas = Object.fromEntries(['beginPath','moveTo','lineTo','closePath','fill','stroke','setLineDash'].map(name=>[name,(...args)=>canvasCommands.push({name,args})]));
  const context = new Proxy({ ...recordCanvas, createRadialGradient: () => ({ addColorStop: noop }) }, { get: (object, key) => object[key] ?? noop });
  const classList = { add: noop, remove: noop, toggle: noop };
  const listen = (target, type, callback) => listeners.set(`${target}:${type}`, callback);
  function node(id) {
    if (!nodes.has(id)) nodes.set(id, {
      innerHTML: '', textContent: '', style: {}, classList, dataset:{key:id.split(':')[1]}, setPointerCapture:noop,
      addEventListener: (type, callback) => listen(id, type, callback),
      getContext: () => context, focus: noop,
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 1280, height: 800 })
    });
    return nodes.get(id);
  }
  const stableMath = Object.create(Math);
  stableMath.random = () => .5;
  const silentAudio = new Proxy({ status: () => ({ enabled: false, loaded: false }), resume: () => Promise.resolve(), play: (type,options)=>sounds.push({type,options}),cancel:tag=>cancellations.push(tag) }, { get: (object, key) => object[key] ?? noop });
  const sandbox = {
    ...imports, createFantasyAudio: () => silentAudio,
    console, Math: stableMath, Date, performance: { now: () => 0 },
    AudioContext: function () {}, requestAnimationFrame: noop,
    document: { querySelector: node, querySelectorAll: selector => selector==='[data-key]'?['w','a','s','d','attack'].map(k=>node('touch:'+k)):[], getElementById: node, hidden: false, body: { classList }, addEventListener: (type, callback) => listen('document', type, callback) },
    window: { addEventListener: (type, callback) => listen('window', type, callback) },
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) }
  };
  vm.createContext(sandbox);
  vm.runInContext(source.replace(/^import .*\n/gm, '') + `
    globalThis.review = {
      beginRun, resumeRun, attack, skill, dodge, hit, enemyUpdate, damagePlayer,
      render, mapState: () => ({showMap,cleanView}),
      visualStub: () => {visualRenderer={render:()=>{}};},
      isometric: () => {visualRenderer={};save.settings.sound=true;},
      wall: () => {map.tiles=map.tiles.map(row=>row.map(()=>0));},
      projectile, update, persist, potion, drawLegacyWarnings,
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
    ...api, storage, sounds, cancellations, canvasCommands,
    pointer(x,y){listeners.get('#game:pointermove')?.({clientX:x,clientY:y,pointerType:'mouse'});},
    touch(k,down=true){listeners.get(`touch:${k}:${down?'pointerdown':'pointerup'}`)?.({preventDefault:noop,pointerId:1});},
    key(key, down = true) { listeners.get(`window:${down ? 'keydown' : 'keyup'}`)?.({ key, repeat: false, preventDefault: noop }); },
    step(seconds, dt = 1 / 120) { for (let elapsed = 0; elapsed < seconds - 1e-9; elapsed += dt) api.update(Math.min(dt, seconds - elapsed)); }
  };
}


