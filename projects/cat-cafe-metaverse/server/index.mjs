import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
import {performance} from 'node:perf_hooks';
import {WebSocketServer,WebSocket} from 'ws';
import {World} from './world.mjs';
import {makeDelta,fullSnapshot} from '../shared/delta.mjs';
import {readConfig,validateConfig} from './config.mjs';
export {DEFAULT_ORIGINS} from './config.mjs';
export function packState(s){return {...s,schema:'packed-v1',players:s.players.map(({id,name,x,z,yaw,color})=>[id,name,x,z,yaw,color]),cats:s.cats.map(({id,name,x,z,yaw,skin,mode,owner,until})=>[id,name,x,z,yaw,skin,mode,owner,until]),toys:s.toys.map(({id,x,z,owner})=>[id,x,z,owner])};}
export function sendBounded(ws,msg,snapshot=false,metrics) {if(ws.readyState!==WebSocket.OPEN)return false;if(ws.bufferedAmount>512*1024){metrics.slowCloses++;ws.close(1013,'Slow connection');return false;}if(snapshot&&ws.bufferedAmount>64*1024){metrics.droppedSnapshots++;return false;}const data=typeof msg==='string'?msg:JSON.stringify(msg);try{ws.send(data);metrics.bytesOut+=Buffer.byteLength(data);return true;}catch{ws.close(1011,'Send failed');return false;}}
export function queueSnapshot(ws,current,metrics,cache=new Map()) {const delta=ws.snapshotFormat==='delta-v1';const full=!ws.snapshotBaseline||ws.forceFull||ws.snapshotBaseline.room!==current.room;const key=delta&&!full?ws.snapshotBaseline:`${current.room}:${delta?'full':'packed'}`;if(!cache.has(key))cache.set(key,JSON.stringify(delta?(full?fullSnapshot(current):makeDelta(ws.snapshotBaseline,current)):current));const queued=sendBounded(ws,cache.get(key),true,metrics);if(queued){ws.snapshotBaseline=current;ws.forceFull=false;}return queued;}
export async function createRoomServer(options={}){
 const {port,host,origins,production,world=new World(),maxConnections=360,compression=false}=validateConfig(options);
 let draining=false,closePromise;
 const joinDeadlines=new Set();
 const metrics={ticks:[],tickIntervals:[],bytesOut:0,bytesIn:0,messages:0,droppedSnapshots:0,slowCloses:0};
 const http=createServer((req,res)=>{if(req.url==='/health'||req.url==='/ready'){res.writeHead(req.url==='/ready'&&draining?503:200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({ok:req.url==='/health'||!draining,rooms:3,capacity:100,ephemeral:true}));}else{res.writeHead(404);res.end();}});
 const sockets=new Set();
 http.on('connection',socket=>{sockets.add(socket);socket.on('close',()=>sockets.delete(socket));});
 const wss=new WebSocketServer({noServer:true,maxPayload:2048,perMessageDeflate:compression?{serverNoContextTakeover:true,clientNoContextTakeover:true,serverMaxWindowBits:12,clientMaxWindowBits:12,concurrencyLimit:2,threshold:1024,zlibDeflateOptions:{level:1,memLevel:5}}:false});
 http.on('upgrade',(req,socket,head)=>{if(draining){socket.end('HTTP/1.1 503 Service Unavailable\r\nConnection: close\r\n\r\n');return;}if(req.url!=='/ws'||(production&&!req.headers.origin)||wss.clients.size>=maxConnections||(req.headers.origin&&!origins.includes(req.headers.origin))){socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');socket.destroy();return;}wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws,req));});
 const send=(ws,msg,snapshot=false)=>sendBounded(ws,msg,snapshot,metrics);
 wss.on('connection',ws=>{ws.alive=true;ws.joined=false;ws.snapshotFormat='packed-v1';ws.snapshotBaseline=null;ws.forceFull=true;ws.lastResync=-Infinity;ws.bucket=120;ws.lastRefill=Date.now();ws.on('pong',()=>{ws.alive=true;});const joinDeadline=setTimeout(()=>{if(!ws.joined)ws.close(1008,'Join timeout');},5000);joinDeadlines.add(joinDeadline);ws.on('error',()=>{});ws.on('message',raw=>{if(draining){send(ws,{type:'error',reason:'SERVER_DRAINING'});return;}metrics.bytesIn+=raw.length;metrics.messages++;const now=Date.now();ws.bucket=Math.min(120,ws.bucket+(now-ws.lastRefill)*.06);ws.lastRefill=now;if(--ws.bucket<0){ws.close(1008,'Rate limit');return;}let m;try{m=JSON.parse(raw);}catch{send(ws,{type:'error',reason:'INVALID_JSON'});return;}if(!m||typeof m!=='object'||Array.isArray(m)||typeof m.type!=='string'){send(ws,{type:'error',reason:'INVALID_MESSAGE'});return;}switch(m.type){case'join':{const result=world.join(ws,m.room,m.token);if(result.ok){ws.joined=true;clearTimeout(joinDeadline);joinDeadlines.delete(joinDeadline);ws.snapshotFormat=m.snapshotFormat==='delta-v1'?'delta-v1':'packed-v1';ws.snapshotBaseline=null;ws.forceFull=true;send(ws,{type:'welcome',...result,snapshotFormat:ws.snapshotFormat});queueSnapshot(ws,packState(world.snapshot(result.room)),metrics);}else send(ws,{type:'error',reason:result.reason});break;}case'resync':{const p=world.members.get(ws);if(p&&ws.snapshotFormat==='delta-v1'&&now-ws.lastResync>=1000){ws.lastResync=now;ws.forceFull=true;queueSnapshot(ws,packState(world.snapshot(p.room)),metrics);}break;}case'move':{const result=world.move(ws,m);if(!result.ok)send(ws,{type:'error',reason:result.reason});break;}case'action':{const result=world.action(ws,m);send(ws,{type:'actionResult',requestId:typeof m.requestId==='string'?m.requestId.slice(0,64):'',...result});break;}case'ping':if(Number.isSafeInteger(m.id))send(ws,{type:'pong',id:m.id});else send(ws,{type:'error',reason:'INVALID_PING'});break;case'leave':world.disconnect(ws,true);ws.joined=false;ws.close(1000,'Left room');break;default:send(ws,{type:'error',reason:'UNKNOWN_MESSAGE'});}});ws.on('close',()=>{clearTimeout(joinDeadline);joinDeadlines.delete(joinDeadline);world.disconnect(ws);});});
 await new Promise((resolve,reject)=>{http.once('error',reject);http.listen(port,host,resolve);});
 let lastTick=performance.now();
 const tick=setInterval(()=>{const start=performance.now();metrics.tickIntervals.push(start-lastTick);lastTick=start;if(metrics.tickIntervals.length>12000)metrics.tickIntervals.shift();world.tick();if(world.seq%2===0){const snapshots=new Map(),encoded=new Map();for(const ws of wss.clients){const p=world.members.get(ws);if(!p)continue;if(!snapshots.has(p.room))snapshots.set(p.room,packState(world.snapshot(p.room)));queueSnapshot(ws,snapshots.get(p.room),metrics,encoded);}}metrics.ticks.push(performance.now()-start);if(metrics.ticks.length>12000)metrics.ticks.shift();},50);
 const heartbeat=setInterval(()=>{for(const ws of wss.clients){if(!ws.alive){ws.terminate();continue;}ws.alive=false;ws.ping();}},15000);
 function beginDrain(){draining=true;clearInterval(tick);clearInterval(heartbeat);for(const timer of joinDeadlines)clearTimeout(timer);joinDeadlines.clear();}
 function close(){
  if(closePromise)return closePromise;
  beginDrain();
  closePromise=new Promise(resolve=>{
   const deadline=setTimeout(()=>{for(const ws of wss.clients)ws.terminate();for(const socket of sockets)socket.destroy();http.closeAllConnections();},5000);
   for(const ws of wss.clients)ws.close(1012,'Server restarting');
   wss.close(()=>{http.close(()=>{
    clearTimeout(deadline);
    for(const ws of [...world.members.keys()])world.disconnect(ws,true);
    world.tokens.clear();for(const room of world.rooms.values()){room.players.clear();room.toys.length=0;}
    resolve();
   });http.closeIdleConnections();});
  });
  return closePromise;
 }
 return{url:`ws://${host==='::1'||host==='::'?'['+host+']':host}:${http.address().port}/ws`,world,metrics,beginDrain,close};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){const s=await createRoomServer(readConfig());console.log(`Cat Café authoritative room server: ${s.url}`);for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{await s.close();process.exit(0);});}
