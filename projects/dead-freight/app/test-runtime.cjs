/* Rendererless integration smoke: actual game/core/weapon/motion code and Three.js math.
 * DOM, RAF, WebGLRenderer and audio output are mocks. This is NOT browser, GPU,
 * visual, audio-listening, pointer-lock-policy or normal-input gameplay QA.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const Three=require('./vendor/three.min.js');
const root=__dirname;
let checks=0;const failures=[];
function check(name,fn){try{fn();checks++;console.log('PASS',name);}catch(error){failures.push({name,error});console.error('FAIL',name+'\n'+error.stack);}}
function eventTarget(){
 const listeners=new Map();
 return {
  addEventListener(type,fn){if(!listeners.has(type))listeners.set(type,[]);listeners.get(type).push(fn);},
  removeEventListener(type,fn){listeners.set(type,(listeners.get(type)||[]).filter(x=>x!==fn));},
  dispatch(type,props={}){const e={type,preventDefault(){this.defaultPrevented=true;},...props};for(const fn of [...(listeners.get(type)||[])])fn(e);this['on'+type]?.(e);return e;}
 };
}
function harness(){
 let now=1000;const frames=[],renders=[],worlds=[],audioCalls=[],elements=new Map(),checkedGeometry=new WeakSet();
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const context2d={fillRect(){},clearRect(){},strokeRect(){},fillText(){},beginPath(){},arc(){},fill(){},moveTo(){},lineTo(){},stroke(){}};
 function element(id,tag='div'){const classes=new Set();return Object.assign(eventTarget(),{id,tagName:tag.toUpperCase(),style:{},dataset:{},classList:{toggle(k,force){const on=force??!classes.has(k);if(on)classes.add(k);else classes.delete(k);return on;},contains:k=>classes.has(k),add:k=>classes.add(k),remove:k=>classes.delete(k)},textContent:'',innerHTML:'',hidden:false,checked:false,value:'',width:640,height:360,getContext(type){assert.equal(type,'2d');return context2d;}});}
 for(const match of html.matchAll(/<([a-z]+)\b([^>]*\bid="([^"]+)"[^>]*)>/gi)){const e=element(match[3],match[1]);e.checked=/\bchecked\b/.test(match[2]);e.hidden=/\bhidden\b/.test(match[2]);elements.set(match[3],e);}
 const document=Object.assign(eventTarget(),{hidden:false,pointerLockElement:null,getElementById(id){assert(elements.has(id),'game requested missing DOM id '+id);return elements.get(id);},createElement(tag){return element('',tag);},documentElement:{requestFullscreen(){return Promise.resolve();}}});
 document.exitPointerLock=()=>{document.pointerLockElement=null;document.dispatch('pointerlockchange');};
 const canvas=elements.get('game');canvas.requestPointerLock=()=>{document.pointerLockElement=canvas;document.dispatch('pointerlockchange');return Promise.resolve();};
 elements.get('difficulty').value='0.6';elements.get('minimap').style.display='none';
 function finite(values,label){for(const n of values)assert(Number.isFinite(n),label+' must stay finite');}
 class Renderer {
  constructor(){this.shadowMap={enabled:false};}
  setPixelRatio(){}setSize(w,h){assert(w>0&&h>0);}setRenderTarget(){}clear(){}clearDepth(){}
  render(scene,camera){
   scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);finite(camera.projectionMatrix.elements,'camera projection');finite(camera.matrixWorld.elements,'camera world matrix');finite(camera.matrixWorldInverse.elements,'camera inverse matrix');
   scene.traverse(o=>{finite(o.matrixWorld.elements,'object '+o.type+' matrix');if(o.geometry){const p=o.geometry.attributes.position;if(p&&(!checkedGeometry.has(o.geometry)||o.isLine)){finite(p.array,'geometry');checkedGeometry.add(o.geometry);}}});
   renders.push({scene,camera});if(renders.length>24)renders.shift();
  }
 }
 const audio={};for(const method of ['resume','suspend','stopAll','setMuted','setVolume','shot','impact','reload','event','destroy'])audio[method]=(...args)=>{audioCalls.push({method,args});return method==='resume'||method==='suspend'||method==='destroy'?Promise.resolve(true):true;};
 audio.stats=()=>({ready:true,running:true,muted:false,voices:0,buffers:0});
 const window=eventTarget();const sandbox={console,THREE:{...Three,WebGLRenderer:Renderer},document,window,innerWidth:1280,innerHeight:720,performance:{now:()=>now},requestAnimationFrame:fn=>{frames.push(fn);return frames.length;},cancelAnimationFrame(){},localStorage:{setItem(){},getItem(){return null;}},setTimeout,clearTimeout};
 Object.assign(window,{innerWidth:1280,innerHeight:720});
 const context=vm.createContext(sandbox);
 const scripts=[...html.matchAll(/<script\b[^>]*src="([^"]+)"[^>]*><\/script>/g)].map(m=>m[1]);
 for(const script of scripts){
  if(script==='vendor/three.min.js')continue;
  if(script==='audio.js'){context.DeadFreightAudio={create(options){audioCalls.push({method:'create',args:[options]});return audio;}};continue;}
  vm.runInContext(fs.readFileSync(path.join(root,script),'utf8'),context,{filename:script});
  if(script==='core.js'){const Mission=context.HC.Mission;context.HC.Mission=class extends Mission{constructor(...args){super(...args);worlds.push(this);}};}
 }
 function tick(dt=1/60){assert.equal(frames.length,1,'one RAF chain must remain scheduled');const cb=frames.shift();now+=dt*1000;cb(now);for(const e of elements.values())for(const value of Object.values(e.style))assert(!/NaN|Infinity/.test(String(value)),'CSS must remain finite');}
 function advance(seconds,dt=1/60){for(let n=0;n<Math.ceil(seconds/dt);n++)tick(dt);}
 function key(code,type='keydown'){window.dispatch(type,{code,repeat:false});}
 function tap(code){key(code);key(code,'keyup');}
 function click(id){elements.get(id).dispatch('click');}
 function mouse(button,type='mousedown'){(type==='mousedown'?canvas:window).dispatch(type,{button});}
 function world(){return worlds.at(-1);}
 function model(){for(const {scene} of renders){let found;scene.traverse(o=>{if(o.userData.slide&&o.userData.rightWrist)found=o;});if(found)return found;}assert.fail('viewmodel was not passed to renderer');}
 function camera(){const found=renders.find(({camera})=>camera.isPerspectiveCamera&&camera.near===.06);assert(found);return found.camera;}
 function eventCount(type){return audioCalls.filter(c=>c.method===type||((c.method==='event'||c.method==='reload')&&c.args[0]===type)).length;}
 return {context,document,window,elements,canvas,frames,renders,worlds,audioCalls,tick,advance,key,tap,click,mouse,world,model,camera,eventCount};
}
const h=harness();
check('unmodified script-order initialization and title frames have no TDZ/finite-math errors',()=>{h.tick();h.tick(0);h.tick(.05);assert(h.world());assert(h.frames.length===1);});
check('actual viewmodel exposes wrists and an updated tight shadow projection',()=>{
 const m=h.model();assert(m.userData.rightWrist.material.vertexColors);assert.equal(m.userData.rightWrist.material.name,'exposed-wrist');
 assert(m.userData.rightWrist.castShadow&&m.userData.rightWrist.receiveShadow);
 const lights=[];h.renders.forEach(({scene})=>scene.traverse(o=>{if(o.isDirectionalLight&&o.castShadow)lights.push(o);}));assert(lights.length);
 for(const l of lights){const c=l.shadow.camera;assert(Math.abs(c.projectionMatrix.elements[0]-2/(c.right-c.left))<1e-10,'shadow camera projection must reflect its configured frustum');}
});
check('start creates a fresh mission, resumes audio, and begins rendering',()=>{const old=h.world();h.click('start');h.tick();assert.notEqual(h.world(),old);assert.equal(h.elements.get('overlay').style.display,'none');assert(h.audioCalls.some(c=>c.method==='resume'));});
check('move/sprint, arrow aim and ADS remain finite and release correctly',()=>{const z=h.world().player.z;h.key('KeyW');h.key('ShiftLeft');h.advance(.15);h.key('KeyW','keyup');h.key('ShiftLeft','keyup');assert(h.world().player.z<z);h.key('ArrowLeft');h.advance(.1);h.key('ArrowLeft','keyup');h.mouse(2);h.advance(.35);assert(h.camera().fov<65);h.mouse(2,'mouseup');h.advance(.45);assert(h.camera().fov>77);});
check('fire and cycle route actual core events to audio and moving viewmodel',()=>{const w=h.world(),shots=w.shots;h.mouse(0);h.mouse(0,'mouseup');h.tick();assert.equal(w.shots,shots+1);assert.equal(w.cocked,false);assert(h.eventCount('shot')>0);h.advance(.25);h.tap('KeyQ');h.tick();assert(w.cocked);assert(h.eventCount('cycle')>0);h.advance(.25);h.tap('KeyF');h.tick();assert.equal(w.shots,shots+2);});
check('reload traverses stages, refills ammunition and returns magazine/support to neutral',()=>{const w=h.world();h.tap('KeyR');h.tick();assert(w.reload>0);h.advance(.7);assert(h.model().userData.magazine.position.y<-.1);h.advance(1.1);assert.equal(w.reload,0);assert.equal(w.ammo[0],6);assert.equal(h.model().userData.magazine.position.y,0);assert(h.eventCount('loaded')>0);assert(h.audioCalls.some(c=>c.method==='reload'),'staged reload must reach audio engine');});
check('weapon switch and held SMG fire work without adding a RAF chain',()=>{h.tap('Digit3');h.tick();assert.equal(h.world().weapon,2);h.advance(.3);const n=h.world().shots;h.mouse(0);h.advance(.35);h.mouse(0,'mouseup');assert(h.world().shots>=n+3);assert.equal(h.frames.length,1);assert(h.eventCount('switch')>0);});
function assertPauseCleanup(trigger){
 h.key('KeyW');h.key('ShiftLeft');h.mouse(2);h.mouse(0);h.tick();trigger();h.tick();assert.equal(h.elements.get('overlay').style.display,'grid');const w=h.world(),time=w.time,x=w.player.x,z=w.player.z,n=w.shots;h.advance(.2);assert.equal(w.time,time);assert.equal(w.player.x,x);assert.equal(w.player.z,z);assert.equal(w.shots,n);
 h.click('start');h.advance(.3);assert.equal(h.world(),w);assert.equal(w.player.x,x);assert.equal(w.player.z,z);assert.equal(w.shots,n,'held fire must not survive pause');assert(h.camera().fov>77,'held ADS must not survive pause');assert(h.audioCalls.some(c=>c.method==='suspend'));
}
check('Escape pause clears held movement, fire and ADS on resume',()=>assertPauseCleanup(()=>h.tap('Escape')));
check('blur interruption clears held movement, fire and ADS',()=>assertPauseCleanup(()=>h.window.dispatch('blur')));
check('visibility interruption clears held movement, fire and ADS',()=>assertPauseCleanup(()=>{h.document.hidden=true;h.document.dispatch('visibilitychange');h.document.hidden=false;}));
check('pointer-lock loss clears held movement, fire and ADS',()=>assertPauseCleanup(()=>h.document.exitPointerLock()));
check('restart clears held inputs, recoil, ADS and stale mission state',()=>{h.key('KeyW');h.mouse(2);h.mouse(0);const old=h.world();h.click('restart');h.tick();const w=h.world();assert.notEqual(w,old);assert.equal(w.weapon,0);assert.equal(w.shots,0);const z=w.player.z;h.advance(.3);assert.equal(w.player.z,z);assert.equal(w.shots,0);assert(h.camera().fov>77);});
check('laser/suppressor toggles rebuild the model safely and preserve finite attachment projection',()=>{h.tap('KeyL');h.tick();assert(h.model().userData.laserModule.visible);h.elements.get('suppressor').checked=false;h.elements.get('suppressor').dispatch('change');h.tick();assert.equal(h.model().userData.suppressor.visible,false);assert.equal(h.model().userData.muzzle.z,-.428);h.mouse(2);h.advance(.25);h.mouse(2,'mouseup');h.elements.get('suppressor').checked=true;h.elements.get('suppressor').dispatch('change');h.tick();assert(h.model().userData.suppressor.visible);});
check('sound setting is routed to engine mute control',()=>{h.elements.get('sound').checked=false;h.elements.get('sound').dispatch('change');assert(h.audioCalls.some(c=>c.method==='setMuted'&&c.args[0]===true));h.elements.get('sound').checked=true;h.elements.get('sound').dispatch('change');assert(h.audioCalls.some(c=>c.method==='setMuted'&&c.args[0]===false));});
check('actual ray hit routes material audio and displays kill confirmation',()=>{
 h.click('restart');h.tick();const w=h.world(),e=w.enemies[0];e.x=w.player.x;e.z=w.player.z-4;e.hp=1;h.tick();h.tap('KeyF');h.tick();assert.equal(w.kills,1);assert.equal(h.elements.get('crosshair').dataset.hit,'kill');assert(h.elements.get('crosshair').classList.contains('confirmed'));assert(h.audioCalls.some(c=>c.method==='impact'&&c.args[1]?.head));
});
check('active reload success routes timing cue and returns presentation to neutral',()=>{
 h.tap('KeyR');h.advance(.8);assert(h.world().reload>0);h.tap('KeyR');h.advance(.1);assert(h.world().perfect>0);assert.equal(h.world().reload,0);assert(h.eventCount('perfect')>0);assert.equal(h.model().userData.magazine.position.y,0);
});
check('reload cancellation by weapon switch resets the detached magazine pose',()=>{
 h.click('restart');h.tick();h.tap('KeyF');h.tick();h.tap('KeyR');h.advance(.5);assert(h.model().userData.magazine.position.y<0);h.tap('Digit2');h.tick();assert.equal(h.world().reload,0);assert.equal(h.model().userData.magazine.position.y,0);assert.equal(h.world().weapon,1);
});
check('queued fire-then-switch retains the weapon that actually fired',()=>{
 h.click('restart');h.tick();const before=h.audioCalls.length;h.tap('KeyF');h.elements.get('suppressor').checked=false;h.elements.get('suppressor').dispatch('change');h.tap('Digit2');h.tick();const shot=h.audioCalls.slice(before).find(c=>c.method==='shot');assert(shot);assert.equal(shot.args[0],0,'queued revolver shot must retain revolver sound/recoil identity');assert.equal(shot.args[1].suppressed,true,'queued shot must retain the suppressor state at firing');h.elements.get('suppressor').checked=true;h.elements.get('suppressor').dispatch('change');
});
check('death/retry and successful-extraction/next-contract transitions stay initialized',()=>{
 // Explicit state fixtures exercise presentation transitions, not combat success.
 h.world().player.hp=0;h.tick();assert.equal(h.elements.get('overlay').style.display,'grid');h.click('start');h.tick();assert(h.world().player.hp>0);
 h.world().bounty=true;h.world().player.x=0;h.world().player.z=25;h.tap('KeyE');h.tick();assert(h.world().extracted);assert.equal(h.elements.get('overlay').style.display,'grid');h.click('start');h.tick();assert.equal(h.world().level,2);assert.equal(h.world().extracted,false);
});
check('zero-elapsed movement frame cannot poison camera math',()=>{h.key('KeyW');h.tick(0);h.key('KeyW','keyup');h.tick();});
check('pagehide requests audio cleanup',()=>{h.window.dispatch('pagehide');assert(h.audioCalls.some(c=>c.method==='destroy'));});
if(failures.length){console.error(`${failures.length} runtime smoke check(s) failed.`);process.exitCode=1;}
console.log(`${checks} rendererless runtime integration checks passed. DOM, WebGLRenderer and audio are mocks; browser rendering, sound quality and normal-input play remain unverified.`);
