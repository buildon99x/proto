import test from 'node:test';
import assert from 'node:assert/strict';
import {createCoordinator} from '../server/distributed/coordinator.mjs';
test('coordinator never acknowledges uncommitted join',async()=>{
 let commit;const store={open:async()=>({availability:{ok:true},leader:true,serverTime:10000,revision:0,fence:1,presence:{},commands:[{id:'c:0',connectionId:'10000:c',type:'join',room:'sunroom',issuedAt:10000}]}),commit:async value=>{commit=value;throw Error('store outage');}};
 await assert.rejects(createCoordinator({store,ownerId:'a'}).pump(),/store outage/);assert.equal(commit.results['c:0'].type,'welcome');assert.equal(commit.checkpoint.players.length,1);
});
test('nonleader returns only committed store output without executing commands',async()=>{const view={availability:{ok:true},leader:false,results:{},revision:2};const store={open:async()=>view,commit:()=>assert.fail('nonleader commit')};assert.equal(await createCoordinator({store,ownerId:'b'}).pump([{type:'join'}]),view);});
test('movement uses client input sequence rather than gateway envelope sequence',async()=>{
 let saved;const store={open:async()=>({availability:{ok:true},leader:true,serverTime:10000,revision:0,fence:1,presence:{},commands:[{id:'c:0',connectionId:'10000:c',type:'join',room:'sunroom',issuedAt:10000},{id:'c:8',connectionId:'10000:c',seq:8,inputSeq:2,type:'move',x:1,z:0,issuedAt:10000}]}),commit:async v=>(saved=v)};
 await createCoordinator({store,ownerId:'a'}).pump();assert.equal(saved.checkpoint.players[0].seq,2);
});
test('idle stop permits later visitors on the same coordinator instance',async()=>{let releases=0;const view={availability:{ok:true},leader:false,results:{}};const store={open:async()=>view,release:async()=>{releases++;}};const c=createCoordinator({store,ownerId:'a'});await c.stop();assert.equal(await c.pump(),view);assert.equal(releases,1);});
test('expired generation cannot rejoin with fresh timestamp while new generation resumes',async()=>{let saved;const store={open:async()=>({availability:{ok:true},leader:true,serverTime:10000,revision:0,fence:1,presence:{},retired:{old:70000},commands:[{id:'old:4',connectionId:'old',type:'join',room:'sunroom',issuedAt:10000}]}),commit:async v=>(saved=v)};await createCoordinator({store,ownerId:'a'}).pump();assert.equal(saved.results['old:4'].reason,'SESSION_EXPIRED');assert.equal(saved.checkpoint.players.length,0);});
// Deterministic single-process contract model ONLY; never provider atomicity proof.
function modelStore(clock,{maxOps=10000}={}){
 let state={revision:0,fence:0,owner:'',deadline:0,queue:[],dedup:new Map(),results:{},presence:{},retired:{},snapshots:{},lastTick:0,checkpoint:null},ops=0;
 const clone=x=>structuredClone(x);
 const unavailable=reason=>({availability:{ok:false,reason},serverTime:clock()});
 const meter=()=>{ops+=8;return ops<=maxOps;};
 const output=leader=>clone({...state,availability:{ok:true},leader,serverTime:clock(),commands:leader?state.queue:[],checkpoint:leader?state.checkpoint:undefined});
 return {
  get ops(){return ops;},
  async open({ownerId,commands}){
   if(!meter())return unavailable('BUDGET_EXHAUSTED');
   const now=clock();
   for(const [id,until] of state.dedup)if(until<=now){state.dedup.delete(id);delete state.results[id];}
   for(const c of commands){if(c.issuedAt<now-30000||c.issuedAt>now+1000)return unavailable('COMMAND_EXPIRED');if(!state.dedup.has(c.id)){state.dedup.set(c.id,now+60000);state.queue.push(clone(c));}}
   if(state.owner===ownerId||state.deadline<=now){if(state.owner!==ownerId||state.deadline<=now)state.fence++;state.owner=ownerId;state.deadline=now+5000;}
   return output(state.owner===ownerId);
  },
  async commit(request){
   if(!meter())return unavailable('BUDGET_EXHAUSTED');
   if(request.ownerId!==state.owner||request.fence!==state.fence||request.revision!==state.revision||state.deadline<=clock())return unavailable('STALE_OWNER');
   state={...state,...clone(request),owner:state.owner,revision:state.revision+1,queue:state.queue.filter(c=>!request.consumed.includes(c.id)),results:{...state.results,...clone(request.results)}};
   if(!request.active&&!state.queue.length){state.owner='';state.deadline=clock();}
   return output(false);
  },
  async release({ownerId,fence}){if(!meter())return unavailable('BUDGET_EXHAUSTED');if(state.owner===ownerId&&state.fence===fence){state.owner='';state.deadline=clock();}return output(false);}
 };
}

test('contract model: two gateways serialize six reserved seats and seventh admission fails',async()=>{
 let now=10000;const store=modelStore(()=>now),a=createCoordinator({store,ownerId:'a'}),b=createCoordinator({store,ownerId:'b'});
 const commands=Array.from({length:7},(_,i)=>({id:`10000:c${i}:0`,connectionId:`10000:c${i}`,seq:0,issuedAt:now,type:'join',room:'sunroom'}));
 let first=await a.pump(commands.slice(0,3));assert.equal(Object.values(first.results).filter(r=>r.type==='welcome').length,3);
 assert.equal((await b.pump(commands.slice(3))).results[commands[3].id],undefined);
 const final=await a.pump();assert.equal(final.snapshots.sunroom.players.length,6);assert.equal(final.results[commands[6].id].reason,'BETA_FULL');
 await a.pump([{id:'10000:c0:1',connectionId:'10000:c0',seq:1,issuedAt:now,type:'disconnect'}]);
 const reserved=await a.pump([{...commands[6],id:'10000:c6:1',seq:1}]);assert.equal(reserved.results['10000:c6:1'].reason,'BETA_FULL');
});
test('contract model: stale owner cannot publish after takeover and lost ack replay does not add seat',async()=>{
 let now=10000;const store=modelStore(()=>now),a=createCoordinator({store,ownerId:'a'}),b=createCoordinator({store,ownerId:'b'});
 const cmd={id:'10000:c:0',connectionId:'10000:c',seq:0,issuedAt:now,type:'join',room:'sunroom'};
 await a.pump([cmd]);const stale=await store.open({ownerId:'a',commands:[]});now+=5100;await b.pump();
 assert.equal((await store.commit({...stale,ownerId:'a',consumed:[],results:{}})).availability.reason,'STALE_OWNER');
 const replay=await b.pump([cmd]);assert.equal(replay.snapshots.sunroom.players.length,1);
 now+=60001;assert.equal((await b.pump([cmd])).availability.reason,'COMMAND_EXPIRED');
});
test('contract model: vanished gateway presence expires, fresh generation resumes, stale generation cannot return',async()=>{
 let now=10000;const store=modelStore(()=>now),a=createCoordinator({store,ownerId:'a'});
 const initial={id:'10000:c:0',connectionId:'10000:c',seq:0,issuedAt:now,type:'join',room:'sunroom'};
 const joined=await a.pump([initial]);now+=10001;const expired=await a.pump();assert.equal(expired.snapshots.sunroom.players.length,0);
 const resumed={id:'20001:new:0',connectionId:'20001:new',seq:0,issuedAt:now,type:'join',room:'sunroom',token:joined.results[initial.id].token};
 const again=await a.pump([resumed]);assert.equal(again.results[resumed.id].id,joined.results[initial.id].id);
 const old={id:'10000:c:1',connectionId:'10000:c',seq:1,issuedAt:now,type:'presence'};
 assert.equal((await a.pump([old])).results[old.id].reason,'SESSION_EXPIRED');
});
import {World} from '../server/world.mjs';
import {exportWorld} from '../server/state-codec.mjs';
test('normal100ms persistence interval advances two physics steps; outage does not replay ticks',async()=>{
 const world=new World({clock:()=>10000});world.join('10000:c','sunroom');world.move('10000:c',{seq:1,x:1,z:0});const checkpoint=exportWorld(world);
 async function recover(now){let saved;const store={open:async()=>({availability:{ok:true},leader:true,serverTime:now,revision:1,fence:1,presence:{'10000:c':now},commands:[],lastTick:10000,checkpoint}),commit:async v=>(saved=v)};await createCoordinator({store,ownerId:'a'}).pump();return saved;}
 const normal=await recover(10100);assert.equal(normal.checkpoint.seq,2);assert.equal(normal.checkpoint.players[0].x,.36);
 const outage=await recover(20000);assert.equal(outage.checkpoint.seq,1);assert.equal(outage.checkpoint.players[0].x,0);
});
test('stale commit race reloads committed output once rather than declaring outage',async()=>{let calls=0;const view={availability:{ok:true},leader:false,serverTime:10001,revision:2,results:{}};const store={open:async()=>++calls===1?{availability:{ok:true},leader:true,serverTime:10000,revision:0,fence:1,presence:{},commands:[]}:view,commit:async()=>({availability:{ok:false,reason:'STALE_OWNER'}})};assert.equal(await createCoordinator({store,ownerId:'a'}).pump(),view);assert.equal(calls,2);});
