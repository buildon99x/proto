// Local optional visual profile. Legacy definitions remain on the original path.
const original = {enabled:false, quality:'auto', toneMapping:'neutral', exposure:1,
  bloomEnabled:true, bloomStrength:.18, bloomRadius:.3, bloomThreshold:1.15,
  saturation:1.06, contrast:1.04, warmth:.03};
export const VISUAL_PRESETS = Object.freeze({
  original:Object.freeze(original),
  soft:Object.freeze({...original,enabled:true,toneMapping:'agx',bloomStrength:.22,bloomRadius:.45,bloomThreshold:1.2,saturation:1.04,contrast:1.02,warmth:.02}),
  vivid:Object.freeze({...original,enabled:true,bloomStrength:.16,saturation:1.1,contrast:1.06,warmth:.025})
});
const ranges = {exposure:[.25,2],bloomStrength:[0,.8],bloomRadius:[0,1],bloomThreshold:[.5,3],saturation:[0,1.5],contrast:[.5,1.5],warmth:[-.2,.2]};
export function normalizeVisualSettings(partial = {}, previous = VISUAL_PRESETS.original) {
  if(!partial || typeof partial!=='object' || Array.isArray(partial))throw new Error('Visual settings must be an object.');
  const result={...previous};
  for(const key of Object.keys(original)) {
    if(!Object.hasOwn(partial,key))continue;
    const value=partial[key];
    if(ranges[key]){if(!Number.isFinite(value))throw new Error(`${key} must be finite.`);const [min,max]=ranges[key];result[key]=Math.max(min,Math.min(max,value));}
    else if(key==='enabled'||key==='bloomEnabled'){if(typeof value!=='boolean')throw new Error(`${key} must be boolean.`);result[key]=value;}
    else {const options=key==='quality'?['auto','low','balanced','high']:['neutral','agx'];if(!options.includes(value))throw new Error(`Unknown visual ${key}.`);result[key]=value;}
  }
  return result;
}
export function resolveVisualProfile(settings, width, finish, capabilities = {hdr:false,samples:[]}) {
  const quality=settings.quality==='auto'?(width<600?'low':'balanced'):settings.quality;
  const budget={low:{samples:0,pixelRatio:1.25},balanced:{samples:2,pixelRatio:1.5},high:{samples:4,pixelRatio:2}}[quality];
  const enabled=settings.enabled && finish==='miniature' && !!capabilities.hdr;
  const reason=!settings.enabled?'original':finish!=='miniature'?'miniature-only':!capabilities.hdr?(capabilities.reason||'HDR unavailable'):null;
  return {enabled,quality,hdr:enabled,bloom:enabled&&quality!=='low'&&settings.bloomEnabled&&settings.bloomStrength>0,
    samples:enabled?Math.max(0,...(capabilities.samples??[]).filter(n=>n<=budget.samples)):0,pixelRatio:budget.pixelRatio,reason};
}
