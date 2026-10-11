import {createStore,profileKeys} from './save.js';
export const CANDIDATE_NAMESPACE='qa-r4';
export const candidateNamespace=path=>typeof path==='string'?(/^\/(qa-r(?:[456789]|10|11|12|14))(?:\/|$)/.exec(path)?.[1]??null):null;
export const candidatePath=path=>candidateNamespace(path)!==null;
// An unrecognized QA-looking URL must never silently share release storage.
// Keep existing supported candidates and ordinary non-QA release paths intact.
export function profileNamespaceForPath(path){
 const candidate=candidateNamespace(path);if(candidate)return candidate;
 if(typeof path!=='string')return null;
 const first=value=>value.replace(/^\/+/, '').split('/')[0];
 let segment=first(path);try{segment=first(decodeURIComponent(path));}catch{}
 return /^qa-/i.test(segment)?null:'release';
}

const fail=(code,reason)=>({ok:false,code,reason});
// Explicit, one-time, UI-requested fork of this reimplementation's own QA
// profile. It neither imports a file nor reads/writes the original game's save.
export async function copyReleaseQaProfile(storage,locks,{sourceProfile,targetProfile,sourceNamespace='release',targetNamespace=CANDIDATE_NAMESPACE}){
 const spaces=['release','qa-r4','qa-r5','qa-r6','qa-r7','qa-r8','qa-r9','qa-r10','qa-r11','qa-r12','qa-r14'];
 if(!(spaces.indexOf(sourceNamespace)>=0&&spaces.indexOf(targetNamespace)>spaces.indexOf(sourceNamespace)))return fail('INVALID_NAMESPACE','지원하지 않는 후보 복사 경로입니다.');
 if(typeof sourceProfile!=='string'||typeof targetProfile!=='string')return fail('INVALID_PROFILE','QA 프로필 이름을 확인하세요.');
 try{profileKeys(sourceProfile,sourceNamespace);profileKeys(targetProfile,targetNamespace);}catch{return fail('INVALID_PROFILE','QA 프로필 이름을 확인하세요.');}
 if(!sourceProfile.startsWith('qa-')||!targetProfile.startsWith('qa-'))return fail('QA_ONLY','일반 프로필은 후보 공간으로 복사하지 않습니다.');
 if(!locks||typeof locks.request!=='function')return fail('LOCKS_UNAVAILABLE','안전한 저장 잠금을 사용할 수 없습니다.');
 const source=createStore(storage,{profile:sourceProfile,namespace:sourceNamespace}),target=createStore(storage,{profile:targetProfile,namespace:targetNamespace});
 // Restore and copy share deterministic lock order. Both are held through raw
 // target occupancy inspection and commit, without recursively taking a lock.
 const names=[source.keys.lock,target.keys.lock].sort();
 try{return await locks.request(names[0],{mode:'exclusive'},()=>locks.request(names[1],{mode:'exclusive'},()=>{
  const original=source.load();if(!original.ok)return original;if(!original.state)return fail('NO_SOURCE','해당 기존 QA 기록이 없습니다.');
  const prefix=target.keys.head.replace(/\.head$/,'');
  const occupied=[target.keys.head,...target.keys.slots,`${prefix}.pre-v4`,`${prefix}.pre-v5`];
  if(occupied.some(key=>storage.getItem(key)!==null))return fail('CANDIDATE_EXISTS','이미 후보 기록이 있습니다. 덮어쓰지 않고 후보 이어하기를 사용하세요.');
  const saved=target.save(original.state,{expectedRevision:0});if(!saved.ok)return saved;
  const copied=target.load();if(!copied.ok||copied.checksum!==original.checksum)return fail('COPY_UNCERTAIN','복사 결과를 확인하지 못했습니다. 후보 이어하기로 저장을 확인하세요.');
  return {ok:true,sourceRevision:original.revision,sourceChecksum:original.checksum,targetRevision:copied.revision,profile:targetProfile};
 }));}catch{return fail('COPY_UNCERTAIN','복사 결과를 확인하지 못했습니다. 원본 QA 기록은 변경하지 않습니다.');}
}
