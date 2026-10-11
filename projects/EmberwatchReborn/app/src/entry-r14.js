// Fail closed before importing any game module with storage/UI side effects.
export const validR14GamePath=path=>path==='/qa-r14/'||path==='/qa-r14/index.html';
if(typeof document!=='undefined'&&typeof location!=='undefined'){
 if(validR14GamePath(location.pathname))await import('./main.js');
 else {document.body.textContent='R14는 /qa-r14/ 전용 후보입니다. 이 주소에서는 게임이나 저장을 읽고 변경하지 않습니다.';}
}
