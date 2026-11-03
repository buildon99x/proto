// 256px derivatives of Poly Haven's CC0 Sandstone Cracks; see TEXTURE-CREDITS.md.
import {colorRGB,normalRGB,roughnessRGB} from './stone-texture-data.js';
function decodeRGBA(encoded){const raw=atob(encoded),out=new Uint8Array(256*256*4);for(let p=0,q=0;p<raw.length;p+=3,q+=4){out[q]=raw.charCodeAt(p);out[q+1]=raw.charCodeAt(p+1);out[q+2]=raw.charCodeAt(p+2);out[q+3]=255;}return out;}
export function makeStonePixels(size=256){if(size!==256)throw new Error('Stone tile is fixed at 256 pixels for a bounded mobile budget.');return {color:decodeRGBA(colorRGB),roughness:decodeRGBA(roughnessRGB),normal:decodeRGBA(normalRGB)};}
const materials=new WeakMap();
export function authoredStoneMaterial(W){
 if(materials.has(W))return materials.get(W);const T=W.THREE,pixels=makeStonePixels(),maps={};
 for(const key of ['color','roughness','normal']){const tex=W.own(new T.DataTexture(pixels[key],256,256,T.RGBAFormat));tex.flipY=true;tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.magFilter=T.LinearFilter;tex.minFilter=T.LinearMipmapLinearFilter;tex.generateMipmaps=true;tex.colorSpace=key==='color'?T.SRGBColorSpace:T.NoColorSpace;tex.needsUpdate=true;maps[key]=tex;}
 const material=W.own(new T.MeshStandardMaterial({color:'#ffffff',map:maps.color,roughnessMap:maps.roughness,normalMap:maps.normal,roughness:.96}));material.normalScale.set(.3,.3);materials.set(W,material);return material;
}
