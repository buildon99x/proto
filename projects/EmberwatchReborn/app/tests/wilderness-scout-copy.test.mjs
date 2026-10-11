import test from 'node:test';
import assert from 'node:assert/strict';
import {wildernessObjectView,wildernessCommandFields} from '../src/wilderness-presentation.js';
import {WILDERNESS_GROUPS,WILDERNESS_REWARDS} from '../src/wilderness-content.js';
import {stages,copyRuntime,object,runtimeContext,wRun,report} from './support/earned-wilderness-route.mjs';
// Production command-earned progression and real presentation. Recorded kills
// are explicit handler fixtures, not ordinary-input combat or native UI proof.
let earned;const evidence=()=>copyRuntime((earned??=stages()).evidence);
for(const [count,remaining] of [[1,3],[4,0]])test(`scout panel explicitly says ${remaining}/4 remaining after ${count} recorded defeats`,()=>{
 let s=evidence();s=wRun(s,{type:'settleCombat',defeated:WILDERNESS_GROUPS.scouts.slice(0,count),...report(s)}).state;
 const before=copyRuntime(s),view=wildernessObjectView(s,object('scouts'),runtimeContext(s));
 assert.match(view.detail,new RegExp(`남은 적 ${remaining}/4명\\.`));
 assert.doesNotMatch(view.detail,/적 [0-4]\/4명 처치 후/);
 assert.match(view.detail,/모두 처치한 뒤 네리와 구조를 마무리하세요/);
 assert.match(view.detail,/에다 보고에는 필요 없으며 보고 후에도 돌아올 수 있습니다/);
 assert.equal(view.completed,false);assert.equal(view.actions.length,remaining===0?1:0);
 const reward=WILDERNESS_REWARDS['r12:w:scouts'];assert.match(view.detail,new RegExp(`경험치 ${reward.xp} · 금화 ${reward.gold}`));
 if(remaining===0){assert.equal(view.actions[0].label,'정찰대 구조 마무리');assert.deepEqual(wildernessCommandFields(view.actions[0]),{type:'interactWilderness',objectId:'wilderness-scouts',expectedRevision:s.world.objectives.wilderness_revision,expectedStoreRevision:runtimeContext(s).revision});}
 assert.deepEqual(s,before,'view must not mutate claim state, rewards, pools or receipts');
});
