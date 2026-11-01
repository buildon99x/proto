import {EventEmitter} from 'node:events';
import assert from 'node:assert/strict';
import {createGateway} from '../../server/vercel-gateway.mjs';
class Socket extends EventEmitter {readyState=1;bufferedAmount=0;out=[];send(value){this.out.push(JSON.parse(value));}close(code){this.readyState=3;this.code=code;this.emit('close');}}
let releaseStop,notifyStop;
const enteredStop=new Promise(resolve=>{notifyStop=resolve;});
const heldStop=new Promise(resolve=>{releaseStop=resolve;});
const results={};let revision=0,stopCalls=0,now=1000;
const coordinator={
 async pump(commands){for(const c of commands)if(c.type==='join')results[c.id]={connectionId:c.connectionId,type:'welcome',ok:true,id:'public-test-visitor',token:'in-memory-test-only',room:c.room};return{availability:{ok:true},revision:++revision,results,snapshots:{}};},
 async stop(){if(++stopCalls===1){notifyStop();await heldStop;}}
};
const gateway=createGateway({coordinator,autoSchedule:false,clock:()=>now});
const old=new Socket();gateway.attach(old);old.close(1000);const closing=gateway.flush();await enteredStop;
const fresh=new Socket();gateway.attach(fresh);fresh.emit('message',Buffer.from(JSON.stringify({type:'join',room:'sunroom'})));
releaseStop();await closing;await gateway.flush();
const welcomed=fresh.out.some(m=>m.type==='welcome');
now=7001;await gateway.flush();
console.log(JSON.stringify({laterCloseCode:fresh.code??null,scenario:'fresh join arrives while last-socket stop awaits',authoritativeWelcomeCommitted:Object.values(results).some(r=>r.type==='welcome'),clientWelcomeDelivered:welcomed,activeSockets:gateway.connectionCount}));
await gateway.close();
assert.equal(welcomed,true,'A fresh join must survive previous socket idle cleanup');
