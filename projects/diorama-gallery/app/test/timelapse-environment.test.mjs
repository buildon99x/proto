import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {toolkit} from '../../.agents/skills/diorama-worlds/kit/world.js';

const moduleURL = new URL('../src/timelapse-environment.js', import.meta.url);
const T = toolkit(new Object()).THREE;
async function fixture({fog = true, duration} = {}) {
  assert.ok(existsSync(moduleURL), 'shared atmosphere module is implemented');
  const {createTimelapseEnvironment} = await import(moduleURL);
  const scene = new T.Scene();
  const content = new T.Group();
  scene.add(content);
  const W = toolkit(content);
  const subject = W.box(18, 12, 20, '#c5aa80', 0, 5.5, 0);
  scene.background = new T.Color('#d7bc90');
  scene.fog = fog ? new T.Fog('#d7bc90', 25, 85) : null;
  const sky = new T.HemisphereLight('#f5f4df', '#b6966c', 1.1);
  const sun = new T.DirectionalLight('#ffe4b5', 2.9);
  sun.position.set(-9, 8, 9);
  scene.add(sky, sun);
  const camera = new T.OrthographicCamera(-12, 12, 16, -12, .1, 100);
  camera.position.set(2.2, 12, 32);
  camera.lookAt(0, 1, 0);
  camera.updateMatrixWorld(true);
  const baseline = {background: scene.background, fog: scene.fog, lighting: lighting(sky, sun)};
  const environment = createTimelapseEnvironment({duration, W, scene, lights: {sky, sun}, profile: {camera: [2.2, 12, 32]}});
  const root = scene.getObjectByName('timelapse-environment');
  return {scene, content, W, subject, sky, sun, camera, baseline, environment, root};
}
function lighting(sky, sun) {
  return {sky: sky.color.toArray(), ground: sky.groundColor.toArray(), ambient: sky.intensity,
    sun: sun.color.toArray(), sunlight: sun.intensity, position: sun.position.toArray()};
}
function effect(f, name) {
  const object = f.root.getObjectByName(name);
  assert.ok(object, `${name} is available`);
  return object;
}
function shown(object) {
  for (let parent = object; parent; parent = parent.parent) if (!parent.visible) return false;
  return true;
}
function positions(object) { return Array.from(object.geometry.attributes.position.array); }
function snapshot(f, t) {
  f.environment.tick(t, f.camera);
  f.scene.updateMatrixWorld(true);
  const result = [];
  f.root.traverse(o => {
    result.push(...o.matrix.elements);
    if (o.geometry?.attributes.position) result.push(...o.geometry.attributes.position.array);
    if (o.material?.uniforms?.time) result.push(o.material.uniforms.time.value);
  });
  return result;
}

test('default clear day leaves the authored model, background, fog and lights untouched', async () => {
  const f = await fixture();
  try {
    assert.deepEqual(f.environment.getState(), {weather: 'clear', timeOfDay: 'day'});
    const copy = f.environment.getState(); copy.weather = 'rain';
    assert.equal(f.environment.getState().weather, 'clear');
    const model = f.subject.matrix.clone();
    f.environment.tick(18, f.camera);
    assert.equal(f.root.parent, f.scene, 'atmosphere is outside the framed/batched content');
    assert.equal(f.content.children.length, 1);
    assert.ok(f.subject.matrix.equals(model));
    assert.equal(shown(f.root), false);
    assert.equal(f.scene.background, f.baseline.background);
    assert.equal(f.scene.fog, f.baseline.fog);
    assert.deepEqual(lighting(f.sky, f.sun), f.baseline.lighting);
  } finally { f.W.dispose(); }
});

for (const weather of ['clear', 'cloudy', 'rain', 'sandstorm']) {
  for (const timeOfDay of ['day', 'night']) {
    test(`${weather}/${timeOfDay} composes independent weather and time effects`, async () => {
      const f = await fixture();
      try {
        f.environment.setState({weather});
        f.environment.setState({timeOfDay});
        f.environment.tick(19, f.camera);
        assert.deepEqual(f.environment.getState(), {weather, timeOfDay});
        assert.equal(shown(effect(f, 'falling-rain')), weather === 'rain');
        assert.equal(shown(effect(f, 'windblown-sand')), weather === 'sandstorm');
        assert.equal(shown(effect(f, 'cloud-cover')), weather === 'cloudy' || weather === 'rain');
        assert.equal(shown(effect(f, 'night-stars')), timeOfDay === 'night' && weather !== 'sandstorm');
        assert.equal(shown(effect(f, 'night-moon')), timeOfDay === 'night' && weather !== 'sandstorm');
        if (timeOfDay === 'night') {
          assert.ok(f.sun.intensity > .3 && f.sun.intensity < f.baseline.lighting.sunlight, 'night has readable moonlit model lighting');
          assert.ok(f.sky.intensity > .3, 'night retains ambient fill');
        }
        if (weather !== 'clear' || timeOfDay !== 'day') {
          assert.notEqual(f.scene.background.getHex(), f.baseline.background.getHex());
          assert.notEqual(f.scene.fog, f.baseline.fog, 'weather does not mutate the original fog');
        }
      } finally { f.W.dispose(); }
    });
  }
}

test('invalid partial state is rejected atomically before visible changes', async () => {
  const f = await fixture();
  try {
    f.environment.setState({weather: 'rain', timeOfDay: 'night'});
    const before = snapshot(f, 12);
    const color = f.scene.background.getHex(), fog = f.scene.fog;
    for (const partial of [null, [], 'rain', {weather: 'snow'}, {timeOfDay: 'dawn'}, {weather: 'clear', timeOfDay: 'invalid'}, {weather: 'clear', unknown: true}, {weather: undefined}]) {
      assert.throws(() => f.environment.setState(partial), /state|weather|timeOfDay|unknown/i);
      assert.deepEqual(f.environment.getState(), {weather: 'rain', timeOfDay: 'night'});
      assert.equal(f.scene.background.getHex(), color);
      assert.equal(f.scene.fog, fog);
      assert.deepEqual(snapshot(f, 12), before);
    }
  } finally { f.W.dispose(); }
});

test('rain falls, sand blows sideways, and absolute seeks and repeated pause frames are deterministic', async () => {
  const f = await fixture();
  try {
    for (const [weather, name, axis] of [['rain', 'falling-rain', 1], ['sandstorm', 'windblown-sand', 0]]) {
      f.environment.setState({weather, timeOfDay: 'night'});
      const start = snapshot(f, 12.25);
      const a = positions(effect(f, name));
      assert.deepEqual(snapshot(f, 12.25), start, 'pause does not drift');
      snapshot(f, 12.26);
      const b = positions(effect(f, name));
      assert.notDeepEqual(b, a, 'particles visibly move');
      const delta = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      if (axis === 1) assert.ok(delta[1] < 0 && Math.abs(delta[1]) > Math.abs(delta[0]) * 3, 'rain falls downward');
      else assert.ok(delta[0] > 0 && Math.abs(delta[0]) > Math.abs(delta[1]) * 3, 'sand follows the wind');
      snapshot(f, 108); snapshot(f, 0);
      assert.deepEqual(snapshot(f, 12.25), start, 'seek restores the exact particle state');
      for (const t of [-100000, 0, 999999]) {
        snapshot(f, t);
        for (const value of positions(effect(f, name))) assert.ok(Number.isFinite(value) && Math.abs(value) <= 45, 'world-space effects remain bounded');
      }
    }
  } finally { f.W.dispose(); }
});

test('all transitions restore exact clear-day references and light values, including a fogless world', async () => {
  for (const fog of [true, false]) {
    const f = await fixture({fog});
    try {
      for (const weather of ['rain', 'sandstorm', 'cloudy', 'clear']) {
        f.environment.setState({weather, timeOfDay: 'night'});
        f.environment.tick(30, f.camera);
        f.environment.setState({weather: 'clear', timeOfDay: 'day'});
        assert.equal(f.scene.background, f.baseline.background);
        assert.equal(f.scene.fog, f.baseline.fog);
        assert.deepEqual(lighting(f.sky, f.sun), f.baseline.lighting);
        assert.equal(f.root.visible, false);
      }
    } finally { f.W.dispose(); }
  }
});

test('storm cloud cover attenuates the stars and moon rather than exposing a clear night sky', async () => {
  const f = await fixture();
  try {
    f.environment.setState({weather: 'clear', timeOfDay: 'night'});
    const stars = effect(f, 'night-stars'), moon = effect(f, 'night-moon');
    const starOpacity = stars.material.opacity, moonOpacity = moon.material.uniforms.opacity.value;
    f.environment.setState({weather: 'cloudy'});
    assert.ok(stars.material.opacity < starOpacity);
    assert.ok(moon.material.uniforms.opacity.value < moonOpacity);
    f.environment.setState({weather: 'rain'});
    assert.ok(stars.material.opacity < starOpacity * .3);
    f.environment.setState({weather: 'sandstorm'});
    assert.equal(shown(stars), false);
  } finally { f.W.dispose(); }
});

test('camera-relative sky and moon remain framed on portrait, landscape, orbit, pan and zoom views', async () => {
  const f = await fixture();
  try {
    f.environment.setState({timeOfDay: 'night', weather: 'cloudy'});
    const subjectBounds = new T.Box3().setFromObject(f.content);
    for (const aspect of [390 / 844, 16 / 9, 844 / 390]) {
      for (const perspective of [false, true]) {
        const camera = perspective ? new T.PerspectiveCamera(50, aspect, .1, 120) : new T.OrthographicCamera(-14 * aspect + 2, 14 * aspect + 2, 17, -11, .1, 100);
        for (const zoom of [1, 2.25]) for (const angle of [0, Math.PI * .7, -Math.PI * 1.2]) {
          camera.zoom = zoom;
          camera.position.set(30 * Math.sin(angle) + 3, 16, 30 * Math.cos(angle));
          camera.lookAt(3, 2, -1);
          camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);
          f.environment.tick(15, camera);
          f.scene.updateMatrixWorld(true);
          const moon = effect(f, 'night-moon');
          const center = moon.getWorldPosition(new T.Vector3()).project(camera);
          assert.ok(Math.abs(center.x) < .85 && center.y > .3 && center.y < .85 && center.z > -1 && center.z < 1, 'moon remains inside the upper sky');
          const backdrop = effect(f, 'atmosphere-sky');
          for (const [x, y] of [[-1, -1], [1, 1]]) {
            const point = new T.Vector3(x, y, 0).applyMatrix4(backdrop.matrixWorld).project(camera);
            assert.ok(x < 0 ? point.x <= -.999 : point.x >= .999, 'backdrop covers width');
            assert.ok(y < 0 ? point.y <= -.999 : point.y >= .999, 'backdrop covers height');
          }
          assert.ok(new T.Box3().setFromObject(f.content).equals(subjectBounds), 'no subject framing changes');
        }
      }
    }
  } finally { f.W.dispose(); }
});

test('ticks and toggles reuse bounded objects and buffers; toolkit disposal releases all owned resources', async () => {
  const f = await fixture();
  const objects = [], resources = new Set(), buffers = [], disposed = new Set();
  f.root.traverse(o => {
    objects.push(o);
    if (o.geometry) { resources.add(o.geometry); for (const attribute of Object.values(o.geometry.attributes)) buffers.push(attribute.array); }
    if (o.material) resources.add(o.material);
  });
  for (const resource of resources) resource.addEventListener('dispose', () => disposed.add(resource));
  const backgrounds = new Set(), fogs = new Set();
  for (let i = 0; i < 160; i++) {
    f.environment.setState({weather: ['clear', 'cloudy', 'rain', 'sandstorm'][i % 4], timeOfDay: i % 3 ? 'night' : 'day'});
    snapshot(f, i * 1.325);
    backgrounds.add(f.scene.background); fogs.add(f.scene.fog);
    const nextObjects = [], nextBuffers = [];
    f.root.traverse(o => { nextObjects.push(o); if (o.geometry) for (const attribute of Object.values(o.geometry.attributes)) nextBuffers.push(attribute.array); });
    assert.deepEqual(nextObjects, objects);
    assert.deepEqual(nextBuffers, buffers);
    for (let j = 0; j < buffers.length; j++) assert.equal(nextBuffers[j], buffers[j]);
  }
  assert.ok(objects.length < 20 && resources.size < 20, 'bounded draw objects and resource count');
  assert.ok(backgrounds.size <= 2 && fogs.size <= 2, 'no new background or fog per update');
  f.W.dispose();
  assert.equal(disposed.size, resources.size);
  assert.equal(f.root.parent, null, 'disposal detaches atmosphere outside content');
  assert.equal(f.scene.background, f.baseline.background);
  assert.equal(f.scene.fog, f.baseline.fog);
  assert.deepEqual(lighting(f.sky, f.sun), f.baseline.lighting);
  f.environment.tick(21, f.camera);
  assert.equal(f.root.parent, null);
});

test('night backdrop supplies finite depth for every finish without casting or receiving shadows', async () => {
  const f = await fixture();
  try {
    f.environment.setState({timeOfDay: 'night'});
    f.environment.tick(0, f.camera);
    f.scene.updateMatrixWorld(true);
    const sky = effect(f, 'atmosphere-sky');
    assert.equal(sky.material.depthWrite, true, 'depth-based halftone/blueprint keep the sky instead of forcing it to white');
    assert.equal(sky.material.depthTest, true, 'WebGL requires an enabled depth test to write the backdrop depth');
    const point = sky.getWorldPosition(new T.Vector3()).project(f.camera);
    assert.ok((point.z + 1) / 2 < .99999, 'backdrop does not take the post-process empty-background path');
    f.root.traverse(o => { assert.equal(o.castShadow, false); assert.equal(o.receiveShadow, false); });
  } finally { f.W.dispose(); }
});

function atmosphereValues(f) {
 const result=[...f.sky.color.toArray(),...f.sky.groundColor.toArray(),f.sky.intensity,...f.sun.color.toArray(),f.sun.intensity,...f.scene.background.toArray()];
 const fog=f.scene.fog; result.push(fog?.near??0,fog?.far??0,...(fog?.color.toArray()??[0,0,0]));
 for (const name of ['atmosphere-sky','cloud-cover','night-moon','sand-haze']) {
  const uniforms=effect(f,name).material.uniforms;
  result.push(uniforms.opacity.value);
 }
 result.push(effect(f,'falling-rain').material.opacity,effect(f,'windblown-sand').material.opacity,effect(f,'night-stars').material.opacity);
 return result;
}
test('automatic environment interpolates every atmosphere channel and restores manual baseline exactly', async () => {
 const f=await fixture({duration:100});
 try {
  assert.equal(typeof f.environment.setTrack,'function','editable track API exists');
  assert.equal(f.environment.getMode(),'automatic');
  f.environment.setTrack([{id:'a',time:0,type:'clear'},{id:'b',time:50,type:'rain'},{id:'c',time:0,type:'day'},{id:'d',time:50,type:'night'}]);
  f.environment.tick(25,f.camera); const midpoint=atmosphereValues(f);
  assert.ok(effect(f,'falling-rain').material.opacity>0 && effect(f,'falling-rain').material.opacity<.5);
  assert.ok(effect(f,'atmosphere-sky').material.uniforms.opacity.value>0 && effect(f,'atmosphere-sky').material.uniforms.opacity.value<1);
  assert.ok(effect(f,'night-stars').material.opacity>0);
  f.environment.tick(24.9999,f.camera); const a=atmosphereValues(f); f.environment.tick(25.0001,f.camera); const b=atmosphereValues(f);
  a.forEach((v,i)=>assert.ok(Math.abs(v-b[i])<.005,`channel ${i} changes continuously`));
  f.environment.tick(90,f.camera); f.environment.tick(25,f.camera); assert.deepEqual(atmosphereValues(f),midpoint);
  f.environment.setState({weather:'clear',timeOfDay:'day'}); assert.equal(f.environment.getMode(),'manual');
  assert.equal(f.scene.background,f.baseline.background); assert.equal(f.scene.fog,f.baseline.fog); assert.deepEqual(lighting(f.sky,f.sun),f.baseline.lighting);
  f.environment.setMode('automatic'); f.environment.tick(25,f.camera); assert.deepEqual(atmosphereValues(f),midpoint);
  f.environment.setMode('manual'); f.environment.tick(25,f.camera); assert.equal(f.environment.getWeights().weather.clear,1,'manual mode locks the displayed selection');
  assert.equal(f.scene.background,f.baseline.background);
  f.environment.setMode('automatic'); f.environment.tick(25,f.camera);
  assert.throws(()=>f.environment.setMode('unknown')); assert.equal(f.environment.getMode(),'automatic');
  const before=f.environment.getTrack(); assert.throws(()=>f.environment.setTrack([{id:'x',time:100,type:'day'}])); assert.deepEqual(f.environment.getTrack(),before);
  before[0].type='sandstorm'; assert.equal(f.environment.getTrack()[0].type,'clear');
 } finally { f.W.dispose(); }
});
test('automatic nonzero effects have a smooth cyclic seam, including particle positions', async () => {
 const f=await fixture({duration:100});
 try {
  f.environment.setTrack([{id:'a',time:15,type:'sandstorm'},{id:'b',time:60,type:'rain'},{id:'c',time:20,type:'night'},{id:'d',time:90,type:'day'}]);
  f.environment.tick(-.000001,f.camera); const a=atmosphereValues(f); const rain=positions(effect(f,'falling-rain')),sand=positions(effect(f,'windblown-sand'));
  f.environment.tick(.000001,f.camera); const b=atmosphereValues(f);
  a.forEach((v,i)=>assert.ok(Math.abs(v-b[i])<.0001,`seam channel ${i}`));
  for (const [before,name] of [[rain,'falling-rain'],[sand,'windblown-sand']]) positions(effect(f,name)).forEach((v,i)=>assert.ok(Math.abs(v-before[i])<.0001,`particle seam ${name} ${i}`));
  f.environment.setTrack([]); f.environment.tick(37,f.camera); assert.equal(f.root.visible,false); assert.deepEqual(f.environment.getState(),{weather:'clear',timeOfDay:'day'});
 } finally { f.W.dispose(); }
});
