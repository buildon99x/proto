import test from 'node:test';import assert from 'node:assert/strict';import {createInputLatency} from '../src/input-latency.js';
test('observations separate receipt/start/render/audio/contact without advancing simulation',()=>{let now=0;const trace=createInputLatency({now:()=>now});trace.press('attack',{skillId:'mace_swing'});trace.started({id:'mace_swing',castId:1});trace.soundRequested({name:'slash'},true,{type:'actionStarted',id:'mace_swing',castId:1});now=16;trace.renderReturned(trace.renderEntered({castId:1}));now=182;trace.mark('contact',1);const a=trace.snapshot();assert.equal(a[1].delayMs,0);assert.deepEqual(a.map(e=>e.at),[0,0,0,16,16,182]);assert.equal(new Set(a.map(e=>e.sequence)).size,1);});
test('save wait is observed separately and delayed start keeps original receipt',()=>{let now=3;const trace=createInputLatency({now:()=>now});trace.press('hammer',{skillId:'righteous_hammer'});trace.waiting();now=93;trace.started({id:'righteous_hammer',castId:4});assert.equal(trace.snapshot().at(-1).delayMs,90);});
test('cancellation clears pending attribution and no late event becomes an old press',()=>{let now=0;const trace=createInputLatency({now:()=>now});trace.press('attack',{skillId:'mace_swing'});trace.clear('blur');now=300;trace.started({id:'mace_swing',castId:2});const a=trace.snapshot();assert.notEqual(a[0].sequence,a.at(-1).sequence);assert.equal(a.at(-1).heldRepeat,true);});
test('mobility start and first rendered pose have one identity and only one render mark',()=>{let now=0;const trace=createInputLatency({now:()=>now});trace.press('dodgeSprint');trace.mobilityStarted({type:'roll-start',reason:'dodgeSprint'});now=16;trace.renderReturned(trace.renderEntered(null,{state:'idle'}));trace.renderReturned(trace.renderEntered(null,{state:'roll'}));trace.renderReturned(trace.renderEntered(null,{state:'roll'}));const a=trace.snapshot();assert.equal(a.filter(e=>e.kind==='mobility-first-render-return').length,1);assert.equal(a.at(-1).sequence,a[0].sequence);});
test('observations are bounded detached snapshots without external storage',()=>{const trace=createInputLatency({limit:8,now:()=>0});for(let i=0;i<100;i++){trace.press('attack',{skillId:'mace_swing'});trace.started({id:'mace_swing',castId:i});}const a=trace.snapshot();assert.equal(a.length,8);a[0].action='modified';assert.notEqual(trace.snapshot()[0].action,'modified');});
test('rejected pulse and later held action retain separate identities with no invented receipt or input delay',()=>{
 let now=25;const trace=createInputLatency({now:()=>now}),press=trace.press('expert1');trace.clear('recovery-too-early');now=520;trace.started({id:'mace_swing',castId:2});now=528;trace.renderReturned(trace.renderEntered({castId:2}));now=702;trace.mark('contact',2);
 const rows=trace.snapshot(),start=rows.find(row=>row.kind==='action-start');assert.equal(start.timingBasis,'action-start');assert.equal(start.receivedAt,null);assert.equal(start.delayMs,null);assert.equal(start.heldRepeat,true);assert.equal(start.at,520);assert.notEqual(start.sequence,press.sequence);assert.deepEqual(rows.filter(row=>row.sequence===press.sequence).map(row=>row.kind),['input','cancelled']);assert.equal(rows.find(row=>row.kind==='cancelled').reason,'recovery-too-early');assert.deepEqual(rows.filter(row=>row.sequence===start.sequence).map(row=>row.kind),['action-start','first-render-enter','first-render-return','contact']);
});
test('unlinked mobility transition also has a start basis without claiming a physical input receipt',()=>{
 let now=100;const trace=createInputLatency({now:()=>now});trace.mobilityStarted({type:'sprint-start'});now=116;trace.renderReturned(trace.renderEntered(null,{state:'sprint'}));const [start,render]=trace.snapshot();assert.equal(start.timingBasis,'mobility-start');assert.equal(start.receivedAt,null);assert.equal(start.delayMs,null);assert.equal(start.heldTransition,true);assert.equal(render.sequence,start.sequence);assert.equal(render.at-start.at,16);
});
test('a fresh physical press after a held repeat retains its own measured input baseline',()=>{
 let now=500;const trace=createInputLatency({now:()=>now});trace.started({id:'mace_swing',castId:1});now=510;const press=trace.press('hammer',{skillId:'righteous_hammer'});now=514;trace.started({id:'righteous_hammer',castId:2});const start=trace.snapshot().at(-1);assert.equal(start.timingBasis,'input');assert.equal(start.sequence,press.sequence);assert.equal(start.receivedAt,510);assert.equal(start.delayMs,4);assert.equal(start.heldRepeat,undefined);
});

test('observation identity: a guard receipt cannot become the next held mace start',()=>{
 let now=10;const trace=createInputLatency({now:()=>now}),guard=trace.press('expert2',{skillId:'shield_block'});now=200;trace.started({id:'mace_swing',castId:1});const rows=trace.snapshot(),start=rows.at(-1);assert.notEqual(start.sequence,guard.sequence);assert.equal(start.heldRepeat,true);assert.equal(start.delayMs,null);assert.equal(start.receivedAt,null);assert.equal(rows.find(r=>r.kind==='cancelled').reason,'unmatched-action-start');
});
test('observation identity: remapped slot resolves at receipt and matches the actual skill',()=>{
 const trace=createInputLatency({now:()=>0}),press=trace.press('attack',{skillId:'righteous_hammer'});trace.started({id:'righteous_hammer',castId:1});assert.equal(trace.snapshot().at(-1).sequence,press.sequence);assert.equal(trace.snapshot()[0].skillId,'righteous_hammer');
});
test('observation identity: wrong skill cannot steal a pending receipt even in the same slot',()=>{
 const trace=createInputLatency({now:()=>0}),press=trace.press('attack',{skillId:'righteous_hammer'});trace.started({id:'mace_swing',castId:1});trace.started({id:'righteous_hammer',castId:2});const rows=trace.snapshot();assert.ok(rows.filter(r=>r.kind==='action-start').every(r=>r.sequence!==press.sequence&&r.heldRepeat&&r.delayMs===null));assert.equal(rows.filter(r=>r.kind==='cancelled').length,1);
});
test('observation identity: unresolved slots never infer the historical attack mapping',()=>{
 const trace=createInputLatency({now:()=>0}),press=trace.press('attack');trace.started({id:'mace_swing',castId:1});assert.notEqual(trace.snapshot().at(-1).sequence,press.sequence);assert.equal(trace.snapshot().at(-1).receivedAt,null);
});
test('observation identity: replacement cancels the previous receipt without deleting history',()=>{
 const trace=createInputLatency({now:()=>0}),first=trace.press('hammer',{skillId:'righteous_hammer'}),second=trace.press('attack',{skillId:'mace_swing'});trace.started({id:'mace_swing',castId:1});const rows=trace.snapshot();assert.deepEqual(rows.filter(r=>r.sequence===first.sequence).map(r=>r.kind),['input','cancelled']);assert.equal(rows.find(r=>r.kind==='cancelled').reason,'superseded-input');assert.equal(rows.at(-1).sequence,second.sequence);
});
test('observation identity: a skill receipt cannot become a mobility start',()=>{
 const trace=createInputLatency({now:()=>0}),press=trace.press('block',{skillId:'shield_block'});trace.mobilityStarted({type:'roll-start',reason:'dodgeOnly'});const start=trace.snapshot().at(-1);assert.notEqual(start.sequence,press.sequence);assert.equal(start.heldTransition,true);assert.equal(start.receivedAt,null);assert.equal(start.delayMs,null);
});
test('observation identity: a mobility receipt cannot become a skill start',()=>{
 const trace=createInputLatency({now:()=>0}),press=trace.press('dodgeSprint');trace.started({id:'mace_swing',castId:1});assert.notEqual(trace.snapshot().at(-1).sequence,press.sequence);assert.equal(trace.snapshot().at(-1).heldRepeat,true);
});
test('observation identity: roll requires the exact triggering mobility command',()=>{
 const trace=createInputLatency({now:()=>0}),press=trace.press('dodgeOnly');trace.mobilityStarted({type:'roll-start',reason:'dodgeSprint'});assert.notEqual(trace.snapshot().at(-1).sequence,press.sequence);assert.equal(trace.snapshot().at(-1).heldTransition,true);
});
test('observation identity: held sprint transitions cannot borrow a pending roll receipt',()=>{
 const trace=createInputLatency({now:()=>0}),press=trace.press('dodgeSprint');trace.mobilityStarted({type:'sprint-start',reason:'completed'});assert.notEqual(trace.snapshot().at(-1).sequence,press.sequence);assert.equal(trace.snapshot().at(-1).delayMs,null);
});
test('observation identity: matching direct sprint preserves the original receipt',()=>{
 let now=5;const trace=createInputLatency({now:()=>now}),press=trace.press('sprint');now=12;trace.mobilityStarted({type:'sprint-start',reason:'sprint'});const start=trace.snapshot().at(-1);assert.equal(start.sequence,press.sequence);assert.equal(start.delayMs,7);assert.equal(start.timingBasis,'input');
});
test('observation render: entry and return clocks are distinct and recorded once per cast',()=>{
 let now=0;const trace=createInputLatency({now:()=>now});trace.started({id:'mace_swing',castId:1});now=16;const entry=trace.renderEntered({castId:1});assert.equal(trace.snapshot().at(-1).kind,'first-render-enter');now=21;trace.renderReturned(entry);now=30;trace.renderReturned(trace.renderEntered({castId:1}));const rows=trace.snapshot();assert.deepEqual(rows.filter(r=>r.kind.startsWith('first-render')).map(r=>[r.kind,r.at]),[['first-render-enter',16],['first-render-return',21]]);
});
test('observation render: an interrupted render has an entry but no fabricated return',()=>{
 const trace=createInputLatency({now:()=>16});trace.started({id:'mace_swing',castId:1});trace.renderEntered({castId:1});assert.equal(trace.snapshot().filter(r=>r.kind==='first-render-enter').length,1);assert.equal(trace.snapshot().some(r=>r.kind==='first-render-return'),false);
});
test('observation render: return keeps captured mobility identity after a new transition',()=>{
 let now=0;const trace=createInputLatency({now:()=>now}),first=trace.mobilityStarted({type:'roll-start',reason:'dodgeOnly'}),entry=trace.renderEntered(null,{state:'roll'});trace.mobilityStarted({type:'sprint-start',reason:'completed'});now=5;trace.renderReturned(entry);assert.equal(trace.snapshot().at(-1).sequence,first.sequence);assert.equal(trace.snapshot().at(-1).state,'roll');
});
test('observation sound: accepted and rejected adjacent start requests retain their result and cast',()=>{
 const trace=createInputLatency({now:()=>0}),event={type:'actionStarted',id:'mace_swing',castId:1};trace.started(event);trace.soundRequested({name:'slash'},false,event);trace.soundRequested({name:'slash'},true,event);const rows=trace.snapshot().filter(r=>r.kind==='audio-request-result');assert.deepEqual(rows.map(r=>r.accepted),[false,true]);assert.ok(rows.every(r=>r.castId===1&&r.sequence===trace.snapshot()[0].sequence));assert.equal(rows[0].linkBasis,'adjacent-action-start');
});
test('observation sound: unrelated impact, enemy and stale start sounds remain unlinked',()=>{
 const trace=createInputLatency({now:()=>0}),event={type:'actionStarted',id:'mace_swing',castId:1};trace.started(event);for(const name of ['heavyHit','enemyTell','footstep','magicRelease'])trace.soundRequested({name},true,event);trace.soundRequested({name:'slash'},true,{type:'actionContact',id:'mace_swing',castId:1});trace.soundRequested({name:'slash'},true,{...event,castId:99});assert.ok(trace.snapshot().filter(r=>r.kind==='audio-request-result').every(r=>r.sequence===null&&r.castId===null));
});
test('observation sound: a roll request uses its own mobility sequence and leaves an unknown result unknown',()=>{
 const trace=createInputLatency({now:()=>0}),press=trace.press('dodgeOnly'),start=trace.mobilityStarted({type:'roll-start',reason:'dodgeOnly'});trace.mobilitySoundRequested(start,undefined);const row=trace.snapshot().at(-1);assert.equal(row.sequence,press.sequence);assert.equal(row.castId,null);assert.equal(row.accepted,null);assert.equal(row.linkBasis,'mobility-start');
});
