import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {prepareLiveCapture,startLiveCapture} from './live-capture.mjs';
export const meta={viewport:JSON.parse(process.env.SMASH_HIGH_VIEW||'{"width":640,"height":360}')};
export async function run({page,sleep,shot,log}) {
 const out=path.resolve(process.env.SMASH_EVIDENCE_DIR),required=process.env.SMASH_REQUIRE_CUE==='1';
 const hook=await readFile('projects/SmashRally3D/app/.agents/skills/inspect-runtime/scripts/devtools-hook.js','utf8');await page.evaluateOnNewDocument(hook);
 await prepareLiveCapture(page);await page.goto(`http://127.0.0.1:${process.env.SMASH_PORT||4330}/?audio-review`);await page.waitForFunction(()=>typeof window.smashDiagnostics==='function');
 await page.click('[data-action="settings"]');await page.select('#quality',process.env.SMASH_HIGH_QUALITY||'LOW');await page.click('[data-setting="trail"]');await page.click('[data-action="close"]');
 await page.select('#difficulty','EASY');const finish=await startLiveCapture(page,out);await page.click('[data-action="start"]');await page.click('[data-shot="clear"]');await page.waitForFunction(()=>window.smashDiagnostics().phase==='SERVE_READY');
 await page.evaluate(()=>{
  const app=[...window.__playcanvasApps.keys()][0];window.flightVisibility={visible:0,maxAnchorError:0,blockedPointer:0,nearContactVisible:0};
  app.on('frameend',()=>{const d=window.smashDiagnostics(),r=window.flightVisibility,c=d.shuttleContrast?.current;if(!c?.visible)return;r.visible++;
   const node=app.root.findByName('cork'),cam=app.root.findByName('broadcast camera'),p=cam.camera.worldToScreen(node.getPosition()),e=document.querySelector('#shuttle-contrast'),b=e.getBoundingClientRect();
   const error=Math.hypot(b.x+b.width/2-p.x,b.y+b.height/2-p.y);
   if(error>r.maxAnchorError){r.maxAnchorError=error;r.worst={time:d.time,projection:{x:p.x,y:p.y},bounds:b.toJSON(),cue:c};}
   if(document.elementFromPoint(p.x,p.y)?.tagName!=='CANVAS')r.blockedPointer++;
   if(d.position.y<=3.4)r.nearContactVisible++;
  });
 });
 let d=await page.evaluate(()=>window.smashDiagnostics());const p=d.projectedTargets.find(t=>t.world.x===0&&t.world.z===5.8).screen;if(meta.viewport.hasTouch)await page.touchscreen.tap(p.x,p.y);else await page.mouse.click(p.x,p.y);
 const commands=[];let previous=false,apex=null,firstSound=null;const end=Date.now()+240000;
 while(Date.now()<end){
  d=await page.evaluate(()=>window.smashDiagnostics());firstSound??=d.audioLedger[0]?.audioPerf;
  if(!apex&&d.position.y>9&&Math.abs(d.velocity.y)<1){apex={time:d.time,p:d.position,v:d.velocity,screen:d.shuttleScreen,cue:d.shuttleContrast?.current??null};await shot('apex');}
  if(d.returns>=6&&d.shots.filter(h=>h.actor===0).length>=4)break;
  const cue=await page.$eval('#timing',e=>e.textContent||'');
  if(cue.includes('HIT NOW')&&!previous&&d.receiver===0){const x=[0,-1.8,1.8][commands.length%3],p=d.projectedTargets.find(t=>t.world.x===x&&t.world.z===5.8).screen;if(meta.viewport.hasTouch)await page.touchscreen.tap(p.x,p.y);else await page.mouse.click(p.x,p.y);commands.push({cue,input:await page.evaluate(()=>window.smashDiagnostics().lastInput)});}
  previous=cue.includes('HIT NOW');await sleep(25);
 }
 const visibility=await page.evaluate(()=>window.flightVisibility);if(!apex||d.returns<6)throw Error('Incomplete normal high-flight rally');
 if(required&&(!apex.cue?.visible||!visibility.visible||visibility.maxAnchorError>.5||visibility.blockedPointer||visibility.nearContactVisible))throw Error('Invalid contrast cue behavior '+JSON.stringify({apex,visibility}));
 if(required&&d.shuttleContrast.contacts.some(c=>c.visible))throw Error('Cue overlapped a physical contact');
 await shot('rally');await page.keyboard.press('Escape');const capture=await finish(firstSound);
 await writeFile(path.join(out,'flight.json'),JSON.stringify({method:'Ordinary UI six-return clear rally with trail OFF; real WebAudio and wall-clock1x capture. Actual UI pause only after measured rally, before encoding. No actor/ball/time injection.',requiredCue:required,apex,visibility,commands,match:d,capture},null,2));
 log('HIGH SHUTTLE FLIGHT PASS',JSON.stringify({returns:d.returns,apex,visibility,contacts:d.shots.length}));
}
