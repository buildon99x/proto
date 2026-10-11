import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {candidatePath,candidateNamespace,profileNamespaceForPath} from '../src/candidate-profile.js';
const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
function fn(name){const m=new RegExp(`(?:async )?function ${name}\\(`).exec(source);assert.ok(m,name);for(let end=source.indexOf('}',m.index);end>=0;end=source.indexOf('}',end+1)){const value=source.slice(m.index,end+1);try{new vm.Script('('+value+')');return value;}catch(error){if(!(error instanceof SyntaxError))throw error;}}throw Error(name);}
function harness(pathname){
 const sessions=[],reads=[],writes=[],starts=[],frames=[],handlers={},modal={innerHTML:'',presentationEpoch:0,hidden:true},elements={hud:{hidden:false},difficulty:{value:'normal'},profile:{value:'qa-route'},upgradeBackupKind:{value:'pre-v5'}};
 const storage={getItem:key=>{reads.push(key);throw Error('route must not read storage');},setItem:(key,value)=>{writes.push([key,value]);throw Error('route must not write storage');}};
 const env={candidatePath,candidateNamespace,profileNamespaceForPath,location:{pathname},modal,$:id=>elements[id],state:null,battle:null,controller:null,paused:true,busy:false,suppressNextClick:false,profile:'main',clearInput(){},audio:{pause(){}},localStorage:storage,navigator:{locks:{}},loadArt:()=>{starts.push('art');return Promise.resolve();},requestAnimationFrame:fn=>frames.push(fn),frame(){},document:{addEventListener:(type,handler)=>handlers[type]=handler},createSession:(_s,_l,options)=>{sessions.push(options);return {};},createController:()=>({load:async()=>({ok:false,reason:'fixture empty profile'})}),panel(){throw Error('unexpected startup failure');}};
 const declarations=['candidate','esc','button','BUILD_LABEL'].map(name=>source.split('\n').find(line=>line.startsWith('const '+name+'=')));
 const startup=source.split('\n').find(line=>line.startsWith('if(saveNamespace===null)showTitle();else {loadArt()'));
 assert.ok(startup,'actual startup is guarded');
 const code=[...declarations,...['showTitle','loadProfile'].map(fn),source.slice(source.indexOf("document.addEventListener('click',"),source.indexOf("document.addEventListener('change',")),startup,'return {showTitle,loadProfile,get namespace(){return saveNamespace},get state(){return state},get controller(){return controller},get paused(){return paused}};'].join('\n');
 const ui=vm.compileFunction(code,Object.keys(env))(...Object.values(env));
 return {ui,modal,sessions,reads,writes,starts,frames,click:action=>handlers.click({target:{closest:()=>({dataset:{action},disabled:false})},preventDefault(){},stopPropagation(){}})};
}
for(const path of ['/qa-r99','/qa-r99/','/qa-r13/index.html','/qa-r3/','/qa-r12-other/','/qa-r012/','/qa-unknown/','/QA-r99/','/%71a-r99/','//qa-r99/'])test(`unsupported candidate ${path} has no release fallback at startup, click or direct profile load`,async()=>{
 assert.equal(candidateNamespace(path),null);assert.equal(profileNamespaceForPath(path),null);const h=harness(path);assert.equal(h.ui.namespace,null);assert.match(h.modal.innerHTML,/지원하지 않는 QA 주소/);assert.match(h.modal.innerHTML,/기본 사이트 저장으로 대신 연결하지 않습니다/);assert.doesNotMatch(h.modal.innerHTML,/data-action=/);assert.equal(h.starts.length,0);assert.equal(h.frames.length,0);
 for(const action of ['new','continue','qa-new','qa-continue','candidate-copy','upgrade-backup-main','upgrade-backup-qa','upgrade-backup-restore','reload'])await h.click(action);
 await h.ui.loadProfile('main',false);await h.ui.loadProfile('qa-route',true);assert.equal(h.sessions.length,0);assert.equal(h.reads.length,0);assert.equal(h.writes.length,0);assert.equal(h.ui.state,null);assert.equal(h.ui.controller,null);assert.equal(h.ui.paused,true);assert.doesNotMatch(h.modal.innerHTML,/data-action=/);
});
for(const namespace of ['qa-r4','qa-r5','qa-r6','qa-r7','qa-r8','qa-r9','qa-r10','qa-r11','qa-r12'])test(`supported ${namespace} aliases retain their exact namespace and normal start/load path`,async()=>{
 for(const path of [`/${namespace}`,`/${namespace}/`,`/${namespace}/index.html`]){assert.equal(candidateNamespace(path),namespace);assert.equal(profileNamespaceForPath(path),namespace);const h=harness(path);assert.equal(h.starts.length,1);assert.equal(h.frames.length,1);h.ui.showTitle();assert.match(h.modal.innerHTML,/data-action="qa-continue"/);assert.doesNotMatch(h.modal.innerHTML,/지원하지 않는 QA 주소/);await h.ui.loadProfile('qa-route',false);assert.deepEqual(h.sessions,[{profile:'qa-route',namespace}]);}
});
for(const path of ['/','/index','/index.html','/ordinary-existing-release-path','/ordinary%ZZ','/%E0%A4%A'])test(`non-QA release path ${path} keeps previous behavior`,async()=>{
 assert.equal(profileNamespaceForPath(path),'release');const h=harness(path);assert.equal(h.starts.length,1);assert.equal(h.frames.length,1);h.ui.showTitle();assert.match(h.modal.innerHTML,/data-action="continue"/);await h.ui.loadProfile('main',false);assert.deepEqual(h.sessions,[{profile:'main',namespace:'release'}]);
});
test('malformed route inputs fail closed without creating another URL alias',()=>{
 for(const value of [null,undefined,{}])assert.equal(profileNamespaceForPath(value),null);
 assert.equal(candidateNamespace('/%71a-r12/'),null);assert.equal(profileNamespaceForPath('/%71a-r12/'),null);
});
