import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
export const meta={viewport:{width:640,height:360}};
export async function run({page,sleep,shot,log}){
 const hook=await readFile('projects/SmashRally3D/app/.agents/skills/inspect-runtime/scripts/devtools-hook.js','utf8');await page.evaluateOnNewDocument(hook);await page.reload();await page.waitForFunction(()=>typeof window.smashDiagnostics==='function');
 const refs=process.env.SMASH_PHASE_REFERENCE?JSON.parse(await readFile(process.env.SMASH_PHASE_REFERENCE,'utf8')).samples:[];
 const art=process.env.SMASH_ART_REFERENCE?JSON.parse(await readFile(process.env.SMASH_ART_REFERENCE,'utf8')).materials.flat():[];
 await page.click('[data-action="settings"]');await page.select('#quality','LOW');await page.click('[data-action="close"]');await page.select('#difficulty','EASY');
 await page.evaluate(refs=>{
  const app=[...window.__playcanvasApps.keys()][0],cam=app.root.findByName('broadcast camera'),update=app.update;
  const stages=['prepare','accelerate','contact','follow','landing','return'];let index=0,normal=null;
  window.phaseSamples=[];window.phaseHold=null;window.phaseDone=false;
  app.update=function(dt){if(!window.phaseHold)update.call(app,dt)};
  const cameraState=()=>({p:{...cam.getPosition()},q:{...cam.getRotation()},fov:cam.camera.fov});
  const observer=()=>{
   if(window.phaseHold||index>=stages.length)return;
   const d=window.smashDiagnostics();normal??=d.shots.find(h=>h.actor===0&&h.shot==='smash');const lead=d.contactAt-d.time,after=normal?d.time-normal.time:-99;
   const ready=index===0&&d.shots.length===4&&d.receiver===0&&lead<=.3&&lead>.18;
   const accel=index===1&&d.shots.length===4&&d.receiver===0&&d.motions[0].skinPose.racket.strokePhase==='accelerate';
   const hit=index===2&&normal&&d.renderedContact?.time===normal.time;
   const later=index>=3&&normal&&after>=[.18,.43,.72][index-3];
   if(!ready&&!accel&&!hit&&!later)return;
   const name=stages[index],originalCamera=cameraState();app.timeScale=0;app.autoRender=false;
   window.phaseHold={name,time:d.time,normalHit:normal,relativeToForecast:lead,relativeToActual:normal?after:null,actors:d.motions,shuttle:d.position,originalCamera,camera:originalCamera};
   const ref=refs.find(r=>r.name===name);
   if(ref){window.phaseHold.requestedCamera=JSON.parse(JSON.stringify(ref.camera));cam.setPosition(ref.camera.p.x,ref.camera.p.y,ref.camera.p.z);cam.setRotation(ref.camera.q.x,ref.camera.q.y,ref.camera.q.z,ref.camera.q.w);cam.camera.fov=ref.camera.fov;app.render();window.phaseHold.camera=cameraState();}
   const badge=document.createElement('div');badge.id='phase-badge';badge.textContent='HELD NATURAL PHASE / '+name.toUpperCase()+' / FIXED CAMERA / DIAGNOSTIC ONLY';badge.style.cssText='position:fixed;bottom:2px;left:4px;background:#102835;color:white;font:9px Arial;z-index:99;pointer-events:none';document.body.append(badge);
  };
  app.on('frameend',observer);
  window.resumePhase=()=>{const h=window.phaseHold;window.phaseSamples.push(h);cam.setPosition(h.originalCamera.p.x,h.originalCamera.p.y,h.originalCamera.p.z);cam.setRotation(h.originalCamera.q.x,h.originalCamera.q.y,h.originalCamera.q.z,h.originalCamera.q.w);cam.camera.fov=h.originalCamera.fov;document.querySelector('#phase-badge')?.remove();window.phaseHold=null;index++;app.autoRender=true;app.timeScale=1;if(index===stages.length){app.off('frameend',observer);app.update=update;window.phaseRestored={timeScale:app.timeScale,autoRender:app.autoRender,originalUpdate:app.update===update};window.phaseDone=true;}};
 },refs);
 await page.click('[data-action="start"]');let was=false,inputs=0,attacks=0;const end=Date.now()+240000;
 while(Date.now()<end){
  const held=await page.evaluate(()=>window.phaseHold);
  if(held){
   await shot('phase-'+held.name);
   if(art.length){
    const proof=await page.evaluate(art=>{
     const app=[...window.__playcanvasApps.keys()][0],camera=app.root.findByName('broadcast camera');
     const before=JSON.stringify(window.smashDiagnostics().motions.map(m=>m.skinPose));const time=window.smashDiagnostics().time;
     window.artRestore=[];for(const n of app.root.find(n=>n.name==='AthleteSkin'))for(const mesh of n.render.meshInstances){const m=mesh.material,ref=art.find(x=>x.name===m.name);if(ref){window.artRestore.push([m,m.diffuse.clone()]);m.diffuse.set(ref.diffuse.r,ref.diffuse.g,ref.diffuse.b);m.update();}}
     app.render();return{samePose:JSON.stringify(window.smashDiagnostics().motions.map(m=>m.skinPose))===before,sameTime:window.smashDiagnostics().time===time,camera:{p:{...camera.getPosition()},q:{...camera.getRotation()},fov:camera.camera.fov}};
    },art);
    if(!proof.samePose||!proof.sameTime)throw Error('Art comparison changed pose/clock');
    await shot('phase-'+held.name+'-legacy-color');
    await page.evaluate(proof=>{const app=[...window.__playcanvasApps.keys()][0];for(const[m,c]of window.artRestore){m.diffuse=c;m.update();}app.render();window.phaseHold.artComparison=proof;},proof);
   }
   await page.evaluate(()=>window.resumePhase());continue;
  }
  if(await page.evaluate(()=>window.phaseDone))break;
  const d=await page.evaluate(()=>window.smashDiagnostics());
  if(d.phase==='SERVE_READY'&&d.server===0){const p=d.projectedTargets.find(t=>t.world.x===0&&t.world.z===5.8).screen;await page.mouse.click(p.x,p.y);}
  const cue=await page.$eval('#timing',e=>e.textContent||'');
  if(cue.includes('HIT NOW')&&!was&&d.receiver===0){const attack=/SMASH|NET FINISH/.test(cue),front=attack&&attacks===0;const p=d.projectedTargets.find(t=>t.world.x===(inputs%2?1.8:0)&&t.world.z===(front?1.2:5.8)).screen;if(!attack)await page.keyboard.down('Shift');await page.mouse.click(p.x,p.y);await page.keyboard.up('Shift');if(attack)attacks++;inputs++;}
  was=cue.includes('HIT NOW');await sleep(20);
 }
 const samples=await page.evaluate(()=>window.phaseSamples);if(samples.length!==6)throw Error('Incomplete held phase study '+samples.map(x=>x.name));
 for(const row of samples){
  row.relativeToActual=row.time-samples.at(-1).normalHit.time;
  const r=refs.find(r=>r.name===row.name);
  if(r){if(JSON.stringify(row.requestedCamera)!==JSON.stringify(r.camera))throw Error('Baseline camera parameters not applied');row.cameraRoundTripMaxDelta=Math.max(...['p','q'].flatMap(k=>Object.keys(r.camera[k]).map(axis=>Math.abs(r.camera[k][axis]-row.camera[k][axis]))),Math.abs(r.camera.fov-row.camera.fov));}
 }
 const restoreProof=await page.evaluate(()=>window.phaseRestored);if(!restoreProof?.originalUpdate||restoreProof.timeScale!==1||!restoreProof.autoRender)throw Error('Diagnostic engine state not restored');
 const materials=await page.evaluate(()=>{const app=[...window.__playcanvasApps.keys()][0];return app.root.find(n=>n.name==='AthleteSkin').map(n=>n.render.meshInstances.map(m=>({name:m.material.name,diffuse:{...m.material.diffuse},metalness:m.material.metalness,roughness:m.material.gloss,diffuseTint:m.material.diffuseTint})));});
 await writeFile(path.resolve(process.env.SMASH_EVIDENCE_DIR,'phases.json'),JSON.stringify({method:'Ordinary original UI input to first normal smash; freeze only after each naturally reached phase. Explicitly pause engine update and rendering while taking diagnostic screenshots; resume original update/timeScale1 afterward. Candidate copies baseline camera exactly per phase. No actor/ball/shot injection. This is not normal-speed play or an experience score.',samples,materials,restoreProof},null,2));
 log('STROKE PHASES PASS',JSON.stringify({samples:samples.length,matchedBaselineCamera:!!refs.length}));
}
