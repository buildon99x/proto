import {createStore,profileKeys,checksum,SAVE_LIMIT} from './save.js';

const FORMAT='emberwatch.reborn.pre-v4';
const fail=(code,reason)=>({ok:false,code,reason});
const bytes=text=>new TextEncoder().encode(text).length;
export function upgradeBackupKey(profile='main',namespace='release'){
 return profileKeys(profile,namespace).head.replace(/\.head$/,'.pre-v4');
}
const receipt=loaded=>({slot:loaded.slot,revision:loaded.revision,checksum:loaded.checksum});
const sameReceipt=(a,b)=>a&&b&&a.slot===b.slot&&a.revision===b.revision&&a.checksum===b.checksum;
function snapshotStore(raw,profile,namespace){
 const keys=profileKeys(profile,namespace),values=new Map([[keys.head,raw.head],...keys.slots.map((key,i)=>[key,raw.slots[i]])]);
 return createStore({getItem:key=>values.get(key)??null},{profile,namespace});
}
function decodeBackup(text,{profile,namespace}){
 try{
  if(typeof text!=='string'||bytes(text)>SAVE_LIMIT*12)return null;
  const backup=JSON.parse(text),d=backup?.data;
  if(!d||backup.checksum!==checksum(JSON.stringify(d))||d.format!==FORMAT||d.profile!==profile||d.namespace!==namespace||![1,2,3].includes(d.fromVersion)||d.toVersion!==4||typeof d.createdAt!=='string'||!Number.isFinite(Date.parse(d.createdAt)))return null;
  if(!d.raw||!(d.raw.head===null||typeof d.raw.head==='string')||typeof d.raw.head==='string'&&bytes(d.raw.head)>65536||!Array.isArray(d.raw.slots)||d.raw.slots.length!==2||d.raw.slots.some(x=>x!==null&&(typeof x!=='string'||bytes(x)>SAVE_LIMIT*2)))return null;
  const loaded=snapshotStore(d.raw,profile,namespace).load();
  if(!loaded.ok||!loaded.state||loaded.state.version!==d.fromVersion||!sameReceipt(d.receipt,receipt(loaded)))return null;
  return {backup,loaded,summary:{ok:true,exists:true,backupChecksum:backup.checksum,sourceProfile:profile,namespace,sourceVersion:d.fromVersion,targetVersion:4,sourceRevision:loaded.revision,sourceChecksum:loaded.checksum,sourceSlot:loaded.slot,level:loaded.state.character.level,xp:loaded.state.character.xp,earnedXp:loaded.state.stats.earnedXp,createdAt:d.createdAt,recovered:loaded.recovered}};
 }catch{return null;}
}
// Read-only and bounded: missing history remains missing, including native v4
// profiles and profiles already upgraded by a build without this protection.
export function readUpgradeBackup(storage,{profile='main',namespace='release'}={}){
 let key;try{key=upgradeBackupKey(profile,namespace);}catch{return fail('INVALID_PROFILE','백업 프로필을 확인하세요.');}
 try{
  const raw=storage.getItem(key);if(raw===null)return {ok:true,exists:false};
  return decodeBackup(raw,{profile,namespace})?.summary??fail('UPGRADE_BACKUP_CORRUPT','원본 백업을 확인할 수 없습니다. 덮어쓰지 않습니다.');
 }catch{return fail('UNAVAILABLE','원본 백업을 읽을 수 없습니다.');}
}

// Called only by save under the same profile Web Lock, before either live slot
// changes. One localStorage value holds all original bytes and its receipt.
export function ensureUpgradeBackup(storage,{profile,namespace,previous}){
 const keys=profileKeys(profile,namespace),key=upgradeBackupKey(profile,namespace);
 try{
  const raw={head:storage.getItem(keys.head),slots:keys.slots.map(k=>storage.getItem(k))};
  const observed=snapshotStore(raw,profile,namespace).load();
  if(!observed.ok||!sameReceipt(receipt(previous),receipt(observed))||observed.state?.version!==previous.state.version)return fail('CONFLICT','백업 전에 저장 기록이 변경되었습니다. 다시 불러오세요.');
  let existing=storage.getItem(key);
  if(existing===null){
   const data={format:FORMAT,profile,namespace,fromVersion:previous.state.version,toVersion:4,createdAt:new Date().toISOString(),receipt:receipt(previous),raw};
   existing=JSON.stringify({data,checksum:checksum(JSON.stringify(data))});
   if(!decodeBackup(existing,{profile,namespace}))return fail('UPGRADE_BACKUP_INVALID','원본 백업을 검증하지 못했습니다. 기존 저장을 유지합니다.');
   storage.setItem(key,existing);
   if(storage.getItem(key)!==existing)return fail('UPGRADE_BACKUP_FAILED','원본 백업 확인에 실패했습니다. 기존 저장을 유지합니다.');
  }
  const decoded=decodeBackup(existing,{profile,namespace});
  if(!decoded)return fail('UPGRADE_BACKUP_CORRUPT','기존 원본 백업이 손상되어 진행하지 않습니다. 덮어쓰지 않습니다.');
  // The other slot may contain our interrupted staged v4 write. Identity is
  // the exact committed envelope, never that uncommitted slot or a timestamp.
  if(!sameReceipt(decoded.backup.data.receipt,receipt(previous))||decoded.backup.data.raw.slots[previous.slot]!==raw.slots[previous.slot])return fail('UPGRADE_BACKUP_CONFLICT','다른 원본 백업이 이미 있습니다. 기존 백업과 저장을 모두 유지합니다.');
  if(storage.getItem(keys.head)!==raw.head||storage.getItem(keys.slots[previous.slot])!==raw.slots[previous.slot])return fail('CONFLICT','백업 중 저장 기록이 변경되었습니다. 다시 불러오세요.');
  return decoded.summary;
 }catch{return fail('UPGRADE_BACKUP_FAILED','원본 백업을 확인할 수 없습니다. 저장 공간을 확인하세요. 기존 저장은 변경하지 않습니다.');}
}

// Explicit in-app recovery only. No file import, cross-namespace migration,
// in-place downgrade, deletion, or replacement of any existing target bytes.
export async function restoreUpgradeBackup(storage,locks,{sourceProfile='main',targetProfile,namespace='release',expectedBackupChecksum,...unsupported}={}){
 let sourceKeys,targetKeys;
 try{sourceKeys=profileKeys(sourceProfile,namespace);targetKeys=profileKeys(targetProfile,namespace);}catch{return fail('INVALID_PROFILE','복구할 QA 프로필 이름을 확인하세요.');}
 if(Object.keys(unsupported).length)return fail('INVALID_NAMESPACE','복구는 같은 저장 공간 안에서만 가능합니다.');
 if(!targetProfile?.startsWith('qa-')||sourceProfile===targetProfile)return fail('RESTORE_TARGET_REQUIRED','원본과 다른 새 QA 프로필 이름을 입력하세요.');
 if(typeof expectedBackupChecksum!=='string')return fail('BACKUP_CONFIRMATION_REQUIRED','먼저 복구할 원본 백업을 확인하세요.');
 if(!locks||typeof locks.request!=='function')return fail('LOCKS_UNAVAILABLE','안전한 저장 잠금을 사용할 수 없습니다.');
 const names=[sourceKeys.lock,targetKeys.lock].sort();
 let entered=false;
 try{return await locks.request(names[0],{mode:'exclusive'},()=>locks.request(names[1],{mode:'exclusive'},()=>{
  entered=true;
  const backupText=storage.getItem(upgradeBackupKey(sourceProfile,namespace));
  if(backupText===null)return fail('NO_UPGRADE_BACKUP','이 프로필에는 형식 변경 전 원본 백업이 없습니다.');
  const decoded=decodeBackup(backupText,{profile:sourceProfile,namespace});
  if(!decoded)return fail('UPGRADE_BACKUP_CORRUPT','원본 백업이 손상되어 복구하지 않습니다.');
  if(decoded.backup.checksum!==expectedBackupChecksum)return fail('BACKUP_CONFLICT','확인한 백업과 달라졌습니다. 다시 확인하세요.');
  const targetKey=upgradeBackupKey(targetProfile,namespace),otherTargetKey=targetKeys.head.replace(/\.head$/,'.pre-v5');
  if([targetKeys.head,...targetKeys.slots,targetKey,otherTargetKey].some(key=>storage.getItem(key)!==null))return fail('RESTORE_TARGET_EXISTS','해당 QA 프로필에 기록이 있습니다. 다른 새 이름을 사용하세요.');
  const {slot,revision,checksum:hash}=decoded.backup.data.receipt;
  const envelope=decoded.backup.data.raw.slots[slot];
  storage.setItem(targetKeys.slots[slot],envelope);
  if(storage.getItem(targetKeys.slots[slot])!==envelope)return fail('RESTORE_UNCERTAIN','복구 쓰기를 확인하지 못했습니다. 원본과 현재 진행은 유지됩니다. 다른 새 QA 이름을 사용하세요.');
  if(storage.getItem(targetKeys.head)!==null||storage.getItem(targetKeys.slots[1-slot])!==null||storage.getItem(targetKey)!==null||storage.getItem(otherTargetKey)!==null)return fail('RESTORE_UNCERTAIN','복구 중 대상 기록이 변경되었습니다. 덮어쓰지 않습니다.');
  // The selected receipt, including recovered old heads, is authoritative.
  // No prior target history is invented and the source revision is preserved.
  const head=JSON.stringify({slot,revision,checksum:hash,previousCommit:null});
  storage.setItem(targetKeys.head,head);
  if(storage.getItem(targetKeys.head)!==head)return fail('RESTORE_UNCERTAIN','복구 완료 확인에 실패했습니다. QA 이어하기에서 저장을 확인하세요.');
  const restored=createStore(storage,{profile:targetProfile,namespace}).load();
  if(!restored.ok||!sameReceipt(receipt(restored),decoded.backup.data.receipt))return fail('RESTORE_UNCERTAIN','복구 결과를 확인하지 못했습니다. 원본과 현재 진행은 유지됩니다.');
  return {...decoded.summary,profile:targetProfile,revision,checksum:hash};
 }));}catch{return fail(entered?'RESTORE_UNCERTAIN':'LOCK_FAILED',entered?'복구 결과를 확인할 수 없습니다. 원본과 현재 진행은 유지됩니다. QA 이어하기에서 확인하고, 기록이 없으면 다른 새 QA 이름을 사용하세요.':'복구 잠금을 얻지 못했습니다.');}
}
