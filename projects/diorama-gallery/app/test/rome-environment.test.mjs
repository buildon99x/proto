import test from 'node:test';import assert from 'node:assert/strict';import {existsSync} from 'node:fs';
import {toolkit} from '../../.agents/skills/diorama-worlds/kit/world.js';
const T=toolkit({}).THREE,source=new URL('../src/rome-environment.js',import.meta.url);
test('Rome snow and night settings are scoped, deterministic, reversible and disposable',async()=>{
 assert.ok(existsSync(source),'Rome atmosphere exists');const {createRomeEnvironment,ROME_WEATHER}=await import(source);assert.deepEqual(ROME_WEATHER.map(x=>x[0]),['clear','cloudy','rain','snow']);
 const scene=new T.Scene(),content=new T.Group();scene.add(content);const W=toolkit(content);scene.background=new T.Color('#ddcfb1');const sky=new T.HemisphereLight('#ffffff','#888888',1),sun=new T.DirectionalLight('#ffffff',3);scene.add(sky,sun);const m=W.own(new T.MeshStandardMaterial({emissive:'#ffbb66'}));m.userData.romeLight=2;const box=W.box(1,1,1,'#ffffff');box.material=m;
 const env=createRomeEnvironment({W,scene,lights:{sky,sun},profile:{camera:[1,23,28]}});const snow=scene.getObjectByName('rome-snow');assert.ok(snow);assert.equal(env.getState().timeOfDay,'night');assert.equal(m.emissiveIntensity,2);
 const arrays=snow.geometry.attributes.position.array;for(const weather of ['clear','cloudy','rain','snow'])for(const timeOfDay of ['day','night']){env.setState({weather,timeOfDay});env.tick(17);assert.deepEqual(env.getState(),{weather,timeOfDay});assert.equal(snow.visible,weather==='snow');assert.equal(m.emissiveIntensity,timeOfDay==='night'?2:0);assert.equal(snow.geometry.attributes.position.array,arrays);}
 env.setState({weather:'snow',timeOfDay:'night'});env.tick(12);const saved=Array.from(arrays);env.tick(13);assert.notDeepEqual(Array.from(arrays),saved);env.tick(12);assert.deepEqual(Array.from(arrays),saved);assert.ok(saved.every(Number.isFinite));
 for(const invalid of [{weather:'sandstorm'},{timeOfDay:'auto'},{oops:1},null,[]]){assert.throws(()=>env.setState(invalid));assert.deepEqual(env.getState(),{weather:'snow',timeOfDay:'night'});}
 const resources=new Set(),disposed=new Set();scene.traverse(o=>{if(o.geometry)resources.add(o.geometry);if(o.material)resources.add(o.material);});for(const r of resources)r.addEventListener('dispose',()=>disposed.add(r));W.dispose();assert.equal(snow.parent,null);assert.equal(disposed.size,resources.size);
});
