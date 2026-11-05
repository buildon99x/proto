import test from 'node:test';
import assert from 'node:assert/strict';
const implementation = await import('../src/playback-controls.js').catch(error => {
 if(error.code==='ERR_MODULE_NOT_FOUND') return {};
 throw error;
});
class Element {
 constructor(tag='div'){this.tagName=tag;this.children=[];this.attributes={};this.events=new Map();this.value='';this.style={setProperty:(k,v)=>this.style[k]=v};}
 append(...items){this.children.push(...items);}
 setAttribute(k,v){this.attributes[k]=String(v);}
 getAttribute(k){return this.attributes[k]??null;}
 addEventListener(k,f){this.events.set(k,f);}
 removeEventListener(k,f){if(this.events.get(k)===f)this.events.delete(k);}
 emit(k){this.events.get(k)?.({target:this});}
 remove(){this.removed=true;}
}
function setup({duration=132,time=0,reduced=false,available=true,timeline=true}={}){
 const container=new Element(),frames=new Map();let id=0,seekCount=0;
 const state={duration,time,speed:1,paused:false,reduced,running:!reduced};
 const runtime=available?{stats:()=>({...state}),seek:t=>{state.time=((t%duration)+duration)%duration;},setPaused:value=>{state.paused=value;state.running=!value&&!state.reduced;},setSpeed:value=>{state.speed=value;}}:null;
 const document={createElement:tag=>new Element(tag)};
 const ui=implementation.attachPlaybackControls({container,runtime,definition:{duration,timeline,moments:[{time:0,label:'시작'},{time:60,label:'완성'}]},onSeek:()=>seekCount++,document,requestFrame:fn=>{frames.set(++id,fn);return id;},cancelFrame:key=>frames.delete(key)});
 const tick=()=>{const [key,fn]=frames.entries().next().value??[];if(fn){frames.delete(key);fn();}};
 return {ui,state,frames,tick,container,seekCount:()=>seekCount};
}
test('timeline controls attach to an opted-in world',()=>{
 assert.equal(typeof implementation.attachPlaybackControls,'function','timeline UI must exist');
 const {ui,container}=setup();assert.ok(ui);assert.equal(container.children.length,1);ui.dispose();
});
test('progress follows runtime time, phase seeks, reset and loop wrap',()=>{
 const {ui,state,tick}=setup({time:66});assert.equal(ui.timeline.value,'500');assert.equal(ui.time.textContent,'1:06 / 2:12');assert.equal(ui.progress.textContent,'50%');
 state.time=119;tick();assert.equal(ui.time.textContent,'1:59 / 2:12');assert.equal(ui.progress.textContent,'90%');
 state.time=0;tick();assert.equal(ui.timeline.value,'0');assert.equal(ui.time.textContent,'0:00 / 2:12');ui.dispose();
});
test('scrubbing pauses and maps endpoints to first and last frames, not loop start',()=>{
 const {ui,state,seekCount}=setup();ui.timeline.value='500';ui.timeline.emit('input');assert.equal(state.time,66);assert.equal(state.paused,true);assert.equal(seekCount(),1);
 ui.timeline.value='1000';ui.timeline.emit('input');assert.ok(state.time>131.99&&state.time<132);assert.equal(ui.progress.textContent,'100%');assert.equal(ui.time.textContent,'2:12 / 2:12');
 ui.timeline.value='0';ui.timeline.emit('input');assert.equal(state.time,0);ui.dispose();
});
test('every rate changes playback speed without seeking or resuming paused/reduced motion',()=>{
 const {ui,state}=setup({time:60,reduced:true});state.paused=true;
 assert.deepEqual(ui.speed.children.map(option=>option.value),['0.25','0.5','0.75','1','1.5','2','3']);
 for(const rate of [.25,.5,.75,1,1.5,2,3]){ui.speed.value=String(rate);ui.speed.emit('change');assert.equal(state.speed,rate);assert.equal(state.time,60);assert.equal(state.paused,true);assert.equal(state.running,false);}
 ui.dispose();
});
test('unavailable renderer is truthful and disabled, and legacy worlds add no controls',()=>{
 const unavailable=setup({available:false});assert.equal(unavailable.ui.timeline.disabled,true);assert.equal(unavailable.ui.speed.disabled,true);assert.equal(unavailable.ui.time.textContent,'— / 2:12');assert.equal(unavailable.frames.size,0);unavailable.ui.dispose();
 const legacy=setup({timeline:false});assert.equal(legacy.ui,null);assert.equal(legacy.container.children.length,0);assert.equal(legacy.frames.size,0);
});
test('disposal cancels UI updates and removes event listeners',()=>{
 const {ui,frames,state}=setup();assert.equal(frames.size,1);ui.dispose();ui.dispose();assert.equal(frames.size,0);assert.equal(ui.timeline.events.size,0);assert.equal(ui.speed.events.size,0);ui.timeline.value='500';ui.timeline.emit('input');assert.equal(state.time,0);
});

test('standalone unavailable timeline survives BFCache and cleans up on real page exit',async()=>{
 const {buildWorld}=await import('../../.agents/skills/diorama-worlds/scripts/build-world.mjs');
 const {mkdtemp,rm}=await import('node:fs/promises');const {tmpdir}=await import('node:os');const {join,resolve}=await import('node:path');const {runInNewContext}=await import('node:vm');
 const dir=await mkdtemp(join(tmpdir(),'timelapse-entry-'));let entry;
 try{
  await buildWorld(resolve(import.meta.dirname,'../src/desert-timelapse.js'),join(dir,'world.html'),{zoomModule:resolve(import.meta.dirname,'../src/zoom.js'),playbackModule:resolve(import.meta.dirname,'../src/playback-controls.js'),bundler:{build:async options=>{entry=options.stdin.contents;return{outputFiles:[{text:''}]};}}});
  const elements=new Map();const find=key=>{if(!elements.has(key))elements.set(key,new Element());return elements.get(key);};const events=new Map();
  const document={createElement:tag=>new Element(tag),querySelector:find,documentElement:{classList:{add(){}}}};
  const context={definition:{timeline:true,title:'World',description:'Scene',name:'test',duration:132,moments:[]},mountWorld:()=>null,FINISHES:['miniature'],URLSearchParams,location:{search:'',origin:'https://example.test'},document,addEventListener:(name,fn)=>{const handlers=events.get(name)??[];handlers.push(fn);events.set(name,handlers);},attachPlaybackControls:args=>implementation.attachPlaybackControls({...args,document})};context.window=context.parent=context;
  runInNewContext(entry.replace(/^import .*;$/gm,''),context);
  const panel=find('.controls').children[0];assert.ok(panel,'unavailable state still shows timeline controls');
  for(const listener of events.get('pagehide')??[])listener({persisted:true});assert.notEqual(panel.removed,true,'BFCache must preserve disabled timeline');
  for(const listener of events.get('pagehide')??[])listener({persisted:false});assert.equal(panel.removed,true);
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('standalone phase selection, reset, scrub/pause/resume and rate stay synchronized',async()=>{
 const {buildWorld}=await import('../../.agents/skills/diorama-worlds/scripts/build-world.mjs');
 const {mkdtemp,rm}=await import('node:fs/promises');const {tmpdir}=await import('node:os');const {join,resolve}=await import('node:path');const {runInNewContext}=await import('node:vm');
 const dir=await mkdtemp(join(tmpdir(),'timelapse-wiring-'));let entry,ui;
 try{
  await buildWorld(resolve(import.meta.dirname,'../src/desert-timelapse.js'),join(dir,'world.html'),{playbackModule:resolve(import.meta.dirname,'../src/playback-controls.js'),bundler:{build:async options=>{entry=options.stdin.contents;return{outputFiles:[{text:''}]};}}});
  const elements=new Map();const find=key=>{if(!elements.has(key))elements.set(key,new Element());return elements.get(key);};const events=new Map();
  const document={createElement:tag=>new Element(tag),querySelector:find,documentElement:{classList:{add(){}}}};
  const state={time:0,duration:132,speed:1,paused:false};const runtime={stats:()=>({...state}),setPaused:value=>{state.paused=value;},seek:t=>{state.time=t;},setSpeed:value=>{state.speed=value;},dispose(){}};
  const context={definition:{timeline:true,title:'World',description:'Scene',name:'test',duration:132,still:0,moments:[{time:0,label:'시작'},{time:60,label:'완성'}]},mountWorld:()=>runtime,FINISHES:['miniature'],URLSearchParams,location:{search:'',origin:'https://example.test'},matchMedia:()=>({matches:false}),document,addEventListener:(name,fn)=>{const handlers=events.get(name)??[];handlers.push(fn);events.set(name,handlers);},attachPlaybackControls:args=>(ui=implementation.attachPlaybackControls({...args,document,requestFrame:()=>1,cancelFrame(){}}))};context.window=context.parent=context;
  runInNewContext(entry.replace(/^import .*;$/gm,''),context);
  const stageSelect=find('.controls').children.find(child=>child.tagName==='label').children[0];
  stageSelect.value='60';stageSelect.emit('change');assert.equal(state.time,60);assert.equal(state.paused,true);assert.equal(find('#pause').textContent,'Play scene');assert.equal(ui.time.textContent,'1:00 / 2:12');
  const panel=find('.controls').children.find(child=>child.tagName==='section');assert.equal(panel.children[3].children[1].textContent,'완성');
  find('#reset').emit('click');assert.equal(state.time,0);assert.equal(ui.timeline.value,'0');assert.equal(stageSelect.value,'0');
  ui.timeline.value='500';ui.timeline.emit('input');assert.equal(state.time,66);assert.equal(find('#pause').getAttribute('aria-pressed'),'true');assert.equal(stageSelect.value,'');
  find('#pause').emit('click');assert.equal(state.paused,false);assert.equal(find('#pause').textContent,'Pause scene');
  runtime.setSpeed(2);ui.refresh();assert.equal(ui.speed.value,'2');
  ui.speed.value='0.5';ui.speed.emit('change');assert.equal(state.speed,.5);assert.equal(state.time,66);assert.equal(state.paused,false);ui.dispose();
 }finally{await rm(dir,{recursive:true,force:true});}
});
