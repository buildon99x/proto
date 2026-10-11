import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mountRecoveryPage,recoveryNamespace,RECOVERY_BUILD} from '../src/recovery-page.js';
function confirmation(html=''){return {backupKind:/data-backup-kind="([^"]+)"/.exec(html)?.[1],backupChecksum:/data-backup-checksum="([^"]+)"/.exec(html)?.[1],backupSelection:/data-backup-selection="([^"]+)"/.exec(html)?.[1]};}
function harness(pathname,kind='pre-v4',options={}){
 const read=[],write=[],readKinds=[],writeKinds=[],events={},modal={innerHTML:'',querySelector:()=>({focus(){}})},els={modal,recoverySource:{value:'qa-original'},upgradeBackupTarget:{value:'qa-recovered'},upgradeBackupKind:{value:kind}};
 const document={getElementById:id=>els[id],addEventListener:(event,fn)=>events[event]=fn};
 const info=mountRecoveryPage({document,pathname,storage:{},locks:{},read:(_storage,options)=>{read.push(options);readKinds.push('pre-v4');return {ok:true,exists:true,sourceVersion:3,targetVersion:4,level:4,xp:42,sourceRevision:8,backupChecksum:'inspected'};},restore:async(_s,_l,options)=>{write.push(options);writeKinds.push('pre-v4');return {ok:true,profile:options.targetProfile,sourceVersion:3,sourceRevision:8,level:4,xp:42};},readV5:(_s,o)=>{read.push(o);readKinds.push('pre-v5');return options.readV5?.(_s,o)??{ok:true,exists:true,sourceVersion:4,targetVersion:5,level:5,xp:80,sourceRevision:9,backupChecksum:'v5-inspected'};},restoreV5:async(_s,_l,o)=>{write.push(o);writeKinds.push('pre-v5');return options.restoreV5?options.restoreV5(_s,_l,o):{ok:true,profile:o.targetProfile,sourceVersion:4,sourceRevision:9,level:5,xp:80};},now:()=>123});
 return {info,read,write,readKinds,writeKinds,modal,els,click:(action,dataset=confirmation(modal.innerHTML))=>events.click?.({target:{closest:()=>({dataset:{action,...dataset},disabled:false})}})};
}
for(const path of ['/recovery','/recovery.html','/save-recovery','/save-recovery/','/save-recovery/index','/save-recovery/index.html'])test(`dedicated root recovery ${path} resolves only release and performs no automatic read/write`,async()=>{
 assert.equal(recoveryNamespace(path),'release');const h=harness(path);assert.equal(h.info.ok,true);assert.equal(h.info.namespace,'release');assert.equal(h.read.length,0);assert.equal(h.write.length,0);assert.match(h.modal.innerHTML,/기본 사이트 저장/);assert.match(h.modal.innerHTML,/게임은 실행하지 않습니다/);await h.click('recovery-main');assert.deepEqual(h.read[0],{profile:'main',namespace:'release'});await h.click('upgrade-backup-restore');assert.equal(h.write[0].namespace,'release');assert.equal(h.write[0].expectedBackupChecksum,'inspected');assert.match(h.modal.innerHTML,/qa-recovered/);
});
for(const path of ['/qa-r4/recovery.html','/qa-r7/recovery.html','/qa-r11/recovery.html','/qa-r4/recovery','/qa-r7/recovery','/qa-r11/recovery','/qa-r12/recovery.html','/qa-r12/recovery'])test(`candidate recovery ${path} cannot select or write the release main profile`,async()=>{
 const namespace=path.split('/')[1],h=harness(path);assert.equal(h.info.namespace,namespace);assert.match(h.modal.innerHTML,/공개 후보 격리 저장/);assert.doesNotMatch(h.modal.innerHTML,/data-action="recovery-main"/);await h.click('recovery-main');assert.equal(h.read.length,0);await h.click('recovery-qa');assert.deepEqual(h.read[0],{profile:'qa-original',namespace});await h.click('upgrade-backup-restore');assert.equal(h.write[0].namespace,namespace);assert.equal(h.write[0].sourceProfile,'qa-original');assert.equal(h.write[0].targetProfile,'qa-recovered');
});
for(const path of ['/qa-r99/recovery.html','/','/unknown/recovery.html','/save-recovery/../qa-r7/','/qa-r11/recovery.html/extra','/qa-r99/recovery','/qa-r11/recovery/extra','/save-recoveryx','/save-recovery/index/extra'])test(`unknown recovery route ${path} fails closed instead of falling back to release`,async()=>{
 assert.equal(recoveryNamespace(path),null);const h=harness(path);assert.equal(h.info.ok,false);assert.match(h.modal.innerHTML,/읽거나 변경하지 않았습니다/);assert.equal(h.read.length,0);assert.equal(h.write.length,0);await h.click('recovery-main');assert.equal(h.read.length,0);
});
test('recovery title return does not automatically restore or start gameplay',async()=>{
 const h=harness('/save-recovery/');await h.click('recovery-main');await h.click('upgrade-backup-title');assert.match(h.modal.innerHTML,/기본 사이트 저장/);assert.equal(h.write.length,0);
});
test('standalone entry is a recovery-only document and shares the app build identity',()=>{
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8'),html=readFileSync(new URL('../src/recovery.html',import.meta.url),'utf8'),entry=readFileSync(new URL('../src/recovery-main.js',import.meta.url),'utf8');
 assert.ok(main.includes(`const BUILD_LABEL='${RECOVERY_BUILD}'`));assert.match(html,/src="recovery-entry-r14\.js"/);assert.doesNotMatch(html,/src="main\.js"|<canvas/);assert.doesNotMatch(entry,/createBattle|requestAnimationFrame|\.load\(|\.save\(|fetch\(/);assert.match(entry,/catch/);
 const guard=readFileSync(new URL('../src/recovery-entry-r14.js',import.meta.url),'utf8');assert.match(guard,/validR14RecoveryPath\(location.pathname\)/);assert.match(guard,/await import\('\.\/recovery-main\.js'\)/);
});

for(const pathname of ['/qa-r12/recovery','/qa-r12/recovery.html','/save-recovery/'])test(`standalone ${pathname} requires an explicit checkpoint choice before storage access`,async()=>{
 const h=harness(pathname,'');assert.match(h.modal.innerHTML,/<option value="" selected>/);await h.click('recovery-qa');assert.equal(h.read.length,0);assert.equal(h.write.length,0);assert.match(h.modal.innerHTML,/명시적으로 선택/);await h.click('upgrade-backup-title');h.els.upgradeBackupKind.value='pre-v5';await h.click('recovery-qa');assert.deepEqual(h.readKinds,['pre-v5']);const token=confirmation(h.modal.innerHTML);await h.click('upgrade-backup-restore',{...token,backupKind:'pre-v4'});assert.equal(h.write.length,0);await h.click('upgrade-backup-restore',token);assert.deepEqual(h.writeKinds,['pre-v5']);assert.equal(h.write[0].expectedBackupChecksum,'v5-inspected');assert.equal(h.write[0].namespace,h.info.namespace);assert.match(h.modal.innerHTML,/자동으로 이어하지 않습니다/);
});
test('qa-r12 standalone title, v4-original preview and success never promise old-R11 gameplay access',async()=>{
 const h=harness('/qa-r12/recovery','pre-v5');assert.match(h.modal.innerHTML,/R11용 원본은 qa-r11에 그대로 보존하세요/);await h.click('recovery-qa');assert.match(h.modal.innerHTML,/저장 형식4 → 5 직전/);assert.match(h.modal.innerHTML,/형식4로 복원해도 R11에서 바로 열 수 없습니다/);await h.click('upgrade-backup-restore');assert.match(h.modal.innerHTML,/형식4로 복원해도 R11에서 바로 열 수 없습니다/);assert.equal(h.write[0].namespace,'qa-r12');
});
test('standalone delayed pre-v5 restore cannot replace the returned title',async()=>{
 let finish;const h=harness('/qa-r12/recovery','pre-v5',{restoreV5:()=>new Promise(resolve=>finish=resolve)});await h.click('recovery-qa');const pending=h.click('upgrade-backup-restore');await h.click('upgrade-backup-title');const title=h.modal.innerHTML;finish({ok:true,profile:'qa-recovered',sourceVersion:4,sourceRevision:9,level:5,xp:80});await pending;assert.equal(h.modal.innerHTML,title);assert.equal(h.write.length,1);assert.equal(h.read.length,1);
});
for(const path of ['/qa-r13/recovery','/qa-r12/recovery/','/qa-r12/recovery/index.html','/qa-r012/recovery','/qa-r12/recovery.html/extra','/qa-r12/recovery?other=release'])test(`unlisted R12-like recovery alias ${path} still fails closed`,()=>{
 const h=harness(path);assert.equal(h.info.ok,false);assert.equal(recoveryNamespace(path),null);assert.equal(h.read.length,0);assert.equal(h.write.length,0);
});

for(const [pathname,href]of [['/qa-r12/recovery','/qa-r12/'],['/qa-r11/recovery.html','/qa-r11/'],['/save-recovery/','/']])test(`recovery ${pathname} keeps its explicit gameplay link in the same namespace`,()=>{
 const h=harness(pathname);assert.ok(h.modal.innerHTML.includes(`href="${href}"`));assert.equal(h.read.length,0);assert.equal(h.write.length,0);if(href!=='/')assert.doesNotMatch(h.modal.innerHTML,/href="\/"/);
});

for(const [pathname,href]of [['/qa-r12/recovery','/qa-r12/'],['/qa-r11/recovery.html','/qa-r11/'],['/save-recovery/','/'],['/qa-r99/recovery','/']])test(`storage-unavailable recovery entry ${pathname} preserves a truthful return destination`,async()=>{
 const vm=await import('node:vm'),entry=readFileSync(new URL('../src/recovery-main.js',import.meta.url),'utf8').replace(/^import .*;\n/,''),modal={innerHTML:''},env={mountRecoveryPage,recoveryNamespace,location:{pathname},document:{getElementById:()=>modal},navigator:{locks:{}}};Object.defineProperty(env,'localStorage',{get(){throw Error('storage denied');}});vm.runInNewContext(entry,env);assert.ok(modal.innerHTML.includes(`href="${href}"`));assert.match(modal.innerHTML,/저장 공간에 접근하지 못했습니다/);if(href!=='/')assert.doesNotMatch(modal.innerHTML,/href="\/"/);
});
