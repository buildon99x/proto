import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const path=new URL('../../../launcher/vercel.json',import.meta.url);
test('cat cafe opts into database region without changing other function defaults',()=>{
 assert.ok(existsSync(path),'Vercel root launcher requires its own scoped function config');
 const config=JSON.parse(readFileSync(path));
 assert.deepEqual(config,{functions:{
  'app/api/cat-cafe-metaverse/status/route.ts':{regions:['hnd1']},
  'app/api/cat-cafe-metaverse/ws/route.ts':{regions:['hnd1']}
 }});
 const root=JSON.parse(readFileSync(new URL('../../../vercel.json',import.meta.url)));
 assert.deepEqual(root.regions,['icn1']);
});
