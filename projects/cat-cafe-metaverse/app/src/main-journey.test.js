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
  const intervals=[],timeouts=new Map(),sockets=[];let soloCreated=0,timerId=0,now=100000;const played=[],statusResponses=[];
  const storage=new Map();const store={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
  class Socket {static OPEN=1;constructor(url){this.url=url;this.readyState=0;this.sent=[];this.closes=0;sockets.push(this);}send(value){this.sent.push(JSON.parse(value));}close(){this.closes++;this.readyState=3;this.onclose?.({code:1000});}open(){this.readyState=1;this.onopen?.();}message(packet){this.onmessage?.({data:JSON.stringify(packet)});}}
  const world={yaw:0,clearCalls:0,clear(){this.clearCalls++;},setRoom(){},update(){},choose(){},rotate(){},select(){},zoom(){},render(){}};
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
  const context=vm.createContext({...bindings,document,window,WebSocket:Socket,Event,HTMLInputElement:class{},HTMLSelectElement:class{},sessionStorage:store,localStorage:store,location:{href:publicPage?'https://cafe.example/game':'http://localhost:4173/',reload(){}},crypto:{randomUUID:()=>`request-${timerId++}`},performance:{now:()=>0},console:{warn(){}},setTimeout:(fn,ms)=>{const id=++timerId;timeouts.set(id,{fn,ms});return id;},clearTimeout:id=>timeouts.delete(id),setInterval:fn=>{intervals.push(fn);return intervals.length;},requestAnimationFrame:()=>0,structuredClone});
  vm.runInContext(source,context,{filename:'main.js'});
  return{elements,actions,sockets,world,storage,intervals,timeouts,window,document,played,statusResponses,advance:ms=>now+=ms,soloCreated:()=>soloCreated,value:code=>vm.runInContext(code,context)};
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
