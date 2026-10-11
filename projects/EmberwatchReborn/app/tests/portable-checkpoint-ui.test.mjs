// Synthetic storage/file/DOM boundaries; every action uses the production
// mountRecoveryPage document handlers and, unless named, the real portable core.
// These are not native browser downloads, earned QA or visual acceptance.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {mountRecoveryPage,RECOVERY_BUILD} from '../src/recovery-page.js';
import {downloadPortableFile} from '../src/portable-checkpoint-ui.js';
import {exportPortableCheckpoint,inspectPortableCheckpoint,restorePortableCheckpoint,PORTABLE_CHECKPOINT_LIMIT} from '../src/portable-checkpoint.js';
import {createStore,profileKeys} from '../src/save.js';
import {createState,validateState} from '../src/state.js';
import {route} from './support/earned-route.mjs';

const SOURCE='qa-source',TARGET='qa-restored',NAMESPACE='qa-r12';
const decode=value=>value.replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
function dom(){
 const elements=new Map(),listeners={},windowListeners={},all=[];let html='';
 function node(tag,attributes={},text=''){
  const n={tagName:tag.toUpperCase(),id:attributes.id??'',value:attributes.value??'',disabled:Object.hasOwn(attributes,'disabled'),dataset:{},files:[],textContent:text,attributes,focus(){},remove(){const i=all.indexOf(this);if(i>=0)all.splice(i,1);if(elements.get(this.id)===this)elements.delete(this.id);},closest(selector){if(selector==='[data-action]')return this.dataset.action?this:null;if(selector==='a[href]')return this.tagName==='A'&&this.attributes.href?this:null;return null;},cloneNode(){const copy=node(tag,{...attributes},this.textContent);copy.dataset={...this.dataset};copy.disabled=this.disabled;copy.value=this.value;return copy;},replaceWith(replacement){if(elements.get(this.id)===this)elements.set(this.id,replacement);const i=all.indexOf(this);if(i>=0)all[i]=replacement;}};
  for(const [key,value]of Object.entries(attributes))if(key.startsWith('data-'))n.dataset[key.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=value;
  return n;
 }
 const modal={get innerHTML(){return html;},set innerHTML(value){html=value;elements.clear();elements.set('modal',modal);all.length=0;for(const match of value.matchAll(/<(input|button|select|p|a)\b([^>]*)>/g)){const attributes={};for(const a of match[2].matchAll(/([\w-]+)(?:="([^"]*)")?/g))attributes[a[1]]=decode(a[2]??'');const rest=value.slice(match.index+match[0].length),text=decode(rest.slice(0,rest.indexOf('<')));const n=node(match[1],attributes,text);all.push(n);if(n.id)elements.set(n.id,n);}},querySelector(){return all.find(n=>(n.tagName==='BUTTON'&&!n.disabled)||n.tagName==='INPUT');}};
 elements.set('modal',modal);
 const document={getElementById:id=>elements.get(id)??null,addEventListener:(name,fn)=>listeners[name]=fn,defaultView:{addEventListener:(name,fn)=>windowListeners[name]=fn}};
 return {document,modal,listeners,windowListeners,el:id=>elements.get(id),action:action=>all.find(n=>n.dataset.action===action),link:()=>all.find(n=>n.tagName==='A')};
}
function memory(){const data=new Map(),reads=[],writes=[];return {data,reads,writes,getItem(key){reads.push(key);return data.get(key)??null;},setItem(key,value){writes.push(key);data.set(key,value);},get length(){assert.fail('no enumeration');},key(){assert.fail('no enumeration');},removeItem(){assert.fail('no cleanup');},clear(){assert.fail('no cleanup');}};}
function mutex(){const tails=new Map(),calls=[];return {calls,async request(name,options,callback){calls.push([name,options]);const before=tails.get(name)??Promise.resolve();let release;const after=new Promise(resolve=>release=resolve);tails.set(name,before.then(()=>after));await before;try{return await callback();}finally{release();}}};}
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}
async function tick(){await new Promise(resolve=>setImmediate(resolve));}
function setup({namespace=NAMESPACE,pathname=`/${namespace}/recovery`,state=createState(),portableOptions={},storage=memory(),locks=mutex(),seed=true,...extra}={}){
 if(seed)assert.equal(createStore(storage,{profile:SOURCE,namespace}).save(state,{expectedRevision:0}).ok,true);
 storage.reads&&(storage.reads.length=0);storage.writes&&(storage.writes.length=0);
 const d=dom(),downloads=[],inspectCalls=[],restoreCalls=[],exportCalls=[],defaultOptions={
  download:(text,filename)=>downloads.push({text,filename}),
  async exportCheckpoint(s,l,args){exportCalls.push(args);return exportPortableCheckpoint(s,l,args);},
  async inspectCheckpoint(text){inspectCalls.push(text);return inspectPortableCheckpoint(text);},
  async restoreCheckpoint(s,l,args){restoreCalls.push(args);return restorePortableCheckpoint(s,l,args);},...portableOptions};
 const info=mountRecoveryPage({document:d.document,storage,locks,pathname,portableOptions:defaultOptions,...extra});
 const h={...d,info,storage,locks,downloads,inspectCalls,restoreCalls,exportCalls,
  click(target){const n=typeof target==='string'?d.action(target):target;assert.ok(n,`missing action ${target}`);return d.listeners.click({target:n});},
  input(id,value,event='input'){const n=d.el(id);assert.ok(n,`missing input ${id}`);n.value=value;return d.listeners[event]({target:n});},
  select(files){const n=d.el('portableFile');assert.ok(n,'missing file input');n.files=files;return d.listeners.change({target:n});},
  text(){return d.modal.innerHTML+' '+(d.el('portableStatus')?.textContent??'');},
  async preview(source=SOURCE){await this.input('portableSource',source);return this.click('portable-preview');},
  async confirm({source=SOURCE,namespace:ns=namespace,target=TARGET}={}){await this.input('portableConfirmSource',source);await this.input('portableConfirmNamespace',ns);await this.input('portableTarget',target);},
 };
 return h;
}
function file(text,options={}){let reads=0;return {name:'selected.ewqa.json',size:Buffer.byteLength(text),async text(){reads++;return text;},get reads(){return reads;},...options};}
async function checkpoint({namespace=NAMESPACE,state=createState()}={}){const storage=memory(),locks=mutex();assert.equal(createStore(storage,{profile:SOURCE,namespace}).save(state,{expectedRevision:0}).ok,true);const out=await exportPortableCheckpoint(storage,locks,{sourceProfile:SOURCE,namespace,exporterBuild:'test file'});assert.equal(out.ok,true);return out;}
async function readyRestore(h,out){out??=await checkpoint();const f=file(out.text);assert.equal(await h.select([f]),true);await h.confirm();return {out,f};}
const preserved=(storage,before)=>{for(const [key,value]of before)assert.equal(storage.data.get(key),value,key);};

for(const namespace of ['release','qa-r4','qa-r11','qa-r12'])test(`mount ${namespace} has separate explicit latest/history sections and no automatic access`,()=>{
 const h=setup({namespace,pathname:namespace==='release'?'/save-recovery/':`/${namespace}/recovery`});assert.equal(h.info.ok,true);assert.match(h.text(),/최신 커밋 QA 체크포인트/);assert.match(h.text(),/과거 업그레이드 직전 백업/);assert.equal(h.el('portableSource').value,'');assert.equal(h.el('portableFile').attributes.multiple,undefined);assert.equal(h.el('portableFile').attributes.accept,'.json,application/json');assert.equal(h.exportCalls.length,0);assert.equal(h.storage.reads.length,0);assert.equal(h.storage.writes.length,0);assert.equal(h.downloads.length,0);assert.match(h.text(),/SHA-256.*정상 플레이/);
});
test('mounted preview locks and displays exact receipt, earned totals and build; separate bound click downloads once',async()=>{
 const h=setup({state:route('normal',true,true).state}),before=new Map(h.storage.data);await h.preview();assert.equal(h.exportCalls.length,1);assert.deepEqual(h.exportCalls[0],{sourceProfile:SOURCE,namespace:NAMESPACE,exporterBuild:`${RECOVERY_BUILD} · portable-v1`});const keys=profileKeys(SOURCE,NAMESPACE);assert.deepEqual(h.storage.reads,[keys.head,...keys.slots]);assert.equal(h.storage.writes.length,0);assert.equal(h.downloads.length,0);
 for(const label of ['원본 QA 프로필','원본 저장 형식','내보낸 도구 빌드','원본 커밋','누적 획득 XP','골드','체크포인트 내용 SHA-256','fallback 아님'])assert.ok(h.text().includes(label),label);
 const button=h.action('portable-download');assert.equal(button.dataset.portableSource,SOURCE);assert.equal(button.dataset.portableNamespace,NAMESPACE);assert.match(button.dataset.portableDigest,/^[a-f0-9]{64}$/);await h.click(button);await h.click(button);assert.equal(h.downloads.length,1);assert.equal(h.downloads[0].filename,`${NAMESPACE}-${SOURCE}-r1.ewqa.json`);assert.equal((await inspectPortableCheckpoint(h.downloads[0].text)).digest,button.dataset.portableDigest);assert.match(h.text(),/다운로드 목록에서 저장 여부/);preserved(h.storage,before);
});
test('export preview truthfully displays fallback source version and revision',async()=>{
 const old=createState();old.version=4;assert.equal(validateState(old).ok,true);const h=setup({state:old}),store=createStore(h.storage,{profile:SOURCE,namespace:NAMESPACE});assert.equal(store.save(old,{expectedRevision:1}).ok,true);h.storage.data.set(store.keys.slots[1],'corrupt');h.storage.writes.length=0;await h.preview();assert.match(h.text(),/대체 커밋 \(fallback\)/);assert.match(h.text(),/원본 저장 형식<\/dt><dd>4/);assert.match(h.text(),/revision 1/);assert.equal(h.storage.writes.length,0);
});
for(const source of ['', 'main','qa-','qa-UPPER','qa-../other',' qa-source','qa-'+ 'a'.repeat(49)])test(`invalid explicit source ${JSON.stringify(source)} performs no core/storage/download access`,async()=>{
 const h=setup();await h.preview(source);assert.equal(h.exportCalls.length,0);assert.equal(h.storage.reads.length,0);assert.equal(h.downloads.length,0);assert.match(h.text(),/유효한 원본 QA/);
});
for(const field of ['portableSource','portableNamespace','portableDigest','portableSelection'])test(`tampered ${field} download token is rejected`,async()=>{
 const h=setup();await h.preview();const button=h.action('portable-download');button.dataset[field]='wrong';await h.click(button);assert.equal(h.downloads.length,0);
});
test('source edit invalidates download even if original text is restored; a detached old button remains rejected',async()=>{
 const h=setup();await h.preview();const old=h.action('portable-download');await h.input('portableSource','qa-other');await h.input('portableSource',SOURCE,'change');await h.click(old);assert.equal(h.downloads.length,0);await h.click('portable-preview');await h.click(old);assert.equal(h.downloads.length,0);await h.click('portable-download');assert.equal(h.downloads.length,1);
});
test('programmatic changed source is rejected even without an input event',async()=>{
 const h=setup();await h.preview();h.el('portableSource').value='qa-other';await h.click('portable-download');assert.equal(h.downloads.length,0);
});
for(const action of ['back','edit','history','pagehide','game-link'])test(`delayed export after ${action} cannot download or replace newer UI`,async()=>{
 const gate=deferred(),h=setup({portableOptions:{async exportCheckpoint(s,l,args){await gate.promise;return exportPortableCheckpoint(s,l,args);}}});await h.input('portableSource',SOURCE);const pending=h.click('portable-preview');
 if(action==='back')await h.click('portable-title');if(action==='edit')await h.input('portableSource','qa-other');if(action==='history'){await h.click('portable-title');h.el('upgradeBackupKind').value='pre-v5';await h.click('recovery-qa');}if(action==='pagehide')h.windowListeners.pagehide();if(action==='game-link'){await h.click('portable-title');await h.click(h.link());}
 const html=h.modal.innerHTML,reads=h.storage.reads.length;gate.resolve();await pending;assert.equal(h.modal.innerHTML,html);assert.equal(h.storage.reads.length,reads);assert.equal(h.downloads.length,0);assert.equal(h.storage.writes.length,0);
});
test('double preview input starts one export while busy and never auto downloads',async()=>{
 const gate=deferred();let calls=0;const h=setup({portableOptions:{async exportCheckpoint(s,l,args){calls++;await gate.promise;return exportPortableCheckpoint(s,l,args);}}});await h.input('portableSource',SOURCE);const pending=h.click('portable-preview');await h.click('portable-preview');assert.equal(calls,1);gate.resolve();await pending;assert.equal(h.downloads.length,0);
});
for(const problem of ['missing-source','storage','locks-missing','locks-reject','export-throws','mismatch'])test(`export ${problem} is graceful and leaves no downloadable file`,async()=>{
 const storage=memory(),opts={storage,seed:problem!=='missing-source'};if(problem==='locks-missing')opts.locks=null;if(problem==='locks-reject')opts.locks={request:async()=>{throw Error('lock denied');}};if(problem==='export-throws')opts.portableOptions={exportCheckpoint:async()=>{throw Error('read failure');}};if(problem==='mismatch')opts.portableOptions={exportCheckpoint:async()=>({...await checkpoint(),sourceProfile:'qa-other'})};const h=setup(opts);if(problem==='storage')storage.getItem=()=>{throw Error('denied');};await h.preview();assert.equal(h.action('portable-download'),undefined);assert.equal(h.downloads.length,0);assert.equal(h.storage.writes.length,0);
});
test('download exception is truthful and consumes the button without retrying',async()=>{
 let calls=0;const h=setup({portableOptions:{download(){calls++;throw Error('browser failure');}}});await h.preview();const old=h.action('portable-download');await h.click(old);await h.click(old);assert.equal(calls,1);assert.match(h.text(),/결과를 확인하지 못했습니다/);assert.equal(h.storage.writes.length,0);
});

test('selected JSON is read and inspected once; blank confirmations cannot restore; exact confirmation restores original bytes',async()=>{
 const state=route('normal',true,true).state,out=await checkpoint({state}),h=setup(),before=new Map(h.storage.data),f=file(out.text);await h.select([f]);assert.equal(f.reads,1);assert.equal(h.inspectCalls.length,1);assert.equal(h.el('portableConfirmSource').value,'');assert.equal(h.el('portableConfirmNamespace').value,'');assert.equal(h.el('portableTarget').value,'');assert.match(h.text(),new RegExp(out.checksum));assert.match(h.text(),new RegExp(out.digest));assert.equal(h.storage.reads.length,0);await h.click('portable-restore');assert.equal(h.restoreCalls.length,0);await h.confirm();await h.click('portable-restore');assert.equal(h.restoreCalls.length,1);assert.equal(f.reads,1);assert.equal(h.inspectCalls.length,1);assert.deepEqual(h.restoreCalls[0],{text:out.text,expectedSourceProfile:SOURCE,expectedNamespace:NAMESPACE,expectedDigest:out.digest,targetProfile:TARGET,namespace:NAMESPACE});assert.deepEqual(createStore(h.storage,{profile:TARGET,namespace:NAMESPACE}).load().state,state);preserved(h.storage,before);assert.match(h.text(),/자동으로 이어하지 않습니다/);assert.equal(h.downloads.length,0);assert.equal(h.storage.writes.length,2);
});
for(const changes of [{source:'qa-other'},{namespace:'qa-r11'},{target:SOURCE},{target:'main'},{target:''},{target:'qa-bad/name'}])test(`restore confirmation ${JSON.stringify(changes)} fails before core/storage access`,async()=>{
 const h=setup();await readyRestore(h);await h.confirm(changes);await h.click('portable-restore');assert.equal(h.restoreCalls.length,0);assert.equal(h.storage.reads.length,0);assert.equal(h.storage.writes.length,0);
});
for(const field of ['portableSource','portableNamespace','portableDigest','portableSelection'])test(`tampered ${field} restore token is rejected`,async()=>{
 const h=setup();await readyRestore(h);h.action('portable-restore').dataset[field]='wrong';await h.click('portable-restore');assert.equal(h.restoreCalls.length,0);assert.equal(h.storage.writes.length,0);
});
test('foreign namespace file is inspectable but cannot enable restore even with its exact typed metadata',async()=>{
 const out=await checkpoint({namespace:'qa-r11'}),h=setup();await h.select([file(out.text)]);await h.confirm({namespace:'qa-r11'});assert.equal(h.action('portable-restore').disabled,true);await h.click('portable-restore');assert.equal(h.restoreCalls.length,0);assert.match(h.text(),/현재 입력을 확인|같은 저장 공간/);assert.equal(h.storage.writes.length,0);
});
for(const occupied of ['head','slot0','slot1','pre-v4','pre-v5'])test(`real mounted restore refuses occupied ${occupied}, including empty orphan bytes`,async()=>{
 const h=setup();await readyRestore(h);const keys=profileKeys(TARGET,NAMESPACE),key=occupied==='head'?keys.head:occupied==='slot0'?keys.slots[0]:occupied==='slot1'?keys.slots[1]:keys.head.replace(/\.head$/,'.'+occupied);h.storage.data.set(key,'');const before=new Map(h.storage.data);await h.click('portable-restore');assert.match(h.text(),/記録|기록이 있습니다/);assert.equal(h.storage.writes.length,0);assert.deepEqual(h.storage.data,before);assert.equal(h.action('portable-restore'),undefined);
});
for(const size of [PORTABLE_CHECKPOINT_LIMIT+1,Infinity,NaN,-1,1.5,undefined])test(`File.size ${size} is refused before any read or inspection`,async()=>{
 const h=setup(),f=file('{}',{size});await h.select([f]);assert.equal(f.reads,0);assert.equal(h.inspectCalls.length,0);assert.equal(h.storage.reads.length,0);assert.equal(h.storage.writes.length,0);assert.match(h.text(),/내용은 읽지 않았습니다/);
});
for(const count of [0,2])test(`selecting ${count} files never reads any`,async()=>{
 const h=setup(),files=Array.from({length:count},()=>file('{}'));await h.select(files);assert.ok(files.every(f=>f.reads===0));assert.equal(h.inspectCalls.length,0);assert.equal(h.restoreCalls.length,0);
});
test('exact File.size limit is allowed to read and inspect once before invalid JSON is rejected',async()=>{
 const h=setup(),f=file('{}',{size:PORTABLE_CHECKPOINT_LIMIT});await h.select([f]);assert.equal(f.reads,1);assert.equal(h.inspectCalls.length,1);assert.equal(h.action('portable-restore'),undefined);
});
for(const problem of ['bad-json','checksum','digest','read-reject','inspect-reject','actual-utf8-size'])test(`file ${problem} never reaches restore`,async()=>{
 const out=await checkpoint();let text=out.text,options={},portableOptions={};if(problem==='bad-json')text='{broken';if(problem==='checksum'){const doc=JSON.parse(text);doc.payload+=' ';text=JSON.stringify(doc);}if(problem==='digest'){const doc=JSON.parse(text);doc.exporterBuild='changed';text=JSON.stringify(doc);}if(problem==='read-reject')options.text=async()=>{throw Error('device file unavailable');};if(problem==='inspect-reject')portableOptions.inspectCheckpoint=async()=>{throw Error('crypto unavailable');};if(problem==='actual-utf8-size'){text+='가'.repeat(PORTABLE_CHECKPOINT_LIMIT);options.size=100;}const h=setup({portableOptions});await h.select([file(text,options)]);assert.equal(h.action('portable-restore'),undefined);assert.equal(h.storage.writes.length,0);assert.equal(h.restoreCalls.length,0);
});
for(const stage of ['read','inspect'])test(`Back during delayed file ${stage} cannot show late preview`,async()=>{
 const out=await checkpoint(),gate=deferred(),portableOptions=stage==='inspect'?{inspectCheckpoint:async text=>{await gate.promise;return inspectPortableCheckpoint(text);}}:{},h=setup({portableOptions}),f=file(out.text,stage==='read'?{text:()=>gate.promise}:{});const pending=h.select([f]);await tick();await h.click('portable-title');const html=h.modal.innerHTML;gate.resolve(stage==='read'?out.text:undefined);await pending;assert.equal(h.modal.innerHTML,html);assert.equal(h.storage.writes.length,0);assert.equal(h.action('portable-restore'),undefined);
});
test('replacing a delayed file uses only the newest preview; cancelled input also invalidates old restore button',async()=>{
 const out=await checkpoint(),gate=deferred(),h=setup(),pending=h.select([file(out.text,{text:()=>gate.promise})]);await h.select([file(out.text)]);const ready=h.modal.innerHTML;gate.resolve('bad late file');await pending;assert.equal(h.modal.innerHTML,ready);assert.equal(h.inspectCalls.length,1);await h.confirm();const old=h.action('portable-restore');await h.select([]);await h.click(old);assert.equal(h.restoreCalls.length,0);assert.equal(old.disabled,true);
});
test('stale file change event and detached restore button are rejected after a newer selection',async()=>{
 const out=await checkpoint(),h=setup(),oldFile=h.el('portableFile');await h.select([file(out.text)]);await h.confirm();const old=h.action('portable-restore');await h.input('portableTarget','qa-new-target');assert.notEqual(h.action('portable-restore'),old);await h.click(old);assert.equal(h.restoreCalls.length,0);oldFile.files=[file('bad old file')];await h.listeners.change({target:oldFile});assert.equal(h.inspectCalls.length,1);await h.click('portable-restore');assert.equal(h.restoreCalls[0].targetProfile,'qa-new-target');
});
for(const action of ['back','edit','new-file','programmatic-edit','pagehide'])test(`restore queued for its real target lock after ${action} cannot write or replace newer UI`,async()=>{
 const h=setup();await readyRestore(h);const gate=deferred(),entered=deferred(),keys=profileKeys(TARGET,NAMESPACE),held=h.locks.request(keys.lock,{mode:'exclusive'},async()=>{entered.resolve();await gate.promise;});await entered.promise;const pending=h.click('portable-restore');await tick();
 if(action==='back')await h.click('portable-title');if(action==='edit')await h.input('portableTarget','qa-new-target');if(action==='new-file')await h.select([file((await checkpoint()).text)]);if(action==='programmatic-edit')h.el('portableTarget').value='qa-new-target';if(action==='pagehide')h.windowListeners.pagehide();const html=h.modal.innerHTML;gate.resolve();await held;await pending;assert.equal(h.modal.innerHTML,html);assert.equal(h.storage.writes.length,0);assert.equal(createStore(h.storage,{profile:TARGET,namespace:NAMESPACE}).load().state,null);
});
test('double restore uses one core call and cannot repeat after success with detached button',async()=>{
 const gate=deferred();let calls=0;const h=setup({portableOptions:{async restoreCheckpoint(s,l,args){calls++;await gate.promise;return restorePortableCheckpoint(s,l,args);}}});await readyRestore(h);const old=h.action('portable-restore'),pending=h.click(old);await h.click(old);assert.equal(calls,1);gate.resolve();await pending;await h.click(old);assert.equal(calls,1);assert.equal(h.storage.writes.length,2);
});
test('delayed successful restore result does not replace a returned title or trigger another write',async()=>{
 const gate=deferred(),committed=deferred(),h=setup({portableOptions:{async restoreCheckpoint(s,l,args){const result=await restorePortableCheckpoint(s,l,args);committed.resolve();await gate.promise;return result;}}});await readyRestore(h);const pending=h.click('portable-restore');await committed.promise;await h.click('portable-title');const html=h.modal.innerHTML;gate.resolve();await pending;assert.equal(h.modal.innerHTML,html);assert.equal(h.storage.writes.length,2);assert.equal(h.restoreCalls.length,0);
});
for(const kind of ['throw-before','throw-after','readback','api-throw'])test(`uncertain restore ${kind} is terminal with preserved source, no cleanup or retry`,async()=>{
 const storage=memory(),h=setup({storage,portableOptions:kind==='api-throw'?{restoreCheckpoint:async()=>{throw Error('unknown');}}:{}});await readyRestore(h);const before=new Map(storage.data),original=storage.setItem.bind(storage);let attempts=0;
 storage.setItem=(key,value)=>{attempts++;if(kind==='throw-before')throw Error('quota');original(key,value);if(kind==='throw-after')throw Error('unreported write');if(kind==='readback')storage.data.set(key,'corrupt');};
 const old=h.action('portable-restore');await h.click(old);assert.match(h.text(),/복원 결과 확인 필요/);assert.match(h.text(),/일부 또는 전체 기록/);assert.match(h.text(),/자동 재시도하지 않습니다/);assert.match(h.text(),/원본 프로필과 선택한 파일은 그대로/);assert.equal(h.action('portable-restore'),undefined);await h.click(old);assert.equal(attempts,kind==='api-throw'?0:1);preserved(storage,before);
});
for(const problem of ['storage','locks-missing','locks-reject'])test(`restore ${problem} fails gracefully without writes`,async()=>{
 const h=setup();await readyRestore(h);if(problem==='storage')h.storage.getItem=()=>{throw Error('denied');};if(problem==='locks-missing')h.locks.request=null;if(problem==='locks-reject')h.locks.request=async()=>{throw Error('no lock');};await h.click('portable-restore');assert.equal(h.storage.writes.length,0);assert.match(h.text(),/복원 중단/);assert.equal(h.action('portable-restore'),undefined);
});
test('hostile file metadata and filename are text, never executable recovery markup',async()=>{
 const out=await checkpoint(),h=setup({portableOptions:{inspectCheckpoint:async()=>({...out,exporterBuild:'<script>alert(1)</script>',recoveryNote:'<img src=x>',recovered:true})}});await h.select([file(out.text,{name:'<script>alert(2)</script>'})]);assert.doesNotMatch(h.modal.innerHTML,/<script>|<img src=x>/);assert.match(h.modal.innerHTML,/&lt;script&gt;/);
});

function downloadHarness({throwClick=false,throwAppend=false}={}){const calls=[],anchors=[];class BlobStub{constructor(parts,options){this.parts=parts;this.options=options;calls.push(['blob',parts,options]);}}const URL={createObjectURL(blob){calls.push(['url',blob]);return 'blob:local-only';},revokeObjectURL(url){calls.push(['revoke',url]);}},document={body:{appendChild(anchor){calls.push(['append',anchor]);if(throwAppend)throw Error('append denied');}},createElement(tag){assert.equal(tag,'a');const a={click(){calls.push(['click',this.href,this.download]);if(throwClick)throw Error('click denied');},remove(){calls.push(['remove']);}};anchors.push(a);return a;}};return {calls,anchors,document,options:{Blob:BlobStub,URL}};}
test('production local downloader uses JSON Blob, safe filename, local anchor and always revokes URL',()=>{
 const h=downloadHarness();downloadPortableFile(h.document,'{"ok":true}','qa-r12-qa-source-r1.ewqa.json',h.options);assert.deepEqual(h.calls.map(c=>c[0]),['blob','url','append','click','remove','revoke']);assert.equal(h.calls[0][2].type,'application/json;charset=utf-8');assert.deepEqual(h.calls[3],['click','blob:local-only','qa-r12-qa-source-r1.ewqa.json']);assert.equal(h.anchors[0].hidden,true);
});
for(const kind of ['throwClick','throwAppend'])test(`production downloader revokes object URL after ${kind}`,()=>{
 const h=downloadHarness({[kind]:true});assert.throws(()=>downloadPortableFile(h.document,'{}','qa-source-r1.ewqa.json',h.options));assert.equal(h.calls.at(-1)[0],'revoke');assert.equal(h.calls.filter(c=>c[0]==='revoke').length,1);
});
for(const filename of ['../bad.json','https://outside.test/file.json','qa-<script>.json','qa-source.json'])test(`production downloader refuses unsafe filename ${filename} before Blob creation`,()=>{
 const h=downloadHarness();assert.throws(()=>downloadPortableFile(h.document,'{}',filename,h.options));assert.equal(h.calls.length,0);
});
test('production downloader reports unsupported device APIs without external fallback',()=>{
 assert.throws(()=>downloadPortableFile({},'{}','qa-source-r1.ewqa.json',{Blob:null,URL:{}}));
});
test('new production UI has no network, storage enumeration or automatic game startup path',()=>{
 const src=readFileSync(new URL('../src/portable-checkpoint-ui.js',import.meta.url),'utf8');assert.doesNotMatch(src,/\bfetch\s*\(|XMLHttpRequest|sendBeacon|localStorage|\.key\s*\(|createBattle|requestAnimationFrame|location\.href\s*=/);const recovery=readFileSync(new URL('../src/recovery-page.js',import.meta.url),'utf8');assert.ok(recovery.includes(`RECOVERY_BUILD='${RECOVERY_BUILD}'`));
});

for(const version of [1,2,3,4,5])test(`mounted file restore preserves original v${version} state and exact payload without migration`,async()=>{
 const state=createState();state.version=version;if(version<4){delete state.actionSlots;state.options.controls.version=2;delete state.options.controls.bindings.expert1;delete state.options.controls.bindings.expert2;}if(version<3)delete state.options.controls;if(version===1)delete state.equipmentProgress;assert.equal(validateState(state).ok,true);
 const out=await checkpoint({state}),h=setup();await readyRestore(h,out);const before=new Map(h.storage.data);await h.click('portable-restore');assert.equal(h.storage.writes.length,2);const keys=profileKeys(TARGET,NAMESPACE),allowed=new Set([keys.head,...keys.slots,keys.head.replace(/\.head$/,'.pre-v4'),keys.head.replace(/\.head$/,'.pre-v5')]);assert.ok(h.storage.reads.every(key=>allowed.has(key)));const envelope=JSON.parse(h.storage.data.get(keys.slots[0]));assert.equal(envelope.payload,JSON.parse(out.text).payload);assert.equal(envelope.previousCommit,null);assert.equal(JSON.parse(envelope.payload).version,version);assert.equal(JSON.parse(h.storage.data.get(keys.head)).revision,1);preserved(h.storage,before);
});
test('mounted default download click executes actual Blob helper with cleanup and no network fallback',async t=>{
 const calls=[],blobs=[],h=setup({portableOptions:{download:undefined}});t.mock.method(URL,'createObjectURL',blob=>{calls.push('create');blobs.push(blob);return 'blob:mounted-only';});t.mock.method(URL,'revokeObjectURL',url=>{assert.equal(url,'blob:mounted-only');calls.push('revoke');});
 h.document.body={appendChild(){calls.push('append');}};h.document.createElement=tag=>{assert.equal(tag,'a');return {attributes:{href:'blob:mounted-only'},closest(selector){return selector==='a[href]'?this:null;},click(){calls.push('click');assert.equal(this.download,`${NAMESPACE}-${SOURCE}-r1.ewqa.json`);h.listeners.click({target:this});},remove(){calls.push('remove');}};};
 await h.preview();assert.equal(calls.length,0);const old=h.action('portable-download');await h.click(old);await h.click(old);assert.deepEqual(calls,['create','append','click','remove','revoke']);assert.equal(blobs[0].type,'application/json;charset=utf-8');assert.equal((await inspectPortableCheckpoint(await blobs[0].text())).sourceProfile,SOURCE);assert.equal(h.storage.writes.length,0);
});
for(const kind of ['empty','too-large'])test(`file change to ${kind} while real restore is queued cancels all pending target writes`,async()=>{
 const h=setup();await readyRestore(h);const gate=deferred(),started=deferred(),keys=profileKeys(TARGET,NAMESPACE),held=h.locks.request(keys.lock,{mode:'exclusive'},async()=>{started.resolve();await gate.promise;});await started.promise;const old=h.action('portable-restore'),pending=h.click(old);await tick();await h.select(kind==='empty'?[]:[file('{}',{size:PORTABLE_CHECKPOINT_LIMIT+1})]);const html=h.modal.innerHTML;gate.resolve();await held;await pending;assert.equal(h.modal.innerHTML,html);assert.equal(h.storage.writes.length,0);assert.equal(h.inspectCalls.length,1);assert.equal(old.disabled,true);assert.equal(h.action('portable-restore'),undefined);
});

// Display-only filename/size and canonical-content digest regressions. The
// native chooser itself is intentionally empty after a render, never restored.
const receipt=(h,f)=>{assert.equal(h.el('portableSelectedFileName').textContent,f.name);assert.equal(h.el('portableSelectedFileSize').textContent,`크기: ${f.size} 바이트`);};
test('export and import label the canonical content digest, distinct from whole-file SHA-256',async()=>{
 const h=setup();await h.preview();await h.click('portable-download');const text=h.downloads[0].text,parsed=JSON.parse(text),digest=parsed.digest;delete parsed.digest;
 assert.equal(createHash('sha256').update(JSON.stringify(parsed),'utf8').digest('hex'),digest);assert.notEqual(createHash('sha256').update(text,'utf8').digest('hex'),digest);
 const verify=()=>{assert.match(h.text(),/체크포인트 내용 SHA-256/);assert.match(h.text(),/digest 필드를 제외한 메타데이터와 원본 payload/);assert.match(h.text(),/정해진 필드 순서의 JSON.*UTF-8/);assert.match(h.text(),/전체 파일 바이트.*sha256sum.*계산 대상이 다릅니다/);assert.doesNotMatch(h.text(),/>파일 SHA-256</);assert.ok(h.text().includes(digest));};verify();
 await h.click('portable-title');await h.select([file(JSON.stringify(JSON.parse(text),null,2))]);verify();assert.equal(h.storage.writes.length,0);
});
test('verified filename and exact byte size survive fresh empty input; filename cannot choose source or target',async()=>{
 const out=await checkpoint(),h=setup(),f=file(out.text,{name:'qa-r11-qa-someone-else-r999.ewqa.json'}),input=h.el('portableFile');await h.select([f]);receipt(h,f);assert.match(h.text(),/내용 검증 완료/);assert.match(h.text(),/파일명은 참고 정보/);assert.notEqual(h.el('portableFile'),input);assert.deepEqual(h.el('portableFile').files,[]);assert.deepEqual(input.files,[f]);assert.equal(h.el('portableFile').attributes['aria-describedby'],'portableSelectedFileName portableFileHelp');
 for(const id of ['portableConfirmSource','portableConfirmNamespace','portableTarget'])assert.equal(h.el(id).value,'');await h.confirm({source:'qa-someone-else',namespace:'qa-r11'});await h.click('portable-restore');assert.equal(h.restoreCalls.length,0);await h.confirm();receipt(h,f);await h.click('portable-restore');assert.equal(h.restoreCalls[0].text,out.text);assert.equal(h.restoreCalls[0].expectedSourceProfile,SOURCE);assert.equal(h.restoreCalls[0].targetProfile,TARGET);receipt(h,f);
});
test('file receipt snapshots name and size at selection and never rereads mutable display metadata',async()=>{
 const out=await checkpoint(),gate=deferred(),h=setup(),f=file(out.text,{name:'chosen-once.json',text:()=>gate.promise}),expected={name:f.name,size:f.size},pending=h.select([f]);receipt(h,expected);assert.match(h.text(),/내용 검증 중/);f.name='later-metadata.json';f.size=1;gate.resolve(out.text);await pending;receipt(h,expected);assert.match(h.text(),/내용 검증 완료/);assert.equal(h.inspectCalls.length,1);
});
test('newer selected filename and bytes survive a late obsolete file read',async()=>{
 const out=await checkpoint(),gate=deferred(),h=setup(),old=file(out.text,{name:'old-file.json',text:()=>gate.promise}),next=file(JSON.stringify(JSON.parse(out.text),null,2),{name:'new-file.json'}),pending=h.select([old]);receipt(h,old);await h.select([next]);receipt(h,next);gate.resolve(out.text);await pending;receipt(h,next);assert.doesNotMatch(h.text(),/old-file\.json/);assert.equal(h.inspectCalls.length,1);assert.equal(h.storage.writes.length,0);
});
for(const action of ['empty-change','multiple-change','native-cancel','back'])test(`${action} clears verified file receipt and all current restore confirmations`,async()=>{
 const out=await checkpoint(),h=setup(),f=file(out.text,{name:'must-clear.json'});await h.select([f]);await h.confirm();const old=h.action('portable-restore');
 if(action==='empty-change')await h.select([]);if(action==='multiple-change')await h.select([f,f]);if(action==='native-cancel')h.listeners.cancel({target:h.el('portableFile')});if(action==='back')await h.click('portable-title');
 assert.equal(h.el('portableSelectedFileName').textContent,'선택한 파일이 없습니다.');assert.equal(h.el('portableSelectedFileSize'),undefined);assert.doesNotMatch(h.text(),/must-clear\.json|내용 검증 완료/);assert.equal(h.action('portable-restore'),undefined);assert.equal(h.el('portableConfirmSource'),undefined);assert.equal(old.disabled,true);await h.click(old);assert.equal(h.restoreCalls.length,0);assert.equal(h.storage.writes.length,0);
});
for(const problem of ['invalid-json','read-failure','size-limit','unknown-size'])test(`${problem} replaces old verified file receipt with current unverified file only`,async()=>{
 const out=await checkpoint(),h=setup();await h.select([file(out.text,{name:'previous-good.json'})]);const options={name:'current-bad.json'};if(problem==='read-failure')options.text=async()=>{throw Error('file unavailable');};if(problem==='size-limit')options.size=PORTABLE_CHECKPOINT_LIMIT+1;if(problem==='unknown-size')options.size=NaN;const f=file('{invalid',options);await h.select([f]);assert.equal(h.el('portableSelectedFileName').textContent,f.name);
 if(problem==='unknown-size')assert.equal(h.el('portableSelectedFileSize').textContent,'크기: 확인할 수 없음');else receipt(h,f);assert.match(h.text(),/검증 실패|검증하지 않음/);assert.doesNotMatch(h.text(),/previous-good\.json|내용 검증 완료/);assert.equal(h.action('portable-restore'),undefined);assert.equal(h.el('portableConfirmSource'),undefined);assert.equal(h.restoreCalls.length,0);assert.equal(h.storage.writes.length,0);if(problem==='size-limit'||problem==='unknown-size')assert.equal(f.reads,0);
});
for(const outcome of ['success','occupied','uncertain'])test(`${outcome} shows the exact attempted file receipt, then Back clears it`,async()=>{
 const out=await checkpoint(),h=setup({portableOptions:outcome==='uncertain'?{restoreCheckpoint:async()=>{throw Error('unknown result');}}:{}}),f=file(out.text,{name:`${outcome}-receipt.json`});await h.select([f]);await h.confirm();if(outcome==='occupied')h.storage.data.set(profileKeys(TARGET,NAMESPACE).head,'');await h.click('portable-restore');receipt(h,f);assert.match(h.text(),outcome==='success'?/복원에 사용한 파일/:/복원을 시도한 파일/);assert.equal(h.el('portableFile'),undefined);assert.equal(h.action('portable-restore'),undefined);assert.equal(h.storage.writes.length,outcome==='success'?2:0);await h.click('portable-title');assert.equal(h.el('portableSelectedFileName').textContent,'선택한 파일이 없습니다.');assert.doesNotMatch(h.text(),new RegExp(f.name));
});
test('long hostile filename remains escaped wrapped text during inspection, confirmation and success',async()=>{
 const out=await checkpoint(),gate=deferred(),h=setup(),name='<img src=x onerror="boom">&\' '+ '아주긴파일명'.repeat(200)+'.json',f=file(out.text,{name,text:()=>gate.promise}),pending=h.select([f]);
 const check=()=>{receipt(h,f);assert.doesNotMatch(h.modal.innerHTML,/<img\b|onerror="boom"/);assert.match(h.modal.innerHTML,/&lt;img src=x onerror=&quot;boom&quot;&gt;&amp;&#39;/);const node=h.el('portableSelectedFileName');assert.equal(node.attributes.dir,'auto');for(const css of ['overflow-wrap:anywhere','white-space:pre-wrap','max-width:100%','min-width:0'])assert.ok(node.attributes.style.includes(css));};check();gate.resolve(out.text);await pending;check();await h.confirm();await h.click('portable-restore');check();
});
for(const stage of ['read','inspect'])test(`native chooser cancel during delayed ${stage} clears receipt and blocks late verification`,async()=>{
 const out=await checkpoint(),gate=deferred(),h=setup({portableOptions:stage==='inspect'?{inspectCheckpoint:async text=>{await gate.promise;return inspectPortableCheckpoint(text);}}:{}}),f=file(out.text,{name:'cancelled-pending.json',...(stage==='read'?{text:()=>gate.promise}:{})}),pending=h.select([f]);await tick();h.listeners.cancel({target:h.el('portableFile')});const html=h.modal.innerHTML;gate.resolve(stage==='read'?out.text:undefined);await pending;assert.equal(h.modal.innerHTML,html);assert.doesNotMatch(h.text(),/cancelled-pending\.json|내용 검증 완료/);assert.equal(h.action('portable-restore'),undefined);assert.equal(h.storage.writes.length,0);
});
test('native chooser cancel while real target lock is queued clears file and prevents all writes',async()=>{
 const h=setup();await readyRestore(h);const gate=deferred(),entered=deferred(),held=h.locks.request(profileKeys(TARGET,NAMESPACE).lock,{mode:'exclusive'},async()=>{entered.resolve();await gate.promise;});await entered.promise;const old=h.action('portable-restore'),pending=h.click(old);await tick();h.listeners.cancel({target:h.el('portableFile')});const html=h.modal.innerHTML;gate.resolve();await held;await pending;assert.equal(h.modal.innerHTML,html);assert.equal(h.el('portableSelectedFileName').textContent,'선택한 파일이 없습니다.');assert.equal(old.disabled,true);assert.equal(h.action('portable-restore'),undefined);assert.equal(h.storage.writes.length,0);
});
test('cancel on a stale file input or unrelated element cannot clear a newer verified selection',async()=>{
 const out=await checkpoint(),h=setup(),old=h.el('portableFile'),f=file(out.text,{name:'still-current.json'});await h.select([f]);const html=h.modal.innerHTML;h.listeners.cancel({target:old});h.listeners.cancel({target:h.el('portableTarget')});assert.equal(h.modal.innerHTML,html);receipt(h,f);await h.confirm();await h.click('portable-restore');assert.equal(h.storage.writes.length,2);
});
test('display fix never assigns native files/value or uses DataTransfer to simulate chooser selection',()=>{
 const src=readFileSync(new URL('../src/portable-checkpoint-ui.js',import.meta.url),'utf8');assert.doesNotMatch(src,/\.files\s*=|\.value\s*=(?!=)|DataTransfer|setFiles|setInputFiles/);
});
