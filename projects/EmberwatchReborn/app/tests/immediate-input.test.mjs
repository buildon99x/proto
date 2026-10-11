import test from 'node:test';import assert from 'node:assert/strict';
import {createImmediateInput,SAVE_INPUT_WINDOW_MS} from '../src/immediate-input.js';
import {createInputRouter,controlPreset} from '../src/controls.js';
import {createState,reduceRuntime} from '../src/state.js';
import {createStore} from '../src/save.js';import {createController} from '../src/controller.js';
import {createBattle} from '../src/combat.js';import {battleReport} from '../src/recovery.js';
const scope={now:100,life:0,region:'ash_hamlet'};
for(const action of ['interact','potion'])test(`save-busy ${action} waits then executes once immediately after durable completion`,()=>{
 const q=createImmediateInput(),calls=[];assert.equal(q.offer(action,scope),true);
 assert.equal(q.flush({...scope,busy:true},a=>calls.push(a)).status,'waiting');assert.deepEqual(calls,[]);
 assert.equal(q.flush({...scope,now:130},a=>calls.push(a)).status,'dispatched');
 q.flush({...scope,now:140},a=>calls.push(a));assert.deepEqual(calls,[action]);
});
for(const change of [{paused:true},{blocked:true},{lifeDown:true},{focused:false},{hidden:true},{life:1},{region:'ash_road'}])test(`save-busy input is cancelled by ${JSON.stringify(change)}`,()=>{
 const q=createImmediateInput();q.offer('potion',scope);let calls=0;
 assert.equal(q.flush({...scope,...change},()=>calls++).status,'cancelled');q.flush(scope,()=>calls++);assert.equal(calls,0);
});
test('long or reversed clock expires intent even while save is busy, and never executes later',()=>{
 for(const now of [100+SAVE_INPUT_WINDOW_MS+1,99,NaN]){const q=createImmediateInput();q.offer('interact',scope);assert.equal(q.flush({...scope,now,busy:true},()=>assert.fail()).status,'expired');assert.equal(q.flush({...scope,now:500},()=>assert.fail()).status,'idle');}
});
test('latest explicit action replaces previous intent; clear drops it; unsupported actions cannot enter',()=>{
 const q=createImmediateInput(),calls=[];q.offer('interact',scope);q.offer('potion',{...scope,now:110});q.flush({...scope,now:120},a=>calls.push(a));assert.deepEqual(calls,['potion']);
 q.offer('interact',scope);q.clear();q.flush(scope,()=>assert.fail());assert.equal(q.offer('attack',scope),false);
});
test('held potion/OS repeat cannot enqueue another use; key up and fresh press are required',()=>{
 const router=createInputRouter(),c=controlPreset('recommended'),q=createImmediateInput(),calls=[];
 assert.equal(router.down('KeyR',c),'potion');router.consume('potion');q.offer('potion',scope);
 assert.equal(router.down('KeyR',c),null);assert.equal(router.down('KeyR',c,{repeat:true}),null);
 q.flush({...scope,now:120},a=>calls.push(a));q.flush({...scope,now:130},a=>calls.push(a));assert.deepEqual(calls,['potion']);
 router.up('KeyR');assert.equal(router.down('KeyR',c),'potion');
});
test('queued potion through actual controller/reducer/store consumes one item and restores cooldown on reload',async()=>{
 const data=new Map(),m={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)},store=createStore(m);
 const s=reduceRuntime(createState(),{type:'trainStarter',position:{x:260,y:325}}).state;
 store.save(s,{expectedRevision:0});let release,entered;const start=new Promise(r=>entered=r);let delay=true;const delayedStore={...store,save:async(...args)=>{if(delay){entered();await new Promise(r=>release=r);delay=false;}return store.save(...args);}};
 const c=createController(delayedStore);await c.load();const b=createBattle(s);b.p.hp=20;
 const checkpoint=c.dispatch({type:'checkpoint',...battleReport(b)});await start;
 const q=createImmediateInput(),context={now:100,life:b.stateLife,region:b.region};q.offer('potion',context);let use;
 assert.equal(q.flush({...context,busy:true},()=>assert.fail('before durable save')).status,'waiting');assert.equal(store.load().state.inventory.consumables.health_potion,2);
 release();assert.equal((await checkpoint).ok,true);
 q.flush({...context,now:120},()=>{use=c.dispatch({type:'drinkPotion',...battleReport(b)});});q.flush({...context,now:130},()=>assert.fail('double use'));
 const result=await use;assert.equal(result.ok,true);assert.equal(result.state.inventory.consumables.health_potion,1);assert.ok(result.state.vitals.hp>20);assert.ok(result.state.recovery.potionCooldown>0);
 const restored=(await createController(store).load()).state;assert.deepEqual(restored.inventory,result.state.inventory);assert.deepEqual(restored.recovery,result.state.recovery);
 const again=await c.dispatch({type:'drinkPotion',...battleReport(createBattle(restored))});assert.equal(again.ok,false);assert.equal(store.load().state.inventory.consumables.health_potion,1);
});

test('queued portal interaction executes once and cannot repeat across region transition',async()=>{
 const data=new Map(),store=createStore({getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)});
 const trained=reduceRuntime(createState(),{type:'trainStarter',position:{x:260,y:325}}).state;const s=reduceRuntime(trained,{type:'acceptPatrol',position:{x:450,y:325}}).state;store.save(s,{expectedRevision:0});const c=createController(store);await c.load();const b=createBattle(s);b.p.x=590;b.p.y=375;
 const q=createImmediateInput();q.offer('interact',scope);let travel;const result=q.flush({...scope,now:120},()=>travel=c.dispatch({type:'travel',to:'ash_road',portalId:'road',...battleReport(b)}));assert.equal(result.status,'dispatched');
 const n=await travel;assert.equal(n.ok,true);assert.equal(n.state.world.region,'ash_road');q.flush({...scope,region:'ash_road'},()=>assert.fail('old portal replay'));assert.equal(store.load().revision,2);
});
