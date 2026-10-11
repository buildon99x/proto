import {validateSkillSlotShape,seedSkillSlots,validateSkillSlots} from './skill-loadout.js';
// Authored Emberwatch ergonomics, not a claim about Hammerwatch II default keys.
export const ACTIONS=Object.freeze({up:'위로 이동',down:'아래로 이동',left:'왼쪽 이동',right:'오른쪽 이동',attack:'기본 공격',block:'방패',charge:'방패 돌진',hammer:'잿불 망치',interact:'상호작용',potion:'물약',menu:'성장 / 설정',pause:'일시정지',heal:'온기 나누기',judgement:'단죄의 일격',expert1:'전문 기술 슬롯 1',expert2:'전문 기술 슬롯 2'});
export const MOBILITY_ACTIONS=Object.freeze({moveOnly:'지점으로 이동',stop:'이동 멈춤',attackInPlace:'제자리 공격',dodgeSprint:'구르기 / 홀드 질주',dodgeOnly:'구르기만',sprint:'별도 달리기'});
export const UTILITY_ACTIONS=Object.freeze({townPortal:'마을 귀환 포탈'});
const allActions={...ACTIONS,...MOBILITY_ACTIONS,...UTILITY_ACTIONS};
const expertActions=new Set(['expert1','expert2']);
const optionalActions=new Set(['heal','judgement',...expertActions]);
const actionNames=Object.keys(ACTIONS),legacyActions=actionNames.filter(action=>!optionalActions.has(action)),adeptActions=actionNames.filter(action=>!expertActions.has(action));
const v4Actions=[...actionNames,...Object.keys(MOBILITY_ACTIONS)];
const actionsForVersion=version=>version===1?legacyActions:version===2?adeptActions:version>=4?v4Actions:actionNames;
const base={up:['KeyW','ArrowUp'],down:['KeyS','ArrowDown'],left:['KeyA','ArrowLeft'],right:['KeyD','ArrowRight'],attack:['Mouse0','KeyJ'],block:['Mouse2','ShiftLeft','ShiftRight'],charge:['Space'],hammer:['KeyQ'],menu:['KeyC'],pause:['Escape']};
const clone=x=>JSON.parse(JSON.stringify(x));
export const isPoeControls=current=>current?.version===4||current?.version===5;
export function controlPreset(preset='recommended',previous=null){
 if(!['recommended','legacy'].includes(preset))throw new Error('Unknown control preset');
 const result={version:3,preset,bindings:{...clone(base),interact:[preset==='legacy'?'KeyE':'KeyF'],potion:[preset==='legacy'?'Digit1':'KeyR'],heal:preset==='legacy'?[]:['KeyT'],judgement:preset==='legacy'?[]:['KeyE'],expert1:preset==='legacy'?[]:['Digit2'],expert2:preset==='legacy'?[]:['Digit3']},blockMode:'hold',chargeDirection:'aim'};
 if(previous?.version===5){const checked=validateControls(previous);if(!checked.ok)throw Error(checked.reason);return {...result,version:5,bindings:{...result.bindings,...Object.fromEntries(Object.keys(MOBILITY_ACTIONS).map(a=>[a,[]]))},poe:{...clone(previous.poe),movementMode:'wasd'},priorControls:clone(previous.priorControls),skillSlots:clone(previous.skillSlots)};}
 return result;
}
const plain=x=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.getPrototypeOf(x)===Object.prototype;
export const validToken=x=>typeof x==='string'&&(/^(Key[A-Z]|Digit[0-9]|Arrow(Up|Down|Left|Right)|Shift(Left|Right)|Space|Tab|Enter|Backspace|Escape|Bracket(Left|Right)|Semicolon|Quote|Comma|Period|Slash|Backquote|Minus|Equal|Numpad[0-9]|Mouse[0-4])$/.test(x));
export function validateControls(c){
 if(!plain(c)||![1,2,3,4,5].includes(c.version)||!['legacy','recommended','custom'].includes(c.preset)||!plain(c.bindings)||!['hold','toggle'].includes(c.blockMode)||!['aim','movement'].includes(c.chargeDirection))return {ok:false,reason:'조작 설정 형식이 올바르지 않습니다.'};
 if(isPoeControls(c)){const p=c.poe;if(!plain(p)||Object.keys(p).length!==6||p.version!==1||!['wasd','click'].includes(p.movementMode)||!['cursor','ground'].includes(p.aimingMode)||typeof p.cursorTrackingAfterRelease!=='boolean'||typeof p.keepSprintingWhileMoving!=='boolean'||typeof p.attackInPlaceStopsMovement!=='boolean'||!c.priorControls||!([1,2,3,...(c.version===5?[4]:[])]).includes(c.priorControls.version)||!validateControls(c.priorControls).ok)return {ok:false,reason:'POE형 입력 설정을 확인하세요.'};}
 else if(c.poe!==undefined||c.priorControls!==undefined)return {ok:false,reason:'이전 입력 형식에 새 설정을 섞을 수 없습니다.'};
 if(c.version===5){const check=validateSkillSlotShape(c.skillSlots);if(!check.ok)return check;}
 else if(c.skillSlots!==undefined)return {ok:false,reason:'전체 기술 배치를 먼저 명시적으로 선택하세요.'};
 const actions=[...actionsForVersion(c.version),...(Object.hasOwn(c.bindings,'townPortal')?['townPortal']:[])];
 if(Object.keys(c.bindings).length!==actions.length||!actions.every(action=>Object.hasOwn(c.bindings,action)))return {ok:false,reason:'조작 설정 형식이 올바르지 않습니다.'};
 const used=new Map();
 for(const action of actions){
  const keys=c.bindings[action],minimum=optionalActions.has(action)||Object.hasOwn(MOBILITY_ACTIONS,action)||action==='townPortal'?0:1;
  if(!Array.isArray(keys)||keys.length<minimum||keys.length>3||!Array.from(keys).every(validToken))return {ok:false,reason:`${allActions[action]}에 ${minimum}~3개의 지원 키를 지정하세요.`};
  for(const key of keys){if(key==='Escape'&&action!=='pause')return {ok:false,reason:'Esc는 안전한 일시정지용으로 예약되어 있습니다.'};if(used.has(key))return {ok:false,reason:`${tokenLabel(key)} 키가 ${allActions[used.get(key)]}와 겹칩니다.`};used.set(key,action);}
 }
 return {ok:true};
}
// Validate the original version first. Old recommended/custom profiles must not
// gain today's defaults: E, T, or any other key may already belong to the user.
export function migrateControls(current){
 const valid=validateControls(current);if(!valid.ok)throw new Error(valid.reason);
 const next=clone(current);
 if(next.version===1){next.version=2;next.bindings.heal=[];next.bindings.judgement=[];}
 if(next.version===2){next.version=3;next.bindings.expert1=[];next.bindings.expert2=[];}
 return next;
}
// Absent controls means a pre-R2d save. Reading never writes or replaces its keys.
// Optional utility extension preserves historical controls and prior snapshots.
// Add a runtime default only when P is unused; never steal a saved user's key.
export function withTownPortalControl(current){const next=clone(current);if(!Object.hasOwn(next.bindings,'townPortal'))next.bindings.townPortal=Object.values(next.bindings).some(keys=>keys.includes('KeyP'))?[]:['KeyP'];return next;}
export function controlsFor(state){return withTownPortalControl(state?.options?.controls===undefined?controlPreset('legacy'):migrateControls(state.options.controls));}
export function rebindControl(current,action,index,token){
 const valid=validateControls(current);if(!valid.ok)return valid;
 if(!Object.hasOwn(allActions,action)||!Number.isInteger(index)||index<0||index>2)return {ok:false,reason:'알 수 없는 조작입니다.'};
 const next=action==='townPortal'?withTownPortalControl(migrateControls(current)):migrateControls(current),keys=next.bindings[action];if(!keys)return {ok:false,reason:'POE형 조작을 먼저 명시적으로 선택하세요.'};
 if(token!==null){const owner=Object.keys(next.bindings).find(a=>next.bindings[a].some((key,i)=>key===token&&(a!==action||i!==index)));if(owner)return {ok:false,reason:`${tokenLabel(token)} 키는 이미 ${allActions[owner]}에 지정되어 있습니다.`};}
 if(token===null){if(index>=keys.length)return {ok:false,reason:'지정된 키가 없습니다.'};if(keys.length===1&&!optionalActions.has(action)&&!Object.hasOwn(MOBILITY_ACTIONS,action)&&action!=='townPortal')return {ok:false,reason:'최소 한 개의 키는 남겨야 합니다.'};keys.splice(index,1);}
 else {if(index>keys.length)return {ok:false,reason:'빈 순서대로 키를 추가하세요.'};keys[index]=token;}
 next.preset='custom';const check=validateControls(next);return check.ok?{ok:true,controls:next}:check;
}
export function tokenLabel(token){if(typeof token!=='string'||!token)return '미지정';const names={Mouse0:'마우스 왼쪽',Mouse1:'마우스 가운데',Mouse2:'마우스 오른쪽',Mouse3:'마우스 뒤로',Mouse4:'마우스 앞으로',Space:'Space',Escape:'Esc',ShiftLeft:'왼쪽 Shift',ShiftRight:'오른쪽 Shift',ArrowUp:'↑',ArrowDown:'↓',ArrowLeft:'←',ArrowRight:'→'};return names[token]??token.replace(/^Key|^Digit/,'');}
export function actionLabel(controls,action){const keys=controls?.bindings?.[action];return Array.isArray(keys)&&keys.length?keys.map(tokenLabel).join(' / '):'미지정';}
const snapshotSkills=['hammer','charge','heal','judgement','expert1','expert2'];
const mobilityPulses=['stop','dodgeSprint','dodgeOnly','sprint'];
const oneShot=new Set([...snapshotSkills,...mobilityPulses,'interact','potion','townPortal','menu','pause']);
const breaksToggle=new Set(['attack',...snapshotSkills,...mobilityPulses]);
// UI owns keyboard input while a form control or button (including its child) has focus.
export function editableTarget(target){return !!target&&(target.isContentEditable===true||['INPUT','SELECT','TEXTAREA','BUTTON'].includes(target.tagName)||!!target.closest?.('button,input,select,textarea,[contenteditable="true"]'));}
export function createInputRouter({captureAttackTap=false,now=()=>performance.now()}={}){
 const held=new Map(),pulses=new Set(),pressTimes=new Map();let toggle=false,lastMove=null;
 const press=(token,action,controls,{repeat=false,editable=false,modified=false,paused=false}={})=>{
  if(editable||modified||repeat||held.has(token)||!Object.hasOwn(allActions,action)||paused&&!['menu','pause'].includes(action))return null;
  held.set(token,action);
  if(captureAttackTap){if(snapshotSkills.includes(action)||mobilityPulses.includes(action)&&action!=='sprint'){for(const old of [...snapshotSkills,...mobilityPulses,'attack']){pulses.delete(old);pressTimes.delete(old);}}pressTimes.set(action,now());}
  if(action==='block'&&controls.blockMode==='toggle')toggle=!toggle;
  if(toggle&&breaksToggle.has(action))toggle=false;
  if(oneShot.has(action)||action==='block'||captureAttackTap&&action==='attack')pulses.add(action);
  return action;
 };
 const down=(token,controls,{repeat=false,editable=false,modified=false,paused=false}={})=>{
  if(editable||modified||repeat||held.has(token))return null;
  // Direct v1 callers have no new skill rows. Never infer defaults for them.
  const actions=[...actionsForVersion(controls.version),...(Object.hasOwn(controls.bindings,'townPortal')?['townPortal']:[])];
  const action=token==='Escape'?'pause':actions.find(a=>Array.isArray(controls.bindings?.[a])&&controls.bindings[a].includes(token));
  return press(token,action,controls,{paused});
 };
 const virtual=(action,pressed,controls,options={})=>{const token='Touch:'+action;if(!pressed){held.delete(token);return;}return press(token,action,controls,options);};
 return {down,up:token=>held.delete(token),virtual,
  releaseMouse(){for(const token of held.keys())if(token.startsWith('Mouse'))held.delete(token);},
  clear({resetMovement=false}={}){held.clear();pulses.clear();pressTimes.clear();toggle=false;if(resetMovement)lastMove=null;},
  expirePending(now,maxAge=150){const expired=[];for(const action of pulses){const time=pressTimes.get(action);if(time!==undefined&&(!Number.isFinite(now)||now<time||now-time>maxAge)){pulses.delete(action);pressTimes.delete(action);expired.push(action);}}return expired;},
  hasPendingCombat:()=>[...pulses].some(a=>['attack','block',...snapshotSkills,...mobilityPulses].includes(a)),
  isHeld:action=>[...held.values()].includes(action),
  consume(action){const value=pulses.has(action);pulses.delete(action);return value;},
  snapshot(controls){const active=a=>[...held.values()].includes(a),move={x:Number(active('right'))-Number(active('left')),y:Number(active('down'))-Number(active('up'))};if(move.x||move.y)lastMove={...move};const result={move,lastMove:lastMove?{...lastMove}:null,attack:active('attack')||(captureAttackTap&&pulses.has('attack')),block:controls.blockMode==='toggle'?toggle:active('block'),guardPressed:pulses.delete('block')};if(captureAttackTap){result.attackPressed=pulses.delete('attack');result.attackHeld=active('attack');result.heldActions=Object.fromEntries(actionsForVersion(controls.version).map(a=>[a,active(a)]));}
   if(isPoeControls(controls)){for(const action of mobilityPulses)result[action]=pulses.delete(action);result.moveOnly=active('moveOnly');result.attackInPlace=active('attackInPlace');result.dodgeSprintHeld=active('dodgeSprint');result.sprintHeld=active('sprint');}
   for(const action of snapshotSkills){result[action]=pulses.has(action);pulses.delete(action);}return result;}
 };
}

// Explicit full preset choice; never reached by read/load migration. Original
// controls are retained as a deep snapshot until the player chooses restoration.
export function poeControlPreset(previous,mode='wasd',runMode='combined'){
 if(!['wasd','click'].includes(mode)||!['combined','separate'].includes(runMode))throw Error('Unknown movement preset');
 const current=migrateControls(previous),prior=isPoeControls(current)?current.priorControls:current,c=controlPreset('recommended');
 c.version=4;c.preset='custom';c.bindings.block=['Mouse1','KeyB'];c.bindings.hammer=['Mouse2'];c.bindings.charge=['KeyQ'];c.bindings.interact=['KeyV'];c.bindings.potion=['Digit1'];c.bindings.heal=['KeyR'];c.bindings.judgement=['KeyE'];c.bindings.expert1=['KeyF'];c.bindings.expert2=['KeyG'];c.bindings.moveOnly=mode==='click'?['Mouse0']:[];if(mode==='click')c.bindings.attack=['KeyJ'];c.bindings.stop=['KeyX'];c.bindings.attackInPlace=runMode==='combined'?['ShiftLeft','ShiftRight']:['KeyH'];c.bindings.dodgeSprint=runMode==='combined'?['Space']:[];c.bindings.dodgeOnly=runMode==='separate'?['Space']:[];c.bindings.sprint=runMode==='separate'?['ShiftLeft','ShiftRight']:[];
 c.poe={version:1,movementMode:mode,aimingMode:mode==='wasd'?'cursor':'ground',cursorTrackingAfterRelease:mode==='wasd',keepSprintingWhileMoving:false,attackInPlaceStopsMovement:true};c.priorControls=clone(prior);if(current.version===5){c.version=5;c.skillSlots=clone(current.skillSlots);}const checked=validateControls(c);if(!checked.ok)throw Error(checked.reason);return c;
}
export function restorePriorControls(current){if(!isPoeControls(current)||!validateControls(current).ok)return null;return clone(current.priorControls);}
export const controlActions=current=>isPoeControls(current)?{...allActions}:{...ACTIONS,...UTILITY_ACTIONS};

// The only v1-v4 -> v5 entry point. Snapshot BEFORE legacy migration so Restore
// returns exactly the chosen predecessor, including a v4 profile's own history.
export function enableSkillLoadout(previous,context={}){
 const checked=validateControls(previous);if(!checked.ok)throw Error(checked.reason);
 if(previous.version===5){const slots=validateSkillSlots(previous.skillSlots,context);if(!slots.ok)throw Error(slots.reason);return clone(previous);}
 const c=migrateControls(previous);c.version=5;c.priorControls=clone(previous);
 for(const action of Object.keys(MOBILITY_ACTIONS))c.bindings[action]??=[];
 c.poe??={version:1,movementMode:'wasd',aimingMode:'cursor',cursorTrackingAfterRelease:true,keepSprintingWhileMoving:false,attackInPlaceStopsMovement:true};
 c.skillSlots=seedSkillSlots(context);const valid=validateControls(c),learned=validateSkillSlots(c.skillSlots,context);if(!valid.ok||!learned.ok)throw Error((!valid.ok?valid:learned).reason);return c;
}
