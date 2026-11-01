// Adapted from open-3d-skills' reduced-motion and measurement guidance.
// Never changes authoritative motion, camera input, room state, or quality settings.
export function motionPreference(host=globalThis){try{return host.matchMedia?.('(prefers-reduced-motion: reduce)')??null;}catch{return null;}}
export function cosmeticTime(time,query){return query?.matches===true?0:time;}
export function publishRenderReceipt(canvas,info){if(!canvas?.dataset)return;const values={drawCalls:info?.render?.calls,triangles:info?.render?.triangles,programs:Array.isArray(info?.programs)?info.programs.length:undefined};for(const[key,value]of Object.entries(values)){if(Number.isSafeInteger(value)&&value>=0){const text=String(value);if(canvas.dataset[key]!==text)canvas.dataset[key]=text;}else delete canvas.dataset[key];}if(canvas.dataset.renderReady!=='true')canvas.dataset.renderReady='true';}
