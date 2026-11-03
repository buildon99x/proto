// Reuses the established nonperiodic domain-warped miniature water shading.
export function waterMaterial(W,color='#267982'){
 const T=W.THREE;const mat=W.own(new T.MeshStandardMaterial({color,roughness:.19,metalness:.32}));
 mat.onBeforeCompile=shader=>{shader.uniforms.singaporeTime={value:0};mat.userData.shader=shader;
 shader.vertexShader='uniform float singaporeTime; varying vec3 waterPosition;\n'+shader.vertexShader;
 shader.fragmentShader=`uniform float singaporeTime; varying vec3 waterPosition;
float sgHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float sgNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(sgHash(i),sgHash(i+vec2(1.,0.)),f.x),mix(sgHash(i+vec2(0.,1.)),sgHash(i+vec2(1.,1.)),f.x),f.y);}
vec2 sgWarp(vec2 p){return vec2(sgNoise(p*.83+2.7),sgNoise(p*.91+19.3));}
`+shader.fragmentShader;
 shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
float phase=singaporeTime*6.2831853/120.;
vec2 drift=vec2(cos(phase),sin(phase))*.65;
vec2 waterUV=waterPosition.xz;
vec2 warped=waterUV*3.6+sgWarp(waterUV*.8+drift)*1.7+drift;
float broad=sgNoise(warped);
float fine=sgNoise(warped*vec2(4.7,1.8)+vec2(7.1,2.8));
float shoreDepth=sgNoise(waterUV*.32+sgWarp(waterUV*.18)*.8);
float ripple=sgNoise(warped*vec2(8.1,2.3)+drift*.8);
float sparkle=smoothstep(.72,.94,fine)*smoothstep(.46,.8,broad);
diffuseColor.rgb*=.76+.24*broad+.15*shoreDepth;
diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.12,.36,.32),.13*smoothstep(.5,.9,shoreDepth));
diffuseColor.rgb+=vec3(.045,.075,.07)*sparkle+vec3(.012,.025,.021)*smoothstep(.68,.95,ripple);`);
 shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_begin>',`#include <normal_fragment_begin>
vec3 waterSlope=vec3((sgNoise(warped+vec2(.07,0.))-broad)*1.35,0.,(sgNoise(warped+vec2(0.,.07))-broad)*1.35);
normal=normalize(normal+mat3(viewMatrix)*waterSlope);`);
 shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nfloat phase=singaporeTime*6.2831853/120.;\nwaterPosition=position;\ntransformed.y += .015*sin(position.x*6.1+sin(position.z*2.4)+phase*20.) + .009*cos(position.z*10.3+position.x*3.4-phase*30.);');};
 return mat;
}
