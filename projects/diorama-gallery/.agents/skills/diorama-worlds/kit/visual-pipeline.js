import * as THREE from 'three';

const vertexShader = 'varying vec2 uv0; void main(){uv0=uv;gl_Position=vec4(position.xy,0.,1.);}';
const extractShader = `
uniform sampler2D image; uniform vec2 texel; uniform float threshold; varying vec2 uv0;
vec3 highlight(vec2 uv){
  vec3 color=max(texture2D(image,uv).rgb,vec3(0.));
  float brightness=dot(color,vec3(.2126,.7152,.0722));
  float knee=max(.01,threshold*.2);
  float soft=clamp(brightness-threshold+knee,0.,2.*knee);
  soft=soft*soft/(4.*knee);
  return color*(max(brightness-threshold,soft)/max(brightness,.0001));
}
void main(){
  vec2 offset=texel*.5;
  gl_FragColor=vec4((highlight(uv0+offset)+highlight(uv0-offset)+highlight(uv0+vec2(offset.x,-offset.y))+highlight(uv0+vec2(-offset.x,offset.y)))*.25,1.);
}`;
const blurShader = `
uniform sampler2D image; uniform vec2 direction; varying vec2 uv0;
void main(){
 vec3 color=texture2D(image,uv0).rgb*.227027;
 color+=(texture2D(image,uv0+direction*1.384615).rgb+texture2D(image,uv0-direction*1.384615).rgb)*.316216;
 color+=(texture2D(image,uv0+direction*3.230769).rgb+texture2D(image,uv0-direction*3.230769).rgb)*.070270;
 gl_FragColor=vec4(color,1.);
}`;
// Reuse Three's pinned tone curves, with a private exposure uniform. No automatic
// toneMapping/colorspace chunks execute here, or in the linear scene buffers.
const toneCurves = THREE.ShaderChunk.tonemapping_pars_fragment.replaceAll('toneMappingExposure','visualExposure');
const outputShader = `
uniform sampler2D image; uniform sampler2D bloomImage; uniform bool useBloom;
uniform float bloomStrength; uniform int toneCurve; uniform float saturation; uniform float contrast; uniform float warmth;
varying vec2 uv0;
${toneCurves}
vec3 encodeSRGB(vec3 x){return mix(12.92*x,1.055*pow(max(x,vec3(0.)),vec3(1./2.4))-.055,step(vec3(.0031308),x));}
vec3 gradeDisplay(vec3 color){
 float gray=dot(color,vec3(.2126,.7152,.0722));
 color=mix(vec3(gray),color,saturation);
 color=(color-.5)*contrast+.5;
 // Preserve neutral black/white endpoints; tint only the midtones.
 color+=vec3(warmth,0.,-warmth)*color*(1.-color)*4.;
 return clamp(color,0.,1.);
}
void main(){
 vec3 color=max(texture2D(image,uv0).rgb,vec3(0.));
 if(useBloom)color+=texture2D(bloomImage,uv0).rgb*bloomStrength;
 color=toneCurve==1?AgXToneMapping(color):NeutralToneMapping(color);
 color=encodeSRGB(color);
 color=gradeDisplay(color);
 gl_FragColor=vec4(color,1.);
}`;
function target(width,height,samples=0,depthBuffer=true){
  const result=new THREE.WebGLRenderTarget(width,height,{type:THREE.HalfFloatType,
    format:THREE.RGBAFormat,minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,
    depthBuffer,stencilBuffer:false,samples});
  result.texture.colorSpace=THREE.LinearSRGBColorSpace;result.texture.generateMipmaps=false;
  return result;
}
function material(fragmentShader,uniforms){return new THREE.ShaderMaterial({vertexShader,fragmentShader,uniforms,depthTest:false,depthWrite:false,toneMapped:false});}

/** Owns only postprocess resources; scene geometry, lights, materials and clock stay untouched. */
export function createVisualPipeline(renderer) {
  let caps=null,disposed=false,key='',sceneTarget=null,bloomA=null,bloomB=null;
  let post=null,camera=null,quad=null,geometry=null,extract=null,blur=null,output=null;
  let effective={enabled:false,hdr:false,bloom:false,reason:'original'},settings=null;
  function complete(buffer){
    const previous=renderer.getRenderTarget(),samples=buffer.samples;
    try {
      const gl=renderer.getContext();renderer.setRenderTarget(buffer);
      if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)return false;
      // Also validate the resolve texture's FBO, not only the multisample draw FBO.
      if(samples){buffer.samples=0;renderer.setRenderTarget(buffer);if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)return false;}
      return true;
    } catch {return false;}
    finally {buffer.samples=samples;renderer.setRenderTarget(previous);}
  }
  function capabilities(){
    if(caps)return {...caps,samples:[...caps.samples]};
    caps={hdr:false,samples:[],reason:'HDR float color buffer unavailable'};
    if(!renderer.getContext||!renderer.extensions?.has('EXT_color_buffer_float'))return {...caps,samples:[]};
    try {
      const gl=renderer.getContext();
      const color=Array.from(gl.getInternalformatParameter(gl.RENDERBUFFER,gl.RGBA16F,gl.SAMPLES)||[]);
      const depth=Array.from(gl.getInternalformatParameter(gl.RENDERBUFFER,gl.DEPTH_COMPONENT24,gl.SAMPLES)||[]);
      const candidates=[4,2].filter(n=>n<=(renderer.capabilities?.maxSamples??0)&&color.includes(n)&&depth.includes(n));
      for(const samples of [...candidates,0]){const probe=target(4,4,samples);try{if(complete(probe))caps.samples.push(samples);}finally{probe.dispose();}}
      caps.hdr=caps.samples.includes(0);caps.reason=caps.hdr?null:'HDR framebuffer unavailable';
      if(!caps.hdr)caps.samples=[];
    } catch {caps={hdr:false,samples:[],reason:'HDR capability check unavailable'};}
    return {...caps,samples:[...caps.samples]};
  }
  function releaseBuffers(){sceneTarget?.dispose();bloomA?.dispose();bloomB?.dispose();sceneTarget=bloomA=bloomB=null;key='';}
  function setupMaterials(){
    if(post)return;
    post=new THREE.Scene();camera=new THREE.Camera();geometry=new THREE.PlaneGeometry(2,2);
    extract=material(extractShader,{image:{value:null},texel:{value:new THREE.Vector2()},threshold:{value:1.15}});
    blur=material(blurShader,{image:{value:null},direction:{value:new THREE.Vector2()}});
    output=material(outputShader,{image:{value:null},bloomImage:{value:null},useBloom:{value:false},bloomStrength:{value:0},toneCurve:{value:0},visualExposure:{value:1},saturation:{value:1},contrast:{value:1},warmth:{value:0}});
    quad=new THREE.Mesh(geometry,output);quad.frustumCulled=false;post.add(quad);
  }
  function configure(nextSettings,nextEffective,width,height){
    if(disposed)return {...effective};
    settings={...nextSettings};effective={...nextEffective};
    if(!effective.enabled){releaseBuffers();return {...effective};}
    const nextKey=`${width}:${height}:${effective.samples}:${effective.bloom}`;
    if(nextKey!==key){
      releaseBuffers();
      const supported=capabilities().samples.filter(n=>n<=effective.samples);
      for(const samples of supported){
        const candidate=target(width,height,samples);
        if(complete(candidate)){sceneTarget=candidate;effective.samples=samples;break;}
        candidate.dispose();
      }
      if(!sceneTarget){effective={...effective,enabled:false,hdr:false,bloom:false,samples:0,reason:'HDR framebuffer unavailable at this size'};return {...effective};}
      if(effective.bloom){
        bloomA=target(Math.max(1,Math.ceil(width/2)),Math.max(1,Math.ceil(height/2)),0,false);
        bloomB=target(bloomA.width,bloomA.height,0,false);
        if(!complete(bloomA)||!complete(bloomB)){
          bloomA.dispose();bloomB.dispose();bloomA=bloomB=null;effective.bloom=false;effective.reason='Bloom framebuffer unavailable';
        }
      }
      key=nextKey;
    } else {
      // A prior allocation may have downgraded requested MSAA/bloom at this size.
      effective.samples=sceneTarget.samples;effective.bloom=!!bloomA;
      if(nextEffective.bloom&&!bloomA)effective.reason='Bloom framebuffer unavailable';
    }
    setupMaterials();
    const u=output.uniforms;u.image.value=sceneTarget.texture;u.bloomImage.value=bloomA?.texture??sceneTarget.texture;u.useBloom.value=effective.bloom;
    u.bloomStrength.value=settings.bloomStrength;u.toneCurve.value=settings.toneMapping==='agx'?1:0;u.visualExposure.value=settings.exposure;
    u.saturation.value=settings.saturation;u.contrast.value=settings.contrast;u.warmth.value=settings.warmth;
    extract.uniforms.image.value=sceneTarget.texture;extract.uniforms.texel.value.set(1/width,1/height);extract.uniforms.threshold.value=settings.bloomThreshold;
    return {...effective};
  }
  function render(scene,sceneCamera){
    if(disposed||!effective.enabled||!sceneTarget)return false;
    renderer.setRenderTarget(sceneTarget);renderer.render(scene,sceneCamera);
    if(effective.bloom){
      quad.material=extract;renderer.setRenderTarget(bloomA);renderer.render(post,camera);
      quad.material=blur;blur.uniforms.image.value=bloomA.texture;blur.uniforms.direction.value.set((1+settings.bloomRadius*4)/bloomA.width,0);
      renderer.setRenderTarget(bloomB);renderer.render(post,camera);
      blur.uniforms.image.value=bloomB.texture;blur.uniforms.direction.value.set(0,(1+settings.bloomRadius*4)/bloomA.height);
      renderer.setRenderTarget(bloomA);renderer.render(post,camera);
    }
    quad.material=output;renderer.setRenderTarget(null);renderer.render(post,camera);return true;
  }
  return {capabilities,configure,render,
    resetCapabilities(){releaseBuffers();caps=null;},
    dispose(){if(disposed)return;disposed=true;releaseBuffers();geometry?.dispose();extract?.dispose();blur?.dispose();output?.dispose();}
  };
}
