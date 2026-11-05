import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, rm, readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {runInNewContext} from 'node:vm';
import {buildWorld} from '../../.agents/skills/diorama-worlds/scripts/build-world.mjs';
import {createSession} from '../src/session.js';
import {createDefaultEnvironmentTrack,validateEnvironmentTrack} from '../src/environment-timeline.js';

const implementation = await import('../src/environment-controls.js').catch(error => {
 if (error.code === 'ERR_MODULE_NOT_FOUND') return {};
 throw error;
});
class Element {
 constructor(tag = 'div', ownerDocument = document) { this.tagName = tag; this.ownerDocument=ownerDocument; this.parentNode=null; this.children = []; this.attributes = {}; this.events = new Map(); this.value = ''; this.dataset = {}; }
 append(...children) { for (const child of children) { if(child.parentNode)child.remove(); child.parentNode=this;child.removed=false;this.children.push(child); } }
 insertBefore(child,next) { if(child===next)return; if(child.parentNode)child.remove(); const index=next?this.children.indexOf(next):this.children.length; this.children.splice(index,0,child);child.parentNode=this;child.removed=false; }
 replaceChildren(...children) { for(const child of [...this.children])child.remove();this.append(...children); }
 contains(element) { return element===this||this.children.some(child=>child.contains(element)); }
 setAttribute(key, value) { this.attributes[key] = String(value); }
 getAttribute(key) { return this.attributes[key] ?? null; }
 addEventListener(key, callback) { this.events.set(key, callback); }
 removeEventListener(key, callback) { if (this.events.get(key) === callback) this.events.delete(key); }
 emit(key) { this.events.get(key)?.({target:this}); }
 remove() { this.removed = true; if(this.contains(this.ownerDocument.activeElement))this.ownerDocument.activeElement=null; if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(child=>child!==this);this.parentNode=null; }
 focus() { this.ownerDocument.activeElement=this; }
}
function renderer() {
 const state = {time:67, speed:2, paused:true, reduced:false, running:false, environment:{weather:'clear', timeOfDay:'day'}};
 const runtime = {stats:() => ({...state, environment:{...state.environment}}), setEnvironment:partial => Object.assign(state.environment, partial), dispose(){state.disposed = true;}, seek:t => {state.time = t;}, setPaused:value => {state.paused = value;}, setSpeed:value => {state.speed = value;}};
 return {state, runtime};
}
const document = {activeElement:null, createElement:tag => new Element(tag)};
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
 const {container, ui, state} = setup(), root=container.children[0]; ui.dispose(); ui.dispose();
 assert.equal(root.removed, true); assert.equal(container.children.length,0); assert.equal(ui.weather.events.size, 0); assert.equal(ui.timeOfDay.events.size, 0);
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

function editorSetup({available=true}={}) {
 const {state,runtime}=renderer(); state.environmentMode='automatic'; let track=createDefaultEnvironmentTrack(132);
 runtime.getEnvironmentTrack=()=>structuredClone(track);
 runtime.setEnvironmentTrack=events=>{track=validateEnvironmentTrack(events,132);};
 runtime.addEnvironmentEvent=event=>runtime.setEnvironmentTrack([...track,event]);
 runtime.updateEnvironmentEvent=(id,partial)=>runtime.setEnvironmentTrack(track.map(e=>e.id===id?{...e,...partial,id}:e));
 runtime.removeEnvironmentEvent=id=>runtime.setEnvironmentTrack(track.filter(e=>e.id!==id));
 runtime.resetEnvironmentTrack=()=>{track=createDefaultEnvironmentTrack(132);};
 runtime.setEnvironmentMode=mode=>{state.environmentMode=mode;};
 const manual=runtime.setEnvironment; runtime.setEnvironment=partial=>{manual(partial);state.environmentMode='manual';};
 const frames=new Map();let next=0;
 const ui=implementation.attachEnvironmentControls({container:new Element(),runtime:available?runtime:null,definition:{duration:132,environment:()=>{}},document,requestFrame:cb=>{frames.set(++next,cb);return next;},cancelFrame:id=>frames.delete(id)});
 return {state,runtime,ui,frames};
}
test('environment editor defaults to automatic, edits time and type, adds/removes and resets stable events',()=>{
 const {ui,runtime,state,frames}=editorSetup(); const original=runtime.getEnvironmentTrack();
 assert.ok(ui.mode,'automatic/manual selector exists'); assert.equal(ui.mode.value,'automatic');
 assert.equal(ui.rows.length,original.length); assert.equal(ui.markers.children.length,original.length);
 assert.equal(ui.rows[0].time.getAttribute('aria-label'),'환경 이벤트 1 시간 (초)');
 ui.rows[0].time.value='18.5'; ui.rows[0].time.emit('change'); assert.equal(runtime.getEnvironmentTrack()[0].time,18.5);
 ui.rows[0].type.value='night'; ui.rows[0].type.emit('change'); assert.equal(runtime.getEnvironmentTrack()[0].type,'night');
 ui.add.emit('click'); assert.equal(ui.rows.length,original.length+1); assert.equal(runtime.getEnvironmentTrack().at(-1).time,67);
 ui.rows.at(-1).remove.emit('click'); assert.equal(ui.rows.length,original.length);
 ui.rows[0].time.value=''; ui.rows[0].time.emit('change'); assert.equal(runtime.getEnvironmentTrack()[0].time,18.5); assert.match(ui.error.textContent,/시간/);
 ui.rows[0].time.value='132'; ui.rows[0].time.emit('change'); assert.equal(runtime.getEnvironmentTrack()[0].time,18.5);
 ui.reset.emit('click'); assert.deepEqual(runtime.getEnvironmentTrack(),original);
 assert.equal(state.time,67); assert.equal(state.speed,2); assert.equal(state.paused,true);
 ui.weather.value='rain';ui.weather.emit('change');assert.equal(ui.mode.value,'manual');
 ui.mode.value='automatic';ui.mode.emit('change');assert.equal(state.environmentMode,'automatic');assert.deepEqual(runtime.getEnvironmentTrack(),original);
 state.environment={weather:'sandstorm',timeOfDay:'night'}; const [frameID,callback]=[...frames.entries()].at(-1);frames.delete(frameID);callback(); assert.match(ui.status.textContent,/모래폭풍/);assert.match(ui.status.textContent,/밤/);
 const row=ui.rows[0];ui.dispose();assert.equal(frames.size,0,'latest pending frame cancelled'); assert.equal(row.time.events.size,0); assert.equal(ui.mode.events.size,0);
});
test('fallback editor exposes disabled mode and event tools and cancels no scene state',()=>{
 const {ui}=editorSetup({available:false}); assert.ok(ui.mode); assert.equal(ui.mode.disabled,true); assert.equal(ui.add.disabled,true); assert.equal(ui.reset.disabled,true); assert.equal(ui.rows.length,0); ui.dispose();
});

test('event time and type commits retain their focused DOM controls and logical row',()=>{
 const {ui,runtime}=editorSetup(), first=ui.rows[0], neighbor=ui.rows[1];
 first.time.focus(); first.time.value='1'; first.time.emit('change');
 assert.equal(runtime.getEnvironmentTrack()[0].time,1); assert.equal(document.activeElement,first.time,'time commit preserves keyboard focus'); assert.equal(ui.rows[0].time,first.time,'stable ID retains the input node');
 first.time.value='2'; first.time.emit('change'); assert.equal(document.activeElement,first.time); assert.equal(runtime.getEnvironmentTrack()[0].time,2);
 first.type.focus(); first.type.value='rain'; first.type.emit('change');
 assert.equal(runtime.getEnvironmentTrack()[0].type,'rain'); assert.equal(document.activeElement,first.type,'type commit preserves keyboard focus'); assert.equal(ui.rows[0].type,first.type); assert.equal(ui.rows[1].time,neighbor.time);
 ui.dispose(); assert.equal(first.time.events.size,0);
});
test('deleting the focused event chooses the next row, previous row, then Add',()=>{
 const {ui,runtime}=editorSetup(); runtime.setEnvironmentTrack(runtime.getEnvironmentTrack().slice(0,3)); ui.refresh();
 const [first,middle,last]=ui.rows;
 middle.remove.focus();middle.remove.emit('click');assert.equal(document.activeElement,last.time,'next surviving event receives focus');assert.equal(ui.rows[1].id,last.id);
 last.remove.focus();last.remove.emit('click');assert.equal(document.activeElement,first.time,'last-row removal focuses previous surviving event');
 first.remove.focus();first.remove.emit('click');assert.equal(ui.rows.length,0);assert.equal(document.activeElement,ui.add,'empty editor focuses Add');
 assert.equal(middle.remove.events.size,0);ui.dispose();
});
test('invalid event fields stay focused and editable until corrected without changing the track',()=>{
 const {ui,runtime}=editorSetup(), row=ui.rows[0], initial=runtime.getEnvironmentTrack()[0];
 row.time.focus();row.time.value='';row.time.emit('change');assert.equal(document.activeElement,row.time);assert.equal(row.time.value,'');assert.match(ui.error.textContent,/시간/);assert.deepEqual(runtime.getEnvironmentTrack()[0],initial);
 row.time.value='132';row.time.emit('change');assert.equal(document.activeElement,row.time);assert.equal(row.time.value,'132');assert.deepEqual(runtime.getEnvironmentTrack()[0],initial);
 row.time.value='3.75';row.time.emit('change');assert.equal(document.activeElement,row.time,'correction keeps the input focused');assert.equal(ui.rows[0].time,row.time);assert.equal(runtime.getEnvironmentTrack()[0].time,3.75);assert.equal(ui.error.textContent,'');
 row.type.focus();row.type.value='unknown';row.type.emit('change');assert.equal(document.activeElement,row.type);assert.equal(runtime.getEnvironmentTrack()[0].type,initial.type);
 row.type.value='night';row.type.emit('change');assert.equal(document.activeElement,row.type);assert.equal(runtime.getEnvironmentTrack()[0].type,'night');assert.equal(ui.error.textContent,'');ui.dispose();
});
test('unchanged polling preserves focus and a draft while unrelated track edits retain stable controls',()=>{
 const {ui,runtime,frames}=editorSetup(), row=ui.rows[0];row.time.focus();row.time.value='7.125';
 const [id,poll]=[...frames.entries()].at(-1);frames.delete(id);poll();assert.equal(document.activeElement,row.time);assert.equal(row.time.value,'7.125');assert.equal(ui.rows[0].time,row.time);
 runtime.updateEnvironmentEvent(ui.rows[1].id,{time:19});ui.refresh();assert.equal(document.activeElement,row.time,'unrelated event edit preserves focus');assert.equal(row.time.value,'7.125','uncommitted draft survives unrelated edits');assert.equal(ui.rows[0].time,row.time);ui.dispose();
});


test('city weather options constrain manual choices and editable event types',()=>{
 const {runtime,state}=renderer();
 const weatherOptions=[['clear','맑은 날'],['cloudy','흐린 날'],['rain','비오는 날']];
 const ui=implementation.attachEnvironmentControls({container:new Element(),runtime,definition:{environment:()=>{},weatherOptions},document});
 assert.deepEqual(ui.weather.children.map(option=>option.value),['clear','cloudy','rain']);
 ui.weather.value='sandstorm';ui.weather.emit('change');assert.equal(state.environment.weather,'clear');
 ui.weather.value='rain';ui.weather.emit('change');assert.equal(state.environment.weather,'rain');
 assert.match(ui.status.textContent,/비오는 날/);ui.dispose();
});

test('Paris-specific snow choices replace sandstorm without altering playback',()=>{
 const {state,runtime}=renderer(),container=new Element();
 const ui=implementation.attachEnvironmentControls({container,runtime,definition:{environment(){},weatherOptions:[['clear','맑은 날'],['cloudy','흐린 날'],['rain','비오는 날'],['snow','눈오는 날']]},document});
 assert.deepEqual(ui.weather.children.map(o=>o.value),['clear','cloudy','rain','snow']);
 ui.weather.value='snow';ui.weather.emit('change');assert.equal(state.environment.weather,'snow');assert.equal(state.time,67);assert.equal(state.speed,2);assert.equal(state.paused,true);ui.dispose();
});
