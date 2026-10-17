import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
export const meta={viewport:process.env.SMASH_MATERIAL_PORTRAIT?{width:390,height:844,deviceScaleFactor:2}:{width:1065,height:606}};
export async function run({page,sleep,shot,log}){
 await page.evaluateOnNewDocument(await readFile('projects/SmashRally3D/app/.agents/skills/inspect-runtime/scripts/devtools-hook.js','utf8'));
 await page.reload();await page.waitForFunction(()=>typeof window.smashDiagnostics==='function');
 await page.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important}'});
 await page.click('[data-action="settings"]');await page.select('#quality','LOW');await page.click('[data-action="close"]');await page.select('#difficulty','EASY');
 await page.evaluate(async readyOnly=>{
  const app=[...window.__playcanvasApps.keys()][0],camera=app.root.findByName('broadcast camera'),update=app.update;
  const root=app.root.findByName('club courtyard');
  const entries=root.find(n=>n.render).flatMap(node=>node.render.meshInstances.filter(mesh=>mesh.material!==node.render.material).map(mesh=>({node,mesh,original:node.render.material,current:mesh.material})));
  if(entries.length!==42)throw Error('Expected42scoped material meshes, got'+entries.length);
  const groups=[...new Set(entries.map(e=>e.node.render.batchGroupId))];
  const signatures=entries.map(e=>({node:e.node.name,original:{name:e.original.name,diffuse:{...e.original.diffuse},gloss:e.original.gloss,specular:{...e.original.specular}},current:{name:e.current.name,diffuse:{...e.current.diffuse},gloss:e.current.gloss,specular:{...e.current.specular},diffuseMap:e.current.diffuseMap.name,normalMap:e.current.normalMap?.name,tiling:{...e.current.diffuseMapTiling}}}));
  window.materialEntries=signatures;
  let index=0,normal=null;const stages=readyOnly?['ready']:['ready','prepare','accelerate','contact','follow','landing','return'];
  window.formHold=null;window.formSamples=[];window.formDone=false;
  const state=()=>{const d=window.smashDiagnostics();return{time:d.time,phase:d.phase,scores:d.scores,viewport:[innerWidth,innerHeight,devicePixelRatio],camera:{p:{...camera.getPosition()},q:{...camera.getRotation()},fov:camera.camera.fov},poses:d.motions.map(m=>m.skinPose),shuttle:d.position,renderedContact:d.renderedContact,contactVisibility:d.contactVisibility}};
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
   app.timeScale=0;app.autoRender=false;window.formHold={name:stages[index],normalHit:normal,state:state(),bounds:entries.map(e=>{const box=e.mesh.aabb,c=box.center,h=box.halfExtents,v=camera.getPosition().clone();const points=[-1,1].flatMap(x=>[-1,1].flatMap(y=>[-1,1].map(z=>{const p=camera.camera.worldToScreen(v.set(c.x+x*h.x,c.y+y*h.y,c.z+z*h.z));return{x:p.x,y:p.y}})));return{node:e.node.name,minX:Math.min(...points.map(p=>p.x)),maxX:Math.max(...points.map(p=>p.x)),minY:Math.min(...points.map(p=>p.y)),maxY:Math.max(...points.map(p=>p.y))}}),variants:[]};
  };
  app.on('frameend',observer);
  window.formVariant=name=>{
   for(const e of entries)e.mesh.material=name.startsWith('baseline')?e.original:e.current;
   app.batcher.generate(groups);
   app.render();const snapshot=state();if(JSON.stringify(snapshot)!==JSON.stringify(window.formHold.state)){const differences=[];const compare=(a,b,key)=>{if(JSON.stringify(a)===JSON.stringify(b))return;if(a&&b&&typeof a==='object'&&typeof b==='object'){for(const k of new Set([...Object.keys(a),...Object.keys(b)]))compare(a[k],b[k],key+'.'+k);}else differences.push({key,before:a,after:b});};compare(window.formHold.state,snapshot,'state');throw Error('Material comparison changed state: '+JSON.stringify(differences.slice(0,12)));}
   window.formHold.variants.push({name,state:snapshot});
  };
  window.formResume=()=>{
   for(const e of entries)e.mesh.material=e.current;app.batcher.generate(groups);
   window.formSamples.push(window.formHold);window.formHold=null;app.autoRender=true;app.timeScale=1;index++;
   if(index===stages.length){app.off('frameend',observer);app.update=update;window.formRestore={originalUpdate:app.update===update,timeScale:app.timeScale,autoRender:app.autoRender,allCurrentMeshes:entries.every(e=>e.mesh.material===e.current)};window.formDone=true;}
  };
 },!!process.env.SMASH_MATERIAL_READY_ONLY);
 await page.click('[data-action="start"]');let previous=false,inputs=0,attacks=0;const end=Date.now()+300000;
 while(Date.now()<end){
  const held=await page.evaluate(()=>window.formHold);
  if(held){await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));for(const variant of ['baseline','baseline-repeat','candidate','baseline-restored']){await page.evaluate(n=>window.formVariant(n),variant);await shot(held.name+'-'+variant);}await page.evaluate(()=>window.formResume());continue;}
  if(await page.evaluate(()=>window.formDone))break;
  if(await page.evaluate(()=>window.formSamples.length===0)){await sleep(20);continue;}
  const d=await page.evaluate(()=>window.smashDiagnostics());
  if(d.phase==='SERVE_READY'&&d.server===0){const p=d.projectedTargets.find(t=>t.world.x===0&&t.world.z===5.8).screen;await page.mouse.click(p.x,p.y);}
  const cue=await page.$eval('#timing',e=>e.textContent||'');
  if(cue.includes('HIT NOW')&&!previous&&d.receiver===0){const attack=/SMASH|NET FINISH/.test(cue),front=attack&&attacks===0;const p=d.projectedTargets.find(t=>t.world.x===(inputs%2?1.8:0)&&t.world.z===(front?1.2:5.8)).screen;if(!attack)await page.keyboard.down('Shift');await page.mouse.click(p.x,p.y);await page.keyboard.up('Shift');if(attack)attacks++;inputs++;}
  previous=cue.includes('HIT NOW');await sleep(20);
 }
 const result=await page.evaluate(()=>({samples:window.formSamples,restore:window.formRestore,done:window.formDone,materials:window.materialEntries}));
 if(!result.done||!result.restore?.originalUpdate||!result.restore.allCurrentMeshes||!result.restore.autoRender||result.restore.timeScale!==1)throw Error('Incomplete geometry study or engine/mesh restoration');
 await writeFile(path.resolve(process.env.SMASH_EVIDENCE_DIR,'material-study.json'),JSON.stringify({method:'Original visible-cue UI reaches actual ready/normal-smash phases. Hold update/time/autoRender only for original component materials versus scoped new courtyard mesh-instance materials; regenerate the same static batch group. All geometry, actors, camera, physical contacts and lights unchanged. CSS animation disabled only in diagnostic. Not uninterrupted play or a human-speed score.',...result},null,2));log('COURTYARD MATERIAL STUDY PASS',JSON.stringify({samples:result.samples.length,restore:result.restore}));
}
