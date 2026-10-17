import {prepareLiveCapture,startLiveCapture} from './live-capture.mjs';
import {run as defence} from './smash-drop-regression.mjs';
import {run as pressure} from './experience-pressure.mjs';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import path from 'node:path';
export const meta={viewport:{width:640,height:400}};
export async function run(ctx){
 const {page}=ctx,out=path.resolve(process.env.SMASH_EVIDENCE_DIR);
 await mkdir(path.join(out,'observed-frames'),{recursive:true});
 const hook=await readFile('projects/SmashRally3D/app/.agents/skills/inspect-runtime/scripts/devtools-hook.js','utf8');
 await page.evaluateOnNewDocument(hook);
 await prepareLiveCapture(page);
 await page.goto('http://127.0.0.1:4330/?audio-review');
 await page.waitForFunction(()=>typeof window.smashDiagnostics==='function');
 await page.evaluate(()=>{
  const app=[...window.__playcanvasApps.keys()][0];
  window.defenceFrames=[];window.defencePoints=[];window.defenceFirstSound=null;
  window.defenceDifficulty=document.querySelector('#difficulty')?.value??'NORMAL';
  document.addEventListener('change',e=>{if(e.target?.id==='difficulty')window.defenceDifficulty=e.target.value;});
  let seen=new Set(),round=0,lastCount=0,lastTime=-1,lastPoints=0;
  app.on('frameend',()=>{
   const d=window.smashDiagnostics();
   if(d.time<lastTime||d.shots.length<lastCount){round++;seen=new Set();lastPoints=0;}
   lastTime=d.time;lastCount=d.shots.length;
   if(d.points.length>lastPoints){lastPoints=d.points.length;window.defencePoints.push({round,difficulty:window.defenceDifficulty,time:d.time,perf:performance.now(),point:d.points.at(-1),feedback:d.message,png:document.querySelector('canvas').toDataURL('image/png')});}
   window.defenceFirstSound??=d.audioLedger[0]?.audioPerf??null;
   const hit=d.shots.at(-1),contact=d.renderedContact;
   // Literal post-render samples only. This observer never changes a game,
   // camera, clock, shot, position, AI observation, or command.
   if(!hit||contact?.time!==hit.time)return;
   const drops=d.shots.filter(h=>h.actor===0&&h.shot==='drop');
   if(!drops.length)return;
   const key=round+':'+d.shots.length;
   if(seen.has(key))return;seen.add(key);
   const cam=app.root.findByName('broadcast camera'),pose=d.motions[1].skinPose;
   const pixels=[...Object.values(pose.joints),pose.racket.center,d.position].map(p=>cam.camera.worldToScreen(cam.getPosition().clone().set(p.x,p.y,p.z)));
   const opponentScreenBounds=[Math.min(...pixels.map(p=>p.x))-14,Math.min(...pixels.map(p=>p.y))-14,Math.max(...pixels.map(p=>p.x))+14,Math.max(...pixels.map(p=>p.y))+14];
   window.defenceFrames.push({contactVisibility:d.contactVisibility,aimGuide:d.aimGuide,round,shotIndex:d.shots.length-1,pointCount:d.points.length,opponentScreenBounds,difficulty:window.defenceDifficulty,time:d.time,perf:performance.now(),hit,contact,actors:d.actors.map(a=>({p:a.p})),perception:d.perception,shuttle:d.position,feedback:d.message,png:document.querySelector('canvas').toDataURL('image/png')});
  });
 });
 const finish=await startLiveCapture(page,out);
 await (process.env.SMASH_DEFENCE_REVIEW==='pressure'?pressure:defence)(ctx);
 const firstSound=await page.evaluate(()=>window.defenceFirstSound);
 const capture=await finish(firstSound);
 const {frames,points}=await page.evaluate(()=>({frames:window.defenceFrames,points:window.defencePoints}));
 for(let i=0;i<frames.length;i++){
  const f=frames[i],name=String(i).padStart(3,'0')+'-actor'+f.hit.actor+'.png';
  await writeFile(path.join(out,'observed-frames',name),Buffer.from(f.png.split(',')[1],'base64'));
  delete f.png;f.file='observed-frames/'+name;
 }
 for(let i=0;i<points.length;i++){const p=points[i],name='point-'+String(i).padStart(3,'0')+'.png';await writeFile(path.join(out,'observed-frames',name),Buffer.from(p.png.split(',')[1],'base64'));delete p.png;p.file='observed-frames/'+name;}
 if(frames.some(f=>f.hit.actor===0&&f.contactVisibility?.strength!==0))throw Error('Own physical contact was altered by visibility treatment');
 if(frames.filter(f=>f.hit.actor===1).length<3)throw Error('Insufficient literal AI return frame coverage');
 await writeFile(path.join(out,'defence-observation.json'),JSON.stringify({method:'Original unchanged visible-cue NORMAL/HARD centre-soft or original pressure controller; real UI inputs. Read-only post-render contact PNGs and CDP software wall-clock video. No pause/time/state injection. Counts alone do not award experience points; no physical speed/listening claim.',frames,points,capture},null,2));
 ctx.log('DEFENCE REVIEW PASS',JSON.stringify({frames:frames.length,actualAiContactFrames:frames.filter(f=>f.hit.actor===1).length}));
}
