import test from 'node:test';
import assert from 'node:assert/strict';
import {ACTIONS,controlPreset,controlsFor,migrateControls,validateControls,rebindControl,actionLabel,tokenLabel,createInputRouter} from '../src/controls.js';
import {createState,reduceRuntime,validateState} from '../src/state.js';
import {createStore} from '../src/save.js';

// Independent historical fixture: do not derive an old save from today's preset.
const oldControls=(preset='legacy')=>({
 version:1,preset,
 bindings:{up:['KeyW','ArrowUp'],down:['KeyS','ArrowDown'],left:['KeyA','ArrowLeft'],right:['KeyD','ArrowRight'],attack:['Mouse0','KeyJ'],block:['Mouse2','ShiftLeft','ShiftRight'],charge:['Space'],hammer:['KeyQ'],interact:[preset==='legacy'?'KeyE':'KeyF'],potion:[preset==='legacy'?'Digit1':'KeyR'],menu:['KeyC'],pause:['Escape']},
 blockMode:'hold',chargeDirection:'aim'
});
const freeze=value=>{if(value&&typeof value==='object'){Object.freeze(value);for(const child of Object.values(value))freeze(child);}return value;};
const skills=['heal','judgement'],optionalSkills=[...skills,'expert1','expert2'];
const changed=(c,action,index,token)=>{const result=rebindControl(c,action,index,token);assert.equal(result.ok,true,result.reason);return result.controls;};

test('Current controls preserve Adept E/T and recommended adds E judgement and T heal; legacy adds only empty rows',()=>{
 assert.equal(Object.keys(ACTIONS).length,16);
 assert.equal(ACTIONS.heal,'온기 나누기');assert.equal(ACTIONS.judgement,'단죄의 일격');
 for(const preset of ['recommended','legacy']){
  const c=controlPreset(preset);assert.equal(c.version,3);assert.equal(validateControls(c).ok,true);
  assert.deepEqual(c.bindings.heal,preset==='recommended'?['KeyT']:[]);
  assert.deepEqual(c.bindings.judgement,preset==='recommended'?['KeyE']:[]);
  for(const [action,keys] of Object.entries(oldControls(preset).bindings))assert.deepEqual(c.bindings[action],keys);
 }
});

for(const preset of ['legacy','recommended','custom'])test(`v1 ${preset} migration preserves every key and option without applying a preset`,()=>{
 const old=oldControls(preset);old.bindings.hammer=['KeyZ','Mouse3'];old.bindings.potion=['Digit1','Mouse4'];old.blockMode='toggle';old.chargeDirection='movement';
 // Old recommended/custom labels do not mean their user-selected E/T are free.
 if(preset!=='legacy'){old.bindings.interact=['KeyE'];old.bindings.menu=['KeyT'];}
 const before=structuredClone(old);freeze(old);
 assert.equal(validateControls(old).ok,true);
 const next=migrateControls(old);assert.equal(next.version,3);assert.equal(next.preset,preset);
 assert.equal(next.blockMode,'toggle');assert.equal(next.chargeDirection,'movement');
 for(const [action,keys] of Object.entries(old.bindings))assert.deepEqual(next.bindings[action],keys);
 for(const action of skills)assert.deepEqual(next.bindings[action],[]);
 assert.equal(validateControls(next).ok,true);assert.deepEqual(old,before);
 assert.deepEqual(migrateControls(next),next);assert.notEqual(migrateControls(next).bindings,next.bindings);
 next.bindings.hammer[0]='KeyG';assert.equal(old.bindings.hammer[0],'KeyZ');
});

test('controlsFor migrates detached reads and absence stays legacy without creating a saved field',()=>{
 for(const preset of ['legacy','recommended','custom']){
  const state={options:{controls:oldControls(preset)}},before=structuredClone(state);
  const first=controlsFor(state),second=controlsFor(state);
  assert.equal(first.version,3);assert.deepEqual(first.bindings.heal,[]);assert.deepEqual(first.bindings.judgement,[]);
  first.bindings.attack[0]='KeyZ';assert.deepEqual(state,before);assert.notDeepEqual(first,second);
 }
 const absent={options:{}};assert.deepEqual(controlsFor(absent),controlPreset('legacy'));assert.deepEqual(absent,{options:{}});
 assert.deepEqual(controlsFor(null),controlPreset('legacy'));
 assert.throws(()=>controlsFor({options:{controls:null}}));
});

test('v1 validator requires exactly its twelve rows and rejects new skill injection',()=>{
 assert.equal(validateControls(oldControls()).ok,true);
 for(const action of skills){
  const injected=oldControls();injected.bindings[action]=[];
  assert.equal(validateControls(injected).ok,false);assert.throws(()=>migrateControls(injected));
  delete injected.bindings.hammer;assert.equal(Object.keys(injected.bindings).length,12);
  assert.equal(validateControls(injected).ok,false);
 }
 const disguised=controlPreset();disguised.version=1;assert.equal(validateControls(disguised).ok,false);
});

test('current validator never silently repairs omitted rows, version or options',()=>{
 for(const action of Object.keys(ACTIONS)){const c=controlPreset();delete c.bindings[action];assert.equal(validateControls(c).ok,false,action);assert.throws(()=>migrateControls(c));}
 for(const field of ['version','preset','bindings','blockMode','chargeDirection']){const c=controlPreset();delete c[field];assert.equal(validateControls(c).ok,false,field);}
 const partial=oldControls();partial.version=2;assert.equal(validateControls(partial).ok,false);
 const unknown=controlPreset();delete unknown.bindings.heal;unknown.bindings.extra=[];assert.equal(validateControls(unknown).ok,false);
 for(const version of [0,4,'1','2',null])assert.equal(validateControls({...controlPreset(),version}).ok,false);
});

test('optional skill rows allow zero keys; all rows enforce dense supported arrays',()=>{
 for(const action of Object.keys(ACTIONS)){
  const c=controlPreset();c.bindings[action]=[];assert.equal(validateControls(c).ok,optionalSkills.includes(action),action);
  for(const bad of [null,{},'KeyZ',[undefined],new Array(1),['KeyZ',,'KeyX'],['KeyZ','KeyX','KeyV','KeyB'],['Mouse5'],['ControlLeft']]){
   c.bindings[action]=bad;assert.equal(validateControls(c).ok,false,`${action}: ${JSON.stringify(bad)}`);
  }
 }
 for(const action of Object.keys(oldControls().bindings)){const c=oldControls();c.bindings[action]=[];assert.equal(validateControls(c).ok,false,action);}
});

test('new skill bindings retain global duplicate and Escape reservation rules',()=>{
 for(const action of skills)for(const keys of [['Escape'],['KeyQ'],['KeyZ','KeyZ']]){
  const c=controlPreset('legacy');c.bindings[action]=keys;assert.equal(validateControls(c).ok,false);
 }
 const c=controlPreset('legacy');c.bindings.heal=['KeyZ','Mouse3','Mouse4'];assert.equal(validateControls(c).ok,true);
 c.bindings.judgement=['KeyZ'];assert.equal(validateControls(c).ok,false);
});

test('unassigned labels are explicit and old direct callers never render undefined',()=>{
 for(const c of [oldControls(),controlPreset('legacy'),undefined])for(const action of skills)assert.equal(actionLabel(c,action),'미지정');
 for(const token of [undefined,null,'',0])assert.equal(tokenLabel(token),'미지정');
 assert.equal(actionLabel(controlPreset(),'heal'),'T');assert.equal(actionLabel(controlPreset(),'judgement'),'E');
 assert.equal(actionLabel(controlPreset(),'attack'),'마우스 왼쪽 / J');
});

test('rebind normalizes v1 first, preserves its keys/options and does not change its source',()=>{
 const old=oldControls();old.bindings.hammer=['KeyZ'];old.blockMode='toggle';old.chargeDirection='movement';const before=structuredClone(old);freeze(old);
 const c=changed(old,'heal',0,'KeyT');assert.equal(c.version,3);assert.equal(c.preset,'custom');assert.deepEqual(c.bindings.heal,['KeyT']);assert.deepEqual(c.bindings.judgement,[]);
 assert.deepEqual(c.bindings.hammer,['KeyZ']);assert.deepEqual(c.bindings.interact,['KeyE']);assert.deepEqual(c.bindings.potion,['Digit1']);
 assert.equal(c.blockMode,'toggle');assert.equal(c.chargeDirection,'movement');assert.deepEqual(old,before);
 const originalAction=changed(old,'hammer',0,'KeyX');assert.equal(originalAction.version,3);assert.deepEqual(originalAction.bindings.heal,[]);
});

test('new skill final bindings can be removed and re-added; original actions stay required',()=>{
 for(const action of skills){
  let c=controlPreset();c=changed(c,action,0,null);assert.deepEqual(c.bindings[action],[]);assert.equal(actionLabel(c,action),'미지정');
  assert.equal(rebindControl(c,action,0,null).ok,false);assert.equal(rebindControl(c,action,1,'KeyZ').ok,false);
  c=changed(c,action,0,'KeyZ');c=changed(c,action,1,'Mouse3');c=changed(c,action,2,'Mouse4');
  assert.equal(rebindControl(c,action,3,'KeyX').ok,false);assert.equal(validateControls(c).ok,true);
  c=changed(c,action,1,null);assert.deepEqual(c.bindings[action],['KeyZ','Mouse4']);
 }
 for(const action of Object.keys(oldControls().bindings)){const c=controlPreset();c.bindings[action]=[c.bindings[action][0]];assert.equal(rebindControl(c,action,0,null).ok,false,action);}
});

test('failed skill rebinding leaves both old and current objects byte-for-byte unchanged',()=>{
 for(const source of [oldControls(),controlPreset(),controlPreset('legacy')]){
  const before=JSON.stringify(source);freeze(source);
  for(const [action,index,token] of [['heal',0,'KeyQ'],['judgement',0,'Escape'],['heal',2,'KeyZ'],['heal',0,'Mouse5'],['missing',0,'KeyZ'],['heal',-1,'KeyZ']]){
   const r=rebindControl(source,action,index,token);assert.equal(r.ok,false);assert.equal(JSON.stringify(source),before);
  }
 }
 const collision=rebindControl(oldControls(),'judgement',0,'KeyE');assert.match(collision.reason,/상호작용/);
});

test('valid v1 save roundtrip preserves raw storage and exposes detached unassigned v2 skills',()=>{
 for(const preset of ['legacy','recommended','custom']){
  const state=createState(),old=oldControls(preset);old.bindings.hammer=['KeyZ'];old.blockMode='toggle';old.chargeDirection='movement';state.options.controls=old;
  assert.equal(validateState(state).ok,true);
  const raw=new Map(),store=createStore({getItem:k=>raw.get(k)??null,setItem:(k,v)=>raw.set(k,v)},{profile:`qa-controls-v1-${preset}`});
  assert.equal(store.save(state,{expectedRevision:0}).ok,true);const bytes=[...raw.entries()];
  const loaded=store.load();assert.equal(loaded.ok,true);const view=controlsFor(loaded.state);
  assert.equal(view.version,3);assert.equal(view.preset,preset);assert.deepEqual(view.bindings.heal,[]);assert.deepEqual(view.bindings.judgement,[]);
  for(const [action,keys] of Object.entries(old.bindings))assert.deepEqual(view.bindings[action],keys);
  assert.equal(view.blockMode,'toggle');assert.equal(view.chargeDirection,'movement');assert.deepEqual([...raw.entries()],bytes);
  const set=reduceRuntime(loaded.state,{type:'setControls',controls:changed(view,'heal',0,'Mouse3')});assert.equal(set.ok,true,set.reason);
  assert.equal(store.save(set.state,{expectedRevision:1}).ok,true);assert.deepEqual(controlsFor(store.load().state).bindings.heal,['Mouse3']);
 }
});

for(const action of skills)test(`${action} keyboard is one shot until release and an explicit fresh press`,()=>{
 const c=controlPreset(),token=c.bindings[action][0],r=createInputRouter();
 assert.equal(r.down(token,c,{repeat:true}),null);assert.equal(r.snapshot(c)[action],false);
 assert.equal(r.down(token,c),action);assert.equal(r.snapshot(c)[action],true);
 for(let i=0;i<5;i++){assert.equal(r.snapshot(c)[action],false);assert.equal(r.down(token,c),null);assert.equal(r.down(token,c,{repeat:true}),null);}
 assert.equal(r.snapshot(c)[action],false);r.up(token);assert.equal(r.down(token,c),action);assert.equal(r.snapshot(c)[action],true);
 assert.equal(r.consume(action),false);
 r.up(token);r.down(token,c);assert.equal(r.consume(action),true);assert.equal(r.snapshot(c)[action],false);
});

test('both new pulses occur once in the same snapshot and a release before snapshot does not lose a press',()=>{
 const c=controlPreset(),r=createInputRouter();r.down('KeyE',c);r.down('KeyT',c);r.up('KeyE');r.up('KeyT');
 const first=r.snapshot(c),second=r.snapshot(c);for(const action of skills){assert.equal(first[action],true);assert.equal(second[action],false);assert.equal(typeof second[action],'boolean');}
});

test('old controls can be passed directly and unbound skills do not acquire hidden defaults',()=>{
 for(const c of [oldControls(),migrateControls(oldControls()),controlPreset('legacy')]){
  const r=createInputRouter();assert.equal(r.down('KeyT',c),null);assert.equal(r.down('KeyE',c),'interact');assert.equal(r.consume('interact'),true);
  assert.equal(r.down('Digit1',c),'potion');assert.equal(r.consume('potion'),true);
  const s=r.snapshot(c);assert.equal(s.heal,false);assert.equal(s.judgement,false);
 }
 const old=oldControls('recommended');old.bindings.hammer=['KeyZ'];const r=createInputRouter();
 assert.equal(r.down('KeyE',old),null);assert.equal(r.down('KeyT',old),null);assert.equal(r.down('KeyZ',old),'hammer');assert.equal(r.snapshot(old).hammer,true);
});

for(const action of skills)test(`${action} key, auxiliary mouse and virtual button share one-shot and clearing policy`,()=>{
 for(const source of ['keyboard','Mouse3','Mouse4','virtual']){
  let c=controlPreset('legacy');if(source!=='virtual')c=changed(c,action,0,source==='keyboard'?'KeyZ':source);
  const token=source==='keyboard'?'KeyZ':source,r=createInputRouter();
  const press=options=>source==='virtual'?r.virtual(action,true,c,options):r.down(token,c,options);
  const release=()=>source==='virtual'?r.virtual(action,false,c):r.up(token);
  press();assert.equal(r.snapshot(c)[action],true,source);press();assert.equal(r.snapshot(c)[action],false,source);
  release();press();assert.equal(r.snapshot(c)[action],true,source);
  r.clear();assert.equal(r.snapshot(c)[action],false,source);press({repeat:true});assert.equal(r.snapshot(c)[action],false,source);
  release();press();assert.equal(r.snapshot(c)[action],true,source);
  assert.equal(r.snapshot(c).attack,false);assert.equal(r.snapshot(c).block,false);
 }
});

test('new skill input remains blocked for editable, modified, paused and repeated events on every adapter',()=>{
 for(const action of skills)for(const source of ['key','mouse','virtual'])for(const option of ['editable','modified','paused','repeat']){
  const c=changed(controlPreset('legacy'),action,0,source==='mouse'?'Mouse3':'KeyZ'),r=createInputRouter();
  const result=source==='virtual'?r.virtual(action,true,c,{[option]:true}):r.down(source==='mouse'?'Mouse3':'KeyZ',c,{[option]:true});
  assert.equal(result,null);assert.equal(r.snapshot(c)[action],false);
 }
});

test('toggle guard cancels on a fresh new skill press across keyboard, mouse and virtual adapters',()=>{
 for(const action of skills)for(const source of ['key','mouse','virtual']){
  const c=changed(controlPreset('legacy'),action,0,source==='mouse'?'Mouse3':'KeyZ');c.blockMode='toggle';const r=createInputRouter();
  const skillPress=options=>source==='virtual'?r.virtual(action,true,c,options):r.down(source==='mouse'?'Mouse3':'KeyZ',c,options);
  const shield=()=>{r.down('Mouse2',c);r.up('Mouse2');};
  shield();assert.equal(r.snapshot(c).block,true);skillPress();let snapshot=r.snapshot(c);assert.equal(snapshot.block,false);assert.equal(snapshot[action],true);
  shield();assert.equal(r.snapshot(c).block,true);skillPress();skillPress({repeat:true});snapshot=r.snapshot(c);assert.equal(snapshot.block,true);assert.equal(snapshot[action],false);
  if(source==='virtual')r.virtual(action,false,c);else r.up(source==='mouse'?'Mouse3':'KeyZ');
  skillPress();assert.equal(r.snapshot(c).block,false);
 }
});

test('W+A and W+D retain diagonal movement through all skill, shield and potion presses',()=>{
 const c=controlPreset();
 for(const [side,x] of [['KeyA',-1],['KeyD',1]])for(const action of ['hammer','charge','heal','judgement','block','potion']){
  const r=createInputRouter();r.down('KeyW',c);r.down(side,c);assert.equal(r.down(c.bindings[action][0],c),action);
  const first=r.snapshot(c);assert.deepEqual(first.move,{x,y:-1});assert.deepEqual(first.lastMove,{x,y:-1});
  if(action==='potion'){assert.equal(r.consume(action),true);assert.equal(r.consume(action),false);}
  else assert.equal(first[action],true);
  const second=r.snapshot(c);assert.deepEqual(second.move,{x,y:-1});if(action!=='block'&&action!=='potion')assert.equal(second[action],false);
  r.up(c.bindings[action][0]);assert.deepEqual(r.snapshot(c).move,{x,y:-1});
 }
});

test('hold guard and held basic attack remain independent while each new skill pulse is consumed',()=>{
 const c=controlPreset(),r=createInputRouter();r.down('Mouse0',c);r.down('Mouse2',c);r.down('KeyT',c);r.down('KeyE',c);
 let snapshot=r.snapshot(c);assert.equal(snapshot.heal,true);assert.equal(snapshot.judgement,true);
 for(let i=0;i<5;i++){snapshot=r.snapshot(c);assert.equal(snapshot.attack,true);assert.equal(snapshot.block,true);assert.equal(snapshot.heal,false);assert.equal(snapshot.judgement,false);}
 r.up('Mouse2');assert.equal(r.snapshot(c).attack,true);assert.equal(r.snapshot(c).block,false);r.up('Mouse0');assert.equal(r.snapshot(c).attack,false);
});

test('clear resets new pulses, held states and toggles; profile reset also removes direction memory',()=>{
 const c=controlPreset();c.blockMode='toggle';
 for(const resetMovement of [false,true]){
  const r=createInputRouter();r.down('KeyW',c);r.snapshot(c);r.down('KeyT',c);r.down('KeyE',c);r.down('Mouse0',c);r.down('Mouse2',c);r.clear({resetMovement});
  const s=r.snapshot(c);assert.deepEqual(s.move,{x:0,y:0});assert.equal(s.attack,false);assert.equal(s.block,false);assert.equal(s.heal,false);assert.equal(s.judgement,false);
  assert.deepEqual(s.lastMove,resetMovement?null:{x:0,y:-1});
  for(const key of ['KeyT','KeyE','Mouse0'])r.down(key,c,{repeat:true});assert.equal(r.snapshot(c).heal,false);assert.equal(r.snapshot(c).judgement,false);assert.equal(r.snapshot(c).attack,false);
 }
});

test('auxiliary mouse skill release clears only that hold and never keyboard movement',()=>{
 let c=controlPreset('legacy');c=changed(c,'heal',0,'Mouse3');c=changed(c,'judgement',0,'Mouse4');
 const r=createInputRouter();r.down('KeyW',c);r.down('KeyA',c);r.down('Mouse3',c);r.down('Mouse4',c);r.releaseMouse();
 const snapshot=r.snapshot(c);assert.deepEqual(snapshot.move,{x:-1,y:-1});assert.equal(snapshot.heal,true);assert.equal(snapshot.judgement,true);
 assert.equal(r.snapshot(c).heal,false);assert.equal(r.snapshot(c).judgement,false);assert.equal(r.down('Mouse3',c),'heal');
});
