import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {runInNewContext} from 'node:vm';
import {buildWorld} from '../../.agents/skills/diorama-worlds/scripts/build-world.mjs';
const implementation=await import('../src/visual-controls.js').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e;});
class Element {
 constructor(tag='div'){this.tagName=tag;this.children=[];this.events=new Map();this.attributes={};this.value='';}
 append(...children){for(const child of children){child.parent=this;this.children.push(child);}}
 setAttribute(k,v){this.attributes[k]=String(v);} getAttribute(k){return this.attributes[k]??null;}
 addEventListener(k,f){this.events.set(k,f);} removeEventListener(k,f){if(this.events.get(k)===f)this.events.delete(k);}
 emit(k){this.events.get(k)?.({target:this});} remove(){this.parent.children=this.parent.children.filter(c=>c!==this);}
}
const document={createElement:tag=>new Element(tag)};
const defaults={enabled:false,quality:'auto',toneMapping:'neutral',exposure:1,bloomEnabled:true,bloomStrength:.2,bloomRadius:.4,bloomThreshold:1.2,saturation:1,contrast:1,warmth:0};
function setup(available=true){
 const state={settings:{...defaults},finish:'miniature',time:67,paused:true,speed:2,effective:{enabled:false,quality:'low',hdr:false,bloom:false,samples:0,pixelRatio:1,reason:'hdr-unavailable'}};
 const runtime={getVisualSettings:()=>({...state.settings}),setVisualSettings:partial=>Object.assign(state.settings,partial),stats:()=>({...state,visual:{...state.settings,effective:state.effective}})};
 const container=new Element(),viewport=new Element();
 assert.equal(typeof implementation.attachVisualControls,'function','visual controls module must exist');
 const ui=implementation.attachVisualControls({container,runtime:available?runtime:null,document,viewport});
 return {state,runtime,container,viewport,ui};
}
test('native collapsed panel exposes labeled presets and every bounded control',()=>{
 const {ui}=setup();assert.equal(ui.root.tagName,'details');assert.equal(ui.summary.textContent,'비주얼 품질');assert.notEqual(ui.root.open,true);
 assert.deepEqual(ui.preset.children.map(c=>[c.value,c.textContent]),[['original','원본'],['soft','부드럽게'],['vivid','선명하게'],['custom','직접 설정']]);
 for(const [name,min,max] of [['exposure',.25,2],['bloomStrength',0,.8],['bloomRadius',0,1],['bloomThreshold',.5,3],['saturation',0,1.5],['contrast',.5,1.5],['warmth',-.2,.2]]){
  const input=ui.controls[name];assert.equal(input.type,'range');assert.equal(Number(input.min),min);assert.equal(Number(input.max),max);assert.ok(input.getAttribute('aria-label'));
 }ui.dispose();
});
test('presets and individual edits change only visuals and retain node identity',()=>{
 const {ui,state}=setup(),input=ui.controls.exposure;ui.preset.value='soft';ui.preset.emit('change');assert.equal(state.settings.enabled,true);assert.equal(state.settings.toneMapping,'agx');
 input.value='1.35';input.emit('input');assert.equal(state.settings.exposure,1.35);assert.equal(ui.controls.exposure,input);assert.equal(ui.preset.value,'custom');
 ui.controls.enabled.checked=false;ui.controls.enabled.emit('change');assert.equal(state.settings.enabled,false);
 assert.equal(state.time,67);assert.equal(state.paused,true);assert.equal(state.speed,2);ui.dispose();
});
test('non-miniature finish disables effect editing without losing choices',()=>{
 const {ui,state}=setup();ui.preset.value='vivid';ui.preset.emit('change');const before={...state.settings};state.finish='pixel';ui.refresh();
 for(const control of [ui.preset,...Object.values(ui.controls)])assert.equal(control.disabled,true);
 assert.match(ui.status.textContent,/Miniature|미니어처/);ui.controls.exposure.value='2';ui.controls.exposure.emit('input');assert.deepEqual(state.settings,before);
 state.finish='miniature';ui.refresh();assert.equal(ui.controls.exposure.disabled,false);assert.equal(ui.controls.exposure.value,String(before.exposure));ui.dispose();
});
test('fallback status remains truthful and no-runtime controls are inert',()=>{
 const {ui}=setup(false);for(const control of [ui.preset,...Object.values(ui.controls)])assert.equal(control.disabled,true);assert.match(ui.status.textContent,/3D 사용 불가/);ui.dispose();
 const active=setup();active.ui.controls.enabled.checked=true;active.ui.controls.enabled.emit('change');assert.match(active.ui.status.textContent,/HDR/);assert.match(active.ui.status.textContent,/지원|제한|대체/);active.ui.dispose();
});
test('resize refresh and disposal leave no listeners or scene mutations',()=>{
 const {ui,container,viewport,state}=setup();state.effective.quality='balanced';viewport.emit('resize');assert.match(ui.status.textContent,/균형|balanced/);
 ui.dispose();ui.dispose();assert.equal(container.children.length,0);assert.equal(viewport.events.size,0);for(const control of [ui.preset,...Object.values(ui.controls)])assert.equal(control.events.size,0);
});
test('gallery wires mount, finish refresh, disposal and every authored standalone build',async()=>{
 const main=await readFile(new URL('../src/main.js',import.meta.url),'utf8'),build=await readFile(new URL('../build.mjs',import.meta.url),'utf8');
 assert.match(main,/attachVisualControls\(/);assert.match(main,/setFinish\(e.target.value\);\s*visualControls\?\.refresh\(\)/);assert.ok((main.match(/visualControls\?\.dispose\(\)/g)||[]).length>=3);
 const calls=build.split('\n').filter(l=>l.startsWith('await buildWorld'));assert.equal(calls.length,10);for(const line of calls)assert.match(line,/visualModule/);
});
async function standalone({available=true,enabled=true}={}){
 let entry,ui;const dir=await mkdtemp(join(tmpdir(),'visual-entry-'));
 try{
 await buildWorld(resolve(import.meta.dirname,'../src/harbor.js'),join(dir,'world.html'),{visualModule:enabled?resolve(import.meta.dirname,'../src/visual-controls.js'):null,bundler:{build:async options=>{entry=options.stdin.contents;return {outputFiles:[{text:''}]};}}});
 const {runtime,state}=setup(),elements=new Map(),events=new Map();const find=k=>{if(!elements.has(k))elements.set(k,new Element());return elements.get(k);};runtime.setFinish=f=>{state.finish=f;};runtime.dispose=()=>{state.disposed=true;};
 const context={definition:{name:'test',title:'Test',description:'test'},mountWorld:()=>available?runtime:null,FINISHES:['miniature','pixel'],URLSearchParams,location:{search:'',origin:'https://example.test'},document:{...document,querySelector:find,documentElement:{classList:{add(){}}}},addEventListener:(n,f)=>{const list=events.get(n)??[];list.push(f);events.set(n,list);},attachVisualControls:args=>(ui=implementation.attachVisualControls({...args,document,viewport:new Element()}))};context.window=context.parent=context;
 runInNewContext(entry.replace(/^import .*;$/gm,''),context);return {entry,ui,state,find,events};
 }finally{await rm(dir,{recursive:true,force:true});}
}
test('standalone mounts optional controls, refreshes finish and preserves BFCache lifecycle',async()=>{
 const {ui,find,events,state}=await standalone();assert.ok(ui);find('#finish').value='pixel';find('#finish').emit('change');assert.equal(ui.controls.exposure.disabled,true);
 for(const f of events.get('pagehide'))f({persisted:true});assert.ok(ui.preset.events.size);assert.notEqual(state.disposed,true);
 for(const f of events.get('pagehide'))f({persisted:false});assert.equal(ui.preset.events.size,0);assert.equal(state.disposed,true);
 const fallback=await standalone({available:false});assert.ok(fallback.ui);assert.equal(fallback.ui.controls.enabled.disabled,true);
 const legacy=await standalone({enabled:false});assert.equal(legacy.ui,undefined);assert.doesNotMatch(legacy.entry,/attachVisualControls/);
});

test('runtime visual notifications refresh final profiles after resize and context recovery, then unsubscribe',()=>{
 const {runtime,state,ui:initial}=setup();initial.dispose();const container=new Element(),viewport=new Element();let listener=null,unsubscribed=0;
 runtime.onVisualChange=callback=>{listener=callback;return ()=>{listener=null;unsubscribed++;};};
 const ui=implementation.attachVisualControls({container,runtime,document,viewport});
 assert.equal(typeof listener,'function','subscribe to completed runtime visual updates');
 assert.equal(viewport.events.size,0,'runtime notifications replace the premature window resize listener');
 viewport.emit('resize');state.effective={...state.effective,quality:'high',hdr:true,bloom:true,reason:null};listener();
 assert.match(ui.status.textContent,/높음/);assert.match(ui.status.textContent,/HDR 사용/);
 state.effective={...state.effective,quality:'low',hdr:false,bloom:false,reason:'HDR unavailable after context restoration'};listener();
 assert.match(ui.status.textContent,/HDR 미사용/);assert.match(ui.status.textContent,/지원|제한|대체/);
 const staleListener=listener;ui.dispose();ui.dispose();assert.equal(unsubscribed,1);assert.equal(listener,null);
 const text=ui.status.textContent;state.effective.hdr=true;staleListener();assert.equal(ui.status.textContent,text);
});
