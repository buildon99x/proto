import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
export const meta={viewport:{width:1065,height:606}};
export async function run({page,shot,log}){
 const hook=await readFile('projects/SmashRally3D/app/.agents/skills/inspect-runtime/scripts/devtools-hook.js','utf8');
 await page.evaluateOnNewDocument(hook);await page.reload();
 await page.waitForFunction(()=>typeof window.smashDiagnostics==='function');
 await page.click('[data-action="settings"]');await page.select('#quality','LOW');await page.click('[data-action="close"]');
 await page.click('[data-action="start"]');await page.waitForFunction(()=>window.smashDiagnostics().phase==='SERVE_READY');
 await page.evaluate(()=>{
  const app=[...window.__playcanvasApps.keys()][0],camera=app.root.findByName('broadcast camera');
  window.placementHold={app,camera,update:app.update,p:camera.getPosition().clone(),q:camera.getRotation().clone(),fov:camera.camera.fov,time:window.smashDiagnostics().time,timeScale:app.timeScale,autoRender:app.autoRender};
  app.update=()=>{};app.timeScale=0;app.autoRender=false;
  const badge=document.createElement('div');badge.id='placement-badge';badge.textContent='PLACEMENT INSPECTION / HELD DIAGNOSTIC CAMERA / NOT ORDINARY PLAY';badge.style.cssText='position:fixed;bottom:2px;left:4px;background:#102835;color:white;font:12px Arial;z-index:99;pointer-events:none';document.body.append(badge);
 });
 const views=[{name:'west-front',p:[-16,6.5,-1],look:[-7,2.8,9]},{name:'west-rear-high',p:[-17,12,16],look:[-7,2.3,8.8]}];
 for(const view of views){
  await page.evaluate(view=>{const h=window.placementHold;h.camera.setPosition(...view.p);h.camera.lookAt(...view.look);h.camera.camera.fov=52;h.app.render();},view);
  await shot('placement-'+view.name);
 }
 const proof=await page.evaluate(()=>{
  const h=window.placementHold;h.camera.setPosition(h.p);h.camera.setRotation(h.q);h.camera.camera.fov=h.fov;
  const cameraRoundTripMaxDelta=Math.max(...['x','y','z'].map(k=>Math.abs(h.camera.getPosition()[k]-h.p[k])),...['x','y','z','w'].map(k=>Math.abs(h.camera.getRotation()[k]-h.q[k])));
  const heldTimeUnchanged=window.smashDiagnostics().time===h.time;
  h.app.update=h.update;h.app.timeScale=h.timeScale;h.app.autoRender=h.autoRender;document.querySelector('#placement-badge').remove();
  return {heldTimeUnchanged,originalUpdate:h.app.update===h.update,timeScale:h.app.timeScale,autoRender:h.app.autoRender,cameraRoundTripMaxDelta};
 });
 if(!proof.heldTimeUnchanged||!proof.originalUpdate||proof.timeScale!==1||!proof.autoRender)throw Error('Placement diagnostic did not restore state');
 await writeFile(path.resolve(process.env.SMASH_EVIDENCE_DIR,'placement.json'),JSON.stringify({method:'Two explicit external diagnostic camera angles, frozen engine update/clock only while taking images. Original camera/clock/update restored. These are placement inspection, not ordinary-play or experience-scoring frames.',views,proof},null,2));
 log('COURTYARD PLACEMENT PASS',JSON.stringify(proof));
}
