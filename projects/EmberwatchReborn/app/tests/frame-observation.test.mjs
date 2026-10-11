import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createFrameObservation,classifyFrameContext,FRAME_OBSERVATION_MODES,FRAME_SUSPENSION_MS} from '../src/frame-observation.js';
import {createState,reduceRuntime} from '../src/state.js';
import {createBattle,stepBattle} from '../src/combat.js';
import {createVisualRenderer} from '../src/visual.js';
import {overlapFixture,record} from './overlap-fixture.mjs';

const active={hasBattle:true,paused:false,busy:false,hidden:false,focused:true};
function fixture(options={}){
 let clock=0,reads=0;
 const probe=createFrameObservation({enabled:true,now:()=>{reads++;return clock;},...options});
 return {probe,set:value=>{clock=value;},get reads(){return reads;}};
}
function frame(f,raf,context=active,{start=raf,step=2,render=4,ui=1,rest=1,failed=false}={}){
 let cursor=start;f.set(cursor);f.probe.beginFrame(raf,context);
 for(const [name,cost] of Object.entries({step,render,ui})){
  if(cost===null)continue;
  f.probe.beginPhase(name);cursor+=cost;f.set(cursor);f.probe.endPhase(name);
 }
 f.set(cursor+rest);f.probe.endFrame({failed});return f.probe.snapshot().samples.at(-1);
}

test('frame observation is OFF by default, reads no clock or context, and keeps no samples',()=>{
 let reads=0;const p=createFrameObservation({now:()=>{reads++;throw new Error('must not read');}});
 const context=new Proxy({}, {get(){throw new Error('must not read context');}});
 for(let n=0;n<1000;n++){assert.equal(p.beginFrame(n,context),false);assert.equal(p.beginPhase('step'),false);assert.equal(p.endPhase('step'),false);assert.equal(p.endFrame(),false);}
 assert.equal(reads,0);assert.equal(p.snapshot().sampleCount,0);assert.equal(p.snapshot().totalFrames,0);assert.equal(p.snapshot().lastActive.sampleCount,0);assert.equal(p.snapshot().lastActive.segment,0);
});

test('rAF scheduling interval, total JS, step, render and UI remain distinct clocks',()=>{
 const f=fixture();frame(f,100,active,{start:400});frame(f,120,active,{start:700,step:3,render:7,ui:2,rest:4});
 const s=f.probe.snapshot(),row=s.samples[1];
 assert.equal(row.rafIntervalMs,20);assert.equal(row.totalMs,16);assert.deepEqual(row.phaseMs,{step:3,render:7,ui:2,scene:null,audio:null,events:null,safety:null,input:null});
 assert.equal(s.active.rafInterval.n,1);assert.equal(s.active.total.n,2);assert.equal(s.active.rafInterval.p50Ms,20);
 assert.match(s.measurement,/not GPU, display, audio, or physical input latency/);
});

test('all play contexts are exclusive and wait states cannot dilute active statistics',()=>{
 const cases=[['combat',{combat:true}],['combat-moving',{combat:true,moving:true}],['moving',{moving:true}],['idle',{}],['menu',{paused:true}],['entry-wait',{awaitingAdvance:true}],['save-wait',{busy:true}],['inactive',{hidden:true}],['unavailable',{hasBattle:false}]];
 const f=fixture();let raf=0;
 for(const [mode,overrides] of cases){const context={...active,...overrides};assert.equal(classifyFrameContext(context),mode);frame(f,raf+=40,context);frame(f,raf+=40,context);}
 const s=f.probe.snapshot();assert.equal(s.active.frames,8);assert.equal(s.active.total.n,8);assert.equal(s.active.rafInterval.n,4);
 for(const mode of FRAME_OBSERVATION_MODES){assert.equal(s.byMode[mode].frames,2);assert.equal(s.byMode[mode].rafInterval.n,1);}
});

test('classification precedence and conservative missing battle state are explicit',()=>{
 assert.equal(classifyFrameContext(), 'unavailable');
 assert.equal(classifyFrameContext(null), 'unavailable');
 assert.equal(classifyFrameContext({...active,paused:true,busy:true,combat:true,moving:true,awaitingAdvance:true}),'save-wait');
 assert.equal(classifyFrameContext({...active,paused:true,awaitingAdvance:true}),'menu');
 assert.equal(classifyFrameContext({...active,awaitingAdvance:true,combat:true}),'entry-wait');
 assert.equal(classifyFrameContext({...active,focused:false,busy:true}),'inactive');
 assert.equal(classifyFrameContext({...active,hasBattle:undefined,combat:true}),'unavailable');
});

test('mode transitions retain evidence but do not attribute a menu gap to combat',()=>{
 const f=fixture();frame(f,0,{...active,paused:true});frame(f,100,{...active,combat:true});frame(f,116,{...active,combat:true});
 const s=f.probe.snapshot();assert.equal(s.samples[1].rafStatus,'transition');assert.equal(s.samples[1].rafIntervalMs,100);assert.equal(s.samples[1].previousMode,'menu');
 assert.equal(s.byMode.combat.rafInterval.n,1);assert.equal(s.byMode.combat.rafInterval.maxMs,16);assert.equal(s.transitions.frames,1);
});

test('500ms and longer suspension gaps are separate, with no cap or normal-frame contamination',()=>{
 const f=fixture();frame(f,0,{...active,combat:true});frame(f,499,{...active,combat:true});frame(f,999,{...active,combat:true},{step:200,render:200});frame(f,5999,{...active,paused:true});
 const s=f.probe.snapshot();assert.equal(FRAME_SUSPENSION_MS,500);assert.equal(s.samples[1].rafStatus,'ok');assert.equal(s.samples[2].rafStatus,'suspension');
 assert.equal(s.active.rafInterval.n,1);assert.equal(s.active.rafInterval.maxMs,499);assert.equal(s.active.total.n,2);assert.equal(s.active.total.maxMs,8);
 assert.equal(s.suspensions.frames,2);assert.equal(s.suspensions.rafInterval.maxMs,5000);assert.equal(s.byMode.menu.total.n,0);
});

test('nearest-rank p50/p95/max and strict 16.7/33.3 exceedance ratios use valid denominators',()=>{
 const f=fixture();let raf=0;frame(f,raf);const values=[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16.7,20,30,33.3,40];
 for(const delta of values){raf+=delta;frame(f,raf);}
 const m=f.probe.snapshot().active.rafInterval;
 assert.equal(m.n,20);assert.equal(m.p50Ms,10);assert.ok(Math.abs(m.p95Ms-33.3)<1e-9);assert.equal(m.maxMs,40);
 // Exact-threshold behavior is checked separately without accumulated decimals.
 const q=fixture();for(const [i,cost] of [16.7,33.3,34].entries())frame(q,100*i,active,{start:0,step:cost,render:null,ui:null,rest:0});
 const n=q.probe.snapshot().active.step;assert.equal(n.over16_7Count,2);assert.equal(n.over16_7Ratio,2/3);assert.equal(n.over33_3Count,1);assert.equal(n.over33_3Ratio,1/3);
});

test('empty metrics and unobserved phases are null rather than zero or invented success',()=>{
 const f=fixture();let s=f.probe.snapshot();assert.equal(s.active.total.n,0);assert.equal(s.active.total.p95Ms,null);assert.equal(s.active.total.over16_7Ratio,null);
 frame(f,0,active,{step:null,render:null,ui:null,rest:4});s=f.probe.snapshot();assert.equal(s.active.total.n,1);assert.equal(s.active.step.n,0);assert.equal(s.active.render.maxMs,null);assert.equal(s.samples[0].phaseMs.ui,null);
});

test('bounded recent samples evict old outliers and snapshots are detached at every mutable level',()=>{
 const f=fixture({limit:3});for(let n=0;n<10;n++)frame(f,n*16,active,{step:n?2:80});
 const s=f.probe.snapshot();assert.equal(s.sampleCount,3);assert.equal(s.totalFrames,10);assert.equal(s.evictedFrames,7);assert.deepEqual(s.samples.map(row=>row.sequence),[8,9,10]);assert.equal(s.active.step.maxMs,2);
 s.samples[0].mode='menu';s.samples[0].phaseMs.step=999;s.samples[0].phaseStatus.step='forged';s.active.step.maxMs=999;s.byMode.idle.total.n=999;s.thresholdsMs[0]=0;
 const next=f.probe.snapshot();assert.equal(next.samples[0].mode,'idle');assert.equal(next.samples[0].phaseMs.step,2);assert.equal(next.samples[0].phaseStatus.step,'ok');assert.equal(next.active.step.maxMs,2);assert.equal(next.byMode.idle.total.n,3);assert.equal(next.thresholdsMs[0],16.7);
});

test('invalid sample limits stay bounded without coercing strings or allocating infinity',()=>{
 for(const [limit,expected] of [[0,1],[-5,1],[2.8,2],[800,600],[Infinity,240],[NaN,240],['5',240]])assert.equal(fixture({limit}).probe.snapshot().capacity,expected);
});

test('missing, nonfinite, negative and nonnumeric rAF clocks never become valid intervals',()=>{
 for(const [value,status] of [[undefined,'missing'],[null,'missing'],[NaN,'nonfinite'],[Infinity,'nonfinite'],[-Infinity,'nonfinite'],[-1,'negative'],['16','nonfinite']]){
  const f=fixture();frame(f,0);frame(f,value,active,{start:10});frame(f,32);frame(f,48);
  const s=f.probe.snapshot();assert.equal(s.samples[1].rafStatus,status);assert.equal(s.samples[1].rafIntervalMs,null);assert.equal(s.samples[2].rafStatus,'warmup');assert.equal(s.active.rafInterval.n,1);assert.equal(s.active.rafInterval.p50Ms,16);
 }
});

test('frozen or backwards rAF clocks break continuity without fabricating fast frames',()=>{
 for(const [second,status] of [[100,'frozen'],[80,'backwards']]){
  const f=fixture();frame(f,100);frame(f,second);frame(f,120);frame(f,136);
  const s=f.probe.snapshot();assert.equal(s.samples[1].rafStatus,status);assert.equal(s.samples[2].rafStatus,'warmup');assert.equal(s.active.rafInterval.n,1);assert.equal(s.active.rafInterval.maxMs,16);
 }
});

test('missing, throwing and nonfinite JS clocks preserve rAF samples but never claim 0ms work',()=>{
 for(const now of [null,()=>undefined,()=>null,()=>NaN,()=>Infinity,()=>-1,()=>'2',()=>{throw new Error('clock unavailable');}]){
  const p=createFrameObservation({enabled:true,now});for(const raf of [0,16]){p.beginFrame(raf,active);p.beginPhase('render');p.endPhase('render');p.endFrame();}
  const s=p.snapshot();assert.equal(s.active.rafInterval.n,1);assert.equal(s.active.total.n,0);assert.equal(s.active.render.n,0);assert.ok(s.samples.every(row=>row.totalMs===null&&row.workStatus!=='ok'));
 }
});

test('entire frozen JS clock is unresolved, while a zero phase can be below clock resolution',()=>{
 const p=createFrameObservation({enabled:true,now:()=>42});p.beginFrame(10,active);p.beginPhase('step');p.endPhase('step');p.endFrame();
 assert.equal(p.snapshot().samples[0].workStatus,'frozen-or-below-resolution');assert.equal(p.snapshot().active.total.n,0);
 const f=fixture();frame(f,0,active,{step:0,render:2,ui:null,rest:1});assert.equal(f.probe.snapshot().active.step.p50Ms,0);assert.equal(f.probe.snapshot().active.total.maxMs,3);
});

test('a backwards or broken intermediate JS clock invalidates all same-frame work metrics',()=>{
 for(const bad of [9,NaN,undefined]){
  const f=fixture();f.set(10);f.probe.beginFrame(0,active);f.probe.beginPhase('step');f.set(bad);f.probe.endPhase('step');f.set(20);f.probe.beginPhase('render');f.set(21);f.probe.endPhase('render');f.set(22);f.probe.endFrame();
  const s=f.probe.snapshot();assert.equal(s.active.total.n,0);assert.equal(s.active.render.n,0);assert.equal(s.samples[0].phaseMs.render,null);
 }
});

test('duplicate, overlapping, mismatched and incomplete brackets do not double-count phases',()=>{
 const f=fixture();f.probe.beginFrame(0,active);f.probe.beginPhase('step');f.set(2);f.probe.beginPhase('render');assert.equal(f.probe.endPhase('render'),false);f.set(4);f.probe.endFrame();
 let row=f.probe.snapshot().samples[0];assert.equal(row.phaseMs.step,null);assert.equal(row.phaseMs.render,null);assert.equal(row.totalMs,4);
 f.probe.beginFrame(16,active);f.probe.beginPhase('ui');f.set(6);assert.equal(f.probe.endPhase('step'),false);f.set(7);f.probe.endFrame();row=f.probe.snapshot().samples[1];assert.equal(row.phaseStatus.ui,'invalid-bracket');
 f.probe.beginFrame(32,active);f.probe.beginPhase('render');f.set(8);f.probe.endFrame();assert.equal(f.probe.snapshot().samples[2].phaseStatus.render,'incomplete');
 assert.equal(f.probe.endFrame(),false);assert.equal(f.probe.endPhase('render'),false);
});

test('multiple disjoint segments of one phase are summed once per frame',()=>{
 const f=fixture();f.probe.beginFrame(0,active);f.probe.beginPhase('ui');f.set(1);f.probe.endPhase('ui');f.set(2);f.probe.beginPhase('step');f.set(4);f.probe.endPhase('step');f.set(5);f.probe.beginPhase('ui');f.set(8);f.probe.endPhase('ui');f.set(9);f.probe.endFrame();
 const s=f.probe.snapshot();assert.equal(s.samples[0].phaseMs.ui,4);assert.equal(s.active.ui.n,1);assert.equal(s.active.total.maxMs,9);
});

test('unknown phase names and out-of-frame phase calls are cheap harmless no-ops',()=>{
 const f=fixture();assert.equal(f.probe.beginPhase('step'),false);assert.equal(f.probe.endPhase('step'),false);assert.equal(f.reads,0);
 f.probe.beginFrame(0,active);const before=f.reads;for(const name of ['gpu','__proto__',null,undefined]){assert.equal(f.probe.beginPhase(name),false);assert.equal(f.probe.endPhase(name),false);}assert.equal(f.reads,before);
 f.set(1);f.probe.endFrame();assert.equal(f.probe.snapshot().active.total.n,1);
});

test('failed frames retain failure evidence without advertising successful work statistics',()=>{
 const f=fixture();frame(f,0);frame(f,16,active,{step:30,failed:true});
 const s=f.probe.snapshot();assert.equal(s.samples[1].workStatus,'failed');assert.equal(s.samples[1].totalMs,null);assert.equal(s.active.total.n,1);assert.equal(s.active.step.maxMs,2);assert.equal(s.active.rafInterval.n,1);
});

test('abandoned frames cannot leak phases into the next frame or become success samples',()=>{
 const f=fixture();f.probe.beginFrame(0,active);f.probe.beginPhase('render');frame(f,16);
 const s=f.probe.snapshot();assert.equal(s.abandonedFrames,1);assert.equal(s.sampleCount,1);assert.equal(s.samples[0].phaseMs.render,4);
});

test('profile, reload and title clears erase history, pending brackets and rAF continuity',()=>{
 const f=fixture();for(const reason of ['profile-change','reload','title']){
  frame(f,0);f.probe.beginFrame(16,active);f.probe.beginPhase('render');f.probe.clear(reason);
  const empty=f.probe.snapshot();assert.equal(empty.sampleCount,0);assert.equal(empty.totalFrames,0);assert.equal(empty.abandonedFrames,0);assert.equal(empty.lastClearReason,reason);assert.equal(f.probe.endFrame(),false);
  frame(f,5000);const s=f.probe.snapshot();assert.equal(s.samples[0].sequence,1);assert.equal(s.samples[0].rafStatus,'warmup');assert.equal(s.suspensions.frames,0);f.probe.clear(reason);
 }
});

test('OFF and ON reset scope so disabled time and old profile data are not sampled',()=>{
 const f=fixture();frame(f,0);assert.equal(f.probe.setEnabled(false),false);assert.equal(f.probe.snapshot().sampleCount,0);const reads=f.reads;
 frame(f,1000);assert.equal(f.reads,reads);assert.equal(f.probe.setEnabled(true),true);frame(f,2000);
 const s=f.probe.snapshot();assert.equal(s.sampleCount,1);assert.equal(s.samples[0].rafStatus,'warmup');assert.equal(s.lastClearReason,'enabled');
 f.probe.setEnabled(true);assert.equal(f.probe.snapshot().sampleCount,1);
});

test('observer imports no game code and has no storage, network, timer or scheduling access',()=>{
 const source=readFileSync(new URL('../src/frame-observation.js',import.meta.url),'utf8');
 assert.doesNotMatch(source,/\bimport\s|\b(?:fetch|XMLHttpRequest|WebSocket|sendBeacon|localStorage|sessionStorage|indexedDB|setTimeout|setInterval|requestAnimationFrame)\s*[.(]/);
});

test('production stepBattle has identical gameplay and event results with observation ON or OFF',()=>{
 const initial=createState(),trained=reduceRuntime(initial,{type:'trainStarter',position:{x:260,y:325}});assert.equal(trained.ok,true);
 const state=trained.state,a=createBattle(state),b=structuredClone(a),f=fixture();
 for(let n=0;n<60;n++){
  const input={move:{x:1,y:0},aim:{x:a.p.x+200,y:a.p.y},attack:n===0};
  const expected=stepBattle(a,state.character,.016,input);f.set(n*16);f.probe.beginFrame(n*16,{...active,moving:true});f.probe.beginPhase('step');const actual=stepBattle(b,state.character,.016,input);f.set(n*16+1);f.probe.endPhase('step');f.set(n*16+2);f.probe.endFrame();
  assert.deepEqual(actual,expected);assert.deepEqual(b,a);
 }
 assert.equal(f.probe.snapshot().active.step.n,60);
});

test('production renderer calls and fixture state are unchanged by timing brackets',()=>{
 const scene=overlapFixture(),before=JSON.stringify(scene),visibility=scene.sceneVisibility,expected=record(createVisualRenderer,scene),f=fixture();
 f.probe.beginFrame(0,{...active,combat:true});f.probe.beginPhase('render');const actual=record(createVisualRenderer,scene);f.set(4);f.probe.endPhase('render');f.set(5);f.probe.endFrame();
 // Recording canvases contain distinct getContext closures. Compare the full
 // serializable draw-command payload, not independently created function IDs.
 assert.equal(JSON.stringify(actual.calls),JSON.stringify(expected.calls));assert.equal(JSON.stringify(scene),before);assert.equal(scene.sceneVisibility,visibility);assert.equal(f.probe.snapshot().byMode.combat.render.maxMs,4);
 // This is a recording-context/synthetic-clock check, not actual browser cost.
});

test('long menus evict ordinary recent combat but preserve the last active segment for normal UI review',()=>{
 const f=fixture({limit:3});frame(f,0,{...active,combat:true});frame(f,16,{...active,combat:true});frame(f,32,{...active,moving:true});
 const live=f.probe.snapshot().lastActive;assert.equal(live.status,'recording');assert.equal(live.sampleCount,3);
 for(let i=3;i<303;i++)frame(f,i*16,{...active,paused:true},{step:null});
 const s=f.probe.snapshot();assert.equal(s.sampleCount,3);assert.equal(s.active.frames,0);assert.equal(s.byMode.combat.frames,0);assert.equal(s.byMode.menu.frames,3);
 assert.equal(s.lastActive.status,'retained');assert.equal(s.lastActive.endedBy,'menu');assert.equal(s.lastActive.sampleCount,3);assert.equal(s.lastActive.active.frames,3);assert.equal(s.lastActive.byMode.combat.frames,2);assert.equal(s.lastActive.byMode.moving.frames,1);assert.equal(s.lastActive.active.total.maxMs,8);assert.deepEqual(s.lastActive.samples,live.samples);
});

test('each non-active mode freezes the active tail and later waiting-mode switches leave it intact',()=>{
 const waits=[['menu',{paused:true}],['save-wait',{busy:true}],['entry-wait',{awaitingAdvance:true}],['inactive',{hidden:true}],['unavailable',{hasBattle:false}]];
 for(const [mode,flags] of waits){
  const f=fixture({limit:2});frame(f,0,{...active,combat:true});frame(f,16,{...active,moving:true});
  f.set(32);f.probe.beginFrame(32,{...active,...flags});
  // The tail is available immediately on entry, before the menu frame returns.
  const retained=f.probe.snapshot().lastActive;assert.equal(retained.status,'retained');assert.equal(retained.endedBy,mode);assert.equal(retained.sampleCount,2);f.set(33);f.probe.endFrame();
  for(const [i,[,next]] of waits.entries())frame(f,48+i*16,{...active,...next});
  assert.deepEqual(f.probe.snapshot().lastActive,retained);
 }
});

test('resuming active play replaces the old segment and a later pause retains only the new run',()=>{
 const f=fixture();frame(f,0,{...active,combat:true},{step:40});frame(f,16,{...active,paused:true});
 f.set(32);f.probe.beginFrame(32,{...active,moving:true});let last=f.probe.snapshot().lastActive;
 assert.equal(last.status,'recording');assert.equal(last.segment,2);assert.equal(last.sampleCount,0);assert.equal(last.active.total.p95Ms,null);assert.equal(last.endedBy,null);
 f.probe.beginPhase('step');f.set(33);f.probe.endPhase('step');f.set(34);f.probe.endFrame();frame(f,48,{...active,combat:true},{step:3});frame(f,64,{...active,paused:true});
 last=f.probe.snapshot().lastActive;assert.equal(last.status,'retained');assert.equal(last.segment,2);assert.equal(last.sampleCount,2);assert.equal(last.firstSequence,3);assert.equal(last.lastSequence,4);assert.equal(last.active.step.maxMs,3);assert.equal(last.byMode.moving.frames,1);assert.equal(last.byMode.combat.frames,1);
});

test('active submodes share one bounded tail capped at 240 independently of a larger ordinary ring',()=>{
 const f=fixture({limit:600});for(let i=0;i<260;i++)frame(f,i*16,{...active,combat:i%2===0,moving:i%3===0});
 frame(f,4160,{...active,paused:true});const s=f.probe.snapshot();assert.equal(s.sampleCount,261);assert.equal(s.lastActive.capacity,240);assert.equal(s.lastActive.sampleCount,240);assert.equal(s.lastActive.segment,1);assert.equal(s.lastActive.totalFrames,260);assert.equal(s.lastActive.evictedFrames,20);assert.equal(s.lastActive.firstSequence,21);assert.equal(s.lastActive.lastSequence,260);assert.ok(s.lastActive.samples.every(row=>!['menu','save-wait','entry-wait','inactive','unavailable'].includes(row.mode)));
});

test('clear, profile reset, reload and disable erase retained active samples and segment identity',()=>{
 const f=fixture();for(const reason of ['manual','profile-change','reload','title','save-replacement']){
  frame(f,0,{...active,combat:true});frame(f,16,{...active,paused:true});f.probe.clear(reason);const last=f.probe.snapshot().lastActive;
  assert.equal(last.status,'empty');assert.equal(last.segment,0);assert.equal(last.sampleCount,0);assert.equal(last.totalFrames,0);assert.equal(last.firstSequence,null);assert.equal(last.lastSequence,null);assert.equal(last.endedBy,null);assert.equal(last.active.total.p50Ms,null);assert.equal(last.active.total.over16_7Ratio,null);
 }
 frame(f,0,active);frame(f,16,{...active,paused:true});f.probe.setEnabled(false);assert.equal(f.probe.snapshot().lastActive.sampleCount,0);const reads=f.reads;
 for(let i=0;i<50;i++)frame(f,i*16,active);assert.equal(f.reads,reads);assert.equal(f.probe.snapshot().lastActive.segment,0);
 f.probe.setEnabled(true);assert.equal(f.probe.snapshot().lastActive.status,'empty');
});

test('retained and ordinary snapshots have independent deep copies of shared internal observations',()=>{
 const f=fixture();frame(f,0,{...active,combat:true});frame(f,16,{...active,paused:true});const s=f.probe.snapshot();
 s.samples[0].phaseMs.step=90;assert.equal(s.lastActive.samples[0].phaseMs.step,2);s.lastActive.samples[0].phaseMs.step=99;s.lastActive.samples[0].phaseStatus.step='forged';s.lastActive.samples[0].mode='menu';s.lastActive.active.total.maxMs=999;s.lastActive.byMode.combat.frames=999;s.lastActive.samples.push({});
 const next=f.probe.snapshot();assert.equal(next.samples[0].phaseMs.step,2);assert.equal(next.lastActive.samples[0].phaseMs.step,2);assert.equal(next.lastActive.samples[0].phaseStatus.step,'ok');assert.equal(next.lastActive.samples[0].mode,'combat');assert.equal(next.lastActive.active.total.maxMs,8);assert.equal(next.lastActive.byMode.combat.frames,1);assert.equal(next.lastActive.sampleCount,1);
});

test('retention preserves missing-clock and suspension evidence without manufacturing a zero-cost pass',()=>{
 const empty=fixture();frame(empty,0,{...active,paused:true});assert.equal(empty.probe.snapshot().lastActive.status,'empty');assert.equal(empty.probe.snapshot().lastActive.active.total.n,0);assert.equal(empty.probe.snapshot().lastActive.active.total.p95Ms,null);
 const frozen=fixture({now:()=>0});frame(frozen,0,{...active,combat:true});frame(frozen,16,{...active,paused:true});let last=frozen.probe.snapshot().lastActive;assert.equal(last.sampleCount,1);assert.equal(last.active.total.n,0);assert.equal(last.active.total.maxMs,null);assert.equal(last.active.total.over33_3Ratio,null);
 const f=fixture({limit:2});frame(f,0,{...active,paused:true});frame(f,500,{...active,combat:true});for(let i=0;i<5;i++)frame(f,516+i*16,{...active,paused:true});last=f.probe.snapshot().lastActive;
 assert.equal(last.sampleCount,1);assert.equal(last.suspensions.frames,1);assert.equal(last.suspensions.rafInterval.maxMs,500);assert.equal(last.active.rafInterval.n,0);assert.equal(last.active.total.n,0);assert.equal(last.active.total.p95Ms,null);
});
