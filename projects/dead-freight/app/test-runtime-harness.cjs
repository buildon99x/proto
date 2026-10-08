/* Shared rendererless fixture; DOM, WebGL and audio remain mocks. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),Three=require('./vendor/three.min.js');
const root=__dirname;
function eventTarget(){
 const listeners=new Map();
 return {
  addEventListener(type,fn){if(!listeners.has(type))listeners.set(type,[]);listeners.get(type).push(fn);},
  removeEventListener(type,fn){listeners.set(type,(listeners.get(type)||[]).filter(x=>x!==fn));},
  dispatch(type,props={}){const e={type,preventDefault(){this.defaultPrevented=true;},...props};for(const fn of [...(listeners.get(type)||[])])fn(e);this['on'+type]?.(e);return e;}
 };
}
function harness(initialStorage={},options={}){
 const storage=new Map(Object.entries(initialStorage));
 let now=1000;const frames=[],renders=[],worlds=[],audioCalls=[],elements=new Map(),checkedGeometry=new WeakSet();
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const context2d={fillRect(){},clearRect(){},strokeRect(){},fillText(){},beginPath(){},arc(){},fill(){},moveTo(){},lineTo(){},stroke(){}};
 function element(id,tag='div'){const classes=new Set();return Object.assign(eventTarget(),{id,tagName:tag.toUpperCase(),style:{},dataset:{},classList:{toggle(k,force){const on=force??!classes.has(k);if(on)classes.add(k);else classes.delete(k);return on;},contains:k=>classes.has(k),add:k=>classes.add(k),remove:k=>classes.delete(k)},textContent:'',innerHTML:'',hidden:false,checked:false,value:'',width:640,height:360,getContext(type){assert.equal(type,'2d');return context2d;}});}
 for(const match of html.matchAll(/<([a-z]+)\b([^>]*\bid="([^"]+)"[^>]*)>/gi)){const e=element(match[3],match[1]);e.checked=/\bchecked\b/.test(match[2]);e.hidden=/\bhidden\b/.test(match[2]);elements.set(match[3],e);}
 const document=Object.assign(eventTarget(),{hidden:false,pointerLockElement:null,getElementById(id){assert(elements.has(id),'game requested missing DOM id '+id);return elements.get(id);},createElement(tag){return element('',tag);},documentElement:{requestFullscreen(){return Promise.resolve();}}});
 document.exitPointerLock=()=>{document.pointerLockElement=null;document.dispatch('pointerlockchange');};
 const canvas=elements.get('game');canvas.requestPointerLock=()=>{document.pointerLockElement=canvas;document.dispatch('pointerlockchange');return Promise.resolve();};
 elements.get('difficulty').value='0.6';elements.get('loadout').value=String(options.weapon??0);elements.get('minimap').style.display='none';
 function finite(values,label){for(const n of values)assert(Number.isFinite(n),label+' must stay finite');}
 class Renderer {
  constructor(){this.shadowMap={enabled:false};}
  setPixelRatio(){}setSize(w,h){assert(w>0&&h>0);}setRenderTarget(){}clear(){}clearDepth(){}
  render(scene,camera){
   scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);finite(camera.projectionMatrix.elements,'camera projection');finite(camera.matrixWorld.elements,'camera world matrix');finite(camera.matrixWorldInverse.elements,'camera inverse matrix');
   scene.traverse(o=>{finite(o.matrixWorld.elements,'object '+o.type+' matrix');if(o.geometry){const p=o.geometry.attributes.position;if(p&&(!checkedGeometry.has(o.geometry)||o.isLine)){finite(p.array,'geometry');checkedGeometry.add(o.geometry);}}});
   renders.push({scene,camera});if(renders.length>24)renders.shift();
  }
 }
 const audio={};for(const method of ['resume','suspend','stopAll','setMuted','setVolume','shot','impact','reload','event','destroy','cancelRifleReload'])audio[method]=(...args)=>{audioCalls.push({method,args});return method==='resume'||method==='suspend'||method==='destroy'?Promise.resolve(true):true;};
 audio.preloadRifle=()=>Promise.resolve(true);audio.stats=()=>({ready:true,running:true,muted:false,voices:0,buffers:0,rifle:{status:'ready'}});
 const window=eventTarget();const sandbox={console,THREE:{...Three,WebGLRenderer:Renderer},document,window,innerWidth:1280,innerHeight:720,performance:{now:()=>now},requestAnimationFrame:fn=>{frames.push(fn);return frames.length;},cancelAnimationFrame(){},localStorage:{setItem(key,value){storage.set(key,String(value));},getItem(key){return storage.get(key)??null;}},setTimeout,clearTimeout};
 Object.assign(window,{innerWidth:1280,innerHeight:720});
 const context=vm.createContext(sandbox);
 const scripts=[...html.matchAll(/<script\b[^>]*src="([^"]+)"[^>]*><\/script>/g)].map(m=>m[1]);
 for(const script of scripts){
  if(script==='vendor/three.min.js')continue;
  if(script==='audio.js'){context.DeadFreightAudio={create(options){audioCalls.push({method:'create',args:[options]});return audio;}};continue;}
  vm.runInContext(fs.readFileSync(path.join(root,script),'utf8'),context,{filename:script});
  if(script==='core.js'){const Mission=context.HC.Mission;context.HC.Mission=class extends Mission{constructor(...args){super(...args);worlds.push(this);}};}
 }
 function tick(dt=1/60){assert.equal(frames.length,1,'one RAF chain must remain scheduled');const cb=frames.shift();now+=dt*1000;cb(now);for(const e of elements.values())for(const value of Object.values(e.style))assert(!/NaN|Infinity/.test(String(value)),'CSS must remain finite');}
 function advance(seconds,dt=1/60){for(let n=0;n<Math.ceil(seconds/dt);n++)tick(dt);}
 function key(code,type='keydown'){window.dispatch(type,{code,repeat:false});}
 function tap(code){key(code);key(code,'keyup');}
 function click(id){elements.get(id).dispatch('click');}
 function mouse(button,type='mousedown'){(type==='mousedown'?canvas:window).dispatch(type,{button});}
 function world(){return worlds.at(-1);}
 function model(){for(const {scene} of renders){let found;scene.traverse(o=>{if(o.userData.slide&&o.userData.rightWrist)found=o;});if(found)return found;}assert.fail('viewmodel was not passed to renderer');}
 function camera(){const found=renders.find(({camera})=>camera.isPerspectiveCamera&&camera.near===.06);assert(found);return found.camera;}
 function eventCount(type){return audioCalls.filter(c=>c.method===type||((c.method==='event'||c.method==='reload')&&c.args[0]===type)).length;}
 return {context,document,window,elements,canvas,frames,renders,worlds,audioCalls,storage,tick,advance,key,tap,click,mouse,world,model,camera,eventCount};
}
module.exports={harness};
