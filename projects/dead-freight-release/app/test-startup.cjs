/* Deterministic startup error handling. DOM, WebGL and audio are mocks;
 * this is not browser rendering or normal-input gameplay verification. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {harness}=require('./test-runtime-harness.cjs');
let checks=0;const failures=[];
function check(name,fn){try{fn();checks++;console.log('PASS',name);}catch(error){failures.push(name);console.error('FAIL',name,error.stack);}}
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
const tag=id=>html.match(new RegExp('<[^>]+\\bid="'+id+'"[^>]*>'))?.[0];
function assertStopped(h){
 assert.equal(h.worlds.length,0,'no mission may be constructed');
 assert.equal(h.audioCalls.length,0,'no audio engine may be constructed or used');
 assert.equal(h.frames.length,0,'no animation frame may be scheduled');
 assert.equal(h.renders.length,0,'no scene may be rendered');
 assert.equal(h.window.listenerCount(),0,'no window gameplay/lifecycle listeners');
 assert.equal(h.document.listenerCount(),0,'no document gameplay listeners');
 assert.equal(h.canvas.listenerCount(),0,'no canvas gameplay listeners');
 assert.equal(h.document.pointerLockElement,null,'no pointer lock');
}

check('static HTML disables Start and hides gameplay layers while startup is pending',()=>{
 assert.match(tag('start'),/\sdisabled(?:\s|>)/);
 for(const id of ['game','hud','damage','retry'])assert.match(tag(id),/\shidden(?:\s|>)/,id);
 assert.match(tag('overlay'),/data-startup="pending"/);
 assert.match(tag('startup-status'),/role="status"/);
 assert.match(tag('startup-status'),/aria-live="polite"/);
 assert.match(tag('retry'),/aria-describedby="startup-status description"/);
});

let failed;
check('renderer construction failure is caught without rethrowing',()=>{
 assert.doesNotThrow(()=>{failed=harness({}, {rendererFailure:'construct'});});
 assert.deepEqual(failed.rendererCalls,['construct']);
 assert.equal(failed.errors.length,1);
 assert.match(failed.errors[0][0],/renderer initialization failed/);
 assert.match(failed.errors[0][1].message,/Renderer construction failed/);
});
check('failed renderer shows an explicit non-playable state and useful recovery guidance',()=>{
 assert.equal(failed.elements.get('overlay').dataset.startup,'unavailable');
 assert.equal(failed.elements.get('overlay').hidden,false);
 const status=failed.elements.get('startup-status'),description=failed.elements.get('description');
 assert.equal(status.hidden,false);assert.match(status.textContent,/플레이 불가/);
 assert.match(description.textContent,/WebGL/);assert.match(description.textContent,/새로고침/);
 assert.match(description.textContent,/다른 데스크톱 브라우저/);assert.match(description.textContent,/설정을 확인/);
 assert(!description.textContent.includes('test fixture'),'raw exception is not user-facing copy');
});
check('failed renderer hides stale gameplay HUD, canvas, options and invalid actions',()=>{
 for(const id of ['game','hud','damage','controls','options','start','restart','fullscreen'])assert.equal(failed.elements.get(id).hidden,true,id);
 for(const id of ['start','restart'])assert.equal(failed.elements.get(id).disabled,true,id);
 assert.equal(failed.elements.get('retry').hidden,false);assert.equal(failed.elements.get('retry').disabled,false);
});
check('failure preserves a visible native credits link with the original destination',()=>{
 for(const id of ['overlay','notice','audio-credits'])assert.equal(failed.elements.get(id).hidden,false,id);
 assert.match(tag('audio-credits'),/href="audio\/rifle\/CREDITS.md"/);
 assert.match(tag('audio-credits'),/target="_blank"/);assert.match(tag('audio-credits'),/rel="noopener"/);
 assert.equal(failed.elements.get('notice').textContent,'','startup failure must not replace the credits container');
});
check('renderer failure creates no mission, audio, input handlers or animation loop',()=>assertStopped(failed));
check('gameplay keys, clicks and page lifecycle events cannot start a failed game',()=>{
 for(const code of ['Space','ArrowDown','KeyW','KeyF','KeyR','Escape']){
  assert(!failed.window.dispatch('keydown',{code,repeat:false}).defaultPrevented,'error menu must not capture '+code);
  failed.key(code,'keyup');
 }
 for(const id of ['start','restart','fullscreen']){assert.equal(failed.elements.get(id).onclick,undefined);failed.click(id);}
 for(const id of ['loadout','laser','suppressor','sound'])failed.elements.get(id).dispatch('change');
 failed.mouse(0);failed.mouse(0,'mouseup');failed.mouse(2);failed.mouse(2,'mouseup');
 for(const type of ['blur','resize','pagehide','pageshow'])failed.window.dispatch(type,{persisted:true});
 for(const type of ['visibilitychange','pointerlockchange','mousemove'])failed.document.dispatch(type);
 assertStopped(failed);assert.equal(failed.reloads.length,0);
});
check('retry invokes actual page reload without starting gameplay in the failed session',()=>{
 failed.click('retry');assert.equal(failed.reloads.length,1);assertStopped(failed);
 failed.click('retry');assert.equal(failed.reloads.length,2);assertStopped(failed);
});
check('failure and retries leave the saved extraction bank unchanged',()=>{
 const saved='{"cash":425,"level":2}',h=harness({'deadfreight-best':saved},{rendererFailure:'construct'});
 h.click('retry');assert.deepEqual([...h.storage],[['deadfreight-best',saved]]);assertStopped(h);
});
check('renderer configuration failure disposes its partial renderer and offers the same recovery',()=>{
 const h=harness({}, {rendererFailure:'configure'});
 assert.deepEqual(h.rendererCalls,['construct','dispose']);assert.equal(h.errors.length,1);
 assert.equal(h.elements.get('overlay').dataset.startup,'unavailable');
 h.click('retry');assert.equal(h.reloads.length,1);assertStopped(h);
});
check('even failed partial-renderer cleanup cannot suppress the retry UI',()=>{
 const h=harness({}, {rendererFailure:'configure',disposeFailure:true});
 assert.deepEqual(h.rendererCalls,['construct','dispose']);assert.equal(h.elements.get('retry').hidden,false);
 h.click('retry');assert.equal(h.reloads.length,1);assertStopped(h);
});
check('successful initialization enables the existing menu and creates exactly one RAF chain',()=>{
 const h=harness({}, {weapon:3});
 assert.equal(h.elements.get('overlay').dataset.startup,'ready');
 assert.equal(h.elements.get('startup-status').hidden,true);assert.equal(h.elements.get('retry').hidden,true);
 assert.equal(h.elements.get('start').disabled,false);assert.equal(h.elements.get('start').hidden,false);
 for(const id of ['game','hud','damage','controls','options','fullscreen','audio-credits'])assert.equal(h.elements.get(id).hidden,false,id);
 assert.deepEqual(h.rendererCalls,['construct']);assert.equal(h.errors.length,0);
 assert.equal(h.worlds.length,1);assert.equal(h.audioCalls.filter(c=>c.method==='create').length,1);assert.equal(h.frames.length,1);
 h.tick();h.click('start');h.advance(.5);assert.equal(h.elements.get('overlay').style.display,'none');
 assert.equal(h.world().weapon,3);h.tap('KeyF');h.tick();assert.equal(h.world().shots,1);
 h.tap('Escape');h.click('start');h.tick();assert.equal(h.frames.length,1);assert.equal(h.errors.length,0);
 h.window.dispatch('pagehide');
});
check('loadout markup retains four distinct choices after the startup UI edit',()=>{
 const select=html.match(/<select id="loadout">([\s\S]*?)<\/select>/)[1];
 assert.deepEqual([...select.matchAll(/<option value="(\d)"[^>]*>[^<]*<\/option>/g)].map(m=>m[1]),['3','0','1','2']);
});

if(failures.length)process.exitCode=1;
console.log(`${checks} rendererless startup checks passed; ${failures.length} failed. No actual GPU/browser/play acceptance is claimed.`);
