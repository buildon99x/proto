import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createState,reduceRuntime} from '../src/state.js';
import {createStore} from '../src/save.js';
import {createMainInputFixture,mainInputSource} from './support/main-input-fixture.mjs';

// Execute production HUD, input, settlement/dispatch and retry handlers. Only
// DOM/audio/storage boundaries are probes. Scripted lifecycle fixtures are not
// native browser play, screen-reader verification or rendered-pixel evidence.
const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const combatActions=['attack','hammer','charge','block','heal','judgement','expert1','expert2','dodgeSprint','dodgeOnly','sprint'];
const mobility=['dodgeSprint','dodgeOnly','sprint'];
const deadText='쓰러짐 · 행동 불가';
const next=()=>new Promise(resolve=>setImmediate(resolve));
function fn(name){
 const match=new RegExp(`(?:async )?function ${name}\\(`).exec(source);assert.ok(match,name);
 for(let end=source.indexOf('}',match.index);end>=0;end=source.indexOf('}',end+1)){
  const text=source.slice(match.index,end+1);
  try{new vm.Script('('+text+')');return text;}catch(error){if(!(error instanceof SyntaxError))throw error;}
 }
 throw Error('Incomplete production handler: '+name);
}
const declaration=name=>{const line=source.split('\n').find(row=>row.startsWith(`const ${name}=`));assert.ok(line,name);return line;};
const cut=(start,end)=>{const index=source.indexOf(start),last=source.indexOf(end,index);assert.ok(index>=0&&last>index);return source.slice(index,last);};
function node(){
 const classes=new Set();
 return {innerHTML:'',textContent:'',hidden:false,disabled:false,attributes:{},handlers:{},style:{},
  setAttribute(name,value){this.attributes[name]=String(value);},addEventListener(name,fn){this.handlers[name]=fn;},
  classList:{add:(...names)=>names.forEach(name=>classes.add(name)),remove:(...names)=>names.forEach(name=>classes.delete(name)),toggle(name,force){if(force??!classes.has(name)){classes.add(name);return true;}classes.delete(name);return false;},contains:name=>classes.has(name)},
  querySelector:()=>null,focus(){},setPointerCapture(){}};
}
async function ui({version=4,run='combined',dead=false,emptyPotions=false}={}){
 const imports=createMainInputFixture();
 let state=reduceRuntime(createState(),{type:'trainStarter',position:{x:260,y:325}}).state;
 if(version>=4){let controls=imports.poeControlPreset(state.options.controls,'wasd',run);if(version===5)controls=imports.enableSkillLoadout(controls,{skills:state.character.skills,actionSlots:state.actionSlots});state=reduceRuntime(state,{type:'setControls',controls}).state;}
 // An explicitly synthetic empty-inventory fixture tests zero-count presentation.
 if(emptyPotions)state.inventory.consumables.health_potion=0;
 if(dead){const battle=imports.createBattle(state),r=reduceRuntime(state,{type:'settleCombat',...imports.battleReport(battle),defeated:[],vitals:{...state.vitals,hp:0}});assert.equal(r.ok,true,r.reason);state=r.state;}
 const data=new Map(),storage={getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)},store=createStore(storage,{profile:'qa-dead-action-hud'});assert.equal(store.save(state,{expectedRevision:0}).ok,true);
 let failure=null;const controller=imports.createController({load:store.load,save:(s,o)=>{if(failure){const result=failure;failure=null;return result;}return store.save(s,o);}});assert.equal((await controller.load()).ok,true);
 const elements=new Map(),$=id=>{if(!elements.has(id))elements.set(id,node());return elements.get(id);};
 const buttons=Object.fromEntries([...combatActions,'potion'].map(action=>[action,{...node(),dataset:action==='potion'?{action}:{combat:action}}]));
 $('hotbar').querySelector=selector=>buttons[/data-(?:combat|action)="([^"]+)"/.exec(selector)?.[1]]??null;
 const wh={},dh={},canvas={...node(),tagName:'CANVAS',width:1000,height:700,getBoundingClientRect:()=>({left:0,top:0})},modal={...node(),hidden:true,presentationEpoch:0};
 const document={hidden:false,visibilityState:'visible',hasFocus:()=>true,addEventListener:(name,fn)=>dh[name]=fn,querySelectorAll:selector=>selector==='[data-combat]'?combatActions.map(action=>buttons[action]):[]};
 const env={...imports,controller,state:controller.snapshot(),battle:imports.createBattle(state),$,canvas,modal,document,window:{addEventListener:(name,fn)=>wh[name]=fn},router:imports.createInputRouter({captureAttackTap:true}),expertSafety:null,gate:imports.createRuntimeGate(),deferredImmediate:imports.createImmediateInput(),
  paused:false,busy:false,captureBinding:null,suppressNextClick:false,combatSaveElapsed:0,noticeUntil:0,lastObjectiveHtml:'',last:0,saveNamespace:'qa-r14',candidate:true,focusEvents:{},
  audio:{pause(){},play(){return false;}},showMenu(){},showControls(){},applyBinding(){},interact(){},performance,queueMicrotask,console};
 const handlers=['clearInput','flushActionSafety','acceptCombatPress','releaseCombatToken','panel','closePanel','report','syncVitals','dispatch','immediateAction','updateHud','showDeath','toast'];
 const context=new Function(...Object.keys(env),[mainInputSource,...['config','keyName','tierLabel','esc','button','BUILD_LABEL'].map(declaration),...handlers.map(fn),cut("document.addEventListener('click',","document.addEventListener('change',"),cut("window.addEventListener('keydown'","function resize("),`return {${handlers.join(',')},controller,gate,router,get state(){return state},get battle(){return battle},get busy(){return busy},get paused(){return paused},set paused(value){paused=value}};`].join('\n'))(...Object.values(env));
 context.updateHud();if(dead)context.showDeath();
 const event=(code,extra={})=>({code,target:canvas,preventDefault(){},stopImmediatePropagation(){},repeat:false,ctrlKey:false,altKey:false,metaKey:false,...extra});
 return {context,buttons,modal,store,data,toast:$('toast'),async click(action){const target=buttons[action]??{dataset:{action},disabled:false};return dh.click({target:{closest:()=>target},detail:1,preventDefault(){},stopPropagation(){}});},key:(code,extra)=>wh.keydown(event(code,extra)),up:code=>wh.keyup(event(code)),async settle(){const r=context.report();assert.equal(await context.dispatch({type:'settleCombat',...r,defeated:[],vitals:{...r.vitals,hp:0}}),true);context.showDeath();},fail(){failure={ok:false,code:'QUOTA',reason:'fixture save failure'};}};
}
function assertDown(h){
 for(const [action,el] of Object.entries(h.buttons)){
  assert.equal(el.disabled,true,action+' native disabled');assert.equal(el.attributes['aria-disabled'],'true',action+' aria disabled');
  if(!el.hidden){assert.ok(el.innerHTML.includes(`<em>${deadText}</em>`),action+' death detail');assert.ok(el.attributes['aria-label'].endsWith(deadText),action+' accessible death detail');}
  assert.equal(el.classList.contains('active'),false,action+' inactive');
 }
}
function assertAlive(h){
 for(const [action,el] of Object.entries(h.buttons)){
  assert.equal(el.disabled,false,action+' native enabled');assert.equal(el.attributes['aria-disabled'],'false',action+' aria enabled');
  if(!el.hidden){assert.equal(el.innerHTML.includes(deadText),false,action+' no stale death detail');assert.equal(el.attributes['aria-label'].includes(deadText),false,action+' no stale accessible death detail');}
 }
}
function runtimeSnapshot(h){const c=h.context,b=c.battle;return structuredClone({state:c.state,p:b.p,serial:b.castSerial,time:b.time,shots:b.shots,areas:b.areas,skillIntent:b.skillIntent,mobility:b.poeMobility?.snapshot(),revision:c.controller.revision()});}
for(const version of [3,4,5])for(const run of version===3?['legacy']:['combined','separate'])test(`real v${version}/${run} settlement disables all HUD actions; repeated retry restores exact life once`,async()=>{
 const h=await ui({version,run}),c=h.context;assertAlive(h);const initial=c.controller.snapshot(),before=runtimeSnapshot(h);c.updateHud();assert.deepEqual(runtimeSnapshot(h),before,'HUD is read-only');
 await h.settle();assertDown(h);assert.equal(c.state.world.lifeDown,true);assert.match(h.modal.innerHTML,/data-action="retry"/);const saved=c.controller.snapshot(),revision=c.controller.revision(),bytes=new Map(h.data);
 for(const code of ['Space','ShiftLeft','Digit1','KeyQ']){h.key(code);h.key(code,{repeat:true});h.up(code);}
 await h.click('potion');for(const action of mobility){h.buttons[action].handlers.pointerdown({preventDefault(){},pointerId:1});h.buttons[action].handlers.pointerup({});}await next();
 assert.deepEqual(c.controller.snapshot(),saved,'dead keys/pointer/potion never save or spend');assert.equal(c.controller.revision(),revision);assert.deepEqual(h.data,bytes);
 const stable=runtimeSnapshot(h);c.updateHud();assertDown(h);assert.deepEqual(runtimeSnapshot(h),stable,'dead HUD is read-only');
 await h.click('retry');assert.equal(c.state.world.lifeDown,false,h.toast.textContent);assertAlive(h);assert.equal(c.state.world.lifeDown,false);assert.equal(c.battle.dead,false);assert.equal(c.paused,false);assert.equal(h.modal.hidden,true);assert.equal(c.state.world.life,initial.world.life+1);assert.equal(c.state.stats.deaths,initial.stats.deaths+1);assert.deepEqual(c.state.inventory,saved.inventory);assert.deepEqual(c.state.options.controls,initial.options.controls);
 const retried=c.controller.snapshot(),retryRevision=c.controller.revision();await h.click('retry');assert.deepEqual(c.controller.snapshot(),retried);assert.equal(c.controller.revision(),retryRevision,'duplicate retry neither resettles nor saves');assertAlive(h);
 if(version>=4){const visible=run==='combined'?['dodgeSprint']:['dodgeOnly','sprint'];for(const action of mobility){assert.equal(h.buttons[action].hidden,!visible.includes(action),action+' original binding visibility');if(visible.includes(action))assert.ok(h.buttons[action].innerHTML.includes(`<em>${{dodgeSprint:'회피 후 홀드 질주',dodgeOnly:'회피만',sprint:'누르는 동안'}[action]}</em>`),'revived original movement description');}}
});
for(const version of [4,5])for(const run of ['combined','separate'])test(`real v${version}/${run} reloaded death blocks input even with modal absent; retry accepts fresh dodge and potion`,async()=>{
 const h=await ui({version,run,dead:true}),c=h.context;assertDown(h);assert.equal(c.battle.dead,true);
 // Remove only the test DOM/modal barrier so the real life gates, rather than
 // pause/overlay guards, must reject these real main handler invocations.
 c.paused=false;h.modal.hidden=true;const before=runtimeSnapshot(h),bytes=new Map(h.data);
 for(const action of mobility)c.acceptCombatPress(action,'dead-probe:'+action);c.immediateAction('potion');await next();
 assert.deepEqual(runtimeSnapshot(h),before);assert.deepEqual(h.data,bytes);
 c.showDeath();await h.click('retry');assertAlive(h);const count=c.state.inventory.consumables.health_potion;
 // The existing potion contract still requires missing HP after revival.
 c.battle.p.hp=c.battle.stats.hpMax/2;h.key('Digit1');await next();h.up('Digit1');assert.equal(c.state.inventory.consumables.health_potion,count-1);assert.equal(c.battle.p.hp,c.battle.stats.hpMax);assert.equal(c.battle.p.potionCooldown,5);assert.match(h.buttons.potion.attributes['aria-label'],/체력 물약 5\.0초$/);
 h.key('KeyD');h.key('Space');await next();assert.equal(c.battle.poeMobility.snapshot().state,'roll','fresh actual key press starts dodge');h.up('Space');
 c.updateHud();assert.match(h.buttons[run==='combined'?'dodgeSprint':'dodgeOnly'].attributes['aria-label'],/구르기$/);
});
for(const marker of ['hp','battle','state'])test(`HUD death priority follows existing ${marker} gate ahead of stale mobility pose and potion cooldown`,async()=>{
 const h=await ui({version:5}),c=h.context;c.battle.p.presentationPose={state:'sprint',blocksSkills:false};c.battle.p.potionCooldown=3;
 if(marker==='hp')c.battle.p.hp=0;if(marker==='battle')c.battle.dead=true;if(marker==='state')c.state.world.lifeDown=true;
 const before=runtimeSnapshot(h);c.updateHud();assertDown(h);assert.deepEqual(runtimeSnapshot(h),before);
});
test('failed real retry save keeps death HUD disabled until a confirmed retry succeeds',async()=>{
 const h=await ui({dead:true}),c=h.context,before=c.controller.snapshot(),bytes=new Map(h.data);h.fail();await h.click('retry');assertDown(h);assert.equal(c.paused,true);assert.equal(h.modal.hidden,false);assert.deepEqual(c.controller.snapshot(),before);assert.deepEqual(h.data,bytes);
 await h.click('retry');assertAlive(h);assert.equal(c.state.world.lifeDown,false);assert.equal(c.state.world.life,before.world.life+1);assert.equal(c.state.stats.deaths,before.stats.deaths);
});

for(const version of [3,4,5])test(`v${version} empty potions stay 0 while alive and after retry; death text takes priority`,async()=>{
 const h=await ui({version,emptyPotions:true}),c=h.context,pot=h.buttons.potion;
 assert.match(pot.innerHTML,/<em>0개<\/em>/);assert.match(pot.attributes['aria-label'],/체력 물약 0개$/);assertAlive(h);
 const before=c.controller.snapshot(),bytes=new Map(h.data);await h.click('potion');await next();assert.match(h.toast.textContent,/체력 물약이 없습니다/);assert.deepEqual(c.controller.snapshot(),before);assert.deepEqual(h.data,bytes,'empty-potion rejection never saves');
 await h.settle();assertDown(h);assert.equal(pot.innerHTML.includes('0개'),false,'life gate takes precedence over empty stock');assert.equal(pot.attributes['aria-label'].includes('0개'),false);
 await h.click('retry');assertAlive(h);assert.match(pot.innerHTML,/<em>0개<\/em>/);assert.match(pot.attributes['aria-label'],/체력 물약 0개$/);assert.equal(c.state.inventory.consumables.health_potion,0,'retry never replenishes stock');
});
test('reported Space death label is replaced before any stale roll or sprint instruction',async()=>{
 const h=await ui({version:4,dead:true}),el=h.buttons.dodgeSprint;
 assert.match(el.innerHTML,/<em>쓰러짐 · 행동 불가<\/em>/);
 assert.equal(el.innerHTML.includes('회피 후 홀드 질주'),false);
 assert.match(el.attributes['aria-label'],/쓰러짐 · 행동 불가$/);assert.equal(el.disabled,true);assert.equal(el.attributes['aria-disabled'],'true');
 await h.click('retry');assert.match(el.innerHTML,/<em>회피 후 홀드 질주<\/em>/);assert.equal(el.disabled,false);assert.equal(el.attributes['aria-disabled'],'false');
});
