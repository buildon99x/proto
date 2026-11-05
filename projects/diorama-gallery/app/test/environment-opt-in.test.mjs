import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {build} from '../../.agents/skills/diorama-worlds/node_modules/esbuild/lib/main.js';
for (const city of ['desert','dubai']) test(`${city} formation candidate declares its supported environment timeline`,async()=>{
 const root=resolve(import.meta.dirname,'..'),dir=await mkdtemp(join(tmpdir(),'environment-opt-in-'));
 try{
  const kit=resolve(root,'../.agents/skills/diorama-worlds/kit/world.js');
  await build({stdin:{contents:`export {default as original} from ${JSON.stringify(resolve(root,`src/${city}.js`))}; export {default as formed} from ${JSON.stringify(resolve(root,`src/${city}-timelapse.js`))};`,resolveDir:root},bundle:true,platform:'node',format:'esm',outfile:join(dir,'world.mjs'),alias:{'@diorama/worlds':kit}});
  const {original,formed}=await import(pathToFileURL(join(dir,'world.mjs')));
  assert.equal(typeof formed.environment,'function','formation candidate enables real scene environment');
  assert.equal(original.environment,undefined,'original world remains unmodified');
  assert.equal(formed.timeline,true);
  if(city==='dubai') {
   assert.equal(formed.weatherTimeline,false,'Dubai opts out of automatic weather in shared controls');
   assert.deepEqual(formed.environmentTrack.map(({time,type})=>({time,type})),[{time:0,type:'day'},{time:55,type:'day'},{time:80,type:'night'},{time:84,type:'night'},{time:89.99,type:'day'}]);
  } else {
   assert.notEqual(formed.weatherTimeline,false,'desert keeps the existing automatic weather');
   assert.ok(formed.environmentTrack?.length>=6);
   assert.ok(formed.environmentTrack.some(event=>event.type==='rain'));
  }
  assert.equal(original.environmentTrack,undefined);
  assert.ok(formed.environmentTrack.every(event=>event.time>=0&&event.time<formed.duration));
  assert.equal(formed.still,0);
  assert.ok(formed.moments.length>1);
 }finally{await rm(dir,{recursive:true,force:true});}
});
