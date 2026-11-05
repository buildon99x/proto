import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {toolkit} from '../../.agents/skills/diorama-worlds/kit/world.js';
import {sampleEnvironmentTrack} from '../src/environment-timeline.js';
const moduleURL = new URL('../src/dubai-night-environment.js', import.meta.url);
const T = toolkit({}).THREE;
async function module() {
  assert.ok(existsSync(moduleURL), 'Dubai night environment is implemented');
  return import(moduleURL);
}
async function fixture() {
  const {createDubaiNightEnvironment} = await module();
  const scene = new T.Scene(), content = new T.Group(); scene.add(content);
  const W = toolkit(content);
  scene.background = new T.Color('#d7bc90');
  const sky = new T.HemisphereLight('#ffffff', '#887755', 1), sun = new T.DirectionalLight('#ffffff', 3);
  scene.add(sky, sun);
  const materials = [.1,.4,.7].map(start => {
    const material = W.own(new T.MeshStandardMaterial({emissive:'#ffd08a',emissiveIntensity:0}));
    material.userData.dubaiNight = {start,end:start+.2,power:1.4};
    content.add(new T.Mesh(W.own(new T.BoxGeometry()),material));
    return material;
  });
  const camera = new T.PerspectiveCamera(45,16/9,.1,100); camera.position.set(2,12,32); camera.lookAt(0,1,0); camera.updateMatrixWorld(true);
  const environment = createDubaiNightEnvironment({W,scene,lights:{sky,sun},duration:90});
  return {W,scene,content,materials,camera,environment, effect:name=>scene.getObjectByName(name)};
}
function snapshot(f,t) {
  f.environment.tick(t,f.camera);
  return {weights:f.environment.getWeights(),lamps:f.materials.map(m=>m.emissiveIntensity),sky:f.effect('dubai-milky-way').material.uniforms.opacity.value,
    meteors:[0,1,2].map(i=>{const m=f.effect(`dubai-meteor-${i}`);return [m.visible,m.material.uniforms.head.value.toArray(),m.material.uniforms.tail.value.toArray(),m.material.uniforms.opacity.value];})};
}
test('Dubai track begins twilight exactly55, reaches night80, holds84 and wraps to day',async()=>{
  const {createDubaiEnvironmentTrack}=await module(); const track=createDubaiEnvironmentTrack();
  for(const t of [0,20,54.999,55,89.99,90]) assert.equal(sampleEnvironmentTrack(track,t,90).timeOfDay.night,0);
  assert.equal(sampleEnvironmentTrack(track,67.5,90).timeOfDay.night,.5);
  for(const t of [80,82,84]) assert.equal(sampleEnvironmentTrack(track,t,90).timeOfDay.night,1);
  for(const t of [55,66,80,84,89.99]) assert.equal(sampleEnvironmentTrack(track,t,90).weather.clear,1);
  assert.deepEqual(createDubaiEnvironmentTrack(),track);
});
test('lights stagger by sampled night weight and manual/edited track/reset stay authoritative',async()=>{
 const f=await fixture(); try {
  snapshot(f,55);assert.deepEqual(f.materials.map(m=>m.emissiveIntensity),[0,0,0]);
  snapshot(f,67.5);assert.equal(f.materials[0].emissiveIntensity,1.4);assert.ok(f.materials[1].emissiveIntensity>0&&f.materials[1].emissiveIntensity<1.4);assert.equal(f.materials[2].emissiveIntensity,0);
  f.environment.setState({timeOfDay:'night',weather:'clear'});assert.deepEqual(f.materials.map(m=>m.emissiveIntensity),[1.4,1.4,1.4]);
  snapshot(f,0);assert.equal(f.effect('dubai-milky-way').visible,true);
  f.environment.setState({timeOfDay:'day'});assert.deepEqual(f.materials.map(m=>m.emissiveIntensity),[0,0,0]);
  f.environment.setTrack([{id:'night',type:'night',time:0},{id:'clear',type:'clear',time:0}]);f.environment.setMode('automatic');snapshot(f,0);assert.equal(f.materials[2].emissiveIntensity,1.4);
  f.environment.resetTrack(); assert.deepEqual(f.environment.getTrack(),(await module()).createDubaiEnvironmentTrack());snapshot(f,55);assert.equal(f.materials[0].emissiveIntensity,0);
 } finally {f.W.dispose();}
});
test('three seeded shooting stars are staggered, brief, absolute-time and weather attenuated',async()=>{
 const f=await fixture(),g=await fixture();try {
  const meteors=[0,1,2].map(i=>f.effect(`dubai-meteor-${i}`));
  assert.equal(meteors.filter(Boolean).length,3);
  const events=meteors.map(m=>m.userData.dubaiMeteor);
  assert.deepEqual(events,[0,1,2].map(i=>g.effect(`dubai-meteor-${i}`).userData.dubaiMeteor));
  for(let i=0;i<3;i++) {
   const e=events[i];assert.ok(e.start>=66 && e.start+e.duration<80 && e.duration>0 && e.duration<2);
   if(i)assert.ok(e.start>events[i-1].start+events[i-1].duration);
   const t=e.start+e.duration/2, before=snapshot(f,t);assert.equal(meteors[i].visible,true);
   assert.deepEqual(snapshot(f,t),before); const head=meteors[i].material.uniforms.head.value.clone(); snapshot(f,t+.01);assert.ok(meteors[i].material.uniforms.head.value.x>head.x&&meteors[i].material.uniforms.head.value.y<head.y,'meteor moves diagonally downward'); snapshot(f,2); assert.deepEqual(snapshot(f,t),before);assert.deepEqual(snapshot(f,t+90),before);
   snapshot(f,e.start+e.duration);assert.equal(meteors[i].visible,false);
  }
  f.environment.setState({timeOfDay:'night',weather:'clear'});const t=events[2].start+.4;const clear=snapshot(f,t).sky;
  f.environment.setState({weather:'cloudy'});assert.ok(snapshot(f,t).sky<clear);
  f.environment.setState({weather:'rain'});assert.ok(snapshot(f,t).sky<clear*.3);
  f.environment.setState({weather:'sandstorm'});assert.equal(snapshot(f,t).sky,0);assert.ok(meteors.every(m=>!m.visible));
 } finally {f.W.dispose();g.W.dispose();}
});
test('sky follows atmosphere camera framing, owns bounded resources and disposes safely',async()=>{
 const f=await fixture();const galaxy=f.effect('dubai-milky-way');const backdrop=f.effect('camera-relative-atmosphere');
 assert.equal(galaxy.parent,backdrop);assert.equal(galaxy.material.depthTest,true);assert.equal(galaxy.material.depthWrite,false);assert.ok(galaxy.position.z>0&&galaxy.position.z<.04);
 const resources=new Set(),disposed=new Set(),objects=[];backdrop.traverse(o=>{objects.push(o);if(o.geometry)resources.add(o.geometry);if(o.material)resources.add(o.material);});
 for(const r of resources)r.addEventListener('dispose',()=>disposed.add(r));
 for(const aspect of [.46,1.78,2.16]) {f.camera.aspect=aspect;f.camera.updateProjectionMatrix();snapshot(f,80);assert.ok(Math.abs(galaxy.material.uniforms.aspect.value-aspect)<1e-12);}
 for(let i=0;i<200;i++)snapshot(f,i*.73);
 const after=[];backdrop.traverse(o=>after.push(o));assert.deepEqual(after,objects);
 f.W.dispose();assert.equal(disposed.size,resources.size);assert.equal(f.effect('timelapse-environment'),undefined);
 const lamps=f.materials.map(m=>m.emissiveIntensity);f.environment.tick(80,f.camera);f.environment.setState({timeOfDay:'night'});assert.deepEqual(f.materials.map(m=>m.emissiveIntensity),lamps);
});

test('material off-state color and live shader level restore exactly on manual day, seek and replay',async()=>{
 const f=await fixture();try{for(const material of f.materials){material.userData.dubaiNight.level={value:0};material.userData.dubaiNight.offColor=new T.Color('#424a4a');material.userData.dubaiNight.onColor=new T.Color('#fff0cb');material.color.copy(material.userData.dubaiNight.offColor);}
 snapshot(f,80);for(const m of f.materials){assert.equal(m.userData.dubaiNight.level.value,1);assert.equal(m.color.getHexString(),'fff0cb');}
 for(const t of [0,25,40,54.9,55,89.99,90]){snapshot(f,t);for(const m of f.materials){assert.equal(m.userData.dubaiNight.level.value,0);assert.equal(m.color.getHexString(),'424a4a');assert.equal(m.emissiveIntensity,0);}}
 snapshot(f,80);f.environment.setState({timeOfDay:'day'});for(const m of f.materials){assert.equal(m.userData.dubaiNight.level.value,0);assert.equal(m.color.getHexString(),'424a4a');}
 f.environment.setState({timeOfDay:'night'});snapshot(f,20);for(const m of f.materials)assert.equal(m.userData.dubaiNight.level.value,1,'explicit manual night remains authoritative');
 f.environment.setMode('automatic');snapshot(f,20);for(const m of f.materials)assert.equal(m.userData.dubaiNight.level.value,0);
 }finally{f.W.dispose();}
});

test('Dubai automatic timeline never changes weather and exposes only day/night keys',async()=>{
 const f=await fixture();try{
  assert.ok(f.environment.getTrack().every(e=>['day','night'].includes(e.type)));
  for(const t of [0,17.6,32,48.8,55,67.5,80,84,89.99,90,122,-1])assert.deepEqual(snapshot(f,t).weights.weather,{clear:1,cloudy:0,rain:0,sandstorm:0});
 }finally{f.W.dispose();}
});
test('manual weather leaves automatic nightfall live and survives seek, loop, mode switches and reset',async()=>{
 const f=await fixture();try{
  for(const weather of ['rain','cloudy','sandstorm','clear']){
   snapshot(f,67.5);const lamps=f.materials.map(m=>m.emissiveIntensity);
   f.environment.setState({weather});assert.equal(f.environment.getMode(),'automatic','weather does not take day/night out of automatic');
   assert.equal(f.environment.getWeights().timeOfDay.night,.5,'changing weather preserves the current interpolated dusk');assert.deepEqual(f.materials.map(m=>m.emissiveIntensity),lamps);
   for(const [t,night] of [[80,1],[0,0],[67.5,.5],[157.5,.5],[55,0],[90,0]]){const s=snapshot(f,t);assert.equal(s.weights.weather[weather],1);assert.equal(s.weights.timeOfDay.night,night);}
   f.environment.setState({timeOfDay:'night'});assert.equal(f.environment.getMode(),'manual');assert.equal(snapshot(f,20).weights.weather[weather],1);assert.equal(f.environment.getWeights().timeOfDay.night,1);
   f.environment.setState({timeOfDay:'day'});assert.equal(snapshot(f,80).weights.weather[weather],1);assert.equal(f.environment.getWeights().timeOfDay.night,0);
   f.environment.setMode('automatic');assert.equal(snapshot(f,80).weights.timeOfDay.night,1);assert.equal(f.environment.getWeights().weather[weather],1);
   f.environment.setTrack([{id:'early-night',type:'night',time:0},{id:'old-weather',type:'rain',time:30}]);assert.deepEqual(f.environment.getTrack(),[{id:'early-night',type:'night',time:0}]);assert.equal(snapshot(f,20).weights.weather[weather],1);
   f.environment.resetTrack();assert.ok(f.environment.getTrack().every(e=>['day','night'].includes(e.type)));assert.equal(snapshot(f,20).weights.weather[weather],1);assert.equal(f.environment.getWeights().timeOfDay.night,0);
  }
 }finally{f.W.dispose();}
});
