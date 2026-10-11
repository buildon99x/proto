import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {previewSkill,purchaseSkill,deriveStats} from '../src/warrior-growth.js';
import {expertPreview} from '../src/warrior-expert.js';
import {createBattle,quoteAction,actionEligibility} from '../src/combat.js';
import {expertState,learn,rows} from './support/expert-fixture.mjs';

// Synthetic Expert tier/XP fixtures; all purchases/quotes below use production
// reducers. Actual main formatter and trainer function execute with only their
// DOM/checkpoint boundary substituted. These are not native browser/save QA.
const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8'),imports={};
for(const row of source.matchAll(/^import\s*\{([^}]+)\}\s*from\s*'([^']+)'/gm)){
 const module=await import(new URL('../src/'+row[2].replace('./',''),import.meta.url));
 for(const name of row[1].split(',').map(s=>s.trim()))imports[name]=module[name];
}
function fn(name){
 const match=new RegExp(`(?:async )?function ${name}\\(`).exec(source);assert.ok(match,name);
 for(let end=source.indexOf('}',match.index);end>=0;end=source.indexOf('}',end+1)){
  const text=source.slice(match.index,end+1);
  try{new vm.Script('('+text+')');return text;}catch(e){if(!(e instanceof SyntaxError))throw e;}
 }
 throw Error(name);
}
function ui(state){
 const panels=[],modal={presentationEpoch:0};
 const context=vm.createContext({...imports,state,battle:createBattle(state),modal,controller:{revision:()=>7},checkpointPanel:async()=>true,panel(title,content){modal.presentationEpoch++;panels.push({title,content});}});
 const declarations=['esc','button','tierLabel'].map(name=>source.split('\n').find(line=>line.startsWith(`const ${name}=`)));
 vm.runInContext([...declarations,fn('effectText'),fn('showTraining')].join('\n'),context);
 return {context,format:(v,r,c)=>context.effectText(v,r,c),async show(){await context.showTraining();return panels.at(-1).content;},row(html,id){const name=rows.get(id).displayName;const article=[...html.matchAll(/<article class="skill">([\s\S]*?)<\/article>/g)].find(row=>row[1].includes(`<strong>${name}</strong>`));assert.ok(article,id);return article[1];}};
}
const descriptions={
 cleansing_touch:['쿨다운 증가 5초'],turn_undead:['순수 피해 100'],
 banner_of_protection:['받는 피해 변화 -10%'],banner_of_zeal:['시전속도 증가 20%','MP 비용 변화 -10%'],
 zealous_lance:['피해 기준값 100','물리/화염 분할 미확인','범위 미확인'],zealous_shield:['기력 비용 증가 25%'],
 flaming_wrath:['주문 치명 확률 보너스 +5%p','화염 피해 40','효과 쿨다운 0.5초','반경 미확인'],
 punish_the_wicked:['피해 증가 10%'],guilt_by_association:['주무기 피해 비율 50%','효과 쿨다운 1.5초','반경 미확인']
};
for(const [id,texts] of Object.entries(descriptions))test(`actual trainer ${id} missing base shows conditional reference values without granting runtime effects`,async()=>{
 const s=expertState(),before=structuredClone(s),stats=deriveStats(s.character,s),preview=previewSkill(s.character,id,s),h=ui(s),battleBefore=structuredClone(h.context.battle);
 assert.equal(preview.code,'BASE_SKILL');assert.equal(preview.available,false);assert.equal(preview.next.runtimeValues,null);
 const article=h.row(await h.show(),id);assert.match(article,/현재 미학습/);assert.match(article,/다음 참조 랭크값 · 기반 기술 필요/);assert.doesNotMatch(article,/효과 정보 없음/);
 for(const text of texts)assert.ok(article.includes(text),text);
 assert.ok(article.includes(`기술점수 ${rows.get(id).upgradeCosts[0]}`));assert.ok(article.includes(`data-action="skill:${id}" class="small" disabled`));
 assert.match(article,/기반 기술을 먼저 훈련해야 합니다/);assert.match(article,/참조 랭크표 기반/);assert.match(article,/Emberwatch 조정값/);
 const rejected=purchaseSkill(s.character,id,s);assert.equal(rejected.ok,false);assert.equal(rejected.code,'BASE_SKILL');
 assert.deepEqual(s,before);assert.deepEqual(deriveStats(s.character,s),stats);assert.deepEqual(h.context.battle,battleBefore);
 assert.equal(previewSkill(s.character,id,s).next.runtimeValues,null);
 for(const action of ['battle_banner','zealous_onslaught']){assert.equal(quoteAction(h.context.battle,action),null);assert.equal(actionEligibility(h.context.battle,action).blockedReason,'unlearned');}
});
for(const id of [...Object.keys(descriptions),'inner_flame'])for(let rank=1;rank<=rows.get(id).upgradeCosts.length;rank++)test(`${id} rank ${rank} next text equals the real purchased effect and leaves quote/cost gates intact`,async()=>{
 const s=expertState(),row=rows.get(id);if(row.baseId)learn(s,row.baseId);if(rank>1)learn(s,id,rank-1);
 const before=structuredClone(s),quote=previewSkill(s.character,id,s),h=ui(s),text=h.format(quote.next.runtimeValues,quote.next.referenceValues,quote.code);
 assert.equal(quote.available,true);assert.equal(quote.nextRank,rank);assert.equal(quote.cost,row.upgradeCosts[rank-1]);assert.doesNotMatch(text,/참조 랭크값|효과 정보 없음/);
 const prior=h.row(await h.show(),id);assert.ok(prior.includes(`다음 ${text}`));assert.deepEqual(s,before);
 const purchased=purchaseSkill(s.character,id,s);assert.equal(purchased.ok,true,purchased.reason);assert.equal(purchased.character.skills[id],rank);assert.equal(purchased.character.skillPoints,s.character.skillPoints-quote.cost);
 const after={...s,character:purchased.character},stats=deriveStats(after.character,after).stats,current=previewSkill(after.character,id,after).current;
 assert.deepEqual(current.runtimeValues,quote.next.runtimeValues);assert.deepEqual(current.runtimeValues,expertPreview(id,stats));
 assert.equal(h.format(current.runtimeValues),text);const afterUi=ui(after),afterArticle=afterUi.row(await afterUi.show(),id);assert.ok(afterArticle.includes(`현재 ${text}`));
 if(id==='inner_flame'){
  assert.ok(text.includes(`화염 저항 증가 +${row.rankValues.fireResistanceIncreasePercent[rank-1]}%p`));
  assert.ok(text.includes(`화염 피해 배율 ${stats.innerFlame.fireDamageMultiplier}`));assert.ok(text.includes('지속(초) 3'));
 }
 if(id==='flaming_wrath'){
  assert.ok(text.includes(`주문 치명 확률 보너스 +${row.rankValues.spellCritChanceBonusPercent[rank-1]}%p`));assert.ok(text.includes(`피해 ${row.rankValues.fireDamage[rank-1]}`));assert.ok(text.includes('반경 64'));assert.ok(text.includes('쿨다운(초) 0.5'));
  const b=createBattle(after);assert.equal(quoteAction(b,'righteous_hammer').offense.criticalChance,Math.min(1,stats.criticalChance+stats.flamingWrath.spellCriticalChanceBonus));
 }
 if(id==='banner_of_protection')assert.equal(stats.actions.battle_banner.damageTakenMultiplier,1+row.rankValues.damageTakenChangePercent[rank-1]/100);
 if(id==='banner_of_zeal'){assert.equal(stats.actions.battle_banner.castSpeedMultiplier,1+row.rankValues.castSpeedIncreasePercent[rank-1]/100);assert.equal(stats.actions.battle_banner.manaCostMultiplier,1+row.rankValues.manaCostChangePercent[rank-1]/100);}
 if(id==='zealous_lance'){const lance=stats.actions.zealous_onslaught.lance;assert.equal(lance.fireDamage,row.rankValues.damage[rank-1]/2);assert.equal(lance.physicalDamage,Number((row.rankValues.damage[rank-1]/2*stats.physicalDamageMultiplier).toFixed(8)));}
 if(id==='guilt_by_association'){assert.equal(stats.guilt.damage,Number((stats.physicalDamage*row.rankValues.mainhandDamagePercent[rank-1]/100).toFixed(8)));assert.equal(stats.guilt.cooldown,row.rankValues.effectCooldownSeconds[rank-1]);}
 assert.deepEqual(s,before,'production preview/purchase is immutable');
});
for(const [owned,locked] of [['banner_of_protection','banner_of_zeal'],['banner_of_zeal','banner_of_protection']])test(`actual trainer preserves ${owned} exclusive lock while explaining ${locked}`,async()=>{
 const s=expertState({[owned]:1}),before=structuredClone(s),quote=previewSkill(s.character,locked,s),h=ui(s);
 assert.equal(quote.code,'EXCLUSIVE');assert.equal(quote.next.runtimeValues,null);
 const article=h.row(await h.show(),locked);assert.match(article,/참조 랭크값 · 반대 배타 분기 선택으로 적용 불가/);assert.doesNotMatch(article,/기반 기술 필요/);assert.ok(article.includes(`data-action="skill:${locked}" class="small" disabled`));assert.match(article,/반대 배타 분기를 이미 선택/);
 for(const text of descriptions[locked])assert.ok(article.includes(text));assert.equal(purchaseSkill(s.character,locked,s).code,'EXCLUSIVE');assert.deepEqual(s,before);
});
test('actual trainer preserves tier, points, max-rank, unknown-source and unmodified Adept boundaries',async()=>{
 const s=expertState({inner_flame:4});
 // Exhaust affordable purchases through the actual ledger, never overwrite SP.
 const keepUnlearned=['judgement','lay_on_hands','battle_banner','banner_of_protection','banner_of_zeal'];
 for(let i=0;i<100;i++){const next=imports.RUNTIME_SKILL_IDS.filter(id=>!keepUnlearned.includes(id)).map(id=>previewSkill(s.character,id,s)).filter(p=>p.available).sort((a,b)=>a.cost-b.cost)[0];if(!next)break;const bought=purchaseSkill(s.character,next.id,s);assert.equal(bought.ok,true);s.character=bought.character;}
 assert.ok(s.character.skillPoints<rows.get('battle_banner').upgradeCosts[0]);const before=structuredClone(s),h=ui(s),html=await h.show();
 const max=h.row(html,'inner_flame');assert.match(max,/다음 최대 랭크/);assert.match(max,/화염 저항 증가 \+50%p/);
 assert.equal(previewSkill(s.character,'battle_banner',s).code,'SKILL_POINTS');assert.match(h.row(html,'battle_banner'),/기술점수가 부족합니다/);
 assert.match(h.row(html,'trial_by_fire'),/다음 효과 정보 없음/,'unrelated Adept explanations are unchanged');
 assert.equal(rows.get('zealous_lance').rankValues.physicalFireSplit,null);assert.equal(rows.get('zealous_lance').rankValues.range,null);assert.equal(rows.get('flaming_wrath').rankValues.areaRadius,null);assert.equal(rows.get('guilt_by_association').rankValues.areaRadius,null);
 assert.equal(h.format(null),'효과 정보 없음');assert.deepEqual(s,before);
 const lower=expertState();lower.character.tier='adept';const lowerUi=ui(lower),article=lowerUi.row(await lowerUi.show(),'banner_of_zeal');assert.match(article,/참조 랭크값 · 기반 기술\/훈련 조건 필요/);assert.match(article,/해당 티어 승급을 먼저 완료/);assert.match(article,/disabled/);
});
test('formatter never mutates frozen reference/runtime projections or converts unknown values to zero',()=>{
 const h=ui(expertState()),ref=Object.freeze({damage:100,range:null,physicalFireSplit:null}),runtime=Object.freeze({innerFlame:Object.freeze({duration:3,fireDamageMultiplier:1.1,fireResistanceBonus:20}),flamingWrath:Object.freeze({spellCriticalChanceBonus:.05,damage:40,radius:64,cooldown:.5})});
 const text=h.format(null,ref,'BASE_SKILL');assert.match(text,/범위 미확인/);assert.match(text,/물리\/화염 분할 미확인/);assert.doesNotMatch(text,/범위 0|분할 0/);
 assert.match(h.format(runtime),/화염 저항 증가 \+20%p/);assert.match(h.format(runtime),/주문 치명 확률 보너스 \+5%p/);assert.equal(runtime.flamingWrath.spellCriticalChanceBonus,.05);
});
