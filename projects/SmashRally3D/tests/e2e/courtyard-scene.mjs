import {run as scene} from './benchmark-scene.mjs';
import {writeFile} from 'node:fs/promises';
import path from 'node:path';
export const meta={viewport:{width:1065,height:606}};
export async function run(ctx){
 const samples=[];
 await scene({...ctx,shot:async name=>{
  await ctx.shot(name);
  samples.push(await ctx.page.evaluate(name=>{
   const app=[...window.__playcanvasApps.keys()][0];
   const environment=app.root.findByName('club courtyard');
   return {name,drawCalls:app.stats.drawCallCount,environmentParts:environment?.find(n=>n.render).length??null,environmentBounds:environment?.find(n=>n.render).flatMap(n=>n.render.meshInstances.map(m=>({name:n.name,center:{...m.aabb.center},halfExtents:{...m.aabb.halfExtents}})))??[],staticBatches:app.batcher?app.batcher.getGroupByName('club courtyard static')?.id??null:null};
  },name));
 }});
 await writeFile(path.resolve(process.env.SMASH_EVIDENCE_DIR,'environment.json'),JSON.stringify({method:'Original four-view ready UI scenario; read-only rendered draw calls and world bounds. No camera, light, game or pose injection. Draw calls are software renderer submission counts, not device FPS.',samples},null,2));
 ctx.log('COURTYARD SCENE PASS',JSON.stringify(samples.map(({name,drawCalls,environmentParts})=>({name,drawCalls,environmentParts}))));
}
