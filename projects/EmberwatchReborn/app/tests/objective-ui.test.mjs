import {createMainInputFixture,mainInputSource} from './support/main-input-fixture.mjs';
import {createState} from '../src/state.js';
import {createExpertInputCapture,EXPERT_SLOTS} from '../src/expert-input.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {editableTarget,controlPreset,createInputRouter} from '../src/controls.js';
// Execute the actual narrowly extracted browser handlers against a minimal DOM
// assignment probe. This is a runtime handler test, not a visual browser test.
const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const hud=source.slice(source.indexOf(' const objective=campaignGuidance(state).title;'),source.indexOf(' const entries='));
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const button=(label,action,extra='')=>`<button data-action="${action}" ${extra}>${label}</button>`;
test('actual HUD preserves objective button node between unchanged frame updates',()=>{
 let writes=0,html='',key='F',title='현재 목표';const element={set innerHTML(v){writes++;html=v;}};
 const context=vm.createContext({state:{world:{region:'town'}},lastObjectiveHtml:'',esc,button,$:()=>element,campaignGuidance:()=>({title}),getRegion:id=>({name:id}),keyName:a=>a==='interact'?key:'C'});
 for(let i=0;i<100;i++)new vm.Script('{'+hud+'}').runInContext(context);
 assert.equal(writes,1);assert.match(html,/목표 자세히/);key='E';new vm.Script('{'+hud+'}').runInContext(context);assert.equal(writes,2);assert.match(html,/E 대화/);
 title='<script>';new vm.Script('{'+hud+'}').runInContext(context);assert.equal(writes,3);assert.match(html,/&lt;script&gt;/);context.state.world.region='pass';new vm.Script('{'+hud+'}').runInContext(context);assert.equal(writes,4);
});
test('actual goal handler uses pausing panel lifecycle and clears held/deferred intent',()=>{
 let cleared=0,audioPaused=false,checkpoint=0;const modal={hidden:true,innerHTML:''};
 const panel=source.slice(source.indexOf('function panel('),source.indexOf('function closePanel('));
 const objective=source.slice(source.indexOf('function showObjective('),source.indexOf('function showMenu('));
 const context=vm.createContext({...createMainInputFixture(),state:{vitals:{hp:20},world:{lifeDown:false}},battle:{},captureBinding:'attack',paused:false,gate:{blocked:false},modal,esc,button,clearInput(){cleared++;},audio:{pause(v){audioPaused=v;}},dispatch(c){assert.equal(c.type,'checkpoint');checkpoint++;},report:()=>({}),campaignGuidance:()=>({title:'Find <guide>',detail:'Read <clue>'})});
 new vm.Script(panel+objective+'showObjective();').runInContext(context);
 assert.equal(context.paused,true);assert.equal(cleared,1);assert.equal(audioPaused,true);assert.equal(checkpoint,1);assert.equal(context.captureBinding,null);assert.equal(modal.hidden,false);assert.match(modal.innerHTML,/안내를 읽는 동안 일시정지/);assert.match(modal.innerHTML,/Find &lt;guide&gt;/);assert.match(modal.innerHTML,/Read &lt;clue&gt;/);assert.match(modal.innerHTML,/북쪽 ↗/);
 context.state.world.lifeDown=true;new vm.Script('showObjective();').runInContext(context);assert.equal(cleared,1);assert.equal(checkpoint,1);
});

// Keep the real persistence gate busy while inspecting router edges. Combat
// stays queued so these focus-only assertions can inspect the accepted key.
function keyboardHarness(){
 const handlers={},router=createInputRouter(),controls=controlPreset(),dependencies=createMainInputFixture(),state=createState(),battle=dependencies.createBattle(state),expertCapture=createExpertInputCapture(),expertSafety=dependencies.createActionSafety({capture:expertCapture,cancel:dependencies.cancelBattleAction});let clears=0,prevented=0,focuses=0;const context=vm.createContext({...dependencies,gate:dependencies.createRuntimeGate(),state,battle,expertSafety,controller:{},$:()=>({querySelector:()=>null}),window:{addEventListener:(name,fn)=>handlers[name]=fn},document:{hidden:false,hasFocus:()=>true,addEventListener:(name,fn)=>handlers[name]=fn},captureBinding:null,expertCapture,EXPERT_SLOTS,busy:true,editableTarget,router,config:()=>controls,modal:{hidden:true},paused:false,clearInput(){clears++;router.clear();},immediateAction(){},deferredImmediate:{clear(){}},canvas:{focus(){focuses++;},setPointerCapture(){},addEventListener:(name,fn)=>handlers[name]=fn},input:{}});
 const expertHelpers=source.slice(source.indexOf('function flushActionSafety('),source.indexOf('function toast('));new vm.Script(mainInputSource+'\n'+expertHelpers).runInContext(context);
 const keys=source.slice(source.indexOf("window.addEventListener('keydown'"),source.indexOf("window.addEventListener('blur'"));new vm.Script(keys).runInContext(context);
 return {context,controls,router,handlers,get clears(){return clears;},event(code,target={tagName:'CANVAS'},repeat=false){return {code,target,repeat,preventDefault(){prevented++;},stopImmediatePropagation(){}};},get prevented(){return prevented;}};
}
test('actual keyboard handler reserves Enter/Space and remapped skills for focused UI',()=>{
 const h=keyboardHarness();h.controls.bindings.hammer=['Enter'];
 for(const tagName of ['BUTTON','INPUT','SELECT','TEXTAREA'])for(const code of ['Space','Enter','KeyW','KeyR','KeyF'])h.handlers.keydown(h.event(code,{tagName}));
 assert.equal(h.router.snapshot(h.controls).charge,false);assert.equal(h.router.snapshot(h.controls).hammer,false);assert.equal(h.router.snapshot(h.controls).attack,false);assert.deepEqual(h.router.snapshot(h.controls).move,{x:0,y:0});assert.equal(h.prevented,0);
 h.handlers.keydown(h.event('Space',{tagName:'BUTTON'},true));assert.equal(h.prevented,1);h.handlers.keydown(h.event('Tab',{tagName:'BUTTON'}));assert.equal(h.prevented,1);
 h.context.modal.hidden=false;h.handlers.keydown(h.event('Space'));assert.equal(h.router.snapshot(h.controls).charge,false);
 h.context.modal.hidden=true;h.handlers.keydown(h.event('Enter'));assert.equal(h.router.snapshot(h.controls).hammer,true);
});
test('actual focus and keyup handlers clear old held keys and allow a fresh canvas press',()=>{
 const h=keyboardHarness();h.handlers.keydown(h.event('KeyW'));assert.equal(h.router.snapshot(h.controls).move.y,-1);h.handlers.focusin({target:{tagName:'BUTTON'}});assert.deepEqual(h.router.snapshot(h.controls).move,{x:0,y:0});h.handlers.keyup(h.event('KeyW'));h.handlers.keydown(h.event('KeyW'));assert.equal(h.router.snapshot(h.controls).move.y,-1);h.handlers.keyup(h.event('KeyW'));assert.deepEqual(h.router.snapshot(h.controls).move,{x:0,y:0});
});

test('holding Escape never dismisses the pause it just opened',()=>{
 for(const startTarget of [{tagName:'CANVAS'},{tagName:'BUTTON'}]){
  const h=keyboardHarness();let toggles=0;h.context.immediateAction=action=>{assert.equal(action,'pause');toggles++;h.context.paused=!h.context.paused;h.context.modal.hidden=!h.context.paused;h.handlers.focusin({target:{tagName:h.context.paused?'BUTTON':'CANVAS'}});};
  h.handlers.keydown(h.event('Escape',startTarget));assert.equal(h.context.paused,true);assert.equal(toggles,1);
  for(let i=0;i<12;i++)h.handlers.keydown(h.event('Escape',{tagName:'BUTTON'},true));assert.equal(h.context.paused,true);assert.equal(toggles,1);
  h.handlers.keyup(h.event('Escape',{tagName:'BUTTON'}));h.handlers.keydown(h.event('Escape',{tagName:'BUTTON'}));assert.equal(h.context.paused,false);assert.equal(toggles,2);
 }
});
