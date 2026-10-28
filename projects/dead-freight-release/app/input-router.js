/* Physical inputs map to stable action names. One press produces one request. */
(function(root){
'use strict';
const DEFAULTS=Object.freeze({forward:'KeyW',back:'KeyS',left:'KeyA',right:'KeyD',sprint:'ShiftLeft',jump:'Space',slide:'KeyC',dodge:'KeyX',reload:'KeyR',interact:'KeyE',fireKey:'KeyF',fire:'Mouse0',ads:'Mouse2',primary:'Digit1',secondary:'Digit2',holster:'KeyH',melee:'KeyV',quick0:'Digit3',quick1:'Digit4',quick2:'Digit5',quick3:'Digit6',fireMode:'KeyB',map:'KeyM',laser:'KeyL',inventory:'Tab',pause:'Escape',aimLeft:'ArrowLeft',aimRight:'ArrowRight',aimUp:'ArrowUp',aimDown:'ArrowDown'});
const ALIASES=Object.freeze({ShiftRight:'ShiftLeft',ControlLeft:'KeyC',ControlRight:'KeyC'});
const allowed=code=>typeof code==='string'&&/^(Key[A-Z]|Digit[0-9]|Arrow(Left|Right|Up|Down)|Space|Tab|Escape|Shift(Left|Right)|Control(Left|Right)|Alt(Left|Right)|Mouse[0-2])$/.test(code);
const label=code=>({Space:'Space',ShiftLeft:'Shift',ShiftRight:'오른쪽 Shift',ControlLeft:'Ctrl',ControlRight:'오른쪽 Ctrl',Mouse0:'마우스 왼쪽',Mouse1:'마우스 가운데',Mouse2:'마우스 오른쪽',ArrowLeft:'←',ArrowRight:'→',ArrowUp:'↑',ArrowDown:'↓'}[code]||code.replace(/^Key|^Digit/,''));
function validate(bindings){if(!bindings||typeof bindings!=='object'||Array.isArray(bindings)||Object.keys(bindings).length!==Object.keys(DEFAULTS).length||Object.keys(bindings).some(a=>!Object.hasOwn(DEFAULTS,a)||a!=='pause'&&bindings[a]==='Escape')||Object.values(bindings).some(c=>!allowed(c))||new Set(Object.values(bindings)).size!==Object.keys(DEFAULTS).length)return false;return true;}
function upgradeBindings(bindings){
 if(!bindings||typeof bindings!=='object'||Array.isArray(bindings)||Object.hasOwn(bindings,'melee'))return bindings;
 const candidate={...bindings},used=new Set(Object.values(candidate)),free=['KeyV','KeyQ','KeyZ',...Array.from({length:26},(_,i)=>'Key'+String.fromCharCode(65+i))].find(c=>!used.has(c));candidate.melee=free;return validate(candidate)?candidate:bindings;
}
class InputRouter {
 constructor(bindings=DEFAULTS){if(!validate(bindings))throw Error('Invalid or conflicting input bindings');this.bindings={...bindings};this.heldCodes=new Set();this.requests=[];this.sequence=0;this.lastWheel=-Infinity;}
 actionFor(code){let action=Object.keys(this.bindings).find(a=>this.bindings[a]===code);if(!action&&ALIASES[code]&&this.bindings[Object.keys(DEFAULTS).find(a=>DEFAULTS[a]===ALIASES[code])]===ALIASES[code])action=Object.keys(DEFAULTS).find(a=>DEFAULTS[a]===ALIASES[code]);return action||null;}
 canonical(code){const action=this.actionFor(code);return action?DEFAULTS[action]:null;}
 press(code,timestamp=0,repeat=false){const action=this.actionFor(code);if(!action||repeat)return null;const wasHeld=this.heldCodes.has(code);this.heldCodes.add(code);if(wasHeld)return null;const request={action,code,timestamp:Number.isFinite(timestamp)?timestamp:0,sequence:++this.sequence};this.requests.push(request);return request;}
 release(code){this.heldCodes.delete(code);return this.actionFor(code);}
 held(action){return [...this.heldCodes].some(code=>this.actionFor(code)===action);}
 drain(){return this.requests.splice(0);}
 releaseAction(action){for(const code of [...this.heldCodes])if(this.actionFor(code)===action)this.heldCodes.delete(code);this.requests=this.requests.filter(r=>r.action!==action);}
 releaseAll(){this.heldCodes.clear();this.requests.length=0;}
 bind(action,code){if(!Object.hasOwn(DEFAULTS,action)||!allowed(code))return {ok:false,reason:'unsupported'};if(code==='Escape'&&action!=='pause')return {ok:false,reason:'reserved'};const conflict=Object.keys(this.bindings).find(a=>a!==action&&this.bindings[a]===code);if(conflict)return {ok:false,reason:'conflict',action:conflict};this.releaseAll();this.bindings[action]=code;return {ok:true};}
 reset(){this.releaseAll();this.bindings={...DEFAULTS};}
 wheel(delta,timestamp){if(!Number.isFinite(delta)||!delta||!Number.isFinite(timestamp)||timestamp-this.lastWheel<180)return false;this.lastWheel=timestamp;return true;}
 snapshot(){return {...this.bindings};}
}
const AIM_DEFAULTS=Object.freeze({mode:'continuous',speed:1,step:1});
function normalizeAim(value){const v=value&&typeof value==='object'?value:{};return {mode:v.mode==='step'?'step':'continuous',speed:[.15,.4,1].includes(v.speed)?v.speed:1,step:[.25,1,5].includes(v.step)?v.step:1};}
function aimDelta(preferences,keys,dt,pressed=null){const a=normalizeAim(preferences),step=a.mode==='step';if(step&&!pressed)return {yaw:0,pitch:0};const active=code=>step?pressed===code:!!keys[code],time=Number.isFinite(dt)?Math.max(0,dt):0,h=step?a.step*Math.PI/180:time*1.8*a.speed,v=step?h:time*a.speed;return {yaw:(Number(active('ArrowLeft'))-Number(active('ArrowRight')))*h,pitch:(Number(active('ArrowUp'))-Number(active('ArrowDown')))*v};}
function settings(storage){let known=true,record={},observed=null,message='';try{observed=storage.getItem('deadfreight-settings');if(observed!==null){record=JSON.parse(observed);if(!record||typeof record!=='object'||Array.isArray(record)||record.inputBindings!==undefined&&!validate(upgradeBindings(record.inputBindings)))throw Error('Invalid controls');}}catch(_){known=false;message='조작 설정을 읽지 못했습니다. 기본키로 실행하며 원본 설정을 유지합니다.';}
 const router=new InputRouter(known&&upgradeBindings(record.inputBindings)||DEFAULTS);let aim=normalizeAim(known&&record.keyboardAim),trajectory=!known||record.throwTrajectory!==false;
 function save(){if(!known)return {ok:false,message};let next=null,serialized=null;try{const current=storage.getItem('deadfreight-settings');if(current!==observed)return {ok:false,message:'다른 창의 조작 설정이 변경되었습니다. 새로고침 후 다시 설정하세요.'};next={...record,inputBindings:router.snapshot(),keyboardAim:{...aim},throwTrajectory:trajectory};serialized=JSON.stringify(next);storage.setItem('deadfreight-settings',serialized);}catch(_){try{if(serialized===null||storage.getItem('deadfreight-settings')!==serialized)throw Error('Unconfirmed write');}catch(_){return {ok:false,message:'조작 설정 저장 실패 · 이번 화면에는 적용되었지만 다음 접속에는 유지되지 않을 수 있습니다.'};}}record=next;observed=serialized;return {ok:true,message:'조작 설정을 저장했습니다.'};}
 return {router,known,message,save,trajectory:()=>trajectory,setTrajectory:value=>{trajectory=!!value;},aim:()=>({...aim}),setAim:value=>{aim=normalizeAim(value);},resetAim:()=>{aim={...AIM_DEFAULTS};}};
}
const api={InputRouter,DEFAULTS,validate,upgradeBindings,label,settings,AIM_DEFAULTS,normalizeAim,aimDelta};root.DFInputRouter=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
