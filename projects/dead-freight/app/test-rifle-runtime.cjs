/* Actual AR/core/rig integration with renderer and audio mocks. No browser quality claim. */
'use strict';
const assert=require('node:assert/strict');
const {harness}=require('./test-runtime-harness.cjs');
let checks=0;const failures=[];
function check(name,fn){try{fn();checks++;console.log('PASS',name);}catch(error){failures.push(name);console.error('FAIL',name,error.stack);}}
const h=harness({}, {weapon:3});
const start=()=>{h.click('restart');h.advance(.5);return h.world();};
check('selected rifle initializes with actual rifle geometry, chamber HUD and audio readiness',()=>{
 h.tick();h.click('start');h.advance(.5);assert.equal(h.world().weapon,3);assert(h.model().userData.opticRear);assert(h.elements.get('weapon').textContent.includes('R-4'));assert(h.elements.get('weaponstate').textContent.includes('MAG 29 + CH 1'));assert(h.elements.get('audiostatus').textContent.includes('RECORDED'));assert.equal(h.frames.length,1);
});
check('holding auto fire uses finite cadence and releases cleanly',()=>{
 const w=start();h.mouse(0);h.advance(.51);h.mouse(0,'mouseup');const shots=w.shots;assert(shots>=5&&shots<=6,shots);h.advance(.3);assert.equal(w.shots,shots);assert.equal(w.rifle.total,30-shots);assert(h.audioCalls.some(c=>c.method==='shot'&&c.args[0]===3));
});
check('B toggles three-round burst; one F tap commits exactly one burst',()=>{
 const w=start();h.tap('KeyB');h.tick();assert.equal(w.rifle.mode,'burst');h.tap('KeyF');h.advance(.5);assert.equal(w.shots,3);h.advance(.5);assert.equal(w.shots,3);h.tap('KeyF');h.advance(.5);assert.equal(w.shots,6);
});
check('tactical reload preserves chamber, inserts a full magazine and stages audio once',()=>{
 const w=start();h.tap('KeyF');h.advance(.2);const before=h.audioCalls.length;h.tap('KeyR');h.tick();assert.equal(w.rifle.snapshot().reloadKind,'tactical');h.advance(.5);assert(w.rifle.chamber===1);assert(h.model().userData.magazine.position.y<h.model().userData.neutral.magazine.position.y-.1);h.advance(1.3);assert.equal(w.rifle.total,31);assert.equal(w.rifle.magazine,30);assert.equal(w.rifle.chamber,1);assert.equal(w.reload,0);const phases=h.audioCalls.slice(before).filter(c=>c.method==='reload'&&c.args[1]===3).map(c=>c.args[0]);for(const p of ['eject','insert','seat','close'])assert.equal(phases.filter(v=>v===p).length,1,p);assert(!phases.includes('charge'));
});
check('empty reload requires charging and ends with correct chamber and ammunition',()=>{
 const w=start();h.mouse(0);h.advance(3.5);h.mouse(0,'mouseup');assert.equal(w.rifle.total,0);assert(w.rifle.snapshot().boltLocked);const before=h.audioCalls.length;h.tap('KeyR');h.tick();assert.equal(w.rifle.snapshot().reloadKind,'empty');h.advance(1.5);assert.equal(w.rifle.chamber,0);h.advance(.8);assert.equal(w.rifle.total,30);assert.equal(w.rifle.chamber,1);assert.equal(w.rifle.magazine,29);assert(h.audioCalls.slice(before).some(c=>c.method==='reload'&&c.args[0]==='charge'&&c.args[1]===3));
});
check('buffered trigger during the final reload window fires once when legal',()=>{
 const w=start();h.tap('KeyF');h.advance(.15);h.tap('KeyR');h.advance(1.58);const shots=w.shots;h.tap('KeyF');h.advance(.3);assert.equal(w.shots,shots+1);h.advance(.3);assert.equal(w.shots,shots+1);
});
check('ADS pose and field of view follow authoritative gated aiming',()=>{
 const w=start();h.key('KeyW');h.key('ShiftLeft');h.advance(.2);assert.equal(w.rifle.snapshot().state,'sprinting');h.mouse(2);h.tick();assert(w.rifle.ads<.15);assert(h.camera().fov>74);h.advance(.5);assert(w.rifle.ads>.99);assert(h.camera().fov<60);h.mouse(2,'mouseup');h.key('ShiftLeft','keyup');h.key('KeyW','keyup');
});
check('held automatic fire resumes only after sprint recovery',()=>{
 const w=start();h.key('KeyW');h.key('ShiftLeft');h.advance(.2);h.mouse(0);h.advance(.2);assert.equal(w.shots,0);h.key('ShiftLeft','keyup');h.advance(.1);assert.equal(w.shots,0);h.advance(.3);assert(w.shots>=1);h.mouse(0,'mouseup');h.key('KeyW','keyup');
});
check('pause cancels pending burst and held trigger across resume',()=>{
 const w=start();h.tap('KeyB');h.tap('KeyF');h.tick();assert.equal(w.shots,1);h.tap('Escape');const time=w.time;h.advance(.5);assert.equal(w.time,time);h.click('start');h.advance(.4);assert.equal(w.shots,1);assert.equal(w.rifle.burstRemaining,0);assert(!w.paused);
});
check('switching away cancels pending burst and restores correct model on return',()=>{
 const w=start();h.tap('KeyB');h.tap('KeyF');h.tick();const shots=w.shots;h.tap('Digit1');h.advance(.2);assert.equal(w.weapon,0);h.tap('Digit4');h.advance(.5);assert.equal(w.weapon,3);assert(h.model().userData.opticRear);assert.equal(w.shots,shots);assert.equal(w.rifle.burstRemaining,0);
});
check('rifle attachment toggles retain authored reload transforms',()=>{
 start();h.tap('KeyF');h.advance(.2);h.tap('KeyR');h.advance(.6);h.tap('KeyL');h.tick();assert(h.model().userData.laserModule.visible);h.elements.get('suppressor').checked=false;h.elements.get('suppressor').dispatch('change');h.tick();assert.equal(h.model().userData.suppressor.visible,false);h.advance(1.3);const v=h.model().userData;assert(Math.abs(v.magazine.position.y-v.neutral.magazine.position.y)<1e-8);assert.equal(v.magazine.visible,true);
});
check('recorded-bank failure is visible instead of being advertised ready',()=>{
 start();const original=h.context.DeadFreightAudio.create;h.context.DeadFreightAudio.create=()=>({resume(){},suspend(){},stopAll(){},setMuted(){},destroy(){},preloadRifle(){return Promise.resolve(false);},stats(){return {rifle:{status:'error'}};}});h.window.dispatch('pageshow',{persisted:true});h.tick();assert(h.elements.get('audiostatus').textContent.includes('실패'));h.context.DeadFreightAudio.create=original;h.window.dispatch('pageshow',{persisted:true});h.tick();
});
check('restart clears rifle recoil, mode, magazine modifications and firing intent',()=>{
 const w=start();h.tap('KeyB');h.mouse(0);h.advance(.15);h.click('restart');h.advance(.5);assert.notEqual(h.world(),w);assert.equal(h.world().rifle.mode,'auto');assert.equal(h.world().shots,0);assert.equal(h.world().rifle.total,30);assert.equal(h.world().rifle.recoil,0);
});
check('walking and sprinting visibly spend stamina while rest restores it',()=>{
 const w=start();h.key('KeyW');h.advance(1);h.key('KeyW','keyup');assert(Math.abs(w.player.stamina-98)<.06);h.key('KeyW');h.key('ShiftLeft');h.advance(1);h.key('KeyW','keyup');h.key('ShiftLeft','keyup');assert(Math.abs(w.player.stamina-88)<.12);const before=w.player.stamina;h.advance(.25);assert(w.player.stamina>before+5.8);assert.equal(Number(h.elements.get('staminavalue').textContent),Math.ceil(w.player.stamina));
});
check('exhaustion keeps slow walking usable and resting restores sprint access',()=>{
 const w=start();w.player.stamina=0;const z=w.player.z;h.key('KeyW');h.key('ShiftLeft');h.advance(.5);assert(w.player.z<z-1.3);assert(w.player.z>z-1.6);assert.equal(w.player.stamina,0);assert.equal(h.elements.get('stamina').dataset.exhausted,'true');h.key('KeyW','keyup');h.key('ShiftLeft','keyup');h.advance(.8);assert(w.player.stamina>=18);assert.equal(w.player.fatigued,false);
});
check('night environment keeps distinct powered lights and bounded fog',()=>{
 start();const lights=new Set();let fog=null;for(const {scene} of h.renders){if(scene.fog)fog=scene.fog;scene.traverse(o=>{if(o.isPointLight&&o.name.startsWith('night-'))lights.add(o);});}assert.equal(lights.size,7);assert(fog&&fog.density<.01);for(const light of lights){assert(light.intensity>0&&light.distance<=34);assert.equal(light.castShadow,false);}
});
check('a rifle casing sounds on physical floor contact once, never immediately on eject',()=>{
 start();const before=h.eventCount('casingbounce');h.tap('KeyF');h.advance(.12);assert.equal(h.eventCount('casingbounce'),before);h.advance(1.2);assert.equal(h.eventCount('casingbounce'),before+1);h.advance(.6);assert.equal(h.eventCount('casingbounce'),before+1);const event=h.audioCalls.findLast(c=>c.method==='event'&&c.args[0]==='casingbounce');assert.equal(event.args[1].weapon,3);assert(event.args[1].distance>=0&&Math.abs(event.args[1].pan)<=1);
});
check('pause/restart cannot create a late phantom casing drop sound',()=>{
 start();const before=h.eventCount('casingbounce');h.tap('KeyF');h.advance(.1);h.tap('Escape');h.advance(1.4);assert.equal(h.eventCount('casingbounce'),before);h.click('start');h.advance(1.4);assert.equal(h.eventCount('casingbounce'),before);h.tap('KeyF');h.advance(.1);h.click('restart');h.advance(1.4);assert.equal(h.eventCount('casingbounce'),before);
});
check('roof coverage selects indoor sound and open ground selects outdoor',()=>{
 const w=start();w.player.x=-10;w.player.z=144;h.tick();h.tap('KeyF');h.tick();let shot=h.audioCalls.findLast(c=>c.method==='shot'&&c.args[0]===3);assert.equal(shot.args[1].environment,'indoor');h.advance(.2);w.player.x=0;w.player.z=145;h.tick();h.tap('KeyF');h.tick();shot=h.audioCalls.findLast(c=>c.method==='shot'&&c.args[0]===3);assert.equal(shot.args[1].environment,'outdoor');
});
check('armor-stopped hit has a distinct marker and material audio instead of false blood confirmation',()=>{
 const w=start(),e=w.enemies[0];e.x=w.player.x;e.z=w.player.z-4;e.hp=100;e.armor=100;h.key('ArrowDown');h.advance(.12);h.key('ArrowDown','keyup');h.mouse(2);h.advance(.25);h.tap('KeyF');h.tick();assert(e.armor<100);assert.equal(e.hp,100);assert.equal(h.elements.get('hitmarker').dataset.hit,'armor');const impact=h.audioCalls.findLast(c=>c.method==='impact');assert.equal(impact.args[0],'armor');assert.equal(impact.args[1].weapon,3);h.mouse(2,'mouseup');
});
check('canceling a rifle reload stops its cue group and emits no future insert/charge sounds',()=>{
 start();h.tap('KeyF');h.advance(.2);h.tap('KeyR');h.advance(.4);const before=h.audioCalls.length;h.tap('Digit1');h.tick();assert(h.audioCalls.slice(before).some(c=>c.method==='cancelRifleReload'));const afterCancel=h.audioCalls.length;h.advance(2.5);assert(!h.audioCalls.slice(afterCancel).some(c=>c.method==='reload'&&c.args[1]===3));
});
if(failures.length)process.exitCode=1;
console.log(`${checks} rendererless rifle integration checks passed; ${failures.length} failed. Actual browser, listening and input feel remain unverified.`);
