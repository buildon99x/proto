import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, rm, readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {runInNewContext} from 'node:vm';
import {buildWorld} from '../../.agents/skills/diorama-worlds/scripts/build-world.mjs';
import {createSession} from '../src/session.js';

const implementation = await import('../src/environment-controls.js').catch(error => {
 if (error.code === 'ERR_MODULE_NOT_FOUND') return {};
 throw error;
});
class Element {
 constructor(tag = 'div') { this.tagName = tag; this.children = []; this.attributes = {}; this.events = new Map(); this.value = ''; this.dataset = {}; }
 append(...children) { this.children.push(...children); }
 setAttribute(key, value) { this.attributes[key] = String(value); }
 getAttribute(key) { return this.attributes[key] ?? null; }
 addEventListener(key, callback) { this.events.set(key, callback); }
 removeEventListener(key, callback) { if (this.events.get(key) === callback) this.events.delete(key); }
 emit(key) { this.events.get(key)?.({target:this}); }
 remove() { this.removed = true; }
 focus() {}
}
function renderer() {
 const state = {time:67, speed:2, paused:true, reduced:false, running:false, environment:{weather:'clear', timeOfDay:'day'}};
 const runtime = {stats:() => ({...state, environment:{...state.environment}}), setEnvironment:partial => Object.assign(state.environment, partial), dispose(){state.disposed = true;}, seek:t => {state.time = t;}, setPaused:value => {state.paused = value;}, setSpeed:value => {state.speed = value;}};
 return {state, runtime};
}
const document = {createElement:tag => new Element(tag)};
function setup({available = true, optIn = true} = {}) {
 const container = new Element(), {state, runtime} = renderer();
 const ui = implementation.attachEnvironmentControls({container, runtime:available ? runtime : null, definition:{environment:optIn ? () => {} : undefined}, document});
 return {container, state, runtime, ui};
}

test('environment controls opt in with accessible weather and day/night choices', () => {
 assert.equal(typeof implementation.attachEnvironmentControls, 'function', 'environment UI must exist');
 const {container, ui} = setup();
 assert.equal(container.children.length, 1);
 assert.equal(ui.weather.getAttribute('aria-label'), '날씨');
 assert.equal(ui.timeOfDay.getAttribute('aria-label'), '낮과 밤');
 assert.deepEqual(ui.weather.children.map(option => [option.value, option.textContent]), [['clear','맑은 날'],['cloudy','흐린 날'],['rain','비오는 날'],['sandstorm','모래폭풍']]);
 assert.deepEqual(ui.timeOfDay.children.map(option => [option.value, option.textContent]), [['day','낮'],['night','밤 · 별과 달']]);
 assert.equal(ui.weather.value, 'clear'); assert.equal(ui.timeOfDay.value, 'day'); ui.dispose();
});
test('changing every environment combination keeps playback and formation position unchanged', () => {
 const {ui, state} = setup();
 for (const weather of ['sandstorm','cloudy','clear','rain']) for (const timeOfDay of ['night','day']) {
  ui.weather.value = weather; ui.weather.emit('change'); ui.timeOfDay.value = timeOfDay; ui.timeOfDay.emit('change');
  assert.deepEqual(state.environment, {weather, timeOfDay});
  assert.equal(state.time, 67); assert.equal(state.speed, 2); assert.equal(state.paused, true); assert.equal(state.running, false);
 }
 state.environment = {weather:'cloudy', timeOfDay:'night'}; ui.refresh();
 assert.equal(ui.weather.value, 'cloudy'); assert.equal(ui.timeOfDay.value, 'night');
 ui.weather.value = 'invalid'; ui.weather.emit('change'); assert.equal(state.environment.weather, 'cloudy'); ui.dispose();
});
test('unavailable rendering keeps truthful disabled controls; legacy worlds create no UI', () => {
 const {ui, state} = setup({available:false});
 assert.equal(ui.weather.disabled, true); assert.equal(ui.timeOfDay.disabled, true); assert.match(ui.status.textContent, /3D 사용 불가/);
 ui.weather.value = 'rain'; ui.weather.emit('change'); assert.equal(state.environment.weather, 'clear'); ui.dispose();
 const legacy = setup({optIn:false}); assert.equal(legacy.ui, null); assert.equal(legacy.container.children.length, 0);
});
test('disposal removes controls and listeners without changing scene state', () => {
 const {container, ui, state} = setup(); ui.dispose(); ui.dispose();
 assert.equal(container.children[0].removed, true); assert.equal(ui.weather.events.size, 0); assert.equal(ui.timeOfDay.events.size, 0);
 ui.weather.value = 'rain'; ui.weather.emit('change'); assert.equal(state.environment.weather, 'clear');
});

async function standalone({available = true, enabled = true} = {}) {
 const dir = await mkdtemp(join(tmpdir(), 'environment-entry-')); let entry, ui;
 try {
  await buildWorld(resolve(import.meta.dirname, '../src/harbor.js'), join(dir, 'world.html'), {environmentModule:enabled ? resolve(import.meta.dirname, '../src/environment-controls.js') : null, bundler:{build:async options => {entry = options.stdin.contents; return {outputFiles:[{text:''}]};}}});
  const elements = new Map(), events = new Map(), {state, runtime} = renderer();
  const find = key => {if (!elements.has(key)) elements.set(key, new Element()); return elements.get(key);};
  const doc = {...document, querySelector:find, documentElement:{classList:{add(){}}}};
  const context = {definition:{environment:() => {}, name:'test', title:'World', description:'Scene', duration:132, still:0}, mountWorld:() => available ? runtime : null, FINISHES:['miniature'], URLSearchParams, location:{search:'', origin:'https://example.test'}, matchMedia:() => ({matches:false}), document:doc, addEventListener:(name, callback) => {const handlers = events.get(name) ?? []; handlers.push(callback); events.set(name, handlers);}, attachEnvironmentControls:args => (ui = implementation.attachEnvironmentControls({...args, document:doc}))};
  context.window = context.parent = context;
  runInNewContext(entry.replace(/^import .*;$/gm, ''), context);
  return {ui, state, events, find};
 } finally { await rm(dir, {recursive:true, force:true}); }
}
test('standalone build wires controls without affecting pause/reset and preserves them in BFCache', async () => {
 const {ui, state, events, find} = await standalone(); assert.ok(ui, 'generated entry mounts environment controls');
 ui.weather.value = 'rain'; ui.weather.emit('change'); ui.timeOfDay.value = 'night'; ui.timeOfDay.emit('change');
 assert.equal(state.time, 67); assert.equal(state.paused, true); assert.equal(state.speed, 2);
 find('#reset').emit('click'); assert.equal(state.time, 0); assert.deepEqual(state.environment, {weather:'rain', timeOfDay:'night'});
 for (const callback of events.get('pagehide') ?? []) callback({persisted:true});
 assert.equal(ui.weather.events.size, 1); assert.notEqual(state.disposed, true);
 for (const callback of events.get('pagehide') ?? []) callback({persisted:false});
 assert.equal(ui.weather.events.size, 0); assert.equal(state.disposed, true);
});
test('standalone unavailable controls survive BFCache, then clean up on final exit', async () => {
 const {ui, events} = await standalone({available:false}); assert.ok(ui, 'fallback must still mount controls'); assert.equal(ui.weather.disabled, true);
 for (const callback of events.get('pagehide') ?? []) callback({persisted:true}); assert.equal(ui.weather.events.size, 1);
 for (const callback of events.get('pagehide') ?? []) callback({persisted:false}); assert.equal(ui.weather.events.size, 0);
 assert.equal((await standalone({enabled:false})).ui, undefined, 'ordinary standalone builds do not mount environment UI');
});
test('gallery disposes environment UI on navigation and BFCache then recreates on reentry', async () => {
 const elements = new Map(), events = new Map(), instances = [], uis = [];
 const find = key => {if (!elements.has(key)) elements.set(key, new Element()); return elements.get(key);};
 const app = find('#app'); Object.defineProperty(app, 'innerHTML', {set() {elements.clear(); elements.set('#app', app);}});
 const doc = {...document, querySelector:find, querySelectorAll:() => []};
 const world = {id:'test', title:'Test', file:'test.html', definition:{name:'test', duration:132, still:0, environment:() => {}}};
 const context = {document:doc, URLSearchParams, location:{search:'?world=test&inspect'}, matchMedia:() => ({matches:false, addEventListener(){}}), addEventListener:(name, callback) => events.set(name, callback), worlds:[world], FINISHES:['miniature'], createSession, mountWorld:(_def, {el}) => {if (el === elements.get('#preview-0')) return null; const instance = renderer(); instances.push(instance); return instance.runtime;}, attachPlaybackControls:() => null, attachVisualControls:() => null, attachEnvironmentControls:args => {const ui = implementation.attachEnvironmentControls({...args, document:doc}); uis.push(ui); return ui;}, showUnavailable(){}, console}; context.window = context;
 const source = await readFile(resolve(import.meta.dirname, '../src/main.js'), 'utf8');
 runInNewContext(source.replace(/^import .*;$/gm, ''), context);
 assert.equal(uis.length, 1, 'gallery mount includes environment controls');
 uis[0].weather.value = 'sandstorm'; uis[0].weather.emit('change'); assert.equal(instances[0].state.environment.weather, 'sandstorm');
 context.__gallery.back(); assert.equal(uis[0].weather.events.size, 0); assert.equal(instances[0].state.disposed, true);
 context.__gallery.open('test'); assert.equal(uis.length, 2); assert.equal(uis[1].weather.value, 'clear');
 events.get('pagehide')({persisted:true}); assert.equal(uis[1].weather.events.size, 0); assert.equal(instances[1].state.disposed, true);
 events.get('pageshow')({persisted:true}); context.__gallery.open('test'); assert.equal(uis.length, 3); assert.equal(uis[2].timeOfDay.value, 'day');
});
