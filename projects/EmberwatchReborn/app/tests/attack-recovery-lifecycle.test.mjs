import {createMainInputFixture,mainInputSource} from './support/main-input-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {mainImports as imports} from './support/main-imports.mjs';
import {createState,reduceRuntime} from '../src/state.js';
import {createStore} from '../src/save.js';
import {battleReport} from '../src/recovery.js';

// Execute unchanged main.js functions/event handlers with actual combat,
// controller, router, safety, synchronization and store. DOM/render/audio are
// probes, not browser/pixel evidence. Production handlers are extracted unchanged.
const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
function fn(name){
 const m=new RegExp(`(?:async )?function ${name}\\(`).exec(source);assert.ok(m,name);
 for(let end=source.indexOf('}',m.index);end>=0;end=source.indexOf('}',end+1)){
  const text=source.slice(m.index,end+1);try{new vm.Script('('+text+')');return text;}catch(e){if(!(e instanceof SyntaxError))throw e;}
 }
 throw Error('Function not complete: '+name);
}
const cut=(start,end)=>{const a=source.indexOf(start),b=source.indexOf(end,a);assert.ok(a>=0&&b>a);return source.slice(a,b);};
const next=()=>new Promise(resolve=>setImmediate(resolve));
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
async function ui(){
 const result=reduceRuntime(createState(),{type:'trainStarter',position:{x:260,y:325}});assert.equal(result.ok,true);const s=result.state;
 const data=new Map(),store=createStore({getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)},{profile:'qa-attack-recovery-ui'});assert.equal(store.save(s,{expectedRevision:0}).ok,true);
 let delayed=false,pending=null,fail=false;
 const controller=imports.createController({load:store.load,save:(state,options)=>{if(fail){fail=false;return {ok:false,code:'QUOTA',reason:'synthetic quota failure'};}if(delayed){delayed=false;return new Promise(resolve=>pending=()=>resolve(store.save(state,options)));}return store.save(state,options);}});assert.equal((await controller.load()).ok,true);
 const wh={},dh={},ch={},toasts=[],elements=new Map();let now=0;
 const el=()=>({addEventListener(){},innerHTML:'',textContent:'',hidden:false,style:{},classList:{add(){},remove(){},toggle(){}},querySelector:()=>null});
 const $=id=>{if(!elements.has(id))elements.set(id,el());return elements.get(id);};
 const modal={...el(),hidden:true,presentationEpoch:0},canvas={tagName:'CANVAS',width:1000,height:700,focus(){},setPointerCapture(){},getBoundingClientRect:()=>({left:0,top:0}),addEventListener:(n,f)=>ch[n]=f};
 const document={hidden:false,visibilityState:'visible',hasFocus:()=>true,addEventListener:(n,f)=>dh[n]=f,querySelectorAll:()=>[]};
 const router=imports.createInputRouter(),expertCapture=imports.createExpertInputCapture(),expertSafety=imports.createActionSafety({capture:expertCapture,cancel:imports.cancelBattleAction}),gate=imports.createRuntimeGate();
 const env={...createMainInputFixture(),...imports,state:controller.snapshot(),battle:imports.createBattle(s),controller,router,expertCapture,expertSafety,gate,modal,canvas,document,window:{addEventListener:(n,f)=>wh[n]=f},$,paused:false,busy:false,captureBinding:null,suppressNextClick:false,combatSaveElapsed:0,deferredImmediate:imports.createImmediateInput(),input:{pointerScreen:null},last:0,hudTimer:0,displayTime:0,combatTime:0,walkTime:0,menuTime:0,arrivalWaitTime:0,noticeUntil:0,lastObjectiveHtml:'',profile:'qa-attack-recovery-ui',candidate:true,saveNamespace:'qa-r12',focusEvents:{},pauseReason:'',renderer:{render(){}},drawLabels(){},updateHud(){},nearest:()=>null,audio:{cancel(){},play(){},pause(){},tick(){}},requestAnimationFrame(){},toast:t=>toasts.push(t),interact(){},applyBinding(){},showControls(){},showDeath(){},performance:{now:()=>now},console:{error(e){throw e;}}};
 const funcs=['clearInput','flushActionSafety','acceptCombatPress','releaseCombatToken','panel','closePanel','report','syncVitals','dispatch','immediateAction','showMenu','frame'];
 const program=[mainInputSource,cut('const esc=','function clearInput('),cut('const config=','let controller='),cut('const tierLabel=','const focusEvents='),...funcs.map(fn),cut("window.addEventListener('keydown'","function resize("),'return {frame,showMenu,closePanel,dispatch,report,get battle(){return battle},get state(){return state},get paused(){return paused},get busy(){return busy},get walkTime(){return walkTime}};'].join('\n');
 const app=new Function(...Object.keys(env),program)(...Object.values(env));
 const event=code=>({code,target:canvas,preventDefault(){},stopImmediatePropagation(){},repeat:false,ctrlKey:false,altKey:false,metaKey:false});
 return {app,store,router,gate,modal,document,wh,dh,toasts,key:code=>wh.keydown(event(code)),up:code=>wh.keyup(event(code)),async frame(dt=.02){now+=dt*1000;app.frame(now);await next();},async settled(){await app.dispatch.waiting;await next();},delay(){delayed=true;},fail(){fail=true;},async finish(){assert.ok(pending);pending();pending=null;await next();}};
}
async function attackAt(h,target){
 h.key('KeyJ');h.key('KeyD');
 for(let n=0;n<60&&(!h.app.battle.p.action||h.app.battle.p.action.elapsed<target-1e-9);n++)await h.frame();
 assert.equal(h.app.battle.p.action?.id,'mace_swing');assert.ok(h.app.battle.p.action.elapsed>=target-1e-9);
}
function signal(h,reason){if(reason==='menu')h.key('Escape');else if(reason==='blur')h.wh.blur();else{h.document.hidden=true;h.document.visibilityState='hidden';h.dh.visibilitychange();}}

for(const reason of ['menu','blur','hidden'])for(const phase of ['windup','recovery'])test(`real ${reason} in ${phase} pauses, saves full remaining debt and cannot replay queued/held input`,async()=>{
 const h=await ui();await attackAt(h,phase==='windup'?.08:.36);const b=h.app.battle,a=b.p.action;
 if(phase==='recovery'){h.key('KeyQ');await h.frame();assert.equal(b.skillIntent?.id,'righteous_hammer');}
 const before=battleReport(b),position={...before.position},elapsed=a.elapsed;
 signal(h,reason);await h.settled();assert.equal(h.app.paused,true);assert.equal(b.p.action,a);assert.equal(b.skillIntent,null);
 close(h.store.load().state.recovery.lock,before.recovery.lock);assert.deepEqual(h.store.load().state.world.position,position);assert.deepEqual(h.store.load().state.vitals,before.vitals);
 for(let n=0;n<5;n++)await h.frame(.05);close(a.elapsed,elapsed);assert.deepEqual(battleReport(b).position,position);close(battleReport(b).recovery.lock,before.recovery.lock);
 h.document.hidden=false;h.document.visibilityState='visible';h.app.closePanel();assert.equal(h.app.paused,false);
 for(let n=0;n<40;n++)await h.frame(.02);assert.equal(b.p.action,null);assert.equal(b.skillIntent,null);assert.equal(b.p.combo,1);assert.equal(b.p.cooldowns.righteous_hammer??0,0);assert.equal(b.p.mana,before.vitals.mana);
});

test('real delayed menu checkpoint freezes moved recovery and retains its object through commit',async()=>{
 const h=await ui();await attackAt(h,.24);const b=h.app.battle,a=b.p.action,report=battleReport(b);h.delay();h.key('Escape');await next();assert.equal(h.app.busy,true);
 for(let n=0;n<6;n++)await h.frame(.05);assert.equal(b.p.action,a);close(battleReport(b).recovery.lock,report.recovery.lock);assert.deepEqual(battleReport(b).position,report.position);
 await h.finish();await h.settled();assert.equal(h.app.busy,false);assert.equal(b.p.action,a);close(h.store.load().state.recovery.lock,report.recovery.lock);assert.deepEqual(h.store.load().state.world.position,report.position);
});

test('real failed menu checkpoint does not erase, refund or complete the live recovery action',async()=>{
 const h=await ui();await attackAt(h,.24);const b=h.app.battle,a=b.p.action,report=battleReport(b),saved=h.store.load().state;h.fail();h.key('Escape');await h.settled();
 assert.equal(h.app.paused,true);assert.equal(h.app.busy,false);assert.ok(h.toasts.includes('synthetic quota failure'));assert.equal(b.p.action,a);assert.deepEqual(h.store.load().state,saved);
 await h.frame(.05);close(battleReport(b).recovery.lock,report.recovery.lock);assert.deepEqual(battleReport(b).vitals,report.vitals);assert.deepEqual(battleReport(b).position,report.position);
});

test('real main frame counts recovery movement in walkTime and stops counting on released movement',async()=>{
 const h=await ui();await attackAt(h,.1);close(h.app.walkTime,0);const b=h.app.battle,origin={x:b.p.x,y:b.p.y};
 for(let n=0;n<6;n++)await h.frame(.02);assert.ok(Math.hypot(b.p.x-origin.x,b.p.y-origin.y)>0);assert.equal(b.p.moving,true);assert.ok(h.app.walkTime>0);assert.equal(b.p.action.id,'mace_swing');
 const before=h.app.walkTime,walk=b.p.walk;h.up('KeyD');await h.frame(.02);assert.equal(b.p.moving,false);close(h.app.walkTime,before);close(b.p.walk,walk);
 h.key('KeyD');await h.frame(.02);assert.equal(b.p.moving,true);close(h.app.walkTime,before+.02);assert.ok(b.p.walk>walk);
});

test('real main frame counts the mixed recovery/new-windup frame once and not the next stationary windup',async()=>{
 const h=await ui();await attackAt(h,.5);const b=h.app.battle,a=b.p.action,before=h.app.walkTime,position={x:b.p.x,y:b.p.y},walk=b.p.walk??0;
 await h.frame(.05);assert.notEqual(b.p.action,a);assert.equal(b.p.action.fired,false);assert.equal(b.p.moving,true);close(h.app.walkTime,before+.05);
 const travelled=Math.hypot(b.p.x-position.x,b.p.y-position.y);assert.ok(travelled>0);close((b.p.walk-walk)*(158/10),travelled);
 await h.frame(.02);assert.equal(b.p.moving,false);close(h.app.walkTime,before+.05);
});
