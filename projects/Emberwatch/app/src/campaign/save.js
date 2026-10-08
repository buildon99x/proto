// Campaign storage is deliberately independent from the shipped expedition.
// No legacy character, inventory or class is converted or removed here.
export const CAMPAIGN_SAVE = Object.freeze({
 schema:'emberwatch.campaign',version:2,
 head:'emberwatch-campaign.v2.head',slots:['emberwatch-campaign.v2.slot0','emberwatch-campaign.v2.slot1'],
 legacy:'emberwatch-save',legacyBackup:'emberwatch-legacy.v1.backup',maxBytes:2*1024*1024
});
export const CAMPAIGN_CLASSES=Object.freeze(['warrior','mage','archer']);
export const CAMPAIGN_SLOTS=Object.freeze(['mainHand','offHand','head','chest','hands','feet','accessory']);
const record=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
const integer=(x,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(x)&&x>=min&&x<=max;
function jsonSafe(value,ancestors=new Set(),depth=0){
 if(depth>80)return false;
 if(value===null||typeof value==='string'||typeof value==='boolean')return true;
 if(typeof value==='number')return Number.isFinite(value);
 if(typeof value!=='object'||ancestors.has(value))return false;
 if(Array.isArray(value)&&Object.keys(value).length!==value.length)return false;
 if(!Array.isArray(value)&&Object.getPrototypeOf(value)!==Object.prototype&&Object.getPrototypeOf(value)!==null)return false;
 ancestors.add(value);const valid=Object.values(value).every(x=>jsonSafe(x,ancestors,depth+1));ancestors.delete(value);return valid;
}
export function campaignChecksum(text){let hash=2166136261;for(let i=0;i<text.length;i++){hash^=text.charCodeAt(i);hash=Math.imul(hash,16777619);}return (hash>>>0).toString(16).padStart(8,'0');}
export function validateCampaignSave(save){
 const errors=[];
 if(!jsonSafe(save))return {ok:false,errors:['저장 내용에 지원하지 않는 값이나 순환 참조가 있습니다.']};
 if(!record(save)||save.schema!==CAMPAIGN_SAVE.schema||save.campaignVersion!==2)return {ok:false,errors:['캠페인 저장 형식이 아닙니다. 기존 원정은 별도로 보관합니다.']};
 const c=save.character,w=save.world,i=save.inventory;
 if(!record(c)||!CAMPAIGN_CLASSES.includes(c.classId))errors.push('지원하지 않는 캠페인 직업입니다.');
 if(!integer(c?.level,1,50))errors.push('캐릭터 레벨이 올바르지 않습니다.');
 if(!record(c?.attributes)||!['strength','dexterity','intelligence'].every(k=>integer(c.attributes[k])))errors.push('능력치 배분 정보가 올바르지 않습니다.');
 if(!integer(c?.attributePoints)||!integer(c?.skillPoints))errors.push('성장 포인트가 올바르지 않습니다.');
 if(!record(c?.skills)||!Object.values(c.skills).every(x=>integer(x,0,100))||!record(c?.exclusiveBranches))errors.push('기술 선택 정보가 올바르지 않습니다.');
 if(!record(c?.equipment)||!CAMPAIGN_SLOTS.every(k=>c.equipment[k]===null||typeof c.equipment[k]==='string'))errors.push('일곱 장비 슬롯이 필요합니다.');
 if(!record(w)||typeof w.currentRegionId!=='string'||!Number.isFinite(w.timeMinutes)||w.timeMinutes<0||!record(w.questFlags)||!record(w.puzzleStates))errors.push('세계 진행 정보가 올바르지 않습니다.');
 for(const k of ['visitedLevels','openedShortcuts','openedChests'])if(!Array.isArray(w?.[k]))errors.push('탐험 기록이 올바르지 않습니다: '+k);
 if(!record(i)||!Array.isArray(i.equipmentInstances)||!record(i.materials)||!Array.isArray(i.tools)||!Array.isArray(i.consumables)||!Array.isArray(i.questItems))errors.push('소지품 정보가 올바르지 않습니다.');
 if(!integer(save.gold))errors.push('금화 정보가 올바르지 않습니다.');
 return {ok:errors.length===0,errors};
}
export function createCampaignSave(classId='warrior'){
 if(!CAMPAIGN_CLASSES.includes(classId))throw new Error('Unknown campaign class: '+classId);
 return {schema:CAMPAIGN_SAVE.schema,campaignVersion:2,
  character:{classId,level:1,tier:'apprentice',attributes:{strength:0,dexterity:0,intelligence:0},attributePoints:0,skillPoints:0,skills:{},exclusiveBranches:{},equipment:Object.fromEntries(CAMPAIGN_SLOTS.map(k=>[k,null]))},
  world:{timeMinutes:0,weather:'fair',currentRegionId:'ash_hamlet',questFlags:{},visitedLevels:[],openedShortcuts:[],openedChests:[],puzzleStates:{},shopRefreshTimes:{}},
  inventory:{equipmentInstances:[],materials:{},tools:[],consumables:[],questItems:[]},gold:0,
  // Reference-driven gameplay initialization is separate from storage creation.
  initialization:'pending',transactions:[]};
}
function decode(raw){
 try{const e=JSON.parse(raw);if(!record(e)||e.schema!==CAMPAIGN_SAVE.schema||!integer(e.revision,1)||typeof e.payload!=='string'||e.checksum!==campaignChecksum(e.payload))return null;const save=JSON.parse(e.payload);return validateCampaignSave(save).ok?{save,revision:e.revision,checksum:e.checksum,previousCommit:e.previousCommit??null}:null;}catch{return null;}
}
export function createCampaignStore(storage,{now=()=>new Date().toISOString()}={}){
 function load(){
  try{
   const rawHead=storage.getItem(CAMPAIGN_SAVE.head),rawSlots=CAMPAIGN_SAVE.slots.map(k=>storage.getItem(k)),slots=rawSlots.map(decode);let head=null;
   try{head=JSON.parse(rawHead);}catch{/* recover below */}
   if(record(head)&&[0,1].includes(head.slot)){
    const committed=slots[head.slot];
    if(committed&&committed.revision===head.revision&&committed.checksum===head.checksum)return {ok:true,...committed,slot:head.slot,recovered:false};
   }
   // A staging slot is not a committed save. Recovery requires a surviving
   // head/previous-commit receipt, never merely the largest revision number.
   const receipts=[head?.previousCommit,...slots.map(x=>x?.previousCommit)].filter(record);
   const valid=receipts.flatMap(receipt=>{const value=slots[receipt.slot];return value&&value.revision===receipt.revision&&value.checksum===receipt.checksum?[{...value,slot:receipt.slot}]:[];}).sort((a,b)=>b.revision-a.revision);
   if(valid.length)return {ok:true,...valid[0],recovered:true};
   if(rawHead!==null||rawSlots.some(x=>x!==null))return {ok:false,code:'CORRUPT',error:'저장 기록을 복구하지 못했습니다. 기존 기록을 덮어쓰지 않습니다.'};
   return {ok:true,save:null,revision:0,slot:null,recovered:false};
  }catch{return {ok:false,code:'UNAVAILABLE',error:'브라우저 저장 공간에 접근할 수 없습니다.'};}
 }
 function preserveLegacy(){
  try{
   const raw=storage.getItem(CAMPAIGN_SAVE.legacy);if(raw===null)return {ok:true,present:false};
   const existing=storage.getItem(CAMPAIGN_SAVE.legacyBackup);
   if(existing!==null){const backup=JSON.parse(existing);if(typeof backup.raw!=='string'||campaignChecksum(backup.raw)!==backup.checksum)return {ok:false,error:'기존 원정 백업이 손상되어 있습니다. 원본은 보존했습니다.'};return {ok:true,present:true,created:false};}
   const backup=JSON.stringify({schema:'emberwatch.legacy-backup',version:1,createdAt:now(),checksum:campaignChecksum(raw),raw});
   storage.setItem(CAMPAIGN_SAVE.legacyBackup,backup);
   if(storage.getItem(CAMPAIGN_SAVE.legacyBackup)!==backup)throw new Error('Backup verification failed');
   return {ok:true,present:true,created:true};
  }catch{return {ok:false,error:'기존 원정을 백업하지 못했습니다. 원본은 변경하지 않았습니다.'};}
 }
 function save(snapshot,{expectedRevision}={}){
  const validation=validateCampaignSave(snapshot);if(!validation.ok)return {ok:false,code:'INVALID',error:validation.errors.join(' ')};
  let payload;try{payload=JSON.stringify(snapshot);}catch{return {ok:false,code:'INVALID',error:'저장 내용을 직렬화할 수 없습니다.'};}
  if(new TextEncoder().encode(payload).byteLength>CAMPAIGN_SAVE.maxBytes)return {ok:false,code:'TOO_LARGE',error:'저장 용량 한도를 넘었습니다. 이전 기록은 유지합니다.'};
  const previous=load();if(!previous.ok)return previous;
  if(expectedRevision!==undefined&&expectedRevision!==previous.revision)return {ok:false,code:'CONFLICT',error:'다른 창에서 진행이 변경되었습니다. 최신 저장을 다시 불러오세요.'};
  const legacy=preserveLegacy();if(!legacy.ok)return {ok:false,code:'LEGACY_BACKUP_FAILED',error:legacy.error};
  const previousCommit=previous.slot===null?null:{slot:previous.slot,revision:previous.revision,checksum:previous.checksum};
  const slot=previous.slot===0?1:0,revision=previous.revision+1,checksum=campaignChecksum(payload),envelope=JSON.stringify({schema:CAMPAIGN_SAVE.schema,revision,checksum,previousCommit,savedAt:now(),payload});
  try{
   const oldHead=storage.getItem(CAMPAIGN_SAVE.head);
   storage.setItem(CAMPAIGN_SAVE.slots[slot],envelope);
   if(storage.getItem(CAMPAIGN_SAVE.slots[slot])!==envelope)throw new Error('Slot verification failed');
   if(storage.getItem(CAMPAIGN_SAVE.head)!==oldHead)return {ok:false,code:'CONFLICT',error:'저장 중 다른 창의 변경을 감지했습니다. 최신 기록을 다시 불러오세요.'};
   const head=JSON.stringify({slot,revision,checksum,previousCommit});storage.setItem(CAMPAIGN_SAVE.head,head);
   if(storage.getItem(CAMPAIGN_SAVE.head)!==head)throw new Error('Commit verification failed');
   return {ok:true,revision,slot};
  }catch{return {ok:false,code:'WRITE_FAILED',error:'저장하지 못했습니다. 이전 저장과 기존 원정은 유지합니다.'};}
 }
 // Non-destructive export; importing/restoring requires an explicit UI choice.
 function exportSave(){const loaded=load();return loaded.ok&&loaded.save?{ok:true,json:JSON.stringify(loaded.save,null,2),revision:loaded.revision}:loaded;}
 return {load,save,preserveLegacy,exportSave};
}

// Browser writers must use the same Web Lock. A synchronous localStorage
// revision check alone cannot provide compare-and-swap across multiple tabs.
export function createCampaignSession(storage,locks,options){
 const store=createCampaignStore(storage,options);
 async function commit(snapshot,{expectedRevision}={}){
  if(!locks||typeof locks.request!=='function')return {ok:false,code:'LOCKS_UNAVAILABLE',error:'안전한 저장 잠금을 사용할 수 없습니다. 진행을 덮어쓰지 않습니다.'};
  return locks.request('emberwatch-campaign.v2.writer',{mode:'exclusive'},()=>store.save(snapshot,{expectedRevision}));
 }
 return {...store,save:commit};
}
