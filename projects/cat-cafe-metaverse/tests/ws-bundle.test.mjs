import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync,readdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

// Explicit post-Next-build regression. No TCP, database, public service or secrets.
// Run: CAFE_WS_BUNDLE_TEST=1 node --test projects/cat-cafe-metaverse/tests/ws-bundle.test.mjs
const enabled=process.env.CAFE_WS_BUNDLE_TEST==='1';
test('production Next server ws handles masked payloads across native-addon threshold',{skip:!enabled},async t=>{
 assert.equal(process.env.WS_NO_BUFFER_UTIL,undefined,'Regression must not hide optional-addon bundling with an environment override');
 const repo=resolve(dirname(fileURLToPath(import.meta.url)),'../../..');
 const require=createRequire(import.meta.url),server=resolve(repo,'launcher/.next/server');
 const webpack=require(resolve(server,'webpack-runtime.js'));
 const chunks=readdirSync(resolve(server,'chunks')).filter(name=>name.endsWith('.js'));
 const sources=chunks.map(name=>readFileSync(resolve(server,'chunks',name),'utf8'));
 for(const name of chunks)webpack.C(require(resolve(server,'chunks',name)));
 require(resolve(server,'app/api/cat-cafe-metaverse/ws/route.js')); // Registers route-local Node builtin modules; does not invoke GET.
 const receiverIds=Object.entries(webpack.m).filter(([,factory])=>factory.toString().includes('WS_ERR_EXPECTED_MASK')).map(([id])=>id);
 let receivers=receiverIds.map(id=>({name:`bundled Receiver ${id}`,Receiver:webpack(id)}));
 if(!receivers.length){
  const wsRoute=readFileSync(resolve(server,'app/api/cat-cafe-metaverse/ws/route.js'),'utf8');
  assert.ok([...sources,wsRoute].some(s=>/(?:require|import)\(["']ws["']\)/.test(s)),'Actual built route must resolve external ws');
  assert.ok(!sources.some(s=>s.includes('WS_NO_BUFFER_UTIL')),'No embedded ws optional-addon shim may remain');
  const external=Object.entries(webpack.m).find(([,factory])=>/(?:require|import)\(["']ws["']\)/.test(factory.toString()));
  assert.ok(external,'Compiled SDK must retain a native ws import factory');
  const native=await webpack(external[0]);
  const trace=JSON.parse(readFileSync(resolve(server,'app/api/cat-cafe-metaverse/ws/route.js.nft.json'),'utf8'));
  assert.ok(trace.files.some(file=>file.endsWith('/ws/lib/receiver.js')),'Deployment trace must include native receiver');
  assert.ok(trace.files.some(file=>file.endsWith('/ws/lib/buffer-util.js')),'Deployment trace must include native buffer helpers');
  receivers=[{name:'compiled SDK external native ws Receiver',Receiver:native.Receiver}];
 }
 for(const {name,Receiver} of receivers)for(const length of [31,32,64,125,300])await t.test(`${name}: masked ${length} bytes`,async()=>{
  const payload=Buffer.alloc(length,120),mask=Buffer.from([17,29,43,71]);
  const header=length<126?Buffer.from([0x81,0x80|length]):Buffer.from([0x81,0xfe,length>>8,length&255]);
  const masked=Buffer.from(payload);for(let i=0;i<masked.length;i++)masked[i]^=mask[i%4];
  const receiver=new Receiver({isServer:true,maxPayload:2048});let timeout;
  try{const data=await new Promise((accept,reject)=>{
   timeout=setTimeout(()=>reject(Error('Masked frame was not delivered')),1000);
   receiver.once('message',accept);receiver.once('error',reject);
   try{receiver.write(Buffer.concat([header,mask,masked]),error=>{if(error)reject(error);});}catch(error){reject(error);}
  });assert.deepEqual(Buffer.from(data),payload);}finally{clearTimeout(timeout);receiver.destroy();}
 });
});
