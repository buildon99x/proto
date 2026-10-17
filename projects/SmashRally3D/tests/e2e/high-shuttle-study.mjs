import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
export const meta={viewport:{width:1280,height:720}};
export async function run({page,shot,sleep,log}) {
 const hook=await readFile('projects/SmashRally3D/app/.agents/skills/inspect-runtime/scripts/devtools-hook.js','utf8');
 await page.evaluateOnNewDocument(hook);
 const results=[];
 for(const view of [{width:1280,height:720},{width:844,height:390,deviceScaleFactor:2,isMobile:true,hasTouch:true},{width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true}]) {
  await page.setViewport(view);await page.reload();await page.waitForFunction(()=>typeof window.smashDiagnostics==='function');
  await page.click('[data-action="settings"]');await page.select('#quality','LOW');await page.click('[data-action="close"]');await page.select('#difficulty','EASY');await page.click('[data-action="start"]');await page.click('[data-shot="clear"]');
  await page.waitForFunction(()=>window.smashDiagnostics().phase==='SERVE_READY');
  await page.evaluate(()=>{
   const app=[...window.__playcanvasApps.keys()][0];
   const freeze=()=>{const d=window.smashDiagnostics();if(d.phase==='RALLY'&&d.position.y>9&&Math.abs(d.velocity.y)<1){app.timeScale=0;app.off('frameend',freeze);window.apexHeld=true;}};
   app.on('frameend',freeze);
  });
  const target=await page.evaluate(()=>window.smashDiagnostics().projectedTargets.find(t=>t.world.x===0&&t.world.z===5.8).screen);
  if(view.hasTouch)await page.touchscreen.tap(target.x,target.y);else await page.mouse.click(target.x,target.y);
  const end=Date.now()+150000;let previous=false;
  while(Date.now()<end&&!(await page.evaluate(()=>window.apexHeld===true))){
   const d=await page.evaluate(()=>window.smashDiagnostics());const cue=await page.$eval('#timing',e=>e.textContent||'');
   if(cue.includes('HIT NOW')&&!previous&&d.receiver===0){const p=d.projectedTargets.find(t=>t.world.x===0&&t.world.z===5.8).screen;if(view.hasTouch)await page.touchscreen.tap(p.x,p.y);else await page.mouse.click(p.x,p.y);}
   previous=cue.includes('HIT NOW');await sleep(25);
  }
  if(!(await page.evaluate(()=>window.apexHeld===true)))throw Error('Natural high apex not observed');
  await page.evaluate(()=>{
   const app=[...window.__playcanvasApps.keys()][0],cam=app.root.findByName('broadcast camera'),cork=app.root.findByName('cork');
   window.study={app,cam,cork,sky:cam.camera.clearColor.clone(),materials:cork.render.meshInstances.map(m=>m.material)};
   const badge=document.createElement('div');badge.id='study-badge';badge.textContent='NATURALLY REACHED APEX HELD - RENDERING STUDY ONLY';badge.style.cssText='position:fixed;bottom:2px;left:4px;z-index:99;background:#102835;color:white;font:10px Arial;pointer-events:none';document.body.append(badge);
  });
  const samples=[];
  for(const variant of ['baseline','sky','cork','outline']) {
   const state=await page.evaluate(variant=>{
    const {app,cam,cork,sky,materials}=window.study;cam.camera.clearColor=sky.clone();cork.render.meshInstances.forEach((m,i)=>m.material=materials[i]);document.querySelector('#study-cue')?.remove();
    const p=cork.getPosition(),s=cam.camera.worldToScreen(p),feathers=app.root.findByName('feathers'),tail=cam.camera.worldToScreen(feathers.getPosition());
    if(variant==='sky')cam.camera.clearColor=sky.clone().set(.28,.44,.56);
    if(variant==='cork')cork.render.meshInstances.forEach(m=>{const mat=m.material.clone();mat.diffuse.set(.035,.08,.12);mat.emissive.set(.035,.08,.12);mat.update();m.material=mat;});
    if(variant==='outline'){
     const e=document.createElement('div');e.id='study-cue';const angle=Math.atan2(tail.y-s.y,tail.x-s.x)*180/Math.PI+90;
     e.style.cssText=`position:fixed;left:${s.x}px;top:${s.y}px;width:20px;height:20px;transform:translate(-50%,-50%) rotate(${angle}deg);z-index:4;pointer-events:none`;
     e.innerHTML='<svg viewBox="-10 -10 20 20" width="20" height="20"><path d="M-1-1 -4-8 Q0-10 4-8 L1-1Z" fill="#fff9ed" stroke="#102b3b" stroke-width="1.4" stroke-linejoin="round"/><path d="M0-8V-1" stroke="#73909a" stroke-width=".6"/><circle r="1.8" fill="#fff9ed" stroke="#102b3b" stroke-width="1.3"/></svg>';document.body.append(e);
    }
    const d=window.smashDiagnostics(),cp=cam.getPosition();return {variant,time:d.time,p:d.position,v:d.velocity,camera:{x:cp.x,y:cp.y,z:cp.z,fov:cam.camera.fov},corkScreen:{x:s.x,y:s.y},tailScreen:{x:tail.x,y:tail.y},view:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio}};
   },variant);
   await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
   await shot('apex-'+view.width+'x'+view.height+'-'+variant);samples.push(state);
  }
  const a=samples[0];if(samples.some(s=>JSON.stringify([s.time,s.p,s.v,s.camera,s.corkScreen])!==JSON.stringify([a.time,a.p,a.v,a.camera,a.corkScreen])))throw Error('Rendering alternatives moved the held world/camera');
  results.push({view,samples});
  await page.evaluate(()=>{const {app,cam,cork,sky,materials}=window.study;cam.camera.clearColor=sky;cork.render.meshInstances.forEach((m,i)=>m.material=materials[i]);document.querySelector('#study-cue')?.remove();document.querySelector('#study-badge')?.remove();app.timeScale=1;window.apexHeld=false;});
 }
 await writeFile(path.resolve(process.env.SMASH_EVIDENCE_DIR,'study.json'),JSON.stringify({method:'Ordinary UI clear flight to natural >9m apex. Engine timeScale temporarily0 only for identical-pose rendering variants, then restored. No actor/ball/physics state injection. Not normal-speed gameplay evidence.',results},null,2));
 log('HIGH SHUTTLE STUDY PASS',JSON.stringify({views:results.length,worldCameraIdentical:true}));
}
