import {mountRecoveryPage,recoveryNamespace} from './recovery-page.js';
// No gameplay loop, audio, auto-load or auto-save runs on this entry point.
try{mountRecoveryPage({document,storage:localStorage,locks:navigator.locks,pathname:location.pathname});}
catch{
 const namespace=recoveryNamespace(location.pathname),gamePath=namespace&&namespace!=='release'?`/${namespace}/`:'/';
 document.getElementById('modal').innerHTML=`<section class="panel"><h1>저장 복구 도구</h1><p>이 브라우저의 저장 공간에 접근하지 못했습니다. 원본을 바꾸거나 다른 곳으로 전송하지 않았습니다.</p><a href="${gamePath}">${namespace?'같은 저장 공간의':'기본 사이트'} 게임 시작 화면</a></section>`;
}
