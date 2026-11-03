// Adapted from open-3d-skills' reduced-motion and measurement guidance.
// Never changes authoritative motion, camera input, room state, or quality settings.
export function motionPreference(host=globalThis){try{return host.matchMedia?.('(prefers-reduced-motion: reduce)')??null;}catch{return null;}}
export function cosmeticTime(time,query){return query?.matches===true?0:time;}
export function publishRenderReceipt(canvas,info){if(!canvas?.dataset)return;const values={drawCalls:info?.render?.calls,triangles:info?.render?.triangles,programs:Array.isArray(info?.programs)?info.programs.length:undefined};for(const[key,value]of Object.entries(values)){if(Number.isSafeInteger(value)&&value>=0){const text=String(value);if(canvas.dataset[key]!==text)canvas.dataset[key]=text;}else delete canvas.dataset[key];}if(canvas.dataset.renderReady!=='true')canvas.dataset.renderReady='true';}

// Time between successful renderer.render calls, not GPU completion time.
// The first60 intervals describe warmup; the rolling240 exclude that warmup.
export function createRenderIntervals(){
 let previous=null,frames=0,initial=[],warm=[],cursor=0;
 const reset=()=>{previous=null;frames=0;initial=[];warm=[];cursor=0;};
 const percentile=(values,p)=>{if(!values.length)return null;const sorted=[...values].sort((a,b)=>a-b);return sorted[Math.min(sorted.length-1,Math.floor(sorted.length*p))];};
 return{reset,record(time,success=true){
  if(!success||!Number.isFinite(time)){reset();return false;}
  if(previous!==null&&time<=previous)reset();
  const delta=previous===null?null:(time-previous)*1000;previous=time;frames++;
  if(delta!==null){if(initial.length<60)initial.push(delta);else{warm[cursor]=delta;cursor=(cursor+1)%240;}}
  return frames===1||frames%30===0;
 },read(){return{frames,initialSamples:initial.length,warmSamples:warm.length,initialP50Ms:percentile(initial,.5),initialP95Ms:percentile(initial,.95),warmP50Ms:percentile(warm,.5),warmP95Ms:percentile(warm,.95)};}};
}
const INTERVAL_KEYS=['renderedFrames','initialFrameSamples','warmFrameSamples','initialFrameP95Ms','warmFrameP50Ms','warmFrameP95Ms'];
export function clearRenderIntervals(canvas){for(const key of INTERVAL_KEYS)if(canvas?.dataset)delete canvas.dataset[key];}
export function publishRenderIntervals(canvas,sample){if(!canvas?.dataset)return;const values={renderedFrames:sample.frames,initialFrameSamples:sample.initialSamples,warmFrameSamples:sample.warmSamples,initialFrameP95Ms:sample.initialP95Ms,warmFrameP50Ms:sample.warmP50Ms,warmFrameP95Ms:sample.warmP95Ms};for(const[key,value]of Object.entries(values)){if(Number.isFinite(value)&&value>=0){const text=String(Math.round(value*100)/100);if(canvas.dataset[key]!==text)canvas.dataset[key]=text;}else delete canvas.dataset[key];}}
export function renderIntervalText(canvas){const d=canvas?.dataset;if(d?.renderReady!=='true'||!d.renderedFrames)return'성공한 렌더 프레임을 기다리고 있어요.';const initial=`초기 ${d.initialFrameSamples||0}/60 간격 · p95 ${d.initialFrameP95Ms??'—'}ms`;const warm=Number(d.warmFrameSamples)>0?`최근 ${d.warmFrameSamples}/240 간격 · p50 ${d.warmFrameP50Ms}ms / p95 ${d.warmFrameP95Ms}ms`:'초기 구간 수집 중';return`${initial}\n${warm}\n성공 렌더 호출 사이의 시간입니다. GPU 완료 시간은 아닙니다.`;}
