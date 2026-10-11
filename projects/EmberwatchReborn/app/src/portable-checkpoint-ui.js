// Explicit recovery-page-only local files. No gameplay, network, migration or
// storage enumeration. Pending selections also guard the actual lock callback.
import {exportPortableCheckpoint,inspectPortableCheckpoint,restorePortableCheckpoint,PORTABLE_CHECKPOINT_VERSION,PORTABLE_CHECKPOINT_LIMIT} from './portable-checkpoint.js';
import {profileKeys} from './save.js';

const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const qa=(profile,namespace)=>{try{if(!profile?.startsWith('qa-'))return false;profileKeys(profile,namespace);return true;}catch{return false;}};
const limits='<p class="warning">이 파일은 선택 시점에 확인한 커밋입니다. 미저장 진행과 이후 진행은 포함하지 않습니다. SHA-256은 체크포인트 내용의 무결성만 확인하며 정상 플레이나 작성자를 증명하지 않습니다. 저장 형식을 변환하지 않고 게임을 자동으로 시작하지 않습니다. 원본과 기존 대상 기록은 덮어쓰지 않습니다.</p>';
const back='<button id="portableBack" data-action="portable-title">복구 도구 시작 화면으로</button>';
// Display-only File metadata. It never supplies any checkpoint/restore token.
const fileReceipt=(file,state,label='선택한 로컬 파일')=>file?`<section aria-label="${esc(label)}"><p>${esc(label)} · ${esc(state)}</p><p id="portableSelectedFileName" dir="auto" style="overflow-wrap:anywhere;white-space:pre-wrap;max-width:100%;min-width:0">${esc(file.name)}</p><p id="portableSelectedFileSize">크기: ${Number.isSafeInteger(file.size)&&file.size>=0?`${file.size} 바이트`:'확인할 수 없음'}</p></section>`:'<p id="portableSelectedFileName">선택한 파일이 없습니다.</p>';
const fileInput=(file=null,state='')=>`<label class="row" style="flex-wrap:wrap">직접 선택한 QA 체크포인트 JSON 파일 (최대 2 MiB)<input id="portableFile" type="file" accept=".json,application/json" aria-label="복구할 QA 체크포인트 JSON 파일" aria-describedby="portableSelectedFileName portableFileHelp" style="max-width:100%;min-width:0"></label>${fileReceipt(file,state)}<p id="portableFileHelp" class="minor">위 파일 선택 칸은 다시 선택할 때 사용합니다. 칸이 비어 보여도 이 화면이 읽은 파일명과 크기는 아래에 표시됩니다. 파일명은 참고 정보이며, 복원은 검증한 내용의 원본 QA 이름과 저장 공간을 기준으로 합니다.</p>`;
const sourceInput=source=>`<label class="row">내보낼 원본 QA 프로필<input id="portableSource" aria-label="최신 체크포인트 원본 QA 프로필" maxlength="51" value="${esc(source)}" autocomplete="off"></label><button id="portablePreview" data-action="portable-preview">이 QA의 최신 커밋 미리 확인</button>`;
const metadata=s=>`<dl><dt>원본 QA 프로필</dt><dd>${esc(s.sourceProfile)}</dd><dt>저장 공간</dt><dd>${esc(s.namespace)}</dd><dt>원본 저장 형식</dt><dd>${esc(s.sourceVersion)}</dd><dt>내보낸 도구 빌드</dt><dd>${esc(s.exporterBuild)}</dd><dt>내보낸 시각 (UTC)</dt><dd>${esc(s.exportedAt)}</dd><dt>원본 커밋</dt><dd>revision ${esc(s.sourceRevision)} · slot ${esc(s.sourceSlot)}</dd><dt>진행</dt><dd>레벨 ${esc(s.level)} · XP ${esc(s.xp)} · 누적 획득 XP ${esc(s.earnedXp)} · 골드 ${esc(s.gold)} · 난이도 ${esc(s.difficulty)}</dd><dt>저장 체크섬 (FNV)</dt><dd>${esc(s.checksum)}</dd><dt>체크포인트 내용 SHA-256</dt><dd style="overflow-wrap:anywhere">${esc(s.digest)}</dd><dd class="minor">digest 필드를 제외한 메타데이터와 원본 payload를 정해진 필드 순서의 JSON으로 만든 UTF-8 내용의 해시입니다. 전체 파일 바이트를 계산하는 sha256sum과는 계산 대상이 다릅니다.</dd><dt>커밋 선택</dt><dd>${s.recovered?`대체 커밋 (fallback): ${esc(s.recoveryNote)}`:'현재 head의 확인된 커밋 (fallback 아님)'}</dd></dl>`;

// Synchronous gesture-bound download; the object URL is always released, even
// when the browser refuses the click. The caller never claims disk completion.
export function downloadPortableFile(document,text,filename,{Blob:BlobType=globalThis.Blob,URL:urlApi=globalThis.URL}={}){
 if(typeof BlobType!=='function'||typeof urlApi?.createObjectURL!=='function'||typeof urlApi?.revokeObjectURL!=='function'||typeof document?.createElement!=='function')throw Error('Local download unavailable');
 if(!/^[a-z0-9-]+\.ewqa\.json$/.test(filename))throw Error('Unsafe checkpoint filename');
 const blob=new BlobType([text],{type:'application/json;charset=utf-8'}),url=urlApi.createObjectURL(blob);let anchor;
 try{anchor=document.createElement('a');anchor.href=url;anchor.download=filename;anchor.hidden=true;document.body.appendChild(anchor);anchor.click();}
 finally{try{anchor?.remove();}finally{urlApi.revokeObjectURL(url);}}
}

export function createPortableCheckpointUi({document,storage,locks,namespace,build,render,epoch,onTitle,exportCheckpoint=exportPortableCheckpoint,inspectCheckpoint=inspectPortableCheckpoint,restoreCheckpoint=restorePortableCheckpoint,readFile=file=>file.text(),download=(text,filename)=>downloadPortableFile(document,text,filename)}){
 let selection=0,context=null,busy=null;
 const el=id=>document.getElementById(id);
 const status=message=>{const node=el('portableStatus');if(node)node.textContent=message;};
 const reset=()=>{selection++;context=null;busy=null;for(const id of ['portableDownload','portableRestore']){const button=el(id);if(button)button.disabled=true;}};
 const homeHtml=()=>`<section aria-label="최신 QA 체크포인트"><h2>최신 커밋 QA 체크포인트</h2><p>과거 업그레이드 백업과 별개입니다. 명시한 QA 하나만 읽으며 프로필 목록을 검색하지 않습니다. 파일은 별도 버튼으로 이 기기에 내려받고, 서버나 다른 기기로 자동 전송하지 않습니다.</p>${sourceInput('')}${fileInput()}<p id="portableStatus" role="status"></p>${limits}</section>`;
 const show=(title,html)=>render(title,html);
 const stamp=(c)=>{c.selection=++selection;c.epoch=epoch();context=c;return c;};
 const active=(c,token=c.selection,screen=c.epoch)=>context===c&&selection===token&&epoch()===screen;
 const attrs=c=>`data-portable-source="${esc(c.summary.sourceProfile)}" data-portable-namespace="${esc(c.summary.namespace)}" data-portable-digest="${esc(c.summary.digest)}" data-portable-selection="${c.selection}"`;
 const matches=(target,c)=>target.dataset.portableSource===c.summary.sourceProfile&&target.dataset.portableNamespace===c.summary.namespace&&target.dataset.portableDigest===c.summary.digest&&target.dataset.portableSelection===String(c.selection);
 const usable=target=>target&&!target.disabled&&target.id&&el(target.id)===target;
 const guardedStorage=current=>({getItem(key){if(!current())throw Error('Selection cancelled');return storage.getItem(key);},setItem(key,value){if(!current())throw Error('Selection cancelled');return storage.setItem(key,value);}});
 const guardedLocks=current=>!locks||typeof locks.request!=='function'?locks:{request(name,options,callback){if(!current())throw Error('Selection cancelled');return locks.request(name,options,(...args)=>{if(!current())throw Error('Selection cancelled');return callback(...args);});}};
 function exportForm(source,summary=null,message=''){
  const c={kind:'export',summary,source,downloaded:false};
  // Bind the button after this render's epoch and the new selection are known.
  c.selection=selection+1;
  show('최신 커밋 QA 체크포인트 내보내기',`${sourceInput(source)}${summary?metadata(summary):''}<p id="portableStatus" role="status">${esc(message)}</p>${summary?`<button id="portableDownload" data-action="portable-download" ${attrs(c)}>확인한 체크포인트 JSON 내려받기</button>`:''}${limits}${back}`);
  stamp(c);return c;
 }
 async function preview(){
  const sourceNode=el('portableSource'),source=sourceNode?.value;
  if(busy)return false;
  reset();
  if(!qa(source,namespace)){exportForm(source??'',null,'qa-로 시작하는 유효한 원본 QA 프로필을 명시하세요.');return false;}
  const c=exportForm(source,null,'선택한 QA의 저장 잠금 아래 최신 커밋을 확인 중입니다. 아직 파일을 내려받지 않습니다.');
  const token=c.selection,screen=c.epoch,node=el('portableSource'),current=()=>active(c,token,screen)&&el('portableSource')===node&&node.value===source;
  busy=c;let result;
  try{result=await exportCheckpoint(guardedStorage(current),guardedLocks(current),{sourceProfile:source,namespace,exporterBuild:`${build} · portable-v${PORTABLE_CHECKPOINT_VERSION}`});}
  catch{result={ok:false,reason:'QA 체크포인트를 읽지 못했습니다. 원본은 변경하지 않았습니다.'};}
  if(!current())return false;busy=null;
  if(!result?.ok){exportForm(source,null,result?.reason??'체크포인트를 확인하지 못했습니다. 원본은 변경하지 않았습니다.');return false;}
  if(result.sourceProfile!==source||result.namespace!==namespace||typeof result.text!=='string'||typeof result.digest!=='string'){
   exportForm(source,null,'요청한 원본과 확인 결과가 달라 내려받기를 중단했습니다.');return false;
  }
  const ready=exportForm(source,Object.freeze({...result}),'미리 확인이 끝났습니다. 아래 버튼을 눌러야 로컬 파일 다운로드를 요청합니다.');ready.text=result.text;ready.filename=result.filename;return true;
 }
 function downloadSelection(target){
  const c=context;if(!c||c.kind!=='export'||!c.summary||busy||c.downloaded||!active(c)||!matches(target,c)||el('portableSource')?.value!==c.source)return false;
  c.downloaded=true;target.disabled=true;busy=c;
  try{download(c.text,c.filename);status('로컬 파일 다운로드를 요청했습니다. 브라우저의 다운로드 목록에서 저장 여부를 확인하세요. 서버로 전송하지 않았습니다.');}
  catch{status('로컬 다운로드를 시작하지 못했거나 결과를 확인하지 못했습니다. 원본은 그대로입니다. 다운로드 목록을 확인한 뒤 필요하면 원본을 다시 미리 확인하세요.');}
  finally{if(context===c)busy=null;}return true;
 }
 function restoreForm(text,summary,file,message=''){
  const c={kind:'restore',text,file,summary:Object.freeze({...summary})};c.selection=selection+1;
  show('파일 QA 체크포인트 복원 확인',`${fileInput(file,'내용 검증 완료')}${metadata(summary)}${limits}<p>현재 복구 도구 저장 공간: <strong>${esc(namespace)}</strong>. 원본 이름과 파일의 저장 공간을 아래에 직접 입력하고, 원본과 다른 빈 QA 이름을 따로 정하세요. head·슬롯·과거 백업 중 하나라도 남아 있으면 복원하지 않습니다.</p><label class="row">파일의 원본 QA 이름 확인<input id="portableConfirmSource" aria-label="파일의 원본 QA 이름 확인" value="" maxlength="51" autocomplete="off"></label><label class="row">파일의 저장 공간 확인<input id="portableConfirmNamespace" aria-label="파일의 저장 공간 확인" value="" autocomplete="off"></label><label class="row">별도의 비어 있는 대상 QA 이름<input id="portableTarget" aria-label="별도의 비어 있는 대상 QA 이름" value="" maxlength="51" autocomplete="off"></label><p id="portableStatus" role="status">${esc(message)}</p><button id="portableRestore" data-action="portable-restore" ${attrs(c)} ${summary.namespace===namespace?'':'disabled'}>이 파일을 확인한 빈 QA 대상으로 복원</button>${back}`);
  stamp(c);if(summary.namespace!==namespace)status('파일과 현재 저장 공간이 다릅니다. 같은 저장 공간의 복구 도구에서만 복원할 수 있습니다.');return c;
 }
 const fileForm=(file,state,message)=>show('파일 QA 체크포인트 확인',`${fileInput(file,state)}<p id="portableStatus" role="status">${esc(message)}</p>${limits}${back}`);
 // A native chooser cancel emits `cancel`, not necessarily `change`. Ignore
 // detached inputs, just as selectFile does; never assign FileList/input.value.
 document.addEventListener('cancel',event=>{
  if(event.target?.id!=='portableFile'||event.target!==el('portableFile'))return false;
  reset();fileForm(null,'','파일 선택을 취소했습니다. 복원하려면 파일을 다시 선택하세요.');return true;
 });
 async function selectFile(input){
  if(input!==el('portableFile'))return false;
  reset();const files=input.files;
  if(!files||files.length!==1){fileForm(null,'','JSON 파일 하나를 직접 선택하세요. 파일을 읽거나 복원하지 않았습니다.');return false;}
  const file=files[0],receipt=Object.freeze({name:String(file?.name??'JSON 파일'),size:file?.size});
  if(!Number.isSafeInteger(receipt.size)||receipt.size<0||receipt.size>PORTABLE_CHECKPOINT_LIMIT){fileForm(receipt,'검증하지 않음','파일은 2 MiB 이하여야 합니다. 크기를 먼저 확인했으며 파일 내용은 읽지 않았습니다.');return false;}
  fileForm(receipt,'내용 검증 중','파일을 한 번 읽고 무결성을 확인 중입니다. 아직 복원하지 않습니다.');
  const c=stamp({kind:'file',file:receipt}),token=c.selection,screen=c.epoch,current=()=>active(c,token,screen);busy=c;
  let text,result;
  try{text=await readFile(file);if(!current())return false;result=await inspectCheckpoint(text);}
  catch{result={ok:false,reason:'선택한 로컬 파일을 읽거나 확인하지 못했습니다. 복원하지 않았습니다.'};}
  if(!current())return false;busy=null;
  if(!result?.ok){reset();fileForm(receipt,'검증 실패',result?.reason??'유효한 QA 체크포인트 파일이 아닙니다. 복원하지 않았습니다.');return false;}
  restoreForm(text,result,receipt);return true;
 }
 function inputChanged(input){
  if(!input||el(input.id)!==input)return false;
  if(input.id==='portableSource'){
   selection++;context=null;busy=null;const button=el('portableDownload');if(button)button.disabled=true;status('원본 선택이 바뀌었습니다. 최신 커밋을 다시 미리 확인하세요.');return true;
  }
  if(!['portableConfirmSource','portableConfirmNamespace','portableTarget'].includes(input.id))return false;
  const c=context;if(!c||c.kind!=='restore'||c.epoch!==epoch())return false;
  c.selection=++selection;busy=null;const button=el('portableRestore');if(button){const replacement=button.cloneNode(true);replacement.dataset.portableSelection=String(c.selection);replacement.disabled=c.summary.namespace!==namespace;button.replaceWith(replacement);}
  status('현재 입력을 확인한 뒤 복원 버튼을 누르세요.');return true;
 }
 async function restoreSelection(target){
  const c=context;if(!c||c.kind!=='restore'||busy||!active(c)||!matches(target,c))return false;
  const ids=['portableConfirmSource','portableConfirmNamespace','portableTarget'],nodes=ids.map(el),values=nodes.map(node=>node?.value),[source,confirmedNamespace,targetProfile]=values;
  if(source!==c.summary.sourceProfile||confirmedNamespace!==c.summary.namespace){status('파일에 표시된 원본 QA 이름과 저장 공간을 정확히 입력하세요.');return false;}
  if(confirmedNamespace!==namespace){status('같은 저장 공간으로만 복원할 수 있습니다.');return false;}
  if(!qa(targetProfile,namespace)||targetProfile===source){status('원본과 다른 비어 있는 qa- 대상 이름을 따로 입력하세요.');return false;}
  const token=c.selection,screen=c.epoch,current=()=>active(c,token,screen)&&ids.every((id,i)=>el(id)===nodes[i]&&nodes[i].value===values[i]);
  busy=c;target.disabled=true;status('선택한 빈 QA 대상의 잠금과 저장 결과를 확인 중입니다. 자동으로 다시 시도하지 않습니다.');let result;
  try{result=await restoreCheckpoint(guardedStorage(current),guardedLocks(current),{text:c.text,expectedSourceProfile:source,expectedNamespace:confirmedNamespace,expectedDigest:c.summary.digest,targetProfile,namespace});}
  catch{result={ok:false,code:'RESTORE_UNCERTAIN',reason:'복원 결과를 확인하지 못했습니다.'};}
  if(!current())return false;
  reset();
  if(!result?.ok){
   const uncertain=!result||result.code==='RESTORE_UNCERTAIN';
   show(uncertain?'복원 결과 확인 필요':'QA 체크포인트 복원 중단',`${fileReceipt(c.file,'내용 검증 완료','복원을 시도한 파일')}<p>선택한 대상: <strong>${esc(targetProfile)}</strong> · ${esc(namespace)}</p><p id="portableStatus" role="status">${esc(result?.reason??'복원 결과를 확인하지 못했습니다.')}</p><p>${uncertain?'대상에 일부 또는 전체 기록이 남았을 수 있습니다. 지우거나 덮어쓰거나 자동 재시도하지 않습니다. 같은 저장 공간의 QA 이어하기에서 결과를 확인하세요.':'기존 대상 기록을 덮어쓰지 않습니다. 대상 이름과 접근 가능 여부를 확인하세요.'} 원본 프로필과 선택한 파일은 그대로 보존됩니다.</p>${limits}${back}`);return false;
  }
  show('파일 QA 체크포인트를 보존했습니다',`${fileReceipt(c.file,'내용 검증 완료','복원에 사용한 파일')}<p id="portableStatus" role="status">${esc(targetProfile)} · ${esc(namespace)}에 저장 형식 ${esc(c.summary.sourceVersion)}의 체크포인트를 복원했습니다.</p><p>새 대상 revision ${esc(result.revision)} · 원본 revision ${esc(c.summary.sourceRevision)} · 레벨 ${esc(c.summary.level)} · XP ${esc(c.summary.xp)}</p><p>원본 프로필과 파일은 그대로 보존됩니다. 자동으로 이어하지 않습니다. 같은 저장 공간의 게임 시작 화면에서 QA 이름 <strong>${esc(targetProfile)}</strong>을 직접 입력하세요. 현재판으로 이어가면 이후 저장 시 새 형식으로 이행할 수 있습니다.</p>${limits}${back}`);return true;
 }
 function click(target){
  if(!usable(target))return false;
  if(target.dataset.action==='portable-title'){reset();onTitle();return true;}
  if(target.dataset.action==='portable-preview')return preview();
  if(target.dataset.action==='portable-download')return downloadSelection(target);
  if(target.dataset.action==='portable-restore')return restoreSelection(target);
  return false;
 }
 return {homeHtml,reset,click,inputChanged,selectFile};
}
