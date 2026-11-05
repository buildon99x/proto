import {createDefaultEnvironmentTrack, validateEnvironmentTrack, sampleEnvironmentTrack} from './environment-timeline.js';
const WEATHER = new Set(['clear', 'cloudy', 'rain', 'sandstorm']);
const TIMES = new Set(['day', 'night']);
const wrap = (value, size) => ((value % size) + size) % size;
const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const noiseShader = `
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1., 0.)), f.x),
    mix(hash(i + vec2(0., 1.)), hash(i + vec2(1.)), f.x), f.y);
}
float cloudNoise(vec2 p) {
  return .56 * noise(p) + .27 * noise(p * 2.07 + 13.7) + .12 * noise(p * 4.13 + 7.1) + .05 * noise(p * 8.3);
}`;

/** Scene-level effects, deliberately outside the subject's bounds and static batches. */
export function createTimelapseEnvironment({W, scene, lights: {sky, sun}, profile = {}, duration, track: initialTrack, weatherTimeline = true}) {
  const T = W.THREE;
  const state = {weather: 'clear', timeOfDay: 'day'};
  let mode = duration === undefined ? 'manual' : 'automatic';
  // Opt-out worlds retain manual weather while only day/night follows the clock.
  const validateTrack = events => validateEnvironmentTrack(events, duration).filter(event => weatherTimeline || TIMES.has(event.type));
  let track = duration === undefined ? [] : validateTrack(initialTrack ?? createDefaultEnvironmentTrack(duration));
  let weights = {weather:{clear:1,cloudy:0,rain:0,sandstorm:0},timeOfDay:{day:1,night:0}};
  const baseline = {
    background: scene.background, fog: scene.fog,
    skyColor: sky.color.clone(), groundColor: sky.groundColor.clone(), ambient: sky.intensity,
    sunColor: sun.color.clone(), sunlight: sun.intensity,
  };
  const distance = Math.hypot(...(profile.camera ?? [2.2, 12, 32]));
  const weatherBackground = new T.Color();
  const weatherFog = new T.Fog('#9babb9', 18, 78);
  const root = new T.Group();
  root.name = 'timelapse-environment';
  root.userData.skipBatch = true;
  scene.add(root);
  const backdrop = new T.Group();
  backdrop.name = 'camera-relative-atmosphere';
  root.add(backdrop);
  const plane = W.own(new T.PlaneGeometry(2, 2));
  let disposed = false;

  function shaderMesh(name, fragmentShader, uniforms, order, {transparent = true, depthTest = true, depthWrite = false} = {}) {
    const material = W.own(new T.ShaderMaterial({
      vertexShader, fragmentShader, uniforms, transparent, depthTest, depthWrite, toneMapped: false,
    }));
    const mesh = new T.Mesh(plane, material);
    mesh.name = name;
    mesh.renderOrder = order;
    mesh.frustumCulled = false;
    backdrop.add(mesh);
    return mesh;
  }
  const skyDome = shaderMesh('atmosphere-sky', `
    varying vec2 vUv; uniform vec3 horizon; uniform vec3 zenith; uniform float opacity;
    void main() {
      gl_FragColor = vec4(mix(horizon, zenith, smoothstep(.15, 1., vUv.y)), opacity);
      #include <colorspace_fragment>
    }`, {horizon: {value: new T.Color()}, zenith: {value: new T.Color()}, opacity: {value: 0}}, -1000, {transparent: true, depthTest: true, depthWrite: true});

  const clouds = shaderMesh('cloud-cover', `
    varying vec2 vUv; uniform float time; uniform float aspect;
    uniform float opacity; uniform vec3 lightColor; uniform vec3 shadowColor;
    ${noiseShader}
    void main() {
      vec2 p = vec2(vUv.x * aspect * 3.0, vUv.y * 5.5);
      p += vec2(sin(time), cos(time)) * .85;
      float n = cloudNoise(p + vec2(0., cloudNoise(p * .6) * .9));
      float ridge = smoothstep(.35, .65, n);
      float upperSky = smoothstep(.32, .74, vUv.y);
      vec3 color = mix(shadowColor, lightColor, smoothstep(.34, .78, n));
      gl_FragColor = vec4(color, ridge * upperSky * opacity);
      #include <colorspace_fragment>
    }`, {
      time: {value: 0}, aspect: {value: 1}, opacity: {value: .9},
      lightColor: {value: new T.Color('#d8dde0')}, shadowColor: {value: new T.Color('#7b8894')},
    }, -996);
  clouds.position.z = .16;

  // Seed once. Both worlds and every subsequent mount get the same calm star field.
  let seed = 48271;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const starPositions = new Float32Array(210 * 3), starColors = new Float32Array(210 * 3);
  for (let i = 0; i < 210; i++) {
    starPositions[i * 3] = random() * 1.96 - .98;
    starPositions[i * 3 + 1] = .03 + random() * .95;
    starPositions[i * 3 + 2] = .04;
    const brightness = .35 + random() * .65;
    starColors[i * 3] = brightness * .84;
    starColors[i * 3 + 1] = brightness * .91;
    starColors[i * 3 + 2] = brightness;
  }
  const starGeometry = W.own(new T.BufferGeometry());
  starGeometry.setAttribute('position', new T.BufferAttribute(starPositions, 3));
  starGeometry.setAttribute('color', new T.BufferAttribute(starColors, 3));
  const stars = new T.Points(starGeometry, W.own(new T.PointsMaterial({
    vertexColors: true, size: 1.75, sizeAttenuation: false, transparent: true,
    opacity: .92, depthWrite: false, fog: false, toneMapped: false,
  })));
  stars.name = 'night-stars'; stars.renderOrder = -999; stars.frustumCulled = false;
  backdrop.add(stars);

  const moon = shaderMesh('night-moon', `
    varying vec2 vUv; uniform float opacity;
    ${noiseShader}
    void main() {
      vec2 p = (vUv - .5) * 2.; float r = length(p);
      float disc = 1. - smoothstep(.61, .65, r);
      float halo = exp(-r * r * 4.5) * .16;
      float sphere = sqrt(max(0., 1. - dot(p / .65, p / .65)));
      float lit = .38 + .62 * max(0., dot(vec3(p / .65, sphere), normalize(vec3(-.4, .35, 1.))));
      float craters = .87 + .13 * cloudNoise(p * 12.);
      vec3 color = vec3(.91, .93, 1.) * lit * craters;
      gl_FragColor = vec4(mix(vec3(.56, .66, .85), color, disc), (disc + (1. - disc) * halo) * opacity);
      #include <colorspace_fragment>
    }`, {opacity: {value: .95}}, -998);
  moon.position.set(-.63, .65, .08);

  // The haze is a translucent procedural veil, not an image or a subject transform.
  const haze = shaderMesh('sand-haze', `
    varying vec2 vUv; uniform float time; uniform float aspect; uniform vec3 color; uniform float opacity;
    ${noiseShader}
    void main() {
      vec2 p = vec2(vUv.x * aspect * 2.7, vUv.y * 12.) + vec2(sin(time), cos(time)) * 2.4;
      float wind = cloudNoise(p);
      float low = 1. - smoothstep(.15, .95, vUv.y);
      gl_FragColor = vec4(color, opacity * (.24 + .5 * wind + .26 * low));
      #include <colorspace_fragment>
    }`, {time: {value: 0}, aspect: {value: 1}, color: {value: new T.Color('#ba8b4f')}, opacity: {value: .23}}, 20, {depthTest: false});

  function precipitation(name, count, color, opacity) {
    const geometry = W.own(new T.BufferGeometry());
    const positions = new T.BufferAttribute(new Float32Array(count * 6), 3);
    positions.setUsage(T.DynamicDrawUsage);
    geometry.setAttribute('position', positions);
    const material = W.own(new T.LineBasicMaterial({color, opacity, transparent: true, depthWrite: false, fog: false, toneMapped: false}));
    const lines = new T.LineSegments(geometry, material);
    lines.name = name; lines.frustumCulled = false; lines.renderOrder = 5;
    root.add(lines);
    const seeds = new Float32Array(count * 4);
    for (let i = 0; i < seeds.length; i++) seeds[i] = random();
    return {lines, positions, seeds, count};
  }
  const rain = precipitation('falling-rain', 620, '#b6d6ee', .46);
  const sand = precipitation('windblown-sand', 540, '#ead3a1', .6);

  function restoreBaseline() {
    scene.background = baseline.background;
    scene.fog = baseline.fog;
    sky.color.copy(baseline.skyColor); sky.groundColor.copy(baseline.groundColor); sky.intensity = baseline.ambient;
    sun.color.copy(baseline.sunColor); sun.intensity = baseline.sunlight;
  }

  function applyDiscreteState() {
    const {weather, timeOfDay} = state;
    const night = timeOfDay === 'night', storm = weather === 'sandstorm';
    const cloudy = weather === 'cloudy', wet = weather === 'rain';
    root.visible = night || weather !== 'clear';
    rain.lines.visible = wet; sand.lines.visible = storm;
    clouds.visible = cloudy || wet; haze.visible = storm;
    stars.visible = moon.visible = night && !storm;
    stars.material.opacity = wet ? .12 : cloudy ? .38 : .92;
    moon.material.uniforms.opacity.value = wet ? .26 : cloudy ? .63 : .95;
    skyDome.material.uniforms.opacity.value = root.visible ? 1 : 0;
    if (!root.visible) { restoreBaseline(); return; }

    const horizon = storm ? (night ? '#3b3026' : '#bda078') : night ? '#263954' : wet ? '#8c9ba7' : '#bdc8cd';
    const zenith = storm ? (night ? '#1b1920' : '#877357') : night ? '#080e23' : wet ? '#4c6174' : '#7d93a8';
    weatherBackground.set(horizon);
    scene.background = weatherBackground;
    skyDome.material.uniforms.horizon.value.set(horizon);
    skyDome.material.uniforms.zenith.value.set(zenith);
    weatherFog.color.set(horizon);
    weatherFog.near = storm ? distance * .35 : wet ? distance * .55 : distance * .72;
    weatherFog.far = distance + (storm ? 29 : wet ? 49 : 76);
    scene.fog = weatherFog;

    if (night) {
      sky.color.set(storm ? '#a9a3b6' : '#9cb7e5');
      sky.groundColor.set(storm ? '#655747' : '#59677e');
      sky.intensity = Math.max(.66, baseline.ambient * .68);
      sun.color.set(storm ? '#c2b3a1' : '#c2d6ff');
      sun.intensity = storm ? .50 : wet ? .55 : .83;
    } else {
      sky.color.set(storm ? '#e2c9a0' : '#dce5eb');
      sky.groundColor.set(storm ? '#b18a5b' : '#929798');
      sky.intensity = baseline.ambient * (storm ? 1.02 : 1.15);
      sun.color.set(storm ? '#ecc78e' : '#dce8f3');
      sun.intensity = baseline.sunlight * (storm ? .25 : wet ? .24 : .42);
    }
    clouds.material.uniforms.lightColor.value.set(night ? '#53647c' : wet ? '#a4b2bf' : '#e0e6e8');
    clouds.material.uniforms.shadowColor.value.set(night ? '#172238' : wet ? '#526575' : '#8595a3');
    clouds.material.uniforms.opacity.value = wet ? .98 : .85;
    rain.lines.material.opacity = night ? .5 : .46;
    sand.lines.material.opacity = night ? .38 : .6;
    haze.material.uniforms.color.value.set(night ? '#75604c' : '#c7a371');
    haze.material.uniforms.opacity.value = night ? .17 : .23;
  }

  function setState(partial) {
    if (!partial || typeof partial !== 'object' || Array.isArray(partial)) throw new TypeError('Atmosphere state must be an object.');
    for (const key of Reflect.ownKeys(partial)) if (key !== 'weather' && key !== 'timeOfDay') throw new Error(`Unknown atmosphere state key: ${String(key)}`);
    if (Object.hasOwn(partial, 'weather') && !WEATHER.has(partial.weather)) throw new Error('Unknown weather.');
    if (Object.hasOwn(partial, 'timeOfDay') && !TIMES.has(partial.timeOfDay)) throw new Error('Unknown timeOfDay.');
    if (disposed) return;
    if (Object.hasOwn(partial, 'weather')) state.weather = partial.weather;
    if (Object.hasOwn(partial, 'timeOfDay')) state.timeOfDay = partial.timeOfDay;
    const weatherOnly = !weatherTimeline && mode === 'automatic' && Object.hasOwn(partial, 'weather') && !Object.hasOwn(partial, 'timeOfDay');
    if (!weatherOnly) mode = 'manual';
    weights = {weather:Object.fromEntries([...WEATHER].map(type=>[type,type===state.weather?1:0])),timeOfDay:weatherOnly ? weights.timeOfDay : Object.fromEntries([...TIMES].map(type=>[type,type===state.timeOfDay?1:0]))};
    if (weatherOnly) applyWeights(weights); else applyDiscreteState();
  }

  // Cache each authored atmosphere once. Tick blends only numeric fields and existing colors.
  const presets = [];
  // Transparent scenes still need a numeric color for blended atmosphere presets.
  const baselineColor = baseline.background?.isColor ? baseline.background : new T.Color(profile.background ?? '#ffffff');
  for (const weather of WEATHER) for (const timeOfDay of TIMES) {
    Object.assign(state,{weather,timeOfDay}); applyDiscreteState();
    const active = root.visible;
    presets.push({weather,timeOfDay,
      colors:[scene.background,skyDome.material.uniforms.horizon.value,skyDome.material.uniforms.zenith.value,scene.fog?.color ?? scene.background,sky.color,sky.groundColor,sun.color,clouds.material.uniforms.lightColor.value,clouds.material.uniforms.shadowColor.value,haze.material.uniforms.color.value].map((color,i)=>(!active && i<4 ? baselineColor : color ?? baselineColor).clone()),
      values:[active?1:0,1/(scene.fog?.near ?? 1e6),1/(scene.fog?.far ?? 1e6),sky.intensity,sun.intensity,
        clouds.visible&&active?clouds.material.uniforms.opacity.value:0,
        stars.visible&&active?stars.material.opacity:0,moon.visible&&active?moon.material.uniforms.opacity.value:0,
        rain.lines.visible&&active?rain.lines.material.opacity:0,sand.lines.visible&&active?sand.lines.material.opacity:0,
        haze.visible&&active?haze.material.uniforms.opacity.value:0]});
  }
  Object.assign(state,{weather:'clear',timeOfDay:'day'}); applyDiscreteState();
  const mixedColors=presets[0].colors.map(()=>new T.Color()), mixedValues=new Float64Array(11);
  function applyWeights(sample) {
    weights=sample;
    state.weather=[...WEATHER].reduce((a,b)=>sample.weather[a]>=sample.weather[b]?a:b);
    state.timeOfDay=sample.timeOfDay.night>sample.timeOfDay.day?'night':'day';
    mixedValues.fill(0); for (const color of mixedColors) color.setRGB(0,0,0);
    for (const preset of presets) {
      const weight=sample.weather[preset.weather]*sample.timeOfDay[preset.timeOfDay];
      if (!weight) continue;
      for (let i=0;i<mixedValues.length;i++) mixedValues[i]+=preset.values[i]*weight;
      for (let i=0;i<mixedColors.length;i++) { const source=preset.colors[i],target=mixedColors[i]; target.r+=source.r*weight; target.g+=source.g*weight; target.b+=source.b*weight; }
    }
    root.visible=mixedValues[0]>0;
    if (!root.visible) { restoreBaseline(); return; }
    weatherBackground.copy(mixedColors[0]); scene.background=weatherBackground;
    skyDome.material.uniforms.horizon.value.copy(mixedColors[1]); skyDome.material.uniforms.zenith.value.copy(mixedColors[2]); skyDome.material.uniforms.opacity.value=mixedValues[0];
    weatherFog.color.copy(mixedColors[3]); weatherFog.near=1/mixedValues[1]; weatherFog.far=1/mixedValues[2]; scene.fog=weatherFog;
    sky.color.copy(mixedColors[4]); sky.groundColor.copy(mixedColors[5]); sun.color.copy(mixedColors[6]); sky.intensity=mixedValues[3]; sun.intensity=mixedValues[4];
    clouds.material.uniforms.lightColor.value.copy(mixedColors[7]); clouds.material.uniforms.shadowColor.value.copy(mixedColors[8]); haze.material.uniforms.color.value.copy(mixedColors[9]);
    clouds.material.uniforms.opacity.value=mixedValues[5]; stars.material.opacity=mixedValues[6]; moon.material.uniforms.opacity.value=mixedValues[7];
    rain.lines.material.opacity=mixedValues[8]; sand.lines.material.opacity=mixedValues[9]; haze.material.uniforms.opacity.value=mixedValues[10];
    clouds.visible=mixedValues[5]>0; stars.visible=mixedValues[6]>0; moon.visible=mixedValues[7]>0; rain.lines.visible=mixedValues[8]>0; sand.lines.visible=mixedValues[9]>0; haze.visible=mixedValues[10]>0;
  }
  function setTrack(events) {
    if (disposed || duration === undefined) return;
    track=validateTrack(events);
  }
  function setMode(value) {
    if (disposed) return;
    if (!['automatic','manual'].includes(value)) throw new TypeError('Unknown environment mode.');
    if (value==='automatic' && duration===undefined) throw new Error('Automatic environment requires a world duration.');
    mode=value;
    if (mode==='manual') setState({});
  }
  function getTrack() { return track.map(event=>({...event})); }
  function getWeights() { return {weather:{...weights.weather},timeOfDay:{...weights.timeOfDay}}; }

  // Scratch vectors live for the mount. Camera moves do not alter subject geometry or framing.
  const cameraPosition = new T.Vector3(), cameraQuaternion = new T.Quaternion(), offset = new T.Vector3();
  function tick(t, camera) {
    if (disposed || !Number.isFinite(t)) return;
    if (mode === 'automatic') {
      const sampled = sampleEnvironmentTrack(track,t,duration);
      if (!weatherTimeline) sampled.weather = weights.weather;
      applyWeights(sampled);
    }
    const loopTime = duration === undefined ? t : wrap(t,duration);
    const drift = duration === undefined ? t*.02 : loopTime/duration*Math.PI*2;
    clouds.material.uniforms.time.value = drift;
    haze.material.uniforms.time.value = drift;
    if (camera) {
      camera.getWorldPosition(cameraPosition); camera.getWorldQuaternion(cameraQuaternion);
      const depth = camera.far * .88;
      let halfWidth, halfHeight, centerX = 0, centerY = 0;
      if (camera.isOrthographicCamera) {
        halfWidth = (camera.right - camera.left) / (2 * camera.zoom);
        halfHeight = (camera.top - camera.bottom) / (2 * camera.zoom);
        centerX = (camera.right + camera.left) / 2;
        centerY = (camera.top + camera.bottom) / 2;
      } else {
        halfHeight = depth * Math.tan(T.MathUtils.degToRad(camera.fov * .5)) / camera.zoom;
        halfWidth = halfHeight * camera.aspect;
      }
      offset.set(centerX, centerY, -depth).applyQuaternion(cameraQuaternion);
      backdrop.position.copy(cameraPosition).add(offset);
      backdrop.quaternion.copy(cameraQuaternion);
      backdrop.scale.set(halfWidth, halfHeight, 1);
      const moonRadius = Math.min(halfWidth, halfHeight) * .135;
      moon.scale.set(moonRadius / halfWidth, moonRadius / halfHeight, 1);
      clouds.material.uniforms.aspect.value = halfWidth / halfHeight;
      haze.material.uniforms.aspect.value = halfWidth / halfHeight;
    }
    if (rain.lines.visible) {
      const {seeds, positions, count} = rain, p = positions.array;
      for (let i = 0; i < count; i++) {
        const j = i * 4, k = i * 6;
        const x = wrap(seeds[j] * 34 + loopTime * (duration === undefined ? .65 : Math.max(1,Math.round(.65*duration/34))*34/duration), 34) - 17;
        const y = .3 + wrap(seeds[j + 1] * 21 - loopTime * (duration === undefined ? (9 + seeds[j + 3] * 4) : Math.max(1,Math.round((9+seeds[j+3]*4)*duration/21))*21/duration), 21);
        const z = seeds[j + 2] * 34 - 17, length = .35 + seeds[j + 3] * .42;
        p[k] = x; p[k + 1] = y; p[k + 2] = z;
        p[k + 3] = x - length * .055; p[k + 4] = y + length; p[k + 5] = z;
      }
      positions.needsUpdate = true;
    }
    if (sand.lines.visible) {
      const {seeds, positions, count} = sand, p = positions.array;
      for (let i = 0; i < count; i++) {
        const j = i * 4, k = i * 6;
        const x = wrap(seeds[j] * 40 + loopTime * (duration === undefined ? (5 + seeds[j + 3] * 4) : Math.max(1,Math.round((5+seeds[j+3]*4)*duration/40))*40/duration), 40) - 20;
        const y = .6 + seeds[j + 1] * seeds[j + 1] * 17 + .32 * Math.sin((duration === undefined ? t*.9 : drift*14) + seeds[j] * 12);
        const z = seeds[j + 2] * 40 - 20 + .25 * Math.sin((duration === undefined ? t*.6 : drift*10) + seeds[j + 1] * 9);
        p[k] = x; p[k + 1] = y; p[k + 2] = z;
        p[k + 3] = x - .05 - seeds[j + 3] * .23; p[k + 4] = y - .015; p[k + 5] = z;
      }
      positions.needsUpdate = true;
    }
  }

  // The toolkit owns disposal, including this scene-level group outside its content root.
  W.own({dispose() {
    if (disposed) return;
    disposed = true;
    restoreBaseline();
    root.removeFromParent();
  }});
  applyDiscreteState();
  return {setState, getState: () => ({...state}), tick, getTrack, setTrack, getMode:()=>mode, setMode, getWeights, resetTrack:()=>setTrack(createDefaultEnvironmentTrack(duration))};
}
