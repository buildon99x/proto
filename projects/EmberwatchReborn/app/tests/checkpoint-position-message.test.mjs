import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {reduceCampaign} from '../src/campaign.js';
import {createState,validateState} from '../src/state.js';
import {createBattle} from '../src/combat.js';
import {battleReport} from '../src/recovery.js';
import {createSession} from '../src/save.js';
import {createController} from '../src/controller.js';
const envelope=JSON.parse(fs.readFileSync(new URL('./fixtures/qa/qa-r12a2-replay-l9-r1025-pre-rejection.ewqa.json',import.meta.url),'utf8'));
const saved=JSON.parse(envelope.payload),good={type:'checkpoint',...battleReport(createBattle(saved))};
const locationReason='현재 위치가 벽이나 이동할 수 없는 곳에 있어 저장하지 못했습니다. 마지막 저장을 불러와 다시 시도하세요.';
const genericReason='현재 생존 상태만 저장할 수 있습니다.';
// Actual earned save; invalid positions/pools below are intentional reducer
// fixtures. This test does not claim a newly observed native invalid report.
for(const [id,mutate,positionOnly] of [
 ['wall',c=>c.position={x:610,y:220},true],
 ['missing-position',c=>delete c.position,true],
 ['NaN-position',c=>c.position.x=NaN,true],
 ['stale-life',c=>c.life++,false],
 ['negative-recovery',c=>c.recovery.lock=-1,false],
 ['over-max-hp',c=>c.vitals.hp=1e9,false],
 ['over-max-mana',c=>c.vitals.mana=1e9,false],
 ['over-max-stamina',c=>c.vitals.stamina=1e9,false],
 ['dead',c=>c.vitals.hp=0,false],
 ['wall-and-dead',c=>{c.position={x:610,y:220};c.vitals.hp=0;},false],
 ['wall-and-recovery',c=>{c.position={x:610,y:220};c.recovery.lock=-1;},false],
])test(`checkpoint reason for ${id} preserves rejection and state`,()=>{
 const before=structuredClone(saved),c=structuredClone(good);mutate(c);const commandBefore=structuredClone(c),r=reduceCampaign(saved,c);
 assert.deepEqual(r,{ok:false,code:'INVALID_REPORT',reason:positionOnly?locationReason:genericReason});assert.deepEqual(saved,before);assert.deepEqual(c,commandBefore);
});
test('valid checkpoint, untrained rejection and invalid settlement keep their contracts',()=>{
 assert.equal(validateState(saved).ok,true);const result=reduceCampaign(saved,good);assert.equal(result.ok,true);assert.deepEqual(result.state.vitals,good.vitals);assert.deepEqual(result.state.recovery,good.recovery);assert.deepEqual(result.state.world.position,good.position);
 assert.deepEqual(reduceCampaign(createState(),{type:'checkpoint',life:0,position:{x:0,y:0},vitals:{hp:1,mana:0,stamina:0}}),{ok:false,code:'INVALID_REPORT',reason:'훈련 전 마을 위치를 확인하세요.'});
 assert.deepEqual(reduceCampaign(saved,{...good,type:'settleCombat',defeated:[],position:{x:610,y:220}}),{ok:false,code:'INVALID_REPORT',reason:'전투 보고가 올바르지 않습니다.'});
});
test('real controller/store preserve confirmed save after position rejection and reload it',async()=>{
 const data=new Map(),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)},locks={request:async(_k,_o,fn)=>fn()};
 const session=createSession(storage,locks,{profile:'qa-position-reason',namespace:'qa-r12'});assert.equal((await session.save(saved,{expectedRevision:0})).ok,true);
 const controller=createController(session);assert.equal((await controller.load()).ok,true);const before=[...data],state=controller.snapshot(),rev=controller.revision();
 assert.deepEqual(await controller.dispatch({...good,position:{x:610,y:220}}),{ok:false,code:'INVALID_REPORT',reason:locationReason});assert.deepEqual([...data],before);assert.deepEqual(controller.snapshot(),state);assert.equal(controller.revision(),rev);
 const reloaded=createController(session);assert.equal((await reloaded.load()).ok,true);assert.deepEqual(reloaded.snapshot(),state);assert.equal(reloaded.revision(),rev);
 assert.equal((await reloaded.dispatch(good)).ok,true);assert.equal(reloaded.revision(),rev+1);assert.equal(validateState(reloaded.snapshot()).ok,true);
});
