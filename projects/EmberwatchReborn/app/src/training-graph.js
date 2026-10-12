import {WARRIOR_REFERENCE} from './reference-warrior.js';
import {RUNTIME_SKILL_IDS,previewSkill} from './warrior-growth.js';
const rows=WARRIOR_REFERENCE.skills.filter(x=>RUNTIME_SKILL_IDS.includes(x.id));
export const TRAINING_GRAPH_IDS=Object.freeze(rows.map(x=>x.id));
export const TRAINING_GRAPH_EDGES=Object.freeze(rows.filter(x=>x.baseId&&TRAINING_GRAPH_IDS.includes(x.baseId)).map(x=>Object.freeze({from:x.baseId,to:x.id})));
export const TRAINING_GRAPH_GROUPS=Object.freeze([...new Set(rows.map(x=>x.exclusiveGroup).filter(Boolean))].map(id=>Object.freeze({id,members:Object.freeze(rows.filter(x=>x.exclusiveGroup===id).map(x=>x.id))})));
const tiers={all:'전체',apprentice:'입문',adept:'숙련',expert:'전문'};
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Projection only: previewSkill owns every cost, tier/base lock and exclusive choice.
export function trainingGraphSelection(selected,tier='all'){
 const visible=rows.filter(x=>!tiers[tier]||tier==='all'||x.tier===tier);
 return visible.some(x=>x.id===selected)?selected:visible.find(x=>x.id==='mace_swing')?.id??visible[0].id;
}
export function renderTrainingGraph(state,{selected='mace_swing',tier='all',epoch=0,format=x=>JSON.stringify(x)}={}){
 if(!tiers[tier])tier='all';selected=trainingGraphSelection(selected,tier);
 const visible=rows.filter(x=>tier==='all'||x.tier===tier),ids=new Set(visible.map(x=>x.id));
 const quotes=new Map(visible.map(x=>[x.id,previewSkill(state.character,x.id,state)])),positions=new Map();
 const families=rows.filter(x=>!x.baseId).map(root=>[root,...rows.filter(x=>x.baseId===root.id)]).map(family=>family.filter(x=>ids.has(x.id))).filter(family=>family.length);
 families.forEach((family,index)=>family.forEach((row,j)=>positions.set(row.id,{left:(index%4)*250+20,top:Math.floor(index/4)*550+10+(j?150+(j-1)*125:0)})));
 const height=Math.max(400,Math.ceil(families.length/4)*550),edges=TRAINING_GRAPH_EDGES.filter(x=>ids.has(x.from)&&ids.has(x.to));
 const paths=edges.map(({from,to})=>{const a=positions.get(from),b=positions.get(to),cx=a.left+105;return `<path data-training-edge="${from}:${to}" d="M${cx} ${a.top+110} V${a.top+135} H${a.left-12} V${b.top-10} H${cx} V${b.top}"/>`;});
 const groupPaths=TRAINING_GRAPH_GROUPS.filter(g=>g.members.every(id=>ids.has(id))).map(g=>{const [a,b]=g.members.map(id=>positions.get(id));return `<path class="training-exclusive" data-training-exclusive="${g.id}" d="M${a.left+210} ${a.top+55} H${a.left+220} V${b.top+55} H${b.left+210}"/>`;});
 const nodes=visible.map(row=>{const q=quotes.get(row.id),p=positions.get(row.id),base=rows.find(x=>x.id===row.baseId),status=q.available?`강화 가능 · 점수 ${q.cost}`:q.reason||'조건 확인';return `<article class="skill training-node ${q.rank?'learned':''}" style="left:${p.left}px;top:${p.top}px"><button type="button" data-action="training-node:${row.id}" aria-pressed="${row.id===selected}" aria-controls="training-node-detail" aria-label="${esc(row.displayName)} · ${tiers[row.tier]} · ${q.rank}/${q.maxRank} · ${esc(status)}"><strong>${esc(row.displayName)}</strong><span>${tiers[row.tier]} · ${q.rank}/${q.maxRank} · ${q.rank?'학습':'미학습'}${row.exclusiveGroup?' · 택일':''}</span><small>${base?`기반: ${esc(base.displayName)}`:'기본 훈련'}<br>${esc(status)}</small></button></article>`;}).join('');
 const q=quotes.get(selected),row=rows.find(x=>x.id===selected),base=rows.find(x=>x.id===row.baseId),group=TRAINING_GRAPH_GROUPS.find(g=>g.id===row.exclusiveGroup);
 const alternatives=group?.members.filter(id=>id!==selected).map(id=>rows.find(x=>x.id===id).displayName).join(', ');
 return `<div class="buttons training-tier-actions" role="group" aria-label="기술 티어 필터">${Object.entries(tiers).map(([id,label])=>`<button type="button" data-action="training-tier:${id}" aria-pressed="${id===tier}">${label}</button>`).join('')}</div><p class="minor">구현 40개 · 기반 의존선 28개 · 배타 그룹 2개. 현재 ${tiers[tier]} ${visible.length}개 / 의존선 ${edges.length}개. 실선은 기반 기술, 점선은 둘 중 하나만 선택하는 관계입니다. 선택은 구매하지 않습니다. Tab과 Enter/Space로 선택하고 별도 강화 버튼으로 구매하세요.</p><div class="training-graph-scroll" tabindex="0" role="group" aria-label="${tiers[tier]} 기술 관계 · 가로와 세로 스크롤"><div class="training-graph-board" style="height:${height}px"><svg viewBox="0 0 1000 ${height}" aria-hidden="true" focusable="false">${paths.join('')}${groupPaths.join('')}</svg>${nodes}</div></div><section id="training-node-detail" class="skill training-detail" aria-labelledby="training-node-name"><h3 id="training-node-name">${esc(q.name)} · ${tiers[row.tier]} · ${q.rank}/${q.maxRank}</h3>${base?`<p>기반 기술: ${esc(base.displayName)} (${tiers[base.tier]}) 첫 훈련이 필요합니다.${ids.has(base.id)?'':' 현재 필터에서는 기반 노드가 숨겨져 있습니다.'}</p>`:''}${group?`<p>배타 선택: ${esc(alternatives)}와 함께 학습할 수 없습니다. 선택 후 되돌리기는 지원하지 않습니다.</p>`:''}<p class="effect">현재 ${esc(q.current?format(q.current.runtimeValues):'미학습')}<br>다음 ${esc(q.next?format(q.next.runtimeValues):q.rank>=q.maxRank?'최대 랭크':q.reason)}</p><p>${q.available?`강화 비용: 기술점수 ${q.cost}`:esc(q.reason)}</p>${(q.warnings??[]).map(w=>`<p class="warning">${esc(w.reason)}</p>`).join('')}<button type="button" data-action="skill:${q.id}" data-training-epoch="${epoch}" data-training-rank="${q.rank}" ${q.available?'':'disabled'}>${q.available?'선택 기술 강화':esc(q.reason)}</button></section>`;
}
