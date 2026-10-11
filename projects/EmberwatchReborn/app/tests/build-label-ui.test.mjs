import {createMainInputFixture} from './support/main-input-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {createState} from '../src/state.js';
import {getRegion} from '../src/world.js';

// Actual UI and read-only registration handlers; DOM/audio are simple boundary
// probes. A shared display label does not replace build/publication verification.
const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const line=prefix=>{const found=source.split('\n').find(row=>row.startsWith(prefix));assert.ok(found,prefix);return found;};
const labelSource=line('const BUILD_LABEL='),label=runInNewContext(labelSource+'BUILD_LABEL');
const esc=String,button=(name,action)=>`<button data-action="${action}">${name}</button>`;
function harness(candidate){
 const panels=[],modal={hidden:true,innerHTML:''},hud={hidden:false};let checkpoints=0;
 const env={...createMainInputFixture(),state:createState(),battle:{},controller:{},candidate,saveNamespace:candidate?'qa-r9':'release',profile:'qa-label',pauseReason:'',modal,
  paused:false,esc,button,getRegion,panel:(title,html)=>panels.push({title,html}),dispatch:()=>checkpoints++,report:()=>({}),
  displayTime:0,combatTime:0,walkTime:0,menuTime:0,arrivalWaitTime:0,focusEvents:{},document:{visibilityState:'visible',hasFocus:()=>true},
  clearInput(){},audio:{pause(){}},$:()=>hud};
 runInNewContext([labelSource,line('function showMenu('),line('function showTitle('),'showMenu();showTitle();'].join('\n'),env);
 return {env,panels,modal,hud,checkpoints};
}
for(const candidate of [false,true])test(`actual ${candidate?'candidate':'release'} pause and title use the same single build label`,()=>{
 const h=harness(candidate);assert.match(label,/^R\d+[a-z]\d*$/);
 assert.ok(h.panels[0].html.includes(' · '+label));assert.ok(h.modal.innerHTML.includes('>'+label+' · POE형 전사 입력 개발 후보'));
 assert.equal(h.panels[0].html.includes('후보 격리 저장'),candidate);assert.equal(h.modal.innerHTML.includes('공개 QA 후보'),candidate);
 assert.equal(h.checkpoints,0);assert.equal(h.env.state,null);assert.equal(h.env.controller,null);assert.equal(h.hud.hidden,true);
});

test('optional read-only status registration reports the same build before and after loading',async()=>{
 let registered;const saved=createState(),before=structuredClone(saved);
 const env={...createMainInputFixture(),document:{modelContext:{registerTool:tool=>{registered=tool;}}},window:{addEventListener(){}},AbortController,
  state:saved,profile:'qa-label',paused:true,getRegion};
 runInNewContext(labelSource+'\n'+line('if(document.modelContext?.registerTool)'),env);
 assert.ok(registered);assert.equal(registered.annotations.readOnlyHint,true);
 assert.equal(registered.execute({}).version,label);assert.deepEqual(saved,before);
 env.state=null;const status=registered.execute({});assert.equal(status.started,false);assert.equal(status.version,label);
 assert.throws(()=>registered.execute({change:true}),/No arguments accepted/);
});

test('R14 app, project, index metadata and build kind share the same bounded candidate identity',()=>{
 const pkg=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8')),project=JSON.parse(readFileSync(new URL('../../project.json',import.meta.url),'utf8')),index=readFileSync(new URL('../src/index.html',import.meta.url),'utf8'),build=readFileSync(new URL('../scripts/build-r14.mjs',import.meta.url),'utf8');
 assert.equal(pkg.version,'0.14.0-reimplementation.11');assert.equal(project.version,pkg.version);assert.equal(project.id,'emberwatch-reborn');assert.equal(project.projectRoot,'projects/EmberwatchReborn');assert.ok(project.summary.includes(label));assert.ok(index.includes('Reborn '+label+':'));assert.ok(build.includes("kind:'"+label+' POE-style input candidate'));assert.match(build,/Browser\/FX\/play acceptance is independent of build/);
 assert.match(readFileSync(new URL('../scripts/build.mjs',import.meta.url),'utf8'),/Master, advanced gear, live repeat expeditions and whole campaign incomplete/);
});
