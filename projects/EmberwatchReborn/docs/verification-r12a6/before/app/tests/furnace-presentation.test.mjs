import test from 'node:test';
import assert from 'node:assert/strict';
import {furnaceObjectView,furnaceGuidance,furnaceBlacksmithView} from '../src/furnace-presentation.js';
import {FURNACE_REGION,FURNACE_REGIONS,FURNACE_GROUPS,FURNACE_MODES,FURNACE_REWARDS} from '../src/furnace-content.js';
import {SIGNAL_REGIONS,SIGNAL_GROUPS,SIGNAL_ROUTES} from '../src/signal-content.js';
import {signalBlacksmithView} from '../src/signal-presentation.js';
import {createState,reduceRuntime} from '../src/state.js';
import {createStore} from '../src/save.js';
import {emptyRecovery} from '../src/recovery.js';
import {projectWorld} from '../src/visual.js';
import {rebindControl} from '../src/controls.js';
import {earnedPassRoute} from './support/earned-pass-route.mjs';
import {report,run,travel,settle} from './support/earned-route.mjs';

// Scripted coordinates and kill reports through genuine production reducers.
// No injected XP, tier, items or objective progress, and no source transforms.
// These pure-view/handler checks are NOT browser pixels or ordinary-input play.
const copy=value=>structuredClone(value);
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const region=FURNACE_REGIONS[FURNACE_REGION],smith={x:250,y:470};
const object=id=>region.objects.find(row=>row.id===id);
const quest=(state,type)=>({type,...report(state,smith)});
const command=(state,id,choice)=>({type:'interactFurnace',objectId:id,...report(state,object(id)),...(choice===undefined?{}:{choice})});
const interact=(state,id,choice)=>run(state,command(state,id,choice)).state;
const cache=new Map();
function predecessor(difficulty='normal',route='west'){
 const key=JSON.stringify([difficulty,route]);if(cache.has(key))return copy(cache.get(key));
 let state=earnedPassRoute(difficulty);state=run(state,quest(state,'acceptSignalQuest')).state;state=travel(state,'town-signal-entry');
 const point=id=>SIGNAL_REGIONS.signal_basin.objects.find(row=>row.id===id);
 const action=id=>{state=run(state,{type:'interactSignal',objectId:id,...report(state,point(id))}).state;};
 state=settle(state,SIGNAL_GROUPS.entry);action('signal-code');
 for(const node of SIGNAL_ROUTES[route].order)action('signal-route-'+node);
 state=settle(state,SIGNAL_GROUPS.yard,point('signal-transmitter'));action('signal-transmitter');
 state=settle(state,SIGNAL_GROUPS.receiver,point('signal-receiver'));action('signal-receiver');
 state=travel(state,'signal-town-return');state=run(state,quest(state,'reportSignalQuest')).state;
 cache.set(key,copy(state));return state;
}
const routes=new Map();
function stages(mode='cover',difficulty='normal',shortcut=false){
 const key=JSON.stringify([mode,difficulty,shortcut]);if(routes.has(key))return copy(routes.get(key));
 const out={before:predecessor(difficulty)};
 let s=run(out.before,quest(out.before,'acceptFurnaceQuest')).state;out.accepted=s;
 s=travel(s,'town-furnace-entry');out.entered=s;
 for(const group of ['cooling','exhaust','ignition']){
  s=settle(s,FURNACE_GROUPS[group].slice(0,2),object('furnace-'+group));out[group+'Partial']=s;
  s=settle(s,FURNACE_GROUPS[group].slice(2),object('furnace-'+group));out[group+'Ready']=s;
  s=interact(s,'furnace-'+group,group==='cooling'?mode:undefined);out[group+'Done']=s;
  if(group==='cooling'&&shortcut){s=interact(s,'furnace-shortcut');out.shortcut=s;}
 }
 s=interact(s,'furnace-lens');out.lens=s;
 s=travel(s,shortcut?'furnace-town-shortcut':'furnace-town-return');out.reportReady=s;
 s=run(s,quest(s,'reportFurnaceQuest')).state;out.complete=s;
 routes.set(key,copy(out));return out;
}
const view=(state,id)=>furnaceObjectView(state,object(id));

test('F guidance starts only after earned S report, retained cipher and actual Adept prerequisites',()=>{
 for(const state of [createState(),earnedPassRoute()]){
  assert.equal(furnaceGuidance(state),null);assert.equal(furnaceBlacksmithView(state),null);
 }
 for(const direction of ['west','east']){
  const state=predecessor('normal',direction);
  assert.equal(furnaceGuidance(state).id,'furnace-accept');
  assert.equal(furnaceBlacksmithView(state).action,'accept');
  assert.match(furnaceBlacksmithView(state).detail,/무료.*추가 레벨.*요구하지/);
 }
 // Explicit invalid-predecessor fixtures probe views; not earned progress.
 const valid=predecessor();
 for(const edit of [s=>{s.character.tier='master';},s=>{s.world.objectives.adept_commission=0;},s=>{s.world.objectives.signal_reported=0;},s=>{s.inventory.tools=s.inventory.tools.filter(id=>id!=='signal_cipher');},...['r4:report','r5:promote:adept','r6:q:report','r7:p:report','r8:s:report'].map(id=>s=>{s.world.claimedRewards=s.world.claimedRewards.filter(row=>row!==id);})]){
  const state=copy(valid);edit(state);assert.equal(furnaceGuidance(state),null);assert.equal(furnaceBlacksmithView(state),null);
 }
});

test('all real Furnace objects retain labels and supported actions before completion',()=>{
 const state=stages().entered;
 for(const obj of region.objects){
  const shown=furnaceObjectView(state,obj);assert.ok(shown.name&&shown.detail);assert.ok(shown.actions.length);
  for(const action of shown.actions){assert.ok(action.label);assert.deepEqual(Object.keys(action).sort(),obj.actionKind==='cooling'?['choice','label']:['label']);}
 }
 assert.deepEqual(furnaceObjectView(state,{name:'알 수 없는 장치',actionKind:'future'}),{name:'알 수 없는 장치',detail:'사용할 수 없는 대상입니다.',actions:[]});
});

test('cooling shows two explicit irreversible equal-reward choices, both flanks and different tactics',()=>{
 const shown=view(stages().coolingReady,'furnace-cooling');
 assert.deepEqual(shown.actions,[{label:FURNACE_MODES.cover.name,choice:'cover'},{label:FURNACE_MODES.channel.name,choice:'channel'}]);
 assert.match(shown.detail,/두 선택 모두 양쪽 우회로.*보상은 같습니다/);
 assert.match(shown.detail,/선택은 되돌릴 수 없습니다/);
 assert.match(shown.detail,/적의 탄.*내 망치·돌진/);assert.match(shown.detail,/직선 진입·탈출로.*교차 사격/);
 assert.match(shown.detail,new RegExp(`경험치${FURNACE_REWARDS['r9:f:cooling'].xp}·금화${FURNACE_REWARDS['r9:f:cooling'].gold}.*한 번`));
 assert.match(shown.detail,/비용·재료 소모·대기 시간은 없습니다/);
});

for(const mode of ['cover','channel'])test(`presented ${mode} choice dispatches through production once and remains fixed after reload`,()=>{
 const state=stages().coolingReady,action=view(state,'furnace-cooling').actions.find(row=>row.choice===mode);
 const next=run(state,command(state,'furnace-cooling',action.choice)).state;
 assert.equal(next.world.objectives.furnace_mode,FURNACE_MODES[mode].value);
 assert.equal(next.world.objectives.furnace_center_open,Number(mode==='channel'));
 assert.equal(next.stats.earnedXp-state.stats.earnedXp,FURNACE_REWARDS['r9:f:cooling'].xp);
 assert.equal(next.gold-state.gold,FURNACE_REWARDS['r9:f:cooling'].gold);
 const memory=new Map(),store=createStore({getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,value)},{profile:'qa-furnace-view-choice'});
 assert.equal(store.save(next,{expectedRevision:0}).ok,true);const loaded=store.load();assert.equal(loaded.ok,true);
 const shown=view(loaded.state,'furnace-cooling');assert.deepEqual(shown.actions,[]);assert.match(shown.detail,/양쪽 우회로.*모두 열/);
 assert.match(shown.name,new RegExp(FURNACE_MODES[mode].name));assert.match(shown.detail,/선택은 되돌릴 수 없습니다/);
 assert.match(shown.detail,/이미 받았으며 추가 보상은 없습니다/);assert.doesNotMatch(shown.detail,/한 번 받습니다/);
 assert.match(shown.detail,mode==='cover'?/중앙 엄폐판은 남습니다.*내 망치.*돌진도 통과할 수 없습니다/:/중앙 통로가 모두 열렸습니다.*직선 경로.*조준선/);
 const opposite=mode==='cover'?'channel':'cover',before=copy(loaded.state),rejected=reduceRuntime(freeze(loaded.state),freeze(command(loaded.state,'furnace-cooling',opposite)));
 assert.equal(rejected.code,'ALREADY_CLAIMED');assert.deepEqual(loaded.state,before);
});

test('live remaining counts come from permanent defeats at partial, zero and later stages',()=>{
 const s=stages();
 for(const [state,id,group,left]of [[s.entered,'furnace-cooling','cooling',5],[s.coolingPartial,'furnace-cooling','cooling',3],[s.coolingReady,'furnace-cooling','cooling',0],[s.coolingDone,'furnace-exhaust','exhaust',6],[s.exhaustPartial,'furnace-exhaust','exhaust',4],[s.exhaustReady,'furnace-exhaust','exhaust',0],[s.exhaustDone,'furnace-ignition','ignition',6],[s.ignitionPartial,'furnace-ignition','ignition',4],[s.ignitionReady,'furnace-ignition','ignition',0]]){
  assert.equal(furnaceGuidance(state).id,id);
  const count=new RegExp(`${left}/${FURNACE_GROUPS[group].length}명 남음`);
  assert.match(furnaceGuidance(state).detail,count);assert.match(view(state,id).detail,count);
  if(left===0){assert.match(furnaceGuidance(state).detail,/처치를 마쳤으니/);assert.doesNotMatch(furnaceGuidance(state).detail,/적 0명을 처치/);}
 }
 assert.match(view(s.entered,'furnace-ignition').detail,/전체 적 17\/17명/);
 assert.match(view(s.ignitionPartial,'furnace-ignition').detail,/전체 적 4\/17명/);
 assert.match(view(s.ignitionReady,'furnace-ignition').detail,/전체 적 0\/17명/);
});

test('locked views explain actual cooling, exhaust and ignition preconditions without hiding the lift',()=>{
 const s=stages();
 assert.match(view(s.entered,'furnace-cooling').detail,/다섯 명을 모두 처치/);
 assert.equal(reduceRuntime(s.entered,command(s.entered,'furnace-cooling','cover')).code,'COOLING_GUARDS_ALIVE');
 assert.match(view(s.entered,'furnace-exhaust').detail,/먼저 냉각.*선택을 완료/);
 assert.match(view(s.coolingDone,'furnace-exhaust').detail,/여섯 명을 모두 처치/);
 assert.equal(reduceRuntime(s.coolingDone,command(s.coolingDone,'furnace-exhaust')).code,'EXHAUST_GUARDS_ALIVE');
 assert.match(view(s.exhaustDone,'furnace-ignition').detail,/냉각 선택.*배기 개방.*열일곱 명 모두 처치/);
 assert.equal(reduceRuntime(s.exhaustDone,command(s.exhaustDone,'furnace-ignition')).code,'IGNITION_GUARDS_ALIVE');
 assert.match(view(s.exhaustDone,'furnace-lens').detail,/먼저.*점화 장치를 작동/);
 assert.equal(reduceRuntime(s.exhaustDone,command(s.exhaustDone,'furnace-lens')).code,'IGNITION_REQUIRED');
 assert.equal(view(s.entered,'furnace-shortcut').actions.length,1);assert.match(view(s.entered,'furnace-shortcut').detail,/냉각 후/);
 assert.equal(reduceRuntime(s.entered,command(s.entered,'furnace-shortcut')).code,'COOLING_REQUIRED');
});

test('acceptance, partial return and ignited-without-lens town guidance point to the real Furnace entrance',()=>{
 const s=stages();
 for(const state of [s.accepted,travel(s.coolingPartial,'furnace-town-return'),travel(s.exhaustPartial,'furnace-town-return'),travel(s.ignitionDone,'furnace-town-return')]){
  assert.equal(furnaceGuidance(state).id,'furnace-travel');assert.match(furnaceGuidance(state).detail,/마을 남쪽.*잿불 용광로로 입구/);
  assert.match(furnaceGuidance(state).detail,/용광로에서 이어 할 일:/);assert.match(furnaceGuidance(state).detail,/이동은 자원과 쿨다운을 회복하지/);
  assert.equal(furnaceBlacksmithView(state).action,null);
 }
 assert.match(furnaceGuidance(travel(s.coolingPartial,'furnace-town-return')).detail,/3\/5명 남음/);
 assert.match(furnaceGuidance(travel(s.exhaustPartial,'furnace-town-return')).detail,/4\/6명 남음/);
 const awaitingLens=travel(s.ignitionDone,'furnace-town-return');
 assert.match(furnaceGuidance(awaitingLens).detail,/아직 렌즈를 회수하지 않았습니다/);
 assert.match(furnaceBlacksmithView(awaitingLens).detail,/렌즈를 가져와야.*오린에게 보고/);
 const elsewhere=travel(s.accepted,'road');assert.equal(furnaceGuidance(elsewhere).id,'furnace-travel');assert.match(furnaceGuidance(elsewhere).detail,/현재 지역 출구로 마을에 돌아간 뒤/);
});

test('directions match production isometric projection and interaction labels follow real rebinding',()=>{
 const s=stages().entered;
 const vectors=[['북쪽',{x:0,y:-1},1,-1,'오른쪽 위'],['동쪽',{x:1,y:0},1,1,'오른쪽 아래'],['남쪽',{x:0,y:1},-1,1,'왼쪽 아래'],['서쪽',{x:-1,y:0},-1,-1,'왼쪽 위']];
 for(const [name,vector,x,y,label]of vectors){
  const projected=projectWorld(vector.x,vector.y);assert.equal(Math.sign(projected.x),x);assert.equal(Math.sign(projected.y),y);
  assert.match(furnaceGuidance(s).detail,new RegExp(`${name}은 (화면 )?${label}`));
  for(const obj of region.objects)assert.match(furnaceObjectView(s,obj).detail,new RegExp(`${name}은 (화면 )?${label}`));
 }
 assert.match(furnaceGuidance(s).detail,/이동 키는 화면 기준/);assert.match(furnaceGuidance(s).detail,/상호작용\(F\)/);
 const binding=rebindControl(s.options.controls,'interact',0,'KeyG');assert.equal(binding.ok,true);
 const changed=run(s,{type:'setControls',controls:binding.controls}).state;
 assert.match(furnaceGuidance(changed).detail,/상호작용\(G\)/);assert.doesNotMatch(furnaceGuidance(changed).detail,/상호작용\(F\)/);
 const legacy=copy(s);delete legacy.options.controls;const before=copy(legacy);
 assert.match(furnaceGuidance(legacy).detail,/상호작용\(E\)/);assert.deepEqual(legacy,before);
});

test('last kill, ignition, lens pickup and Orin report remain four distinct visible states',()=>{
 const s=stages();
 assert.equal(furnaceGuidance(s.ignitionReady).id,'furnace-ignition');assert.equal(furnaceBlacksmithView(s.ignitionReady).action,null);
 assert.equal(furnaceGuidance(s.ignitionDone).id,'furnace-lens');assert.equal(furnaceBlacksmithView(s.ignitionDone).action,null);
 assert.match(view(s.ignitionDone,'furnace-ignition').detail,/렌즈는 자동 회수되지 않습니다.*따로 상호작용/);
 assert.match(view(s.ignitionDone,'furnace-lens').detail,/직접 회수.*비소모.*경험치·금화 보상은 없습니다/);
 assert.equal(view(s.ignitionDone,'furnace-ignition').actions.length,0);assert.equal(view(s.ignitionDone,'furnace-lens').actions.length,1);
 assert.equal(furnaceGuidance(s.lens).id,'furnace-report');assert.equal(furnaceBlacksmithView(s.reportReady).action,'report');
 assert.equal(view(s.lens,'furnace-lens').actions.length,0);assert.match(view(s.lens,'furnace-lens').detail,/대장장이 오린에게 보고/);
 assert.equal(s.lens.stats.earnedXp,s.ignitionDone.stats.earnedXp);assert.equal(s.lens.gold,s.ignitionDone.gold);
 assert.equal(furnaceGuidance(s.complete).id,'furnace-complete');assert.equal(furnaceBlacksmithView(s.complete).action,null);
});

for(const mode of ['cover','channel'])test(`${mode} optional lift is available after cooling and describes actual resource/CD preserving round trips`,()=>{
 const state=stages(mode).coolingDone,shown=view(state,'furnace-shortcut');
 assert.match(shown.detail,/무료.*선택 귀환로/);assert.match(shown.detail,/배기·점화·렌즈 회수·보고의 조건이 아닙니다/);
 assert.match(shown.detail,/현재 HP·MP·기력과 남은 쿨다운을 유지.*별도 보상이나 회복이 없습니다/);
 assert.match(shown.detail,/연결하지 않아도 원래 입구로 왕복/);
 const request={...command(state,'furnace-shortcut'),vitals:{hp:12,mana:3,stamina:5},recovery:{...emptyRecovery(),cooldowns:{righteous_hammer:2},lock:.1,manaDelay:2,potionCooldown:3}};
 let next=run(state,request).state;const connected=view(next,'furnace-shortcut');assert.deepEqual(connected.actions,[]);
 assert.match(connected.detail,/연결 장치 북쪽.*귀환문/);assert.match(connected.detail,/현재 HP·MP·기력과 남은 쿨다운을 유지/);
 assert.equal(next.gold,state.gold);assert.equal(next.stats.earnedXp,state.stats.earnedXp);assert.equal(next.world.objectives.furnace_exhausted,0);
 next=travel(next,'furnace-town-shortcut');assert.match(furnaceGuidance(next).detail,/용광로 화물 승강기로 돌아가도/);
 next=travel(next,'town-furnace-shortcut');assert.deepEqual(next.vitals,request.vitals);assert.deepEqual(next.recovery,request.recovery);
 assert.equal(furnaceGuidance(next).id,'furnace-exhaust');assert.equal(next.world.objectives.furnace_mode,FURNACE_MODES[mode].value);
});

for(const difficulty of ['normal','hard'])test(`${difficulty} earned sub-L15 report is offered without optional lift and pays only the displayed award`,()=>{
 const s=stages('cover',difficulty),shown=furnaceBlacksmithView(s.reportReady);
 assert.ok(s.reportReady.character.level<15);assert.equal(s.reportReady.world.objectives.furnace_shortcut_open,0);assert.equal(shown.action,'report');
 assert.match(shown.detail,/레벨15·추가 승급·비용·선택 화물 승강기는 필요하지 않습니다/);
 assert.match(furnaceGuidance(s.reportReady).detail,/대장장이 오린 가까이에서 보고/);
 assert.match(shown.detail,/경험치90·금화60.*한 번/);
 assert.equal(s.complete.gold-s.reportReady.gold,FURNACE_REWARDS['r9:f:report'].gold);
 assert.equal(s.complete.stats.earnedXp-s.reportReady.stats.earnedXp,FURNACE_REWARDS['r9:f:report'].xp);
 assert.deepEqual(s.complete.vitals,s.reportReady.vitals);assert.deepEqual(s.complete.recovery,s.reportReady.recovery);
});

test('completed objects have no duplicate claim controls or new reward promises, while skipped lift stays optional',()=>{
 const noLift=stages().complete,withLift=stages('channel','normal',true).complete;
 for(const obj of region.objects){
  const shown=furnaceObjectView(withLift,obj);assert.deepEqual(shown.actions,[]);
  assert.doesNotMatch(shown.detail,/한 번 받습니다|모두 처치한 뒤|먼저.*작동하세요/);
 }
 assert.equal(view(noLift,'furnace-shortcut').actions.length,1);assert.match(view(noLift,'furnace-shortcut').detail,/선택 귀환로/);
 assert.equal(furnaceGuidance(noLift).id,'furnace-complete');assert.equal(furnaceGuidance(withLift).id,'furnace-complete');
 for(const state of [noLift,withLift]){
  const guide=furnaceGuidance(state),smith=furnaceBlacksmithView(state);
  assert.equal(smith.action,null);assert.equal(smith.label,'');
  for(const detail of [guide.detail,smith.detail]){assert.match(detail,/보고 보상.*이미/);assert.match(detail,/신호 묘실\(T\).*촌장 에다.*묘실 보고 후 브란.*전문가 승급.*봉화 전장.*달인 승급과 전체 캠페인 결말은 아직 구현되지 않았습니다/);assert.doesNotMatch(detail,/전문 승급 가능|달인 승급 가능|묘실로 이동|위임장을 받/);}
 }
});

test('pre-F and every real staged view are immutable and never rewrite saves or initialize F defaults',()=>{
 const states=[createState(),...Object.values(stages()),...Object.values(stages('channel','hard',true))];
 for(const state of states){
  const memory=new Map(),store=createStore({getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,value)},{profile:'qa-furnace-view-purity'});
  assert.equal(store.save(state,{expectedRevision:0}).ok,true);const before=copy(state),bytes=new Map(memory);freeze(state);
  for(let i=0;i<3;i++){
   furnaceGuidance(state);furnaceBlacksmithView(state);
   for(const obj of region.objects){const prior=copy(obj);furnaceObjectView(state,obj);assert.deepEqual(obj,prior);}
  }
  assert.deepEqual(state,before);assert.deepEqual(memory,bytes);
  const loaded=store.load();assert.equal(loaded.ok,true);assert.deepEqual(loaded.state,before);
 }
 const before=predecessor();furnaceGuidance(before);furnaceBlacksmithView(before);
 assert.equal(Object.keys(before.world.objectives).some(key=>key.startsWith('furnace_')),false);
});

// Real earned prerequisite snapshots; do not point back at a completed quest.
test('S report view follows actual F acceptance and completion without changing progress',()=>{
 const path=stages();
 for(const [key,expected] of [['before','다음 용광로 수리 의뢰'],['accepted','진행 중인 용광로 수리 기록'],['complete','용광로 수리 보고도 마쳤습니다']]){
  const state=freeze(copy(path[key])),before=copy(state),v=signalBlacksmithView(state);
  assert.ok(v.detail.includes(expected));assert.equal(v.action,null);assert.deepEqual(state,before);
  if(key==='complete')assert.doesNotMatch(v.detail,/다음 용광로 수리 의뢰/);
 }
});
