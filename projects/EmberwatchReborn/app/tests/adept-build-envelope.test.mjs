import test from 'node:test';
import assert from 'node:assert/strict';
import {LOADOUTS,buildEnvelopeLoadout,envelope} from '../scripts/adept-build-envelope.mjs';
import {validateState,reduceRuntime} from '../src/state.js';
import {validateWarriorGrowth} from '../src/warrior-growth.js';
for(const id of Object.keys(LOADOUTS))test(`earned L8 ${id} envelope spends35 attributes/25 skill points through real handlers`,()=>{
 const {state:s,stats}=buildEnvelopeLoadout(id);
 assert.equal(validateState(s).ok,true);assert.equal(s.character.level,8);assert.equal(s.stats.earnedXp,1865.5);
 assert.equal(s.character.attributePoints,0);assert.equal(s.character.skillPoints,0);
 assert.equal(Object.values(s.character.attributes).reduce((a,b)=>a+b),35);
 assert.equal(validateWarriorGrowth(s.character,s).spentSkillPoints,25);
 assert.equal(s.inventory.equipmentInstances.length,2);assert.ok(s.inventory.equipmentInstances.every(i=>i.upgradeRank===1));
 const before=structuredClone(s),opposite=LOADOUTS[id].branch==='hammer_of_wrath'?'hammer_of_sundering':'hammer_of_wrath';
 assert.equal(reduceRuntime(s,{type:'purchaseSkill',skillId:opposite,position:{x:260,y:325}}).ok,false);assert.deepEqual(s,before);
 assert.ok(stats.hpMax>=83);assert.ok(stats.actions.righteous_hammer.manaCost>0);
});
test('spent-point models expose damage/survival tradeoffs and four finite difficulty rows per enemy',()=>{
 const data=envelope();assert.equal(data.builds.length,3);
 for(const build of data.builds){assert.equal(build.rows.length,24);assert.ok(build.rows.every(r=>Object.values(r).every(v=>typeof v!=='number'||Number.isFinite(v))));
  for(const kind of ['quarry_raider','quarry_slinger','quarry_guard']){const rows=build.rows.filter(r=>r.kind===kind);assert.deepEqual(rows.map(r=>r.difficulty),['easy','normal','hard','serious']);for(let i=1;i<rows.length;i++){assert.ok(rows[i].hp>=rows[i-1].hp);assert.ok(rows[i].incomingWorst>=rows[i-1].incomingWorst);assert.ok(rows[i].maceTtkFloor>=rows[i-1].maceTtkFloor);}}
 }
 const [str,int]=data.builds;assert.ok(str.stats.hp>int.stats.hp);assert.ok(str.stats.physicalDamage>int.stats.physicalDamage);assert.ok(int.stats.mana>str.stats.mana);assert.ok(int.hammer.physicalDamage>str.hammer.physicalDamage);
});
