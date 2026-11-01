import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

// Execute production main.js itself. Only browser/device boundaries are simulated;
// this does not validate WebGL rendering, Safari accessibility or real networking.
class Element extends EventTarget {
  constructor(id=''){super();this.id=id;this.hidden=false;this.open=false;this.disabled=false;this.dataset={};this.children=[];this.attrs={};this.firstChild={textContent:''};this.style={setProperty(k,v){this[k]=v;}};this.classList={add(){},remove(){},toggle(){}};}
  get disabled(){return this._disabled;}
  set disabled(value){this._disabled=Boolean(value);}
  setAttribute(k,v){this.attrs[k]=v;}
  getAttribute(k){return this.attrs[k];}
  append(...nodes){this.children.push(...nodes);}
  replaceChildren(...nodes){this.children=nodes;}
  showModal(){this.open=true;}
  close(){this.open=false;}
  focus(){}
  getBoundingClientRect(){return{top:this.id==='footer'?730:this.id==='cat-card'?570:0,bottom:this.id==='app'?800:700,left:0,right:900,width:900,height:this.id==='app'?800:120};}
}
async function fixture({rendererThrows=false,publicPage=false}={}) {
  const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
  let source=await readFile(new URL('./main.js',import.meta.url),'utf8');
  const elements=new Map([...html.matchAll(/id="([^"]+)"/g)].map(m=>[m[1],new Element(m[1])]));
  for(const selector of ['footer','join span','welcome .fine'])elements.set(selector,new Element(selector));
  elements.get('room-choice').options=['sunroom','garden','moonlight'].map(value=>({value}));
  elements.get('help-layer').hidden=true;
  const actions=['pet','feather','ball'].map(action=>{const el=new Element();el.dataset.action=action;return el;});
  const document=new EventTarget();document.body=new Element();document.hidden=false;
  document.querySelector=selector=>selector==='dialog[open]'?[...elements.values()].find(el=>el.open)||null:elements.get(selector.startsWith('#')?selector.slice(1):selector)||null;
  document.querySelectorAll=selector=>selector==='[data-action]'?actions:[];
  document.createElement=tag=>new Element(tag);
  const window=new EventTarget();window.requestAnimationFrame=()=>0;
  const intervals=[],frames=[],timeouts=new Map(),sockets=[];let soloCreated=0,timerId=0,now=100000;const played=[],statusResponses=[];
  const storage=new Map();const store={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
  class Socket {static OPEN=1;constructor(url){this.url=url;this.readyState=0;this.sent=[];this.closes=0;sockets.push(this);}send(value){this.sent.push(JSON.parse(value));}close(){this.closes++;this.readyState=3;this.onclose?.({code:1000});}open(){this.readyState=1;this.onopen?.();}message(packet){this.onmessage?.({data:JSON.stringify(packet)});}}
  const world={yaw:0,renderCalls:0,resumeCalls:0,updateCalls:0,clearCalls:0,clear(){this.clearCalls++;},setRoom(){},update(){this.updateCalls++;},choose(){},rotate(){},select(){},zoom(){},render(){this.renderCalls++;},resumePresentation(){this.resumeCalls++;}};
  const bindings={};
  for(const match of source.matchAll(/^import\s+\{([^}]+)\}\s+from\s+'([^']+)';$/gm)) {
    const path=match[2];if(path==='./world.js')continue;
    const module=await import(new URL(path,import.meta.url));
    for(const name of match[1].split(',').map(n=>n.trim()))bindings[name]=module[name];
  }
  const OriginalJourney=bindings.ActionJourney,OriginalFeedback=bindings.ActionFeedback,OriginalAudio=bindings.CafeAudio,originalDiscovery=bindings.createServiceDiscovery;
  bindings.ActionJourney=class extends OriginalJourney{constructor(options={}){super({...options,clock:()=>now});}};
  bindings.ActionFeedback=class extends OriginalFeedback{constructor(){super(()=>now);}};
  bindings.CafeAudio=class extends OriginalAudio{play(action){played.push(action);return super.play(action);}};
  bindings.createServiceDiscovery=()=>{const actual=originalDiscovery();return{invalidate:()=>actual.invalidate(),discover:(configured,href)=>actual.discover(configured,href,{fetch:()=>new Promise(resolve=>statusResponses.push(body=>resolve({ok:true,json:async()=>body})))})};};
  const OriginalPreview=bindings.SoloPreview;
  bindings.SoloPreview=class extends OriginalPreview{constructor(...args){super(...args);soloCreated++;}};
  bindings.createWorld=()=>{if(rendererThrows)throw Error('simulated unavailable renderer');return world;};
  const bindLayout=bindings.bindNoticeLayout;
  bindings.bindNoticeLayout=(stage,card,footer,notice,options={})=>bindLayout(stage,card,footer,notice,{...options,window,ResizeObserver:undefined});
  source=source.replace(/^import[^\n]+;\s*$/gm,'').replaceAll('import.meta.env.VITE_ROOM_SERVER_URL',publicPage?"''":"'ws://localhost:8787/ws'");
  const context=vm.createContext({...bindings,document,window,WebSocket:Socket,Event,HTMLInputElement:class{},HTMLSelectElement:class{},sessionStorage:store,localStorage:store,location:{href:publicPage?'https://cafe.example/game':'http://localhost:4173/',reload(){}},crypto:{randomUUID:()=>`request-${timerId++}`},performance:{now:()=>0},console:{warn(){}},setTimeout:(fn,ms)=>{const id=++timerId;timeouts.set(id,{fn,ms});return id;},clearTimeout:id=>timeouts.delete(id),setInterval:fn=>{intervals.push(fn);return intervals.length;},requestAnimationFrame:fn=>{frames.push(fn);return frames.length;},structuredClone});
  vm.runInContext(source,context,{filename:'main.js'});
  return{elements,actions,sockets,world,storage,intervals,timeouts,frames,fireTimeout:ms=>{const entry=[...timeouts].find(([,timer])=>timer.ms===ms);assert.ok(entry,`missing ${ms}ms timer`);timeouts.delete(entry[0]);entry[1].fn();},window,document,played,statusResponses,advance:ms=>now+=ms,soloCreated:()=>soloCreated,value:code=>vm.runInContext(code,context)};
}
function welcome(socket){socket.open();socket.message({type:'welcome',id:'visitor',token:'resume-token',room:'sunroom'});socket.message({type:'state',schema:'packed-v1',room:'sunroom',seq:1,time:0,players:[['visitor','손님',0,0,0,0]],cats:[['cat-0','모카',1,0,0,0,'idle',null,0]],toys:[],rooms:['sunroom','garden','moonlight'].map(id=>({id,name:id,count:1,connected:1,reserved:0,capacity:100,recommended:50}))});}

test('actual join/look callbacks cannot create sockets or solo simulation when initial renderer fails',async()=>{
  const app=await fixture({rendererThrows:true});
  // Invoke handlers directly even though browser-native disabled buttons cannot click.
  app.elements.get('join').onclick();app.elements.get('look').onclick();
  assert.equal(app.sockets.length,0);assert.equal(app.soloCreated(),0);
  assert.equal(app.elements.get('join').disabled,true);assert.equal(app.elements.get('look').disabled,true);
  assert.equal(app.elements.get('welcome').open,true);assert.equal(app.elements.get('fallback').hidden,false);
});
test('actual live context-loss path sends leave, closes connection, clears pending and prevents re-entry',async()=>{
  const app=await fixture();app.elements.get('join').onclick();assert.equal(app.sockets.length,1);
  const socket=app.sockets[0];welcome(socket);app.elements.get('nearest').onclick();app.actions[0].onclick();
  assert.equal(socket.sent.filter(m=>m.type==='action').length,1);
  assert.equal(app.value('actionFeedback.pending.size'),1);assert.equal(app.value('actionJourney.pending.action'),'pet');
  const lost=new Event('webglcontextlost',{cancelable:true});app.elements.get('scene').dispatchEvent(lost);
  assert.equal(lost.defaultPrevented,true);assert.equal(socket.sent.filter(m=>m.type==='leave').length,1);assert.equal(socket.closes,1);
  assert.equal(app.value('actionFeedback.pending.size'),0);assert.equal(app.value('connected'),false);assert.equal(app.value('state'),null);assert.equal(app.value('selected'),null);
  assert.equal(app.value('actionJourney.pending'),null);
  const sentAfterLoss=socket.sent.length;for(const tick of app.intervals)tick();assert.equal(socket.sent.length,sentAfterLoss);assert.equal(app.timeouts.size,0);
  assert.equal(app.storage.has('cat-cafe-token'),false);assert.equal(app.elements.get('welcome').open,true);
  app.elements.get('join').onclick();app.elements.get('look').onclick();assert.equal(app.sockets.length,1);assert.equal(app.soloCreated(),0);
});

test('pending UI recovers on blur and hidden without needing another server snapshot',async()=>{
  for(const eventType of ['blur','visibilitychange']){
    const app=await fixture();app.elements.get('join').onclick();welcome(app.sockets[0]);app.elements.get('nearest').onclick();app.actions[0].onclick();
    assert.ok(app.value('actionJourney.pending'));assert.equal(app.actions[0].disabled,true);
    const pendingText=app.elements.get('cat-activity').textContent;
    if(eventType==='blur')app.window.dispatchEvent(new Event('blur'));
    else{app.document.hidden=true;app.document.dispatchEvent(new Event('visibilitychange'));}
    assert.equal(app.value('actionJourney.pending'),null);assert.equal(app.value('actionFeedback.pending.size'),0);
    assert.equal(app.actions[0].disabled,false);assert.notEqual(app.elements.get('cat-activity').textContent,pendingText);
  }
});

test('asynchronous public readiness and room/settings changes cannot enable failed-renderer entry',async()=>{
  const app=await fixture({rendererThrows:true,publicPage:true});
  app.elements.get('settings').onclick();assert.equal(app.statusResponses.length,1);
  app.elements.get('room-choice').value='garden';app.elements.get('room-choice').onchange();
  app.statusResponses[0]({available:true,endpoint:'/api/cat-cafe-metaverse/ws',betaCapacity:6});
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(app.elements.get('join').disabled,true);assert.equal(app.elements.get('look').disabled,true);
  app.elements.get('join').onclick();app.elements.get('look').onclick();
  assert.equal(app.sockets.length,0);assert.equal(app.soloCreated(),0);
});
test('actual timeout recovers buttons truthfully and late acknowledgement cannot replace new request or sound',async()=>{
  const app=await fixture();app.elements.get('join').onclick();const socket=app.sockets[0];welcome(socket);app.elements.get('nearest').onclick();app.actions[0].onclick();
  const old=socket.sent.find(m=>m.type==='action').requestId;app.advance(5001);for(const tick of app.intervals)tick();
  assert.match(app.elements.get('notice').textContent,/이미 반영됐을 수/);assert.equal(app.actions[0].disabled,false);assert.equal(app.value('actionJourney.pending'),null);
  app.actions[0].onclick();const current=app.value('actionJourney.pending.requestId');assert.notEqual(current,old);const pendingText=app.elements.get('notice').textContent;
  socket.message({type:'actionResult',requestId:old,ok:true});assert.equal(app.value('actionJourney.pending.requestId'),current);assert.equal(app.elements.get('notice').textContent,pendingText);assert.equal(app.played.length,0);
  socket.message({type:'actionResult',requestId:current,ok:true});assert.equal(app.value('actionJourney.pending'),null);assert.equal(app.played.length,1);
});
test('leave and immediate re-entry rejects old-generation callbacks without replaying old action',async()=>{
  const app=await fixture();app.elements.get('join').onclick();const oldSocket=app.sockets[0];welcome(oldSocket);app.elements.get('nearest').onclick();app.actions[0].onclick();const oldRequest=oldSocket.sent.find(m=>m.type==='action');const staleCallback=oldSocket.onmessage;
  app.elements.get('leave').onclick();app.elements.get('join').onclick();const next=app.sockets[1];welcome(next);
  staleCallback({data:JSON.stringify({type:'actionResult',requestId:oldRequest.requestId,ok:true})});
  assert.equal(next.sent.filter(m=>m.type==='action').length,0);assert.equal(app.played.length,0);assert.equal(app.value('actionJourney.pending'),null);assert.equal(app.value('connected'),true);
});

test('room switch pending acknowledgement blocks old-room cat actions and neutralizes held movement',async()=>{
  const app=await fixture();app.elements.get('join').onclick();const socket=app.sockets[0];welcome(socket);app.elements.get('nearest').onclick();
  app.value("keys.add('KeyW')");
  app.elements.get('rooms').children.find(button=>button.dataset.room==='garden').onclick();
  assert.equal(app.value('pendingRoom'),'garden');
  const before=socket.sent.filter(message=>message.type==='action').length;
  app.actions[0].onclick(); // Defense in depth even if a queued click bypasses disabled UI.
  assert.equal(socket.sent.filter(message=>message.type==='action').length,before);
  assert.equal(app.actions[0].disabled,true);
  for(const tick of app.intervals)tick();
  const lastMove=socket.sent.filter(message=>message.type==='move').at(-1);
  assert.equal(lastMove?.x??0,0);assert.equal(lastMove?.z??0,0);
});
test('open socket still has a bounded deadline for missing join acknowledgement',async()=>{
  const app=await fixture();app.elements.get('join').onclick();const socket=app.sockets[0];socket.open();
  assert.equal(app.value('connected'),false);
  const joinDeadline=[...app.timeouts.values()].find(timer=>timer.ms>0&&timer.ms<=20000);
  assert.ok(joinDeadline,'WebSocket open without welcome must not remain in connecting state indefinitely');
  joinDeadline.fn();assert.equal(socket.closes,1);
});
test('denied room switch immediately restores actual room picker without waiting for another snapshot',async()=>{
  const app=await fixture();app.elements.get('join').onclick();const socket=app.sockets[0];welcome(socket);
  app.elements.get('room-choice').value='garden';app.elements.get('room-choice').onchange();
  socket.message({type:'error',reason:'ROOM_FULL'});
  assert.equal(app.value('room'),'sunroom');assert.equal(app.value('pendingRoom'),null);
  assert.equal(app.elements.get('room-choice').value,'sunroom');
});
test('held movement cannot carry into newly acknowledged room after room-navigation request',async()=>{
  const app=await fixture();app.elements.get('join').onclick();const socket=app.sockets[0];welcome(socket);
  const keydown=new Event('keydown',{cancelable:true});Object.assign(keydown,{code:'KeyW'});app.window.dispatchEvent(keydown);
  assert.equal(app.value("keys.has('KeyW')"),true);
  app.elements.get('rooms').children.find(button=>button.dataset.room==='garden').onclick();
  socket.message({type:'welcome',id:'visitor',token:'resume-token',room:'garden'});
  for(const tick of app.intervals)tick();
  const lastMove=socket.sent.filter(message=>message.type==='move').at(-1);
  assert.equal(lastMove.x,0);assert.equal(lastMove.z,0);assert.equal(app.value('keys.size'),0);
});

test('leaving with help open resets help state and immediate re-entry is not movement-blocked',async()=>{
  const app=await fixture();app.elements.get('join').onclick();welcome(app.sockets[0]);app.elements.get('help').click?.();app.elements.get('help').dispatchEvent(new Event('click'));
  assert.equal(app.elements.get('help-layer').hidden,false);app.elements.get('leave').onclick();
  assert.equal(app.elements.get('help-layer').hidden,true);assert.equal(app.elements.get('help').getAttribute('aria-expanded'),'false');
  app.elements.get('join').onclick();welcome(app.sockets[1]);const key=new Event('keydown',{cancelable:true});Object.assign(key,{code:'KeyW'});app.window.dispatchEvent(key);for(const tick of app.intervals)tick();assert.equal(app.sockets[1].sent.filter(m=>m.type==='move').at(-1).z,-1);
});
test('solo hidden interval and RAF pause, then rebase presentation once without recreating simulation',async()=>{
  const app=await fixture();app.elements.get('look').onclick();const original=app.value('preview');
  app.document.hidden=true;app.document.dispatchEvent(new Event('visibilitychange'));const seq=app.value('preview.seq'),renders=app.world.renderCalls;
  for(let n=0;n<5;n++)for(const tick of app.intervals)tick();app.frames.shift()(30000);
  assert.equal(app.value('preview.seq'),seq);assert.equal(app.world.renderCalls,renders);assert.ok(app.frames.length>0,'hidden RAF must keep scheduling');
  app.document.hidden=false;app.document.dispatchEvent(new Event('visibilitychange'));app.window.dispatchEvent(new Event('pageshow'));
  assert.equal(app.value('preview'),original);assert.equal(app.world.resumeCalls,1);for(const tick of app.intervals)tick();assert.ok(app.value('preview.seq')>seq);
});
test('hidden live sends one neutral move then pauses after 30s preserving token; visible/pageshow resumes once',async()=>{
  const app=await fixture();app.elements.get('join').onclick();const first=app.sockets[0];welcome(first);
  app.document.hidden=true;app.document.dispatchEvent(new Event('visibilitychange'));const hiddenCount=first.sent.length;
  assert.equal(first.sent.at(-1).type,'move');assert.equal(first.sent.at(-1).z,0);
  for(let n=0;n<4;n++)for(const tick of app.intervals)tick();assert.equal(first.sent.length,hiddenCount);
  app.fireTimeout(30000);assert.equal(first.closes,1);assert.equal(first.sent.filter(m=>m.type==='leave').length,0);assert.equal(app.storage.get('cat-cafe-token'),'resume-token');
  app.document.hidden=false;app.document.dispatchEvent(new Event('visibilitychange'));app.window.dispatchEvent(new Event('pageshow'));
  assert.equal(app.sockets.length,2);app.sockets[1].open();assert.equal(app.sockets[1].sent.find(m=>m.type==='join').token,'resume-token');
});
test('pagehide pauses immediately and manual leave cancels deferred background resume',async()=>{
  const app=await fixture();app.elements.get('join').onclick();const first=app.sockets[0];welcome(first);const staleClose=first.onclose;
  app.window.dispatchEvent(new Event('pagehide'));app.window.dispatchEvent(new Event('pagehide'));
  assert.equal(first.closes,1);assert.equal(first.sent.filter(m=>m.type==='leave').length,0);
  staleClose({code:1012});assert.equal(app.timeouts.size,0);
  app.elements.get('leave').onclick();app.window.dispatchEvent(new Event('pageshow'));assert.equal(app.sockets.length,1);assert.equal(app.storage.has('cat-cafe-token'),false);
});
test('held-key repeat after room transition stays neutral until release and new press',async()=>{
  const app=await fixture();app.elements.get('join').onclick();const socket=app.sockets[0];welcome(socket);
  const press=(type,repeat=false)=>{const event=new Event(type,{cancelable:true});Object.assign(event,{code:'KeyW',repeat});app.window.dispatchEvent(event);};
  press('keydown');app.elements.get('rooms').children.find(b=>b.dataset.room==='garden').onclick();socket.message({type:'welcome',id:'visitor',token:'resume-token',room:'garden'});
  press('keydown',true);for(const tick of app.intervals)tick();assert.equal(socket.sent.filter(m=>m.type==='move').at(-1).z,0);
  press('keyup');press('keydown');for(const tick of app.intervals)tick();assert.equal(socket.sent.filter(m=>m.type==='move').at(-1).z,-1);
});
test('hidden connection loss does not start reconnect retries or close the dead socket twice',async()=>{
  const app=await fixture();app.elements.get('join').onclick();const first=app.sockets[0];welcome(first);
  app.document.hidden=true;app.document.dispatchEvent(new Event('visibilitychange'));first.close();
  assert.equal([...app.timeouts.values()].filter(timer=>timer.ms<30000).length,0);
  app.fireTimeout(30000);assert.equal(first.closes,1);
  app.document.hidden=false;app.document.dispatchEvent(new Event('visibilitychange'));assert.equal(app.sockets.length,2);
});
test('only one room request is in flight and repeated join button does not cancel its acknowledgement deadline',async()=>{
  const app=await fixture();app.elements.get('join').onclick();const socket=app.sockets[0];welcome(socket);
  const initial=socket.sent.filter(m=>m.type==='join').length;
  app.elements.get('rooms').children.find(b=>b.dataset.room==='garden').onclick();app.elements.get('rooms').children.find(b=>b.dataset.room==='moonlight').onclick();
  assert.equal(socket.sent.filter(m=>m.type==='join').length,initial+1);assert.equal(app.value('pendingRoom'),'garden');
  app.elements.get('join').onclick();assert.equal([...app.timeouts.values()].filter(timer=>timer.ms===15000).length,1);
});
test('fatal hidden quota cancels background timer and cannot resurrect reconnect even with queued timer callback',async()=>{
  const app=await fixture();app.elements.get('join').onclick();const first=app.sockets[0];welcome(first);
  app.document.hidden=true;app.document.dispatchEvent(new Event('visibilitychange'));const queuedPause=[...app.timeouts.values()].find(t=>t.ms===30000).fn;
  first.close=()=>{first.closes++;first.readyState=2;}; // Closing handshake may finish after the already queued pause callback.
  first.message({type:'error',reason:'QUOTA_EXHAUSTED'});
  assert.equal([...app.timeouts.values()].filter(t=>t.ms===30000).length,0);queuedPause();
  app.document.hidden=false;app.document.dispatchEvent(new Event('visibilitychange'));assert.equal(app.sockets.length,1);assert.equal(app.value('backgroundResume'),false);
});
test('unrelated delayed input error cannot clear room transition or permit old-cat action',async()=>{
  const app=await fixture();app.elements.get('join').onclick();const socket=app.sockets[0];welcome(socket);app.elements.get('nearest').onclick();app.elements.get('rooms').children.find(b=>b.dataset.room==='garden').onclick();
  socket.message({type:'error',reason:'INVALID_MOVE'});assert.equal(app.value('pendingRoom'),'garden');app.actions[0].onclick();assert.equal(socket.sent.filter(m=>m.type==='action').length,0);assert.equal([...app.timeouts.values()].filter(t=>t.ms===15000).length,1);
});
test('hidden live snapshots retain latest state without updating presentation until visible',async()=>{
  const app=await fixture();app.elements.get('join').onclick();const socket=app.sockets[0];welcome(socket);app.document.hidden=true;app.document.dispatchEvent(new Event('visibilitychange'));const updates=app.world.updateCalls,position=app.elements.get('position').textContent;
  socket.message({type:'state',schema:'packed-v1',room:'sunroom',seq:2,time:50,players:[['visitor','손님',4,0,0,0]],cats:[],toys:[],rooms:['sunroom','garden','moonlight'].map(id=>({id,name:id,count:1,connected:1,reserved:0,capacity:100,recommended:50}))});
  assert.equal(app.value('seq'),2);assert.equal(app.value('state.players[0].x'),4);assert.equal(app.world.updateCalls,updates);assert.equal(app.elements.get('position').textContent,position);
  app.document.hidden=false;app.document.dispatchEvent(new Event('visibilitychange'));assert.equal(app.world.updateCalls,updates+1);assert.equal(app.world.resumeCalls,0);assert.match(app.elements.get('position').textContent,/4.0/);
});
test('expired background reservation uses existing invalid-token fresh-join fallback without action replay',async()=>{
  const app=await fixture();app.elements.get('join').onclick();welcome(app.sockets[0]);app.window.dispatchEvent(new Event('pagehide'));app.window.dispatchEvent(new Event('pageshow'));const resumed=app.sockets[1];resumed.open();assert.equal(resumed.sent.at(-1).token,'resume-token');resumed.message({type:'error',reason:'INVALID_TOKEN'});const fresh=resumed.sent.filter(m=>m.type==='join').at(-1);assert.equal(fresh.token,undefined);assert.equal(resumed.sent.filter(m=>m.type==='action').length,0);
});
test('pagehide preserves scheduled reconnect intent but never resumes after manual leave cancels it',async()=>{
  for(const manualLeave of [false,true]){
    const app=await fixture();app.elements.get('join').onclick();const first=app.sockets[0];welcome(first);first.close();assert.ok(app.timeouts.size>0);
    if(manualLeave)app.elements.get('leave').onclick();
    app.window.dispatchEvent(new Event('pagehide'));assert.equal(app.timeouts.size,0);app.window.dispatchEvent(new Event('pageshow'));
    assert.equal(app.sockets.length,manualLeave?1:2);
  }
});

test('repeated manual entry while an open socket awaits welcome reuses the in-flight join',async()=>{
  const app=await fixture();app.elements.get('join').onclick();const first=app.sockets[0];first.open();
  assert.equal(first.sent.filter(m=>m.type==='join').length,1);assert.equal(app.value('connected'),false);const originalDeadline=[...app.timeouts.keys()][0];
  app.elements.get('settings').onclick();app.elements.get('join').onclick();
  assert.equal(app.sockets.length,1,'do not create another identity before the first committed join is acknowledged');
  assert.equal(first.closes,0);assert.equal(first.sent.filter(m=>m.type==='join').length,1);
  assert.equal([...app.timeouts.values()].filter(timer=>timer.ms===15000).length,1);assert.equal([...app.timeouts.keys()][0],originalDeadline);
});
test('repeated manual entry while transport is still connecting does not replace the active socket',async()=>{
  const app=await fixture();app.elements.get('join').onclick();const first=app.sockets[0],originalDeadline=[...app.timeouts.keys()][0];
  app.elements.get('settings').onclick();app.elements.get('join').onclick();
  assert.equal(app.sockets.length,1);assert.equal(first.closes,0);assert.equal([...app.timeouts.values()].filter(timer=>timer.ms===6000).length,1);assert.equal([...app.timeouts.keys()][0],originalDeadline);
});
test('terminal beta-full stops automatic retry but explicit later entry can recover normally',async()=>{
  const app=await fixture();app.elements.get('join').onclick();const first=app.sockets[0];first.open();first.message({type:'error',reason:'BETA_FULL'});
  assert.equal(app.value('manual'),true);assert.equal(app.timeouts.size,0);for(const tick of app.intervals)tick();assert.equal(app.sockets.length,1);
  app.elements.get('join').onclick();const second=app.sockets[1];welcome(second);assert.equal(app.value('connected'),true);assert.equal(app.value('manual'),false);assert.equal(second.sent.filter(m=>m.type==='join').length,1);
});
test('initial join in flight blocks room picker and navigation without losing selected join or deadline',async()=>{
  const app=await fixture();app.elements.get('join').onclick();const first=app.sockets[0];first.open();
  assert.equal(app.elements.get('room-choice').disabled,true);assert.ok(app.elements.get('rooms').children.every(button=>button.disabled));
  app.elements.get('room-choice').value='garden';app.elements.get('room-choice').onchange();
  app.elements.get('rooms').children.find(button=>button.dataset.room==='moonlight').onclick();
  assert.equal(app.value('room'),'sunroom');assert.equal(app.elements.get('room-choice').value,'sunroom');assert.equal(first.sent.filter(m=>m.type==='join').length,1);assert.equal([...app.timeouts.values()].filter(timer=>timer.ms===15000).length,1);
  app.elements.get('leave').onclick();assert.equal(app.elements.get('room-choice').disabled,false);app.elements.get('room-choice').value='garden';app.elements.get('room-choice').onchange();app.elements.get('join').onclick();const next=app.sockets[1];next.open();assert.equal(next.sent.find(m=>m.type==='join').room,'garden');
});
