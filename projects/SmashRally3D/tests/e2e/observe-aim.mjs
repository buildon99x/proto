import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
export async function observeAim(ctx,run){
 const hook=await readFile('projects/SmashRally3D/app/.agents/skills/inspect-runtime/scripts/devtools-hook.js','utf8');
 await ctx.page.evaluateOnNewDocument(hook);
 await ctx.page.evaluateOnNewDocument(()=>{
  window.aimEvents=[];window.aimIntentFrames=[];window.contactWindowEvents=[];
  const wait=setInterval(()=>{
   if(!window.__playcanvasApps?.size||typeof window.smashDiagnostics!=='function')return;clearInterval(wait);
   const app=[...window.__playcanvasApps.keys()][0];let previousCount=0,previousTime=-1,round=0;const seen=new Set(),intents=new Set();
   app.on('frameend',()=>{
    const d=window.smashDiagnostics();if(d.time<previousTime||d.shots.length<previousCount)round++;previousTime=d.time;previousCount=d.shots.length;
    const feedback=document.querySelector('#feedback');
    if(feedback?.textContent.startsWith('AIM ')&&!intents.has(feedback.textContent)){intents.add(feedback.textContent);window.aimIntentFrames.push({time:d.time,copy:feedback.textContent,aim:d.input?.target??d.target});}
    const h=d.shots.at(-1),key=round+':'+d.shots.length;
    if(!h||d.renderedContact?.time!==h.time||seen.has(key))return;seen.add(key);
    window.contactWindowEvents.push({actor:h.actor,time:h.time,window:d.contactVisibility});
    if(h.actor!==0||!d.aimGuide)return;
    const ring=app.root.findByName('shot target ring'),dot=app.root.findByName('shot target dot'),aim=app.root.findByName('aim ring');
    const p=ring.getPosition(),a=aim.getPosition(),box=feedback.getBoundingClientRect();
    window.aimEvents.push({round,time:h.time,shot:h.shot,technique:h.technique,requestedShot:h.requestedShot,fallbackReason:h.fallbackReason,target:h.target,guide:d.aimGuide,copy:feedback.textContent,ring:{enabled:ring.enabled,p:{...p}},dotEnabled:dot.enabled,aim:{enabled:aim.enabled,p:{...a}},markerErrorM:Math.hypot(p.x-h.target.x,p.z-h.target.z),viewport:{width:innerWidth,height:innerHeight},textBounds:{left:box.left,right:box.right,top:box.top,bottom:box.bottom},ownContactWindow:d.contactVisibility});
   });
  },10);
 });
 await run(ctx);
 const result=await ctx.page.evaluate(()=>({events:window.aimEvents,intents:window.aimIntentFrames,contacts:window.contactWindowEvents}));
 if(!result.events.length||result.contacts.some(e=>e.actor===0&&e.window.strength!==0))throw Error('Missing aim coverage or changed own contact visibility');
 for(const e of result.events){
  if(!e.ring.enabled||!e.dotEnabled||e.markerErrorM>.0001||JSON.stringify(e.target)!==JSON.stringify(e.guide.target)||e.copy!==e.guide.copy)throw Error('Actual shot marker/feedback disagrees with physical hit target');
  if(e.textBounds.left<0||e.textBounds.right>e.viewport.width||e.textBounds.top<0||e.textBounds.bottom>e.viewport.height)throw Error('Aim/result feedback outside viewport');
 }
 await writeFile(path.resolve(process.env.SMASH_EVIDENCE_DIR,'aim-observation.json'),JSON.stringify({method:'Read-only post-render observation during unchanged original PC match/native gestures. Actual hit target, marker transform and visible outcome text compared;0.1mm numeric marker precision gate is not an experience score. No future trajectory/landing guarantee or state/time injection.',...result},null,2));
 ctx.log('AIM OBSERVATION PASS',JSON.stringify({events:result.events.length,intents:result.intents.length,ownContactWindowsOff:result.contacts.filter(e=>e.actor===0).length}));
}
