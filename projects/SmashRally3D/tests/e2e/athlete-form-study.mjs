import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
export const meta={viewport:process.env.SMASH_FORM_PORTRAIT?{width:390,height:844,deviceScaleFactor:2}:{width:1065,height:606}};
export async function run({page,sleep,shot,log}){
 await page.evaluateOnNewDocument(await readFile('projects/SmashRally3D/app/.agents/skills/inspect-runtime/scripts/devtools-hook.js','utf8'));
 await page.reload();await page.waitForFunction(()=>typeof window.smashDiagnostics==='function');
 await page.click('[data-action="settings"]');await page.select('#quality','LOW');await page.click('[data-action="close"]');await page.select('#difficulty','EASY');
 await page.evaluate(async readyOnly=>{
  const app=[...window.__playcanvasApps.keys()][0],camera=app.root.findByName('broadcast camera'),update=app.update;
  const meshes=root=>root.find(n=>n.render).flatMap(n=>n.render.meshInstances);
  const resources=await Promise.all(['gold','violet'].map(color=>new Promise((resolve,reject)=>app.assets.loadFromUrl('/assets/models/athlete-'+color+'-baseline.glb','container',(err,asset)=>err?reject(Error(err)):resolve(asset.resource)))));
  const roots=app.root.find(n=>n.name==='AthleteSkin');if(roots.length!==2)throw Error('Expected exactly two live athlete skins');
  const entries=roots.flatMap((root,index)=>{
   const source=meshes(resources[index].instantiateRenderEntity());
   return root.render.meshInstances.map(mesh=>{
    const baseline=source.find(m=>m.material.name===mesh.material.name);if(!baseline)throw Error('Baseline geometry material not found: '+mesh.material.name);
    return {mesh,baseline:baseline.mesh,current:mesh.mesh};
   });
  });
  if(entries.length!==14)throw Error('Expected seven unchanged material batches per athlete');
  let index=0,normal=null;const stages=readyOnly?['ready']:['ready','prepare','accelerate','contact','follow','landing','return'];
  window.formHold=null;window.formSamples=[];window.formDone=false;
  const state=()=>{const d=window.smashDiagnostics();return{time:d.time,camera:{p:{...camera.getPosition()},q:{...camera.getRotation()},fov:camera.camera.fov},poses:d.motions.map(m=>m.skinPose),shuttle:d.position,renderedContact:d.renderedContact,contactVisibility:d.contactVisibility}};
  app.update=function(dt){if(!window.formHold)update.call(app,dt)};
  const observer=()=>{
   if(window.formHold||index>=stages.length)return;
   const d=window.smashDiagnostics();normal??=d.shots.find(h=>h.actor===0&&h.shot==='smash');const rem=d.contactAt-d.time,after=normal?d.time-normal.time:-99;
   const ready=index===0&&d.phase==='SERVE_READY';
   const prepare=index===1&&d.shots.length===4&&d.receiver===0&&rem<=.3&&rem>.18;
   const accelerate=index===2&&d.shots.length===4&&d.receiver===0&&d.motions[0].skinPose.racket.strokePhase==='accelerate';
   const contact=index===3&&normal&&d.renderedContact?.time===normal.time;
   const later=index>=4&&normal&&after>=[.18,.43,.72][index-4];
   if(!ready&&!prepare&&!accelerate&&!contact&&!later)return;
   app.timeScale=0;app.autoRender=false;window.formHold={name:stages[index],normalHit:normal,state:state(),variants:[]};
  };
  app.on('frameend',observer);
  window.formVariant=name=>{
   for(const e of entries)e.mesh.mesh=name.startsWith('baseline')?e.baseline:e.current;
   app.render();const snapshot=state();if(JSON.stringify(snapshot)!==JSON.stringify(window.formHold.state))throw Error('Geometry comparison altered camera, clock, pose or actual contact');
   window.formHold.variants.push({name,state:snapshot});
  };
  window.formResume=()=>{
   for(const e of entries)e.mesh.mesh=e.current;
   window.formSamples.push(window.formHold);window.formHold=null;app.autoRender=true;app.timeScale=1;index++;
   if(index===stages.length){app.off('frameend',observer);app.update=update;window.formRestore={originalUpdate:app.update===update,timeScale:app.timeScale,autoRender:app.autoRender,allCurrentMeshes:entries.every(e=>e.mesh.mesh===e.current)};window.formDone=true;}
  };
 },!!process.env.SMASH_FORM_READY_ONLY);
 await page.click('[data-action="start"]');let previous=false,inputs=0,attacks=0;const end=Date.now()+300000;
 while(Date.now()<end){
  const held=await page.evaluate(()=>window.formHold);
  if(held){for(const variant of ['baseline','baseline-repeat','candidate','baseline-restored']){await page.evaluate(n=>window.formVariant(n),variant);await shot(held.name+'-'+variant);}await page.evaluate(()=>window.formResume());continue;}
  if(await page.evaluate(()=>window.formDone))break;
  const d=await page.evaluate(()=>window.smashDiagnostics());
  if(d.phase==='SERVE_READY'&&d.server===0){const p=d.projectedTargets.find(t=>t.world.x===0&&t.world.z===5.8).screen;await page.mouse.click(p.x,p.y);}
  const cue=await page.$eval('#timing',e=>e.textContent||'');
  if(cue.includes('HIT NOW')&&!previous&&d.receiver===0){const attack=/SMASH|NET FINISH/.test(cue),front=attack&&attacks===0;const p=d.projectedTargets.find(t=>t.world.x===(inputs%2?1.8:0)&&t.world.z===(front?1.2:5.8)).screen;if(!attack)await page.keyboard.down('Shift');await page.mouse.click(p.x,p.y);await page.keyboard.up('Shift');if(attack)attacks++;inputs++;}
  previous=cue.includes('HIT NOW');await sleep(20);
 }
 const result=await page.evaluate(()=>({samples:window.formSamples,restore:window.formRestore,done:window.formDone}));
 if(!result.done||!result.restore?.originalUpdate||!result.restore.allCurrentMeshes||!result.restore.autoRender||result.restore.timeScale!==1)throw Error('Incomplete geometry study or engine/mesh restoration');
 await writeFile(path.resolve(process.env.SMASH_EVIDENCE_DIR,'form-study.json'),JSON.stringify({method:'Original visible-cue UI reaches actual ready/normal-smash phases. Hold update/time only for same-pose imported-baseline mesh swap versus current mesh. Existing live bones, materials, camera, physics state and contact are unchanged. Not ordinary uninterrupted play or a human-speed score.',...result},null,2));log('ATHLETE FORM STUDY PASS',JSON.stringify({samples:result.samples.length,restore:result.restore}));
}
