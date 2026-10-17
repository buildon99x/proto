import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
export const meta={viewport:process.env.SMASH_POINT_VIEW==='pc'?{width:1065,height:606}:{width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true}};
export async function run({page,shot,log}){
 await page.evaluateOnNewDocument(await readFile('projects/SmashRally3D/app/.agents/skills/inspect-runtime/scripts/devtools-hook.js','utf8'));
 await page.reload();await page.waitForFunction(()=>typeof window.smashDiagnostics==='function');await page.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}'});
 await page.click('[data-action="settings"]');await page.select('#quality','LOW');await page.click('[data-action="close"]');await page.select('#difficulty','EASY');
 await page.evaluate(()=>{
  const app=[...window.__playcanvasApps.keys()][0],original=app.update;let held=false;window.pointReadyHeld=false;
  app.update=function(dt){if(!held)original.call(app,1/60)};
  const stop=()=>{if(window.smashDiagnostics().phase!=='SERVE_READY')return;held=true;app.autoRender=false;window.pointReadyHeld=true;app.off('frameend',stop)};app.on('frameend',stop);
  window.restorePointReady=()=>{app.update=original;app.autoRender=true;held=false};
 });
 await page.click('[data-action="start"]');await page.waitForFunction(()=>window.pointReadyHeld);
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const state=await page.evaluate(()=>{const app=[...window.__playcanvasApps.keys()][0],cam=app.root.findByName('broadcast camera'),d=window.smashDiagnostics();return{time:d.time,phase:d.phase,camera:{p:{...cam.getPosition()},q:{...cam.getRotation()},fov:cam.camera.fov},poses:d.motions.map(m=>m.skinPose),shuttle:d.position,targets:d.projectedTargets,viewport:[innerWidth,innerHeight]}});
 await shot('ready');await shot('ready-repeat');await page.evaluate(()=>window.restorePointReady());
 await writeFile(path.resolve(process.env.SMASH_EVIDENCE_DIR,'preservation.json'),JSON.stringify({method:'Separate held diagnostic: visible menu/settings/start, fixed1/60update to first real SERVE_READY; hold update+autoRender, disable CSS animation for exact PNG repeats, then restore. Not ordinary uninterrupted play or physical latency proof.',state},null,2));log('READY PRESERVATION',JSON.stringify({time:state.time,viewport:state.viewport}));
}
