/* Mocked loading/lifecycle integration. This does not listen to audio or drive a real browser. */
'use strict';
const assert=require('node:assert/strict'),{harness}=require('./test-runtime-harness.cjs');
const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
let checks=0;
async function check(name,fn){await fn();checks++;console.log('PASS',name);}
(async()=>{
 await check('cold preparation keeps normal and isolated saves untouched, with no pointer lock or raid time',async()=>{
  const d=deferred(),bank={status:'idle',loaded:0,total:79},writes=[],h=harness({'deadfreight-best':'{"cash":2920}'},{search:'?testProfile=local-qa',audioBank:bank,audioPreload:()=>d.promise,onStorageWrite:k=>writes.push(k)}),world=h.world();
  h.click('start');await flush();h.click('start');h.click('restart');h.advance(1);assert.equal(h.world(),world);assert.equal(world.activeTime,0);assert.equal(h.document.pointerLockElement,null);assert.equal(writes.length,0);assert(h.elements.get('start').disabled);assert.equal(h.audioCalls.filter(c=>c.method==='preloadRifle').length,1);
  bank.status='loading';bank.loaded=38;h.tick();assert.match(h.elements.get('audio-load').textContent,/38\/79/);
  bank.status='ready';bank.loaded=79;d.resolve(true);await flush();assert(!h.elements.get('start').disabled);assert.match(h.elements.get('audio-load').textContent,/준비 완료/);assert.equal(writes.length,0);assert.equal(h.document.pointerLockElement,null);
  h.click('start');assert.notEqual(h.world(),world);assert.equal(h.document.pointerLockElement,h.canvas);assert.equal(writes.length,1);assert.equal(writes[0],'deadfreight-test:local-qa:deadfreight-best');assert.equal(h.storage.get('deadfreight-best'),'{"cash":2920}');h.window.dispatch('pagehide');
 });
 await check('failed load leaves the menu and original save intact and supports an explicit retry',async()=>{
  let good=false;const bank={status:'error',total:79},h=harness({'deadfreight-best':'{"cash":2920}'},{audioBank:bank,audioPreload:()=>Promise.resolve(good)});
  h.click('start');await flush();assert.match(h.elements.get('audio-load').textContent,/준비 실패/);assert(!h.elements.get('start').disabled);assert.equal(h.storage.get('deadfreight-best'),'{"cash":2920}');
  good=true;h.click('start');bank.status='ready';await flush();assert.match(h.elements.get('audio-load').textContent,/준비 완료/);assert.equal(h.document.pointerLockElement,null);h.click('start');assert(h.document.pointerLockElement);h.window.dispatch('pagehide');
 });
 await check('failed audio unlock does not fetch or deploy and remains retryable',async()=>{
  const h=harness({}, {audioBank:{status:'idle'},audioResume:()=>Promise.resolve(false)});h.click('start');await flush();assert.equal(h.audioCalls.filter(c=>c.method==='preloadRifle').length,0);assert.equal(h.storage.size,0);assert.match(h.elements.get('audio-load').textContent,/실패/);h.window.dispatch('pagehide');
 });
 await check('explicit mute permits deployment and late loading completion cannot start a second raid',async()=>{
  const d=deferred(),bank={status:'loading'},h=harness({}, {audioBank:bank,audioPreload:()=>d.promise});h.click('start');await flush();h.elements.get('sound').checked=false;h.elements.get('sound').dispatch('change');assert(!h.elements.get('start').disabled);h.click('start');const world=h.world(),raw=h.storage.get('deadfreight-best');bank.status='ready';d.resolve(true);await flush();assert.equal(h.world(),world);assert.equal(h.storage.get('deadfreight-best'),raw);assert(h.elements.get('audio-load').hidden);h.window.dispatch('pagehide');
 });
 await check('page lifecycle invalidates pending completion without stale UI or saved deployment',async()=>{
  const d=deferred(),bank={status:'loading'},h=harness({}, {audioBank:bank,audioPreload:()=>d.promise});h.click('start');await flush();h.window.dispatch('pagehide');h.window.dispatch('pageshow',{persisted:true});assert(!h.elements.get('start').disabled);bank.status='ready';d.resolve(true);await flush();assert.equal(h.storage.size,0);assert(h.elements.get('audio-load').hidden);assert.equal(h.document.pointerLockElement,null);h.window.dispatch('pagehide');
 });
 await check('ready banks retain one-click start and pause-resume without duplicate deployment',async()=>{
  const h=harness();assert(!h.elements.get('suppressor').checked);h.click('start');const world=h.world(),raw=h.storage.get('deadfreight-best');h.tap('Escape');assert(!h.audioCalls.some(c=>c.method==='suspend'));assert(h.audioCalls.some(c=>c.method==='stopAll'));h.click('start');assert.equal(h.world(),world);assert.equal(h.storage.get('deadfreight-best'),raw);assert(h.document.pointerLockElement);h.window.dispatch('pagehide');
 });
 await check('suspended ready bank must unlock before any deployment',async()=>{
  const options={audioBank:{status:'ready'},audioRunning:false,audioResume:()=>Promise.resolve(false)},h=harness({},options);h.click('start');await flush();assert.equal(h.storage.size,0);assert.equal(h.document.pointerLockElement,null);assert.match(h.elements.get('audio-load').textContent,/실패/);options.audioResume=()=>{options.audioRunning=true;return Promise.resolve(true);};h.click('start');await flush();assert.equal(h.storage.size,0);h.click('start');assert(h.document.pointerLockElement);h.window.dispatch('pagehide');
 });
 await check('closing a raid bag during cold audio preparation restores a visible usable menu',async()=>{
  const d=deferred(),bank={status:'idle'},h=harness({}, {audioBank:bank,audioPreload:()=>d.promise});h.elements.get('sound').checked=false;h.click('start');const world=h.world(),raw=h.storage.get('deadfreight-best');h.tap('Escape');h.elements.get('sound').checked=true;h.elements.get('sound').dispatch('change');h.click('inventory-open');h.uiAction('close');await flush();assert(h.elements.get('inventory-overlay').hidden);assert.equal(h.elements.get('overlay').style.display,'grid');assert(world.paused);bank.status='ready';d.resolve(true);await flush();assert.equal(h.elements.get('overlay').style.display,'grid');assert(!h.elements.get('start').disabled);assert.equal(h.storage.get('deadfreight-best'),raw);h.click('start');assert.equal(h.world(),world);assert(!world.paused);h.window.dispatch('pagehide');
 });
 await check('hidden or unfocused pages explicitly suspend audio and cancel preparation',async()=>{const h=harness();h.click('start');h.window.dispatch('blur');assert(h.world().paused);assert(h.audioCalls.some(c=>c.method==='suspend'));h.window.dispatch('pagehide');});
 await check('death during legacy reload keeps menus silent despite the retained running context',async()=>{
  const h=harness();h.click('start');h.tap('KeyF');h.advance(.6);h.tap('KeyR');h.advance(.3);assert(h.world().reload>0);h.world().player.hp=0;h.tick();const stop=h.audioCalls.findLastIndex(c=>c.method==='stopAll');assert(!h.audioCalls.slice(stop+1).some(c=>['reload','shot','impact','event'].includes(c.method)));h.advance(2);assert(!h.audioCalls.slice(stop+1).some(c=>['reload','shot','impact','event'].includes(c.method)));h.window.dispatch('pagehide');
 });
 await check('stale rejected preload remains contained and allows retry',async()=>{
  const h=harness({}, {audioBank:{status:'idle'},audioPreload:()=>Promise.reject(Error('decode failed'))});h.click('start');await flush();assert.equal(h.storage.size,0);assert(!h.elements.get('start').disabled);assert.match(h.elements.get('audio-load').textContent,/실패/);h.window.dispatch('pagehide');
 });
 console.log(checks+' audio readiness integration checks passed.');
})().catch(e=>{console.error(e);process.exitCode=1;});
