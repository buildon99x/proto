import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../../.agents/skills/diorama-worlds/node_modules/three/build/three.module.js';
import {VISUAL_PRESETS,resolveVisualProfile} from '../../.agents/skills/diorama-worlds/kit/visual-settings.js';
const api=await import('../../.agents/skills/diorama-worlds/kit/visual-pipeline.js').catch(error=>{if(error.code==='ERR_MODULE_NOT_FOUND')return {};throw error;});
function renderer({extension=true,failSamples=[],failLarge=false,failLargeSamples=[],failBloom=false}={}) {
 const resources=new Map(),calls=[];let active=null;
 const gl={FRAMEBUFFER:1,FRAMEBUFFER_COMPLETE:2,RENDERBUFFER:3,RGBA16F:4,DEPTH_COMPONENT24:5,SAMPLES:6,
  getInternalformatParameter:()=>new Int32Array([4,2]),checkFramebufferStatus:()=>failSamples.includes(active.samples)||(failLarge&&active.width>4)||(active.width>4&&failLargeSamples.includes(active.samples))||(failBloom&&!active.depthBuffer)?0:2};
 return {resources,calls,capabilities:{maxSamples:4},extensions:{has:()=>extension},getContext:()=>gl,getRenderTarget:()=>active,
  setRenderTarget(t){active=t;if(t&&!resources.has(t)){resources.set(t,{disposed:0});t.addEventListener('dispose',()=>resources.get(t).disposed++);}},
  render(scene,camera){calls.push({scene,camera,target:active,material:scene.children?.[0]?.material});}};
}
test('float capability probes framebuffer completeness, lowers MSAA and restores target',()=>{
 assert.equal(typeof api.createVisualPipeline,'function');
 const gpu=renderer({failSamples:[4]}),previous=new THREE.WebGLRenderTarget();gpu.setRenderTarget(previous);
 const pipe=api.createVisualPipeline(gpu),caps=pipe.capabilities();assert.equal(caps.hdr,true);assert.deepEqual(caps.samples,[2,0]);assert.equal(gpu.getRenderTarget(),previous);
 for(const [target,value] of gpu.resources)if(target!==previous)assert.equal(value.disposed,1,'capability probe must release target');pipe.dispose();previous.dispose();
});
test('unsupported/incomplete HDR falls back without rendering a false HDR image',()=>{
 for(const options of [{extension:false},{failSamples:[0,2,4]}]){const gpu=renderer(options),pipe=api.createVisualPipeline(gpu),caps=pipe.capabilities();assert.equal(caps.hdr,false);assert.equal(pipe.render(new THREE.Scene(),new THREE.Camera()),false);pipe.dispose();}
 const gpu=renderer({failLarge:true}),pipe=api.createVisualPipeline(gpu),caps=pipe.capabilities();assert.equal(caps.hdr,true);
 const effective=pipe.configure(VISUAL_PRESETS.soft,resolveVisualProfile(VISUAL_PRESETS.soft,900,'miniature',caps),800,600);assert.equal(effective.enabled,false);assert.match(effective.reason,/framebuffer/i);assert.equal(pipe.render(new THREE.Scene(),new THREE.Camera()),false);pipe.dispose();
});
test('HDR pipeline uses linear HalfFloat, extracts before tone map and has exactly one final encoding',()=>{
 const gpu=renderer(),pipe=api.createVisualPipeline(gpu),settings=VISUAL_PRESETS.vivid;
 pipe.configure(settings,resolveVisualProfile(settings,900,'miniature',pipe.capabilities()),800,600);
 const scene=new THREE.Scene(),camera=new THREE.Camera();assert.equal(pipe.render(scene,camera),true);
 assert.equal(gpu.calls.length,5);assert.equal(gpu.calls[0].scene,scene);assert.equal(gpu.calls[0].target.texture.type,THREE.HalfFloatType);assert.equal(gpu.calls[0].target.texture.colorSpace,THREE.LinearSRGBColorSpace);
 assert.equal(gpu.calls[1].target.width,400);assert.equal(gpu.calls[1].target.height,300);assert.match(gpu.calls[1].material.fragmentShader,/threshold/);
 assert.equal(gpu.calls.at(-1).target,null);const output=gpu.calls.at(-1).material;assert.equal(output.toneMapped,false);assert.equal(output.uniforms.visualExposure.value,1);
 const main=output.fragmentShader.slice(output.fragmentShader.indexOf('void main()'));
 assert.match(main,/AgXToneMapping/);assert.match(main,/NeutralToneMapping/);assert.equal((main.match(/encodeSRGB\(/g)||[]).length,1);assert.doesNotMatch(main,/linearToOutputTexel|colorspace_fragment/);
 assert.ok(main.indexOf('NeutralToneMapping')<main.indexOf('encodeSRGB'));assert.ok(main.indexOf('encodeSRGB')<main.indexOf('gradeDisplay'));
 pipe.dispose();assert.ok([...gpu.resources.values()].every(v=>v.disposed===1));
});
test('disabling bloom removes its passes and buffers; resize/sample changes dispose old allocations',()=>{
 const gpu=renderer(),pipe=api.createVisualPipeline(gpu),s=VISUAL_PRESETS.soft,caps=pipe.capabilities();
 pipe.configure(s,resolveVisualProfile(s,900,'miniature',caps),800,600);pipe.render(new THREE.Scene(),new THREE.Camera());
 const previous=gpu.calls[0].target,bloom=gpu.calls[1].target;gpu.calls.length=0;
 const low={...s,quality:'low'};pipe.configure(low,resolveVisualProfile(low,390,'miniature',caps),488,1055);pipe.render(new THREE.Scene(),new THREE.Camera());
 assert.equal(gpu.calls.length,2);assert.equal(gpu.calls[0].target.samples,0);assert.equal(gpu.resources.get(previous).disposed,1);assert.equal(gpu.resources.get(bloom).disposed,1);
 pipe.configure({...s,enabled:false},resolveVisualProfile({...s,enabled:false},900,'miniature',caps),800,600);assert.equal(pipe.render(new THREE.Scene(),new THREE.Camera()),false);
 pipe.dispose();pipe.dispose();assert.ok([...gpu.resources.values()].every(v=>v.disposed===1));
});

test('large-buffer MSAA downgrades and bloom-only failures preserve working HDR',()=>{
 const settings={...VISUAL_PRESETS.vivid,quality:'high'};
 const gpu=renderer({failLargeSamples:[4,2]}),pipe=api.createVisualPipeline(gpu);
 const effective=pipe.configure(settings,resolveVisualProfile(settings,900,'miniature',pipe.capabilities()),800,600);
 assert.equal(effective.enabled,true);assert.equal(effective.samples,0);pipe.dispose();
 const second=renderer({failBloom:true}),fallback=api.createVisualPipeline(second);
 const actual=fallback.configure(settings,resolveVisualProfile(settings,900,'miniature',fallback.capabilities()),800,600);
 assert.equal(actual.hdr,true);assert.equal(actual.bloom,false);assert.match(actual.reason,/Bloom/);
 fallback.render(new THREE.Scene(),new THREE.Camera());assert.equal(second.calls.length,2);
 second.extensions.has=()=>false;fallback.resetCapabilities();assert.equal(fallback.capabilities().hdr,false);fallback.dispose();
 assert.ok([...second.resources.values()].every(v=>v.disposed===1));
});
