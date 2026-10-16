/* Stable cool grading. Surface weathering is authored in world-material UVs;
 * Opaque SILT core pixels reserve frame alpha0 for authored amber identity;
 * normal background/opaque pixels keep alpha1 and the original grade.
 * Transparent foreground coverage attenuates that tag without another pass.
 * This pass never adds a screen-space pattern and never flattens live geometry.
 */
'use strict';
(function(root){
 const palette=Object.freeze({
  shadow:Object.freeze([.026,.038,.062]),mid:Object.freeze([.31,.35,.415]),light:Object.freeze([.84,.865,.88]),
  redShadow:Object.freeze([.22,.085,.12]),redMid:Object.freeze([.56,.28,.335]),redLight:Object.freeze([.74,.48,.53])
 });
 const vertexShader='varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position,1.0);}';
 const fragmentShader=`precision highp float;
 varying vec2 vUv;
 uniform sampler2D frame;
 vec3 linearToDisplay(vec3 color){
  return mix(color*12.92,1.055*pow(color,vec3(1./2.4))-.055,step(vec3(.0031308),color));
 }
 void main(){
  vec4 sampledFrame=texture2D(frame,vUv);
  vec3 source=sampledFrame.rgb;
  float value=pow(clamp(dot(source,vec3(.2126,.7152,.0722)),0.,1.),.90);
  float low=smoothstep(0.,.46,value);
  float high=smoothstep(.40,1.,value);
  vec3 cool=mix(vec3(.026,.038,.062),vec3(.31,.35,.415),low);
  cool=mix(cool,vec3(.84,.865,.88),high);
  float redStrength=smoothstep(.018,.080,max(0.,source.r-max(source.g,source.b)));
  vec3 accent=mix(vec3(.22,.085,.12),vec3(.56,.28,.335),low);
  accent=mix(accent,vec3(.74,.48,.53),high);
  vec3 graded=mix(cool,accent,redStrength);
  float coreWeight=1.-clamp(sampledFrame.a,0.,1.);
  if(coreWeight>0.)graded=mix(graded,linearToDisplay(source),coreWeight);
  gl_FragColor=vec4(graded,1.);
 }`;
 const clamp=(x,min,max)=>Math.max(min,Math.min(max,x));
 const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
 const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
 // CPU counterpart permits deterministic numeric checks without claiming GPU QA.
 function toneColor(rgb,frameAlpha=1){
  const source=rgb.map(v=>clamp(Number.isFinite(v)?v:0,0,1));
  const value=Math.pow(source[0]*.2126+source[1]*.7152+source[2]*.0722,.90);
  const low=smooth(0,.46,value),high=smooth(.40,1,value);
  const cool=mix(mix(palette.shadow,palette.mid,low),palette.light,high);
  const accent=mix(mix(palette.redShadow,palette.redMid,low),palette.redLight,high);
  const graded=mix(cool,accent,smooth(.018,.080,Math.max(0,source[0]-Math.max(source[1],source[2]))));
  const coreWeight=1-clamp(Number.isFinite(frameAlpha)?frameAlpha:1,0,1);
  if(coreWeight===0)return graded;
  const display=source.map(v=>v<.0031308?v*12.92:1.055*Math.pow(v,1/2.4)-.055);
  return mix(graded,display,coreWeight);
 }
 function fitViewport(windowWidth,windowHeight,padding=12){
  const w=Math.max(1,Number.isFinite(windowWidth)?windowWidth:1),h=Math.max(1,Number.isFinite(windowHeight)?windowHeight:1);
  const inset=clamp(Number.isFinite(padding)?padding:12,0,Math.max(0,(Math.min(w,h)-1)/2));
  const width=Math.min(w-inset*2,(h-inset*2)*16/9),height=width*9/16;
  return {width,height,left:(w-width)/2,top:(h-height)/2};
 }
 const api=Object.freeze({vertexShader,fragmentShader,palette,toneColor,fitViewport});
 root.DFRenderStyle=api;
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
