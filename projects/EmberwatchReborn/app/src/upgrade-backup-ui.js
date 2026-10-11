// Title-only, explicit recovery UI. No automatic restore, namespace transfer,
// profile overwrite or browser storage inspection outside the save API.
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const button=(label,action,extra='')=>`<button data-action="upgrade-backup-${action}" ${extra}>${label}</button>`;
export function createUpgradeBackupUi({read,restore,readV5,restoreV5,storage,locks,namespace,render,epoch,isTitle,onTitle,now=Date.now}){
 let selection=0,context=null,busy=false;
 // The selected kind owns one fixed API pair. Never infer the latest backup,
 // substitute the other sidecar, or derive a historical v4 state from v5.
 const checkpoints=Object.freeze({'pre-v4':Object.freeze({read,restore,targetVersion:4}),'pre-v5':Object.freeze({read:readV5,restore:restoreV5,targetVersion:5})});
 const limits='<p class="warning">업그레이드 직전 한 시점의 기록입니다. 이후 새 버전에서 얻은 진행은 이 백업에 추가되지 않습니다. 현재 프로필과 새 진행은 덮어쓰지 않으며, 같은 저장 공간의 비어 있는 복구 프로필에만 복사합니다. 코드만 구버전으로 돌려도 최신 진행이 구버전 저장으로 변환되지는 않습니다.</p>';
 const compatibility=namespace==='qa-r12'?'<p class="warning">R11 코드는 qa-r12 저장 공간을 알지 못합니다. 형식4로 복원해도 R11에서 바로 열 수 없습니다. R11용 원본은 qa-r11에 그대로 보존하세요. 저장 공간을 자동으로 바꾸거나 복사하지 않습니다.</p>':'<p class="minor">구버전에서 읽을 수 있는 형식과 저장 공간인지 먼저 확인하세요. 구버전 복원을 위해 만든 복사본은 구버전에서 열기 전까지 현재판으로 진행하지 마세요.</p>';
 function form(message=''){
  const c=context,s=c.summary;c.selection=++selection;
  render('업그레이드 전 저장 백업',`<p>원본 프로필 <strong>${esc(c.sourceProfile)}</strong> · 저장 공간 ${esc(namespace)} · 선택 ${esc(c.kind)}</p><p>저장 형식${s.sourceVersion} → ${s.targetVersion} 직전 · 기록${s.sourceRevision}<br>레벨${s.level} · XP${s.xp}<br>백업 보존 시각(UTC): ${esc(s.createdAt??'기록 없음')}</p>${limits}${compatibility}${message?`<p role="status">${esc(message)}</p>`:''}<label class="row">새 복구 프로필 이름<input id="upgradeBackupTarget" aria-label="새 복구 프로필 이름" maxlength="51" value="${esc(c.targetProfile)}"></label><p class="minor">qa-로 시작하는 새 이름을 사용하세요. 슬롯이나 백업만 남은 이름도 덮어쓰지 않습니다. 복사 뒤 같은 저장 공간의 시작 화면에서 격리 QA 프로필 이름을 직접 입력해야 합니다. 자동으로 이어하지 않습니다.</p>${button('이 시점의 기록을 새 복구 프로필로 복사','restore',`data-backup-kind="${esc(c.kind)}" data-backup-checksum="${esc(s.backupChecksum)}" data-backup-selection="${c.selection}"`)}${button('시작 화면으로','title')}`);
  c.epoch=epoch();
 }
 function show(sourceProfile,kind){
  if(!isTitle())return false;
  selection++;context=null;busy=false;
  const checkpoint=Object.hasOwn(checkpoints,kind)?checkpoints[kind]:null;
  if(!checkpoint||typeof checkpoint.read!=='function'||typeof checkpoint.restore!=='function'){
   render('업그레이드 전 저장 백업',`<p role="status">시작 화면에서 확인할 백업 시점을 명시적으로 선택하세요. pre-v4는 형식4 전환 직전, pre-v5는 형식5 전환 직전 기록입니다. 다른 시점을 대신 읽거나 복원하지 않았습니다.</p>${button('시작 화면으로','title')}`);return true;
  }
  let summary;try{summary=checkpoint.read(storage,{profile:sourceProfile,namespace});}catch{summary={ok:false,reason:'백업을 읽지 못했습니다. 원본을 변경하지 않았습니다.'};}
  if(summary?.ok&&summary.exists&&(summary.targetVersion!==checkpoint.targetVersion||!Number.isInteger(summary.sourceVersion)||summary.sourceVersion<1||summary.sourceVersion>=checkpoint.targetVersion||typeof summary.backupChecksum!=='string'||!summary.backupChecksum))summary={ok:false,reason:'선택한 백업 시점과 실제 저장 형식이 다릅니다. 원본을 변경하거나 다른 백업으로 대체하지 않았습니다.'};
  if(!summary?.ok||!summary.exists){render('업그레이드 전 저장 백업',`<p>원본 프로필 <strong>${esc(sourceProfile)}</strong> · 선택 ${esc(kind)}</p><p role="status">${esc(summary?.ok?`선택한 ${kind} 백업이 없습니다. 이 전환의 백업 기능 적용 전에 이미 형식${checkpoint.targetVersion} 이상으로 저장한 기록이나 새 게임의 과거 기록을 만들어 낼 수는 없습니다. 다른 시점의 백업을 대신 사용하지 않습니다.`:(summary?.reason??summary?.code??'백업을 읽지 못했습니다. 원본을 변경하지 않았습니다.'))}</p>${limits}${compatibility}${button('시작 화면으로','title')}`);return true;}
  context={sourceProfile,kind,restore:checkpoint.restore,summary:Object.freeze({...summary}),targetProfile:`qa-recovery-${now().toString(36)}`,selection};form();return true;
 }
 async function copy(targetProfile,confirmation){
  const c=context;if(!c||busy||!isTitle()||c.epoch!==epoch()||c.selection!==selection)return false;
  // Require the exact visible button's checkpoint, checksum and selection.
  // A delayed click from a dismissed preview cannot confirm the newer one.
  if(!confirmation||confirmation.kind!==c.kind||confirmation.backupChecksum!==c.summary.backupChecksum||String(confirmation.selection)!==String(c.selection))return false;
  c.targetProfile=targetProfile;busy=true;const expectedEpoch=c.epoch,token=selection;
  const current=()=>context===c&&selection===token&&epoch()===expectedEpoch&&isTitle();
  let result;
  try{result=await c.restore(storage,locks,{sourceProfile:c.sourceProfile,targetProfile,namespace,expectedBackupChecksum:c.summary.backupChecksum});}
  catch{result={ok:false,reason:'복사 결과를 확인하지 못했습니다. 자동으로 다시 시도하거나 기존 기록을 덮어쓰지 않습니다.'};}
  if(!current())return false;busy=false;
  if(!result?.ok){form(result?.reason??result?.code??'복사 결과를 확인하지 못했습니다.');return false;}
  context=null;selection++;
  render('복구 프로필을 보존했습니다',`<p role="status"><strong>${esc(result.profile)}</strong>에 선택한 ${esc(c.kind)}의 저장 형식${result.sourceVersion}, 레벨${result.level}, XP${result.xp}, 원본 기록${result.sourceRevision}을 복사했습니다.</p>${limits}${compatibility}<p>자동으로 이어하지 않습니다. 같은 저장 공간의 시작 화면에서 격리 QA 프로필 이름에 <strong>${esc(result.profile)}</strong>을 입력하세요. 현재 개발판으로 이어가면 이후 저장 시 다시 새 형식으로 이행합니다.</p>${button('시작 화면으로','title')}`);return true;
 }
 function back(){if(!isTitle())return false;selection++;context=null;busy=false;onTitle();return true;}
 return {show,copy,back};
}
