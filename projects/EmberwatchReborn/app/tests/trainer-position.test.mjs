import {createMainInputFixture,mainInputSource} from './support/main-input-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {earnedTombRoute} from './support/earned-tomb-route.mjs';
import {report} from './support/earned-route.mjs';
import {reduceRuntime} from '../src/state.js';
import {createStore} from '../src/save.js';

// Execute unmodified production handlers/controller/store. The DOM below is a
// deterministic geometry/focus probe, not a browser or native screen assertion.
const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8'),imports={};
for(const row of source.matchAll(/^import\s*\{([^}]+)\}\s*from\s*'([^']+)'/gm)){
 const module=await import(new URL('../src/'+row[2].replace('./',''),import.meta.url));
 for(const name of row[1].split(',').map(s=>s.trim()))imports[name]=module[name];
}
function fn(name){
 const match=new RegExp(`(?:async )?function ${name}\\(`).exec(source);assert.ok(match,name);
 for(let end=source.indexOf('}',match.index);end>=0;end=source.indexOf('}',end+1)){
  const text=source.slice(match.index,end+1);
  try{new vm.Script('('+text+')');return text;}catch(error){if(!(error instanceof SyntaxError))throw error;}
 }
 throw Error(name);
}
const cut=(start,end)=>source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start)));
const next=()=>new Promise(resolve=>setImmediate(resolve));
let baseline;
function fixture(){
 if(!baseline){
  let s=earnedTombRoute('normal',{full:true});
  const r=reduceRuntime(s,{type:'promoteExpert',...report(s,{x:260,y:325}),expectedRevision:1,expectedGoldCost:120},{revision:1});
  assert.equal(r.ok,true);baseline=r.state;
 }
 return structuredClone(baseline);
}
function domProbe(){
 const dh={},wh={},focuses=[],renders=[];
 const document={hidden:false,visibilityState:'visible',hasFocus:()=>document.focused,focused:true,activeElement:null,addEventListener:(name,handler)=>dh[name]=handler};
 const make=(tagName,extra={})=>({tagName,disabled:false,...extra,focus(options){assert.equal(this.disabled,false,'disabled button must not receive focus');document.activeElement=this;focuses.push({node:this,options});dh.focusin?.({target:this});},closest(selector){if(selector==='[data-action]')return this.dataset?.action?this:null;if(selector==='.panel')return this.pane??null;if(selector==='.skill')return this.card??null;if(selector==='details')return this.group??null;return null;}});
 const canvas=make('CANVAS'),body=make('BODY');document.activeElement=body;
 let pane=null,html='';
 const modal={hidden:true,presentationEpoch:0,querySelector(selector){return selector==='.panel'?pane:pane?.querySelector(selector)??null;},get innerHTML(){return html;},set innerHTML(value){
  if(pane?.contains(document.activeElement))document.activeElement=body;
  html=value;pane=null;if(!value)return;
  pane={scrollTop:0,groups:[],buttons:[],cards:[],title:/<h2>(.*?)<\/h2>/.exec(value)?.[1],getBoundingClientRect:()=>({top:50}),contains(node){return node?.pane===this;},querySelectorAll:selector=>selector==='details'?pane.groups:[],querySelector(selector){
   if(selector==='button:not([disabled]),input,select,textarea')return this.buttons.find(node=>!node.disabled)??null;
   const action=/data-action="([^"]+)"/.exec(selector)?.[1];return this.buttons.find(node=>node.dataset.action===action)??null;
  }};
  const current=pane;
  for(const match of value.matchAll(/<details ([^>]*)>([\s\S]*?)<\/details>/g))current.groups.push({open:/\bopen\b/.test(match[1]),start:match.index,end:match.index+match[0].length,pane:current});
  for(const match of value.matchAll(/<article class="skill">([\s\S]*?)<\/article>/g)){
   const card=make('ARTICLE',{pane:current,group:current.groups.find(group=>match.index>=group.start&&match.index<group.end),start:match.index,end:match.index+match[0].length,tabIndex:null,height:100+Math.ceil(match[1].length/40)});card.card=card;
   card.getBoundingClientRect=()=>({top:card.group&&!card.group.open?0:50+200+current.cards.slice(0,current.cards.indexOf(card)).filter(prior=>!prior.group||prior.group.open).reduce((total,prior)=>total+prior.height,0)-current.scrollTop});
   current.cards.push(card);
  }
  for(const match of value.matchAll(/<button data-action="([^"]+)"([^>]*)>([\s\S]*?)<\/button>/g)){
   const card=current.cards.find(card=>match.index>=card.start&&match.index<card.end);
   current.buttons.push(make('BUTTON',{pane:current,card,group:card?.group,dataset:{action:match[1]},disabled:/\bdisabled\b/.test(match[2]),textContent:match[3]}));
  }
  renders.push(current);
 }};
 return {document,dh,wh,canvas,modal,focuses,renders,make,get pane(){return pane;}};
}
async function ui({skills=[]}={}){
 let state=fixture();
 for(const skillId of skills){const r=reduceRuntime(state,{type:'purchaseSkill',skillId,position:{x:260,y:325}});assert.equal(r.ok,true,skillId);state=r.state;}
 const data=new Map(),writes=[],storage={getItem:key=>data.get(key)??null,setItem:(key,value)=>{data.set(key,value);writes.push(key);}},store=createStore(storage,{profile:'qa-trainer-position'});
 assert.equal(store.save(state,{expectedRevision:0}).ok,true);
 let delays=[],pending=null,saveCount=0;
 const controller=imports.createController({load:store.load,save(state,options){saveCount++;if(delays[0]===saveCount){delays.shift();return new Promise(resolve=>pending={resolve,save:()=>store.save(state,options)});}return store.save(state,options);}});
 assert.equal((await controller.load()).ok,true);
 const dom=domProbe(),router=imports.createInputRouter(),expertCapture=imports.createExpertInputCapture(),expertSafety=imports.createActionSafety({capture:expertCapture,cancel:imports.cancelBattleAction}),gate=imports.createRuntimeGate(),toasts=[];
 const elements=new Map(),$=id=>{if(!elements.has(id))elements.set(id,{textContent:'',innerHTML:'',classList:{add(){},remove(){}}});return elements.get(id);};
 const env={...createMainInputFixture(),...imports,controller,state:controller.snapshot(),battle:imports.createBattle(state),profile:'qa-trainer-position',candidate:false,saveNamespace:'qa-r11',modal:dom.modal,document:dom.document,window:{addEventListener:(name,handler)=>dom.wh[name]=handler},canvas:dom.canvas,gate,router,expertCapture,expertSafety,
  deferredImmediate:imports.createImmediateInput(),paused:true,busy:false,captureBinding:null,suppressNextClick:false,combatSaveElapsed:0,focusEvents:{blurAt:'none',visibilityAt:'none'},audio:{pause(){},play(){}},toast:text=>toasts.push(text),updateHud(){},$,Date:class {toISOString(){return 'fixture-fixed-clock';}},performance:{now:()=>100},last:0};
 const names=['panel','closePanel','showDeath','showTitle','showNpc','showTraining','purchaseTrainingSkill','checkpointPanel','effectText','clearInput','flushActionSafety','syncVitals','report','dispatch','immediateAction'];
 const program=[mainInputSource,cut('const config=','let controller='),cut('const esc=','function clearInput('),cut('const tierLabel=','const focusEvents='),...names.filter(name=>name!=='purchaseTrainingSkill'||source.includes('function purchaseTrainingSkill(')).map(fn),cut("document.addEventListener('click',","document.addEventListener('change',"),cut("window.addEventListener('keydown',","window.addEventListener('mousedown',"),`return {showTraining,showTitle,closePanel,panel,dispatch,report,get state(){return state},get battle(){return battle},get busy(){return busy},get paused(){return paused},get controller(){return controller},get expertSafety(){return expertSafety},get captureBinding(){return captureBinding},get deferred(){return deferredImmediate},get focusEvents(){return focusEvents},change(kind){if(kind==='controller')controller={};if(kind==='profile')profile='qa-other';if(kind==='battle')battle=createBattle(state);if(kind==='life')battle.stateLife++; if(kind==='region')battle.region='old_road';if(kind==='dead'){state={...state,world:{...state.world,lifeDown:true}};showDeath();}if(kind==='hp')battle.p.hp=0;},setCaptureBinding(value){captureBinding=value}};`].join('\n');
 const app=vm.compileFunction(program,Object.keys(env))(...Object.values(env));
 await app.showTraining();
 const h={...dom,app,store,data,writes,router,expertCapture,expertSafety:app.expertSafety,gate,toasts,get pane(){return dom.pane;},button(action){return dom.pane.querySelector(`[data-action="${action}"]`);},focus(action){h.button(action).focus({preventScroll:true});},click(action,{target=h.button(action),detail=1}={}){assert.ok(target,action);return dom.dh.click({target,detail,preventDefault(){},stopPropagation(){}});},delay(...offsets){delays=offsets.map(n=>saveCount+n);},async release({fail=null}={}){assert.ok(pending,'save reached explicit delay');const task=pending;pending=null;task.resolve(fail??task.save());await next();},get waiting(){return !!pending;},get saveCount(){return saveCount;},async key(code,{repeat=false}={}){const event={code,repeat,target:dom.document.activeElement,prevented:false,preventDefault(){this.prevented=true;},stopImmediatePropagation(){}};dom.wh.keydown(event);await next();return event;}};
 return h;
}
const offset=h=>{const card=h.button('skill:inner_flame').card;return card.getBoundingClientRect().top-h.pane.getBoundingClientRect().top;};
function prepare(h,action='skill:inner_flame'){
 h.pane.groups[0].open=true;h.pane.groups[1].open=false;h.pane.groups[2].open=true;
 h.pane.scrollTop=920;h.focus(action);return {pane:h.pane,button:h.button(action),offset:h.button(action).card.getBoundingClientRect().top-h.pane.getBoundingClientRect().top,opened:h.pane.groups.map(g=>g.open)};
}
test('successful real purchase restores final trainer card, disclosures and keyboard focus after both saves',async()=>{
 const h=await ui(),before=prepare(h),state=structuredClone(h.app.state),revision=h.app.controller.revision();
 h.delay(1,2);const task=h.click('skill:inner_flame');await next();assert.equal(h.pane,before.pane);assert.equal(h.app.busy,true);
 await h.release();assert.equal(h.pane.title,'훈련 기록 확인 중');assert.equal(h.pane.scrollTop,0);assert.equal(h.waiting,true);
 await h.release();await task;assert.equal(h.pane.title,'전사의 훈련');assert.notEqual(h.pane,before.pane);assert.equal(offset(h),before.offset);assert.deepEqual(h.pane.groups.map(g=>g.open),before.opened);assert.equal(h.document.activeElement,h.button('skill:inner_flame'));assert.deepEqual(h.focuses.at(-1).options,{preventScroll:true});
 assert.equal(h.app.state.character.skills.inner_flame,1);assert.equal(h.app.state.character.skillPoints,state.character.skillPoints-imports.previewSkill(state.character,'inner_flame',state).cost);assert.equal(h.app.controller.revision(),revision+2);assert.deepEqual(h.store.load().state,h.app.state);assert.deepEqual(h.app.report().vitals,state.vitals);assert.equal(h.app.state.gold,state.gold);assert.equal(h.app.state.character.xp,state.character.xp);
});
test('repeated enabled keyboard purchases preserve card position through changed text heights and charge each rank once',async()=>{
 const h=await ui();const before=prepare(h),gold=h.app.state.gold;
 for(let rank=1;rank<=3;rank++){const points=h.app.state.character.skillPoints,cost=imports.previewSkill(h.app.state.character,'inner_flame',h.app.state).cost;await h.click('skill:inner_flame',{detail:0});assert.equal(h.app.state.character.skills.inner_flame,rank);assert.equal(h.app.state.character.skillPoints,points-cost);assert.equal(offset(h),before.offset);assert.equal(h.document.activeElement,h.button('skill:inner_flame'));}
 assert.equal(h.app.state.gold,gold);
});
test('latest scroll/disclosure choices during payment are retained instead of old click-time values',async()=>{
 const h=await ui();prepare(h);h.delay(1);const task=h.click('skill:inner_flame');await next();h.pane.scrollTop=1400;h.pane.groups[1].open=true;const wanted=offset(h);await h.release();await task;assert.equal(offset(h),wanted);assert.equal(h.pane.groups[1].open,true);
});
test('max rank moves reading focus to the same inert card and rejects disabled clicks',async()=>{
 const h=await ui({skills:['inner_flame','inner_flame','inner_flame']});const before=prepare(h);await h.click('skill:inner_flame');const button=h.button('skill:inner_flame'),state=structuredClone(h.app.state),saves=h.saveCount;
 assert.equal(button.disabled,true);assert.equal(h.document.activeElement,button.card);assert.equal(button.card.tabIndex,-1);assert.equal(offset(h),before.offset);await h.click('skill:inner_flame');assert.deepEqual(h.app.state,state);assert.equal(h.saveCount,saves);assert.ok(h.focuses.every(call=>!call.node.disabled));
});
test('purchase making next rank unaffordable does not focus another actionable purchase',async()=>{
 const h=await ui();
 // Spend only through real reducers, keeping the trainer ledger valid.
 while(imports.previewSkill(h.app.state.character,'inner_flame',h.app.state).available&&h.app.state.character.skillPoints>4){const candidates=imports.RUNTIME_SKILL_IDS.filter(id=>id!=='inner_flame').map(id=>imports.previewSkill(h.app.state.character,id,h.app.state)).filter(p=>p.available&&p.cost>0&&h.app.state.character.skillPoints-p.cost>=2).sort((a,b)=>b.cost-a.cost);if(!candidates.length)break;assert.equal(await h.app.dispatch({type:'purchaseSkill',skillId:candidates[0].id,position:{x:260,y:325}}),true);}
 await h.app.showTraining();prepare(h);assert.equal(h.button('skill:inner_flame').disabled,false);await h.click('skill:inner_flame');assert.equal(h.button('skill:inner_flame').disabled,true);assert.equal(h.document.activeElement,h.button('skill:inner_flame').card);
});
for(const action of ['skill:flaming_wrath','skill:banner_of_zeal'])test(`disabled ${action} never submits, changes viewport or restores input`,async()=>{
 const h=await ui(action.includes('zeal')?{skills:['battle_banner','banner_of_protection']}:{skills:[]});const state=structuredClone(h.app.state),pane=h.pane,saves=h.saveCount;assert.equal(h.button(action).disabled,true);await h.click(action);assert.equal(h.pane,pane);assert.deepEqual(h.app.state,state);assert.equal(h.saveCount,saves);
});
test('double click, stale detached button and a click during payment cannot buy extra ranks',async()=>{
 const h=await ui(),before=prepare(h);h.delay(1);const task=h.click('skill:inner_flame');await next();await h.click('skill:inner_flame');await h.click('skill:inner_flame',{detail:2});await h.release();await task;const state=structuredClone(h.app.state),saves=h.saveCount;await h.click('skill:inner_flame',{target:before.button});await h.click('skill:inner_flame',{detail:2});assert.equal(h.app.state.character.skills.inner_flame,1);assert.deepEqual(h.app.state,state);assert.equal(h.saveCount,saves);
});
for(const phase of ['purchase','checkpoint'])for(const change of ['close','menu','title','controller','profile','battle','life','region','dead'])test(`${change} during ${phase} invalidates the old trainer restoration`,async()=>{
 const h=await ui();prepare(h);h.delay(phase==='purchase'?1:2);const task=h.click('skill:inner_flame');await next();assert.equal(h.waiting,true);
 if(change==='close')await h.click('close');else if(change==='title')h.app.showTitle();else if(change==='menu')h.app.panel('새 메뉴','<button data-action="close">닫기</button>');else h.app.change(change);
 const html=h.modal.innerHTML,pane=h.pane,focus=h.document.activeElement,focusCalls=h.focuses.length;
 await h.release();await task;assert.equal(h.modal.innerHTML,html);assert.equal(h.pane,pane);assert.equal(h.document.activeElement,focus);assert.equal(h.focuses.length,focusCalls);if(change==='close')assert.equal(h.modal.hidden,true);
});
for(const phase of ['purchase','checkpoint'])for(const failure of ['QUOTA','COMMIT_UNCERTAIN'])test(`${failure} during ${phase} cannot apply a stale view or repeat the purchase`,async()=>{
 const h=await ui();prepare(h);h.delay(phase==='purchase'?1:2);const before=structuredClone(h.store.load().state),task=h.click('skill:inner_flame');await next();await h.release({fail:{ok:false,code:failure,reason:'fixture save failure'}});await task;
 if(phase==='purchase'&&failure==='QUOTA'){assert.equal(h.pane.title,'전사의 훈련');assert.deepEqual(h.store.load().state,before);}else{assert.equal(h.gate.blocked,true);assert.equal(h.pane.title,'저장을 확인해야 합니다');assert.equal(h.pane.scrollTop,0);assert.equal(h.document.activeElement,h.button('reload'));}
 assert.equal(h.app.state.character.skills.inner_flame??0,phase==='purchase'?0:1);
});
for(const phase of ['purchase','checkpoint'])for(const change of ['focus','blur','visibility'])test(`${change} during ${phase} never revives the old purchase focus`,async()=>{
 const h=await ui();prepare(h);h.delay(phase==='purchase'?1:2);const task=h.click('skill:inner_flame');await next();
 if(change==='focus')(phase==='purchase'?h.button('close'):h.canvas).focus({preventScroll:true});
 if(change==='blur'){h.document.focused=false;h.wh.blur();h.document.focused=true;}
 if(change==='visibility'){h.document.hidden=true;h.dh.visibilitychange();h.document.hidden=false;}
 const mark=h.focuses.length;await h.release();await task;assert.equal(h.pane.title,'전사의 훈련');assert.ok(h.focuses.slice(mark).every(call=>call.node.dataset?.action!=='skill:inner_flame'));assert.equal(h.document.activeElement,h.button('close'));
});
test('pointer purchase without owned keyboard focus preserves scroll without stealing skill focus',async()=>{
 const h=await ui();const before=prepare(h);h.button('close').focus({preventScroll:true});await h.click('skill:inner_flame');assert.equal(offset(h),before.offset);assert.equal(h.document.activeElement,h.button('close'));
});
test('successful refresh still clears held/deferred input, binding capture and native key repeat',async()=>{
 const h=await ui();prepare(h);h.router.down('KeyW',imports.controlsFor(h.app.state));h.app.deferred.offer('interact',{now:100,life:h.app.battle.stateLife,region:h.app.battle.region});h.app.setCaptureBinding({action:'hammer'});
 // A synthetic pending binding exercises the real panel's capture reset.
 await h.click('skill:inner_flame');assert.equal(h.app.captureBinding,null);assert.equal(h.expertSafety.pending,true);assert.deepEqual(h.router.snapshot(imports.controlsFor(h.app.state)).move,{x:0,y:0});assert.equal(h.app.deferred.flush({now:100,life:h.app.battle.stateLife,region:h.app.battle.region},()=>assert.fail('stale interaction')).status,'idle');const before=structuredClone(h.app.report());const event=await h.key('Enter',{repeat:true});assert.equal(event.prevented,true);assert.deepEqual(h.app.report(),before);assert.equal(h.app.paused,true);assert.equal(h.app.battle.p.action,null);
 h.app.closePanel();assert.equal(h.document.activeElement,h.canvas);assert.equal(h.app.paused,false);assert.equal(h.app.battle.p.action,null);
});

for(const phase of ['purchase','checkpoint'])test(`close and reopen during ${phase} leaves the new trainer at its own default view`,async()=>{
 const h=await ui();prepare(h);h.delay(phase==='purchase'?1:2);const old=h.click('skill:inner_flame');await next();h.app.closePanel();const reopened=h.app.showTraining();await next();await h.release();await Promise.all([old,reopened]);assert.equal(h.pane.title,'전사의 훈련');assert.equal(h.pane.scrollTop,0);assert.deepEqual(h.pane.groups.map(group=>group.open),[false,false,true]);assert.equal(h.document.activeElement,h.button('close'));assert.equal(h.app.state.character.skills.inner_flame,1);
});
test('real rejected out-of-range purchase leaves state, storage, viewport and focus unchanged',async()=>{
 const h=await ui(),before=prepare(h),state=structuredClone(h.app.state),bytes=new Map(h.data),saves=h.saveCount;h.app.battle.p.x=0;h.app.battle.p.y=0;await h.click('skill:inner_flame');assert.equal(h.pane,before.pane);assert.equal(h.pane.scrollTop,920);assert.equal(h.document.activeElement,before.button);assert.deepEqual(h.app.state,state);assert.deepEqual(h.data,bytes);assert.equal(h.saveCount,saves);assert.ok(h.toasts.length);
});
test('dead battle cannot start an old enabled training purchase',async()=>{
 const h=await ui(),before=prepare(h),state=structuredClone(h.app.state),saves=h.saveCount;h.app.battle.p.hp=0;await h.click('skill:inner_flame');assert.deepEqual(h.app.state,state);assert.equal(h.saveCount,saves);assert.equal(h.pane,before.pane);
});

test('repeated blur with an identical wall-clock timestamp still invalidates purchase focus',async()=>{
 const h=await ui();h.wh.blur();prepare(h);const time=h.app.focusEvents.blurAt;h.delay(1);const task=h.click('skill:inner_flame');await next();h.wh.blur();assert.equal(h.app.focusEvents.blurAt,time);await h.release();await task;assert.equal(h.document.activeElement,h.button('close'));assert.equal(h.pane.title,'전사의 훈련');
});
