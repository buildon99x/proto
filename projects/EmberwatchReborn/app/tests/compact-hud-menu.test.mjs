import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {hotbarLayout,applyHotbarLayout} from '../src/hotbar-layout.js';
import {createState,reduceRuntime} from '../src/state.js';
import {createMainInputFixture,mainInputSource} from './support/main-input-fixture.mjs';

// Production layout + HUD/menu handlers, with DOM focus/style boundary probes.
// These assertions do not stand in for rendered-pixel, browser or touch QA.
const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
function fn(name){
 const start=new RegExp(`(?:async )?function ${name}\\(`).exec(source);assert.ok(start,name);
 for(let end=source.indexOf('}',start.index);end>=0;end=source.indexOf('}',end+1)){
  const body=source.slice(start.index,end+1);
  try{new vm.Script('('+body+')');return body;}catch(error){if(!(error instanceof SyntaxError))throw error;}
 }
 throw Error('Incomplete handler '+name);
}
const declaration=name=>source.split('\n').find(row=>row.startsWith(`const ${name}=`));
function node(){const props=new Map();return {innerHTML:'',hidden:false,disabled:false,attributes:{},writes:0,
 setAttribute(name,value){this.attributes[name]=String(value);},classList:{remove(){},toggle(){}},
 style:{setProperty(name,value){props.set(name,value);},getPropertyValue:name=>props.get(name)??''},props};}
function harness({width=889,version=4,run='combined',dead=false,candidate=true}={}){
 const imports=createMainInputFixture();let state=reduceRuntime(createState(),{type:'trainStarter',position:{x:260,y:325}}).state;
 if(version>=4){let controls=imports.poeControlPreset(state.options.controls,'wasd',run);if(version===5)controls=imports.enableSkillLoadout(controls,{skills:state.character.skills,actionSlots:state.actionSlots});state=reduceRuntime(state,{type:'setControls',controls}).state;}
 const elements=new Map(),$=id=>{if(!elements.has(id))elements.set(id,node());return elements.get(id);};
 const actions=['attack','hammer','charge','block','heal','judgement','expert1','expert2','dodgeSprint','dodgeOnly','sprint','potion'];
 const buttons=Object.fromEntries(actions.map(action=>[action,node()]));$('hotbar').querySelector=selector=>buttons[/data-(?:combat|action)="([^"]+)"/.exec(selector)?.[1]];
 let focused=null,checkpoints=0,cleared=0;
 const modal={...node(),hidden:true,querySelector(selector){const wanted=selector.includes('data-action="close"')?'close':this.innerHTML.match(/<button data-action="([^"]+)"/)?.[1];if(!wanted||!this.innerHTML.includes(`data-action="${wanted}"`))return null;return {focus(options){focused={action:wanted,options};}};}};
 const canvas={width,height:561,focus(){focused={action:'canvas'};}};
 const env={...imports,state,battle:imports.createBattle(state),controller:{},$,canvas,modal,expertSafety:null,gate:imports.createRuntimeGate(),candidate,
  paused:false,captureBinding:null,pauseReason:'',lastObjectiveHtml:'',profile:'compact-qa-'+('long-profile-'.repeat(15)),last:0,
  displayTime:0,combatTime:0,walkTime:0,menuTime:0,arrivalWaitTime:0,focusEvents:{},
  document:{visibilityState:'visible',hasFocus:()=>true},clearInput(){cleared++;},audio:{pause(){}},dispatch(){checkpoints++;},report:()=>({})};
 if(dead){env.state.world.lifeDown=true;env.battle.p.hp=0;}
 const handlers=['updateHud','panel','closePanel','showMenu','help'];
 const ui=new Function(...Object.keys(env),[mainInputSource,...['config','keyName','tierLabel','esc','button','BUILD_LABEL'].map(declaration),...handlers.map(fn),`return {${handlers.join(',')},get state(){return state},get battle(){return battle},get paused(){return paused}};`].join('\n'))(...Object.values(env));
 return {ui,buttons,modal,canvas,hud:$('hud'),gate:env.gate,get focused(){return focused},get checkpoints(){return checkpoints},get cleared(){return cleared}};
}
for(const width of [320,375,520,581,582,700,750,889,900,1180])test(`balanced layout keeps six actions readable within ${width}px`,()=>{
 const l=hotbarLayout({width,count:6});assert.ok(l.width<=width-24);assert.ok((l.width-6*(l.columns-1))/l.columns>=88);assert.equal(l.columns*l.rows>=6,true);assert.equal(l.rows,width>=582?1:2);assert.equal(l.columns,width>=582?6:3);
});
test('eleven actions at compact width have a balanced 6+5 layout, never 9+2',()=>{
 const l=hotbarLayout({width:889,count:11});assert.equal(l.rows,2);assert.equal(l.columns,6);assert.equal(l.stack,162);
});
test('style application is presentation-only and skips unchanged writes',()=>{
 const hud=node();let writes=0;const set=hud.style.setProperty;hud.style.setProperty=(...args)=>{writes++;set(...args);};
 assert.deepEqual(applyHotbarLayout(hud,{width:889,count:6}),{rows:1,columns:6,width:702,stack:84});assert.equal(writes,3);
 applyHotbarLayout(hud,{width:889,count:6});assert.equal(writes,3);applyHotbarLayout(hud,{width:375,count:6});assert.equal(writes,6);
});
for(const [version,run,count] of [[3,'legacy',5],[4,'combined',6],[4,'separate',7],[5,'combined',10],[5,'separate',11]])test(`actual v${version}/${run} HUD lays out only ${count} visible actions without state changes`,()=>{
 const h=harness({version,run}),before=JSON.stringify({state:h.ui.state,battle:h.ui.battle});h.ui.updateHud();
 const visible=Object.values(h.buttons).filter(button=>!button.hidden);assert.equal(visible.length,count);
 const l=hotbarLayout({width:889,count});assert.equal(h.hud.props.get('--hotbar-columns'),String(l.columns));assert.equal(h.hud.props.get('--hotbar-stack'),l.stack+'px');assert.equal(JSON.stringify({state:h.ui.state,battle:h.ui.battle}),before);
 h.canvas.width=375;h.ui.updateHud();assert.equal(h.hud.props.get('--hotbar-columns'),String(hotbarLayout({width:375,count}).columns));assert.equal(Object.values(h.buttons).filter(button=>!button.hidden).length,count);
});
test('actual dead HUD preserves the same compact grid and disabled lifecycle labels',()=>{
 const h=harness({dead:true});h.ui.updateHud();assert.equal(h.hud.props.get('--hotbar-columns'),'6');
 for(const button of Object.values(h.buttons).filter(button=>!button.hidden)){assert.equal(button.disabled,true);assert.match(button.attributes['aria-label'],/쓰러짐 · 행동 불가/);}
});
for(const candidate of [false,true])test(`actual ${candidate?'candidate':'release'} pause starts with four primary actions before long profile and optional details`,()=>{
 const h=harness({candidate});h.ui.showMenu();const html=h.modal.innerHTML;
 assert.deepEqual([...html.matchAll(/<button data-action="([^"]+)"/g)].slice(0,4).map(m=>m[1]),['close','save','controls','leave']);
 assert.ok(html.indexOf('data-action="close"')<html.indexOf('compact-qa-'));assert.ok(html.indexOf('data-action="help"')<html.indexOf('<details'));
 assert.equal((html.match(/<details class="pause-details">/g)||[]).length,2);assert.equal((html.match(/<details class="pause-details" open>/g)||[]).length,1);assert.match(html,/<details class="pause-details" open><summary>능력치/);
 assert.equal(h.focused.action,'close');assert.equal(h.ui.paused,true);assert.equal(h.modal.hidden,false);assert.ok(h.cleared>0);
 for(const action of ['attribute:strength','attribute:dexterity','attribute:intelligence','input-observations'])assert.ok(html.includes(`data-action="${action}"`));
 for(const option of ['masterVolume','screenShake','flashes'])assert.ok(html.includes(`data-option="${option}"`));
 assert.equal(html.includes('data-action="observe-panel"'),candidate);
});
test('actual help and repeated return keep bindings intact and restore first-action focus',()=>{
 const h=harness(),before=structuredClone(h.ui.state.options.controls);h.ui.showMenu();h.ui.help();assert.match(h.modal.innerHTML,/조작과 전투/);assert.match(h.modal.innerHTML,/data-action="menu"/);assert.match(h.modal.innerHTML,/data-action="controls"/);
 h.ui.showMenu();assert.equal(h.focused.action,'close');h.ui.closePanel();assert.equal(h.ui.paused,false);assert.equal(h.focused.action,'canvas');assert.equal(h.modal.hidden,true);
 h.ui.showMenu();assert.equal(h.focused.action,'close');assert.deepEqual(h.ui.state.options.controls,before);
});
test('actual uncertain-save gate replaces primary actions rather than allowing resume',()=>{
 const h=harness();h.gate.block('fixture uncertain commit');h.ui.showMenu();assert.match(h.modal.innerHTML,/저장을 확인해야 합니다/);assert.equal(h.modal.innerHTML.includes('data-action="close"'),false);assert.equal(h.focused.action,'reload');h.ui.closePanel();assert.equal(h.ui.paused,true);assert.equal(h.modal.hidden,false);
});
test('CSS uses adaptive columns and readable 72px HUD targets without five-column overrides',()=>{
 const css=readFileSync(new URL('../src/style.css',import.meta.url),'utf8');assert.match(css,/grid-template-columns:repeat\(var\(--hotbar-columns,6\),minmax\(0,1fr\)\)/);assert.equal(css.includes('grid-template-columns:repeat(5'),false);assert.match(css,/height:72px;min-height:72px/);assert.match(css,/\.pause-actions button,\.pause-secondary button\{min-height:44px\}/);assert.match(css,/#hotbar button\[hidden\]\{display:none\}/);assert.match(css,/max-height:calc\(100dvh - 24px\)/);
});
