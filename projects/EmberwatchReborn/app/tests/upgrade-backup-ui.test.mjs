import {createContactTrace} from '../src/contact-trace.js';
import {createFrameObservation} from '../src/frame-observation.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createUpgradeBackupUi} from '../src/upgrade-backup-ui.js';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const summary={ok:true,exists:true,backupChecksum:'observed-backup',sourceVersion:3,targetVersion:4,sourceRevision:7,sourceChecksum:'source-hash',sourceSlot:1,level:6,xp:25.5,earnedXp:1025.5,createdAt:'2026-10-10T09:00:00.000Z',recovered:false};
const summaryV5={...summary,backupChecksum:'observed-v5',sourceVersion:4,targetVersion:5};
function confirmation(html=''){const kind=/data-backup-kind="([^"]+)"/.exec(html)?.[1],backupChecksum=/data-backup-checksum="([^"]+)"/.exec(html)?.[1],selection=/data-backup-selection="([^"]+)"/.exec(html)?.[1];return {kind,backupChecksum,selection};}
const saved={ok:true,profile:'qa-recovery-test',namespace:'qa-r11',revision:1,checksum:'restored',sourceVersion:3,sourceRevision:7,sourceChecksum:'source-hash',backupChecksum:'observed-backup',level:6,xp:25.5,createdAt:summary.createdAt};
function harness(options={}){
 const frames=[],reads=[],restores=[],readKinds=[],restoreKinds=[],storage={},locks={};let currentEpoch=0,title=true,titles=0;
 const ui=createUpgradeBackupUi({storage,locks,namespace:options.namespace??'qa-r11',read:(s,o)=>{reads.push([s,o]);readKinds.push('pre-v4');return options.read?.(s,o)??{...summary};},restore:async(s,l,o)=>{restores.push([s,l,o]);restoreKinds.push('pre-v4');return options.restore?options.restore(s,l,o):saved;},readV5:(s,o)=>{reads.push([s,o]);readKinds.push('pre-v5');return options.readV5?.(s,o)??{...summaryV5};},restoreV5:async(s,l,o)=>{restores.push([s,l,o]);restoreKinds.push('pre-v5');return options.restoreV5?options.restoreV5(s,l,o):{...saved,sourceVersion:4,backupChecksum:summaryV5.backupChecksum};},render:(heading,html)=>{frames.push({heading,html});currentEpoch++;},epoch:()=>currentEpoch,isTitle:()=>title,onTitle:()=>{titles++;currentEpoch++;},now:()=>1000});
 const rawCopy=ui.copy;ui.copy=(target,token=confirmation(frames.at(-1)?.html))=>rawCopy(target,token);
 return {ui,rawCopy,frames,reads,restores,readKinds,restoreKinds,storage,locks,get epoch(){return currentEpoch},get titles(){return titles},invalidate:()=>currentEpoch++,gameplay:()=>{title=false;}};
}
test('backup preview is read-only, scoped and clear about its historical restoration point',()=>{
 const h=harness();assert.equal(h.ui.show('qa-original','pre-v4'),true);assert.equal(h.reads.length,1);assert.equal(h.reads[0][0],h.storage);assert.deepEqual(h.reads[0][1],{profile:'qa-original',namespace:'qa-r11'});assert.equal(h.restores.length,0);
 const html=h.frames.at(-1).html;for(const copy of ['레벨6','XP25.5','기록7','2026-10-10T09:00:00.000Z','이후 새 버전에서 얻은 진행은 이 백업에 추가되지 않습니다','현재 프로필과 새 진행은 덮어쓰지','qa-recovery-rs'])assert.ok(html.includes(copy),copy);
});
test('no backup does not fabricate history or offer a restore button',async()=>{
 const h=harness({read:()=>({ok:true,exists:false})});h.ui.show('qa-existing-v4','pre-v4');assert.match(h.frames.at(-1).html,/과거 기록을 만들어 낼 수는 없습니다/);assert.doesNotMatch(h.frames.at(-1).html,/upgrade-backup-restore/);assert.equal(await h.ui.copy('qa-target'),false);assert.equal(h.restores.length,0);
});
for(const kind of ['error','throw'])test(`read ${kind} is escaped, non-mutating and retains a title exit`,()=>{
 const h=harness({read:()=>{if(kind==='throw')throw Error('unavailable');return {ok:false,reason:'bad <script>value</script>'};}});h.ui.show('<unsafe>','pre-v4');const html=h.frames.at(-1).html;assert.doesNotMatch(html,/<unsafe>|<script>/);assert.match(html,/upgrade-backup-title/);assert.equal(h.restores.length,0);
});
test('restore requires a fresh visible preview and passes the observed token and same namespace',async()=>{
 const h=harness();assert.equal(await h.ui.copy('qa-recovery-test'),false);h.ui.show('main','pre-v4');assert.equal(await h.ui.copy('qa-recovery-test'),true);assert.equal(h.restores.length,1);assert.equal(h.restores[0][0],h.storage);assert.equal(h.restores[0][1],h.locks);assert.deepEqual(h.restores[0][2],{sourceProfile:'main',targetProfile:'qa-recovery-test',namespace:'qa-r11',expectedBackupChecksum:'observed-backup'});
 assert.match(h.frames.at(-1).html,/복사했습니다/);assert.match(h.frames.at(-1).html,/구버전에서 열기 전까지 현재판으로 진행하지 마세요/);assert.doesNotMatch(h.frames.at(-1).html,/upgrade-backup-restore/);assert.equal(h.titles,0,'success neither starts gameplay nor switches profiles');assert.equal(await h.ui.copy('qa-again'),false);assert.equal(h.restores.length,1);
});
test('later mutation of a read result cannot restamp the displayed backup token',async()=>{
 const data={...summary},h=harness({read:()=>data});h.ui.show('qa-original','pre-v4');data.backupChecksum='unseen';await h.ui.copy('qa-recovery-test');assert.equal(h.restores[0][2].expectedBackupChecksum,'observed-backup');
});
test('duplicate restore clicks execute only one requested write',async()=>{
 let complete;const h=harness({restore:()=>new Promise(r=>complete=r)});h.ui.show('qa-original','pre-v4');const pending=h.ui.copy('qa-recovery-test');assert.equal(await h.ui.copy('qa-other'),false);assert.equal(h.restores.length,1);complete(saved);assert.equal(await pending,true);
});
for(const outcome of ['success','failure','throw'])test(`late restore ${outcome} cannot replace the newer title/preview`,async()=>{
 let complete,reject;const h=harness({restore:()=>new Promise((r,j)=>{complete=r;reject=j;})});h.ui.show('qa-original','pre-v4');const pending=h.ui.copy('qa-recovery-test');h.ui.back();h.ui.show('qa-newer','pre-v4');const latest=h.frames.at(-1),count=h.frames.length;
 outcome==='throw'?reject(Error('late')):complete(outcome==='success'?saved:{ok:false,reason:'late error'});assert.equal(await pending,false);assert.equal(h.frames.length,count);assert.equal(h.frames.at(-1),latest);assert.equal(h.titles,1);assert.equal(h.restores.length,1,'only the original already-requested target may finish');
});
test('a failed copy preserves entered target and reports the failure without automatic retry',async()=>{
 const h=harness({restore:()=>({ok:false,code:'TARGET_EXISTS',reason:'이미 존재 <이름>'})});h.ui.show('qa-original','pre-v4');assert.equal(await h.ui.copy('qa-custom'),false);const html=h.frames.at(-1).html;assert.match(html,/value="qa-custom"/);assert.match(html,/이미 존재 &lt;이름&gt;/);assert.equal(h.restores.length,1);
});
test('a thrown/uncertain copy is not retried or represented as success',async()=>{
 const h=harness({restore:()=>{throw Error('uncertain');}});h.ui.show('qa-original','pre-v4');assert.equal(await h.ui.copy('qa-custom'),false);assert.match(h.frames.at(-1).html,/복사 결과를 확인하지 못했습니다/);assert.doesNotMatch(h.frames.at(-1).html,/복사했습니다/);assert.equal(h.restores.length,1);
});
test('a stale panel epoch or gameplay ownership blocks new recovery mutations',async()=>{
 const h=harness();h.ui.show('qa-original','pre-v4');h.invalidate();assert.equal(await h.ui.copy('qa-target'),false);assert.equal(h.restores.length,0);h.gameplay();assert.equal(h.ui.show('qa-other','pre-v4'),false);assert.equal(h.ui.back(),false);assert.equal(h.titles,0);assert.equal(h.reads.length,1);
});
test('late completion cannot display recovery UI over a loaded gameplay owner',async()=>{
 let done;const h=harness({restore:()=>new Promise(r=>done=r)});h.ui.show('qa-original','pre-v4');const pending=h.ui.copy('qa-target');h.gameplay();const count=h.frames.length;done(saved);assert.equal(await pending,false);assert.equal(h.frames.length,count);
});
test('a missing-backup preview clears an earlier restorable selection',async()=>{
 let have=true;const h=harness({read:()=>have?{...summary}:{ok:true,exists:false}});h.ui.show('qa-original','pre-v4');have=false;h.ui.show('qa-none','pre-v4');assert.equal(await h.ui.copy('qa-target'),false);assert.equal(h.restores.length,0);
});

// Real main title/click/recovery functions; only the DOM and save API are probes.
// Store and old-R7 compatibility behavior have separate real-module tests.
const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
function fn(name){const m=new RegExp(`(?:async )?function ${name}\\(`).exec(main);assert.ok(m,name);for(let end=main.indexOf('}',m.index);end>=0;end=main.indexOf('}',end+1)){const value=main.slice(m.index,end+1);try{new vm.Script('('+value+')');return value;}catch(error){if(!(error instanceof SyntaxError))throw error;}}throw Error(name);}
function mainHarness(candidate=true,namespace=candidate?'qa-r11':'release'){
 const reads=[],writes=[],readKinds=[],writeKinds=[],handlers={},modal={hidden:false,innerHTML:'',presentationEpoch:0,profileSelectionEpoch:0,querySelector:()=>({focus(){}})},els={hud:{hidden:true},profile:{value:'qa-original'},upgradeBackupTarget:{value:'qa-recovery-test'},upgradeBackupKind:{value:'pre-v4'}};
 const env={contactTrace:createContactTrace(),frameObservation:createFrameObservation(),upgradeBackupUi:null,createUpgradeBackupUi,readUpgradeBackup:(_s,opts)=>{reads.push(opts);readKinds.push('pre-v4');return {...summary};},restoreUpgradeBackup:async(_s,_l,opts)=>{writes.push(opts);writeKinds.push('pre-v4');return saved;},readUpgradeBackupV5:(_s,opts)=>{reads.push(opts);readKinds.push('pre-v5');return {...summaryV5};},restoreUpgradeBackupV5:async(_s,_l,opts)=>{writes.push(opts);writeKinds.push('pre-v5');return {...saved,sourceVersion:4};},localStorage:{},navigator:{locks:{}},saveNamespace:namespace,candidate,
  modal,state:null,battle:null,controller:null,paused:true,busy:false,suppressNextClick:false,clearInput(){},audio:{pause(){}},$:id=>els[id],document:{addEventListener:(event,handler)=>handlers[event]=handler}};
 const declarations=['esc','button','BUILD_LABEL'].map(name=>main.split('\n').find(line=>line.startsWith('const '+name+'=')));
 const program=[...declarations,...['showTitle','backupUi','openUpgradeBackup'].map(fn),main.slice(main.indexOf("document.addEventListener('click',"),main.indexOf("document.addEventListener('change',")),'return {showTitle,openUpgradeBackup,get state(){return state},set state(value){state=value},set battle(value){battle=value},set controller(value){controller=value},get controller(){return controller}};'].join('\n');
 const ui=vm.compileFunction(program,Object.keys(env))(...Object.values(env));
 return {ui,modal,els,reads,writes,readKinds,writeKinds,click:(action,token=confirmation(modal.innerHTML))=>handlers.click({target:{closest:()=>({dataset:{action,backupKind:token.kind,backupChecksum:token.backupChecksum,backupSelection:token.selection},disabled:false})},preventDefault(){},stopPropagation(){}})};
}
for(const candidate of [false,true])test(`real ${candidate?'candidate':'release'} title binds backup buttons to the selected namespace`,async()=>{
 const h=mainHarness(candidate);h.ui.showTitle();assert.match(h.modal.innerHTML,/upgrade-backup-qa/);assert.equal(h.modal.innerHTML.includes('upgrade-backup-main'),!candidate);await h.click('upgrade-backup-main');assert.equal(h.reads.length,candidate?0:1);if(!candidate)assert.deepEqual(h.reads[0],{profile:'main',namespace:'release'});
 h.ui.showTitle();await h.click('upgrade-backup-qa');assert.deepEqual(h.reads.at(-1),{profile:'qa-original',namespace:candidate?'qa-r11':'release'});assert.match(h.modal.innerHTML,/업그레이드 전 저장 백업/);await h.click('upgrade-backup-restore');assert.equal(h.writes.length,1);assert.equal(h.writes[0].namespace,candidate?'qa-r11':'release');assert.equal(h.writes[0].sourceProfile,'qa-original');assert.equal(h.writes[0].targetProfile,'qa-recovery-test');assert.equal(h.ui.state,null);assert.equal(h.ui.controller,null);
});
test('real backup open cancels a pending title selection before reading, without a stale controller',async()=>{
 const h=mainHarness();h.ui.controller={pending:true};h.ui.openUpgradeBackup('qa-original','pre-v4');assert.equal(h.ui.controller,null);assert.equal(h.modal.profileSelectionEpoch,1);assert.equal(h.reads.length,1);assert.match(h.modal.innerHTML,/업그레이드 전 저장 백업/);
});
test('real recovery handlers cannot replace gameplay or mutate saves from stale UI events',async()=>{
 const h=mainHarness();await h.click('upgrade-backup-qa');const html=h.modal.innerHTML;h.ui.state={owned:'new'};h.ui.battle={owned:'new'};h.ui.controller={owned:'new'};await h.click('upgrade-backup-qa');await h.click('upgrade-backup-main');await h.click('upgrade-backup-restore');await h.click('upgrade-backup-title');assert.equal(h.modal.innerHTML,html);assert.equal(h.writes.length,0);assert.deepEqual(h.ui.state,{owned:'new'});
});

for(const kind of [undefined,'','pre-v3','pre-v6','__proto__','constructor'])test(`checkpoint choice ${String(kind)} cannot read or select a default backup`,async()=>{
 const h=harness();h.ui.show('qa-original',kind);assert.equal(h.reads.length,0);assert.match(h.frames.at(-1).html,/명시적으로 선택/);assert.equal(await h.ui.copy('qa-target'),false);assert.equal(h.restores.length,0);
});
for(const sourceVersion of [1,2,3,4])test(`pre-v5 previews and restores the actual source version ${sourceVersion} with its own API`,async()=>{
 const h=harness({readV5:()=>({...summaryV5,sourceVersion}),restoreV5:()=>({...saved,sourceVersion})});h.ui.show('qa-original','pre-v5');assert.deepEqual(h.readKinds,['pre-v5']);assert.match(h.frames.at(-1).html,new RegExp(`저장 형식${sourceVersion} → 5 직전`));assert.equal(await h.ui.copy('qa-restored-v5'),true);assert.deepEqual(h.restoreKinds,['pre-v5']);assert.equal(h.restores[0][2].expectedBackupChecksum,'observed-v5');assert.equal(h.restores[0][2].namespace,'qa-r11');assert.equal(h.titles,0);
});
for(const bad of [{targetVersion:4},{sourceVersion:0},{sourceVersion:5},{sourceVersion:4.5},{backupChecksum:''}])test(`pre-v5 rejects inconsistent preview ${JSON.stringify(bad)} without a restore button`,async()=>{
 const h=harness({readV5:()=>({...summaryV5,...bad})});h.ui.show('qa-original','pre-v5');assert.match(h.frames.at(-1).html,/실제 저장 형식이 다릅니다/);assert.doesNotMatch(h.frames.at(-1).html,/upgrade-backup-restore/);assert.equal(await h.ui.copy('qa-target'),false);assert.equal(h.restores.length,0);
});
test('pre-v4 cannot present a version4 source or a pre-v5 checkpoint',async()=>{
 const h=harness({read:()=>({...summaryV5})});h.ui.show('qa-original','pre-v4');assert.doesNotMatch(h.frames.at(-1).html,/upgrade-backup-restore/);assert.equal(await h.ui.copy('qa-target'),false);assert.deepEqual(h.readKinds,['pre-v4']);assert.equal(h.restores.length,0);
});
for(const kind of ['pre-v4','pre-v5'])test(`missing ${kind} does not consult another existing sidecar or invent past history`,async()=>{
 const h=harness({[kind==='pre-v4'?'read':'readV5']:()=>({ok:true,exists:false})});h.ui.show('qa-original',kind);assert.deepEqual(h.readKinds,[kind]);assert.match(h.frames.at(-1).html,new RegExp(`선택한 ${kind} 백업이 없습니다`));assert.match(h.frames.at(-1).html,/다른 시점의 백업을 대신 사용하지 않습니다/);assert.equal(await h.ui.copy('qa-target'),false);
});
test('restore confirmation is bound to kind, checksum and exact preview selection',async()=>{
 const h=harness();h.ui.show('qa-original','pre-v4');const original=confirmation(h.frames.at(-1).html);h.ui.show('qa-original','pre-v5');const selected=confirmation(h.frames.at(-1).html);
 for(const token of [undefined,original,{...selected,kind:'pre-v4'},{...selected,backupChecksum:'observed-backup'},{...selected,selection:original.selection}])assert.equal(await h.rawCopy('qa-target',token),false);
 assert.equal(h.restores.length,0);assert.equal(await h.rawCopy('qa-target',selected),true);assert.deepEqual(h.restoreKinds,['pre-v5']);
});
test('reopening the same kind and checksum rejects a prior visible button',async()=>{
 const h=harness();h.ui.show('qa-original','pre-v5');const previous=confirmation(h.frames.at(-1).html);h.ui.show('qa-original','pre-v5');assert.equal(await h.rawCopy('qa-target',previous),false);assert.equal(h.restores.length,0);assert.equal(await h.ui.copy('qa-target'),true);
});
test('a failed copy reissues confirmation instead of permitting a dismissed button to retry',async()=>{
 const h=harness({restoreV5:()=>({ok:false,code:'TARGET_EXISTS'})});h.ui.show('qa-original','pre-v5');const prior=confirmation(h.frames.at(-1).html);assert.equal(await h.rawCopy('qa-taken',prior),false);assert.equal(await h.rawCopy('qa-other',prior),false);assert.equal(h.restores.length,1);assert.equal(await h.ui.copy('qa-new'),false);assert.equal(h.restores.length,2);
});
for(const outcome of ['success','failure','throw'])test(`late pre-v5 ${outcome} cannot replace a newer pre-v4 selection`,async()=>{
 let finish,reject;const h=harness({restoreV5:()=>new Promise((r,j)=>{finish=r;reject=j;})});h.ui.show('qa-original','pre-v5');const pending=h.ui.copy('qa-old-target');h.ui.show('qa-original','pre-v4');const latest=h.frames.at(-1),count=h.frames.length;outcome==='throw'?reject(Error('uncertain')):finish(outcome==='success'?saved:{ok:false,code:'failure'});assert.equal(await pending,false);assert.equal(h.frames.length,count);assert.equal(h.frames.at(-1),latest);assert.equal(await h.ui.copy('qa-new-target'),true);assert.deepEqual(h.restoreKinds,['pre-v5','pre-v4']);
});
test('qa-r12 preview and success disclose unsupported R11 namespace access',async()=>{
 const h=harness({namespace:'qa-r12'});h.ui.show('qa-original','pre-v5');for(const text of ['R11 코드는 qa-r12 저장 공간을 알지 못합니다','형식4로 복원해도 R11에서 바로 열 수 없습니다','R11용 원본은 qa-r11에 그대로 보존하세요'])assert.ok(h.frames.at(-1).html.includes(text));assert.equal(await h.ui.copy('qa-preserved'),true);assert.match(h.frames.at(-1).html,/형식4로 복원해도 R11에서 바로 열 수 없습니다/);assert.match(h.frames.at(-1).html,/자동으로 이어하지 않습니다/);assert.equal(h.restores[0][2].namespace,'qa-r12');assert.equal(h.titles,0);
});
test('real qa-r12 title has no default kind and routes selected pre-v5 with observed confirmation',async()=>{
 const h=mainHarness(true,'qa-r12');h.ui.showTitle();assert.match(h.modal.innerHTML,/<option value="" selected>/);assert.match(h.modal.innerHTML,/R11 코드는 qa-r12/);h.els.upgradeBackupKind.value='';await h.click('upgrade-backup-qa');assert.equal(h.reads.length,0);await h.click('upgrade-backup-title');h.els.upgradeBackupKind.value='pre-v5';await h.click('upgrade-backup-qa');assert.deepEqual(h.readKinds,['pre-v5']);const token=confirmation(h.modal.innerHTML);await h.click('upgrade-backup-restore',{...token,kind:'pre-v4'});assert.equal(h.writes.length,0);await h.click('upgrade-backup-restore',token);assert.deepEqual(h.writeKinds,['pre-v5']);assert.equal(h.writes[0].namespace,'qa-r12');assert.equal(h.writes[0].expectedBackupChecksum,'observed-v5');assert.equal(h.ui.controller,null);assert.equal(h.ui.state,null);
});
