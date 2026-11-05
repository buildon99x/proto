import {createTimelapseEnvironment} from './timelapse-environment.js';
import {validateEnvironmentTrack} from './environment-timeline.js';

const DURATION = 90;
const smoothstep = (a, b, value) => {
  const x = Math.min(1, Math.max(0, (value - a) / (b - a)));
  return x * x * (3 - 2 * x);
};

/** Targets, not timer switches: the common timeline editor remains authoritative. */
export function createDubaiEnvironmentTrack() {
  return validateEnvironmentTrack([
    [0, 'clear'], [17.6, 'cloudy'], [32, 'rain'], [48.8, 'sandstorm'], [55, 'clear'],
    [0, 'day'], [55, 'day'], [80, 'night'], [84, 'night'], [89.99, 'day'],
  ].map(([time, type], i) => ({id: `dubai-environment-${i + 1}`, time, type})), DURATION);
}

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const milkyWayFragmentShader = `
varying vec2 vUv;
uniform float opacity;
uniform float aspect;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1., 0.)), f.x),
    mix(hash(i + vec2(0., 1.)), hash(i + vec2(1.)), f.x), f.y);
}
float nebula(vec2 p) {
  return .52 * noise(p) + .27 * noise(p * 2.03 + 9.1)
    + .14 * noise(p * 4.11 + 3.7) + .07 * noise(p * 8.19);
}
void main() {
  vec2 p = (vUv * 2. - 1.) * vec2(aspect, 1.);
  float band = p.y - .48 - p.x * .24;
  float clouds = nebula(p * 4.7 + 12.3);
  float wide = exp(-band * band * 13.);
  float core = exp(-band * band * 95.);
  float dust = smoothstep(.36, .64, nebula(p * vec2(10., 22.)));
  float light = wide * (.12 + .36 * clouds) + core * (.15 + .5 * clouds) * dust;
  vec2 cells = p * 145.;
  vec2 cell = floor(cells), q = fract(cells) - .5;
  vec2 jitter = vec2(hash(cell), hash(cell + 17.4)) - .5;
  float star = exp(-dot(q - jitter * .65, q - jitter * .65) * 180.);
  star *= step(.91, hash(cell + 71.)) * (.35 + .65 * hash(cell + 24.)) * wide;
  vec3 color = mix(vec3(.22, .31, .58), vec3(.69, .61, .76), clouds);
  color = mix(color, vec3(.88, .91, 1.), clamp(core * dust * .7 + star, 0., 1.));
  float upperSky = smoothstep(-.12, .24, p.y);
  gl_FragColor = vec4(color, clamp(light * .75 + star * .8, 0., .86) * upperSky * opacity);
  #include <colorspace_fragment>
}`;
const meteorFragmentShader = `
varying vec2 vUv;
uniform float opacity;
uniform float aspect;
uniform vec2 head;
uniform vec2 tail;
void main() {
  vec2 p = (vUv * 2. - 1.) * vec2(aspect, 1.);
  vec2 direction = head - tail;
  float along = clamp(dot(p - tail, direction) / max(dot(direction, direction), .00001), 0., 1.);
  float distanceToLine = length(p - mix(tail, head, along));
  float streak = exp(-distanceToLine * distanceToLine / .000012) * pow(along, 1.7);
  float glow = exp(-dot(p - head, p - head) / .00011);
  gl_FragColor = vec4(mix(vec3(.43, .67, 1.), vec3(.96, .98, 1.), along),
    min(1., streak * .85 + glow) * opacity);
  #include <colorspace_fragment>
}`;

/** Dubai-only additions share the base sky's camera transform and toolkit lifetime. */
export function createDubaiNightEnvironment(args) {
  const {W, scene} = args, T = W.THREE;
  const duration = args.duration ?? DURATION;
  const base = createTimelapseEnvironment({...args, duration, track: args.track ?? createDubaiEnvironmentTrack()});
  const backdrop = scene.getObjectByName('camera-relative-atmosphere');
  const materials = new Set();
  scene.traverse(object => {
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      if (material?.userData.dubaiNight) materials.add(material);
    }
  });
  const plane = W.own(new T.PlaneGeometry(2, 2));
  function layer(name, fragmentShader, order, z, uniforms = {}) {
    const material = W.own(new T.ShaderMaterial({name, vertexShader, fragmentShader,
      uniforms: {opacity: {value: 0}, aspect: {value: 1}, ...uniforms},
      transparent: true, depthTest: true, depthWrite: false, toneMapped: false}));
    const mesh = new T.Mesh(plane, material);
    mesh.name = name; mesh.renderOrder = order; mesh.position.z = z; mesh.frustumCulled = false;
    backdrop.add(mesh);
    return mesh;
  }
  const galaxy = layer('dubai-milky-way', milkyWayFragmentShader, -999.5, .02);
  let seed = 0xD0BA1;
  const random = () => {seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296;};
  const meteors = Array.from({length: 3}, (_, i) => {
    const event = Object.freeze({start: 66 + i * 4.3 + random() * .8, duration: .85 + random() * .55,
      x: -.65 + random() * .8, y: .57 + random() * .26,
      dx: .4 + random() * .35, dy: -.16 - random() * .2});
    const mesh = layer(`dubai-meteor-${i}`, meteorFragmentShader, -997, .12,
      {head: {value: new T.Vector2()}, tail: {value: new T.Vector2()}});
    mesh.userData.dubaiMeteor = event;
    return mesh;
  });
  let disposed = false, lastTime = 0;
  function sync() {
    if (disposed) return;
    const {timeOfDay, weather} = base.getWeights(), night = timeOfDay.night;
    for (const material of materials) {
      const {start, end, power} = material.userData.dubaiNight;
      material.emissiveIntensity = power * smoothstep(start, end, night);
    }
    const visibility = night * (weather.clear + weather.cloudy * .25 + weather.rain * .06);
    const aspect = backdrop.scale.x / backdrop.scale.y;
    galaxy.visible = visibility > 0;
    galaxy.material.uniforms.opacity.value = visibility;
    galaxy.material.uniforms.aspect.value = aspect;
    const time = ((lastTime % duration) + duration) % duration;
    for (const mesh of meteors) {
      const event = mesh.userData.dubaiMeteor, u = (time - event.start) / event.duration;
      const active = u > 0 && u < 1;
      const opacity = active ? visibility * smoothstep(0, .12, u) * (1 - smoothstep(.7, 1, u)) : 0;
      const uniforms = mesh.material.uniforms;
      mesh.visible = opacity > 0;
      uniforms.opacity.value = opacity; uniforms.aspect.value = aspect;
      const progress = Math.min(1, Math.max(0, u));
      uniforms.head.value.set(event.x * aspect + event.dx * progress, event.y + event.dy * progress);
      uniforms.tail.value.copy(uniforms.head.value).sub(newDirection.set(event.dx, event.dy).multiplyScalar(.27));
    }
  }
  const newDirection = new T.Vector2();
  W.own({dispose() {disposed = true;}});
  sync();
  return {...base,
    tick(t, camera) {
      if (disposed || !Number.isFinite(t)) return;
      lastTime = t; base.tick(t, camera); sync();
    },
    setState(partial) {base.setState(partial); sync();},
    setMode(mode) {base.setMode(mode); sync();},
    resetTrack() {base.setTrack(createDubaiEnvironmentTrack());},
  };
}
