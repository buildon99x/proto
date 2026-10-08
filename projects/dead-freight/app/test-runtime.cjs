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
function harness(initialStorage={}){
 const storage=new Map(Object.entries(initialStorage));
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
 const window=eventTarget();const sandbox={console,THREE:{...Three,WebGLRenderer:Renderer},document,window,innerWidth:1280,innerHeight:720,performance:{now:()=>now},requestAnimationFrame:fn=>{frames.push(fn);return frames.length;},cancelAnimationFrame(){},localStorage:{setItem(key,value){storage.set(key,String(value));},getItem(key){return storage.get(key)??null;}},setTimeout,clearTimeout};
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
 return {context,document,window,elements,canvas,frames,renders,worlds,audioCalls,storage,tick,advance,key,tap,click,mouse,world,model,camera,eventCount};
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
check('fire automatically cycles without Q and routes audio and moving viewmodel',()=>{const w=h.world(),shots=w.shots;h.mouse(0);h.mouse(0,'mouseup');h.tick();assert.equal(w.shots,shots+1);assert.equal(w.cocked,false);assert(h.eventCount('shot')>0);h.advance(.35);assert(w.cocked);assert(h.eventCount('cycle')>0);h.advance(.25);h.tap('KeyF');h.tick();assert.equal(w.shots,shots+2);});
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
 h.click('restart');h.tick();const w=h.world(),e=w.enemies[0];e.x=w.player.x;e.z=w.player.z-4;e.hp=1;h.tick();h.tap('KeyF');h.tick();assert.equal(w.kills,1);assert.equal(h.elements.get('hitmarker').dataset.hit,'kill');assert(h.elements.get('hitmarker').classList.contains('confirmed'));assert(h.audioCalls.some(c=>c.method==='impact'&&c.args[1]?.head));
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
 h.world().bounty=true;const zone=h.world().extractions[0];h.world().player.x=zone.x;h.world().player.z=zone.z;h.tap('KeyE');h.tick();assert(!h.world().extracted);assert(!h.elements.get('extraction').hidden);h.advance(zone.holdTime+.05);assert(h.world().extracted);assert.equal(h.elements.get('overlay').style.display,'grid');h.click('start');h.tick();assert.equal(h.world().level,2);assert.equal(h.world().extracted,false);
});
check('zero-elapsed movement frame cannot poison camera math',()=>{h.key('KeyW');h.tick(0);h.key('KeyW','keyup');h.tick();});
check('Space jump changes real camera height and lands safely',()=>{h.click('restart');h.tick();const base=h.camera().position.y;h.tap('Space');h.advance(.2);assert(h.world().player.y>.5);assert(h.camera().position.y>base+.4);h.advance(.7);assert(h.world().player.grounded);assert(Math.abs(h.world().player.y)<1e-8);});
check('C sliding moves in fixed direction, lowers camera and recovers',()=>{h.click('restart');h.tick();const w=h.world(),z=w.player.z,eye=h.camera().position.y;h.key('KeyW');h.tap('KeyC');h.key('KeyW','keyup');h.advance(.2);assert(w.player.slide>0);assert(w.player.z<z-1);assert(h.camera().position.y<eye-.3);h.advance(1);assert.equal(w.player.slide,0);assert(h.camera().position.y>eye-.05);});
check('reticle persists through ADS and map shows updated region',()=>{h.click('restart');h.tick();h.mouse(2);h.advance(.4);assert.notEqual(h.elements.get('crosshair').style.opacity,'0');assert.equal(h.elements.get('crosshair').dataset.aim,'ads');h.tap('KeyM');h.tick();assert.equal(h.elements.get('minimap').style.display,'block');assert(h.elements.get('route').textContent.includes('m'));h.tap('KeyM');h.mouse(2,'mouseup');});
check('leaving extraction cancels HUD progress and re-entry requires E',()=>{h.click('restart');h.tick();const w=h.world(),zone=w.extractions[0];w.bounty=true;w.player.x=zone.x;w.player.z=zone.z;h.tap('KeyE');h.advance(.3);assert(w.extractionProgress>0);w.player.x=zone.x+zone.radius+1;h.tick();assert.equal(w.extractionZone,null);assert(h.elements.get('extraction').hidden);});
check('held SMG fire uses current airborne camera and current world matrices',()=>{
 h.click('restart');h.tick();const w=h.world();h.tap('Digit3');h.advance(.3);h.elements.get('laser').checked=false;h.elements.get('laser').dispatch('change');
 const prototype=h.context.THREE.Raycaster.prototype,previous=prototype.setFromCamera,fire=w.fire,accepted=[];let traced=null;
 prototype.setFromCamera=function(v,camera){previous.call(this,v,camera);traced={origin:this.ray.origin.clone(),camera:camera.position.clone()};};
 w.fire=function(hit){const ok=fire.call(this,hit);if(ok)accepted.push({...traced,playerY:this.player.y,playerX:this.player.x,playerZ:this.player.z});return ok;};
 try{h.mouse(0);h.tap('Space');h.key('KeyD');h.advance(.2,.05);h.key('KeyD','keyup');h.mouse(0,'mouseup');}
 finally{prototype.setFromCamera=previous;w.fire=fire;}
 assert(accepted.length>=2);const airborne=accepted.filter(v=>v.playerY>.1);assert(airborne.length);
 for(const shot of airborne){assert(Math.abs(shot.origin.x-shot.playerX)<1e-8,'ray origin must include current horizontal movement');assert(Math.abs(shot.origin.z-shot.playerZ)<1e-8);assert(Math.abs(shot.origin.y-shot.playerY-1.62)<1e-8,'ray origin must include current jump height');assert(shot.origin.distanceTo(shot.camera)<1e-8,'camera matrix must be updated before a ray is created');}
});
check('slide camera stays inside the low body on entry and after pause/resume',()=>{
 h.click('restart');h.tick();const w=h.world(),beam=w.walls.find(v=>v.slideable);w.player.x=beam.x;w.player.z=beam.z+1.1;h.tick();h.tap('KeyC');h.tick();
 assert(w.player.slide>0);assert(h.camera().position.y-w.player.y<=w.player.bodyHeight-.079999,'first slide frame must not expose a standing-height camera');
 h.tap('Escape');const z=w.player.z,slide=w.player.slide;h.advance(.2);assert.equal(w.player.z,z);assert.equal(w.player.slide,slide);h.click('start');h.tick();assert(w.player.slide>0);assert(h.camera().position.y-w.player.y<=w.player.bodyHeight-.079999,'resume must preserve low-clearance camera height');
});
check('switch and reload clear a previous weapon cycle animation',()=>{
 for(const action of ['Digit3','KeyR']){h.click('restart');h.tick();h.tap('KeyF');h.advance(.15);assert(h.model().userData.slide.position.z>.005,'fixture must be in an active automatic cycle');h.tap(action);h.tick();assert(Math.abs(h.model().userData.slide.position.z)<1e-8,'old pump pose must not leak into '+action);}
});
check('automatic cycle pose is neutral by the time the pistol can fire again',()=>{
 h.click('restart');h.tick();const w=h.world();h.tap('KeyF');h.tick();let frames=0;while((!w.cocked||w.cooldown>1e-6)&&frames++<100)h.tick(1/120);assert(frames<100);assert(w.cocked);assert(w.cooldown<=1e-6);assert(Math.abs(h.model().userData.slide.position.z)<1e-8,'mechanical recovery must finish before another permitted shot');const shots=w.shots;h.tap('KeyF');h.tick();assert.equal(w.shots,shots+1);
});
check('death loses carried value without changing the saved bank',()=>{
 h.click('restart');h.tick();const before=h.storage.get('deadfreight-best'),w=h.world();w.cash=375;w.cargo=2;w.player.hp=0;h.tick();assert.equal(h.storage.get('deadfreight-best'),before);assert(h.elements.get('stats').textContent.includes('화물 손실 375'));h.click('start');h.tick();assert.equal(h.world().cash,0);assert.equal(h.world().cargo,0);
});
check('successful extraction banks once and a fresh session restores the saved total',()=>{
 h.click('restart');h.tick();const old=JSON.parse(h.storage.get('deadfreight-best')||'{"cash":0}').cash,w=h.world(),zone=w.extractions[0];w.cash=425;w.cargo=2;w.bounty=true;w.player.x=zone.x;w.player.z=zone.z;h.tap('KeyE');h.advance(zone.holdTime+.05);assert(w.extracted);const saved=h.storage.get('deadfreight-best');assert.equal(JSON.parse(saved).cash,old+425);h.advance(.4);assert.equal(h.storage.get('deadfreight-best'),saved,'win must bank only once');h.click('start');h.tick();assert.equal(h.world().cash,0);assert.equal(h.world().cargo,0);assert.equal(h.storage.get('deadfreight-best'),saved);
 const restored=harness({'deadfreight-best':saved});restored.tick();restored.click('start');restored.tick();assert(restored.elements.get('loot').textContent.includes('보관 '+(old+425)));assert.equal(restored.world().cash,0);restored.window.dispatch('pagehide');
});
check('pagehide requests audio cleanup',()=>{h.window.dispatch('pagehide');assert(h.audioCalls.some(c=>c.method==='destroy'));});
if(failures.length){console.error(`${failures.length} runtime smoke check(s) failed.`);process.exitCode=1;}
console.log(`${checks} rendererless runtime integration checks passed. DOM, WebGLRenderer and audio are mocks; browser rendering, sound quality and normal-input play remain unverified.`);
