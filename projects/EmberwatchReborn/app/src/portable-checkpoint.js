// Explicit local-file QA checkpoint boundary. No UI, download, network,
// controller migration, storage enumeration, or gameplay-authenticity claim.
import {createStore,profileKeys,checksum,SAVE_LIMIT} from './save.js';
import {STATE_SCHEMA,STATE_VERSION,validateState} from './state.js';

export const PORTABLE_CHECKPOINT_FORMAT='emberwatch.reborn.qa-checkpoint';
export const PORTABLE_CHECKPOINT_VERSION=1;
export const PORTABLE_CHECKPOINT_LIMIT=SAVE_LIMIT;
const fields=['format','formatVersion','schema','sourceVersion','sourceProfile','namespace','exporterBuild','exportedAt','sourceSlot','sourceRevision','checksum','recovered','payload','digest'];
const fail=(code,reason)=>({ok:false,code,reason});
const record=x=>!!x&&typeof x==='object'&&!Array.isArray(x)&&Object.getPrototypeOf(x)===Object.prototype;
const bytes=text=>new TextEncoder().encode(text).length;
const bounded=text=>typeof text==='string'&&text.length<=SAVE_LIMIT&&bytes(text)<=SAVE_LIMIT;
const exact=(object,keys)=>record(object)&&Object.keys(object).length===keys.length&&keys.every(key=>Object.hasOwn(object,key));
const optionsOnly=(object,keys)=>record(object)&&Object.keys(object).every(key=>keys.includes(key));
const digestPattern=/^[a-f0-9]{64}$/;
const buildValid=build=>typeof build==='string'&&build.trim()===build&&build.length>0&&build.length<=128&&bytes(build)<=128&&!/[\u0000-\u001f\u007f]/.test(build);
function qaKeys(profile,namespace){
 if(typeof profile!=='string'||!profile.startsWith('qa-')||typeof namespace!=='string')throw Error('Explicit QA selection required');
 return profileKeys(profile,namespace);
}
function snapshot(storage,keys,sidecars=false){
 const names=[keys.head,...keys.slots];
 if(sidecars)names.push(keys.head.replace(/\.head$/,'.pre-v4'),keys.head.replace(/\.head$/,'.pre-v5'));
 return new Map(names.map(key=>[key,storage.getItem(key)]));
}
const snapshotLoad=(values,profile,namespace)=>createStore({getItem:key=>values.get(key)??null},{profile,namespace}).load();
// Canonical field order is part of format v1. The payload remains its original
// string, including whitespace; neither state nor historical links are copied.
function canonical(checkpoint){
 const data={};for(const key of fields)if(key!=='digest')data[key]=checkpoint[key];
 return JSON.stringify(data);
}
async function sha256(text){
 if(!globalThis.crypto?.subtle?.digest)throw Error('SHA-256 unavailable');
 const buffer=await globalThis.crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));
 return Array.from(new Uint8Array(buffer),value=>value.toString(16).padStart(2,'0')).join('');
}
function summary(checkpoint,state){
 return {sourceProfile:checkpoint.sourceProfile,namespace:checkpoint.namespace,schema:checkpoint.schema,sourceVersion:checkpoint.sourceVersion,exporterBuild:checkpoint.exporterBuild,exportedAt:checkpoint.exportedAt,sourceSlot:checkpoint.sourceSlot,sourceRevision:checkpoint.sourceRevision,checksum:checkpoint.checksum,digest:checkpoint.digest,recovered:checkpoint.recovered,
  recoveryNote:checkpoint.recovered?'현재 head 대신 마지막으로 확인된 커밋을 내보낸 체크포인트입니다.':null,
  level:state.character.level,xp:state.character.xp,earnedXp:state.stats.earnedXp,gold:state.gold,difficulty:state.difficulty};
}
async function decode(text){
 if(!bounded(text))return fail(typeof text==='string'?'TOO_LARGE':'INVALID_CHECKPOINT','체크포인트 파일은 UTF-8 기준 2 MiB 이하여야 합니다.');
 let checkpoint,state;
 try{
  checkpoint=JSON.parse(text);
  if(!exact(checkpoint,fields)||checkpoint.format!==PORTABLE_CHECKPOINT_FORMAT||checkpoint.formatVersion!==PORTABLE_CHECKPOINT_VERSION||checkpoint.schema!==STATE_SCHEMA||!Number.isInteger(checkpoint.sourceVersion)||checkpoint.sourceVersion<1||checkpoint.sourceVersion>STATE_VERSION||!buildValid(checkpoint.exporterBuild)||typeof checkpoint.exportedAt!=='string'||checkpoint.exportedAt.length!==24||new Date(checkpoint.exportedAt).toISOString()!==checkpoint.exportedAt||![0,1].includes(checkpoint.sourceSlot)||!Number.isSafeInteger(checkpoint.sourceRevision)||checkpoint.sourceRevision<1||typeof checkpoint.checksum!=='string'||!/^[a-f0-9]{8}$/.test(checkpoint.checksum)||typeof checkpoint.recovered!=='boolean'||typeof checkpoint.digest!=='string'||!digestPattern.test(checkpoint.digest))return fail('INVALID_CHECKPOINT','체크포인트 형식과 메타데이터를 확인하세요.');
  qaKeys(checkpoint.sourceProfile,checkpoint.namespace);
  if(!bounded(checkpoint.payload))return fail(typeof checkpoint.payload==='string'?'TOO_LARGE':'INVALID_CHECKPOINT','저장 내용은 UTF-8 기준 2 MiB 이하여야 합니다.');
  if(checkpoint.checksum!==checksum(checkpoint.payload))return fail('CHECKSUM_MISMATCH','저장 내용의 체크섬이 일치하지 않습니다.');
  state=JSON.parse(checkpoint.payload);
  if(state?.schema!==checkpoint.schema||state?.version!==checkpoint.sourceVersion)return fail('VERSION_MISMATCH','파일과 저장 내용의 형식 버전이 다릅니다.');
  const valid=validateState(state);if(!valid.ok)return fail('INVALID_STATE',valid.reason);
 }catch{return fail('INVALID_CHECKPOINT','체크포인트 파일을 확인할 수 없습니다.');}
 let digest;try{digest=await sha256(canonical(checkpoint));}catch{return fail('DIGEST_UNAVAILABLE','SHA-256 무결성 검사를 사용할 수 없습니다.');}
 if(digest!==checkpoint.digest)return fail('DIGEST_MISMATCH','체크포인트 메타데이터 또는 저장 내용이 변경되었습니다.');
 return {ok:true,checkpoint,state};
}

// The caller must download this returned text only after an explicit selected
// profile action. Exactly head/slot0/slot1 are read under the source Web Lock.
export async function exportPortableCheckpoint(storage,locks,options={}){
 if(!optionsOnly(options,['sourceProfile','namespace','exporterBuild'])||!buildValid(options.exporterBuild))return fail('INVALID_REQUEST','내보낼 QA 프로필, 저장 공간과 빌드를 명시하세요.');
 const {sourceProfile,namespace,exporterBuild}=options;let keys;
 try{keys=qaKeys(sourceProfile,namespace);}catch{return fail('INVALID_PROFILE','지원되는 저장 공간의 QA 프로필을 선택하세요.');}
 if(!locks||typeof locks.request!=='function')return fail('LOCKS_UNAVAILABLE','안전한 저장 잠금을 사용할 수 없습니다.');
 let entered=false;
 try{return await locks.request(keys.lock,{mode:'exclusive'},async()=>{
  entered=true;
  const values=snapshot(storage,keys),loaded=snapshotLoad(values,sourceProfile,namespace);
  if(!loaded.ok)return loaded;
  if(!loaded.state)return fail('NO_SOURCE','선택한 QA 프로필에 확인된 저장 기록이 없습니다.');
  const envelope=JSON.parse(values.get(keys.slots[loaded.slot]));
  const checkpoint={format:PORTABLE_CHECKPOINT_FORMAT,formatVersion:PORTABLE_CHECKPOINT_VERSION,schema:STATE_SCHEMA,sourceVersion:loaded.state.version,sourceProfile,namespace,exporterBuild,exportedAt:new Date().toISOString(),sourceSlot:loaded.slot,sourceRevision:loaded.revision,checksum:loaded.checksum,recovered:loaded.recovered,payload:envelope.payload,digest:''};
  // Check the entire escaped wrapper before hashing or returning any file.
  if(!bounded(JSON.stringify({...checkpoint,digest:'0'.repeat(64)})))return fail('TOO_LARGE','체크포인트 파일 전체가 UTF-8 기준 2 MiB를 넘습니다.');
  try{checkpoint.digest=await sha256(canonical(checkpoint));}catch{return fail('DIGEST_UNAVAILABLE','SHA-256 무결성 검사를 사용할 수 없습니다.');}
  const text=JSON.stringify(checkpoint),verified=await decode(text);
  if(!verified.ok)return verified;
  return {ok:true,text,filename:`${namespace}-${sourceProfile}-r${loaded.revision}.ewqa.json`,...summary(checkpoint,loaded.state)};
 });}catch{return fail(entered?'UNAVAILABLE':'LOCK_FAILED',entered?'선택한 QA 저장을 읽을 수 없습니다. 원본은 변경하지 않았습니다.':'저장 잠금을 얻지 못했습니다.');}
}

// Read-only preview; SHA-256 detects changes, not who played or how it was earned.
export async function inspectPortableCheckpoint(text){
 const decoded=await decode(text);if(!decoded.ok)return decoded;
 return {ok:true,...summary(decoded.checkpoint,decoded.state)};
}

// Explicit confirmation binds all three preview tokens. Destination is supplied
// independently, never trusted from the file. Any uncertain write is terminal:
// no cleanup, automatic retry, deletion, replacement, or source access follows.
export async function restorePortableCheckpoint(storage,locks,options={}){
 if(!optionsOnly(options,['text','expectedSourceProfile','expectedNamespace','expectedDigest','targetProfile','namespace']))return fail('INVALID_REQUEST','복구할 파일과 별도의 QA 대상 선택을 확인하세요.');
 const {text,expectedSourceProfile,expectedNamespace,expectedDigest,targetProfile,namespace}=options;let keys;
 try{keys=qaKeys(targetProfile,namespace);}catch{return fail('INVALID_PROFILE','복구할 새 QA 프로필과 저장 공간을 확인하세요.');}
 try{qaKeys(expectedSourceProfile,expectedNamespace);}catch{return fail('CHECKPOINT_CONFIRMATION_REQUIRED','먼저 원본 QA 프로필과 저장 공간을 확인하세요.');}
 if(typeof expectedDigest!=='string'||!digestPattern.test(expectedDigest))return fail('CHECKPOINT_CONFIRMATION_REQUIRED','먼저 복구할 체크포인트의 SHA-256을 확인하세요.');
 if(expectedNamespace!==namespace)return fail('INVALID_NAMESPACE','같은 저장 공간의 QA 프로필로만 복구할 수 있습니다.');
 if(targetProfile===expectedSourceProfile)return fail('RESTORE_TARGET_REQUIRED','원본과 다른 비어 있는 QA 프로필 이름을 입력하세요.');
 if(!locks||typeof locks.request!=='function')return fail('LOCKS_UNAVAILABLE','안전한 저장 잠금을 사용할 수 없습니다.');
 const decoded=await decode(text);if(!decoded.ok)return decoded;
 const {checkpoint,state}=decoded;
 if(checkpoint.sourceProfile!==expectedSourceProfile||checkpoint.namespace!==expectedNamespace||checkpoint.digest!==expectedDigest)return fail('CHECKPOINT_CONFLICT','확인한 원본 프로필, 저장 공간 또는 체크포인트와 다릅니다. 다시 확인하세요.');
 const envelope=JSON.stringify({schema:checkpoint.schema,revision:1,checksum:checkpoint.checksum,previousCommit:null,payload:checkpoint.payload});
 const head=JSON.stringify({slot:0,revision:1,checksum:checkpoint.checksum,previousCommit:null});
 const uncertain=()=>fail('RESTORE_UNCERTAIN','복구 결과가 확실하지 않습니다. 덮어쓰거나 자동 재시도하지 않습니다. QA 이어하기에서 확인하고 다른 빈 QA 이름을 사용하세요.');
 let entered=false,writeStarted=false;
 try{return await locks.request(keys.lock,{mode:'exclusive'},()=>{
  entered=true;
  if([...snapshot(storage,keys,true).values()].some(value=>value!==null))return fail('RESTORE_TARGET_EXISTS','대상 QA 프로필에 기록이 있습니다. 손상된 기록도 덮어쓰지 않습니다.');
  writeStarted=true;storage.setItem(keys.slots[0],envelope);
  const staged=snapshot(storage,keys,true);
  if([...staged].some(([key,value])=>value!==(key===keys.slots[0]?envelope:null)))return uncertain();
  storage.setItem(keys.head,head);
  const committed=snapshot(storage,keys,true);
  if([...committed].some(([key,value])=>value!==(key===keys.head?head:key===keys.slots[0]?envelope:null)))return uncertain();
  const loaded=snapshotLoad(committed,targetProfile,namespace);
  if(!loaded.ok||loaded.recovered||loaded.slot!==0||loaded.revision!==1||loaded.checksum!==checkpoint.checksum||loaded.state?.version!==checkpoint.sourceVersion)return uncertain();
  return {ok:true,...summary(checkpoint,state),profile:targetProfile,slot:0,revision:1};
 });}catch{return writeStarted?uncertain():fail(entered?'UNAVAILABLE':'LOCK_FAILED',entered?'대상 QA 프로필을 읽을 수 없어 복구하지 않았습니다.':'복구 잠금을 얻지 못했습니다.');}
}
