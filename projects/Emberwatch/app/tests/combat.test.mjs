import assert from 'node:assert/strict';
import {startCombatAction,advanceCombatAction,cancelCombatAction,combatPose,combatHitstop,segmentHitsCircle} from '../src/combat.js';
for(const dt of [1/30,1/60,1/120,.1]){let a={},hits=0,finishes=0;assert(startCombatAction(a,{duration:.42,contact:.105}));assert(!startCombatAction(a));for(let i=0;i<100;i++){let event=advanceCombatAction(a,dt);if(event?.contact){hits++;assert(event.action.elapsed>=.105);}if(event?.finished)finishes++;}assert.equal(hits,1);assert.equal(finishes,1);assert.equal(a.action,null);}
let a={};startCombatAction(a,{duration:.5,contact:.15});advanceCombatAction(a,.1);cancelCombatAction(a);assert.equal(advanceCombatAction(a,1),null);assert.equal(combatPose(a),null);
startCombatAction(a,{duration:.5,contact:.15});a=JSON.parse(JSON.stringify(a));assert.equal(advanceCombatAction(a,.15).contact,true);a=JSON.parse(JSON.stringify(a));assert.equal(advanceCombatAction(a,.1).contact,false);assert.equal(combatPose(a).frame,12);
assert(combatHitstop({heavy:true})<=.1);assert(combatHitstop({spell:true})<combatHitstop());assert(segmentHitsCircle(0,0,100,0,50,8,10));assert(!segmentHitsCircle(0,0,100,0,50,11,10));
console.log('PASS: exactly-once contacts at30/60/120Hz and100ms stall, startup cancellation, serialized resume,24-frame phase mapping and projectile sweep. Logic tests only.');
