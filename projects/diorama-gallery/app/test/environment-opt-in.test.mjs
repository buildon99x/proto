import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {build} from '../../.agents/skills/diorama-worlds/node_modules/esbuild/lib/main.js';
test('only the formation candidate opts into independent weather and day/night',async()=>{
 const root=resolve(import.meta.dirname,'..'),dir=await mkdtemp(join(tmpdir(),'environment-opt-in-'));
 try{
  const kit=resolve(root,'../.agents/skills/diorama-worlds/kit/world.js');
  await build({stdin:{contents:`export {default as original} from ${JSON.stringify(resolve(root,'src/desert.js'))}; export {default as formed} from ${JSON.stringify(resolve(root,'src/desert-timelapse.js'))};`,resolveDir:root},bundle:true,platform:'node',format:'esm',outfile:join(dir,'world.mjs'),alias:{'@diorama/worlds':kit}});
  const {original,formed}=await import(pathToFileURL(join(dir,'world.mjs')));
  assert.equal(typeof formed.environment,'function','formation candidate enables real scene environment');
  assert.equal(original.environment,undefined,'original world remains unmodified');
  assert.equal(formed.timeline,true);
  assert.ok(formed.environmentTrack?.length>=6,'candidate declares editable default environment events');
  assert.equal(original.environmentTrack,undefined);
  assert.ok(formed.environmentTrack.every(event=>event.time>=0&&event.time<formed.duration));
  assert.equal(formed.still,0);
  assert.ok(formed.moments.length>1);
 }finally{await rm(dir,{recursive:true,force:true});}
});
