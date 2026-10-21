/* Browser-local touch input. Each contact owns its input until up/cancel. */
(function(root){'use strict';
function capable(w=root){return !!(w.navigator?.maxTouchPoints>0||w.matchMedia?.('(pointer: coarse)').matches);}
function create(o){
 const w=o.window||root,d=w.document,enabled=capable(w);if(!enabled)return {enabled:false,sync(){},releaseAll(){}};
 const layer=d.createElement('div');layer.id='touch-controls';layer.hidden=true;layer.setAttribute('aria-label','모바일 조작');
 const actions=[['primary','1','주무기'],['secondary','2','보조무기'],['interact','회수','상호작용'],['jump','점프','점프'],['quick0','치료','치료 물품'],['quick1','투척','수류탄 선택'],['melee','근접','근접 공격'],['fire','발사','길게 눌러 발사·놓으면 수류탄 투척'],['sprint','달리기','누르는 동안 달리기'],['reload','장전','재장전'],['ads','조준','누르는 동안 정밀 조준'],['holster','넣기','총기 넣기·꺼내기'],['quick2','탐지','탐지 물품'],['quick3','물품4','네 번째 빠른 물품']];
 layer.innerHTML='<div class="touch-look" aria-label="드래그하여 시점 회전"></div><div class="touch-stick" role="group" aria-label="이동 조이스틱"><span></span></div><div class="touch-top">'+[['map','지도'],['inventory','가방'],['pause','중지']].map(([a,l])=>'<button type="button" data-touch="'+a+'" aria-label="'+l+'">'+l+'</button>').join('')+'</div><div class="touch-actions">'+actions.map(([a,l,title])=>'<button type="button" data-touch="'+a+'" aria-label="'+title+'">'+l+'</button>').join('')+'</div>';
 const rotate=d.createElement('div');rotate.id='touch-rotate';rotate.hidden=true;rotate.setAttribute('role','status');rotate.innerHTML='<span>↻</span><strong>가로 화면으로 회전해 주세요</strong><p>왼쪽 이동 · 오른쪽 드래그로 조준</p>';
 d.body.append(layer,rotate);d.documentElement.classList.add('touch-device');
 const stick=layer.querySelector('.touch-stick'),thumb=stick.querySelector('span'),look=layer.querySelector('.touch-look'),contacts=new Map(),held=new Map();let stickId=null,lookId=null,playing=false,portrait=false,mode=!!(w.matchMedia?.('(pointer: coarse)').matches);
 function input(action,id,down){let ids=held.get(action);if(down){if(!ids){ids=new Set();held.set(action,ids);}const first=ids.size===0;ids.add(id);if(first){o.onInput(action,true);layer.querySelector('[data-touch="'+action+'"]')?.classList.add('held');}}else if(ids?.delete(id)&&!ids.size){held.delete(action);o.onInput(action,false);layer.querySelector('[data-touch="'+action+'"]')?.classList.remove('held');}}
 function release(id){const c=contacts.get(id);if(!c)return;contacts.delete(id);if(c.action)input(c.action,id,false);if(stickId===id){stickId=null;thumb.style.transform='translate(0px,0px)';o.onMove(0,0);}if(lookId===id)lookId=null;}
 function releaseAll(){for(const id of [...contacts.keys()])release(id);o.onMove(0,0);}
 function moveStick(e){const b=stick.getBoundingClientRect(),radius=b.width*.34,dx=e.clientX-b.left-b.width/2,dy=e.clientY-b.top-b.height/2,len=Math.hypot(dx,dy),scale=len>radius?radius/len:1,x=dx*scale,y=dy*scale;thumb.style.transform='translate('+x+'px,'+y+'px)';const magnitude=Math.min(1,len/radius);o.onMove(magnitude<.16?0:x/radius,magnitude<.16?0:-y/radius);}
 layer.addEventListener('pointerdown',e=>{if(e.pointerType!=='touch'||!playing||portrait)return;const button=e.target.closest?.('[data-touch]'),kind=button?'button':e.target.closest?.('.touch-stick')?'stick':e.target===look?'look':null;if(!kind||kind==='stick'&&stickId!==null||kind==='look'&&lookId!==null)return;e.preventDefault();e.stopPropagation();contacts.set(e.pointerId,{kind,action:button?.dataset.touch,x:e.clientX,y:e.clientY});try{layer.setPointerCapture(e.pointerId);}catch(_){}if(kind==='button')input(button.dataset.touch,e.pointerId,true);else if(kind==='stick'){stickId=e.pointerId;moveStick(e);}else lookId=e.pointerId;},{passive:false});
 layer.addEventListener('pointermove',e=>{const c=contacts.get(e.pointerId);if(!c)return;e.preventDefault();e.stopPropagation();if(c.kind==='stick')moveStick(e);if(c.kind==='look'){o.onLook(e.clientX-c.x,e.clientY-c.y);c.x=e.clientX;c.y=e.clientY;}},{passive:false});
 function cancelAll(){o.onCancel?.();releaseAll();}
 w.addEventListener('pointerup',e=>release(e.pointerId));for(const name of ['pointercancel','lostpointercapture'])w.addEventListener(name,e=>{if(contacts.has(e.pointerId))cancelAll();});
 layer.addEventListener('contextmenu',e=>e.preventDefault());
 function suspend(){cancelAll();o.onSuspend?.();}
 w.addEventListener('blur',suspend);d.addEventListener('visibilitychange',()=>{if(d.hidden)suspend();});
 function sync(active){const was=playing,oldPortrait=portrait;playing=!!active;portrait=w.innerHeight>w.innerWidth;rotate.hidden=!(portrait&&mode);layer.hidden=!playing||portrait||!mode;d.documentElement.classList.toggle('touch-device',mode);d.documentElement.classList.toggle('touch-playing',playing&&!portrait&&mode);if(was&&!playing||!oldPortrait&&portrait){cancelAll();if(portrait&&mode)o.onSuspend?.();}}
 d.addEventListener('pointerdown',e=>{if(e.pointerType!=='touch'&&e.pointerType!=='mouse')return;const next=e.pointerType==='touch';if(next===mode)return;mode=next;cancelAll();sync(playing);o.onModeChange?.();},true);
 w.addEventListener('resize',()=>sync(playing));sync(false);
 return {enabled:true,usingTouch:()=>mode,sync,releaseAll};
}
const api={capable,create};root.DFTouch=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
