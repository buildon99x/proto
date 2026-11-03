export const MIN_ZOOM=.75,MAX_ZOOM=2.5;
export const clampZoom=value=>Number.isFinite(value)?Math.min(MAX_ZOOM,Math.max(MIN_ZOOM,value)):1;
/** Singapore stage owns gestures; page scrolling remains available outside it. */
export function attachZoom({stage,plus,minus,reset,label,runtime}){
 let zoom=1,disposed=false;const listeners=[],points=new Map();
 const oldTouch=stage.style?.touchAction,oldTab=stage.getAttribute?.('tabindex');
 if(stage.style)stage.style.touchAction='none';stage.setAttribute?.('tabindex','0');stage.setAttribute?.('aria-label','3D 장면. 드래그 회전, Shift 드래그 이동. 방향키 회전, Shift 방향키 이동, Home 기본 보기.');
 const apply=value=>{if(disposed)return;zoom=clampZoom(value);runtime.setZoom(zoom);plus.disabled=zoom>=MAX_ZOOM;minus.disabled=zoom<=MIN_ZOOM;label.textContent=Math.round(zoom*100)+'%';};
 const on=(el,type,fn,options)=>{el.addEventListener(type,fn,options);listeners.push(()=>el.removeEventListener(type,fn,options));};
 const clear=()=>{for(const id of points.keys())try{stage.releasePointerCapture?.(id)}catch{}points.clear();};
 const resetView=()=>{if(disposed)return;clear();runtime.resetView?.();apply(1);};
 const size=()=>{const r=stage.getBoundingClientRect();return{w:Math.max(1,r.width),h:Math.max(1,r.height)};};
 const pair=()=>{const [a,b]=[...points.values()];return{x:(a.x+b.x)/2,y:(a.y+b.y)/2,d:Math.max(1,Math.hypot(a.x-b.x,a.y-b.y))};};
 on(plus,'click',()=>apply(zoom*1.2));on(minus,'click',()=>apply(zoom/1.2));on(reset,'click',resetView);
 on(stage,'wheel',e=>{e.preventDefault();const units=e.deltaMode===1?16:e.deltaMode===2?300:1;apply(zoom*Math.exp(-Math.max(-200,Math.min(200,e.deltaY*units))*.002));},{passive:false});
 on(stage,'contextmenu',e=>e.preventDefault());
 on(stage,'pointerdown',e=>{if(e.pointerType!=='touch'&&![0,2].includes(e.button))return;e.preventDefault();stage.focus?.({preventScroll:true});points.set(e.pointerId,{x:e.clientX,y:e.clientY,pan:e.button===2||e.shiftKey});try{stage.setPointerCapture?.(e.pointerId)}catch{points.delete(e.pointerId)}});
 on(stage,'pointermove',e=>{const prev=points.get(e.pointerId);if(!prev)return;e.preventDefault();const before=points.size===2?pair():null;points.set(e.pointerId,{...prev,x:e.clientX,y:e.clientY});const {w,h}=size();
 if(before){const after=pair();runtime.panView?.((after.x-before.x)/w,(after.y-before.y)/h);apply(zoom*after.d/before.d);}
 else if(points.size===1){const dx=(e.clientX-prev.x)/w,dy=(e.clientY-prev.y)/h;(prev.pan||e.shiftKey?runtime.panView:runtime.orbitView)?.(dx,dy);}
 });
 const end=e=>{points.delete(e.pointerId);try{stage.releasePointerCapture?.(e.pointerId)}catch{}};
 on(stage,'pointerup',end);on(stage,'pointercancel',end);on(stage,'lostpointercapture',e=>points.delete(e.pointerId));on(stage,'blur',clear);if(globalThis.addEventListener)on(globalThis,'blur',clear);
 on(stage,'keydown',e=>{if(e.key==='Home'){e.preventDefault();resetView();return;}const delta={ArrowLeft:[-.04,0],ArrowRight:[.04,0],ArrowUp:[0,-.04],ArrowDown:[0,.04]}[e.key];if(delta){e.preventDefault();(e.shiftKey?runtime.panView:runtime.orbitView)?.(...delta);}});
 apply(1);
 return{reset:resetView,dispose(){if(disposed)return;clear();disposed=true;listeners.forEach(remove=>remove());if(stage.style)stage.style.touchAction=oldTouch??'';if(oldTab==null)stage.removeAttribute?.('tabindex');else stage.setAttribute?.('tabindex',oldTab);}};
}
