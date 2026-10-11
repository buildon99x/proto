import test from 'node:test';
import assert from 'node:assert/strict';
import {earnedPassRoute} from './support/earned-pass-route.mjs';
import {report,run,travel,settle} from './support/earned-route.mjs';
import {SIGNAL_GROUPS} from '../src/signal-content.js';
import {getRegion} from '../src/world.js';
import {signalGuidance,signalObjectView} from '../src/signal-presentation.js';
import {campaignGuidance} from '../src/campaign-guidance.js';
const accepted=()=>{const s=earnedPassRoute();return run(s,{type:'acceptSignalQuest',...report(s,{x:250,y:470})}).state;};
// Real reward/travel handlers; positions and defeat reports are scripted fixtures,
// not normal-input play. Never set progression/objective flags directly.
test('town acceptance guides the actual next portal rather than enemies in another region',()=>{
 const s=accepted(),before=structuredClone(s);assert.equal(campaignGuidance(s).id,'signal-travel');assert.match(signalGuidance(s).detail,/마을 서쪽.*입구/);assert.deepEqual(s,before);
 const entered=travel(s,'town-signal-entry');assert.equal(campaignGuidance(entered).id,'signal-decode');assert.match(signalGuidance(entered).detail,/6명/);
 const returned=travel(entered,'signal-town-return');assert.equal(campaignGuidance(returned).id,'signal-travel');assert.equal(returned.stats.earnedXp,s.stats.earnedXp);assert.equal(returned.gold,s.gold);
});
test('optional decoded shortcut changes return navigation without advancing a task or paying twice',()=>{
 let s=settle(travel(accepted(),'town-signal-entry'),SIGNAL_GROUPS.entry);
 const object=id=>getRegion('signal_basin').objects.find(o=>o.id===id);
 for(const id of ['signal-code','signal-shortcut'])s=run(s,{type:'interactSignal',objectId:id,...report(s,object(id))}).state;
 const before=structuredClone(s);s=travel(s,'signal-town-shortcut');assert.match(signalGuidance(s).detail,/中継|중계 승강기/);assert.equal(campaignGuidance(s).id,'signal-travel');assert.deepEqual(s.world.objectives,before.world.objectives);assert.deepEqual(s.world.claimedRewards,before.world.claimedRewards);assert.equal(s.gold,before.gold);assert.equal(s.stats.earnedXp,before.stats.earnedXp);
 s=travel(s,'town-signal-shortcut');assert.equal(campaignGuidance(s).id,'signal-route');assert.equal(s.world.objectives.signal_route_step,0);
});

test('decoded clue reread explicitly reports prior reward and current lever step',()=>{
 let s=settle(travel(accepted(),'town-signal-entry'),SIGNAL_GROUPS.entry);
 const object=id=>getRegion('signal_basin').objects.find(o=>o.id===id);
 s=run(s,{type:'interactSignal',objectId:'signal-code',...report(s,object('signal-code'))}).state;
 const before=structuredClone(s),clue=signalObjectView(s,object('signal-code'));assert.match(clue.detail,/이미 받았습니다/);assert.match(clue.detail,/추가 지급하지/);assert.match(clue.detail,/순서 0\/2/);assert.equal(clue.actions[0].label,'해독판 다시 읽기');assert.deepEqual(s,before);
 s=run(s,{type:'interactSignal',objectId:'signal-route-receiver',...report(s,object('signal-route-receiver'))}).state;assert.match(signalObjectView(s,object('signal-code')).detail,/순서 1\/2.*다음은 송신/);
});
