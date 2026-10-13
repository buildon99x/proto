import test from 'node:test';import assert from 'node:assert/strict';
import {WARRIOR_REFERENCE} from '../src/reference-warrior.js';import {previewSkill,RUNTIME_SKILL_IDS} from '../src/warrior-growth.js';import {reduceRuntime} from '../src/state.js';import {earnedQuarryRoute} from './support/earned-quarry-route.mjs';
let cached;const rows=WARRIOR_REFERENCE.skills.filter(x=>x.tier==='master');assert.equal(rows.length,13);
for(const row of rows)test(`Master ${row.id} has no legal current purchase: keep DATA_ONLY and state unchanged`,()=>{
 cached??=earnedQuarryRoute();const s=structuredClone(cached),before=structuredClone(s),q=previewSkill(s.character,row.id,s);assert.equal(q.ok,true);assert.equal(q.available,false);assert.equal(q.code,'DATA_ONLY');assert.equal(RUNTIME_SKILL_IDS.includes(row.id),false);const r=reduceRuntime(s,{type:'purchaseSkill',skillId:row.id,position:{x:260,y:325}});assert.equal(r.ok,false);assert.equal(r.code,'DATA_ONLY');assert.deepEqual(s,before);assert.equal(s.character.skills[row.id],undefined);
});
