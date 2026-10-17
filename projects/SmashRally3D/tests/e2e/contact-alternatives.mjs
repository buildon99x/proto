import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
export const meta={viewport:process.env.SMASH_STUDY_PORTRAIT?{width:390,height:844,deviceScaleFactor:2}:{width:640,height:360}};
export async function run({page,sleep,shot,log}){
 const hook=await readFile('projects/SmashRally3D/app/.agents/skills/inspect-runtime/scripts/devtools-hook.js','utf8');
 const opacity=(await import(pathToFileURL(path.resolve('projects/SmashRally3D/app/node_modules/playcanvas/build/playcanvas/src/scene/shader-lib/glsl/chunks/standard/frag/opacity.js')))).default;
 await page.evaluateOnNewDocument(hook);await page.reload();await page.waitForFunction(()=>typeof window.smashDiagnostics==='function');
 await page.click('[data-action="settings"]');await page.select('#quality','LOW');await page.click('[data-action="close"]');await page.select('#difficulty','NORMAL');
 await page.evaluate(opacity=>{
  const app=[...window.__playcanvasApps.keys()][0],camera=app.root.findByName('broadcast camera'),update=app.update;
  const skin=app.root.find(n=>n.name==='AthleteSkin')[0];
  const entries=skin.render.meshInstances.map(mesh=>({mesh,original:mesh.material,ghost:null,local:null}));
  const chunk='uniform vec4 contactWindow;\n'+opacity.replace(/\n}\n$/,'\n float visibility=smoothstep(contactWindow.z*.65,contactWindow.z,distance(gl_FragCoord.xy,contactWindow.xy));\n vec2 cell=mod(floor(gl_FragCoord.xy),2.0);\n float threshold=mix(mix(.125,.625,cell.x),mix(.875,.375,cell.x),cell.y);\n dAlpha*=mix(1.0,step(threshold,visibility),contactWindow.w);\n}\n');
  for(const e of entries){e.ghost=e.original.clone();e.ghost.opacity=.2;e.ghost.blendType=2;e.ghost.depthWrite=false;e.ghost.update();e.local=e.original.clone();e.local.shaderChunksVersion='2.23';e.local.alphaTest=.5;e.local.getShaderChunks('glsl').set('opacityPS',chunk);e.local.update();}
  window.contactSamples=[];window.contactHold=null;window.contactDone=false;
  let seen=new Set(),replies=0;
  app.update=function(dt){if(!window.contactHold)update.call(app,dt)};
  app.on('frameend',()=>{
   if(window.contactHold||window.contactDone)return;
   const d=window.smashDiagnostics(),h=d.shots.at(-1),previous=d.shots.at(-2);
   if(!h||h.actor!==1||previous?.actor!==0||previous.shot!=='drop'||d.renderedContact?.time!==h.time||seen.has(h.time))return;
   seen.add(h.time);replies++;if(![1,3].includes(replies))return;
   app.autoRender=false;app.timeScale=0;
   const p=camera.camera.worldToScreen(camera.getPosition().clone().set(h.p.x,h.p.y,h.p.z));
   const ratio=app.graphicsDevice.width/innerWidth,radius=Math.min(30,innerWidth*.07);
   window.contactHold={reply:replies,time:d.time,hit:h,camera:{p:{...camera.getPosition()},q:{...camera.getRotation()},fov:camera.camera.fov},center:{x:p.x,y:p.y},radius,variants:[]};
   for(const e of entries)e.mesh.setParameter('contactWindow',[p.x*ratio,app.graphicsDevice.height-p.y*ratio,radius*ratio,1]);
  });
  window.contactVariant=name=>{const h=window.contactHold,ratio=app.graphicsDevice.width/innerWidth;for(const e of entries){e.mesh.setParameter('contactWindow',[h.center.x*ratio,app.graphicsDevice.height-h.center.y*ratio,h.radius*ratio,name==='local-off'?0:1]);e.mesh.material=name==='ghost'?e.ghost:name.startsWith('local')?e.local:e.original;}app.render();const d=window.smashDiagnostics();h.variants.push({name,time:d.time,camera:{p:{...camera.getPosition()},q:{...camera.getRotation()},fov:camera.camera.fov},contact:d.renderedContact});};
  window.contactResume=()=>{for(const e of entries)e.mesh.material=e.original;window.contactSamples.push(window.contactHold);window.contactHold=null;app.timeScale=1;app.autoRender=true;if(replies===3){app.update=update;window.contactDone=true;}};
 },opacity);
 await page.click('[data-action="start"]');await page.click('[data-shot="drop"]');
 let previous=false;const deadline=Date.now()+240000;
 while(Date.now()<deadline){
  if(await page.evaluate(()=>window.contactDone))break;
  const held=await page.evaluate(()=>window.contactHold);
  if(held){for(const variant of ['original','original-repeat','ghost','local-off','local','restored']){await page.evaluate(name=>window.contactVariant(name),variant);await shot('reply-'+held.reply+'-'+variant);}await page.evaluate(()=>window.contactResume());continue;}
  const d=await page.evaluate(()=>window.smashDiagnostics());
  if(d.phase==='SERVE_READY'&&d.server===0){const p=d.projectedTargets.find(t=>t.world.x===0&&t.world.z===5.8).screen;await page.mouse.click(p.x,p.y);}
  const cue=await page.$eval('#timing',e=>e.textContent||'');if(cue.includes('HIT NOW')&&!previous){const p=d.projectedTargets.find(t=>t.world.x===0&&t.world.z===1.2).screen;await page.mouse.click(p.x,p.y,{button:'right'});}
  previous=cue.includes('HIT NOW');await sleep(30);
 }
 const result=await page.evaluate(()=>({done:window.contactDone,samples:window.contactSamples,clock:[...window.__playcanvasApps.keys()][0].timeScale,autoRender:[...window.__playcanvasApps.keys()][0].autoRender}));
 if(!result.done||result.samples.length!==2||result.clock!==1||!result.autoRender)throw Error('Incomplete natural-contact alternatives/restoration');
 for(const sample of result.samples)for(const v of sample.variants)if(v.time!==sample.time||JSON.stringify(v.camera)!==JSON.stringify(sample.camera))throw Error('Alternative moved clock/camera');
 await writeFile(path.resolve(process.env.SMASH_EVIDENCE_DIR,'alternatives.json'),JSON.stringify({method:'Naturally reached original NORMAL centre-soft actual AI contacts1/3. Hold update/clock only for material alternatives; original materials/update restored. No actor/ball/pose injection or camera/FOV changes. Baseline repeated before alternatives. Pinned WebGL2/installed2.23opacity contract.',...result},null,2));
 log('CONTACT ALTERNATIVES PASS',JSON.stringify({samples:result.samples.length}));
}
