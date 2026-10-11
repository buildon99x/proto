// This tool still requires an explicit selected local QA profile for every IO.
export const validR14RecoveryPath=path=>['/qa-r14/recovery','/qa-r14/recovery/','/qa-r14/recovery/index.html','/qa-r14/recovery.html'].includes(path);
if(typeof document!=='undefined'&&typeof location!=='undefined'){
 if(validR14RecoveryPath(location.pathname))await import('./recovery-main.js');
 else document.body.textContent='R14 복구 도구 주소를 확인하세요. 이 주소에서는 저장을 읽고 변경하지 않습니다.';
}
