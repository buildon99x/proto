import test from 'node:test';import assert from 'node:assert/strict';
import {createVisualRenderer} from '../src/visual.js';
import {combatActorOpacity} from '../src/combat-readability.js';
import {overlapFixture,record,bodies,heroes,statues} from './overlap-fixture.mjs';

test('overlapping live keeper passes scene visibility and is drawn once at legacy alpha 0.64',()=>{
 const s=overlapFixture(),enemy=s.entities[0],a=record(createVisualRenderer,s),b=record(createVisualRenderer,{...s,sceneVisibility:null});
 assert.equal(s.sceneVisibility.entityVisible(enemy),true);assert.equal(s.sceneVisibility.threatVisible(enemy),true);
 assert.equal(combatActorOpacity(enemy,s.p,s.regionId),.64);assert.equal(bodies(a.calls).length,1);assert.equal(bodies(a.calls)[0].globalAlpha,.64);
 assert.deepEqual(bodies(a.calls),bodies(b.calls));
});
test('legacy layer sequence is keeper 0.64, foreground shrine 0.30, opaque hero redraw',()=>{
 const {calls}=record(createVisualRenderer,overlapFixture()),enemy=bodies(calls)[0],shrine=statues(calls).find(c=>c.globalAlpha===.3),player=heroes(calls);
 assert.equal(player.length,2);assert.ok(shrine);assert.ok(calls.indexOf(enemy)<calls.indexOf(shrine));assert.ok(calls.indexOf(shrine)<calls.indexOf(player[1]));assert.equal(player[1].globalAlpha,1);
});
test('removing the shrine leaves keeper opacity and hero redraw unchanged',()=>{
 const s=overlapFixture(),a=record(createVisualRenderer,s),b=record(createVisualRenderer,{...s,objects:[]});
 assert.deepEqual(bodies(a.calls),bodies(b.calls));assert.deepEqual(heroes(a.calls),heroes(b.calls));
});
test('separated keeper returns to opacity one and the hero is drawn once',()=>{
 const s=overlapFixture(),a=record(createVisualRenderer,{...s,entities:s.entities.map(e=>({...e,x:e.x+96}))});
 assert.equal(bodies(a.calls)[0].globalAlpha,1);assert.equal(heroes(a.calls).length,1);
});
