// A failed durable commit cannot be escaped by closing a visual panel.
export function createRuntimeGate(){
 let reason=null;
 return {get blocked(){return reason!==null;},get reason(){return reason;},
  block(message){reason=String(message||'저장 상태를 다시 확인하세요.');},
  resolveLoad(result){if(result?.ok&&result.state){reason=null;return true;}return false;},
  canResume({hasBattle,lifeDown}){return !!hasBattle&&!lifeDown&&reason===null;},
  canStep({hasBattle,paused,busy,hidden,focused=true}){return !!hasBattle&&!paused&&!busy&&!hidden&&focused&&reason===null;}
 };
}
