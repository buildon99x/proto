import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {serveGatewaySocket} from '../server/vercel-lifecycle.mjs';
class Socket extends EventEmitter {readyState=1;close(){this.readyState=3;this.emit('close');}}
test('request lifecycle remains pending until final gateway cleanup completes',async()=>{
 const ws=new Socket();let release,flushes=0,finished=false;
 const cleanup=new Promise(resolve=>{release=resolve;});
 const gateway={attach(){},flush(){flushes++;return cleanup;}};
 const serving=serveGatewaySocket(gateway,ws).then(()=>{finished=true;});
 ws.close();await new Promise(r=>setImmediate(r));assert.equal(flushes,1);assert.equal(finished,false);
 release();await serving;assert.equal(finished,true);
});
test('already closed admission still awaits cleanup and cleanup wait is bounded',async()=>{
 const ws=new Socket();let flushes=0;
 const gateway={attach(socket){socket.close();},flush(){flushes++;return new Promise(()=>{});}};
 await assert.rejects(serveGatewaySocket(gateway,ws,{cleanupTimeoutMs:10}),{code:'GATEWAY_CLEANUP_TIMEOUT'});assert.equal(flushes,1);
});
