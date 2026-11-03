export const MIN_ZOOM=.75,MAX_ZOOM=2.5;
export const clampZoom=value=>Number.isFinite(value)?Math.min(MAX_ZOOM,Math.max(MIN_ZOOM,value)):1;
/** Stage-scoped interaction. One finger remains ordinary page scrolling. */
export function attachZoom({stage,plus,minus,reset,label,runtime}){
 let zoom=1,pinch=null,disposed=false;const listeners=[];
 const apply=value=>{if(disposed)return;zoom=clampZoom(value);runtime.setZoom(zoom);plus.disabled=zoom>=MAX_ZOOM;minus.disabled=zoom<=MIN_ZOOM;label.textContent=Math.round(zoom*100)+'%';};
 const on=(el,type,fn,options)=>{el.addEventListener(type,fn,options);listeners.push(()=>el.removeEventListener(type,fn,options));};
 const distance=e=>Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);
 on(plus,'click',()=>apply(zoom*1.2));on(minus,'click',()=>apply(zoom/1.2));on(reset,'click',()=>{pinch=null;apply(1)});
 on(stage,'wheel',e=>{e.preventDefault();const units=e.deltaMode===1?16:e.deltaMode===2?300:1;apply(zoom*Math.exp(-Math.max(-200,Math.min(200,e.deltaY*units))*.002));},{passive:false});
 on(stage,'touchstart',e=>{if(e.touches.length===2){e.preventDefault();pinch={distance:Math.max(1,distance(e)),zoom};}else pinch=null;},{passive:false});
 on(stage,'touchmove',e=>{if(pinch&&e.touches.length===2){e.preventDefault();apply(pinch.zoom*distance(e)/pinch.distance);}},{passive:false});
 on(stage,'touchend',()=>{pinch=null;});on(stage,'touchcancel',()=>{pinch=null;});
 apply(1);
 return{reset:()=>{pinch=null;apply(1)},dispose(){if(disposed)return;disposed=true;pinch=null;listeners.forEach(remove=>remove());}};
}
