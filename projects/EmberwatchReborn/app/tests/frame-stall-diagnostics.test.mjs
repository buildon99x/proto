import test from 'node:test';
import assert from 'node:assert/strict';
import {createFrameObservation} from '../src/frame-observation.js';
const active={hasBattle:true,paused:false,busy:false,hidden:false,focused:true,visibilityState:'visible',focusEpoch:0};
function fixture(options={}){let clock=0;const probe=createFrameObservation({enabled:true,now:()=>clock,...options});return {probe,set:n=>{clock=n;}};}
function frame(f,raf,{context=active,start=raf,costs={step:1,scene:2,render:3,audio:4,ui:5,events:6,safety:7},rest=8,runtimePreviousRafTimestampMs,failed=false,safetyStop=null}={}){
 let at=start;f.set(at);f.probe.beginFrame(raf,{...context,runtimePreviousRafTimestampMs,callbackStartedAtMs:start});
 if(safetyStop)f.probe.markSafetyStop(safetyStop);
 for(const [name,cost] of Object.entries(costs)){f.probe.beginPhase(name);f.set(at+=cost);f.probe.endPhase(name);}
 f.set(at+rest);f.probe.endFrame({failed});return f.probe.snapshot();
}
test('exact long-gap incident retains previous and current callback and rAF clocks with disjoint costs',()=>{
 const f=fixture();frame(f,100,{start:104});const s=frame(f,701,{start:720,runtimePreviousRafTimestampMs:100});
 const incident=s.stallDiagnostics.incidents[0];assert.equal(incident.previous.rafTimestampMs,100);assert.equal(incident.current.previousRafTimestampMs,100);assert.equal(incident.current.rafTimestampMs,701);assert.equal(incident.current.rafIntervalMs,601);
 assert.equal(incident.current.callbackStartedAtMs,720);assert.equal(incident.current.callbackEndedAtMs,756);assert.equal(incident.current.totalMs,36);assert.deepEqual(incident.previous.phaseMs,{step:1,render:3,ui:5,scene:2,audio:4,events:6,safety:7,input:null});assert.equal(incident.current.otherMs,8);assert.equal(incident.sincePreviousCallbackEndMs,580);assert.equal(incident.current.runtimeIntervalMs,601);assert.equal(incident.current.runtimeSuspended,true);
 assert.equal(s.active.total.n,1,'long-gap work remains excluded from normal statistics');assert.equal(s.stallDiagnostics.totalIncidents,1);
});
test('500ms observation boundary is separate from strict runtime >500ms safety condition',()=>{
 const f=fixture();frame(f,0);frame(f,500,{runtimePreviousRafTimestampMs:0});let s=f.probe.snapshot();assert.equal(s.stallDiagnostics.incidents.length,0);assert.equal(s.samples.at(-1).runtimeSuspended,false);assert.equal(s.samples.at(-1).safetyStop,null);
 s=frame(f,1001,{runtimePreviousRafTimestampMs:500,safetyStop:'frame-gap'});assert.equal(s.stallDiagnostics.incidents[0].current.runtimeSuspended,true);assert.equal(s.stallDiagnostics.incidents[0].current.safetyStop,'frame-gap');
});
test('runtime reset reference is distinct from previous observed rAF and is not called a safety stop',()=>{
 const f=fixture();frame(f,100);const s=frame(f,800,{runtimePreviousRafTimestampMs:790});const row=s.stallDiagnostics.incidents[0].current;assert.equal(row.previousRafTimestampMs,100);assert.equal(row.runtimePreviousRafTimestampMs,790);assert.equal(row.runtimeIntervalMs,10);assert.equal(row.runtimeSuspended,false);assert.equal(row.safetyStop,null);
});
test('first observed callback can retain an actual runtime gap with no invented previous observed sample',()=>{
 const f=fixture();const s=frame(f,900,{runtimePreviousRafTimestampMs:100,safetyStop:'frame-gap'}),i=s.stallDiagnostics.incidents[0];assert.equal(i.previous,null);assert.equal(i.current.rafStatus,'warmup');assert.equal(i.current.runtimeIntervalMs,800);assert.equal(i.current.previousRafTimestampMs,null);
});
test('incidents outlive full menu-ring eviction and a fresh active segment',()=>{
 const f=fixture({limit:2});frame(f,0);frame(f,501,{runtimePreviousRafTimestampMs:0});for(let n=1;n<=300;n++)frame(f,501+n*16,{context:{...active,paused:true}});frame(f,5400);const s=f.probe.snapshot();assert.equal(s.sampleCount,2);assert.equal(s.lastActive.segment,2);assert.equal(s.stallDiagnostics.incidents.length,1);assert.equal(s.stallDiagnostics.incidents[0].previous.rafTimestampMs,0);
});
test('incident ring has fixed 12-pair retention and tracks eviction without per-frame growth',()=>{
 const f=fixture({limit:1});for(let n=0;n<30;n++)frame(f,n*501);const d=f.probe.snapshot().stallDiagnostics;assert.equal(d.capacity,12);assert.equal(d.totalIncidents,29);assert.equal(d.evictedIncidents,17);assert.equal(d.incidents.length,12);assert.equal(d.incidents[0].current.sequence,19);assert.equal(d.incidents.at(-1).current.sequence,30);
});
test('before/current focus and visibility are immutable bounded context without profile or user data',()=>{
 const f=fixture();frame(f,0);const context={...active,focused:false,hidden:true,visibilityState:'hidden',focusEpoch:2,profile:'PRIVATE',location:'PRIVATE'};const s=frame(f,600,{context}),i=s.stallDiagnostics.incidents[0];assert.deepEqual(i.previous.context,{hidden:false,focused:true,visibilityState:'visible',focusEpoch:0});assert.deepEqual(i.current.context,{hidden:true,focused:false,visibilityState:'hidden',focusEpoch:2});assert.doesNotMatch(JSON.stringify(s),/PRIVATE/);context.visibilityState='forged';assert.equal(i.current.context.visibilityState,'hidden');
 i.previous.context.focused=false;i.current.phaseMs.audio=999;const d=f.probe.snapshot().stallDiagnostics;assert.equal(d.incidents[0].previous.context.focused,true);assert.equal(d.incidents[0].current.phaseMs.audio,4);
});
test('invalid visibility and focus values are unknown rather than coerced trusted values',()=>{
 const f=fixture();const s=frame(f,0,{context:{hasBattle:true,hidden:'false',focused:1,visibilityState:'private arbitrary text',focusEpoch:Infinity}});assert.deepEqual(s.samples[0].context,{hidden:null,focused:null,visibilityState:null,focusEpoch:null});
});
test('failed or incomplete callbacks retain diagnostic status without invented residual',()=>{
 const f=fixture();frame(f,0);let s=frame(f,601,{failed:true});assert.equal(s.stallDiagnostics.incidents[0].current.workStatus,'failed');assert.equal(s.stallDiagnostics.incidents[0].current.otherMs,null);
 f.set(1300);f.probe.beginFrame(1300,active);f.probe.beginPhase('scene');f.set(1304);f.probe.endFrame();s=f.probe.snapshot();assert.equal(s.stallDiagnostics.incidents.at(-1).current.phaseStatus.scene,'incomplete');assert.equal(s.stallDiagnostics.incidents.at(-1).current.otherMs,null);
});
test('abandoned callback never attaches an older completed callback as the immediate predecessor',()=>{
 const f=fixture();frame(f,0);f.set(16);f.probe.beginFrame(16,active);const s=frame(f,700);assert.equal(s.stallDiagnostics.incidents[0].previous,null);assert.equal(s.stallDiagnostics.incidents[0].current.previousRafTimestampMs,16);
});
test('clear/travel/profile/reload/disable remove retained incidents and no work is recorded while OFF',()=>{
 for(const reason of ['manual','travel','profile-load','reload']){const f=fixture();frame(f,0);frame(f,501);f.probe.clear(reason);const d=f.probe.snapshot().stallDiagnostics;assert.equal(d.incidents.length,0);assert.equal(d.totalIncidents,0);}
 const f=fixture();frame(f,0);frame(f,501);f.probe.setEnabled(false);assert.equal(f.probe.markSafetyStop('frame-gap'),false);frame(f,1002);assert.equal(f.probe.snapshot().stallDiagnostics.incidents.length,0);
});
test('diagnostic entry timestamp includes pre-begin preparation in total and residual time',()=>{
 const f=fixture();f.set(110);f.probe.beginFrame(100,{...active,callbackStartedAtMs:102});f.probe.beginPhase('render');f.set(113);f.probe.endPhase('render');f.set(116);f.probe.endFrame();const row=f.probe.snapshot().samples[0];assert.equal(row.callbackStartedAtMs,102);assert.equal(row.totalMs,14);assert.equal(row.phaseMs.render,3);assert.equal(row.otherMs,11);
});

test('rejected current entry clock or invalid previous callback cannot fabricate between-callback time',()=>{
 const f=fixture();frame(f,0,{costs:{render:2},rest:8});f.set(600);f.probe.beginFrame(600,{...active,callbackStartedAtMs:700});f.set(610);f.probe.endFrame();let i=f.probe.snapshot().stallDiagnostics.incidents[0];assert.equal(i.current.workStatus,'invalid-entry-clock');assert.equal(i.sincePreviousCallbackEndMs,null);
 const g=fixture();g.set(10);g.probe.beginFrame(0,active);g.probe.beginPhase('step');g.set(5);g.probe.endPhase('step');g.set(20);g.probe.endFrame();i=frame(g,601).stallDiagnostics.incidents[0];assert.equal(i.previous.workStatus,'backwards');assert.equal(i.sincePreviousCallbackEndMs,null);
});
