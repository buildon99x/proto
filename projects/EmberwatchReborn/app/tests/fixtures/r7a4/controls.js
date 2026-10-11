// Authored Emberwatch ergonomics, not a claim about Hammerwatch II default keys.
export const ACTIONS=Object.freeze({up:'위로 이동',down:'아래로 이동',left:'왼쪽 이동',right:'오른쪽 이동',attack:'기본 공격',block:'방패',charge:'방패 돌진',hammer:'잿불 망치',interact:'상호작용',potion:'물약',menu:'성장 / 설정',pause:'일시정지',heal:'온기 나누기',judgement:'단죄의 일격'});
const optionalActions=new Set(['heal','judgement']);
const actionNames=Object.keys(ACTIONS),legacyActions=actionNames.filter(action=>!optionalActions.has(action));
const base={up:['KeyW','ArrowUp'],down:['KeyS','ArrowDown'],left:['KeyA','ArrowLeft'],right:['KeyD','ArrowRight'],attack:['Mouse0','KeyJ'],block:['Mouse2','ShiftLeft','ShiftRight'],charge:['Space'],hammer:['KeyQ'],menu:['KeyC'],pause:['Escape']};
const clone=x=>JSON.parse(JSON.stringify(x));
export function controlPreset(preset='recommended'){
 if(!['recommended','legacy'].includes(preset))throw new Error('Unknown control preset');
 return {version:2,preset,bindings:{...clone(base),interact:[preset==='legacy'?'KeyE':'KeyF'],potion:[preset==='legacy'?'Digit1':'KeyR'],heal:preset==='legacy'?[]:['KeyT'],judgement:preset==='legacy'?[]:['KeyE']},blockMode:'hold',chargeDirection:'aim'};
}
const plain=x=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.getPrototypeOf(x)===Object.prototype;
export const validToken=x=>typeof x==='string'&&(/^(Key[A-Z]|Digit[0-9]|Arrow(Up|Down|Left|Right)|Shift(Left|Right)|Space|Tab|Enter|Backspace|Escape|Bracket(Left|Right)|Semicolon|Quote|Comma|Period|Slash|Backquote|Minus|Equal|Numpad[0-9]|Mouse[0-4])$/.test(x));
export function validateControls(c){
 if(!plain(c)||![1,2].includes(c.version)||!['legacy','recommended','custom'].includes(c.preset)||!plain(c.bindings)||!['hold','toggle'].includes(c.blockMode)||!['aim','movement'].includes(c.chargeDirection))return {ok:false,reason:'조작 설정 형식이 올바르지 않습니다.'};
 const actions=c.version===1?legacyActions:actionNames;
 if(Object.keys(c.bindings).length!==actions.length||!actions.every(action=>Object.hasOwn(c.bindings,action)))return {ok:false,reason:'조작 설정 형식이 올바르지 않습니다.'};
 const used=new Map();
 for(const action of actions){
  const keys=c.bindings[action],minimum=optionalActions.has(action)?0:1;
  if(!Array.isArray(keys)||keys.length<minimum||keys.length>3||!Array.from(keys).every(validToken))return {ok:false,reason:`${ACTIONS[action]}에 ${minimum}~3개의 지원 키를 지정하세요.`};
  for(const key of keys){if(key==='Escape'&&action!=='pause')return {ok:false,reason:'Esc는 안전한 일시정지용으로 예약되어 있습니다.'};if(used.has(key))return {ok:false,reason:`${tokenLabel(key)} 키가 ${ACTIONS[used.get(key)]}와 겹칩니다.`};used.set(key,action);}
 }
 return {ok:true};
}
// Validate the original version first. Old recommended/custom profiles must not
// gain today's defaults: E, T, or any other key may already belong to the user.
export function migrateControls(current){
 const valid=validateControls(current);if(!valid.ok)throw new Error(valid.reason);
 const next=clone(current);
 if(next.version===1){next.version=2;next.bindings.heal=[];next.bindings.judgement=[];}
 return next;
}
// Absent controls means a pre-R2d save. Reading never writes or replaces its keys.
export function controlsFor(state){return state?.options?.controls===undefined?controlPreset('legacy'):migrateControls(state.options.controls);}
export function rebindControl(current,action,index,token){
 const valid=validateControls(current);if(!valid.ok)return valid;
 if(!Object.hasOwn(ACTIONS,action)||!Number.isInteger(index)||index<0||index>2)return {ok:false,reason:'알 수 없는 조작입니다.'};
 const next=migrateControls(current),keys=next.bindings[action];
 if(token!==null){const owner=actionNames.find(a=>next.bindings[a].some((key,i)=>key===token&&(a!==action||i!==index)));if(owner)return {ok:false,reason:`${tokenLabel(token)} 키는 이미 ${ACTIONS[owner]}에 지정되어 있습니다.`};}
 if(token===null){if(index>=keys.length)return {ok:false,reason:'지정된 키가 없습니다.'};if(keys.length===1&&!optionalActions.has(action))return {ok:false,reason:'최소 한 개의 키는 남겨야 합니다.'};keys.splice(index,1);}
 else {if(index>keys.length)return {ok:false,reason:'빈 순서대로 키를 추가하세요.'};keys[index]=token;}
 next.preset='custom';const check=validateControls(next);return check.ok?{ok:true,controls:next}:check;
}
export function tokenLabel(token){if(typeof token!=='string'||!token)return '미지정';const names={Mouse0:'마우스 왼쪽',Mouse1:'마우스 가운데',Mouse2:'마우스 오른쪽',Mouse3:'마우스 뒤로',Mouse4:'마우스 앞으로',Space:'Space',Escape:'Esc',ShiftLeft:'왼쪽 Shift',ShiftRight:'오른쪽 Shift',ArrowUp:'↑',ArrowDown:'↓',ArrowLeft:'←',ArrowRight:'→'};return names[token]??token.replace(/^Key|^Digit/,'');}
export function actionLabel(controls,action){const keys=controls?.bindings?.[action];return Array.isArray(keys)&&keys.length?keys.map(tokenLabel).join(' / '):'미지정';}
const snapshotSkills=['hammer','charge','heal','judgement'];
const oneShot=new Set([...snapshotSkills,'interact','potion','menu','pause']);
const breaksToggle=new Set(['attack',...snapshotSkills]);
// UI owns keyboard input while a form control or button (including its child) has focus.
export function editableTarget(target){return !!target&&(target.isContentEditable===true||['INPUT','SELECT','TEXTAREA','BUTTON'].includes(target.tagName)||!!target.closest?.('button,input,select,textarea,[contenteditable="true"]'));}
export function createInputRouter(){
 const held=new Map(),pulses=new Set();let toggle=false,lastMove=null;
 const press=(token,action,controls,{repeat=false,editable=false,modified=false,paused=false}={})=>{
  if(editable||modified||repeat||held.has(token)||!Object.hasOwn(ACTIONS,action)||paused&&!['menu','pause'].includes(action))return null;
  held.set(token,action);
  if(action==='block'&&controls.blockMode==='toggle')toggle=!toggle;
  if(toggle&&breaksToggle.has(action))toggle=false;
  if(oneShot.has(action))pulses.add(action);
  return action;
 };
 const down=(token,controls,{repeat=false,editable=false,modified=false,paused=false}={})=>{
  if(editable||modified||repeat||held.has(token))return null;
  // Direct v1 callers have no new skill rows. Never infer defaults for them.
  const actions=controls.version===1?legacyActions:actionNames;
  const action=token==='Escape'?'pause':actions.find(a=>Array.isArray(controls.bindings?.[a])&&controls.bindings[a].includes(token));
  return press(token,action,controls,{paused});
 };
 const virtual=(action,pressed,controls,options={})=>{const token='Touch:'+action;if(!pressed){held.delete(token);return;}return press(token,action,controls,options);};
 return {down,up:token=>held.delete(token),virtual,
  releaseMouse(){for(const token of held.keys())if(token.startsWith('Mouse'))held.delete(token);},
  clear({resetMovement=false}={}){held.clear();pulses.clear();toggle=false;if(resetMovement)lastMove=null;},
  consume(action){const value=pulses.has(action);pulses.delete(action);return value;},
  snapshot(controls){const active=a=>[...held.values()].includes(a),move={x:Number(active('right'))-Number(active('left')),y:Number(active('down'))-Number(active('up'))};if(move.x||move.y)lastMove={...move};const result={move,lastMove:lastMove?{...lastMove}:null,attack:active('attack'),block:controls.blockMode==='toggle'?toggle:active('block')};for(const action of snapshotSkills){result[action]=pulses.has(action);pulses.delete(action);}return result;}
 };
}
