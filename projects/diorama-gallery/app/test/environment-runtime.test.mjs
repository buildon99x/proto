import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createTimelapseEnvironment} from '../src/timelapse-environment.js';
import {build} from '../../.agents/skills/diorama-worlds/node_modules/esbuild/lib/main.js';

test('runtime environment redraws the exact frame without rebasing the running clock', async () => {
 const dir = await mkdtemp(join(tmpdir(), 'environment-runtime-'));
 const keys = ['document','matchMedia','devicePixelRatio','ResizeObserver','IntersectionObserver','performance','__environmentRenderer'];
 const old = new Map(keys.map(key => [key, globalThis[key]]));
 let now = 1000, reduced = false, cleanups = 0, lastWorldTick = null, lastEnvironmentTick = null, factoryArgs;
 globalThis.document = {hidden:false, addEventListener(){}, removeEventListener(){}};
 globalThis.performance = {now:() => now}; globalThis.devicePixelRatio = 1;
 globalThis.matchMedia = () => ({matches:reduced, addEventListener(){}, removeEventListener(){}});
 globalThis.ResizeObserver = class {observe(){} disconnect(){}}; globalThis.IntersectionObserver = class {observe(){} disconnect(){}};
 try {
  // Real Three.js scene/camera/light objects; replace only GPU and canvas I/O.
  const three = resolve(import.meta.dirname, '../../.agents/skills/diorama-worlds/node_modules/three/build/three.module.js');
  const shim = join(dir, 'three.mjs');
  await writeFile(shim, `export * from ${JSON.stringify(three)}; export class WebGLRenderer {
   constructor(){globalThis.__environmentRenderer=this;this.domElement={style:{},setAttribute(){},addEventListener(){},removeEventListener(){},remove(){}};this.shadowMap={};this.info={reset(){},render:{calls:0,triangles:0},memory:{geometries:0,textures:0}};}
   setPixelRatio(){} setClearColor(){} setSize(){} setRenderTarget(){} dispose(){} forceContextLoss(){}
   setAnimationLoop(callback){this.loop=callback;} render(scene,camera){if(camera.isOrthographicCamera||camera.isPerspectiveCamera){this.scene=scene;this.camera=camera;}}
  }`);
  await build({entryPoints:[resolve(import.meta.dirname, '../../.agents/skills/diorama-worlds/kit/world.js')], bundle:true, platform:'node', format:'esm', outfile:join(dir,'runtime.mjs'), alias:{three:shim}});
  const {mountWorld} = await import(pathToFileURL(join(dir, 'runtime.mjs')));
  const el = {dataset:{}, replaceChildren(){}, getBoundingClientRect:() => ({width:900, height:600})};
  const definition = {name:'environment-probe', title:'Test', description:'Probe', duration:132, still:12, reducedStill:119, bounds:[[-1,-1,-1],[1,1,1]], build:() => ({}), tick:({t}) => {lastWorldTick = t;}, environment(args) {
   factoryArgs = args; const state = {weather:'clear', timeOfDay:'day'};
   args.W.own({dispose(){cleanups++;}});
   return {getState:() => ({...state}), setState(partial){if (partial.weather && !['clear','cloudy','rain','sandstorm'].includes(partial.weather)) throw new Error('Unknown weather'); Object.assign(state, partial);}, tick(t, camera){assert.equal(lastWorldTick, t, 'world pose must update before environment'); lastEnvironmentTick = {t, camera};}};
  }};
  const runtime = mountWorld(definition, {el, paused:false}), gpu = globalThis.__environmentRenderer;
  assert.equal(typeof runtime.setEnvironment, 'function', 'environment setter must exist');
  assert.ok(factoryArgs.lights.sky.isHemisphereLight); assert.ok(factoryArgs.lights.sun.isDirectionalLight);
  assert.equal(factoryArgs.scene, gpu.scene); assert.equal(factoryArgs.profile.sunlight, 3);
  assert.deepEqual(runtime.stats().environment, {weather:'clear', timeOfDay:'day'});
  now = 2500; gpu.loop(now); assert.equal(runtime.stats().time, 13.5);
  runtime.setSpeed(2); now = 3000; gpu.loop(now); assert.equal(runtime.stats().time, 14.5);
  const before = runtime.stats(), loop = gpu.loop; now = 3250;
  runtime.setEnvironment({weather:'rain', timeOfDay:'night'});
  assert.equal(runtime.stats().time, 14.5); assert.equal(runtime.stats().speed, 2); assert.equal(runtime.stats().paused, false); assert.equal(gpu.loop, loop);
  assert.equal(runtime.stats().frames, before.frames + 1); assert.equal(lastEnvironmentTick.t, 14.5); assert.equal(lastEnvironmentTick.camera, gpu.camera);
  now = 3500; gpu.loop(now); assert.equal(runtime.stats().time, 15.5, 'environment setter must not rebase epoch or anchor');
  runtime.setPaused(true); const frozen = runtime.stats().time; runtime.setEnvironment({weather:'sandstorm'});
  assert.equal(runtime.stats().time, frozen); assert.equal(runtime.stats().paused, true); assert.equal(runtime.stats().running, false);
  assert.throws(() => runtime.setEnvironment({weather:'invalid'}), /Unknown weather/); assert.equal(runtime.stats().environment.weather, 'sandstorm');
  runtime.seek(0); assert.deepEqual(runtime.stats().environment, {weather:'sandstorm', timeOfDay:'night'}, 'reset/seek do not reset environment');
  runtime.dispose(); runtime.dispose(); assert.equal(cleanups, 1); assert.doesNotThrow(() => runtime.setEnvironment({weather:'rain'}));
  reduced = true; const accessible = mountWorld(definition, {el}); assert.equal(accessible.stats().time, 119);
  accessible.setEnvironment({timeOfDay:'night'}); assert.equal(accessible.stats().time, 119); assert.equal(accessible.stats().running, false); accessible.dispose();
  const legacy = mountWorld({...definition, environment:undefined}, {el, paused:true}), scene = globalThis.__environmentRenderer.scene;
  assert.equal(legacy.stats().environment, null); const previous = legacy.stats(), children = [...scene.children], background = scene.background.clone();
  legacy.setEnvironment({weather:'rain'}); assert.deepEqual(scene.children, children); assert.equal(scene.fog, null); assert.deepEqual(scene.background, background); assert.equal(legacy.stats().frames, previous.frames); legacy.dispose();

  reduced=false;
  const automatic=mountWorld({...definition,environment:createTimelapseEnvironment}, {el,paused:true});
  assert.equal(typeof automatic.getEnvironmentTrack,'function','runtime exposes editable environment events');
  assert.equal(automatic.stats().environmentMode,'automatic');
  const original=automatic.getEnvironmentTrack(); assert.ok(original.length>=6);
  automatic.setSpeed(2); automatic.seek(37); const pose=automatic.stats();
  automatic.addEnvironmentEvent({id:'custom',time:37,type:'rain'}); assert.ok(automatic.getEnvironmentTrack().some(e=>e.id==='custom'));
  automatic.updateEnvironmentEvent('custom',{time:42,type:'night'}); assert.deepEqual(automatic.getEnvironmentTrack().find(e=>e.id==='custom'),{id:'custom',time:42,type:'night'});
  automatic.removeEnvironmentEvent('custom'); assert.deepEqual(automatic.getEnvironmentTrack(),original);
  const immutable=automatic.stats(); assert.ok(Object.isFrozen(immutable.environmentTrack)); assert.ok(Object.isFrozen(immutable.environmentTrack[0])); assert.ok(Object.isFrozen(immutable.environmentWeights.weather));
  automatic.setEnvironment({weather:'sandstorm',timeOfDay:'night'}); assert.equal(automatic.stats().environmentMode,'manual');
  automatic.setEnvironmentMode('automatic'); assert.equal(automatic.stats().environmentMode,'automatic');
  assert.equal(automatic.stats().time,pose.time); assert.equal(automatic.stats().paused,pose.paused); assert.equal(automatic.stats().speed,pose.speed);
  assert.throws(()=>automatic.addEnvironmentEvent({id:'bad',time:132,type:'rain'})); assert.deepEqual(automatic.getEnvironmentTrack(),original);
  assert.throws(()=>automatic.updateEnvironmentEvent('missing',{type:'day'}));
  for(const sparse of [new Array(1),[{id:'a',time:0,type:'clear'},,{id:'b',time:50,type:'rain'}]]){assert.throws(()=>automatic.setEnvironmentTrack(sparse));assert.deepEqual(automatic.getEnvironmentTrack(),original,'sparse track rejection preserves the previous working track');assert.doesNotThrow(()=>automatic.seek(38));}
  automatic.setEnvironmentTrack([]); assert.deepEqual(automatic.stats().environment,{weather:'clear',timeOfDay:'day'});
  automatic.resetEnvironmentTrack(); assert.deepEqual(automatic.getEnvironmentTrack(),original);
  automatic.dispose(); assert.doesNotThrow(()=>automatic.setEnvironmentMode('automatic')); assert.doesNotThrow(()=>automatic.setEnvironmentTrack([]));
 } finally {for (const [key, value] of old) if (value === undefined) delete globalThis[key]; else globalThis[key] = value; await rm(dir, {recursive:true, force:true});}
});
