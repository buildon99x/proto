import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createState,reduceRuntime} from '../src/state.js';
import {createMainInputFixture,mainInputSource} from './support/main-input-fixture.mjs';

// Real production panel/help/menu/input handlers and real binding validation.
// DOM focus, element visibility and native scroll calls are boundary probes;
// they are not a rendered-screen, AX or screen-reader acceptance claim.
const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
function fn(name){
 const start=new RegExp(`(?:async )?function ${name}\\(`).exec(source);assert.ok(start,name);
 for(let end=source.indexOf('}',start.index);end>=0;end=source.indexOf('}',end+1)){
  const body=source.slice(start.index,end+1);try{new vm.Script('('+body+')');return body;}catch(error){if(!(error instanceof SyntaxError))throw error;}
 }
 throw Error('Incomplete production handler '+name);
}
const declaration=name=>source.split('\n').find(row=>row.startsWith(`const ${name}=`));
const cut=(a,b)=>source.slice(source.indexOf(a),source.indexOf(b,source.indexOf(a)));
function fixture(){
 const imports=createMainInputFixture();let state=reduceRuntime(createState(),{type:'trainStarter',position:{x:260,y:325}}).state;
 state=reduceRuntime(state,{type:'setControls',controls:imports.poeControlPreset(state.options.controls,'wasd','combined')}).state;
 const events={},calls=[],props=new Map();let active=null,html='',nodes=[];
 const document={visibilityState:'visible',hidden:false,hasFocus:()=>true,get activeElement(){return active},addEventListener:(name,handler)=>events[name]=handler};
 function element(name,{tag='BUTTON',disabled=false,hidden=false,tabIndex=0,collapsed=false,inHud=false}={}){
  return {name,tagName:tag,disabled,hidden,tabIndex,isConnected:true,ownerDocument:document,attributes:{},focusOptions:[],scrollCalls:[],
   focus(options){active=this;this.focusOptions.push(options);calls.push(['focus',name]);},
   scrollIntoView(options){this.scrollCalls.push(options);},getClientRects(){return hidden||collapsed?[]:[{}];},
   getAttribute(key){return this.attributes[key]??null;},setAttribute(key,value){this.attributes[key]=String(value);if(key==='tabindex')this.tabIndex=Number(value);},
   matches(selector){return selector===':disabled'?this.disabled:false;},closest(selector){if(selector==='[data-action]')return this.dataset?.action?this:null;if(selector==='#hud')return inHud?{id:'hud'}:null;return this.hidden&&selector.includes('[hidden]')?this:null;}};
 }
 const canvas=element('canvas',{tag:'CANVAS',tabIndex:-1}),trigger=element('menu-trigger',{inHud:true}),potion=element('background-potion');active=trigger;props.set('menuButton',trigger);props.set('touchInteract',element('touch-interact'));potion.dataset={action:'potion'};
 const section=element('dialog-section',{tag:'SECTION',tabIndex:-1});section.scrollTop=0;
 const modal={hidden:true,ownerDocument:document,presentationEpoch:0,contains(el){return el===section||nodes.includes(el);},
  get innerHTML(){return html},set innerHTML(value){for(const n of nodes)n.isConnected=false;html=value;nodes=[];section.attributes={};
   const attrs=/<section\b([^>]*)>/.exec(value)?.[1]??'';for(const [,name,value] of attrs.matchAll(/([\w-]+)="([^"]*)"/g))section.setAttribute(name,value);
   for(const m of value.matchAll(/<(button|input|select|textarea|summary|a)\b([^>]*)>/g)){const tag=m[1].toUpperCase(),attrs=m[2],action=/data-action="([^"]+)"/.exec(attrs)?.[1],name=action??/id="([^"]+)"/.exec(attrs)?.[1]??tag;const n=element(name,{tag,disabled:/\bdisabled\b/.test(attrs),hidden:/\bhidden\b/.test(attrs)});n.dataset={action};nodes.push(n);}
  },querySelector(selector){if(selector.includes('data-action="close"'))return nodes.find(n=>n.name==='close'&&!n.disabled)??null;if(selector.includes('data-dialog-initial'))return null;if(selector==='.panel'||selector.includes('role="dialog"'))return section;return nodes.find(n=>!n.disabled&&!n.hidden)??null;},
  querySelectorAll(){return nodes;}};
 const env={...imports,state,battle:imports.createBattle(state),controller:{},modal,canvas,document,window:{addEventListener:(name,handler)=>events[name]=handler},expertSafety:null,gate:imports.createRuntimeGate(),
  paused:false,captureBinding:null,suppressNextClick:false,last:0,profile:'dialog-qa',candidate:true,saveNamespace:'qa-r14',pauseReason:'',busy:false,
  displayTime:0,combatTime:0,walkTime:0,menuTime:0,arrivalWaitTime:0,focusEvents:{},
  clearInput(){calls.push(['clear']);},audio:{cancel(){},pause(value){calls.push(['audio',value]);}},dispatch(command){calls.push(['save',command]);return Promise.resolve(true);},report:()=>({}),toast(){},
  acceptCombatPress(action,token){calls.push(['accepted',action,token]);},applyBinding(token){calls.push(['bind',token]);},$:id=>props.get(id),interact(){},deferredImmediate:imports.createImmediateInput(),router:imports.createInputRouter()};
 const handlers=['panel','closePanel','showMenu','help','showControls','immediateAction'];
 const ui=new Function(...Object.keys(env),[mainInputSource,...['config','keyName','tierLabel','esc','button','BUILD_LABEL'].map(declaration),...handlers.map(fn),cut("document.addEventListener('click',","$('menuButton').onclick"),source.split('\n').find(s=>s.startsWith("$('menuButton').onclick")),cut("window.addEventListener('keydown'","window.addEventListener('keyup'"),...['document.addEventListener(\'focusin\'','window.addEventListener(\'blur\'','document.addEventListener(\'visibilitychange\''].map(prefix=>source.split('\n').find(s=>s.startsWith(prefix))),`return {${handlers.join(',')},get paused(){return paused},get state(){return state},set capture(value){captureBinding=value},get capture(){return captureBinding}};`].join('\n'))(...Object.values(env));
 function key(code,extra={}){let prevented=false,stopped=false;const e={code,key:code,target:active,repeat:false,shiftKey:false,ctrlKey:false,altKey:false,metaKey:false,preventDefault(){prevented=true},stopImmediatePropagation(){stopped=true},...extra};events.keydown(e);return {prevented,stopped};}
 return {ui,modal,section,trigger,canvas,potion,gate:env.gate,router:env.router,calls,document,key,element,events,async click(target,detail=1){if(typeof target==='string')target=nodes.find(n=>n.name===target);assert.ok(target);return events.click({target,detail,preventDefault(){},stopPropagation(){}});},async change(dataset,value){return events.change({target:{dataset,value}});},get active(){return active},get nodes(){return nodes},replaceNodes(value){nodes=value;},focusOutside(){active=potion;events.focusin({target:potion});}};
}
test('actual help puts its first focused controls/return actions before long guidance',()=>{
 const h=fixture();h.ui.help();const html=h.modal.innerHTML;assert.ok(html.indexOf('data-action="controls"')<html.indexOf('class="controls"'));assert.ok(html.indexOf('data-action="menu"')<html.indexOf('class="controls"'));assert.equal(h.active.name,'controls');
});
test('actual panel marks a labeled modal dialog and permits native initial-focus scrolling',()=>{
 const h=fixture();h.ui.panel('검사 제목','<p>Long content</p><button data-action="done">Done</button>');assert.equal(h.section.attributes.role,'dialog');assert.equal(h.section.attributes['aria-modal'],'true');assert.equal(h.section.attributes['aria-labelledby'],'dialog-title');assert.match(h.modal.innerHTML,/<h2 id="dialog-title">검사 제목<\/h2>/);assert.equal(h.active.focusOptions.at(-1)?.preventScroll,false);assert.deepEqual(h.active.scrollCalls.at(-1),{block:'nearest',inline:'nearest'});
});
for(const reverse of [false,true])test(`actual modal ${reverse?'Shift+Tab':'Tab'} wraps at its ${reverse?'first':'last'} control`,()=>{
 const h=fixture();h.ui.panel('순환','<button data-action="first">First</button><button data-action="last">Last</button>');const [first,last]=h.nodes;(reverse?first:last).focus();const e=h.key('Tab',{shiftKey:reverse});assert.equal(e.prevented,true);assert.equal(h.active,reverse?last:first);assert.notEqual(h.active,h.potion);
});
test('actual controls screen Shift+Tab never reaches the background potion',()=>{
 const h=fixture();h.ui.showControls();const first=h.active,last=h.nodes.filter(n=>!n.disabled).at(-1);assert.equal(first.name,'poe-preset:wasd:combined');const e=h.key('Tab',{shiftKey:true});assert.equal(e.prevented,true);assert.equal(h.active,last);assert.equal(h.active.name,'menu');
});
test('actual Tab cycle excludes hidden, disabled and closed-details descendants',()=>{
 const h=fixture();h.ui.panel('순환','<button data-action="first">First</button>');const first=h.nodes[0],hidden=h.element('hidden',{hidden:true}),disabled=h.element('disabled',{disabled:true}),closed=h.element('closed',{collapsed:true}),last=h.element('last');h.replaceNodes([first,hidden,disabled,closed,last]);last.focus();assert.equal(h.key('Tab').prevented,true);assert.equal(h.active,first);first.focus();assert.equal(h.key('Tab',{shiftKey:true}).prevented,true);assert.equal(h.active,last);
});
test('actual interior Tab uses native navigation without unnecessary interception',()=>{
 const h=fixture();h.ui.panel('순환','<button data-action="first">First</button><button data-action="middle">Middle</button><button data-action="last">Last</button>');h.nodes[1].focus();assert.equal(h.key('Tab').prevented,false);assert.equal(h.key('Tab',{shiftKey:true}).prevented,false);
});
for(const modifier of ['ctrlKey','altKey','metaKey'])test(`actual modal preserves browser ${modifier}+Tab`,()=>{
 const h=fixture();h.ui.panel('순환','<button data-action="only">Only</button>');assert.equal(h.key('Tab',{[modifier]:true}).prevented,false);
});
test('actual Escape restores the usable menu-button trigger and resumes only once',()=>{
 const h=fixture();h.ui.showMenu();assert.equal(h.active.name,'close');const e=h.key('Escape');assert.equal(e.prevented,true);assert.equal(h.modal.hidden,true);assert.equal(h.ui.paused,false);assert.equal(h.active,h.trigger);assert.equal(h.active.focusOptions.at(-1)?.preventScroll,false);
});
test('actual nested menu/help/controls preserves the original background trigger',()=>{
 const h=fixture();h.ui.showMenu();h.ui.help();h.ui.showControls();h.ui.showMenu();h.key('Escape');assert.equal(h.active,h.trigger);assert.equal(h.modal.hidden,true);
});
for(const reason of ['removed','disabled','hidden'])test(`actual ${reason} original trigger falls back safely to canvas`,()=>{
 const h=fixture();h.ui.showMenu();if(reason==='removed')h.trigger.isConnected=false;if(reason==='disabled')h.trigger.disabled=true;if(reason==='hidden')h.trigger.hidden=true;h.key('Escape');assert.equal(h.active,h.canvas);assert.equal(h.modal.hidden,true);
});
test('actual reopened dialog replaces the old return target with the new trigger',()=>{
 const h=fixture();h.ui.showMenu();h.key('Escape');const second=h.element('second-trigger');second.focus();h.ui.showMenu();h.key('Escape');assert.equal(h.active,second);
});
test('actual focusin behind an open modal returns to an eligible dialog control',()=>{
 const h=fixture();h.ui.showMenu();h.focusOutside();assert.equal(h.active.name,'close');assert.equal(h.modal.hidden,false);assert.equal(h.ui.paused,true);
});
test('actual empty dialog retains Tab focus on its labeled section',()=>{
 const h=fixture();h.ui.panel('안내','<p>No buttons yet</p>');assert.equal(h.active,h.section);assert.equal(h.key('Tab').prevented,true);assert.equal(h.active,h.section);
});
test('actual uncertain-save dialog wraps its single Reload control and rejects Escape resume',()=>{
 const h=fixture();h.gate.block('fixture uncertain save');h.ui.showMenu();assert.equal(h.active.name,'reload');assert.equal(h.key('Tab',{shiftKey:true}).prevented,true);assert.equal(h.active.name,'reload');h.key('Escape');assert.equal(h.ui.paused,true);assert.equal(h.modal.hidden,false);assert.notEqual(h.active,h.trigger);
});
test('actual binding capture still accepts Tab as a key and Escape cancels to controls',()=>{
 const h=fixture();h.ui.panel('키 지정','<button data-action="controls">Cancel</button>');h.ui.capture={action:'attack',index:0};assert.equal(h.key('Tab').prevented,true);assert.ok(h.calls.some(([kind,token])=>kind==='bind'&&token==='Tab'));h.key('Escape');assert.equal(h.ui.capture,null);assert.equal(h.modal.hidden,false);assert.equal(h.ui.paused,true);assert.match(h.modal.innerHTML,/키 설정/);
});

for(const remapped of [false,true])test(`actual restored HUD trigger admits one fresh ${remapped?'remapped':'default'} game key on canvas`,()=>{
 const h=fixture();if(remapped)h.ui.state.options.controls.bindings.right=['KeyL'];const before=structuredClone(h.ui.state.options.controls);h.ui.showMenu();h.key('Escape');assert.equal(h.active,h.trigger);
 if(remapped){h.key('KeyD');assert.equal(h.active,h.trigger);assert.equal(h.router.isHeld('right'),false);}
 h.key(remapped?'KeyL':'KeyD');assert.equal(h.active,h.canvas);assert.equal(h.router.isHeld('right'),true);assert.ok(h.calls.some(([kind,action])=>kind==='accepted'&&action==='right'));assert.deepEqual(h.ui.state.options.controls,before);
});
for(const code of ['Enter','NumpadEnter','Space','Tab'])test(`actual restored HUD trigger preserves native ${code} without gameplay`,()=>{
 const h=fixture();h.ui.showMenu();h.key('Escape');const e=h.key(code);assert.equal(e.prevented,false);assert.equal(h.active,h.trigger);assert.equal(h.router.hasPendingCombat(),false);assert.equal(h.calls.some(([kind])=>kind==='accepted'),false);
});
for(const extra of [{ctrlKey:true},{altKey:true},{metaKey:true},{repeat:true}])test(`actual restored trigger rejects shortcut/repeat handoff ${JSON.stringify(extra)}`,()=>{
 const h=fixture();h.ui.showMenu();h.key('Escape');h.key('KeyD',extra);assert.equal(h.active,h.trigger);assert.equal(h.router.isHeld('right'),false);
});
test('actual arbitrary HUD-button focus never gains the one-shot resumed-game exception',()=>{
 const h=fixture();h.ui.showMenu();h.key('Escape');const other=h.element('other-hud-button',{inHud:true});other.focus();h.key('KeyD');assert.equal(h.active,other);assert.equal(h.router.isHeld('right'),false);
});
test('actual focus departure consumes resumed-trigger ownership even if the original button is refocused',()=>{
 const h=fixture();h.ui.showMenu();h.key('Escape');h.focusOutside();h.trigger.focus();h.key('KeyD');assert.equal(h.active,h.trigger);assert.equal(h.router.isHeld('right'),false);
});
for(const guard of ['blocked','dead'])test(`actual ${guard} state prevents restored-trigger game handoff`,()=>{
 const h=fixture();h.ui.showMenu();h.key('Escape');if(guard==='blocked')h.gate.block('fixture block');else h.ui.state.world.lifeDown=true;h.key('KeyD');assert.equal(h.active,h.trigger);assert.equal(h.router.isHeld('right'),false);
});
for(const tag of ['BODY','HTML'])test(`actual ${tag} origin restores canvas rather than an unfocusable page container`,()=>{
 const h=fixture(),origin=h.element('page-origin',{tag});origin.focus();h.ui.showMenu();h.key('Escape');assert.equal(h.active,h.canvas);
});
test('actual failed trigger focus falls back to canvas instead of falsely claiming restoration',()=>{
 const h=fixture();h.ui.showMenu();h.trigger.focus=()=>{};h.key('Escape');assert.equal(h.active,h.canvas);
});
test('actual Tab excludes a closed-details child even when its rectangle probe is nonempty',()=>{
 const h=fixture();h.ui.panel('상세','<button data-action="first">First</button>');const first=h.nodes[0],summary=h.element('summary',{tag:'SUMMARY'}),child=h.element('details-child');const details={tagName:'DETAILS',open:false,children:[summary,child],parentElement:null};summary.parentElement=child.parentElement=details;h.replaceNodes([first,summary,child]);first.focus();h.key('Tab',{shiftKey:true});assert.equal(h.active,summary);details.open=true;first.focus();h.key('Tab',{shiftKey:true});assert.equal(h.active,child);
});
test('actual Tab excludes nested closed details and a non-first summary',()=>{
 const h=fixture();h.ui.panel('상세','<button data-action="first">First</button>');const first=h.nodes[0],summary=h.element('summary',{tag:'SUMMARY'}),extra=h.element('extra-summary',{tag:'SUMMARY'}),nestedSummary=h.element('nested-summary',{tag:'SUMMARY'});const outer={tagName:'DETAILS',open:false,children:[summary,extra],parentElement:null},inner={tagName:'DETAILS',open:false,children:[nestedSummary],parentElement:outer};summary.parentElement=extra.parentElement=outer;nestedSummary.parentElement=inner;h.replaceNodes([first,summary,extra,nestedSummary]);first.focus();h.key('Tab',{shiftKey:true});assert.equal(h.active,summary);
});


// Production safety-stop menu/click/change routes; the DOM remains a boundary
// probe, not native pointer, layout, screen-reader or perceived-stall acceptance.
for(const source of ['blur','visibility'])test(`actual ${source} opens only the safety choice and focuses Continue`,()=>{
 const h=fixture();h.canvas.focus();if(source==='blur')h.events.blur();else{h.document.hidden=true;h.events.visibilitychange();}
 assert.equal(h.ui.paused,true);assert.equal(h.modal.safetyPause,true);assert.deepEqual(h.nodes.map(n=>n.name),['close','safety-menu']);assert.equal(h.active.name,'close');
 assert.equal(h.section.attributes.role,'dialog');assert.equal(h.section.attributes['aria-modal'],'true');assert.equal(h.section.attributes['aria-labelledby'],'dialog-title');
 assert.equal(h.calls.filter(([kind])=>kind==='save').length,1);assert.ok(h.calls.some(([kind,value])=>kind==='audio'&&value===true));
});
test('actual safety stop rejects fresh background and stale full-menu clicks before acknowledgement',async()=>{
 const h=fixture();h.ui.showMenu();const staleAttribute=h.nodes.find(n=>n.name==='attribute:strength'),staleContinue=h.nodes.find(n=>n.name==='close');h.ui.closePanel();h.events.blur();const html=h.modal.innerHTML,before=structuredClone(h.ui.state),saves=h.calls.filter(([kind])=>kind==='save').length;
 const actions=['attribute:strength','attribute:dexterity','attribute:intelligence','action-slots','assign-skill-slot','controls','save','leave','objective','journal','inventory','observe-panel','reload','qa-new','candidate-copy','menu'];
 for(const action of actions){const target=h.element(action);target.dataset={action};await h.click(target);}
 await h.click(staleAttribute);await h.click(staleContinue);await h.click(h.potion);
 assert.equal(h.modal.innerHTML,html);assert.equal(h.modal.safetyPause,true);assert.equal(h.ui.paused,true);assert.equal(h.calls.filter(([kind])=>kind==='save').length,saves);assert.deepEqual(h.ui.state,before);
});
test('actual safety stop blocks background HUD menu and immediate menu until explicit full-menu entry',()=>{
 const h=fixture();h.events.blur();const html=h.modal.innerHTML;h.trigger.onclick({type:'click'});h.ui.immediateAction('menu');h.ui.showMenu();assert.equal(h.modal.innerHTML,html);assert.equal(h.modal.safetyPause,true);
});
test('actual safety stop rejects option and binding changes before acknowledgement',async()=>{
 const h=fixture();h.events.blur();const before=structuredClone(h.ui.state),saves=h.calls.filter(([kind])=>kind==='save').length;
 await h.change({option:'masterVolume'},'0');await h.change({controlOption:'blockMode'},'toggle');await h.change({poeOption:'aimingMode'},'player');
 assert.equal(h.calls.filter(([kind])=>kind==='save').length,saves);assert.deepEqual(h.ui.state,before);assert.equal(h.modal.safetyPause,true);
});
for(const detail of [0,1])test(`actual safety full-menu choice accepts ${detail?'pointer':'keyboard'} activation without another checkpoint`,async()=>{
 const h=fixture();h.ui.state.character.attributePoints=1;h.events.blur();const saves=h.calls.filter(([kind])=>kind==='save').length,stale=h.nodes.find(n=>n.name==='safety-menu');await h.click(stale,detail);
 assert.equal(h.modal.safetyPause,false);assert.equal(h.ui.paused,true);assert.equal(h.active.name,'close');assert.ok(h.nodes.some(n=>n.name==='attribute:strength'));assert.ok(h.nodes.some(n=>n.name==='action-slots'));
 assert.equal(h.calls.filter(([kind])=>kind==='save').length,saves);await h.click(stale);assert.equal(h.calls.filter(([kind])=>kind==='save').length,saves);
 await h.click('attribute:strength');assert.ok(h.calls.some(([kind,command])=>kind==='save'&&command.type==='allocateAttribute'&&command.attribute==='strength'));
});
for(const method of ['click','Escape'])test(`actual safety ${method} resumes and restores canvas without opening full menu`,async()=>{
 const h=fixture();h.canvas.focus();h.events.blur();const saves=h.calls.filter(([kind])=>kind==='save').length;if(method==='click')await h.click('close');else h.key('Escape');
 assert.equal(h.modal.safetyPause,false);assert.equal(h.modal.hidden,true);assert.equal(h.ui.paused,false);assert.equal(h.active,h.canvas);assert.equal(h.calls.filter(([kind])=>kind==='save').length,saves);assert.ok(h.calls.some(([kind,value])=>kind==='audio'&&value===false));
 h.key('KeyD');assert.equal(h.router.isHeld('right'),true);
});
test('actual safety Tab and Shift+Tab remain in its two choices and focus cannot escape',()=>{
 const h=fixture();h.events.blur();const [resume,menu]=h.nodes;assert.equal(h.active,resume);assert.equal(h.key('Tab',{shiftKey:true}).prevented,true);assert.equal(h.active,menu);assert.equal(h.key('Tab').prevented,true);assert.equal(h.active,resume);
 h.focusOutside();assert.equal(h.active,resume);assert.equal(h.modal.safetyPause,true);
});
for(const code of ['Enter','NumpadEnter','Space'])test(`actual safety preserves first native ${code} activation and prevents held repeats`,()=>{
 const h=fixture();h.events.blur();assert.equal(h.key(code).prevented,false);assert.equal(h.key(code,{repeat:true}).prevented,true);assert.equal(h.calls.some(([kind])=>kind==='accepted'),false);assert.equal(h.modal.safetyPause,true);
});
test('actual repeated Escape cannot resume a safety dialog until a fresh press',()=>{
 const h=fixture();h.events.blur();h.key('Escape',{repeat:true});assert.equal(h.modal.safetyPause,true);assert.equal(h.ui.paused,true);h.key('Escape');assert.equal(h.ui.paused,false);assert.equal(h.modal.safetyPause,false);
});
for(const entry of ['keyboard','HUD'])test(`actual voluntary ${entry} pause still opens the complete menu directly`,async()=>{
 const h=fixture();if(entry==='keyboard'){h.canvas.focus();h.key('Escape');}else h.trigger.onclick({type:'click'});
 assert.equal(h.modal.safetyPause,false);assert.equal(h.ui.paused,true);assert.ok(h.nodes.some(n=>n.name==='attribute:strength'));assert.ok(h.nodes.some(n=>n.name==='controls'));assert.ok(!h.nodes.some(n=>n.name==='safety-menu'));await h.click('close');assert.equal(h.ui.paused,false);
});
test('actual save recovery supersedes a safety choice and still forbids Escape resume',()=>{
 const h=fixture();h.events.blur();h.gate.block('uncertain save');h.ui.panel('fault','');assert.equal(h.modal.safetyPause,false);assert.equal(h.active.name,'reload');assert.deepEqual(h.nodes.map(n=>n.name),['reload']);h.key('Escape');assert.equal(h.ui.paused,true);assert.equal(h.modal.hidden,false);
});
test('actual safety entry with an already blocked save renders recovery instead of unusable acknowledgement',()=>{
 const h=fixture();h.gate.block('uncertain save');h.events.blur();assert.equal(h.modal.safetyPause,false);assert.equal(h.active.name,'reload');h.key('Escape');assert.equal(h.ui.paused,true);
});
