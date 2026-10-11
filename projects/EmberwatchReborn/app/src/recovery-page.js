import {readUpgradeBackup,restoreUpgradeBackup,readUpgradeBackupV5,restoreUpgradeBackupV5} from './save.js';
import {candidateNamespace} from './candidate-profile.js';
import {createUpgradeBackupUi} from './upgrade-backup-ui.js';
import {createPortableCheckpointUi} from './portable-checkpoint-ui.js';
export const RECOVERY_BUILD='R14a11';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function recoveryNamespace(pathname){
 if(['/recovery','/recovery.html','/save-recovery','/save-recovery/','/save-recovery/index','/save-recovery/index.html'].includes(pathname))return 'release';
 if(/^\/qa-r\d+\/recovery(?:\.html)?$/.test(pathname))return candidateNamespace(pathname);
 return null;
}
export function mountRecoveryPage({document,storage,locks,pathname,read=readUpgradeBackup,restore=restoreUpgradeBackup,readV5=readUpgradeBackupV5,restoreV5=restoreUpgradeBackupV5,now=Date.now,portableOptions={}}){
 const modal=document.getElementById('modal'),namespace=recoveryNamespace(pathname);let epoch=0;
 const render=(title,html)=>{epoch++;modal.innerHTML=`<section class="panel"><h1>${esc(title)}</h1>${html}</section>`;modal.querySelector?.('button:not([disabled]),input')?.focus({preventScroll:true});};
 if(!namespace){render('지원하지 않는 복구 주소','<p>저장 이름공간을 확인할 수 없어 기록을 읽거나 변경하지 않았습니다.</p><a href="/">게임 시작 화면</a>');return {ok:false};}
 const candidate=namespace!=='release',gamePath=candidate?`/${namespace}/`:'/';let recovery,portable;
 function title(){portable?.reset();render('저장 복구 도구',`<p class="pill">${RECOVERY_BUILD} · ${candidate?'공개 후보 격리 저장':'기본 사이트 저장'} · ${esc(namespace)}</p><p>게임은 실행하지 않습니다. 과거 업그레이드 백업 또는 명시적으로 선택한 최신 QA 체크포인트를 확인합니다. 자동으로 다른 기기로 전송하지 않습니다.</p><p class="warning">원본과 최신 진행을 덮어쓰지 않습니다. 복원은 같은 공간의 빈 qa- 복구 프로필에만 가능합니다. 구버전 코드는 신버전 진행을 읽지 못할 수 있으므로, 복구 시점 이후의 진행은 별도로 남습니다.</p>${portable?.homeHtml()??''}<h2>과거 업그레이드 직전 백업</h2><label class="row">확인할 백업 시점 <select id="upgradeBackupKind" aria-label="확인할 업그레이드 백업 시점"><option value="" selected>시점을 선택하세요</option><option value="pre-v4">pre-v4 · 형식4 전환 직전 (원본1~3)</option><option value="pre-v5">pre-v5 · 형식5 전환 직전 (원본1~4)</option></select></label>${namespace==='qa-r12'?'<p class="warning">R11 코드는 qa-r12 저장 공간을 알지 못합니다. 형식4로 복원해도 R11에서 바로 열 수 없습니다. R11용 원본은 qa-r11에 그대로 보존하세요.</p>':''}${candidate?'':'<button data-action="recovery-main">일반 프로필 백업 확인</button>'}<label class="row">확인할 QA 프로필<input id="recoverySource" aria-label="백업 원본 QA 프로필 이름" maxlength="51" value="qa-r2-live-20261009"></label><button data-action="recovery-qa">이 QA 프로필 백업 확인</button><p class="minor">후보와 기본 사이트 저장은 서로 복사하지 않습니다. 이미 새 형식으로 저장한 기록에 과거 백업을 만들어 주지는 않습니다.</p><a href="${esc(gamePath)}">같은 저장 공간의 게임 시작 화면</a>`);}
 portable=createPortableCheckpointUi({...portableOptions,document,storage,locks,namespace,build:RECOVERY_BUILD,render,epoch:()=>epoch,onTitle:title});
 recovery=createUpgradeBackupUi({read,restore,readV5,restoreV5,storage,locks,namespace,render,epoch:()=>epoch,isTitle:()=>true,onTitle:title,now});
 document.addEventListener('click',async event=>{
  const target=event.target.closest('[data-action]');if(!target){if(event.target.closest('a[href]'))portable.reset();return;}if(target.disabled)return;
  const action=target.dataset.action;
  if(action?.startsWith('portable-'))return portable.click(target);
  if(action==='recovery-main'){if(!candidate)recovery.show('main',document.getElementById('upgradeBackupKind')?.value);return;}
  if(action==='recovery-qa')return recovery.show(document.getElementById('recoverySource')?.value,document.getElementById('upgradeBackupKind')?.value);
  if(action==='upgrade-backup-title')return recovery.back();
  if(action==='upgrade-backup-restore')return recovery.copy(document.getElementById('upgradeBackupTarget')?.value,{kind:target.dataset.backupKind,backupChecksum:target.dataset.backupChecksum,selection:target.dataset.backupSelection});
 });
 document.addEventListener('input',event=>portable.inputChanged(event.target));
 document.addEventListener('change',event=>event.target?.id==='portableFile'?portable.selectFile(event.target):portable.inputChanged(event.target));
 document.defaultView?.addEventListener('pagehide',()=>portable.reset());
 title();return {ok:true,namespace};
}
