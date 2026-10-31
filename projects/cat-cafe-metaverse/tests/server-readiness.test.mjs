import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {WebSocket} from '../server/node_modules/ws/wrapper.mjs';
import * as config from '../server/config.mjs';
import {createRoomServer} from '../server/index.mjs';

test('local defaults stay loopback and production config fails closed',()=>{
 assert.equal(config.readConfig({}).host,'127.0.0.1');
 assert.throws(()=>config.readConfig({HOST:'0.0.0.0'}));
 for(const ALLOWED_ORIGINS of [undefined,'','*','null','http://example.com','https://example.com/','https://u:p@example.com','https://example.com/path','https://example.com?q=x','https://example.com#x','https://EXAMPLE.com','https://example.com,','https://*.example','https://cafe.example:443',' https://cafe.example','https://cafe.example ','ftp://cafe.example'])assert.throws(()=>config.readConfig({ROOM_SERVER_MODE:'production',ALLOWED_ORIGINS}));
 const p=config.readConfig({ROOM_SERVER_MODE:'production',ALLOWED_ORIGINS:'https://cafe.example',HOST:'0.0.0.0',PORT:'8080'});
 assert.equal(p.production,true);assert.equal(p.host,'0.0.0.0');assert.equal(p.port,8080);
 for(const PORT of ['NaN','-1','65536','1.2'])assert.throws(()=>config.readConfig({PORT}));
 assert.throws(()=>config.readConfig({ROOM_SERVER_MODE:'prod'}));
});
const rejected=async(url,options)=>{const ws=new WebSocket(url,options);ws.on('error',()=>{});const [,res]=await Promise.race([once(ws,'unexpected-response'),once(ws,'open').then(()=>{ws.terminate();throw Error('Unexpected accepted upgrade');})]);res.resume();ws.terminate();return res.statusCode;};
test('production origin exact match, missing origin denied, local native client retained',async()=>{
 const s=await createRoomServer({port:0,production:true,origins:['https://cafe.example']});
 try{assert.equal(await rejected(s.url),403);assert.equal(await rejected(s.url,{origin:'https://evil.example'}),403);assert.equal(await rejected(s.url,{origin:'https://cafe.example.attacker.test'}),403);const w=new WebSocket(s.url,{origin:'https://cafe.example'});await once(w,'open');w.close();await once(w,'close');}finally{await s.close();}
});
test('readiness drain denies upgrades and join; graceful close is idempotent1012',async()=>{
 const s=await createRoomServer({port:0});const base=s.url.replace('ws:','http:').replace('/ws','');
 const w=new WebSocket(s.url);await once(w,'open');
 try{assert.equal((await fetch(base+'/ready')).status,200);s.beginDrain();assert.equal((await fetch(base+'/ready')).status,503);assert.equal((await fetch(base+'/health')).status,200);assert.equal(await rejected(s.url),503);
 const msg=once(w,'message');w.send(JSON.stringify({type:'join',room:'sunroom'}));assert.equal(JSON.parse((await msg)[0]).reason,'SERVER_DRAINING');assert.equal(s.world.members.size,0);
 const closed=once(w,'close');const a=s.close(),b=s.close();assert.equal(a,b);assert.equal((await closed)[0],1012);await a;assert.equal(s.world.tokens.size,0);const seq=s.world.seq;await new Promise(r=>setTimeout(r,80));assert.equal(s.world.seq,seq);
 }finally{w.terminate();await s.close();}
});
test('unresponsive peer is forcibly closed within five second shutdown budget',async()=>{
 const s=await createRoomServer({port:0});const ws=new WebSocket(s.url);await once(ws,'open');ws._socket.pause();
 const start=performance.now();await s.close();const elapsed=performance.now()-start;ws.terminate();
 assert.ok(elapsed>=4900&&elapsed<6500,`shutdown took ${elapsed}ms`);assert.equal(s.world.members.size,0);
});
test('half-open rejected upgrade cannot retain HTTP shutdown',async()=>{
 const {connect}=await import('node:net');const s=await createRoomServer({port:0});s.beginDrain();
 const socket=connect({host:'127.0.0.1',port:Number(new URL(s.url).port),allowHalfOpen:true});await once(socket,'connect');
 socket.write('GET /ws HTTP/1.1\r\nHost: localhost\r\nConnection: Upgrade\r\nUpgrade: websocket\r\nSec-WebSocket-Version: 13\r\nSec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\n\r\n');
 assert.match(String((await once(socket,'data'))[0]),/503/);
 let timeout;try{await Promise.race([s.close(),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error('Shutdown exceeded bound')),6500);})]);}finally{clearTimeout(timeout);socket.destroy();await s.close();}
});
test('drain rejects existing player movement and clears live plus reserved seats on close',async()=>{
 const s=await createRoomServer({port:0});const ws=new WebSocket(s.url);await once(ws,'open');const welcome=once(ws,'message');ws.send(JSON.stringify({type:'join',room:'sunroom'}));await welcome;
 const player=[...s.world.members.values()][0];assert.ok(player);const detached={};s.world.join(detached,'garden');s.world.disconnect(detached);
 s.beginDrain();const inputBefore={...player.input};const ack=once(ws,'message');ws.send(JSON.stringify({type:'move',x:1,z:0,seq:100}));assert.equal(JSON.parse((await ack)[0]).reason,'SERVER_DRAINING');assert.deepEqual(player.input,inputBefore);
 await s.close();assert.equal(s.world.members.size,0);assert.equal(s.world.tokens.size,0);assert.ok([...s.world.rooms.values()].every(r=>r.players.size===0));
});
