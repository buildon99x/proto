import test from 'node:test';
import assert from 'node:assert/strict';
const model = await import('../src/environment-timeline.js').catch(e => { if (e.code === 'ERR_MODULE_NOT_FOUND') return {}; throw e; });
const duration = 100;
const event = (id, time, type) => ({id, time, type});
const close = (a,b) => assert.ok(Math.abs(a-b) < 1e-8, `${a} differs from ${b}`);
test('default environment story has stable editable IDs and covers every weather and daylight type', () => {
 assert.equal(typeof model.createDefaultEnvironmentTrack, 'function', 'default event factory exists');
 const a=model.createDefaultEnvironmentTrack(duration), b=model.createDefaultEnvironmentTrack(duration);
 assert.deepEqual(a,b); assert.deepEqual(new Set(a.map(e=>e.type)),new Set(['clear','cloudy','rain','sandstorm','day','night']));
 assert.equal(new Set(a.map(e=>e.id)).size,a.length); assert.ok(a.every(e=>e.time>=0&&e.time<duration));
 a[0].type='rain'; assert.notDeepEqual(a,b);
});
test('validation rejects invalid edits atomically and copies all input data', () => {
 assert.equal(typeof model.validateEnvironmentTrack,'function');
 const input=[event('a',0,'clear'),event('b',50,'night')], copy=structuredClone(input);
 const track=model.validateEnvironmentTrack(input,duration); assert.deepEqual(input,copy); input[0].type='rain'; assert.equal(track[0].type,'clear');
 for (const bad of [new Array(1),[event('a',0,'clear'),,event('b',50,'rain')],null,{},[event('',0,'clear')],[event('a',NaN,'clear')],[event('a',Infinity,'clear')],[event('a',-1,'clear')],[event('a',100,'clear')],[event('a',0,'snow')],[event('a',0,'clear'),event('a',1,'night')]]) assert.throws(()=>model.validateEnvironmentTrack(bad,duration));
 for (const d of [0,-1,Infinity,NaN]) assert.throws(()=>model.validateEnvironmentTrack([],d));
});
test('empty tracks resolve to clear day and sampling never mutates events', () => {
 assert.equal(typeof model.sampleEnvironmentTrack,'function');
 const track=[event('a',0,'clear'),event('b',50,'rain')], copy=structuredClone(track);
 assert.deepEqual(model.sampleEnvironmentTrack([],17,duration),{weather:{clear:1,cloudy:0,rain:0,sandstorm:0},timeOfDay:{day:1,night:0}});
 model.sampleEnvironmentTrack(track,25,duration); assert.deepEqual(track,copy);
 assert.throws(()=>model.sampleEnvironmentTrack([],NaN,duration));
});
test('keyframe endpoints and midpoint use smooth cyclic interpolation independently per channel', () => {
 const track=[event('a',0,'clear'),event('b',50,'rain'),event('c',0,'day'),event('d',50,'night')];
 const start=model.sampleEnvironmentTrack(track,0,duration), mid=model.sampleEnvironmentTrack(track,25,duration), end=model.sampleEnvironmentTrack(track,50,duration);
 close(start.weather.clear,1); close(end.weather.rain,1); close(mid.weather.clear,.5); close(mid.weather.rain,.5); close(mid.timeOfDay.night,.5);
 close(model.sampleEnvironmentTrack(track,12.5,duration).weather.rain,.15625);
 assert.deepEqual(model.sampleEnvironmentTrack(track,100,duration),start);
});
test('duplicate-time keys use last input event per channel and retain stable IDs', () => {
 const track=[event('a',0,'clear'),event('b',0,'rain'),event('c',0,'night')], copy=structuredClone(track);
 assert.equal(model.sampleEnvironmentTrack(track,72,duration).weather.rain,1); assert.equal(model.sampleEnvironmentTrack(track,72,duration).timeOfDay.night,1); assert.deepEqual(track,copy);
});
test('loop seam, negative and large seeks are continuous and history independent', () => {
 const track=[event('a',15,'sandstorm'),event('b',60,'rain'),event('c',20,'night'),event('d',90,'day')];
 const expected=model.sampleEnvironmentTrack(track,37.25,duration);
 for (const t of [99,0,-17,99999,60,37.25]) model.sampleEnvironmentTrack(track,t,duration);
 assert.deepEqual(model.sampleEnvironmentTrack(track,37.25,duration),expected); assert.deepEqual(model.sampleEnvironmentTrack(track,137.25,duration),expected);
 const a=model.sampleEnvironmentTrack(track,-.000001,duration), b=model.sampleEnvironmentTrack(track,.000001,duration);
 for (const channel of ['weather','timeOfDay']) for (const type of Object.keys(a[channel])) assert.ok(Math.abs(a[channel][type]-b[channel][type])<1e-6);
});
