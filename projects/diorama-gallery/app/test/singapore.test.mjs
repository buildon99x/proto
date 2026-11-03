import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from '../../.agents/skills/diorama-worlds/node_modules/esbuild/lib/main.js';

test('Singapore is an original bounded deterministic resource-owned world',async()=>{
 const root=resolve(import.meta.dirname,'..'),file=resolve(root,'src/singapore.js');
 assert.ok(existsSync(file),'Singapore scene must exist');
 const dir=await mkdtemp(join(tmpdir(),'singapore-test-'));const old=globalThis.document;
 const ctx=new Proxy({measureText:t=>({width:t.length*8}),createLinearGradient:()=>({addColorStop(){}})}, {get:(o,k)=>k in o?o[k]:(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
 globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>ctx})};
 try {
 const kit=resolve(root,'../.agents/skills/diorama-worlds/kit/world.js');
 await build({stdin:{contents:`export {default as world} from ${JSON.stringify(file)};export {toolkit} from ${JSON.stringify(kit)};`,resolveDir:root},bundle:true,platform:'node',format:'esm',outfile:join(dir,'scene.mjs'),alias:{'@diorama/worlds':kit}});
 const {world,toolkit}=await import(pathToFileURL(join(dir,'scene.mjs')));
 assert.equal(world.name,'singapore-garden-city');const T=toolkit({}).THREE,group=new T.Group(),W=toolkit(group),parts=world.build(W);
 for(const name of ['marina-bay-sands','artscience','gardens','flyer','civic','temple','merlion','skyline'])assert.ok(group.getObjectByName(name),name);
 let count=0;group.traverse(()=>count++);
 const snapshot=t=>{world.tick({t,parts,W});group.updateMatrixWorld(true);const a=[];group.traverse(o=>a.push(...o.matrix.elements));return a;};
 const zero=snapshot(0);snapshot(37);assert.deepEqual(snapshot(0),zero,'seek deterministic');
 const end=snapshot(world.duration);assert.ok(end.every((n,i)=>Math.abs(n-zero[i])<1e-6),'loop seam');
 for(const t of [0,8,20,40,60,90,119.99]){snapshot(t);const b=new T.Box3().setFromObject(group,true);for(let i=0;i<3;i++){const k=['x','y','z'][i];assert.ok(b.min[k]>=world.bounds[0][i]-.05,`min ${k}: ${b.min[k]}`);assert.ok(b.max[k]<=world.bounds[1][i]+.05,`max ${k}: ${b.max[k]}`);}}
 const templeBox=new T.Box3().setFromObject(group.getObjectByName('temple'),true);
 const cityBox=new T.Box3().setFromObject(group.getObjectByName('skyline'),true);assert.equal(cityBox.intersectsBox(templeBox),false,'temple eaves clear skyline');
 for(let t=0;t<120;t+=.5){snapshot(t);for(const car of parts.train.children){const box=new T.Box3().setFromObject(car,true);assert.equal(box.intersectsBox(templeBox),false,`train clears temple at ${t}`);assert.ok(box.min.y>=.987-1e-6,'wheels sit on rail top');}}
 let after=0;group.traverse(()=>after++);assert.equal(after,count,'tick never allocates scene objects');
 assert.ok(parts.boat && parts.train && parts.fountain && parts.wheel,'moving subjects present');W.dispose();
 } finally {globalThis.document=old;await rm(dir,{recursive:true,force:true});}
});
