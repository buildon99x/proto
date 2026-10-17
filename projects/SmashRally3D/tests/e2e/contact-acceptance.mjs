import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
export const meta={viewport:process.env.SMASH_STUDY_PORTRAIT?{width:390,height:844,deviceScaleFactor:2}:{width:640,height:360}};
export async function run({page,sleep,shot,log}){
 const hook=await readFile('projects/SmashRally3D/app/.agents/skills/inspect-runtime/scripts/devtools-hook.js','utf8');
 await page.evaluateOnNewDocument(hook);await page.reload();await page.waitForFunction(()=>typeof window.smashDiagnostics==='function');
 await page.click('[data-action="settings"]');await page.select('#quality','LOW');await page.click('[data-action="close"]');await page.select('#difficulty','NORMAL');
 await page.evaluate(()=>{
  const app=[...window.__playcanvasApps.keys()][0],camera=app.root.findByName('broadcast camera'),update=app.update;
  const sources=name=>app.assets.find(name,'container').resource.materials.map(a=>a.resource);
  const gold=sources('athlete-gold'),racket=sources('racket');
  const entries=app.root.find(n=>n.render).flatMap(n=>n.render.meshInstances).filter(m=>m.getParameter('contactWindow')).map(mesh=>{
   const source=(mesh.skinInstance?gold:racket).find(m=>m.name===mesh.material.name);
   if(!source)throw Error('Original imported material not resolved: '+mesh.material.name);
   const soft=mesh.material.clone();soft.getShaderChunks('glsl').set('opacityPS',soft.getShaderChunks('glsl').get('opacityPS').replace('float visibility=smoothstep','float visibility=.2+.8*smoothstep'));soft.update();const feather=mesh.material.clone();feather.getShaderChunks('glsl').set('opacityPS',feather.getShaderChunks('glsl').get('opacityPS').replace('contactWindow.z*.65','contactWindow.z*.2'));feather.update();return {mesh,original:source,current:mesh.material,soft,feather,parameter:null};
  });
  if(!entries.length)throw Error('No contact-window material instances');
  window.visibilityHold=null;window.visibilitySamples=[];window.visibilityDone=false;window.ownContactVisibility=[];
  const seen=new Set();let replies=0;
  app.update=function(dt){if(!window.visibilityHold)update.call(app,dt)};
  app.on('frameend',()=>{
   if(window.visibilityHold||window.visibilityDone)return;
   const d=window.smashDiagnostics(),h=d.shots.at(-1),prev=d.shots.at(-2);
   if(!h||d.renderedContact?.time!==h.time||seen.has(h.time))return;seen.add(h.time);
   if(h.actor===0){window.ownContactVisibility.push({time:h.time,window:d.contactVisibility});return;}
   if(prev?.actor!==0||prev.shot!=='drop')return;
   replies++;if(![1,3].includes(replies))return;
   app.autoRender=false;app.timeScale=0;
   for(const e of entries)e.parameter=Array.from(e.mesh.getParameter('contactWindow').data);
   window.visibilityHold={reply:replies,time:d.time,hit:h,window:d.contactVisibility,camera:{p:{...camera.getPosition()},q:{...camera.getRotation()},fov:camera.camera.fov},variants:[]};
  });
  window.visibilityVariant=name=>{
   for(const e of entries){e.mesh.material=name.startsWith('original')?e.original:name==='soft-on'?e.soft:name==='feather-on'?e.feather:e.current;e.mesh.setParameter('contactWindow',name==='runtime-off'?[...e.parameter.slice(0,3),0]:['small-on','feather-on'].includes(name)?[e.parameter[0],e.parameter[1],e.parameter[2]*.6,e.parameter[3]]:e.parameter);}
   app.render();const d=window.smashDiagnostics();window.visibilityHold.variants.push({name,time:d.time,camera:{p:{...camera.getPosition()},q:{...camera.getRotation()},fov:camera.camera.fov},contact:d.renderedContact});
  };
  window.visibilityResume=()=>{for(const e of entries){e.mesh.material=e.current;e.mesh.setParameter('contactWindow',e.parameter);}window.visibilitySamples.push(window.visibilityHold);window.visibilityHold=null;app.timeScale=1;app.autoRender=true;if(replies===3){app.update=update;window.visibilityDone=true;}};
 });
 await page.click('[data-action="start"]');await page.click('[data-shot="drop"]');let previous=false;const deadline=Date.now()+240000;
 while(Date.now()<deadline){
  if(await page.evaluate(()=>window.visibilityDone))break;
  const held=await page.evaluate(()=>window.visibilityHold);
  if(held){for(const variant of (process.env.SMASH_FINAL_ACCEPTANCE?['original','original-repeat','runtime-off','runtime-on','restored']:['original','original-repeat','runtime-off','runtime-on','small-on','soft-on','feather-on','restored'])){await page.evaluate(n=>window.visibilityVariant(n),variant);await shot('reply-'+held.reply+'-'+variant);}await page.evaluate(()=>window.visibilityResume());continue;}
  const d=await page.evaluate(()=>window.smashDiagnostics());
  if(d.phase==='SERVE_READY'&&d.server===0){const p=d.projectedTargets.find(t=>t.world.x===0&&t.world.z===5.8).screen;await page.mouse.click(p.x,p.y);}
  const cue=await page.$eval('#timing',e=>e.textContent||'');if(cue.includes('HIT NOW')&&!previous){const p=d.projectedTargets.find(t=>t.world.x===0&&t.world.z===1.2).screen;await page.mouse.click(p.x,p.y,{button:'right'});}previous=cue.includes('HIT NOW');await sleep(30);
 }
 const result=await page.evaluate(()=>({done:window.visibilityDone,samples:window.visibilitySamples,ownContacts:window.ownContactVisibility,timeScale:[...window.__playcanvasApps.keys()][0].timeScale,autoRender:[...window.__playcanvasApps.keys()][0].autoRender}));
 if(!result.done||result.samples.length!==2||result.timeScale!==1||!result.autoRender||result.ownContacts.some(x=>x.window.strength!==0))throw Error('Contact aperture/own-contact/restoration coverage failed');
 if(!result.samples.some(s=>s.window.strength===1))throw Error('No naturally occluded AI contact detected');
 for(const s of result.samples)for(const v of s.variants)if(v.time!==s.time||JSON.stringify(v.camera)!==JSON.stringify(s.camera))throw Error('Visibility variant moved camera or clock');
 await writeFile(path.resolve(process.env.SMASH_EVIDENCE_DIR,'acceptance.json'),JSON.stringify({method:'Original visible-cue centre-soft input, natural actual AI contacts held only for exact imported-original/repeat/runtime-off/runtime-on material comparison. No pose/camera/time input injection. Original update/timeScale/material parameters restored. Functional ordinary rally coverage is separate.',...result},null,2));
 log('CONTACT ACCEPTANCE PASS',JSON.stringify({samples:result.samples.length,ownContacts:result.ownContacts.length,active:result.samples.map(s=>s.window.strength)}));
}
