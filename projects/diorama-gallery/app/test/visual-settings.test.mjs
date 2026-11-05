import test from 'node:test';
import assert from 'node:assert/strict';
const api = await import('../../.agents/skills/diorama-worlds/kit/visual-settings.js').catch(error=>{if(error.code==='ERR_MODULE_NOT_FOUND')return {};throw error;});
test('Original remains the default and presets are immutable detached settings',()=>{
 assert.equal(typeof api.normalizeVisualSettings,'function');
 const value=api.normalizeVisualSettings();assert.equal(value.enabled,false);assert.equal(value.quality,'auto');
 assert.ok(Object.isFrozen(api.VISUAL_PRESETS));assert.ok(Object.isFrozen(api.VISUAL_PRESETS.soft));
 value.enabled=true;assert.equal(api.VISUAL_PRESETS.original.enabled,false);
 assert.equal(api.VISUAL_PRESETS.soft.toneMapping,'agx');assert.equal(api.VISUAL_PRESETS.vivid.toneMapping,'neutral');
});
test('settings merge atomically, clamp finite values and reject invalid values',()=>{
 const before=api.normalizeVisualSettings(api.VISUAL_PRESETS.soft);
 const value=api.normalizeVisualSettings({exposure:50,warmth:-9,saturation:2,bloomStrength:5},before);
 assert.equal(value.exposure,2);assert.equal(value.warmth,-.2);assert.equal(value.saturation,1.5);assert.equal(value.bloomStrength,.8);assert.equal(value.toneMapping,'agx');assert.equal(before.exposure,1);
 for(const value of [NaN,Infinity,'1',null])assert.throws(()=>api.normalizeVisualSettings({exposure:value}));
 for(const partial of [{quality:'ultra'},{toneMapping:'aces'},{enabled:'false'},{bloomEnabled:1},null,[]])assert.throws(()=>api.normalizeVisualSettings(partial));
 assert.deepEqual(api.normalizeVisualSettings({unknown:'ignored'},before),before);
});
test('mobile auto removes bloom passes and MSAA with a bounded pixel ratio',()=>{
 const caps={hdr:true,samples:[0,2,4]};const s=api.normalizeVisualSettings(api.VISUAL_PRESETS.vivid);
 const mobile=api.resolveVisualProfile(s,390,'miniature',caps);
 assert.equal(mobile.quality,'low');assert.equal(mobile.bloom,false);assert.equal(mobile.samples,0);assert.equal(mobile.pixelRatio,1.25);
 const desktop=api.resolveVisualProfile(s,1200,'miniature',caps);assert.equal(desktop.quality,'balanced');assert.equal(desktop.samples,2);assert.equal(desktop.bloom,true);
 const high=api.resolveVisualProfile({...s,quality:'high'},1200,'miniature',{hdr:true,samples:[0,2]});assert.equal(high.samples,2);assert.equal(high.pixelRatio,2);
});
test('disabled, non-miniature and unsupported HDR never claim active visual effects',()=>{
 const on=api.normalizeVisualSettings(api.VISUAL_PRESETS.soft),caps={hdr:true,samples:[0,4]};
 for(const finish of ['pixel','halftone','blueprint']){const p=api.resolveVisualProfile(on,900,finish,caps);assert.equal(p.enabled,false);assert.equal(p.bloom,false);assert.match(p.reason,/miniature/);}
 const off=api.resolveVisualProfile(api.normalizeVisualSettings(),900,'miniature',caps);assert.equal(off.enabled,false);
 const bad=api.resolveVisualProfile(on,900,'miniature',{hdr:false,samples:[],reason:'float unsupported'});assert.equal(bad.enabled,false);assert.equal(bad.hdr,false);assert.match(bad.reason,/float unsupported/);
 assert.equal(api.resolveVisualProfile({...on,bloomEnabled:false},900,'miniature',caps).bloom,false);
 assert.equal(api.resolveVisualProfile({...on,bloomStrength:0},900,'miniature',caps).bloom,false);
});
