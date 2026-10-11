import {createMainInputFixture,mainInputSource} from './support/main-input-fixture.mjs';
import {createExpertInputCapture} from '../src/expert-input.js';
import {createActionSafety} from '../src/action-safety.js';
import {cancelBattleAction} from '../src/combat.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createContext,runInContext} from 'node:vm';
import {createBattle,stepBattle,clearBattleIntent} from '../src/combat.js';
import {combatCheckpoint} from '../src/combat-persistence.js';
import {createStore,createSession} from '../src/save.js';
import {createController} from '../src/controller.js';
import {createRuntimeGate} from '../src/runtime-gate.js';
import {emptyRecovery} from '../src/recovery.js';
import {reduceRuntime} from '../src/state.js';
import {route,run,report,travel} from './support/earned-route.mjs';

// Scripted earned Adept route and legal settlement reports, not browser play.
function quarry(){
 let s=route('normal',true,true).state;
 s=run(s,{type:'promoteAdept',...report(s,{x:260,y:325}),recovery:s.recovery??emptyRecovery()}).state;
 s=run(s,{type:'acceptQuarryQuest',...report(s,{x:450,y:325})}).state;
 return travel(s,'town-quarry-entry');
}
const alive=quarry();
const dead=run(alive,{type:'settleCombat',defeated:[],...report(alive),vitals:{...alive.vitals,hp:0}}).state;
const memory=()=>{const data=new Map();return {data,getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};};
const nextTurn=()=>new Promise(resolve=>setImmediate(resolve));

// Execute the actual main.js loadProfile, showDeath, panel and audio-option
// functions with only browser boundaries substituted. This catches the ordering
// regression in the production handler; it is not a visual/DOM browser test.
const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const start=source.indexOf('async function loadProfile('),end=source.indexOf('\nfunction showTitle(',start);
assert.ok(start>=0&&end>start,'production profile loader boundaries');
const oneLine=name=>{const line=source.split('\n').find(line=>line.startsWith(`function ${name}(`));assert.ok(line,`production ${name}`);return line;};
function startup(saved,{audioReady=new Promise(()=>{})}={}){
 const storage=memory(),store=createStore(storage,{profile:'qa-dead-resume',namespace:'qa-r6'});
 assert.equal(store.save(saved,{expectedRevision:0}).ok,true);
 const background=()=>({inert:false,attrs:{},getAttribute(key){return this.attrs[key]??null},setAttribute(key,value){this.attrs[key]=value},removeAttribute(key){delete this.attrs[key]}});
 const elements={hud:{...background(),hidden:true},world:background(),toast:{textContent:''}},modal={hidden:false,innerHTML:'',ownerDocument:{getElementById:id=>elements[id]}},calls=[];
 const context=createContext({...createMainInputFixture(),
  createSession,createController,createBattle,clearBattleIntent,expertSafety:createActionSafety({capture:createExpertInputCapture(),cancel:cancelBattleAction}),
  localStorage:storage,navigator:{locks:{request:async(_key,_options,fn)=>fn()}},saveNamespace:'qa-r6',candidate:true,gate:createRuntimeGate(),
  controller:null,profile:null,state:null,battle:null,paused:true,busy:false,
  noticeUntil:0,input:{aim:null,pointerScreen:null},displayTime:0,combatTime:0,menuTime:0,walkTime:0,arrivalWaitTime:0,
  captureBinding:null,modal,$:id=>elements[id],router:{clear:()=>{}},deferredImmediate:{clear:()=>{}},
  audio:{cancel(){},setEnabled:value=>{calls.push(['audio-enabled',value]);return audioReady;},resume:()=>{calls.push(['audio-resume']);return audioReady;},setMasterVolume:value=>calls.push(['audio-volume',value]),pause:value=>calls.push(['audio-paused',value])},
  updateHud:()=>calls.push(['hud']),toast:text=>calls.push(['toast',text]),keyName:()=> 'F',
  showTitle:message=>calls.push(['title',message]),esc:String,
  button:(label,action,extra='')=>`<button data-action="${action}" ${extra}>${label}</button>`
 });
 runInContext([mainInputSource,oneLine('clearInput'),oneLine('panel'),oneLine('syncAudioOptions'),source.slice(start,end)].join('\n'),context,{filename:'main-profile-startup.js'});
 return {context,calls,storage,store,load:()=>context.loadProfile('qa-dead-resume',false)};
}

test('settled dead Adept reconstruction bypasses arrival and never emits another settlement under idle or attack input',()=>{
 const before=structuredClone(dead),b=createBattle(dead),p=structuredClone(b.p);
 assert.equal(b.dead,true);assert.equal(b.deathReported,true);assert.equal(b.awaitingAdvance,false);
 for(const input of [{},{move:{x:1,y:0}},{attack:true},{hammer:true},{heal:true}]){
  const events=stepBattle(b,dead.character,.05,input);
  assert.deepEqual(events,[]);assert.equal(combatCheckpoint(b,events,{elapsed:100}),null);assert.deepEqual(b.p,p);
 }
 assert.deepEqual(dead,before);assert.equal(dead.stats.deaths,alive.stats.deaths+1);
 assert.equal(dead.gold,alive.gold-Math.floor(alive.gold*.05));
});

test('actual startup immediately exposes retry and completes while optional audio remains pending',async()=>{
 const h=startup(dead),bytes=new Map(h.storage.data);let completed=false;
 h.load().then(()=>completed=true);await nextTurn();
 assert.equal(completed,true,'profile loading must not await Web Audio resume or sample decoding');
 assert.equal(h.context.paused,true);assert.equal(h.context.modal.hidden,false);
 assert.match(h.context.modal.innerHTML,/불씨는 아직 남아 있습니다/);assert.match(h.context.modal.innerHTML,/data-action="retry"/);
 assert.equal(h.context.battle.awaitingAdvance,false);assert.equal(h.context.battle.dead,true);
 assert.deepEqual(h.storage.data,bytes);assert.deepEqual(h.context.controller.snapshot(),dead);
 assert.equal(h.context.gate.canResume({hasBattle:true,lifeDown:h.context.state.world.lifeDown}),false);
 assert.ok(h.calls.some(([type,value])=>type==='audio-paused'&&value===true));
});

test('late audio readiness after explicit retry cannot restore the old death modal or repeat a charge',async()=>{
 let resolveAudio;const ready=new Promise(resolve=>resolveAudio=resolve),h=startup(dead,{audioReady:ready});
 let completed=false;h.load().then(()=>completed=true);await nextTurn();assert.equal(completed,true);
 const retry=await h.context.controller.dispatch({type:'retry'});assert.equal(retry.ok,true);
 h.context.state=retry.state;h.context.battle=createBattle(retry.state);h.context.paused=false;h.context.modal.hidden=true;h.context.modal.innerHTML='';
 resolveAudio(true);await nextTurn();
 assert.equal(h.context.modal.hidden,true);assert.equal(h.context.paused,false);assert.equal(h.context.state.world.lifeDown,false);
 assert.equal(h.context.battle.dead,false);assert.equal(h.context.state.stats.deaths,dead.stats.deaths);assert.equal(h.context.state.gold,dead.gold);
 assert.equal((await h.context.controller.dispatch({type:'retry'})).code,'NOT_DOWN');
 assert.deepEqual(h.store.load().state,retry.state);
});

test('repeated dead-save loads are read-only; explicit retry increments life once and preserves all earned progress',async()=>{
 const h=startup(dead,{audioReady:Promise.resolve(false)}),bytes=new Map(h.storage.data);
 for(let i=0;i<3;i++){
  await h.load();assert.equal(h.context.paused,true);assert.match(h.context.modal.innerHTML,/data-action="retry"/);
  assert.deepEqual(h.storage.data,bytes);assert.equal(h.context.controller.revision(),1);
  assert.deepEqual(h.context.state.stats,dead.stats);assert.equal(h.context.state.gold,dead.gold);
 }
 const retried=await h.context.controller.dispatch({type:'retry'});assert.equal(retried.ok,true);
 assert.equal(retried.state.world.life,dead.world.life+1);assert.equal(retried.state.world.region,'ash_hamlet');
 assert.deepEqual(retried.state.stats,dead.stats);assert.equal(retried.state.gold,dead.gold);
 assert.deepEqual(retried.state.inventory,dead.inventory);assert.deepEqual(retried.state.character,dead.character);
 assert.deepEqual(retried.state.world.defeated,dead.world.defeated);assert.deepEqual(retried.state.world.claimedRewards,dead.world.claimedRewards);
 await h.load();assert.equal(h.context.paused,false);assert.equal(h.context.modal.hidden,true);assert.ok(h.context.battle.p.hp>0);
 assert.equal(h.context.battle.dead,false);assert.equal(h.context.controller.revision(),2);
});

test('alive startup still waits safely for explicit movement or offense while audio is pending',async()=>{
 const saved=run(alive,{type:'checkpoint',...report(alive),vitals:{hp:20,mana:10,stamina:15},recovery:{...emptyRecovery(),cooldowns:{righteous_hammer:2},lock:.2,manaDelay:.4,staminaDelay:.3,invuln:.1,potionCooldown:3}}).state;
 const h=startup(saved);let completed=false;h.load().then(()=>completed=true);await nextTurn();assert.equal(completed,true);
 const b=h.context.battle,initial=structuredClone(b.p);
 assert.equal(h.context.paused,false);assert.equal(h.context.modal.hidden,true);assert.equal(b.awaitingAdvance,true);assert.equal(b.dead,false);
 for(let n=0;n<100;n++)assert.deepEqual(stepBattle(b,saved.character,.05,{}),[]);
 assert.deepEqual(b.p,initial);assert.equal(b.time,0);assert.equal(combatCheckpoint(b,[],{elapsed:100}),null);
 stepBattle(b,saved.character,.02,{move:{x:1,y:0}});assert.equal(b.awaitingAdvance,false);assert.ok(b.time>0);
 assert.equal(h.context.state.world.lifeDown,false);assert.deepEqual(h.store.load().state,saved);
});

test('muted saved options do not force an audio resume before death presentation',async()=>{
 const muted=reduceRuntime(dead,{type:'setOption',option:'masterVolume',value:0});assert.equal(muted.ok,true);
 const h=startup(muted.state);let completed=false;h.load().then(()=>completed=true);await nextTurn();
 assert.equal(completed,true);assert.equal(h.context.paused,true);assert.match(h.context.modal.innerHTML,/data-action="retry"/);
 assert.deepEqual(h.calls.filter(([type])=>type==='audio-enabled'),[['audio-enabled',false]]);
 assert.equal(h.calls.some(([type])=>type==='audio-resume'),false);
});

test('R14a16 actual alive profile load removes existing dialog background blockers without changing saved state',async()=>{const h=startup(alive),before=new Map(h.storage.data);h.context.setDialogBackground(h.context.modal,true);const hud=h.context.modal.ownerDocument.getElementById('hud'),world=h.context.modal.ownerDocument.getElementById('world');assert.equal(hud.inert,true);await h.load();assert.equal(h.context.modal.hidden,true);assert.equal(h.context.paused,false);assert.equal(hud.inert,false);assert.equal(world.inert,false);assert.equal(hud.attrs['aria-hidden'],undefined);assert.deepEqual(h.storage.data,before);});
