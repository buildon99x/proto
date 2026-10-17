import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {run as playMatch} from './benchmark-experience.mjs';
export const meta={viewport:{width:640,height:360}};
export async function run(ctx){
 const hook=await readFile('projects/SmashRally3D/app/.agents/skills/inspect-runtime/scripts/devtools-hook.js','utf8');await ctx.page.evaluateOnNewDocument(hook);
 await ctx.page.evaluateOnNewDocument(()=>{
  window.strokeFrames=[];
  const wait=setInterval(()=>{if(typeof window.smashDiagnostics!=='function'||!window.__playcanvasApps?.size)return;clearInterval(wait);const app=[...window.__playcanvasApps.keys()][0];
   app.on('frameend',()=>{const d=window.smashDiagnostics();if(!['RALLY','SERVING'].includes(d.phase)||window.strokeFrames.length>=10000)return;const cam=app.root.findByName('broadcast camera');window.strokeFrames.push({time:d.time,perf:performance.now(),phase:d.phase,receiver:d.receiver,shots:d.shots.length,renderedContact:d.renderedContact?.time,camera:{p:{...cam.getPosition()},fov:cam.camera.fov},actors:d.motions.map((m,i)=>({handUp:{...app.root.find(n=>n.name==='WristR')[i].up},motion:m.motion,pose:m.skinPose,feet:m.feet,racket:m.racket,normal:m.racketNormal,shaft:m.racketShaft}))});});
  },10);
 });
 await playMatch(ctx);
 const frames=await ctx.page.evaluate(()=>window.strokeFrames);await writeFile(path.resolve(process.env.SMASH_EVIDENCE_DIR,'stroke-frames.json'),JSON.stringify({method:'Read-only rendered frameend skeleton/feet/racket and camera traces during original visible-cue ordinary UI match. Same640x360LOW, fixed-clock physics and wall-clock1x capture; no injected pose/state/time.',frames},null,2));
 ctx.log('STROKE CHAIN TRACE PASS',JSON.stringify({frames:frames.length}));
}
