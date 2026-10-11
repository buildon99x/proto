import test from 'node:test';
import assert from 'node:assert/strict';
import {tombObjectView,tombGuidance,tombElderView,tombClueView,tombGoldView,tombCommandFields,tombPortalLabel,tombPortalView,tombPresentationHints,tombEventCopy} from '../src/tomb-presentation.js';
import {TOMB_REGION,TOMB_REGIONS,TOMB_GROUPS,TOMB_GLYPHS,TOMB_SEQUENCE,TOMB_FOES} from '../src/tomb-content.js';
import {tombInputRevision} from '../src/tomb.js';
import {createState,reduceRuntime} from '../src/state.js';
import {createStore} from '../src/save.js';
import {projectWorld} from '../src/visual.js';
import {rebindControl} from '../src/controls.js';
import {earnedFurnaceRoute} from './support/earned-furnace-route.mjs';
import {earnedTombRoute} from './support/earned-tomb-route.mjs';
import {report,run,travel,settle} from './support/earned-route.mjs';

// Real production reducers with scripted positions and permanent kill reports.
// No XP, level, tier, tools, flags or gold injected into earned routes. These are
// pure-view/handler checks, not ordinary-input gameplay or visual acceptance.
const copy=value=>structuredClone(value);
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const region=TOMB_REGIONS[TOMB_REGION],object=id=>region.objects.find(row=>row.id===id);
const view=(state,id)=>tombObjectView(state,object(id));
const quest=(state,type)=>({type,expectedRevision:tombInputRevision(state),...report(state,{x:450,y:325})});
const command=(state,id,action=view(state,id).actions[0])=>({...tombCommandFields(action),...report(state,object(id))});
const act=(state,id)=>run(state,command(state,id)).state;
const cache=new Map();
function stages(difficulty='normal',shortcut=false){
 const key=JSON.stringify([difficulty,shortcut]);if(cache.has(key))return copy(cache.get(key));
 const out={before:earnedFurnaceRoute(difficulty)};
 let s=run(out.before,quest(out.before,'acceptTombQuest')).state;out.accepted=s;
 s=travel(s,'town-tomb-entry');out.entered=s;
 s=settle(s,TOMB_GROUPS.entry.slice(0,2));out.entryPartial=s;s=settle(s,TOMB_GROUPS.entry.slice(2));out.decodeReady=s;
 s=act(s,'tomb-projection');out.decoded=s;
 if(shortcut){s=act(s,'tomb-shortcut');out.shortcut=s;}
 s=settle(s,TOMB_GROUPS.inscription);out.sequenceReady=s;
 s=act(s,'tomb-glyph-crescent');out.prefix1=s;s=act(s,'tomb-glyph-split-beam');out.prefix2=s;s=act(s,'tomb-glyph-ember');out.sequenceDone=s;
 s=act(s,'tomb-ward-origin');out.wardTaken=s;s=settle(s,TOMB_GROUPS.ward_lower);out.midpointReady=s;s=act(s,'tomb-ward-midpoint');out.midpoint=s;
 s=settle(s,TOMB_GROUPS.ward_upper);out.sealReady=s;s=act(s,'tomb-ward-final');out.sealed=s;s=settle(s,TOMB_GROUPS.boss);out.bossDown=s;
 s=act(s,'tomb-oath');out.oath=s;s=travel(s,shortcut?'tomb-town-shortcut':'tomb-boss-return');out.reportReady=s;
 s=run(s,quest(s,'reportTombQuest')).state;out.complete=s;cache.set(key,copy(out));return out;
}
function reload(state){
 const memory=new Map(),store=createStore({getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,value)},{profile:'qa-tomb-presentation'});
 assert.equal(store.save(state,{expectedRevision:0}).ok,true);const result=store.load();assert.equal(result.ok,true);return result.state;
}

test('T starts at actual earned F report, retained tools and prerequisites; reading creates no defaults',()=>{
 const fresh=createState();assert.equal(tombGuidance(fresh),null);assert.equal(tombElderView(fresh),null);assert.equal(tombClueView(fresh),null);
 const s=stages().before,before=copy(s);
 assert.equal(tombGuidance(s).id,'tomb-accept');const card=tombElderView(s);assert.equal(card.action,'accept');assert.equal(card.npcId,'elder');assert.equal(card.expectedRevision,0);
 assert.match(card.detail,/무료.*추가 레벨.*요구하지/);assert.deepEqual(s,before);assert.equal('tomb_accepted' in s.world.objectives,false);
 // Labelled invalid-predecessor fixtures only, never treated as earned routes.
 for(const edit of [n=>n.character.tier='apprentice',n=>n.world.objectives.furnace_reported=0,n=>n.world.objectives.adept_commission=0,...['signal_cipher','furnace_lens'].map(id=>n=>n.inventory.tools=n.inventory.tools.filter(t=>t!==id)),...['r4:report','r5:promote:adept','r6:q:report','r7:p:report','r8:s:report','r9:f:report'].map(id=>n=>n.world.claimedRewards=n.world.claimedRewards.filter(t=>t!==id))]){
  const invalid=copy(s);edit(invalid);assert.equal(tombGuidance(invalid),null);assert.equal(tombElderView(invalid),null);
 }
});

test('object views resolve immutable IDs and never trust supplied action kinds or glyphs',()=>{
 const s=stages().sequenceReady,real=object('tomb-glyph-crescent');
 assert.deepEqual(tombObjectView(s,{...real,actionKind:'oath',glyph:'ember',name:'forged'}),tombObjectView(s,real));
 const unknown=tombObjectView(s,{type:'tomb',id:'tomb-fake',name:'미등록',actionKind:'decode'});assert.deepEqual(unknown.actions,[]);assert.equal(unknown.completed,false);
 for(const state of Object.values(stages()))for(const row of region.objects){const shown=tombObjectView(state,row);assert.ok(shown.name);assert.ok(shown.detail);assert.ok(Array.isArray(shown.actions));assert.equal(typeof shown.completed,'boolean');assert.ok(shown.actions.length<=1);}
});

test('locked and completed states differ, and only real ready actions are offered',()=>{
 const s=stages();
 for(const [state,id,ready] of [[s.entered,'tomb-projection',false],[s.decodeReady,'tomb-projection',true],[s.decoded,'tomb-glyph-crescent',false],[s.sequenceReady,'tomb-glyph-crescent',true],[s.sequenceReady,'tomb-ward-origin',false],[s.sequenceDone,'tomb-ward-origin',true],[s.wardTaken,'tomb-ward-midpoint',false],[s.midpointReady,'tomb-ward-midpoint',true],[s.midpoint,'tomb-ward-final',false],[s.sealReady,'tomb-ward-final',true],[s.sealed,'tomb-oath',false],[s.bossDown,'tomb-oath',true]]){
  const shown=view(state,id);assert.equal(shown.completed,false);assert.equal(shown.actions.length,Number(ready));
 }
 assert.match(view(s.wardTaken,'tomb-ward-midpoint').detail,/3\/3명 남음/);assert.match(view(s.midpoint,'tomb-ward-final').detail,/3\/3명 남음/);
 assert.match(view(s.sealed,'tomb-oath').detail,/수호자를 먼저 처치/);
});

test('full clue stays in journal and reread through all later stages with ordered shape metadata',()=>{
 const s=stages();assert.equal(tombClueView(s.decodeReady),null);
 for(const key of ['decoded','prefix1','prefix2','sequenceDone','wardTaken','midpoint','sealed','bossDown','oath','reportReady','complete']){
  const clue=tombClueView(s[key]);assert.deepEqual(clue.sequence,TOMB_SEQUENCE);assert.match(clue.detail,/초승달 → 갈라진 빛줄기 → 잿불/);assert.match(clue.detail,/언제든 확인/);
  assert.deepEqual(clue.glyphs.map(g=>[g.id,g.name,g.order,g.shape]),TOMB_SEQUENCE.map(id=>[id,TOMB_GLYPHS[id].name,TOMB_GLYPHS[id].order,TOMB_GLYPHS[id].shape]));
  const reread=view(s[key],'tomb-projection');assert.equal(reread.actions.length,1);assert.match(reread.actions[0].label,/다시 읽기/);assert.match(reread.detail,/보상은 이미.*추가 보상이 없습니다/);
 }
 const reread=run(s.prefix1,command(s.prefix1,'tomb-projection'));assert.equal(reread.state.stats.earnedXp,s.prefix1.stats.earnedXp);assert.equal(reread.state.gold,s.prefix1.gold);assert.equal(tombClueView(reread.state).step,1);
 assert.match(tombEventCopy(reread.events.find(e=>e.type==='tombClueRead')),/초승달 → 갈라진 빛줄기 → 잿불/);
});

test('captured plate command tokens survive helper extraction and reject repeat, stale step and forged glyph',()=>{
 const start=stages().sequenceReady,action=view(start,'tomb-glyph-crescent').actions[0];
 assert.deepEqual(tombCommandFields(action),{type:'interactTomb',objectId:'tomb-glyph-crescent',expectedRevision:tombInputRevision(start),glyph:'crescent',expectedStep:0});
 const first=command(start,'tomb-glyph-crescent',action),next=run(start,first).state;
 assert.equal(reduceRuntime(next,first).code,'STALE_REVISION');assert.equal(tombClueView(next).step,1);assert.equal(tombClueView(next).nextGlyph,'split_beam');
 const current=command(next,'tomb-glyph-split-beam');assert.equal(reduceRuntime(next,{...current,expectedStep:0}).code,'STALE_STEP');
 assert.equal(tombCommandFields({...action,glyph:'ember'}),null);assert.equal(tombCommandFields({...action,expectedRevision:-1}),null);assert.equal(tombCommandFields({...action,objectId:'tomb-fake'}),null);assert.equal(tombCommandFields({type:'promoteExpert',expectedRevision:0}),null);
 assert.deepEqual(tombCommandFields({...action,rewardId:'r10:t:report',gold:1e9}),tombCommandFields(action));
});

test('fresh wrong glyph resets only prefix and gives precise penalty-free feedback',()=>{
 const s=stages().prefix1,r=run(s,command(s,'tomb-glyph-ember')),reset=r.events.find(e=>e.type==='tombSequenceReset');
 assert.equal(tombClueView(r.state).step,0);assert.equal(tombClueView(r.state).nextGlyph,'crescent');
 assert.match(tombEventCopy(reset),/잿불.*갈라진 빛줄기.*0\/3.*벌점은 없습니다.*초승달/);
 for(const key of ['character','inventory','gold','stats','vitals','recovery'])assert.deepEqual(r.state[key],s[key]);
 const loaded=reload(stages().prefix2);assert.equal(tombClueView(loaded).step,2);assert.equal(tombClueView(loaded).nextGlyph,'ember');
 const final=run(loaded,command(loaded,'tomb-glyph-ember'));assert.equal(tombClueView(final.state).complete,true);assert.equal(view(final.state,'tomb-glyph-ember').actions.length,0);
 assert.match(tombEventCopy(final.events.find(e=>e.type==='tombSequenceAdvanced')),/3\/3.*운반 봉인/);
});

test('latest stage follows real clears, separate ward transfers, explicit oath and actual Eda report',()=>{
 const s=stages();
 for(const [key,id]of [['entered','tomb-decode'],['entryPartial','tomb-decode'],['decoded','tomb-sequence'],['prefix2','tomb-sequence'],['sequenceDone','tomb-ward-take'],['wardTaken','tomb-ward-midpoint'],['midpoint','tomb-ward-seal'],['sealed','tomb-boss'],['bossDown','tomb-oath'],['oath','tomb-report'],['reportReady','tomb-report'],['complete','tomb-complete']])assert.equal(tombGuidance(s[key]).id,id,key);
 assert.match(tombGuidance(s.entryPartial).detail,/4\/6명 남음/);assert.match(tombGuidance(s.decodeReady).detail,/0\/6명 남음/);
 assert.match(tombGuidance(s.bossDown).detail,/아직 서약문을 회수하지 않았습니다/);assert.equal(tombElderView(s.bossDown).action,null);assert.equal(tombElderView(s.reportReady).action,'report');
 assert.match(tombGuidance(s.oath).detail,/보고 대상은 에다이며 오린이나 브란이 아닙니다/);
 for(const state of [s.sequenceDone,s.wardTaken,s.midpoint])assert.match(tombGuidance(state).detail,/HP·대기 시간·속도·공격·MP·기력 페널티가 없습니다/);
 for(const [key,carried]of [['sequenceDone',false],['wardTaken',true],['midpoint',true],['sealed',false]])assert.equal(tombPresentationHints(s[key]).wardCarried,carried);
});

test('partial town returns retain specific next task and true entrance without fake recovery',()=>{
 const s=stages();
 for(const key of ['accepted','entryPartial','prefix1','midpoint','bossDown']){
  const state=key==='accepted'?s[key]:travel(s[key],'tomb-town-return'),guide=tombGuidance(state);
  assert.equal(guide.id,'tomb-travel');assert.equal(guide.title,'신호 묘실로 이동해 조사하기');assert.match(guide.detail,/마을 북동쪽 신호 묘실 입구/);assert.match(guide.detail,/묘실에서 할 일:/);assert.match(guide.detail,/지역 전환 자체로 자원이나 쿨다운이 회복되지는/);assert.match(guide.detail,/일반 보행 중에는 전투 시간에 따라 재생과 재사용 대기가 정상 진행/);
 }
 assert.match(tombGuidance(travel(s.prefix1,'tomb-town-return')).detail,/순서 1\/3/);
 assert.match(tombGuidance(travel(s.midpoint,'tomb-town-return')).detail,/하부 중계는 완료/);
});

test('optional stairs activate after decode independently and complete route without them',()=>{
 const s=stages(),shown=view(s.decoded,'tomb-shortcut');assert.equal(shown.actions.length,1);assert.match(shown.detail,/무료.*선택 귀환로/);assert.match(shown.detail,/보고의 조건이 아닙니다/);assert.match(shown.detail,/연결하지 않아도 원래 입구로 왕복해 끝까지 완료/);
 let next=act(s.decoded,'tomb-shortcut');assert.equal(next.gold,s.decoded.gold);assert.equal(next.stats.earnedXp,s.decoded.stats.earnedXp);assert.equal(next.world.objectives.tomb_sequence_solved,0);assert.equal(view(next,'tomb-shortcut').completed,true);assert.deepEqual(view(next,'tomb-shortcut').actions,[]);
 next=travel(next,'tomb-town-shortcut');assert.match(tombGuidance(next).detail,/연결한 기록 보관 계단/);next=travel(next,'town-tomb-shortcut');assert.deepEqual(next.vitals,s.decoded.vitals);assert.deepEqual(next.recovery,s.decoded.recovery);
 assert.equal(s.complete.world.objectives.tomb_shortcut_open,0);assert.equal(tombGuidance(s.complete).id,'tomb-complete');assert.equal(view(s.complete,'tomb-shortcut').actions.length,1);
 assert.equal(stages('normal',true).complete.world.objectives.tomb_shortcut_open,1);
});

for(const difficulty of ['hard','serious'])test(`${difficulty} earned L14 report is offered at Eda and shows actual total/reserved/spendable balances`,()=>{
 const state=earnedTombRoute(difficulty,{reportQuest:false}),card=tombElderView(state),request={...tombCommandFields(card),...report(state,{x:450,y:325})};
 assert.equal(state.character.level,14);assert.equal(card.action,'report');assert.equal(card.npcId,'elder');assert.match(card.detail,/레벨14에서도 보고/);assert.match(card.detail,/레벨15·기존 금화120·선택 계단은 필요하지/);
 for(const position of [{x:260,y:325},{x:250,y:470}])assert.equal(reduceRuntime(state,{...request,position}).code,'ELDER_REQUIRED');
 const result=run(state,request),next=result.state,balances=tombGoldView(next);
 assert.equal(next.character.level,15);assert.equal(next.character.tier,'adept');assert.equal(next.gold,state.gold+120);assert.equal(balances.totalGold,next.gold);assert.equal(balances.reservedGold,120);assert.equal(balances.spendableGold,state.gold);
 assert.match(balances.detail,new RegExp(`총 금화 ${next.gold} · 전문 훈련 예약 120 · 쓸 수 있는 금화 ${state.gold}`));assert.match(balances.detail,/총 금화에 포함.*추가 보상이 아닙니다/);
 assert.equal(tombElderView(next).action,null);assert.equal(tombCommandFields(tombElderView(next)),null);assert.match(tombGuidance(next).detail,/보고 보상은 이미.*레벨15.*브란.*전문가로 승급.*봉화 전장.*달인 승급과 최종 결말은 아직 개발 중/);
 assert.match(tombEventCopy(result.events.find(e=>e.type==='expertCommissionGranted')),/보고 금화 안.*120.*자동 승급·기술 습득은 아닙니다/);
});

test('all completed cards remove duplicate claim controls without promising missing Expert functionality',()=>{
 const state=stages('normal',true).complete;
 for(const row of region.objects){
  const shown=tombObjectView(state,row);assert.equal(shown.completed,true);
  assert.equal(shown.actions.length,row.actionKind==='decode'?1:0);
  assert.doesNotMatch(shown.detail,/한 번 받습니다|여섯 명 처치 후|상부 세 명까지 처치한 뒤|먼저.*받으세요/);
 }
 const card=tombElderView(state);assert.equal(card.action,null);assert.equal(card.label,'');assert.match(card.detail,/이미 지급/);assert.match(card.detail,/위임장은 자동 승급이나 기술 습득이 아닙니다/);assert.doesNotMatch(card.detail,/전문 승급 완료|전문 기술 습득 완료|모든 기술/);
});

test('portal labels reflect actual gates, and boss return warns about unpaid oath without blocking travel',()=>{
 const s=stages();
 assert.match(tombPortalLabel(s.before,'town-tomb-entry'),/에다 의뢰 필요/);assert.equal(tombPortalView(s.before,'town-tomb-entry').allowed,false);
 assert.equal(tombPortalView(s.accepted,'town-tomb-entry').allowed,true);assert.match(tombPortalLabel(s.decoded,'tomb-town-shortcut'),/계단 연결 필요/);assert.equal(tombPortalView(s.decoded,'tomb-town-shortcut').allowed,false);
 assert.equal(tombPortalView(s.sealed,'tomb-boss-return').allowed,false);assert.match(tombPortalLabel(s.sealed,'tomb-boss-return'),/수호자 처치 필요/);
 assert.equal(tombPortalView(s.bossDown,'tomb-boss-return').allowed,true);assert.match(tombPortalLabel(s.bossDown,'tomb-boss-return'),/서약문 미회수/);assert.match(tombPortalView(s.bossDown,'tomb-boss-return').detail,/귀환 전에.*따로 회수/);
 const returned=travel(s.bossDown,'tomb-boss-return');assert.equal(tombGuidance(returned).id,'tomb-travel');assert.equal(returned.world.objectives.tomb_oath_taken,0);
 assert.doesNotMatch(tombPortalLabel(s.oath,'tomb-boss-return'),/미회수|처치 필요/);assert.equal(tombPortalView(s.oath,'not-a-portal'),null);
 const fake={id:'tomb-town-shortcut',gate:null,name:'위조'};assert.equal(tombPortalView(s.decoded,fake).allowed,false);assert.doesNotMatch(tombPortalLabel(s.decoded,fake),/위조/);
});

test('death/retry retains journal and ward step, hides interactions and never invents completion',()=>{
 const s=stages().midpoint,dead=run(s,{type:'settleCombat',defeated:[],...report(s),vitals:{...s.vitals,hp:0}}).state;
 assert.equal(tombClueView(dead).complete,true);assert.equal(tombPresentationHints(dead).wardCarried,true);assert.equal(tombGuidance(dead).id,'tomb-ward-seal');assert.match(tombGuidance(dead).detail,/먼저 재시도/);
 assert.equal(tombElderView(dead).action,null);for(const row of region.objects)assert.equal(tombObjectView(dead,row).actions.length,0);
 assert.equal(view(dead,'tomb-ward-final').completed,false);assert.equal(tombPortalView(dead,'tomb-town-return').allowed,false);
 const retried=travel(run(reload(dead),{type:'retry'}).state,'town-tomb-entry');assert.equal(tombGuidance(retried).id,'tomb-ward-seal');assert.equal(tombPresentationHints(retried).wardCarried,true);assert.deepEqual(retried.world.defeated[TOMB_REGION],s.world.defeated[TOMB_REGION]);
});

test('direction/key/shape helpers track production projection, remapped controls and content roles',()=>{
 const state=stages().entered;
 for(const [name,vector,x,y,label]of [['북쪽',{x:0,y:-1},1,-1,'오른쪽 위'],['동쪽',{x:1,y:0},1,1,'오른쪽 아래'],['남쪽',{x:0,y:1},-1,1,'왼쪽 아래'],['서쪽',{x:-1,y:0},-1,-1,'왼쪽 위']]){
  const projected=projectWorld(vector.x,vector.y);assert.equal(Math.sign(projected.x),x);assert.equal(Math.sign(projected.y),y);
  assert.match(tombGuidance(state).detail,new RegExp(`${name}은 (화면 )?${label}`));for(const row of region.objects)assert.match(tombObjectView(state,row).detail,new RegExp(`${name}은 (화면 )?${label}`));
 }
 const hints=tombPresentationHints(state);assert.equal(hints.interactLabel,'F');assert.match(hints.directions,/이동 키는 화면 기준/);assert.deepEqual(hints.roleShapes,Object.fromEntries(Object.entries(TOMB_FOES).map(([id,f])=>[id,f.roleGlyph])));assert.equal(hints.ward.collides,false);
 const binding=rebindControl(state.options.controls,'interact',0,'KeyG');assert.equal(binding.ok,true);const remapped=run(state,{type:'setControls',controls:binding.controls}).state;
 assert.equal(tombPresentationHints(remapped).interactLabel,'G');assert.match(tombGuidance(remapped).detail,/상호작용\(G\)/);assert.doesNotMatch(tombGuidance(remapped).detail,/상호작용\(F\)/);
 const legacy=copy(state);delete legacy.options.controls;const before=copy(legacy);assert.equal(tombPresentationHints(legacy).interactLabel,'E');assert.deepEqual(legacy,before);
});

test('views are immutable read-only data; malformed gold is not shown as a spendable balance',()=>{
 for(const state of [createState(),...Object.values(stages()),stages('hard').complete]){
  const before=copy(state);freeze(state);tombGuidance(state);tombElderView(state);tombClueView(state);tombGoldView(state);tombPresentationHints(state);
  for(const row of region.objects){tombObjectView(state,row);assert.ok(Object.isFrozen(row));}for(const p of region.portals){tombPortalLabel(state,p);tombPortalView(state,p);}
  assert.deepEqual(state,before);assert.deepEqual(reload(state),before);
 }
 // Invalid-wallet fixtures probe failure copy only.
 for(const reservedTrainingGold of [{expert:-1},{expert:1e9},{expert:120,other:0}]){
  const invalid={...stages().complete,reservedTrainingGold},view=tombGoldView(invalid);assert.equal(view.ok,false);assert.equal(view.spendableGold,undefined);assert.match(view.detail,/확인할 수 없습니다/);
 }
 assert.equal(tombEventCopy({type:'unknown'}),'');
});
